// What a small restaurant owner runs into, in six groups: the skeleton the reference pages hang on. Each
// situation has a page; its groups are the causes or ways in that its cases fall under. Slugs and keys
// are addresses and stored placements: never renamed once public (a title may change). Read by the case
// writer (which places each case) and by the pages.

export interface SituationGroup {
  key: string;
  title: string;
  /** One line under the group's heading. */
  line: string;
}

export interface Situation {
  slug: string;
  category: CategoryKey;
  title: string;
  /** One sentence under the title. */
  dek: string;
  groups: SituationGroup[];
}

export const CATEGORIES = [
  { key: "cost", title: "成本与利润" },
  { key: "people", title: "人员与团队" },
  { key: "customers", title: "顾客与营销" },
  { key: "operations", title: "门店运营" },
  { key: "open-close", title: "开店与关店" },
  { key: "tools-rules", title: "工具与法规" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

const g = (key: string, title: string, line: string): SituationGroup => ({ key, title, line });

export const SITUATIONS: Situation[] = [
  // 成本与利润
  { slug: "busy-no-profit", category: "cost", title: "生意很忙，钱却留不下来", dek: "客人不少、订单不断，月底却没剩多少钱。钱从哪里漏掉，各地店家怎么堵住。", groups: [
    g("food-over-recipe", "食材用得比配方多", "分量、浪费、进货出错，差出来的钱没有变成营业额"),
    g("fixed-costs-creep", "固定费用悄悄上涨", "每月自动付的钱，一次涨一点，几年就是一大笔"),
    g("commission-rent", "抽成和房租太重", "订单再多，扣掉平台抽成和房租也可能不够"),
  ] },
  { slug: "read-the-numbers", category: "cost", title: "看不懂自己的账", dek: "营业额天天看，利润、毛利、保本点却说不清。各地店主每月先看哪几个数。", groups: [
    g("monthly-numbers", "每月先看的几个数", "营业额以外，哪几个数字说明店里的钱怎么样"),
    g("margin-breakeven", "毛利和保本点", "每份赚多少，一个月至少要卖多少"),
    g("profit-vs-cash", "账上的利润和手上的现金", "账上赚了，手上的钱却不够用"),
  ] },
  { slug: "ingredient-prices-up", category: "cost", title: "食材涨价，售价跟不跟着调", dek: "主要食材一涨再涨，自己承担还是让客人分担。", groups: [
    g("measure-the-hit", "先算清楚影响多大", "涨的是哪几样，占每份成本多少"),
    g("menu-portion", "调整菜单和分量", "换做法、换食材、改分量，客人能不能接受"),
    g("suppliers", "换货源、跟供货商谈", "比价、合并订货、谈条件"),
  ] },
  { slug: "pricing", category: "cost", title: "菜单怎么定价", dek: "定低了不赚钱，定高了怕客人不来。", groups: [
    g("cost-based", "按成本算", "从食材和人工算出每道菜的底价"),
    g("what-guests-pay", "看客人愿意付多少", "同一道菜，在不同的店、不同的时段，客人愿意付的不一样"),
    g("raise-prices", "怎样涨价", "涨多少、什么时候涨、怎么让客人知道"),
    g("menu-layout", "菜单的结构和摆放", "菜单上放在哪里、怎么写，影响客人点什么"),
  ] },
  { slug: "cash-flow", category: "cost", title: "账上有利润，手上没现金", dek: "每月看起来在赚钱，付房租、发工资时却总是不够。", groups: [
    g("cash-tied-up", "钱被什么占住", "预付、库存、欠款，把现金占住了"),
    g("reserve", "留出周转的钱", "手上至少要留多少，怎么留"),
    g("borrowing", "借钱和还款", "什么时候借、向谁借、怎么还"),
  ] },
  { slug: "waste", category: "cost", title: "浪费和损耗太多", dek: "备多了扔，备少了缺，过期和报损一直发生。", groups: [
    g("ordering-prep", "订货和备料", "按什么决定订多少、备多少"),
    g("storage", "储存和先进先出", "标日期、分区放，过期的少了"),
    g("reuse", "剩下的食材怎么处理", "边角料和当天没卖完的"),
  ] },
  { slug: "rent", category: "cost", title: "房租太高或要涨", dek: "房租占营业额越来越多，续约时房东又要加价。", groups: [
    g("negotiate", "续约前怎么谈", "提前多久谈、拿什么谈"),
    g("is-it-worth", "这个位置还值不值", "算清楚房租换来了多少客人"),
    g("move-or-stay", "搬还是不搬", "搬家的成本和风险"),
  ] },
  { slug: "delivery-margin", category: "cost", title: "外卖平台抽成太高", dek: "外卖单量不少，扣掉抽成和包装，一单剩不了多少。", groups: [
    g("per-order-math", "算清楚每单剩多少", "抽成、包装、食材扣完以后"),
    g("delivery-pricing", "外卖单独定价和菜单", "外卖卖的和堂食不一样"),
    g("own-channels", "把客人引到自己的渠道", "自己的订餐方式、熟客和大单"),
  ] },
  { slug: "utilities", category: "cost", title: "水电燃气费越来越高", dek: "能源价格上涨，厨房设备耗电耗气。", groups: [
    g("where-it-goes", "算清楚花在哪里", "哪几台设备、哪些时段用得最多"),
    g("habits-equipment", "设备和使用习惯", "开关时间、保养、换设备"),
    g("contracts", "合同和价格", "换供应商、换计费方式"),
  ] },

  // 人员与团队
  { slug: "hiring", category: "people", title: "招不到人", dek: "招聘启事贴出去没人来，来了也做不久。", groups: [
    g("where-to-find", "去哪里找人", "招聘网站以外的门路"),
    g("interview", "招聘启事和面试", "怎么写、怎么问，招到对的人"),
    g("fewer-hands", "少依赖人手的做法", "改流程、改菜单、用设备"),
  ] },
  { slug: "retention", category: "people", title: "员工留不住", dek: "新人来了又走，老员工也在考虑离开。", groups: [
    g("beyond-pay", "薪水以外的理由", "留住人的从来不只是薪水"),
    g("first-weeks", "头几周怎么带", "新人最容易在头几周离开"),
    g("workload", "排班和工作量", "工作量长期过大，人就会离开"),
  ] },
  { slug: "key-person-leaves", category: "people", title: "厨师或骨干突然离职", dek: "主厨或店长一走，菜的味道和店里的运转都受影响。", groups: [
    g("write-it-down", "把配方和流程写下来", "不只存在一个人的脑子里"),
    g("backup-person", "培养第二个人", "每个关键岗位至少两个人会做"),
    g("handover", "离职以后怎么接上", "人走了，店照常运转"),
  ] },
  { slug: "training", category: "people", title: "新人怎么带", dek: "老员工没时间教，新人学得慢、出错多。", groups: [
    g("step-by-step", "分步骤教", "一次只教一件事"),
    g("standards", "把标准写下来", "照着做就对，不靠师傅的记性"),
    g("feedback", "检查和反馈", "做得对不对，及时告诉他"),
  ] },
  { slug: "wrong-person", category: "people", title: "员工不合适，要不要辞退", dek: "能力或态度有问题的人，留着影响团队，辞退又怕缺人。", groups: [
    g("the-line", "标准和底线", "什么行为不能容忍"),
    g("difficult-talk", "怎么谈", "说清楚问题，给改的机会"),
    g("after", "辞退以后", "团队和排班怎么接上"),
  ] },
  { slug: "scheduling", category: "people", title: "排班总是缺人", dek: "高峰时人不够，平时又闲着，人工成本也压不下来。", groups: [
    g("by-traffic", "按客流排班", "看每个时段的客人数排人"),
    g("multi-role", "一人多岗", "学会几个岗位，忙时互相补位"),
    g("flexible-help", "临时人手", "兼职、钟点工和应急的办法"),
  ] },
  { slug: "labor-costs", category: "people", title: "人工成本上涨", dek: "最低工资和薪资一涨再涨，人工占营业额越来越多。", groups: [
    g("measure", "算清楚多出多少", "占营业额多少，每月多付多少"),
    g("productivity", "提高每个人的产出", "流程和分工"),
    g("prices-hours", "调整价格和营业时间", "哪些时段值得开"),
  ] },
  { slug: "owner-overload", category: "people", title: "老板自己累垮", dek: "什么事都要老板亲自做，一天工作十几个小时，店离不开人。", groups: [
    g("runs-without-you", "店离开你还转得动吗", "哪些事只有老板会做"),
    g("delegate", "把工作交出去", "交给谁、怎么交、交了以后怎么看"),
    g("owner-time", "老板自己的时间和健康", "休息、家人和长期的打算"),
  ] },
  { slug: "partners", category: "people", title: "合伙开店", dek: "合伙人怎么选、钱和权怎么分、不合时怎么拆伙。", groups: [
    g("choose", "怎么选合伙人", "合得来的朋友不一定是好的合伙人"),
    g("split", "怎么分钱分工", "出钱、出力、做决定，事先说清楚"),
    g("exit", "怎么拆伙", "退出的规则先写好"),
  ] },

  // 顾客与营销
  { slug: "regulars", category: "customers", title: "熟客不再来", dek: "来过一次的客人很多，再来的很少。", groups: [
    g("reminders", "提醒比奖励有效", "客人多半只是忘了你"),
    g("loyalty", "会员和积分", "积分、储值、会员俱乐部"),
    g("recognize", "记住客人", "叫得出名字、记得他点什么"),
  ] },
  { slug: "slow-weekdays", category: "customers", title: "周末满，平日冷清", dek: "周末排队，平日空着一半的座位。", groups: [
    g("weekday-reasons", "给平日一个来的理由", "只在平日有的东西"),
    g("time-pricing", "按时段定价和套餐", "冷清的时段卖什么、卖多少钱"),
    g("new-guests", "找新的客群", "平日有空的是哪些人"),
  ] },
  { slug: "bad-reviews", category: "customers", title: "遇到差评", dek: "网上一条差评，影响新客人的判断。", groups: [
    g("respond", "怎么回复", "回不回、怎么回、多快回"),
    g("find-cause", "找出原因", "差评里说的是不是真的问题"),
    g("prevent", "避免再发生", "改流程，而不只是道歉"),
  ] },
  { slug: "small-budget-marketing", category: "customers", title: "营销预算很少", dek: "钱不多，不知道该花在社交媒体、平台广告还是店门口。", groups: [
    g("first-moves", "先做什么", "钱少时最先花在哪里"),
    g("social", "社交媒体", "拍什么、发多少、谁来做"),
    g("local", "店门口和附近的人", "招牌、门口和周边的店"),
  ] },
  { slug: "delivery-ratings", category: "customers", title: "外卖评分下降", dek: "外卖评分一降，平台曝光和订单跟着减少。", groups: [
    g("packaging", "包装和出餐", "送到客人手里时的样子"),
    g("reply", "回复评价", "差评下面怎么回"),
    g("delivery-menu", "外卖菜单", "适合外送的菜"),
  ] },
  { slug: "takeout", category: "customers", title: "想加做外带或外卖", dek: "店里已经有堂食，想多卖外带和外卖，厨房、人手和账都要重新算。", groups: [
    g("what-to-sell", "卖哪些菜、怎么包装", "放一段时间还好吃、好拿的菜"),
    g("pricing-costs", "外带的定价和成本", "容器、包装和平台抽成都算进去"),
    g("kitchen-flow", "厨房和人手接得住吗", "堂食和外带挤在同一个厨房"),
  ] },
  { slug: "competition", category: "customers", title: "附近开了竞争对手", dek: "隔壁开了同类的店，或大品牌降价抢客人。", groups: [
    g("no-price-war", "不打价格战的做法", "不降价，留住客人"),
    g("be-different", "找出自己的不同", "客人为什么来你这里"),
    g("price-war", "遇到价格战", "大品牌下沉、降价以后"),
  ] },
  { slug: "ticket-size", category: "customers", title: "客单价太低", dek: "客人不少，每人花的钱却不多。", groups: [
    g("menu-design", "菜单设计", "放在显眼位置的是哪些菜"),
    g("staff-suggest", "服务员推荐", "推荐什么、怎么说"),
    g("bundles", "套餐和加购", "多点一样的理由"),
  ] },
  { slug: "hospitality", category: "customers", title: "菜不差，客人却不一定再来", dek: "菜的味道以外，客人在店里受到的对待，也决定了他会不会再来。", groups: [
    g("reasonable-hospitality", "合理的款待", "让客人觉得被照顾"),
    g("small-details", "小细节", "进门、等位、结账时的细节"),
    g("complaints", "处理抱怨", "客人当场不满意时"),
  ] },

  // 门店运营
  { slug: "rush-chaos", category: "operations", title: "午市高峰一到，出餐就乱", dek: "平时一切顺畅，一到高峰就出餐变慢、员工互相挡路、客人久等。", groups: [
    g("crossing-paths", "路线撞在一起", "出餐和收碗走同一条路，员工的时间花在互相让路上"),
    g("searching-shouting", "人在找东西、在喊叫", "物料不在手边、分工不清楚，高峰时就有人离开岗位"),
    g("seats-vs-kitchen", "座位比出餐快", "一次进来的客人超过厨房出得了的量"),
  ] },
  { slug: "consistency", category: "operations", title: "出品不稳定", dek: "同一道菜，不同人做、不同天做，味道和分量都不一样。", groups: [
    g("recipes", "标准配方", "写清楚用量和做法"),
    g("prep", "备料", "备好的料决定了出品"),
    g("checks", "检查", "出餐前谁来看、看什么"),
  ] },
  { slug: "layout", category: "operations", title: "店面和厨房怎么布置", dek: "装修好看，用起来却不顺手。", groups: [
    g("full-house", "按满座时的运转设计", "坐满的时候人和货怎么走"),
    g("flows", "动线", "客人、员工、外卖员、送货的路线"),
    g("equipment-place", "设备放在哪里", "伸手可及，少走一步"),
  ] },
  { slug: "food-safety", category: "operations", title: "食品安全和卫生", dek: "温度、清洁、过敏原，一次出事就可能停业。", groups: [
    g("temperature", "温度控制", "冷藏、加热和保温"),
    g("cleaning", "清洁", "每天、每周要做的事"),
    g("allergens", "过敏原和记录", "问清楚、标清楚、记下来"),
  ] },
  { slug: "menu-size", category: "operations", title: "菜单太长", dek: "菜单越加越多，备料复杂、浪费增加。", groups: [
    g("what-to-cut", "删哪些菜", "按销量和利润决定"),
    g("menu-engineering", "看每道菜的销量和利润", "哪些菜卖得多又赚得多"),
    g("shared-ingredients", "共用食材", "一样食材用在几道菜里"),
  ] },
  { slug: "inventory", category: "operations", title: "订货和库存说不清", dek: "不是缺货就是积压，账上的库存和架上的不一样。", groups: [
    g("how-much", "订多少", "按销量和备料订货"),
    g("counting", "盘点", "多久盘一次、怎么盘"),
    g("deliveries-invoices", "收货和账单", "收货时核对，账单逐行看"),
  ] },
  { slug: "equipment", category: "operations", title: "设备怎么选、坏了怎么办", dek: "设备一坏，生意就停。", groups: [
    g("choose", "怎么选", "买新的、买二手还是租"),
    g("maintain", "保养", "定期做的保养"),
    g("breakdown", "坏了以后", "临时的办法和维修"),
  ] },
  { slug: "front-of-house", category: "operations", title: "点餐、上菜、结账太慢", dek: "厨房出得了，客人却在等点餐、等上菜、等结账。", groups: [
    g("ordering", "点餐", "点餐方式和菜单"),
    g("serving", "上菜", "谁送、怎么送"),
    g("payment", "结账", "结账的方式和位置"),
  ] },

  // 开店与关店
  { slug: "opening-cost", category: "open-close", title: "开一家店要多少钱", dek: "装修、设备、押金、开业前的周转金，加起来常常超出预算。", groups: [
    g("build-out", "装修和设备", "最大的一笔开支"),
    g("working-capital", "开业前后的周转金", "开业以后几个月还要付的钱"),
    g("by-format", "不同店型的开店成本", "摊位、小店、正式餐厅各要多少"),
  ] },
  { slug: "location", category: "open-close", title: "店开在哪里", dek: "位置决定了客流，也决定了房租。", groups: [
    g("traffic", "看客流", "什么时段、什么人经过"),
    g("lease", "租约条款", "签约前要看清楚的地方"),
    g("neighborhood", "周边和竞争", "附近的店和住户"),
  ] },
  { slug: "first-months", category: "open-close", title: "开业头几个月", dek: "开业后客人不如预期，或忙到顾不过来。", groups: [
    g("soft-opening", "试营业", "正式开业前先试"),
    g("first-90-days", "头 90 天", "这段时间最常见的问题"),
    g("adjust", "根据数字调整", "看哪些数、改哪里"),
  ] },
  { slug: "not-breaking-even", category: "open-close", title: "开业很久还没回本", dek: "半年、一年过去了，还在亏钱，坚持还是止损。", groups: [
    g("when-to-stop", "什么时候该停", "止损的信号"),
    g("turnaround", "调整的做法", "换菜单、换时段、换做法"),
    g("closing-well", "关店怎么做", "员工、房东、供货商和欠款"),
  ] },
  { slug: "second-shop", category: "open-close", title: "想开第二家店", dek: "第一家店做起来以后，很多经营者会考虑再开一家。", groups: [
    g("people-systems", "人和制度跟不上", "老板一个人顾不过来，靠的是写下来的制度和专业的人"),
    g("more-not-richer", "开得多，不等于赚得多", "店多了，费用也多了"),
    g("ready-signs", "什么时候可以开", "第一家要做到什么程度"),
  ] },
  { slug: "franchise", category: "open-close", title: "加盟还是自己做", dek: "加盟省事，但费用、合同和自主权都要算清楚。", groups: [
    g("costs", "加盟的费用", "加盟费、管理费和进货价"),
    g("contract", "合同里的条款", "签之前要看清楚的地方"),
    g("franchisee-stories", "加盟主的经历", "做加盟的人怎么说"),
  ] },
  { slug: "small-formats", category: "open-close", title: "摊位、外卖店、共享厨房适不适合", dek: "店小、房租低，适不适合自己的生意。", groups: [
    g("kiosk", "摊位和小店", "小面积怎么做"),
    g("delivery-only", "只做外卖", "没有门面的店"),
    g("shared-kitchen", "共享厨房和快闪", "先试再开店"),
  ] },
  { slug: "renovation", category: "open-close", title: "装修超支、工期拖延", dek: "装修的钱和时间，常常比计划多出一截。", groups: [
    g("budget", "预算", "钱花在哪里、留多少余地"),
    g("contractors", "找设计和施工", "怎么找、怎么签"),
    g("timeline", "工期", "拖延的原因和对策"),
  ] },

  // 工具与法规
  { slug: "pos-system", category: "tools-rules", title: "收银和管理系统", dek: "系统选错了换起来麻烦，选对了能省很多事。", groups: [
    g("choose", "怎么选", "要看的功能和费用"),
    g("switching", "要不要换", "换系统的时机和成本"),
    g("using-data", "用好系统里的数字", "销量、时段、客人"),
  ] },
  { slug: "ai-tools", category: "tools-rules", title: "用 AI 处理店里的事", dek: "记账、写菜单、排班、回复评价，各地店家让 AI 做到了哪一步。", groups: [
    g("numbers", "整理数字", "账、费用和销量"),
    g("writing", "文案和菜单", "菜单、介绍、回复"),
    g("training", "带新人和对练", "训练和问答"),
  ] },
  { slug: "platform-rules", category: "tools-rules", title: "平台改了规则", dek: "外卖、点评和订位平台改了费率、排序或规则，店家怎么应对。", groups: [
    g("fees", "费率和抽成", "多付了多少"),
    g("ranking", "排名和曝光", "平台上的位置"),
    g("own-channel", "自己的渠道", "不全靠平台"),
  ] },
  { slug: "payments", category: "tools-rules", title: "收款和营业款", dek: "收款方式、手续费，以及收款公司出问题时的营业款。", groups: [
    g("fees", "手续费", "每笔付出去多少"),
    g("risks", "收款公司的风险", "营业款被压住或拿不回来"),
    g("reconcile", "现金和对账", "每天的钱对得上"),
  ] },
  { slug: "contracts", category: "tools-rules", title: "合同和账单里的风险", dek: "租约、供应商合同、服务合同里的条款，签的时候没注意。", groups: [
    g("leases", "租约", "租金调整、续约和退租"),
    g("supplier-contracts", "供应商和服务合同", "涨价条款和最低用量"),
    g("auto-renew", "自动续约和自动扣款", "没人看的账单"),
  ] },
  { slug: "automation", category: "tools-rules", title: "设备和自动化能省多少人", dek: "自助点餐、炒菜机、洗碗机，投入多少、能省多少。", groups: [
    g("payback", "投入和回本", "多久收回成本"),
    g("what-works", "哪些环节适合", "交给机器的是哪一段"),
    g("acceptance", "员工和客人的接受程度", "用起来的实际情况"),
  ] },
  { slug: "online-presence", category: "tools-rules", title: "地图、点评网站和自己的网页", dek: "很多客人先在地图和点评网站上找到你。", groups: [
    g("maps", "地图和店铺资料", "营业时间、照片、菜单"),
    g("review-sites", "点评网站", "上面的资料和评价"),
    g("website", "自己的网页和订位", "不经过平台的入口"),
  ] },
];

export function findSituation(slug: string): Situation | undefined {
  return SITUATIONS.find((s) => s.slug === slug);
}

export function categoryTitle(key: string): string | undefined {
  return CATEGORIES.find((c) => c.key === key)?.title;
}

/**
 * 店型: the kind of shop a case is about, after the taxonomy's 业态 tags (industry/taxonomy.ts) in standard
 * written words ("/" written 和). Settled 10/5 from 40 classification tables (myfnb/research-2026-10-05-shop-types.md):
 * most say what a shop mainly sells; 摊位和餐车 is the form and 团餐和宴会承办 who the customer is, and those two
 * are judged first (prompts/case.md). The writer picks one or none. The shop page names it; no page lists or
 * counts by it until the library is thick enough in most kinds (layout J0, J5).
 */
export const SHOP_KINDS = [
  { slug: "stalls", title: "摊位和餐车", dek: "在摊位或餐车上做生意的，不论卖什么：路边摊、夜市摊、小贩中心和美食广场里的摊位、咖啡店里租的摊位、餐车。" },
  { slug: "snacks", title: "小吃", dek: "有门面、专做面、粉、饺子、煎饼、卤味这类一两样传统食物的小店。" },
  { slug: "fast-food", title: "快餐", dek: "柜台点餐、先付款、出餐快的店：汉堡炸鸡、米饭快餐、便当和经济饭。" },
  { slug: "dining", title: "正餐", dek: "服务员点菜上菜、吃完再付款的餐馆，从社区小馆到高级餐厅。" },
  { slug: "hotpot", title: "火锅", dek: "顾客在桌上自己涮煮食材的店。" },
  { slug: "coffee", title: "咖啡", dek: "主要卖咖啡的店，包括马来西亚、新加坡的传统咖啡店。" },
  { slug: "tea", title: "茶饮", dek: "主要卖现做的茶和其他饮料的店：奶茶、果茶、现泡茶、凉茶、果汁。" },
  { slug: "bakery", title: "烘焙和甜品", dek: "卖面包、蛋糕、西点和各种甜品的店，包括糖水和冰品。" },
  { slug: "bar", title: "酒吧和酒馆", dek: "主要卖酒的店：酒吧、小酒馆、餐酒吧、居酒屋。" },
  { slug: "catering", title: "团餐和宴会承办", dek: "不靠散客上门，按合同为公司、学校、医院供餐，或上门承办宴会和活动餐饮。" },
] as const;

export type ShopKind = (typeof SHOP_KINDS)[number]["slug"];

export function findShopKind(slug: string | null | undefined) {
  return SHOP_KINDS.find((k) => k.slug === slug);
}

/**
 * The sources that are one owner's own blog or podcast, and how every page names that owner's shop (without the
 * country, which the line writes before it). The writer names the shop afresh in each story: 10/10 one owner's blog
 * read as four shops under ten names, and 「12 家店」 stood on six. So the source says who speaks. Entered with the
 * source, from its profile (HANDOFF §5.4); a show whose host interviews other owners is not one of these.
 */
export const OWNERS: Record<string, string> = {
  "rss-ryourigaka": "京都一家意大利小酒馆",
  "rss-yoshitencho": "柏市一家泰式咖啡馆",
  "rss-kojinkuroji": "一位个体餐饮店店主",
  "pod-your-life-and-restaurant": "一位家庭餐馆老板",
  "pod-cat-and-cloud": "圣克鲁斯一家咖啡店",
  "pod-bread-winner": "一位微型面包店店主",
  "pod-a-meal-and-two-mics": "圣马特奥一家古巴餐厅",
  "pod-vegan-east": "明尼阿波利斯一家纯素烘焙店",
  "pod-bar-pod": "桑达斯基的两家酒吧",
  "pod-coffee-and-cows": "得克萨斯州一家咖啡店",
  "pod-de-brandherd-esskultur": "汉堡一家餐厅",
};
