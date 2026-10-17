// The pictures of the sections of scheduling (sections/index.ts keys them by "scheduling/<cause key>").
import { text, strong, accent, box, soft, type Section } from "./kit";

/** 按客流排班: a week's roster set ahead, each slot with as many people as its guests need (more at the peaks and weekends). */
function Roster() {
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const slots: Array<[string, number[]]> = [["午市", [2, 2, 2, 2, 3, 3, 3]], ["下午", [1, 1, 1, 1, 1, 2, 2]], ["晚市", [2, 2, 2, 3, 3, 4, 4]]];
  return (
    <svg viewBox="0 0 320 170" role="img" aria-label="示意图：一周的班表，每一格排的人数跟着那个时段的客人数变化：午市和晚市多，下午少，周末比平日多" className="block w-full">
      {days.map((d, i) => <text key={d} x={74 + i * 35 + 15} y="14" textAnchor="middle" style={text}>{d}</text>)}
      {slots.map(([name, people], r) => (
        <g key={name}>
          <text x="0" y={r * 42 + 48} style={strong}>{name}</text>
          {people.map((n, i) => {
            const x = 74 + i * 35;
            const y = r * 42 + 24;
            return (
              <g key={i}>
                <rect x={x} y={y} width="31" height="36" rx="5" style={n >= 3 ? soft : box} />
                {Array.from({ length: n }, (_, k) => <circle key={k} cx={x + 9 + (k % 2) * 13} cy={y + 11 + Math.floor(k / 2) * 14} r="4.5" style={{ fill: n >= 3 ? accent : "var(--ink-4)" }} />)}
              </g>
            );
          })}
        </g>
      ))}
      <circle cx="80" cy="160" r="4.5" style={{ fill: "var(--ink-4)" }} />
      <text x="90" y="165" style={text}>一个人</text>
    </svg>
  );
}

/** 一人多岗: one person who has learnt several stations moves to whichever is busy. */
function Stations() {
  const stations: Array<[number, number, string]> = [[8, 10, "收银"], [212, 10, "出餐"], [110, 112, "洗碗"]];
  return (
    <svg viewBox="0 0 320 152" role="img" aria-label="示意图：一个人学会收银、出餐和洗碗几个岗位，哪里忙就去哪里补位" className="block w-full">
      <defs><marker id="sec-sch-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      {stations.map(([x, y, name]) => (
        <g key={name}>
          <rect x={x} y={y} width="100" height="36" rx="6" style={box} />
          <text x={x + 50} y={y + 23} textAnchor="middle" style={strong}>{name}</text>
        </g>
      ))}
      <circle cx="160" cy="54" r="9" style={{ fill: "none", stroke: accent, strokeWidth: 2 }} />
      <path d="M146 84 Q146 67 160 67 Q174 67 174 84" style={{ fill: "none", stroke: accent, strokeWidth: 2 }} />
      <g style={{ fill: "none", stroke: accent, strokeWidth: 2 }}>
        <path d="M140 60 C128 54 120 48 112 40" markerEnd="url(#sec-sch-ar)" />
        <path d="M180 60 C192 54 200 48 208 40" markerEnd="url(#sec-sch-ar)" />
        <path d="M160 90 V106" markerEnd="url(#sec-sch-ar)" />
      </g>
      <text x="8" y="80" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>哪里忙</text>
      <text x="8" y="98" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>去哪里</text>
    </svg>
  );
}

/** 临时人手: the regular staff cover the whole day; a part-timer comes only for the lunch and dinner rush. */
function PartTime() {
  const x = (h: number) => 92 + ((h - 10) / 12) * 224;
  return (
    <svg viewBox="0 0 320 132" role="img" aria-label="示意图：正式员工从开门做到关门，兼职只在午市和晚市高峰来几个小时" className="block w-full">
      <rect x={x(12)} y="4" width={x(14.5) - x(12)} height="96" rx="4" style={{ fill: "var(--accent-soft)" }} />
      <rect x={x(18) - 0} y="4" width={x(20.5) - x(18)} height="96" rx="4" style={{ fill: "var(--accent-soft)" }} />
      <text x="0" y="33" style={strong}>正式员工</text>
      <rect x={x(10)} y="18" width={x(22) - x(10)} height="22" rx="5" style={{ fill: "var(--ink-4)", opacity: 0.45 }} />
      <text x="0" y="77" style={{ ...strong, fill: accent }}>兼职</text>
      <rect x={x(12)} y="62" width={x(14.5) - x(12)} height="22" rx="5" style={{ fill: accent }} />
      <rect x={x(18)} y="62" width={x(20.5) - x(18)} height="22" rx="5" style={{ fill: accent }} />
      <path d={`M${x(10)} 106 H${x(22)}`} style={{ stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
      <g textAnchor="middle" style={text}>
        <text x={x(10)} y="126" textAnchor="start">开门</text>
        <text x={(x(12) + x(14.5)) / 2} y="126">午市</text>
        <text x={(x(18) + x(20.5)) / 2} y="126">晚市</text>
        <text x={x(22)} y="126" textAnchor="end">关门</text>
      </g>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "by-traffic": { kind: "示意", caption: "按每个时段的客人数排人：午市和晚市多排，下午少排，周末比平日多。班表提前定下来，员工也能安排自己的时间。", draw: () => <Roster /> },
  "multi-role": { kind: "示意", caption: "员工学会收银、出餐、洗碗等几个岗位，忙的时候哪里缺人就去哪里补位。", draw: () => <Stations /> },
  "flexible-help": { kind: "示意", caption: "正式员工从开门做到关门，兼职只在午市和晚市的高峰来几个小时。也有店把休息日从一天改成两天，让留下的人手够用。", draw: () => <PartTime /> },
};
