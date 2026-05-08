import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Button, Input, Select, message } from "antd";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import {
  MANAGEMENT_CONSOLE_LABEL,
  PRODUCT_LOGO_TEXT,
  PRODUCT_NAME,
  PRODUCT_SLOGAN,
} from "@/constants/brand";
import { OPERATIONS_ACCOUNT_OPTIONS } from "@/feature/operations/mockData";
import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import type { OperationsAccount } from "@/feature/operations/types";

import styles from "./OperationsLoginView.module.less";

/**
 * 运营后台独立模拟登录视图。
 */
export const OperationsLoginView = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, resolveSessionPath, sendVerificationCode, session } = useOperationsAuth();
  const [phoneValue, setPhoneValue] = useState<string>("");
  const [verificationCodeValue, setVerificationCodeValue] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);
  const [sentPhone, setSentPhone] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>();

  const redirectPath = useMemo(() => {
    const targetPath = searchParams.get("redirect")?.trim();

    if (!targetPath?.startsWith("/ops")) {
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

  const selectedAccount = useMemo<OperationsAccount | null>(
    () => OPERATIONS_ACCOUNT_OPTIONS.find(item => item.accountId === selectedAccountId) ?? null,
    [selectedAccountId],
  );

  const handleSendVerificationCode = useCallback((): void => {
    if (countdown > 0) {
      return;
    }

    const result = sendVerificationCode(phoneValue);

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
      navigate(result.redirectPath ?? "/ops/tenants", { replace: true });
    },
    [login, navigate, phoneValue, redirectPath, sentPhone, verificationCodeValue],
  );

  const handlePresetAccountChange = useCallback((accountId: string): void => {
    const matchedAccount = OPERATIONS_ACCOUNT_OPTIONS.find(item => item.accountId === accountId);

    if (!matchedAccount) {
      return;
    }

    setSelectedAccountId(accountId);
    setPhoneValue(matchedAccount.phone);
    setVerificationCodeValue(matchedAccount.verificationCode);
    setSentPhone(matchedAccount.phone);
    setCountdown(0);
  }, []);

  const presetOptions = useMemo(
    () =>
      OPERATIONS_ACCOUNT_OPTIONS.map(account => ({
        label: `${account.roleLabel} · ${account.name}`,
        value: account.accountId,
      })),
    [],
  );

  if (session) {
    return <Navigate replace to={resolveSessionPath(session, redirectPath)} />;
  }

  return (
    <div className={styles.page}>
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
                <span className={styles.formEyebrow}>独立入口</span>
                <h1 className={styles.formTitle}>{`${MANAGEMENT_CONSOLE_LABEL}登录`}</h1>
                <p className={styles.formDescription}>
                  {`通过${MANAGEMENT_CONSOLE_LABEL}独立路由进入平台级控制台，仅处理租户创建与初始管理员维护。`}
                </p>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="operations-login-phone">
                    手机号
                  </label>
                  <Input
                    id="operations-login-phone"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="请输入运营后台手机号"
                    size="large"
                    value={phoneValue}
                    onChange={event =>
                      setPhoneValue(event.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="operations-login-code">
                    验证码
                  </label>
                  <div className={styles.codeRow}>
                    <Input
                      id="operations-login-code"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="请输入 6 位验证码"
                      size="large"
                      value={verificationCodeValue}
                      onChange={event =>
                        setVerificationCodeValue(event.target.value.replace(/\D/g, "").slice(0, 6))
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

                <Button
                  block
                  htmlType="submit"
                  size="large"
                  type="primary"
                  disabled={!phoneValue.trim() || verificationCodeValue.trim().length !== 6}
                >
                  进入运营后台
                </Button>
              </form>

              <div className={styles.noticePanel}>
                <p className={styles.noticeTitle}>当前阶段范围</p>
                <p className={styles.noticeText}>
                  当前原型仅保留租户管理能力，用于创建租户和录入初始管理员。
                </p>
              </div>
            </div>

            <aside className={styles.quickLoginPanel}>
              <div className={styles.quickLoginSection}>
                <p className={styles.quickLoginTitle}>模拟账号填充</p>
                <p className={styles.quickLoginDescription}>
                  选择预置运营账号后，系统会自动填充手机号和验证码，直接进入租户管理。
                </p>
                <div className={styles.selectorBlock}>
                  <span className={styles.selectorLabel}>选择运营账号</span>
                  <Select
                    size="large"
                    placeholder="请选择一个运营账号"
                    value={selectedAccountId}
                    options={presetOptions}
                    onChange={handlePresetAccountChange}
                  />
                </div>

                <div className={styles.selectedSummary}>
                  <p className={styles.summaryTitle}>
                    {selectedAccount
                      ? `${selectedAccount.roleLabel} · ${selectedAccount.name}`
                      : "未选择运营账号"}
                  </p>
                  <p className={styles.summaryDescription}>
                    {selectedAccount
                      ? selectedAccount.description
                      : "平台运营账号与企业账号独立，使用独立路由和独立登录页进入。"}
                  </p>

                  {selectedAccount ? (
                    <div className={styles.quickLoginFooter}>
                      <span className={styles.quickLoginChip}>{selectedAccount.phone}</span>
                      <span className={styles.quickLoginChip}>
                        验证码 {selectedAccount.verificationCode}
                      </span>
                      <span className={styles.quickLoginChip}>{selectedAccount.entryPath}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
};
