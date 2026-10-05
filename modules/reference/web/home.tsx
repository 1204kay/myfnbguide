// 参考, the site's home page (layout J3): how many situations and 条原文 the library has; 店家谈得最多的事, the
// ten situations the most shops shared a practice in, after AIHOT's 热点榜 (the first as a large card with its
// picture, the next two as small cards beside it, the rest as rows); then each category's situations as rows, most
// shops first. Neither countries nor shop kinds are ways in or counts (layout J0).
import { useRef, useState } from "react";
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { NAV, SITE } from "@aihot/site";
import { IconChevronDown } from "@aihot/web/components/icons";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { EmptyState } from "@aihot/web/components/ui/Page";
import { PhoneBar, TabPageBar } from "@aihot/web/components/shell/PhoneBar";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import { day } from "../format.ts";
import type { CategoryRows, ReferenceHome, SituationRow } from "../types.ts";
import { figureKind, SituationDrawing } from "./figures";
import { CARD, CountFigure, Dek, Heading, Metrics, openRest, Page, RANK, SituationRows, STRETCH, Updated } from "./ui";

export const handle: Screen = { tab: "reference", name: "参考" };

const LEAD = "按遇到的事，查各地店家的做法和经验。每一条都附原文出处，由你自己判断。";

/**
 * A category lists all its situations up to ALL_UP_TO; past that, the first SHOWN and a row that opens the rest in
 * place (layout J3-4): the library grows by rule, and a category would otherwise grow without end.
 */
const ALL_UP_TO = 8;
const SHOWN = 6;

export function headers() {
  return edgeTtl(60);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return loadOr404<ReferenceHome>("/api/reference", { signal: request.signal });
}

export function meta() {
  // The site's own title at its home (site.ts NAV.home), the page's name where it has another address.
  return NAV.home === "reference-home" ? pageMeta({ description: SITE.description, path: "/" }) : pageMeta({ title: "参考", description: LEAD, path: "/reference" });
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
    <article className={`${CARD} flex flex-col p-4 sm:p-5 lg:p-6 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:grid-rows-[auto_1fr]`}>
      <div className="min-w-0 xl:col-start-1 xl:row-start-1">
        <h3 className="flex gap-2.5 text-[18px] font-bold leading-[1.4] text-ink lg:text-[20px]">
          <span className={RANK}>1</span>
          <Link viewTransition to={`/reference/${s.slug}`} className={STRETCH}>{s.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-[14.5px] leading-[1.7] text-ink-3 lg:text-[15px]">{s.overview ?? s.dek}</p>
      </div>
      <div className="mx-auto mt-4 w-full max-w-[360px] empty:hidden [&_svg]:max-h-[200px] xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:ml-6 xl:mt-0 xl:w-[260px] xl:self-center">
        <SituationDrawing slug={s.slug} />
        {kind && <p className={`mt-2 text-[13px] font-semibold ${kind === "举例" ? "text-ink-3" : "text-accent"}`}>{kind}</p>}
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
    <article className={`${CARD} flex flex-col px-4 py-3.5 sm:px-5 sm:py-4`}>
      <h3 className="flex gap-2.5 text-[16px] font-[650] leading-[1.5] text-ink sm:text-[17px]">
        <span className={RANK}>{rank}</span>
        <Link viewTransition to={`/reference/${s.slug}`} className={STRETCH}>{s.title}</Link>
      </h3>
      <p className="mt-1 line-clamp-2 text-[14px] leading-[1.6] text-ink-3">{s.practice ?? s.dek}</p>
      <div className="mt-auto pt-3 text-right"><CountFigure count={s.count} size={22} /></div>
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

/** A category: its title and its situations as rows, most shops first, the rest past SHOWN opened in place. */
function Category({ c }: { c: CategoryRows }) {
  const [open, setOpen] = useState(false);
  const section = useRef<HTMLElement>(null);
  const cut = !open && c.situations.length > ALL_UP_TO;
  return (
    <section ref={section} className="mt-9">
      <Heading id={c.key}>{c.title}</Heading>
      <SituationRows rows={cut ? c.situations.slice(0, SHOWN) : c.situations}>
        {cut && (
          <button type="button" onClick={() => openRest(() => setOpen(true), () => section.current?.querySelectorAll<HTMLElement>("h3 a")[SHOWN])}
            className="flex min-h-11 w-full items-center justify-center gap-1 border-t border-line text-[14px] text-accent transition-colors hover:bg-bg-sunk/40 focus-visible:-outline-offset-2">
            其余 {c.situations.length - SHOWN} 种情况<IconChevronDown size={15} />
          </button>
        )}
      </SituationRows>
    </section>
  );
}

export default function ReferenceHomePage() {
  const data = useLoaderData<typeof loader>();
  return (
    <Page wide>
      {NAV.search === "shell" ? <TabPageBar title="参考" large /> : <PhoneBar title="参考" large />}
      <h1 className="hidden text-[30px] font-bold leading-[1.25] text-ink lg:block">参考</h1>
      <Dek className="lg:mt-2">{LEAD}</Dek>
      <Metrics items={[[data.totals.situations, "种情况"], [data.totals.cases, "条原文"]]} />
      {!data.categories.length && <EmptyState title="还没有整理好的情况">每种情况收到两家以上店家的做法以后，才会出现在这里。</EmptyState>}
      {data.ranking.length > 0 && (
        <section className="mt-8">
          {/* The label is the section's heading, so the places under it are not headings straight under the page's. */}
          <div role="heading" aria-level={2}><Kicker>店家谈得最多的事</Kicker></div>
          <p className="mt-1.5 text-[13px] text-ink-4">按分享过做法的店家数排列</p>
          <Ranking rows={data.ranking} recent={data.recent} />
        </section>
      )}
      {/* From 1280px two categories side by side: the lists' width goes to columns, not longer lines (layout J2). */}
      <div className="xl:grid xl:grid-cols-2 xl:items-start xl:gap-x-6">
        {data.categories.map((c) => <Category key={c.key} c={c} />)}
      </div>
      <Updated at={data.updatedAt} />
    </Page>
  );
}
