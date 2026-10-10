# 播客全集 · 第一阶段：平台判定、去重、题材粗筛（2026-10-10）

> 依据：`myfnb/plan-2026-10-10-sources.md` 第 4 节的第 0–3 步。材料只有三样：本机的 Podcast Index 整库（2026-10-03 版，`C:\tmp\universe-dl\podcastindex\podcastindex_feeds.db`）、账本 `myfnb/sources-ledger.tsv`（8,816 行）、`industry/sources.json`（56 个来源）。
> 这一阶段没有访问任何播客的网站或订阅，没有改仓库里的文件，没有提交。
> 正文里的数字是这一版整库的快照；重跑（`bash scripts/run_all.sh <整库路径>`）以后以后面的表为准。标「估计」的是推算，其余是数出来的。

## 0. 先说结论

| | 订阅数 |
|---|---|
| 整库 | 4,734,025 |
| 去重以后 | 4,694,634 |
| 其中在**禁止**的平台上 | 3,491,950（74.4%） |
| 在**允许**的平台上 | 334,832（7.1%） |
| 在节目方**自有域名**上 | 76,092（1.6%） |
| 在**未读**的平台和多节目主机上 | 791,760（16.9%） |

题材粗筛筛中 **8,422 个**（不限是否还在更新）。扣掉账本里已有的 239 个、同名重复的 185 个、少于 5 集的，剩下的「新候选且 5 集以上」是：

| 平台结论 | 筛中 | 新候选且 5 集以上 | 按抽样的查准率折算，题材真正对路的（估计） |
|---|---|---|---|
| 允许的平台 | 1,376 | 770 | 允许和自有合计约 190–290 |
| 自有域名 | 100 | 68 | |
| 未读的平台和多节目主机 | 1,343 | 841 | 约 190–290 |
| 禁止的平台 | 5,603 | 3,606 | 约 810–1,230 |

- **查全率**：账本里判过内容的正例 151 个，整库里找到 139 个，三轮关键词分别筛中 118、127、127 个，即 84.9%、91.4%、91.4%。这个数偏乐观，原因见第 4 节。
- **查准率**：从筛中的 8,422 个里随机抽 200 个逐个读标题和简介：是目标题材 44 个，分不出 23 个，不是 133 个，即 **22.0%–33.5%**。强信号 30.2%–47.2%，弱信号 12.8%–18.1%。
- 这张筛子是给下一步的模型用的粗筛，取向是宁可多不可漏。它筛中的三四个里只有一个是对的，**不能把「筛中」当成「候选来源」的数**。
- **最要紧的一个数**：播客这一类，在现行规则下，允许的平台加自有域名上题材对路的新节目估计只有两三百个，而且还没有过节目方自己的条款、robots 和内容尺子；未读的平台全部读通过，最多再加两三百个；禁止的平台上有八百到一千二百个用不了，占题材对路的六成多。单靠播客到不了 1,000 个。
- 估计的算法：新候选且 5 集以上的，强信号个数乘 30.2%–47.2%，弱信号个数乘 12.8%–18.1%，两项相加。假定查准率不随平台和集数变（抽样里允许 31%–40%、未读 15%–27%、禁止 21%–33%，各只有三十几个到一百多个，差别在抽样误差以内）。

## 1. 每一步进多少、出多少

见后面的表 1、表 2、表 3。要点：

- **去重**去掉 39,391 行：`duplicateOf` 非空 2,845 行；同一个 `podcastGuid` 或同一个 `itunesId` 的 25,313 组里多出来的 36,546 行（每组留最近更新的那个，其次集数多的，再次编号小的）。`dead` 一栏整库都是 0，去掉 0 行（见第 7 节）。
- **平台结论**对去重以后的 4,694,634 行全部判了，没有「判不了」的一类：名单以外的主机按订阅数分成「自有域名」和「未读」。
- **题材筛**分两层：先留下标题或简介里有任何餐饮词根的行（118,538 行，宽口径，见 `anchor.py`），再用强、弱信号细判，筛中 8,422 行。
- **账本**：筛中的行里和账本或已接入来源对上的 239 个（按订阅地址 201 个；按订阅所在的域名 2 个；按节目网站的域名 36 个）。按域名对上的意思是「这家出版方账本里看过」，不等于这个播客本身判过。
- **活跃程度**以整库的最后更新时间（2026-10-04）为准往前数。筛中的 8,422 个里：近 90 天有更新 1,388 个，90 天以前到两年以内 1,834 个，两年以前 4,748 个，没有日期 452 个。停更的是在更新的五倍，和计划里的判断一致。
- **少于 5 集**的在候选表里用 `few_episodes` 一列标出（集数为 0 的也在内）：允许 514、自有 28、未读 438、禁止 1,825。

## 2. 平台和主机怎样判

### 2.1 三样合起来

每个订阅看三样，结论不同的取最严的（禁止 > 未读 > 允许 > 自有）：

1. **订阅主机**：从 `url` 取整段主机名，按后缀对平台名单（库里的 `host` 一栏大小写不统一，还有被截断的，没有用它）。
2. **音频主机**：从 `newestEnclosureUrl` 取。音频地址前面的统计前缀先剥掉，剥到真正放音频的主机为止。前缀名单 59 个主机，是从整库里数出来的（路径里嵌着另一个主机名的音频主机，按订阅数从多到少逐个看过前 110 个）：podtrac（3 个主机名，共 11.7 万个订阅在用）、media.blubrry.com（3.8 万）、pdcn.co、op3.dev、pscrb.fm、chrt.fm、chtbl.com、pdst.fm、mgln.ai、prfx.byspotify.com、gum.fm、claritaspod.com、swap.fm 等，全表在 `pilib.py` 的 `PREFIX_HOSTS`。一条地址常常套好几层，最多见到 8 层。
3. **generator**：只在它写的是托管平台自己的名字时才用。`Castos/SSP`（4.5 万个订阅）和 `Blubrry PowerPress`（1 万多）是装在自建 WordPress 上的插件，不是托管平台，不用它判。

统计前缀怎样算：属于禁止或未读平台的跟踪主机（sw.soundon.fm、track.fstry.me、audio.voxnest.com、flex.acast.com、dts-api.xiaoyuzhoufm.com 等）照算那个平台；纯统计的第三方前缀（podtrac、op3、pdcn 等）和允许平台的统计跳转（media.blubrry.com）不改变结论，但记在候选表的 `audio_prefixes` 一列，因为本站的程序下载音频时要先经过它们，它们各自的 robots 和条款下一阶段要查。

### 2.2 平台名单和依据

允许 5 个、禁止 25 个（任务给的 21 个，加账本里另有平台级结论的 4 个：Fireside、痞客邦、方格子、Brunch）、账本里是「待定」的 6 个按未读。每个平台用到的域名和 generator 写法在 `pilib.py` 的 `PLATFORMS`，依据所在的账本行和各平台的订阅数见表 5。和任务给的名单不同的地方：

- **Fireside 按禁止**：账本 L8575 写「规则 3（Fireside 条款禁止机器人访问）」。它只来自一行「不接」的理由，没有单独的平台行；整库里 1,710 个订阅，题材候选 4 个，影响很小。要不要补一行正式的平台结论，由主会话定。
- **Megaphone、ART19、LetsCast、Kajabi、声湃、Zencast.fm 按未读**：账本里都只有「待定」或半句话（各行的原话见表 5）。
- **Acast 的域名里加了 pippa.io**（1,217 个订阅）：Pippa 并入 Acast 是凭记忆写的，没有验证。
- **Spotify/Anchor 的域名里加了 d3ctxlq1ktw2nl.cloudfront.net**：整库里 anchor.fm 的音频地址把这个主机写在路径里（数据里看到的），所以判成 Anchor 的音频主机。
- **Wix、Medium、YouTube** 按主机名只认得出 33、5、574 个订阅：用自定义域名建在 Wix 上的网站，从订阅地址看不出来。
- **beehiiv** 账本里没有，计划 §3.3 把它列为不投入；这里按未读（424 个订阅，题材候选 2 个）。
- **喜马拉雅的国际版 himalaya.com**（314 个订阅，近 90 天 0 个）没有并进喜马拉雅，按未读。

### 2.3 自有域名的判断规则和局限

规则：订阅主机和音频主机都不在平台名单上，并且订阅所在的「计数单位」上整库不超过 3 个订阅，音频所在的计数单位上（按剥掉前缀以后的音频主机数）也不超过 3 个订阅。计数单位一般是注册域名；云存储和通用托管（amazonaws.com、cloudfront.net、googleapis.com、github.io 等 30 多个后缀）按整段主机名算，路径式的存储桶再加第一段路径。超过 3 个订阅的归「未读」，名字就是那个域名。

局限：

- 注册域名是近似算的（两段国家后缀按三段取），没有用公共后缀表。
- 「不超过 3 个」是沿用计划里的口径。一家电台、一所大学、一个播客网络在自己域名上放几十个节目，同样没有托管平台这一层，但会被归到未读（例如 radiofrance-podcast.net 7,052 个订阅、cam.ac.uk 21,025 个）。未读一类共 9,934 个平台或主机：200 个订阅以上的 279 个（共 663,464 个订阅），20–199 个订阅的主机共 76,410 个订阅，不到 20 个订阅的主机共 51,886 个订阅。后两类多半是这种「自己的域名、多个节目」，下一阶段可以不当平台读条款，直接走节目方自己的条款。
- 反过来，自有域名里也混着托管平台：自定义域名指到 Transistor、Captivate 之类的订阅，主机名看不出来，只有音频主机露出平台时才判得对。只有 1–3 个订阅的小托管商也会被当成自有域名。
- 和计划 §3.1 的 114,095 不同：那个数只看订阅主机，这里连音频主机一起看，所以是 76,092。

### 2.4 这一阶段判不了的

- **音频主机拒绝 AI 训练与否**：要读各主机的 robots.txt，这一阶段不联网，判不了。已知 Megaphone 的音频主机拒绝（账本 L8816）。转写用 Gemini 免费层期间这一条会再挡掉一批，留到第 5 步。
- **Podigee 开了动态广告的节目**（音频跳到 adswizz.podigee-cdn.net）：跳转发生在下载时，库里看不到。Podigee 上的题材候选 111 个都要在下一阶段各试一次。
- **订阅本身的跳转**：订阅地址跳到别的主机的（规则 5 要两边都查），库里只有登记的地址。

## 3. 题材筛的做法

- 文字先清洗：去 HTML 标签和实体、统一全半角、小写、拉丁字母去重音（café→cafe、hostelería→hosteleria、Bäckerei→backerei、nhà hàng→nha hang），阿拉伯语去音符。标题和简介（前 1,500 个字符）都看。
- **强信号**：出现任何一条就算。27 组正则，覆盖英、德、法、西、葡、意、荷、北欧、波兰、土耳其、印尼和马来、越南、俄和乌克兰、阿拉伯、印地、日、韩、中文简繁、泰，外加几个多国通用的行业词（horeca 等）。写法是「店的种类或行业词 ＋ 经营的角色或动作」连在一起，例如 restaurant owner、bar business、open a café、Gastronom、restaurateur、hostelero、dono de restaurante、ristoratore、horeca、飲食店経営、외식업、餐饮创业、开咖啡店、ธุรกิจร้านอาหาร。
- **弱信号**分三种：① 一个「店或行业」词和一个「经营」词同时出现，两个词都在标题里，或在文字里相隔不超过 100 个字符（中日韩泰 30–40 个字符）；② 标题里有行业词（restaurant、hospitality、餐饮、外食、开店 等），不要求经营词；③ 店主口吻（my restaurant、unser Café、notre boulangerie 等）。② 和 ③ 是第 2 轮为了查全加的。
- 语言：非拉丁文字按文字判（假名→ja、谚文→ko、汉字→zh……），其余用订阅自己声明的语言。声明的语言常常是错的（西班牙语节目写 en 的不少），所以表 4 里拉丁文字各语言的数只能看大概。
- 候选表多给了几列：`where`（信号命中在标题 title、简介前 300 个字符 head、还是更后面 tail）、`rule`（命中的那条规则和原文）、`activity`、`few_episodes`、`audio_prefixes`、`language_declared`、`ledger_match`、`lastHttpStatus`、`same_title_as`。`where` 对查准率影响很大（见下），下一步可以按它排先后。

