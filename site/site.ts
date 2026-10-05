// 站点身份和读者看得到的文案。换成你的行业时，先改这个文件。
// 网页和后端都读它；改完重新构建（docker compose up --build）即可生效。
// 域名不在这里：部署时用环境变量 SITE_URL 设置。

/**
 * 日报、周报、月报什么时候出（北京时间，HH:mm）：日报收这个时间之前的 24 小时，周报在每个自然周之后的周一出，
 * 月报在每月 1 日出。排程、成刊时间窗口、缺期告警和所有提到时间的文案都读它（public/ 里的文件写占位
 * {{dailyTime}}、{{weeklyTime}}、{{monthlyTime}}）；排程每半小时检查一次，所以写整点或半点。
 */
export const EDITION_TIMES = { daily: "08:00", weekly: "10:00", monthly: "10:30" };

/** “08:00”“每周一 10:00”“每月 1 日 10:30”：写进句子里的出刊时间。日报不写“每天”：当天没有够格的内容就不出。 */
export const EDITION_WHEN = {
  daily: EDITION_TIMES.daily,
  weekly: `每周一 ${EDITION_TIMES.weekly}`,
  monthly: `每月 1 日 ${EDITION_TIMES.monthly}`,
};

export const SITE = {
  /** 站名：导航、页面标题、分享图、RSS、MCP、后台都用它。 */
  name: "MyF&B",
  /**
   * 行业词：拼进默认说法里，比如“AI 日报”“AI 动态”。
   * 改成“法律”“HR”“黄金”之类，页面上就会变成“法律日报”“法律动态”。
   */
  subject: "餐饮",
  /** 首页的完整标题（浏览器标签、搜索结果）。 */
  homeTitle: "MyF&B — 餐饮人自己的参考站",
  /** 主题目录页（/topics）的标题。 */
  topicsTitle: "餐饮主题：经营主题、品类与地区的最新动态",
  /** 反馈页的标题（页面大标题和手机顶栏都用它）；null 是默认：顶栏“意见反馈”、大标题“说说你的想法”。 */
  feedbackTitle: "反馈" as string | null,
  /** 反馈表单输入框里的示例。 */
  feedbackExample: "例如：某一篇故事里的数字和原文对不上……",
  /** 反馈页标题下面的一句话。 */
  feedbackLead: "内容有误、页面出错，或者希望增加的功能，都可以在这里告诉我们。",
  /** 反馈表单邮箱框里的提示。 */
  feedbackEmailHint: "留下邮箱，方便我们回信",
  /** 一句话介绍：搜索引擎、分享卡片、RSS、llms.txt 会用。 */
  description: "餐饮小店的经营参考：收集各地店家的做法和经验，按开店、成本、人手、客人等整理，附原文出处，由你自己判断。",
  /** llms.txt 里一句话介绍下面的一段详细介绍（选填）。 */
  llmsIntro: "MyF&B 从各国经营者的播客、访谈和文章里挑选与开店、经营有关的内容，由 AI 写成中文标题、摘要和收录理由，每条附原文链接。内容没有经过人工逐条审核，引用时以原文为准。" as string | null,
  /** 一行小字：分享图、海报下方。 */
  tagline: "餐饮人自己的参考站",
  /** 搜索引擎读到的关键词（首页结构化数据）。 */
  keywords: ["餐饮经营", "餐饮小店", "开店经验", "餐饮成本", "餐饮管理"] as string[],
  /** 网站开始收录的年份（结构化数据的时间范围，选填）。 */
  since: "2026" as string | null,
  /** 界面语言（HTML lang、og:locale）。 */
  locale: "zh-MY",
  /** 默认域名，只在没设置 SITE_URL 时使用。 */
  defaultUrl: "http://localhost:3000",
  /** 标准图标（favicon.ico、icon.png、icon-192.png、apple-icon.png、logo.svg）以外也放在网站根目录的图标，site/brand/ 里的文件名（选填）；manifest.webmanifest 或外站引用了它们时用。 */
  rootIcons: [] as string[],
  /**
   * MCP 工具名的前缀（小写字母、数字、下划线），工具会叫 myhot_get_latest、myhot_search……
   * 已经有人接入后就不要再改。
   */
  mcpPrefix: "myfnb",
  /**
   * 公开接口（MCP、OpenAPI、llms.txt）的版本号，只升不降。
   * 改了接口里已有的字段或含义时升主版本，并在部署说明里写清。
   */
  interfaceVersion: "4.0.0",
  /** 对外联系邮箱（选填）：llms.txt 和给 Agent 的使用说明里会写。 */
  contactEmail: "myfb.guide.my@gmail.com" as string | null,
  /** 关于页底部的一行小字（选填）。 */
  footerNote: "由 AIHOT 开源框架驱动",
  /** 中国大陆网站的 ICP 备案号（选填），填了就显示在侧栏底部和“我的”页底部，并链接到工信部备案系统。 */
  icp: null as string | null,
  /** 源码的 GitHub 仓库地址（选填），填了就在侧栏底部和“我的”页底部显示“GitHub 开源”。 */
  github: null as string | null,
  /** 结构化数据里的网站运营者（搜索引擎用）。 */
  organization: {
    name: "MyF&B",
    /** 创始人（选填）。 */
    founder: null as null | { name: string; alternateName?: string; jobTitle?: string; description?: string; url?: string },
  },
  /** 抓取信源时报上的名字和版本（User-Agent 里用），不要冒用别的站。 */
  crawlerName: "MyFnBBot/1.0",
} as const;

