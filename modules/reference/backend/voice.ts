// 十一说 read aloud on the server (since 10-31; until then a session on Kay's computer did
// each step by hand: Core System Studio handbook 业务线/myfnbguide/十一说-每天怎么出.md step 10). Each morning after the
// issue is written: DeepSeek turns the published issue into a listen script (prompts/issue-voice.md: the spoken
// signposts the page leaves to its headings, since 10-31 the page has none, myfnbguide #100), the check model reads the
// script against the page (prompts/issue-voice-check.md) and its fixes go in line by line; Alibaba Cloud's Qwen voice
// reads it line by line (VOICE; Gemini's Leda read it whole until 11-01) and the lines are joined; the machine check
// of the handbook's step 10 runs (Groq's Whisper hears it back, gaps, pitch over three minutes at a time); what passes
// goes up as <no>.mp3, <no>.txt (the 文字稿) and <no>.json, the json last (backend/audio.ts). What fails stays down and
// the issue goes out as text, as on any day without audio. Every step's outcome is kept in <no>.voice.json beside them.
import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import os from "node:os";
import path from "node:path";
import { pinyin } from "pinyin-pro";
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
 * The script's length. WRITE_CHARS is the aim, about twelve minutes at 龙安欢's pace (issue 8: 2,452 characters in 526 s,
 * about 280 a minute): Kay 11-01 22:33 「我觉得12分钟 不会太长也不会太短 也省一点api额度」, 22:35 「是 12分钟左右 不是上限」,
 * 22:36 「要求写约 3,350 字，超过 3,900 才不念，提示词写约 12 分钟、不硬凑」. SHORTEN_ABOVE and MAX_CHARS are only guards
 * against a script that runs long, never an aim, and MAX_CHARS appears in no prompt. Before: 2,450/2,650 until 11-01, when
 * Gemini's Leda read the issue in one request and longer readings broke at the end and drifted (issue 7, 10-31: 3,091
 * characters, stopping short and climbing 63 Hz); then 3,700 (about thirteen minutes) once Qwen read line by line
 * (Kay 11-01 19:02 「是不是可以长一点了」). 11-03 ep 5's trial (#202) packed seven items into the aim and came out like a
 * table read aloud (four numbers in one sentence), so a full day may run to about fifteen minutes before it is sent back
 * (Kay 11-03 21:11 「为什么要强制12分钟？我的原话是12分钟左右」, 21:12 「你们决定吧」): SHORTEN_ABOVE 4,200, MAX_CHARS 4,500.
 */
export const MAX_CHARS = 4_500;
const WRITE_CHARS = 3_350;
/**
 * Readings of one issue at most, across a day's runs. Six since 11-01 (readers wait for the morning's audio, Kay 11-01
 * 09:39); set for Gemini's ten free a day and kept for Qwen: a run reads again until one passes, so six readings from
 * 05:20 are over well before readers wake.
 */
export const MAX_READS = 6;
/**
 * The voice: Alibaba Cloud Model Studio, Singapore (Kay 11-01 18:35 on the first Qwen reading, longanhuan_v3.1: 「很不错
 * 听起来很好 也完全没有窒息感」; 18:36: 「Gemini 不要了 以后都用阿里云 免费额度完了就付费 这个值得」; 18:37: 「确定用阿里云 但是
 * 还没选好声音」; 18:59, after comparing qwen-audio-3.1-tts-next, -plus and -flash: 「好 就定龙安欢 flash」). A change of voice
 * or model is this line (--voice, --model to try one). qwen-audio-3.1-tts-flash: free 1M
 * characters to 2027-01-31, then paid, US$0.07–0.1 a reading (6–7K characters billed, 11-01 18:40); of its Mandarin voices only the 多语种与方言 group answers in
 * Singapore (longanhuan_v3.1, longanlingxin_v3.1, longanfengyue_v3.1), the 精品中文 ones (xuyuyuan_v3.1 and the rest)
 * return Engine error 411 (11-01). This model, not qwen3-tts-flash (Cherry and others; free there only 10K characters):
 * Kay 18:39 「那就用新的」. Read line by line (each under 110 characters, the writer's limit), each line its own receipt.
 * `style` goes as the request's instruction, in Chinese as the text is; none, as Kay heard it. Leda's was 「早间节目主播，沉稳但有活力，语速适中，
 * 句与句之间留出自然换气的停顿」 (--style to try one).
 * Its key is QWEN_TTS_API_KEY, not DASHSCOPE_API_KEY: that name alone turns on the paid Bailian embeddings for grouping
 * (providers/embeddings.ts) and offers the dashscope models (site/models.ts).
 */
