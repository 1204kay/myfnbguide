// The reference pages' parts, in the site's own look (warm white, hairline cards, the accent's short bar,
// big numbers for what matters; red only for a loss or an overrun), after myfnb/samples/v2-busy-no-profit.html,
// and the card kinds of the layout (myfnb/layout-2026-10-05.md A7, J3, J4): story cards, practice cards and rows,
// and situations as compact rows, the same on phones and desktops. Who tells a situation shows as the hot list shows
// who talks about a story: its sources' faces and every count (the owner, 10/6). The frame around them (back links,
// headers, counts, rows' and cards' type) follows the closest AIHOT page (the owner 10/16: modules keep the original).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router";
import { ITEM_COPY, SITE } from "@aihot/site";
import { IconArrowLeft, IconChevronRight } from "@aihot/web/components/icons";
import { StarButton } from "@aihot/web/features/feed/parts";
import { Faces } from "@aihot/web/features/hot/Faces";
import { siteUrl } from "@aihot/web/lib/seo";
import { comparable, day, exact, figureSplit, fullCountText, listCount, listCountText, num, restCountText, tellersText } from "../format.ts";
import type { Block, CaseCard, CompareBlock, Count, ExampleBlock, PartsBlock, PracticeCard, ShopPractices, SituationRow } from "../types.ts";

/**
 * A reference page's column, in the engine's widths: `wide` (the home page) fills the main area as the engine's lists
 * do; else the engine's reading width (--page-max-reading), as its reading pages have it. The situation and story
 * pages lay themselves out in the engine's reading templates instead (components/ui/Page.tsx ReadingLayout, ArticleLayout).
 */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`mx-auto pb-14 ${wide ? "" : "max-w-[var(--page-max-reading)]"}`}>{children}</div>;
}

/** Desktops: one line back up to where the page sits, as the topic page has it (phones have the bar's back). */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link viewTransition to={to} className="hidden items-center gap-1.5 py-2 text-[13px] text-ink-3 transition-colors hover:text-accent lg:inline-flex">
      <IconArrowLeft size={14} /> 返回{label}
    </Link>
  );
}

/**
 * A smaller paragraph's measure: about 44 characters a line at its own size, as the 17px body runs in the 760px
 * column (layout A5); at 13px the full column would run 58. Narrower columns are untouched.
 */
export const MEASURE = "max-w-[44em]";

/** The line over a body, as the item page's 正文 label. */
export const BODY_LABEL = "mb-6 text-[12px] text-ink-4";

/**
 * A page's header, as the topic page has it (AIHOT routes/topic.tsx): a small label in the accent (a link with `to`),
 * the title, a line on what it is, its counts in one line (HANDOFF §2.4), and when it was updated on the right.
 * `asideFacts`: the page's aside shows the counts and the date on desktops, so the header shows them on phones only.
 */
export function PageHeader({ kicker, to, title, dek, counts, updatedAt, asideFacts = false, className = "pb-5 pt-3 lg:pt-1" }: {
  kicker?: string; to?: string; title: ReactNode; dek?: ReactNode; counts?: Array<[number, string]>; updatedAt?: string | null; asideFacts?: boolean; className?: string;
}) {
  const hide = asideFacts ? "lg:hidden" : "";
  const label = "text-[12px] font-semibold tracking-[0.08em] text-accent";
  return (
    <header className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-2 ${className}`}>
      <div className="min-w-0 max-w-[760px]">
        {kicker && (to ? <Link viewTransition to={to} className={`inline-flex items-center hover:text-accent-ink touch:min-h-11 ${label}`}>{kicker}</Link> : <p className={label}>{kicker}</p>)}
        <h1 data-page-title="" className={`${kicker ? "mt-1.5" : ""} text-[24px] font-bold leading-[1.3] tracking-[-0.01em] text-ink lg:text-[26px]`}>{title}</h1>
        {dek && <p className="mt-1.5 text-pretty text-[13.5px] leading-relaxed text-ink-3">{dek}</p>}
        {counts && counts.length > 0 && (
          <p className={`mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-4 ${hide}`}>
            {counts.map(([n, unit]) => <span key={unit}><span className="num font-semibold text-ink-2">{num(n)}</span> {unit}</span>)}
          </p>
        )}
      </div>
      {updatedAt && <p className={`text-[12px] text-ink-4 ${hide}`}><span className="num">{day(updatedAt)}</span> 更新</p>}
    </header>
  );
}

/** A practice card's line under its title (14.5/15px). */
export function Dek({ children, className = "mt-2" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[14.5px] leading-[1.7] text-ink-3 lg:text-[15px] ${className}`}>{children}</p>;
}

/** A section's heading (20/22px); `id` lets a link land on it below the phone bar. */
export function Heading({ children, id }: { children: ReactNode; id?: string }) {
  return <h2 id={id} className="scroll-mt-[calc(var(--bar-h)+8px)] text-[20px] font-extrabold leading-[1.35] text-ink lg:text-[22px]">{children}</h2>;
}

