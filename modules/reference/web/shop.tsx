// One shop: who it is, and its cases.
import { useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import { findShopKind } from "../situations.ts";
import type { ShopPage } from "../types.ts";
import { BackLink, Cards } from "./ui";

export const handle: Screen = { home: "reference" };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<ShopPage>(`/api/reference/shops/${encodeURIComponent(params.key!)}`, { signal: request.signal });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这家店") }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: data.shop.name ?? "店家", description: data.cases[0]?.title ?? null, path: `/reference/shops/${data.key}` });
}

export default function ShopRoute() {
  const { shop, cases } = useLoaderData<typeof loader>();
  return (
    <div className="mx-auto max-w-[760px] px-4 pb-14 lg:px-0">
      <BackLink to="/reference">参考</BackLink>
      <div className="mt-2 text-[13px] text-ink-4">{[shop.country, shop.city, findShopKind(shop.kind)?.title, shop.size].filter(Boolean).join(" · ")}</div>
      <h1 className="mt-1.5 text-[30px] font-black leading-tight tracking-tight text-ink">{shop.name}</h1>
      <Cards cards={cases} />
    </div>
  );
}
