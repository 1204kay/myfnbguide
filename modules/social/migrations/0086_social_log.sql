-- What happened to each post, one row an event, never changed or deleted (modules/social): drafted, held, approved,
-- rejected, withdrawn, sent, failed. detail names who did it and, for a send, where it went.
CREATE TABLE IF NOT EXISTS social_log (
  id      bigserial PRIMARY KEY,
  post_id bigint NOT NULL,
  event   text NOT NULL,
  detail  jsonb NOT NULL DEFAULT '{}',
  at      timestamptz NOT NULL DEFAULT now()
)
