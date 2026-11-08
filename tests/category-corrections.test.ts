// Failure cases: a benchmark, price change, tool or follow-up is counted as a new model; a category
// correction leaves frozen daily/weekly/monthly columns stale, rewrites the lead or selection, triggers
// a paid digest, leaves an obsolete section introduction, or commits without its audit/revision.
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { sql, closeDb } from "@aihot/backend/db";
import { overrideFields } from "@aihot/backend/admin/content";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { publishArticle } from "@aihot/backend/publication/publish";
import { dailyMetrics } from "@aihot/backend/reports/compose";
import type { EditionEntry } from "@aihot/backend/reports/edition";
import { QUEUES, getBoss, stopBoss } from "@aihot/backend/jobs/queue";
import { CATEGORIES, RELEASE } from "@aihot/industry/taxonomy";

// The category corrected from (the industry's release category when it has one) and one in another section.
const FROM = CATEGORIES.find((c) => c.key === (RELEASE?.category ?? CATEGORIES[0]!.key))!;
const TO = CATEGORIES.find((c) => c.section !== FROM.section)!;

after(async () => { await stopBoss(); await closeDb(); });

test("new models require a launch classification as well as an official, new model event", { skip: !RELEASE && "the industry counts no releases (RELEASE is null)" }, () => {
  const base = { category: "ai-models", tags: ["模型发布"], authority: 0, previous: null,
    entry: { sourceId: "official", firstParty: true } } as EditionEntry;
  const rows = [base, { ...base, tags: ["评测/基准"] }, { ...base, tags: ["产品更新"] },
    { ...base, category: "ai-products" }, { ...base, authority: 3 },
    { ...base, previous: { key: "2026-09-30", title: "已报过的发布" } }, { ...base, tags: [] }];
  assert.equal(dailyMetrics(rows).modelsReleased, 1);
  assert.equal(dailyMetrics(rows).totalEvents, 7);
});

test("category corrections revise every standard report atomically without selecting, rewriting or notifying", async () => {
  await getBoss(); // the digest check below reads the job table
  const sourceId = `category-${tag()}`;
  await sql`INSERT INTO sources (id,name,kind,tier,participation_mode) VALUES (${sourceId},'Category fixture','rss','T1','editorial')`;
  const { articleId } = await upsertMaterial({ sourceId, url: `https://example.com/${sourceId}`, title: "开源推理工具", bodyText: "工具正文", bodyStatus: "ok", via: "fetch", publishedAt: new Date() });
  await sql`INSERT INTO analyses (article_id,input_revision,origin,relevance,category,tags,title_zh,summary_zh,score,selected)
    VALUES (${articleId},1,'rule','pass',${FROM.key},${[...(RELEASE ? [RELEASE.tag] : []), "DeepSeek"]},'开源推理工具','冻结摘要',88,true)`;
  const [story] = await sql`INSERT INTO stories (public_id,title) VALUES (gen_random_uuid(),'工具事件') RETURNING id`;
  const [fact] = await sql`INSERT INTO facts (public_id,title,story_id) VALUES (${`f-${tag()}`},'工具发布',${story!.id}) RETURNING id`;
  await sql`INSERT INTO fact_articles (fact_id,article_id,role) VALUES (${fact!.id},${articleId},'report')`;
  await publishArticle(articleId, { releasedAt: new Date() });
  const entry = { itemId: articleId, title: "冻结标题", summary: "冻结摘要", sourceId, firstParty: true, role: "官方" };
  const contents = [
    { kind: "daily", key: "2097-01-02", content: { leadItemId: articleId, lead: { title: "冻结头条" }, highlights: [articleId], flashes: [], sections: [{ label: FROM.section, items: [entry] }], metrics: { totalEvents: 1, modelsReleased: 1 } } },
    ...(["weekly", "monthly"] as const).map(kind => ({ kind, key: kind === "weekly" ? "2097-W01" : "2097-01", content: { headline: "冻结头条", leadItemId: articleId, storyOrder: [articleId], overview: "保留总述", themes: [{ heading: FROM.section, summary: "旧模型导读", storyRefs: [entry] }], metrics: { totalStories: 1 } } })),
  ];
  for (const r of contents) await sql`INSERT INTO reports (kind,key,window_start,window_end,content,generated_at,origin)
    VALUES (${r.kind},${r.key},now(),now(),${sql.json(r.content as never)},now(),'imported')`;
  const [before] = await sql`SELECT selected,seat,score,visible_after,selected_ready_at FROM publications WHERE article_id=${articleId}`;
  const change = (actor: string) => overrideFields(articleId, { fields: { category: TO.key, tags: ["开源/仓库", "DeepSeek"] }, version: 0, reason: "工具不是模型" }, actor);
  await sql.unsafe(`CREATE FUNCTION reject_category_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
    IF NEW.actor = 'reject-category' THEN RAISE EXCEPTION 'category audit rejected'; END IF; RETURN NEW; END $$`);
  await sql.unsafe("CREATE TRIGGER reject_category_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION reject_category_audit()");
  try {
    await assert.rejects(change("reject-category"), /category audit rejected/);
    assert.equal((await sql`SELECT category FROM publications WHERE article_id=${articleId}`)[0]!.category, FROM.key);
    assert.equal((await sql`SELECT 1 FROM report_revisions WHERE report_id IN (SELECT id FROM reports WHERE key IN ('2097-01-02','2097-W01','2097-01'))`).length, 0);
  } finally {
    await sql.unsafe("DROP TRIGGER reject_category_audit ON audit_log; DROP FUNCTION reject_category_audit()");
  }
  const digestCount = (await sql`SELECT count(*)::int AS n FROM pgboss.job WHERE name=${QUEUES.digest}`)[0]!.n;
  await change("test-category");
  for (const r of contents) {
    const [saved] = await sql`SELECT content,revision FROM reports WHERE kind=${r.kind} AND key=${r.key}`;
    assert.equal(saved!.revision, 2);
    const c = saved!.content;
    assert.equal(c.leadItemId, articleId);
    if (r.kind === "daily") {
      assert.deepEqual(c.sections, [{ label: TO.section, items: [entry] }]);
      if (RELEASE) assert.equal(c.metrics.modelsReleased, 0);
      assert.deepEqual(c.highlights, [articleId]);
      assert.equal(c.lead.title, "冻结头条");
    } else {
      assert.deepEqual(c.themes, [{ heading: TO.section, summary: null, storyRefs: [entry] }]);
      assert.deepEqual(c.storyOrder, [articleId]);
      assert.equal(c.overview, "保留总述");
    }
  }
  assert.deepEqual((await sql`SELECT selected,seat,score,visible_after,selected_ready_at FROM publications WHERE article_id=${articleId}`)[0], before);
  assert.equal((await sql`SELECT count(*)::int AS n FROM pgboss.job WHERE name=${QUEUES.digest}`)[0]!.n, digestCount);
  await overrideFields(articleId, { fields: {}, clear: ["category", "tags"], version: 1, reason: "验证撤销纠错" }, "test-category");
  const [restored] = await sql`SELECT content FROM reports WHERE kind='daily' AND key='2097-01-02'`;
  assert.equal(restored!.content.sections[0].label, FROM.section);
  if (RELEASE) assert.equal(restored!.content.metrics.modelsReleased, 1);
});

