// The item page's block under its three parts (title, 导读, 原文要点): the way to the item's story when the library
// shows one, in the story page's own "收在 … 参考" link. The story itself and the write-ups of other items are no longer
// drawn here (十一 10-24: every item page has the same three parts; Kay「只保留一种」). Nothing for other items.
import type { ItemPart } from "@aihot/web/modules";
import { fullCountText } from "../format.ts";
import type { ItemText } from "../types.ts";
import { WhereFiled } from "./ui";

function Block({ data }: { id: string; data: unknown }) {
  const text = data as ItemText | null;
  if (!text) return null;
  return (
    <WhereFiled
      to={text.situation ? `/reference/${text.situation.slug}` : `/reference/cases/${text.id}`}
      title={text.situation?.title ?? text.title}
      count={text.situation ? fullCountText(text.situation.count) : null}
    />
  );
}

export default {
  path: (id) => `/api/reference/items/${encodeURIComponent(id)}`,
  Block,
} satisfies ItemPart;