export const VOICE = { model: "qwen-audio-3.1-tts-flash", voice: "longanhuan_v3.1", style: "", service: "speech-qwen" };
/**
 * The machine check (handbook step 10): transcript ≥95% of the script, its closing line heard (`end`), no gap over
 * 4 s, and the voice's pitch over any three minutes within 1.5 semitones of any other three minutes (pitchWindows).
 * No fixed range: 195–225 Hz was set on issue 6 alone, and on 10-31 the same voice read issue 7 whole and steady at
 * 184–195; what is heard is a voice changing within an issue, not one day's voice lower than another's.
 * Until 11-02 the line was 20 Hz between whole minutes, and it did not hold for 龙安欢 read line by line: the same
 * issue 8 audio read 16.1 or 32.7 by where the minutes were cut, and issues 1, 3, 4 and 6, whole at 99.4%+, read
 * 21.7–34.6 and were kept off. A minute holds too few lines for their ups and downs to even out, and 20 Hz is less of
 * a voice at 254 Hz (龙安欢) than at 190 (Leda). Measured 11-02 by three minutes moved on 15 s at a time, in semitones:
 * issues 2, 5, 7 and 8 as up (龙安欢) 0.6–1.0, issues 1, 3, 4 and 6 as up (older voices, Kay heard and passed) 0.6–0.8,
 * issue 7 read whole on the computer 0.4; the known bad ones, issue 7 cut in two and read in two voices 2.8, issue 7
 * read on the server at 3,091 characters, sliding up to 240 Hz and stopping short, 3.6. The same audio started 5 or
 * 10 s later moves it at most 0.4. 1.5 sits half again over the highest good one and well under the lowest bad one.
 */
export const PASS = { match: 0.95, gap: 4, semitones: 1.5, end: 0.8 };
/**
 * whisper-large-v3, not -turbo: on issue 6 turbo heard 92.3% where the computer's faster-whisper (asr6.py) heard 95.4%,
 * and the 95% line was set on the computer's. --hear 6 shows whether the full model comes back to it.
 */
const HEAR = { base: "https://api.groq.com/openai/v1", model: "whisper-large-v3", service: "transcribe" };

/**
 * What reading an issue needs before anything is spent: both keys, and a budget row for both paid services (a service
 * with no row would have no circuit breaker; archive/backend/transcribe.ts skips on the same). myfnb/issue-voice.ts adds
 * the `speech-qwen` row; `transcribe` is archive's. Empty when ready.
 * Checked first, so a missing Groq key is found before the day's free readings are used up.
 */
