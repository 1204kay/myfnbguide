-- Where a selected item without a story sits in the reference library (modules/reference/backend/place.ts): since
-- 10-24 no stories are written, so a short model call only picks the situation and its group. placements:
-- [{"situation", "group", "fit"}], empty when none fits (kept, so it is not asked again); situations: their slugs, read
-- as reference_cases.situations is; speaker: who tells it, for the counts (read.ts tellerOf).
CREATE TABLE IF NOT EXISTS reference_placements (
  article_id     text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  revision       integer NOT NULL,
  situations     text[] NOT NULL DEFAULT '{}',
  placements     jsonb NOT NULL DEFAULT '[]',
  speaker        text NOT NULL,
  receipt_ids    bigint[] NOT NULL DEFAULT '{}',
  prompt_version text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
