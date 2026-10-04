// One picture per situation that explains the whole of it (HANDOFF §3.1), drawn by hand once; a situation
// without its picture yet shows none. Colours are the site's own variables, so both themes work.
import type { ReactNode } from "react";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { Figure, Fill } from "./ui";

const text = { fill: "var(--ink-3)", fontSize: 11 } as const;
const strong = { fill: "var(--ink)", fontSize: 12, fontWeight: 700 } as const;

/** 生意很忙，钱却留不下来: the money poured in leaks through three holes. */
function Bucket({ groups }: { groups: string[] }) {
  return (
    <svg viewBox="0 0 300 250" role="img" aria-label="一只水桶：客人付的钱从上面倒进来，从几个洞漏出去，桶里剩下的才是月底的钱" className="mx-auto block w-full max-w-[300px]">
      <g style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5 }}><circle cx="130" cy="16" r="8" /><circle cx="151" cy="29" r="8" /><circle cx="172" cy="13" r="8" /></g>
      <path d="M150 42 v12 M145 49 l5 7 l5 -7" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5, strokeLinecap: "round" }} />
      <text x="188" y="26" style={text}>客人付的钱</text>
      <path d="M74.8 100 Q112 92 150 100 T225.2 100 L210 226 L90 226 Z" style={{ fill: "var(--accent-soft)" }} />
      <path d="M70 62 L230 62 L210 226 L90 226 Z" style={{ fill: "none", stroke: "var(--ink-3)", strokeWidth: 2, strokeLinejoin: "round" }} />
      <text x="150" y="186" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 11, fontWeight: 700 }}>月底剩下的钱</text>
      {[["M79 136 Q56 138 44 166", 30, 182], ["M220 146 Q243 148 255 176", 268, 194], ["M85.5 190 Q63 192 53 218", 40, 240]].slice(0, groups.length).map(([d, x, y], i) => (
        <g key={i}>
          <path d={String(d)} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 3, strokeLinecap: "round" }} />
          <text x={x} y={y} textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 18, fontWeight: 900 }}>{i + 1}</text>
        </g>
      ))}
    </svg>
  );
}

/** 午市高峰一到，出餐就乱: the way out with dishes and the way back with plates cross at the pass. */
function Kitchen() {
  return (
    <>
      <svg viewBox="0 0 320 200" role="img" aria-label="示意图：出餐的路线和收碗的路线在出餐口交叉" className="block w-full">
        <defs>
          <marker id="ref-ar-a" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker>
          <marker id="ref-ar-g" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--ink-4)" }} /></marker>
        </defs>
        <rect x="6" y="14" width="200" height="176" rx="10" style={{ fill: "none", stroke: "var(--line)", strokeWidth: 1.5 }} />
        <rect x="226" y="14" width="88" height="176" rx="10" style={{ fill: "none", stroke: "var(--line)", strokeWidth: 1.5 }} />
        <text x="16" y="32" style={strong}>厨房</text><text x="236" y="32" style={strong}>餐厅</text>
        <rect x="206" y="88" width="20" height="40" style={{ fill: "var(--bg-sunk)", stroke: "var(--line)" }} />
        <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line)" }}><rect x="22" y="46" width="48" height="26" rx="5" /><rect x="22" y="120" width="48" height="26" rx="5" /><rect x="118" y="46" width="48" height="26" rx="5" /><rect x="118" y="150" width="48" height="26" rx="5" /></g>
        <g textAnchor="middle"><text x="46" y="63.5" style={strong}>冰箱</text><text x="46" y="137.5" style={strong}>备料</text><text x="142" y="63.5" style={strong}>炉灶</text><text x="142" y="167.5" style={strong}>洗碗</text></g>
        <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2.5 }} markerEnd="url(#ref-ar-a)"><path d="M46 74 V116" /><path d="M72 126 Q104 104 122 76" /><path d="M168 66 Q194 78 206 98" /><path d="M228 100 H290" /></g>
        <g style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2, strokeDasharray: "5 4" }} markerEnd="url(#ref-ar-g)"><path d="M290 118 H230" /><path d="M206 120 Q190 146 170 158" /></g>
        <circle cx="216" cy="109" r="15" style={{ fill: "var(--hot-soft)", stroke: "var(--hot)", strokeWidth: 2 }} />
        <text x="216" y="80" textAnchor="middle" style={{ fill: "var(--hot)", fontWeight: 700, fontSize: 12 }}>交叉</text>
        <text x="216" y="146" textAnchor="middle" style={text}>出餐口</text>
      </svg>
      <div className="mt-2 flex gap-4 text-[12.5px] text-ink-3">
        <span className="flex items-center gap-1.5"><i className="h-[3px] w-5 rounded bg-accent" />出餐的路线</span>
        <span className="flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-dashed border-ink-4" />收碗的路线</span>
      </div>
    </>
  );
}

/** 想开第二家店: one owner's twelve hours split among the shops. */
function OwnerHours() {
  return (
    <div className="grid gap-2 text-[13px] text-ink-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2">
          <span>{["一家店", "两家店", "三家店"][n - 1]}</span>
          <div className="flex gap-1">
            {Array.from({ length: n }, (_, i) => <i key={i} className="num flex h-7 flex-1 items-center justify-center rounded-md bg-accent-soft text-[12px] font-semibold not-italic text-accent">{n === 1 ? "12 小时" : 12 / n}</i>)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Rows of a label and a bar, the bars all shares of the same whole. */
function Bars({ rows, label = 48 }: { rows: Array<[string, Parameters<typeof Fill>[0]["parts"]]>; label?: number }) {
  return (
    <div className="grid gap-2 text-[13px] text-ink-3">
      {rows.map(([name, parts]) => (
        <div key={name} className="grid items-center gap-2" style={{ gridTemplateColumns: `${label}px minmax(0,1fr)` }}><span>{name}</span><Fill parts={parts} /></div>
      ))}
    </div>
  );
}

/** 看不懂自己的账: the food comes off the takings first, then the fixed costs; what is left is the profit. */
function Takings() {
  const share = (n: number) => n / 39000;
  return (
    <>
      <Bars rows={[
        ["营业额", [{ label: "39,000 元", share: 1, tone: 1 }]],
        ["毛利", [{ label: "食材", share: share(15600), tone: 3 }, { label: "23,400 元", share: share(23400), tone: 1 }]],
        ["利润", [{ label: "食材", share: share(15600), tone: 3 }, { label: "固定费用", share: share(18000), tone: 2 }, { label: "", share: share(5400), tone: "accent" }]],
      ]} />
      <p className="num mt-3 text-[13px] leading-relaxed text-ink-3">39,000 − 食材 15,600 = 毛利 23,400<br />23,400 − 固定费用 18,000 = 利润 <b className="text-[16px] text-accent">5,400</b> 元</p>
    </>
  );
}

/** 招不到人: people drop out at every step from the notice to the third month. */
function Funnel() {
  return (
    <div className="grid gap-1.5">
      {["看到招聘启事", "来面试", "录用", "做满三个月"].map((step, i) => (
        <div key={step} style={{ width: `${100 - i * 22}%` }} className="mx-auto flex h-8 items-center justify-center rounded-md bg-accent-soft text-[12.5px] font-semibold text-accent">{step}</div>
      ))}
    </div>
  );
}

/** 人工成本上涨: the same takings, labour four points more, profit four points less. */
function LabourShare() {
  return (
    <>
      <Bars rows={[
        ["去年", [{ label: "食材", share: 0.32, tone: 3 }, { label: "人工 28%", share: 0.28, tone: 1 }, { label: "房租和其他", share: 0.3, tone: 4 }, { label: "", share: 0.1, tone: "accent" }]],
        ["今年", [{ label: "食材", share: 0.32, tone: 3 }, { label: "人工 32%", share: 0.32, tone: 1 }, { label: "房租和其他", share: 0.3, tone: 4 }, { label: "", share: 0.06, tone: "accent" }]],
      ]} />
      <p className="mt-3 text-[14px] text-ink-2">人工 <b className="num text-ink">28% → 32%</b>，利润 <b className="num text-accent">10% → 6%</b></p>
    </>
  );
}

/** 老板自己累垮: one owner's day, every part of it his own. */
function OwnerDay() {
  const day: Array<[string, string]> = [["7:00", "采购"], ["9:00", "备料"], ["11:00", "午市"], ["14:00", "备料、对账、处理杂事"], ["17:00", "晚市"], ["21:00", "收尾、记账"]];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <ol className="border-l-2 border-accent-soft pl-3 text-[13px]">
        {day.map(([time, what]) => <li key={time} className="py-0.5"><span className="num inline-block w-12 text-ink-4">{time}</span><span className="text-ink-2">{what}</span></li>)}
        <li className="py-0.5"><span className="num inline-block w-12 text-ink-4">23:00</span><span className="text-ink-4">离开</span></li>
      </ol>
      <div className="text-center"><b className="num block text-[40px] font-black leading-none text-accent">16</b><span className="text-[12px] text-ink-3">小时在店里</span></div>
    </div>
  );
}

/** 想加做外带或外卖: three streams of orders through one kitchen and one pass. */
function OneKitchen() {
  return (
    <svg viewBox="0 0 320 170" role="img" aria-label="示意图：堂食、外带和外卖平台的订单都进同一个厨房，从同一个出餐口出去" className="block w-full">
      <defs><marker id="ref-ar-k" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker></defs>
      <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line)" }}>{[16, 66, 116].map((y) => <rect key={y} x="6" y={y} width="76" height="34" rx="6" />)}</g>
      <g textAnchor="middle" style={strong}><text x="44" y="37.5">堂食</text><text x="44" y="87.5">外带</text><text x="44" y="137.5">外卖平台</text></g>
      <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#ref-ar-k)"><path d="M84 33 Q112 40 134 70" /><path d="M84 83 H132" /><path d="M84 133 Q112 126 134 96" /></g>
      <rect x="136" y="46" width="96" height="74" rx="10" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5 }} />
      <text x="184" y="80" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 13, fontWeight: 700 }}>同一个厨房</text>
      <text x="184" y="98" textAnchor="middle" style={text}>同一批人手</text>
      <path d="M234 83 H272" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#ref-ar-k)" />
      <rect x="276" y="64" width="38" height="38" rx="6" style={{ fill: "var(--bg-sunk)", stroke: "var(--line)" }} />
      <text x="295" y="81" textAnchor="middle" style={strong}>出餐</text><text x="295" y="95" textAnchor="middle" style={strong}>口</text>
    </svg>
  );
}

/** 出品不稳定: the recipe says 100 g; three cooks put in three amounts. */
function Portions() {
  const bowls: Array<[string, number]> = [["甲", 90], ["乙", 100], ["丙", 120]];
  // The bowl runs from its rim (y 40) to its bottom (y 104); 40 g is the bottom, so the differences show.
  const level = (grams: number) => 104 - (grams - 40) * 0.72;
  return (
    <>
      <svg viewBox="0 0 300 140" role="img" aria-label="三碗同一道菜：配方写 100 克，三位厨师各装了 90 克、100 克、120 克" className="mx-auto block w-full max-w-[320px]">
        {bowls.map(([who, grams], i) => {
          const cx = 55 + i * 95;
          const bowl = `M${cx - 40} 40 H${cx + 40} Q${cx + 38} 100 ${cx} 104 Q${cx - 38} 100 ${cx - 40} 40 Z`;
          return (
            <g key={who}>
              <clipPath id={`ref-bowl-${i}`}><path d={bowl} /></clipPath>
              <rect x={cx - 42} y={level(grams)} width="84" height={110 - level(grams)} clipPath={`url(#ref-bowl-${i})`} style={{ fill: "var(--accent)", opacity: 0.3 }} />
              <path d={bowl} style={{ fill: "none", stroke: "var(--ink-3)", strokeWidth: 1.8, strokeLinejoin: "round" }} />
              <text x={cx} y="26" textAnchor="middle" style={text}>厨师{who}</text>
              <text x={cx} y="128" textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 14, fontWeight: 800 }}>{grams} 克</text>
            </g>
          );
        })}
        <path d={`M8 ${level(100)} H292`} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 1.5, strokeDasharray: "5 4" }} />
      </svg>
      <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-3"><i className="h-0 w-5 border-t-2 border-dashed border-accent" />配方写的分量：100 克</div>
    </>
  );
}

