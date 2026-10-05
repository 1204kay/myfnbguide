// The reference pages' parts, in the site's own look (warm white, hairline cards, the accent's short bar,
// big numbers for what matters; red only for a loss or an overrun), after myfnb/samples/v2-busy-no-profit.html,
// and the card kinds of the layout (myfnb/layout-2026-10-05.md A7): story cards, practice cards, situation
// cards and entry cards, the same on phones and desktops.
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ITEM_COPY, LAYOUT, SITE } from "@aihot/site";
import { IconChevronRight, IconShare } from "@aihot/web/components/icons";
import { SourceAvatar } from "@aihot/web/components/ui/SourceAvatar";
import { StarButton } from "@aihot/web/features/feed/parts";
import { siteUrl } from "@aihot/web/lib/seo";
import { countText, day, num } from "../format.ts";
import type { Block, CaseCard, CompareBlock, ExampleBlock, PartsBlock, PracticeCard, SituationRow, SourceFace } from "../types.ts";
import { SituationDrawing } from "./figures";

/** The reading column every reference page shares with the site's main path (site.ts LAYOUT). */
export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto pb-14" style={{ maxWidth: LAYOUT.column ?? 760 }}>{children}</div>;
}

/**
 * A smaller paragraph's measure: about 44 characters a line at its own size, as the 17px body runs in the 760px
 * column (layout A5); at 13px the full column would run 58. Narrower columns are untouched.
 */
export const MEASURE = "max-w-[44em]";

/** A small label above a title that leads somewhere: its line is 44px tall to tap. */
export const KICKER_LINK = "mt-1 inline-flex min-h-11 items-center lg:mt-2";

/** A page's title: 26px on phones, 30px from desktops; the phone bar shows it once it has scrolled under the bar. */
export function Title({ children }: { children: ReactNode }) {
  return <h1 data-page-title="" className="mt-2 text-[26px] font-bold leading-[1.3] text-ink [text-wrap:balance] lg:text-[30px]">{children}</h1>;
}

