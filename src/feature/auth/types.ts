import type { FrontisWebRole } from "@/pages/types";

/**
 * 模拟登录账号信息。
 */
export interface MockAuthAccount {
  userId: string;
  name: string;
  phone: string;
  role: FrontisWebRole;
  roleLabel: string;
  verificationCode: string;
}

/**
 * 模拟登录会话信息。
 */
export interface MockAuthSession {
  userId: string;
  name: string;
  phone: string;
  role: FrontisWebRole;
  loginAt: string;
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
}
