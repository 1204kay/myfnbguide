#!/usr/bin/env bash
# 「要点」试写在服务器上的一整趟（myfnb/trial-understand.ts）。正在运行的服务、.env 和表结构都不动；
# 只把这个分支改过的提示词和两个文件挂进一次性容器（只挂文件，不挂整个目录，免得盖掉镜像里的依赖）；
# 只多一份检出 /opt/myfnbguide-understand（和十一说试写的 /opt/myfnbguide-trial 分开，两边不抢）。
# 从 Kay 的电脑一条 ssh 就能跑（每多一种命令形状 Kay 就要多点一次允许，10-23）：
#   ssh <服务器> 'bash -s' -- start  < myfnb/trial-understand-run.sh   更新检出、后台开跑，马上返回
#   ssh <服务器> 'bash -s' -- status < myfnb/trial-understand-run.sh   还在跑 / 跑完了，和日志最后几行
#   ssh <服务器> 'bash -s' -- pack   < myfnb/trial-understand-run.sh   把结果打成 tar.gz 写到标准输出
#   ssh <服务器> 'bash -s' -- all    < myfnb/trial-understand-run.sh   一条跑完：开跑、等到跑完，再把试写.md、试写.json 和 raw 打到标准输出
#                                                                    （原文不打出来；要二三十分钟，在本机用后台方式跑）
#   ssh <服务器> 'bash -s' -- fix        < myfnb/trial-understand-run.sh   预览 myfnb/fix-items-2026-10-23.ts（盲核查出的 6 条线上错句）
#   ssh <服务器> 'bash -s' -- fix-apply  < myfnb/trial-understand-run.sh   执行它（先备份，再改条目、报告和故事里的那几句）
#   ssh <服务器> 'bash -s' -- check  < myfnb/trial-understand-run.sh   核对员考试（myfnb/trial-check.ts）：拿 10-23 那 20 条考 CHECK_MODELS
#                                                                    （默认 deepseek-v4-pro-llm），跑完把核对.md 打到标准输出；NOS="18 06" 只考这几条
#   ssh <服务器> 'bash -s' -- raw    < myfnb/trial-understand-run.sh   最近 3 小时理解一步失败的回执原样输出，和之前 7 天的成败数对照
# 不读标准输入时也能在服务器上直接 bash 它。BRANCH、DAYS、LIMIT 可以用环境变量改；IDS 写了就只跑这些条目。
set -euo pipefail
BRANCH=${BRANCH:-claude/project-thread-6l0m18}
DIR=/opt/myfnbguide-understand
OUT=/tmp/myfnb-understand
LOG=$OUT/run.log
PID=$OUT/run.pid

