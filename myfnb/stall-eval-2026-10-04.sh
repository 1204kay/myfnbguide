#!/usr/bin/env bash
# 2026-10-04 夜交接后的一条（myfnb/HANDOFF.md §9.1，10/5 凌晨补了来源名和改旧条目的用词）：业态标签「小吃/档口」改名「小吃/摊位」，先把已入库条目上的旧标签改掉并
# 重新发布这些条目；评分提示词改了几处措辞（档口、拿去尝试、讲者、这一集讲），再用 333 条 gold 重跑评测（对照 v5：40 分
# 必看 34 / 可看 40 / 不看 3）；最后打印用量。评测跑在 worker 容器里，中途遇到自动部署会被打断：这里在主机上循环，等 worker
# 回来接着跑，已完成的调用按回执复用，不重复收费。输出整段复制文字贴回给 Claude（不要截图）。
set -u
cd /opt/myfnbguide
w() { docker compose exec -T -u root worker "$@"; }

echo "== 部署中的版本：$(git log -1 --format='%h %s' | cut -c1-60)"
until w true 2>/dev/null; do echo "等 worker 启动……"; sleep 20; done

echo "== 0/3 模型调用：每天上限、过去 24 小时按用途的调用数、两天内条目的处理状态（只读）"
docker compose exec -T db psql -U aihot -d aihot -At -f - < myfnb/llm-budget-2026-10-04.sql

echo "== 来源名：Your Life and Restaurant 标明是家庭餐馆老板的播客"
docker compose exec -T db psql -U aihot -d aihot -At -v ON_ERROR_STOP=1 -f - < myfnb/sources-names-2026-10-05.sql

echo "== 1/3 已入库条目的旧标签改为新标签（10/5 起：「小吃/摊位」改为「摊位/餐车」），重新发布这些条目"
until w node myfnb/retag-2026-10-05.ts; do
  echo "没有跑完（多半是部署重启了 worker），30 秒后再跑"
  sleep 30
  until w true 2>/dev/null; do sleep 20; done
done

echo "== 2/3 评测：333 条 gold，评分提示词的书面语措辞（约半小时）"
for round in $(seq 1 12); do
  until w true 2>/dev/null; do sleep 20; done
  w sh -c "test -s .data/gold.jsonl || node myfnb/build-gold.ts > /dev/null" || { sleep 30; continue; }
  w node scripts/eval-selection.ts --gold .data/gold.jsonl --n 500 --concurrency 2 --label '小店标准 v6：摊位与书面语措辞' > /dev/null 2>&1
  if w sh -c "node myfnb/eval-cases.ts | head -1 | grep -q 'errors 0$'" 2>/dev/null; then break; fi
  echo "第 ${round} 轮没有跑完（部署打断或调用上限），65 秒后接着跑"
  sleep 65
done
w node myfnb/eval-cases.ts
w node myfnb/eval-cases.ts --sweep

echo "== 入选条目里带「讲」这类词的标题、摘要和收录理由：按新的处理流程重写（约 60 条，每条几次调用；评测之后跑）"
until w node myfnb/rewrite-copy-2026-10-05.ts; do
  echo "没有跑完（多半是部署重启了 worker），30 秒后再跑"
  sleep 30
  until w true 2>/dev/null; do sleep 20; done
done

echo "== 3/3 用量"
docker compose exec -T db psql -U aihot -d aihot -Atc "SELECT 'llm per_day ' || per_day || ', used 24h ' || (SELECT count(*) FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day') FROM budgets WHERE service = 'llm'"
echo "== 规则 6：新来源对服务器返回 403、405 的暂停，其余不正常的列出来"
docker compose exec -T db psql -U aihot -d aihot -c "WITH last AS (SELECT DISTINCT ON (source_id) source_id, error FROM fetch_runs ORDER BY source_id, started_at DESC) UPDATE sources s SET enabled = false, health = 'paused', updated_at = now() FROM last WHERE last.source_id = s.id AND s.enabled AND s.health <> 'ok' AND last.error ~ '^HTTP 40[35]' RETURNING s.id AS paused, left(last.error, 60) AS error;" -c "SELECT s.id, s.health, s.fail_count, left(r.error, 80) AS error FROM sources s LEFT JOIN LATERAL (SELECT error FROM fetch_runs WHERE source_id = s.id ORDER BY started_at DESC LIMIT 1) r ON true WHERE s.enabled AND s.health NOT IN ('ok', 'unknown') ORDER BY s.id;"
echo "== 全部完成"
