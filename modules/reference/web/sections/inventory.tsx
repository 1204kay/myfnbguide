// The pictures of the sections of inventory (sections/index.ts keys them by "inventory/<cause key>").
import { text, strong, accent, box, soft, hot, Eg, type Section } from "./kit";

/** 订多少: what is used before the next delivery plus a buffer, less what is on the shelf, is what to order. */
function OrderMath() {
  const k = 250 / 42;
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="举例：到货前要用 30 公斤，留 12 公斤缓冲，架上还有 10 公斤，要订 32 公斤" className="block w-full">
      <text x="0" y="16" style={text}>要准备的</text>
      <rect x="0" y="24" width={30 * k} height="32" rx="6" style={{ fill: accent, opacity: 0.45 }} />
      <rect x={30 * k} y="24" width={12 * k} height="32" rx="6" style={{ ...soft, strokeDasharray: "4 3" }} />
      <text x={15 * k} y="45" textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 14, fontWeight: 600 }}>要用 30&nbsp;公斤</text>
      <text x={36 * k} y="45" textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 600 }}>缓冲 12</text>
      <text x="0" y="82" style={text}>架上有的和要订的</text>
      <rect x="0" y="90" width={10 * k} height="32" rx="6" style={{ fill: "var(--ink-4)", opacity: 0.3 }} />
      <rect x={10 * k} y="90" width={32 * k} height="32" rx="6" style={{ fill: accent }} />
      <path d={`M${10 * k} 90 V122`} style={{ stroke: "var(--surface)", strokeWidth: 2 }} />
      <text x={5 * k} y="111" textAnchor="middle" style={{ fill: "var(--ink-2)", fontSize: 14 }}>有 10</text>
      <text x={26 * k} y="111" textAnchor="middle" style={{ fill: "var(--accent-contrast)", fontSize: 15, fontWeight: 700 }}>订 32&nbsp;公斤</text>
      <Eg x={258} y={111} />
      <text x="0" y="145" style={text}>要用 + 缓冲 − 架上有的 = 要订的</text>
    </svg>
  );
}

/** 盘点: a group of the stock counted each week on the same day, everything at the month's end. */
function CountingRounds() {
  const weeks: Array<[string, string]> = [["第 1 周", "A 组"], ["第 2 周", "B 组"], ["第 3 周", "C 组"], ["月底", "全部"]];
  return (
    <svg viewBox="0 0 320 126" role="img" aria-label="示意图：库存分成三组，每周固定一天轮着数一组，月底全部盘一次，再和销量算出的用量对一对" className="block w-full">
      {weeks.map(([when, what], i) => (
        <g key={when}>
          <text x={i * 82 + 37} y="16" textAnchor="middle" style={text}>{when}</text>
          <rect x={i * 82} y="26" width="74" height="38" rx="6" style={i === 3 ? { fill: accent } : box} />
          <text x={i * 82 + 37} y="50" textAnchor="middle" style={i === 3 ? { fill: "var(--accent-contrast)", fontSize: 15, fontWeight: 700 } : strong}>{what}</text>
        </g>
      ))}
      <text x="160" y="92" textAnchor="middle" style={{ ...text, fill: "var(--ink-2)" }}>每周同一天，按同一条路线数</text>
      <text x="160" y="118" textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>数出来的，和销量算出的用量对一对</text>
    </svg>
  );
}

/** 收货和账单: each line of what was ordered, what came and what the bill says, checked; one line does not match. */
function CheckLines() {
  const cols = [100, 165, 230];
  const rows: Array<[string, boolean]> = [["鸡肉", true], ["青菜", false], ["大米", true]];
  const ok = (cx: number, cy: number) => (
    <g key={`${cx}-${cy}`}>
      <circle cx={cx} cy={cy} r="10" style={{ fill: "var(--accent-soft)", stroke: accent, strokeWidth: 1.2 }} />
      <path d={`M${cx - 4.5} ${cy} l3 3 l6 -6.5`} style={{ fill: "none", stroke: accent, strokeWidth: 2, strokeLinecap: "round" }} />
    </g>
  );
  return (
    <svg viewBox="0 0 320 168" role="img" aria-label="示意图：每一样货逐行核对订的、送来的和账单上的，青菜一行账单多算了" className="block w-full">
      {["订的", "送来的", "账单上的"].map((h, i) => <text key={h} x={cols[i]} y="16" textAnchor="middle" style={text}>{h}</text>)}
      {rows.map(([name, right], r) => {
        const cy = r * 38 + 48;
        return (
          <g key={name}>
            {r > 0 && <path d={`M0 ${cy - 19} H320`} style={{ stroke: "var(--line-soft)", strokeWidth: 1 }} />}
            <text x="0" y={cy + 5} style={strong}>{name}</text>
            {ok(cols[0]!, cy)}
            {ok(cols[1]!, cy)}
            {right ? ok(cols[2]!, cy) : (
              <g>
                <circle cx={cols[2]} cy={cy} r="10" style={{ fill: "none", stroke: hot, strokeWidth: 1.5 }} />
                <path d={`M${cols[2]! - 4} ${cy - 4} l8 8 m0 -8 l-8 8`} style={{ stroke: hot, strokeWidth: 2, strokeLinecap: "round" }} />
                <text x="250" y={cy + 5} style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>多算了</text>
              </g>
            )}
          </g>
        );
      })}
      <text x="0" y="162" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>收货时点清，账单逐行对</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "how-much": { kind: "举例", caption: "假设你的餐饮店下次到货以前要用 30 公斤鸡肉，留 12 公斤做缓冲，架上还有 10 公斤，这次就订 32 公斤。几家店按预约和过去的销量定出这个基准，再定期调整。", draw: () => <OrderMath /> },
  counting: { kind: "示意", caption: "几家店固定周期盘点：把库存分成几组，每周同一天按同一条路线轮着数一组，月底再全部盘一次；数出来的用量和销量或配方算出的用量对一对，差得多的再查原因。", draw: () => <CountingRounds /> },
  "deliveries-invoices": { kind: "示意", caption: "收货时把送来的货和订的逐样点清，账单到了再逐行对一遍，多算、少送的地方当场就能看出来。", draw: () => <CheckLines /> },
};
