#!/usr/bin/env bash
# Kay 在腾讯云网页终端（OrcaTerm）跑一次：sudo bash /opt/myfnbguide/myfnb/ops/install.sh
# 做四件事：装守门脚本；建只读数据库账号；生成一把只给 GitHub 用的密钥，限死只能跑守门脚本；
# 把要贴进 GitHub 的两段文字打印出来。重跑会换一把新密钥（旧的那把同时作废）。
# 收回：sudo sed -i '/myfnb-github-ops/d' /home/ubuntu/.ssh/authorized_keys
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "请用 sudo 执行：sudo bash $0"; exit 1; }
DIR=/opt/myfnbguide
install -o root -g root -m 755 "$DIR/myfnb/ops/gate.sh" /usr/local/bin/myfnb-ops-gate
install -d -o ubuntu -g ubuntu -m 750 /var/log/myfnb-ops

cd "$DIR"
docker compose exec -T db psql -U aihot -d aihot -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'myfnb_ro') THEN CREATE ROLE myfnb_ro LOGIN; END IF;
END $$;
GRANT pg_read_all_data TO myfnb_ro;
ALTER ROLE myfnb_ro SET default_transaction_read_only = on;
SQL

AK=/home/ubuntu/.ssh/authorized_keys
tmp=$(mktemp -d)
ssh-keygen -q -t ed25519 -N '' -C myfnb-github-ops -f "$tmp/key"
sed -i '/myfnb-github-ops/d' "$AK"
echo "command=\"/usr/local/bin/myfnb-ops-gate\",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding $(cat "$tmp/key.pub")" >> "$AK"
chown ubuntu:ubuntu "$AK"

echo
echo "====== 1. 复制下面整段（含 BEGIN、END 两行），贴进 GitHub 的 MYFNB_OPS_KEY ======"
cat "$tmp/key"
echo "====== 2. 复制下面这一行，贴进 GitHub 的 MYFNB_OPS_KNOWN_HOSTS ======"
echo "43.160.228.180 $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"
echo "=================================================================="
shred -u "$tmp/key"; rm -rf "$tmp"
echo "私钥已从服务器上删掉，只剩上面这一份。贴好以后清屏：clear"
