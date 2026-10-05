import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import type { ItemAvailability } from "@aihot/contracts/site";
import { beijingDate } from "@aihot/contracts/time";
import { FEED, LAYOUT, NAV, SITE, STARRED } from "@aihot/site";
import { Presence } from "../components/ui/Presence";
import { SelectedBadge } from "../components/ui/Badge";
import { edgeTtl } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import { exportBundle, importBundle, removeStar, useStarred, type ImportReport, type LocalStarredItem } from "../lib/local-state";
import { fullDateTime, monthDay } from "../lib/format";
import { IconBookmark, IconDownload, IconClose } from "../components/icons";
import { readSnapshot, restoreAnchor, useSaveOnLeave } from "../lib/restore";
import { PhoneBar } from "../components/shell/PhoneBar";
import { feedPath, navName } from "../components/shell/nav";
import type { Screen } from "../components/shell/screens";
import { LIST_CARD, StarButton } from "../features/feed/parts";
import { webModules } from "../site-modules";

export const handle: Screen = { tab: "me", name: "收藏" };

/**
 * The page with a 备份 section (site.ts STARRED.backup): the note on where stars are kept is one quiet line under the
 * title, and exporting and importing sit at the page's foot instead of beside the title.
 */
const BACKUP = STARRED.backup;

export function headers() {
  return edgeTtl(300);
}

export function meta() {
  return pageMeta({ title: "收藏", description: `保存在这台设备上的 ${SITE.name} 收藏。`, path: "/starred", noindex: true });
}

function reportText(r: ImportReport): string {
  const parts = [`新增收藏 ${r.starredAdded} 条`, `已读记录 ${r.readAdded} 条`];
  if (r.starredSkipped || r.readSkipped) parts.push(`超出上限或格式不对而跳过 ${r.starredSkipped + r.readSkipped} 条`);
  if (r.themeApplied) parts.push("已沿用导入的深浅色设置");
  if (r.readFailed) parts.push("已读记录没能保存（浏览器存储已满或不可用）");
  return parts.join("，");
}

/** A star as a list card (site.ts FEED.style "cards"): its source, the original's date and 精选 as on the lists, the bookmark to remove it. */
function StarCard({ s, current, children }: { s: LocalStarredItem; current: ItemAvailability | undefined; children: ReactNode }) {
  const unavailable = current?.status === "unavailable";
  const sourceName = current?.sourceName ?? s.sourceName;
  return (
    <li data-card-key={s.id} className={`${LIST_CARD} ${unavailable ? "opacity-70" : ""}`}>
      <div className="flex min-h-6 items-center gap-1.5 text-[13px] leading-[18px] text-ink-4">
        <span className="min-w-0 truncate">{sourceName}</span>
        {s.publishedAt && (
          <time dateTime={s.publishedAt} className="shrink-0 whitespace-nowrap">
            · {monthDay(beijingDate(s.publishedAt))}
          </time>
        )}
        {s.aiSelected && <span className="ml-1 inline-flex"><SelectedBadge /></span>}
        <span className="-my-2.5 -mr-3 ml-auto inline-flex shrink-0 pl-1">
          <StarButton
            item={{ id: s.id, title: s.title, summary: s.summary, source: { name: sourceName }, publishedAt: s.publishedAt, score: s.score, selected: s.aiSelected }}
            className="size-11"
          />
        </span>
      </div>
      <h2 className="mt-1.5 text-[16px] font-[650] leading-[1.5] text-ink lg:text-[17px]">
        {unavailable ? (
          s.title
        ) : (
          <Link viewTransition to={`/items/${s.id}`} className="after:absolute after:inset-0 after:content-['']">
            {s.title}
          </Link>
        )}
      </h2>
      {s.summary && <p className="mt-1 line-clamp-3 text-[14.5px] leading-[1.7] text-ink-3 lg:text-[15px]">{s.summary}</p>}
      {children}
    </li>
  );
}

