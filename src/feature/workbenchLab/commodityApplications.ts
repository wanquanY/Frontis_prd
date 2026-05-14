import type { OperationsAgentSubmission } from "@/feature/operations/types";

/**
 * 企业员工提交商品化申请在本地原型中的持久化 key。
 */
export const ENTERPRISE_COMMODITY_APPLICATION_STORAGE_KEY =
  "frontis.enterprise.commodity.applications";

/**
 * 从本地存储读取商品化申请。
 */
export const loadEnterpriseCommodityApplications =
  (): OperationsAgentSubmission[] => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const rawValue = window.localStorage.getItem(
        ENTERPRISE_COMMODITY_APPLICATION_STORAGE_KEY,
      );

      if (!rawValue) {
        return [];
      }

      const parsedValue = JSON.parse(rawValue) as unknown;

      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue.filter(
        (item): item is OperationsAgentSubmission =>
          typeof item === "object" &&
          item !== null &&
          "id" in item &&
          "name" in item &&
          "status" in item &&
          "submittedAt" in item,
      );
    } catch {
      return [];
    }
  };

/**
 * 将商品化申请写入本地存储。
 */
export const saveEnterpriseCommodityApplications = (
  applications: OperationsAgentSubmission[],
): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ENTERPRISE_COMMODITY_APPLICATION_STORAGE_KEY,
    JSON.stringify(applications),
  );
};
