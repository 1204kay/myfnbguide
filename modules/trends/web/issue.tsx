// One week's trends (backend/read.ts) in the weekly's own frame (routes/daily-archive.tsx, a page below the reports:
// ReportLayout with a bar leading back, the masthead's date line, SectionPage a topic and the reports' Story a
// report). Each report keeps its source, title and original as the weekly shows them; its summary is our one
// sentence from it. The headline is in the type of the reports' lead headline (ReportPaper): the page has no nameplate picture.
// A topic's heading runs to two lines on a phone where the reports' section names are a word, so its number is kept
// from shrinking here: under overflow-wrap:anywhere it would give way first and break into 0 / 1.
import { useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import type { ReportNavigationResponse } from "@aihot/contracts/site";
import { SITE, withSubject } from "@aihot/site";
import { beijingDate, monthDay } from "@aihot/contracts/time";
import { apiGet, cachedPage, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import { ReportLayout } from "@aihot/web/features/report/ReportLayout";
import { dateLine } from "@aihot/web/features/report/format";
import { Rows, SectionPage, Story } from "@aihot/web/features/report/ReportPaper";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { TrendsIssue } from "../types.ts";
import { TITLE } from "./report-part";

export const handle: Screen = { tab: "daily", name: TITLE };
export { pageHeaders as headers } from "@aihot/web/lib/api.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const key = params.key ?? "";
  const [issue, { items: index }] = await Promise.all([
    loadOr404<TrendsIssue>(`/api/trends/${encodeURIComponent(key)}`, { signal: request.signal }),
    apiGet<ReportNavigationResponse>(`/api/site/reports/weekly/navigation/${encodeURIComponent(key)}`, { signal: request.signal }),
  ]);
  return cachedPage(600, { issue, index, today: beijingDate(Date.now()) });
}

/** 2026-10-17 → 10月17日, as the engine writes a day (monthDay). */
const day = (date: string) => monthDay(date);
const span = (i: TrendsIssue) => `${day(i.periodStart)} – ${day(i.periodEnd)}`;

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("该周不存在") }, { name: "robots", content: "noindex" }];
  const { issue } = data;
  return pageMeta({
    title: `${TITLE} · ${span(issue)}`,
    description: issue.topics.map((t) => t.heading).join("；"),
    path: `/trends/${issue.key}`,
    type: "article",
  });
}

export default function TrendsIssueRoute() {
  const { issue, index, today } = useLoaderData<typeof loader>();
  return (
    <ReportLayout kind="weekly" index={index} current={issue.key} today={today} back={{ to: `/weekly/${issue.key}`, label: "周报" }} title={TITLE}>
      <article className="@container [overflow-wrap:anywhere] [&_section>header>.num]:shrink-0">
        <header className="pt-5 lg:pt-0">
          <div className="flex items-center justify-between gap-4 text-[12px] text-ink-4">
            <span>{`${SITE.name} · ${withSubject("周报")}`}</span>
            <span className="num">{dateLine("weekly", issue.key)}</span>
          </div>
          <div className="py-6 @[880px]:py-8">
            <h1 id="report-start" data-page-title="" className="text-[32px] font-black leading-[1.28] tracking-[-0.03em] text-ink [text-wrap:balance] @[520px]:text-[40px] @[1040px]:text-[48px] @[1040px]:leading-[1.22]">{TITLE}</h1>
            <p className="mt-4 max-w-[46em] text-[16.5px] leading-[1.9] text-ink-2 @[560px]:text-justify @[880px]:text-[17.5px]">
              这一周里，三家以上的来源各自谈到同一件事。每个来源一句，只转述该原文的内容，不替它们下结论；点击标题查看本站收录的条目，点击「原文」查看原文。
            </p>
          </div>
          <div aria-hidden="true" className="border-t border-line-strong" />
        </header>
        {issue.topics.map((t, i) => (
          <SectionPage key={i} id={`t-${i + 1}`} no={i + 1} label={t.heading}>
            <Rows items={t.items}>{(c, cell) => <Story key={c.itemId ?? c.sourceUrl} c={c} dated className={cell} />}</Rows>
          </SectionPage>
        ))}
      </article>
    </ReportLayout>
  );
}
