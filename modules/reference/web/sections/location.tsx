// The pictures of the sections of location (sections/index.ts keys them by "location/<cause key>").
import { text, strong, hot, accent, box, soft, type Section } from "./kit";

/** 看客流: the same street through the day, who passes and how many (only more or fewer, no counts). */
function TrafficByTime() {
  const slots: Array<[string, string, number]> = [["早上", "上班的人", 54], ["中午", "吃午饭的人", 86], ["下午", "附近住户", 32], ["晚上", "下班的人", 68]];
  return (
    <svg viewBox="0 0 320 156" role="img" aria-label="示意图：同一条街，早上、中午、下午和晚上经过的人多少不同，经过的人也不同" className="block w-full">
      {slots.map(([slot, who, h], i) => {
        const cx = 40 + i * 80;
        return (
          <g key={slot}>
            <rect x={cx - 26} y={124 - h} width="52" height={h} rx="5" style={{ fill: accent, opacity: i === 1 ? 0.8 : 0.4 }} />
            <text x={cx} y={116 - h} textAnchor="middle" style={i === 1 ? { ...text, fill: accent, fontWeight: 700 } : text}>{who}</text>
            <text x={cx} y="146" textAnchor="middle" style={strong}>{slot}</text>
          </g>
        );
      })}
      <path d="M0 124 H320" style={{ stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
    </svg>
  );
}

/** 租约条款: what to have checked before signing, ticked off on the lease, then the signature. */
function LeaseChecks() {
  const items = ["能拿到营业许可", "能装排烟罩", "通风设备够用"];
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="示意图：签租约之前，先查清能不能拿到营业许可、能不能装排烟罩、通风设备够不够，查清以后再签字" className="block w-full">
      <defs><marker id="sec-lease-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      <rect x="2" y="4" width="196" height="142" rx="8" style={box} />
      <text x="18" y="30" style={strong}>签约前查清</text>
      {items.map((item, i) => (
        <g key={item}>
          <rect x="18" y={i * 34 + 46} width="20" height="20" rx="4" style={soft} />
          <path d={`M22 ${i * 34 + 56} L27 ${i * 34 + 61} L35 ${i * 34 + 51}`} style={{ fill: "none", stroke: accent, strokeWidth: 2.2, strokeLinecap: "round" }} />
          <text x="48" y={i * 34 + 61} style={{ ...text, fill: "var(--ink-2)" }}>{item}</text>
        </g>
      ))}
      <path d="M202 75 H226" style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#sec-lease-ar)" />
      <rect x="234" y="56" width="84" height="38" rx="8" style={soft} />
      <text x="276" y="80" textAnchor="middle" style={{ ...strong, fill: accent }}>再签字</text>
    </svg>
  );
}

/** 周边和竞争: what is within a short walk of the shop: homes, offices, and shops of the same kind. */
function WithinWalk() {
  const around: Array<[number, number, string, boolean]> = [[70, 42, "住户", false], [170, 42, "办公楼", false], [70, 128, "同类的店", true], [170, 128, "同类的店", true]];
  return (
    <svg viewBox="0 0 320 196" role="img" aria-label="示意图：店周围步行可到的范围里，有住户、办公楼，也有同类的店" className="block w-full">
      <ellipse cx="160" cy="98" rx="152" ry="92" style={{ fill: "var(--accent-soft)", opacity: 0.5, stroke: accent, strokeWidth: 1.2, strokeDasharray: "5 4" }} />
      <text x="160" y="30" textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>步行可到的范围</text>
      {around.map(([x, y, name, rival], i) => (
        <g key={i}>
          <rect x={x} y={y} width="80" height="30" rx="6" style={rival ? { fill: "var(--fig-box)", stroke: hot, strokeDasharray: "4 3" } : box} />
          <text x={x + 40} y={y + 20} textAnchor="middle" style={rival ? { fill: hot, fontSize: 14, fontWeight: 700 } : text}>{name}</text>
        </g>
      ))}
      <rect x="114" y="82" width="92" height="34" rx="8" style={{ fill: accent }} />
      <text x="160" y="104" textAnchor="middle" style={{ fill: "var(--accent-contrast)", fontSize: 15, fontWeight: 700 }}>你的店</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "traffic": { kind: "示意", caption: "同一条街，早上、中午、下午和晚上经过的人数不同，经过的人也不同；柱子只表示多少，不是实际人数。几家店的做法是先定下想开的店和想要的客人，再到现场看这些人什么时候经过、会不会走进来。", draw: () => <TrafficByTime /> },
  "lease": { kind: "示意", caption: "签租约之前，先查清这处店面能不能拿到营业许可、能不能装排烟罩、通风设备够不够用，查清以后再签字。", draw: () => <LeaseChecks /> },
  "neighborhood": { kind: "示意", caption: "看一处店面，也要看步行可到的范围里有什么：住户和办公楼是可能来的客人，同类的店会分走一部分客人。", draw: () => <WithinWalk /> },
};
