# 来源全集调研笔记（2026-10-10）

> 两个子代理 10/10 下午的调研原文，供 `plan-2026-10-10-sources.md` 使用。上半是「别人怎么做、人这一类来源的全集、规则下扩大可用量的办法、规模依据」，下半是「七类来源的名录」。每个数字标了实测、读页、转述或没有验证；读过的网址列在各自的末尾。下载的数据在本机 `c:/tmp/universe-dl/`（播客整库 5.1GB、美国国税局名册、GDELT 来源清单），不在仓库里。Claude 10/10 在播客整库里复核过的数字写在计划第 3.1 节。

---

# 来源全集：别人怎么做、全集在哪里、有多大（调研，2026-10-10）

只读调研，没有改项目文件，没有下载大文件。写法约定：

- 「实测」= 这一轮自己发请求读到的数字或原文（文末有地址）。
- 「转述」= 经搜索结果或第三方文章读到，没有打开原始页面。
- 「没有验证」= 这一轮没有读到，不能当依据。
- 条款页多数是用网页读取工具取回后摘出原文片段，不是逐句全文阅读。**本文只给条款的大方向；接入任何平台以前仍要按 HANDOFF §5.4 全文逐句读。**

---

## A. 别人怎样建立和维护来源全集

### A.1 对照表

| 项目 | 全集从哪里来 | 多大 | 怎样筛 | 怎样保持更新 | 出处 |
|---|---|---|---|---|---|
| **Podcast Index** | 开放的播客订阅索引；提供按订阅地址和 Apple 编号登记的接口（`/add/byfeedurl`、`/add/byitunesid`）和托管商推送更新的接口（`/hub/pubnotify`） | 4,738,667 个订阅；近 90 天有更新的 466,693 个，近 30 天 340,751 个（实测，官网统计接口 10/10） | 不按题材筛，全部收；连续出错的标记为 dead，整库下载里只放没有标记 dead 的 | 持续抓取；整库文件接口文档写「Updated daily」，实测文件的修改时间是 10/03，第三方文章说每周更新（两种说法有出入） | podcastindex.org、接口文档 pi_api.json、James Cridland 2026-06-16 的文章 |
| **Listen Notes** | 自己抓取的播客库，自述收「（几乎）全部可公开访问的 RSS 播客」 | 3,821,596 个播客、195,384,641 集（实测，页面写截至 2026-10-09） | 「全天候的自动脚本加人工审核」，剔除已删除的、质量很低的、不是音频的订阅；并说别家把这些算进去所以数字更大 | 持续抓取；每年新增数量公开（2020 年 102 万、2021 年 75 万、2025 年 21 万） | listennotes.com/podcast-stats |
| **GDELT** | 自己的全球新闻监测；公开的是「来源域名—国家」对照表，不是完整名单，文章自己说有很多来源不在表里 | 2015–2021 对照表里有 162,737 个不同域名、516,655 行（实测，下载该文件数出来的；文件 11.8MB）；2016 年一篇论文数到 63,268 个域名（转述） | 不靠人工归类国家：统计每个域名的报道里提到最多的国家，取前五个，作为「可能的所在国」 | 对照表隔几年用 BigQuery 重算一次；新来源怎样加入，读到的文章没有写 | blog.gdeltproject.org/?p=14261 |
| **Media Cloud** | 先整批导入现成的名录（ABYZ News Links，按国家和地区编排的新闻网站目录），再由团队和各国合作者核对、补充（转述其 2020 年的文章） | 目录里 60,000 多个新闻来源（转述）；故事超过 18 亿篇（实测，2026 年 ICWSM 论文摘要） | 来源的定义：「定期发布新闻内容的独立域名」；一般网站、垃圾站、机构自己的网站不收；标准「按每个研究项目主观掌握」。每个国家一个「全国」集合，下面按州、省分集合。「已核实」= 核对过确实报道该地，并且订阅在正常进文章 | 每个来源挂 RSS 和 Google News 站点地图两种订阅；集合可以用一份 CSV 成批更新；停更的来源保留、不删除 | mediacloud.org/documentation/source-guide；ICWSM 2026 论文 |
| **Common Crawl** | 每月一次的全网抓取，全部公开 | 2026 年 8 月一轮：21.4 亿个网页、4,020 万个主机、3,310 万个注册域名（转述其公告）；2026 年 7–9 月的链接图：245,776,589 个主机、133,241,980 个域名（实测，graphinfo.json） | 不筛题材。提供三样可用来找来源的东西：① URL 索引（Parquet 列存，有 `content_mime_detected`、`content_languages` 等列，可以按「检测到的类型是 RSS 或 Atom」取出全部订阅地址）；② 主机级和域名级链接图（谁链接谁，带排名）；③ 单独的 robots.txt 子集 | 每月一轮，链接图每三个月合并发布一次 | commoncrawl.org、index.commoncrawl.org |
| **Feedly** | 用户订阅过的全部订阅源 | 自称「4,000 万个来源、2,000 个主题、50 个行业」（转述，应用商店介绍，日期不明） | 用模型把来源归到约两千个英文主题，输入主题就列出相关来源和相近主题，并显示订阅人数、更新频率、与主题的相关度 | 随用户添加而增长 | blog.feedly.com/leo-discovery（转述） |
| **Inoreader** | 用户订阅的公开订阅源，加编辑整理的合集 | 2023 年 4 月：8 个大类、100 多个编辑整理的合集（转述）；总数没有公布 | 编辑挑选合集；搜索时给出「#主题」 | 没有读到 | inoreader.com 博客（转述） |
| **Techmeme** | 创办人手工挑一份种子名单，系统按「找更多像这些的网站」自动扩展；一个新网站要进来，需要已经在名单里的网站链接它（转述 2007–2011 年的访谈） | 自述「数千家」（实测，关于页） | 自动发现加编辑定稿：「editors make final calls」；创办人否认有白名单，说每天都有他没听过的网站出现 | 名单随链接关系实时变化；公开来源和作者的排行榜 | techmeme.com/about；TechCrunch 2011、Search Engine Land 访谈（转述） |
| **Medill 美国地方新闻普查**（学术） | 合并现成名录：50 个州报业协会的会员名单、Editor & Publisher、SRDS、发行量审计机构的数据，再逐个核对 | 约 6,000 家地方报纸、1,100 家公共广播、1,000 家族裔媒体、12,000 多个数字站点（转述 2025 年方法页） | 按「是否提供本地的关键信息」人工判定 | 每年重做；公开承认有遗漏、重复和错误，请读者指出 | localnewsinitiative.northwestern.edu 方法页（转述） |
| **博客圈测绘**（学术，Berkman 中心 2009 年阿拉伯语博客研究等） | 从种子博客出发，沿友情链接和文内链接滚雪球，用深度控制规模 | 基础网络约 35,000 个活跃博客，取互链最多的 6,000 个画图，人工编码 4,000 多个（转述） | 链接分析加词频分析加人工编码；Issue Crawler 的做法是「共同被链接」：被两个以上种子同时链接的才收，目的是题材相关而不是总体热度 | 一次性研究 | cyber.harvard.edu；WWW 2006 论文（转述） |
| **Homepage2Vec**（学术，EPFL，ICWSM 2022） | 人工编辑的多语言网站目录 Curlie（DMOZ 的后继） | 训练数据 200 多万个网站、92 种语言、14 个类别（转述，早期版本写 100 多万） | 只读首页（文字、元标签、外观）就给网站分类；宏平均 F1 0.90（转述）；后续工作用大模型给 1 万个网站标注来改进 | 模型和数据公开 | ojs.aaai.org/index.php/ICWSM/article/view/19380（转述） |
| **Kagi Small Web** | 公开的 GitHub 名单，任何人提交，规则写在仓库说明里（提交自己的网站必须同时提交两个别人的） | 41,658 行个人博客订阅，另有 260 个 YouTube 频道、414 个漫画（实测，10/10 数的行数；仓库 10/09 还在更新；MIT 许可） | 只收英文、个人、一年内有更新、没有广告和弹窗、不是自动生成的 | 靠提交和删除请求 | github.com/kagisearch/smallweb |
| **AIHOT（本项目的框架）** | 作者没有公开选源方法和名单。README 原话：「我不懂你们的行业，不知道哪些信源有用」「里面没有 AIHOT 的信源名单和运营数据。仓库带了 18 个公开的海外 AI 资讯源做示范」 | 作者自己的站 853 个信源，其中 X 账号 513 个（HANDOFF §12，10/1 的记录） | 框架提供的是手段：六种信源类型、三级分级、后台试抓、按近 7 天产出自动调抓取频率、连续失败标红、每周信源周报。`docs/customize.md` 只说「中国大陆的很多行业，一手信息在公众号上」 | 同上 | 本地 README.md、docs/sources.md、docs/customize.md |

### A.2 小结：别人的做法里共同的几条

1. **没有一家是靠关键词搜索建全集的。** 全集有三种来法：整批导入现成的名录或整库（Media Cloud 导入 ABYZ，Medill 合并协会名单，Podcast Index 和 Common Crawl 自己就是整库）；从种子沿链接扩展（Techmeme、博客圈研究）；开放提交（Kagi、Podcast Index）。关键词搜索只在第二步用来给已经拿到手的全集分类。
2. **先拿全集，再在本地分层筛。** Listen Notes、Media Cloud、GDELT 都是先全部收下，再用规则、模型和人工核对分类。分类可以自动做：Homepage2Vec 只读首页就能分 14 类，GDELT 用报道内容推断国家，Feedly 用模型归主题。
3. **种子的质量决定扩展的质量。** Issue Crawler 的要求是被两个以上种子共同链接才收；Techmeme 要求「已经在里面的人链接你」。本项目账本里内容合格的来源就是现成的种子。
4. **维护是持续的，并且公开承认不全。** Media Cloud 有「已核实」状态并保留停更来源；Medill 每年重做并请读者纠错；Podcast Index 标记 dead。
5. 规模参照：做全题材新闻的 Media Cloud 是 6 万个来源，GDELT 的对照表是 16 万个域名，Medill 数出的美国地方新闻是 2 万家。单一行业要「几万个」，是这些全题材普查的量级。

---

## B. 「人」这一类来源的全集在哪里

### B.1 播客

**Podcast Index 整库下载（实测）**

| 项目 | 读到的内容 |
|---|---|
| 地址 | `https://public.podcastindex.org/podcastindex_feeds.db.tgz`（请求时必须带能说明身份的 User-Agent，否则返回 403，提示原文：「You must set a proper User-Agent string that identifies your application」） |
| 大小 | 压缩后 1,829,948,102 字节（约 1.83GB，HTTP 头）；解开后是一个 SQLite 文件 5,099,515,904 字节（约 5.1GB，读压缩包开头的 tar 头得到）。这一轮只读了开头 400KB 看结构，没有下载全文件 |
| 更新 | 文件修改时间 2026-10-03；接口文档写每天更新，第三方文章写每周 |
| 内容 | 接口文档原文：「Compressed database of all non-dead feeds in the Podcast Index database. Updated daily. Some attributes excluded. No episodes included.」 |
| 表和字段 | 一张表 `podcasts`，字段：`id, url, title, lastUpdate, link, lastHttpStatus, dead, contentType, itunesId, originalUrl, itunesAuthor, itunesOwnerName, explicit, imageUrl, itunesType, generator, newestItemPubdate, language, oldestItemPubdate, episodeCount, popularityScore, priority, createdOn, updateFrequency, chash, host, newestEnclosureUrl, podcastGuid, description, category1 … category10, newestEnclosureDuration, podcastId, duplicateOf` |
| 对上任务要的字段 | 订阅地址 `url`；标题 `title`；简介 `description`（带 HTML，实测样例行里有完整简介）；语言 `language`；分类 `category1–10`（小写英文词，样例行是 business、investing、management）；托管主机 `host`；集数 `episodeCount`；最后更新 `newestItemPubdate`。另外有用的：最新一集的音频地址 `newestEnclosureUrl`（可以直接看音频主机，样例行是 sphinx.acast.com）、生成器 `generator`（托管软件自己写的名字）、节目网站 `link`、Apple 编号 `itunesId` |
| 没有的 | 单集标题和单集简介（不含单集）；所有者邮箱（被排除）；许可信息 |
| 另有 | 标记 dead 的订阅编号清单 `podcastindex_dead_feeds.csv`，29.9MB |
| 分类表 | 沿用 Apple 的分类，没有「餐饮经营」这一类：Food 在 Arts 下面，Business 下面是 Careers、Entrepreneurship、Investing、Management、Marketing、Non-Profit（categories.json，实测） |
| 条款和许可 | 官网首页的承诺（实测）：「The core, categorized index will always be available for free, for any use.」数据库仓库的说明：「Everything in this repo is under the MIT license.」服务条款 v1.1（2021-03-02）第 5.1 条：经接口取得的第三方内容可能受知识产权保护，使用要得到内容所有者许可或法律允许；第 5.5 条：除非内容所有者或法律明确允许，不得对「接口返回的内容」抓取、建库、长期保存副本，也不得复制、翻译、改编、公开展示。**读法**：这些限制针对的是第三方内容（节目的简介、图片、音频），整库文件是它自己公开给人下载的。把它当作「找到订阅地址」的底表、不对外再发布，然后对每个订阅按自己的规则查条款，和这两处都不冲突；节目本身能不能用，仍由节目方和托管平台的条款决定 |

