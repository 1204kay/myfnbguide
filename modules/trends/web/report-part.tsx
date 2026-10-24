// The line at the foot of a weekly whose week has trends (backend/read.ts readWeekLine), in the report's own
// page frame (SectionPage) and link style; nothing for dailies, monthlies or a week with none.
import { IntentLink } from "@aihot/web/components/ui/IntentLink";
import type { ReportPart } from "@aihot/web/modules";
import { SectionPage } from "@aihot/web/features/report/ReportPaper";

export const TITLE = "这周几家都在讲";

function Block({ data }: { kind: string; reportKey: string; data: unknown }) {
  const line = data as { key: string; topics: number } | null;
  if (!line) return null;
  return (
    <div className="@container">
      <SectionPage id="s-trends" label={TITLE}>
        <IntentLink viewTransition to={`/trends/${line.key}`} className="group flex items-baseline justify-between gap-4 border-b border-line py-5">
          <span className="text-[15.5px] leading-[1.8] text-ink-2 transition-colors group-hover:text-accent">
            这一周有 <span className="num">{line.topics}</span> 件事，三家以上的来源各自讲到，每家一句，原话都附在下面
          </span>
          <span className="shrink-0 text-[13px] text-accent">看这一周 ›</span>
        </IntentLink>
      </SectionPage>
    </div>
  );
}

export default {
  path: (kind, key) => (kind === "weekly" ? `/api/trends/${encodeURIComponent(key)}/line` : null),
  Block,
} satisfies ReportPart;
