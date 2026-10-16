// 社媒帖子的审核和发送（modules/social）。在服务器上（或连着库的电脑上）跑：
//   node myfnb/social.ts list [状态]       列出帖子（状态：pending held approved rejected withdrawn sent）
//   node myfnb/social.ts draft             现在起草今天的帖子（总开关关着也能跑，只写库，不往外发）
//   node myfnb/social.ts approve <id> <谁>  批准一条待审的帖子
//   node myfnb/social.ts reject <id> <谁>   不批准
//   node myfnb/social.ts send              发送已批准的帖子（现在只有测试发送：只记录，不往外发）
//   node myfnb/social.ts log [id]          看记录
import { sql, closeDb } from "@aihot/backend/db";
import { draftToday, listPosts, review, sendApproved, type Status } from "../modules/social/backend/posts.ts";

const [cmd, a, b] = process.argv.slice(2);
try {
  if (cmd === "list") {
    for (const p of await listPosts(a as Status | undefined)) console.log(`#${p.id}\t${p.status}\t${p.platform}\t${p.title}${p.problems.length ? `\t问题：${p.problems.join("；")}` : ""}`);
  } else if (cmd === "draft") {
    console.log("drafted", await draftToday());
  } else if ((cmd === "approve" || cmd === "reject") && a && b) {
    console.log((await review(Number(a), cmd === "approve" ? "approved" : "rejected", b)) ? "ok" : "不是待审状态，没动");
  } else if (cmd === "send") {
    console.log(await sendApproved());
  } else if (cmd === "log") {
    for (const r of await sql`SELECT post_id::int, event, detail, at FROM social_log ${a ? sql`WHERE post_id = ${Number(a)}` : sql``} ORDER BY id`) console.log(r.at.toISOString(), `#${r.post_id}`, r.event, JSON.stringify(r.detail));
  } else {
    console.error("用法见本文件开头");
    process.exitCode = 2;
  }
} finally {
  await closeDb();
}
