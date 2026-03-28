import classNames from "classnames";
import { NavLink, Outlet } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { PORTAL_NAV_ITEMS } from "@/feature/marketingPortal/portalData";

import styles from "./MarketingPortalLayout.module.less";

/**
 * 营销门户站点级布局。
 */
export const MarketingPortalLayout = (): JSX.Element => {
  const { getDefaultPathByRole, session } = useMockAuth();
  const workspacePath = session ? getDefaultPathByRole(session.role) : "/login";

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
                <span className={styles.sessionHint}>
                  {session.name}
                  <span className={styles.sessionHintDivider}>·</span>
                  {session.role === "admin" ? "企业老板" : "普通用户"}
                </span>
              ) : null}

              <NavLink className={styles.headerLogin} to={workspacePath}>
                {session ? "进入工作台" : "登录"}
              </NavLink>
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
