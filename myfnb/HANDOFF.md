# MyF&B × AIHOT 交接文件

> 写于 2026-09-29（云端 Claude Code 会话，额度将满，交给本地会话继续）。
> 本地 Claude：先完整读完本文件，再读仓库根目录的 `AGENTS.md` 和 `docs/customize.md`，然后从「§6 下一步」开始做。

---

## 0. 给本地会话的开场白（用户复制这段发给本地 Claude）

```text
请完整读 myfnb/HANDOFF.md，再读 AGENTS.md 和 docs/customize.md。
我已授权所有决定由你做（见交接文件 §2）。从 §6「下一步」第 1 项开始，
按 AIHOT 作者的标准做法把这个站改成 MyF&B 马来西亚餐饮热点站。
每完成一步就 commit + push，做完跑作者要求的四项检查。
```

本地准备：

```bash
git clone https://github.com/1204kay/myfnbguide
cd myfnbguide
git checkout claude/myfnb-handoff
git remote add upstream https://github.com/KKKKhazix/AIHOT.git
```

---

## 1. 背景（为什么做这个）

- 旧站 **myfnbguide.com**（仓库 `1204kay/myf-b_book`，VitePress + Vercel）是马来西亚华文餐饮参考站：19 章手册、22 个计算器、34 城档案、11 个模板。读者可见内容最后一次更新是 **2026-05-09**，到 9 月底近 5 个月没动，用户觉得像"死站"。
- 仓库里找不到任何读者存在的证据：咨询页 3 条答复是示范（编号 `demo-`），故事墙是编辑写的，没有打赏到账记录，GA4 流量基线从未记录。所以舍弃旧站几乎无损失，新站要从零证明有人看。
- 用户长期关注 AIHOT 作者（数字生命卡兹克），AIHOT 于 **2026-09-28** 以 MIT 开源，用户想成为社区一份子，做一个马来西亚餐饮版。
- 决定：**舍弃旧站代码，把旧站的判断力"蒸馏"进 AIHOT 的挑选标准，基于 AIHOT 重新来过。**

---

## 2. 已定决策（用户已确认或已授权）

**2026-09-29 用户原话："全部你决定"**。按 AGENTS.md，站名、信源、什么算重要、分类、条款这 5 件事本应由用户本人决定；用户已明确授权 Claude 决定，§3 的草稿即为定案。

| 项目 | 决定 |
|---|---|
| 底座 | Fork `KKKKhazix/AIHOT` → `1204kay/myfnbguide`。**只改 `industry/`**，另可新增 `myfnb/`（本文件、运维脚本），不动 `apps/`、`packages/`，保证能无痛同步上游 |
| 范围 | 马来西亚餐饮。政策法规只看大马；实战经验放宽到全球，但要"大马小店用得上" |
| 内容 | 7 类全要，按"能不能直接拿来用"（act 维度）加权 |
| 写摘要模型 | DeepSeek 官方 API（作者 init-env 默认，`.env.example` 默认 `LLM_BASE_URL=https://api.deepseek.com/v1`、`LLM_MODEL=deepseek-flash`） |
| 向量模型 | **Google Gemini `gemini-embedding-001`（免费层）**，走作者代码的通用 OpenAI 兼容路径 `EMBEDDING_*`。原定阿里云 `text-embedding-v4`（作者默认），但阿里云不收预付卡/虚拟卡，用户只有 TNG Visa（预付卡），绑不上。Gemini 免费层每天 1,500 次请求、不用绑卡。以后用户有了银行借记卡，可切回阿里云默认路径 |
| 服务器 | 腾讯云**国际版** Lighthouse **新加坡** 2 核 4GB，Ubuntu LTS，按月付、关自动续费 |
| 备份 | 腾讯云 COS 新加坡（`backup.ts` 默认就是腾讯云 COS） |
| 域名 | 试跑用 `new.myfnbguide.com`（Porkbun 加 A 记录）；上线切换时 `www.myfnbguide.com` 指过来 |
| 更新方式 | 服务器每 5 分钟检查**我们自己的 fork**，有更新就执行作者的更新命令；上游更新先审再合并，不自动跟 |
| 变现 | 见 §8。旧站内部的"不接广告"改为**接受标明的赞助，赞助买不到排名**；继续不卖课、不卖加盟 |
| 检查点 | 上线 3 个月看读者数决定继续或停 |

