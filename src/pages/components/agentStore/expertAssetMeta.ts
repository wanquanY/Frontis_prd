import type { EmployeeItem } from "../../types";
import { getExpertAccessScopeSummary } from "./utils";

export type ExpertAssetSource = "developed";

/**
 * 企业后台中单个 AI 专家的资产归属信息。
 */
export interface ExpertAssetMeta {
  acquireLabel: string;
  ownerLabel: string;
  ownerName: string;
  source: ExpertAssetSource;
  sourceLabel: string;
}

interface ExpertAssetMetaOverride {
  acquireLabel?: string;
  ownerName: string;
}

const EXPERT_ASSET_META_OVERRIDES: Record<string, ExpertAssetMetaOverride> = {
  "live-ops-agent-01": {
    ownerName: "王晨",
  },
  "xiaocanmama-ip-agent-01": {
    ownerName: "李婷",
  },
  "ceo-chat-send-01": {
    ownerName: "杨万泉",
  },
  "product-manager-agent-01": {
    ownerName: "杨万泉",
  },
  "prd-architect-agent-01": {
    ownerName: "陈雪梅",
  },
  "prd-growth-agent-01": {
    ownerName: "王晨",
  },
  "prd-qa-agent-01": {
    ownerName: "赵立",
  },
  "prd-data-agent-01": {
    ownerName: "周可",
  },
  "prd-user-research-agent-01": {
    ownerName: "李婷",
  },
};

const getAcquireLabel = (employee: EmployeeItem): string => {
  if (employee.visibility === "all") {
    return "公开发布";
  }

  if (employee.accessScopeSubjects.length > 0) {
    return "团队共享";
  }

  return "个人发布";
};

/**
 * 获取 AI 专家的资产来源与责任人信息。
 */
export const getExpertAssetMeta = (employee: EmployeeItem): ExpertAssetMeta => {
  const override = EXPERT_ASSET_META_OVERRIDES[employee.agentId];

  return {
    acquireLabel: override?.acquireLabel ?? getAcquireLabel(employee),
    ownerLabel: "开发者",
    ownerName: override?.ownerName ?? "Frontis 产品组",
    source: "developed",
    sourceLabel: "企业开发",
  };
};

/**
 * 获取 AI 专家当前的企业使用范围标签。
 */
export const getExpertAssetRangeLabel = (employee: EmployeeItem): string => {
  if (employee.visibility === "all") {
    return "公开";
  }

  if (employee.visibility === "bound" && employee.accessScopeSubjects.length === 0) {
    return "仅开发者";
  }

  return getExpertAccessScopeSummary(employee.visibility, employee.accessScopeSubjects);
};
