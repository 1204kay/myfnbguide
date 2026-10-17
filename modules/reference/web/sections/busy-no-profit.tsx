// The pictures of the sections of busy-no-profit (sections/index.ts keys them by "busy-no-profit/<cause key>").
import { text, strong, hot, accent, Eg, type Section } from "./kit";

/** 食材用得比配方多: the portion the recipe says against the one served in a rush; the extra in red. */
function OverPortion() {
  const x = (g: number) => 64 + (g / 120) * 200;
  return (
    <svg viewBox="0 0 320 112" role="img" aria-label="举例：配方一份 100 克，实际装了 120 克，多装 20 克" className="block w-full">
      <text x="0" y="41" style={text}>配方</text>
      <rect x="64" y="24" width={x(100) - 64} height="24" rx="6" style={{ fill: accent, opacity: 0.45 }} />
      <text x={x(100) + 8} y="41" style={strong}>100 克</text>
      <text x="0" y="93" style={text}>实际装</text>
      <rect x="64" y="76" width={x(120) - 64} height="24" rx="6" style={{ fill: accent }} />
      <rect x={x(100)} y="76" width={x(120) - x(100)} height="24" rx="6" style={{ fill: hot }} />
      <rect x={x(100)} y="76" width="8" height="24" style={{ fill: hot }} />
      <path d={`M${x(100)} 76 V100`} style={{ stroke: "var(--surface)", strokeWidth: 2 }} />
      <text x={x(120) + 8} y="93" style={strong}>120 克</text>
      <text x={x(120)} y="68" textAnchor="end" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>多装 20 克</text>
      <Eg x={x(120) - 124} y={67} />
    </svg>
  );
}

/** 固定费用悄悄上涨: the month's fixed costs year by year; each year's rise in red, small every time. */
function CreepingCosts() {
  const x = (v: number) => 64 + (v / 6900) * 180;
  const rows: Array<[string, number, string]> = [["第 1 年", 6000, "6,000 元"], ["第 2 年", 6400, "6,400 元"], ["第 3 年", 6900, "6,900 元"]];
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="举例：每月固定费用第 1 年 6,000 元，第 2 年 6,400 元，第 3 年 6,900 元" className="block w-full">
      {rows.map(([label, v, shown], i) => (
        <g key={label}>
          <text x="0" y={i * 38 + 21} style={text}>{label}</text>
          <rect x="64" y={i * 38 + 6} width={x(v) - 64} height="22" rx="6" style={{ fill: accent, opacity: 0.45 }} />
          {v > 6000 && <rect x={x(6000)} y={i * 38 + 6} width={x(v) - x(6000)} height="22" style={{ fill: hot }} />}
          <text x={x(v) + 8} y={i * 38 + 22} style={strong}>{shown}</text>
        </g>
      ))}
      <text x="64" y="140" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>三年后每月多付 900 元</text>
      <Eg x={238} y={139} />
    </svg>
  );
}

/** 抽成和房租太重: one 30-yuan delivery order split into food, the platform's cut, rent and what is left. */
function OrderSplit() {
  const x = (y: number) => 10 + y * 10;
  return (
    <svg viewBox="0 0 320 132" role="img" aria-label="举例：一份 30 元的外卖，食材 12 元，平台抽成 9 元，房租 4 元，剩下 5 元" className="block w-full">
      <text x={(x(0) + x(12)) / 2} y="26" textAnchor="middle" style={text}>食材 12 元</text>
      <text x={(x(12) + x(21)) / 2} y="26" textAnchor="middle" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>平台抽成 9 元</text>
      <g>
        <rect x={x(0)} y="36" width="120" height="28" style={{ fill: "var(--ink-4)", opacity: 0.3 }} />
        <rect x={x(12)} y="36" width="90" height="28" style={{ fill: hot }} />
        <rect x={x(21)} y="36" width="40" height="28" style={{ fill: hot, opacity: 0.6 }} />
        <rect x={x(25)} y="36" width="50" height="28" style={{ fill: accent }} />
        <g style={{ stroke: "var(--surface)", strokeWidth: 2 }}><path d={`M${x(12)} 36 V64 M${x(21)} 36 V64 M${x(25)} 36 V64`} /></g>
      </g>
      <text x={x(25) - 6} y="84" textAnchor="end" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>房租 4 元</text>
      <text x={x(30)} y="84" textAnchor="end" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>剩 5 元</text>
      <text x="0" y="120" style={strong}>一份 30 元，抽成和房租拿走 13 元</text>
      <Eg x={250} y={119} />
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "food-over-recipe": { kind: "举例", caption: "假设你的餐饮店一道菜的配方写一份 100\u00a0克，忙的时候每份装到 120\u00a0克。多出来的 20\u00a0克要花钱买，客人付的还是一份的价钱。", draw: () => <OverPortion /> },
  "fixed-costs-creep": { kind: "举例", caption: "假设你的餐饮店每月自动付的房租、保险、软件月费和维修合约，每年各涨一点。每次只多几百元，三年后每个月多付 900\u00a0元，一年多付 10,800\u00a0元。", draw: () => <CreepingCosts /> },
  "commission-rent": { kind: "举例", caption: "假设你的餐饮店一份外卖卖 30\u00a0元，食材 12\u00a0元，平台抽成 30% 是 9\u00a0元，房租摊到每份 4\u00a0元。剩下的 5\u00a0元还要付人工和其他开支；订单越多，付出去的抽成也越多。", draw: () => <OrderSplit /> },
};
