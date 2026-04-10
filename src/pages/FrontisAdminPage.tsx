import { useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import {
  ArrowLeftOutlined,
  CloudServerOutlined,
  ControlOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, message } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import {
  INITIAL_DIALOGUE_SESSIONS,
  INITIAL_EMPLOYEES,
  INITIAL_FRONTIS_WEB_USERS,
  INITIAL_ORGANIZATION_DEPARTMENTS,
  INITIAL_WORKSPACES,
} from "@/mocks/mockData";

import { BossDashboardView } from "./components/BossDashboardView";
import { DeviceManagementView } from "./components/DeviceManagementView";
import { AgentStoreView } from "./components/agentStore/AgentStoreView";
import type { ExpertDeploymentState } from "./components/agentStore/types";
import {
  buildInitialExpertDeploymentByEmployeeId,
  doesExpertRequireDeviceBinding,
  hasUserAccessToExpert,
} from "./components/agentStore/utils";
import { ModelConfigurationView } from "./components/ModelConfigurationView";
import { OrganizationManagementView } from "./components/OrganizationManagementView";
import type {
  AccessScopeSubject,
  EmployeeItem,
  FrontisUserRole,
  FrontisUserStatus,
  FrontisWebTabItem,
  FrontisWebTabKey,
  FrontisWebUserItem,
  OrganizationDepartmentItem,
  WorkspaceItem,
} from "./types";
import styles from "./FrontisPage.module.less";

const MANAGEMENT_USER_ROLES = new Set<FrontisUserRole>(["enterpriseAdmin"]);
const INITIAL_DEVICE_OWNERS: Record<string, string | null> = {
  "workspace-cloud": null,
  "workspace-local": null,
  "workspace-cloud-gz": "user-admin-002",
  "workspace-local-bj": "user-admin-001",
  "workspace-local-sh": "user-member-001",
  "workspace-edge-hz": "user-admin-001",
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
    label: "组织管理",
    icon: <TeamOutlined />,
    roles: ["admin"],
  },
];

const FRONTIS_ADMIN_TAB_KEYS = new Set<FrontisWebTabKey>(
  FRONTIS_ADMIN_TABS.map(item => item.key),
);

const resolveFrontisAdminTabKey = (tabKey: string | null): FrontisWebTabKey =>
  tabKey && FRONTIS_ADMIN_TAB_KEYS.has(tabKey as FrontisWebTabKey)
    ? (tabKey as FrontisWebTabKey)
    : "dashboard";

/**
 * 老板后台管理页面。
 */
