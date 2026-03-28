import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Input, message } from "antd";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { MOCK_AUTH_ACCOUNTS } from "@/feature/auth/mockAccounts";
import { useAuthStore } from "@/store/auth";

import styles from "./MockLoginView.module.less";

/**
 * 原型系统模拟手机号验证码登录视图。
 */
export const MockLoginView = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, resolvePostLoginPath, sendVerificationCode, session } = useMockAuth();
  const setSession = useAuthStore(state => state.setSession);
  const [phoneValue, setPhoneValue] = useState<string>("");
  const [verificationCodeValue, setVerificationCodeValue] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);
  const [sentPhone, setSentPhone] = useState<string>("");

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

  const handleBack = useCallback((): void => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/portal");
  }, [navigate]);

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
      navigate(result.redirectPath ?? "/portal", { replace: true });
    },
    [login, navigate, phoneValue, redirectPath, sentPhone, verificationCodeValue],
  );

  const handleQuickLogin = useCallback(
    (role: "employee" | "admin"): void => {
      const account = MOCK_AUTH_ACCOUNTS.find(a => a.role === role);
      if (!account) return;
      setSession({
        userId: account.userId,
        name: account.name,
        phone: account.phone,
        role: account.role,
        loginAt: new Date().toISOString(),
      });
      navigate(role === "admin" ? "/web/admin" : "/web/employee", { replace: true });
    },
    [navigate, setSession],
  );

  const handleQuickFdeLogin = useCallback((): void => {
    navigate("/fde", { replace: true });
  }, [navigate]);

  if (session) {
    return <Navigate replace to={resolvePostLoginPath(session.role, redirectPath)} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageToolbar}>
        <button type="button" className={styles.backButton} onClick={handleBack}>
          <ArrowLeftOutlined />
          返回
        </button>
      </div>

      <div className={styles.shell}>
        <div className={styles.brandBlock}>
          <div className={styles.brandMark}>F</div>
          <div className={styles.brandCopy}>
            <p className={styles.brandTitle}>Frontis AI</p>
            <p className={styles.brandSubtitle}>企业 AI 员工工作台</p>
          </div>
        </div>

        <section className={styles.loginCard}>
          <div className={styles.formHeader}>
            <span className={styles.formEyebrow}>验证码登录</span>
            <h1 className={styles.formTitle}>欢迎登录</h1>
            <p className={styles.formDescription}>
              输入已开通手机号并完成验证码校验后进入 Frontis AI 工作台。
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
                onChange={event =>
                  setPhoneValue(event.target.value.replace(/\D/g, "").slice(0, 11))
                }
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
                  onChange={event =>
                    setVerificationCodeValue(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
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
            <p className={styles.noticeText}>登录即代表你同意平台服务协议与隐私政策。</p>
          </div>

          <div className={styles.quickLoginSection}>
            <p className={styles.quickLoginTitle}>快速体验入口</p>
            <div className={styles.quickLoginButtons}>
              <button
                type="button"
                className={styles.quickLoginButton}
                onClick={() => handleQuickLogin("employee")}
              >
                <span className={styles.quickLoginIcon}>👤</span>
                <span>普通员工登录</span>
              </button>
              <button
                type="button"
                className={styles.quickLoginButton}
                onClick={() => handleQuickLogin("admin")}
              >
                <span className={styles.quickLoginIcon}>👔</span>
                <span>企业老板登录</span>
              </button>
              <button
                type="button"
                className={styles.quickLoginButton}
                onClick={handleQuickFdeLogin}
              >
                <span className={styles.quickLoginIcon}>🛠</span>
                <span>FDE 登录</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
