-- Write-ups and stories written on fixed cases by myfnb/eval-reference.ts, the site's prompt beside a candidate, for
-- reading side by side before a prompt changes (as docs/story-digest-evaluation.md does for digests). Nothing here is
-- shown on the site. variant: live or candidate; kind: story or body; status as in reference_cases and reference_bodies.
CREATE TABLE IF NOT EXISTS reference_evals (
  run        text NOT NULL,
  article_id text NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  variant    text NOT NULL CHECK (variant IN ('live', 'candidate')),
  kind       text NOT NULL CHECK (kind IN ('story', 'body')),
  status     text NOT NULL,
  output     jsonb,
  problems   jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run, article_id, variant, kind)
);
