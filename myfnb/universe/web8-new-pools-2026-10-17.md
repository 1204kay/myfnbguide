# MYFNB 新信息源：还没挖过的几块（2026-10-17）

> 十一派的讨论串做的（Kay：「信息源呢 要不要单独开一个讨论串 寻找」；原则「越多越好，但宁缺毋滥」）。
> 规则照 `myfnb/HANDOFF.md` §5.4 六条；请求都用 MyFnBBot/1.0，先读 robots，同一主机间隔 1.3 秒以上，没用代理。没有接入任何来源，没有改服务器和库。
> 以前已经做到底、这次不重做的：Podcast Index 整库 474 万个订阅（`universe/podcasts-*.md`）、日本店主博客名录 12,822 个（`web6`）、已接来源的外链 2,611 个（`web7`）、政府与协会新闻、行业媒体、服务商博客（`web1`–`web5`）。

## 一、结论

| 块 | 结论 | 能补多少 | 依据 |
|---|---|---|---|
| **note.com（日本）** | **可用，最大的一块** | 写自家店经过的店主账号估计以千计，在更新的几百个 | 见第二节 |
| ミラサポplus 事例ナビ（日本政府） | 可用，一次性存档 | 餐饮 35 篇，实在的约 18 篇，强约 5–8 | PDL1.0；robots 写 `ai-input=yes`；有公开 JSON 接口，全集 2,286 条 |
| SBA Success Stories（美国政府） | 可用，一次性存档 | 餐饮约 45 篇，多为「一般」 | 公有领域；legacy.sba.gov 可能下线，要早做 |
| 播客全集里还没看过的（允许的平台） | 可用的 3 个 | Feeding Your Passion（14 集，店主访谈）、Say Grace（54 集，偏名厨，一般）、Spiga Divulga（西班牙小面包作坊，顾问讲真实案例，一般） | 63 个没看过的读了订阅；29 个订阅已搬走 404 |
| 4 个小播客平台：podcaster.de、Springcast、Julep、podster.fm | 平台可用 | 在更新又对路的只有个位数 | 条款只约束开户的人；接前逐个查节目方条款 |
| stand.fm、Voicy、podcastmachine、Async、iono、podserve、pod.co、Audiomeans、sounder | 不可用 | — | 条款禁营利或约束访问者；或音频主机 robots 全拒；sounder 已停 |
| GOV.UK、business.gov.au 案例、议会证词 | 不值得 | 真店少，多是拨款公告和政策意见 | |
| 香港 SUCCESS、新加坡、国会图书馆口述 | 不可用 | — | 只许非商业或商用要先同意 |
| 中小企業庁白書、台湾中小企业署、马来西亚 SME Corp、韩国 semas | 读不到 | — | 对本站标识 403、Cloudflare 或 robots 全禁（规则 6 不绕） |
| YouTube、Reddit、Facebook、LinkedIn 等 | 不投入（不变） | — | 平台条款整体不允许，`plan-2026-10-10-sources.md` §3.3 |

内容强、只因条款不能用、值得进征求同意名单的（新增）：
- **The Hot Slice**（Pizza Today 的播客，332 集，约一半是披萨店老板讲自己店）：托管 Buzzsprout 可用，但出版方 Emerald X 的条款写「personal, non-commercial use only」，禁止 scraper。
- **J-Net21 取組事例**（日本中小機構）：餐饮约 15–20 篇，有强稿（麺や輝：开业费几百万日元全自己出）；条款「未经事先承诺不得再利用」。
- **Southern Foodways Alliance 口述**（美国）：约 180 篇餐馆老板口述，© 没有开放许可。
- **日本政策金融公庫 生活衛生だより**：约 50 篇餐饮案例，商用要先问广报部。
- RAW（Lightspeed 出品，澳大利亚店主访谈）：Lightspeed 著作权准则禁止衍生作品，账本 v1011-lightspeedhq-fr 同一结论。
- pod.co、Audiomeans 上十几个题材强的节目（Nory「What's Cooking?」等）：音频主机 robots 全拒，只能逐个要同意。

## 二、note.com 细节

