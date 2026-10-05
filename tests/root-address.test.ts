// The featured list's address follows the site (site.ts NAV.home): / by default, /latest when a module page
// is the home page. Failure cases: the RSS channel, llms.txt or the sitemap still send readers of the featured
// list to /, which then shows the module page; the module page's own address does not lead to /; /latest/ is
// not folded into /latest like the other pages' trailing slashes.
import "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { config } from "@aihot/backend/config";
import { closeDb } from "@aihot/backend/db";
import { resolveRedirect } from "@aihot/contracts/http-policy";
import { feedPath, homePage } from "@aihot/contracts/routes";
import { NAV } from "@aihot/site";
import { buildApp } from "../apps/api/src/app.ts";

const app = await buildApp();
after(async () => {
  await app.close();
  await closeDb();
});

test("the featured list is the home page unless the site names a module page for /", () => {
  assert.equal(feedPath(), NAV.home ? "/latest" : "/");
  assert.equal(homePage()?.page.id ?? null, NAV.home);
});

test("RSS, llms.txt and the sitemap link the featured list where it lives", async () => {
  const feed = await app.inject("/feed.xml");
  assert.equal(feed.statusCode, 200);
  assert.ok(feed.body.includes(`<link>${config.siteUrl}${feedPath()}</link>`), "the featured feed's channel links its page");
  const llms = await app.inject("/llms.txt");
  assert.equal(llms.statusCode, 200);
  assert.ok(llms.body.includes(`](${config.siteUrl}${feedPath()})`), "llms.txt names the featured list");
  const sitemap = await app.inject("/sitemap.xml");
  assert.equal(sitemap.statusCode, 200);
  for (const path of new Set(["/", feedPath()])) assert.ok(sitemap.body.includes(`<loc>${config.siteUrl}${path}</loc>`), path);
});

test("a module page shown at / leaves its own address leading there; /latest/ folds like the other pages", { skip: !NAV.home && "the featured list is the home page" }, () => {
  const own = `/${homePage()!.page.path}`;
  assert.deepEqual(resolveRedirect(own, "?from=bio"), { status: 301, location: "/?from=bio", headers: {} });
  assert.deepEqual(resolveRedirect(`${own}/`, ""), { status: 301, location: "/", headers: {} });
  assert.equal(resolveRedirect(`${own}/anything`, ""), null, "the pages under it stay where they are");
  assert.deepEqual(resolveRedirect("/latest/", "?page=2"), { status: 301, location: "/latest?page=2", headers: {} });
});
