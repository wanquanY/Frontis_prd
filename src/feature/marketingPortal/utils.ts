import {
  PORTAL_AGENTS,
  PORTAL_CASE_STUDIES,
  PORTAL_EXPERT_SCENES,
  PORTAL_FEATURED_AGENT_SLUGS,
  PORTAL_FEATURED_CASE_SLUGS,
} from "@/feature/marketingPortal/portalData";
import type {
  MarketingAgentCategoryFilter,
  MarketingAgentItem,
  MarketingAgentSort,
  MarketingCaseStudyItem,
  MarketingExpertSceneItem,
  MarketingLeadFormState,
} from "@/feature/marketingPortal/types";

/**
 * 创建线索表单初始值。
 */
export const createInitialMarketingLeadFormState = (
  interestedAgents?: string[],
): MarketingLeadFormState => ({
  name: "",
  company: "",
  role: "",
  phone: "",
  wechat: "",
  industry: "",
  interestedAgents: Array.from(new Set(interestedAgents ?? [])),
  remark: "",
});

/**
 * 校验手机号格式。
 */
export const isValidMarketingPhone = (phone: string): boolean => /^1\d{10}$/.test(phone.trim());

/**
 * 构建联系页路径，并带上感兴趣的 Agent。
 */
export const createMarketingContactPath = (agentNames?: string[]): string => {
  const normalizedAgentNames = Array.from(new Set(agentNames ?? [])).filter(Boolean);
  const searchParams = new URLSearchParams();

  if (normalizedAgentNames.length) {
    searchParams.set("agents", normalizedAgentNames.join(","));
  }

  const search = searchParams.toString();
  return search ? `/portal/contact?${search}` : "/portal/contact";
};

/**
 * 从查询参数中解析感兴趣的 Agent。
 */
export const parseMarketingLeadTargets = (searchParams: URLSearchParams): string[] => {
  const rawValue = searchParams.get("agents");

  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
};

/**
 * 根据 slug 获取 Agent。
 */
export const getMarketingAgentBySlug = (slug: string): MarketingAgentItem | null =>
  PORTAL_AGENTS.find(item => item.slug === slug) ?? null;

/**
 * 根据 slug 获取案例。
 */
export const getMarketingCaseStudyBySlug = (slug: string): MarketingCaseStudyItem | null =>
  PORTAL_CASE_STUDIES.find(item => item.slug === slug) ?? null;

/**
 * 获取 AI 专家团场景。
 */
export const getMarketingExpertScenes = (): MarketingExpertSceneItem[] => PORTAL_EXPERT_SCENES;

/**
 * 根据场景 id 获取 AI 专家团场景。
 */
export const getMarketingExpertSceneById = (sceneId: string): MarketingExpertSceneItem | null =>
  PORTAL_EXPERT_SCENES.find(item => item.id === sceneId) ?? null;

/**
 * 获取某个场景下的 AI 专家。
 */
export const getMarketingAgentsBySceneId = (sceneId: string): MarketingAgentItem[] => {
  const scene = getMarketingExpertSceneById(sceneId);

  if (scene?.agentSlugs.length) {
    return Array.from(new Set(scene.agentSlugs))
      .map(slug => getMarketingAgentBySlug(slug))
      .filter((item): item is MarketingAgentItem => item !== null);
  }

  return PORTAL_AGENTS.filter(item => item.sceneIds.includes(sceneId)).sort(
    (left, right) => left.defaultOrder - right.defaultOrder,
  );
};

/**
 * 获取首页精选 Agent。
 */
export const getFeaturedMarketingAgents = (): MarketingAgentItem[] =>
  PORTAL_FEATURED_AGENT_SLUGS.map(slug => getMarketingAgentBySlug(slug)).filter(
    (item): item is MarketingAgentItem => item !== null,
  );

/**
 * 获取首页精选案例。
 */
export const getFeaturedMarketingCaseStudies = (): MarketingCaseStudyItem[] =>
  PORTAL_FEATURED_CASE_SLUGS.map(slug => getMarketingCaseStudyBySlug(slug)).filter(
    (item): item is MarketingCaseStudyItem => item !== null,
  );

/**
 * 获取 Agent 关联案例。
 */
export const getMarketingCasesByAgentName = (agentName: string): MarketingCaseStudyItem[] =>
  PORTAL_CASE_STUDIES.filter(item => item.agentNames.includes(agentName));

/**
 * 获取相关 Agent。
 */
export const getRelatedMarketingAgents = (
  agent: MarketingAgentItem,
  count = 3,
): MarketingAgentItem[] =>
  PORTAL_AGENTS.filter(item => item.slug !== agent.slug)
    .sort((left, right) => {
      const leftScore =
        Number(left.sceneIds.some(sceneId => agent.sceneIds.includes(sceneId))) * 10 +
        Number(left.category === agent.category) * 4 +
        Number(left.targetRoles.some(role => agent.targetRoles.includes(role)));
      const rightScore =
        Number(right.sceneIds.some(sceneId => agent.sceneIds.includes(sceneId))) * 10 +
        Number(right.category === agent.category) * 4 +
        Number(right.targetRoles.some(role => agent.targetRoles.includes(role)));

      return rightScore - leftScore || left.defaultOrder - right.defaultOrder;
    })
    .slice(0, count);

/**
 * 按筛选与排序获取 Agent 列表。
 */
export const getVisibleMarketingAgents = (
  category: MarketingAgentCategoryFilter,
  sort: MarketingAgentSort,
  searchKeyword: string,
): MarketingAgentItem[] => {
  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  return PORTAL_AGENTS.filter(item => {
    if (category !== "全部" && item.category !== category) {
      return false;
    }

    if (!normalizedKeyword) {
      return true;
    }

    return (
      item.name.toLowerCase().includes(normalizedKeyword) ||
      item.summary.toLowerCase().includes(normalizedKeyword) ||
      item.targetRoles.some(role => role.toLowerCase().includes(normalizedKeyword))
    );
  }).sort((left, right) => {
    if (sort === "最新上架") {
      return left.launchOrder - right.launchOrder;
    }

    if (sort === "热门") {
      return left.popularityOrder - right.popularityOrder;
    }

    return left.defaultOrder - right.defaultOrder;
  });
};
