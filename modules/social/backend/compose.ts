// A story as a post for each platform, written by the program from the story's own fields, no model: the story has
// passed the reference library's checks (every number is in the original, the wording rules hold), and a post that
// takes its words from it and adds only its own fixed lines cannot say more than it does. The post is checked again
// before anyone sees it (check): wording, numbers, the length the platform takes, the label and the link.
import { READER_WORDING } from "@aihot/industry/wording";

export const PLATFORMS = ["facebook", "instagram", "wechat"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** The label for AI-written content (《人工智能生成合成内容标识办法》, myfnb/research-2026-10-04.md §11). */
export const AI_LABEL = "AI 辅助生成，整理自公开的原文";
const LINK_LINE = "完整故事和原文出处：";
/** Instagram does not make a link in a caption clickable. */
const IG_LINK_LINE = "完整故事和原文出处：见主页链接";

/** What a post takes from a story (reference_cases.story): its title, its opening line and the figures it shows big. */
export interface StoryParts {
  title: string;
  lead: string;
  figures: Array<{ value: string; label: string }>;
}

/** Most figures a post shows; the first block of figures in the story gives them. */
const FIGURES = 3;
/** Longest a post may be, by platform (characters): Facebook reads better short, Instagram's limit is 2,200, a WeChat title takes 64. */
export const LIMITS: Record<Platform, { body: number; title: number }> = {
  facebook: { body: 500, title: 80 },
  instagram: { body: 400, title: 80 },
  wechat: { body: 900, title: 64 },
};

/** The parts of a stored story (any block of its parts may hold the figures), tolerant of what it does not know. */
export function storyParts(story: unknown): StoryParts | null {
  const s = story as { title?: unknown; lead?: unknown; parts?: unknown } | null;
  if (!s || typeof s.title !== "string" || !s.title.trim()) return null;
  const figures: StoryParts["figures"] = [];
  for (const part of Array.isArray(s.parts) ? s.parts : []) {
    for (const block of Array.isArray(part?.blocks) ? part.blocks : []) {
      if (block?.type !== "numbers" || figures.length) continue;
      for (const item of Array.isArray(block.items) ? block.items : []) {
        if (typeof item?.value === "string" && typeof item?.label === "string" && figures.length < FIGURES) figures.push({ value: item.value.trim(), label: item.label.trim() });
      }
    }
  }
  return { title: s.title.trim(), lead: typeof s.lead === "string" ? s.lead.trim() : "", figures };
}

export interface Drafted {
  platform: Platform;
  title: string;
  body: string;
  imageUrl: string | null;
  link: string;
  problems: string[];
}

/** The post for one platform. `imageUrl` is the story's share image; Instagram cannot post without one. */
export function compose(platform: Platform, story: StoryParts, link: string, imageUrl: string | null): Drafted {
  const figures = story.figures.map((f) => `· ${f.value}　${f.label}`);
  const body = [
    story.lead,
    figures.length ? figures.join("\n") : "",
    platform === "instagram" ? IG_LINK_LINE : `${LINK_LINE}${link}`,
    AI_LABEL,
  ].filter(Boolean).join("\n\n");
  const draft: Drafted = { platform, title: story.title, body, imageUrl, link, problems: [] };
  draft.problems = check(draft, story);
  return draft;
}

/** Every number a post writes is one the story writes; they are looked up as digits, with their marks. */
const NUMBER = /\d[\d,.，]*\d|\d/g;
const digits = (text: string) => new Set((text.normalize("NFKC").match(NUMBER) ?? []).map((n) => n.replace(/[,.，]/g, "")));

/** What is wrong with a post, in words for the owner; none means it may go to review as it is. */
export function check(post: Drafted, story: StoryParts): string[] {
  const problems: string[] = [];
  const limit = LIMITS[post.platform];
  if (!story.lead) problems.push("故事没有开头一句，帖子只剩标题");
  if (post.title.length > limit.title) problems.push(`标题 ${post.title.length} 字，超过 ${post.platform} 的 ${limit.title} 字`);
  if (post.body.length > limit.body) problems.push(`正文 ${post.body.length} 字，超过 ${post.platform} 的 ${limit.body} 字`);
  if (!post.body.includes(AI_LABEL)) problems.push("缺“AI 辅助生成”标识");
  if (post.platform !== "instagram" && !post.body.includes(post.link)) problems.push("缺故事链接");
  if (post.platform === "instagram" && !post.imageUrl) problems.push("Instagram 的帖子必须有图");
  const shown = digits(`${story.title} ${story.lead} ${story.figures.map((f) => `${f.value} ${f.label}`).join(" ")}`);
  const outside = [...digits(post.body.replace(post.link, "")), ...digits(post.title)].filter((n) => !shown.has(n));
  if (outside.length) problems.push(`有数字不在故事里：${[...new Set(outside)].join("、")}`);
  for (const [rule, fix] of READER_WORDING) {
    const hit = rule.exec(`${post.title}\n${post.body}`);
    if (hit) problems.push(`用词“${hit[0]}”：${fix}`);
  }
  return problems;
}
