#!/usr/bin/env bash
# 试吃补判和第二轮一晚跑完（10-24：Kay 问「为什么要分三天 不能调高限度」，十一同意一晚跑完）。
# 模型调用熔断（budgets 表 llm）每天 10,000 次，按过去 24 小时滚动算，第一轮已经用掉约 6,300 次；补判加第二轮约 1.4 万次。
# 所以这一趟先把每天上限临时调到 30,000（每小时 6,000、每分钟 300 不动），跑完调回 10,000；中途出错或被中断也调回（trap）。
# 花费由 trial-sources.ts 的 --cap-usd 管（两步合计 US$14），线上由 --reserve 3000 留余量。不在 05:00–08:00 MYT（十一说出稿）跑。
#   cd /opt/myfnbguide && bash myfnb/trial-sources-run.sh start    后台开跑，马上返回
#   bash myfnb/trial-sources-run.sh status                          还在跑 / 跑完了，上限现在是多少，日志最后几行
set -euo pipefail
OUT=/tmp/myfnb-trial-sources
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
    nohup bash myfnb/trial-sources-run.sh run > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(git rev-parse --short HEAD)，日志 $LOG"
    ;;
  run)
    cd /opt/myfnbguide
    trap 'echo "# 调回：$(psql "UPDATE budgets SET per_day = 10000, updated_at = now() WHERE service = '"'llm'"' RETURNING service, per_day")"' EXIT
    echo "# 调高：$(psql "UPDATE budgets SET per_day = 30000, updated_at = now() WHERE service = 'llm' RETURNING service, per_day")"
    trial() { sudo docker compose exec -T worker node myfnb/trial-sources.ts --apply --per 25 --jobs 3 --reserve 3000 "$@"; }
    echo "# ① 补判 $(date -u +%FT%TZ)"
    trial --sample trial-redo-2026-10-24.json --cap-usd 3
    echo "# ② 第二轮 $(date -u +%FT%TZ)"
    trial --sample trial-round2-2026-10-24.json --cap-usd 11
    echo "# 跑完 $(date -u +%FT%TZ)"
    ;;
  status)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "还在跑"; else echo "没有在跑"; fi
    cd /opt/myfnbguide && echo "llm 每天上限：$(psql "SELECT per_day FROM budgets WHERE service = 'llm'")"
    grep '^# ' "$LOG" 2>/dev/null | tail -8 || true
    tail -3 "$LOG" 2>/dev/null || true
    ;;
  *) echo "用法：start | status"; exit 1 ;;
esac
