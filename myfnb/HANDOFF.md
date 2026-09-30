# MyF&B 交接文件

> **这是项目的唯一依据。** 2026-09-30 晚重写，把此前所有会话的决定统一成一个方向。
> 更早的版本（面向「华文中小餐饮老板」、「帮老板多赚钱」、12 个信源、计算器等）已全部作废，不要再按它们做；历史在 git log 里。
> 标了「快照」的是写作当时的状态，会变；其余是定案。
>
> 接手的 Claude：读完本文，再读根目录的 `AGENTS.md` 和 `docs/customize.md`，然后从 **§9 下一步** 开始。

---

## 0. 一句话

**MyF&B 是全球与马来西亚餐饮新闻参考站**：每天从全球和马来西亚的餐饮媒体、报纸与政府机构中，精选值得关注的新闻，写成中文摘要并附原文链接，早上八点出一份日报。底座是 AIHOT 开源框架（MIT）。

给下一个会话的开场白（用户复制发送即可）：

```text
请完整读 myfnb/HANDOFF.md，再读 AGENTS.md 和 docs/customize.md。
所有决定由你做（用户授权见交接文件 §4）。从 §9「下一步」第一项未完成的开始。
```

本地准备（新机器才需要）：

```bash
git clone https://github.com/1204kay/myfnbguide
```

```bash
cd myfnbguide && git checkout claude/myfnb-handoff && git remote add upstream https://github.com/KKKKhazix/AIHOT.git
```

---

## 1. 背景

- 旧站 **myfnbguide.com**（仓库 `1204kay/myf-b_book`，VitePress + Vercel）是马来西亚华文餐饮参考书：19 章手册、22 个计算器、34 城档案、11 个模板。读者可见内容最后更新于 2026-05-09。
- 找不到读者存在的证据：咨询页 3 条答复是示范（编号 `demo-`），故事墙是编辑写的，没有打赏到账记录，手册章节外部入站每月不到 50 次。
- 旧站没做起来的原因：静态参考书，读者没有回来的理由；内容写错了对象（给档口老板讲连锁集团教科书）；刻意不做分发；精力花在内部治理而不是读者。
- AIHOT（数字生命卡兹克）于 2026-09-28 以 MIT 开源，用户想成为社区一份子。决定：**舍弃旧站，只蒸馏本质，基于 AIHOT 重来。** AIHOT 的全自动采集、精选、日报，正好补上旧站「没有新内容、没有回访理由」的根本问题。

---

## 2. 定位（定案）

### 2.1 是什么

| 项 | 定案 |
|---|---|
| 身份 | **新闻参考站**（同类：华文世界的《参考消息》——外国新闻用中文摘要、附原文） |
| 标语 `tagline` | 值得关注的餐饮新闻 |
| 首页标题 `homeTitle` | MyF&B — 全球与马来西亚餐饮新闻 · 每日精选与日报 |
| 一句话介绍 `description` | 每天从全球和马来西亚的餐饮媒体、报纸与政府机构中，精选值得关注的新闻，写成中文摘要并附原文链接，早上八点出一份日报。 |
| 读者 | 马来西亚各类、各层级的餐饮业者。业态：小贩与食阁、茶室与嘛嘛档、咖啡与茶饮、快餐与连锁加盟、餐厅与酒楼、烘焙、团膳与中央厨房、云厨房、酒店餐饮。层级：老板、经理、厨师与员工、准备入行的人。目标是「全马餐饮」 |
| 范围 | 全球 + 马来西亚。全球新闻按「对马来西亚餐饮业者的参考价值」挑；重点市场：中国、新加坡、印尼、泰国、日本、韩国、台湾、美国；不收外国单店开张、名厨八卦、只在当地适用的规定与事故 |
| 比例 | 精选结果里全球约七成、大马约三成（按精选结果算，不按抓取量算；校准时核对，见 §9） |
| 语言 | 第一步：马来文、英文、中文来源加全球各语言来源，**全部写成中文**（跨族群的信息流动：马来文、英文世界的消息让华文读者看得到）。第二步加英文版，第三步加马来文版；先到作者仓库讨论多语言支持（§7.3），并看中文版的读者数据再定 |

### 2.2 六条原则

1. **报道，不指导。** 只说发生了什么、谁说的、数字多少、原文在哪；不替读者判断该怎么做。实战文章照样收，身份是「业界刊出了这篇讲方法的文章」，我们摘要、附原文，不自己教。推荐理由按作者原本的写法交代背景、比较或影响。
2. **全。** 全球加全马，三种语言的来源，全业态、全层级。
3. **准，而且可溯源。** 每条附原文链接和来源名，摘要只写原文里有的，数字照原文；同一件事多家报道归在一起。
4. **可查。** 分类、主题页、事件页、日报周报月报归档、搜索。
5. **挑过。** 按对马来西亚餐饮业者的参考价值排序，不是堆砌。
6. **按时。** 每天 08:00 日报，周一周报，每月 1 日月报。

### 2.3 内容线（日报分节）

大马动态（马来西亚的新闻不论类型都归这一节，排第一）→ 国际动态 → 市场与趋势 → 设备与科技 → 经营实战 → 观点与访谈。

- **设备与用品**：新的好用设备、同行都在用什么（例如大家在用哪种炒炉），是新闻和调查，**不是供应商名录**。我们量不出市场占有率，只收录说得出这件事的内容（调查、评测、店家实例）。
- **人才**：薪资行情、最低薪金与外劳政策、培训与补助、招人留人的方法，作为内容线，**不做招聘板**。
- **族群、宗教、王室话题**：只写事实和规定，不带族群框架（写进了评分和写作规则）。