/** What a situation counts in a list, its number at `size` px: "16 家店", "13 条原文" (layout J3-5). */
export function CountFigure({ count, size }: { count: Count; size: number }) {
  const [n, unit] = listCount(count);
  return (
    <span className="whitespace-nowrap text-[13px] text-ink-4">
      <b className="num mr-1 font-bold leading-none tracking-tight text-ink" style={{ fontSize: size }}>{num(n)}</b>{unit}
    </span>
  );
}

/**
 * Who tells a situation and the rest of its count, as the hot list writes who talks about a story ("7 个来源 · 19 位
 * 参与者"): its sources' faces, then "1 位业内人士 · 26 条原文" beside the big number (CountFigure).
 */
export function Who({ s, size = 22 }: { s: SituationRow; size?: number }) {
  const rest = restCountText(s.count);
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {s.faces.length > 0 && <Faces participants={s.faces} total={s.sources} size={size} interactive={false} />}
      {/* Wraps under the faces on a narrow card rather than cutting the count off (reader review 10/9). */}
      {rest && <span className="text-[12.5px] leading-snug text-ink-4">{rest}</span>}
    </span>
  );
}

/** A card's look (layout A7): hairline, the accent on hover, a sunk ground while pressed, the accent's ring for the keyboard. */
export const CARD = "card relative transition-colors hover:border-accent touch:active:bg-bg-sunk has-[.stretch:focus-visible]:outline-2 has-[.stretch:focus-visible]:outline-offset-2 has-[.stretch:focus-visible]:outline-accent";
/** The link that makes a whole card or row clickable; its own other links sit above it. */
export const STRETCH = "stretch after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none";
/** A place in 店家谈得最多的事, as the hot list writes it (AIHOT routes/hot.tsx): 01, its colour by place. */
const RANK_COLOR = ["text-rank-1", "text-rank-2", "text-rank-3"];
export const rankColor = (rank: number) => RANK_COLOR[rank - 1] ?? "text-rank-rest";
export const pad = (rank: number) => String(rank).padStart(2, "0");
/** The place over a card's title: NO.01. */
export function RankTag({ rank }: { rank: number }) {
  return <span className={`mono text-[12px] font-bold tracking-[0.16em] ${rankColor(rank)}`}>NO.{pad(rank)}</span>;
}

/**
 * A story's card, in the feed card's type (AIHOT features/feed/FeedItem.tsx): country, source and month with the
 * bookmark, its title, the item's 收录理由 under a hairline from desktops; then the way to its shop's page.
 */
export function StoryCard({ c }: { c: CaseCard }) {
  return (
    <article className={`${CARD} px-4 pb-3.5 pt-3.5 lg:px-[18px] lg:pb-[14px] lg:pt-[15px]`}>
      <div className="flex min-h-[22px] items-center gap-1.5 text-[12.5px] leading-[18px] text-ink-4 lg:min-h-[18px]">
        <span className="min-w-0 flex-1">{c.src}</span>
        <span className="-my-[11px] -mr-3 inline-flex lg:-my-1 lg:mr-0"><StarButton item={c.item} className="size-11 lg:size-[26px]" /></span>
      </div>
      <h3 className="mt-1.5 text-[17px] font-[650] leading-[1.5] text-ink lg:mt-2 lg:leading-[1.55]">
        <Link viewTransition to={`/reference/cases/${c.id}`} className={STRETCH}>{c.title}</Link>
      </h3>
      {c.reason && (
        <div className="mt-1 lg:mt-3 lg:border-t lg:border-line-soft lg:pt-3">
          <p className="line-clamp-2 text-[13px] leading-[1.65] text-note lg:leading-[1.75]">{ITEM_COPY.reasonLabel}：{c.reason}</p>
        </div>
      )}
      {c.shop && (
        <Link viewTransition to={`/reference/shops/${c.shop.key}`} className="relative z-10 -mb-2 mt-0.5 flex min-h-11 items-center text-[13px] text-accent hover:text-accent-ink">
          这家店另有 {c.shop.others} 条原文 ›
        </Link>
      )}
    </article>
  );
}

export function StoryCards({ cards }: { cards: CaseCard[] }) {
  return <div className="mt-3 grid gap-2.5">{cards.map((c) => <StoryCard key={c.id} c={c} />)}</div>;
}

/**
 * Opens the rest of a list in place by a button that then goes: the keyboard goes on from `first`, the first link
 * it opened, not from the page's top.
 */
export function openRest(open: () => void, first: () => HTMLElement | null | undefined) {
  flushSync(open);
  first()?.focus();
}

/** How many shops a practice card lists before 展开其余 N 家. */
const LINES_SHOWN = 4;

/**
 * A practice two shops or more tell (layout A7-3, J4-2): who tells it, what to do, how the shops did it, and a line
 * a shop leading to its newest story in it. The first card of a cause may carry its part of the situation's picture
 * (`figure`), beside the text from 961px; where that picture has no such part, the text keeps the card's width.
 */
