import { useCallback, useMemo } from "react";

import { ArrowLeftOutlined, CheckCircleOutlined, LoginOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import type { MockAuthIdentity } from "@/feature/auth/types";

import styles from "./IdentitySelectionView.module.less";

interface TenantGroup {
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  identities: MockAuthIdentity[];
  platformLabels: string[];
  roleLabels: string[];
}

/**
 * 多租户账号的企业选择视图。
 */
export const IdentitySelectionView = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activateTenant, activeIdentity, resolveSessionPath, session } = useMockAuth();

  const redirectPath = useMemo(() => {
    const targetPath = searchParams.get("redirect")?.trim();

    if (!targetPath?.startsWith("/")) {
      return undefined;
    }

    return targetPath;
  }, [searchParams]);

  const tenantGroups = useMemo<TenantGroup[]>(() => {
    if (!session) {
      return [];
    }

    const groups = new Map<string, TenantGroup>();

    session.identities.forEach(identity => {
      const currentGroup = groups.get(identity.tenantId);

      if (currentGroup) {
        currentGroup.identities.push(identity);

        if (!currentGroup.platformLabels.includes(identity.platformLabel)) {
          currentGroup.platformLabels.push(identity.platformLabel);
        }

        if (!currentGroup.roleLabels.includes(identity.roleLabel)) {
          currentGroup.roleLabels.push(identity.roleLabel);
        }

        return;
      }

      groups.set(identity.tenantId, {
        tenantId: identity.tenantId,
        tenantName: identity.tenantName,
        tenantCode: identity.tenantCode,
        identities: [identity],
        platformLabels: [identity.platformLabel],
        roleLabels: [identity.roleLabel],
      });
    });

    return Array.from(groups.values()).sort((leftTenant, rightTenant) =>
      leftTenant.tenantName.localeCompare(rightTenant.tenantName, "zh-Hans-CN"),
    );
  }, [session]);

  const handleSelectTenant = useCallback(
    (tenantId: string): void => {
      const result = activateTenant(tenantId, redirectPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      navigate(result.redirectPath ?? "/portal", { replace: true });
    },
    [activateTenant, navigate, redirectPath],
  );

  if (!session) {
    const loginPath = redirectPath
      ? `/login?redirect=${encodeURIComponent(redirectPath)}`
      : "/login";

    return <Navigate replace to={loginPath} />;
  }

  if (tenantGroups.length <= 1) {
    return <Navigate replace to={resolveSessionPath(session, redirectPath)} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageToolbar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/portal")}
        >
          <ArrowLeftOutlined />
          返回营销门户
        </button>
      </div>

      <div className={styles.shell}>
        <section className={styles.headerCard}>
          <div className={styles.headerBody}>
            <span className={styles.eyebrow}>多租户企业选择</span>
            <h1 className={styles.title}>选择本次进入企业</h1>
            <p className={styles.description}>
              当前账号挂载了多个企业，请先选择本次要进入的企业；进入后系统会按该企业下的权限展示可用模块，并支持在菜单中切换企业。
            </p>
          </div>
          <div className={styles.accountPanel}>
            <span className={styles.accountLabel}>当前账号</span>
            <strong className={styles.accountName}>{session.name}</strong>
            <span className={styles.accountMeta}>{session.phone}</span>
            <span className={styles.accountMeta}>{tenantGroups.length} 个企业可进入</span>
          </div>
        </section>

        <section className={styles.groupCard}>
          <div className={styles.groupHeader}>
            <div>
              <div className={styles.groupTitle}>可进入企业列表</div>
              <div className={styles.groupMeta}>
                每个企业下可进入的系统由租户内角色和权限决定。
              </div>
            </div>
            <span className={styles.groupCount}>{tenantGroups.length} 个企业</span>
          </div>

          <div className={styles.identityGrid}>
            {tenantGroups.map(group => {
              const isActiveTenant = activeIdentity?.tenantId === group.tenantId;

              return (
                <article
                  key={group.tenantId}
                  className={`${styles.identityCard} ${isActiveTenant ? styles.identityCardActive : ""}`}
                >
                  <div className={styles.identityCardTop}>
                    <div>
                      <div className={styles.identityPlatform}>企业 / 租户</div>
                      <div className={styles.identityRole}>{group.tenantName}</div>
                    </div>
                    {isActiveTenant ? (
                      <span className={styles.identityTag}>
                        <CheckCircleOutlined />
                        当前企业
                      </span>
                    ) : null}
                  </div>

                  <p className={styles.identityDescription}>
                    可进入系统：{group.platformLabels.join("、")}
                  </p>

                  <div className={styles.identityFoot}>
                    <div className={styles.identityMetaGroup}>
                      <div className={styles.identitySubject}>{group.tenantCode}</div>
                      <div className={styles.identitySubtext}>
                        可用角色：{group.roleLabels.join("、")}
                      </div>
                    </div>
                    <Button
                      type={isActiveTenant ? "default" : "primary"}
                      icon={<LoginOutlined />}
                      onClick={() => handleSelectTenant(group.tenantId)}
                    >
                      {isActiveTenant ? "继续进入" : "进入该企业"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
