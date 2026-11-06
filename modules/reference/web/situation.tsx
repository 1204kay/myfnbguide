// One situation (layout B2, J4): what it is and how many shops and 条原文 it has, its picture with the causes
// numbered, then its items by cause, newest first, and those in no cause under 其他做法 (backend/read.ts).
import { useState, type ReactNode } from "react";
import { useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { BarButton, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { AsideCard, ReadingLayout } from "@aihot/web/components/ui/Page";
import { IconChevronDown, IconCopy, IconMore, IconShare } from "@aihot/web/components/icons";
import { Collapse } from "@aihot/web/components/ui/Presence";
import { ActionsSheet } from "@aihot/web/features/item/ReaderTools";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { breadcrumbLd, itemListLd, pageMeta, siteUrl, titled } from "@aihot/web/lib/seo";
import { SITE } from "@aihot/site";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { SituationPage, TopicView } from "../types.ts";
import { SituationFigure } from "./figures";
import { day, num, tellers } from "../format.ts";
import { CitedText, FIRST, FoldToggle, Heading, PageHeader, ROW_BUTTON, StoryCards, useShare, BackLink } from "./ui";

export const handle: Screen = { tab: "reference" };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<SituationPage>(`/api/reference/situations/${encodeURIComponent(params.slug!)}`, { signal: request.signal });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("情况不存在") }, { name: "robots", content: "noindex" }];
  const path = `/reference/${data.slug}`;
  // Machine description as the engine's list pages give it (routes/all.tsx itemListLd, routes/topic.tsx breadcrumbLd).
  const titles = [...data.groups.flatMap((g) => g.cases), ...data.rest].map((c) => c.title);
  return pageMeta({
    title: data.title, description: data.dek, path,
    jsonLd: [
      itemListLd(path, `参考 · ${data.title}`, titles),
      breadcrumbLd([{ name: SITE.name, path: "/" }, { name: "参考", path: "/reference" }, { name: data.title, path }]),
    ],
  });
}

export default function SituationRoute() {
  const s = useLoaderData<typeof loader>();
  const { share, copy, toast } = useShare();
  const [actionsOpen, setActionsOpen] = useState(false);
  const path = `/reference/${s.slug}`;
  const onShare = () => void share(s.title, path);
  const split = s.groups.length > 0;
  const titles = s.causes.map((g) => g.title);
  // Desktops: the engine's reading template, the page and an aside of cards (as 更新日志 and 反馈 have it): what the
  // page counts, when it was updated and the share button.
  const aside = (
    <div className="hidden space-y-4 lg:block">
      <AsideCard title="这种情况">
        <div className="grid gap-1.5">
          {[...tellers(s.count), [s.count.cases, "条原文"] as [number, string]].map(([n, unit]) => (
            <div key={unit} className="text-[13px] text-ink-4"><b className="num mr-1 text-[22px] font-extrabold tracking-tight text-ink">{num(n)}</b>{unit}</div>
          ))}
        </div>
        {s.updatedAt && <p className="mt-3 border-t border-line-soft pt-3 text-[12.5px] text-ink-4"><span className="num">{day(s.updatedAt)}</span> 更新</p>}
        <button type="button" onClick={onShare} className={`${ROW_BUTTON} mt-3 w-full justify-center`}><IconShare size={16} />分享</button>
      </AsideCard>
    </div>
  );
  return (
    <ReadingLayout aside={aside}>
      {/* Phones: 分享 and 复制链接 behind the bar's ···, as the item page has its further actions; the tab bar stays. */}
      <PhoneBar
        back={{ to: "/reference", label: "参考" }}
        title={s.title}
        actions={
          <BarButton label="更多操作" onClick={() => setActionsOpen(true)}>
            <IconMore size={22} />
          </BarButton>
        }
      />
      {/* As the topic page: 返回 on desktops (分享 is in the aside's card), then the header; desktops have the counts
          and the date in the aside. */}
      <BackLink to="/reference" label="参考" />
      <PageHeader kicker={s.category.title} to={`/reference#${s.category.key}`} title={s.topic?.title ?? s.title} dek={s.dek}
        counts={[...tellers(s.count), [s.count.cases, "条原文"]]} updatedAt={s.updatedAt} asideFacts className="pb-2 pt-3 lg:pt-1" />
      {/* The page's title is the article's: the reader's question and the conclusion from the items (决定记录 L2575 第 4
          条; Kay 11-06 10:34「开店前的准备和开销 这句不用优化吗」); the situation's own title stays in the lists. */}
      {s.topic && <Overview topic={s.topic} />}
      <SituationFigure slug={s.slug} groups={titles}>
        {/* Split by cause, the sections below are the list (Kay 11-06 08:24: 1234 shown twice reads as two things). */}
        {s.causes.length > 1 && !split && (
          <ol className="mt-3">
            {s.causes.map((g, i) => {
              const body = (
                <>
                  <span className="num text-[17px] font-[650] leading-[1.5] text-accent">{i + 1}</span>
                  <span><b className="block text-[16px] font-[650] leading-snug text-ink">{g.title}</b><span className="text-[13px] text-ink-3">{g.line}</span></span>
                </>
              );
              // Not split by cause, the list only explains the picture: nothing to jump to.
              return (
                <li key={g.key} className="border-t border-line first:border-t-0">
                  <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 py-3">{body}</div>
                </li>
              );
            })}
          </ol>
        )}
      </SituationFigure>
      {split ? s.groups.map((g, i) => (
        <Section key={g.key} id={g.key} no={i + 1} title={g.title} count={g.cases.length} first={i === 0}>
          {/* No section picture for now: 6 of 20 checked against their stories were wrong (10-18); they come back one
              by one once each is checked (sections/, myfnb/figure-sheet still draws them all). */}
          <StoryCards cards={g.cases} first={FIRST} />
        </Section>
      )) : (
        <section className="mt-9">{s.rest.length > 0 && <StoryCards cards={s.rest} first={FIRST} />}</section>
      )}
      {split && s.rest.length > 0 && (
        <section className="mt-10">
          <Heading>其他做法</Heading>
          <p className="mt-1 text-[13px] text-ink-4">与这种情况有关，没有归入上面几组。</p>
          <StoryCards cards={s.rest} first={FIRST} />
        </section>
      )}
      <ActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        rows={[
          { key: "share", label: "分享", icon: <IconShare size={20} />, onSelect: onShare },
          { key: "copy", label: "复制链接", icon: <IconCopy size={20} />, onSelect: () => void copy(`${siteUrl()}${path}`) },
        ]}
      />
      {toast}
    </ReadingLayout>
  );
}

