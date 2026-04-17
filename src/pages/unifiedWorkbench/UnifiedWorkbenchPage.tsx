import { Suspense, lazy, useCallback, useEffect, useMemo } from "react";

import classNames from "classnames";
import {
  AppstoreOutlined,
  ApartmentOutlined,
  CodeOutlined,
  LogoutOutlined,
  MessageOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, message } from "antd";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  getAdminManagementPath,
  getLoginPath,
  getSystemEntries,
  getTenantEntries,
} from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import type { FrontisWebRole } from "@/pages/types";

import styles from "./UnifiedWorkbenchPage.module.less";

type UnifiedWorkbenchTabKey = "dialogue" | "frontisDev" | "skillMarket" | "agentStore";

interface UnifiedWorkbenchPageProps {
  viewRole: FrontisWebRole;
}

interface UnifiedWorkbenchNavItem {
  key: UnifiedWorkbenchTabKey;
  label: string;
  description: string;
  icon: JSX.Element;
}

const DEFAULT_TAB_KEY: UnifiedWorkbenchTabKey = "dialogue";
const FrontisPage = lazy(() => import("@/pages/FrontisPage"));
const FdeAgentDevView = lazy(() =>
  import("@/feature/fde/components/FdeAgentDevView").then(module => ({
    default: module.FdeAgentDevView,
  })),
);
const FdeSkillMarketView = lazy(() =>
  import("@/feature/fde/components/FdeSkillMarketView").then(module => ({
    default: module.FdeSkillMarketView,
  })),
);
const FdeAgentStoreView = lazy(() =>
  import("@/feature/fde/components/FdeAgentStoreView").then(module => ({
    default: module.FdeAgentStoreView,
  })),
);
const TAB_SEGMENTS: Record<UnifiedWorkbenchTabKey, string> = {
  dialogue: "dialogue",
  frontisDev: "frontis-dev",
  skillMarket: "skill-market",
  agentStore: "agent-store",
};
const TAB_ITEMS: UnifiedWorkbenchNavItem[] = [
  {
    key: "dialogue",
    label: "对话工作台",
    description: "延续当前智能工作台的对话与成果协作。",
    icon: <MessageOutlined />,
  },
  {
    key: "frontisDev",
    label: "Frontis 开发",
    description: "进入 Agent 开发工作区。",
    icon: <CodeOutlined />,
  },
  {
    key: "skillMarket",
    label: "Skill 广场",
    description: "查看并管理 Skill 资产。",
    icon: <ThunderboltOutlined />,
  },
  {
    key: "agentStore",
    label: "Agent 广场",
    description: "查看 Agent 上架与版本情况。",
    icon: <AppstoreOutlined />,
  },
];

const getTabKeyFromPath = (tabPath?: string): UnifiedWorkbenchTabKey | null => {
  if (!tabPath) {
    return null;
  }

  const matchedItem = TAB_ITEMS.find(item => TAB_SEGMENTS[item.key] === tabPath);
  return matchedItem?.key ?? null;
};

const getUnifiedWorkbenchPath = (
  viewRole: FrontisWebRole,
  tabKey: UnifiedWorkbenchTabKey,
): string => {
  const basePath = viewRole === "admin" ? "/web/admin/workspace" : "/web/employee";
  return `${basePath}/${TAB_SEGMENTS[tabKey]}`;
};

/**
 * 统一用户端页面，聚合员工对话工作台与 FDE 开发视图。
 */
