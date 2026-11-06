// 金额旁边补美元（server.ts）：api 发出去的文字补上美元，库里的不改；补过的回应 ETag 带汇率日期，汇率换了浏览器
// 就重新取；管理后台不补；还没取到过汇率时原样发出。
import "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import Fastify from "fastify";
import { closeDb, sql } from "@aihot/backend/db";
import { sendJsonWithEtag, sendTextWithEtag } from "../../../apps/api/src/http/respond.ts";
import usd from "../server.ts";
import { forgetRates, refreshRates } from "../backend/rates.ts";

after(async () => { await closeDb(); });

const app = Fastify();
app.get("/api/x", async (req, reply) => sendJsonWithEtag(req, reply, { items: [{ summary: "平均975万日元" }] }, { etagPrefix: "x", cacheControl: "public, max-age=60" }));
app.get("/api/plain", async (req, reply) => sendJsonWithEtag(req, reply, { title: "没有金额" }, { etagPrefix: "p", cacheControl: "public, max-age=60" }));
app.get("/feed.xml", async (req, reply) => sendTextWithEtag(req, reply, "<item><description>月租3,000令吉</description></item>", { etagPrefix: "f", cacheControl: "public, max-age=60", contentType: "application/rss+xml; charset=utf-8" }));
app.get("/api/admin/x", async () => ({ summary: "平均975万日元" }));
usd.http!(app);

test("nothing is added before any rate has been fetched", async () => {
  await sql`DELETE FROM settings WHERE key = 'usd.rates'`;
  forgetRates();
  const r = await app.inject({ url: "/api/x" });
  assert.equal(r.json().items[0].summary, "平均975万日元");
});

test("the api's text gets US$, its ETag the rate's date, and a browser's copy is kept only while the rate is the same", async () => {
  await sql`INSERT INTO settings (key, value) VALUES ('usd.rates', ${sql.json({ date: "2026-11-05", perUsd: { JPY: 157.9, MYR: 4.048 } })})`;
  forgetRates();
  const r = await app.inject({ url: "/api/x" });
  assert.equal(r.json().items[0].summary, "平均975万日元（约 US$6.2万）");
  const etag = String(r.headers.etag);
  assert.match(etag, /\.usd-2026-11-05"$/);
  const again = await app.inject({ url: "/api/x", headers: { "if-none-match": etag } });
  assert.equal(again.statusCode, 304);
  assert.equal(again.headers.etag, etag);
  const older = await app.inject({ url: "/api/x", headers: { "if-none-match": etag.replace("2026-11-05", "2026-11-04") } });
  assert.equal(older.statusCode, 200, "a copy made with another day's rate is sent again");

  const plain = await app.inject({ url: "/api/plain" });
  assert.doesNotMatch(String(plain.headers.etag), /usd-/, "a body with no amount keeps its own ETag");
  assert.equal((await app.inject({ url: "/feed.xml" })).body, "<item><description>月租3,000令吉（约 US$740）</description></item>");
  assert.equal((await app.inject({ url: "/api/admin/x" })).json().summary, "平均975万日元", "the admin sees the stored text");
});

test("the hourly run fetches only when the stored rates are 12 hours old or missing", async () => {
  const fetched: string[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string) => { fetched.push(String(url)); return Response.json({ date: "2026-11-06", usd: { jpy: 150 } }); }) as typeof fetch;
  try {
    await sql`INSERT INTO settings (key, value) VALUES ('usd.rates', ${sql.json({ date: "2026-11-05", perUsd: { JPY: 157.9 } })})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
    assert.ok("skipped" in (await refreshRates()));
    assert.deepEqual(fetched, []);
    await sql`UPDATE settings SET updated_at = now() - interval '13 hours' WHERE key = 'usd.rates'`;
    assert.deepEqual(await refreshRates(), { date: "2026-11-06" });
    assert.equal(fetched.length, 1);
    await sql`DELETE FROM settings WHERE key = 'usd.rates'`;
    assert.deepEqual(await refreshRates(), { date: "2026-11-06" }, "a site that has never had rates fetches at once");
  } finally {
    globalThis.fetch = real;
  }
});
