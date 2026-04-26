import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMockAuthAccounts,
  applyIdentityToSession,
  registerMockTenantAdminAccount,
  createMockSession,
  findIdentityForPath,
  getDefaultIdentity,
  getActiveSessionIdentity,
  getTenantCount,
  getTenantIdentities,
  getIdentityById,
  getMockAccountByAccountId,
  getMockAccountByPhone,
  normalizeMockSession,
  resolveIdentityEntryPath,
  resolveSessionEntryPath,
} from "@/feature/auth/mockAccounts";
import type {
  MockAuthActionResult,
  MockAuthAccount,
  MockAuthIdentity,
  MockLoginParams,
  MockAuthSession,
  MockTenantRegistrationParams,
} from "@/feature/auth/types";
import { isValidMarketingPhone } from "@/feature/marketingPortal/utils";
import { useAuthStore } from "@/store/auth";

interface UseMockAuthResult {
  mockAccounts: MockAuthAccount[];
  session: MockAuthSession | null;
  activeIdentity: MockAuthIdentity | null;
  sendVerificationCode: (phone: string, scene?: "login" | "register") => MockAuthActionResult;
  login: (params: MockLoginParams) => MockAuthActionResult;
  register: (params: MockTenantRegistrationParams) => MockAuthActionResult;
  quickLoginByAccountId: (
    accountId: string,
    preferredIdentityId?: string,
    redirectPath?: string,
  ) => MockAuthActionResult;
  activateTenant: (tenantId: string, redirectPath?: string) => MockAuthActionResult;
  activateIdentity: (identityId: string, redirectPath?: string) => MockAuthActionResult;
  logout: () => void;
  resolveSessionPath: typeof resolveSessionEntryPath;
}

/**
 * 提供原型系统模拟登录、租户选择和退出能力。
 */
