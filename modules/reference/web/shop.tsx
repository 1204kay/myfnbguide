// One shop (layout B5): who it is in Chinese, its original name and where it is, and all its stories, newest first.
import { useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { BackRow, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import { findShopKind } from "../situations.ts";
import type { ShopPage } from "../types.ts";
import { MEASURE, Metrics, Page, StoryCards, Title, Updated } from "./ui";

export const handle: Screen = { home: "reference" };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<ShopPage>(`/api/reference/shops/${encodeURIComponent(params.key!)}`, { signal: request.signal });
}

/** The page's title: who the shop is in Chinese, or its own name in stories written before that was asked. */
const nameOf = (data: ShopPage) => data.shop.label || data.shop.name || "店家";

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这家店") }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: nameOf(data), description: data.cases[0]?.title ?? null, path: `/reference/shops/${data.key}` });
}

export default function ShopRoute() {
  const data = useLoaderData<typeof loader>();
  const { shop, cases } = data;
  const original = shop.label && shop.name ? `原名「${shop.name}」` : null;
  return (
    <Page>
      <PhoneBar back={{ to: "/", label: "参考" }} title={nameOf(data)} />
      <BackRow to="/" label="参考" />
      <div className="mt-3 lg:mt-4"><Kicker>店家</Kicker></div>
      <Title>{nameOf(data)}</Title>
      <p className={`mt-2 text-[13px] leading-[1.5] text-ink-4 [overflow-wrap:anywhere] ${MEASURE}`}>
        {[original, shop.country, shop.city, findShopKind(shop.kind)?.title, shop.size].filter(Boolean).join(" · ")}
      </p>
      <Metrics items={[[cases.length, "条原文"]]} />
      <StoryCards cards={cases} />
      <Updated at={data.updatedAt} />
    </Page>
  );
}
