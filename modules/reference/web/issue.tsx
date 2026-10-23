// One 十一说 (backend/issues.ts), in the story page's frame (web/case.tsx, after AIHOT routes/item.tsx; the owner 10/16:
// modules keep the original's frame): 返回 and the day in the left rail, 分享 in the right one; the label over the title,
// the three sentences the daily leads with, then the issue as it is read out (the program's greeting, the news, the
// turn to the one told in depth, the goodbye) under 正文, each 〔n〕 going to its original under 原文出处, and what
// 十一 is. Only the frame's parts already on the story page are used (myfnb/HANDOFF.md §3.0).
import { Fragment, type ReactNode } from "react";
import { Link, useLoaderData, useNavigate, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { BarButton, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { IconArrowLeft, IconArrowRight, IconCopy, IconMenu, IconShare } from "@aihot/web/components/icons";
import { Menu, MenuItem } from "@aihot/web/components/ui/Menu";
import { ArticleLayout, RailSection } from "@aihot/web/components/ui/Page";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, siteUrl, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { IssuePage } from "../types.ts";
import { BODY, BODY_LABEL, MEASURE, useShare } from "./ui";
import { ListenButton, PlayerBar, useListen } from "./listen";

export const handle: Screen = { home: "reference" };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<IssuePage>(`/api/reference/issues/${encodeURIComponent(params.no!)}`, { signal: request.signal });
}

const kicker = (p: IssuePage) => `十一说 · 第 ${p.no} 期`;

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这一期") }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: `${kicker(data)}：${data.issue.title}`, description: data.issue.brief.join(""), path: `/reference/issues/${data.no}`, type: "article" });
}

/** 2026-10-23 → 10 月 23 日 */
const day = (date: string) => `${Number(date.slice(5, 7))} 月 ${Number(date.slice(8, 10))} 日`;