/** 使用规则和隐私说明两页（正文在 pages/ 里）。 */
export const POLICY = {
  terms: {
    /** 页面名：导航、页脚、页面标题都用它。 */
    name: "使用规则",
    description: "本站网页、RSS、公开 API 与 MCP 的使用规则。",
    /** llms.txt 里对这一页的一句说明（选填）。 */
    covers: null as string | null,
    /** Agent 接入页的 RSS、API 两栏各自提醒的使用规则（选填）。 */
    notes: null as null | { rss: string; api: string },
    /**
     * 讲清哪些用途要先取得授权的话（选填）：llms 接在 llms.txt“使用说明”的版权说明后面，
     * agent 写在给 Agent 的使用说明“使用规则”一节的开头。
     */
    license: null as null | { llms: string; agent: string },
    /**
     * 公开 API、RSS 和 OpenAPI 文件声明使用规则的响应头（选填）：原样附上，再加一个指向这一页的
     * Link 头（rel="terms-of-service"）；浏览器里的调用方也读得到它们。
     */
    headers: null as null | Record<string, string>,
  },
  privacy: {
    description: "本站如何处理浏览器本地数据、反馈资料与访问日志。",
    /** llms.txt 里对这一页的一句说明（选填）。 */
    covers: null as string | null,
  },
  /**
   * X 帖子本身的文字和图片算不算全文：算的话，只在这篇允许站内全文时显示（信源允许全文、正文也取到了）；
   * 不算的话总是显示，和标题、摘要一样。
   */
  xPostIsFullText: true,
} as const;

/**
 * 导航（选填）：首页放什么，手机底栏和电脑侧栏放哪些入口、按什么顺序、叫什么，搜索放在哪，“我的”页怎么分组，
 * 筛选里有没有“一手”。不显示的页面照样能打开，只是不出现在导航里。
 */
