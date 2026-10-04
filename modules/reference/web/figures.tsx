// One picture per situation that explains the whole of it (HANDOFF §3.1), drawn by hand once; a situation
// without its picture yet shows none. Colours are the site's own variables, so both themes work.
import type { ReactNode } from "react";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { Figure } from "./ui";

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

const FIGURES: Record<string, { kicker: string; caption: string; kind: "举例" | "示意"; draw: (groups: string[]) => ReactNode }> = {
  "busy-no-profit": { kicker: "钱从哪里漏掉", kind: "示意", caption: "客人付的钱从上面倒进来，从下面几个洞漏出去，桶里剩下的才是月底的钱。", draw: (groups) => <Bucket groups={groups} /> },
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