/** A paragraph with its 〔n〕 marks as links to the originals below. */
function Cited({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/〔([\d、,，\s]+)〕/gu)) {
    parts.push(text.slice(last, m.index));
    const ns = m[1]!.split(/[、,，\s]+/u).filter(Boolean);
    parts.push(
      <sup key={m.index} className="ml-0.5 text-[11px] text-ink-4">
        {ns.map((n, i) => (
          <Fragment key={n}>
            {i > 0 && "、"}
            <a href={`#src-${n}`} className="hover:text-accent">{n}</a>
          </Fragment>
        ))}
      </sup>,
    );
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Paragraphs as 十一 wrote them, a blank line apart. */
function Paragraphs({ text, first = "mt-4" }: { text: string; first?: string }) {
  return (
    <>
      {text.split(/\n+/u).filter((p) => p.trim()).map((p, i) => (
        <p key={i} className={`${i ? "mt-4" : first} ${BODY}`}><Cited text={p.trim()} /></p>
      ))}
    </>
  );
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
  const up = { to: `/daily/${p.date}`, label: "日报" };
  const back = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(up.to);
  };
  const backButton = (
    <button type="button" onClick={back} className="-ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-full px-1.5 text-[13px] text-ink-3 transition-colors hover:text-ink">
      <IconArrowLeft size={16} /> 返回
    </button>
  );
  const actions = (
    <>
      {audio && !listen.open && <div className="mb-2"><ListenButton seconds={audio.seconds} onClick={listen.start} /></div>}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onShare}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-ink-4 hover:text-ink"
        >
          分享 <IconShare size={13} />
        </button>
        <Menu label="更多操作" trigger={<IconMenu size={17} />}>
          {(close) => <MenuItem icon={<IconCopy size={15} />} onSelect={() => { close(); onCopy(); }}>复制链接</MenuItem>}
        </Menu>
      </div>
    </>
  );
  const facts = (
    <RailSection title="这一期">
      <div className="text-[14px] leading-snug text-ink-2">{day(p.date)} 日报的头条</div>
      <div className="mt-1 text-[12.5px] leading-relaxed text-ink-3">读完当天收录的 {p.count} 条，点名 {p.sources.length} 篇</div>
      <Link viewTransition to={up.to} className="mt-2 flex min-h-9 items-center text-[13px] text-accent hover:text-accent-ink">看这一天的日报 ›</Link>
    </RailSection>
  );
  const neighbours = (
    <RailSection title="往期">
      {p.prev && <Link viewTransition to={`/reference/issues/${p.prev}`} className="flex min-h-9 items-center text-[13px] text-ink-2 hover:text-accent">第 {p.prev} 期</Link>}
      {p.next && <Link viewTransition to={`/reference/issues/${p.next}`} className="flex min-h-9 items-center text-[13px] text-ink-2 hover:text-accent">第 {p.next} 期</Link>}
      {!p.prev && !p.next && <div className="text-[13px] text-ink-4">这是第一期</div>}
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
        <div className="sticky top-0 z-20 -mx-2 hidden bg-bg/95 px-2 py-1.5 backdrop-blur lg:block 2xl:hidden">{backButton}</div>
        <article className="pb-6 pt-3 lg:pt-2 2xl:pt-1">
          <div className="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-ink-3">
            <span className="font-semibold text-accent">{kicker(p)}</span>
            <span>·</span>
            <span>{day(p.date)}</span>
          </div>
          <h1 data-page-title="" className="text-[26px] font-bold leading-[1.38] tracking-[-0.01em] text-ink lg:text-[32px] lg:leading-[1.34] xl:text-[36px] xl:leading-[1.3]">{issue.title}</h1>

          <section className="mt-7 xl:mt-8">
            <div className="mb-2 text-[12px] font-semibold text-accent">这期说什么</div>
            <p className="text-[18px] leading-[1.7] text-ink xl:text-[20px] xl:leading-[1.7]"><Cited text={issue.brief.join("")} /></p>
          </section>

          <section className="mt-9 border-t border-line pt-4 xl:mt-10">
            <div className={BODY_LABEL}>正文 · AI 十一读完当天的收录写的</div>
            <p className={BODY}>{lines.open}</p>
            <Paragraphs text={issue.preview} />
            {issue.news.map((x, i) => (
              <section key={i} className="mt-8">
                <h2 className="text-[18px] font-bold leading-[1.45] text-ink lg:text-[19px]">{x.head}</h2>
                <Paragraphs text={x.text} first="mt-3" />
              </section>
            ))}
            {issue.deep && (
              <section className="mt-10">
                <p className={BODY}>{lines.turn}</p>
                <h2 className="mt-6 text-[18px] font-bold leading-[1.45] text-ink lg:text-[19px]">{issue.title}</h2>
                <Paragraphs text={issue.deep} first="mt-3" />
              </section>
            )}
            {issue.close && <Paragraphs text={issue.close} first="mt-8" />}
            <p className={`mt-4 ${BODY}`}>{lines.end}</p>
          </section>

          {p.sources.length > 0 && (
            <section className="mt-10 border-t border-line pt-4">
              <h2 className="text-[15px] font-bold text-ink">原文出处</h2>
              <ol className="mt-3">
                {p.sources.map((s) => (
                  <li key={s.n} id={`src-${s.n}`} className="flex scroll-mt-[calc(var(--bar-h)+1rem)] gap-2 py-1.5 text-[13.5px] leading-[1.65]">
                    <span className="w-5 shrink-0 text-right text-ink-4">{s.n}</span>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 text-ink-2 [overflow-wrap:anywhere] hover:text-accent">
                      {s.sourceName}：《{s.title}》
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className={`mt-8 text-[13px] leading-relaxed text-ink-4 ${MEASURE}`}>
            关于十一：十一是 AI。它读完这一天收录的全部资料，挑要紧的讲给你听；讲到的事以点名的原文为准，算账时举的例子会说明是假设。
          </p>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[13px] lg:hidden">
            {p.prev && <Link viewTransition to={`/reference/issues/${p.prev}`} className="inline-flex min-h-11 items-center gap-1 text-ink-3 hover:text-accent"><IconArrowLeft size={13} /> 第 {p.prev} 期</Link>}
            {p.next && <Link viewTransition to={`/reference/issues/${p.next}`} className="inline-flex min-h-11 items-center gap-1 text-ink-3 hover:text-accent">第 {p.next} 期 <IconArrowRight size={13} /></Link>}
          </div>
        </article>
      </ArticleLayout>
      {audio && listen.open && <PlayerBar url={audio.url} seconds={audio.seconds} title={kicker(p)} onClose={listen.close} />}
      {toast}
    </div>
  );
}
