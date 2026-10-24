// The weekly trends' addresses (modules/trends): one page a week and the api behind it.
import { defineModule } from "@aihot/contracts/modules";

export default defineModule({
  name: "trends",
  pages: [{ path: "trends/:key", file: "web/issue.tsx", id: "trends-issue" }],
  apiPaths: [/^\/api\/trends(?:\/|$)/],
});
