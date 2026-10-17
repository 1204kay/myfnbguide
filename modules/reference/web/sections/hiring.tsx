// The pictures of the sections of hiring (sections/index.ts keys them by "hiring/<cause key>").
import { text, strong, accent, box, soft, Steps, BeforeAfter, type Section } from "./kit";

/** 去哪里找人: besides the job sites, regulars, the staff's own friends and people from other trades come in. */
function WaysIn() {
  const ways: Array<[string, boolean]> = [["招聘网站", false], ["熟客", true], ["员工介绍", true], ["别的行业", true]];
  return (
    <svg viewBox="0 0 320 168" role="img" aria-label="示意图：除了招聘网站，熟客、员工介绍和别的行业也能找到人" className="block w-full">
      <defs><marker id="sec-ways-ar" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0.6 L8 4 L0 7.4 L2.2 4 Z" style={{ fill: accent }} /></marker></defs>
      {ways.map(([name, mainly], i) => (
        <g key={name}>
          <rect x="4" y={i * 40 + 6} width="100" height="32" rx="6" style={mainly ? soft : { ...box, strokeDasharray: "4 3" }} />
          <text x="54" y={i * 40 + 27} textAnchor="middle" style={mainly ? { ...strong, fill: accent } : text}>{name}</text>
          <path d={`M106 ${i * 40 + 22} C160 ${i * 40 + 22} 170 84 206 84`} style={{ fill: "none", stroke: mainly ? accent : "var(--ink-4)", strokeWidth: mainly ? 2 : 1.5, strokeDasharray: mainly ? undefined : "4 3" }} markerEnd={mainly ? "url(#sec-ways-ar)" : undefined} />
        </g>
      ))}
      <rect x="212" y="62" width="104" height="44" rx="8" style={box} />
      <text x="264" y="89" textAnchor="middle" style={strong}>店里缺的人</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "where-to-find": { kind: "示意", caption: "除了招聘网站，各地店家找人还靠熟客、现有员工的介绍，以及从别的行业转过来的人。", draw: () => <WaysIn /> },
  "interview": { kind: "示意", caption: "几家店的做法连起来是这几步：启事写清一个班次实际要做什么，面谈前先用笔试或到店试做筛一遍，面谈看态度，技能进店以后再教。", draw: () => <Steps label="示意图：招聘的四步，写启事、先筛选、面谈看态度、进店再教" steps={[["启事", "写清一个班次实际要做什么"], ["筛选", "面谈前先笔试或到店试做"], ["面谈", "看态度"], ["进店", "技能进店以后再教"]]} /> },
  "fewer-hands": { kind: "示意", caption: "人手不够时，有的店不再多招，而是让店里要做的事变少：菜单删短、点餐和结账交给设备、定下固定休息日。", draw: () => <BeforeAfter label="示意图：菜单删短，点餐结账交给设备，定下固定休息日" rows={[["菜单", "几十道菜", "只留卖得好的"], ["点餐结账", "店员来做", "扫码和自助机"], ["营业", "天天开门", "固定休息日"]]} /> },
};
