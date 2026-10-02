# MyF&B 交接文件

> **这是项目的唯一依据。** 2026-10-01 按全球定位重写，2026-10-02 更新（合并上游；入口加宽到 601 个来源，已上线；入口的终点定为「每天 10 条以上必看」，来源个数、总条数都不再是目标，见 §5.4「入口的终点」）。方案与理由见 `plan-2026-10-01.md`，查证记录见 `research-2026-10-01.md`，全球来源全集见 `sources-universe-2026-10-01.md`，10/2 起每个看过的候选记在 `sources-ledger.tsv`。
> 更早的版本（2026-09-30 的「全球与马来西亚餐饮新闻参考站」，更早的「华文中小餐饮老板」「帮老板多赚钱」、计算器等）全部作废，不要再按它们做；历史在 git log 里。
> 标了「快照」的是写作当时的状态，会变；其余是定案。
>
> 接手的 Claude：读完本文，再读根目录的 `AGENTS.md` 和 `docs/customize.md`，然后从 **§9 下一步** 开始。

---

## 0. 一句话

**MyF&B 是餐饮版的 AIHOT**：每天从全球餐饮业的行业媒体和一手来源里，挑出经营者值得知道的事，写成中文摘要、附原文链接，早上 8 点出一份日报。底座是 AIHOT 开源框架（MIT）。站名读作「我的餐饮」。

给下一个会话的开场白（用户复制发送即可）：

```text
请完整读 myfnb/HANDOFF.md（项目唯一依据），再读 AGENTS.md 和 docs/customize.md。
所有决定由你做（授权见交接文件 §4）。从 §9「下一步」第一项未完成的开始。
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

- 旧站 **myfnbguide.com**（仓库 `1204kay/myf-b_book`，VitePress + Vercel）是马来西亚华文餐饮参考书：19 章手册、22 个计算器、34 城档案。找不到读者存在的证据；没做起来的原因：静态参考书没有回来的理由、写错了对象、刻意不做分发、精力花在内部治理。
- AIHOT（数字生命卡兹克）于 2026-09-28 以 MIT 开源。决定：**舍弃旧站，只蒸馏本质，基于 AIHOT 重来。** 全自动采集、精选、日报，补上旧站「没有新内容、没有回访理由」的根本问题。
- **2026-10-01 试跑上线**（https://new.myfnbguide.com）：第一天精选 6 条全是马来西亚政府公告，日报为空，用户的判断是「跟餐饮没多大关系」。查下来三个原因：入口太窄而且开错了地方（14 个信源一半是综合新闻和政府网站）；评分标准写错了（新品促销当头号噪声，读者写成马来西亚业者）；门槛照搬 AI 站。同日用户定了新方向：**全球定位，做餐饮版的 AIHOT**，按用户自己的标注重写标准（`plan-2026-10-01.md`）。

---

## 2. 定位（定案 2026-10-01）

### 2.1 是什么

| 项 | 定案 |
|---|---|
| 身份 | 全球餐饮业每日要闻，中文（「餐饮版 AIHOT」） |
| 首页标题 `homeTitle` | MyF&B — 全球餐饮业每日要闻 |
| 一句话介绍 `description` | 每天从全球餐饮业的行业媒体和一手来源中，挑出经营者值得知道的事，写成中文摘要并附原文链接，早上八点出一份日报。 |
| 标语 `tagline` | 值得关注的餐饮新闻 |
| 读者 | 看中文、做餐饮或想做餐饮的人，不分国家：老板、店长、厨师、准备开店的人，连锁总部的人也算。画像就是用户本人：做餐饮近 10 年，在抖音向同行学。AIHOT 的作者知道读者要什么，因为他自己就是读者；我们的标准也以用户的标注为准 |
| 范围 | 全球、所有业态。马来西亚不特殊对待（用户：「都定位全球了，为什么还要抓着马来西亚」） |
| 语言 | 只做中文。读者定为看中文的人，原先「先中文、再英文、再马来文」的三语计划作废（§7.3） |
| 不是什么 | 不是美食推荐，不是投资新闻，不是本地新闻站；不替读者做决定 |
| 为什么会有人看 | 中文世界里没有一个地方每天把全球餐饮业的事挑好、写成中文（搜了两次没找到直接对手，不算证明）；中国餐饮品牌正在出海（世界中餐业联合会 2026 报告：约 200 个国内品牌已在海外开店），同行关心海外市场；海外华人餐饮人读英文、日文、韩文行业媒体有门槛 |

### 2.2 内容标准：必看、可看、不看

经营者关心的九个方面（多国业者调查、抖音与小红书上同行在讲的事、用户的标注，`research-2026-10-01.md` §10）：人（招人留人、人工成本、用机器和系统省人）、成本与定价、客流与回头客、开店与生意模式、产品与菜单、后厨与效率、行业风向、供应链、政策与合规。

| 档 | 定义 | 用户 10/1 标过的例子 | 去向 |
|---|---|---|---|
| **必看** | 读完能改变店里的某个决定，或帮人避开一个坑 | 麦当劳用 AI 管得来速、库存和点单准确率；韩国 AI 炒菜机器人建全国安装维修网；火锅店缺的是「第二次来」的理由；9.9 元冷冻烘焙重走网红店老路 | 进日报 |
| **可看** | 了解行业、找灵感 | 星巴克关北美约 250 家；瑞幸新加坡第 100 家；巴奴全直营不加盟；Denny's 新品；万圣节限定饮品 | 进「全部动态」，最好的几条也进日报 |
| **不看** | 跟店里的决定无关 | 迪生与美心分拆持股；TGI Fridays 首签美国加盟；韩国自营业者贷款逾期率；设备公司任命销售经理 | 不出现 |

- 必看通常是：能省人、省钱、提效的工具或做法，有真实数字；能照着试的引流、复购、定价做法；生意模式的教训（尤其失败与避坑），有数字；有数字的品类与市场风向；多国同时在做的同一类规定（跨国趋势）。
- 不看通常是：大公司资本运作本身、人事任命、颁奖和榜单评选、活动预告与回顾、展商宣传、公益、宏观金融数字、远方的单店开张或单个加盟签约、只给食客看的内容。
- **只在一个国家适用的规定**（例如某国调最低工资）只算可看，用户的话：「对大部分人没作用」。同一类规定在多国同时出现、代表跨国趋势时正常评价。
- 不设地区配额：每周数一次日报的地区分布，某个地区长期超过一半就补别的地区的来源。偏差的成因是来源不平衡，补来源能消掉它，配额只会把好内容挡在门外。

### 2.3 写法与日报

- 每条：中文标题（一眼看懂发生了什么）、80–160 字答案先行的摘要、一句「为什么值得看」（从经营者角度说它碰到人手、成本、客流、开店、产品中的哪一项）、来源名和原文链接。
- **只报道，不指导**：摘要可以写「原文介绍了三个做法」，不写「你应该」。原因还在：内容是 AI 自动写的、没有人逐条审核，给错建议会让读者真金白银受损（§3）。
- 不搬全文，只放自己写的摘要（版权，§5.6）。
- 日报每天 08:00（北京时间，与马来西亚同一时区；中文读者习惯这个说法，不改），**目标 10–20 条、5 分钟看完**：必看全收，其余位置给最好的可看。周一周报，每月 1 日月报。
- 分六节，必看多的在前：经营实战 → 设备与科技 → 数据与趋势 → 行业动向 → 政策与合规 → 观点与访谈。讲人手的内容散在几节里，另有主题页「人与用工」收齐。

### 2.4 读者为什么回来、量什么

同类产品让读者回来的共同点（`research-2026-10-01.md` §7）：每条说清跟我有什么关系；不只「发生了什么」，还有做法、数据、视角；短而全；固定时间、固定形式；一件事只看一次；越贴近读者的业态和地区越好。前五条由 §2.2–§2.3 和框架本身（归组、热点、定时日报）做到；固定栏目和长期追踪的数据等有读者以后看反馈再定。

**量什么**：不装访客追踪。上线时（§9 第 8 项）加一个计数：日报每天被打开几次、每条原文链接被点几次；不存 IP、不放 cookie、不认人（10/1 用户交给 Claude 决定，定为加）。再加 Google Search Console 的搜索点击。用途是看哪类内容被点得多，回头调标准。

---

## 3. 产品原则：每个功能都要过的筛子

**全自动、不用人维护、给错了也不会让读者真金白银受损。**

- 所以不做：计算器（费率要人手更新，过期就算错）、招聘板（要审核真假、涉及个人资料）、供应商名录；社区暂不做。旧手册、计算器、城市档案全部不带过来。
- 摘要本身也可能出错：对策是每条附原文链接、防幻觉规则、身份词典（不许写进原文没提到的品牌和平台）、不给建议。
- 上线初期完全非商业（不接赞助、不放广告，§5.6）；以后接赞助也要标明「赞助」，买不到排名；不卖课、不卖加盟。

从旧站只留下这几条本质：消息只认原始来源；用读者的话说，不讲行话；没有读者之前不做重治理；分发是产品的一部分；不写错对象。

---

## 4. 技术与运营决策（定案）

**授权**：2026-09-29、09-30 用户两次明确授权「全部你决定」「尽量跟着作者推荐的」；2026-10-01 定方案时又说「其他的全部你决定」。AGENTS.md 要求问使用者本人的五件事（站名、信源、什么算重要、分类、条款）都已按本文定案：站名、读者、单一国家规定怎么算由用户本人定；分类、信源、条款按用户授权由 Claude 定。用户没有可请的专业人士，要求「直接把风险降到最低」，所以风险规则由 Claude 按最低风险定，不搁置等专业意见（§5.6）。

| 项目 | 决定 |
|---|---|
| 底座 | Fork `KKKKhazix/AIHOT` → `1204kay/myfnbguide`。**尽量只改 `industry/`**（另有 `myfnb/` 放本文件和脚本）；必须改核心的地方写成跟行业无关的通用改法，提 PR 给作者（§7） |
| 分支 | 工作分支 `claude/myfnb-handoff`；四项检查通过后 `git push origin claude/myfnb-handoff:main`，服务器跟 `main`。**Claude 自己推**（之前的会话都是这样）；10/2 有一个会话里自动模式两次拒绝（判定为部署正式环境），同一天下一个会话又推成功了。被拒时不要重试，把 `git -C C:/myfnbguide push origin claude/myfnb-handoff:main` 交给用户在终端运行。**推了不等于上线**：GitHub 检查不过，服务器不部署，所以推完要看 `/api/site/stats` 的信源数（10/2 `39fa82f` 就是检查失败、没有部署，§6） |
| 同步上游 | 定期 `git fetch upstream`，审阅后合并，不自动跟；合并后跑四项检查 |
| 写摘要模型 | DeepSeek 官方 API（`LLM_BASE_URL=https://api.deepseek.com/v1`、`LLM_MODEL=deepseek-flash`，思考关闭） |
| 向量模型 | Google Gemini `gemini-embedding-001` 免费层，1536 维，走通用 OpenAI 兼容路径 `EMBEDDING_*`（阿里云不收预付卡和虚拟卡） |
| 服务器 | 腾讯云**国际版** Lighthouse **新加坡**，**锐驰型 2 核 4GB 60GB**，Ubuntu 24.04，按月付、关自动续费（官方写明流量不限、不另收费） |
| 备份 | 腾讯云 COS 新加坡（`backup.ts` 默认端点） |
| 域名 | 试跑用 `new.myfnbguide.com`；上线切换时 `www.myfnbguide.com` 指过来（§10） |
| 更新方式 | 服务器每 5 分钟检查 fork 的 `main`，GitHub 上检查全部通过的提交才自动部署（`myfnb/update.sh`）。部署按作者的更新顺序（`docs/deploy.md`「更新」，10/2 起）：备份数据库到 `/var/backups/myfnb-before-deploy.sql.gz` → 构建 → 停 api、worker、web → 迁移 → 启动；迁移失败就退回上一版代码重新启动，并记下这个提交不再重试（`/var/lib/myfnb-update.failed`），等下一个提交。改 `update.sh` 本身时先单独推它，服务器换上新脚本后再推别的（脚本在拉取后的下一次运行才生效） |
| 访客统计 | 不做追踪；上线时加一个不认人的计数（§2.4），隐私说明同步改 |
| 检查点 | 上线 3 个月看读者数（计数、Search Console、频道关注数），决定继续还是停 |

