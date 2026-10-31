#!/usr/bin/env bash
# 2026-10-31 信源剩余几块一次跑完（Kay 16:39「不要等了 都处理了吧」，16:41「同意跑 myfnb/rest-all-2026-10-31-run.sh，总上限 US$8.5，审过合并后再跑」）。
# ① 重判 964 个：第五批判「?」、条款没挡掉的 844 个，? 重判剩下的「?」3 个，两批漏答的 117 个（myfnb/sourcing/universe-rest-2026-10-31.jsonl.gz）。
#    用 judge-universe.ts --yn（只许答 Y 或 N）、--batch 5（漏答的照 10-26 先例换小批）。约 193 次调用，按 10-31 早上的单价估约 US$0.22。
#    它的 --cap-usd 是这个用途全部历史回执的累计数（10-31 早上累计 US$8.725），所以设 9.03，即这一步最多花 0.30。
# ② 试吃 502 个（myfnb/sourcing/trial-rest-2026-10-31.json）：N 找不到条款页的另 349 个、P 托管平台节目 106 个、R 重试 47 个。
#    第一轮每个看 4 条、第二轮对有过预筛的看 15 条（比前几趟的 6 / 25 少，为了在总上限内全部轮到）。上限 3.20 + 4.90。
# 三步上限合计 8.40；--jobs 3 收尾时会多花几条的钱，仍在 US$8.5 以内（经验 C15）。不在 05:00–08:00 MYT 跑；跑时不要合并 myfnbguide。
# llm per_day 跑时临时 30,000，跑完滚动 24 小时低于 7,000 才调回 10,000。跑完先把逐条结果拷出容器。
#   cd /opt/myfnbguide && bash myfnb/rest-all-2026-10-31-run.sh start | status
set -euo pipefail
OUT=/tmp/myfnb-rest-all-2026-10-31
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
    nohup bash myfnb/rest-all-2026-10-31-run.sh run > "$LOG" 2>&1 &
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
    # ① 重判
    # judge-universe.ts 的 --cap-usd 是 purpose = 'judge_source_candidate' 全部历史回执的累计数，10-31 早上跑完是 US$8.725（手册交接页），
    # 之后没有再判过，所以这一步的安全阀是 8.725 + 0.30 = 9.03；它开跑时会打出「此前已累计」，和 8.725 不一致就说明有别的判过。
    echo "# ① 重判 $(date -u +%FT%TZ)"
    sudo docker compose exec -T worker node myfnb/judge-universe.ts --apply --input universe-rest-2026-10-31.jsonl.gz --yn --batch 5 --cap-usd 9.03 --min-balance 5 --reserve 3000 | tee "$OUT/judge.log"
    jf=$(grep -o '/tmp/judge-universe-[^ ]*\.jsonl' "$OUT/judge.log" | head -1 || true)
    if [ -n "$jf" ]; then sudo docker compose cp "worker:$jf" "$OUT/" && echo "# 已拷出：$OUT/$(basename "$jf")"; fi
    # ② 试吃
    trial() { sudo docker compose exec -T worker node myfnb/trial-sources.ts --apply --sample trial-rest-2026-10-31.json --jobs 3 --reserve 3000 "$@"; }
    echo "# ② 第一轮 $(date -u +%FT%TZ)"
    trial --per 4 --cap-usd 3.20
    first=$(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -1' | tr -d '\r')
    echo "# 第一轮逐条结果：$first"
    echo "# ③ 第二轮 $(date -u +%FT%TZ)"
    trial --per 15 --cap-usd 4.90 --only-passed "$first"
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
  *) echo "用法：bash myfnb/rest-all-2026-10-31-run.sh start|status"; exit 1 ;;
esac
