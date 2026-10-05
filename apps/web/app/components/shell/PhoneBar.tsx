// The phone shell's top bar (below lg). Left: where back leads, or the brand; middle: the page's title
// once its own heading has scrolled up under the bar, or a switch that always shows; right: actions. Tab
// pages also get a large title under the bar. Desktop pages keep their own headers; a page pushed onto
// another can lead back from its first line there (BackRow), as the bar does on phones.
import { forwardRef, useEffect, useLayoutEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { SITE } from "@aihot/site";
import { Wordmark } from "@aihot/site/brand/Logo.tsx";
import { openSearch } from "../../features/search/SearchOverlay";
import { IconChevronLeft, IconSearch } from "../icons";
import { historyIndex, previousScreen } from "./screens";
import { markBack } from "./transitions";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface BackTarget {
  /** Where back goes when this page was opened directly (no page of ours behind it). */
  to: string;
  /** What the button says then; otherwise it names the page behind, or reads "返回". */
  label: string;
}

export function PhoneBar({ back, title, large = false, sub, leading, center, actions }: {
  back?: BackTarget;
  /** The page's name. In the bar once the page's heading ([data-page-title]) is under it; with `large`,
   *  also as the large heading below the bar. */
  title?: ReactNode;
  large?: boolean;
  /** A line under the large title. */
  sub?: ReactNode;
  leading?: ReactNode;
  /** Always shown in the middle instead of the title (精选 | 全部). */
  center?: ReactNode;
  actions?: ReactNode;
}) {
  const scrolled = useScrolled();
  const titleShown = useHeadingUnderBar(!center && !!title);
  const wideCenter = !!center && !back && !leading;
  return (
    <>
      <header
        data-phone-bar=""
        className={`bleed sticky top-0 z-40 bg-bg/85 backdrop-blur-xl backdrop-saturate-150 transition-shadow duration-200 lg:hidden ${scrolled ? "shadow-[0_1px_0_var(--line-soft)]" : ""}`}
      >
        <div className={`-mx-2.5 grid h-[var(--bar-h)] items-center ${wideCenter ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"}`}>
          {!wideCenter && <div className="flex min-w-0 items-center">{back ? <BackButton {...back} /> : leading}</div>}
          {/* A title not shown yet takes no width, so the back label is not cut short ("‹ 生意很…") before it appears. */}
          <div className={`flex min-w-0 justify-center ${wideCenter ? "" : "max-w-[calc(100vw-184px)]"}`} style={!center && !titleShown ? { maxWidth: 0 } : undefined}>
            {center ?? (
              title && (
                <span
                  aria-hidden={!titleShown}
                  className={`truncate text-[15.5px] font-semibold text-ink transition-[opacity,transform] duration-200 ${titleShown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
                >
                  {title}
                </span>
              )
            )}
          </div>
          <div className="flex min-w-0 items-center justify-end">{actions}</div>
        </div>
      </header>
      {large && title && (
        <div className="pb-3 pt-0.5 lg:hidden">
          <h1 data-page-title="" className="text-[30px] font-bold leading-[1.25] tracking-[-0.01em] text-ink">
            {title}
          </h1>
          {sub && <div className="mt-1 text-[12.5px] leading-relaxed text-ink-4">{sub}</div>}
        </div>
      )}
    </>
  );
}

/**
 * What back says and does: the short name of the page behind in this tab's history ("返回" when that page is
 * named by its content) and back there; or, for a page opened directly, `label` and on to `to`.
 */
function useBack({ to, label }: BackTarget): { text: string; go: () => void } {
  const navigate = useNavigate();
  const { key } = useLocation();
  const [text, setText] = useState(label);
  useIsoLayoutEffect(() => {
    if (historyIndex() === 0) return setText(label);
    const behind = previousScreen();
    setText(behind ? behind : "返回");
  }, [key, label]);
  const go = () => {
    markBack();
    if (historyIndex() > 0) navigate(-1);
    else navigate(to, { viewTransition: true });
  };
  return { text, go };
}

/** "‹ 精选": back through the reader's history, or to the page's parent when it was opened directly. */
function BackButton(target: BackTarget) {
  const { text, go } = useBack(target);
  return (
    <button type="button" onClick={go} className="flex h-11 min-w-11 items-center pl-1 pr-2 text-[16px] text-accent transition-opacity active:opacity-50">
      <IconChevronLeft size={25} strokeWidth={2.1} />
      <span className="max-w-[7em] truncate">{text}</span>
    </button>
  );
}

/**
 * Desktop (≥ 961px): the first line of a page pushed onto another, "‹ 上一页名", with the phone bar's back
 * rules. A link to the parent, so it also opens in a new tab.
 */
export function BackRow(target: BackTarget) {
  const { text, go } = useBack(target);
  return (
    <div className="hidden lg:block">
      <Link
        to={target.to}
        onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          go();
        }}
        className="-ml-1 inline-flex min-h-10 items-center gap-0.5 pr-1.5 text-[13px] text-ink-3 transition-colors hover:text-accent touch:min-h-11"
      >
        <IconChevronLeft size={16} />
        <span className="max-w-[7em] truncate">{text}</span>
      </Link>
    </div>
  );
}

/** The magnifier in a bar: the search opens over the page with the keyboard up. */
export function SearchButton() {
  return (
    <BarButton label="搜索" onClick={(event) => openSearch("", event.currentTarget)}>
      <IconSearch size={21} />
    </BarButton>
  );
}

/**
 * The bar of the tab bar's own pages when the shell carries search (site.ts NAV.search): the brand (to /) on
 * the left, search on the right, the page's name in the middle once its heading has gone up under the bar.
 */
export function TabPageBar({ title, large = false, sub }: { title?: ReactNode; large?: boolean; sub?: ReactNode }) {
  return (
    <PhoneBar
      title={title}
      large={large}
      sub={sub}
      leading={
        <Link to="/" aria-label={`${SITE.name} 首页`} className="flex h-11 items-center pl-2.5 pr-2 text-ink">
          <Wordmark size={17} />
        </Link>
      }
      actions={<SearchButton />}
    />
  );
}

/** A 44px round icon button for the bar; `on` tints it (a filter in use). */
export const BarButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; on?: boolean; children: ReactNode }>(function BarButton(
  { label, on = false, children, className = "", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`relative grid size-11 shrink-0 place-items-center rounded-full transition-colors active:bg-bg-sunk ${on ? "text-accent" : "text-ink-2"} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 4);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return scrolled;
}

/**
 * True once the page's visible heading ([data-page-title]) has gone up under the bar. Without such a
 * heading the bar shows the title at once.
 */
function useHeadingUnderBar(enabled: boolean): boolean {
  const { key } = useLocation();
  const [under, setUnder] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const heading = [...document.querySelectorAll<HTMLElement>("[data-page-title]")].find((el) => el.getClientRects().length > 0);
    if (!heading) {
      setUnder(true);
      return;
    }
    const bar = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bar-h")) || 48;
    const io = new IntersectionObserver(([entry]) => setUnder(!!entry && !entry.isIntersecting && entry.boundingClientRect.top < bar), {
      rootMargin: `-${bar}px 0px 0px 0px`,
    });
    io.observe(heading);
    return () => io.disconnect();
  }, [enabled, key]);
  return enabled && under;
}
