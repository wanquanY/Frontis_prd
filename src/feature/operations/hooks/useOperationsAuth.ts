import { useCallback } from "react";

import {
  OPERATIONS_ACCOUNT_OPTIONS,
  resolveOperationsEntryPath,
} from "@/feature/operations/mockData";
import type {
  OperationsAccount,
  OperationsAuthActionResult,
  OperationsLoginParams,
  OperationsSession,
} from "@/feature/operations/types";
import { useOperationsAuthStore } from "@/store/operationsAuth";

const isValidOperationsPhone = (phone: string): boolean => /^\d{11}$/.test(phone.trim());

const findOperationsAccountByPhone = (phone: string): OperationsAccount | null => {
  const normalizedPhone = phone.replace(/\s+/g, "").trim();

  return OPERATIONS_ACCOUNT_OPTIONS.find(item => item.phone === normalizedPhone) ?? null;
};

const buildOperationsSession = (account: OperationsAccount): OperationsSession => ({
  accountId: account.accountId,
  userId: account.userId,
  name: account.name,
  phone: account.phone,
  role: account.role,
  roleLabel: account.roleLabel,
  loginAt: new Date().toISOString(),
  entryPath: account.entryPath,
});

interface UseOperationsAuthResult {
  session: OperationsSession | null;
  sendVerificationCode: (phone: string) => OperationsAuthActionResult;
  login: (params: OperationsLoginParams) => OperationsAuthActionResult;
  logout: () => void;
  resolveSessionPath: (session: OperationsSession, redirectPath?: string) => string;
}

/**
 * 提供运营后台模拟登录、退出和跳转解析能力。
 */
export const useOperationsAuth = (): UseOperationsAuthResult => {
  const session = useOperationsAuthStore(state => state.session);
  const setSession = useOperationsAuthStore(state => state.setSession);
  const clearSession = useOperationsAuthStore(state => state.clearSession);

  const sendVerificationCode = useCallback((phone: string): OperationsAuthActionResult => {
    if (!isValidOperationsPhone(phone)) {
      return {
        success: false,
        message: "请输入正确的手机号。",
      };
    }

    const account = findOperationsAccountByPhone(phone);

    if (!account) {
      return {
        success: false,
        message: "当前手机号未开通运营后台权限。",
      };
    }

    return {
      success: true,
      message: "验证码已发送，请注意查收。",
      account,
    };
  }, []);

  const login = useCallback(
    ({ phone, verificationCode, redirectPath }: OperationsLoginParams): OperationsAuthActionResult => {
      if (!isValidOperationsPhone(phone)) {
        return {
          success: false,
          message: "请输入正确的手机号。",
        };
      }

      const account = findOperationsAccountByPhone(phone);

      if (!account) {
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

      if (verificationCode.trim() !== account.verificationCode) {
        return {
          success: false,
          message: "账号或验证码错误。",
        };
      }

      const nextSession = buildOperationsSession(account);
      const nextRedirectPath = resolveOperationsEntryPath(redirectPath ?? account.entryPath);

      setSession(nextSession);

      return {
        success: true,
        message: "登录成功。",
        account,
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
    resolveSessionPath: (_session, redirectPath) => resolveOperationsEntryPath(redirectPath),
  };
};
