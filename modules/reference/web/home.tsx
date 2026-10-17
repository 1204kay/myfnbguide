// 参考, the site's home page (layout J3): how many situations and 条原文 the library has; 店家谈得最多的事, the
// ten situations the most shops shared a practice in, after AIHOT's 热点榜 (the first as a large card with its
// picture, the next two as small cards beside it, the rest as rows); then each category's situations as rows, most
// shops first. Neither countries nor shop kinds are ways in or counts (layout J0).
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { EmptyState } from "@aihot/web/components/ui/Page";
import { PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import { day, num } from "../format.ts";
import type { CategoryRows, ReferenceHome, SituationRow } from "../types.ts";
import { figureKind, SituationDrawing } from "./figures";
import { CARD, CountFigure, KindTag, Page, PageHeader, RankTag, SituationRows, STRETCH, Who } from "./ui";

export const handle: Screen = { tab: "reference", name: "参考" };

const LEAD = "按遇到的事，查各地店家的做法和经验。每一条都附原文出处，由你自己判断。";

export function headers() {
  return edgeTtl(60);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return loadOr404<ReferenceHome>("/api/reference", { signal: request.signal });
}

export function meta() {
  return pageMeta({ title: "参考", description: LEAD, path: "/reference" });
}

/**
 * The first: its place and title, the opening of 先了解这种情况, its picture and what kind it is (举例 or 示意, as
 * under every picture: HANDOFF §3.1), the story the library took in last, and its shops in a big number. The
 * picture comes after the title on phones; beside the text from 1280px, where the card (8 of 12 columns) is wide
 * enough for the picture's words to stay 11px or more (layout B2); under the text between 961px and 1280px, where
 * the card is 7 columns.
 */
function Lead({ s, recent }: { s: SituationRow; recent: ReferenceHome["recent"] }) {
  const kind = figureKind(s.slug);
  return (
    <article className={`${CARD} flex flex-col p-5 sm:p-6 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:grid-rows-[auto_1fr]`}>
      <div className="min-w-0 xl:col-start-1 xl:row-start-1">
        {/* The hot list's first card type (AIHOT routes/hot.tsx Lead): NO.01 over a 21/23/25px title, a 14px line. */}
        <RankTag rank={1} />
        <h3 className="mt-4 text-[21px] font-bold leading-[1.4] tracking-[-0.01em] text-ink sm:text-[23px] lg:text-[25px] lg:leading-[1.38]">
          <Link viewTransition to={`/reference/${s.slug}`} className={STRETCH}>{s.title}</Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-[14px] leading-[1.75] text-ink-3">{s.overview ?? s.dek}</p>
        <div className="mt-3"><Who s={s} size={24} /></div>
      </div>
      <div className="mx-auto mt-4 w-full max-w-[360px] empty:hidden [&_svg]:max-h-[200px] xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:ml-6 xl:mt-0 xl:w-[260px] xl:self-center">
        <SituationDrawing slug={s.slug} />
        {kind && <p className="mt-2"><KindTag kind={kind} /></p>}
      </div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pt-4 xl:col-start-1 xl:row-start-2">
        {recent && (
          <Link viewTransition to={`/reference/cases/${recent.id}`} className="relative z-10 inline-flex min-h-11 items-center text-[13px] leading-[1.5] text-ink-3 transition-colors hover:text-accent">
            <span><b className="font-semibold text-accent">最近收进</b> · {day(recent.at)} · {recent.who} ›</span>
          </Link>
        )}
        <span className="ml-auto pb-1.5"><CountFigure count={s.count} size={30} /></span>
      </div>
    </article>
  );
}

/** The second and third: place and title, 代表做法 on a line, the shops. */
function Runner({ s, rank }: { s: SituationRow; rank: number }) {
  return (
    <article className={`${CARD} flex flex-col px-5 py-4`}>
      {/* The hot list's second and third (AIHOT routes/hot.tsx Runner): NO.02 over a 16px title, a 13px line. */}
      <RankTag rank={rank} />
      <h3 className="mt-2.5 text-[16px] font-[650] leading-[1.5] text-ink">
        <Link viewTransition to={`/reference/${s.slug}`} className={STRETCH}>{s.title}</Link>
      </h3>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.7] text-ink-3">{s.practice ?? s.dek}</p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-3"><Who s={s} /><CountFigure count={s.count} size={22} /></div>
    </article>
  );
}

