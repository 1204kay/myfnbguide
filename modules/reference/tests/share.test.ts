// Failure cases: a story's share image shows a figure of a weaker kind while a stronger one is there, a block it cannot
// draw (made-up numbers, a parts bar, a figure with no number, one bar, a quote it would have to cut), or nothing
// where the story has a figure; the image is not a 1200×630 PNG, is drawn for a story the site does not show, or is
// sent again to a reader who has it.
import { tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import sharp from "sharp";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { publishArticle } from "@aihot/backend/publication/publish";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import reference from "../server.ts";
import { pickFigure, QUOTE_MAX, renderShare, shareCard } from "../backend/share.ts";
import { shareImagePath } from "../format.ts";
import type { Block, CaseStory } from "../types.ts";

const NUMBERS: Block = { type: "numbers", point: "摆摊四小时的销量超过开店一天要卖的量", items: [{ value: "200 份", label: "开店每天要卖" }, { value: "300 份", label: "市集四小时卖出" }], caption: null };
const CHANGE: Block = { type: "change", before: { label: "以前", text: "做炸牛排、肉饼，一天做 150 到 200 个客人" }, after: { label: "现在", text: "做牛排，客单价约 100 美元" }, caption: null };
const COMPARE: Block = { type: "compare", unit: "澳元", per: null, caption: "定价", items: [{ label: "现在一碗面", value: 18 }, { label: "他说够本要卖", value: 20 }], change: { amount: 2, percent: 11.1, yearly: null } };
const QUOTE: Block = { type: "quote", text: "我不能因为价格而担心失去客人。", who: "兰迪·伯克斯，Randy's Steakhouse 店主" };
const PARTS: Block = { type: "parts", unit: "欧元", items: [{ label: "餐车", value: 12000 }, { label: "设备", value: 5000 }], against: null, caption: "投入", total: 17000, gap: null };
const EXAMPLE: Block = { type: "example", kind: "breakeven", caption: "举例", rows: [], equation: "18,000 元 ÷ 每份 18 元 = 1,000 份", result: "一个月至少要卖 1,000 份" };

const story = (blocks: Block[], title = "牛排馆老板把客单价做到约 100 美元"): CaseStory => ({
  title, lead: "客人越来越多，钱却没有多赚。", who: "美国一家牛排馆的店主。",
  parts: [{ heading: "以前", blocks: [{ type: "text", text: "他以前做炸牛排。" }, ...blocks.slice(0, 2)] }, { heading: "现在", blocks: blocks.slice(2) }],
  open: null,
  shop: { name: "Randy's Steakhouse", label: "美国一家牛排馆", country: "美国", city: null, kind: null, size: null, speaker: "owner" },
  placements: [{ situation: "pricing", group: null, card: "他把客单价做到约 100 美元。" }],
});

test("a card shows the strongest figure the story has: key figures, then before and after, then bars, then a quote, else none", () => {
  assert.equal(pickFigure(story([QUOTE, COMPARE, CHANGE, NUMBERS]))?.type, "numbers", "wherever the key figures stand");
  assert.equal(pickFigure(story([QUOTE, COMPARE, CHANGE]))?.type, "change");
  assert.equal(pickFigure(story([QUOTE, COMPARE]))?.type, "compare");
  assert.equal(pickFigure(story([PARTS, EXAMPLE, QUOTE]))?.type, "quote", "a parts bar and an example are no card's figure");
  assert.equal(pickFigure(story([PARTS, EXAMPLE, { type: "list", items: [{ lead: null, text: "一条" }] }, { type: "flow", steps: ["一", "二"] }])), null);
  const second: Block = { ...QUOTE, text: "第二句。" };
  assert.equal(pickFigure(story([QUOTE, second])), QUOTE, "the first of its kind");
});

test("a block the card cannot draw as the story does is passed over", () => {
  assert.equal(pickFigure(story([{ ...NUMBERS, items: [{ value: "很多", label: "客人" }] } as Block, QUOTE]))?.type, "quote", "a figure with no number");
  assert.equal(pickFigure(story([{ ...COMPARE, items: [{ label: "只有一项", value: 18 }] } as Block, QUOTE]))?.type, "quote", "one bar compares nothing");
  assert.equal(pickFigure(story([{ ...COMPARE, items: [{ label: "亏", value: -5 }, { label: "赚", value: 3 }] } as Block]))?.type, undefined, "a negative bar");
  assert.equal(pickFigure(story([{ ...CHANGE, after: { label: "现在", text: " " } } as Block])), null, "an empty side");
  assert.equal(pickFigure(story([{ ...QUOTE, text: "很".repeat(QUOTE_MAX + 1) } as Block])), null, "a quote too long to show whole is not cut");
  assert.equal(pickFigure(story([{ ...QUOTE, text: "很".repeat(QUOTE_MAX) } as Block]))?.type, "quote");
});

test("every kind of card is drawn as a 1200×630 PNG, Chinese and Latin alike", async () => {
  const place = { situation: "菜单怎么定价", src: "美国 · 播客 · 2025 年 1 月" };
  const long = "Bar Francine 把利润的 10% 分给全店，核心员工持股，每周只开四天，一年后员工一个都没有走，老板说这是最划算的一笔支出";
  for (const blocks of [[NUMBERS], [{ ...NUMBERS, items: [{ value: "10%", label: "公司利润分给员工" }, { value: "4 天", label: "全店每周工作天数" }, { value: "约 3 人", label: "持股的核心员工" }] } as Block], [CHANGE], [COMPARE], [{ ...COMPARE, by: "group", unit: "%", change: null, items: [{ label: "In-N-Out 门店", value: 15, to: 20 }, { label: "快餐连锁平均", value: 5, to: 8 }, { label: "正餐餐馆平均", value: 3, to: 6 }, { label: "第四组", value: 2 }] } as Block], [QUOTE], []]) {
    for (const title of ["牛排馆老板把客单价做到约 100 美元", long]) {
      const card = shareCard(story(blocks, title), place);
      const meta = await sharp(await renderShare(card)).metadata();
      assert.deepEqual([meta.format, meta.width, meta.height], ["png", 1200, 630], `${card.figure?.type ?? "title"}: ${title.slice(0, 10)}`);
    }
  }
});

installModules([reference]);
const app = await buildApp();
const T = tag();
const SRC = `share-${T}`;
const ids: Record<string, string> = {};

/** A selected item of the test source with its story, public a minute ago. */
async function shown(marker: string, told: CaseStory, status = "story") {
  const { articleId } = await upsertMaterial({ sourceId: SRC, url: `https://example.com/${marker}-${T}`, title: `${marker}-${T}`, bodyText: `${marker}-${T}`, bodyStatus: "ok", via: "fetch", publishedAt: new Date() });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected) VALUES (${articleId}, 1, 'rule', 'pass', 'tip', ${marker}, '摘要', 60, true)`;
  await publishArticle(articleId, { releasedAt: new Date(Date.now() - 60_000) });
  await sql`INSERT INTO reference_cases (article_id, revision, status, story, situations, shop_key, prompt_version) VALUES (${articleId}, 1, ${status}, ${sql.json(told as never)}, ${["pricing"]}, ${marker}, 'test')`;
  ids[marker] = articleId;
}

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, tags) VALUES (${SRC}, 'Share test（美国 · 播客）', 'rss', 'T2', 'editorial', ${["美国", "播客"]})`;
  await shown("FIGURES", story([QUOTE, NUMBERS]));
  await shown("PLAIN", story([]));
  await shown("HELD", story([NUMBERS]), "held");
});
after(async () => { installModules([]); await app.close(); await stopBoss(); await closeDb(); });

