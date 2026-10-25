#!/usr/bin/env bash
# 新评分提示词的评测，在服务器上一条命令跑完。Kay 电脑放行的就是这一条固定命令
# （手册 决定记录「2026-10-24 评分小评测放行」），不带参数，所以放行规则不用通配，引号里接不上别的命令：
#   ssh -i ~/.ssh/myfnb_server ubuntu@43.160.228.180 "cd /opt/myfnbguide && bash myfnb/eval-score-run.sh"
# 10-25 起用原版的评测（scripts/eval-selection.ts，docs/selection.md「校准」；十一 10-25 定）：myfnb/build-gold-rounds.ts 把标注过的样本
# 写成金标（含原文正文，只放在这次的临时目录里，跑完删掉），现行提示词和候选各跑一遍预筛加两次评分，两次都导入后台 SelectBench，
# 可以逐条看判错的条目和模型的理由；最后 myfnb/eval-selection-compare.ts 把两边并排列出来。留出集（holdout）只用来最后检查。
# 候选提示词放在分支 eval/score-candidate 的 industry/prompts/selection-score.md。要评测的讨论串把它推到那个分支；
# 这里只下载这一份 .md，分支上的代码不执行。评测用 main 上的脚本，在一次性容器里跑；正在运行的服务和条目不动，
# 库里只多这次调用的回执和两次 SelectBench 记录。约 334 条（10-25 加了 Kay 挑过的 10-22、10-23 两天 119 条），每条预筛一次（两边共用）、每边打两次分，最多约 1,670 次 DeepSeek 调用，
# 约 US$0.85；每个 PR 最多跑两次，第三次先报十一。
set -euo pipefail
cd "$(dirname "$0")/.."
# 10-25 那次跑到一半 Kay 电脑的 ssh 断了，远端跟着停、输出全丢。所以先把自己放到服务器后台（ssh 断了也接着跑），输出写进
# /var/log/myfnb-ops/<编号>.log（守门脚本 myfnb/ops/gate.sh 的 tail 能读），前台只是跟着这个文件打印，跑完一起退出。
# 命令还是 Kay 电脑放行的那一条；断线以后看结果：ssh … "tail -n 400 /var/log/myfnb-ops/<编号>.log"。
if [ -z "${EVAL_DETACHED:-}" ]; then
  id=$(date -u +%Y%m%dT%H%M%SZ)
  log=/var/log/myfnb-ops/$id.log
  EVAL_DETACHED=1 setsid nohup bash "$0" > "$log" 2>&1 < /dev/null &
  pid=$!
  echo "评测在服务器后台跑，编号 $id，输出也在 $log"
  tail -n +1 -f --pid="$pid" "$log"
  exit 0
fi
REPO=https://github.com/1204kay/myfnbguide
BRANCH=eval/score-candidate
SHA=$(git ls-remote "$REPO" "refs/heads/$BRANCH" | cut -f1)
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "找不到分支 $BRANCH" >&2; exit 1; }
TMP=$(mktemp -d)
trap 'sudo rm -rf "$TMP"' EXIT
mkdir -p "$TMP/eval"
chmod -R 777 "$TMP"
# 按 commit 下载，和上面打印的是同一份。
curl -fsS "https://raw.githubusercontent.com/1204kay/myfnbguide/$SHA/industry/prompts/selection-score.md" -o "$TMP/candidate.md"
[[ -s "$TMP/candidate.md" ]] || { echo "候选提示词是空的" >&2; exit 1; }
chmod 644 "$TMP/candidate.md"
MAIN=$(git -c safe.directory="$PWD" rev-parse --short HEAD)
echo "main $MAIN · 候选 $BRANCH ${SHA:0:7} · $(wc -c < "$TMP/candidate.md") 字节"
run() { sudo docker compose run --rm -T -v "$TMP:/app/.data/run" -v "$TMP/eval:/app/.data/eval" "$@" </dev/null; }
run worker node myfnb/build-gold-rounds.ts .data/run/gold.jsonl
run worker sh -c "node scripts/eval-selection.ts --gold .data/run/gold.jsonl --split all --n 500 --concurrency 1 --label '现行 main $MAIN' && cp \"\$(ls -t .data/eval/selection-*.json | head -1)\" .data/run/site.json"
run -v "$TMP/candidate.md:/app/industry/prompts/selection-score.md:ro" worker sh -c "node scripts/eval-selection.ts --gold .data/run/gold.jsonl --split all --n 500 --concurrency 1 --label '候选 ${SHA:0:7}' && cp \"\$(ls -t .data/eval/selection-*.json | head -1)\" .data/run/candidate.json"
run worker node myfnb/eval-selection-compare.ts .data/run/site.json .data/run/candidate.json
