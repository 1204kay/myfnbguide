// The checker's backend (本站 10-23 决定记录): the copy an article will be selected with is checked against the
// original before it is stored (backend/check.ts), through the engine's copy check (packages/backend/src/modules.ts).
// Its model step keeps the name `check`, so the admin's switch (settings `models.check`) and CHECK_MODEL still apply.
import { defineServerModule } from "@aihot/backend/modules";
import { checkCopy } from "./backend/check.ts";

export default defineServerModule({
  name: "checker",
  models: {
    check: { label: "核对（入选条目的标题、导读、要点拿原文逐句核，严重和误导直接改）", env: "CHECK_MODEL", purposes: ["check_item"] },
  },
  copyCheck: {
    purposes: ["check_item"],
    run: async ({ article, copy, subject, attemptTag }) => {
      const c = await checkCopy(article, copy, subject, attemptTag);
      return { titleZh: c.draft.title, summaryZh: c.draft.lead, reasonZh: c.draft.points.join("\n") || null, held: c.held, receiptIds: c.receiptIds };
    },
  },
});
