// 站点的字标和圆环标记：页面用 Wordmark 画站名（size 是高度，单位像素），RingMark 是小标记，转起来就是加载动画。
// MYFNB 的字标是 3 号方案（全大写、宽字距、「MY」用主题色），由 myfnb/wordmark.ts 从 Noto Sans SC 生成路径，不加载字体。
import { SITE } from "../site.ts";

/** The wordmark (logo option 3: capitals, wide tracking, "MY" in the accent), as paths drawn by myfnb/wordmark.ts. */
const MARK = { viewBox: "0 -2 508 102", aspect: 4.9804, accent: "M18.1 100L0 100L0-1.1L22.4-1.1L39.6 46.4Q41.2 50.9 42.7 55.9Q44.2 60.8 45.7 65.6L45.7 65.6L46.4 65.6Q48.0 60.8 49.5 55.9Q51.0 50.9 52.4 46.4L52.4 46.4L69.3-1.1L91.7-1.1L91.7 100L73.3 100L73.3 57.8Q73.3 52.9 73.7 47.1Q74.1 41.2 74.7 35.3Q75.3 29.3 75.9 24.7L75.9 24.7L75.3 24.7L67.0 48.4L51.4 90.9L39.8 90.9L24.1 48.4L16.1 24.7L15.6 24.7Q16.1 29.3 16.6 35.3Q17.2 41.2 17.7 47.1Q18.1 52.9 18.1 57.8L18.1 57.8L18.1 100ZM172.2 100L152.1 100L152.1 63.0L121.7-1.1L143.1-1.1L153.2 23.6Q155.4 29.3 157.5 34.7Q159.6 40.1 161.9 46.0L161.9 46.0L162.5 46.0Q164.8 40.1 167.0 34.7Q169.3 29.3 171.5 23.6L171.5 23.6L181.6-1.1L202.6-1.1L172.2 63.0L172.2 100Z", ink: "M252.8 100L232.6 100L232.6-1.1L294.8-1.1L294.8 15.8L252.8 15.8L252.8 42.2L288.6 42.2L288.6 59.1L252.8 59.1L252.8 100ZM344.0 100L324.8 100L324.8-1.1L345.4-1.1L374.7 52.8L385.0 74.6L385.6 74.6Q384.8 66.7 383.9 57.3Q382.9 47.9 382.9 39.3L382.9 39.3L382.9-1.1L402.0-1.1L402.0 100L381.4 100L352.3 46.0L342.1 24.3L341.4 24.3Q342.1 32.5 343.1 41.6Q344.0 50.8 344.0 59.5L344.0 59.5L344.0 100ZM468.0 100L432.0 100L432.0-1.1L465.4-1.1Q475.8-1.1 484.1 1.2Q492.3 3.5 497.1 9.0Q502.0 14.5 502.0 23.9L502.0 23.9Q502.0 28.5 500.3 32.9Q498.6 37.4 495.6 40.8Q492.6 44.2 488.2 45.8L488.2 45.8L488.2 46.4Q496.4 48.3 501.7 54.2Q507.0 60.2 507.0 70.3L507.0 70.3Q507.0 80.4 501.9 87.0Q496.8 93.6 488.0 96.8Q479.2 100 468.0 100L468.0 100ZM452.2 14.5L452.2 40.1L464.1 40.1Q473.6 40.1 478.0 36.5Q482.3 32.9 482.3 26.9L482.3 26.9Q482.3 20.2 477.8 17.3Q473.3 14.5 464.2 14.5L464.2 14.5L452.2 14.5ZM452.2 55.0L452.2 84.4L466.2 84.4Q476.6 84.4 482.0 80.7Q487.4 76.9 487.4 69.0L487.4 69.0Q487.4 61.7 482.0 58.3Q476.6 55.0 466.2 55.0L466.2 55.0L452.2 55.0Z" };

export function Wordmark({ size = 24, className = "", title = SITE.name }: { size?: number; className?: string; title?: string }) {
  return (
    // `size` was the type size of the name set in text; the capitals stand about 0.7 of it.
    <svg viewBox={MARK.viewBox} height={Math.round(size * 0.7)} width={Math.round(size * 0.7 * MARK.aspect)} className={`inline-block ${className}`} role="img" aria-label={title}>
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
