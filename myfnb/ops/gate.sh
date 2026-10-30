#!/usr/bin/env bash
# 云端会话经 GitHub Actions 登录服务器时唯一能跑的东西（authorized_keys 的 command= 指向本文件的副本
# /usr/local/bin/myfnb-ops-gate，由 install.sh 复制、属 root；所以改了本文件要重跑 install.sh 才生效）。
# 只放行：看状态和日志、跑镜像里已有的 myfnb/ 脚本（即已合进 main 的）、用只读账号查库、放上十一说一期的音频。
# 同一个守门也给 agent1 云电脑每天出十一说用（myfnb/ops/add-key.sh 装的钥匙，十一 10-30 定）。那把钥匙带名字进来
# （command="… agent1"），只放行十一说用得到的：status、tail、audio、run myfnb/issue-now.ts 的取、核、放、上头条四样；
# 花钱的、写库的其他脚本，和十一说的开关（--from、--stop），都只有 GitHub 那把能跑。
# 删数据、改防火墙、装补丁、重启不在这里，仍由 Kay 在 OrcaTerm 做（公司手册 公司/讨论/④全部搬上云端.md #2、#3）。
set -uo pipefail
cd /opt/myfnbguide || exit 1
LOG=/var/log/myfnb-ops
CMD=${SSH_ORIGINAL_COMMAND:-help}
caller=${1:-github}
echo "$(date -Is) [$caller] $CMD" >> "$LOG/audit.log"
read -ra a <<< "$CMD"
verb=${a[0]:-help}
if [ "$caller" != github ]; then
  # 多一个参数就可能夹带 --from 之类（issue-now.ts 各个旗号互不排斥），所以连参数个数和日期格式一起卡死
  [[ ${#a[@]} -le 4 && ( -z ${a[3]:-} || ${a[3]} =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ) ]] || a=(deny)
  [[ $verb != run || ${#a[@]} -le 2 || ${a[3]:-} =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || a=(deny)
  case "${a[0]} ${a[1]:-} ${a[2]:-}" in
    "status "*|"tail "*|"audio "*|"run myfnb/issue-now.ts "|"run myfnb/issue-now.ts --items"|"run myfnb/issue-now.ts --dump"|"run myfnb/issue-now.ts --put"|"run myfnb/issue-now.ts --lead") ;;
    *) echo "$(date -Is) [$caller] 拒绝" >> "$LOG/audit.log"
       echo "这把钥匙只能：status | tail [编号] | audio <期号> <秒数> < mp3 | run myfnb/issue-now.ts [--items|--dump|--put|--lead 日期]"; exit 2 ;;
  esac
fi
num() { [[ ${1:-} =~ ^[0-9]{1,5}$ ]] && echo "$1" || echo "$2"; }
script_ok() { [[ ${1:-} =~ ^myfnb/[A-Za-z0-9._/-]+\.(ts|mjs)$ && $1 != *..* ]]; }

case $verb in
  status)
    git -c safe.directory="$PWD" log -1 --format='线上版本 %h %cd %s' --date=iso
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
  audio)
    # 十一说第 10 步「放上」：mp3 从标准输入进来，只能放上，不能撤下（撤下要先问 Kay，仍在 OrcaTerm 做）
    [[ ${a[1]:-} =~ ^[1-9][0-9]{0,4}$ && ${a[2]:-} =~ ^[1-9][0-9]{0,5}$ ]] || { echo "audio <期号> <秒数> < issue.mp3"; exit 2; }
    tmp=$(mktemp /tmp/issue-XXXXXX.mp3)
    head -c 100000000 > "$tmp"
    sudo bash myfnb/issue-audio.sh "${a[1]}" "$tmp" "${a[2]}"; rc=$?
    rm -f "$tmp"; exit $rc ;;
  sql)
    # 只读账号 myfnb_ro（install.sh 建的，只有 pg_read_all_data，默认只读事务），写不进任何东西
    sudo docker compose exec -T db psql -U myfnb_ro -d aihot -v ON_ERROR_STOP=1 -c "${CMD#sql }" ;;
  *)
    echo "可用：status | deploy-log [行数] | logs <服务> [行数] | run myfnb/<脚本>.ts [参数] | bg myfnb/<脚本>.ts [参数] | tail [编号] [行数] | sql <只读查询> | audio <期号> <秒数> < mp3" ;;
esac
