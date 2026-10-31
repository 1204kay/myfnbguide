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
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { config, credential } from "@aihot/backend/config";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { assertAccepted, completeReceipt, paidRequest, ProviderRejectedError } from "@aihot/backend/providers/receipts";
import { scriptLines } from "./audio.ts";
import { type Ask, fixedLines, type IssueText } from "./issue.ts";
import { pyin } from "./pyin.ts";

const DIR = path.join(config.dataDir, "reference", "audio");

/**
 * Longest script sent in one request, counted as scriptChars counts. What was heard (10-31): issue 6, 2,605, read
 * whole and steady in 494 s; issue 7 on the computer, 2,563, read whole in two of three; issue 7 here, 3,091, three
 * readings of 583–644 s, the last stopping about 170 characters short of the end and climbing 63 Hz in its second half
 * (pyin). Longer readings break at the end and drift. The script is asked for at most WRITE_CHARS, under what was heard
 * whole; MAX_CHARS, where a script is refused, sits just above it, so a model that runs a few dozen over is still read.
 */
export const MAX_CHARS = 2_650;
const WRITE_CHARS = 2_450;
/** Gemini's free tier: ten requests a day (its 429, 10-27); a day's issue gets at most this many, leaving the rest. */
export const MAX_READS = 3;
/** The voice and how it reads (Kay 10-26 picked Leda; the style as the computer's script sent it, mkjobs.py). */
export const SPEECH = { model: "gemini-3.8-flash-tts", voice: "Leda", style: "早间节目主播，沉稳但有活力，语速中等偏快" };
/**
 * The machine check (handbook step 10): transcript ≥95% of the script, its closing line heard (`end`), no gap over
 * 4 s, and each minute's median pitch within 20 Hz of the others. No fixed range: 195–225 Hz was set on issue 6 alone,
 * and on 10-31 the same voice read issue 7 whole and steady at 184–195 (pyin, within 11 Hz); what is heard is a voice
 * changing within an issue, not one day's voice lower than another's. The line is 20 by the computer's pyin, which the
 * server now reads with (pyin.ts; 10-31, the same Hz a minute on issue 6, a few Hz off at most elsewhere): issue 6, which
 * Kay heard and passed, 15.9; issue 7 read whole on the computer 10.9; issue 7 cut in two and read in two voices 43.1;
 * issue 7 read on the server at 3,091 characters, which slid up to 240 Hz and stopped short, 59.8. The YIN it read with
 * before put that last one at 22.7, under the 25 it was given.
 */