---

## 5. 现状（快照：2026-10-02；线上 `6dde3f1`）

### 5.1 站点与模块

- `industry/site.ts`：站名 `MyF&B`，行业词 `餐饮`，标题、介绍、标语见 §2.1；关于页大标题「全球餐饮每天都有新消息，／值得看的，只有几条。」，四个环节的说明已改成全球来源与经营者标准。`locale: "zh-MY"`（运营主体在马来西亚，对读者没有影响）；`mcpPrefix: "myfnb"`（上线后不改）；联系邮箱 `myfb.guide.my@gmail.com`；`crawlerName: "MyFnBBot"`；页脚「由 AIHOT 开源框架驱动」。另有 `subjectAfter()` 辅助函数（§5.5）。
- `features.ts`：`leaderboard: false`、`codexResetMonitor: false`。
- `brand/`：罗盘圆环图标，2026-10-01 改成网站强调色 `#176b75`（用户看过「&」等方案后决定保留罗盘，只换颜色）；报头「餐饮日报／周报／月报」。没有用 AIHOT 的名字和 Logo。网站配色本身是作者的，不改。
- `changelog.json`：首条「MyF&B 改版上线」，日期 2026-10-01，内容已改成全球定位与六节。
- `pages/terms.md`、`privacy.md`：运营主体 CORE SYSTEM STUDIO（马来西亚），生效日期 2026-10-01，马来西亚法律，PDPA（含 2024 修订）。使用条款的范围已改成全球，收录规则按 §5.4 的六条写（只拒绝 AI 训练的来源可以收录，因为本站不训练模型）。隐私说明写着「不做访客统计」，上线加计数时要改。**上线日期变了，要同时改 changelog.json 和这两个文件的日期。**

### 5.2 分类、标签、主题（`taxonomy.ts`、`topics.json`）

日报分节按内容类型，不按国家，顺序就是日报里的顺序：

| key | 标签 | 日报节 | 归什么 |
|---|---|---|---|
| `tip` | 实战 | 经营实战 | 能照着做的方法、真实店铺或品牌的复盘和失败教训 |
| `tools` | 科技 | 设备与科技 | 设备、自动化与机器人、AI 与系统、外卖与支付平台的功能和佣金 |
| `market` | 数据 | 数据与趋势 | 市场与消费数据、品类报告、成本价格、缺工与工资水平 |
| `industry` | 动向 | 行业动向 | 品牌与企业的动作、新品与促销；兜底的一类 |
| `policy` | 政策 | 政策与合规 | 会改变成本或义务的规定与执法，任何国家 |
| `opinion` | 观点 | 观点与访谈 | 创始人与业内人士的观点、访谈、创业故事 |

- 方案里这一节原叫「用工与政策」，落地时改叫「政策与合规」：这一节实际收的是各国规定，讲人手的内容散在实战、科技、数据几节，另设主题页「人与用工」收齐。
- 硬约束：`tip`、`opinion` 两个 key 被核心代码写死，`industry` 是兜底节；key 会出现在网址里，上线后不改。
- 内容类型与五轴权重沿用作者规则（每行和为 10），类型的定义已改成全球餐饮：

  | 类型 | sig | nov | cred | reson | act |
  |---|---:|---:|---:|---:|---:|
  | policy_change | 3 | 1 | 2 | 2 | 2 |
  | platform_update | 2 | 2 | 1 | 2 | 3 |
  | tool_launch | 1 | 2 | 1 | 2 | 4 |
  | market_data | 2 | 2 | 2 | 3 | 1 |
  | industry_event | 3 | 1 | 2 | 4 | 0 |
  | practice_howto | 1 | 1 | 1 | 3 | 4 |
  | opinion_analysis | 1 | 3 | 1 | 4 | 1 |

- 标签：8 个分类标签；53 个主题标签（经营主题 24、业态 9、地区 20）；30 个实体标签（全球主要连锁品牌与外卖平台）。身份词典覆盖中、英、日、韩文写法。`content-understanding.md` 里的标签词表与 `taxonomy.ts` 逐字一致。
- 主题页 72 个：经营主题 20、品类与地区 22、品牌与平台 30。

### 5.3 挑选与写作（`prompts/`）

保留作者结构（内容类型、五轴加权、噪声压制、安全边界、事件口径校正），换的是读者和「什么算重要、什么算噪声」：

- **评分**：读者是全球看中文的餐饮经营者；必看的几类可以很高；大连锁和平台的重要动作、新品与促销、融资业绩按「可看」中等评价（新品促销不再是头号噪声）；只在一个国家适用的规定 `sig`、`reson` 都不超过 5；人事任命、颁奖与活动、资本运作本身、宏观金融数字、远方单店动态压住。
- **预筛**：放行跟餐饮经营有关的一切；**直接挡掉**只是宣布职位的人事任命、颁奖与榜单评选、活动展会的预告与回顾和展商宣传、公益，以及只给食客看的内容；去掉了原来对马来西亚一般政策的特别放行。仍然直接挡掉两类高风险内容：族群、宗教、王室的争议与抵制呼吁；点名个人或小商家的指控、罪案、事故个案。
- **写作**：全球通用的餐饮用语与专有名词规则，金额照原文币种；去掉马来西亚专用的写法；保留族群、宗教、王室只写事实，指控写成「某方指控」，普通个人不写全名（运营主体在马来西亚）。
- **门槛** `selection.ts` 仍是作者的 T1 60 / T1_5 65 / T2 76，**等用户的标注校准后再改**（作者规则：先改挑选标准，最后才动门槛）。所以在校准之前，日报会偏少。

### 5.4 信源（快照 2026-10-02：601 个；全部只放摘要和原文链接）

清单以 `industry/sources.json` 为准；每个看过的候选（接或不接、为什么）在 `myfnb/sources-ledger.tsv`，一行一个，按批次记，下次不用重查。每天条数是试抓时的实测（快照，过滤后）。

