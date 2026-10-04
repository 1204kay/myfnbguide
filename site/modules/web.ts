// What the site's modules add to the web pages (site/modules/index.ts).
import type { WebModule } from "@aihot/web/modules";
import reference from "@aihot/reference/web";

export const WEB_MODULES: readonly WebModule[] = [reference];