---

## 3. 产品原则：每个功能都要过的筛子

**全自动、不用人维护、给错了也不会让读者真金白银受损。**

- 所以不做：计算器（费率要人手更新，过期就算错，算错读者就亏钱）、招聘板（要审核真假、涉及个人资料）、供应商名录；社区暂不做。旧手册、计算器、城市档案全部不带过来。
- 摘要本身也可能出错：对策是每条附原文链接、防幻觉规则、身份词典（不许写进原文没提到的机构）、不给建议。
- 上线初期完全非商业（不接赞助、不放广告，§5.6）；以后接赞助也要标明「赞助」，买不到排名；不卖课、不卖加盟。

从旧站只留下这几条本质：本地消息只认官方和原始来源；用读者的话说，不讲行话；没有读者之前不做重治理；分发是产品的一部分；不写错对象。读者多半为了经营得更好、多赚钱而来，这一点放在挑选标准里做内功，不写进定位。

---

## 4. 技术与运营决策（定案）

**2026-09-29 与 09-30 用户两次明确授权：「全部你决定」「全部交给你决定了……尽量跟着作者推荐的」。** AGENTS.md 要求问使用者本人的五件事（站名、信源、什么算重要、分类、条款）都已按本文定案。作者模板建议条款请专业人士过目；**用户没有可请的专业人士，2026-09-30 要求「直接把风险降到最低」**，按 §5.6 处理。

| 项目 | 决定 |
|---|---|
| 底座 | Fork `KKKKhazix/AIHOT` → `1204kay/myfnbguide`。**尽量只改 `industry/`**（另有 `myfnb/` 放本文件）；必须改核心的地方写成跟行业无关的通用改法，提 PR 给作者（§7） |
| 分支 | 工作分支 `claude/myfnb-handoff`；部署前合并进 fork 的 `main`，服务器跟 `main`（§9 第 2 项） |
| 同步上游 | 定期 `git fetch upstream`，审阅后合并，不自动跟；合并后跑四项检查 |
| 写摘要模型 | DeepSeek 官方 API（作者 `init-env` 的默认：`LLM_BASE_URL=https://api.deepseek.com/v1`、`LLM_MODEL=deepseek-flash`，前一会话读 `.env.example` 所得） |
| 向量模型 | Google Gemini `gemini-embedding-001` 免费层，走通用 OpenAI 兼容路径 `EMBEDDING_*`。原定作者默认的阿里云 `text-embedding-v4`，但阿里云绑卡页写明不收预付卡、虚拟卡，用户只有 TNG Visa（预付卡）。以后有银行借记卡可切回阿里云 |
| 服务器 | 腾讯云**国际版** Lighthouse **新加坡** 2 核 4GB，Ubuntu LTS，按月付、关自动续费 |
| 备份 | 腾讯云 COS 新加坡（`backup.ts` 默认就是腾讯云 COS 端点） |
| 域名 | 试跑用 `new.myfnbguide.com`（Porkbun 加 A 记录）；上线切换时 `www.myfnbguide.com` 指过来 |
| 更新方式 | 服务器每 5 分钟检查 fork 的 `main`，有更新就执行作者的更新命令（`git pull` + `docker compose --profile https up -d --build`） |
| 访客统计 | 不加（核心没有统计功能，加了要改 `apps/web`） |
| 检查点 | 上线 3 个月看读者数，决定继续还是停 |

---

## 5. `industry/` 现状（快照：2026-09-30，提交 `ec682dd`）

### 5.1 站点与模块

- `site.ts`：站名 `MyF&B`，行业词 `餐饮`，标语、首页标题、介绍见 §2.1；`locale: "zh-MY"`；`mcpPrefix: "myfnb"`（上线后不改）；联系邮箱 `myfb.guide.my@gmail.com`；`crawlerName: "MyFnBBot"`；页脚「由 AIHOT 开源框架驱动」（致谢）。关于页大标题「全球餐饮每天都有新消息，／值得看的，只有几条。」另加了 `subjectAfter()` 辅助函数（§5.5）。
- `features.ts`：`leaderboard: false`、`codexResetMonitor: false`（两个 AI 专用模块关掉）。
- `brand/`：MyF&B 图标与报头「餐饮日报／周报／月报」（`node scripts/nameplates.ts package` 生成）。没有用 AIHOT 的名字和 Logo。
- `changelog.json`：首条「MyF&B 改版上线」，日期按计划部署日 **2026-10-07**。
- `pages/terms.md`、`privacy.md`：运营主体 CORE SYSTEM STUDIO（用户的 SSM Enterprise 商号，没写注册号；旧站也没写，要写就补在 terms.md 表格「运营主体」一行），生效日期 2026-10-07，马来西亚法律，PDPA（含 2024 修订 Act A1727），只放标题、摘要、来源名和原文链接；写明内容由 AI 自动生成、未经人工逐条审核，只报道不给建议，收录来源的规则，下架承诺，上线初期不接受赞助和广告（§5.6）。**上线日期变了，要同时改 changelog.json 和这两个文件的日期。**

### 5.2 分类（`taxonomy.ts`、`topics.json`）

