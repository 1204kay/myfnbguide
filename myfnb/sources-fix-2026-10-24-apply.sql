-- 10-24 信源告警的修法（写正式库）。Kay 看过、打字同意后才跑；可以重复跑。
-- 停用：rss-sischef（网站改版，旧订阅 404，换成 web-sischef-blog，部署时 seed 自动加入）、pod-de-gastrounternehmer（节目从 podigee 整个下线）、
--   rss-tiller（2022 年后不再更新，一条都没收进来过）。已收的条目留着。
-- 抓取间隔 120 → 360 分钟：rss-restaurantandcafe-nz、rss-petpooja（近 7 天各 16、12 次 HTTP 429，被对方限流；两边每天一两篇）。
--   ssh <服务器> 'cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -X -P pager=off' < myfnb/sources-fix-2026-10-24-apply.sql
BEGIN;
UPDATE sources SET enabled = false, health = 'paused', updated_at = now()
  WHERE id IN ('rss-sischef', 'pod-de-gastrounternehmer', 'rss-tiller') AND enabled RETURNING id AS paused, name;
UPDATE sources SET interval_minutes = 360, updated_at = now()
  WHERE id IN ('rss-restaurantandcafe-nz', 'rss-petpooja') RETURNING id, interval_minutes;
COMMIT;
