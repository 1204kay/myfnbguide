// 十一说 read aloud on the server (Kay 10-31 07:53: 「Gemini钥匙直接上云」; until then a session on Kay's computer did
// each step by hand: Core System Studio handbook 业务线/myfnbguide/十一说-每天怎么出.md step 10). Each morning after the
// issue is written: DeepSeek turns the published issue into a listen script (prompts/issue-voice.md: the spoken
// signposts the page leaves to its headings, since 10-31 the page has none, myfnbguide #100), the check model reads the
// script against the page (prompts/issue-voice-check.md) and its fixes go in line by line; Gemini's Leda reads the whole
// script in one request (cut into parts, each part had its own pitch and the joins could be heard: issue 6, 10-30);
// the machine check of the handbook's step 10 runs (Groq's Whisper hears it back, gaps, pitch a minute); what passes
// goes up as <no>.mp3, <no>.txt (the 文字稿) and <no>.json, the json last (backend/audio.ts). What fails stays down and
// the issue goes out as text, as on any day without audio. Every step's outcome is kept in <no>.voice.json beside them.
import { spawn } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { config, credential } from "@aihot/backend/config";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { assertAccepted, completeReceipt, paidRequest, ProviderRejectedError } from "@aihot/backend/providers/receipts";
import { type Ask, fixedLines, type IssueText } from "./issue.ts";

const DIR = path.join(config.dataDir, "reference", "audio");

/**
 * Longest script sent in one request: 2,604 characters (issue 6) and about 3,030 (a part of issue 7) were read, 6,056
 * came back 400 (10-31); between them is untried. Issues are written to about 3,000 (decision record L1421) and the
 * script adds its signposts, so it is let up to 3,600; a 400 for its length ends the day's reading, not retried.
 */
export const MAX_CHARS = 3_600;
/** Gemini's free tier: ten requests a day (its 429, 10-27); a day's issue gets at most this many, leaving the rest. */
export const MAX_READS = 3;
/** The voice and how it reads (Kay 10-26 picked Leda; the style as the computer's script sent it, mkjobs.py). */
export const SPEECH = { model: "gemini-3.8-flash-tts", voice: "Leda", style: "早间节目主播，沉稳但有活力，语速中等偏快" };
/**
 * The machine check (handbook step 10): transcript ≥95% of the script, no gap over 4 s, each minute's median pitch in
 * 195–225 Hz and within 25 Hz of the others. The spread was 20 by the computer's pyin (issue 6, which Kay heard and
 * passed: 15.9; issue 7 cut in two and read in two voices: 43). The server's YIN reads the same issue 6 MP3 at 20.1
 * (10-31, --hear 6) and no setting of it came within 4 Hz of pyin a minute, so the line moved with the ruler: 25. YIN
 * reads the issue 7 that was heard at 42.1 (pyin 43.1), well over it.
 */
export const PASS = { match: 0.95, gap: 4, low: 195, high: 225, spread: 25 };
/**
 * whisper-large-v3, not -turbo: on issue 6 turbo heard 92.3% where the computer's faster-whisper (asr6.py) heard 95.4%,
 * and the 95% line was set on the computer's. --hear 6 shows whether the full model comes back to it.
 */
const HEAR = { base: "https://api.groq.com/openai/v1", model: "whisper-large-v3", service: "transcribe" };

/**
 * What reading an issue needs before anything is spent: both keys, and a budget row for both paid services (a service
 * with no row would have no circuit breaker; archive/backend/transcribe.ts skips on the same). myfnb/issue-voice.ts adds
 * the `speech` row; `transcribe` is archive's. Empty when ready.
 * Checked first, so a missing Groq key is found before the day's free readings are used up.
 */
export async function voiceMissing(): Promise<string[]> {
  const missing = ["GEMINI_API_KEY", "GROQ_API_KEY"].filter((name) => !credential("models", name));
  const services = ["speech", HEAR.service];
  const rows = await sql<{ service: string }[]>`SELECT service FROM budgets WHERE service IN ${sql(services)}`;
  for (const service of services) if (!rows.some((r) => r.service === service)) missing.push(`budgets 里没有 ${service}`);
  return missing;
}

