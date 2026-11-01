// 日报正文「整天一起挑」（Kay 10-26 06:20「照改」，手册 评分标准 §4）：原版按分数给每件事排序、取前 12 条；这里改成每天一次调用，
// 把当天加前两天还没上过日报的事件（编号、来源、标题、导读，顺序打乱、不给分数）一起交给模型，让它直接挑出最多 12 条。
// 旧收录影子 7 天（10-06 到 10-15）Kay 盲挑：实际日报 0 天，只看当天 3 天，三天池 4 天。提示词就是影子用的那一份（myfnb/eval-listwise.ts）；
// 池子不完全一样：这里是框架 dailyEdition 的事件（前 7 天日报上过的稿不再给，一件事一条代表稿），影子是每篇稿单列、只去掉前几天正文上过的。
// 模型的 JSON 坏了再问，最多 ATTEMPTS 次；还是不行，或者挑出来的一条都对不上，日报照原版的规则排（reports/compose.ts pickedDaily）。
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import type { DailyPick, DailyPickAsk } from "@aihot/backend/modules";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson } from "@aihot/backend/providers/llm";
import { ModelOutputError } from "@aihot/backend/providers/receipts";
import { MAIN_ENTRIES } from "@aihot/backend/reports/edition";

export const PICK_STEP = "dailyPick";
export const PICK_PURPOSE = "daily_pick";
/** 当天加前两天（Kay 10-25 19:40「以过往来说 3天里挑出 大概率足够」；10-26 选三天池）。 */
export const PICK_DAYS = 3;
/** 影子里 v4-pro 3 天池 10-23 那次 JSON 坏了（评分标准 §4）；再问两次。 */
const ATTEMPTS = 3;

const SYSTEM = promptFromText("dailypick/pick", readFileSync(new URL("../prompts/pick.md", import.meta.url), "utf8").trimEnd());
const VERSION = `dailypick@${createHash("sha256").update(SYSTEM).digest("hex").slice(0, 10)}`;
const Schema = z.object({ picks: z.array(z.object({ n: z.number().int(), why: z.string() })) });

// 打乱：按条目 id 的哈希排，同一来源不扎堆、不按分数，同一池每次顺序相同（和影子一样）。
const hash = (id: string) => createHash("sha1").update(id).digest("hex");

export async function pickDaily({ date, entries }: DailyPickAsk): Promise<DailyPick | null> {
  if (entries.length === 0) return null;
  const list = [...entries].sort((a, b) => hash(a.entry.itemId).localeCompare(hash(b.entry.itemId)));
  const user = list.map((e, i) => `${i + 1}. 【${e.entry.sourceName}】${e.entry.title}\n   ${e.entry.summary.replace(/\s+/g, " ")}`).join("\n");
  const model = await modelFor(PICK_STEP);
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await chatJson({
        model, purpose: PICK_PURPOSE, subject: `daily:${date}`, promptVersion: VERSION, attemptTag: attempt > 1 ? `retry-${attempt}` : undefined,
        system: SYSTEM, user, schema: Schema, temperature: 0, maxTokens: 16000, timeoutMs: 300_000,
      });
      const itemIds = res.data.picks.map((p) => list[p.n - 1]?.entry.itemId).filter((id): id is string => !!id).slice(0, MAIN_ENTRIES);
      return { itemIds, model: res.model, receiptIds: [res.receiptId] };
    } catch (error) {
      if (!(error instanceof ModelOutputError) || attempt >= ATTEMPTS) throw error;
    }
  }
}
