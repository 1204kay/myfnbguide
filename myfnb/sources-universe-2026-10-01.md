# 全球餐饮信息来源全集（快照：2026-10-01）

> 用来回答「全球到底有哪些来源」，先列全，再逐个判断。判断依据见 `research-2026-10-01.md`（§4–§11）与 `HANDOFF.md` §5.4 的接源规则。

## 怎么列的

- **两个维度**：地区（东亚、东南亚、南亚、中东与非洲、欧洲、美洲、大洋洲，加一个跨地区的「全球」）× 来源类型（下表 A–L）。
- **方法**：每个地区用当地语言搜索（中、日、韩、泰、越、印尼、英、法、德、意、西、葡、荷、瑞典、俄），加上已知名单、两次会话里查过的结果；有网址的都用 `MyFnBBot` 身份跑过一次本机筛查（首页、robots.txt、AI 声明、RSS）。
- **局限**：不可能真正穷尽。小国家、小语种、个人博客覆盖少；没搜过的国家（葡萄牙、波兰、捷克、希腊、土耳其、以色列、埃及、尼日利亚、肯尼亚等）只在文末列为空白。「待查」表示名单里有、还没筛查。

### 来源类型

| 代码 | 类型 |
|---|---|
| A | 餐饮行业媒体（写给经营者） |
| B | 细分品类与专业媒体：咖啡、茶饮、烘焙、披萨、酒吧酒水、团餐与酒店餐饮、设备、食品科技、加盟 |
| C | 综合或商业媒体（只用它的餐饮、商业栏目） |
| D | 行业协会、商会 |
| E | 政府与统计（只限跟餐饮经营有关的） |
| F | 研究与数据机构 |
| G | 新闻稿通讯社 |
| H | 连锁品牌、集团的官方新闻室与投资者关系 |
| I | 外卖与科技平台（新闻室、行业报告、经营者博客） |
| J | 展会与论坛 |
| K | 从业者自己发内容的平台（抖音、小红书、公众号、YouTube 等） |
| L | 经营者教育、厂商博客 |

### 状态

| 状态 | 意思 |
|---|---|
| 接入中 | 现在的 14 个信源 |
| 服务器挡 | 2026-10-01 在正式服务器上 403（规则 5、6） |
| 初筛可接 | 本机筛查：robots 读得到，没有拒绝 AI 阅读（精确规则）；还要过条款、服务器、内容价值三关 |
| 初筛可接·只拒训练 | 同上，但 robots 点名拒绝了 AI 训练爬虫；按 9/30 定的严格规则不接，按精确规则可接 |
| 首页挡 | 首页对抓取 403，但 robots 可读；能不能用要看 RSS 或栏目页 |
| 拒绝 AI 阅读 | robots 拒绝代用户读网页的 AI，或写 `ai-input=no`（规则 2，两种解读都不接） |
| robots 不许 | robots.txt 对所有爬虫关闭（规则 1） |
| 读不到 | 抓取 403、超时或连不上（规则 5） |
| 条款不许 | 使用条款禁止自动抓取、AI 使用，或只许个人使用（规则 3） |
| 技术难 | 只有 PDF、要跑网页脚本、没有新闻列表 |
| 价值低 | 能接，但对经营者没用或几乎不更新 |
| 封闭平台 | 内容在需要授权或付费接口的平台里 |
| 待查 | 还没筛查 |

