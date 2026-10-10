# 第三阶段：各国餐饮行业媒体（2026-10-11）

> 范围：计划 `myfnb/plan-2026-10-10-sources.md` 3.2 的「行业媒体」一行，按第 4 节的漏斗走到试配。只做调研和试配，没有改仓库里已有的文件，没有提交，没有连服务器，没有开子代理。
> 每个看过的候选在同目录的 `ledger-rows.tsv`（801 行），通过全部八步的在 `candidates.json`（1 个），试配成功但待定的 PMQ 在 `trial.json`。
> 数字除标「估计」的以外都是数出来的（`funnel-counts.json`；`universe-counts.json` 是加进点名的 29 个以前各名录的行数，当时是 912 个域名）。
> 所有请求都由脚本发出，用 `MyFnBBot/1.0` 的标识；没有用代理、Jina Reader、WebFetch 或搜索工具；候选没有一个来自关键词搜索。三处没有守住访问间隔或 robots，见第 7 节。
> 重跑：`wd.mjs`、`fz.mjs`、`add.mjs`、`mp.mjs`、`anes.mjs`、`fuji.mjs`、`fuji2.mjs`（读名录，结果在 `dirs/`）→ `mk-universe.mjs`（全集，对账本）→ `home.mjs`（读首页）→ `cls.mjs`（题材，结论在 `subjY.json`、`auto-out.tsv`）→ `myfnb/sourcing/discover.mjs`、`discover2.mjs`、`feeds.mjs`（订阅）→ `myfnb/check-sources.mjs`（`s5-check.txt`）→ `view.mjs`、`heads.mjs`（看标题）→ `terms2.mjs`、`tread.mjs`（条款，原文在 `terms/`）→ `vet-sources.ts`、`dates.ts`、`peek.ts`（试抓）→ `build.mjs`（出 `ledger-rows.tsv` 和 `funnel-counts.json`，每个候选的结论都写在这个脚本里）。

## 1. 漏斗

实际的顺序和任务书略有不同：先读首页（同时得到能否读到、建站平台、订阅地址），再判题材；内容尺子放在条款前面，只给「强」的读条款。表按实际顺序列。

| 步骤 | 剩下 | 这一步出局或搁下的 |
|---|---|---|
| 0 全集（各名录合计 1,268 行，按域名去重） | **941** | 来源见第 2 节 |
| 1 和账本、`sources.json` 去重 | **801** | 140 个已有结论，没有重查（其中 1 个是已接入的 Barra de Ideas 的另一个地址） |
| 4a 首页读得到（返回 200） | 649 | 152 个读不到：403 85，检查页（202）21，连不上 33，404 5，402、429、5xx 共 8。都记不接，没有换标识 |
| 3 题材：写给餐饮经营者的行业媒体 | **132** | 517 个不符，见 1.1 |
| 2 建站平台 | 129 | 3 个建在 Wix 上（Chippy Chat、Fast Food Professional、Panificação Brasileira） |
| 4b 有订阅 | 95 | 34 个没有订阅：读了首页标题，19 个待定，15 个不接，见 1.3 |
| 4c 订阅在更新（近 180 天不少于 3 篇） | 84 | 11 个停更、更新太少或读不到 |
| 5 自动合规（robots、拒绝 AI 的规则、TDMRep） | 79，另 1 个改走网页列表 | 4 个 robots 拒绝代用户读网页的 AI（KOCA、ahgz.at、el Restaurante、Misset Horeca）；KTCHNrebel 的 robots 禁 `/feed/`，栏目页和文章页不禁，改做网页列表 |
| 7 内容尺子（80 个） | **强 6** | 一般 30（28 个记待定，2 个因出版方条款已知直接不接），弱 44 |
| 6 自己的条款和平台条款（强的 6 个） | 2 | 4 个出局：Informa 旗下 1，只许个人使用 1，禁止商业使用 1，存入和处理须书面同意 1，见第 4 节 |
| 8 试配 | **1** | PMQ 试抓成功，但 10/1 从正式服务器测试时返回 403（规则 6），记待定 |

账本里的结果：**接入 1、不接 752、待定 48**（待定 = 内容一般 28 + 没有订阅 19 + PMQ 1）。

看过的 801 个里通过 1 个（0.1%）；只算题材对路的 132 个是 0.8%。这一类被挡下的主要原因不是条款，是内容：判过内容的 80 个里强的只有 6 个（7.5%）。

### 1.1 题材不符的 517 个

