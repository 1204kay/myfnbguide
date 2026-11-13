#!/usr/bin/env bash
# 精选打分校准（#268，11-09 上线）的回归评测，在服务器上一条命令跑完：
#   cd /opt/myfnbguide && curl -fsS https://raw.githubusercontent.com/1204kay/myfnbguide/<commit>/myfnb/eval-regress-run.sh | bash -s -- <commit>
# 全部金标（myfnb/build-gold-rounds.ts：10 月各轮加 11-09 的 scope 一轮）各跑两遍：一遍用 #268 之前的 selection-score.md
# （main 的 9add00f30c3475ad796db79fd526fbff7fe5ff26，按 commit 下载），一遍用服务器上 main 现在的。预筛两边都用 main 现在的。
# myfnb/eval-selection-compare.ts 把两边并排列出来；它的输出里「现行」是校准前，「候选」是校准后（现在线上的）。
# 在一次性容器里跑，正在运行的服务和条目不动，库里只多回执和两条 SelectBench 记录。
# 约 500 条：预筛一次、每边打两次分，scope 一轮校准前的分 11-09 打过可重用，新调用约 1,900–2,500 次，DeepSeek 约 US$0.7–1。
set -euo pipefail
SHA=${1:-}
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "要带上完整的 commit" >&2; exit 1; }
cd /opt/myfnbguide
if [ -z "${EVAL_DETACHED:-}" ]; then
  id=$(date -u +%Y%m%dT%H%M%SZ)
  log=/var/log/myfnb-ops/$id.log
  self=$(mktemp); curl -fsS "https://raw.githubusercontent.com/1204kay/myfnbguide/$SHA/myfnb/eval-regress-run.sh" -o "$self"
  EVAL_DETACHED=1 setsid nohup bash "$self" "$SHA" > "$log" 2>&1 < /dev/null &
  pid=$!
  echo "回归评测在服务器后台跑，编号 $id，输出也在 $log"
  tail -n +1 -f --pid="$pid" "$log"
  exit 0
fi
OLD=9add00f30c3475ad796db79fd526fbff7fe5ff26
TMP=$(mktemp -d)
trap 'sudo rm -rf "$TMP"' EXIT
mkdir -p "$TMP/eval"
chmod -R 777 "$TMP"
curl -fsS "https://raw.githubusercontent.com/1204kay/myfnbguide/$OLD/industry/prompts/selection-score.md" -o "$TMP/old.md"
[[ -s "$TMP/old.md" ]] || { echo "校准前的提示词是空的" >&2; exit 1; }
chmod 644 "$TMP/old.md"
MAIN=$(git -c safe.directory="$PWD" rev-parse --short HEAD)
echo "main $MAIN · 校准前 ${OLD:0:7} · 开始 $(date -u +%Y-%m-%dT%H:%M:%SZ)"
run() { sudo docker compose run --rm --no-deps -T -v "$TMP:/app/.data/run" -v "$TMP/eval:/app/.data/eval" "$@" </dev/null; }
run worker node myfnb/build-gold-rounds.ts .data/run/gold.jsonl
run -v "$TMP/old.md:/app/industry/prompts/selection-score.md:ro" worker sh -c "node scripts/eval-selection.ts --gold .data/run/gold.jsonl --split all --n 1000 --concurrency 2 --label '校准前 ${OLD:0:7}' && cp \"\$(ls -t .data/eval/selection-*.json | head -1)\" .data/run/site.json"
run worker sh -c "node scripts/eval-selection.ts --gold .data/run/gold.jsonl --split all --n 1000 --concurrency 2 --label '校准后 main $MAIN' && cp \"\$(ls -t .data/eval/selection-*.json | head -1)\" .data/run/candidate.json"
run worker node myfnb/eval-selection-compare.ts .data/run/site.json .data/run/candidate.json
