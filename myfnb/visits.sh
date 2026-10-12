#!/usr/bin/env bash
# 访问计数：按天、按类数页面被打开几次（deploy/Caddyfile 的访问日志，不含 IP 和浏览器标识）。
# 只数成功打开页面的 GET，去掉机器人、接口、静态文件和后台。用法（在服务器上）：
#   cd /opt/myfnbguide && sudo ./myfnb/visits.sh [天数，默认 7]
set -euo pipefail
cd "$(dirname "$0")/.."
DAYS="${1:-7}"
docker compose exec -T caddy sh -c 'cat /data/access.log* 2>/dev/null' | jq -rs --argjson days "$DAYS" '
  def kind:
    if . == "/" then "首页"
    elif test("^/reference/cases/") then "参考·故事"
    elif test("^/reference/shops/") then "参考·店家"
    elif test("^/reference/[^/]+$") then "参考·情况"
    elif . == "/reference" then "参考·首页"
    elif test("^/items/") then "条目"
    elif test("^/(daily|weekly|monthly)") then "日报周报月报"
    elif test("^/topics") then "主题"
    else "其他" end;
  [ .[] | select(.request.method == "GET" and .status == 200 and (.bot | not)
      and (.request.uri | test("^/(api|admin|assets|build|favicon|robots|sitemap|rss|feed)") | not)
      and (.request.uri | test("\.[a-z0-9]{2,5}$") | not))
    | { day: (.ts + 28800 | strftime("%Y-%m-%d")), kind: (.request.uri | kind) } ]
  | group_by(.day) | .[-$days:][]
  | .[0].day as $d | "\($d)  合计 \(length)  " + ([group_by(.kind)[] | "\(.[0].kind) \(length)"] | join("  "))'
