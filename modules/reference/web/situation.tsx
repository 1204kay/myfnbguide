// One situation (layout B2, J4): what it is and how many shops and 条原文 it has, its picture with the causes
// numbered, then its items by cause, newest first, and those in no cause under 其他做法 (backend/read.ts).
import { useState, type ReactNode } from "react";
import { useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { BarButton, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { AsideCard, ReadingLayout } from "@aihot/web/components/ui/Page";
import { IconCopy, IconMore, IconShare } from "@aihot/web/components/icons";
import { ActionsSheet } from "@aihot/web/features/item/ReaderTools";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { breadcrumbLd, itemListLd, pageMeta, siteUrl, titled } from "@aihot/web/lib/seo";
import { SITE } from "@aihot/site";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { SituationPage } from "../types.ts";
import { SituationFigure } from "./figures";
import { day, num, tellers } from "../format.ts";
import { Heading, PageHeader, ROW_BUTTON, StoryCards, useShare, BackLink } from "./ui";

export const handle: Screen = { tab: "reference" };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<SituationPage>(`/api/reference/situations/${encodeURIComponent(params.slug!)}`, { signal: request.signal });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这个情况") }, { name: "robots", content: "noindex" }];
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
      <PageHeader kicker={s.category.title} to={`/reference#${s.category.key}`} title={s.title} dek={s.dek}
        counts={[...tellers(s.count), [s.count.cases, "条原文"]]} updatedAt={s.updatedAt} asideFacts className="pb-2 pt-3 lg:pt-1" />
      <SituationFigure slug={s.slug} groups={titles}>
        {s.causes.length > 1 && (
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
                  {split
                    ? <a href={`#${g.key}`} className="grid min-h-11 grid-cols-[30px_minmax(0,1fr)] gap-3 py-3">{body}</a>
                    : <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 py-3">{body}</div>}
                </li>
              );
            })}
          </ol>
        )}
      </SituationFigure>
      {split ? s.groups.map((g, i) => (
        <section key={g.key} className="mt-10">
          <div id={g.key} className="flex scroll-mt-[calc(var(--bar-h)+8px)] items-baseline gap-3">
            <span className="num text-[17px] font-[650] leading-[1.5] text-accent">{i + 1}</span>
            <h2 className="text-[17px] font-[650] leading-[1.5] text-ink">{g.title}</h2>
          </div>
          {/* No section picture for now: 6 of 20 checked against their stories were wrong (10-18); they come back one
              by one once each is checked (sections/, myfnb/figure-sheet still draws them all). */}
          <StoryCards cards={g.cases} />
        </section>
      )) : (
        <section className="mt-9">{s.rest.length > 0 && <StoryCards cards={s.rest} />}</section>
      )}
      {split && s.rest.length > 0 && (
        <section className="mt-10">
          <Heading>其他做法</Heading>
          <p className="mt-1 text-[13px] text-ink-4">与这种情况有关，没有归入上面几组。</p>
          <StoryCards cards={s.rest} />
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