/** 开一家店要多少钱: the budget ends on opening day; the months after it still need money. */
function OpeningBudget() {
  const share = (n: number) => n / 35;
  return (
    <>
      <Bars rows={[
        ["预算", [{ label: "30 万元", share: share(30), tone: 1 }]],
        ["实际", [{ label: "装修", share: share(12), tone: 1 }, { label: "设备", share: share(8), tone: 2 }, { label: "", share: share(4), tone: 3 }, { label: "", share: share(2), tone: 4 }, { label: "周转金", share: share(9), tone: "loss" }]],
      ]} />
      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">装修 12 万、设备 8 万、押金和预付房租 4 万、开业前的其他开支 2 万，开业以后三个月的周转金 <b className="num text-hot">9 万</b>：一共 <b className="num text-ink">35 万</b>，超出预算 <b className="num text-hot">5 万</b>。</p>
    </>
  );
}

/** 店开在哪里: the main street has the passers-by and the rent; the side street has neither. */
function TwoStreets() {
  const people = (x0: number, n: number) => Array.from({ length: n }, (_, i) => <circle key={i} cx={x0 + (i % 5) * 22} cy={118 + Math.floor(i / 5) * 16} r="5" style={{ fill: "var(--ink-4)", opacity: 0.55 }} />);
  return (
    <svg viewBox="0 0 320 170" role="img" aria-label="示意图：大街上的店经过的人多、房租高；巷子里的店经过的人少、房租低" className="block w-full">
      {[[10, "大街上", "经过的人多，房租高"], [170, "巷子里", "经过的人少，房租低"]].map(([x, name, note]) => (
        <g key={String(name)}>
          <rect x={Number(x)} y="22" width="140" height="68" rx="8" style={{ fill: "var(--bg-sunk)", stroke: "var(--line)", strokeWidth: 1.5 }} />
          <rect x={Number(x) + 52} y="52" width="36" height="38" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }} />
          <text x={Number(x) + 70} y="42" textAnchor="middle" style={strong}>{name}</text>
          <text x={Number(x) + 70} y="164" textAnchor="middle" style={text}>{note}</text>
        </g>
      ))}
      {people(36, 10)}
      {people(214, 2)}
    </svg>
  );
}

/** 合同和账单里的风险: the lines of a contract that keep costing money after it is signed. */
function ContractLines() {
  const marked: Record<number, string> = { 1: "租金每年调整", 3: "供应商可以调价", 5: "到期自动续约" };
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label="示意图：一份合同里的三行条款被标出来：租金每年调整、供应商可以调价、到期自动续约" className="block w-full">
      <rect x="8" y="8" width="170" height="164" rx="6" style={{ fill: "var(--bg-sunk)", stroke: "var(--line)", strokeWidth: 1.5 }} />
      <text x="22" y="30" style={strong}>合同</text>
      {Array.from({ length: 6 }, (_, i) => {
        const y = 46 + i * 18;
        const note = marked[i];
        return (
          <g key={i}>
            <rect x="22" y={y} width={i % 2 ? 130 : 142} height="7" rx="3.5" style={{ fill: note ? "var(--accent)" : "var(--line-strong)", opacity: note ? 0.85 : 1 }} />
            {note && <><path d={`M168 ${y + 3.5} H190`} style={{ stroke: "var(--accent)", strokeWidth: 1.5 }} /><text x="196" y={y + 7.5} style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>{note}</text></>}
          </g>
        );
      })}
      <text x="22" y="164" style={text}>签字 ______</text>
    </svg>
  );
}

/** 菜单怎么定价: the price has room only between the floor the costs set and the most guests will pay. */
function PriceRange() {
  return (
    <svg viewBox="0 0 300 132" role="img" aria-label="示意图：一条价格带，低于成本算出的底价是亏本，高过客人愿意付的上限点的人变少，中间是可以定价的范围" className="mx-auto block w-full max-w-[320px]">
      <defs>
        <clipPath id="pricing-bar"><rect x="8" y="50" width="284" height="38" rx="7" /></clipPath>
        <marker id="pricing-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker>
      </defs>
      <g clipPath="url(#pricing-bar)">
        <rect x="8" y="50" width="88" height="38" style={{ fill: "var(--hot-soft)" }} />
        <rect x="96" y="50" width="118" height="38" style={{ fill: "var(--accent-soft)" }} />
        <rect x="214" y="50" width="78" height="38" style={{ fill: "var(--bg-sunk)" }} />
      </g>
      <rect x="8" y="50" width="284" height="38" rx="7" style={{ fill: "none", stroke: "var(--line-strong)" }} />
      <path d="M96 36 V96 M214 36 V96" style={{ stroke: "var(--ink-3)", strokeWidth: 2 }} />
      <text x="96" y="28" textAnchor="middle" style={strong}>成本算出的底价</text>
      <text x="214" y="28" textAnchor="middle" style={strong}>客人愿意付的上限</text>
      <text x="155" y="66" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 11, fontWeight: 700 }}>涨价</text>
      <path d="M120 76 H186" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#pricing-ar)" />
      <text x="52" y="114" textAnchor="middle" style={{ fill: "var(--hot)", fontSize: 11, fontWeight: 700 }}>卖一份亏一份</text>
      <text x="155" y="114" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 11, fontWeight: 700 }}>可以定价的范围</text>
      <text x="253" y="114" textAnchor="middle" style={text}>点的人变少</text>
    </svg>
  );
}

/** 外卖平台抽成太高: the same dish leaves 18 in the shop and 7 through the platform. */
function DeliveryShare() {
  const share = (n: number) => n / 30;
  return (
    <>
      <Bars rows={[
        ["堂食", [{ label: "食材", share: share(12), tone: 3 }, { label: "", share: share(18), tone: "accent" }]],
        ["外卖", [{ label: "食材", share: share(12), tone: 3 }, { label: "抽成", share: share(9), tone: 1 }, { label: "", share: share(2), tone: 2 }, { label: "", share: share(7), tone: "accent" }]],
      ]} />
      <p className="num mt-3 text-[13px] leading-relaxed text-ink-3">堂食：食材 12，剩 <b className="text-[16px] text-accent">18</b> 元<br />外卖：食材 12、抽成 9、包装 2，剩 <b className="text-[16px] text-accent">7</b> 元</p>
    </>
  );
}

/** 新人怎么带: teach one thing, let him do it, check it against the written standard, then the next. */
function TeachLoop() {
  return (
    <svg viewBox="0 0 300 200" role="img" aria-label="示意图：教一件事、新人自己做、检查并说清对错，再教下一件，中间是写下来的标准" className="mx-auto block w-full max-w-[320px]">
      <defs><marker id="training-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker></defs>
      <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line-strong)" }}><rect x="100" y="8" width="100" height="32" rx="6" /><rect x="186" y="156" width="108" height="32" rx="6" /><rect x="6" y="156" width="108" height="32" rx="6" /></g>
      <g textAnchor="middle" style={strong}><text x="150" y="28">教一件事</text><text x="240" y="176">新人自己做</text><text x="60" y="176">检查、说清对错</text></g>
      <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#training-ar)"><path d="M204 26 Q258 32 250 150" /><path d="M182 172 H122" /><path d="M48 150 Q40 32 94 26" /></g>
      <text x="38" y="92" textAnchor="end" style={text}>下一件</text>
      <path d="M118 66 H170 L182 78 V136 H118 Z M170 66 V78 H182" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5, strokeLinejoin: "round" }} />
      <text x="150" y="98" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>写下来的</text>
      <text x="150" y="114" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>标准</text>
    </svg>
  );
}

/** 熟客不再来: of twenty first visits, four come back; the ways in sit at each stage. */
function ComeBack() {
  const back = new Set([2, 8, 11, 17]);
  return (
    <svg viewBox="0 0 300 128" role="img" aria-label="举例：一个月第一次来的 20 位客人里，下个月再来的有 4 位" className="mx-auto block w-full max-w-[320px]">
      <defs><marker id="regulars-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--ink-4)" }} /></marker></defs>
      <g textAnchor="middle" style={strong}><text x="60" y="14">第一次来</text><text x="157" y="14">离开以后</text><text x="252" y="14">下个月再来</text></g>
      {Array.from({ length: 20 }, (_, i) => (
        <circle key={i} cx={24 + (i % 5) * 18} cy={32 + Math.floor(i / 5) * 18} r="6" style={back.has(i) ? { fill: "var(--accent)" } : { fill: "var(--ink-4)", opacity: 0.45 }} />
      ))}
      <path d="M112 59 H200" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2, strokeDasharray: "5 4" }} markerEnd="url(#regulars-ar)" />
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={243 + (i % 2) * 18} cy={50 + Math.floor(i / 2) * 18} r="6" style={{ fill: "var(--accent)" }} />)}
      <path d="M8 98 H292" style={{ stroke: "var(--line)" }} />
      <g textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}><text x="60" y="120">记住客人</text><text x="157" y="120">提醒客人</text><text x="252" y="120">会员和积分</text></g>
    </svg>
  );
}

/** 外卖评分下降: the guest scores the dish as it arrives, after a stretch on the road the shop never sees. */
function OnTheRoad() {
  const box = (cx: number) => `M${cx - 22} 58 H${cx + 22} L${cx + 18} 88 H${cx - 18} Z M${cx - 24} 58 H${cx + 24}`;
  return (
    <svg viewBox="0 0 320 128" role="img" aria-label="示意图：外卖从出餐口出去，在路上走一段，客人打开以后打分" className="block w-full">
      <defs><marker id="delivery-ratings-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--ink-4)" }} /></marker></defs>
      <g textAnchor="middle" style={strong}><text x="46" y="18">出餐</text><text x="160" y="18">客人打开</text><text x="274" y="18">评分</text></g>
      <path d="M38 50 q-5 -6 0 -12 q5 -6 0 -12 M54 50 q-5 -6 0 -12 q5 -6 0 -12" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5, strokeLinecap: "round" }} />
      <g style={{ fill: "var(--accent-soft)", stroke: "var(--ink-3)", strokeWidth: 1.8, strokeLinejoin: "round" }}><path d={box(46)} /><path d={box(160)} /></g>
      <g style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2, strokeDasharray: "5 4" }} markerEnd="url(#delivery-ratings-ar)"><path d="M78 72 H124" /><path d="M192 72 H238" /></g>
      <text x="101" y="64" textAnchor="middle" style={text}>路上</text>
      <path d="M274 48 L281 63 L297 64 L285 75 L289 91 L274 83 L259 91 L263 75 L251 64 L267 63 Z" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.8, strokeLinejoin: "round" }} />
      <g textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 11, fontWeight: 700 }}><text x="46" y="116">外卖菜单、包装</text><text x="274" y="116">回复评价</text></g>
      <text x="160" y="116" textAnchor="middle" style={text}>送到时的样子</text>
    </svg>
  );
}

/** 店面和厨房怎么布置: the same room empty and full; full, the chairs pushed back narrow the one aisle everyone uses. */
function EmptyFull() {
  const plan = (x: number, full: boolean) => {
    const tables: Array<[number, number]> = [[x + 22, 72], [x + 104, 72], [x + 22, 118], [x + 104, 118]];
    // Two chairs on each side of a table; when the room is full, the aisle-side chairs are pushed back into the aisle.
    const seats = tables.flatMap(([tx, ty]): Array<[number, number]> => {
      const left = tx < x + 74;
      const inner = left ? tx + 22 + (full ? 16 : 5) : tx - (full ? 16 : 5);
      const outer = left ? tx - 5 : tx + 27;
      return [[inner, ty + 6], [inner, ty + 16], [outer, ty + 6], [outer, ty + 16]];
    });
    const [up, down] = full ? [x + 70, x + 78] : [x + 62, x + 86];
    return (
      <g>
        <text x={x + 74} y="14" textAnchor="middle" style={strong}>{full ? "坐满的时候" : "空着的时候"}</text>
        <rect x={x} y="26" width="148" height="22" style={{ fill: "var(--bg-sunk)" }} />
        <text x={x + 74} y="41" textAnchor="middle" style={text}>厨房</text>
        <path d={`M${x + 60} 158 H${x} V26 H${x + 148} V158 H${x + 88}`} style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5 }} />
        <g style={{ fill: "var(--bg-sunk)", stroke: "var(--ink-4)" }}>{tables.map(([tx, ty]) => <rect key={tx + ty} x={tx} y={ty} width="22" height="22" rx="3" />)}</g>
        {seats.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="4" style={full ? { fill: "var(--ink-4)" } : { fill: "none", stroke: "var(--ink-4)" }} />)}
        <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#layout-ar)"><path d={`M${up} 152 V56`} /><path d={`M${down} 54 V150`} /></g>
      </g>
    );
  };
  return (
    <svg viewBox="0 0 320 166" role="img" aria-label="示意图：同一家店，空着的时候通道很宽；坐满以后椅子往后推，进出的人挤在同一条窄通道里" className="block w-full">
      <defs><marker id="layout-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker></defs>
      {plan(6, false)}
      {plan(166, true)}
    </svg>
  );
}

