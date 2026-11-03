// The pictures of the sections of inventory (sections/index.ts keys them by "inventory/<cause key>").
import { text, strong, accent, box, soft, Eg, type Section } from "./kit";

/** 订多少: what is used before the next delivery plus a buffer, less what is on the shelf, is what to order. */
function OrderMath() {
  const k = 250 / 42;
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="举例：到货前需用 30 公斤，留 12 公斤缓冲，现有库存 10 公斤，需订购 32 公斤" className="block w-full">
      <text x="0" y="16" style={text}>所需数量</text>
      <rect x="0" y="24" width={30 * k} height="32" rx="6" style={{ fill: accent, opacity: 0.45 }} />
      <rect x={30 * k} y="24" width={12 * k} height="32" rx="6" style={{ ...soft, strokeDasharray: "4 3" }} />
      <text x={15 * k} y="45" textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 14, fontWeight: 600 }}>用量 30&nbsp;公斤</text>
      <text x={36 * k} y="45" textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 600 }}>缓冲 12</text>
      <text x="0" y="82" style={text}>现有库存与订购量</text>
      <rect x="0" y="90" width={10 * k} height="32" rx="6" style={{ fill: "var(--ink-4)", opacity: 0.3 }} />
      <rect x={10 * k} y="90" width={32 * k} height="32" rx="6" style={{ fill: accent }} />
      <path d={`M${10 * k} 90 V122`} style={{ stroke: "var(--surface)", strokeWidth: 2 }} />
      <text x={5 * k} y="111" textAnchor="middle" style={{ fill: "var(--ink-2)", fontSize: 14 }}>现有 10</text>
      <text x={26 * k} y="111" textAnchor="middle" style={{ fill: "var(--accent-contrast)", fontSize: 15, fontWeight: 700 }}>订 32&nbsp;公斤</text>
      <Eg x={258} y={111} />
      <text x="0" y="145" style={text}>用量 + 缓冲 − 现有库存 = 订购量</text>
    </svg>
  );
}

/** 盘点: a group of the stock counted each week on the same day, everything at the month's end. */
function CountingRounds() {
  const weeks: Array<[string, string]> = [["第 1 周", "A 组"], ["第 2 周", "B 组"], ["第 3 周", "C 组"], ["月底", "全部"]];
  return (
    <svg viewBox="0 0 320 126" role="img" aria-label="示意图：库存分成三组，每周固定一天轮着数一组，月底全部盘一次，再与按销量算出的用量核对" className="block w-full">
      {weeks.map(([when, what], i) => (
        <g key={when}>
          <text x={i * 82 + 37} y="16" textAnchor="middle" style={text}>{when}</text>
          <rect x={i * 82} y="26" width="74" height="38" rx="6" style={i === 3 ? { fill: accent } : box} />
          <text x={i * 82 + 37} y="50" textAnchor="middle" style={i === 3 ? { fill: "var(--accent-contrast)", fontSize: 15, fontWeight: 700 } : strong}>{what}</text>
        </g>
      ))}
      <text x="160" y="92" textAnchor="middle" style={{ ...text, fill: "var(--ink-2)" }}>每周同一天，按同一条路线数</text>
      <text x="160" y="118" textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>盘点结果与按销量算出的用量核对</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "how-much": { kind: "举例", caption: "假设你的餐饮店下次到货以前需用 30 公斤鸡肉，留 12 公斤做缓冲，现有库存 10 公斤，这次就订购 32 公斤。几家店按预约和过去的销量定出这个基准，再定期调整。", draw: () => <OrderMath /> },
  counting: { kind: "示意", caption: "几家店固定周期盘点：把库存分成几组，每周同一天按同一条路线轮流清点一组，月底再全部盘一次；清点出的用量与按销量或配方算出的用量核对，差异较大的再查明原因。", draw: () => <CountingRounds /> },
};