关键词表全文在附录 B。

## 4. 校准

### 4.1 查全率

对照集（`scripts/00_positives.py`，清单在 `work/positives.tsv`）：

- 正例 151 个：账本里结果是「接入」或「保留」的播客 129 个（任何一行理由里写了「不是讲餐饮经营」「内容不合」「写给食客」之类的不算），加 10/10「店主来源第二轮」里内容对路、因条款或读不到而不接的 22 个（Restaurant Owners Uncorked、TULUS、PIE 2 PIE、Restaurantes con Alma、De l'autre côté du comptoir 等）。
- 在整库里找到 139 个（按订阅地址 128 个、按节目名 10 个、按节目网站的域名 1 个）。没找到的 12 个里，1 个不是播客，2 个其实在库里（订阅地址不同、节目名多了副标题），其余 9 个在库里按节目名也找不到。**也就是说整库本身大约缺 6%**（150 个里缺 9 个，多是 2025 年以后在 Anchor、Riverside 上新开的节目；样本小，只能当提示）。

| 轮次 | 改了什么 | 筛中 | 查全率 |
|---|---|---|---|
| 第 1 轮 | 强信号 27 组；弱信号只有「店或行业词 ＋ 经营词」一种，窗口 70 个字符 | 118 / 139 | 84.9% |
| 第 2 轮 | 先收紧：publican 单数（西班牙语的动词）、「restaurants and bars」和单独的 food truck 从强降到弱、catering to、公司名里的「餐饮管理有限公司」、中日韩的弱信号只用在对应语言上。再放宽：动词和店之间多允许几个形容词（build a better restaurant）、窗口放到 100、法语加 industrie de la restauration、经营词加 ops、日语加 外食＋ニュース/市場/最前線、加「标题里有行业词」和「店主口吻」两种弱信号 | 127 / 139 | 91.4% |
| 第 3 轮（定稿） | 只修误中：licensed professional、educated bars、our bar exam；加 leaders、life in hospitality、Bäckerbranche | 127 / 139 | 91.4% |

各语言（第 3 轮）：英语 79/83，德语 17/18，法语 10/12，西班牙语 6/9，意大利语 4/4，中文 3/4，日语 2/3，荷兰语 2/2，丹麦语、泰语、俄语、葡萄牙语各 1/1。英语以外每种语言的正例都不到 20 个，分语言的查全率只能当提示。

没筛中的 12 个，分三种：

- 其实不是目标题材、是早期按节目名接进来的（5 个）：GastroLab（墨西哥报纸的美食节目）、創業搵食GUIDE（澳洲求职和创业）、STARTCUPS Coffee Talks（创业孵化器）、WholeStory（批发分销协会）、ChefTreff（零售电商）。把这 5 个从分母里去掉，查全率是 127/134＝94.8%。
- 库里的数据不对（1 个）：Panadería fácil 的标题和简介存成了某一集的。
- 真的漏了（6 个）：The Buildout（讲酒吧创办人，简介里只有 bar 和 founders，bar 单独不算词）、Cat & Cloud（咖啡师和精品咖啡，没有经营词）、AA Cafe Podcast（咖啡公司老板的漫谈）、お店ラジオ2（讲各种「お店」，没有餐饮词）、Le mot de la FAIM（univers Food）、De l'autre côté du comptoir（「fondatrice de Caoufé, un petit café de quartier」，店名隔开了）。这一类的共同点是店主在讲，但简介里没有行业词，关键词补不上，要靠模型读。

难的反例：第二轮里判为「内容不合」的 37 行，整库里找到 17 个，筛中 8 个（面包品类和做法、餐饮人闲聊、写给食客的披萨趣闻这类，标题和简介里的词和正例一样）。关键词分不开它们，这是意料之中的。

**这个查全率偏乐观**，三个原因：

1. 正例大多是当初按节目名里的关键词搜出来的，所以名字本身就带行业词：139 个正例里 59 个的强信号在标题里，而 8,422 个候选里强信号在标题里的只有 524 个。名字不带行业词的好节目，在对照集里本来就少。
2. 关键词是看过这些正例的名字以后写的，对照集和筛子不独立。
3. 旁证：有餐饮词根但没筛中的行里，分类同时带 food 和 business 的有 231 行，随手看了 40 行，其中四到六行是对路的（The Ice Cream Podcast「by Ice Cream Retailers about Ice Cream Retailers」、G-Life「G steht für Gastronomie」、讲果汁吧开店的、Coffee Science for CoffeePreneurs 等）。照这个比例，这 231 行里还有二三十个漏掉的。

### 4.2 查准率

从候选表随机抽 200 个（固定种子，`sample-200.csv`），逐个读标题和简介判：Y 是目标题材（餐饮店的经营，店主、创办人、经营者在说，或写给经营者听），N 不是，? 是只看标题和简介分不出来。判断是 Claude 一个人做的，没有第二个人复核；判断按 id 存在 `scripts/judgements-2026-10-10.tsv`。

| 分组 | 抽到 | 是 | 分不出 | 不是 | 查准率（下限–上限） |
|---|---|---|---|---|---|
| 全部 | 200 | 44 | 23 | 133 | 22.0%–33.5% |
| 强信号 | 106 | 32 | 18 | 56 | 30.2%–47.2% |
| 弱信号 | 94 | 12 | 5 | 77 | 12.8%–18.1% |
| 强信号，在标题里 | 9 | 6 | 1 | 2 | 66.7%–77.8% |
| 强信号，在简介前 300 个字符 | 77 | 23 | 15 | 39 | 29.9%–49.4% |
| 强信号，在简介更后面 | 20 | 3 | 2 | 15 | 15.0%–25.0% |
| 弱信号，在标题里 | 21 | 2 | 1 | 18 | 9.5%–14.3% |
| 弱信号，在简介前 300 个字符 | 54 | 9 | 4 | 41 | 16.7%–24.1% |
| 弱信号，在简介更后面 | 19 | 1 | 0 | 18 | 5.3% |

按语言（抽到的个数太少，只能当提示）：英语 145 个，19.3%–31.7%；西班牙语 15 个，26.7%；法语 9 个，33.3%；德语 7 个，28.6%–57.1%；日语 4 个，25.0%；俄语 4 个，50.0%；中文 4 个，25.0%；葡萄牙语 3 个，33.3%；荷兰语 2 个、意大利语 2 个都是 0；印尼语 2 个，50%–100%；瑞典语 2 个，0%–100%；保加利亚语 1 个，是。按平台结论、规则族、集数的分组在表 8。

不是目标题材的 133 个，主要是这几类：简介里顺带提到 restaurant、chef、hospitality 的泛访谈和闲聊；写给食客的城市吃喝指南和餐厅评论；酒店、旅游、葡萄酒、啤酒、食品生产；商家自己只有一两集的广告；餐饮员工聊当班的故事（不是经营者在讲）。「分不出」的 23 个多是写给酒店餐饮业从业者、看不出是不是餐饮，或店主主持但看不出谈不谈经营。

候选在各档的个数和正例落在各档的个数（表 8 末尾）合起来看：只取「强信号在标题或简介前 300 个字符」这两档，候选是 3,792 个，查准率大约三到五成，账本正例里落在这两档的是 110/139＝79%；全取是 8,422 个，查准率两到三成，正例 91%。

## 5. 未读的平台

按整库订阅数排的前 60 名在表 6（主机、订阅数、近 90 天有更新的订阅数、题材候选数）。按订阅数排的前 10 名和各自的题材候选数：

| 序号 | 平台 | 整库订阅数 | 近 90 天有更新 | 题材候选 | 其中新候选且 5 集以上 |
|---|---|---|---|---|---|
| 1 | Castbox | 50,534 | 314 | 53 | 16 |
| 2 | FeedBurner | 44,657 | 1,984 | 35 | 32 |
| 3 | Internet Archive | 32,174 | 245 | 26 | 21 |
| 4 | Hubhopper | 31,653 | 218 | 101 | 12 |
| 5 | RedCircle | 29,587 | 3,653 | 70 | 45 |
| 6 | Megaphone | 27,202 | 8,932 | 106 | 85 |
| 7 | Simplecast | 21,260 | 6,221 | 93 | 76 |
| 8 | cam.ac.uk（剑桥大学） | 21,025 | 0 | 10 | 1 |
| 9 | Omny Studio | 20,939 | 6,699 | 65 | 58 |
| 10 | islamhouse.com | 19,725 | 0 | 2 | 0 |

**读条款的先后不应该按订阅数，应该按题材候选数**（表 7）。按「新候选且 5 集以上」排：Megaphone 85、Simplecast 76、Omny Studio 58、RedCircle 45、Mave 41（俄语，近 90 天只有 1 个在更新）、ART19 37、FeedBurner 32、stand.fm 26（日语）、Squarespace 22、Internet Archive 21。前六个平台合起来 342 个，占未读一类 841 个的四成；再往后每个平台只有十几二十个。按订阅数排在前面的 Castbox、Hubhopper、剑桥大学、islamhouse、3speak 几乎没有可用的候选，不值得读。未读一类里另有 200 个主机合计 346 个候选，其中 127 个主机各只有 1 个候选，这些按「节目方自己的域名」处理更省事。

## 6. 这一阶段做不到、留给下一阶段的事

1. **第 3 步的后一半（模型读标题和简介）**：这张筛子的查准率只有两到三成，候选要过一遍模型才能当「题材候选」用。8,422 个按一次 20 个是 422 次调用。为了补查全，建议同时把「有餐饮词根、没筛中、分类带 business 或 food」的行也交给模型（分类带 business 一类的 14,344 行，带 food 的 6,510 行，两者都带的 231 行），合起来约三万行、1,500 次调用，在计划 §6 估的钱以内。
2. **第 4 步**：订阅是否还读得到、实际有多少集。候选里上次读取不是 200 的 153 个；没有音频地址的 46 个；没有日期的 452 个（其中集数为 0 的 430 个，多半读不到了）。
3. **第 5 步**：订阅主机、音频主机和每一层统计前缀的 robots、拒绝 AI 的规则、Content-Signal、TDMRep。允许平台和自有域名的候选里，音频要先经过统计前缀的 114 个（media.blubrry.com 69、pdcn.co 27、podtrac 14、op3.dev 7 等，一个节目可以经过几层）。音频主机是否拒绝 AI 训练也在这一步。
4. **Podigee 的动态广告跳转**（111 个候选）、**订阅地址的跳转**。
5. **未读平台的条款**，按表 7 的顺序读；读完一个，把结论补进 `pilib.py` 的 `PLATFORMS` 和账本，重跑 `03_topic.py` 以后的步骤（不用重扫整库的只有改关键词；改平台名单要重扫，约 6 分钟）。
6. **第 6、7 步**：节目方自己的条款、内容尺子。
7. **账本**：这一阶段没有往账本里写任何行。Fireside 是否补一行平台结论、pippa.io 是否并入 Acast，等主会话定。
8. **查全率的独立估计**：等模型判完第 1 项里那三万行，就能数出关键词筛子实际漏了多少，代替现在这个偏乐观的 91%。