**能不能直接筛出「题材是餐饮经营」并且「托管在条款允许的平台」的全部节目：能做到大部分，分三层。**

1. 托管平台：`host`（订阅地址的主机）加 `newestEnclosureUrl`（音频主机）加 `generator`，三样合起来判断。只看订阅主机会漏掉用自定义域名的节目（Livewire 的方法说明里专门指出这一点，所以它按音频地址判断）。账本里已经有平台一级的结论，可以直接做成允许名单和禁止名单，一条 SQL 就能把禁止平台上的全部排除。
2. 题材：分类帮不上大忙（没有对应的类别，并且分类是节目方自己填的）。要用标题和简介的多语言关键词先粗筛，再让模型读标题和简介判断。这一步在本地做，不用调用任何搜索接口。
3. 筛不出来的：节目方自己的条款（要打开 `link` 去读）、内容是不是店主本人的经验（要看单集）。这两项仍要逐个建档案，但只对前两层剩下的做。

**对照**

| 目录 | 多大 | 能不能整批拿 | 条款 |
|---|---|---|---|
| Listen Notes | 382 万（实测） | 整库只卖给企业客户；可以按关键词、国家、语言、类别成批导出 CSV 或 SQLite，一次一付，页面没有标价 | 接口条款：「must not pre-fetch, cache, index, or store any content on the server side」（企业版除外），用了数据要显示「Powered by Listen Notes」；数据集不得转给第三方，只能发表汇总统计 |
| Apple 播客目录 | 约 300 万，其中近 90 天有更新的约 48 万（转述 Podcast Industry Insights，2025-11 和 2026-06 的数字） | 这一轮没有读到官方的整库下载（没有验证）。Podcast Index 的每一行带 `itunesId`，可以对上 | 没有验证 |
| fyyd（德国） | 首页没有写数量（没有验证） | 有接口文档页，没有读 | 首页只有隐私政策链接 |
| Podchaser | 「Business」类 417,357 个节目，其中约 16% 活跃（转述） | 没有验证 | 没有验证 |

**托管平台的份额（用来估计「落在允许的平台上的比例」）**

- 按新发布的单集算（Livewire，2026 年 5 月，约 190 万集，按音频地址判断托管商，实测）：Spotify for Creators 24.1%、Spreaker 12.3%、Buzzsprout 7.1%、Megaphone 4.3%、Podbean 4.3%、Omny Studio 3.8%、RSS.com 3.1%、Simplecast 2.7%、Libsyn 2.6%、Acast 2.4%、Transistor 2.2%、SoundCloud 2.0%、Captivate 1.6%、iVoox 1.5%、Triton 1.1%、Podigee 1.0%、WideOrbit 1.0%，其余没有列百分比。
- 账本里已判定整体不可用的平台（Spotify、Spreaker、Podbean、RSS.com、Libsyn、Acast、Transistor、SoundCloud、iVoox）在这张表里合计 54.5%，再加上没有列出百分比的 Castos、Riverside、Firstory、SoundOn、Substack、喜马拉雅、Podomatic，和今天实测的「约六成」相符。账本里判定可用的平台（Buzzsprout、Captivate、Podigee，以及没有列百分比的 Ausha、Blubrry）合计约一成；Megaphone（4.3%）账本里没有下结论；Omny、Simplecast 等没有查过。
- 按节目个数算（含已停更的）：Listen Notes 的数据是 Anchor（现在的 Spotify for Creators）一家占全部播客的 56%，Buzzsprout 第二，7%（转述 Inside Radio）。**两种算法有出入**：按个数算，禁止平台的比例会比六成更高，因为大量只发过几集的节目在 Anchor 上；按活跃程度算是六成上下。

### B.2 博客和个人网站

没有一个像 Podcast Index 那样的「博客整库」。接近全集的东西和各平台的条款方向：

| 来源 | 是什么、多大 | 怎样用来找来源 | 条款方向 |
|---|---|---|---|
| Common Crawl | 每月 20 多亿网页、4,000 万个主机（见 A） | URL 索引里按检测到的类型取出全部 RSS、Atom 地址；链接图里取出和种子互相链接的域名。**有没有人做好的「全部订阅地址」清单，这一轮没有读到（没有验证）**；页面里用 `<link rel="alternate">` 声明的订阅要读 WAT 元数据文件才能得到，量更大 | 使用条款（2024-03-07）：抓到的内容「可能受内容所有者自己的条款约束」，要求使用者尊重第三方的版权，并建议商业使用前咨询法律意见。它只是找到网站的工具，每个网站仍按自己的条款判断 |
| Kagi Small Web | 41,658 个英文个人博客订阅（实测），MIT 许可 | 整份名单可以直接下载；没有题材标签，要自己分类。名单的收录规则排除了有广告、卖东西的网站，店主的生意网站多半不在里面 | 名单本身 MIT；每个博客按自己的条款 |
| Feedspot | 自称 25 万个活跃订阅、1,500 个细分类别（转述）；有「Top 90 Restaurant RSS Feeds」「Top 35 Restaurant Marketing RSS Feeds」等榜单 | 榜单是排行不是全集；可以写信要某个类别的表格 | 没有验证 |
| Feedly、Inoreader 的主题目录 | 见 A | 输入主题能列出相关订阅，可以当种子的补充；没有读到成批导出的办法 | 没有验证 |
| ooh.directory、IndieWeb 名录 | 没有验证（ooh.directory 返回 403） | — | — |
| WordPress.com | 标签页和阅读器按标签列出博客；总数没有官方数字（第三方说每月约 7,000 万篇新文章，转述，不可靠） | 按标签列出，再读各自的订阅 | 服务条款（2026-10-06 更新）写明也约束访问者：「These Terms also govern visitors' access to and use of any websites that use our Services.」读取工具摘出的禁止项里没有抓取或机器人一条，只有「不得给系统造成过重负担」。**方向：可能可用，要全文核对**。旁证：Automattic 2024 年被报道把公开内容经 Firehose 提供给 AI 公司，事后说要停用 Firehose，并给用户加了「不与第三方分享」的开关，打开后 robots.txt 会拒绝 AI 爬虫（转述 404 Media 等），所以逐个博客的 robots 仍要查 |
| Blogger（blogspot） | 没有目录 | — | Google 服务条款（2026-07-30 生效）：禁止「以自动化手段、违反网页上的机器可读指示（例如禁止抓取、训练或其他活动的 robots.txt）读取内容」。也就是以 robots 为准。**方向：robots 允许的可能可用**；Blogger 自己的附加条款没有读 |
| Ghost | Ghost Explore 目录按类别列出，有「Food & drink」一组；页面写上周新开 13,806 个站（转述） | 按类别列出 | ghost.org 条款 2.2(9) 禁止用爬虫、机器人、数据挖掘工具下载任何服务上的内容，2.2(11) 禁止把服务或内容用于商业目的。条款没有写明是否约束 Ghost(Pro) 客户网站的访问者。**方向：托管在 Ghost(Pro) 上的偏不可用，待全文核对；自己架设的 Ghost 不受这份条款约束** |
| Ameba（日本） | 有按类别和职业的官方排行，数量没有查 | — | 利用规约（2025-11 更新）：读取工具没有找到针对抓取、机器人或 AI 的专门条款；有「禁止妨碍服务运营的行为」；「未经本公司同意的商业行为」一项列的是传销、转让使用权之类。**方向：待全文核对** |
| note（日本） | — | — | 条款页返回 403，**没有验证** |
| Naver 博客（韩国） | — | — | 转述：条款禁止用自动化程序收集帖子，robots.txt 除首页外大多禁止，抓取会被拦。**方向：不可用（要读原文确认）** |
| Tistory（韩国） | — | — | 没有找到针对抓取的条款（没有验证） |
| 已知不可用（任务给定） | Substack、Medium、Wix、はてな、痞客邦、方格子、Brunch | — | — |

小结：博客这一类，**全集只能自己从 Common Crawl 和种子的链接里拼出来**；平台托管的博客里，方向上可能可用的是 WordPress.com 和 Blogger，量最大而且不受平台条款约束的是自己域名上自己架设的网站（WordPress、Ghost 等）。

### B.3 电子报平台

| 平台 | 有没有按题材的目录 | 条款对读取公开存档页的规定 | 方向 |
|---|---|---|---|
| beehiiv | 没有读到官方目录；第三方目录有 700 多个和 1,100 多个两份（转述） | 使用条款（2026-10-06 修改），对访客和注册用户都适用，第 3 节禁止「any data mining, robots, crawling, scraping or data gathering or extraction methods」 | 不可用 |
| Kit（原 ConvertKit） | Creator Network 是创作者互相推荐的网络，不是公开目录 | 条款（2025-09-05）12.1(i) 禁止用数据挖掘、机器人等手段抓取或提取数据；4.3 只许个人和内部业务使用 | 不可用 |
| Buttondown | 没有读到 | buttondown.com 的条款只许「personal, non-commercial transitory viewing」，禁止任何商业目的和公开展示；没有区分客户和存档页的读者 | 偏不可用（存档在自己域名上的要另看） |
| Ghost | Ghost Explore（见 B.2） | 见 B.2 | 托管版偏不可用，自己架设的可以 |
| Mailchimp 存档页 | 没有读到 | 条款前 10 万字符里没有针对抓取或存档页的条款，最后 1.7 万字符没有读 | 没有验证 |
| Substack | 有分类排行 | 已知不可用 | 不可用 |

小结：电子报**没有全集**，主要平台的条款又大多禁止自动读取，这一类不值得作为主攻方向；发在自己域名上的电子报存档归入「自己的网站」处理。

### B.4 视频和社交平台

| 平台 | 条款原文要点 | 地址 | 能不能把内容交给模型写摘要并在商业网站展示 |
|---|---|---|---|
| YouTube（服务条款，2022-01-05 生效） | 不得「access the Service using any automated means (such as robots, botnets or scrapers)」，例外只有按 robots.txt 的公共搜索引擎或 YouTube 事先书面许可；不得把服务用于「personal, non-commercial use」以外的观看和收听；不得复制、下载、传播内容，除非服务明确授权或经 YouTube 和权利人书面许可 | youtube.com/static?template=terms | 不能 |
| YouTube Data API（开发者政策） | III.E.4.c：接口数据存放不得超过 30 天，之后删除或刷新；III.E.6：不得抓取；III.E.4.h：不得「access or use API Data to create new or derived data or metrics」；III.E.2：不得汇总接口数据（频道自己的数据除外）；III.G.1.d：不得在含有接口数据的页面上出售广告、赞助或推广（这一条的完整限定语没有读全）；III.I.7：不得分离或修改视听内容里的音频和视频。读到的页面没有专门提字幕、转写、摘要或 AI | developers.google.com/youtube/terms/developer-policies | 不能：摘要是由接口数据派生的新数据，本站又是有赞助和广告的商业站 |
| Reddit（Data API Terms） | 官方页面读取工具打不开；经搜索读到的存档版本：商业用途、超出限额的研究、任何没有明确允许的用途都要和 Reddit 另签协议；用用户内容训练模型要有权利人的明确许可；用户内容归用户所有。修订日期第三方记为 2026-07-20，**没有对上原文** | redditinc.com/policies/data-api-terms | 不能，除非签商业协议 |
| TikTok | Research API 只给美国、欧洲经济区、英国、瑞士的非营利学术机构和欧盟的非营利研究机构；商业用户不符合资格；Display API 要用户本人授权后才能读他的公开内容（转述官方页面） | developers.tiktok.com/products/research-api | 不能 |
| Instagram、Facebook | Meta Content Library 只给学术机构和以科研或公共利益研究为主业的非营利机构（转述官方页面）；平台条款原文没有读 | transparency.meta.com/researchtools/meta-content-library | 不能（平台条款没有验证） |
| X | 2025 年 6 月起开发者协议禁止用 X 的接口或内容「fine-tune or train a foundation or frontier model」（转述 TechCrunch；官方页面返回 402）。写摘要不是训练，但官方接口按量收费（HANDOFF：每读 1,000 条 5 美元） | developer.x.com/en/developer-terms/agreement-and-policy | 条款上不等于训练；要付费，项目已定暂不接 |
| LinkedIn | 帮助中心：不允许抓取网站或自动化操作的爬虫、机器人和浏览器插件；用户协议 8.2 禁止未经内容所有者同意复制、使用、展示从服务取得的信息（转述） | linkedin.com/help/linkedin/answer/a1341387 | 不能 |
| 小红书 | 用户服务协议（2025-12-08 版）的抓取条款这一轮没有读到；有公司因用爬虫取小红书数据被追究刑事责任的报道（转述） | 没有验证 | 不能（HANDOFF：没有合规的读取方式） |
| 抖音 | HANDOFF：只在创作者授权后才能读。这一轮没有重查 | — | 不能，除非创作者逐个授权 |
| 微信公众号 | 没有读到平台协议里针对抓取的条款；框架支持的是第三方付费接口，不是微信授权的方式（HANDOFF） | — | 项目已定不走第三方 |

