#!/usr/bin/env bash
# 2026-10-04 夜交接后的一条（myfnb/HANDOFF.md §9.1）：业态标签「小吃/档口」改名「小吃/摊位」，先把已入库条目上的旧标签改掉并
# 重新发布这些条目；评分提示词改了几处措辞（档口、拿去尝试、讲者、这一集讲），再用 333 条 gold 重跑评测（对照 v5：40 分
# 必看 34 / 可看 40 / 不看 3）；最后打印用量。评测跑在 worker 容器里，中途遇到自动部署会被打断：这里在主机上循环，等 worker
# 回来接着跑，已完成的调用按回执复用，不重复收费。输出整段复制文字贴回给 Claude（不要截图）。
set -u
cd /opt/myfnbguide
w() { docker compose exec -T -u root worker "$@"; }

echo "== 部署中的版本：$(git log -1 --format='%h %s' | cut -c1-60)"
until w true 2>/dev/null; do echo "等 worker 启动……"; sleep 20; done

echo "== 1/3 已入库条目的旧标签「小吃/档口」改为「小吃/摊位」，重新发布这些条目"
until w node myfnb/retag-2026-10-04.ts; do
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

echo "== 3/3 用量"
docker compose exec -T db psql -U aihot -d aihot -Atc "SELECT 'llm per_day ' || per_day || ', used 24h ' || (SELECT count(*) FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day') FROM budgets WHERE service = 'llm'"
echo "== 全部完成"