main() {
case "${1:-}" in
  all)
    main start
    sleep 30
    while [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; do sleep 30; done
    run=$(ls -td $OUT/understand-*/ | head -1)
    echo "=== 日志最后几行"; tail -n 25 "$LOG"
    echo "=== 试写.md"; cat "$run/试写.md"
    echo "=== 试写.json"; cat "$run/试写.json"
    main raw
    ;;
  start)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "上一趟还在跑"; exit 1; fi
    [ -d "$DIR/.git" ] || sudo git clone -q https://github.com/1204kay/myfnbguide.git "$DIR"
    sudo git -C "$DIR" fetch -q origin "$BRANCH"
    sudo git -C "$DIR" checkout -q -B trial FETCH_HEAD
    mkdir -p "$OUT"
    # 默认就是 10-23 第一趟的那 20 条，改了提示词以后拿同一批比；IDS= （空）则按天重新挑。
    ids=""; for id in ${IDS-n9qd5cz6g2st5ecj30kvmx6hq tsb6o7zx4dudkki7hl13pvbk0 vvx9s8z2a0rmcl1pj3477cvt4 uf3o0dojy90hsygrmvggmn1wd kx2e4k9ergo6dcqys57dgaz86 wy7anjnay7byz8nsf96qxv1rf vw2y0eei7gpnri4i7rwl1hdzf ffcsxaolrffx320f6pp8z0lo1 q8lnhuzhbkenjfbbwxuijrahi i0k5mqtc5srqbiwmbyson6fwa px96mvv1r6ieht7egibw3tlil oltrw84hrvlvk1dxxnyhjuy3c jpda3ptzjph38d9rt6x89idpj qd6h4xm6ahlsj0kyi1g06krt6 skuun0auxsapw48tfnousvb9u nguotwlb9wncow84779a01jmo xrcbzs5wo1ehk5oj74mthoaun joyfz1on9lf1msiln1h9q8ehq z6iujzdwyqqu0fqi3po25ygs9 vjwc914uus7uc16jftykc59sv}; do ids="$ids --id $id"; done
    cd /opt/myfnbguide
    nohup sudo docker compose run --rm -T \
      -v $DIR/industry/prompts:/app/industry/prompts:ro -v $DIR/site/site.ts:/app/site/site.ts:ro -v $DIR/myfnb:/app/myfnb:ro \
      -v $DIR/packages/backend/src/editorial/analyze.ts:/app/packages/backend/src/editorial/analyze.ts:ro -v $OUT:/out \
      worker node myfnb/trial-understand.ts --days "${DAYS:-7}" --limit "${LIMIT:-20}" $ids --apply > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(sudo git -C $DIR rev-parse --short HEAD)"
    ;;
  status)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "还在跑"; else echo "跑完了：$(ls -td $OUT/understand-*/ 2>/dev/null | head -1)"; fi
    tail -n 15 "$LOG"
    ;;
  pack)
    run=$(ls -td $OUT/understand-*/ | head -1)
    tar -C "$run" -cz .
    ;;
  fix|fix-apply)
    [ -d "$DIR/.git" ] || sudo git clone -q https://github.com/1204kay/myfnbguide.git "$DIR"
    sudo git -C "$DIR" fetch -q origin "$BRANCH"
    sudo git -C "$DIR" checkout -q -B trial FETCH_HEAD
    cd /opt/myfnbguide
    sudo docker compose run --rm -T -v $DIR/myfnb:/app/myfnb:ro \
      worker node myfnb/fix-items-2026-10-23.ts $([ "$1" = fix-apply ] && echo --apply)
    ;;
  check)
    [ -d "$DIR/.git" ] || sudo git clone -q https://github.com/1204kay/myfnbguide.git "$DIR"
    sudo git -C "$DIR" fetch -q origin "$BRANCH"
    sudo git -C "$DIR" checkout -q -B trial FETCH_HEAD
    mkdir -p "$OUT"
    flags=""; for m in ${CHECK_MODELS:-deepseek-v4-pro-llm}; do flags="$flags --model $m"; done
    for n in ${NOS:-}; do flags="$flags --no $n"; done
    cd /opt/myfnbguide
    echo "检出：$(sudo git -C $DIR rev-parse --short HEAD)"
    sudo docker compose run --rm -T \
      -v $DIR/industry/prompts:/app/industry/prompts:ro -v $DIR/site/models.ts:/app/site/models.ts:ro -v $DIR/myfnb:/app/myfnb:ro -v $OUT:/out \
      worker node myfnb/trial-check.ts $flags --apply 2>&1 | grep --line-buffered -v '"level"'
    cat "$(ls -td $OUT/check-*/ | head -1)/核对.md"
    ;;
  check-result)
    # 上一趟考试写下的结果，原样打出来；没有就说没有（不重跑、不花钱）。
    run=$(ls -td $OUT/check-*/ 2>/dev/null | head -1)
    if [ -z "$run" ]; then echo "服务器上没有考试结果文件夹"; exit 0; fi
    echo "=== $run"; ls -la "$run"; cat "$run/核对.md"
    ;;
  check-status)
    # 考试跑着时只读地看一眼：容器还在不在、核了几份、花了多少（回执记的金额）。
    cd /opt/myfnbguide
    echo "=== 还在跑的一次性容器"; sudo docker ps --filter "name=worker-run" --format '{{.Names}} {{.RunningFor}} {{.Status}}'
    echo "=== 核对回执（今天）"
    sudo docker compose exec -T db psql -U aihot -d aihot -At -c "
      SELECT status, count(*), coalesce(sum(cost), 0), min(created_at), max(updated_at) FROM receipts
      WHERE purpose = 'trial_check_item' AND created_at > now() - interval '12 hours' GROUP BY status;"
    echo "=== 失败的回执（最多 5 条）"
    sudo docker compose exec -T db psql -U aihot -d aihot -At -c "
      SELECT id, subject, left(coalesce(error, ''), 300) FROM receipts
      WHERE purpose = 'trial_check_item' AND status NOT IN ('received', 'completed') AND created_at > now() - interval '12 hours' ORDER BY id DESC LIMIT 5;"
    ;;
  raw)
    cd /opt/myfnbguide
    sudo docker compose exec -T db psql -U aihot -d aihot -At -c "
      SELECT '=== ' || id || ' ' || subject || E'\\n' || coalesce(error, '') || E'\\n--- 原样输出 ---\\n' || coalesce(response->'choices'->0->'message'->>'content', response::text)
      FROM receipts WHERE purpose IN ('understand_article', 'mend_wording') AND status = 'failed' AND created_at > now() - interval '3 hours' ORDER BY id;"
    echo "=== 之前 7 天（旧提示词）理解一步的回执状态"
    sudo docker compose exec -T db psql -U aihot -d aihot -At -c "
      SELECT status, count(*) FROM receipts WHERE purpose = 'understand_article'
        AND created_at BETWEEN now() - interval '7 days 3 hours' AND now() - interval '3 hours' GROUP BY status;"
    ;;
  *) echo "用法：start | status | pack | all | check | check-result | check-status | fix | fix-apply | raw"; exit 1 ;;
esac
}

main "$@"
