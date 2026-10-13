# MyF&B 上线切换清单（电脑上的会话照这份一步步做）

> 写于 2026-10-13（云端讨论串「交接分工与密钥位置」）。把 `HANDOFF.md` §10「旧站切换清单」和 §9.2 第 11 项「上线那天」整理成可以照做的步骤；§10 仍是 Kay 定下的**内容**（切哪些、关哪些），这份只补**顺序、命令、确认办法和退路**。两边不一致，以 §10 的内容和 Kay 的最新话为准，并把这份改齐。
> 授权：决定记录 L412（Kay 10-13 08:13）——剩余项做完，十一可直接切 `www`、开放收录、执行切换清单；服务器续费 Kay 自己做；上线后叫 Kay 去线上看。社媒自动发不在上线门槛里，见第 7 步。
> 谁做：命令都在 Kay 笔记本的电脑会话里跑（云端连不到服务器，`HANDOFF.md:15`）。要登录 Kay 的账号（Porkbun、Tally、FB、IG、Vercel）的步骤标「Kay 做」：一次只给 Kay 一条，写明记录类型、名称、值，不让 Kay 找按钮、不让他转话。
> 写法：命令里的 `<服务器IP>` 见 `HANDOFF.md` §8 的腾讯云一行。**所有命令不含任何密钥**，不要把 `.env` 的内容贴进对话。

## 0. 开工前的门槛（任何一条不满足就不动 DNS）

逐条核对，结果写进 `HANDOFF.md` §9.2 开头新的一条：

1. **L412 的剩余项都做完了**：② 条目页手机显示 50 处问题和 `/reference/busy-no-profit` 缺店家链接；③ 约 260 篇故事标题数目（`audit-title-numbers-2026-10-13.ts` 跑过，「个数对不上」「数字找不到」逐篇对原文改完）；④ 社媒自动发模块已并入 main，处于测试模式（总开关默认关）；检查报错和测试通过。
2. **四项检查在 main 的最新提交上全过**（`HANDOFF.md` §6），GitHub 上这个提交的检查是绿的（服务器只部署检查通过的提交，`update.sh`）。
3. **线上现状是好的**：`curl -s https://new.myfnbguide.com/api/site/stats` 有数字；后台「运行」页没有告警；`curl -s https://new.myfnbguide.com/api/reference/status` 正常。
4. **服务器上没有在跑的长命令**（转写导入、重写、评测）。部署会停掉 worker，命令随之中断（`HANDOFF.md` §4「分支」一行）。
5. **DeepSeek 余额不低于 US$5**（后台或写作模型密钥查 `api.deepseek.com/user/balance`，**不要把密钥打出来**）。低于就先请 Kay 充 US$10（花新的钱要 Kay 做，`公司/决定记录.md` L391）。
6. **服务器没到期**：2026-11-01 到期、不自动续费，Kay 自己续（L412）。离到期不到两天就先请 Kay 续了再切。
7. **挑时间**：不在忙的整点，留出至少两小时盯着；Kay 在不在不影响，但上线后要马上告诉 Kay（第 9 步）。
8. **拍快照存档**：把 Porkbun 现有的全部 DNS 记录原样抄下来（类型、名称、值、TTL），存进仓库外的 `.data/dns-before-switch-<日期>.txt`。**这是退路**，没有它不要开始。`HANDOFF.md` §10 第 7 条 记的 13 条是 10-01 的快照，以现在 Porkbun 上的为准。同时记下 `www` 现在指向的 Vercel 值（CNAME 的值只记在这份快照里，`HANDOFF.md` 只写了开头）。

## 1. 先把 TTL 调低（Kay 做，提前至少一个 TTL 的时间）

- 在 Porkbun 把要改的两条（根域 A、`www` CNAME）的 TTL 调成最低（Porkbun 的最低值，通常 600 秒）。
- 等一个旧 TTL 过去再往下走（旧值看第 0 步第 8 点的快照）。TTL 本来就是 600 秒的，不用等。
- 确认：`dig +short www.myfnbguide.com` 还是旧值，说明只是调了 TTL，没动指向。

## 2. 准备转址的 Caddy 配置（仓库里改，先不让它生效到 DNS）

目标：`www.myfnbguide.com` 是站，`myfnbguide.com` 和 `new.myfnbguide.com` 最终都转到 `www`。**切换完成之前，`new.myfnbguide.com` 必须一直能打开**（它是退路和验证用的）。所以分两次改 `deploy/Caddyfile`，不要一步到位。

现在的 `deploy/Caddyfile` 只有一个站点块 `{$SITE_DOMAIN} { … reverse_proxy web:3000 }`，`SITE_DOMAIN` 来自服务器 `.env`（`docker-compose.yml` 的 caddy 服务）。