export const NAV = {
  /**
   * 首页（/）显示哪个模块页：写它在 module.ts 里的 id。设了以后，引擎的精选列表搬到 /latest，导航、错误页、RSS、
   * llms.txt 和网站地图里指向精选的地方一起改；模块导航项里指向这一页原地址的，改为指向 /。模块页原来的地址
   * 要在模块的 module.ts 里 301 到 /。null 是默认：首页是精选。
   */
  home: "reference-home" as string | null,
  /** 手机底栏依次放的标签：引擎的 featured（精选）、hot、daily、me，或模块标签的 key；null 是默认（引擎的在前，模块的排在“我的”前面）。 */
  tabs: ["reference", "featured", "daily", "me"] as string[] | null,
  /**
   * 电脑侧栏的入口，一组一个数组，写路径，按这里的顺序：组和组之间一条细线，不写组名；第一组是带图标的主入口，
   * 其余各组是不带图标的次入口。null 是默认：引擎的“内容”“更多”两组，模块的入口在两组之间，带组名。
   */
  sidebar: [["/", "/latest", "/daily", "/starred"], ["/about", "/changelog", "/feedback"]] as string[][] | null,
  /** 侧栏最下面的一行小字链接，写路径（选填）。 */
  sidebarFoot: ["/terms", "/privacy", "/agent"] as string[],
  /**
   * 搜索放在哪：pages 是默认，精选和全部动态两页各有自己的搜索框；shell 是由外壳统一提供：电脑侧栏 Logo 下面一个
   * 搜索框（点按或按“/”打开），手机上底栏各页的顶栏左边是 Logo、右边是放大镜，电脑上的搜索层是屏幕上方的对话框。
   */
  search: "shell" as "pages" | "shell",
  /** 外观切换写文字（浅色｜深色｜跟随系统）；false 是默认的三个图标。 */
  themeText: true,
  /** 更新日志有新条目时，侧栏、底栏的“我的”和“我的”页上亮红点（默认 true）。 */
  changelogDot: false,
  /**
   * “我的”页的分组：每组一个小标题（null 不写）和几行，行写路径，"theme" 是外观切换；电脑上也是一栏。
   * null 是默认：收藏与外观、工具与入口、关于三组，页底一行小字链接（含 RSS），电脑上分栏。
   */
  meGroups: [
    { title: null, rows: ["/starred", "theme"] },
    { title: "关于本站", rows: ["/about", "/changelog", "/feedback", "/terms", "/privacy"] },
    { title: "给开发者", rows: ["/agent"] },
  ] as Array<{ title: string | null; rows: string[] }> | null,
  /** 侧栏、“我的”页、搜索层和精选页不显示的入口，写路径（例如 "/hot" 也去掉精选页的当前热点，Agent 接入页不列热点的工具和接口）；"/all" 不显示时，全部动态的页面点亮精选的入口。 */
  hidden: ["/hot", "/topics", "/all"] as string[],
  /** 精选和全部动态的筛选里有没有“一手”（官方一手发布）。 */
  firstPartyFilter: false,
  /** 入口的名字，路径 → 名字，侧栏、底栏、“我的”页、返回按钮和那一页的标题都用；不写的用默认。 */
  labels: { "/": "参考", "/latest": "最新", "/daily": "日报", "/about": "关于", "/feedback": "反馈" } as Record<string, string>,
};

/** 版心（选填）。 */
export const LAYOUT = {
  /**
   * 电脑上（宽度 ≥ 961px）读者主路径各页的正文栏宽度（px），在主区里居中，不设右栏：参考各页、最新、搜索、标签、条目、
   * 收藏、我的、日报、合订本。null 是默认：各页用框架自己的宽度（列表铺满，条目页三栏）。
   */
  column: 760 as number | null,
};

/** 精选和全部动态两种列表。 */
export const FEED = {
  /**
   * 列表的样子：timeline 是默认（电脑上是时间轴旁的卡片，手机上是无框的行，按天分组）；cards 是手机和电脑同一种带边框的卡
   * （来源行、标题、摘要、收录理由），不显示时刻、分类和标签，精选平铺、日期写在卡上，全部按天分组。
   */
  style: "cards" as "timeline" | "cards",
  /** 页头标题下面的一句说明，精选和全部各一句；null 是默认（不写）。 */
  leads: {
    featured: "入选的条目，按时间排列，每条附收录理由；日报从中挑出一部分编成一期。",
    all: "收集到的全部条目，按时间排列；标有「精选」的条目已入选，并附收录理由。",
  } as null | { featured: string; all: string },
  /** 分类筛选上写什么：label 是默认（行业包里分类的 label）；section 是日报里的分节名。 */
  filterNames: "section" as "label" | "section",
};

