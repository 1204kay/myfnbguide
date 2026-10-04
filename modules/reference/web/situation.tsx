// One situation: its picture, its groups with the cases in each, and what was placed without a group.
import { useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { beijingDate } from "@aihot/contracts/time";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { SituationPage } from "../types.ts";
import { SituationFigure } from "./figures";
import { BackLink, Cards, Metrics } from "./ui";

export const handle: Screen = { tab: "reference" };

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
  const groups = s.groups.filter((g) => g.cases.length);
  const updated = s.metrics.updatedAt ? beijingDate(s.metrics.updatedAt).split("-").map(Number) : null;
  return (
    <div className="mx-auto max-w-[760px] px-4 pb-14 lg:px-0">
      <BackLink to="/reference">参考</BackLink>
      <div className="mt-2 text-[13px] text-ink-4">参考 · {s.category.title}</div>
      <h1 className="mt-1.5 text-[30px] font-black leading-tight tracking-tight text-ink">{s.title}</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-ink-3">{s.dek}</p>
      <Metrics items={[[s.metrics.cases, "条原文"], [s.metrics.countries, "个国家"]]} note={updated ? `${updated[0]} 年 ${updated[1]} 月 ${updated[2]} 日更新` : null} />
      <SituationFigure slug={s.slug} groups={groups.map((g) => g.title)}>
        {groups.length > 1 && (
          <ol className="mt-2">
            {groups.map((g, i) => (
              <li key={g.key}>
                <a href={`#${g.key}`} className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 border-t border-line py-3 first:border-t-0">
                  <span className="num text-[26px] font-black leading-none tracking-tight text-accent">{i + 1}</span>
                  <span><b className="block text-[16px] leading-snug text-ink">{g.title}</b><span className="text-[13px] text-ink-3">{g.line}</span></span>
                </a>
              </li>
            ))}
          </ol>
        )}
      </SituationFigure>
      {groups.map((g, i) => (
        <section key={g.key} id={g.key} className="mt-9 scroll-mt-6">
          <div className="flex items-baseline gap-3">
            {groups.length > 1 && <span className="num text-[28px] font-black leading-none tracking-tight text-accent">{i + 1}</span>}
            <h2 className="text-[22px] font-black leading-snug tracking-tight text-ink">{g.title}</h2>
          </div>
          <p className="mt-1.5 text-[14.5px] text-ink-3">{g.line}</p>
          <Cards cards={g.cases} />
        </section>
      ))}
      {s.others.length > 0 && (
        <section className="mt-9">
          <h2 className="text-[22px] font-black leading-snug tracking-tight text-ink">其他做法</h2>
          <Cards cards={s.others} />
        </section>
      )}
    </div>
  );
}
