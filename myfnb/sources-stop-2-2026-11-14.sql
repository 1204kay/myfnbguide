-- 11-14 信源串复核的结论（写正式库）：停用 2 个信源。已收的条目留着，不删。
-- 依据：十一 11-14 10:51 定，从严直接停。
--   web-caper：网站建在 beehiiv 上，beehiiv 使用条款（beehiiv.com/tou，2026-10-06 版）写明对访客也适用，第 3 节 (vi) 禁止爬取、抓取。
--   rss-ondernemerslijst-horeca：已经停更，订阅最新一条是 2025-06-02，不够守则 3.8「还在发」的门槛。
-- 做法同 sources-stop-12-2026-11-14.sql：先整行打出来备份，再在一条事务里改；可以重复跑。
--   ssh <服务器> 'cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -X -P pager=off' < myfnb/sources-stop-2-2026-11-14.sql
-- 撤回：对要恢复的那个 UPDATE sources SET enabled = true, health = 'ok' WHERE id IN (...)，并把它加回 industry/sources.json。
\set ids '''web-caper'',''rss-ondernemerslijst-horeca'''
\echo '=== 改之前还开着的信源数（11-14 实测 428）'
SELECT count(*) FROM sources WHERE enabled;
\echo '=== 改之前（整行备份，原样存下；应当 2 行）'
SELECT row_to_json(s) FROM sources s WHERE id IN (:ids) ORDER BY id;
BEGIN;
UPDATE sources SET enabled = false, health = 'paused', updated_at = now()
  WHERE id IN (:ids) AND enabled RETURNING id AS paused, name;
COMMIT;
\echo '=== 改之后（应当 2 行，enabled 都是 f）'
SELECT id, enabled, health FROM sources WHERE id IN (:ids) ORDER BY id;
\echo '=== 还开着的信源数（改之前 428 时应当 426；改之前已有关着的，就按 UPDATE 的行数相减）'
SELECT count(*) FROM sources WHERE enabled;