| 批次 | 看过 | 接入 | 每天约 | 内容 |
|---|---:|---:|---:|---|
| 第一批（10/1） | 约 300 | 18 | 43 | 中、日、韩、英、美、澳、中东、意大利、加拿大的餐饮与品类媒体、协会（明细见 `plan-2026-10-01.md` §4.4 与 git 历史）；红餐网专栏、资讯和餐饮界占必看的一半以上 |
| 10/2 · 一 | 235 | 33 | 60 | 各国餐饮与品类媒体、协会、平台与服务商、美国上市连锁的投资者关系页 |
| 10/2 · 二 | 130 | 0 | 0 | 各国综合商业媒体的餐饮栏目：多数没有餐饮栏目订阅，找到的两个条款禁止自动访问 |
| 10/2 · 三 | 93 | 61 | 22 | PR TIMES 上日本外食企业、团餐、外卖订位平台、收银系统、设备商各自的新闻稿订阅 |
| 10/2 · 四 | 95 | 64 | 13 | 餐饮经营类播客（美、英、澳、法、德、意、荷、西、墨、日、韩、台）：经营者访谈与做法，进「观点与访谈」 |
| 10/2 · 五 | 1,934 | 222 | 40 | PR TIMES 上的日本餐饮企业与专做餐饮生意的服务商（用约 140 个餐饮关键词搜出的企业，逐家看名称和最近 10 条标题） |
| 10/2 · 六 | 79 | 8 | 17 | 各国餐饮与品类媒体（意大利、西班牙、瑞典、罗马尼亚、澳洲咖啡、德国烘焙）、澳洲餐饮协会、GlobeNewswire 餐饮栏 |
| 10/2 · 七 | 90 | 4 | 0.1 | 品牌新闻室（AmRest、Golden Gate、Jollibee、Wetherspoon）；其余没有订阅、对机器 403 或条款不许 |
| 10/2 · 八 | 412 | 12 | 0.3 | 德国 presseportal 上的餐饮企业与协会新闻稿（订阅 `https://www.presseportal.de/rss/pm_<编号>.rss2`；网站许可编辑使用） |
| 10/2 · 九 | 2,296 | 96 | 3.5 | PR TIMES 第二轮（换一批关键词） |
| 10/2 · 十 | 250 | 36 | 3.2 | 播客第二轮（更多国家和关键词）；提交后全量复查又撤下 2 个 robots 读不到的 |
| 10/2 · 十一 | 1,901 | 47 | 0.3 | PR TIMES 第三轮 |
| 10/2 · 十二 | 4 | 4 | — | 红餐网快讯、红厨、知识树（网页列表；试抓工具不读详情页日期，条数测不出）、韩国식품음료신문趋势栏 |
| 10/2 · 十三 | 17 | 0 | 0 | 上一批深挖出的订阅：10 个条款不许（William Reed 的 Morning Advertiser 与 Restaurant Online、CODE、Bake Magazine、Restauración Colectiva、Restaurant365、两个州协会等），2 个 robots，5 个停更、不讲餐饮或全是人事任命 |
| 10/2 · 十四 | 8 | 1 | 25 | 没有订阅的网站：식품저널有订阅，接入；ET HospitalityWorld、美国餐馆协会、Hostelería de España 条款不许，창업경영신문 robots 全站禁止，sidae.com 已是综合新闻社，Foodizz 是卖课网站 |

快照 2026-10-02（`f6263ab`，601 个全量试抓，每天条数 = 过去 7 天的平均，过滤后）：PR TIMES 企业 426 个合计每天约 63 条；播客 100 个约 12 条；欧美新闻稿平台 13 个约 2 条；媒体、协会和其他 62 个约 99 条；**合计约 177 条**（红餐网各栏是网页列表，没算进去，线上实际每天多几十条）。**259 个信源过去 7 天一条都没有。**分级：协会 T1；品牌新闻稿与平台、服务商 T1_5（新品促销多，校准前门槛不放低）；媒体与播客 T2。**所有信源都要打开 `_aihot.initialBackfillOnly`**，首次回补 2–3 条：框架默认在首次导入之后把订阅里剩下的旧条目全部补进来、逐条走模型（作者的测试就是这么写的），PR TIMES 企业订阅一家约 200 条、播客几百集，第二次采集会把整个存档送进模型。打开后只收加入时间往前 48 小时以内发布的条目（10/2 加的配置，§5.5）。

**入口的终点（定案 2026-10-02，用户同意）：每天进来的内容里有 10 条以上必看，而且必看不长期过半来自同一个地区。**到了就停止加来源，转去标注。来源个数、总条数都只是量具，不是目标。理由：日报每天 10–20 条、必看全收（§2.3），所以入口要每天供得上约 10 条必看；「全球」是「不分国家，只问对任何地方的经营者有没有用」（§2.2、`plan-2026-10-01.md` §3.3），不按国家配额。**衡量一个来源只看它每天出几条必看**（`plan-2026-10-01.md` §4.3：取近两周标题按 §2.2 判三档，乘每天条数）。

**为什么改（10/2 的教训，接手的人必读）**：10/2 先后把「约 1000 个来源」「每天约 500 条」当成目标去追，结果往最容易加的地方加——PR TIMES 一个平台就加了 426 家日本企业，601 个来源里 432 个是日本（72%），关于页的信源列表一大半是日本企业新闻稿，而这些新闻稿多是新品促销，最多算可看。用户的批评：「我不是说要全球的吗！？」「讨论了那么多次，你还在犯这种错误」。错在把数字当目标、按「好不好加」选来源，而不是按「能不能给日报多几条必看」。用户说的「约 1000 个」，本意是像 AIHOT 一样宽、全世界重要的事不漏，个数是做到以后自然的结果。以下两段是当时的记录，留作快照。

10/2 上午的判据（已作废）：从「抽样后值得接」放宽为「确实在讲餐饮经营就接」，理由是作者宽进严选（每天 6,098 条只选约 0.5%）。

10/2 三批的实测产出（快照）：候选到接入约 21%（458 → 94）。掉在哪里：没有订阅源或对机器返回 403（约一半；美国上市连锁的投资者关系页几乎全部 403）；停更、垃圾内容、不是写给餐厅的（酒店旅游、包装食品、零售）；条款禁止自动访问或只许个人使用（大型媒体集团普遍如此：Informa、Franchise Times、Inc42、Mash Media、Edra、Wiadomości Handlowe 等）。
**个数已经不是入口宽窄的好指标（10/2 全量试抓的结论，Claude 据此改了下一步的目标）**：从 394 个加到 601 个，每天只多了约 7 条（第七到十二批合计）。每天的条数几乎都来自媒体：第一批 30 个媒体协会每天 56 条、第六批 8 个媒体 17 条，而 PR TIMES 后两轮 143 家合计不到 4 条。照这个边际，再加 400 个长尾企业或播客凑到 1000 个，每天多不到 20 条，挑选的余地不变。所以当时把目标改成「每天约 500 条」（已作废：总条数同样不说明里面有几条必看，见上面「入口的终点」）。

**这一轮暴露的真问题不在入口（2026-10-02 部署前 `/api/site/stats`：累计收进 407 条，入选 1 条，日报 0 期）**：门槛还是作者 AI 站的（T2 76），评分标准也没用用户的标注校准过，所以几乎什么都选不出来，入口再宽日报也是空的。§9 第 6、7 步（标注与校准）不能等入口全部加完才做。

**入口太窄（2026-10-01 用户问：「作者有 800 多个，我们 20 个，信息够吗？」）**：不够。作者 853 个信源里 513 个是 X 账号（AI 业的一手消息在 X 上），每天收进约 6,098 条、只精选 32 条（约 0.5%），所以挑得狠；我们当时每天收进约 43 条，日报目标 10–20 条，等于每三四条就要登一条，挑不起来；必看又集中在一家（红餐网），地区偏中国和美国，同一件事很少有几家同时报道，热点榜也排不出来。信源个数本身不是目标，要的是每天够多的相关候选。餐饮业对应 X 的地方是抖音、小红书、公众号，这些接不到（见下），所以要靠更多能接的网站把入口加宽。

**加新来源的做法（10/2 起，工具都在仓库或下面写明）**：

1. 找订阅：给候选网站找 RSS（页面里的 `<link rel=alternate>`，再试 `/feed/`、`/rss`、`/rss.xml` 等常见路径）。日本企业用 PR TIMES 的企业订阅 `https://prtimes.jp/companyrdf.php?company_id=<编号>`，编号从 PR TIMES 搜索页按企业名取（要核对企业名，10/2 搜「日本マクドナルド」得到的是麦当劳之家慈善基金会）。
2. 规则 1、2、5 和 TDMRep：`node myfnb/check-sources.mjs <候选.json>`（文件格式与 `sources.json` 相同）。**等它跑完再读结果**（10/2 有一次只等了 2 秒就读，漏掉两个 robots 读不到的播客，提交后全量复查才发现）；提交前对整份 `sources.json` 全量跑一遍。偶发的「robots.txt unreadable (no answer)」先隔几分钟重跑（红餐网 10/2 就是网络抖动，重跑通过），连续两次才算规则 5。
3. 试抓与相关性：`node myfnb/vet-sources.ts <候选.json> --titles 10`，用框架自己的采集代码抓，按来源自己的过滤算每天几条、列最新标题；混杂的订阅先统计栏目名，再用 `allowCategories` / `denyCategories` 只收餐饮栏。
4. 规则 3：找到条款页，**全文**按禁止类关键词抽句子（scrape、crawl、robot、spider、automated、data mining、text and data、machine learning、personal non-commercial、internal use，以及各语言的对应词）逐句读。10/2 第一次只看前 12 句，漏掉了 5 个禁止抓取的，重查后撤下；所以必须全文。没有条款页的不算违规。
5. 规则 6：部署后约 30 分钟（新来源都抓过一轮），用户在服务器上跑下面这一条：最近一次返回 403、405 的直接暂停（列在 `paused` 下），其余不正常的列出来给 Claude 判（429 限流、500 这类临时错误先不动；连续几次读不到订阅文件的也暂停），最后数各状态的个数（10/2 起合成一条，原来要用户跑两趟；在 WSL 测试库上验证过只停 403/405）。暂停的再从 `sources.json` 删掉、记进账本：

   ```bash
   cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -c "WITH last AS (SELECT DISTINCT ON (source_id) source_id, error FROM fetch_runs ORDER BY source_id, started_at DESC) UPDATE sources s SET enabled = false, health = 'paused', updated_at = now() FROM last WHERE last.source_id = s.id AND s.enabled AND s.health <> 'ok' AND last.error ~ '^HTTP 40[35]' RETURNING s.id AS paused, left(last.error, 60) AS error;" -c "SELECT s.id, s.health, s.fail_count, left(r.error, 80) AS error FROM sources s LEFT JOIN LATERAL (SELECT error FROM fetch_runs WHERE source_id = s.id ORDER BY started_at DESC LIMIT 1) r ON true WHERE s.enabled AND s.health NOT IN ('ok', 'unknown') ORDER BY s.id;" -c "SELECT health, count(*) FROM sources WHERE enabled GROUP BY health ORDER BY health;"; cd ~
   ```

