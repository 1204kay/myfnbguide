-- 2026-10-05：Your Life and Restaurant 的主持人 Jose Lamas Gonzalez 在美国经营一家家庭餐馆（节目页和单集简介：做餐饮 20 多年、
-- 夏季旺季在店里），原名「（美国 · 播客）」让写故事的模型把他当成媒体，同一家店写成好几种说法。来源名括号里的部分只给
-- 模型看（publication/rules.ts 的 publicSourceName）。seed.ts 不覆盖已有来源，所以在服务器上改；可以重复跑。
UPDATE sources SET name = 'Your Life and Restaurant（美国 · 家庭餐馆老板的播客）', updated_at = now()
WHERE id = 'pod-your-life-and-restaurant' AND name <> 'Your Life and Restaurant（美国 · 家庭餐馆老板的播客）'
RETURNING id, name;
