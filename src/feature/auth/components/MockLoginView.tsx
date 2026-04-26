import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Avatar, Button, Input, Modal, Select, message } from "antd";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { PRODUCT_LOGO_TEXT, PRODUCT_NAME, PRODUCT_SLOGAN } from "@/constants/brand";
import { getTenantCount, getTenantEntries } from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import type { MockAuthAccount, MockAuthTenantEntry } from "@/feature/auth/types";

import styles from "./MockLoginView.module.less";

const getTenantLogoText = (tenantName: string): string => {
  const normalizedTenantName = tenantName.replace(/租户|服务组织/g, "").trim();

  return Array.from(normalizedTenantName)[0] ?? "租";
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
    mockAccounts,
    logout,
    register,
    resolveSessionPath,
    sendVerificationCode,
    session,
  } = useMockAuth();
  const [phoneValue, setPhoneValue] = useState<string>("");
  const [verificationCodeValue, setVerificationCodeValue] = useState<string>("");
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

      if (result.session && !result.identity && getTenantCount(result.session.identities) > 1) {
        return;
      }

      navigate(result.redirectPath ?? "/portal", { replace: true });
    },
    [login, navigate, phoneValue, redirectPath, sentPhone, verificationCodeValue],
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

    return new Set(selectedAccount.identities.map(identity => identity.tenantId)).size;
  }, [selectedAccount]);

  const selectedAccountEntryHint = useMemo<string>(() => {
    if (!selectedAccount) {
      return "选择预置账号后，将自动回填手机号和验证码。";
    }

    if (selectedAccountTenantCount > 1) {
      return "当前预置账号登录后会弹出租户选择框，请先选择本次要进入的租户。";
    }

    return "当前预置账号会在点击左侧登录后直接进入默认系统，其他有权限的系统入口会在产品内展示。";
  }, [selectedAccount, selectedAccountTenantCount]);

  const presetOptions = useMemo(
    () =>
      mockAccounts.map(account => ({
        label: `${account.roleLabel} · ${account.name}`,
        value: account.accountId,
      })),
    [mockAccounts],
  );

  const handleOpenRegisterModal = useCallback((): void => {
    setIsRegisterModalOpen(true);
  }, []);

  const handleCloseRegisterModal = useCallback((): void => {
    setIsRegisterModalOpen(false);
    setRegisterName("");
    setRegisterTenantName("");
    setRegisterPhone("");
    setRegisterCode("");
    setRegisterCountdown(0);
    setSentRegisterPhone("");
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
    setRegisterRedirectPath(result.redirectPath ?? "/web/admin/workspace/agent-store");
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

  if (session && !shouldShowTenantSelectionModal) {
    return <Navigate replace to={registerRedirectPath ?? resolveSessionPath(session, redirectPath)} />;
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
          <div className={styles.brandMark}>{PRODUCT_LOGO_TEXT}</div>
          <div className={styles.brandCopy}>
            <p className={styles.brandTitle}>{PRODUCT_NAME}</p>
            <p className={styles.brandSubtitle}>{PRODUCT_SLOGAN}</p>
          </div>
        </div>

        <section className={styles.loginCard}>
          <div className={styles.loginCardBody}>
            <div className={styles.primaryPanel}>
              <div className={styles.formHeader}>
                <span className={styles.formEyebrow}>验证码登录</span>
                <h1 className={styles.formTitle}>欢迎登录</h1>
                <p className={styles.formDescription}>
                  {`输入手机号并完成验证码校验后进入${PRODUCT_NAME}；多租户账号会在登录后弹出租户选择框。`}
                </p>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
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
                    onChange={event => handlePhoneChange(event.target.value.replace(/\D/g, "").slice(0, 11))}
                  />
                </div>

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
                      onChange={event => handleVerificationCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <Button size="large" onClick={handleSendVerificationCode} disabled={countdown > 0}>
                      {countdown > 0 ? `${countdown}s后重试` : "获取验证码"}
                    </Button>
                  </div>
                </div>

                <Button
                  block
                  htmlType="submit"
                  size="large"
                  type="primary"
                  disabled={!phoneValue.trim() || verificationCodeValue.trim().length !== 6}
                >
                  登录
                </Button>
              </form>

              <div className={styles.noticePanel}>
                <p className={styles.noticeTitle}>登录说明</p>
                <p className={styles.noticeText}>
                  登录即代表你同意平台服务协议与隐私政策。还没有租户时，可直接自注册并创建 1 席个人版租户。
                </p>
                <div className={styles.noticeActions}>
                  <Button type="link" onClick={handleOpenRegisterModal}>
                    自注册创建租户
                  </Button>
                </div>
              </div>
            </div>

            <aside className={styles.quickLoginPanel}>
              <div className={styles.quickLoginSection}>
                <p className={styles.quickLoginTitle}>模拟账号填充</p>
                <p className={styles.quickLoginDescription}>
                  选择预置账号后，系统会自动填充手机号和验证码；多租户账号登录后会弹出租户选择框。
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
                    {selectedAccount ? `${selectedAccount.roleLabel} · ${selectedAccount.name}` : "未选择模拟账号"}
                  </p>
                  <p className={styles.summaryDescription}>
                    {selectedAccount ? selectedAccount.description : selectedAccountEntryHint}
                  </p>
                  <p className={styles.summaryHint}>{selectedAccountEntryHint}</p>

                  {selectedAccount ? (
                    <div className={styles.quickLoginFooter}>
                      <span className={styles.quickLoginChip}>{selectedAccount.phone}</span>
                      <span className={styles.quickLoginChip}>
                        验证码 {selectedAccount.verificationCode}
                      </span>
                      <span className={styles.quickLoginChip}>
                        {selectedAccountTenantCount} 个租户
                      </span>
                      <span className={styles.quickLoginChip}>
                        {selectedAccount.identities.length} 个身份
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
              onChange={event => setRegisterPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
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
                onChange={event => setRegisterCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <Button size="large" onClick={handleSendRegisterCode} disabled={registerCountdown > 0}>
                {registerCountdown > 0 ? `${registerCountdown}s后重试` : "获取验证码"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
