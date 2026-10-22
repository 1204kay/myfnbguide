#!/usr/bin/env bash
# 「要点」试写在服务器上的一整趟（myfnb/trial-understand.ts）。正在运行的服务、.env 和表结构都不动；
# 只把这个分支改过的提示词和两个文件挂进一次性容器（只挂文件，不挂整个目录，免得盖掉镜像里的依赖）；
# 只多一份检出 /opt/myfnbguide-understand（和十一说试写的 /opt/myfnbguide-trial 分开，两边不抢）。
# 从 Kay 的电脑一条 ssh 就能跑（每多一种命令形状 Kay 就要多点一次允许，10-23）：
#   ssh <服务器> 'bash -s' -- start  < myfnb/trial-understand-run.sh   更新检出、后台开跑，马上返回
#   ssh <服务器> 'bash -s' -- status < myfnb/trial-understand-run.sh   还在跑 / 跑完了，和日志最后几行
#   ssh <服务器> 'bash -s' -- pack   < myfnb/trial-understand-run.sh   把结果打成 tar.gz 写到标准输出
# 不读标准输入时也能在服务器上直接 bash 它。BRANCH、DAYS、LIMIT 可以用环境变量改。
set -euo pipefail
BRANCH=${BRANCH:-claude/project-thread-6l0m18}
DIR=/opt/myfnbguide-understand
OUT=/tmp/myfnb-understand
LOG=$OUT/run.log
PID=$OUT/run.pid

case "${1:-}" in
  start)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "上一趟还在跑"; exit 1; fi
    [ -d "$DIR/.git" ] || sudo git clone -q https://github.com/1204kay/myfnbguide.git "$DIR"
    sudo git -C "$DIR" fetch -q origin "$BRANCH"
    sudo git -C "$DIR" checkout -q -B trial FETCH_HEAD
    mkdir -p "$OUT"
    cd /opt/myfnbguide
    nohup sudo docker compose run --rm -T \
      -v $DIR/industry/prompts:/app/industry/prompts:ro -v $DIR/site/site.ts:/app/site/site.ts:ro -v $DIR/myfnb:/app/myfnb:ro \
      -v $DIR/packages/backend/src/editorial/analyze.ts:/app/packages/backend/src/editorial/analyze.ts:ro -v $OUT:/out \
      worker node myfnb/trial-understand.ts --days "${DAYS:-7}" --limit "${LIMIT:-20}" --apply > "$LOG" 2>&1 &
    echo $! > "$PID"
    echo "开跑：$(git -C $DIR rev-parse --short HEAD)"
    ;;
  status)
    if [ -f "$PID" ] && kill -0 "$(cat "$PID")" 2>/dev/null; then echo "还在跑"; else echo "跑完了：$(ls -td $OUT/understand-*/ 2>/dev/null | head -1)"; fi
    tail -n 15 "$LOG"
    ;;
  pack)
    run=$(ls -td $OUT/understand-*/ | head -1)
    tar -C "$run" -cz .
    ;;
  *) echo "用法：start | status | pack"; exit 1 ;;
esac
