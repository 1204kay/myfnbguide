#!/usr/bin/env bash
# 云端会话经 GitHub Actions 登录服务器时唯一能跑的东西（authorized_keys 的 command= 指向本文件的副本
# /usr/local/bin/myfnb-ops-gate，由 install.sh 第一次复制、属 root；改了本文件要在服务器上
# 合并部署后跑 sudo install -o root -g root -m 755 myfnb/ops/gate.sh /usr/local/bin/myfnb-ops-gate 才生效，
# 不要为此重跑 install.sh，它会换掉 GitHub 那把钥匙）。
# 只放行：看状态和日志、跑镜像里已有的 myfnb/ 脚本（即已合进 main 的）、用只读账号查库、放上十一说一期的音频。
# 同一个守门也给 css-cloud 云电脑（原名 agent1）每天出十一说用（myfnb/ops/add-key.sh 装的钥匙，十一 10-30 定）。那把钥匙带名字进来
# （command="… css-cloud"），只放行十一说用得到的：status、tail、audio、script、run myfnb/issue-now.ts 的取、核、放、上头条四样，
# 以及 css-cloud 断线监控读模型用量的 budget（只读，只输出三个数）、读网站自己开着的告警的 alerts（只读）、
# 公司流水线看板读今天几篇几分、各任务最近一次跑得怎样的 board（只读，输出一行 JSON）；
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
    "status "*|"budget "*|"alerts "*|"board "*|"tail "*|"audio "*|"script "*|"run myfnb/issue-now.ts "|"run myfnb/issue-now.ts --items"|"run myfnb/issue-now.ts --dump"|"run myfnb/issue-now.ts --put"|"run myfnb/issue-now.ts --lead") ;;
    *) echo "$(date -Is) [$caller] 拒绝" >> "$LOG/audit.log"
       echo "这把钥匙只能：status | budget | alerts [test] | board | tail [编号] | audio <期号> <秒数> < mp3 | script <期号> < 听稿.txt | run myfnb/issue-now.ts [--items|--dump|--put|--lead 日期]"; exit 2 ;;
  esac
fi
num() { [[ ${1:-} =~ ^[0-9]{1,5}$ ]] && echo "$1" || echo "$2"; }
script_ok() { [[ ${1:-} =~ ^myfnb/[A-Za-z0-9._/-]+\.(ts|mjs)$ && $1 != *..* ]]; }

case $verb in
  status)
    git -c safe.directory="$PWD" log -1 --format='线上版本 %h %cd %s' --date=iso
    sudo docker compose ps --format 'table {{.Service}}\t{{.Status}}'
    df -h / | tail -1; free -m | sed -n 2p ;;
  budget)
    # 网站本身回 200、模型却被日上限挡住时外面看不出来（10-31 12:02 起近三小时），监控靠这个看：
    # llm 过去 24 小时的 live 调用、per_day、过去 2 小时的调用，空格隔开，口径同 providers/receipts.ts 的 checkBudget
    sudo docker compose exec -T db psql -U myfnb_ro -d aihot -At -F ' ' -v ON_ERROR_STOP=1 -c "SELECT (SELECT count(*) FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day'), (SELECT per_day FROM budgets WHERE service = 'llm'), (SELECT count(*) FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '2 hours')" ;;
  alerts)
    # 网站自己的告警（operations/alerts.ts 每 10 分钟查一次，开着的记在 settings 'alerts.state'）原本只发飞书，
    # 而服务器没开飞书（FEISHU_INTERNAL_ENABLED=false），Kay 也不看飞书：11-02 Claude 额度用完、第 8 期文字稿没时间都没人收到。
    # css-cloud 的 site-watch 每 15 分钟读这里，有新的一行就照断线那条路叫醒 Claude、报给 Kay。
    # 一行一个：键<TAB>开始时间<TAB>标题；没有告警就什么都不输出。alerts test 只输出一行固定的假告警，不碰库，给 site-watch 试整条路用。
    if [ "${a[1]:-}" = test ]; then printf 'test.alert\t%s\t测试告警：这是 alerts test 输出的假告警，不用处理\n' "$(date -Is)"; exit 0; fi
    sudo docker compose exec -T db psql -U myfnb_ro -d aihot -At -F $'\t' -v ON_ERROR_STOP=1 -c "SELECT e.key, e.value->>'since', e.value->>'title' FROM settings s, jsonb_each(s.value) AS e(key, value) WHERE s.key = 'alerts.state' ORDER BY e.value->>'since'" ;;
  board)
    # 公司流水线看板（dino-valley company-view/board，css-cloud 每 10 分钟读一次）：从今天 08:00（马来西亚时间，即 UTC 0 点，
    # 和日报同一个分界）起收了几篇、打了分的几篇和分数分布、进精选几条，以及近 3 天跑过的每个任务最近一次的结果、
    # 过去 24 小时失败几次、最近 20 次各是什么结果（口径同后台「运行」页 admin/runs.ts，只是不读 pgboss），以及各付费服务本月和 7 天的花费。只读账号，输出一行 JSON。
    sudo docker compose exec -T db psql -U myfnb_ro -d aihot -At -v ON_ERROR_STOP=1 <<'SQL'
