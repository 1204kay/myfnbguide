// What the program does to written copy before it is stored (editorial/wording.ts) and the words it sends back
// to the model (industry/wording.ts). Failure cases: a number or Latin word glued to Chinese is stored as written
// (“31席”), or a space lands inside a number, a link, a percentage or a price (“1. 1%”, “US $400”); spacing runs
// for a pack that did not ask for it; a place name or a note to itself reaches readers unflagged; an old region
// tag survives normalization.
import assert from "node:assert/strict";
import { test } from "node:test";
import { spaceCopy, spaced, wordingProblems } from "@aihot/backend/editorial/wording";
import { normalizeTags } from "@aihot/backend/editorial/vocabulary";

test("a space goes between Chinese and a number or a Latin word, on both sides", () => {
  assert.equal(spaced("31席"), "31 席");
  assert.equal(spaced("2.5万卢比"), "2.5 万卢比");
  assert.equal(spaced("用AI改菜单"), "用 AI 改菜单");
  assert.equal(spaced("2026年8月营收增长1.1%，利润率0.8%至1%"), "2026 年 8 月营收增长 1.1%，利润率 0.8% 至 1%");
  assert.equal(spaced("Yellow Monday店主在12点20分开门"), "Yellow Monday 店主在 12 点 20 分开门");
  assert.equal(spaced("クチーナカメヤマ3号店"), "クチーナカメヤマ 3 号店");
});

test("numbers, words, links, percentages and prices stay whole; spaced text is left as it is", () => {
  assert.equal(spaced("1.1%"), "1.1%");
  assert.equal(spaced("花了US$400"), "花了 US$400");
  assert.equal(spaced("花了$400买"), "花了 $400 买");
  assert.equal(spaced("见https://example.com/a1b2?x=3中文"), "见https://example.com/a1b2?x=3中文");
  assert.equal(spaced("COVID-19疫情后Wi-Fi点餐"), "COVID-19 疫情后 Wi-Fi 点餐");
  assert.equal(spaced("“AI”导读，（2025 年）"), "“AI”导读，（2025 年）");
  const once = spaced("每周从864.97美元涨到1502.65美元，涨幅73.7%");
  assert.equal(once, "每周从 864.97 美元涨到 1502.65 美元，涨幅 73.7%");
  assert.equal(spaced(once), once);
});

test("a written copy is spaced only when the pack asks for it", () => {
  const copy = { titleZh: "用AI改菜单", summaryZh: "3家店试了30天。", reasonZh: null, kind: "understand" };
  assert.deepEqual(spaceCopy(copy, true), { titleZh: "用 AI 改菜单", summaryZh: "3 家店试了 30 天。", reasonZh: null, kind: "understand" });
  assert.equal(spaceCopy(copy, false), copy, "a pack without spacing gets its copy back untouched");
  assert.equal(spaceCopy(copy).titleZh, "用 AI 改菜单", "this site's pack asks for it (READER_SPACING)");
});

test("place names, spoken words, Japanese terms and notes to itself are sent back to the model", () => {
  const flagged = (text: string) => wordingProblems({ titleZh: text, summaryZh: "", reasonZh: null });
  assert.match(flagged("澳洲储备银行的禁令生效")[0]!, /澳大利亚/);
  assert.match(flagged("台湾播客谈开店")[0]!, /中国台湾/);
  assert.equal(flagged("中国台湾播客谈开店，中国香港的店也在听").length, 0);
  assert.equal(flagged("味道过得去，物价上涨很厉害，人还是没歇过来").length, 3);
  assert.equal(flagged("这家店暂时歇业，另做企业茶歇").length, 0, "歇业 and 茶歇 are written Chinese");
  assert.equal(flagged("居抜き物件的坪単価，坪月商 90 万日元").length, 4);
  assert.equal(flagged("原文未提供更多细节。节目还谈到外卖。").length, 2);
  assert.equal(flagged("原文没有说布草费有没有追回。").length, 0, "a story may say what the source leaves open");
});

test("region tags take the names readers see", () => {
  assert.deepEqual(normalizeTags(["行业动态", "澳洲", "香港", "台湾"]), ["行业动态", "澳大利亚", "中国香港", "中国台湾"]);
  assert.deepEqual(normalizeTags(["行业动态", "澳大利亚", "新西兰"]), ["行业动态", "澳大利亚"], "New Zealand is not filed as Australia");
});
