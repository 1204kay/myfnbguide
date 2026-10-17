// 图的总览（sheet.ts）的渲染入口：sheet.ts 用 rolldown 把它和页面上实际的组件（figures.tsx、ui.tsx）打包，在 Node 里
// 用 renderToStaticMarkup 渲染成 HTML 片段。外面那一层照页面上图所在的位置写（类名抄自对应页面，所以样式表里都有）。
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { figureKind, hasSectionFigure, SectionFigure, SituationDrawing, SituationFigure } from "../../modules/reference/web/figures";
import { StoryBlock } from "../../modules/reference/web/ui";
import { SITUATIONS } from "../../modules/reference/situations.ts";
import type { Block } from "../../modules/reference/types.ts";

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>);

/** 每种情况：情况名、各组（情况页图卡下的编号列表；有自己的分节图的组带 key）、图是「举例」还是「示意」（没有图为 null）。 */
export const situations = SITUATIONS.map((s) => {
  return {
    slug: s.slug,
    title: s.title,
    groups: s.groups.map((g) => ({ key: g.key, title: g.title, line: g.line, drawn: hasSectionFigure(s.slug, g.key) })),
    kind: figureKind(s.slug),
  };
});

/**
 * 情况页的图卡：小标签、图、图下的标注，有两组以上时接编号原因列表（照 situation.tsx 里不可点的那一种写；页面上的
 * 列表只列有内容的组，这里列 situations.ts 的全部组）。
 */
export function situationCard(slug: string): string {
  const s = SITUATIONS.find((x) => x.slug === slug)!;
  const titles = s.groups.map((g) => g.title);
  return html(
    <SituationFigure slug={slug} groups={titles}>
      {s.groups.length > 1 && (
        <ol className="mt-3">
          {s.groups.map((g, i) => (
            <li key={g.key} className="border-t border-line first:border-t-0">
              <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 py-3">
                <span className="num text-[26px] font-black leading-none tracking-tight text-accent lg:text-[28px]">{i + 1}</span>
                <span><b className="block text-[16px] font-[650] leading-snug text-ink">{g.title}</b><span className="text-[13px] text-ink-3">{g.line}</span></span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SituationFigure>,
  );
}

/** 参考首页第 1 名大卡里放图的一栏（home.tsx Lead）：图最高 200px，≥ 1280 时宽 260px，图下写「举例」或「示意」。 */
export function homeColumn(slug: string): string {
  const kind = figureKind(slug);
  return html(
    <article className="card p-4 sm:p-5 lg:p-6">
      <div className="mx-auto w-full max-w-[360px] [&_svg]:max-h-[200px] xl:w-[260px]">
        <SituationDrawing slug={slug} />
        {kind && <p className={`mt-2 text-[13px] font-semibold ${kind === "举例" ? "text-ink-3" : "text-accent"}`}>{kind}</p>}
      </div>
    </article>,
  );
}

/** 情况页一节自己的图（situation.tsx：节标题下面一张图卡，和情况页图卡同一个框）。 */
export function sectionFigure(slug: string, key: string): string {
  return html(<SectionFigure slug={slug} group={key} />);
}

/** 故事里程序画的图（原文数据图、举例算例），用故事页实际的组件。 */
export function storyFigure(block: Block): string {
  return html(<StoryBlock block={block} />);
}