| 类别（由程序按首页标题和简介的关键词归） | 数量 |
|---|---|
| 写给食客的美食和生活方式内容 | 137 |
| 和餐饮经营无关，或不是媒体（展会、协会、机构、空页面） | 104 |
| 写给酒店和旅游业的 | 91 |
| 食品饮料制造和供应链类 | 82 |
| 零售和快消渠道类 | 41 |
| 公司、顾问或招聘网站的博客 | 31 |
| 设计、装修和建材类 | 21 |
| 各行业加盟的 | 10 |

其中 142 个是程序判的：只出现在 Feedspot 面向消费者或邻近行业的榜单（各国美食杂志、酒店、茶、巧克力、食品加工、加盟等），首页标题和简介里又没有行业用词；名单在 `auto-out.tsv`，域名逐个扫过一遍，拿回 1 个（Chippy Chat）。其余 375 个是 Claude 读首页标题和简介判的。「对路」的 132 个包括了团餐、外烩、面包糕点、冰淇淋、咖啡馆、酒吧这些邻近业态，也包括 15 个左右顾问和服务商办的博客（Feedspot 把它们列在餐厅经营类榜单里）。

### 1.2 按语种和国家

| 语种 | 全集 941 | 题材对路 132 |
|---|---|---|
| 英语 | 437 | 55 |
| 英语或未识别（.com 等域名，首页没有标语种） | 217 | 7 |
| 德语 | 64 | 16 |
| 法语 | 61 | 16 |
| 意大利语 | 54 | 10 |
| 西班牙语 | 36 | 10 |
| 荷兰语（含比利时 1） | 16 | 8 |
| 日语 | 16 | 1 |
| 葡萄牙语 | 14 | 3 |
| 韩语 | 6 | 1 |
| 北欧语言 | 4 | 2 |
| 其他（波兰、罗马尼亚、希腊、塞尔维亚、匈牙利、土耳其等） | 16 | 3 |

题材对路的 132 个按国家：美国 18、法国 13、德国 12、意大利 12、英国 11、荷兰 8、西班牙 7、奥地利 5、澳大利亚 3、巴西 3、印度 3，爱尔兰、智利、比利时、瑞士、挪威、南非各 2，加拿大、黎巴嫩、日本、希腊、罗马尼亚、秘鲁、塞尔维亚、波兰、哥伦比亚、韩国、菲律宾各 1，国家未记 14。全集里「国家未记」有 423 个（.com 域名，名录不给国家）。

日本、韩国、东南亚、印度、南非、爱尔兰、葡萄牙、拉丁美洲西语国家这一轮很薄，原因是这些地方的名录读不到，见 2.2。

### 1.3 没有订阅的 34 个

| 结论 | 数量 | 哪些 |
|---|---|---|
| 待定：首页标题读到了，内容一般 | 9 | La Cuisine Pro、France Pizza（法国），De CaféKrant、De RestaurantKrant、Food Inspiration（荷兰），Le Cafetier（瑞士），Dolcesalato（意大利），Pastelería、Hello Chefs（西班牙） |
| 待定：首页由脚本生成或没有文章列表 | 10 | Cooking + Catering Inside、Chefs best（德国），A-Tavola，Gelateria News（意大利），Hotel & Restaurant、Spotong（南非），대한급식신문（韩国），Horeca Magazine Noord（荷兰），Food Industry News（美国），ESAGESAC（秘鲁） |
| 不接：内容不过或读不到文章 | 15 | 见 `ledger-rows.tsv` |

## 2. 全集是从哪里取的

### 2.1 读到的名录

