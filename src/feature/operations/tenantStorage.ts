import type { OperationsTenant } from "@/feature/operations/types";
import {
  DEFAULT_TENANT_ROLE_IDS,
  normalizeTenantRolePermissionIds,
} from "@/constants/tenantRolePermissions";
import {
  OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID,
  getOperationsTenantInitialAdminRoleOption,
  resolveOperationsTenantAgentListingAccessByPermissions,
  resolveOperationsTenantModuleLabels,
} from "@/feature/operations/mockData";

/**
 * 运营后台租户原型在本地存储中的 key。
 */
export const OPERATIONS_TENANTS_STORAGE_KEY = "frontis.operations.tenants";

interface StoredOperationsTenant extends Omit<
  OperationsTenant,
  | "hasAgentListingAccess"
  | "hasOperationsConsoleAccess"
  | "adminPermissionIds"
  | "adminRoleId"
  | "adminRoleLabel"
  | "effectiveAt"
  | "deploymentMode"
  | "edition"
  | "billingMode"
> {
  hasAgentListingAccess?: boolean;
  hasOperationsConsoleAccess?: boolean;
  adminPermissionIds?: string[];
  adminRoleId?: string;
  adminRoleLabel?: string;
  hasAgentDevAccess?: boolean;
  deploymentMode?: OperationsTenant["deploymentMode"];
  edition?: OperationsTenant["edition"];
  billingMode?: OperationsTenant["billingMode"];
  effectiveAt?: string;
}

const normalizeStoredTenant = (tenant: StoredOperationsTenant): OperationsTenant => {
  const {
    deploymentMode,
    edition,
    billingMode,
    adminPermissionIds,
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
  const normalizedPermissionIds = normalizeTenantRolePermissionIds(
    Array.isArray(adminPermissionIds) ? adminPermissionIds : normalizedAdminRole.permissionIds,
  );
  const normalizedModuleLabels = resolveOperationsTenantModuleLabels(normalizedPermissionIds);
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
    billingMode:
      billingMode === "cost"
        ? "cost"
        : billingMode === "points"
          ? "points"
          : deploymentMode === "privateCloud" || restTenant.id === "tenant-enterprise-demo"
            ? "cost"
            : "points",
    hasAgentListingAccess:
      resolveOperationsTenantAgentListingAccessByPermissions(normalizedPermissionIds),
    hasOperationsConsoleAccess: normalizedOperationsAccess,
    adminPermissionIds: normalizedPermissionIds,
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
