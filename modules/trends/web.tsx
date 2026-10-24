// The weekly trends on the web: a line at the foot of each weekly that has them (web/report-part.tsx), leading to the
// week's page (web/issue.tsx). No sidebar entry and no tab (十一 10-24: 入口放周报页底部).
import type { WebModule } from "@aihot/web/modules";

export default {
  name: "trends",
  reportPart: () => import("./web/report-part"),
} satisfies WebModule;
