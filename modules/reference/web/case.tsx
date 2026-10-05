// One story (layout B3, J6), with the item page's actions and names: where it comes from, the item's AI 导读 and
// 收录理由 in one small block, then the story the AI wrote from the original, the original itself, and the way to
// its situation.
import { Link, useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { ITEM_COPY, SITE } from "@aihot/site";
import { PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { IconBookmark, IconChevronLeft, IconShare } from "@aihot/web/components/icons";
import { useStar } from "@aihot/web/features/feed/parts";
import { ReaderToolbar } from "@aihot/web/features/item/ReaderTools";
import { ArticleLayout, RailSection } from "@aihot/web/components/ui/Page";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import { fullCountText } from "../format.ts";
import type { CasePage } from "../types.ts";
import { BODY, MEASURE, ROW_BUTTON, StoryBlock, Title, useShare } from "./ui";

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
  // Phones: the bar's back, up to its situation when opened directly. Desktops: one line up to the situation, its
  // full name, in place of a back line and a label over the title that both led there (layout J6).
  const back = situation ? { to: `/reference/${situation.slug}`, label: situation.title } : { to: "/", label: "参考" };
  const from = source.kind ? `${source.kind}「${source.name}」` : source.name;
  const original = (
    <a href={source.url} target="_blank" rel="noopener" className="-my-3 inline-flex min-h-11 min-w-11 items-center justify-center font-semibold text-accent hover:text-accent-ink">原文 ↗</a>
  );
  // Rails, as the item page has them: where the story comes from on the left (wide screens), what to do with it and
  // where it sits in the library on the right.
  const facts = (
    <>
      <RailSection title="来源">
        <div className="text-[14px] font-semibold leading-snug text-ink">{source.name}</div>
        {source.kind && <div className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{source.kind}</div>}
        <div className="mt-3 text-[12px] text-ink-4">原文{source.language ? ` · ${source.language}` : ""}{source.audioOnly ? " · 节目是音频" : ""}</div>
        <div className="mt-0.5 text-[12.5px] text-ink-2">{source.month}</div>
      </RailSection>
      <RailSection title="店家">
        <div className="text-[14px] leading-snug text-ink-2">{[story.shop.country, story.shop.city, story.shop.label || story.shop.name].filter(Boolean).join(" · ")}</div>
        {c.shop && (
          <Link viewTransition to={`/reference/shops/${c.shop.key}`} className="mt-1 flex min-h-9 items-center text-[13px] text-accent hover:text-accent-ink">
            同一家店另有 {c.shop.others} 条原文 ›
          </Link>
        )}
      </RailSection>
    </>
  );
  const notes = (
    <>
      <div className="grid gap-2">
        <a href={source.url} target="_blank" rel="noopener" className="flex h-10 items-center justify-center gap-1 rounded-full border border-line-strong bg-surface text-[14px] font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent">
          打开原文 ↗
        </a>
        <div className="flex gap-2">
          <button type="button" onClick={star.toggle} aria-pressed={star.on} className={`${ROW_BUTTON} flex-1 justify-center ${star.on ? "border-accent text-accent" : ""}`}>
            <IconBookmark size={16} filled={star.on} />{star.on ? "已收藏" : "收藏"}
          </button>
          <button type="button" onClick={onShare} className={`${ROW_BUTTON} flex-1 justify-center`}><IconShare size={16} />分享</button>
        </div>
      </div>
      <RailSection title={`收在 ${SITE.name} 参考`}>
        {situation ? (
          <Link viewTransition to={`/reference/${situation.slug}${situation.practice ? `#${situation.practice}` : ""}`} className="block text-[14px] leading-snug text-ink-2 hover:text-accent">
            <b className="font-[650] text-ink">{situation.title}</b>
            <span className="mt-1 block text-[13px] text-accent">
              {fullCountText(situation.count)} ›
            </span>
          </Link>
        ) : (
          <Link viewTransition to="/" className="block text-[13px] text-accent hover:text-accent-ink">按遇到的事，查各地店家的做法和经验 ›</Link>
        )}
      </RailSection>
    </>
  );
  return (
    <div className="pb-14">
    <ArticleLayout left={facts} right={notes}>
      <PhoneBar back={back} title={story.title} />
      <Link viewTransition to={back.to} className="-ml-1 hidden min-h-10 items-center gap-0.5 pr-1.5 text-[13px] text-ink-3 transition-colors hover:text-accent touch:min-h-11 lg:inline-flex">
        <IconChevronLeft size={16} />{back.label}
      </Link>
      <Title>{story.title}</Title>
      <p className={`mt-3 text-[13px] leading-[1.5] text-ink-4 ${MEASURE}`}>{[story.shop.country, story.shop.city, from, source.month].filter(Boolean).join(" · ")}</p>
      {/* Right after the source line, small and in the site's quiet panel for notes (app.css well), so the story's
          own opening shows on a phone's first screen (layout J6); the desktop's buttons follow, as on the item page. */}
      {(item.summary || item.reason) && (
        <section className="well mt-5 rounded-panel px-4 py-3.5 text-[15px] leading-[1.75] text-ink-2 [text-wrap:pretty] sm:px-5">
          {item.summary && (
            <>
              <div className="text-[12px] font-semibold text-accent">AI 导读</div>
              <p className="mt-1">{item.summary}</p>
            </>
          )}
          {item.reason && (
            <>
              <div className={`text-[12px] font-semibold text-ink-3 ${item.summary ? "mt-3" : ""}`}>{ITEM_COPY.reasonLabel}</div>
              <p className="mt-1">{item.reason}</p>
            </>
          )}
        </section>
      )}
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-3 text-[12px] text-ink-3">
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
      {/* Desktops have it in the right rail. */}
      <div className="card mt-8 px-4 py-3.5 sm:px-5 lg:hidden">
        <p className="text-[13px] text-ink-4">收在 {SITE.name} 参考{situation ? ` · ${situation.title}` : ""}</p>
        {situation ? (
          <Link viewTransition to={`/reference/${situation.slug}${situation.practice ? `#${situation.practice}` : ""}`} className="flex min-h-11 items-center text-[15px] font-[650] text-accent hover:text-accent-ink">
            这种情况：{fullCountText(situation.count)} ›
          </Link>
        ) : (
          <Link viewTransition to="/" className="flex min-h-11 items-center text-[15px] font-[650] text-accent hover:text-accent-ink">
            按遇到的事，查各地店家的做法和经验{c.situations ? `：${c.situations} 种情况` : ""} ›
          </Link>
        )}
      </div>
      <ReaderToolbar item={item} originalUrl={source.url} originalLabel="原文" onShare={onShare} />
      {toast}
    </ArticleLayout>
    </div>
  );
}
