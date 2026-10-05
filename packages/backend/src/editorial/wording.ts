// Words the site keeps out of what readers read (industry/wording.ts): each use in a written title, summary or
// reason, named with what to write instead, for the one call that mends them (analyze.ts, mendWording); and the
// spacing a pack may ask for between Chinese and Latin letters or digits, which the program sets itself.
import { READER_SPACING, READER_WORDING } from "@aihot/industry/wording";
import { ITEM_COPY } from "@aihot/site";

export interface ReaderCopy {
  titleZh: string;
  summaryZh: string;
  reasonZh: string | null;
}

const FIELDS: Array<[keyof ReaderCopy, string]> = [["titleZh", "标题"], ["summaryZh", "摘要"], ["reasonZh", ITEM_COPY.reasonLabel]];

/**
 * Every use of a word of the list in a copy, each as a line the model can act on: where, the words around it,
 * and the fix. Each use is its own line, so a copy that mends one of two has fewer.
 */
export function wordingProblems(copy: ReaderCopy): string[] {
  const problems: string[] = [];
  for (const [field, name] of FIELDS) {
    const text = copy[field];
    if (!text) continue;
    for (const [pattern, fix] of READER_WORDING) {
      for (const hit of text.matchAll(new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`))) {
        problems.push(`${name}用了“${hit[0]}”（“${text.slice(Math.max(0, hit.index - 8), hit.index + hit[0].length + 8)}”）：${fix}`);
      }
    }
  }
  return problems;
}

const CJK = "\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}";
/** A link is left as it is; Chinese punctuation or text after it is not part of it. */
const LINK = /((?:https?:\/\/|www\.)[!-~]+)/u;
const CJK_THEN_LATIN = new RegExp(`([${CJK}])([A-Za-z0-9]|[$€£¥₩₹](?=\\d))`, "gu");
const LATIN_THEN_CJK = new RegExp(`([A-Za-z0-9%°])([${CJK}])`, "gu");

/**
 * A half-width space between a Chinese (or kana) character and a Latin letter or digit next to it: “用 AI 改菜单”,
 * “31 席”, “增长 1.1% 的”. Links, words, numbers, a percent sign or a currency sign before a number stay whole
 * (“US$400”). Text already spaced is left as it is.
 */
export function spaced(text: string): string {
  return text.split(LINK).map((part, i) => (i % 2 ? part : part.replace(CJK_THEN_LATIN, "$1 $2").replace(LATIN_THEN_CJK, "$1 $2"))).join("");
}

/**
 * A written copy as it is stored, spaced when the pack asks for it (READER_SPACING): the model's spacing is not
 * the same from one copy to the next, a prompt cannot make it so.
 */
export function spaceCopy<T extends ReaderCopy>(copy: T, on: boolean = READER_SPACING): T {
  if (!on) return copy;
  return { ...copy, titleZh: spaced(copy.titleZh), summaryZh: spaced(copy.summaryZh), reasonZh: copy.reasonZh === null ? null : spaced(copy.reasonZh) };
}
