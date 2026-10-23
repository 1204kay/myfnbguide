# MYFNB 和原版不同的地方

本站是在 AIHOT 原版框架上做的。最高规则是尽可能保持原版（`CLAUDE.md`），所以每一处和原版不同的地方都要记在这里：规则（想不同时要过的几关）、清单（现在有哪些不同、为什么、谁确认的）、改了框架的哪些文件。
清单以外的和原版不同之处都算错误：发现了就改回原版，或者补进清单请用户确认。新增、撤销一处，同一个改动里改这份文件。

（2026-10-24 从交接文件 `HANDOFF.md` 的 §3.0 和 §5.5 搬出来单独成文件，Kay：「应该建个专门的地方」。旧文件里写「§3.0」的地方指这里。）

## 1. 规则：尽可能保持原版（用户 2026-10-06）

用户原话：「这个项目的所有，注意：是所有，尽可能保持原版，除非有特殊需求。就算有特殊需求，也要再三审核、确认。我们做的事情就是在 AIHOT 作者来源的基础上去做我们的事情，而不是重新造作者已经做好的。」

- **范围是所有事情**：页面和版式、功能、配置项、处理流程、检查和部署方式、写法。本站自己的事只是：换行业（`industry/`）、换信源、本站的文字和品牌（`site/`）、框架没有的功能做成模块（`modules/`）。作者已经做好的，照原样用。
- **我们自己的模块也一样**（用户 10/16：「不管这个是不是我们自己的模块 都要保持一致」，起因是参考库故事页有三个原文按钮，原版条目页只有一个）：模块页面的框架部分（返回、标题区、来源行、原文/分享/收藏按钮、侧栏、列表行、卡片、页尾、手机底栏、字号和间距）照原版最接近的页面做，原版有的组件直接用；只有原版没有的内容本身（故事、图、情况）才是模块自己的。模块里和原版不同的地方同样过下面几关、写进清单。
- **想和原版不同时，按顺序过这几关，任何一关不过就用原版**：
  1. 原版有没有现成的做法（框架的配置项、组件、页面、作者的文档）？有就用原版的。
  2. 写下特殊需求是什么、为什么原版满足不了；「更好看」「更合理」不算，要说出读者或运营上具体遇到的问题。
  3. 写下和原版不同的代价：以后合并上游要多处理什么、要多维护什么、作者以后改版时会不会冲突。
  4. 能不能用最小的改法做到：先考虑 `site/` 的配置和模块插口，再考虑框架里加一个默认不改变原版行为的选项（可以提 PR 给作者），最后才是改框架。
  5. **先找用户确认**：把第 2–4 条写给用户，用户同意才动手。用户直接提出的需求（例如 10/6 的手机横滑筛选）也要过第 1、3、4 条，有更接近原版的做法就先说出来。
- **和原版不同的地方都要列在下面的清单里**，新增、撤销都改这张表；清单以外的和原版不同之处都算错误，发现了就改回原版或补进清单请用户确认。

**10/6 早上的清理授权**：用户：「全部你决定，这个对话就作为基础的开始，全面肃清这种情况。」所以这一轮复核由 Claude 按上面五关逐项决定、直接改回原版，不再逐项请用户确认；以后新增和原版不同之处，仍按第 5 关先找用户确认。

## 2. 清单

**和原版不同之处（清单，10/6 建立，10/6 上午按清理结果重写）**：

