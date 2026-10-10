# 第三阶段：给餐饮店提供服务的公司写的经营指南博客（2026-10-11）

> 范围：计划 `myfnb/plan-2026-10-10-sources.md` 第 4 节的第 0–7 步，只做「服务商」这一类（收银和点餐系统、订位、外卖平台的商家学院、排班和工资、库存和成本、支付、餐饮会计、设备和食材供应商）。只做调研，没有改仓库里的文件，没有提交。
> 数字除标「估计」的以外都是这一轮数出来的。每个候选的结论在同目录的 `ledger-rows.tsv`（1,312 行），通过的在 `candidates.json`（14 个）。
> 内容尺子只看标题（订阅里最新的 12–15 条），由 Claude 判；拿不准的 5 个各打开一篇文章核对。条款读的是原文。
> 重跑：`sf-cats.mjs`、`sf-prod.mjs`、`gf.mjs`（目录）→ `mk-universe.mjs`（全集，对账本）→ `run-disc.mjs`（调用 `discover.mjs`、`discover2.mjs`）→ `feeds.mjs`（读订阅、记数）→ `view.mjs`（看标题，结论记在 `judged.tsv`）→ `check-sources.mjs`、`terms2.mjs`、`tread.mjs`（robots 和条款，结论记在 `verdicts.json`）→ `build.mjs`（出 `ledger-rows.tsv` 和 `funnel-counts.json`）。

## 1. 漏斗

| 步骤 | 数量 | 这一步出局或搁下的 |
|---|---|---|
| 全集（按域名去重） | 1,386 | 来源见第 2 节 |
| 账本已有，没有重查 | 74 | 67 个按网站域名对上，7 个的订阅落在账本已有的域名上（例如 SpotOn、Fourth、Lightspeed 主站） |
| 这一轮看的 | 1,312 | — |
| 有订阅（RSS 或 Atom 读得到） | 377 | 935 个没有，见 1.1 |
| 订阅有效（读得到、不少于 3 条；近 180 天不少于 3 篇，或订阅里不少于 50 条，或核实过旧文章总数不少于 50 篇） | 214 | 163 个：读不到或不足 3 条 19；停更或更新太少 144 |
| 标题和餐饮经营有关的不少于三成（程序按多语言关键词筛，结果抽看过） | 151 | 63 个：零售、酒店、物流、应用开发外包等，和餐饮经营无关 |
| 过内容尺子 | 70（强 29，一般 41） | 81 个不过：产品公告、客户案例、软件榜单、泛泛的清单占多数 |
| 强的 29 个：过 robots、拒绝 AI 的规则、TDMRep | 26 | 2 个出局：Qamarero（robots 拒绝 Google-CloudVertexBot）、Eleaty（订阅响应头带 tdm-reservation）；1 个待定：Sischef（`check-sources.mjs` 误判，见第 4 节） |
| 条款通过 | **14** | 12 个被条款或建站平台挡住，见 1.3 |

一般的 41 个按任务书没有往下查 robots 和条款，账本里记「待定」并写明比例。

这一轮看的 1,312 个里通过 14 个，约 1.1%；只算有有效订阅的 214 个是 6.5%。全集的大头是目录里的小软件公司，多数没有博客或只发产品文章。

### 1.1 没有订阅的 935 个

| 情况 | 数量 | 账本结果 |
|---|---|---|
| 没有订阅，有博客或新闻的列表页 | 412 | 待定（「没有订阅，有列表页 <地址>」；这一轮不做网页列表，内容没有判） |
| 没有订阅，首页也没有找到博客或新闻栏目 | 239 | 不接 |
| 连不上（域名解析不到 55、证书或 TLS 错误 44、连接被重置 21、超时 16、其他 4） | 140 | 不接；多数是目录里已经停业的小公司 |
| 页面对 MyFnBBot 返回 403（另有 401、405、406） | 87 | 不接；没有换标识，没有用代理 |
| 返回检查页（202）、限流（429）或服务器错误 | 39 | 不接 |
| 给的地址 404，从首页再找也没有 | 18 | 不接 |

