// 十一说 as a podcast feed (/feed/shiyi.xml), so podcast apps (Apple Podcasts, Spotify, 小宇宙, Pocket Casts…) can list
// and subscribe to it: the readers who find a daily audio show by searching a podcast app never reach the site.
// It lists only issues whose audio is up (backend/audio.ts), and the episode file is the same mp3 the page plays,
// served with byte ranges (sendIssueAudio), which podcast apps need to seek. Tags are the ones Apple Podcasts requires
// (help.apple.com/itc/podcasts_connect, "A Podcaster's Guide to RSS", read 11-13) plus <itunes:email>, where Spotify
// sends the code that proves the show is ours (support.spotify.com/creators "Adding your email address to your RSS
// feed", read 11-13). The cover is the lock-screen cover (shiyi-cover.png) drawn at 3000 px, the size Apple asks for.
import { stat } from "node:fs/promises";
import { sql } from "@aihot/backend/db";
import { escapeXml } from "@aihot/backend/lib/text";
import { siteUrl } from "@aihot/backend/publication/links";
import { SITE } from "@aihot/site";
import { audioFile, issueAudio } from "./audio.ts";
import { leadParagraph } from "./issue.ts";
import { issuePath } from "./issues.ts";

export const PODCAST_PATH = "/feed/shiyi.xml";
export const PODCAST_COVER = "shiyi-podcast.png";

export const SHOW = {
  title: "十一说 · MYFNB",
  description: "每天早上，十一读完 MYFNB 前一天收录的全部餐饮消息，用十多分钟说几条快讯，再细说一件。每句话的原文出处都列在网站上，内容由 AI 编写，引用时以原文为准。",
  author: "MYFNB（myfnbguide.com）",
  // Apple's own category names; a daily round-up of the trade's news.
  category: ["News", "Business News"] as const,
};

export interface Episode {
  no: number;
  title: string;
  /** What the episode says, as plain text: the brief, then the news items' heads. */
  summary: string;
  url: string;
  audio: string;
  bytes: number;
  seconds: number;
  published: Date;
}

const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")}]]>`;

/** The show notes as the little HTML Apple and Spotify both take inside CDATA (<p>, <a>): a bare address in plain text
 *  is not a link there, and 小宇宙 makes no link of one either (Echo.js's notes, checked 11-14), so the way back to
 *  the issue is an <a>; its text is the address itself, so an app that strips tags still shows where to go. */
const notes = (e: Episode) => [...e.summary.split(/\n{2,}/).map(escapeXml), `全文和每句话的原文出处：<a href="${escapeXml(e.url)}">${escapeXml(e.url)}</a>`]
  .map((p) => `<p>${p}</p>`).join("");

/** The feed itself, from the episodes newest first. */
export function podcastXml(episodes: Episode[], email: string | null): string {
  const home = siteUrl("/reference/issues");
  const cover = siteUrl(`/${PODCAST_COVER}`);
  const items = episodes.map((e) => `    <item>
      <title>${escapeXml(e.title)}</title>
      <link>${escapeXml(e.url)}</link>
      <description>${cdata(notes(e))}</description>
      <guid isPermaLink="false">myfnb-shiyi-${e.no}</guid>
      <pubDate>${e.published.toUTCString()}</pubDate>
      <enclosure url="${escapeXml(e.audio)}" length="${e.bytes}" type="audio/mpeg" />
      <itunes:duration>${e.seconds}</itunes:duration>
      <itunes:episode>${e.no}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>false</itunes:explicit>
    </item>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SHOW.title)}</title>
    <link>${escapeXml(home)}</link>
    <description>${escapeXml(SHOW.description)}</description>
    <language>${escapeXml(SITE.locale.toLowerCase())}</language>
    <atom:link href="${escapeXml(siteUrl(PODCAST_PATH))}" rel="self" type="application/rss+xml" />
    <itunes:author>${escapeXml(SHOW.author)}</itunes:author>
    <itunes:image href="${escapeXml(cover)}" />
    <image><url>${escapeXml(cover)}</url><title>${escapeXml(SHOW.title)}</title><link>${escapeXml(home)}</link></image>
    <itunes:category text="${escapeXml(SHOW.category[0])}"><itunes:category text="${escapeXml(SHOW.category[1])}" /></itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
${email ? `    <itunes:owner><itunes:name>${escapeXml(SHOW.author)}</itunes:name><itunes:email>${escapeXml(email)}</itunes:email></itunes:owner>\n` : ""}${items.join("\n")}
  </channel>
</rss>
`;
}

/** Every issue with its audio up, newest first. */
export async function podcastEpisodes(): Promise<Episode[]> {
  const rows = await sql<{ no: number; title: string; brief: string[] | null; heads: string[] | null; created_at: Date }[]>`
    SELECT no, content->'issue'->>'title' AS title, content->'issue'->'brief' AS brief,
      ARRAY(SELECT x->>'head' FROM jsonb_array_elements(COALESCE(content->'issue'->'news', '[]'::jsonb)) x) AS heads, created_at
    FROM reference_issues WHERE status = 'issue' ORDER BY no DESC`;
  const episodes: Episode[] = [];
  for (const r of rows) {
    const [audio, bytes] = await Promise.all([issueAudio(r.no), stat(audioFile(r.no)).then((s) => s.size, () => null)]);
    if (!audio || !bytes || !r.title) continue;
    const heads = (r.heads ?? []).filter(Boolean);
    episodes.push({
      no: r.no,
      title: `第 ${r.no} 期｜${r.title}`,
      summary: [leadParagraph(r.brief ?? []), ...(heads.length ? [`快讯：${heads.join("；")}`] : [])].filter(Boolean).join("\n\n"),
      url: siteUrl(issuePath(r.no)),
      audio: siteUrl(audio.url),
      bytes,
      seconds: audio.seconds,
      published: r.created_at,
    });
  }
  return episodes;
}