test("a correction keeps the introductions that still hold and clears one that names the moved entry", async () => {
  const sourceId = `category-intro-${tag()}`;
  await sql`INSERT INTO sources (id,name,kind,tier,participation_mode) VALUES (${sourceId},'Category intro fixture','rss','T2','editorial')`;
  const { articleId } = await upsertMaterial({ sourceId, url: `https://example.com/${sourceId}`, title: "炭火烧鸟店改截单", bodyText: "正文", bodyStatus: "ok", via: "fetch", publishedAt: new Date() });
  await sql`INSERT INTO analyses (article_id,input_revision,origin,relevance,category,tags,title_zh,summary_zh,score,selected)
    VALUES (${articleId},1,'rule','pass',${FROM.key},${["测试"]},'炭火烧鸟店改截单','烧鸟店把截单提前',70,true)`;
  await publishArticle(articleId, { releasedAt: new Date() });
  const moved = { itemId: articleId, title: "炭火烧鸟店改截单", summary: "烧鸟店把截单提前" };
  const other = (n: number, title: string) => ({ itemId: `${articleId}-${n}`, title, summary: `${title}的经过` });
  const stays = [other(1, "面包店重开"), other(2, "咖啡店改菜单"), other(3, "面馆算房租")];
  const there = [other(4, "外卖抽成上调"), other(5, "最低工资上调"), other(6, "平台收购被否")];
  const themes = (intro: string) => [
    { heading: FROM.section, summary: intro, storyRefs: [moved, ...stays] },
    { heading: TO.section, summary: "外卖抽成和最低工资都在上调。", storyRefs: there },
  ];
  const plain = { key: "2097-W02", intro: "面包店、咖啡店和面馆各自算账。" };
  const naming = { key: "2097-W03", intro: "炭火烧鸟店改截单，面包店重开。" };
  for (const r of [plain, naming]) await sql`INSERT INTO reports (kind,key,window_start,window_end,content,generated_at,origin)
    VALUES ('weekly',${r.key},now(),now(),${sql.json({ headline: "冻结头条", leadItemId: articleId, storyOrder: [articleId], overview: "保留总述", themes: themes(r.intro), metrics: { totalStories: 7 } } as never)},now(),'imported')`;
  await overrideFields(articleId, { fields: { category: TO.key }, version: 0, reason: "换栏目" }, "test-category");
  const intros = async (key: string) => Object.fromEntries(((await sql`SELECT content FROM reports WHERE kind='weekly' AND key=${key}`)[0]!.content.themes as Array<{ heading: string; summary: string | null }>).map(g => [g.heading, g.summary]));
  // Three entries stay and the introduction names none of what left: both introductions hold.
  assert.deepEqual(await intros(plain.key), { [FROM.section]: plain.intro, [TO.section]: "外卖抽成和最低工资都在上调。" });
  // It named the moved entry: that one goes, as the engine let it go; the target's still holds.
  assert.deepEqual(await intros(naming.key), { [FROM.section]: null, [TO.section]: "外卖抽成和最低工资都在上调。" });
});
