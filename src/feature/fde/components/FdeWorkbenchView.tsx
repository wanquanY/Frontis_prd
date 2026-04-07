import { useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import {
  AppstoreOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DashboardOutlined,
  HomeOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  SyncOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, Empty, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { useFdeWorkbench } from "@/feature/fde/hooks/useFdeWorkbench";
import type {
  FdeWorkbenchTabItem,
  FdeWorkbenchTabKey,
} from "@/feature/fde/types";
import {
  FDE_BUSINESS_TAB_KEYS,
  getFdeAvatarUrl,
  getFdeWorkbenchPath,
  getFdeWorkbenchTabKeyFromPath,
} from "@/feature/fde/utils";

import { FdeDeliveryWorkbench } from "./FdeDeliveryWorkbench";
import { FdeLeaderDashboardView } from "./FdeLeaderDashboardView";
import { FdeOpportunityWorkbench } from "./FdeOpportunityWorkbench";
import { FdeOperationsMonitorView } from "./FdeOperationsMonitorView";
import { FdeOrderManagementView } from "./FdeOrderManagementView";
import { FdeTeamManagementView } from "./FdeTeamManagementView";
import { FdeVersionManagementView } from "./FdeVersionManagementView";
import styles from "./FdeWorkbenchView.module.less";

const FDE_TAB_ICONS: Record<FdeWorkbenchTabKey, JSX.Element> = {
  opportunities: <DashboardOutlined />,
  dashboard: <HomeOutlined />,
  orderManagement: <ShoppingCartOutlined />,
  delivery: <CloudServerOutlined />,
  operations: <LineChartOutlined />,
  teamManagement: <TeamOutlined />,
  versionManagement: <SyncOutlined />,
  agentDev: <CodeOutlined />,
  skillMarket: <ThunderboltOutlined />,
  agentStore: <AppstoreOutlined />,
  opsInsights: <LineChartOutlined />,
};

/**
 * FDE 工作台主视图。
 */
export const FdeWorkbenchView = (): JSX.Element => {
  const navigate = useNavigate();
  const { tabPath } = useParams<{ tabPath?: string }>();
  const { logout, session } = useMockAuth();
  const workbench = useFdeWorkbench(session?.userId);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const businessTabKeys = useMemo<Set<FdeWorkbenchTabKey>>(
    () => new Set(FDE_BUSINESS_TAB_KEYS),
    [],
  );
  const businessTabs = useMemo<FdeWorkbenchTabItem[]>(
    () => workbench.tabs.filter(item => businessTabKeys.has(item.key)),
    [businessTabKeys, workbench.tabs],
  );
  const businessNavGroups = useMemo(
    () =>
      workbench.navGroups
        .map(group => ({
          ...group,
          items: group.items.filter(item => businessTabKeys.has(item.key)),
          subGroups: group.subGroups
            ?.map(sub => ({
              ...sub,
              items: sub.items.filter(item => businessTabKeys.has(item.key)),
            }))
            .filter(sub => sub.items.length),
        }))
        .filter(group => group.items.length || group.subGroups?.length),
    [businessTabKeys, workbench.navGroups],
  );

  const routeTab = useMemo<FdeWorkbenchTabKey | null>(
    () => getFdeWorkbenchTabKeyFromPath(tabPath),
    [tabPath],
  );
  const fallbackTab = useMemo<FdeWorkbenchTabKey>(
    () => businessTabs[0]?.key ?? "delivery",
    [businessTabs],
  );
  const visibleTabKeys = useMemo<Set<FdeWorkbenchTabKey>>(
    () => new Set(businessTabs.map(item => item.key)),
    [businessTabs],
  );
  const activeTab = routeTab && visibleTabKeys.has(routeTab) ? routeTab : fallbackTab;

  useEffect(() => {
    if (!workbench.tabs.length) {
      return;
    }

    if (!businessTabs.length) {
      return;
    }

    if (!routeTab || !visibleTabKeys.has(routeTab)) {
      navigate(getFdeWorkbenchPath(fallbackTab), { replace: true });
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
    businessTabs.length,
  ]);

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
    (tab: FdeWorkbenchTabKey, replace = false): void => {
      navigate(getFdeWorkbenchPath(tab), { replace });
    },
    [navigate],
  );

  let activeContent: JSX.Element = <Empty description="未找到对应的工作台内容" />;

  if (activeTab === "opportunities") {
    activeContent = (
      <FdeOpportunityWorkbench
        activeRole={workbench.activeRole}
        items={workbench.filteredOpportunities}
        members={workbench.teamMembers}
        selectedOpportunityId={workbench.selectedOpportunityId}
        setSelectedOpportunityId={workbench.setSelectedOpportunityId}
        assignOpportunity={workbench.assignOpportunity}
        createOpportunity={workbench.createOpportunity}
        updateOpportunityStatus={workbench.updateOpportunityStatus}
        addOpportunityComment={workbench.addOpportunityComment}
      />
    );
  } else if (activeTab === "dashboard") {
    activeContent = (
      <FdeLeaderDashboardView
        members={workbench.teamMembers}
        opportunities={workbench.opportunities}
        deliveryOrders={workbench.deliveryOrders}
        operationsCustomers={workbench.operationsCustomers}
        versionTasks={workbench.versionTasks}
        onNavigate={handleNavigateTab}
      />
    );
  } else if (activeTab === "orderManagement") {
    activeContent = (
      <FdeOrderManagementView
        items={workbench.filteredOrders}
        deliveryOrders={workbench.deliveryOrders}
        selectedOrderId={workbench.selectedOrderManagementId}
        setSelectedOrderId={workbench.setSelectedOrderManagementId}
        createOrder={workbench.createOrder}
        onNavigateToDelivery={() => handleNavigateTab("delivery")}
      />
    );
  } else if (activeTab === "delivery") {
    activeContent = (
      <FdeDeliveryWorkbench
        items={workbench.filteredDeliveryOrders}
        orderItems={workbench.filteredOrders}
        members={workbench.teamMembers}
        currentMemberId={workbench.activeMember.id}
        createOrder={workbench.createOrder}
        selectedOrderId={workbench.selectedDeliveryOrderId}
        syncOrders={workbench.syncDeliveryOrders}
        setSelectedOrderId={workbench.setSelectedDeliveryOrderId}
      />
    );
  } else if (activeTab === "operations") {
    activeContent = (
      <FdeOperationsMonitorView
        items={workbench.filteredOperationsCustomers}
        selectedCustomerId={workbench.selectedOperationsCustomerId}
        setSelectedCustomerId={workbench.setSelectedOperationsCustomerId}
        onNavigateToDelivery={() => handleNavigateTab("delivery")}
        renewAsset={workbench.renewAsset}
      />
    );
  } else if (activeTab === "teamManagement") {
    activeContent = (
      <FdeTeamManagementView
        activeMember={workbench.activeMember}
        items={workbench.teamMembers}
        canManageMembers={workbench.canManageMembers}
        addTeamMember={workbench.addTeamMember}
        importTeamMembers={workbench.importTeamMembers}
        removeTeamMember={workbench.removeTeamMember}
        toggleTeamMemberStatus={workbench.toggleTeamMemberStatus}
        updateTeamMember={workbench.updateTeamMember}
      />
    );
  } else if (activeTab === "versionManagement") {
    activeContent = (
      <FdeVersionManagementView
        items={workbench.filteredVersionTasks}
        members={workbench.teamMembers}
        selectedTaskId={workbench.selectedVersionTaskId}
        setSelectedTaskId={workbench.setSelectedVersionTaskId}
      />
    );
  }

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
                <div className={styles.brandDescription}>专家交付工作台</div>
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
          aria-label="FDE 工作台导航"
        >
          {businessNavGroups.map(group => (
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
                  <span className={styles.navIcon}>{FDE_TAB_ICONS[item.key]}</span>
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
                      <span className={styles.navIcon}>{FDE_TAB_ICONS[item.key]}</span>
                      <span className={styles.navLabel}>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <Dropdown
          menu={{ items: accountMenuItems }}
          placement={isSidebarCollapsed ? "topRight" : "topLeft"}
          trigger={["click"]}
        >
          <button
            type="button"
            className={classNames(styles.sidebarFooter, {
              [styles.sidebarFooterCollapsed]: isSidebarCollapsed,
            })}
            aria-label="打开账户菜单"
          >
            <Avatar
              className={styles.memberAvatar}
              src={getFdeAvatarUrl(workbench.activeMember.avatarSeed)}
              size={36}
            />
            {isSidebarCollapsed ? null : (
              <div className={styles.footerCopy}>
                <div className={styles.footerValue}>{workbench.activeMember.name}</div>
                <div className={styles.memberMeta}>当前登录账号</div>
              </div>
            )}
          </button>
        </Dropdown>

      </aside>

      <main className={styles.main}>
        <div className={styles.mainPanel}>
          <section className={styles.content}>{activeContent}</section>
        </div>
      </main>
    </div>
  );
};
