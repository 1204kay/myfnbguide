-- 11-14 系统日报里的两个信源（信源串 11-14 09:08 查过）：写正式库。已收的条目留着，不删。
--   rss-foodship：订阅 foodship.com.au/feed/ 回 404，网站已改成卖点餐系统的页面 → 停用。
--   rss-favorilezzetler-tr：网站从 favorilezzetler.com.tr 搬到 favorilezzetler.com，旧订阅 301，新订阅 https://favorilezzetler.com/rss.xml 回 200、是正常的 RSS → 改订阅地址。
--   改了 config 以后，上次抓取的 etag/last-modified 按 configHash 自动作废（packages/backend/src/sources/rss.ts 第 150 行），不用另清。
-- 做法同 sources-stop-12-2026-11-14.sql：先整行打出来备份，再在一条事务里改；可以重复跑（两条都带了「还没改」的条件）。
--   ssh <服务器> 'cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -X -P pager=off' < myfnb/sources-fix-2026-11-14.sql
-- 撤回：UPDATE sources SET enabled = true, health = 'ok' WHERE id = 'rss-foodship'；
--   UPDATE sources SET config = jsonb_set(config, '{feedUrl}', '"https://favorilezzetler.com.tr/rss.xml"') WHERE id = 'rss-favorilezzetler-tr'；并把 industry/sources.json 改回。
\echo '=== 改之前还开着的信源数'
SELECT count(*) FROM sources WHERE enabled;
\echo '=== 改之前（整行备份，原样存下；应当 2 行）'
SELECT row_to_json(s) FROM sources s WHERE id IN ('rss-foodship', 'rss-favorilezzetler-tr') ORDER BY id;
BEGIN;
UPDATE sources SET enabled = false, health = 'paused', updated_at = now()
  WHERE id = 'rss-foodship' AND enabled RETURNING id AS paused, name;
UPDATE sources SET config = jsonb_set(config, '{feedUrl}', '"https://favorilezzetler.com/rss.xml"'), updated_at = now()
  WHERE id = 'rss-favorilezzetler-tr' AND config->>'feedUrl' = 'https://favorilezzetler.com.tr/rss.xml' RETURNING id AS moved, config->>'feedUrl' AS feed_url;
COMMIT;
\echo '=== 改之后（rss-foodship 的 enabled 是 f；rss-favorilezzetler-tr 的订阅是 .com）'
SELECT id, enabled, health, config->>'feedUrl' AS feed_url FROM sources WHERE id IN ('rss-foodship', 'rss-favorilezzetler-tr') ORDER BY id;
\echo '=== 还开着的信源数（比改之前少 1；改之前 rss-foodship 已经关着就不变）'
SELECT count(*) FROM sources WHERE enabled;
