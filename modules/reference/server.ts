// The reference library's backend: a schedule places each day's selected items in a situation (backend/place.ts), others
// write and read aloud 十一说 (backend/issues.ts, backend/voice.ts), and the api answers the pages and the item page's
// block (backend/read.ts). The stories written until 10-18 and their pages went on 11-03 (backend/read.ts).
import { config } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { defineQueue, defineServerModule } from "@aihot/backend/modules";
import { enqueueOn } from "@aihot/backend/jobs/queue";
import { beijingDate } from "@aihot/contracts/time";
import { mcpToolName } from "@aihot/contracts/mcp";
import { SITE } from "@aihot/site";
import { readHome, readItemText, readSituation, sitemapEntries } from "./backend/read.ts";
import { ISSUE_CHECK_STEP, ISSUE_STEP, modelAsk } from "./backend/issue.ts";
import { MAX_READS, voiceIssue, voiceReport } from "./backend/voice.ts";
import { modelFor } from "@aihot/backend/editorial/models";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { issueLead, issuePath, issueSitemap, listIssues, readIssue, writeIssue } from "./backend/issues.ts";
import { issueAudio, sendIssueAudio, untimedAlerts } from "./backend/audio.ts";
import { PODCAST_PATH, podcastEpisodes, podcastXml } from "./backend/podcast.ts";
import { creditAlerts } from "./backend/credit.ts";
import { failedJobAlerts, missingIssueAlerts, noAudioAlerts } from "./backend/failed.ts";
import { AGENT_ABILITIES } from "./backend/agent.ts";
import { articlesToPlace, PLACE_STEP, placeWaiting, placingOn } from "./backend/place.ts";
import { TOPIC_CHECK_STEP, TOPIC_STEP, topicSlugs, topicStale, writeTopic } from "./backend/topic.ts";

// 十一说 (backend/issues.ts): one a day; two drafts, checks and up to five rounds of mending take long, so it runs as a job
// of its own with room for that, and one retry for a model that failed.
// 十一说 is written from the day the settings row `reference.issues` names ({"from": "2026-10-24"}, a Beijing date); with
// no row it is not. Each issue costs (about US$2, mostly the check), so starting and stopping is Kay's and must not wait
// for a deploy (10-23: one sentence stops it). Stop: DELETE FROM settings WHERE key = 'reference.issues'.
async function issuesFrom(): Promise<string | null> {
  const [row] = await sql<{ value: { from?: unknown } }[]>`SELECT value FROM settings WHERE key = 'reference.issues'`;
  return typeof row?.value.from === "string" ? row.value.from : null;
}