小结：视频和社交平台**整体不可用**，每一家都确认了方向，其中 YouTube 的两份条款和 TikTok 的资格是读到原文的；Reddit、X、Meta、小红书的官方条款页这一轮没有读到原文，结论来自存档或报道，和已知情况一致。唯一的例外路径是创作者本人把文稿或文件直接交给本站并书面同意，这不经过平台。

### B.5 论坛和问答社区

- 没有找到「各国餐饮老板论坛」的名录。
- Reddit 上的相关版块（成员数转述第三方统计，两处数字有出入）：r/restaurantowners 约 4.7 万、r/restaurateur 2.1 万到 2.8 万、r/BarOwners 约 1.9 万、r/restaurant 约 19.5 万。都受 Reddit 的接口条款约束，不可用。
- 系统商的社区（例如 Toast Community）要客户账号登录，不可用。
- 独立论坛（披萨、咖啡、烧烤等品类的从业者论坛）和中文的餐饮老板社区，这一轮没有逐个查（没有验证）。
- 论坛内容另有三个问题：每一帖的权利在发帖人；常有点名的指控，预筛要挡；多数论坛的条款只许个人使用。这一类排在最后。

---

## C. 规则之下扩大可用量的正当办法

### C.1 换一个顺序：先从条款允许的地方出发，再看题材

今天的做法是先按题材搜，再查条款，六成落在禁止的平台上。倒过来的做法是：**先确定哪些平台和主机的条款不约束读者或允许自动读取，把这些平台上的全部订阅从整库里取出来，再在里面筛题材。** 条款审查从「每个节目一次」变成「每个平台一次」，账本里已经有 Buzzsprout、Captivate、Blubrry、Ausha、Podigee 五个平台级的结论可以直接用。播客用 Podcast Index 的 `host`、`newestEnclosureUrl`、`generator` 三列做；网站用「自己的域名」这个条件做（没有平台条款，只剩网站自己的条款和 robots）。这是这一轮找到的最大的一条成规模途径，不需要放宽任何规则。

### C.2 明确以开放许可发布的内容

| 许可 | 读到的原文 | 覆盖什么 | 怎样成批找到 |
|---|---|---|---|
| 英国 Open Government Licence v3.0 | 可以「copy, publish, distribute and transmit」「adapt」「exploit the Information commercially and non-commercially」；要注明来源；不包括第三方权利、个人资料、标志 | 英国政府和多数公共机构的网站（gov.uk、食品标准局等） | 按机构名单逐个确认页脚写的是 OGL |
| 美国联邦政府作品 | 《美国法典》第 17 编第 105(a) 条：美国政府的作品不受版权保护 | 联邦机构自己写的内容（小企业管理局、食品药品管理局、农业部、劳工统计局、人口普查局等）；州政府和外包作者的内容不在内 | 按 .gov 域名和机构名单 |
| 新加坡 Open Data Licence | 允许商业和非商业使用，要注明来源并链接许可 | **只覆盖数据集**，没有提到机构网站上的新闻和文章，所以不能当作食品局新闻稿的依据 | data.gov.sg |
| 澳大利亚、加拿大、新西兰、欧盟委员会的政府许可 | 没有验证（澳大利亚 business.gov.au 的版权页返回 404） | — | — |
| 知识共享许可的网站和播客 | 播客的 Podcasting 2.0 规范里有 `podcast:license` 标签，用来写明许可（转述）；有多少订阅用了没有数字，Podcast Index 的整库下载里也没有这一列 | — | 没有找到现成的「按许可检索网页或播客」的目录（Openverse 一类只管图片和音频素材）。可行的办法是自己在 Common Crawl 的元数据里找指向 creativecommons.org 许可页的链接，这是推断，没有验证 |

政府内容对日报有用（规定、税费、食品安全），对「店主本人的经验」没有帮助。

### C.3 成批征求同意

- **项目已有的做法**：给故事多的六个来源写信，对方同意后恢复，回信存进 `myfnb/permissions/`。可以推广成固定流程：筛出内容合格、只卡在条款上的来源，按节目方或托管平台分组发信。
- **向托管平台征求**：这一轮没有找到播客托管商面向第三方的内容授权或合作方案（没有找到，不等于没有）。条款禁止的平台里，约束的对象有两种：约束所有访问者的（Podbean、RSS.com、Podomatic），和节目方同意无关，要平台同意；节目方自己的条款禁止的，节目方同意就够。信应当发给对的一方。
- **内容授权市场**：现在出现的几家都是给「AI 公司向出版方付费」用的。微软的 Publisher Content Marketplace（2026 年 2 月，按使用付费，出版方自己定价）；TollBit（AI 公司付费读取，出版方拿全部收入）；ProRata（广告和订阅收入五五分）；ScalePost（抽成约 15%）；Cloudflare 的按次付费抓取（网站定价，最低每次 0.01 美元，返回 402）；RSL Collective（非营利，出版方免费加入，自称 1,500 多家媒体支持）。全部是转述。**对本站的意义有限**：加入这些方案的是大中型出版方，店主的个人网站和小节目基本不在里面；有来源返回 402 或在 robots.txt 里写了 RSL 许可时，说明它可以按价取得，带数字找用户决定。
- 新闻行业的集体授权机构（英国 NLA、美国 CCC 等）：没有验证。

### C.4 表示允许 AI 使用的信号，能不能反过来当入口

| 信号 | 表达什么 | 用的人多不多 |
|---|---|---|
| Content-Signal（Cloudflare，2025-09-24，CC0） | robots.txt 里一行，逗号分隔的 `yes` 或 `no`：`search`（建索引和给搜索结果）、`ai-input`（把内容输入 AI 模型）、`ai-train`（训练或微调）。没有写的那一项表示「既不授予也不限制」 | Cloudflare 的托管 robots.txt 有 380 多万个域名启用，默认值是 `search=yes, ai-train=no`，**不写 `ai-input`**，因为不知道客户的意愿。IPTC 抽查 505 家出版方：有 Content-Signal 的 8 家（1.6%），其中多少写了允许没有统计 |
| RSL 1.0（2025-12-10 定稿） | robots.txt 里的 `License:` 指向一份 XML 许可，可以分别规定抓取、训练、输入等用途的条件和价格 | 同一次抽查里只有 2 家（0.4%）：Bild 和《卫报》 |
| TDMRep | 保留或许可文本与数据挖掘 | `/.well-known/tdmrep.json` 6 家（1.2%），页面元标签 7 家（1.4%） |
| llms.txt | **不表达任何许可**。原文：是为了「provide LLM-friendly content」，「robots.txt lets automated tools know what access to a site is considered acceptable」，llms.txt 只是帮模型找到内容。有三个收录目录（llmstxt.site 等） | — |
| robots.txt 拒绝 AI 机器人 | — | 同一次抽查里 46.3% 的出版方至少拒绝一个 AI 机器人，53.9% 一个也没拒绝（没拒绝不等于明确允许） |

**怎样成批检测**：Common Crawl 每一轮单独存了一份 robots.txt 子集，2026 年 9 月这一轮是 100,000 个文件、每个约 1.5MB，合计约 150GB（实测文件数和三个文件的大小）。在里面查 `Content-Signal` 里的 `ai-input=yes` 或 RSL 的 `License:`，就能得到「明确表示允许」的主机清单。

**能不能当入口**：能做，但量会很小。明确写允许的出版方比例在 1.6% 以下，再乘上「和餐饮经营有关」，剩不下多少；并且 150GB 的下载和处理要在服务器上做。更合适的用法是保持现在的做法：把它当作档案里的一项（`check-sources.mjs` 已经在查），遇到写了 `ai-input=yes` 的来源可以少一层顾虑。**不建议把它当作找来源的主要入口。**

---

## D. 规模的依据

### D.1 读到的统计

| 项目 | 数字 | 出处和可靠程度 |
|---|---|---|
| 全世界餐饮店数量 | **没有找到一个权威的全球合计。** 2020 年：亚太 1,700 多万家餐饮服务场所，拉丁美洲 230 多万家；中国 930 万、印度 410 万 | Statista 引 Bord Bia（转述；口径是「餐饮服务场所」，比餐馆宽） |
| 中国 | 2025 年 3 月全国餐饮门店近 800 万家（红餐大数据）；2025 年末收录餐饮商户 757.77 万家（《2026 中国餐饮业年度报告》）；在营业的约 747 万家，2025 年标记停业的 339 万家（《2026 中国餐饮连锁化发展白皮书》）；餐饮相关企业存量 1,689 万家（企查查，口径是登记的企业） | 转述；都是民间机构的数字，口径不同，不能直接相比 |
| 美国 | 100 多万个餐厅和餐饮服务场所、1,570 万从业者（美国餐饮协会 2026 年 2 月新闻稿）；有雇员的餐馆和饮酒场所约 73.1 万家 | 前者转述协会新闻稿；后者出自一个商业博客，没有对上劳工统计局或人口普查局的原表 |
| 欧盟 | 2022 年餐饮服务业 150 万家企业、840 万从业者（Eurostat）；2023 年法国 177,680、意大利 155,560、德国 140,370 | 转述 |
| 马来西亚 | 2022 年餐饮服务业 136,453 家场所（2015 年是 167,490 家）；其中餐食服务 107,129 家 | 转述马来西亚统计局 2023 年经济普查的报道 |
| 日本 | 没有验证（要到 e-Stat 查经济普查「76 饮食店」的全国数） | — |
| 印度 | 只读到市场规模（2024 年 5.69 万亿卢比），没有读到家数 | 转述印度餐饮协会报告的报道 |
| 播客总数 | Podcast Index 4,738,667（实测）；Listen Notes 3,821,596（实测）；Apple 约 300 万（转述） | 三家口径不同：Podcast Index 含很多已停更的，Listen Notes 做了剔除 |
| 活跃播客 | Podcast Index 近 90 天有更新 466,693（占 9.8%）；Apple 约 48 万（约 16%）；Listen Notes 2026 年以来有更新 435,218（约 11.6%） | 前者实测，后两者转述 |
| 餐饮类播客占比 | **没有找到统计。** Business 类：Podchaser 417,357 个（转述） | — |
| 博客总数 | 流传的「6 亿个博客」「每天 600 万到 750 万篇」出自营销网站互相引用，其中说 Tumblr 占 5.18 亿，显然是账号数。**不能当依据** | 转述，不可靠 |

把读到的几块加起来（亚太 1,700 万、拉美 230 万、欧盟 150 万、美国 100 万，再加没有读到数字的非洲、中东、欧盟以外的欧洲、加拿大），**全世界餐饮服务场所的量级是两千多万到三千万家。这是估计**，各块的年份和口径都不一致。

### D.2 两类全集的量级（以下全部是估计，写明假设）

**店主本人的内容**

- 没有任何统计回答「多少店主在公开渠道发声」。
- 假设每一千到一万家店里有一位店主在某个公开渠道持续谈自己的经营，两千五百万家店对应 **2,500 到 25,000 人**。用户说的「几万个」和这个范围的上端同一量级，说法站得住；但这是全部渠道的合计。
- 其中大部分在视频和社交平台上（抖音、小红书、公众号、YouTube、Instagram、TikTok、Facebook 群组），按 B.4 整体不可用。这个比例没有统计；项目自己的经验是中文店主经验「几乎都在公众号、Medium、痞客邦、方格子」。
- 落在开放渠道（播客订阅、自己域名上的博客）的部分：播客可以量出来。Podcast Index 474 万个订阅里，如果有万分之五到千分之二和餐饮经营有关，就是 **2,400 到 9,500 个节目（含已停更的）**，其中近 90 天有更新的约一成，即 240 到 950 个。对照：今天用 364 组关键词扫到约 12,000 个订阅（其中多数题材不对），通过 19 个。**这个数不用估，把整库下载下来筛一遍就能数出来。**
- 落在条款允许的平台上的比例：按活跃程度算约四成（今天的实测，和 Livewire 的份额表相符）；按节目个数算会更低，因为 Anchor 一家占全部节目的一半以上（见 B.1）。所以「2,400 到 9,500」里托管平台允许的大约是 **600 到 3,800 个**，再过节目方自己的条款和内容两把尺子，剩下的会少得多。存档（参考库）可以用已停更的节目，这一点比日报有利。

