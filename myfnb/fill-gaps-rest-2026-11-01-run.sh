#!/usr/bin/env bash
# 2026-11-01 fill-gaps 补跑：第一轮花到 0.15 就停，8 个订阅一条都没判到（myfnb/sourcing/trial-fill-gaps-rest-2026-11-01.json：note 5 个 + 名册 3 个）。
# 这批几乎全过预筛，按上一趟实测每条约 US$0.0031（第一轮）、0.0022（第二轮）估：第一轮 32 条约 0.10，第二轮最多 8 个 × 15 条约 0.26，
# 名册 3 个大概过不了预筛，按 5 个算约 0.16；合计约 0.26，最多约 0.36。上限 0.15 + 0.25 = 0.40：第二轮宁可多留，免得又像上一趟那样没判完就停。
# trial-sources.ts 现在开判每条前就把在途的算进上限（11-01 上一趟 0.50 跑成 0.512，经验 C15），不会再超。
# 要 Kay 在云电脑串打同意句才跑。不在 05:00–08:00 MYT 跑；跑时不要合并 myfnbguide。不调 llm per_day，开跑前数滚动 24 小时。
#   cd /opt/myfnbguide && bash myfnb/fill-gaps-rest-2026-11-01-run.sh start | status
set -euo pipefail
OUT=/tmp/myfnb-fill-gaps-rest-2026-11-01
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
    nohup bash myfnb/fill-gaps-rest-2026-11-01-run.sh run > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(git -c safe.directory=/opt/myfnbguide rev-parse --short HEAD)，滚动 24 小时 $used / $cap，日志 $LOG"
    ;;
  run)
    cd /opt/myfnbguide
    trial() { sudo docker compose exec -T worker node myfnb/trial-sources.ts --apply --sample trial-fill-gaps-rest-2026-11-01.json --jobs 3 --reserve 3000 "$@"; }
    echo "# ① 第一轮 $(date -u +%FT%TZ)"
    trial --per 4 --cap-usd 0.15
    first=$(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -1' | tr -d '\r')
    echo "# 第一轮逐条结果：$first"
    echo "# ② 第二轮 $(date -u +%FT%TZ)"
    trial --per 15 --cap-usd 0.25 --only-passed "$first"
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
  *) echo "用法：bash myfnb/fill-gaps-rest-2026-11-01-run.sh start|status"; exit 1 ;;
esac
