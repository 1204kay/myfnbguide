// Feed filters: the channel and category choice (a row of tabs on desktop, a sheet behind a filter button on
// phones), the switch of 精选 and 全部, the head of the two lists, and their own search where they keep one.
import { useEffect, useRef, useState } from "react";
import { Form, Link, useNavigation, useSearchParams } from "react-router";
import type { TimelineFilters } from "@aihot/contracts/site";
import { CATEGORY_KEYS, CHANNEL_LABELS, type CategoryKey, type ChannelKey } from "@aihot/contracts/taxonomy";
import { CATEGORIES } from "@aihot/industry/taxonomy";
import { FEED, ITEM_COPY, NAV, SITE } from "@aihot/site";
import { IconCheck, IconClose, IconFilter, IconSearch } from "../../components/icons";
import { PillTabs } from "../../components/ui/Tabs";
import { Sheet } from "../../components/ui/Sheet";
import { Wordmark } from "@aihot/site/brand/Logo.tsx";
import { BarButton, PhoneBar, SearchButton, TabPageBar } from "../../components/shell/PhoneBar";
import { feedPath, navName } from "../../components/shell/nav";

/**
 * The shell carries search (site.ts NAV.search): the lists keep no search of their own, their phone bar is the tab pages'
 * (the brand and search), and 精选 | 全部 and the filter sit under the page's name, on phones as on desktops.
 */
export const SHELL = NAV.search === "shell";

/** What the filter calls each category: the pack's label, or its section in the reports (site.ts FEED.filterNames). */
export const CATEGORY_NAMES = Object.fromEntries(CATEGORIES.map((c) => [c.key, FEED.filterNames === "section" ? c.section : c.label])) as Record<CategoryKey, string>;

/** A tag as the lists name it: "#成本/利润", or "标签：成本/利润" on a site that writes its tags without "#" (ITEM_COPY.tagHash). */
export function tagName(tag: string): string {
  return ITEM_COPY.tagHash ? `#${tag}` : `标签：${tag}`;
}

/** The name of the filter in use (一手 or a category), null for none. */
export function filterName(category: CategoryKey | null, channel: ChannelKey): string | null {
  return channel === "firstParty" ? CHANNEL_LABELS.firstParty : category ? CATEGORY_NAMES[category] : null;
}

/** Same page with some query parameters changed (paging state dropped). */
function hrefWith(base: string, params: URLSearchParams, patch: Record<string, string | null>) {
  const sp = new URLSearchParams(params);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === "") sp.delete(k);
    else sp.set(k, v);
  }
  sp.delete("page");
  sp.delete("cursor");
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

/**
 * The feed's one filter (精选 and 全部动态 alike): none, 一手, or a category. One choice at a time: picking
 * 一手 clears the category and picking a category clears 一手. Older 资讯 / X links still filter; the
 * choice then shows as none.
 */
function filterOptions(base: string, params: URLSearchParams, noneLabel: string) {
  return [
    { key: "all", label: noneLabel, to: hrefWith(base, params, { category: null, channel: null }) },
    ...(NAV.firstPartyFilter ? [{ key: "firstParty", label: CHANNEL_LABELS.firstParty, to: hrefWith(base, params, { category: null, channel: "firstParty" }) }] : []),
    ...CATEGORY_KEYS.map((k) => ({ key: k, label: CATEGORY_NAMES[k], to: hrefWith(base, params, { category: k, channel: null }) })),
  ];
}

function filterKey(category: CategoryKey | null, channel: ChannelKey): string {
  return channel === "firstParty" ? "firstParty" : (category ?? "all");
}

/** Desktop: the filter as a row of tabs. Its first option is 不限 where 精选 | 全部 shares the page (SHELL), so 全部 means one thing. */
export function CategoryTabs({ base, category, channel = "all", layoutId, className = "" }: { base: string; category: CategoryKey | null; channel?: ChannelKey; layoutId: string; className?: string }) {
  const [params] = useSearchParams();
  return <PillTabs items={filterOptions(base, params, SHELL ? "不限" : "全部").map(o => ({ ...o, prefetch: 'intent' as const }))} active={filterKey(category, channel)} layoutId={layoutId} label="筛选" className={className} />;
}

