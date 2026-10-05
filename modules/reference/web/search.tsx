// The library's section of a search's results (layout A4, B8), above the engine's: situations and stories that
// hold the words searched, five of each and the rest opened in place; nothing when the library has none.
import { useState } from "react";
import type { SearchPart } from "@aihot/web/modules";
import type { ReferenceSearch } from "../types.ts";
import { Heading, SituationLine, StoryCards } from "./ui";

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
  if (!found || (!found.situations.length && !found.cases.length)) return null;
  const situations = all.situations ? found.situations : found.situations.slice(0, SHOWN);
  const cases = all.cases ? found.cases : found.cases.slice(0, SHOWN);
  return (
    <section className="mt-6">
      <Heading>参考</Heading>
      {situations.length > 0 && (
        <div className="card mt-3 overflow-hidden">
          {situations.map((s, i) => <SituationLine key={s.slug} s={s} href={`/reference/${s.slug}`} category className={i ? "border-t border-line" : ""} />)}
        </div>
      )}
      {!all.situations && found.situations.length > SHOWN && <More rest={found.situations.length - SHOWN} onOpen={() => setAll({ ...all, situations: true })} />}
      {cases.length > 0 && <StoryCards cards={cases} />}
      {!all.cases && found.cases.length > SHOWN && <More rest={found.cases.length - SHOWN} onOpen={() => setAll({ ...all, cases: true })} />}
    </section>
  );
}

export default {
  path: (q) => `/api/reference/search?q=${encodeURIComponent(q)}`,
  Block,
} satisfies SearchPart;
