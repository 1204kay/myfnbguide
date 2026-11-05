-- 日报正文挑进来、没入选的条目补写原文要点的结果（modules/dailypick/backend/points.ts）：每条只写一次。
-- outcome：written 写好了（要点存在 editorial_overrides.fields.reason）；held 核对员挡下；none 写不出。
-- 挡下和写不出的也留着，不再花钱重写；receipt_ids 是这一次的模型回执。
CREATE TABLE IF NOT EXISTS dailypick_points (
  article_id  text PRIMARY KEY REFERENCES articles (id) ON DELETE CASCADE,
  revision    integer NOT NULL,
  outcome     text NOT NULL CHECK (outcome IN ('written', 'held', 'none')),
  receipt_ids bigint[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
