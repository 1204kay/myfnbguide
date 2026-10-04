// One case: the scene, who it is, what happened and what they did, and the way to the original.
import { Link, useLoaderData, type LoaderFunctionArgs, type MetaArgs } from "react-router";
import { beijingDate } from "@aihot/contracts/time";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { edgeTtl, loadOr404 } from "@aihot/web/lib/api.server";
import { pageMeta, titled } from "@aihot/web/lib/seo";
import type { Screen } from "@aihot/web/components/shell/screens";
import type { CasePage } from "../types.ts";
import { BackLink, StoryBlock } from "./ui";

export const handle: Screen = { home: "reference" };

export function headers() {
  return edgeTtl(60);
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  return loadOr404<CasePage>(`/api/reference/cases/${encodeURIComponent(params.id!)}`, { signal: request.signal });
}

export function meta({ loaderData: data }: MetaArgs<typeof loader>) {
  if (!data) return [{ title: titled("没有这一篇") }, { name: "robots", content: "noindex" }];
  return pageMeta({ title: data.story.title, description: data.story.lead, path: `/reference/cases/${data.id}`, type: "article" });
}

export default function CaseRoute() {
  const c = useLoaderData<typeof loader>();
  const { story, source } = c;
  const home = c.situations[0];
  return (
    <article className="mx-auto max-w-[680px] px-4 pb-14 lg:px-0">
      {home ? <BackLink to={`/reference/${home.slug}`}>{home.title}</BackLink> : <BackLink to="/reference">参考</BackLink>}
      <Kicker className="mt-2">{home?.group ?? home?.title ?? "参考"}</Kicker>
      <h1 className="mt-3 text-[26px] font-black leading-snug tracking-tight text-ink">{story.title}</h1>
      <div className="mt-3 text-[13px] text-ink-4">
        {[story.shop.country, source.name, source.publishedAt ? beijingDate(source.publishedAt) : null].filter(Boolean).join(" · ")}
      </div>
      <p className="mt-5 text-[18px] font-semibold leading-relaxed text-ink">{story.lead}</p>
      <p className="mt-3 text-[15.5px] leading-[1.85] text-ink-2">
        {story.who}
        {c.shopKey && story.shop.name && <> <Link viewTransition to={`/reference/shops/${c.shopKey}`} className="whitespace-nowrap text-accent hover:text-accent-ink">{story.shop.name} ›</Link></>}
      </p>
      {story.parts.map((part, i) => (
        <section key={i} className="mt-8">
          <h2 className="text-[19px] font-extrabold leading-snug tracking-tight text-ink">{part.heading}</h2>
          {part.blocks.map((block, n) => <StoryBlock key={n} block={block} />)}
        </section>
      ))}
      {story.open && <p className="mt-6 text-[14px] leading-relaxed text-ink-4">{story.open}</p>}
      <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-4 text-[13px] text-ink-4">
        <span>原文{source.language ? ` · ${source.language}` : ""}{source.audioOnly ? " · 节目是音频" : ""}</span>
        <a href={source.url} target="_blank" rel="noopener" className="shrink-0 font-semibold text-accent hover:text-accent-ink">打开原文 ↗</a>
      </div>
      {c.situations.length > 1 && (
        <p className="mt-4 text-[13px] text-ink-4">
          也收在：{c.situations.slice(1).map((s) => <Link key={s.slug} viewTransition to={`/reference/${s.slug}`} className="text-accent hover:text-accent-ink">{s.title}</Link>)}
        </p>
      )}
    </article>
  );
}