const ISSUES = defineQueue<{ date: string }>({
  name: "reference.issue",
  options: { policy: "short", retryLimit: 1, retryDelay: 300, expireInSeconds: 3 * 3600 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  run: async (jobs) => {
    for (const { date } of jobs) await writeIssue(date);
    await queueVoice();
  },
});

// 十一说 read aloud (backend/voice.ts) once the day's issue is up, from the day the settings row `reference.voice` names
// ({"from": "2026-11-01"}); with no row it is not. A reading that fails its check is read again at the next run, up to
// MAX_READS in all; what still fails leaves the issue as text.
async function voiceFrom(): Promise<string | null> {
  const [row] = await sql<{ value: { from?: unknown } }[]>`SELECT value FROM settings WHERE key = 'reference.voice'`;
  return typeof row?.value.from === "string" ? row.value.from : null;
}

const VOICES = defineQueue<{ no: number }>({
  name: "reference.voice",
  options: { policy: "short", retryLimit: 0, expireInSeconds: 3600 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  run: async (jobs) => {
    for (const { no } of jobs) {
      const [writer, checker] = await Promise.all([modelFor(ISSUE_STEP), modelFor(ISSUE_CHECK_STEP)]);
      const receipts: number[] = [];
      await voiceIssue(no, { write: modelAsk(writer, `voice:${no}`, receipts), check: modelAsk(checker, `voice:${no}`, receipts) });
      if (receipts.length) await sql.begin(async (tx) => { for (const id of receipts) await completeReceipt(tx, id); });
    }
  },
});

/**
 * Queues the day's issue to be read aloud when it is written and has no audio yet: right after the issue is written, and
 * every half hour of the morning for a reading that failed its check. Kay 11-11 08:13 「八点两个都要同时」: waiting for the
 * next half hour after the issue left the audio up to half an hour later than it needed to be.
 */
async function queueVoice() {
  if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
  const date = beijingDate(new Date());
  const from = await voiceFrom();
  if (!from || date < from) return { queued: 0, reason: "十一说 read aloud is not on (settings reference.voice)" };
  const [row] = await sql<{ no: number }[]>`SELECT no FROM reference_issues WHERE date = ${date} AND status = 'issue'`;
  if (!row) return { queued: 0, reason: "no issue yet" };
  if (await issueAudio(row.no)) return { queued: 0, reason: "already read" };
  const report = await voiceReport(row.no);
  if (report && !["error", "check failed"].includes(report.status)) return { queued: 0, reason: report.status };
  if ((report?.tries ?? 0) >= MAX_READS && !report?.unheard) return { queued: 0, reason: "no reads left today" };
  await enqueueOn(VOICES, { no: row.no }, { singletonKey: String(row.no) });
  return { queued: 1, no: row.no };
}

// Placing the items no story was written for (backend/place.ts): once a day, all waiting in one job, one short call each.
const PLACES = defineQueue<{ date: string }>({
  name: "reference.place",
  options: { policy: "short", retryLimit: 1, retryDelay: 600, expireInSeconds: 3600 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  run: async (jobs) => { for (const _ of jobs) await placeWaiting(PLACE_LIMIT); },
});
/** At most this many a day: a day selects about 10–20 (/api/site/stats); the rest of a backlog goes on the next days. */
const PLACE_LIMIT = 300;

// 综合整理 (backend/topic.ts): the situations the settings row names, one after another in one job, each only when it
// has new items and the day's cap holds it. No retry: it would spend past the cap (backend/topic.ts topicAsk).
const TOPICS = defineQueue<{ date: string }>({
  name: "reference.topic",
  options: { policy: "short", retryLimit: 0, expireInSeconds: 3600 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  run: async (jobs) => {
    for (const _ of jobs) {
      for (const slug of await topicSlugs()) {
        const page = await readSituation(slug);
        if (page) console.log(JSON.stringify({ job: "reference.topic", ...await writeTopic(page) }));
      }
    }
  },
});

/** Shared caches keep a page as long as the engine keeps its topic pages: a minute. */
const CACHE = "public, max-age=60, stale-while-revalidate=60";

/** How the site shows a 十一说 title, for counting its length (backend/issue.ts titlesShownAs). */
export { titlesShownAs } from "./backend/issue.ts";

export default defineServerModule({
  name: "reference",
  models: {
    [PLACE_STEP]: { label: "参考库的情况（没有故事的入选条目，只选放进哪个情况、哪一组）", env: "REFERENCE_PLACE_MODEL", purposes: ["reference_place"] },
    [ISSUE_STEP]: { label: "十一说的写手（读这一天的全部收录，写两稿快讯加细说一件，再各为念出来改一遍）", env: "REFERENCE_ISSUE_MODEL", purposes: ["reference_issue_write", "reference_issue_speak", "reference_issue_voice"] },
    [TOPIC_STEP]: { label: "参考页的综合整理（读一种情况的全部原文条目，写一篇每句标出原文的整理）", env: "REFERENCE_TOPIC_MODEL", purposes: ["reference_topic_write"] },
    [TOPIC_CHECK_STEP]: { label: "综合整理的核对（逐句对原文，严重的句子删掉再核一次）", env: "REFERENCE_TOPIC_CHECK_MODEL", purposes: ["reference_topic_check"] },
    [ISSUE_CHECK_STEP]: { label: "十一说的核对（读点名原文的全文核三条规则，写出改好的句子；改不了的由编辑只改有问题的句子）", env: "REFERENCE_ISSUE_CHECK_MODEL", purposes: ["reference_issue_check", "reference_issue_edit", "reference_issue_review", "reference_issue_listen", "reference_issue_lead", "reference_issue_voice_check"] },
  },
  queues: [PLACES, TOPICS, ISSUES, VOICES],
  // The daily leads with the day's 十一说 when it was written in time (Kay 10-18: 每天放在 08:00 日报最上面).
  dailyLead: (date) => issueLead(date),
  // A warning before the Claude credit runs out and the morning's issue with it (backend/credit.ts).
  // And what otherwise fails with nobody told: a module's queue job out of retries, a day without its 十一说 or its audio (backend/failed.ts).
  alerts: async (now) => [...await creditAlerts(now), ...await untimedAlerts(), ...await failedJobAlerts(), ...await missingIssueAlerts(now), ...await noAudioAlerts(now)],
  // The library and 十一说 for agents (backend/agent.ts): addresses under /api/v1/agent and MCP tools, named in the guide.
  agent: { abilities: AGENT_ABILITIES },
  // llms.txt names the library and 十一说 beside the engine's pages. The library lists items by cause (backend/read.ts).
  llms: async () => {
    const [latest] = await sql<{ no: number }[]>`SELECT max(no) AS no FROM reference_issues WHERE status = 'issue'`;
    return {
      pages: [
        `- [参考](${config.siteUrl}/reference): 按遇到的情况（定价、招人、房租、差评……）查阅各地店家的做法和经验；收录范围自开站至今，不只最近 7 天，每条附原文出处；也可用给 Agent 的 /api/v1/agent/reference、MCP 工具 ${mcpToolName("get_reference")} 读取`,
        ...(latest?.no ? [`- [十一说](${config.siteUrl}${issuePath(latest.no)}): ${SITE.name} 自己的每日节目，放在日报头条：AI 十一阅读当天的全部收录后，撰写数条快讯并详述一件，注明原文出处；链接是最新一期，往期在 /reference/issues/{期数}；也可用给 Agent 的 /api/v1/agent/shiyi、MCP 工具 ${mcpToolName("get_shiyi")} 读取；播客订阅源（带音频）是 ${PODCAST_PATH}`] : []),
      ],
    };
  },
  sitemap: { entries: async () => [...await issueSitemap(), ...await sitemapEntries()] },
  schedules: [{
    // The day's selected items into their situations (backend/place.ts), in DeepSeek's off-peak hours (00:30–08:30
    // Beijing), before 十一说 and the daily at 05:00, and apart from ops.retention at 03:30. Only once the settings row `reference.placing` is there.
    name: "reference.place",
    cron: "20 3 * * *",
    missed: "once",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      if (!(await placingOn())) return { queued: 0, reason: "placing is not on (settings reference.placing)" };
      if (!(await articlesToPlace(1)).length) return { queued: 0, reason: "nothing to place" };
      const date = beijingDate(new Date());
      await enqueueOn(PLACES, { date }, { singletonKey: date });
      return { queued: 1, date };
    },
  }, {
    // 综合整理: after the day's items are placed (03:20), in DeepSeek's off-peak hours, before 十一说 at 05:00.
    name: "reference.topic",
    cron: "50 3 * * *",
    missed: "once",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      const slugs = await topicSlugs();
      if (!slugs.length) return { queued: 0, reason: "综合整理 is not on (settings reference.topics)" };
      const pages = await Promise.all(slugs.map((s) => readSituation(s)));
      const stale = await Promise.all(pages.map((p) => (p ? topicStale(p) : false)));
      if (!stale.some(Boolean)) return { queued: 0, reason: "no new items" };
      const date = beijingDate(new Date());
      await enqueueOn(TOPICS, { date }, { singletonKey: date });
      return { queued: 1, date };
    },
  }, {
    // 十一说: three hours before the 08:00 daily, from what it lists so far (the last three hours wait for tomorrow's).
    name: "reference.issue",
    cron: "0 5 * * *",
    missed: "once",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      const date = beijingDate(new Date());
      const from = await issuesFrom();
      if (!from || date < from) return { queued: 0, reason: "十一说 is not on (settings reference.issues)" };
      await enqueueOn(ISSUES, { date }, { singletonKey: date });
      return { queued: 1, date };
    },
  }, {
    // 十一说 read aloud: every half hour of the morning, the day's issue once it is written and has no audio yet.
    name: "reference.voice",
    cron: "20,50 5-9 * * *",
    run: () => queueVoice(),
  }],
  http: (app) => {
    app.get("/api/reference", async (_req, reply) => reply.header("Cache-Control", CACHE).send(await readHome()));
    // The items placed in a situation (backend/place.ts), in none, and still to place: what 待决 #19 checks the placing by.
    app.get("/api/reference/status", async (_req, reply) =>
      reply.header("Cache-Control", "no-store").send({
        placing: { ...Object.fromEntries((await sql<{ k: string; n: number }[]>`
          SELECT CASE WHEN cardinality(situations) > 0 THEN 'placed' ELSE 'none' END AS k, count(*)::int AS n FROM reference_placements GROUP BY 1`)
          .map((r) => [r.k, r.n])), waiting: (await articlesToPlace(5000)).length },
      }));
    // 十一说 for podcast apps (backend/podcast.ts); under /feed, which the engine already sends to the api.
    app.get(PODCAST_PATH, async (_req, reply) =>
      reply.header("Cache-Control", "public, max-age=1800").type("application/rss+xml; charset=utf-8").send(podcastXml(await podcastEpisodes(), SITE.contactEmail)));
    app.get("/api/reference/issues", async (_req, reply) => reply.header("Cache-Control", CACHE).send(await listIssues()));
    app.get("/api/reference/issues/:no", async (req, reply) => {
      const no = Number((req.params as { no: string }).no);
      const page = Number.isSafeInteger(no) && no > 0 ? await readIssue(no) : null;
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    app.get("/api/reference/issues/:no/audio.mp3", async (req, reply) => {
      const no = Number((req.params as { no: string }).no);
      return Number.isSafeInteger(no) && no > 0 ? sendIssueAudio(req, reply, no) : reply.code(404).send({ error: "not found" });
    });
    app.get("/api/reference/situations/:slug", async (req, reply) => {
      const page = await readSituation((req.params as { slug: string }).slug);
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    // A story's old address goes to its item, as the engine answers a merged story (routes/site.ts): 308, which the
    // page follows. Nothing is read: an id that never was a story goes to an item page that answers 404.
    app.get("/api/reference/cases/:id", async (req, reply) => {
      const id = (req.params as { id: string }).id;
      return reply.code(308).header("Location", `/api/site/items/${encodeURIComponent(id)}`).header("Cache-Control", CACHE).send({ mergedInto: id });
    });
    // A shop's old address goes to the library, as a story's goes to its item.
    app.get("/api/reference/shops/:key", async (_req, reply) =>
      reply.code(308).header("Location", "/api/reference").header("Cache-Control", CACHE).send({ mergedInto: "reference" }));
    // The item page's block (web/item-part.tsx): the situation it is placed in; 404 for none.
    app.get("/api/reference/items/:id", async (req, reply) => {
      const text = await readItemText((req.params as { id: string }).id);
      return text ? reply.header("Cache-Control", CACHE).send(text) : reply.code(404).send({ error: "not found" });
    });
  },
});