6. 结果写进 `sources-ledger.tsv`（接入的也写，过滤规则写在「原因」一栏）。

通用脚本在 `myfnb/sourcing/`（10/2 起）：`discover.mjs` 给候选网站找订阅（页面里的 `<link rel=alternate>` 和常见路径），`discover2.mjs` 第二遍深挖（顺着首页的新闻、博客、新闻稿链接进栏目页，试 WordPress 子目录、Squarespace `?format=rss`、Wix `blog-feed.xml`、HubSpot/Drupal `rss.xml`，顺带报有没有 WordPress 接口可做 `json_list`），`terms-scan.mjs` 找条款页并全文抽出禁止类句子（规则 3），`ledger.mjs` 把一批的结果追加进 `sources-ledger.tsv`。

批量找来源的三种办法（10/2 用过，这三个脚本没有进仓库，按这里的说明重写即可；边际产出见上面「个数已经不是入口宽窄的好指标」，PR TIMES 和播客的长尾已经挖到每天加不了几条）：

- **PR TIMES 企业**：对搜索页 `https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word=<词>` 逐个关键词请求（页面直接带企业链接 `company_id/<编号>">企业名`，每个词约 30 家），汇总企业，再读每家的订阅最近 10 条标题。先用规则排序（标题里店铺、出店、号店、菜单、来店这类词的次数；公司名像餐饮企业加分；不动产、金融、酒店、零售、食品与饮料厂扣分），再逐家人工判。不收：酒店、商场、百货、便利店、食品厂、联名主题咖啡（给粉丝的活动）、健身美容回收等。社交平台抽奖类标题只占 0.6%，不值得加过滤。
- **德国 presseportal**：对搜索页 `https://www.presseportal.de/suche/?q=<词>` 逐个德语餐饮词请求，汇总页面里的新闻室链接 `/nr/<编号>`，再读每家的订阅（`/rss/pm_<编号>.rss2`）最近标题逐家判。412 家里只接 12 家，多数是食品厂、零售和酒店。
- **播客**：Apple 播客目录的公开搜索接口 `https://itunes.apple.com/search?media=podcast&entity=podcast&country=<国>&term=<词>`（每分钟约 20 次）给出节目的订阅地址；只收半年内还在更新的、讲餐饮经营的；出版商条款不许的（Restaurant Business、NRN、Informa、World Coffee Portal、Rolling Pin）不收。播客订阅本来就是给聚合用的，规则 3 只看节目方另有声明的。

**接信源的六条规则**（写进了 `sources.json` 的 `$comment`、使用条款和 `check-sources.mjs`）：

1. robots.txt 不许抓我们要用的路径 → 不接。
2. **拒绝 AI 阅读的不接**：Content-Signal 写 `ai-input=no`，或 robots.txt 拒绝代用户读网页的 AI（ChatGPT-User、Claude-User、Perplexity-User、OAI-SearchBot 等）。**只拒绝 AI 训练的照接**（GPTBot、CCBot、ClaudeBot 等，或 `ai-train=no`）：我们不训练模型，做的是读了以后写摘要、附链接，跟搜索引擎和 AI 助手代用户读网页是同一类用途。2026-10-01 用户交给 Claude 定的解读（9/30 的版本是点名拒绝任何 AI 爬虫就不接）。
3. 使用条款禁止爬虫、自动抓取、文本与数据挖掘或 AI 使用 → 不接；只许个人使用其 RSS 或内容的 → 不接。网站用 TDMRep 机器可读地保留文本与数据挖掘（`/.well-known/tdmrep.json`、robots.txt 里的 `TDM-policy` 文件、或订阅响应头 `tdm-reservation: 1`）也按这一条不接（10/2 加，`check-sources.mjs` 自动查；10/2 查出奥地利 OTS.at）。
4. 只有通用的「不得转载、复制、摘抄」条款 → 可以接：本站不转载，只写自己的简短摘要（80–160 字）并链接原文（版权法第 13(2)(a) 条，§12）。条款只限制「商业用途」的，上线初期本站完全非商业，可以接；开始赞助前逐个重读（§5.6）。
5. robots.txt 读不到（403、超时）→ 无法确认，不接。
6. 部署后服务器 IP 被来源挡住（返回 403）→ 在后台暂停。**不用代理绕过**：对方挡数据中心 IP 就是不欢迎机器抓取。

规则 1、2、5 和 TDMRep 由 `check-sources.mjs` 自动查（用框架自己的抓取身份；有的网站按访问者返回不同的 robots.txt）；规则 3、4 人工读条款，**只对抽样后值得接的来源读**。每月跑一次复查，加新信源前对候选跑。

10/1 读条款或 robots 后不接的主要来源（全集里有完整状态）：

| 来源 | 原因 |
|---|---|
| Nation's Restaurant News | 条款（Informa）：除浏览所需外，不得以任何目的使用网站内容 |
| Restaurant Dive | 条款（Informa TechTarget）：禁止用数据挖掘、机器人等手段收集或提取 |
| Fast Casual（及同出版商的 Pizza Marketplace） | 条款：受保护内容只许个人使用（Pizza Marketplace 同属 Networld，条款未单独读，未接） |
| MCA Insight | robots.txt `Disallow: /*.rss`（规则 1）；网页列表的路径允许，以后需要可改用网页列表 |
| Restaurant Business、The Caterer、World Coffee Portal、World Tea News | 条款禁止抓取或文本与数据挖掘，或只许个人使用（9/30 查） |
| Modern Restaurant Management 等 25 个 | 拒绝 AI 阅读（规则 2） |
| QSR Magazine、BigHospitality、Restaurant Online、Morning Advertiser | 抽样价值低：多为人事、颁奖、单店开张（BigHospitality 与 Restaurant Online 是同一个订阅） |
| Food Bev、Just Food、Bakery and Snacks 等 11 个 | 不是写给餐厅的（包装食品、饮料、酒店、旅游、时尚，还有一家其实是林业报）；Hotel F&B 网站已被赌博广告占据 |
| PMQ Pizza Magazine、Global Coffee Report | 对正式服务器返回 403（规则 6，10/1 测）；已暂停 |
| 飲食店ドットコム、Caterer Middle East | 对正式服务器返回 403、405（规则 5、6，10/1 测） |
| 餐饮老板内参、职业餐饮网、咖门、筷玩思维、餐宝典、窄门餐眼、中国烹饪协会、中国连锁经营协会 | 本机和正式服务器都连不上（10/1 测）：多半只对中国大陆开放，规则 6 不用代理绕。中文实战内容因此只剩红餐网、餐饮界两家能接，其余在公众号里 |
| 马来西亚的华文报纸（星洲、南洋、东方、光华、诗华、中国报、光明） | 挡云服务器（规则 6，10/1 实测） |

**2026-10-01 停用**的马来西亚来源（全球定位下跟餐饮经营相关的只有 0–20%，而且都是本地事）：财政部、LHDN、Malay Mail · Money、The Malaysian Reserve、Utusan · Ekonomi、Vulcan Post、Grab Malaysia 新闻稿；以及早先已暂停的星洲 · 餐饮业、南洋 · 餐饮业、东方日报 · 财经。服务器上的删除命令见 §9 第 3 项。

**接不到的**（`plan-2026-10-01.md` §4.5）：抖音只在创作者授权后才能读内容；视频号、小红书没查到合规的读取方式；微信公众号只能经第三方付费接口（作者用的「极致了」查一次文章列表 ¥0.14、取一篇正文 ¥0.03，框架对付费信源至少每 2–3 小时查一次，20 个号每月约 ¥700–1,000），而且不是微信授权的方式；X 官方接口每读 1,000 条 5 美元，框架内置的第三方接口不是 X 授权的方式。**10/1 定：公众号和 X 暂不接**；中文实战内容的缺口先用能接的中文来源补。有收入后、或用户确定某几个号非看不可时，公众号先试 3–5 个。

**云服务器 IP 会被一部分来源挡住，而且各家云不一样**（10/1 在腾讯云新加坡上，马来西亚华文报纸全挡，食品産業新聞社 403）。补来源时候选必须在服务器上测：清单 `myfnb/candidates-reach-2026-10-01.txt`，命令见 §9 第 4 项；规则复查用 `sudo docker run --rm -v /tmp/cand.json:/cand.json aihot-app node myfnb/check-sources.mjs /cand.json`。

### 5.5 改了 `industry/` 以外的文件

合并上游时只有这几处可能冲突；作者接受对应 PR 后冲突就消失。