## 全球（跨地区）

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| A | Nation's Restaurant News | nrn.com | 初筛可接·只拒训练 |
| A | Restaurant Dive | restaurantdive.com | 初筛可接·只拒训练 |
| A | Restaurant Business | restaurantbusinessonline.com | 条款不许 |
| A | QSR Magazine | qsrmagazine.com | 首页挡（RSS 可读）·只拒训练 |
| A | FSR Magazine | fsrmagazine.com | 接入中 |
| A | Fast Casual | fastcasual.com | 初筛可接·只拒训练 |
| A | Pizza Marketplace | pizzamarketplace.com | 初筛可接·只拒训练 |
| A | Foodservice Director | foodservicedirector.com | 初筛可接·只拒训练 |
| A | Total Food Service | totalfood.com | 接入中 |
| A | Modern Restaurant Management | modernrestaurantmanagement.com | 拒绝 AI 阅读 |
| A | Restaurant Hospitality | restaurant-hospitality.com | 待查 |
| A | QSR Media（澳洲、亚洲、英国） | qsrmedia.com / qsrmedia.asia | 初筛可接（.com）；接入中（亚洲版） |
| A | Food & Beverage Asia | foodandbeverageasia.com | 读不到 |
| A | Asia Food Journal | asiafoodjournal.com | 读不到 |
| A | Inside Retail Asia | insideretail.asia | 拒绝 AI 阅读 |
| A | FoodBev Media | foodbev.com | 初筛可接 |
| A | just-food | just-food.com | 初筛可接·只拒训练 |
| A | The Food Institute | foodinstitute.com | 拒绝 AI 阅读 |
| A | Nosh | nosh.com | 首页挡（RSS 可读） |
| A | Skift Table | skift.com | 待查 |
| A | Hospitality Net | hospitalitynet.org | 读不到 |
| A | Hospitality Technology | hospitalitytech.com | 读不到 |
| B 咖啡 | Daily Coffee News | dailycoffeenews.com | 接入中 |
| B 咖啡 | World Coffee Portal | worldcoffeeportal.com | 条款不许 |
| B 咖啡 | Perfect Daily Grind | perfectdailygrind.com | 读不到 |
| B 咖啡 | Sprudge | sprudge.com | 初筛可接 |
| B 咖啡 | Barista Magazine | baristamagazine.com | 待查 |
| B 咖啡 | Global Coffee Report | gcrmag.com | 待查 |
| B 咖啡 | Comunicaffè International | comunicaffe.com | 待查 |
| B 咖啡茶 | Tea & Coffee Trade Journal | teaandcoffee.net | 价值低（RSS 为空） |
| B 茶 | World Tea News | worldteanews.com | 条款不许 |
| B 烘焙 | World Bakers | worldbakers.com | 初筛可接 |
| B 烘焙 | Bakery and Snacks | bakeryandsnacks.com | 初筛可接·只拒训练 |
| B 烘焙 | Baking Business | bakingbusiness.com | 待查 |
| B 烘焙 | British Baker | bakeryinfo.co.uk | 待查 |
| B 披萨 | PMQ Pizza Magazine | pmq.com | 待查 |
| B 披萨 | Pizza Today | pizzatoday.com | 待查 |
| B 酒水 | Drinks International | drinksint.com | 待查 |
| B 酒水 | The Spirits Business | thespiritsbusiness.com | 待查 |
| B 酒水 | Bar & Restaurant | barandrestaurant.com | 待查 |
| B 酒水 | BevNET | bevnet.com | 首页挡（RSS 可读）·只拒训练 |
| B 酒水 | Beverage Daily | beveragedaily.com | 待查 |
| B 酒水 | Just Drinks | just-drinks.com | 待查 |
| B 食品科技 | The Spoon | thespoon.tech | 价值低（一月一两条） |
| B 食品科技 | AgFunder News | agfundernews.com | 初筛可接 |
| B 食品科技 | Green Queen | greenqueen.com.hk | 待查 |
| B 食品科技 | FoodNavigator / FoodNavigator-Asia | foodnavigator-asia.com | 初筛可接·只拒训练 |
| B 设备 | Foodservice Equipment Reports | fermag.com | 接入中 |
| B 设备 | FE&S | fesmag.com | 初筛可接·只拒训练（Content-Signal：允许搜索、不许训练） |
| B 设备 | Foodservice Equipment Journal（英国） | foodserviceequipmentjournal.com | 待查 |
| B 团餐酒店 | Hotel F&B | hotelfandb.com | 待查 |
| B 加盟 | Franchise Times | franchisetimes.com | 待查 |
| B 加盟 | 1851 Franchise | 1851franchise.com | 待查 |
| F | Technomic | technomic.com | 初筛可接 |
| F | Datassential | datassential.com | 初筛可接 |
| F | Circana | circana.com | 初筛可接 |
| F | Euromonitor | euromonitor.com | 初筛可接 |
| F | Mintel | mintel.com | 初筛可接 |
| F | Placer.ai | placer.ai | 待查 |
| F | Black Box Intelligence | blackboxintelligence.com | 待查 |
| F | CHD Expert | chd-expert.com | 待查 |
| F | Lumina Intelligence（英国） | lumina-intelligence.com | 待查 |
| G | PR Newswire（要找餐饮分类） | prnewswire.com | 初筛可接 |
| G | Business Wire | businesswire.com | 读不到 |
| G | GlobeNewswire | globenewswire.com | 初筛可接 |
| G | Media OutReach Newswire（亚洲） | media-outreach.com | 读不到（robots 403） |
| H | 麦当劳 | corporate.mcdonalds.com | 读不到 |
| H | 星巴克 | stories.starbucks.com | 读不到 |
| H | 百胜（Yum!） | investors.yum.com | 首页挡 |
| H | RBI（汉堡王、Tim Hortons、Popeyes） | rbi.com | 首页挡 |
| H | 达美乐 | ir.dominos.com | 读不到 |
| H | 百胜中国 | ir.yumchina.com | 读不到 |
| H | 瑞幸 | investor.lkcoffee.com | 读不到 |
| H | Jollibee Foods | jfc.com.ph | 读不到 |
| H | 海底捞、蜜雪集团、霸王茶姬、古茗、茶百道 | 港股／美股公告 | 待查 |
| I | Uber Eats、DoorDash、Deliveroo、Just Eat Takeaway、Delivery Hero、美团、Swiggy、Zomato（Eternal）、Talabat | 各自新闻室 | 待查 |
| I | Grab | grab.com/my/press | 接入中 |
| I | foodpanda | foodpanda.my/newsroom | 读不到 |
| I | Toast（博客与行业报告） | toasttab.com | 首页挡 |
| I | Square | squareup.com | 待查 |
| I | 7shifts（排班；Content-Signal 写明允许 AI 阅读） | 7shifts.com | 初筛可接 |
| I | Restaurant365 | restaurant365.com | 待查 |
| I | Foodics（中东收银） | foodics.com | 待查 |
| I | iCHEF 餐厅帮 | ichefpos.com | 拒绝 AI 阅读 |
| J | 美国 NRA Show、意大利 HOST Milano 与 SIGEP、迪拜 Gulfood、新加坡 FHA、香港 HOFEX、日本 FOODEX、德国 Internorga、首尔 Café Show、红餐博览会、马来西亚 MIFB、SIAL | 各自网站 | 待查（展会新闻多是预告，价值低） |
| K | 抖音、快手、视频号、小红书、微信公众号、微博、B 站、TikTok、Instagram、Facebook（含群组）、YouTube、LinkedIn、X、Threads、Reddit、LINE、Naver 博客与 Cafe、日本 note、播客、Substack 与 Beehiiv | — | 封闭平台：抖音要创作者授权；YouTube 字幕只给视频主人；公众号和 X 可经付费第三方接口（作者的做法，费用与风险待评估）；note、Substack、Naver 博客多有 RSS（条款待查） |
| K | X（推特）：餐饮业记者与分析师（如 Restaurant Business 主编 Jonathan Maze、华尔街日报餐饮记者 Heather Haddon、彭博的 Venessa Wong），各家行业媒体账号，日本的餐饮业者与顾问（待查） | x.com | 封闭平台：官方接口 2026-02-06 起按量计费，每读 1,000 条 5 美元（只能搜近 7 天，每月上限 200 万条）；框架内置的 X 抓取走第三方接口（SocialData 等，每 1,000 条约 0.2 美元），属于未经 X 授权的抓取，不合我们的规则 |
| L | Owner.com、StoreHub 等厂商博客 | — | 价值低（多为推广） |