被 403 挡住的 87 个里，点名清单里的占 48 个，多是大公司：Oracle Food and Beverage、Slice、Tock、KaTom、Nisbets、Dojo、Heartland、orderbird、helloCash、Sunday、Sapaad、Anota AI、Yooga，食材和设备一侧的 METRO（德国、法国、意大利）、Makro España、Assaí、Atacadão、Unilever Food Solutions（美国、巴西、西班牙、墨西哥）、Nestlé Professional、Ben E. Keith、Lusini、Ristoattrezzature，外卖平台的 iFood、Lieferando、Just Eat（英国、西班牙）、SkipTheDishes、foodpanda、PedidosYa、出前館、Yemeksepeti、ezCater。

### 1.2 按来源类型看（点名清单 346 个）

| 类型 | 点名 | 账本已有 | 通过 | 说明 |
|---|---|---|---|---|
| 软件和其他服务公司 | 265 | 47 | 4（Ágora、TeamSystem、GoPOS、Koust） | 这一轮看的 218 个里 101 个没有订阅、有列表页；内容强被挡住的有 Lightspeed 法国站、e2n、Yurest、Numier、The Fork CPAs、Restaurant Systems Pro、Ordermentum、Camarero10、tSpoonLab |
| 外卖平台的商家学院 | 30 | 6 | 0 | 这一轮看的 24 个：403 的 10 个，没有订阅的 8 个，连不上 3 个，有订阅的 3 个（Grubhub 只有平台公告，GrabMerchant、Swiggy 写给司机和食客）。**这一类没有一个可用的订阅** |
| 食材和设备供应商 | 51 | 2 | 0 | 403 的 21 个，没有订阅的 16 个；有订阅的 Gordon Food Service、Shamrock、Bidfood（播客）、Chef'Store、Prática、Transgourmet 不是公告就是菜谱和产品，最好的是 Chef'Store（一般，4/12）和 Prática（一般，4/16） |

其余 10 个通过的（Tiller、TypeMenu、Billzova、YUMA POS、Foodship、Genius Food Purchasing、Glimpse、FoxiFood、ExactPour、BarGuard）来自 SourceForge 和 Goodfirms 的目录，不在点名清单里。

### 1.3 通过的 14 个

| id | 来源 | 国家 | 内容 | 文章数 | 每 30 天 | 旧文章怎样取 |
|---|---|---|---|---|---|---|
| rss-agora-pos | Ágora 博客（收银系统） | 西班牙 | 强 7/9 | 240 | 约 9 | `/feed/?paged=N`，27 页，最早 2018-09 |
| rss-teamsystem-horeca | TeamSystem Horeca 杂志（收银和管理软件） | 意大利 | 强 9/15，约三成写酒店 | 约 290（估计） | 约 6 | `/magazine/horeca/feed/?paged=N`，20 页，最早 2015-10 |
| rss-gopos | GoPOS 博客（收银系统） | 波兰 | 强 9/10 | 约 470（估计） | 约 4 | `/blog/feed/?paged=N`，48 页，最早 2018-01 |
| rss-koust | Koust 博客（库存和成本软件） | 法国 | 强 8/10 | 287 | 约 3 | `/feed/?paged=N`，29 页，最早 2016-09 |
| rss-tiller | Tiller 博客（收银系统，已并入 SumUp） | 法国 | 强 8/10，2022-01 停更 | 法语约 244（接口报各语言合计 495） | 0 | `/fr/feed/?paged=N`，25 页，最早 2016-05 |
| rss-typemenu | TypeMenu 博客（外卖店线上点餐软件） | 英国 | 强 10/12 | 22 | 约 1.5，近 30 天 0 | 订阅不分页，22 篇全在里面 |
| rss-yumapos | YUMA POS 博客（收银系统） | 英国 | 强 7/10 | 29 | 约 10 | `/feed/?paged=N`，3 页，最早 2026-01 |
| rss-foodship | Foodship 博客（线上点餐和收银软件） | 澳大利亚 | 强 7/10 | 27 | 不到 1 | `/feed/?paged=N`，3 页，最早 2021-09 |
| rss-billzova | Billzova 博客（餐厅收银软件） | 印度 | 强 9/12，像成批生成 | 37 | 近 30 天 0（近 180 天 31） | 订阅不分页，37 篇全在里面 |
| rss-genius-food-purchasing | Genius Food Purchasing 博客（采购比价软件） | 美国 | 强 6/10 | 21 | 约 8 | `/feed/?paged=N`，3 页 |
| rss-glimpse | Glimpse 博客（酒吧和餐厅损耗监控） | 美国 | 强 7/10，2022-11 停更 | 148 | 0 | `/feed/?paged=N`，15 页，最早 2016-12 |
| rss-foxifood | FoxiFood 博客（线上点餐软件） | 美国 | 强 9/12，像成批生成 | 订阅 20；站点地图 /blog/ 下 129 个地址 | 约 17 | 订阅不分页，旧文章要从 `sitemap-en.xml` 取 |
| rss-exactpour | ExactPour 博客（酒吧库存软件） | 美国 | 强 8/12 | 12 | 近 30 天 0 | 订阅不分页，12 篇全在里面 |
| rss-barguard | BarGuard 博客（酒吧库存软件） | 美国 | 强 10/12 | 45 | 近 30 天 0 | 订阅不分页，45 篇全在里面 |

