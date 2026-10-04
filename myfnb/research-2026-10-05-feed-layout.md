# 「最新」里的精选与全部怎么放（2026-10-05 调研定稿）

> 站主问：「最新」和「全部餐饮动态」看不出区别；电脑版能不能学手机版的切换；不显示全部是不是浪费。调查中外 36 家资讯与聚合站（已核实 32 家），以下按数据定下。

**「精选」与「全部」的排版（2026-10-05 定）**

调研了 36 家中外资讯站、行业媒体和阅读器（2026-10-05 访问）。取得页面的有 32 家；即刻需要登录，澎湃新闻返回 403，Reddit 和 Reuters 打不开，均未计入。

**调研结果**
- 同时向读者提供「挑过的」和「全部或按时间」两种列表的有 23 家，其中 18 家默认显示挑过的。
- 电脑和手机用同一组页内切换的有 3 家，默认都显示挑过的：少数派（https://sspai.com/ ，「推荐｜全部内容」）、掘金（https://juejin.cn/ ，「推荐｜最新｜关注」）、钛媒体（https://www.tmtpost.com/ ，「推荐｜最新」）。
- 调研里没有一家在手机上用底栏格子区分两种列表。
- 两种列表排序相同、卡片相同、只差是否入选的，只有 Product Hunt（https://www.producthunt.com/leaderboard/daily/2026/10/4 ）：电脑上是 Featured｜All 页内切换，默认 Featured；手机上不提供 All。
- 在页面上用一句话写明两者区别的，只有 Lobsters（https://lobste.rs/recent ）："The newest stories that have not yet reached the front page."

**本站的做法**
- 导航只有一个入口「最新」。
- 电脑和手机都用同一个「精选｜全部」切换，默认显示精选；两个网址照旧（/ 和 /all）。
- 电脑分类行的第一项由「全部」改为「不限」，与手机筛选面板一致。
- 「全部」里的入选条目，电脑和手机都标「精选」，并带收录理由；没入选的不加标记；页面顶部写一句说明：「收集到的全部条目，按时间排列；标有「精选」的条目已入选，并附收录理由。」
- 「精选」列表里不再显示「精选」标记。
- 搜索和标签的结果列出全部条目。
- 日报和参考库只用入选的条目。

**「全部」保留，不撤下**
- 它是挑选和改标准后重判的原料，也是搜索、标签和同一新闻其他报道的来源。
- 按站主盲标的评测 v6（gold 333 条，40 分门槛），入选的只有必看 36/49、可看 43/154，其余只在「全部」里。
- 分支 nav-pending（e5c351e）与此相反，不合并。

---

## 附：分布

**一、按调研时的分类统计（共 36 家，2026-10-05 访问；已核实 32 家）**

| | 同页切换 | 分成两个入口 | 只有一种（只有挑过的） | 其他 | 已核实 | 未取得页面 |
|---|---|---|---|---|---|---|
| 中文（18 家） | 4 | 4 | 4 | 4 | 16 | 2 |
| 外文（18 家） | 3 | 3 | 2 | 8 | 16 | 2 |
| 合计（36 家） | 7 | 7 | 6 | 12 | 32 | 4 |

各格包括哪几家：
- 同页切换：中文是 36氪、少数派、掘金、钛媒体；外文是 Product Hunt、The Verge、Inoreader（Inoreader 切换的是已读和未读，不是挑选）。
- 分成两个入口：中文是虎嗅、职业餐饮网、Readhub、AIbase；外文是 Hacker News、Lobsters、Feedly（Feedly 的 Today 按分享数取 10 篇，不是编辑挑选）。
- 只有一种：中文是知乎、餐饮老板内参、今日头条、AI工具集；外文是 Techmeme、Google News。
- 其他：中文是 IT之家、品玩、界面新闻、红餐网；外文是 NRN、Restaurant Business Online、Eater、Restaurant Dive、Hospitality Net、Bloomberg、QSR Magazine、Skift。
- 未取得页面，不计入任何统计：即刻（必须登录）、澎湃新闻（返回 403）、Reddit（人机验证）、Reuters（空白页）。
- 算作「已核实」但只读到文字或文档的：Feedly 和 Inoreader 只读了官方文档和博客；Hospitality Net 只有文字。红餐网、餐饮老板内参、职业餐饮网的手机版只读了页面文字。虎嗅的 /article/ 被滑动验证挡住。知乎电脑首页要登录，只看到顶栏。
- 今天另外重新打开了 3 页抽查，与调研记录一致：Lobsters /recent 页底的说明句；Product Hunt 帮助页（首页由团队挑选，不保证每个提交都上首页）；钛媒体资讯标签行（「推荐」链接到 /，「最新」链接到 /new）。

