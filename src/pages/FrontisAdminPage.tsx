import { useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import {
  ArrowLeftOutlined,
  ControlOutlined,
  DashboardOutlined,
  LinkOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, message } from "antd";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import {
  activateMockTenantSubscriptionPlan,
  getLoginPath,
  getSystemEntries,
  getSystemEntryMenuLabel,
  getTenantEntries,
  rechargeMockTenantPoints,
} from "@/feature/auth/mockAccounts";
import { inviteMockTenantMemberAccount, updateMockTenantUsers } from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type {
  MockAuthIdentity,
  MockAuthSystemEntry,
  MockTenantInviteMemberParams,
  MockTenantManagementSnapshot,
} from "@/feature/auth/types";
import { resolveTenantBillingMode } from "@/feature/auth/tenantBilling";
import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import type { MockPointsPackagePurchaseSnapshot } from "@/feature/points/types";
import type { MockSubscriptionPurchaseMode } from "@/feature/subscription/types";
import { PRODUCT_LOGO_URL, PRODUCT_NAME, PRODUCT_SLOGAN } from "@/constants/brand";
import {
  createDefaultTenantRoles,
  DEFAULT_TENANT_ROLE_IDS,
  MANAGEMENT_PERMISSION_IDS,
  SYSTEM_ACCESS_PERMISSION_IDS,
  normalizeTenantRolePermissionIds,
  syncTenantRoleMembers,
  type TenantRoleItem,
} from "@/constants/tenantRolePermissions";
import { INITIAL_EMPLOYEES, INITIAL_ORGANIZATION_DEPARTMENTS } from "@/mocks/mockData";
import { getUserPermissionIds, hasAnyPermission, hasPermission } from "@/utils/tenantRoleAccess";

import { AccountDropdownPanel } from "./components/AccountDropdownPanel";
import { AgentStoreView } from "./components/agentStore/AgentStoreView";
import { hasUserAccessToExpert } from "./components/agentStore/utils";
import { ChannelManagementView } from "./components/ChannelManagementView";
import { OrganizationManagementView } from "./components/OrganizationManagementView";
import { RoleManagementView } from "./components/RoleManagementView";
import {
  resolveSubscriptionPlanKey,
  resolveSubscriptionPlanLabel,
  SUBSCRIPTION_PLAN_LABELS,
  getMockSubscriptionPlanPurchaseOption,
  SubscriptionPlanModal,
  type SubscriptionPlanKey,
  type SubscriptionPlanPurchaseOption,
} from "./components/SubscriptionPlanModal";
import { SubscriptionPlanPaymentModal } from "./components/SubscriptionPlanPaymentModal";
import { TenantOverviewView } from "./components/TenantOverviewView";
import { TenantPointsRechargeModal } from "./components/TenantPointsRechargeModal";
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
} from "./types";
import styles from "./FrontisPage.module.less";

const MANAGEMENT_USER_ROLES = new Set<FrontisUserRole>(["enterpriseAdmin"]);
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
    icon: <DashboardOutlined />,
    permissionIds: [MANAGEMENT_PERMISSION_IDS.dashboardView],
    roles: ["admin"],
  },
  {
    key: "channels",
    label: "ME 管理",
    icon: <LinkOutlined />,
    permissionIds: [MANAGEMENT_PERMISSION_IDS.channelManage],
    roles: ["admin"],
  },
  {
    key: "points",
    label: "订单记录",
    icon: <ControlOutlined />,
    permissionIds: [MANAGEMENT_PERMISSION_IDS.pointsManage],
    roles: ["admin"],
  },
  {
    key: "store",
    label: "AI专家管理",
    icon: <RobotOutlined />,
    permissionIds: [MANAGEMENT_PERMISSION_IDS.agentManage],
    roles: ["admin"],
  },
  {
    key: "organization",
    label: "组织管理",
    icon: <TeamOutlined />,
    permissionIds: [MANAGEMENT_PERMISSION_IDS.organizationManage],
    roles: ["admin"],
  },
  {
    key: "roleManagement",
    label: "角色管理",
    icon: <SafetyCertificateOutlined />,
    permissionIds: [MANAGEMENT_PERMISSION_IDS.roleManage],
    roles: ["admin"],
  },
];

