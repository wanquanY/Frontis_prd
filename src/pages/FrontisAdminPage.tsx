import { useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import {
  ArrowLeftOutlined,
  ControlOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReadOutlined,
  RobotOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, message } from "antd";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { getLoginPath, getSystemEntries, getTenantEntries } from "@/feature/auth/mockAccounts";
import { inviteMockTenantMemberAccount, updateMockTenantUsers } from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type {
  MockAuthSystemEntry,
  MockTenantDeploymentMode,
  MockTenantInviteMemberParams,
  MockTenantManagementSnapshot,
} from "@/feature/auth/types";
import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import { MANAGEMENT_CONSOLE_LABEL, PRODUCT_LOGO_TEXT, PRODUCT_NAME } from "@/constants/brand";
import {
  INITIAL_EMPLOYEES,
  INITIAL_ORGANIZATION_DEPARTMENTS,
  INITIAL_WORKSPACES,
} from "@/mocks/mockData";

import { DeviceManagementView } from "./components/DeviceManagementView";
import { AccountDropdownPanel } from "./components/AccountDropdownPanel";
import { AgentStoreView } from "./components/agentStore/AgentStoreView";
import type { ExpertDeploymentState } from "./components/agentStore/types";
import {
  buildInitialExpertDeploymentByEmployeeId,
  doesExpertRequireDeviceBinding,
  hasUserAccessToExpert,
} from "./components/agentStore/utils";
import { ModelConfigurationView } from "./components/ModelConfigurationView";
import { OrganizationManagementView } from "./components/OrganizationManagementView";
import { RoleManagementView } from "./components/RoleManagementView";
import { TenantOverviewView } from "./components/TenantOverviewView";
import { TenantPointsView } from "./components/TenantPointsView";
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
const USER_MANUAL_ROUTE_PATH = "/user-manual";

interface FrontisAdminPageProps {
  deploymentMode: MockTenantDeploymentMode;
}

const syncRootDepartmentName = (
  departments: OrganizationDepartmentItem[],
  tenantName?: string,
): OrganizationDepartmentItem[] => {
  const nextTenantName = tenantName?.trim();

  if (!nextTenantName) {
    return departments;
  }

  let hasUpdatedRoot = false;

  return departments.map(department => {
    if (hasUpdatedRoot || department.parentId !== null) {
      return department;
    }

    hasUpdatedRoot = true;

    if (department.name === nextTenantName) {
      return department;
    }

    return {
      ...department,
      name: nextTenantName,
    };
  });
};

const FRONTIS_ADMIN_TABS: FrontisWebTabItem[] = [
  {
    key: "overview",
    label: "驾驶舱",
    icon: <AppstoreOutlined />,
    roles: ["admin"],
  },
  {
    key: "points",
    label: "积分管理",
    icon: <ControlOutlined />,
    roles: ["admin"],
  },
  {
    key: "store",
    label: "AI专家管理",
    icon: <RobotOutlined />,
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
  {
    key: "roleManagement",
    label: "角色管理",
    icon: <SafetyCertificateOutlined />,
    roles: ["admin"],
  },
];

const FRONTIS_ADMIN_TAB_KEYS = new Set<FrontisWebTabKey>(FRONTIS_ADMIN_TABS.map(item => item.key));
const PERSONAL_HIDDEN_ADMIN_TAB_KEYS = new Set<FrontisWebTabKey>([
  "overview",
  "models",
  "organization",
  "roleManagement",
]);

const getDefaultAdminTabKey = (
  edition: MockTenantManagementSnapshot["edition"] | undefined,
  deploymentMode: MockTenantDeploymentMode,
): FrontisWebTabKey => {
  if (edition === "personal") {
    return deploymentMode === "publicCloud" ? "points" : "store";
  }

  return "overview";
};

const resolveFrontisAdminTabKey = (
  tabKey: string | null,
  edition?: MockTenantManagementSnapshot["edition"],
  deploymentMode: MockTenantDeploymentMode = "publicCloud",
): FrontisWebTabKey => {
  const normalizedTabKey = tabKey === "access" ? "organization" : tabKey;
  const defaultTabKey = getDefaultAdminTabKey(edition, deploymentMode);

  if (!normalizedTabKey || !FRONTIS_ADMIN_TAB_KEYS.has(normalizedTabKey as FrontisWebTabKey)) {
    return defaultTabKey;
  }

  const nextTabKey = normalizedTabKey as FrontisWebTabKey;

  if (deploymentMode === "privateCloud" && nextTabKey === "points") {
    return defaultTabKey;
  }

  if (edition === "personal" && PERSONAL_HIDDEN_ADMIN_TAB_KEYS.has(nextTabKey)) {
    return defaultTabKey;
  }

  return nextTabKey;
};

/**
 * 老板后台管理页面。
 */
const FrontisAdminPage = ({ deploymentMode }: FrontisAdminPageProps): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activateIdentity, activateTenant, activeIdentity, logout, session } = useMockAuth();
  const { loginByAccountId: loginOperationsByAccountId } = useOperationsAuth();
  const initialTenantSnapshot = useMemo<MockTenantManagementSnapshot | null>(
    () => getMockTenantManagementSnapshot(activeIdentity?.tenantId),
    [activeIdentity?.tenantId],
  );
  const [activeTabKey, setActiveTabKey] = useState<FrontisWebTabKey>(() =>
    resolveFrontisAdminTabKey(
      searchParams.get("tab"),
      initialTenantSnapshot?.edition,
      deploymentMode,
    ),
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
  const [tenantSnapshot, setTenantSnapshot] = useState<MockTenantManagementSnapshot | null>(
    initialTenantSnapshot,
  );
  const [users, setUsers] = useState<FrontisWebUserItem[]>(initialTenantSnapshot?.users ?? []);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(INITIAL_WORKSPACES);
  const [deploymentByEmployeeId, setDeploymentByEmployeeId] = useState<
    Record<string, ExpertDeploymentState>
  >(() => buildInitialExpertDeploymentByEmployeeId(INITIAL_EMPLOYEES));
  const [deviceOwners, setDeviceOwners] =
    useState<Record<string, string | null>>(INITIAL_DEVICE_OWNERS);
  const [departments, setDepartments] = useState<OrganizationDepartmentItem[]>(() =>
    syncRootDepartmentName(INITIAL_ORGANIZATION_DEPARTMENTS, activeIdentity?.tenantName),
  );
  useEffect(() => {
    setDepartments(currentDepartments =>
      syncRootDepartmentName(currentDepartments, activeIdentity?.tenantName),
    );
  }, [activeIdentity?.tenantName]);

  useEffect(() => {
    const nextSnapshot = getMockTenantManagementSnapshot(activeIdentity?.tenantId);

    if (!nextSnapshot) {
      return;
    }

    setTenantSnapshot(nextSnapshot);
    setUsers(nextSnapshot.users);
  }, [activeIdentity?.tenantId]);

  const visibleAdminTabs = useMemo<FrontisWebTabItem[]>(
    () =>
      FRONTIS_ADMIN_TABS.filter(item =>
        item.key === "points"
          ? deploymentMode === "publicCloud"
          : tenantSnapshot?.edition === "personal" && PERSONAL_HIDDEN_ADMIN_TAB_KEYS.has(item.key)
            ? false
            : true,
      ),
    [deploymentMode, tenantSnapshot?.edition],
  );

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
              departments,
            ),
          )
          .map(employee => employee.id),
      })),
    [deploymentByEmployeeId, departments, deviceOwners, employees, users],
  );

  const syncUsersToTenant = useCallback(
    (nextUsers: FrontisWebUserItem[]): void => {
      if (!activeIdentity?.tenantId) {
        return;
      }

      const nextSnapshot = updateMockTenantUsers(activeIdentity.tenantId, nextUsers);

      if (!nextSnapshot) {
        return;
      }

      setTenantSnapshot(nextSnapshot);
    },
    [activeIdentity?.tenantId],
  );

  const currentUser = useMemo(
    () =>
      effectiveUsers.find(item => item.id === session?.userId) ??
      effectiveUsers.find(
        item => MANAGEMENT_USER_ROLES.has(item.role) && item.status === "active",
      ) ??
      effectiveUsers.find(item => MANAGEMENT_USER_ROLES.has(item.role)) ??
      null,
    [effectiveUsers, session?.userId],
  );
  useEffect(() => {
    const nextTabKey = resolveFrontisAdminTabKey(
      searchParams.get("tab"),
      tenantSnapshot?.edition,
      deploymentMode,
    );

    if (nextTabKey !== activeTabKey) {
      setActiveTabKey(nextTabKey);
    }
  }, [activeTabKey, deploymentMode, searchParams, tenantSnapshot?.edition]);

  useEffect(() => {
    if (!tenantSnapshot) {
      return;
    }

    if (visibleAdminTabs.some(item => item.key === activeTabKey)) {
      return;
    }

    const nextTabKey = getDefaultAdminTabKey(tenantSnapshot.edition, deploymentMode);
    setActiveTabKey(nextTabKey);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", nextTabKey);
    setSearchParams(nextParams);
  }, [
    activeTabKey,
    deploymentMode,
    searchParams,
    setSearchParams,
    tenantSnapshot,
    visibleAdminTabs,
  ]);

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

  const handleDetachEmployeeFromDevice = useCallback(
    (employeeId: string, workspaceId: string): void => {
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
            assignedWorkspaceIds: currentState.assignedWorkspaceIds.filter(
              id => id !== workspaceId,
            ),
          },
        };
      });
    },
    [],
  );

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

  const handleUpdateEmployeeLaborCosts = useCallback(
    (
      employeeId: string,
      costs: {
        industryStandardCost: number;
        myLaborCost: number;
      },
    ): void => {
      setEmployees(prev =>
        prev.map(item =>
          item.id === employeeId
            ? {
                ...item,
                industryStandardCost: costs.industryStandardCost,
                myLaborCost: costs.myLaborCost,
              }
            : item,
        ),
      );
    },
    [],
  );

  const handleApplyGlobalModel = useCallback((model: string): void => {
    setEmployees(prev => prev.map(item => ({ ...item, model })));
  }, []);

  const handleUpdateUser = useCallback(
    (userId: string, updates: Pick<FrontisWebUserItem, "name" | "phone" | "role">): void => {
      setUsers(prev => {
        const nextUsers = prev.map(item =>
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
        );

        syncUsersToTenant(nextUsers);

        return nextUsers;
      });
    },
    [employees, syncUsersToTenant],
  );

  const handleUpdateUserStatus = useCallback(
    (userId: string, status: FrontisUserStatus): void => {
      setUsers(prev => {
        const nextUsers = prev.map(item =>
          item.id === userId
            ? {
                ...item,
                status,
              }
            : item,
        );

        syncUsersToTenant(nextUsers);

        return nextUsers;
      });
    },
    [syncUsersToTenant],
  );

  const handleRemoveUser = useCallback(
    (userId: string): void => {
      setUsers(prev => {
        const nextUsers = prev.filter(item => item.id !== userId);

        syncUsersToTenant(nextUsers);

        return nextUsers;
      });
    },
    [syncUsersToTenant],
  );

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
      setUsers(prev => {
        const nextUsers = prev.map(item => (item.id === userId ? { ...item, departmentId } : item));

        syncUsersToTenant(nextUsers);

        return nextUsers;
      });
    },
    [syncUsersToTenant],
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

  const handleAddWorkspace = useCallback(
    (workspace: WorkspaceItem, ownerId: string | null): void => {
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
    },
    [],
  );

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

  const handleInviteTenantMember = useCallback(
    (params: MockTenantInviteMemberParams): boolean => {
      if (!activeIdentity?.tenantId || !tenantSnapshot) {
        return false;
      }

      if (tenantSnapshot.edition !== "team") {
        message.warning("当前租户仍是个人版，请先开通团队版。");
        return false;
      }

      if (tenantSnapshot.usedSeats >= tenantSnapshot.totalSeats) {
        message.warning("当前席位不足，暂无法继续邀请成员。");
        return false;
      }

      const result = inviteMockTenantMemberAccount(activeIdentity.tenantId, params);

      if (!result) {
        message.warning("邀请失败，请确认手机号未注册且当前席位仍有余量。");
        return false;
      }

      setTenantSnapshot(result.snapshot);
      setUsers(result.snapshot.users);
      message.success("成员已加入当前租户，并可直接使用该租户积分。");
      return true;
    },
    [activeIdentity?.tenantId, tenantSnapshot],
  );

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
    (entry: MockAuthSystemEntry): void => {
      if (entry.platform === "operationsAdmin" && entry.operationsAccountId) {
        const identityResult = activateIdentity(entry.identityId, entry.entryPath);

        if (!identityResult.success) {
          message.error(identityResult.message);
          return;
        }

        const result = loginOperationsByAccountId(entry.operationsAccountId, entry.entryPath);

        if (!result.success) {
          message.error(result.message);
          return;
        }

        navigate(result.redirectPath ?? entry.entryPath, { replace: true });
        return;
      }

      const result = activateIdentity(entry.identityId, entry.entryPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      navigate(result.redirectPath ?? entry.entryPath, { replace: true });
    },
    [activateIdentity, loginOperationsByAccountId, navigate],
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
  const handleOpenUserManual = useCallback((): void => {
    setIsAccountMenuOpen(false);
    window.open(USER_MANUAL_ROUTE_PATH, "_blank", "noopener,noreferrer");
  }, []);

  const accountMenuItems: MenuProps["items"] = [
    {
      key: "open-user-manual",
      icon: <ReadOutlined />,
      label: "产品使用指南",
      onClick: handleOpenUserManual,
    },
    {
      type: "divider" as const,
    },
    ...systemEntries.map(entry => ({
      key: `system-entry-${entry.identityId}`,
      icon: <AppstoreOutlined />,
      label: `进入${entry.label}`,
      onClick: () => handleOpenSystemEntry(entry),
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
      icon: <AppstoreOutlined />,
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

  const handleSelectTab = useCallback(
    (tabKey: FrontisWebTabKey): void => {
      const nextTabKey = resolveFrontisAdminTabKey(tabKey, tenantSnapshot?.edition, deploymentMode);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", nextTabKey);
      setActiveTabKey(nextTabKey);
      setSearchParams(nextParams);
    },
    [deploymentMode, searchParams, setSearchParams, tenantSnapshot?.edition],
  );

  const handleBackToWorkspace = useCallback((): void => {
    navigate("/web/admin/workspace");
  }, [navigate]);

  const handleBackToEmployeeWorkspace = useCallback((): void => {
    navigate("/web/employee");
  }, [navigate]);

  const hasManagementAccess = currentUser ? MANAGEMENT_USER_ROLES.has(currentUser.role) : true;

  const renderContent = (): JSX.Element => {
    if (!tenantSnapshot) {
      return (
        <div className={styles.emptyPanel}>
          <h2 className={styles.emptyPanelTitle}>当前租户信息未加载</h2>
          <p className={styles.emptyPanelDescription}>
            请返回工作台后重新进入管理后台，系统会按当前租户加载积分、席位和成员数据。
          </p>
        </div>
      );
    }

    if (activeTabKey === "overview" && tenantSnapshot.edition === "team") {
      return (
        <TenantOverviewView
          deploymentMode={deploymentMode}
          employees={employees}
          tenantSnapshot={tenantSnapshot}
        />
      );
    }

    if (activeTabKey === "points" || activeTabKey === "overview") {
      return <TenantPointsView tenantSnapshot={tenantSnapshot} />;
    }

    if (activeTabKey === "store") {
      return (
        <AgentStoreView
          currentUserName={currentUser?.name}
          deploymentByEmployeeId={deploymentByEmployeeId}
          deviceOwners={deviceOwners}
          employees={employees}
          organizationDepartments={departments}
          onAttachEmployeeToDevice={handleAttachEmployeeToDevice}
          onDetachEmployeeFromDevice={handleDetachEmployeeFromDevice}
          onNavigateToTab={handleSelectTab}
          onUpdateEmployeeDeviceAccess={handleUpdateEmployeeDeviceAccess}
          onUpdateEmployeeLaborCosts={handleUpdateEmployeeLaborCosts}
          onUpdateEmployeeModel={handleUpdateEmployeeModel}
          tenantSnapshot={tenantSnapshot}
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
          organizationDepartments={departments}
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
          deploymentMode={deploymentMode}
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
          onAddDepartment={handleAddDepartment}
          onInviteTenantMember={handleInviteTenantMember}
          onRemoveDepartment={handleRemoveDepartment}
          onRemoveUser={handleRemoveUser}
          onSetDepartmentLeader={handleSetDepartmentLeader}
          onUpdateDepartment={handleUpdateDepartment}
          onUpdateUser={handleUpdateUser}
          onUpdateUserDepartment={handleUpdateUserDepartment}
          onUpdateUserStatus={handleUpdateUserStatus}
          tenantSnapshot={tenantSnapshot}
          users={effectiveUsers}
        />
      );
    }

    if (activeTabKey === "roleManagement") {
      return <RoleManagementView tenantSnapshot={tenantSnapshot} users={effectiveUsers} />;
    }

    return (
      <AgentStoreView
        currentUserName={currentUser?.name}
        deploymentByEmployeeId={deploymentByEmployeeId}
        deviceOwners={deviceOwners}
        employees={employees}
        organizationDepartments={departments}
        onNavigateToTab={handleSelectTab}
        onAttachEmployeeToDevice={handleAttachEmployeeToDevice}
        onDetachEmployeeFromDevice={handleDetachEmployeeFromDevice}
        onUpdateEmployeeDeviceAccess={handleUpdateEmployeeDeviceAccess}
        onUpdateEmployeeLaborCosts={handleUpdateEmployeeLaborCosts}
        onUpdateEmployeeModel={handleUpdateEmployeeModel}
        tenantSnapshot={tenantSnapshot}
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
                <span className={styles.brandLogo}>{PRODUCT_LOGO_TEXT}</span>
                {isSidebarCollapsed ? null : (
                  <div className={styles.brandCopy}>
                    <div className={styles.brandTitle}>{PRODUCT_NAME}</div>
                    <div className={styles.brandSubtitle}>{MANAGEMENT_CONSOLE_LABEL}</div>
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
            {visibleAdminTabs.map(item => {
              const isRoleManagement = item.key === "roleManagement";
              const isOrganizationParentActive =
                item.key === "organization" &&
                (activeTabKey === "organization" || activeTabKey === "roleManagement");

              return (
                <button
                  key={item.key}
                  type="button"
                  className={classNames(styles.adminNavButton, {
                    [styles.adminNavButtonActive]:
                      item.key === activeTabKey || isOrganizationParentActive,
                    [styles.adminNavButtonCollapsed]: isSidebarCollapsed,
                    [styles.adminSubNavButton]: isRoleManagement,
                  })}
                  onClick={() => handleSelectTab(item.key)}
                >
                  <span className={styles.tabIcon}>{item.icon}</span>
                  <span className={styles.tabLabel}>{item.label}</span>
                </button>
              );
            })}
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
              open={isAccountMenuOpen}
              onOpenChange={setIsAccountMenuOpen}
              dropdownRender={menu => (
                <AccountDropdownPanel
                  accountName={currentUser?.name ?? "未登录"}
                  tenantName={activeIdentity?.tenantName}
                  pointsBalance={
                    deploymentMode === "publicCloud" ? tenantSnapshot?.pointsBalance : undefined
                  }
                  menu={menu}
                />
              )}
            >
              <button
                type="button"
                className={classNames(styles.accountTrigger, {
                  [styles.accountTriggerExpanded]: !isSidebarCollapsed,
                })}
                aria-label="打开账户菜单"
              >
                <Avatar className={styles.accountAvatar} size={30}>
                  {currentUser ? currentUser.name.slice(0, 1) : "U"}
                </Avatar>
                {isSidebarCollapsed ? null : (
                  <span className={styles.accountBody}>
                    <span className={styles.accountName}>{currentUser?.name ?? "未登录"}</span>
                  </span>
                )}
              </button>
            </Dropdown>
          </div>
        </aside>

        <main className={styles.adminMain}>
          <div className={classNames(styles.mainPanel, styles.adminMainPanel)}>
            <div
              className={classNames(
                styles.content,
                styles.featureContent,
                styles.adminFeatureContent,
              )}
            >
              {hasManagementAccess ? (
                renderContent()
              ) : (
                <div className={styles.emptyPanel}>
                  <h2 className={styles.emptyPanelTitle}>当前账号无管理后台权限</h2>
                  <p className={styles.emptyPanelDescription}>
                    当前成员只能使用工作台。请使用租户管理员账号进入管理后台。
                  </p>
                  <button
                    type="button"
                    className={styles.emptyPanelAction}
                    onClick={handleBackToEmployeeWorkspace}
                  >
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