---

## 3. 五件事定案

### 3.1 站名与文案 → `industry/site.ts`

| 字段 | 值 |
|---|---|
| `name` | `MyF&B` |
| `subject` | `餐饮`（页面出现"餐饮日报""全部餐饮动态"） |
| `homeTitle` | `MyF&B — 马来西亚餐饮动态 · 每日精选与日报` |
| `description` | `每天盯住马来西亚的报纸、政府机构和餐饮媒体，把对餐饮老板有用的消息挑出来，写成中文摘要，每天早上出一份日报。` |
| `tagline` | `值得餐饮老板知道的事` |
| `locale` | `zh-MY`（`root.tsx` 用作 html lang，`seo.ts` 转成 `zh_MY` 作 og:locale） |
| `mcpPrefix` | `myfnb`（上线后不改） |
| `contactEmail` | `myfb.guide.my@gmail.com`（旧站公开邮箱） |
| `footerNote` | `由 AIHOT 开源框架驱动`（保留，致谢作者） |
| `organization.name` | `MyF&B` |
| `crawlerName` | `MyFnBBot` |
| `ABOUT.headline` | `["马来西亚餐饮圈每天都有新消息，", "对你有用的，只有几条。"]` |
| `ABOUT.steps.publish` | 去掉飞书，改为"每天 08:00 出日报，周一出周报，每月 1 日出月报。" |
| `ABOUT.steps.collect` | 改成政府机构、报纸、平台和餐饮媒体 |

### 3.2 分类 → `industry/taxonomy.ts`、`industry/topics.json`

**硬约束（读过核心代码）**：`tip`、`opinion` 两个 key 被核心代码写死（`packages/backend/src/publication/items.ts:98`、`apps/api/src/routes/v1.ts:65`，v1 接口里 tip 会同时包含 opinion）；`industry` 是未归类资料的兜底节（见 taxonomy.ts 注释）。这三个 key 必须保留。

| key | label | section（日报节） | guide |
|---|---|---|---|
| `policy` | 政策 | 政策法规 | 税费、最低薪金、公积金与社险、执照准证、食品安全、清真认证、外劳政策的公布、生效与执法 |
| `platform` | 平台 | 平台与工具 | 外卖平台、支付与电子钱包、银行融资的费率、规则与服务变化 |
| `tools` | 工具 | 平台与工具 | 收银与管理软件、厨房设备、政府网上系统等新工具与功能 |
| `industry` | 行业 | 行业动态 | 品牌开店关店、进入或退出大马、连锁扩张、并购与人事 |
| `cost` | 成本与数据 | 行业动态 | 食材、租金、水电等价格变化，统计局数据，行业调查与报告 |
| `tip` | 实战 | 实战与观点 | 定价、控成本、排班、营销、外卖运营、开业流程等能照做的方法与经验 |
| `opinion` | 观点 | 实战与观点 | 业内人士观点、访谈、趋势分析 |

**ITEM_TYPES**（核心代码没写死，可改名；必须同步 `prompts/content-understanding.md`、`prompts/selection-score.md` 权重表、`CATEGORY_BY_ITEM_TYPE`、`tests/`）：