按国家：美国 5、法国 2、英国 2、西班牙 1、意大利 1、波兰 1、澳大利亚 1、印度 1。14 个都用 `check-sources.mjs`（结果在 `candidates-check.txt`）和 `vet-sources.ts --titles 10`（`candidates-vet.txt`）跑通过；订阅只有摘要的 8 个各抽 3 篇文章页（带全文的 6 个也抽了），都不用登录（`check-pass.log`）。

**主会话接之前要知道的**：

- 14 个里稳定更新、内容又经得起看的是前 4 个（Ágora、TeamSystem、GoPOS、Koust）和 YUMA POS、Genius Food Purchasing。Tiller 和 Glimpse 已经停更，只有存档价值。TypeMenu、Billzova、ExactPour、BarGuard 近 30 天没有新文章，文章总数只有 12–45 篇。
- Billzova、FoxiFood 的文章像是成批生成的（每天一篇、体例相同）。按任务书的尺子它们算具体做法（有步骤、有算例，各打开一篇核对过），但读者看到的质量要主会话自己再看一眼。ExactPour、BarGuard、Genius Food Purchasing、YUMA POS 也都是今年才开的博客。
- 「条款通过」对其中 12 个的含义是：公司的条款只管付费的软件服务，网站文章只有通用的版权行。Koust 和 Foodship 有通用的知识产权保留（不得复制、改编），按规则 4 判可以接。
- 部署以后服务器是否被挡（规则 6）没有查。

### 1.4 内容强、被 robots 或条款挡住的 15 个

| 来源 | 国家 | 内容 | 挡在哪里 |
|---|---|---|---|
| **Sischef** | 巴西 | 10/10，784 篇，每 30 天约 10 篇 | 实际没有挡：脚本误判，见第 4 节。**这一轮内容最好的一个** |
| **The Fork CPAs**（餐饮会计） | 美国 | 9/10，100 篇 | 条款：内容只供个人、非商业使用；不得用机器人、脚本访问 |
| **Restaurant Systems Pro**（David Scott Peters） | 美国 | 8/10，620 篇 | 条款禁止 spider、crawl、scrape |
| **Ordermentum**（订货平台） | 澳大利亚 | 7/10 是店主本人讲的店家故事 | 条款约束浏览者，禁止机器人、爬虫等自动手段 |
| **e2n**（排班软件） | 德国 | 7/10，134 篇 | Impressum：下载和复制只许私人、非商业使用（德国范本句） |
| **Yurest** | 西班牙 | 7/9 | 法律声明：复制、存储只许个人和私人使用 |
| **Lightspeed 法国站** | 法国 | 6/10 | 著作权准则：未先取得许可不得使用内容或做衍生作品。德国、荷兰、英国、澳大利亚各站同一份 |
| Qamarero | 西班牙 | 8/12，订阅 562 条 | robots 拒绝代用户读网页的 AI |
| Orders.co | 美国 | 8/12，订阅 420 条，像成批生成 | 条款：个人非商业使用，禁止自动访问 |
| COGS-Well（库存和成本） | 美国 | 8/12 | 建在 Wix 上 |
| Eleaty | 法国 | 8/12，8 月才开的博客 | TDMRep 保留 |
| Numier | 西班牙 | 6/10 | 法律声明：只许浏览和私人复制，其余用途禁止 |
| tSpoonLab | 西班牙 | 6/10，98 篇 | 法律声明：存储、复制都要明示同意 |
| Camarero10 | 西班牙 | 8/10，121 篇，已停更 | 法律声明：任何使用都要事先书面许可 |
| Waiterio | 英国 | 7/12，订阅 100 条，已停更 | 条款：自动化只能走有文档的接口或事先取得许可 |

