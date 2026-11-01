#!/usr/bin/env bash
# 十一说的音频放上网站（modules/reference/backend/audio.ts）：把一期的 mp3 放进数据卷，旁边写 {"seconds": n}；
# 这一期的页面随即出现「听」按钮。音频在服务器以外做好（服务器 4 GB 装不下声音模型），先传到服务器再跑这个。
# 用法（在服务器上）：
#   cd /opt/myfnbguide && sudo bash myfnb/issue-audio.sh <期号> <mp3 路径> <秒数> [听稿 txt 路径]
#   只放听稿（音频已经在上面）：sudo bash myfnb/issue-audio.sh <期号> --script <听稿 txt 路径>
#   撤下：sudo bash myfnb/issue-audio.sh <期号> --remove
# 听稿是声音念的那份稿子，一行一句，播放条的「文字稿」显示它；没有听稿就没有这个按钮。
set -euo pipefail
cd "$(dirname "$0")/.."
NO="${1:?期号}"
[[ "$NO" =~ ^[1-9][0-9]*$ ]] || { echo "期号要是正整数：$NO" >&2; exit 1; }
if [[ "${2:-}" == "--remove" ]]; then
  docker compose exec -T api rm -f "/data/reference/audio/$NO.json" "/data/reference/audio/$NO.mp3" "/data/reference/audio/$NO.txt"
  echo "第 $NO 期的音频已撤下"; exit 0
fi
put_script() {
  [[ -s "$1" ]] || { echo "找不到听稿或是空的：$1" >&2; exit 1; }
  docker compose exec -T api mkdir -p /data/reference/audio
  docker compose cp "$1" "api:/data/reference/audio/$NO.txt"
}
if [[ "${2:-}" == "--script" ]]; then
  put_script "${3:?听稿 txt 路径}"
  echo "第 $NO 期的听稿已放上：/reference/issues/$NO（播放条的「文字稿」）"; exit 0
fi
MP3="${2:?mp3 路径}"; SECONDS_LONG="${3:?秒数}"; SCRIPT="${4:-}"
[[ -f "$MP3" ]] || { echo "找不到 $MP3" >&2; exit 1; }
[[ "$SECONDS_LONG" =~ ^[1-9][0-9]*$ ]] || { echo "秒数要是正整数：$SECONDS_LONG" >&2; exit 1; }
docker compose exec -T api mkdir -p /data/reference/audio
[[ -n "$SCRIPT" ]] && put_script "$SCRIPT"
docker compose cp "$MP3" "api:/data/reference/audio/$NO.mp3"
# json 最后写：页面以它为准，mp3 没放完之前不会出现「听」。
echo "{\"seconds\": $SECONDS_LONG}" | docker compose exec -T api sh -c "cat > /data/reference/audio/$NO.json"
docker compose exec -T web node -e "fetch('http://api:3001/api/reference/issues/$NO/audio.mp3', { headers: { Range: 'bytes=0-99' } }).then((r) => console.log('音频地址', r.status, '（206 才对）'))"
echo "第 $NO 期的音频已放上：/reference/issues/$NO"