## 7. 发现的数据问题

1. **`dead` 一栏整库都是 0**。公开的整库看来已经不含标记为失效的订阅，或者这一栏没有填。「去掉 dead」这一步实际没有去掉任何行。
2. **空壳行很多**：集数为 0 的 230,377 行，没有最新一集日期的 260,140 行，没有简介的 414,115 行，没有标题的 14,697 行。Buzzsprout 的旧主机名 feeds.buzzsprout.com 下有 110,931 行有标题、但集数为 0、没有日期。所以表 1 里允许的平台有 133,248 行「没有日期」，占它的四成；允许平台的题材候选里有 357 个没有日期。这些订阅多半已经读不到，要到第 4 步才知道。
3. **同一个节目两条订阅、编号对不上**：Buzzsprout 的同一个节目编号同时挂在 feeds. 和 rss. 两个主机名下的有 12,575 个，`podcastGuid` 和 `itunesId` 都对不上，去重去不掉。候选表里用「同名同作者」和「Buzzsprout 同编号」另外标了 186 个（`same_title_as` 一列，没有删；其中 1 个同时在账本里）。同一个节目搬过家、在两个平台各留一条订阅的也在这里面（例如 Restaurant Owners Uncorked 在 Podomatic 和 Spreaker 各有一条）。
4. **`host` 一栏不规整**：大小写混用（`FEEDBURNER.COM`），有被截断的（`242.236.40`、`com.br`、`co.uk`）。这里没有用它，主机一律从 `url` 取。
5. **`language` 是订阅自己声明的**，常常不对；还有旧代码（`in` 是印尼语，已经改成 `id`）和三个字母的写法（`eng`、`deu`）。
6. **标题存错**：有的行标题和简介是某一集的（Panadería fácil 存成了「PANES PESADOS - 5 ERRORES FRECUENTES」）。
7. **`generator` 不等于托管平台**：`Castos/SSP`、`Blubrry PowerPress` 是 WordPress 插件，音频可以放在任何地方。
8. **`lastHttpStatus` 有 91,282 行是 667**，不是标准的 HTTP 状态码，含义没有查到。
9. **垃圾订阅**：中文里有成批的刷量广告（「微信公众号点赞在看套餐……全自动下单」一类，多在 Firstory 上），英语里有商家只发一两集的广告（隔油池清理、外烩公司、蛋糕店）。它们会被关键词筛中，要靠集数和模型去掉。
10. **整库不全**：见 4.1，账本里已知的 150 个播客有 9 个在库里找不到。韩语几乎是空白：整库里有餐饮词根的韩语行只有 198 行（韩国的播客多在 Podbbang，库里没有收）；泰语 138 行。
11. **这台机器上的事**：扫整库时别的会话两次把所有 python 进程杀掉。所以第二遍改成按 id 分 12 段并行、每段单独存结果，缺哪一段重跑哪一段（`run_all.sh`）。

## 8. 交回的文件和怎样重跑

| 文件 | 内容 |
|---|---|
| `podcasts-candidates.csv` | 题材筛中的 8,422 行，四种 verdict 都在。前 17 列是要求的列，后 9 列是多给的 |
| `sample-200.csv` | 200 个抽样和逐个的判断 |
| `podcasts-phase1.md` | 这份说明 |
| `scripts/` | `run_all.sh`（整套；旧几轮关键词的查全率要按下面的写法另跑）、`00_positives.py`（对照集）、`01_explore_hosts.py`（数主机，编平台名单时用）、`02_scan.py` 和 `02b_merge.py`（扫整库：平台结论、去重、对账本、留下有词根的行）、`03_topic.py`（题材筛，写候选表）、`04_calibrate.py`（查全率、抽样、查准率）、`05_report_tables.py`（后面的表）、`06_build_md.py`（把正文、表和关键词表拼成这份说明）、`pilib.py`（主机、前缀、平台名单、文字清洗）、`anchor.py`（宽口径词根）、`keywords.py`（强弱信号）、`rounds/`（三轮的关键词表）、`judgements-2026-10-10.tsv`（抽样的判断）、`phase1-prose.md`（这份说明的正文） |
| `work/` | 中间文件：`anchored.jsonl`（有词根的 118,538 行）、`ledger-hits.jsonl`、`scan-stats.json`、`platform-counts.tsv`、`funnel.json`、`calibration-*.json`、`precision.json`、`positives.tsv`、`pass1-cache.pkl` |

重跑：`bash scripts/run_all.sh <podcastindex_feeds.db> 12`。换了整库以后先删 `work/parts/`；第一遍和去重约 10 分钟（有缓存），第二遍 12 段并行约 6 分钟，其余约 4 分钟。候选表变了以后，上次抽的 200 个只要还都在表里就沿用，否则重新抽，要重新判。量旧一轮关键词的数字：`KW_FILE=scripts/rounds/keywords_r1.py python -I -X utf8 scripts/04_calibrate.py work . r1`。

---

# 附录 A：表

这些表由 `scripts/05_report_tables.py` 从 `work/` 里的结果生成。

## 表 1 整库：去重和平台结论（订阅数）

| 步骤 | 订阅数 |
|---|---|
| 整库 | 4,734,025 |
| 去掉 duplicateOf 非空的 | −2,845 |
| 去掉 dead 的 | −0 |
| 同一个 podcastGuid 或 itunesId 只留一个 | −36,546（25,313 组） |
| 留下 | 4,694,634 |

| 平台结论 | 合计 | 近 90 天有更新 | 90 天以前、两年以内 | 两年以前 | 没有日期 |
|---|---|---|---|---|---|
| 允许的平台 | 334,832 | 67,078 | 58,324 | 76,182 | 133,248 |
| 自有域名 | 76,092 | 8,052 | 8,246 | 51,537 | 8,257 |
| 未读的平台和多节目主机 | 791,760 | 83,265 | 99,423 | 553,918 | 55,154 |
| 禁止的平台 | 3,491,950 | 258,390 | 529,185 | 2,647,277 | 57,098 |
| 合计 | 4,694,634 | 416,785 | 695,178 | 3,328,914 | 253,757 |

## 表 2 题材候选：平台结论 × 信号 × 活跃程度

进题材筛的行（标题或简介里有餐饮词根）：118,538；筛中：8,422。

| 平台结论 | 信号 | 合计 | 近 90 天有更新 | 90 天以前、两年以内 | 两年以前 | 没有日期 |
|---|---|---|---|---|---|---|
| 允许的平台 | 强 | 783 | 204 | 173 | 221 | 185 |
| 允许的平台 | 弱 | 593 | 157 | 121 | 143 | 172 |
| 允许的平台 | 小计 | **1,376** | 361 | 294 | 364 | 357 |
| 自有域名 | 强 | 50 | 4 | 6 | 38 | 2 |
| 自有域名 | 弱 | 50 | 10 | 3 | 32 | 5 |
| 自有域名 | 小计 | **100** | 14 | 9 | 70 | 7 |
| 未读的平台和多节目主机 | 强 | 715 | 131 | 167 | 391 | 26 |
| 未读的平台和多节目主机 | 弱 | 628 | 85 | 129 | 404 | 10 |
| 未读的平台和多节目主机 | 小计 | **1,343** | 216 | 296 | 795 | 36 |
| 禁止的平台 | 强 | 3,000 | 441 | 639 | 1,897 | 23 |
| 禁止的平台 | 弱 | 2,603 | 356 | 596 | 1,622 | 29 |
| 禁止的平台 | 小计 | **5,603** | 797 | 1,235 | 3,519 | 52 |
| 合计 | | 8,422 | 1,388 | 1,834 | 4,748 | 452 |

## 表 3 题材候选：扣掉账本里已有的、同名重复的、少于 5 集的

| 平台结论 | 筛中 | 其中账本里已有 | 其中同名重复 | 新候选 | 新候选里 5 集以上 | 其中强信号 | 新候选里少于 5 集 |
|---|---|---|---|---|---|---|---|
| 允许的平台 | 1,376 | 86 | 28 | 1,262 | **770** | 424 | 492 |
| 自有域名 | 100 | 2 | 4 | 94 | **68** | 37 | 26 |
| 未读的平台和多节目主机 | 1,343 | 28 | 57 | 1,258 | **841** | 481 | 417 |
| 禁止的平台 | 5,603 | 123 | 96 | 5,384 | **3,606** | 1,982 | 1,778 |

## 表 4 题材候选：平台结论 × 语言（前 14 种语言）

| 平台结论 | en | es | fr | de | ja | zh | pt | it | ru | nl | id | und | pl | ar | 其他 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 允许的平台 | 1,095 | 11 | 103 | 121 | 2 | 10 | 1 | 3 | 2 | 7 | 0 | 1 | 0 | 8 | 12 |
| 自有域名 | 57 | 7 | 7 | 7 | 11 | 2 | 0 | 1 | 1 | 2 | 0 | 1 | 0 | 0 | 4 |
| 未读的平台和多节目主机 | 899 | 21 | 95 | 64 | 70 | 6 | 13 | 7 | 88 | 17 | 1 | 33 | 1 | 5 | 23 |
| 禁止的平台 | 3,875 | 449 | 138 | 134 | 166 | 215 | 154 | 124 | 38 | 65 | 86 | 6 | 32 | 12 | 109 |
| 合计 | 5,926 | 488 | 343 | 326 | 249 | 233 | 168 | 135 | 129 | 91 | 87 | 41 | 33 | 25 | 148 |

## 表 5 平台名单上的平台：整库订阅数和题材候选数

