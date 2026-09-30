#!/usr/bin/env bash
# 服务器每 5 分钟跑一次（systemd timer myfnb-update，由 bootstrap.sh 安装）：
# fork 的分支有新提交、而且 GitHub 上这个提交的检查全部通过，才拉取并按作者的更新命令重建。
# 检查还在跑就等下一次；检查失败就不部署，线上保持原样。
set -euo pipefail
DIR="/opt/myfnbguide"
BRANCH="${MYFNB_BRANCH:-main}"
API="https://api.github.com/repos/1204kay/myfnbguide"
cd "$DIR"
exec 9> /run/myfnb-update.lock
flock -n 9 || exit 0   # 上一次还在构建

git fetch -q origin "$BRANCH"
head=$(git rev-parse HEAD)
next=$(git rev-parse "origin/$BRANCH")
[ "$head" = "$next" ] && exit 0
git merge-base --is-ancestor "$head" "$next" || { echo "origin/$BRANCH 不是当前版本的后续（被改写过历史），不自动部署。"; exit 0; }

runs=$(curl -fsS -H "Accept: application/vnd.github+json" "$API/commits/$next/check-runs?per_page=100") || { echo "连不上 GitHub，下次再试。"; exit 0; }
total=$(jq '.total_count' <<< "$runs")
pending=$(jq '[.check_runs[] | select(.status != "completed")] | length' <<< "$runs")
failed=$(jq -r '[.check_runs[] | select(.status == "completed" and (.conclusion | IN("success", "skipped", "neutral") | not)) | .name] | join(", ")' <<< "$runs")
if [ "$total" -eq 0 ] || [ "$pending" -gt 0 ]; then echo "${next:0:7} 的检查还没跑完，下次再看。"; exit 0; fi
if [ -n "$failed" ]; then echo "${next:0:7} 的检查没通过（$failed），不部署。"; exit 0; fi

echo "部署 ${head:0:7} → ${next:0:7}"
git merge -q --ff-only "origin/$BRANCH"
docker compose --profile https up -d --build
docker image prune -f > /dev/null
echo "已部署 ${next:0:7}"
