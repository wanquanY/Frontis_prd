import type {
  MarketingAgentCategoryFilter,
  MarketingAgentItem,
  MarketingAgentSort,
  MarketingAnxietyMomentItem,
  MarketingArchitectureStepItem,
  MarketingBundleItem,
  MarketingCaseStudyItem,
  MarketingExpertSceneItem,
  MarketingHandoffSceneItem,
  MarketingIndustrySignalItem,
  MarketingHomePackageItem,
  MarketingLogoWallItem,
  MarketingMindsetComparisonItem,
  MarketingPortalNavItem,
  MarketingProofStatItem,
  MarketingScenarioItem,
  MarketingTechFeatureItem,
  MarketingTrustBadgeItem,
  MarketingValuePillarItem,
} from "@/feature/marketingPortal/types";

/**
 * 营销门户一级导航。
 */
export const PORTAL_NAV_ITEMS: MarketingPortalNavItem[] = [
  {
    id: "home",
    label: "首页",
    to: "/portal",
  },
  {
    id: "agents",
    label: "AI 专家团",
    to: "/portal/agents",
  },
  {
    id: "cases",
    label: "客户案例",
    to: "/portal/cases",
  },
  {
    id: "contact",
    label: "免费咨询",
    to: "/portal/contact",
  },
];

/**
 * 首页首屏信任锚点。
 */
export const PORTAL_HOME_TRUST_LINE =
  "已有多家企业的老板，把这些事交出去了 · 内测名额有限 · 4月15日开放";

/**
 * 首页焦虑命名卡片。
 */
export const PORTAL_HOME_ANXIETY_MOMENTS: MarketingAnxietyMomentItem[] = [
  {
    id: "anxiety-policy",
    indexLabel: "01",
    authorName: "周越",
    authorRole: "创始人",
    authorCompany: "区域制造集团",
    avatarSeed: "zhou-yue",
    quote: "我下了政策，但我不知道有没有人执行。",
    context: "文件发出去了，会也开了。下面到底按没按，我不知道。等我发现，已经偏了三个月。",
  },
  {
    id: "anxiety-middle",
    indexLabel: "02",
    authorName: "李静",
    authorRole: "总经理",
    authorCompany: "华东连锁零售品牌",
    avatarSeed: "li-jing",
    quote: "战略到了中层，就消失了。",
    context: "我在上面讲得很清楚。但基层的人从没听说过这件事。不知道是传错了还是没传。",
  },
  {
    id: "anxiety-rival",
    indexLabel: "03",
    authorName: "陈锋",
    authorRole: "品牌负责人",
    authorCompany: "跨境家居企业",
    avatarSeed: "chen-feng",
    quote: "对手在动，我完全看不见。",
    context: "我知道他们在跑，但跑哪了、跑多快、在赌什么方向，我没有任何信息。",
  },
  {
    id: "anxiety-platform",
    indexLabel: "04",
    authorName: "何敏",
    authorRole: "增长负责人",
    authorCompany: "新消费品牌",
    avatarSeed: "he-min",
    quote: "平台一直在变，我永远在追。",
    context: "算法改了、达人变了、规则又调了。我像在追一辆跑走的车，永远追不上。",
  },
  {
    id: "anxiety-cost",
    indexLabel: "05",
    authorName: "赵岩",
    authorRole: "运营总监",
    authorCompany: "本地生活服务公司",
    avatarSeed: "zhao-yan",
    quote: "想扩张，但人力成本先把利润吃掉。",
    context: "每次想多做一块业务，第一反应是要招多少人。招完了，利润就没了。",
  },
  {
    id: "anxiety-lead",
    indexLabel: "06",
    authorName: "孙珂",
    authorRole: "销售总监",
    authorCompany: "工业设备供应商",
    avatarSeed: "sun-ke",
    quote: "线索来了，我不知道有没有被认真跟。",
    context: "这个客户上周问过，后来怎么样了？销售说跟了，但没有下文。钱就这么漏掉了。",
  },
  {
    id: "anxiety-key-person",
    indexLabel: "07",
    authorName: "许航",
    authorRole: "联合创始人",
    authorCompany: "教育服务机构",
    avatarSeed: "xu-hang",
    quote: "那个最重要的员工，随时可能走。",
    context: "她在，公司运转正常。她要走，我能感觉到某块业务要垮。这个依赖很不健康。",
  },
  {
    id: "anxiety-judgement",
    indexLabel: "08",
    authorName: "王璐",
    authorRole: "CEO",
    authorCompany: "消费医疗公司",
    avatarSeed: "wang-lu",
    quote: "我做决定靠的是感觉，不是数据。",
    context: "数据来的时候已经是上周的了。等报告出来，窗口已经关了。我只能拍脑袋。",
  },
];

/**
 * 首页 AI 员工接管场景。
 */