const prompt = (name: string, values: Record<string, string>) =>
  promptFromText(`reference/${name}`, readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), "utf8"), values);

const Script = z.object({ lines: z.array(z.string().trim()).min(3) });
const Problems = z.object({ problems: z.array(z.object({ kind: z.string().default(""), line: z.string().default(""), fix: z.string().default(""), why: z.string().default("") })).default([]) });
type Problem = z.infer<typeof Problems>["problems"][number];

/** 2026-10-31 → 10月31号, as the opening has said it since issue 4. */
const spokenDay = (date: string) => `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}号`;
export const opening = (date: string) => `大家早上好！我是十一。今天是${spokenDay(date)}。`;
export const CLOSING = "这就是今天的十一说。我们明天早上见。";

/** The page as the script is written from and checked against: what a reader sees, without the 〔n〕 marks. */
export function pageText(issue: IssueText, date: string): string {
  const f = fixedLines(date);
  const bare = (s: string) => s.replace(/〔[^〕]*〕/gu, "");
  return [f.open, bare(issue.preview), ...issue.news.flatMap((x) => [`【${bare(x.head)}】`, bare(x.text)]), f.turn, `【${bare(issue.title)}】`, bare(issue.deep), bare(issue.close), f.end]
    .filter(Boolean).join("\n\n");
}

/** Characters as the length limit counts them: no spaces. */
export const scriptChars = (lines: string[]) => lines.join("").replace(/\s/gu, "").length;

/**
 * Puts the check's fixes in: each names a line of the script word for word and gives it whole. A line no longer there
 * (an earlier fix took it) is left; the check reads the result again.
 */
export function applyFixes(lines: string[], problems: Problem[]): { lines: string[]; applied: number } {
  const out = [...lines];
  let applied = 0;
  for (const p of problems) {
    const at = out.findIndex((l) => l.trim() === p.line.trim());
    if (at < 0 || !p.fix.trim()) continue;
    out.splice(at, 1, ...p.fix.split(/\n+/u).map((l) => l.trim()).filter(Boolean));
    applied += 1;
  }
  return { lines: out, applied };
}

/** Writes the script and has it checked, mending up to twice; null with the last problems when it is still wrong. */
export async function writeScript(issue: IssueText, date: string, write: Ask, check: Ask): Promise<{ lines: string[] | null; rounds: Array<{ problems: Problem[]; applied: number }> }> {
  const page = pageText(issue, date);
  const first = await write("reference_issue_voice", prompt("issue-voice", { opening: opening(date), maxChars: String(MAX_CHARS) }), `网站上的这一期：\n\n${page}`, Script);
  let lines = [opening(date), ...first.lines.filter((l, i, all) => l && !(i === 0 && l.startsWith("大家早上好")) && !(i === all.length - 1 && l === CLOSING)), CLOSING];
  const rounds: Array<{ problems: Problem[]; applied: number }> = [];
  for (let round = 0; round < 3; round += 1) {
    const { problems } = await check("reference_issue_voice_check", prompt("issue-voice-check", {}), `网站上的这一期：\n\n${page}\n\n听稿（一行一段）：\n\n${lines.join("\n")}`, Problems, `r${round}`);
    if (!problems.length) return { lines, rounds };
    if (round === 2) { rounds.push({ problems, applied: 0 }); break; }
    const fixed = applyFixes(lines, problems);
    rounds.push({ problems, applied: fixed.applied });
    lines = fixed.lines;
  }
  return { lines: null, rounds };
}

