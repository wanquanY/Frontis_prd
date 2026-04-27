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
import {
  activateMockTenantTeamPlan,
  addMockTenantSeats,
  inviteMockTenantMemberAccount,
  rechargeMockTenantPoints,
  updateMockTenantUsers,
} from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type {
  MockTenantInviteMemberParams,
  MockTenantManagementSnapshot,
} from "@/feature/auth/types";
import { loadOperationsRegistrationStrategy } from "@/feature/operations/platformConfigStorage";
import { MANAGEMENT_CONSOLE_LABEL, PRODUCT_LOGO_TEXT, PRODUCT_NAME } from "@/constants/brand";
import type { MockPointsPackageOption } from "@/feature/points/types";
import { getMockTenantSeatPricing } from "@/feature/tenantPlan/mockTenantPlanCommerce";
import type { MockTenantPlanPackageOption } from "@/feature/tenantPlan/types";
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
import { TenantPointsRechargeModal } from "./components/TenantPointsRechargeModal";
import { TenantReferralInviteModal } from "./components/TenantReferralInviteModal";
import { TenantOverviewView } from "./components/TenantOverviewView";
import { TenantPointsView } from "./components/TenantPointsView";
import { TenantSeatPurchaseModal } from "./components/TenantSeatPurchaseModal";
import { TenantTeamPlanPurchaseModal } from "./components/TenantTeamPlanPurchaseModal";
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
    label: "租户总览",
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

const resolveFrontisAdminTabKey = (tabKey: string | null): FrontisWebTabKey =>
  tabKey === "access"
    ? "organization"
    : tabKey && FRONTIS_ADMIN_TAB_KEYS.has(tabKey as FrontisWebTabKey)
      ? (tabKey as FrontisWebTabKey)
      : "overview";

/**
 * 老板后台管理页面。
 */
