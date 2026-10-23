#!/usr/bin/env bash
# 2026-10-23 只读排查：worker 告警「有精选新闻卡在去重确认，暂未发布」（从 10-15 起）。
# 不写库、不重启、不动文件：库用只读事务查（myfnb_ro，没有就用 aihot 加 default_transaction_read_only）。
# 从 Kay 的电脑一条命令跑：
#   git -C C:\myfnbguide show origin/claude/project-thread-2mhqji:myfnb/diag-grouping-2026-10-23.sh | ssh -i ~/.ssh/myfnb_server ubuntu@43.160.228.180 'bash -s'
set -uo pipefail
cd /opt/myfnbguide || exit 1
q() {
  echo; echo "=== $1"
  if sudo docker compose exec -T db psql -U myfnb_ro -d aihot -c 'select 1' >/dev/null 2>&1; then u=myfnb_ro; else u=aihot; fi
  sudo docker compose exec -T -e PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=60000' db \
    psql -U "$u" -d aihot -P pager=off -v ON_ERROR_STOP=0 -c "$2"
}
echo "=== 线上版本"; git log -1 --format='%h %cd %s' --date=iso
sudo docker compose ps --format 'table {{.Service}}\t{{.Status}}'

q "卡着的精选（同 waitingSelectedNews 的条件）" "
SELECT p.article_id, left(p.title,40) title, a.grouping_status gs, a.processing_state ps, a.revision rev,
  to_char(coalesce(p.selected_ready_at,p.discovered_at) at time zone 'Asia/Shanghai','MM-DD HH24:MI') ready,
  a.grouping_receipt_id rcpt, r.status rstatus, left(a.grouping_error,160) err,
  (SELECT string_agg(j.state||':'||coalesce(j.singleton_key,'-'),',') FROM pgboss.job j WHERE j.name='events.group' AND j.data->>'articleId'=a.id) jobs
FROM publications p JOIN articles a ON a.id=p.article_id LEFT JOIN receipts r ON r.id=a.grouping_receipt_id
WHERE p.selection_candidate AND p.eligible AND p.visibility='public' AND a.grouping_status<>'complete'
ORDER BY 6"

q "卡着的条目：分析是不是当前版本、relevance、来源模式" "
SELECT a.id, s.participation_mode pm, a.backfill, a.created_at at time zone 'Asia/Shanghai' created,
  (SELECT string_agg(an.input_revision||':'||an.relevance,',') FROM analyses an WHERE an.article_id=a.id) analyses,
  (SELECT max(revision) FROM article_revisions ar WHERE ar.article_id=a.id) max_rev
FROM publications p JOIN articles a ON a.id=p.article_id JOIN sources s ON s.id=a.source_id
WHERE p.selection_candidate AND p.eligible AND p.visibility='public' AND a.grouping_status<>'complete'"

q "归组状态按天（入选候选，最近 12 天，按 discovered_at 北京日期）" "
SELECT (a.discovered_at at time zone 'Asia/Shanghai')::date d, a.grouping_status, count(*)
FROM publications p JOIN articles a ON a.id=p.article_id
WHERE p.selection_candidate AND a.discovered_at > now()-interval '12 days' GROUP BY 1,2 ORDER BY 1,2"

q "全部文章归组状态（最近 12 天）" "
SELECT (a.discovered_at at time zone 'Asia/Shanghai')::date d, a.grouping_status, a.processing_state, count(*)
FROM articles a WHERE a.discovered_at > now()-interval '12 days' GROUP BY 1,2,3 ORDER BY 1,2,3"

q "events.group 队列各状态按天" "
SELECT (created_on at time zone 'Asia/Shanghai')::date d, state, count(*) FROM pgboss.job WHERE name='events.group'
AND created_on > now()-interval '12 days' GROUP BY 1,2 ORDER BY 1,2"

q "events.group 最近失败的任务输出" "
SELECT id, state, retry_count, created_on at time zone 'Asia/Shanghai' created, left(output::text,300) output
FROM pgboss.job WHERE name='events.group' AND state IN ('failed','retry') ORDER BY created_on DESC LIMIT 15"

q "队列定义（events.group）" "SELECT * FROM pgboss.queue WHERE name LIKE 'events.%'"

q "归组用的回执：最近 12 天按天按状态和模型" "
SELECT (created_at at time zone 'Asia/Shanghai')::date d, purpose, model, status, count(*) FROM receipts
WHERE purpose IN ('group_article','group_review','group_signal') AND created_at > now()-interval '12 days'
GROUP BY 1,2,3,4 ORDER BY 1,2,3,4"

q "归组回执最近的错误" "
SELECT r.id, r.purpose, r.model, r.status, r.updated_at at time zone 'Asia/Shanghai' at, left(coalesce(r.error,''),200) error
FROM receipts r WHERE purpose LIKE 'group%' AND status IN ('failed','unknown','pending') ORDER BY id DESC LIMIT 15"

q "grouping_decisions 按天" "
SELECT (created_at at time zone 'Asia/Shanghai')::date d, verdict, count(*) FROM grouping_decisions
WHERE created_at > now()-interval '12 days' GROUP BY 1,2 ORDER BY 1,2"

q "后台改选的模型和预算" "SELECT key, left(value::text,400) FROM settings WHERE key ILIKE '%model%' OR key ILIKE '%budget%' OR key ILIKE '%breaker%' OR key ILIKE 'heartbeat%'"

q "预算熔断表（如有）" "SELECT * FROM budgets" 

q "ops.recover 运行情况" "SELECT job, status, count(*), max(finished_at) at time zone 'Asia/Shanghai' last FROM job_runs WHERE started_at > now()-interval '3 days' GROUP BY 1,2 ORDER BY 1,2"

echo; echo "=== .env 里和模型步骤相关的变量名（只印名字和非密钥的值）"
sudo grep -E '^(GROUP|GROUP_REVIEW|LLM_MODEL|[A-Z_]*_MODEL|COLLECT_ENABLED|MODEL_CALLS_ENABLED|FEISHU_[A-Z_]*ENABLED|EMBEDDING_MODEL)=' .env | sed -E 's/(KEY|TOKEN|SECRET)=.*/\1=***/'
sudo grep -oE '^(EMBEDDING_API_KEY|DASHSCOPE_API_KEY|DEEPSEEK_API_KEY|ZHIPU_API_KEY|LLM_API_KEY)=' .env

echo; echo "=== worker 日志里和归组有关的最近 60 行"
sudo docker compose logs --no-color --tail 20000 worker 2>&1 | grep -iE 'group|归组|budget|熔断' | tail -60
echo; echo "=== 部署日志 10-14 到 10-16"
sudo journalctl -u myfnb-update --since "2026-10-14" --until "2026-10-16" --no-pager | grep -vE 'Already up to date|没有新' | tail -40
