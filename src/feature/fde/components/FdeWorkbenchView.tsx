import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import {
  AppstoreOutlined,
  ApartmentOutlined,
  BranchesOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  LineChartOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, Select, message } from "antd";
import { useNavigate } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { useFdeWorkbench } from "@/feature/fde/hooks/useFdeWorkbench";
import type {
  FdeDeliveryOrderItem,
  FdeLeadItem,
  FdeOperationsCustomerItem,
  FdeOpportunityItem,
  FdeTeamMemberItem,
  FdeWorkbenchTabItem,
  FdeWorkbenchTabKey,
  FdeWorkbenchTargetInfo,
} from "@/feature/fde/types";
import { getFdeAvatarUrl } from "@/feature/fde/utils";

import { FdeDeliveryWorkbench } from "./FdeDeliveryWorkbench";
import { FdeEvolutionTasksView } from "./FdeEvolutionTasksView";
import { FdeFeedbackBoardView } from "./FdeFeedbackBoardView";
import { FdeLeadWorkbench } from "./FdeLeadWorkbench";
import { FdeOverviewDashboard } from "./FdeOverviewDashboard";
import { FdeOperationsMonitorView } from "./FdeOperationsMonitorView";
import { FdeOpportunityWorkbench } from "./FdeOpportunityWorkbench";
import { FdeReleasePushView } from "./FdeReleasePushView";
import styles from "./FdeWorkbenchView.module.less";

const getWorkbenchTitle = (tab: FdeWorkbenchTabItem): string => `${tab.label}`;

const FDE_TAB_ICONS: Record<FdeWorkbenchTabKey, JSX.Element> = {
  overview: <AppstoreOutlined />,
  opportunities: <DashboardOutlined />,
  leads: <ProfileOutlined />,
  delivery: <CloudServerOutlined />,
  operations: <LineChartOutlined />,
  feedback: <ApartmentOutlined />,
  evolution: <BranchesOutlined />,
  releases: <RocketOutlined />,
};

