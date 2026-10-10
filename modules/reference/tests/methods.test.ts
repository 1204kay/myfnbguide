// What the grouping of practices reads (backend/methods.ts materialOf). Failure cases: a situation's stories reach
// the model interleaved newest first, a cause group's stories scattered among the others, so it writes a practice
// a story; a story is left out of the material; a group without stories gets a heading; the problems sent back name
// a shop otherwise (s1, s2…) than the material it read.
import "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { closeDb } from "@aihot/backend/db";
import { materialOf, readGrouping, type Member } from "../backend/methods.ts";
import { findSituation } from "../situations.ts";
import type { CaseStory } from "../types.ts";

after(closeDb);

const situation = findSituation("owner-overload")!;
// The situation's own wording, so a change of its text does not fail these tests.
const title = (key: string) => situation.groups.find((g) => g.key === key)!.title;

function member(id: string, group: string | null, teller: string): Member {
  const story: CaseStory = {
    title: `${id} 的故事`, lead: "店里离不开老板。", who: "日本一位个体餐饮店店主。",
    parts: [{ heading: "他定下每周休两天", blocks: [{ type: "text", text: "开店第七年，他把休息日从每周一天改成两天。" }] }],
    open: null,
    shop: { name: null, label: "一家个体餐饮店", country: "日本", city: null, kind: null, size: null, speaker: "owner" },
    placements: [{ situation: "owner-overload", group, card: "店主定下每周休两天。" }],
  };
  return { id, group, teller, story };
}

test("the stories are read a cause group at a time, in the situation's order, those of no group last", () => {
  // Newest first, as the cases are shown: the groups interleaved.
  const given = [
    member("m1", "owner-time", "shop:a"), member("m2", "delegate", "shop:b"), member("m3", null, "insider:src"),
    member("m4", "runs-without-you", "shop:b"), member("m5", "delegate", "shop:d"),
  ];
  const { members, text } = materialOf(situation, given);
  assert.deepEqual(members.map((m) => m.id), ["m4", "m2", "m5", "m1", "m3"], "a group's own order kept");
  const at = (s: string) => {
    const i = text.indexOf(s);
    assert.ok(i >= 0, `${s} in the material`);
    return i;
  };
  const order = [
    `原因组 runs-without-you（${title("runs-without-you")}）的 1 篇故事`, "id：m4", `原因组 delegate（${title("delegate")}）的 2 篇故事`, "id：m2", "id：m5",
    `原因组 owner-time（${title("owner-time")}）的 1 篇故事`, "id：m1", "没有原因组的 1 篇故事", "id：m3",
  ].map(at);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  // The tellers are named in the order read: shop b first (m4, m2), then d, a and the insider, each said to be a shop or not.
  for (const [id, name, kind] of [["m4", "s1", "店"], ["m2", "s1", "店"], ["m5", "s2", "店"], ["m1", "s3", "店"], ["m3", "s4", "业内人士，不是店"]]) {
    assert.match(text, new RegExp(`id：${id}\\n原因组：[^\\n]+\\n店家：${name}（日本 · 一家个体餐饮店；${kind}）`));
  }

  const one = materialOf(situation, [member("d1", "delegate", "shop:x"), member("d2", "delegate", "shop:y")]).text;
  assert.ok(!one.includes("原因组 runs-without-you（") && !one.includes("没有原因组的"), "no heading for a group without stories");
  const empty = situation.groups.find((g) => g.key === "runs-without-you")!;
  assert.ok(one.includes(`- runs-without-you：${empty.title}（${empty.line}）`), "every cause group is still listed");
});

test("the problems sent back name the shops as the material did", () => {
  const { members, text } = materialOf(situation, [member("m1", "owner-time", "shop:a"), member("m2", "delegate", "shop:b"), member("m5", "delegate", "shop:d")]);
  assert.ok(text.includes("id：m2\n原因组：delegate\n店家：s1") && text.includes("id：m5\n原因组：delegate\n店家：s2"));
  const read = readGrouping({ overview: "各家把老板做不完的事交给别人。", methods: [
    { group: "delegate", title: "把老板做不完的事交给员工", shops: [{ caseIds: ["m2", "m5"], line: "交给经理" }], summary: "两家店把门店的事交给经理。" },
    { group: "owner-time", title: "定下每周固定的休息日", shops: [{ caseIds: ["m1"], line: "每周休两天" }], summary: "店主定下每周休两天。" },
  ] }, members);
  assert.ok(read.problems.includes("第 1 个做法第 1 家的那一行放了不同店家（s1、s2）的故事：一行只写一家店"), read.problems.join(" | "));
});

test("a grouping whose only problems are its length or words is kept; a number the stories do not have holds it back", () => {
  const { members } = materialOf(situation, [member("m2", "delegate", "shop:b"), member("m5", "delegate", "shop:d")]);
  const grouping = (title: string, line: string) => ({ overview: "各家把老板做不完的事交给别人。", methods: [
    { group: "delegate", title, shops: [{ caseIds: ["m2"], line }, { caseIds: ["m5"], line: "交给店长" }], summary: "两家店把门店的事交给经理。" },
  ] });
  const long = readGrouping(grouping("把老板做不完的事交给员工".repeat(8), "交给经理"), members);
  assert.ok(long.grouping, "kept with a title too long");
  assert.ok(long.problems.some((p) => p.startsWith("第 1 个做法的标题太长：")), long.problems.join(" | "));
  const number = readGrouping(grouping("把老板做不完的事交给员工", "交给经理，每周省下 30 小时"), members);
  assert.equal(number.grouping, null, "held back by a number not in the stories");
});
