#!/usr/bin/env bash
# 云端会话经 GitHub Actions 登录服务器时唯一能跑的东西（authorized_keys 的 command= 指向本文件的副本
# /usr/local/bin/myfnb-ops-gate，由 install.sh 复制、属 root；所以改了本文件要重跑 install.sh 才生效）。
# 只放行：看状态和日志、跑镜像里已有的 myfnb/ 脚本（即已合进 main 的）、用只读账号查库。
# 删数据、改防火墙、装补丁、重启不在这里，仍由 Kay 在 OrcaTerm 做（公司手册 公司/讨论/④全部搬上云端.md #2、#3）。
set -uo pipefail
cd /opt/myfnbguide || exit 1
LOG=/var/log/myfnb-ops
CMD=${SSH_ORIGINAL_COMMAND:-help}
echo "$(date -Is) $CMD" >> "$LOG/audit.log"
read -ra a <<< "$CMD"
verb=${a[0]:-help}
num() { [[ ${1:-} =~ ^[0-9]{1,5}$ ]] && echo "$1" || echo "$2"; }
script_ok() { [[ ${1:-} =~ ^myfnb/[A-Za-z0-9._/-]+\.(ts|mjs)$ && $1 != *..* ]]; }

case $verb in
  status)
    git log -1 --format='线上版本 %h %cd %s' --date=iso
    sudo docker compose ps --format 'table {{.Service}}\t{{.Status}}'
    df -h / | tail -1; free -m | sed -n 2p ;;
  deploy-log)
    sudo journalctl -u myfnb-update -n "$(num "${a[1]:-}" 100)" --no-pager ;;
  logs)
    [[ ${a[1]:-} =~ ^(api|worker|web|db|caddy|setup)$ ]] || { echo "logs <api|worker|web|db|caddy|setup> [行数]"; exit 2; }
    sudo docker compose logs --no-color --tail "$(num "${a[2]:-}" 200)" "${a[1]}" ;;
  run|bg)
    script_ok "${a[1]:-}" || { echo "$verb myfnb/<脚本>.ts [参数…]：只跑 myfnb/ 下已合进 main 的脚本"; exit 2; }
    if [ "$verb" = run ]; then
      exec sudo docker compose exec -T worker node "${a[@]:1}"
    fi
    id=$(date -u +%Y%m%dT%H%M%SZ)
    setsid nohup sudo docker compose exec -T worker node "${a[@]:1}" > "$LOG/$id.log" 2>&1 < /dev/null &
    echo "已在后台开始，编号 $id；看输出：tail $id" ;;
  tail)
    [[ ${a[1]:-} =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { ls -t "$LOG" | grep -v audit | head -20; exit 0; }
    tail -n "$(num "${a[2]:-}" 200)" "$LOG/${a[1]}.log" ;;
  sql)
    # 只读账号 myfnb_ro（install.sh 建的，只有 pg_read_all_data，默认只读事务），写不进任何东西
    sudo docker compose exec -T db psql -U myfnb_ro -d aihot -v ON_ERROR_STOP=1 -c "${CMD#sql }" ;;
  *)
    echo "可用：status | deploy-log [行数] | logs <服务> [行数] | run myfnb/<脚本>.ts [参数] | bg myfnb/<脚本>.ts [参数] | tail [编号] [行数] | sql <只读查询>" ;;
esac