| key | 标签 | 日报节 | 归什么 |
|---|---|---|---|
| `malaysia` | 大马 | 大马动态 | 发生在马来西亚或适用于马来西亚的一切餐饮新闻，不论类型 |
| `industry` | 国际 | 国际动态 | 马来西亚以外的品牌与企业动态、可参考的外国政策与平台变化（也是未归类资料的兜底节） |
| `market` | 市场 | 市场与趋势 | 马来西亚以外的市场走势、消费变化、成本与行业数据 |
| `tools` | 设备 | 设备与科技 | 马来西亚以外的设备、家具装修、系统、自动化、包装的新产品与采用情况 |
| `tip` | 实战 | 经营实战 | 马来西亚以外、可以照着做的经营方法与复盘 |
| `opinion` | 观点 | 观点与访谈 | 马来西亚以外的观点、访谈、没有新数据的趋势判断 |

- 硬约束：`tip`、`opinion` 两个 key 被核心代码写死（公开接口 v1 的 tip 同时包含 opinion），`industry` 是兜底节；key 会出现在网址里，上线后不改。
- 内容类型与五轴权重（每行和为 10，同作者规则）：

  | 类型 | sig | nov | cred | reson | act |
  |---|---:|---:|---:|---:|---:|
  | policy_change | 3 | 1 | 2 | 2 | 2 |
  | platform_update | 2 | 2 | 1 | 2 | 3 |
  | tool_launch | 1 | 2 | 1 | 2 | 4 |
  | market_data | 2 | 2 | 2 | 3 | 1 |
  | industry_event | 3 | 1 | 2 | 4 | 0 |
  | practice_howto | 1 | 1 | 1 | 3 | 4 |
  | opinion_analysis | 1 | 3 | 1 | 4 | 1 |

- 标签：8 个分类标签；41 个主题标签（经营主题、业态、地区）；22 个实体标签（大马机构、外卖平台、主要连锁品牌）。身份词典覆盖中、英、马来文写法。
- 主题页 57 个：经营主题 17、地区与业态 18、机构与品牌 22。

### 5.3 挑选与写作（`prompts/`）

保留作者结构（内容类型、五轴加权、噪声压制、安全边界、事件口径校正），只换读者、例子和类型：

- 评分读者是马来西亚各类、各层级餐饮业者；外国新闻看能不能被别处的业者参考；头号噪声是消费者向内容（新店开幕、促销、美食推荐、食评）。
- 预筛：放行与餐饮经营相关的一切（不分国家和语言），以及没提餐饮但影响马来西亚所有商家或雇主的一般政策（最低薪金、SST、电子发票、公积金社险、外劳、电费、中小企业援助）。**直接挡掉**两类高风险内容：族群、宗教、王室的争议与抵制呼吁；点名个人或小商家的指控、罪案、官司、事故与食物中毒个案（主管机构的正式规定、整体执法数字，以及上市公司与大型连锁的诉讼仍收）。
- 写作：马来文、英文专有名词保留原文并首次括注；机构缩写首次括注中文；金额照原文（RM 加阿拉伯数字，外币不换算）；马来西亚写「最低薪金」、别国写「最低工资」；族群、宗教、王室只写事实和规定；指控和未判决案件写成「某方指控／称」；普通个人不写全名，不写身份证、住址、电话。事件综述和日报、周报导语也有同样的规定。
- 门槛 `selection.ts` 仍是作者的 T1 60 / T1_5 65 / T2 76，**等标注样本校准后再改**（作者规则：先改挑选标准，最后才动门槛）。

### 5.4 信源（18 个，全部 `site_fulltext` / `syndicate_fulltext` 关闭）

每个都用框架自己的采集代码试抓通过，`node myfnb/check-sources.mjs` 复查全部合规（2026-09-30）。每天新稿量是当天实测（快照），只有 10 条的 RSS 按跨度外推，偏粗。

| 地区 | 信源 | 抓法 | 每天约 |
|---|---|---|---:|
| 大马 T1 | 财政部 MOF · 文告（马来文 RSS；英文版更新慢） | RSS | 0.3 |
| 大马 T1 | 内陆税收局 LHDN · 公告与文告（英文版列表；马来文版日期框架认不出） | 网页列表 | 0.3 |
| 大马 | 星洲日报 · 餐饮业标签页（日期从文章页补） | 网页列表 | 0.2 |
| 大马 | 南洋商报 · 餐饮业标签页（同上） | 网页列表 | 0.3 |
| 大马 | 东方日报 · 财经 | RSS | 16 |
| 大马 | Malay Mail · Money | RSS | 8 |
| 大马 | The Malaysian Reserve | RSS | 40 |
| 大马 | Utusan Malaysia · Ekonomi（马来文） | RSS | 18 |
| 大马 | Vulcan Post | RSS | 1 |
| 大马 | Grab Malaysia · 新闻稿（刻意不给 T1：T1 门槛最低，平台软文会混进来） | RSS | 0.0 |
| 全球 | Foodservice Equipment Reports（美国，设备） | RSS | 1.3 |
| 全球 | FSR Magazine（美国，正餐） | RSS | 3.7 |
| 全球 | Total Food Service（美国） | RSS | 1.2 |
| 全球 | Daily Coffee News（咖啡业） | RSS | 1.4 |
| 全球 | QSR Media Asia（亚洲快餐与连锁；日期从文章页补） | 网页列表 | 1 |
| 全球 | 食品産業新聞社 · 外食（日本） | RSS | 5.4 |
| 全球 | 식품외식경제（韩国） | RSS | 3.3 |
| 全球 | 红餐网 · 专栏（中国） | 网页列表 | 12 |

合计每天约 110 条进预筛：大马约 84 条（多是一般商业新闻，大部分会被预筛挡掉），全球约 29 条（全是餐饮专门来源）。七比三看的是精选结果，校准时核对；全球那边偏少的话，按下面的规则补来源（先用复查脚本查候选）。

