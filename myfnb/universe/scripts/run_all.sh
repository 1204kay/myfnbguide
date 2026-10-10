#!/usr/bin/env bash
# 整套重跑（整库每周更新一次）。在 Git Bash 里：bash scripts/run_all.sh <podcastindex_feeds.db> [段数，默认 12]
# 不访问任何网站，只读本机的整库、账本和 industry/sources.json。
# 第二遍分段并行；某一段中途被杀掉（这台机器上别的会话杀过 python 进程）时只重跑缺的段，最多试 6 次。
set -u
DB="${1:?用法：bash run_all.sh <podcastindex_feeds.db> [段数]}"
N="${2:-12}"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(dirname "$HERE")"            # .data/universe
REPO="$(cd "$OUT/../.." && pwd)"    # 仓库根目录
WORK="$OUT/work"
PY="python -I -X utf8"
mkdir -p "$WORK/parts"

$PY "$HERE/00_positives.py" "$REPO" "$WORK" || exit 1
# 第一遍和去重（有缓存、整库没换就直接用）
for try in 1 2 3; do
  $PY "$HERE/02_scan.py" "$DB" "$REPO" "$WORK" cache && break
done
[ -f "$WORK/pass1-cache.pkl" ] || { echo "第一遍没有跑完"; exit 1; }
# 第二遍：缺哪一段跑哪一段。换了整库或改了 anchor.py、pilib.py 的平台名单以后，先删掉 work/parts/ 再跑。
for try in 1 2 3 4 5 6; do
  missing=""
  for k in $(seq 0 $((N-1))); do [ -f "$WORK/parts/stats.$k.pkl" ] || missing="$missing $k"; done
  [ -z "$missing" ] && break
  echo "第 $try 次：要跑的段：$missing"
  for k in $missing; do
    $PY "$HERE/02_scan.py" "$DB" "$REPO" "$WORK" "$k/$N" > "$WORK/scan.$k.log" 2>&1 &
  done
  wait
done
for k in $(seq 0 $((N-1))); do [ -f "$WORK/parts/stats.$k.pkl" ] || { echo "第 $k 段没有跑完"; exit 1; }; done
$PY "$HERE/02b_merge.py" "$WORK" "$N" > "$WORK/merge.log" || exit 1
# 第 3 步和校准（抽样的判断按 id 存在 scripts/judgements-*.tsv；上次抽的 200 个只要还都在候选表里就沿用，否则重新抽、要重新判）
$PY "$HERE/03_topic.py" "$WORK" "$OUT" > "$WORK/topic.log" || exit 1
$PY "$HERE/04_calibrate.py" "$WORK" "$OUT" final sample > "$WORK/calibrate.log" || exit 1
$PY "$HERE/05_report_tables.py" "$WORK" "$OUT" > "$WORK/report-tables.md" || exit 1
# 说明：正文在 phase1-prose.md（里面的数字是写的时候的快照，重跑以后要对着附录的表改），表和关键词表自动拼进去
$PY "$HERE/06_build_md.py" "$WORK" "$OUT" || exit 1
echo "完成：$OUT/podcasts-candidates.csv、$OUT/sample-200.csv、$WORK/funnel.json、$WORK/report-tables.md"