export const PASS = { match: 0.95, gap: 4, spread: 20, end: 0.8 };
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
  const first = await write("reference_issue_voice", prompt("issue-voice", { opening: opening(date), maxChars: String(WRITE_CHARS) }), `网站上的这一期：\n\n${page}`, Script);
  let lines = [opening(date), ...first.lines.filter((l, i, all) => l && !(i === 0 && l.startsWith("大家早上好")) && !(i === all.length - 1 && l === CLOSING)), CLOSING];
  const rounds: Array<{ problems: Problem[]; applied: number }> = [];
  for (let round = 0; round < 3; round += 1) {
    const { problems } = await check("reference_issue_voice_check", prompt("issue-voice-check", { maxChars: String(WRITE_CHARS) }), `网站上的这一期：\n\n${page}\n\n听稿（一行一段）：\n\n${lines.join("\n")}`, Problems, `r${round}`);
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
 * Each minute's median pitch as the computer's machine check reads it (cmp.py): the voice at 16 kHz, each minute given
 * to pyin on its own (pyin.ts), the median of its voiced frames; a minute under five seconds long is left out, as there.
 */
export function pitchByMinute(samples: Int16Array, rate: number): number[] {
  const x = to16k(samples, rate);
  const sr = 16_000;
  const minutes: number[][] = [];
  for (let at = 0, i = 0; at < x.length; at += 60 * sr, i += 1) {
    const piece = x.subarray(at, at + 60 * sr);
    if (piece.length >= 5 * sr) minutes[i] = pyin(piece, sr);
  }
  // A last minute under 30 s goes in with the one before: on 10-31 the closing 7 s of issue 7 read 282 Hz alone.
  const total = x.length / sr;
  const last = minutes.length - 1;
  if (last > 0 && total - last * 60 < 30) { minutes[last - 1] = [...(minutes[last - 1] ?? []), ...(minutes[last] ?? [])]; minutes.length = last; }
  return minutes.flatMap((m) => (m?.length ? [median(m)] : []));
}
/**
 * The voice at 16 kHz as floats, through a Kaiser-windowed sinc low-passed below the new Nyquist (librosa loads with
 * soxr; on 10-31 this read issue 6 to the same Hz a minute). The taps repeat every rate/gcd outputs, so they are made once.
 */
function to16k(samples: Int16Array, rate: number): Float32Array {
  const out = new Float32Array(Math.floor((samples.length * 16_000) / rate));
  if (rate === 16_000) { for (let i = 0; i < out.length; i += 1) out[i] = samples[i]! / 32768; return out; }
  const gcd = (p: number, q: number): number => (q ? gcd(q, p % q) : p);
  const phases = 16_000 / gcd(rate, 16_000);
  const cut = Math.min(1, 16_000 / rate) * 0.95;
  const half = 32;
  const reach = Math.ceil(half / cut);
  const i0 = (v: number) => { let s = 1, t = 1; for (let k = 1; k < 30; k += 1) { t *= (v / (2 * k)) ** 2; s += t; } return s; };
  const taps = Array.from({ length: phases }, (_, n) => {
    const frac = (n * rate) / 16_000 - Math.floor((n * rate) / 16_000);
    return Float64Array.from({ length: 2 * reach + 1 }, (_, j) => {
      const t = (j - reach - frac) * cut;
      const sinc = t ? Math.sin(Math.PI * t) / (Math.PI * t) : 1;
      return (cut * sinc * i0(8.6 * Math.sqrt(Math.max(0, 1 - (t / half) ** 2)))) / i0(8.6) / 32768;
    });
  });
  for (let n = 0; n < out.length; n += 1) {
    const base = Math.floor((n * rate) / 16_000) - reach;
    const tap = taps[n % phases]!;
    let s = 0;
    for (let j = Math.max(0, -base); j < tap.length && base + j < samples.length; j += 1) s += samples[base + j]! * tap[j]!;
    out[n] = s;
  }
  return out;
}
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

/** How much of the script's last line is in the last of what was heard: a reading that stops short ends elsewhere. */
export function endHeard(script: string, heard: string): number {
  const last = hanOnly(script.trim().split("\n").at(-1) ?? "");
  const tail = hanOnly(heard).slice(-last.length * 2);
  return last ? heardShare(last, tail) : 1;
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

/** A stretch of what Whisper heard, in seconds from the start of the whole reading. */
export type Heard = { start: number; end: number; text: string };

/** What Whisper hears, piece by piece (quietCuts), under one receipt: the text, and its segments timed in the whole. */
async function hear(samples: Int16Array, rate: number, subject: string): Promise<{ text: string; segments: Heard[] }> {
  const key = credential("models", "GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY missing");
  const cuts = quietCuts(samples, rate);
  const receipt = await paidRequest(
    { service: HEAR.service, model: HEAR.model, purpose: "reference_issue_hear", subject, identity: { model: HEAR.model, samples: samples.length, at: Date.now() }, requestSummary: { seconds: Math.round(samples.length / rate), pieces: cuts.length - 1 } },
    async () => {
      const texts: string[] = [];
      const segments: Heard[] = [];
      for (let i = 1; i < cuts.length; i += 1) {
        // Groq allows whisper 20 requests a minute, shared with archive's transcription: a piece every 3.5 s keeps
        // under it, and a 429 waits as long as Groq says (at most a minute, three times) rather than losing the reading.
        if (i > 1) await sleep(3_500);
        for (let wait = 0; ; wait += 1) {
          const form = new FormData();
          form.set("model", HEAR.model);
          form.set("file", new Blob([new Uint8Array(wavOf(samples.subarray(cuts[i - 1]!, cuts[i]!), rate))], { type: "audio/wav" }), "piece.wav");
          form.set("response_format", "verbose_json");
          form.set("language", "zh");
          form.set("prompt", "以下是普通话的句子。");
          const res = await fetch(`${HEAR.base}/audio/transcriptions`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(120_000) });
          if (res.status === 429 && wait < 3) {
            await sleep(Math.min(60, Number(res.headers.get("retry-after")) || 20) * 1000);
            continue;
          }
          if (!res.ok) assertAccepted(HEAR.service, res.status, await res.text());
          const body = (await res.json()) as { text?: string; segments?: Array<{ start?: number; end?: number; text?: string }> };
          texts.push(body.text ?? "");
          const offset = cuts[i - 1]! / rate;
          for (const g of body.segments ?? []) {
            if (Number.isFinite(g.start) && Number.isFinite(g.end)) segments.push({ start: offset + g.start!, end: offset + g.end!, text: g.text ?? "" });
          }
          break;
        }
      }
      return { response: { text: texts.join(""), segments }, usage: { audio_seconds: Math.round(samples.length / rate) } };
    },
  );
  await sql.begin((tx) => completeReceipt(tx, receipt.receiptId));
  return receipt.response as { text: string; segments: Heard[] };
}

/**
 * When each line of the script starts in the reading, in seconds, for the 文字稿 to follow the voice (Kay 10-31 22:14,
 * as 小宇宙 does). Whisper times its segments, not the script's lines, and hears some words otherwise; so each heard
 * character gets a time (spread evenly over its segment), the script's characters are lined up with the heard ones
 * (the longest common subsequence, as heardShare), and a line starts where its first lined-up character was heard,
 * less the characters before it at the reading's pace. A line with none lined up sits between its neighbours.
 * Null when too little lines up to trust (under half: the times would point at the wrong lines).
 */
export function lineStarts(lines: string[], segments: Heard[]): number[] | null {
  const heard: string[] = [];
  const times: number[] = [];
  for (const g of segments) {
    const chars = [...hanOnly(g.text)];
    chars.forEach((c, k) => { heard.push(c); times.push(g.start + ((g.end - g.start) * k) / chars.length); });
  }
  const script: string[] = [];
  const lineOf: number[] = [];
  lines.forEach((line, n) => { for (const c of hanOnly(line)) { script.push(c); lineOf.push(n); } });
  const a = script.length, b = heard.length;
  if (!a || !b) return null;
  const w = b + 1;
  const table = new Uint16Array((a + 1) * w);
  for (let i = 1; i <= a; i += 1) {
    for (let j = 1; j <= b; j += 1) {
      table[i * w + j] = script[i - 1] === heard[j - 1] ? table[(i - 1) * w + j - 1]! + 1 : Math.max(table[(i - 1) * w + j]!, table[i * w + j - 1]!);
    }
  }
  if (table[a * w + b]! < a / 2) return null;
  const at = new Array<number | undefined>(a);
  for (let i = a, j = b; i > 0 && j > 0;) {
    if (script[i - 1] === heard[j - 1] && table[i * w + j] === table[(i - 1) * w + j - 1]! + 1) { at[i - 1] = times[j - 1]; i -= 1; j -= 1; }
    else if (table[(i - 1) * w + j]! >= table[i * w + j - 1]!) i -= 1;
    else j -= 1;
  }
  const pace = (times.at(-1)! - times[0]!) / Math.max(1, a - 1);
  const starts = lines.map(() => NaN);
  for (let i = 0; i < a; i += 1) {
    const n = lineOf[i]!;
    if (Number.isNaN(starts[n]!) && at[i] !== undefined) starts[n] = at[i]! - (i - lineOf.indexOf(n)) * pace;
  }
  // Lines with nothing lined up (or no characters at all) go between the lines around them.
  for (let n = 0; n < starts.length; n += 1) {
    if (!Number.isNaN(starts[n]!)) continue;
    const before = n ? starts[n - 1]! : 0;
    let k = n + 1;
    while (k < starts.length && Number.isNaN(starts[k]!)) k += 1;
    const after = k < starts.length ? starts[k]! : times.at(-1)!;
    starts[n] = before + (after - before) / (k - n + 1);
  }
  starts[0] = 0;
  for (let n = 1; n < starts.length; n += 1) starts[n] = Math.max(starts[n - 1]!, starts[n]!);
  return starts.map((t) => Math.round(t * 10) / 10);
}

export interface VoiceReport {
  no: number; date: string; at: string;
  status: "up" | "tried" | "not ready" | "script failed" | "too long" | "check failed" | "no reads left" | "error";
  /** Requests sent to the voice for this issue, whatever came of them (Gemini's free ones are counted per request). */
  tries?: number;
  chars?: number; scriptRounds?: Array<{ problems: Problem[]; applied: number }>;
  reads?: Array<{ seconds: number; match: number; end?: number; gaps: Array<{ from: number; to: number }>; pitch: number[]; pass: boolean; why: string[] }>;
  /** A reading is kept with its script in the work folder but was never heard (the transcription failed): the next run hears it, not reads again. */
  unheard?: boolean;
  error?: string;
}

/**
 * Characters the voice reads as their opposite: Leda read 卖酒执照 as 买酒执照 in issue 7 (Kay 10-31), and the share
 * check let it through, one character in 2,265. Each pair: what the script says, what it was heard as.
 */
export const FLIPS: Array<[string, string]> = [["卖", "买"], ["买", "卖"]];

/**
 * The flips heard: a 卖 in the script whose neighbours turn up beside a 买 in the transcript, and beside no 卖. Counting
 * is not enough: in issue 7 Whisper also heard 不满 as 不卖, which hid the flip in the totals.
 */
export function flipsHeard(script: string, heard: string): string[] {
  const a = hanOnly(script);
  const b = hanOnly(heard);
  const out = new Set<string>();
  for (const [said, as] of FLIPS) {
    for (let i = a.indexOf(said); i >= 0; i = a.indexOf(said, i + 1)) {
      const pairs: Array<[string, string]> = [];
      // Two characters each side: one alone turns up by chance (外卖 酒院 reads 卖酒 once the gap is gone).
      if (i >= 2) pairs.push([a.slice(i - 2, i) + said, a.slice(i - 2, i) + as]);
      if (i + 2 < a.length) pairs.push([said + a.slice(i + 1, i + 3), as + a.slice(i + 1, i + 3)]);
      if (pairs.some(([, wrong]) => b.includes(wrong)) && !pairs.some(([right]) => b.includes(right))) out.add(`「${said}」念成「${as}」`);
    }
  }
  return [...out];
}

/** Judges one reading by the machine check; `why` names each failed part. */
export function judge(seconds: number, match: number, gaps: Array<{ from: number; to: number }>, pitch: number[], end = 1, flips: string[] = []) {
  const why: string[] = [...flips];
  if (match < PASS.match) why.push(`转写对上 ${(match * 100).toFixed(1)}%，不到 ${PASS.match * 100}%`);
  if (end < PASS.end) why.push("最后一句没念到");
  if (gaps.length) why.push(`有 ${gaps.length} 处空档超过 ${PASS.gap} 秒`);
  if (!pitch.length) why.push("量不出音高");
  else {
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
  const { text: heard, segments } = await hear(samples, rate, `issue:${no}:hear`);
  const match = heardShare(script, heard);
  const gaps = silences(samples, rate, PASS.gap);
  const pitch = pitchByMinute(samples, rate).map((p) => Math.round(p * 10) / 10);
  const end = endHeard(script, heard);
  const starts = lineStarts(scriptLines(script), segments);
  return { no, seconds, match: Math.round(match * 1000) / 1000, end: Math.round(end * 100) / 100, gaps, pitch, ...judge(seconds, match, gaps, pitch, end, flipsHeard(script, heard)), heard, starts };
}

/**
 * Times the 文字稿 of an issue already up (put up before lines were timed): hears its MP3 once (Groq, free tier) and
 * adds `starts` to <no>.json, keeping its seconds. Null, and nothing written, when too little of it lines up.
 */
export async function timeIssue(no: number) {
  const heard = await hearIssue(no);
  if (!heard.starts) return null;
  const meta = JSON.parse(await readFile(path.join(DIR, `${no}.json`), "utf8")) as Record<string, unknown>;
  await writeFile(path.join(DIR, `${no}.json.part`), JSON.stringify({ ...meta, starts: heard.starts }));
  await rename(path.join(DIR, `${no}.json.part`), path.join(DIR, `${no}.json`));
  return heard.starts;
}

/** The pause added before each line of the script after the first, in seconds. */
export const BREATH = 0.5;
/**
 * Room to breathe between the script's lines (Kay 10-31 22:30: listening to 十一说 felt like running out of breath).
 * Leda reads the whole issue in one request and goes from one line to the next with hardly a pause: issue 7 had 12
 * pauses over 0.8 s in 57 lines and about 8 over 0.5 s a minute, where the voice before it (Qwen, line by line with
 * 0.45 s put between) had about 18. So BREATH of silence goes in at the quietest 20 ms in the 0.6 s before each line
 * starts (not mid-word: the line's start is where Whisper heard it, a little late or early), and the line times move
 * with it so the 文字稿 still follows the voice.
 */
export function breathe(samples: Int16Array, rate: number, starts: number[], seconds = BREATH): { samples: Int16Array; starts: number[] } {
  const gap = Math.round(rate * seconds);
  const step = Math.round(rate * 0.02);
  const cuts: number[] = [];
  for (const [n, t] of starts.entries()) {
    if (n === 0) continue;
    const end = Math.min(samples.length, Math.round(t * rate));
    let best = end, low = Infinity;
    // Not before the previous line's start either, or that line would not move with its own silence.
    for (let i = Math.max(cuts.at(-1) ?? 0, Math.round(starts[n - 1]! * rate), end - Math.round(rate * 0.6)); i + step <= end; i += step) {
      let e = 0;
      for (let j = i; j < i + step; j += 1) e += samples[j]! * samples[j]!;
      if (e < low) { low = e; best = i + (step >> 1); }
    }
    cuts.push(Math.max(best, cuts.at(-1) ?? 0));
  }
  const out = new Int16Array(samples.length + gap * cuts.length);
  let from = 0, to = 0;
  for (const c of cuts) { out.set(samples.subarray(from, c), to); to += c - from + gap; from = c; }
  out.set(samples.subarray(from), to);
  return { samples: out, starts: starts.map((t, i) => Math.round((t + i * seconds) * 10) / 10) };
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
  const report = await readIssue(no, ask, opts);
  // A reading heard is done with (about 29 MB a day): only one not yet heard is kept, for the next run to hear. Not when
  // nothing ran ("not ready"): what an earlier run left unheard is still waiting.
  if (!opts.dryRun && opts.out === undefined && !report.unheard && report.status !== "not ready") await rm(path.join(DIR, "work", String(no)), { recursive: true, force: true });
  return report;
}

async function readIssue(no: number, ask: { write: Ask; check: Ask }, opts: { dryRun?: boolean; out?: string }): Promise<VoiceReport> {
  const [row] = await sql<{ date: string; issue: IssueText | null }[]>`
    SELECT to_char(date, 'YYYY-MM-DD') AS date, content->'issue' AS issue FROM reference_issues WHERE no = ${no} AND status = 'issue'`;
  if (!row?.issue) throw new Error(`第 ${no} 期不存在`);
  const before = await voiceReport(no);
  const used = opts.dryRun ? 0 : before?.tries ?? 0;
  const report: VoiceReport = { no, date: row.date, at: new Date().toISOString(), status: "error", tries: used, reads: opts.dryRun ? [] : before?.reads ?? [] };
  const keep = async () => { if (!opts.dryRun) { await mkdir(DIR, { recursive: true }); await writeFile(reportFile(no), JSON.stringify(report, null, 1)); } return report; };
  if (used >= MAX_READS && !before?.unheard) return { ...report, status: "no reads left" };
  // Not kept: once the key or the row is there, the next half hour reads it.
  const missing = await voiceMissing();
  if (missing.length) return { ...report, status: "not ready", error: missing.join("；") };
  // Kept under the data folder, not the container's /tmp: a reading not yet heard outlives a restart.
  const work = opts.out ?? path.join(DIR, "work", String(no));
  const saved = !opts.dryRun && before?.unheard
    ? await Promise.all([readFile(path.join(work, `${no}.txt`), "utf8"), readFile(path.join(work, `${no}.wav`))]).catch(() => null)
    : null;
  report.unheard = Boolean(saved);
  try {
    let script: string;
    if (saved) {
      script = saved[0].trimEnd();
      report.chars = before!.chars;
      report.scriptRounds = before!.scriptRounds;
    } else {
      const written = await writeScript(row.issue, row.date, ask.write, ask.check);
      report.scriptRounds = written.rounds;
      if (!written.lines) { report.status = "script failed"; return keep(); }
      script = written.lines.join("\n");
      report.chars = scriptChars(written.lines);
      if (report.chars > MAX_CHARS) { report.status = "too long"; return keep(); }
      await mkdir(work, { recursive: true });
      await writeFile(path.join(work, `${no}.txt`), `${script}\n`);
    }
    for (let attempt = saved ? used : used + 1; attempt <= MAX_READS; attempt += 1) {
      let wav: Buffer;
      if (saved && attempt === used) wav = saved[1];
      else {
        report.tries = attempt;
        await keep();
        wav = await read(script, `issue:${no}`, attempt).catch((error: unknown) => {
          if (error instanceof ProviderRejectedError && error.status === 400) report.status = "too long";
          throw error;
        });
        await writeFile(path.join(work, `${no}.wav`), wav);
        report.unheard = true;
        await keep();
      }
      const { rate, samples } = wavSamples(wav);
      const seconds = Math.round(samples.length / rate);
      await run("lame", ["--quiet", "-m", "m", "-b", "64", path.join(work, `${no}.wav`), path.join(work, `${no}.mp3`)]);
      const { text: heard, segments } = await hear(samples, rate, `issue:${no}:${attempt}`);
      report.unheard = false;
      const match = heardShare(script, heard);
      const gaps = silences(samples, rate, PASS.gap);
      const pitch = pitchByMinute(samples, rate).map((p) => Math.round(p * 10) / 10);
      const end = endHeard(script, heard);
      const verdict = judge(seconds, match, gaps, pitch, end, flipsHeard(script, heard));
      report.reads!.push({ seconds, match: Math.round(match * 1000) / 1000, end: Math.round(end * 100) / 100, gaps, pitch, ...verdict });
      if (!verdict.pass) { await keep(); continue; }
      // A breath between the script's lines (breathe): the reading is checked as Leda read it, then heard with room.
      let starts = lineStarts(scriptLines(script), segments);
      let length = seconds;
      if (starts) {
        const roomy = breathe(samples, rate, starts);
        starts = roomy.starts;
        length = Math.round(roomy.samples.length / rate);
        await writeFile(path.join(work, `${no}.wav`), wavOf(roomy.samples, rate));
        await run("lame", ["--quiet", "-m", "m", "-b", "64", path.join(work, `${no}.wav`), path.join(work, `${no}.mp3`)]);
      }
      if (opts.dryRun) { report.status = "tried"; return report; }
      // The files under the names the page reads, the seconds last: until they are there the page shows no 听.
      await mkdir(DIR, { recursive: true });
      for (const ext of ["mp3", "txt"]) {
        await writeFile(path.join(DIR, `${no}.${ext}.part`), await readFile(path.join(work, `${no}.${ext}`)));
        await rename(path.join(DIR, `${no}.${ext}.part`), path.join(DIR, `${no}.${ext}`));
      }
      // Where each line starts, for the 文字稿 to follow the voice; without it the 文字稿 is shown whole, as before.
      await writeFile(path.join(DIR, `${no}.json`), JSON.stringify({ seconds: length, starts: starts ?? undefined }));
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
