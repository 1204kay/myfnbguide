// The library's section of a search's results (layout A4, B8), above the engine's: situations and stories that
// hold the words searched, five of each and the rest opened in place; nothing when the library has none. A
// situation is the home page's row with its category over it, counted in shops (layout J3-5).
import { useRef, useState } from "react";
import type { SearchPart } from "@aihot/web/modules";
import type { ReferenceSearch } from "../types.ts";
import { Heading, openRest, SituationRows, StoryCards } from "./ui";

const SHOWN = 5;

function More({ rest, onOpen }: { rest: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="mt-2.5 flex h-11 w-full items-center justify-center rounded-full border border-line bg-surface text-[14px] text-accent transition-colors hover:border-accent">
      展开其余 {rest} 条
    </button>
  );
}

function Block({ data }: { q: string; data: unknown }) {
  const found = data as ReferenceSearch | null;
  const [all, setAll] = useState({ situations: false, cases: false });
  const section = useRef<HTMLElement>(null);
  if (!found || (!found.situations.length && !found.cases.length)) return null;
  const situations = all.situations ? found.situations : found.situations.slice(0, SHOWN);
  const cases = all.cases ? found.cases : found.cases.slice(0, SHOWN);
  // The first situation or story the button opened: a title's link, after the five of its list shown before.
  const first = (list: "situations" | "cases") => () => section.current?.querySelectorAll<HTMLElement>(list === "situations" ? "li h3 a" : "article h3 a")[SHOWN];
  return (
    <section ref={section} className="mt-6">
      <Heading>参考</Heading>
      {situations.length > 0 && <SituationRows rows={situations} category />}
      {!all.situations && found.situations.length > SHOWN && <More rest={found.situations.length - SHOWN} onOpen={() => openRest(() => setAll({ ...all, situations: true }), first("situations"))} />}
      {cases.length > 0 && <StoryCards cards={cases} />}
      {!all.cases && found.cases.length > SHOWN && <More rest={found.cases.length - SHOWN} onOpen={() => openRest(() => setAll({ ...all, cases: true }), first("cases"))} />}
    </section>
  );
}

export default {
  path: (q) => `/api/reference/search?q=${encodeURIComponent(q)}`,
  Block,
} satisfies SearchPart;