**接信源的规则**（2026-09-30 按「风险最低」定，写进了 `sources.json` 的 `$comment` 和使用条款）：**只接对 AI 没有任何限制的来源。**

1. robots.txt 不许抓我们要用的路径 → 不接。
2. robots.txt 点名拒绝任何 AI 爬虫或 AI 抓取程序（对照社区维护的清单 github.com/ai-robots-txt/ai.robots.txt，约 180 个），或 `Content-Signal` 写 `ai-input=no` / `ai-train=no` → 不接。本站用模型写摘要，对 AI 表示过任何保留的来源都不用。
3. 使用条款禁止爬虫、自动抓取、文本与数据挖掘或 AI 使用 → 不接。只许个人使用其 RSS 或内容的 → 不接。
4. 只有通用的「不得转载、复制」条款 → 可以接：本站不转载，只写自己的简短摘要（80–160 字）并链接原文（依据见 §12 版权法第 13(2)(a) 条）。
5. robots.txt 读不到（403、超时）→ 无法确认，不接。

规则 1、2、5 由 `node myfnb/check-sources.mjs` 自动查（用框架自己的抓取身份，因为有的网站按访问者返回不同的 robots.txt）；规则 3、4 要人工读条款。**每月跑一次，加新信源前先对候选跑**（可传候选文件路径）。框架本身不读 robots.txt，来源也会改规则，所以这一步不能省。

按这套规则没接或去掉的：

| 来源 | 原因 |
|---|---|
| Harian Metro（及同集团 NST） | robots.txt 对我们的抓取身份不许抓 RSS，且写 `ai-input=no` |
| FMT、Nation's Restaurant News、Restaurant Dive、Modern Restaurant Management、Inside Retail Asia、iCHEF 餐厅帮 | robots.txt 点名拒绝 AI 爬虫（规则 2） |
| Fast Casual、Pizza Marketplace、FE&S、BigHospitality、Restaurant Online、Bakery and Snacks、FoodNavigator-Asia、Foodservice Director、QSR Magazine、Business Times（新加坡）、The Edge、EdgeProp、Bernama | 同上（候选，未接） |
| Restaurant Business | 条款禁止未经书面同意用爬虫、机器人抓取 |
| World Coffee Portal | 条款禁止用自动工具抓取、索引，禁止任何自动提取数据的用途 |
| The Caterer（英国） | 条款专门一节禁止文本与数据挖掘和网页抓取 |
| World Tea News | 条款限个人、非商业使用 |
| The Star | RSS 页写明仅限个人、非商业用途，不得聚合后配广告 |
| Perfect Daily Grind | 对抓取返回 403 |
| just-food、Hospitality Net、Hospitality Tech 等 | robots.txt 读不到（规则 5） |
| 国家银行 BNM、公积金局 KWSP、卫生部 KKM、中小企业机构 SME Corp、QSR Magazine、Food & Beverage Asia | 对抓取返回 403 |
| SoyaCincau | 现在对抓取返回 403 |
| 国内贸易部 KPDN | 文告只有 PDF，框架不解析 PDF |
| 人力资源部 MOHR | 文告列表靠脚本渲染，抓不到 |
| 统计局 DOSM | 首页没有可抓的新闻列表 |
| 移民局、首相署、能源委员会 ST、JAKIM 清真网站 | RSS 停在 2023 年 / `/feed/` 404 / 多是报纸剪报 / 首页只有编码过的链接 |
| 中国报、诗华日报 | 与星洲、南洋同集团同稿；诗华财经与东方财经同一批通讯社稿 |
| Bernama | RSS 只有 10 条，各版混在一起，没有日期 |
| Owner.com 博客、StoreHub 博客 | 厂商内容，几乎不更新或全是推广页 |

以上是本机网络的结果；服务器在新加坡，政府网站可能挡数据中心 IP，部署后要在后台「信源」页再试抓一次。

### 5.5 改了 `industry/` 以外的文件

合并上游时只有这几处可能冲突；作者接受对应 PR（§7）后冲突就消失。

| 文件 | 改了什么 | 对应 PR |
|---|---|---|
| `apps/web/app/features/report/format.ts`、`ReportPaper.tsx`、`routes/report-latest.tsx`、`routes/hot.tsx`、`routes/topics.tsx`、`routes/feedback.tsx`，`industry/site.ts` 的 `subjectAfter()`，`industry/package.json` 导出 `topics.json` | 页面写死的「AI 日报」「AI 圈」「按主题看 AI」「公司与模型」等改从 `industry/` 读 | PR 1 |
| `scripts/smoke.ts` | 站名 `MyF&B` 在网页里是 `MyF&amp;B`，冒烟检查原本 15 个页面全报错 | PR 2 |
| `.github/workflows/check.yml` | CI 写死「信源 18 个」，改成按 `sources.json` 条数比对 | PR 3 |

### 5.6 风险处理（按最低风险定案）

用户没有可请的专业人士，2026-09-30 要求「直接把风险降到最低」。逐项处理如下，每项都读代码或实测确认过：