## 东亚

### 中国大陆

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| A | 红餐网（专栏、资讯、产业研究） | canyin88.com | 接入中（只接了专栏） |
| A | 赢商网（餐饮开关店、品牌） | winshang.com | 初筛可接 |
| A | 联商网 | linkshop.com | 初筛可接 |
| A | 餐饮界 | canyinj.com | 初筛可接（无列表） |
| A | Foodaily 每日食品 | foodaily.com | 初筛可接 |
| A | 餐饮老板内参 | kuaidiantou.com | 读不到（内容在公众号） |
| A | 职业餐饮网 | canyin168.com | 读不到 |
| A | 咖门 | kamen.com.cn | 读不到 |
| A | 筷玩思维 | kuaiwanshiwei.com | 读不到 |
| A | 餐宝典 | canbaodian.com | 读不到 |
| C | 36 氪 | 36kr.com | 初筛可接 |
| C | 界面新闻 | jiemian.com | 初筛可接 |
| C | 第一财经 | yicai.com | 初筛可接 |
| C | 澎湃新闻 | thepaper.cn | 首页挡 |
| C | 新京报 | bjnews.com.cn | 初筛可接 |
| C | 21 世纪经济报道 | 21jingji.com | 拒绝 AI 阅读 |
| C | 经济观察网 | eeo.com.cn | 初筛可接 |
| C | 财联社 | cls.cn | 读不到 |
| C | 钛媒体 | tmtpost.com | 初筛可接 |
| D | 中国烹饪协会 | ccas.com.cn | 读不到 |
| D | 中国饭店协会 | chinahotel.org.cn | 初筛可接 |
| D | 中国连锁经营协会 | ccfa.org.cn | 待查 |
| F | 红餐产业研究院 | canyin88.com | 接入中（同红餐网） |
| F | 窄门餐眼、美团研究院 | — | 待查（数据多在小程序与报告） |

