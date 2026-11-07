// What a small restaurant owner runs into, in six groups: the skeleton the reference pages hang on. Each
// situation has a page; its groups are the causes or ways in that its cases fall under. Slugs and keys
// are addresses and stored placements: never renamed once public (a title may change); a group is dropped only once its
// placements are moved (11-03: myfnb/replace-placements-2026-11-03.ts). Read by the case
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
  { slug: "busy-no-profit", category: "cost", title: "生意忙碌，却没有盈余", dek: "客人不少、订单不断，月底却所剩无几。钱从哪里流失，各地店家如何应对。", groups: [
    g("where-it-leaks", "钱从哪里流失？", "营业额上涨、钱却没有留下的店，常有几个共同点"),
    g("food-over-recipe", "食材是否用得比配方多？", "分量、浪费、进货出错，差出来的钱没有变成营业额"),
    g("fixed-costs-creep", "固定费用是否悄悄上涨？", "每月自动支付的费用每次小幅上涨，几年下来累积成一笔可观的开支"),
  ] },
  { slug: "read-the-numbers", category: "cost", title: "看不懂自己的账目", dek: "每天都看营业额，利润、毛利和保本点却说不清楚。各地店主每月先看哪几个数字。", groups: [
    g("monthly-numbers", "每月先看哪几个数字？", "营业额以外，哪几个数字反映店里的资金状况"),
    g("margin-breakeven", "毛利与保本点怎样算？", "每份赚多少，一个月至少要卖多少"),
  ] },
  { slug: "ingredient-prices-up", category: "cost", title: "食材涨价如何应对", dek: "主要食材一涨再涨，是自己承担、让客人分担，还是调整做法和分量、更换货源。", groups: [
    g("measure-the-hit", "涨价的影响有多大？", "涨的是哪几样，占每份成本多少"),
    g("menu-portion", "菜单与分量怎样调整？", "换做法、换食材、改分量，客人能不能接受"),
    g("suppliers", "能否换货源、与供货商谈？", "比价、合并订货、谈条件"),
  ] },
  { slug: "pricing", category: "cost", title: "菜单如何定价", dek: "定价低了没有利润，定价高了又怕客人不来。", groups: [
    g("cost-based", "按成本怎样算底价？", "从食材和人工算出每道菜的底价"),
    g("what-guests-pay", "客人愿意付多少？", "同一道菜，在不同的店、不同的时段，客人愿意付的不一样"),
    g("menu-layout", "菜单怎样排能引导点菜？", "菜品在菜单上的位置和写法，影响客人点什么"),
    g("raise-prices", "成本上涨时怎样涨价？", "涨多少、何时涨、如何告知客人"),
  ] },
  { slug: "cash-flow", category: "cost", title: "账面有利润，手上却没有现金", dek: "每月看起来在赚钱，付房租、发工资时却总是不够。", groups: [
    g("cash-tied-up", "现金被什么占用？", "预付款、库存和未收回的款项占用了现金"),
    g("reserve", "周转金该留多少？", "至少预留多少现金、如何预留"),
    g("borrowing", "不够时怎样借、怎样还？", "何时借、向谁借、如何还"),
  ] },
  { slug: "waste", category: "cost", title: "浪费和损耗过多", dek: "备料多了要丢弃，少了又缺货，过期和报损时常发生。", groups: [
    g("ordering-prep", "订货与备料怎样减少浪费？", "按什么决定订多少、备多少"),
    g("storage", "进货后怎样储存与用剩料？", "标日期、分区放；边角料和当天剩余食材的用法"),
  ] },
  { slug: "rent", category: "cost", title: "房租过高或即将上涨", dek: "房租占营业额越来越多，续约时房东又要加价。", groups: [
    g("is-it-worth", "这个位置值这份租金吗？", "算清楚房租换来了多少客人"),
    g("negotiate", "续约前怎样洽谈？", "提前多久谈、拿什么谈"),
    g("move-or-stay", "是否该迁址？", "迁址的成本和风险"),
  ] },
  { slug: "delivery-margin", category: "cost", title: "外卖平台抽成过高", dek: "外卖单量不少，扣除抽成和包装，每单所剩无几。", groups: [
    g("per-order-math", "每单实际余下多少？", "扣除抽成、包装和食材以后"),
    g("delivery-pricing", "外卖该怎样单独定价？", "外卖所售与堂食不同"),
    g("own-channels", "怎样把客人引到自家渠道？", "自己的订餐方式、熟客和大单"),
  ] },
  { slug: "utilities", category: "cost", title: "水电燃气费持续上涨", dek: "能源价格上涨，厨房设备耗电耗气。", groups: [
    g("where-it-goes", "钱花在哪些地方？", "哪几台设备、哪些时段用得最多"),
    g("habits-equipment", "设备与习惯怎样省？", "开关时间、保养、换设备"),
    g("contracts", "合同与价格能否重谈？", "换供应商、换计费方式"),
  ] },

  // 人员与团队
  { slug: "hiring", category: "people", title: "招聘困难", dek: "招聘启事发布后无人应聘，入职的人也很快离开。", groups: [
    g("where-to-find", "去哪里找人？", "招聘网站以外的门路"),
    g("interview", "启事与面试怎样做？", "如何写启事、如何提问，招到合适的人"),
    g("fewer-hands", "招不到时怎样少用人？", "改流程、改菜单、用设备"),
  ] },
  { slug: "retention", category: "people", title: "员工流失", dek: "新人来了又走，老员工也在考虑离开。", groups: [
    g("first-weeks", "头几周怎样带新人？", "新人最容易在头几周离开"),
    g("workload", "排班与工作量合理吗？", "工作量长期过大，人就会离开"),
    g("beyond-pay", "薪水以外，靠什么留人？", "留住人的从来不只是薪水"),
  ] },
  { slug: "key-person-leaves", category: "people", title: "厨师或骨干突然离职", dek: "主厨或店长一走，菜的味道和店里的运转都受影响。", groups: [
    g("write-it-down", "配方与流程写下来了吗？", "不只存在于一个人的记忆中"),
    g("backup-person", "有没有第二个人能接手？", "每个关键岗位至少两个人会做"),
    g("handover", "离职时怎样交接？", "有人离职，店铺仍照常运转"),
  ] },
  { slug: "training", category: "people", title: "如何培训新员工", dek: "老员工没有时间教，新人学得慢、出错多。", groups: [
    g("standards", "标准怎样写下来？", "按标准去做就不会出错，不依赖师傅的记忆"),
    g("step-by-step", "怎样按步骤教？", "一次只教一件事"),
    g("feedback", "教完怎样检查与反馈？", "及时告诉新人做得是否正确"),
  ] },
  { slug: "wrong-person", category: "people", title: "员工不合适，是否辞退", dek: "能力或态度有问题的人，留着影响团队，辞退又怕缺人。", groups: [
    g("the-line", "标准与底线在哪里？", "什么行为不能容忍"),
    g("difficult-talk", "越过底线时怎样谈？", "说清楚问题，给改的机会"),
    g("after", "辞退以后怎样处理？", "团队和排班如何衔接"),
  ] },
  { slug: "scheduling", category: "people", title: "排班经常缺人", dek: "高峰时人手不足，平时人手闲置，人工成本也难以降低。", groups: [
    g("by-traffic", "怎样按客流排班？", "看每个时段的客人数排人"),
    g("multi-role", "能否一人多岗？", "学会几个岗位，忙时互相补位"),
    g("flexible-help", "临时人手从哪里来？", "兼职、钟点工和应急的办法"),
  ] },
  { slug: "labor-costs", category: "people", title: "人工成本上涨", dek: "最低工资和薪资一涨再涨，人工占营业额越来越多。", groups: [
    g("measure", "人工成本多了多少？", "占营业额多少，每月多付多少"),
    g("productivity", "怎样提高每人的产出？", "流程和分工"),
    g("prices-hours", "是否调整价格与营业时间？", "哪些时段值得开"),
  ] },
  { slug: "owner-overload", category: "people", title: "老板工作负担过重", dek: "事事都要老板亲自处理，每天工作十几个小时，店铺离不开老板。", groups: [
    g("runs-without-you", "老板不在，店能否运转？", "哪些事只有老板会做"),
    g("delegate", "哪些工作可以交出去？", "交给谁、如何交、交出以后如何跟进"),
    g("owner-time", "老板的时间与健康如何兼顾？", "休息、家人和长期的打算"),
  ] },
  { slug: "partners", category: "people", title: "合伙开店", dek: "如何选择合伙人、如何分配资金和权责、意见不合时如何拆伙。夫妻一起开店，也是合伙。", groups: [
    g("choose", "怎样选合伙人？", "合得来的朋友不一定是好的合伙人"),
    g("split", "钱与工作怎样分？", "出钱、出力、做决定，事先说清楚"),
    g("exit", "拆伙怎样预先约定？", "退出的规则先写好"),
    g("couples", "夫妻开店要注意什么？", "如何分工、如何分钱，在店里如何避免争执"),
  ] },

  // 顾客与营销
  { slug: "regulars", category: "customers", title: "熟客不再光顾", dek: "来过一次的客人很多，再来的很少。", groups: [
    g("recognize", "怎样记住客人？", "记住客人的名字和常点的菜"),
    g("reminders", "提醒是否比奖励有效？", "客人多半只是忘记了这家店"),
    g("loyalty", "会员与积分怎样做？", "积分、储值、会员俱乐部"),
  ] },
  { slug: "slow-weekdays", category: "customers", title: "平日和淡季客人稀少", dek: "周末排队，平日空着一半的座位；淡季和雨天也一样冷清。", groups: [
    g("weekday-reasons", "平日来店的理由是什么？", "只在平日才有的菜品和活动"),
    g("time-pricing", "时段定价与套餐怎样做？", "冷清的时段卖什么、卖多少钱"),
    g("new-guests", "能否找到新的客群？", "平日有空的是哪些人"),
    g("slow-seasons", "淡季、雨天与节日如何应对？", "整个季节、坏天气或节日前后客人都少的时候"),
  ] },
  { slug: "bad-reviews", category: "customers", title: "收到差评", dek: "网上一条差评，影响新客人的判断。", groups: [
    g("respond", "差评怎样回复？", "是否回复、如何回复、多快回复"),
    g("find-cause", "原因在哪，流程怎样改？", "差评里说的是不是真的问题，改了流程才不会再发生"),
  ] },
  { slug: "small-budget-marketing", category: "customers", title: "营销预算有限", dek: "预算不多，不知道该用在社交媒体、平台广告还是店门口。", groups: [
    g("first-moves", "钱少时先做什么？", "钱少时最先花在哪里"),
    g("local", "怎样吸引附近的人？", "招牌、门口和周边的店"),
    g("social", "社交媒体怎样做？", "拍什么、发多少、谁来做"),
  ] },
  { slug: "delivery-ratings", category: "customers", title: "外卖评分下降", dek: "外卖评分一降，平台曝光和订单跟着减少。", groups: [
    g("packaging", "包装与出餐有问题吗？", "送达客人手中时的状态"),
    g("reply", "评价怎样回复？", "如何回复差评"),
    g("delivery-menu", "外卖菜单怎样调整？", "适合外送的菜"),
  ] },
  { slug: "takeout", category: "customers", title: "增设外带或外卖", dek: "店里已经有堂食，想多卖外带和外卖，厨房、人手和账都要重新算。", groups: [
    g("what-to-sell", "卖哪些菜、怎样包装？", "放置一段时间后仍然可口、便于携带的菜"),
    g("pricing-costs", "外带怎样定价、算成本？", "容器、包装和平台抽成都算进去"),
    g("kitchen-flow", "厨房与人手应付得来吗？", "堂食和外带共用同一个厨房"),
  ] },
  { slug: "competition", category: "customers", title: "附近出现竞争对手", dek: "隔壁开了同类的店，或大品牌降价争夺客人。", groups: [
    g("be-different", "自己有什么不同？", "客人为何选择这家店"),
    g("no-price-war", "不打价格战，怎样做？", "不跟着降价也留住客人；对手降价、打折以后如何应对"),
  ] },
  { slug: "ticket-size", category: "customers", title: "客单价过低", dek: "客人不少，每人花的钱却不多。", groups: [
    g("menu-design", "菜单怎样设计提高客单价？", "放在显眼位置的是哪些菜"),
    g("bundles", "套餐与加购怎样做？", "让客人多点一份的理由"),
    g("staff-suggest", "服务员怎样推荐？", "推荐什么、如何说"),
  ] },
  { slug: "hospitality", category: "customers", title: "菜品不差，客人却未必再来", dek: "菜的味道以外，客人在店里受到的对待，也决定了客人是否再来。", groups: [
    g("reasonable-hospitality", "怎样款待让客人再来？", "让客人觉得被照顾"),
    g("small-details", "哪些小细节要做好？", "进门、等位、结账时的细节"),
    g("complaints", "客人不满时怎样处理？", "客人当场不满意时"),
  ] },

  // 门店运营
  { slug: "rush-chaos", category: "operations", title: "用餐高峰时出餐混乱", dek: "平时一切顺畅，一到高峰就出餐变慢、员工互相挡路、客人久等。", groups: [
    g("seats-vs-kitchen", "入座是否比出餐快？", "一次入座的客人超过厨房的出餐能力"),
    g("crossing-paths", "动线是否交叉？", "出餐和收碗走同一条路，员工的时间花在互相让路上"),
    g("searching-shouting", "员工是否在找物料、喊叫？", "物料不在手边、分工不清楚，高峰时就有人离开岗位"),
  ] },
  { slug: "consistency", category: "operations", title: "出品不稳定", dek: "同一道菜，不同人做、不同天做，味道和分量都不一样。", groups: [
    g("recipes", "标准配方定了吗？", "写清楚用量和做法"),
    g("prep", "备料怎样按配方做？", "备好的料决定了出品"),
    g("checks", "出餐前怎样检查？", "出餐前谁来看、看什么"),
  ] },
  { slug: "layout", category: "operations", title: "店面和厨房如何布置", dek: "装修好看，用起来却不顺手。", groups: [
    g("full-house", "满座时怎样运转？", "满座时人员和货物如何流动"),
    g("flows", "动线怎样安排？", "客人、员工、外卖员、送货的路线"),
    g("equipment-place", "设备放在哪里？", "伸手可及，少走一步"),
  ] },
  { slug: "food-safety", category: "operations", title: "食品安全和卫生", dek: "温度、清洁、过敏原，一次出事就可能停业。", groups: [
    g("temperature", "温度怎样控制？", "冷藏、加热和保温"),
    g("cleaning", "怎样清洁？", "每天、每周要做的事"),
    g("allergens", "过敏原怎样标示与记录？", "问清楚、标清楚、记下来"),
  ] },
  { slug: "menu-size", category: "operations", title: "菜单过长", dek: "菜单越加越多，备料复杂、浪费增加。", groups: [
    g("menu-engineering", "每道菜的销量与利润如何？", "哪些菜卖得多又赚得多"),
    g("what-to-cut", "删哪些菜？", "按销量和利润决定"),
    g("shared-ingredients", "留下的菜能否共用食材？", "一样食材用在几道菜里"),
  ] },
  { slug: "inventory", category: "operations", title: "订货量和库存数量不清", dek: "不是缺货就是积压，账上的库存和架上的不一样。", groups: [
    g("counting", "现有多少，怎样盘点？", "多久盘点一次、如何盘点"),
    g("how-much", "该订多少？", "按销量和备料订货"),
    g("deliveries-invoices", "收货时怎样核对？", "收货时核对，账单逐行看"),
  ] },
  { slug: "equipment", category: "operations", title: "设备的选购与维修", dek: "设备一旦故障，生意就会停顿。", groups: [
    g("choose", "设备怎样选？", "买新的、买二手还是租"),
    g("maintain", "怎样保养与维修？", "定期做的保养，坏了以后的临时办法和维修"),
  ] },
  { slug: "front-of-house", category: "operations", title: "点餐、上菜、结账过慢", dek: "厨房出餐没有问题，客人却在等点餐、等上菜、等结账。", groups: [
    g("ordering", "点餐怎样更快？", "点餐方式和菜单"),
    g("serving", "上菜怎样更快？", "由谁送、如何送"),
    g("payment", "结账怎样更快？", "结账的方式和位置"),
  ] },

  // 开店与关店
  { slug: "opening-cost", category: "open-close", title: "开店前的准备和开销", dek: "适不适合自己开店、开之前要准备什么；装修、设备、押金和开业前后的周转金，加起来常常超出预算。", groups: [
    g("before-opening", "是否该开这家店？", "自己适不适合开店，开之前要准备什么"),
    g("by-format", "所需资金怎样估算？", "摊位、小店、正式餐厅各要多少"),
    g("build-out", "资金用在哪里、何处能省？", "最大的一笔开支"),
    g("working-capital", "维持到盈利要留多少资金？", "开业以后几个月还要付的钱"),
  ] },
  { slug: "location", category: "open-close", title: "店址如何选择", dek: "位置决定了客流，也决定了房租。", groups: [
    g("traffic", "客流与周边怎样看？", "什么时段、什么人经过，附近有哪些店和住户"),
    g("lease", "租约条款要看什么？", "签约前要看清楚的地方"),
  ] },
  { slug: "first-months", category: "open-close", title: "开业头几个月", dek: "开业后客人不如预期，或忙得应接不暇。", groups: [
    g("soft-opening", "试营业怎样做？", "正式开业前先试运行"),
    g("first-90-days", "头 90 天做什么？", "这段时间最常见的问题"),
    g("adjust", "怎样根据数字调整？", "看哪些数字、调整哪些地方"),
  ] },
  { slug: "not-breaking-even", category: "open-close", title: "开业已久仍未回本", dek: "半年、一年过去，仍在亏损，是坚持还是止损。", groups: [
    g("turnaround", "还能怎样调整？", "换菜单、换时段、换做法"),
    g("when-to-stop", "何时该停？", "止损的信号"),
    g("closing-well", "关店怎样关？", "员工、房东、供货商和欠款"),
  ] },
  { slug: "second-shop", category: "open-close", title: "开设第二家店", dek: "第一家店经营稳定以后，很多经营者会考虑再开一家。", groups: [
    g("ready-signs", "何时可以开第二家？", "第一家要做到什么程度"),
    g("people-systems", "人与制度跟得上吗？", "老板一人难以兼顾，要靠成文的制度和专业的人"),
    g("more-not-richer", "开得多，就赚得多吗？", "店多了，费用也多了"),
  ] },
  { slug: "franchise", category: "open-close", title: "加盟还是自营", dek: "加盟省事，但费用、合同和自主权都要算清楚。", groups: [
    g("costs", "加盟要付哪些费用？", "加盟费、管理费和进货价"),
    g("contract", "合同条款要看什么？", "签之前要看清楚的地方"),
    g("franchisee-stories", "加盟主经历了什么？", "加盟主本人的说法"),
  ] },
  { slug: "small-formats", category: "open-close", title: "摊位、外卖店、共享厨房是否适合", dek: "店面小、房租低，是否适合自己的生意。", groups: [
    g("kiosk", "摊位与小店适合吗？", "小面积如何经营"),
    g("delivery-only", "只做外卖适合吗？", "没有门面的店"),
    g("shared-kitchen", "共享厨房与快闪适合吗？", "先试再开店"),
  ] },
  { slug: "renovation", category: "open-close", title: "装修超支、工期拖延", dek: "装修的钱和时间，常常比计划超出不少。", groups: [
    g("budget", "预算怎样定？", "钱花在哪里、留多少余地"),
    g("contractors", "设计与施工怎样找？", "如何寻找、如何签约"),
    g("timeline", "工期怎样控制？", "拖延的原因和对策"),
  ] },

  // 工具与法规
  { slug: "pos-system", category: "tools-rules", title: "收银和管理系统", dek: "系统选错了，更换起来费时费力；选对了能省去许多麻烦。", groups: [
    g("choose", "系统怎样选？", "要看的功能和费用"),
    g("using-data", "系统里的数字怎样用？", "销量、时段、客人"),
    g("switching", "要不要换系统？", "换系统的时机和成本"),
  ] },
  { slug: "ai-tools", category: "tools-rules", title: "用 AI 处理店务", dek: "记账、写菜单、排班、回复评价，各地店家让 AI 做到了哪一步。", groups: [
    g("numbers", "AI 怎样整理数字、表格？", "账、费用、销量、考勤和排班"),
    g("writing", "AI 怎样写文案与菜单？", "菜单、介绍、回复"),
    g("training", "AI 怎样带新人、对练？", "训练和问答"),
  ] },
  { slug: "platform-rules", category: "tools-rules", title: "平台规则变更", dek: "外卖、点评和订位平台改了费率、排序或规则，店家如何应对。", groups: [
    g("fees", "费率与抽成变了如何应对？", "多付了多少"),
    g("ranking", "排名与曝光变了如何应对？", "平台上的位置"),
    g("own-channel", "怎样建立自己的渠道？", "不全靠平台"),
  ] },
  { slug: "payments", category: "tools-rules", title: "收款和营业款", dek: "收款方式、手续费，以及收款公司出问题时的营业款。", groups: [
    g("fees", "手续费有多少？", "每笔付出去多少"),
    g("risks", "收款公司有哪些风险？", "营业款被扣留或无法取回"),
    g("reconcile", "现金怎样对账？", "每天收到的钱与账目相符"),
  ] },
  { slug: "contracts", category: "tools-rules", title: "合同和账单中的风险", dek: "租约、供应商合同、服务合同里的条款，签的时候没注意。", groups: [
    g("leases", "租约里有哪些风险？", "租金调整、续约和退租"),
    g("supplier-contracts", "供应商合同要看什么？", "涨价条款和最低用量"),
    g("auto-renew", "怎样防自动续约与扣款？", "无人查看的账单"),
  ] },
  { slug: "automation", category: "tools-rules", title: "用设备和自动化节省人力", dek: "自助点餐、炒菜机、洗碗机，需要投入多少、能节省多少，适合哪些环节，员工和客人能否接受。", groups: [
    g("what-works", "哪些环节适合自动化？", "哪些环节交给机器"),
    g("payback", "投入多久回本？", "多久收回成本"),
    g("acceptance", "员工与客人能接受吗？", "实际使用情况"),
  ] },
  { slug: "online-presence", category: "tools-rules", title: "地图、点评网站和自有网页", dek: "很多客人先在地图和点评网站上找到店铺。", groups: [
    g("maps", "地图上的店铺资料怎样做？", "营业时间、照片、菜单"),
    g("review-sites", "点评网站怎样经营？", "上面的资料和评价"),
    g("website", "自己的网页与订位怎样做？", "不经过平台的入口；订位未到、临时取消的处理"),
  ] },
];

