// The pictures of the sections of small-budget-marketing (sections/index.ts keys them by "small-budget-marketing/<cause key>").
import { text, strong, accent, box, soft, Steps, type Section } from "./kit";

/** 社交媒体: a phone with the shop's own posts, made by the owner, and replies to what guests write. */
function Posts() {
  const posts = ["店里今天的事", "客人说的话", "值得拍的一道菜"];
  return (
    <svg viewBox="0 0 320 176" role="img" aria-label="示意图：手机上店主自己发的帖子：店里的事、客人说的话、值得拍的菜，还有回复客人的留言" className="block w-full">
      <rect x="40" y="2" width="132" height="172" rx="16" style={box} />
      <path d="M90 12 H122" style={{ stroke: "var(--line-strong)", strokeWidth: 3, strokeLinecap: "round" }} />
      {posts.map((post, i) => (
        <g key={post}>
          <rect x="52" y={i * 38 + 24} width="108" height="30" rx="6" style={soft} />
          <rect x="58" y={i * 38 + 30} width="18" height="18" rx="3" style={{ fill: accent, opacity: 0.55 }} />
        </g>
      ))}
      <rect x="52" y="140" width="108" height="24" rx="12" style={{ fill: "var(--surface)", stroke: "var(--line-strong)" }} />
      <text x="106" y="157" textAnchor="middle" style={{ ...text, fill: "var(--ink-2)" }}>回复留言</text>
      {posts.map((post, i) => (
        <g key={post}>
          <path d={`M162 ${i * 38 + 39} H184`} style={{ stroke: accent, strokeWidth: 1.5 }} />
          <text x="190" y={i * 38 + 44} style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>{post}</text>
        </g>
      ))}
      <path d="M162 152 H184" style={{ stroke: "var(--ink-4)", strokeWidth: 1.5 }} />
      <text x="190" y="157" style={text}>客人留言就回</text>
    </svg>
  );
}

/** 店门口和附近的人: the shop and the places round it it does something for every month. */
function Neighbours() {
  const places: Array<[number, number, string]> = [[0, 8, "学校"], [216, 8, "酒店"], [0, 118, "教堂"], [216, 118, "社区团体"]];
  return (
    <svg viewBox="0 0 320 160" role="img" aria-label="示意图：店和附近的学校、酒店、教堂、社区团体，每月固定送餐或捐出一部分营业额" className="block w-full">
      {places.map(([x, y, name]) => {
        const left = x < 100;
        const top = y < 60;
        return (
          <g key={name}>
            <path d={`M${left ? 104 : 216} ${top ? y + 34 : y} L${left ? 124 : 196} ${top ? 62 : 98}`} style={{ stroke: accent, strokeWidth: 1.5, strokeDasharray: "4 3" }} />
            <rect x={x} y={y} width="104" height="34" rx="6" style={box} />
            <text x={x + 52} y={y + 22} textAnchor="middle" style={strong}>{name}</text>
          </g>
        );
      })}
      <g style={{ fill: accent }}><rect x="144" y="60" width="32" height="26" /><path d="M138 62 L160 46 L182 62 Z" /></g>
      <text x="160" y="110" textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>每月固定</text>
      <text x="160" y="128" textAnchor="middle" style={{ fill: accent, fontSize: 14, fontWeight: 700 }}>送餐、捐款</text>
    </svg>
  );
}

export const sections: Record<string, Section> = {
  "first-moves": { kind: "示意", caption: "钱少时，几家店先把招牌菜和店的样子做出来，再用不花钱的渠道让人找到，用赠品换客人的联系方式持续联系，看到效果以后才考虑付费广告。", draw: () => <Steps label="示意图：营销预算少时的先后：先做招牌菜和店的样子，再做免费渠道，再留下客人的联系方式，最后才投付费广告" steps={[["先做", "招牌菜和店的样子"], ["免费", "地图上的店铺资料、LINE"], ["留下", "用赠品换客人的联系方式"], ["再看", "有效果才投付费广告"]]} /> },
  "social": { kind: "示意", caption: "几家店由店主自己持续发帖：店里的事、客人说的话、值得拍下来的菜，客人留言就回。把菜做成客人愿意拍的样子，客人也会自己发出去。", draw: () => <Posts /> },
  "local": { kind: "示意", caption: "把和附近的关系做成固定的事：每月给学校、酒店、教堂或社区团体送一次餐，或把一天营业额的一部分捐给当地团体。", draw: () => <Neighbours /> },
};