**写给餐饮经营者的内容**（行业媒体、协会、系统商和供应商、政府、顾问）

- 项目 10/1 的全集文件列了 392 个，能接的 250 个。
- 量级估计：约两百个国家和地区，每个至少一个全国性协会，大国还有州一级的（美国 50 个州协会，德国、日本按州和县设分会），协会在 **一千到两千个**；行业媒体和品类媒体全球 **一千到两千家**；有内容栏目的系统商、平台、供应商 **数千家**；相关的政府机构 **数百到一千个**。合计 **五千到一万五千个网站**，其中多数是自己的域名，没有平台条款这一层。这是估计，没有统计。
- 这一类的通过率，账本的经验是 3% 到 5%（HANDOFF §9.2），卡住的主要是条款禁止抓取、只许个人使用、拒绝 AI 阅读。

### D.3 对「1,000 个可用来源」的含义

- 全题材的新闻普查（Media Cloud 6 万、GDELT 16 万个域名）说明几万个来源在技术上不难；难的是本站的规则比它们严得多（它们是研究用途，不看条款）。
- 可用量 =（全集）×（题材相关）×（平台和主机允许）×（来源自己的条款允许）×（内容过两把尺子）。前三项现在可以用整库一次算出来，后两项才需要逐个看。把顺序改成 C.1 那样以后，逐个看的工作量会集中在通过可能性高的候选上。

---

## 对计划的含义（供写计划的人参考，不是结论）

1. 播客：在服务器上下载 Podcast Index 整库（1.83GB，解开 5.1GB），先数出各主机上的订阅数，把账本里的平台结论做成允许和禁止两份名单；对允许名单上的全部订阅按语言、标题和简介筛题材；数出来的结果替换 D.2 的估计。
2. 没有查过条款的大平台按份额从大到小补查（Megaphone、Omny Studio、Simplecast、Triton、Blubrry 以外的中小平台），每查清一个，整库里对应的那一批就有了结论。
3. 网站和博客：用已通过的来源和账本里内容合格的来源做种子，取它们链接到的域名和播客嘉宾自己的网站；规模更大时再用 Common Crawl 的链接图和 URL 索引。
4. 候选的题材分类交给模型读标题、简介或首页，人工只核对模型判为相关的。
5. 视频和社交平台、电子报平台、论坛不投入；只在创作者本人同意并直接提供内容时接。

---

## 这一轮读过的地址（2026-10-10）

本地文件：`C:\myfnbguide\README.md`、`docs\sources.md`、`docs\customize.md`、`myfnb\HANDOFF.md`（§5.4、§9.2 开头、§12、§13）、`myfnb\sources-universe-2026-10-01.md`（总数一节）、`myfnb\sources-ledger.tsv`（平台一级的行）。

读到原文或原始数据的：

- https://podcastindex.org/ （首页文字）
- https://podcastindex.org/api/stats （订阅总数和活跃数）
- https://public.podcastindex.org/podcastindex_feeds.db.tgz （只读 HTTP 头和开头 400KB）
- https://public.podcastindex.org/podcastindex_dead_feeds.csv （只读 HTTP 头）
- https://podcastindex-org.github.io/docs-api/pi_api.json （接口说明全文）
- https://raw.githubusercontent.com/Podcastindex-org/legal/main/TermsOfService.md
- https://github.com/Podcastindex-org/database 和其中的 create_table_statement.sql
- https://raw.githubusercontent.com/Podcastindex-org/podcast-namespace/main/categories.json
- https://james.cridland.net/blog/2026/podcast-index-sql-data-mining/
- https://www.listennotes.com/podcast-stats/
- https://www.listennotes.com/api/terms/
- https://www.listennotes.com/podcast-datasets/
- https://fyyd.de/
- https://livewire.io/archive/podcast-hosts-by-episode-share-may-2026/
- https://blog.gdeltproject.org/?p=14261 和 https://blog.gdeltproject.org/wp-content/uploads/2021-news-outlets-by-countrycode-2015-2021.csv
- https://www.mediacloud.org/documentation/source-guide
- https://ojs.aaai.org/index.php/ICWSM/article/view/42778
- https://commoncrawl.org/web-graphs
- https://commoncrawl.org/get-started
- https://commoncrawl.org/terms-of-use
- https://index.commoncrawl.org/graphinfo.json
- https://index.commoncrawl.org/collinfo.json
- https://data.commoncrawl.org/crawl-data/CC-MAIN-2026-39/robotstxt.paths.gz （以及 warc、wat、cc-index-table 三份清单的 HTTP 头）
- https://www.techmeme.com/about
- https://github.com/kagisearch/smallweb （README、smallweb.txt、smallyt.txt、smallcomic.txt）
- https://wordpress.com/tos/
- https://policies.google.com/terms
- https://ghost.org/terms/
- https://helps.ameba.jp/rules/post_104.html
- https://www.beehiiv.com/tou
- https://buttondown.com/legal/terms
- https://kit.com/terms
- https://mailchimp.com/legal/terms/ （前 10 万字符）
- https://developers.google.com/youtube/terms/developer-policies
- https://www.youtube.com/static?template=terms
- https://blog.cloudflare.com/content-signals-policy/
- https://llmstxt.org/
- https://metawatch.iptc.org/ai-policy/
- https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
- https://www.law.cornell.edu/uscode/text/17/105
- https://data.gov.sg/open-data-licence

打不开、没有读到的：

- https://podcastindex-org.github.io/docs-api/ （页面要脚本，改读 pi_api.json）
- https://note.com/terms → https://terms.help-note.com/hc/ja/articles/44943817565465 （403）
- https://ooh.directory/about/ （403）
- https://redditinc.com/policies/data-api-terms （读取工具不能访问）；https://web-archive.nli.org.il/National_Library/mp_/https://redditinc.com/policies/data-api-terms （403）
- https://developer.x.com/en/developer-terms/agreement-and-policy （402）
- https://contentsignals.org/ （只取到标题）
- https://business.gov.au/copyright （404）

经搜索结果转述、没有打开原页的（正文里标了「转述」）：

- https://www.mediacloud.org/blog/approaches-to-searching-by-place-in-media-cloud ；https://mediacloud.org/media-cloud-directory
- https://commoncrawl.org/blog/august-2026-crawl-archive-now-available
- https://blog.feedly.com/leo-discovery/ ；Feedly 的应用商店介绍
- https://www.inoreader.com/blog/2023/04/new-and-updated-featured-collections.html
- https://techcrunch.com/2011/10/31/techmeme-opens-the-kimono-on-how-it-chooses-headlines-and-sources/ ；https://searchengineland.com/qa-with-gabe-rivera-creator-of-techmeme-10278
- https://localnewsinitiative.northwestern.edu/projects/state-of-local-news/2025/methodology/
- https://cyber.harvard.edu/sites/cyber.law.harvard.edu/files/Mapping_the_Arabic_Blogosphere.pdf ；https://archives.iw3c2.org/www2006/programme/files/pdf/p35.pdf
- https://ojs.aaai.org/index.php/ICWSM/article/view/19380 （Homepage2Vec）
- https://podcastindustryinsights.com/apple ；Inside Radio 关于 Listen Notes 托管份额的报道
- https://www.404media.co/wordpress-firehose-allows-ai-companies-to-buy-access-to-a-million-posts-a-day/ ；https://wptavern.com/automattic-faces-scrutiny-over-ai-access-policy
- https://rss.feedspot.com/restaurant_rss_feeds/ ；https://rss.feedspot.com/restaurant_marketing_rss_feeds/
- https://explore.ghost.org/
- https://developers.tiktok.com/products/research-api ；https://transparency.meta.com/en-gb/researchtools/meta-content-library/
- https://techcrunch.com/2025/06/05/x-changes-its-terms-to-bar-training-of-ai-models-using-its-content
- https://www.linkedin.com/help/linkedin/answer/a1341387
- https://rslstandard.org/press/rsl-1-specification-2025 ；https://metawatch.iptc.org/ai-policy/rsl/
- https://searchengineland.com/microsoft-launches-publisher-content-marketplace-for-ai-licensing-468191 ；mediacopilot.ai 关于各授权平台分成的对比
- https://github.com/Podcastindex-org/podcast-namespace （`podcast:license` 标签）
- https://www.statista.com/statistics/1240159/number-of-food-service-establishments-worldwide-by-country/ ；https://es.statista.com/statistics/1240182/total-food-service-units-worldwide-by-region/
- https://ec.europa.eu/eurostat/statistics-explained/index.php/Businesses_in_the_accommodation_and_food_services_sector
- https://www.restaurant.org/research-and-media/media/press-releases/persistent-cost-increases-and-enduring-demand-will-shape-the-restaurant-industry-in-2026
- https://www.dosm.gov.my/portal-main/release-content/economic-census-2023-food-and-beverage-services-sector ；https://malaymail.com/news/money/2024/08/05/stats-dept-malaysias-fb-services-gross-output-reaches-rm99b-with-136453-premises-in-2022/146085
- https://news.bjd.com.cn/2026/09/15/11959786.shtml ；https://www.bbtnews.com.cn/2026/0421/591177.shtml ；https://www.news.cn/food/20250415/ee40ab7a46af48dc8224e091e624e889/c.html （中国餐饮门店数）
- https://gummysearch.com/tools/subreddit-finder/restaurant-owners （Reddit 版块成员数）
- https://www.innoforest.co.kr/report/NS00000366/ （Naver 条款的转述）

---

# 各类来源的全集在哪里、有多大、怎样取得（快照：2026-10-10）

