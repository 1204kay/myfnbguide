// The checker's fix-and-recheck rules (决定记录 2026-10-23): fixes go in, only the changed sentences are checked
// again, and a title or lead still wrong, or no point left, keeps the item out of the selection.
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkAndFix, type Draft, type Problem } from "@aihot/backend/editorial/check";

const draft: Draft = { title: "标题", lead: "导读。", points: ["要点一", "要点二", "要点三"] };
const p = (x: Partial<Problem>): Problem => ({ field: "point", point: 0, quote: "", kind: 0, severity: "serious", why: "", fix: "", ...x });
function asker(...answers: Problem[][]) {
  const asked: Array<{ d: Partial<Draft>; step: string }> = [];
  return { asked, ask: async (d: Partial<Draft>, step: string) => { asked.push({ d, step }); return { problems: answers[asked.length - 1] ?? [], receiptId: asked.length }; } };
}

test("a clean draft is checked once and kept", async () => {
  const a = asker([]);
  assert.deepEqual(await checkAndFix(draft, a.ask), { draft, held: false, copyWrong: false, receiptIds: [1] });
  assert.equal((await checkAndFix({ ...draft, points: [] }, asker([]).ask)).held, true, "no points: the reader still has to click");
});

test("fixes go in and only the changed sentences are checked again", async () => {
  const a = asker([p({ field: "lead", fix: "改过的导读。" }), p({ point: 2, severity: "misleading", fix: "改过的要点二" }), p({ point: 3, severity: "minor", fix: "不改" })], []);
  const r = await checkAndFix(draft, a.ask);
  assert.deepEqual(r, { draft: { title: "标题", lead: "改过的导读。", points: ["要点一", "改过的要点二", "要点三"] }, held: false, copyWrong: false, receiptIds: [1, 2] });
  assert.deepEqual(a.asked[1], { d: { lead: "改过的导读。", points: ["改过的要点二"] }, step: "recheck" });
});

test("on the re-check a serious point is dropped, a misleading one takes the fix, a serious lead holds the item", async () => {
  const first = [p({ point: 1, fix: "新一" }), p({ point: 2, fix: "新二" })];
  const r = await checkAndFix(draft, asker(first, [p({ point: 1 }), p({ point: 2, severity: "misleading", fix: "再改二" })]).ask);
  assert.deepEqual(r.draft.points, ["再改二", "要点三"]);
  assert.equal(r.held, false);
  const lead = await checkAndFix(draft, asker([p({ field: "lead", fix: "新导读。" })], [p({ field: "lead" })]).ask);
  assert.equal(lead.held, true);
  assert.equal((await checkAndFix(draft, asker([p({ field: "title" })]).ask)).held, true, "a title with no fix stays wrong");
  const none = await checkAndFix({ ...draft, points: ["要点一"] }, asker([p({ point: 1, fix: "新一" })], [p({ point: 1 })]).ask);
  assert.deepEqual([none.draft.points, none.held, none.copyWrong], [[], true, false], "no point left holds a new item, but the copy itself is right");
  assert.equal(lead.copyWrong, true);
});

test("a wrong fact (kinds 1–4) graded minor still takes its fix (10-23: an example written as the author's practice, serious one run, minor the next)", async () => {
  const a = asker([p({ point: 1, kind: 3, severity: "minor", fix: "举例的要点一" }), p({ point: 2, kind: 5, severity: "minor", fix: "不改" }), p({ point: 3, kind: 1, severity: "minor" })], []);
  const r = await checkAndFix(draft, a.ask);
  assert.deepEqual(r.draft.points, ["举例的要点一", "要点二", "要点三"], "wording (kind 5) stays; a minor with no fix does not drop the point");
  assert.deepEqual(a.asked[1], { d: { points: ["举例的要点一"] }, step: "recheck" });
});

test("a fix that drops a country the sentence named is not used (10-23 batch 3: 「在中国开出」 → 「全国开出」)", async () => {
  const d: Draft = { title: "中国火锅连锁放缓扩张", lead: "茶瀑布在中国开出1500多家门店。", points: ["要点一", "美国的要点二"] };
  const r = await checkAndFix(d, asker([p({ field: "lead", severity: "misleading", fix: "茶瀑布全国开出1500多家门店。" }), p({ point: 1, fix: "日本的要点一" })], []).ask);
  assert.deepEqual(r, { draft: { ...d, points: ["日本的要点一", "美国的要点二"] }, held: false, copyWrong: false, receiptIds: [1, 2] });
  // 10-24: a serious wrong fact whose fix also dropped 美国 went live unchanged; it is dropped (a point) or holds the item.
  const point = await checkAndFix(d, asker([p({ point: 2, kind: 1, fix: "某品牌的要点二" })]).ask);
  assert.deepEqual([point.draft.points, point.held], [["要点一"], false]);
  const title = await checkAndFix(d, asker([p({ field: "title", fix: "火锅连锁放缓扩张" })]).ask);
  assert.deepEqual([title.draft.title, title.held, title.copyWrong], ["中国火锅连锁放缓扩张", true, true]);
});
