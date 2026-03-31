import { INITIAL_FRONTIS_WEB_USERS } from "@/mocks/mockData";
import type { FrontisWebRole } from "@/pages/types";

import type { MockAuthAccount } from "@/feature/auth/types";

export type FrontisWorkspaceVersion = "v1" | "v2";

const buildMockAccount = (
  userId: string,
  role: FrontisWebRole,
  roleLabel: string,
  verificationCode: string,
): MockAuthAccount => {
  const targetUser = INITIAL_FRONTIS_WEB_USERS.find(item => item.id === userId);

  if (!targetUser) {
    throw new Error(`未找到模拟登录账号: ${userId}`);
  }

  return {
    userId: targetUser.id,
    name: targetUser.name,
    phone: targetUser.phone,
    role,
    roleLabel,
    verificationCode,
  };
};

const normalizePhone = (phone: string): string => phone.replace(/\s+/g, "").trim();

export const MOCK_AUTH_ACCOUNTS: MockAuthAccount[] = [
  buildMockAccount("user-member-001", "employee", "普通用户", "123456"),
  buildMockAccount("user-admin-001", "admin", "企业老板", "123456"),
];

/**
 * 根据角色和版本获取工作台路径。
 */
export const getWorkspacePathByRole = (
  role: FrontisWebRole,
  version: FrontisWorkspaceVersion = "v1",
): string => {
  if (role === "admin") {
    return version === "v2" ? "/web/admin/v2/workspace" : "/web/admin/workspace";
  }

  return version === "v2" ? "/web/employee/v2" : "/web/employee";
};

/**
 * 根据角色获取默认工作台路径。
 */
export const getDefaultPathByRole = (role: FrontisWebRole): string =>
  getWorkspacePathByRole(role, "v1");

/**
 * 获取企业老板管理后台路径。
 */
export const getAdminManagementPath = (version: FrontisWorkspaceVersion = "v1"): string =>
  version === "v2" ? "/web/admin/v2" : "/web/admin";

/**
 * 根据手机号匹配模拟登录账号。
 */
export const getMockAccountByPhone = (phone: string): MockAuthAccount | null => {
  const normalizedPhone = normalizePhone(phone);

  return MOCK_AUTH_ACCOUNTS.find(item => item.phone === normalizedPhone) ?? null;
};

/**
 * 解析登录成功后的跳转路径。
 */
export const resolvePostLoginPath = (role: FrontisWebRole, redirectPath?: string): string => {
  const normalizedRedirectPath = redirectPath?.trim();

  if (normalizedRedirectPath?.startsWith("/web/admin") && role === "admin") {
    return normalizedRedirectPath;
  }

  if (normalizedRedirectPath?.startsWith("/web/employee") && role === "employee") {
    return normalizedRedirectPath;
  }

  return getDefaultPathByRole(role);
};