| 风险 | 处理 |
|---|---|
| 转载别人的内容（版权） | 全部来源关闭全文。读者只看到我们自己写的中文标题、80–160 字摘要、来源名和原文链接。作者代码把「给不给全文」定义在一处（`publication/rules.ts`），网页、RSS、接口、MCP 共用。文章配图只在全文模式出现，所以不显示；分享图用我们自己的文字生成。唯一来自对方的图是来源网站的小图标，用来标明出处 |
| 来源不许抓取或不许 AI 使用 | §5.4 的规则：只接对 AI 没有任何限制的来源，每月用 `myfnb/check-sources.mjs` 复查 |
| 商业用途 | 多数报社条款限制商业使用。**上线初期完全非商业**：不接赞助、不放广告、不卖东西（使用条款已写明）。开始赞助前，先重读每个来源条款里的商业限制，有限制的停用，再把使用条款升到 1.1 加赞助条款 |
| AI 写错造成诽谤或误导 | 预筛直接挡掉点名个人或小商家的指控、罪案、官司、事故个案；写作规则要求指控写成「某方指控」、普通个人不写全名；使用条款写明内容由 AI 自动生成、未经人工逐条审核、以原文为准；每条都有原文链接 |
| 马来西亚 3R 话题（族群、宗教、王室） | 争议与抵制呼吁在预筛一步直接挡掉；主管机构的正式规定照收，只写事实 |
| 给建议害人 | 只报道不建议（§2.2 原则 1）；推荐理由只说为什么值得关注；条款写明不构成专业意见；不做计算器（§3） |
| 个人资料（PDPA） | 不做访客统计；反馈只保存处理反馈所需的内容，不交给模型（模型相关代码不读反馈）；摘要不写普通个人全名和身份资料；隐私说明按 PDPA 2024 修订写了外泄通报 |
| 来源方投诉 | 条款承诺一般三个工作日内处理。要求停止收录的，用作者自带的 `node --env-file=.env scripts/delete-sources.ts "<原因>" <来源 id>`（读过代码：先撤下已入选的内容，再删除来源和它的全部文章） |
| 把内容交给模型服务商 | 只把公开发布、对 AI 没有限制的来源内容交给 DeepSeek 和 Gemini；不交读者资料 |

降不下去、只能知道的风险：

- 通用「不得转载」条款与「自写摘要 + 链接」的界线最终要看法院；我们的做法与主流新闻聚合相同，并有版权法第 13(2)(a) 条（报道时事的合理使用）可依。
- AI 仍可能写错，靠原文链接、条款声明和及时更正兜底。
- 收到律师函或正式投诉时：先撤下相关内容、停用来源，再回复。

---

## 6. 检查结果（快照）

四项检查以 Linux 为准（WSL Ubuntu 24.04、Node 24.14、conda-forge PostgreSQL 17.11，新建空库；与作者 CI 和正式服务器同一系统）：

| 提交 | typecheck | 后端测试 | 网站构建与测试 | 冒烟（采集与模型调用关闭） |
|---|---|---|---|---|
| `4edd697`（合并作者 5 个新提交后） | 通过 | 158/158 | 通过，16/16 | 全部通过 |
| `ed056c4`（信源按条款调整后） | 通过 | 158/158 | 通过，16/16 | 全部通过 |
| `ec682dd`（按最低风险收紧信源、规则、条款后） | 通过 | 158/158 | 通过，16/16 | 全部通过 |

GitHub 上作者的 CI（fork 的 `main` 推到 `85ae703` 后）：`check` 与 `docker` 两个 job 都通过（https://github.com/1204kay/myfnbguide/actions/runs/36715649502）。`docker` job 用我们的 `industry/` 构建镜像、`docker compose up`、跑冒烟检查并核对导入了 19 个信源，这是本机没有 Docker 时唯一的镜像验证。

另逐页抓了 15 个页面：没有残留「AI 日报」「AI 圈」「按主题看 AI」「OpenAI」「公司与模型」「MyHOT」「多赚」等字样；显示的是「餐饮日报」「餐饮圈」「按主题看餐饮」「机构与品牌」「地区与业态」「经营主题」。标语只用在分享图和 PWA 清单里（作者模板注释说在首页左上角，实际代码不在那用），首页看不到是正常的。

Windows 上：类型检查和网站构建通过；作者原版的网页服务器在 Windows 起不来（PR 4 修），关机信号类后端测试在 Windows 上跑不了（Windows 不支持 SIGTERM 处理），与我们的改动无关。

---

## 7. 给作者的贡献

用户要求：「一定要 PR 给作者，我们用他的开源，要做贡献。」按作者 `CONTRIBUTING.md`：一次 PR 只解决一个问题，从最新 `main` 建分支，写明验证结果；大方向先在 Issue 或讨论区说。PR 模板三节：解决什么问题 / 如何验证 / 兼容与使用影响。

### 7.1 已准备的 PR（快照：分支都基于作者 `main` 的 `c38705b`）

| # | 分支 | 解决什么 | 验证 |
|---|---|---|---|
| 1 | `pr/web-subject-wording` | 报告页、热点榜、主题页、反馈框写死的「AI」改从 `industry/` 读；主题页三组名称改读 `topics.json`（原本这份数据没人读） | 行业词是 AI 时，6 个页面的可见文字与原版逐字相同，只有主题页描述（原本手写了 OpenAI、Anthropic 等）和反馈框举例换成通用写法；行业词换成「法律」时全部跟着变；四项检查全过 |
| 2 | `pr/smoke-escaped-name` | 冒烟检查认得出 HTML 转义后的站名 | 站名设成 `MyF&B`：原版 16 项失败，修复后全部通过；四项检查全过 |
| 3 | `pr/ci-source-count` | CI 的 docker 检查按 `sources.json` 条数比对信源数 | seed 把 `sources.json` 每一条都写进表（读过 `scripts/seed.ts`）；docker 步骤要在 GitHub 上跑，提 PR 后由作者的 CI 验证 |
| 4 | `pr/windows-web-server` | `apps/web/server.ts` 用 `pathToFileURL` 加载构建产物，Windows 上网站能起来 | Windows：原版网页测试 9 个失败（`ERR_UNSUPPORTED_ESM_URL_SCHEME`），修复后 16/16；Linux 四项检查全过 |

