# 播客托管平台条款：平台级结论（第二阶段）

2026-10-10 晚，本机实测和读条款。抓取订阅、音频、robots.txt 都带 User-Agent「MyFnBBot/1.0」，没有用代理；条款页用普通浏览器标识读取。候选数取自 `.data/universe/podcasts-candidates.csv`（共 8,422 行），括号里是题材信号为「强」的个数。

**怎样读的（先说明）**

- Megaphone 的两份文件（发布者条款 Master Terms and Conditions 约 7,200 词、megaphone.spotify.com/legal 整页约 4,900 词）逐句读完。
- Fireside、Zencast.fm、声湃的声明、Pinecast、Castbox 的相关各节、Triton 使用条款的相关各节，读的是原文段落。
- 其余较长的条款（Simplecast 17,104 词、RedCircle 14,295 词、Omny 10,555 词、Zencastr 两份、Kajabi、Hubhopper、Audioboom、Podcastics、LetsCast、Mave、ART19 Business Terms、Podtrac、OP3、Podscribe）：全文取回后按句子切开，用一组范围较宽的词（robot、spider、scrape、crawl、automated、data mining、AI、machine learning、personal、non-commercial、visitor、listener、end user、RSS、feed、derivative、written consent、by accessing 等，俄语、德语、法语用对应的词）筛出全部命中的句子逐句读，再通读「适用对象、定义、许可、禁止行为、知识产权」各节。付款、税务、责任限制、仲裁等小节没有逐句读。
- 引文：我受的转述限制不允许成段照录原文，所以每处只引几个关键词，并写明页面地址和所在的节，完整句子请到该地址核对。
- 所有实测主机的订阅和音频响应头里都没有 `tdm-reservation`，robots.txt 里都没有 `Content-Signal`，`/.well-known/tdmrep.json` 都不是有效文件（404、403、400，或返回网页）。下面各节不再逐一重复。

## 总表

| 平台 | 结论 | 拒绝 AI 训练类爬虫 | 候选数（强） | 关键依据 |
|---|---|---|---|---|
| Megaphone | 可用（条款）；按现行做法暂不接 | 是（订阅和音频主机都点名拒绝 GPTBot、CCBot、Google-Extended、anthropic-ai 等） | 106（60） | 发布者条款全文只约束签约的 Customer；没有面向听众或第三方的条款；robots 对 * 不限制 |
| Hubhopper | 不可用 | 否 | 101（36） | 条款约束一切访问者；未经书面同意不得为商业或非商业目的利用内容、不得做衍生作品 |
| Simplecast | 不可用（两种读法，取风险低的） | 否 | 93（51） | 通用条款禁止用自动手段从 Simplecast 网络下载、提取数据；「Services」点名包含 RSS feeds；API 条款要求终端用户接受通用条款 |
| RedCircle | 不可用（两种读法，取风险低的） | 否（条款另有禁止用于训练 AI 的一条） | 70（34） | 条款约束每个访问者；禁止用自动手段对平台和用户内容做数据挖掘、抓取、索引，例外只限按 RSS 的本来用途访问和索引 |
| Omny Studio | 不可用 | 否 | 65（42） | 单集页 omny.fm 链到 Triton 使用条款：约束一切使用者，禁止把内容用于任何 AI 技术、禁止抓取、未经书面许可不得链接首页以外的页面；部分节目的音频主机 robots 对 * 全拒 |
| Mave | 可用 | 否 | 54（40） | 用户协议只约束注册开户的 Пользователь；各主机没有 robots 文件 |
| Castbox | 不可用 | 否 | 53（24） | 条款约束一切访问者；服务和材料只供个人使用，不得商业利用 |
| ART19 | 不可用 | 否 | 40（24） | 音频最终主机 content.production.cdn.art19.com 的 robots 对 * 禁止 /validation 和 /episodes，正是音频路径 |
| Pinecast | 不可用 | 是（storage.pinecast.net 拒绝 GPTBot、Bytespider） | 19（11） | 条款约束一切使用者（含只收听的人）；未经许可不得抓取、汇集内容，不得下载或利用不属于自己的内容 |
| LetsCast.fm | 可用 | 否 | 16（10） | AGB 只规定和付费客户之间的关系；robots 文件为空 |
| Kajabi | 可用 | 否（订阅和音频主机不拒绝；kajabi.com 营销站拒绝 CCBot、Bytespider，本站不读） | 15（8） | 条款和使用政策的禁止抓取约束开户的 Hero；节目页在节目方自己的域名上，要逐个看节目方条款 |
| Audioboom | 不可用 | 否 | 11（8） | 条款有专门写给收听者的一节：内容只供个人使用；未经书面同意不得数据挖掘、抓取 |
| Zencastr | 不可用 | 否 | 8（3） | 托管产品适用的旧条款（2022-08-21）：访问即受约束，收听只限个人非商业用途，禁止用自动手段访问服务 |
| Podcastics | 不可用 | 是（www 站拒绝 GPTBot、ClaudeBot 等；音频主机对 * 全拒） | 7（4） | 音频主机 track.podcastics.com 的 robots 对 * 是 Disallow: /；条款写明播客只供严格的个人非商业使用 |
| Fireside | 不可用 | 否 | 4（3） | 条款约束一切访问者；禁止用 robot、spider 等自动手段访问或复制网站和 Fireside 内容 |
| 声湃 WavPub | 可用（有条件） | 否 | 2（—） | 《播客 RSS 内容使用与版权声明》第 2 版明文欢迎转写、摘要和基于内容的回答，条件是标明来源并链接回去 |
| Zencast.fm | 无法确认 | 否 | 1 | 订阅和音频入口主机的 robots.txt 读不到（跳到一个 TLS 握手失败的主机） |
| Whooshkaa | 不可用（已停止服务） | — | 2 | rss.whooshkaa.com 域名不解析 |

