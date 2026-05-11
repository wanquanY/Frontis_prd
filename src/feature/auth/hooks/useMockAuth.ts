import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMockAuthAccounts,
  applyIdentityToSession,
  registerMockTenantAdminAccount,
  createMockSession,
  findIdentityForPath,
  getDefaultIdentity,
  getActiveSessionIdentity,
  getTenantIdentities,
  getIdentityById,
  getIdentitiesForDeployment,
  getMockAccountByAccountId,
  getMockAccountByPhone,
  getMockAccountPassword,
  isMockAccountPasswordSetupRequired,
  normalizeMockSession,
  resolveIdentityEntryPath,
  resolveSessionEntryPath,
  saveMockAccountPassword,
} from "@/feature/auth/mockAccounts";
import type {
  MockAuthActionResult,
  MockAuthAccount,
  MockAuthIdentity,
  MockLoginParams,
  MockAuthSession,
  MockPasswordLoginParams,
  MockPasswordSetupParams,
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
  loginByPassword: (params: MockPasswordLoginParams) => MockAuthActionResult;
  register: (params: MockTenantRegistrationParams) => MockAuthActionResult;
  setupPasswordAndLogin: (params: MockPasswordSetupParams) => MockAuthActionResult;
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

const DEFAULT_NEW_USER_REDIRECT_PATH = "/web/employee/meta-agent?from=register";
const DEFAULT_MOCK_VERIFICATION_CODE = "123456";

const normalizePhone = (phone: string): string => phone.replace(/\s+/g, "").trim();

const buildNewUserName = (phone: string): string => `用户${normalizePhone(phone).slice(-4)}`;

const buildNewUserWorkspaceName = (name: string): string => `${name}的工作台`;

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
  const activeIdentity = useMemo(() => getActiveSessionIdentity(session), [session]);

  useEffect(() => {
    if (rawSession && session && rawSession !== session) {
      setSession(session);
    }
  }, [rawSession, session, setSession]);

  const refreshMockAccounts = useCallback((): void => {
    setMockAccounts(getMockAuthAccounts());
  }, []);

  useEffect(() => {
    refreshMockAccounts();
  }, [refreshMockAccounts]);

  const sendVerificationCode = useCallback(
    (phone: string, scene: "login" | "register" = "login"): MockAuthActionResult => {
      if (!isValidMarketingPhone(phone)) {
        return {
          success: false,
          message: "请输入正确的手机号。",
        };
      }

      const matchedAccount = getMockAccountByPhone(phone);

      if (scene === "login" && !matchedAccount) {
        return {
          success: true,
          message: "验证码已发送，请注意查收。",
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
    },
    [],
  );

  const completeLogin = useCallback(
    (
      matchedAccount: MockAuthAccount,
      redirectPath?: string,
      deploymentMode?: MockPasswordLoginParams["deploymentMode"],
    ): MockAuthActionResult => {
      const deploymentIdentities = getIdentitiesForDeployment(
        matchedAccount.identities,
        deploymentMode,
      );

      if (!deploymentIdentities.length) {
        return {
          success: false,
          message:
            deploymentMode === "privateCloud"
              ? "当前账号没有私有化部署环境权限。"
              : "当前账号没有公有云环境权限。",
        };
      }

      const routeIdentity = findIdentityForPath(deploymentIdentities, redirectPath);
      const defaultIdentity =
        routeIdentity ??
        getDefaultIdentity(deploymentIdentities, matchedAccount.quickLoginIdentityId) ??
        undefined;
      const nextSession = createMockSession(matchedAccount, defaultIdentity, deploymentMode);
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

  const login = useCallback(
    ({
      phone,
      verificationCode,
      redirectPath,
      deploymentMode,
    }: MockLoginParams): MockAuthActionResult => {
      if (!isValidMarketingPhone(phone)) {
        return {
          success: false,
          message: "请输入正确的手机号。",
        };
      }

      if (!/^\d{6}$/.test(verificationCode.trim())) {
        return {
          success: false,
          message: "请输入 6 位验证码。",
        };
      }

      const matchedAccount = getMockAccountByPhone(phone);

      if (!matchedAccount) {
        if (verificationCode.trim() !== DEFAULT_MOCK_VERIFICATION_CODE) {
          return {
            success: false,
            message: "验证码错误。",
          };
        }

        const newUserName = buildNewUserName(phone);
        const payload = registerMockTenantAdminAccount({
          name: newUserName,
          phone,
          tenantName: buildNewUserWorkspaceName(newUserName),
          verificationCode,
        });

        if (!payload) {
          return {
            success: false,
            message: "当前手机号已注册，请直接登录。",
          };
        }

        refreshMockAccounts();

        return {
          ...completeLogin(
            payload.account,
            redirectPath ?? DEFAULT_NEW_USER_REDIRECT_PATH,
            deploymentMode,
          ),
          message: "注册登录成功。",
          isNewlyRegistered: true,
        };
      }

      if (verificationCode.trim() !== matchedAccount.verificationCode) {
        return {
          success: false,
          message: "账号或验证码错误。",
        };
      }

      return completeLogin(matchedAccount, redirectPath, deploymentMode);
    },
    [completeLogin, refreshMockAccounts],
  );

  const loginByPassword = useCallback(
    ({
      phone,
      password,
      redirectPath,
      deploymentMode,
    }: MockPasswordLoginParams): MockAuthActionResult => {
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
          message: "账号或密码错误。",
        };
      }

      if (isMockAccountPasswordSetupRequired(matchedAccount)) {
        return {
          success: false,
          message: "请先使用验证码登录并设置密码。",
          account: matchedAccount,
          requiresPasswordSetup: true,
        };
      }

      if (password !== getMockAccountPassword(matchedAccount)) {
        return {
          success: false,
          message: "账号或密码错误。",
        };
      }

      return completeLogin(matchedAccount, redirectPath, deploymentMode);
    },
    [completeLogin],
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

      refreshMockAccounts();

      return {
        success: true,
        message: "注册成功，请设置登录密码。",
        account: payload.account,
        requiresPasswordSetup: true,
        redirectPath: "/web/employee/meta-agent",
      };
    },
    [refreshMockAccounts],
  );

  const setupPasswordAndLogin = useCallback(
    ({
      accountId,
      password,
      confirmPassword,
      redirectPath,
      deploymentMode,
    }: MockPasswordSetupParams): MockAuthActionResult => {
      if (password.length < 8) {
        return {
          success: false,
          message: "密码至少需要 8 位。",
        };
      }

      if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return {
          success: false,
          message: "密码需要同时包含字母和数字。",
        };
      }

      if (password !== confirmPassword) {
        return {
          success: false,
          message: "两次输入的密码不一致。",
        };
      }

      const matchedAccount = saveMockAccountPassword(accountId, password);

      if (!matchedAccount) {
        return {
          success: false,
          message: "未找到需要设置密码的账号。",
        };
      }

      refreshMockAccounts();

      return completeLogin(matchedAccount, redirectPath, deploymentMode);
    },
    [completeLogin, refreshMockAccounts],
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
        findIdentityForPath(matchedAccount.identities, redirectPath) ??
        getDefaultIdentity(matchedAccount.identities, matchedAccount.quickLoginIdentityId) ??
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
    loginByPassword,
    register,
    setupPasswordAndLogin,
    quickLoginByAccountId,
    activateTenant,
    activateIdentity,
    logout,
    resolveSessionPath: resolveSessionEntryPath,
  };
};
