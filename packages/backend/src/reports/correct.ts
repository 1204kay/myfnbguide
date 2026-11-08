// A classification correction moves the same frozen entry; it never composes another issue or pays
// a writer. The override, publication, report revisions and audit commit in the caller's transaction.
import { RELEASE } from "@aihot/industry/taxonomy";
import type { Tx } from "../db.ts";
import { isRelease } from "../editorial/vocabulary.ts";
import { emit } from "../modules.ts";
import { INTRO_EVENTS } from "./compose.ts";
import { SECTION_ORDER, sectionOf } from "./edition.ts";

interface Entry { itemId: string; followUp?: string; firstParty?: boolean; role?: string; [key: string]: unknown }
interface Group { label?: string; heading?: string; summary?: unknown; items?: Entry[]; storyRefs?: Entry[]; [key: string]: unknown }
interface Content { sections?: Group[]; themes?: Group[]; metrics?: Record<string, number>; [key: string]: unknown }

/**
 * Whether a section's introduction names the entries leaving it: a run of four Chinese characters, a Latin word
 * or a figure of the introduction found in what leaves and in none of what stays. A shared phrase is not taken
 * as a mention; a coincidence is, and then the introduction goes as the engine always let it go.
 */
export function namesLeaving(intro: string, leaving: Entry[], staying: Entry[]): boolean {
  const text = (es: Entry[]) => es.map(e => `${e.title ?? ""} ${e.summary ?? ""}`).join("\n");
  const out = text(leaving), kept = text(staying);
  const han = (intro.match(/\p{Script=Han}+/gu) ?? []).flatMap(run => [...run].slice(0, Math.max(0, [...run].length - 3)).map((_, i) => [...run].slice(i, i + 4).join("")));
  const other = intro.match(/[A-Za-z][A-Za-z0-9.+-]{2,}|\d{2,}(?:\.\d+)?%?/g) ?? [];
  return [...han, ...other].some(t => out.includes(t) && !kept.includes(t));
}

/** Moves the item to its new section in every issue that carries it; says whether any issue changed. */
export async function correctReportClassification(tx: Tx, articleId: string, reason: string): Promise<boolean> {
  const [item] = await tx<{ category: string | null }[]>`SELECT category FROM publications WHERE article_id=${articleId}`;
  if (!item?.category) return false;
  const reports = await tx<{ id: number; kind: string; key: string; content: Content; revision: number; generated_at: Date }[]>`
    SELECT id,kind,key,content,revision,generated_at FROM reports
    WHERE content @> ${tx.json({ sections: [{ items: [{ itemId: articleId }] }] })}
       OR content @> ${tx.json({ themes: [{ storyRefs: [{ itemId: articleId }] }] })}
    ORDER BY id FOR UPDATE`;
  let changed = false;
  for (const report of reports) {
    const content = structuredClone(report.content);
    const daily = report.kind === "daily";
    const groups = (daily ? content.sections : content.themes) ?? [];
    const labelKey = daily ? "label" : "heading";
    const entriesKey = daily ? "items" : "storyRefs";
    const from = groups.find(g => g[entriesKey]?.some(e => e.itemId === articleId));
    // Older, hand-written theme headings are not taxonomy columns; do not reinterpret their prose.
    if (!from || !SECTION_ORDER.includes(from[labelKey] ?? "")) continue;
    const label = sectionOf(item.category);
    if (from[labelKey] !== label) {
      const moving = from[entriesKey]!.filter(e => e.itemId === articleId);
      from[entriesKey] = from[entriesKey]!.filter(e => e.itemId !== articleId);
      let target = groups.find(g => g[labelKey] === label);
      if (!target) { target = { [labelKey]: label, [entriesKey]: [] }; groups.push(target); }
      target[entriesKey]!.push(...moving);
      // MYFNB (myfnb/DIFFERENCES.md「分类改正保留导读」): the engine cleared both introductions on every move. An
      // introduction still goes when its section falls below INTRO_EVENTS or when it names what left; the target's
      // stays (it names nothing new), and a new section has none. A cleared one is logged to be rewritten.
      if (!daily) {
        const intro = typeof from.summary === "string" ? from.summary : null;
        if (intro && (from[entriesKey]!.length < INTRO_EVENTS || namesLeaving(intro, moving, from[entriesKey]!))) {
          from.summary = null;
          if (from[entriesKey]!.length >= INTRO_EVENTS) console.error(JSON.stringify({ level: "warn", msg: "a section introduction named a moved entry and was cleared; rewrite it", report: `${report.kind}:${report.key}`, section: from[labelKey], item: articleId }));
        }
        if (!("summary" in target)) target.summary = null;
      }
    }
    const arranged = groups.filter(g => g[entriesKey]?.length).sort((a, b) => SECTION_ORDER.indexOf(a[labelKey]!) - SECTION_ORDER.indexOf(b[labelKey]!));
    if (daily) {
      content.sections = arranged;
      // The release figure (dailyMetrics) follows the new classification; without a RELEASE kind there is none.
      if (RELEASE) {
        const entries = arranged.flatMap(g => g.items ?? []);
        const rows = await tx<{ article_id: string; category: string | null; tags: string[] }[]>`
          SELECT article_id,category,tags FROM publications WHERE article_id IN ${tx(entries.map(e => e.itemId))}`;
        const byId = new Map(rows.map(r => [r.article_id, r]));
        content.metrics = { ...content.metrics, modelsReleased: entries.filter(e => {
          const p = byId.get(e.itemId);
          return p && isRelease(p.category, p.tags) && !e.followUp && (e.firstParty || e.role === "官方" || e.role === "X·官方");
        }).length };
      }
    } else content.themes = arranged;
    if (JSON.stringify(content) === JSON.stringify(report.content)) continue;
    await tx`INSERT INTO report_revisions (report_id,revision,content,generated_at,reason)
      VALUES (${report.id},${report.revision},${tx.json(report.content as never)},${report.generated_at},${`classification ${articleId}: ${reason}`})`;
    await tx`UPDATE reports SET content=${tx.json(content as never)},revision=revision+1,updated_at=now() WHERE id=${report.id}`;
    changed = true;
  }
  if (changed) await emit("reportsChanged", { reason: `report classification ${articleId}` }, tx);
  return changed;
}
