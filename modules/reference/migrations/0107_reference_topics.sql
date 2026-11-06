-- A situation's 综合整理 (backend/topic.ts): a row each time one is written. status shown: the page reads the newest of
-- these; held: the check still found a 严重 error after the cut, so it is kept only to see why. item_ids are the items
-- it read: it is written again only when the situation has one it did not. usd is what its calls cost, for the day's cap.
CREATE TABLE IF NOT EXISTS reference_topics (
  id         bigserial PRIMARY KEY,
  slug       text NOT NULL,
  status     text NOT NULL CHECK (status IN ('shown', 'held')),
  content    jsonb NOT NULL,
  item_ids   text[] NOT NULL,
  version    text NOT NULL,
  models     jsonb NOT NULL,
  usd        numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