| 名录 | 读到多少 | 进全集（按域名去重） | 题材对路 | 强 |
|---|---|---|---|---|
| **展会的媒体伙伴页**（19 个展会，见下） | 454 行 | 384 | 84 | 3 |
| **Feedspot 榜单（补充）**：36 张榜单（杂志 29 张、博客 3 张、订阅 4 张），一共试了 96 个榜单地址，另外 60 个是 404 或空 | 665 行 | 503（其中 469 个只出现在 Feedspot） | 41 | 4 |
| **fachzeitungen.de**（德国）：6 个类目共 99 种（Hotel und Gaststätten - Catering - Gastronomie 20、Hotel und Gaststätten - Spitzenköche 19、Feinkost - Catering - Convenience 35、Getränke 14、Online Magazin 6、Bäckerhandwerk 5） | 99 种，68 种给了官网 | 47 | 6 | 0 |
| **Wikidata**（SPARQL）：有官网的行业杂志 725 种；按主题（餐厅、餐饮服务、酒店业、咖啡、面包店等）取到期刊和网站 87 个 | 从两批里挑出和餐饮有关的 15 个 | 15 | 4 | 0 |
| **FNPS**（法国专业期刊联合会）「Commerces et services」一类 | 51 个出版方网址，餐饮和食品的 15 个 | 15 | 5 | 1 |
| **ANES**（意大利行业期刊协会）名录 | 名称和餐饮、食品有关的 37 种，对路的 17 种；名录页不给官网，官网取自 Sigep、TuttoFood 的名单或 Claude 已知 | 11 | 2 | 0 |
| **Fujisan**（日本）「飲食店経営・調理師」30 种、「外食・ホテル業界」24 种 | 54 种，多数是柴田書店和旭屋出版的刊物和单行本；目录不给官网，Claude 填了 6 个出版方网址 | 6 | 1 | 0 |
| **点名**（没有名录出处，Claude 按国家补的，网址凭已知填）：印度 7、巴西 4、韩国 4、加拿大 4、爱尔兰 3，南非、葡萄牙各 2，哥伦比亚、智利、菲律宾、印度尼西亚、马来西亚、亚洲、非洲、中东各 1 | 34 个，5 个和名录重复 | 29 | 10 | 0 |

同一个域名可以出现在几类名录里，所以各行相加大于 941。

**展会的媒体伙伴页**是这一轮最有用的一类名录：从 112 个展会和协会的首页找「媒体伙伴」页，读到名单的 19 个：EquipHotel（法国）92、Sigep（意大利）84、TuttoFood（意大利）62、Alimentaria（西班牙）30、Internorga（德国）22、NRA Show（美国）20、FHA（新加坡）20、HRC（英国）20、Europain（法国）20、Alles für den Gast（奥地利）16、Gastvrij Rotterdam（荷兰）14、Hostelco（西班牙）14、HCJ（日本）13、Fine Food Australia 6、Food Taipei 6、Fispal Food Service（巴西）5、Hotelga（阿根廷）4、iba（德国）3、Smak（挪威）3。有 9 个页面把媒体和赞助商、协会列在一起（Sigep、TuttoFood、Internorga、Gastvrij、Europain、HRC、Fine Food Australia、Fispal、Smak），媒体那一段是 Claude 按页面上的顺序截取的，截取的起止写在 `mk-universe.mjs` 里。协会网站的「伙伴」页都是赞助商，没有用。

### 2.2 读不到或没有用上的名录

| 名录 | 结果 |
|---|---|
| 韩国：한국전문신문협회（kosna.or.kr） | 522，连不上 |
| 韩国：Seoul Food & Hotel、Cafe Show | 证书过期或证书错误 |
| 泰国：THAIFEX、THAIFEX-HOREC | 检查页（202） |
| 越南：Food & Hotel Vietnam | 证书错误 |
| 马来西亚 FHM、印度尼西亚 FHI、菲律宾 WOFEX | 读得到，页面上没有媒体名单（只有赞助商或「成为媒体伙伴」的表单） |
| 印度：AAHAR | 域名解析不到 |
| 南非：Hostex | 名单由脚本生成，程序读不到 |
| 西班牙 HIP、新西兰 Fine Food NZ、澳大利亚 Foodservice Australia、美国 Pizza Expo 和 Bar & Restaurant Expo、英国 The Pub Show | 403 |
| 日本専門新聞協会 | 读到 81 家会员，食品一类 5 家（酿造、粮食、乳业、糖果），没有写给餐饮店的，没有进全集 |
| Coneqtia（西班牙）、Deutsche Fachpresse、ÖZV（奥地利）、PPA（英国）、Fagpressen（挪威）、Sveriges Tidskrifter（瑞典）、Danske Medier、Aikakausmedia（芬兰）、ANATEC（巴西）、TABPI | 首页读得到，没有找到按行业分的会员刊物名单（ANATEC 的会员页只有 9 个链接，餐饮的 0 个） |
| WebWire 的行业刊物名单（Restaurants 一类 7 页，每页 25 个） | 只有刊名，没有网址，很多已停刊，没有用 |
| IFEC（美国餐饮媒体编辑协会） | 域名现在是博彩网站 |
| Mondo Times | 网站已不在 |
| 维基百科的分类页、EIN Presswire 的 World Media Directory | 没有做 |

计划里写 fachzeitungen.de 餐饮住宿类约 114 种，这一轮没有数到：每个类目页只列 5–35 种，没有分页；相关的 6 个类目合计 99 种，其中 31 种没有官网或只有 issuu 的电子刊。

