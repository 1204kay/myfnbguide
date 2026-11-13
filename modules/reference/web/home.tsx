// 参考, the site's home page (layout J3): how many situations and 条原文 the library has; 店家谈得最多的事, the
// ten situations the most shops told, after AIHOT's 热点榜 (the first as a large card,
// the next two as small cards beside it, the rest as rows); then each category's situations as rows, most
// shops first. Neither countries nor shop kinds are ways in or counts (layout J0).
import { Link, useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { EmptyState } from "@aihot/web/components/ui/Page";
import { PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { archiveLd, pageMeta } from "@aihot/web/lib/seo";
import { SITE } from "@aihot/site";
import type { Screen } from "@aihot/web/components/shell/screens";
import { monthDayTime } from "@aihot/web/lib/format";
import { num } from "../format.ts";
import type { CategoryRows, ReferenceHome, SituationRow } from "../types.ts";
import { CARD, CountFigure, FIRST, Page, PageHeader, RankTag, SituationRows, STRETCH, Who } from "./ui";

export const handle: Screen = { tab: "reference", name: "参考" };

const LEAD = "各地店家在成本、人员、顾客、运营、开店关店等方面的做法，按情况分类，附原文出处。";

export function headers() {
  return edgeTtl(60);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return loadOr404<ReferenceHome>("/api/reference", { signal: request.signal });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  // Its situations are pages of their own, as an archive's issues are (routes/daily-archive.tsx archiveLd).
  const entries = (data?.categories ?? []).flatMap((c) => c.situations.map((s) => ({ path: `/reference/${s.slug}`, name: s.title })));
  return pageMeta({ title: "参考", description: LEAD, path: "/reference", jsonLd: entries.length ? archiveLd("/reference", `${SITE.name} 参考`, entries) : undefined });
}

/**
 * The first, as the hot list's first card (AIHOT routes/hot.tsx Lead): its place, its title and line, who tells it at
 * the foot and its shops in the hot list's big figure. No picture: the pictures were examples with made-up amounts,
 * and the reference pages show no amounts and draw only what many sources show (Kay 11-07 「行吧 试试吧」).
 */
function Lead({ s }: { s: SituationRow }) {
  return (
    <article className={`${CARD} flex flex-col overflow-hidden p-5 sm:p-6`}>
      <div className="flex items-center gap-2.5"><RankTag rank={1} /></div>
      <div className="mt-4 min-w-0">
        <h3 className="text-[21px] font-bold leading-[1.4] tracking-[-0.01em] text-ink sm:text-[23px] lg:text-[25px] lg:leading-[1.38]">
          <Link viewTransition to={`/reference/${s.slug}`} className={STRETCH}>{s.title}</Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-[14px] leading-[1.75] text-ink-3">{s.dek}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-end gap-x-6 gap-y-4 pt-5">
        <div className="min-w-0 flex-[1_1_18rem]"><Who s={s} size={24} /></div>
        <div className="flex w-full shrink-0 items-end justify-end sm:ml-auto sm:w-auto"><CountFigure count={s.count} size={34} /></div>
      </div>
    </article>
  );
}

/** The second and third, as the hot list's (AIHOT routes/hot.tsx Runner): the same card, smaller. */
function Runner({ s, rank }: { s: SituationRow; rank: number }) {
  return (
    <article className={`${CARD} flex flex-col px-5 py-4`}>
      <div className="flex items-center gap-2.5"><RankTag rank={rank} /></div>
      <h3 className="mt-2.5 line-clamp-2 text-[16px] font-[650] leading-[1.5] text-ink">
        <Link viewTransition to={`/reference/${s.slug}`} className={STRETCH}>{s.title}</Link>
      </h3>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.7] text-ink-3 lg:line-clamp-1">{s.dek}</p>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-3">
        <div className="min-w-0"><Who s={s} size={20} /></div>
        <div className="ml-auto"><CountFigure count={s.count} size={24} /></div>
      </div>
    </article>
  );
}

/**
 * 店家谈得最多的事 (layout J3-3): from 961px the first takes 7 of 12 columns (8 from 1280px) and the next two
 * stand on its right, one over the other; on phones they follow it. The fourth on are rows in one card.
 */
function Ranking({ rows }: { rows: SituationRow[] }) {
  const [lead, ...rest] = rows;
  const runners = rest.slice(0, 2);
  return (
    <>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
        <div className={`grid grid-cols-1 ${runners.length ? "lg:col-span-7 lg:row-span-2 xl:col-span-8" : "lg:col-span-12"}`}><Lead s={lead!} /></div>
        {runners.map((s, i) => <div key={s.slug} className="grid grid-cols-1 lg:col-span-5 xl:col-span-4"><Runner s={s} rank={i + 2} /></div>)}
      </div>
      {/* The fourth on behind one toggle, so the categories below are reached sooner (Kay 11-06, 决定记录 L2575). */}
      {rest.length > 2 && <SituationRows rows={rest.slice(2)} from={4} first={0} more={<>查看第 4–{rest.length + 1} 名</>} />}
    </>
  );
}

/**
 * A category: its title and its situations as rows, most shops first, as the topics page lists its topics; the
 * first three, the rest behind 另有 N 种情况 (Kay 11-04 22:22 asked for the fold again, 决定记录 L2575).
 */
function Category({ c, top = "pt-8" }: { c: CategoryRows; top?: string }) {
  return (
    <section className={top}>
      {/* A group's heading, as the topics page has it (AIHOT routes/topics.tsx). */}
      <h2 id={c.key} className="scroll-mt-[calc(var(--bar-h)+8px)] text-[15px] font-bold text-ink">{c.title}</h2>
      <SituationRows rows={c.situations} first={FIRST} />
    </section>
  );
}

export default function ReferenceHomePage() {
  const data = useLoaderData<typeof loader>();
  const counts: Array<[number, string]> = [[data.totals.situations, "种情况"], [data.totals.cases, "条原文"]];
  return (
    <Page wide>
      {/* As the hot list: the bar's large title on phones with what the page is and when it was updated under it, a
          header on desktops (the topic page's counts line and date, HANDOFF §2.4). */}
      <PhoneBar title="参考" large sub={<>
        {LEAD}
        <span className="block">
          {counts.map(([n, unit], i) => <span key={unit}>{i > 0 && " · "}<span className="num">{num(n)}</span> {unit}</span>)}
          {data.updatedAt && <> · <span className="num">{monthDayTime(data.updatedAt)}</span> 更新</>}
        </span>
      </>} />
      <PageHeader title="参考" dek={LEAD} counts={counts} updatedAt={data.updatedAt} className="hidden pb-5 pt-1 lg:flex" />
      {!data.categories.length && <div className="card rounded-sheet"><EmptyState title="尚无整理完成的情况">每种情况收到两家以上店家的做法以后，才会在本页列出。</EmptyState></div>}
      {data.ranking.length > 0 && (
        <section className="mt-6 lg:mt-2">
          {/* The label is the section's heading, so the places under it are not headings straight under the page's. */}
          <div role="heading" aria-level={2}><Kicker>店家讨论最多的情况</Kicker></div>
          <p className="mt-1.5 text-[13px] text-ink-4">按分享过做法的店家数排列</p>
          <Ranking rows={data.ranking} />
        </section>
      )}
      {data.categories.length > 0 && (
        // The categories get the ranking's kind of label, so where the ranking ends and the full list begins is said
        // (Kay 10/17: past the tenth place a reader could not tell they had left it).
        <div className="mt-12 lg:mt-14">
          <div role="heading" aria-level={2}><Kicker>按类别查看全部情况</Kicker></div>
          <p className="mt-1.5 text-[13px] text-ink-4"><span className="num">{num(data.totals.situations)}</span> 种情况，分成 <span className="num">{num(data.categories.length)}</span> 类；每类先列店家最多的 <span className="num">{FIRST}</span> 种</p>
        </div>
      )}
      {/* From 1280px two categories side by side: the lists' width goes to columns, not longer lines (layout J2). The
          first row sits closer to the label above it. */}
      <div className="xl:grid xl:grid-cols-2 xl:items-start xl:gap-x-6">
        {data.categories.map((c, i) => <Category key={c.key} c={c} top={i === 0 ? "pt-5" : i === 1 ? "pt-8 xl:pt-5" : "pt-8"} />)}
      </div>
    </Page>
  );
}
