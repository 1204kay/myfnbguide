-- 「一天挑 12 条」按日报真实规则重算（十一 10-25 定），只读。读 10-25 起导入的 SelectBench 记录里 day1022、day1023 两轮。
--   ssh -i ~/.ssh/myfnb_server ubuntu@43.160.228.180 "cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -X -P pager=off < myfnb/day-top12-2026-10-25.sql"
-- 日报的规则（packages/backend/src/reports/edition.ts arrangeDaily，site.ts dailyScope = pool）：正文只放入选的，一件事一条，
-- 按重要性排（分数 + 一手来源 5；讨论来源数这里取不到，按都是 1 家算），同一信源最多 2 条，取前 12。
-- 和真日报的差别：真日报按前一天 08:00 到当天 08:00 收稿，这里按马来西亚日历日；核对员挡下的这里看不到。
BEGIN READ ONLY;
\echo '=== 每次评测 · 每天：日报规则下正文几条、其中 Kay 挑的几条 ｜ 旧量法（按分数直接取前 12）命中几条'
WITH r AS (
  SELECT x.run_id, run.label, x.stratum, x.gold, x.decision, x.score, substr(x.case_id, length(x.stratum) + 2) AS article_id
  FROM selectbench_results x JOIN selectbench_runs run ON run.id = x.run_id
  WHERE run.created_at >= timestamptz '2026-10-25 00:00+08' AND x.stratum IN ('day1022', 'day1023')
), c AS (
  SELECT r.*, p.source_id, coalesce(p.story_id::text, r.article_id) AS story, r.score + CASE WHEN p.first_party THEN 5 ELSE 0 END AS imp
  FROM r LEFT JOIN publications p ON p.article_id = r.article_id
), one_per_story AS (
  SELECT *, row_number() OVER (PARTITION BY run_id, stratum, story ORDER BY imp DESC, article_id) AS n_story FROM c WHERE decision = 'select'
), capped AS (
  SELECT *, row_number() OVER (PARTITION BY run_id, stratum, source_id ORDER BY imp DESC, article_id) AS n_source FROM one_per_story WHERE n_story = 1
), main AS (
  SELECT *, row_number() OVER (PARTITION BY run_id, stratum ORDER BY imp DESC, article_id) AS pos FROM capped WHERE n_source <= 2
), old AS (
  SELECT run_id, stratum, gold, row_number() OVER (PARTITION BY run_id, stratum ORDER BY score DESC NULLS LAST, article_id) AS pos FROM c
)
SELECT run.created_at AT TIME ZONE 'Asia/Kuala_Lumpur' AS at, m.run_id, m.label, m.stratum,
       count(*) FILTER (WHERE m.pos <= 12) AS main_entries, count(*) FILTER (WHERE m.pos <= 12 AND m.gold = 'select') AS kay_hits,
       (SELECT count(*) FROM old o WHERE o.run_id = m.run_id AND o.stratum = m.stratum AND o.pos <= 12 AND o.gold = 'select') AS old_hits
FROM main m JOIN selectbench_runs run ON run.id = m.run_id
GROUP BY 1, 2, 3, 4 ORDER BY 1, 4;
ROLLBACK;
