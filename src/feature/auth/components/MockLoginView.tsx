import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Avatar, Button, Input, Modal, Segmented, Select, message } from "antd";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { PRODUCT_LOGO_URL, PRODUCT_NAME, PRODUCT_SLOGAN } from "@/constants/brand";
import {
  getIdentityDeploymentMode,
  getMockAccountPassword,
  getTenantCount,
  getTenantEntries,
  isMockAccountPasswordSetupRequired,
} from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { loadOperationsRegistrationStrategy } from "@/feature/operations/platformConfigStorage";
import type { MockAuthAccount, MockAuthTenantEntry } from "@/feature/auth/types";

import styles from "./MockLoginView.module.less";

const getTenantLogoText = (tenantName: string): string => {
  const normalizedTenantName = tenantName.replace(/租户|服务组织/g, "").trim();

  return Array.from(normalizedTenantName)[0] ?? "租";
};

const DEPLOYMENT_MODE_LABELS = {
  publicCloud: "公有云",
  privateCloud: "私有云",
} as const;

type LoginMode = "verificationCode" | "password";

interface PendingPasswordSetup {
  accountId: string;
  accountName: string;
  phone: string;
  redirectPath?: string;
}

const getPresetAccountLabel = (account: MockAuthAccount): string => {
  const deploymentLabels = Array.from(
    new Set(
      account.identities.map(
        identity => DEPLOYMENT_MODE_LABELS[getIdentityDeploymentMode(identity)],
      ),
    ),
  );
  const tenantEntries = getTenantEntries(account.identities);
  const tenantLabel = tenantEntries.length === 1 ? ` · ${tenantEntries[0].tenantName}` : "";
  const deploymentLabel = deploymentLabels.length ? ` · ${deploymentLabels.join("/")}` : "";

  return `${account.roleLabel} · ${account.name}${tenantLabel}${deploymentLabel}`;
};

/**
 * 原型系统模拟手机号验证码登录视图。
 */
