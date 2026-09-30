#!/usr/bin/env bash
# MyF&B 部署：在一台全新的 Ubuntu 服务器（腾讯云 Lighthouse）上，在网页终端粘贴这一行：
#
#   sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/1204kay/myfnbguide/main/myfnb/bootstrap.sh)"
#
# 按作者 docs/deploy.md 的做法：装 Docker → 拉代码 → 用作者的 scripts/init-env.ts 生成 .env →
# 读入并实测 DeepSeek 与 Gemini 的 key → 写站点设置 → docker compose --profile https up -d --build →
# 冒烟检查 → 装自动更新（每 5 分钟看一次 main，只部署 GitHub 上检查通过的提交）。
# 可以重复执行：代码、.env 和已填的 key 都会保留，只补缺的部分。
# 演练用的环境变量：MYFNB_DOMAIN、MYFNB_BRANCH、DEEPSEEK_KEY、GEMINI_KEY、MYFNB_NONINTERACTIVE=1。
set -euo pipefail

REPO="https://github.com/1204kay/myfnbguide.git"
DIR="/opt/myfnbguide"
DOMAIN="${MYFNB_DOMAIN:-new.myfnbguide.com}"
BRANCH="${MYFNB_BRANCH:-main}"
GEMINI_BASE="https://generativelanguage.googleapis.com/v1beta/openai"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
warn() { printf '\033[33m!! %s\033[0m\n' "$*"; }
die() { printf '\033[31mxx %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "请用 sudo 执行（见文件开头的那一行命令）。"
. /etc/os-release && [ "${ID:-}" = "ubuntu" ] || warn "这台机器不是 Ubuntu（${PRETTY_NAME:-未知}），脚本只在 Ubuntu 上验证过。"

# ── 1. 系统 ───────────────────────────────────────────────────────────────────────────────
say "1/7 安装基础工具、自动安全更新和 Docker"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git jq unattended-upgrades > /dev/null
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' > /etc/apt/apt.conf.d/20auto-upgrades
if ! command -v docker > /dev/null; then curl -fsSL https://get.docker.com | sh > /dev/null; fi
docker compose version > /dev/null || die "Docker Compose 不可用。"
# 构建镜像时内存吃紧：4 GB 的机器加 2 GB 交换空间，免得更新时构建被杀掉。
if [ -z "$(swapon --show --noheadings)" ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap -q /swapfile && swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── 2. 代码 ───────────────────────────────────────────────────────────────────────────────
say "2/7 拉取代码到 $DIR（分支 $BRANCH）"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch -q origin "$BRANCH" && git -C "$DIR" merge -q --ff-only "origin/$BRANCH"
else
  git clone -q --branch "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR"

# ── 3. .env ───────────────────────────────────────────────────────────────────────────────
say "3/7 生成设置文件 .env"
getenv() { sed -n "s/^$1=//p" .env | tail -1; }
setenv() { # 密钥写进文件的那一刻起就只有 root 能读
  (umask 077; { grep -v "^$1=" .env || true; printf '%s=%s\n' "$1" "$2"; } > .env.new)
  mv .env.new .env
}
ADMIN_LINE=""
if [ ! -f .env ]; then
  # 作者的 init-env 生成随机密钥和管理员密码；服务器上没有 Node，就在官方 Node 容器里跑它。
  out=$(docker run --rm -v "$DIR":/app -w /app node:24-alpine node scripts/init-env.ts)
  ADMIN_LINE=$(printf '%s\n' "$out" | grep '管理员密码' || true)
else
  echo ".env 已存在，保留原有设置。"
fi

ask() { # ask <提示> → 从终端读一行（不回显）
  local v=""
  if [ "${MYFNB_NONINTERACTIVE:-}" = "1" ]; then echo ""; return; fi
  read -rsp "$1" v < /dev/tty; echo > /dev/tty; echo "$v"
}

# ── 4. key ────────────────────────────────────────────────────────────────────────────────
say "4/7 DeepSeek key（写摘要用）"
LLM_BASE=$(getenv LLM_BASE_URL); LLM_BASE=${LLM_BASE:-https://api.deepseek.com/v1}
LLM_MODEL=$(getenv LLM_MODEL)
key=$(getenv LLM_API_KEY)
[ -n "$key" ] && echo "已填过，重新检查一次。"
for try in 1 2 3; do
  [ -z "$key" ] && key=${DEEPSEEK_KEY:-$(ask "粘贴 DeepSeek key 后按回车（屏幕不显示）：")}
  [ -z "$key" ] && { warn "没有填 DeepSeek key：站点能跑，但不会写摘要。以后重跑本脚本补上。"; break; }
  code=$(curl -s -o /tmp/myfnb-models.json -w '%{http_code}' -H "Authorization: Bearer $key" "$LLM_BASE/models" || echo 000)
  if [ "$code" = "200" ]; then
    setenv LLM_API_KEY "$key"
    if [ -n "$LLM_MODEL" ] && ! jq -e --arg m "$LLM_MODEL" '.data[] | select(.id == $m)' /tmp/myfnb-models.json > /dev/null; then
      warn "设置里的模型 $LLM_MODEL 不在这个 key 可用的列表里：$(jq -r '[.data[].id] | join(", ")' /tmp/myfnb-models.json)。把这段话发给 Claude。"
    else
      echo "key 可用，模型 ${LLM_MODEL:-未设置} 可用。"
    fi
    bal=$(curl -s -H "Authorization: Bearer $key" https://api.deepseek.com/user/balance | jq -r '[.balance_infos[]? | "\(.total_balance) \(.currency)"] | join(" + ")' 2>/dev/null || true)
    [ -n "$bal" ] && echo "DeepSeek 余额：$bal"
    break
  fi
  warn "DeepSeek 不接受这个 key（HTTP $code）。"
  if [ "${MYFNB_NONINTERACTIVE:-}" = "1" ] || [ "$try" = 3 ]; then setenv LLM_API_KEY "$key"; warn "先照填，站点能跑，但写摘要会失败。确认 key 后重跑本脚本。"; break; fi
  key=""
done

say "4/7 Gemini key（把同一件事的中英文报道归到一起用）"
key=$(getenv EMBEDDING_API_KEY)
[ -n "$key" ] && echo "已填过，重新检查一次。"
embed() { # embed <key> [dims] → 返回的向量长度，失败为空
  local body='{"model":"gemini-embedding-001","input":["测试一","test two"],"encoding_format":"float"'
  [ -n "${2:-}" ] && body="$body,\"dimensions\":$2"
  curl -s -H "Authorization: Bearer $1" -H "Content-Type: application/json" -d "$body}" "$GEMINI_BASE/embeddings" |
    jq -r 'if (.data | length) == 2 then (.data[0].embedding | length) else empty end' 2>/dev/null || true
}
for try in 1 2 3; do
  [ -z "$key" ] && key=${GEMINI_KEY:-$(ask "粘贴 Gemini key 后按回车（屏幕不显示）：")}
  if [ -z "$key" ]; then warn "没有填 Gemini key：归组退回字面比对，中英文同一事件合不上。以后重跑本脚本补上。"; setenv EMBEDDINGS_ENABLED false; break; fi
  n=$(embed "$key" 1536)
  if [ "$n" = "1536" ]; then dims=1536
  else n=$(embed "$key"); [ -n "$n" ] && dims=0 || dims=""
  fi
  if [ -n "$dims" ]; then
    setenv EMBEDDING_BASE_URL "$GEMINI_BASE"; setenv EMBEDDING_API_KEY "$key"
    setenv EMBEDDING_MODEL gemini-embedding-001; setenv EMBEDDING_DIMS "$dims"; setenv EMBEDDINGS_ENABLED true
    echo "key 可用，向量维度 $([ "$dims" = 0 ] && echo "用模型默认（${n}）" || echo 1536)。"
    break
  fi
  warn "Gemini 没有返回向量。"
  if [ "${MYFNB_NONINTERACTIVE:-}" = "1" ] || [ "$try" = 3 ]; then setenv EMBEDDINGS_ENABLED false; warn "先关闭向量，站点照样能跑。确认 key 后重跑本脚本。"; break; fi
  key=""
done

# ── 5. 站点设置与启动 ─────────────────────────────────────────────────────────────────────
say "5/7 站点设置（$DOMAIN）并启动；第一次构建约 5–10 分钟"
setenv SITE_URL "https://$DOMAIN"
setenv SITE_DOMAIN "$DOMAIN"
setenv PORT 127.0.0.1:3000   # 3000 端口只给本机的 Caddy 用
setenv TRUST_PROXY true
setenv COLLECT_ENABLED true
setenv MODEL_CALLS_ENABLED true
if [ "$DOMAIN" != "localhost" ]; then
  ip=$(curl -s -4 --max-time 10 https://api.ipify.org || true)
  dns=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)
  [ -n "$ip" ] && [ "$dns" != "$ip" ] && warn "$DOMAIN 现在指向 ${dns:-（没有记录）}，这台服务器是 $ip。先在 Porkbun 把 A 记录指到 $ip；指好之前 HTTPS 证书申请不下来，Caddy 会自己重试。"
fi
docker compose --profile https up -d --build
for i in $(seq 1 90); do curl -fsS -o /dev/null http://127.0.0.1:3000/api/health 2>/dev/null && break; sleep 2; done
curl -fsS -o /dev/null http://127.0.0.1:3000/api/health || { docker compose logs --tail 40 setup api web; die "站点没有起来，把上面的内容发给 Claude。"; }

# ── 6. 检查 ───────────────────────────────────────────────────────────────────────────────
say "6/7 冒烟检查与信源复查"
docker run --rm --network host --env-file .env aihot-app node scripts/smoke.ts --base http://127.0.0.1:3000 | tail -3 || warn "冒烟检查有失败，把上面的内容发给 Claude。"
docker run --rm aihot-app node myfnb/check-sources.mjs | tail -2 || warn "有信源不合规，把上面的内容发给 Claude。"

# ── 7. 自动更新 ───────────────────────────────────────────────────────────────────────────
say "7/7 自动更新：每 5 分钟检查 $BRANCH，只部署检查通过的提交"
cat > /etc/systemd/system/myfnb-update.service <<EOF
[Unit]
Description=MyF&B: deploy new commits whose GitHub checks passed
After=docker.service network-online.target
[Service]
Type=oneshot
Environment=MYFNB_BRANCH=$BRANCH
ExecStart=/bin/bash $DIR/myfnb/update.sh
EOF
cat > /etc/systemd/system/myfnb-update.timer <<'EOF'
[Unit]
Description=MyF&B: check for updates every 5 minutes
[Timer]
OnBootSec=5min
OnUnitActiveSec=5min
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now myfnb-update.timer > /dev/null

say "完成"
echo "网站：  https://$DOMAIN"
echo "后台：  https://$DOMAIN/admin"
if [ -n "$ADMIN_LINE" ]; then
  echo "$ADMIN_LINE"
  echo "↑ 后台登录密码只显示这一次，马上存进密码管理器。忘了可以在服务器上看：sudo grep ADMIN_PASSWORD $DIR/.env"
fi
echo "第一次导入的资料约半小时处理完。登录后台后先到「设置 → 预算」设每日上限。"
echo "自动更新日志：journalctl -u myfnb-update --since today"