| 平台 | 结论 | 整库订阅数 | 近 90 天有更新 | 题材候选 | 强信号 | 候选里近 90 天有更新 | 新候选且 5 集以上 | 依据（账本行） |
|---|---|---|---|---|---|---|---|---|
| Buzzsprout | 允许 | 254,936 | 46,176 | 937 | 515 | 234 | 464 | L8676、L8608、L8637 |
| Captivate | 允许 | 31,467 | 8,236 | 165 | 94 | 47 | 116 | L8709、L8644、L8624 |
| Podigee | 允许 | 18,482 | 7,219 | 111 | 79 | 51 | 84 | L8817（开了动态广告、音频跳到 adswizz.podigee-cdn.net 的除外） |
| Ausha | 允许 | 16,767 | 3,464 | 105 | 62 | 17 | 65 | L8675、L8707、L8598 |
| Blubrry | 允许 | 13,180 | 1,983 | 58 | 33 | 12 | 41 | L8710、L8645 |
| Spotify/Anchor | 禁止 | 1,918,501 | 99,582 | 2,941 | 1,549 | 326 | 1,890 | L8596、L8597、L8639 |
| Spreaker | 禁止 | 569,975 | 39,694 | 519 | 272 | 59 | 303 | L8601 |
| SoundCloud | 禁止 | 193,700 | 8,251 | 274 | 165 | 10 | 141 | L8629、L8630 |
| iVoox | 禁止 | 185,098 | 4,752 | 126 | 59 | 4 | 92 | L8788 |
| RSS.com | 禁止 | 179,423 | 16,908 | 398 | 219 | 48 | 163 | L8815、L8783 |
| Podbean | 禁止 | 107,195 | 23,087 | 275 | 164 | 57 | 207 | L8813、L8745 |
| Libsyn | 禁止 | 74,360 | 16,163 | 321 | 168 | 80 | 268 | L8699–L8701、L8704、L8705 |
| Podomatic | 禁止 | 62,300 | 1,160 | 59 | 32 | 3 | 35 | L8812、L8744 |
| Acast | 禁止 | 58,856 | 11,360 | 201 | 113 | 38 | 147 | L8814、L8782 |
| Transistor | 禁止 | 31,367 | 9,796 | 115 | 69 | 54 | 82 | L8628、L8636 |
| 喜马拉雅 | 禁止 | 19,998 | 1,640 | 40 | 20 | 7 | 29 | L8578、L8384 |
| 小宇宙 | 禁止 | 9,052 | 2,619 | 34 | 13 | 12 | 29 | L8136、L8280、L8385 |
| Firstory | 禁止 | 19,952 | 3,044 | 62 | 30 | 14 | 47 | L8627 |
| Substack | 禁止 | 19,684 | 5,188 | 45 | 21 | 11 | 36 | L8332、L8376 |
| SoundOn | 禁止 | 15,777 | 2,918 | 51 | 23 | 16 | 39 | L8602 |
| Castos | 禁止 | 8,129 | 1,833 | 31 | 23 | 5 | 21 | L8606 |
| Riverside | 禁止 | 16,066 | 9,739 | 85 | 42 | 46 | 58 | L8603、L8615 |
| Wix | 禁止 | 33 | 3 | 0 | 0 | 0 | 0 | L8713 |
| Medium | 禁止 | 5 | 0 | 0 | 0 | 0 | 0 | L8338、L8345 |
| YouTube | 禁止 | 574 | 95 | 0 | 0 | 0 | 0 | L8576 |
| podengine.io | 禁止 | 195 | 65 | 22 | 15 | 6 | 15 | L8702、L8703 |
| Fireside | 禁止 | 1,710 | 493 | 4 | 3 | 1 | 4 | L8575（账本里多出来的一条，任务名单没有列） |
| 痞客邦 | 禁止 | 0 | 0 | 0 | 0 | 0 | 0 | L8339（博客平台，账本里多出来的） |
| 方格子 | 禁止 | 0 | 0 | 0 | 0 | 0 | 0 | L8340（博客平台，账本里多出来的） |
| Brunch | 禁止 | 0 | 0 | 0 | 0 | 0 | 0 | L8787（博客平台，账本里多出来的） |
| Megaphone | 未读 | 27,202 | 8,932 | 106 | 60 | 36 | 85 | L8816 待定：条款没有读完，音频主机拒绝 AI 训练类爬虫 |
| ART19 | 未读 | 4,582 | 1,480 | 40 | 24 | 9 | 37 | L8697、L8750：使用政策写「订阅的使用以内容所有者的条款为准」，没有平台级结论 |
| LetsCast | 未读 | 3,582 | 1,145 | 16 | 10 | 6 | 16 | L8792 待定：法律声明里「只许私人、非商业使用」一句管不管用户节目没有判 |
| Kajabi | 未读 | 4,822 | 904 | 15 | 8 | 3 | 12 | L8643：禁止机器人的一句写的是开户客户的义务，没有平台级结论 |
| 声湃 | 未读 | 191 | 81 | 2 | 0 | 1 | 1 | L8579 待定：声明允许转写和摘要，条件是标明来源、可识别的 UA 和联系方式 |
| Zencast.fm | 未读 | 531 | 133 | 1 | 1 | 1 | 0 | L8281：音频主机 robots 两次读不到（规则 5），只有一次记录 |
| beehiiv | 未读 | 424 | 263 | 2 | 0 | 2 | 1 | 账本没有这一家；计划 §3.3 把它列为按条款不投入的电子报平台（依据是存档和报道，没有读原文） |

## 表 6 未读的平台和多节目主机：按整库订阅数排前 60

| 序号 | 平台或主机 | 整库订阅数 | 近 90 天有更新 | 题材候选 | 强信号 | 新候选且 5 集以上 |
|---|---|---|---|---|---|---|
| 1 | Castbox | 50,534 | 314 | 53 | 24 | 16 |
| 2 | FeedBurner | 44,657 | 1,984 | 35 | 16 | 32 |
| 3 | Internet Archive | 32,174 | 245 | 26 | 22 | 21 |
| 4 | Hubhopper | 31,653 | 218 | 101 | 36 | 12 |
| 5 | RedCircle | 29,587 | 3,653 | 70 | 34 | 45 |
| 6 | Megaphone | 27,202 | 8,932 | 106 | 60 | 85 |
| 7 | Simplecast | 21,260 | 6,221 | 93 | 51 | 76 |
| 8 | cam.ac.uk | 21,025 | 0 | 10 | 1 | 1 |
| 9 | Omny Studio | 20,939 | 6,699 | 65 | 42 | 58 |
| 10 | islamhouse.com | 19,725 | 0 | 2 | 0 | 0 |
| 11 | education.fr | 14,960 | 23 | 2 | 2 | 0 |
| 12 | afr.net | 14,601 | 28 | 19 | 5 | 0 |
| 13 | Squarespace | 12,986 | 1,890 | 33 | 13 | 22 |
| 14 | Mave | 12,904 | 1,793 | 54 | 40 | 41 |
| 15 | 3speak.tv | 12,691 | 0 | 0 | 0 | 0 |
| 16 | podcastmachine.com | 8,404 | 22 | 22 | 7 | 0 |
| 17 | wavlake.com | 7,375 | 360 | 1 | 0 | 1 |
| 18 | WordPress.com | 7,267 | 300 | 3 | 0 | 1 |
| 19 | poderato.com | 7,128 | 0 | 4 | 1 | 1 |
| 20 | radiofrance-podcast.net | 7,052 | 824 | 32 | 23 | 12 |
| 21 | podserve.fm | 6,814 | 409 | 30 | 15 | 2 |
| 22 | Subsplash | 6,561 | 2,288 | 2 | 0 | 1 |
| 23 | Pinecast | 6,464 | 619 | 19 | 11 | 10 |
| 24 | talkshoe.com | 6,291 | 55 | 4 | 2 | 4 |
| 25 | Audiomeans | 6,280 | 2,542 | 15 | 12 | 15 |
| 26 | peertube.stream | 6,252 | 12 | 3 | 2 | 1 |
| 27 | Audioboom | 6,024 | 1,132 | 11 | 8 | 10 |
| 28 | podcaster.de | 6,011 | 1,489 | 15 | 12 | 15 |
| 29 | Kajabi | 4,822 | 904 | 15 | 8 | 12 |
| 30 | hearthis.at | 4,721 | 542 | 3 | 2 | 3 |
| 31 | ART19 | 4,582 | 1,480 | 40 | 24 | 37 |
| 32 | podster.fm | 4,475 | 258 | 15 | 11 | 4 |
| 33 | sounder.fm | 4,473 | 0 | 5 | 3 | 3 |
| 34 | podfm.ru | 3,964 | 0 | 5 | 2 | 3 |
| 35 | lizhi.fm | 3,715 | 143 | 0 | 0 | 0 |
| 36 | LetsCast | 3,582 | 1,145 | 16 | 10 | 16 |
| 37 | jellypod.ai | 3,531 | 2 | 5 | 5 | 0 |
| 38 | podcastle.ai | 3,521 | 105 | 14 | 8 | 8 |
| 39 | blogtalkradio.com | 3,181 | 0 | 1 | 0 | 1 |
| 40 | pod.co | 2,971 | 360 | 21 | 14 | 16 |
| 41 | radiotalk.jp | 2,869 | 122 | 8 | 2 | 8 |
| 42 | promodj.com | 2,808 | 403 | 2 | 1 | 2 |
| 43 | pocketnet.app | 2,634 | 0 | 0 | 0 | 0 |
| 44 | stand.fm | 2,581 | 1,151 | 28 | 15 | 26 |
| 45 | seesaa.net | 2,545 | 124 | 6 | 2 | 6 |
| 46 | Apple Podcasts | 2,426 | 6 | 2 | 1 | 0 |
| 47 | lepodcast.fr | 2,405 | 288 | 3 | 2 | 1 |
| 48 | Podcastics | 2,384 | 430 | 7 | 4 | 5 |
| 49 | peertube.su | 2,335 | 0 | 3 | 2 | 0 |
| 50 | jellycast.com | 2,325 | 0 | 1 | 0 | 1 |
| 51 | Zencastr | 2,134 | 544 | 8 | 3 | 6 |
| 52 | Springcast | 2,067 | 367 | 9 | 6 | 7 |
| 53 | pod.space | 1,977 | 413 | 4 | 4 | 3 |
| 54 | iono.fm | 1,964 | 380 | 6 | 2 | 6 |
| 55 | peervideo.club | 1,961 | 0 | 1 | 0 | 0 |
| 56 | connectpal.com | 1,831 | 0 | 6 | 1 | 0 |
| 57 | arteradio.com | 1,797 | 60 | 0 | 0 | 0 |
| 58 | podpoint.com | 1,752 | 178 | 1 | 0 | 1 |
| 59 | amperwave.net | 1,722 | 810 | 6 | 4 | 3 |
| 60 | vodio.fr | 1,710 | 106 | 2 | 0 | 0 |

## 表 7 未读的平台和多节目主机：按题材候选数排前 30（读条款的先后按这张表）

| 序号 | 平台或主机 | 题材候选 | 强信号 | 近 90 天有更新 | 新候选且 5 集以上 | 整库订阅数 |
|---|---|---|---|---|---|---|
| 1 | Megaphone | 106 | 60 | 36 | 85 | 27,202 |
| 2 | Hubhopper | 101 | 36 | 0 | 12 | 31,653 |
| 3 | Simplecast | 93 | 51 | 19 | 76 | 21,260 |
| 4 | RedCircle | 70 | 34 | 12 | 45 | 29,587 |
| 5 | Omny Studio | 65 | 42 | 23 | 58 | 20,939 |
| 6 | Mave | 54 | 40 | 1 | 41 | 12,904 |
| 7 | Castbox | 53 | 24 | 1 | 16 | 50,534 |
| 8 | ART19 | 40 | 24 | 9 | 37 | 4,582 |
| 9 | FeedBurner | 35 | 16 | 0 | 32 | 44,657 |
| 10 | Squarespace | 33 | 13 | 3 | 22 | 12,986 |
| 11 | radiofrance-podcast.net | 32 | 23 | 2 | 12 | 7,052 |
| 12 | podserve.fm | 30 | 15 | 1 | 2 | 6,814 |
| 13 | stand.fm | 28 | 15 | 12 | 26 | 2,581 |
| 14 | Internet Archive | 26 | 22 | 0 | 21 | 32,174 |
| 15 | podcastmachine.com | 22 | 7 | 0 | 0 | 8,404 |
| 16 | pod.co | 21 | 14 | 2 | 16 | 2,971 |
| 17 | Pinecast | 19 | 11 | 1 | 10 | 6,464 |
| 18 | afr.net | 19 | 5 | 0 | 0 | 14,601 |
| 19 | LetsCast | 16 | 10 | 6 | 16 | 3,582 |
| 20 | Audiomeans | 15 | 12 | 6 | 15 | 6,280 |
| 21 | Kajabi | 15 | 8 | 3 | 12 | 4,822 |
| 22 | podcaster.de | 15 | 12 | 2 | 15 | 6,011 |
| 23 | podster.fm | 15 | 11 | 1 | 4 | 4,475 |
| 24 | podcastle.ai | 14 | 8 | 2 | 8 | 3,521 |
| 25 | wistia.com | 14 | 9 | 2 | 10 | 1,007 |
| 26 | Audioboom | 11 | 8 | 2 | 10 | 6,024 |
| 27 | cam.ac.uk | 10 | 1 | 0 | 1 | 21,025 |
| 28 | Springcast | 9 | 6 | 1 | 7 | 2,067 |
| 29 | Zencastr | 8 | 3 | 2 | 6 | 2,134 |
| 30 | radiotalk.jp | 8 | 2 | 0 | 8 | 2,869 |