test("a shown story's share image is a PNG at its page's og:image address, cached by what it shows; others are a plain 404", async () => {
  for (const marker of ["FIGURES", "PLAIN"]) {
    const res = await app.inject(shareImagePath(ids[marker]!));
    assert.equal(res.statusCode, 200, marker);
    assert.equal(res.headers["content-type"], "image/png");
    assert.deepEqual(res.rawPayload.subarray(0, 8), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const meta = await sharp(res.rawPayload).metadata();
    assert.deepEqual([meta.width, meta.height], [1200, 630]);
    const again = await app.inject({ url: shareImagePath(ids[marker]!), headers: { "if-none-match": String(res.headers.etag) } });
    assert.equal(again.statusCode, 304, "a reader who has it gets no bytes");
  }
  const [a, b] = await Promise.all(["FIGURES", "PLAIN"].map((m) => app.inject(shareImagePath(ids[m]!))));
  assert.notEqual(a!.headers.etag, b!.headers.etag, "the ETag follows what the card shows");
  for (const gone of [shareImagePath(ids.HELD!), shareImagePath("no-such-story"), `/og/reference/cases/${ids.FIGURES}.jpg`]) {
    const res = await app.inject(gone);
    assert.equal(res.statusCode, 404, gone);
    assert.equal(res.headers["content-type"], "text/plain; charset=utf-8");
  }
});
