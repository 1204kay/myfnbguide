// The pictures of the sections of waste (sections/index.ts keys them by "waste/<cause key>").
import { text, strong, accent, box, soft, Steps, type Section } from "./kit";

const arrow = (id: string) => <marker id={id} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker>;

/** 储存和先进先出: one shelf, each batch dated; the oldest is used first, the new one goes in at the back. */
function FirstInFirstOut() {
  const batches: Array<[string, boolean]> = [["先到的", true], ["后到的", false], ["新到的", false]];
  return (
    <svg viewBox="0 0 320 136" role="img" aria-label="示意图：架上每批食材标日期，先到的先用，新到的放在后面" className="block w-full">
      <defs>
        {arrow("ws-fifo-ar")}
        <marker id="ws-fifo-in" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: "var(--ink-4)" }} /></marker>
      </defs>
      {batches.map(([name, first], i) => {
        const x = 60 + i * 72;
        return (
          <g key={name}>
            <rect x={x} y="40" width="64" height="50" rx="6" style={first ? soft : box} />
            <rect x={x + 8} y="32" width="48" height="18" rx="4" style={{ fill: "var(--surface)", stroke: "var(--line-strong)" }} />
            <text x={x + 32} y="46" textAnchor="middle" style={{ ...text, fontSize: 14 }}>日期</text>
            <text x={x + 32} y="74" textAnchor="middle" style={first ? { ...strong, fill: accent, fontSize: 14 } : { ...text, fill: "var(--ink-2)" }}>{name}</text>
          </g>
        );
      })}
      <path d="M0 92 H320" style={{ stroke: "var(--ink-3)", strokeWidth: 3 }} />
      <path d="M56 65 H12" style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#ws-fifo-ar)" />
      <path d="M318 65 H276" style={{ stroke: "var(--ink-4)", strokeWidth: 2, strokeDasharray: "4 3" }} markerEnd="url(#ws-fifo-in)" />
      <text x="0" y="122" style={{ ...strong, fill: accent, fontSize: 14 }}>先用这一批</text>
      <text x="320" y="122" textAnchor="end" style={text}>新货放后面</text>
    </svg>
  );
}

/** 剩下的食材怎么处理: what was left over, and what the two shops made of it. */
function MadeInto() {
  const rows: Array<[string, string]> = [["前一天的剩饭", "炒饭便当"], ["胡萝卜皮", "蔬菜高汤"], ["胡萝卜叶", "青酱、抹酱"]];
  return (
    <svg viewBox="0 0 320 162" role="img" aria-label="示意图：前一天的剩饭做成炒饭便当，胡萝卜皮放进蔬菜高汤，胡萝卜叶做成青酱和抹酱" className="block w-full">
      <defs>{arrow("ws-reuse-ar")}</defs>
      <text x="62" y="14" textAnchor="middle" style={text}>剩下的</text>
      <text x="254" y="14" textAnchor="middle" style={{ ...text, fill: accent, fontWeight: 600 }}>做成能卖的</text>
      {rows.map(([left, made], i) => (
        <g key={left}>
          <rect x="0" y={i * 46 + 26} width="124" height="36" rx="6" style={{ ...box, strokeDasharray: "4 3" }} />
          <text x="62" y={i * 46 + 49} textAnchor="middle" style={{ ...text, fill: "var(--ink-2)" }}>{left}</text>
          <path d={`M128 ${i * 46 + 44} H182`} style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#ws-reuse-ar)" />
          <rect x="188" y={i * 46 + 26} width="132" height="36" rx="6" style={soft} />
          <text x="254" y={i * 46 + 49} textAnchor="middle" style={{ ...strong, fill: accent }}>{made}</text>
        </g>
      ))}
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "ordering-prep": { kind: "示意", caption: "几家店决定订多少、备多少的做法连起来是这几步：按销售记录估这几天卖多少，乘上配方卡上每份的用量，减去库存再订货，最后用盘点核对，偏差大的逐项查。", draw: () => <Steps label="示意图：订货的四步，按销售记录预测、乘上配方用量、减去库存订货、盘点核对偏差" steps={[["预测", "按销售记录估这几天卖多少"], ["用量", "乘上配方卡上每份的用量"], ["订货", "减去库存，订差额"], ["核对", "盘点，偏差大的逐项查"]]} /> },
  "storage": { kind: "示意", caption: "每批食材进来先标上日期，分区放好；用的时候先拿先到的那一批，新到的放在后面。", draw: () => <FirstInFirstOut /> },
  "reuse": { kind: "示意", caption: "日本一家便当店把前一天剩下的米饭做成炒饭便当；法国一家素食餐馆把胡萝卜皮放进蔬菜高汤，胡萝卜叶做成青酱和抹酱。", draw: () => <MadeInto /> },
};
