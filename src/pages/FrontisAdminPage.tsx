import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  CloudServerOutlined,
  ControlOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, message } from "antd";
import { useNavigate } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import {
  INITIAL_DIALOGUE_SESSIONS,
  INITIAL_EMPLOYEES,
  INITIAL_FRONTIS_WEB_USERS,
  INITIAL_WORKSPACES,
} from "@/mocks/mockData";

import { BossDashboardView } from "./components/BossDashboardView";
import { AdminNotificationPopover } from "./components/AdminNotificationPopover";
import { DeviceManagementView } from "./components/DeviceManagementView";
import { OrganizationManagementView } from "./components/OrganizationManagementView";
import { AgentStoreView } from "./components/agentStore/AgentStoreView";
import type { ExpertDeploymentState } from "./components/agentStore/types";
import {
  buildInitialExpertDeploymentByEmployeeId,
  doesExpertRequireDeviceBinding,
  hasUserAccessToExpert,
} from "./components/agentStore/utils";
import { ModelConfigurationView } from "./components/ModelConfigurationView";
import type {
  EmployeeItem,
  FrontisUserRole,
  FrontisUserStatus,
  FrontisWebTabItem,
  FrontisWebTabKey,
  FrontisWebUserItem,
} from "./types";
import styles from "./FrontisPage.module.less";

const MANAGEMENT_USER_ROLES = new Set<FrontisUserRole>(["boss", "admin"]);
const INITIAL_DEVICE_OWNERS: Record<string, string | null> = {
  "workspace-cloud": null,
  "workspace-local": null,
  "workspace-local-bj": "user-admin-001",
  "workspace-local-sh": "user-member-001",
};

const FRONTIS_ADMIN_TABS: FrontisWebTabItem[] = [
  {
    key: "dashboard",
    label: "驾驶舱",
    icon: <DashboardOutlined />,
    roles: ["admin"],
  },
  {
    key: "store",
    label: "我的AI专家团",
    icon: <RobotOutlined />,
    roles: ["admin"],
  },
  {
    key: "devices",
    label: "设备管理",
    icon: <CloudServerOutlined />,
    roles: ["admin"],
  },
  {
    key: "models",
    label: "模型配置",
    icon: <ControlOutlined />,
    roles: ["admin"],
  },
  {
    key: "organization",
    label: "人员管理",
    icon: <ApartmentOutlined />,
    roles: ["admin"],
  },
];

interface FrontisAdminPageProps {
  workspacePath?: string;
}

/**
 * 老板后台管理页面。
 */
