import classNames from "classnames";
import { ArrowRightOutlined } from "@ant-design/icons";
import { NavLink, Outlet } from "react-router-dom";

import { PORTAL_NAV_ITEMS } from "@/feature/marketingPortal/portalData";

import styles from "./MarketingPortalLayout.module.less";

/**
 * 营销门户站点级布局。
 */
export const MarketingPortalLayout = (): JSX.Element => {
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
                <span className={styles.brandSubtitle}>企业 AI 员工交付平台</span>
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

            <NavLink className={styles.headerCta} to="/portal/contact">
              预约产品演示
              <ArrowRightOutlined />
            </NavLink>
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
                面向 SMB 的 AI 员工交付平台，围绕盒子运行、云端使用和持续运营展开。
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
