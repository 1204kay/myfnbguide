import { useEffect } from "react";
import { Link, redirect, useLoaderData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/all";
import type { PoolResponse } from "@aihot/contracts/site";
import { DATES, FEED, LAYOUT, SEARCH, SITE, subjectAfter } from "@aihot/site";
import { beijingTime } from "@aihot/contracts/time";
import { apiGet, edgeTtl, loadOr404, pageExpiresAt } from "../lib/api.server";
import { cachedLoader } from "../lib/page-reuse";
import { filterParams, itemListLd, listPath, pageMeta, readFilters } from "../lib/seo";
import { ActiveFilters, CategoryTabs, FeedBar, FeedHead, PHONE_ROW, PhoneFilterRow, SearchField, SHELL, tagName } from "../features/feed/Filters";
import { PillTabs } from "../components/ui/Tabs";
import { DayList, Pagination } from "../features/feed/DayList";
import { EmptyState } from "../components/ui/Page";
import { IconSearch } from "../components/icons";
import { BackRow, PhoneBar } from "../components/shell/PhoneBar";
import { feedPath, navName, navShown } from "../components/shell/nav";
import { isPhone, LIST_COLUMN, type Screen } from "../components/shell/screens";
import { openSearch } from "../features/search/SearchOverlay";
import { addRecentSearch } from "../lib/local-state";
import { loadParts, readParts } from "../site-modules";

/**
 * The page's name: its own (全部动态, or what the site calls it, NAV.labels) while it is a way in of its own; the featured
 * list's while it is reached by that list's switch (site.ts NAV.hidden). Back buttons to it say 全部 beside 精选, its name
 * where the list starts here (FEED.start).
 */
const ALL_NAME = navName(navShown("/all") ? "/all" : feedPath());
const BACK_NAME = FEED.start === "featured" && navShown("/all") ? "全部" : ALL_NAME;

export const handle: Screen = { tab: "featured", name: BACK_NAME };
export { shouldRevalidate } from "../lib/page-reuse";
export const clientLoader = cachedLoader<typeof loader>();

/** The modules' sections of a search's results (searchPart), ahead of the items. */
const PARTS = await loadParts((m) => m.searchPart);

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().slice(0, 200) || null;
  const tab = url.searchParams.get("tab") === "relevance" ? "relevance" : null;
  // Older deep-paging parameters (deep, anchorAt) still open a normal page.
  const page = Math.min(Math.max(Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1), 50);
  const [data, parts] = await Promise.all([
    loadOr404<PoolResponse>(
      listPath("/api/site/pool", { ...filterParams(readFilters(url.searchParams)), q, tab, page: page > 1 ? page : null }),
      // The busy page keeps the search, so it can be tried again as it was.
      { signal: request.signal, busyRedirect: `/all/search-busy${url.search}` },
    ),
    q ? readParts(PARTS, q, (path) => apiGet(path, { signal: request.signal })) : ({} as Record<string, unknown>),
  ]);
  // Past the last page of what there is: the last page, with the same search and filters.
  if (data.total > 0 && data.page > data.pageCount) throw redirect(pageHref(url.searchParams, data.pageCount));
  return { data, parts, expiresAt: pageExpiresAt(60) };
}

/** What the page is called: its heading and, where the shell carries search, its document title. */
function headingOf(f: PoolResponse["filters"]): string {
  return f.q ? `搜索“${f.q}”` : f.tag ? tagName(f.tag) : ALL_NAME;
}

export function meta({ loaderData }: Route.MetaArgs) {
  const f = loaderData?.data.filters;
  const q = f?.q;
  const page = loaderData?.data.page ?? 1;
  const path = listPath("/all", { ...(f && filterParams(f)), q, tab: f?.tab === "relevance" ? "relevance" : null, page: page > 1 ? page : null });
  return pageMeta({
    title: SHELL ? (f ? headingOf(f) : ALL_NAME) : q ? `搜索：${q}` : ALL_NAME,
    description: FEED.leads?.all ?? `${SITE.name} 收录的${subjectAfter("全部", "相关动态")}，可按频道、类别与标签筛选，支持中英文搜索。`,
    path,
    noindex: !!q,
    jsonLd: q ? undefined : itemListLd(path, ALL_NAME, loaderData?.data.items.map((i) => i.title) ?? []),
  });
}

