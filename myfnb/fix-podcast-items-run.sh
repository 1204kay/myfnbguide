#!/usr/bin/env bash
# 在服务器上跑 myfnb/fix-podcast-items-2026-10-23.ts。检出放在 /opt/myfnbguide-podcast（不碰别的串的检出），只把 myfnb/ 挂进一次性容器。
# 从 Kay 的电脑一条 ssh：
#   ssh <服务器> 'bash -s' -- preview < myfnb/fix-podcast-items-run.sh   只读预览
#   ssh <服务器> 'bash -s' -- apply   < myfnb/fix-podcast-items-run.sh   先备份，再撤下 1 条、补回 2 条的限定
set -euo pipefail
BRANCH=${BRANCH:-claude/project-thread-2mhqji}
DIR=/opt/myfnbguide-podcast
[ -d "$DIR/.git" ] || sudo git clone -q https://github.com/1204kay/myfnbguide.git "$DIR"
sudo git -C "$DIR" fetch -q origin "$BRANCH"
sudo git -C "$DIR" checkout -q -B fix FETCH_HEAD
cd /opt/myfnbguide
case "${1:-}" in
  preview) sudo docker compose run --rm -T -v $DIR/myfnb:/app/myfnb:ro worker node myfnb/fix-podcast-items-2026-10-23.ts < /dev/null ;;
  apply)   sudo docker compose run --rm -T -v $DIR/myfnb:/app/myfnb:ro worker node myfnb/fix-podcast-items-2026-10-23.ts --apply < /dev/null ;;
  *) echo "用法：preview | apply"; exit 1 ;;
esac
