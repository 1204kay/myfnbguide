// The pictures of the sections of opening-cost (sections/index.ts keys them by "opening-cost/<cause key>").
import { text, strong, hot, accent, box, soft, type Section } from "./kit";

/** 装修和设备: the build-out listed item by item with room to spare; taking over a fitted shop makes it shorter. */
function BuildOut() {
  const rows: Array<[string, Array<[string, number]>]> = [
    ["新装修", [["装修", 76], ["设备", 64], ["桌椅", 48], ["余量", 44]]],
    ["接手旧店", [["少量翻新", 72], ["二手设备", 72], ["余量", 44]]],
  ];
  return (
    <svg viewBox="0 0 320 110" role="img" aria-label="示意图：装修和设备逐项列出并留出余量；接手旧店、买二手设备，这笔开支短一截" className="block w-full">
      {rows.map(([name, parts], r) => {
        let x = 72;
        return (
          <g key={name}>
            <text x="0" y={r * 54 + 32} style={strong}>{name}</text>
            {parts.map(([part, w]) => {
              const spare = part === "余量";
              const at = x;
              x += w + 3;
              return (
                <g key={part}>
                  <rect x={at} y={r * 54 + 10} width={w} height="34" rx="6" style={spare ? { ...box, strokeDasharray: "4 3" } : soft} />
                  <text x={at + w / 2} y={r * 54 + 32} textAnchor="middle" style={spare ? text : { ...text, fill: accent, fontWeight: 600 }}>{part}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** 开业前后的周转金: each month's bills stay the same while takings climb; the gap until they meet is the cushion. */
function Cushion() {
  const mx = (m: number) => 36 + (m - 1) * 54;
  const takings: Array<[number, number]> = [[1, 120], [2, 106], [3, 90], [4, 75], [5, 61], [6, 48]];
  const bills = 56;
  const meet = 5 + (61 - bills) / (61 - 48);
  const curve = takings.map(([m, y]) => `${mx(m)} ${y}`).join(" L");
  const under = takings.filter(([m]) => m <= 5).map(([m, y]) => `${mx(m)} ${y}`).reverse().join(" L");
  return (
    <svg viewBox="0 0 320 166" role="img" aria-label="示意图：开业以后每月要付的钱差不多，营业额慢慢涨上来；涨上来之前差的部分，要靠事先备好的周转金" className="block w-full">
      <path d={`M${mx(1)} ${bills} H${mx(meet)} L${under} Z`} style={{ fill: hot, opacity: 0.16 }} />
      <path d={`M${mx(1)} ${bills} H${mx(6)}`} style={{ stroke: "var(--ink-2)", strokeWidth: 2, strokeDasharray: "6 4" }} />
      <text x={mx(1)} y={bills - 12} style={{ ...text, fill: "var(--ink-2)" }}>每月要付：房租、工资、进货</text>
      <path d={`M${curve}`} style={{ fill: "none", stroke: accent, strokeWidth: 2.5 }} />
      <text x={mx(6)} y="34" textAnchor="end" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>营业额</text>
      <text x={mx(2.3)} y="86" textAnchor="middle" style={{ fill: hot, fontSize: 15, fontWeight: 700 }}>周转金</text>
      <path d={`M${mx(1)} 132 H${mx(6)}`} style={{ stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
      <text x={mx(1)} y="154" style={text}>开业第 1 个月</text>
      <text x={mx(6)} y="154" textAnchor="end" style={text}>第 6 个月</text>
    </svg>
  );
}

/** 不同店型的开店成本: a stall, a small shop and a full restaurant, each costing more to open (only the order, no sums). */
function ByFormat() {
  const formats: Array<[string, number]> = [["摊位", 26], ["小店", 58], ["正式餐厅", 98]];
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="示意图：摊位、小店、正式餐厅，开店要花的钱一个比一个多" className="block w-full">
      {formats.map(([name, h], i) => {
        const cx = 58 + i * 102;
        return (
          <g key={name}>
            <rect x={cx - 38} y={116 - h} width="76" height={h} rx="6" style={{ fill: accent, opacity: 0.3 + i * 0.25 }} />
            <text x={cx} y="140" textAnchor="middle" style={strong}>{name}</text>
          </g>
        );
      })}
      <path d="M0 116 H320" style={{ stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
      <text x="0" y="22" style={{ ...text, fill: "var(--ink-2)" }}>开店要花的钱</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "build-out": { kind: "示意", caption: "装修和设备是开店最大的一笔开支。几家店的做法是逐项列出各项费用，预算留出余量，避免施工中追加；也有店接手前一家店留下的装修和设备，或买二手设备，把这笔开支压下来。", draw: () => <BuildOut /> },
  "working-capital": { kind: "示意", caption: "开业以后，房租、工资和进货每月照付，营业额要过几个月才涨上来；线只表示涨跌，不是实际金额。中间差的部分要靠事先备好的周转金，生活费和还款也要一起算进去。", draw: () => <Cushion /> },
  "by-format": { kind: "示意", caption: "摊位、小店和正式餐厅，开店要花的钱差别很大；柱子只表示多少，不是实际金额。先选定店型，再按店型定预算和做法。", draw: () => <ByFormat /> },
};