export async function voiceMissing(): Promise<string[]> {
  const missing = ["QWEN_TTS_API_KEY", "GROQ_API_KEY"].filter((name) => !credential("models", name));
  const services = [VOICE.service, HEAR.service];
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
/**
 * An editor's note in a fix, not words to say: issue 11 (11-04) had the check answer 「…照顾明白。（整行删除，不念）」 for a
 * line on the page it wanted gone, the fix went in, and the voice read the note aloud. A fix carrying one is left out.
 */
const EDITOR_NOTE = /[（(][^（）()]*(删|不念|别念|补上|改为|改成|此行|这行|整行|原文)[^（）()]*[）)]/u;
export function applyFixes(lines: string[], problems: Problem[]): { lines: string[]; applied: number } {
  const out = [...lines];
  let applied = 0;
  for (const p of problems) {
    const at = out.findIndex((l) => l.trim() === p.line.trim());
    if (at < 0 || !p.fix.trim() || EDITOR_NOTE.test(p.fix)) continue;
    out.splice(at, 1, ...p.fix.split(/\n+/u).map((l) => l.trim()).filter(Boolean));
    applied += 1;
  }
  return { lines: out, applied };
}

/**
 * How many times the check's fixes go in. Three: issue 8 (11-01) was still one 误导 short after two, each round
 * finding a different line the rewrite had lost a source on.
 */
export const MENDS = 3;
/** The check's fourth kind (prompts/issue-voice-check.md): the line reads stiffly aloud. Mended, never a reason to refuse. */
export const AWKWARD = "拗口";
/**
 * A script over SHORTEN_ABOVE goes back to the writer to be cut, at most SHORTENS times; one still over MAX_CHARS after
 * the check is refused as before. Issue 8 (11-01 15:11): asked for 2,450, the writer gave 2,915 and the issue was not
 * read; asking again with the same words gives the same answer (temperature 0, and the receipt reuses it), so the
 * second ask shows the writer the length it gave. SHORTEN_ABOVE is about fifteen minutes, below MAX_CHARS to leave the
 * check's fixes room: issue 8's three put in about 40 characters.
 */
export const SHORTENS = 2;
const SHORTEN_ABOVE = 4_200;
/** Writes the script and has it checked, mending up to MENDS times; null with the last problems when it is still wrong. */
export async function writeScript(issue: IssueText, date: string, write: Ask, check: Ask | null): Promise<{ lines: string[] | null; rounds: Array<{ problems: Problem[]; applied: number }> }> {
  const page = pageText(issue, date);
  const system = prompt("issue-voice", { opening: opening(date), writeChars: String(WRITE_CHARS) });
  const framed = (got: string[]) => [opening(date), ...got.filter((l, i, all) => l && !(i === 0 && l.startsWith("大家早上好")) && !(i === all.length - 1 && l === CLOSING)), CLOSING];
  let lines = framed((await write("reference_issue_voice", system, `网站上的这一期：\n\n${page}`, Script)).lines);
  for (let n = 1; n <= SHORTENS && scriptChars(lines) > SHORTEN_ABOVE; n += 1) {
    const user = `网站上的这一期：\n\n${page}\n\n上一份听稿 ${scriptChars(lines)} 字，念出来超过十五分钟了。请照上面的要求重写：最要紧的几条照样讲清楚，次要的快讯各用一两句带过，不要把句子压短，全稿不超过 ${SHORTEN_ABOVE} 字：\n\n${lines.join("\n")}`;
    lines = framed((await write("reference_issue_voice", system, user, Script, `short${n}`)).lines);
  }
  const rounds: Array<{ problems: Problem[]; applied: number }> = [];
  if (!check) return { lines, rounds };
  // The last script that was wrong only in how it reads: a 拗口 fix can drop a 保留 the next round calls 误导, and that
  // must not stop an issue the same script would have passed with before 拗口 was checked (review of #203).
  let onlyStiff: string[] | null = null;
  for (let round = 0; round <= MENDS; round += 1) {
    const { problems } = await check("reference_issue_voice_check", prompt("issue-voice-check", { writeChars: String(WRITE_CHARS) }), `网站上的这一期：\n\n${page}\n\n听稿（一行一段）：\n\n${lines.join("\n")}`, Problems, `r${round}`);
    if (!problems.length) return { lines, rounds };
    // 拗口 is how a line sounds, not what it says (Kay 11-03 18:20: nothing checked how a script reads aloud): its fixes
    // go in and are checked again like the others, but a line still 拗口 at the end does not stop the issue.
    if (problems.every((p) => p.kind === AWKWARD)) onlyStiff = lines;
    if (round === MENDS) { rounds.push({ problems, applied: 0 }); break; }
    const fixed = applyFixes(lines, problems);
    rounds.push({ problems, applied: fixed.applied });
    lines = fixed.lines;
  }
  return { lines: onlyStiff, rounds };
}

/**
 * The script read aloud, line by line, the lines joined with a breath between (joinLines): a WAV (16-bit, one channel),
 * and where each line starts. No line is read again for its pitch: #178 read lines far off the issue's with seeds 1
 * and 2, and the other takes came back as high or low as the first (issue 10 on 11-03: 2 of 16 lines brought near;
 * issue 2: 2 of 34; about 40% more characters). The pitch goes with the words, short heads like 「第二条，英国酒税。」
 * reading high whatever the seed, not with the take.
 */
async function read(script: string, subject: string, attempt: number, voice = VOICE.voice, style = VOICE.style, model = VOICE.model): Promise<{ wav: Buffer; starts: number[] }> {
  const key = credential("models", "QWEN_TTS_API_KEY");
  if (!key) throw new Error("QWEN_TTS_API_KEY missing");
  const base = credential("models", "QWEN_TTS_BASE_URL") ?? "https://dashscope-intl.aliyuncs.com/api/v1";
  let rate = 0;
  let calls = 0;
  const say = async (line: string, n: number, relink?: number, hops = 0): Promise<Int16Array> => {
    // A line every 1.1 s keeps under the `speech-qwen` row's 60 a minute: 11-01 23:09 issue 2 read its first 60 lines in
    // 45 s and the 61st was refused (Budget for speech-qwen exhausted (minute)), and a 3,350-character issue runs past 60.
    if (calls++ > 0) await sleep(1_100);
    let url: string | undefined;
    const receipt = await paidRequest(
      { service: VOICE.service, model, purpose: "reference_issue_read", subject, identity: { model, voice, style, line, n, attempt }, requestSummary: { chars: line.length, n, attempt }, ...(relink ? { attemptTag: `relink:${relink}` } : {}) },
      async () => {
        // The Singapore host may need the workspace's own (https://<workspace>.ap-southeast-1.maas.aliyuncs.com/api/v1).
        const res = await fetch(`${base}/services/audio/tts/SpeechSynthesizer`, {
          method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, signal: AbortSignal.timeout(120_000),
          body: JSON.stringify({ model, input: { text: line, voice, format: "wav", sample_rate: 24_000, ...(style ? { instruction: style } : {}) } }),
        });
        // Which line, for the error: 11-01 the first line failed with only the engine's words to go by.
        if (!res.ok) {
          const text = (await res.text()).slice(0, 1000);
          try { assertAccepted(VOICE.service, res.status, text); } catch (error) {
            if (error instanceof Error) error.message = `第 ${n + 1} 行（${line.length} 字，声音 ${voice}）：${error.message}`;
            throw error;
          }
        }
        const body = (await res.json()) as { output?: { audio?: { url?: string } }; usage?: Record<string, unknown> };
        url = body.output?.audio?.url;
        if (!url) throw new ProviderRejectedError("speech-qwen: no audio in the answer", null, false);
        return { response: { url }, usage: body.usage ?? null };
      },
    );
    await sql.begin((tx) => completeReceipt(tx, receipt.receiptId));
    url ??= (receipt.response as { url?: string } | null)?.url;
    if (!url) throw new Error(`speech-qwen: line ${n + 1} has no audio`);
    const got = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!got.ok) {
      // The identity has no issue number or date, so a line read before (same words, place and attempt, e.g. an
      // unchanged line of an issue read again from its revised script) reuses that receipt and its link, which lasts
      // 24 h. Such a link gone, the line is asked for again under a tag naming that receipt; a later run finds the same
      // chain, and the step past its last (also gone) link is a new request.
      if (got.status >= 400 && got.status < 500 && receipt.reused && hops < MAX_READS) return say(line, n, receipt.receiptId, hops + 1);
      throw new Error(`speech-qwen: line ${n + 1} audio ${got.status} (the link lasts 24 h)`);
    }
    const wav = wavSamples(Buffer.from(await got.arrayBuffer()));
    if (rate && wav.rate !== rate) throw new Error(`speech-qwen: line ${n + 1} at ${wav.rate} Hz, the others ${rate}`);
    rate = wav.rate;
    return wav.samples;
  };
  const lines = scriptLines(script);
  const parts: Int16Array[] = [];
  for (const [n, line] of lines.entries()) parts.push(await say(line, n));
  const { samples, starts } = joinLines(parts, rate);
  return { wav: wavOf(samples, rate), starts };
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
 * The voice's pitch over three minutes at a time, moved on 15 s at a time: each 15 s given to pyin on its own (pyin.ts,
 * at 16 kHz), and the median of the voiced frames of every twelve in a row. A reading of three minutes or less is one
 * window. Medians over three minutes even out one line read higher than the next; moving on 15 s rather than cutting
 * whole minutes keeps the answer from turning on where the cuts fall (see PASS).
 */
