// The line at the foot of a weekly whose week has trends (backend/read.ts readWeekLine), in the report's own
// page frame (SectionPage) and link style; nothing for dailies, monthlies or a week with none.
import { IconChevronRight } from "@aihot/web/components/icons";
import { IntentLink } from "@aihot/web/components/ui/IntentLink";
import type { ReportPart } from "@aihot/web/modules";
import { SectionPage } from "@aihot/web/features/report/ReportPaper";

export const TITLE = "本周多家来源共同提及";

function Block({ data }: { kind: string; reportKey: string; data: unknown }) {
  const line = data as { key: string; topics: number } | null;
  if (!line) return null;
  return (
    <div className="@container">
      <SectionPage id="s-trends" label={TITLE}>
        <IntentLink viewTransition to={`/trends/${line.key}`} className="group flex items-baseline justify-between gap-4 border-b border-line py-5">
          <span className="text-[15.5px] leading-[1.8] text-ink-2 transition-colors group-hover:text-accent">
            这一周有 <span className="num">{line.topics}</span> 件事，三家以上的来源各自谈到；每个来源一句，并附原文出处
          </span>
          {/* The look of the engine's MoreLink (components/ui/Page.tsx): the whole row is the link. */}
          <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[12px] font-semibold text-accent group-hover:text-accent-ink">查看本周详情 <IconChevronRight size={13} /></span>
        </IntentLink>
      </SectionPage>
    </div>
  );
}

export default {
  path: (kind, key) => (kind === "weekly" ? `/api/trends/${encodeURIComponent(key)}/line` : null),
  Block,
} satisfies ReportPart;
