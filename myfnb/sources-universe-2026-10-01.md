# 全球餐饮信息来源全集（快照：2026-10-01，第二版）

> 回答三个问题：全球到底有哪些来源；每个**能不能接**（守不守得住我们的接源规则）；**值不值得接**（对经营者有没有用）。
> 第一版（同日早些时候）按来源形式分 A–L；这一版按「离一手经营信息有多近」重新分成 12 类，并把状态拆成三栏。
> 标准见 `plan-2026-10-01.md` §4；接源的六条规则见 `HANDOFF.md` §5.4。数字都是 2026-10-01 本机实测，标了「快照」，会变。

## 总数（快照）

共 **392** 个来源（同一网站只算一次；平台、协会这类一行写了几家的，算一行）。

| 能不能接 | 个数 |
|---|---:|
| 可接 | 234 |
| 连不上 | 33 |
| 挡抓取 | 30 |
| 拒绝 AI 阅读 | 25 |
| 接入中 | 16 |
| 服务器也连不上 | 13 |
| 条款不许 | 9 |
| 服务器挡 | 7 |
| 停用 | 7 |
| robots 不许 | 7 |
| 无网站或只在社交平台 | 5 |
| 技术难 | 4 |
| 看接入方式 | 2 |

能接（可接 + 接入中）**250** 个，其中有 RSS 的 99 个。

| 值不值得接 | 个数 |
|---|---:|
| 待抽样 | 300 |
| 低 | 58 |
| 中 | 13 |
| 不相关 | 11 |
| 中高 | 6 |
| 高 | 3 |
| 不能用 | 1 |

**地区 × 类型**（格子里是个数，「·」是空格子；美国的行业媒体放在「全球」，因为它们报道的是全球连锁）：

| 地区 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 合计 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 全球（跨地区） | 2 | 8 | 9 | · | · | · | 8 | · | 23 | 31 | · | 4 | 85 |
| 全球（跨地区） · 连锁品牌与集团 | · | 30 | · | · | · | · | · | · | · | · | · | · | 30 |
| 全球（跨地区） · 平台与服务商 | · | · | 13 | · | · | · | · | · | · | · | · | · | 13 |
| 全球（跨地区） · 供应商与设备商 | · | · | · | 12 | · | · | · | · | · | · | · | · | 12 |
| 全球（跨地区） · 研究、数据与价格 | · | · | · | · | · | · | 13 | · | · | · | · | · | 13 |
| 全球（跨地区） · 商业地产与选址 | · | · | · | · | · | · | · | 5 | · | · | · | · | 5 |
| 东亚 · 中国大陆 | · | · | · | · | 3 | · | 2 | 1 | 8 | · | 10 | · | 24 |
| 东亚 · 香港、台湾 | · | · | · | · | 2 | · | · | · | 1 | · | 11 | · | 14 |
| 东亚 · 日本 | · | · | · | · | 1 | · | · | · | 10 | · | 3 | 1 | 15 |
| 东亚 · 韩国 | · | · | · | · | 2 | · | 1 | · | 3 | · | 3 | · | 9 |
| 东南亚 · 马来西亚 | · | · | 1 | · | 3 | 10 | · | · | · | · | 17 | · | 31 |
| 东南亚 · 新加坡 | · | · | · | · | 1 | 1 | · | · | · | · | 7 | · | 9 |
| 东南亚 · 泰国、越南、印尼、菲律宾 | · | · | · | · | 3 | · | 1 | · | 1 | · | 20 | · | 25 |
| 东南亚 · 柬埔寨、缅甸 | · | · | · | · | · | · | · | · | · | · | 6 | · | 6 |
| 南亚 | · | · | · | · | 3 | · | · | · | 4 | · | 7 | · | 14 |
| 中东与非洲 | · | · | · | · | 3 | 1 | · | · | 4 | · | 13 | · | 21 |
| 欧洲 | · | · | · | · | 13 | · | · | · | 26 | · | 7 | · | 46 |
| 美洲（美国以外） | · | · | · | · | 6 | · | · | · | 4 | · | 5 | · | 15 |
| 大洋洲 | · | · | · | · | 2 | · | · | · | 3 | · | · | · | 5 |

## 12 类来源

前 8 类是**一手**：当事人自己说的话。后 4 类是**二手**：别人替他们报道。作者的站（AIHOT）以一手为主（853 个信源里官方账号和官网占多数）；餐饮业的一手信息有很大一块在封闭平台里（第 1 类），所以我们比他更依赖第 9、10 类行业媒体。

| 类 | 名称 | 包括 |
|---:|---|---|
| 1 | 经营者本人 | 老板、厨师、店长自己发的内容：开店账本、复盘、做法（多在抖音、小红书、公众号、YouTube 等平台） |
| 2 | 连锁与集团 | 连锁品牌和餐饮集团的官方新闻室、投资者关系、上市公告 |
| 3 | 平台与服务商 | 外卖、支付、点餐收银、订位、招聘等平台的新闻室、行业报告、商家指南 |
| 4 | 供应商与设备 | 食材、调味、包装、厨房设备厂商的新闻与趋势报告 |
| 5 | 协会与商会 | 餐饮协会、商会、业者组织的公告、调查和诉求 |
| 6 | 政府与监管 | 跟餐饮经营有关的规定、税费、用工、食品安全、统计 |
| 7 | 研究与数据 | 市场研究、消费数据、食材与商品价格、点评与客流数据 |
| 8 | 商业地产 | 商铺租金、开关店统计、选址研究 |
| 9 | 餐饮媒体 | 写给餐饮经营者的行业媒体 |
| 10 | 品类媒体 | 咖啡、茶饮、烘焙、披萨、酒吧、团餐、设备等细分品类的专业媒体 |
| 11 | 综合商业媒体 | 综合或财经媒体的餐饮、消费栏目 |
| 12 | 新闻稿 | 新闻稿发布平台 |

展会与论坛不再单列：展会消息多是预告和回顾（按标准属于不看），有价值的发布会出现在行业媒体里。

## 三栏怎么读

**怎么接**

| 写法 | 意思 |
|---|---|
| RSS | 有订阅源，直接接 |
| 网页列表（要配） | 没有订阅源，要为这个网站写抓取规则（每个网站约 10–30 分钟，网站改版要跟着改） |
| 需授权或付费接口 | 内容在封闭平台里，见各行说明 |
| — | 还谈不到怎么接（不能接或网址不对） |

**能不能接**（按 `HANDOFF.md` §5.4 的六条规则；规则 2 用「精确解读」：只在拒绝代用户读网页的 AI 时才不接，只拒绝 AI 训练的照接）

