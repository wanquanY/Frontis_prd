import { useCallback, useEffect, useMemo, useState } from "react";

import { message } from "antd";

import {
  createDefaultTenantRoles,
  DEFAULT_TENANT_ROLE_IDS,
  OPERATIONS_OPERATOR_PERMISSION_IDS,
  OPERATIONS_SUPER_ADMIN_PERMISSION_IDS,
  syncTenantRoleMembers,
  type TenantRoleItem,
} from "@/constants/tenantRolePermissions";
import { inviteMockTenantMemberAccount, updateMockTenantUsers } from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type {
  MockTenantInviteMemberParams,
  MockTenantManagementSnapshot,
} from "@/feature/auth/types";
import { INITIAL_ORGANIZATION_DEPARTMENTS } from "@/mocks/mockData";
import { OrganizationManagementView } from "@/pages/components/OrganizationManagementView";
import { RoleManagementView } from "@/pages/components/RoleManagementView";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";
import type {
  FrontisUserStatus,
  FrontisWebUserItem,
  OrganizationDepartmentItem,
} from "@/pages/types";

export interface OperationsOrganizationConsoleProps {
  canAssignRoles?: boolean;
  canChangeMemberStatus?: boolean;
  canEditMembers?: boolean;
  canInviteMembers?: boolean;
  canManageCustomRoles?: boolean;
  canManageDepartments?: boolean;
  canRemoveMembers?: boolean;
  view: "organization" | "roleManagement";
}

const FALLBACK_TENANT_ID = "tenant-enterprise-demo";
const OPERATIONS_SUPER_ADMIN_ROLE_ID = "role-operations-super-admin";
const OPERATIONS_OPERATOR_ROLE_ID = "role-operations-operator";

const resolveSnapshot = (tenantId?: string): MockTenantManagementSnapshot | null =>
  getMockTenantManagementSnapshot(tenantId) ?? getMockTenantManagementSnapshot(FALLBACK_TENANT_ID);

const buildUsersWithOperationsRole = (
  users: FrontisWebUserItem[],
  currentAccountPhone?: string,
): FrontisWebUserItem[] =>
  users.map(user => {
    const roleIds = new Set(
      user.roleIds?.length ? user.roleIds : [DEFAULT_TENANT_ROLE_IDS[user.role]],
    );

    if (currentAccountPhone && user.phone === currentAccountPhone) {
      roleIds.add(OPERATIONS_SUPER_ADMIN_ROLE_ID);
    }

    return {
      ...user,
      roleIds: Array.from(roleIds),
    };
  });

const createOperationsTenantRoles = (users: FrontisWebUserItem[]): TenantRoleItem[] => [
  ...createDefaultTenantRoles(users),
  {
    id: OPERATIONS_SUPER_ADMIN_ROLE_ID,
    builtin: false,
    name: "平台超管",
    memberIds: users
      .filter(user => user.roleIds?.includes(OPERATIONS_SUPER_ADMIN_ROLE_ID))
      .map(user => user.id),
    permissionIds: OPERATIONS_SUPER_ADMIN_PERMISSION_IDS,
  },
  {
    id: OPERATIONS_OPERATOR_ROLE_ID,
    builtin: false,
    name: "平台运营",
    memberIds: users
      .filter(user => user.roleIds?.includes(OPERATIONS_OPERATOR_ROLE_ID))
      .map(user => user.id),
    permissionIds: OPERATIONS_OPERATOR_PERMISSION_IDS,
  },
];

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

    return department.name === nextTenantName
      ? department
      : {
          ...department,
          name: nextTenantName,
        };
  });
};

/**
 * 运营后台组织管理视图，复用管理后台组织树与统一角色权限。
 */
