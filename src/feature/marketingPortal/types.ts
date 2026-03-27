/**
 * 营销门户导航项。
 */
export interface MarketingPortalNavItem {
  id: string;
  label: string;
  to: string;
}

/**
 * 营销门户证明型指标。
 */
export interface MarketingProofStatItem {
  label: string;
  value: string;
  description: string;
}

/**
 * 行业信号项。
 */
export interface MarketingIndustrySignalItem {
  id: string;
  label: string;
}

/**
 * 首页用户之声卡片。
 */
export interface MarketingAnxietyMomentItem {
  id: string;
  indexLabel: string;
  authorName: string;
  authorRole: string;
  authorCompany: string;
  avatarSeed: string;
  quote: string;
  context: string;
}

/**
 * 首页 AI 员工团队成员。
 */
export interface MarketingHandoffMemberItem {
  id: string;
  title: string;
  task: string;
}

/**
 * 首页 AI 员工接管场景。
 */
export interface MarketingHandoffSceneItem {
  id: string;
  title: string;
  hook: string;
  summary: string;
  beforeText: string;
  afterText: string;
  members: MarketingHandoffMemberItem[];
}

/**
 * 首页认知重建对比项。
 */
export interface MarketingMindsetComparisonItem {
  id: string;
  legacyLabel: string;
  nextLabel: string;
}

/**
 * 首页 Logo 墙项。
 */
export interface MarketingLogoWallItem {
  id: string;
  name: string;
}

/**
 * 首页信任背书项。
 */
export interface MarketingTrustBadgeItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

/**
 * 首页套餐信息。
 */
export interface MarketingHomePackageItem {
  name: string;
  price: string;
  description: string;
  features: string[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
}

/**
 * 门户价值支柱。
 */
export interface MarketingValuePillarItem {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  footnote: string;
}

/**
 * 首页场景卡片。
 */
export interface MarketingScenarioItem {
  id: string;
  title: string;
  description: string;
  result: string;
  imageUrl: string;
}

/**
 * 架构流程步骤。
 */
export interface MarketingArchitectureStepItem {
  id: string;
  title: string;
  description: string;
}

/**
 * 技术特点卡片。
 */
export interface MarketingTechFeatureItem {
  id: string;
  title: string;
  description: string;
  bullets: string[];
}

/**
 * Agent 分类。
 */
export type MarketingAgentCategory = "HR" | "销售" | "财务" | "内容" | "客服" | "其他";

/**
 * AI 专家团场景视觉主题。
 */
export type MarketingExpertSceneTone = "aqua" | "cobalt" | "emerald" | "amber" | "violet";

/**
 * AI 专家团场景。
 */
export interface MarketingExpertSceneItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  summary: string;
  coverImageUrl: string;
  tone: MarketingExpertSceneTone;
  agentSlugs: string[];
}

/**
 * Agent 分类筛选项。
 */
export type MarketingAgentCategoryFilter = "全部" | MarketingAgentCategory;

/**
 * Agent 排序方式。
 */
export type MarketingAgentSort = "默认排序" | "最新上架" | "热门";

/**
 * 通用指标项。
 */
export interface MarketingMetricItem {
  label: string;
  value: string;
}

/**
 * 客户评价信息。
 */
export interface MarketingQuoteItem {
  authorName: string;
  authorRole: string;
  avatarUrl: string;
  content: string;
}

/**
 * 常见问题。
 */
export interface MarketingFaqItem {
  question: string;
  answer: string;
}

/**
 * Agent 信息。
 */
export interface MarketingAgentItem {
  id: string;
  slug: string;
  name: string;
  category: MarketingAgentCategory;
  sceneIds: string[];
  summary: string;
  targetRoles: string[];
  priceRange: string;
  imageUrl: string;
  introduction: string;
  workflow: string[];
  skills: string[];
  faqs: MarketingFaqItem[];
  defaultOrder: number;
  launchOrder: number;
  popularityOrder: number;
}

/**
 * 客户案例。
 */
export interface MarketingCaseStudyItem {
  id: string;
  slug: string;
  title: string;
  customerName: string;
  industry: string;
  summary: string;
  coverImageUrl: string;
  detailImageUrls: string[];
  agentNames: string[];
  background: string;
  solution: string;
  effect: string;
  metrics: MarketingMetricItem[];
  quote?: MarketingQuoteItem;
}

/**
 * Agent 套餐推荐。
 */
export interface MarketingBundleItem {
  id: string;
  name: string;
  badge: string;
  description: string;
  priceRange: string;
  agentNames: string[];
}

/**
 * 线索表单状态。
 */
export interface MarketingLeadFormState {
  name: string;
  company: string;
  role: string;
  phone: string;
  wechat: string;
  industry: string;
  interestedAgents: string[];
  remark: string;
}