/** 设备怎么选、坏了怎么办: the stove breaks on Wednesday and the shop stands still until Friday. */
function DownDays() {
  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["一", "二", "三", "四", "五", "六", "日"].map((d, i) => {
          const down = i === 2 || i === 3;
          return (
            <div key={d}>
              <span className="text-[12px] text-ink-4">周{d}</span>
              <i className={`mt-1 flex h-9 items-center justify-center rounded-md text-[12px] font-semibold not-italic ${down ? "border border-dashed border-ink-4 text-ink-4" : "bg-accent-soft text-accent"}`}>{down ? "停业" : "营业"}</i>
            </div>
          );
        })}
      </div>
      <p className="num mt-3 text-[13px] leading-relaxed text-ink-3">维修费 <b className="text-ink">800</b> 元<br />停业两天少收的营业额 <b className="text-[16px] text-ink">6,000</b> 元</p>
    </>
  );
}

/** 加盟还是自己做: what goes to the head office, what comes back, and the contract around both. */
function FranchiseFlows() {
  return (
    <svg viewBox="0 0 320 172" role="img" aria-label="示意图：加盟店向总部付加盟费、管理费和进货的钱，总部给加盟店品牌、配方和培训，两者之间的规矩写在合同里" className="block w-full">
      <defs>
        <marker id="franchise-ar-a" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker>
        <marker id="franchise-ar-g" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--ink-4)" }} /></marker>
      </defs>
      <rect x="6" y="12" width="74" height="104" rx="8" style={{ fill: "var(--bg-sunk)", stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
      <rect x="240" y="12" width="74" height="104" rx="8" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5 }} />
      <text x="43" y="68" textAnchor="middle" style={strong}>总部</text>
      <text x="277" y="68" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>加盟店</text>
      <path d="M84 32 H234" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2 }} markerEnd="url(#franchise-ar-g)" />
      <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#franchise-ar-a)"><path d="M236 60 H86" /><path d="M236 82 H86" /><path d="M236 104 H86" /></g>
      <g textAnchor="middle" style={text}><text x="160" y="26">品牌、配方、培训</text><text x="160" y="54">加盟费（开店时）</text><text x="160" y="76">管理费（每月）</text><text x="160" y="98">向总部进货</text></g>
      <rect x="6" y="130" width="308" height="36" rx="8" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5, strokeDasharray: "5 4" }} />
      <text x="20" y="152" style={strong}>合同</text>
      <text x="54" y="152" style={text}>菜单、售价、装修、年限、退出</text>
    </svg>
  );
}

/** 用 AI 处理店里的事: the numbers, the words and the questions go to AI first; people look before use. */
function AiFirst() {
  return (
    <svg viewBox="0 0 320 156" role="img" aria-label="示意图：账单和销量、菜单和评价、新人的问题先交给 AI 整理、起草或回答，店里的人再看一遍" className="block w-full">
      <defs><marker id="ai-tools-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker></defs>
      <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line-strong)" }}>{[16, 66, 116].map((y) => <rect key={y} x="6" y={y} width="80" height="34" rx="6" />)}</g>
      <g textAnchor="middle" style={strong}><text x="46" y="37.5">账单和销量</text><text x="46" y="87.5">菜单和评价</text><text x="46" y="137.5">新人的问题</text></g>
      <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#ai-tools-ar)"><path d="M88 33 Q104 40 114 64" /><path d="M88 83 H112" /><path d="M88 133 Q104 126 114 102" /></g>
      <rect x="116" y="46" width="100" height="74" rx="10" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5 }} />
      <text x="166" y="80" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 13, fontWeight: 700 }}>AI 先做一遍</text>
      <text x="166" y="98" textAnchor="middle" style={text}>整理、起草、回答</text>
      <path d="M218 83 H244" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#ai-tools-ar)" />
      <rect x="248" y="56" width="66" height="54" rx="8" style={{ fill: "var(--bg-sunk)", stroke: "var(--line-strong)" }} />
      <g textAnchor="middle" style={strong}><text x="281" y="80">店里的人</text><text x="281" y="96">再看一遍</text></g>
    </svg>
  );
}

/** 地图、点评网站和自己的网页: what a guest reads on the phone before setting out. */
function PhoneListing() {
  const rows: Array<[number, string]> = [[84, "营业时间"], [70, "照片和菜单"], [78, "评价和回复"], [58, "网页和订位"]];
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="示意图：手机上的地图和店铺资料：营业时间、照片和菜单、评价和回复、网页和订位" className="block w-full">
      <rect x="10" y="4" width="128" height="192" rx="16" style={{ fill: "none", stroke: "var(--ink-3)", strokeWidth: 1.8 }} />
      <rect x="20" y="18" width="108" height="72" rx="6" style={{ fill: "var(--bg-sunk)" }} />
      <path d="M20 62 H128 M64 18 V90" style={{ stroke: "var(--line-strong)", strokeWidth: 5 }} />
      <path d="M86 34 c-7 0 -12 5 -12 12 c0 9 12 20 12 20 s12 -11 12 -20 c0 -7 -5 -12 -12 -12 z" style={{ fill: "var(--accent)" }} />
      <circle cx="86" cy="46" r="4" style={{ fill: "var(--bg-sunk)" }} />
      <path d="M102 46 H158" style={{ stroke: "var(--accent)", strokeWidth: 1.2 }} />
      <text x="164" y="50" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>在地图上找到</text>
      <rect x="20" y="98" width="108" height="88" rx="6" style={{ fill: "none", stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
      <rect x="30" y="108" width="56" height="8" rx="4" style={{ fill: "var(--ink-3)" }} />
      {rows.map(([w, note], i) => {
        const y = 126 + i * 15;
        return (
          <g key={note}>
            <rect x="30" y={y} width={w} height="7" rx="3.5" style={{ fill: "var(--accent)", opacity: 0.85 }} />
            <path d={`M${30 + w + 4} ${y + 3.5} H158`} style={{ stroke: "var(--accent)", strokeWidth: 1.2 }} />
            <text x="164" y={y + 7.5} style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>{note}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** 浪费和损耗太多: food that comes in and is not sold is thrown away at two places; how much is ordered and prepped decides how much. */
function WasteExits() {
  const steps: Array<[number, string]> = [[6, "进货"], [88, "储存"], [170, "备料"], [252, "卖给客人"]];
  const mark = { fill: "var(--accent)", fontSize: 12, fontWeight: 700 } as const;
  return (
    <svg viewBox="0 0 320 192" role="img" aria-label="示意图：食材从进货、储存、备料到卖给客人；储存时过期、变质的，备料的边角料和当天没卖完的，都被丢弃" className="block w-full">
      <defs>
        <marker id="waste-ar-a" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker>
        <marker id="waste-ar-g" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--ink-4)" }} /></marker>
      </defs>
      <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line)" }}>{steps.map(([x]) => <rect key={x} x={x} y="44" width="62" height="34" rx="6" />)}</g>
      <g textAnchor="middle" style={strong}>{steps.map(([x, name]) => <text key={x} x={x + 31} y="65.5">{name}</text>)}</g>
      <g style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2 }} markerEnd="url(#waste-ar-g)"><path d="M70 61 H84" /><path d="M152 61 H166" /><path d="M234 61 H248" /></g>
      <g textAnchor="middle" style={mark}><text x="37" y="32">订多少</text><text x="201" y="32">备多少</text></g>
      <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2.5 }} markerEnd="url(#waste-ar-a)"><path d="M119 80 Q119 126 140 140" /><path d="M201 80 Q201 126 180 140" /></g>
      <text x="111" y="114" textAnchor="end" style={mark}>过期、变质</text>
      <text x="209" y="114" style={mark}>边角料、没卖完的</text>
      <g style={{ fill: "none", stroke: "var(--ink-3)", strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" }}><path d="M134 148 H186" /><path d="M152 148 V143 H168 V148" /><path d="M140 152 L180 152 L176 186 L144 186 Z" /></g>
      <text x="160" y="174" textAnchor="middle" style={strong}>丢弃</text>
    </svg>
  );
}

/** 员工留不住: one person leaving makes the next one more likely to leave. */
function LeavingLoop() {
  return (
    <svg viewBox="0 0 320 178" role="img" aria-label="示意图：有人离开，剩下的人更累，新人没有人带，又有人离开，形成一个循环" className="block w-full">
      <defs><marker id="retention-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker></defs>
      <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line)" }}><rect x="106" y="8" width="108" height="34" rx="6" /><rect x="8" y="136" width="116" height="34" rx="6" /><rect x="196" y="136" width="116" height="34" rx="6" /></g>
      <g textAnchor="middle" style={strong}><text x="160" y="29.5">有人离开</text><text x="66" y="157.5">新人没有人带</text><text x="254" y="157.5">剩下的人更累</text></g>
      <text x="160" y="60" textAnchor="middle" style={text}>不只因为薪水</text>
      <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2.5 }} markerEnd="url(#retention-ar)"><path d="M218 25 Q254 25 254 130" /><path d="M192 153 H130" /><path d="M66 132 Q66 25 100 25" /></g>
    </svg>
  );
}

/** 排班总是缺人: guests come in two peaks; the same number of people on every hour is short at the peaks and idle between them. */
function StaffCurve() {
  const need = "M20 120 C50 120 58 36 78 36 C100 36 120 118 160 118 C200 118 220 44 242 44 C266 44 280 116 300 116";
  const mark = { fill: "var(--accent)", fontSize: 12, fontWeight: 700 } as const;
  return (
    <>
      <svg viewBox="0 0 320 166" role="img" aria-label="示意图：每个时段需要的人手在午市和晚市最多；每个时段排的人手一样多，高峰时不够，下午有人闲着" className="block w-full">
        <defs>
          <clipPath id="scheduling-above"><rect x="0" y="0" width="320" height="80" /></clipPath>
          <clipPath id="scheduling-below"><rect x="0" y="80" width="320" height="80" /></clipPath>
        </defs>
        <path d={`${need} V140 H20 Z`} clipPath="url(#scheduling-above)" style={{ fill: "var(--accent)", opacity: 0.3 }} />
        <path d="M20 80 H300 V116 C280 116 266 44 242 44 C220 44 200 118 160 118 C120 118 100 36 78 36 C58 36 50 120 20 120 Z" clipPath="url(#scheduling-below)" style={{ fill: "var(--ink-4)", opacity: 0.3 }} />
        <path d="M20 140 H300" style={{ stroke: "var(--line)", strokeWidth: 1.5 }} />
        <path d={need} style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2.5 }} />
        <path d="M20 80 H300" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2, strokeDasharray: "5 4" }} />
        <g textAnchor="middle" style={mark}><text x="78" y="26">人不够</text><text x="242" y="34">人不够</text></g>
        <text x="160" y="104" textAnchor="middle" style={{ fill: "var(--ink-2)", fontSize: 12, fontWeight: 700 }}>人闲着</text>
        <g textAnchor="middle" style={text}><text x="20" y="157" textAnchor="start">开门</text><text x="78" y="157">午市</text><text x="160" y="157">下午</text><text x="242" y="157">晚市</text><text x="300" y="157" textAnchor="end">关门</text></g>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
        <span className="flex items-center gap-1.5"><i className="h-[3px] w-5 rounded bg-accent" />每个时段需要的人手</span>
        <span className="flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-dashed border-ink-4" />每个时段排的人手</span>
      </div>
    </>
  );
}