/**
 * A cause's section (Kay 11-04 22:22「尤其是1234这部分」, 决定记录 L2575): its number and title open and close it,
 * the first open. They are the page's list of causes; the picture's numbered list is shown only when there are none.
 */
function Section({ id, no, title, count, first, children }: { id: string; no: number; title: string; count: number; first: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(first);
  return (
    <section className="mt-8 border-t border-line pt-2">
      <h2 id={id} className="scroll-mt-[calc(var(--bar-h)+8px)]">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
          className="grid min-h-11 w-full grid-cols-[30px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2 text-left">
          <span className="num text-[17px] font-[650] leading-[1.5] text-accent">{no}</span>
          <span className="text-[17px] font-[650] leading-[1.5] text-ink">{title}</span>
          <span className="flex items-center gap-1 text-[12.5px] text-ink-4">
            <span className="num">{count}</span> 条
            <IconChevronDown size={14} className={`self-center transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </span>
        </button>
      </h2>
      <Collapse open={open}>{children}</Collapse>
    </section>
  );
}

/**
 * The 综合整理 (backend/topic.ts) at the top, as the engine's event page opens with its 先了解这件事 card
 * (apps/web/app/routes/story.tsx Panel, its title too; 决定记录 L2575): the three sentences that tell the conclusion, and
 * the rest by cause behind a toggle, so a reader who stops at the three has the point. Each 〔n〕 goes to its item.
 */
function Overview({ topic }: { topic: TopicView }) {
  const [open, setOpen] = useState(false);
  const cite = (text: string) => <CitedText text={text} href={(n) => (topic.sources[Number(n)] ? `/items/${topic.sources[Number(n)]}` : null)} />;
  return (
    <section className="card mt-6 p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-[17px] font-[650] leading-[1.5] text-ink">先了解这件事</h2>
        <div className="shrink-0 text-[11.5px] text-ink-4">AI 综述</div>
      </div>
      <div className="mt-3.5 space-y-3">
        {topic.lead.map((p, i) => <p key={i} className="text-[15px] leading-[1.85] text-ink-2">{cite(p)}</p>)}
      </div>
      <Collapse open={open}>
        {topic.sections.map((sec) => (
          <div key={sec.title} className="mt-5">
            <h3 className="text-[15px] font-[650] leading-[1.6] text-ink">{sec.title}</h3>
            <div className="mt-1.5 space-y-3">
              {sec.paragraphs.map((p, i) => <p key={i} className="text-[15px] leading-[1.85] text-ink-2">{cite(p)}</p>)}
            </div>
          </div>
        ))}
      </Collapse>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3">
        <FoldToggle open={open} onToggle={() => setOpen(!open)}>读全文</FoldToggle>
        <p className="text-[12px] text-ink-4">AI 根据 <span className="num">{topic.items}</span> 条原文整理 · <span className="num">{day(topic.updatedAt)}</span> 更新</p>
      </div>
    </section>
  );
}
