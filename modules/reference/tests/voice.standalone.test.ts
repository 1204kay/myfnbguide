// 十一说 read aloud (backend/voice.ts) without a model or a voice: the script written and mended from what the check
// names, and the machine check's parts on made-up audio and transcripts. No database, no model.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Ask, IssueText } from "../backend/issue.ts";
import { applyFixes, CLOSING, gapsOver, heardShare, judge, numberWords, opening, pitchByMinute, wavSamples, writeScript } from "../backend/voice.ts";

const ISSUE: IssueText = {
  title: "细说的题目", brief: ["一", "二", "三"], preview: "今天先说两件事。",
  news: [{ head: "英国一年净关977家店", text: "英国净少了977家店〔16〕。" }], deep: "细说的正文〔7〕。", close: "合起来看〔3〕。",
};

/** A model answering each purpose in turn from a script, recording what it was shown. */
function scripted(answers: Record<string, unknown[]>, seen: string[] = []): Ask {
  return (async (purpose: string, _system: string, user: string) => {
    seen.push(`${purpose}\n${user}`);
    const next = answers[purpose]?.shift();
    if (next === undefined) throw new Error(`no answer for ${purpose}`);
    return next;
  }) as Ask;
}

test("the script opens and closes with the program's lines, and the check reads it against the page without 〔n〕", async () => {
  const seen: string[] = [];
  const ask = scripted({
    reference_issue_voice: [{ lines: ["大家早上好！我是十一。今天是10月31号。", "第一条，英国。", "英国净少了977家店。", CLOSING] }],
    reference_issue_voice_check: [{ problems: [] }],
  }, seen);
  const { lines, rounds } = await writeScript(ISSUE, "2026-10-31", ask, ask);
  assert.deepEqual(lines, [opening("2026-10-31"), "第一条，英国。", "英国净少了977家店。", CLOSING]);
  assert.equal(opening("2026-10-31"), "大家早上好！我是十一。今天是10月31号。");
  assert.equal(rounds.length, 0);
  assert.ok(!seen.some((s) => s.includes("〔")), "the 〔n〕 marks are the page's links, never said");
});

test("the check's fixes go in line by line; still wrong after two mends, there is no script", async () => {
  const wrong = { problems: [{ kind: "严重", line: "英国净少了一千家店。", fix: "英国净少了977家店。", why: "数字" }] };
  const ok = scripted({
    reference_issue_voice: [{ lines: ["英国净少了一千家店。"] }],
    reference_issue_voice_check: [wrong, { problems: [] }],
  });
  const mended = await writeScript(ISSUE, "2026-10-31", ok, ok);
  assert.deepEqual(mended.lines?.slice(1, -1), ["英国净少了977家店。"]);
  assert.equal(mended.rounds[0]!.applied, 1);

  const stubborn = { problems: [{ kind: "漏讲", line: "没有这一行", fix: "补上", why: "漏了细说" }] };
  const bad = scripted({ reference_issue_voice: [{ lines: ["英国净少了977家店。"] }], reference_issue_voice_check: [stubborn, stubborn, stubborn] });
  assert.equal((await writeScript(ISSUE, "2026-10-31", bad, bad)).lines, null);
});

test("a fix naming no line of the script changes nothing", () => {
  assert.deepEqual(applyFixes(["甲", "乙"], [{ kind: "", line: "丙", fix: "丁", why: "" }]), { lines: ["甲", "乙"], applied: 0 });
  assert.deepEqual(applyFixes(["甲", "乙"], [{ kind: "", line: "乙", fix: "乙一\n乙二", why: "" }]).lines, ["甲", "乙一", "乙二"]);
});

test("numbers are compared as said, whether the transcript writes digits or characters", () => {
  assert.equal(numberWords("977"), "九百七十七");
  assert.equal(numberWords("98000"), "九万八千");
  assert.equal(numberWords("2026"), "二千零二十六");
  assert.equal(numberWords("10"), "十");
  assert.equal(numberWords("3.6"), "三点六");
  assert.equal(heardShare("净少了977家，涨了3.6%。", "净少了九百七十七家 涨了百分之三点六"), 1);
  assert.ok(heardShare("今天先说两件事", "今天说两件事") < 1);
});

test("the machine check: gaps between what was heard, and each failed part named", () => {
  assert.deepEqual(gapsOver([{ start: 0, end: 5 }, { start: 5.5, end: 9 }, { start: 14, end: 20 }], 4), [{ from: 9, to: 14 }]);
  assert.deepEqual(judge(494, 0.954, [], [210, 215, 205]), { pass: true, why: [] });
  const failed = judge(494, 0.9, [{ from: 9, to: 14 }], [176, 219]);
  assert.equal(failed.pass, false);
  assert.equal(failed.why.length, 4, failed.why.join("；"));
});

test("pitch a minute: a steady 210 Hz voice reads as 210", () => {
  const rate = 24_000;
  const samples = new Int16Array(rate * 70);
  for (let i = 0; i < samples.length; i += 1) samples[i] = Math.round(6000 * (Math.sin((2 * Math.PI * 210 * i) / rate) + 0.5 * Math.sin((2 * Math.PI * 420 * i) / rate)));
  const pitch = pitchByMinute(samples, rate);
  assert.equal(pitch.length, 2);
  for (const p of pitch) assert.ok(Math.abs(p - 210) < 2, String(p));
});

test("a WAV's samples are found wherever its data chunk sits", () => {
  const data = Buffer.alloc(8);
  data.writeInt16LE(1000, 0);
  data.writeInt16LE(-1000, 2);
  const fmt = Buffer.alloc(24);
  fmt.write("fmt ", 0, "ascii"); fmt.writeUInt32LE(16, 4); fmt.writeUInt16LE(1, 8); fmt.writeUInt16LE(1, 10);
  fmt.writeUInt32LE(24_000, 12); fmt.writeUInt32LE(48_000, 16); fmt.writeUInt16LE(2, 20); fmt.writeUInt16LE(16, 22);
  const list = Buffer.from("LIST\x04\x00\x00\x00abcd", "binary");
  const head = Buffer.from("data\x08\x00\x00\x00", "binary");
  const body = Buffer.concat([Buffer.from("WAVE", "ascii"), fmt, list, head, data]);
  const riff = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(4), body]);
  const { rate, samples } = wavSamples(riff);
  assert.equal(rate, 24_000);
  assert.deepEqual([...samples.slice(0, 2)], [1000, -1000]);
});