| type | 含义 | sig | nov | cred | reson | act |
|---|---|---:|---:|---:|---:|---:|
| `policy_change` | 法规政策公布、生效、执法 | 3 | 1 | 2 | 2 | 2 |
| `platform_update` | 平台与服务商规则、费率、功能变化 | 2 | 2 | 1 | 2 | 3 |
| `tool_launch` | 可直接用的新工具、系统、设备 | 1 | 2 | 1 | 2 | 4 |
| `cost_data` | 成本价格变化、统计数据、行业报告 | 2 | 2 | 2 | 3 | 1 |
| `industry_event` | 开店关店、进入退出、并购人事 | 3 | 1 | 2 | 4 | 0 |
| `practice_howto` | 能照做的经营方法与经验 | 1 | 1 | 1 | 3 | 4 |
| `opinion_analysis` | 观点、访谈、趋势分析 | 1 | 3 | 1 | 4 | 1 |

（每行和为 10，同作者原版规则。）

**CATEGORY_TAGS**（第一个标签必选其一）：政策/法规、平台动态、新工具、行业动态、成本/价格、数据/报告、实战/经验、观点/访谈、其他。

**TOPIC_TAGS**：外卖、人力/排班、外劳、税务、电子发票、公积金/社险、执照/准证、食品安全、清真、食材、定价、营销、支付、收银系统、融资/贷款、租金/选址、水电/能源、节庆、开业。

**ENTITIES**（机构与平台，用于专题页和防张冠李戴）：LHDN 内陆税收局、KWSP 雇员公积金局、PERKESO 社会保险机构、KPDN 国内贸易与生活成本部、KKM 卫生部、JAKIM 伊斯兰发展局、KESUMA 人力资源部、Imigresen 移民局、BNM 国家银行、DOSM 统计局、MOF 财政部、Grab、foodpanda、ShopeeFood。`PUBLISHER_DOMAINS` 对应 hasil.gov.my、kwsp.gov.my、perkeso.gov.my、kpdn.gov.my、moh.gov.my、halal.gov.my / islam.gov.my、mohr.gov.my、imi.gov.my、bnm.gov.my、dosm.gov.my、mof.gov.my、grab.com、foodpanda.my。`IDENTITY_LEXICON` 按这些写正则。

**topics.json**：三组改名为 `company`→"机构与平台"、`field`→"经营主题"、`genre`→"内容形态"（group key 不变）。机构与平台每个实体一页；经营主题：外卖、人力与外劳、税务与电子发票、食品安全与清真、食材与成本、定价与营销、支付与收银、开业；内容形态：政策、实战、观点、数据。

### 3.3 什么算重要 → `industry/prompts/`

保留作者的结构（五轴 + 类型权重 + 噪声压制 + 安全边界 + 事件口径校正），只换读者、例子和类型。

**读者**（从旧站蒸馏）：马来西亚中小型、极小型华文餐饮经营者，从食阁档口、茶餐室、咖啡店、烘焙店到小型连锁和 Fast Casual，也包括准备开业的人。注意力有限，最关心赚钱、成本、合规。旧站根本原则："不只告诉是什么，要告诉怎么做"。

**必须正常评价的价值**：
- 法规、税费、最低薪金、公积金社险、执照、卫生、清真、外劳规定的正式公布、生效日期、罚则或执法变化。
- 外卖平台、支付、银行服务的佣金、费率、规则变化。
- 食材、能源、租金等主要成本的明显变化，且有具体数字。
- 能直接照做的经营方法：定价、控成本、排班、营销、外卖运营、开业流程。只要具体、可迁移、大马小店用得上，即使不是大新闻也可以很高。
- 可信的行业数据：营业额、开店关店数、消费变化。
- 知名品牌进入或退出大马、连锁扩张或倒闭潮。

**必须压住的噪声**：
- **消费者向内容**（头号噪声）：新店开幕、新品上市、促销、美食推荐、食评、打卡 → `sig ≤ 2`。
- "某店爆红""排长龙"但没有营业额、成本、做法 → `sig ≤ 4`。
- 加盟招商、餐饮课程、招聘、供应商软文 → `sig ≤ 2`。
- 官员"将研究""会考虑""不排除"但无具体内容 → `nov ≤ 3` 且 `cred ≤ 4`。
- 纠纷、意外、个别食物中毒等个案，没有带出规定或执法变化 → `sig ≤ 3`。
- 大马用不上的外国做法（中国平台打法、北美小费制度、外国法规）→ `reson ≤ 3` 且 `act ≤ 2`。
- 只教用自家系统的厂商教学 → `sig ≤ 3`。
- 新闻合集、早报 → `sig ≤ 3`。

