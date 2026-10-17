// A story's share image (1200×630 PNG, the og:image of /reference/cases/<id>): the engine's dark card (its frame,
// wordmark, host and kicker, packages/backend/src/media/og.ts) with the story's title over its strongest figure,
// drawn as the story page draws it (web/ui.tsx): big numbers over a short accent rule, before and after with the
// after in the accent, bars with the last one in the accent, or a quote under a quotation mark. Every word on it is
// the story's own; a story with no figure that fits gets the engine's card with its title and lead. Fixed code over
// stored blocks: no model is called, and each card is rendered once and kept on disk by its content.
import { createHash } from "node:crypto";
import { brandMark, clamp, h, nameMark, renderOg, renderPng, SITE_HOST, type Node } from "@aihot/backend/media/og";
import { comparable, exact, figureSplit, isFigure, num } from "../format.ts";
import type { Block, CaseStory, ChangeBlock, CompareBlock, NumbersBlock } from "../types.ts";

/** Bumped when the drawing changes, so every card is drawn again. */
export const SHARE_TEMPLATE_VERSION = "reference-share-2026-10-17.2";

type QuoteBlock = Extract<Block, { type: "quote" }>;
export type ShareFigure = NumbersBlock | ChangeBlock | CompareBlock | QuoteBlock;

/**
 * A quote longer than this does not go on a card: cut short, the words would no longer be what the person said, and
 * at the size a card needs a longer one takes the room of the title.
 */
export const QUOTE_MAX = 72;

/** Whether a block can be drawn on a card as the story draws it: the parts it needs are there and make sense. */
function usable(b: Block): b is ShareFigure {
  switch (b.type) {
    // A figure in digits or in Chinese numerals (接近一万家): drawn as the page draws it, its number big.
    case "numbers": return b.items.length > 0 && b.items.every((i) => i.label.trim() && isFigure(i.value));
    case "change": return !!(b.before.text.trim() && b.after.text.trim());
    case "compare": return b.items.length >= 2 && b.items.every((i) => Number.isFinite(i.value) && i.value >= 0) && Math.max(...b.items.map((i) => i.value)) > 0;
    case "quote": return !!(b.text.trim() && b.who.trim()) && [...b.text.trim()].length <= QUOTE_MAX;
    default: return false;
  }
}

/**
 * The figure a story's card shows, the first that fits of the strongest kind there is: the original's key figures
 * (what the story is about, in its own numbers), then how something was done before and after, then the original's
 * numbers as bars, then a person's words. A parts bar needs its legend and an example has made-up numbers, so
 * neither is a card's figure; lists, steps and text are what the title already says. Null: a card with the title.
 */
export function pickFigure(story: CaseStory): ShareFigure | null {
  const blocks = story.parts.flatMap((p) => p.blocks);
  for (const type of ["numbers", "change", "compare", "quote"] as const) {
    const found = blocks.find((b): b is ShareFigure => b.type === type && usable(b));
    if (found) return found;
  }
  return null;
}

/** What a card shows: all of it the story's own, or the library's names (its situation, its source and month). */
export interface ShareCard {
  kicker: string;
  title: string;
  /** Under the title when there is no figure, as the engine's cards have a summary. */
  lead: string;
  /** Where the story comes from, as its card in a list writes it: "澳大利亚 · 播客 · 2021 年 3 月". */
  meta: string;
  figure: ShareFigure | null;
}

export function shareCard(story: CaseStory, place: { situation: string | null; src: string }): ShareCard {
  return { kicker: place.situation ? `参考 · ${place.situation}` : "参考", title: story.title, lead: story.lead, meta: place.src, figure: pickFigure(story) };
}

export function shareEtag(card: ShareCard): string {
  return createHash("sha256").update(SHARE_TEMPLATE_VERSION).update(JSON.stringify(card)).digest("hex").slice(0, 24);
}

const WIDTH = 1200;
const HEIGHT = 630;
const PAD_X = 72;
const INNER = WIDTH - 2 * PAD_X;
// The engine's card colours (og.ts tree): the ground, its text, white for what matters, two greys, the accent.
const INK = "#e6eded";
const WHITE = "#ffffff";
const SOFT = "#b1bec0";
const GREY = "#82939a";
const ACCENT = "#2ce2e8";
const HAIR = "rgba(230,237,237,0.14)";
const TRACK = "rgba(130,147,154,0.18)";

/**
 * About how wide a text sets at `size` px in Noto Sans SC: a Han character or full-width sign is the size, a Latin
 * letter, digit or space a little over half of it. Enough to pick a size and to cut a line before satori would.
 */
