import type {
  AgentStoreLeadFormState,
  AgentStoreMarketItem,
  AgentStoreResolvedScenarioKey,
  AgentStoreScenarioOption,
} from "./types";

/**
 * 专家卡片默认展示的技能条数。
 */
export const MAX_AGENT_CARD_SKILLS = 2;

/**
 * 专家团场景筛选项。
 */
export const AGENT_STORE_SCENARIO_OPTIONS: AgentStoreScenarioOption[] = [
  { key: "all", label: "全部场景" },
  { key: "product", label: "产品研发" },
  { key: "content", label: "设计创作" },
  { key: "research", label: "资料研究" },
  { key: "delivery", label: "交付协同" },
  { key: "sales", label: "销售运营" },
  { key: "hr", label: "人事招聘" },
  { key: "service", label: "客户服务" },
  { key: "finance", label: "财务运营" },
  { key: "management", label: "经营管理" },
];

/**
 * 场景说明文案。
 */
export const AGENT_STORE_SCENE_SUMMARY_MAP: Record<AgentStoreResolvedScenarioKey, string> = {
  content: "把内容规划、视觉表达和资料补全放到同一个交付场景里，适合品牌、市场和内容团队统一推进。",
  delivery: "围绕上线排期、提测检查和交付协同组织一组专家，适合项目负责人统一推进执行节奏。",
  finance: "把对账、异常定位和经营汇总收进同一个财务场景，方便管理者按业务结果看进度。",
  hr: "围绕岗位需求拆解、候选人筛选和组织节奏搭建一组招聘专家，适合 HR 与业务主管协同使用。",
  management: "用经营摘要、进度汇总和管理视角类专家组成管理驾驶舱，适合老板和负责人统一查看。",
  product: "先把需求收敛、信息检索和方案整理放进一个产品场景，方便产品和设计团队共同协作。",
  research: "专注资料研究、背景补全和案例整理，适合前期调研、策略判断和行业学习。",
  sales: "把线索推进、经营跟进和上线协同组合成销售场景，让主管直接看到推进节奏。",
  service: "围绕客户接待、质检复盘和服务协同组织专家，适合客服主管和运营负责人一起使用。",
};

/**
 * 已购买专家与场景的映射关系。
 */
export const AGENT_STORE_SCENE_OWNED_EMPLOYEE_IDS_MAP: Record<
  AgentStoreResolvedScenarioKey,
  string[]
> = {
  content: ["employee-designer", "employee-writer", "employee-research"],
  delivery: ["employee-ops", "employee-pm"],
  finance: ["employee-ops"],
  hr: ["employee-pm"],
  management: ["employee-pm", "employee-sales", "employee-ops"],
  product: ["employee-pm", "employee-research", "employee-designer"],
  research: ["employee-research", "employee-pm"],
  sales: ["employee-sales", "employee-ops"],
  service: ["employee-writer", "employee-ops"],
};

/**
 * 待采购 AI 专家 mock 数据。
 */
export const AGENT_STORE_MARKET_ITEMS: AgentStoreMarketItem[] = [
  {
    capabilityTags: ["简历解析", "JD 匹配", "面试提纲"],
    category: "人事招聘",
    highlight: "适合 HR 团队补充筛选与候选人分析能力。",
    id: "market-agent-hr",
    name: "招聘助手",
    scenarioKey: "hr",
    summary: "围绕招聘需求拆解、简历筛选和候选人报告输出展开，适合承接高频初筛工作。",
  },
  {
    capabilityTags: ["工单抽检", "话术质检", "服务评分"],
    category: "客户服务",
    highlight: "适合客服主管快速搭建服务质量复盘流程。",
    id: "market-agent-cs",
    name: "客服质检官",
    scenarioKey: "service",
    summary: "自动抽检客服会话、识别风险话术并输出服务质量评分和改进建议。",
  },
  {
    capabilityTags: ["流水比对", "异常定位", "日报汇总"],
    category: "财务运营",
    highlight: "适合财务团队做对账提效和异常归因。",
    id: "market-agent-finance",
    name: "财务对账官",
    scenarioKey: "finance",
    summary: "读取表格、票据和银行流水，自动完成差异定位并形成对账结论。",
  },
  {
    capabilityTags: ["经营分析", "趋势归纳", "管理播报"],
    category: "经营管理",
    highlight: "适合老板或部门负责人快速拉通业务看板。",
    id: "market-agent-bi",
    name: "经营看板官",
    scenarioKey: "management",
    summary: "把经营指标、项目进度和团队动作汇总成管理层可直接阅读的经营摘要。",
  },
];

/**
 * 创建专家团需求表单初始值。
 */
export const createInitialAgentStoreLeadFormState = (): AgentStoreLeadFormState => ({
  company: "",
  contactName: "",
  contactPhone: "",
  desiredAgent: "",
  note: "",
  role: "",
  scenario: "",
});
