// The MCP tool names, from the site's prefix (site/site.ts): llms.txt, the agent page and the server
// list the same names. One tool per ability of /api/v1/agent that MCP_TOOLS offers; a module's tools
// follow the engine's.
import { NAV, SITE } from "@aihot/site";

/** A tool's full name: the site's prefix, then what it does ("get_latest"). */
export const mcpToolName = (tool: string): string => `${SITE.mcpPrefix}_${tool}`;

export const MCP_TOOL_NAMES = {
  latest: mcpToolName("get_latest"),
  search: mcpToolName("search"),
  hot: mcpToolName("get_hot_topics"),
  story: mcpToolName("get_story"),
  daily: mcpToolName("get_daily"),
  weekly: mcpToolName("get_weekly"),
  monthly: mcpToolName("get_monthly"),
} as const;

/**
 * The engine's tools, in the order the server lists them. Without the hot list's two while the site keeps 热点 out
 * of its navigation (site.ts NAV.hidden): Agents are not pointed at a list the site does not show; its pages and
 * HTTP addresses still answer.
 */
const HOT_SHOWN = !NAV.hidden.includes("/hot");
export const MCP_TOOLS = Object.values(MCP_TOOL_NAMES)
  .filter((name) => HOT_SHOWN || (name !== MCP_TOOL_NAMES.hot && name !== MCP_TOOL_NAMES.story))
  .map((name) => ({ name }));