/** The line under a title or a heading (14.5/15px). */
export function Dek({ children, className = "mt-2" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[14.5px] leading-[1.7] text-ink-3 lg:text-[15px] ${className}`}>{children}</p>;
}

/** A section's heading (20/22px), with what it counts on the right. */
export function Heading({ children, id, aside }: { children: ReactNode; id?: string; aside?: ReactNode }) {
  return (
    <div id={id} className="flex scroll-mt-[calc(var(--bar-h)+8px)] items-baseline justify-between gap-3">
      <h2 className="text-[20px] font-extrabold leading-[1.35] text-ink lg:text-[22px]">{children}</h2>
      {aside && <span className="shrink-0 text-[13px] text-ink-4">{aside}</span>}
    </div>
  );
}

/** "更新于 10 月 5 日" at a page's end (HANDOFF §2.4). */
export function Updated({ at }: { at: string | null | undefined }) {
  return at ? <p className="mt-10 text-[13px] text-ink-4">更新于 {day(at)}</p> : null;
}

/** The figures strip: big numbers with their units, or a word where one country stands alone. */
export function Metrics({ items }: { items: Array<[number, string] | string> }) {
  return (
    <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-y border-line py-3 text-[13px] text-ink-4">
      {items.map((item) => typeof item === "string"
        ? <b key={item} className="text-[17px] font-bold text-ink">{item}</b>
        : <span key={item[1]}><b className="num mr-1 text-[22px] font-extrabold tracking-tight text-ink">{num(item[0])}</b>{item[1]}</span>)}
    </div>
  );
}

/** Overlapping source avatars, at most `max` and "+N" for the rest; every name on hover (layout A7-6). */
export function Avatars({ sources, max, size, className = "flex" }: { sources: SourceFace[]; max: number; size: number; className?: string }) {
  if (!sources.length) return null;
  return (
    <span className={`shrink-0 items-center ${className}`} title={sources.map((s) => s.name).join("、")}>
      {sources.slice(0, max).map((s, i) => (
        <span key={s.name} className={`flex rounded-full ring-2 ring-surface ${i ? "-ml-1.5" : ""}`}>
          <SourceAvatar name={s.name} iconUrl={s.icon} size={size} />
        </span>
      ))}
      {sources.length > max && (
        <span className="-ml-1.5 inline-flex items-center rounded-md bg-bg-sunk px-1.5 text-[12px] font-medium leading-none text-ink-3 ring-2 ring-surface" style={{ height: size }}>
          +{sources.length - max}
        </span>
      )}
    </span>
  );
}

/** A card's look (layout A7): hairline, the accent on hover, a sunk ground while pressed, the accent's ring for the keyboard. */
const CARD = "card relative transition-colors hover:border-accent touch:active:bg-bg-sunk has-[.stretch:focus-visible]:outline-2 has-[.stretch:focus-visible]:outline-offset-2 has-[.stretch:focus-visible]:outline-accent";
/** The link that makes a whole card clickable; the card's own buttons sit above it. */
const STRETCH = "stretch after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none";

/** A story's card (layout A7-2): country, source and month, its title, the item's 收录理由, the way to its shop's page. */
export function StoryCard({ c }: { c: CaseCard }) {
  return (
    <article className={`${CARD} px-4 py-3.5 sm:px-5 sm:py-4`}>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 pt-0.5 text-[13px] leading-[1.5] text-ink-4">{c.src}</span>
        <StarButton item={c.item} className="-my-2 -mr-2.5 size-9 touch:-my-2.5 touch:size-11" />
      </div>
      <h3 className="mt-1 text-[16px] font-[650] leading-[1.5] text-ink sm:text-[17px]">
        <Link viewTransition to={`/reference/cases/${c.id}`} className={STRETCH}>{c.title}</Link>
      </h3>
      {c.reason && <p className={`mt-1.5 line-clamp-2 text-[13px] leading-[1.5] text-note ${MEASURE}`}>{ITEM_COPY.reasonLabel}：{c.reason}</p>}
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

/** How many shops a practice card lists before 展开其余 N 家. */
const LINES_SHOWN = 4;

/**
 * A practice (layout A7-3): avatars and counts, what to do, how the shops did it, and a line a shop leading to its
 * newest story in it. The first card of a group may carry its part of the situation's picture (`figure`).
 */
export function Practice({ p, figure }: { p: PracticeCard; figure?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const lines = open ? p.lines : p.lines.slice(0, LINES_SHOWN);
  return (
    <article id={p.key} className="card scroll-mt-[calc(var(--bar-h)+8px)] px-4 pb-1 pt-3.5 sm:px-5 lg:pt-[18px]">
      <div className={figure ? "lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6" : ""}>
        {figure && <div className="mx-auto mb-3 max-w-[360px] [&_svg]:max-h-[220px] lg:order-2 lg:mb-0 lg:w-full">{figure}</div>}
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-4">
            <Avatars sources={p.sources} max={4} size={20} className="flex sm:hidden" />
            <Avatars sources={p.sources} max={6} size={22} className="hidden sm:flex" />
            <span>{countText(p.count, "practice")}</span>
          </div>
          <h3 className="mt-2 text-[16px] font-[650] leading-[1.5] text-ink sm:text-[17px]">{p.title}</h3>
          <Dek className="mt-1.5">{p.summary}</Dek>
        </div>
      </div>
      <ul className="mt-3 border-t border-line">
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
        <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-full items-center justify-center border-t border-line-soft text-[14px] text-accent">
          展开其余 {p.lines.length - LINES_SHOWN} 家
        </button>
      )}
    </article>
  );
}

/** A situation's place in 店家谈得最多的事, in front of its title. */
const RANK = "num shrink-0 font-extrabold text-accent";

/**
 * A category's situations (layout A7-4): the first as a card with its picture, its opening and its counts, the
 * rest as compact rows in the same card; without `lead`, every one a row (the home page's categories: the ranking
 * above them carries the pictures). `ranked` numbers them and counts their shops (店家谈得最多的事). `kind`
 * narrows the links to that shop kind (?kind=).
 */
export function SituationCards({ rows, kind, lead = true, ranked = false }: { rows: SituationRow[]; kind?: string; lead?: boolean; ranked?: boolean }) {
  if (!rows.length) return null;
  const first = lead ? rows[0]! : null;
  const href = (s: SituationRow) => `/reference/${s.slug}${kind ? `?kind=${kind}` : ""}`;
  const of = ranked ? "practice" : "situation";
  return (
    <div className="card mt-3 overflow-hidden">
      {first && (
        <Link viewTransition to={href(first)} className="block px-4 py-4 transition-colors hover:bg-bg-sunk/40 touch:active:bg-bg-sunk sm:px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-6">
          <div className="mx-auto mb-3 max-w-[360px] empty:hidden [&_svg]:max-h-[200px] lg:order-2 lg:mb-0 lg:w-full lg:[&_svg]:max-h-[180px]"><SituationDrawing slug={first.slug} /></div>
          <div>
            <b className="block text-[18px] font-bold leading-[1.4] text-ink lg:text-[20px]">{ranked && <span className={`${RANK} mr-2`}>1</span>}{first.title}</b>
            <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-[1.7] text-ink-3 lg:text-[15px]">{first.overview ?? first.dek}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-4">
              <Avatars sources={first.sources} max={4} size={20} className="flex sm:hidden" />
              <Avatars sources={first.sources} max={6} size={22} className="hidden sm:flex" />
              <span>{countText(first.count, of)}</span>
            </div>
          </div>
        </Link>
      )}
      {rows.slice(first ? 1 : 0).map((s, i) => (
        <SituationLine key={s.slug} s={s} href={href(s)} of={of} rank={ranked ? i + (first ? 2 : 1) : undefined} className={first || i ? "border-t border-line" : ""} />
      ))}
    </div>
  );
}

/** A compact row: two lines on phones (title, counts), one from 641px (title, avatars, counts); its place in front when ranked. */
export function SituationLine({ s, href, className = "", category = false, rank, of = "situation" }: {
  s: SituationRow; href: string; className?: string; category?: boolean; rank?: number; of?: "situation" | "practice";
}) {
  return (
    <Link viewTransition to={href} className={`flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg-sunk/40 touch:active:bg-bg-sunk sm:min-h-[52px] sm:px-5 ${className}`}>
      {rank !== undefined && <span className={`${RANK} w-4 text-[17px]`}>{rank}</span>}
      <span className="min-w-0 flex-1">
        {category && <span className="block text-[13px] text-ink-4">{s.category}</span>}
        <b className="block text-[16px] font-[650] leading-[1.5] text-ink sm:text-[17px]">{s.title}</b>
        <span className="block text-[13px] text-ink-4 sm:hidden">{countText(s.count, of)}</span>
      </span>
      <Avatars sources={s.sources} max={3} size={20} className="hidden sm:flex" />
      <span className="hidden shrink-0 whitespace-nowrap text-[13px] text-ink-4 sm:block">{countText(s.count, of)}</span>
      <IconChevronRight size={16} />
    </Link>
  );
}

/** Entry cards (layout A7-5): a name over its count, wrapping rather than cut; `cols` are the grid's columns. */
export function Entries({ items, cols }: { items: Array<{ to: string; name: string; count: string }>; cols: string }) {
  return (
    <div className={`mt-3 grid gap-2.5 ${cols}`}>
      {items.map((e) => {
        const body = <><b className="block text-[15px] font-[650] leading-[1.35] text-ink">{e.name}</b><span className="mt-0.5 block text-[12.5px] text-ink-4">{e.count}</span></>;
        // 56px with one line of name: ten kinds and the next heading fit WeChat's first screen on a 390×844 phone (layout B1).
        // A five-character name stays on one line from 320px wide and in six columns of the 760px column.
        const cls = "card flex min-h-14 flex-col justify-center px-3 py-1.5 lg:px-3.5 transition-colors hover:border-accent touch:active:bg-bg-sunk";
        return e.to.startsWith("#")
          ? <a key={e.to} href={e.to} className={cls}>{body}</a>
          : <Link key={e.to} viewTransition to={e.to} className={cls}>{body}</Link>;
      })}
    </div>
  );
}

/** The one-line note that says what this site is, for a reader who came straight to a page (layout A13). */
export function SiteLine({ situations }: { situations: number }) {
  return (
    <div className="mt-6 border-t border-line pt-4 text-[13px] leading-[1.6] text-ink-4">
      {SITE.name} 参考：按遇到的事，查各地店家的做法和经验。
      {situations > 0 && <Link viewTransition to="/" className="ml-1 inline-flex items-center text-accent hover:text-accent-ink touch:min-h-11">看全部 {situations} 种情况 ›</Link>}
    </div>
  );
}

/** Shares a page: the system's sheet where there is one (touch screens), else its address is copied. */
export function useShare(): { share: (title: string, path: string) => Promise<void>; toast: ReactNode } {
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
  const toast = text && (
    <div role="status" className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[13px] text-bg shadow-[var(--shadow-pop)] lg:bottom-8">
      {text}
    </div>
  );
  return { share, toast };
}

/** A button of a page's own row on desktops (分享, 收藏, 打开原文): 36px, 44px on touch screens. */
export const ROW_BUTTON = "inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-[14px] text-ink-2 transition-colors hover:border-accent hover:text-accent touch:h-11";

/** Phones: a page's bottom bar with 分享 alone, in place of the tab bar (situation pages; their handle has `toolbar`). */
export function ShareBar({ onShare }: { onShare: () => void }) {
  return (
    <nav aria-label="页面操作" className="fixed inset-x-0 bottom-0 z-40 bg-surface/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--line)] backdrop-blur-xl backdrop-saturate-150 lg:hidden">
      <div className="mx-auto grid h-[50px] max-w-[640px]">
        <button type="button" onClick={onShare} className="flex flex-col items-center justify-center gap-[2px] text-[10.5px] text-ink-3 active:opacity-50">
          <IconShare size={22} />分享
        </button>
      </div>
    </nav>
  );
}

/** A picture in its card, what kind it is and what it says right under it ("举例 · …"), then `after`. */
export function Figure({ children, caption, kind, after }: { children: ReactNode; caption?: string | null; kind?: "原文数据" | "举例" | "示意"; after?: ReactNode }) {
  return (
    <div className="card mt-3.5 p-4">
      {children}
      {(caption || kind) && (
        <p className="mt-3 text-[13px] leading-[1.6] text-ink-4">
          {kind && <span className={`font-semibold ${kind === "举例" ? "text-ink-3" : "text-accent"}`}>{kind}{caption ? " · " : ""}</span>}
          {caption}
        </p>
      )}
      {after}
    </div>
  );
}

/**
 * One horizontal bar split into parts; widths are shares of the whole (0–1). Its labels are page text, not a
 * picture's (it is drawn in HTML and does not scale), so they keep the site's smallest size, 12px (layout A6).
 */
export function Fill({ parts }: { parts: Array<{ label: string; share: number; tone: "accent" | "loss" | number }> }) {
  const tones = ["bg-ink-3/70", "bg-ink-4/70", "bg-ink-4/45", "bg-line-strong", "bg-line"];
  return (
    <div className="flex h-7 overflow-hidden rounded-md bg-bg-sunk text-[12px] font-semibold">
      {parts.filter((p) => p.share > 0).map((p, i) => (
        <div key={i} style={{ width: `${Math.min(p.share, 1) * 100}%` }}
          className={`flex items-center overflow-hidden whitespace-nowrap px-1.5 ${p.tone === "accent" ? "bg-accent text-accent-contrast" : p.tone === "loss" ? "bg-hot text-white" : `${tones[p.tone % tones.length]} text-ink`}`}>
          {p.label}
        </div>
      ))}
    </div>
  );
}

/** A bar too short for its number has the number beside it. */
const FITS = 0.45;

function Compare({ b }: { b: CompareBlock }) {
  const max = Math.max(...b.items.map((i) => i.value));
  const per = b.per ? `每${b.per} ` : "";
  return (
    <Figure kind="原文数据" caption={b.caption}>
      <div className="grid grid-cols-[fit-content(40%)_minmax(0,1fr)] items-center gap-x-2 gap-y-2 text-[13px] text-ink-3">
        {b.items.map((item, i) => {
          const share = item.value / max;
          const label = `${per}${num(item.value)} ${b.unit}`;
          return [
            <span key={`l${i}`} className="leading-snug">{item.label}</span>,
            <div key={`b${i}`} className="flex items-center gap-1.5">
              <div className="min-w-0" style={{ width: `${share * 100}%` }}>
                <Fill parts={[{ label: share >= FITS ? label : "", share: 1, tone: i === b.items.length - 1 ? "accent" : 1 }]} />
              </div>
              {share < FITS && <span className="shrink-0 whitespace-nowrap text-[12px] font-semibold text-ink-2">{label}</span>}
            </div>,
          ];
        })}
      </div>
      {b.change && b.change.amount !== 0 && (
        <p className="mt-3 text-[14px] text-ink-2">
          按原文数字计算：{b.change.amount > 0 ? "多了" : "少了"} <b className="num text-[18px] text-ink">{num(Math.abs(b.change.amount))}</b> {b.unit}（{b.change.amount > 0 ? "+" : "−"}{num(Math.abs(b.change.percent))}%）
          {b.change.yearly !== null && <>，按一年算 <b className="num text-ink">{num(Math.abs(b.change.yearly))}</b> {b.unit}</>}
        </p>
      )}
    </Figure>
  );
}

function Parts({ b }: { b: PartsBlock }) {
  const whole = Math.max(b.total, b.against?.value ?? 0);
  return (
    <Figure kind="原文数据" caption={b.caption}>
      <div className="grid grid-cols-[fit-content(40%)_minmax(0,1fr)] items-center gap-x-2 gap-y-2 text-[13px] text-ink-3">
        {b.against && <><span>{b.against.label}</span><Fill parts={[{ label: num(b.against.value), share: b.against.value / whole, tone: "accent" }]} /></>}
        <span>{b.against ? "支出" : "合计"}</span>
        <Fill parts={b.items.map((i, n) => ({ label: i.label, share: i.value / whole, tone: n }))} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-ink-3">
        {b.items.map((i) => <div key={i.label} className="flex justify-between gap-2"><span>{i.label}</span><span className="num text-ink-2">{num(i.value)}</span></div>)}
      </div>
      <p className="mt-3 text-[14px] text-ink-2">
        按原文数字计算：合计 {num(b.total)} {b.unit}
        {b.gap !== null && (b.gap < 0
          ? <>，亏 <b className="num text-[18px] text-hot">{num(-b.gap)}</b> {b.unit}</>
          : <>，剩 <b className="num text-[18px] text-ink">{num(b.gap)}</b> {b.unit}</>)}
      </p>
    </Figure>
  );
}

function Example({ b }: { b: ExampleBlock }) {
  const bar = b.rows.some((r) => r.share !== null) && b.kind !== "list-total" && b.kind !== "percent-over";
  return (
    <Figure kind="举例" caption={b.caption}>
      <div className="space-y-3">
      {bar && <Fill parts={b.rows.map((r, i) => ({ label: `${r.label} ${num(r.value)}`, share: r.share ?? 0, tone: r.label === "剩下" || r.label === "毛利" ? (r.value < 0 ? "loss" : "accent") : i }))} />}
      {(b.kind === "list-total" || b.kind === "percent-over") && (
        <div className="grid gap-1.5 text-[13px]">
          {b.rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2">
              <div className="relative overflow-hidden rounded bg-bg-sunk px-2 py-1">
                <i className={`absolute inset-y-0 left-0 ${r.flag ? "bg-hot-soft" : "bg-accent-soft"}`} style={{ width: `${(r.share ?? 0) * 100}%` }} />
                <span className={`relative ${r.flag ? "text-hot" : "text-ink-2"}`}>{r.label}</span>
              </div>
              <span className="num text-right text-ink-2">{num(r.value)}{r.unit === "%" ? "%" : ""}</span>
            </div>
          ))}
        </div>
      )}
      {b.equation && <p className="num rounded-md bg-bg-sunk px-3 py-2 text-center text-[14px] text-ink-2">{b.equation}</p>}
      <p className="text-[14.5px] font-semibold text-ink">{b.result}</p>
      </div>
    </Figure>
  );
}

/** Body text (16/17px, 1.85). */
export const BODY = "text-[16px] leading-[1.85] text-ink-2 lg:text-[17px]";

export function StoryBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "text": return <p className={`mt-3 ${BODY}`}>{block.text}</p>;
    case "list": return (
      <ul className={`mt-3 grid gap-2 ${BODY}`}>
        {block.items.map((i, n) => <li key={n} className="relative pl-4 before:absolute before:left-0 before:top-[0.8em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent">{i.lead && <b className="text-ink">{i.lead}：</b>}{i.text}</li>)}
      </ul>
    );
    case "flow": return (
      <div className="card mt-3.5 flex flex-wrap items-center gap-x-1.5 gap-y-2 p-4 text-[14px] text-ink-2">
        {block.steps.map((s, n) => <span key={n} className="flex items-center gap-1.5">{n > 0 && <span className="text-accent">→</span>}<span className="rounded-md bg-bg-sunk px-2 py-1">{s}</span></span>)}
      </div>
    );
    case "quote": return (
      <blockquote className="mt-4 border-l-2 border-accent pl-4 text-[17px] font-semibold leading-relaxed text-ink">
        {block.text}<small className="mt-1.5 block text-[13px] font-normal text-ink-4">{block.who}</small>
      </blockquote>
    );
    case "compare": return <Compare b={block} />;
    case "parts": return <Parts b={block} />;
    case "example": return <Example b={block} />;
  }
}
