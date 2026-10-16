// The item page's 正文 · AI 整理自原文 under the summary, as a story page has it (用户 10/9: 全部以参考页面为标准):
// the item's story when the library shows one (its who line and parts: the summary above stands for its opening),
// with the way to its situation, else the write-up of the original (backend/body.ts); nothing for an item with neither.
// Its frame is the item page's own body section (AIHOT routes/item.tsx): the same hairline, label and spacing.
import type { ItemPart } from "@aihot/web/modules";
import { fullCountText } from "../format.ts";
import type { Block, ItemText } from "../types.ts";
import { BODY, BODY_LABEL, MEASURE, StoryBlock, WhereFiled } from "./ui";

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
  // A story's opening scene is for the library page, where nothing stands above it; here the summary has just set the
  // scene. Its who line stays: the parts say 这位顾问 and need it (10/9 eval: hidden, the parts named no one).
  const { parts, open } = text.kind === "case" ? text.story : text.body;
  const first = text.kind === "case" ? text.story.who : text.body.lead;
  return (
    <>
      <section className="mt-9 border-t border-line pt-4 xl:mt-10">
        <div className={BODY_LABEL}>正文 · AI 整理自原文</div>
        {first && <p className={BODY}>{first}</p>}
        <Parts parts={parts} />
        {open && <p className={`mt-6 text-[14px] leading-relaxed text-ink-4 ${MEASURE}`}>{open}</p>}
      </section>
      {text.kind === "case" && (
        <WhereFiled
          to={text.situation ? `/reference/${text.situation.slug}` : `/reference/cases/${text.id}`}
          title={text.situation?.title ?? text.story.title}
          count={text.situation ? fullCountText(text.situation.count) : null}
        />
      )}
    </>
  );
}

export default {
  path: (id) => `/api/reference/items/${encodeURIComponent(id)}`,
  Block,
} satisfies ItemPart;
