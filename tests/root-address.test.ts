// The featured list's address follows the site (site.ts NAV.home): / by default, /latest when a module page
// is the home page. Failure cases: the RSS channel, llms.txt or the sitemap still send readers of the featured
// list to /, which then shows the module page; on a site whose list starts at 全部 (FEED.start), they still send
// readers to the featured list's address, which only leads on to /all; the module page's own address does not
// lead to /; /latest/ is not folded into /latest like the other pages' trailing slashes.
import "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { config } from "@aihot/backend/config";
import { closeDb } from "@aihot/backend/db";
import { resolveRedirect } from "@aihot/contracts/http-policy";
import { feedPath, homePage } from "@aihot/contracts/routes";
import { FEED, NAV } from "@aihot/site";
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

test("RSS, llms.txt and the sitemap link the featured list where it lives, or 全部 where the list starts there", async () => {
  // The page a reader of the featured list lands on (FEED.start "all": the featured list's address leads to 全部).
  const list = FEED.start === "all" ? "/all" : feedPath();
  const feed = await app.inject("/feed.xml");
  assert.equal(feed.statusCode, 200);
  assert.ok(feed.body.includes(`<link>${config.siteUrl}${list}</link>`), "the featured feed's channel links its page");
  const llms = await app.inject("/llms.txt");
  assert.equal(llms.statusCode, 200);
  assert.ok(llms.body.includes(`](${config.siteUrl}${list})`), "llms.txt names the list");
  const sitemap = await app.inject("/sitemap.xml");
  assert.equal(sitemap.statusCode, 200);
  // / is a page of its own unless it is the featured list's address, which leads to 全部.
  const listed = FEED.start === "all" && !NAV.home ? [list] : ["/", list];
  for (const path of new Set(listed)) assert.ok(sitemap.body.includes(`<loc>${config.siteUrl}${path}</loc>`), path);
  if (FEED.start === "all") {
    if (feedPath() !== "/") assert.ok(!llms.body.includes(`](${config.siteUrl}${feedPath()})`), "llms.txt does not name the featured list's address");
    assert.ok(!sitemap.body.includes(`<loc>${config.siteUrl}${feedPath()}</loc>`), "nor does the sitemap");
  }
});

test("a module page shown at / leaves its own address leading there; /latest/ folds like the other pages", { skip: !NAV.home && "the featured list is the home page" }, () => {
  const own = `/${homePage()!.page.path}`;
  assert.deepEqual(resolveRedirect(own, "?from=bio"), { status: 301, location: "/?from=bio", headers: {} });
  assert.deepEqual(resolveRedirect(`${own}/`, ""), { status: 301, location: "/", headers: {} });
  assert.equal(resolveRedirect(`${own}/anything`, ""), null, "the pages under it stay where they are");
  assert.deepEqual(resolveRedirect("/latest/", "?page=2"), { status: 301, location: "/latest?page=2", headers: {} });
});