**第一次改（第 3 步部署）**：同一个站点块同时服务两个域名，加一个根域的转址块。

```caddyfile
www.myfnbguide.com, new.myfnbguide.com {
	…（原有内容原样保留：encode、访问计数的 log、reverse_proxy web:3000）
}

myfnbguide.com {
	redir https://www.myfnbguide.com/ permanent
}
```

这里用的是写死的域名，不再读 `{$SITE_DOMAIN}`；**`.env` 里的 `SITE_DOMAIN` 先不动**（第 5 步才改）。

**旧站网址的处理**（`HANDOFF.md` §10 第 1 条的「旧网址全部 301 到新站首页」）：根域整个转到 `www` 首页（如上，不带路径）。`www` 上的旧路径要从旧站取：旧站是静态参考书，页面路径从旧站仓库（`HANDOFF.md` §10 第 4 条的 `1204kay/myf-b_book`；Kay 本机 `C:\myfnb-guide`）的页面目录或站点地图导出，做成一个名单，只把**名单里的旧路径**在 `www` 上 301 到首页：

```caddyfile
	@oldsite path /旧路径1 /旧路径2 …
	redir @oldsite / permanent
```

名单以外的路径不动。不要用「所有 404 都转首页」代替：新站自己真正的 404 会被吞掉，读者和搜索引擎都分不清（这是做法上的判断，§10 没有明说怎么实现，十一可改）。旧路径与新站同名的（如 `/about`）保持新站的页面。

**第二次改（第 6 步部署）**：把 `new.myfnbguide.com` 拆成转址块。

```caddyfile
new.myfnbguide.com {
	redir https://www.myfnbguide.com{uri} permanent
}
```

并把第一个块的域名只留 `www.myfnbguide.com`（或改回 `{$SITE_DOMAIN}`，此时 `.env` 里已是 `www`）。

做法与记录：
- 这是对框架文件 `deploy/Caddyfile` 的又一处改动（访问计数已经改过一处）。**同一个提交里在 `HANDOFF.md` §3.0 的「与原版不同」清单加一行**：「域名转址 | `deploy/Caddyfile` 加根域、试运行域名的转址块和旧站路径名单 | 上线切换（§10 第 1 步）| Kay 在 §10 定了旧网址要转到新站」。
- 先在本机验证语法再推：`docker run --rm -v "$PWD/deploy/Caddyfile:/etc/caddy/Caddyfile:ro" -e SITE_DOMAIN=www.myfnbguide.com caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile`（本机有 Docker 才行；没有就在服务器上、部署后用 `caddy validate` 先于 reload）。
- 注意：服务器的 `update.sh` 部署后只做 `docker compose --profile https up -d`；Caddyfile 是挂载进容器的文件，**内容变了容器不会自己重载**，要手动 `sudo docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile`（第 3 步写了）。

## 3. 部署「第一次改」，让服务器同时认 www 和 new

1. 本机四项检查通过（`HANDOFF.md` §6），推 main（`git push origin claude/zealous-albattani-74n9ji:main`，被自动模式拦时按 `HANDOFF.md` §4「分支」一行处理）。
2. 等服务器部署：每 5 分钟检查一次，检查全绿才部署。服务器上的提交等于刚推的：`ssh -i ~/.ssh/myfnb_server ubuntu@<服务器IP> git -C /opt/myfnbguide rev-parse --short HEAD`（`/api/health` 的 `release` 字段只在设了 `AIHOT_RELEASE` 时才是版本名，否则是 `dev`）。
3. 在服务器重载 Caddy：
   ```bash
   ssh -i ~/.ssh/myfnb_server ubuntu@<服务器IP>
   cd /opt/myfnbguide && sudo docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile && sudo docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```
4. 确认：`https://new.myfnbguide.com` 照常打开（没被转走）；`sudo docker compose logs --tail 50 caddy` 里能看到它在为 `www.myfnbguide.com`、`myfnbguide.com` 申请证书，**因为 DNS 还没指过来，申请会失败并重试，这是预期的**，不是故障。

退路：`git revert` 这个提交再推，等部署，再 reload Caddy。DNS 没动过，线上没有受影响。

## 4. 改 DNS（Kay 做，一条一条给）

只改这两条，其余全部不动（`HANDOFF.md` §10 第 7 条：`new` A、`forms` CNAME、SendGrid 三条 CNAME 与 `_dmarc.forms` TXT、邮件转发 MX 与 SPF TXT、两条 `_acme-challenge` TXT）：