export function pitchWindows(samples: Int16Array, rate: number): number[] {
  const x = to16k(samples, rate);
  const sr = 16_000;
  const step = 15 * sr;
  const chunks: number[][] = [];
  for (let at = 0; at < x.length; at += step) {
    const piece = x.subarray(at, at + step);
    chunks.push(piece.length >= sr ? pyin(piece, sr) : []);
  }
  const width = 12;
  const out: number[] = [];
  for (let i = 0; i === 0 || i + width <= chunks.length; i += 1) {
    const frames = chunks.slice(i, i + width).flat();
    if (frames.length) out.push(median(frames));
  }
  return out;
}
/** How far apart the highest and lowest of `pitch` are, in semitones. */
export function semitones(pitch: number[]): number {
  return 12 * Math.log2(Math.max(...pitch) / Math.min(...pitch));
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

/**
 * The text as it sounds: one toneless syllable a Chinese character (hanOnly first), each character read in its
 * context. The match is taken on these, not on the characters. Issue 8 (11-01) failed nine readings on the match,
 * 0.891–0.949, and what the transcript lacked (missedRuns, #150) was mostly names spelled another way: 大久保翔平
 * every time, 霸王茶姬, 千禧世代, 墨茉点心局, 佛卡夏. A listener hears the sound, not the spelling, so a name written
 * with other characters of the same sound is not a misreading. Tones are left out, as Whisper's characters do not
 * carry them reliably either; the one misreading a tone makes (卖 for 买) flipsHeard checks on its own.
 */
export const sounds = (s: string): string[] => {
  const han = hanOnly(s);
  return han ? pinyin(han, { toneType: "none", type: "array", v: true }) : [];
};

/** The longest common subsequence of two sequences, as a table: row i, column j is the length for a[..i] and b[..j]. */
function common(a: string[], b: string[]): { table: Uint16Array; width: number } {
  const width = b.length + 1;
  const table = new Uint16Array((a.length + 1) * width);
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      table[i * width + j] = a[i - 1] === b[j - 1] ? table[(i - 1) * width + j - 1]! + 1 : Math.max(table[(i - 1) * width + j]!, table[i * width + j - 1]!);
    }
  }
  return { table, width };
}

/** How much of the script the transcript has, in order, by sound: the longest common subsequence over the script's length. */
export function heardShare(script: string, heard: string): number {
  const a = sounds(script);
  const b = sounds(heard);
  if (!a.length) return 0;
  const { table, width } = common(a, b);
  return table[a.length * width + b.length]! / a.length;
}

/**
 * Where the transcript and the script part, for a person to see why a reading failed: the script's stretches of
 * MISSED_RUN or more characters the transcript does not have (the same alignment as heardShare), longest first, at
 * most MISSED_KEEP. Issue 8 (11-01) failed six readings on the match alone, 0.891–0.949, and the report kept only the
 * share: whether the voice dropped words, misread them, or Whisper skipped a stretch (issue 6, 26 s) could not be told.
 */
