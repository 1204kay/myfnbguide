// 十一说 read aloud (backend/voice.ts) without a model or a voice: the script written and mended from what the check
// names, and the machine check's parts on made-up audio and transcripts. No database, no model.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Ask, IssueText } from "../backend/issue.ts";
import { applyFixes, joinLines, linePitch, offPitch, missedRuns, CLOSING, flipsHeard, endHeard, heardShare, judge, lineStarts, numberWords, opening, pitchWindows, semitones, quietCuts, silences, wavOf, wavSamples, writeScript } from "../backend/voice.ts";

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

test("the check's fixes go in line by line; still wrong after three mends, there is no script", async () => {
  const wrong = { problems: [{ kind: "严重", line: "英国净少了一千家店。", fix: "英国净少了977家店。", why: "数字" }] };
  const ok = scripted({
    reference_issue_voice: [{ lines: ["英国净少了一千家店。"] }],
    reference_issue_voice_check: [wrong, { problems: [] }],
  });
  const mended = await writeScript(ISSUE, "2026-10-31", ok, ok);
  assert.deepEqual(mended.lines?.slice(1, -1), ["英国净少了977家店。"]);
  assert.equal(mended.rounds[0]!.applied, 1);

  // A different line each round, as issue 8 had: the third mend still goes in.
  const line = (from: string, to: string) => ({ problems: [{ kind: "误导", line: from, fix: to, why: "出处" }] });
  const late = scripted({
    reference_issue_voice: [{ lines: ["甲说涨了。", "乙说跌了。", "丙说平了。"] }],
    reference_issue_voice_check: [line("甲说涨了。", "报道说甲涨了。"), line("乙说跌了。", "报道说乙跌了。"), line("丙说平了。", "报道说丙平了。"), { problems: [] }],
  });
  assert.deepEqual((await writeScript(ISSUE, "2026-10-31", late, late)).lines?.slice(1, -1), ["报道说甲涨了。", "报道说乙跌了。", "报道说丙平了。"]);

  const stubborn = { problems: [{ kind: "漏讲", line: "没有这一行", fix: "补上", why: "漏了细说" }] };
  const bad = scripted({ reference_issue_voice: [{ lines: ["英国净少了977家店。"] }], reference_issue_voice_check: [stubborn, stubborn, stubborn, stubborn] });
  assert.equal((await writeScript(ISSUE, "2026-10-31", bad, bad)).lines, null);
});

test("a script too long goes back to the writer with its length, then is checked", async () => {
  const seen: string[] = [];
  const long = Array.from({ length: 45 }, (_, i) => `${"长".repeat(99)}${i}`);
  const ask = scripted({
    reference_issue_voice: [{ lines: long }, { lines: ["英国净少了977家店。"] }],
    reference_issue_voice_check: [{ problems: [] }],
  }, seen);
  const { lines } = await writeScript(ISSUE, "2026-10-31", ask, ask);
  assert.deepEqual(lines?.slice(1, -1), ["英国净少了977家店。"]);
  const again = seen.filter((s) => s.startsWith("reference_issue_voice\n"))[1]!;
  assert.match(again, /上一份听稿 \d+ 字/u);
  assert.ok(again.includes(long[0]!), "the writer sees the script it gave");
});

test("a name the transcript spells with other characters of the same sound counts as heard; a different word does not", () => {
  assert.equal(heardShare("日本店主大久保翔平这样写", "日本店主大久保祥平这样写"), 1);
  assert.ok(heardShare("日本店主大久保翔平这样写", "日本店主小林这样写") < 0.8);
});

