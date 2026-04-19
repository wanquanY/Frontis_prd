import type { EmployeeItem } from "../../types";
import { getExpertAccessScopeSummary } from "./utils";

export type ExpertAssetSource = "purchased" | "developed";

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
  source: ExpertAssetSource;
}

const PURCHASED_AGENT_IDS = new Set<string>([
  "ceo-sequence-overview-01",
  "ceo-employee-assess-01",
  "ceo-redline-detect-01",
  "ceo-benchmark-find-01",
  "ceo-score-rank-01",
  "ecom-ops-agent-01",
]);

const EXPERT_ASSET_META_OVERRIDES: Record<string, ExpertAssetMetaOverride> = {
  "ceo-sequence-overview-01": {
    source: "purchased",
    ownerName: "杨万泉",
  },
  "ceo-employee-assess-01": {
    source: "purchased",
    ownerName: "陈雪梅",
  },
  "ceo-redline-detect-01": {
    source: "purchased",
    ownerName: "陈雪梅",
  },
  "ceo-benchmark-find-01": {
    source: "purchased",
    ownerName: "杨万泉",
  },
  "ceo-score-rank-01": {
    source: "purchased",
    ownerName: "杨万泉",
  },
  "ecom-ops-agent-01": {
    source: "purchased",
    ownerName: "杨万泉",
    acquireLabel: "正式购买",
  },
  "live-ops-agent-01": {
    source: "developed",
    ownerName: "王晨",
  },
  "xiaocanmama-ip-agent-01": {
    source: "developed",
    ownerName: "李婷",
  },
  "ceo-chat-send-01": {
    source: "developed",
    ownerName: "杨万泉",
  },
  "product-manager-agent-01": {
    source: "developed",
    ownerName: "杨万泉",
  },
  "prd-architect-agent-01": {
    source: "developed",
    ownerName: "陈雪梅",
  },
  "prd-growth-agent-01": {
    source: "developed",
    ownerName: "王晨",
  },
  "prd-qa-agent-01": {
    source: "developed",
    ownerName: "赵立",
  },
  "prd-data-agent-01": {
    source: "developed",
    ownerName: "周可",
  },
  "prd-user-research-agent-01": {
    source: "developed",
    ownerName: "李婷",
  },
};

/**
 * 获取 AI 专家的资产来源与责任人信息。
 */
export const getExpertAssetMeta = (employee: EmployeeItem): ExpertAssetMeta => {
  const override = EXPERT_ASSET_META_OVERRIDES[employee.agentId];
  const source =
    override?.source ??
    (PURCHASED_AGENT_IDS.has(employee.agentId) ? "purchased" : "developed");

  if (source === "purchased") {
    return {
      acquireLabel: override?.acquireLabel ?? "企业采购开通",
      ownerLabel: "采购人",
      ownerName: override?.ownerName ?? "杨万泉",
      source,
      sourceLabel: "企业采购",
    };
  }

  return {
    acquireLabel: override?.acquireLabel ?? "企业内部发布",
    ownerLabel: "开发者",
    ownerName: override?.ownerName ?? "Frontis 产品组",
    source,
    sourceLabel: "企业开发",
  };
};

/**
 * 获取 AI 专家当前的企业使用范围标签。
 */
export const getExpertAssetRangeLabel = (employee: EmployeeItem): string => {
  if (employee.visibility === "bound" && employee.accessScopeSubjects.length === 0) {
    return "仅开发者";
  }

  return getExpertAccessScopeSummary(employee.visibility, employee.accessScopeSubjects);
};
