-- The weekly trends (modules/trends): one row per week, keyed like the weekly report. topics is what went out, dropped
-- what was found but not sent and why. A week with no topic keeps its row (topics empty, no page), so the schedule
-- does not look again.
CREATE TABLE IF NOT EXISTS trends_issues (
  key text PRIMARY KEY,
  period_start date NOT NULL,
  period_end date NOT NULL,
  topics jsonb NOT NULL,
  dropped jsonb NOT NULL DEFAULT '[]',
  receipt_ids bigint[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