/** 遇到差评: the review and the reply are read by guests who have not come yet; the cause is still in the shop. */
function ReviewReaders() {
  return (
    <svg viewBox="0 0 320 186" role="img" aria-label="示意图：一条差评和店家的回复，还没来过的客人都看得到；差评说的事，原因在店里：找出原因、改流程" className="block w-full">
      <defs>
        <marker id="bad-reviews-ar-a" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker>
        <marker id="bad-reviews-ar-g" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--ink-4)" }} /></marker>
      </defs>
      <rect x="8" y="8" width="176" height="104" rx="8" style={{ fill: "var(--bg-sunk)", stroke: "var(--line)", strokeWidth: 1.5 }} />
      <text x="20" y="30" style={strong}>差评</text>
      <g style={{ fill: "var(--line-strong)" }}><rect x="20" y="40" width="150" height="6" rx="3" /><rect x="20" y="52" width="118" height="6" rx="3" /></g>
      <rect x="20" y="66" width="152" height="36" rx="6" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }} />
      <text x="30" y="82" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>店家的回复</text>
      <rect x="30" y="89" width="110" height="5" rx="2.5" style={{ fill: "var(--accent)", opacity: 0.35 }} />
      <text x="260" y="30" textAnchor="middle" style={text}>还没来过的客人</text>
      {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={238 + (i % 3) * 22} cy={52 + Math.floor(i / 3) * 22} r="7" style={{ fill: "var(--ink-4)", opacity: 0.55 }} />)}
      <path d="M226 63 H192" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2 }} markerEnd="url(#bad-reviews-ar-g)" />
      <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line)" }}><rect x="40" y="146" width="112" height="34" rx="6" /><rect x="196" y="146" width="112" height="34" rx="6" /></g>
      <g textAnchor="middle" style={strong}><text x="96" y="167.5">找出原因</text><text x="252" y="167.5">改流程</text></g>
      <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#bad-reviews-ar-a)"><path d="M96 114 V140" /><path d="M154 163 H190" /></g>
    </svg>
  );
}

/** 客单价太低: takings are guests times what each spends; twenty more guests or five yuan more from each add the same. */
function TicketArea() {
  const plus = { fill: "var(--accent)", fontSize: 12, fontWeight: 700 } as const;
  return (
    <svg viewBox="0 22 320 174" role="img" aria-label="举例：100 位客人每人 25 元，营业额 2,500 元；多来 20 位客人，或每人多花 5 元，都是多 500 元" className="block w-full">
      <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line-strong)" }}><rect x="10" y="50" width="110" height="100" /><rect x="180" y="50" width="110" height="100" /></g>
      <g style={{ fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5 }}><rect x="120" y="50" width="22" height="100" /><rect x="180" y="30" width="110" height="20" /></g>
      <g textAnchor="middle" style={strong}><text x="65" y="97">100 位 × 25 元</text><text x="235" y="97">100 位 × 25 元</text></g>
      <g textAnchor="middle" style={text}><text x="65" y="115">营业额 2,500 元</text><text x="235" y="115">营业额 2,500 元</text></g>
      <g textAnchor="middle" style={plus}><text x="131" y="42">+500 元</text><text x="235" y="44.5">+500 元</text></g>
      <g textAnchor="middle" style={strong}><text x="76" y="172">多来 20 位客人</text><text x="235" y="172">每人多花 5 元</text></g>
      <text x="235" y="189" textAnchor="middle" style={text}>菜单、推荐、套餐和加购</text>
    </svg>
  );
}

/** 菜单太长: a quarter of the dishes sell three quarters of the plates; every other dish is still bought in and prepped. */
function MenuTail() {
  return (
    <>
      <Bars rows={[
        ["菜单", [{ label: "10 道", share: 0.25, tone: "accent" }, { label: "另外 30 道", share: 0.75, tone: 2 }]],
        ["卖出", [{ label: "150 份", share: 0.75, tone: "accent" }, { label: "50 份", share: 0.25, tone: 2 }]],
      ]} />
      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">另外 30 道菜一天一共卖 <b className="num text-ink">50</b> 份，平均每道不到 <b className="num text-ink">2</b> 份，每一道仍要进货、备料、占冰箱的位置。</p>
    </>
  );
}

/** 开业头几个月: before opening the number of guests is a guess; after it, the real number can be above or below it. */
function OpeningGuess() {
  const mark = { fill: "var(--accent)", fontSize: 12, fontWeight: 700 } as const;
  return (
    <svg viewBox="0 0 320 160" role="img" aria-label="示意图：开业以前，每天的客人数只能估计；开业以后，实际可能比估计的多，也可能比估计的少" className="block w-full">
      <rect x="8" y="22" width="56" height="102" rx="6" style={{ fill: "var(--bg-sunk)", stroke: "var(--line)" }} />
      <text x="36" y="77" textAnchor="middle" style={strong}>试营业</text>
      <path d="M64 22 V124" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5 }} />
      <text x="64" y="14" textAnchor="middle" style={strong}>开业</text>
      <path d="M8 124 H312" style={{ stroke: "var(--line)", strokeWidth: 1.5 }} />
      <path d="M64 72 H312" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2, strokeDasharray: "5 4" }} />
      <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2.5 }}><path d="M64 72 C84 40 104 36 312 36" /><path d="M64 72 C84 104 104 108 312 108" /></g>
      <g textAnchor="end" style={mark}><text x="312" y="28">比估计的多，忙不过来</text><text x="312" y="100">比估计的少</text></g>
      <text x="312" y="66" textAnchor="end" style={text}>开业前估计的客人数</text>
      <path d="M66 130 V136 H310 V130" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.2 }} />
      <text x="188" y="152" textAnchor="middle" style={text}>头 90 天</text>
    </svg>
  );
}

/** 装修超支、工期拖延: the money runs over, the time runs over, and the extra month is a month of rent with the shop still shut. */
function RenovationOverrun() {
  return (
    <>
      <div className="grid gap-4">
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">装修费</p>
          <Bars rows={[
            ["预算", [{ label: "15 万元", share: 15 / 18, tone: 1 }]],
            ["实际", [{ label: "18 万元", share: 15 / 18, tone: 1 }, { label: "", share: 3 / 18, tone: "loss" }]],
          ]} />
        </div>
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">工期</p>
          <Bars rows={[
            ["计划", [{ label: "2 个月", share: 2 / 3, tone: 1 }]],
            ["实际", [{ label: "3 个月", share: 2 / 3, tone: 1 }, { label: "多 1 个月", share: 1 / 3, tone: "loss" }]],
          ]} />
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">装修多花 <b className="num whitespace-nowrap text-hot">3 万元</b>；多出的一个月还没开业，房租照付 <b className="num whitespace-nowrap text-hot">1.2 万元</b>：一共多付 <b className="num whitespace-nowrap text-[16px] text-hot">4.2 万元</b>。</p>
    </>
  );
}

/** 收款和营业款: card and e-wallet money stops at the payment company, which keeps a fee and pays out later; cash comes straight in; both are checked against the till. */
function PaymentPath() {
  const mark = { fill: "var(--accent)", fontSize: 12, fontWeight: 700 } as const;
  return (
    <svg viewBox="0 0 320 176" role="img" aria-label="示意图：刷卡和电子钱包的钱先进入收款公司，扣掉手续费，过一段时间才到店里；现金直接到店里；店里收到的钱和收银系统的营业额对账" className="block w-full">
      <defs>
        <marker id="payments-ar-a" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker>
        <marker id="payments-ar-g" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--ink-4)" }} /></marker>
      </defs>
      <path d="M41 56 Q41 26 91 26 H221 Q271 26 271 52" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2 }} markerEnd="url(#payments-ar-g)" />
      <text x="156" y="19" textAnchor="middle" style={text}>现金</text>
      <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line)" }}><rect x="4" y="58" width="74" height="34" rx="6" /><rect x="226" y="58" width="90" height="34" rx="6" /><rect x="204" y="138" width="112" height="32" rx="6" /></g>
      <rect x="106" y="54" width="90" height="42" rx="6" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5 }} />
      <g textAnchor="middle" style={strong}><text x="41" y="79.5">客人付的钱</text><text x="271" y="79.5">店里收到的钱</text><text x="260" y="158.5">收银系统的营业额</text></g>
      <text x="151" y="73" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 13, fontWeight: 700 }}>收款公司</text>
      <text x="151" y="89" textAnchor="middle" style={text}>刷卡、电子钱包</text>
      <text x="151" y="46" textAnchor="middle" style={text}>钱先停在这里</text>
      <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#payments-ar-a)"><path d="M80 75 H102" /><path d="M198 75 H222" /><path d="M151 98 V112" /></g>
      <text x="151" y="129" textAnchor="middle" style={mark}>手续费</text>
      <path d="M271 94 V138" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2, strokeDasharray: "4 4" }} />
      <text x="263" y="121" textAnchor="end" style={mark}>对账</text>
    </svg>
  );
}

/** 账上有利润，手上没现金: the month's profit goes into prepaid rent, extra stock and money the platform still owes; the cash in hand ends lower than it began. */
function CashLocked({ groups }: { groups: string[] }) {
  const n = (title: string) => (groups.length > 1 ? groups.indexOf(title) + 1 : 0);
  const mark = (title: string, x: number, y: number) => n(title) > 0 && <g><circle cx={x} cy={y} r="9" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }} /><text x={x} y={y + 4} textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 800 }}>{n(title)}</text></g>;
  const x = (yuan: number) => 126 + yuan * 0.018;
  // Each row runs from one running total to the next; the last row is the month's change in cash.
  const rows: Array<[string, number, number, string]> = [["账上的利润", 0, 5400, "+5,400"], ["预付的房租", 5400, 3400, "−2,000"], ["多出的库存", 3400, 400, "−3,000"], ["平台还没结算", 400, -2000, "−2,400"], ["手上的现金", 0, -2000, "−2,000"]];
  return (
    <svg viewBox="0 0 300 170" role="img" aria-label="举例：这个月账上的利润 5,400 元，预付房租 2,000 元，库存多出 3,000 元，平台还有 2,400 元没有结算，手上的现金比月初少了 2,000 元" className="block w-full">
      <path d="M0 123 H300" style={{ stroke: "var(--line)" }} />
      <path d="M126 2 V150" style={{ stroke: "var(--ink-4)", strokeDasharray: "4 3" }} />
      <text x="126" y="164" textAnchor="middle" style={text}>0</text>
      {rows.map(([name, from, to, value], i) => {
        const y = 8 + i * 30;
        const last = i === rows.length - 1;
        const left = Math.min(x(from), x(to));
        const right = Math.max(x(from), x(to));
        return (
          <g key={name}>
            <text x="0" y={y + 14} style={last ? strong : { ...text, fontSize: 12 }}>{name}</text>
            <rect x={left} y={y} width={right - left} height="20" rx="3" style={{ fill: i === 0 ? "var(--accent)" : last ? "var(--hot)" : "var(--ink-4)", opacity: i === 0 || last ? 1 : 0.45 }} />
            <text x={right + 5} y={y + 14} style={{ ...strong, fill: i === 0 ? "var(--accent)" : last ? "var(--hot)" : "var(--ink-2)" }}>{value}</text>
            {i > 0 && <path d={`M${x(rows[i - 1][2])} ${y - 10} V${y}`} style={{ stroke: "var(--ink-4)" }} />}
          </g>
        );
      })}
      {n("钱被什么占住") > 0 && <path d="M272 40 H278 V116 H272" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 1.5 }} />}
      {mark("钱被什么占住", 290, 78)}
      {mark("留出周转的钱", 268, 138)}
      {mark("借钱和还款", 290, 138)}
    </svg>
  );
}

