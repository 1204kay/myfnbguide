// One situation (layout B2, J4): what it is and how many shops and 条原文 it has, 先了解这种情况, its picture with
// the causes numbered, then its practices: cards for those two shops or more tell, rows for those one shop tells
// alone, and (before the stories are grouped, or for stories written since) the stories. By cause only where two
// causes have two practices or more each; else one list, most shops first.
import type { ReactNode } from "react";
import { Link, useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { BackRow, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { IconShare } from "@aihot/web/components/icons";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { PracticeList, SituationPage } from "../types.ts";
import { GroupDrawing, SituationFigure } from "./figures";
import { num, tellers } from "../format.ts";
import { BODY, Dek, Heading, KICKER_LINK, Metrics, Page, Practice, ROW_BUTTON, ShareBar, ShopRows, SiteLine, StoryCards, Title, Updated, useShare } from "./ui";

export const handle: Screen = { tab: "reference", toolbar: true };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<SituationPage>(`/api/reference/situations/${encodeURIComponent(params.slug!)}`, { signal: request.signal });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这个情况") }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: data.title, description: data.dek, path: `/reference/${data.slug}` });
}

export default function SituationRoute() {
  const s = useLoaderData<typeof loader>();
  const { share, toast } = useShare();
  const path = `/reference/${s.slug}`;
  const onShare = () => void share(s.title, path);
  const split = s.groups.length > 0;
  const titles = s.causes.map((g) => g.title);
  const rest = s.rest.practices.length || s.rest.shops.length || s.rest.cases.length ? s.rest : null;
  const who = tellers(s.count).map(([n, unit]) => `${num(n)} ${unit}`).join("和 ");
  return (
    <Page>
      <PhoneBar back={{ to: "/", label: "参考" }} title={s.title} />
      <div className="hidden items-center justify-between lg:flex">
        <BackRow to="/" label="参考" />
        <button type="button" onClick={onShare} className={ROW_BUTTON}><IconShare size={16} />分享</button>
      </div>
      <Link to={`/#${s.category.key}`} className={KICKER_LINK}><Kicker>{s.category.title}</Kicker></Link>
      <Title>{s.title}</Title>
      <Dek>{s.dek}</Dek>
      <Metrics items={[...tellers(s.count), [s.count.cases, "条原文"]]} />
      {s.overview && (
        <section className="mt-8">
          <Kicker>先了解这种情况</Kicker>
          <p className={`mt-3 ${BODY}`}>{s.overview}</p>
          <p className="mt-2 text-[13px] leading-[1.5] text-ink-4">AI 根据本页 {who}的原文归纳，各家的做法以原文为准。</p>
        </section>
      )}
      <SituationFigure slug={s.slug} groups={titles}>
        {s.causes.length > 1 && (
          <ol className="mt-3">
            {s.causes.map((g, i) => {
              const body = (
                <>
                  <span className="num text-[26px] font-black leading-none tracking-tight text-accent lg:text-[28px]">{i + 1}</span>
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
            <span className="num text-[26px] font-black leading-none tracking-tight text-accent lg:text-[28px]">{i + 1}</span>
            <h2 className="text-[20px] font-extrabold leading-[1.35] text-ink lg:text-[22px]">{g.title}</h2>
          </div>
          <List list={g} grouped={s.count.grouped} figure={<GroupDrawing slug={s.slug} groups={titles} focus={g.title} />} />
        </section>
      )) : (
        <section className="mt-9"><List list={s.rest} grouped={s.count.grouped} /></section>
      )}
      {split && rest && (
        <section className="mt-10">
          <Heading>其他做法</Heading>
          <p className="mt-1 text-[13px] text-ink-4">与这种情况有关，没有归入上面几组。</p>
          <List list={rest} grouped={s.count.grouped} />
        </section>
      )}
      <Updated at={s.updatedAt} />
      <SiteLine situations={s.situations} />
      <ShareBar onShare={onShare} />
      {toast}
    </Page>
  );
}

/**
 * One list: the practice cards, the rows of practices one shop tells alone, then the stories in no practice (all
 * of them before the stories are grouped). `figure`, the cause's part of the picture, goes on the first card, or
 * on top of the rows where there is no card.
 */
function List({ list, grouped, figure }: { list: PracticeList; grouped: boolean; figure?: ReactNode }) {
  return (
    <>
      {list.practices.length > 0 && (
        <div className="mt-3.5 grid gap-2.5">
          {list.practices.map((p, i) => <Practice key={p.key} p={p} figure={i === 0 ? figure : undefined} />)}
        </div>
      )}
      <ShopRows shops={list.shops} figure={list.practices.length ? undefined : figure} className={list.practices.length ? "mt-2.5" : "mt-3.5"} />
      {list.cases.length > 0 && (
        <>
          {grouped && <p className="mt-5 text-[13px] text-ink-4">最近收进来的原文</p>}
          <StoryCards cards={list.cases} />
        </>
      )}
    </>
  );
}
