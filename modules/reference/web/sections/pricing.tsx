// The pictures of the sections of pricing (sections/index.ts keys them by "pricing/<cause key>").
import { text, strong, hot, accent, box, soft, Eg, type Section } from "./kit";

/** 按成本算: a dish's food cost divided by the shop's own cost rate, rounded to the price on the menu. */
function FromCost() {
  const steps: Array<[string, string, boolean]> = [["食材成本", "12 元", false], ["除以成本率", "35%", false], ["售价", "35 元", true]];
  return (
    <svg viewBox="0 0 320 100" role="img" aria-label="举例：一道菜食材成本 12 元，除以成本率 35%，约 34.3 元，取整定为 35 元" className="block w-full">
      <defs><marker id="sec-cost-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      {steps.map(([name, value, last], i) => (
        <g key={name}>
          <rect x={i * 112} y="4" width="96" height="56" rx="8" style={last ? soft : box} />
          <text x={i * 112 + 48} y="26" textAnchor="middle" style={last ? { ...text, fill: accent } : text}>{name}</text>
          <text x={i * 112 + 48} y="49" textAnchor="middle" style={last ? { ...strong, fill: accent, fontSize: 17 } : { ...strong, fontSize: 17 }}>{value}</text>
          {i < 2 && <path d={`M${i * 112 + 99} 32 H${i * 112 + 108}`} style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#sec-cost-ar)" />}
        </g>
      ))}
      <text x="0" y="90" style={{ ...text, fill: "var(--ink-2)" }}>12 ÷ 35% ≈ 34.3 元，取整为 35 元</text>
      <Eg x={232} y={89} />
    </svg>
  );
}

/** 看客人愿意付多少: the same bowl priced for different guests and hours. */
function SameDish() {
  const rows: Array<[string, number]> = [["上班族午餐", 15], ["晚上聚餐", 22], ["周末家庭套餐", 28]];
  const w = (v: number) => (v / 28) * 160;
  return (
    <svg viewBox="0 0 320 126" role="img" aria-label="举例：同一碗面，上班族午餐 15 元，晚上聚餐 22 元，周末家庭套餐 28 元" className="block w-full">
      <text x="0" y="16" style={strong}>同一碗面</text>
      <Eg x={72} y={15} />
      {rows.map(([who, v], i) => (
        <g key={who}>
          <text x="0" y={i * 34 + 51} style={text}>{who}</text>
          <rect x="92" y={i * 34 + 33} width={w(v)} height="24" rx="6" style={{ fill: accent, opacity: 0.35 + i * 0.2 }} />
          <text x={92 + w(v) + 8} y={i * 34 + 51} style={strong}>{v} 元</text>
        </g>
      ))}
    </svg>
  );
}

/** 怎样涨价: the menu with the signature and children's dishes kept as they were and the rise on a few others, told a month ahead. */
function RaiseSome() {
  const items: Array<[string, boolean]> = [["招牌菜", false], ["儿童餐", false], ["牛排", true], ["海鲜", true], ["酒水", true]];
  return (
    <svg viewBox="0 0 320 176" role="img" aria-label="示意图：招牌菜和儿童餐保持原价，涨价放在牛排、海鲜和酒水上；涨价前提前一个月告知客人" className="block w-full">
      <rect x="2" y="2" width="192" height="172" rx="8" style={box} />
      <text x="16" y="26" style={strong}>菜单</text>
      {items.map(([name, up], i) => {
        const y = i * 28 + 54;
        return (
          <g key={name}>
            <text x="16" y={y} style={{ ...text, fill: "var(--ink-2)" }}>{name}</text>
            {up
              ? <g><path d={`M160 ${y + 1} V${y - 12} M154 ${y - 6} L160 ${y - 12} L166 ${y - 6}`} style={{ fill: "none", stroke: hot, strokeWidth: 2.2, strokeLinecap: "round" }} /><text x="178" y={y} textAnchor="end" style={{ fill: hot, fontSize: 14, fontWeight: 700 }}>涨</text></g>
              : <text x="178" y={y} textAnchor="end" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>原价</text>}
          </g>
        );
      })}
      <rect x="214" y="40" width="104" height="92" rx="8" style={soft} />
      <path d="M214 68 H318" style={{ stroke: accent, strokeWidth: 1.2 }} />
      <text x="266" y="60" textAnchor="middle" style={{ ...text, fill: accent, fontWeight: 700 }}>涨价前</text>
      <text x="266" y="94" textAnchor="middle" style={{ ...strong, fill: accent }}>提前一个月</text>
      <text x="266" y="117" textAnchor="middle" style={{ ...text, fill: "var(--ink-2)" }}>告知客人</text>
    </svg>
  );
}

/** 菜单的结构和摆放: a menu page with the dish most wanted sold first in the eye, with a photo and a line, the rest smaller. */
function MenuPage() {
  const small: Array<[number, number]> = [[196, 16], [196, 62], [76, 114], [196, 114], [76, 160], [196, 160]];
  return (
    <svg viewBox="0 0 320 210" role="img" aria-label="示意图：菜单的一页，客人先看到的左上方放最想卖的菜，配照片和说明，其他菜放小一些" className="block w-full">
      <defs><marker id="sec-menu-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      <text x="0" y="40" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>先看到</text>
      <path d="M22 48 C22 62 40 62 60 58" style={{ fill: "none", stroke: accent, strokeWidth: 1.8 }} markerEnd="url(#sec-menu-ar)" />
      <rect x="64" y="4" width="252" height="202" rx="8" style={box} />
      <rect x="76" y="16" width="110" height="84" rx="6" style={soft} />
      <circle cx="131" cy="44" r="18" style={{ fill: "var(--surface)", stroke: accent, strokeWidth: 1.5 }} />
      <circle cx="131" cy="44" r="9" style={{ fill: accent, opacity: 0.35 }} />
      <text x="131" y="88" textAnchor="middle" style={{ ...text, fill: accent, fontWeight: 700 }}>最想卖的菜</text>
      {small.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="108" height="38" rx="6" style={{ fill: "none", stroke: "var(--line-strong)" }} />
          <rect x={x + 10} y={y + 11} width="58" height="6" rx="3" style={{ fill: "var(--ink-4)", opacity: 0.45 }} />
          <rect x={x + 10} y={y + 23} width="38" height="5" rx="2.5" style={{ fill: "var(--ink-4)", opacity: 0.25 }} />
        </g>
      ))}
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "cost-based": { kind: "举例", caption: "假设你的餐饮店一道菜的食材成本是 12 元，按自家房租和人工定下的食材成本率是 35%，12 除以 35% 约是 34.3 元，取整定为 35 元。成本率按自家的房租和人工来定，不照搬行业平均值。", draw: () => <FromCost /> },
  "what-guests-pay": { kind: "举例", caption: "假设你的餐饮店同一碗面，工作日中午卖给上班族 15 元，晚上聚餐时 22 元，周末配成家庭套餐 28 元。不同的客人、不同的时段，愿意付的价钱不一样。", draw: () => <SameDish /> },
  "raise-prices": { kind: "示意", caption: "涨价不一定全线同幅。有的店把招牌菜和儿童餐保持原价，留作客人比较的价格锚，涨价放在牛排、海鲜和酒水等菜上；涨价前提前一个月在门口和社交账号告知，各渠道同一天改价。", draw: () => <RaiseSome /> },
  "menu-layout": { kind: "示意", caption: "按客人看菜单的顺序排：最想卖的菜放在客人先看到的左上方，配照片和说明，其他菜放小一些。", draw: () => <MenuPage /> },
};
