// Site navigation in one place: the desktop sidebar's sections and the phone tab bar's tabs, the engine's
// and the site's modules'.
import type { ReactNode } from "react";
import { feedPath as featuredPath, homePage } from "@aihot/contracts/routes";
import { FEED, NAV, POLICY, subjectAfter, withSubject } from "@aihot/site";
import { webModules } from "../../site-modules";
import {
  IconBolt, IconBookmark, IconDoc, IconFlame, IconGrid, IconHeart, IconHistory, IconInfo, IconList, IconMessage, IconPlug, IconUser,
} from "../icons";

/** The list starts at 全部 (site.ts FEED.start): it is the list's way in, and the featured list's address leads there. */
const ALL_FIRST = FEED.start === "all";

/**
 * Where the list's way in leads (the tab, the sidebar, back buttons and the error page's button): the featured list
 * (contracts/routes.ts feedPath()), or 全部 on a site whose list starts there.
 */
export function feedPath(): string {
  return ALL_FIRST ? "/all" : featuredPath();
}

export interface NavItem {
  to: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  /** Match the path exactly (the home page). */
  end?: boolean;
  /** Also lit on the pages under this address: a module's way in to the page the site shows at / keeps its own pages. */
  within?: string;
  /** Shows the unread dot while the changelog has news. */
  changelog?: boolean;
}

const SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "内容",
    items: [
      ...(ALL_FIRST ? [] : [{ to: feedPath(), label: "精选", icon: IconBolt, end: true }]),
      { to: "/all", label: subjectAfter("全部", "动态"), icon: IconList },
      { to: "/hot", label: "热点榜", icon: IconFlame },
      { to: "/daily", label: withSubject("日报"), icon: IconDoc },
      { to: "/topics", label: "主题", icon: IconGrid },
      { to: "/starred", label: "收藏", icon: IconBookmark },
    ],
  },
  {
    title: "更多",
    items: [
      { to: "/agent", label: "Agent 接入", icon: IconPlug },
      { to: "/about", label: "关于", icon: IconHeart },
      { to: "/changelog", label: "更新日志", icon: IconHistory, changelog: true },
      { to: "/feedback", label: "反馈", icon: IconMessage },
    ],
  },
];

/** Pages the navigation names besides its entries: the sidebar's foot and the 我的 page (NAV.sidebarFoot, NAV.meGroups). */
const POLICIES: NavItem[] = [
  { to: "/terms", label: POLICY.terms.name, icon: IconDoc },
  { to: "/privacy", label: "隐私说明", icon: IconInfo },
];

/** Whether a way in appears in the navigation at all (site.ts NAV.hidden): its page still opens. */
export function navShown(to: string): boolean {
  return !NAV.hidden.includes(to);
}

/** A way in under the name the site gives it (site.ts NAV.labels). */
function named<T extends { to: string; label: string }>(item: T): T {
  const label = NAV.labels[item.to];
  return label ? { ...item, label } : item;
}

/** A module's way in to the page the site shows at / (NAV.home) leads to /, and stays lit on the pages under its address. */
function homeward<T extends { to: string }>(item: T): T & { end?: boolean; within?: string } {
  const page = homePage()?.page;
  return page && item.to === `/${page.path}` ? { ...item, to: "/", end: true, within: item.to } : item;
}

/** A module's sidebar entries, as the site places them. */
const moduleItems = (items: NavItem[]) => items.map(homeward);

/** A way in by its address, under the site's name for it (NAV.sidebar, NAV.sidebarFoot, NAV.meGroups); undefined when nothing offers it. */
export function wayIn(to: string): NavItem | undefined {
  const item = [...SECTIONS.flatMap((s) => s.items), ...webModules().flatMap((m) => moduleItems(m.sidebar?.items ?? [])), ...POLICIES].find((i) => i.to === to);
  return item && named(item);
}

