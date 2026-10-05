// The item page's block for an item written as a story (layout B7 收在参考): the story's title and its
// situation with its shops (layout J3-5), the whole block leading to the story; nothing for an item that is no story.
import { Link } from "react-router";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import type { ItemPart } from "@aihot/web/modules";
import type { ItemStory } from "../types.ts";
import { listCountText } from "../format.ts";

function Block({ data }: { id: string; data: unknown }) {
  const story = data as ItemStory | null;
  if (!story) return null;
  return (
    <Link viewTransition to={`/reference/cases/${story.id}`} className="card mt-6 block px-4 py-3.5 transition-colors hover:border-accent touch:active:bg-bg-sunk sm:px-5">
      <Kicker>收在参考</Kicker>
      <b className="mt-2 block text-[16px] font-[650] leading-[1.5] text-ink sm:text-[17px]">{story.title}</b>
      {story.situation && <span className="mt-1 block text-[13px] leading-[1.5] text-ink-4">{story.situation.title} · {listCountText(story.situation.count)}</span>}
    </Link>
  );
}

export default {
  path: (id) => `/api/reference/by-item/${encodeURIComponent(id)}`,
  Block,
} satisfies ItemPart;
