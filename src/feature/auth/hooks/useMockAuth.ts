import { useCallback } from "react";

import {
  getDefaultPathByMockRole,
  getMockAccountByPhone,
  resolveMockPostLoginPath,
} from "@/feature/auth/mockAccounts";
import type { MockAuthActionResult, MockAuthSession, MockLoginParams } from "@/feature/auth/types";
import { isValidMarketingPhone } from "@/feature/marketingPortal/utils";
import { useAuthStore } from "@/store/auth";

interface UseMockAuthResult {
  session: MockAuthSession | null;
  sendVerificationCode: (phone: string) => MockAuthActionResult;
  login: (params: MockLoginParams) => MockAuthActionResult;
  logout: () => void;
  getDefaultPathByRole: typeof getDefaultPathByMockRole;
  resolvePostLoginPath: typeof resolveMockPostLoginPath;
}

/**
 * 提供原型系统模拟登录所需的账号、登录和退出能力。
 */
export const useMockAuth = (): UseMockAuthResult => {
  const session = useAuthStore(state => state.session);
  const setSession = useAuthStore(state => state.setSession);
  const clearSession = useAuthStore(state => state.clearSession);

  const sendVerificationCode = useCallback((phone: string): MockAuthActionResult => {
    if (!isValidMarketingPhone(phone)) {
      return {
        success: false,
        message: "请输入正确的手机号。",
      };
    }

    const matchedAccount = getMockAccountByPhone(phone);

    if (!matchedAccount) {
      return {
        success: false,
        message: "当前手机号未开通，请联系管理员。",
      };
    }

    return {
      success: true,
      message: "验证码已发送，请注意查收。",
      account: matchedAccount,
    };
  }, []);

  const login = useCallback(
    ({ phone, verificationCode, redirectPath }: MockLoginParams): MockAuthActionResult => {
      if (!isValidMarketingPhone(phone)) {
        return {
          success: false,
          message: "请输入正确的手机号。",
        };
      }

      const matchedAccount = getMockAccountByPhone(phone);

      if (!matchedAccount) {
        return {
          success: false,
          message: "账号或验证码错误。",
        };
      }

      if (!/^\d{6}$/.test(verificationCode.trim())) {
        return {
          success: false,
          message: "请输入 6 位验证码。",
        };
      }

      if (verificationCode.trim() !== matchedAccount.verificationCode) {
        return {
          success: false,
          message: "账号或验证码错误。",
        };
      }

      const nextSession: MockAuthSession = {
        userId: matchedAccount.userId,
        name: matchedAccount.name,
        phone: matchedAccount.phone,
        role: matchedAccount.role,
        loginAt: new Date().toISOString(),
      };
      const nextRedirectPath = resolveMockPostLoginPath(matchedAccount.role, redirectPath);

      setSession(nextSession);

      return {
        success: true,
        message: "登录成功。",
        account: matchedAccount,
        session: nextSession,
        redirectPath: nextRedirectPath,
      };
    },
    [setSession],
  );

  const logout = useCallback((): void => {
    clearSession();
  }, [clearSession]);

  return {
    session,
    sendVerificationCode,
    login,
    logout,
    getDefaultPathByRole: getDefaultPathByMockRole,
    resolvePostLoginPath: resolveMockPostLoginPath,
  };
};