统计前缀服务的结论见最后一节：**Podtrac（232 个候选的音频经过它）、OP3、Chartable、Magellan 不可用**，Podscribe、Blubrry 统计可用，Podsights（pdst.fm）和 prfx.byspotify.com 无法确认。

没有读的平台（候选数）：podserve.fm 30、stand.fm 28、podcastmachine.com 22、pod.co 21、Audiomeans 15、podcaster.de 15、podster.fm 15、podcastle.ai 14、Springcast 9、iono.fm 6、sounder.fm 6、Julep 4。这一轮没有余力读。

---

## Megaphone（Spotify 旗下）

**主机**（实测 feeds.megaphone.fm/eat-drink、/cuchara-palo）：订阅 feeds.megaphone.fm；音频 traffic.megaphone.fm，跳转到 dcs-cached.megaphone.fm（200/206）；没有平台自己的节目页，单集链接指向节目方自己的网站；管理后台和营销站 megaphone.spotify.com（本站不读）。106 个候选里 29 个的音频地址前面套了统计前缀（Podtrac、pdst.fm、pscrb.fm、mgln.ai、swap.fm 等），要按最后一节逐个看。

**robots**
- feeds.megaphone.fm：对 * 是空的 Disallow（不限制）；点名拒绝 CCBot、Google-Extended、GPTBot、anthropic-ai、FacebookBot、Amazonbot、Claude-Web、Cohere-ai。没有点名 ChatGPT-User、Claude-User、Perplexity-User、OAI-SearchBot。
- traffic.megaphone.fm 和 dcs-cached.megaphone.fm（后者的 robots 跳到前者）：没有 * 一组，点名拒绝的名单同上。
- megaphone.spotify.com：对 * 是 Disallow: /（营销站和后台，本站不读，不影响订阅和音频）。

**条款**
- 发布者条款：https://www.spotify.com/us/legal/megaphone-publisher-terms/ （Master Terms and Conditions，2025-12-08 更新，共 11 节，逐句读完）。
  - 约束谁：开头写明合同在 Spotify 和「Customer」之间；1.3 写合同在使用服务或下单时成立；4.1 写平台不对消费者开放，只给业务用途。全文的义务主体都是 Customer。
  - 自动抓取：4.2(g) 不得对 Megaphone Platform 使用「robot, spider, data scraping, extraction tool」——主语是 Customer。
  - 商业使用、只许个人使用、AI 使用、摘要或改写、事先许可、违约金：对听众和第三方都没有规定。6.1 是 Customer 授权 Spotify 向终端用户和第三方提供内容（含下载）；3.4 和 6.4 写终止前已下载的听众可以保留副本。
- megaphone.spotify.com/legal 整页（隐私政策 2026-07-01 生效、Community Guidelines，逐句读完）：隐私政策把「Listeners」列为一类数据主体，只讲收集 IP 和 User-Agent；Community Guidelines 约束使用平台的发布者。这一页写明隐私政策不是服务条款。**没有面向听众、访客或第三方的使用条款。**
- API：没有单独的公开 API 条款；API 在发布者条款 4.3 里，只给 Customer。
- 母公司条款：Spotify 的 Terms of Use（https://www.spotify.com/us/legal/end-user-agreement/ ）把适用范围定为 Spotify 的流媒体服务以及「incorporate or link to these Terms」的网站和应用。megaphone.spotify.com 的页脚只链到发布者条款，订阅和音频主机不带任何条款链接，Terms of Use 全文没有出现 Megaphone。**没有依据说明 Spotify 的 Terms of Use 适用于 Megaphone 的订阅和音频。**（Megaphone 上的节目如果同时分发到 Spotify，Spotify 上的那一份受 Spotify 条款约束，本站不从 Spotify 读。）

**结论：可用。** 条款这一项已经读完，不再是待定的原因。剩下的只有 robots 拒绝 AI 训练类爬虫这一条：按现行做法（转写换成不用于训练的服务以前，这类平台暂不接），账本仍记「待定」，转写改用付费层以后可以直接接，另要逐个看节目方条款和统计前缀。

## Simplecast（SiriusXM 旗下，AdsWizz）