export const PORTAL_HOME_HANDOFF_SCENES: MarketingHandoffSceneItem[] = [
  {
    id: "handoff-video",
    title: "视频内容创作团队",
    hook: "这款新品下周上架，给我出一条能在抖音跑出来的短视频。",
    summary: "不是工具，不是软件，是一组能把内容从研究到发布整包交付的 AI 员工团队。",
    beforeText: "以前：开会、对稿、改三版，等发出去热点已经过了。",
    afterText: "现在：说完那句话，24 小时内全套创作包就绪。",
    members: [
      {
        id: "video-research",
        title: "🔍 爆款研究员",
        task: "扫描近 30 天同类目爆款，拆钩子结构、BGM 风格和评论区高频词。",
      },
      {
        id: "video-script",
        title: "✍️ 脚本编剧",
        task: "生成完整视频脚本，包含画面、旁白、字幕和情绪节奏。",
      },
      {
        id: "video-storyboard",
        title: "🎨 分镜设计师",
        task: "输出拍摄分镜参考图，标注景别、运镜和道具。",
      },
      {
        id: "video-assets",
        title: "🖼️ 素材生成师",
        task: "批量生成产品场景图和氛围图，部分镜头直接可用。",
      },
      {
        id: "video-publish",
        title: "📊 发布策略师",
        task: "给出最佳发布时间和前 3 小时互动建议。",
      },
    ],
  },
  {
    id: "handoff-image",
    title: "AI 生图系统 · 能力留存",
    hook: "小陈要走了，她三年积累的东西，能不能留下来？",
    summary: "每一次创作都在沉淀成公司资产，人走了，方法和产能还留在系统里。",
    beforeText: "以前：核心员工离职，能力几乎清零，新人得重新摸索半年。",
    afterText: "现在：每次创作都在给公司积累东西，人走了，方法还在。",
    members: [
      {
        id: "image-assets",
        title: "📚 资产沉淀师",
        task: "把风格、提示词和模板自动归档为公司资产，永久留存。",
      },
      {
        id: "image-batch",
        title: "🖼️ 批量生成师",
        task: "换一张产品图时，30 秒生成同等水平的新图。",
      },
      {
        id: "image-qc",
        title: "🔍 质检师",
        task: "对比品牌调性库，自动标注不符合风格的图片。",
      },
      {
        id: "image-analysis",
        title: "📊 能力分析师",
        task: "生成团队设计能力分布和模板贡献度分析。",
      },
    ],
  },
  {
    id: "handoff-ceo",
    title: "AI CEO · 经营感知",
    hook: "我周边的人告诉我的，和三楼真实发生的事，从来都不是同一件事。",
    summary: "老板不用等周报和汇报，AI 员工 24 小时盯着组织、风险和经营异动。",
    beforeText: "以前：靠开会、靠汇报、靠感觉，老板永远是最后知道真相的人。",
    afterText: "现在：5 个 AI 员工 24 小时在各层盯着，每天早上叫你一次。",
    members: [
      {
        id: "ceo-sense",
        title: "🎙️ 收音师",
        task: "整理会议纪要、日报和沟通记录，提炼关键事实，去掉水分。",
      },
      {
        id: "ceo-analysis",
        title: "🧠 分析师",
        task: "识别团队情绪变化和士气波动，生成本周预警信号。",
      },
      {
        id: "ceo-risk",
        title: "🚨 风控师",
        task: "监控异常关键词，财务和合规风险第一时间标红提醒。",
      },
      {
        id: "ceo-talent",
        title: "👤 人才雷达",
        task: "追踪中层表现，给出具体的人才评估。",
      },
      {
        id: "ceo-brief",
        title: "📋 简报师",
        task: "每天早上 8 点推送公司实时状态面板。",
      },
    ],
  },
  {
    id: "handoff-opportunity",
    title: "商机洞察团队",
    hook: "我感觉主营品类快到天花板了，帮我看还有什么机会。",
    summary: "市场不是两周后才看见，AI 员工 24 小时在线扫机会，发现了就主动叫你。",
    beforeText: "以前：一份市场报告做 2 到 3 周，出来时机会已经过时。",
    afterText: "现在：AI 员工全天在线扫市场，发现窗口就立刻提醒。",
    members: [
      {
        id: "opportunity-radar",
        title: "📡 市场雷达员",
        task: "扫描多平台信号，识别正在崛起但尚未饱和的机会窗口。",
      },
      {
        id: "opportunity-competitor",
        title: "🔬 竞品解剖师",
        task: "追踪竞品最新动作，推断他们押注的下一个方向。",
      },
      {
        id: "opportunity-demand",
        title: "👥 需求挖掘师",
        task: "从评论区和问答平台找出用户抱怨却没人满足的空白。",
      },
      {
        id: "opportunity-feasibility",
        title: "💰 可行性测算师",
        task: "快速评估市场规模、竞争密度和进入门槛，给出跟进建议。",
      },
      {
        id: "opportunity-report",
        title: "📋 洞察报告师",
        task: "每周推送结构化商机简报，20 分钟看清本周 3 个重点机会。",
      },
    ],
  },
  {
    id: "handoff-sales",
    title: "销售助理团队",
    hook: "我们销售团队，好的一个月签 5 单，差的签 1 单，我不知道怎么拉平。",
    summary: "把最强销售脑子里的方法变成系统，留在团队里，而不是跟着人走。",
    beforeText: "以前：最强销售的方法在她脑子里，人走了，方法也带走了。",
    afterText: "现在：方法变成系统，每个销售都在用，人走了方法还在。",
    members: [
      {
        id: "sales-profile",
        title: "📋 客户建档师",
        task: "线索进来自动建档，完成意向评分，销售接手时已有完整背景。",
      },
      {
        id: "sales-strategy",
        title: "🧠 跟进策略师",
        task: "根据沟通记录生成个性化下一步建议，提示联系时机和说法。",
      },
      {
        id: "sales-script",
        title: "✍️ 话术生成师",
        task: "针对价格和异议实时推送应对话术。",
      },
      {
        id: "sales-reminder",
        title: "⏰ 跟进提醒员",
        task: "自动追踪跟进节奏，超时未行动时主动提醒。",
      },
      {
        id: "sales-replay",
        title: "🏆 经验复制师",
        task: "分析最强销售的行为规律，沉淀成话术库并推送给所有人。",
      },
    ],
  },
];

/**
 * 首页认知重建对比。
 */
export const PORTAL_HOME_MINDSET_COMPARISONS: MarketingMindsetComparisonItem[] = [
  {
    id: "mindset-learn",
    legacyLabel: "你要学怎么用",
    nextLabel: "你只需要说你要什么",
  },
  {
    id: "mindset-runtime",
    legacyLabel: "用完关掉，明天再说",
    nextLabel: "24 小时在运转，随时叫随时来",
  },
  {
    id: "mindset-flexibility",
    legacyLabel: "功能固定，需求变了再买包",
    nextLabel: "用得越久越懂你的业务",
  },
  {
    id: "mindset-delivery",
    legacyLabel: "出问题了，等客服",
    nextLabel: "FDE 工程师全程配置交付，开箱即用",
  },
];

/**
 * 首页 Logo 墙。
 */
