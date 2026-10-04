-- How far each opened source's import got (modules/archive): finished once its last page or an empty one was read;
-- an error stops the run there, and the next run tries again.
CREATE TABLE IF NOT EXISTS archive_sources (
  source_id    text PRIMARY KEY,
  pages        integer NOT NULL DEFAULT 0,
  found        integer NOT NULL DEFAULT 0,
  finished_at  timestamptz,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