/** The script read by Leda: a WAV (24 kHz, 16-bit, one channel), through the engine's receipts. */
async function read(script: string, subject: string, attempt: number): Promise<Buffer> {
  const key = credential("models", "GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY missing");
  // The audio is kept as a file, not in the receipt (about 10 MB of base64).
  let audio: string | undefined;
  const receipt = await paidRequest(
    { service: "speech", model: SPEECH.model, purpose: "reference_issue_read", subject, identity: { model: SPEECH.model, voice: SPEECH.voice, script, attempt, at: Date.now() }, requestSummary: { chars: script.length, attempt } },
    async () => {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" }, signal: AbortSignal.timeout(900_000),
        body: JSON.stringify({
          model: SPEECH.model, response_format: { type: "audio" }, generation_config: { speech_config: [{ voice: SPEECH.voice }] },
          input: [{ type: "user_input", content: [{ type: "text", text: script, annotations: [{ type: "speech_metadata", style: SPEECH.style }] }] }],
        }),
      });
      if (!res.ok) assertAccepted("speech", res.status, (await res.text()).slice(0, 1000));
      const body = (await res.json()) as { steps?: Array<{ content?: Array<{ type?: string; data?: string }> }>; usage?: Record<string, unknown> };
      const data = body.steps?.flatMap((s) => s.content ?? []).find((c) => c.type === "audio" && c.data)?.data;
      if (!data) throw new ProviderRejectedError("speech: no audio in the answer", null, false);
      audio = data;
      return { response: { bytes: Math.round((data.length * 3) / 4) }, usage: body.usage ?? null };
    },
  );
  await sql.begin((tx) => completeReceipt(tx, receipt.receiptId));
  if (!audio) throw new Error("speech: this reading was already made and its audio not kept (a repeated request)");
  return Buffer.from(audio, "base64");
}

/** The samples of a 16-bit PCM WAV, wherever its data chunk sits. */
export function wavSamples(wav: Buffer): { rate: number; samples: Int16Array } {
  if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") throw new Error("not a WAV");
  let rate = 0;
  for (let at = 12; at + 8 <= wav.length;) {
    const id = wav.toString("ascii", at, at + 4);
    const size = wav.readUInt32LE(at + 4);
    if (id === "fmt ") {
      if (wav.readUInt16LE(at + 8) !== 1 || wav.readUInt16LE(at + 10) !== 1 || wav.readUInt16LE(at + 22) !== 16) throw new Error("not 16-bit mono PCM");
      rate = wav.readUInt32LE(at + 12);
    }
    if (id === "data") {
      const end = Math.min(wav.length, at + 8 + (size || wav.length));
      const bytes = wav.subarray(at + 8, end - ((end - at - 8) % 2));
      return { rate, samples: new Int16Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length)) };
    }
    at += 8 + size + (size % 2);
  }
  throw new Error("WAV without data");
}

/**
 * Each minute's median pitch, by YIN (de Cheveigné and Kawahara 2002) on the voice brought down to 8 kHz, 80–400 Hz as
 * the computer's pyin looked (cmp.py); a minute under five seconds long is left out, as there.
 */
