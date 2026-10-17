// The pictures of the sections of wrong-person (sections/index.ts keys them by "wrong-person/<cause key>").
import { text, strong, hot, accent, box, soft, type Section } from "./kit";

/** 标准和底线: two tiers: what ends the job on the spot, and the everyday standards said once and kept every time. */
function TwoTiers() {
  return (
    <svg viewBox="0 0 320 132" role="img" aria-label="示意图：偷窃、背后攻击老板是底线，当场辞退；收尾这类日常标准说一次，每次照做" className="block w-full">
      <rect x="0" y="6" width="320" height="52" rx="8" style={{ fill: hot, fillOpacity: 0.1, stroke: hot, strokeWidth: 1.2 }} />
      <text x="14" y="38" style={{ ...strong, fill: hot }}>底线</text>
      <text x="76" y="38" style={{ ...text, fill: "var(--ink-2)" }}>偷窃、背后攻击老板</text>
      <text x="308" y="38" textAnchor="end" style={{ ...strong, fill: hot }}>当场辞退</text>
      <rect x="0" y="72" width="320" height="52" rx="8" style={soft} />
      <text x="14" y="104" style={{ ...strong, fill: accent }}>日常</text>
      <text x="76" y="104" style={{ ...text, fill: "var(--ink-2)" }}>收尾这类标准</text>
      <text x="308" y="104" textAnchor="end" style={{ ...strong, fill: accent, fontSize: 14 }}>说一次，每次照做</text>
    </svg>
  );
}

/** 怎么谈: the same problem, each talk more serious than the last; every talk written down; letting go only at the end. */
function EachMoreSerious() {
  const talks: Array<[string, number]> = [["当面指出", 30], ["口头警告", 50], ["书面警告", 70]];
  return (
    <svg viewBox="0 0 320 152" role="img" aria-label="示意图：同一个问题，先当面指出，再口头警告，再书面警告，一次比一次严肃，每次都记录；还是改不了才辞退" className="block w-full">
      <text x="0" y="16" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>每次谈完都记下来</text>
      {talks.map(([name, h], i) => (
        <g key={name}>
          <rect x={i * 80} y={120 - h} width="72" height={h} rx="6" style={{ fill: accent, opacity: 0.3 + i * 0.25 }} />
          <text x={i * 80 + 36} y="142" textAnchor="middle" style={{ ...text, fill: "var(--ink-2)" }}>{name}</text>
        </g>
      ))}
      <rect x="240" y="30" width="72" height="90" rx="6" style={{ ...box, strokeDasharray: "4 3" }} />
      <text x="276" y="72" textAnchor="middle" style={text}>还是</text>
      <text x="276" y="90" textAnchor="middle" style={text}>改不了</text>
      <text x="276" y="142" textAnchor="middle" style={{ ...strong, fill: hot, fontSize: 14 }}>才辞退</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "the-line": { kind: "示意", caption: "两层标准分开定：偷窃、背后攻击老板这类行为是底线，当场辞退；收尾这类日常标准说一次，之后每次照做，对谁都一样。", draw: () => <TwoTiers /> },
  "difficult-talk": { kind: "示意", caption: "同一个问题一次比一次严肃地谈：先当面指出，再口头警告，再书面警告，每次谈话都记录下来；还是改不了才辞退，辞退前先查当地法律。", draw: () => <EachMoreSerious /> },
};
