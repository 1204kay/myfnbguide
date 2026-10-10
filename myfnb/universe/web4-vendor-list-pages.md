# 第三阶段后续：服务商的经营指南博客，没有订阅、只有列表页的（2026-10-11）

> 范围：上一轮（`../web3/`）搁下的 412 个「没有订阅、有博客列表页」里，点名的 121 个全部看完；其余 291 个里按公司类型（成本、排班、会计）另看了 10 个。共 131 个。只做调研和试配，没有改仓库里已有的文件，没有提交，没有开子代理。
> 每个候选的结论在同目录的 `ledger-rows.tsv`（131 行），通过的在 `candidates.json`（5 个），试配成功但待定的 3 个在 `trial.json`。
> 内容尺子只看标题（列表页最近 6–26 条，由 Claude 判）；通过的 5 个另各打开 1–2 篇读了正文。条款读的是原文，保存在 `terms/`。
> 所有请求都用 `MyFnBBot/1.0` 的标识，同一主机间隔 1.2 秒以上，没有用代理，没有用 Jina Reader。
> 重跑：`node get.mjs in1.tsv`（抓列表页到 `raw/`，标题在 `out1.txt`）→ `node t.mjs`、`insp.mjs`、`item.mjs`（看标题和页面结构）→ `node myfnb/check-sources.mjs`、`node tget.mjs`（robots 和条款）→ 写 `candidates.json` → `vet-sources.ts`、`detail-check.ts`、`dates.ts`、`peek.ts`（试抓、日期、正文）→ `node build.mjs`（出 `ledger-rows.tsv` 和 `funnel-counts.json`，每个候选的结论写在这个脚本里）。

## 1. 漏斗

实际的顺序和任务书略有不同：为了少写用不上的配置，「强」的先查 robots 和条款，过了的才写配置。表按实际顺序列。

| 步骤 | 点名的 121 | 另看的 10 | 合计 | 这一步出局或搁下的 |
|---|---|---|---|---|
| 全集 | 121 | 10 | **131** | — |
| 列表读得到（HTML 里有文章条目） | 76 | 7 | 83 | 48 个读不到，见 1.1 |
| 过内容尺子 | 34 | 4 | **38** | 45 个不过：产品、案例、榜单或与餐饮无关 42，内容对路但已停更且不足 50 篇 3（Melba、Yokitup、Traqfood） |
| 其中「强」 | 15 | 2 | **17** | 「一般」21 个记待定，没有往下查，见第 4 节 |
| 过 robots、拒绝 AI 的规则、TDMRep、403 | 15 | 1 | 16 | 0 个出局；SocialSchedules 先读条款出局，没有跑 robots |
| 条款通过（自己的条款和建站平台） | 6 | 1 | 7 | 自己的条款挡住 8，条款两处不一致待定 1（USEN canaeru），平台条款待定 1（Plateform，Framer），见第 3 节 |
| 配置试抓成功（标题、链接、日期都对，三篇正文读得到） | 4 | 1 | **5** | 2 个待定：Flipdish（列表只在 noscript 里，HTML 选择器读不到）、Loaded（没有发布日期） |

账本里的结果：接入 5、不接 87、待定 39。

点名的 121 个里通过 4 个（3.3%）；只算读得到列表的 76 个是 5.3%。「强」的 17 个里 10 个被条款或平台挡住（59%），比上一轮有订阅的那批（46%）更高。

### 1.1 列表读不到的 48 个

| 情况 | 点名 | 另看 | 说明 |
|---|---|---|---|
| 博客地址 404 或失效，从首页也没有找到博客 | 14 | 0 | Tevalis、Restoke、TMBill、Colibri、Linx Degust、GetIn、Tagme、CoverManager、Revo（并入 Cegid）、도도포인트（博客在 Naver）、Menulog、Mr D、posBoss（跳到停放页）、SlickPOS（网站被挂上博彩内容） |
| 地址不是文章列表（登录页、产品页、新闻稿入口、首页） | 13 | 2 | Cooking the Books、食べログ、Glovo、Deliveroo、Performance Foodservice、General Mills、Trivec、Chefs Culinar、Sligro、Transgourmet、キユーピー、UCC、微盟；Wave、Fincent |
| 列表由脚本生成，程序读不到（记待定） | 13 | 1 | BentoBox（跳到 blog.clover.com）、Poached、Resy、JJ Foodservice、Wolt、Restaurant.pe、Meitre、Yoco、foodpanda 台湾、OmniWe、Olsera、Ocha、UTAK；clickBACON |
| 检查页、403、连不上 | 3 | 0 | Lavu（reCAPTCHA 检查页）、Oddle（403）、gastronovi（超时两次） |
| 已并入别家 | 2 | 0 | Snapshift（并入 Combo）、Foodbomb（并入 Ordermentum，上一轮已按条款不接） |