const MISSED_RUN = 3;
const MISSED_KEEP = 12;
export function missedRuns(script: string, heard: string): string[] {
  const chars = [...hanOnly(script)];
  const a = sounds(script);
  const b = sounds(heard);
  const { table, width } = common(a, b);
  const lost: boolean[] = Array.from({ length: a.length }, () => false);
  for (let i = a.length, j = b.length; i > 0;) {
    if (j > 0 && a[i - 1] === b[j - 1]) { i -= 1; j -= 1; }
    else if (j > 0 && table[i * width + j - 1]! >= table[(i - 1) * width + j]!) j -= 1;
    else { lost[i - 1] = true; i -= 1; }
  }
  const runs: string[] = [];
  for (let i = 0; i < a.length;) {
    if (!lost[i]) { i += 1; continue; }
    let k = i;
    while (k < a.length && lost[k]) k += 1;
    if (k - i >= MISSED_RUN) runs.push(chars.slice(i, k).join(""));
    i = k;
  }
  return runs.sort((x, y) => y.length - x.length).slice(0, MISSED_KEEP);
}

/** How much of the script's last line is in the last of what was heard: a reading that stops short ends elsewhere. */
export function endHeard(script: string, heard: string): number {
  const last = hanOnly(script.trim().split("\n").at(-1) ?? "");
  const tail = [...hanOnly(heard)].slice(-[...last].length * 2).join("");
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
  /** Readings of this issue begun, whatever came of them. */
  tries?: number;
  chars?: number; scriptRounds?: Array<{ problems: Problem[]; applied: number }>;
  reads?: Array<{ seconds: number; match: number; end?: number; gaps: Array<{ from: number; to: number }>; pitch: number[]; pass: boolean; why: string[]; missed?: string[]; /** When it was read: a report carries the earlier runs' reads too (11-01 one was taken for the run in hand). */ at?: string }>;
  /** A reading is kept with its script in the work folder but was never heard (the transcription failed): the next run hears it, not reads again. */
  unheard?: boolean;
  error?: string;
}

/**
 * Characters a voice reads as their opposite: Leda read 卖酒执照 as 买酒执照 in issue 7 (Kay 10-31), and the share
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
    const apart = semitones(pitch);
    if (apart > PASS.semitones) why.push(`音高前后差 ${apart.toFixed(1)} 个半音，超过 ${PASS.semitones}`);
  }
  if (seconds < 60) why.push(`只有 ${seconds} 秒`);
  return { pass: !why.length, why };
}

/**
 * The machine check on an issue already up, its MP3 against its script: for setting the thresholds on audio a person
 * has heard, before reading is turned on. Pays one transcription; no voice.
 */
export async function hearIssue(no: number) {
  const missing = (await voiceMissing()).filter((m) => !m.includes("QWEN") && !m.includes(VOICE.service));
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
  const pitch = pitchWindows(samples, rate).map((p) => Math.round(p * 10) / 10);
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

/** Lines shorter than this many characters are read joined to a neighbour (joinShort). */
export const SHORT_LINE = 18;
/**
 * The script with its short lines joined to a neighbour, the words as they were. A short line that opens what follows
 * (「第二条，英国酒税。」「第一层，…」「换到葡萄牙。」「再看越南。」「先说英国。」「下一条在巴西。」「最后一条，…」, or one
 * ending in a colon or question mark) goes onto the start of the line after it; any other short line onto the end of the
 * line before. The first and last lines are never moved, and nothing is joined onto the last (a short line just after
 * the opening still goes onto the end of the opening). Each line is its own request and
 * starts its own tune, and a short one starts high and stays there: 11-03 on issue 10, 「第二条，英国酒税。」 read alone
 * sat 4.9 semitones above an ordinary line and 1.3 joined to the next; 「最低工资也上调了。」 5.4 and 1.5; 「第四条，
 * 消费入座。」 4.1 and 0.7 (Kay 11-03 06:38 「有时候音高 有时候音低」, 12:11 「是不是用词的关系？」). Which way each kind
 * goes was set with the 全面整理 review of issues 2 and 4–10 on 11-03.
 */
/** A short line that opens what follows (joinShort). */
const OPENS = /^(?:第[一二三四五六七八九十]+[条篇层]|换到|再看|先说|下一条|最后一条)|[：:？?]$/u;

export function joinShort(lines: string[], short = SHORT_LINE): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const isShort = [...line].length < short && i > 0 && i < lines.length - 1;
    if (isShort && i + 1 < lines.length - 1 && OPENS.test(line)) { out.push(line + lines[i + 1]!); i += 1; continue; }
    if (isShort && out.length) { out[out.length - 1] += line; continue; }
    out.push(line);
  }
  return out;
}