| 写法 | 意思 | 对应规则 |
|---|---|---|
| 接入中 | 现在的 18 个信源（2026-10-01 第一批 20 个，2 个被服务器挡后暂停；见 `HANDOFF.md` §5.4） | — |
| 停用 | 原来接入、2026-10-01 改为全球定位后停用的马来西亚来源 | — |
| 可接 | 本机查过：robots.txt 读得到，不拒绝 AI 阅读。**条款和服务器两关接入前逐个再查** | 1、2、5 |
| 可接·只拒训练 | 同上，但点名拒绝了 AI 训练爬虫；按精确解读可接 | 2 |
| ·首页挡 | 首页对抓取返回 403，robots.txt 读得到；要看 RSS 或栏目页能不能读 | 5 |
| 拒绝 AI 阅读 | 拒绝代用户读网页的 AI，或写了 `ai-input=no` | 2 |
| robots 不许 | robots.txt 对所有爬虫关闭 | 1 |
| 挡抓取 | 首页和 robots.txt 都返回 403 | 5 |
| 连不上（从服务器复测） | 本机超时或连不上；可能只挡马来西亚的网络，要从新加坡服务器再试一次 | 5、6 |
| 服务器挡 | 2026-10-01 在正式服务器上返回 403 或 405 | 6 |
| 服务器也连不上 | 本机和正式服务器（新加坡）都连不上；这些多半只对中国大陆或本国开放，规则 6 不用代理绕 | 5、6 |
| 条款不许 | 使用条款禁止自动抓取、AI 使用，或只许个人使用 | 3 |
| 技术难 | 只有 PDF、要跑网页脚本、没有新闻列表 | — |
| 无网站或只在社交平台（消息见报道） | 找不到网站；它的消息会出现在别家的报道里 | — |
| 看接入方式 | 封闭平台，能不能接取决于授权和费用 | — |

**值不值得接**：取这个来源近 3 天的标题（不够就取最近 10 条），按 `plan-2026-10-01.md` §3 的「必看 / 可看 / 不看」逐条粗判（只看标题，会有误差），再看每天几条。「高」= 必看多；「中高」= 有必看、可看多；「中」= 可看为主；「低」= 必看可看都少；「不相关」= 不是写给餐饮经营者的；「待抽样」= 还没判。

## 空白什么时候填

| 空白 | 个数 | 什么时候、怎么填 |
|---|---:|---|
| 值不值得接：待抽样 | 300 | 方案第一步。有 RSS 的用订阅；网页列表的抓栏目页标题。先抽「能接」的 |
| 连不上（从服务器复测） | 0 | 方案第一步。用户在服务器上跑一条命令（清单在 `candidates-reach-2026-10-01.txt`，第一步前更新），十分钟 |
| 条款 | — | 只读「能接而且值得接」的来源的条款，接入前读。不值得接的不花时间读 |
| 首页挡 | 37 | 抽样时一起看 RSS 或栏目页能不能读 |

