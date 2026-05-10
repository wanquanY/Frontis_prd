import type { OperationsTenant } from "@/feature/operations/types";
import { DEFAULT_TENANT_ROLE_IDS } from "@/constants/tenantRolePermissions";
import {
  OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID,
  getOperationsTenantInitialAdminRoleOption,
  resolveOperationsTenantAgentListingAccess,
} from "@/feature/operations/mockData";

/**
 * 运营后台租户原型在本地存储中的 key。
 */
export const OPERATIONS_TENANTS_STORAGE_KEY = "frontis.operations.tenants";

interface StoredOperationsTenant extends Omit<
  OperationsTenant,
  | "hasAgentListingAccess"
  | "hasOperationsConsoleAccess"
  | "adminRoleId"
  | "adminRoleLabel"
  | "effectiveAt"
  | "deploymentMode"
  | "edition"
> {
  hasAgentListingAccess?: boolean;
  hasOperationsConsoleAccess?: boolean;
  adminRoleId?: string;
  adminRoleLabel?: string;
  hasAgentDevAccess?: boolean;
  deploymentMode?: OperationsTenant["deploymentMode"];
  edition?: OperationsTenant["edition"];
  effectiveAt?: string;
}

const normalizeStoredTenant = (tenant: StoredOperationsTenant): OperationsTenant => {
  const {
    deploymentMode,
    edition,
    adminRoleId,
    hasOperationsConsoleAccess,
    effectiveAt,
    ...restTenant
  } = tenant;
  const legacyOperationsAccess =
    typeof hasOperationsConsoleAccess === "boolean"
      ? hasOperationsConsoleAccess
      : restTenant.id === "tenant-enterprise-demo" ||
        restTenant.id === "tenant-enterprise-hq" ||
        restTenant.id === "ops-tenant-004" ||
        (restTenant.moduleLabels?.some(label => label.includes("运营")) ?? false);
  const normalizedAdminRole = getOperationsTenantInitialAdminRoleOption(
    adminRoleId ??
      (legacyOperationsAccess
        ? OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID
        : DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin),
  );
  const normalizedModuleLabels = normalizedAdminRole.moduleLabels;
  const normalizedOperationsAccess = normalizedModuleLabels.some(label => label.includes("运营"));

  return {
    ...restTenant,
    deploymentMode:
      deploymentMode === "privateCloud"
        ? "privateCloud"
        : deploymentMode === "publicCloud"
          ? "publicCloud"
          : restTenant.id === "tenant-enterprise-demo"
            ? "privateCloud"
            : "publicCloud",
    edition: edition === "personal" || restTenant.seatCount === 1 ? "personal" : "team",
    hasAgentListingAccess: resolveOperationsTenantAgentListingAccess(normalizedAdminRole.value),
    hasOperationsConsoleAccess: normalizedOperationsAccess,
    adminRoleId: normalizedAdminRole.value,
    adminRoleLabel: normalizedAdminRole.label,
    effectiveAt: effectiveAt ?? "",
    moduleLabels: normalizedModuleLabels,
  };
};

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
      (item): item is StoredOperationsTenant =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "name" in item &&
        "adminName" in item,
    );

    return tenantItems.map(normalizeStoredTenant);
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
