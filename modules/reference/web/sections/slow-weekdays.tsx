// The pictures of the sections of slow-weekdays (sections/index.ts keys them by "slow-weekdays/<cause key>").
import { text, strong, accent, box, soft, Eg, type Section } from "./kit";

/** 给平日一个来的理由: things the shop offers only on weekdays, each marked as such. */
function WeekdayOnly() {
  const offers: Array<[string, string]> = [["平日午餐", "只在周一到周五"], ["限时短菜单", "几道菜，几周就换"], ["季节菜单", "跟着季节换"]];
  return (
    <svg viewBox="0 0 320 152" role="img" aria-label="示意图：只在平日才有的东西：平日午餐、限时短菜单、季节菜单，给客人平日来的理由" className="block w-full">
      {offers.map(([name, what], i) => (
        <g key={name}>
          <rect x="0" y={i * 50 + 2} width="320" height="42" rx="8" style={box} />
          <rect x="10" y={i * 50 + 11} width="52" height="24" rx="12" style={soft} />
          <text x="36" y={i * 50 + 28} textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>平日</text>
          <text x="76" y={i * 50 + 29} style={strong}>{name}</text>
          <text x="308" y={i * 50 + 29} textAnchor="end" style={text}>{what}</text>
        </g>
      ))}
    </svg>
  );
}

/** 按时段定价和套餐: open fewer days and bring the same week's guests into them; each block one open day's takings. */
function FewerDays() {
  const rows: Array<[string, number, number]> = [["开 6 天", 6, 30], ["开 4 天", 4, 45]];
  return (
    <svg viewBox="0 0 320 136" role="img" aria-label="举例：一周开六天，每天的营业额少；改成开四天，客人集中到这四天，每天的营业额多，一周合计差不多" className="block w-full">
      {rows.map(([name, days, h], r) => {
        const base = r * 64 + 54;
        return (
          <g key={name}>
            <text x="0" y={r === 1 ? base - 26 : base - 8} style={r === 1 ? { ...strong, fill: accent } : strong}>{name}</text>
            {r === 1 && <Eg x={0} y={base - 2} />}
            {Array.from({ length: days }, (_, i) => {
              const w = 168 / days - 4;
              return <rect key={i} x={74 + i * (168 / days)} y={base - h} width={w} height={h} rx="4" style={r === 1 ? { fill: accent, opacity: 0.8 } : { fill: "var(--ink-4)", opacity: 0.4 }} />;
            })}
            <path d={`M70 ${base} H246`} style={{ stroke: "var(--line-strong)" }} />
          </g>
        );
      })}
      <path d="M254 20 Q266 20 266 32 V106 Q266 118 254 118" style={{ fill: "none", stroke: "var(--ink-4)", strokeWidth: 1.5 }} />
      <text x="274" y="66" style={{ ...text, fill: "var(--ink-2)" }}>一周</text>
      <text x="274" y="84" style={{ ...text, fill: "var(--ink-2)" }}>差不多</text>
    </svg>
  );
}

/** 找新的客群: who has time on a weekday, coming to the shop at the hours that are quiet now. */
function WeekdayGuests() {
  const who = ["附近上班的人", "退休的长者", "带小孩的家长", "学生"];
  return (
    <svg viewBox="0 0 320 172" role="img" aria-label="示意图：平日有空的人，例如附近上班的人、退休的长者、带小孩的家长和学生，都可能在平日冷清的时段来店里" className="block w-full">
      <defs><marker id="sec-slow-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      {who.map((name, i) => (
        <g key={name}>
          <rect x="0" y={i * 42 + 4} width="132" height="34" rx="17" style={soft} />
          <text x="66" y={i * 42 + 26} textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>{name}</text>
          <path d={`M134 ${i * 42 + 21} C176 ${i * 42 + 21} 180 86 206 86`} style={{ fill: "none", stroke: accent, strokeWidth: 1.5 }} markerEnd="url(#sec-slow-ar)" />
        </g>
      ))}
      <rect x="212" y="58" width="106" height="56" rx="8" style={box} />
      <text x="265" y="82" textAnchor="middle" style={strong}>平日冷清</text>
      <text x="265" y="102" textAnchor="middle" style={strong}>的时段</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "weekday-reasons": { kind: "示意", caption: "给平日一个具体的到店理由：只在平日供应的午餐、几周就换的短菜单、跟着季节换的菜单，也有店在平日办活动或市集。", draw: () => <WeekdayOnly /> },
  "time-pricing": { kind: "举例", caption: "假设你的餐饮店一周开 6\u00a0天，平日客人少。改成开 4\u00a0天，客人集中到开门的几天，每天的营业额多了，一周合计差不多，人手和水电省下两天。冷清的时段不一定要开着等客人。", draw: () => <FewerDays /> },
  "new-guests": { kind: "示意", caption: "平日白天有空的人和周末不同，例如附近上班的人、退休的长者、带小孩的家长和学生。先想清楚平日能来的是谁，再定卖什么。", draw: () => <WeekdayGuests /> },
};
