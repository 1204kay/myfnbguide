// One 十一说 (backend/issues.ts), in the story page's frame (web/case.tsx, after AIHOT routes/item.tsx; the owner 10/16:
// modules keep the original's frame): 返回 and the day in the left rail, 分享 in the right one; the label over the title,
// the three sentences the daily leads with, then the issue as it is read out (the program's greeting, the news, the
// turn to the one told in depth, the goodbye) under 正文, each 〔n〕 going to its original under 原文出处, and what
// 十一 is. Only the frame's parts already on the story page are used (myfnb/DIFFERENCES.md).
import { Fragment } from "react";
import { Link, useLoaderData, useNavigate, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { BarButton, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { IconArrowLeft, IconArrowRight, IconCopy, IconMenu, IconShare } from "@aihot/web/components/icons";
import { Menu, MenuItem } from "@aihot/web/components/ui/Menu";
import { ArticleLayout, MoreLink, RailSection } from "@aihot/web/components/ui/Page";
import { monthDay } from "@aihot/contracts/time";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { articleLd, breadcrumbLd, pageMeta, siteUrl, titled } from "@aihot/web/lib/seo";
import { SITE } from "@aihot/site";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { IssuePage } from "../types.ts";
import { BODY_LABEL, CitedText, useShare } from "./ui";
import { ListenButton, PlayerBar, useListen } from "./listen";

// Under 日报 like its list (issues.tsx) and the daily it leads; a page reached from several tabs keeps the reader's.
export const handle: Screen = { home: "daily" };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<IssuePage>(`/api/reference/issues/${encodeURIComponent(params.no!)}`, { signal: request.signal });
}

const kicker = (p: IssuePage) => `十一说 · 第 ${p.no} 期`;

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("该期不存在") }, { name: "robots", content: "noindex" }];
  const path = `/reference/issues/${data.no}`;
  const title = `${kicker(data)}：${data.issue.title}`;
  const description = data.issue.brief.join("");
  // As the engine's item page describes itself (routes/item.tsx articleLd, breadcrumbLd); the site, not a person, is its author.
  return pageMeta({
    title, description, path, type: "article",
    jsonLd: [
      articleLd({ path, headline: title, description, publishedAt: data.date }),
      breadcrumbLd([{ name: SITE.name, path: "/" }, { name: "日报", path: data.daily ? `/daily/${data.date}` : "/daily" }, { name: title, path }]),
    ],
  });
}

/** 2026-10-23 → 10月23日, as the engine writes a day (monthDay). */
const day = (date: string) => monthDay(date);

/** A paragraph with its 〔n〕 marks as links to the originals below. */
const Cited = ({ text }: { text: string }) => <CitedText text={text} href={(n) => `#src-${n}`} />;

/** Paragraphs as 十一 wrote them, a blank line apart; the engine's .prose spaces them. */
function Paragraphs({ text }: { text: string }) {
  return <>{text.split(/\n+/u).filter((p) => p.trim()).map((p, i) => <p key={i}><Cited text={p.trim()} /></p>)}</>;
}

