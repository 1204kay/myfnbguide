-- 后台告警里的信源问题（10-24），只读。从 Kay 的电脑：
--   ssh <服务器> 'cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -X -P pager=off' < myfnb/sources-check.sql
BEGIN READ ONLY;
\echo '=== 每个启用信源：近 7 天抓取、失败、发现、缺日期；最后一次发现、最后一条发布时间'
WITH r AS (SELECT source_id, count(*) FILTER (WHERE status IN ('ok','failed')) AS runs, count(*) FILTER (WHERE status='failed') AS failed
                  FROM fetch_runs WHERE started_at > now() - interval '7 days' GROUP BY source_id),
            seen AS (SELECT article_id, source_id, discovered_at FROM article_discoveries
                     UNION SELECT id, source_id, discovered_at FROM articles),
            d AS (SELECT source_id, count(*) FILTER (WHERE discovered_at > now() - interval '7 days') AS found7, max(discovered_at) AS last_found FROM seen GROUP BY source_id),
            a AS (SELECT source_id, count(*) FILTER (WHERE discovered_at > now() - interval '7 days' AND published_at IS NULL) AS undated7, max(published_at) AS last_pub FROM articles GROUP BY source_id)
       SELECT s.id, s.kind, s.health, s.fail_count AS fails, coalesce(r.runs,0) AS runs7, coalesce(r.failed,0) AS failed7,
              coalesce(d.found7,0) AS found7, coalesce(a.undated7,0) AS undated7,
              to_char(d.last_found AT TIME ZONE 'Asia/Kuala_Lumpur','MM-DD HH24:MI') AS last_found,
              to_char(a.last_pub AT TIME ZONE 'Asia/Kuala_Lumpur','YYYY-MM-DD') AS last_pub,
              to_char(s.created_at AT TIME ZONE 'Asia/Kuala_Lumpur','MM-DD') AS created, left(s.last_error, 70) AS last_error
       FROM sources s LEFT JOIN r ON r.source_id=s.id LEFT JOIN d ON d.source_id=s.id LEFT JOIN a ON a.source_id=s.id
       WHERE s.enabled ORDER BY coalesce(d.found7,0), s.id;
\echo '=== 近 7 天失败的抓取：错误原文（每个信源最多 20 条）'
SELECT source_id, to_char(started_at AT TIME ZONE 'Asia/Kuala_Lumpur','MM-DD HH24:MI') AS at, left(error, 140) AS error FROM (
         SELECT f.*, row_number() OVER (PARTITION BY source_id ORDER BY started_at DESC) AS n FROM fetch_runs f
         WHERE status='failed' AND started_at > now() - interval '7 days') x WHERE n <= 20 ORDER BY source_id, started_at DESC;
\echo '=== 近 7 天发现、没有发布时间的条目'
SELECT source_id, to_char(discovered_at AT TIME ZONE 'Asia/Kuala_Lumpur','MM-DD HH24:MI') AS found, backfill_reason, url, left(title, 40) AS title
       FROM articles WHERE published_at IS NULL AND discovered_at > now() - interval '7 days' ORDER BY source_id, discovered_at;
ROLLBACK;
