// Where the engine's featured list lives (site/site.ts NAV.home): at / by default; at /latest when the site
// shows one of its modules' pages as its home page. The web's routes and navigation, the redirects and the
// backend's feeds, llms.txt and sitemap all read it here.
import { NAV } from "@aihot/site";
import { MODULES } from "@aihot/site/modules";
import type { ModulePage } from "./modules.ts";

/** The module page the site shows at / (NAV.home), with its module; null when the featured list is the home page. */
export function homePage(): { module: string; page: ModulePage } | null {
  if (!NAV.home) return null;
  for (const m of MODULES) {
    for (const entry of m.pages ?? []) {
      for (const page of "layout" in entry ? entry.pages : [entry]) if (page.id === NAV.home) return { module: m.name, page };
    }
  }
  throw new Error(`site.ts NAV.home: no module page has the id "${NAV.home}"`);
}

/** The featured list's address. */
export function feedPath(): "/" | "/latest" {
  return NAV.home ? "/latest" : "/";
}