## 全球（跨地区）

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 1 经营者本人 | 抖音、快手、视频号、小红书、微信公众号、微博、B 站、TikTok、Instagram、Facebook（含群组）、YouTube、LinkedIn、X、Threads、Reddit、LINE、Naver 博客与 Cafe、日本 note、播客、Substack 与 Beehiiv | — | 抖音要创作者授权；YouTube 字幕只给视频主人；公众号和 X 可经付费第三方接口（作者的做法，费用与风险待评估）；note、Substack、Naver 博客多有 RSS（条款待查） | 看接入方式 | 待抽样 |
| 1 经营者本人 | X（推特）：餐饮业记者与分析师（如 Restaurant Business 主编 Jonathan Maze、华尔街日报餐饮记者 Heather Haddon、彭博的 Venessa Wong），各家行业媒体账号，日本的餐饮业者与顾问（待查） | x.com | 官方接口 2026-02-06 起按量计费，每读 1,000 条 5 美元（只能搜近 7 天，每月上限 200 万条）；框架内置的 X 抓取走第三方接口（SocialData 等，每 1,000 条约 0.2 美元），属于未经 X 授权的抓取，不合我们的规则 | 看接入方式 | 待抽样 |
| 2 连锁与集团 | 百胜（Yum!） | investors.yum.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 2 连锁与集团 | 百胜中国 | ir.yumchina.com | — | 服务器也连不上 | 待抽样 |
| 2 连锁与集团 | 达美乐 | ir.dominos.com | — | 连不上（从服务器复测） | 待抽样 |
| 2 连锁与集团 | 麦当劳 | corporate.mcdonalds.com | — | 挡抓取 | 待抽样 |
| 2 连锁与集团 | 瑞幸 | investor.lkcoffee.com | — | 连不上（从服务器复测） | 待抽样 |
| 2 连锁与集团 | 星巴克 | stories.starbucks.com | — | 挡抓取 | 待抽样 |
| 2 连锁与集团 | Jollibee Foods | jfc.com.ph | — | 连不上（从服务器复测） | 待抽样 |
| 2 连锁与集团 | RBI（汉堡王、Tim Hortons、Popeyes） | rbi.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 3 平台与服务商 | 7shifts（排班；Content-Signal 写明允许 AI 阅读） | 7shifts.com | 网页列表（要配） | 可接 | 待抽样 |
| 3 平台与服务商 | Foodics（中东收银） | foodics.com | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 3 平台与服务商 | foodpanda | foodpanda.my/newsroom | — | 连不上（从服务器复测） | 待抽样 |
| 3 平台与服务商 | Grab | grab.com/my/press | — | 停用（2026-10-01 改为全球定位） | 低：多为乘车与公益新闻 |
| 3 平台与服务商 | iCHEF 餐厅帮 | ichefpos.com | — | 拒绝 AI 阅读 | 待抽样 |
| 3 平台与服务商 | Owner.com、StoreHub 等厂商博客 | — | 网页列表（要配） | 可接 | 低：多为推广 |
| 3 平台与服务商 | Restaurant365 | restaurant365.com | 网页列表（要配） | 可接 | 待抽样 |
| 3 平台与服务商 | Square | squareup.com | 网页列表（要配） | 可接 | 待抽样 |
| 3 平台与服务商 | Toast（博客与行业报告） | toasttab.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 7 研究与数据 | Black Box Intelligence | blackboxintelligence.com | RSS | 挡抓取 | 待抽样 |
| 7 研究与数据 | CHD Expert | chd-expert.com | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 7 研究与数据 | Circana | circana.com | RSS | 可接 | 低：零售与包装食品为主 |
| 7 研究与数据 | Datassential | datassential.com | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 7 研究与数据 | Euromonitor | euromonitor.com | 网页列表（要配） | 可接 | 待抽样 |
| 7 研究与数据 | Lumina Intelligence（英国） | lumina-intelligence.com | RSS | 接入中 | 中：英国餐饮数据，每周约 1 条 |
| 7 研究与数据 | Mintel | mintel.com | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 7 研究与数据 | Technomic | technomic.com | 网页列表（要配） | 可接 | 待抽样 |
| 9 餐饮媒体 | Asia Food Journal | asiafoodjournal.com | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | Fast Casual | fastcasual.com | RSS | 条款不许（只许个人使用） | 中高：10 条里必看 1–2、可看 4 |
| 9 餐饮媒体 | Food & Beverage Asia | foodandbeverageasia.com | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | FoodBev Media | foodbev.com | RSS | 可接 | 不相关：包装食品与饮料厂商 |
| 9 餐饮媒体 | Foodservice Director | foodservicedirector.com | RSS | 可接·只拒训练 | 低：学校与机构团餐，食谱多 |
| 9 餐饮媒体 | FSR Magazine | fsrmagazine.com | RSS | 接入中 | 中：只收「专题」栏才值得 |
| 9 餐饮媒体 | Hospitality Net | hospitalitynet.org | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | Hospitality Technology | hospitalitytech.com | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | Inside Retail Asia | insideretail.asia | — | 拒绝 AI 阅读 | 待抽样 |
| 9 餐饮媒体 | just-food | just-food.com | RSS | 可接·只拒训练 | 低：包装食品厂商为主，偶有可看 |
| 9 餐饮媒体 | Modern Restaurant Management | modernrestaurantmanagement.com | RSS | 拒绝 AI 阅读 | 待抽样 |
| 9 餐饮媒体 | Nation's Restaurant News | nrn.com | RSS | 条款不许（只许浏览，不许其他任何使用） | 中高：10 条里必看 1、可看 5 |
| 9 餐饮媒体 | Nosh | nosh.com | RSS | 可接·首页挡 | 不相关：包装食品创业 |
| 9 餐饮媒体 | Pizza Marketplace | pizzamarketplace.com | RSS | 可接·只拒训练 | 低：多为促销与公益 |
| 9 餐饮媒体 | QSR Magazine | qsrmagazine.com | RSS | 可接·只拒训练·首页挡 | 低：10 条里必看 0、可看 2，其余是人事、颁奖、单店开张；要按栏目过滤 |
| 9 餐饮媒体 | QSR Media（澳洲、亚洲、英国） | qsrmedia.com / qsrmedia.asia | RSS 与网页列表 | 接入中（亚洲版与澳洲版） | 中：10 条里可看 4，人事与开张多 |
| 9 餐饮媒体 | Restaurant Business | restaurantbusinessonline.com | — | 条款不许 | 待抽样 |
| 9 餐饮媒体 | Restaurant Dive | restaurantdive.com | RSS | 条款不许（禁止用机器人与数据挖掘收集） | 中高：10 条里必看 1、可看 4，人事较多 |
| 9 餐饮媒体 | Restaurant Hospitality | restaurant-hospitality.com | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | Skift Table | skift.com | RSS | 可接 | 不相关：旅游业 |
| 9 餐饮媒体 | The Food Institute | foodinstitute.com | — | 拒绝 AI 阅读 | 待抽样 |
| 9 餐饮媒体 | Total Food Service | totalfood.com | RSS | 接入中 | 中高：多为经营文章 |
| 9 餐饮媒体 | Verdict Foodservice（GlobalData） | verdictfoodservice.com | RSS | 接入中 | 中：10 条里可看 6，每天不到 1 条 |
| 10 品类媒体 | 1851 Franchise | 1851franchise.com | 网页列表（要配） | 可接 | 待抽样 |
| 10 品类媒体 | AgFunder News | agfundernews.com | RSS | 可接 | 不相关：食品科技投资 |
| 10 品类媒体 | Bakery and Snacks | bakeryandsnacks.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 10 品类媒体 | Baking Business | bakingbusiness.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 10 品类媒体 | Bar & Restaurant | barandrestaurant.com | RSS | 可接·首页挡 | 低：近 7 天订阅没有新内容 |
| 10 品类媒体 | Barista Magazine | baristamagazine.com | RSS | 接入中 | 中：咖啡馆经营与趋势，每天不到 1 条 |
| 10 品类媒体 | Beverage Daily | beveragedaily.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 10 品类媒体 | BevNET | bevnet.com | RSS | 可接·只拒训练·首页挡 | 不相关：饮料品牌 |
| 10 品类媒体 | British Baker | bakeryinfo.co.uk | 网页列表（要配） | 可接 | 待抽样 |
| 10 品类媒体 | Comunicaffè International | comunicaffe.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 10 品类媒体 | Daily Coffee News | dailycoffeenews.com | RSS | 接入中 | 中高：咖啡业动态 |
| 10 品类媒体 | Drinks International | drinksint.com | — | 挡抓取 | 待抽样 |
| 10 品类媒体 | FE&S | fesmag.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 10 品类媒体 | FoodNavigator / FoodNavigator-Asia | foodnavigator-asia.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 10 品类媒体 | Foodservice Equipment Journal（英国） | foodserviceequipmentjournal.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 10 品类媒体 | Foodservice Equipment Reports | fermag.com | RSS | 接入中 | 中：人事与颁奖多，去掉后可用 |
| 10 品类媒体 | Franchise Times | franchisetimes.com | — | 拒绝 AI 阅读 | 待抽样 |
| 10 品类媒体 | Global Coffee Report | gcrmag.com | RSS | 服务器挡（403，已暂停） | 中：10 条里可看 6，咖啡连锁的国际扩张与数据 |
| 10 品类媒体 | Green Queen | greenqueen.com.hk | RSS | 可接 | 不相关：替代蛋白与包装食品 |
| 10 品类媒体 | Hotel F&B | hotelfandb.com | RSS | 可接 | 不能用：网站已被赌博广告占据 |
| 10 品类媒体 | Just Drinks | just-drinks.com | RSS | 可接·只拒训练 | 不相关：饮料与酒类厂商 |
| 10 品类媒体 | Perfect Daily Grind | perfectdailygrind.com | — | 连不上（从服务器复测） | 待抽样 |
| 10 品类媒体 | Pizza Today | pizzatoday.com | — | 挡抓取 | 待抽样 |
| 10 品类媒体 | PMQ Pizza Magazine | pmq.com | RSS | 服务器挡（403，已暂停） | 中高：10 条里必看 2–3（留人做法、经营故事）、可看 5 |
| 10 品类媒体 | Sprudge | sprudge.com | 网页列表（要配） | 可接 | 待抽样 |
| 10 品类媒体 | Tea & Coffee Trade Journal | teaandcoffee.net | 网页列表（要配） | 可接 | 低：RSS 为空 |
| 10 品类媒体 | The Spirits Business | thespiritsbusiness.com | — | 连不上（从服务器复测） | 待抽样 |
| 10 品类媒体 | The Spoon | thespoon.tech | 网页列表（要配） | 可接 | 低：一月一两条 |
| 10 品类媒体 | World Bakers | worldbakers.com | RSS | 可接 | 低：多为展会 |
| 10 品类媒体 | World Coffee Portal | worldcoffeeportal.com | — | 条款不许 | 待抽样 |
| 10 品类媒体 | World Tea News | worldteanews.com | — | 条款不许 | 待抽样 |
| 12 新闻稿 | Business Wire | businesswire.com | — | 挡抓取 | 待抽样 |
| 12 新闻稿 | GlobeNewswire | globenewswire.com | 网页列表（要配） | 可接 | 待抽样 |
| 12 新闻稿 | Media OutReach Newswire（亚洲） | media-outreach.com | — | 挡抓取 | 待抽样 |
| 12 新闻稿 | PR Newswire（要找餐饮分类） | prnewswire.com | 网页列表（要配） | 可接 | 待抽样 |

