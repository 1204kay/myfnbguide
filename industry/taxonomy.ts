// 这个行业的分类体系：类别、标签词表、公司（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉结构抽取模型这一类收什么、
 * 和相邻类别的边界在哪（总的归类原则写在 prompts/structure.md 里）。
 * commentary 标出评论类（教程、观点）：日报写过的事又有评论类的后续报道，只占一行快讯（报道它的信源够多时除外）。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 * tip 和 opinion 两个 key 公开接口也认（v1 的 tip 同时包含 opinion），不要改名。
 * 按内容类型分，不按国家分；站在一家小店里面看，顺序是小店老板最用得上的在前（同行的做法和教训、老板的经验、省人省钱的工具）。
 * feedLabel 是分类 RSS 标题里的名字（不写就用 label）。公开接口、RSS 和 MCP 里要把一类并进另一类发布，写在站点设置里（site/site.ts 的 PUBLIC_CATEGORIES）。
 */
export const CATEGORIES = [
  { key: "tip", label: "经验", section: "同行经验", guide: "能照着做的经营方法，以及真实店铺的复盘和失败教训：高峰期分工与出餐、菜单与定价、毛利与成本、引流与回头客、外卖与团购怎么做、小团队招人留人与排班、开店选址与单店算账、加盟与扩张的避坑、食品安全与清洁维护。重点是读者能照着做的方法或一家店真实的经过；只有态度和理念、没有做法的归老板说，讲设备或系统本身的归工具。", commentary: true },
  { key: "opinion", label: "老板说", section: "老板说", guide: "老板、创始人和业内人士的访谈、创业故事、心态与经营理念、对行业的判断，以及没有新数据支撑的趋势评论。重点是说话的人的经验、判断和主张；访谈里讲出了具体做法和步骤的归经验，带新调查数据的归风向。", commentary: true },
  { key: "tools", label: "工具", section: "省人省钱", guide: "店里要买、要用的东西和服务：厨房设备、收银点餐与订位工具、AI 与管理系统、自动化与机器人、包装与用品，以及店家用它们省人省钱的情况和效果。厂商发布、介绍自家产品也归这里；重点是连锁品牌开店、改业态的归大牌。" },
  { key: "market", label: "风向", section: "生意风向", guide: "生意的冷热与成本：哪些品类和业态在涨在跌，消费习惯的变化，客流、客单价、开店与关店数，食材、能源、租金、人工等成本的价格变化，行业调查与研究报告。重点是数字和趋势；单个品牌的动作归大牌，规定和平台费率的变化归规定。" },
  { key: "industry", label: "大牌", section: "大牌动作", guide: "品牌与企业的动作：连锁开店关店、进入或退出市场、价格战与下沉、新业态与跨界、并购、融资与上市、业绩、新品与促销；不好归进其他类别的资料也放这里。品牌老板谈理念归老板说，品牌公开的做法小店能照着做的归经验。" },
  { key: "policy", label: "规定", section: "规定与平台", guide: "会改变餐饮店成本或义务的规定与执法（工资与用工、税费、食品安全与卫生、执照、包装与环保），外卖、团购、支付与订位平台的规则、抽成和费率变化，以及业者组织对这些规定的诉求与回应。已公布或已生效的规定和规则归这里；还只是预测和讨论的归风向或老板说。" },
] as const satisfies ReadonlyArray<{ key: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/**
 * 这个行业最受关注的一类发布（AI 行业是新模型）：日报报头的“N 个新模型”、改分类后修订已出的报告都按它数。
 * category 是类别，tag 是标签，两者都对上才算；unit 接在数字后面。
 * 没有这样一类的行业设成 null，报头就不显示这个数。
 * 餐饮小店没有这样一类发布：同行的做法、成本和规定的变化才是读者要的，新店、新品不是。
 */
export const RELEASE: { category: string; tag: string; unit: string } | null = null;

/** 周报月报的总述可以直接写、不必在报道里找到出处的行业通用词（小写）。站名会自动算进去。 */
export const PLAIN_TERMS: readonly string[] = ["ai", "pos", "sop", "kpi", "roi", "ceo", "ipo", "app"];

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给五个维度不同的权重。
 */
export const ITEM_TYPES = ["policy_change", "platform_update", "tool_launch", "market_data", "industry_event", "practice_howto", "opinion_analysis"] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一。 */
export const CATEGORY_TAGS = ["政策/法规", "平台动态", "设备/科技", "市场/数据", "行业动态", "实战/经验", "观点/访谈", "其他"] as const;

/** 可选的主题标签：经营主题、业态、地区三类。 */
export const TOPIC_TAGS = [
  "菜单/定价", "引流/复购", "新品/促销", "成本/利润", "食材/供应链", "人与用工", "外劳", "外卖/平台", "厨房设备", "AI/自动化", "科技/系统", "店面/装修",
  "食品安全/卫生", "清真", "税费", "租金/选址", "能源", "开店/扩张", "加盟", "关店/倒闭", "融资/上市", "出海", "包装/环保", "节庆",
  "咖啡", "茶饮", "火锅", "快餐", "正餐", "烘焙/甜品", "小吃/档口", "团餐/中央厨房", "酒吧/酒饮",
  "中国", "香港", "台湾", "日本", "韩国", "东南亚", "马来西亚", "新加坡", "印尼", "泰国", "越南", "菲律宾", "印度", "中东", "澳洲", "美国", "加拿大", "英国", "欧洲", "拉美",
] as const;

/** 可选的实体标签（品牌与平台）。 */
export const ENTITY_TAGS = [
  "麦当劳", "肯德基", "百胜中国", "星巴克", "瑞幸", "蜜雪冰城", "霸王茶姬", "喜茶", "古茗", "茶百道", "库迪", "海底捞",
  "必胜客", "达美乐", "汉堡王", "赛百味", "Chipotle", "快乐蜂", "萨莉亚", "寿司郎", "吉野家", "Tim Hortons", "Dunkin'",
  "美团", "饿了么", "DoorDash", "Uber Eats", "Grab", "foodpanda", "Deliveroo",
] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  政策: "政策/法规", 法规: "政策/法规", 监管: "政策/法规", 法令: "政策/法规", 执法: "政策/法规", "政策/监管": "政策/法规", 预算案: "政策/法规",
  平台: "平台动态", 平台更新: "平台动态",
  工具: "设备/科技", 新工具: "设备/科技", 新设备: "设备/科技", 新产品: "设备/科技", 产品更新: "设备/科技", 新功能: "设备/科技", "设备/工具": "设备/科技",
  行业: "行业动态", 动态: "行业动态", 公司动态: "行业动态", 并购: "行业动态", 收购: "行业动态", 人事: "行业动态", 业绩: "行业动态", 财报: "行业动态",
  市场: "市场/数据", 数据: "市场/数据", 报告: "市场/数据", 统计: "市场/数据", 调查: "市场/数据", 研究: "市场/数据", "数据/报告": "市场/数据", "成本/价格": "市场/数据",
  实战: "实战/经验", 经验: "实战/经验", 教程: "实战/经验", 技巧: "实战/经验", 方法: "实战/经验", 指南: "实战/经验", 案例: "实战/经验", 复盘: "实战/经验",
  观点: "观点/访谈", 访谈: "观点/访谈", 专访: "观点/访谈", 评论: "观点/访谈", 分析: "观点/访谈",
  菜单: "菜单/定价", 定价: "菜单/定价", 菜单设计: "菜单/定价", 菜单工程: "菜单/定价", 涨价: "菜单/定价",
  营销: "引流/复购", 推广: "引流/复购", 社交媒体: "引流/复购", 顾客: "引流/复购", 复购: "引流/复购", 回头客: "引流/复购", 会员: "引流/复购", 引流: "引流/复购", 团购: "引流/复购", "营销/顾客": "引流/复购",
  新品: "新品/促销", 促销: "新品/促销", 限定: "新品/促销", 联名: "新品/促销", 上新: "新品/促销",
  成本: "成本/利润", 利润: "成本/利润", 毛利: "成本/利润", 财务: "成本/利润", 现金流: "成本/利润", "利润/财务": "成本/利润",
  食材: "食材/供应链", 原料: "食材/供应链", 供应链: "食材/供应链", 采购: "食材/供应链",
  人才: "人与用工", 员工: "人与用工", 员工管理: "人与用工", 人力: "人与用工", 排班: "人与用工", 招聘: "人与用工", 培训: "人与用工", 薪酬: "人与用工", 工资: "人与用工",
  最低工资: "人与用工", 最低薪金: "人与用工", 缺工: "人与用工", 用工: "人与用工", "人才/管理": "人与用工", 外籍劳工: "外劳", 外籍员工: "外劳", 移民: "外劳",
  外卖: "外卖/平台", 外送: "外卖/平台", 送餐: "外卖/平台", 外卖平台: "外卖/平台", 云厨房: "外卖/平台",
  设备: "厨房设备", 厨具: "厨房设备", 机器人: "AI/自动化", 自动化: "AI/自动化", 人工智能: "AI/自动化", ai: "AI/自动化",
  收银系统: "科技/系统", 收银: "科技/系统", pos: "科技/系统", 支付: "科技/系统", 电子钱包: "科技/系统", 系统: "科技/系统",
  装修: "店面/装修", 家具: "店面/装修", 店面设计: "店面/装修",
  食品安全: "食品安全/卫生", 食安: "食品安全/卫生", 卫生: "食品安全/卫生", 清洁: "食品安全/卫生", halal: "清真", 清真认证: "清真",
  税: "税费", 税务: "税费", 税收: "税费", 关税: "税费",
  租金: "租金/选址", 选址: "租金/选址", 电费: "能源", 水电: "能源", "水电/能源": "能源", 燃气: "能源",
  开店: "开店/扩张", 开业: "开店/扩张", 扩张: "开店/扩张", 拓店: "开店/扩张", "开店/加盟": "开店/扩张", 特许经营: "加盟", 加盟商: "加盟", 直营: "加盟",
  关店: "关店/倒闭", 倒闭: "关店/倒闭", 结业: "关店/倒闭", 闭店: "关店/倒闭", 破产: "关店/倒闭",
  融资: "融资/上市", 上市: "融资/上市", 投资: "融资/上市", ipo: "融资/上市", "融资/贷款": "融资/上市",
  海外扩张: "出海", 国际化: "出海", 包装: "包装/环保", 环保: "包装/环保", 食物浪费: "包装/环保", 节日: "节庆",
  咖啡馆: "咖啡", 咖啡店: "咖啡", 奶茶: "茶饮", 新茶饮: "茶饮", "咖啡/茶饮": "茶饮", 餐厅: "正餐", 酒楼: "正餐", "餐厅/酒楼": "正餐", 休闲餐厅: "正餐",
  烘焙: "烘焙/甜品", 甜品: "烘焙/甜品", 面包: "烘焙/甜品", 小吃: "小吃/档口", 档口: "小吃/档口", 小贩: "小吃/档口", 街边摊: "小吃/档口", "小贩/食阁": "小吃/档口",
  团膳: "团餐/中央厨房", 团餐: "团餐/中央厨房", 中央厨房: "团餐/中央厨房", "团膳/中央厨房": "团餐/中央厨房", 酒吧: "酒吧/酒饮", 酒饮: "酒吧/酒饮", 精酿: "酒吧/酒饮",
  中国大陆: "中国", 大马: "马来西亚", 印度尼西亚: "印尼", 澳大利亚: "澳洲", 新西兰: "澳洲", 阿联酋: "中东", 沙特: "中东", 迪拜: "中东", 拉丁美洲: "拉美", 巴西: "拉美", 墨西哥: "拉美",
};

