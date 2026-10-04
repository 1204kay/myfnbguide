// 参考: the situations that have cases, by the six groups, and the shops.
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { EmptyState } from "@aihot/web/components/ui/Page";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { ReferenceHome } from "../types.ts";
import { Metrics } from "./ui";

export const handle: Screen = { tab: "reference", name: "参考" };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return loadOr404<ReferenceHome>("/api/reference", { signal: request.signal });
}

export function meta() {
  return pageMeta({ title: "参考", description: "按遇到的事，查各地店家的做法和经验。每一条都附原文出处，由你自己判断。", path: "/reference" });
}

export default function ReferenceHomePage() {
  const data = useLoaderData<typeof loader>();
  const categories = data.categories.filter((c) => c.situations.length);
  return (
    <div className="mx-auto max-w-[760px] px-4 pb-14 pt-6 lg:px-0">
      <h1 className="text-[30px] font-black leading-tight tracking-tight text-ink">参考</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-ink-3">按遇到的事，查各地店家的做法和经验。每一条都附原文出处，由你自己判断。</p>
      <Metrics items={[[data.totals.situations, "种情况"], [data.totals.cases, "条原文"], [data.totals.countries, "个国家"]]} />
      {!categories.length && <EmptyState title="还没有整理好的情况">每个情况收到两家以上店家的做法以后，才会出现在这里。</EmptyState>}
      {categories.map((c) => (
        <section key={c.key} className="mt-9">
          <Kicker>{c.title}</Kicker>
          <div className="mt-3.5 grid gap-2.5">
            {c.situations.map((s) => (
              <Link key={s.slug} viewTransition to={`/reference/${s.slug}`} className="card block px-[18px] py-4 transition-colors hover:border-accent">
                <span className="block text-[12.5px] text-ink-4">{s.cases} 条原文 · {s.countries} 个国家</span>
                <b className="mt-1 block text-[16px] leading-snug text-ink">{s.title}</b>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">{s.dek}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {data.shops.length > 0 && (
        <section className="mt-10">
          <Kicker>按店逛</Kicker>
          <div className="mt-3.5 grid gap-2.5">
            {data.shops.map((s) => (
              <Link key={s.key} viewTransition to={`/reference/shops/${s.key}`} className="card block px-[18px] py-4 transition-colors hover:border-accent">
                <span className="block text-[12.5px] text-ink-4">{s.src}</span>
                <b className="mt-1 block text-[16px] leading-snug text-ink">{s.name}</b>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-3">{s.line}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
