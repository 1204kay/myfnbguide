// The pictures of the sections of takeout (sections/index.ts keys them by "takeout/<cause key>").
import { text, strong, hot, accent, box, soft, Eg, BeforeAfter, type Section } from "./kit";

/** 卖哪些菜、怎么包装: the long dine-in menu against a short takeaway one, each dish chosen for the trip home. */
function TakeawayMenu() {
  const keeps = ["放一段时间还好吃", "到家好加热", "好拿、不洒", "按人数备料"];
  return (
    <svg viewBox="0 0 320 168" role="img" aria-label="示意图：堂食菜单很长；另做的外带菜单只留几样，放一段时间还好吃、到家好加热、好拿不洒、按人数备料" className="block w-full">
      <defs><marker id="to-menu-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      <text x="44" y="14" textAnchor="middle" style={text}>堂食菜单</text>
      <rect x="0" y="24" width="88" height="140" rx="8" style={box} />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x="12" y={36 + i * 14} width={i % 3 === 1 ? 48 : 64} height="6" rx="3" style={{ fill: "var(--ink-4)", opacity: 0.35 }} />)}
      <path d="M92 94 H112" style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#to-menu-ar)" />
      <text x="218" y="14" textAnchor="middle" style={{ ...strong, fill: accent }}>另做的外带菜单</text>
      <rect x="118" y="24" width="202" height="140" rx="8" style={soft} />
      {keeps.map((k, i) => (
        <g key={k}>
          <path d={`M132 ${i * 32 + 50} l5 5 l9 -11`} style={{ fill: "none", stroke: accent, strokeWidth: 2, strokeLinecap: "round" }} />
          <text x="154" y={i * 32 + 56} style={{ ...strong, fill: accent, fontSize: 14 }}>{k}</text>
        </g>
      ))}
    </svg>
  );
}

/** 外带的定价和成本: one dish at the same price, eaten in against taken away: the box and the platform's cut come off. */
function TakeawayCost() {
  const x = (v: number) => 56 + v * 8.8;
  const seg = (from: number, to: number, y: number, style: object) => <rect x={x(from)} y={y} width={x(to) - x(from)} height="30" style={style} />;
  const cut = (at: number, y: number) => <path d={`M${x(at)} ${y} V${y + 30}`} style={{ stroke: "var(--surface)", strokeWidth: 2 }} />;
  // Words on a full bar, like the bars of ui.tsx: the accent's own contrast, white on red (bg-hot text-white).
  const white = { fill: "var(--accent-contrast)", fontSize: 14, fontWeight: 700 } as const;
  return (
    <svg viewBox="0 0 320 156" role="img" aria-label="举例：一份 30 元的菜，堂食扣掉食材 12 元剩 18 元；外卖再扣容器 2 元和平台抽成 9 元，剩 7 元" className="block w-full">
      <text x="0" y="30" style={strong}>堂食</text>
      {seg(0, 12, 10, { fill: "var(--ink-4)", opacity: 0.3 })}
      {seg(12, 30, 10, { fill: accent })}
      {cut(12, 10)}
      <text x={(x(0) + x(12)) / 2} y="30" textAnchor="middle" style={{ ...text, fill: "var(--ink-2)" }}>食材 12 元</text>
      <text x={(x(12) + x(30)) / 2} y="30" textAnchor="middle" style={white}>剩 18 元</text>
      <text x="0" y="74" style={strong}>外卖</text>
      {seg(0, 12, 54, { fill: "var(--ink-4)", opacity: 0.3 })}
      {seg(12, 14, 54, { fill: hot, opacity: 0.55 })}
      {seg(14, 23, 54, { fill: hot })}
      {seg(23, 30, 54, { fill: accent })}
      {cut(12, 54)}{cut(14, 54)}{cut(23, 54)}
      <text x={(x(0) + x(12)) / 2} y="74" textAnchor="middle" style={{ ...text, fill: "var(--ink-2)" }}>食材 12 元</text>
      <text x={(x(14) + x(23)) / 2} y="74" textAnchor="middle" style={{ ...white, fill: "white" }}>抽成 9 元</text>
      <text x={(x(23) + x(30)) / 2} y="74" textAnchor="middle" style={white}>剩 7 元</text>
      <path d={`M${x(13)} 86 V96`} style={{ stroke: hot, strokeWidth: 1.5 }} />
      <text x={x(13) - 8} y="112" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>容器 2 元</text>
      <text x="0" y="146" style={strong}>同样卖 30 元，外卖剩 7 元</text>
      <Eg x={204} y={145} />
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "what-to-sell": { kind: "示意", caption: "几家店把堂食菜单放在一边，另做一份外带菜单，只留放一段时间还好吃、到家好加热、好拿的菜，并按人数备料。", draw: () => <TakeawayMenu /> },
  "pricing-costs": { kind: "举例", caption: "假设你的餐饮店一份菜卖 30\u00a0元，食材 12\u00a0元。堂食剩 18\u00a0元；做成外卖，再扣容器和袋子 2\u00a0元、平台抽成 30%\u00a0即 9\u00a0元，只剩 7\u00a0元。外带的价钱要把这几项都算进去。", draw: () => <TakeawayCost /> },
  "kitchen-flow": { kind: "示意", caption: "有的店把点单、收款和接外带单改成一个人也能应付：客人在入口点餐先付款，外带单从线上收，餐具由客人自己拿。也有店把外卖和堂食拆成两套，各自运营。", draw: () => <BeforeAfter label="示意图：点单收款改成入口点餐先付，外带单改成线上收，餐具改成客人自己拿" rows={[["点单收款", "店员到桌边", "入口点餐先付"], ["外带订单", "店员一单单接", "线上收单"], ["餐具", "店员送上", "客人自己拿"]]} /> },
};