export function pitchByMinute(samples: Int16Array, rate: number): number[] {
  const step = Math.max(1, Math.round(rate / 8000));
  const sr = rate / step;
  const x = new Float32Array(Math.floor(samples.length / step));
  for (let i = 0; i < x.length; i += 1) {
    let s = 0;
    for (let k = 0; k < step; k += 1) s += samples[i * step + k]!;
    x[i] = s / step / 32768;
  }
  const minLag = Math.floor(sr / 400);
  const maxLag = Math.ceil(sr / 80);
  const W = Math.round(sr * 0.04);
  const hop = Math.round(sr * 0.02);
  const d = new Float64Array(maxLag + 1);
  const minutes: number[][] = [];
  for (let at = 0; at + W + maxLag < x.length; at += hop) {
    let energy = 0;
    for (let j = 0; j < W; j += 1) energy += x[at + j]! * x[at + j]!;
    if (Math.sqrt(energy / W) < 0.01) continue;
    let running = 0;
    d[0] = 1;
    let tau = -1;
    for (let lag = 1; lag <= maxLag; lag += 1) {
      let s = 0;
      for (let j = 0; j < W; j += 1) { const v = x[at + j]! - x[at + j + lag]!; s += v * v; }
      running += s;
      d[lag] = running ? (s * lag) / running : 1;
    }
    for (let lag = minLag; lag < maxLag; lag += 1) {
      if (d[lag]! < YIN_THRESHOLD) { while (lag + 1 < maxLag && d[lag + 1]! < d[lag]!) lag += 1; tau = lag; break; }
    }
    if (tau < 0) continue;
    const [a, b, c] = [d[tau - 1]!, d[tau]!, d[tau + 1]!];
    const shift = a + c - 2 * b ? (a - c) / (2 * (a + c - 2 * b)) : 0;
    const minute = Math.floor(at / sr / 60);
    (minutes[minute] ??= []).push(sr / (tau + shift));
  }
  const total = x.length / sr;
  return minutes.flatMap((m, i) => (m && Math.min(60, total - i * 60) >= 5 ? [median(m)] : []));
}
/**
 * YIN's threshold. The computer's pyin (cmp.py) put issue 6, which Kay heard and passed (10-30 21:23), at 218.6 211.1
 * 219.8 212.3 205.1 203.9 213.6 213.6 205.1 Hz a minute (spread 15.9); on the same MP3 YIN read 201.4–226.0 at its own
 * 0.1–0.15 (frames with breath and creak taken in) and at 0.3 222.1 211.5 219.2 213.6 205.7 203.5 212.8 209.2 204.3
 * (spread 18.6, each minute within 4.4 Hz of pyin), the nearest of 0.1–0.4 and windows of 40 and 64 ms (10-31).
 */
const YIN_THRESHOLD = 0.3;
const median = (v: number[]) => { const s = [...v].sort((p, q) => p - q); const h = s.length >> 1; return s.length % 2 ? s[h]! : (s[h - 1]! + s[h]!) / 2; };

const DIGITS = "零一二三四五六七八九";
/** 977 → 九百七十七, 98000 → 九万八千, 3.6 → 三点六: numbers as Chinese reads them, so a transcript that writes either compares. */
export function numberWords(n: string): string {
  const [whole, frac] = n.split(".");
  const four = (v: number) => {
    let s = "";
    let zero = false;
    for (const [unit, size] of [["千", 1000], ["百", 100], ["十", 10], ["", 1]] as const) {
      const digit = Math.floor(v / size) % 10;
      if (!digit) { zero = s !== ""; continue; }
      s += (zero ? "零" : "") + DIGITS[digit] + unit;
      zero = false;
    }
    return s;
  };
  let v = Number(whole);
  let out = "";
  if (!v) out = "零";
  for (const [unit, size] of [["亿", 1e8], ["万", 1e4], ["", 1]] as const) {
    const part = Math.floor(v / size);
    if (!part) continue;
    out += (out && part < 1000 ? "零" : "") + four(part) + unit;
    v -= part * size;
  }
  out = out.replace(/^一十/u, "十");
  return frac ? `${out}点${[...frac].map((c) => DIGITS[Number(c)]).join("")}` : out;
}
/** Only the Chinese characters, numbers spelt out (cmp.py: both sides through cn2an). */
export const hanOnly = (s: string) => s.replace(/(\d+(?:\.\d+)?)\s*%/gu, (_m, n: string) => `百分之${numberWords(n)}`)
  .replace(/\d+(?:\.\d+)?/gu, (n) => numberWords(n)).replace(/[^一-鿿]/gu, "");

/** How much of the script the transcript has, in order: the longest common subsequence over the script's length. */
export function heardShare(script: string, heard: string): number {
  const a = hanOnly(script);
  const b = hanOnly(heard);
  if (!a.length) return 0;
  let prev = new Uint16Array(b.length + 1);
  let cur = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, cur[j - 1]!);
    [prev, cur] = [cur, prev];
  }
  return prev[b.length]! / a.length;
}