**二、把「其他」12 家按实际做法归类后（已核实 32 家）**

| 做法 | 中文 | 外文 | 合计 |
|---|---|---|---|
| 同页切换 | 4 | 3 | 7 |
| 分成两个入口 | 4 | 3 | 7 |
| 只有一种 | 5（加上界面新闻：文章只按频道分） | 2 | 7 |
| 同一页分区、不切换（挑过的在上或在旁，按时间的在下或在侧，完整列表另设页面） | 1（品玩） | 8（上表外文「其他」8 家，其中 7 家另有完整时间列表页，Restaurant Business 没有找到） | 9 |
| 两端做法不一致 | 2（IT之家：电脑只有「最新」，手机是「最新｜精读」；红餐网：电脑首页分区块，手机是「全部｜热文」，热文按热度排） | 0 | 2 |

**三、同时提供两种列表的 23 家，电脑和手机分别怎样放**
这里「挑过的」包括编辑、算法、热度或投票挑出的。23 家中，中文 11 家：36氪、虎嗅、少数派、掘金、IT之家、品玩、钛媒体、红餐网、职业餐饮网、Readhub、AIbase；外文 12 家：HN、Lobsters、Product Hunt、The Verge，以及 8 家行业或财经媒体。

| | 同页切换 | 两个入口 | 同页分区或上下堆叠 | 只剩一种 | 未核实 |
|---|---|---|---|---|---|
| 电脑 | 5（36氪、少数派、掘金、钛媒体、Product Hunt） | 6（虎嗅、职业餐饮网、Readhub、AIbase、HN、Lobsters） | 11（品玩、红餐网、The Verge 和 8 家媒体；Hospitality Net 只按文字顺序判断） | 1（IT之家） | 0 |
| 手机 | 6（少数派、掘金、钛媒体、IT之家、红餐网、The Verge） | 3（AIbase、HN、Lobsters） | 8（品玩、NRN、Restaurant Business、Eater、Restaurant Dive、Bloomberg、QSR、Skift） | 4（36氪、职业餐饮网只留全部；Readhub、Product Hunt 只留挑过的） | 2（虎嗅、Hospitality Net） |

- 两端做法相同的：同页切换 3 家（少数派、掘金、钛媒体，都是中文站，默认都显示挑过的「推荐」）；两个入口 3 家（AIbase、HN、Lobsters）；分区 8 家。两端做法不同的 7 家（36氪、IT之家、红餐网、职业餐饮网、Readhub、Product Hunt、The Verge）；未核实 2 家。
- 调研记录里没有一家在手机上用底栏格子区分两种列表。

**四、默认显示哪一种（23 家）**
- 挑过的：18 家。中文 7 家：虎嗅、少数派、掘金、品玩、钛媒体、职业餐饮网（电脑）、Readhub。外文 11 家：HN、Lobsters、Product Hunt、The Verge、NRN、Restaurant Business、Eater、Restaurant Dive、Bloomberg、QSR、Hospitality Net（按文字顺序判断）。
- 全部或按时间：5 家（36氪、IT之家、红餐网、AIbase、Skift）。
- 用切换的 8 家里，默认挑过的 5 家（少数派、掘金、钛媒体、Product Hunt、The Verge 手机版），默认全部 3 家（36氪、IT之家、红餐网）。

**五、与本站最接近的 5 家**
这 5 家都公开了没入选的条目，或从别处收来的原始条目：HN /newest、Lobsters /recent、Product Hunt All、Readhub 科技动态等、AIbase 新闻资讯。
- 默认显示挑过的：4/5（AIbase 菜单里全部新闻排在日报前面）。
- 把没入选的条目混进默认视图：0/5。
- 手机上不提供全部：2/5（Product Hunt、Readhub）。
- 用文字写明两者的区别：2/5（Lobsters 在页底写一句；AIbase 在菜单每项下写一句说明）。
- 两种列表排序相同、卡片相同、只差是否入选的，32 家里只有 Product Hunt 1 家，它把全部列表叫 All。

**六、叫法**
- 按时间排的全部列表（中文 11 家；红餐网两端不同，计两次）：
  - 「最新」一类 7 处：36氪、掘金、钛媒体、IT之家叫「最新」，品玩叫「最新发布」，AIbase 叫「最新新闻」，红餐网电脑版叫「最近文章」。
  - 「全部」一类 3 处：少数派「全部内容」、虎嗅「全部」、红餐网手机版「全部」。
  - 按领域命名 2 处：Readhub「科技动态」等，职业餐饮网「餐饮资讯」。
  - 外文：Latest 一类 6 家，Recent 一类 4 家，New 或 Newest 3 家，River 1 家，All 1 家（Product Hunt）。