export const PORTAL_HOME_LOGO_WALL_ITEMS: MarketingLogoWallItem[] = [
  {
    id: "logo-shopify",
    name: "Shopify",
    logoUrl: "https://cdn.simpleicons.org/shopify/ffffff",
    tileSize: "wide",
  },
  {
    id: "logo-stripe",
    name: "Stripe",
    logoUrl: "https://cdn.simpleicons.org/stripe/ffffff",
    tileSize: "regular",
  },
  {
    id: "logo-slack",
    name: "Slack",
    logoUrl: "https://cdn.simpleicons.org/slack/ffffff",
    tileSize: "regular",
  },
  {
    id: "logo-notion",
    name: "Notion",
    logoUrl: "https://cdn.simpleicons.org/notion/ffffff",
    tileSize: "regular",
  },
  {
    id: "logo-figma",
    name: "Figma",
    logoUrl: "https://cdn.simpleicons.org/figma/ffffff",
    tileSize: "wide",
  },
  {
    id: "logo-salesforce",
    name: "Salesforce",
    logoUrl: "https://cdn.simpleicons.org/salesforce/ffffff",
    tileSize: "wide",
  },
  {
    id: "logo-hubspot",
    name: "HubSpot",
    logoUrl: "https://cdn.simpleicons.org/hubspot/ffffff",
    tileSize: "regular",
  },
  {
    id: "logo-dropbox",
    name: "Dropbox",
    logoUrl: "https://cdn.simpleicons.org/dropbox/ffffff",
    tileSize: "regular",
  },
  {
    id: "logo-atlassian",
    name: "Atlassian",
    logoUrl: "https://cdn.simpleicons.org/atlassian/ffffff",
    tileSize: "wide",
  },
  {
    id: "logo-adobe",
    name: "Adobe",
    logoUrl: "https://cdn.simpleicons.org/adobe/ffffff",
    tileSize: "regular",
  },
  {
    id: "logo-zoom",
    name: "Zoom",
    logoUrl: "https://cdn.simpleicons.org/zoom/ffffff",
    tileSize: "regular",
  },
  {
    id: "logo-amazon",
    name: "Amazon",
    logoUrl: "https://cdn.simpleicons.org/amazon/ffffff",
    tileSize: "wide",
  },
];

/**
 * 首页套餐信息。
 */
export const PORTAL_HOME_PACKAGE: MarketingHomePackageItem = {
  name: "企业标准版",
  price: "¥98,000 / 年",
  description: "一次投入，换一支永不离职、能持续交付的 AI 员工团队。",
  features: [
    "若干企业级 AI 员工名额",
    "FDE 工程师全程配置交付",
    "可选 LeDeep 硬件盒子",
    "AI 员工持续迭代升级",
  ],
  primaryActionLabel: "立即了解详情",
  secondaryActionLabel: "免费咨询",
};

/**
 * 首页信任背书项。
 */
export const PORTAL_HOME_TRUST_BADGES: MarketingTrustBadgeItem[] = [
  {
    id: "trust-security",
    icon: "🔒",
    title: "企业数据安全隔离",
    description: "核心文件与运行过程留在企业侧，安全边界表达直接。",
  },
  {
    id: "trust-fde",
    icon: "📞",
    title: "FDE 专属交付服务",
    description: "不是买了自己折腾，配置、上线和试点有人带着跑。",
  },
  {
    id: "trust-iteration",
    icon: "🔄",
    title: "AI 员工持续迭代",
    description: "不是一次性交付，用起来之后还会继续优化。",
  },
  {
    id: "trust-proof",
    icon: "🏆",
    title: "多家企业已在使用",
    description: "覆盖电商、品牌、服务、制造等多个行业。",
  },
];

/**
 * 首页最终留资问题选项。
 */
export const PORTAL_HOME_PROBLEM_OPTIONS: string[] = [
  "内容生产",
  "销售管理",
  "市场洞察",
  "经营决策",
  "其他",
];

/**
 * 首页信任指标。
 */
export const PORTAL_PROOF_STATS: MarketingProofStatItem[] = [
  {
    label: "部署方式",
    value: "盒子运行 + 云端使用",
    description: "以现场运行建立安全感，以云端统一管理建立规模化交付能力。",
  },
  {
    label: "价值表达",
    value: "不是聊天工具，是岗位交付",
    description: "每个 Agent 对应一个岗位结果，让客户更容易理解为什么值得买。",
  },
  {
    label: "商业闭环",
    value: "获客、交付、运营一体",
    description: "门户负责成交前展示，Web 端负责使用，后台负责持续交付和内容运营。",
  },
];

/**
 * 首页行业信号。
 */
export const PORTAL_INDUSTRY_SIGNALS: MarketingIndustrySignalItem[] = [
  {
    id: "signal-manufacturing",
    label: "制造",
  },
  {
    id: "signal-commerce",
    label: "电商",
  },
  {
    id: "signal-education",
    label: "教育",
  },
  {
    id: "signal-services",
    label: "连锁服务",
  },
  {
    id: "signal-professional",
    label: "专业服务",
  },
];

/**
 * 首页价值支柱。
 */
export const PORTAL_VALUE_PILLARS: MarketingValuePillarItem[] = [
  {
    id: "pillar-visible",
    eyebrow: "可感知",
    title: "买得到，也看得见",
    description:
      "老板买到的是一套能部署到企业里的 AI 员工体系，而不是一个模糊的软件账号。盒子在现场运行，团队在浏览器里直接使用。",
    footnote: "更像采购一名新岗位能力，而不是订阅一个工具。",
  },
  {
    id: "pillar-secure",
    eyebrow: "可相信",
    title: "数据留在现场",
    description:
      "核心文件、对话记录和执行过程保留在企业现场盒子中，云端只做认证、权限和运营控制，让安全表达足够直接。",
    footnote: "适合 SMB 决策链路里的真实顾虑，而不是抽象的技术口号。",
  },
  {
    id: "pillar-operational",
    eyebrow: "可规模化",
    title: "从试点到扩容都能交付",
    description:
      "账号、权限、设备状态和使用看板统一上云，FDE 可持续下发 Agent 模板，便于后续续费、扩容和复制。",
    footnote: "试点不是终点，运营能力才决定是否能持续成交。",
  },
];

/**
 * 首页重点岗位场景。
 */
export const PORTAL_SCENARIOS: MarketingScenarioItem[] = [
  {
    id: "scenario-hr",
    title: "招聘助手",
    description: "自动初筛简历、生成候选人判断和面试问题，让招聘团队只处理真正需要决策的部分。",
    result: "简历初筛时间平均减少 60%",
    imageUrl:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "scenario-sales",
    title: "销售线索官",
    description: "把分散线索、跟进动作和日报整理成统一节奏，让销售主管随时看见推进情况。",
    result: "销售跟进节奏更稳定，日报自动生成",
    imageUrl:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "scenario-finance",
    title: "财务对账官",
    description: "接收票据、流水和报表，自动比对差异并生成异常摘要，减少重复机械核验。",
    result: "日常对账周期缩短至 1/3",
    imageUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
  },
];