## 全球（跨地区） · 连锁品牌与集团

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 2 连锁与集团 | 港交所披露易（海底捞、蜜雪集团、古茗、茶百道等上市公告） | hkexnews.hk | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | 海底捞（中国） | haidilao.com | — | 连不上（从服务器复测） | 待抽样 |
| 2 连锁与集团 | 吉野家（日本） | yoshinoya-holdings.com | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | 美国证交会 EDGAR（美股上市连锁的正式公告） | sec.gov | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | 泉膳控股 Zensho（日本） | zensho.co.jp | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 2 连锁与集团 | 萨莉亚（日本） | saizeriya.co.jp | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | 寿司郎 Food & Life（日本） | food-and-life.co.jp | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | 丸龟制面 Toridoll（日本） | toridoll.com | — | 连不上（从服务器复测） | 待抽样 |
| 2 连锁与集团 | 星巴克投资者关系（美国） | investor.starbucks.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 2 连锁与集团 | 云雀 Skylark（日本） | skylark.co.jp | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | Alsea（墨西哥、拉美） | alsea.net | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | Americana（中东） | americanarestaurants.com | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | Arcos Dorados（拉美麦当劳） | arcosdorados.com | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | Berjaya Food（马来西亚星巴克） | berjayafood.com | — | 挡抓取 | 待抽样 |
| 2 连锁与集团 | CAVA（美国） | investor.cava.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 2 连锁与集团 | Chipotle（美国） | investor.chipotle.com | — | 连不上（从服务器复测） | 待抽样 |
| 2 连锁与集团 | CJ Foodville（韩国） | cjfoodville.co.kr | — | robots 不许 | 待抽样 |
| 2 连锁与集团 | Collins Foods（澳洲） | collinsfoods.com | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | Darden（美国） | investors.darden.com | — | 连不上（从服务器复测） | 待抽样 |
| 2 连锁与集团 | Devyani（印度肯德基、必胜客） | dil-rjcorp.com | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | Domino’s Pizza Enterprises（澳洲） | dominos.com.au | — | 挡抓取 | 待抽样 |
| 2 连锁与集团 | Jubilant FoodWorks（印度达美乐） | jubilantfoodworks.com | — | 挡抓取 | 待抽样 |
| 2 连锁与集团 | Minor Food（泰国） | minorfood.com | 网页列表（要配） | 可接 | 待抽样 |
| 2 连锁与集团 | Papa John’s（美国） | investors.papajohns.com | — | 连不上（从服务器复测） | 待抽样 |
| 2 连锁与集团 | QSR Brands（马来西亚肯德基） | qsrbrands.com.my | — | 连不上（从服务器复测） | 待抽样 |
| 2 连锁与集团 | Shake Shack（美国） | investor.shakeshack.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 2 连锁与集团 | Sweetgreen（美国） | investor.sweetgreen.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 2 连锁与集团 | Texas Roadhouse（美国） | investor.texasroadhouse.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 2 连锁与集团 | Wendy’s（美国） | ir.wendys.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 2 连锁与集团 | Wingstop（美国） | ir.wingstop.com | RSS | 可接 | 低：促销与财报预告 |

## 全球（跨地区） · 平台与服务商

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 3 平台与服务商 | 美团 | about.meituan.com | 网页列表（要配） | 可接 | 待抽样 |
| 3 平台与服务商 | Deliveroo | corporate.deliveroo.co.uk | — | 连不上（从服务器复测） | 待抽样 |
| 3 平台与服务商 | Delivery Hero | deliveryhero.com | — | 挡抓取 | 待抽样 |
| 3 平台与服务商 | DoorDash | about.doordash.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 3 平台与服务商 | Eternal（印度 Zomato） | eternal.com | 网页列表（要配） | 可接 | 待抽样 |
| 3 平台与服务商 | GoTo（印尼 GoFood） | gotocompany.com | 网页列表（要配） | 可接 | 待抽样 |
| 3 平台与服务商 | JobStreet（东南亚招聘） | jobstreet.com.my | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 3 平台与服务商 | Just Eat Takeaway | justeattakeaway.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 3 平台与服务商 | LINE MAN Wongnai（泰国） | lmwn.com | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 3 平台与服务商 | Swiggy（印度） | swiggy.com | 网页列表（要配） | 可接 | 待抽样 |
| 3 平台与服务商 | Talabat（中东） | talabat.com | 网页列表（要配） | 可接 | 待抽样 |
| 3 平台与服务商 | Uber Eats（Uber） | uber.com | 网页列表（要配） | 可接 | 待抽样 |
| 3 平台与服务商 | 배달의민족 Woowa（韩国） | woowahan.com | 网页列表（要配） | 可接 | 待抽样 |

## 全球（跨地区） · 供应商与设备商

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 4 供应商与设备 | 雀巢专业餐饮 Nestlé Professional | nestleprofessional.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 4 供应商与设备 | 味之素 | ajinomoto.com | 网页列表（要配） | 可接 | 待抽样 |
| 4 供应商与设备 | 星崎 Hoshizaki（制冰、冷藏） | hoshizaki.com | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 4 供应商与设备 | Electrolux Professional | electroluxprofessional.com | RSS | 可接 | 低：厂商自我宣传 |
| 4 供应商与设备 | Huhtamaki（餐饮包装） | huhtamaki.com | 网页列表（要配） | 可接 | 待抽样 |
| 4 供应商与设备 | Kerry（风味趋势） | kerry.com | — | 拒绝 AI 阅读 | 待抽样 |
| 4 供应商与设备 | McCormick 风味预测 | mccormickflavorforecast.com | — | 连不上（从服务器复测） | 待抽样 |
| 4 供应商与设备 | Middleby（厨房设备） | middleby.com | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 4 供应商与设备 | Rational（万能蒸烤箱） | rational-online.com | 网页列表（要配） | 可接 | 待抽样 |
| 4 供应商与设备 | Sysco（食材分销） | investors.sysco.com | — | 挡抓取 | 待抽样 |
| 4 供应商与设备 | Unilever Food Solutions（联合利华饮食策划） | unileverfoodsolutions.com | — | 挡抓取 | 待抽样 |
| 4 供应商与设备 | US Foods（食材分销） | ir.usfoods.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |

## 全球（跨地区） · 研究、数据与价格

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 7 研究与数据 | 国际咖啡组织 ICO 市场报告 | ico.org | 网页列表（要配） | 可接 | 待抽样 |
| 7 研究与数据 | 联合国粮农组织 FAO 食品价格指数 | fao.org | 网页列表（要配） | 可接 | 待抽样 |
| 7 研究与数据 | 马来西亚农产品销售局 FAMA | fama.gov.my/harga-pasaran-terkini | 网页列表（要配） | 可接 | 待抽样 |
| 7 研究与数据 | 美国农业部经济研究局 ERS 食品价格展望 | ers.usda.gov | 网页列表（要配） | 可接 | 待抽样 |
| 7 研究与数据 | 世界银行大宗商品价格 | worldbank.org | 网页列表（要配） | 可接 | 待抽样 |
| 7 研究与数据 | 中国农业农村部（农产品价格） | moa.gov.cn | — | robots 不许 | 待抽样 |
| 7 研究与数据 | Indeed Hiring Lab（用工与薪资研究） | hiringlab.org | RSS | 可接 | 低：美国宏观就业 |
| 7 研究与数据 | OpenRice（香港点评） | openrice.com | — | 拒绝 AI 阅读 | 待抽样 |
| 7 研究与数据 | Placer.ai（客流数据） | placer.ai | — | robots 不许 | 待抽样 |
| 7 研究与数据 | Tabelog（日本点评） | tabelog.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 7 研究与数据 | Wongnai（泰国点评） | wongnai.com | 网页列表（要配） | 可接 | 待抽样 |
| 7 研究与数据 | Yelp 博客 | blog.yelp.com | RSS | robots 不许 | 待抽样 |
| 7 研究与数据 | Yelp 趋势 | trends.yelp.com | 网页列表（要配） | 可接 | 待抽样 |

