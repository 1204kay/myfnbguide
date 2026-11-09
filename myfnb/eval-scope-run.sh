#!/usr/bin/env bash
# 收录范围放宽的试跑（11-09，PR #267），在服务器上一条命令跑完，不带参数：
#   cd /opt/myfnbguide && curl -fsS https://raw.githubusercontent.com/1204kay/myfnbguide/<commit>/myfnb/eval-scope-run.sh | bash -s -- <commit>
# 这几份文件在 PR 合并前就要跑，所以全部按同一个 commit 下载：两份候选提示词，加两份只读的小脚本（build-gold-blocked.ts、
# eval-scope-summary.ts，只读库、写临时文件）。其余代码用服务器上 main 的。
# 把站上最近 24 小时预筛挡掉的条目（最多 1,500 条）用候选的 prefilter.md 和 selection-score.md 重跑预筛，放进的再打两次分，
# 看每天多放进几条、几条能选进精选、多花多少。在一次性容器里跑。正在运行的服务和条目不动，库里只多这次调用的回执和一份 SelectBench 记录。
# 花费：约 1,500 次预筛加放进的条目各打两次分，DeepSeek 约 US$0.3–0.8（Kay 同意的上限以 PR 里写的为准）。
set -euo pipefail
cd /opt/myfnbguide
SHA=${1:-}
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "要带上完整的 commit" >&2; exit 1; }
if [ -z "${EVAL_DETACHED:-}" ]; then
  id=$(date -u +%Y%m%dT%H%M%SZ)
  log=/var/log/myfnb-ops/$id.log
  self=$(mktemp); curl -fsS "https://raw.githubusercontent.com/1204kay/myfnbguide/$SHA/myfnb/eval-scope-run.sh" -o "$self"
  EVAL_DETACHED=1 setsid nohup bash "$self" "$SHA" > "$log" 2>&1 < /dev/null &
  pid=$!
  echo "试跑在服务器后台跑，编号 $id，输出也在 $log"
  tail -n +1 -f --pid="$pid" "$log"
  exit 0
fi
TMP=$(mktemp -d)
trap 'sudo rm -rf "$TMP"' EXIT
mkdir -p "$TMP/eval"
chmod -R 777 "$TMP"
for f in industry/prompts/prefilter.md industry/prompts/selection-score.md myfnb/build-gold-blocked.ts myfnb/eval-scope-summary.ts; do
  curl -fsS "https://raw.githubusercontent.com/1204kay/myfnbguide/$SHA/$f" -o "$TMP/$(basename "$f")"
  [[ -s "$TMP/$(basename "$f")" ]] || { echo "$f 是空的" >&2; exit 1; }
  chmod 644 "$TMP/$(basename "$f")"
done
SINCE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "main $(git -c safe.directory="$PWD" rev-parse --short HEAD) · 候选 ${SHA:0:7} · 开始 $SINCE"
run() { sudo docker compose run --rm -T -v "$TMP:/app/.data/run" -v "$TMP/eval:/app/.data/eval" "$@" </dev/null; }
run -v "$TMP/build-gold-blocked.ts:/app/myfnb/build-gold-blocked.ts:ro" worker node myfnb/build-gold-blocked.ts .data/run/gold.jsonl 24
run -v "$TMP/prefilter.md:/app/industry/prompts/prefilter.md:ro" -v "$TMP/selection-score.md:/app/industry/prompts/selection-score.md:ro" worker \
  sh -c "node scripts/eval-selection.ts --gold .data/run/gold.jsonl --split all --n 1500 --concurrency 4 --label '收录范围候选 ${SHA:0:7}' && cp \"\$(ls -t .data/eval/selection-*.json | head -1)\" .data/run/candidate.json"
run -v "$TMP/eval-scope-summary.ts:/app/myfnb/eval-scope-summary.ts:ro" worker node myfnb/eval-scope-summary.ts .data/run/candidate.json "$SINCE" 24
