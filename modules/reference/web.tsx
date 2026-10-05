// The reference library on every page: its entry in the sidebar and a tab on phones (both lead to / while the
// site shows the library there, site.ts NAV.home), its section of a search's results and its block on an item page.
import type { WebModule } from "@aihot/web/modules";
import { IconGrid } from "@aihot/web/components/icons";

export default {
  name: "reference",
  sidebar: { section: "内容", items: [{ to: "/reference", label: "参考", icon: IconGrid }] },
  tabs: [{ key: "reference", to: "/reference", label: "参考", icon: IconGrid }],
  searchPart: () => import("./web/search"),
  itemPart: () => import("./web/item-part"),
} satisfies WebModule;
