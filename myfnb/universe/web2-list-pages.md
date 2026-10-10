# 第三阶段后续：没有订阅、只有列表页的政府机构和协会（2026-10-11）

> 范围：上一轮（`../web1/`）搁下的 129 个「没有订阅」的候选（政府 51、协会 78），加账本里 10/2 按旧标准停用的 10 个协会，共 139 个。只做调研和试配，没有改仓库里的文件，没有提交。
> 每个候选的结论在同目录的 `ledger-rows.tsv`（139 行），可接的在 `candidates.json`（3 个）。
> 内容尺子只看标题（列表页或订阅里最近 10–20 条），由 Claude 判；通过的和「强」的另抽三篇文章读了正文。条款读的是原文。
> 所有请求都用 `MyFnBBot/1.0` 的标识，同一主机间隔 1.5 秒以上，没有用代理，没有用 Jina Reader。
> 重跑：`node get.mjs <id 和地址的清单> [条数] [titles|nav]`（抓页面、列出标题）→ 写 `candidates.json` → `node myfnb/check-sources.mjs`、`node myfnb/vet-sources.ts`、`node myfnb/sourcing/detail-check.ts` → `node build.mjs`（出 `ledger-rows.tsv` 和 `funnel-counts.json`，每个候选的结论写在这个脚本里）。

## 1. 漏斗

| 步骤 | 政府 | 协会 | 旧标准停用的协会 | 合计 | 这一步出局或搁下的 |
|---|---|---|---|---|---|
| 全集 | 51 | 78 | 10 | **139** | — |
| 读到了列表 | 33 | 59 | 9 | 101 | 38 个没有读到：列表由脚本生成或 HTML 里没有条目 28，防机器人的检查页 4（英国 FSB、新西兰 MBIE、科罗拉多餐饮协会、欧盟竞争总司返回 429），建在 Squarespace 上 3，网站在维护、跳转页或框架页 3 |
| 列表里有带标题的新闻 | 26 | 38 | 9 | 73 | 28 个没有可用的新闻列表：只有常设页、入口页或页面上没有新闻条目 22，链接 404 或网站只剩一页 3，要登录 1，只有一份 PDF 新闻稿 1，建在 Wix 上 1 |
| 过内容尺子 | 3 | 7 | 2 | **12** | 60 个不过（见 1.1）；另有 1 个内容对路但更新不足（Visita） |
| 其中「强」 | 2 | 3 | 0 | **5** | 「一般」7 个记待定（见第 3 节） |
| 配置试抓成功 | 2 | 3 | — | 5 | 0（GHR 的网页列表日期读不出，改用它没有声明的订阅，见第 4 节） |
| 过 robots 和 403 | 2 | 3 | — | 5 | 0 |
| 条款通过 | **2** | **1** | — | **3** | 1 个只许非商业使用（比利时 HoReCa Wallonie）；1 个平台条款待定（美国 Retail Bakers of America，建在 Higher Logic 上） |

账本里的结果：接入 3、不接 90、待定 46。

### 1.1 内容不过的 60 个

| 原因 | 政府 | 协会 | 旧标准停用的协会 |
|---|---|---|---|
| 餐饮经营的消息不到一半（多数是 0–3 条） | 22 | 27 | 5 |
| 内容对路，但近 90 天不足 3 条或已经停更 | 1（马来西亚卫生部食品安全计划） | 2（日本食品衛生協会、爱尔兰 SFA） | 0 |
| 转载别家媒体的报道 | 0 | 2（马来西亚 PRIMAS、美国 Restaurant Law Center） | 1（Hawaii Restaurant Association） |

协会里不过的有酒店协会 8 个、加盟协会 5 个，其余是活动、评奖和会务占多数的餐饮和烘焙咖啡协会；政府里不过的是全部门的新闻（税务、统计、竞争、旅游、欧盟各总司）。

## 2. 通过的 3 个