## 全球（跨地区） · 商业地产与选址

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 8 商业地产 | 戴德梁行 Cushman & Wakefield | cushmanwakefield.com | — | 挡抓取 | 待抽样 |
| 8 商业地产 | 第一太平戴维斯 Savills | savills.com | 网页列表（要配） | 可接·只拒训练·首页挡 | 待抽样 |
| 8 商业地产 | 莱坊 Knight Frank | knightfrank.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 8 商业地产 | 世邦魏理仕 CBRE | cbre.com | — | 挡抓取 | 待抽样 |
| 8 商业地产 | 仲量联行 JLL（零售与餐饮地产研究） | jll.com | 网页列表（要配） | 可接 | 待抽样 |

## 东亚 · 中国大陆

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | 中国饭店协会 | chinahotel.org.cn | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | 中国连锁经营协会 | ccfa.org.cn | — | 服务器也连不上 | 待抽样 |
| 5 协会与商会 | 中国烹饪协会 | ccas.com.cn | — | 服务器也连不上 | 待抽样 |
| 7 研究与数据 | 美团研究院 | mri.meituan.com | 网页列表（要配） | 可接 | 待抽样 |
| 7 研究与数据 | 窄门餐眼（门店数数据） | zhaimen.com | — | 服务器也连不上 | 待抽样 |
| 8 商业地产 | 赢商网（餐饮开关店、品牌） | winshang.com | 网页列表（要配） | 可接 | 待抽样 |
| 9 餐饮媒体 | 餐宝典 | canbaodian.com | — | 服务器也连不上 | 待抽样 |
| 9 餐饮媒体 | 餐饮界 | canyinj.com | 网页列表 | 接入中 | 待抽样 |
| 9 餐饮媒体 | 餐饮老板内参 | kuaidiantou.com | — | 服务器也连不上 | 待抽样 |
| 9 餐饮媒体 | 红餐网（专栏、资讯、产业研究） | canyin88.com | 网页列表 | 接入中 | 高：用户必看 5 条里 2 条来自这里；资讯页 30 条里约 7 条必看、12 条可看 |
| 9 餐饮媒体 | 咖门 | kamen.com.cn | — | 服务器也连不上 | 待抽样 |
| 9 餐饮媒体 | 筷玩思维 | kuaiwanshiwei.com | — | 服务器也连不上 | 待抽样 |
| 9 餐饮媒体 | 职业餐饮网 | canyin168.com | — | 服务器也连不上 | 待抽样 |
| 9 餐饮媒体 | Foodaily 每日食品 | foodaily.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 21 世纪经济报道 | 21jingji.com | — | 拒绝 AI 阅读 | 待抽样 |
| 11 综合商业媒体 | 36 氪 | 36kr.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 财联社 | cls.cn | — | 连不上（从服务器复测） | 待抽样 |
| 11 综合商业媒体 | 第一财经 | yicai.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 界面新闻 | jiemian.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 经济观察网 | eeo.com.cn | RSS | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | 联商网 | linkshop.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 澎湃新闻 | thepaper.cn | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | 钛媒体 | tmtpost.com | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | 新京报 | bjnews.com.cn | 网页列表（要配） | 可接 | 待抽样 |

## 东亚 · 香港、台湾

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | 台湾连锁暨加盟协会 | tcfa.org.tw | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | 香港餐务管理协会、香港饮食业联合总会 | — | — | 无网站或只在社交平台（消息见报道） | 待抽样 |
| 9 餐饮媒体 | 食力（台湾饮食产业媒体） | foodnext.net | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 今周刊 | businesstoday.com.tw | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 经济日报（台湾） | money.udn.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 11 综合商业媒体 | 南华早报 SCMP | scmp.com | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | 商业周刊 | businessweekly.com.tw | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | 数位时代 | bnext.com.tw | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 天下杂志 | cw.com.tw | — | 挡抓取 | 待抽样 |
| 11 综合商业媒体 | 香港 01 | hk01.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 香港经济日报 | hket.com | — | 拒绝 AI 阅读 | 待抽样 |
| 11 综合商业媒体 | 远见 | gvm.com.tw | 网页列表（要配） | 可接·只拒训练·首页挡 | 待抽样 |
| 11 综合商业媒体 | 中央社 | cna.com.tw | — | 拒绝 AI 阅读 | 待抽样 |
| 11 综合商业媒体 | The Standard | thestandard.com.hk | 网页列表（要配） | 可接 | 待抽样 |

## 东亚 · 日本

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | 日本フードサービス協会（外食市场月度数据） | jfnet.or.jp | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 9 餐饮媒体 | 近代食堂、カフェレス（旭屋出版） | asahiya-jp.com | RSS | 可接 | 低：多为出版通知 |
| 9 餐饮媒体 | 日本食糧新聞（有外食栏） | news.nissyoku.co.jp | RSS | 可接 | 低：10 条里可看 3，多为食品厂商 |
| 9 餐饮媒体 | 日本外食新聞 | gaishokushimbun.com | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | 日経クロストレンド | xtrend.nikkei.com | — | 拒绝 AI 阅读 | 待抽样 |
| 9 餐饮媒体 | 食品産業新聞社 | ssnp.co.jp | — | 服务器挡 | 待抽样 |
| 9 餐饮媒体 | 食品新聞 | shokuhin.net | RSS | 可接 | 不相关：包装食品厂商 |
| 9 餐饮媒体 | 飲食店ドットコム ジャーナル | inshokuten.com | — | 服务器挡（403） | 待抽样 |
| 9 餐饮媒体 | 月刊食堂（柴田書店） | shibatashoten.co.jp | 网页列表（要配） | 可接 | 待抽样 |
| 9 餐饮媒体 | HOTERES（週刊ホテルレストラン） | hoteresonline.com | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | フードリンクニュース | foodrink.co.jp | RSS | 接入中 | 高：10 条里可看 9，日本餐饮企业动态，写给业者 |
| 11 综合商业媒体 | 東洋経済オンライン | toyokeizai.net | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | ITmedia | itmedia.co.jp | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | ダイヤモンド・オンライン | diamond.jp | RSS | 可接 | 待抽样 |
| 12 新闻稿 | PR TIMES | prtimes.jp | RSS | 可接 | 低：日本各行业新闻稿，每天约 160 条，餐饮占少数 |

