import { useLoaderData } from "react-router";
import type { Route } from "./+types/report-latest";
import type { ReportKind, ReportLatestPage } from "@aihot/contracts/site";
import { REPORTS, withSubject } from "@aihot/site";
import { edgeTtl, loadOr404, pageExpiresAt } from "../lib/api.server";
import { cachedLoader } from "../lib/page-reuse";
import { pageMeta, reportLd } from "../lib/seo";
import { beijingDate } from "@aihot/contracts/time";
import { EmptyState } from "../components/ui/Page";
import { IntentLink } from "../components/ui/IntentLink";
import { IconChevronRight } from "../components/icons";
import { ReportLayout } from "../features/report/ReportLayout";
import { ReportPaper, reportOutline } from "../features/report/ReportPaper";
import { KIND_LABEL, KIND_PATH, feedLink, kindFromPath } from "../features/report/format";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { tab: "daily", name: "日报" };
export { shouldRevalidate } from "../lib/page-reuse";
export const clientLoader = cachedLoader<typeof loader>();

export async function loader({ request }: Route.LoaderArgs) {
  const kind = kindFromPath(new URL(request.url).pathname);
  const { index, report } = await loadOr404<ReportLatestPage>(`/api/site/reports/${kind}/latest-page`, { signal: request.signal });
  return { kind, report, index, today: beijingDate(Date.now()), expiresAt: pageExpiresAt(600) };
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  const kind = loaderData?.kind ?? "daily";
  const description = `${REPORTS.descriptions[kind]}。`;
  const report = loaderData?.report;
  return [...pageMeta({
    title: withSubject(KIND_LABEL[kind]),
    description,
    path: location.pathname,
    image: `/og/pages/${kind}.png`,
    // The latest issue, described at this page's own address (its canonical).
    jsonLd: report ? reportLd(report, location.pathname, report.lead?.leadParagraph ?? description) : undefined,
  }), feedLink(kind)];
}

export function headers() {
  return edgeTtl(600);
}

/**
 * Before a kind's first issue: what it is (REPORTS.descriptions) and, for a weekly or monthly, the way to the
 * daily it is chosen from. The switch above still offers all three.
 */
function NoIssue({ kind }: { kind: ReportKind }) {
  const label = KIND_LABEL[kind];
  if (kind === "daily") return <EmptyState title={`还没有${label}`}>第一期编好以后会出现在这里。</EmptyState>;
  return (
    <EmptyState
      title={`还没有${label}`}
      action={
        <IntentLink to={KIND_PATH.daily} className="inline-flex min-h-11 items-center gap-0.5 text-[13.5px] font-medium text-accent transition-colors hover:text-accent-ink">
          看{KIND_LABEL.daily} <IconChevronRight size={14} />
        </IntentLink>
      }
    >
      {`${label}是${REPORTS.descriptions[kind]}；第一期编好以后会出现在这里。`}
    </EmptyState>
  );
}

export default function ReportLatestPage() {
  const { kind, report, index, today } = useLoaderData<typeof loader>();
  return (
    <ReportLayout kind={kind} index={index} current={report?.key ?? null} today={today} outline={report ? reportOutline(report) : []}>
      {report ? <ReportPaper report={report} index={index} /> : <NoIssue kind={kind} />}
    </ReportLayout>
  );
}
