-- 10-24 为什么几乎没有入选（十一 10-25），只读。按马来西亚日期，10-20 到今天，只看非回补条目、每条最新一次分析。
--   ssh -i ~/.ssh/myfnb_server ubuntu@43.160.228.180 "cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -X -P pager=off < myfnb/selection-drop-2026-10-25.sql"
-- 「到线未入选」= 过了预筛、两次分数加起来到了门槛的两倍，却没有入选：只会是核对员挡下（modules/checker，held 不另存）。
BEGIN READ ONLY;
-- 只读事务里不能建临时视图，所以用 psql 变量把同一个子查询放进每一段。
\set d '(SELECT to_char(a.discovered_at AT TIME ZONE \'Asia/Kuala_Lumpur\', \'MM-DD\') AS day, a.id, a.processing_state, a.processing_error, x.relevance, x.selected, x.prompt_version, (x.output->>\'threshold\')::numeric AS thr, (SELECT sum(v::numeric) FROM jsonb_array_elements_text(coalesce(x.output->\'scores\', \'[]\')) v) AS total, jsonb_array_length(coalesce(x.output->\'scores\', \'[]\')) AS n_scores, x.output->\'prefilter\'->>\'label\' AS pre FROM articles a LEFT JOIN LATERAL (SELECT * FROM analyses WHERE article_id = a.id ORDER BY id DESC LIMIT 1) x ON true WHERE NOT a.backfill AND a.discovered_at >= timestamptz \'2026-10-20 00:00+08\')'

\echo '=== 每天：发现、处理状态、预筛、打分、到线、入选、到线未入选'
SELECT day, count(*) AS found,
       count(*) FILTER (WHERE processing_state = 'new') AS new, count(*) FILTER (WHERE processing_state = 'failed') AS failed,
       count(*) FILTER (WHERE pre = 'PASS') AS pre_pass, count(*) FILTER (WHERE pre = 'UNKNOWN') AS pre_unknown, count(*) FILTER (WHERE pre = 'BLOCK') AS pre_block,
       count(*) FILTER (WHERE n_scores = 2) AS scored, count(*) FILTER (WHERE total >= 2 * thr) AS at_line,
       count(*) FILTER (WHERE selected) AS selected, count(*) FILTER (WHERE relevance = 'pass' AND total >= 2 * thr AND NOT selected) AS held
FROM :d d GROUP BY day ORDER BY day;

\echo '=== 每天：两次分数之和的分布（门槛 92）'
SELECT day, count(*) FILTER (WHERE total < 40) AS "<40", count(*) FILTER (WHERE total >= 40 AND total < 60) AS "40-59",
       count(*) FILTER (WHERE total >= 60 AND total < 80) AS "60-79", count(*) FILTER (WHERE total >= 80 AND total < 92) AS "80-91",
       count(*) FILTER (WHERE total >= 92 AND total < 110) AS "92-109", count(*) FILTER (WHERE total >= 110) AS "110+",
       round(avg(total) FILTER (WHERE pre = 'PASS'), 1) AS avg_pass, max(total) AS max
FROM :d d WHERE n_scores = 2 GROUP BY day ORDER BY day;

\echo '=== 每天用的是哪一版提示词'
SELECT day, prompt_version, count(*) FROM :d d WHERE prompt_version IS NOT NULL GROUP BY 1, 2 ORDER BY 1, 2;

\echo '=== 10-23 起分数最高的 40 条（看离线多远、有没有被核对员挡）'
SELECT day, total, thr, d.selected, relevance, processing_state AS state, left(p.title, 50) AS title, p.source_id
FROM :d d LEFT JOIN publications p ON p.article_id = d.id
WHERE day >= '10-23' AND n_scores = 2 ORDER BY total DESC NULLS LAST LIMIT 40;

\echo '=== 处理失败的原因（10-23 起）'
SELECT day, left(processing_error, 90) AS error, count(*) FROM :d d WHERE day >= '10-23' AND processing_state = 'failed' GROUP BY 1, 2 ORDER BY 1, 3 DESC;

\echo '=== llm 每小时调用：收到、失败、最常见的错误（10-23 起，马来西亚时间）'
SELECT to_char(date_trunc('hour', started_at) AT TIME ZONE 'Asia/Kuala_Lumpur', 'MM-DD HH24') AS hour,
       count(*) FILTER (WHERE status = 'received') AS ok, count(*) FILTER (WHERE status <> 'received') AS not_ok,
       left(mode() WITHIN GROUP (ORDER BY error), 70) AS top_error
FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at >= timestamptz '2026-10-23 00:00+08'
GROUP BY 1 ORDER BY 1;

\echo '=== 精选（publications）按入选时刻每天几条'
SELECT to_char(selected_ready_at AT TIME ZONE 'Asia/Kuala_Lumpur', 'MM-DD') AS day, count(*) FROM publications
WHERE selected AND selected_ready_at >= timestamptz '2026-10-20 00:00+08' GROUP BY 1 ORDER BY 1;
ROLLBACK;