const FrontisAdminPage = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout, session } = useMockAuth();
  const [activeTabKey, setActiveTabKey] = useState<FrontisWebTabKey>(() =>
    resolveFrontisAdminTabKey(searchParams.get("tab")),
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
  const [users, setUsers] = useState<FrontisWebUserItem[]>(INITIAL_FRONTIS_WEB_USERS);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(INITIAL_WORKSPACES);
  const [deploymentByEmployeeId, setDeploymentByEmployeeId] = useState<Record<string, ExpertDeploymentState>>(
    () => buildInitialExpertDeploymentByEmployeeId(INITIAL_EMPLOYEES),
  );
  const [deviceOwners, setDeviceOwners] = useState<Record<string, string | null>>(INITIAL_DEVICE_OWNERS);
  const [departments, setDepartments] = useState<OrganizationDepartmentItem[]>(INITIAL_ORGANIZATION_DEPARTMENTS);
  const dialogueSessions = INITIAL_DIALOGUE_SESSIONS;

  const effectiveUsers = useMemo(
    () =>
      users.map(user => ({
        ...user,
        assignedAgentIds: employees
          .filter(employee =>
            hasUserAccessToExpert(
              user,
              employee,
              deploymentByEmployeeId[employee.id],
              deviceOwners,
              users,
              INITIAL_ORGANIZATION_DEPARTMENTS,
            ),
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

  useEffect(() => {
    const nextTabKey = resolveFrontisAdminTabKey(searchParams.get("tab"));

    if (nextTabKey !== activeTabKey) {
      setActiveTabKey(nextTabKey);
    }
  }, [activeTabKey, searchParams]);

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
                accessScopeSubjects: doesExpertRequireDeviceBinding(employee)
                  ? []
                  : [...employee.accessScopeSubjects],
                visibility: doesExpertRequireDeviceBinding(employee)
                  ? "bound"
                  : employee.visibility,
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
      accessScopeSubjects: AccessScopeSubject[],
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
                  accessScopeSubjects,
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
                accessScopeSubjects,
                visibility,
              },
            },
            assignedWorkspaceIds: currentState.assignedWorkspaceIds.includes(workspaceId)
              ? currentState.assignedWorkspaceIds
              : [...currentState.assignedWorkspaceIds, workspaceId],
          },
        };
      });
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
                  updates.role !== "enterpriseAdmin"
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

  const handleAddDepartment = useCallback((dept: OrganizationDepartmentItem): void => {
    setDepartments(prev => [...prev, dept]);
  }, []);

  const handleUpdateDepartment = useCallback(
    (deptId: string, updates: Partial<Pick<OrganizationDepartmentItem, "name">>): void => {
      setDepartments(prev =>
        prev.map(item => (item.id === deptId ? { ...item, ...updates } : item)),
      );
    },
    [],
  );

  const handleRemoveDepartment = useCallback((deptId: string): void => {
    setDepartments(prev => prev.filter(item => item.id !== deptId));
  }, []);

  const handleSetDepartmentLeader = useCallback(
    (deptId: string, userId: string | undefined): void => {
      setDepartments(prev =>
        prev.map(item => (item.id === deptId ? { ...item, leaderUserId: userId } : item)),
      );
    },
    [],
  );

  const handleUpdateUserDepartment = useCallback(
    (userId: string, departmentId: string): void => {
      setUsers(prev =>
        prev.map(item => (item.id === userId ? { ...item, departmentId } : item)),
      );
    },
    [],
  );

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

  const handleAddWorkspace = useCallback((workspace: WorkspaceItem, ownerId: string | null): void => {
    setWorkspaces(prev => {
      if (prev.some(item => item.id === workspace.id)) {
        return prev;
      }

      return [...prev, workspace];
    });

    setDeviceOwners(prev => ({
      ...prev,
      [workspace.id]: ownerId,
    }));

    setUsers(prev =>
      prev.map(item => {
        const nextWorkspaceIds = new Set(item.assignedWorkspaceIds ?? []);
        nextWorkspaceIds.delete(workspace.id);

        if (item.id === ownerId) {
          nextWorkspaceIds.add(workspace.id);
        }

        return {
          ...item,
          assignedWorkspaceIds: Array.from(nextWorkspaceIds),
        };
      }),
    );
  }, []);

  const handleRemoveWorkspace = useCallback((workspaceId: string): void => {
    setWorkspaces(prev => prev.filter(item => item.id !== workspaceId));

    setDeviceOwners(prev => {
      const nextOwners = { ...prev };
      delete nextOwners[workspaceId];
      return nextOwners;
    });

    setUsers(prev =>
      prev.map(item => ({
        ...item,
        assignedWorkspaceIds: (item.assignedWorkspaceIds ?? []).filter(id => id !== workspaceId),
      })),
    );

    setDeploymentByEmployeeId(prev =>
      Object.fromEntries(
        Object.entries(prev).map(([employeeId, deploymentState]) => {
          const nextAccessByWorkspaceId = { ...deploymentState.accessByWorkspaceId };
          delete nextAccessByWorkspaceId[workspaceId];

          return [
            employeeId,
            {
              ...deploymentState,
              accessByWorkspaceId: nextAccessByWorkspaceId,
              assignedWorkspaceIds: deploymentState.assignedWorkspaceIds.filter(
                assignedWorkspaceId => assignedWorkspaceId !== workspaceId,
              ),
            },
          ];
        }),
      ),
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
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", tabKey);
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams],
  );

  const handleBackToWorkspace = useCallback((): void => {
    navigate("/web/admin/workspace");
  }, [navigate]);

  const handleBackToEmployeeWorkspace = useCallback((): void => {
    navigate("/web/employee");
  }, [navigate]);

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
          organizationDepartments={INITIAL_ORGANIZATION_DEPARTMENTS}
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
          organizationDepartments={INITIAL_ORGANIZATION_DEPARTMENTS}
          onAddWorkspace={handleAddWorkspace}
          onAssignDeviceOwner={handleAssignDeviceOwner}
          onRemoveWorkspace={handleRemoveWorkspace}
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
          departments={departments}
          employees={employees}
          onAddDepartment={handleAddDepartment}
          onAddUsers={handleAddUsers}
          onRemoveDepartment={handleRemoveDepartment}
          onRemoveUser={handleRemoveUser}
          onSetDepartmentLeader={handleSetDepartmentLeader}
          onUpdateDepartment={handleUpdateDepartment}
          onUpdateUser={handleUpdateUser}
          onUpdateUserDepartment={handleUpdateUserDepartment}
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
      <div className={styles.adminBody}>
        <aside
          className={classNames(styles.adminSidebar, {
            [styles.adminSidebarCollapsed]: isSidebarCollapsed,
          })}
        >
          <div className={styles.adminSidebarTop}>
            <div
              className={classNames(styles.adminSidebarBrandRow, {
                [styles.adminSidebarBrandRowCollapsed]: isSidebarCollapsed,
              })}
            >
              <div
                className={classNames(styles.brandCard, {
                  [styles.brandCardCollapsed]: isSidebarCollapsed,
                })}
              >
                <span className={styles.brandLogo}>F</span>
                {isSidebarCollapsed ? null : (
                  <div className={styles.brandCopy}>
                    <div className={styles.brandTitle}>Frontis AI</div>
                    <div className={styles.brandSubtitle}>管理后台</div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.sidebarToggle}
                aria-label={isSidebarCollapsed ? "展开左侧菜单" : "收起左侧菜单"}
                onClick={() => setIsSidebarCollapsed(current => !current)}
              >
                {isSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>
            </div>

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

          <div
            className={classNames(styles.adminSidebarFooter, {
              [styles.adminSidebarFooterCollapsed]: isSidebarCollapsed,
            })}
          >
            <Dropdown
              menu={{ items: accountMenuItems }}
              placement={isSidebarCollapsed ? "topRight" : "topLeft"}
              trigger={["click"]}
            >
              <button
                type="button"
                className={classNames(styles.accountTrigger, {
                  [styles.accountTriggerExpanded]: !isSidebarCollapsed,
                })}
                aria-label="打开账户菜单"
              >
                <Avatar className={styles.accountAvatar} size={36}>
                  {currentUser ? currentUser.name.slice(0, 1) : "U"}
                </Avatar>
                {isSidebarCollapsed ? null : (
                  <span className={styles.accountBody}>
                    <span className={styles.accountName}>{currentUser?.name ?? "未登录"}</span>
                    <span className={styles.accountMeta}>当前登录账号</span>
                  </span>
                )}
              </button>
            </Dropdown>
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
