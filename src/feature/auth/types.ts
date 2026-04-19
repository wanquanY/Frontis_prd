import type { FrontisWebRole } from "@/pages/types";

export type MockAuthRole = FrontisWebRole;
export type MockIdentityPlatform = "enterpriseWorkspace" | "enterpriseAdmin";

/**
 * 统一用户的可选身份入口定义。
 */
export interface MockAuthIdentity {
  id: string;
  subjectId: string;
  subjectName: string;
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  platform: MockIdentityPlatform;
  platformLabel: string;
  role: MockAuthRole;
  roleLabel: string;
  description: string;
  entryPath: string;
}

/**
 * 当前账号可见的系统入口。
 */
export interface MockAuthSystemEntry {
  identityId: string;
  label: string;
  entryPath: string;
  platform: MockIdentityPlatform;
}

/**
 * 当前账号可切换的租户入口。
 */
export interface MockAuthTenantEntry {
  tenantId: string;
  tenantName: string;
  tenantCode: string;
}

/**
 * 模拟登录账号信息。
 */
export interface MockAuthAccount {
  accountId: string;
  userId: string;
  name: string;
  phone: string;
  role: MockAuthRole;
  roleLabel: string;
  description: string;
  verificationCode: string;
  identities: MockAuthIdentity[];
  quickLoginIdentityId?: string;
}

/**
 * 模拟登录会话信息。
 */
export interface MockAuthSession {
  accountId: string;
  userId: string;
  name: string;
  phone: string;
  role: MockAuthRole | null;
  roleLabel?: string;
  loginAt: string;
  identities: MockAuthIdentity[];
  activeIdentityId?: string;
}

/**
 * 模拟登录提交参数。
 */
export interface MockLoginParams {
  phone: string;
  verificationCode: string;
  redirectPath?: string;
}

/**
 * 模拟登录动作结果。
 */
export interface MockAuthActionResult {
  success: boolean;
  message: string;
  redirectPath?: string;
  verificationCode?: string;
  account?: MockAuthAccount;
  session?: MockAuthSession;
  identity?: MockAuthIdentity;
}