function textWidth(text: string, size: number): number {
  let w = 0;
  for (const c of text) w += /[\u0000-˿ -⁯←-⇿]/u.test(c) ? (/[A-Z0-9%$€£¥@#&]/.test(c) ? 0.64 : c === " " ? 0.3 : 0.54) : 1;
  return w * size;
}

/** The text cut to what fits in `lines` lines of `width` at `size`, with an ellipsis where it was cut. */
function fitText(text: string, size: number, width: number, lines: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  // Lines break at words and punctuation, not at the last pixel: a tenth of each line is kept free.
  const room = width * lines * 0.9;
  if (textWidth(flat, size) <= room) return flat;
  let out = "";
  for (const c of flat) {
    if (textWidth(`${out}${c}…`, size) > room) break;
    out += c;
  }
  return `${out.replace(/[\s，、；：,;:]+$/u, "")}…`;
}

/** The largest of `sizes` at which the text fits in `lines` lines, and the text cut to the smallest where none does. */
function sized(text: string, sizes: number[], width: number, lines: number): { size: number; text: string } {
  const flat = text.replace(/\s+/g, " ").trim();
  for (const size of sizes) if (textWidth(flat, size) <= width * lines * 0.9) return { size, text: flat };
  const size = sizes.at(-1)!;
  return { size, text: fitText(flat, size, width, lines) };
}

const row = (style: Record<string, unknown>, children: unknown) => h("div", { display: "flex", ...style }, children);
const col = (style: Record<string, unknown>, children: unknown) => h("div", { display: "flex", flexDirection: "column", ...style }, children);
const text = (style: Record<string, unknown>, children: string) => h("div", { display: "flex", ...style }, children);

/** A figure as it writes it, its number big and the words around it smaller ("近 70 家": 近, 70 and 家). */
function figureValue(value: string, size: number, color = WHITE): Node {
  const [before, n, after] = figureSplit(value);
  // The words around the number stay readable at a phone's preview size: 22px at least.
  const small = Math.max(22, Math.round(size * 0.36));
  return row({ alignItems: "baseline" }, [
    before ? text({ fontSize: small, fontWeight: 700, color: SOFT, marginRight: 8 }, before) : null,
    text({ fontSize: size, fontWeight: 700, color, lineHeight: 1, letterSpacing: -1 }, n),
    after ? text({ fontSize: small, fontWeight: 700, color: SOFT, marginLeft: 8 }, after) : null,
  ].filter(Boolean));
}

/** The original's key figures, at most three: side by side between hairlines in one unit, else a list. */
function numbers(b: NumbersBlock): Node {
  const items = b.items.slice(0, 3);
  if (items.length === 1 || comparable(items.map((i) => i.value))) {
    const gap = 44;
    const width = (INNER - gap * (items.length - 1)) / items.length;
    // One size for all, the largest at which the longest figure fits its column.
    const longest = Math.max(...items.map((i) => {
      const [before, n, after] = figureSplit(i.value);
      return textWidth(n, 1) + textWidth(before + after, 0.36) + 0.3;
    }));
    const size = Math.max(52, Math.min(items.length === 1 ? 112 : items.length === 2 ? 92 : 80, Math.floor((width - 8) / longest)));
    return row({ alignItems: "stretch" }, items.map((i, n) => col({
      width, paddingLeft: n ? gap : 0, borderLeft: n ? `1px solid ${HAIR}` : "none",
    }, [
      figureValue(i.value, size),
      h("div", { width: 44, height: 4, borderRadius: 999, backgroundColor: ACCENT, marginTop: 20 }),
      text({ fontSize: 26, lineHeight: 1.4, color: SOFT, marginTop: 16, paddingRight: 12 }, fitText(i.label, 26, width - (n ? gap : 0) - 12, 2)),
    ])));
  }
  // Figures in different units: what each is beside its number, none set up as the others' equal.
  return col({}, items.map((i, n) => row({
    alignItems: "center", justifyContent: "space-between", gap: 32, padding: items.length === 3 ? "8px 0" : "14px 0", borderTop: n ? `1px solid ${HAIR}` : "none",
  }, [
    text({ flex: 1, fontSize: 30, lineHeight: 1.35, color: INK }, fitText(i.label, 30, INNER * 0.55, 1)),
    // As large as fits under a two-line title: about 206px are left for the figure.
    figureValue(i.value, items.length === 3 ? 46 : 60),
  ])));
}

/** Before and after side by side, the after in the accent, an arrow between. */
function change(b: ChangeBlock): Node {
  const arrow = 52;
  const width = (INNER - arrow - 24) / 2;
  const both = `${b.before.text}${b.after.text}`;
  const { size } = sized(both, [30, 27, 24], (width - 56) * 2, 3);
  const side = (part: { label: string; text: string }, after: boolean) => col({
    width, padding: "22px 28px 24px", borderRadius: 18,
    backgroundColor: after ? "rgba(44,226,232,0.13)" : "rgba(130,147,154,0.13)",
    border: after ? "2px solid rgba(44,226,232,0.42)" : "2px solid rgba(130,147,154,0.10)",
  }, [
    row({ alignItems: "center" }, [
      h("div", after
        ? { width: 14, height: 14, borderRadius: 999, backgroundColor: ACCENT, marginRight: 10 }
        : { width: 14, height: 14, borderRadius: 999, border: `2.5px solid ${GREY}`, marginRight: 10 }),
      text({ fontSize: 22, fontWeight: 700, color: after ? ACCENT : GREY }, clamp(part.label, 12)),
    ]),
    text({ fontSize: size, lineHeight: 1.45, color: after ? WHITE : SOFT, marginTop: 12, fontWeight: after ? 700 : 400 }, fitText(part.text, size, width - 56, 3)),
  ]);
  return row({ alignItems: "center", justifyContent: "space-between" }, [
    side(b.before, false),
    row({ width: arrow, height: arrow, borderRadius: 999, alignItems: "center", justifyContent: "center", border: `2px solid ${HAIR}`, color: ACCENT, fontSize: 28, fontWeight: 700 }, "→"),
    side(b.after, true),
  ]);
}

/**
 * The original's numbers as bars, the one the story is about in the accent (the last of a before and after, the first
 * of groups side by side); what the program worked out beside them, as the story has it.
 */
function compare(b: CompareBlock): Node {
  const group = b.by === "group";
  // Three bars at most: of a before and after the first and the last two, so where it went from and to stays; of
  // groups the first three, the story's own first.
  const items = b.items.length <= 3 ? b.items : group ? b.items.slice(0, 3) : [b.items[0]!, ...b.items.slice(-2)];
  const main = group ? 0 : items.length - 1;
  const max = Math.max(...items.map((i) => i.to ?? i.value));
  const worked = b.change && b.change.amount !== 0 ? b.change : null;
  const barsWidth = worked ? INNER - 340 : INNER;
  const unit = (s: string) => text({ fontSize: 22, color: SOFT, marginLeft: b.unit === "%" ? 2 : 8 }, s);
  // Three bars under a title of two lines fill the card to its footer at full size (seen 10/17), so they are set smaller.
  const tight = items.length === 3;
  const bars = col({ width: barsWidth, gap: tight ? 12 : 26 }, items.map((item, i) => {
    const last = i === main;
    const bar = (value: number) => Math.round((value / max) * barsWidth);
    return col({}, [
      row({ alignItems: "baseline", justifyContent: "space-between", gap: 24 }, [
        text({ flex: 1, fontSize: tight ? 23 : 26, color: last ? WHITE : SOFT, fontWeight: last ? 700 : 400 }, fitText(item.label, tight ? 23 : 26, barsWidth - 260, 1)),
        row({ alignItems: "baseline" }, [
          b.per ? text({ fontSize: 22, color: SOFT, marginRight: 8 }, `每${b.per}`) : null,
          text({ fontSize: tight ? 30 : 34, fontWeight: 700, color: last ? WHITE : INK }, item.to != null ? `${exact(item.value)}–${exact(item.to)}` : exact(item.value)),
          unit(b.unit),
        ].filter(Boolean)),
      ]),
      row({ marginTop: tight ? 6 : 10, height: 16, borderRadius: 999, backgroundColor: TRACK, overflow: "hidden" }, [
        h("div", { width: Math.max(8, bar(item.value)), height: 16, borderRadius: item.to != null ? "999px 0 0 999px" : 999, backgroundColor: last ? ACCENT : "rgba(44,226,232,0.45)" }),
        // A range's top in the same colour, paler.
        item.to != null ? h("div", { width: Math.max(0, bar(item.to) - Math.max(8, bar(item.value))), height: 16, borderRadius: "0 999px 999px 0", backgroundColor: last ? "rgba(44,226,232,0.5)" : "rgba(44,226,232,0.22)" }) : null,
      ].filter(Boolean)),
    ]);
  }));
  if (!worked) return bars;
  // Between two percentages the change is in points (1.1% → 2.3%: 1.2 个百分点), not a percent of a percent. The sign
  // is the plain hyphen: the cards' font has no minus sign (U+2212) the page uses.
  const amount = num(Math.abs(worked.amount));
  const size = Math.min(64, Math.floor(256 / textWidth(amount, 1)));
  return row({ alignItems: "center", justifyContent: "space-between" }, [
    bars,
    col({ width: 300, paddingLeft: 40, borderLeft: `1px solid ${HAIR}`, alignSelf: "stretch", justifyContent: "center" }, [
      text({ fontSize: 22, color: GREY }, "按原文数字计算"),
      text({ fontSize: 26, color: SOFT, marginTop: 8 }, worked.amount > 0 ? "多了" : "少了"),
      text({ fontSize: size, fontWeight: 700, color: WHITE, lineHeight: 1.1, marginTop: 2 }, amount),
      row({ alignItems: "center", marginTop: 10 }, [
        text({ fontSize: 24, color: SOFT, marginRight: 12 }, b.unit === "%" ? "个百分点" : b.unit),
        b.unit !== "%" ? row({ height: 38, padding: "0 14px", alignItems: "center", borderRadius: 999, backgroundColor: "rgba(44,226,232,0.16)", color: ACCENT, fontSize: 24, fontWeight: 700 }, `${worked.amount > 0 ? "+" : "-"}${num(Math.abs(worked.percent))}%`) : null,
      ].filter(Boolean)),
    ]),
  ]);
}

/** A person's words large under a quotation mark in the accent, who said them under a short rule. */
function quote(b: QuoteBlock): Node {
  const { size, text: words } = sized(b.text, [40, 36, 32], INNER - 64, 3);
  return row({}, [
    // The mark sits in the right half of its full-width cell: the cell starts left of the frame's edge so the mark lines up with it.
    text({ width: 96, marginLeft: -48, fontSize: 96, fontWeight: 700, color: "rgba(44,226,232,0.75)", lineHeight: 1, marginTop: -6 }, "“"),
    col({ flex: 1, marginLeft: 16 }, [
      text({ fontSize: size, fontWeight: 700, lineHeight: 1.45, color: WHITE }, words),
      row({ alignItems: "center", marginTop: 18 }, [
        h("div", { width: 28, height: 2, backgroundColor: GREY, marginRight: 14 }),
        text({ fontSize: 24, color: GREY }, fitText(b.who, 24, INNER - 64 - 42, 1)),
      ]),
    ]),
  ]);
}

function figure(f: ShareFigure): Node {
  switch (f.type) {
    case "numbers": return numbers(f);
    case "change": return change(f);
    case "compare": return compare(f);
    case "quote": return quote(f);
  }
}

/** The engine's frame, kicker and footer, with the title over the figure. */
async function tree(card: ShareCard & { figure: ShareFigure }): Promise<Node> {
  const title = sized(card.title, [52, 46, 42], INNER, 2);
  return col({
    width: WIDTH, height: HEIGHT, padding: `56px ${PAD_X}px 44px`, fontFamily: "Noto Sans SC", color: INK, backgroundColor: "#0a1012",
    backgroundImage: "radial-gradient(circle at 88% 8%, rgba(44,226,232,0.28), rgba(10,16,18,0) 46%), radial-gradient(circle at 0% 100%, rgba(23,107,117,0.35), rgba(10,16,18,0) 50%)",
  }, [
    row({ alignItems: "center", justifyContent: "space-between" }, [
      (await brandMark("wordmark-dark.svg", 40)) ?? nameMark(34, INK, ACCENT),
      text({ fontSize: 24, color: GREY }, SITE_HOST),
    ]),
    row({ marginTop: 34, alignItems: "center" }, [
      h("div", { width: 10, height: 10, borderRadius: 999, backgroundColor: ACCENT, marginRight: 14 }),
      text({ fontSize: 26, fontWeight: 700, color: ACCENT, letterSpacing: 1 }, clamp(card.kicker, 30)),
    ]),
    text({ marginTop: 14, fontSize: title.size, fontWeight: 700, lineHeight: 1.28, color: WHITE }, title.text),
    col({ flex: 1, justifyContent: "center", paddingTop: 18, paddingBottom: 18 }, [figure(card.figure)]),
    text({ fontSize: 22, color: GREY, borderTop: `1px solid ${HAIR}`, paddingTop: 18 }, fitText(card.meta, 22, INNER, 1)),
  ]);
}

/** PNG bytes of a story's card, from the disk cache when this exact card was drawn before. */
export async function renderShare(card: ShareCard): Promise<Buffer> {
  const figure = card.figure;
  if (!figure) return (await renderOg({ kicker: card.kicker, title: card.title, subtitle: card.lead, meta: card.meta })).png;
  return renderPng(`reference-${shareEtag(card)}`, { width: WIDTH, height: HEIGHT }, () => tree({ ...card, figure }));
}
