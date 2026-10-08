-- The item pages' 正文 · AI 整理自原文 (modules/reference): every listed item that is no story of the library, written up
-- from its original under its summary. status: body (shown), thin (material too thin to write up), held (failed the checks).
CREATE TABLE IF NOT EXISTS reference_bodies (
  article_id     text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  revision       integer NOT NULL,
  status         text NOT NULL CHECK (status IN ('body', 'thin', 'held')),
  body           jsonb,
  problems       jsonb NOT NULL DEFAULT '[]',
  receipt_ids    bigint[] NOT NULL DEFAULT '{}',
  prompt_version text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