其余 200 个未读平台或主机上共有题材候选 346 个（其中只有 1 个候选的主机 127 个）。

## 表 8 校准

- 第 1 轮：正例 151 个，整库里找到 139 个，筛中 118 个（强信号 111 个），查全率 84.9%；难的反例找到 17 个，筛中 8 个。各语言：en 74/83、de 16/18、fr 9/12、es 6/9、zh 2/4、it 4/4、ja 1/3、nl 2/2、th 1/1、pt 1/1、da 1/1、ru 1/1
- 第 2 轮：正例 151 个，整库里找到 139 个，筛中 127 个（强信号 114 个），查全率 91.4%；难的反例找到 17 个，筛中 8 个。各语言：en 79/83、de 17/18、fr 10/12、es 6/9、zh 3/4、it 4/4、ja 2/3、nl 2/2、ru 1/1、da 1/1、pt 1/1、th 1/1
- 第 3 轮：正例 151 个，整库里找到 139 个，筛中 127 个（强信号 114 个），查全率 91.4%；难的反例找到 17 个，筛中 8 个。各语言：en 79/83、de 17/18、fr 10/12、es 6/9、it 4/4、zh 3/4、ja 2/3、nl 2/2、da 1/1、th 1/1、ru 1/1、pt 1/1

| 分组 | 抽到 | 是 | 分不出 | 不是 | 查准率下限 | 上限 |
|---|---|---|---|---|---|---|
| 全部 | 200 | 44 | 23 | 133 | 22.0% | 33.5% |
| 信号：strong | 106 | 32 | 18 | 56 | 30.2% | 47.2% |
| 信号：weak | 94 | 12 | 5 | 77 | 12.8% | 18.1% |
| 信号/位置：strong/head | 77 | 23 | 15 | 39 | 29.9% | 49.4% |
| 信号/位置：weak/head | 54 | 9 | 4 | 41 | 16.7% | 24.1% |
| 信号/位置：weak/title | 21 | 2 | 1 | 18 | 9.5% | 14.3% |
| 信号/位置：strong/tail | 20 | 3 | 2 | 15 | 15.0% | 25.0% |
| 信号/位置：weak/tail | 19 | 1 | 0 | 18 | 5.3% | 5.3% |
| 信号/位置：strong/title | 9 | 6 | 1 | 2 | 66.7% | 77.8% |
| 平台结论：banned | 128 | 27 | 15 | 86 | 21.1% | 32.8% |
| 平台结论：allowed | 35 | 11 | 3 | 21 | 31.4% | 40.0% |
| 平台结论：unread | 34 | 5 | 4 | 25 | 14.7% | 26.5% |
| 平台结论：own | 3 | 1 | 1 | 1 | 33.3% | 66.7% |
| 语言：en | 145 | 28 | 18 | 99 | 19.3% | 31.7% |
| 语言：es | 15 | 4 | 0 | 11 | 26.7% | 26.7% |
| 语言：fr | 9 | 3 | 0 | 6 | 33.3% | 33.3% |
| 语言：de | 7 | 2 | 2 | 3 | 28.6% | 57.1% |
| 语言：ja | 4 | 1 | 0 | 3 | 25.0% | 25.0% |
| 语言：ru | 4 | 2 | 0 | 2 | 50.0% | 50.0% |
| 语言：zh | 4 | 1 | 0 | 3 | 25.0% | 25.0% |
| 语言：pt | 3 | 1 | 0 | 2 | 33.3% | 33.3% |
| 语言：nl | 2 | 0 | 0 | 2 | 0.0% | 0.0% |
| 语言：id | 2 | 1 | 1 | 0 | 50.0% | 100.0% |
| 语言：it | 2 | 0 | 0 | 2 | 0.0% | 0.0% |
| 语言：sv | 2 | 0 | 2 | 0 | 0.0% | 100.0% |
| 语言：bg | 1 | 1 | 0 | 0 | 100.0% | 100.0% |
| 规则族：strong:en | 69 | 20 | 13 | 36 | 29.0% | 47.8% |
| 规则族：weak:latin | 49 | 7 | 3 | 39 | 14.3% | 20.4% |
| 规则族：weak:tw | 21 | 2 | 1 | 18 | 9.5% | 14.3% |
| 规则族：weak:chef | 17 | 1 | 1 | 15 | 5.9% | 11.8% |
| 规则族：strong:fr | 12 | 3 | 1 | 8 | 25.0% | 33.3% |
| 规则族：strong:es | 6 | 3 | 0 | 3 | 50.0% | 50.0% |
| 规则族：strong:de | 5 | 2 | 1 | 2 | 40.0% | 60.0% |
| 规则族：strong:ja | 4 | 1 | 0 | 3 | 25.0% | 25.0% |
| 规则族：weak:own | 3 | 0 | 0 | 3 | 0.0% | 0.0% |
| 规则族：strong:id | 3 | 2 | 1 | 0 | 66.7% | 100.0% |
| 规则族：strong:ru | 2 | 1 | 0 | 1 | 50.0% | 50.0% |
| 规则族：weak:ru | 2 | 1 | 0 | 1 | 50.0% | 50.0% |
| 规则族：weak:zh | 2 | 1 | 0 | 1 | 50.0% | 50.0% |
| 规则族：strong:sv | 2 | 0 | 2 | 0 | 0.0% | 100.0% |
| 规则族：strong:it | 1 | 0 | 0 | 1 | 0.0% | 0.0% |
| 规则族：strong:xx | 1 | 0 | 0 | 1 | 0.0% | 0.0% |
| 规则族：strong:zh | 1 | 0 | 0 | 1 | 0.0% | 0.0% |
| 集数：5 集以上 | 137 | 28 | 15 | 94 | 20.4% | 31.4% |
| 集数：少于 5 集 | 63 | 16 | 8 | 39 | 25.4% | 38.1% |

正例（整库里找到的 139 个）落在哪一档：strong/title 59、strong/head 51、weak/head 8、有词根但没筛中 7、weak/title 5、没有餐饮词根 5、strong/tail 4

候选在各档的个数：strong/head 3,268、weak/head 2,144、weak/title 963、weak/tail 767、strong/tail 756、strong/title 524

## 表 9 其他数字

- 没有音频地址的订阅（整库，去重后）：34,527；音频地址带统计前缀的：215,329。
- 题材候选里音频地址带统计前缀的：490；没有音频地址的：46；上次读取不是 200 的：153。
- 允许平台和自有域名的候选里，音频要先经过的统计前缀主机：media.blubrry.com 69、pdcn.co 27、dts.podtrac.com 13、op3.dev 7、chtbl.com 3、pdst.fm 2、chrt.fm 2、pscrb.fm 1、www.podtrac.com 1。
- 账本对上的候选：239（按订阅地址 201，按域名 2，按节目网站域名 36）。
- 未读一类共 9,934 个平台或主机：订阅数 200 以上的 279 个（共 663,464 个订阅），20–199 的共 76,410 个订阅，不到 20 的共 51,886 个订阅。

---

# 附录 B：关键词表全文（第 3 轮，定稿）

正则写在清洗以后的文字上（小写、去重音）。`VENUE_EN` 是英语里店的种类；`STRONG` 每行是（语言标记，正则，需要的上下文）；`WEAK` 每行是（标记，窗口，店或行业的词，经营的词，限定的语言）；`WEAK_SINGLE` 是单独成立的弱信号。第 1、2 轮的版本在 `scripts/rounds/`。

## B.1 强信号和弱信号（`scripts/keywords.py`）

