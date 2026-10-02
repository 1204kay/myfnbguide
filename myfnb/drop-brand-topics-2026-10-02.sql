-- 2026-10-02 删掉 30 个品牌主题页（麦当劳、星巴克、美团……）。industry/topics.json 已去掉它们，
-- 但 seed.ts 只按 slug 更新、不删旧主题，所以服务器上要删一次。可重复执行；输出两行，跟评测结果一起贴回来。
-- 品牌名单（industry/taxonomy.ts 的 ENTITIES 与身份词典）留着：文章照样打品牌标签，写摘要时照样防张冠李戴。
WITH d AS (DELETE FROM topics WHERE grp = 'company' RETURNING slug)
SELECT 'brand topics deleted: ' || count(*) FROM d;
SELECT 'topics left: ' || coalesce(string_agg(grp || ' ' || n, ', '), 'none')
FROM (SELECT grp, count(*) AS n FROM topics GROUP BY grp ORDER BY grp) t;