**prefilter.md**：改成"餐饮经营相关性预筛"。PASS：餐饮经营、政策、平台、成本、行业数据、经营方法；以及虽未提餐饮但直接影响餐饮经营的一般政策（最低薪金、SST、外劳、电费、电子发票）。BLOCK：与餐饮经营无关的政治、娱乐、体育、社会新闻；纯消费者向美食推荐与食评。UNKNOWN 规则同原版。

**rules-domain.md**：把 AI 术语规则换成大马餐饮术语：机构缩写保留英文并首次括注中文（EPF/KWSP 公积金、SOCSO/PERKESO 社险、EIS 就业保险、SST 销售与服务税、LHDN 内陆税收局、SSM 公司委员会、JAKIM、KKM、KPDN、DBKL 等地方政府）；"开业"不写"开店"（旧站术语规定，"开店"只用于特指实体店面）；金额保留 RM 与阿拉伯数字；马来文专有名词（如 Perintah Gaji Minimum、MyInvois）保留原文。

**content-understanding.md、structure.md**：同步新的 7 个类型、分类标签、白名单；"读者"与例子换成餐饮。

**selection.ts**：先保留作者门槛 T1 60 / T1_5 65 / T2 76，校准后再改（见 §6）。

### 3.4 信源 → `industry/sources.json`

**注意**：云端会话出网被挡，下列网址一个都没测过。按作者标准，部署后在后台"信源"页逐个**试抓**，抓不到的改用 `web_list` 配选择器，或经 Jina 渲染（`JINA_API_KEY`，按次计费）。`site_fulltext` 一律 `false`（只放摘要和链接）。

| 等级 | 门槛 | 信源（首页或新闻页，待试抓） |
|---|---|---|
| T1 官方 | 60 | 财政部 mof.gov.my、内陆税收局 hasil.gov.my、公积金局 kwsp.gov.my、社险机构 perkeso.gov.my、国内贸易与生活成本部 kpdn.gov.my、卫生部 moh.gov.my（食品安全）、伊斯兰发展局 halal.gov.my、人力资源部 mohr.gov.my / 劳工局 jtksm.mohr.gov.my、移民局 imi.gov.my、国家银行 bnm.gov.my（有 RSS）、统计局 dosm.gov.my、中小企业机构 smecorp.gov.my、能源委员会 st.gov.my |
| T2 中文媒体 | 76 | 星洲日报 sinchew.com.my、中国报 chinapress.com.my、南洋商报 enanyang.my、光华日报 kwongwah.com.my、东方日报 orientaldaily.com.my、诗华日报 seehua.com。优先接财经/商业版块，避开美食版 |
| T2 英文媒体 | 76 | The Star Business、The Edge Malaysia、Malay Mail Money、FMT Business、NST Business、Bernama Business、The Malaysian Reserve、Vulcan Post、SoyaCincau |
| T2 平台与服务商 | 76 | Grab Malaysia 新闻稿、foodpanda Malaysia、StoreHub 博客。**刻意不给 T1**：AIHOT 的 T1 门槛最低，平台软文会混进来 |
| T2 海外实战 | 76 | 红餐网 canyin88.com、Restaurant Business、Nation's Restaurant News、Modern Restaurant Management |

暂不接：微信公众号（需极致了付费 key，内容以中国为主）、X（大马餐饮圈不在 X）、飞书推送。

### 3.5 条款与隐私 → `industry/pages/terms.md`、`privacy.md`