export const useMockAuth = (): UseMockAuthResult => {
  const rawSession = useAuthStore(state => state.session);
  const setSession = useAuthStore(state => state.setSession);
  const clearSession = useAuthStore(state => state.clearSession);
  const [mockAccounts, setMockAccounts] = useState<MockAuthAccount[]>(() => getMockAuthAccounts());
  const session = useMemo<MockAuthSession | null>(
    () => normalizeMockSession(rawSession),
    [rawSession],
  );
  const activeIdentity = useMemo(
    () => getActiveSessionIdentity(session),
    [session],
  );

  useEffect(() => {
    if (rawSession && session && rawSession !== session) {
      setSession(session);
    }
  }, [rawSession, session, setSession]);

  const refreshMockAccounts = useCallback((): void => {
    setMockAccounts(getMockAuthAccounts());
  }, []);

  const sendVerificationCode = useCallback((phone: string, scene: "login" | "register" = "login"): MockAuthActionResult => {
    if (!isValidMarketingPhone(phone)) {
      return {
        success: false,
        message: "请输入正确的手机号。",
      };
    }

    const matchedAccount = getMockAccountByPhone(phone);

    if (scene === "login" && !matchedAccount) {
      return {
        success: false,
        message: "当前手机号未开通，请联系管理员。",
      };
    }

    if (scene === "register" && matchedAccount) {
      return {
        success: false,
        message: "当前手机号已注册，请直接登录。",
      };
    }

    return {
      success: true,
      message: "验证码已发送，请注意查收。",
      account: matchedAccount ?? undefined,
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

      const hasMultipleTenants = getTenantCount(matchedAccount.identities) > 1;
      const routeIdentity = hasMultipleTenants
        ? null
        : findIdentityForPath(matchedAccount.identities, redirectPath);
      const defaultIdentity =
        routeIdentity ??
        (hasMultipleTenants
          ? null
          : getDefaultIdentity(
              matchedAccount.identities,
              matchedAccount.quickLoginIdentityId,
            )) ??
        undefined;
      const nextSession = createMockSession(matchedAccount, defaultIdentity);
      const nextRedirectPath = resolveSessionEntryPath(nextSession, redirectPath);

      setSession(nextSession);

      return {
        success: true,
        message: defaultIdentity ? "登录成功。" : "登录成功，请选择进入租户。",
        account: matchedAccount,
        session: nextSession,
        redirectPath: nextRedirectPath,
        identity: defaultIdentity,
      };
    },
    [setSession],
  );

  const register = useCallback(
    (params: MockTenantRegistrationParams): MockAuthActionResult => {
      if (!params.name.trim()) {
        return {
          success: false,
          message: "请输入你的姓名。",
        };
      }

      if (!params.tenantName.trim()) {
        return {
          success: false,
          message: "请输入租户名称。",
        };
      }

      if (!isValidMarketingPhone(params.phone)) {
        return {
          success: false,
          message: "请输入正确的手机号。",
        };
      }

      if (!/^\d{6}$/.test(params.verificationCode.trim())) {
        return {
          success: false,
          message: "请输入 6 位验证码。",
        };
      }

      if (params.verificationCode.trim() !== "123456") {
        return {
          success: false,
          message: "验证码错误。",
        };
      }

      const payload = registerMockTenantAdminAccount(params);

      if (!payload) {
        return {
          success: false,
          message: "当前手机号已注册，请直接登录。",
        };
      }

      const defaultIdentity = getDefaultIdentity(payload.account.identities) ?? undefined;
      const nextSession = createMockSession(payload.account, defaultIdentity);

      setSession(nextSession);
      refreshMockAccounts();

      return {
        success: true,
        message: "注册成功，已为你创建个人版租户。",
        account: payload.account,
        session: nextSession,
        identity: defaultIdentity,
        redirectPath: "/web/admin/workspace/agent-store",
      };
    },
    [refreshMockAccounts, setSession],
  );

  const quickLoginByAccountId = useCallback(
    (
      accountId: string,
      preferredIdentityId?: string,
      redirectPath?: string,
    ): MockAuthActionResult => {
      const matchedAccount = getMockAccountByAccountId(accountId);

      if (!matchedAccount) {
        return {
          success: false,
          message: "未找到对应体验账号。",
        };
      }

      const selectedIdentity =
        (preferredIdentityId
          ? getIdentityById(matchedAccount.identities, preferredIdentityId)
          : null) ??
        (getTenantCount(matchedAccount.identities) > 1
          ? null
          : findIdentityForPath(matchedAccount.identities, redirectPath)) ??
        (getTenantCount(matchedAccount.identities) > 1
          ? null
          : getDefaultIdentity(
              matchedAccount.identities,
              matchedAccount.quickLoginIdentityId,
            )) ??
        undefined;
      const nextSession = createMockSession(matchedAccount, selectedIdentity);
      const nextRedirectPath = resolveSessionEntryPath(nextSession, redirectPath);

      setSession(nextSession);

      return {
        success: true,
        message: selectedIdentity ? "登录成功。" : "登录成功，请选择进入租户。",
        account: matchedAccount,
        session: nextSession,
        redirectPath: nextRedirectPath,
        identity: selectedIdentity,
      };
    },
    [setSession],
  );

  const activateTenant = useCallback(
    (tenantId: string, redirectPath?: string): MockAuthActionResult => {
      if (!session) {
        return {
          success: false,
          message: "当前未登录，请先登录。",
        };
      }

      const tenantIdentities = getTenantIdentities(session.identities, tenantId);

      if (!tenantIdentities.length) {
        return {
          success: false,
          message: "未找到对应租户，请重新选择。",
        };
      }

      const selectedIdentity =
        findIdentityForPath(tenantIdentities, redirectPath) ??
        getDefaultIdentity(tenantIdentities) ??
        null;

      if (!selectedIdentity) {
        return {
          success: false,
          message: "当前租户暂无可进入系统。",
        };
      }

      const nextSession = applyIdentityToSession(session, selectedIdentity);
      const nextRedirectPath = resolveIdentityEntryPath(selectedIdentity, redirectPath);

      setSession(nextSession);

      return {
        success: true,
        message: "租户切换成功。",
        session: nextSession,
        redirectPath: nextRedirectPath,
        identity: selectedIdentity,
      };
    },
    [session, setSession],
  );

  const activateIdentity = useCallback(
    (identityId: string, redirectPath?: string): MockAuthActionResult => {
      if (!session) {
        return {
          success: false,
          message: "当前未登录，请先登录。",
        };
      }

      const selectedIdentity = getIdentityById(session.identities, identityId);

      if (!selectedIdentity) {
        return {
          success: false,
          message: "未找到可用身份，请重新选择。",
        };
      }

      const nextSession = applyIdentityToSession(session, selectedIdentity);
      const nextRedirectPath = resolveIdentityEntryPath(selectedIdentity, redirectPath);

      setSession(nextSession);

      return {
        success: true,
        message: "身份切换成功。",
        session: nextSession,
        redirectPath: nextRedirectPath,
        identity: selectedIdentity,
      };
    },
    [session, setSession],
  );

  const logout = useCallback((): void => {
    clearSession();
  }, [clearSession]);

  return {
    mockAccounts,
    session,
    activeIdentity,
    sendVerificationCode,
    login,
    register,
    quickLoginByAccountId,
    activateTenant,
    activateIdentity,
    logout,
    resolveSessionPath: resolveSessionEntryPath,
  };
};
