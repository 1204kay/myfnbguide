// What every section's picture is drawn with: the same style as the situations' pictures (figures.tsx, see its top).
import type { ReactNode } from "react";

export const text = { fill: "var(--ink-3)", fontSize: 14 } as const;
export const strong = { fill: "var(--ink)", fontSize: 15, fontWeight: 600 } as const;
export const hot = "var(--hot)";
export const accent = "var(--accent)";
export const box = { fill: "var(--fig-box)", stroke: "var(--line-strong)" } as const;
export const soft = { fill: "var(--accent-soft)", stroke: "var(--accent)", strokeWidth: 1.2 } as const;

/** A section's picture: its tag and caption go under it in the figure card, like a situation's. */
export type Section = { kind: "举例" | "示意"; caption: string; draw: () => ReactNode };

/**
 * 「举例」 beside the number it is about, like the caption's KindTag (十一 10-17: a made-up number has to read as
 * one at a glance, not only from the tag under the picture). `x` is its left edge, `y` the baseline of the number.
 */
export const Eg = ({ x, y }: { x: number; y: number }) => (
  <g>
    <rect x={x} y={y - 15} width="40" height="20" rx="10" style={{ fill: "var(--ink-4)", opacity: 0.12 }} />
    <text x={x + 20} y={y} textAnchor="middle" style={{ fill: "var(--ink-3)", fontSize: 14, fontWeight: 600 }}>举例</text>
  </g>
);

/** A few steps one under another, each with a short name and what is done (a section's way of doing it, in order). */
export function Steps({ steps, label }: { steps: Array<[string, string]>; label: string }) {
  const h = steps.length * 46 - 10;
  return (
    <svg viewBox={`0 0 320 ${h}`} role="img" aria-label={label} className="block w-full">
      {steps.map(([name, what], i) => (
        <g key={name}>
          <rect x="0" y={i * 46} width="320" height="36" rx="8" style={i === steps.length - 1 ? soft : box} />
          <text x="14" y={i * 46 + 23} style={{ ...strong, fill: accent }}>{name}</text>
          <text x="72" y={i * 46 + 23} style={{ ...text, fill: "var(--ink-2)" }}>{what}</text>
          {i < steps.length - 1 && <path d={`M34 ${i * 46 + 37} V${i * 46 + 45}`} style={{ stroke: "var(--ink-4)", strokeWidth: 1.5 }} />}
        </g>
      ))}
    </svg>
  );
}

/** Before and after, row by row: what the shop changed (a section's way of doing with fewer hands). */
export function BeforeAfter({ rows, label }: { rows: Array<[string, string, string]>; label: string }) {
  return (
    <svg viewBox={`0 0 320 ${rows.length * 44 + 22}`} role="img" aria-label={label} className="block w-full">
      <defs><marker id="sec-ba-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      <text x="124" y="13" textAnchor="middle" style={text}>以前</text>
      <text x="262" y="13" textAnchor="middle" style={{ ...text, fill: accent, fontWeight: 600 }}>改了以后</text>
      {rows.map(([what, before, after], i) => (
        <g key={what}>
          <text x="0" y={i * 44 + 46} style={strong}>{what}</text>
          <rect x="72" y={i * 44 + 24} width="104" height="34" rx="6" style={box} />
          <text x="124" y={i * 44 + 46} textAnchor="middle" style={text}>{before}</text>
          <path d={`M180 ${i * 44 + 41} H198`} style={{ stroke: accent, strokeWidth: 2 }} markerEnd="url(#sec-ba-ar)" />
          <rect x="204" y={i * 44 + 24} width="116" height="34" rx="6" style={soft} />
          <text x="262" y={i * 44 + 46} textAnchor="middle" style={{ ...strong, fill: accent, fontSize: 14 }}>{after}</text>
        </g>
      ))}
    </svg>
  );
}
