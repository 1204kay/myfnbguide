// One report in a feed. Desktop (≥ 961px): a white card beside the time rail. Phones: a compact row with
// the time in the source line, the bookmark at hand, the reason in one line and duplicate reports
// behind one button that opens a sheet. One markup, two presentations. A site with list cards (site.ts
// FEED.style "cards") gets the same card on both instead: no time, category, tags or score.
import { memo } from "react";
import { Link } from "react-router";
import { IntentLink } from "../../components/ui/IntentLink";
import type { GroupInfo, FeedItemSummary, TimelineFilters } from "@aihot/contracts/site";
import { CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import { FEED, ITEM_COPY } from "@aihot/site";
import { SameEventBadge, SelectedBadge } from "../../components/ui/Badge";
import { ScoreLabel } from "../../components/ui/Score";
import { beijingDate, beijingTime } from "@aihot/contracts/time";
import { monthDay } from "../../lib/format";
import { LIST_CARD, MediaThumbs, SourceLine, StarButton } from "./parts";
import { GroupButton, GroupSources } from "./ReadingGroup";
import { QuotedLine } from "../item/QuotedPost";
import { rememberPreview } from "../item/preview";

export interface FeedItemProps {
  item: FeedItemSummary;
  group?: GroupInfo | null;
  filters?: TimelineFilters;
  read?: boolean;
  onOpen?: (id: string) => void;
  /** Show category and tags under the text (全部动态, topics, search). */
  showTags?: boolean;
  /** The time the item sits at in its list; phones show it in the source line (desktop: on the rail). List cards show its date there. */
  at?: string;
  /** The list also holds items that were not selected (全部, search, tags): list cards mark the selected ones 精选, on phones too. */
  marked?: boolean;
}

export const FeedItem = memo(function FeedItem(props: FeedItemProps) {
  return FEED.style === "cards" ? <ListCard {...props} /> : <TimelineItem {...props} />;
});

/** The item's title (or an X post's text) as the link that covers the card; opening it hands the item to the article as its preview. */
function ItemText({ item, read, onOpen, className }: Pick<FeedItemProps, "item" | "read" | "onOpen"> & { className: string }) {
  const isX = item.channel === "x" && !!item.x;
  const open = () => {
    rememberPreview(item);
    onOpen?.(item.id);
  };
  const Tag = isX ? "p" : "h3";
  return (
    <Tag className={`${className} ${read ? "text-ink-4" : "text-ink"}`}>
      <IntentLink viewTransition to={`/items/${item.id}`} onClick={open} className="after:absolute after:inset-0 after:content-['']">
        {isX ? (item.summary ?? item.title) : item.title}
      </IntentLink>
    </Tag>
  );
}

/** "同一新闻，精选展示《…》": a selected report whose seat is held by another one. */
function SameEventLine({ item }: { item: FeedItemSummary }) {
  if (!item.sameEvent) return null;
  return (
    <p className="relative z-10 mt-2 line-clamp-1 text-[12.5px] text-ink-4">
      同一新闻，精选展示
      <Link viewTransition to={`/items/${item.sameEvent.id}`} className="text-ink-3 transition-colors hover:text-accent">
        《{item.sameEvent.title}》
      </Link>
    </p>
  );
}

/**
 * The list card: the source with the list's date where it has no date headings (`at`) and 精选 where it mixes
 * (`marked`), the bookmark at the end; the title, three lines of summary, then under a hairline two lines of the
 * reason and the other reports of the same news.
 */
function ListCard({ item, group, filters, read = false, onOpen, at, marked = false }: FeedItemProps) {
  const isX = item.channel === "x" && !!item.x;
  const showSources = !!group && (group.additionalSourceCount > 0 || group.reportCount > 1);
  return (
    <article className={LIST_CARD} data-item-id={item.id}>
      <header className="flex min-h-6 items-center gap-1.5 text-[13px] leading-[18px] text-ink-4">
        <SourceLine item={item} className="text-ink-4" />
        {at && (
          <time dateTime={at} className="shrink-0 whitespace-nowrap">
            · {monthDay(beijingDate(at))}
          </time>
        )}
        {marked && item.selected && <span className="ml-1 inline-flex">{item.sameEvent ? <SameEventBadge /> : <SelectedBadge />}</span>}
        <span className="-my-2.5 -mr-3 ml-auto inline-flex shrink-0 pl-1">
          <StarButton item={item} className="size-11" />
        </span>
      </header>

      {isX ? (
        <ItemText item={item} read={read} onOpen={onOpen} className="mt-1.5 whitespace-pre-line text-[15px] leading-[1.75] line-clamp-5" />
      ) : (
        <>
          <ItemText item={item} read={read} onOpen={onOpen} className="mt-1.5 text-[16px] font-[650] leading-[1.5] lg:text-[17px]" />
          {item.summary && <p className="mt-1 line-clamp-3 text-[14.5px] leading-[1.7] text-ink-3 lg:text-[15px]">{item.summary}</p>}
        </>
      )}

      {isX && item.x!.media.length > 0 && <MediaThumbs media={item.x!.media} className="mt-2.5" />}
      {isX && item.x!.quoted?.text && <QuotedLine quoted={item.x!.quoted} />}
      <SameEventLine item={item} />

      {item.reason && (
        <p className="mt-3 line-clamp-2 border-t border-line-soft pt-2.5 text-[13px] leading-[1.6] text-note">{`${ITEM_COPY.reasonLabel}：`}{item.reason}</p>
      )}
      {group && showSources && (
        <>
          <div className="mt-2 hidden lg:block">
            <GroupSources group={group} filters={filters} parentId={item.id} />
          </div>
          <GroupButton group={group} filters={filters} parentId={item.id} />
        </>
      )}
    </article>
  );
}

function TimelineItem({ item, group, filters, read = false, onOpen, showTags = false, at }: FeedItemProps) {
  const isX = item.channel === "x" && !!item.x;
  const showSources = !!group && (group.additionalSourceCount > 0 || group.reportCount > 1);
  const tags = showTags ? item.tags.slice(0, 3) : [];

  return (
    <article className="relative min-w-0 lg:card lg:card-hover lg:px-[18px] lg:pb-[14px] lg:pt-[15px]" data-item-id={item.id}>
      <header className="flex min-h-[22px] items-center gap-1.5 text-[12.5px] leading-[18px] text-ink-4 lg:min-h-[18px] lg:gap-2">
        <SourceLine item={item} className="text-ink-4" />
        {at && (
          <time dateTime={at} className="mono shrink-0 text-[12px] lg:hidden">
            · {beijingTime(at)}
          </time>
        )}
        {item.selected && (
          <span className="hidden lg:inline-flex">
            {item.sameEvent ? <SameEventBadge /> : <SelectedBadge />}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1 pl-2 lg:gap-1.5">
          <span className="hidden lg:inline-flex">
            <ScoreLabel score={item.score} />
          </span>
          <span className="lg:hidden">
            <ScoreLabel score={item.score} compact />
          </span>
          <span className="-my-[11px] -mr-3 inline-flex lg:-my-1 lg:mr-0">
            <StarButton item={item} className="size-11 lg:size-[26px]" />
          </span>
        </span>
      </header>

      {isX ? (
        <ItemText item={item} read={read} onOpen={onOpen} className="mt-1.5 whitespace-pre-line text-[15px] leading-[1.75] line-clamp-5 lg:mt-2 lg:line-clamp-4" />
      ) : (
        <>
          <ItemText item={item} read={read} onOpen={onOpen} className="mt-1.5 line-clamp-2 text-[17px] font-[650] leading-[1.5] lg:mt-2 lg:line-clamp-none lg:leading-[1.55]" />
          {item.summary && <p className="mt-1 line-clamp-2 text-[14.5px] leading-[1.7] text-ink-3 lg:mt-2 lg:line-clamp-3 lg:text-[15px] lg:leading-[1.75]">{item.summary}</p>}
        </>
      )}

      {isX && item.x!.media.length > 0 && <MediaThumbs media={item.x!.media} className="mt-2.5" />}
      {isX && item.x!.quoted?.text && <QuotedLine quoted={item.x!.quoted} />}

      {(tags.length > 0 || (showTags && item.category)) && (
        <div className="relative z-10 mt-2 hidden flex-wrap gap-x-2.5 gap-y-1 text-[12px] text-ink-4 lg:flex">
          {showTags && item.category && (
            <Link to={`/all?category=${item.category}`} className="hover:text-accent">
              {CATEGORY_LABELS[item.category]}
            </Link>
          )}
          {tags.map((t) => (
            <Link key={t} to={`/all?tag=${encodeURIComponent(t)}`} className="hover:text-accent">
              #{t}
            </Link>
          ))}
        </div>
      )}

      <SameEventLine item={item} />
      {group && showSources && (
        <div className="mt-2 hidden lg:block">
          <GroupSources group={group} filters={filters} parentId={item.id} />
        </div>
      )}

      {item.reason && (
        <div className="mt-1 lg:mt-3 lg:border-t lg:border-line-soft lg:pt-3">
          <p className="line-clamp-1 text-[13px] leading-[1.65] text-note lg:line-clamp-none lg:leading-[1.75]">{`${ITEM_COPY.reasonLabel}：`}{item.reason}</p>
        </div>
      )}

      {/* Phones: duplicate reports open in a sheet. */}
      {group && showSources && <GroupButton group={group} filters={filters} parentId={item.id} />}
    </article>
  );
}
