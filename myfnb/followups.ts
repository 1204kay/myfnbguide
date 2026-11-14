// 每天 09:00 系统日报里「信源以外」的待跟进，给 css-cloud 每天读一次（同步原版串 11-14；十一 11-14 09:07：每天重复的活
// 交给脚本，不靠会话，只在有事的时候打扰人）。
// 系统日报（operations/alerts.ts 的 sendDigest）列的是所有 later 级的待跟进：信源出问题，也有数据库备份超过一天没成功、
// 付费请求结果没确认、内容推送不确定送达、后台任务排队超过 2 小时。这台服务器没开飞书，日报只进容器日志，没有人收到；
// 而这几类不会变成告警（守门脚本 alerts 读不到）。信源那几条由信源串在后台「采集」页看，这里不重复。
// 这里照 sendDigest 的口径挑（later 级、没被关掉、不是只给代理的），再去掉信源的（键以 sources. 开头），只读，不写库、不发消息。
// 一行一条：键<TAB>开始时间<TAB>标题；没有就什么都不输出（和守门脚本 alerts 同一个格式，site-watch 照同一条路报）。
//   sudo docker compose exec -T worker node myfnb/followups.ts      （守门脚本 followups 就是这一句）
import { closeDb } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import { collectFindings, dismissedFollowUps } from "@aihot/backend/operations/alerts";
import { SERVER_MODULES } from "@aihot/site/modules/server";

// 模块自己的检查（collectFindings 里的 serverModules）要先装上模块，和 worker 一样。
installModules(SERVER_MODULES);

const now = Date.now();
const found = (await collectFindings(now)).filter((f) => f.level === "later");
const dismissed = await dismissedFollowUps(found, now);
const oneLine = (s: string) => s.replace(/\s+/gu, " ").trim();
for (const f of found) {
  if (dismissed[f.key] || f.agentOnly || f.key.startsWith("sources.")) continue;
  console.log([f.key, f.since ? f.since.toISOString() : "", oneLine(`${f.title}${f.detail ? `：${f.detail}` : ""}`)].join("\t"));
}
await closeDb();