/** 读者页面上的日期。 */
export const DATES = {
  /** 数字与汉字之间加空格（“10 月 5 日”），星期写“周日”；false 是默认（“10月5日”）。 */
  spaced: true,
  /** 读者页面显示时刻（列表上的 10:59、搜索结果的“更新于 06:41”、收藏时间、更新日志每条的时刻）；false 只写到日（默认 true）。 */
  clock: false,
};

/** 搜索的几处说法。 */
export const SEARCH = {
  /** 搜索框里的提示（默认“搜索标题、摘要和正文”）。 */
  placeholder: "搜索情况、店名或关键词",
  /** 搜索层里输入框下面的一句，说明搜得到什么；null 是默认（不写）。 */
  note: "参考里的情况和故事、最新里的全部条目都会搜到。" as string | null,
  /** 搜索结果的两种排序（默认“最新（标题与摘要）”“全文相关”）。 */
  sorts: { time: "按时间", relevance: "按相关" },
  /** 排序下面的一句说明；null 是默认（不写）。 */
  sortNote: "按时间只搜标题和摘要；按相关连正文一起搜。" as string | null,
  /** 搜索结果里引擎那一节的标题（模块在它前面各放一节时用来分开）；null 是默认（不写）。 */
  itemsTitle: "全部条目" as string | null,
};

/** 收藏页的说法。 */
export const STARRED = {
  /** 标题下面的一句；null 不写（默认“本机收藏的 <站名> 内容，适合稍后阅读和回看。”）。 */
  lead: null as string | null,
  /** 收藏存在哪里（默认“收藏只保存在当前浏览器；清除浏览器数据或换设备后不会同步。”）。 */
  note: "收藏保存在这台设备的浏览器里：清除浏览器数据会一并删除，换一台设备看不到。",
  /** 没有收藏时的一句（默认“还没有收藏内容。点开任意一条内容，在详情页点击收藏即可添加。”）。 */
  empty: "还没有收藏。在列表、条目页或故事页点书签图标，就能收藏。",
  /** 页尾“备份”一节的说明（导出、导入两个按钮在它上面）；null 是默认：没有这一节，导入、导出在标题旁边。 */
  backup: "换设备时，先在这里导出文件，再到新设备上导入。" as string | null,
};

/** 条目卡片和详情页上的几处说法和显示。 */
export const ITEM_COPY = {
  /** 模型写的那句理由叫什么：卡片、详情页、Markdown 导出、给 Agent 的回答和群推送都用它。 */
  reasonLabel: "收录理由",
  /** 读者在网页和分享图上看不看得到 AI 评分。只管显示：公开 API 和 MCP 的数据照样带 score，后台照常显示。 */
  showScore: false,
  /** 条目页的标签前面写不写“#”（默认 true）。 */
  tagHash: false,
  /** 条目页显示不显示分类标签（每条的第一个标签，例如“行业动态”）（默认 true）。 */
  categoryTags: false,
  /** 「另有 N 家…报道」里来源的叫法（列表卡和日报都用；默认“信源”）。 */
  sourceWord: "来源",
};

/** 关于页的一张二维码卡片。 */
interface ContactCard {
  kind: string;
  title: string;
  note: string;
  /** 站外链接过的根目录文件名（选填），比如 qr-wechat.jpg：这个地址总是跳到现在的二维码。 */
  alias?: string;
}