/**
 * When the voice is quiet, for the 文字稿 to light only while she speaks: every silence over 0.2 s (silences), and each
 * line's start moved to where her voice comes in after the pause around it. Kay 11-03 12:37 「现在文字稿好像没有提前
 * 0.5秒」: lighting each line's characters evenly from its start to the next line's counted the pause after it (on
 * issue 10, about 0.8 s: the line's own quiet tail and BREATH) as speech, so the last words lit about 0.2 s after they
 * were said, not 0.5 s before; and lines timed by Whisper started up to 0.4 s after her voice did.
 */
export function followTimes(samples: Int16Array, rate: number, starts: number[]): { starts: number[]; pauses: Array<[number, number]> } {
  const pauses = silences(samples, rate, 0.2).map(({ from, to }): [number, number] => [from, to]);
  const moved = starts.map((t, i) => {
    if (!i) return t;
    // The pause her voice comes in at: one that ends near where the line was put to start.
    const near = pauses.filter(([from, to]) => from <= t + 0.3 && to >= t - 0.6);
    return near.length ? near.reduce((a, b) => (Math.abs(b[1] - t) < Math.abs(a[1] - t) ? b : a))[1] : t;
  });
  return { starts: moved, pauses };
}

/**
 * Adds `pauses` (followTimes) to the <no>.json of an issue already up and moves its `starts` to where the voice comes
 * in. Reads the MP3 only: no transcription, no voice, nothing paid.
 */
export async function pauseIssue(no: number) {
  const meta = JSON.parse(await readFile(path.join(DIR, `${no}.json`), "utf8")) as Record<string, unknown> & { starts?: number[] };
  if (!Array.isArray(meta.starts)) return null;
  const work = path.join(os.tmpdir(), `issue-pause-${no}`);
  await mkdir(work, { recursive: true });
  await writeFile(path.join(work, "in.mp3"), await readFile(path.join(DIR, `${no}.mp3`)));
  await run("lame", ["--quiet", "--decode", path.join(work, "in.mp3"), path.join(work, "out.wav")]);
  const { rate, samples } = wavSamples(await readFile(path.join(work, "out.wav")));
  await rm(work, { recursive: true, force: true });
  const times = followTimes(samples, rate, meta.starts);
  await writeFile(path.join(DIR, `${no}.json.part`), JSON.stringify({ ...meta, ...times }));
  await rename(path.join(DIR, `${no}.json.part`), path.join(DIR, `${no}.json`));
  return times;
}

/** The pause added before each line of the script after the first, in seconds. */
export const BREATH = 0.5;
/**
 * The lines read one by one, joined with BREATH of silence between, and where each line starts in seconds (Kay 10-31
 * 22:30: listening to 十一说 felt like running out of breath). The breath goes in at the seam itself, which reading line
 * by line knows to the sample. It used to go in at the quietest 20 ms in the 0.6 s before where Whisper heard each line
 * start; Whisper heard some a second early, and issue 10 had 10 breaths cut into the last word of a line (Kay 11-03
 * 06:37: 「大概7-8词卡了一个字 就是说到一半卡了一个字」).
 */
export function joinLines(parts: Int16Array[], rate: number, seconds = BREATH): { samples: Int16Array; starts: number[] } {
  const gap = Math.round(rate * seconds);
  const out = new Int16Array(parts.reduce((sum, p) => sum + p.length, 0) + gap * Math.max(0, parts.length - 1));
  const starts: number[] = [];
  let at = 0;
  for (const [n, p] of parts.entries()) {
    if (n) at += gap;
    starts.push(Math.round((at / rate) * 10) / 10);
    out.set(p, at);
    at += p.length;
  }
  return { samples: out, starts };
}

const reportFile = (no: number) => path.join(DIR, `${no}.voice.json`);

/**
 * Puts up a reading a --try left in `dir` (tries/<no>/) and passed the machine check: its MP3 and script, and <no>.json
 * with the seconds, each line's start as the reading joined them (joinLines, exact) and the pauses (followTimes), as
 * --put writes them. Reads nothing aloud and pays nothing. 11-03: issues 2 and 4–10 were read again with short lines
 * joined (Kay 12:11 「是不是用词的关系？」), as tries to be heard first; --put would read them once more, and issues 2, 5,
 * 7 and 9 have no reads left; issue-audio.sh writes only the seconds, so the 文字稿 would not follow the voice.
 */
