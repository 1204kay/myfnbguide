// What the api answers the trends pages (backend/read.ts).
import type { ReportCitation } from "@aihot/contracts/site";

export interface TrendsIssue {
  key: string;
  periodStart: string;
  periodEnd: string;
  topics: Array<{ heading: string; items: ReportCitation[] }>;
}