| id | 来源 | 国家和类型 | 方式 | 等级 | 每 30 天 |
|---|---|---|---|---|---|
| `web-fsai-news` | Food Safety Authority of Ireland「Latest news」 | 爱尔兰 · 政府 | 网页列表 | 强（7/10） | 约 3 条 |
| `web-business-gov-au` | business.gov.au「News」 | 澳大利亚 · 政府 | 网页列表 | 强（10/15；面向全部小企业） | 约 3 条 |
| `rss-ghr-france` | GHR（法国酒店餐饮业雇主协会） | 法国 · 协会 | 订阅（SPIP 自带，网站没有声明） | 强（6–7/10，样本只有 10 条，在线上） | 约 20 条（估计） |

核对结果（文件：`candidates-check.txt`、`candidates-vet.txt`、`candidates-detail.txt`）：

- `check-sources.mjs`：3 个都通过。
- `vet-sources.ts`：3 个都抓取成功，标题正确。**两个网页列表在 vet 里没有日期**：FSAI 和 business.gov.au 的列表页本身不带日期（后者只按月份分组），日期靠 `detail` 配置从文章页取；vet 只读列表，所以显示「----------」。
- `detail-check.ts`：FSAI 三篇的日期是 9/10、7/31、7/1，和文章页上写的一致，正文 3,129–3,989 字符；business.gov.au 三篇是 10/1、7/1、8/13（按 +10:00 读，UTC 显示早 10 小时），和文章页一致，正文 1,762–2,264 字符；GHR 的日期来自订阅（vet 里有），三篇正文 2,974–7,254 字符。都不是登录墙或只有摘要。
- 另外用 MyFnBBot 标识请求了 FSAI 的全部 10 篇和 business.gov.au 的全部 15 篇文章，都是 200。

配置要点（完整的在 `candidates.json`）：

- FSAI：`itemSelector` 和 `linkSelector` 都是 `a.feature-card`，`titleSelector` 是 `h2.title`，`allowUrlPrefixes` 限 `/news-and-alerts/latest-news/`（同站的食品召回和过敏原警示不收）；`detail.publishedAtSelector` 是 `p.date`，`publishedAtUtcOffset` 是 `+00:00`。
- business.gov.au：`itemSelector` 是 `main div.card.card-clickable`，`linkSelector` 是 `a.card-clickable-link`，`allowUrlPrefixes` 限 `/news/`；`detail.publishedAtSelector` 是 `.page-header-update-info`，`publishedAtUtcOffset` 是 `+10:00`。
- GHR：`feedUrl` 是 `https://www.ghr.fr/spip.php?page=backend`（全站）。只要用工栏目可以换成 `…&id_rubrique=1463`：最近 10 条里 9 条是用工规定，每 30 天约 3.5 条。

三个都设 `interval_minutes: 720`、`initialBackfillLimit: 3`、只放摘要和原文链接。

## 3. 「强」但没有通过的 2 个，「一般」的 7 个

**强但没有通过：**

| 来源 | 内容 | 卡在哪里 |
|---|---|---|
| Fédération HoReCa Wallonie（比利时） | 10/10，全是给餐饮店的规定和用工说明，每 30 天约 6 条；试抓、robots、403 都通过 | 隐私页的版权条款只允许为非商业目的转载（规则 4）。可以进征求同意的名单 |
| Retail Bakers of America 的 Business of Baking Blog（美国） | 13 篇里约 11 篇是面包店老板的经营经过和做法（参考库用得上），每 30 天约 2 篇；试抓、robots、403 都通过，自己的条款只有通用版权声明 | 建在 Higher Logic 上，平台的 Acceptable Use Policy 禁止用「公开支持的接口」以外的方式访问服务（举例是 scraping），约束对象写的是订户和它的 Users，没有写明是否包括不登录的访问者。和 Squarespace 是同一类问题，等主会话一并定；配置已写好，在 `trial.json` 里（`web-rba-blog`） |

**一般（记待定，比例只按标题）：**

