#!/usr/bin/env bash
# 2026-10-31 Y 待定试吃：手册台账里条款读过、没有限制的 576 个，找到订阅的 517 个（myfnb/sourcing/trial-y-2026-10-31.json）。
# 照 10-24 的两轮：第一轮每个订阅看最新 6 条，只淘汰过预筛为 0 的；第二轮对第一轮至少 1 条过预筛的，每个看 25 条（前 6 条用已有回执，不再收费）。
# 第二轮名单直接读第一轮在容器里写的逐条结果（trial-sources.ts --only-passed），不用中途再提交、部署。
# 花费：两轮各 US$4 上限，合计 US$8（Kay 同意的上限）；按 10-24 的实际花费估约 US$6。在非高峰跑（高峰是 MYT 周一到周五 09–12、14–18 点，价钱翻倍）。
# 模型调用熔断（budgets 表 llm）每天 10,000 次，两轮约 1 万次，所以跑时临时调到 30,000，跑完或中断都调回 10,000（trap）；--reserve 3000 给线上留余量。
# 不在 05:00–08:00 MYT（十一说出稿）跑。worker 重启（部署）会丢掉容器里的第一轮结果，跑的时候不要合并 myfnbguide。
#   cd /opt/myfnbguide && bash myfnb/trial-y-2026-10-31-run.sh start    后台开跑，马上返回
#   bash myfnb/trial-y-2026-10-31-run.sh status                          还在跑 / 跑完了，上限现在是多少，日志最后几行
set -euo pipefail
OUT=/tmp/myfnb-trial-y-2026-10-31
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
    nohup bash myfnb/trial-y-2026-10-31-run.sh run > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(git rev-parse --short HEAD)，日志 $LOG"
    ;;
  run)
    cd /opt/myfnbguide
    trap 'echo "# 调回：$(psql "UPDATE budgets SET per_day = 10000, updated_at = now() WHERE service = '"'llm'"' RETURNING service, per_day")"' EXIT
    echo "# 调高：$(psql "UPDATE budgets SET per_day = 30000, updated_at = now() WHERE service = 'llm' RETURNING service, per_day")"
    trial() { sudo docker compose exec -T worker node myfnb/trial-sources.ts --apply --sample trial-y-2026-10-31.json --jobs 3 --reserve 3000 "$@"; }
    echo "# ① 第一轮 $(date -u +%FT%TZ)"
    trial --per 6 --cap-usd 4
    first=$(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -1' | tr -d '\r')
    echo "# 第一轮逐条结果：$first"
    echo "# ② 第二轮 $(date -u +%FT%TZ)"
    trial --per 25 --cap-usd 4 --only-passed "$first"
    echo "# 跑完 $(date -u +%FT%TZ)"
    ;;
  status)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "还在跑"; else echo "没有在跑"; fi
    cd /opt/myfnbguide && echo "llm 每天上限：$(psql "SELECT per_day FROM budgets WHERE service = 'llm'")"
    grep '^# ' "$LOG" 2>/dev/null | tail -8 || true
    tail -3 "$LOG" 2>/dev/null || true
    ;;
  *) echo "用法：bash myfnb/trial-y-2026-10-31-run.sh start|status"; exit 1 ;;
esac