| 记录 | 现在（以第 0 步第 8 点的快照为准） | 改成 |
|---|---|---|
| 根域 `myfnbguide.com` 的 A | 旧站 Vercel 的地址 | `<服务器IP>` |
| `www` 的 CNAME | 指向 Vercel（`…vercel-dns-017.com`） | **删掉这条 CNAME**，加 `www` 的 A 记录 `<服务器IP>`（同名不能同时有 CNAME 和 A，先删后加） |

**拼写变体域名 `myfbguide.com` 先处理**（`HANDOFF.md` §10 第 5 条）：它现在 308 转到 `https://www.myfnbguide.com/`，看起来是 Vercel 做的。停 Vercel 之前，在 Porkbun 给 `myfbguide.com`（含 www）设 URL Forwarding 到 `https://www.myfnbguide.com`，确认转址还通（`curl -sI https://myfbguide.com`），再往下。**这一步在改上面两条之前做**，免得旧站一停它就失效。

改完后确认（可以反复跑，等 TTL）：
```bash
dig +short myfnbguide.com        # 应该是 <服务器IP>
dig +short www.myfnbguide.com    # 应该是 <服务器IP>
```
`dig` 值对了之后，Caddy 会在几十秒到几分钟内拿到证书。

## 5. 确认 www 通了，再改站点地址

1. `curl -sI https://www.myfnbguide.com/ | head -3` 返回 200，证书有效（不加 `-k`）。`curl -sI https://myfnbguide.com/` 是 301 到 `https://www.myfnbguide.com/`。
2. 整站随手点：首页、`/reference`、一个情况页、一个故事页、`/daily`、`/about`、`/privacy`、`/terms`、`/feed.xml`，都 200。
3. **到这里才改 `.env`**。在服务器：
   ```bash
   cd /opt/myfnbguide
   sudo cp .env /var/backups/env-before-www-$(date +%Y%m%d).bak && sudo chmod 600 /var/backups/env-before-www-*.bak
   sudo sed -i 's#^SITE_URL=.*#SITE_URL=https://www.myfnbguide.com#; s#^SITE_DOMAIN=.*#SITE_DOMAIN=www.myfnbguide.com#' .env
   sudo grep -E '^(SITE_URL|SITE_DOMAIN)=' .env
   sudo docker compose --profile https up -d
   ```
   备份文件里有密钥，权限 600、只留在服务器上、**不要读出来**（`.env` 的内容不贴进对话，`HANDOFF.md:368`）。`SITE_URL` 是生成的链接、RSS、分享图、MCP 用的地址（`docs/deploy.md`），MCP 只接受 `SITE_URL` 域名的请求。
4. 确认：`curl -s https://www.myfnbguide.com/sitemap.xml | head -5` 里的地址是 `www.myfnbguide.com`；`curl -s https://www.myfnbguide.com/api/site/stats` 有数字；后台能登录（Kay 的密码在他的 Chrome 里，不需要你登录；用 `/api/health` 之类公开接口确认就够）。

退路：`.env` 从备份拷回去，`sudo docker compose --profile https up -d`，DNS 改回快照。

## 6. 部署「第二次改」：new 转到 www，放开搜索引擎收录

这一次的提交包含：
- `deploy/Caddyfile`：`new.myfnbguide.com` 拆成转址块（第 2 步）。
- `site/public/robots.txt`：换回作者的版本（试运行期整站 `Disallow: /`，`HANDOFF.md:222`）。作者的版本在历史里：`git show 81b6dee^:site/public/robots.txt > site/public/robots.txt`（里面有 `{{siteUrl}}/sitemap.xml` 占位符，发布时会替换成 `SITE_URL`，所以第 5 步必须先做完）。
- `site/changelog.json`：加一条上线公告（日期、时间、种类「公告」、标题、正文；`latestVersion` 改成这一条的日期时间）。两份条款的内容没有变，**不要为了「同步上线日期」去改生效日期**，除非这次又改了条款内容（改了才更新版本号和日期）。
- `HANDOFF.md` §3.0：robots 那一行从「试运行不让抓」改回原版。
- 提交信息说清「上线切换」。

推 main、等部署、reload Caddy（同第 3 步）。确认：
```bash
curl -s https://www.myfnbguide.com/robots.txt        # 是作者版本，有 Sitemap 一行，没有 Disallow: /
curl -sI https://new.myfnbguide.com/ | head -3        # 301，Location 是 https://www.myfnbguide.com/
```

## 7. 收录和自动化开关

