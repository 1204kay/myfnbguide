#!/usr/bin/env bash
# 2026-11-01 比模型：阿里云百炼（新加坡区）上的 deepseek-v4.1-flash、qwen3.8-flash，和直连 DeepSeek（预筛那一步的模型）判同一批候选的题材。
# 为什么：阿里云每个模型送 100 万 token（到 2027-01-31），想知道能不能替 DeepSeek 做每天的活、能省多少。
# 条款（help.aliyun.com/en/model-studio/bailian-service-notes 第三节）：试用生成的内容只能用来评测模型，不能商用、不能给第三方。
#   所以这一趟只比结果，阿里云判出来的不进台账、不上网站；免费额度就是花在「评测」上。
# 题目：myfnb/sourcing/universe6-2026-11-01.jsonl.gz 的前 200 个（10 批，每批 20 个），和 lang-gap 那趟判的是同一份。
# 四步，先小后大（经验 C1）：
#   ① 直连 DeepSeek 判这 200 个（lang-gap 那趟判过就直接用回执，不花钱；没判过约 US$0.01，高峰 US$0.02）
#   ② 两个阿里云模型各先判前 60 个（3 批）看格式，再判满 200 个（同一批直接用回执）；每个模型约 6 万 token，占免费额度约 6%
#   ③ 直连 DeepSeek 同样 200 个再判一次（--tag noise1，约 US$0.01）：同一个模型自己前后差多少，才知道两家的差算不算数（经验 C9）
#   ④ 对照：一样的比例、3×3 表、token 和速度（compare-judge-2026-11-01.ts）
# 钱：只花 DeepSeek，合计上限 US$0.05（judge-universe 的 --cap-usd 是这个用途全部历史回执的累计，开跑时读出此前累计再加 0.05）。
# 阿里云：账号开着「用完即停」，免费额度用完回 403 AllocationQuota.FreeTierOnly，不会扣钱；脚本见到就停。
# 钥匙：借十一说念稿的 QWEN_TTS_API_KEY（同一个阿里云账号），不加新钥匙、不重启 worker。
# 要 Kay 在云电脑串打同意句才跑。不在 05:00–08:00 MYT 跑。调用一共约 50 次，不碰 llm 的 per_day。
#   cd /opt/myfnbguide && bash myfnb/aliyun-compare-2026-11-01-run.sh start | status
set -euo pipefail
OUT=/tmp/myfnb-aliyun-compare-2026-11-01
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
    nohup bash myfnb/aliyun-compare-2026-11-01-run.sh run > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(git -c safe.directory=/opt/myfnbguide rev-parse --short HEAD)，日志 $LOG"
    ;;
  run)
    cd /opt/myfnbguide
    since=$(date -u +%FT%TZ)
    usd="coalesce(r.cost, (r.usage->>'prompt_tokens')::numeric / 1e6 * p.input_per_mtok + (r.usage->>'completion_tokens')::numeric / 1e6 * p.output_per_mtok, 0)"
    price="LEFT JOIN LATERAL (SELECT input_per_mtok, output_per_mtok FROM service_prices sp WHERE sp.service = r.service AND sp.model IN (r.model, '') ORDER BY sp.model = '' LIMIT 1) p ON true"
    before=$(psql "SELECT round(coalesce(sum($usd), 0), 4) FROM receipt_attempts r JOIN receipts rc ON rc.id = r.receipt_id $price WHERE rc.purpose = 'judge_source_candidate'")
    jcap=$(python3 -c "print(round($before + 0.05, 4))")
    echo "# 开始 $since：这个用途此前累计 US\$$before，安全阀 $jcap"
    judge() {
      local tag=$1; shift
      sudo docker compose exec -T worker node myfnb/judge-universe.ts --apply --input universe6-2026-11-01.jsonl.gz --cap-usd "$jcap" --min-balance 5 --reserve 3000 "$@" | tee "$OUT/$tag.log"
      local f; f=$(grep -o '/tmp/judge-universe-[^ ]*\.jsonl' "$OUT/$tag.log" | head -1 || true)
      if [ -n "$f" ]; then sudo docker compose cp "worker:$f" "$OUT/$tag.jsonl"; echo "# 已拷出 $OUT/$tag.jsonl"; fi
    }
    echo "# ① 直连 DeepSeek"; judge deepseek --limit 200
    for m in aliyun-deepseek-v4.1-flash aliyun-qwen3.8-flash; do
      echo "# ② $m 先判 60 个"; judge "$m-60" --model "$m" --limit 60
      if grep -q '调用失败 [1-9]' "$OUT/$m-60.log"; then echo "# $m 前 60 个有失败，不往下判，先看日志"; continue; fi
      echo "# ② $m 判满 200 个"; judge "$m" --model "$m" --limit 200
    done
    echo "# ③ 直连 DeepSeek 再判一次"; judge noise1 --limit 200 --tag noise1
    echo "# ④ 对照"
    files=$(for t in noise1 aliyun-deepseek-v4.1-flash aliyun-qwen3.8-flash; do [ -f "$OUT/$t.jsonl" ] && echo "/tmp/cmp/$t.jsonl"; done)
    sudo docker compose exec -T worker mkdir -p /tmp/cmp
    for f in "$OUT"/*.jsonl; do sudo docker compose cp "$f" "worker:/tmp/cmp/$(basename "$f")"; done
    # shellcheck disable=SC2086
    sudo docker compose exec -T worker node myfnb/compare-judge-2026-11-01.ts --since "$since" /tmp/cmp/deepseek.jsonl $files | tee "$OUT/compare.txt"
    echo "# 跑完 $(date -u +%FT%TZ)，对照在 $OUT/compare.txt"
    ;;
  status)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "还在跑"; else echo "没有在跑"; fi
    grep '^# ' "$LOG" 2>/dev/null | tail -8 || true
    tail -3 "$LOG" 2>/dev/null || true
    ;;
  *) echo "用法：bash myfnb/aliyun-compare-2026-11-01-run.sh start|status"; exit 1 ;;
esac
