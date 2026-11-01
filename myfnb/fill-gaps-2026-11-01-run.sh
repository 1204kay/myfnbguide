#!/usr/bin/env bash
# 2026-11-01 信源「找全」补缺口的小批试吃：22 个订阅（myfnb/sourcing/trial-fill-gaps-2026-11-01.json，note 第二批 19 个 + 名册 3 个）。
# 和补试吃同样两轮：第一轮每个看 4 条，第二轮对有过预筛的看 15 条。按补试吃的单价（478 个两轮 US$4.93）估约 US$0.25；
# 上限 0.15 + 0.35 = 0.50。要 Kay 在云电脑串打同意句才跑。不在 05:00–08:00 MYT 跑；跑时不要合并 myfnbguide。
# 约 250 条、每条约 1.6 次调用，约 400 次：不调 llm per_day，开跑前数滚动 24 小时，离上限不到 3,000 + 400 次就不跑（经验 C3）。
#   cd /opt/myfnbguide && bash myfnb/fill-gaps-2026-11-01-run.sh start | status
set -euo pipefail
OUT=/tmp/myfnb-fill-gaps-2026-11-01
LOG=$OUT/run.log
PID=$OUT/run.pid
psql() { sudo docker compose exec -T db psql -U aihot -d aihot -At -c "$1"; }

case "${1:-}" in
  start)
    hour=$(TZ=Asia/Kuala_Lumpur date +%H)
    if [ "$hour" -ge 5 ] && [ "$hour" -lt 8 ]; then echo "05:00–08:00 MYT 是十一说出稿的时段，不跑"; exit 1; fi
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "上一趟还在跑"; exit 1; fi
    cd /opt/myfnbguide
    used=$(psql "SELECT count(*) FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day'")
    cap=$(psql "SELECT per_day FROM budgets WHERE service = 'llm'")
    if [ $((cap - used)) -lt 3400 ]; then echo "滚动 24 小时已有 $used 次、上限 $cap，余量不到 3,400 次，不跑"; exit 1; fi
    mkdir -p "$OUT"
    nohup bash myfnb/fill-gaps-2026-11-01-run.sh run > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(git -c safe.directory=/opt/myfnbguide rev-parse --short HEAD)，滚动 24 小时 $used / $cap，日志 $LOG"
    ;;
  run)
    cd /opt/myfnbguide
    trial() { sudo docker compose exec -T worker node myfnb/trial-sources.ts --apply --sample trial-fill-gaps-2026-11-01.json --jobs 3 --reserve 3000 "$@"; }
    echo "# ① 第一轮 $(date -u +%FT%TZ)"
    trial --per 4 --cap-usd 0.15
    first=$(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -1' | tr -d '\r')
    echo "# 第一轮逐条结果：$first"
    echo "# ② 第二轮 $(date -u +%FT%TZ)"
    trial --per 15 --cap-usd 0.35 --only-passed "$first"
    for f in $(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -2' | tr -d '\r'); do
      sudo docker compose cp "worker:$f" "$OUT/" && echo "# 已拷出：$OUT/$(basename "$f")"
    done
    echo "# 跑完 $(date -u +%FT%TZ)"
    ;;
  status)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "还在跑"; else echo "没有在跑"; fi
    grep '^# ' "$LOG" 2>/dev/null | tail -8 || true
    tail -3 "$LOG" 2>/dev/null || true
    ;;
  *) echo "用法：bash myfnb/fill-gaps-2026-11-01-run.sh start|status"; exit 1 ;;
esac
