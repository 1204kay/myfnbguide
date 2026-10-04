// The reference pages' parts, in the site's own look (warm white, hairline cards, the accent's short bar,
// big numbers for what matters; red only for a loss or an overrun), after myfnb/samples/v2-busy-no-profit.html.
import type { ReactNode } from "react";
import { Link } from "react-router";
import { num } from "../format.ts";
import type { Block, CaseCard, CompareBlock, ExampleBlock, PartsBlock } from "../types.ts";

export function Metrics({ items, note }: { items: Array<[number, string]>; note?: string | null }) {
  return (
    <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1.5 border-y border-line py-3.5 text-[13px] text-ink-4">
      {items.map(([n, unit]) => (
        <span key={unit}><b className="num mr-1 text-[22px] font-extrabold tracking-tight text-ink">{num(n)}</b>{unit}</span>
      ))}
      {note && <span className="ml-auto">{note}</span>}
    </div>
  );
}

export function Cards({ cards }: { cards: CaseCard[] }) {
  return (
    <div className="mt-3.5 grid gap-2.5">
      {cards.map((c) => (
        <Link key={c.id} viewTransition to={`/reference/cases/${c.id}`} className="card block px-[18px] py-4 transition-colors hover:border-accent">
          <span className="block text-[12.5px] text-ink-4">{c.src}</span>
          <b className="mt-1 block text-[16px] leading-snug text-ink">{c.title}</b>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">{c.line}</p>
        </Link>
      ))}
    </div>
  );
}

export function Figure({ children, caption, kind }: { children: ReactNode; caption?: string | null; kind?: "原文数据" | "举例" | "示意" }) {
  return (
    <div className="card mt-3.5 p-4">
      {children}
      {(caption || kind) && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-4">
          {kind && <span className={`mr-1.5 font-semibold ${kind === "举例" ? "text-ink-3" : "text-accent"}`}>{kind}</span>}
          {caption}
          {kind === "举例" && "数字是我们举的例子，不是原文的数据。"}
        </p>
      )}
    </div>
  );
}

/** One horizontal bar split into parts; widths are shares of the whole (0–1). */
export function Fill({ parts }: { parts: Array<{ label: string; share: number; tone: "accent" | "loss" | number }> }) {
  const tones = ["bg-ink-3/70", "bg-ink-4/70", "bg-ink-4/45", "bg-line-strong", "bg-line"];
  return (
    <div className="flex h-7 overflow-hidden rounded-md bg-bg-sunk text-[11.5px] font-semibold">
      {parts.filter((p) => p.share > 0).map((p, i) => (
        <div key={i} style={{ width: `${Math.min(p.share, 1) * 100}%` }}
          className={`flex items-center overflow-hidden whitespace-nowrap px-1.5 ${p.tone === "accent" ? "bg-accent text-accent-contrast" : p.tone === "loss" ? "bg-hot text-white" : `${tones[p.tone % tones.length]} text-ink`}`}>
          {p.label}
        </div>
      ))}
    </div>
  );
}

function Compare({ b }: { b: CompareBlock }) {
  const max = Math.max(...b.items.map((i) => i.value));
  const per = b.per ? `每${b.per} ` : "";
  return (
    <Figure kind="原文数据" caption={b.caption}>
      <div className="grid gap-2">
        {b.items.map((item, i) => (
          <div key={i} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2 text-[13px] text-ink-3">
            <span>{item.label}</span>
            <Fill parts={[{ label: `${per}${num(item.value)} ${b.unit}`, share: item.value / max, tone: i === b.items.length - 1 ? "accent" : 1 }]} />
          </div>
        ))}
      </div>
      {b.change && b.change.amount !== 0 && (
        <p className="mt-3 text-[14px] text-ink-2">
          {b.change.amount > 0 ? "多了" : "少了"} <b className="num text-[18px] text-ink">{num(Math.abs(b.change.amount))}</b> {b.unit}（{b.change.amount > 0 ? "+" : "−"}{num(Math.abs(b.change.percent))}%）
          {b.change.yearly !== null && <>，按一年算 <b className="num text-ink">{num(Math.abs(b.change.yearly))}</b> {b.unit}</>}
        </p>
      )}
    </Figure>
  );
}