const FrontisAdminPage = ({
  workspacePath = "/web/admin/workspace",
}: FrontisAdminPageProps): JSX.Element => {
  const navigate = useNavigate();
  const { logout, session } = useMockAuth();
  const [activeTabKey, setActiveTabKey] = useState<FrontisWebTabKey>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
  const [users, setUsers] = useState<FrontisWebUserItem[]>(INITIAL_FRONTIS_WEB_USERS);
  const [deploymentByEmployeeId, setDeploymentByEmployeeId] = useState<Record<string, ExpertDeploymentState>>(
    () => buildInitialExpertDeploymentByEmployeeId(INITIAL_EMPLOYEES),
  );
  const [deviceOwners, setDeviceOwners] = useState<Record<string, string | null>>(INITIAL_DEVICE_OWNERS);
  const dialogueSessions = INITIAL_DIALOGUE_SESSIONS;
  const workspaces = INITIAL_WORKSPACES;

  const effectiveUsers = useMemo(
    () =>
      users.map(user => ({
        ...user,
        assignedAgentIds: employees
          .filter(employee =>
            hasUserAccessToExpert(user, employee, deploymentByEmployeeId[employee.id], deviceOwners),
          )
          .map(employee => employee.id),
      })),
    [deploymentByEmployeeId, deviceOwners, employees, users],
  );

  const currentUser = useMemo(
    () =>
      effectiveUsers.find(item => item.id === session?.userId) ??
      effectiveUsers.find(item => MANAGEMENT_USER_ROLES.has(item.role) && item.status === "active") ??
      effectiveUsers.find(item => MANAGEMENT_USER_ROLES.has(item.role)) ??
      null,
    [effectiveUsers, session?.userId],
  );

  const handleAttachEmployeeToDevice = useCallback(
    (employeeId: string, workspaceId: string): void => {
      setDeploymentByEmployeeId(prev => {
        const currentState = prev[employeeId] ?? {
          accessByWorkspaceId: {},
          assignedWorkspaceIds: [],
        };
        const employee = employees.find(item => item.id === employeeId);

        if (!employee || currentState.assignedWorkspaceIds.includes(workspaceId)) {
          return prev;
        }

        return {
          ...prev,
          [employeeId]: {
            accessByWorkspaceId: {
              ...currentState.accessByWorkspaceId,
              [workspaceId]: {
                boundMembers: [...employee.boundMembers],
                visibility: employee.visibility,
              },
            },
            assignedWorkspaceIds: [...currentState.assignedWorkspaceIds, workspaceId],
          },
        };
      });
    },
    [employees],
  );

  const handleDetachEmployeeFromDevice = useCallback((employeeId: string, workspaceId: string): void => {
    setDeploymentByEmployeeId(prev => {
      const currentState = prev[employeeId];
      if (!currentState) {
        return prev;
      }

      const nextAccessByWorkspaceId = { ...currentState.accessByWorkspaceId };
      delete nextAccessByWorkspaceId[workspaceId];

      return {
        ...prev,
        [employeeId]: {
          accessByWorkspaceId: nextAccessByWorkspaceId,
          assignedWorkspaceIds: currentState.assignedWorkspaceIds.filter(id => id !== workspaceId),
        },
      };
    });
  }, []);

  const handleUpdateEmployeeDeviceAccess = useCallback(
    (
      employeeId: string,
      workspaceId: string,
      visibility: EmployeeItem["visibility"],
      boundMembers: string[],
    ): void => {
      const employee = employees.find(item => item.id === employeeId);

      if (!employee) {
        return;
      }

      if (!doesExpertRequireDeviceBinding(employee)) {
        setEmployees(prev =>
          prev.map(item =>
            item.id === employeeId
              ? {
                  ...item,
                  boundMembers,
                  visibility,
                }
              : item,
          ),
        );
        return;
      }

      setDeploymentByEmployeeId(prev => {
        const currentState = prev[employeeId] ?? {
          accessByWorkspaceId: {},
          assignedWorkspaceIds: [],
        };

        return {
          ...prev,
          [employeeId]: {
            accessByWorkspaceId: {
              ...currentState.accessByWorkspaceId,
              [workspaceId]: {
                boundMembers,
                visibility,
              },
            },
            assignedWorkspaceIds: currentState.assignedWorkspaceIds.includes(workspaceId)
              ? currentState.assignedWorkspaceIds
              : [...currentState.assignedWorkspaceIds, workspaceId],
          },
        };
      });

      setEmployees(prev =>
        prev.map(item =>
          item.id === employeeId
            ? {
                ...item,
                boundMembers,
                visibility,
                workspaceId: workspaceId || item.workspaceId,
              }
            : item,
        ),
      );
    },
    [employees],
  );

  const handleUpdateEmployeeModel = useCallback((employeeId: string, model: string): void => {
    setEmployees(prev =>
      prev.map(item =>
        item.id === employeeId
          ? {
              ...item,
              model,
            }
          : item,
      ),
    );
  }, []);

  const handleApplyGlobalModel = useCallback((model: string): void => {
    setEmployees(prev => prev.map(item => ({ ...item, model })));
  }, []);

  const handleAddUsers = useCallback((nextUsers: FrontisWebUserItem[]): void => {
    setUsers(prev => {
      const existingIds = new Set(prev.map(item => item.id));
      const deduplicatedUsers = nextUsers.filter(item => !existingIds.has(item.id));
      return [...prev, ...deduplicatedUsers];
    });
  }, []);

  const handleUpdateUser = useCallback(
    (
      userId: string,
      updates: Pick<FrontisWebUserItem, "name" | "phone" | "role">,
    ): void => {
      setUsers(prev =>
        prev.map(item =>
          item.id === userId
            ? {
                ...item,
                assignedAgentIds:
                  updates.role === "member"
                    ? item.assignedAgentIds
                    : employees.map(employee => employee.id),
                name: updates.name,
                phone: updates.phone,
                role: updates.role,
              }
            : item,
        ),
      );
    },
    [employees],
  );

  const handleUpdateUserStatus = useCallback((userId: string, status: FrontisUserStatus): void => {
    setUsers(prev =>
      prev.map(item =>
        item.id === userId
          ? {
              ...item,
              status,
            }
          : item,
      ),
    );
  }, []);

  const handleRemoveUser = useCallback((userId: string): void => {
    setUsers(prev => prev.filter(item => item.id !== userId));
  }, []);

  const handleAssignDeviceOwner = useCallback((deviceId: string, ownerId: string | null): void => {
    setDeviceOwners(prev => ({
      ...prev,
      [deviceId]: ownerId,
    }));

    setUsers(prev =>
      prev.map(item => {
        const nextWorkspaceIds = new Set(item.assignedWorkspaceIds ?? []);
        nextWorkspaceIds.delete(deviceId);

        if (item.id === ownerId) {
          nextWorkspaceIds.add(deviceId);
        }

        return {
          ...item,
          assignedWorkspaceIds: Array.from(nextWorkspaceIds),
        };
      }),
    );
  }, []);

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

  const handleSelectTab = useCallback(
    (tabKey: FrontisWebTabKey): void => {
      setActiveTabKey(tabKey);
    },
    [],
  );

  const handleBackToWorkspace = useCallback((): void => {
    navigate(workspacePath);
  }, [navigate, workspacePath]);

  const handleBackToEmployeeWorkspace = useCallback((): void => {
    navigate(workspacePath.includes("/v2/") ? "/web/employee/v2" : "/web/employee");
  }, [navigate, workspacePath]);

  const hasManagementAccess = currentUser ? MANAGEMENT_USER_ROLES.has(currentUser.role) : true;

  const renderContent = (): JSX.Element => {
    if (activeTabKey === "dashboard") {
      return (
        <BossDashboardView
          currentUserName={currentUser?.name}
          dialogueSessions={dialogueSessions}
          employees={employees}
          onNavigateToTab={handleSelectTab}
          users={effectiveUsers}
          workspaces={workspaces}
        />
      );
    }

    if (activeTabKey === "store") {
      return (
        <AgentStoreView
          deploymentByEmployeeId={deploymentByEmployeeId}
          deviceOwners={deviceOwners}
          employees={employees}
          memberNames={effectiveUsers.filter(item => item.status === "active").map(item => item.name)}
          onAttachEmployeeToDevice={handleAttachEmployeeToDevice}
          onDetachEmployeeFromDevice={handleDetachEmployeeFromDevice}
          onNavigateToTab={handleSelectTab}
          onUpdateEmployeeDeviceAccess={handleUpdateEmployeeDeviceAccess}
          onUpdateEmployeeModel={handleUpdateEmployeeModel}
          users={effectiveUsers}
          workspaces={workspaces}
        />
      );
    }

    if (activeTabKey === "devices") {
      return (
        <DeviceManagementView
          deploymentByEmployeeId={deploymentByEmployeeId}
          deviceOwners={deviceOwners}
          employees={employees}
          onAssignDeviceOwner={handleAssignDeviceOwner}
          users={effectiveUsers}
          workspaces={workspaces}
        />
      );
    }

    if (activeTabKey === "models") {
      return (
        <ModelConfigurationView
          employees={employees}
          onApplyGlobalModel={handleApplyGlobalModel}
          onUpdateEmployeeModel={handleUpdateEmployeeModel}
        />
      );
    }

    if (activeTabKey === "organization") {
      return (
        <OrganizationManagementView
          employees={employees}
          onAddUsers={handleAddUsers}
          onRemoveUser={handleRemoveUser}
          onUpdateUser={handleUpdateUser}
          onUpdateUserStatus={handleUpdateUserStatus}
          users={effectiveUsers}
        />
      );
    }

    return (
      <BossDashboardView
        currentUserName={currentUser?.name}
        dialogueSessions={dialogueSessions}
        employees={employees}
        onNavigateToTab={handleSelectTab}
        users={effectiveUsers}
        workspaces={workspaces}
      />
    );
  };

  return (
    <div className={styles.adminPage}>
      <header className={classNames(styles.header, styles.adminHeader)}>
        <div className={styles.headerLeft}>
          <div className={styles.employeeHeaderBrand}>
            <span className={styles.employeeHeaderLogoPlaceholder}>F</span>
            <span className={styles.employeeHeaderBrandName}>Frontis AI</span>
            <button
              type="button"
              className={styles.employeeHeaderSidebarToggle}
              aria-label={isSidebarCollapsed ? "展开左侧菜单" : "收起左侧菜单"}
              onClick={() => setIsSidebarCollapsed(current => !current)}
            >
              {isSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>
        </div>
        <div className={styles.headerRight}>
          <AdminNotificationPopover onNavigateToTab={handleSelectTab} />
          <Dropdown menu={{ items: accountMenuItems }} placement="bottomRight" trigger={["click"]}>
            <button type="button" className={styles.headerAccountTrigger}>
              <Avatar className={styles.accountAvatar} size={40}>
                {currentUser ? currentUser.name.slice(0, 1) : "U"}
              </Avatar>
              <span className={styles.headerAccountName}>{currentUser?.name ?? "未登录"}</span>
            </button>
          </Dropdown>
        </div>
      </header>

      <div className={styles.adminBody}>
        <aside
          className={classNames(styles.adminSidebar, {
            [styles.adminSidebarCollapsed]: isSidebarCollapsed,
          })}
        >
          <div className={styles.adminSidebarTop}>
            <button
              type="button"
              className={classNames(styles.adminBackButton, {
                [styles.adminBackButtonCollapsed]: isSidebarCollapsed,
              })}
              onClick={handleBackToWorkspace}
            >
              <span className={styles.adminBackIcon}>
                <ArrowLeftOutlined />
              </span>
              <span className={styles.adminBackLabel}>返回工作台</span>
            </button>
          </div>

          <div
            className={classNames(styles.adminSidebarSection, {
              [styles.adminSidebarSectionCollapsed]: isSidebarCollapsed,
            })}
          >
            {FRONTIS_ADMIN_TABS.map(item => (
              <button
                key={item.key}
                type="button"
                className={classNames(styles.adminNavButton, {
                  [styles.adminNavButtonActive]: item.key === activeTabKey,
                  [styles.adminNavButtonCollapsed]: isSidebarCollapsed,
                })}
                onClick={() => handleSelectTab(item.key)}
              >
                <span className={styles.tabIcon}>{item.icon}</span>
                <span className={styles.tabLabel}>{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className={styles.adminMain}>
          <div className={classNames(styles.mainPanel, styles.adminMainPanel)}>
            <div className={classNames(styles.content, styles.featureContent, styles.adminFeatureContent)}>
              {hasManagementAccess ? (
                renderContent()
              ) : (
                <div className={styles.emptyPanel}>
                  <h2 className={styles.emptyPanelTitle}>当前账号无管理后台权限</h2>
                  <p className={styles.emptyPanelDescription}>
                    普通员工只能使用对话工作台。请使用企业老板或企业管理员账号进入管理后台。
                  </p>
                  <button type="button" className={styles.emptyPanelAction} onClick={handleBackToEmployeeWorkspace}>
                    返回对话工作台
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FrontisAdminPage;