```python
VENUE_EN = (r'restaurants?|cafes?|coffee ?shops?|coffee ?houses?|coffee bars?|bakery|bakeries|bars?|pubs?|taverns?|pizzerias?|'
            r'pizza shops?|food ?trucks?|food carts?|food stalls?|diners?|eatery|eateries|delis?|bistros?|taprooms?|brewpubs?|'
            r'nightclubs?|ice cream shops?|tea shops?|bubble tea shops?|boba shops?|juice bars?|donut shops?|bagel shops?|'
            r'sandwich shops?|burger joints?|catering (?:business|company)|food business(?:es)?|hospitality business(?:es)?|'
            r'hospitality venues?|cocktail bars?|wine bars?|steakhouses?|bbq joints?|sushi bars?|ramen shops?|dessert shops?')

GERMAN = re.compile(r'\b(?:und|der|die|das|fur|mit|uber|nicht|wir|ist|von|den|dem|ein|eine)\b')
FRENCH = re.compile(r'\b(?:le|les|des|et|une|pour|dans|avec|sur|nous|vous|est|qui)\b')

# （语言标记，正则，需要的上下文或 None）
STRONG = [
    # ---- 英语 ----
    ('en', r'\brestaurant (?:owners?|operators?|entrepreneurs?|business(?:es)?|industry|management|managers?|marketing|leaders?|'
           r'leadership|profits?|profitab\w+|consult\w+|coach\w*|success|startups?|founders?|franchis\w+|operations|tech\w*|'
           r'finance|accounting|growth|sales|professionals?|executives?|groups?|brands?|chains?|concepts?|world|space|people|life|'
           r'trends|news|ownership|investors?|unstoppable|strateg\w+|systems|staff\w*|teams?|workers?|pros)\b', None),
    ('en', r'\brestaurante?urs?\b|\brestauranteurs?\b', None),
    ('en', r'\b(?:own|owns|owning|owned|run|runs|running|open|opens|opening|opened|start|starting|started|operate|operating|'
           r'grow|growing|scale|scaling|manage|managing|launch|launching|launched|build|building|buy|buying|sell|selling) '
           r'(?:(?:a|an|your|their|his|her|my|our|the|own|new|first|second|successful|profitable|independent|small|local|'
           r'multiple|several|two|three|better|great|thriving|dream|next|more) )*(?:%s)\b' % VENUE_EN, None),
    ('en', r'\b(?:%s)[ -](?:owners?|operators?|entrepreneurs?|business(?:es)?|industry|management|managers?|marketing|profits?|'
           r'profitab\w+|startups?|founders?|ownership|consult\w+|coach\w*|franchis\w+|proprietors?|professionals?)\b' % VENUE_EN, None),
    ('en', r'\b(?:hospitality|foodservice|food service|food ?& ?beverage|food and beverage|food and drink|f ?& ?b|quick[- ]service|'
           r'fast[- ]casual|fast[- ]food|full[- ]service|catering|coffee|cafe|bar|pub|nightlife|bakery|baking|cake|cookie|'
           r'pizza|pizzeria|food ?truck|street food|mobile food|drinks|on[- ]trade|licensed trade)[ -]?(?:industry|business(?:es)?|operators?|'
           r'owners?|entrepreneurs?|professionals?|leaders|sector|trade|management|executives?)\b', None),
    ('en', r'\b(?:ghost|cloud|dark|virtual|commissary|commercial) kitchens?\b|\bvirtual (?:restaurants?|brands?)\b|\bqsr\b|'
           r'\bquick[- ]service restaurants?\b|\bfast[- ]casual\b|\bmulti[- ]unit (?:operators?|restaurants?|franchis\w+|brands?)\b|'
           r'\b(?:restaurant|food|qsr|pizza|coffee|burger|fast[- ]food|f&b) franchis\w+|\bfranchis\w+ restaurants?\b|'
           r'\bfoodservice\b|\bfood service\b|\bf ?& ?b\b|\bmicro ?baker(?:y|ies)\b|\bcottage (?:bakery|baker|food)\w*\b|'
           r'\bhome bakery\b|\bpublicans\b|\bchef[- /]+(?:and |& )?(?:owners?|proprietors?|restaurateurs?|partners?|founders?)\b|'
           r'\bowner[- /]+(?:and |& )?(?:chefs?|operators?)\b|\bhospo\b|\bindependent (?:restaurants?|cafes?|coffee shops?|pubs?|bars?)\b|'
           r'\bcoffee (?:pros|retail(?:ers?)?)\b|\b(?:life|work|working|career|careers|jobs?|people) in (?:the )?(?:hospitality|restaurants?|the restaurant)\b|\bhospitality (?:world|space|scene|workers?|people|pros|folks|careers?|operations)\b|\bfood cost\w*\b|\bfront of house\b|\bback of house\b|'
           r'\b(?:for|helps?|helping) (?:independent |local |small |busy |fellow )?(?:restaurants|restaurateurs|'
           r'bars|pubs|cafes|coffee shops|bakeries|food trucks|caterers)\b', None),
    # ---- 多国通用的行业词 ----
    ('xx', r'\bhoreca\b|\bho\.re\.ca\b|\bgastro[- ]?(?:business|podcast|branche|unternehm\w+|talk|marketing|bar)\b', None),
    # ---- 德语 ----
    ('de', r'\bgastronom(?:en|in|innen)?\b|\bgastgewerbe\w*|\bsystemgastronom\w*|\bgastronomiebetrieb\w*|\bgastrobetrieb\w*|'
           r'\bgastronomie(?:unternehm|branche|konzept|marketing|berat|grund)\w*|\bgastwirt\w*|\bwirtshaus\w*|'
           r'\b(?:restaurant|cafe|bar|kneipen|lokal|imbiss|backerei|konditorei|eisdielen|foodtruck)-?(?:betreiber|besitzer|inhaber|'
           r'grunder|leiter|manager)(?:in|innen|n)?\b|\b(?:restaurant|cafe|bar|kneipe|backerei|konditorei|imbiss|foodtruck|'
           r'eisdiele|gastronomie|gastro)\w* (?:eroffn|grund|fuhr|betreib|ubernehm|ubernomm)\w+|\beigene[sn]? (?:restaurant|cafe|lokal|bar|'
           r'backerei|kneipe|gastronomie)\b|\bhotellerie und gastronomie\b|\bgastronomie und hotellerie\b|\bbackerhandwerk\w*|'
           r'\bbacker(?:ei|eien)?[- ]?(?:unternehm|inhaber|branche|betrieb)\w*', None),
    ('de', r'\bgastro\b|\bwirt(?:e|en|in|innen)\b', GERMAN),
    # ---- 法语 ----
    ('fr', r'\brestaurat(?:eur|eurs|rice|rices)\b|\b(?:ouvrir|ouverture d\'|creer|gerer|tenir|lancer|monter|reprendre|ouvert|cree) '
           r'(?:un |une |son |sa |ton |ta |votre |leur |mon |ma |le |la |des |leurs |ses )?(?:propre |premier |premiere )?(?:restaurant|cafe|bar|'
           r'boulangerie|food ?truck|coffee ?shop|salon de the|bistrot|brasserie|patisserie|pizzeria|creperie)s?\b|'
           r'\b(?:professionnels?|metiers?|entrepreneurs?|acteurs?|secteur|monde|univers|patrons?|independants?|business|industrie|filiere|marche) '
           r'(?:de|dans|en) (?:la |l\')?(?:restauration|hotellerie[- ]restauration|boulangerie|bouche|food)\b|'
           r'\bentreprendre (?:en|dans la) restauration\b|\brestauration (?:rapide|commerciale|independante|collective|traditionnelle|hors domicile)\b|'
           r'\bhotellerie[- ](?:et |& )?restauration\b|\bcafes?,? hotels?,? restaurants?\b|\b(?:patron|patronne|gerant|gerante|'
           r'proprietaire|fondateur|fondatrice|dirigeant)s? (?:de|d\'un|d\'une|du) (?:restaurant|bar|cafe|bistrot|boulangerie|brasserie|'
           r'coffee ?shop|food ?truck|patisserie)s?\b|\bartisans? boulangers?\b|\bboulang(?:er|ers|ere)s?[- ](?:patissiers?|entrepreneurs?)\b|'
           r'\bmetiers de bouche\b|\bfranchise (?:de )?restauration\b|\bbistrotiers?\b|\bcafetiers?\b', None),
    ('fr', r'\bchr\b', FRENCH),
    # ---- 西班牙语 ----
    ('es', r'\bhosteler[oa]s?\b|\brestauranter[oa]s?\b|\bduen[oa]s? de (?:un |una |su |el |la )?(?:restaurante|bar|cafeteria|cafe|panaderia|'
           r'pasteleria|negocio gastronomico|negocio de comida|local|taqueria|food ?truck)s?\b|\bnegocios? (?:gastronomic\w+|de restauracion|'
           r'de hosteleria|de comida|de alimentos y bebidas|de restaurantes?|de cafeteria|hosteler\w+|de alimentos)\b|'
           r'\b(?:abrir|montar|emprender|administrar|gestionar|gestion de|rentabilizar|operar|dirigir|llevar|tener) (?:un |una |tu |su |mi |el |la )?'
           r'(?:propio |propia )?(?:restaurante|bar|cafeteria|panaderia|pasteleria|food ?truck|negocio gastronomico|negocio de comida|'
           r'negocio de hosteleria|local de hosteleria)s?\b|\b(?:sector|industria|gremio|empresarios?|emprendedor\w*|profesionales|'
           r'marketing|gestion|consultor\w*|negocio|direccion) (?:de |del |de la |en |en la |para )?(?:la )?(?:hosteler\w+|restauracion|restaurantes?|'
           r'gastronomic\w+|restauranter\w+|hospitalidad|alimentos y bebidas|horeca)\b|\bemprend\w+ gastronomic\w+\b|'
           r'\bgastronomic\w+ (?:emprend\w+|rentab\w+|exitos\w+)\b|\bpara (?:restaurantes|hosteleros|restauranteros|bares y restaurantes)\b|'
           r'\bbares y restaurantes\b|\brestaurantes y bares\b|\bhosteleria\b', None),
    # ---- 葡萄牙语 ----
    ('pt', r'\bdon[oa]s? de (?:um |uma |seu |sua )?(?:restaurante|bar|lanchonete|padaria|cafeteria|pizzaria|hamburgueria|food ?truck|'
           r'confeitaria|negocio de alimentacao|delivery|bares)s?\b|\bgest(?:ao|or|ores) de (?:restaurantes?|bares|food service|'
           r'negocios de alimentacao|alimentos e bebidas|a&b|padarias?|cafeterias?)\b|\bbares e restaurantes\b|\brestaurantes e bares\b|'
           r'\balimentacao fora do lar\b|\bempreend\w+ (?:gastronomic\w+|na gastronomia|no food service|em alimentacao)\b|'
           r'\b(?:negocios?|mercado|setor|segmento|ramo) (?:gastronomic\w+|de alimentacao|de comida|de gastronomia|de food ?service|'
           r'de restaurantes?|de bares|de alimentos e bebidas)\b|\b(?:abrir|montar|gerir|administrar|ter) (?:um |uma |seu |sua |o seu |a sua )?'
           r'(?:proprio |propria )?(?:restaurante|bar|lanchonete|padaria|cafeteria|pizzaria|hamburgueria|confeitaria|food ?truck)\b|'
           r'\bpara (?:restaurantes|donos de restaurantes?|bares e restaurantes)\b|\bempresarios? (?:do setor de alimentacao|gastronomic\w+)\b|'
           r'\bconfeitar\w+ (?:empreend\w+|lucrativ\w+|de sucesso)\b', None),
    # ---- 意大利语 ----
    ('it', r'\bristorat(?:ore|ori|rice|rici)\b|\bristorazione\b|\b(?:aprire|gestire|gestione di|avviare|gestisce|aperto) (?:un |una |il tuo |'
           r'la tua |il proprio |la propria |il suo |la sua )?(?:ristorante|bar|locale|pizzeria|caffetteria|pasticceria|gelateria|panificio|'
           r'attivita di ristorazione|food ?truck)\b|\bimprenditor\w+ (?:della ristorazione|del food|nel food|del settore food)\b|'
           r'\b(?:titolar[ei]|gestor[ei]|proprietar\w+) di (?:un |una )?(?:ristorant[ei]|bar|local[ei]|pizzeri[ae]|pasticceri[ae])\b|'
           r'\bpubblici esercizi\b|\bgestione (?:del |di un |dei )?(?:ristorant[ei]|local[ei]|bar)\b', None),
    # ---- 荷兰语、北欧、波兰语 ----
    ('nl', r'\bhoreca\w*|\b(?:restaurant|cafe|kroeg|koffiebar|bakkerij|lunchroom|snackbar)-?(?:eigenaar|eigenaren|houder|houders|baas|ondernemer|ondernemers)\b|'
           r'\beigen (?:restaurant|cafe|koffiebar|bakkerij|lunchroom|zaak in de horeca|horecazaak)\b|\bbakkers?ondernemers?\b|\bkroegbaas\b', None),
    ('sv', r'\brestaurangbransch\w*|\bkrogare\b|\bkrogbransch\w*|\brestaurat[oø]r(?:er|en)?\b|\brestaurationsbranchen\b|'
           r'\brestaurantbranchen\b|\brestaurangagare\b|\butelivsbransjen\b|\bserveringsbransjen\b|\bbesoksnaring\w*', None),
    ('pl', r'\bbranz[ay] gastronomiczn\w+|\bbiznes\w* gastronomiczn\w+|\bgastronomi\w+ biznes\w*|\brestaurator(?:ow|zy|em)\b|'
           r'\bwlasciciel\w* (?:restauracji|kawiarni|baru|lokalu|piekarni|cukierni)\b|\bprowadz\w+ (?:restauracj\w+|kawiarni\w+|lokal\w* gastronomiczn\w+)', None),
    # ---- 土耳其语 ----
    ('tr', r'\b(?:restoran|restorant|kafe|cafe|lokanta|pastane|mekan|kahve dukkani|kahveci)\w* (?:isletme\w*|sahib\w*|sahipleri|yonetim\w*|'
           r'sektor\w*|girisim\w*|pazarlama\w*|acmak|isletmeci\w*)|\byeme[- ]icme (?:sektor\w*|isletme\w*|dunya\w*|girisim\w*)|'
           r'\byiyecek[- ](?:ve )?icecek (?:sektor\w*|isletme\w*)|\bgastronomi (?:sektor\w*|girisim\w*|isletme\w*)|\brestoran isletmeciligi\b|'
           r'\bisletmeci\w* (?:restoran|kafe|cafe)\w*', None),
    # ---- 印尼语、马来语 ----
    ('id', r'\b(?:bisnis|usaha|pengusaha|pebisnis|industri|wirausaha|bisnes|perniagaan|usahawan|peniaga|niaga) '
           r'(?:kuliner|makanan|f ?& ?b|fnb|restoran|kafe|cafe|kopi|kedai kopi|coffee ?shop|warung|minuman|katering|roti|bakery|'
           r'kedai makan|makanan dan minuman|resto|warkop)\b|\b(?:pemilik|owner|buka|membuka|punya|mengelola|kelola) '
           r'(?:restoran|kafe|cafe|warung|kedai kopi|coffee ?shop|usaha kuliner|resto|kedai makan|rumah makan|warkop)\b|'
           r'\b(?:franchise|waralaba) (?:makanan|kuliner|minuman|f&b)\b|\bkulinerpreneur\b|\bfoodpreneur\w*', None),
    # ---- 越南语（去声调以后）----
    ('vi', r'\b(?:kinh doanh|khoi nghiep|van hanh|quan ly|quan tri|nganh|chuoi|nhuong quyen|mo hinh) '
           r'(?:nha hang|quan an|an uong|quan ca phe|ca phe|cafe|f ?& ?b|am thuc|tra sua|do an|quan nhau|tiem banh|dich vu an uong)\b|'
           r'\bmo (?:quan (?:an|ca phe|cafe|nhau|tra sua|com|pho|bun|oc|lau)|nha hang|tiem banh|tiem ca phe)\b|'
           r'\bchu (?:nha hang|tiem banh|quan (?:an|ca phe|cafe|nhau|tra sua|com|pho))\b', None),
    # ---- 俄语、乌克兰语 ----
    ('ru', r'ресторатор|ресторанн\w+ (?:бизнес|индустри|рын|дел)|ресторанний бізнес|общепит|бизнес\w* в (?:общепите|ресторан)|'
           r'владел\w+ (?:ресторан|кафе|бар(?:а|ов|ами)?\b|кофейн|пекарн|кондитерск)|власник\w* (?:ресторан|кафе|кав\'ярн|закладу)|'
           r'откры\w+ (?:свой |свою |своё |свое )?(?:ресторан|кафе|бар\b|кофейн|пекарн|кондитерск|пиццери)|'
           r'відкри\w+ (?:свій |свою |власн\w+ )?(?:ресторан|кафе|кав\'ярн|пекарн)|хорека|'
           r'управлени\w+ ресторан|кофейн\w+ бизнес|бизнес\w* кофейн|индустри\w+ гостеприимства|гастробизнес|гастропредпринимател|'
           r'(?:ресторан|кафе|кофейн|пекарн|общепит)\w* (?:бизнес|франшиз)|франшиз\w+ (?:кафе|ресторан|кофейн|общепит)', None),
    # ---- 阿拉伯语 ----
    ('ar', r'(?:صاحب|اصحاب|ملاك|مالك|مؤسس|قطاع|ادارة|مشروع|مشاريع|تشغيل|صناعة|مجال|تجارة|بزنس|افتتاح|فتح|تسويق|ارباح|استثمار) '
           r'(?:ال)?(?:مطعم|مطاعم|مقهى|مقاهي|كافيه|كافيهات|كوفي|مخبز|مخابز|ضيافة|اغذية والمشروبات|اغذية ومشروبات)|'
           r'المطاعم والمقاهي|المطاعم والكافيهات|مطاعم وكافيهات|الاغذية والمشروبات|ريادة الاعمال في (?:قطاع )?المطاعم', None),
    # ---- 印地语（也常写成英语，由英语规则接住）----
    ('hi', r'(?:रेस्टोरेंट|रेस्टोरेन्ट|रेस्तरां|रेस्तराँ|रेस्टॉरेंट|कैफे|ढाबा|बेकरी|फूड|खाद्य|क्लाउड किचन|फूड ट्रक) '
           r'(?:बिजनेस|बिजनस|व्यवसाय|मालिक|कारोबार|खोल\w*|चलान\w*|उद्यमी|स्टार्टअप)|क्लाउड किचन|फूड ट्रक', None),
    # ---- 日语 ----
    ('ja', r'飲食店(?:の)?(?:経営|オーナー|開業|集客|売上|店主|主|向け|コンサル|運営|起業|独立|ビジネス|専門|経営者|店長|業界|を経営|を開|を営|をやって|の作り方|開店)|'
           r'飲食(?:経営|業界|ビジネス|コンサル|起業|人|業|事業|企業|関係者|プロデュー)|外食(?:産業|業界|ビジネス|経営|企業|チェーン|ニュース|トレンド|市場|最前線)|繁盛店|'
           r'(?:カフェ|喫茶店|居酒屋|(?<![ァ-ヶー])バー|ラーメン[店屋]|パン屋|ベーカリー|レストラン|焼肉店|食堂|スナック|菓子店|ケーキ屋|弁当屋|たこ焼き屋|蕎麦屋|寿司屋|鮨屋|酒場|ビストロ)'
           r'(?:の)?(?:経営|開業|オーナー|店主|を経営|を開業|を開いた|を開く|を営|起業|独立|の開き方|の作り方|集客)|オーナーシェフ|キッチンカー|移動販売|'
           r'フードビジネス|フードトラック|飲食フランチャイズ|飲食で独立|間借り(?:営業|カレー|カフェ)|ゴーストレストラン', None),
    # ---- 韩语 ----
    ('ko', r'외식업|요식업|외식 ?경영|외식 ?창업|외식 ?산업|외식 ?사업|외식 ?프랜차이즈|외식 ?컨설|외식 ?자영업|외식인|'
           r'(?<!네이버 )(?<!다음 )(?:식당|음식점|카페|빵집|베이커리|술집|주점|치킨집|고깃집|분식집|밥집|맛집|커피숍|디저트 ?카페|포차|이자카야|레스토랑|푸드트럭|배달 ?전문점) ?'
           r'(?:창업|운영|사장|경영|점주|장사|개업|폐업|매출|사업|대표|주인|오너|마케팅|컨설팅)|음식 ?장사|장사의 ?신|장사 ?노하우|푸드트럭|오너 ?셰프|골목 ?식당', None),
    # ---- 中文（简繁）----
    ('zh', r'餐[饮飲](?:创业|創業|经营|經營|老板|老闆|人|行业|行業|业|業|管理(?!有限|公司|股份)|营销|行銷|连锁|連鎖|加盟|品牌|生意|门店|門店|外卖|外送|顾问|顧問|咨询|諮詢|'
           r'从业|從業|投资|投資|企业|企業|商业|商業|店主|创始人|創辦人|圈|界|市场|市場|零售|数字化|數位|运营|營運|供应链|供應鏈)|'
           r'[开開](?:一[家间間]|了|过|過|间|間|家)?(?:餐[厅廳馆館]|咖啡[店馆館廳厅]|奶茶店|[饮飲]料店|[面麵]包店|烘焙[店坊]|酒吧|[饭飯][店馆館]|小吃店|'
           r'火[锅鍋]店|早餐店|便當店|甜[点點品]店|茶[饮飲]店|手搖[飲店]|居酒屋|小館|拉[面麵]店|[烧燒]烤店|快餐店|[面麵]館|面馆)|'
           r'(?:餐[厅廳馆館]|咖啡[店馆館廳厅]|奶茶店|[饮飲]料店|[面麵]包店|烘焙[店坊]|酒吧|小吃店|火[锅鍋]店|早餐店|甜[点點品]店|茶[饮飲]店|手搖[飲店]|居酒屋|'
           r'[烧燒]烤店|快餐店|小[馆館]|食肆|茶餐[厅廳]|大排[档檔]|夜市|[摆擺][摊攤]|餐[车車]|外[卖賣]店?)(?:的)?(?:老板|老闆|[经經][营營]|[创創][业業]|管理|店[长長]|'
           r'主理人|店主|[创創][始办辦]人|[营營][销運]|行銷|生意|加盟|[连連][锁鎖])|[开開]店(?:创业|創業|指南|笔记|筆記|日[记記]|经验|經驗|心得)|'
           r'茶[饮飲](?:行业|行業|业|業|品牌|加盟|创业|創業)|烘焙(?:创业|創業|行业|行業|业者|業者|店主)|手搖[飲饮](?:业|業|品牌|加盟|創業)|'
           r'咖啡(?:创业|創業|行业|行業|产业|產業|职人|從業|从业)|[摆擺][摊攤](?:创业|創業)|夜市(?:創業|创业|[摊攤]商)|餐[车車](?:創業|创业)|'
           r'外[卖賣](?:运营|運營|營運|商家|创业|創業)|食肆(?:經營|东主|東主|老闆)', None),
    # ---- 泰语 ----
    ('th', r'(?:ธุรกิจ|แฟรนไชส์|ผู้ประกอบการ|เจ้าของ)(?:ร้าน)?(?:อาหาร|กาแฟ|คาเฟ่|เบเกอรี่|ขนม|เครื่องดื่ม|ชานม|เหล้า|บาร์|สตรีทฟู้ด)|'
           r'(?:เปิด|ทำ|คนทำ|บริหาร|การตลาด)ร้าน(?:อาหาร|กาแฟ|ขนม|เหล้า|เบเกอรี่|ชานม|เครื่องดื่ม)|(?:เปิด|ทำ)(?:คาเฟ่|บาร์)', None),
]

BIZ_LATIN = (
    r'\b(?:business(?:es)?|owners?|ownership|entrepreneur\w*|operators?|operations|ops|management|managers?|marketing|profit\w*|revenue|'
    r'margins?|startups?|start-ups?|founders?|co-founders?|industry|leadership|leaders?|consult\w+|coach(?:ing|es)?|staffing|hiring|'
    r'labor costs?|p&l|proprietors?|ceo|investors?|small business|'
    r'unternehm\w+|inhaber\w*|betreiber\w*|grunder\w*|geschaftsfuhr\w+|selbststandig\w*|branche|umsatz|gewinn\w*|fachkraftemangel|'
    r'entreprendre|entreprise\w*|gerants?|dirigeants?|fondateurs?|fondatrices?|rentabilite|chiffre d\'affaires|gestion|'
    r'negocios?|empresari\w+|emprend\w+|duen[oa]s?|propietari\w+|rentab\w+|fundador\w*|gerentes?|'
    r'empreend\w+|don[oa]s?|proprietari\w+|lucro\w*|faturamento|gestao|gestor\w*|franquead\w+|'
    r'imprenditor\w+|titolar[ei]|gestor[ei]|fatturato|impresa|imprese|'
    r'ondernem\w+|eigenaar|eigenaren|omzet|'
    r'bisnis|usaha|pengusaha|pemilik|bisnes|perniagaan|usahawan|untung|'
    r'kinh doanh|khoi nghiep|doanh thu|loi nhuan|'
    r'isletme\w*|girisim\w*|sahib\w*|ciro|biznes\w*|wlasciciel\w*|przedsiebior\w+)\b')

# （标记，窗口，店或行业的词，经营的词，限定语言或 None）
WEAK = [
    ('latin', 100,
     r'\b(?:restaurants?|restaurantes?|ristorant[ei]|restaurang\w*|restoran\w*|restauracj\w*|bakery|bakeries|backerei\w*|boulangerie\w*|'
     r'panaderia\w*|padaria\w*|panificio|pasticceri\w+|patisserie\w*|pasteleria\w*|confeitaria\w*|konditorei\w*|bakkerij\w*|pizzeria\w*|'
     r'pizzaiol\w+|pubs?|bartend\w+|barkeeper\w*|barista\w*|baristi|coffee ?shops?|coffee ?houses?|cafeteria\w*|caffetteri\w+|kafe|'
     r'kedai kopi|warung\w*|rumah makan|kedai makan|kuliner|lanchonete\w*|hamburgueria\w*|street food|food ?trucks?|diners?|eatery|'
     r'eateries|catering(?! to\b)|caterers?|traiteurs?|hospitality|gastronomie|gastronomia|gastronomi|gastronomy|gastro|taprooms?|brewpubs?|'
     r'bistros?|bistrots?|brasseries?|trattori[ae]|osteri[ae]|gelateri[ae]|heladeria\w*|sorveteria\w*|izakaya|kopitiam|taqueria\w*|'
     r'cuisiniers?|cocineros?|cozinheiros?|restauration|restauracion|kneipen?|imbiss\w*|nha hang|quan an|'
     r'quan ca phe|tra sua|lokanta\w*|pastane\w*|kahveci\w*|kawiarni\w*|specialty coffee|speciality coffee|bubble tea)\b',
     BIZ_LATIN, None),
    ('chef', 100, r'\bchefs?\b(?! d\'| de | des | du )', BIZ_LATIN, {'en', 'es', 'pt', 'it', 'und', 'id', 'ms', 'tl'}),
    ('ja', 30, r'飲食店|飲食業|飲食|外食|レストラン|カフェ|居酒屋|喫茶店|パン屋|ベーカリー|ラーメン[屋店]|食堂|焼肉|酒場|料理人|シェフ',
     r'経営|開業|起業|独立|集客|売上|利益|店主|オーナー|経営者|マーケティング|繁盛|創業|出店|店長|フランチャイズ|原価|人手不足|採用|資金繰り|閉店|廃業|商売', {'ja'}),
    ('ko', 30, r'식당|음식점|(?<!네이버 )(?<!다음 )카페|외식|빵집|베이커리|술집|주점|분식|치킨집|고깃집|레스토랑|셰프|요리사|커피',
     r'창업|경영|운영|사장|매출|프랜차이즈|마케팅|점주|폐업|개업|노하우|컨설팅|자영업|장사|대표님|순이익|임대료|상권', {'ko'}),
    ('zh', 30, r'餐[饮飲厅廳馆館]|咖啡[店馆館廳厅师師]|[面麵]包店|烘焙|奶茶|茶[饮飲]|手搖|[饮飲]料店|酒吧|小吃|快餐|火[锅鍋]|餐[车車]|食肆|茶餐|大排[档檔]|便當|早餐店|'
     r'甜[点點品]店|居酒屋|[厨廚][师師]|主[厨廚]|外[卖賣]|夜市|[摆擺][摊攤]|[饭飯]店',
     r'[创創][业業]|[经經][营營]|老板|老闆|[开開]店|加盟|[连連][锁鎖]|管理|[营營][销銷]|行銷|生意|店[长長]|[门門]店|[营營][业業][额額]|利[润潤]|成本|'
     r'[创創][始办辦]人|品牌|主理人|店主|[顾顧][问問]|商[业業]|[赚賺][钱錢]|选址|選址|房租|翻[台桌]率', {'zh'}),
    ('th', 40, r'ร้านอาหาร|ร้านกาแฟ|คาเฟ่|เบเกอรี่|ร้านเหล้า|ร้านขนม|ชานม|เชฟ|สตรีทฟู้ด|อาหาร',
     r'ธุรกิจ|เจ้าของ|ผู้ประกอบการ|กำไร|ยอดขาย|การตลาด|แฟรนไชส์|ต้นทุน|เปิดร้าน|บริหาร|sme|ขายดี|เจ๊ง', None),
    ('ru', 50, r'ресторан\w*|кафе|кофейн\w*|пекарн\w*|кондитерск\w*|пиццери\w*|\bбар(?:а|ы|ов|е|ом|ах)?\b|шеф-повар\w*|фудтрак\w*|общественно\w+ питани\w+',
     r'бизнес\w*|владел\w+|предпринимател\w+|управлен\w+|франшиз\w*|выручк\w+|прибыл\w+|маркетинг\w*|основател\w+|бізнес\w*|власник\w*|підприєм\w+', None),
    ('ar', 50, r'مطعم|مطاعم|مقهى|مقاهي|كافيه|كوفي شوب|مخبز|مخابز|شيف|ضيافة|فود ترك',
     r'مشروع|مشاريع|بزنس|تجارة|ريادة|رواد|ادارة|تسويق|ارباح|استثمار|صاحب|اصحاب|مؤسس|امتياز|فرنشايز', None),
    ('hi', 50, r'रेस्टोरेंट|रेस्टोरेन्ट|रेस्तरां|रेस्तराँ|कैफे|ढाबा|बेकरी|फूड|खाद्य|चाय की दुकान|शेफ',
     r'बिजनेस|बिजनस|व्यवसाय|मालिक|कारोबार|उद्यमी|स्टार्टअप|मुनाफा|कमाई|फ्रेंचाइजी', None),
]

# 单独成立的弱信号（不要求「经营」词）。范围 title 只看标题，any 看标题和简介。
WEAK_SINGLE = [
    # 标题里有行业用词或店的种类（查全用；里面会有写给食客的节目，留给下一步读标题和简介的模型去分）
    ('tw', 'title',
     r'\b(?:restaurants?|restaurantes?|ristorant[ei]|restaurang\w*|restoran\w*|restaurateurs?|hospitality|gastronomie|hosteleria|horeca|'
     r'ristorazione|restauration|foodservice|food service|bakery|bakeries|boulangerie|panaderia|padaria|backerei|pizzeria|baristas?|'
     r'bartenders?|coffee ?shops?|food ?trucks?|catering)\b|餐[饮飲]|飲食店|外食|외식|요식|开店|開店|ร้านอาหาร|ресторан|مطعم|مطاعم|रेस्टोरेंट|\bnha hang\b'),
    # 店主口吻
    ('own', 'any',
     r'\b(?:my|our) (?:(?:own|little|small|family|first|new) )*(?:restaurants?|cafe|coffee ?shop|bakery|bar(?! exam| review| association| tab)|pub|food ?truck|pizzeria|diner|'
     r'bistro|brewpub|taproom|eatery|deli|catering (?:business|company))\b|'
     r'\b(?:unser|unsere[mnrs]?|mein|meine[mnrs]?) (?:eigene[sn]? |kleine[sn]? )?(?:restaurant|cafe|lokal|wirtshaus|bistro|backerei|kneipe|gasthaus|gasthof)\b|'
     r'\b(?:mon|notre) (?:propre |petit )?(?:restaurant|bistrot|bar|boulangerie|salon de the|coffee ?shop)\b|'
     r'\b(?:mi|nuestro|nuestra) (?:propio |propia )?(?:restaurante|bar|cafeteria|panaderia|pasteleria|taqueria)\b|'
     r'\b(?:meu|nosso|minha|nossa) (?:proprio |propria )?(?:restaurante|bar|lanchonete|padaria|cafeteria|pizzaria|hamburgueria|confeitaria)\b|'
     r'\b(?:il mio|il nostro|la mia|la nostra) (?:ristorante|locale|bar|pizzeria|pasticceria|trattoria|osteria)\b|'
     r'\b(?:mijn|ons|onze) (?:eigen )?(?:restaurant|cafe|bakkerij|koffiebar)\b'),
]
_WEAK_SINGLE = [(tag, scope, re.compile(rx)) for tag, scope, rx in WEAK_SINGLE]
```

