// The reference pages' parts, in the site's own look (warm white, hairline cards, the accent's short bar,
// big numbers for what matters; red only for a loss or an overrun), after myfnb/samples/v2-busy-no-profit.html (removed 11-03; in commit c29b520),
// and the card kinds of the layout (myfnb/layout-2026-10-05.md A7, J3, J4): item cards and situations as compact
// rows, the same on phones and desktops. Who tells a situation shows as the hot list shows who talks about a story:
// its sources' faces and every count (the owner, 10/6). The frame around them (back links, headers, counts, rows' and
// cards' type) follows the closest AIHOT page (the owner 10/16: modules keep the original).
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ITEM_COPY, reasonLines, SITE } from "@aihot/site";
import { IconArrowLeft, IconChevronDown } from "@aihot/web/components/icons";
import { Badge } from "@aihot/web/components/ui/Badge";
import { Collapse } from "@aihot/web/components/ui/Presence";
import { StarButton } from "@aihot/web/features/feed/parts";
import { Faces } from "@aihot/web/features/hot/Faces";
import { copyText } from "@aihot/web/lib/clipboard";
import { siteUrl } from "@aihot/web/lib/seo";
import { day, listCount, num, restCountText } from "../format.ts";
import type { CaseCard, Count, SituationRow } from "../types.ts";

/**
 * A reference page's column, in the engine's widths: `wide` (the home page) fills the main area as the engine's lists
 * do; else the engine's reading width (--page-max-reading), as its reading pages have it. The situation and 十一说
 * pages lay themselves out in the engine's reading templates instead (components/ui/Page.tsx ReadingLayout, ArticleLayout).
 */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`mx-auto pb-10 ${wide ? "" : "max-w-[var(--page-max-reading)]"}`}>{children}</div>;
}

/** Desktops: one line back up to where the page sits, as the topic page has it (phones have the bar's back). */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link viewTransition to={to} className="hidden items-center gap-1.5 py-2 text-[13px] text-ink-3 transition-colors hover:text-accent lg:inline-flex">
      <IconArrowLeft size={14} /> 返回{label}
    </Link>
  );
}

/** The line over a body, as the item page's 正文 label. */
export const BODY_LABEL = "mb-6 text-[12px] text-ink-4";

/**
 * A page's header, as the topic page has it (AIHOT routes/topic.tsx): a small label in the accent, the title, a line
 * on what it is, its counts in one line (HANDOFF §2.4), and when it was updated on the right.
 * `asideFacts`: the page's aside shows the counts and the date from `side` (1176px, where ReadingLayout puts the aside
 * beside the page), so the header shows them below that.
 */