function Parts({ b }: { b: PartsBlock }) {
  const whole = Math.max(b.total, b.against?.value ?? 0);
  return (
    <Figure kind="原文数据" caption={b.caption}>
      <div className="grid gap-2 text-[13px] text-ink-3">
        {b.against && (
          <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2"><span>{b.against.label}</span>
            <Fill parts={[{ label: num(b.against.value), share: b.against.value / whole, tone: "accent" }]} /></div>
        )}
        <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2"><span>{b.against ? "支出" : "合计"}</span>
          <Fill parts={b.items.map((i, n) => ({ label: i.label, share: i.value / whole, tone: n }))} /></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-ink-3">
        {b.items.map((i) => <div key={i.label} className="flex justify-between gap-2"><span>{i.label}</span><span className="num text-ink-2">{num(i.value)}</span></div>)}
      </div>
      <p className="mt-3 text-[14px] text-ink-2">
        合计 {num(b.total)} {b.unit}
        {b.gap !== null && (b.gap < 0
          ? <>，亏 <b className="num text-[18px] text-hot">{num(-b.gap)}</b> {b.unit}</>
          : <>，剩 <b className="num text-[18px] text-ink">{num(b.gap)}</b> {b.unit}</>)}
      </p>
    </Figure>
  );
}

function Example({ b }: { b: ExampleBlock }) {
  const bar = b.rows.some((r) => r.share !== null) && b.kind !== "list-total" && b.kind !== "percent-over";
  return (
    <Figure kind="举例" caption={b.caption}>
      <div className="space-y-3">
      {bar && <Fill parts={b.rows.map((r, i) => ({ label: `${r.label} ${num(r.value)}`, share: r.share ?? 0, tone: r.label === "剩下" || r.label === "毛利" ? (r.value < 0 ? "loss" : "accent") : i }))} />}
      {(b.kind === "list-total" || b.kind === "percent-over") && (
        <div className="grid gap-1.5 text-[13px]">
          {b.rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2">
              <div className="relative overflow-hidden rounded bg-bg-sunk px-2 py-1">
                <i className={`absolute inset-y-0 left-0 ${r.flag ? "bg-hot-soft" : "bg-accent-soft"}`} style={{ width: `${(r.share ?? 0) * 100}%` }} />
                <span className={`relative ${r.flag ? "text-hot" : "text-ink-2"}`}>{r.label}</span>
              </div>
              <span className="num text-right text-ink-2">{num(r.value)}{r.unit === "%" ? "%" : ""}</span>
            </div>
          ))}
        </div>
      )}
      {b.equation && <p className="num rounded-md bg-bg-sunk px-3 py-2 text-center text-[14px] text-ink-2">{b.equation}</p>}
      <p className="text-[14.5px] font-semibold text-ink">{b.result}</p>
      </div>
    </Figure>
  );
}

export function StoryBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "text": return <p className="mt-3 text-[15.5px] leading-[1.85] text-ink-2">{block.text}</p>;
    case "list": return (
      <ul className="mt-3 grid gap-2 text-[15px] leading-[1.8] text-ink-2">
        {block.items.map((i, n) => <li key={n} className="relative pl-4 before:absolute before:left-0 before:top-[0.8em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent">{i.lead && <b className="text-ink">{i.lead}：</b>}{i.text}</li>)}
      </ul>
    );
    case "flow": return (
      <div className="card mt-3.5 flex flex-wrap items-center gap-x-1.5 gap-y-2 p-4 text-[14px] text-ink-2">
        {block.steps.map((s, n) => <span key={n} className="flex items-center gap-1.5">{n > 0 && <span className="text-accent">→</span>}<span className="rounded-md bg-bg-sunk px-2 py-1">{s}</span></span>)}
      </div>
    );
    case "quote": return (
      <blockquote className="mt-4 border-l-2 border-accent pl-4 text-[17px] font-semibold leading-relaxed text-ink">
        {block.text}<small className="mt-1.5 block text-[13px] font-normal text-ink-4">{block.who}</small>
      </blockquote>
    );
    case "compare": return <Compare b={block} />;
    case "parts": return <Parts b={block} />;
    case "example": return <Example b={block} />;
  }
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link viewTransition to={to} className="inline-block py-3 text-[13px] text-ink-4 hover:text-accent">‹ {children}</Link>;
}