### 香港、台湾

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| C | 南华早报 SCMP | scmp.com | 初筛可接 |
| C | 香港 01 | hk01.com | 初筛可接 |
| C | The Standard | thestandard.com.hk | 初筛可接 |
| C | 香港经济日报 | hket.com | 待查 |
| D | 香港餐务管理协会、香港饮食业联合总会 | — | 待查 |
| A | 食力（台湾饮食产业媒体） | foodnext.net | 初筛可接（RSS 为空，网站有列表） |
| C | 经济日报（台湾） | money.udn.com | 初筛可接·只拒训练 |
| C | 远见 | gvm.com.tw | 初筛可接·只拒训练 |
| C | 商业周刊 | businessweekly.com.tw | 初筛可接 |
| C | 数位时代 | bnext.com.tw | 初筛可接 |
| C | 今周刊 | businesstoday.com.tw | 初筛可接 |
| C | 中央社 | cna.com.tw | 拒绝 AI 阅读 |
| C | 天下杂志 | cw.com.tw | 读不到 |
| D | 台湾连锁暨加盟协会 | tcfa.org.tw | 待查 |

### 日本

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| A | フードリンクニュース | foodrink.co.jp | 初筛可接 |
| A | 日本食糧新聞（有外食栏） | news.nissyoku.co.jp | 初筛可接 |
| A | 食品新聞 | shokuhin.net | 初筛可接 |
| A | 食品産業新聞社 | ssnp.co.jp | 服务器挡 |
| A | 日本外食新聞 | gaishokushimbun.com | 待查 |
| A | 飲食店ドットコム ジャーナル | inshokuten.com | 读不到 |
| A | 月刊食堂（柴田書店） | shibatashoten.co.jp | 待查 |
| A | 近代食堂、カフェレス（旭屋出版） | asahiya-jp.com | 待查 |
| A | HOTERES（週刊ホテルレストラン） | hoteresonline.com | 待查 |
| A | 日経クロストレンド | xtrend.nikkei.com | 待查（多为付费） |
| C | ITmedia | itmedia.co.jp | 初筛可接 |
| C | 東洋経済オンライン | toyokeizai.net | 初筛可接 |
| C | ダイヤモンド・オンライン | diamond.jp | 初筛可接 |
| D/F | 日本フードサービス協会（外食市场月度数据） | jfnet.or.jp | 初筛可接 |
| G | PR TIMES | prtimes.jp | 初筛可接 |

