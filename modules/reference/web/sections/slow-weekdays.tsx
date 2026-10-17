// The pictures of the sections of slow-weekdays (sections/index.ts keys them by "slow-weekdays/<cause key>").
import { text, strong, accent, box, soft, type Section } from "./kit";

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

/** 找新的客群: who has time on a weekday, coming to the shop at the hours that are quiet now. */
function WeekdayGuests() {
  const who = ["写字楼的上班族", "工厂和医院", "企业茶歇", "活动和生日会"];
  return (
    <svg viewBox="0 0 320 172" role="img" aria-label="示意图：写字楼的上班族、工厂和医院、企业茶歇、活动和生日会，都能填上平日冷清的时段" className="block w-full">
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
  "new-guests": { kind: "示意", caption: "平日能来的客人和周末不同。几家店带着免费餐走访附近的写字楼，把餐车开到工厂和医院，给企业茶歇、活动和生日会分别定目标。", draw: () => <WeekdayGuests /> },
};
