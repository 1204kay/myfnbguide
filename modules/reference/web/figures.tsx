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