## 东亚 · 韩国

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | 한국외식업중앙회（外食业中央会） | ekra.or.kr | — | 服务器也连不上 | 待抽样 |
| 5 协会与商会 | 한국프랜차이즈산업협회（加盟协会） | ikfa.or.kr | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 7 研究与数据 | aT 外食产业统计「더외식」 | atfis.or.kr | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | kfnews.co.kr（原以为是韩国食品与外食报） | kfnews.co.kr | RSS | 可接 | 不相关：实际是林业报 |
| 9 餐饮媒体 | 식품외식경제（食品外食经济） | foodbank.co.kr | RSS | 接入中 | 中：新品与企业动态多 |
| 9 餐饮媒体 | 식품음료신문（食品饮料新闻） | thinkfood.co.kr | RSS | 可接 | 低：10 条里可看 2，多为食品厂商 |
| 11 综合商业媒体 | 매일경제 | mk.co.kr | RSS | 可接·只拒训练 | 待抽样 |
| 11 综合商业媒体 | 파이낸셜뉴스 | fnnews.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 한국경제 | hankyung.com | — | 挡抓取 | 待抽样 |

## 东南亚 · 马来西亚

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 3 平台与服务商 | foodpanda | — | — | 连不上（从服务器复测） | 待抽样 |
| 5 协会与商会 | ACCCIM（中华总商会）、MEF（雇主联合会）、FMM（厂商联合会）、SAMENTA、MRCA（零售连锁协会）、MFA（加盟协会） | — | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | PRESMA（穆斯林餐馆业主协会） | presma.org.my | 网页列表（要配） | 可接 | 低：几乎不更新 |
| 5 协会与商会 | PRIMAS（印裔餐馆业主协会）、PPRB、雪隆咖啡酒餐商公会 | — | — | 无网站或只在社交平台（消息见报道） | 待抽样 |
| 6 政府与监管 | 财政部 MOF | mof.gov.my | — | 停用（2026-10-01 改为全球定位） | 低：多为每周例行油价公告 |
| 6 政府与监管 | 国内贸易部 KPDN | kpdn.gov.my | — | 技术难 | 待抽样 |
| 6 政府与监管 | 吉隆坡市政局 DBKL | dbkl.gov.my | — | 拒绝 AI 阅读 | 待抽样 |
| 6 政府与监管 | 内陆税收局 LHDN | hasil.gov.my | — | 停用（2026-10-01 改为全球定位） | 低：多为税务行政通告 |
| 6 政府与监管 | 清真局 JAKIM | halal.gov.my | — | 技术难 | 待抽样 |
| 6 政府与监管 | 人力部 MOHR | mohr.gov.my | — | 技术难 | 待抽样 |
| 6 政府与监管 | 人力部劳工局 JTKSM | jtksm.mohr.gov.my | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 6 政府与监管 | 统计局 DOSM | dosm.gov.my | — | 技术难 | 待抽样 |
| 6 政府与监管 | 卫生部、公积金局、国家银行、中小企业机构 | — | — | 连不上（从服务器复测） | 待抽样 |
| 6 政府与监管 | PERKESO、MIDA、MATRADE、SSM、TEKUN、MDEC | — | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 当今大马、Sinar Harian、Astro Awani、Focus Malaysia | — | — | 条款不许 | 待抽样 |
| 11 综合商业媒体 | 星洲日报、南洋商报、东方日报、光华日报、诗华日报、中国报、光明日报 | — | — | 服务器挡 | 待抽样 |
| 11 综合商业媒体 | Bernama | bernama.com | — | 拒绝 AI 阅读 | 待抽样 |
| 11 综合商业媒体 | Borneo Post、Daily Express（沙巴）、MalaysiaNow、The Vibes、BFM、Digital News Asia | — | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Business Today | businesstoday.com.my | — | 服务器挡 | 待抽样 |
| 11 综合商业媒体 | FMT | freemalaysiatoday.com | RSS | 可接·只拒训练 | 待抽样 |
| 11 综合商业媒体 | Kosmo | kosmo.com.my | 网页列表（要配） | 可接 | 低：对经营者用处小 |
| 11 综合商业媒体 | Malay Mail 财经 | malaymail.com | — | 停用（2026-10-01 改为全球定位） | 低：50 条里约 2 条相关 |
| 11 综合商业媒体 | Marketing-Interactive（东南亚营销） | marketing-interactive.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | NST、Harian Metro | — | — | 拒绝 AI 阅读 | 待抽样 |
| 11 综合商业媒体 | SoyaCincau | soyacincau.com | — | 连不上（从服务器复测） | 待抽样 |
| 11 综合商业媒体 | The Edge Malaysia | theedgemalaysia.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 11 综合商业媒体 | The Malaysian Reserve | themalaysianreserve.com | — | 停用（2026-10-01 改为全球定位） | 低：10 条里约 2 条相关 |
| 11 综合商业媒体 | The Star | thestar.com.my | — | 条款不许 | 待抽样 |
| 11 综合商业媒体 | The Sun | thesun.my | RSS | 可接·只拒训练 | 待抽样 |
| 11 综合商业媒体 | Utusan 经济 | utusan.com.my | — | 停用（2026-10-01 改为全球定位） | 低：10 条里约 2 条相关 |
| 11 综合商业媒体 | Vulcan Post | vulcanpost.com | — | 停用（2026-10-01 改为全球定位） | 低：10 条里 0 条相关 |

## 东南亚 · 新加坡

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | 新加坡餐馆协会 RAS | ras.org.sg | 网页列表（要配） | 可接 | 待抽样 |
| 6 政府与监管 | 食品局 SFA（有 RSS）、企业发展局、人力部 MOM、统计局（餐饮服务指数） | — | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | 联合早报 | zaobao.com.sg | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 11 综合商业媒体 | CNA | channelnewsasia.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Mothership | mothership.sg | 网页列表（要配） | 可接 | 低：消费者向 |
| 11 综合商业媒体 | The Business Times | businesstimes.com.sg | RSS | 拒绝 AI 阅读 | 待抽样 |
| 11 综合商业媒体 | The Edge Singapore | theedgesingapore.com | RSS | 可接·只拒训练·首页挡 | 待抽样 |
| 11 综合商业媒体 | The Straits Times | straitstimes.com | RSS | 可接·只拒训练 | 低：近 7 天订阅没有新内容 |
| 11 综合商业媒体 | TODAY | todayonline.com | — | robots 不许 | 待抽样 |