这一轮请求的列表页地址有 18 个返回 404（14 个是上一轮记的地址，4 个是我按常见路径改的）；从首页找回了 7 个真正的地址（Planday、Zelty、Grubtech、OmniWe、POS+、Wolt、Tilby），账本的网址栏写的是找回的地址。

### 1.2 内容不过的 45 个

| 原因 | 数量 |
|---|---|
| 自家产品、软件比较和榜单、客户案例占多数 | 20 |
| 不是写给餐饮店的（零售、各行业小企业、分销商、食品加工、食客） | 17 |
| 菜谱、新品和企业新闻稿，或只有 1 篇（食材、酒水和设备供应商） | 4 |
| 像成批生成（Ristomanager：每天一篇、70 页，题目都是收银功能） | 1 |
| 内容对路但已停更、总数不足 50 篇 | 3 |

点名清单里的供应商 14 个、外卖平台 6 个，没有一个过内容尺子：供应商是菜谱和新品（味の素、キユーピー、アサヒ、Sysco），平台的商家页面是脚本生成或没有文章。和上一轮的结论一致。

## 2. 通过的 5 个

| id | 来源 | 国家 | 内容 | 文章数 | 每 30 天 | 日期从哪里取 |
|---|---|---|---|---|---|---|
| `web-push-operations` | Push Operations 博客（餐饮排班和工资软件） | 加拿大 | 强 10/12 | 233 | 约 3 | 文章页上写的日期（选择器） |
| `web-parrot` | Parrot Software 博客（餐厅收银系统） | 墨西哥 | 强 10/18，另 3 篇经营者故事 | 110 | 6 月 12 篇，之后 1–2 篇 | 列表 |
| `web-shiftbase` | Shiftbase 博客（排班软件，英文，写给英国雇主） | 荷兰 | 强 12/20 | 370 | 5–6 月约 6 篇，6 月 26 日以后只有 1 篇公司消息 | 文章页的 meta |
| `web-abrahao` | Abrahão 博客（餐厅扫码点餐系统） | 巴西 | 强 6/10 | 809 | 约 1 | 文章页的 meta |
| `web-mise` | Mise 博客（餐厅菜品成本软件） | 加拿大 | 强 14/16 | 27 | 约 8，9 月 21 日以后没有新文章 | 列表 |

按国家：加拿大 2、墨西哥 1、荷兰 1、巴西 1。

核对结果（文件：`candidates-check.txt`、`candidates-vet.txt`、`candidates-detail.txt`）：

- `check-sources.mjs`：5 个都通过。
- `vet-sources.ts --titles 10`：5 个都抓取成功，标题正确。Parrot 和 Mise 的日期在列表上，vet 里有；另外 3 个列表不带日期，vet 显示「----------」，日期靠 `detail` 从文章页取，用 `detail-check.ts` 和 `dates.ts` 核对。
- 日期核对：Push Operations 12 篇（2026-06-02 到 10-08，和文章页上写的一致）；Shiftbase 14 篇；Abrahão 10 篇（2026-02-05 到 09-24，顺序和列表一致）；Parrot、Mise 各 3 篇。
- 正文：每个来源 3 篇，5,400–14,500 字符，都不用登录。

**主会话接之前要知道的**：

- **Push Operations 的日期不能用默认的读法。** 文章页 JSON-LD 的 `datePublished` 是 Webflow 批量发布的时间（12 篇里 8 篇都是 8 月 31 日），页面上写的才是真日期。配置里用了 `detail.publishedAtSelector` 加 `publishedAtAuthoritative`。以后做 Webflow 上的网页列表都要核对这一点。
- **Mise 像成批生成**：6 月 14 日开始每周两篇、体例整齐，9 月 21 日以后停了三周。正文有金额、比例和可以照抄的邮件范本，按尺子算具体做法，但读者看到的质量要主会话再看一眼。网站没有条款页也没有隐私政策页，公司地址也没有写（国家照上一轮目录记的加拿大）。
- **Shiftbase 写的是英国的用工规定**（病假工资、假期工资、Fair Work Agency），餐饮和零售都有；6 月 26 日以后没有新的文章，价值主要在已有的 370 篇。
- **Abrahão 和 Goomer 的关系没有核实**：页面有 Goomer 的广告位，文章和已接的 Goomer 博客不是同一批。
- **Parrot 的列表页每页只有 6 篇**，12 小时读一次够用；旧文章在 `?b6dd0898_page=N`。
- 「条款通过」对这 5 个的含义都是：公司的条款只管付费的软件，网站文章只有页脚的版权行（Mise 连条款页都没有）。
- 部署以后服务器是否被挡（规则 6）没有查。