| 地方 | 和原版不同 | 理由（特殊需求） | 用户确认 |
|---|---|---|---|
| 参考库 | 框架没有的功能，做成模块 `modules/reference`，只用原版插口（侧栏、手机底栏），地址 `/reference`；首页仍是原版的精选 | 本站要验证的东西（§0、§2.1）；模块是原版给的扩展方式 | 10/4 |
| 核对员 | 入选条目的标题、导读和要点写好后，另一个模型拿原文逐句核一遍：第 1–4 类（数字、谁说的、发生过没有、先后因果）和误导照它的改法改，改过的再核一遍只拦严重错；要点有严重错删掉那条，标题或导读有严重错、或一条要点都不剩，不进精选（`held`）；删了原句里的国家名的修改不采用。代码在框架里：`packages/backend/src/editorial/check.ts`（新文件）、`analyze.ts` 的挂钩和入选判断（`!held`）、`models.ts` 的 `check`、`jobs/content.ts` 的 `check_item` 一步；提示词 `industry/prompts/check-item.md` | 10-23 盲核里模型写的标题、导读、要点有事实错（数字、谁说的、举例写成真事），原版没有核对这一步 | 十一 10-23 定（决定记录「条目页定为三段」那几条）。**放在框架里不合理**（Kay 10-24 问「核对员为什么要改框架」）：框架在「写完」和「定入选」之间没有模块插口，当时直接写进了框架；十一 10-24 定改成框架加一个通用插口、核对员搬进模块，排在「读者为什么想点开」修完 check.ts 之后 |
| 条目和卡片 | 读者看不到 AI 评分（`ITEM_COPY.showScore`）；理由叫「原文要点」（`reasonLabel`，10-23 起叫「要点」，同日晚改为「原文要点」，写明内容出自原文、和我们写的导读分开，十一定；之前叫「收录理由」，见下面「要点」一行）。都是原版选项 | §3.1「不打分」 | Claude 10/4 定，没有用户原话（用户 10/5 21:25 反而问过「左侧像AIHOT放日期时间右侧放AI评分？」；10/5 10:51 用户自己说的是「AI导读和推荐理由」，即原版的叫法）；10/6 清理时按清理授权保留。**10/10 复核后保留**（用户：「全部你思考 你决定」）：最近 30 天入选的 121 条中位数 60 分、26% 低于 50 分、70 分以上只有 12%（本站门槛 40，原版 60–76），显示出来时入选条目旁边的「41」读起来像不及格，原版 70 分以上的强调色近九成用不上；「推荐」是替内容担保，违反 §3 第 1 条，「收录理由」只说我们为什么收 |
| 导航 | 不放热点榜和主题（`site.ts` 的 `NAV.hidden: ["/hot", "/topics"]`）。**10/10 起是原版的选项**（#120 作者 10/9 合并），隐藏后电脑侧栏、手机底栏、「我的」页都不放，页面照样能打开，事件页、主题页的返回和链接改回精选 | 热点榜 10/6 线上是空的：要几家来源同时讨论同一件事，本站的来源还凑不出来；主题页各主题只列最近的精选，多数是几天到几年前的旧条目。有内容了就删掉对应的一项 | 热点榜：10/3 用户「热点榜是不是可以改成攻略合集之类的？」；10/6 清理授权。主题：10/4 Claude 逐页检查时定（归档 HANDOFF-2026-10-04.md §9「线上网站逐页检查」写明「改法 Claude 定」）；用户 10/5 21:25 问过「我们是不是少了主题这个页面？」；10/9「再次确认」出自云端会话，原话未存 |
| 手机筛选 | 一排左右滑动的选项（`FEED.phoneFilter: "row"`，框架加的选项，默认 `"sheet"` 不变） | 用户 10/6 直接提出 | 10/6 |
| 日报 | 收当天列在「全部」里的每一条（`REPORTS.dailyScope: "pool"`，框架加的选项，默认不变）；版式和篇幅（12 条写全、10 条简讯）照原版，写全的位置只给有入选报道的事（10/9 读者审查：弱条目占了写全的位置，入选的好条目挤进简讯）；只改日报，周报、月报报头的「N 条精选」仍只数入选的。连带的效果：头条可能是没入选的条目，它的条目页没有收录理由 | 用户 10/5：「不管是什么餐饮消息都有人在意，问题是日报怎么选出来」 | 10/5 |
| 写作 | 本站的不用词清单 `industry/wording.ts` 和改用词提示词 `industry/prompts/mend-wording.md`（多一句「整句删去」）。改用词这一步 **10/10 起是原版的**（#121 作者 10/9 合并），原版的词表是空的 | §3 第 5 条；10/5 有 64/166 条用了「讲」，只靠提示词挡不住 | 10/5 |
| 条目页 | 每个条目页都只有三段：标题、AI 导读、原文要点。三段下面只多一行：条目已写成参考库故事的，放一条「收在 MYFNB 参考」的链接，指向它所在的情况页（用故事页原有的 `WhereFiled`）；其余条目下面什么都不放。框架只加一个通用插口 `WebModule.itemPart`（`apps/web/app/modules.ts`、`site-modules.ts`、`routes/item.tsx`），照框架文档「插口不够用时加一个通用的插口」，模块的一块是 `modules/reference/web/item-part.tsx`。**10-24 以前**三段下面还有「正文 · AI 整理自原文」：故事整篇贴在这里，其他条目另写一篇正文（`backend/body.ts`，300–900 字）。10-24 起两样都不显示：故事只在参考库里读；已写好的正文留在 `reference_bodies` 表里，不删，要恢复就把 `read.ts` 的 `readItemText` 和 `item-part.tsx` 改回这次改动以前的样子（`git log -- modules/reference/web/item-part.tsx` 找到「条目页统一成三段」那个提交，取它的上一版）。新正文从 10-18 起就停写了（`server.ts` 的 `BODIES_PAUSED`） | 一个页面原来有三种样子（10-24 线上最近 160 条：65 条下面贴着故事，32 条贴着正文，63 条只有三段）；正文越接近原文全文，版权风险越大；三段本来就是让读者不点原文也知道讲了什么 | 三段：十一 10-23 定（手册决定记录「条目页定为三段」）。撤掉正文：Kay 10-24「只保留一种」，十一 10-24 定 |
| 一手 | 报头不显示「N 件一手发布」（`REPORTS.metricUnits.firstPartyEvents: null`），筛选里没有「一手」（`FEED.firstPartyFilter: false`），都是框架加的选项，默认不变 | 本站的一手发布多是行业协会，报头常是「0 件一手发布」，筛选两周只筛出 3 条；对餐饮读者是费解的词 | 10/9 |
| 日期 | 往年的日期写出年份（「2019年2月19日」，按北京时间判断是不是今年；`apps/web/app/lib/format.ts` 的 `monthDay`，框架错误修正，测试 `apps/web/tests/feed-dates.test.ts`） | 原版的错：存档补进来的旧条目在日期分组里只写「6月3日」，读者会以为是今年 | 10/9（用户「你决定」；可提给作者） |
| 来源的叫法 | 「另有 N 家…报道」写「来源」不写「信源」（`ITEM_COPY.sourceWord`，框架加的选项，默认「信源」不变；列表卡和日报两处） | 「信源」是新闻行业的说法，开店的读者未必看得懂；「来源」是日常用语，条款和隐私说明也写「来源」（两份都没有「信源」）。10/6 随框架换回时丢过一次。代价：作者的网页测试按「另外 N 家也报道了」找按钮，合并上游时要改成本站的说法（10-23 有 4 条） | Claude 定（10/9 用户「你决定」）；此前写的「用户 10/4 确认」找不到原话。10-24 复核保留（Kay：「你们思考吧」，十一定） |
| 存档 | 框架没有的功能，做成模块 `modules/archive`（已启用：`site/modules/index.ts`、`server.ts`，`site/package.json`、`Dockerfile` 各一行；没有网页部分）：按挑选名单（`picks.json`）导入播客和博客的旧单集、旧文章，作为回补条目走正常流程（不进日报，进参考库）；给播客单集转文字：订阅里有现成文字稿（`podcast:transcript`）的直接读，没有的把音频交给 Groq 的 Whisper（`GROQ_API_KEY`；10/10 以前用 Gemini，实测会漏掉一半内容，已换掉），10/9 起也给等待中的新单集转写（`backend/transcribe.ts`） | 作者 10/4 起默认首次导入后不收存档；本站要的店家经验多在旧节目里，只有简介的单集写不成故事（§9.2 第 4 项） | 用户 10/5 05:53「同意打开存档 然后你先试试 看可以跑多少」；随后（10/5 早上）「我觉得你可以扫一眼 看看哪些值得收集 才来花deepseek余额」，改为逐集挑 |
| 访问计数 | 反向代理 Caddy 多记一份访问日志（`deploy/Caddyfile`，框架的文件）：只记时间、路径、状态码和“是不是机器人”，不记 IP、请求头、查询串；`myfnb/visits.sh` 按天按类统计。不装脚本、不改网页 | §2.4 要看哪些情况被查得多；原版没有；不识别个人。原文链接被点几次没做（外链直接跳出，要数就得在网页里加脚本，偏离原版；搜索点击和国家用 Search Console） | 十一 10/13 按 Kay 授权（决定记录 L366）加，Kay 未逐项确认 |
| 域名转址 | `deploy/Caddyfile` 把站点块写死成 `www.myfnbguide.com`，`new.myfnbguide.com` 原路 301 到 www，加根域 `myfnbguide.com` 转到 www 首页的块，和旧站路径名单（`/handbook`、`/map`、`/appendix` 等旧站独有的几组）301 到首页 | 上线切换（§10 第 1 步，`go-live-checklist.md` 第 2 步）；名单取自旧站 sitemap（10/17，155 个地址），`/about`、`/sources` 新站有同名页，不转 | Kay 在 §10 定了旧网址要转到新站；10/17 Kay「开始」换正式网址 |
| GitHub 检查里的网页测试 | `.github/workflows/check.yml` 把网页测试从 `check` 搬到单独的 `web`，在 Playwright 官方镜像里跑（镜像版本从锁文件读，跟着 `@playwright/test` 走），不再在 runner 上 `playwright install --with-deps` | 那一步要从 runner 的 apt 镜像下 142 MB 系统库，10-23 好几次只有几十 KB/s，`check` 到 25 分钟被取消（#46、#47、#48、main），服务器的 `update.sh` 把取消当失败、不部署 | 十一 10-23 定 |
| 云端运维 | 服务器多一把只给 GitHub 用的密钥，限死只能跑守门脚本 `myfnb/ops/gate.sh`（看状态和日志、跑已合进 main 的 `myfnb/` 脚本、只读账号 `myfnb_ro` 查库）；Kay 跑一次 `myfnb/ops/install.sh` 装上。发命令的工作流在私有仓库 coresystemstudio 的 `.github/workflows/myfnb-ops.yml`（本仓库公开，日志谁都看得见）。框架代码不动 | 云端会话连不了 SSH（出站只走 HTTPS 代理），服务器上的活原来只能在 Kay 电脑上做；Kay 要「全部搬上云端」 | Kay 10-16「你决定吧」，十一定（公司手册决定记录 L457） |
| 分享图字体 | 框架的 `packages/backend/src/media/og.ts` 读 `assets/og-fonts/` 里另加的 `<名字>-400/700.ttf`，Noto Sans SC 缺的字由它们补；本站加了两组（`noto-sans-cjk-extra`：繁体、日文汉字和假名、拉丁扩展；`noto-sans-kr-hangul`：韩文），约 12MB。没有另加文件时和原版完全一样（缓存键也不变） | 原版字体只有 GB2312 加基本拉丁：10/16 线上故事和来源名里有 154 个字画不出来（营業、飲、Ç、ü、韩文），日本、港台、欧洲来源的分享图缺字。原版没有现成做法；代价是框架多 10 行，可以提给作者 | Claude 定（Kay 10/16「你决定」，十一知会） |
| 情况页做法卡 | 一张做法卡先列 4 家，其余收在「另有 N 家的做法」后面，开关照原版 ReadingGroup 的样子（12.5px、灰、带下箭头）；电脑上摘要限宽 34em | 各家的做法正是这一页的内容；原版收起来的是同一条新闻的重复报道，没有现成的「同一件事的多家做法」，只借它的开关样子 | Kay 10/17 选方向 A（决定记录 4557a43，十一转达） |
| 要点 | 原版的推荐理由换成 2–5 条要点：用自己的话写原文说了什么（具体做法、数字、结果），观点写明是谁说的，有争议两边都写；导读照原版摘要规则写 2–3 句（`rules-answer-first-summary.md`），本站只加两条：导读不把标题再说一遍，要点不把导读再说一遍（10-23 21:14 起；之前缩成一句，Kay：「标题和AI导读重复了……AI导读应该完整点 有头有尾」）。要点按行存在原来的理由字段里（`\n` 分隔，上限 600 字），条目页、卡片、Markdown、推送、Agent 出口按行显示（`site/site.ts` 的 `reasonLines`）；条目页把要点放在主栏、所有宽度都显示，右栏只留判断。提示词：`content-understanding.md` 的「要点」一节、新的 `rules-lead.md` | 原版的推荐理由是「指向原文」的，能这样写是因为原版同页就有全文译文；本站全部来源都不放全文（`site_fulltext` 关），照抄等于叫读者点出去才知道说了什么。目的是读者看完本页就知道原文讲了什么、和自己有什么关系（决定记录 2026-10-23 一条） | Kay 10-21 提出（「收录理由换成要点」「标题没有吸引力」），10-23「你们决定」；十一和讨论串 10-23 定，样本两轮对原文核过；上线前模型试写 20 条盲核，严重 ≤1 |
| 十一说 | 每天 05:00（北京时间）读前 24 小时列进「全部」的每一条，写一期十一说（`modules/reference/backend/issues.ts`，存 `reference_issues`）；08:00 日报的头条位放它：原版的「头条」小标题换成「十一说 · 第 N 期」，标题链到这一期的页面，摘要下面一行「读全文」，原本的头条照常留在看点和分区里。框架加一个模块插口 `dailyLead`（`packages/backend/src/modules.ts`，没有模块提供时日报照原版）和头条的两个可选字段 `kicker`、`href`（`ReportPaper.tsx`）。一期的页面 `/reference/issues/:no` 照参考库故事页的框架（返回、标题区、侧栏、正文标签、来源行），正文是念出来的样子，〔n〕链到「原文出处」 | 原版日报只有规则挑的头条，没有一篇读完当天全部收录的综述；Kay 10-18 13:22 定「每天放在 08:00 日报最上面」，10-20 定「直接公开上线」 | Kay 10-18、10-20（十一 10-23 照这两条接上，见手册决定记录 L779、L786） |
| 十一说 · 听 | 十一说的页面多一个「听 · N 分钟」按钮（手机在顶栏分享左边，电脑在右栏分享上面，样子照分享那颗按钮），点了在页面底部出现播放条：进度线（可拖）、播放/暂停、「十一说 · 第 N 期」和时间、速度（1.0/1.25/1.5/0.75）、关闭；离开这一页就停（`modules/reference/web/listen.tsx`）。音频不在服务器上做（服务器 4 GB 装不下声音模型），做好后用 `myfnb/issue-audio.sh` 放进数据卷 `/data/reference/audio/<期号>.mp3` 和 `.json`（秒数），接口 `/api/reference/issues/<期号>/audio.mp3` 支持分段读取（Safari 不支持就放不了）；没有音频的期不出现按钮 | 原版没有音频；Kay 要一个能听的版本（10-23「像念稿」那一轮之后要听稿），按钮和播放条是模块自己的，用网站的颜色和尺寸 | Kay 10-23 在设计稿选方向 B（顶栏「听」+ 底部常驻播放条，https://claude.ai/artifact/2LWc3rjqtxNqJxPF9m2PqR）；声音 10-23 选「知性女主播」，第 1 期音频等 Kay 听过整期再放 |
| 条目页标签 | 条目页（右栏和手机版）的 # 标签去掉两类：分类标签（政策/法规、平台动态等，就是日报的分节），和已经由主题表示的标签（`industry/topics.json` 里该主题的 tags，例如主题「外卖与平台」就不再列「#外卖/平台」）。只改显示（`apps/web/app/routes/item.tsx` 的 `shownTags`），标签数据、筛选、API 照旧；`industry/package.json` 多导出 `topics.json` 给网页读 | Kay 10-21：「下面的 # 很多重复的标签」。10-22 巴西 Keeta 那条 7 个标签里 3 对是同一件事。原版的主题和标签各列一遍，本站的主题正是由标签组成，所以重复 | Kay 10-21 提出；十一 10-23 定做法 |