| 项目 | 定案 |
|---|---|
| 运营主体 | CORE SYSTEM STUDIO（用户现有 SSM Enterprise 商号，旧站 TNG / DuitNow 收款即此商号）。注册号问用户 |
| 联系方式 | myfb.guide.my@gmail.com |
| 适用法律 | 马来西亚法律；隐私按《2010 年个人资料保护法》（PDPA，含 2024 修订） |
| 访客统计 | 不加。AIHOT 核心没有统计功能，加了要改 `apps/web`，违背只改 `industry/` 原则 |
| 版权 | 只放标题、摘要、来源名和原文链接，不转全文。依据《1987 年版权法》第 13(2) 条，为报道时事的合理使用须注明作品标题与作者；来源方可要求更正或下架 |
| 赞助 | 周报赞助位明确标"赞助"，赞助商不能影响挑选和排名 |

写完请专业人士过目（作者模板原话建议）。

---

## 4. 品牌与模块

- `industry/features.ts`：`leaderboard: false`、`codexResetMonitor: false`。
- `industry/brand/`：换 MyF&B 图标（旧站仓库 `public/` 下有 logo 素材可用）；报头按 customize.md §7 用 `node scripts/nameplates.ts package` 重新生成"餐饮日报/周报/月报"。**不得使用 AIHOT 名字和 Logo。**
- `industry/changelog.json`：首条改成 MyF&B 上线公告。

---

## 5. 用户账号进度（截至 2026-09-29）

| 项目 | 状态 |
|---|---|
| Fork `1204kay/myfnbguide` | 已完成 |
| Claude GitHub App 访问该仓库 | 用户说已开 |
| DeepSeek | **已完成**：已充值，余额 US$2.00 + ¥9.90（约 US$3.4），已建 key。余额提醒目前是关的，要打开；10/6 部署前充到约 US$10 |
| 阿里云国际版 | **放弃**：绑卡页写明不支持预付卡、虚拟卡，用户的 TNG Visa 是预付卡 |
| Google AI Studio（Gemini 向量 key） | 待办：用户用 Google 账号在 https://aistudio.google.com/apikey 建 key，不用绑卡 |
| 腾讯云国际版 | **已注册并绑卡**（TNG Visa 可用，用 Google 登录）；先不买服务器 |
| Porkbun A 记录 `new` → 服务器 IP | 等买服务器后做 |

**所有 key 不要让用户发给 Claude**，部署时由用户自己粘贴到服务器上。

---

## 6. 下一步（按顺序）

1. **改 `industry/`**：按 §3、§4 改 site.ts、taxonomy.ts、topics.json、sources.json、prompts/（selection-score、prefilter、content-understanding、structure、rules-domain，以及 summarize/report/story 里写死"AI"的地方，`grep -rn "AI" industry/prompts` 逐个看）、features.ts、pages/、changelog.json。
2. **改 `tests/`**：作者说明测试里有 AI 分类样例（`ai-models`、"模型发布"、Anthropic），换成餐饮对应项，规则本身不改。
3. **跑四项检查**：
   ```bash
   npm run typecheck
   DATABASE_URL=postgres://…/myhot_test npm test   # 库名须以 _test 或 _ci 结尾
   npm run build -w @aihot/web && node --test apps/web/tests/*.test.ts
   node scripts/smoke.ts --base http://localhost:3000   # 站点跑起来后
   ```