export function Practice({ p, figure }: { p: PracticeCard; figure?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const lines = open ? p.lines : p.lines.slice(0, LINES_SHOWN);
  return (
    <article id={p.key} className="card scroll-mt-[calc(var(--bar-h)+8px)] px-4 pb-1 pt-3.5 sm:px-5 lg:pt-[18px]">
      <div className="lg:flex lg:gap-6">
        {figure && <div className="mx-auto mb-3 max-w-[360px] empty:hidden [&_svg]:max-h-[220px] lg:order-2 lg:mb-0 lg:w-[280px] lg:shrink-0">{figure}</div>}
        <div className="min-w-0 lg:flex-1">
          <p className="text-[13px] text-ink-4">{tellersText(p.count)}</p>
          <h3 className="mt-1.5 text-[16px] font-[650] leading-[1.5] text-ink sm:text-[17px]">{p.title}</h3>
          <Dek className="mt-1.5">{p.summary}</Dek>
        </div>
      </div>
      <ul ref={list} className="mt-3 border-t border-line">
        {lines.map((l) => (
          <li key={l.caseId} className="border-t border-line-soft first:border-t-0">
            <Link viewTransition to={`/reference/cases/${l.caseId}`} className="-mx-1 flex min-h-[52px] items-center gap-2 rounded-tile px-1 py-2 transition-colors hover:text-accent touch:active:bg-bg-sunk lg:min-h-11">
              <span className="min-w-0 flex-1 leading-[1.5]">
                <span className="block text-[13px] text-ink-4 lg:inline">{l.country} · {l.name}<span className="hidden lg:inline"> · </span></span>
                <span className="block text-[14px] text-ink-2 lg:inline">{l.line}{l.cases > 1 && <span className="text-ink-4"> · 共 {l.cases} 篇</span>}</span>
              </span>
              <IconChevronRight size={16} />
            </Link>
          </li>
        ))}
      </ul>
      {!open && p.lines.length > LINES_SHOWN && (
        <button type="button" onClick={() => openRest(() => setOpen(true), () => list.current?.querySelectorAll<HTMLElement>("a")[LINES_SHOWN])} className="flex h-11 w-full items-center justify-center border-t border-line-soft text-[14px] text-accent">
          展开其余 {p.lines.length - LINES_SHOWN} 家
        </button>
      )}
    </article>
  );
}

/**
 * One practice a shop tells alone, its whole row leading to the story: who (when the row names it), the title, the
 * shop's line and how many of its stories tell it, as a card's line does. The keyboard's ring is inside the row: the
 * card clips what is outside.
 */
function PracticeRow({ p, who }: { p: ShopPractices["practices"][number]; who?: string }) {
  return (
    <Link id={p.key} viewTransition to={`/reference/cases/${p.caseId}`}
      className={`flex min-h-[52px] scroll-mt-[calc(var(--bar-h)+8px)] items-center gap-2 px-4 transition-colors hover:bg-bg-sunk/40 focus-visible:-outline-offset-2 touch:active:bg-bg-sunk sm:px-5 ${who ? "py-3" : "py-2.5"}`}>
      <span className="min-w-0 flex-1">
        {who && <span className="block text-[13px] leading-[1.5] text-ink-4">{who}</span>}
        <b className="block text-[16px] font-[650] leading-[1.5] text-ink sm:text-[17px]">{p.title}</b>
        {(p.line || p.cases > 1) && (
          <span className="mt-0.5 block text-[14px] leading-[1.6] text-ink-3">
            {p.line}{p.cases > 1 && <span className="text-ink-4">{p.line ? " · " : ""}共 {p.cases} 篇</span>}
          </span>
        )}
      </span>
      <IconChevronRight size={16} />
    </Link>
  );
}

/**
 * The practices one shop tells alone (layout J4-3, J4-4), rows in one card with a hairline between them: no summary
 * and no count. A shop with several has them under one line naming it, "日本 · 京都一家小酒馆 · 2 种做法".
 * `figure` is its cause's part of the picture, on top, where no practice card above carries it.
 */
export function ShopRows({ shops, figure, className }: { shops: ShopPractices[]; figure?: ReactNode; className: string }) {
  if (!shops.length) return null;
  return (
    <div className={`card overflow-hidden ${className}`}>
      {figure && <div className="mx-auto max-w-[360px] px-4 pt-4 empty:hidden [&_svg]:max-h-[220px]">{figure}</div>}
      <ul className="divide-y divide-line">
        {shops.map((shop) => {
          const who = `${shop.country} · ${shop.name}`;
          return shop.practices.length === 1 ? (
            <li key={shop.practices[0]!.key}><PracticeRow p={shop.practices[0]!} who={who} /></li>
          ) : (
            <li key={shop.practices[0]!.key}>
              <p className="px-4 pt-3 text-[13px] leading-[1.5] text-ink-4 sm:px-5">{who} · {shop.practices.length} 种做法</p>
              <ul className="divide-y divide-line-soft">{shop.practices.map((p) => <li key={p.key}><PracticeRow p={p} /></li>)}</ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A row's columns: its place when ranked, the text, what it counts from 641px (one width, so the rows line up), ›. */
const COLUMNS = {
  ranked: "grid-cols-[30px_minmax(0,1fr)_16px] sm:grid-cols-[30px_minmax(0,1fr)_auto_16px] lg:grid-cols-[44px_minmax(0,1fr)_auto_16px]",
  plain: "grid-cols-[minmax(0,1fr)_16px] sm:grid-cols-[minmax(0,1fr)_auto_16px]",
};

/**
 * Situations as compact rows in one card (layout J3-3, J3-4): the place when ranked (from `from`), the title with
 * 代表做法 under it (the situation's line before its stories are grouped), what it counts, ›; on phones the count
 * goes under the text. `category` names each row's category over its title (a search). `children` close the card.
 * Ranked, the list is numbered from `from`, so a screen reader reads the places shown; the keyboard's ring is inside
 * a row, as the card clips what is outside.
 */
export function SituationRows({ rows, from, category = false, children }: { rows: SituationRow[]; from?: number; category?: boolean; children?: ReactNode }) {
  const List = from === undefined ? "ul" : "ol";
  return (
    <div className="card mt-3 overflow-hidden">
      <List start={from} className="divide-y divide-line-soft">
        {rows.map((s, i) => (
          <li key={s.slug} className={`relative grid items-center gap-x-3 px-4 py-3 transition-colors hover:bg-bg-sunk/70 touch:active:bg-bg-sunk has-[.stretch:focus-visible]:bg-bg-sunk has-[.stretch:focus-visible]:outline-2 has-[.stretch:focus-visible]:-outline-offset-2 has-[.stretch:focus-visible]:outline-accent sm:px-5 lg:px-6 lg:py-3.5 ${from === undefined ? COLUMNS.plain : COLUMNS.ranked}`}>
            {from !== undefined && <span className={`mono self-start text-[16px] font-semibold leading-[24px] lg:text-[17px] ${rankColor(from + i)}`} aria-label={`第 ${from + i} 位`}>{pad(from + i)}</span>}
            <div className="min-w-0">
              {category && <span className="block text-[13px] leading-[1.5] text-ink-4">{s.category}</span>}
              {/* The hot list's row type (AIHOT routes/hot.tsx Row): 15px title, a 13px line under it. */}
              <h3 className="text-[15px] font-[650] leading-[1.55] text-ink">
                <Link viewTransition to={`/reference/${s.slug}`} className={STRETCH}>{s.title}</Link>
              </h3>
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-[1.65] text-ink-4 lg:line-clamp-1">{s.practice ?? s.dek}</p>
              <span className="mt-1 block text-[13px] text-ink-4 sm:hidden">{fullCountText(s.count)}</span>
            </div>
            {/* As the hot list's rows: who tells it, then its shops in a big number with the rest of its count under it. */}
            <span className="hidden items-center gap-5 sm:flex">
              {s.faces.length > 0 && <Faces participants={s.faces} total={s.sources} size={22} interactive={false} />}
              <span className="min-w-[96px] text-right">
                <CountFigure count={s.count} size={19} />
                {restCountText(s.count) && <span className="mt-0.5 block whitespace-nowrap text-[12px] text-ink-4">{restCountText(s.count)}</span>}
              </span>
            </span>
            <IconChevronRight size={16} className="text-ink-4" />
          </li>
        ))}
      </List>
      {children}
    </div>
  );
}

/**
 * A story's way back into the library at its end on phones, as the item page lists 相关事件 (AIHOT routes/item.tsx):
 * a small heading, then the row; `count` under the title.
 */
export function WhereFiled({ to, title, count }: { to: string; title: string; count: string | null }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-[14px] font-semibold text-ink">收在 {SITE.name} 参考</h2>
      <Link viewTransition to={to} className="block border-y border-line-soft py-2.5 text-[14px] text-ink-2 hover:text-accent">
        {title}
        {count && <span className="mt-0.5 block text-[13px] text-accent">{count} ›</span>}
      </Link>
    </section>
  );
}

/**
 * Shares a page: the system's sheet where there is one (touch screens), else its address is copied; and copies a
 * link (the item page's 复制链接). Both say 链接已复制, as the item page does.
 */
export function useShare(): { share: (title: string, path: string) => Promise<void>; copy: (url: string) => Promise<void>; toast: ReactNode } {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => setText(null), 1600);
    return () => clearTimeout(t);
  }, [text]);
  const share = async (title: string, path: string) => {
    const url = `${siteUrl()}${path}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) return void (await navigator.share({ title, url }));
      await navigator.clipboard.writeText(`${title}\n${url}`);
      setText("链接已复制");
    } catch {
      // The reader closed the sheet, or the clipboard is not allowed here.
    }
  };
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setText("链接已复制");
    } catch {
      // clipboard unavailable
    }
  };
  const toast = text && (
    <div role="status" className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[13px] text-bg shadow-[var(--shadow-pop)] lg:bottom-8">
      {text}
    </div>
  );
  return { share, copy, toast };
}

/** A button of a page's own row on desktops (分享, 收藏, 打开原文): 36px, 44px on touch screens. */
export const ROW_BUTTON = "inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-[14px] text-ink-2 transition-colors hover:border-accent hover:text-accent touch:h-11";

/** What kind a picture is, as a small tag before its caption: 原文数据 and 示意 in the accent, 举例 (made-up numbers) quieter. */
export function KindTag({ kind }: { kind: "原文数据" | "举例" | "示意" }) {
  return (
    <span className={`mr-2 inline-flex h-5 items-center rounded-full px-2 align-[1px] text-[12px] font-semibold leading-none ${kind === "举例" ? "bg-ink-4/12 text-ink-3" : "bg-accent-soft text-accent"}`}>{kind}</span>
  );
}

/**
 * A picture in its card, then what kind it is and what it says under a hairline ("举例 · …"), then `after`. Every
 * figure of the library sits in this one frame: the same padding, the same caption, the same tag, and the width of the
 * text it stands in (a narrower card centred under the text read as a size mistake, 用户 10/16: 大小是不是不符合).
 */
export function Figure({ children, caption, kind, after }: { children: ReactNode; caption?: string | null; kind?: "原文数据" | "举例" | "示意"; after?: ReactNode }) {
  return (
    <div className="card mt-4 px-4 pb-3.5 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
      {children}
      {(caption || kind) && (
        <p className="mt-4 border-t border-line-soft pt-3 text-[13px] leading-[1.65] text-ink-4 sm:text-[13.5px]">
          {kind && <KindTag kind={kind} />}
          {caption}
        </p>
      )}
      {after}
    </div>
  );
}

/**
 * Shades for the parts of a bar, the quiet ones first: neutral greys for what is not the point, so the one part in
 * the accent (or red for a loss) is what the eye finds. Shares of the theme's own ink, so both themes work.
 */
export const TONES = ["bg-ink-4/55", "bg-ink-4/35", "bg-ink-4/22", "bg-ink-4/13", "bg-line-strong"];
/** Shades of the accent for the parts of one whole (原文数据 parts): one colour, so none reads as a warning. */
const RAMP = ["bg-accent", "bg-accent/65", "bg-accent/40", "bg-accent/22", "bg-ink-4/30", "bg-ink-4/16"];
/** A bar's empty track: visible on both themes' cards (bg-sunk is not, on the dark one). */
const TRACK = "bg-ink-4/10";

const tone = (t: "accent" | "loss" | number) => t === "accent" ? "bg-accent text-accent-contrast" : t === "loss" ? "bg-hot text-white" : `${TONES[t % TONES.length]} text-ink-2`;

/**
 * One horizontal bar split into parts; widths are shares of the whole (0–1), what is left of it the empty track.
 * Each part ends in a hairline of the card's colour, so neighbours stay apart without moving any edge. Its labels are
 * page text, not a picture's (it is drawn in HTML and does not scale), so they keep the site's smallest size, 12px
 * (layout A6).
 */
export function Fill({ parts }: { parts: Array<{ label: string; share: number; tone: "accent" | "loss" | number }> }) {
  return (
    <div className={`flex h-7 overflow-hidden rounded-control ${TRACK} text-[12px] font-semibold`}>
      {parts.filter((p) => p.share > 0).map((p, i) => (
        <div key={i} style={{ width: `${Math.min(p.share, 1) * 100}%` }}
          className={`flex items-center overflow-hidden whitespace-nowrap px-1.5 shadow-[inset_-2px_0_0_var(--surface)] last:shadow-none ${tone(p.tone)}`}>
          {p.label}
        </div>
      ))}
    </div>
  );
}

/** A label with its value at the right, over a thin bar of `share` (compare, list-total, percent-over). */
function BarRow({ label, value, share, className, strong }: { label: ReactNode; value: ReactNode; share: number; className: string; strong?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[14px] leading-[1.45] sm:text-[15px]">
        <span className={`min-w-0 ${strong ? "font-semibold text-ink" : "text-ink-3"}`}>{label}</span>
        <span className={`num shrink-0 text-right ${strong ? "font-bold text-ink" : "font-semibold text-ink-2"}`}>{value}</span>
      </div>
      <div className={`mt-2 h-3 overflow-hidden rounded-full ${TRACK}`}>
        <div className={`h-full min-w-1 rounded-full ${className}`} style={{ width: `${Math.min(Math.max(share, 0), 1) * 100}%` }} />
      </div>
    </div>
  );
}

/** What the program worked out from the original's numbers, under the bars: what it is in small grey, then the line. */
function Worked({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-[12.5px] leading-[1.5] text-ink-4 sm:text-[13px]">按原文数字计算</p>
      <p className="mt-0.5 text-[15px] leading-[1.7] text-ink-2 sm:text-[16px]">{children}</p>
    </div>
  );
}

/** A number of a worked line: bigger and in ink, so the line reads at a glance. */
const Big = ({ children, className = "text-ink" }: { children: ReactNode; className?: string }) => <b className={`num text-[20px] font-bold sm:text-[22px] ${className}`}>{children}</b>;

function Compare({ b }: { b: CompareBlock }) {
  const max = Math.max(...b.items.map((i) => i.value));
  const per = b.per ? `每${b.per} ` : "";
  return (
    <Figure kind="原文数据" caption={b.caption}>
      <div className="grid gap-4">
        {b.items.map((item, i) => {
          const last = i === b.items.length - 1;
          return <BarRow key={i} label={item.label} strong={last} share={item.value / max} className={last ? "bg-accent" : "bg-accent/45"}
            value={<>{per && <span className="mr-1 text-[13px] font-normal text-ink-3">{per.trim()}</span>}{exact(item.value)}<span className={`${b.unit === "%" ? "" : "ml-1"} text-[13px] font-normal text-ink-3`}>{b.unit}</span></>} />;
        })}
      </div>
      {b.change && b.change.amount !== 0 && (
        <Worked>
          {/* Between two percentages the change is in points (1.1% → 2.3%: 1.2 个百分点), not a percent of a percent. */}
          {b.change.amount > 0 ? "多了" : "少了"} <Big>{num(Math.abs(b.change.amount))}</Big>{" "}
          <span className="whitespace-nowrap">
            {b.unit === "%" ? "个百分点" : b.unit}
            {b.unit !== "%" && <span className="num ml-1.5 inline-flex h-6 items-center rounded-full bg-accent-soft px-2 align-[2px] text-[13px] font-bold text-accent">{b.change.amount > 0 ? "+" : "−"}{num(Math.abs(b.change.percent))}%</span>}
          </span>
          {b.change.yearly !== null && <>，<span className="whitespace-nowrap">按一年算 <Big>{num(Math.abs(b.change.yearly))}</Big> {b.unit}</span></>}
        </Worked>
      )}
    </Figure>
  );
}

/**
 * Under a bar of parts, what each colour is and its number: the labels never have to fit inside the parts. Two
 * columns from 641px, so a number stays near its label in the wide column.
 */
function Legend({ rows }: { rows: Array<{ label: string; value: ReactNode; tone: string }> }) {
  return (
    <ul className="mt-3 grid gap-x-8 gap-y-1.5 text-[14px] leading-[1.5] sm:grid-cols-2 sm:text-[15px]">
      {rows.map((r, i) => (
        <li key={i} className="flex items-baseline gap-2">
          <i className={`size-3 shrink-0 translate-y-[1px] rounded-[3px] ${r.tone}`} />
          <span className="min-w-0 flex-1 text-ink-3">{r.label}</span>
          <span className="num shrink-0 font-semibold text-ink-2">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** A bar of parts with hairlines between them, no words inside; `tones` per part; `mark` a red line at a share (where the money ran out). */
function Stack({ parts, mark }: { parts: Array<{ share: number; tone: string }>; mark?: number }) {
  return (
    <div className="relative">
      <div className={`flex h-4 overflow-hidden rounded-full ${TRACK}`}>
        {parts.filter((p) => p.share > 0).map((p, i) => (
          <i key={i} className={`h-full shadow-[inset_-2px_0_0_var(--surface)] last:shadow-none ${p.tone}`} style={{ width: `${Math.min(p.share, 1) * 100}%` }} />
        ))}
      </div>
      {mark !== undefined && <i aria-hidden="true" className="absolute -bottom-1 -top-1 w-[2px] -translate-x-1/2 rounded-full bg-hot" style={{ left: `${mark * 100}%` }} />}
    </div>
  );
}

/** Units of money (元, 万元, 卢比, 美元…): only parts in money set against an income are 支出 with a 剩 or 亏. */
const MONEY = /元|币|卢比|镑|令吉|铢|比索|卢布|里拉|兰特|法郎|盾|美分|欧|克朗|里亚尔|迪拉姆|[$€£¥]/u;

/**
 * Parts of a whole. Three cases, by what the writer set them against (prompts: against is written only when the parts
 * are the whole of it): parts that add up to it exactly are a breakdown of it (门店总数 = 原有 + 新城市), one bar under
 * its name and nothing worked out; parts in money against an income are 支出, with what is left or lost; with nothing
 * against them, one bar and their total. The bar is titled with what the parts make up as the writer names it
 * (`whole`: 一个蛋挞的出厂成本); a block written before there was one says 合计 (支出 against an income).
 */
function Parts({ b }: { b: PartsBlock }) {
  const whole = Math.max(b.total, b.against?.value ?? 0);
  const name = b.whole?.trim() || null;
  const breakdown = b.against !== null && b.gap === 0;
  const spending = b.against !== null && !breakdown && MONEY.test(b.unit);
  const value = (n: number) => <>{num(n)}<span className="ml-1 text-[13px] font-normal text-ink-3">{b.unit}</span></>;
  const head = (label: string, v?: ReactNode) => (
    <div className="mb-2 flex items-baseline justify-between gap-3 text-[14px] sm:text-[15px]"><span className="font-semibold text-ink-2">{label}</span>{v !== undefined && <span className="num font-bold text-ink">{v}</span>}</div>
  );
  const stack = <Stack parts={b.items.map((i, n) => ({ share: i.value / whole, tone: RAMP[n % RAMP.length]! }))} mark={spending && b.gap! < 0 ? b.against!.value / whole : undefined} />;
  return (
    <Figure kind="原文数据" caption={b.caption}>
      {breakdown ? (
        <div>{head(b.against!.label, value(b.against!.value))}{stack}</div>
      ) : b.against ? (
        <div className="grid gap-4">
          <div>
            {head(b.against.label, value(b.against.value))}
            <div className={`h-4 overflow-hidden rounded-full ${TRACK}`}><div className="h-full rounded-full bg-accent/45" style={{ width: `${(b.against.value / whole) * 100}%` }} /></div>
          </div>
          <div>{head(name ?? (spending ? "支出" : "合计"))}{stack}</div>
        </div>
      ) : (
        <div>{head(name ?? "合计", value(b.total))}{stack}</div>
      )}
      <Legend rows={b.items.map((i, n) => ({ label: i.label, value: num(i.value), tone: RAMP[n % RAMP.length]! }))} />
      {/* A breakdown adds up to its whole, and parts with nothing against them have their total over the bar: nothing to work out. */}
      {b.against && !breakdown && (
        <Worked>
          {name ?? "合计"} {num(b.total)} {b.unit}
          {spending && (b.gap! < 0
            ? <>，亏 <Big className="text-hot">{num(-b.gap!)}</Big> {b.unit}</>
            : <>，剩 <Big className="text-accent">{num(b.gap!)}</Big> {b.unit}</>)}
        </Worked>
      )}
    </Figure>
  );
}

function Example({ b }: { b: ExampleBlock }) {
  const rowsKind = b.kind === "list-total" || b.kind === "percent-over";
  const bar = !rowsKind && b.rows.some((r) => r.share !== null);
  // What is left (剩下, 毛利) is the point, in the accent, or red when it is a loss; what is taken off stays grey.
  const shade = (r: ExampleBlock["rows"][number], i: number) => r.label === "剩下" || r.label === "毛利" ? (r.value < 0 ? "bg-hot" : "bg-accent") : TONES[i % TONES.length]!;
  const max = Math.max(...b.rows.map((r) => r.share ?? 0), 1e-9);
  return (
    <Figure kind="举例" caption={b.caption}>
      {bar && (
        <>
          <Stack parts={b.rows.map((r, i) => ({ share: r.share ?? 0, tone: shade(r, i) }))} />
          <Legend rows={b.rows.map((r, i) => ({ label: r.label, tone: shade(r, i), value: <span className={r.value < 0 ? "text-hot" : ""}>{num(r.value)}<span className="ml-0.5 font-normal text-ink-4">{r.unit}</span></span> }))} />
        </>
      )}
      {rowsKind && (
        <div className="grid gap-4">
          {b.rows.map((r) => (
            <BarRow key={r.label} label={<span className={r.flag ? "text-hot" : ""}>{r.label}</span>} share={b.kind === "percent-over" ? r.share ?? 0 : (r.share ?? 0) / max}
              className={r.flag ? "bg-hot" : "bg-accent/45"} value={<span className={r.flag ? "text-hot" : ""}>{num(r.value)}{r.unit === "%" ? "%" : ""}</span>} />
          ))}
          {/* The red rows are the ones the result calls 标出的几项; the key under them says which colour is which. */}
          {b.kind === "list-total" && b.rows.some((r) => r.flag) && (
            <p className="-mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-ink-3 sm:text-[14px]">
              <span className="flex items-center gap-2"><i className="h-3 w-5 rounded-full bg-hot" />标出的几项</span>
              <span className="flex items-center gap-2"><i className="h-3 w-5 rounded-full bg-accent/45" />其余几项</span>
            </p>
          )}
        </div>
      )}
      {b.equation && <p className={`num well rounded-control ${bar || rowsKind ? "mt-4" : ""} px-3 py-2.5 text-center text-[15px] font-semibold text-ink-2 sm:text-[16px]`}>{b.equation}</p>}
      <p className={`text-[15.5px] font-bold leading-[1.6] text-ink sm:text-[16.5px] ${bar || rowsKind || b.equation ? "mt-3.5" : ""}`}>{b.result}</p>
    </Figure>
  );
}

/** A figure as the original writes it, the number at `size` and the words around it at `small`. */
function FigureValue({ value, size, small = "text-[14px] sm:text-[15px]" }: { value: string; size: string; small?: string }) {
  const [before, n, after] = figureSplit(value);
  return (
    <span className="num">
      {before && <span className={`mr-1 font-semibold text-ink-3 ${small}`}>{before}</span>}
      <span className={`${size} font-extrabold tracking-[-0.025em] text-ink`}>{n}</span>
      {after && <span className={`ml-1 font-semibold text-ink-3 ${small}`}>{after}</span>}
    </span>
  );
}

/** Body text (16/17px, 1.85). */
export const BODY = "text-[16px] leading-[1.85] text-ink-2 lg:text-[17px]";

export function StoryBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "text": return <p className={`mt-3 ${BODY}`}>{block.text}</p>;
    // A point with its lead on a line of its own, so a phone reader can run down the leads.
    case "list": return (
      <ul className={`mt-3.5 grid gap-3 ${BODY}`}>
        {block.items.map((i, n) => (
          <li key={n} className="relative pl-5 before:absolute before:left-0.5 before:top-[0.72em] before:size-[7px] before:rounded-full before:bg-accent">
            {i.lead && <b className="block font-semibold text-ink">{i.lead}</b>}{i.text}
          </li>
        ))}
      </ul>
    );
    // Steps one under another, numbered, joined by a line: read in order on a phone as on a desktop.
    case "flow": return (
      <ol className="card mt-4 grid px-4 py-4 sm:px-6 sm:py-5">
        {block.steps.map((s, n) => (
          <li key={n} className="relative flex gap-3.5 pb-4 last:pb-0">
            {n < block.steps.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-[2px] rounded-full bg-accent/25" />}
            <span className="num relative flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-contrast">{n + 1}</span>
            <span className="min-w-0 pt-[3px] text-[15px] leading-[1.65] text-ink-2 [text-wrap:pretty] sm:text-[16px]">{s}</span>
          </li>
        ))}
      </ol>
    );
    // The words large under a quotation mark in the accent, who said them under a short rule.
    case "quote": return (
      <blockquote className="relative mt-5 pl-8 sm:pl-9">
        <span aria-hidden="true" className="absolute -top-1.5 left-0 font-serif text-[44px] font-bold leading-none text-accent/70">“</span>
        <p className="text-[17px] font-semibold leading-[1.7] text-ink lg:text-[18px]">{block.text}</p>
        <footer className="mt-2 flex gap-2 text-[13px] leading-[1.6] text-ink-4"><span aria-hidden="true" className="mt-[0.8em] h-px w-4 shrink-0 bg-ink-4/60" />{block.who}</footer>
      </blockquote>
    );
    case "compare": return <Compare b={block} />;
    case "parts": return <Parts b={block} />;
    case "example": return <Example b={block} />;
    // The original's key figures, each with what it counts, under the one sentence saying what they show. Three looks:
    // one figure large with what it is beside it; figures in one unit in a row between hairlines; figures in different
    // units in a plain list, what each is beside its number.
    case "numbers": {
      const one = block.items.length === 1;
      const short = block.items.every((i) => figureSplit(i.value).join("").length <= 6);
      return (
        <Figure kind="原文数据" caption={block.caption}>
          {block.point ? <p className="mb-4 text-[16px] font-bold leading-[1.55] text-ink sm:text-[17px]">{block.point}</p> : null}
          {one ? (
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
              <div className="leading-none">
                <FigureValue value={block.items[0]!.value} size="text-[48px] sm:text-[60px]" small="text-[17px] sm:text-[19px]" />
                <span aria-hidden="true" className="mt-3 block h-[3px] w-10 rounded-full bg-accent" />
              </div>
              <div className="min-w-[11em] flex-1 text-[16px] font-medium leading-[1.6] text-ink-2 sm:border-l sm:border-line sm:py-1 sm:pl-7 sm:text-[17px]">{block.items[0]!.label}</div>
            </div>
          ) : comparable(block.items.map((i) => i.value)) ? (
            // In one row the figures are divided by hairlines; three long ones go one under another on a phone.
            <div className={`grid gap-y-5 ${block.items.length === 2 || short ? `${block.items.length === 2 ? "grid-cols-2" : "grid-cols-3"} [&>*+*]:border-l [&>*+*]:border-line [&>*+*]:pl-4 sm:[&>*+*]:pl-6 [&>*]:pr-2` : "sm:grid-cols-3 sm:[&>*+*]:border-l sm:[&>*+*]:border-line sm:[&>*+*]:pl-6"}`}>
              {block.items.map((i, n) => (
                <div key={n} className="min-w-0">
                  <div className="leading-none"><FigureValue value={i.value} size={block.items.length === 3 && short ? "text-[32px] sm:text-[40px]" : "text-[36px] sm:text-[42px]"} /></div>
                  <span aria-hidden="true" className="mt-2.5 block h-[2px] w-7 rounded-full bg-accent" />
                  <div className="mt-2.5 text-[14px] leading-[1.5] text-ink-3 sm:text-[15px]">{i.label}</div>
                </div>
              ))}
            </div>
          ) : (
            // Figures in different units: a plain list, what each is beside its number, none set up as the others' equal
            // (the tinted strips tried in round four doubled the height on a phone and are not in the original).
            <dl className="divide-y divide-line-soft">
              {block.items.map((i, n) => (
                <div key={n} className="flex items-baseline justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                  <dt className="min-w-0 text-[14.5px] leading-[1.55] text-ink-2 sm:text-[15.5px]">{i.label}</dt>
                  <dd className="shrink-0 text-right leading-none"><FigureValue value={i.value} size="text-[26px] sm:text-[30px]" /></dd>
                </div>
              ))}
            </dl>
          )}
        </Figure>
      );
    }
    // Before and after side by side (one under the other on a phone), the after in the accent, an arrow between.
    case "change": return (
      <Figure caption={block.caption}>
        <div className="grid items-stretch gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="rounded-tile bg-ink-4/[0.07] px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-4"><i className="size-2 rounded-full border-[1.5px] border-ink-4" />{block.before.label}</div>
            <p className="mt-1.5 text-[15px] leading-[1.65] text-ink-3">{block.before.text}</p>
          </div>
          <span aria-hidden="true" className="flex size-7 items-center justify-center self-center justify-self-center relative z-10 rounded-full bg-surface text-[15px] text-accent ring-1 ring-line-strong max-sm:-my-[19px] max-sm:rotate-90">→</span>
          <div className="rounded-tile bg-accent-soft px-3.5 py-3 ring-1 ring-inset ring-accent/25">
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-accent"><i className="size-2 rounded-full bg-accent" />{block.after.label}</div>
            <p className="mt-1.5 text-[15px] leading-[1.65] text-ink">{block.after.text}</p>
          </div>
        </div>
      </Figure>
    );
  }
}