// ── 品牌与平台 ──────────────────────────────────────────────────────────────────────────

/**
 * 品牌与平台（打实体标签用；品牌主题页 2026-10-02 已删）：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。
 * aliases 给结构抽取模型看；otherNames 是公司自己的其他称呼（官方账号名、子品牌），把事实的主体对到发布方时也认它们。
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; otherNames?: string[] }> = {
  mcdonalds: { name: "麦当劳 McDonald's", displayTag: "麦当劳", aliases: ["McDonald's", "麦当劳", "金拱门"] },
  kfc: { name: "肯德基 KFC", displayTag: "肯德基", aliases: ["KFC", "肯德基"] },
  yumchina: { name: "百胜中国 Yum China", displayTag: "百胜中国", aliases: ["Yum China", "百胜中国"] },
  starbucks: { name: "星巴克 Starbucks", displayTag: "星巴克", aliases: ["Starbucks", "星巴克"] },
  luckin: { name: "瑞幸咖啡 Luckin", displayTag: "瑞幸", aliases: ["Luckin", "瑞幸咖啡", "瑞幸"] },
  mixue: { name: "蜜雪冰城 Mixue", displayTag: "蜜雪冰城", aliases: ["Mixue", "蜜雪冰城", "蜜雪集团"] },
  chagee: { name: "霸王茶姬 CHAGEE", displayTag: "霸王茶姬", aliases: ["CHAGEE", "霸王茶姬"] },
  heytea: { name: "喜茶 HEYTEA", displayTag: "喜茶", aliases: ["HEYTEA", "喜茶"] },
  guming: { name: "古茗 Goodme", displayTag: "古茗", aliases: ["古茗", "Goodme"] },
  chabaidao: { name: "茶百道 ChaPanda", displayTag: "茶百道", aliases: ["茶百道", "ChaPanda"] },
  cotti: { name: "库迪咖啡 Cotti", displayTag: "库迪", aliases: ["库迪", "Cotti Coffee"] },
  haidilao: { name: "海底捞 Haidilao", displayTag: "海底捞", aliases: ["海底捞", "Haidilao"] },
  pizzahut: { name: "必胜客 Pizza Hut", displayTag: "必胜客", aliases: ["Pizza Hut", "必胜客"] },
  dominos: { name: "达美乐 Domino's", displayTag: "达美乐", aliases: ["Domino's", "达美乐"] },
  burgerking: { name: "汉堡王 Burger King", displayTag: "汉堡王", aliases: ["Burger King", "汉堡王"] },
  subway: { name: "赛百味 Subway", displayTag: "赛百味", aliases: ["Subway", "赛百味"] },
  chipotle: { name: "Chipotle", displayTag: "Chipotle", aliases: ["Chipotle"] },
  jollibee: { name: "快乐蜂 Jollibee", displayTag: "快乐蜂", aliases: ["Jollibee", "快乐蜂"] },
  saizeriya: { name: "萨莉亚 Saizeriya", displayTag: "萨莉亚", aliases: ["Saizeriya", "萨莉亚", "サイゼリヤ"] },
  sushiro: { name: "寿司郎 Sushiro", displayTag: "寿司郎", aliases: ["Sushiro", "寿司郎", "スシロー"] },
  yoshinoya: { name: "吉野家 Yoshinoya", displayTag: "吉野家", aliases: ["Yoshinoya", "吉野家"] },
  timhortons: { name: "Tim Hortons", displayTag: "Tim Hortons", aliases: ["Tim Hortons", "Tims 天好咖啡"] },
  dunkin: { name: "Dunkin'", displayTag: "Dunkin'", aliases: ["Dunkin'", "Dunkin Donuts"] },
  meituan: { name: "美团 Meituan", displayTag: "美团", aliases: ["美团", "Meituan", "Keeta"] },
  eleme: { name: "饿了么 Ele.me", displayTag: "饿了么", aliases: ["饿了么", "Ele.me"] },
  doordash: { name: "DoorDash", displayTag: "DoorDash", aliases: ["DoorDash"] },
  ubereats: { name: "Uber Eats", displayTag: "Uber Eats", aliases: ["Uber Eats"] },
  grab: { name: "Grab", displayTag: "Grab", aliases: ["Grab", "GrabFood"] },
  foodpanda: { name: "foodpanda", displayTag: "foodpanda", aliases: ["foodpanda"] },
  deliveroo: { name: "Deliveroo", displayTag: "Deliveroo", aliases: ["Deliveroo"] },
};

/**
 * 身份词典：摘要和标题里出现的品牌或平台，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 每个主体要把中、英、日、韩文的叫法都写进去：原文是外文、中文摘要用中文名时，两边要能认出是同一个主体。
 * 容易和普通词撞车的名字（Grab、Subway）区分大小写。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "mcdonalds", name: "麦当劳 McDonald's", patterns: [/McDonald|麦当劳|麥當勞|金拱门|マクドナルド|맥도날드/i, /\bMcD\b/] },
  { id: "kfc", name: "肯德基 KFC", patterns: [/肯德基|Kentucky Fried|ケンタッキー|켄터키/i, /\bKFC\b/] },
  { id: "yumchina", name: "百胜中国 Yum China", patterns: [/百胜中国|百勝中國|Yum China/i] },
  { id: "starbucks", name: "星巴克 Starbucks", patterns: [/Starbucks|星巴克|スターバックス|스타벅스/i] },
  { id: "luckin", name: "瑞幸咖啡 Luckin", patterns: [/Luckin|瑞幸/i] },
  { id: "mixue", name: "蜜雪冰城 Mixue", patterns: [/Mixue|蜜雪/i] },
  { id: "chagee", name: "霸王茶姬 CHAGEE", patterns: [/CHAGEE|霸王茶姬/i] },
  { id: "heytea", name: "喜茶 HEYTEA", patterns: [/HEYTEA|喜茶/i] },
  { id: "guming", name: "古茗 Goodme", patterns: [/古茗|Goodme/i] },
  { id: "chabaidao", name: "茶百道 ChaPanda", patterns: [/茶百道|ChaPanda/i] },
  { id: "cotti", name: "库迪咖啡 Cotti", patterns: [/库迪|庫迪|Cotti/i] },
  { id: "haidilao", name: "海底捞 Haidilao", patterns: [/海底捞|海底撈|Haidilao/i] },
  { id: "pizzahut", name: "必胜客 Pizza Hut", patterns: [/Pizza Hut|必胜客|必勝客|ピザハット|피자헛/i] },
  { id: "dominos", name: "达美乐 Domino's", patterns: [/Domino[’']?s|达美乐|達美樂|ドミノ・?ピザ|도미노피자/i] },
  { id: "burgerking", name: "汉堡王 Burger King", patterns: [/Burger King|汉堡王|漢堡王|バーガーキング|버거킹/i] },
  { id: "subway", name: "赛百味 Subway", patterns: [/赛百味|賽百味|サブウェイ|써브웨이/i, /\bSubway\b/] },
  { id: "chipotle", name: "Chipotle", patterns: [/Chipotle/i] },
  { id: "jollibee", name: "快乐蜂 Jollibee", patterns: [/Jollibee|快乐蜂|快樂蜂/i] },
  { id: "saizeriya", name: "萨莉亚 Saizeriya", patterns: [/Saizeriya|萨莉亚|薩莉亞|サイゼリヤ/i] },
  { id: "sushiro", name: "寿司郎 Sushiro", patterns: [/Sushiro|寿司郎|壽司郎|スシロー/i] },
  { id: "yoshinoya", name: "吉野家 Yoshinoya", patterns: [/Yoshinoya|吉野家/i] },
  { id: "timhortons", name: "Tim Hortons", patterns: [/Tim Hortons|Tims ?天好|天好咖啡/i] },
  { id: "dunkin", name: "Dunkin'", patterns: [/Dunkin|唐恩都乐|ダンキン|던킨/i] },
  { id: "meituan", name: "美团 Meituan", patterns: [/美团|美團|Meituan|Keeta/i] },
  { id: "eleme", name: "饿了么 Ele.me", patterns: [/饿了么|餓了麼|Ele\.me/i] },
  { id: "doordash", name: "DoorDash", patterns: [/DoorDash/i] },
  { id: "ubereats", name: "Uber Eats", patterns: [/Uber ?Eats/i] },
  { id: "grab", name: "Grab", patterns: [/\bGrab(?:Food|Pay|Mart|Merchant|Express)?\b/] },
  { id: "foodpanda", name: "foodpanda", patterns: [/food\s?panda|熊猫外卖/i] },
  { id: "deliveroo", name: "Deliveroo", patterns: [/Deliveroo|户户送/i] },
];

/** 这些域名上的文章，发布方就是对应的品牌或平台（现在的信源里没有品牌自己的网站）。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [];

/** 原文里的这些写法也算提到了对应主体。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
