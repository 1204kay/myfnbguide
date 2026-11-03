// The pictures of the sections of hospitality (sections/index.ts keys them by "hospitality/<cause key>").
import { text, strong, accent, box, soft, Steps, type Section } from "./kit";

/** 合理的款待: on the way through a meal, what is done before the guest has to ask. */
function BeforeAsked() {
  return (
    <svg viewBox="0 0 320 116" role="img" aria-label="示意图：在客人开口以前，先询问是否需要分餐盘、是否需要把三明治切开；而不是等客人提出后才处理" className="block w-full">
      <defs><marker id="hs-time-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: "var(--ink-4)" }} /></marker></defs>
      <text x="0" y="40" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>客人开口以前</text>
      <text x="224" y="40" style={text}>客人开口</text>
      <path d="M0 56 H312" style={{ stroke: "var(--ink-4)", strokeWidth: 1.5 }} markerEnd="url(#hs-time-ar)" />
      <path d="M218 24 V108" style={{ stroke: "var(--ink-4)", strokeWidth: 1.5, strokeDasharray: "3 3" }} />
      <rect x="0" y="72" width="104" height="34" rx="6" style={soft} />
      <text x="52" y="94" textAnchor="middle" style={{ ...strong, fill: accent, fontSize: 14 }}>询问是否分盘</text>
      <rect x="110" y="72" width="102" height="34" rx="6" style={soft} />
      <text x="161" y="94" textAnchor="middle" style={{ ...strong, fill: accent, fontSize: 14 }}>询问是否切开</text>
      <rect x="224" y="72" width="96" height="34" rx="6" style={box} />
      <text x="272" y="94" textAnchor="middle" style={text}>提出后才处理</text>
    </svg>
  );
}

/** 小细节: at the door, while waiting and at the till, one detail each. */
function ThreeMoments() {
  const rows: Array<[string, string]> = [["门口", "写明一个人也欢迎"], ["点单", "把点的菜念一遍"], ["饭后", "赠送一小份甜点"]];
  return (
    <svg viewBox="0 0 320 124" role="img" aria-label="示意图：门口写明一个人也欢迎，点单后把点的菜念一遍，饭后赠送一小份甜点" className="block w-full">
      {rows.map(([when, what], i) => (
        <g key={when}>
          <rect x="0" y={i * 44} width="64" height="36" rx="6" style={soft} />
          <text x="32" y={i * 44 + 23} textAnchor="middle" style={{ ...strong, fill: accent }}>{when}</text>
          <rect x="72" y={i * 44} width="248" height="36" rx="6" style={box} />
          <text x="86" y={i * 44 + 23} style={{ ...text, fill: "var(--ink-2)" }}>{what}</text>
          <circle cx="300" cy={i * 44 + 18} r="9" style={{ fill: accent }} />
          <path d={`M295.5 ${i * 44 + 18} l3 3 l5.5 -6`} style={{ fill: "none", stroke: "var(--accent-contrast)", strokeWidth: 2, strokeLinecap: "round" }} />
        </g>
      ))}
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "reasonable-hospitality": { kind: "示意", caption: "让客人觉得被照顾，往往在于客人开口以前就已做到：有的店会先询问是否需要分餐的盘子、是否需要把三明治切开，而不是等客人提出后才处理。", draw: () => <BeforeAsked /> },
  "small-details": { kind: "示意", caption: "几家店做的小事：门口写明一个人也欢迎，客人点完把点的菜念一遍、当场核对是否记错、有无忌口，饭后赠送一小份甜点或给小孩一个小玩具，成本都不高。", draw: () => <ThreeMoments /> },
  complaints: { kind: "示意", caption: "客人当场不满意时，一种处理的顺序：先让客人把话说完，再道歉，不争对错；当场换一份或补上，事后找出原因，避免同类问题再次发生。", draw: () => <Steps label="示意图：处理抱怨的四步，听客人说完、先道歉、当场补救、事后找原因" steps={[["听", "让客人把话说完"], ["认", "先道歉，不争对错"], ["补", "当场换一份或补上"], ["查", "事后找出原因"]]} /> },
};
