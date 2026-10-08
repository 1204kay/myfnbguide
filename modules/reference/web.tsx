// The reference library on every page: its entry in the sidebar and a tab on phones, as the engine gives a module;
// and on every item page, the 正文 · AI 整理自原文 under the summary (web/item-part.tsx).
import type { WebModule } from "@aihot/web/modules";
import { IconGrid } from "@aihot/web/components/icons";

export default {
  name: "reference",
  sidebar: { section: "内容", items: [{ to: "/reference", label: "参考", icon: IconGrid }] },
  tabs: [{ key: "reference", to: "/reference", label: "参考", icon: IconGrid }],
  itemPart: () => import("./web/item-part"),
} satisfies WebModule;
