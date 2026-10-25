// 站点的字标和圆环标记：页面用 Wordmark 画站名（size 是高度，单位像素），RingMark 是小标记，转起来就是加载动画。
// MYFNB 的字标是 3 号方案（全大写、宽字距、「MY」用主题色），由 myfnb/wordmark.ts 从 Outfit Medium 生成路径，不加载字体。
import { SITE } from "../site.ts";

/** The wordmark (logo option 3: capitals, wide tracking, "MY" in the accent), as paths drawn by myfnb/wordmark.ts. */
const MARK = { viewBox: "0 -1 526 101", aspect: 5.2079, accent: "M16.4 100L0 100L0-0.0L11.4-0.0L49.3 62.3L87.1-0.0L98.6-0.0L98.6 100L82.1 100L82.1 36.0L55 80.6L43.6 80.6L16.4 36.0L16.4 100ZM181.7 100L165.3 100L165.3 56.4L128.6-0.0L147.6-0.0L173.6 40.9L199.6-0.0L218.3-0.0L181.7 55.9L181.7 100Z", ink: "M264.7 100L248.3 100L248.3-0.0L312.9-0.0L312.9 15.0L264.7 15.0L264.7 42.1L310.4 42.1L310.4 57.1L264.7 57.1L264.7 100ZM359.3 100L342.9 100L342.9-0.0L354.3-0.0L407.1 69L407.1-0.0L423.6-0.0L423.6 100L412.1 100L359.3 31.0L359.3 100ZM492.9 100L453.6 100L453.6-0.0L491.6-0.0Q501.7-0.0 508.4 3.7Q515.1 7.4 518.4 13.3Q521.7 19.1 521.7 25.9L521.7 25.9Q521.7 33.7 517.4 39.7L517.4 39.7Q514.6 43.4 510.3 46.4L510.3 46.4Q516.6 49.9 520.6 55.1L520.6 55.1Q525.9 62.1 525.9 71.6L525.9 71.6Q525.9 79.3 522.1 85.7Q518.3 92.1 510.9 96.1Q503.6 100 492.9 100L492.9 100ZM493.6 54.6L470.0 54.6L470.0 85.7L493.6 85.7Q501.1 85.7 505.3 81Q509.4 76.3 509.4 70.1L509.4 70.1Q509.4 66 507.6 62.4Q505.7 58.9 502.1 56.7Q498.6 54.6 493.6 54.6L493.6 54.6ZM491.1 14.3L470.0 14.3L470.0 40.3L491.1 40.3Q497.6 40.3 501.4 37.0Q505.3 33.7 505.3 27.3Q505.3 20.9 501.4 17.6Q497.6 14.3 491.1 14.3L491.1 14.3Z" };

export function Wordmark({ size = 24, className = "", title = SITE.name }: { size?: number; className?: string; title?: string }) {
  return (
    // `size` is the mark's box height, as on the original site, whose letters stand about 0.9 of it (measured 10/24).
    <svg viewBox={MARK.viewBox} height={Math.round(size * 0.9)} width={Math.round(size * 0.9 * MARK.aspect)} className={`inline-block ${className}`} role="img" aria-label={title}>
      <path d={MARK.accent} style={{ fill: "var(--accent)" }} />
      <path d={MARK.ink} fill="currentColor" />
    </svg>
  );
}

/** A ring with a dot; spinning, it is the loader. */
export function RingMark({ className = "", spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g style={spinning ? { transformOrigin: "12px 12px", animation: "spin-slow 1.1s linear infinite" } : undefined}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="42 15" />
      </g>
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}
