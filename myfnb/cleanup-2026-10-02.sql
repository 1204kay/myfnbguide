-- 2026-10-02：撤下 10/2 加入的信源在第二次采集时补进来、还没分析的旧条目（发现时已超过 48 小时的历史）。
-- 原因：首次导入之后，普通采集会把订阅里剩下的旧条目全部补进来再逐条走模型；PR TIMES 企业订阅一家约 200 条，
-- 61 家就是上万条，会把每日模型上限和 DeepSeek 余额耗在旧新闻稿上（HANDOFF §5.4）。之后加的信源都打开了
-- initialBackfillOnly，不会再这样。只动没分析过的条目：标成 skipped，并删掉它们还在排队的分析任务；已分析的不碰。
-- 可以重复执行。用法（服务器上）：
--   cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -v ON_ERROR_STOP=1 -f - < myfnb/cleanup-2026-10-02.sql; cd ~
WITH fresh AS (
  SELECT id FROM sources WHERE created_at >= '2026-10-01 22:00:00+00'
), stale AS (
  UPDATE articles a SET processing_state = 'skipped', processing_queued_at = NULL, processing_retry_at = NULL
  WHERE a.source_id IN (SELECT id FROM fresh)
    AND a.backfill AND a.backfill_reason = 'stale-on-discovery'
    AND a.processing_state IN ('new', 'failed')
    AND NOT EXISTS (SELECT 1 FROM analyses n WHERE n.article_id = a.id)
  RETURNING a.id
), dropped AS (
  DELETE FROM pgboss.job j USING stale
  WHERE j.data->>'articleId' = stale.id AND j.name IN ('content.analyze', 'content.extract-body') AND j.state IN ('created', 'retry')
  RETURNING j.id
)
SELECT (SELECT count(*) FROM stale) AS skipped_articles, (SELECT count(*) FROM dropped) AS removed_jobs;

-- 10/2 部署后查到被服务器挡住的 4 个信源（规则 6），一起暂停。
UPDATE sources SET enabled = false, health = 'paused', updated_at = now()
WHERE id IN ('rss-qsr-magazine', 'rss-wahospitality', 'rss-hotelier-me', 'rss-verdict-foodservice') AND enabled;