/**
 * Silences longer than `seconds` in the audio itself: runs of 100 ms frames under -40 dBFS. Measured on the samples,
 * not between Whisper's segments as cmp.py did: on issue 6 Whisper skipped 26 s of plain speech (4:33–5:00, every
 * 2 s of it voiced) and that read as a gap.
 */
export function silences(samples: Int16Array, rate: number, seconds: number): Array<{ from: number; to: number }> {
  const frame = Math.round(rate / 10);
  const out: Array<{ from: number; to: number }> = [];
  let start = -1;
  for (let i = 0; i <= samples.length; i += frame) {
    let quiet = false;
    if (i + frame <= samples.length) {
      let e = 0;
      for (let j = i; j < i + frame; j += 1) e += (samples[j]! / 32768) ** 2;
      quiet = Math.sqrt(e / frame) < 0.01;
    }
    if (quiet && start < 0) start = i;
    if (!quiet && start >= 0) {
      if ((i - start) / rate > seconds) out.push({ from: Math.round((start / rate) * 10) / 10, to: Math.round((i / rate) * 10) / 10 });
      start = -1;
    }
  }
  return out;
}

/**
 * Where to cut the audio for Whisper: about every `every` seconds, at the quietest 100 ms within 5 s of it, so no
 * word is cut. Whisper on a whole issue in one request skips stretches (issue 6: 26 s, 91.8% heard); a piece this
 * long is one of its own 30 s windows.
 */
export function quietCuts(samples: Int16Array, rate: number, every = 28): number[] {
  const frame = Math.round(rate / 10);
  const cuts = [0];
  for (let target = every * rate; target < samples.length - 10 * rate; target = cuts.at(-1)! + every * rate) {
    let best = target, least = Infinity;
    for (let i = Math.max(cuts.at(-1)! + rate, target - 5 * rate); i + frame <= Math.min(samples.length, target + 2 * rate); i += frame) {
      let e = 0;
      for (let j = i; j < i + frame; j += 1) e += samples[j]! * samples[j]!;
      if (e < least) { least = e; best = i + (frame >> 1); }
    }
    cuts.push(best);
  }
  cuts.push(samples.length);
  return cuts;
}

/** A 16-bit mono WAV of `samples`. */
export function wavOf(samples: Int16Array, rate: number): Buffer {
  const head = Buffer.alloc(44);
  head.write("RIFF", 0, "ascii"); head.writeUInt32LE(36 + samples.length * 2, 4); head.write("WAVEfmt ", 8, "ascii");
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22); head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write("data", 36, "ascii"); head.writeUInt32LE(samples.length * 2, 40);
  return Buffer.concat([head, Buffer.from(samples.buffer, samples.byteOffset, samples.length * 2)]);
}

