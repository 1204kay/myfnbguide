// 参考, the site's home page (layout B1): the shop kinds and the six categories as ways in, the five situations
// the most shops shared a practice in (the first with its picture), then each category's situations as rows.
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { NAV, SITE } from "@aihot/site";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { EmptyState } from "@aihot/web/components/ui/Page";
import { PhoneBar, TabPageBar } from "@aihot/web/components/shell/PhoneBar";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { ReferenceHome } from "../types.ts";
import { Dek, Entries, Heading, Metrics, Page, SituationCards, Updated } from "./ui";

export const handle: Screen = { tab: "reference", name: "参考" };

const LEAD = "按遇到的事，查各地店家的做法和经验。每一条都附原文出处，由你自己判断。";

/**
 * The two grids of entry cards, one card size at every width (the owner, 10/5: the categories' cards were smaller
 * than the kinds'): two columns on phones, three in the 608px column, six from 961px, so the six categories fill
 * their rows (four columns left 4 + 2, and the five kinds now 4 + 1). 「团餐和宴会承办」 may wrap in six columns.
 */
const GRID = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6";

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

export default function ReferenceHomePage() {
  const data = useLoaderData<typeof loader>();
  const categories = data.categories.filter((c) => c.situations.length);
  return (
    <Page>
      {NAV.search === "shell" ? <TabPageBar title="参考" large /> : <PhoneBar title="参考" large />}
      <h1 className="hidden text-[30px] font-bold leading-[1.25] text-ink lg:block">参考</h1>
      <Dek className="lg:mt-2">{LEAD}</Dek>
      <Metrics items={[[data.totals.situations, "种情况"], [data.totals.cases, "条原文"], [data.totals.countries, "个国家"]]} />
      {!categories.length && !data.kinds.length && <EmptyState title="还没有整理好的情况">每种情况收到两家以上店家的做法以后，才会出现在这里。</EmptyState>}
      {categories.length > 0 && (
        <section className="mt-8">
          <Kicker>按遇到的事查找</Kicker>
          <Entries cols={GRID} items={categories.map((c) => ({ to: `#${c.key}`, name: c.title, count: `${c.situations.length} 种情况` }))} />
        </section>
      )}
      {data.ranking.length > 0 && (
        <section className="mt-8">
          <Kicker>店家谈得最多的事</Kicker>
          <p className="mt-1.5 text-[13px] text-ink-4">按分享过做法的店家数排列</p>
          <SituationCards rows={data.ranking} ranked />
        </section>
      )}
      {/* The situations lead (the library's body); the shop kinds follow, fewer and sparser for now (the owner, 10/5). */}
      {data.kinds.length > 0 && (
        <section className="mt-8">
          <Kicker>按店型浏览</Kicker>
          <Entries cols={GRID} items={data.kinds.map((k) => ({ to: `/reference/kinds/${k.slug}`, name: k.title, count: `${k.cases} 条原文` }))} />
        </section>
      )}
      {categories.map((c) => (
        <section key={c.key} className="mt-9">
          <Heading id={c.key} aside={`${c.situations.length} 种情况`}>{c.title}</Heading>
          <SituationCards rows={c.situations} lead={false} />
        </section>
      ))}
      <Updated at={data.updatedAt} />
    </Page>
  );
}
