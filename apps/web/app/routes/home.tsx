import { data as withHeaders, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/home";
import type { TimelineResponse } from "@aihot/contracts/site";
import { FEED } from "@aihot/site";
import { apiDeadlineCache, loadOr404, pageExpiresAt } from "../lib/api.server";
import { cachedLoader } from "../lib/page-reuse";
import { filterParams, itemListLd, listPath, pageMeta, readFilters, siteLd } from "../lib/seo";
import { READ_COLUMN, type Screen } from "../components/shell/screens";
import { Timeline } from "../features/feed/Timeline";
import { HotTopics } from "../features/feed/HotTopics";
import { ActiveFilters, CategoryTabs, FeedBar, FeedHead, SearchField, SHELL } from "../features/feed/Filters";
import { feedPath, navName, navShown } from "../components/shell/nav";

/** What the navigation calls this page (site.ts NAV.labels), 精选 by default. */
const NAME = navName(feedPath());

export const handle: Screen = { tab: "featured", name: NAME };
export { shouldRevalidate } from "../lib/page-reuse";
export const clientLoader = cachedLoader<typeof loader>();

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  // A site whose list starts at 全部 (site.ts FEED.start) keeps no featured list: its address leads there, filters and all.
  // Here rather than in the redirect table (contracts/http-policy.ts), which sees documents only: a tab opened before the
  // switch still links this address in its navigation, and reads it as data.
  if (FEED.start === "all") throw redirect(`/all${url.search}`, 301);
  const q = url.searchParams.get("q");
  // Search lives on /all; keep the parameters so old links still land on results.
  if (q && q.trim()) throw redirect(`/all${url.search}`);
  const filters = readFilters(url.searchParams);
  const upstream = new Headers();
  const data = await loadOr404<TimelineResponse>(listPath("/api/site/timeline", filterParams(filters)), { responseHeaders: upstream, signal: request.signal });
  return withHeaders({ data, filters, expiresAt: pageExpiresAt(60, upstream) }, { headers: apiDeadlineCache(60, Date.now(), upstream) });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const path = listPath(feedPath(), loaderData ? filterParams(loaderData.filters) : {});
  const titles = loaderData?.data.cards.map((c) => c.item.title) ?? [];
  // At / the site's own title and description; beside a module home page (/latest), the page's name and its lead.
  const home = feedPath() === "/";
  return pageMeta({ title: home ? null : NAME, description: home ? null : FEED.leads?.featured, path, jsonLd: path === "/" ? [...siteLd(), itemListLd("/", NAME, titles)] : undefined });
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export default function Home() {
  const { data, filters } = useLoaderData<typeof loader>();
  const title = filters.tag ? `#${filters.tag}` : NAME;
  return (
    // The reading column, also beside a wider 全部 (LAYOUT.lists): a flat list has no column of days to put the room into.
    <div className={`mx-auto pb-6 ${READ_COLUMN}`}>
      {SHELL ? (
        <FeedHead scope="featured" name={NAME} filters={filters} />
      ) : (
        <>
          {/* Phones: the bar (精选 | 全部, filter, search), the filter in use, today's hot topics, the feed. */}
          <FeedBar base={feedPath()} category={filters.category} channel={filters.channel} />
          <ActiveFilters base={feedPath()} category={filters.category} channel={filters.channel} tag={filters.tag} />
          <div className="hidden lg:block">
            <h1 className="text-[24px] font-semibold leading-[1.3] text-ink">{title}</h1>
            <div className="mb-5 mt-4 flex items-center justify-between gap-4">
              <CategoryTabs base={feedPath()} category={filters.category} channel={filters.channel} layoutId="home-cat-desk" className="min-w-0" />
              <SearchField keep={{ category: filters.category }} />
            </div>
          </div>
        </>
      )}

      {data.hot && navShown("/hot") && <HotTopics entries={data.hot} />}

      <Timeline initial={data} filters={data.filters} />
    </div>
  );
}