## 3. 通过的 1 个

| id | 来源 | 国家 | 内容 | 文章数 | 每 30 天 | 日期从哪里取 |
|---|---|---|---|---|---|---|
| `web-ktchnrebel` | KTCHNrebel（厨房设备商 RATIONAL AG 办的餐饮经营网络杂志，英文版；另有德文、西班牙文版） | 德国 | 强：2026 年的 9 篇里 7 篇 | 栏目页 27 篇 | 约 1 | 文章页的 meta |

- **内容**：成本压力下餐厅怎样应对（多休一天、减菜单）、缺人的出路、厨房流程、HACCP 怎样落实、开放式厨房要注意什么、250 位厨房负责人的调查。文章由外部记者写，有具体的店和数字；个别文章介绍自家设备。
- **条款**：出版方专门有一页「Content Usage for Journalists」，原文：「Our articles may serve as a basis for summaries, commentaries or further discussion, provided that the content is editorially reworked and not published unchanged or word for word. KTCHNrebel.com must be named as the original source and included via a clickable link to the original article.」（https://www.ktchnrebel.com/content-usage-for-journalists/ ）。本站的做法（自己写摘要、链接原文）正在允许的范围内。Disclaimer 和 Imprint 没有限制使用的句子。网站另有一页给 AI 系统读的「Grounding Page」。
- **完整档案**：只涉及 `www.ktchnrebel.com` 一个主机（自建 WordPress，不在托管平台上）；robots.txt 对 `*` 只禁 `/wp-admin/`、站内搜索和各语言的 `/feed/`，没有点名任何 AI；没有 Content-Signal，没有 TDMRep；没有付费墙，没有通讯社稿件。
- **为什么是网页列表**：订阅 `/feed/` 被 robots 禁（规则 1），所以用栏目页 `https://www.ktchnrebel.com/topic/business-growth/`（经营类：缺人、运营成本、可持续）。这个栏目不含名厨人物和食物趋势两类文章。
- **核对**（`candidates-check.txt`、`candidates-vet.txt`、`trial-detail.txt`、`trial-peek.txt`）：`check-sources.mjs` 通过；`vet-sources.ts` 抓到 27 条，标题正确；12 篇的日期取自文章页，和订阅里的日期一致（例如 2026-07-09、06-11、08-04）；3 篇正文 6,000–11,500 字符，是文章本身。
- **主会话接之前要知道的**：列表最前面 4 条是置顶，不按时间排；两篇视频稿正文只有 200 多字符；一年只有十来篇，价值更多在参考库；部署后服务器是否被挡（规则 6）没有查。

## 4. 内容强、被条款或规则挡住的 5 个

| 来源 | 国家 | 内容 | 挡在哪里 |
|---|---|---|---|
| **PMQ Pizza** | 美国 | 近 10 条里 6 条是比萨店主的做法和经过；16,423 篇（1997 年起），订阅带全文，每天约 2.5 条 | **不是条款**：出版方 Arrowfly（原 WTWH Media）的条款和已接的 FSR 是同一份，没有限制；robots 只有 Crawl-delay 10。挡在规则 6：`sources.json` 的 `$comment` 记着 10/1 从正式服务器测试时返回 403，同一出版方的 QSR Magazine 10/2 也被挡。这台机器试抓成功，配置在 `trial.json`。记待定 |
| **Les Nouvelles de la Boulangerie-Pâtisserie** | 法国 | 6/10：行业利润率、面包店各类产品的增值税率、电子发票、店主失业人数 | 法律声明：「Toute utilisation dans un cadre professionnel ou commercial … est interdite, sauf accord exprès」，订阅和电子报同样适用 |
| **MENU Magazine** | 加拿大 | 约 6/10：熟客、GLP-1 对客流的影响、制服的隐性成本 | 出版方 Restaurants Canada 的条款只许个人使用（账本已有结论） |
| **Österreichische Bäckerzeitung** | 奥地利 | 5/10（在分界上）：食品价格、谷物收成、卫生、鸡蛋供应 | Impressum：超出著作权法界限的使用都要书面同意，并点名「Speicherung, Verarbeitung … in Datenbanken oder anderen elektronischen Medien und Systemen」。按最低风险判不接；如果主会话读成通用的保留权利（规则 4）可以改判，其余各项都通过 |
| **Restaurant Business** | 美国 | 约 6/10：定价限制、休闲正餐回暖等分析 | Informa 旗下，账本对同一出版方的结论是条款不许 |

