// Failure cases: a post is sent that no person approved, or one the checks held; a held post can be approved; the
// social switch is on without being turned on; a post says a number its story does not, a word the wording rules ban,
// misses the AI label or the link, or is longer than its platform takes; two stories are posted on one day, or a story
// twice; the weaker story is posted before the stronger; a story that left the site is still sent; a send leaves no record
// or reaches the network; a failed send is lost; a post attaches the item's generic card, not its story's share image.
import { tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { publishArticle } from "@aihot/backend/publication/publish";
import { AI_LABEL, check, compose, LIMITS, PLATFORMS, storyParts } from "../backend/compose.ts";
import { draftToday, listPosts, review, sendApproved } from "../backend/posts.ts";
import social from "../server.ts";

const T = tag();
const SRC = `social-${T}`;
const LINK = "https://example.com/reference/cases/abc";
const IMAGE = "https://example.com/og/items/abc.png";

const story = (over: Record<string, unknown> = {}) => ({
  title: "一家面馆把外卖抽成算清楚以后调了价",
  lead: "这家面馆发现外卖每单要付平台 25%。",
  who: "店主",
  parts: [{ heading: "账", blocks: [{ type: "numbers", point: "", caption: null, items: [{ value: "25%", label: "平台抽成" }, { value: "18 元", label: "每碗成本" }] }] }],
  open: null,
  ...over,
});
const parts = (over: Record<string, unknown> = {}) => storyParts(story(over))!;

test("a post is the story's own words with the label and the link, per platform", () => {
  const posts = Object.fromEntries(PLATFORMS.map((p) => [p, compose(p, parts(), LINK, IMAGE)]));
  for (const p of PLATFORMS) {
    assert.deepEqual(posts[p]!.problems, [], p);
    assert.ok(posts[p]!.body.includes(AI_LABEL) && posts[p]!.body.includes("· 25%　平台抽成"), p);
  }
  assert.ok(posts.facebook!.body.includes(LINK) && posts.wechat!.body.includes(LINK));
  assert.ok(!posts.instagram!.body.includes(LINK) && posts.instagram!.body.includes("见主页链接"), "Instagram does not link a caption");
  assert.equal(posts.instagram!.imageUrl, IMAGE);
  assert.deepEqual(storyParts({ title: "  " }), null);
  assert.deepEqual(storyParts(story())!.figures.length, 2);
});

test("the checks hold a post that says what its story does not, or breaks a rule", () => {
  const problems = (over: Record<string, unknown>, platform: (typeof PLATFORMS)[number] = "facebook", image: string | null = IMAGE) => compose(platform, parts(over), LINK, image).problems.join("|");
  const post = compose("facebook", parts(), LINK, IMAGE);
  assert.match(check({ ...post, body: `${post.body}\n一年多付 33,159 元` }, parts()).join(), /数字不在故事里：33159/, "a number the story's title, opening and figures do not have");
  assert.deepEqual(check({ ...post, body: post.body.replace(AI_LABEL, "") }, parts()), ["缺“AI 辅助生成”标识"]);
  assert.deepEqual(check({ ...post, body: post.body.replace(LINK, "") }, parts()), ["缺故事链接"]);
  assert.match(problems({ lead: "老板你应该算清抽成。" }), /你应该/, "the wording rules");
  assert.match(problems({ lead: "" }), /没有开头/);
  assert.match(problems({ lead: "字".repeat(LIMITS.facebook.body) }), /正文 \d+ 字，超过 facebook/);
  assert.match(problems({ title: "字".repeat(LIMITS.wechat.title + 1) }, "wechat"), /标题 \d+ 字，超过 wechat/);
  assert.match(problems({}, "instagram", null), /必须有图/);
});

const ids: Record<string, string> = {};
async function selected(marker: string, score: number, told: unknown, minutesAgo = 5) {
  const { articleId } = await upsertMaterial({ sourceId: SRC, url: `https://example.com/${marker}-${T}`, title: `${marker}-${T}`, bodyText: `${marker}-${T} text`, bodyStatus: "ok", via: "fetch", publishedAt: new Date() });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected) VALUES (${articleId}, 1, 'rule', 'pass', 'tip', ${marker}, '摘要', ${score}, true)`;
  await publishArticle(articleId, { releasedAt: new Date(Date.now() - minutesAgo * 60_000) });
  await sql`INSERT INTO reference_cases (article_id, revision, status, story, situations, shop_key, prompt_version) VALUES (${articleId}, 1, 'story', ${sql.json(told as never)}, ${["pricing"]}, ${marker}, 'test')`;
  ids[marker] = articleId;
}

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, tags) VALUES (${SRC}, 'Social test', 'rss', 'T2', 'editorial', ${["美国"]})`;
  await selected("WEAK", 40, story({ title: "弱的故事", lead: "一家店的开头。" }));
  await selected("STRONG", 80, story());
});
after(async () => { await closeDb(); });

