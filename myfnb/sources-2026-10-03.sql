-- 2026-10-03：第三轮标注后调整来源（HANDOFF §9 第 3 项）。可以重复执行；输出三行数字。
-- 一、恢复 9 个 10/2 下午停用的播客：用户第三轮标注里两个月抽 2–3 集至少 1 条必看、0 条不看。
--    seed.ts 不覆盖已有的来源，所以加回 sources.json 不会自动打开，要在这里打开，并改对国家标签和名称（标签会交给写摘要的模型）。
--    第 10 个（Passe moi le sel）是新来源，部署时 seed 会加进来。
-- 二、停用「开店笔记」：每集简介都是主播固定的拜师学艺广告，用户第三轮：「全部没有简介，所以全部不看，因为不知道内容是什么」。
--    撤下它还没分析的条目与排队任务（与 pause-2026-10-02b.sql 相同的做法）。
CREATE TEMP TABLE reopen (id text PRIMARY KEY, tags text[], name text);
INSERT INTO reopen VALUES
  ('pod-your-life-and-restaurant', ARRAY['美国', '播客'], 'Your Life and Restaurant（餐厅老板的工作与生活，播客）'),
  ('pod-kr-baemin-owner-talk', ARRAY['韩国', '播客'], '사장님 라이브 토크 · 배민아카데미（韩国外卖平台的小店老板讲座，播客）'),
  ('pod-entre-hosteleros', ARRAY['西班牙', '播客'], 'ENTRE HOSTELEROS（西班牙小店老板访谈，播客）'),
  ('pod-say86-hospitality', ARRAY['英国', '播客'], 'say86 Hospitality Podcast（英国餐旅，播客）'),
  ('pod-elevated-hospitality', ARRAY['美国', '播客'], 'The Elevated Hospitality Podcast（餐旅带人，播客）'),
  ('pod-restaurant-hero', ARRAY['德国', '播客'], 'Restaurant Hero（德国餐饮老板访谈，播客）'),
  ('pod-restaurant-deal-making-exposed-with-patr', ARRAY['美国', '播客'], 'Restaurant Deal Making EXPOSED!（餐厅买卖经纪人，播客）'),
  ('pod-restaurant-coach', ARRAY['美国', '播客'], 'The Restaurant Coach Podcast（独立餐厅教练，播客）'),
  ('pod-restaurant-technology-podcast', ARRAY['美国', '播客'], 'Restaurant Technology Podcast（Cali BBQ 老板，播客）');
WITH r AS (
  UPDATE sources s SET enabled = true, health = 'unknown', fail_count = 0, next_fetch_at = now(), tags = o.tags, name = o.name, updated_at = now()
  FROM reopen o WHERE s.id = o.id AND (NOT s.enabled OR s.tags IS DISTINCT FROM o.tags OR s.name IS DISTINCT FROM o.name)
  RETURNING s.id
) SELECT count(*) AS reopened_sources FROM r;
WITH paused AS (
  UPDATE sources s SET enabled = false, health = 'paused', updated_at = now()
  WHERE s.id = 'pod-cn-kaidian-biji' AND s.enabled
  RETURNING s.id
), stale AS (
  UPDATE articles a SET processing_state = 'skipped', processing_queued_at = NULL, processing_retry_at = NULL
  WHERE a.source_id = 'pod-cn-kaidian-biji'
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
