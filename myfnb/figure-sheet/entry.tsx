// 图的总览（sheet.ts）的渲染入口：sheet.ts 用 rolldown 把它和页面上实际的组件（figures.tsx、ui.tsx）打包，在 Node 里
// 用 renderToStaticMarkup 渲染成 HTML 片段。外面那一层照页面上图所在的位置写（类名抄自对应页面，所以样式表里都有）。
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { figureKind, GroupDrawing, SituationDrawing, SituationFigure } from "../../modules/reference/web/figures";
import { StoryBlock } from "../../modules/reference/web/ui";
import { SITUATIONS } from "../../modules/reference/situations.ts";
import type { Block } from "../../modules/reference/types.ts";

const html = (node: ReactNode) => renderToStaticMarkup(<>{node}</>);

/** 每种情况：情况名、各组（情况页图卡下的编号列表）、图是「举例」还是「示意」（没有图为 null）、是否按原因组画。 */
export const situations = SITUATIONS.map((s) => {
  const groups = s.groups.map((g) => g.title);
  return {
    slug: s.slug,
    title: s.title,
    groups: s.groups.map((g) => ({ title: g.title, line: g.line })),
    kind: figureKind(s.slug),
    grouped: groups.length > 0 && html(<GroupDrawing slug={s.slug} groups={groups} focus={groups[0]!} />) !== "",
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

/**
 * 一组突出时的图（GroupDrawing focus）。`practice`：做法卡第一张上的图（ui.tsx Practice：手机在卡片最上面，≥ 961 在
 * 右侧 280px 一栏，最高 220px）；`rows`：这一组没有做法卡、只有单店做法行时，放在行卡最上面（ui.tsx ShopRows，最宽 360px）。
 */
export function groupFigure(slug: string, focus: string, place: "practice" | "rows"): string {
  const titles = SITUATIONS.find((x) => x.slug === slug)!.groups.map((g) => g.title);
  const drawing = <GroupDrawing slug={slug} groups={titles} focus={focus} />;
  return html(
    place === "practice" ? (
      <article className="card px-4 pb-1 pt-3.5 sm:px-5 lg:pt-[18px]">
        <div className="lg:flex lg:gap-6">
          <div className="mx-auto mb-3 max-w-[360px] empty:hidden [&_svg]:max-h-[220px] lg:order-2 lg:mb-0 lg:w-[280px] lg:shrink-0">{drawing}</div>
        </div>
      </article>
    ) : (
      <div className="card overflow-hidden">
        <div className="mx-auto max-w-[360px] px-4 pt-4 empty:hidden [&_svg]:max-h-[220px]">{drawing}</div>
      </div>
    ),
  );
}

/** 故事里程序画的图（原文数据图、举例算例），用故事页实际的组件。 */
export function storyFigure(block: Block): string {
  return html(<StoryBlock block={block} />);
}
