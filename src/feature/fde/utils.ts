import { FDE_DELIVERY_STEPS } from "@/feature/fde/mockData";
import type {
  FdeDeliveryStepKey,
  FdeMonitorHealth,
  FdeOpportunityStage,
  FdeTeamMemberItem,
  FdeWorkbenchTabKey,
} from "@/feature/fde/types";

export const FDE_BUSINESS_TAB_KEYS: FdeWorkbenchTabKey[] = [
  "dashboard",
  "opportunities",
  "orderManagement",
  "delivery",
  "operations",
  "teamManagement",
  "versionManagement",
];

export const FDE_DEVELOPMENT_TAB_KEYS: FdeWorkbenchTabKey[] = [
  "agentDev",
  "skillMarket",
  "agentStore",
  "opsInsights",
];

const FDE_WORKBENCH_ROUTE_SEGMENTS: Record<FdeWorkbenchTabKey, string> = {
  opportunities: "opportunities",
  dashboard: "dashboard",
  orderManagement: "orders",
  delivery: "delivery",
  operations: "operations",
  teamManagement: "team-management",
  versionManagement: "version-management",
  agentDev: "agent-dev",
  skillMarket: "skill-market",
  agentStore: "agent-store",
  opsInsights: "ops-insights",
};

/**
 * 商机阶段顺序。
 */
export const FDE_OPPORTUNITY_STAGE_ORDER: FdeOpportunityStage[] = [
  "初步沟通",
  "产品演示",
  "方案推荐",
  "商务谈判",
  "已成交",
];

/**
 * 格式化万元金额。
 */
export const formatWanAmount = (value: number): string => `${value.toFixed(1)} 万`;

/**
 * 从完整需求描述中提炼商机概述。
 */
export const buildFdeOpportunitySummary = (
  requirementDescription: string,
  maxLength = 28,
): string => {
  const normalizedDescription = requirementDescription.replace(/\s+/g, " ").trim();

  if (normalizedDescription.length <= maxLength) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, maxLength).trim()}...`;
};

/**
 * 根据成员 id 获取成员名称。
 */
export const getFdeMemberName = (members: FdeTeamMemberItem[], memberId: string): string =>
  members.find(item => item.id === memberId)?.name ?? "待分配";

/**
 * 生成 FDE 成员头像地址。
 */
export const getFdeAvatarUrl = (seed: string): string =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`;

/**
 * 获取 FDE 工作台模块对应的路由路径。
 */
export const getFdeWorkbenchPath = (tabKey: FdeWorkbenchTabKey): string =>
  `/fde/${FDE_WORKBENCH_ROUTE_SEGMENTS[tabKey]}`;

/**
 * 获取 FDE 开发管理工作台模块对应的路由路径。
 */
export const getFdeDevWorkbenchPath = (tabKey: FdeWorkbenchTabKey): string =>
  `/fde-dev/${FDE_WORKBENCH_ROUTE_SEGMENTS[tabKey]}`;

/**
 * 根据路由片段解析 FDE 工作台模块。
 */
export const getFdeWorkbenchTabKeyFromPath = (
  tabPath?: string,
): FdeWorkbenchTabKey | null => {
  if (!tabPath) {
    return null;
  }

  const matchedKey = (Object.keys(FDE_WORKBENCH_ROUTE_SEGMENTS) as FdeWorkbenchTabKey[]).find(
    key => FDE_WORKBENCH_ROUTE_SEGMENTS[key] === tabPath,
  );

  return matchedKey ?? null;
};

/**
 * 根据交付步骤获取序号。
 */
export const getFdeDeliveryStepIndex = (stepKey: FdeDeliveryStepKey): number =>
  Math.max(
    0,
    FDE_DELIVERY_STEPS.findIndex(item => item.key === stepKey),
  );

/**
 * 运营健康度标签。
 */
export const getFdeHealthLabel = (health: FdeMonitorHealth): string => {
  if (health === "healthy") {
    return "稳定";
  }

  if (health === "attention") {
    return "关注";
  }

  return "风险";
};