export function PageHeader({ kicker, title, dek, counts, updatedAt, asideFacts = false, className = "pb-5 pt-3 lg:pt-1" }: {
  kicker?: string; title: ReactNode; dek?: ReactNode; counts?: Array<[number, string]>; updatedAt?: string | null; asideFacts?: boolean; className?: string;
}) {
  const hide = asideFacts ? "side:hidden" : "";
  return (
    <header className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-2 ${className}`}>
      <div className="min-w-0 max-w-[760px]">
        {kicker && <p className="text-[12px] font-semibold tracking-[0.08em] text-accent">{kicker}</p>}
        <h1 data-page-title="" className={`${kicker ? "mt-1.5" : ""} text-[24px] font-bold leading-[1.3] tracking-[-0.01em] text-ink lg:text-[26px]`}>{title}</h1>
        {dek && <p className="mt-1.5 text-pretty text-[13.5px] leading-relaxed text-ink-3">{dek}</p>}
        {counts && counts.length > 0 && (
          <p className={`mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-4 ${hide}`}>
            {counts.map(([n, unit]) => <span key={unit}><span className="num font-semibold text-ink-2">{num(n)}</span> {unit}</span>)}
          </p>
        )}
      </div>
      {updatedAt && <p className={`text-[12px] text-ink-4 ${hide}`}><time dateTime={updatedAt} className="num">{day(updatedAt)}</time> 更新</p>}
    </header>
  );
}

/**
 * What a situation counts in a list, where the hot list has its 热度指数 (AIHOT routes/hot.tsx): the number in the
 * hot list's figure type at `size` px (34 on the first card, 24 on the next two, 20 in a row), what it counts under it.
 */
export function CountFigure({ count, size }: { count: Count; size: 34 | 24 | 20 }) {
  const [n, unit] = listCount(count);
  return (
    <span className="flex flex-col items-end gap-1 text-right">
      <span className={`mono font-semibold leading-none text-ink ${size === 34 ? "tracking-[-0.03em]" : "tracking-[-0.02em]"}`} style={{ fontSize: size }}>{num(n)}</span>
      <span className="whitespace-nowrap text-[11.5px] text-ink-4">{unit}</span>
    </span>
  );
}

/**
 * Who tells a situation, as the hot list writes who talks about a story (AIHOT routes/hot.tsx Voices): its sources'
 * faces, then "1 位业内人士 · 26 条原文", the phrases kept whole.
 */
export function Who({ s, size = 24 }: { s: SituationRow; size?: number }) {
  const rest = restCountText(s.count);
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {s.faces.length > 0 && <Faces participants={s.faces} total={s.sources} size={size} interactive={false} />}
      {rest && <Phrases text={rest} />}
    </span>
  );
}

/** "1 位业内人士 · 26 条原文" in the hot list's voices type: lines break between the phrases, never inside one. */
function Phrases({ text, className = "text-[12.5px] leading-snug text-ink-4" }: { text: string; className?: string }) {
  return (
    <span className={`min-w-0 ${className}`}>
      {text.split(" · ").map((p, i) => <Fragment key={p}>{i > 0 && <span className="mx-1.5 text-line-strong">·</span>}<span className="whitespace-nowrap">{p}</span></Fragment>)}
    </span>
  );
}

/** A card that opens a page, as the hot list's cards (AIHOT routes/hot.tsx): the engine's card and its hover. */
export const CARD = "card card-hover group relative";
/** The title's link, stretched over its card or row as the hot list's StoryLink; the title takes the accent on hover. */
export const STRETCH = "transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent";
/** A place in 店家谈得最多的事, as the hot list writes it (AIHOT routes/hot.tsx): 01, its colour by place. */
const RANK_COLOR = ["text-rank-1", "text-rank-2", "text-rank-3"];
export const rankColor = (rank: number) => RANK_COLOR[rank - 1] ?? "text-rank-rest";
export const pad = (rank: number) => String(rank).padStart(2, "0");
/** The place over a card's title: NO.01. */
export function RankTag({ rank }: { rank: number }) {
  return <span className={`mono text-[12px] font-bold tracking-[0.16em] ${rankColor(rank)}`}>NO.{pad(rank)}</span>;
}

/**
 * A card's source line as the feed card's (AIHOT features/feed/parts.tsx SourceLine): one line, the descriptor cut short
 * where it is too long and the month kept whole after it ("美国 · 餐饮媒体 · 2025 年 7 月").
 */
function SourceLine({ text }: { text: string }) {
  const m = /^(.*?)( · \d{4} 年 \d{1,2} 月)$/u.exec(text);
  if (!m) return <span className="min-w-0 truncate">{text}</span>;
  return <><span className="min-w-0 truncate">{m[1]}</span><span className="shrink-0 whitespace-nowrap">{m[2]}</span></>;
}

/**
 * An item, as the feed shows one (AIHOT features/feed/FeedItem.tsx, in the phone row of features/feed/Timeline.tsx
 * TimelineSlot): a row between hairlines on phones, a card from desktops; its source line with the bookmark, its title
 * leading to the item's page, the first of its points under a hairline from desktops. A list's `li`.
 */
export function StoryCard({ c }: { c: CaseCard }) {
  return (
    <li className="group/slot bleed touch:has-[a:active]:bg-bg-sunk/70 lg:mx-0 lg:px-0 lg:touch:has-[a:active]:bg-transparent">
      <div className="border-b border-line-soft py-3.5 group-last/slot:border-b-0 lg:border-b-0 lg:py-0">
        <article className="relative min-w-0 lg:card lg:card-hover lg:px-[18px] lg:pb-[14px] lg:pt-[15px]">
          <header className="flex min-h-[22px] items-center gap-1.5 text-[12.5px] leading-[18px] text-ink-4 lg:min-h-[18px] lg:gap-2">
            <span className="flex min-w-0 items-center"><SourceLine text={c.src} /></span>
            <span className="ml-auto flex shrink-0 items-center gap-1 pl-2 lg:gap-1.5">
              <span className="-my-[11px] -mr-3 inline-flex lg:-my-1 lg:mr-0"><StarButton item={c.item} className="size-11 lg:size-[26px]" /></span>
            </span>
          </header>
          <h3 className="mt-1.5 line-clamp-2 text-[17px] font-[650] leading-[1.5] text-ink lg:mt-2 lg:line-clamp-none lg:leading-[1.55]">
            <Link viewTransition to={`/items/${c.id}`} className="after:absolute after:inset-0 after:content-['']">{c.title}</Link>
          </h3>
          {c.reason && (
            <div className="mt-1 lg:mt-3 lg:border-t lg:border-line-soft lg:pt-3">
              <p className="line-clamp-1 text-[13px] leading-[1.65] text-note lg:line-clamp-none lg:leading-[1.75]">{`${ITEM_COPY.reasonLabel}：`}{reasonLines(c.reason)[0]}</p>
            </div>
          )}
        </article>
      </div>
    </li>
  );
}

/** How many a folded list shows before its toggle (Kay 11-06, 决定记录 L2575: 3 of each, the rest folded). */
export const FIRST = 3;

/**
 * The original's fold toggle (AIHOT features/feed/ReadingGroup.tsx Toggle, 「另外 N 家也报道了」): quiet text and a
 * chevron that turns, the words the same open or closed. Kay asked twice for folds that were lost with the parts they
 * were on (经验 G15). `className` places it.
 */
export function FoldToggle({ open, onToggle, children, className = "" }: { open: boolean; onToggle: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" aria-expanded={open} onClick={onToggle}
      className={`relative z-10 inline-flex items-center gap-0.5 text-ink-4 transition-colors hover:text-accent text-[12.5px] ${className}`}>
      {children}
      <IconChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

/** The feed's spacing of items: rows on phones, cards 12px apart from desktops, as the timeline has them. */
const ITEMS = "lg:space-y-3";

/** Items; with `first`, only that many until 另有 N 条原文 is opened. */
export function StoryCards({ cards, first }: { cards: CaseCard[]; first?: number }) {
  const [open, setOpen] = useState(false);
  const shown = first === undefined ? cards : cards.slice(0, first);
  const more = cards.slice(shown.length);
  return (
    <>
      <ul className={`mt-3 ${ITEMS}`}>{shown.map((c) => <StoryCard key={c.id} c={c} />)}</ul>
      {more.length > 0 && (
        <>
          <Collapse open={open}><ul className={`${ITEMS} lg:pt-3`}>{more.map((c) => <StoryCard key={c.id} c={c} />)}</ul></Collapse>
          <FoldToggle open={open} onToggle={() => setOpen(!open)} className="mt-2 min-h-11 lg:min-h-8">另有 <span className="num mx-0.5">{num(more.length)}</span> 条原文</FoldToggle>
        </>
      )}
    </>
  );
}

/**
 * Situations as rows in one card, as the hot list's 4th to 10th (AIHOT routes/hot.tsx Row): the place when ranked
 * (from `from`), the title with the situation's line under it; who tells it and what it counts on a line under the
 * text on phones, in columns from `wide`. `category` names each row's category over its title (a search). `children`
 * close the card. Ranked, the list is numbered from `from`, so a screen reader reads the places shown.
 */
export function SituationRows({ rows, from, category = false, first, more: moreLabel, children }: {
  rows: SituationRow[]; from?: number; category?: boolean; first?: number; more?: ReactNode; children?: ReactNode;
}) {
  // With `first`, the rest wait behind a toggle at the card's foot (`more` names it; 另有 N 种情况 if not).
  const [open, setOpen] = useState(false);
  const shown = first === undefined ? rows : rows.slice(0, first);
  const rest = rows.slice(shown.length);
  return (
    <div className="card mt-3 overflow-hidden">
      {shown.length > 0 && <Rows rows={shown} from={from} category={category} />}
      {rest.length > 0 && (
        <>
          <Collapse open={open}><div className={shown.length ? "border-t border-line-soft" : ""}><Rows rows={rest} from={from === undefined ? undefined : from + shown.length} category={category} /></div></Collapse>
          <div className={`px-4 sm:px-5 wide:px-6 ${shown.length || open ? "border-t border-line-soft" : ""}`}>
            <FoldToggle open={open} onToggle={() => setOpen(!open)} className="min-h-11 lg:min-h-9">{moreLabel ?? <>另有 <span className="num mx-0.5">{num(rest.length)}</span> 种情况</>}</FoldToggle>
          </div>
        </>
      )}
      {children}
    </div>
  );
}

/** A row's columns, as the hot list's (its sparkline left out: a situation has no day of heat). */
const COLUMNS = {
  ranked: "grid-cols-[30px_minmax(0,1fr)] wide:grid-cols-[44px_minmax(0,1fr)_auto_76px]",
  plain: "grid-cols-[minmax(0,1fr)] wide:grid-cols-[minmax(0,1fr)_auto_76px]",
};

function Rows({ rows, from, category }: { rows: SituationRow[]; from?: number; category: boolean }) {
  const List = from === undefined ? "ul" : "ol";
  return (
    <List start={from} className="divide-y divide-line-soft">
      {rows.map((s, i) => {
        const [n, unit] = listCount(s.count);
        const rest = restCountText(s.count);
        return (
          <li key={s.slug} className={`group relative grid items-start gap-x-3 px-4 py-3 transition-colors hover:bg-bg-sunk/70 sm:px-5 wide:items-center wide:gap-x-6 wide:px-6 wide:py-3.5 dark:hover:bg-bg-muted/40 ${from === undefined ? COLUMNS.plain : COLUMNS.ranked}`}>
            {from !== undefined && <span className={`mono text-[16px] font-semibold leading-[24px] wide:text-[17px] ${rankColor(from + i)}`} aria-label={`第 ${from + i} 位`}>{pad(from + i)}</span>}
            <div className="min-w-0">
              {category && <span className="block text-[12px] leading-[1.5] text-ink-4">{s.category}</span>}
              <h3 className="text-[15px] font-[650] leading-[1.55] text-ink">
                <Link viewTransition to={`/reference/${s.slug}`} className={STRETCH}>{s.title}</Link>
              </h3>
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-[1.65] text-ink-4 wide:line-clamp-1">{s.dek}</p>
              <div className="mt-2 flex items-center gap-2.5 wide:hidden">
                {s.faces.length > 0 && <Faces participants={s.faces} total={s.sources} size={20} interactive={false} />}
                {rest && <span className="min-w-0 truncate text-[12px] text-ink-4">{rest}</span>}
                <span className="ml-auto flex shrink-0 items-baseline gap-1">
                  <span className="mono text-[17px] font-semibold leading-none text-ink">{num(n)}</span>
                  <span className="text-[11.5px] text-ink-4">{unit}</span>
                </span>
              </div>
            </div>
            <div className="hidden min-w-0 flex-col items-end gap-1 wide:flex">
              {s.faces.length > 0 && <Faces participants={s.faces} total={s.sources} size={20} interactive={false} />}
              {rest && <span className="whitespace-nowrap text-[12px] text-ink-4">{rest}</span>}
            </div>
            <div className="hidden wide:block"><CountFigure count={s.count} size={20} /></div>
          </li>
        );
      })}
    </List>
  );
}

/**
 * An item's way into the library on its page, as the item page lists 相关事件 (AIHOT routes/item.tsx): a small
 * heading, then the row; `count` under the title in the row's quieter type.
 */
export function WhereFiled({ to, title, count }: { to: string; title: string; count: string | null }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-[14px] font-semibold text-ink">收在 {SITE.name} 参考</h2>
      <ul className="divide-y divide-line-soft">
        <li>
          <Link viewTransition to={to} className="block py-2.5 text-[14px] text-ink-2 hover:text-accent">
            {title}
            {count && <span className="mt-0.5 block text-[12.5px] text-ink-4">{count}</span>}
          </Link>
        </li>
      </ul>
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
      await copyText(`${title}\n${url}`);
      setText("链接已复制");
    } catch {
      // The reader closed the sheet, or the clipboard is not allowed here.
    }
  };
  const copy = async (url: string) => {
    try {
      await copyText(url);
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

/** A button of a page's own row (分享), as the item page's (AIHOT routes/item.tsx 原文): 32px, 44px on touch screens. */
export const ROW_BUTTON = "inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-ink-4 hover:text-ink touch:h-11";

/** What kind a picture is, before its caption: the engine's Badge, 原文数据 and 示意 in the accent, 举例 (made-up numbers) quieter. */
export function KindTag({ kind }: { kind: "原文数据" | "举例" | "示意" }) {
  return <Badge tone={kind === "举例" ? "neutral" : "accent"} className="mr-2 align-[1px]">{kind}</Badge>;
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

/** Body text (16/17px, 1.85). */
export const BODY = "text-[16px] leading-[1.85] text-ink-2 lg:text-[17px]";

/**
 * A text with its 〔n〕 marks as small links: to the originals below on 十一说's page (web/issue.tsx), to the items on a
 * situation's 综合整理 (web/situation.tsx). A number `href` has no address for stays as text.
 */
export function CitedText({ text, href }: { text: string; href: (n: string) => string | null }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/〔([\d、,，\s]+)〕/gu)) {
    parts.push(text.slice(last, m.index));
    const ns = m[1]!.split(/[、,，\s]+/u).filter(Boolean);
    parts.push(
      <sup key={m.index} className="ml-0.5 text-[11px] text-ink-4">
        {ns.map((n, i) => {
          const to = href(n);
          return (
            <Fragment key={n}>
              {i > 0 && "、"}
              {to ? <a href={to} className="hover:text-accent">{n}</a> : n}
            </Fragment>
          );
        })}
      </sup>,
    );
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