export const MockLoginView = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    activateTenant,
    activeIdentity,
    login,
    loginByPassword,
    mockAccounts,
    logout,
    register,
    resolveSessionPath,
    sendVerificationCode,
    session,
    setupPasswordAndLogin,
  } = useMockAuth();
  const [loginMode, setLoginMode] = useState<LoginMode>("verificationCode");
  const [phoneValue, setPhoneValue] = useState<string>("");
  const [verificationCodeValue, setVerificationCodeValue] = useState<string>("");
  const [passwordValue, setPasswordValue] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);
  const [sentPhone, setSentPhone] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [registerName, setRegisterName] = useState<string>("");
  const [registerTenantName, setRegisterTenantName] = useState<string>("");
  const [registerPhone, setRegisterPhone] = useState<string>("");
  const [registerCode, setRegisterCode] = useState<string>("");
  const [registerCountdown, setRegisterCountdown] = useState<number>(0);
  const [sentRegisterPhone, setSentRegisterPhone] = useState<string>("");
  const [registerRedirectPath, setRegisterRedirectPath] = useState<string | null>(null);
  const [pendingPasswordSetup, setPendingPasswordSetup] =
    useState<PendingPasswordSetup | null>(null);
  const [setupPassword, setSetupPassword] = useState<string>("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState<string>("");
  const registrationStrategy = useMemo(() => loadOperationsRegistrationStrategy(), []);

  const redirectPath = useMemo(() => {
    const targetPath = searchParams.get("redirect")?.trim();

    if (!targetPath?.startsWith("/")) {
      return undefined;
    }

    return targetPath;
  }, [searchParams]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCountdown(current => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (registerCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRegisterCountdown(current => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [registerCountdown]);

  const selectedAccount = useMemo<MockAuthAccount | null>(
    () => mockAccounts.find(item => item.accountId === selectedAccountId) ?? null,
    [mockAccounts, selectedAccountId],
  );
  const tenantEntries = useMemo<MockAuthTenantEntry[]>(() => {
    if (!session || activeIdentity) {
      return [];
    }

    return getTenantEntries(session.identities);
  }, [activeIdentity, session]);
  const shouldShowTenantSelectionModal = Boolean(
    session && !activeIdentity && getTenantCount(session.identities) > 1,
  );

  const handleBack = useCallback((): void => {
    navigate("/portal");
  }, [navigate]);

  const handleSelectTenant = useCallback(
    (tenantId: string): void => {
      const result = activateTenant(tenantId, redirectPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      message.success(result.message);
      navigate(result.redirectPath ?? "/portal", { replace: true });
    },
    [activateTenant, navigate, redirectPath],
  );

  const handleCloseTenantSelection = useCallback((): void => {
    logout();
  }, [logout]);

  const handleLogout = useCallback((): void => {
    logout();
  }, [logout]);

  const handleSendVerificationCode = useCallback((): void => {
    if (countdown > 0) {
      return;
    }

    const result = sendVerificationCode(phoneValue, "login");

    if (!result.success) {
      message.warning(result.message);
      return;
    }

    setSentPhone(phoneValue.trim());
    setCountdown(60);
    message.success(result.message);
  }, [countdown, phoneValue, sendVerificationCode]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (sentPhone !== phoneValue.trim()) {
        message.warning("请先获取验证码。");
        return;
      }

      const result = login({
        phone: phoneValue,
        verificationCode: verificationCodeValue,
        redirectPath,
      });

      if (!result.success) {
        message.error(result.message);
        return;
      }

      message.success(result.message);

      if (result.requiresPasswordSetup && result.account) {
        setPendingPasswordSetup({
          accountId: result.account.accountId,
          accountName: result.account.name,
          phone: result.account.phone,
          redirectPath: result.redirectPath ?? redirectPath ?? "/web/employee/meta-agent",
        });
        setSetupPassword("");
        setSetupConfirmPassword("");
        return;
      }

      if (result.session && !result.identity && getTenantCount(result.session.identities) > 1) {
        return;
      }

      navigate(result.redirectPath ?? "/portal", { replace: true });
    },
    [login, navigate, phoneValue, redirectPath, sentPhone, verificationCodeValue],
  );

  const handleSubmitPassword = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      const result = loginByPassword({
        phone: phoneValue,
        password: passwordValue,
        redirectPath,
      });

      if (!result.success) {
        message.error(result.message);
        return;
      }

      message.success(result.message);

      if (result.session && !result.identity && getTenantCount(result.session.identities) > 1) {
        return;
      }

      navigate(result.redirectPath ?? "/portal", { replace: true });
    },
    [loginByPassword, navigate, passwordValue, phoneValue, redirectPath],
  );

  const handlePresetAccountChange = useCallback(
    (accountId: string): void => {
      const matchedAccount = mockAccounts.find(item => item.accountId === accountId);

      if (!matchedAccount) {
        return;
      }

      setSelectedAccountId(accountId);
      setPhoneValue(matchedAccount.phone);
      setVerificationCodeValue(matchedAccount.verificationCode);
      setPasswordValue(getMockAccountPassword(matchedAccount) ?? "");
      setSentPhone(matchedAccount.phone);
      setCountdown(0);
    },
    [mockAccounts],
  );

  const handlePhoneChange = useCallback(
    (nextValue: string): void => {
      setPhoneValue(nextValue);

      if (selectedAccount && nextValue !== selectedAccount.phone) {
        setSelectedAccountId(undefined);
        setPasswordValue("");
      }
    },
    [selectedAccount],
  );

  const handleVerificationCodeChange = useCallback(
    (nextValue: string): void => {
      setVerificationCodeValue(nextValue);

      if (selectedAccount && nextValue !== selectedAccount.verificationCode) {
        setSelectedAccountId(undefined);
      }
    },
    [selectedAccount],
  );

  const selectedAccountTenantCount = useMemo<number>(() => {
    if (!selectedAccount) {
      return 0;
    }

    return getTenantCount(selectedAccount.identities);
  }, [selectedAccount]);

  const selectedAccountIdentityCount = useMemo<number>(() => {
    if (!selectedAccount) {
      return 0;
    }

    return selectedAccount.identities.length;
  }, [selectedAccount]);

  const selectedAccountEntryHint = useMemo<string>(() => {
    if (!selectedAccount) {
      return "选择预置账号后，将自动回填手机号和验证码。";
    }

    if (selectedAccountTenantCount > 1) {
      return "当前预置账号登录后会弹出租户选择框，请先选择本次要进入的租户。";
    }

    return "当前账号会按已开通的租户与系统权限进入，多个租户时登录后选择本次进入的租户。";
  }, [selectedAccount, selectedAccountTenantCount]);

  const selectedAccountCredentialHint = useMemo<string>(() => {
    if (!selectedAccount) {
      return "验证码登录用于首次验证手机号；设置密码后可切换为密码登录。";
    }

    if (isMockAccountPasswordSetupRequired(selectedAccount)) {
      return "该账号尚未设置密码，需先用验证码登录并完成密码绑定。";
    }

    return `默认密码 ${getMockAccountPassword(selectedAccount) ?? "已设置"}`;
  }, [selectedAccount]);

  const presetOptions = useMemo(
    () =>
      mockAccounts.map(account => ({
        label: getPresetAccountLabel(account),
        value: account.accountId,
      })),
    [mockAccounts],
  );

  useEffect(() => {
    if (!selectedAccountId) {
      return;
    }

    if (mockAccounts.some(account => account.accountId === selectedAccountId)) {
      return;
    }

    setSelectedAccountId(undefined);
    setPhoneValue("");
    setVerificationCodeValue("");
    setSentPhone("");
  }, [mockAccounts, selectedAccountId]);

  const handleOpenRegisterModal = useCallback((): void => {
    if (!registrationStrategy.enabled) {
      message.warning("暂无权限。");
      return;
    }

    setIsRegisterModalOpen(true);
  }, [registrationStrategy.enabled]);

  const handleCloseRegisterModal = useCallback((): void => {
    setIsRegisterModalOpen(false);
    setRegisterName("");
    setRegisterTenantName("");
    setRegisterPhone("");
    setRegisterCode("");
    setRegisterCountdown(0);
    setSentRegisterPhone("");
  }, []);

  const handleClosePasswordSetup = useCallback((): void => {
    setPendingPasswordSetup(null);
    setSetupPassword("");
    setSetupConfirmPassword("");
  }, []);

  const handleSendRegisterCode = useCallback((): void => {
    if (registerCountdown > 0) {
      return;
    }

    const result = sendVerificationCode(registerPhone, "register");

    if (!result.success) {
      message.warning(result.message);
      return;
    }

    setSentRegisterPhone(registerPhone.trim());
    setRegisterCountdown(60);
    message.success("注册验证码已发送，请注意查收。");
  }, [registerCountdown, registerPhone, sendVerificationCode]);

  const handleSubmitRegister = useCallback((): void => {
    if (sentRegisterPhone !== registerPhone.trim()) {
      message.warning("请先获取验证码。");
      return;
    }

    const result = register({
      name: registerName,
      phone: registerPhone,
      tenantName: registerTenantName,
      verificationCode: registerCode,
    });

    if (!result.success) {
      message.error(result.message);
      return;
    }

    message.success(result.message);
    if (result.requiresPasswordSetup && result.account) {
      setPendingPasswordSetup({
        accountId: result.account.accountId,
        accountName: result.account.name,
        phone: result.account.phone,
        redirectPath: result.redirectPath ?? "/web/employee/meta-agent",
      });
      setSetupPassword("");
      setSetupConfirmPassword("");
      handleCloseRegisterModal();
      return;
    }

    setRegisterRedirectPath(result.redirectPath ?? "/web/employee/meta-agent");
    handleCloseRegisterModal();
  }, [
    handleCloseRegisterModal,
    register,
    registerCode,
    registerName,
    registerPhone,
    registerTenantName,
    sentRegisterPhone,
  ]);

  const handleSubmitPasswordSetup = useCallback((): void => {
    if (!pendingPasswordSetup) {
      return;
    }

    const result = setupPasswordAndLogin({
      accountId: pendingPasswordSetup.accountId,
      password: setupPassword,
      confirmPassword: setupConfirmPassword,
      redirectPath: pendingPasswordSetup.redirectPath,
    });

    if (!result.success) {
      message.error(result.message);
      return;
    }

    message.success("密码设置成功。");
    handleClosePasswordSetup();

    if (result.session && !result.identity && getTenantCount(result.session.identities) > 1) {
      return;
    }

    navigate(result.redirectPath ?? "/web/employee/meta-agent", { replace: true });
  }, [
    handleClosePasswordSetup,
    navigate,
    pendingPasswordSetup,
    setupConfirmPassword,
    setupPassword,
    setupPasswordAndLogin,
  ]);

  if (session && !shouldShowTenantSelectionModal) {
    return (
      <Navigate replace to={registerRedirectPath ?? resolveSessionPath(session, redirectPath)} />
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageToolbar}>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          <ArrowLeftOutlined />
          返回营销门户
        </button>
      </div>

      <div className={styles.shell}>
        <div className={styles.brandBlock}>
          <img className={styles.brandMark} src={PRODUCT_LOGO_URL} alt={PRODUCT_NAME} />
          <div className={styles.brandCopy}>
            <p className={styles.brandTitle}>{PRODUCT_NAME}</p>
            <p className={styles.brandSubtitle}>{PRODUCT_SLOGAN}</p>
          </div>
        </div>

        <section className={styles.loginCard}>
          <div className={styles.loginCardBody}>
            <div className={styles.primaryPanel}>
              <div className={styles.formHeader}>
                <span className={styles.formEyebrow}>
                  {loginMode === "verificationCode" ? "验证码登录" : "密码登录"}
                </span>
                <h1 className={styles.formTitle}>欢迎登录</h1>
                <p className={styles.formDescription}>
                  支持手机号验证码登录和密码登录；首次注册或新用户首次进入时，需要先完成登录密码设置。
                </p>
              </div>

              <Segmented<LoginMode>
                block
                className={styles.loginModeTabs}
                value={loginMode}
                options={[
                  { label: "验证码登录", value: "verificationCode" },
                  { label: "密码登录", value: "password" },
                ]}
                onChange={setLoginMode}
              />

              <form
                className={styles.form}
                onSubmit={loginMode === "verificationCode" ? handleSubmit : handleSubmitPassword}
              >
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="mock-login-phone">
                    手机号
                  </label>
                  <Input
                    id="mock-login-phone"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="请输入手机号"
                    size="large"
                    value={phoneValue}
                    onChange={event =>
                      handlePhoneChange(event.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                  />
                </div>

                {loginMode === "verificationCode" ? (
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor="mock-login-code">
                      验证码
                    </label>
                    <div className={styles.codeRow}>
                      <Input
                        id="mock-login-code"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="请输入 6 位验证码"
                        size="large"
                        value={verificationCodeValue}
                        onChange={event =>
                          handleVerificationCodeChange(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                      />
                      <Button
                        size="large"
                        onClick={handleSendVerificationCode}
                        disabled={countdown > 0}
                      >
                        {countdown > 0 ? `${countdown}s后重试` : "获取验证码"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor="mock-login-password">
                      密码
                    </label>
                    <Input.Password
                      id="mock-login-password"
                      autoComplete="current-password"
                      placeholder="请输入登录密码"
                      size="large"
                      value={passwordValue}
                      onChange={event => setPasswordValue(event.target.value)}
                    />
                  </div>
                )}

                <Button
                  block
                  htmlType="submit"
                  size="large"
                  type="primary"
                  disabled={
                    !phoneValue.trim() ||
                    (loginMode === "verificationCode"
                      ? verificationCodeValue.trim().length !== 6
                      : !passwordValue.trim())
                  }
                >
                  登录
                </Button>
              </form>

              <div className={styles.noticePanel}>
                <p className={styles.noticeTitle}>登录说明</p>
                <p className={styles.noticeText}>
                  登录即代表你同意平台服务协议与隐私政策。
                  {registrationStrategy.enabled
                    ? "还没有租户时，可直接自注册并创建 1 席个人版租户。"
                    : "当前暂无自注册权限。"}
                </p>
                {registrationStrategy.enabled ? (
                  <div className={styles.noticeActions}>
                    <Button type="link" onClick={handleOpenRegisterModal}>
                      自注册创建租户
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className={styles.quickLoginPanel}>
              <div className={styles.quickLoginSection}>
                <p className={styles.quickLoginTitle}>模拟账号填充</p>
                <p className={styles.quickLoginDescription}>
                  预置账号会按已配置的租户和系统权限进入；私有云租户账号不会展示运营管理平台入口。
                </p>
                <div className={styles.selectorBlock}>
                  <span className={styles.selectorLabel}>选择预置账号</span>
                  <Select
                    size="large"
                    placeholder="请选择一个模拟账号"
                    value={selectedAccountId}
                    options={presetOptions}
                    onChange={handlePresetAccountChange}
                  />
                </div>

                <div className={styles.selectedSummary}>
                  <p className={styles.summaryTitle}>
                    {selectedAccount
                      ? `${selectedAccount.roleLabel} · ${selectedAccount.name}`
                      : "未选择模拟账号"}
                  </p>
                  <p className={styles.summaryDescription}>
                    {selectedAccount ? selectedAccount.description : selectedAccountEntryHint}
                  </p>
                  <p className={styles.summaryHint}>{selectedAccountEntryHint}</p>
                  <p className={styles.summaryHint}>{selectedAccountCredentialHint}</p>

                  {selectedAccount ? (
                    <div className={styles.quickLoginFooter}>
                      <span className={styles.quickLoginChip}>{selectedAccount.phone}</span>
                      <span className={styles.quickLoginChip}>
                        验证码 {selectedAccount.verificationCode}
                      </span>
                      <span className={styles.quickLoginChip}>
                        {isMockAccountPasswordSetupRequired(selectedAccount)
                          ? "待设置密码"
                          : "可密码登录"}
                      </span>
                      <span className={styles.quickLoginChip}>
                        {selectedAccountTenantCount} 个租户
                      </span>
                      <span className={styles.quickLoginChip}>
                        {selectedAccountIdentityCount} 个身份
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>

      <Modal
        open={shouldShowTenantSelectionModal}
        title="选择进入租户"
        onCancel={handleCloseTenantSelection}
        footer={[
          <Button key="logout" onClick={handleLogout}>
            退出登录
          </Button>,
        ]}
        width={460}
        centered
      >
        <div className={styles.tenantSelection}>
          <p className={styles.tenantSelectionHint}>
            {session?.name} 已登录，请选择本次进入的租户。
          </p>

          <div className={styles.tenantList}>
            {tenantEntries.map(tenant => (
              <button
                key={tenant.tenantId}
                type="button"
                className={styles.tenantButton}
                onClick={() => handleSelectTenant(tenant.tenantId)}
              >
                <Avatar className={styles.tenantLogo}>
                  {getTenantLogoText(tenant.tenantName)}
                </Avatar>
                <span className={styles.tenantName}>{tenant.tenantName}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(pendingPasswordSetup)}
        title="设置登录密码"
        okText="完成并进入"
        cancelText="取消"
        onCancel={handleClosePasswordSetup}
        onOk={handleSubmitPasswordSetup}
        okButtonProps={{
          disabled:
            setupPassword.length < 8 ||
            !setupConfirmPassword ||
            setupPassword !== setupConfirmPassword,
        }}
        width={460}
        centered
      >
        <div className={styles.registerPanel}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mock-setup-password">
              登录密码
            </label>
            <Input.Password
              id="mock-setup-password"
              autoComplete="new-password"
              placeholder="至少 8 位，需包含字母和数字"
              size="large"
              value={setupPassword}
              onChange={event => setSetupPassword(event.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mock-setup-confirm-password">
              确认密码
            </label>
            <Input.Password
              id="mock-setup-confirm-password"
              autoComplete="new-password"
              placeholder="请再次输入登录密码"
              size="large"
              value={setupConfirmPassword}
              onChange={event => setSetupConfirmPassword(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={isRegisterModalOpen}
        title="自注册创建租户"
        okText="完成注册"
        cancelText="取消"
        onCancel={handleCloseRegisterModal}
        onOk={handleSubmitRegister}
        okButtonProps={{
          disabled:
            !registerName.trim() ||
            !registerTenantName.trim() ||
            !registerPhone.trim() ||
            registerCode.trim().length !== 6,
        }}
      >
        <div className={styles.registerPanel}>
          <p className={styles.registerDescription}>
            完成注册后，系统会自动为你创建 1 席个人版租户，可在管理后台后续开通团队版。
          </p>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mock-register-name">
              你的姓名
            </label>
            <Input
              id="mock-register-name"
              placeholder="请输入姓名"
              size="large"
              value={registerName}
              onChange={event => setRegisterName(event.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mock-register-tenant">
              租户名称
            </label>
            <Input
              id="mock-register-tenant"
              placeholder="例如：李想的工作室"
              size="large"
              value={registerTenantName}
              onChange={event => setRegisterTenantName(event.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mock-register-phone">
              手机号
            </label>
            <Input
              id="mock-register-phone"
              autoComplete="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="请输入手机号"
              size="large"
              value={registerPhone}
              onChange={event =>
                setRegisterPhone(event.target.value.replace(/\D/g, "").slice(0, 11))
              }
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mock-register-code">
              验证码
            </label>
            <div className={styles.codeRow}>
              <Input
                id="mock-register-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="请输入 6 位验证码"
                size="large"
                value={registerCode}
                onChange={event =>
                  setRegisterCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
              <Button
                size="large"
                onClick={handleSendRegisterCode}
                disabled={registerCountdown > 0}
              >
                {registerCountdown > 0 ? `${registerCountdown}s后重试` : "获取验证码"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