状态：**已验证，等用户说一声后提交**（对外发布，按用户的全局规则先说一声）。提交后把 PR 链接记在这里。

### 7.2 发现但还没做成 PR 的上游问题

1. `packages/backend/src/sources/web-list.ts` 的日期解析不认马来文、印尼文月份（Mac、Mei、Ogos、Okt、Dis）。我们绕开了（LHDN 用英文版）。属于作者欢迎的「通用采集能力」。
2. 四处读者看得到的文案写死「北京时间」（`packages/backend/src/publication/feeds.ts`、`publication/llms.ts`、`apps/web/app/routes/agent.tsx`、`routes/report-latest.tsx`），另有两处给模型的输入也写「北京时间」（`editorial/input.ts`、`editorial/analyze.ts`；Codex 监控模块里的是 AI 专用模块，已关）。时间本身对（马来西亚同为 UTC+8），只是说法；可以把时区说法放进 `industry/site.ts`，适合并进 §7.3 的多语言讨论。
3. 两个测试靠「宽召回的AI相关性预筛」这几个字认出预筛提示词，换行业改提示词就得改测试；只认「宽召回」即可（`tests/default-model.test.ts` 已经这样写）。
4. 框架不解析 PDF，而不少政府文告只有 PDF（KPDN 全是 PDF，LHDN 的全文在 PDF 里）。
5. 采集不读 robots.txt（包括 `Content-Signal`）。我们用 `myfnb/check-sources.mjs` 每月人工复查；框架若能在采集时自动跳过不许抓或不许 AI 使用的来源，所有 fork 都受益。可以先在讨论区提，作者认可再把脚本的逻辑做成通用功能提 PR。

### 7.3 多语言（议题，未开）

先去作者仓库的「想法交流」讨论区或 Issue 说明场景：同一站点输出多种语言。改动横跨数据库（文章表存的是中文标题、摘要、推荐理由）、写作步骤和全部界面文案，新贡献者直接丢大 PR 被接受的机会很低。先讨论，按作者意见拆小 PR；第一个小 PR 只把写死在网页里的界面文案搬进 `industry/`（PR 1 是同一方向的第一步）。技术路线二选一：三个站各跑一份（改动小，模型费约三倍，2 核 4GB 跑不动三套），或一个站写三种语言（收集和评分只做一次，但要改核心）。等作者回应和中文版读者数据再定。

---

## 8. 用户账号进度（快照：2026-09-30）

| 项目 | 状态 |
|---|---|
| Fork `1204kay/myfnbguide` | 已完成 |
| GitHub Actions | 用户已在 fork 打开（工作流「Check」，推送到 `main` 或开 PR 时跑作者的全套检查） |
| GitHub 命令行 | 本机 `gh` 已登录 `1204kay`，可以给作者开 PR |
| DeepSeek | 已充值，余额 US$2.00 + ¥9.90（约 US$3.4），已建 key。余额提醒是关的，要打开；10/6 部署前充到约 US$10 |
| 阿里云国际版 | 放弃（不收预付卡、虚拟卡） |
| Google AI Studio（Gemini 向量 key） | **待办**：用户用 Google 账号在 https://aistudio.google.com/apikey 建 key，不用绑卡 |
| 腾讯云国际版 | 已注册并绑卡（TNG Visa 可用，Google 登录）；还没买服务器 |
| Porkbun A 记录 `new` → 服务器 IP | 买服务器后做 |

**所有 key 都不要让用户发给 Claude**，部署时由用户自己粘贴到服务器上。

---

## 9. 下一步（按顺序）

1. **提交给作者的 PR**（§7.1）：用户点头后逐个提交，正文按作者的 PR 模板写，附验证结果；提交后把链接记进 §7.1。再按 §7.3 开多语言讨论。
2. ✅（2026-09-30）**fork 的 `main` 已快进到 `claude/myfnb-handoff`**，GitHub CI 两个 job 通过（§6）。以后在 `claude/myfnb-handoff` 上做完、检查通过后，同样快进推到 `main`（`git push origin claude/myfnb-handoff:main`）；部署后服务器跟的就是 `main`，推上去约 5 分钟内会自动更新线上站。
3. **部署脚本 `myfnb/bootstrap.sh`**（部署日在真服务器上边写边测；本机没有 Docker，现在写了也验证不了）。按作者 `docs/deploy.md` 的做法：装 Docker → clone fork 的 `main` → 用作者的 `scripts/init-env.ts` 生成 `.env`（服务器没有 Node，就在 `node:24` 容器里跑它）→ 交互式读入 DeepSeek key 和 Gemini key（用户自己粘贴）→ 追加 `SITE_URL=https://new.myfnbguide.com`、`SITE_DOMAIN=new.myfnbguide.com`、`PORT=127.0.0.1:3000`、`TRUST_PROXY=true` 和向量配置 → `docker compose --profile https up -d --build` → 装 systemd timer：每 5 分钟 `git fetch`，`main` 有变化就 `git pull` 并重新 `up -d --build`。
4. **向量配置**：`EMBEDDING_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`、`EMBEDDING_MODEL=gemini-embedding-001`。向量列是 `real[]`，维度没写死（`database/migrations/0006_embeddings.sql`），用 `EMBEDDING_DIMS=1536`。未确认 Google 的兼容接口是否接受框架会发的 `dimensions`、`encoding_format` 和一次多条输入，部署日在服务器上用用户的 key 试一条：返回向量就用 1536；报参数错误就改 `EMBEDDING_DIMS=0`（默认 3072 维）；还不行就设 `EMBEDDINGS_ENABLED=false`，归组退回字面比对，站照样能跑，只是中英文同一事件合不上。

   ```bash
   curl -s https://generativelanguage.googleapis.com/v1beta/openai/embeddings -H "Authorization: Bearer $EMBEDDING_API_KEY" -H "Content-Type: application/json" -d '{"model":"gemini-embedding-001","input":["测试一","测试二"],"dimensions":1536,"encoding_format":"float"}' | head -c 300
   ```

