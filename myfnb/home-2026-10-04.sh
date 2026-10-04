#!/usr/bin/env bash
# 2026-10-04 晚给用户回家跑的一条（myfnb/HANDOFF.md §9.1）：清掉来源配置里作废的旧键、给播客转文字设上限，再用 333 条 gold 重跑评测，
# 最后打印模型调用的用量。评测跑在 worker 容器里，中途遇到自动部署会被打断：这里在主机上循环，等 worker 回来接着跑，
# 已经完成的调用按回执复用，不重复收费。输出整段复制文字贴回给 Claude（不要截图）。
set -u
cd /opt/myfnbguide
w() { docker compose exec -T -u root worker "$@"; }

echo "== 部署中的版本：$(git log -1 --format='%h %s' | cut -c1-60)"
until w true 2>/dev/null; do echo "等 worker 启动……"; sleep 20; done

echo "== 1/3 去掉作废的配置键 initialBackfillOnly；给播客转文字设每天上限（存档试跑，Gemini 免费层）"
docker compose exec -T db psql -U aihot -d aihot -At -v ON_ERROR_STOP=1 -f - < myfnb/drop-backfill-only-2026-10-04.sql
docker compose exec -T db psql -U aihot -d aihot -At -c "INSERT INTO budgets (service, per_minute, per_hour, per_day, note) VALUES ('transcribe', 2, 30, 150, '播客转文字（Gemini 免费层），存档试跑') ON CONFLICT (service) DO NOTHING RETURNING service, per_day;"

echo "== 2/3 评测：333 条 gold，书面语的评分提示词与新来源名（约半小时）"
for round in $(seq 1 12); do
  until w true 2>/dev/null; do sleep 20; done
  w sh -c "test -s .data/gold.jsonl || node myfnb/build-gold.ts > /dev/null" || { sleep 30; continue; }
  w node scripts/eval-selection.ts --gold .data/gold.jsonl --n 500 --concurrency 2 --label '小店标准 v5：书面语与新来源名' > /dev/null 2>&1
  if w sh -c "node myfnb/eval-cases.ts | head -1 | grep -q 'errors 0$'" 2>/dev/null; then break; fi
  echo "第 ${round} 轮没有跑完（部署打断或调用上限），65 秒后接着跑"
  sleep 65
done
w node myfnb/eval-cases.ts
w node myfnb/eval-cases.ts --sweep

echo "== 3/3 用量"
docker compose exec -T db psql -U aihot -d aihot -Atc "SELECT 'llm per_day ' || per_day || ', used 24h ' || (SELECT count(*) FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day') FROM budgets WHERE service = 'llm'"
echo "== 全部完成"