/** 水电燃气费越来越高: the bill is an area, how much each use takes times the price of each unit; the rise in price adds a strip on the right. */
function EnergyBill({ groups }: { groups: string[] }) {
  const n = (title: string) => (groups.length > 1 ? groups.indexOf(title) + 1 : 0);
  const mark = (title: string, x: number, y: number) => n(title) > 0 && <g><circle cx={x} cy={y} r="9" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }} /><text x={x} y={y + 4} textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 800 }}>{n(title)}</text></g>;
  // The bill as an area: each row is what one use takes (its height is how much); the width is the price of each unit.
  const rows: Array<[string, number, number]> = [["冷藏", 8, 42], ["炉灶", 42, 72], ["空调", 72, 96], ["洗碗", 96, 118]];
  return (
    <svg viewBox="0 0 300 172" role="img" aria-label="示意图：一个月的水电燃气费画成一块面积，每一行是冷藏、炉灶、空调、洗碗和空转用掉的量，宽是单价，右边一截是单价上涨多付的" className="block w-full">
      <defs>
        <pattern id="utilities-idle" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V6" style={{ stroke: "var(--ink-4)", strokeWidth: 1.5, opacity: 0.4 }} /></pattern>
      </defs>
      <rect x="44" y="8" width="184" height="130" style={{ fill: "var(--bg-sunk)" }} />
      <rect x="44" y="118" width="184" height="20" style={{ fill: "url(#utilities-idle)" }} />
      <rect x="228" y="8" width="62" height="130" style={{ fill: "var(--accent-soft)" }} />
      <path d="M44 42 H228 M44 72 H228 M44 96 H228 M44 118 H228" style={{ stroke: "var(--ink-4)", opacity: 0.6 }} />
      <path d="M228 8 V138" style={{ stroke: "var(--ink-3)", strokeWidth: 1.5, strokeDasharray: "5 4" }} />
      <rect x="44" y="8" width="246" height="130" style={{ fill: "none", stroke: "var(--ink-3)", strokeWidth: 1.5 }} />
      {rows.map(([name, a, b]) => <text key={name} x="54" y={(a + b) / 2 + 4} style={strong}>{name}</text>)}
      <text x="54" y="132" style={{ ...strong, fill: "var(--ink-3)" }}>空转</text>
      <text x="259" y="66" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>单价上涨</text>
      <text x="259" y="82" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>多付的</text>
      <g style={{ fill: "none", stroke: "var(--ink-4)" }}><path d="M38 8 H34 V138 H38" /><path d="M44 144 V148 H226 V144" /><path d="M230 144 V148 H290 V144" /></g>
      <text x="22" y="80" textAnchor="middle" style={text}>用</text>
      <text x="22" y="94" textAnchor="middle" style={text}>量</text>
      <text x="136" y="162" textAnchor="middle" style={text}>去年的单价</text>
      {mark("算清楚花在哪里", 22, 52)}
      {mark("设备和使用习惯", 96, 128)}
      {mark("合同和价格", 259, 156)}
    </svg>
  );
}

/** 员工不合适，要不要辞退: keep him and the others cover for him; let him go and the rota is one short. */
function KeepOrLetGo({ groups }: { groups: string[] }) {
  const n = (title: string) => (groups.length > 1 ? groups.indexOf(title) + 1 : 0);
  const mark = (title: string, x: number, y: number) => n(title) > 0 && <g><circle cx={x} cy={y} r="9" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }} /><text x={x} y={y + 4} textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 800 }}>{n(title)}</text></g>;
  const person = (cx: number, hy: number, style: { fill: string; stroke?: string; strokeWidth?: number; strokeDasharray?: string }) => <g style={style}><circle cx={cx} cy={hy} r="7" /><path d={`M${cx - 12} ${hy + 24} Q${cx - 12} ${hy + 11} ${cx} ${hy + 11} Q${cx + 12} ${hy + 11} ${cx + 12} ${hy + 24} Z`} /></g>;
  const team = { fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5 };
  return (
    <svg viewBox="0 0 300 190" role="img" aria-label="示意图：留下不合适的人，其他人要替他补位；谈过仍然没有改、辞退以后，排班少一个人" className="block w-full">
      <defs><marker id="wrong-person-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker></defs>
      <text x="0" y="56" style={strong}>留下</text>
      <text x="0" y="154" style={strong}>辞退</text>
      <text x="170" y="14" textAnchor="middle" style={text}>不合适的人</text>
      {[70, 120, 220, 270].map((cx) => <g key={cx}>{person(cx, 38, team)}{person(cx, 136, team)}</g>)}
      {person(170, 38, { fill: "var(--ink-3)" })}
      {person(170, 136, { fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5, strokeDasharray: "3 3" })}
      <text x="170" y="80" textAnchor="middle" style={text}>其他人要替他补位</text>
      <path d="M170 88 V112" style={{ stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#wrong-person-ar)" />
      <text x="180" y="104" style={{ ...text, fill: "var(--ink-2)" }}>谈过，仍然没有改</text>
      <text x="170" y="182" textAnchor="middle" style={text}>排班少一个人，要有人接上</text>
      {mark("标准和底线", 214, 10)}
      {mark("怎么谈", 150, 100)}
      {mark("辞退以后", 250, 178)}
    </svg>
  );
}

/** 周末满，平日冷清: the weekend fills every seat with a queue; the weekdays stop short of the line that pays a day's rent and wages. */
function SeatsByDay() {
  const days: Array<[string, number]> = [["周一", 0.45], ["周二", 0.4], ["周三", 0.5], ["周四", 0.5], ["周五", 0.75], ["周六", 1], ["周日", 1]];
  const top = 40, bottom = 140, line = 0.6;
  const y = (share: number) => bottom - share * (bottom - top);
  return (
    <>
      <svg viewBox="0 0 300 168" role="img" aria-label="示意图：一周七天的座位，周六、周日坐满还有人排队，周一到周四只坐了一半左右，来的客人不够付一天的房租和人工" className="block w-full">
        {days.map(([day, share], i) => {
          const cx = 28 + i * 40;
          return (
            <g key={day}>
              <rect x={cx - 13} y={top} width="26" height={bottom - top} rx="3" style={{ fill: "var(--bg-sunk)", stroke: "var(--line-strong)" }} />
              <rect x={cx - 13} y={y(share)} width="26" height={bottom - y(share)} rx="3" style={{ fill: "var(--accent)", opacity: 0.85 }} />
              {share < line && <rect x={cx - 13} y={y(line)} width="26" height={y(share) - y(line)} style={{ fill: "var(--hot-soft)", stroke: "var(--hot)", strokeWidth: 1 }} />}
              <text x={cx} y="158" textAnchor="middle" style={share === 1 ? strong : { ...text, fontSize: 12 }}>{day}</text>
            </g>
          );
        })}
        <g style={{ fill: "var(--ink-4)" }}>{[220, 228, 236, 260, 268, 276].map((cx, i) => <circle key={cx} cx={cx} cy={i % 3 === 1 ? 24 : 30} r="3.5" />)}</g>
        <text x="248" y="12" textAnchor="middle" style={text}>排队</text>
        <path d={`M6 ${y(line)} H294`} style={{ stroke: "var(--ink-2)", strokeWidth: 1.5, strokeDasharray: "5 4" }} />
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
        <span className="flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-dashed border-ink-2" />够付一天房租和人工的客人数</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm border border-hot bg-hot-soft" />还差的客人</span>
      </div>
    </>
  );
}

/** 附近开了竞争对手: cut the price by 6 元 and the whole cut comes out of what each serving leaves after the food. */
function PriceCut() {
  const share = (n: number) => n / 30;
  return (
    <>
      <Bars rows={[
        ["原价", [{ label: "食材 12 元", share: share(12), tone: 3 }, { label: "剩 18 元", share: share(18), tone: "accent" }]],
        ["降价后", [{ label: "食材 12 元", share: share(12), tone: 3 }, { label: "剩 12 元", share: share(12), tone: "accent" }]],
      ]} />
      <p className="num mt-3 text-[13px] leading-relaxed text-ink-3">原来卖 100 份：100 × 18 = 1,800 元<br />降价后卖 150 份：150 × 12 = 1,800 元<br />多卖 <b className="text-[16px] text-accent">50</b> 份，剩下的钱才和原来一样</p>
    </>
  );
}

/** 食品安全和卫生: five steps from delivery to the table, and which of them each kind of risk covers. */
function FoodSteps({ groups }: { groups: string[] }) {
  const n = (title: string) => (groups.length > 1 ? groups.indexOf(title) + 1 : 0);
  const mark = (title: string, x: number, y: number) => n(title) > 0 && <g><circle cx={x} cy={y} r="9" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }} /><text x={x} y={y + 4} textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 800 }}>{n(title)}</text></g>;
  const steps = ["收货", "冷藏", "备料", "烹调", "上桌"];
  const left = (i: number) => 26 + i * 61;
  // Each risk runs under the steps it touches: from the first one's left edge to the last one's right edge.
  const risks: Array<[string, string, number, number]> = [["温度控制", "温度", 1, 4], ["清洁", "清洁", 0, 4], ["过敏原和记录", "过敏原", 2, 4]];
  return (
    <svg viewBox="0 0 320 148" role="img" aria-label="示意图：从收货、冷藏、备料、烹调到上桌五道工序；温度关系到冷藏到上桌，清洁关系到每一道工序，过敏原关系到备料到上桌" className="block w-full">
      <defs><marker id="food-safety-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--ink-4)" }} /></marker></defs>
      {steps.map((step, i) => (
        <g key={step}>
          <rect x={left(i)} y="8" width="46" height="32" rx="6" style={{ fill: "var(--bg-sunk)", stroke: "var(--line-strong)" }} />
          <text x={left(i) + 23} y="28.5" textAnchor="middle" style={strong}>{step}</text>
          {i < 4 && <path d={`M${left(i) + 48} 24 H${left(i) + 59}`} style={{ stroke: "var(--ink-4)", strokeWidth: 1.5 }} markerEnd="url(#food-safety-ar)" />}
        </g>
      ))}
      {risks.map(([title, label, a, b], i) => {
        const y = 56 + i * 30;
        return (
          <g key={title}>
            <rect x={left(a)} y={y} width={left(b) + 46 - left(a)} height="20" rx="5" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1 }} />
            <text x={left(a) + 8} y={y + 14} style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>{label}</text>
            {mark(title, 10, y + 10)}
          </g>
        );
      })}
    </svg>
  );
}

/** 点餐、上菜、结账太慢: one table's hour; the kitchen takes 12 minutes, the three waits take 23. */
function TableHour({ groups }: { groups: string[] }) {
  const n = (title: string) => (groups.length > 1 ? groups.indexOf(title) + 1 : 0);
  const mark = (title: string, x: number, y: number) => n(title) > 0 && <g><circle cx={x} cy={y} r="9" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }} /><text x={x} y={y + 4} textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 800 }}>{n(title)}</text></g>;
  const x = (minute: number) => 78 + minute * 3.5;
  // [label, group title or "", from minute, to minute]
  const rows: Array<[string, string, number, number]> = [["等点餐", "点餐", 0, 8], ["做菜", "", 8, 20], ["等上菜", "上菜", 20, 25], ["吃饭", "", 25, 50], ["等结账", "结账", 50, 60]];
  return (
    <>
      <svg viewBox="0 0 300 160" role="img" aria-label="举例：一桌客人坐了 60 分钟，等点餐 8 分钟，做菜 12 分钟，等上菜 5 分钟，吃饭 25 分钟，等结账 10 分钟" className="block w-full">
        {rows.map(([name, group, from, to], i) => {
          const y = 8 + i * 26;
          const wait = group !== "";
          const minutes = `${to - from} 分钟`;
          return (
            <g key={name}>
              {group && mark(group, 9, y + 9)}
              <text x="22" y={y + 13} style={wait ? strong : { ...text, fontSize: 12 }}>{name}</text>
              <rect x={x(from)} y={y} width={x(to) - x(from)} height="18" rx="3" style={{ fill: wait ? "var(--accent)" : "var(--ink-4)", opacity: wait ? 1 : 0.4 }} />
              {to === 60
                ? <text x={x(from) - 5} y={y + 13} textAnchor="end" style={wait ? { ...strong, fill: "var(--accent)" } : text}>{minutes}</text>
                : to - from >= 20
                  ? <text x={(x(from) + x(to)) / 2} y={y + 13} textAnchor="middle" style={{ ...text, fill: "var(--ink)" }}>{minutes}</text>
                  : <text x={x(to) + 5} y={y + 13} style={wait ? { ...strong, fill: "var(--accent)" } : text}>{minutes}</text>}
            </g>
          );
        })}
        <path d={`M${x(0)} 138 H${x(60)}`} style={{ stroke: "var(--ink-4)" }} />
        <path d={`M${x(0)} 134 V142 M${x(60)} 134 V142`} style={{ stroke: "var(--ink-4)" }} />
        <text x={x(0)} y="155" textAnchor="middle" style={text}>坐下</text>
        <text x={x(60)} y="155" textAnchor="end" style={text}>离开</text>
      </svg>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-3">三处等待一共 <b className="num text-[16px] text-accent">8 + 5 + 10 = 23</b> 分钟<br />比做菜的 <b className="num text-ink">12</b> 分钟还长</p>
    </>
  );
}