## 3. 条款

### 3.1 两个平台的结论

| 平台 | 读的页面 | 对访问客户网站的人有没有条款 | 结论 |
|---|---|---|---|
| **Webflow** | 服务条款 https://webflow.com/legal/terms （2023-11-15 生效）；可接受使用政策 https://webflow.com/legal/aup （2026-10-06 生效） | 没有。服务条款管的是「your access to and use of the Sites and Platform」，Sites 指 webflow.com，Platform 指设计器、工作区、Site Plans 这些给客户用的软件；4.4 把访问客户网站的人定为客户的 End Users，写明「Webflow does not have a direct relationship with any of your End Users」。可接受使用政策「supplements Customer's … agreement」，「Unauthorized Automated Access」一条禁止用 page-scraping、robots、spiders 取「materials from the Platform or Webflow IP outside of what is intentionally made available」，客户发布的网页在条款里叫 Website Content，不是 Platform 或 Webflow IP | **可以接**。这一轮通过的 Push Operations、Parrot 建在 Webflow 上；待定的 Loaded 和「一般」里的 Cuboh、BinWise、WISK、Trail、me&u、Zenchef、Combo、Malou 也是 |
| **HubSpot** | 可接受使用政策 https://legal.hubspot.com/acceptable-use （2026-09-16 修订）；网站使用条款 https://legal.hubspot.com/website-terms-of-use （2026-04-14 修订）；客户服务条款 https://legal.hubspot.com/terms-of-service | 有一条按频率的限制。可接受使用政策「applies to the use of any product, service or website provided by us」，4.1(ii) 禁止自动程序「sends more request messages to our servers in a given period of time than a human can reasonably produce … (also for example, scraping or harvesting)」。网站使用条款里的「solely for your non-commercial, personal purposes」只适用于 HubSpot.com 和挂出这份条款的网站 | **可以接，条件是读取频率不超过人工浏览**（每 12 小时读一次列表、每次几篇文章符合）。和账本里 10/10 对 MarginEdge 的结论一致。这一轮建在 HubSpot 上的（Zelty 博客、Tilby 博客、Backbar）内容没有到「强」，没有用到 |

另外遇到 **Framer**（Plateform、Haddock、Tebi、Yoco）：服务条款 https://www.framer.com/legal/terms-of-service/ （2026-06-16）2.3 同样写 Framer 和客户的 End Users 没有直接关系；但可接受使用政策 https://www.framer.com/legal/acceptable-use-policy/ （2026-04-09）写「applies to every user of our platform」，并禁止用 robot、spider 等自动手段访问或复制「any portion of the platform or any content hosted by Framer」。它点到了「Framer 托管的内容」，又没有写明访问者算不算 user，和 Higher Logic 是同一类问题，**记待定，等主会话一并定**。

### 3.2 内容强、被条款挡住的 10 个

| 来源 | 国家 | 内容 | 挡在哪里 |
|---|---|---|---|
| **USEN canaeru** | 日本 | 15/20，每 30 天约 8 篇（估计），列表带日期 | 利用规约只许个人使用、禁止营利目的；编辑方针第 4 节又允许注明出处并加链接的引用和转载。两处不一致，记待定 |
| **Plateform** | 意大利 | 18/26，列表 250 篇 | Framer 的平台条款待定；文章页也没有发布日期 |
| **Inpulse** | 法国 | 17/23 | 法律声明：任何使用、复制都要事先许可 |
| **meez** | 美国 | 7/13 | 条款：内容只供个人、非商业使用；禁止 spider、robot、scraper |
| **RotaCloud** | 英国 | 8/13 | 网站使用条款：未取得许可不得把内容用于商业目的 |
| **DISH**（METRO 旗下） | 德国 | 8/12，列表带日期 | 通用使用条款 8.5：不许自动查询，禁止 Scraping；3.1 把博客算作平台内容 |
| **gastromatic** | 德国 | 6/7（列表页只有 7 篇） | Impressum：下载和复制只许私人、非商业使用（德国范本句，和上一轮的 e2n 相同） |
| Poster POS | 乌克兰 | 8/12，俄语 | 条款 3.4：禁止用自动手段访问网站的任何部分 |
| WebstaurantStore「Management & Operation」栏目 | 美国 | 约 20/30，88 篇 | 条款：只许个人、非商业使用；禁止 robot、spider |
| SocialSchedules | 美国 | 10/13，共 13 篇 | 条款 6.7：不得用 bots、spiders、scrapers 访问或收集 Platform（含网站）上的信息 |

