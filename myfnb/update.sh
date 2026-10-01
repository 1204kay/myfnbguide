#!/usr/bin/env bash
# 服务器每 5 分钟跑一次（systemd timer myfnb-update，由 bootstrap.sh 安装）：
# fork 的分支有新提交、而且 GitHub 上这个提交的检查全部通过，才拉取并按作者的更新顺序重建。
# 检查还在跑就等下一次；检查失败就不部署，线上保持原样；数据库迁移失败就退回上一版，这个提交不再重试。
set -euo pipefail
# 整个脚本包在 main 里：bash 先读完再执行，git 拉取时改到本文件也不会读到一半新一半旧。
main() {
  DIR="/opt/myfnbguide"
  BRANCH="${MYFNB_BRANCH:-main}"
  API="https://api.github.com/repos/1204kay/myfnbguide"
  FAILED=/var/lib/myfnb-update.failed
  cd "$DIR"
  exec 9> /run/myfnb-update.lock
  flock -n 9 || return 0   # 上一次还在构建

  git fetch -q origin "$BRANCH"
  head=$(git rev-parse HEAD)
  next=$(git rev-parse "origin/$BRANCH")
  [ "$head" = "$next" ] && return 0
  [ "$(cat "$FAILED" 2>/dev/null)" = "$next" ] && return 0   # 迁移失败过，等下一个提交
  git merge-base --is-ancestor "$head" "$next" || { echo "origin/$BRANCH 不是当前版本的后续（被改写过历史），不自动部署。"; return 0; }

  runs=$(curl -fsS -H "Accept: application/vnd.github+json" "$API/commits/$next/check-runs?per_page=100") || { echo "连不上 GitHub，下次再试。"; return 0; }
  total=$(jq '.total_count' <<< "$runs")
  pending=$(jq '[.check_runs[] | select(.status != "completed")] | length' <<< "$runs")
  failed=$(jq -r '[.check_runs[] | select(.status == "completed" and (.conclusion | IN("success", "skipped", "neutral") | not)) | .name] | join(", ")' <<< "$runs")
  if [ "$total" -eq 0 ] || [ "$pending" -gt 0 ]; then echo "${next:0:7} 的检查还没跑完，下次再看。"; return 0; fi
  if [ -n "$failed" ]; then echo "${next:0:7} 的检查没通过（$failed），不部署。"; return 0; fi

  echo "部署 ${head:0:7} → ${next:0:7}"
  git merge -q --ff-only "origin/$BRANCH"
  # 作者的更新顺序（docs/deploy.md「更新」）：先备份；构建好再停旧服务，免得旧任务在迁移时写回旧数据；迁移成功才启动。
  docker compose exec -T db pg_dump -U aihot aihot | gzip > /var/backups/myfnb-before-deploy.sql.gz
  docker compose build
  docker compose stop api worker web
  if ! docker compose run --rm setup; then
    # 每个迁移文件一个事务，失败时数据库停在上一个迁移；迁移只做向后兼容的增量，上一版代码照常能跑。
    echo "$next" > "$FAILED"
    git reset -q --hard "$head"
    docker compose build
    docker compose --profile https up -d
    echo "${next:0:7} 的数据库迁移失败，已退回 ${head:0:7}，错误见上面的输出。"
    return 1
  fi
  docker compose --profile https up -d
  docker image prune -f > /dev/null
  echo "已部署 ${next:0:7}"
}
main "$@"; exit $?
