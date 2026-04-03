import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import {
  CloudServerOutlined,
  DashboardOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, Empty, message } from "antd";
import { useNavigate } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { useFdeWorkbench } from "@/feature/fde/hooks/useFdeWorkbench";
import type { FdeWorkbenchTabItem, FdeWorkbenchTabKey } from "@/feature/fde/types";
import { getFdeAvatarUrl } from "@/feature/fde/utils";

import { FdeDeliveryWorkbench } from "./FdeDeliveryWorkbench";
import { FdeOperationsMonitorView } from "./FdeOperationsMonitorView";
import { FdeVersionManagementView } from "./FdeVersionManagementView";
import styles from "./FdeWorkbenchView.module.less";

const getWorkbenchTitle = (tab: FdeWorkbenchTabItem): string => `${tab.label}`;

const FDE_TAB_ICONS: Record<FdeWorkbenchTabKey, JSX.Element> = {
  opportunities: <DashboardOutlined />,
  leads: <DashboardOutlined />,
  delivery: <CloudServerOutlined />,
  operations: <LineChartOutlined />,
  versionManagement: <SyncOutlined />,
  feedback: <LineChartOutlined />,
  evolution: <LineChartOutlined />,
};

/**
 * FDE 工作台主视图。
 */
export const FdeWorkbenchView = (): JSX.Element => {
  const navigate = useNavigate();
  const { logout } = useMockAuth();
  const workbench = useFdeWorkbench();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const currentTab = useMemo<FdeWorkbenchTabItem>(
    () => workbench.tabs.find(item => item.key === workbench.activeTab) ?? workbench.tabs[0],
    [workbench.activeTab, workbench.tabs],
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

  const activeContent = useMemo<JSX.Element>(() => {
    if (workbench.activeTab === "delivery") {
      return (
        <FdeDeliveryWorkbench
          items={workbench.filteredDeliveryOrders}
          members={workbench.teamMembers}
          currentMemberId={workbench.activeMember.id}
          selectedOrderId={workbench.selectedDeliveryOrderId}
          setSelectedOrderId={workbench.setSelectedDeliveryOrderId}
        />
      );
    }

    if (workbench.activeTab === "operations") {
      return (
        <FdeOperationsMonitorView
          items={workbench.filteredOperationsCustomers}
          selectedCustomerId={workbench.selectedOperationsCustomerId}
          setSelectedCustomerId={workbench.setSelectedOperationsCustomerId}
        />
      );
    }

    if (workbench.activeTab === "versionManagement") {
      return (
        <FdeVersionManagementView
          items={workbench.filteredVersionTasks}
          members={workbench.teamMembers}
          selectedTaskId={workbench.selectedVersionTaskId}
          setSelectedTaskId={workbench.setSelectedVersionTaskId}
        />
      );
    }

    return <Empty description="未找到对应的工作台内容" />;
  }, [
    workbench.activeTab,
    workbench.filteredDeliveryOrders,
    workbench.filteredOperationsCustomers,
    workbench.filteredVersionTasks,
    workbench.activeMember.id,
    workbench.selectedDeliveryOrderId,
    workbench.selectedOperationsCustomerId,
    workbench.selectedVersionTaskId,
    workbench.setSelectedDeliveryOrderId,
    workbench.setSelectedOperationsCustomerId,
    workbench.setSelectedVersionTaskId,
    workbench.teamMembers,
  ]);

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
          {workbench.tabs.map(item => (
            <button
              key={item.key}
              type="button"
              className={classNames(
                styles.navButton,
                isSidebarCollapsed && styles.navButtonCollapsed,
                workbench.activeTab === item.key && styles.navButtonActive,
              )}
              onClick={() => workbench.setActiveTab(item.key)}
              title={item.label}
            >
              <span className={styles.navIcon}>{FDE_TAB_ICONS[item.key]}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        <Dropdown menu={{ items: accountMenuItems }} placement="topLeft" trigger={["click"]}>
          <button
            type="button"
            className={classNames(styles.sidebarFooter, {
              [styles.sidebarFooterCollapsed]: isSidebarCollapsed,
            })}
          >
            <Avatar
              className={styles.memberAvatar}
              src={getFdeAvatarUrl(workbench.activeMember.avatarSeed)}
              size={40}
            />
            {isSidebarCollapsed ? null : (
              <div className={styles.footerCopy}>
                <div className={styles.footerValue}>{workbench.activeMember.name}</div>
                <div className={styles.footerHint}>FDE</div>
              </div>
            )}
          </button>
        </Dropdown>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainPanel}>
          <header className={styles.header}>
            <div className={styles.headerIntro}>
              <h1 className={styles.title}>{getWorkbenchTitle(currentTab)}</h1>
            </div>
          </header>

          <section className={styles.content}>{activeContent}</section>
        </div>
      </main>
    </div>
  );
};
