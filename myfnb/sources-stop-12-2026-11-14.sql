-- 11-13 线上信源条款扫描第二批的结论（写正式库）：停用 12 个信源。已收的条目留着，不删。
-- 依据：Kay 11-14 05:34 在决定卡上选「照建议：停 12 个，留 6 个」。三类：
--   3 个是出版方条款只许个人使用：rss-banc、rss-ristorantiweb、rss-menumag；
--   8 个建在 Wix 上，照 10-10 定的从严口径（账本 L8713）：rss-horeca-advies、rss-strategeat、rss-coffee-traveler、
--   rss-westchester-food-safety、rss-burnt-chef-project、rss-orientalcoffeeandtea、rss-indualimentos、rss-gsfg-tw；
--   1 个是播客音频服务器的 robots.txt 不放行本站，而本站会下载音频去转写：pod-the-ceres-podcast。
--   每个的原句和出处：项目文件 myfnb/全面检查-1113/线上信源条款扫描-1113/Kay定停用的12个.md；本站规矩见使用规则第 3 节。
-- 做法同 sources-stop-19-2026-11-13.sql：先整行打出来备份，再在一条事务里改；可以重复跑。
--   ssh <服务器> 'cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -X -P pager=off' < myfnb/sources-stop-12-2026-11-14.sql
-- 撤回：对要恢复的那几个 UPDATE sources SET enabled = true, health = 'ok' WHERE id IN (...)，并把它们加回 industry/sources.json。
\set ids '''rss-banc'',''rss-ristorantiweb'',''rss-menumag'',''rss-horeca-advies'',''rss-strategeat'',''rss-coffee-traveler'',''rss-westchester-food-safety'',''rss-burnt-chef-project'',''rss-orientalcoffeeandtea'',''rss-indualimentos'',''rss-gsfg-tw'',''pod-the-ceres-podcast'''
\echo '=== 改之前还开着的信源数（11-13 停完 19 个后实测 441）'
SELECT count(*) FROM sources WHERE enabled;
\echo '=== 改之前（整行备份，原样存下；应当 12 行）'
SELECT row_to_json(s) FROM sources s WHERE id IN (:ids) ORDER BY id;
BEGIN;
UPDATE sources SET enabled = false, health = 'paused', updated_at = now()
  WHERE id IN (:ids) AND enabled RETURNING id AS paused, name;
COMMIT;
\echo '=== 改之后（应当 12 行，enabled 都是 f）'
SELECT id, enabled, health FROM sources WHERE id IN (:ids) ORDER BY id;
\echo '=== 还开着的信源数（改之前 441 时应当 429；改之前已有几个是关着的，就按 UPDATE 的行数相减）'
SELECT count(*) FROM sources WHERE enabled;
