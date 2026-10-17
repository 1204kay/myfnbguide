// The pictures of the sections of retention (sections/index.ts keys them by "retention/<cause key>").
import { text, strong, hot, accent, box, soft, type Section } from "./kit";

/** 薪水以外的理由: pay is one reason to stay; the shops name three more around the one deciding. */
function ReasonsToStay() {
  const reasons: Array<[number, number, string, boolean]> = [[4, 10, "薪水", false], [196, 10, "排班顾到生活", true], [4, 122, "工资晋升写清楚", true], [196, 122, "分利润或股份", true]];
  return (
    <svg viewBox="0 0 320 166" role="img" aria-label="示意图：留下来的理由，薪水之外还有排班顾到生活、工资和晋升写清楚、分利润或股份" className="block w-full">
      {reasons.map(([x, y, name, mainly]) => {
        const left = x < 100;
        const top = y < 60;
        // Each reason's line runs from its box's inner corner to the person, short of the head and the word under it.
        const from = `${left ? x + 120 : x} ${top ? y + 34 : y}`;
        const to = top ? `${left ? 146 : 174} 70` : `${left ? 130 : 190} 110`;
        return (
          <g key={name}>
            <path d={`M${from} L${to}`} style={{ stroke: mainly ? accent : "var(--ink-4)", strokeWidth: mainly ? 2 : 1.5 }} />
            <rect x={x} y={y} width="120" height="34" rx="6" style={mainly ? soft : box} />
            <text x={x + 60} y={y + 22} textAnchor="middle" style={mainly ? { ...strong, fill: accent, fontSize: 14 } : text}>{name}</text>
          </g>
        );
      })}
      <circle cx="160" cy="58" r="9" style={{ fill: "none", stroke: "var(--ink-2)", strokeWidth: 2 }} />
      <path d="M146 88 Q146 71 160 71 Q174 71 174 88" style={{ fill: "none", stroke: "var(--ink-2)", strokeWidth: 2 }} />
      <text x="160" y="108" textAnchor="middle" style={strong}>留下来</text>
    </svg>
  );
}

/** 头几周怎么带: who leaves, week by week (only the shape: most go early), under the weeks the shops guide step by step. */
function FirstWeeks() {
  const wx = (w: number) => 20 + ((w - 1) / 11) * 290;
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="示意图：新人多半在头几周离开，几家店在这几周按步骤带新人" className="block w-full">
      <rect x={wx(1)} y="8" width={wx(6) - wx(1)} height="24" rx="6" style={soft} />
      <text x={(wx(1) + wx(6)) / 2} y="25" textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>头几周按步骤带</text>
      <path d={`M${wx(1)} 118 L${wx(1)} 46 C${wx(2.2)} 46 ${wx(3)} 70 ${wx(4.5)} 96 S${wx(9)} 114 ${wx(12)} 116 L${wx(12)} 118 Z`} style={{ fill: hot, opacity: 0.16 }} />
      <path d={`M${wx(1)} 46 C${wx(2.2)} 46 ${wx(3)} 70 ${wx(4.5)} 96 S${wx(9)} 114 ${wx(12)} 116`} style={{ fill: "none", stroke: hot, strokeWidth: 2.5 }} />
      <text x={wx(3.2)} y="58" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>离开的新人</text>
      <path d={`M${wx(1)} 118 H${wx(12)}`} style={{ stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
      <text x={wx(1)} y="138" style={text}>第 1 周</text>
      <text x={wx(4)} y="138" textAnchor="middle" style={text}>第 4 周</text>
      <text x={wx(12)} y="138" textAnchor="end" style={text}>第 12 周</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "beyond-pay": { kind: "示意", caption: "留住员工的理由不只是薪水。各家店谈到的还有：排班照顾员工的生活、工资和晋升的规则写清楚、把利润或股份分给员工。", draw: () => <ReasonsToStay /> },
  "first-weeks": { kind: "示意", caption: "新人最容易在开始的几周离开；曲线只表示先后，不是实际人数。几家店的做法是在这几周按步骤带新人，并在有人想走之前先谈一次。", draw: () => <FirstWeeks /> },
};
