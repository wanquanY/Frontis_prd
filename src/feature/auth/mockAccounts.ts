import {
  FDE_PRIMARY_GROUP_LEADER_MEMBER_ID,
  FDE_PRIMARY_LEADER_MEMBER_ID,
  FDE_PRIMARY_MEMBER_ID,
  FDE_TEAM_MEMBERS,
} from "@/feature/fde/mockData";
import { INITIAL_FRONTIS_WEB_USERS } from "@/mocks/mockData";
import type { FrontisWebRole } from "@/pages/types";

import type { MockAuthAccount, MockAuthRole } from "@/feature/auth/types";

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

const buildFdeMockAccount = (
  userId: string,
  role: Extract<MockAuthRole, "fdeMember" | "fdeAdmin">,
  roleLabel: string,
  verificationCode: string,
): MockAuthAccount => {
  const targetMember = FDE_TEAM_MEMBERS.find(item => item.id === userId);

  if (!targetMember) {
    throw new Error(`未找到 FDE 模拟登录账号: ${userId}`);
  }

  return {
    userId: targetMember.id,
    name: targetMember.name,
    phone: targetMember.phone,
    role,
    roleLabel,
    verificationCode,
  };
};

const normalizePhone = (phone: string): string => phone.replace(/\s+/g, "").trim();

export const FDE_MEMBER_MOCK_ACCOUNT: MockAuthAccount = buildFdeMockAccount(
  FDE_PRIMARY_MEMBER_ID,
  "fdeMember",
  "FDE成员",
  "123456",
);

export const FDE_LEADER_MOCK_ACCOUNT: MockAuthAccount = buildFdeMockAccount(
  FDE_PRIMARY_LEADER_MEMBER_ID,
  "fdeAdmin",
  "FDE负责人",
  "123456",
);

export const FDE_GROUP_LEADER_MOCK_ACCOUNT: MockAuthAccount = buildFdeMockAccount(
  FDE_PRIMARY_GROUP_LEADER_MEMBER_ID,
  "fdeMember",
  "FDE小组负责人",
  "123456",
);

export const MOCK_AUTH_ACCOUNTS: MockAuthAccount[] = [
  buildMockAccount("user-member-001", "employee", "普通员工", "123456"),
  buildMockAccount("user-admin-001", "admin", "企业管理员", "123456"),
  buildMockAccount("user-admin-002", "employee", "部门负责人", "123456"),
  FDE_LEADER_MOCK_ACCOUNT,
  FDE_GROUP_LEADER_MOCK_ACCOUNT,
  FDE_MEMBER_MOCK_ACCOUNT,
];

/**
 * 根据角色获取默认工作台路径。
 */
export const getWorkspacePathByRole = (role: FrontisWebRole): string => {
  if (role === "admin") {
    return "/web/admin/workspace";
  }

  return "/web/employee";
};

/**
 * 根据角色获取默认工作台路径。
 */
export const getDefaultPathByRole = (role: FrontisWebRole): string =>
  getWorkspacePathByRole(role);

/**
 * 获取任意模拟角色的默认落地路径。
 */
export const getDefaultPathByMockRole = (role: MockAuthRole): string => {
  if (role === "fdeAdmin" || role === "fdeMember") {
    return "/fde";
  }

  return getDefaultPathByRole(role);
};

/**
 * 获取企业管理员后台路径。
 */
export const getAdminManagementPath = (): string => "/web/admin";

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

/**
 * 解析任意模拟角色登录后的跳转路径。
 */
export const resolveMockPostLoginPath = (role: MockAuthRole, redirectPath?: string): string => {
  const normalizedRedirectPath = redirectPath?.trim();

  if (
    normalizedRedirectPath?.startsWith("/fde") &&
    (role === "fdeAdmin" || role === "fdeMember")
  ) {
    return normalizedRedirectPath;
  }

  if (role === "fdeAdmin" || role === "fdeMember") {
    return "/fde";
  }

  return resolvePostLoginPath(role, redirectPath);
};
