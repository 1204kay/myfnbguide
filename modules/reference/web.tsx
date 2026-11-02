// The reference library on every page: its entry in the sidebar and a tab on phones, as the engine gives a module;
// on every item page, the situation it is placed in under its three parts (web/item-part.tsx); and its MCP tools on the agent page.
import type { WebModule } from "@aihot/web/modules";
import { IconGrid } from "@aihot/web/components/icons";

export default {
  name: "reference",
  sidebar: { section: "内容", items: [{ to: "/reference", label: "参考", icon: IconGrid }] },
  tabs: [{ key: "reference", to: "/reference", label: "参考", icon: IconGrid }],
  itemPart: () => import("./web/item-part"),
  // Its MCP tools on the agent page (web/agent-part.ts).
  agent: () => import("./web/agent-part"),
} satisfies WebModule;
