// The item page's 正文 · AI 整理自原文 under the summary, as a story page has it (用户 10/9: 全部以参考页面为标准):
// the item's story when the library shows one, with the way to its situation, else the write-up of the original
// (backend/body.ts); nothing for an item with neither.
import { Link } from "react-router";
import { SITE } from "@aihot/site";
import type { ItemPart } from "@aihot/web/modules";
import { fullCountText } from "../format.ts";
import type { Block, ItemText } from "../types.ts";
import { BODY, MEASURE, StoryBlock } from "./ui";

function Parts({ parts }: { parts: Array<{ heading: string; blocks: Block[] }> }) {
  return parts.map((part, i) => (
    <section key={i} className="mt-8">
      <h2 className="text-[18px] font-bold leading-[1.45] text-ink lg:text-[19px]">{part.heading}</h2>
      {part.blocks.map((block, n) => <StoryBlock key={n} block={block} />)}
    </section>
  ));
}

function Block({ data }: { id: string; data: unknown }) {
  const text = data as ItemText | null;
  if (!text) return null;
  const { lead, parts, open } = text.kind === "case" ? text.story : text.body;
  return (
    <section className="mt-8">
      <div className="border-t border-line pt-3 text-[12px] text-ink-3">正文 · AI 整理自原文</div>
      <p className={`mt-3 ${BODY}`}>{lead}</p>
      {text.kind === "case" && <p className={`mt-3 ${BODY}`}>{text.story.who}</p>}
      <Parts parts={parts} />
      {open && <p className={`mt-6 text-[14px] leading-relaxed text-ink-4 ${MEASURE}`}>{open}</p>}
      {text.kind === "case" && (
        <Link viewTransition to={text.situation ? `/reference/${text.situation.slug}` : `/reference/cases/${text.id}`} className="card mt-8 block px-4 py-3.5 transition-colors hover:border-accent touch:active:bg-bg-sunk sm:px-5">
          <span className="text-[12px] font-semibold text-ink-3">收在 {SITE.name} 参考</span>
          <b className="mt-1 block text-[16px] font-[650] leading-[1.5] text-ink">{text.situation?.title ?? text.story.title}</b>
          {text.situation && <span className="mt-1 block text-[13px] text-accent">{fullCountText(text.situation.count)} ›</span>}
        </Link>
      )}
    </section>
  );
}

export default {
  path: (id) => `/api/reference/items/${encodeURIComponent(id)}`,
  Block,
} satisfies ItemPart;