| 文件 | 改了什么 | 对应 PR |
|---|---|---|
| `apps/web/app/features/report/format.ts`、`ReportPaper.tsx`、`routes/report-latest.tsx`、`routes/hot.tsx`、`routes/topics.tsx`、`routes/feedback.tsx`，`industry/site.ts` 的 `subjectAfter()`，`industry/package.json` 导出 `topics.json` | 页面写死的「AI 日报」「AI 圈」「按主题看 AI」等改从 `industry/` 读 | PR 1 |
| `scripts/smoke.ts` | 认得出转义后的站名 `MyF&amp;B` | PR 2 |
| `.github/workflows/check.yml` | CI 按 `sources.json` 条数比对信源数 | PR 3 |
| `packages/backend/src/sources/collect.ts`、`sources/config-keys.ts`、`tests/core-collection-tail.test.ts` | 可选配置 `_aihot.initialBackfillOnly`：首次导入之后只收加入时间往前 48 小时以内发布的条目，长订阅（企业新闻室、播客存档）不会在第二次采集时把整个存档送进模型；默认不变（2026-10-02） | 可提 PR（§7.2 第 9 项） |
| `tests/core-processing-recovery.test.ts`、`tests/core-source-promotion.test.ts`（上游 `8d5a39b` 新加） | 按「宽召回」认预筛提示词（原来认「宽召回的AI相关性预筛」，换了行业就认不出）；分类、内容类型、标签的示例换成餐饮行业（2026-10-02） | §7.2 第 3 项，可提 PR |

10/2 合并上游 `8d5a39b` 后：报头 `MOTTO` 和补发空刊两处已与作者的写法一致，`compose.ts` 取作者的版本，我们测旧行为的 `tests/report-catchup.test.ts` 删掉（作者的 `reports-oss-recovery` 测试覆盖新行为：没有精选的日报不写入、失败留在运行记录里）。`myfnb/` 下的文件是我们自己的，不算改核心。

### 5.6 风险处理（按最低风险定案）

用户没有可请的专业人士，要求「直接把风险降到最低」。逐项处理如下，每项都读代码或实测确认过：

| 风险 | 处理 |
|---|---|
| 转载别人的内容（版权） | 全部来源关闭全文。读者只看到我们自己写的中文标题、80–160 字摘要、来源名和原文链接。「给不给全文」在 `publication/rules.ts` 定义一处，网页、RSS、接口、MCP 共用；文章配图只在全文模式出现；分享图用我们自己的文字生成 |
| 来源不许抓取或不许 AI 使用 | §5.4 的六条规则；每月用 `check-sources.mjs` 复查 |
| 商业用途 | 多数媒体条款限制商业使用。**上线初期完全非商业**：不接赞助、不放广告、不卖东西（使用条款已写明）。开始赞助前，先重读每个来源条款里的商业限制，有限制的停用，再把使用条款升到 1.1 加赞助条款 |
| AI 写错造成诽谤或误导 | 预筛直接挡掉点名个人或小商家的指控、罪案、事故个案；写作规则要求指控写成「某方指控」、普通个人不写全名；使用条款写明内容由 AI 自动生成、未经人工逐条审核、以原文为准；每条都有原文链接 |
| 族群、宗教、王室话题 | 争议与抵制呼吁在预筛一步直接挡掉；主管机构的正式规定照收，只写事实（运营主体在马来西亚） |
| 给建议害人 | 只报道不建议（§2.3）；推荐理由只说为什么值得关注；条款写明不构成专业意见；不做计算器（§3） |
| 个人资料（PDPA） | 不需要注册、不需要委任资料保护官（§12）；不做访客追踪；反馈只保存处理反馈所需的内容，不交给模型；摘要不写普通个人全名和身份资料；隐私说明按 PDPA 2024 修订写了外泄通报 |
| 来源方投诉 | 条款承诺一般三个工作日内处理。要求停止收录的，用作者自带的 `scripts/delete-sources.ts`（先撤下已入选的内容，再删除来源和它的全部文章） |
| 把内容交给模型服务商 | 只把公开发布、不拒绝 AI 阅读的来源内容交给 DeepSeek 和 Gemini；不交读者资料 |
| 服务器被入侵 | 只开 22/80/443；网页只绑本机、由 Caddy 转发；数据库和接口不对外；`.env` 权限 600、不进 git；自动安全更新已开；自动部署只认 GitHub 上检查通过的提交，所以 **GitHub 账号必须开两步验证**（已开，§8） |
| 出了问题没人知道 | 框架的告警只发飞书，我们没开，只记在服务器日志和后台。对策：DeepSeek 余额提醒邮件已开（§8）；每次新对话先看后台「运行」和「信源」页 |
| 花费失控 | DeepSeek 预付费，余额用完即停；Gemini 免费层不绑卡；后台「设置 → 预算」设每日上限（`llm` 每天 3,000 次）；服务器选锐驰型，流量不另收费 |

降不下去、只能知道的风险：通用「不得转载」条款与「自写摘要 + 链接」的界线最终要看法院，我们的做法与主流新闻聚合相同，并有版权法第 13(2)(a) 条可依；AI 仍可能写错，靠原文链接、条款声明和及时更正兜底；收到律师函或正式投诉时，先撤下相关内容、停用来源，再回复。

---

## 6. 检查结果（快照）

四项检查以 Linux 为准（WSL Ubuntu 24.04、Node 24.14、conda-forge PostgreSQL 17.11，新建空库；与作者 CI 和正式服务器同一系统）：

| 提交 | typecheck | 后端测试 | 网站构建与测试 | 冒烟（采集与模型调用关闭） |
|---|---|---|---|---|
| `ec682dd`（9/30，马来西亚定位的最后一版） | 通过 | 158/158 | 通过，16/16 | 全部通过 |
| `bd63a3d`（10/1，全球定位改写 + 补发空刊修复） | 通过 | 184/184（含新加的 `report-catchup`） | 通过，16/16 | 全部通过；逐页抓 15 个页面没有残留「AI 日报」「AI 圈」等字样；72 个主题导入 |
| `3703010`（10/2，合并上游 `8d5a39b` + 第一批新信源） | 通过 | 435/435 | 通过，31/31 | 全部通过；15 个页面无残留；72 个主题导入。`e28a6e1` 只改 `sources.json`，由 GitHub 检查通过 |
| `6dde3f1`（10/2，601 个信源 + `initialBackfillOnly` + TDMRep） | 通过 | 436/436 | 通过，31/31 | 全部通过；601 个信源全部导入；15 个页面无残留 |

**本机检查要导入全部信源**（10/2 起）：`39fa82f` 在本机四项全过，GitHub 的 docker 检查却在导入信源时失败——3 个 PR TIMES 企业名里夹着 NUL 字符（从 PR TIMES 搜索页抓名字时带进来的），数据库拒收；本机原来只跑 `seed.ts --topics-only`，没导入过信源。WSL 的 `~/checks.sh` 已改成完整 `node scripts/seed.ts`，`6dde3f1` 去掉了这些字符（`sources.json` 3 处、账本 46 行）。

**正式部署**（2026-10-01，腾讯云新加坡 `43.160.228.180`，`main` = `fe8e2a7`）：一行命令部署一次跑完；`LLM_EXTRA_JSON={"thinking":{"type":"disabled"}}`（思考关闭）；Lighthouse 默认防火墙没有 443，手动加后 HTTPS 才通；Caddy 申请到 Let's Encrypt 证书（到 2026-12-29，自动续期）；从外网跑冒烟检查 23 项全部通过；推 `34577e3` 后服务器 05:54 自动拉取、重建，日志 `已部署 34577e3`（连续推两次时，旧提交的检查会被取消，服务器只部署最新那个）。第一次导入每个信源回补 8 条，约 110 条，约 20 分钟用了 `llm` 442 次、向量 46 次；回补的条目不进日报（框架规则），所以开站当天的日报必然为空。

**10/2 部署**：先推 `12e5d11`（只改 `update.sh`），GitHub 检查 1 分半通过，服务器拉取后换上新的部署顺序；再推 `e28a6e1`（合并上游 + 94 个新信源），检查 2 分 22 秒通过，约 1 分钟后网站显示 112 个信源，期间每 20 秒探一次健康检查都是 200；从外网跑冒烟检查全部通过。12:46 推的 `39fa82f` 检查失败（见上），没有部署；修好后 13:00 推 `6dde3f1`，检查 2 分 22 秒通过，13:07 网站显示 605 个信源（601 + 早先被挡、还没在服务器上暂停的 4 个），外网冒烟全部通过。随后用户跑了 `cleanup-2026-10-02.sql`：撤下 10,586 条积压的旧条目、删掉 484 个排队中的分析任务，暂停那 4 个来源。

Windows 上：类型检查和网站构建通过；作者原版的网页服务器在 Windows 起不来（PR 4 修）；关机信号类后端测试在 Windows 上跑不了，与我们的改动无关。

---

## 7. 给作者的贡献

用户要求：「一定要 PR 给作者，我们用他的开源，要做贡献。」按作者 `CONTRIBUTING.md`：一次 PR 只解决一个问题，从最新 `main` 建分支，写明验证结果；大方向先在 Issue 或讨论区说。PR 模板三节：解决什么问题 / 如何验证 / 兼容与使用影响。

### 7.1 已提交的 PR（2026-09-30）

