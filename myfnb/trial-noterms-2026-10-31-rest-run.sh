#!/usr/bin/env bash
# 2026-10-31 找不到条款页的 187 个试吃补跑：第一轮碰 US$1.28 上限停（run.log 第 726、728、730 行），清单最后 54 个没轮到，
# 第 133 个只判了 1 条，一起补，共 55 个，清单 myfnb/sourcing/trial-noterms-2026-10-31-rest.json。做法同 trial-noterms-2026-10-31-run.sh：
# 第一轮每个看 6 条（已判过的那 1 条用已有回执，不收费），第二轮对有过预筛的每个看 25 条。
# 花费上限两轮合计 US$1.5：脚本每判完一条才查上限，--jobs 3 时最后会多花几条的钱，所以两轮设 0.70 + 0.70，留出余量（经验 C15）。第一轮按 187 个那趟每条 US$0.0018 算，330 条约 US$0.59，原来设的 0.58 会又碰上限，所以调成两轮各 0.70。
# 按 187 个那趟的实测单价估约 US$1.3。llm 每天上限照旧临时调到 30,000，跑完先数滚动 24 小时，低于 7,000 才调回 10,000；
# 不在 05:00–08:00 MYT 跑；跑时不要合并 myfnbguide。跑完先把两轮的逐条结果拷出容器。
#   cd /opt/myfnbguide && bash myfnb/trial-noterms-2026-10-31-rest-run.sh start | status
set -euo pipefail
OUT=/tmp/myfnb-trial-noterms-2026-10-31-rest
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
    nohup bash myfnb/trial-noterms-2026-10-31-rest-run.sh run > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(git -c safe.directory=/opt/myfnbguide rev-parse --short HEAD)，日志 $LOG"
    ;;
  run)
    cd /opt/myfnbguide
    # 跑完不能直接调回 10000：熔断数的是滚动 24 小时里的调用，试吃调过的次数还要一天才过期。
    # 10-31 上午两趟跑完就调回，滚动窗口里还有 12,369 次，网站的模型调用从 12:02 起全被日上限挡住。
    # 所以先数窗口里的调用：低于 7000（给网站留 3000）才调回 10000；不然留着 30000，写出什么时候能调回。
    restore() {
      used=$(psql "SELECT count(*) FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day'")
      if [ "$used" -lt 7000 ]; then
        echo "# 调回：滚动 24 小时 $used 次，$(psql "UPDATE budgets SET per_day = 10000, updated_at = now() WHERE service = 'llm' RETURNING service, per_day")"
      else
        at=$(psql "SELECT to_char((started_at + interval '1 day') AT TIME ZONE 'Asia/Kuala_Lumpur', 'MM-DD HH24:MI') FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day' ORDER BY started_at OFFSET $((used - 7000)) LIMIT 1")
        echo "# 没调回：滚动 24 小时还有 $used 次，per_day 留在 30000；$at MYT 以后窗口降到 7000 次以下，届时调回 10000（UPDATE budgets SET per_day = 10000 WHERE service = 'llm'）"
      fi
    }
    trap restore EXIT
    echo "# 调高：$(psql "UPDATE budgets SET per_day = 30000, updated_at = now() WHERE service = 'llm' RETURNING service, per_day")"
    trial() { sudo docker compose exec -T worker node myfnb/trial-sources.ts --apply --sample trial-noterms-2026-10-31-rest.json --jobs 3 --reserve 3000 "$@"; }
    echo "# ① 第一轮 $(date -u +%FT%TZ)"
    trial --per 6 --cap-usd 0.70
    first=$(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -1' | tr -d '\r')
    echo "# 第一轮逐条结果：$first"
    echo "# ② 第二轮 $(date -u +%FT%TZ)"
    trial --per 25 --cap-usd 0.70 --only-passed "$first"
    for f in $(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -2' | tr -d '\r'); do
      sudo docker compose cp "worker:$f" "$OUT/" && echo "# 已拷出：$OUT/$(basename "$f")"
    done
    echo "# 跑完 $(date -u +%FT%TZ)"
    ;;
  status)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "还在跑"; else echo "没有在跑"; fi
    cd /opt/myfnbguide && echo "llm 每天上限：$(psql "SELECT per_day FROM budgets WHERE service = 'llm'")；滚动 24 小时已用：$(psql "SELECT count(*) FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day'")"
    grep '^# ' "$LOG" 2>/dev/null | tail -8 || true
    tail -3 "$LOG" 2>/dev/null || true
    ;;
  *) echo "用法：bash myfnb/trial-noterms-2026-10-31-rest-run.sh start|status"; exit 1 ;;
esac