5. **10/6–10/7 部署**：先 `git fetch upstream` 审阅并合并作者最新修复、跑四项检查 → 用户买 Lighthouse（新加坡、Ubuntu LTS、2 核 4GB、1 个月、关自动续费；默认防火墙已开 22/80/443）→ Porkbun 加 `new` A 记录 → 用户在 OrcaTerm 网页终端粘贴 bootstrap 命令。
6. **部署后**：在服务器上跑 `node myfnb/check-sources.mjs`（机器上没有 Node 就用 `docker compose run --rm --no-deps --entrypoint node setup myfnb/check-sources.mjs`）并在后台「信源」页对 18 个信源各试抓一次（服务器 IP 可能被政府网站挡）；以后**每月跑一次复查**，不合规的来源在后台暂停；后台「设置 → 预算」设每日上限；腾讯云监控设流量包 80% 告警（轻量服务器超额按量计费，**没有自动关机选项**）；COS 建桶并设生命周期（daily 留 30 天、weekly 留 90 天），填 `DB_BACKUP_STORE_*`；第一周看后台「模型与评测」页的实际调用次数和 token 数，校正 §11 的费用估算。
7. **校准（10 月中下旬）**：收集约一周（10/9 预算案是第一批考题）→ Claude 先标 100–200 条 select / reject / either（含边界难例，分 development / holdout）→ 用户审 → `node --env-file=.env scripts/eval-selection.ts --gold .data/gold.jsonl --split development` → 后台 SelectBench 看错例 → **先改挑选标准，最后才动门槛**（作者没定准确率数字）。同时核对精选结果的全球与大马比例是否接近七比三。
8. **关卡**：每周 ≥ 10 条对餐饮业者有参考价值的新闻，且 holdout 结果用户认可 → 上线（§10 切换）；不过就停（删服务器即停止计费）。
9. **上线前**：按 §5.6 逐项自查一遍（用户没有可请的专业人士，已按最低风险处理）；上线日期变了，同步改 `changelog.json` 与两份条款的生效日期。
10. **上线后**：WhatsApp 频道 + FB / IG 每周发周报链接攒读者；在作者的「作品展示」讨论区分享；3 个月检查点。

---

## 10. 旧站切换清单（上线当天做）

1. `www.myfnbguide.com` 指到新服务器；旧网址全部 301 到新站首页（在 Caddy 配置）。
2. 关闭 5 个 Tally 表单：fix（EkJ0lN）、feedback（XxElML）、story（yPx8dx）、ask（Gxo91j）、join（dWZNBV）。
3. FB / IG / 小红书 @myfnbguide 简介链接改新站。
4. GitHub 仓库 `1204kay/myf-b_book` 设为 Archive（不删）。
5. 域名接管后停掉 Vercel 旧项目（用户自己操作）。
6. Porkbun 其他 DNS 记录不动（`forms.myfnbguide.com` Tally CNAME、Sender DKIM 3 CNAME + 1 TXT）。
7. 过渡期：新站上线前若预算案改了最低薪金等数字，改旧仓库 `.vitepress/data/regulations.js` 一处即可（旧站 97.8% 法规数字从它读取；该文件 `DATA_META.nextReview: '2026-07-23'` 已过期）。

---

## 11. 成本与变现

**每月约 RM65–120**（1 USD = RM4.08，2026-09-29；即 US$16–29）：

| 项目 | 每月 | 备注 |
|---|---|---|
| 腾讯云 Lighthouse 新加坡 2 核 4GB | 约 US$8.5 | **未核实**：来自搜索结果，以下单页为准 |
| DeepSeek | 约 US$7–20 | **估算**：每天约 110 条进预筛，大部分一般商业新闻在预筛一步就挡掉（1 次调用），入选的还要评分两次、写摘要、打标签、归组；估每天 300–400 次、每次约 3000 token。以上线第一周后台「模型与评测」页为准。预付费，余额用完即停 |
| Gemini 向量 | 0 | 免费层，不用绑卡（免费层数据可能被 Google 用于改进产品；我们处理的是公开新闻，可接受） |
| COS 备份 | 几分钱 | |
| 超额流量 | 正常 0 | 唯一会随读者上涨的费用 |

模型费用不随读者上涨（读者打开页面不触发模型调用）；随信源数量上涨。

**变现三阶段**（作者自己的路线是「网站免费，高级功能给机构」）：

