// The pictures of the sections of small-formats (sections/index.ts keys them by "small-formats/<cause key>").
import { text, strong, accent, box, soft, type Section } from "./kit";

const arrow = (id: string) => <marker id={id} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker>;

/** 摊位和小店: start small, a cart or a stall, then a small shop; a full shop only later (dashed). */
function SmallFirst() {
  // [name, x, width, height, two lines under it]
  const steps: Array<[string, number, number, number, [string, string]]> = [
    ["餐车摊位", 0, 80, 36, ["投入低", "换地方试"]],
    ["小店", 106, 88, 52, ["面积小", "菜单简单"]],
    ["店面", 220, 100, 68, ["有了把握", "再开"]],
  ];
  return (
    <svg viewBox="0 0 320 146" role="img" aria-label="示意图：先用餐车或摊位起步，再开面积小、菜单简单的小店，有了把握再开店面" className="block w-full">
      <defs>{arrow("sf-small-ar")}</defs>
      {steps.map(([name, x, w, h, [a, b]], i) => (
        <g key={name}>
          <rect x={x} y={96 - h} width={w} height={h} rx="8" style={i === 2 ? { ...box, strokeDasharray: "4 3" } : soft} />
          <text x={x + w / 2} y={96 - h / 2 + 5} textAnchor="middle" style={i === 2 ? { ...strong, fill: "var(--ink-3)" } : { ...strong, fill: accent }}>{name}</text>
          <text x={x + w / 2} y="118" textAnchor="middle" style={text}>{a}</text>
          <text x={x + w / 2} y="137" textAnchor="middle" style={text}>{b}</text>
        </g>
      ))}
      <path d="M83 80 H101" style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#sf-small-ar)" />
      <path d="M197 80 H215" style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#sf-small-ar)" />
    </svg>
  );
}

/** 只做外卖: no storefront; the kitchen sends the food out by delivery or the cook goes to the guest. */
function KitchenOnly() {
  return (
    <svg viewBox="0 0 320 124" role="img" aria-label="示意图：不租门面，只有厨房，菜经配送或上门服务送到客人那里" className="block w-full">
      <defs>{arrow("sf-out-ar")}</defs>
      <rect x="0" y="6" width="96" height="32" rx="6" style={{ fill: "none", stroke: "var(--ink-4)", strokeDasharray: "4 3" }} />
      <text x="48" y="27" textAnchor="middle" style={text}>门面：不租</text>
      <rect x="0" y="58" width="96" height="44" rx="8" style={soft} />
      <text x="48" y="85" textAnchor="middle" style={{ ...strong, fill: accent }}>厨房</text>
      <path d="M99 80 H117" style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#sf-out-ar)" />
      <rect x="122" y="58" width="100" height="44" rx="8" style={box} />
      <text x="172" y="85" textAnchor="middle" style={strong}>配送或上门</text>
      <path d="M225 80 H243" style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#sf-out-ar)" />
      <rect x="248" y="58" width="72" height="44" rx="8" style={box} />
      <text x="284" y="85" textAnchor="middle" style={strong}>客人</text>
      <text x="0" y="122" style={text}>省下门面的房租，平台费另算</text>
    </svg>
  );
}

/** 共享厨房和快闪: one kitchen's day, someone else's shop in the evening and your trial in the hours it stands idle. */
function BorrowedHours() {
  const hx = (h: number) => ((h - 6) / 18) * 320;
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="示意图：同一间厨房，晚上是别人的店营业，白天空着的时段借来试卖，有人买再租店面" className="block w-full">
      <defs>{arrow("sf-borrow-ar")}</defs>
      <text x="0" y="14" style={text}>同一间厨房的一天</text>
      <rect x="0" y="26" width="320" height="38" rx="6" style={{ ...box, strokeDasharray: "4 3" }} />
      <rect x={hx(8)} y="26" width={hx(15) - hx(8)} height="38" rx="6" style={soft} />
      <text x={(hx(8) + hx(15)) / 2} y="50" textAnchor="middle" style={{ ...strong, fill: accent }}>借来试卖</text>
      <rect x={hx(17)} y="26" width={hx(24) - hx(17)} height="38" rx="6" style={{ fill: "var(--ink-4)", opacity: 0.3 }} />
      <text x={(hx(17) + hx(24)) / 2} y="50" textAnchor="middle" style={{ ...text, fill: "var(--ink-2)" }}>别人的店营业</text>
      <text x={hx(8)} y="84" style={text}>早上</text>
      <text x={hx(15)} y="84" textAnchor="middle" style={text}>下午</text>
      <text x="320" y="84" textAnchor="end" style={text}>晚上</text>
      <rect x="40" y="104" width="96" height="36" rx="8" style={soft} />
      <text x="88" y="127" textAnchor="middle" style={{ ...strong, fill: accent }}>有人买</text>
      <path d="M139 122 H175" style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#sf-borrow-ar)" />
      <rect x="180" y="104" width="100" height="36" rx="8" style={box} />
      <text x="230" y="127" textAnchor="middle" style={strong}>再租店面</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "kiosk": { kind: "示意", caption: "几家店先用餐车或摊位起步，投入比实体店低，还能换地方试产品和客群；再开面积小、菜单简单的小店，有了把握才开正式的店面。", draw: () => <SmallFirst /> },
  "delivery-only": { kind: "示意", caption: "不租门面，店就是一间厨房，菜经配送或上门服务送到客人那里。门面的房租省下来，外卖平台的费用要另外算。", draw: () => <KitchenOnly /> },
  "shared-kitchen": { kind: "示意", caption: "先借共享厨房，或别人的店空着的时段试卖，确认有人买，再租自己的店面。图中的时段只是示意。", draw: () => <BorrowedHours /> },
};