另有 **Ristoranti**（意大利，内容一般，11/30）读了条款：出版方 Tecniche Nuove 只许「strettamente personali」的使用，不接。

**值得写信征求同意的**（按内容和成功的可能排）：

1. **PMQ / Arrowfly**：要的不是内容许可，是请对方放行 `MyFnBBot` 和服务器的地址。联系地址出自条款页 https://www.wtwhmedia.com/terms/ ：tc@arrowfly.com、info@arrowfly.com。对方同意的话，同一出版方的 QSR Magazine 也可以一并恢复。写信以前先从服务器再测一次，可能已经不挡了。
2. **Les Nouvelles de la Boulangerie-Pâtisserie**：法律声明里写明商业使用要向 sotal@boulangerie.org 申请（出处：https://lesnouvellesdelaboulangerie.fr/mentions-legales/ ）。法国面包糕点业联合会的报纸，是这一轮「钱、税、用工」写得最实的一个。
3. **Österreichische Bäckerzeitung**：office@baeckerzeitung.at（出处：Impressum https://baeckerzeitung.at/impressum-offenlegung/ ）。出版方 Die Schnatterei e.U. 是一家小出版社。
4. **MENU Magazine / Restaurants Canada**：条款写要「prior written permission」；这一轮没有另找联系邮箱，条款页地址在账本 `w1010-ca-restaurants-canada` 一行。
5. Restaurant Business（Informa）：可能性小，排在最后。

## 5. 内容一般的 28 个（记待定，条款没有读）

比例只按最新 10 条左右的标题，每个的数字在 `ledger-rows.tsv`。接近一半、值得主会话再看的：

- **Panissimo**（瑞士面包糕点业协会的会刊，swissbaker.ch，德语和法语）：近 20 篇里孕产保护、集体劳动合同、议会会期、受益人登记制度约 6–7 篇；Impressum 只有联系方式，没有限制性条款，robots 通过。
- **Horeca Channel Italia**、**Ristorazione Moderna**（意大利）：各约 4/10，开酒吧的成本、饮料销售数据、消费调查。
- **Australian Hotelier**（theshout.com.au）：酒馆业政策和经营约 3/10；出版方 Intermedia 和已接的 Hospitality 相同。
- **Restaurant Dive**、**Restauration21**（法国）、**CFE News**、**World Coffee Portal**：各约 3/10，其余是连锁快讯。
- **Pekar & Poslastičar**（塞尔维亚）：面包店和糕点店的店家故事约 4/10，每月 1 篇。

其余：The Caterer（订阅最新一条是 2025-11）、catering.de、BÄKO-magazin、Restaurant Den、Pizza Marketplace、QSRweb、FastCasual、Pizza Pasta & Italian Food、Honoré le Mag、Grandes Cuisines、Industrie Hôtelière、Comunicaffè、Brutarul-Cofetarul（罗马尼亚）、Kokswereld、Pain & Pâtisserie、Artù、Italian Gourmet、Entree Magazine、Canal Horeca。

## 6. 这一轮的发现

1. **行业媒体这一类，挡住的主要是内容，不是条款。** 判过内容的 80 个里：强 6、一般 30、弱 44。弱的几乎都是同一种：开业、任命、获奖、展会预告、厂商新品。和账本此前的经验（多数因条款出局）不同，是因为这一轮把内容放在条款前面判。
2. **内容最实的是行业协会办的报纸**，不是商业媒体：强的 6 个里 3 个是协会的（法国面包糕点业联合会、加拿大餐饮协会，另一个奥地利面包师报面向同一类读者），一般里最好的 Panissimo 也是。它们写税率、用工法规、行业利润率，正是日报要的；但协会的条款多数只许会员或个人使用。这几个最值得写信。
3. **明文允许「改写成摘要并链接原文」的条款是存在的。** KTCHNrebel 专门有一页写这件事。以后读条款可以先找「Content Usage」「Nutzung für Journalisten」这一类页面。
4. **展会的媒体伙伴页是取行业媒体全集最好的名录**：384 个域名里 84 个题材对路（22%）；Feedspot 503 个里只有 41 个（8%），而且多数是写给食客的杂志和酒店业博客。德国、法国、意大利、西班牙、荷兰的行业媒体基本靠这一类取到。
5. **亚洲和南半球的名录多数读不到**（证书错误、检查页、名单由脚本生成）。韩国、东南亚、印度、南非的候选只有点名的 29 个里的十来个，这些地方不能说已经取到全集。
6. **PMQ 是这一轮内容上最合适参考库的来源**（比萨店主自己的经过，近三十年的存档），条款没有障碍，只差服务器被挡这一件事。
7. **顺带看到的**：
   - 已接入的 Barra de Ideas 现在还有一个地址 `barradeideas.theobjective.com`（Hostelco 的媒体伙伴页链到这里）；原订阅 `barradeideas.com/feed/` 10/11 仍然可读、最新一条是 10/9，不需要改。
   - Global Coffee Report（10/1 因服务器 403 去掉）这台机器读得到；内容弱（咖啡产业上游），不用再看。
   - The Caterer 的订阅最新一条停在 2025-11。
   - F&B Report（菲律宾，fnbreport.ph）的域名现在是停放页。
   - Industrie Hôtelière、Grandes Cuisines、Restauration Collective 是同一出版方，同一篇文章在三处出现；Tribune des Boulangers Pâtissiers 的两个域名是同一份订阅。接其中任何一个都要先去重。