**10/10 已经合进原版、从本表删掉的**：手机顶栏的返回文字（#171）、第一期日报以前的周和月不算到期（#170），作者 10/9 夜合并，本站 10/10 早上合并上游 `18ddc7b` 后用的就是原版。

**10/6 清理时改回原版的**（以后要再做，先按上面五关重新审核、找用户确认）：首页改成参考库（`NAV.home`）、资讯默认全部（`FEED.start`）、栏目改名（`NAV.labels`）、主题不进导航（10/9 已加回，见上表）；日期加空格（`DATES.spaced`）、641–960px 铺开（`LAYOUT.fluid`）、程序补空格（`READER_SPACING`）；日报的分节简讯、看点门槛、简讯不限条数、报头数字不显示一手（`flashPlacement`、`compactBelow`、`dailyFlashes`、`metricUnits`；其中报头不显示一手 10/9 已加回，见上表）；收藏备份（`STARRED`）、关于页的参考库规模、参考库的搜索和条目页附加块（模块插口 `figures`、`searchPart`、`itemPart`；其中 `itemPart` 10/9 已加回，见上表）；列表类来源的关键词过滤（`allowKeywords`，没有信源在用；综合媒体要用时从 `a2f7397` 取回）。随 `apps/` 整体换回、清理时没逐项记下的（10/9 复核补记）：来源的叫法（`sourceWord`，用户 10/4 确认过，读者现在看到原版的说法）、筛选名（`filterNames`）、搜索的排序说法（`SEARCH.sorts`、`sortNote`）、关于页和 Agent 页的版式与示例（`ABOUT.page`、`AGENT.covers`、`examples`）、反馈页标题、还没有一期时的说法（`noIssue`）、隐藏热点时 MCP 不提供热点工具、往年日期写出年份（`8f927ec`）、触屏 44px、侧栏名字折行、错误页标题字号。其中**往年日期写出年份**和**来源的叫法** 10/9 已加回（用户：「你决定」），见上表。