> 这份文件只回答一个问题：对每一类来源，世界上有没有现成的、可以整份取得的名录、登记册或数据库，可以从它出发逐个筛选。不审查任何具体来源的条款。
> 全部数字是 2026-10-10 当天取得的。每个数字后面标了取得方式：
> **【实测】** 本机跑查询或下载文件后自己数出来的；**【读页】** 打开了对方的页面，数字是页面上写的；**【搜索摘录】** 只在搜索结果的摘录里看到，没有打开原页；**【没有验证】** 打不开或没有查到。
> 本机为了数数下载了三份公开数据，放在 `c:\tmp\universe-dl\`（不在项目里，没有进 git）：Podcast Index 的数据库（5.1 GB）、美国国税局免税组织名册（4 个 CSV，共 341 MB）、GDELT 域名清单（5.6 MB）；数数的脚本在 `c:\tmp\universe-scripts\`。不再需要时可以整个删除。

## 0. 先说结论

| 类别 | 有没有像样的全集 | 最好的起点 | 规模 |
|---|---|---|---|
| 1 行业媒体 | **没有世界范围的**；只有按国家的行业刊物名录 | 德国 Deutsche Fachpresse / fachzeitungen.de；日本 Fujisan 分类和国会图书馆的调查指南；Curlie 目录 | 德国全行业 5,420 种行业期刊，餐饮住宿一类约 114 种；日本 33 种；Wikidata 全世界只有 7 种 |
| 2 行业协会 | **国家一级有**（上级联合会的成员名单）；地方一级只有美国能整份下载 | HOTREC、世界加盟理事会、Worldchefs 的成员名单；美国国税局免税组织名册 | HOTREC 47 个、加盟 43 个、厨师 100 多个；美国名称带餐饮住宿字样的行业团体 462 个 |
| 3 主管机构 | **有，按国家排列**，但没有「餐饮相关机构」这一维度 | Codex 成员名单、联合国统计司的统计局名单、GOV.UK 机构接口、美国 FDA 的各州餐饮法规页 | 189 个国家的食品法典联络点；199 个统计局；英国 1,267 个机构；美国 50 个州 64 个主管部门 |
| 4 服务商 | **有名录，但都拒绝程序读取** | G2、Capterra（只能人工翻页）；展会的参展商名单；Curlie | G2 餐饮收银一类 458–491 个产品；上海 HOTELEX 4,018 家参展商 |
| 5 餐饮企业 | **有，而且可以整份取得** | Wikidata 的连锁餐厅；韩国、澳大利亚的加盟登记册；美国证交会行业代码 | Wikidata 2,716 个（2,288 个有官网）；韩国餐饮加盟品牌 10,886 个 |
| 6 学术和教育 | **有，而且可以整份取得** | DOAJ、OpenAlex、美国 IPEDS | DOAJ 里 CC BY 的相关期刊 84 种；标题含 restaurant 的 CC BY 论文 4,434 篇；美国开设相关专业的院校 811 所 |
| 7 报纸和通讯社 | **有报纸的全集，没有「餐饮或小企业栏目」的全集** | GDELT 域名清单、Wikidata、Media Cloud | GDELT 189,545 个域名；Wikidata 报纸 52,663 种 |
| 附：播客 | **有，最完整的一个** | Podcast Index 的整库下载 | 473 万个订阅；按关键词命中、仍在更新的 1,703 个 |

三点方法上的发现：

1. **Wikidata 对连锁企业有用，对行业媒体和协会几乎没有用。** 它记了 2,716 个连锁餐厅，但全世界各行业的行业刊物只记了 1,657 种（德国 161 种，而德国行业协会自己统计是 5,420 种，覆盖约 3%），其中标了餐饮或住宿主题的只有 7 种；行业协会记了 2,432 个，标了餐饮住宿行业的约 10 个。
2. **软件名录（G2、Capterra、GetApp、Software Advice、TrustRadius、SourceForge、Slashdot）对脚本一律返回 403**（8 个网址全部实测）。它们是全集，但只能由人翻页，不能整份取得。
3. **老牌的媒体目录大多已经失效或陈旧。** Mondo Times 的域名现在是一个建站默认页；ABYZ News Links 和 Kidon Media-Link 本机连不上；Curlie 的「餐饮住宿 · 新闻与媒体」一栏上次更新是 2021 年 9 月，只有 22 个网站。

## 1. 餐饮和酒店餐饮的行业媒体、行业杂志

| 全集来源 | 网址 | 规模 | 取得方式 | 条款 | 缺口 |
|---|---|---|---|---|---|
| Wikidata：行业杂志（trade magazine，Q685935） | query.wikidata.org | 直接归为行业杂志的 1,657 种，有官网的 1,056 种；按国家：法国 365、德国 161、美国 143、加拿大 42、英国 42、西班牙 40、日本 9、中国 4，另有 638 种没有填国家。标了餐饮、住宿、外烩等主题的只有 **7 种**（Nation's Restaurant News、FoodService Director、Catersource、Entree Magazine 等）【实测】 | SPARQL，查询语句见文末 | 结构化数据是 CC0，没有限制【读页】 | 覆盖极差：只有 403 种填了主题或行业；不能带子类查，一带子类就把 10 万种学术期刊算进来（实测 136,141） |
| Wikipedia 分类和列表 | en/de/fr/ja.wikipedia.org | 英文「Professional and trade magazines」45 页加 23 个子分类；「List of food and drink magazines」101 种，其中行业刊物 15 种、餐饮业 5 种；德文「Fachzeitschrift (Deutschland)」294 页加 33 个子分类；法文「Presse professionnelle」52 页；日文「業界紙」72 页【实测，MediaWiki 接口】 | MediaWiki 接口取分类成员 | CC BY-SA，只读名单没有问题 | 没有「餐饮行业刊物」这个分类（查了英、德、法、日四种语言，都不存在） |
| Curlie（原 DMOZ）· Business/Hospitality | curlie.org/en/Business/Hospitality | 整个类目 1,666 个网站；News and Media 22 个（上次更新 2021-09-01）；Food Service 下的 News and Media 5 个；德文「Gastgewerbe」1,423 个，其中「Zeitschriften und Online-Magazine」14 个（上次更新 2026-09-30）【读页】 | 整库下载：curlie.org/directory-dl，制表符分隔文本，约 200 MB，约 290 万条，每月更新【读页】 | CC BY 3.0，使用时要署名【读页】 | 英文部分陈旧；Food Service 一栏中文只有 2 条，协会一栏日文只有 2 条；没有看到东南亚语言 |
| Deutsche Fachpresse（德国行业媒体协会）的年度统计 | deutsche-fachpresse.de/markt-studien/fachpresse-statistik/ | 德国全行业的印刷版行业期刊 **5,420 种**（上一年 5,551 种）【读页】 | 只有统计数字；成员名单页本次没有找到（/mitglieder/ 返回 404） | 只读数字 | 没有按行业的名单 |
| fachzeitungen.de（德语行业期刊目录） | fachzeitungen.de/zeitschriften-magazine-essen-trinken-schlafen | 50 个行业类目，1,800 多家出版社；「吃、喝、住」一类 **114 种期刊**：酒店和餐馆 19、美食 35、餐馆指南 18、葡萄酒和烈酒 22、饮料 14、在线杂志 6【读页】 | 分页读取 | 没有读它的条款【没有验证】 | 只有德语区；美食和指南两小类是写给食客的 |
| 日本国会图书馆「外食产业的调查方法」 | ndlsearch.ndl.go.jp/rnavi/business/post_102113 | 点名的业界纸 4 种（日本食糧新聞、日本外食新聞等）、专业杂志 4 种（近代食堂、飲食店経営、月刊食堂、Food life），另列 7 个协会和 3 种年鉴名录【读页】 | 读页面 | 政府网站 | 只是入门指南，不是全集 |
| Fujisan 杂志分类「飲食店経営・調理師」 | fujisan.co.jp/cat100/cat3093/ | **33 种**（柴田書店、旭屋出版两家占多数）【读页】 | 读页面 | 只读名单 | 只有纸质杂志；含单行本性质的特刊 |
| Feedly 的订阅搜索接口 | cloud.feedly.com/v3/search/feeds?query=… | 每个词最多返回 100 个：restaurant 99、hospitality 99、restauration 100、gastronomie 27、foodservice 7、horeca 5【实测】 | 公开接口，不用登录；每个结果带订阅地址和订阅人数 | 没有读它的接口条款【没有验证】 | 上限 100；中日文关键词本次因为命令行编码没有查成【没有验证】 |
| 审计机构的会员名录（BPA Worldwide） | bpaww.com | bpaww.com 现在跳转到 auditedmedia.com（Alliance for Audited Media）【实测】；会员名录没有打开【没有验证】 | — | — | 只有投放广告的英文刊物 |
| Mondo Times | mondotimes.com | **已经失效**：首页是建站默认页，/topics/ 返回 404【实测】 | — | — | — |
| 付费名录：Ulrichsweb、Cision、Gale Directory of Publications | — | 本次没有查【没有验证】 | 订阅 | 付费 | — |
| 中国、韩国、东南亚 | — | 没有找到公开的行业刊物名录；日本専門新聞協会的会员名单搜索没有找到【没有验证】 | — | — | 这是最大的缺口 |

**小结（估计）。** 世界上没有一份餐饮行业媒体的总名录。能数出来的只有国家一级：德国「酒店和餐馆」19 种、加上饮料和酒类共约 55 种行业刊物（fachzeitungen.de），日本 33 种（Fujisan，含特刊），英文世界 Curlie 记 27 个、Feedly 能搜到的在 100 个以上。按「有成规模行业出版业的国家约 40 个，每国 10–40 种」粗算，全世界约 **600–1,200 种**，这是推算，不是数出来的。几家名录之间差距很大：Wikidata 7 种，Curlie 英文 27 个，Wikipedia 列表 5 种，而德国一个国家就有几十种，说明通用的知识库在这一类上不能当全集用。**可行的做法是按国家找该国的行业出版协会或刊物目录**（德国已经找到；法国、英国、美国、日本、中国各自的名录这一轮没有查到可以整份读的）。

## 2. 餐饮行业协会和商会

| 全集来源 | 网址 | 规模 | 取得方式 | 条款 | 缺口 |
|---|---|---|---|---|---|
| HOTREC（欧洲酒店餐饮协会联合会）成员名单 | hotrec.eu/en/membership.html | **47 个协会，36 个国家**，每个都有网址【读页】 | 读一页 | 只读名单 | 只到国家一级；酒店协会和餐饮协会混在一起 |
| 世界加盟理事会（World Franchise Council）成员 | worldfranchisecouncil.net/members/ | **43 个国家的加盟协会**，另有 3 个地区联合会；包括中国、日本、韩国、马来西亚、新加坡、印尼、菲律宾、台湾【读页】 | 读一页 | 只读名单 | 每国一个 |
| Worldchefs（世界厨师联合会）成员协会 | worldchefs.org/members/ | 自称 100 多个国家的厨师协会；页面按地区列出协会名、会长、网址，读到的部分有 70 个（亚洲 21 个）【读页，页面没有读完】 | 读一页 | 只读名单 | 厨师协会，不是经营者协会 |
| 美国 National Restaurant Association 的州协会 | restaurant.org/About/NRA-Partners/State-Restaurant-Associations | 52 个（50 个州、华盛顿特区、波多黎各）【搜索摘录；我试的网址返回 404】 | 读一页 | 只读名单 | — |
| 德国 DEHOGA 各州分会 | dehoga.de/mitglied-werden | **17 个州分会**，各有网站；另有 2 个专业分会【读页】 | 读一页 | 只读名单 | 州以下的地区分会没有列 |
| 法国 UMIH、意大利 FIPE、西班牙 Hostelería de España | umih.fr、fipe.it、cehe.es | 法国 106 个省联合会（2025 年手册）；意大利 20 个大区、94 个地方协会、1,079 个基层代表处（2021 年手册）；西班牙 70 或 75 个（两个旧资料不一致）【搜索摘录】 | 各自网站 | — | 地方分会多数没有自己的内容 |
| **美国国税局免税组织名册（EO BMF）** | irs.gov/pub/irs-soi/eo1.csv 至 eo4.csv | 全部 1,964,958 个组织，其中行业团体（501(c)(6)）57,755 个；名称里有 restaurant、hospitality、lodging、hotel、tavern、licensed beverage、food service、catering、food truck 的 **462 个，覆盖 50 个州**（其中名称带 restaurant 的至少 122 个）；再加上 brewers、bakers、coffee、chefs、franchise 等共 662 个【实测，文件日期 2026-09-07】 | 直接下载 4 个 CSV，共 341 MB | 美国联邦政府数据 | 只有名称和地址，没有网址；名称不带这些词的协会查不到 |
| Specialty Coffee Association 各国分会 | sca.coffee | 「30 多个分会」【搜索摘录；分会页返回 404】 | — | — | 没有读到名单 |
| 日本生活衛生同業組合 | mhlw.go.jp（厚生劳动省资料） | 全国飲食業生活衛生同業組合連合会：40 个都道府县组合、85,000 名会员（2016 年资料）；喫茶飲食另有 29 个都道府县【搜索摘录】 | 各联合会网站 | — | 数字是 2016 年的；中华料理、社交饮食各有单独的联合会 |
| 中国的行业协会 | 民政部「中国社会组织政务服务平台」chinanpo.mca.gov.cn | 「餐饮协会 1,140 家，四川最多」（人民政协网转引企查查，口径和时间不明）；全国性行业协会商会脱钩名单 795 家【搜索摘录】。民政部平台本机连不上【没有验证】 | 平台按名称搜索 | 政府平台 | 多数地方协会没有网站（10/9 已经确认过港澳台的情况） |
| 马来西亚社团注册局、新加坡社团注册局 | eroses.gov.my、ros.mha.gov.sg | 马来西亚登记社团 95,694 个，分 11 类，其中有「商业」类（NST，2024 年 5 月）；新加坡行业协会 160 多个（新加坡中华总商会网站，没有日期）【搜索摘录】。eroses.gov.my 能打开，没有试搜索【没有验证】 | 网页搜索，没有整份下载 | 政府平台 | 没有按行业的名单 |
| Wikidata 行业协会 | query.wikidata.org | 行业协会 2,432 个、专业协会 2,277 个、雇主组织 353 个、商会 78 个；标了餐饮、住宿、烘焙、加盟行业的真协会约 **10 个**【实测】 | SPARQL | CC0 | 几乎没有填行业 |
| Wikipedia | en.wikipedia.org | 「Food industry trade groups」76 页；「List of food industry trade associations」83 个，餐饮相关 10 个；「Hospitality industry organizations」15 页；日文「日本の業界団体」177 页加 28 个子分类；法文「Organisation professionnelle en France」130 页【实测和读页】 | MediaWiki 接口 | CC BY-SA | 零散 |
| Curlie · Associations | curlie.org/en/Business/Hospitality/Associations | 英文 15 个（上次更新 2022-11-13），德文 23 个，法文 8 个，荷兰文 3 个，日文 2 个【读页】 | 整库下载 | CC BY 3.0 | 少而且旧 |
| 综合性协会名录 | verbaende.com（德国）、UIA 年鉴、Gale Encyclopedia of Associations、欧盟透明度登记册 | 德国约 15,000 个协会；UIA 8 万多个国际组织；Gale 美国全国性协会 27,000 个；欧盟登记册 17,269 个组织【全部是搜索摘录】 | 德国的可以网页搜索；UIA 和 Gale 付费；欧盟登记册的下载入口本次没有找到【没有验证】 | — | 都不是按餐饮行业分的 |

**小结（估计）。** 国家一级有现成的全集：欧洲 47 个（HOTREC）、加盟 43 个、厨师 100 多个，加上咖啡、烘焙、外烩、餐车各自的国际联合会，合起来全世界国家一级的餐饮类协会约 **600–1,000 个**（按约 195 个国家、每国 3–5 个推算）。地方一级只在少数国家数得出来：美国 462 个（国税局名册，实测）、法国 106 个、意大利 94 个、西班牙 70 多个、德国 17 个、日本 40 加 29 个、中国 1,140 个（口径不明），这七个国家合计约 2,000 个，全世界估计 **4,000–8,000 个**。出入：Wikidata 只有约 10 个，Wikipedia 约 10–15 个，Curlie 15 个，和联合会的成员名单差一到两个数量级，所以这一类要**从上级联合会的成员名单往下走**，不要用通用的知识库。中国、马来西亚、新加坡没有可以整份取得的名单，只能在登记平台上按名称搜索。

## 3. 主管机构和公共机构

| 全集来源 | 网址 | 规模 | 取得方式 | 条款 | 缺口 |
|---|---|---|---|---|---|
| Codex Alimentarius 成员和联络点 | fao.org/fao-who-codexalimentarius/about-codex/members/en/ | **189 个成员**（188 个国家加欧盟），每个国家有详情页和联络邮箱【读页】 | 读页面，逐个国家打开详情页；没有下载 | 联合国机构页面 | 列的是联络点，不一定是管餐馆的机构；没有机构网址一栏 |
| INFOSAN（国际食品安全当局网络） | who.int | 页面没有写成员数，也没有公开名单【读页】 | — | — | 没有可用的名单 |
| 欧洲食品安全局的联络点和第 36 条机构名单 | efsa.europa.eu/en/partnersnetworks/eumembers | 联络点 29 个（27 个成员国加冰岛、挪威），观察员 8 个；第 36 条名单在另一个门户里，页面没有写数量【读页】 | 读页面 | 没有读 EFSA 自己的版权声明【没有验证】 | 只有欧洲 |
| 联合国统计司：各国统计局网站 | unstats.un.org/home/nso_sites/ | **199 个国家或地区**（非洲 51、美洲 37、亚洲 46、欧洲 46、大洋洲 19）【读页】 | 读一页 | 联合国页面 | 只有统计局 |
| GOV.UK 机构接口 | gov.uk/api/organisations | **1,267 个机构**【实测】 | 公开接口，分 64 页；各机构和搜索结果页的订阅地址这次没有试【没有验证】 | Open Government Licence v3.0：可以商用和改编，要注明来源，不含徽标、个人数据和第三方内容【读页】 | 只有英国 |
| 英国食品标准局：地方主管部门 | api.ratings.food.gov.uk/Authorities/basic | **363 个地方主管部门**【实测】 | 公开接口 | OGL | 只有英国 |
| 美国 Federal Register 机构接口 | federalregister.gov/api/v1/agencies | **473 个联邦机构**【实测】 | 公开接口；各机构公告的订阅这次没有试【没有验证】 | 美国联邦政府作品不受版权保护（17 U.S.C. §105(a)）【读页】；州和地方政府的不在此列，联邦网站上的第三方内容也不在此列 | 只有联邦 |
| 美国 FDA：各州零售和餐饮食品法规 | fda.gov/food/fda-food-code/state-retail-and-food-service-codes-and-regulations-state | 50 个州，**64 个主管部门**（14 个州有两个部门）【读页】 | 读一页 | 联邦政府页面；州的内容各有版权 | 没有县市一级 |
| 美国小企业发展中心（America's SBDC） | americassbdc.org | 近 1,000 个地方中心，有查找工具【读页】 | 查找工具 | 没有读条款【没有验证】 | 只有美国 |
| 各国的开放许可（见下表） | — | 本次核对了 9 个法域 | — | — | — |
| Wikidata：职责是食品安全的政府机构 | query.wikidata.org | 7 个【实测】 | SPARQL | CC0 | 几乎没有填 |
| Wikipedia「Food safety organizations」 | en.wikipedia.org | 86 页【实测】 | MediaWiki 接口 | CC BY-SA | 混有民间组织 |

**允许商业再利用的开放许可（本次核对的结果）**

| 法域 | 许可 | 能否商用和改编 | 适用范围要注意的地方 | 核对方式 |
|---|---|---|---|---|
| 美国联邦 | 17 U.S.C. §105(a)，联邦政府作品没有版权 | 可以 | 州和地方政府、承包商作品、第三方内容不在内；徽标要另外许可 | 【读页】law.cornell.edu、usa.gov |
| 英国 | Open Government Licence v3.0 | 可以，要注明来源 | 不含个人数据、徽标、第三方权利 | 【读页】 |
| 欧盟委员会 | CC BY 4.0（委员会 2011/833/EU 号决定） | 可以，要注明来源和改动 | 个别内容有单独的版权声明；第三方内容除外 | 【读页】 |
| 澳大利亚（FSANZ） | CC BY（页面写 4.0，链接指向 3.0 Australia） | 可以，要注明来源 | 每个机构各有版权页，要逐个看；徽标和第三方内容除外 | 【读页】 |
| 加拿大 | Open Government Licence – Canada | 可以，要注明来源 | 只适用于明确按此许可提供的信息，不是全部政府网页 | 【读页】 |
| 日本 | 公共データ利用規約（第 1.0 版，2024-07-05），与 CC BY 4.0 兼容 | 可以，要注明来源和加工情况 | 由各机关自己决定是否采用 | 【读页】digital.go.jp |
| 韩国 | 公共著作物自由利用许可（KOGL）第 1 类 | 可以，要注明来源；第 2、4 类不许商用 | 每件作品标自己的类型 | 【搜索摘录】kogl.or.kr 本机连不上 |
| 新加坡 | Singapore Open Data Licence v1.0 | 可以，要注明来源 | 只适用于数据集，不是政府网页的文章 | 【搜索摘录】 |
| 马来西亚 | Terms of Use Government Open Data 1.0 | 可以，要注明来源 | 只适用于开放数据；data.gov.my 的条款页我试的网址返回 404，「CC BY 4.0」的说法只见于第三方 | 【搜索摘录】 |

**小结（估计）。** 没有一份「全世界管餐饮的政府机构」名单，但有几份按国家排好的骨架：Codex 189 个国家、联合国统计司 199 个统计局。和小餐饮店有关的国家一级机构每国大约 5 个（食品安全、劳工和最低工资、小企业辅导、统计、税务或执照），全世界约 **1,000 个**；地方一级数量很大（美国州一级 64 个、英国 363 个），不值得逐个接。**条款最容易通过的子集很小而且明确**：美国联邦、英国、欧盟委员会、澳大利亚（这次只核对了 FSANZ 一家）、加拿大（明确标了许可的部分）、日本（采用了公共数据利用规约的机关），合计约 50–100 个机构；这个数字是按每个法域 5–15 个相关机构推算的。名录之间的出入：Wikidata 只有 7 个，Wikipedia 86 页里一半是民间组织。最低工资和劳工主管部门的国际名单（国际劳工组织）这一轮没有查。

## 4. 给餐饮店提供服务的公司和它们的博客

| 全集来源 | 网址 | 规模 | 取得方式 | 条款 | 缺口 |
|---|---|---|---|---|---|
| G2 · Restaurant POS | g2.com/categories/restaurant-pos | 458 个列表；同一类目的统计栏写 491 个产品（2026 年 8 月）【搜索摘录】 | **对脚本返回 403**【实测】；只能人工翻页（约 31 页） | 没有读到条款【没有验证】 | 餐饮管理、在线点餐、订位、库存等类目的数量没有查到 |
| Capterra · Restaurant POS、Food Delivery | capterra.com/restaurant-pos-software/ | 餐饮收银 349 个产品（14 页）；外卖配送 207 个（9 页）【搜索摘录】 | **对脚本返回 403**【实测】 | 同上 | 餐饮管理、外烩、烘焙类目没有查到数量 |
| GetApp、Software Advice、TrustRadius、SourceForge、Slashdot | — | 没有取得数量 | **全部返回 403**【实测】 | — | — |
| Curlie · Hospitality/Software | curlie.org/en/Business/Hospitality/Software | 197 个：收银 40、库存 17、酒吧库存 5，其余是酒店和旅行；德文「Informationstechnik」86 个（上次更新 2026-01-11）【读页】 | 整库下载 | CC BY 3.0 | 不全，旧公司多 |
| Curlie · Food Service · Tools and Equipment | curlie.org/en/Business/Hospitality/Food_Service/ | 设备和用具 415 个，批发 13 个，外烩 48 个；德文 442 个【读页】 | 整库下载 | CC BY 3.0 | — |
| 展会参展商名单 | 上海 HOTELEX、美国 NRA Show、汉堡 Internorga、米兰 HostMilano、NAFEM | HOTELEX 2026：4,018 家；NRA Show 2026：约 2,000 家（主办方会前的数字）；Internorga 2026：1,200–1,300 家（两个官方数字不一致）；HostMilano 2023：2,000 多家；NAFEM 2025：600 多家【全部是搜索摘录】 | 各展会网站的参展商目录 | 没有读各展会的条款【没有验证】 | 多数参展商没有持续更新的内容 |
| 收银系统的合作伙伴目录 | pos.toasttab.com/partners、Square App Marketplace、deliverect.com/integrations | Toast：250 多个伙伴、200 多个集成；Square：两份目录合计近 1,000 个（PYMNTS，2026 年 2 月），第三方统计应用 438 个；Deliverect 的数字互相矛盾（91、126、300 多、1,000 多）【搜索摘录】 | 读目录页 | — | 只有美国和欧洲的系统 |
| Wikipedia 分类 | en.wikipedia.org | 「Point of sale companies」53 页；「Online food ordering」79 页【实测】 | MediaWiki 接口 | CC BY-SA | 只有知名公司 |
| 投资数据库（Tracxn、Crunchbase、CB Insights） | — | 没有查到当前数量【没有验证】 | 付费或登录 | — | — |

**小结（估计）。** 软件厂商的全集在评测目录里：只算餐饮收银一类，G2 是 458–491 个，Capterra 是 349 个，两家差约 100 个；各类目（管理、点餐、订位、排班、库存）互相重叠，去重后全世界面向餐饮的软件厂商估计 **800–1,500 家**。设备、食材、包装供应商的全集是展会参展商名单，几个大展合计去重后估计 **5,000–8,000 家**。这两个数字都是推算。**这一类的全集取得成本高**：评测目录不让脚本读，只能人工翻页；而且 10/2 接入 426 家日本企业新闻稿的教训已经说明，公司数量多不等于必看的内容多。更省事的做法是先只取每个类目评价数排在前面的几十家，按「博客近两周标题」这把尺子筛。

## 5. 餐饮企业自己的新闻室和博客

| 全集来源 | 网址 | 规模 | 取得方式 | 条款 | 缺口 |
|---|---|---|---|---|---|
| **Wikidata：连锁餐厅（Q18534542 及子类）** | query.wikidata.org | **2,716 个，有官网的 2,288 个**；美国 803、日本 218、英国 135、加拿大 109、韩国 95、法国 89、中国 75、荷兰 57、台湾 55、澳大利亚 50、德国 48、菲律宾 32、印尼 21、新加坡 15、马来西亚 10、泰国 10，另有 486 个没有填国家；行业属性填了餐饮的公司 1,164 个（有官网 955 个）；其中在交易所上市的 118 个【实测】 | SPARQL，一次查询取得全表和官网 | CC0 | 东南亚少；官网不等于有新闻室 |
| Wikipedia 列表和分类 | en.wikipedia.org/wiki/List_of_restaurant_chains | 总表约 310 个，另有美国、加拿大、澳大利亚、印度、爱尔兰、菲律宾、波兰 7 个国别列表；「Restaurant chains by country」43 个子分类；日文「日本の外食事業者」**807 页**；德文「Betrieb der Systemgastronomie」219 页；中文「中国连锁餐厅」60 页、「台灣連鎖餐廳」42 页、「马来西亚连锁餐厅」5 页；韩文 25 页；法文 44 页【实测和读页】 | MediaWiki 接口 | CC BY-SA | — |
| 美国证交会 EDGAR：行业代码 5812（餐饮场所） | sec.gov/cgi-bin/browse-edgar?action=getcompany&SIC=5812 | **482 个登记人**（历年累计，含已经退市的）【实测】 | 公开接口，分页 | 美国联邦政府数据 | 只有美国；多数已经不活跃 |
| CompaniesMarketCap · 连锁餐厅 | companiesmarketcap.com/restaurant-chains/… | 上市公司 73 家，17 个国家【读页】 | 读一页 | 没有读条款【没有验证】 | 只有大公司 |
| 韩国公平交易委员会的加盟信息公开系统 | franchise.ftc.go.kr | 2025 年底：加盟总部 9,960 个、品牌 13,725 个，其中**餐饮品牌 10,886 个**【搜索摘录，Newsis 和 Dailian 的报道】；网站能打开，靠脚本加载，没有试查询【没有验证】 | 网页查询 | 政府平台 | 只有韩国；多数是很小的品牌 |
| 日本加盟连锁协会的年度统计 | jfa-fc.or.jp | 2024 年度 1,291 个连锁、254,478 家店【搜索摘录，日本食糧新聞】 | 只有统计数字 | — | 外食业的连锁数这次没有查到 |
| 美国加盟品牌 | FRANdata | 4,000 多个品牌【搜索摘录】 | 付费 | — | — |
| 澳大利亚加盟信息披露登记册 | franchisedisclosure.gov.au | 1,498 个加盟方（2022 年 12 月）【搜索摘录】；网站能打开，首页没有写数量和许可【读页】 | 网页搜索 | 政府平台 | 数字是 2022 年的 |
| Curlie · Restaurant Chains、Food and Drink Franchises | curlie.org | 连锁餐厅 505 个，餐饮加盟 69 个【读页】 | 整库下载 | CC BY 3.0 | — |

**小结（估计）。** 这一类有现成而且可以整份取得的全集，Wikidata 最好用（2,288 个带官网）。几家之间的出入来自口径：Wikipedia 英文总表约 310 个、Wikidata 2,716 个、日文维基单是日本就有 807 个、韩国登记的餐饮加盟品牌 10,886 个，所以「连锁品牌」全世界有**几万个**，其中有一定规模、有官网的约 **2,000–3,000 个**，上市的约 **100–500 家**（CompaniesMarketCap 73、Wikidata 118、美国证交会历年 482）。但这一类对小店经营者的用处最小（10/2 的教训），建议只把它当作日报的补充，从上市公司和各国前几十名连锁取起。

## 6. 学术和教育

| 全集来源 | 网址 | 规模 | 取得方式 | 条款 | 缺口 |
|---|---|---|---|---|---|
| **DOAJ（开放获取期刊目录）** | doaj.org/api/search/journals/… | 全部期刊 23,584 种，其中许可正好是 CC BY 的 12,260 种。美国国会图书馆分类「Hospitality industry. Hotels, clubs, restaurants, etc. Food service」下 **31 种，CC BY 的 15 种**；关键词 hospitality、tourism、gastronomy、food service、culinary、restaurant 任一命中的 **197 种，CC BY 的 84 种**（hospitality 64 种里 31 种，tourism 184 种里 77 种，gastronomy 12 种里 3 种）。文章：标题含 restaurant 的 917 篇，标题含 restaurant、foodservice、food service、cafe、bakery 任一的 3,912 篇【实测】 | 公开接口，不用登录；整库下载这次没有试【没有验证】 | 每种期刊各有许可，目录里写明；DOAJ 自己的元数据许可这次没有读【没有验证】 | 旅游类占多数，真正写餐馆经营的少；查许可要用 `bibjson.license.type.exact`，不加 exact 会把 CC BY-NC 也算进来 |
| **OpenAlex** | api.openalex.org | 标题含 restaurant 的论文 42,315 篇，开放获取的 18,640 篇，**CC BY 的 4,434 篇**，其中 2023 年以后的 2,372 篇；名称含 hospitality 的期刊 209 种，在 DOAJ 里的 17 种【实测】 | 公开接口，可以按许可、年份、主题过滤 | OpenAlex 的数据许可这次没有读【没有验证】 | 论文对小店经营者是否有用要抽样看 |
| 美国 IPEDS（经 Urban Institute 的教育数据接口） | educationdata.urban.org/api/v1/college-university/ipeds/completions-cip-6/2021/ | 2021 年在 10 个专业代码下至少授予过 1 个学位或证书的院校 **811 所**（去重）：酒店管理 52.0901 有 370 所，厨艺 12.0503 有 373 所，餐饮管理 12.0504 有 124 所，餐厅和食品服务管理 52.0905 有 49 所【实测】 | 公开接口，分页 | 美国联邦政府数据 | 只有院校代码，网址要另外对；只有美国 |
| 酒店管理院校的国际名单 | QS 学科排名、EUHOFA、ICHRIE | QS 2026「酒店与休闲管理」上榜约 170–175 所，参评 1,500 多所；EUHOFA 约 200 个成员；ICHRIE 368 所院校（来源不可靠）【搜索摘录】 | 各自网站 | 没有读条款【没有验证】 | 三家口径不同 |
| 美国厨艺教育认证（ACFEF） | acfchefs.org | 376 所院校的 430 个专科以上课程（没有日期）【搜索摘录】 | — | — | 数字旧 |
| 美国赠地大学和推广服务（extension） | nifa.usda.gov/grants/land-grant-university-website-directory | 目录存在，按 1862、1890、1994 三类筛选，每所有网址；页面只读到 1890 一类的第 1 页，总数没有取得【读页，没有数全】 | 读分页 | 联邦政府页面；各大学的内容各有版权 | 没有「餐饮创业指南」这一维度，要逐所大学找 |
| Wikidata：烹饪学校 | query.wikidata.org | 63 所，有官网 51 所【实测】 | SPARQL | CC0 | 极少 |
| Curlie · Education and Training、Culinary Institutes | curlie.org | 56 个和 23 个【读页】 | 整库下载 | CC BY 3.0 | 少 |

**小结（估计）。** 这一类的全集最干净：开放获取期刊用 DOAJ（CC BY 的相关期刊 **84–197 种**，严格按分类只有 15 种），论文用 OpenAlex（标题含 restaurant 的 CC BY 论文 **4,434 篇**，2023 年以来平均每年约 600 篇），两家可以互相核对（OpenAlex 里名称含 hospitality 又在 DOAJ 的期刊 17 种，DOAJ 自己查 hospitality 是 64 种，差在 OpenAlex 只查了名称）。院校全世界约 **2,000–3,000 所**（美国 811 所实测；QS 参评 1,500 多所；EUHOFA 200 个成员），其中写给经营者看的公开内容主要在美国各州的推广服务，约 50–110 家，要逐所找，没有现成的名单。

## 7. 各国报纸和通讯社的餐饮、小企业栏目（只作参考）

| 全集来源 | 网址 | 规模 | 取得方式 | 条款 | 缺口 |
|---|---|---|---|---|---|
| GDELT 的新闻域名清单（2018 年 5 月版） | data.gdeltproject.org/blog/2018-news-outlets-by-country-may2018-update/MASTER-GDELTDOMAINSBYCOUNTRY-MAY2018.TXT | **189,545 个域名，241 个国家或地区**：美国 56,160、英国 14,892、俄罗斯 8,216、意大利 7,672、加拿大 7,331、德国 6,085、澳大利亚 6,022、印度 4,453、法国 4,138、中国 3,476【实测，已下载】 | 直接下载一个文本文件，5.6 MB | 没有读 GDELT 的使用条款【没有验证】 | 2018 年的；只有域名和国家，没有题材；域名含 restaurant、gastro、horeca、hospitality、cafe、bakery、chef 等词的 345 个，多数是无关的（如 cafebabel、cafef） |
| Wikidata：报纸、通讯社 | query.wikidata.org | 报纸 52,663 种，有官网的 9,131 种；通讯社 752 家【实测】 | SPARQL | CC0 | 八成没有官网；含已经停刊的 |
| Media Cloud 的来源目录 | mediacloud.org/media-cloud-directory | 目录页写「25,000 多个来源」，搜索摘录里它的其他页面写「60,000 多个」，**两处不一致**；每个国家分「全国性媒体」和「州和地方媒体」两组，也有按题材的集合【读页和搜索摘录】 | 网页目录；接口要申请密钥 | 没有读条款【没有验证】 | 没有看到行业媒体或餐饮的集合 |
| ABYZ News Links | abyznewslinks.com | 第三方资料说 15,400 多个链接（资料旧）【搜索摘录】；本机 http 和 https 都连不上【没有验证】 | 按国家分页 | — | 没有题材分类 |
| Kidon Media-Link | kidon.com/media-link | 第三方资料说 18,437 个【搜索摘录】；本机域名解析失败【没有验证】 | — | — | — |
| Common Crawl 的网络图和主机索引 | index.commoncrawl.org/graphinfo.json、commoncrawl.org/blog/introducing-the-host-index | 2026 年 7–9 月的网络图：**245,776,589 个主机、133,241,980 个域名**【实测】；主机索引每个抓取批次一行一个主机，约 7 GB，字段有各状态码的页数、robots 的取得情况、语言比例、排名【读页】 | 网络图直接下载；主机索引用 DuckDB 或 Athena 查 | 没有读使用条款【没有验证】 | **没有网页标题，也没有订阅链接**，只能按域名里的关键词和语言筛；要按标题或订阅筛，得自己处理 WAT 文件，量很大，这次没有试 |

**小结（估计）。** 报纸本身有全集（GDELT 约 19 万个域名，Wikidata 约 5 万种，老牌目录 1.5–1.8 万个，三者相差一个数量级，因为 GDELT 把博客和地方小站都算进来），但**没有任何一份名录记到「哪家报纸有餐饮或小企业栏目」**。这一类多数过不了条款，建议不投入：需要时按国家取发行量排在前面的十几家，人工看有没有栏目订阅。

## 附：跨类别的全集（播客、博客、订阅）

这一部分不在七类里，但本站现在的必看内容多数来自经营者的播客，所以单独列出。

| 全集来源 | 网址 | 规模 | 取得方式 | 条款 | 缺口 |
|---|---|---|---|---|---|
| **Podcast Index 的整库下载** | public.podcastindex.org/podcastindex_feeds.db.tgz | **4,734,025 个播客订阅**（文件日期 2026-10-04；网站的统计接口写 4,738,681），压缩 1.83 GB，解开是 5.1 GB 的 SQLite，字段有标题、订阅地址、网站、语言、集数、最新一集的时间、托管主机、分类、简介【实测，已下载】 | 直接下载；服务器上的文件上次修改是 2026-10-03 | 首页写明核心索引「永远免费，任何用途都可以」【读页】 | 关键词命中的含写给食客的节目，要人工或用模型再筛一遍 |
| Apple Podcasts 的搜索接口和排行榜 | itunes.apple.com/search、itunes.apple.com/us/rss/toppodcasts/… | 搜索每个词最多约 100 个：restaurant 100、gastronomie 99、飲食店 99、hostelería 95、horeca 49、restaurant owner 10；排行榜每个国家每个分类 200 个【实测】 | 公开接口 | 没有读接口条款【没有验证】 | 有上限，取不到全集 |
| Feedspot 的榜单 | bloggers.feedspot.com/restaurant_blogs、podcast.feedspot.com/restaurant_podcasts | 餐馆博客 90 个、餐馆播客 53 个、餐馆管理博客 20 个、餐饮服务博客 15 个、英国餐馆播客 6 个【搜索摘录】 | 读榜单页 | 条款页对脚本返回 403【没有验证】 | 每个榜几十个，是别人挑过的，不是全集 |
| Feedly 的订阅搜索接口 | 见第 1 类 | 每个词最多 100 个 | — | — | — |

**在 Podcast Index 里实际数出来的结果（脚本 `c:\tmp\universe-scripts\pi2.py`、`pi3.py`）**

- 关键词（restaurant、restaurateur、food service、hospitality、gastronomi-、Gastgewerbe、hostelería、ristora-、horeca、飲食店、飲食業、外食、餐飲、餐饮、외식、식당、restoran、ร้านอาหาร、nhà hàng、F&B）出现在**标题**里的：1,409 个；出现在标题或简介前 600 字里的：9,345 个。
- 其中**仍在更新的**（至少 10 集，最近 365 天有新的一集）：**1,703 个**（标题命中的 238 个）。
- 语言：英语 1,171、德语 118、法语 103、西班牙语 58、意大利语 48、日语 45、葡萄牙语 37、**中文 29**、荷兰语 25、捷克语 14；马来语 1、越南语 1。
- 托管主机：anchor.fm（Spotify）409、Buzzsprout 246、Spreaker 108、Podbean 79、Libsyn 72、Transistor 65、RSS.com 58、Captivate 49、Podigee 48、Megaphone 47、Acast 45、Omny 42、Ausha 38。
- 去掉本站已经按规则 3 不接的托管平台（Spotify 和 anchor.fm、Spreaker、Transistor、Riverside、SoundCloud、SoundOn、Substack）以后剩 **1,021 个**（标题命中的 140 个；分类里有 Business 的 318 个；英语 733、法语 84、德语 80、西班牙语 28、葡萄牙语 15、日语 14、中文 5）。
- 候选清单已经存成 `c:\tmp\universe-dl\podcastindex-restaurant-candidates.csv`（1,703 行，带订阅地址、语言、集数、主机、分类）。
- 对照：Feedspot 的餐馆播客榜 53 个，Apple 搜索一次约 100 个；本站现在接了 22 个播客。Podcast Index 的候选数是这些榜单的 20–30 倍，而且能直接看到托管主机，先把条款过不了的整批去掉。
- 局限：关键词是我定的，没有包括只在节目名里写 bakery、coffee shop、catering、food truck、chef、barista、pizzeria、開店 等词的节目（这些词在标题里另有 1,768 个命中，其中写给食客的更多）；简介命中的要再筛。

## 全集规模一览（估计值都标了「约」）

| 类别 | 全世界大约有多少 | 依据 | 能整份取得的部分 |
|---|---|---|---|
| 1 行业媒体 | 约 600–1,200 种 | 德国约 55 种、日本 33 种，按约 40 个国家推算 | 德国 114 种（要分页读）；Curlie 约 40 个 |
| 2 行业协会 | 国家一级约 600–1,000 个；连地方约 4,000–8,000 个 | 联合会成员名单；七个国家的地方分会合计约 2,000 个 | 国家一级约 200 个（HOTREC、加盟、厨师三份名单）；美国地方 462 个 |
| 3 主管机构 | 国家一级约 1,000 个 | 约 195 个国家，每国约 5 个 | 开放许可的法域 6–9 个，约 50–100 个机构 |
| 4 服务商 | 软件约 800–1,500 家；供应商约 5,000–8,000 家 | G2、Capterra 的类目数；大展参展商数 | 不能用脚本取；Curlie 约 600 个 |
| 5 餐饮企业 | 有官网的连锁约 2,000–3,000 个；品牌总数几万个 | Wikidata 2,716；韩国一国 10,886 | Wikidata 2,288 个带官网 |
| 6 学术和教育 | CC BY 期刊 84–197 种；院校约 2,000–3,000 所 | DOAJ 实测；美国 811 所实测 | 全部可以用接口取 |
| 7 报纸栏目 | 报纸约 2–5 万种；有餐饮或小企业栏目的没有数字 | GDELT、Wikidata、老牌目录 | 域名清单可以下载，栏目没有名录 |
| 附 播客 | 仍在更新的约 1,000–1,700 个 | Podcast Index 实测 | 全部，已经取下 |

## 实际跑过的 Wikidata 查询（端点 https://query.wikidata.org/sparql，2026-10-10）

```sparql
# 行业杂志：直接归类的数量和有官网的数量 → 1,657 / 1,056
SELECT (COUNT(DISTINCT ?i) AS ?n) (COUNT(DISTINCT ?w) AS ?withsite)
WHERE { ?i wdt:P31 wd:Q685935 . OPTIONAL { ?i wdt:P856 ?w } }

