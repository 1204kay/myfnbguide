-- 合并上游 b3998dc 以后，gov.uk 的 Atom 订阅只有 updated（改版时间），引擎不再拿它当发布时间，
-- 这两个信源的新条目会全部没有日期。从页面的 govuk:first-published-at 读发布时间（industry/sources.json 同样改了）。
-- 部署合并版以后在服务器上执行一次；已有发布时间的旧条目不受影响。
UPDATE sources SET config = config || '{"detail": {"publishedAtSelector": "meta[name=\"govuk:first-published-at\"]", "maxFetches": 5}}'::jsonb
WHERE id IN ('rss-uk-fsa-news', 'rss-uk-low-pay-commission') AND NOT config ? 'detail'
RETURNING id, config->'detail' AS detail;