export async function putTry(no: number, dir: string): Promise<{ seconds: number; lines: number } | { refused: string }> {
  const file = (ext: string) => path.join(dir, `${no}.${ext}`);
  const tried = await readFile(file("voice.json"), "utf8").then((t) => JSON.parse(t) as VoiceReport, () => null);
  if (tried?.status !== "tried") return { refused: `${file("voice.json")} 不是一次核对通过的试念（${tried?.status ?? "没有这个文件"}）` };
  const [script, wav, startsText] = await Promise.all([readFile(file("txt"), "utf8"), readFile(file("wav")), readFile(file("starts.json"), "utf8")]);
  const starts = JSON.parse(startsText) as number[];
  const lines = scriptLines(script);
  if (lines.length !== starts.length) return { refused: `听稿 ${lines.length} 行，开始时间 ${starts.length} 个，对不上` };
  const { rate, samples } = wavSamples(wav);
  const seconds = Math.round(samples.length / rate);
  if (seconds !== tried.reads?.at(-1)?.seconds) return { refused: `wav ${seconds} 秒，和核对通过的那次（${tried.reads?.at(-1)?.seconds} 秒）不是同一份` };
  await mkdir(DIR, { recursive: true });
  for (const ext of ["mp3", "txt"]) {
    await writeFile(path.join(DIR, `${no}.${ext}.part`), await readFile(file(ext)));
    await rename(path.join(DIR, `${no}.${ext}.part`), path.join(DIR, `${no}.${ext}`));
  }
  // The seconds last: until they are there the page shows no 听.
  await writeFile(path.join(DIR, `${no}.json.part`), JSON.stringify({ seconds, ...followTimes(samples, rate, starts) }));
  await rename(path.join(DIR, `${no}.json.part`), path.join(DIR, `${no}.json`));
  return { seconds, lines: lines.length };
}
export async function voiceReport(no: number): Promise<VoiceReport | null> {
  return readFile(reportFile(no), "utf8").then((t) => JSON.parse(t) as VoiceReport, () => null);
}

/**
 * Writes issue `no`'s script the way the daily run does, and only that: not checked (the checker is the paid Claude
 * API), no voice, nothing put up. For setting the writing against a script already up (Kay 11-03 18:09 「你可以多关注
 * 文字稿的内容 因为好听的播客是内容和声音的配合」): the new script goes to writes/<no>/write.txt, apart from tries/,
 * with the one up beside it as up.txt.
 */
export async function writeOnly(no: number, write: Ask, check: Ask) {
  const [row] = await sql<{ date: string; issue: IssueText | null }[]>`
    SELECT to_char(date, 'YYYY-MM-DD') AS date, content->'issue' AS issue FROM reference_issues WHERE no = ${no} AND status = 'issue'`;
  if (!row?.issue) throw new Error(`第 ${no} 期不存在`);
  const out = path.join(DIR, "writes", String(no));
  await mkdir(out, { recursive: true });
  // Checked like a daily issue (Kay 11-03 21:34 「质量最重要 其他都是其次」): issue 10's unchecked trial turned 八十八元
  // into 「几十块钱」, and a trial that reads well only because nobody checked it says nothing about the rule.
  const { lines, rounds } = await writeScript(row.issue, row.date, write, check);
  await writeFile(path.join(out, "check.json"), `${JSON.stringify(rounds, null, 1)}\n`);
  const up = await readFile(path.join(DIR, `${no}.txt`), "utf8").catch(() => "");
  if (up) await writeFile(path.join(out, "up.txt"), up);
  // A script that did not pass leaves the last trial's write.txt as it was; the problems are in check.json.
  if (lines) await writeFile(path.join(out, "write.txt"), `${lines.join("\n")}\n`);
  return { out: path.join(out, "write.txt"), lines: lines?.length ?? 0, chars: scriptChars(lines ?? []), passed: lines !== null, rounds: rounds.length };
}

/**
 * Reads issue `no` aloud and, unless `dryRun`, puts it up when the machine check passes. A dry run leaves the MP3 and
 * the script in `out` for a person to hear and keeps nothing on the site.
 */
export async function voiceIssue(no: number, ask: { write: Ask; check: Ask }, opts: { dryRun?: boolean; out?: string; voice?: string; style?: string; model?: string; script?: string } = {}): Promise<VoiceReport> {
  const report = await readIssue(no, ask, opts);
  // A reading heard is done with (about 29 MB a day): only one not yet heard is kept, for the next run to hear. Not when
  // nothing ran ("not ready"): what an earlier run left unheard is still waiting.
  if (!opts.dryRun && opts.out === undefined && !report.unheard && report.status !== "not ready") await rm(path.join(DIR, "work", String(no)), { recursive: true, force: true });
  return report;
}