| 来源 | 比例 | 备注 |
|---|---|---|
| Employment New Zealand（新西兰 · 政府） | 5/10 | 条款只许个人或非商业使用，账本里记的是不接 |
| WKO Fachverband Gastronomie 新闻稿（奥地利） | 约 15/20 沾边，直接用得上的约 5 条 | 9 条是集体工资谈判的表态；近 90 天 3 条 |
| National Food Truck Association（美国） | 自己写的 8 篇里 4 篇 | 页面下半是别家媒体的外链 |
| Night Time Industries Association（澳大利亚） | 约 8/16 | 条目没有日期 |
| Hospitality Ulster（英国北爱尔兰） | 约 3/6 | 条目不是普通链接，有会员登录提示 |
| NHO Reiseliv（挪威，旧标准停用，有订阅） | 约 9/20 | 略低于一半，每 30 天约 18 条，主会话可以再判 |
| Louisiana Restaurant Association（美国，旧标准停用，有订阅） | 最近 10 条 6/10，最近 30 条约 11/30 | 9 月的比例是食品安全月带起来的；robots、正文、条款都没有障碍 |

另有 Visita（瑞典，旧标准停用）：内容对路（8/10），但订阅近 90 天只有 1 条，记待定。

## 4. 这一轮的发现

1. **「没有订阅」不全是真的。** GHR 的网站是 SPIP 做的，页面里没有声明订阅，但 `spip.php?page=backend` 是 SPIP 自带的全站订阅，还可以按栏目取（`&id_rubrique=`）。上一轮按页面声明和常见路径找订阅，没有试这个地址。以后遇到 SPIP 的网站（页脚或源码里有 spip）先试它。
2. **框架读不出「日/月/年」的日期。** GHR 网页列表上的日期是 `30/09/2026`，文章页也只有这一种写法；`parseLooseDate` 只认年在前的数字日期和英文月份，`publishedAtRegex` 取出来的也要过它。欧洲很多网站这样写日期，以后做网页列表会反复遇到；这一轮靠订阅绕开了，没有动框架。
3. **列表页不带日期的来源，vet 看不到日期。** FSAI 和 business.gov.au 都是这样，要用 `detail-check.ts` 核对。
4. **政府的栏目页比全部门新闻好得多，但数量很少。** 51 个机构里只有 2 个的列表页本身就是食品经营或小企业栏目并且读得到。业务对路的 business.govt.nz（新西兰）是脚本生成的页面，读不到。
5. **不是所有「政府网站」都是开放许可**，见第 5 节：新西兰 Employment New Zealand、加拿大、新加坡都只许非商业使用。
6. **协会里对路的比估计的少。** 上一轮估计协会约 15–25 个值得做成网页列表，这一轮 78 个里过内容尺子的只有 7 个，强的 3 个。原因：全集里酒店协会 10 个、加盟协会 14 个，没有一个过；美国的州协会 9 个里 0 个可用（6 个没有新闻列表或要登录，1 个内容不过，2 个建在 Squarespace 上）；19 个读不到。
7. **FSAI 的许可有一条要留意**：不得把它的信息主要用于给某个产品或服务做广告或推广。本站写摘要并链接原文不属于这种情况，但 MakanBook 的推广位不要挂在它的条目上。

## 5. 各国政府许可的原文和结论