- 挑过的列表（中文 11 家）：
  - 「推荐」一类 6 家：36氪、少数派、掘金、钛媒体，以及品玩「热门推荐」、职业餐饮网「热点推荐」。
  - 其余各 1 家：IT之家「精读」、红餐网「热文」（按热度）、Readhub「热门话题」、AIbase 日报说明里的「每日精选」；虎嗅首页不命名。
  - 「推荐」在掘金、知乎、今日头条指算法推荐。
  - 外文：Top Stories 一类 5 家，Featured 一类 2 家，不命名 5 家。
- 用「最新」称呼全部列表的站，挑过的那一种都不按时间排（由编辑或算法排序），所以「最新」本身就说明了区别。本站两种列表都按时间排，只差是否入选；同样情况的只有 Product Hunt，它用的是 Featured｜All。

**来源（均于 2026-10-05 访问）**
- 中文站：
  - 36氪 https://www.36kr.com/information/web_news/ ，https://m.36kr.com/
  - 虎嗅 https://www.huxiu.com/ ，https://m.huxiu.com/
  - 少数派 https://sspai.com/
  - 即刻 https://web.okjike.com/ （需要登录）
  - 掘金 https://juejin.cn/
  - 知乎 https://www.zhihu.com/explore
  - IT之家 https://www.ithome.com/ ，https://m.ithome.com/
  - 品玩 https://www.pingwest.com/
  - 钛媒体 https://www.tmtpost.com/ ，https://www.tmtpost.com/new ，https://m.tmtpost.com/
  - 界面新闻 https://www.jiemian.com/ ，https://m.jiemian.com/
  - 澎湃新闻 https://www.thepaper.cn/ （403）
  - 红餐网 https://www.canyin88.com/ ，https://m.canyin88.com/
  - 餐饮老板内参 https://www.watcn.com/
  - 职业餐饮网 http://www.canyin168.com/
  - 今日头条 https://www.toutiao.com/ ，https://m.toutiao.com/feed
  - Readhub https://readhub.cn/
  - AIbase https://www.aibase.com/zh/news ，https://news.aibase.com/daily
  - AI工具集 https://ai-bot.cn/daily-ai-news/
- 外文站：
  - Techmeme https://www.techmeme.com/ ，https://www.techmeme.com/river ，https://www.techmeme.com/m/
  - Hacker News https://news.ycombinator.com/ ，https://news.ycombinator.com/newest ，https://news.ycombinator.com/newsfaq.html
  - Lobsters https://lobste.rs/ ，https://lobste.rs/recent ，https://lobste.rs/newest
  - Product Hunt https://www.producthunt.com/leaderboard/daily/2026/10/4 （及 /all），https://help.producthunt.com/en/articles/484923-how-do-things-end-up-on-the-homepage ，https://www.producthunt.com/p/general/why-products-that-were-not-featured-on-the-launch-date-are-so-hard-to-access
  - Google News https://news.google.com/home?hl=en-US&gl=US&ceid=US:en
  - Reddit https://www.reddit.com/r/restaurateur/ （未打开）
  - Feedly https://docs.feedly.com/article/530-how-are-the-articles-in-the-today-view-compiled
  - Inoreader https://www.inoreader.com/blog/2026/05/a-cleaner-top-bar-and-quicker-access-to-key-features.html
  - NRN https://www.nrn.com/ ，https://www.nrn.com/latest-news
  - Restaurant Business Online https://www.restaurantbusinessonline.com/
  - Eater https://www.eater.com/ ，https://www.eater.com/archives/full
  - Restaurant Dive https://www.restaurantdive.com/
  - Hospitality Net https://www.hospitalitynet.org/
  - The Verge https://www.theverge.com/
  - Bloomberg https://www.bloomberg.com/latest
  - QSR Magazine https://www.qsrmagazine.com/
  - Skift https://skift.com/news/
  - Reuters https://www.reuters.com/ （未打开）

## 附：定下的做法（逐条）

