import { useLoaderData } from "react-router";
import { IntentLink } from "../components/ui/IntentLink";
import type { ReportIndexEntry, ReportIndexResponse } from "@aihot/contracts/site";
import { REPORTS, SITE, withSubject } from "@aihot/site";
import { apiGet, edgeTtl, pageExpiresAt } from "../lib/api.server";
import { cachedLoader } from "../lib/page-reuse";
import { archiveLd, pageMeta } from "../lib/seo";
import { beijingDate } from "@aihot/contracts/time";
import { weekdayShort } from "../lib/format";
import { ReportLayout } from "../features/report/ReportLayout";
import { archiveGroups, ENTRIES_UNIT } from "../features/report/format";
import { Rows, SectionPage } from "../features/report/ReportPaper";
import { Nameplate } from "../features/report/Nameplate";
import type { Screen } from "../components/shell/screens";

/** The page's one name: its title, its heading, the way back to it and the archive column's link. */
const NAME = "日报合订本";

export const handle: Screen = { tab: "daily", name: NAME };
export { shouldRevalidate } from "../lib/page-reuse";
export const clientLoader = cachedLoader<typeof loader>();

export async function loader({ request }: { request: Request }) {
  const { items: index } = await apiGet<ReportIndexResponse>("/api/site/reports/daily", { signal: request.signal });
  return { index, today: beijingDate(Date.now()), expiresAt: pageExpiresAt(600) };
}

export function meta({ loaderData }: { loaderData?: { index: ReportIndexEntry[] } }) {
  const entries = (loaderData?.index ?? []).map((e: ReportIndexEntry) => ({ path: `/daily/${e.key}`, name: e.title ? `${e.key} · ${e.title}` : `${SITE.name} 日报 · ${e.key}` }));
  return pageMeta({ title: NAME, description: `${SITE.name} 往期${withSubject("日报")}，按日期排列。`, path: "/daily/archive", image: "/og/pages/daily.png", jsonLd: archiveLd("/daily/archive", `${SITE.name} ${NAME}`, entries) });
}

export function headers() {
  return edgeTtl(600);
}

export default function DailyArchive() {
  const { index, today } = useLoaderData<typeof loader>();
  const months = archiveGroups("daily", index);
  const total = (
    <>
      共 <span className="num">{index[0]?.issueNumber ?? 0}</span> 期
    </>
  );
  return (
    <ReportLayout kind="daily" index={index} current={null} today={today} back={{ to: "/daily", label: "日报" }} title={NAME}>
      {REPORTS.compact ? (
        // Compact (REPORTS.compact): the reading column's heading and a card a month, one issue a row.
        <div className="pb-6">
          <header className="pt-5 lg:pt-0">
            <h1 id="report-start" data-page-title="" className="text-[26px] font-bold leading-[1.3] text-ink [text-wrap:balance] lg:text-[30px]">{NAME}</h1>
            <p className="mt-1.5 text-[13px] text-ink-4">{total}</p>
          </header>
          {months.map((m) => (
            <section key={m.id} id={`m-${m.id}`} aria-labelledby={`m-${m.id}-t`} className="scroll-mt-[calc(var(--bar-h)+1.5rem)] pt-8">
              <h2 id={`m-${m.id}-t`} className="text-[20px] font-extrabold leading-[1.35] text-ink lg:text-[22px]">{m.label}</h2>
              <ol className="card mt-3 overflow-hidden">
                {m.entries.map((e) => (
                  <li key={e.key} className="border-b border-line last:border-b-0">
                    <IntentLink viewTransition to={`/daily/${e.key}`} className="group grid min-h-[52px] grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 transition-colors active:bg-bg-sunk sm:px-5">
                      <span className="text-[13px] text-ink-3">{`${e.short} ${weekdayShort(e.key)}`}</span>
                      <span className="line-clamp-2 text-[15px] font-semibold leading-[1.5] text-ink transition-colors group-hover:text-accent">{e.title ?? `${withSubject("日报")} ${e.key}`}</span>
                      <span className="whitespace-nowrap text-[13px] text-ink-4">
                        <span className="num">{e.count}</span>{` ${REPORTS.entry.measure}`}
                      </span>
                    </IntentLink>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <div className="@container">
          <header className="pt-5 lg:pt-0">
            <div className="flex items-center justify-between gap-4 text-[12px] text-ink-4">
              <span>{`${SITE.name} · ${withSubject("日报")}`}</span>
              <span>{total}</span>
            </div>
            <div className="py-6 @[880px]:py-8">
              <h1 id="report-start" data-page-title="">
                <span className="sr-only">{NAME}</span>
                <Nameplate which="archive" className="block h-[50px] w-auto @[520px]:h-[70px] @[880px]:h-[98px]" />
              </h1>
            </div>
            <div aria-hidden="true" className="border-t border-line-strong" />
          </header>
          {months.map((m) => (
            <SectionPage key={m.id} id={`m-${m.id}`} label={m.label}>
              <Rows items={m.entries}>
                {(e, cell) => (
                  <IntentLink viewTransition key={e.key} to={`/daily/${e.key}`} className={`group flex gap-4 py-4 ${cell}`}>
                    <span className="flex w-9 shrink-0 flex-col items-center">
                      <span className="num text-[24px] font-black leading-none tracking-[-0.03em] text-ink transition-colors group-hover:text-accent">{e.key.slice(8, 10)}</span>
                      <span className="mt-1.5 text-[10.5px] leading-none text-ink-4">{weekdayShort(e.key)}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-bold leading-[1.55] text-ink transition-colors group-hover:text-accent">{e.title ?? `${withSubject("日报")} ${e.key}`}</span>
                      <span className="mt-1 block text-[12px] text-ink-4">
                        <span className="num">{e.count}</span>{` ${ENTRIES_UNIT}`}
                      </span>
                    </span>
                  </IntentLink>
                )}
              </Rows>
            </SectionPage>
          ))}
        </div>
      )}
    </ReportLayout>
  );
}
