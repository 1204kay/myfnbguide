// Groups every situation whose stories changed now, instead of at the schedule's next 05:00 (server.ts): after
// a release that changed the stories or the grouping's prompt, once the stories are written again (the status
// api's waiting is 0). Paid calls through the engine's receipts and budget like the schedule's; a line a situation.
//   sudo docker compose exec -T -u root worker node modules/reference/group-now.ts
import { closeDb } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import reference from "./server.ts";
import { SITUATIONS } from "./situations.ts";
import { membersBySituation } from "./backend/read.ts";
import { groupSituation, situationsToGroup } from "./backend/methods.ts";

installModules([reference]);
for (const [slug, members] of await situationsToGroup(await membersBySituation(), SITUATIONS.length)) {
  const result = await groupSituation(slug, members);
  console.log(`${slug}: ${members.length} 篇，${result?.stored ? "已归并" : `未通过：${result?.problems.slice(0, 3).join("；")}`}`);
}
await closeDb();