**本站现状（2026-10-05 在 main 分支读代码核对）**
- 电脑侧栏有两个入口：「最新」（/，只列入选的）和「全部餐饮动态」（/all）。两页标题分别是「最新」「全部餐饮动态」。分类行第一项叫「全部」（apps/web/app/features/feed/Filters.tsx 的 CategoryTabs）。
- 手机底栏是「参考 / 最新 / 日报 / 我的」。「最新」页顶栏中间是「精选 | 全部」切换。分类收在筛选面板里，第一项叫「不限」。
- 结果是：同样两个列表，电脑上出现「最新」「全部餐饮动态」「全部（分类）」三个名字；手机上同一页在底栏叫「最新」，在切换里叫「精选」。两种列表都按时间从新到旧排，卡片也相同，所以看不出区别。
- 「精选」标记只在电脑上显示（FeedItem.tsx 里写的是 hidden lg:inline-flex），而且在「最新」页每张卡片都有。收录理由只有入选条目才有（packages/backend/src/publication/publish.ts 第 288 行把没入选条目的理由置空），电脑和手机都显示。
- 搜索（/all?q=）和标签（/all?tag=）查的都是全部。

**定下的做法**
1. **导航入口**：电脑侧栏和手机底栏都只放一个「最新」，底栏仍是参考 / 最新 / 日报 / 我的。侧栏不再列出「全部餐饮动态」。「最新」在 / 和 /all 两页都显示为选中。
   - 依据：两端用同一组切换的 3 家（少数派、掘金、钛媒体）都只给一个入口；调研里没有一家用手机底栏格子区分两种列表；站主说看不出区别的，正是电脑侧栏里并列的这两个入口。
2. **切换方式**：电脑学手机。两端用同一个两段切换（现有的 PillTabs 组件）。
   - 手机：放在顶栏中间，与现在相同。
   - 电脑：放在页面标题「最新」同一行的右侧，下一行照旧是分类和搜索；/all 页的电脑标题也改为「最新」。
   - 两种列表继续用各自的网址（精选是 /，全部是 /all）。切换时保留正在用的分类筛选（手机现在就是这样），不记住上次的选择。
   - 先例：少数派（电脑用侧栏竖排，手机用标题下拉，选项相同）、掘金、钛媒体，两端都是同一组切换。
3. **两个名字：「精选 | 全部」**
   - 为什么用这两个词：两种列表都按时间排，差别只在是否入选，名字要说出这个差别。样本里情况相同的只有 Product Hunt，它叫 Featured｜All。
   - 为什么不把「最新」放进切换：导航入口已经叫「最新」，说的是两种列表共同的排序（myfnb/HANDOFF.md 第 115 行认定栏目名「最新」只说排序，不算承诺）。再放进切换，就会让一个词指两样东西。
   - 为什么不用「推荐」：在掘金、知乎、今日头条，「推荐」指算法推荐，而本站不按读者个人挑选。「精选」已经用在卡片标记和关于页的「条精选」上，也是站主自己的说法。
   - 避免两个「全部」相撞：电脑分类行第一项由「全部」改为「不限」，与手机筛选面板一致（手机已经叫「不限」）。
4. **默认显示精选**。依据：23 家里 18 家默认挑过的；最接近的 5 家里 4 家；用切换的 8 家里 5 家。
5. **没入选的条目怎样区分：只标入选的，不标没入选的**
   - 在「全部」里，入选条目两端都显示「精选」标记（手机现在不显示，要补上），并带收录理由；没入选的不加任何标记。样本里没有一家给没入选的条目打标记，36氪是在「最新」列表里给挑过的条目加「推荐」角标。
   - 在「精选」里不再显示「精选」标记：每张卡片都有，不提供任何信息。
   - 「全部」页顶部加一句说明，文字定为：「收集到的全部条目，按时间排列；标有「精选」的条目已入选，并附收录理由。」样本里只有 Lobsters 在页面上写明区别；本站两种列表卡片相同，更需要这一句。
6. **搜索和标签的结果列全部**，入选条目同样带「精选」标记和收录理由。搜索结果里不再加「精选 | 全部」切换，因为那里已经有「按时间 | 按相关」，同一栏两组切换容易混淆。
   - 理由：只搜精选会漏掉约 87% 的条目，其中包括站主自己会判为必看、可看的（数字见「浪费」一项）。
   - 调研没有覆盖各站搜索的范围，这一条是按本站情况定的。
