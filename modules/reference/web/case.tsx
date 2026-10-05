// One story (layout B3), with the item page's actions and names: where it comes from, the item's AI 导读 and
// 收录理由, then the story the AI wrote from the original, the original itself, and the way to its situation.
import { Link, useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { ITEM_COPY, SITE } from "@aihot/site";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { BackRow, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { IconBookmark, IconShare } from "@aihot/web/components/icons";
import { useStar } from "@aihot/web/features/feed/parts";
import { ReaderToolbar } from "@aihot/web/features/item/ReaderTools";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { CasePage } from "../types.ts";
import { BODY, KICKER_LINK, MEASURE, Page, ROW_BUTTON, StoryBlock, Title, useShare } from "./ui";

export const handle: Screen = { home: "reference", toolbar: true };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<CasePage>(`/api/reference/cases/${encodeURIComponent(params.id!)}`, { signal: request.signal });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这一篇") }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: data.story.title, description: data.item.summary ?? data.story.lead, path: `/reference/cases/${data.id}`, type: "article" });
}

export default function CaseRoute() {
  const c = useLoaderData<typeof loader>();
  const { story, source, item, situation } = c;
  const star = useStar(item);
  const { share, toast } = useShare();
  const onShare = () => void share(story.title, `/reference/cases/${c.id}`);
  // Opened directly, back leads up to its situation.
  const back = situation ? { to: `/reference/${situation.slug}`, label: situation.title } : { to: "/", label: "参考" };
  const from = source.kind ? `${source.kind}「${source.name}」` : source.name;
  const original = (
    <a href={source.url} target="_blank" rel="noopener" className="-my-3 inline-flex min-h-11 min-w-11 items-center justify-center font-semibold text-accent hover:text-accent-ink">原文 ↗</a>
  );
  return (
    <Page>
      <PhoneBar back={back} title={story.title} />
      <BackRow {...back} />
      {situation && <Link viewTransition to={`/reference/${situation.slug}`} className={KICKER_LINK}><Kicker>{situation.title}</Kicker></Link>}
      <Title>{story.title}</Title>
      <p className={`mt-3 text-[13px] leading-[1.5] text-ink-4 ${MEASURE}`}>{[story.shop.country, story.shop.city, from, source.month].filter(Boolean).join(" · ")}</p>
      <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
        <button type="button" onClick={star.toggle} aria-pressed={star.on} className={`${ROW_BUTTON} ${star.on ? "border-accent text-accent" : ""}`}>
          <IconBookmark size={16} filled={star.on} />{star.on ? "已收藏" : "收藏"}
        </button>
        <button type="button" onClick={onShare} className={ROW_BUTTON}><IconShare size={16} />分享</button>
        <a href={source.url} target="_blank" rel="noopener" className={ROW_BUTTON}>打开原文 ↗</a>
      </div>
      {item.summary && (
        <section className="mt-7">
          <div className="mb-2 text-[12px] font-semibold text-accent">AI 导读</div>
          <p className="text-[18px] leading-[1.7] text-ink xl:text-[20px]">{item.summary}</p>
        </section>
      )}
      {item.reason && (
        <section className="mt-6 border-t border-line pt-4">
          <div className="mb-1 text-[12px] font-semibold text-ink-3">{ITEM_COPY.reasonLabel}</div>
          <p className={`text-[15px] leading-[1.75] text-ink-2 ${MEASURE}`}>{item.reason}</p>
        </section>
      )}
      <div className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-3 text-[12px] text-ink-3">
        <span>正文 · AI 整理自原文</span>
        {original}
      </div>
      <p className={`mt-3 ${BODY}`}>{story.lead}</p>
      <p className={`mt-3 ${BODY}`}>{story.who}</p>
      {c.shop && (
        <Link viewTransition to={`/reference/shops/${c.shop.key}`} className="flex min-h-11 items-center text-[14px] text-accent hover:text-accent-ink">
          同一家店另有 {c.shop.others} 条原文 ›
        </Link>
      )}
      {story.parts.map((part, i) => (
        <section key={i} className="mt-8">
          <h2 className="text-[18px] font-bold leading-[1.45] text-ink lg:text-[19px]">{part.heading}</h2>
          {part.blocks.map((block, n) => <StoryBlock key={n} block={block} />)}
        </section>
      ))}
      {story.open && <p className={`mt-6 text-[14px] leading-relaxed text-ink-4 ${MEASURE}`}>{story.open}</p>}
      <div className="mt-10 border-t border-line pt-4">
        <p className="text-[13px] text-ink-4">原文{source.language ? ` · ${source.language}` : ""}{source.audioOnly ? " · 节目是音频" : ""}</p>
        <a href={source.url} target="_blank" rel="noopener" className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-line-strong bg-surface text-[15px] font-semibold text-accent transition-colors hover:border-accent">
          打开原文 ↗
        </a>
      </div>
      <div className="card mt-8 px-4 py-3.5 sm:px-5">
        <p className="text-[13px] text-ink-4">收在 {SITE.name} 参考{situation ? ` · ${situation.title}` : ""}</p>
        {situation ? (
          <Link viewTransition to={`/reference/${situation.slug}${situation.practice ? `#${situation.practice}` : ""}`} className="flex min-h-11 items-center text-[15px] font-[650] text-accent hover:text-accent-ink">
            这种情况下各地店家的 {situation.count.practices === null ? `${situation.count.cases} 条原文` : `${situation.count.practices} 种做法`} ›
          </Link>
        ) : (
          <Link viewTransition to="/" className="flex min-h-11 items-center text-[15px] font-[650] text-accent hover:text-accent-ink">
            按遇到的事，查各地店家的做法和经验{c.situations ? `：${c.situations} 种情况` : ""} ›
          </Link>
        )}
      </div>
      <ReaderToolbar item={item} originalUrl={source.url} originalLabel="原文" onShare={onShare} />
      {toast}
    </Page>
  );
}