4. **写部署脚本 `myfnb/bootstrap.sh`**（用户在腾讯云网页终端 OrcaTerm 粘贴一行即可）：装 Docker → clone 我们的 fork → 用 `openssl rand -hex 32` 生成 `SESSION_SECRET`、`IMG_PROXY_SIGN_SECRET`、`POSTGRES_PASSWORD` → 交互式读入 DeepSeek key、阿里云 key、后台密码（≥12 位）→ 写 `.env`（`SITE_URL=https://new.myfnbguide.com`、`SITE_DOMAIN=new.myfnbguide.com`、`PORT=127.0.0.1:3000`、`TRUST_PROXY=true`）→ `docker compose --profile https up -d --build`。再装一个 systemd timer：每 5 分钟 `git fetch`，有变化就 `git pull && docker compose --profile https up -d --build`。
5. **向量配置（部署前必须核实）**：用 Gemini，走 `providers/embeddings.ts` 的通用路径：`EMBEDDING_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`、`EMBEDDING_API_KEY=<AI Studio key>`、`EMBEDDING_MODEL=gemini-embedding-001`。该模型默认 3072 维，支持用 `dimensions` 缩小（推荐 768 / 1536 / 3072）。**先查 `database/migrations/` 里向量列维度是否写死**（阿里云默认 1024）：写死就设 `EMBEDDING_DIMS` 为该值并实测 Gemini 是否接受；不写死就用 `EMBEDDING_DIMS=1536`。拿不到能用的向量时，作者代码会退回字面比对（`events/group.ts`），站照样能跑，只是中英文同一事件合不上。
6. **10/6–10/7 部署**：先 `git fetch upstream` 审阅并合并作者最新修复 → 用户买 Lighthouse（新加坡、Ubuntu LTS、2 核 4GB、1 个月、关自动续费；默认防火墙已开 22/80/443）→ Porkbun 加 `new` A 记录 → 用户粘贴 bootstrap 命令。
7. **部署后**：后台"信源"逐个试抓并修；后台"设置 → 预算"设每日上限；腾讯云监控设流量包 80% 告警（轻量服务器超额按量计费，新加坡中文站标价 0.8 元人民币/GB，**无自动关机选项**）；COS 建桶并设生命周期（daily 留 30 天、weekly 留 90 天），填 `DB_BACKUP_STORE_*`。
8. **校准（10 月中下旬）**：收集约一周（10/9 预算案是第一批考题）→ Claude 先标 100–200 条 select/reject/either（含边界难例，分 development / holdout）→ 用户审 → `node --env-file=.env scripts/eval-selection.ts --gold .data/gold.jsonl --split development` → 后台 SelectBench 看错例 → **先改挑选标准，最后才动门槛**。作者没定准确率数字。
9. **关卡**：每周 ≥ 10 条对老板有用的消息，且 holdout 结果用户认可 → 上线；不过就停（删服务器即停止计费）。
10. **上线后**：WhatsApp 频道 + FB/IG 每周发周报链接攒读者；3 个月检查点。

---

## 7. 旧站切换清单（上线当天做）

1. `www.myfnbguide.com` 指到新服务器；旧网址全部 301 到新站首页（在 Caddy 配置）。
2. 关闭 5 个 Tally 表单：fix（原 EkJ0lN）、feedback（XxElML）、story（yPx8dx）、ask（Gxo91j）、join（dWZNBV）。
3. FB / IG / 小红书 @myfnbguide 简介链接改新站。
4. GitHub 仓库 `1204kay/myf-b_book` 设为 **Archive**（不删，蒸馏时还要取资料）。
5. 域名接管后停掉 Vercel 旧项目（Vercel 操作属用户保留确认项）。
6. Porkbun 其他 DNS 记录不动（`forms.myfnbguide.com` Tally CNAME、Sender DKIM 3 CNAME + 1 TXT）。
7. **过渡期**：新站上线前若预算案改了最低薪金等数字，改旧仓库 `.vitepress/data/regulations.js` 一处即可（旧站 97.8% 法规数字从它读取）。注意该文件 `DATA_META.nextReview: '2026-07-23'` 已过期。

---

## 8. 成本与变现

**每月约 RM65–95**（1 USD = RM4.08，2026-09-29）：

| 项目 | 每月 | 备注 |
|---|---|---|
| 腾讯云 Lighthouse 新加坡 2 核 4GB | 约 US$8.5 | **未核实**：来自搜索结果，腾讯云价格页在云端被挡；以下单页为准 |
| DeepSeek | 约 US$7–14 | 按每天 50 条、每条约 6 次调用（作者文档：152 篇首次导入约 930 次调用）、每次约 3000 token 估算；预付费，余额用完即停 |
| Gemini 向量 | 0 | 免费层每天 1,500 次请求，不用绑卡（免费层数据可能被 Google 用于改进产品；我们处理的是公开新闻，可接受） |
| COS 备份 | 几分钱 | |
| 超额流量 | 正常 0 | 唯一会随读者上涨的费用 |

