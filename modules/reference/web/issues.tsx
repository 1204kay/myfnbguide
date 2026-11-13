// Every 十一说, newest first, as the engine's daily archive lists its dailies (AIHOT routes/daily-archive.tsx): in the
// reports' frame with the dailies' column beside it, the year and month as a section, the day large over its weekday,
// then the issue's title and number. The issue pages had no way back further than the one before (myfnb/DIFFERENCES.md).
import { useLoaderData } from "react-router";
import type { ReportIndexResponse } from "@aihot/contracts/site";
import { beijingDate } from "@aihot/contracts/time";
import { SITE } from "@aihot/site";
import { IntentLink } from "@aihot/web/components/ui/IntentLink";
import { apiGet, cachedPage } from "@aihot/web/lib/api.server";
import { weekdayShort } from "@aihot/web/lib/format";
import { archiveLd, pageMeta } from "@aihot/web/lib/seo";
import { ReportLayout } from "@aihot/web/features/report/ReportLayout";
import { archiveGroups } from "@aihot/web/features/report/format";
import { Rows, SectionPage } from "@aihot/web/features/report/ReportPaper";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { IssueIndex } from "../types.ts";
const NAME = "十一说";
const TITLE = `${NAME}往期`;

export const handle: Screen = { tab: "daily", name: TITLE };
export { pageHeaders as headers } from "@aihot/web/lib/api.server";

export async function loader({ request }: { request: Request }) {
  const [{ issues }, { items: index }] = await Promise.all([
    apiGet<IssueIndex>("/api/reference/issues", { signal: request.signal }),
    apiGet<ReportIndexResponse>("/api/site/reports/daily", { signal: request.signal }),
  ]);
  return cachedPage(600, { issues, index, today: beijingDate(Date.now()) });
}

export function meta({ loaderData }: { loaderData?: { issues: IssueIndex["issues"] } }) {
  const entries = (loaderData?.issues ?? []).map((i) => ({ path: `/reference/issues/${i.no}`, name: `${NAME} · 第 ${i.no} 期：${i.title}` }));
  return pageMeta({ title: TITLE, description: `${SITE.name} 的${NAME}，每期是当天日报的头条，按日期归档。`, path: "/reference/issues", jsonLd: archiveLd("/reference/issues", `${SITE.name} · ${TITLE}`, entries) });
}

export default function IssuesRoute() {
  const { issues, index, today } = useLoaderData<typeof loader>();
  const no = new Map(issues.map((i) => [i.date, i.no]));
  const months = archiveGroups("daily", issues.map((i) => ({ key: i.date, issueNumber: i.no, title: i.title })));
  return (
    <ReportLayout kind="daily" index={index} current={null} today={today} back={{ to: "/daily", label: "日报" }} title={TITLE}>
      <div className="@container">
        <header className="pt-5 lg:pt-0">
          <div className="flex items-center justify-between gap-4 text-[12px] text-ink-4">
            <span>{`${SITE.name} · ${NAME}`}</span>
            <span>
              共 <span className="num">{issues.length}</span> 期
            </span>
          </div>
          <div className="py-6 @[880px]:py-8">
            <h1 id="report-start" data-page-title="" className="text-[32px] font-black leading-[1.28] tracking-[-0.03em] text-ink [text-wrap:balance] @[520px]:text-[40px] @[1040px]:text-[48px] @[1040px]:leading-[1.22]">{TITLE}</h1>
          </div>
          <div aria-hidden="true" className="border-t border-line-strong" />
        </header>
        {months.map((m) => (
          <SectionPage key={m.id} id={`m-${m.id}`} label={m.label}>
            <Rows items={m.entries}>
              {(e, cell) => (
                <IntentLink viewTransition key={e.key} to={`/reference/issues/${no.get(e.key)}`} className={`group flex gap-4 py-4 ${cell}`}>
                  <span className="flex w-9 shrink-0 flex-col items-center">
                    <span className="num text-[24px] font-black leading-none tracking-[-0.03em] text-ink transition-colors group-hover:text-accent">{e.key.slice(8, 10)}</span>
                    <span className="mt-1.5 text-[10.5px] leading-none text-ink-4">{weekdayShort(e.key)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold leading-[1.55] text-ink transition-colors group-hover:text-accent">{e.title}</span>
                    <span className="mt-1 block text-[12px] text-ink-4">
                      第 <span className="num">{no.get(e.key)}</span> 期
                    </span>
                  </span>
                </IntentLink>
              )}
            </Rows>
          </SectionPage>
        ))}
      </div>
    </ReportLayout>
  );
}