export default function StarredPage() {
  const starred = useStarred();
  const [mounted, setMounted] = useState(false);
  const [availability, setAvailability] = useState<Record<string, ItemAvailability>>({});
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setMounted(true), []);

  const starredIds = starred.map((s) => s.id).join(",");
  useEffect(() => {
    if (!mounted || !starredIds) return;
    const controller = new AbortController();
    // Batches of 100: a request line with all 500 ids is longer than the front servers accept.
    const ids = starredIds.split(",");
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100));
    Promise.all(
      batches.map((batch) =>
        fetch(`/api/site/items/availability?ids=${encodeURIComponent(batch.join(","))}`, { signal: controller.signal })
          .then((r) => (r.ok ? (r.json() as Promise<Record<string, ItemAvailability>>) : {}))
          .catch(() => ({})),
      ),
    ).then((parts) => {
      if (!controller.signal.aborted) setAvailability(Object.assign({}, ...parts));
    });
    return () => controller.abort();
  }, [mounted, starredIds]);

  // Back from an item: the list renders only after mounting (it lives in this browser), so the
  // position comes back once it is there, by the same card anchor the other lists use.
  const historyKey = useLocation().key;
  useLayoutEffect(() => {
    if (!mounted || starred.length === 0) return;
    const snap = readSnapshot<null>(historyKey);
    if (snap) restoreAnchor(snap.anchor, snap.scrollY);
  }, [mounted, historyKey]);
  useSaveOnLeave(historyKey, () => null);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportBundle(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${SITE.mcpPrefix}-local-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const report = importBundle(await file.text());
      setNotice({ kind: report.readFailed ? "error" : "ok", text: `导入完成：${reportText(report)}` });
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "导入失败" });
    }
  };

  // Imports from elsewhere that the site's modules offer.
  const importFrom = (run: () => Promise<{ ok: boolean; text: string }>) =>
    run().then(
      (r) => setNotice({ kind: r.ok ? "ok" : "error", text: r.text }),
      (err: Error) => setNotice({ kind: "error", text: err.message }),
    );

  const action = "text-[12.5px] text-ink-3 transition-colors hover:text-accent";
  const button = "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-4 text-[14px] text-ink-2 transition-colors hover:border-accent hover:text-accent active:bg-bg-sunk lg:min-h-9 touch:min-h-11";
  const moduleImports = webModules().flatMap((m) => m.starredImports ?? []);
  const fileInput = <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => doImport(e.target.files?.[0])} />;
  const noticeBox = (
    <Presence show={!!notice} enter="anim-notice-in" exit="anim-fade-out" duration={160}>
      <div
        role="status"
        className={`mt-3 flex items-start justify-between gap-3 rounded-tile px-4 py-2.5 text-[13px] ${notice?.kind === "ok" ? "bg-accent-soft text-accent-ink dark:text-accent" : "bg-hot-soft text-hot"}`}
      >
        {notice?.text}
        <button type="button" aria-label="关闭" onClick={() => setNotice(null)} className="shrink-0 opacity-70 hover:opacity-100">
          <IconClose size={14} />
        </button>
      </div>
    </Presence>
  );
  // Nothing starred: where to find something. Beside a module home page (site.ts NAV.home), both ways in.
  const ways = NAV.home ? ["/", feedPath()] : [];
  const empty = (
    <div className="mt-3 flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
      <IconBookmark size={20} className="text-ink-4" />
      <p className="mt-3 text-[13px] text-ink-3">{STARRED.empty}</p>
      {ways.length > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          {ways.map((to, i) => (
            <Link key={to} to={to} className={i === 0 ? "inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-[14px] font-medium text-accent-contrast transition-colors hover:bg-accent-ink lg:min-h-9 touch:min-h-11" : button}>
              去{navName(to)}
            </Link>
          ))}
        </div>
      ) : (
        <Link to={feedPath()} className="mt-4 text-[12.5px] font-medium text-accent hover:text-accent-ink">
          去看{navName(feedPath())} →
        </Link>
      )}
    </div>
  );

  return (
    <div className="mx-auto pb-12" style={LAYOUT.column ? { maxWidth: LAYOUT.column } : undefined}>
      <PhoneBar back={{ to: "/more", label: "我的" }} title="收藏" />
      {BACKUP ? (
        <header className="pb-4 pt-3 lg:pt-1">
          <h1 data-page-title="" className="text-[26px] font-bold leading-[1.3] tracking-[-0.01em] text-ink lg:text-[30px]">收藏</h1>
          {STARRED.lead && <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{STARRED.lead}</p>}
          <p className="mt-2 text-[13px] leading-relaxed text-ink-4">{STARRED.note}</p>
        </header>
      ) : (
        <>
          <header className="flex flex-col gap-2 pb-4 pt-3 sm:flex-row sm:items-start sm:justify-between lg:pt-1">
            <div>
              <h1 data-page-title="" className="text-[24px] font-semibold leading-[1.3] text-ink">收藏</h1>
              {STARRED.lead && <p className="mt-1.5 text-[13px] text-ink-3">{STARRED.lead}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:pt-1.5">
              {moduleImports.map((i) => (
                <button key={i.label} type="button" onClick={() => importFrom(i.run)} className={action}>
                  {i.label}
                </button>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()} className={action}>
                导入文件
              </button>
              {mounted && starred.length > 0 && (
                <button type="button" onClick={doExport} className={`${action} inline-flex items-center gap-1`}>
                  <IconDownload size={13} /> 导出
                </button>
              )}
              {fileInput}
            </div>
          </header>
          <p className="rounded-tile border border-line bg-surface px-4 py-2.5 text-[12.5px] text-ink-3">{STARRED.note}</p>
          {noticeBox}
        </>
      )}
      {!mounted ? null : starred.length === 0 ? (
        empty
      ) : (
        <ul className={`${FEED.style === "cards" ? "space-y-2.5" : "lg:space-y-3"} ${BACKUP ? "" : "mt-3"}`}>
          {starred.map((s) => {
            const current = availability[s.id];
            const status = current?.status;
            const unavailable = status === "unavailable";
            const notes = (
              <>
                {unavailable && <p className="mt-2 text-[12.5px] text-hot">这条内容已不再公开，收藏会保留直到你手动移除。</p>}
                {status === "summary-only" && <p className="mt-2 text-[12.5px] text-amber-ink">应来源方要求，这条内容现在只提供摘要。</p>}
              </>
            );
            if (FEED.style === "cards") return <StarCard key={s.id} s={s} current={current}>{notes}</StarCard>;
            return (
              <li key={s.id} data-card-key={s.id} className={`relative border-b border-line-soft py-4 lg:card lg:px-[18px] lg:py-[15px] ${unavailable ? "opacity-70" : "lg:card-hover"}`}>
                <div className="flex items-center gap-2 text-[12.5px] text-ink-4">
                  <span className="min-w-0 truncate text-ink-3">{current?.sourceName ?? s.sourceName}</span>
                  {s.publishedAt && <span className="num shrink-0">· {fullDateTime(s.publishedAt)}</span>}
                  <span className="ml-auto hidden shrink-0 sm:inline">
                    收藏于 <span className="num">{fullDateTime(s.savedAt)}</span>
                  </span>
                  <button type="button" aria-label="取消收藏" title="取消收藏" onClick={() => removeStar(s.id)} className="relative z-10 -my-1 ml-auto grid size-7 shrink-0 place-items-center rounded-full text-ink-4 transition-colors hover:bg-bg-sunk hover:text-ink sm:ml-0">
                    <IconClose size={14} />
                  </button>
                </div>
                <h2 className="mt-1.5 text-[16px] font-[650] leading-[1.55] text-ink">
                  {unavailable ? (
                    s.title
                  ) : (
                    <Link viewTransition to={`/items/${s.id}`} className="transition-colors after:absolute after:inset-0 after:content-[''] hover:text-accent">
                      {s.title}
                    </Link>
                  )}
                </h2>
                {s.summary && <p className="mt-1.5 line-clamp-2 text-[14px] leading-[1.75] text-ink-3">{s.summary}</p>}
                {notes}
              </li>
            );
          })}
        </ul>
      )}
      {BACKUP && (
        <section className="mt-10 border-t border-line pt-5">
          <h2 className="text-[15px] font-semibold text-ink">备份</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {moduleImports.map((i) => (
              <button key={i.label} type="button" onClick={() => importFrom(i.run)} className={button}>
                {i.label}
              </button>
            ))}
            {mounted && starred.length > 0 && (
              <button type="button" onClick={doExport} className={button}>
                <IconDownload size={15} /> 导出收藏
              </button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className={button}>
              从文件导入
            </button>
            {fileInput}
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-4">{BACKUP}</p>
          {noticeBox}
        </section>
      )}
    </div>
  );
}
