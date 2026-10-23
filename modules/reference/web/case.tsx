// One story, in the item page's frame (AIHOT routes/item.tsx; the owner 10/16: modules keep the original's frame too):
// 返回 and where it comes from in the left rail, 打开原文 / 收藏 / more and the 收录理由 in the right one; the source
// line over the title, the AI 导读 under it, then the story the AI wrote from the original under 正文 · AI 整理自原文,
// the 来源 line, and on phones the way to its situation and the reading toolbar.
import { useState } from "react";
import { Link, useLoaderData, useNavigate, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { ITEM_COPY, reasonLines, SITE } from "@aihot/site";
import { BarButton, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { IconArrowLeft, IconCopy, IconExternal, IconMenu, IconMore, IconShare } from "@aihot/web/components/icons";
import { StarButton } from "@aihot/web/features/feed/parts";
import { ActionsSheet, ReaderToolbar } from "@aihot/web/features/item/ReaderTools";
import { Menu, MenuItem } from "@aihot/web/components/ui/Menu";
import { ArticleLayout, RailSection } from "@aihot/web/components/ui/Page";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, siteUrl, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import { fullCountText, shareImagePath } from "../format.ts";
import type { CasePage } from "../types.ts";
import { BODY, BODY_LABEL, MEASURE, StoryBlock, useShare, WhereFiled } from "./ui";

export const handle: Screen = { home: "reference", toolbar: true };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  // A folded story goes to its item (backend/read.ts foldedStories), as a merged story does (AIHOT routes/story.tsx).
  return loadOr404<CasePage>(`/api/reference/cases/${encodeURIComponent(params.id!)}`, { signal: request.signal, merged: (id) => `/items/${id}` });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这一篇") }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: data.story.title, description: data.item.summary ?? data.story.lead, path: `/reference/cases/${data.id}`, type: "article", image: shareImagePath(data.id) });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function CaseRoute() {
  const c = useLoaderData<typeof loader>();
  const { story, source, item, situation } = c;
  const navigate = useNavigate();
  const [actionsOpen, setActionsOpen] = useState(false);
  const { share, copy, toast } = useShare();
  const path = `/reference/cases/${c.id}`;
  const onShare = () => void share(story.title, path);
  const onCopy = () => void copy(`${siteUrl()}${path}`);
  // Where 返回 goes when the story was opened directly: its situation, else the library.
  const up = situation ? { to: `/reference/${situation.slug}`, label: situation.title } : { to: "/reference", label: "参考" };
  const situationTo = situation ? `/reference/${situation.slug}${situation.practice ? `#${situation.practice}` : ""}` : "/reference";
  const back = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(up.to);
  };
  const backButton = (
    <button type="button" onClick={back} className="-ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-full px-1.5 text-[13px] text-ink-3 transition-colors hover:text-ink">
      <IconArrowLeft size={16} /> 返回
    </button>
  );
  const moreMenu = (
    <Menu label="更多操作" trigger={<IconMenu size={17} />}>
      {(close) => (
        <>
          <MenuItem icon={<IconShare size={15} />} onSelect={() => { close(); onShare(); }}>分享链接</MenuItem>
          <MenuItem icon={<IconCopy size={15} />} onSelect={() => { close(); onCopy(); }}>复制链接</MenuItem>
        </>
      )}
    </Menu>
  );
  // Desktop actions head the right rail, one row as tall as 返回 at the head of the left one.
  const actions = (
    <div className="flex items-center gap-1">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-ink-4 hover:text-ink"
      >
        打开原文 <IconExternal size={13} />
      </a>
      <StarButton item={item} size={32} />
      {moreMenu}
    </div>
  );
  const facts = (
    <>
      <RailSection title="来源">
        <div className="text-[14px] font-semibold leading-snug text-ink">{source.name}</div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{source.kind ?? hostOf(source.url)}</div>
        <div className="mt-3 text-[12px] text-ink-4">发布时间</div>
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
      {item.reason && (
        <RailSection title={ITEM_COPY.reasonLabel}>
          <ul className="space-y-1.5">{reasonLines(item.reason).map((l, i) => <li key={i} className="text-[13.5px] leading-[1.8] text-ink-2">{l}</li>)}</ul>
        </RailSection>
      )}
      <RailSection title={`收在 ${SITE.name} 参考`}>
        {situation ? (
          <Link viewTransition to={situationTo} className="block text-[14px] leading-snug text-ink-2 hover:text-accent">
            <b className="font-[650] text-ink">{situation.title}</b>
            <span className="mt-1 block text-[13px] text-accent">{fullCountText(situation.count)} ›</span>
          </Link>
        ) : (
          <Link viewTransition to="/reference" className="block text-[13px] text-accent hover:text-accent-ink">按遇到的事，查各地店家的做法和经验 ›</Link>
        )}
      </RailSection>
    </>
  );
  return (
    <div className="mx-auto max-w-[var(--page-max-reading)] pb-8">
      <PhoneBar
        back={up}
        title={story.title}
        actions={
          <BarButton label="更多操作" onClick={() => setActionsOpen(true)}>
            <IconMore size={22} />
          </BarButton>
        }
      />
      <ArticleLayout left={<>{backButton}{facts}</>} right={<>{actions}{notes}</>}>
        {/* Between lg and 2xl the left rail is hidden: 返回 stays at the top while reading, as on the item page. */}
        <div className="sticky top-0 z-20 -mx-2 hidden bg-bg/95 px-2 py-1.5 backdrop-blur lg:block 2xl:hidden">{backButton}</div>
        <article className="pb-6 pt-3 lg:pt-2 2xl:pt-1">
          <div className="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-ink-3 2xl:hidden">
            <span className="font-semibold text-ink-2">{source.name}</span>
            {source.kind && <span>· {source.kind}</span>}
            <span>·</span>
            <span>{source.month}</span>
          </div>
          <h1 data-page-title="" className="text-[26px] font-bold leading-[1.38] tracking-[-0.01em] text-ink lg:text-[32px] lg:leading-[1.34] xl:text-[36px] xl:leading-[1.3]">{story.title}</h1>

          {item.summary && (
            <section className="mt-7 xl:mt-8">
              <div className="mb-2 text-[12px] font-semibold text-accent">AI 导读</div>
              <p className="text-[18px] leading-[1.7] text-ink xl:text-[20px] xl:leading-[1.7]">{item.summary}</p>
            </section>
          )}

          {item.reason && (
            <section className="mt-6 border-t border-line pt-4 lg:hidden">
              <div className="mb-1 text-[12px] font-semibold text-ink-3">{ITEM_COPY.reasonLabel}</div>
              <ul className="space-y-1.5">{reasonLines(item.reason).map((l, i) => <li key={i} className="text-[15px] leading-[1.75] text-ink-2">{l}</li>)}</ul>
            </section>
          )}

          <section className="mt-9 border-t border-line pt-4 xl:mt-10">
            <div className={BODY_LABEL}>正文 · AI 整理自原文</div>
            <p className={BODY}>{story.lead}</p>
            <p className={`mt-3 ${BODY}`}>{story.who}</p>
            {/* Wide screens have it in the left rail. */}
            {c.shop && (
              <Link viewTransition to={`/reference/shops/${c.shop.key}`} className="flex min-h-11 items-center text-[14px] text-accent hover:text-accent-ink 2xl:hidden">
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
          </section>

          <p className="mt-8 text-[13px] text-ink-4">
            来源：
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-ink-3 hover:text-accent">{source.name}</a>
            <span> · {hostOf(source.url)}</span>
          </p>

          {/* Desktops have it in the right rail. */}
          <div className="lg:hidden">
            <WhereFiled to={situationTo} title={situation?.title ?? "按遇到的事，查各地店家的做法和经验"} count={situation ? fullCountText(situation.count) : c.situations ? `${c.situations} 种情况` : null} />
          </div>
        </article>
      </ArticleLayout>
      <ReaderToolbar item={item} originalUrl={source.url} originalLabel="原文" onShare={onShare} />
      <ActionsSheet open={actionsOpen} onClose={() => setActionsOpen(false)} rows={[{ key: "copy", label: "复制链接", icon: <IconCopy size={20} />, onSelect: onCopy }]} />
      {toast}
    </div>
  );
}
