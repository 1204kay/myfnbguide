// 十一说 read aloud (Kay 10-23 picked direction B on the canvas https://claude.ai/artifact/2LWc3rjqtxNqJxPF9m2PqR):
// a 听 button where the page's actions are (the phone bar, the desktop's right rail), and once it plays, a bar over
// the bottom of the page: progress, play/pause, the issue and the time, speed, close. The original has no audio, so
// the parts are the module's own, drawn with the site's tokens and the bar's sizes (44px targets, the share pill's
// look for the 听 button). The bar belongs to the page: leaving the page stops it.
// With a transcript, the bar has a 文字稿 button that opens the listen script in the site's own bottom sheet
// (components/ui/Sheet, as 筛选 and 这件事的其他报道 use it) while the audio goes on (Kay 10-31, as 樊登 and 小宇宙 do).
// When each line's start is known (`starts`), the 文字稿 follows the voice as 小宇宙's does (Kay 10-31 22:14, with a
// photo of it): the line being read is lit up to where the voice has got, the others are dimmed, the sheet keeps it in
// view unless the reader has just scrolled, and tapping a line plays from it.
import { useEffect, useRef, useState } from "react";
import { IconClose } from "@aihot/web/components/icons";
import { Sheet } from "@aihot/web/components/ui/Sheet";
import { BODY } from "./ui";

type P = { size?: number };

const IconHeadphones = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="5" height="7" rx="2" /><rect x="16" y="14" width="5" height="7" rx="2" />
  </svg>
);
const IconPlay = ({ size = 18 }: P) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>);
const IconPause = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
);

/** 692 → 11 (rounded, at least 1). */
const wholeMinutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));
/** 692 → 11 分钟 */
export const minutes = (seconds: number) => `${wholeMinutes(seconds)} 分钟`;
/** 134 → 2:14 */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const SPEEDS = [1, 1.25, 1.5, 0.75];

/** The 听 button: the share pill's look, so it sits beside 分享 as one more action. In the phone bar (`compact`) it
 *  gets what is left beside the centred title, about 76px on a 360px phone and less once the issue number has two
 *  digits; "听 · 18 分钟" folded onto two lines there (Kay's iPhone, 10-24), so it shows the headphones and "18 分"
 *  on one line and says the whole label to screen readers. */
