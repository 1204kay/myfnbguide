-- 11-01 新信源满一周复盘的结论（写正式库）：停用 rss-dantri-kinh-doanh（Dân trí 商业版）。已收的条目留着。
-- 依据：10-25 接入时定的推翻条件「盲看判该收的不到一半」。18 个新订阅一周入选 9 条，十一盲看判该收 4 条（44%）；
--   Dân trí 入选 3 条，盲看 0 条该收（越南本国税务、肉价，对全球华人受众太窄）；其余 3 个信源 6 条里 4 条该收。
--   记录在手册 业务线/myfnbguide/记录/2026-11-01/新信源满一周复盘.md。Kay 10-31「你们讨论决定 不要再拖了」。
-- 先整行打出来备份，再在一条事务里改；可以重复跑。
--   ssh <服务器> 'cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -X -P pager=off' < myfnb/sources-stop-dantri-2026-11-01.sql
\echo '=== 改之前（整行备份，原样存下）'
SELECT row_to_json(s) FROM sources s WHERE id = 'rss-dantri-kinh-doanh';
BEGIN;
UPDATE sources SET enabled = false, health = 'paused', updated_at = now()
  WHERE id = 'rss-dantri-kinh-doanh' AND enabled RETURNING id AS paused, name;
COMMIT;
\echo '=== 改之后'
SELECT id, enabled, health FROM sources WHERE id = 'rss-dantri-kinh-doanh';
