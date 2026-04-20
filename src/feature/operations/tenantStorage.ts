import type { OperationsTenant } from "@/feature/operations/types";

/**
 * 运营后台租户原型在本地存储中的 key。
 */
export const OPERATIONS_TENANTS_STORAGE_KEY = "frontis.operations.tenants";
const DEFAULT_MOCK_FDE_TENANT_ID = "tenant-enterprise-demo";

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

    const tenantItems = parsedValue.filter(
      (item): item is OperationsTenant =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "name" in item &&
        "adminName" in item &&
        "hasFdeAccess" in item,
    );

    const normalizedTenantItems = tenantItems.map(item =>
      item.id === DEFAULT_MOCK_FDE_TENANT_ID && !item.hasFdeAccess
        ? {
            ...item,
            hasFdeAccess: true,
          }
        : item,
    );

    const hasNormalized =
      normalizedTenantItems.length === tenantItems.length &&
      normalizedTenantItems.some(
        (item, index) => item.id === DEFAULT_MOCK_FDE_TENANT_ID && item !== tenantItems[index],
      );

    if (hasNormalized) {
      window.localStorage.setItem(
        OPERATIONS_TENANTS_STORAGE_KEY,
        JSON.stringify(normalizedTenantItems),
      );
    }

    return normalizedTenantItems;
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