/** 精选 | 全部: the two lists of the same items; a filter in use carries over. */
function ScopeSwitch({ scope, size, layoutId }: { scope: "featured" | "all"; size?: "md" | "sm"; layoutId: string }) {
  const [params] = useSearchParams();
  const to = (path: string) => hrefWith(path, params, { q: null, tab: null, search: null });
  return (
    <PillTabs
      size={size}
      layoutId={layoutId}
      label="看精选或全部"
      active={scope}
      items={[
        { key: "featured", label: "精选", to: to(feedPath()), resetScroll: true, prefetch: 'intent' },
        { key: "all", label: "全部", to: to("/all"), resetScroll: true, prefetch: 'intent' },
      ]}
    />
  );
}

/**
 * The phone bar of 精选 and 全部 while they keep their own search: the brand, the 精选 | 全部 switch (where the list
 * starts at 全部, site.ts FEED.start, the page's name instead), and buttons for the filter sheet and search.
 */
export function FeedBar({ base, category, channel }: { base: string; category: CategoryKey | null; channel: ChannelKey }) {
  const [sheet, setSheet] = useState(false);
  const filtered = filterKey(category, channel) !== "all";
  return (
    <>
      <PhoneBar
        leading={
          <Link to="/" aria-label={`${SITE.name} 首页`} className="flex h-11 items-center pl-2.5 pr-2 text-ink">
            <Wordmark size={17} />
          </Link>
        }
        {...(FEED.start === "featured" ? { center: <ScopeSwitch scope={base === "/all" ? "all" : "featured"} size="sm" layoutId="feed-scope" /> } : { title: navName(base), large: true })}
        actions={
          <>
            <BarButton label={filtered ? "筛选（已选）" : "筛选"} on={filtered} onClick={() => setSheet(true)}>
              <IconFilter size={21} />
              {filtered && <span aria-hidden="true" className="absolute right-[9px] top-[9px] size-[7px] rounded-full bg-accent ring-2 ring-bg" />}
            </BarButton>
            <SearchButton />
          </>
        }
      />
      <FilterSheet open={sheet} onClose={() => setSheet(false)} base={base} active={filterKey(category, channel)} />
    </>
  );
}

/**
 * The head of 精选 and 全部 when the shell carries search (SHELL): the tab pages' bar on phones; then, the same on
 * phones and desktops, the page's name with 精选 | 全部 beside it (none where the list starts at 全部, site.ts
 * FEED.start), the list's one sentence (site.ts FEED.leads), and the filter: a button and the chips in use on
 * phones, a row of tabs on desktops, the tag in use as a chip on both.
 */
