import { FDE_DELIVERY_STEPS } from "@/feature/fde/mockData";
import type {
  FdeDeliveryStepKey,
  FdeMonitorHealth,
  FdeOpportunityStage,
  FdeTeamMemberItem,
} from "@/feature/fde/types";

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
