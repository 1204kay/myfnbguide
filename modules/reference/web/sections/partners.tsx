// The pictures of the sections of partners (sections/index.ts keys them by "partners/<cause key>").
import { text, strong, accent, box, soft, Steps, type Section } from "./kit";

/** 怎么选合伙人: getting on well is one thing; three questions to settle before going in together. */
function BeyondFriends() {
  const asks = ["会做的事补得上", "对用钱的看法一样", "意见不合时怎么定"];
  return (
    <svg viewBox="0 0 320 156" role="img" aria-label="示意图：合得来之外，合伙前还要问清会做的事补不补得上、对用钱的看法一不一样、意见不合时怎么定" className="block w-full">
      <defs><marker id="sec-choose-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      <rect x="2" y="60" width="92" height="36" rx="8" style={box} />
      <text x="48" y="83" textAnchor="middle" style={text}>合得来</text>
      {asks.map((ask, i) => (
        <g key={ask}>
          <path d={`M96 78 C120 78 118 ${i * 54 + 24} 142 ${i * 54 + 24}`} style={{ fill: "none", stroke: accent, strokeWidth: 1.8 }} markerEnd="url(#sec-choose-ar)" />
          <rect x="150" y={i * 54 + 6} width="168" height="36" rx="8" style={soft} />
          <text x="234" y={i * 54 + 29} textAnchor="middle" style={{ ...strong, fill: accent, fontSize: 14 }}>{ask}</text>
        </g>
      ))}
    </svg>
  );
}

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
  "choose": { kind: "示意", caption: "合得来的朋友不一定是好的合伙人。合伙之前，还要问清楚：各自会做的事补不补得上，对用钱的看法一不一样，意见不合时怎么定。", draw: () => <BeyondFriends /> },
  "split": { kind: "示意", caption: "谁出钱、谁每天在店里做事、谁管账和用钱、哪些事要一起定，合伙前写成约定，比凭友情和信任更可靠。表里的分法只是一个样子，各家按自己的情况定。", draw: () => <WhoDoesWhat /> },
  "exit": { kind: "示意", caption: "拆伙的规则在开店时就写进约定：谁可以退出、要提前多久说，股份怎么估价，由谁出钱买下，店名、账户和合同归谁。", draw: () => <Steps label="示意图：退出的规则事先写好的四件事：怎么提出、怎么估价、谁来买下、店名和账户归谁" steps={[["提出", "谁可以退出、提前多久说"], ["估价", "股份怎么算价钱"], ["买下", "由谁出钱买下"], ["归属", "店名、账户和合同归谁"]]} /> },
};
