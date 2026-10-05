import { useEffect, useState, type ReactNode } from "react";
import { NAV } from "@aihot/site";
import { IconMonitor, IconMoon, IconSun } from "../icons";
import { applyTheme, resolvedTheme, setThemePreference, useThemePreference, type ThemePreference } from "../../lib/local-state";

type Choice = "dark" | "system" | "light";

const OPTIONS: Array<{ key: Choice; label: string; icon: ReactNode }> = [
  { key: "dark", label: "深色", icon: <IconMoon size={14} /> },
  { key: "system", label: "跟随系统", icon: <IconMonitor size={14} /> },
  { key: "light", label: "浅色", icon: <IconSun size={14} /> },
];

/** Written out (NAV.themeText), the choices read in the order people say them. */
const WORDS: Choice[] = ["light", "dark", "system"];

/**
 * Three-way appearance switch (dark / follow the system / light): icons with a sliding thumb, or the three
 * words (NAV.themeText), each as wide as it needs. Touch screens get 44px-high choices.
 */
export function ThemeSwitch({ className = "" }: { className?: string }) {
  const pref = useThemePreference();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current: Choice = !mounted ? "system" : (pref ?? "system");
  const index = OPTIONS.findIndex((o) => o.key === current);

  const choose = (key: Choice) => {
    const nextPref: ThemePreference = key === "system" ? null : key;
    const apply = () => {
      setThemePreference(nextPref);
      applyTheme(resolvedTheme(nextPref), nextPref === null);
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      delete doc.documentElement.dataset.vt; // a cross-fade, not the last page change's slide (transitions.ts)
      doc.startViewTransition(apply);
    } else apply();
  };

  if (NAV.themeText) {
    return (
      <div role="radiogroup" aria-label="外观" className={`flex h-[34px] rounded-full border border-line bg-bg-sunk p-[3px] touch:h-[46px] touch:p-0 ${className}`}>
        {WORDS.map((key) => {
          const on = current === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(key)}
              className={`flex-auto whitespace-nowrap rounded-full px-1.5 text-[12.5px] transition-colors duration-150 touch:min-w-11 touch:px-1 ${on ? "bg-surface font-medium text-ink shadow-[var(--shadow-card)] ring-1 ring-line" : "text-ink-4 hover:text-ink-2"}`}
            >
              {OPTIONS.find((o) => o.key === key)!.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="外观" className={`relative grid h-[34px] grid-cols-3 rounded-full border border-line bg-bg-sunk p-[3px] touch:h-[46px] touch:p-0 ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-y-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full border border-line bg-surface shadow-[var(--shadow-card)] transition-transform duration-200 ease-[var(--ease-out-quart)] touch:inset-y-0 touch:left-0 touch:w-1/3"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={current === o.key}
          title={o.label}
          onClick={() => choose(o.key)}
          className={`relative z-10 flex items-center justify-center rounded-full transition-colors duration-150 ${current === o.key ? "text-ink" : "text-ink-4 hover:text-ink-2"}`}
        >
          {o.icon}
          <span className="sr-only">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