export default function IssueRoute() {
  const p = useLoaderData<typeof loader>();
  const { issue, lines } = p;
  const navigate = useNavigate();
  const { share, copy, toast } = useShare();
  const listen = useListen();
  const audio = p.audio;
  const path = `/reference/issues/${p.no}`;
  const title = `${kicker(p)}：${issue.title}`;
  const onShare = () => void share(title, path);
  const onCopy = () => void copy(`${siteUrl()}${path}`);
  // Before its daily is out (it goes up at 08:00, the issue a few hours earlier) 返回 goes to the latest daily.
  const up = { to: p.daily ? `/daily/${p.date}` : "/daily", label: "日报" };
  const back = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(up.to);
  };
  const backButton = (
    <button type="button" onClick={back} className="-ml-1.5 inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-full px-1.5 text-[13px] text-ink-3 transition-colors hover:text-ink touch:h-11">
      <IconArrowLeft size={16} /> 返回
    </button>
  );
  const shareButton = (className: string) => (
    <button
      type="button"
      onClick={onShare}
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-ink-4 hover:text-ink ${className}`}
    >
      分享 <IconShare size={13} />
    </button>
  );
  const moreMenu = (
    <Menu label="更多操作" trigger={<IconMenu size={17} />}>
      {(close) => <MenuItem icon={<IconCopy size={15} />} onSelect={() => { close(); onCopy(); }}>复制链接</MenuItem>}
    </Menu>
  );
  const actions = (
    <>
      {audio && !listen.open && <div className="mb-2"><ListenButton seconds={audio.seconds} onClick={listen.start} /></div>}
      <div className="flex items-center gap-1">
        {shareButton("flex-1 touch:h-11")}
        {moreMenu}
      </div>
    </>
  );
  const facts = (
    <RailSection title="本期信息">
      <div className="text-[14px] leading-snug text-ink-2">{day(p.date)} 日报的头条</div>
      <div className="mt-1 text-[12.5px] leading-relaxed text-ink-3">依据当天收录的 {p.count} 条资料撰写，引用原文 {p.sources.length} 篇</div>
      {p.daily && <div className="mt-3"><MoreLink to={up.to}>查看当日日报</MoreLink></div>}
    </RailSection>
  );
  const neighbours = (
    <RailSection title="往期">
      {p.prev && <Link viewTransition to={`/reference/issues/${p.prev}`} className="flex min-h-9 items-center text-[13px] text-ink-2 hover:text-accent">第 {p.prev} 期</Link>}
      {p.next && <Link viewTransition to={`/reference/issues/${p.next}`} className="flex min-h-9 items-center text-[13px] text-ink-2 hover:text-accent">第 {p.next} 期</Link>}
      {!p.prev && !p.next && <div className="text-[13px] text-ink-4">这是第一期</div>}
      <div className="mt-3"><MoreLink to="/reference/issues">全部往期</MoreLink></div>
    </RailSection>
  );
  return (
    <div className="mx-auto max-w-[var(--page-max-reading)] pb-8">
      <PhoneBar
        back={up}
        title={kicker(p)}
        actions={
          <>
            {audio && !listen.open && <ListenButton compact seconds={audio.seconds} onClick={listen.start} />}
            <BarButton label="分享" onClick={onShare}>
              <IconShare size={20} />
            </BarButton>
          </>
        }
      />
      <ArticleLayout left={<>{backButton}{facts}</>} right={<>{actions}{neighbours}</>}>
        {/* Between lg and 2xl the left rail is hidden and 返回 stays at the top; below side the right rail is hidden too,
            and its actions join 返回, as on the engine's item page (routes/item.tsx). */}
        <div className="sticky top-0 z-20 -mx-2 hidden items-center justify-between gap-3 bg-bg/95 px-2 py-1.5 backdrop-blur lg:flex 2xl:hidden">
          {backButton}
          <div className="flex items-center gap-1 side:hidden">
            {audio && !listen.open && <ListenButton compact seconds={audio.seconds} onClick={listen.start} />}
            {shareButton("touch:h-11")}
            {moreMenu}
          </div>
        </div>
        <article className="pb-6 pt-3 lg:pt-2 2xl:pt-1">
          {/* As the item page's first line, under its title from 2xl where the left rail has the day. */}
          <div className="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-ink-3 2xl:hidden">
            <span className="font-semibold text-ink-2">{kicker(p)}</span>
            <span>·</span>
            <time dateTime={p.date}>{day(p.date)}</time>
          </div>
          <h1 data-page-title="" className="text-[26px] font-bold leading-[1.38] tracking-[-0.01em] text-ink lg:text-[32px] lg:leading-[1.34] xl:text-[36px] xl:leading-[1.3]">{issue.title}</h1>

          <section className="mt-7 xl:mt-8">
            <div className="mb-2 text-[12px] font-semibold text-accent">本期要点</div>
            <p className="text-[18px] leading-[1.7] text-ink xl:text-[20px] xl:leading-[1.7]"><Cited text={issue.brief.join("")} /></p>
          </section>

          {/* The body as the item page sets its 正文 (the engine's .prose): paragraphs, and the news' heads as its h2. */}
          <section className="mt-9 border-t border-line pt-4 xl:mt-10">
            <div className={BODY_LABEL}>正文 · 由 AI 十一根据当天收录的资料撰写</div>
            <div className="prose">
              <p>{lines.open}</p>
              <Paragraphs text={issue.preview} />
              {issue.news.map((x, i) => (
                <Fragment key={i}>
                  <h2>{x.head}</h2>
                  <Paragraphs text={x.text} />
                </Fragment>
              ))}
              {issue.deep && (
                <>
                  <p>{lines.turn}</p>
                  <h2>{issue.title}</h2>
                  <Paragraphs text={issue.deep} />
                </>
              )}
              {issue.close && <Paragraphs text={issue.close} />}
              <p>{lines.end}</p>
            </div>
          </section>

          {/* As the item page lists 相关事件 (routes/item.tsx): a small heading, rows between hairlines; each keeps its number, which 〔n〕 in the text goes to. */}
          {p.sources.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 text-[14px] font-semibold text-ink">原文出处</h2>
              <ol className="divide-y divide-line-soft">
                {p.sources.map((s) => (
                  <li key={s.n} id={`src-${s.n}`} className="scroll-mt-[calc(var(--bar-h)+1rem)]">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex gap-2 py-2.5 text-[14px] text-ink-2 [overflow-wrap:anywhere] hover:text-accent">
                      <span className="num w-5 shrink-0 text-right text-ink-4">{s.n}</span>
                      <span className="min-w-0">{s.sourceName}：《{s.title}》</span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* As the item page's 来源 line at the foot of the text. */}
          <p className="mt-8 text-[13px] text-ink-4">
            关于十一：十一是 AI。它阅读当天收录的全部资料，选出要紧的几件介绍给读者；所述事实以文中引用的原文为准，算账用的例子都注明是假设。
          </p>

          {/* Up to side the right rail with 往期 is hidden, so the way to the other issues stays under the text there too. */}
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[13px] side:hidden">
            {p.prev && <Link viewTransition to={`/reference/issues/${p.prev}`} className="inline-flex min-h-11 items-center gap-1 text-ink-3 hover:text-accent"><IconArrowLeft size={13} /> 第 {p.prev} 期</Link>}
            {p.next && <Link viewTransition to={`/reference/issues/${p.next}`} className="inline-flex min-h-11 items-center gap-1 text-ink-3 hover:text-accent">第 {p.next} 期 <IconArrowRight size={13} /></Link>}
            <span className="inline-flex min-h-11 items-center"><MoreLink to="/reference/issues">全部往期</MoreLink></span>
          </div>
        </article>
      </ArticleLayout>
      {audio && listen.open && <PlayerBar url={audio.url} seconds={audio.seconds} title={kicker(p)} transcript={audio.transcript} starts={audio.starts} pauses={audio.pauses} onClose={listen.close} />}
      {toast}
    </div>
  );
}