/** 关于页的文案。数字（信源数、收录数、精选数、日报期数）来自站内实时统计，不用写在这里。 */
export const ABOUT = {
  kicker: `关于 ${SITE.name}`,
  /** 页面描述（搜索结果、分享卡片）。 */
  description: `关于 ${SITE.name}：${SITE.description}`,
  /** 大标题：第一行正常颜色，第二行强调色。 */
  headline: ["餐饮经营的经验，散落在各地。", "我们把它汇集起来，整理成中文。"] as [string, string],
  /** 标题下面的一段话。{sources} 会换成实时的信源数（两边自动加空格，所以 {sources} 两边不写空格）；统计没取到时换成 sourcesFallback。 */
  lead: `${SITE.name} 由餐饮人发起，从{sources}个来源收集各地店家的做法和经验，按经营者遇到的事整理成参考：挑选的标准由人定，整理和写作由 AI 完成，每条附原文出处。`,
  sourcesFallback: "数十",
  /** 页面的几处版面；写 null 的用默认。 */
  page: {
    /** 标题旁的两个按钮：[文字, 地址]，第一个是实心的（默认“看今天的精选”去精选、“读最新日报”）。 */
    actions: [["去参考", "/"], ["看日报", "/daily"]] as Array<[string, string]> | null,
    /** 示意图下面四个环节的名字（默认“采集、收录、精选、成刊”）。 */
    stepTitles: { collect: "收集", store: "保存", select: "挑选", publish: "整理" } as null | { collect: string; store: string; select: string; publish: string },
    /** 示意图的说明里，说经过挑选以后去了哪里的那半句，也是示意图里报纸的悬停说明（默认“经过精选的闸门，只有少数几束通过，汇入每天的日报”）。 */
    riverNote: "入选的整理进参考，也编进日报" as string | null,
    /** 四个环节下面的小字（过去 24 小时的数字、各类来源的个数、订阅方式）（默认 true）。 */
    statNotes: false,
  },
  /** 信源河动画下面的四个环节。 */
  steps: {
    collect: "来源是各国经营者的播客、访谈和文章，以及写给餐饮经营者的媒体：中国、日本、韩国、东南亚、印度、澳大利亚、欧洲和美洲；活跃的来源每 15 分钟查看一次。",
    store: "收进来的内容都保存下来，同一件事的多篇报道归为一组。",
    select: `模型先判断内容是否与开店和经营有关，再写中文标题、摘要和${ITEM_COPY.reasonLabel}；大公司财报、人事任命、颁奖、美食推荐、营销稿和重复转发不收录。`,
    publish: `日报在早上 ${spokenTime(EDITION_TIMES.daily)}编排，当天没有够格的内容就不出；周一编周报，每月 1 日编月报。`,
  },
  /**
   * 作者块（选填），null 就不显示。
   * avatarSourceId：一个 X 账号信源的 id，头像取它的（选填）。
   * 二维码在后台“设置”里上传，或者放进 site/brand/contact/；没有二维码就不显示那张卡片。
   */
  maker: null as null | {
    name: string;
    avatarSourceId?: string | null;
    greeting: string[];
    wechat?: ContactCard;
    feishu?: ContactCard;
  },
  /** 页面底部的版权与下架说明，中间接“反馈页”的链接。 */
  copyright: [`${SITE.name} 是聚合摘要和阅读索引，原文版权归各来源所有。如果你是来源方，希望更正、下架或调整展示方式，可以通过`, "联系我们。"] as [string, string],
  /** 页面底部“使用规则”链接的锚点 id（选填）：外部文档写死过这个锚点就填上，以后不要改。 */
  termsAnchor: null as string | null,
} as const;

/** 后台页面上给管理员的提示（选填）。 */
export const ADMIN = {
  /** “反馈”页标题下的一行。 */
  feedbackNote: null as string | null,
  /** 确认框里补的一句本站规定：封禁反馈来源时。 */
  banNote: null as string | null,
  /** 确认框里补的一句本站规定：调整付费服务的请求上限时。 */
  budgetNote: null as string | null,
};