test("a failed reading names the script's stretches the transcript lacks, longest first", () => {
  assert.deepEqual(missedRuns("今天先说美团。再说巴西的工时新规。最后说英国。", "今天先说美团。最后说英国。"), ["再说巴西的工时新规"]);
  assert.deepEqual(missedRuns("今天先说美团。", "今天先说美团。"), []);
  assert.deepEqual(missedRuns("甲乙丙丁戊己庚辛", "甲乙丁戊己庚辛"), [], "a single character dropped is not a stretch");
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

/** Seconds of a 200 Hz tone, or of silence where `loud` is false. */
const tone = (rate: number, seconds: number, loud = true) =>
  Int16Array.from({ length: rate * seconds }, (_, i) => (loud ? Math.round(6000 * Math.sin((2 * Math.PI * 200 * i) / rate)) : 0));
const join = (...parts: Int16Array[]) => { const out = new Int16Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { out.set(p, at); at += p.length; } return out; };

test("silences are measured in the audio, not between what Whisper heard", () => {
  const rate = 8000;
  const audio = join(tone(rate, 9), tone(rate, 5, false), tone(rate, 6), tone(rate, 2, false), tone(rate, 3));
  assert.deepEqual(silences(audio, rate, 4), [{ from: 9, to: 14 }]);
});

test("the audio goes to Whisper in pieces cut at the quietest moment near every 28 s", () => {
  const rate = 8000;
  const audio = join(tone(rate, 26), tone(rate, 1, false), tone(rate, 25), tone(rate, 1, false), tone(rate, 20));
  const cuts = quietCuts(audio, rate).map((c) => c / rate);
  assert.equal(cuts.length, 4);
  assert.deepEqual([cuts[0], cuts[3]], [0, 73]);
  assert.ok(cuts[1]! > 26 && cuts[1]! < 27, `first cut at ${cuts[1]} s, not in the silence at 26–27 s`);
  assert.ok(cuts[2]! > 52 && cuts[2]! < 53, `second cut at ${cuts[2]} s, not in the silence at 52–53 s`);
  const { rate: r, samples } = wavSamples(wavOf(audio.subarray(0, 100), rate));
  assert.equal(r, rate);
  assert.deepEqual([...samples], [...audio.subarray(0, 100)]);
});

test("half a second of silence goes in at each seam between lines, and each line starts where it was put", () => {
  const rate = 8000;
  // A line that ends loud: the breath still goes after its last sample, never inside it.
  const lines = [tone(rate, 3.1), tone(rate, 2.7), tone(rate, 2)];
  const { samples, starts } = joinLines(lines, rate);
  assert.equal(samples.length, lines.reduce((n, l) => n + l.length, 0) + rate);
  assert.deepEqual(starts, [0, 3.6, 6.8]);
  const quiet = silences(samples, rate, 0.4).map((s) => [Math.round(s.from * 10) / 10, Math.round(s.to * 10) / 10]);
  assert.deepEqual(quiet, [[3.1, 3.6], [6.3, 6.8]]);
  assert.deepEqual([...samples.subarray(Math.round(3.6 * rate), Math.round(3.6 * rate) + 50)], [...lines[1]!.subarray(0, 50)]);
  assert.deepEqual(joinLines([tone(rate, 1)], rate).starts, [0]);
});

test("a line read far above or below the others is picked to be read again; lines with no pitch are left", () => {
  const rate = 16_000;
  const at = (hz: number) => Int16Array.from({ length: rate }, (_, i) => Math.round(6000 * Math.sin((2 * Math.PI * hz * i) / rate)));
  const pitch = [200, 210, 280, 195, 205, 150].map((hz) => linePitch(at(hz), rate));
  for (const [n, hz] of [200, 210, 280, 195, 205, 150].entries()) assert.ok(Math.abs(pitch[n]! - hz) < 3, `${hz} Hz measured as ${pitch[n]}`);
  // Middle 202.5 Hz: 280 is 5.6 semitones up, 150 is 5.2 down; 210 and 195 are under one.
  assert.deepEqual(offPitch(pitch), [2, 5]);
  assert.equal(linePitch(new Int16Array(rate), rate), 0);
  assert.deepEqual(offPitch([0, 200, 0, 205]), []);
  assert.deepEqual(offPitch([]), []);
});

test("卖 heard as 买 fails the check, however small a share of the script it is", () => {
  assert.deepEqual(flipsHeard("英国有卖酒执照的店，净少了977家。", "英国有买酒执照的店，净少了977家。"), ["「卖」念成「买」"]);
  assert.deepEqual(flipsHeard("他去买菜，再卖掉。", "他去买菜，再卖掉。"), []);
  assert.deepEqual(flipsHeard("有卖酒执照的店。", "有酒执照的店。"), [], "a dropped 卖 is the share check's business, not a flip");
  assert.deepEqual(flipsHeard("有卖酒执照的店，不满慢慢长大。", "有买酒执照的店，不卖慢慢长大。"), ["「卖」念成「买」"], "another 卖 misheard elsewhere does not hide it");
  assert.equal(judge(480, 0.99, [], [200, 201], 1, ["「卖」念成「买」"]).pass, false);
});

test("the machine check names each failed part", () => {
  assert.deepEqual(judge(494, 0.954, [], [210, 215, 205]), { pass: true, why: [] });
  assert.deepEqual(judge(487, 0.954, [], [182, 190, 194]), { pass: true, why: [] }, "a voice lower all through is steady");
  assert.deepEqual(judge(526, 0.99, [], [250, 262, 248]), { pass: true, why: [] }, "under 1.5 semitones at 254 Hz");
  const failed = judge(494, 0.9, [{ from: 9, to: 14 }], [176, 219], 0.2);
  assert.equal(failed.pass, false);
  assert.equal(failed.why.length, 4, failed.why.join("；"));
});

test("a reading that stops before the closing line is caught", () => {
  const script = `第一行。\n英国净少了977家店。\n${CLOSING}`;
  assert.equal(endHeard(script, "第一行 英国净少了九百七十七家店 这就是今天的十一说 我们明天早上见"), 1);
  assert.ok(endHeard(script, "第一行 英国净少了九百七十七家店") < 0.8);
});

test("each line of the 文字稿 starts where Whisper heard its first words, whatever else it heard otherwise", () => {
  const lines = ["大家早上好！我是十一。", "英国净少了977家店。", "（停一下）", "我们明天早上见。"];
  const segments = [
    { start: 0, end: 2, text: "大家早上好 我是十一" },
    { start: 2.4, end: 6, text: "英国净少了九百七十七家点" },
    { start: 9, end: 11, text: "我们明天早上见" },
  ];
  const starts = lineStarts(lines, segments)!;
  assert.equal(starts.length, 4);
  assert.equal(starts[0], 0);
  assert.equal(starts[1], 2.4);
  assert.ok(starts[2]! > starts[1]! && starts[2]! < starts[3]!, "a line with nothing to line up sits between its neighbours");
  assert.equal(starts[3], 9);
  assert.equal(lineStarts(lines, [{ start: 0, end: 3, text: "完全不相干的一段话" }]), null, "too little lines up to trust");
});

test("pitch over three minutes at a time: a voice at 210 Hz for two minutes, then at 240, reads from 210 to 240", () => {
  const rate = 16_000;
  const samples = new Int16Array(rate * 240);
  for (let i = 0; i < samples.length; i += 1) {
    const f = i < rate * 120 ? 210 : 240;
    samples[i] = Math.round(6000 * (Math.sin((2 * Math.PI * f * i) / rate) + 0.5 * Math.sin((2 * Math.PI * 2 * f * i) / rate)));
  }
  const pitch = pitchWindows(samples, rate);
  assert.equal(pitch.length, 5);
  assert.ok(Math.abs(pitch[0]! - 210) < 2 && Math.abs(pitch.at(-1)! - 240) < 2, pitch.join(" "));
  assert.ok(Math.abs(semitones(pitch) - 12 * Math.log2(240 / 210)) < 0.1);
  assert.equal(pitchWindows(samples.subarray(0, rate * 100), rate).length, 1, "under three minutes is one window");
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