/**
 * 架构流程。
 */
export const PORTAL_ARCHITECTURE_STEPS: MarketingArchitectureStepItem[] = [
  {
    id: "arch-box",
    title: "企业现场盒子",
    description: "负责 Agent 执行、本地数据存储与设备状态同步。",
  },
  {
    id: "arch-cloud",
    title: "云端控制平面",
    description: "统一承接账号、权限、内容配置、看板和线索运营。",
  },
  {
    id: "arch-web",
    title: "员工与管理员使用端",
    description: "浏览器直接访问，不需要在盒子前操作，也不受盒子屏幕限制。",
  },
];

/**
 * 技术特点模块。
 */
export const PORTAL_TECH_FEATURES: MarketingTechFeatureItem[] = [
  {
    id: "tech-runtime",
    title: "盒子运行，云端使用",
    description: "把部署安全感和多人协作体验同时交给客户，避免纯云或纯本地方案各自的短板。",
    bullets: ["买的是可见实物", "不限制员工账号数量", "盒子只需通电联网即可运行"],
  },
  {
    id: "tech-security",
    title: "安全表达足够直接",
    description: "FrontisAI 把架构优势翻译成销售语言，让老板和管理员都能快速理解数据边界。",
    bullets: ["不暴露公网端口", "核心文件不出企业", "控制与统计统一上云"],
  },
  {
    id: "tech-ops",
    title: "后续运营有抓手",
    description: "不是一次性展示页，而是一个能承接试点、扩容和持续交付的完整商业系统。",
    bullets: ["统一权限管理", "持续下发 Agent 模板", "方便续费、扩容和复盘 ROI"],
  },
];

/**
 * 客户案例数据。
 */
export const PORTAL_CASE_STUDIES: MarketingCaseStudyItem[] = [
  {
    id: "case-crossborder",
    slug: "crossborder-content-studio",
    title: "某跨境电商团队用 AI 内容助手做到日产 50 条营销素材",
    customerName: "华南某跨境电商企业",
    industry: "电商",
    summary: "内容、投放与客服三类岗位共用一套 AI 员工组合，把内容节奏和知识沉淀都拉到统一流程里。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80",
    detailImageUrls: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    ],
    agentNames: ["内容生产官", "客服质检官", "销售线索官"],
    background:
      "团队每周都要为多个渠道准备大量文案、商品卖点和客服问答，人工协作链路长，素材产出速度经常跟不上活动节奏。",
    solution:
      "部署内容生产官负责脚本和文案生成，客服质检官统一整理高频问答，销售线索官把投放反馈和客户意向沉淀成每日战报，全部运行在企业现场盒子里。",
    effect:
      "内容团队把重复性撰写工作交给 AI 员工处理，主管只审核重点版本；客服知识库和投放反馈沉淀到统一流程后，新活动筹备时间明显缩短。",
    metrics: [
      {
        label: "内容产能",
        value: "3 倍",
      },
      {
        label: "准备周期",
        value: "-45%",
      },
      {
        label: "知识沉淀",
        value: "统一到单一流程",
      },
    ],
    quote: {
      authorName: "陈静",
      authorRole: "增长负责人｜华南某跨境电商企业",
      avatarUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
      content:
        "老板能看到盒子在公司里跑，团队也能直接在浏览器里调用不同 AI 员工，这个产品形态让推进试点变得容易得多。",
    },
  },
  {
    id: "case-manufacturing",
    slug: "manufacturing-finance-ops",
    title: "制造企业把财务对账和设备日报交给 AI 员工",
    customerName: "华东某零部件制造企业",
    industry: "制造",
    summary:
      "财务对账官与经营看板官协同处理表格、日报和异常项汇总，让老板第一次真正看见 AI 的工作量。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80",
    detailImageUrls: [
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    ],
    agentNames: ["财务对账官", "经营看板官"],
    background:
      "多工厂、多表格的对账流程经常跨人传递，异常项归因不清晰，老板想知道 AI 员工究竟帮企业干了多少活。",
    solution:
      "财务对账官读取票据和流水进行差异比对，经营看板官将每日异常、处理结果和 Token 成本汇总到管理看板，管理员在云端统一查看结果。",
    effect:
      "企业把重复核对动作交给 AI 员工后，财务人员从机械比对转向异常判断，老板可以直接从看板看到节省的时间和任务完成量。",
    metrics: [
      {
        label: "对账耗时",
        value: "-67%",
      },
      {
        label: "日报生成",
        value: "自动化",
      },
      {
        label: "异常定位",
        value: "当天闭环",
      },
    ],
    quote: {
      authorName: "刘峰",
      authorRole: "财务经理｜华东某零部件制造企业",
      avatarUrl:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80",
      content:
        "以前我们要靠 Excel 来回比对，现在 AI 员工先跑一轮，财务只处理真正需要判断的异常项，效率差异很明显。",
    },
  },
  {
    id: "case-education",
    slug: "education-enrollment-service",
    title: "教育机构用招生线索官和客服质检官统一管理咨询流程",
    customerName: "华北某职业教育机构",
    industry: "教育",
    summary:
      "从咨询接待到线索跟进，都由岗位化 Agent 承接标准动作，让校区运营第一次拥有统一的线索节奏。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80",
    detailImageUrls: [
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
    ],
    agentNames: ["销售线索官", "客服质检官"],
    background: "咨询量波动大，销售和客服之间的信息衔接不顺畅，造成跟进节奏不一致和重复沟通。",
    solution:
      "销售线索官统一整理线索阶段和下一步动作，客服质检官监测沟通话术与高频问题，把跟进过程沉淀成标准化建议。",
    effect:
      "管理层能从门户案例里直观看到 Agent 商店和交付方式，项目上线后也能在管理员看板里持续追踪采纳率和跟进节奏。",
    metrics: [
      {
        label: "首次响应",
        value: "10 分钟内",
      },
      {
        label: "跟进遗漏",
        value: "-52%",
      },
      {
        label: "转介绍率",
        value: "+18%",
      },
    ],
  },
  {
    id: "case-services",
    slug: "service-chain-expansion",
    title: "服务型企业用招聘助手与经营看板官稳定扩张节奏",
    customerName: "西南某连锁服务企业",
    industry: "连锁服务",
    summary: "把招聘和经营汇报拆给不同 AI 员工，试点阶段就能形成门店复制能力。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80",
    detailImageUrls: [
      "https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    ],
    agentNames: ["招聘助手", "经营看板官"],
    background:
      "门店扩张期需要同时处理招聘、排班和经营汇报，中后台团队人手紧张，老板最关心投入后是否真能省下管理动作。",
    solution:
      "招聘助手负责简历初筛与面试问题建议，经营看板官每天汇总门店经营情况与设备在线状态，帮助老板判断 AI 员工是否真的在工作。",
    effect:
      "试点阶段就能把重复性协同动作沉淀为标准流程，后续扩店时只需要追加设备和 Agent 分配，不需要重复搭建一套系统。",
    metrics: [
      {
        label: "招聘节拍",
        value: "提前 2 周",
      },
      {
        label: "经营汇报",
        value: "每日自动同步",
      },
      {
        label: "扩店复制",
        value: "按模板交付",
      },
    ],
  },
];

