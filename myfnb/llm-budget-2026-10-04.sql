-- 2026-10-04 夜：模型调用的每日上限（10/3 起每天 6,000 次，按过去 24 小时滚动算）可能被当天的故事重写、存档分析和评测
-- 占满，新条目在排队等额度（公开池最新一条停在 10/4 12:15）。这里只读：打印每天上限、过去 24 小时按用途的调用数、
-- 两天内条目的处理状态。要不要调高上限由用户决定（myfnb/HANDOFF.md §9.1）。
SELECT 'llm per_day ' || per_day FROM budgets WHERE service = 'llm';
SELECT c.purpose, count(*) AS calls_24h FROM receipt_attempts a JOIN receipts c ON c.id = a.receipt_id
WHERE a.service = 'llm' AND a.origin = 'live' AND a.started_at > now() - interval '1 day' GROUP BY 1 ORDER BY 2 DESC;
SELECT processing_state, count(*) FILTER (WHERE NOT backfill) AS live, count(*) FILTER (WHERE backfill) AS backfill
FROM articles WHERE discovered_at > now() - interval '2 days' GROUP BY 1 ORDER BY 1;
