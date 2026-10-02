-- 2026-10-03：门槛从 76（T2）/ 60（T1）降到 40 以后，把最近两天按旧门槛没入选、平均分已经到 40 的条目交回处理，按新门槛重判。
-- 门槛只在分析时判，不改就不会重判（HANDOFF §12）。做法是框架自己的路：处理状态改回 new，worker 每 5 分钟一次的补漏
-- （jobs/content.ts sweepUnprocessed）会重新排队；预筛、评分、结构化的回执按相同输入复用，不重复收费，
-- 40–49 分的条目要新写一次精选的写法（推荐理由），每条约 1 次调用。只动还开着的来源、不是回补的条目。可以重复执行。
WITH latest AS (
  SELECT DISTINCT ON (n.article_id) n.article_id, n.relevance, n.selected, n.score
  FROM analyses n JOIN articles a ON a.id = n.article_id
  WHERE a.discovered_at > now() - interval '2 days'
  ORDER BY n.article_id, n.id DESC
), r AS (
  UPDATE articles a SET processing_state = 'new', processing_attempts = 0, processing_retry_at = NULL, processing_queued_at = NULL, processing_error = NULL
  FROM latest l
  WHERE l.article_id = a.id AND l.relevance = 'pass' AND NOT l.selected AND l.score >= 40
    AND a.processing_state = 'analyzed' AND NOT a.backfill
    AND a.source_id IN (SELECT id FROM sources WHERE enabled AND participation_mode = 'editorial')
  RETURNING a.id
) SELECT count(*) AS rejudge FROM r;