1. **IndexNow**（Bing 等）：在服务器 `.env` 加 `INDEXNOW_KEY=`（32 位十六进制，`openssl rand -hex 16` 现场生成，不用打印出来贴给任何人）和 `INDEXNOW_SUBMIT_ENABLED=true`（只认小写 `true`），`sudo docker compose --profile https up -d`。确认：`curl -s https://www.myfnbguide.com/<那串key>.txt` 返回的内容等于 key 本身（静态路由 `apps/api/src/routes/static.ts`）。第一次会把全站地址分批提交，之后每天提交新变化。
2. **Google / Bing 站长工具**（Search Console、Bing Webmaster）：要登录 Kay 的账号，Kay 做；做不做由 Kay 说。不做也不影响收录，只是看不到数据。
3. **社媒自动发**：**不属于上线门槛**。总开关保持关。要打开必须同时满足：（a）Kay 先看过样帖（L412）；（b）Kay 在各平台点过授权（Meta 开发者应用、FB 专页、IG 专业账号、微信服务号），长期凭证由 Kay 自己贴到服务器 `.env`（`HANDOFF.md:440`）；（c）模块测试模式已经验证。打开前再给 Kay 一条「要往外发了」的提醒。

## 8. 旧站和账号收尾（§10 第 2–6 条）

这些都是对旧站的收尾，做完旧站就没有了。**按顺序，前一步确认了再做下一步**，每一步都留下「做了什么、什么时候」的记录在 `HANDOFF.md` 上线那条里：

1. （Kay 做）关闭 5 个 Tally 表单：fix（EkJ0lN）、feedback（XxElML）、story（yPx8dx）、ask（Gxo91j）、join（dWZNBV）。**先确认新站没有任何地方还链到它们**：`grep -rn "tally.so" site apps modules industry` 无输出。`forms` CNAME 和 SendGrid 的记录**不动**（`HANDOFF.md` §10 第 7 条）。
2. （Kay 做）FB、IG、小红书的 @myfnbguide 简介链接改成 `https://www.myfnbguide.com`。
3. （电脑会话做）GitHub 仓库 `1204kay/myf-b_book` 设为 Archive，不删。可随时撤回。
4. （Kay 做）确认 `myfbguide.com` 的转址通（第 4 步已做），**然后**停掉 Vercel 旧项目。停之前再看一遍：`dig` 的结果都已指向服务器，没有任何记录还指 Vercel。停之后 Vercel 里的旧站就没有了，所以最后做。

## 9. 上线后（当天）

1. 逐项核对，结果写进 `HANDOFF.md` §9.2 开头新的一条：
   - `https://www.myfnbguide.com` 首页、参考库、日报、条款、隐私说明、关于页都 200；`https://myfnbguide.com`、`https://new.myfnbguide.com` 都 301 到 www；`https://myfbguide.com` 能转到 www。
   - `curl -s https://www.myfnbguide.com/api/site/stats` 的来源数、条目数、日报期数和切换前一致。
   - 从中国大陆和马来西亚各测一次能不能打开、多快（10-10 用 Globalping 公开节点测过：中国大陆 8 个节点全部 200，中位约 0.9 秒；马来西亚约 0.5 秒，`HANDOFF.md:489`）；服务器在新加坡、没有备案。
   - 后台「运行」页没有新告警；`myfnb/visits.sh` 在服务器上能数出当天的访问（计数在 Caddy 的访问日志里，换成 www 后日志仍写同一个文件）。
2. **叫 Kay 去线上看**（L412）：一条完整、正式的消息，写清已经做了什么、线上地址、他该看什么、有问题怎么说（在项目对话里发）。**这时才算「已上线」**；只推了代码、只改了 DNS，都不算。
3. 上线后第一周：看后台「模型与评测」页的实际调用次数，校正 `HANDOFF.md` §11 的成本；每周数一次日报的地区分布；COS 备份设生命周期、核对 `DB_BACKUP_STORE_*` 已填（`HANDOFF.md` §9.2 第 11 项）；每月跑一次 `check-sources.mjs`。

## 退路总表

| 做到哪一步 | 怎么退 |
|---|---|
| 第 3 步之后、第 4 步之前 | `git revert` 那次提交，等部署，reload Caddy。线上没受影响 |
| 第 4 步之后（DNS 已改） | 按第 0 步第 8 点的快照把根域 A、`www` CNAME 改回去；旧站在 Vercel 上还没停，等 TTL 过去就恢复 |
| 第 5 步之后（`.env` 已改） | 把 `.env` 从 `/var/backups/env-before-www-*.bak` 拷回，`up -d`；DNS 照上一行 |
| 第 8 步之后（旧站已停） | 退不回去。所以第 8 步最后做，并且是在 www 稳定运行后 |