**值得写信的**（加粗的 6 个条款类，按内容排）：The Fork CPAs、Restaurant Systems Pro、Ordermentum、e2n、Yurest、Lightspeed（法国站，一封信可以问全部国家站）。Qamarero 是 robots 的问题，要对方同意并说明读取身份，可以排在后面。

**一处要主会话定的读法**：西班牙网站的法律声明多是范本。账本里 Barra de Ideas 的那一种（禁止复制、修改、分发）判的是通用的保留权利，可以接。这一轮遇到三种更宽的写法：「任何使用都要事先书面许可」（Camarero10）、「存储要明示同意」（tSpoonLab）、「只许浏览和私人复制」（Numier、Yurest）。我按最低风险都判了不接。如果主会话认为前两种也属于通用的保留权利，Camarero10 和 tSpoonLab 可以改判，两个的 robots 都已通过。

## 2. 全集是从哪里取的

### 2.1 读到的目录

| 目录 | 地址 | 取到多少 | 备注 |
|---|---|---|---|
| SourceForge 软件目录 | `https://sourceforge.net/software/<类目>/`，翻完全部分页 | 24 个类目，去重后 **1,448 个产品** | 类目和条数：restaurant-pos 504、restaurant-management 466、online-ordering 249、food-delivery 213、restaurant-inventory-management 183、food-service-management 126、restaurant-reservations 117、bar-pos 115、catering 114、cafe-pos 91、food-safety 89、kitchen-display-systems 74、bakery 73、waitlist 59、restaurant-marketing 58、restaurant-scheduling 56、recipe-costing 43、pizza-pos 41、food-truck-pos 40、restaurant-accounting 39、cloud-kitchen-management 32、restaurant-crm 31、bar-inventory 29。另试了 36 个类目名都是 404（没有 food-costing、restaurant-payroll 这样的类目） |
| SourceForge 产品页（取公司名、国家、官网） | `https://sourceforge.net/software/product/<名>/` | 读了 **1,027 个**，1,019 个有官网，进全集 988 个域名 | 这个主机限流（连续请求后返回 429），按每 1.5 秒一个、遇到 429 停 90 秒读了约三个小时。**还有 421 个产品页没有读**：food-delivery 126、food-service-management 63、food-safety 63、catering 61、waitlist 36、bakery 29、restaurant-marketing 25、restaurant-crm 17、restaurant-scheduling 1。收银、餐厅管理、线上点餐、订位、库存、成本、会计、排班、酒吧、咖啡店这些类目读完了 |
| Goodfirms | `https://www.goodfirms.co/<类目>/` | 4 个类目，去重后 **300 个官网** | restaurant-pos-software 121、restaurant-management-software 129、catering-software 47、food-service-management-software 68；另试的 17 个类目名是 404。列表页直接给官网，没有国家。Node 的请求返回 403，curl 带同一个标识能读 |
| ITreview（日本） | `https://www.itreview.jp/categories/pos` | 页面写全 25 个产品，第一页读到 10 个产品名 | 产品页不给官网；予約台帳的类目地址没有找到（试的地址 404） |
| BOXIL（日本） | `/sc-pos_system/`、`/sc-orderentry_system/`、`/sc-mobile-order/`、`/sc-tenpo_kanri/` | 各读到 3–7 个产品名 | 列表由脚本加载，网页里只有排在前面的几个 |
| SoftwareSuggest（印度） | restaurant-pos-software、restaurant-management-software | 约 30 个产品名 | 不给官网 |
| Techjockey（印度） | restaurant-management-software、restaurant-pos-software | 42 个产品名 | 不给官网 |
| softwaredoit.es（西班牙） | TPV hostelería 一页 | 3 个产品名 | — |

