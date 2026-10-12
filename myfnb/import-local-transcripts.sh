#!/bin/bash
# 把本机（Windows 显卡）转写好的单集送进服务器导入（modules/archive/import-transcripts.ts）。
# 用法：bash myfnb/import-local-transcripts.sh <转写输出目录>   例：bash myfnb/import-local-transcripts.sh C:/Users/1204k/whisper-win/out3
# 已转写过的、太短的由导入脚本自己跳过，所以可以重复跑。
set -e
dir="${1:?转写输出目录}"
python - "$dir" <<'PY' | ssh -i ~/.ssh/myfnb_server ubuntu@43.160.228.180 'cd /opt/myfnbguide && sudo docker compose exec -T worker node modules/archive/import-transcripts.ts'
import glob, json, os, sys
sys.stdout.reconfigure(encoding="utf-8")
for f in sorted(glob.glob(os.path.join(sys.argv[1], "*.json"))):
    j = json.load(open(f, encoding="utf-8"))
    print(json.dumps({"id": j["id"], "text": j["text"]}, ensure_ascii=False))
PY