| 法域 | 读的页面 | 原文要点 | 结论 |
|---|---|---|---|
| 爱尔兰（FSAI） | https://www.fsai.ie/re-use-of-public-sector-information ；https://www.fsai.ie/disclaimer | 网站上的全部信息可以免费、以任何形式再利用（复制、向公众发行、出版、翻译）；条件：注明来源和版权、准确、不误导、不得主要用于给某个产品或服务做广告、不用于违法目的 | **可用**，覆盖新闻。只读了 FSAI 自己的声明；爱尔兰其他机构各有各的声明，没有候选过内容尺子，没有读 |
| 澳大利亚（business.gov.au） | https://business.gov.au/legal-notices/copyright ；https://business.gov.au/legal-notices/disclaimer | 「All content on business.gov.au is under a Creative Commons Attribution 3.0 Australia」，例外是国徽、标志、第三方内容，图片另属原权利人；署名「© Commonwealth of Australia」 | **可用**，覆盖新闻文章。只读了这一个网站；ABS、财政部没有过内容尺子，没有读 |
| 新西兰（Employment New Zealand） | https://www.employment.govt.nz/employment-new-zealand/copyright | Crown copyright；只可为个人或非商业用途转载，图片和商标要书面许可 | **不可用**（只许非商业）。新西兰各机构的许可不统一，不能按「政府网站都是 CC BY」处理；business.govt.nz、IRD 的版权页这一轮没有读（内容读不到） |
| 加拿大（canada.ca） | https://www.canada.ca/en/transparency/terms.html | 非商业转载不需许可；为商业再发行而转载要事先取得版权管理方的书面许可 | **不可用**（商业使用要事先许可）。适用于 ISED、竞争局这类 canada.ca 上的机构 |
| 加拿大（CCOHS） | https://www.ccohs.ca/ccohs/important.html | 只许为内部使用复制；其他用途要事先书面许可 | **不可用** |
| 新加坡（人力部 MOM） | https://www.mom.gov.sg/terms-of-use | 未经事先书面许可，不得为任何商业目的复制或再利用网站内容；链接到内页也要事先申请 | **不可用**，和账本里新加坡食品局的结论一致。IRAS、Enterprise Singapore、统计局、CCCS 的条款没有逐个读 |
| 马来西亚（KPDN、卫生部食品安全计划） | https://www.kpdn.gov.my/ms/penafian ；https://hq.moh.gov.my/fsq/penafian | 只有免责声明（政府不对使用网站信息造成的损失负责）和「Hak Cipta Terpelihara」的版权行，没有开放许可，也没有禁止性条款 | 没有开放许可；按规则属于「只有通用版权声明」。这一轮没有候选过内容和更新这两关，没有用到 |
| 印度（食品加工业部） | https://www.mofpi.gov.in/disclaimer | 抓到的 HTML 里没有正文 | **没有读到**。没有候选过内容尺子 |

英国 OGL、欧盟 CC BY 4.0、美国联邦作品上一轮已核对，这一轮没有新的候选用到。日本的机构没有过内容尺子，没有读。

## 6. 没有做完的部分和局限

| 部分 | 数量 | 说明 |
|---|---|---|
| 读不到列表的 | 38（政府 18、协会 19、旧标准 1） | 28 个是脚本生成或 HTML 里没有条目，按任务书记待定，没有用浏览器或 Jina 去读。其中按职能值得再看的：新西兰 business.govt.nz、英国 FSB、新加坡 ASME、日本給食サービス協会、马来西亚人力资源部；其余多是统计、竞争、旅游机构和加盟协会，估计内容不过（估计） |
| 等主会话定的 | 2 件 | Higher Logic 的平台条款（决定 RBA 能不能接）；Squarespace（这一轮又遇到 3 个：West Virginia、Wyoming 两个州协会和 Baking Association of Australia，内容没有往下看） |
| 可以征求同意的 | 1 个 | HoReCa Wallonie（内容是这一轮最对路的） |
| 一般的 | 7 个 | 第 3 节；LRA 和 NHO Reiseliv 有订阅，主会话如果放宽到「一般」可以直接接 |

局限：

- 内容比例只按标题判，样本是列表第一页的 10–20 条；酒店协会、加盟协会、统计和竞争机构这些职能明显不对路的，只读了第一页。在线上的几个都写明了。
- 「HTML 里没有条目」的 28 个里，有些可能是新闻在下一级页面，没有逐个往下找（政府里这样的 7 个：英国 ICO、澳大利亚统计局、日本出入国在留管理庁、新西兰商业委员会、爱尔兰统计局和 CCPC、新加坡统计局，都是职能不对路的机构）。
- 欧盟的 6 个总司连续请求时，最后一个（竞争总司）返回 429，没有重试。
- 部署以后服务器的地址会不会被挡（规则 6）没有查，接入后约 30 分钟要查一次。
- GHR 每 30 天约 20 条是按订阅里 10 条覆盖 14 天推算的。
