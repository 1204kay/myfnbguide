#!/usr/bin/env bash
# 2026-11-01 补词根重扫（新语言）：两件同时交 Kay 同意，一次跑完。
# ① 判题材 474 个（myfnb/sourcing/universe6-2026-11-01.jsonl.gz，id 以 g6gd 开头）：GDELT 16.3 万个新闻域名 11-01 在云电脑重读，
#    预筛留下 2,269 个，去掉台账里有的和前五批判过的，剩 688 个；读声明的订阅取最近至多 10 条标题，去掉读不到、两年没更新或不到 5 条的，剩 474 个。
#    按前五批的单价（178,673 个 US$8.725）估约 US$0.03。judge-universe.ts 的 --cap-usd 是这个用途全部历史回执的累计数，
#    所以开跑时先从库里读出此前累计，再加 0.10 当安全阀。
# ② 小批试吃 10 个订阅（myfnb/sourcing/trial-lang-gap-2026-11-01.json）。
# 按 fill-gaps 实测每条约 US$0.0031（第一轮）、0.0022（第二轮）估：第一轮 40 条约 0.12，第二轮最多 10 × 15 条约 0.33；伊朗 3 个多半读不到，实际会更少。
# 试吃上限 0.15 + 0.30 = 0.45，开判每条前把在途的算进上限，不会超。三步合计上限 0.55。
# 要 Kay 在云电脑串打同意句才跑。不在 05:00–08:00 MYT 跑；跑时不要合并 myfnbguide。不调 llm per_day，开跑前数滚动 24 小时。
#   cd /opt/myfnbguide && bash myfnb/lang-gap-2026-11-01-run.sh start | status
set -euo pipefail
OUT=/tmp/myfnb-lang-gap-2026-11-01
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
    nohup bash myfnb/lang-gap-2026-11-01-run.sh run > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(git -c safe.directory=/opt/myfnbguide rev-parse --short HEAD)，滚动 24 小时 $used / $cap，日志 $LOG"
    ;;
  run)
    cd /opt/myfnbguide
    usd="coalesce(r.cost, (r.usage->>'prompt_tokens')::numeric / 1e6 * p.input_per_mtok + (r.usage->>'completion_tokens')::numeric / 1e6 * p.output_per_mtok, 0)"
    price="LEFT JOIN LATERAL (SELECT input_per_mtok, output_per_mtok FROM service_prices sp WHERE sp.service = r.service AND sp.model IN (r.model, '') ORDER BY sp.model = '' LIMIT 1) p ON true"
    before=$(psql "SELECT round(coalesce(sum($usd), 0), 4) FROM receipt_attempts r JOIN receipts rc ON rc.id = r.receipt_id $price WHERE rc.purpose = 'judge_source_candidate'")
    jcap=$(python3 -c "print(round($before + 0.10, 4))")
    echo "# ① 判题材 $(date -u +%FT%TZ)：此前累计 US\$$before，安全阀 $jcap"
    sudo docker compose exec -T worker node myfnb/judge-universe.ts --apply --input universe6-2026-11-01.jsonl.gz --cap-usd "$jcap" --min-balance 5 --reserve 3000 | tee "$OUT/judge.log"
    jf=$(grep -o '/tmp/judge-universe-[^ ]*\.jsonl' "$OUT/judge.log" | head -1 || true)
    if [ -n "$jf" ]; then sudo docker compose cp "worker:$jf" "$OUT/" && echo "# 已拷出：$OUT/$(basename "$jf")"; fi
    trial() { sudo docker compose exec -T worker node myfnb/trial-sources.ts --apply --sample trial-lang-gap-2026-11-01.json --jobs 3 --reserve 3000 "$@"; }
    echo "# ② 试吃第一轮 $(date -u +%FT%TZ)"
    trial --per 4 --cap-usd 0.15
    first=$(sudo docker compose exec -T worker sh -c 'ls -t /tmp/trial-sources-*.jsonl | head -1' | tr -d '\r')
    echo "# 第一轮逐条结果：$first"
    echo "# ③ 试吃第二轮 $(date -u +%FT%TZ)"
    trial --per 15 --cap-usd 0.30 --only-passed "$first"
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
  *) echo "用法：bash myfnb/lang-gap-2026-11-01-run.sh start|status"; exit 1 ;;
esac
