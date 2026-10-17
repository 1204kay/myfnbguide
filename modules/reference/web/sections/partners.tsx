// The pictures of the sections of partners (sections/index.ts keys them by "partners/<cause key>").
import { text, strong, accent, box, type Section } from "./kit";

/** 怎么分钱分工: who puts in money, who works in the shop, who keeps the money, who decides, set down for both. */
function WhoDoesWhat() {
  const rows: Array<[string, boolean, boolean]> = [["出钱", true, true], ["每天在店里", false, true], ["管账和用钱", true, false], ["大事一起定", true, true]];
  return (
    <svg viewBox="0 0 320 176" role="img" aria-label="示意图：一张写给两位合伙人的约定：谁出钱、谁每天在店里、谁管账和用钱、哪些事一起定" className="block w-full">
      <rect x="2" y="2" width="316" height="172" rx="8" style={box} />
      <text x="18" y="28" style={strong}>合伙约定</text>
      <text x="206" y="28" textAnchor="middle" style={{ ...strong, fill: accent }}>甲</text>
      <text x="276" y="28" textAnchor="middle" style={{ ...strong, fill: accent }}>乙</text>
      {rows.map(([what, a, b], i) => {
        const y = i * 34 + 40;
        return (
          <g key={what}>
            <path d={`M14 ${y} H306`} style={{ stroke: "var(--line-strong)", strokeWidth: 1 }} />
            <text x="18" y={y + 23} style={{ ...text, fill: "var(--ink-2)" }}>{what}</text>
            {[a, b].map((yes, j) => yes
              ? <circle key={j} cx={206 + j * 70} cy={y + 18} r="8" style={{ fill: accent }} />
              : <path key={j} d={`M${200 + j * 70} ${y + 18} H${212 + j * 70}`} style={{ stroke: "var(--ink-4)", strokeWidth: 2 }} />)}
          </g>
        );
      })}
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "split": { kind: "示意", caption: "谁出钱、谁每天在店里做事、谁管账和用钱、哪些事要一起定，合伙前写成约定，比凭友情和信任更可靠。表里的分法只是一个样子，各家按自己的情况定。", draw: () => <WhoDoesWhat /> },
};