## B.2 进中间文件的宽口径词根（`scripts/anchor.py`）

```python
# 进中间文件的宽口径（扫整库时用）：标题或简介里只要出现任何一个「店或行业」的词根就留下，后面再细判。
# 用字面子串而不用一个大正则：大正则每个字符要试三百个分支，扫 470 万行要一个多小时；字面子串几分钟。
# 改强弱信号（keywords.py）时，新加的词根要先确认在这张表里，否则要重扫整库。
import re

ANCHOR_ASCII = (
    'restaura ristora restoran gastro hostel horeca hospitality foodservice foodtruck cafe caffe kafe coffee kaffee koffie kopi barista '
    'baker backer boulang panader panific padaria pastel pasticc patiss konditor confeit bakkerij pizz publican bartend barkeep tavern '
    'taproom brewpub nightclub nightlife bistro brasserie eatery eateries cater katering traiteur franchis franqui waralaba lanchonete '
    'hamburgueria kuliner warung warkop kedai makanan minuman kitchen chef trattoria osteria gelater heladeria sorveteria izakaya '
    'kopitiam taqueria foodpreneur boba donut doughnut bagel burger bbq barbecue sushi ramen steakhouse kneipe imbiss gastgewerbe '
    'eisdiele kroeg lunchroom snackbar kawiarni piekarni cukierni lokanta pastane kahve mekan yiyecek alimentacao hospo besoksnaring '
    'utelivsbransjen serveringsbransjen').split() + [
    'food service', 'food truck', 'rumah makan', 'food business', 'food entrepreneur', 'food industry', 'street food', 'mobile food',
    'bubble tea', 'ice cream', 'yeme-icme', 'yeme icme', 'nha hang', 'quan an', 'quan ca phe', 'ca phe', 'tra sua', 'am thuc', 'an uong',
    'tiem banh', 'mo quan', 'quan nhau', 'alimentos y bebidas', 'alimentos e bebidas', 'pubblici esercizi', 'metiers de bouche',
    'fast casual', 'fast-casual', 'fast food', 'fast-food', 'quick service', 'quick-service', 'multi-unit', 'multi unit', 'front of house',
    'back of house', 'food cost', 'drinks industry', 'drinks business', 'drinks trade', 'on-trade', 'licensed trade', 'cake business',
    'cookie business', 'baking business']

ANCHOR_OTHER = (
    "ресторан кафе кофейн пекарн общепит кондитерск пиццери хорека фудтрак шеф-повар гостеприимств гастро бар питани кав'ярн "
    'مطعم مطاعم مقهى مقاهي كافيه كوفي مخبز مخابز ضيافة شيف اغذية '
    'रेस्टोरेंट रेस्टोरेन्ट रेस्तरां रेस्तराँ रेस्टॉरेंट कैफे ढाबा बेकरी फूड खाद्य किचन शेफ '
    '飲食 外食 レストラン カフェ 喫茶 居酒屋 パン屋 ベーカリー ラーメン 繁盛 キッチンカー 移動販売 料理人 シェフ 食堂 酒場 フード 間借り バー 焼肉 '
    'スナック 菓子店 ケーキ屋 弁当屋 たこ焼き 蕎麦屋 寿司屋 鮨屋 ビストロ '
    '식당 음식점 외식 요식 카페 빵집 베이커리 술집 주점 분식 치킨집 고깃집 장사 푸드트럭 셰프 레스토랑 커피 밥집 맛집 포차 이자카야 배달 요리사 '
    '餐 咖啡 烘焙 面包店 麵包店 奶茶 茶饮 茶飲 手搖 酒吧 小吃 火锅 火鍋 外卖 外賣 食肆 开店 開店 夜市 摆摊 擺攤 厨 廚 饭店 飯店 饭馆 飯館 便當 '
    '甜点店 甜點店 甜品店 饮料店 飲料店 烧烤店 燒烤店 小馆 小館 大排档 大排檔 拉面店 拉麵店 面馆 麵館 早餐店 '
    'อาหาร กาแฟ คาเฟ่ เบเกอรี่ ร้านขนม ชานม เชฟ สตรีทฟู้ด ร้านเหล้า เครื่องดื่ม บาร์').split() + ['فود ترك', 'चाय की दुकान']

# 要整词才算的短词：先用子串粗查，命中了再跑这条小正则
ANCHOR_WORD_PRE = ('bar', 'pub', 'diner', 'deli', 'roti', 'resto', 'chr', 'qsr', 'fnb', '&', 'wirt', 'krog')
ANCHOR_WORD = re.compile(r'\b(?:bars?|bares|pubs?|diners?|delis?|roti|resto|chr|qsr|fnb|f ?& ?b|wirt\w*|krog\w*)\b')

def anchored(t):
    """t 是 pilib.norm_text() 以后的文字。"""
    for s in ANCHOR_ASCII:
        if s in t:
            return True
    if not t.isascii():
        for s in ANCHOR_OTHER:
            if s in t:
                return True
    for s in ANCHOR_WORD_PRE:
        if s in t:
            return bool(ANCHOR_WORD.search(t))
    return False
```
