import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import {
  ApartmentOutlined,
  BranchesOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, Empty, Select, message } from "antd";
import { useNavigate } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { useFdeWorkbench } from "@/feature/fde/hooks/useFdeWorkbench";
import type {
  FdeDeliveryOrderItem,
  FdeLeadItem,
  FdeOpportunityItem,
  FdeTeamMemberItem,
  FdeWorkbenchTabItem,
  FdeWorkbenchTabKey,
} from "@/feature/fde/types";
import { getFdeAvatarUrl } from "@/feature/fde/utils";

import { FdeDeliveryWorkbench } from "./FdeDeliveryWorkbench";
import { FdeEvolutionTasksView } from "./FdeEvolutionTasksView";
import { FdeFeedbackBoardView } from "./FdeFeedbackBoardView";
import { FdeLeadWorkbench } from "./FdeLeadWorkbench";
import { FdeOperationsMonitorView } from "./FdeOperationsMonitorView";
import { FdeOpportunityWorkbench } from "./FdeOpportunityWorkbench";
import styles from "./FdeWorkbenchView.module.less";

const getWorkbenchTitle = (tab: FdeWorkbenchTabItem): string => `${tab.label}`;

const FDE_TAB_ICONS: Record<FdeWorkbenchTabKey, JSX.Element> = {
  opportunities: <DashboardOutlined />,
  leads: <ProfileOutlined />,
  delivery: <CloudServerOutlined />,
  operations: <LineChartOutlined />,
  feedback: <ApartmentOutlined />,
  evolution: <BranchesOutlined />,
};

const buildSceneOptions = (
  opportunities: FdeOpportunityItem[],
  leads: FdeLeadItem[],
  deliveryOrders: FdeDeliveryOrderItem[],
): string[] => {
  const sceneSet = new Set<string>();

  opportunities.forEach(item => {
    sceneSet.add(item.scenarioName);
  });
  leads.forEach(item => {
    item.interestedScenes.forEach(scene => {
      sceneSet.add(scene);
    });
  });
  deliveryOrders.forEach(item => {
    sceneSet.add(item.scenarioName);
  });

  return Array.from(sceneSet);
};

interface RoleSwitchButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

const RoleSwitchButton = ({ active, label, onClick }: RoleSwitchButtonProps): JSX.Element => (
  <button
    type="button"
    className={classNames(styles.roleButton, active && styles.roleButtonActive)}
    onClick={onClick}
  >
    {label}
  </button>
);

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
  const engineerMembers = useMemo<FdeTeamMemberItem[]>(
    () => workbench.teamMembers.filter(item => item.role === "engineer"),
    [workbench.teamMembers],
  );
  const sceneOptions = useMemo<string[]>(
    () => buildSceneOptions(workbench.opportunities, workbench.leads, workbench.deliveryOrders),
    [workbench.deliveryOrders, workbench.leads, workbench.opportunities],
  );
  const currentRoleLabel = workbench.activeRole === "leader" ? "团队负责人视角" : "FDE 员工视角";
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
    if (workbench.activeTab === "opportunities") {
      return (
        <FdeOpportunityWorkbench
          items={workbench.filteredOpportunities}
          members={workbench.teamMembers}
          selectedOpportunityId={workbench.selectedOpportunityId}
          setSelectedOpportunityId={workbench.setSelectedOpportunityId}
        />
      );
    }

    if (workbench.activeTab === "leads") {
      return (
        <FdeLeadWorkbench
          activeRole={workbench.activeRole}
          activeMemberId={workbench.activeMember.id}
          items={workbench.filteredLeads}
          members={engineerMembers}
          sceneOptions={sceneOptions}
          selectedLeadId={workbench.selectedLeadId}
          setSelectedLeadId={workbench.setSelectedLeadId}
          assignLead={workbench.assignLead}
          createLead={workbench.createLead}
          updateLeadStatus={workbench.updateLeadStatus}
          addLeadProgress={workbench.addLeadProgress}
        />
      );
    }

    if (workbench.activeTab === "delivery") {
      return (
        <FdeDeliveryWorkbench
          items={workbench.filteredDeliveryOrders}
          members={workbench.teamMembers}
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
          activeMemberId={workbench.activeMember.id}
        />
      );
    }

    if (workbench.activeTab === "feedback") {
      return (
        <FdeFeedbackBoardView
          items={workbench.filteredFeedbackAgents}
          selectedAgentId={workbench.selectedFeedbackAgentId}
          setSelectedAgentId={workbench.setSelectedFeedbackAgentId}
          triggerEvolution={workbench.triggerEvolution}
        />
      );
    }

    if (workbench.activeTab === "evolution") {
      return (
        <FdeEvolutionTasksView
          items={workbench.filteredEvolutionTasks}
          members={workbench.teamMembers}
          selectedTaskId={workbench.selectedEvolutionTaskId}
          setSelectedTaskId={workbench.setSelectedEvolutionTaskId}
        />
      );
    }

    return <Empty description="未找到对应的工作台内容" />;
  }, [
    engineerMembers,
    sceneOptions,
    workbench.activeRole,
    workbench.activeTab,
    workbench.activeMember.id,
    workbench.assignLead,
    workbench.addLeadProgress,
    workbench.createLead,
    workbench.filteredDeliveryOrders,
    workbench.filteredEvolutionTasks,
    workbench.filteredFeedbackAgents,
    workbench.filteredLeads,
    workbench.filteredOperationsCustomers,
    workbench.filteredOpportunities,
    workbench.selectedDeliveryOrderId,
    workbench.selectedEvolutionTaskId,
    workbench.selectedFeedbackAgentId,
    workbench.selectedLeadId,
    workbench.selectedOperationsCustomerId,
    workbench.selectedOpportunityId,
    workbench.setSelectedDeliveryOrderId,
    workbench.setSelectedEvolutionTaskId,
    workbench.setSelectedFeedbackAgentId,
    workbench.setSelectedLeadId,
    workbench.setSelectedOperationsCustomerId,
    workbench.setSelectedOpportunityId,
    workbench.teamMembers,
    workbench.triggerEvolution,
    workbench.updateLeadStatus,
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
                <div className={styles.footerHint}>{currentRoleLabel}</div>
              </div>
            )}
          </button>
        </Dropdown>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainPanel}>
          <header className={styles.header}>
            <div className={styles.headerIntro}>
              <span className={styles.eyebrow}>FDE Prototype</span>
              <h1 className={styles.title}>{getWorkbenchTitle(currentTab)}</h1>
              <p className={styles.description}>{currentTab.description}</p>
            </div>

            <div className={styles.headerControls}>
              <div className={styles.roleSwitch}>
                <RoleSwitchButton
                  active={workbench.activeRole === "leader"}
                  label="团队负责人"
                  onClick={() => workbench.setActiveRole("leader")}
                />
                <RoleSwitchButton
                  active={workbench.activeRole === "engineer"}
                  label="FDE 员工"
                  onClick={() => workbench.setActiveRole("engineer")}
                />
              </div>

              {workbench.activeRole === "engineer" ? (
                <Select
                  className={styles.memberSelect}
                  value={workbench.activeMember.id}
                  options={engineerMembers.map(item => ({
                    label: `${item.name} · ${item.title}`,
                    value: item.id,
                  }))}
                  onChange={value => workbench.setActiveMemberId(value)}
                />
              ) : null}
            </div>
          </header>

          <section className={styles.content}>{activeContent}</section>
        </div>
      </main>
    </div>
  );
};
