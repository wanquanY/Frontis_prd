import type { EmployeeItem } from "../../types";
import { getExpertAccessScopeSummary } from "./utils";

export type ExpertOwnershipSource = "developed";

/**
 * 企业后台中单个 AI 专家的开发归属信息。
 */
export interface ExpertOwnershipMeta {
  acquireLabel: string;
  ownerLabel: string;
  ownerName: string;
  source: ExpertOwnershipSource;
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
 * 获取 AI 专家的来源与责任人信息。
 */
export const getExpertOwnershipMeta = (employee: EmployeeItem): ExpertOwnershipMeta => {
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
export const getExpertRangeLabel = (employee: EmployeeItem): string => {
  if (employee.visibility === "all") {
    return "企业公开";
  }

  if (employee.visibility === "bound" && employee.accessScopeSubjects.length === 0) {
    return "仅开发者";
  }

  return getExpertAccessScopeSummary(employee.visibility, employee.accessScopeSubjects);
};
