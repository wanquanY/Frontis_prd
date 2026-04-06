import { useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import {
  AppstoreOutlined,
  CodeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, Empty, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { FdeAgentDevView } from "@/feature/fde/components/FdeAgentDevView";
import { FdeAgentStoreView } from "@/feature/fde/components/FdeAgentStoreView";
import { FdeSkillMarketView } from "@/feature/fde/components/FdeSkillMarketView";
import { useFdeDevWorkbench } from "@/feature/fde-dev/hooks/useFdeDevWorkbench";
import type {
  FdeWorkbenchTabItem,
  FdeWorkbenchTabKey,
} from "@/feature/fde/types";
import {
  getFdeAvatarUrl,
  getFdeDevWorkbenchPath,
  getFdeWorkbenchTabKeyFromPath,
} from "@/feature/fde/utils";

import styles from "../../fde/components/FdeWorkbenchView.module.less";

const FDE_DEV_TAB_ICONS: Partial<Record<FdeWorkbenchTabKey, JSX.Element>> = {
  agentDev: <CodeOutlined />,
  skillMarket: <ThunderboltOutlined />,
  agentStore: <AppstoreOutlined />,
};

const getWorkbenchTitle = (tab: FdeWorkbenchTabItem): string => tab.label;

/**
 * FDE 开发管理工作台主视图。
 */
export const FdeDevWorkbenchView = (): JSX.Element => {
  const navigate = useNavigate();
  const { tabPath } = useParams<{ tabPath?: string }>();
  const { logout, session } = useMockAuth();
  const workbench = useFdeDevWorkbench(session?.userId);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const routeTab = useMemo<FdeWorkbenchTabKey | null>(
    () => getFdeWorkbenchTabKeyFromPath(tabPath),
    [tabPath],
  );
  const fallbackTab = useMemo<FdeWorkbenchTabKey>(
    () => workbench.tabs[0]?.key ?? "agentDev",
    [workbench.tabs],
  );
  const visibleTabKeys = useMemo<Set<FdeWorkbenchTabKey>>(
    () => new Set(workbench.tabs.map(item => item.key)),
    [workbench.tabs],
  );
  const activeTab = routeTab && visibleTabKeys.has(routeTab) ? routeTab : fallbackTab;

  useEffect(() => {
    if (!workbench.tabs.length) {
      return;
    }

    if (!routeTab || !visibleTabKeys.has(routeTab)) {
      navigate(getFdeDevWorkbenchPath(fallbackTab), { replace: true });
      return;
    }

    if (workbench.activeTab !== routeTab) {
      workbench.setActiveTab(routeTab);
    }
  }, [
    fallbackTab,
    navigate,
    routeTab,
    visibleTabKeys,
    workbench.activeTab,
    workbench.setActiveTab,
    workbench.tabs.length,
  ]);

  const currentTab = useMemo<FdeWorkbenchTabItem | null>(
    () => workbench.tabs.find(item => item.key === activeTab) ?? workbench.tabs[0] ?? null,
    [activeTab, workbench.tabs],
  );

  const handleLogout = useCallback((): void => {
    logout();
    message.success("已退出模拟登录。");
    navigate("/portal", { replace: true });
  }, [logout, navigate]);

  const accountMenuItems: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const handleNavigateTab = useCallback(
    (tabKey: FdeWorkbenchTabKey, replace = false): void => {
      navigate(getFdeDevWorkbenchPath(tabKey), { replace });
    },
    [navigate],
  );

  const activeContent = useMemo<JSX.Element>(() => {
    if (activeTab === "skillMarket") {
      return <FdeSkillMarketView onNavigateToAgentDev={() => handleNavigateTab("agentDev")} />;
    }

    if (activeTab === "agentStore") {
      return <FdeAgentStoreView onNavigateToAgentDev={() => handleNavigateTab("agentDev")} />;
    }

    if (activeTab === "agentDev") {
      return <FdeAgentDevView />;
    }

    return <Empty description="未找到对应的工作台内容" />;
  }, [activeTab, handleNavigateTab]);

  return (
    <div className={styles.root}>
      <aside
        className={classNames(styles.sidebar, {
          [styles.sidebarCollapsed]: isSidebarCollapsed,
        })}
      >
        <div
          className={classNames(styles.sidebarTop, {
            [styles.sidebarTopCollapsed]: isSidebarCollapsed,
          })}
        >
          <div
            className={classNames(styles.brandCard, {
              [styles.brandCardCollapsed]: isSidebarCollapsed,
            })}
          >
            <div className={styles.brandIcon}>F</div>
            {isSidebarCollapsed ? null : (
              <div className={styles.brandCopy}>
                <div className={styles.brandTitle}>Frontis FDE</div>
                <div className={styles.brandDescription}>专家开发工作台</div>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.sidebarToggle}
            aria-label={isSidebarCollapsed ? "展开菜单栏" : "收起菜单栏"}
            onClick={() => setIsSidebarCollapsed(current => !current)}
          >
            {isSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </div>

        <nav
          className={classNames(styles.sidebarNav, {
            [styles.sidebarNavCollapsed]: isSidebarCollapsed,
          })}
          aria-label="FDE 开发管理工作台导航"
        >
          {workbench.navGroups.map(group => (
            <div key={group.groupKey} className={styles.navGroup}>
              {isSidebarCollapsed ? null : (
                <div className={styles.navGroupLabel}>{group.groupLabel}</div>
              )}
              {group.items.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={classNames(
                    styles.navButton,
                    isSidebarCollapsed && styles.navButtonCollapsed,
                    activeTab === item.key && styles.navButtonActive,
                  )}
                  onClick={() => handleNavigateTab(item.key)}
                  title={item.label}
                >
                  <span className={styles.navIcon}>
                    {FDE_DEV_TAB_ICONS[item.key] ?? <CodeOutlined />}
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              ))}
              {group.subGroups?.map(sub => (
                <div key={sub.groupKey} className={styles.navSubGroup}>
                  {isSidebarCollapsed ? null : (
                    <div className={styles.navSubGroupLabel}>{sub.groupLabel}</div>
                  )}
                  {sub.items.map(item => (
                    <button
                      key={item.key}
                      type="button"
                      className={classNames(
                        styles.navButton,
                        isSidebarCollapsed && styles.navButtonCollapsed,
                        activeTab === item.key && styles.navButtonActive,
                      )}
                      onClick={() => handleNavigateTab(item.key)}
                      title={item.label}
                    >
                      <span className={styles.navIcon}>
                        {FDE_DEV_TAB_ICONS[item.key] ?? <CodeOutlined />}
                      </span>
                      <span className={styles.navLabel}>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainPanel}>
          <header className={styles.header}>
            <div className={styles.headerIntro}>
              <h1 className={styles.title}>
                {currentTab ? getWorkbenchTitle(currentTab) : "FDE 开发管理"}
              </h1>
            </div>
            <div className={styles.headerControls}>
              <Dropdown menu={{ items: accountMenuItems }} placement="bottomRight" trigger={["click"]}>
                <button type="button" className={styles.accountTrigger}>
                  <Avatar
                    className={styles.memberAvatar}
                    src={getFdeAvatarUrl(workbench.activeMember.avatarSeed)}
                    size={36}
                  />
                  <div>
                    <div className={styles.memberName}>{workbench.activeMember.name}</div>
                  </div>
                </button>
              </Dropdown>
            </div>
          </header>

          <section className={styles.content}>{activeContent}</section>
        </div>
      </main>
    </div>
  );
};