Slashdot 的软件目录（`slashdot.org/software/restaurant-pos/`）读得到，和 SourceForge 是同一套数据，没有另读。Crozdesk（页面标题写 274 个产品）、SaaSworthy、SelectHub、B2B Stack（巴西）读得到页面，但官网藏在跳转后面或要逐个读产品页，这一轮没有做。

### 2.2 读不到的目录

| 目录 | 结果 |
|---|---|
| Capterra（美国站、巴西站、法国站）、GetApp（美国站、德国站）、Software Advice、G2、TrustRadius、SoftwareWorld | 脚本和网页读取工具都返回 403，一页也没有读到 |
| FinancesOnline、Capterra 德国站 | 没有响应 |
| appvizer（法国、德国、西班牙） | 503 或空页面 |
| OMR Reviews、trusted.de、systemhaus.com、softguide.de、comparasoftware.com、SoftwareReviews | 试的类目地址 404，没有找到正确的类目地址 |

G2 的餐饮收银类约 460–490 家（计划里的数），SourceForge 同一类目读到 504 个，量级相当；两边的重合度没法核对。

### 2.3 按国家和类型点名的 354 个（去重后 346 个域名）

日本、中国、东南亚、印度、巴西、德国、法国、西班牙的目录要么读不到，要么只给产品名不给官网，所以这些国家的候选，以及各国的外卖平台、食材和设备供应商，是 Claude 按类型逐国点名写的，**网址是 Claude 凭已知填的，没有名录出处**：软件和其他服务公司 269、食材和设备供应商 51、外卖平台的商家学院 34。按国家：美国 68、日本 37、巴西 25、法国 25、英国 19、西班牙 19、德国 18、澳大利亚 17、印度 12、中国 12、加拿大 11、韩国 8，其余 30 个国家和地区共 83。其中一部分地址 404 或连不上，说明填错或已经改版（404 的从首页重找过一遍，找回 7 个订阅）。

日本的 ITreview、BOXIL 和印度的两个目录读到的产品名里，只有 Claude 知道官网的写进了点名清单；印度约 50 个、日本约 10 个产品名没有进全集。中国没有读到任何名录，点名的 12 个（客如云、二维火、哗啦啦、美团、天财商龙、思迅、银豹、微盟、有赞、奥琦玮、饿了么商家学院）账本里已有 4 个，其余没有订阅或连不上。

全集的三个来源有重叠：SourceForge 988、Goodfirms 299、点名 346，合计 1,633，去重后 1,386。

## 3. 主要的发现

