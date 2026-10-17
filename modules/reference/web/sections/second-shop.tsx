// The pictures of the sections of second-shop (sections/index.ts keys them by "second-shop/<cause key>").
import { text, strong, hot, accent, box, soft, Eg, type Section } from "./kit";

/** 人和制度跟不上: the owner's way of running the shop written down once, each shop run by its own manager. */
function Systems() {
  return (
    <svg viewBox="0 0 320 168" role="img" aria-label="示意图：老板把做法写成制度，两家店各有店长照着制度管" className="block w-full">
      <rect x="110" y="4" width="100" height="34" rx="6" style={box} />
      <text x="160" y="26" textAnchor="middle" style={strong}>老板</text>
      <path d="M160 38 V56" style={{ stroke: "var(--ink-4)", strokeWidth: 1.5 }} />
      <rect x="70" y="56" width="180" height="40" rx="6" style={soft} />
      <text x="160" y="81" textAnchor="middle" style={{ ...strong, fill: accent }}>写下来的制度</text>
      <path d="M120 96 V114 M200 96 V114" style={{ stroke: accent, strokeWidth: 1.5 }} />
      {[[30, "第一家"], [170, "第二家"]].map(([x, name]) => (
        <g key={name}>
          <rect x={Number(x)} y="114" width="120" height="50" rx="6" style={box} />
          <text x={Number(x) + 60} y="135" textAnchor="middle" style={strong}>{name}</text>
          <text x={Number(x) + 60} y="155" textAnchor="middle" style={text}>店长照着管</text>
        </g>
      ))}
    </svg>
  );
}

/** 开得多，不等于赚得多: two shops take twice as much, the costs grow faster, and what is left stays the same. */
function TwoShops() {
  const x = (v: number) => 74 + (v / 20) * 236;
  const rows: Array<[string, number, number]> = [["一家店", 10, 8.5], ["两家店", 20, 18.5]];
  return (
    <svg viewBox="0 -6 320 156" role="img" aria-label="举例：一家店一个月营业额 10 万元，剩 1.5 万元；两家店营业额 20 万元，剩的还是 1.5 万元" className="block w-full">
      {rows.map(([name, takings, costs], i) => (
        <g key={name}>
          <text x="0" y={i * 56 + 31} style={strong}>{name}</text>
          <text x={x(takings)} y={i * 56 + 10} textAnchor="end" style={text}>营业额 {takings} 万元</text>
          <rect x="74" y={i * 56 + 16} width={x(costs) - 74} height="22" rx="5" style={{ fill: "var(--ink-4)", opacity: 0.35 }} />
          <rect x={x(costs)} y={i * 56 + 16} width={x(takings) - x(costs)} height="22" style={{ fill: accent }} />
          <path d={`M${x(costs)} ${i * 56 + 16} V${i * 56 + 38}`} style={{ stroke: "var(--surface)", strokeWidth: 2 }} />
          <text x={x(costs) - 8} y={i * 56 + 32} textAnchor="end" style={{ fill: "var(--ink-2)", fontSize: 14 }}>费用</text>
        </g>
      ))}
      <text x="0" y="140" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>两家店剩的，还是 1.5 万元</text>
      <Eg x={204} y={139} />
    </svg>
  );
}

/** 什么时候可以开: what the first shop shows before a second one (from the other two sections), each ticked. */
function ReadyList() {
  const items = ["连续三个月盈利", "食材成本率在目标以内", "边际贡献率算过了", "新想法先用小成本试过"];
  return (
    <svg viewBox="0 0 320 166" role="img" aria-label="示意图：开第二家以前先看第一家的账：连续三个月盈利、食材成本率在目标以内、边际贡献率算过，新想法先用小成本试" className="block w-full">
      <text x="0" y="16" style={strong}>开第二家以前，第一家做到了吗</text>
      {items.map((item, i) => (
        <g key={item}>
          <rect x="0" y={i * 36 + 30} width="24" height="24" rx="5" style={soft} />
          <path d={`M6 ${i * 36 + 42} L11 ${i * 36 + 47} L19 ${i * 36 + 36}`} style={{ fill: "none", stroke: accent, strokeWidth: 2.2, strokeLinecap: "round" }} />
          <text x="36" y={i * 36 + 47} style={{ ...text, fill: "var(--ink-2)" }}>{item}</text>
        </g>
      ))}
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "people-systems": { kind: "示意", caption: "店多了，老板一个人顾不过来。多数店家的做法是把做法写成制度，例如评价制度和预算，再把每家店交给专业的人管；也有店把备料集中到中央厨房。", draw: () => <Systems /> },
  "more-not-richer": { kind: "举例", caption: "假设你的餐饮店一家店一个月营业额 10\u00a0万元，费用 8.5\u00a0万元，剩 1.5\u00a0万元。开第二家以后营业额到 20\u00a0万元，但新店的租金、人手、管理，以及新店分走的老店客人，让费用到 18.5\u00a0万元，剩下的还是 1.5\u00a0万元。", draw: () => <TwoShops /> },
  "ready-signs": { kind: "示意", caption: "决定开第二家以前，先看第一家的账：有没有连续三个月盈利，食材成本率在不在目标以内，边际贡献率算过没有。新的想法先用小成本试，不急着签第二家的租约。", draw: () => <ReadyList /> },
};