/** Runs a command over a file; the encoder is the image's `lame` (Dockerfile). */
function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (c) => { err += String(c); });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err.slice(-500)}`))));
  });
}

/** What Whisper hears, piece by piece (quietCuts), under one receipt. */
async function hear(samples: Int16Array, rate: number, subject: string): Promise<string> {
  const key = credential("models", "GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY missing");
  const cuts = quietCuts(samples, rate);
  const receipt = await paidRequest(
    { service: HEAR.service, model: HEAR.model, purpose: "reference_issue_hear", subject, identity: { model: HEAR.model, samples: samples.length, at: Date.now() }, requestSummary: { seconds: Math.round(samples.length / rate), pieces: cuts.length - 1 } },
    async () => {
      const texts: string[] = [];
      for (let i = 1; i < cuts.length; i += 1) {
        const form = new FormData();
        form.set("model", HEAR.model);
        form.set("file", new Blob([new Uint8Array(wavOf(samples.subarray(cuts[i - 1]!, cuts[i]!), rate))], { type: "audio/wav" }), "piece.wav");
        form.set("response_format", "json");
        form.set("language", "zh");
        form.set("prompt", "以下是普通话的句子。");
        const res = await fetch(`${HEAR.base}/audio/transcriptions`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(120_000) });
        if (!res.ok) assertAccepted(HEAR.service, res.status, await res.text());
        texts.push(((await res.json()) as { text?: string }).text ?? "");
      }
      return { response: { text: texts.join("") }, usage: { audio_seconds: Math.round(samples.length / rate) } };
    },
  );
  await sql.begin((tx) => completeReceipt(tx, receipt.receiptId));
  return (receipt.response as { text: string }).text;
}

export interface VoiceReport {
  no: number; date: string; at: string;
  status: "up" | "tried" | "not ready" | "script failed" | "too long" | "check failed" | "no reads left" | "error";
  /** Requests sent to the voice for this issue, whatever came of them (Gemini's free ones are counted per request). */
  tries?: number;
  chars?: number; scriptRounds?: Array<{ problems: Problem[]; applied: number }>;
  reads?: Array<{ seconds: number; match: number; gaps: Array<{ from: number; to: number }>; pitch: number[]; pass: boolean; why: string[] }>;
  error?: string;
}

/** Judges one reading by the machine check; `why` names each failed part. */
export function judge(seconds: number, match: number, gaps: Array<{ from: number; to: number }>, pitch: number[]) {
  const why: string[] = [];
  if (match < PASS.match) why.push(`转写对上 ${(match * 100).toFixed(1)}%，不到 ${PASS.match * 100}%`);
  if (gaps.length) why.push(`有 ${gaps.length} 处空档超过 ${PASS.gap} 秒`);
  if (!pitch.length) why.push("量不出音高");
  else {
    const out = pitch.filter((p) => p < PASS.low || p > PASS.high);
    if (out.length) why.push(`有 ${out.length} 分钟音高不在 ${PASS.low}–${PASS.high} Hz`);
    const spread = Math.max(...pitch) - Math.min(...pitch);
    if (spread > PASS.spread) why.push(`音高前后差 ${spread.toFixed(1)} Hz，超过 ${PASS.spread}`);
  }
  if (seconds < 60) why.push(`只有 ${seconds} 秒`);
  return { pass: !why.length, why };
}

/**
 * The machine check on an issue already up, its MP3 against its script: for setting the thresholds on audio a person
 * has heard, before reading is turned on. Pays one transcription; no voice.
 */
export async function hearIssue(no: number) {
  const missing = (await voiceMissing()).filter((m) => !m.includes("GEMINI") && !m.includes("speech"));
  if (missing.length) throw new Error(`还缺：${missing.join("；")}`);
  const script = await readFile(path.join(DIR, `${no}.txt`), "utf8");
  const mp3 = await readFile(path.join(DIR, `${no}.mp3`));
  const work = path.join(os.tmpdir(), `issue-hear-${no}`);
  await mkdir(work, { recursive: true });
  await writeFile(path.join(work, "in.mp3"), mp3);
  await run("lame", ["--quiet", "--decode", path.join(work, "in.mp3"), path.join(work, "out.wav")]);
  const { rate, samples } = wavSamples(await readFile(path.join(work, "out.wav")));
  const seconds = Math.round(samples.length / rate);
  const heard = await hear(samples, rate, `issue:${no}:hear`);
  const match = heardShare(script, heard);
  const gaps = silences(samples, rate, PASS.gap);
  const pitch = pitchByMinute(samples, rate).map((p) => Math.round(p * 10) / 10);
  return { no, seconds, match: Math.round(match * 1000) / 1000, gaps, pitch, ...judge(seconds, match, gaps, pitch), heard };
}

const reportFile = (no: number) => path.join(DIR, `${no}.voice.json`);
export async function voiceReport(no: number): Promise<VoiceReport | null> {
  return readFile(reportFile(no), "utf8").then((t) => JSON.parse(t) as VoiceReport, () => null);
}

/**
 * Reads issue `no` aloud and, unless `dryRun`, puts it up when the machine check passes. A dry run leaves the MP3 and
 * the script in `out` for a person to hear and keeps nothing on the site.
 */
export async function voiceIssue(no: number, ask: { write: Ask; check: Ask }, opts: { dryRun?: boolean; out?: string } = {}): Promise<VoiceReport> {
  const [row] = await sql<{ date: string; issue: IssueText | null }[]>`
    SELECT to_char(date, 'YYYY-MM-DD') AS date, content->'issue' AS issue FROM reference_issues WHERE no = ${no} AND status = 'issue'`;
  if (!row?.issue) throw new Error(`第 ${no} 期不存在`);
  const before = await voiceReport(no);
  const used = opts.dryRun ? 0 : before?.tries ?? 0;
  const report: VoiceReport = { no, date: row.date, at: new Date().toISOString(), status: "error", tries: used, reads: opts.dryRun ? [] : before?.reads ?? [] };
  const keep = async () => { if (!opts.dryRun) { await mkdir(DIR, { recursive: true }); await writeFile(reportFile(no), JSON.stringify(report, null, 1)); } return report; };
  if (used >= MAX_READS) return { ...report, status: "no reads left" };
  // Not kept: once the key or the row is there, the next half hour reads it.
  const missing = await voiceMissing();
  if (missing.length) return { ...report, status: "not ready", error: missing.join("；") };
  try {
    const written = await writeScript(row.issue, row.date, ask.write, ask.check);
    report.scriptRounds = written.rounds;
    if (!written.lines) { report.status = "script failed"; return keep(); }
    const script = written.lines.join("\n");
    report.chars = scriptChars(written.lines);
    if (report.chars > MAX_CHARS) { report.status = "too long"; return keep(); }
    const work = opts.out ?? path.join(os.tmpdir(), `issue-voice-${no}`);
    await mkdir(work, { recursive: true });
    await writeFile(path.join(work, `${no}.txt`), `${script}\n`);
    for (let attempt = used + 1; attempt <= MAX_READS; attempt += 1) {
      report.tries = attempt;
      await keep();
      const wav = await read(script, `issue:${no}`, attempt).catch((error: unknown) => {
        if (error instanceof ProviderRejectedError && error.status === 400) report.status = "too long";
        throw error;
      });
      const { rate, samples } = wavSamples(wav);
      const seconds = Math.round(samples.length / rate);
      await writeFile(path.join(work, `${no}.wav`), wav);
      await run("lame", ["--quiet", "-m", "m", "-b", "64", path.join(work, `${no}.wav`), path.join(work, `${no}.mp3`)]);
      const heard = await hear(samples, rate, `issue:${no}:${attempt}`);
      const match = heardShare(script, heard);
      const gaps = silences(samples, rate, PASS.gap);
      const pitch = pitchByMinute(samples, rate).map((p) => Math.round(p * 10) / 10);
      const verdict = judge(seconds, match, gaps, pitch);
      report.reads!.push({ seconds, match: Math.round(match * 1000) / 1000, gaps, pitch, ...verdict });
      if (!verdict.pass) { await keep(); continue; }
      if (opts.dryRun) { report.status = "tried"; return report; }
      // The files under the names the page reads, the seconds last: until they are there the page shows no 听.
      await mkdir(DIR, { recursive: true });
      for (const ext of ["mp3", "txt"]) {
        await writeFile(path.join(DIR, `${no}.${ext}.part`), await readFile(path.join(work, `${no}.${ext}`)));
        await rename(path.join(DIR, `${no}.${ext}.part`), path.join(DIR, `${no}.${ext}`));
      }
      await writeFile(path.join(DIR, `${no}.json`), JSON.stringify({ seconds }));
      report.status = "up";
      return keep();
    }
    report.status = "check failed";
    return keep();
  } catch (error) {
    report.error = String((error as Error).message ?? error).slice(0, 1000);
    if (report.status !== "too long") report.status = "error";
    return keep();
  }
}