## 7. 没有做完的部分和局限

| 部分 | 数量 | 说明 |
|---|---|---|
| 首页读不到的 | 152 | 403 的 85 个里题材多半对路的有 fizzz（meininger.de）、blgastro.de、Contract Catering Magazine、Dine Out、quickservemagazine.co.uk、Caterer Middle East、Revista Hotel News、mabhostelero、Publituris、Giro News、Asia Food Journal；没有换标识。可以从服务器再试，多数是内容分发网络按机器人规则挡的 |
| 没有订阅的 | 19 个待定 | 9 个首页标题一般；10 个首页由脚本生成，没有用浏览器去读 |
| 内容一般的 | 28 个待定 | 没有读条款 |
| 账本已有的 | 140 | 没有重查。其中有按旧标准判的 |
| 读不到的名录 | 见 2.2 | 韩国、东南亚、印度、南非、北欧各国的行业期刊协会没有取到按行业分的名单 |
| 规则 6 | 1 | KTCHNrebel 部署后约 30 分钟要查服务器是否被挡 |

局限和没有守住规矩的地方：

- **访问间隔**：自己写的脚本同一主机间隔 1.3 秒。但仓库里的 `discover.mjs`、`discover2.mjs` 找订阅时会对同一主机连续试几个常见路径，中间没有间隔（129 个主机各 1–8 次）；`check-pass.mjs` 找 PMQ 订阅的最后一页时请求了十几次，间隔 1.5 秒，而 PMQ 的 robots 写的是 Crawl-delay 10。
- **robots**：`discover.mjs` 和 `feeds.mjs` 不读 robots，所以 KTCHNrebel 的 `/feed/`（robots 禁）被读了一次；KOCA、ahgz.at、el Restaurante、Misset Horeca 的订阅也在 robots 检查之前各读了一次。读到的内容只用来判这一轮的结论。
- **题材**只按首页的标题和简介判，一个网站一行，没有打开栏目。517 个不符里的类别是程序按关键词归的，个别会归错类别（不影响「不符」的结论）。写给酒店业的媒体里有餐饮栏目的（例如 Supper、Hospitality Insiders）按「纯酒店业」出局了。
- **内容**只按订阅里最新 10 条左右的标题判；多读的只有 Panissimo（20 篇）、Ristoranti 和 The Caterer（各 30 条）。打开正文的只有 KTCHNrebel 3 篇、PMQ 3 篇。「强」和「一般」的分界在 Österreichische Bäckerzeitung（5/10）、MENU（6/10）上是 Claude 的判断。
- **条款**只读了强的 6 个和 Ristoranti；每个读了首页的法律类链接和常见路径下的页面，隐私政策只扫了关键词。Österreichische Bäckerzeitung 的 AGB 有 4 万字符，只读了适用范围和第 VII 节。PMQ 的条款沿用账本里对同一出版方（FSR）的结论，这一轮重读了全文里带禁止、许可、复制、自动、商业、个人字样的句子，并读了 AI Policy。
- **Feedspot** 占全集的一半以上（503 个，其中 469 个只出现在它上面），按任务书只作补充；去掉它，全集是 472 个。
- **点名的 29 个**没有名录出处，网址凭已知填，其中 5 个连不上或域名已失效。
- **国家**：.com 一类的域名名录不给国家，账本里写「国家未记」（423 个，题材对路的里 14 个）。
- 日文和中文来源这一轮没有进入试配，时区一项没有用到。