async function readIssue(no: number, ask: { write: Ask; check: Ask }, opts: { dryRun?: boolean; out?: string; voice?: string; style?: string; model?: string; script?: string }): Promise<VoiceReport> {
  const [row] = await sql<{ date: string; issue: IssueText | null }[]>`
    SELECT to_char(date, 'YYYY-MM-DD') AS date, content->'issue' AS issue FROM reference_issues WHERE no = ${no} AND status = 'issue'`;
  if (!row?.issue) throw new Error(`第 ${no} 期不存在`);
  const before = await voiceReport(no);
  const used = opts.dryRun ? 0 : before?.tries ?? 0;
  const report: VoiceReport = { no, date: row.date, at: new Date().toISOString(), status: "error", tries: used, reads: opts.dryRun ? [] : before?.reads ?? [] };
  // A dry run keeps its report beside its reading, for putTry to see the reading passed.
  const keep = async () => {
    if (!opts.dryRun) { await mkdir(DIR, { recursive: true }); await writeFile(reportFile(no), JSON.stringify(report, null, 1)); }
    else if (opts.out) { await mkdir(opts.out, { recursive: true }); await writeFile(path.join(opts.out, `${no}.voice.json`), JSON.stringify(report, null, 1)); }
    return report;
  };
  if (used >= MAX_READS && !before?.unheard) return { ...report, status: "no reads left" };
  // Not kept: once the key or the row is there, the next half hour reads it.
  const missing = await voiceMissing();
  if (missing.length) return { ...report, status: "not ready", error: missing.join("；") };
  // Kept under the data folder, not the container's /tmp: a reading not yet heard outlives a restart.
  const work = opts.out ?? path.join(DIR, "work", String(no));
  const saved = !opts.dryRun && before?.unheard
    ? await Promise.all([readFile(path.join(work, `${no}.txt`), "utf8"), readFile(path.join(work, `${no}.wav`)), readFile(path.join(work, `${no}.starts.json`), "utf8")]).catch(() => null)
    : null;
  report.unheard = Boolean(saved);
  try {
    let script: string;
    if (saved) {
      script = saved[0].trimEnd();
      report.chars = before!.chars;
      report.scriptRounds = before!.scriptRounds;
    } else if (opts.script !== undefined) {
      // A script already checked and up, such as an issue's own N.txt (11-01: issues 1–7 read again in 龙安欢's voice from
      // their texts as they are, not rewritten). No length limit here: Kay 11-01 22:37 「原稿超过上限的照原长念」
      // (issues 2–5 run 4,651–5,852 characters).
      const lines = joinShort(scriptLines(opts.script));
      script = lines.join("\n");
      report.chars = scriptChars(lines);
      report.scriptRounds = [];
      if (!lines.length) { report.status = "script failed"; return keep(); }
      await mkdir(work, { recursive: true });
      await writeFile(path.join(work, `${no}.txt`), `${script}\n`);
    } else {
      const written = await writeScript(row.issue, row.date, ask.write, ask.check);
      report.scriptRounds = written.rounds;
      if (!written.lines) { report.status = "script failed"; return keep(); }
      script = joinShort(written.lines).join("\n");
      report.chars = scriptChars(written.lines);
      if (report.chars > MAX_CHARS) { report.status = "too long"; return keep(); }
      await mkdir(work, { recursive: true });
      await writeFile(path.join(work, `${no}.txt`), `${script}\n`);
    }
    for (let attempt = saved ? used : used + 1; attempt <= MAX_READS; attempt += 1) {
      let wav: Buffer;
      let starts: number[];
      if (saved && attempt === used) { wav = saved[1]; starts = JSON.parse(saved[2]) as number[]; }
      else {
        report.tries = attempt;
        await keep();
        ({ wav, starts } = await read(script, `issue:${no}`, attempt, opts.voice, opts.style, opts.model));
        await writeFile(path.join(work, `${no}.starts.json`), JSON.stringify(starts));
        await writeFile(path.join(work, `${no}.wav`), wav);
        report.unheard = true;
        await keep();
      }
      const { rate, samples } = wavSamples(wav);
      const seconds = Math.round(samples.length / rate);
      await run("lame", ["--quiet", "-m", "m", "-b", "64", path.join(work, `${no}.wav`), path.join(work, `${no}.mp3`)]);
      const { text: heard } = await hear(samples, rate, `issue:${no}:${attempt}`);
      report.unheard = false;
      const match = heardShare(script, heard);
      const gaps = silences(samples, rate, PASS.gap);
      const pitch = pitchWindows(samples, rate).map((p) => Math.round(p * 10) / 10);
      const end = endHeard(script, heard);
      const verdict = judge(seconds, match, gaps, pitch, end, flipsHeard(script, heard));
      report.reads!.push({ at: new Date().toISOString(), seconds, match: Math.round(match * 1000) / 1000, end: Math.round(end * 100) / 100, gaps, pitch, ...verdict, ...(verdict.pass ? {} : { missed: missedRuns(script, heard) }) });
      if (!verdict.pass) { await keep(); continue; }
      if (opts.dryRun) { report.status = "tried"; return keep(); }
      // The files under the names the page reads, the seconds last: until they are there the page shows no 听.
      await mkdir(DIR, { recursive: true });
      for (const ext of ["mp3", "txt"]) {
        await writeFile(path.join(DIR, `${no}.${ext}.part`), await readFile(path.join(work, `${no}.${ext}`)));
        await rename(path.join(DIR, `${no}.${ext}.part`), path.join(DIR, `${no}.${ext}`));
      }
      // Where each line starts, for the 文字稿 to follow the voice.
      await writeFile(path.join(DIR, `${no}.json`), JSON.stringify({ seconds, ...followTimes(samples, rate, starts) }));
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