**值得写信的**（按内容和成功的可能排）：

1. **USEN canaeru**（写给 canaeru 編集部）：编辑方针已经允许注明出处并加链接的引用和转载，只需要对方确认商业网站写摘要并链接原文也在其内。日本这一侧两轮下来没有一个可用的服务商来源，这是最接近的一个。
2. **Inpulse**（hello@inpulse.ai，法律声明里给的地址）：成本和库存的文章是这一轮法语里最好的。
3. **RotaCloud**（info@rotacloud.com，条款页给的地址）：条款本身的写法就是「取得许可后可以商业使用」。
4. **meez**（Meez Culinary Solutions Inc.，条款要求 express prior written permission）。
5. **DISH**（contact@dish.digital）和 **gastromatic**（Impressum 上的联系方式）：德国的两个，都是范本条款。
6. **Plateform**：如果主会话对 Framer 仍定为待定，可以直接请 Plateform 书面同意；同时问文章的发布日期能不能在页面上标出来。

Poster、WebstaurantStore、SocialSchedules 可以写，排在后面。

## 4. 「强」但配置没有过的 2 个，「一般」的 21 个

**配置没有过（配置在 `trial.json`，`check-sources.mjs` 和 `vet-sources.ts` 都跑通）：**

| 来源 | 内容 | 卡在哪里 |
|---|---|---|
| **Flipdish**（爱尔兰） | 14/24，多数是具名店主的做法（外卖店的损耗、订单结构、现金流、选址先试 60 天）；381 篇，每 30 天约 5 篇；robots 写 `ai-input=yes`；条款只管签约商家；网站自建 | 列表页的文章链接只在 `<noscript>` 里，框架的 HTML 选择器读不到（cheerio 把 noscript 的内容当文字）。页面自己用的接口 `https://www.flipdish.com/api/blog?lang=global` 用 `json_list` 能读，标题、链接、日期都对，三篇文章正文 5,700–10,700 字符。任务书规定这一轮只做 HTML 选择器的网页列表，所以记待定；**这是这一轮英文里内容最好的一个，建议主会话用 `json-flipdish` 接** |
| **Loaded**（新西兰） | 8/12（盘点、单品菜单试验、班次检查表、从亏损到 20% 净利）；108 篇；条款只管软件；Webflow | 列表和文章页都没有发布日期，试抓拿不到日期，更新频率无法核实 |

**一般（记待定，比例只按标题，没有查 robots 和条款）：** Homebase 8/22、ready2order 8/17、Cuboh 约 8/22（2025-01 以后没有新文章）、Planday 7/14、BinWise 7/20、Combo 7/16、Malou 7/17、Zenchef 9/24、Trail 6/16、Qashier 6/12（像成批生成）、me&u 5/22（基本停更）、Otter 4/13、Grubtech 4/15、Gastro-Hero 4/14（2024-11 停更）、WISK 3/9、Haddock 3/13、Gstock 3/11、Tilby 3/10、Zelty 2/5、Recipe Cost Calculator 3/9、ORQUEST 3/8。比例接近一半、值得主会话再看的是 Homebase、ready2order、Planday。

## 5. 这一轮的发现

