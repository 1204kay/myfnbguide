// The words the program sends back to the model (industry/wording.ts, editorial/wording.ts). Failure cases: a place
// name or a note to itself reaches readers unflagged; an old region tag survives normalization.
import assert from "node:assert/strict";
import { test } from "node:test";
import { wordingProblems } from "@aihot/backend/editorial/wording";
import { normalizeTags } from "@aihot/backend/editorial/vocabulary";

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
