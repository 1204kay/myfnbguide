-- 2026-10-02 傍晚：内容改为站在一家小店里面看以后，按新标准重新量 57 个来源（HANDOFF §5.4、myfnb/remeasure-2026-10-02.tsv）。
-- 9/18–10/2 两周里按小店标准没出过必看、可看少于 2 条的 7 个来源暂停（不删除，后台「信源」里可以恢复），并撤下它们还没分析的条目与排队任务。
-- 可以重复执行。用法（服务器上）：
--   cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -v ON_ERROR_STOP=1 -f - < myfnb/pause-2026-10-02b.sql; cd ~
CREATE TEMP TABLE pause_ids (id text PRIMARY KEY);
INSERT INTO pause_ids VALUES
  ('pod-jp-gaishoku-saizensen'),
  ('rss-gnw-restaurants'),
  ('rss-sivarious'),
  ('prt-royal'),
  ('rss-arca'),
  ('nr-jollibee'),
  ('web-canyin88-kuaixun');
WITH paused AS (
  UPDATE sources s SET enabled = false, health = 'paused', updated_at = now()
  FROM pause_ids p WHERE s.id = p.id AND s.enabled
  RETURNING s.id
), stale AS (
  UPDATE articles a SET processing_state = 'skipped', processing_queued_at = NULL, processing_retry_at = NULL
  WHERE a.source_id IN (SELECT id FROM pause_ids)
    AND a.processing_state IN ('new', 'failed')
    AND NOT EXISTS (SELECT 1 FROM analyses n WHERE n.article_id = a.id)
  RETURNING a.id
), dropped AS (
  DELETE FROM pgboss.job j USING stale
  WHERE j.data->>'articleId' = stale.id AND j.name IN ('content.analyze', 'content.extract-body') AND j.state IN ('created', 'retry')
  RETURNING j.id
)
SELECT (SELECT count(*) FROM paused) AS paused_sources, (SELECT count(*) FROM stale) AS skipped_articles, (SELECT count(*) FROM dropped) AS removed_jobs;
SELECT count(*) AS enabled_sources FROM sources WHERE enabled;