# 行业杂志按国家 → 法国 365、德国 161、美国 143 …
SELECT ?cLabel (COUNT(DISTINCT ?i) AS ?n)
WHERE { ?i wdt:P31 wd:Q685935 . OPTIONAL { ?i wdt:P495 ?c }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } }
GROUP BY ?cLabel ORDER BY DESC(?n) LIMIT 25

# 主题、领域、行业或体裁是餐饮住宿的行业杂志 → 7 种
SELECT ?i ?iLabel ?tLabel ?cLabel ?w WHERE {
  VALUES ?t { wd:Q104714944 wd:Q1495452 wd:Q41958 wd:Q777754 wd:Q171141 wd:Q1285245 wd:Q11707
              wd:Q274393 wd:Q30022 wd:Q171947 wd:Q10932402 wd:Q18534542 wd:Q5167149 wd:Q15816013 }
  ?i wdt:P31 wd:Q685935 .
  { ?i wdt:P921 ?t } UNION { ?i wdt:P101 ?t } UNION { ?i wdt:P452 ?t } UNION { ?i wdt:P136 ?t }
  OPTIONAL { ?i wdt:P495 ?c } OPTIONAL { ?i wdt:P856 ?w }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de,fr,ja,zh" } }

# 连锁餐厅（含子类）：总数和有官网的数量 → 2,716 / 2,288
SELECT (COUNT(DISTINCT ?i) AS ?n) (COUNT(DISTINCT ?j) AS ?withsite)
WHERE { ?i wdt:P31/wdt:P279* wd:Q18534542 . OPTIONAL { ?i wdt:P856 ?w . BIND(?i AS ?j) } }

# 连锁餐厅按国家
SELECT ?cLabel (COUNT(DISTINCT ?i) AS ?n)
WHERE { ?i wdt:P31/wdt:P279* wd:Q18534542 . OPTIONAL { ?i wdt:P17 ?c }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } }
GROUP BY ?cLabel ORDER BY DESC(?n) LIMIT 40

