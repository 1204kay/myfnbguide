// The backend of the site's modules, installed by the api and the worker when they start (site/modules/index.ts).
import type { ServerModule } from "@aihot/backend/modules";
import archive from "@aihot/archive/server";
import checker from "@aihot/checker/server";
import reference from "@aihot/reference/server";
import social from "@aihot/social/server";
import trends from "@aihot/trends/server";

export const SERVER_MODULES: readonly ServerModule[] = [reference, archive, social, checker, trends];
