import {
  DEFAULT_TENANT_ROLE_IDS,
  SYSTEM_ACCESS_DERIVED_PERMISSION_IDS,
  SYSTEM_ACCESS_PERMISSION_IDS,
  normalizeTenantRolePermissionIds,
  type BuiltinTenantRoleKey,
  type TenantRoleItem,
} from "@/constants/tenantRolePermissions";
import type { MockAuthIdentity } from "@/feature/auth/types";
import type { FrontisUserRole, FrontisWebUserItem } from "@/pages/types";

const DEFAULT_ROLE_ID_BY_USER_ROLE: Record<FrontisUserRole, string> = {
  enterpriseAdmin: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
  departmentLead: DEFAULT_TENANT_ROLE_IDS.departmentLead,
  employee: DEFAULT_TENANT_ROLE_IDS.employee,
};

const USER_ROLE_BY_DEFAULT_ROLE_ID: Record<string, FrontisUserRole> = {
  [DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin]: "enterpriseAdmin",
  [DEFAULT_TENANT_ROLE_IDS.departmentLead]: "departmentLead",
  [DEFAULT_TENANT_ROLE_IDS.employee]: "employee",
};

/**
 * 根据兼容角色字段获取默认角色 id。
 */
export const getDefaultTenantRoleId = (role: FrontisUserRole): string =>
  DEFAULT_ROLE_ID_BY_USER_ROLE[role];

/**
 * 将统一角色 id 映射回历史用户角色，供旧 mock 账号与席位逻辑兼容。
 */
export const getLegacyUserRoleByTenantRoleId = (roleId: string): FrontisUserRole =>
  USER_ROLE_BY_DEFAULT_ROLE_ID[roleId] ?? "employee";

/**
 * 解析用户实际绑定的角色 id。未绑定新角色时回退到历史角色字段。
 */
export const getUserRoleIds = (
  user: Pick<FrontisWebUserItem, "role" | "roleIds">,
  roles?: TenantRoleItem[],
): string[] => {
  const validRoleIds = new Set(roles?.map(role => role.id) ?? []);
  const normalizedRoleIds = (user.roleIds ?? []).filter(roleId =>
    validRoleIds.size ? validRoleIds.has(roleId) : Boolean(roleId),
  );

  return normalizedRoleIds.length ? normalizedRoleIds : [getDefaultTenantRoleId(user.role)];
};

/**
 * 解析用户的主角色 id，用于单选角色场景。
 */
export const getUserPrimaryRoleId = (
  user: Pick<FrontisWebUserItem, "role" | "roleIds">,
  roles?: TenantRoleItem[],
): string => getUserRoleIds(user, roles)[0] ?? getDefaultTenantRoleId(user.role);

/**
 * 根据角色绑定关系汇总用户拥有的权限。
 */
export const getUserPermissionIds = (
  user: Pick<FrontisWebUserItem, "role" | "roleIds">,
  roles: TenantRoleItem[],
): string[] => {
  const roleMap = new Map(roles.map(role => [role.id, role]));
  const permissionSet = new Set<string>();

  getUserRoleIds(user, roles).forEach(roleId => {
    normalizeTenantRolePermissionIds(roleMap.get(roleId)?.permissionIds ?? []).forEach(
      permissionId => {
        permissionSet.add(permissionId);
      },
    );
  });

  return Array.from(permissionSet);
};

const hasDerivedSystemAccessPermission = (
  permissionIds: string[],
  systemAccessPermissionId: string,
): boolean => {
  const normalizedPermissionIds = normalizeTenantRolePermissionIds(permissionIds);

  if (permissionIds.includes(systemAccessPermissionId)) {
    return true;
  }

  if (systemAccessPermissionId === SYSTEM_ACCESS_PERMISSION_IDS.workspace) {
    return SYSTEM_ACCESS_DERIVED_PERMISSION_IDS.workspace.some(permissionId =>
      normalizedPermissionIds.includes(permissionId),
    );
  }

  if (systemAccessPermissionId === SYSTEM_ACCESS_PERMISSION_IDS.admin) {
    return SYSTEM_ACCESS_DERIVED_PERMISSION_IDS.admin.some(permissionId =>
      normalizedPermissionIds.includes(permissionId),
    );
  }

  if (systemAccessPermissionId === SYSTEM_ACCESS_PERMISSION_IDS.operations) {
    return SYSTEM_ACCESS_DERIVED_PERMISSION_IDS.operations.some(permissionId =>
      normalizedPermissionIds.includes(permissionId),
    );
  }

  return false;
};

/**
 * 判断权限集合中是否包含指定权限。
 */
export const hasPermission = (permissionIds: string[], permissionId: string): boolean =>
  hasDerivedSystemAccessPermission(permissionIds, permissionId) ||
  normalizeTenantRolePermissionIds(permissionIds).includes(permissionId);

/**
 * 判断权限集合中是否包含任一权限。
 */
export const hasAnyPermission = (permissionIds: string[], targetPermissionIds: string[]): boolean =>
  targetPermissionIds.some(permissionId => hasPermission(permissionIds, permissionId));

/**
 * 根据身份入口解析对应的系统入口权限。
 */
export const getSystemAccessPermissionId = (identity: MockAuthIdentity): string => {
  if (identity.platform === "operationsAdmin") {
    return SYSTEM_ACCESS_PERMISSION_IDS.operations;
  }

  if (identity.entryPath.startsWith("/web/admin")) {
    return SYSTEM_ACCESS_PERMISSION_IDS.admin;
  }

  return SYSTEM_ACCESS_PERMISSION_IDS.workspace;
};

/**
 * 判断统一身份是否具备对应系统入口权限；兼容旧 mock 数据缺失 permissionIds 的情况。
 */
export const hasIdentitySystemAccess = (identity: MockAuthIdentity): boolean => {
  if (!identity.permissionIds) {
    return true;
  }

  return hasPermission(identity.permissionIds, getSystemAccessPermissionId(identity));
};

/**
 * 将默认角色 key 映射成用户角色类型。
 */
export const normalizeBuiltinTenantRoleKey = (roleKey: BuiltinTenantRoleKey): FrontisUserRole =>
  roleKey;
