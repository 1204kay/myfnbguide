// One situation (layout B2): what it is and what it counts, 先了解这种情况, its picture with the causes numbered,
// then each cause's practices (or, before the stories are grouped, its stories) and what fits none of them.
import { Link, useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { BackRow, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { IconShare } from "@aihot/web/components/icons";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { PracticeCard, SituationGroupPart, SituationPage } from "../types.ts";
import { GroupDrawing, SituationFigure } from "./figures";
import { countItems } from "../format.ts";
import { BODY, Dek, Heading, KICKER_LINK, Metrics, Page, Practice, ROW_BUTTON, ShareBar, SiteLine, StoryCards, Title, Updated, useShare } from "./ui";

export const handle: Screen = { tab: "reference", toolbar: true };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const kind = new URL(request.url).searchParams.get("kind");
  return loadOr404<SituationPage>(`/api/reference/situations/${encodeURIComponent(params.slug!)}${kind ? `?kind=${encodeURIComponent(kind)}` : ""}`, { signal: request.signal });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这个情况") }, { name: "robots", content: "noindex" }];
  // One address for the page however it is narrowed (?kind=).
  return pageMeta({ title: data.title, description: data.dek, path: `/reference/${data.slug}` });
}

/** Fewer shops than this, or one cause alone, and the page lists its practices without the causes' headings. */
const GROUPED_FROM = 4;

export default function SituationRoute() {
  const s = useLoaderData<typeof loader>();
  const { share, toast } = useShare();
  const path = `/reference/${s.slug}`;
  const onShare = () => void share(s.title, path);
  const groups = s.groups.filter((g) => g.practices.length || g.cases.length);
  const others = s.others.practices.length || s.others.cases.length ? s.others : null;
  const flat = s.count.shops + s.count.insiders < GROUPED_FROM || groups.length < 2;
  const titles = groups.map((g) => g.title);
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
      <Metrics items={countItems(s.count)} />
      {s.kind && (
        <Link to={path} replace className="mt-3 inline-flex h-9 items-center gap-1 rounded-full bg-accent-soft px-3.5 text-[13px] text-accent touch:h-11">
          只看{s.kind.title} <span aria-hidden="true">×</span><span className="sr-only">，看全部店型</span>
        </Link>
      )}
      {s.overview && (
        <section className="mt-8">
          <Kicker>先了解这种情况</Kicker>
          <p className={`mt-3 ${BODY}`}>{s.overview}</p>
          <p className="mt-2 text-[13px] leading-[1.5] text-ink-4">
            AI 根据{s.kind ? "这种情况下" : "本页"} {[s.overviewCount.shops && `${s.overviewCount.shops} 家店`, s.overviewCount.insiders && `${s.overviewCount.insiders} 位业内人士`].filter(Boolean).join("和 ")}的原文归纳，各家的做法以原文为准。
          </p>
        </section>
      )}
      <SituationFigure slug={s.slug} groups={titles}>
        {groups.length > 1 && (
          <ol className="mt-3">
            {groups.map((g, i) => {
              const body = (
                <>
                  <span className="num text-[26px] font-black leading-none tracking-tight text-accent lg:text-[28px]">{i + 1}</span>
                  <span><b className="block text-[16px] font-[650] leading-snug text-ink">{g.title}</b><span className="text-[13px] text-ink-3">{g.line}</span></span>
                </>
              );
              return (
                <li key={g.key} className="border-t border-line first:border-t-0">
                  {flat
                    ? <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 py-3">{body}</div>
                    : <a href={`#${g.key}`} className="grid min-h-11 grid-cols-[30px_minmax(0,1fr)] gap-3 py-3">{body}</a>}
                </li>
              );
            })}
          </ol>
        )}
      </SituationFigure>
      {flat ? (
        <section className="mt-9">
          <Practices list={[...groups.flatMap((g) => g.practices), ...(others?.practices ?? [])]} slug={s.slug} titles={titles} />
          <Loose grouped={s.grouped} cards={[...groups.flatMap((g) => g.cases), ...(others?.cases ?? [])]} />
        </section>
      ) : (
        groups.map((g, i) => <Group key={g.key} g={g} n={i + 1} grouped={s.grouped} slug={s.slug} titles={titles} />)
      )}
      {!flat && others && (
        <section className="mt-10">
          <Heading>其他做法</Heading>
          <p className="mt-1 text-[13px] text-ink-4">与这种情况有关，没有归入上面几组。</p>
          <Practices list={others.practices} />
          <Loose grouped={s.grouped} cards={others.cases} />
        </section>
      )}
      <Updated at={s.updatedAt} />
      <SiteLine situations={s.situations} />
      <ShareBar onShare={onShare} />
      {toast}
    </Page>
  );
}

/** One cause: its number and title, its practices (the first with its part of the picture), its loose stories. */
function Group({ g, n, grouped, slug, titles }: { g: SituationGroupPart; n: number; grouped: boolean; slug: string; titles: string[] }) {
  return (
    <section className="mt-10">
      <div id={g.key} className="flex scroll-mt-[calc(var(--bar-h)+8px)] items-baseline gap-3">
        <span className="num text-[26px] font-black leading-none tracking-tight text-accent lg:text-[28px]">{n}</span>
        <h2 className="text-[20px] font-extrabold leading-[1.35] text-ink lg:text-[22px]">{g.title}</h2>
      </div>
      <Practices list={g.practices} slug={slug} titles={titles} focus={g.title} />
      <Loose grouped={grouped} cards={g.cases} />
    </section>
  );
}

function Practices({ list, slug, titles, focus }: { list: PracticeCard[]; slug?: string; titles?: string[]; focus?: string }) {
  if (!list.length) return null;
  return (
    <div className="mt-3.5 grid gap-2.5">
      {list.map((p, i) => <Practice key={p.key} p={p} figure={i === 0 && slug && focus ? <GroupDrawing slug={slug} groups={titles!} focus={focus} /> : undefined} />)}
    </div>
  );
}

/** Stories in no practice: all of them before the stories are grouped, else those written since. */
function Loose({ grouped, cards }: { grouped: boolean; cards: SituationGroupPart["cases"] }) {
  if (!cards.length) return null;
  return (
    <>
      {grouped && <p className="mt-5 text-[13px] text-ink-4">最近收进来的原文</p>}
      <StoryCards cards={cards} />
    </>
  );
}