/**
 * Agent 列表。
 */
export const PORTAL_AGENTS: MarketingAgentItem[] = [
  {
    id: "agent-hr",
    slug: "recruiting-assistant",
    name: "招聘助手",
    category: "HR",
    sceneIds: ["scene-organization", "scene-commerce-management"],
    summary: "自动完成简历初筛、候选人判断和招聘日报，让招聘团队只处理需要判断的环节。",
    targetRoles: ["HRBP", "招聘经理", "业务面试官"],
    priceRange: "按需定价",
    imageUrl:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    introduction:
      "招聘助手围绕招聘需求拆解、简历筛选和候选人报告输出展开，适合用来承接日常高频筛选工作。",
    workflow: [
      "接收岗位招聘需求和 JD",
      "批量解析简历并做匹配评分",
      "生成优先级名单和风险提示",
      "输出面试问题建议与日报摘要",
    ],
    skills: ["简历解析", "JD 撰写", "候选人评分", "面试问题生成"],
    faqs: [
      {
        question: "支持哪些简历格式？",
        answer: "支持 PDF、Word、图片和常见文本格式，适合批量导入简历做初筛。",
      },
      {
        question: "能否按岗位自定义筛选标准？",
        answer: "可以按岗位核心条件、加分项和淘汰项配置筛选口径。",
      },
      {
        question: "输出结果如何交给团队？",
        answer: "可直接生成候选人报告和日常招聘日报，方便招聘团队流转。",
      },
    ],
    defaultOrder: 1,
    launchOrder: 2,
    popularityOrder: 2,
  },
  {
    id: "agent-sales",
    slug: "sales-lead-officer",
    name: "销售线索官",
    category: "销售",
    sceneIds: ["scene-sales-growth", "scene-customer-service"],
    summary: "统一整理商机状态、跟进建议和销售日报，让销售主管随时看见节奏是否在推进。",
    targetRoles: ["销售主管", "销售代表", "增长负责人"],
    priceRange: "按需定价",
    imageUrl:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
    introduction:
      "销售线索官针对线索池管理和跟进节奏设计，帮助销售团队形成统一的动作标准和日报表达。",
    workflow: [
      "接收 CRM 或手工录入线索",
      "按阶段归类机会与阻塞项",
      "生成下一步跟进建议",
      "沉淀日/周销售战报给主管查看",
    ],
    skills: ["商机梳理", "话术建议", "跟进提醒", "销售日报生成"],
    faqs: [
      {
        question: "可以接入现有 CRM 吗？",
        answer: "当前原型以表单和手工导入为主，交付时可按企业现状设计接入方案。",
      },
      {
        question: "适合什么规模的销售团队？",
        answer: "中小型销售团队最能快速感知价值，特别适合线索多但跟进不稳定的组织。",
      },
      {
        question: "老板能看到什么结果？",
        answer: "可在管理看板中查看活跃度、任务完成量和线索推进节奏。",
      },
    ],
    defaultOrder: 2,
    launchOrder: 1,
    popularityOrder: 1,
  },
  {
    id: "agent-finance",
    slug: "finance-reconciliation-officer",
    name: "财务对账官",
    category: "财务",
    sceneIds: ["scene-commerce-management"],
    summary: "读取票据和流水，自动完成差异比对与异常摘要，减少机械核验工作。",
    targetRoles: ["财务经理", "出纳", "经营分析"],
    priceRange: "按需定价",
    imageUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    introduction: "财务对账官适合高频表格处理场景，帮助企业把重复的机械比对交给 AI 员工完成。",
    workflow: [
      "导入流水、票据和对账单",
      "识别差异并做结构化归因",
      "输出异常列表和核验建议",
      "形成对账日报和老板摘要",
    ],
    skills: ["票据识别", "表格比对", "异常归因", "日报汇总"],
    faqs: [
      {
        question: "是否支持多种表格模板？",
        answer: "支持常见 Excel、CSV 和导出模板，必要时可在交付中按企业模板适配。",
      },
      {
        question: "结果能否回溯来源？",
        answer: "可以在成果管理和对账摘要中保留原始文件与比对结论的对应关系。",
      },
      {
        question: "数据安全如何保证？",
        answer: "文件保存在企业现场盒子中，云端只承接控制与统计信息。",
      },
    ],
    defaultOrder: 3,
    launchOrder: 4,
    popularityOrder: 3,
  },
  {
    id: "agent-content",
    slug: "content-production-officer",
    name: "内容生产官",
    category: "内容",
    sceneIds: ["scene-content-creation", "scene-sales-growth"],
    summary: "围绕品牌素材批量生成文案、脚本和投放版本，让内容团队专注最终判断。",
    targetRoles: ["品牌市场", "内容运营", "新媒体团队"],
    priceRange: "按需定价",
    imageUrl:
      "https://images.unsplash.com/photo-1493612276216-ee3925520721?auto=format&fit=crop&w=1200&q=80",
    introduction:
      "内容生产官帮助品牌团队把高频文案与脚本生成工作流程化，适合和销售、客服类 Agent 配套交付。",
    workflow: [
      "接收产品卖点、品牌素材和营销主题",
      "输出多渠道文案和脚本版本",
      "按平台风格自动切换语气",
      "同步沉淀选题库和复盘建议",
    ],
    skills: ["脚本生成", "平台改写", "卖点拆解", "素材复用"],
    faqs: [
      {
        question: "能否保证品牌语气统一？",
        answer: "可以根据品牌语气和禁用词要求做模板化约束。",
      },
      {
        question: "是否支持批量出稿？",
        answer: "支持围绕同一主题生成多个渠道版本，方便内容团队快速选择。",
      },
      {
        question: "能不能和现有知识库结合？",
        answer: "可将企业已有素材、案例和 FAQ 纳入交付时的技能配置。",
      },
    ],
    defaultOrder: 4,
    launchOrder: 3,
    popularityOrder: 4,
  },
  {
    id: "agent-service",
    slug: "service-quality-officer",
    name: "客服质检官",
    category: "客服",
    sceneIds: ["scene-customer-service", "scene-content-creation"],
    summary: "统一归纳高频问题、检查客服话术和培训建议，让服务流程有标准可复盘。",
    targetRoles: ["客服主管", "运营经理", "培训负责人"],
    priceRange: "按需定价",
    imageUrl:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    introduction: "客服质检官聚焦服务流程里的标准动作，帮助企业沉淀高频问答、质检标准和培训话术。",
    workflow: [
      "采集客服记录和 FAQ",
      "识别高频问题与异常话术",
      "输出质检摘要和培训清单",
      "持续更新问答知识卡",
    ],
    skills: ["FAQ 整理", "服务质检", "培训建议", "问题归档"],
    faqs: [
      {
        question: "是否支持不同产品线分开质检？",
        answer: "可以按产品或业务线建立不同规则，避免评价口径混淆。",
      },
      {
        question: "质检结果怎么使用？",
        answer: "可直接作为班组复盘材料，也可沉淀到客服培训内容中。",
      },
      {
        question: "适合纯人工客服团队吗？",
        answer: "适合，特别是在高频问答和培训动作重复较多的场景中价值明显。",
      },
    ],
    defaultOrder: 5,
    launchOrder: 5,
    popularityOrder: 5,
  },
  {
    id: "agent-dashboard",
    slug: "operations-dashboard-officer",
    name: "经营看板官",
    category: "其他",
    sceneIds: ["scene-commerce-management", "scene-sales-growth", "scene-organization"],
    summary: "把 AI 员工的产出、任务量和设备状态汇总成老板看得懂的经营视图。",
    targetRoles: ["企业老板", "管理员", "经营负责人"],
    priceRange: "项目方案定价",
    imageUrl:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    introduction:
      "经营看板官将使用量、任务完成数、成果文件和设备状态组合成老板看得懂的经营视图，适合作为企业管理侧的标配 Agent。",
    workflow: [
      "收集对话、任务和成果产出数据",
      "按老板关心的指标自动汇总",
      "生成可视化日报与周期看板",
      "辅助管理员判断采纳率与设备状态",
    ],
    skills: ["经营日报", "管理摘要", "看板配置", "设备状态汇总"],
    faqs: [
      {
        question: "这个 Agent 面向谁使用？",
        answer: "主要面向企业老板和管理员，用来回答花了多少钱、干了多少活、员工用没用。",
      },
      {
        question: "能否和其他 Agent 搭配？",
        answer: "非常适合作为套餐中的管理视角 Agent，与 HR、销售、财务场景配套交付。",
      },
      {
        question: "是否支持定时输出日报？",
        answer: "支持与定时任务能力配合，按日或按周推送摘要。",
      },
    ],
    defaultOrder: 6,
    launchOrder: 6,
    popularityOrder: 2,
  },
];

