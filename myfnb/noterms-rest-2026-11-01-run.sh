#!/usr/bin/env bash
# 2026-11-01 补试吃 478 个订阅（myfnb/sourcing/trial-noterms-rest-2026-11-01.json）：10-31 报「信源收工」时漏掉、从没试吃过的来源。
# N 组 366 个：Y 待定里找不到条款页的 819 个，免费重查后还在更新、robots 许可、没拒绝 AI 代读、去重后剩的。O 组 112 个：10-05 至 10-30 旧批次停在待定的，同样免费重查后剩的。台账里同一订阅已判不接或停用的 11 个已去掉；手册审阅后放回 6 个分类订阅。
# 第一轮每个看 4 条、第二轮对有过预筛的看 15 条，和 rest-all 一样。按 rest-all 的单价（511 个两轮 US$7.50）估约 US$7.0；上限 3.10 + 5.10 = 8.20，
# --jobs 3 收尾时会多花几条的钱，仍在 US$8.5 以内（经验 C15）。要 Kay 在云电脑串打同意句才跑。不在 05:00–08:00 MYT 跑（只在开跑时查，凌晨别开跑）；跑时不要合并 myfnbguide。
# 11-01 09:13 第一次开跑 5 分钟就撞熔断停（第一轮判到第 134 个订阅，花 US$0.501）。再开跑用同一条命令：判过的条目直接用已有回执、不花钱；第一轮上限从 3.10 降到 2.60，加上已花的 0.50，合计仍在 Kay 同意的 US$8.5 以内。
# llm per_day 跑时临时 30,000，跑完滚动 24 小时低于 7,000 才调回 10,000。跑完先把逐条结果拷出容器。
#   cd /opt/myfnbguide && bash myfnb/noterms-rest-2026-11-01-run.sh start | status
set -euo pipefail
OUT=/tmp/myfnb-noterms-rest-2026-11-01
LOG=$OUT/run.log
PID=$OUT/run.pid
psql() { sudo docker compose exec -T db psql -U aihot -d aihot -At -c "$1"; }

case "${1:-}" in
  start)
    hour=$(TZ=Asia/Kuala_Lumpur date +%H)
    if [ "$hour" -ge 5 ] && [ "$hour" -lt 8 ]; then echo "05:00–08:00 MYT 是十一说出稿的时段，不跑"; exit 1; fi
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "上一趟还在跑"; exit 1; fi
    # 11-01 09:13 第一次开跑时，滚动 24 小时里已有约 2.6 万次调用（10-31 几趟试吃留下的），5 分钟就撞熔断停了（经验 C3）。
    # 剩下第一轮约 340 个订阅（约 1,300 条）、第二轮约 150 个（约 2,250 条），每条约 1.6 次调用（预筛 1 次，过预筛的约三成再评分两次），约 5,700 次；
    # 上限 30,000 减去给线上留的 3,000，窗口要降到约 21,000 以下，取 20,000 留点余量；不够就写出几点够。
    cd /opt/myfnbguide
    used=$(psql "SELECT count(*) FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day'")
    if [ "$used" -gt 20000 ]; then
      at=$(psql "SELECT to_char((started_at + interval '1 day') AT TIME ZONE 'Asia/Kuala_Lumpur', 'MM-DD HH24:MI') FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day' ORDER BY started_at OFFSET $((used - 20000)) LIMIT 1")
      echo "滚动 24 小时已有 $used 次调用，要降到 20,000 以下才开跑：最早约 $at MYT 以后再 start（期间线上还会新增调用，到时 start 会再数一次）"; exit 1
    fi
    mkdir -p "$OUT"
    cd /opt/myfnbguide
    nohup bash myfnb/noterms-rest-2026-11-01-run.sh run > "$LOG" 2>&1 &
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
    # 试吃
    trial() { sudo docker compose exec -T worker node myfnb/trial-sources.ts --apply --sample trial-noterms-rest-2026-11-01.json --jobs 3 --reserve 3000 "$@"; }
    echo "# ① 第一轮 $(date -u +%FT%TZ)"
    trial --per 4 --cap-usd 2.60
    first=$(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -1' | tr -d '\r')
    echo "# 第一轮逐条结果：$first"
    echo "# ② 第二轮 $(date -u +%FT%TZ)"
    trial --per 15 --cap-usd 5.10 --only-passed "$first"
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
  *) echo "用法：bash myfnb/noterms-rest-2026-11-01-run.sh start|status"; exit 1 ;;
esac