7. **日报和参考库只用入选的**，不变。
8. **为什么以后不用改**：名字说的是「挑过的」与「全部」的关系，不随条数、来源、分类变化。将来如果要加按读者个人的视图，照掘金（推荐｜最新｜关注）和 The Verge 手机版（Top Stories｜Latest｜Following）的先例，在同一组切换里加第三段即可。
9. **与现有改动的关系**
   - 分支 nav-pending（e5c351e）把 /all 加进 NAV.hidden，并让手机切换随之取消，「全部」只能经搜索和标签到达。这与本方案相反，不合并，按上面重做。
   - 要改的地方：
     - site/site.ts 的 NAV.hidden 加上 "/all"，只用来让侧栏不列这个入口；切换不能再以 navShown("/all") 为条件。
     - apps/web/app/routes/home.tsx 和 all.tsx 的电脑标题行加切换，all.tsx 的电脑标题改为「最新」。
     - Filters.tsx：电脑分类行第一项改为「不限」。
     - FeedItem.tsx：按第 5 条改标记规则。
     - components/shell/nav.ts：让「最新」在 /all 也显示为选中。
   - 这些都在框架代码里，提给作者时做成站点可选项。
   - myfnb/HANDOFF.md 第 15 行把「最新」写成「收进来的全部，可筛选」，与现状和本方案都不符，要一起改。

## 附：收进来不显示是不是浪费

**结论：不浪费。按上面的做法，「全部」也仍然看得到，点一下切换就到。**

1. **收进来的条目首先是挑选的原料。** 要从 1,908 条里挑出 256 条（13.4%），每一条都要先预筛、打分。这笔花费在挑选时已经发生，列不列出来都不会改变。只给读者一种列表的站并不少见：已核实的 32 家里有 7 家。Techmeme 的关于页说，选稿由爬虫、筛选软件和编辑逐层完成，它按时间排的 River 也只列入选的条目（https://www.techmeme.com/river ，2026-10-05 访问）；Google News 也只给聚合后的结果。

2. **没入选的条目在本站流程里的作用**（读代码和文档核对）：
   - **搜索和标签**：/all?q= 和 /all?tag= 查的是全部（apps/web/app/routes/all.tsx）。
   - **同一新闻的其他报道**：卡片下的「另有 N 家信源报道」取自全部条目（packages/backend/src/publication/groups.ts 用 listedCondition，不要求入选）。没入选的同一新闻在「全部」里显示「同一新闻，精选展示《…》」，并链接到入选的那篇。
   - **改标准以后的候选**：10/3 门槛降到 40 以后，myfnb/rejudge-2026-10-03.sql 把前两天没入选、平均分已到 40 的条目交回重判，回执复用，不重复收费。没有这批条目，改了标准也只能等新内容进来。
   - **校准门槛的样本**：docs/selection.md 要求用标好「该选 / 不该选」的样本校准。myfnb/gold-labels.tsv 的 333 条里有 130 条「不看」，只能从收进来的条目里抽。
   - **对外出口**：/feed/all.xml（最近 7 天的全部动态，publication/feeds.ts），以及公开 API 的全部模式（publication/v1.ts）。
   - **日报**：以入选条目为主。引擎文档另有一条例外：没有报道入选、但有官方原帖并且已有 3 个以上独立参与方的事件，只进日报（docs/selection.md）。本站是否出现过这种情况，没有核对。
   - **参考库**：只写入选的条目（myfnb/HANDOFF.md 第 364 行）。

3. **「全部」里也有站主认为值得看的条目。**
   - 站主盲标的 333 条（gold-labels.tsv）中，必看 49 条、可看 154 条、不看 130 条。
   - 评测 v6 在 40 分门槛下（myfnb/HANDOFF.md 第 330 行）：选进必看 36 条（约 73%）、可看 43 条（约 28%）、不看 3 条（约 2%）。分母按 333 条计；v6 实际打出分数的是 328 条，所以比例是近似值。
   - 也就是说，约四分之一的必看、七成以上的可看没有进精选，只在「全部」里。
   - 样本是分层抽取的，不能据此推算 1,652 条没入选的条目里有多少值得看；但足以说明「全部」里不只是顺丰冷运副总裁发言这一类。取消入口，这些条目就只能靠搜索找到。这是本方案保留切换、不合并 nav-pending 的主要理由。

4. **反过来，「全部」也不该和「精选」并列为两个入口。** 没入选的占 86.6%，其中大部分属于按标准不收录的内容（展会发言、人事、营销稿等）。两者并列，会让读者以为分量相同。

**超出这次范围、列给站主判断的（都没有改动）：**
- 门槛 40 时，可看的选中比例只有约 28%。这是挑选标准的问题，不属于排版。
- industry/selection.ts 第 21 行的注释说，30–40 分没入选的条目「在「全部动态」里也带推荐理由」；但 publish.ts 第 288 行把没入选条目的理由置空，网页上看不到。注释与代码不一致。
- 站内「收录」一词有两种用法：「收录理由」指入选；给 Agent 的说明（publication/agent.ts 第 47 行）却把所有收进来的条目都写成「收录于」。
