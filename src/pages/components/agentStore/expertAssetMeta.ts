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

const getAcquireLabel = (employee: EmployeeItem): string => {
  if (employee.visibility === "all") {
    return "企业公开发布";
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
  return {
    acquireLabel: getAcquireLabel(employee),
    ownerLabel: "开发者",
    ownerName: employee.developerName ?? "未标注开发者",
    source: "developed",
    sourceLabel: "企业开发",
  };
};

/**
 * 获取 AI 专家当前的企业使用范围标签。
 */
export const getExpertAssetRangeLabel = (employee: EmployeeItem): string => {
  if (employee.visibility === "all") {
    return "企业公开";
  }

  if (employee.visibility === "bound" && employee.accessScopeSubjects.length === 0) {
    return "仅开发者";
  }

  return getExpertAccessScopeSummary(employee.visibility, employee.accessScopeSubjects);
};
