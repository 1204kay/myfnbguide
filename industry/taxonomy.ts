// 这个行业的分类体系：类别、标签词表、公司（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉模型怎么归类。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 * tip 和 opinion 两个 key 公开接口也认（v1 的 tip 同时包含 opinion），不要改名。
 * 第一类按地区分（马来西亚的新闻不论类型都归它，日报里排第一节），其余按内容类型分。
 */
export const CATEGORIES = [
  { key: "malaysia", label: "大马", section: "大马动态", guide: "发生在马来西亚、或专门适用于马来西亚的餐饮新闻，不论内容类型：政策法规与执法、税费与薪金、外卖与支付平台的规则和费率、食材与能源等成本、本地品牌与市场、本地的设备与经营做法。只要事件的发生地或适用对象是马来西亚，就选这一类" },
  { key: "industry", label: "国际", section: "国际动态", guide: "马来西亚以外的品牌与企业动态：连锁扩张或收缩、进入或退出市场、并购、融资与上市、业绩、人事、倒闭；以及对其他国家业者也有参考价值的外国政策、执法与平台变化" },
  { key: "market", label: "市场", section: "市场与趋势", guide: "马来西亚以外各国餐饮市场与业态的走势：哪里、哪种餐饮在增长或萎缩，消费习惯的变化，营业额、开店与关店数、食材与成本的数据，行业调查与报告" },
  { key: "tools", label: "设备", section: "设备与科技", guide: "马来西亚以外，餐饮业要买、要用的东西：厨房设备、店面家具与装修、收银点餐与管理系统、外卖与订位工具、自动化与机器人、包装与用品的新产品、新用法和业者的采用情况" },
  { key: "tip", label: "实战", section: "经营实战", guide: "马来西亚以外，可以照着做的经营方法和真实案例复盘：菜单设计与定价、成本与利润、营销与顾客、员工招聘培训与管理、外卖运营、食品安全与清洁维护、开店流程" },
  { key: "opinion", label: "观点", section: "观点与访谈", guide: "马来西亚以外的业内人士观点、访谈、评论，以及没有新数据支撑的趋势判断" },
] as const;

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
  "菜单/定价", "营销/顾客", "成本/利润", "食材/供应链", "人才/管理", "外劳", "外卖/平台", "厨房设备", "店面/装修", "科技/系统", "食品安全/卫生", "清真",
  "税务", "电子发票", "公积金/社险", "执照/准证", "租金/选址", "水电/能源", "融资/贷款", "开店/加盟", "关店/倒闭", "包装/环保", "节庆",
  "小贩/食阁", "茶室/嘛嘛档", "咖啡/茶饮", "快餐", "餐厅/酒楼", "烘焙/甜品", "团膳/中央厨房",
  "马来西亚", "新加坡", "印尼", "泰国", "越南", "中国", "台湾", "香港", "日本", "韩国", "美国",
] as const;