export function headers() {
  return edgeTtl(60);
}

function pageHref(params: URLSearchParams, page: number) {
  const sp = new URLSearchParams(params);
  sp.delete("deep");
  sp.delete("anchorAt");
  sp.delete("search");
  if (page <= 1) sp.delete("page");
  else sp.set("page", String(page));
  const s = sp.toString();
  return s ? `/all?${s}` : "/all";
}

/** Phones: the words searched in the bar; tapping them opens the search to change them. */
function QueryChip({ q }: { q: string }) {
  return (
    <button type="button" onClick={(event) => openSearch(q, event.currentTarget)} className="flex h-11 min-w-0 max-w-full items-center gap-2 rounded-full bg-bg-sunk px-3.5 text-[15px] text-ink ring-1 ring-inset ring-line-soft dark:bg-bg-muted/60">
      <IconSearch size={16} className="shrink-0 text-ink-4" />
      <span className="truncate">{q}</span>
    </button>
  );
}

export default function AllPage() {
  const { data, parts } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const navigation = useNavigation();
  const f = data.filters;
  const busy = navigation.state === "loading" && navigation.location?.pathname === "/all";
  const { channel, category } = filterParams(f);
  const keep = { channel, category };
  const searchTabHref = (tab: "time" | "relevance") => {
    const sp = new URLSearchParams(params);
    sp.delete("page");
    if (tab === "relevance") sp.set("tab", "relevance");
    else sp.delete("tab");
    return `/all?${sp}`;
  };
  // Searches are remembered in this browser for the phone search (listed in the privacy notice).
  useEffect(() => {
    if (f.q) addRecentSearch(f.q);
  }, [f.q]);
  // Older phone links (/all?search=1) opened the search field; they open the search now.
  useEffect(() => {
    if (params.get("search") === "1" && isPhone()) openSearch(f.q ?? "");
  }, []);

  const total = data.total >= 2000 ? `${SHELL ? "2,000" : "2000"}+` : SHELL ? data.total.toLocaleString("en-US") : String(data.total);
  // The modules' sections of a search, each with what its read found (none when the read failed).
  const searchParts = f.q && PARTS.flatMap(({ name, part }) => (parts[name] == null ? [] : [<part.Block key={`${name}:${f.q}`} q={f.q!} data={parts[name]} />]));
  const sorts = f.q && (
    <PillTabs
      size="xs"
      layoutId="all-search-sort"
      label="搜索排序"
      active={f.tab}
      items={(["time", "relevance"] as const).map((t) => ({ key: t, label: SEARCH.sorts[t], to: searchTabHref(t) }))}
    />
  );
  const results = (
    <>
      <div className={`transition-opacity duration-200 ${busy ? "opacity-50" : ""}`}>
        {data.items.length === 0 ? (
          <div className={`mt-2 ${FEED.style === "cards" ? "card" : "lg:card"}`}>
            <EmptyState
              title="没有找到相关内容"
              action={
                f.q && f.tab === "time" ? (
                  <Link to={searchTabHref("relevance")} className="text-[13px] font-medium text-accent hover:underline">
                    试试“{SEARCH.sorts.relevance}”，连正文一起搜
                  </Link>
                ) : undefined
              }
            >
              {f.q ? "换个说法，或者去掉筛选再试。" : "这个筛选下暂时没有内容。"}
            </EmptyState>
          </div>
        ) : (
          <DayList items={data.items} todayCount={f.q ? null : data.todayCount} rail={!!LAYOUT.lists} />
        )}
      </div>
      <Pagination page={data.page} pageCount={data.pageCount} href={(p) => pageHref(params, p)} />
      {data.page >= 50 && <p className="mt-4 text-center text-[12px] text-ink-4">{`最多提供 50 页，更早的内容请使用搜索${navShown("/topics") ? "或主题页" : ""}。`}</p>}
    </>
  );

  if (SHELL) {
    const heading = <h1 data-page-title="" className="text-[26px] font-bold leading-[1.3] tracking-[-0.01em] text-ink [text-wrap:balance] lg:text-[30px]">{headingOf(f)}</h1>;
    return (
      <div className={`mx-auto pb-6 ${LIST_COLUMN}`}>
        {f.q ? (
          // A search: pushed onto the page it was made from; the modules' sections, then the items.
          <>
            <PhoneBar back={{ to: "/", label: navName("/") }} center={<QueryChip q={f.q} />} />
            <BackRow to="/" label={navName("/")} />
            <header className="pb-4 pt-1 lg:pt-2">{heading}</header>
            <ActiveFilters base="/all" category={f.category} channel={f.channel} tag={f.tag} wide />
            {searchParts}
            <section aria-label={SEARCH.itemsTitle ?? undefined}>
              <div className="flex items-baseline justify-between gap-3">
                {SEARCH.itemsTitle && <h2 className="text-[20px] font-extrabold leading-[1.35] text-ink lg:text-[22px]">{SEARCH.itemsTitle}</h2>}
                <span className="ml-auto shrink-0 text-[13px] text-ink-4">
                  找到 <span className="num">{total}</span> 条
                  {DATES.clock && <> · 更新于 <span className="num">{beijingTime(data.freshness)}</span></>}
                </span>
              </div>
              <div className="mt-3">{sorts}</div>
              {SEARCH.sortNote && <p className="mb-3 mt-2 text-[13px] leading-relaxed text-ink-4">{SEARCH.sortNote}</p>}
              {results}
            </section>
          </>
        ) : f.tag ? (
          // A tag: every item carrying it, pushed onto the page it was opened from.
          <>
            <PhoneBar back={{ to: "/all", label: ALL_NAME }} title={tagName(f.tag)} />
            <BackRow to="/all" label={ALL_NAME} />
            <header className="pb-3 pt-1 lg:pt-2">
              {heading}
              <p className="mt-2 text-[13px] leading-relaxed text-ink-4">
                全部条目里带这个标签的，按时间排列。共 <span className="num">{total}</span> 条
              </p>
            </header>
            <ActiveFilters base="/all" category={f.category} channel={f.channel} tag={f.tag} wide />
            {results}
          </>
        ) : (
          <>
            <FeedHead scope="all" name={ALL_NAME} filters={f} />
            {results}
          </>
        )}
      </div>
    );
  }

  const title = f.q ? `搜索“${f.q}”` : f.tag ? tagName(f.tag) : null;
  return (
    <div className={`mx-auto pb-6 ${LIST_COLUMN}`}>
      {/* Phones: the feed bar, or for a search the query (tap to change it) and back to 全部. */}
      {f.q ? <PhoneBar back={{ to: "/all", label: BACK_NAME }} center={<QueryChip q={f.q} />} /> : <FeedBar base="/all" category={f.category} channel={f.channel} />}
      {PHONE_ROW && !f.q && <PhoneFilterRow base="/all" category={f.category} channel={f.channel} layoutId="all-cat-phone" className="pb-3 pt-1" />}
      <ActiveFilters base="/all" category={f.category} channel={f.channel} tag={f.tag} />

      {/* Desktop, as on 精选: the title, then one filter row with the search field aligned on the right. */}
      <div className="hidden lg:block">
        <h1 className="text-[24px] font-semibold leading-[1.3] text-ink">{title ?? ALL_NAME}</h1>
        <div className="mb-5 mt-4 flex items-center justify-between gap-4">
          <CategoryTabs base="/all" category={f.category} channel={f.channel} layoutId="all-cat-desk" className="min-w-0" />
          <SearchField defaultValue={f.q ?? ""} keep={keep} />
        </div>
      </div>

      {searchParts}
      {f.q && (
        <>
          {SEARCH.itemsTitle && <h2 className="mt-1 text-[20px] font-extrabold leading-[1.35] text-ink lg:text-[22px]">{SEARCH.itemsTitle}</h2>}
          <div className="mb-3 mt-1 flex flex-wrap items-center justify-between gap-2 lg:mt-0">
            {sorts}
            <span className="text-[12px] text-ink-4">
              找到 <span className="num">{total}</span> 条{DATES.clock && <> · 更新于 <span className="num">{beijingTime(data.freshness)}</span></>}
            </span>
          </div>
          {SEARCH.sortNote && <p className="-mt-1 mb-3 text-[13px] leading-relaxed text-ink-4">{SEARCH.sortNote}</p>}
        </>
      )}

      {results}
    </div>
  );
}
