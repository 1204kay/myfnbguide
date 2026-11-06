// 金额旁边补美元（Kay 11-06，backend/convert.ts 文件头）。网页、日报、参考页、RSS、给 Agent 读的接口都从 api 读，
// 所以只在 api 回应发出去之前补一次（onSend），框架的文件一个都不改，库里存的文字也不改。管理后台、上传、图片不碰。
// 汇率每小时第 17 分钟看一次，存的那份满 12 小时才重新取（backend/rates.ts）：刚部署、取失败过，都在一小时内补上。
//
// 带 ETag 的回应：补过美元的，ETag 后面加上汇率日期（W/"abc" → W/"abc.usd-2026-11-05"），汇率一换，浏览器手上的旧版就
// 对不上、会重新取；请求带回来的 If-None-Match 先去掉这个尾巴再交给原来的路由比对，日期不是当天的就整个去掉。
import type { FastifyReply, FastifyRequest } from "fastify";
import { defineServerModule } from "@aihot/backend/modules";
import { addUsdToJson, addUsdToText, mayHaveMoney } from "./backend/convert.ts";
import { currentRates, refreshRates } from "./backend/rates.ts";

const SKIP = /^\/api\/(?:admin|auth|ingest|og|media|img-proxy|health)(?:\/|$)/;
const TEXTUAL = /^(?:application\/(?:json|rss\+xml|atom\+xml|xml|feed\+json)|text\/)/i;
const TAIL = /\.usd-(\d{4}-\d{2}-\d{2})(?=")/;

const tagged = new WeakSet<FastifyRequest>();

// 只补 GET。MCP 的工具调用是 POST，回应是 SDK 给的流（可能是 SSE，apps/api/src/routes/mcp.ts respond），读进来改会拖住
// 流，所以 MCP 不补；同样的内容在 /api/v1/agent/* 是补过的。
function wanted(req: FastifyRequest): boolean {
  return (req.method === "GET" || req.method === "HEAD") && !SKIP.test((req.raw.url ?? "/").split("?")[0] ?? "/");
}

function withTail(etag: string, date: string): string {
  return etag.endsWith('"') ? `${etag.slice(0, -1)}.usd-${date}"` : `${etag}.usd-${date}`;
}

async function onRequest(req: FastifyRequest): Promise<void> {
  const inm = req.headers["if-none-match"];
  if (typeof inm !== "string" || !TAIL.test(inm)) return;
  const rates = await currentRates();
  const m = inm.match(TAIL);
  if (rates && m?.[1] === rates.date) {
    req.headers["if-none-match"] = inm.replace(new RegExp(TAIL.source, "g"), "");
    tagged.add(req);
  } else {
    delete req.headers["if-none-match"];
  }
}

async function onSend(req: FastifyRequest, reply: FastifyReply, payload: unknown): Promise<unknown> {
  if (!wanted(req)) return payload;
  const rates = await currentRates();
  if (!rates) return payload;
  const etag = reply.getHeader("etag");
  if (reply.statusCode === 304) {
    if (tagged.has(req) && typeof etag === "string") reply.header("ETag", withTail(etag, rates.date));
    return payload;
  }
  if (typeof payload !== "string" || reply.statusCode !== 200 || !mayHaveMoney(payload)) return payload;
  const type = String(reply.getHeader("content-type") ?? "");
  if (!TEXTUAL.test(type)) return payload;
  let out: string;
  if (/json/i.test(type)) {
    try {
      const parsed: unknown = JSON.parse(payload);
      const next = JSON.stringify(addUsdToJson(parsed, rates.perUsd));
      // 一个都没补的，原样发出去，不让重新序列化改动别的地方。
      out = next === JSON.stringify(parsed) ? payload : next;
    } catch {
      return payload;
    }
  } else {
    out = addUsdToText(payload, rates.perUsd);
  }
  if (out === payload) return payload;
  if (typeof etag === "string") reply.header("ETag", withTail(etag, rates.date));
  return out;
}

export default defineServerModule({
  name: "usd",
  http: (app) => {
    app.addHook("onRequest", onRequest);
    app.addHook("onSend", onSend);
  },
  schedules: [{
    name: "usd.rates",
    cron: "17 * * * *",
    missed: "once",
    run: async () => {
      if (process.env.COLLECT_ENABLED !== "true") return { skipped: "collection is off (COLLECT_ENABLED)" };
      return refreshRates();
    },
  }],
});