1. **这一类的可用量不在目录里的小软件公司，在少数认真写博客的公司。** 1,386 个里有有效订阅的 214 个，标题里具体做法过半的 29 个。目录里的小公司多数没有博客（没有订阅 935 个），有博客的多是「某某收银系统的 10 个好处」这类自家软件文章。
2. **博客写得好的公司，多数没有订阅。** 点名清单里没有订阅、有列表页的软件公司有 101 个，包括 7shifts 以外几乎所有专做成本、排班、库存的公司：Skello、Combo、Snapshift、Inpulse、Melba、Yokitup、Easilys（法国），Haddock、Gstock、Last.app（西班牙），gastromatic、DISH（德国），meez、BinWise、WISK、BlueCart、Homebase、Push Operations、Poached、Ottimate、BentoBox、ChowNow、Otter、Chowly（美国和加拿大），RotaCloud、Trail、Flipdish（英国和爱尔兰），Tanda、Now Book It、Cooking the Books、Zeller（澳大利亚），UpMenu（波兰），Parrot、Justo、Restaurant.pe、Loggro、Meitre（拉丁美洲），STORES、TableCheck、USEN 的 canaeru、freee、弥生（日本），Qashier、Oddle（新加坡）。这些的内容这一轮没有判（任务书规定不做网页列表）。**下一步的量在这里**：先对这 101 个的列表页抽标题判内容，强的再做条款，最后才写网页列表的配置。点名清单里没有订阅、有列表页的共 121 个，其中 9 个有 WordPress 接口（ChowNow、Sysco Foodie、Popina、Easilys、Revo、Last.app、Gstock、Trivec、味の素業務用）。
3. **外卖平台的商家学院和大型分销商这两类基本走不通。** 平台 30 个里（看的 24 个）没有一个可用的订阅（403、没有订阅、只有公告）；分销商和供应商 51 个里一半以上对机器返回 403，读得到的是公告、菜谱和产品推介。账本里此前对 DoorDash、Uber Eats、배민외식업광장、GoBiz、Wongnai 的结论相同。
4. **条款挡下的比例高：过了 robots 的 26 个强来源里 12 个不能用（46%）。** 三种写法各占一些：建站模板自带的条款（Termly 的「个人、非商业使用，禁止自动访问」：The Fork CPAs、Orders.co；Shopify 的「spider, crawl, or scrape」：Restaurant Systems Pro），各国的法律声明范本（德国 Impressum：e2n；西班牙 aviso legal：Yurest、Numier、tSpoonLab、Camarero10），公司自己写的（Lightspeed、Ordermentum、Waiterio）。通过的 14 个里 12 个是「条款只管软件服务、网站只有版权行」。
5. **非英语的好来源集中在西班牙、法国、巴西、波兰、意大利**：Ágora、Koust、GoPOS、TeamSystem 通过，Sischef 待定，Qamarero、Yurest、Numier、Lightspeed 法国站被挡。日本、韩国、中国、东南亚这一轮没有新的可用来源，原因是没有订阅或账本已有结论。
6. **今年新开的、成批生成的博客占了「强」的一部分**：Billzova、FoxiFood、BarGuard、ExactPour、Genius Food Purchasing、YUMA POS、Eleaty、Orders.co、Supaorder、Aedan Rose。标题和正文确实具体，但体例整齐、日更，接之前值得看质量。

## 4. `check-sources.mjs` 的一处误判（影响 Sischef，也影响上一轮的 ISME 和 ABF）

robots.txt 写成下面这样时，脚本会报「robots.txt disallows /feed/ for every crawler」，实际上 `*` 一组是不限制：

```
User-agent: *
Disallow:

User-agent: AdsBot
Disallow: /
```

原因：`groups()` 里空的 `Disallow:` 行没有记成规则（`&& v`），下一行 `User-agent` 判断「当前组还没有规则」就没有另开一组，把 `AdsBot` 并进了 `*` 这一组，于是 `Disallow: /` 被算到所有爬虫头上。按 RFC 9309，空的 Disallow 也是一条规则行，会结束 User-agent 的分组。

实测对上这个写法的：

- **Sischef**（`https://sischef.com/robots.txt`）：这一轮内容最强的来源，其余各项都通过（没有使用条款页，只有隐私政策；订阅带全文；`vet-sources.ts` 通过；784 篇，`/feed/?paged=N` 共 79 页）。脚本修好后重跑通过即可接，条目：

```json
{ "id": "rss-sischef", "name": "Sischef 博客（巴西 · 收银系统公司的博客）", "kind": "rss", "config": { "feedUrl": "https://sischef.com/feed/", "_aihot": { "initialBackfillLimit": 3 } }, "tier": "T2", "owner_entity_id": null, "participation_mode": "editorial", "interval_minutes": 720, "tags": ["巴西", "服务商"], "site_fulltext": false, "syndicate_fulltext": false }
```

- **ISME**（爱尔兰中小企业协会，`https://isme.ie/robots.txt`）和 **ABF**（巴西加盟协会）：上一轮「网站类·政府与协会」记的「robots 禁 /feed/」是同一种误判。ISME 当时内容过了尺子（约 9/10），值得重看；ABF 的内容本来就不过。加拿大烘焙协会没有复核。
- 账本里更早的「规则 1：robots.txt 不许抓 /feed/」（例如 Foodics）这一轮看了 Foodics 一个，它的 robots 现在不禁 /feed/，但写法不同，不能确定是不是同一个原因。建议脚本修好后把账本里所有「robots 禁 /feed/」的行重跑一遍。

这一轮没有改脚本（任务书规定不改仓库里已有的文件）。

## 5. 没有做完的部分