const FRONTIS_ADMIN_TAB_KEYS = new Set<FrontisWebTabKey>(FRONTIS_ADMIN_TABS.map(item => item.key));

const getDefaultAdminTabKey = (): FrontisWebTabKey => "overview";

const resolveFrontisAdminTabKey = (tabKey: string | null): FrontisWebTabKey => {
  const normalizedTabKey = tabKey === "access" ? "organization" : tabKey;
  const defaultTabKey = getDefaultAdminTabKey();

  if (!normalizedTabKey || !FRONTIS_ADMIN_TAB_KEYS.has(normalizedTabKey as FrontisWebTabKey)) {
    return defaultTabKey;
  }

  return normalizedTabKey as FrontisWebTabKey;
};

const getUserFallbackRoleIds = (user: FrontisWebUserItem): string[] => {
  if (user.roleIds?.length) {
    return user.roleIds;
  }

  return [DEFAULT_TENANT_ROLE_IDS[user.role]];
};

const createTenantRolesWithIdentityPermissions = (
  users: FrontisWebUserItem[],
  identity?: MockAuthIdentity | null,
): TenantRoleItem[] => {
  const roles = createDefaultTenantRoles(users);

  if (!identity?.permissionIds?.length) {
    return roles;
  }

  const matchedUser = users.find(user => user.id === identity.subjectId);

  if (!matchedUser) {
    return roles;
  }

  const identityRoleIds = new Set(getUserFallbackRoleIds(matchedUser));
  const normalizedPermissionIds = normalizeTenantRolePermissionIds(identity.permissionIds);

  return roles.map(role =>
    identityRoleIds.has(role.id)
      ? {
          ...role,
          permissionIds: normalizedPermissionIds,
        }
      : role,
  );
};

/**
 * 老板后台管理页面。
 */
