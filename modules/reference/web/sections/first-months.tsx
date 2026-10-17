// The pictures of the sections of first-months (sections/index.ts keys them by "first-months/<cause key>").
import { text, strong, accent, soft, type Section } from "./kit";

/** 试营业: before the opening day, a trial run and a soft opening, each testing something. */
function TryFirst() {
  const points: Array<[number, string, string]> = [[60, "试做", "练熟做法和批量"], [175, "试营业", "看菜单和流程"], [280, "正式开业", ""]];
  return (
    <svg viewBox="0 0 320 112" role="img" aria-label="示意图：正式开业以前，先试做，练熟做法和批量；再试营业，看菜单和流程" className="block w-full">
      <rect x="4" y="2" width="232" height="26" rx="6" style={soft} />
      <text x="120" y="20" textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>开业以前先试一次</text>
      <path d="M10 50 H310" style={{ stroke: "var(--line-strong)", strokeWidth: 2 }} />
      {points.map(([x, name, what], i) => (
        <g key={name}>
          <circle cx={x} cy="50" r={i === 2 ? 8 : 6} style={i === 2 ? { fill: accent } : { fill: "var(--surface)", stroke: accent, strokeWidth: 2 }} />
          <text x={x} y="78" textAnchor="middle" style={i === 2 ? { ...strong, fill: accent } : strong}>{name}</text>
          {what && <text x={x} y="102" textAnchor="middle" style={text}>{what}</text>}
        </g>
      ))}
    </svg>
  );
}

/** 根据数字调整: guests hour by hour (only a shape); the last hour has few, so the shop closes earlier. */
function CloseEarlier() {
  const hours: Array<[string, number]> = [["17 点", 34], ["18 点", 66], ["19 点", 80], ["20 点", 58], ["21 点", 24], ["22 点", 10]];
  const x = (i: number) => 8 + i * 52;
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="示意图：每小时的客人，晚上最后一个小时客人很少，于是提前打烊" className="block w-full">
      <text x="0" y="16" style={text}>每小时的客人</text>
      <rect x={x(5) - 6} y="26" width="54" height="94" rx="6" style={{ ...soft, fill: "none", strokeDasharray: "4 3" }} />
      <text x="316" y="16" textAnchor="end" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>提前打烊</text>
      {hours.map(([h, n], i) => (
        <g key={h}>
          <rect x={x(i)} y={116 - n} width="36" height={n} rx="4" style={{ fill: accent, opacity: i === 5 ? 0.25 : 0.55 }} />
          <text x={x(i) + 18} y="140" textAnchor="middle" style={text}>{h.replace(" ", " ")}</text>
        </g>
      ))}
      <path d="M0 116 H320" style={{ stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "soft-opening": { kind: "示意", caption: "正式开业以前先试一次：先试做，练熟做法和一次做多份；再试营业，看菜单和流程走不走得通。有的店办几场快闪，有的店主先去同类的店做一段时间。", draw: () => <TryFirst /> },
  adjust: { kind: "示意", caption: "开业以后按实际的客流调整：看出哪个时段客人少，就把打烊时间提前，或把菜单改得简单一些。柱子只表示多少，不是实际人数。", draw: () => <CloseEarlier /> },
};