## 3. 改了 `industry/`、`site/`、`modules/`、`myfnb/` 以外的文件

快照 10-24（合并上游 `b3998dc` 以后）。重新生成：`git fetch upstream && git diff --stat upstream/main HEAD -- apps packages scripts docs database Dockerfile deploy .github package.json tests`。框架和作者上游的差别只有下面这些，每一处对应清单里的一行；对不上的就是清单漏了，或者是该改回原版的。合并上游时只有这些文件可能冲突。

| 文件 | 改了什么 | 清单哪一行 |
|---|---|---|
| `Dockerfile` | 装上本站的模块（参考库、存档） | 参考库、存档 |
| `apps/web/app/modules.ts`、`site-modules.ts`、`routes/item.tsx`、`docs/architecture.md`、`apps/web/tests/item-parts.test.ts` | 通用插口 `itemPart`：模块在条目页三段之后放一块（本站只放「收在 MYFNB 参考」的链接） | 条目页 |
| `apps/web/app/routes/item.tsx` | 条目页的 # 标签去掉分类标签和主题已经表示的标签（`shownTags`）；要点放在主栏 | 条目页标签、要点 |
| `apps/web/app/features/feed/Filters.tsx`、`routes/home.tsx`、`routes/all.tsx`、`docs/customize.md`、`apps/web/tests/phone-shell.test.ts` | `FEED.phoneFilter = "row"`、`FEED.firstPartyFilter = false` 两个选项 | 手机筛选、一手 |
| `apps/web/app/features/report/format.ts` | `REPORTS.metricUnits` 里写 null 的数不在报头显示 | 一手 |
| `packages/backend/src/reports/edition.ts`、`tests/report-pool.test.ts` | `REPORTS.dailyScope = "pool"`：日报收「全部」里的每一条 | 日报 |
| `apps/web/app/features/feed/ReadingGroup.tsx`、`features/report/ReportPaper.tsx`、`apps/web/tests/page-width.test.ts`、`timeline-unread.test.ts` | 「另有 N 家…报道」用 `ITEM_COPY.sourceWord`；两个测试按本站的说法找按钮 | 来源的叫法 |
| `apps/web/app/lib/format.ts`、`routes/story.tsx`、`routes/topic.tsx`、`apps/web/tests/feed-dates.test.ts` | `monthDay` 对往年的日期写出年份，几处改从 `lib/format.ts` 引 | 日期 |
| `apps/web/app/features/feed/FeedItem.tsx`、`packages/backend/src/publication/agent.ts`、`publication/detail.ts` | 理由字段按行显示要点（`reasonLines`），Agent 出口的说明改成「说明原文讲了什么」 | 要点 |
| `packages/backend/src/modules.ts`、`reports/compose.ts`、`publication/reports.ts`、`packages/contracts/src/site.ts`、`features/report/ReportPaper.tsx` | 模块插口 `dailyLead`，日报头条的可选字段 `kicker`、`href` | 十一说 |
| `packages/backend/src/editorial/check.ts`、`analyze.ts`、`models.ts`、`jobs/content.ts`、`tests/check-item.standalone.test.ts`、`tests/analysis-steps.ts` 等 | 核对员（要搬进模块，见清单那一行） | 核对员 |
| `packages/backend/src/media/og.ts` | 读 `assets/og-fonts/` 里另加的字体补字 | 分享图字体 |
| `deploy/Caddyfile` | 访问日志；站点块写死 www、根域和旧站路径转址 | 访问计数、域名转址 |
| `.github/workflows/check.yml` | 网页测试放进 Playwright 官方镜像里跑 | GitHub 检查里的网页测试 |
| `tests/wording.test.ts` | 本站的不用词清单 | 写作 |
| `tests/` 里其余二十几个文件、`apps/web/tests/navigation-performance.test.ts`、`web-server.ts`、`cache.test.ts` | 作者按 AI 示例行业写的类别、标签、公司改成从行业包取 | 不是产品差别：同步上游时照同一原则处理作者的新测试 |
| `scripts/smoke.ts` | 注释里的例子名 `MyF&B` 改成 `A&B` | 不是产品差别（作者的注释用了本站旧名） |