| # | 分支 | 解决什么 |
|---|---|---|
| [#33](https://github.com/KKKKhazix/AIHOT/pull/33) | `pr/web-subject-wording` | 报告页、热点榜、主题页、反馈框写死的「AI」改从 `industry/` 读 |
| [#34](https://github.com/KKKKhazix/AIHOT/pull/34) | `pr/smoke-escaped-name` | 冒烟检查认得出 HTML 转义后的站名 |
| [#35](https://github.com/KKKKhazix/AIHOT/pull/35) | `pr/ci-source-count` | CI 的 docker 检查按 `sources.json` 条数比对信源数 |
| [#36](https://github.com/KKKKhazix/AIHOT/pull/36) | `pr/windows-web-server` | Windows 上网站能起来 |

作者要求修改时，在对应的 `pr/*` 分支上改、先 `git rebase upstream/main` 再推；作者合并后，下次同步上游时我们 fork 里的同样改动会自然对齐。

### 7.2 发现的上游问题

1. `sources/web-list.ts` 的日期解析不认马来文、印尼文月份（我们已不用马来文来源，只作记录）。
2. 读者看得到的文案写死「北京时间」（我们是中文读者，不需要改，只作记录）。
3. 测试靠「宽召回的AI相关性预筛」这几个字认出预筛提示词，换了行业就认不出；只认「宽召回」即可（作者的 `default-model` 测试就是这样写的）。10/2 合并 `8d5a39b` 后又多了两个这样的测试（`core-processing-recovery`、`core-source-promotion`），我们 fork 里四个都改了。**可以提 PR**：只改认提示词的那一句，跟行业无关；示例分类和标签的替换是我们行业自己的事，不放进 PR。
4. 框架不解析 PDF。
5. 采集不读 robots.txt；我们用 `check-sources.mjs` 每月人工复查。
6. `tests/selection-eval-runtime.test.ts:101` 连按秒取整的 `wallSeconds` 也比，跨秒时偶尔失败（10/1 CI 遇到一次，重跑即过）。
7. **补发会给新站补出空刊**：`catchUpReports` 在没有任何日报时补最近 7 天，周报月报也补，内容为空也写进去。我们已修（§5.5）。10/1 用户同意提 PR，但作者当天的 `8d5a39b` 已经改掉了（没有刊时只补最近一期；没有精选的日报不写入），**不再提**。
8. **日报报头写死「人工智能」**（`format.ts` 的 `MOTTO`）。我们已修（§5.5）；作者的 `8d5a39b` 也改成按行业词显示，写法与我们的相同，**不再提**。
9. **长订阅在第二次采集时把整个存档送进模型**：首次导入只取 `initialBackfillLimit` 条，之后的普通采集把订阅里剩下的旧条目全部补进来（作为历史，不进今天，但照样预筛、评分、写摘要）。作者的信源订阅短，代价小；企业新闻室、播客一订阅就是几百条。我们加了可选的 `initialBackfillOnly`（§5.5），默认不变、作者的测试不动。**可以提 PR**，说明里写清动机和数字（10/2：PR TIMES 61 家约 1.2 万条旧新闻稿）。

### 7.3 多语言

2026-09-30 在作者的「想法交流」区开过讨论 [#37](https://github.com/KKKKhazix/AIHOT/discussions/37)（同一站点输出多种语言，以马来西亚三语为例）。2026-10-01 读者定为看中文的人，**我们不再需要多语言**；讨论帖没有回复，经用户同意，当天补了一句说明并关闭（原因选「过时」）。

---

## 8. 用户账号进度（快照：2026-10-01）

| 项目 | 状态 |
|---|---|
| Fork `1204kay/myfnbguide` | 已完成；GitHub Actions 已开（推到 `main` 或开 PR 时跑作者的全套检查） |
| GitHub 命令行 | 本机 `gh` 已登录 `1204kay`，可以给作者开 PR |
| GitHub 两步验证 | 已开（Authenticator app）。服务器自动部署 `main` 上检查通过的提交，GitHub 账号就是服务器的钥匙 |
| DeepSeek | 服务器用的 key `myfnb-server`，账号里只剩这一个。10/1 用户截图：余额 US$12.00 + ¥9.42，余额提醒设在 US$3 |
| Google AI Studio（Gemini 向量 key） | 项目 `myfnb`、key `myfnb-embedding`，没绑卡，已部署，1536 维 |
| 腾讯云国际版 | Lighthouse `myfnb`，新加坡，锐驰型 2 核 4GB 60GB，Ubuntu 24.04，**公网 IP 43.160.228.180**，**2026-11-01 到期，不自动续费（到期前决定续不续）**。防火墙：22、80、443、Ping |
| Porkbun A 记录 `new` → 43.160.228.180 | 已添加（TTL 600）；其余记录未动 |
| 阿里云国际版 | 放弃（不收预付卡、虚拟卡） |

**所有 key 都不要让用户发给 Claude**，由用户自己粘贴到服务器上。Gemini key 在 aistudio.google.com/apikey 随时能看；DeepSeek key 只显示一次，要换就现建现贴、旧的删掉。`bootstrap.sh` 只把 key 写进服务器上的 `.env`（权限 600，不进 git）；要看就在服务器上 `sudo grep -E '^(LLM_API_KEY|EMBEDDING_API_KEY|ADMIN_PASSWORD)=' /opt/myfnbguide/.env`。后台密码存在 Chrome 里，2026-10-01 换过一次（部署输出的截图连同密码发进了聊天）。以后要换，在服务器终端跑这一行，新密码只显示一次，存进 Chrome 后输入 `clear` 清屏，不要截图：`cd /opt/myfnbguide && P=$(openssl rand -hex 12) && sudo install -m 600 /dev/null .env.new && sudo sh -c "grep -v '^ADMIN_PASSWORD=' .env > .env.new && echo ADMIN_PASSWORD=$P >> .env.new && mv .env.new .env" && sudo docker compose --profile https up -d --force-recreate api && echo "新管理员密码：$P"; cd ~`。**请用户贴终端输出时，一律复制文字、贴之前删掉密码和 key，不要截图**（截图会连带拍到上面的旧输出）。

---

## 9. 下一步（按顺序）

1. ✅（2026-10-01）部署到 https://new.myfnbguide.com（§6）。重新部署或换服务器：在 Lighthouse 控制台点「登录」打开网页终端，粘贴 `sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/1204kay/myfnbguide/main/myfnb/bootstrap.sh)"`，按提示粘贴两个 key；新服务器记得在防火墙加 443（§12）。
2. ✅（2026-10-01）方案定案（`plan-2026-10-01.md`）；第一批 20 个信源选定（§5.4）；`industry/` 按全球定位改写，补发空刊和报头两处修复（`34389d1`、`bd63a3d`），四项检查通过（§6）。
3. ✅（2026-10-01）推上 `main`（`6be6253`），自动部署完成（首页标题已是「全球餐饮业每日要闻」，13 个新信源随部署导入）。用户在服务器上跑了清理（命令留作记录，SQL 在 `myfnb/cleanup-2026-10-01.sql`，可重复执行）：

   ```bash
   cd /opt/myfnbguide && sudo docker compose exec -T worker node scripts/delete-sources.ts "2026-10-01 改为全球定位，停用马来西亚来源" rss-mof-press web-lhdn-media rss-malaymail-money rss-malaysian-reserve rss-utusan-ekonomi rss-vulcan-post rss-grab-my-press web-sinchew-fnb web-enanyang-fnb rss-orientaldaily-business && sudo docker compose exec -T db psql -U aihot -d aihot -v ON_ERROR_STOP=1 -f - < myfnb/cleanup-2026-10-01.sql; cd ~
   ```

   结果：删掉 10 个马来西亚来源和 232 篇文章（入选过的 6 篇先撤下）；FER、FSR、Total Food 加上分类过滤；删掉 30 个旧主题，剩 72 个；删掉 10 期空刊，现在一期刊都没有（下一期有精选的日报才会出）。
4. ✅（2026-10-01）从服务器测连通（清单 `myfnb/candidates-reach-2026-10-01.txt`，80 个网址，41 个返回 200）。命令留作以后测新候选用（换清单即可）：

   ```bash
   curl -fsSL https://raw.githubusercontent.com/1204kay/myfnbguide/main/myfnb/candidates-reach-2026-10-01.txt | grep '^http' > /tmp/urls.txt; while read -r u; do echo "$(curl -s -o /dev/null -m 20 -w '%{http_code}' -A 'Mozilla/5.0 (compatible; MyFnBBot/1.0; +https://new.myfnbguide.com/about)' "$u") $u"; done < /tmp/urls.txt > /tmp/reach.txt; grep -v '^200 ' /tmp/reach.txt; echo "200 的有 $(grep -c '^200 ' /tmp/reach.txt) 个，共 $(wc -l < /tmp/reach.txt) 个"
   ```

   结果：第一批 20 个里 18 个正常；Total Food 是 301（www 跳到不带 www，框架会跟着跳，正常）；**PMQ、Global Coffee Report 返回 403**，按规则 6 暂停（10/1 用户在服务器跑了下面这行，返回 UPDATE 2，关于页显示 18 个信源；等于后台点「暂停」，只是不留操作记录）。中文实战媒体（餐饮老板内参、职业餐饮网、咖门、筷玩思维、餐宝典）和窄门餐眼、两个中国行业协会、百胜中国投资者网站，以及韩国、泰国、印尼的协会，服务器全部连不上；飲食店ドットコム 403、Caterer Middle East 405。能连上的候选：Foodizz（印尼）、Food Business MEA（中东，RSS）、TradeArabia。

   ```bash
   cd /opt/myfnbguide && sudo docker compose exec -T db psql -U aihot -d aihot -c "UPDATE sources SET enabled = false, health = 'paused', updated_at = now() WHERE id IN ('rss-pmq', 'rss-gcr');"; cd ~
   ```

5. **把入口加宽（进行中）。终点：每天 10 条以上必看，且不长期过半来自同一地区**（§5.4「入口的终点」）。10/2 下午与用户定的顺序：
   - **5a 量现有来源**：每个来源近两周标题按 §2.2 判三档，算每天几条必看、可看；得出现在每天几条必看、来自哪些来源和地区。以用户 10/1 标的 24 条为准。
   - **5b 用户校尺子（5 分钟）**：从 5a 挑 20 条三档都有的给用户看，改判错的，尺子对了再往下。
   - **5c 按必看数字整理现有来源**：两周没出过必看、可看也很少的停用（日本企业新闻稿多在此列，按数字定，不按国别）；停用名单连同数字给用户看。
   - **5d 去必看出现的地方找新来源**，每个候选先量两周标题的必看产出再决定，按预计产出排：全世界专讲经营做法的行业媒体；中文（红餐网必看率 23%；赢商网、联商网、美团研究院、食力，36氪、界面这类综合媒体也照样量）；上市连锁正式公告（港交所的中国餐饮品牌、日本连锁每月的同店销售、美国证交会）；设备、自动化、AI。每批推上线后跑规则 6。每天必看过 10 条就停。公众号仍先不接，5d 做完中文必看仍明显不够时带数字再谈。
   - 然后第 6 项一起标 150 条（从 5a、5d 判过的标题里挑）。

   现状（快照 10/2 下午）：601 个（去掉被挡的 BeanScene，加了식품저널），试抓估每天约 200 条，必看数待 5a。做法见 §5.4「加新来源的做法」，脚本在 `myfnb/sourcing/`。**先读条款再写规则**：10/2 第十三、十四批 25 个候选里 13 个死在条款上（英文行业媒体与协会大多禁止抓取或只许个人使用），读条款几分钟，写一个网页列表规则要 10–30 分钟。**每个候选先看试抓的每天条数**，过去 7 天一条都没有的只在确实重要时接（协会、头部品牌）。下一批按产出排序：
   - **深挖后仍没有订阅、规则和条款扫描都没查出问题、值得写网页列表规则的**（10/2 查过 robots 与条款）：赢商网（`news.winshang.com` 有品牌栏 `list-12.html`，要看餐饮占比）、联商网（GBK 编码，框架能解；10/2 下午本机连不上，先在服务器测连通）、美团研究院、食力 foodNEXT（台湾，偏食品产业）、Propel（首页靠脚本）、GastroJournal、Snacking（10/2 本机连不上）、DEHOGA、UMIH、GHR、NRAI、Abrasel、Ресторанные ведомости、MCA（网页路径允许）。Technomic 网站本身的条款只限付费报告，免费文章条数少。另有 9 个开着 WordPress 接口、可以写 `json_list`、条款扫描没查出问题：Comunicaffè、Food Service（意大利）、NYSRA、Hospitality Minnesota、TNHTA、Food Hotel Tech；TouchBistro 条款只讲商户、GoTo Foods 与 Whitbread 只许个人使用（不接）。
   - 还没看过的各国餐饮媒体：拉美、中东、东南亚、东欧、韩国，只找每天有几条以上的。
   - 还没查的新闻稿平台：北欧 Mynewsdesk、Prezly 新闻室、EIN Presswire、Newswire.com、ACCESS Newswire（先读条款）。PR TIMES、presseportal、播客的长尾不再挖（产出见 §5.4）。
   - 每批接完：部署后约 30 分钟请用户跑 §5.4 的查询，按规则 6 暂停被挡的；数每天进来多少、预筛放行多少；费用随条数涨（§11），后台 `llm` 每日上限 3,000 次，每天进来超过约 600 条时要调高。
   - 公众号仍先不接（见 §5.4「接不到的」）。
   - 10/2 的推送、清理、规则 6 复查都已完成（§6）。规则 6 结果（13:45）：598 个正常，没有还没抓过的；BeanScene 返回 403，已暂停并从 `sources.json` 删掉；Italia a Tavola 偶尔 429（失败计数 2，中间成功过，抓取成功会清零）、俄文播客 Restohub 一次「fetch failed」（本机正常），都是临时的，留着。框架连续失败 5 次才标 `failing`，每月复查会看到。

6. **标注**（2026-10-02 定：入口到第 5 项的终点以后，和用户一起标）。**已知的评分偏差（10/2 用公开接口 `/api/v1/items?mode=all&window=7d` 拉了 276 条已过预筛的资料对照用户 10/1 的标注）**：分数 0–29 的 222 条、30–49 的 35 条、50–59 的 5 条、60–69 的 14 条、70 以上 0 条，所以门槛 76/65/60 下几乎全落选。排序大体对（最高的 62 分是 Big Easy 扩店复盘、双品牌改造成本、咖啡店高峰手册、会员制留客），但**用户标必看的只打到 38–45**（火锅店「第二次来」38、9.9 元冷冻烘焙 42、麦当劳 AI 得来速 45），**可看的大公司动作反而 55**（星巴克关 250 家、瑞幸新加坡第 100 家），**不看的迪生与美心分拆拿到 60**。所以不能只降门槛：先在 `selection-score.md` 里把能照着做的经营内容和带数字的教训往上提、资本运作本身往下压，再按标注定门槛。标注时专门放这几条。原计划（用户约 30 分钟）：从加宽以后的信源近几天的条目里取，覆盖各类来源和地区，多放难例（例如「新任高管公布人手策略」这种看起来像人事任命的），也放几条厂商写的经营文章试用户的口味。开发集 110 条：Claude 先按 §2.2 标，用户改不同意的；留出集 40 条：用户单独标，Claude 不先标。必看 = 该选，不看 = 不该选，可看 = 两可（作者评测工具的三档）。
7. **评测与校准**：在服务器上跑 `scripts/eval-selection.ts`（要用服务器 `.env` 里的 key）。`.data/gold.jsonl` 含原文，不进 git：标注结果按网址存进仓库（只存网址和标签），在服务器上按网址从数据库取材料生成 gold 文件（这个小脚本到这一步再写）。后台 SelectBench 看错例，**先改挑选标准，最后才动门槛**。通过标准（作者没给数字，Claude 定的）：留出集里的必看最多漏 1 条；不看的混进精选不超过一成；推算每天精选 10–20 条。
8. **用户看一周真实日报**，每天 5 分钟。这一关用户说了算。
9. **上线**：按 §5.6 自查一遍；§10 切换；加不认人的计数并改隐私说明（§2.4）；上线日期变了同步改 `changelog.json` 与两份条款的日期；开始分发（`research-2026-10-01.md` §6：没有一家同类只靠内容自己长起来；具体怎么发，等日报质量过关再定）。
10. **第一周之后**：看后台「模型与评测」页的实际调用次数，校正 §11；每周数一次日报的地区分布（§2.2）；COS 建桶并设生命周期（daily 留 30 天、weekly 留 90 天），填 `DB_BACKUP_STORE_*`（在此之前只有服务器本机的 3 份备份）；每月跑一次 `sudo docker run --rm aihot-app node myfnb/check-sources.mjs`。
11. ✅（2026-10-02）**合并上游 `8d5a39b`**（作者 10/1 的「improve recovery, public consistency and agent access」，174 个文件，+10,042/−2,246 行）。实际冲突 3 处：`format.ts`、`routes/topics.tsx`（保留按行业词显示，用上作者的缓存头和日期函数）、`compose.ts`（取作者的），另修两个新测试（§7.2 第 3 项），部署脚本改成作者要求的更新顺序（§4）。作者这次没改 `industry/`；配置文档只新增 `MCP_ALLOWED_HOSTS`（默认接受 `SITE_URL` 的主机，我们不用设，上线换域名时改 `SITE_URL` 即可）。原计划：`git merge upstream/main`，冲突预计在 `packages/backend/src/reports/compose.ts`（取作者的，删掉我们的 `tests/report-catchup.test.ts` 或改成测作者的新行为）、`apps/web/app/features/report/format.ts` 与 `ReportPaper.tsx`（PR 1 的改动）；合并后跑四项检查，再推 `main`。读一遍作者这次的改动说明，看有没有需要改 `industry/` 的新配置。可以放在第 5 项之前做：加宽入口要改的是 `industry/`，跟上游的改动不冲突。
12. ✅（2026-10-01）讨论帖 #37 已补一句说明并关闭（用户同意）。§7.2 第 7、8 项作者已修，不提 PR。

---

## 10. 旧站切换清单（上线当天做）

1. `www.myfnbguide.com` 指到新服务器；旧网址全部 301 到新站首页（在 Caddy 配置）。
2. 关闭 5 个 Tally 表单：fix（EkJ0lN）、feedback（XxElML）、story（yPx8dx）、ask（Gxo91j）、join（dWZNBV）。
3. FB / IG / 小红书 @myfnbguide 简介链接改新站。
4. GitHub 仓库 `1204kay/myf-b_book` 设为 Archive（不删）。
5. **先处理拼写变体域名 `myfbguide.com`**：它现在 308 转到 `https://www.myfnbguide.com/`（看起来是 Vercel 做的）。停 Vercel 之前，在 Porkbun 给 `myfbguide.com`（含 www）设 URL Forwarding 到 `https://www.myfnbguide.com`，确认转址还通，再停。
6. 域名接管、上一条确认后，停掉 Vercel 旧项目（用户自己操作）。
7. Porkbun 的 DNS 记录（快照 2026-10-01，共 13 条）：根域 A `216.198.79.1` 与 `www` CNAME `…vercel-dns-017.com`（旧站 Vercel，切换时改这两条指到新服务器）；`new` A `43.160.228.180`；`forms` CNAME `cname.tally.so`；SendGrid 的三条 CNAME 与 `_dmarc.forms` TXT；邮件转发 MX `fwd1/fwd2.porkbun.com` 与 SPF TXT；两条 `_acme-challenge` TXT。除了根域和 `www` 两条，其余切换时都不动。

---

## 11. 成本与变现

**现在每月约 US$12–20（RM50–80，1 USD = RM4.08）；入口加宽到每天几百条以后约 US$20–40（RM80–165）**，快照：

| 项目 | 每月 | 备注 |
|---|---|---|
| 腾讯云 Lighthouse 新加坡 锐驰型 | US$8.50 | 下单页实价，1 个月、不自动续费 |
| DeepSeek | 约 US$3–10；加宽后多约 US$10–20 | **估算**：现在每天约 43 条进预筛，挡掉的只花 1 次调用，其余还要评分两次、结构化、写摘要、归组，估每天 150–300 次；加宽到每天几百条后，多出来的大部分在预筛一步挡掉，每条只多一次短调用。deepseek-flash 官网价（10/1）：未命中缓存的输入每百万 token 0.30 美元、命中缓存 0.006 美元、输出 1.20 美元，非高峰时段（北京时间工作日 09:00–12:00、14:00–18:00 以外）半价。以上线第一周后台「模型与评测」页为准；加信源会涨 |
| Gemini 向量 | 0 | 免费层，不绑卡（免费层数据可能被 Google 用于改进产品；我们处理的是公开新闻，可接受） |
| COS 备份 | 几分钱 | |
| 流量 | 0 | 锐驰型流量不限、不另收费 |

不在里面：公众号（20 个号每月约 ¥700–1,000）、X。模型费用不随读者上涨（读者打开页面不触发模型调用），随信源数量上涨。

**变现三阶段**（作者的路线是「网站免费，高级功能给机构」）：

- A 上线 0–3 个月：只攒读者，挂打赏（收款主体 CORE SYSTEM STUDIO）。
- B 有稳定读者后：周报冠名赞助，明确标「赞助」，买不到排名。**开始前先做 §5.6「商业用途」一行的复查**。对象：收银与管理系统、食材与包装供应商、厨房设备、外卖平台。用 CORE SYSTEM STUDIO 开发票。
- C 有机构来用后：机构版（定制信源、按主题的提醒、MCP 数据接口）。
- 不做：推荐佣金、付费墙、卖课、卖加盟。

---

## 12. 已查证的事实（省得重查）

框架：

- AIHOT 开源于 2026-09-28，作者会合并外部 PR，采用 squash 合并；`CONTRIBUTING.md`、PR 与 Issue 模板于 9/30 加入。作者自己的站（10/1）：853 个信源（X 账号 513、RSS 169、网页 129、公众号 23、接口 19），近 24 小时收进 6,098 条、精选 32 条，日报约 27 件。
- 作者的评测工具 `scripts/eval-selection.ts` 的标注分三档：`select`、`reject`、`either`（两可，不计入准确率）。
- 回补（新信源第一次导入的存量、发现时已超过 48 小时的）条目不进「今天」，也不进日报。
- 无向量时归组退回字面相似度，中英文同一事件合不上。
- `backup.ts`：AWS SigV4，默认端点 `https://{bucket}.cos.{region}.myqcloud.com`，按 daily / weekly / monthly 存，本地留 3 份。
- 核心代码里的 `Asia/Shanghai` 与马来西亚同为 UTC+8。
- `scripts/seed.ts` 把 `sources.json` 每一条都写进 sources 表，**已存在的不覆盖**；主题按 slug 更新，**不删除**文件里没有的旧主题。
- 抓取身份：`Mozilla/5.0 (compatible; MyFnBBot/1.0; +<SITE_URL>/about)`。有的网站按访问者返回不同的 robots.txt，所以复查必须用这个身份。
- `Content-Signal` 是 robots.txt 里的一行（`search` / `ai-input` / `ai-train`）。
- RSS 信源可用 `allowCategories` / `denyCategories` 按订阅里的分类过滤；`detail` 的 `titleRegex` 可从文章页补标题（QSR Media 用 `og:title`）。
- 反馈内容不进任何模型调用。
- 本机是 Windows：WSL（Ubuntu 24.04）里有检查环境：克隆在 `~/myfnbguide`，PostgreSQL 在 `~/pgenv`（数据 `~/pgdata`，端口 5433），`~/checks-branch.sh <分支>` 把 Windows 仓库的某个分支拉进 WSL 跑四项检查。第 34 号迁移要用带 lz4 的 PostgreSQL（conda-forge 的可以）。
- 新信源要用 `vet-sources.ts` 试抓、`check-sources.mjs` 查规则（§5.4「加新来源的做法」）。`sources.json` 里已存在的信源 `seed.ts` 不覆盖：改已上线信源的配置（过滤、分级）要在后台改，或在服务器上跑 SQL。
- 公开统计 `https://new.myfnbguide.com/api/site/stats`：信源数、累计条数、入选数、日报数。部署后看信源数变没变，就知道新版本是否已上线、迁移是否成功（迁移失败时脚本退回旧版）。
- 在本机用 Bash 工具改文件时，内容里有反引号、`${`、单引号的，用编辑工具，不要塞进 `node -e` 或 heredoc（会被 shell 吃掉）；工作区的文件是 CRLF。

法律：

- 版权法（1987）第 13(2)(a) 条：为报道时事而合理使用，公开使用时须注明作品标题与作者；第 13(2A) 条会看是否商业用途和用了多少。
- PDPA 2024 修订（Act A1727）：外泄须在 72 小时内通报专员；新增资料可携权。注册只限《2013 年资料使用者类别令》列出的行业，新闻网站不在其中；资料保护官要处理超过 2 万人的资料才必须委任（2026-09-30 查，Linklaters、DLA Piper 的法律摘要）。

来源与条款（2026-10-02 查）：

- PR TIMES：robots.txt 全站允许；条款没有禁止抓取，只限超出著作权法私人复制与引用范围的使用，并许可媒体为报道目的使用；每家企业有自己的订阅 `companyrdf.php?company_id=<编号>`。
- Informa 旗下网站（NRN、Foodservice Director、Food Connection 等）条款：除浏览外不得使用、只许个人非商业、不得收进任何检索系统。Franchise Times 系（含 Food On Demand）、RD+D、Flavor & The Menu 只许个人非商业。Inc42、Restaurant Technology News、UKHospitality、IFA、Rolling Pin、Mixer Planet、Wiadomości Handlowe 明文禁止抓取或保留文本与数据挖掘权。
- 美国上市连锁的投资者关系网站（多为 Q4 平台）对我们的抓取身份几乎全部返回 403；Papa John's、Red Robin、Wingstop 例外。
- William Reed 网站条款（`https://www.william-reed.com/Website-Terms`，旗下 Morning Advertiser、Restaurant Online、BigHospitality 等的页脚都链到它）：禁止用机器人或自动手段抓取，禁止把内容用于 AI，明文包括检索后生成（10/2 查）。韩国用 ndsoft 系统的新闻网站（식품저널等）订阅在 `/rss/allArticle.xml` 和一级栏目 `/rss/S1N<n>.xml`，二级栏目没有订阅。
- Google 不再公布 Gemini 免费层的调用上限，要在 AI Studio 里看自己的配额。向量只用在归组召回，按批调用。

平台与接口（2026-10-01 查）：

- 抖音开放平台只在创作者授权后才能读其内容（developer.open-douyin.com）；YouTube 官方接口只给标题与简介，字幕只有视频主人能下载。
- 极致了（公众号）：查文章列表每次 ¥0.14，取正文每次 ¥0.03（`packages/backend/src/providers/dajiala.ts`）。
- X 官方接口 2026-02-06 起按量计费，每读 1,000 条 5 美元，只能搜近 7 天；SocialData 这类第三方接口不是 X 授权的方式。
- DeepSeek 价格（api-docs.deepseek.com，10/1）：见 §11。
- 世界中餐业联合会《2026 中餐品牌全球化观察报告》：约 200 个国内餐饮品牌已在海外开店，全球中餐市场规模超过 3,900 亿美元（新华网 2026-05-11）。

账号与服务：

- 腾讯云 Lighthouse（Ubuntu 24.04 镜像，10/1 实测）：实例详情页「登录」打开 OrcaTerm 网页终端，登录用户是 `ubuntu`（`sudo` 不用密码）；默认防火墙只开 22、80 和 Ping，**没有 443**，要在「防火墙」→「添加规则」→ HTTPS(443) 手动加；服务器时区是 CST（UTC+8）。
- DeepSeek：API key 只显示一次；海外卡经 PayPal；最低充值 ¥10；余额为零返回 402。

---

## 13. 参考链接

- 本项目：`myfnb/plan-2026-10-01.md`（方案）、`myfnb/research-2026-10-01.md`（查证）、`myfnb/sources-universe-2026-10-01.md`（全球来源全集）、`myfnb/check-sources.mjs`（规则复查）、`myfnb/bootstrap.sh`、`myfnb/update.sh`
- AIHOT：https://github.com/KKKKhazix/AIHOT（`AGENTS.md`、`CONTRIBUTING.md`、`docs/customize.md`、`docs/selection.md`、`docs/deploy.md`、`docs/sources.md`）
- 旧站仓库：https://github.com/1204kay/myf-b_book
- DeepSeek 价格：https://api-docs.deepseek.com/quick_start/pricing
- 腾讯云轻量计费：https://cloud.tencent.com/document/product/1207/44368
- 版权法第 13 条：http://www.commonlii.org/my/legis/consol_act/ca1987133/s13.html
- 社区维护的 AI 爬虫清单：https://github.com/ai-robots-txt/ai.robots.txt
