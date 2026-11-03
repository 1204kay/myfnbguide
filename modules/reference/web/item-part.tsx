// The item page's block under its three parts (title, 导读, 原文要点): the way to the situation of the library the item
// is placed in. Nothing for other items. The stories and the write-ups of other items are no longer drawn here (十一
// 10-24: every item page has the same three parts; Kay「只保留一种」).
import type { ItemPart } from "@aihot/web/modules";
import { fullCountText } from "../format.ts";
import type { ItemText } from "../types.ts";
import { WhereFiled } from "./ui";

function Block({ data }: { id: string; data: unknown }) {
  const text = data as ItemText | null;
  if (!text) return null;
  return <WhereFiled to={`/reference/${text.situation.slug}`} title={text.situation.title} count={fullCountText(text.situation.count)} />;
}

export default {
  path: (id) => `/api/reference/items/${encodeURIComponent(id)}`,
  Block,
} satisfies ItemPart;
