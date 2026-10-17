// The pictures of the sections of ticket-size (sections/index.ts keys them by "ticket-size/<cause key>").
import { text, strong, accent, box, soft, Eg, type Section } from "./kit";

/** 菜单设计: a menu page; the dishes the shop wants sold sit where the eye lands first. */
function FirstSeen() {
  return (
    <svg viewBox="0 0 320 156" role="img" aria-label="示意图：一页菜单，想多卖的菜放在客人最先看到的位置，其余的菜排在下面" className="block w-full">
      <defs><marker id="ts-menu-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      <rect x="0" y="4" width="180" height="148" rx="8" style={box} />
      <rect x="12" y="16" width="156" height="50" rx="6" style={soft} />
      <text x="90" y="46" textAnchor="middle" style={{ ...strong, fill: accent }}>想多卖的菜</text>
      {Array.from({ length: 5 }, (_, i) => <rect key={i} x="14" y={82 + i * 13} width={i % 2 ? 96 : 128} height="6" rx="3" style={{ fill: "var(--ink-4)", opacity: 0.35 }} />)}
      <path d="M232 41 H186" style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#ts-menu-ar)" />
      <text x="240" y="36" style={{ ...strong, fill: accent, fontSize: 14 }}>客人最先</text>
      <text x="240" y="54" style={{ ...strong, fill: accent, fontSize: 14 }}>看到的位置</text>
      <text x="196" y="108" style={text}>其余的菜</text>
      <text x="196" y="126" style={text}>排在下面</text>
    </svg>
  );
}

/** 服务员推荐: two ways to ask at the table: a general question, or one dish named and why it fits. */
function TwoAsks() {
  const person = (cx: number) => (
    <g style={{ fill: "none", stroke: "var(--ink-2)", strokeWidth: 2 }}>
      <circle cx={cx} cy="58" r="9" />
      <path d={`M${cx - 14} 88 Q${cx - 14} 71 ${cx} 71 Q${cx + 14} 71 ${cx + 14} 88`} />
    </g>
  );
  return (
    <svg viewBox="0 0 320 136" role="img" aria-label="示意图：服务员泛泛地问客人还要不要别的，和具体推荐一样菜并说明为什么合适" className="block w-full">
      {person(26)}
      <text x="26" y="110" textAnchor="middle" style={text}>服务员</text>
      <text x="64" y="16" style={text}>泛泛地问</text>
      <path d="M64 24 H316 V56 H76 L64 64 Z" style={box} />
      <text x="78" y="46" style={{ ...text, fill: "var(--ink-2)" }}>「还要点别的吗？」</text>
      <text x="64" y="84" style={{ ...strong, fill: accent, fontSize: 14 }}>具体推荐一样</text>
      <path d="M64 92 H316 V124 H76 L64 132 Z" style={soft} />
      <text x="78" y="114" style={{ ...strong, fill: accent, fontSize: 14 }}>「这道菜配冰茶，解辣」</text>
    </svg>
  );
}

/** 套餐和加购: the main dish alone against the same dish in a set with a drink and a side; the extra in the accent. */
function SetMeal() {
  const x = (v: number) => 64 + (v / 31) * 196;
  return (
    <svg viewBox="0 0 320 136" role="img" aria-label="举例：单点一份主食 25 元；加 6 元配饮料和小菜，套餐 31 元" className="block w-full">
      <text x="0" y="31" style={text}>单点</text>
      <rect x="64" y="14" width={x(25) - 64} height="24" rx="6" style={{ fill: accent, opacity: 0.45 }} />
      <text x={x(25) + 8} y="32" style={strong}>25 元</text>
      <text x="0" y="83" style={text}>套餐</text>
      <rect x="64" y="66" width={x(31) - 64} height="24" rx="6" style={{ fill: accent, opacity: 0.45 }} />
      <rect x={x(25)} y="66" width={x(31) - x(25)} height="24" rx="6" style={{ fill: accent }} />
      <rect x={x(25)} y="66" width="8" height="24" style={{ fill: accent }} />
      <path d={`M${x(25)} 66 V90`} style={{ stroke: "var(--surface)", strokeWidth: 2 }} />
      <text x={x(31) + 8} y="84" style={strong}>31 元</text>
      <text x={(64 + x(25)) / 2} y="83" textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 14 }}>主食</text>
      <text x="64" y="124" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>加 6 元配饮料和小菜</text>
      <Eg x={210} y={123} />
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "menu-design": { kind: "示意", caption: "客人看菜单，先看到的是最显眼的那一块。想多卖的菜放在那里，其余的菜排在下面。", draw: () => <FirstSeen /> },
  "staff-suggest": { kind: "示意", caption: "同一句推荐，可以泛泛地问客人还要不要别的，也可以具体推荐一样菜，并说清楚为什么合适。图中的话只是示意。", draw: () => <TwoAsks /> },
  "bundles": { kind: "举例", caption: "假设你的餐饮店一份主食卖 25\u00a0元，加 6\u00a0元可以配一杯饮料和一份小菜，套餐 31\u00a0元。点套餐的客人，每人多花 6\u00a0元。", draw: () => <SetMeal /> },
};