/** 可选的实体标签（机构、平台、品牌）。 */
export const ENTITY_TAGS = [
  "内陆税收局", "公积金局", "社险机构", "KPDN", "卫生部", "JAKIM", "人力资源部", "移民局", "国家银行", "统计局", "财政部",
  "Grab", "foodpanda", "ShopeeFood", "麦当劳", "肯德基", "星巴克", "蜜雪冰城", "瑞幸", "霸王茶姬", "ZUS Coffee", "Tealive",
] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  政策: "政策/法规", 法规: "政策/法规", 监管: "政策/法规", 法令: "政策/法规", 执法: "政策/法规", "政策/监管": "政策/法规", 预算案: "政策/法规", 财案: "政策/法规",
  平台: "平台动态", 平台更新: "平台动态",
  工具: "设备/科技", 新工具: "设备/科技", 新设备: "设备/科技", 新产品: "设备/科技", 产品更新: "设备/科技", 新功能: "设备/科技", "设备/工具": "设备/科技",
  行业: "行业动态", 动态: "行业动态", 公司动态: "行业动态", 并购: "行业动态", 收购: "行业动态", 人事: "行业动态", 业绩: "行业动态", 财报: "行业动态",
  市场: "市场/数据", 数据: "市场/数据", 报告: "市场/数据", 统计: "市场/数据", 调查: "市场/数据", 研究: "市场/数据", "数据/报告": "市场/数据", "成本/价格": "市场/数据",
  实战: "实战/经验", 经验: "实战/经验", 教程: "实战/经验", 技巧: "实战/经验", 方法: "实战/经验", 指南: "实战/经验", 案例: "实战/经验", 复盘: "实战/经验",
  观点: "观点/访谈", 访谈: "观点/访谈", 专访: "观点/访谈", 评论: "观点/访谈", 分析: "观点/访谈",
  菜单: "菜单/定价", 定价: "菜单/定价", 菜单设计: "菜单/定价", 菜单工程: "菜单/定价",
  营销: "营销/顾客", 推广: "营销/顾客", 社交媒体: "营销/顾客", 顾客: "营销/顾客", 复购: "营销/顾客", 回头客: "营销/顾客", 会员: "营销/顾客", "顾客/复购": "营销/顾客",
  成本: "成本/利润", 利润: "成本/利润", 毛利: "成本/利润", 财务: "成本/利润", 现金流: "成本/利润", "利润/财务": "成本/利润",
  食材: "食材/供应链", 原料: "食材/供应链", 供应链: "食材/供应链", 采购: "食材/供应链",
  人才: "人才/管理", 员工: "人才/管理", 员工管理: "人才/管理", 人力: "人才/管理", 排班: "人才/管理", 招聘: "人才/管理", 培训: "人才/管理", 薪酬: "人才/管理",
  最低薪金: "人才/管理", 最低工资: "人才/管理", 外籍劳工: "外劳", 外籍员工: "外劳",
  外卖: "外卖/平台", 外送: "外卖/平台", 送餐: "外卖/平台", 外卖平台: "外卖/平台", 云厨房: "外卖/平台",
  设备: "厨房设备", 厨具: "厨房设备", 装修: "店面/装修", 家具: "店面/装修", 店面设计: "店面/装修",
  收银系统: "科技/系统", 收银: "科技/系统", pos: "科技/系统", 支付: "科技/系统", 电子钱包: "科技/系统", 自动化: "科技/系统", 机器人: "科技/系统",
  食品安全: "食品安全/卫生", 食安: "食品安全/卫生", 卫生: "食品安全/卫生", 清洁: "食品安全/卫生", halal: "清真", 清真认证: "清真",
  税: "税务", 税收: "税务", 销售与服务税: "税务", sst: "税务", "e-invoice": "电子发票", 电子发票制度: "电子发票",
  公积金: "公积金/社险", 社险: "公积金/社险", epf: "公积金/社险", kwsp: "公积金/社险", socso: "公积金/社险", perkeso: "公积金/社险",
  执照: "执照/准证", 准证: "执照/准证", 营业执照: "执照/准证",
  租金: "租金/选址", 选址: "租金/选址", 电费: "水电/能源", 水电: "水电/能源", 能源: "水电/能源",
  贷款: "融资/贷款", 融资: "融资/贷款", 援助: "融资/贷款", 开店: "开店/加盟", 开业: "开店/加盟", 加盟: "开店/加盟", 扩张: "开店/加盟",
  关店: "关店/倒闭", 倒闭: "关店/倒闭", 结业: "关店/倒闭", 包装: "包装/环保", 环保: "包装/环保", 食物浪费: "包装/环保", 节日: "节庆",
  小贩: "小贩/食阁", 档口: "小贩/食阁", 食阁: "小贩/食阁", 夜市: "小贩/食阁", 茶室: "茶室/嘛嘛档", 咖啡店: "茶室/嘛嘛档", 茶餐室: "茶室/嘛嘛档", 嘛嘛档: "茶室/嘛嘛档",
  咖啡: "咖啡/茶饮", 茶饮: "咖啡/茶饮", 奶茶: "咖啡/茶饮", 咖啡馆: "咖啡/茶饮", 餐厅: "餐厅/酒楼", 酒楼: "餐厅/酒楼", 正餐: "餐厅/酒楼",
  烘焙: "烘焙/甜品", 甜品: "烘焙/甜品", 团膳: "团膳/中央厨房", 中央厨房: "团膳/中央厨房",
  大马: "马来西亚", 印度尼西亚: "印尼", 中国大陆: "中国",
};

/** 模型漏了分类标签时，按内容类型补一个。 */
export const CATEGORY_BY_ITEM_TYPE: Readonly<Record<string, string>> = {
  policy_change: "政策/法规", platform_update: "平台动态", tool_launch: "设备/科技", market_data: "市场/数据",
  industry_event: "行业动态", practice_howto: "实战/经验", opinion_analysis: "观点/访谈",
};

