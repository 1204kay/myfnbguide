#!/usr/bin/env bash
# 给一台我们自己的机器装一把只能跑守门脚本的钥匙（十一 10-30 定：agent1 云电脑每天出十一说，不再靠 Kay 的电脑）。
# 钥匙在那台机器上生成，私钥不离开它；这里只收公钥，并限定只能从那台机器的出口 IP 来、只能跑 /usr/local/bin/myfnb-ops-gate。
# 用法（守门脚本要先由 install.sh 装好）：
#   sudo bash /opt/myfnbguide/myfnb/ops/add-key.sh <名字> <出口IP> < key.pub      例：add-key.sh agent1 43.160.236.58
# 重跑同一个名字会换掉旧的那把。收回：sudo sed -i '/myfnb-ops-<名字>$/d' /home/ubuntu/.ssh/authorized_keys
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "请用 sudo 执行：sudo bash $0 <名字> <出口IP> < key.pub"; exit 1; }
NAME="${1:?名字}"; IP="${2:?出口IP}"
[[ "$NAME" =~ ^[a-z0-9-]{1,20}$ ]] || { echo "名字只用小写字母、数字、连字符：$NAME" >&2; exit 1; }
[[ "$IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || { echo "出口IP 要是 IPv4：$IP" >&2; exit 1; }
[ -x /usr/local/bin/myfnb-ops-gate ] || { echo "守门脚本还没装：先跑 sudo bash /opt/myfnbguide/myfnb/ops/install.sh" >&2; exit 1; }
read -r type key _ || true
[[ "$type" == ssh-ed25519 && "$key" =~ ^[A-Za-z0-9+/=]{60,80}$ ]] || { echo "标准输入要是一行 ssh-ed25519 公钥" >&2; exit 1; }
AK=/home/ubuntu/.ssh/authorized_keys
sed -i "/myfnb-ops-$NAME\$/d" "$AK"
echo "from=\"$IP\",command=\"/usr/local/bin/myfnb-ops-gate\",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding $type $key myfnb-ops-$NAME" >> "$AK"
chown ubuntu:ubuntu "$AK"
echo "已装：$NAME 只能从 $IP 连，只能跑守门脚本。指纹：$(ssh-keygen -lf <(echo "$type $key") | cut -d' ' -f2)"
echo "守门脚本改过的话（比如加了 audio），要重跑 install.sh 才生效，它会把 gate.sh 复制到 /usr/local/bin。"