- A 上线 0–3 个月：只攒读者（WhatsApp 频道关注数 = 读者数），挂着 TNG / DuitNow 打赏（收款主体 CORE SYSTEM STUDIO）。
- B 有稳定读者后：周报冠名赞助，明确标「赞助」，买不到排名。**开始前先做 §5.6「商业用途」一行的复查**（有商业限制的来源停用，使用条款升 1.1）。订阅 < 5,000 时行情约每次 US$50–300 固定价；每月卖一次最低价即盖过成本。对象：收银系统、食材与包装供应商、厨房设备、外卖平台、银行 SME 贷款、会计服务。用 CORE SYSTEM STUDIO 开发票。
- C 有机构来用后：机构版（定制信源、按主题的提醒、MCP 数据接口），先问 2–3 家会计所或商会定价。
- 不做：推荐佣金、付费墙、卖课、卖加盟。

---

## 12. 已查证的事实（省得重查）

框架：

- AIHOT 开源于 2026-09-28，作者会合并外部 PR（截至 9/30 已合并 7 位外部贡献者的 PR），采用 squash 合并；`CONTRIBUTING.md`、PR 与 Issue 模板于 9/30 加入。
- 无向量时归组退回字面相似度（`events/group.ts`），中英文同一事件合不上。
- `backup.ts`：AWS SigV4，默认端点 `https://{bucket}.cos.{region}.myqcloud.com`，按 daily / weekly（周日）/ monthly（每月 1 日）存，本地留 3 份。`retention.ts`：运行记录成功 30 天、失败 90 天；图片与分享卡缓存 30 天。
- 核心代码里的 `Asia/Shanghai` 与马来西亚同为 UTC+8，日报仍是本地早上 8 点。
- `scripts/seed.ts` 把 `sources.json` 每一条都写进 sources 表（已存在的不覆盖）。
- 抓取身份：`Mozilla/5.0 (compatible; MyFnBBot/1.0; +<SITE_URL>/about)`（`lib/http-fetch.ts`）。有的网站按访问者返回不同的 robots.txt（Harian Metro 对浏览器身份不挡 RSS，对 MyFnBBot 挡），所以复查必须用这个身份。
- `Content-Signal` 是 robots.txt 里的一行（`search` / `ai-input` / `ai-train`），Cloudflare 托管的网站常见；Harian Metro、NST 写 `ai-input=no`。
- 全文开关 `site_fulltext` 在 `publication/rules.ts` 定义一次，所有出口共用；文章配图只在全文模式显示；分享图用站内文字生成。`scripts/delete-sources.ts` 先撤下已入选内容，再删除来源与全部文章。
- 反馈内容不进任何模型调用（`editorial/`、`providers/`、`jobs/` 里没有读取反馈的代码）。
- 所有提示词都能展开，没有漏填的 `{{…}}`；内容理解提示词里的标签词表与 `taxonomy.ts` 逐字一致。
- 站名里的 `&`：RSS 标题走 CDATA 或转义，分享图和网页也会转义，不会弄坏输出。
- 正文抽取：星洲约 1,200 字、南洋约 1,600 字（南洋 PLUS 付费文只有约 230 字）、财政部约 3,400 字、东方日报约 550 字；LHDN 文章页只有第一段，全文在 PDF 里。
- 本机是 Windows：WSL（Ubuntu 24.04）里有检查环境：克隆在 `~/myfnbguide`，PostgreSQL 在 `~/pgenv`（数据 `~/pgdata`，端口 5433），脚本 `~/checks-branch.sh <分支>` 把 Windows 仓库的某个分支拉进 WSL 跑四项检查。第 34 号迁移会设 `default_toast_compression = lz4`，要用带 lz4 的 PostgreSQL（conda-forge 的可以，zonky 便携版不行）。

法律与行业：

- 版权法（1987）第 13(2)(a) 条：为报道时事而合理使用，公开使用时须注明作品标题与作者；第 13(2A) 条会看是否商业用途和用了多少。这是只放标题、来源、简短摘要和链接的依据。
- PDPA 2024 修订（Act A1727）：外泄须在 72 小时内通报专员；可能造成重大伤害时须不无故拖延地通知当事人；新增资料可携权。
- 全马餐饮场所 136,453 家（DOSM 2023 经济普查，2022 年数据）。
- 电子发票：2026-09-01 起年营业额 RM300 万以下免开。
- Budget 2027 于 2026-10-09 提交。

账号与服务：

- 腾讯云 Lighthouse：控制台 Login 打开 OrcaTerm 网页终端，默认用户 `lighthouse`；默认防火墙开 22/80/443/3389。
- DeepSeek：API key 只显示一次；海外卡经 PayPal；最低充值 ¥10；余额为零返回 402。
- 阿里云 Model Studio：新加坡区 API key 页 `https://modelstudio.console.alibabacloud.com/ap-southeast-1/settings/api-key`；免费额度用完返回 403 `AllocationQuota.FreeTierOnly`。

---

## 13. 参考链接

- AIHOT：https://github.com/KKKKhazix/AIHOT（`AGENTS.md`、`CONTRIBUTING.md`、`docs/customize.md`、`docs/selection.md`、`docs/deploy.md`、`docs/sources.md`）
- 旧站仓库：https://github.com/1204kay/myf-b_book
- 腾讯云轻量计费：https://cloud.tencent.com/document/product/1207/44368
- DeepSeek 价格：https://benchlm.ai/deepseek/api-pricing
- 阿里云向量计费：https://alibabacloud.com/help/en/model-studio/billing-for-text-embedding
- 电子发票豁免：https://www.bernamabiz.com/news.php?id=2601057
- 版权法第 13 条：http://www.commonlii.org/my/legis/consol_act/ca1987133/s13.html
- robots.txt Content-Signal 说明：见各站 robots.txt 注释（Harian Metro、NST、Modern Restaurant Management 在用）