/** Agent 接入页的示例。 */
export const AGENT = {
  /** MCP 工具表里“搜索”一行：能搜什么、可以怎么问。 */
  search: { scope: "按品牌、平台或经营话题搜索最近 7 天", ask: "最近有哪些店家谈到外卖平台的抽成？" },
  /** 页面开头一句里，几种方式读到的内容（默认“精选、热点、日报、周报和月报”）。 */
  covers: "最新、日报、周报和月报",
  /** MCP 工具表里其他工具“可以这样问”的例子，工具 → 一句；没写的用默认的问法。 */
  examples: {
    latest: "关于员工留不住，各地店家有哪些做法？",
    weekly: "上一周的周报里有哪些内容？",
    monthly: "上个月的月报里有哪些内容？",
  } as Partial<Record<"latest" | "hot" | "story" | "daily" | "weekly" | "monthly", string>>,
};

/** 日报、周报、月报版面上的说法。 */
export const REPORTS = {
  /**
   * 紧凑版：不显示往期栏和日历点阵；“日报｜周报｜月报”放在报头上方，手机和电脑相同；最近几期的日期在各宽度都显示，
   * 只有一期时不显示，写日期不写“今天”；报纸放进读者主路径的版心（LAYOUT.column）；报头上方只留一行日期和期数，不印“每日要闻”这类刊头语、
   * 出刊时间和报头旁的期号日期框；日报合订本用普通标题，按月一张卡片、一期一行。false 是默认。
   */
  compact: true,
  /**
   * 日报收哪些条目：`"selected"`（默认）只收入选的；`"pool"` 收这一天进站、公开、列在「全部」里的每一条（过了相关性预筛、
   * 不是回补），一件事只算一条，按重要程度排（评分、当天讨论它的独立来源数、一手发布）：前面写全，其余是简讯。
   * 用户 10/5：「不管是什么餐饮消息都有人在意，问题是日报怎么选出来」。
   */
  dailyScope: "pool" as "selected" | "pool",
  /** 日报的简讯最多几条（默认 10）；null 不限，当天其余的条目全部列进简讯。 */
  dailyFlashes: null as number | null,
  /** 报头下面的出版者一行。 */
  imprint: SITE.name.toUpperCase(),
  /** 报头旁边的一个词。 */
  motto: SITE.subject as string,
  /** 每种报告页面的描述（搜索结果、分享卡片），不带句号；llms.txt 介绍周报、月报时也用它。 */
  descriptions: {
    daily: `${SITE.name} 的${withSubject("日报")}：早上 ${spokenTime(EDITION_TIMES.daily)}编排，收录前一天收进来的餐饮消息和店家做法，按重要程度排列；当天没有新内容就不出`,
    weekly: `从上一周的${withSubject("日报")}里选出的内容，按类别分组`,
    monthly: `从上个月的${withSubject("日报")}里选出的内容，按类别分组`,
  },
  /**
   * 一期里的一条怎么称呼（“4 条内容”）：没有头条时的标题（“这一天的 4 条餐饮内容”）、报头和往期目录的条数、
   * 周报月报没有总述时的那句话，以及订阅说明里的“按栏目分好的内容”都用它。
   */
  entry: { measure: "条", noun: "内容" },
  /** 报头上其余几个数字后面的说法；写 null 的那一项不显示。来源数、精选数和日报期数在关于页也这样写，精选数和日报期数在主题页也这样写。 */
  metricUnits: { sourcesCount: "个来源", firstPartyEvents: null as string | null, selectedCount: "条精选", reportsCovered: "期日报" },
  /** 报告分享图上“共几条”的说法。 */
  shareUnit: "条内容",
};

