-- The archive (modules/archive): episodes and articles of the opened sources taken in as history, the audio
-- each podcast episode has, and whether it was transcribed. status: imported, transcribed, failed.
CREATE TABLE IF NOT EXISTS archive_episodes (
  article_id      text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  source_id       text NOT NULL,
  audio_url       text,
  status          text NOT NULL CHECK (status IN ('imported', 'transcribed', 'failed')),
  transcript_chars integer,
  receipt_id      bigint,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
