#!/usr/bin/env bash
# 十一说试写在服务器上的一整趟（myfnb/trial-issues.ts），从 Kay 的电脑用同一个 ssh 开头的几条命令就能跑完：
# 每多一种命令形状，Kay 那边就要多点一次允许（10-23）。正在运行的服务、.env 和表结构都不动。
#   bash myfnb/trial-run.sh start 2026-10-21 2026-10-22   后台开跑，马上返回
#   bash myfnb/trial-run.sh check 20261023012811-…        只拿那一趟上线的稿再核一遍（新核对先单独验），后台跑
#   bash myfnb/trial-run.sh review 20261023…-… 01 02     只拿那一趟上线的稿再复核一遍「漏了什么」，一期接一期，前台跑完
#   bash myfnb/trial-run.sh status                         还在跑 / 跑完了，和日志最后几行
#   bash myfnb/trial-run.sh pack                           把这一趟的结果打成 tar.gz 写到标准输出
# 写稿默认 DeepSeek V4 Pro（MODEL=deepseek-flash-think-llm 换成 flash），核对 Opus 5.5；花费上限默认 US$8，可用 CAP_USD 改。
set -euo pipefail
TRIAL=/opt/myfnbguide-trial
OUT=/tmp/myfnb-trial
LOG=$OUT/run.log
PID=$OUT/run.pid

case "${1:-}" in
  start)
    shift
    [ $# -gt 0 ] || { echo "写要跑的日期：start 2026-10-21 2026-10-22"; exit 1; }
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "上一趟还在跑"; exit 1; fi
    mkdir -p "$OUT"
    days=(); for d in "$@"; do days+=(--day "$d"); done
    cd /opt/myfnbguide
    nohup sudo docker compose run --rm -T \
      -v $TRIAL/modules/reference:/app/modules/reference:ro -v $TRIAL/myfnb:/app/myfnb:ro \
      -v $TRIAL/site/models.ts:/app/site/models.ts:ro -v $OUT:/out \
      worker node myfnb/trial-issues.ts --model "${MODEL:-deepseek-v4-pro-llm}" --check-model claude-opus-5-5 \
      "${days[@]}" --apply --cap-usd "${CAP_USD:-8}" > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(git -C $TRIAL rev-parse --short HEAD)，${MODEL:-deepseek-v4-pro-llm}，${*}"
    ;;
  check)
    [ -n "${2:-}" ] && [ -f "$OUT/$2/01.json" ] || { echo "写那一趟的目录名：check 20261023012811-…"; exit 1; }
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "上一趟还在跑"; exit 1; fi
    cd /opt/myfnbguide
    nohup sudo docker compose run --rm -T \
      -v $TRIAL/modules/reference:/app/modules/reference:ro -v $TRIAL/myfnb:/app/myfnb:ro \
      -v $TRIAL/site/models.ts:/app/site/models.ts:ro -v $OUT:/out \
      worker node myfnb/trial-issues.ts --check-only "/out/$2/01.json" --check-model claude-opus-5-5 \
      --apply --cap-usd "${CAP_USD:-8}" > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开核：$(git -C $TRIAL rev-parse --short HEAD)，$2"
    ;;
  review)
    run="${2:-}"; shift 2 || true
    [ -n "$run" ] && [ $# -gt 0 ] || { echo "写那一趟的目录名和期号：review 20261023…-… 01 02"; exit 1; }
    cd /opt/myfnbguide
    for n in "$@"; do
      [ -f "$OUT/$run/$n.json" ] || { echo "没有 $run/$n.json"; exit 1; }
      sudo docker compose run --rm -T \
        -v $TRIAL/modules/reference:/app/modules/reference:ro -v $TRIAL/myfnb:/app/myfnb:ro \
        -v $TRIAL/site/models.ts:/app/site/models.ts:ro -v $OUT:/out \
        worker node myfnb/trial-issues.ts --check-only "/out/$run/$n.json" --review --check-model claude-opus-5-5 \
        --apply --cap-usd "${CAP_USD:-8}"
    done
    ;;
  status)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "还在跑"; else echo "跑完了：$(ls -td $OUT/2*/ | head -1)"; fi
    tail -n 15 "$LOG"
    ;;
  pack)
    run=$(ls -td $OUT/2*/ | head -1)
    tar -C "$run" -cz .
    ;;
  *) echo "用法：start 日期… | check 目录名 | review 目录名 期号… | status | pack"; exit 1 ;;
esac
