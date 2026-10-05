// One shop kind (按店型浏览, layout B4): the situations its stories are in, by category and counted for this kind
// alone, each leading to its situation narrowed to the kind; then its stories in no situation the lists show.
import { useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { BackRow, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { KindPage } from "../types.ts";
import { Dek, Entries, Heading, Metrics, Page, SituationCards, StoryCards, Title, Updated } from "./ui";

export const handle: Screen = { tab: "reference" };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<KindPage>(`/api/reference/kinds/${encodeURIComponent(params.slug!)}`, { signal: request.signal });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这个店型") }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: data.title, description: data.dek, path: `/reference/kinds/${data.slug}` });
}

export default function KindRoute() {
  const k = useLoaderData<typeof loader>();
  const countries = k.metrics.countries;
  return (
    <Page>
      <PhoneBar back={{ to: "/", label: "参考" }} title={k.title} />
      <BackRow to="/" label="参考" />
      <div className="mt-3 lg:mt-4"><Kicker>按店型浏览</Kicker></div>
      <Title>{k.title}</Title>
      <Dek>{k.dek}</Dek>
      <Metrics items={[[k.metrics.cases, "条原文"], countries.length === 1 ? countries[0]! : [countries.length, "个国家"]]} />
      {k.categories.length > 1 && (
        <div className="mt-6"><Entries cols="grid-cols-2 sm:grid-cols-4" items={k.categories.map((c) => ({ to: `#${c.key}`, name: c.title, count: `${c.situations.length} 种情况` }))} /></div>
      )}
      {k.categories.map((c) => (
        <section key={c.key} className="mt-9">
          <Heading id={c.key} aside={`${c.situations.length} 种情况`}>{c.title}</Heading>
          <SituationCards rows={c.situations} kind={k.slug} />
        </section>
      ))}
      {k.others.length > 0 && (
        <section className="mt-10">
          <Heading>{k.categories.length ? "其他原文" : "原文"}</Heading>
          {k.categories.length > 0 && <p className="mt-1 text-[13px] text-ink-4">还没有归入上面几种情况的。</p>}
          <StoryCards cards={k.others} />
        </section>
      )}
      <Updated at={k.updatedAt} />
    </Page>
  );
}