export function findSituation(slug: string): Situation | undefined {
  return SITUATIONS.find((s) => s.slug === slug);
}

export function categoryTitle(key: string): string | undefined {
  return CATEGORIES.find((c) => c.key === key)?.title;
}

/**
 * The sources that are one owner's own blog or podcast, with that owner's shop (pages named it this way until the
 * shop lines went, 11-03). The story writer named the shop afresh in each story: 10/10 one owner's blog read as four
 * shops under ten names, and 「12 家店」 stood on six. So the source says who speaks: every story from it counts as
 * one shop (backend/read.ts tellerOf). Entered with the
 * source, from its profile (HANDOFF §5.4); a show whose host interviews other owners is not one of these.
 */
export const OWNERS: Record<string, string> = {
  "rss-ryourigaka": "京都一家意大利小酒馆",
  "rss-yoshitencho": "柏市一家泰式咖啡馆",
  "rss-kojinkuroji": "一位个体餐饮店店主",
  "rss-zieigyou": "日本小镇一家夫妻经营的中餐小馆",
  "pod-your-life-and-restaurant": "一位家庭餐馆老板",
  "pod-cat-and-cloud": "圣克鲁斯一家咖啡店",
  "pod-bread-winner": "一位微型面包店店主",
  "pod-a-meal-and-two-mics": "圣马特奥一家古巴餐厅",
  "pod-vegan-east": "明尼阿波利斯一家纯素烘焙店",
  "pod-bar-pod": "桑达斯基的两家酒吧",
  "pod-coffee-and-cows": "得克萨斯州一家咖啡店",
  "pod-de-brandherd-esskultur": "汉堡一家餐厅",
  "pod-pizza-king": "佛罗里达州一家披萨店",
  "pod-baker-and-farmer": "一家农场面包店",
};
