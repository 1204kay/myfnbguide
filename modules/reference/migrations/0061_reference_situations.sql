-- A situation's stories grouped by the practice they tell (modules/reference/backend/methods.ts): an overview of
-- the situation and its practices, each with its stories' ids. members: the stories the stored grouping is of;
-- tried: the stories last tried, so a grouping that failed is not tried again until they change.
CREATE TABLE IF NOT EXISTS reference_situations (
  slug           text PRIMARY KEY,
  members        text NOT NULL,
  tried          text NOT NULL,
  overview       text,
  methods        jsonb,
  problems       jsonb NOT NULL DEFAULT '[]',
  receipt_ids    bigint[] NOT NULL DEFAULT '{}',
  prompt_version text NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