export function FeedHead({ scope, name, filters }: { scope: "featured" | "all"; name: string; filters: TimelineFilters }) {
  const { category, channel, tag } = filters;
  const base = scope === "all" ? "/all" : feedPath();
  const [sheet, setSheet] = useState(false);
  const active = filterKey(category, channel);
  const lead = FEED.leads?.[scope];
  return (
    <>
      <TabPageBar title={name} />
      <header className="pb-4 pt-1 lg:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 data-page-title="" className="text-[30px] font-bold leading-[1.25] tracking-[-0.01em] text-ink">{name}</h1>
          {FEED.start === "featured" && <ScopeSwitch scope={scope} layoutId="feed-scope" />}
        </div>
        {lead && <p className="mt-2 text-[13px] leading-relaxed text-ink-4">{lead}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 lg:hidden">
          <button
            type="button"
            aria-label={active !== "all" ? "筛选（已选）" : "筛选"}
            onClick={() => setSheet(true)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-bg-sunk px-3.5 text-[14px] font-medium text-ink-2 ring-1 ring-inset ring-line-soft transition-colors active:bg-bg-muted dark:bg-bg-muted/60"
          >
            <IconFilter size={17} />
            筛选
            {active !== "all" && <span aria-hidden="true" className="size-[7px] rounded-full bg-accent" />}
          </button>
          <FilterChips base={base} category={category} channel={channel} tag={tag} />
        </div>
        <div className="mt-4 hidden flex-wrap items-center gap-2 lg:flex">
          <CategoryTabs base={base} category={category} channel={channel} layoutId={`${scope}-cat-desk`} className="min-w-0" />
          <FilterChips base={base} category={null} channel="all" tag={tag} />
        </div>
      </header>
      <FilterSheet open={sheet} onClose={() => setSheet(false)} base={base} active={active} />
    </>
  );
}

/** Phones: the filter as a sheet of options, the one in use ticked; choosing one applies it. */
function FilterSheet({ open, onClose, base, active }: { open: boolean; onClose: () => void; base: string; active: string }) {
  const [params] = useSearchParams();
  return (
    <Sheet open={open} onClose={onClose} title="筛选">
      <ul className="mx-4 divide-y divide-line-soft">
        {filterOptions(base, params, "不限").map((o) => {
          const on = o.key === active;
          return (
            <li key={o.key}>
              <Link
                to={o.to}
                onClick={onClose}
                aria-current={on ? "true" : undefined}
                className={`-mx-2 flex h-12 items-center justify-between rounded-tile px-2 text-[16px] transition-colors active:bg-bg-sunk ${on ? "font-semibold text-accent" : "text-ink"}`}
              >
                {o.label}
                {on && <IconCheck size={19} strokeWidth={2.2} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/** The filter and tag in use as chips; each one clears itself when tapped. */
function FilterChips({ base, category, channel, tag }: { base: string; category: CategoryKey | null; channel: ChannelKey; tag: string | null }) {
  const [params] = useSearchParams();
  const label = filterName(category, channel);
  const chip = "inline-flex min-h-11 max-w-full items-center gap-1 rounded-full bg-accent-soft pl-3 pr-2 text-[13px] font-medium text-accent transition-opacity active:opacity-60 lg:min-h-9 touch:min-h-11";
  return (
    <>
      {label && (
        <Link to={hrefWith(base, params, { category: null, channel: null })} aria-label={`取消筛选：${label}`} className={chip}>
          只看{label}
          <IconClose size={14} strokeWidth={2} />
        </Link>
      )}
      {tag && (
        <Link to={hrefWith(base, params, { tag: null })} aria-label={`取消标签：${tag}`} className={chip}>
          <span className="truncate">{tagName(tag)}</span>
          <IconClose size={14} strokeWidth={2} className="shrink-0" />
        </Link>
      )}
    </>
  );
}

/** The filter and tag in use as chips under the bar: phones only, or on both while the tag page shows them (`wide`). */
export function ActiveFilters({ base, category, channel, tag, wide = false }: { base: string; category: CategoryKey | null; channel: ChannelKey; tag: string | null; wide?: boolean }) {
  if (!filterName(category, channel) && !tag) return null;
  return (
    <div className={`flex flex-wrap gap-2 pb-3 pt-1 ${wide ? "" : "lg:hidden"}`}>
      <FilterChips base={base} category={category} channel={channel} tag={tag} />
    </div>
  );
}

function useSlashFocus(ref: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable)) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref]);
}

/** Desktop search field (GET /all?q=…): at the end of the filter row as the same grey track, at the height of md tabs, with a "/" hint. */
export function SearchField({ defaultValue = "", keep = {} }: { defaultValue?: string; keep?: Record<string, string | null> }) {
  const [value, setValue] = useState(defaultValue);
  const navigation = useNavigation();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setValue(defaultValue), [defaultValue]);
  useSlashFocus(inputRef);
  const searching = navigation.state === "loading" && navigation.location?.pathname === "/all" && !!new URLSearchParams(navigation.location.search).get("q");
  const hidden = Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null));

  return (
    <Form method="get" action="/all" role="search" className="group relative w-full shrink-0 lg:w-60">
      {hidden}
      <label htmlFor="site-search" className="sr-only">
        搜索标题、摘要与正文
      </label>
      <IconSearch size={16} className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searching ? "text-accent" : "text-ink-4 group-focus-within:text-ink-3"}`} />
      <input
        ref={inputRef}
        id="site-search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜索标题、摘要…"
        maxLength={200}
        autoComplete="off"
        className="h-[42px] w-full rounded-full bg-bg-sunk pl-10 pr-10 text-[14px] text-ink outline-none ring-1 ring-inset ring-line-soft transition-[background-color,box-shadow] placeholder:text-ink-4 hover:ring-line-strong focus:bg-surface focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:ring-accent dark:bg-bg-muted/60 dark:focus:bg-surface"
      />
      {value ? (
        <button
          type="button"
          aria-label="清空"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-4 transition-colors hover:bg-bg-sunk hover:text-ink"
        >
          <IconClose size={13} />
        </button>
      ) : (
        <kbd className="mono pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-mark border border-line-strong bg-surface px-1.5 text-[10.5px] leading-4 text-ink-4 lg:block">/</kbd>
      )}
    </Form>
  );
}