### 韩国

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| A | 식품외식경제（食品外食经济） | foodbank.co.kr | 接入中 |
| A | 식품음료신문（食品饮料新闻） | thinkfood.co.kr | 初筛可接 |
| A | 한국외식경제신문、한국외식신문 | — | 待查 |
| C | 매일경제 | mk.co.kr | 初筛可接·只拒训练 |
| C | 파이낸셜뉴스 | fnnews.com | 初筛可接 |
| C | 한국경제 | hankyung.com | 读不到 |
| D | 한국외식업중앙회（外食业中央会）、한국프랜차이즈산업협회（加盟协会） | — | 待查 |
| F | aT 外食产业统计「더외식」 | atfis.or.kr | 待查 |

## 东南亚

### 马来西亚

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| C | Malay Mail 财经 | malaymail.com | 接入中 |
| C | The Malaysian Reserve | themalaysianreserve.com | 接入中 |
| C | Utusan 经济 | utusan.com.my | 接入中 |
| C | Vulcan Post | vulcanpost.com | 接入中 |
| C | 星洲日报、南洋商报、东方日报、光华日报、诗华日报、中国报、光明日报 | — | 服务器挡 |
| C | Business Today | businesstoday.com.my | 服务器挡 |
| C | The Star | thestar.com.my | 条款不许 |
| C | NST、Harian Metro | — | 拒绝 AI 阅读 |
| C | Bernama | bernama.com | 拒绝 AI 阅读 |
| C | 当今大马、Sinar Harian、Astro Awani、Focus Malaysia | — | 条款不许 |
| C | FMT | freemalaysiatoday.com | 初筛可接·只拒训练 |
| C | The Edge Malaysia | theedgemalaysia.com | 初筛可接·只拒训练 |
| C | The Sun | thesun.my | 初筛可接·只拒训练 |
| C | Borneo Post、Daily Express（沙巴）、MalaysiaNow、The Vibes、BFM、Digital News Asia | — | 初筛可接 |
| C | Marketing-Interactive（东南亚营销） | marketing-interactive.com | 初筛可接 |
| C | Kosmo | kosmo.com.my | 价值低 |
| C | SoyaCincau | soyacincau.com | 读不到 |
| D | ACCCIM（中华总商会）、MEF（雇主联合会）、FMM（厂商联合会）、SAMENTA、MRCA（零售连锁协会）、MFA（加盟协会） | — | 初筛可接 |
| D | PRESMA（穆斯林餐馆业主协会） | presma.org.my | 价值低（几乎不更新） |
| D | PRIMAS（印裔餐馆业主协会）、PPRB、雪隆咖啡酒餐商公会 | — | 待查（多在 Facebook） |
| E | 财政部 MOF | mof.gov.my | 接入中 |
| E | 内陆税收局 LHDN | hasil.gov.my | 接入中 |
| E | 人力部劳工局 JTKSM | jtksm.mohr.gov.my | 初筛可接（有 RSS） |
| E | PERKESO、MIDA、MATRADE、SSM、TEKUN、MDEC | — | 初筛可接 |
| E | 国内贸易部 KPDN | kpdn.gov.my | 技术难（只有 PDF） |
| E | 人力部 MOHR | mohr.gov.my | 技术难（脚本渲染） |
| E | 统计局 DOSM | dosm.gov.my | 技术难（没有新闻列表） |
| E | 清真局 JAKIM | halal.gov.my | 技术难 |
| E | 卫生部、公积金局、国家银行、中小企业机构 | — | 读不到 |
| E | 吉隆坡市政局 DBKL | dbkl.gov.my | robots 不许 |
| I | Grab | grab.com/my/press | 接入中 |
| I | foodpanda | — | 读不到 |
| J | MIFB、Food & Drinks Malaysia by SIAL | — | 待查 |