/**
 * AI 专家团场景。
 */
export const PORTAL_EXPERT_SCENES: MarketingExpertSceneItem[] = [
  {
    id: "scene-commerce-management",
    title: "商家管理",
    subtitle: "Merchant Management Crew",
    description:
      "围绕老板最关心的经营秩序、对账效率和日报透明度，把商家经营动作拆给多个 AI 专家协同完成。",
    summary: "账、盘、日报统一交给可落地的经营专家团。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
    tone: "aqua",
    agentSlugs: [
      "finance-reconciliation-officer",
      "operations-dashboard-officer",
      "recruiting-assistant",
    ],
    taskDemo: {
      user: {
        name: "刘总",
        role: "连锁品牌负责人",
        avatarSeed: "scene-commerce-management-owner",
      },
      userPrompt:
        "把昨天 28 家门店的流水、退款、缺货和招聘进度整理成一份我今天 9 点早会就能看的经营简报。",
      completionNote: "一条任务发出后，经营、财务和组织动作会在同一条链路里同步推进。",
      messages: [
        {
          id: "commerce-triage",
          speakerName: "经营收口师",
          speakerRole: "经营总览",
          avatarSeed: "commerce-triage",
          content:
            "已汇总 28 家门店昨日日报、巡店记录和待办任务，先按营收、退货和缺货三个口径做总览。",
        },
        {
          id: "commerce-finance",
          speakerName: "对账核验师",
          speakerRole: "财务复核",
          avatarSeed: "commerce-finance",
          content: "已核对流水、退款和异常差额，3 家门店退款率高于周均值，原因已补到明细里。",
        },
        {
          id: "commerce-staffing",
          speakerName: "补位协同师",
          speakerRole: "组织节奏",
          avatarSeed: "commerce-staffing",
          content:
            "同步拉取门店缺编岗位和招聘进度，华南两店的晚班人手风险已标红，给出今天的补位建议。",
        },
        {
          id: "commerce-brief",
          speakerName: "晨报生成师",
          speakerRole: "老板摘要",
          avatarSeed: "commerce-brief",
          content:
            "早会简报已生成：营收波动、退款异常、缺货门店和招聘风险已合并到一页晨报，可直接投屏。",
        },
      ],
    },
  },
  {
    id: "scene-sales-growth",
    title: "销售增长",
    subtitle: "Sales Growth Crew",
    description:
      "从线索归类、跟进节奏到增长日报，把销售团队最容易失控的推进动作标准化，让主管和老板都看见节奏。",
    summary: "让线索推进、跟进建议和销售战报始终同频。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    tone: "cobalt",
    agentSlugs: [
      "sales-lead-officer",
      "content-production-officer",
      "operations-dashboard-officer",
    ],
    taskDemo: {
      user: {
        name: "陈总",
        role: "增长负责人",
        avatarSeed: "scene-sales-growth-owner",
      },
      userPrompt:
        "今天把 45 条新线索按优先级分层，给销售一个清晰的跟进顺序，同时告诉我哪些客户最值得马上追。",
      completionNote: "从线索分层到跟进建议，再到老板看板，销售节奏不会丢在中间。",
      messages: [
        {
          id: "sales-triage",
          speakerName: "线索分诊师",
          speakerRole: "机会判断",
          avatarSeed: "sales-triage",
          content:
            "已按行业、预算、决策期和历史互动强度把 45 条线索分成 A/B/C 三层，A 层共有 12 条。",
        },
        {
          id: "sales-follow-up",
          speakerName: "跟进策略师",
          speakerRole: "动作建议",
          avatarSeed: "sales-follow-up",
          content: "已为 A 层客户生成首轮沟通话术和下一步动作，其中 4 条需要今天 6 点前电话跟进。",
        },
        {
          id: "sales-content",
          speakerName: "销售助攻师",
          speakerRole: "内容配合",
          avatarSeed: "sales-content",
          content:
            "针对 SaaS 和制造两类客户补了两套跟进材料包，销售点开就能直接发，不用再临时找素材。",
        },
        {
          id: "sales-report",
          speakerName: "战报播报师",
          speakerRole: "管理同步",
          avatarSeed: "sales-report",
          content: "今日销售战报已推送：高优机会、卡点客户和每位销售的跟进节奏都已同步到老板看板。",
        },
      ],
    },
  },
  {
    id: "scene-content-creation",
    title: "内容创作",
    subtitle: "Content Studio Crew",
    description:
      "围绕选题、脚本、品牌表达和知识沉淀，搭建一组能够持续出稿、持续复盘的内容专家组合。",
    summary: "让内容团队把判断留下，把高频生产交给专家团。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    tone: "emerald",
    agentSlugs: ["content-production-officer", "service-quality-officer"],
    taskDemo: {
      user: {
        name: "林岚",
        role: "品牌负责人",
        avatarSeed: "scene-content-creation-owner",
      },
      userPrompt:
        "给春季上新系列做 12 张主视觉，保留现有品牌调性，并把这次能跑通的方法沉淀成以后都能复用的模板。",
      completionNote: "内容不只是出图，更是在把品牌能力沉淀成一套可复用的方法。",
      messages: [
        {
          id: "content-assets",
          speakerName: "资产沉淀师",
          speakerRole: "方法归档",
          avatarSeed: "content-assets",
          content:
            "已读取近 6 个月高转化素材、提示词和版式模板，正在整理这次可直接复用的品牌风格词表。",
        },
        {
          id: "content-generate",
          speakerName: "批量生成师",
          speakerRole: "内容生产",
          avatarSeed: "content-generate",
          content:
            "基于统一风格词表开始生成 4 套方向、12 张主视觉，已锁定产品特写和场景叙事两条主线。",
        },
        {
          id: "content-qc",
          speakerName: "质检师",
          speakerRole: "品牌校验",
          avatarSeed: "content-qc",
          content:
            "已完成首轮品牌一致性比对，3 张色彩偏离品牌调性的版本已退回重生，并补充禁用元素说明。",
        },
        {
          id: "content-analysis",
          speakerName: "能力分析师",
          speakerRole: "复盘沉淀",
          avatarSeed: "content-analysis",
          content:
            "本次最佳模板为“春季轻透陈列”，已写入团队模板库，并生成后续新品复用建议和贡献度分析。",
        },
      ],
    },
  },
  {
    id: "scene-customer-service",
    title: "客户服务",
    subtitle: "Customer Service Crew",
    description:
      "将咨询接待、客服质检和商机回捞统一为一条服务链路，让客服和销售使用的是同一套节奏语言。",
    summary: "从服务质量到商机回捞，客服动作有标准可复盘。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
    tone: "amber",
    agentSlugs: ["service-quality-officer", "sales-lead-officer"],
    taskDemo: {
      user: {
        name: "沈楠",
        role: "客服主管",
        avatarSeed: "scene-customer-service-owner",
      },
      userPrompt:
        "把今天上午的 86 条咨询先分流，帮我找出最容易流失的客户和最需要培训的客服话术问题。",
      completionNote: "客户咨询、服务质检和商机回捞可以在同一个对话里被拆解执行。",
      messages: [
        {
          id: "service-routing",
          speakerName: "接待分流师",
          speakerRole: "咨询归类",
          avatarSeed: "service-routing",
          content:
            "86 条咨询已按售前、售后和投诉三类完成分流，其中 11 条高情绪客户已单独拉出优先处理。",
        },
        {
          id: "service-qc",
          speakerName: "服务质检师",
          speakerRole: "流程检查",
          avatarSeed: "service-qc",
          content: "已抽检上午全部对话，发现 3 组客服在退换货说明上口径不一致，质检摘要已生成。",
        },
        {
          id: "service-recovery",
          speakerName: "回捞提醒师",
          speakerRole: "商机回捞",
          avatarSeed: "service-recovery",
          content: "筛出 7 条即将流失但仍有购买意向的咨询，已生成回访话术和二次跟进提醒。",
        },
        {
          id: "service-training",
          speakerName: "培训整理师",
          speakerRole: "知识沉淀",
          avatarSeed: "service-training",
          content: "今天的高频问题、错误话术和培训建议已归档成客服晨会可直接使用的复盘卡片。",
        },
      ],
    },
  },
  {
    id: "scene-organization",
    title: "组织与招聘",
    subtitle: "Organization Crew",
    description:
      "适合快速扩团队或多门店复制的企业，把招聘节拍、岗位判断和管理日报一起交给组织类 AI 专家。",
    summary: "招聘节拍、组织判断和经营视角一起交付。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    tone: "violet",
    agentSlugs: ["recruiting-assistant", "operations-dashboard-officer"],
    taskDemo: {
      user: {
        name: "吴宁",
        role: "企业老板",
        avatarSeed: "scene-organization-owner",
      },
      userPrompt:
        "这个月要同时招 8 个岗位，帮我先拆 JD、筛简历、准备面试重点，再告诉我哪些岗位最影响业务。",
      completionNote: "招聘节拍、候选人判断和组织风险可以被一组专家同时接住。",
      messages: [
        {
          id: "organization-jd",
          speakerName: "JD 拆解师",
          speakerRole: "岗位理解",
          avatarSeed: "organization-jd",
          content:
            "8 个岗位的核心职责、淘汰项和加分项已拆好，销售经理和门店督导两个岗位优先级最高。",
        },
        {
          id: "organization-screen",
          speakerName: "简历筛选师",
          speakerRole: "候选判断",
          avatarSeed: "organization-screen",
          content:
            "已批量筛完 126 份简历，推荐进入面试的候选人共有 19 位，并标出了 6 个明显风险点。",
        },
        {
          id: "organization-interview",
          speakerName: "面试设计师",
          speakerRole: "提问准备",
          avatarSeed: "organization-interview",
          content:
            "每个岗位的面试问题和追问建议已生成，门店督导岗位额外补充了多门店复制能力判断维度。",
        },
        {
          id: "organization-dashboard",
          speakerName: "组织看板师",
          speakerRole: "管理同步",
          avatarSeed: "organization-dashboard",
          content:
            "招聘进度、优先岗位风险和候选人池健康度已同步到管理看板，方便你直接判断本周补位节奏。",
        },
      ],
    },
  },
  {
    id: "scene-finance-operations",
    title: "财务经营",
    subtitle: "Finance Operations Crew",
    description:
      "把高频对账、异常归因和经营日报揉成一套财务运营组合，让老板和财务主管都能快速看到关键变化。",
    summary: "对账、归因、经营日报一起落地的财务专家团。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    tone: "amber",
    agentSlugs: [
      "finance-reconciliation-officer",
      "operations-dashboard-officer",
      "sales-lead-officer",
    ],
  },
  {
    id: "scene-store-operations",
    title: "门店运营",
    subtitle: "Store Operations Crew",
    description:
      "适合多门店连锁场景，把招聘节拍、服务质检和经营看板合成一套稳定可复制的门店运营方法。",
    summary: "从开店招人到门店复盘，一组专家打穿运营动作。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
    tone: "aqua",
    agentSlugs: ["recruiting-assistant", "service-quality-officer", "operations-dashboard-officer"],
  },
  {
    id: "scene-campaign-delivery",
    title: "活动投放",
    subtitle: "Campaign Delivery Crew",
    description:
      "围绕投放节奏、活动素材和结果战报，把增长团队最容易碎片化的执行动作交给一套协同专家。",
    summary: "活动节奏、素材生产和复盘摘要同屏联动。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    tone: "cobalt",
    agentSlugs: [
      "content-production-officer",
      "sales-lead-officer",
      "operations-dashboard-officer",
    ],
  },
  {
    id: "scene-training-enablement",
    title: "培训赋能",
    subtitle: "Training Enablement Crew",
    description: "把质检、案例整理和新人带教合在一起，适合需要快速复制业务话术和 SOP 的团队。",
    summary: "培训素材、案例沉淀和质检建议统一沉到专家团里。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1516321310764-8d8c2b0fef1b?auto=format&fit=crop&w=1200&q=80",
    tone: "emerald",
    agentSlugs: ["service-quality-officer", "content-production-officer", "recruiting-assistant"],
  },
  {
    id: "scene-executive-command",
    title: "老板驾驶舱",
    subtitle: "Executive Command Crew",
    description:
      "专门给老板和经营负责人看的组合，把经营摘要、财务异常和增长进度集中到一套管理界面中。",
    summary: "经营视角优先的一组管理类 AI 专家组合。",
    coverImageUrl:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    tone: "violet",
    agentSlugs: [
      "operations-dashboard-officer",
      "finance-reconciliation-officer",
      "sales-lead-officer",
    ],
  },
];