- **robots**（10/17 复核）：对 `*` 禁 `/api/*`、`/search`、`/*/archives`、`/*/magazines` 等；**`/*/rss` 只对 Googlebot、bingbot、Yeti 禁，对 `*` 不禁**；文章页和 `/tag/<名>` 允许。没有点名 AI 机器人。
- **条款**（「note ご利用規約」2026-10-07 版，从 `terms.help-note.com/api/v2/help_center/ja/articles/44943817565465.json` 读，规约网页对机器开了 Cloudflare 验证）：约束一切利用者，包括不注册的「ゲストユーザー」。禁止事项里和本站有关的是：未经创作者承诺，不得「複製…公衆送信…改変、翻案する等、購読契約の範囲を超えて利用」；不得规避技术措施。**没有禁止爬虫、自动抓取、AI、商业使用的句子**，按规则 4 属于通用的「不得转载」。
- note 自己的帮助页欢迎 AI「参照」，把「学习」交给创作者选择；本站不训练模型。
- 抽 8 个账号，5 个是很强的「一家店的经过」：komo_rita（寿司店第 7 年，开业资金 1,900 万日元、开业三个月月商 33 万）、murata_kazunori（金泽便当店，开 3 年 8 个月每年黑字后转让，写了转让全记录；10/17 复核 RSS 200）、hokutomuto（大阪炸虾店，每周一篇到第 411 回）、hamajimaya（国立的咖啡店三周年全记录）、yamanoshokudo（两人开食堂的连载）。
- 取全集：话题页（飲食店経営 32,271 篇、カフェ経営 9,235、個人店経営 等）每次只给 50 篇热门，翻页要走被禁的 `/api/`。做法是每天读十来个话题页攒作者，逐个看标题挑店主，挂 `https://note.com/<id>/rss`。
- 条件：只读免费部分（很多店主文章是部分付费）；RSS 只给最新 25 篇的开头一段，正文从文章页的免费部分取；部署后看服务器是否被挡（规则 6）。
- 「翻案」有两种读法。十一按最低风险定（Kay「你直接把风险降到最低」）：note 来源的条目和参考库故事只写事实、数字和经过的要点，不按原文的叙述整篇重写；写得多的店主另写信征求同意。

## 三、接入计划（等 Kay 点头后做）

1. **note**：先挑 10–20 个店主账号（标准同以前的店主播客：最近标题里多数是自家店的经过），每个建完整档案，进 `sources.json`；部署后 30 分钟查服务器是否被挡。之后每周用话题页补一批。
2. **ミラサポplus、SBA**：用存档导入（只取餐饮店那几十篇），各一次。
3. **Feeding Your Passion、Say Grace、Spiga Divulga 和 4 个小平台上在更新的几档**：逐个建档案，过了的和 note 第一批一起接。
4. **征求同意名单**：把上面 6 个加进 `.data/permission-letters-*`，信写好，由 Kay 的邮箱发（发不发是 Kay 的事）。
5. 每一步记账本；29 个搬走的播客订阅另找新地址，找到的按同样做法看。

## 四、可以重跑的东西

- 播客没看过的 63 个：从 `C:\myfnbguide\.data\universe\podcasts-judged.csv` 取 A/B/C、平台允许、账本和 sources.json 里没有、≥5 集的行。
- 小平台条款逐个的依据（接入时写进账本平台行）：
  - podcaster.de：www.podcaster.de/agb §1、§3 只约束注册用户；子域 robots 302 到首页（等于不限制）。
  - podster.fm：podster.fm/agreement §2.2 协议在 Администрация 和 Пользователь 之间，对未注册访问者不设义务；robots 空 Disallow。
  - Springcast：springcast.io/en/legal/terms 链到 NLdigital Terms，B2B 合同；robots 空 Disallow。
  - Julep / Audiorella：audiorella.com/allgemeine-geschaeftsbedingungen/ §1、§2.2 约束开户客户；节目页子域名过长打不开，原文链接要用节目方网站。
  - stand.fm：legal.stand.fm/terms 第 7 条(10) 禁止未经同意以营利为目的利用，约束一切用户。
  - Voicy：没有公开订阅；リスナー規約 5.3(11) 禁止用于生成 AI 学习。
  - podcastmachine.com：terms-of-use「By visiting this website」，内容 personal use only。
  - podcastle.ai（Async）：async.com/terms 约束 guests，不得 download、create derivative works。
  - iono.fm：legal-general-terms 约束 all general end-users，personal use only。
  - podserve.fm：robots 禁 `/episodes/`（音频路径）。pod.co：downloads.pod.co 对 `*` 全拒。Audiomeans：audio.audiomeans.fr 对 `*` 全拒。sounder.fm：已停服务。
  - 没读的：radiotalk.jp（8 行）、listen.style（4 行）。
