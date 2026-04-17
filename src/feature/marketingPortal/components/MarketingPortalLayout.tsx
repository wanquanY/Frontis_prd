import { useCallback, useMemo } from "react";

import { AppstoreOutlined, LogoutOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, message } from "antd";
import classNames from "classnames";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { getAdminManagementPath, getLoginPath } from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { PORTAL_NAV_ITEMS } from "@/feature/marketingPortal/portalData";
import { getAvatarText } from "@/pages/utils";

import styles from "./MarketingPortalLayout.module.less";

interface PortalModuleEntry {
  key: string;
  identityId: string;
  label: string;
  description: string;
  entryPath: string;
}

/**
 * 营销门户站点级布局。
 */
export const MarketingPortalLayout = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activateIdentity, activeIdentity, logout, session } = useMockAuth();
  const moduleEntries = useMemo<PortalModuleEntry[]>(() => {
    if (!session) {
      return [];
    }

    return session.identities.flatMap(identity => {
      const nextEntries: PortalModuleEntry[] = [
        {
          key: `identity-${identity.id}`,
          identityId: identity.id,
          label: identity.platformLabel,
          description: `${identity.tenantName} · ${identity.roleLabel}`,
          entryPath: identity.entryPath,
        },
      ];

      if (identity.role === "admin" && identity.platform === "enterpriseWorkspace") {
        nextEntries.push({
          key: `identity-${identity.id}-management`,
          identityId: identity.id,
          label: "企业管理后台",
          description: `${identity.tenantName} · 企业管理`,
          entryPath: getAdminManagementPath(),
        });
      }

      return nextEntries;
    });
  }, [session]);

  const handleOpenModule = useCallback(
    (entry: PortalModuleEntry): void => {
      const result = activateIdentity(entry.identityId, entry.entryPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      navigate(result.redirectPath ?? entry.entryPath, { replace: true });
    },
    [activateIdentity, navigate],
  );

  const handleLogout = useCallback((): void => {
    const redirectPath = `${location.pathname}${location.search}`;

    logout();
    message.success("已退出模拟登录。");
    navigate(getLoginPath(redirectPath), { replace: true });
  }, [location.pathname, location.search, logout, navigate]);

  const accountMenuItems = useMemo<MenuProps["items"]>(() => {
    if (!session) {
      return [];
    }

    const systemModuleItems: NonNullable<MenuProps["items"]> = moduleEntries.map(entry => ({
      key: entry.key,
      icon: <AppstoreOutlined />,
      label: (
        <span className={styles.menuItemContent}>
          <span className={styles.menuItemTitle}>{entry.label}</span>
          <span className={styles.menuItemDescription}>{entry.description}</span>
        </span>
      ),
      onClick: () => handleOpenModule(entry),
    }));

    return [
      {
        key: "module-group",
        type: "group",
        label: <span className={styles.menuGroupLabel}>系统功能模块</span>,
        children: systemModuleItems,
      },
      {
        type: "divider",
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "退出登录",
        onClick: handleLogout,
      },
    ];
  }, [handleLogout, handleOpenModule, moduleEntries, session]);

  return (
    <div className={styles.siteRoot} data-portal-root="true" data-portal-header-tone="dark">
      <div className={styles.backgroundAuraTop} />
      <div className={styles.backgroundAuraBottom} />

      <div className={styles.siteHeaderDock}>
        <div className={styles.headerShell}>
          <header className={styles.siteHeader}>
            <NavLink className={styles.brand} to="/portal">
              <span className={styles.brandMark}>F</span>
              <span className={styles.brandCopy}>
                <strong className={styles.brandTitle}>FrontisAI</strong>
                <span className={styles.brandSubtitle}>可持续进化的AI专家团</span>
              </span>
            </NavLink>

            <nav className={styles.navList} aria-label="营销门户主导航">
              {PORTAL_NAV_ITEMS.map(item => (
                <NavLink
                  key={item.id}
                  className={({ isActive }) =>
                    classNames(styles.navLink, isActive && styles.isActiveNavLink)
                  }
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className={styles.headerActions}>
              {session ? (
                <Dropdown
                  menu={{ items: accountMenuItems }}
                  overlayClassName={styles.accountDropdown}
                  placement="bottomRight"
                  trigger={["click"]}
                >
                  <button type="button" className={styles.accountTrigger} aria-label="打开账户菜单">
                    <span className={styles.accountName}>{session.name}</span>
                    <Avatar className={styles.accountAvatar} size={34}>
                      {getAvatarText(activeIdentity?.subjectName ?? session.name)}
                    </Avatar>
                  </button>
                </Dropdown>
              ) : (
                <NavLink className={styles.headerLogin} to="/login">
                  登录
                </NavLink>
              )}
            </div>
          </header>
        </div>
      </div>

      <div className={styles.shell}>
        <div className={styles.pageFrame}>
          <Outlet />
        </div>

        <footer className={styles.siteFooter}>
          <div className={styles.footerBrand}>
            <span className={styles.footerMark}>F</span>
            <div>
              <p className={styles.footerTitle}>FrontisAI</p>
              <p className={styles.footerSubtitle}>
                可持续进化的AI专家团
              </p>
            </div>
          </div>

          <div className={styles.footerLinks}>
            {PORTAL_NAV_ITEMS.map(item => (
              <NavLink key={item.id} className={styles.footerLink} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
};