## 东南亚 · 泰国、越南、印尼、菲律宾

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | 泰国餐馆协会 | thairestaurant.or.th | — | 服务器也连不上 | 待抽样 |
| 5 协会与商会 | APKRINDO（印尼咖啡馆与餐厅业者协会） | apkrindo.id | — | 服务器也连不上 | 待抽样 |
| 5 协会与商会 | PHRI（印尼酒店与餐厅协会） | phrionline.com | — | 服务器也连不上 | 待抽样 |
| 7 研究与数据 | iPOS.vn 越南餐饮市场年报（调查 4,005 家店） | ipos.vn | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 9 餐饮媒体 | Foodizz（印尼餐饮业者社群） | foodizz.id | 网页列表（要配） | 可接（服务器能连） | 待抽样 |
| 11 综合商业媒体 | Bangkok Biz News（泰文） | bangkokbiznews.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Bangkok Post | bangkokpost.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Brand Inside（泰文） | brandinside.asia | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Brands Vietnam | brandsvietnam.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | BusinessWorld | bworldonline.com | 网页列表（要配） | 可接 | 低：综合财经 |
| 11 综合商业媒体 | CafeF（越文） | cafef.vn | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Inquirer Business | business.inquirer.net | 网页列表（要配） | 可接·只拒训练·首页挡 | 待抽样 |
| 11 综合商业媒体 | Katadata | katadata.co.id | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Khaosod English | khaosodenglish.com | RSS | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | Kontan、Bisnis.com | — | — | 拒绝 AI 阅读 | 待抽样 |
| 11 综合商业媒体 | Marketeer（泰文） | marketeeronline.co | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Philstar | philstar.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Prachachat（泰文） | prachachat.net | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | SWA、Marketeers、DailySocial、CNBC Indonesia | — | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Thansettakij（泰文） | thansettakij.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | The Investor、VietnamNet | — | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | The Nation | nationthailand.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Vietnam Investment Review | vir.com.vn | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Vietnam News | vietnamnews.vn | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | VnExpress International | e.vnexpress.net | — | 拒绝 AI 阅读 | 待抽样 |

## 东南亚 · 柬埔寨、缅甸

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 11 综合商业媒体 | B2B Cambodia | b2b-cambodia.com | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Cambodge Mag（含柬埔寨餐馆协会消息） | cambodgemag.com | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Cambodia Investment Review | cambodiainvestmentreview.com | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Frontier Myanmar | frontiermyanmar.net | — | 挡抓取 | 待抽样 |
| 11 综合商业媒体 | Khmer Times | khmertimeskh.com | RSS | 可接·只拒训练·首页挡 | 待抽样 |
| 11 综合商业媒体 | Myanmar Times | mmtimes.com | — | robots 不许 | 待抽样 |

## 南亚

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | 科伦坡餐厅联盟 CCRC（斯里兰卡） | — | — | 无网站或只在社交平台（消息见报道） | 待抽样 |
| 5 协会与商会 | 孟加拉餐馆业主协会 BROA | — | — | 无网站或只在社交平台（消息见报道） | 待抽样 |
| 5 协会与商会 | 印度餐馆协会 NRAI | nrai.org | 网页列表（要配） | 可接 | 待抽样 |
| 9 餐饮媒体 | ET HospitalityWorld | hospitality.economictimes.indiatimes.com | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 9 餐饮媒体 | Franchise India | franchiseindia.com | 网页列表（要配） | 可接 | 待抽样 |
| 9 餐饮媒体 | Hospitality Biz India | hospitalitybizindia.com | RSS | 可接 | 低：多为酒店与旅游 |
| 9 餐饮媒体 | Restaurant India | restaurantindia.in | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 11 综合商业媒体 | Business Recorder（巴基斯坦） | brecorder.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | Daily FT（斯里兰卡） | ft.lk | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Dawn（巴基斯坦） | dawn.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | Dhaka Tribune（孟加拉） | dhakatribune.com | RSS | 挡抓取 | 待抽样 |
| 11 综合商业媒体 | Inc42（Content-Signal 写明允许 AI 阅读） | inc42.com | RSS | 可接·只拒训练 | 待抽样 |
| 11 综合商业媒体 | UNB（孟加拉） | unb.com.bd | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | YourStory | yourstory.com | — | 拒绝 AI 阅读 | 待抽样 |

## 中东与非洲

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | 南非餐馆协会 RASA | rasa.co.za | — | 连不上（从服务器复测） | 待抽样 |
| 5 协会与商会 | 尼日利亚快餐业者协会 AFCON | — | — | 无网站或只在社交平台（消息见报道） | 待抽样 |
| 5 协会与商会 | Misadanim（以色列餐饮业者组织） | misadanim.org.il | — | 连不上（从服务器复测） | 待抽样 |
| 6 政府与监管 | 沙特中小企业局 Monsha'at | monshaat.gov.sa | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | Caterer Middle East | caterermiddleeast.com | — | 服务器挡（405） | 待抽样 |
| 9 餐饮媒体 | Food Business MEA | foodbusinessmea.com | RSS | 可接（服务器能连） | 待抽样 |
| 9 餐饮媒体 | Hospitality News（中东） | hospitalitynewsmag.com | RSS | 接入中 | 中：中东餐饮业的数据与访谈 |
| 9 餐饮媒体 | Hotelier Middle East | hoteliermiddleeast.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | Arab Finance（埃及） | arabfinance.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Arab News 商业版 | arabnews.com | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Arabian Business | arabianbusiness.com | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | BusinessDay（尼日利亚） | businessday.ng | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | BusinessTech（南非） | businesstech.co.za | — | 挡抓取 | 待抽样 |
| 11 综合商业媒体 | Eat Out（南非） | eatout.co.za | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Enterprise（埃及） | enterprise.press | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Globes（以色列） | globes.co.il | — | 挡抓取 | 待抽样 |
| 11 综合商业媒体 | Gulf Business | gulfbusiness.com | — | 挡抓取 | 待抽样 |
| 11 综合商业媒体 | Jerusalem Post 餐厅栏 | jpost.com | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Marketing Edge（尼日利亚） | marketingedge.com.ng | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Nairametrics（尼日利亚） | nairametrics.com | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | TradeArabia | tradearabia.com | 网页列表（要配） | 可接（服务器能连） | 待抽样 |