export function ListenButton({ seconds, onClick, compact = false }: { seconds: number; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={compact ? `听 · ${minutes(seconds)}` : undefined}
      className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full border border-line-strong bg-surface font-medium text-accent transition-colors hover:border-ink-4 hover:text-accent-ink ${compact ? "shrink-0 gap-1 px-2 text-[13px]" : "w-full gap-1.5 px-3 text-[12.5px]"}`}
    >
      <IconHeadphones size={compact ? 15 : 14} /> {compact ? `${wholeMinutes(seconds)} 分` : `听 · ${minutes(seconds)}`}
    </button>
  );
}

/** One player for the page: `open` once the reader taps 听; the bar starts playing as it opens. */
export function useListen() {
  const [open, setOpen] = useState(false);
  return { open, start: () => setOpen(true), close: () => setOpen(false) };
}

/** The 文字稿 that follows the voice: `starts[i]` is when line i begins, in seconds. */
function Following({ lines, starts, at, length, onPick }: { lines: string[]; starts: number[]; at: number; length: number; onPick: (t: number) => void }) {
  let now = 0;
  while (now + 1 < starts.length && starts[now + 1]! <= at) now += 1;
  const from = starts[now]!;
  const to = starts[now + 1] ?? length;
  const line = [...lines[now]!];
  const lit = at < from ? 0 : Math.min(line.length, Math.round(((at - from) / Math.max(0.1, to - from)) * line.length));
  const box = useRef<HTMLDivElement>(null);
  const touched = useRef(0);
  const first = useRef(true);
  useEffect(() => {
    // A reader who has just scrolled is reading somewhere else: leave the sheet where they put it for a while.
    if (Date.now() - touched.current < 5000) return;
    const el = box.current?.children[now] as HTMLElement | undefined;
    // Scroll the sheet itself, not scrollIntoView: that also scrolls every ancestor, the page held still behind the sheet too.
    let pane = el?.parentElement ?? null;
    while (pane && !/(auto|scroll)/u.test(getComputedStyle(pane).overflowY)) pane = pane.parentElement;
    if (el && pane) {
      const r = el.getBoundingClientRect(), p = pane.getBoundingClientRect();
      pane.scrollBy({ top: r.top - p.top - (pane.clientHeight - r.height) / 2, behavior: first.current ? "auto" : "smooth" });
    }
    first.current = false;
  }, [now]);
  const mark = () => { touched.current = Date.now(); };
  return (
    <div ref={box} onWheel={mark} onTouchMove={mark} className="px-5 pb-2 pt-3">
      {lines.map((text, i) => (
        <p key={i} className={`${i ? "mt-3" : "mt-1"} text-[16px] leading-[1.85] transition-colors lg:text-[17px] ${i === now ? "text-ink-2" : "text-ink-3"}`}>
          {/* The whole line is the button: tapping it plays from where it starts. */}
          <button type="button" onClick={() => onPick(starts[i]!)} className="text-left">
            {i === now ? <><span className="text-ink">{line.slice(0, lit).join("")}</span>{line.slice(lit).join("")}</> : text}
          </button>
        </p>
      ))}
    </div>
  );
}

export function PlayerBar({ url, seconds, title, transcript, starts, onClose }: { url: string; seconds: number; title: string; transcript: string[] | null; starts?: number[]; onClose: () => void }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [reading, setReading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [length, setLength] = useState(seconds);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    void a.play().catch(() => setPlaying(false));
    // The lock screen and the headphones' buttons name the issue and play/pause it.
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist: "十一说" });
      navigator.mediaSession.setActionHandler("play", () => void a.play());
      navigator.mediaSession.setActionHandler("pause", () => a.pause());
    }
    return () => {
      a.pause();
      if ("mediaSession" in navigator) navigator.mediaSession.metadata = null;
    };
  }, [title]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };
  const nextSpeed = () => {
    const s = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!;
    setSpeed(s);
    if (audio.current) audio.current.playbackRate = s;
  };

  return (
    <>
      {/* Room under the page's end, so the bar does not cover its last lines. */}
      <div aria-hidden="true" className="h-20" />
      <div
        role="region"
        aria-label="播放十一说"
        className="fixed inset-x-2 bottom-[calc(58px+env(safe-area-inset-bottom))] z-40 overflow-hidden rounded-panel border border-line bg-surface shadow-[var(--shadow-pop)] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[380px]"
      >
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setLength(e.currentTarget.duration)}
        />
        {/* The progress line doubles as the seek control: a range input over it, taller than it looks. */}
        <div className="relative h-[3px] bg-line-soft">
          <div className="h-full bg-accent" style={{ width: `${length ? Math.min(100, (at / length) * 100) : 0}%` }} />
          <input
            type="range"
            aria-label="播放进度"
            min={0}
            max={Math.round(length)}
            step={1}
            value={Math.round(at)}
            onChange={(e) => {
              const t = Number(e.currentTarget.value);
              if (audio.current) audio.current.currentTime = t;
              setAt(t);
            }}
            className="absolute inset-x-0 -top-2 h-5 w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="flex h-[60px] items-center gap-3 pl-3 pr-2">
          <button
            type="button"
            aria-label={playing ? "暂停" : "播放"}
            onClick={toggle}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast transition-colors hover:bg-accent-ink"
          >
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <div className="truncate text-[14px] font-semibold text-ink">{title}</div>
            <div className="font-mono text-[12px] text-ink-3">{clock(at)} / {clock(length)}</div>
          </div>
          {transcript && (
            <button
              type="button"
              onClick={() => setReading(true)}
              className="h-8 shrink-0 rounded-control border border-line-strong px-2 text-[13px] text-ink-2 transition-colors hover:border-ink-4 hover:text-ink"
            >
              文字稿
            </button>
          )}
          <button
            type="button"
            aria-label="播放速度"
            onClick={nextSpeed}
            className="h-8 min-w-12 rounded-control border border-line-strong px-1.5 text-[13px] text-ink-2 transition-colors hover:border-ink-4 hover:text-ink"
          >
            {speed === 1 ? "1.0" : speed}×
          </button>
          <button
            type="button"
            aria-label="关闭播放器"
            onClick={onClose}
            className="flex size-11 items-center justify-center text-ink-3 transition-colors hover:text-ink"
          >
            <IconClose size={18} />
          </button>
        </div>
      </div>
      {transcript && (
        <Sheet open={reading} onClose={() => setReading(false)} title={`文字稿 · ${title}`}>
          {/* The sheet covers the bar, so it carries play/pause and the time itself: one listens while reading. */}
          <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line-soft bg-surface px-5">
            <button
              type="button"
              aria-label={playing ? "暂停" : "播放"}
              onClick={toggle}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast transition-colors hover:bg-accent-ink"
            >
              {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
            </button>
            <div className="font-mono text-[12px] text-ink-3">{clock(at)} / {clock(length)}</div>
          </div>
          {starts?.length === transcript.length ? (
            <Following
              lines={transcript}
              starts={starts}
              at={at}
              length={length}
              onPick={(t) => {
                const a = audio.current;
                if (!a) return;
                a.currentTime = t;
                setAt(t);
                void a.play();
              }}
            />
          ) : (
            <div className="px-5 pb-2 pt-3">
              {transcript.map((line, i) => <p key={i} className={`${i ? "mt-3" : "mt-1"} ${BODY}`}>{line}</p>)}
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}
