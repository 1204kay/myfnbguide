import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { LAYOUT, NAV, POLICY, SITE } from "@aihot/site";
import type { loader as rootLoader } from "../root";
import { useChangelogDot } from "../components/shell/Sidebar";
import { PhoneBar, TabPageBar } from "../components/shell/PhoneBar";
import { navShown, wayIn } from "../components/shell/nav";
import type { Screen } from "../components/shell/screens";
import { edgeTtl } from "../lib/api.server";
import { webModules } from "../site-modules";
import { pageMeta } from "../lib/seo";
import { useStarred } from "../lib/local-state";
import { ThemeSwitch } from "../components/shell/ThemeSwitch";
import { IconBookmark, IconChevronRight, IconGrid, IconHeart, IconMessage, IconMoon, IconPlug, IconSparkles } from "../components/icons";

export const handle: Screen = { tab: "me", name: "我的" };

export function headers() {
  return edgeTtl(300);
}

export function meta() {
  return pageMeta({ title: "我的", path: "/more", noindex: true });
}

/**
 * "我的", the phone's last tab (the address stays /more): this browser's bookmarks and appearance first,
 * then the tools, then the site's own pages; or the groups the site lists (NAV.meGroups), one column on
 * desktops too.
 */
type Row = { to: string; label: string; icon: ReactNode; detail?: ReactNode };

/** The ways in that the agent page offers, the modules' first; its row names the first three. */
const agentWays = () => [...webModules().flatMap((m) => m.agentWays ?? []), "MCP", "RSS", "API"];

/** The modules' tools first, then the engine's. */
const tools = (): Row[] => [
  ...webModules().flatMap((m) => m.tools ?? []),
  { to: "/topics", label: "主题", icon: <IconGrid size={20} /> },
  { to: "/agent", label: "Agent 接入", icon: <IconPlug size={20} />, detail: agentWays().slice(0, 3).join(" · ") },
];

function Group({ title, children }: { title?: string | null; children: ReactNode }) {
  return (
    <section>
      {title && <h2 className="px-4 pb-2 pt-6 text-[13px] font-semibold text-ink-3">{title}</h2>}
      <ul className="card divide-y divide-line-soft overflow-hidden">{children}</ul>
    </section>
  );
}

/** A row of the page; none for a way in the site hides from its navigation (site.ts NAV.hidden). */
function RowLink({ row, dot = false }: { row: Row; dot?: boolean }) {
  if (!navShown(row.to)) return null;
  return (
    <li>
      <Link viewTransition to={row.to} className="flex min-h-[52px] items-center gap-3 px-4 text-[16px] font-medium text-ink transition-colors active:bg-bg-sunk lg:hover:bg-bg-sunk">
        <span className="text-ink-3">{row.icon}</span>
        <span className="flex flex-1 items-center gap-2">
          {row.label}
          {dot && <span className="size-[7px] rounded-full bg-hot" aria-label="有新的更新" />}
        </span>
        {row.detail && <span className="text-[14px] font-normal text-ink-4">{row.detail}</span>}
        <IconChevronRight size={16} className="text-ink-4" />
      </Link>
    </li>
  );
}

function Appearance() {
  return (
    <li className="flex min-h-[56px] items-center gap-3 px-4 text-[16px] font-medium text-ink">
      <span className="text-ink-3">
        <IconMoon size={20} />
      </span>
      <span className="flex-1">外观</span>
      <ThemeSwitch className={NAV.themeText ? "" : "w-[126px] touch:w-[136px]"} />
    </li>
  );
}

export default function MorePage() {
  const root = useRouteLoaderData<typeof rootLoader>("root");
  const changelogDot = useChangelogDot(root?.changelogVersion ?? null);
  const starred = useStarred();
  // The count is this browser's: shown once the page runs here, never in the shared server copy.
  const [here, setHere] = useState(false);
  useEffect(() => setHere(true), []);
  const count = here && starred.length > 0 ? <span className="num">{starred.length}</span> : undefined;
  const bar = NAV.search === "shell" ? <TabPageBar title="我的" large /> : <PhoneBar title="我的" large />;
  const outside = (SITE.github || SITE.icp) && (
    <>
      {SITE.github && <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="hover:text-ink-2">GitHub 开源</a>}
      {SITE.icp && <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-ink-2">{SITE.icp}</a>}
    </>
  );

  if (NAV.meGroups) {
    return (
      <div className="mx-auto max-w-[var(--page-max-reading)] pb-8" style={LAYOUT.column ? { maxWidth: LAYOUT.column } : undefined}>
        {bar}
        <h1 className="hidden pb-4 pt-1 text-[30px] font-bold leading-[1.25] text-ink lg:block">我的</h1>
        {NAV.meGroups.map((group, i) => (
          <Group key={group.title ?? i} title={group.title}>
            {group.rows.map((to) => {
              if (to === "theme") return <Appearance key={to} />;
              const way = wayIn(to);
              if (!way) return null;
              const Icon = way.icon;
              return <RowLink key={to} row={{ to, label: way.label, icon: <Icon size={20} />, detail: to === "/starred" ? count : undefined }} dot={changelogDot && !!way.changelog} />;
            })}
          </Group>
        ))}
        {outside && <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] leading-[2] text-ink-4">{outside}</div>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[var(--page-max-reading)] pb-8">
      {bar}
      <h1 className="hidden pb-4 pt-1 text-[22px] font-bold text-ink lg:block">我的</h1>
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-4 2xl:grid-cols-3">
        <Group>
          <RowLink row={{ to: "/starred", label: "收藏", icon: <IconBookmark size={20} />, detail: count }} />
          <Appearance />
        </Group>
        <Group title="工具与入口">
          {tools().map((r) => (
            <RowLink key={r.to} row={r} />
          ))}
        </Group>
        <Group title="关于">
          <RowLink row={{ to: "/about", label: `关于 ${SITE.name}`, icon: <IconHeart size={20} /> }} />
          <RowLink row={{ to: "/changelog", label: "更新日志", icon: <IconSparkles size={20} /> }} dot={changelogDot} />
          <RowLink row={{ to: "/feedback", label: "意见反馈", icon: <IconMessage size={20} /> }} />
        </Group>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] leading-[2] text-ink-4">
        <Link viewTransition to="/terms" className="hover:text-ink-2">{POLICY.terms.name}</Link>
        <Link viewTransition to="/privacy" className="hover:text-ink-2">隐私说明</Link>
        <a href="/feed.xml" className="hover:text-ink-2">RSS</a>
        {outside}
      </div>
    </div>
  );
}