const FrontisAdminPage = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activateIdentity, activateTenant, activeIdentity, logout, session } = useMockAuth();
  const initialTenantSnapshot = useMemo<MockTenantManagementSnapshot | null>(
    () => getMockTenantManagementSnapshot(activeIdentity?.tenantId),
    [activeIdentity?.tenantId],
  );
  const [activeTabKey, setActiveTabKey] = useState<FrontisWebTabKey>(() =>
    resolveFrontisAdminTabKey(searchParams.get("tab")),
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);
  const [isReferralInviteModalOpen, setIsReferralInviteModalOpen] = useState<boolean>(false);
  const [referralStrategy, setReferralStrategy] = useState(() =>
    loadOperationsRegistrationStrategy(),
  );
  const [isSeatPurchaseModalOpen, setIsSeatPurchaseModalOpen] = useState<boolean>(false);
  const [isTeamPlanPurchaseModalOpen, setIsTeamPlanPurchaseModalOpen] = useState<boolean>(false);
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
        item.key === "organization" || item.key === "roleManagement"
          ? tenantSnapshot?.edition === "team"
          : true,
      ),
    [tenantSnapshot?.edition],
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
    const nextTabKey = resolveFrontisAdminTabKey(searchParams.get("tab"));

    if (nextTabKey !== activeTabKey) {
      setActiveTabKey(nextTabKey);
    }
  }, [activeTabKey, searchParams]);

  useEffect(() => {
    if (!tenantSnapshot) {
      return;
    }

    if (visibleAdminTabs.some(item => item.key === activeTabKey)) {
      return;
    }

    setActiveTabKey("overview");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "overview");
    setSearchParams(nextParams);
  }, [activeTabKey, searchParams, setSearchParams, tenantSnapshot, visibleAdminTabs]);

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

  const handleOpenRechargeModal = useCallback((): void => {
    setIsAccountMenuOpen(false);
    setIsRechargeModalOpen(true);
  }, []);
  const handleCloseRechargeModal = useCallback((): void => {
    setIsRechargeModalOpen(false);
  }, []);
  const handleOpenReferralInviteModal = useCallback((): void => {
    setReferralStrategy(loadOperationsRegistrationStrategy());
    setIsAccountMenuOpen(false);
    setIsReferralInviteModalOpen(true);
  }, []);
  const handleCloseReferralInviteModal = useCallback((): void => {
    setIsReferralInviteModalOpen(false);
  }, []);
  const handleOpenTeamPlanPurchaseModal = useCallback((): void => {
    setIsTeamPlanPurchaseModalOpen(true);
  }, []);
  const handleCloseTeamPlanPurchaseModal = useCallback((): void => {
    setIsTeamPlanPurchaseModalOpen(false);
  }, []);
  const handleOpenSeatPurchaseModal = useCallback((): void => {
    setIsSeatPurchaseModalOpen(true);
  }, []);
  const handleCloseSeatPurchaseModal = useCallback((): void => {
    setIsSeatPurchaseModalOpen(false);
  }, []);
  const handleConfirmRecharge = useCallback(
    (selectedPackage: MockPointsPackageOption): boolean => {
      if (!activeIdentity?.tenantId || !currentUser) {
        return false;
      }

      const nextSnapshot = rechargeMockTenantPoints(
        activeIdentity.tenantId,
        selectedPackage.points,
        currentUser.name,
        {
          title: `${selectedPackage.title}到账`,
          description: `统一扫码支付 ¥${selectedPackage.price}，购买 ${selectedPackage.points.toLocaleString("zh-CN")} 积分。`,
          packageId: selectedPackage.id,
          packageTitle: selectedPackage.title,
          price: selectedPackage.price,
          paymentChannelLabel: "统一扫码支付",
        },
      );

      if (!nextSnapshot) {
        message.warning("当前租户暂不可充值，请刷新后重试。");
        return false;
      }

      setTenantSnapshot(nextSnapshot);
      message.success(
        `${selectedPackage.title}已到账，当前积分 +${selectedPackage.points.toLocaleString(
          "zh-CN",
        )}。`,
      );
      return true;
    },
    [activeIdentity?.tenantId, currentUser],
  );

  const handleConfirmTeamPlanPurchase = useCallback(
    (selectedPackage: MockTenantPlanPackageOption): boolean => {
      if (!activeIdentity?.tenantId) {
        return false;
      }

      const nextSnapshot = activateMockTenantTeamPlan(activeIdentity.tenantId, selectedPackage);

      if (!nextSnapshot) {
        message.warning("当前租户暂无法开通团队版，请刷新后重试。");
        return false;
      }

      setTenantSnapshot(nextSnapshot);
      message.success(`${selectedPackage.title}已开通，组织管理已解锁。`);
      return true;
    },
    [activeIdentity?.tenantId],
  );

  const handleConfirmSeatPurchase = useCallback(
    (seatCount: number): boolean => {
      if (!activeIdentity?.tenantId) {
        return false;
      }

      const nextSnapshot = addMockTenantSeats(activeIdentity.tenantId, seatCount);

      if (!nextSnapshot) {
        message.warning("当前租户暂不可扩容席位，请刷新后重试。");
        return false;
      }

      setTenantSnapshot(nextSnapshot);
      message.success(`已为当前租户扩容 ${seatCount} 个席位。`);
      return true;
    },
    [activeIdentity?.tenantId],
  );

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
        message.warning("当前席位不足，请先扩容席位。");
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

    if (activeTabKey === "overview") {
      return (
        <TenantOverviewView
          tenantSnapshot={tenantSnapshot}
          onOpenTeamPlanPurchase={
            tenantSnapshot.edition === "personal" ? handleOpenTeamPlanPurchaseModal : undefined
          }
        />
      );
    }

    if (activeTabKey === "points") {
      return (
        <TenantPointsView
          tenantSnapshot={tenantSnapshot}
          onOpenInvite={handleOpenReferralInviteModal}
          onOpenRecharge={handleOpenRechargeModal}
        />
      );
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
          onOpenSeatPurchase={handleOpenSeatPurchaseModal}
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
                  pointsBalance={tenantSnapshot?.pointsBalance}
                  onOpenInvite={
                    tenantSnapshot && referralStrategy.referralEnabled
                      ? handleOpenReferralInviteModal
                      : undefined
                  }
                  onOpenRecharge={tenantSnapshot ? handleOpenRechargeModal : undefined}
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

      <TenantPointsRechargeModal
        open={isRechargeModalOpen}
        pointsBalance={tenantSnapshot?.pointsBalance ?? 0}
        tenantName={activeIdentity?.tenantName}
        onCancel={handleCloseRechargeModal}
        onConfirmPurchase={handleConfirmRecharge}
      />
      {tenantSnapshot ? (
        <TenantReferralInviteModal
          accountName={currentUser?.name ?? "当前用户"}
          inviteeRewardPoints={referralStrategy.referralInviteeRewardPoints}
          inviterRewardPoints={referralStrategy.referralInviterRewardPoints}
          open={isReferralInviteModalOpen}
          referralRecords={tenantSnapshot.referralRecords}
          tenantCode={tenantSnapshot.tenantCode}
          onClose={handleCloseReferralInviteModal}
        />
      ) : null}
      <TenantTeamPlanPurchaseModal
        currentPlanLabel={tenantSnapshot?.planLabel ?? "个人版"}
        open={isTeamPlanPurchaseModalOpen}
        tenantName={activeIdentity?.tenantName}
        onCancel={handleCloseTeamPlanPurchaseModal}
        onConfirmPurchase={handleConfirmTeamPlanPurchase}
      />
      <TenantSeatPurchaseModal
        currentSeats={tenantSnapshot?.totalSeats ?? 0}
        open={isSeatPurchaseModalOpen}
        seatPricing={getMockTenantSeatPricing()}
        tenantName={activeIdentity?.tenantName}
        usedSeats={tenantSnapshot?.usedSeats ?? 0}
        onCancel={handleCloseSeatPurchaseModal}
        onConfirmPurchase={handleConfirmSeatPurchase}
      />
    </div>
  );
};

export default FrontisAdminPage;