**主机**（实测 feeds.simplecast.com/5xt2Hr_C、/Hox9Oi2V）：订阅 feeds.simplecast.com；音频有两种，不带广告的在 cdn.simplecast.com（直接 206），带动态广告的在 *.simplecastaudio.com（AdsWizz 的 AIS 服务器，例如 afp-…-injected.calisto.simplecastaudio.com、injector.simplecastaudio.com）；节目页 <节目名>.simplecast.com。

**robots**：feeds.simplecast.com 404；cdn.simplecast.com 403；injector.simplecastaudio.com 404；带广告的音频主机跳到 fallback-audio-cdn.simplecast.com，返回 401；节目页主机的 /robots.txt 返回的是网页，不是 robots 文件；www.simplecast.com 对 * 只挡预览路径。都等于没有限制，没有点名任何 AI。

**条款**
- 通用条款：https://www.simplecast.com/terms-conditions （2026-02-09 生效，17,104 词；按上面的方法读）。
  - 约束谁：正文写点击「I ACCEPT」即受约束（开户时的动作）；但「Services」的定义点名包含「Simplecast RSS feeds」和 Simplecast Websites，条款里把网站访客称为服务的使用者，并写继续使用即接受修改。
  - 自动抓取：Prohibited Conduct 一节，使用服务时不得用「spiders, robots, crawlers」等自动手段从 Simplecast 或 AdsWizz 的网络或数据库下载、提取或收集数据。
  - 摘要或改写：同一节，不得复制、发布、做衍生作品或以任何方式利用 Simplecast 数据库里的内容；未经书面同意不得用人工方式监视或复制服务上的材料。
  - 商业使用、只许个人使用、AI、违约金：没有专门规定。
- API 条款：https://www.simplecast.com/api-terms-conditions （6,594 词，筛读）：约束签约的 Customer；其中规定 Customer 的终端用户必须接受 Simplecast 的通用条款和隐私政策（称为「Simplecast User Terms」）。这说明通用条款是打算适用于终端用户的。
- 母公司条款：通用条款的缔约方是 Audios Ventures, Inc.（d/b/a Simplecast），全文没有出现 SiriusXM。**没有依据说明 SiriusXM 的条款适用。**

**结论：不可用。** 两种读法。读法一：只有点击接受的开户者受约束，读取公开订阅的第三方不在内。读法二：服务包含 RSS 订阅，API 条款又要求终端用户接受通用条款，禁止自动下载和利用内容的两条及于一切使用者。按最低风险取读法二。节目方书面同意的可以接。

## Omny Studio（Triton Digital）

**主机**（实测两个 www.omnycontent.com/d/playlist/…/podcast.rss）：订阅 www.omnycontent.com；音频 traffic.omny.fm，不带广告的跳到 omny-us.pdn.tritondigital.com，带 Triton 广告的跳到 <客户名>.mc.tritondigital.com 再到 <编号>.mc.tritondigital.com；单集页 omny.fm/shows/…；现成文字稿在 api.omny.fm（一个实测订阅 5,303 集里 4,917 集带 podcast:transcript）。

