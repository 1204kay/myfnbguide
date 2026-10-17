// The pictures of the sections of competition (sections/index.ts keys them by "competition/<cause key>").
import { text, strong, hot, accent, box, soft, type Section } from "./kit";

/** 不打价格战的做法: when the shop nearby cuts its price, two ways on; the shops here keep the price. */
function KeepThePrice() {
  return (
    <svg viewBox="0 0 320 148" role="img" aria-label="示意图：附近的店降价以后，跟着降价，每份剩得更少；不降价，靠品质和服务留住客人" className="block w-full">
      <defs><marker id="cm-fork-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: "var(--ink-4)" }} /></marker></defs>
      <rect x="0" y="52" width="100" height="36" rx="6" style={box} />
      <text x="50" y="75" textAnchor="middle" style={text}>附近的店降价</text>
      <path d="M104 64 L140 28" style={{ stroke: "var(--ink-4)", strokeWidth: 1.5 }} markerEnd="url(#cm-fork-ar)" />
      <path d="M104 76 L140 104" style={{ stroke: "var(--ink-4)", strokeWidth: 1.5 }} markerEnd="url(#cm-fork-ar)" />
      <rect x="148" y="6" width="110" height="34" rx="6" style={box} />
      <text x="203" y="28" textAnchor="middle" style={text}>跟着降价</text>
      <text x="148" y="60" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>每份剩得更少</text>
      <rect x="148" y="88" width="110" height="34" rx="6" style={soft} />
      <text x="203" y="110" textAnchor="middle" style={{ ...strong, fill: accent }}>不降价</text>
      <text x="148" y="140" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>靠品质和服务留客</text>
    </svg>
  );
}

/** 找出自己的不同: the shop nearby and yours offer much the same; one thing only yours has is why a guest comes. */
function OnlyHere() {
  const same = ["同类的菜", "差不多的价钱"];
  const column = (x: number, name: string, mine: boolean) => (
    <g>
      <rect x={x} y="0" width="150" height="34" rx="6" style={mine ? soft : box} />
      <text x={x + 75} y="22" textAnchor="middle" style={mine ? { ...strong, fill: accent } : strong}>{name}</text>
      {same.map((item, i) => <text key={item} x={x + 75} y={i * 30 + 62} textAnchor="middle" style={text}>{item}</text>)}
      <rect x={x} y="100" width="150" height="34" rx="6" style={mine ? { fill: accent } : { ...box, strokeDasharray: "4 3" }} />
      {mine && <text x={x + 75} y="122" textAnchor="middle" style={{ fill: "var(--accent-contrast)", fontSize: 15, fontWeight: 700 }}>只有这里有的</text>}
    </g>
  );
  return (
    <svg viewBox="0 0 320 136" role="img" aria-label="示意图：附近的店和你的店都有同类的菜、差不多的价钱，你的店多一样只有这里有的" className="block w-full">
      {column(0, "附近的店", false)}
      {column(170, "你的店", true)}
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "no-price-war": { kind: "示意", caption: "附近的店降价时，跟着降价会让每份剩下的钱变少。这里的几家店不跟进降价，而是把品质、服务和出品的稳定当作留住客人的办法。", draw: () => <KeepThePrice /> },
  "be-different": { kind: "示意", caption: "附近开了同类的店，菜和价钱往往差不多。客人选择你的店，靠的是只有这里才有的那一样：一道招牌菜、一种服务或一种氛围。", draw: () => <OnlyHere /> },
};