# 行业属性是餐饮的公司 → 1,164（有官网 955）；其中上市的（P414）→ 118
SELECT (COUNT(DISTINCT ?i) AS ?n) WHERE {
  VALUES ?t { wd:Q104714944 wd:Q41958 wd:Q777754 wd:Q11707 wd:Q18534542 } ?i wdt:P452 ?t }

# 各类协会的总数 → 行业协会 2,432、专业协会 2,277、雇主组织 353、商会 78
SELECT ?kLabel (COUNT(DISTINCT ?i) AS ?n) WHERE {
  VALUES ?k { wd:Q2178147 wd:Q1391517 wd:Q829080 wd:Q627272 wd:Q1123526 } ?i wdt:P31 ?k .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" } } GROUP BY ?kLabel

# 烹饪学校 → 63（有官网 51）；报纸 → 52,663（有官网 9,131）；通讯社 → 752；播客节目 → 9,857
SELECT (COUNT(DISTINCT ?i) AS ?n) WHERE { ?i wdt:P31/wdt:P279* wd:Q5167149 }
SELECT (COUNT(DISTINCT ?i) AS ?n) WHERE { ?i wdt:P31 wd:Q11032 }
SELECT (COUNT(DISTINCT ?i) AS ?n) WHERE { ?i wdt:P31 wd:Q192283 }
SELECT (COUNT(DISTINCT ?i) AS ?n) WHERE { ?i wdt:P31 wd:Q24634210 }
```

说明：对「行业杂志」不能加子类路径（`wdt:P31/wdt:P279*`），加了以后是 136,141，因为学术期刊（102,018）、开放获取期刊等在 Wikidata 里被挂成了它的子类。带标签服务、同时查多种类型的大查询会超时，要拆开。

## 读过的网址（全部在 2026-10-10）

**打开并读到内容的**

- https://query.wikidata.org/sparql （上面的查询）
- https://www.wikidata.org/w/api.php （查项目编号）；https://www.wikidata.org/wiki/Wikidata:Licensing
- https://en.wikipedia.org/w/api.php 、de、fr、ja、zh、ko 各语言的同一接口（分类的页数）
- https://en.wikipedia.org/wiki/List_of_restaurant_chains
- https://en.wikipedia.org/wiki/List_of_food_industry_trade_associations
- https://en.wikipedia.org/wiki/List_of_food_and_drink_magazines
- https://curlie.org/en/Business/Hospitality 及其下的 /Associations、/Software、/News_and_Media/、/Food_Service/
- https://curlie.org/de/Wirtschaft/Gastgewerbe/
- https://curlie.org/docs/en/rdf.html 、https://curlie.org/docs/en/license.html 、https://curlie.org/docs/en/help/getdata.html
- https://www.deutsche-fachpresse.de/markt-studien/fachpresse-statistik/
- https://www.fachzeitungen.de/ 、https://www.fachzeitungen.de/zeitschriften-magazine-essen-trinken-schlafen
- https://ndlsearch.ndl.go.jp/rnavi/business/post_102113
- https://www.fujisan.co.jp/cat100/cat3093/
- https://cloud.feedly.com/v3/search/feeds （10 个关键词）
- https://www.hotrec.eu/en/membership.html 、https://www.hotrec.eu/en/about-us/members.html
- https://www.worldfranchisecouncil.net/members/
- https://worldchefs.org/members/
- https://www.dehoga.de/ 、https://www.dehoga.de/mitglied-werden
- https://www.irs.gov/pub/irs-soi/eo1.csv 至 eo4.csv
- https://www.fao.org/fao-who-codexalimentarius/about-codex/members/en/
- https://www.who.int/groups/fao-who-international-food-safety-authorities-network-infosan/about
- https://www.efsa.europa.eu/en/partnersnetworks/eumembers
- https://unstats.un.org/home/nso_sites/
- https://www.gov.uk/api/organisations
- https://api.ratings.food.gov.uk/Authorities/basic
- https://www.federalregister.gov/api/v1/agencies
- https://www.fda.gov/food/fda-food-code/state-retail-and-food-service-codes-and-regulations-state
- https://americassbdc.org/about-us/
- https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
- https://commission.europa.eu/legal-notice_en
- https://www.usa.gov/government-copyright 、https://www.law.cornell.edu/uscode/text/17/105
- https://www.digital.go.jp/resources/open_data/public_data_license_v1.0
- https://www.foodstandards.gov.au/copyright
- https://open.canada.ca/en/open-government-licence-canada
- https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&SIC=5812 （分 5 页）
- https://companiesmarketcap.com/restaurant-chains/largest-restaurant-chain-companies-by-market-cap/
- https://franchisedisclosure.gov.au/
- https://doaj.org/api/search/journals/… 和 /articles/… （14 个查询）
- https://api.openalex.org/works 、/sources 、/topics
- https://educationdata.urban.org/api/v1/college-university/ipeds/completions-cip-6/2021/ （10 个专业代码）
- https://www.nifa.usda.gov/grants/land-grant-university-website-directory
- https://data.gdeltproject.org/blog/2018-news-outlets-by-country-may2018-update/MASTER-GDELTDOMAINSBYCOUNTRY-MAY2018.TXT
- https://mediacloud.org/media-cloud-directory
- https://index.commoncrawl.org/graphinfo.json 、https://commoncrawl.org/blog/introducing-the-host-index 、https://commoncrawl.org/web-graphs
- https://public.podcastindex.org/podcastindex_feeds.db.tgz 、https://podcastindex.org/api/stats 、https://podcastindex.org/
- https://itunes.apple.com/search 、https://itunes.apple.com/us/rss/toppodcasts/limit=200/genre=…/json

**打不开或被拒绝的（没有验证）**

- https://www.mondotimes.com/ （建站默认页）、/topics/ （404）
- http://www.abyznewslinks.com/ 、https://www.abyznewslinks.com/ （连不上）
- https://www.kidon.com/media-link/index.php （域名解析失败）
- https://www.bpaww.com/ （跳转到 https://auditedmedia.com/ ，没有读到会员名录）
- https://zdb-katalog.de/ （德国期刊数据库，被防爬程序 Anubis 拒绝）
- https://www.deutsche-fachpresse.de/mitglieder/ （404）
- https://www.capterra.com/restaurant-pos-software/ 、https://www.capterra.co.uk/directory/30011/restaurant-pos/software 、https://www.getapp.com/retail-consumer-services-software/restaurant-pos/ 、https://www.g2.com/categories/restaurant-pos 、https://www.softwareadvice.com/retail/restaurant-pos-comparison/ 、https://sourceforge.net/software/restaurant-pos/ 、https://slashdot.org/software/restaurant-pos/ 、https://www.trustradius.com/restaurant-pos （全部 403）
- https://restaurant.org/membership/state-restaurant-associations/ （404）
- https://sca.coffee/chapters （404）
- https://www.hospitalitynet.org/organization/ （404）
- https://www.feedspot.com/terms （403）
- https://www.kogl.or.kr/info/licenseType1.do （连不上）
- https://data.gov.my/terms-of-use （404）
- https://chinanpo.mca.gov.cn/ 、https://xxgk.mca.gov.cn:8445/ （连不上）
- https://archive.org/wayback/available （429，没有查到 Mondo Times 失效的时间）
- https://franchise.ftc.go.kr/ 、https://www.eroses.gov.my/ （能打开，没有试查询）

**只在搜索结果摘录里看到数字的**（表里已经标「搜索摘录」）：G2 和 Capterra 的类目数；各展会的参展商数；Toast、Square、Deliverect 的伙伴数；韩国公平交易委员会 2025 年加盟统计（Newsis、Dailian）；日本加盟连锁协会 2024 年度统计（日本食糧新聞）；FRANdata；澳大利亚登记册 1,498；UMIH、FIPE、Hostelería de España 的地方分会数；全国飲食業生活衛生同業組合連合会（厚生劳动省 2016 年资料）；中国餐饮协会 1,140 家（人民政协网）；马来西亚登记社团 95,694 个（NST）；新加坡行业协会 160 多个；verbaende.com、UIA、Gale 的规模；欧盟透明度登记册 17,269 个；Media Cloud「60,000 多个」；ABYZ 15,400、Kidon 18,437；QS、EUHOFA、ICHRIE、ACFEF 的数量；NRA 的 52 个州协会；SCA 的 30 多个分会；Feedspot 各榜单的数量；韩国、新加坡、马来西亚的开放许可。