test("a story of the day becomes a draft for each platform, once a day, the strongest first; nothing goes out unapproved", async () => {
  const made = await draftToday();
  assert.equal(made.length, 3);
  const posts = (await listPosts()).reverse();
  assert.deepEqual(posts.map((p) => [p.platform, p.status, p.article_id === ids.STRONG]), [["facebook", "pending", true], ["instagram", "pending", true], ["wechat", "pending", true]]);
  assert.ok(posts[0]!.link.endsWith(`/reference/cases/${ids.STRONG}`) && posts[1]!.image_url?.endsWith(`/og/reference/cases/${ids.STRONG}.png`), "the story's own share image");
  assert.deepEqual(await draftToday(), [], "one story a day");
  assert.deepEqual(await sendApproved(), [], "pending posts are not sent");
  const log = await sql`SELECT event FROM social_log WHERE post_id = ${posts[0]!.id}`;
  assert.deepEqual(log.map((r) => r.event), ["drafted"]);
});

test("an approved post is sent through the test sender and recorded; a rejected or held post is not; a story that left is withdrawn", async () => {
  const [fb, ig, wechat] = (await listPosts()).reverse();
  assert.equal(await review(fb!.id, "approved", "Kay"), true);
  assert.equal(await review(fb!.id, "rejected", "Kay"), false, "only a pending post takes a verdict");
  assert.equal(await review(ig!.id, "rejected", "Kay"), true);
  assert.equal(await review(wechat!.id, "approved", "Kay"), true);
  await sql`UPDATE publications SET selected = false WHERE article_id = ${ids.STRONG}`;
  assert.deepEqual(await sendApproved(), [{ id: fb!.id, result: "withdrawn" }, { id: wechat!.id, result: "withdrawn" }], "the story is no longer selected");
  await sql`UPDATE publications SET selected = true WHERE article_id = ${ids.STRONG}`;
  await sql`UPDATE social_posts SET status = 'approved' WHERE id = ${fb!.id}`;
  assert.deepEqual(await sendApproved(), [{ id: fb!.id, result: "sent" }]);
  const [sent] = await sql`SELECT status, delivery, sent_at, reviewed_by FROM social_posts WHERE id = ${fb!.id}`;
  assert.deepEqual([sent!.status, sent!.delivery, sent!.reviewed_by, sent!.sent_at instanceof Date], ["sent", "test", "Kay", true]);
  assert.deepEqual((await sql`SELECT event FROM social_log WHERE post_id = ${fb!.id} ORDER BY id`).map((r) => r.event), ["drafted", "approved", "withdrawn", "sent"]);
  assert.deepEqual((await sql`SELECT event FROM social_log WHERE post_id = ${ig!.id} ORDER BY id`).map((r) => r.event), ["drafted", "rejected"]);
  assert.deepEqual(await sendApproved(), [], "a sent post is not sent again");
});

test("a draft the checks hold cannot be approved, and the schedules stay off until SOCIAL_POST_ENABLED is true", async () => {
  await sql`UPDATE social_posts SET created_at = created_at - interval '2 days'`;
  await selected("BAD", 90, story({ title: "有问题的故事", lead: "老板你应该这样做。" }));
  const made = await draftToday();
  assert.equal(made.length, 3);
  const bad = (await listPosts()).reverse().filter((p) => p.article_id === ids.BAD);
  assert.deepEqual(bad.map((p) => p.status), ["held", "held", "held"]);
  assert.match(bad[0]!.problems.join(), /你应该/);
  assert.equal(await review(bad[0]!.id, "approved", "Kay"), false);
  assert.deepEqual(await sendApproved(), []);
  assert.deepEqual((await sql`SELECT event FROM social_log WHERE post_id = ${bad[0]!.id}`).map((r) => r.event), ["held"]);
  delete process.env.SOCIAL_POST_ENABLED;
  assert.deepEqual(social.schedules!.map((s) => s.when!()), [false, false]);
  process.env.SOCIAL_POST_ENABLED = "1";
  assert.deepEqual(social.schedules!.map((s) => s.when!()), [false, false], "only true turns it on");
  process.env.SOCIAL_POST_ENABLED = "true";
  assert.deepEqual(social.schedules!.map((s) => s.when!()), [true, true]);
  delete process.env.SOCIAL_POST_ENABLED;
});
