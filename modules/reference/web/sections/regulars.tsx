// The pictures of the sections of regulars (sections/index.ts keys them by "regulars/<cause key>").
import { text, strong, accent, box, soft, type Section } from "./kit";

/** 提醒比奖励有效: after the guest leaves, a reminder within a few days gives a reason to come back soon. */
function Reminder() {
  return (
    <svg viewBox="0 0 320 136" role="img" aria-label="示意图：客人离开以后的几天里，店家发一条提醒，告诉客人近期再来的理由，客人再来" className="block w-full">
      <defs><marker id="sec-reg-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      <rect x="84" y="88" width="136" height="20" rx="6" style={soft} />
      <path d="M14 98 H306" style={{ stroke: "var(--line-strong)", strokeWidth: 1.5 }} />
      <circle cx="40" cy="98" r="7" style={{ fill: "var(--ink-4)" }} />
      <circle cx="280" cy="98" r="7" style={{ fill: accent }} />
      <text x="40" y="128" textAnchor="middle" style={text}>离开</text>
      <text x="152" y="128" textAnchor="middle" style={{ ...text, fill: accent, fontWeight: 600 }}>离开后几天内</text>
      <text x="280" y="128" textAnchor="middle" style={{ ...strong, fill: accent }}>再来</text>
      <rect x="64" y="8" width="176" height="44" rx="10" style={box} />
      <path d="M140 52 L152 66 L160 52" style={{ fill: "var(--fig-box)", stroke: "var(--line-strong)" }} />
      <path d="M141 51.5 H159" style={{ stroke: "var(--fig-box)", strokeWidth: 2 }} />
      <text x="152" y="27" textAnchor="middle" style={text}>店家发来的提醒</text>
      <text x="152" y="45" textAnchor="middle" style={{ ...strong, fontSize: 14 }}>这周末有限定菜单</text>
      <path d="M244 32 C270 34 280 60 280 84" style={{ fill: "none", stroke: accent, strokeWidth: 2 }} markerEnd="url(#sec-reg-ar)" />
    </svg>
  );
}

/** 会员和积分: a stamp card, a stamp each visit and a reward when full; points, stored value and clubs work the same way. */
function StampCard() {
  const stamped = 6;
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="示意图：一张集点卡，每来一次盖一个章，集满换奖励；积分、储值和会员俱乐部也是给客人一个再来的理由" className="block w-full">
      <rect x="2" y="2" width="316" height="104" rx="10" style={box} />
      <text x="18" y="28" style={strong}>集点卡</text>
      <text x="302" y="28" textAnchor="end" style={text}>每来一次盖一个章</text>
      {Array.from({ length: 10 }, (_, i) => {
        const cx = 34 + (i % 5) * 50;
        const cy = 56 + Math.floor(i / 5) * 32;
        const last = i === 9;
        return last
          ? <g key={i}><rect x={cx - 22} y={cy - 13} width="44" height="26" rx="6" style={soft} /><text x={cx} y={cy + 5} textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>奖励</text></g>
          : <circle key={i} cx={cx} cy={cy} r="11" style={i < stamped ? { fill: accent, opacity: 0.85 } : { fill: "none", stroke: "var(--line-strong)", strokeDasharray: "3 3" }} />;
      })}
      <g textAnchor="middle" style={{ ...text, fill: "var(--ink-2)" }}>
        <text x="54" y="138">积分</text><text x="160" y="138">储值</text><text x="266" y="138">会员俱乐部</text>
      </g>
      <path d="M100 133 H120 M200 133 H220" style={{ stroke: "var(--line)" }} />
    </svg>
  );
}

/** 记住客人: what a shop writes down about a regular, and the question it asks next time. */
function Remember() {
  const rows: Array<[string, string]> = [["名字", "怎么称呼"], ["常点", "上次点的菜"], ["口味", "少辣、不要葱"]];
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="示意图：记下常客的名字、常点的菜和口味，下次来时主动问：还是和上次一样吗" className="block w-full">
      <rect x="2" y="6" width="176" height="138" rx="8" style={box} />
      <text x="16" y="30" style={strong}>常客本子</text>
      {rows.map(([name, what], i) => (
        <g key={name}>
          <path d={`M16 ${i * 34 + 44} H164`} style={{ stroke: "var(--line)" }} />
          <text x="16" y={i * 34 + 66} style={{ ...text, fill: "var(--ink-2)", fontWeight: 600 }}>{name}</text>
          <text x="164" y={i * 34 + 66} textAnchor="end" style={text}>{what}</text>
        </g>
      ))}
      <rect x="194" y="44" width="124" height="62" rx="10" style={soft} />
      <path d="M194 66 L182 76 L194 82" style={{ fill: "var(--accent-soft)", stroke: accent, strokeWidth: 1.2 }} />
      <path d="M194.6 67 V81" style={{ stroke: "var(--accent-soft)", strokeWidth: 2 }} />
      <text x="256" y="70" textAnchor="middle" style={{ ...strong, fill: accent, fontSize: 14 }}>还是和上次</text>
      <text x="256" y="90" textAnchor="middle" style={{ ...strong, fill: accent, fontSize: 14 }}>一样吗？</text>
      <text x="256" y="130" textAnchor="middle" style={text}>下次来时</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "reminders": { kind: "示意", caption: "客人不再来，多半是忘了这家店。几家店在客人离开以后的几天里发一条提醒，给一个近期再来的理由，例如只在周末供应的菜单；渠道有短信、LINE 和电话。", draw: () => <Reminder /> },
  "loyalty": { kind: "示意", caption: "集点卡、积分、储值和会员俱乐部，都是给客人一个回到自家店里的理由。各种做法的成本和兑换速度不同，上线以后看有多少人入会、多少人兑换，再调整。", draw: () => <StampCard /> },
  "recognize": { kind: "示意", caption: "几家店把常客的名字、常点的菜和口味记下来，下次来时主动提起。客人被记住，就更愿意再来。", draw: () => <Remember /> },
};
