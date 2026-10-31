#!/usr/bin/env bash
# 2026-10-31 找不到条款页的小批试吃（十一定改 B9：robots 许可、没挡 AI 爬虫的可以进试吃，接入前再找一次条款）。
# 清单 myfnb/sourcing/trial-noterms-2026-10-31.json：989 个找不到条款页的订阅里，robots 许可、没挡 AI 爬虫、8 月以后还在更新的 187 个（同名重复的去掉）。
# 做法同 trial-y-2026-10-31-run.sh：第一轮每个看 6 条，第二轮对有过预筛的每个看 25 条。
# 花费上限两轮合计 US$3：脚本每判完一条才查上限，--jobs 3 时最后会多花几条的钱，所以两轮设 1.28 + 1.58，留出余量（经验 C15）。
# 按上午的实测单价估约 US$2.9，可能碰上限、少数订阅轮不到。llm 每天上限照旧临时调到 30,000、跑完调回 10,000；不在 05:00–08:00 MYT 跑；跑时不要合并 myfnbguide。
# 跑完先把两轮的逐条结果拷出容器：worker 一重启，容器 /tmp 就清空了（10-31 上午那趟就这样丢了）。
#   cd /opt/myfnbguide && bash myfnb/trial-noterms-2026-10-31-run.sh start | status
set -euo pipefail
OUT=/tmp/myfnb-trial-noterms-2026-10-31
LOG=$OUT/run.log
PID=$OUT/run.pid
psql() { sudo docker compose exec -T db psql -U aihot -d aihot -At -c "$1"; }

case "${1:-}" in
  start)
    hour=$(TZ=Asia/Kuala_Lumpur date +%H)
    if [ "$hour" -ge 5 ] && [ "$hour" -lt 8 ]; then echo "05:00–08:00 MYT 是十一说出稿的时段，不跑"; exit 1; fi
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "上一趟还在跑"; exit 1; fi
    mkdir -p "$OUT"
    cd /opt/myfnbguide
    nohup bash myfnb/trial-noterms-2026-10-31-run.sh run > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(git -c safe.directory=/opt/myfnbguide rev-parse --short HEAD)，日志 $LOG"
    ;;
  run)
    cd /opt/myfnbguide
    trap 'echo "# 调回：$(psql "UPDATE budgets SET per_day = 10000, updated_at = now() WHERE service = '"'llm'"' RETURNING service, per_day")"' EXIT
    echo "# 调高：$(psql "UPDATE budgets SET per_day = 30000, updated_at = now() WHERE service = 'llm' RETURNING service, per_day")"
    trial() { sudo docker compose exec -T worker node myfnb/trial-sources.ts --apply --sample trial-noterms-2026-10-31.json --jobs 3 --reserve 3000 "$@"; }
    echo "# ① 第一轮 $(date -u +%FT%TZ)"
    trial --per 6 --cap-usd 1.28
    first=$(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -1' | tr -d '\r')
    echo "# 第一轮逐条结果：$first"
    echo "# ② 第二轮 $(date -u +%FT%TZ)"
    trial --per 25 --cap-usd 1.58 --only-passed "$first"
    for f in $(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -2' | tr -d '\r'); do
      sudo docker compose cp "worker:$f" "$OUT/" && echo "# 已拷出：$OUT/$(basename "$f")"
    done
    echo "# 跑完 $(date -u +%FT%TZ)"
    ;;
  status)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "还在跑"; else echo "没有在跑"; fi
    cd /opt/myfnbguide && echo "llm 每天上限：$(psql "SELECT per_day FROM budgets WHERE service = 'llm'")"
    grep '^# ' "$LOG" 2>/dev/null | tail -8 || true
    tail -3 "$LOG" 2>/dev/null || true
    ;;
  *) echo "用法：bash myfnb/trial-noterms-2026-10-31-run.sh start|status"; exit 1 ;;
esac
