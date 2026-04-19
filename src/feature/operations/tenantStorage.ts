import type { OperationsTenant } from "@/feature/operations/types";

/**
 * 运营后台租户原型在本地存储中的 key。
 */
export const OPERATIONS_TENANTS_STORAGE_KEY = "frontis.operations.tenants";

/**
 * 从本地存储读取运营后台租户列表。
 */
export const loadStoredOperationsTenants = (): OperationsTenant[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(OPERATIONS_TENANTS_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue.filter(
      (item): item is OperationsTenant =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "name" in item &&
        "adminName" in item &&
        "hasFdeAccess" in item,
    );
  } catch {
    return null;
  }
};

/**
 * 将运营后台租户列表写入本地存储。
 */
export const saveStoredOperationsTenants = (tenants: OperationsTenant[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(OPERATIONS_TENANTS_STORAGE_KEY, JSON.stringify(tenants));
};
