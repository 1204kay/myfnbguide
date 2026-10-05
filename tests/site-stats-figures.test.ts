// The about page's figures carry what the site's modules count (ServerModule.figures). Failure case:
// /api/site/stats leaves a module's figures out, so the about page's last stage counts the dailies instead.
// Its own file: the figures are kept per process, so the modules go in before the first read.
import "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { closeDb } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import { loadSiteStats } from "@aihot/backend/site/stats";

after(closeDb);

test("the site's figures carry what its modules count, in the modules' order", async () => {
  installModules([
    { name: "library", figures: async () => [{ value: 41, unit: "种情况" }, { value: 328, unit: "条原文" }] },
    { name: "uncounted" },
    { name: "second", figures: async () => [{ value: 3, unit: "种" }] },
  ]);
  assert.deepEqual((await loadSiteStats()).figures, [{ value: 41, unit: "种情况" }, { value: 328, unit: "条原文" }, { value: 3, unit: "种" }]);
});