export const OperationsOrganizationConsole = ({
  canAssignRoles = true,
  canChangeMemberStatus = true,
  canEditMembers = true,
  canInviteMembers = true,
  canManageCustomRoles = true,
  canManageDepartments = true,
  canRemoveMembers = true,
  view,
}: OperationsOrganizationConsoleProps): JSX.Element => {
  const { activeIdentity, session } = useMockAuth();
  const initialSnapshot = useMemo<MockTenantManagementSnapshot | null>(
    () => resolveSnapshot(activeIdentity?.tenantId),
    [activeIdentity?.tenantId],
  );
  const [tenantSnapshot, setTenantSnapshot] = useState<MockTenantManagementSnapshot | null>(
    initialSnapshot,
  );
  const [users, setUsers] = useState<FrontisWebUserItem[]>(() =>
    buildUsersWithOperationsRole(initialSnapshot?.users ?? [], session?.phone),
  );
  const [tenantRoles, setTenantRoles] = useState<TenantRoleItem[]>(() =>
    createOperationsTenantRoles(
      buildUsersWithOperationsRole(initialSnapshot?.users ?? [], session?.phone),
    ),
  );
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
  );
  const [departments, setDepartments] = useState<OrganizationDepartmentItem[]>(() =>
    syncRootDepartmentName(INITIAL_ORGANIZATION_DEPARTMENTS, initialSnapshot?.tenantName),
  );

  useEffect(() => {
    const nextSnapshot = resolveSnapshot(activeIdentity?.tenantId);

    if (!nextSnapshot) {
      return;
    }

    setTenantSnapshot(nextSnapshot);
    const nextUsers = buildUsersWithOperationsRole(nextSnapshot.users, session?.phone);

    setUsers(nextUsers);
    setTenantRoles(createOperationsTenantRoles(nextUsers));
    setSelectedRoleId(DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin);
    setDepartments(currentDepartments =>
      syncRootDepartmentName(currentDepartments, nextSnapshot.tenantName),
    );
  }, [activeIdentity?.tenantId, session?.phone]);

  useEffect(() => {
    setTenantRoles(currentRoles => syncTenantRoleMembers(currentRoles, users));
  }, [users]);

  const syncUsersToTenant = useCallback(
    (nextUsers: FrontisWebUserItem[]): void => {
      if (!tenantSnapshot) {
        return;
      }

      const nextSnapshot = updateMockTenantUsers(tenantSnapshot.tenantId, nextUsers);

      if (nextSnapshot) {
        setTenantSnapshot(nextSnapshot);
      }
    },
    [tenantSnapshot],
  );

  const handleAddDepartment = useCallback((dept: OrganizationDepartmentItem): void => {
    setDepartments(currentDepartments => [...currentDepartments, dept]);
  }, []);

  const handleUpdateDepartment = useCallback(
    (deptId: string, updates: Partial<Pick<OrganizationDepartmentItem, "name">>): void => {
      setDepartments(currentDepartments =>
        currentDepartments.map(department =>
          department.id === deptId ? { ...department, ...updates } : department,
        ),
      );
    },
    [],
  );

  const handleRemoveDepartment = useCallback((deptId: string): void => {
    setDepartments(currentDepartments =>
      currentDepartments.filter(department => department.id !== deptId),
    );
  }, []);

  const handleSetDepartmentLeader = useCallback(
    (deptId: string, userId: string | undefined): void => {
      setDepartments(currentDepartments =>
        currentDepartments.map(department =>
          department.id === deptId ? { ...department, leaderUserId: userId } : department,
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
      setUsers(currentUsers => {
        const nextUsers = currentUsers.map(user =>
          user.id === userId
            ? {
                ...user,
                name: updates.name,
                phone: updates.phone,
                role: updates.role,
                roleIds: updates.roleIds,
              }
            : user,
        );

        syncUsersToTenant(nextUsers);

        return nextUsers;
      });
    },
    [syncUsersToTenant],
  );

  const handleUpdateUserDepartment = useCallback(
    (userId: string, departmentId: string): void => {
      setUsers(currentUsers => {
        const nextUsers = currentUsers.map(user =>
          user.id === userId ? { ...user, departmentId } : user,
        );

        syncUsersToTenant(nextUsers);

        return nextUsers;
      });
    },
    [syncUsersToTenant],
  );

  const handleUpdateUserStatus = useCallback(
    (userId: string, status: FrontisUserStatus): void => {
      setUsers(currentUsers => {
        const nextUsers = currentUsers.map(user =>
          user.id === userId ? { ...user, status } : user,
        );

        syncUsersToTenant(nextUsers);

        return nextUsers;
      });
    },
    [syncUsersToTenant],
  );

  const handleRemoveUser = useCallback(
    (userId: string): void => {
      setUsers(currentUsers => {
        const nextUsers = currentUsers.filter(user => user.id !== userId);

        syncUsersToTenant(nextUsers);

        return nextUsers;
      });
    },
    [syncUsersToTenant],
  );

  const handleInviteTenantMember = useCallback(
    (params: MockTenantInviteMemberParams): boolean => {
      if (!tenantSnapshot) {
        return false;
      }

      if (tenantSnapshot.edition !== "team") {
        message.warning("当前租户仍是个人版，请先通过团队扩充购买席位。");
        return false;
      }

      if (tenantSnapshot.usedSeats >= tenantSnapshot.totalSeats) {
        message.warning("当前有效席位额度不足，暂无法继续添加成员。");
        return false;
      }

      const result = inviteMockTenantMemberAccount(tenantSnapshot.tenantId, {
        ...params,
        inviterName: session?.name ?? params.inviterName,
      });

      if (!result) {
        message.warning("添加失败，请确认手机号未注册且当前有效席位仍有余量。");
        return false;
      }

      setTenantSnapshot(result.snapshot);
      setUsers(result.snapshot.users);
      message.success("成员已添加到组织，并会按所选角色获得权限。");
      return true;
    },
    [session?.name, tenantSnapshot],
  );

  if (!tenantSnapshot) {
    return (
      <div className={adminStyles.consolePage}>
        <div className={adminStyles.consoleEmpty}>当前组织信息未加载</div>
      </div>
    );
  }

  if (view === "roleManagement") {
    return (
      <RoleManagementView
        canManageCustomRoles={canManageCustomRoles}
        onRolesChange={setTenantRoles}
        onSelectedRoleIdChange={setSelectedRoleId}
        roles={tenantRoles}
        selectedRoleId={selectedRoleId}
        tenantSnapshot={tenantSnapshot}
        users={users}
      />
    );
  }

  return (
    <OrganizationManagementView
      canAssignRoles={canAssignRoles}
      canChangeMemberStatus={canChangeMemberStatus}
      canEditMembers={canEditMembers}
      canInviteMembers={canInviteMembers}
      canManageDepartments={canManageDepartments}
      canRemoveMembers={canRemoveMembers}
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
      roles={tenantRoles}
      tenantSnapshot={tenantSnapshot}
      users={users}
    />
  );
};