/**
 * 首页推荐 AI 专家团场景。
 */
export const PORTAL_FEATURED_EXPERT_SCENE_IDS: string[] = [
  "scene-commerce-management",
  "scene-sales-growth",
  "scene-content-creation",
  "scene-customer-service",
  "scene-organization",
];

/**
 * 首页推荐 AI 专家团场景列表。
 */
export const PORTAL_FEATURED_EXPERT_SCENES: MarketingExpertSceneItem[] =
  PORTAL_FEATURED_EXPERT_SCENE_IDS.map(sceneId =>
    PORTAL_EXPERT_SCENES.find(item => item.id === sceneId),
  ).filter((item): item is MarketingExpertSceneItem => item !== undefined);

/**
 * Agent 套餐推荐。
 */
export const PORTAL_BUNDLES: MarketingBundleItem[] = [
  {
    id: "bundle-growth",
    name: "增长加速包",
    badge: "热门方案",
    description: "适合获客、投放和内容团队联动使用，快速验证 AI 员工对增长链路的价值。",
    priceRange: "组合方案定价",
    agentNames: ["销售线索官", "内容生产官", "经营看板官"],
  },
  {
    id: "bundle-operations",
    name: "中后台提效包",
    badge: "稳定复用",
    description: "适合把招聘、财务和老板日报等重复动作集中交给 AI 员工。",
    priceRange: "组合方案定价",
    agentNames: ["招聘助手", "财务对账官", "经营看板官"],
  },
  {
    id: "bundle-service",
    name: "服务体验包",
    badge: "新品组合",
    description: "围绕客户接待、质检和知识沉淀打造统一服务流程，适合咨询量大的企业。",
    priceRange: "组合方案定价",
    agentNames: ["客服质检官", "销售线索官", "内容生产官"],
  },
];

/**
 * 首页精选 Agent。
 */
export const PORTAL_FEATURED_AGENT_SLUGS: string[] = [
  "sales-lead-officer",
  "recruiting-assistant",
  "operations-dashboard-officer",
];

/**
 * 首页精选案例。
 */
export const PORTAL_FEATURED_CASE_SLUGS: string[] = [
  "crossborder-content-studio",
  "manufacturing-finance-ops",
  "service-chain-expansion",
];

/**
 * Agent 分类筛选项。
 */
export const PORTAL_AGENT_CATEGORY_FILTERS: MarketingAgentCategoryFilter[] = [
  "全部",
  "HR",
  "销售",
  "财务",
  "内容",
  "客服",
  "其他",
];

/**
 * Agent 排序项。
 */
export const PORTAL_AGENT_SORT_OPTIONS: MarketingAgentSort[] = ["默认排序", "最新上架", "热门"];

/**
 * 线索表单行业选项。
 */
export const PORTAL_INDUSTRY_OPTIONS: string[] = [
  "电商",
  "制造",
  "教育",
  "连锁服务",
  "软件与互联网",
  "专业服务",
  "医疗健康",
  "其他",
];
