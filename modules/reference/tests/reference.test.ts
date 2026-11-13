// Failure cases: a withdrawn item stays in the reference pages; a situation too few shops tell is listed; a list
// counts countries, or counts an adviser or a publication as a shop, or one shop's items as several shops; the ranking
// of situations counts items, not shops, or lists more than ten; a page lists an item under another cause or with
// the story's words instead of the item's; a story's or a shop's old address reads the database or misses its 308;
// the sitemap still lists the stories' or shops' pages; an item placed without a story (backend/place.ts) misses its
// situation, or one placed nowhere shows a block on its item page.
import { pointModels, stub, tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { publishArticle } from "@aihot/backend/publication/publish";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import reference from "../server.ts";
import { articlesToPlace, placeWaiting, readPlacing } from "../backend/place.ts";
import { AGENT_ABILITIES } from "../backend/agent.ts";
import { LISTED, rankSituations, sourceKind, tellerOf } from "../backend/read.ts";
import { fullCountText, listCount, restCountText } from "../format.ts";
import type { CaseStory, Count, SituationRow } from "../types.ts";

const count = (over: Partial<Count>): Count => ({ shops: 0, insiders: 0, cases: 0, ...over });

test("a list's big number is its shops, or 条原文 where no shop tells it, with the rest of its count beside; nothing counts countries", () => {
  assert.deepEqual(listCount(count({ shops: 16, insiders: 1, cases: 40 })), [16, "家店"]);
  assert.deepEqual(listCount(count({ shops: 9, cases: 13 })), [9, "家店"], "the shops rank it");
  assert.deepEqual(listCount(count({ insiders: 2, cases: 2 })), [2, "条原文"], "no shop tells it");
  assert.deepEqual(listCount(count({ shops: 1200, cases: 1500 })), [1200, "家店"]);
  assert.equal(restCountText(count({ shops: 16, insiders: 1, cases: 26 })), "1 位业内人士 · 26 条原文");
  assert.equal(restCountText(count({ shops: 8, cases: 9 })), "9 条原文");
  assert.equal(restCountText(count({ insiders: 2, cases: 2 })), "2 位业内人士", "its 条原文 is the big number");
  assert.equal(fullCountText(count({ shops: 16, insiders: 1, cases: 26 })), "16 家店 · 1 位业内人士 · 26 条原文");
  assert.equal(fullCountText(count({ shops: 1200, cases: 1500 })), "1,200 家店 · 1,500 条原文");
});

test("店家谈得最多的事 ranks situations by shops, then stories, then the library's order, ten at most", () => {
  const row = (slug: string, shops: number, cases: number, insiders = 0): SituationRow =>
    ({ slug, category: "成本与利润", title: slug, dek: "", count: count({ shops, cases, insiders }), faces: [], sources: 0 });
  const rows = [row("a", 3, 10), row("b", 5, 5), row("c", 5, 6), row("d", 1, 20, 9), row("e", 2, 2), row("f", 2, 2), row("g", 4, 4),
    row("h", 1, 3), row("i", 1, 2), row("j", 0, 2), row("k", 0, 4), row("l", 2, 1)];
  assert.deepEqual(rankSituations(rows).map((r) => r.slug), ["c", "b", "g", "a", "e", "f", "l", "d", "h", "i"],
    "stories break a tie of shops, the library's order a tie of both; insiders and stories alone do not lift one");
  assert.deepEqual(rows.map((r) => r.slug), ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"], "the lists keep their order");
});

test("an item counts as the one shop of an owner's own source, its named shop, the source of an owner who names none, or an insider", () => {
  const of = (shop_key: string | null, speaker: CaseStory["shop"]["speaker"], source_id = "src") => tellerOf({ shop_key, source_id, story: { shop: { country: "美国", speaker } } });
  assert.deepEqual(of("k1", "media"), { key: "shop:k1", insider: false }, "a named shop, whoever tells it");
  assert.deepEqual([of("k1", "owner", "rss-ryourigaka"), of(null, "media", "rss-ryourigaka")], [{ key: "source:rss-ryourigaka", insider: false }, { key: "source:rss-ryourigaka", insider: false }], "an owner's own blog: one shop, whatever a story names it");
  assert.equal(of(null, "owner").key, of(null, "staff").key, "an owner and staff who name no shop: once a source");
  assert.deepEqual([of(null, "media"), of(null, "media")], [of(null, "vendor"), of(null, "adviser")], "a publication, like the advisers and vendors of one source: one insider, never a shop an item");
  assert.equal(of(null, "adviser").insider, true);
  assert.equal(sourceKind("料理画家クチーナカメヤマ（日本 · 意大利酒馆店主）"), "意大利酒馆店主");
  assert.equal(sourceKind("QSR Media（澳大利亚、英国 · 快餐与连锁媒体）"), "快餐与连锁媒体");
  assert.equal(sourceKind("Some Blog（美国）"), null);
});

const T = tag();
// Placing an item without a story (backend/place.ts): P1 names a group of another situation first, then right; P3 is
// an adviser's; any other item (P2, the held case) fits none.
const placeUsers: string[] = [];
const model = await stub((_hit, req) => {
  const body = JSON.parse(req.body) as { messages: Array<{ role: string; content: string }> };
  const user = body.messages.at(-1)!.content;
  placeUsers.push(user);
  const out = user.includes("本站标题：P1\n")
    ? { speaker: "owner", placements: [{ situation: "hiring", fit: "店主在门口贴启事招人", group: user.includes("有问题") ? "where-to-find" : "food-over-recipe" }] }
    : user.includes("本站标题：P3\n") ? { speaker: "adviser", placements: [{ situation: "hiring", fit: "顾问讲面试", group: "interview" }] }
    : { speaker: "media", placements: [] };
  return { id: `stub-place-${placeUsers.length}`, model: "stub", choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
});
pointModels(model.url, ["deepseek-flash"]);
process.env.REFERENCE_PLACE_MODEL = "deepseek-flash";
installModules([reference]);
const app = await buildApp();
const SRC = `reference-${T}`;
const SOURCE = "A restaurant's linen bill grew 74% from $865 to $1,503 per week over about four years.";
const ids: Record<string, string> = {};
const get = async (path: string) => JSON.parse((await app.inject(path)).body);

/** A selected item of the test source, public a minute ago; its id. */
async function selectedItem(marker: string): Promise<string> {
  const { articleId } = await upsertMaterial({ sourceId: SRC, url: `https://example.com/${marker}-${T}`, title: `${marker}-${T}`, bodyText: `${marker}-${T} ${SOURCE}`, bodyStatus: "ok", via: "fetch", publishedAt: new Date() });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected) VALUES (${articleId}, 1, 'rule', 'pass', 'tip', ${marker}, '摘要', 60, true)`;
  await publishArticle(articleId, { releasedAt: new Date(Date.now() - 60_000) });
  return articleId;
}

/**
 * The stories written until 10-18, as reference_cases keeps them: the story's own words (which no page shows any
 * more), its shop and where it is placed. FIRST and SECOND are one bistro (one shop key) in two causes; COFFEE an owner
 * who names no shop, in no cause of the situation; LOOSE in no situation; HELD failed its checks and was never shown.
 */
const CASES: Array<[marker: string, status: string, shopKey: string | null, speaker: string, placements: Array<{ situation: string; group: string | null }>]> = [
  ["FIRST", "story", "bistro", "media", [{ situation: "busy-no-profit", group: "fixed-costs-creep" }]],
  ["SECOND", "story", "bistro", "media", [{ situation: "busy-no-profit", group: "food-over-recipe" }]],
  ["COFFEE", "story", null, "owner", [{ situation: "busy-no-profit", group: "no-such-group" }]],
  ["LOOSE", "story", null, "owner", []],
  ["HELD", "held", null, "owner", [{ situation: "busy-no-profit", group: "fixed-costs-creep" }]],
];

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, tags) VALUES (${SRC}, 'Total Food Service（美国 · 餐饮媒体）', 'rss', 'T2', 'editorial', ${["美国", "媒体"]})`;
  for (const [marker, status, shopKey, speaker, placements] of CASES) {
    ids[marker] = await selectedItem(marker);
    const story = {
      title: `${marker} 的故事标题`, lead: "故事的开头。", who: "", parts: [], open: null,
      shop: { name: shopKey ? "Corner Bistro" : null, label: "加州一家小酒馆", country: "日本", city: null, kind: null, size: null, speaker },
      placements: placements.map((p) => ({ ...p, card: "一句话。" })),
    };
    await sql`INSERT INTO reference_cases (article_id, revision, status, story, situations, shop_key, prompt_version)
      VALUES (${ids[marker]!}, 1, ${status}, ${sql.json(story)}, ${placements.map((p) => p.situation)}, ${shopKey}, 'test')`;
  }
});
after(async () => { installModules([]); await app.close(); await model.close(); await stopBoss(); await closeDb(); });

test("the pages list the stories' items by cause under the items' own titles, a situation once enough shops tell it", async () => {
  const thin = await get("/api/reference");
  assert.deepEqual([thin.categories, thin.totals.situations], [[], 0], "three items are no page in the lists where they ask for eight");
  // The stories here are three: the rest reads the lists as they are from two.
  LISTED.fromCases = 2;
  const home = await get("/api/reference");
  const cost = home.categories.find((c: { key: string }) => c.key === "cost");
  assert.deepEqual(cost.situations.map((s: { slug: string; count: Count }) => [s.slug, s.count]),
    [["busy-no-profit", { shops: 2, insiders: 0, cases: 3 }]], "the bistro's two items one shop; the held case not counted");
  assert.deepEqual(home.ranking.map((s: { slug: string }) => s.slug), ["busy-no-profit"]);
  assert.deepEqual(home.totals, { situations: 1, cases: 3 }, "the story placed in no situation is on no page and not counted");
  assert.equal("recent" in home, false, "no 最近收进: it was the newest story");
  for (const gone of ["/api/reference/kinds/dining", "/api/reference/kinds/coffee"]) assert.equal((await app.inject(gone)).statusCode, 404, `${gone}: no shop kinds' pages`);

  const page = await get("/api/reference/situations/busy-no-profit");
  assert.deepEqual(page.count, { shops: 2, insiders: 0, cases: 3 });
  assert.deepEqual(page.causes.map((g: { key: string }) => g.key), ["food-over-recipe", "fixed-costs-creep"], "the causes with items, in the situation's order");
  assert.deepEqual(page.groups.map((g: { key: string; cases: Array<{ id: string }> }) => [g.key, g.cases.map((c) => c.id)]),
    [["food-over-recipe", [ids.SECOND]], ["fixed-costs-creep", [ids.FIRST]]], "a section a cause");
  assert.deepEqual(page.rest.map((c: { id: string }) => c.id), [ids.COFFEE], "a group not of the situation: 其他做法");
  const [first] = page.groups[1].cases;
  assert.deepEqual([first.title, first.reason, first.item.summary, first.item.selected], ["FIRST", null, "摘要", true], "the item's own title and 导读, not the story's");
  assert.match(first.src, /^美国 · 餐饮媒体 · \d{4} 年 \d{1,2} 月$/, "the source's country, not the story's; the source's kind; the month");
  assert.deepEqual(Object.keys(first).sort(), ["id", "item", "reason", "src", "title"], "nothing of the story or its shop");
  assert.equal((await app.inject("/api/reference/situations/no-such-situation")).statusCode, 404);

  assert.deepEqual(await get(`/api/reference/items/${ids.FIRST}`), { id: ids.FIRST, situation: { slug: "busy-no-profit", title: page.title, count: page.count } },
    "its item page leads to its situation");
  for (const none of [ids.LOOSE, ids.HELD]) assert.equal((await app.inject(`/api/reference/items/${none}`)).statusCode, 404, "in no situation, or never shown");

  // The old addresses: no database read, so any id goes where a story would.
  for (const id of [ids.FIRST!, "never-a-story"]) {
    const res = await app.inject(`/api/reference/cases/${id}`);
    assert.deepEqual([res.statusCode, res.headers.location], [308, `/api/site/items/${id}`]);
  }
  const shop = await app.inject("/api/reference/shops/bistro");
  assert.deepEqual([shop.statusCode, shop.headers.location], [308, "/api/reference"]);
  assert.equal((await app.inject(`/og/reference/cases/${ids.FIRST}.png`)).statusCode, 404, "no share images");

  const sitemap = (await reference.sitemap!.entries!()).map((e) => e.loc);
  assert.deepEqual(sitemap.filter((loc) => loc.startsWith("/reference/")), ["/reference/busy-no-profit"], "the situations only");

  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${ids.SECOND!}`;
  const left = await get("/api/reference/situations/busy-no-profit");
  assert.deepEqual([left.groups.map((g: { key: string }) => g.key), left.count.cases], [["fixed-costs-creep"], 2], "a withdrawn item leaves the page");
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${ids.COFFEE!}`;
  const after = await get("/api/reference");
  assert.deepEqual([after.categories, after.ranking], [[], []], "one shop left is not in the lists");
  await sql`UPDATE publications SET visibility = 'public' WHERE article_id IN (${ids.SECOND!}, ${ids.COFFEE!})`;
  LISTED.fromCases = 8;
});

test("an item without a story is placed in one situation and group of the list, or none, and the pages list it as a story's item", async () => {
  assert.deepEqual(readPlacing({ speaker: "owner", placements: [{ situation: "hiring", group: null, fit: "" }, { situation: "retention", group: null, fit: "" }] }).problems, ["只放一个最合适的情况"]);
  assert.match(readPlacing({ speaker: "owner", placements: [{ situation: "nowhere", group: null }] }).problems[0]!, /不在清单里/);
  assert.match(readPlacing({ speaker: "owner", placements: [{ situation: "suppliers", group: null, fit: "" }] }).problems[0]!, /组 key.*ingredient-prices-up/, "a group key as the situation names its situation");
  assert.match(readPlacing({ main: "只是消息", speaker: "media", placements: [{ situation: "hiring", group: null, fit: "" }] }).problems[0]!, /只是消息/, "news placed anyway is asked again");
  assert.deepEqual(readPlacing({ speaker: "nobody", placements: [] }).placing, { main: "", speaker: "media", placements: [] }, "who tells it outside the list: a publication");

  const id: Record<string, string> = {};
  for (const marker of ["P1", "P2", "P3"]) id[marker] = await selectedItem(marker);
  const waiting = (await articlesToPlace(50)).map((i) => i.id);
  assert.ok(Object.values(id).every((v) => waiting.includes(v)) && !waiting.includes(ids.FIRST!) && waiting.includes(ids.HELD!), "the items without a story, not the stories");
  const results = await placeWaiting(50);
  const p1 = results.find((r) => r.id === id.P1)!;
  assert.deepEqual([p1.placing.placements.map((p) => [p.situation, p.group]), p1.receiptIds.length], [[["hiring", "where-to-find"]], 2], "a group of another situation goes back once, named");
  assert.equal(p1.gaveUp, false, "fixed on the second answer: placed, its first answer's problem kept only to show");
  assert.ok(placeUsers.some((u) => u.includes("“food-over-recipe”不是“hiring”的组")));
  assert.ok(!placeUsers.some((u) => u.includes(SOURCE)), "the item's own title, 导读 and 要点, not the original");
  assert.equal((await articlesToPlace(50)).length, 0, "each placed once; one that fits none is kept, not asked again");
  assert.deepEqual((await articlesToPlace(50, new Date(), id.P3!)).map((i) => i.id), [id.P3], "--again: a placed item once more, by its id");
  assert.equal((await articlesToPlace(50, new Date(), ids.FIRST!)).length, 0, "--again never places a shown story");

  const page = await get("/api/reference/situations/hiring");
  const cards = page.groups.flatMap((g: { key: string; cases: Array<{ id: string; title: string }> }) => g.cases.map((c) => [g.key, c.id, c.title]));
  assert.deepEqual(cards.filter(([, cid]: string[]) => cid === id.P1 || cid === id.P3), [["where-to-find", id.P1, "P1"], ["interview", id.P3, "P3"]],
    "listed by its group under its own title, as a story's item is");
  assert.equal(page.count.insiders, 1, "the adviser an insider, not a shop");
  assert.equal((await get(`/api/reference/items/${id.P1}`)).situation.slug, "hiring", "its item leads to the situation");
  assert.equal((await app.inject(`/api/reference/items/${id.P2}`)).statusCode, 404, "one placed nowhere shows nothing");
  const { placing } = await get("/api/reference/status");
  assert.deepEqual(placing, { placed: 2, none: 2, waiting: 0 }, "P2 and the held case, which fit none here");

  // Agents read the library by situation (backend/agent.ts): its items with their links to the item and the original.
  // P1 is the one item of 招人 here: listed from one.
  LISTED.fromCases = 1;
  const library = AGENT_ABILITIES.find((a) => a.path === "/reference")!;
  assert.ok((await app.inject("/api/v1/agent/reference")).body.includes("situation=hiring"), "the list names the situation by its slug");
  const hiring = (await library.mcp.run({ situation: "hiring" })).text;
  const [url] = await sql<{ url: string }[]>`SELECT url FROM publications WHERE article_id = ${id.P1!}`;
  assert.ok(hiring.includes(`/items/${id.P1}`) && hiring.includes(`原文：${url!.url}`), "an item with its page and its original");
  assert.ok(!hiring.includes(`/items/${id.P2}`), "not one placed nowhere");
  assert.match((await library.mcp.run({ situation: "nowhere" })).text, /没有 nowhere 这种情况/);

  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${id.P1!}`;
  assert.ok(!(await get("/api/reference/situations/hiring")).groups.some((g: { cases: Array<{ id: string }> }) => g.cases.some((c) => c.id === id.P1)), "a withdrawn item leaves the page");
});