模型费用不随读者上涨（AGENTS.md：页面加载不触发模型调用）。

**变现三阶段**（作者自己的路线是"网站免费，高级功能给机构"）：
- A 上线 0–3 个月：只攒读者（WhatsApp 频道关注数 = 读者数），挂着 TNG / DuitNow 打赏。
- B 有稳定读者后：周报冠名赞助。订阅 < 5,000 时行情为每次 US$50–300 固定价；每月卖一次最低价即盖过成本。对象：收银系统、食材包装供应商、厨房设备、外卖平台、银行 SME 贷款、会计服务。**不找电子发票软件商**：2026-09-01 起年营业额 RM300 万以下免开电子发票，读者大多在此线下。用 CORE SYSTEM STUDIO 开发票。
- C 有机构来用后：机构版（法规变动提醒、定制信源、MCP 数据接口），先问 2–3 家会计所或商会定价。
- 不做：推荐佣金、付费墙（WhatsApp 付费频道未确认在大马开放）、卖课、卖加盟。

---

## 9. 已查证的技术事实（省得重查）

- AIHOT 开源于 2026-09-28，次日合并 10 个修复、8 个 PR（7 个外部贡献者），作者会合并外部 PR。
- 无向量时归组退回字面相似度（`events/group.ts`），中英文同一事件合不上。
- `backup.ts`：AWS SigV4，默认端点 `https://{bucket}.cos.{region}.myqcloud.com`，按 daily / weekly（周日）/ monthly（每月 1 日）存，本地留 3 份。
- `retention.ts`：运行记录成功 30 天、失败 90 天；图片与分享卡缓存 30 天自动清。
- AGENTS.md 硬规矩：前端只读后端 HTTP；页面加载不调模型；付费请求必经预算熔断；开发测试时 `COLLECT_ENABLED` / `MODEL_CALLS_ENABLED` 保持关闭；默认只展示摘要 + 链接。
- 腾讯云 Lighthouse：控制台 Login 按钮打开 OrcaTerm 网页终端，默认绑定密钥、用户 `lighthouse`；默认防火墙开 22/80/443/3389。
- DeepSeek：API key 只显示一次；海外卡经 PayPal；最低充值 ¥10；余额为零返回 402。
- 阿里云 Model Studio：新加坡区 API key 页 `https://modelstudio.console.alibabacloud.com/ap-southeast-1/settings/api-key`；Free Quota Only 在 Usage & Billing → Free Quota，用完返回 403 `AllocationQuota.FreeTierOnly`。
- 大马华文餐饮资讯无专门站点（搜到的只有马来西亚中国餐饮业协会和顾问公司）；全球华人餐饮已有红餐网、餐饮老板内参、餐饮家、北美餐饮通。
- 全马餐饮场所 136,453 家（DOSM 2023 经济普查，2022 年数据）。
- Budget 2027 于 2026-10-09 提交，CIMB 预测最低薪金上调、SST 豁免扩大。

## 10. 参考链接

- AIHOT：https://github.com/KKKKhazix/AIHOT（AGENTS.md、docs/customize.md、docs/selection.md、docs/deploy.md、docs/sources.md）
- 旧站仓库：https://github.com/1204kay/myf-b_book（读者画像、术语、法规数据 `.vitepress/data/regulations.js`、19 章手册可供蒸馏）
- 腾讯云轻量计费：https://cloud.tencent.com/document/product/1207/44368
- DeepSeek 价格：https://benchlm.ai/deepseek/api-pricing
- 阿里云向量计费：https://alibabacloud.com/help/en/model-studio/billing-for-text-embedding
- 电子发票豁免：https://www.bernamabiz.com/news.php?id=2601057
- 版权法第 13 条：http://www.commonlii.org/my/legis/consol_act/ca1987133/s13.html