### 新加坡

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| C | The Straits Times | straitstimes.com | 初筛可接·只拒训练 |
| C | The Business Times | businesstimes.com.sg | robots 不许 |
| C | CNA | channelnewsasia.com | 初筛可接 |
| C | TODAY | todayonline.com | robots 不许 |
| C | The Edge Singapore | theedgesingapore.com | 首页挡·只拒训练 |
| C | 联合早报 | zaobao.com.sg | 初筛可接·只拒训练 |
| C | Mothership | mothership.sg | 价值低（消费者向） |
| D | 新加坡餐馆协会 RAS | ras.org.sg | 初筛可接 |
| E | 食品局 SFA（有 RSS）、企业发展局、人力部 MOM、统计局（餐饮服务指数） | — | 初筛可接 |

### 泰国、越南、印尼、菲律宾

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| C | Bangkok Post | bangkokpost.com | 初筛可接 |
| C | The Nation | nationthailand.com | 初筛可接 |
| C | Khaosod English | khaosodenglish.com | 首页挡 |
| C | Brand Inside（泰文） | brandinside.asia | 初筛可接 |
| C | Marketeer（泰文） | marketeeronline.co | 初筛可接 |
| C | Prachachat、Thansettakij、Bangkok Biz News（泰文） | — | 待查 |
| D | 泰国餐馆协会 | — | 待查 |
| C | VnExpress International | e.vnexpress.net | 拒绝 AI 阅读 |
| C | Vietnam Investment Review | vir.com.vn | 初筛可接 |
| C | CafeF（越文） | cafef.vn | 初筛可接 |
| C | The Investor、VietnamNet | — | 初筛可接 |
| C | Vietnam News「bizhub」、Brands Vietnam | — | 待查 |
| F | iPOS.vn 越南餐饮市场年报（调查 4,005 家店） | ipos.vn | 待查 |
| C | Katadata | katadata.co.id | 初筛可接 |
| C | SWA、Marketeers、DailySocial、CNBC Indonesia | — | 初筛可接 |
| C | Kontan、Bisnis.com | — | 拒绝 AI 阅读 |
| A/D | Foodizz（餐饮业者社群）、APKRINDO（咖啡馆与餐厅业者协会）、PHRI | — | 待查 |
| C | BusinessWorld | bworldonline.com | 价值低（综合财经） |
| C | Philstar | philstar.com | 初筛可接 |
| C | Inquirer Business | business.inquirer.net | 首页挡·只拒训练 |

## 南亚

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| A | ET HospitalityWorld | hospitality.economictimes.indiatimes.com | 初筛可接·只拒训练 |
| A | Restaurant India | restaurantindia.in | 初筛可接（RSS 很少） |
| A | Hospitality Biz India | hospitalitybizindia.com | 初筛可接 |
| A | Franchise India | franchiseindia.com | 初筛可接 |
| C | Inc42（Content-Signal 写明允许 AI 阅读） | inc42.com | 初筛可接·只拒训练 |
| C | YourStory | yourstory.com | 待查 |
| D | 印度餐馆协会 NRAI | nrai.org | 待查 |

## 中东与非洲

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| A | Hotelier Middle East | hoteliermiddleeast.com | 首页挡 |
| A | Caterer Middle East | caterermiddleeast.com | 首页挡 |
| A | Food Business MEA | foodbusinessmea.com | 初筛可接 |
| A | Hospitality News（中东） | hospitalitynewsmag.com | 待查 |
| C | Arabian Business | arabianbusiness.com | 首页挡 |
| C | Gulf Business | gulfbusiness.com | 读不到 |
| C | TradeArabia、Arab News 商业版 | — | 待查 |
| E | 沙特中小企业局 Monsha'at | — | 待查 |
| D | 南非餐馆协会 RASA | — | 待查 |
| C | Eat Out（南非）、BusinessTech（南非） | — | 待查 |

