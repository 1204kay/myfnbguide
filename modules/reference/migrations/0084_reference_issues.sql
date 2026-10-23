-- 十一说 (backend/issues.ts): one row a day, written before the daily. status issue: it went up, numbered in `no`;
-- thin: too few items that day to tell, no number. content holds what the issue says, what was cut, what the check
-- still found, every draft with its check, and the day's items without their text (the originals stay in articles).
CREATE TABLE IF NOT EXISTS reference_issues (
  date       date PRIMARY KEY,
  no         integer UNIQUE,
  status     text NOT NULL CHECK (status IN ('issue', 'thin')),
  content    jsonb NOT NULL,
  version    text NOT NULL,
  models     jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