**robots**：www.omnycontent.com、omny.fm、api.omny.fm 对 * 允许；traffic.omny.fm 404；omny-us.pdn.tritondigital.com 403；**radioone.mc.tritondigital.com 对 * 是 Disallow: /**（带 Triton 广告的节目，音频经过这类主机，不可用）。

**条款**
- Triton Digital Terms of Use：https://www.tritondigital.com/terms-of-use （2025-10-21 生效，5,627 词，相关各节读原文）。omny.fm 的单集页页脚链到这一份。
  - 约束谁：写明适用于链到本条款的所有 Triton 网站和服务，使用网站即接受；网站只供业务和商业用途。
  - AI 使用：第 15 节，不得把网站内容（定义里列有音频材料）和数据用于创建、训练或改进任何 AI 或机器学习技术（括号里列有自然语言处理、数据挖掘），不得为 AI 用途提取、抓取、收集，并有一条兜底「otherwise in connection with any AI Technology」。
  - 自动抓取：行为规范里禁止用网站没有有意提供的方式获取材料或信息。
  - 摘要或改写、事先许可：知识产权一节，未经 Triton 明示书面许可不得复制、下载、录入数据库、做衍生作品；**未经书面许可，网站不得链接到首页以外的任何页面**（本站的原文链接正是单集页）。
  - 只许个人使用、违约金：没有。条款写明 Triton 是 iHeartMedia 的子公司。
- Omny Studio Terms of Service：https://www.tritondigital.com/omny-studio-terms-of-service （2023-09-19 更新，10,555 词，筛读）：约束使用服务的发布者（「you」）；「End Users」指访问发布者内容的个人，是合同以外的第三方。
- Triton Acceptable Use Policy：https://www.tritondigital.com/acceptable-use-policy （1,450 词，筛读）：约束在其网络上发布内容的客户。

**结论：不可用。** 读者要点开的单集页受 Triton 使用条款约束，这份条款对一切使用者禁止 AI 用途、抓取和深层链接。订阅和音频主机本身不带条款链接，但音频正是单集页上的内容，按最低风险不接。

## RedCircle

**主机**（实测 feeds.redcircle.com 两个订阅）：订阅 feeds.redcircle.com；音频 audio1–4.redcircle.com，有的直接返回，有的跳到 media.redcircle.com；节目页 redcircle.com/shows/…；现成文字稿放在 s3.us-east-2.amazonaws.com/pod-public-transcripts/（一个订阅 88 集里 25 集有）。

**robots**：feeds 和 audio 主机 404；media.redcircle.com 403；redcircle.com 对 * 是 Allow: /。没有点名任何 AI。

**条款**：https://redcircle.com/terms （2026-05-01 更新，14,295 词，筛读并通读开头和第 15 节）；另读了 https://redcircle.com/content-policy （约束发布者的内容）。
- 约束谁：开头写明是 RedCircle 和每个「visitor, user, customer, or creator」之间的协议，「Platform」包括网站、子域名、API 和「由第三方平台代为调用」的技术设施；使用即同意。
- 自动抓取：第 15 节，不得用 robot、spider 或人工、自动程序对平台、平台内容或用户内容做 data-mine、data-crawl、scrape、index；**例外**：按公开 RSS 订阅的本来用途、并遵守适用的使用指引去访问和索引其中的内容。
- AI 使用：同一节，不得为训练机器学习或 AI 而访问、复制、使用平台内容或用户内容，不论个人还是商业用途。没有禁止把内容输入模型做摘要的句子。
- 摘要或改写、事先许可：同一节开头，平台不得被复制、发布、改造或以其他方式利用，除非是服务所提供的用法，或取得 RedCircle 或内容所有者的事先书面同意。给用户的许可写明不得转售或再分发。
- 只许个人使用、违约金：没有。

**结论：不可用。** 两种读法。读法一：本站读公开订阅、按订阅给出的地址取音频，属于 RSS 例外；本站不训练模型。读法二：例外只说「访问和索引」，并限定在订阅的本来用途（供收听的分发）之内；把整集音频转成文字、交给模型写摘要和故事并放在商业网站上，更接近被禁止的数据挖掘，也不是「服务所提供的用法」；转写用会拿输入去训练的免费服务期间还碰到训练那一条。按最低风险取读法二。这是 70 个候选里最值得去信确认的一个平台：RedCircle 或节目方书面确认以后可以改判。

## Mave（mave.digital，俄语区）

**主机**（实测 cloud.mave.digital/54676、/65596）：订阅 cloud.mave.digital（54 个候选里 11 个的订阅在 mavecloud.s3mts.ru）；音频 api.mave.digital，跳转到 cdn.mave.digital；节目页 <节目名>.mave.digital。

**robots**：cloud、api、cdn 三个主机都是 404；节目页主机对 * 允许；mave.digital 营销站对 * 只挡一批页面。没有点名任何 AI。**mavecloud.s3mts.ru 在本机连不上**（TLS 握手失败，robots 和订阅都一样），这 11 个要在服务器上再试，仍连不上的不接。

**条款**：用户协议 https://mave.digital/terms-of-use （mave.creators，2024-08-06 更新，4,110 词，筛读并读了定义和禁止行为）。
- 约束谁：协议在「Пользователь」和 ООО «Мэйв Тим» 之间；定义里 Пользователь 是创建账户、在平台注册的人，平台指 app.mave.digital，服务指在平台上提供给用户的功能。开头另有一句注册或使用服务即同意。
- 自动抓取：禁止行为里有一条，不得用自动或技术手段从任何服务或 mave 的数据库下载、提取、收集数据——主语是注册用户。
- 摘要或改写：禁止行为里有一条不得以协议没有明示允许的方式复制、传播、使用服务的一部分或用户内容——主语同上。
- 商业使用、只许个人使用、AI、违约金：没有针对听众或第三方的规定。
- 没有读：面向广告主的 mave.ads 条款（https://mave.digital/ads/terms-of-use ），与本站的用法无关。

**结论：可用。** 协议约束的是注册开户的用户，没有面向听众或读取订阅的第三方的条款，各主机没有 robots 限制。每个节目仍要看节目方自己的条款；订阅在 mavecloud.s3mts.ru 的要先在服务器上确认能连上。

## ART19（Amazon 旗下）

**主机**（实测 rss.art19.com/the-modern-waiter-podcast、/five-rules-for-the-good-life）：订阅 rss.art19.com；音频 rss.art19.com/episodes/… 跳到同主机的 /external/episodes/…，再跳到 **content.production.cdn.art19.com**（206）；节目页 art19.com/shows/…。上一轮的档案只记到 rss.art19.com，没有记最后这个主机。

**robots**
- rss.art19.com：只有一行 User-agent: *，没有规则（不限制）。
- **content.production.cdn.art19.com：对 * 禁止 /episodes、/segment_lists、/validation**，只对 Googlebot-Audio、Google-AudioNews、Amazonbot、Amazonbot-Video 放行。实测音频的最终地址是 /validation=…/episodes/….mp3，落在禁止的路径里。
- art19.com：404。

**条款**（art19.com 的页面靠脚本显示，正文从网站的程序文件里取出来读）
- Acceptable Use and Copyright Policy：https://art19.com/aup （约 1,200 词，读了全文）。约束谁：使用服务或访问 ART19 网站即同意。自动抓取：只禁止造成妨碍的监视或爬取；另禁止用人工或电子手段规避系统设置的使用限制。专门有一节写 RSS：订阅的使用以内容所有者的条款为准（「subject to terms and conditions of the owner」）。
- Business Terms of Service：https://art19.com/business-terms （约 6,100 词，筛读）：约束开户的客户；「End User」是客户内容的使用者，由客户负责。
- 商业使用、只许个人使用、AI、摘要、违约金：都没有规定。没有看到日期。
- 母公司条款：两份文件的主体是 ART19 LLC 及其关联公司，没有引用 Amazon 的使用条件。**没有依据说明 Amazon 的条款适用。**

**结论：不可用。** 音频最终所在的主机用 robots 拒绝没有点名的机器人访问音频路径（规则 1）。条款本身没有禁止本站的用法。

## Fireside

**主机**（实测 feeds.fireside.fm/fog-wanderers/rss、/horeca-marketing-podcast/rss）：订阅 feeds.fireside.fm；音频 aphid.fireside.fm，跳转到 media24.fireside.fm；节目页 <节目名>.fireside.fm。

**robots**：feeds 和 aphid 404；media24 和 fireside.fm 对 * 允许；节目页主机只挡 /admin。

**条款**：https://fireside.fm/trust/terms （2021-02-04 更新，3,411 词，读了相关各节原文）。
- 约束谁：访问网站即视为接受；「Site」定义为 Very Good Software 的网站和服务，「You」是访问网站的人。
- 自动抓取：Site Usage 一节，不得用「robot」「spider」等自动装置或相当的人工办法访问、获取、复制或监视网站的任何部分或任何「Fireside Content」。
- 只许个人使用：License 一节，fireside.fm 的页面只可为个人使用查看和打印；不得转载、复制、再分发其材料。
- AI、违约金：没有。

**结论：不可用。** 账本里原来那一句得到原文确认：条款约束一切访问者，禁止机器人访问和复制，并限个人使用。

## Zencast.fm

**主机**（实测 media.zencast.fm/negocio-em-dia/rss）：订阅和音频入口都在 media.zencast.fm，音频跳到 podcdn.zencast.fm；节目页 <节目名>.zencast.website。

**robots**：**media.zencast.fm/robots.txt 读不到**——主机把「robots.txt」当成节目名，跳到 robots.txt.zencast.website，那个主机 TLS 握手失败。podcdn.zencast.fm 和 zencast.fm 404；节目页主机对 * 允许。

**条款**：https://www.zencast.fm/terms （写「effective as of 2019」，1,784 词，读了全文正文）：约束「Subscriber」（付费客户），内容是合法使用、付款、停用；没有针对听众、抓取、AI、商业使用或摘要的规定。

**结论：无法确认。** 差的一项是订阅主机的 robots（连不上按规则 5 算读不到）。在服务器上重试：如果返回 4xx 就是没有限制，可以改判可用；如果仍然连不上，不接。只有 1 个候选。

## Zencastr（和上面不是同一家）

**主机**（实测 feeds.zencastr.com 两个订阅）：订阅 feeds.zencastr.com；音频 redirect.zencastr.com → redirect.zen.ai → media.zencastr.com；节目页 zencastr.com/…。

**robots**：feeds、media、zencastr.com 404；redirect 两个主机 400。没有限制。

**条款**
- 现行 Terms of Service：https://zencastr.com/terms-of-service （2026-07-20 更新，8,074 词，筛读）：适用于访问和使用其服务的人；没有找到禁止抓取、限个人使用或 AI 的句子。开头写明**旧的付费播客套件适用另一份条款**。
- 旧条款：https://enterprise.zencastr.com/terms-of-service （2022-08-21 更新，10,837 词，筛读）：访问或使用服务即受约束；禁止行为里有两条：收听服务上的内容只限「personal, non-commercial use」；不得用 robot、spider 等自动手段为任何目的访问服务。
- Community Guidelines（373 词）：没有相关规定。

**结论：不可用。** 托管和订阅属于播客套件，适用的旧条款对一切使用者限个人非商业使用并禁止自动访问。如果 Zencastr 确认订阅托管已改按现行条款，可以重看。

## LetsCast.fm（德国）

**主机**（实测两个 letscast.fm/podcasts/…/feed）：订阅和节目页 letscast.fm；音频 lcdn.letscast.fm（直接 206）。

**robots**：letscast.fm 的 robots.txt 只有一行注释，没有规则；lcdn.letscast.fm 403。没有限制。

**条款**：AGB https://letscast.fm/terms （4,042 词，筛读并读了适用范围和用户义务；页面没有写版本日期）。
- 约束谁：适用于「Nutzer」和 Produktgenuss GmbH 之间的业务关系，使用服务要订付费套餐。
- 自动抓取：用户义务里禁止滥用服务，例子里有会妨碍服务运行的软件、脚本、Bots——主语是订了套餐的用户。
- 商业使用、只许个人使用、AI、摘要、违约金：没有针对听众或第三方的规定。

**结论：可用。** 条款只是和付费客户之间的合同，写法和 Podigee 一样；robots 没有限制。个别节目套了 Podtrac 前缀（16 个里 1 个），按最后一节不接。

## Kajabi 的播客托管

**主机**（实测 app.kajabi.com/podcasts/2147490809/feed、/2147882667/feed）：订阅 app.kajabi.com；音频 app.kajabi.com/podcasts/medias/… 跳到 kajabi-storefronts-production.kajabi-cdn.com；节目页在节目方自己的域名上（例如 www.americanfranchiseacademy.com/podcasts/…）。

**robots**：app.kajabi.com 和节目方域名的 robots.txt 只有注释（写明允许全部路径）；音频主机 403；www.kajabi.com 营销站拒绝 CCBot、Bytespider，本站不读。

**条款**
- Terms of Service：https://www.kajabi.com/policies/terms （7,914 词，筛读并读了定义和 1.6；没有看到日期）。约束谁：「Hero」即注册或代表企业使用服务的人，「Customers」是 Hero 的终端用户，另行定义。1.6：未经书面许可不得用 robots、spiders、scrapers 访问或监视服务——主语是 Hero。MCP 一节禁止抓取和用数据训练 AI，只管接入 MCP 的开发者。
- Acceptable Use Policy：https://www.kajabi.com/policies/aup （2023-03-29，3,469 词，筛读）：不得用人工或自动系统从提供平台的网站和接口提取或抓取数据——主语同上。
- 商业使用、只许个人使用、摘要、违约金：没有针对访客的规定。

**结论：可用。** 禁止抓取的两条约束的是开户的 Hero，没有面向节目听众或第三方的条款，主机没有 robots 限制。Kajabi 上的节目页是节目方自己的网站，每个都要读节目方条款。

## 声湃 WavPub（中文）

**主机**（实测 proxy.wavpub.com/out-of-office.xml、/nailudebei-aizazadi.xml）：订阅 proxy.wavpub.com；音频入口 tk.wavpub.com。两个候选走向不同：一个跳到声湃自己的 media-one-ol.wavpub.com；另一个是代理小宇宙上的节目，音频跳到 dts-api.xiaoyuzhoufm.com 再到 media.xyzcdn.net，单集链接指向 www.xiaoyuzhoufm.com。

**robots**：proxy.wavpub.com 对 * 允许；tk.wavpub.com、media-one-ol.wavpub.com、dts-api.xiaoyuzhoufm.com、media.xyzcdn.net 都是 404。没有点名任何 AI。

**条款**：《声湃播客 RSS 内容使用与版权声明》第 2 版，https://wav.pub/copyright/podcast-license-v2 （2026-09-18 生效，读了全文）。两个实测订阅都带 `<podcast:license>` 指向这一页。
- 约束谁：1.3 以人工或程序方式访问订阅的个人、组织、软件和服务，点名包括 AI 助手和爬虫；7.1 访问即视为接受。
- AI 使用、摘要：5.1 除非创作者明确拒绝，欢迎对内容「建立索引，并进行转写、摘要、向量化等处理」，用于检索、推荐以及基于内容的回答与摘要；5.2 产出要标明节目名称和创作者，并链接回订阅或单集的正式地址。
- 自动抓取：5.5 程序访问要用可识别的 User-Agent 并提供联系方式，合理频率，按订阅给出的地址取音频，处理完不保留可对外提供的副本。
- 禁止：4.1 不得镜像或再分发音频；4.2 不得绕过订阅给出的音频地址；4.4 不得把内容或其实质部分当成自己的作品发布。
- 事先许可：5.4 以训练通用 AI 模型为目的的要先告知声湃；6.1 超出第三、五条的使用（镜像、整体转载、商业再利用）要创作者书面许可。
- 违约金：没有（7.2 保留追究和索赔的权利）。

**结论：可用（有条件）。** 这是读到的唯一一份明文许可转写和摘要的平台声明。条件：每条内容标明节目名和创作者并链接回去（本站已有原文链接，要补上创作者名）；User-Agent 里加上联系方式；转写用会拿输入去训练的服务期间碰到 5.4，要先告知声湃或先换服务；故事不能写成原节目实质内容的复述（4.4）。代理小宇宙节目的那一类，音频和单集页在小宇宙，小宇宙整体不接的结论照旧适用，要逐个看。

## Hubhopper（印度）

**主机**（实测两个 feeds.hubhopper.com/….rss）：订阅 feeds.hubhopper.com；音频 play.hubhopper.com。

**robots**：两个主机都是 404；hubhopper.com 对 * 只挡营销和后台页面。

**条款**：https://hubhopper.com/terms （2025-02-02 更新，7,092 词，筛读并读了定义和第 5 节）。
- 约束谁：开头用大写写明访问或以其他方式使用 Hubhopper 的网站或服务即同意；「User」是网站的潜在使用者；「Platform」的定义包括其分发网络。
- 摘要或改写、事先许可：第 5 节，未经 Hubhopper 明示的事先书面同意，不得复制、转发、向第三方提供通过服务收到的内容，也不得为「commercial or non-commercial purposes」利用这些内容；未经相关第三方和（或）Hubhopper 事先书面同意不得做任何衍生作品，即使不作商业用途。
- 自动抓取、AI：没有专门的句子（只有不得用机器人注册账户）。违约金：没有。

**结论：不可用。** 条款约束一切访问者，未经书面同意不得利用内容、不得做衍生作品，本站写摘要和故事正在其内。

## Castbox

**主机**（实测两个 rss.castbox.fm/everest/….xml）：订阅 rss.castbox.fm；音频 s3.castbox.fm（直接 206）；节目页 castbox.fm/ch/…。

**robots**：rss.castbox.fm 404；s3.castbox.fm 403；castbox.fm 对 * 挡登录、搜索和以 .mp3、.js、图片结尾的地址（音频不在这个主机上）。

**条款**：https://castbox.fm/termsofservice.html （2024-02-18 更新，5,300 词，筛读并读了适用范围、禁止行为和第 7 节）。
- 约束谁：访问、使用或浏览网站、应用以及通过它们提供的服务的人；访问网站或以其他方式使用服务即同意。
- 只许个人使用、商业使用：第 7 节，服务和材料只供「personal use only」，不得商业利用。
- 摘要或改写：禁止行为里不得对服务或其任何部分做衍生作品；未经书面同意不得链接或嵌入服务。
- 自动抓取、AI、违约金：没有专门的句子。

**结论：不可用。** 条款约束一切访问者，只许个人使用，不得商业利用。

## Podcastics（法国）

**主机**（实测一个 feeds.podcastics.com/…rss）：订阅 feeds.podcastics.com；音频 track.podcastics.com，跳到 files.podcastics.com；节目页 www.podcastics.com/podcast/…。

**robots**：**track.podcastics.com 对 * 是 Disallow: /**；feeds 和 files 403；www.podcastics.com 拒绝 GPTBot、ClaudeBot、Bytespider、Amazonbot 等，OAI-SearchBot 只有 Crawl-delay。

**条款**：General Terms of Service https://www.podcastics.com/guidelines/ （英文版，5,738 词，筛读）：「User」包括 Listener 和 Podcaster，即任何访问平台的人；平台上播出的播客只供「strictly personal and non-commercial use」；未经公司事先书面许可不得建立指向平台的超链接。没有看到日期。

**结论：不可用。** 音频主机的 robots 拒绝所有没有点名的机器人；条款另对一切访问者限个人非商业使用并禁止链接。

## Audioboom

**主机**（实测 audioboom.com/channels/5118772.rss、/5127631.rss）：订阅、音频入口和单集页都在 audioboom.com；音频跳到 d11untcg2uthr3.cloudfront.net。

**robots**：audioboom.com 对 * 只挡嵌入、搜索、账户等路径，音频路径 /posts/….mp3 不在内；cloudfront 主机 403。

**条款**：https://audioboom.com/about/terms （地址显示第 3 版，没有写日期，5,520 词，筛读并读了开头和「Content you listen to」）。
- 约束谁：使用平台即表示同意；条款写明只有要托管和分发内容的人才需要开户，另有专门写给收听者的一节。
- 只许个人使用：收听平台或合作平台上的内容只限「personal use only」；要使用别的账户持有人的内容必须取得内容所有者的书面许可。
- 自动抓取：未经事先书面同意不得对平台及其内容做 data mining、screen scraping、crawling；公共搜索引擎只可建索引，不得存档或缓存。
- AI、违约金：没有。

**结论：不可用。** 条款对收听者限个人使用，并禁止数据挖掘和抓取。

## Pinecast

**主机**（实测 pinecast.com/feed/the-industry、/sunpetal-tavern）：订阅和音频入口 pinecast.com；音频跳到 storage.pinecast.net；节目页 <节目名>.pinecast.co 或节目方自己的域名。

**robots**：pinecast.com 对 * 只挡 /embed/、/player/；storage.pinecast.net 对 * 不限制，点名拒绝 GPTBot、Bytespider；节目页主机允许。

**条款**：https://www.pinecast.com/terms （1,915 词，读了开头、内容、账户和 Restrictions 各节；没有写日期）。
- 约束谁：任何使用 Pinecast 的人，条款写明包括「to produce or consume content」。
- 自动抓取：Restrictions 一节，未经 Pinecast 工作人员明示许可不得抓取、爬取或以其他方式汇集 Pinecast 上的内容来收集数据。
- 摘要或改写：同一节，不得下载或利用不属于自己的内容。
- 商业使用、AI（只有禁止发布者上传纯 AI 生成内容）、违约金：没有。

**结论：不可用。** 条款约束收听者在内的一切使用者，禁止抓取和利用别人的内容。

## Whooshkaa

rss.whooshkaa.com 域名不解析（本机 curl 报 Could not resolve host），两个候选最后更新在 2016 和 2021 年。平台已并入 Spotify，旧订阅地址失效。**结论：不可用（已停止服务）**，条款没有读。

---

## 统计前缀服务

音频地址前面套了前缀时，请求先到前缀服务的主机，再跳到真正的音频主机。前缀主机的 robots 和条款同样算数。候选数是音频地址里出现这个前缀的候选个数；括号里是「在允许的平台或自己域名上、并且题材信号强」的个数，也就是这条结论实际会挡掉的候选。现在已接入的 22 个播客里，20 个在候选表里查到，都没有这些前缀（只有一个用 Blubrry 统计）；pod-cat-and-cloud 和 pod-fr-le-mot-de-la-faim 不在候选表里，没有核对。

| 前缀 | 主机 | robots | 条款 | 结论 | 候选数 |
|---|---|---|---|---|---|
| Podtrac | dts.podtrac.com、www.podtrac.com、podtrac.com | dts.podtrac.com 403（没有文件）；网站主机对 * 只挡后台路径 | https://analytics.podtrac.com/tos （3,627 词，没有写日期）：访问或使用网站或服务即接受，服务点名包括「Podtrac redirect」；Registration and Use of Services 一节列有不得「issue server-side requests to the redirect」 | **不可用**（两种读法） | 232（8） |
| OP3 | op3.dev | **对 * 禁止 /e/ 和 /api/1/**，前缀地址正是 op3.dev/e/… | https://op3.dev/terms （2025-05-14 更新，3,522 词）：约束访问网站的人，禁止行为里没有机器人或抓取 | **不可用**（robots，规则 1） | 20（4） |
| Podscribe | pdcn.co、pscrb.fm、verifi.podscribe.com | pdcn.co 404；pscrb.fm 和 verifi.podscribe.com 400 | https://podscribe.com/terms （2022-12-08 更新，3,454 词）：适用于访问其服务的人，没有找到禁止自动访问或限个人使用的句子 | 可用 | 67（16） |
| Chartable | chrt.fm、chtbl.com | **对 * 是 Disallow: /**（两个主机相同） | 服务已停，chartable.com 跳到 megaphone.spotify.com，没有条款可读；前缀跳转仍然有效 | **不可用**（robots） | 31（3） |
| Blubrry 统计 | media.blubrry.com | 404 | Blubrry 的条款账本里已有结论（可用） | 可用 | 77（39） |
| Magellan | mgln.ai | **对 * 是 Disallow: /** | 条款放在 docsend.com 的阅读器里，没有读到 | **不可用**（robots） | 10（0） |
| Podsights | pdst.fm | 404 | podsights.com 域名不解析，产品已并入 Spotify 的广告分析；没有找到面向听众或第三方的条款 | 无法确认（差条款这一项） | 26（2） |
| Spotify 前缀 | prfx.byspotify.com | 404 | 没有找到条款 | 无法确认（差条款这一项） | 6（0） |
| 其他 | swap.fm、tracking.swap.fm、pdrl.fm、*.gum.fm | swap.fm 对 * 只挡 /l/，其余 404 | 没有读 | 无法确认 | 各 3–5（0） |

**Podtrac 的两种读法。** 读法一：那一条写在注册和使用服务一节里，开头讲的是注册账户，约束的是用 Podtrac 的发布者（不许他们自己从服务器发请求刷数据）。读法二：条款开头写访问或使用服务即接受，服务点名包括跳转本身；本站的服务器下载音频时经过 dts.podtrac.com，正是向跳转发出的服务器端请求。按最低风险取读法二：音频地址带 Podtrac 前缀的节目不接。这条影响面最大（232 个候选，多数在本来就不可用的平台上；在可用平台上且题材强的 8 个）。

**OP3、Chartable、Magellan** 和账本里 Libsyn 的 traffic 主机是同一种情况：robots 的本意是不让爬虫顺着跳转计入下载，播客客户端同样没有被点名却每天经过。按已定的最低风险读法，本站自报身份的程序落在 * 一组，不走这些前缀。不允许去掉前缀直接取后面的地址（那等于绕过节目方设的统计）。

## 这一轮读不到的

- Magellan 的条款（docsend 阅读器）。
- Podsights、prfx.byspotify.com、swap.fm、pdrl.fm、gum.fm 的条款（没有找到或没有读）。
- media.zencast.fm 的 robots.txt（跳转目标 TLS 握手失败）。
- mavecloud.s3mts.ru（Mave 的 11 个订阅所在的主机）在本机 TLS 握手失败。
- Whooshkaa 域名不解析。
- Kajabi、LetsCast、Pinecast、Audioboom、Podcastics、ART19、Podtrac 的条款页上没有看到版本日期。
- 没有被 403 挡住的条款页。