/**
 * 店家谈得最多的事 (layout J3-3): from 961px the first takes 7 of 12 columns (8 from 1280px) and the next two
 * stand on its right, one over the other; on phones they follow it. The fourth on are rows in one card.
 */
function Ranking({ rows, recent }: { rows: SituationRow[]; recent: ReferenceHome["recent"] }) {
  const [lead, ...rest] = rows;
  const runners = rest.slice(0, 2);
  return (
    <>
      <div className="mt-3 grid gap-3 lg:grid-cols-12 lg:gap-4">
        <div className={`grid ${runners.length ? "lg:col-span-7 lg:row-span-2 xl:col-span-8" : "lg:col-span-12"}`}><Lead s={lead!} recent={recent} /></div>
        {runners.map((s, i) => <div key={s.slug} className="grid lg:col-span-5 xl:col-span-4"><Runner s={s} rank={i + 2} /></div>)}
      </div>
      {rest.length > 2 && <SituationRows rows={rest.slice(2)} from={4} />}
    </>
  );
}

/** A category: its title and all its situations as rows, most shops first, as the topics page lists all its topics. */
function Category({ c, top = "pt-8" }: { c: CategoryRows; top?: string }) {
  return (
    <section className={top}>
      {/* A group's heading, as the topics page has it (AIHOT routes/topics.tsx). */}
      <h2 id={c.key} className="scroll-mt-[calc(var(--bar-h)+8px)] text-[15px] font-bold text-ink">{c.title}</h2>
      <SituationRows rows={c.situations} />
    </section>
  );
}

export default function ReferenceHomePage() {
  const data = useLoaderData<typeof loader>();
  const counts: Array<[number, string]> = [[data.totals.situations, "种情况"], [data.totals.cases, "条原文"]];
  return (
    <Page wide>
      {/* As the hot list: the bar's large title on phones with the lead under it, a header on desktops (the topic
          page's counts line and date, HANDOFF §2.4, on both). */}
      <PhoneBar title="参考" large sub={LEAD} />
      <PageHeader title="参考" dek={LEAD} counts={counts} updatedAt={data.updatedAt} className="hidden pb-5 pt-1 lg:flex" />
      <p className="flex flex-wrap gap-x-4 gap-y-1 pb-1 text-[12.5px] text-ink-4 lg:hidden">
        {counts.map(([n, unit]) => <span key={unit}><span className="num font-semibold text-ink-2">{num(n)}</span> {unit}</span>)}
        {data.updatedAt && <span><span className="num">{day(data.updatedAt)}</span> 更新</span>}
      </p>
      {!data.categories.length && <div className="card rounded-sheet"><EmptyState title="还没有整理好的情况">每种情况收到两家以上店家的做法以后，才会出现在这里。</EmptyState></div>}
      {data.ranking.length > 0 && (
        <section className="mt-6 lg:mt-2">
          {/* The label is the section's heading, so the places under it are not headings straight under the page's. */}
          <div role="heading" aria-level={2}><Kicker>店家谈得最多的事</Kicker></div>
          <p className="mt-1.5 text-[13px] text-ink-4">按分享过做法的店家数排列</p>
          <Ranking rows={data.ranking} recent={data.recent} />
        </section>
      )}
      {data.categories.length > 0 && (
        // The categories get the ranking's kind of label, so where the ranking ends and the full list begins is said
        // (Kay 10/17: past the tenth place a reader could not tell they had left it).
        <div className="mt-12 lg:mt-14">
          <div role="heading" aria-level={2}><Kicker>按类别看全部情况</Kicker></div>
          <p className="mt-1.5 text-[13px] text-ink-4"><span className="num">{num(data.totals.situations)}</span> 种情况，分成 <span className="num">{num(data.categories.length)}</span> 类</p>
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