## 欧洲

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | AHR ČR（捷克酒店餐厅协会） | ahrcr.cz | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | AHRESP（葡萄牙餐饮酒店协会，1896 年成立） | ahresp.com | RSS | 可接 | 低：葡萄牙本地，偶有成本数据 |
| 5 协会与商会 | DEHOGA（德国） | dehoga-bundesverband.de | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | FIPE（意大利公共场所业者联合会） | fipe.it | RSS | 可接 | 低：意大利本地规定（对当地业者实用） |
| 5 协会与商会 | GHR（法国） | ghr.fr | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | Horesta（丹麦） | horesta.dk | RSS | 可接 | 低：丹麦本地规定与活动 |
| 5 协会与商会 | Hostelería de España（西班牙） | hosteleriadeespana.es | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | KHN（荷兰，1.7 万会员） | khn.nl | — | 挡抓取 | 待抽样 |
| 5 协会与商会 | Marcas de Restauración（西班牙连锁品牌协会） | marcasderestauracion.es | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 5 协会与商会 | TÜRES（土耳其全国餐厅协会，2.5 万家会员） | tures.org.tr | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | UKHospitality | ukhospitality.org.uk | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 5 协会与商会 | UMIH（法国） | umih.fr | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | Visita（瑞典，与统计局合作的餐厅指数） | visita.se | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 9 餐饮媒体 | AHGZ（德国） | ahgz.de | RSS | 拒绝 AI 阅读 | 待抽样 |
| 9 餐饮媒体 | BigHospitality（英国） | bighospitality.co.uk | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 9 餐饮媒体 | Boussias（希腊 B2B 出版） | boussias.com | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 9 餐饮媒体 | Casual Dining（英国） | casualdiningmagazine.co.uk | 网页列表（要配） | 可接 | 待抽样 |
| 9 餐饮媒体 | Food Service Vision（法国） | foodservicevision.fr | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 9 餐饮媒体 | food-service.de（德国） | food-service.de | RSS | 拒绝 AI 阅读 | 待抽样 |
| 9 餐饮媒体 | Gambero Rosso（意大利） | gamberorosso.it | RSS | 可接·首页挡 | 低：美食与葡萄酒，写给食客 |
| 9 餐饮媒体 | Gastroeconomy（西班牙） | gastroeconomy.com | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 9 餐饮媒体 | Horecatrends（波兰） | horecatrends.pl | RSS | 拒绝 AI 阅读 | 待抽样 |
| 9 餐饮媒体 | Hospitality & Catering News（英国） | hospitalityandcateringnews.com | RSS | 可接 | 低：10 条里可看 1，多为酒店与开张 |
| 9 餐饮媒体 | Italia a Tavola（意大利） | italiaatavola.net | RSS | 可接 | 中：10 条里必看 1、可看 4，意大利本地为主 |
| 9 餐饮媒体 | L'Hôtellerie Restauration（法国） | lhotellerie-restauration.fr | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | MCA Insight（英国） | mca-insight.com | RSS | robots 不许（RSS 对所有爬虫关闭） | 中：10 条里可看 5，英国连锁动态与数据 |
| 9 餐饮媒体 | Misset Horeca（荷兰） | missethoreca.nl | RSS | 拒绝 AI 阅读 | 待抽样 |
| 9 餐饮媒体 | Morning Advertiser（英国酒吧业） | morningadvertiser.co.uk | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 9 餐饮媒体 | Néo Restauration（法国） | neorestauration.com | — | 挡抓取 | 待抽样 |
| 9 餐饮媒体 | Pambianco Wine & Food（意大利） | pambianconews.com | RSS | 可接 | 不相关：这个订阅是时尚版 |
| 9 餐饮媒体 | Propel（英国） | propelinfo.com | 网页列表（要配） | 可接 | 待抽样 |
| 9 餐饮媒体 | Restauración News（西班牙） | restauracionnews.com | — | 挡抓取 | 待抽样 |
| 9 餐饮媒体 | Restaurant Online（英国） | restaurantonline.co.uk | 网页列表（要配） | 可接·只拒训练 | 待抽样 |
| 9 餐饮媒体 | Restauratören（瑞典） | restauratoren.se | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 9 餐饮媒体 | Ristorazione Italiana Magazine（意大利） | ristorazioneitalianamagazine.it | RSS | 接入中 | 高：10 条里必看 3–4（定价、食材成本做法），每天不到 1 条 |
| 9 餐饮媒体 | Snacking.fr（法国） | snacking.fr | 网页列表（要配） | 可接 | 待抽样 |
| 9 餐饮媒体 | The Caterer（英国） | thecaterer.com | — | 条款不许 | 待抽样 |
| 9 餐饮媒体 | Zepros（法国） | zepros.fr | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 9 餐饮媒体 | Ресторанные ведомости（俄罗斯） | restoved.ru | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Ambitur（葡萄牙） | ambitur.pt | — | 连不上（从服务器复测） | 待抽样 |
| 11 综合商业媒体 | Capital（土耳其） | capital.com.tr | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | Forin（希腊） | forin.gr | 网页列表（要配） | 可接·首页挡 | 待抽样 |
| 11 综合商业媒体 | Hipersuper（葡萄牙） | hipersuper.pt | — | 拒绝 AI 阅读 | 待抽样 |
| 11 综合商业媒体 | Newstream（捷克） | newstream.cz | 网页列表（要配） | 可接 | 待抽样 |
| 11 综合商业媒体 | TTG 餐饮栏（捷克） | ttg.cz | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Wiadomości Handlowe 餐饮与快餐栏（波兰） | wiadomoscihandlowe.pl | RSS | 可接 | 待抽样 |

## 美洲（美国以外）

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | 加拿大餐馆协会 Restaurants Canada | restaurantscanada.org | RSS | 接入中 | 中：加拿大餐饮业数据与政策，每周约 1 条 |
| 5 协会与商会 | Abrasel（巴西酒吧与餐厅协会） | abrasel.com.br | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | ACHIGA（智利餐饮协会） | achiga.cl | — | 连不上（从服务器复测） | 待抽样 |
| 5 协会与商会 | ACODRES（哥伦比亚餐饮协会） | acodres.com.co | — | 挡抓取 | 待抽样 |
| 5 协会与商会 | CANIRAC（墨西哥餐饮业商会） | canirac.org.mx | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 5 协会与商会 | FEHGRA（阿根廷酒店餐饮联合会） | fehgra.org.ar | RSS | 可接 | 低：阿根廷本地税务与活动 |
| 9 餐饮媒体 | Canadian Restaurant News（加拿大） | canadianrestaurantnews.com | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 9 餐饮媒体 | Foodservice and Hospitality（加拿大） | foodserviceandhospitality.com | — | 挡抓取 | 待抽样 |
| 9 餐饮媒体 | Mercado & Consumo（巴西，有餐饮栏） | mercadoeconsumo.com.br | RSS | 可接 | 低：近 7 天订阅没有新内容 |
| 9 餐饮媒体 | RestoBiz（加拿大） | restobiz.ca | — | 挡抓取 | 待抽样 |
| 11 综合商业媒体 | Exame（巴西） | exame.com | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Expansión（墨西哥） | expansion.mx | RSS | 可接 | 待抽样 |
| 11 综合商业媒体 | Merca2.0（墨西哥） | merca20.com | RSS | 拒绝 AI 阅读 | 待抽样 |
| 11 综合商业媒体 | Perú Retail（覆盖拉美多国） | peru-retail.com | RSS | 挡抓取 | 待抽样 |
| 11 综合商业媒体 | Valor（巴西） | valor.globo.com | RSS | 拒绝 AI 阅读 | 待抽样 |

## 大洋洲

| 类型 | 名称 | 网址 | 怎么接 | 能不能接 | 值不值得接 |
|---|---|---|---|---|---|
| 5 协会与商会 | Restaurant & Catering Australia | rca.asn.au | 网页列表（要配） | 可接 | 待抽样 |
| 5 协会与商会 | Restaurant Association of New Zealand | restaurantnz.co.nz | — | 挡抓取 | 待抽样 |
| 9 餐饮媒体 | Hospitality Business（新西兰） | hospitalitybiz.co.nz | — | 连不上（从服务器复测） | 待抽样 |
| 9 餐饮媒体 | Hospitality Magazine（澳洲） | hospitalitymagazine.com.au | RSS | 接入中 | 中：8 条里必看 1、可看 1，开张与颁奖多 |
| 9 餐饮媒体 | The Shout（澳洲酒水） | theshout.com.au | RSS | 可接 | 不相关：酒类批发 |