1. **上一轮的估计偏高。** 上一轮写「下一步的量在这里」，点名的 121 个里实际读得到列表的 76 个，标题过半是具体做法的 15 个，最后通过 4 个。专做成本、排班、库存的公司确实写得好（meez、Inpulse、gastromatic、RotaCloud、Loaded、Push Operations、Shiftbase），但它们多数有自己的网站使用条款或法律声明。
2. **条款挡下的比例比有订阅的那批更高**（17 个强的里 10 个）。三种写法和上一轮相同：模板条款里的「个人、非商业使用，禁止自动访问」（meez、WebstaurantStore、SocialSchedules、Poster），各国的法律声明范本（gastromatic 的 Impressum、Inpulse 的 mentions légales、RotaCloud 的英国网站条款范本），公司自己写的（DISH、USEN）。
3. **Webflow 上的文章页，JSON-LD 的日期可能是批量发布的时间。** Push Operations 12 篇里 8 篇的 `datePublished` 都是同一天，页面上写的日期才对；Loaded 的站点地图 `lastmod` 也是批量时间。做 Webflow 的网页列表要拿页面上写的日期核对。
4. **框架读不到 `<noscript>` 里的链接。** Flipdish 给不运行脚本的访问者在 noscript 里放了完整的文章链接，框架用 cheerio 的默认读法，把这一段当文字，选择器选不到。没有改框架。
5. **`json_list` 读「8 Oct 2026」这种只有日期的英文写法时，用的是运行机器的时区。** 在这台机器（UTC+8）上 Flipdish 的日期被读成前一天 16:00（UTC），设了 `publishedAtUtcOffset` 也不起作用（`json-list.ts` 的 `toDate` 只有带时间而不带时区的写法才走 `parseLooseDate`）。服务器是 UTC 时结果正确。接 `json-flipdish` 时留意；要不要报给作者由主会话定。
6. **没有订阅不全是真的没有。** 这一轮顺手试了 RotaCloud（Ghost）的 `/blog/rss/`，是 404；没有系统地重找订阅。
7. **列表页不按时间排的情况没有遇到**：Abrahão、Push Operations、Shiftbase 的列表都是新的在前（Shiftbase 最前面两篇是置顶的公司消息）。

## 6. 没有做完的部分和局限

| 部分 | 数量 | 说明 |
|---|---|---|
| 其余 291 个里没有看的 | **281** | 只看了类型是配方和成本、排班、餐饮会计、库存和成本的 17 个里地址像博客的 10 个（出了 Mise 1 个）；这 17 个里另外 7 个上一轮记的地址是产品页、停用页或空的，没有去找真正的博客。剩下的 274 个是收银系统 121、餐饮管理软件 85、线上点餐 36、外烩软件 14、订位 11、厨房显示系统 6、外卖厨房管理 1，都来自 SourceForge 和 Goodfirms 的目录。按这一轮 10 个出 1 个、点名的 121 个出 4 个估计，再出 5–10 个（估计，目录里的小公司内容通常更弱） |
| 列表由脚本生成的 | 14 | 按任务书记待定，没有用浏览器或 Jina 去读。按公司类型值得再看的：Poached（餐饮招聘）、Restaurant.pe、Meitre；其余是外卖平台和东南亚的收银系统 |
| 等主会话定的 | 3 件 | Flipdish 用不用 `json_list` 接；Framer 的平台条款（决定 Plateform，并影响 Haddock）；USEN canaeru 的两处条款按哪一处读 |
| 「一般」的 | 21 | 第 4 节，没有查 robots 和条款 |
| 规则 6 | 5 | 部署后约 30 分钟查服务器是否被挡 |

局限：

- 内容比例只按列表页第一页的标题判，样本 6–26 条；gastromatic 只有 7 条，Zelty 只有 5 条，Parrot 另读了第 2、3 页凑到 18 条。「强」和「一般」的分界在 Shiftbase（12/20）、Abrahão（6/10）、Parrot（10/18）、meez（7/13）这几个上是 Claude 的判断。
- 打开正文核对的只有通过的 5 个和 Flipdish。Push Operations、Parrot、Shiftbase、Mise 的文章都带明显的搜索优化写法，是否有模型参与写作没有办法确认；判的依据是正文里有数字、步骤和具体场景。
- 文章总数取自各站的站点地图（Push Operations、Parrot、Shiftbase、Abrahão、Flipdish、Loaded），包含栏目页以外的全部 `/blog/` 地址，可能略多于实际文章数。Mise 没有站点地图，27 篇是列表页上数的。
- 「每 30 天几篇」按核对过日期的那十来篇算，Parrot 和 Shiftbase 近三个月明显放慢。
- 条款：每个「强」的来源读了页脚的法律类链接和站点地图里找到的条款页，隐私政策只扫了关键词。DISH 读的是德国站的通用使用条款 PDF（74 页，只读了第一部分的适用范围、第 3 条和第 8 条）。WebstaurantStore 的条款页 16 万字符，只读了使用条款里许可和禁止事项两段。
- Webflow 的服务条款页面标的生效日期是 2023-11-15，没有核对是否有更新的版本在别的地址。
- 国家照上一轮的记录；Shiftbase 公司在荷兰，内容写给英国；Mise 的公司地址网站上没有。
