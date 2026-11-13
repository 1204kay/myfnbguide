-- 11-13 线上信源条款扫描的结论（写正式库）：停用 19 个信源。已收的条目留着，不删。
-- 依据：十一 11-13 17:12 定，往严的方向，名单不再问 Kay。两类：
--   6 个是条款或所在平台不许（条款明写只许个人非商业使用 2：rss-eater、rss-boston；Substack 平台 2：rss-vittlesmagazine、
--   rss-readfeedme；条款点名「存储」2：web-shiftbase、rss-revistahosteleria，照决定记录 L3282）；
--   13 个是 11-13 跑 myfnb/check-sources.mjs 时 robots.txt 明写不放行（拒绝所有爬虫读这个订阅地址，或拒绝替读者读网页的 AI）。
--   每个的原句和出处：项目文件 myfnb/全面检查-1113/线上信源条款扫描-1113/该停用的19个.md；本站规矩见使用规则第 3 节。
-- 先整行打出来备份，再在一条事务里改；可以重复跑。
--   ssh <服务器> 'cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -X -P pager=off' < myfnb/sources-stop-19-2026-11-13.sql
-- 撤回：对要恢复的那几个 UPDATE sources SET enabled = true, health = 'ok' WHERE id IN (...)，并把它们加回 industry/sources.json。
\set ids '''web-shiftbase'',''rss-eater'',''rss-vittlesmagazine'',''rss-boston'',''rss-revistahosteleria'',''rss-readfeedme'',''nr-jollibee'',''rss-horesca-lu'',''rss-cosboa'',''rss-bakingbusiness'',''rss-yoomag'',''rss-pubisthehub'',''rss-veitingageirinn-is'',''rss-esmmagazine'',''rss-directoalpaladar'',''rss-secretnyc'',''rss-madridsecreto'',''rss-oliveoiltimes'',''rss-secretmanchester'''
\echo '=== 改之前（整行备份，原样存下；应当 19 行）'
SELECT row_to_json(s) FROM sources s WHERE id IN (:ids) ORDER BY id;
BEGIN;
UPDATE sources SET enabled = false, health = 'paused', updated_at = now()
  WHERE id IN (:ids) AND enabled RETURNING id AS paused, name;
COMMIT;
\echo '=== 改之后（应当 19 行，enabled 都是 f）'
SELECT id, enabled, health FROM sources WHERE id IN (:ids) ORDER BY id;
\echo '=== 还开着的信源数（应当 442）'
SELECT count(*) FROM sources WHERE enabled;