WITH a AS (SELECT id FROM articles WHERE discovered_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),
p AS (SELECT p.score, p.selected FROM publications p JOIN a ON a.id = p.article_id WHERE p.visibility <> 'withdrawn'),
j AS (SELECT DISTINCT job FROM job_runs WHERE started_at > now() - interval '3 days')
SELECT json_build_object(
  'at', now(),
  'since', date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
  'collected', (SELECT count(*) FROM a),
  'scored', (SELECT count(*) FROM p WHERE score IS NOT NULL),
  'scores', (SELECT json_build_object('60+', count(*) FILTER (WHERE score >= 60), '50-59', count(*) FILTER (WHERE score >= 50 AND score < 60), '40-49', count(*) FILTER (WHERE score >= 40 AND score < 50), '<40', count(*) FILTER (WHERE score < 40), 'max', max(score)) FROM p),
  'selected', (SELECT count(*) FROM p WHERE selected),
  -- 花费（仪表推算额度哪天用完）。两家分开算，口径各照站里已有的那一份，不另起一个数：
  -- claude：照 modules/reference/backend/credit.ts。额度这一期从 settings reference.claude-credit 的 renewsOn
  --   （默认每月 4 号，UTC 日）起算，不是 1 号；回执没有 Claude 的费用，按 token × 标价算，缓存读、写分开算。
  --   标价抄自 credit.ts 的 PRICES / WRITE_5M / WRITE_1H，那边改了这里跟着改。不在表里的模型照 Opus 算（同 credit.ts）。
  -- deepseek：照 myfnb/place-now.ts 的 costOf()。按后台价格表 service_prices，缓存命中按 cached_per_mtok 算；
  --   币种照价格表如实输出；价格表里没有、或缺价格的次数记进 unpriced，这时 week 不可信，仪表要说明。
  'claude', (SELECT json_build_object('start', per.start, 'end', per.start + interval '1 month', 'monthly', per.monthly,
       'spent', round(coalesce(sum(c.cost) FILTER (WHERE ra.started_at >= per.start), 0), 4),
       'week', round(coalesce(sum(c.cost) FILTER (WHERE ra.started_at > now() - interval '7 days'), 0), 4),
       'calls', count(*) FILTER (WHERE ra.started_at >= per.start))
     FROM (SELECT monthly, (date_trunc('month', now() AT TIME ZONE 'UTC')
             - CASE WHEN extract(day FROM now() AT TIME ZONE 'UTC') < r THEN interval '1 month' ELSE interval '0' END
             + (r - 1) * interval '1 day') AT TIME ZONE 'UTC' AS start
           FROM (SELECT coalesce((v->>'monthly')::numeric, 100) AS monthly, coalesce((v->>'renewsOn')::int, 4) AS r
                 FROM (SELECT (SELECT value FROM settings WHERE key = 'reference.claude-credit') AS v) s0) s1) per
     LEFT JOIN receipt_attempts ra ON ra.service = 'anthropic' AND ra.origin = 'live'
       AND ra.started_at >= least(per.start, now() - interval '7 days') AND ra.started_at <= now()
     LEFT JOIN LATERAL (SELECT CASE ra.model WHEN 'claude-sonnet-5-5' THEN 2 WHEN 'claude-haiku-5-5' THEN 0.1 ELSE 4 END AS i,
                               CASE ra.model WHEN 'claude-sonnet-5-5' THEN 10 WHEN 'claude-haiku-5-5' THEN 0.5 ELSE 20 END AS o,
                               CASE ra.model WHEN 'claude-haiku-5-5' THEN 0.01 ELSE 0.2 END AS rd,
                               coalesce((ra.usage->>'prompt_tokens')::numeric, 0) AS tin,
                               coalesce((ra.usage->>'completion_tokens')::numeric, 0) AS tout,
                               coalesce((ra.usage->>'cache_read_input_tokens')::numeric, 0) AS cr,
                               coalesce((ra.usage->'cache_creation'->>'ephemeral_5m_input_tokens')::numeric, 0) AS w5,
                               coalesce((ra.usage->'cache_creation'->>'ephemeral_1h_input_tokens')::numeric, 0) AS w1) t ON true
     LEFT JOIN LATERAL (SELECT (greatest(0, t.tin - t.cr - t.w5 - t.w1) * t.i + t.cr * t.rd + t.w5 * t.i * 1.25 + t.w1 * t.i * 2
                               + t.tout * t.o) / 1e6 AS cost) c ON true
     GROUP BY per.start, per.monthly),
  'deepseek', (SELECT coalesce(json_agg(d ORDER BY d.currency NULLS LAST), '[]') FROM (
     SELECT pr.currency, round(sum(c.cost), 4) AS week, count(*) FILTER (WHERE c.cost IS NULL)::int AS unpriced, count(*)::int AS calls
     FROM receipt_attempts ra
       LEFT JOIN LATERAL (SELECT input_per_mtok, cached_per_mtok, output_per_mtok, currency FROM service_prices sp
         WHERE sp.service = 'deepseek' AND sp.model IN (ra.model, '') ORDER BY sp.model = '' LIMIT 1) pr ON true
       CROSS JOIN LATERAL (SELECT coalesce((ra.usage->>'prompt_tokens')::numeric, 0) AS tin,
         coalesce((ra.usage->'prompt_tokens_details'->>'cached_tokens')::numeric, (ra.usage->>'prompt_cache_hit_tokens')::numeric, 0) AS tc,
         coalesce((ra.usage->>'completion_tokens')::numeric, 0) AS tout) t
       CROSS JOIN LATERAL (SELECT ((t.tin - t.tc) * pr.input_per_mtok + t.tc * coalesce(pr.cached_per_mtok, pr.input_per_mtok)
         + t.tout * pr.output_per_mtok) / 1e6 AS cost) c
     WHERE ra.service = 'deepseek' AND ra.origin = 'live' AND ra.usage IS NOT NULL AND ra.started_at > now() - interval '7 days'
     GROUP BY pr.currency) d),
  'jobs', (SELECT coalesce(json_agg(x ORDER BY x.job), '[]') FROM (
     SELECT j.job, l.started_at, l.finished_at, l.status, left(l.error, 200) AS error, c.failed_24h, c.runs_24h, r.recent
     FROM j CROSS JOIN LATERAL (SELECT started_at, finished_at, status, error FROM job_runs WHERE job = j.job ORDER BY started_at DESC, id DESC LIMIT 1) l
     CROSS JOIN LATERAL (SELECT count(*) FILTER (WHERE status = 'failed')::int AS failed_24h, count(*)::int AS runs_24h FROM job_runs WHERE job = j.job AND started_at > now() - interval '24 hours') c
     CROSS JOIN LATERAL (SELECT json_agg(json_build_object('at', started_at, 'status', status) ORDER BY started_at DESC) AS recent
       FROM (SELECT started_at, status FROM job_runs WHERE job = j.job ORDER BY started_at DESC, id DESC LIMIT 20) t) r) x)
);
SQL
    ;;
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
  script)
    # 同一期的听稿（播放条的「文字稿」），一行一句，从标准输入进来；只能放上或换掉，撤下跟音频一起
    [[ ${a[1]:-} =~ ^[1-9][0-9]{0,4}$ ]] || { echo "script <期号> < 听稿.txt"; exit 2; }
    tmp=$(mktemp /tmp/issue-XXXXXX.txt)
    head -c 1000000 > "$tmp"
    sudo bash myfnb/issue-audio.sh "${a[1]}" --script "$tmp"; rc=$?
    rm -f "$tmp"; exit $rc ;;
  sql)
    # 只读账号 myfnb_ro（install.sh 建的，只有 pg_read_all_data，默认只读事务），写不进任何东西
    sudo docker compose exec -T db psql -U myfnb_ro -d aihot -v ON_ERROR_STOP=1 -c "${CMD#sql }" ;;
  *)
    echo "可用：status | budget | alerts [test] | board | deploy-log [行数] | logs <服务> [行数] | run myfnb/<脚本>.ts [参数] | bg myfnb/<脚本>.ts [参数] | tail [编号] [行数] | sql <只读查询> | audio <期号> <秒数> < mp3 | script <期号> < 听稿.txt" ;;
esac