/** What the navigation calls a page (back buttons, the error page's buttons). */
export function navName(to: string): string {
  return wayIn(to)?.label ?? to;
}

/**
 * The sidebar. By default the engine's sections with the modules' between 内容 and 更多, a module naming a
 * section that is already there adding to it; or the groups the site lists, untitled (NAV.sidebar). The site
 * may hide some and rename others (NAV).
 */
export function sidebar(): Array<{ title: string | null; items: NavItem[] }> {
  if (NAV.sidebar) {
    return NAV.sidebar
      .map((group) => ({ title: null, items: group.filter(navShown).flatMap((to) => wayIn(to) ?? []) }))
      .filter((s) => s.items.length > 0);
  }
  const [content, ...rest] = SECTIONS;
  const more = rest.pop()!;
  const sections = [content!, ...rest].map((s) => ({ ...s, items: [...s.items] }));
  for (const m of webModules()) {
    if (!m.sidebar) continue;
    const items = moduleItems(m.sidebar.items);
    const section = sections.find((s) => s.title === m.sidebar!.section);
    if (section) section.items.push(...items);
    else sections.push({ title: m.sidebar.section, items });
  }
  return [...sections, more]
    .map((s) => ({ ...s, items: s.items.filter((i) => navShown(i.to)).map(named) }))
    .filter((s) => s.items.length > 0);
}

/** A search from the shell's own field (NAV.search "shell"): its results are no entry's page, so neither the sidebar nor the tab bar lights. */
export function shellSearch(pathname: string, search: string): boolean {
  return NAV.search === "shell" && (pathname === "/all" || pathname.startsWith("/all/")) && !!new URLSearchParams(search).get("q");
}

/**
 * A sidebar entry is lit on its pages; 日报 also covers weekly and monthly reports. While 全部动态 is not in
 * the navigation (NAV.hidden), its pages light 精选, which switches to it; a search from the shell's own field
 * (NAV.search) lights nothing.
 */
export function sidebarIsActive(item: NavItem, pathname: string, search = ""): boolean {
  const under = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
  if (shellSearch(pathname, search)) return false;
  if (item.to === "/daily") return /^\/(daily|weekly|monthly)(\/|$)/.test(pathname);
  if (item.to === feedPath() && !navShown("/all") && under("/all")) return true;
  if (item.within && under(item.within)) return true;
  return item.end ? pathname === item.to : under(item.to);
}

/**
 * The phone tab bar: 全部 lives beside 精选 as a switch (or is the list's tab itself, FEED.start), 热点 and 日报
 * are tabs, and "我的" at /more holds 收藏, 外观, the tools and the site's own pages. Which tab a page sits under
 * is declared by the page itself (components/shell/screens.ts).
 */
export type TabKey =
  | "featured"
  | "hot"
  | "daily"
  | "me"
  // A module's tab.
  | (string & {});

export interface Tab {
  key: TabKey;
  to: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  changelog?: boolean;
}

const ENGINE_TABS: Tab[] = [
  // The list's tab: as the sidebar names 全部 where the list starts there.
  ALL_FIRST ? { key: "featured", to: "/all", label: subjectAfter("全部", "动态"), icon: IconList } : { key: "featured", to: feedPath(), label: "精选", icon: IconBolt },
  { key: "hot", to: "/hot", label: "热点", icon: IconFlame },
  { key: "daily", to: "/daily", label: "日报", icon: IconDoc },
  { key: "me", to: "/more", label: "我的", icon: IconUser, changelog: true },
];

/** The tab bar: the engine's, the modules' before 我的; or the ones the site lists, in its order (NAV.tabs). */
export function tabs(): Tab[] {
  const all = [...ENGINE_TABS.slice(0, -1), ...webModules().flatMap((m) => (m.tabs ?? []).map(homeward)), ENGINE_TABS.at(-1)!];
  return (NAV.tabs ? NAV.tabs.flatMap((key) => all.filter((t) => t.key === key)) : all).map(named);
}