const buildSceneOptions = (
  opportunities: FdeOpportunityItem[],
  leads: FdeLeadItem[],
  deliveryOrders: FdeDeliveryOrderItem[],
  operationsCustomers: FdeOperationsCustomerItem[],
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
  operationsCustomers.forEach(item => {
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
    () =>
      buildSceneOptions(
        workbench.opportunities,
        workbench.leads,
        workbench.deliveryOrders,
        workbench.operationsCustomers,
      ),
    [workbench.deliveryOrders, workbench.leads, workbench.opportunities, workbench.operationsCustomers],
  );
  const ownerOptions = useMemo<{ label: string; value: string }[]>(
    () => [
      {
        label: "全部负责人",
        value: "all",
      },
      ...engineerMembers.map(item => ({
        label: `${item.name} · ${item.title}`,
        value: item.id,
      })),
    ],
    [engineerMembers],
  );
  const currentRoleLabel = workbench.activeRole === "leader" ? "团队负责人视角" : "FDE 员工视角";
  const handleLogout = useCallback((): void => {
    logout();
    message.success("已退出模拟登录。");
    navigate("/portal", { replace: true });
  }, [logout, navigate]);
  const handleOpenTarget = useCallback(
    (target: FdeWorkbenchTargetInfo): void => {
      workbench.setActiveTab(target.tabKey);

      if (target.entityType === "lead") {
        workbench.setSelectedLeadId(target.entityId);
        return;
      }

      if (target.entityType === "opportunity") {
        workbench.setSelectedOpportunityId(target.entityId);
        return;
      }

      if (target.entityType === "delivery") {
        workbench.setSelectedDeliveryOrderId(target.entityId);
        return;
      }

      if (target.entityType === "operations") {
        workbench.setSelectedOperationsCustomerId(target.entityId);
        return;
      }

      if (target.entityType === "feedback") {
        workbench.setSelectedFeedbackAgentId(target.entityId);
        return;
      }

      if (target.entityType === "evolution") {
        workbench.setSelectedEvolutionTaskId(target.entityId);
        return;
      }

      workbench.setSelectedReleasePushId(target.entityId);
    },
    [workbench],
  );
  const handleConvertLeadToOpportunity = useCallback(
    (leadId: string): string | null => {
      const nextOpportunityId = workbench.convertLeadToOpportunity(leadId);
      if (!nextOpportunityId) {
        message.warning("当前线索不存在，无法转入商机。");
        return null;
      }

      workbench.setActiveTab("opportunities");
      workbench.setSelectedOpportunityId(nextOpportunityId);
      return nextOpportunityId;
    },
    [workbench],
  );
  const handleConvertOpportunityToDelivery = useCallback(
    (opportunityId: string): string | null => {
      const nextDeliveryOrderId = workbench.convertOpportunityToDelivery(opportunityId);
      if (!nextDeliveryOrderId) {
        message.warning("当前商机不存在，无法转入配置交付。");
        return null;
      }

      workbench.setActiveTab("delivery");
      workbench.setSelectedDeliveryOrderId(nextDeliveryOrderId);
      return nextDeliveryOrderId;
    },
    [workbench],
  );
  const handleOpenDeliveryFromOperations = useCallback(
    (customerName: string): void => {
      const targetOrder = workbench.deliveryOrders.find(item => item.customerName === customerName);
      if (!targetOrder) {
        message.info("当前客户还没有交付工单。");
        return;
      }

      workbench.setActiveTab("delivery");
      workbench.setSelectedDeliveryOrderId(targetOrder.id);
    },
    [workbench],
  );
  const handleOpenFeedbackFromOperations = useCallback(
    (customerName: string): void => {
      const targetAgent = workbench.feedbackAgents.find(item => item.customerName === customerName);
      if (!targetAgent) {
        message.info("当前客户还没有可查看的回流数据。");
        return;
      }

      workbench.setActiveTab("feedback");
      workbench.setSelectedFeedbackAgentId(targetAgent.id);
    },
    [workbench],
  );
  const handleTriggerEvolution = useCallback(
    (
      agentId: string,
      payload?: {
        manualNote: string;
        signalIds: string[];
      },
    ): string | null => {
      const nextTaskId = workbench.triggerEvolution(agentId, payload);
      if (!nextTaskId) {
        message.warning("当前回流任务不存在，无法创建进化任务。");
        return null;
      }

      workbench.setActiveTab("evolution");
      workbench.setSelectedEvolutionTaskId(nextTaskId);
      return nextTaskId;
    },
    [workbench],
  );
  const handleCreateReleaseFromEvolutionTask = useCallback(
    (taskId: string): string | null => {
      const nextReleaseId = workbench.createReleaseFromEvolutionTask(taskId);
      if (!nextReleaseId) {
        message.warning("当前任务尚未审核通过，无法创建发布单。");
        return null;
      }

      workbench.setActiveTab("releases");
      workbench.setSelectedReleasePushId(nextReleaseId);
      return nextReleaseId;
    },
    [workbench],
  );
  const accountMenuItems: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const activeContent = useMemo<JSX.Element>(() => {
    if (workbench.activeTab === "overview") {
      return (
        <FdeOverviewDashboard
          activeRole={workbench.activeRole}
          activityFeed={workbench.activityFeed}
          hasActiveFilters={workbench.hasActiveFilters}
          onOpenTarget={handleOpenTarget}
          ownerOptions={ownerOptions}
          resetWorkbenchFilters={workbench.resetWorkbenchFilters}
          sceneOptions={sceneOptions}
          searchResults={workbench.searchResults}
          setWorkbenchFilterOwnerId={workbench.setWorkbenchFilterOwnerId}
          setWorkbenchFilterSceneName={workbench.setWorkbenchFilterSceneName}
          setWorkbenchFilterSearchKeyword={workbench.setWorkbenchFilterSearchKeyword}
          setWorkbenchFilterStatusLabel={workbench.setWorkbenchFilterStatusLabel}
          statusOptions={workbench.statusOptions}
          todoItems={workbench.todoItems}
          workbenchFilters={workbench.workbenchFilters}
        />
      );
    }

    if (workbench.activeTab === "opportunities") {
      return (
        <FdeOpportunityWorkbench
          items={workbench.filteredOpportunities}
          deliveryOrders={workbench.deliveryOrders}
          members={workbench.teamMembers}
          selectedOpportunityId={workbench.selectedOpportunityId}
          setSelectedOpportunityId={workbench.setSelectedOpportunityId}
          updateOpportunityStage={workbench.updateOpportunityStage}
          updateOpportunityFollowUp={workbench.updateOpportunityFollowUp}
          convertOpportunityToDelivery={handleConvertOpportunityToDelivery}
        />
      );
    }

    if (workbench.activeTab === "leads") {
      return (
        <FdeLeadWorkbench
          activeRole={workbench.activeRole}
          items={workbench.filteredLeads}
          members={engineerMembers}
          sceneOptions={sceneOptions}
          selectedLeadId={workbench.selectedLeadId}
          setSelectedLeadId={workbench.setSelectedLeadId}
          assignLead={workbench.assignLead}
          createLead={workbench.createLead}
          convertLeadToOpportunity={handleConvertLeadToOpportunity}
          updateLeadStatus={workbench.updateLeadStatus}
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
          updateDeliveryStep={workbench.updateDeliveryStep}
          updateDeliveryOrder={workbench.updateDeliveryOrder}
          addDeliveryBlocker={workbench.addDeliveryBlocker}
          updateDeliveryBlockerStatus={workbench.updateDeliveryBlockerStatus}
        />
      );
    }

    if (workbench.activeTab === "operations") {
      return (
        <FdeOperationsMonitorView
          items={workbench.filteredOperationsCustomers}
          members={workbench.teamMembers}
          selectedCustomerId={workbench.selectedOperationsCustomerId}
          setSelectedCustomerId={workbench.setSelectedOperationsCustomerId}
          updateAlertStatus={workbench.updateOperationsAlertStatus}
          assignAlert={workbench.assignOperationsAlert}
          recordAlertResolution={workbench.recordOperationsAlertResolution}
          openDelivery={handleOpenDeliveryFromOperations}
          openFeedback={handleOpenFeedbackFromOperations}
        />
      );
    }

    if (workbench.activeTab === "feedback") {
      return (
        <FdeFeedbackBoardView
          items={workbench.filteredFeedbackAgents}
          selectedAgentId={workbench.selectedFeedbackAgentId}
          setSelectedAgentId={workbench.setSelectedFeedbackAgentId}
          triggerEvolution={handleTriggerEvolution}
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
          startTask={workbench.startEvolutionTask}
          pauseTask={workbench.pauseEvolutionTask}
          retryTask={workbench.retryEvolutionTask}
          terminateTask={workbench.terminateEvolutionTask}
          submitTaskReview={workbench.submitEvolutionTaskReview}
          reviewTask={workbench.reviewEvolutionTask}
          createReleaseFromTask={handleCreateReleaseFromEvolutionTask}
        />
      );
    }

    return (
      <FdeReleasePushView
        items={workbench.filteredReleasePushes}
        members={workbench.teamMembers}
        selectedReleaseId={workbench.selectedReleasePushId}
        setSelectedReleaseId={workbench.setSelectedReleasePushId}
        updateReleasePush={workbench.updateReleasePush}
        startReleasePush={workbench.startReleasePush}
        pauseReleasePush={workbench.pauseReleasePush}
        completeReleasePush={workbench.completeReleasePush}
        rollbackReleasePush={workbench.rollbackReleasePush}
      />
    );
  }, [
    engineerMembers,
    handleOpenTarget,
    ownerOptions,
    sceneOptions,
    workbench.activeRole,
    workbench.activeTab,
    workbench.activityFeed,
    workbench.assignLead,
    workbench.createLead,
    workbench.deliveryOrders,
    workbench.filteredDeliveryOrders,
    workbench.filteredEvolutionTasks,
    workbench.filteredFeedbackAgents,
    workbench.filteredLeads,
    workbench.filteredOperationsCustomers,
    workbench.filteredOpportunities,
    workbench.filteredReleasePushes,
    workbench.hasActiveFilters,
    workbench.resetWorkbenchFilters,
    workbench.searchResults,
    workbench.selectedDeliveryOrderId,
    workbench.selectedEvolutionTaskId,
    workbench.selectedFeedbackAgentId,
    workbench.selectedLeadId,
    workbench.selectedOperationsCustomerId,
    workbench.selectedOpportunityId,
    workbench.selectedReleasePushId,
    workbench.setSelectedDeliveryOrderId,
    workbench.setSelectedEvolutionTaskId,
    workbench.setSelectedFeedbackAgentId,
    workbench.setSelectedLeadId,
    workbench.setSelectedOperationsCustomerId,
    workbench.setSelectedOpportunityId,
    workbench.setSelectedReleasePushId,
    workbench.setWorkbenchFilterOwnerId,
    workbench.setWorkbenchFilterSceneName,
    workbench.setWorkbenchFilterSearchKeyword,
    workbench.setWorkbenchFilterStatusLabel,
    workbench.statusOptions,
    workbench.teamMembers,
    workbench.updateOperationsAlertStatus,
    workbench.updateDeliveryBlockerStatus,
    workbench.updateDeliveryOrder,
    workbench.updateDeliveryStep,
    workbench.updateLeadStatus,
    workbench.updateOpportunityFollowUp,
    workbench.updateOpportunityStage,
    workbench.assignOperationsAlert,
    workbench.addDeliveryBlocker,
    workbench.recordOperationsAlertResolution,
    workbench.startEvolutionTask,
    workbench.pauseEvolutionTask,
    workbench.retryEvolutionTask,
    workbench.terminateEvolutionTask,
    workbench.submitEvolutionTaskReview,
    workbench.reviewEvolutionTask,
    workbench.updateReleasePush,
    workbench.startReleasePush,
    workbench.pauseReleasePush,
    workbench.completeReleasePush,
    workbench.rollbackReleasePush,
    workbench.todoItems,
    workbench.workbenchFilters,
    handleOpenDeliveryFromOperations,
    handleOpenFeedbackFromOperations,
    handleTriggerEvolution,
    handleCreateReleaseFromEvolutionTask,
    handleConvertOpportunityToDelivery,
    handleConvertLeadToOpportunity,
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
