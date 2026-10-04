// One shop kind (按品类浏览): its cases, newest first.
import { useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { beijingDate } from "@aihot/contracts/time";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { KindPage } from "../types.ts";
import { BackLink, Cards, Metrics } from "./ui";

export const handle: Screen = { tab: "reference" };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<KindPage>(`/api/reference/kinds/${encodeURIComponent(params.slug!)}`, { signal: request.signal });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这个品类") }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: data.title, description: data.dek, path: `/reference/kinds/${data.slug}` });
}

export default function KindRoute() {
  const k = useLoaderData<typeof loader>();
  const updated = k.metrics.updatedAt ? beijingDate(k.metrics.updatedAt).split("-").map(Number) : null;
  return (
    <div className="mx-auto max-w-[760px] px-4 pb-14 lg:px-0">
      <BackLink to="/reference">参考</BackLink>
      <div className="mt-2 text-[13px] text-ink-4">参考 · 按品类浏览</div>
      <h1 className="mt-1.5 text-[30px] font-black leading-tight tracking-tight text-ink">{k.title}</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-ink-3">{k.dek}</p>
      <Metrics items={[[k.metrics.cases, "条原文"], [k.metrics.countries, "个国家"]]} note={updated ? `${updated[0]} 年 ${updated[1]} 月 ${updated[2]} 日更新` : null} />
      <Cards cards={k.cases} />
    </div>
  );
}