/** 摊位、外卖店、共享厨房适不适合: against a full restaurant, each small format keeps the rent low by giving up a part. */
function SmallFormats({ groups }: { groups: string[] }) {
  const n = (title: string) => (groups.length > 1 ? groups.indexOf(title) + 1 : 0);
  const mark = (title: string, x: number, y: number) => n(title) > 0 && <g><circle cx={x} cy={y} r="9" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }} /><text x={x} y={y + 4} textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 800 }}>{n(title)}</text></g>;
  // [heading, group title, rent, storefront, seats, kitchen]
  const formats: Array<[string, string, string, string, string, string]> = [
    ["正式餐厅", "", "高", "有", "有", "有"],
    ["摊位和小店", "摊位和小店", "低", "小", "很少", "小"],
    ["只做外卖", "只做外卖", "低", "没有", "没有", "有"],
    ["共享厨房", "共享厨房和快闪", "低", "没有", "没有", "共用"],
  ];
  return (
    <svg viewBox="0 0 320 172" role="img" aria-label="示意图：正式餐厅房租高，门面、座位、厨房都有；摊位和小店房租低，门面小、座位很少；只做外卖没有门面和座位；共享厨房没有门面和座位，厨房和别人共用" className="block w-full">
      {["房租", "门面", "座位", "厨房"].map((row, r) => <text key={row} x="0" y={r === 0 ? 60 : 68 + r * 30} style={{ ...text, fontSize: 12 }}>{row}</text>)}
      <path d="M0 72 H320" style={{ stroke: "var(--line)" }} />
      {formats.map(([heading, group, rent, ...parts], i) => {
        const cx = 78.5 + i * 69;
        return (
          <g key={heading}>
            {group && mark(group, cx, 10)}
            <text x={cx} y="36" textAnchor="middle" style={i === 0 ? { ...strong, fill: "var(--ink-3)" } : strong}>{heading}</text>
            <text x={cx} y="60" textAnchor="middle" style={{ ...strong, fill: i === 0 ? "var(--ink-3)" : "var(--ink)" }}>{rent}</text>
            {parts.map((part, r) => {
              const y = 82 + r * 30;
              const none = part === "没有";
              return (
                <g key={r}>
                  <rect x={cx - 30} y={y} width="60" height="22" rx="5" style={none ? { fill: "none", stroke: "var(--ink-4)", strokeDasharray: "3 3" } : { fill: "var(--accent-soft)" }} />
                  <text x={cx} y={y + 15} textAnchor="middle" style={none ? text : { fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>{part}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** 平台改了规则: the platform stands between the guests and the shop and sets the fees and the ranking; the shop's own channel goes round it. */
function PlatformBetween({ groups }: { groups: string[] }) {
  const n = (title: string) => (groups.length > 1 ? groups.indexOf(title) + 1 : 0);
  const mark = (title: string, x: number, y: number) => n(title) > 0 && <g><circle cx={x} cy={y} r="9" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }} /><text x={x} y={y + 4} textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 800 }}>{n(title)}</text></g>;
  return (
    <svg viewBox="0 0 320 156" role="img" aria-label="示意图：客人通过平台到店家，平台决定抽成和费用、店排在第几；店家自己的渠道不经过平台" className="block w-full">
      <defs><marker id="platform-rules-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker></defs>
      <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line-strong)" }}><rect x="6" y="50" width="56" height="36" rx="6" /><rect x="258" y="50" width="56" height="36" rx="6" /></g>
      <text x="34" y="72.5" textAnchor="middle" style={strong}>客人</text>
      <text x="286" y="72.5" textAnchor="middle" style={strong}>店家</text>
      <text x="160" y="18" textAnchor="middle" style={text}>规则由平台定</text>
      <rect x="104" y="28" width="112" height="80" rx="10" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5 }} />
      <text x="160" y="48" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 13, fontWeight: 700 }}>平台</text>
      <text x="136" y="76" style={{ ...text, fill: "var(--ink-2)", fontSize: 12 }}>抽成和费用</text>
      <text x="136" y="98" style={{ ...text, fill: "var(--ink-2)", fontSize: 12 }}>排在第几</text>
      {mark("费率和抽成", 122, 72)}
      {mark("排名和曝光", 122, 94)}
      <g style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#platform-rules-ar)"><path d="M64 68 H100" /><path d="M218 68 H254" /></g>
      <path d="M34 88 Q34 140 90 140 H230 Q286 140 286 94" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2, strokeDasharray: "6 4" }} markerEnd="url(#platform-rules-ar)" />
      <text x="164" y="132" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>自己的渠道</text>
      {mark("自己的渠道", 120, 128)}
    </svg>
  );
}

/** 食材涨价，售价跟不跟着调: the same 3 yuan more per portion comes out of the margin, or goes onto the price. */
function IngredientRise() {
  const share = (n: number) => n / 33;
  const food = { label: "食材 12 元", share: share(12), tone: 3 } as const;
  const more = { label: "", share: share(3), tone: 0 } as const;
  return (
    <>
      <Bars label={60} rows={[
        ["涨价以前", [food, { label: "毛利 18 元", share: share(18), tone: "accent" }]],
        ["自己承担", [food, more, { label: "毛利 15 元", share: share(15), tone: "accent" }]],
        ["调高售价", [food, more, { label: "毛利 18 元", share: share(18), tone: "accent" }]],
      ]} />
      <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-3"><i className="h-3 w-5 rounded-sm bg-ink-3/70" />主料涨价，每份多花的 3 元</div>
      <p className="num mt-3 text-[13px] leading-relaxed text-ink-3">自己承担：一个月少赚 <b className="text-[16px] text-ink">3,900</b> 元<br />调高售价：每份从 30 元调到 <b className="text-[16px] text-ink">33</b> 元</p>
    </>
  );
}

/** 房租太高或要涨: the months before renewal, then two ways on: stay and pay more each month, or move and pay once. */
function LeaseRenewal() {
  return (
    <svg viewBox="0 0 320 198" role="img" aria-label="续约前的几个月和房东谈；续约时两条路：留下，每月房租 9,600 元，一年多付 19,200 元；搬走，新店每月房租 6,600 元，装修和搬迁一次 60,000 元，还要停业几周" className="block w-full">
      <defs><marker id="rent-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--ink-4)" }} /></marker></defs>
      <path d="M8 98 H58" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 2 }} />
      <path d="M64 98 H106" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 4, strokeLinecap: "round" }} />
      <circle cx="118" cy="98" r="5" style={{ fill: "var(--ink-3)" }} />
      <text x="33" y="119" textAnchor="middle" style={text}>租约期内</text>
      <text x="85" y="119" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>续约前</text>
      <text x="85" y="134" textAnchor="middle" style={{ ...text, fill: "var(--accent)" }}>和房东谈</text>
      <text x="118" y="82" textAnchor="middle" style={strong}>续约</text>
      <g style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.8 }} markerEnd="url(#rent-ar)"><path d="M124 98 C140 98 136 43 151 43" /><path d="M124 98 C140 98 136 152 151 152" /></g>
      <g style={{ fill: "var(--bg-sunk)", stroke: "var(--line-strong)" }}><rect x="156" y="10" width="160" height="66" rx="8" /><rect x="156" y="112" width="160" height="80" rx="8" /></g>
      <text x="168" y="30" style={strong}>留下</text>
      <text x="168" y="48" style={text}>每月房租 9,600 元</text>
      <text x="168" y="64" style={text}>一年多付 19,200 元</text>
      <text x="168" y="132" style={strong}>搬走</text>
      <text x="168" y="150" style={text}>新店每月房租 6,600 元</text>
      <text x="168" y="166" style={text}>装修和搬迁一次 60,000 元</text>
      <text x="168" y="182" style={text}>还要停业几周</text>
    </svg>
  );
}

/** 厨师或骨干突然离职: four things only the chef knows; when he goes, nobody else has them and nothing is written. */
function OnlyTheChef() {
  const rows: Array<[string, boolean]> = [["招牌菜的配方", false], ["酱料的比例", false], ["向哪几家订货", false], ["排班", true]];
  const dot = (on: boolean, x: number, y: number) => <circle cx={x} cy={y} r="7" style={on ? { fill: "var(--accent)" } : { fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5 }} />;
  return (
    <svg viewBox="0 0 320 178" role="img" aria-label="示意图：四件事里三件只有主厨会，其他员工不会，也没有写下来" className="block w-full">
      <rect x="152" y="6" width="48" height="166" rx="8" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5, strokeDasharray: "5 4" }} />
      <g textAnchor="middle"><text x="176" y="26" style={strong}>主厨</text><text x="176" y="41" style={text}>离职</text><text x="236" y="33" style={strong}>其他员工</text><text x="292" y="33" style={strong}>写下来</text></g>
      {rows.map(([task, other], i) => {
        const y = 66 + i * 30;
        return (
          <g key={task}>
            {i > 0 && <path d={`M8 ${y - 15} H316`} style={{ stroke: "var(--line)" }} />}
            <text x="8" y={y + 4.5} style={{ fill: "var(--ink-2)", fontSize: 12.5 }}>{task}</text>
            {dot(true, 176, y)}{dot(other, 236, y)}{dot(false, 292, y)}
          </g>
        );
      })}
    </svg>
  );
}

/** 合伙开店: one partner puts in the money, the other the days; the profit split by money leaves the days out. */
function PartnersSplit() {
  return (
    <>
      <Bars rows={[
        ["出钱", [{ label: "甲 20 万元", share: 0.8, tone: 1 }, { label: "", share: 0.2, tone: "accent" }]],
        ["出力", [{ label: "乙 每天 12 小时", share: 1, tone: "accent" }]],
        ["分利润", [{ label: "甲 8,000 元", share: 0.8, tone: 1 }, { label: "", share: 0.2, tone: "accent" }]],
      ]} />
      <div className="mt-2 flex gap-4 text-[12.5px] text-ink-3">
        <span className="flex items-center gap-1.5"><i className="h-3 w-5 rounded-sm bg-ink-4/70" />甲</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-5 rounded-sm bg-accent" />乙</span>
      </div>
      <p className="num mt-3 text-[13px] leading-relaxed text-ink-3">乙出 5 万元，每天在店里 12 小时<br />利润按出钱分，乙分得 <b className="text-[16px] text-ink">2,000</b> 元</p>
    </>
  );
}

/** 营销预算很少: three rings of people around the shop, each reached a different way. */
function MarketingRings() {
  return (
    <svg viewBox="0 0 320 186" role="img" aria-label="示意图：店在中间，由近到远三圈人：门口经过的人、附近的住户和上班族、网上看到的人" className="block w-full">
      <g style={{ fill: "var(--accent-soft)" }}><path d="M4 180 A156 156 0 0 1 316 180 Z" /><path d="M48 180 A112 112 0 0 1 272 180 Z" /><path d="M98 180 A62 62 0 0 1 222 180 Z" /></g>
      <path d="M0 180 H320" style={{ stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
      <g style={{ fill: "var(--accent)" }}><rect x="148" y="161" width="24" height="19" /><path d="M144 162 L160 149 L176 162 Z" /></g>
      <g textAnchor="middle">
        <text x="160" y="42" style={strong}>网上看到的人</text><text x="160" y="58" style={text}>社交媒体、平台广告</text>
        <text x="160" y="92" style={strong}>附近的住户和上班族</text><text x="160" y="108" style={text}>与周边的店合作</text>
        <text x="160" y="140" style={strong}>门口经过的人</text><text x="124" y="174" style={text}>招牌</text><text x="196" y="174" style={text}>门口</text>
      </g>
    </svg>
  );
}

/** 菜不差，客人却不一定再来: from the door to the bill, the food is one moment of six. */
function MealMoments() {
  return (
    <>
      <div className="flex gap-1">
        {["进门", "等位", "点菜", "上菜", "吃饭", "结账"].map((s) => (
          <span key={s} className={`flex h-9 flex-1 items-center justify-center rounded-md text-[12.5px] font-semibold ${s === "吃饭" ? "bg-accent text-accent-contrast" : "border border-line-strong text-ink-3"}`}>{s}</span>
        ))}
      </div>
      <div className="mt-2.5 flex gap-4 text-[12.5px] text-ink-3">
        <span className="flex items-center gap-1.5"><i className="h-3 w-5 rounded-sm bg-accent" />菜的味道</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-5 rounded-sm border border-line-strong" />客人被怎样对待</span>
      </div>
    </>
  );
}

/** 订货和库存说不清: goods come in on the left and go out on the right; the books and the shelf disagree. */
function StockGap() {
  const label = { fill: "var(--accent)", fontSize: 12, fontWeight: 700 } as const;
  return (
    <svg viewBox="0 0 320 196" role="img" aria-label="示意图：货从左边进来，备料和卖出从右边出去；账上记的库存比架上实际有的多" className="block w-full">
      <defs><marker id="inventory-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 Z" style={{ fill: "var(--accent)" }} /></marker></defs>
      <rect x="121" y="122" width="94" height="61" style={{ fill: "var(--accent-soft)" }} />
      <rect x="120" y="36" width="96" height="148" rx="4" style={{ fill: "none", stroke: "var(--ink-3)", strokeWidth: 2 }} />
      <text x="168" y="26" textAnchor="middle" style={strong}>库存</text>
      <text x="168" y="158" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 11, fontWeight: 700 }}>架上实际有的</text>
      <path d="M114 86 H222" style={{ stroke: "var(--ink-3)", strokeWidth: 1.5, strokeDasharray: "5 4" }} />
      <text x="168" y="78" textAnchor="middle" style={text}>账上记的</text>
      <path d="M224 86 h5 v36 h-5" style={{ fill: "none", stroke: "var(--ink-3)", strokeWidth: 1.5 }} />
      <text x="234" y="108" style={strong}>对不上</text>
      <path d="M8 60 H110" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#inventory-ar)" />
      <text x="8" y="50" style={text}>进货</text>
      <path d="M50 53 L62 67 V53 L50 67 Z" style={{ fill: "var(--accent)" }} />
      <text x="56" y="46" textAnchor="middle" style={label}>订多少</text>
      <circle cx="86" cy="60" r="7" style={{ fill: "var(--bg-sunk)", stroke: "var(--accent)", strokeWidth: 1.5 }} />
      <path d="M82.5 60 l2.5 2.8 l4.5 -5.5" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 1.5, strokeLinecap: "round" }} />
      <text x="86" y="84" textAnchor="middle" style={label}>收货核对</text>
      <path d="M106 122 H128" style={{ stroke: "var(--accent)", strokeWidth: 1.5 }} />
      <text x="102" y="126" textAnchor="end" style={label}>盘点</text>
      <path d="M216 170 H304" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2 }} markerEnd="url(#inventory-ar)" />
      <text x="262" y="160" textAnchor="middle" style={text}>备料、卖出</text>
    </svg>
  );
}