/** 运维告警（只发给站长）里随部署而变的几处说法。 */
export const ALERTS = {
  /** 多少分钟没有收录新文章就告警“网站停止收录新内容”（最多一天）；环境变量 ALERT_QUIET_MINUTES 优先。 */
  quietMinutes: 360,
  /** 同一条告警里，“没有”后面补一句平时的收录量；null 就不写。 */
  usualFlow: null as string | null,
  /** worker 停了的告警里，怎么看它的日志。 */
  workerLogs: "看 worker 的日志（docker compose logs worker）",
  /** 某家模型服务拒绝服务或额度用完时，告警里说哪些步骤停了；没写的服务用通用说法。 */
  modelStops: {} as Record<string, string>,
};

/** 后台新建信源时的默认设置。 */
export const SOURCE_DEFAULTS = {
  /** 站内展示全文；false 时只显示摘要和原文链接。 */
  siteFulltext: false,
};

/**
 * 社区站的信源（填信源 id）：算热度时按发帖的账号计，一个账号算一个独立来源，而不是整个信源只算一个。
 * dev 是 dev.to 的文章流，hn 是 Hacker News 的帖子流。
 */
export const COMMUNITY_FEEDS: { dev: string[]; hn: string[] } = {
  dev: [],
  hn: [],
};

/** 各页分享图（/og/pages/*.png）上的文字。主题目录页的那张按主题数自动生成。 */
export const CARDS: Record<string, { kicker: string; title: string; subtitle: string; accent?: "hot" | "amber" }> = {
  // 分享图左上角已有站名，这里不再写站名：用介绍的前半句，副标题是介绍的其余部分。
  site: { kicker: "餐饮小店的经营参考", title: SITE.tagline, subtitle: "收集各地店家的做法和经验，按开店、成本、人手、客人等整理，附原文出处，由你自己判断。" },
  all: { kicker: subjectAfter("全部", "动态"), title: "收进来的全部内容，按时间排列", subtitle: "可按类别与标签筛选。" },
  hot: { kicker: "热点榜", title: "过去 48 小时，大家在讨论什么", subtitle: "热度指数、趋势与组成热度的公开来源。", accent: "hot" },
  daily: { kicker: withSubject("日报"), title: subjectAfter(`早上 ${spokenTime(EDITION_TIMES.daily)}编排的`, "日报"), subtitle: "前一天收录并经过挑选的内容；当天没有够格的内容就不出。" },
  weekly: { kicker: withSubject("周报"), title: "一周的内容汇编", subtitle: "从上一周的日报里选出，按类别分组。" },
  monthly: { kicker: withSubject("月报"), title: "一个月的内容汇编", subtitle: "从上个月的日报里选出，按类别分组。" },
  about: { kicker: "关于", title: `关于 ${SITE.name}`, subtitle: SITE.description },
  terms: { kicker: "使用规则", title: `${SITE.name} 使用规则`, subtitle: "网页、API、RSS 与 MCP 的使用范围。" },
  privacy: { kicker: "隐私说明", title: `${SITE.name} 隐私说明`, subtitle: "访问日志、浏览器本地数据与反馈资料的处理方式。" },
  changelog: { kicker: "更新日志", title: `${SITE.name} 更新日志`, subtitle: "功能更新、优化、公告与下线记录。" },
  feedback: { kicker: "反馈", title: `${SITE.name} 反馈`, subtitle: "内容、功能、接入，或来源方的更正与下架请求。" },
  agent: { kicker: "Agent 接入", title: `把 ${SITE.name} 接进你的 Agent`, subtitle: "MCP、RSS、API 三种方式，匿名只读，无需 API Key。" },
};

/** 公开接口的访问约定里随部署而变的几处：给 Agent 的使用说明、llms.txt 会写。 */
export const ACCESS = {
  /** 同一 IP 每分钟大约能请求多少次，超过会收到 429 并带 Retry-After（选填，由部署的反向代理限流）；null 表示不限流，说明里不提。 */
  ratePerMinute: null as number | null,
  /** 请写程序同步数据的人报上的 User-Agent（选填），写在 JSON 接口的说明后面。 */
  userAgent: null as string | null,
};

