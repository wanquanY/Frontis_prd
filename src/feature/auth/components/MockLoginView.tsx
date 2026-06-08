import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Avatar, Button, Checkbox, Input, Modal, Select, message } from "antd";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { PRODUCT_LOGO_URL, PRODUCT_NAME } from "@/constants/brand";
import {
  getIdentityDeploymentMode,
  getMockAccountPassword,
  getTenantCount,
  getTenantEntries,
  isMockAccountPasswordSetupRequired,
} from "@/feature/auth/mockAccounts";
import { LEGAL_AGREEMENT_PATHS } from "@/feature/auth/mockLegalAgreements";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { saveRegistrationOnboardingDraft } from "@/feature/auth/registrationFlowStorage";
import { loadOperationsRegistrationStrategy } from "@/feature/operations/platformConfigStorage";
import { isValidMainlandPhone } from "@/utils/phone";
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

type VerificationStep = "phone" | "code" | "password";
type PasswordReturnStep = "phone" | "code";

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
    resolveSessionPath,
    sendVerificationCode,
    session,
  } = useMockAuth();
  const [verificationStep, setVerificationStep] = useState<VerificationStep>("phone");
  const [passwordReturnStep, setPasswordReturnStep] = useState<PasswordReturnStep>("code");
  const [phoneValue, setPhoneValue] = useState<string>("");
  const [verificationCodeValue, setVerificationCodeValue] = useState<string>("");
  const [passwordValue, setPasswordValue] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);
  const [sentPhone, setSentPhone] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [agreeLegalAgreements, setAgreeLegalAgreements] = useState<boolean>(false);
  const [rememberLogin, setRememberLogin] = useState<boolean>(true);
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
    navigate("/login");
  }, [navigate]);

  const handleSelectTenant = useCallback(
    (tenantId: string): void => {
      const result = activateTenant(tenantId, redirectPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      message.success(result.message);
      navigate(result.redirectPath ?? "/login", { replace: true });
    },
    [activateTenant, navigate, redirectPath],
  );

  const handleCloseTenantSelection = useCallback((): void => {
    logout();
  }, [logout]);

  const handleLogout = useCallback((): void => {
    logout();
  }, [logout]);

  const handleSendVerificationCode = useCallback(
    (shouldEnterCodeStep = false): void => {
      if (countdown > 0 && sentPhone === phoneValue.trim()) {
        if (shouldEnterCodeStep) {
          setVerificationStep("code");
        }
        return;
      }

      if (!isValidMainlandPhone(phoneValue)) {
        message.warning("请输入正确的手机号。");
        return;
      }

      const result = sendVerificationCode(phoneValue, "login");

      if (!result.success) {
        message.warning(result.message);
        return;
      }

      setSentPhone(phoneValue.trim());
      setCountdown(60);
      setVerificationCodeValue(selectedAccount?.verificationCode ?? "");
      if (shouldEnterCodeStep) {
        setVerificationStep("code");
      }
      message.success(result.message);
    },
    [countdown, phoneValue, selectedAccount, sendVerificationCode, sentPhone],
  );

  const handleStartVerification = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (!agreeLegalAgreements) {
        message.warning("请先阅读并同意用户协议和隐私协议。");
        return;
      }

      handleSendVerificationCode(true);
    },
    [agreeLegalAgreements, handleSendVerificationCode],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (!agreeLegalAgreements) {
        message.warning("请先阅读并同意用户协议和隐私协议。");
        return;
      }

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

      if (result.isNewlyRegistered && result.account) {
        const workspaceName =
          result.identity?.tenantName ?? result.account.identities[0]?.tenantName ?? "";

        saveRegistrationOnboardingDraft({
          nickname: result.account.name,
          companyName: "",
          workspaceName,
          phone: result.account.phone,
          giftPoints: registrationStrategy.defaultGiftPoints,
        });
      }

      if (result.session && !result.identity && getTenantCount(result.session.identities) > 1) {
        return;
      }

      navigate(result.redirectPath ?? "/login", { replace: true });
    },
    [
      agreeLegalAgreements,
      login,
      navigate,
      phoneValue,
      redirectPath,
      registrationStrategy.defaultGiftPoints,
      sentPhone,
      verificationCodeValue,
    ],
  );

  const handleSubmitPassword = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();

      if (!agreeLegalAgreements) {
        message.warning("请先阅读并同意用户协议和隐私协议。");
        return;
      }

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

      navigate(result.redirectPath ?? "/login", { replace: true });
    },
    [agreeLegalAgreements, loginByPassword, navigate, passwordValue, phoneValue, redirectPath],
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
      setVerificationStep("phone");
    },
    [mockAccounts],
  );

  const handlePhoneChange = useCallback(
    (nextValue: string): void => {
      setPhoneValue(nextValue);

      if (nextValue !== sentPhone) {
        setVerificationStep("phone");
        setVerificationCodeValue("");
      }

      if (selectedAccount && nextValue !== selectedAccount.phone) {
        setSelectedAccountId(undefined);
        setPasswordValue("");
      }
    },
    [selectedAccount, sentPhone],
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
      return "选择预置账号后，将自动回填手机号、验证码和可用密码。";
    }

    if (selectedAccountTenantCount > 1) {
      return "当前预置账号登录后会弹出租户选择框，请先选择本次要进入的租户。";
    }

    return "当前账号会按已开通的租户与系统权限进入。";
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
    setVerificationStep("phone");
  }, [mockAccounts, selectedAccountId]);

  const maskedSentPhone = useMemo<string>(() => {
    const normalizedPhone = sentPhone || phoneValue.trim();

    if (normalizedPhone.length !== 11) {
      return "+86";
    }

    return `+86${normalizedPhone.slice(0, 3)}******${normalizedPhone.slice(-2)}`;
  }, [phoneValue, sentPhone]);

  const handleSwitchToPassword = useCallback((): void => {
    setPasswordReturnStep("code");
    setVerificationStep("password");
  }, []);

  const handleBackFromPassword = useCallback((): void => {
    if (passwordReturnStep === "code" || sentPhone === phoneValue.trim()) {
      setVerificationStep("code");
      return;
    }

    setVerificationStep("phone");
  }, [passwordReturnStep, phoneValue, sentPhone]);

  if (session && !shouldShowTenantSelectionModal) {
    return <Navigate replace to={resolveSessionPath(session, redirectPath)} />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.brandLink} onClick={handleBack}>
          <img className={styles.brandMark} src={PRODUCT_LOGO_URL} alt={PRODUCT_NAME} />
          <span className={styles.brandTitle}>{PRODUCT_NAME}</span>
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.heroPanel} aria-label="平台介绍">
          <h1 className={styles.heroTitle}>
            <span>行业领先的</span>
            <span>企业级AI专家平台</span>
          </h1>
          <p className={styles.heroSubtitle}>企业跃迁，从这里开始</p>
        </section>

        <section
          className={`${styles.authPanel} ${
            verificationStep === "phone" ? "" : styles.authPanelFlow
          }`}
          aria-label={`登录到 ${PRODUCT_NAME}`}
        >
          {verificationStep === "code" ? (
            <form className={styles.form} onSubmit={handleSubmit}>
              <button
                type="button"
                className={styles.inlineBackButton}
                onClick={() => setVerificationStep("phone")}
              >
                <ArrowLeftOutlined />
                返回
              </button>

              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>输入手机号验证码</h2>
                <p className={styles.formDescription}>
                  请输入发送至 <strong>{maskedSentPhone}</strong> 的 6 位验证码，10 分钟内有效。
                </p>
              </div>

              <Input.OTP
                className={styles.otpInput}
                length={6}
                value={verificationCodeValue}
                onChange={nextValue =>
                  handleVerificationCodeChange(nextValue.replace(/\D/g, "").slice(0, 6))
                }
              />

              <div className={styles.verificationActions}>
                <button
                  type="button"
                  className={styles.textAction}
                  disabled={countdown > 0}
                  onClick={() => handleSendVerificationCode(false)}
                >
                  {countdown > 0 ? `${countdown} 秒后可重新获取验证码` : "重新获取验证码"}
                </button>
                <button
                  type="button"
                  className={styles.linkAction}
                  onClick={handleSwitchToPassword}
                >
                  切换到密码验证
                </button>
                <p className={styles.accountHelp}>
                  手机号已停用？<Link to="/user-manual">找回账号</Link>
                </p>
              </div>

              <Button
                block
                htmlType="submit"
                size="large"
                type="primary"
                className={styles.primaryButton}
                disabled={verificationCodeValue.trim().length !== 6}
              >
                下一步
              </Button>
            </form>
          ) : verificationStep === "password" ? (
            <form className={styles.form} onSubmit={handleSubmitPassword}>
              <button
                type="button"
                className={styles.inlineBackButton}
                onClick={handleBackFromPassword}
              >
                <ArrowLeftOutlined />
                返回
              </button>

              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>
                  使用密码
                  <br />
                  登录
                </h2>
                <p className={styles.passwordDescription}>手机号 {maskedSentPhone}</p>
              </div>

              <Input.Password
                id="mock-login-password"
                autoComplete="current-password"
                placeholder="请输入登录密码"
                size="large"
                value={passwordValue}
                onChange={event => setPasswordValue(event.target.value)}
              />

              <Button
                block
                htmlType="submit"
                size="large"
                type="primary"
                className={styles.primaryButton}
                disabled={!passwordValue.trim()}
              >
                下一步
              </Button>
            </form>
          ) : (
            <>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>
                  登录到
                  <br />
                  {PRODUCT_NAME}
                </h2>
              </div>

              <p className={styles.loginModeLabel}>输入手机号</p>
              <p className={styles.autoRegisterHint}>未注册手机号将自动注册并登录</p>

              <form className={styles.form} onSubmit={handleStartVerification}>
                <div className={styles.phoneField}>
                  <span className={styles.countryCode}>+86</span>
                  <Input
                    id="mock-login-phone"
                    autoComplete="tel"
                    bordered={false}
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

                <Button
                  block
                  htmlType="submit"
                  size="large"
                  type="primary"
                  className={styles.primaryButton}
                  disabled={!isValidMainlandPhone(phoneValue) || !agreeLegalAgreements}
                >
                  下一步
                </Button>
              </form>

              <div className={styles.loginChecks}>
                <Checkbox
                  checked={agreeLegalAgreements}
                  onChange={event => setAgreeLegalAgreements(event.target.checked)}
                >
                  我已阅读并同意
                  <a
                    href={LEGAL_AGREEMENT_PATHS.userAgreement}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.agreementLink}
                    onClick={event => {
                      event.stopPropagation();
                    }}
                  >
                    《用户协议》
                  </a>
                  和
                  <a
                    href={LEGAL_AGREEMENT_PATHS.privacyPolicy}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.agreementLink}
                    onClick={event => {
                      event.stopPropagation();
                    }}
                  >
                    《隐私协议》
                  </a>
                </Checkbox>
                <Checkbox
                  checked={rememberLogin}
                  onChange={event => setRememberLogin(event.target.checked)}
                >
                  记住我的登录状态
                </Checkbox>
              </div>
            </>
          )}

          {verificationStep === "phone" ? (
            <div className={styles.quickLoginPanel}>
              <div className={styles.quickLoginHeader}>
                <span className={styles.quickLoginTitle}>模拟账号</span>
                <span className={styles.quickLoginDescription}>选择后自动回填登录信息</span>
              </div>
              <Select
                size="large"
                placeholder="请选择一个模拟账号"
                value={selectedAccountId}
                options={presetOptions}
                onChange={handlePresetAccountChange}
              />

              <div className={styles.selectedSummary}>
                <p className={styles.summaryTitle}>
                  {selectedAccount
                    ? `${selectedAccount.roleLabel} · ${selectedAccount.name}`
                    : "未选择模拟账号"}
                </p>
                <p className={styles.summaryDescription}>
                  {selectedAccount ? selectedAccount.description : selectedAccountEntryHint}
                </p>
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
          ) : null}
        </section>
      </main>

      <div className={styles.footerDivider} />
      <footer className={styles.footer}>
        <div className={styles.footerCopy}>
          <p>Copyright © www.frontis.cn, All Rights Reserved.京ICP备2022014486号-1</p>
          <p>京公网安备 11010502041971号</p>
        </div>
      </footer>

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

    </div>
  );
};
