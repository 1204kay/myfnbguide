// The pictures of the sections of cash-flow (sections/index.ts keys them by "cash-flow/<cause key>").
import { text, strong, hot, accent, box, soft, Eg, type Section } from "./kit";

/** 钱被什么占住: what holds the cash (slow stock, paying before the goods come) and the change that frees it. */
function CashBack() {
  const rows: Array<[string, string]> = [["卖不动的库存", "降价清掉"], ["先付款再到货", "改成货到付款"]];
  return (
    <svg viewBox="0 0 320 112" role="img" aria-label="示意图：卖不动的库存降价清掉，先付款再到货改成货到付款，占住的钱换回现金" className="block w-full">
      <defs><marker id="cf-tied-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      {rows.map(([held, change], i) => (
        <g key={held}>
          <rect x="0" y={i * 64 + 8} width="98" height="36" rx="6" style={box} />
          <text x="49" y={i * 64 + 31} textAnchor="middle" style={text}>{held}</text>
          <path d={`M102 ${i * 64 + 26} H118`} style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#cf-tied-ar)" />
          <rect x="124" y={i * 64 + 8} width="102" height="36" rx="6" style={soft} />
          <text x="175" y={i * 64 + 31} textAnchor="middle" style={{ ...strong, fill: accent, fontSize: 14 }}>{change}</text>
          <path d={`M230 ${i * 64 + 26} L252 ${i === 0 ? 44 : 70}`} style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#cf-tied-ar)" />
        </g>
      ))}
      <circle cx="286" cy="56" r="30" style={{ fill: accent }} />
      <text x="286" y="61.5" textAnchor="middle" style={{ fill: "var(--accent-contrast)", fontSize: 15, fontWeight: 700 }}>现金</text>
    </svg>
  );
}

/** 留出周转的钱: a month's spending, kept three times over at least and six at best. */
function MonthsKept() {
  const w = 48;
  const x = (m: number) => m * (w + 6);
  return (
    <svg viewBox="0 0 320 128" role="img" aria-label="举例：每月开支 20,000 元，至少留 3 个月 60,000 元，最好留到 6 个月 120,000 元" className="block w-full">
      <text x="0" y="17" style={strong}>每月开支 20,000 元</text>
      <Eg x={146} y={16} />
      {[0, 1, 2, 3, 4, 5].map((m) => (
        <g key={m}>
          <rect x={x(m)} y="32" width={w} height="34" rx="6" style={m < 3 ? { fill: accent } : { ...soft, strokeDasharray: "4 3" }} />
          <text x={x(m) + w / 2} y="54" textAnchor="middle" style={m < 3 ? { fill: "var(--accent-contrast)", fontSize: 14, fontWeight: 600 } : { ...text, fill: accent }}>{m + 1}&nbsp;月</text>
        </g>
      ))}
      <path d={`M0 74 V80 H${x(3) - 6} V74 M${x(3)} 74 V80 H${x(6) - 6} V74`} style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5 }} />
      <text x={(x(3) - 6) / 2} y="100" textAnchor="middle" style={{ ...strong, fill: accent, fontSize: 14 }}>至少 3&nbsp;个月</text>
      <text x={(x(3) - 6) / 2} y="120" textAnchor="middle" style={text}>60,000&nbsp;元</text>
      <text x={(x(3) + x(6) - 6) / 2} y="100" textAnchor="middle" style={{ ...strong, fontSize: 14 }}>最好到 6&nbsp;个月</text>
      <text x={(x(3) + x(6) - 6) / 2} y="120" textAnchor="middle" style={text}>120,000&nbsp;元</text>
    </svg>
  );
}

/** 借钱和还款: borrowing when the money has already run out, against borrowing to a plan made before. */
function TwoWaysToBorrow() {
  const rows: Array<[string, string]> = [["信用卡、消费金融", "银行、公共金融机构"], ["利息高", "利息低"], ["急着凑钱还", "按月固定还"]];
  return (
    <svg viewBox="0 0 320 158" role="img" aria-label="示意图：缺钱了才借，多半是信用卡和消费金融，利息高、急着还；事先有计划地借，向银行和公共金融机构借，利息低、按月固定还" className="block w-full">
      <text x="75" y="16" textAnchor="middle" style={{ ...strong, fill: hot }}>缺钱了才借</text>
      <text x="245" y="16" textAnchor="middle" style={{ ...strong, fill: accent }}>事先有计划地借</text>
      {rows.map(([late, planned], i) => (
        <g key={late}>
          <rect x="0" y={i * 44 + 28} width="150" height="34" rx="6" style={box} />
          <text x="75" y={i * 44 + 50} textAnchor="middle" style={text}>{late}</text>
          <rect x="170" y={i * 44 + 28} width="150" height="34" rx="6" style={soft} />
          <text x="245" y={i * 44 + 50} textAnchor="middle" style={{ ...strong, fill: accent, fontSize: 14 }}>{planned}</text>
        </g>
      ))}
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "cash-tied-up": { kind: "示意", caption: "卖不动的库存和先付出去的货款都占着现金。几家店的做法是把放久了的货降价清掉、跟供货商改成货到付款、收紧补货点，让钱回到手上；缺口已经出现时，有的店先用短期借款补上。", draw: () => <CashBack /> },
  reserve: { kind: "举例", caption: "假设你的餐饮店每月房租、工资、进货等开支合计 20,000 元。按几位老板的建议手上至少留 3 个月，就是 60,000 元；留到 6 个月是 120,000 元。有的店从开业起每月固定存一笔，钱紧时再调低。", draw: () => <MonthsKept /> },
  borrowing: { kind: "示意", caption: "同样是借钱，缺口出现时才借，常常只能用信用卡取现或消费金融；事先有计划地向银行或公共金融机构借，利息较低，还款也能按月排好。", draw: () => <TwoWaysToBorrow /> },
};