// ── 机构、平台与品牌 ────────────────────────────────────────────────────────────────────

/** 机构与品牌主题：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[] }> = {
  lhdn: { name: "内陆税收局 LHDN", displayTag: "内陆税收局", aliases: ["LHDN", "内陆税收局", "HASiL", "Inland Revenue Board"] },
  kwsp: { name: "公积金局 KWSP / EPF", displayTag: "公积金局", aliases: ["KWSP", "EPF", "公积金局"] },
  perkeso: { name: "社险机构 PERKESO / SOCSO", displayTag: "社险机构", aliases: ["PERKESO", "SOCSO", "社险机构"] },
  kpdn: { name: "国内贸易与生活成本部 KPDN", displayTag: "KPDN", aliases: ["KPDN", "国内贸易与生活成本部", "Domestic Trade and Cost of Living Ministry"] },
  kkm: { name: "卫生部 KKM", displayTag: "卫生部", aliases: ["KKM", "MOH", "卫生部"] },
  jakim: { name: "伊斯兰发展局 JAKIM", displayTag: "JAKIM", aliases: ["JAKIM", "伊斯兰发展局", "Islamic Development Department"] },
  kesuma: { name: "人力资源部 KESUMA", displayTag: "人力资源部", aliases: ["KESUMA", "人力资源部", "Ministry of Human Resources"] },
  imigresen: { name: "移民局 Imigresen", displayTag: "移民局", aliases: ["Imigresen", "移民局", "Immigration Department"] },
  bnm: { name: "国家银行 BNM", displayTag: "国家银行", aliases: ["BNM", "Bank Negara", "国家银行"] },
  dosm: { name: "统计局 DOSM", displayTag: "统计局", aliases: ["DOSM", "统计局", "Department of Statistics"] },
  mof: { name: "财政部 MOF", displayTag: "财政部", aliases: ["MOF", "财政部", "Ministry of Finance"] },
  grab: { name: "Grab", displayTag: "Grab", aliases: ["Grab", "GrabFood", "GrabPay"] },
  foodpanda: { name: "foodpanda", displayTag: "foodpanda", aliases: ["foodpanda"] },
  shopeefood: { name: "ShopeeFood", displayTag: "ShopeeFood", aliases: ["ShopeeFood"] },
  mcdonalds: { name: "麦当劳 McDonald's", displayTag: "麦当劳", aliases: ["McDonald's", "麦当劳"] },
  kfc: { name: "肯德基 KFC", displayTag: "肯德基", aliases: ["KFC", "肯德基"] },
  starbucks: { name: "星巴克 Starbucks", displayTag: "星巴克", aliases: ["Starbucks", "星巴克"] },
  mixue: { name: "蜜雪冰城 Mixue", displayTag: "蜜雪冰城", aliases: ["Mixue", "蜜雪冰城", "蜜雪集团"] },
  luckin: { name: "瑞幸咖啡 Luckin", displayTag: "瑞幸", aliases: ["Luckin", "瑞幸咖啡", "瑞幸"] },
  chagee: { name: "霸王茶姬 CHAGEE", displayTag: "霸王茶姬", aliases: ["CHAGEE", "霸王茶姬"] },
  zus: { name: "ZUS Coffee", displayTag: "ZUS Coffee", aliases: ["ZUS Coffee", "ZUS"] },
  tealive: { name: "Tealive", displayTag: "Tealive", aliases: ["Tealive", "Loob Holding"] },
};

/**
 * 身份词典：摘要和标题里出现的机构、平台或品牌，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 每个主体要把中、英、马来文的叫法都写进去：原文用英文或马来文、中文摘要用中文名时，两边要能认出是同一个主体。
 * 容易和普通词撞车的缩写（Grab、JIM、IRB、ZUS）区分大小写。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "lhdn", name: "内陆税收局 LHDN", patterns: [/\bLHDN(?:M)?\b|\bHASiL\b|Lembaga Hasil|内陆税收局|税收局|Inland Revenue/i, /\bIRB(?:M)?\b/] },
  { id: "kwsp", name: "公积金局 KWSP / EPF", patterns: [/\bKWSP\b|\bEPF\b|公积金|Provident Fund|Kumpulan Wang Simpanan Pekerja/i] },
  { id: "perkeso", name: "社险机构 PERKESO / SOCSO", patterns: [/PERKESO|\bSOCSO\b|社险|社会保险|Social Security|Keselamatan Sosial/i] },
  { id: "kpdn", name: "国内贸易与生活成本部 KPDN", patterns: [/\bKPDN(?:HEP)?\b|国内贸易(?:及|与)?(?:生活成本|生活费用?|消费人事务|民生事务)部|国贸(?:及|与)?(?:生活成本)?部|贸消部|Domestic Trade|Perdagangan Dalam Negeri/i] },
  { id: "kkm", name: "卫生部 KKM", patterns: [/\bKKM\b|卫生部|Ministry of Health|Health Minist(?:er|ry)|(?:Kementerian|Menteri) Kesihatan/i, /\bMOH\b/] },
  { id: "jakim", name: "伊斯兰发展局 JAKIM", patterns: [/JAKIM|伊斯兰(?:教)?发展局|Islamic Development Department|Jabatan Kemajuan Islam/i] },
  { id: "kesuma", name: "人力资源部 KESUMA", patterns: [/KESUMA|人力资源部|人资部|劳工局|Ministry of Human Resources|Human Resources? Minist(?:er|ry)|(?:Kementerian|Menteri) Sumber Manusia|Labour Department|Jabatan Tenaga Kerja|JTKSM/i, /\bMOHR\b/] },
  { id: "imigresen", name: "移民局 Imigresen", patterns: [/Imigresen|移民局|\bImmigration\b/i, /\bJIM\b/] },
  { id: "bnm", name: "国家银行 BNM", patterns: [/Bank Negara|国家银行|国行(?!版)/i, /\bBNM\b/] },
  { id: "dosm", name: "统计局 DOSM", patterns: [/DOSM|统计局|Department of Statistics|Statistics Department|Jabatan Perangkaan/i] },
  { id: "mof", name: "财政部 MOF", patterns: [/财政部|财长|Ministry of Finance|Finance Minist(?:er|ry)|(?:Kementerian|Menteri) Kewangan/i, /\bMOF\b/] },
  { id: "grab", name: "Grab", patterns: [/\bGrab(?:Food|Pay|Mart|Merchant|Express)?\b/] },
  { id: "foodpanda", name: "foodpanda", patterns: [/food\s?panda|熊猫外卖/i] },
  { id: "shopeefood", name: "ShopeeFood", patterns: [/shopee\s?food/i] },
  { id: "mcdonalds", name: "麦当劳 McDonald's", patterns: [/McDonald|麦当劳|麥當勞|Mekdi|金拱门/i, /\bMcD\b/] },
  { id: "kfc", name: "肯德基 KFC", patterns: [/肯德基|Kentucky Fried/i, /\bKFC\b/] },
  { id: "starbucks", name: "星巴克 Starbucks", patterns: [/Starbucks|星巴克/i] },
  { id: "mixue", name: "蜜雪冰城 Mixue", patterns: [/Mixue|蜜雪/i] },
  { id: "luckin", name: "瑞幸咖啡 Luckin", patterns: [/Luckin|瑞幸/i] },
  { id: "chagee", name: "霸王茶姬 CHAGEE", patterns: [/CHAGEE|霸王茶姬/i] },
  { id: "zus", name: "ZUS Coffee", patterns: [/ZUS Coffee/i, /\bZUS\b/] },
  { id: "tealive", name: "Tealive", patterns: [/Tealive|Loob Holding/i] },
];

/** 这些域名上的文章，发布方就是对应的机构或平台。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "lhdn", domains: ["hasil.gov.my"] },
  { entityId: "kwsp", domains: ["kwsp.gov.my"] },
  { entityId: "perkeso", domains: ["perkeso.gov.my"] },
  { entityId: "kpdn", domains: ["kpdn.gov.my"] },
  { entityId: "kkm", domains: ["moh.gov.my"] },
  { entityId: "jakim", domains: ["halal.gov.my", "islam.gov.my"] },
  { entityId: "kesuma", domains: ["mohr.gov.my"] },
  { entityId: "imigresen", domains: ["imi.gov.my"] },
  { entityId: "bnm", domains: ["bnm.gov.my"] },
  { entityId: "dosm", domains: ["dosm.gov.my"] },
  { entityId: "mof", domains: ["mof.gov.my"] },
  { entityId: "grab", domains: ["grab.com"] },
  { entityId: "foodpanda", domains: ["foodpanda.my"] },
];

/** 原文里的这些写法也算提到了对应主体。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
