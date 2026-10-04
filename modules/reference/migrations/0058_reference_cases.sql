-- The reference library's cases (modules/reference): a selected item written as a story and placed in the
-- situations it belongs to. status: story (shown), thin (material too thin for a story), held (failed the checks).
CREATE TABLE IF NOT EXISTS reference_cases (
  article_id     text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  revision       integer NOT NULL,
  status         text NOT NULL CHECK (status IN ('story', 'thin', 'held')),
  story          jsonb,
  situations     text[] NOT NULL DEFAULT '{}',
  shop_key       text,
  problems       jsonb NOT NULL DEFAULT '[]',
  receipt_ids    bigint[] NOT NULL DEFAULT '{}',
  prompt_version text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