## 欧洲

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| A | BigHospitality（英国） | bighospitality.co.uk | 初筛可接·只拒训练 |
| A | Restaurant Online（英国） | restaurantonline.co.uk | 初筛可接·只拒训练 |
| A | Propel（英国） | propelinfo.com | 初筛可接 |
| A | Hospitality & Catering News（英国） | hospitalityandcateringnews.com | 初筛可接 |
| A | Morning Advertiser（英国酒吧业） | morningadvertiser.co.uk | 初筛可接·只拒训练 |
| A | The Caterer（英国） | thecaterer.com | 条款不许 |
| A | MCA Insight、Casual Dining（英国） | — | 待查 |
| D | UKHospitality | ukhospitality.org.uk | 待查 |
| A | Néo Restauration（法国） | neorestauration.com | 读不到 |
| A | L'Hôtellerie Restauration（法国） | lhotellerie-restauration.fr | 读不到 |
| A | Snacking.fr（法国） | snacking.fr | 初筛可接 |
| A | Food Service Vision、Zepros Resto（法国） | — | 待查 |
| D | UMIH、GHR（法国） | — | 待查 |
| A | AHGZ（德国） | ahgz.de | 拒绝 AI 阅读 |
| A | food-service.de（德国） | food-service.de | 拒绝 AI 阅读 |
| D | DEHOGA（德国） | dehoga-bundesverband.de | 待查 |
| A | Italia a Tavola（意大利） | italiaatavola.net | 初筛可接 |
| A | Ristorazione Italiana Magazine（意大利） | ristorazioneitalianamagazine.it | 初筛可接 |
| A | Pambianco Wine & Food（意大利） | pambianconews.com | 初筛可接 |
| A | Gambero Rosso（意大利） | gamberorosso.it | 待查 |
| D | FIPE（意大利公共场所业者联合会） | fipe.it | 待查 |
| A | Gastroeconomy（西班牙） | gastroeconomy.com | 初筛可接 |
| A | Restauración News（西班牙） | restauracionnews.com | 读不到 |
| D | Hostelería de España、Marcas de Restauración（西班牙） | — | 待查 |
| A | Misset Horeca（荷兰） | missethoreca.nl | 待查 |
| D | KHN（荷兰，1.7 万会员） | khn.nl | 待查 |
| D | Visita（瑞典，与统计局合作的餐厅指数） | visita.se | 待查 |
| A | Restauratören（瑞典） | restauratoren.se | 待查 |
| D | Horesta（丹麦） | horesta.dk | 待查 |
| A | Ресторанные ведомости（俄罗斯） | restoved.ru | 待查 |

## 美洲（美国以外）

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| D | 加拿大餐馆协会 Restaurants Canada | restaurantscanada.org | 初筛可接 |
| A | Foodservice and Hospitality（加拿大） | foodserviceandhospitality.com | 读不到 |
| A | RestoBiz、Canadian Restaurant News（加拿大） | — | 待查 |
| C | Expansión（墨西哥） | expansion.mx | 初筛可接 |
| C | Merca2.0（墨西哥） | merca20.com | 拒绝 AI 阅读 |
| D | CANIRAC（墨西哥餐饮业商会） | canirac.org.mx | 待查 |
| A | Mercado & Consumo（巴西，有餐饮栏） | mercadoeconsumo.com.br | 初筛可接 |
| D | Abrasel（巴西酒吧与餐厅协会） | abrasel.com.br | 初筛可接 |
| C | Exame、Valor（巴西） | — | 待查 |
| C | Perú Retail（覆盖拉美多国） | peru-retail.com | 待查 |
| D | ACHIGA（智利）、ACODRES（哥伦比亚）、FEHGRA（阿根廷） | — | 待查 |

## 大洋洲

| 类型 | 名称 | 网址 | 状态 |
|---|---|---|---|
| A | Hospitality Magazine（澳洲） | hospitalitymagazine.com.au | 初筛可接 |
| A | QSR Media（澳洲） | qsrmedia.com | 初筛可接 |
| A | The Shout（澳洲酒水） | theshout.com.au | 待查 |
| D | Restaurant & Catering Australia | rca.asn.au | 待查 |
| A | Hospitality Business（新西兰） | hospitalitybiz.co.nz | 读不到 |
| D | Restaurant Association of New Zealand | restaurantnz.co.nz | 待查 |

## 还没搜过的空白

葡萄牙、波兰、捷克、希腊、土耳其、以色列、埃及、尼日利亚、肯尼亚、巴基斯坦、孟加拉、斯里兰卡、柬埔寨、缅甸，以及各国的连锁品牌新闻室、外卖平台新闻室、展会网站的逐个筛查。
