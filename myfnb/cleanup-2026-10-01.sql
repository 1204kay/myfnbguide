-- 2026-10-01 改为全球定位后，清理正式服务器上试跑期的旧数据（HANDOFF.md §9 第 3 项）。
-- 先用 scripts/delete-sources.ts 删掉马来西亚来源，再跑本文件：
--   sudo docker compose exec -T db psql -U aihot -d aihot -v ON_ERROR_STOP=1 -f - < myfnb/cleanup-2026-10-01.sql
-- 可以重复执行：已经改过、删过的不会再变。

BEGIN;

-- sources.json 里加的分类过滤只对新导入的信源生效，已有的三个在这里补上。
UPDATE sources SET config = config || '{"denyCategories": ["Appointments", "Awards and Recognition", "Event Coverage"]}'::jsonb WHERE id = 'rss-fer';
UPDATE sources SET config = config || '{"allowCategories": ["Feature"]}'::jsonb WHERE id = 'rss-fsr';
UPDATE sources SET config = config || '{"denyCategories": ["Events", "Digital Issue"]}'::jsonb WHERE id = 'rss-totalfood';

-- seed 只更新和新增主题，不删除；industry/topics.json 里没有的旧主题（马来西亚机构、旧业态等）在这里删掉。
DELETE FROM topics WHERE slug NOT IN (
  'people','cost-profit','ingredients','menu-pricing','traffic-loyalty','new-products','delivery','ai-automation','tech','equipment',
  'store-design','opening-expansion','franchising','closures','funding','going-global','food-safety','halal','tax','packaging',
  'coffee','tea-drinks','hotpot','quick-service','full-service','bakery','snacks-stalls','catering','bars','china','hong-kong','taiwan',
  'japan','korea','southeast-asia','india','middle-east','australia','usa','canada','uk-europe','latin-america',
  'mcdonalds','kfc','yumchina','starbucks','luckin','mixue','chagee','heytea','guming','chabaidao','cotti','haidilao','pizzahut',
  'dominos','burgerking','subway','chipotle','jollibee','saizeriya','sushiro','yoshinoya','timhortons','dunkin','meituan','eleme',
  'doordash','ubereats','grab','foodpanda','deliveroo'
);

-- 开站当天补发出来的空刊（日报没有条目、周报月报没有入选）。有内容的不动。
DELETE FROM reports
WHERE (kind = 'daily' AND coalesce((content -> 'metrics' ->> 'totalEvents')::int, 0) = 0)
   OR (kind IN ('weekly', 'monthly') AND coalesce((content -> 'metrics' ->> 'selectedCount')::int, 0) = 0);

COMMIT;

-- 核对：剩下的信源（应为 20 个启用，外加暂停的食品産業新聞社），以及剩下的刊数和主题数。
SELECT id, enabled FROM sources ORDER BY id;
SELECT kind, count(*) AS issues FROM reports GROUP BY kind ORDER BY kind;
SELECT count(*) AS topics FROM topics;