const FrontisAdminPage = (): JSX.Element => {
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
    resolveFrontisAdminTabKey(searchParams.get("tab")),
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const [isPointsRechargeModalOpen, setIsPointsRechargeModalOpen] = useState<boolean>(false);
  const [isSubscriptionPlanModalOpen, setIsSubscriptionPlanModalOpen] = useState<boolean>(false);
  const [subscriptionPurchaseMode, setSubscriptionPurchaseMode] =
    useState<MockSubscriptionPurchaseMode>("addSeats");
  const [pendingSubscriptionPurchase, setPendingSubscriptionPurchase] =
    useState<SubscriptionPlanPurchaseOption | null>(null);
  const [subscriptionPlanOverrideKey, setSubscriptionPlanOverrideKey] =
    useState<SubscriptionPlanKey | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
  const [tenantSnapshot, setTenantSnapshot] = useState<MockTenantManagementSnapshot | null>(
    initialTenantSnapshot,
  );
  const [users, setUsers] = useState<FrontisWebUserItem[]>(initialTenantSnapshot?.users ?? []);
  const [tenantRoles, setTenantRoles] = useState<TenantRoleItem[]>(() =>
    createTenantRolesWithIdentityPermissions(initialTenantSnapshot?.users ?? [], activeIdentity),
  );
  const [selectedTenantRoleId, setSelectedTenantRoleId] = useState<string>(
    DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
  );
  const [departments, setDepartments] = useState<OrganizationDepartmentItem[]>(() =>
    syncRootDepartmentName(INITIAL_ORGANIZATION_DEPARTMENTS, activeIdentity?.tenantName),
  );
  const currentSubscriptionPlanKey = useMemo(
    () => subscriptionPlanOverrideKey ?? resolveSubscriptionPlanKey(tenantSnapshot),
    [subscriptionPlanOverrideKey, tenantSnapshot],
  );
  const tenantBillingMode = resolveTenantBillingMode(tenantSnapshot);
  const isTenantPointsBilling = Boolean(tenantSnapshot) && tenantBillingMode === "points";
  const shouldShowSelfServeSubscription = isTenantPointsBilling;
  const accountPlanLabel = isTenantPointsBilling
    ? resolveSubscriptionPlanLabel(tenantSnapshot, currentSubscriptionPlanKey)
    : undefined;
  const pendingSubscriptionPlan = pendingSubscriptionPurchase;
  useEffect(() => {
    setDepartments(currentDepartments =>
      syncRootDepartmentName(currentDepartments, activeIdentity?.tenantName),
    );
  }, [activeIdentity?.tenantName]);

  useEffect(() => {
    setSubscriptionPlanOverrideKey(null);
  }, [activeIdentity?.tenantId]);

  useEffect(() => {
    if (shouldShowSelfServeSubscription) {
      return;
    }

    setIsSubscriptionPlanModalOpen(false);
    setPendingSubscriptionPurchase(null);
  }, [shouldShowSelfServeSubscription]);

  useEffect(() => {
    if (isTenantPointsBilling) {
      return;
    }

    setIsPointsRechargeModalOpen(false);
  }, [isTenantPointsBilling]);

  useEffect(() => {
    const nextSnapshot = getMockTenantManagementSnapshot(activeIdentity?.tenantId);

    if (!nextSnapshot) {
      return;
    }

    setTenantSnapshot(nextSnapshot);
    setUsers(nextSnapshot.users);
    setTenantRoles(createTenantRolesWithIdentityPermissions(nextSnapshot.users, activeIdentity));
    setSelectedTenantRoleId(DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin);
  }, [activeIdentity]);

  useEffect(() => {
    setTenantRoles(currentRoles => syncTenantRoleMembers(currentRoles, users));
  }, [users]);

  const effectiveUsers = useMemo(
    () =>
      users.map(user => ({
        ...user,
        assignedAgentIds: employees
          .filter(employee => hasUserAccessToExpert(user, employee, users, departments))
          .map(employee => employee.id),
      })),
    [departments, employees, users],
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
  const currentUserPermissionIds = useMemo(
    () => (currentUser ? getUserPermissionIds(currentUser, tenantRoles) : []),
    [currentUser, tenantRoles],
  );
  const visibleAdminTabs = useMemo<FrontisWebTabItem[]>(
    () =>
      FRONTIS_ADMIN_TABS.filter(item => {
        if (item.key === "points" && !isTenantPointsBilling) {
          return false;
        }

        return item.permissionIds
          ? hasAnyPermission(currentUserPermissionIds, item.permissionIds)
          : true;
      }),
    [currentUserPermissionIds, isTenantPointsBilling],
  );
  useEffect(() => {
    const requestedTabKey = resolveFrontisAdminTabKey(searchParams.get("tab"));
    const nextTabKey = visibleAdminTabs.some(item => item.key === requestedTabKey)
      ? requestedTabKey
      : (visibleAdminTabs[0]?.key ?? requestedTabKey);

    if (nextTabKey !== activeTabKey) {
      setActiveTabKey(nextTabKey);
    }
  }, [activeTabKey, searchParams, visibleAdminTabs]);

  useEffect(() => {
    if (!tenantSnapshot) {
      return;
    }

    if (visibleAdminTabs.some(item => item.key === activeTabKey)) {
      return;
    }

    const nextTabKey = visibleAdminTabs[0]?.key ?? getDefaultAdminTabKey();
    setActiveTabKey(nextTabKey);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", nextTabKey);
    setSearchParams(nextParams);
  }, [activeTabKey, searchParams, setSearchParams, tenantSnapshot, visibleAdminTabs]);

  const handleUpdateEmployeeAccess = useCallback(
    (
      employeeId: string,
      visibility: EmployeeItem["visibility"],
      accessScopeSubjects: AccessScopeSubject[],
    ): void => {
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
    },
    [],
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

  const handleUpdateUser = useCallback(
    (
      userId: string,
      updates: Pick<FrontisWebUserItem, "name" | "phone" | "role" | "roleIds">,
    ): void => {
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
                roleIds: updates.roleIds,
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

  const handleInviteTenantMember = useCallback(
    (params: MockTenantInviteMemberParams): boolean => {
      if (!activeIdentity?.tenantId || !tenantSnapshot) {
        return false;
      }

      if (tenantSnapshot.edition !== "team") {
        message.warning("当前租户仍是个人版，请先通过团队扩充购买席位。");
        return false;
      }

      if (tenantSnapshot.usedSeats >= tenantSnapshot.totalSeats) {
        message.warning("当前成员名额不足，暂无法继续邀请成员。");
        return false;
      }

      const result = inviteMockTenantMemberAccount(activeIdentity.tenantId, params);

      if (!result) {
        message.warning("邀请失败，请确认手机号未注册且当前成员名额仍有余量。");
        return false;
      }

      setTenantSnapshot(result.snapshot);
      setUsers(result.snapshot.users);
      message.success("成员已加入当前租户。");
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

  const handleSelectSubscriptionPlan = useCallback(
    (purchaseInput: Parameters<typeof getMockSubscriptionPlanPurchaseOption>[0]): void => {
      if (!isTenantPointsBilling) {
        message.info("当前租户为成本计费，不需要自助团队扩充。");
        return;
      }

      const purchaseOption = getMockSubscriptionPlanPurchaseOption(purchaseInput, tenantSnapshot);

      if (!purchaseOption) {
        message.info("当前团队席位无需购买。");
        return;
      }

      setIsSubscriptionPlanModalOpen(false);
      setPendingSubscriptionPurchase(purchaseOption);
    },
    [isTenantPointsBilling, tenantSnapshot],
  );

  const handleConfirmSubscriptionPayment = useCallback(
    (purchaseOption: SubscriptionPlanPurchaseOption): boolean => {
      if (!isTenantPointsBilling) {
        message.error("当前租户为成本计费，不支持自助团队扩充。");
        return false;
      }

      if (!activeIdentity?.tenantId) {
        message.error("当前账号未绑定租户，无法购买团队席位。");
        return false;
      }

      const nextSnapshot = activateMockTenantSubscriptionPlan(
        activeIdentity.tenantId,
        purchaseOption,
      );

      if (!nextSnapshot) {
        message.error("团队扩充购买失败，请稍后重试。");
        return false;
      }

      setSubscriptionPlanOverrideKey(null);
      setTenantSnapshot(nextSnapshot);
      message.success(
        purchaseOption.purchaseMode === "renew"
          ? `${nextSnapshot.planLabel} 已续约。`
          : `${nextSnapshot.planLabel} 已开通。`,
      );
      return true;
    },
    [activeIdentity?.tenantId, isTenantPointsBilling],
  );

  const handleOpenPointsRecharge = useCallback((): void => {
    if (!isTenantPointsBilling) {
      message.info("当前租户为成本计费，不支持购买积分。");
      return;
    }

    setIsAccountMenuOpen(false);
    setIsPointsRechargeModalOpen(true);
  }, [isTenantPointsBilling]);

  const handleOpenSubscriptionModal = useCallback(
    (purchaseMode: MockSubscriptionPurchaseMode): void => {
      if (!isTenantPointsBilling) {
        message.info("当前租户为成本计费，不支持自助团队扩充。");
        return;
      }

      setSubscriptionPurchaseMode(purchaseMode);
      setIsAccountMenuOpen(false);
      setIsSubscriptionPlanModalOpen(true);
    },
    [isTenantPointsBilling],
  );

  const handleConfirmPointsRecharge = useCallback(
    (purchaseSnapshot: MockPointsPackagePurchaseSnapshot): boolean => {
      if (!isTenantPointsBilling) {
        message.error("当前租户为成本计费，不支持购买积分。");
        return false;
      }

      if (!activeIdentity?.tenantId) {
        message.error("当前账号未绑定租户，无法购买积分。");
        return false;
      }

      const purchaserName = currentUser?.name ?? session?.name ?? "当前用户";
      const nextSnapshot = rechargeMockTenantPoints(
        activeIdentity.tenantId,
        purchaseSnapshot.totalPoints,
        purchaserName,
        {
          basePoints: purchaseSnapshot.basePoints,
          discountAmount: purchaseSnapshot.discountAmount,
          discountFactor: purchaseSnapshot.discountFactor,
          giftPoints: purchaseSnapshot.giftPoints,
          originalPrice: purchaseSnapshot.originalPrice,
          packageId: purchaseSnapshot.packageId,
          packageTitle: purchaseSnapshot.packageTitle,
          price: purchaseSnapshot.payableAmount,
          promotionEndsAt: purchaseSnapshot.promotionEndsAt,
          paymentChannelLabel: purchaseSnapshot.paymentChannelLabel,
          title: `购买${purchaseSnapshot.packageTitle}`,
          description: `购买${purchaseSnapshot.packageTitle}，支付 ¥${purchaseSnapshot.payableAmount} 后到账。`,
        },
      );

      if (!nextSnapshot) {
        message.error("积分购买失败，请稍后重试。");
        return false;
      }

      setTenantSnapshot(nextSnapshot);
      setUsers(nextSnapshot.users);
      message.success(`${purchaseSnapshot.totalPoints.toLocaleString("zh-CN")} 积分已到账。`);
      return true;
    },
    [activeIdentity?.tenantId, currentUser?.name, isTenantPointsBilling, session?.name],
  );

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

      navigate(result.redirectPath ?? "/login", { replace: true });
    },
    [activateTenant, location.pathname, location.search, navigate],
  );
  const accountMenuItems: MenuProps["items"] = [
    ...systemEntries.map(entry => ({
      key: `system-entry-${entry.identityId}`,
      icon: <AppstoreOutlined />,
      label: getSystemEntryMenuLabel(entry),
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
      const nextTabKey = resolveFrontisAdminTabKey(tabKey);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", nextTabKey);
      setActiveTabKey(nextTabKey);
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

  const hasManagementAccess = currentUser
    ? hasPermission(currentUserPermissionIds, SYSTEM_ACCESS_PERMISSION_IDS.admin)
    : true;

  const renderContent = (): JSX.Element => {
    if (!tenantSnapshot) {
      return (
        <div className={styles.emptyPanel}>
          <h2 className={styles.emptyPanelTitle}>当前租户信息未加载</h2>
          <p className={styles.emptyPanelDescription}>
            请返回工作台后重新进入管理后台，系统会按当前租户加载组织、角色和成员数据。
          </p>
        </div>
      );
    }

    if (activeTabKey === "overview") {
      return (
        <TenantOverviewView
          billingMode={tenantBillingMode}
          deploymentMode={tenantSnapshot.deploymentMode}
          employees={employees}
          tenantSnapshot={tenantSnapshot}
        />
      );
    }

    if (activeTabKey === "channels") {
      return <ChannelManagementView tenantSnapshot={tenantSnapshot} />;
    }

    if (activeTabKey === "points") {
      if (!isTenantPointsBilling) {
        return (
          <div className={styles.emptyPanel}>
            <h2 className={styles.emptyPanelTitle}>当前租户为成本计费</h2>
            <p className={styles.emptyPanelDescription}>
              成本计费租户不展示积分余额、购买积分和订单记录，驾驶舱已直接按成本统计用量。
            </p>
          </div>
        );
      }

      return <TenantPointsView tenantSnapshot={tenantSnapshot} />;
    }

    if (activeTabKey === "store") {
      return (
        <AgentStoreView
          currentUserName={currentUser?.name}
          employees={employees}
          organizationDepartments={departments}
          onUpdateEmployeeAccess={handleUpdateEmployeeAccess}
          onUpdateEmployeeLaborCosts={handleUpdateEmployeeLaborCosts}
          onUpdateEmployeeModel={handleUpdateEmployeeModel}
          tenantSnapshot={tenantSnapshot}
          users={effectiveUsers}
        />
      );
    }

    if (activeTabKey === "organization") {
      return (
        <OrganizationManagementView
          canAssignRoles={hasPermission(
            currentUserPermissionIds,
            MANAGEMENT_PERMISSION_IDS.roleManage,
          )}
          canChangeMemberStatus={hasPermission(
            currentUserPermissionIds,
            MANAGEMENT_PERMISSION_IDS.organizationManage,
          )}
          canEditMembers={hasPermission(
            currentUserPermissionIds,
            MANAGEMENT_PERMISSION_IDS.organizationManage,
          )}
          canInviteMembers={hasPermission(
            currentUserPermissionIds,
            MANAGEMENT_PERMISSION_IDS.organizationManage,
          )}
          canManageDepartments={hasPermission(
            currentUserPermissionIds,
            MANAGEMENT_PERMISSION_IDS.organizationManage,
          )}
          canRemoveMembers={hasPermission(
            currentUserPermissionIds,
            MANAGEMENT_PERMISSION_IDS.organizationManage,
          )}
          departments={departments}
          onAddDepartment={handleAddDepartment}
          onInviteTenantMember={handleInviteTenantMember}
          onRemoveDepartment={handleRemoveDepartment}
          onRemoveUser={handleRemoveUser}
          onSetDepartmentLeader={handleSetDepartmentLeader}
          onOpenSubscriptionManage={handleOpenSubscriptionModal}
          onUpdateDepartment={handleUpdateDepartment}
          onUpdateUser={handleUpdateUser}
          onUpdateUserDepartment={handleUpdateUserDepartment}
          onUpdateUserStatus={handleUpdateUserStatus}
          roles={tenantRoles}
          tenantSnapshot={tenantSnapshot}
          users={effectiveUsers}
        />
      );
    }

    if (activeTabKey === "roleManagement") {
      return (
        <RoleManagementView
          canManageCustomRoles={hasPermission(
            currentUserPermissionIds,
            MANAGEMENT_PERMISSION_IDS.roleManage,
          )}
          onRolesChange={setTenantRoles}
          onSelectedRoleIdChange={setSelectedTenantRoleId}
          roles={tenantRoles}
          selectedRoleId={selectedTenantRoleId}
          tenantSnapshot={tenantSnapshot}
          users={effectiveUsers}
        />
      );
    }

    return (
      <AgentStoreView
        currentUserName={currentUser?.name}
        employees={employees}
        organizationDepartments={departments}
        onUpdateEmployeeAccess={handleUpdateEmployeeAccess}
        onUpdateEmployeeLaborCosts={handleUpdateEmployeeLaborCosts}
        onUpdateEmployeeModel={handleUpdateEmployeeModel}
        tenantSnapshot={tenantSnapshot}
        users={effectiveUsers}
      />
    );
  };

  return (
    <>
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
                  <img className={styles.brandLogo} src={PRODUCT_LOGO_URL} alt={PRODUCT_NAME} />
                  {isSidebarCollapsed ? null : (
                    <div className={styles.brandCopy}>
                      <div className={styles.brandTitle}>{PRODUCT_NAME}</div>
                      <div className={styles.brandSubtitle}>{PRODUCT_SLOGAN}</div>
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
              {visibleAdminTabs.map(item => (
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
                open={isAccountMenuOpen}
                onOpenChange={setIsAccountMenuOpen}
                dropdownRender={menu => (
                  <AccountDropdownPanel
                    accountName={currentUser?.name ?? "未登录"}
                    menu={menu}
                    onOpenRecharge={isTenantPointsBilling ? handleOpenPointsRecharge : undefined}
                    onOpenSubscription={
                      shouldShowSelfServeSubscription
                        ? () => handleOpenSubscriptionModal("addSeats")
                        : undefined
                    }
                    pointsBalance={
                      isTenantPointsBilling ? tenantSnapshot?.pointsBalance : undefined
                    }
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

      {tenantSnapshot && isTenantPointsBilling ? (
        <TenantPointsRechargeModal
          open={isPointsRechargeModalOpen}
          onCancel={() => setIsPointsRechargeModalOpen(false)}
          onConfirmPurchase={handleConfirmPointsRecharge}
        />
      ) : null}

      {shouldShowSelfServeSubscription ? (
        <SubscriptionPlanModal
          currentPlanKey={currentSubscriptionPlanKey}
          open={isSubscriptionPlanModalOpen}
          purchaseMode={subscriptionPurchaseMode}
          tenantSnapshot={tenantSnapshot}
          onClose={() => setIsSubscriptionPlanModalOpen(false)}
          onSelectPlan={handleSelectSubscriptionPlan}
        />
      ) : null}

      {shouldShowSelfServeSubscription ? (
        <SubscriptionPlanPaymentModal
          currentPlanLabel={
            accountPlanLabel ?? SUBSCRIPTION_PLAN_LABELS[currentSubscriptionPlanKey]
          }
          open={Boolean(pendingSubscriptionPurchase)}
          plan={pendingSubscriptionPlan}
          tenantName={tenantSnapshot?.tenantName}
          onCancel={() => setPendingSubscriptionPurchase(null)}
          onConfirmPayment={handleConfirmSubscriptionPayment}
        />
      ) : null}
    </>
  );
};

export default FrontisAdminPage;
