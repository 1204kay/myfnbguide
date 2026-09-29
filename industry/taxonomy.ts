// 这个行业的分类体系：类别、标签词表、公司（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉模型怎么归类。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 * tip 和 opinion 两个 key 公开接口也认（v1 的 tip 同时包含 opinion），不要改名。
 */
export const CATEGORIES = [
  { key: "policy", label: "政策", section: "政策法规", guide: "税费、最低薪金、公积金与社险、执照准证、食品安全、清真认证、外劳政策的公布、生效与执法" },
  { key: "platform", label: "平台", section: "平台与工具", guide: "外卖平台、支付与电子钱包、银行融资的费率、规则与服务变化" },
  { key: "tools", label: "工具", section: "平台与工具", guide: "收银与管理软件、厨房设备、政府网上系统等新工具与功能" },
  { key: "industry", label: "行业", section: "行业动态", guide: "品牌开店关店、进入或退出大马、连锁扩张、并购与人事" },
  { key: "cost", label: "成本与数据", section: "行业动态", guide: "食材、租金、水电等价格变化，统计局数据，行业调查与报告" },
  { key: "tip", label: "实战", section: "实战与观点", guide: "定价、控成本、排班、营销、外卖运营、开业流程等能照做的方法与经验" },
  { key: "opinion", label: "观点", section: "实战与观点", guide: "业内人士观点、访谈、趋势分析" },
] as const;

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给五个维度不同的权重。
 */
export const ITEM_TYPES = ["policy_change", "platform_update", "tool_launch", "cost_data", "industry_event", "practice_howto", "opinion_analysis"] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一。 */
export const CATEGORY_TAGS = ["政策/法规", "平台动态", "新工具", "行业动态", "成本/价格", "数据/报告", "实战/经验", "观点/访谈", "其他"] as const;

/** 可选的主题标签。 */
export const TOPIC_TAGS = [
  "外卖", "人力/排班", "外劳", "税务", "电子发票", "公积金/社险", "执照/准证", "食品安全", "清真", "食材", "定价", "营销", "支付", "收银系统",
  "融资/贷款", "租金/选址", "水电/能源", "节庆", "开业",
] as const;

/** 可选的实体标签（机构、平台）。 */
export const ENTITY_TAGS = [
  "内陆税收局", "公积金局", "社险机构", "KPDN", "卫生部", "JAKIM", "人力资源部", "移民局", "国家银行", "统计局", "财政部", "Grab", "foodpanda", "ShopeeFood",
] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  政策: "政策/法规", 法规: "政策/法规", 监管: "政策/法规", 法令: "政策/法规", 执法: "政策/法规", "政策/监管": "政策/法规", 预算案: "政策/法规", 财案: "政策/法规",
  平台: "平台动态", 平台更新: "平台动态", 外卖平台: "平台动态",
  工具: "新工具", 新产品: "新工具", 产品更新: "新工具", 新功能: "新工具",
  行业: "行业动态", 动态: "行业动态", 公司动态: "行业动态", 连锁: "行业动态", 并购: "行业动态", 收购: "行业动态", 人事: "行业动态",
  成本: "成本/价格", 价格: "成本/价格", 物价: "成本/价格", 涨价: "成本/价格",
  数据: "数据/报告", 报告: "数据/报告", 统计: "数据/报告", 调查: "数据/报告", 研究: "数据/报告",
  实战: "实战/经验", 经验: "实战/经验", 教程: "实战/经验", 技巧: "实战/经验", 方法: "实战/经验", 指南: "实战/经验", "教程/实践": "实战/经验",
  观点: "观点/访谈", 访谈: "观点/访谈", 评论: "观点/访谈", 分析: "观点/访谈", 趋势: "观点/访谈", "现象/趋势": "观点/访谈",
  外送: "外卖", 送餐: "外卖", 人力: "人力/排班", 排班: "人力/排班", 员工: "人力/排班", 招聘: "人力/排班", 最低薪金: "人力/排班", 最低工资: "人力/排班",
  外籍劳工: "外劳", 外籍员工: "外劳", 税: "税务", 税收: "税务", 销售与服务税: "税务", sst: "税务", "e-invoice": "电子发票", 电子发票制度: "电子发票",
  公积金: "公积金/社险", 社险: "公积金/社险", epf: "公积金/社险", kwsp: "公积金/社险", socso: "公积金/社险", perkeso: "公积金/社险",
  执照: "执照/准证", 准证: "执照/准证", 营业执照: "执照/准证", 卫生: "食品安全", 食安: "食品安全", halal: "清真", 清真认证: "清真",
  原料: "食材", 食材价格: "食材", 菜单: "定价", 推广: "营销", 社交媒体: "营销", 电子钱包: "支付", 收款: "支付", pos: "收银系统", 收银: "收银系统",
  贷款: "融资/贷款", 融资: "融资/贷款", 租金: "租金/选址", 选址: "租金/选址", 电费: "水电/能源", 水电: "水电/能源", 能源: "水电/能源", 节日: "节庆", 创业: "开业",
};

/** 模型漏了分类标签时，按内容类型补一个。 */
export const CATEGORY_BY_ITEM_TYPE: Readonly<Record<string, string>> = {
  policy_change: "政策/法规", platform_update: "平台动态", tool_launch: "新工具", cost_data: "成本/价格",
  industry_event: "行业动态", practice_howto: "实战/经验", opinion_analysis: "观点/访谈",
};

// ── 机构与平台 ──────────────────────────────────────────────────────────────────────────

/** 机构与平台主题：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。 */
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
};

/**
 * 身份词典：摘要和标题里出现的机构或平台，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 每个主体要把中、英、马来文的叫法都写进去：原文用英文或马来文、中文摘要用中文名时，两边要能认出是同一个主体。
 * 容易和普通词撞车的缩写（Grab、JIM、IRB）区分大小写。
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