| 部分 | 数量 | 说明 |
|---|---|---|
| SourceForge 没有读产品页的 | 421 个产品 | 外卖配送、团餐管理、食品安全、外烩、烘焙、排队、营销和会员类。这些类目里通用软件多，按前面类目的比例估计能再出 0–3 个强来源（估计） |
| 没有订阅、有列表页的 | 412 个 | 内容没有判。点名清单里的 121 个（软件 101、供应商 14、平台 6）最值得先看，见第 3 节第 2 条；目录来的 291 个多是小公司的新闻页（估计，没有逐个看） |
| 内容一般、没有查 robots 和条款的 | 41 个 | 比例最高的：Supaorder 6/12，Sling、Rezku、ResDiary、Restaumatic、Floreant、Orgnyz、Schedules Made Simple、Budget Branders 5/10，Tabology 5/12，Kcms 5/12。按日报的尺子可以另看的：インフォマート的フーズチャネル（近 180 天 44 篇，行业新闻为主）、Back Office Accounting 的每周大宗食材价格报告、Zonal 的消费者调查、StaffAny 的新加坡经营者分享会纪要 |
| 被 403 挡住的 | 87 个 | 没有换标识；可以从服务器再试一次，但多数是内容分发网络按机器人规则挡的，服务器上多半一样 |
| 连不上或返回检查页的 | 179 个 | 域名解析不到和证书错误的 99 个多半是已停业或没人维护的公司（估计）；超时和连接被重置的 37 个可以从服务器再试 |
| 账本已有、按旧标准判的 | 没有逐个数 | 74 个账本已有的没有重查。其中一部分是 10/2 按「两周必看 0」判的（例如 iCHEF 台湾、Airレジ、Tenzo、Craftable），按现行的参考库尺子可能要重看 |
| 读不到的目录 | Capterra、G2、GetApp、Software Advice 等 | 见 2.2。要靠人工在浏览器里翻页抄名单，或者接受 SourceForge 和 Goodfirms 的覆盖 |
| 日本、印度目录里没有进全集的产品名 | 约 60 个 | 目录不给官网，要逐个找 |
| 中国和东南亚 | — | 没有读到任何名录或展会参展商名单；点名的都是已知的大公司，结论和账本此前一致（没有订阅、只推自家系统、连不上） |
| 规则 6 | 14 个 | 部署后约 30 分钟要查服务器是否被挡 |

## 6. 这一轮自己的局限

- 内容比例只按订阅里最新的 12–15 个标题判。打开文章核对的只有 5 个：Ordermentum、Waiterio、Billzova、Orders.co、FoxiFood。「一般」和「强」的分界（过半）在 5/10、6/10 附近是 Claude 的判断，Numier、Lightspeed 法国站、Genius Food Purchasing、tSpoonLab 都是 6/10。
- 「标题和餐饮有关的不到三成」这一步是程序按关键词筛的，筛掉的 63 个逐个看过前三个标题，另把 4 个可疑的（Snad、Prática、Glop、Zonal）拿回来人工判了。阿拉伯语、泰语、越南语的关键词不全。
- 更新门槛里的「旧文章总数不少于 50 篇」只对标题具体的 6 个查了 WordPress 接口（Camarero10 121、Restaurant Systems Pro 620、tSpoonLab 98、Tiller 495、Glimpse 148、Budget Branders 90）。其余「近 180 天不足 3 篇、订阅里不足 50 条」的 144 个直接判了不够更新，其中可能有旧文章多、标题一般的。
- 条款：每个强来源读了首页的法律类链接和常见路径下的页面，隐私政策和 cookie 政策只扫了关键词。「没有使用条款页」的两个（Ágora、Sischef）另查了 WordPress 的页面接口。Lightspeed 只读了法国站的服务合同、可接受使用政策和英文的著作权准则。
- 托管平台：通过的 14 个都是自建网站（其中 Koust、Genius Food Purchasing 的页面带 HubSpot 的统计脚本，网站本身不在 HubSpot 上）。订阅和文章以外的主机（图片等）没有涉及。
- 国家：SourceForge 的公司国家照产品页抄；Goodfirms 的没有国家，账本里写「国家未记」。FoxiFood 的运营方按条款写的是美国特拉华州的公司，Billzova 按网站自述是印度。
