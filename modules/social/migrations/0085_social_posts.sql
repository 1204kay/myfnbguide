-- Posts for the site's social accounts (modules/social): one row per story and platform, from the draft to what happened
-- to it. status: pending (waits for the owner), held (failed the checks), approved, rejected, withdrawn (the story left
-- the site before it was sent), sent. delivery says how a sent post went out: 'test' is recorded and nothing left the server.
-- No foreign key on article_id: the record outlives the article.
CREATE TABLE IF NOT EXISTS social_posts (
  id          bigserial PRIMARY KEY,
  article_id  text NOT NULL,
  platform    text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'wechat')),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'approved', 'rejected', 'withdrawn', 'sent')),
  title       text NOT NULL,
  body        text NOT NULL,
  image_url   text,
  link        text NOT NULL,
  problems    jsonb NOT NULL DEFAULT '[]',
  delivery    text,
  reviewed_by text,
  reviewed_at timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, platform)
)