/** 开业很久还没回本: the money not yet won back keeps growing; from now on, three ways it can go. */
function LossThreeWays() {
  const end = (y: number, a: string, b: string, fill: string) => <><text x="266" y={y} style={{ fill, fontSize: 12, fontWeight: 700 }}>{a}</text><text x="266" y={y + 15} style={{ fill, fontSize: 11 }}>{b}</text></>;
  return (
    <svg viewBox="0 0 320 196" role="img" aria-label="示意图：开业以后还没收回的钱越来越多；从现在起三条路：调整以后开始赚、关店让亏损停住、照原样继续亏得更多" className="block w-full">
      <path d="M20 30 V66 L150 120 V30 Z" style={{ fill: "var(--hot-soft)" }} />
      <path d="M14 30 H314" style={{ stroke: "var(--ink-4)", strokeWidth: 1.5, strokeDasharray: "5 4" }} />
      <text x="314" y="23" textAnchor="end" style={text}>回本</text>
      <path d="M150 30 V178" style={{ stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
      <text x="26" y="52" style={{ fill: "var(--hot)", fontSize: 12, fontWeight: 700 }}>还没收回的钱</text>
      <path d="M20 30 V66 L150 120" style={{ fill: "none", stroke: "var(--hot)", strokeWidth: 2.5, strokeLinejoin: "round" }} />
      <path d="M150 120 Q206 112 258 44" style={{ fill: "none", stroke: "var(--accent)", strokeWidth: 2.5 }} />
      <path d="M150 120 H258" style={{ fill: "none", stroke: "var(--ink-3)", strokeWidth: 2.5 }} />
      <path d="M150 120 Q206 128 258 168" style={{ fill: "none", stroke: "var(--hot)", strokeWidth: 2.5, strokeDasharray: "6 4" }} />
      <circle cx="150" cy="120" r="5" style={{ fill: "var(--ink)" }} />
      {end(46, "调整以后", "开始赚", "var(--accent)")}
      {end(118, "关店", "亏损停住", "var(--ink-2)")}
      {end(166, "照原样", "亏得更多", "var(--hot)")}
      <text x="20" y="192" style={text}>开业</text>
      <text x="150" y="192" textAnchor="middle" style={strong}>现在</text>
    </svg>
  );
}

/** 收银和管理系统: ordering, payment, the kitchen, stock and the delivery apps all hang on one system. */
function PosHub() {
  const boxes: Array<[number, number, string]> = [[6, 12, "点单"], [6, 73, "收款"], [6, 134, "外卖平台"], [234, 12, "厨房出单"], [234, 73, "库存"], [234, 134, "销量和时段"]];
  return (
    <svg viewBox="0 0 320 176" role="img" aria-label="示意图：点单、收款、外卖平台、厨房出单、库存都接在收银系统上，销量和时段的数字也存在里面" className="block w-full">
      <g style={{ stroke: "var(--ink-4)", strokeWidth: 1.5 }}><path d="M118 80 L86 27" /><path d="M118 88 H86" /><path d="M118 96 L86 149" /><path d="M202 80 L234 27" /><path d="M202 88 H234" /></g>
      <path d="M202 96 L234 149" style={{ stroke: "var(--accent)", strokeWidth: 2 }} />
      {boxes.map(([x, y, name], i) => (
        <g key={name}>
          <rect x={x} y={y} width="80" height="30" rx="6" style={i === 5 ? { fill: "var(--accent-soft)", stroke: "var(--accent)" } : { fill: "var(--bg-sunk)", stroke: "var(--line-strong)" }} />
          <text x={x + 40} y={y + 19} textAnchor="middle" style={i === 5 ? { ...strong, fill: "var(--accent)" } : strong}>{name}</text>
        </g>
      ))}
      <rect x="118" y="70" width="84" height="36" rx="8" style={{ fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.5 }} />
      <text x="160" y="92.5" textAnchor="middle" style={{ fill: "var(--accent)", fontSize: 13, fontWeight: 700 }}>收银系统</text>
    </svg>
  );
}

/** 设备和自动化能省多少人: the machine pays for itself in 10 months if the hours it saves are really cut, in 20 if half. */
function MachinePayback() {
  const x = (month: number) => 40 + month * 10.5;
  const y = (yuan: number) => 160 - yuan / 250;
  return (
    <svg viewBox="0 0 320 190" role="img" aria-label="回本图：洗碗机 24,000 元；每月省 2,400 元，10 个月回本；每月只省 1,200 元，要 20 个月" className="block w-full">
      <text x="40" y="22" style={text}>累计省下的钱</text>
      <path d={`M${x(0)} ${y(24000)} H300`} style={{ stroke: "var(--ink-4)", strokeWidth: 1.5, strokeDasharray: "5 4" }} />
      <text x="44" y={y(24000) - 7} style={strong}>洗碗机 24,000 元</text>
      <g style={{ stroke: "var(--line-strong)", strokeWidth: 1.5, strokeDasharray: "2 3" }}><path d={`M${x(10)} ${y(24000)} V160`} /><path d={`M${x(20)} ${y(24000)} V160`} /></g>
      <path d="M40 160 H300" style={{ stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
      <path d={`M${x(0)} ${y(0)} L${x(13)} ${y(31200)}`} style={{ stroke: "var(--accent)", strokeWidth: 2.5 }} />
      <path d={`M${x(0)} ${y(0)} L${x(24)} ${y(28800)}`} style={{ stroke: "var(--ink-3)", strokeWidth: 2.5 }} />
      <circle cx={x(10)} cy={y(24000)} r="4.5" style={{ fill: "var(--accent)" }} />
      <circle cx={x(20)} cy={y(24000)} r="4.5" style={{ fill: "var(--ink-3)" }} />
      <text x={x(13) + 6} y={y(31200) + 5} style={{ fill: "var(--accent)", fontSize: 12, fontWeight: 700 }}>每月省 2,400 元</text>
      <g style={{ fill: "var(--ink-2)", fontSize: 12, fontWeight: 700 }}><text x={x(20) + 6} y="84">每月只省</text><text x={x(20) + 6} y="99">1,200 元</text></g>
      <g textAnchor="middle"><text x="40" y="177" style={text}>0</text><text x={x(10)} y="177" style={strong}>10 个月</text><text x={x(20)} y="177" style={strong}>20 个月</text></g>
    </svg>
  );
}

const FIGURES: Record<string, { kicker: string; caption: string; kind: "举例" | "示意"; draw: (groups: string[]) => ReactNode }> = {
  "busy-no-profit": { kicker: "钱从哪里漏掉", kind: "示意", caption: "客人付的钱从上面倒进来，从下面几个洞漏出去，桶里剩下的才是月底的钱。", draw: (groups) => <Bucket groups={groups} /> },
  "read-the-numbers": { kicker: "营业额不是赚到的钱", kind: "举例", caption: "假设你的餐饮店一个月卖 1,300 份，每份 30 元、食材 12 元，房租和工资这些固定费用 18,000 元。营业额扣掉食材是毛利，毛利再扣掉固定费用，剩下的才是利润。", draw: () => <Takings /> },
  hiring: { kicker: "每一步都有人离开", kind: "示意", caption: "看到招聘启事的人里，来面试的是一部分，录用的更少，做满三个月的又少一些。没有人来，是前面几步的事；来了做不久，是后面几步的事。", draw: () => <Funnel /> },
  "labor-costs": { kicker: "人工多出来的，从利润里扣", kind: "举例", caption: "假设营业额和其他开支都不变，人工从占营业额的 28% 涨到 32%，利润就从 10% 降到 6%。", draw: () => <LabourShare /> },
  "owner-overload": { kicker: "老板的一天", kind: "举例", caption: "假设老板早上 7 点去采购，晚上 11 点记完账才离开，中间每件事都由他自己做。", draw: () => <OwnerDay /> },
  takeout: { kicker: "同一个厨房，三路订单", kind: "示意", caption: "多卖外带和外卖，订单仍然从同一个厨房、同一批人手里出去。", draw: () => <OneKitchen /> },
  consistency: { kicker: "同一道菜，三个人做", kind: "举例", caption: "配方写一份 100 克，三位厨师各装了 90 克、100 克、120 克，客人每次吃到的都不一样，成本也跟着变。", draw: () => <Portions /> },
  "opening-cost": { kicker: "预算常常只算到开业那天", kind: "举例", caption: "假设开店预算 30 万元。开业以后的几个月，房租、工资和进货照付，营业额还没有跟上，这笔周转金也要事先准备。", draw: () => <OpeningBudget /> },
  location: { kicker: "房租换来多少客人", kind: "示意", caption: "位置好的地方经过的人多，房租也高。要算的是房租换来的客人够不够多。", draw: () => <TwoStreets /> },
  contracts: { kicker: "签字时没细看的几行", kind: "示意", caption: "这几种条款签的时候容易忽略，签了以后每个月都照着它付钱。", draw: () => <ContractLines /> },
  "rush-chaos": { kicker: "12 点 20 分的厨房", kind: "示意", caption: "做好的菜从出餐口出去，吃完的空盘从同一个地方回来。", draw: () => <Kitchen /> },
  "second-shop": { kicker: "老板只有一个", kind: "举例", caption: "假设老板一天在店里 12 个小时。店越多，每家店分到的时间越少。", draw: () => <OwnerHours /> },
  pricing: { kicker: "价格定在两条线之间", kind: "示意", caption: "售价低于按成本算出的底价，每卖一份都在亏；高过客人愿意付的价钱，点的人就少了。定价和涨价，都在这两条线之间移动。", draw: () => <PriceRange /> },
  "delivery-margin": { kicker: "同一份菜，外卖剩得更少", kind: "举例", caption: "假设你的餐饮店一份菜堂食和外卖都卖 30 元，食材 12 元。外卖平台抽成 30%，一份扣 9 元，包装再花 2 元。剩下的钱还要付房租和工资。", draw: () => <DeliveryShare /> },
  training: { kicker: "教、做、检查的循环", kind: "示意", caption: "图里把带新人画成一个循环：教一件事，新人自己做一遍，再对照写下来的标准检查、说清对错，然后教下一件。对错按纸上的标准判断，不靠师傅的记性。", draw: () => <TeachLoop /> },
  regulars: { kicker: "从第一次到第二次", kind: "举例", caption: "假设你的餐饮店一个月有 20 位客人第一次来，下个月再来的只有 4 位。记住客人，是在客人还在店里的时候；提醒，是在客人离开以后；会员和积分，是给客人一个再来的理由。", draw: () => <ComeBack /> },
  "delivery-ratings": { kicker: "客人打分时看到的样子", kind: "示意", caption: "菜从出餐口出去，在路上走一段才到客人手里，客人按打开时的样子打分，路上这一段店里看不到。店里能处理的在两头：出餐这一头是外卖菜单和包装，打分以后是回复评价。评分一降，店在平台上的排名就靠后，订单也跟着减少。", draw: () => <OnTheRoad /> },
  layout: { kicker: "空着的店和坐满的店", kind: "示意", caption: "装修时看到的是空着的店。坐满以后椅子往后推，通道变窄，进门的客人、取餐的外卖员和端菜的员工都从这一条通道经过。", draw: () => <EmptyFull /> },
  equipment: { kicker: "修好以前，生意停着", kind: "举例", caption: "假设你的餐饮店每天营业额 3,000 元，主要的炉灶周三早上坏了，等零件和维修人员，到周五开门前才修好。坏一次，付出去的是 800 元维修费；周三、周四停业两天，少收的营业额是 2 × 3,000 = 6,000 元。", draw: () => <DownDays /> },
  franchise: { kicker: "付出去的，换回来的", kind: "示意", caption: "加盟店开店时付加盟费，每月付管理费，有的还要向总部进货；换来的是品牌、配方和培训。菜单和售价能不能改、装修怎么做、要做几年、怎样退出，都写在合同里。", draw: () => <FranchiseFlows /> },
  "ai-tools": { kicker: "AI 先做，人再看", kind: "示意", caption: "账单和销量、菜单和评价、新人的问题，先由 AI 整理、起草或回答，再由店里的人看过，决定用不用。", draw: () => <AiFirst /> },
  "online-presence": { kicker: "出门以前，客人先看到的", kind: "示意", caption: "很多客人出门以前，先在地图或点评网站上看营业时间、照片、菜单和评价，再决定去不去；有的从店里自己的网页订位。", draw: () => <PhoneListing /> },
  waste: { kicker: "没卖出去的食材去了哪里", kind: "示意", caption: "进来的食材里，没有卖给客人的部分在两处被丢弃：储存时过期、变质的，以及备料切下的边角料和当天没卖完的。订多少、备多少，决定了这两处丢弃多少；订少了、备少了，又不够卖。", draw: () => <WasteExits /> },
  retention: { kicker: "离开的人越多，越难留人", kind: "示意", caption: "有人离开，原因不只是薪水。空出来的班次由剩下的人分担，每个人都更累；新人来了，也没有人有空带。新人做不久，老员工也在考虑离开，这个循环就继续下去。", draw: () => <LeavingLoop /> },
  scheduling: { kicker: "客人有高峰，人手却一样多", kind: "示意", caption: "客人集中在午市和晚市时，如果每个时段排一样多的人，高峰时人不够，下午又有人闲着，工资照付。按客流排班，是让排的人手跟着需要的人手变化；一人多岗和临时人手，补的是高峰时不够的部分。", draw: () => <StaffCurve /> },
  "bad-reviews": { kicker: "看差评的，是还没来过的客人", kind: "示意", caption: "差评和店家的回复显示在一起，还没来过的客人都看得到，回复影响的是他们怎么看这条差评。差评说的如果是真的问题，原因还在店里，同样的事可能再发生；找出原因、改流程，处理的是这一部分。", draw: () => <ReviewReaders /> },
  "ticket-size": { kicker: "多来客人，或每人多花一点", kind: "举例", caption: "长方形的宽是客人数，高是每位客人花的钱（客单价），面积就是营业额。假设你的餐饮店一天来 100 位客人，每人 25 元，营业额 2,500 元。一天多 500 元，可以是多来 20 位客人，也可以是每位客人多花 5 元。", draw: () => <TicketArea /> },
  "menu-size": { kicker: "卖得少的菜，也要每天备料", kind: "举例", caption: "假设你的餐饮店菜单上有 40 道菜，一天卖出 200 份，卖得最多的 10 道菜占了 150 份。删哪些菜、留哪些菜，取决于每道菜的销量和利润；几道菜共用同一样食材，要备的料也少一些。", draw: () => <MenuTail /> },
  "first-months": { kicker: "开业以前，只能估计", kind: "示意", caption: "开业以前，每天来多少客人只能估计。开业以后，实际的人数可能比估计的多，人手和厨房忙不过来；也可能比估计的少，备好的料和排好的人都多了。试营业是在正式开业以前先看一次实际的情况；头 90 天的数字，说明估计差在哪里。", draw: () => <OpeningGuess /> },
  renovation: { kicker: "多花的钱，加上多付的房租", kind: "举例", caption: "假设你的餐饮店装修预算 15 万元、计划 2 个月完工，实际花了 18 万元、做了 3 个月，装修期间每月房租 1.2 万元照付。", draw: () => <RenovationOverrun /> },
  payments: { kicker: "客人付的钱，先经过收款公司", kind: "示意", caption: "刷卡和电子钱包收的钱先进入收款公司，扣掉手续费，过一段时间才转到店里；钱停在收款公司的时候，收款公司出了问题，营业款就可能被压住。现金直接进店里。对账，是看每天收到的钱和收银系统记的营业额是否一致。", draw: () => <PaymentPath /> },
  "cash-flow": { kicker: "账上的利润去了哪里", kind: "举例", caption: "假设你的餐饮店这个月账上赚了 5,400 元，同时预付了 2,000 元房租，库存比月初多了 3,000 元，外卖平台还有 2,400 元没有结算。这三笔都不影响账上的利润，却占住了现金：手上的现金比月初少了 2,000 元，这个缺口由事先留出的钱或借来的钱补上。", draw: (groups) => <CashLocked groups={groups} /> },
  utilities: { kicker: "账单是用量乘以单价", kind: "示意", caption: "把一个月的水电燃气费画成一块面积：每一行是一类设备用掉的水、电或燃气，越高用得越多；宽是每个单位的价格。单价上涨，每一行都多付右边这一截；最下面一行是设备开着却没有在用的部分。", draw: (groups) => <EnergyBill groups={groups} /> },
  "wrong-person": { kicker: "留下和辞退都有代价", kind: "示意", caption: "不合适的人留下，其他人要替他补位；谈过仍然没有改、决定辞退以后，排班会少一个人，要有人接上。", draw: (groups) => <KeepOrLetGo groups={groups} /> },
  "slow-weekdays": { kicker: "平日坐不满", kind: "示意", caption: "每一条是一天的全部座位，有颜色的部分坐了人。周末坐满还有人排队，平日只坐到一半左右，来的客人不够付一天的房租和人工。", draw: () => <SeatsByDay /> },
  competition: { kicker: "降价以后要多卖多少", kind: "举例", caption: "假设你的餐饮店一份卖 30 元，食材 12 元，扣掉食材每份剩 18 元。附近的店降价，你也跟着每份降 6 元、卖 24 元；食材还是 12 元，少收的 6 元全部从每份剩下的钱里扣。", draw: () => <PriceCut /> },
  "food-safety": { kicker: "每一道工序都可能出事", kind: "示意", caption: "食材从收货到上桌要经过几道工序。冷藏、烹调和上桌前的保温都关系到温度；每一道工序都用到台面、工具和手，都要清洁；从备料到上桌，都可能混进客人过敏的东西。任何一处出事，都可能停业。", draw: (groups) => <FoodSteps groups={groups} /> },
  "front-of-house": { kicker: "一桌客人的 60 分钟", kind: "举例", caption: "假设你的餐饮店里，一桌客人从坐下到离开用了 60 分钟：厨房做菜 12 分钟，吃饭 25 分钟；其余的时间在等人来点餐、等做好的菜送上桌、等结账。", draw: (groups) => <TableHour groups={groups} /> },
  "small-formats": { kicker: "房租低了，少了什么", kind: "示意", caption: "和正式餐厅相比，这几种店的房租低，少的是门面、座位或自己的厨房。没有门面，路过的人看不到；没有座位，只能卖外带和外卖；共用厨房，设备和使用时间要和别人协调。", draw: (groups) => <SmallFormats groups={groups} /> },
  "platform-rules": { kicker: "客人和店家之间隔着平台", kind: "示意", caption: "外卖、点评和订位平台站在客人和店家之间，收多少抽成和费用、店排在第几，都由平台决定。平台改了规则，这两样都可能跟着变；店家自己的渠道不经过平台。", draw: (groups) => <PlatformBetween groups={groups} /> },
  "ingredient-prices-up": { kicker: "多出来的 3 元由谁付", kind: "举例", caption: "假设你的餐饮店一份卖 30 元，食材 12 元，毛利 18 元，一个月卖 1,300 份。主料涨价以后，每份食材多花 3 元：自己承担，每份毛利剩 15 元；售价调到 33 元，多出的 3 元由客人付。换做法、改分量、换货源，则是设法让这 3 元变少。", draw: () => <IngredientRise /> },
  rent: { kicker: "续约时的两条路", kind: "举例", caption: "假设你的餐饮店每月房租 8,000 元，续约时房东要涨 20%，涨到 9,600 元。留下，一年多付 19,200 元，客人还是这个位置的客人；搬走，新店房租每月少 3,000 元，装修和搬迁的 60,000 元却要 20 个月才能收回，还要停业几周，熟客也可能流失。", draw: () => <LeaseRenewal /> },
  "key-person-leaves": { kicker: "只有一个人会的事", kind: "示意", caption: "四件事里有三件只有主厨会，其他员工不会，也没有写下来。主厨一走，这三件事就没有人会了。", draw: () => <OnlyTheChef /> },
  partners: { kicker: "出钱的和出力的", kind: "举例", caption: "假设你的餐饮店有两位合伙人：甲出 20 万元，不在店里；乙出 5 万元，每天在店里 12 小时。每月利润 10,000 元按出钱的比例分，甲占 80%，分得 8,000 元；乙占 20%，分得 2,000 元，乙在店里的时间没有算进去。", draw: () => <PartnersSplit /> },
  "small-budget-marketing": { kicker: "钱花在哪一圈", kind: "示意", caption: "离店由近到远，是门口经过的人、附近的住户和上班族、网上看到的人；招牌和门口、与周边的店合作、社交媒体和平台广告，各自对着其中一圈。钱不多，难在先花在哪一圈。", draw: () => <MarketingRings /> },
  hospitality: { kicker: "一顿饭里，菜只是一段", kind: "示意", caption: "从进门到结账，菜的味道只是其中一段；其余五段，是客人被怎样对待：进门和等位时有没有人招呼，结账要等多久，不满意时店里怎么处理。", draw: () => <MealMoments /> },
  inventory: { kicker: "账上记的和架上有的", kind: "示意", caption: "货从左边进来，备料和卖出从右边出去。账上记的和架上实际有的对不上，订货就没有依据，不是缺货就是积压。订多少，管进来的量；收货核对，看送来的货和账单对不对；盘点，数出架上实际有多少。", draw: () => <StockGap /> },
  "not-breaking-even": { kicker: "往后的三条路", kind: "示意", caption: "开业以后一直在亏，还没收回的钱越积越多。从现在起有三条路：调整以后开始赚，这笔钱才逐渐收回；关店，和员工、房东、供货商把账结清以后，亏损不再增加；照原样继续，亏得更多。", draw: () => <LossThreeWays /> },
  "pos-system": { kicker: "一套系统连着很多事", kind: "示意", caption: "点单、收款、厨房出单、库存和外卖平台都接在收银系统上，销量和时段的数字也存在里面。换系统时，每一项都要重新接上，存下的数字也要转到新系统。", draw: () => <PosHub /> },
  automation: { kicker: "回本要看实际省下多少", kind: "举例", caption: "假设你的餐饮店买一台 24,000 元的洗碗机，洗碗的人手每天少排 4 小时，每小时人工 20 元，一个月按 30 天算，省 2,400 元，10 个月回本。如果用起来每天只少排 2 小时，一个月省 1,200 元，要 20 个月。水电和保养没有算进去。", draw: () => <MachinePayback /> },
};

export function hasFigure(slug: string): boolean {
  return slug in FIGURES;
}

export function SituationFigure({ slug, groups, children }: { slug: string; groups: string[]; children?: ReactNode }) {
  const figure = FIGURES[slug];
  if (!figure) return null;
  return (
    <div className="mt-8">
      <Kicker>{figure.kicker}</Kicker>
      <Figure kind={figure.kind} caption={figure.caption}>
        {figure.draw(groups)}
        {children}
      </Figure>
    </div>
  );
}