export const UnifiedWorkbenchPage = ({ viewRole }: UnifiedWorkbenchPageProps): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tabPath } = useParams<{ tabPath?: string }>();
  const { activateIdentity, activateTenant, activeIdentity, logout, session } = useMockAuth();

  const routeTab = useMemo<UnifiedWorkbenchTabKey | null>(
    () => getTabKeyFromPath(tabPath),
    [tabPath],
  );
  const activeTab = routeTab ?? DEFAULT_TAB_KEY;
  const activeTabItem = useMemo<UnifiedWorkbenchNavItem>(
    () => TAB_ITEMS.find(item => item.key === activeTab) ?? TAB_ITEMS[0],
    [activeTab],
  );

  useEffect(() => {
    if (routeTab) {
      return;
    }

    navigate(getUnifiedWorkbenchPath(viewRole, DEFAULT_TAB_KEY), { replace: true });
  }, [navigate, routeTab, viewRole]);

  const handleLogout = useCallback((): void => {
    const redirectPath = `${location.pathname}${location.search}`;

    logout();
    message.success("已退出模拟登录。");
    navigate(getLoginPath(redirectPath), { replace: true });
  }, [location.pathname, location.search, logout, navigate]);

  const systemEntries = useMemo(
    () =>
      getSystemEntries(
        session?.identities ?? [],
        activeIdentity?.tenantId,
        session?.activeIdentityId,
      ),
    [activeIdentity?.tenantId, session?.activeIdentityId, session?.identities],
  );
  const tenantEntries = useMemo(
    () => getTenantEntries(session?.identities ?? [], activeIdentity?.tenantId),
    [activeIdentity?.tenantId, session?.identities],
  );

  const handleOpenSystemEntry = useCallback(
    (identityId: string, entryPath: string): void => {
      const result = activateIdentity(identityId, entryPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      navigate(result.redirectPath ?? entryPath, { replace: true });
    },
    [activateIdentity, navigate],
  );
  const handleSwitchTenant = useCallback(
    (tenantId: string): void => {
      const currentPath = `${location.pathname}${location.search}`;
      const result = activateTenant(tenantId, currentPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      navigate(result.redirectPath ?? "/portal", { replace: true });
    },
    [activateTenant, location.pathname, location.search, navigate],
  );

  const accountMenuItems: MenuProps["items"] = [
    ...(viewRole === "admin"
      ? [
          {
            key: "open-admin-management",
            icon: <AppstoreOutlined />,
            label: "进入企业管理后台",
            onClick: () => navigate(getAdminManagementPath(), { replace: true }),
          },
          {
            type: "divider" as const,
          },
        ]
      : []),
    ...systemEntries.map(entry => ({
      key: `system-entry-${entry.identityId}`,
      icon: <AppstoreOutlined />,
      label: `进入${entry.label}`,
      onClick: () => handleOpenSystemEntry(entry.identityId, entry.entryPath),
    })),
    ...(systemEntries.length
      ? [
          {
            type: "divider" as const,
          },
        ]
      : []),
    ...tenantEntries.map(tenant => ({
      key: `tenant-entry-${tenant.tenantId}`,
      icon: <ApartmentOutlined />,
      label: `切换到${tenant.tenantName}`,
      onClick: () => handleSwitchTenant(tenant.tenantId),
    })),
    ...(tenantEntries.length
      ? [
          {
            type: "divider" as const,
          },
        ]
      : []),
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const handleNavigateTab = useCallback(
    (tabKey: UnifiedWorkbenchTabKey): void => {
      if (tabKey === activeTab) {
        return;
      }

      navigate(getUnifiedWorkbenchPath(viewRole, tabKey));
    },
    [activeTab, navigate, viewRole],
  );

  const featureAccountName = activeIdentity?.subjectName ?? session?.name ?? "当前账号";
  const activeContent = useMemo((): JSX.Element => {
    if (activeTab === "dialogue") {
      return <FrontisPage viewRole={viewRole} embedded={true} />;
    }

    if (activeTab === "frontisDev") {
      return <FdeAgentDevView onNavigate={() => handleNavigateTab("agentStore")} />;
    }

    if (activeTab === "skillMarket") {
      return <FdeSkillMarketView onNavigateToAgentDev={() => handleNavigateTab("frontisDev")} />;
    }

    if (activeTab === "agentStore") {
      return <FdeAgentStoreView onNavigateToAgentDev={() => handleNavigateTab("frontisDev")} />;
    }

    return <FrontisPage viewRole={viewRole} embedded={true} />;
  }, [activeTab, handleNavigateTab, viewRole]);

  const shouldShowFeatureHeader = activeTab !== "dialogue";

  return (
    <div className={styles.root}>
      <aside className={styles.navRail} aria-label="统一工作台一级导航">
        <div className={styles.brandBlock}>
          <span className={styles.brandLogo}>F</span>
          <span className={styles.brandName}>Frontis AI</span>
        </div>

        <nav className={styles.navList}>
          {TAB_ITEMS.map(item => (
            <button
              key={item.key}
              type="button"
              title={item.description}
              className={classNames(styles.navButton, {
                [styles.navButtonActive]: item.key === activeTab,
              })}
              onClick={() => handleNavigateTab(item.key)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navText}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.navFooter}>
          <Dropdown menu={{ items: accountMenuItems }} placement="topRight" trigger={["click"]}>
            <button type="button" className={styles.navAccountButton} aria-label="打开账户菜单">
              <Avatar className={styles.accountAvatar} size={36}>
                {featureAccountName.slice(0, 1)}
              </Avatar>
              <span className={styles.navAccountName}>{featureAccountName}</span>
            </button>
          </Dropdown>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainPanel}>
          {shouldShowFeatureHeader ? (
            <header className={styles.featureHeader}>
              <div className={styles.featureHeaderInfo}>
                <div className={styles.featureHeaderEyebrow}>FDE 开发融合视图</div>
                <h1 className={styles.featureHeaderTitle}>{activeTabItem.label}</h1>
                <p className={styles.featureHeaderDescription}>{activeTabItem.description}</p>
              </div>
            </header>
          ) : null}

          <section
            className={classNames(styles.content, {
              [styles.featureContent]: shouldShowFeatureHeader,
            })}
          >
            <Suspense fallback={<div className={styles.loadingState}>页面加载中...</div>}>
              {activeContent}
            </Suspense>
          </section>
        </div>
      </main>
    </div>
  );
};

export default UnifiedWorkbenchPage;
