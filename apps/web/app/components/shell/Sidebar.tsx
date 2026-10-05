import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { NAV, SITE } from "@aihot/site";
import { Wordmark } from "@aihot/site/brand/Logo.tsx";
import { useChangelogSeen } from "../../lib/local-state";
import { openSearch } from "../../features/search/SearchOverlay";
import { sidebar, sidebarIsActive, wayIn, type NavItem } from "./nav";
import { ThemeSwitch } from "./ThemeSwitch";
import { IconGithub, IconSearch } from "../icons";

/** True while the changelog has an entry newer than the one this reader last opened; never on a site without the dot (NAV.changelogDot). */
export function useChangelogDot(latestVersion: string | null): boolean {
  const seen = useChangelogSeen();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!NAV.changelogDot || !mounted || !latestVersion) return false;
  return !seen || seen < latestVersion;
}

/** A main entry (with its icon), or a quieter one without (the later groups of NAV.sidebar). */
function SideLink({ item, dot, quiet = false }: { item: NavItem; dot: boolean; quiet?: boolean }) {
  const { pathname, search } = useLocation();
  const isActive = sidebarIsActive(item, pathname, search);
  const Icon = item.icon;
  // Labels may wrap (a larger system font) rather than be cut off; touch screens get 44px rows.
  return (
    <Link
      to={item.to}
      prefetch="intent"
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-control px-2.5 py-1.5 leading-snug transition-colors duration-150 touch:min-h-11 ${
        quiet ? "min-h-9 text-[14px]" : `min-h-10 ${NAV.sidebar ? "text-[15px]" : "text-[14px]"}`
      } ${isActive ? "bg-accent/10 font-semibold text-ink dark:bg-accent-soft" : "font-medium text-ink-3 hover:bg-bg-sunk hover:text-ink"}`}
    >
      {!quiet && (
        <span className={`flex w-[22px] shrink-0 justify-center ${isActive ? "text-accent" : ""}`}>
          <Icon size={17} />
        </span>
      )}
      <span className="min-w-0">{item.label}</span>
      {dot && item.changelog && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-hot" aria-label="有新的更新" />}
    </Link>
  );
}

/** The shell's search (NAV.search "shell"): looks like a field, and it or "/" opens the search over the page. */
function SideSearch() {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable) return;
      event.preventDefault();
      openSearch("", button.current ?? undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <button
      ref={button}
      type="button"
      onClick={(event) => openSearch("", event.currentTarget)}
      aria-keyshortcuts="/"
      className="mb-3 flex h-10 w-full shrink-0 items-center gap-2 rounded-control bg-surface pl-3 pr-2 text-left text-[14px] text-ink-4 ring-1 ring-inset ring-line-strong transition-shadow hover:ring-ink-4 touch:h-11 dark:bg-bg-muted/60"
    >
      <IconSearch size={16} className="shrink-0" />
      <span className="min-w-0 flex-1">搜索</span>
      <kbd className="mono rounded-mark border border-line-strong bg-surface px-1.5 text-[10.5px] leading-4 text-ink-4" aria-hidden="true">/</kbd>
    </button>
  );
}

export function Sidebar({ changelogVersion }: { changelogVersion: string | null }) {
  const dot = useChangelogDot(changelogVersion);
  const foot = NAV.sidebarFoot.flatMap((to) => wayIn(to) ?? []);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[180px] shrink-0 flex-col border-r border-line bg-sidebar px-3 pb-3.5 pt-6 lg:flex">
      <Link to="/" className="mb-4 flex h-[50px] items-center px-1 text-ink" aria-label={`${SITE.name} 首页`}>
        <Wordmark size={26} />
      </Link>
      {NAV.search === "shell" && <SideSearch />}
      <nav className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1" aria-label="主导航">
        {/* The site's own groups (NAV.sidebar) are untitled, a hairline between them; the default ones carry their names. */}
        {sidebar().map((section, n) => (
          <div key={section.title ?? n} className={section.title === null && n > 0 ? "mt-2.5 border-t border-line pt-2.5" : ""}>
            {section.title && <div className="px-2.5 pb-1 pt-3.5 text-[11px] text-ink-4">{section.title}</div>}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <SideLink key={item.to} item={item} dot={dot} quiet={section.title === null && n > 0} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-2 space-y-2.5 px-1 pt-1">
        {SITE.github && (
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-1 flex h-[34px] items-center justify-center gap-1.5 rounded-full border border-line text-[12.5px] text-ink-3 transition-colors hover:bg-bg-sunk hover:text-ink"
          >
            <IconGithub size={14} />
            GitHub 开源
          </a>
        )}
        <ThemeSwitch className={NAV.themeText ? "-mx-1" : "mx-1"} />
        {foot.length > 0 && (
          <nav aria-label="站点说明" className="flex flex-wrap items-center px-1.5 text-[12.5px] leading-snug text-ink-4">
            {foot.map((item, i) => (
              <Fragment key={item.to}>
                {i > 0 && <span aria-hidden="true" className="px-1">·</span>}
                <Link to={item.to} prefetch="intent" className="inline-flex min-h-8 items-center transition-colors hover:text-ink-2 touch:min-h-11">
                  {item.label}
                </Link>
              </Fragment>
            ))}
          </nav>
        )}
        {SITE.icp && (
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="block px-2 text-[10px] text-ink-4 hover:text-ink-3">
            {SITE.icp}
          </a>
        )}
      </div>
    </aside>
  );
}
