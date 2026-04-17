import { useCallback, useEffect, useMemo } from "react";

import {
  applyIdentityToSession,
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
  MockAuthIdentity,
  MockLoginParams,
  MockAuthSession,
} from "@/feature/auth/types";
import { isValidMarketingPhone } from "@/feature/marketingPortal/utils";
import { useAuthStore } from "@/store/auth";

interface UseMockAuthResult {
  session: MockAuthSession | null;
  activeIdentity: MockAuthIdentity | null;
  sendVerificationCode: (phone: string) => MockAuthActionResult;
  login: (params: MockLoginParams) => MockAuthActionResult;
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
        message: defaultIdentity ? "登录成功。" : "登录成功，请选择进入企业。",
        account: matchedAccount,
        session: nextSession,
        redirectPath: nextRedirectPath,
        identity: defaultIdentity,
      };
    },
    [setSession],
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
        message: selectedIdentity ? "登录成功。" : "登录成功，请选择进入企业。",
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
          message: "未找到对应企业，请重新选择。",
        };
      }

      const selectedIdentity =
        findIdentityForPath(tenantIdentities, redirectPath) ??
        getDefaultIdentity(tenantIdentities) ??
        null;

      if (!selectedIdentity) {
        return {
          success: false,
          message: "当前企业暂无可进入系统。",
        };
      }

      const nextSession = applyIdentityToSession(session, selectedIdentity);
      const nextRedirectPath = resolveIdentityEntryPath(selectedIdentity, redirectPath);

      setSession(nextSession);

      return {
        success: true,
        message: "企业切换成功。",
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
    session,
    activeIdentity,
    sendVerificationCode,
    login,
    quickLoginByAccountId,
    activateTenant,
    activateIdentity,
    logout,
    resolveSessionPath: resolveSessionEntryPath,
  };
};
