// The pictures of the sections of payments (sections/index.ts keys them by "payments/<cause key>").
import { text, strong, hot, accent, box, Eg, type Section } from "./kit";

/** 手续费: a month's card takings with the fee cut off the end, and the shop's own rate worked out from the two. */
function FeeShare() {
  const w = 300;
  const fee = w * 0.03;
  return (
    <svg viewBox="0 0 320 120" role="img" aria-label="举例：每月刷卡和电子钱包收 30,000 元，手续费 900 元，实际费率 3%" className="block w-full">
      <text x="0" y="20" style={strong}>每月刷卡收 30,000 元</text>
      <Eg x={170} y={19} />
      <rect x="0" y="32" width={w - fee} height="26" rx="6" style={{ fill: accent, opacity: 0.45 }} />
      <rect x={w - fee} y="32" width={fee} height="26" style={{ fill: hot }} />
      <path d={`M${w - fee} 32 V58`} style={{ stroke: "var(--surface)", strokeWidth: 2 }} />
      <text x="12" y="50" style={{ ...text, fill: "var(--ink)" }}>到账 29,100 元</text>
      <path d={`M${w - fee / 2} 60 V70`} style={{ stroke: hot, strokeWidth: 1.5 }} />
      <text x={w} y="86" textAnchor="end" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>手续费 900 元</text>
      <text x="0" y="112" style={{ ...text, fill: "var(--ink-2)" }}>实际费率：900 ÷ 30,000 = 3%</text>
    </svg>
  );
}

/** 收款公司的风险: what was taken each day reaches the shop days later; the last days' money is still with the processor. */
function MoneyInTransit() {
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const x = (i: number) => 64 + i * 36;
  return (
    <svg viewBox="0 0 320 112" role="img" aria-label="示意图：每天收的钱过两天才到店里，到了周日，周六和周日收的钱还在收款公司" className="block w-full">
      <text x={x(6) + 30} y="14" textAnchor="end" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>还在收款公司</text>
      <path d={`M${x(5)} 22 H${x(6) + 30}`} style={{ stroke: hot, strokeWidth: 1.5 }} />
      <text x="0" y="51" style={strong}>收款</text>
      <text x="0" y="95" style={strong}>到账</text>
      {days.map((d, i) => {
        const held = i >= 5;
        return (
          <g key={d}>
            <rect x={x(i)} y="30" width="32" height="30" rx="5" style={{ fill: held ? hot : accent, opacity: held ? 0.3 : 0.4 }} />
            <text x={x(i) + 16} y="50" textAnchor="middle" style={{ ...text, fill: held ? hot : "var(--ink)", fontWeight: held ? 700 : 400 }}>{d}</text>
            {i < 2
              ? <rect x={x(i)} y="74" width="32" height="30" rx="5" style={{ ...box, strokeDasharray: "3 3" }} />
              : <g><rect x={x(i)} y="74" width="32" height="30" rx="5" style={{ fill: accent, opacity: 0.4 }} /><text x={x(i) + 16} y="94" textAnchor="middle" style={{ ...text, fill: "var(--ink)" }}>{days[i - 2]}</text></g>}
          </g>
        );
      })}
    </svg>
  );
}

/** 现金和对账: what the till recorded against what came in, by way of paying; one line does not match. */
function TillAgainstTakings() {
  const rows: Array<[string, number, number]> = [["现金", 1, 1], ["刷卡", 1, 0.72], ["电子钱包", 0.8, 0.8]];
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="示意图：每天把收银系统记的和实际收到的现金、刷卡、电子钱包逐项对一遍，刷卡这一项对不上" className="block w-full">
      <text x="132" y="16" textAnchor="middle" style={text}>收银系统记的</text>
      <text x="264" y="16" textAnchor="middle" style={text}>实际收到的</text>
      {rows.map(([name, till, got], i) => {
        const y = i * 42 + 30;
        const off = till !== got;
        return (
          <g key={name}>
            <text x="0" y={y + 21} style={strong}>{name}</text>
            <rect x="72" y={y} width="120" height="30" rx="6" style={box} />
            <rect x="80" y={y + 9} width={104 * till} height="12" rx="3" style={{ fill: accent, opacity: 0.45 }} />
            <text x="208" y={y + 21} textAnchor="middle" style={{ fill: off ? hot : accent, fontSize: 16, fontWeight: 700 }}>{off ? "≠" : "="}</text>
            <rect x="224" y={y} width="94" height="30" rx="6" style={off ? { ...box, stroke: hot } : box} />
            <rect x="232" y={y + 9} width={78 * got} height="12" rx="3" style={{ fill: off ? hot : accent, opacity: off ? 0.6 : 0.45 }} />
          </g>
        );
      })}
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "fees": { kind: "举例", caption: "假设你的餐饮店每月刷卡和电子钱包收 30,000 元，到账 29,100 元，差的 900 元是手续费，实际费率 3%。几家店的做法是先这样算出自己实际付的费率，再拿去和别家收款公司比较，或从毛利、菜单上消化。", draw: () => <FeeShare /> },
  "risks": { kind: "示意", caption: "刷卡和电子钱包收的钱，要过几天才转到店里；图里按过两天到账画，各家收款公司不一样。任何一天，总有几天的营业款还在收款公司，收款公司出了问题，这部分钱就可能被压住。", draw: () => <MoneyInTransit /> },
  "reconcile": { kind: "示意", caption: "每天把收银系统记的营业额和实际收到的钱逐项对一遍：现金点数、刷卡到账、电子钱包到账。哪一项对不上，当天就查原因。", draw: () => <TillAgainstTakings /> },
};
