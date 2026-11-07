// The library's and 十一说's MCP tools in the agent page's tool table (features/agent/panels.tsx), as the server
// module adds them (backend/agent.ts).
import { mcpToolName } from "@aihot/contracts/mcp";
import type { AgentPart } from "@aihot/web/modules";

export default {
  tools: [
    { name: mcpToolName("get_reference"), does: "参考库：按遇到的情况查找各地店家的做法，收录范围从开站至今", ask: "各地小店如何应对过高的房租？" },
    { name: mcpToolName("get_shiyi"), does: "十一说：本站自己编写的节目，最新一期或指定一期", ask: "今日的十一说谈到了哪些内容？" },
  ],
} satisfies AgentPart;
