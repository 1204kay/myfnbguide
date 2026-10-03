// 主题页“大事记”的行业规则。通用的几步在框架里（packages/backend/src/publication/topic-chronicle.ts）：
// 从近 12 个月已公开的精选里，按这里的规则定类型，比精选分门槛，把同一件事并成一个节点，按每月名额取舍，
// 再写成事件名；公司主题只收这家公司自己的（看事实主体，没有主体时看标题在发布动作之前先点名谁）。
// 换行业时改这个文件：节点类型（名称、门槛、名额、画在哪一行）、内容形态主题收哪些类型、发布动作、
// 一篇报道算哪类节点。合并同一发布、写事件名两项可选，删掉就用框架的做法：只合并标题或事件名相同的，
// 事件名取标题的第一句。
// 公司编年史还可以接上人工整理的历史：industry/chronicles/{主题 slug}.json，格式见 docs/customize.md。
//
// 餐饮小店版（2026-10-03）：本站的读者要的是做法，不是谁发布了什么。所以大事记就是每个主题每月最值得看的
// 几条：做法（同行经验、老板说）、工具（省人省钱）、变化（风向、规定与平台、大牌动作）。经营主题的节点标题要
// 用到 topics.json 里这个主题的 chronicleTerms；品类与地区主题每月取前 5 条。没有公司主题（品牌主题页
// 2026-10-02 已删），公司那一行的规则不用写。
import { readFileSync } from "node:fs";

/** 主题的分组（topics.json 的 group）：公司、方向、内容形态。 */
type Group = "company" | "field" | "genre";

/** 一类节点。 */
export interface ChronicleKind {
  /** 卡片和时间轴上的类型名。 */
  label: string;
  /** 公司编年史里排在时间轴上方一行（AI：模型），标记最醒目；其余类型在下方一行。 */
  above?: true;
  /** 主题自己推出的东西（AI：模型、产品），用强调色标记；公司主题只收这家公司自己发布的。其余类型算新闻，公司主题只收以这家公司为主体的。 */
  launch?: true;
  /** 公司主题收这类节点的精选分门槛和每月名额（各类型分开取，互不挤占）；不写就不收。 */
  company?: { min: number; perMonth: number };
  /** 方向和形态主题收这类节点的精选分门槛（这些主题每月按重要程度取前 5 件）；不写就不收。 */
  other?: { min: number };
}

/** 规则读到的一篇入选报道。 */
export interface ChronicleItem {
  title: string;
  /** 外文报道的原标题。 */
  originalTitle: string | null;
  category: string | null;
  tags: string[];
  /** 属于这个行业最受关注的那类发布（taxonomy.ts 的 RELEASE）。 */
  release: boolean;
  /** 结构化抽取出的事实动作，比如 launch、opinion。 */
  factAction: string | null;
}

/** 一个候选节点：代表报道、事件名和它的全部报道。 */
export interface ChronicleEvent {
  kind: string;
  label: string;
  head: { title: string };
  reports: ReadonlyArray<{ title: string }>;
}

export interface ChronicleRules {
  /** 节点类型。公司主题的搜索摘要按这里的先后列出。 */
  kinds: Record<string, ChronicleKind>;
  /** 内容形态主题的大事记收哪些类型，每月最多几件（默认 5）；没列出的形态主题不设大事记，直接读精选。 */
  forms: Record<string, { kinds: string[]; perMonth?: number }>;
  /** 发布动作。公司主题遇到没有事实主体的报道，看标题在它之前先点名的是哪家公司。 */
  launchVerb: RegExp;
  /** 一篇报道在这一组主题里算哪类节点；不论分数高低都不算节点时返回 null（预告、教程、平台上架……）。 */
  kindOf(item: ChronicleItem, group: Group): string | null;
  /** 可选：同一周、同一类型的两个节点是不是同一件事（归组漏掉的同一发布）。 */
  sameEvent?(a: ChronicleEvent, b: ChronicleEvent): boolean;
  /** 可选：节点在时间轴上的名字（“Claude Opus 5.5 发布”），由代表报道的标题得出。 */
  eventName?(title: string, kind: string, topic: { slug: string; orgNames: readonly string[] }): string;
}

/** 类别（taxonomy.ts CATEGORIES 的 key）→ 节点类型。 */
const KIND_OF_CATEGORY: Record<string, string> = {
  tip: "method", opinion: "method", tools: "tools", market: "change", policy: "change", industry: "change",
};

/** 品类与地区主题（topics.json 里 group 为 genre 的）都设大事记，收全部类型。 */
const genreTopics = (JSON.parse(readFileSync(new URL("./topics.json", import.meta.url), "utf8")) as { topics: Array<{ slug: string; group: string }> })
  .topics.filter((t) => t.group === "genre");

export const CHRONICLE: ChronicleRules = {
  // 门槛按 2026-10-03 评测 v4：用户标必看的多在 58–71 分，入选门槛 40；55 分以上大致是入选里较强的一半。
  kinds: {
    method: { label: "做法", other: { min: 55 } },
    tools: { label: "工具", other: { min: 55 } },
    change: { label: "变化", other: { min: 55 } },
  },
  forms: Object.fromEntries(genreTopics.map((t) => [t.slug, { kinds: ["method", "tools", "change"] }])),
  launchVerb: /发布|推出|上线|开业|开出|launch|introduc/i,
  kindOf: (item) => KIND_OF_CATEGORY[item.category ?? ""] ?? null,
  // 本站的标题本身就是一句能看懂的话（rules-self-contained-title.md），整句当事件名，不截第一句。
  eventName: (title) => title.trim(),
};
