// Tables of the code that went on 11-03 (backend/read.ts), kept with their rows until they are dropped. Nothing reads
// or writes them. They hold live data (the groupings of practices, the item pages' write-ups, the eval runs), and
// deleting live data is Kay's to approve: 十一 11-03 set it for a week after this code and the library's reordering are
// live and nothing turned up. The migration that drops them deletes this file in the same change; until then it names
// each table and column, so tests/architecture.test.ts reads them as kept on purpose, not forgotten.
export const RETIRED_TABLES = {
  // migrations/0061: a situation's stories grouped by practice (backend/methods.ts).
  reference_situations: ["slug", "members", "tried", "overview", "methods", "problems", "receipt_ids", "prompt_version", "updated_at"],
  // migrations/0062: the item pages' 正文 · AI 整理自原文 (backend/body.ts).
  reference_bodies: ["article_id", "revision", "status", "body", "problems", "receipt_ids", "prompt_version", "created_at", "updated_at"],
  // migrations/0063: the runs of myfnb/eval-reference.ts.
  reference_evals: ["run", "article_id", "variant", "kind", "status", "output", "problems", "created_at"],
} as const;