/** 这个部署自己的几处安排（选填）。 */
export const DEPLOYMENT = {
  /** 凭据分组文件（models.env、collectors.env……）默认放在哪个目录，相对仓库根目录；环境变量 AIHOT_CREDENTIALS_DIR 优先，都没有就只读环境变量。 */
  credentialsDir: null as string | null,
  /** 凭据分组的文件名（放在凭据目录下，选填）：没写的分组用“分组名.env”，比如 models.env。 */
  credentialFiles: {} as Partial<Record<string, string>>,
  /** 这个部署额外要求的凭据（[分组, 环境变量名]）；生产 API 启动时检查，默认没有额外要求。 */
  requiredSecrets: [] as const,
  /** 线上 api 收到的 Host（CDN 回源用的域名，选填）；本地开发时，网页开发服务器转给 api 的请求也换成它，和线上一致。 */
  originHost: null as string | null,
  /** 反向代理把没登录的后台访问转去登录时，用哪个请求头带上原来的地址（选填，登录后回到那里）。 */
  loginReturnHeader: null as string | null,
  /**
   * 图片代理从原站取图的流量上限：超过后没缓存的图先返回 503，等这一分钟或这一天过去，当天额度用完会进运营日报；
   * null 就不设上限。环境变量 IMGPROXY_UPSTREAM_MB_PER_MINUTE、IMGPROXY_UPSTREAM_GB_PER_DAY 优先。
   */
  imageUpstreamBudget: null as null | { mbPerMinute: number; gbPerDay: number },
  /**
   * 已实测应由服务器直接连接、不走出网代理（EGRESS_PROXY_URL）的域名，采集和图片共用（选填）。
   * 每次重定向重新按目标域名选路，直连仍检查实际连接地址。
   */
  directFetchHosts: [] as string[],
  /**
   * 精选评测（scripts/eval-selection.ts）不带参数时用的金标集：文件（相对仓库根目录）、抽样条数、只抽哪一份、门槛扫描范围。
   * null 就用 .data/gold.jsonl 的全部样本（最多 200 条），在 40–90 之间扫描。
   */
  selectionGold: null as null | { file: string; sample: number; split: string; sweep: [number, number] },
};

/** RSS 订阅源的说明里随站点而变的说法。 */
export const FEED_COPY = {
  /** “全部动态”源的说明里，除了未审内容、低相关条目和已合并重复条目，还写明不含的内容（选填）。 */
  allLeavesOut: [] as string[],
};

/**
 * 公开接口（API、RSS、MCP）里和网页不同的类别（选填）。上线后不要改：接口参数和订阅地址里有类别的 key。
 * merge：并进另一类发布的类别，key 是行业包里的类别，值是它并进的类别（公开接口比网页少一类时用）；
 * feedLabels：分类 RSS 标题里的名字，替换行业包里的 feedLabel（并进了别的类别时，名字常常也要跟着改）。
 */
export const PUBLIC_CATEGORIES = {
  merge: {},
  feedLabels: {},
} as const;

/** “AI 日报”这类说法：行业词和名词之间，英文词加空格，中文词不加。 */
export function withSubject(noun: string): string {
  return /[A-Za-z0-9]$/.test(SITE.subject) ? `${SITE.subject} ${noun}` : `${SITE.subject}${noun}`;
}

/** “按主题看 AI”“往期 AI 日报”这类说法：行业词接在中文后面，英文词前加空格，中文词不加；noun 照 withSubject 接上。 */
export function subjectAfter(text: string, noun?: string): string {
  const gap = /^[A-Za-z0-9]/.test(SITE.subject) ? " " : "";
  return `${text}${gap}${noun ? withSubject(noun) : SITE.subject}`;
}

/** “8 点”“10 点 30 分”：口语里的 HH:mm。 */
function spokenTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  return `${hour} 点${minute ? ` ${minute} 分` : ""}`;
}
