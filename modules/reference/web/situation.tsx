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
import { monthDayTime, relativeTime } from "@aihot/web/lib/format";
import { num, tellers } from "../format.ts";
import { BackLink, CitedText, FIRST, FoldToggle, PageHeader, ROW_BUTTON, StoryCards, useShare } from "./ui";

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
  const points = (key: string) => s.topic?.sections.find((p) => p.key === key)?.points ?? [];
  const srcOf = new Map([...s.groups.flatMap((g) => g.cases), ...s.rest].map((c) => [c.id, c.src]));
  // "日本 · 意大利酒馆店主 · 2025 年 7 月": the country is the first part (backend/read.ts).
  const countryOf = (id: string) => srcOf.get(id)?.split(" · ")[0] ?? "";
  // The engine's reading template puts the aside beside the page from `side` (1176px) and under it below that; as
  // 更新日志 has its aside's lists (routes/changelog.tsx), it shows only from `side`, and the header carries the counts
  // and the date below that (PageHeader asideFacts). What the page counts, when it was updated, and 分享.
  const aside = (
    <AsideCard title="这种情况" className="hidden side:block">
      <div className="-mb-1">
        {[...tellers(s.count), [s.count.cases, "条原文"] as [number, string]].map(([n, unit]) => (
          <p key={unit} className="py-1 text-[13.5px] text-ink-2"><span className="num mr-1 font-semibold text-ink">{num(n)}</span>{unit}</p>
        ))}
      </div>
      {s.updatedAt && <p className="mt-3 border-t border-line-soft pt-3 text-[12px] text-ink-4"><time dateTime={s.updatedAt} className="num">{monthDayTime(s.updatedAt)}</time> 更新</p>}
      <button type="button" onClick={onShare} className={`${ROW_BUTTON} mt-3 w-full`}><IconShare size={14} />分享</button>
    </AsideCard>
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
      {/* The situation's own title, as the lists have it: the article's title narrowed it (Kay 11-06「标题为什么是小餐饮？」). */}
      <PageHeader kicker={s.category.title} title={s.title} dek={s.dek}
        counts={[...tellers(s.count), [s.count.cases, "条原文"]]} updatedAt={s.updatedAt} asideFacts />
      {s.topic && <Overview topic={s.topic} countryOf={countryOf} />}
      {/* Not with the 综合整理: its points carry what the picture showed, and the pictures were examples with made-up
          amounts (Kay 11-06「要就全部有 不然就全部不要」「如果不要图 就把上下融合」, the ninth sample has none). */}
      {!s.topic && <SituationFigure slug={s.slug} groups={titles}>
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
      </SituationFigure>}
      {split ? s.groups.map((g, i) => (
        <Section key={g.key} id={g.key} title={g.title} count={g.cases.length} first={i === 0}>
          {/* No section picture for now: 6 of 20 checked against their stories were wrong (10-18); they come back one
              by one once each is checked (sections/, myfnb/figure-sheet still draws them all). */}
          {s.topic && <Points points={points(g.key)} topic={s.topic} countryOf={countryOf} />}
          <StoryCards cards={g.cases} first={FIRST} />
        </Section>
      )) : (
        <section className="mt-9">{s.rest.length > 0 && <StoryCards cards={s.rest} first={FIRST} />}</section>
      )}
      {split && s.rest.length > 0 && (
        <section className="mt-8">
          <h2 className="flex min-h-11 items-center gap-2 lg:gap-3">
            <span className={TITLE}>其他做法</span>
            <span className={COUNT}><span className="num">{s.rest.length}</span> 条</span>
          </h2>
          <p className="text-[13px] text-ink-4">与这种情况有关，没有归入上面几组。</p>
          {s.topic && <Points points={points("rest")} topic={s.topic} countryOf={countryOf} />}
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

/** A section's title and its count, in the timeline's day header type (AIHOT features/feed/Timeline.tsx DayHeader): 14px on phones, 18px from desktops. */
const TITLE = "min-w-0 text-[14px] font-bold leading-6 text-ink lg:text-[18px] lg:font-semibold";
const COUNT = "ml-auto shrink-0 text-[12.5px] text-ink-4 lg:ml-0 lg:text-[13px]";

/**
 * A cause's section (Kay 11-04 22:22「尤其是1234这部分」, 决定记录 L2575): its title opens and closes it, the first
 * open, as the timeline folds a day (DayHeader): the chevron at the end on phones, in its round button after the title
 * from desktops, then 「N 条」.
 */
function Section({ id, title, count, first, children }: { id: string; title: string; count: number; first: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(first);
  const turn = `transition-transform duration-200 ${open ? "" : "-rotate-90"}`;
  return (
    <section className="mt-8">
      <h2 id={id} className="scroll-mt-[calc(var(--bar-h)+8px)]">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="group flex min-h-11 w-full items-center gap-2 text-left lg:gap-3">
          <span className={TITLE}>{title}</span>
          <span aria-hidden="true" className="hidden size-6 shrink-0 place-items-center rounded-full text-ink-4 transition-colors group-hover:bg-bg-sunk group-hover:text-ink lg:grid">
            <IconChevronDown size={14} className={turn} />
          </span>
          <span className={`flex items-center gap-1 ${COUNT}`}>
            <span><span className="num">{count}</span> 条</span>
            <IconChevronDown size={15} className={`lg:hidden ${turn}`} />
          </span>
        </button>
      </h2>
      <Collapse open={open}>{children}</Collapse>
    </section>
  );
}

/**
 * The 综合整理 (backend/topic.ts) at the top, in the engine's event page's 先了解这件事 panel (AIHOT routes/story.tsx
 * Panel; 决定记录 L2575): its three points, what a reader who reads nothing else should know, and its note. Each
 * cause's points open its section below (Points), where its items are.
 */
function Overview({ topic, countryOf }: { topic: TopicView; countryOf: (id: string) => string }) {
  return (
    <section id="overview" className="card mt-6 scroll-mt-[calc(var(--bar-h)+64px)] p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-[17px] font-[650] leading-[1.5] text-ink">先了解这件事</h2>
        <div className="shrink-0 text-[11.5px] text-ink-4">AI 综述</div>
      </div>
      <div className="mt-3.5">
        <Points points={topic.lead} topic={topic} countryOf={countryOf} className="" />
        <p className="mt-2 text-[12px] text-ink-4" suppressHydrationWarning>AI 根据 <span className="num">{topic.items}</span> 条原文整理 · {relativeTime(topic.updatedAt)}更新</p>
      </div>
    </section>
  );
}

/** Points, as the item page lists its 原文要点 (AIHOT routes/item.tsx Reason). */
function Points({ points, topic, countryOf, className = "mt-1 mb-4" }: { points: string[]; topic: TopicView; countryOf: (id: string) => string; className?: string }) {
  if (!points.length) return null;
  return <ul className={`list-disc space-y-1.5 pl-[1.2em] ${className}`}>{points.map((p, i) => <Point key={i} text={p} topic={topic} countryOf={countryOf} />)}</ul>;
}

/**
 * One point (Kay 11-06, the ninth sample with 十一's changes): the conclusion, its first sentence, in bold and at most
 * one reason after it (the engine's Callout sets its line in bold the same way, features/agent/parts.tsx); then how
 * many countries and items it rests on, counted here from its citations, behind the original's fold toggle
 * (FoldToggle), opening to the numbers, each to its item. The numbers are not in the text: a row of them after every
 * clause buried the point.
 */
function Point({ text, topic, countryOf }: { text: string; topic: TopicView; countryOf: (id: string) => string }) {
  const [open, setOpen] = useState(false);
  const ns = [...new Set([...text.matchAll(/〔([^〕]+)〕/gu)].flatMap((m) => m[1]!.split(/[、,，\s]+/u).filter(Boolean)))];
  const plain = text.replace(/〔[^〕]*〕/gu, "");
  const end = plain.search(/[。！？]/u) + 1;
  const [head, rest] = end > 0 ? [plain.slice(0, end), plain.slice(end)] : [plain, ""];
  const countries = new Set(ns.map((n) => countryOf(topic.sources[Number(n)] ?? "")).filter(Boolean)).size;
  return (
    <li className="text-[15px] leading-[1.75] text-ink-2 xl:text-[16px]">
      <span className="font-semibold text-ink">{head}</span>{rest}
      {ns.length > 0 && (
        <FoldToggle open={open} onToggle={() => setOpen(!open)} className="ml-1.5 whitespace-nowrap align-baseline">
          {countries > 0 && <><span className="num">{countries}</span> 国 · </>}<span className="num">{ns.length}</span> 篇
        </FoldToggle>
      )}
      {open && <span className="ml-1 text-[12.5px] text-ink-4"><CitedText text={`〔${ns.join("、")}〕`} href={(n) => (topic.sources[Number(n)] ? `/items/${topic.sources[Number(n)]}` : null)} /></span>}
    </li>
  );
}
