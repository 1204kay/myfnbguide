#!/usr/bin/env bash
# 新评分提示词的小评测（myfnb/eval-score-candidate.ts --small），在服务器上一条命令跑完。Kay 电脑放行的就是这一条固定命令
# （手册 决定记录「2026-10-24 评分小评测放行」），不带参数，所以放行规则不用通配，引号里接不上别的命令：
#   ssh -i ~/.ssh/myfnb_server ubuntu@43.160.228.180 "cd /opt/myfnbguide && bash myfnb/eval-score-run.sh"
# 候选提示词放在分支 eval/score-candidate 的 industry/prompts/selection-score.md。要评测的讨论串把它推到那个分支；
# 这里只下载这一份 .md，分支上的代码不执行。评测用 main 上的脚本，在一次性容器里跑；正在运行的服务和正式库的内容不动，
# 只多写这次调用的回执。每次最多 428 次 DeepSeek 调用（每边打两次，和站上一样；资本那一轮 14 条占 56 次，单一国家那一轮 18 条占 72 次，试吃盲看那一轮 32 条占 128 次，站上那一半多半用试吃的回执、不再收费），约 US$0.2；每个 PR 最多跑两次，第三次先报十一。
set -euo pipefail
cd "$(dirname "$0")/.."
REPO=https://github.com/1204kay/myfnbguide
BRANCH=eval/score-candidate
SHA=$(git ls-remote "$REPO" "refs/heads/$BRANCH" | cut -f1)
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "找不到分支 $BRANCH" >&2; exit 1; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
# 按 commit 下载，和上面打印的是同一份。
curl -fsS "https://raw.githubusercontent.com/1204kay/myfnbguide/$SHA/industry/prompts/selection-score.md" -o "$TMP/selection-score-candidate.md"
[[ -s "$TMP/selection-score-candidate.md" ]] || { echo "候选提示词是空的" >&2; exit 1; }
chmod 644 "$TMP/selection-score-candidate.md"
echo "main $(git -c safe.directory="$PWD" rev-parse --short HEAD) · 候选 $BRANCH ${SHA:0:7} · $(wc -c < "$TMP/selection-score-candidate.md") 字节"
sudo docker compose run --rm -T -v "$TMP/selection-score-candidate.md:/app/myfnb/selection-score-candidate.md:ro" \
  worker node myfnb/eval-score-candidate.ts --rounds five,new,old,capital,country,real --small --concurrency 1 </dev/null
