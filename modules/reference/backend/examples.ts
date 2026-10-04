// Worked examples ("假设你的餐饮店"): the writer chooses the kind and gives the inputs; every result here
// is computed, so a story never carries arithmetic a model did in its head. Made-up numbers in 元 and 份,
// for any kind of shop (the user's choice, 10/4).
import { z } from "zod";
import { num } from "../format.ts";
import type { ExampleBlock, ExampleKind } from "../types.ts";

const amount = z.coerce.number().finite().positive();
const label = z.string().trim().min(1).max(30);

export const ExampleInputSchema = z.discriminatedUnion("kind", [
  /** One portion: price and food cost. */
  z.object({ kind: z.literal("margin"), price: amount, cost: amount }),
  /** How many portions a month cover the fixed costs. */
  z.object({ kind: z.literal("breakeven"), price: amount, cost: amount, fixed: amount }),
  /** What is left of one sale after each deduction, given in 元 or as a percent of the price. */
  z.object({ kind: z.literal("remainder"), price: amount, deductions: z.array(z.object({ label, value: amount.optional(), percent: amount.max(100).optional() })).min(1).max(5) }),
  /** A small difference times how often it happens. */
  z.object({ kind: z.literal("multiply"), a: z.object({ label, value: amount, unit: z.string().trim().min(1).max(6) }), b: z.object({ label, value: amount, unit: z.string().trim().min(1).max(6) }), resultLabel: label, resultUnit: z.string().trim().min(1).max(6) }),
  /** A list of monthly (or weekly) charges, some flagged as no longer needed. */
  z.object({ kind: z.literal("list-total"), per: z.enum(["月", "周"]), items: z.array(z.object({ label, value: amount, flag: z.boolean().optional() })).min(2).max(9) }),
  /** A cost share above its target, in money over a month's sales. */
  z.object({ kind: z.literal("percent-over"), sales: amount, target: amount.max(100), actual: amount.max(100) }),
]);

export type ExampleInput = z.infer<typeof ExampleInputSchema>;

const pct = (part: number, whole: number) => Math.round((part / whole) * 1000) / 10;
const SCALE: Record<string, [string, number]> = { 克: ["公斤", 1000], 毫升: ["升", 1000] };

/** The figure for an example: its rows, its worked line and its result, from the writer's inputs. */
export function computeExample(input: ExampleInput, caption: string): ExampleBlock {
  const base = { type: "example" as const, kind: input.kind as ExampleKind, caption };
  switch (input.kind) {
    case "margin": {
      const margin = input.price - input.cost;
      return { ...base, equation: null,
        rows: [{ label: "食材", value: input.cost, unit: "元", share: input.cost / input.price }, { label: "毛利", value: margin, unit: "元", share: Math.max(margin, 0) / input.price }],
        result: `一份卖 ${num(input.price)} 元，食材 ${num(input.cost)} 元，毛利 ${num(margin)} 元，占售价的 ${num(pct(margin, input.price))}%` };
    }
    case "breakeven": {
      const margin = input.price - input.cost;
      if (margin <= 0) throw new Error("breakeven: the price must be above the food cost");
      const units = Math.ceil(input.fixed / margin);
      return { ...base,
        rows: [{ label: "每月固定费用", value: input.fixed, unit: "元", share: null }, { label: "每份毛利", value: margin, unit: "元", share: null }],
        equation: `${num(input.fixed)} 元 ÷ 每份 ${num(margin)} 元 = ${num(units)} 份`,
        result: `一个月至少要卖 ${num(units)} 份，平均每天约 ${num(Math.ceil(units / 30))} 份` };
    }
    case "remainder": {
      const taken = input.deductions.map((d) => {
        if ((d.value === undefined) === (d.percent === undefined)) throw new Error(`remainder: ${d.label} needs a value or a percent`);
        return { label: d.label, value: d.value ?? (input.price * d.percent!) / 100 };
      });
      const left = input.price - taken.reduce((sum, d) => sum + d.value, 0);
      return { ...base, equation: null,
        rows: [...taken.map((d) => ({ ...d, unit: "元", share: d.value / input.price })), { label: "剩下", value: left, unit: "元", share: Math.max(left, 0) / input.price }],
        result: `一份卖 ${num(input.price)} 元，扣掉${taken.map((d) => d.label).join("、")}，剩 ${num(left)} 元` };
    }
    case "multiply": {
      const [scaled, factor] = SCALE[input.a.unit]?.[0] === input.resultUnit ? SCALE[input.a.unit]! : [input.resultUnit, 1];
      const product = (input.a.value * input.b.value) / factor;
      return { ...base,
        rows: [{ label: input.a.label, value: input.a.value, unit: input.a.unit, share: null }, { label: input.b.label, value: input.b.value, unit: input.b.unit, share: null }],
        equation: `${input.a.label} ${num(input.a.value)} ${input.a.unit} × ${num(input.b.value)} ${input.b.unit} = ${num(product)} ${scaled}`,
        result: `${input.resultLabel} ${num(product)} ${scaled}` };
    }
    case "list-total": {
      const total = input.items.reduce((sum, i) => sum + i.value, 0);
      const times = input.per === "月" ? 12 : 52;
      const max = Math.max(...input.items.map((i) => i.value));
      const flagged = input.items.filter((i) => i.flag).reduce((sum, i) => sum + i.value, 0);
      return { ...base, equation: null,
        rows: input.items.map((i) => ({ label: i.label, value: i.value, unit: "元", share: i.value / max, ...(i.flag ? { flag: true } : {}) })),
        result: `每${input.per} ${num(total)} 元，一年 ${num(total * times)} 元${flagged ? `；标出的几项一年 ${num(flagged * times)} 元` : ""}` };
    }
    case "percent-over": {
      const over = (input.sales * (input.actual - input.target)) / 100;
      return { ...base, equation: null,
        rows: [{ label: "应该占", value: input.target, unit: "%", share: input.target / 100 }, { label: "实际占", value: input.actual, unit: "%", share: input.actual / 100, ...(input.actual > input.target ? { flag: true } : {}) }],
        result: over > 0
          ? `一个月营业额 ${num(input.sales)} 元，占到 ${num(input.actual)}%，就比 ${num(input.target)}% 多花 ${num(over)} 元`
          : `一个月营业额 ${num(input.sales)} 元，占 ${num(input.actual)}%，没有超过 ${num(input.target)}%` };
    }
  }
}

/** Every number an example shows, for checking its caption: the inputs and what was computed from them. */
export function exampleNumbers(block: ExampleBlock): string[] {
  return [...block.rows.map((r) => num(r.value)), ...[block.equation ?? "", block.result].flatMap((t) => t.match(/[\d,.]+/g) ?? [])];
}
