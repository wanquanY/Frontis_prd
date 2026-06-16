import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import {
  CreditCardOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Button, Input, Modal, Popconfirm, Select, message } from "antd";

import { DEFAULT_TENANT_ROLE_IDS, type TenantRoleItem } from "@/constants/tenantRolePermissions";
import type { MockSubscriptionPurchaseMode } from "@/feature/subscription/types";
import type {
  MockTenantInviteMemberParams,
  MockTenantManagementSnapshot,
} from "@/feature/auth/types";
import {
  getLegacyUserRoleByTenantRoleId,
  getUserPrimaryRoleId,
  getUserRoleIds,
} from "@/utils/tenantRoleAccess";
import type { FrontisUserStatus, FrontisWebUserItem, OrganizationDepartmentItem } from "../types";

import adminStyles from "./FrontisAdminViews.module.less";
import { getRoleLabel, getUserStatusLabel } from "./FrontisWebViews";

export interface OrganizationManagementViewProps {
  canAssignRoles?: boolean;
  canChangeMemberStatus?: boolean;
  canEditMembers?: boolean;
  canInviteMembers?: boolean;
  canManageDepartments?: boolean;
  canRemoveMembers?: boolean;
  departments: OrganizationDepartmentItem[];
  onAddDepartment: (dept: OrganizationDepartmentItem) => void;
  onInviteTenantMember?: (params: MockTenantInviteMemberParams) => boolean;
  onOpenSubscriptionManage?: (purchaseMode: MockSubscriptionPurchaseMode) => void;
  onRemoveDepartment: (deptId: string) => void;
  onRemoveUser: (userId: string) => void;
  onSetDepartmentLeader: (deptId: string, userId: string | undefined) => void;
  onUpdateDepartment: (
    deptId: string,
    updates: Partial<Pick<OrganizationDepartmentItem, "name">>,
  ) => void;
  onUpdateUser: (
    userId: string,
    updates: Pick<FrontisWebUserItem, "name" | "phone" | "role" | "roleIds">,
  ) => void;
  onUpdateUserDepartment: (userId: string, departmentId: string) => void;
  onUpdateUserStatus: (userId: string, status: FrontisUserStatus) => void;
  roles?: TenantRoleItem[];
  tenantSnapshot?: MockTenantManagementSnapshot | null;
  users: FrontisWebUserItem[];
  embedded?: boolean;
}

interface DraftDepartmentForm {
  name: string;
  parentId: string | null;
}

interface DraftUserForm {
  departmentId: string;
  name: string;
  phone: string;
  roleId: string;
}

const FALLBACK_MEMBER_ROLE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "租户管理员", value: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin },
  { label: "部门负责人", value: DEFAULT_TENANT_ROLE_IDS.departmentLead },
  { label: "租户成员", value: DEFAULT_TENANT_ROLE_IDS.employee },
];

/**
 * 获取部门及其所有后代部门 id 集合。
 */
const getDescendantDeptIds = (
  departments: OrganizationDepartmentItem[],
  rootId: string,
): Set<string> => {
  const result = new Set<string>([rootId]);
  let frontier = [rootId];

  while (frontier.length) {
    const nextFrontier: string[] = [];

    for (const dept of departments) {
      if (dept.parentId && frontier.includes(dept.parentId) && !result.has(dept.id)) {
        result.add(dept.id);
        nextFrontier.push(dept.id);
      }
    }

    frontier = nextFrontier;
  }

  return result;
};

/**
 * 构建部门路径文字（面包屑）。
 */
const buildDepartmentPath = (departments: OrganizationDepartmentItem[], deptId: string): string => {
  const pathParts: string[] = [];
  let current = departments.find(item => item.id === deptId);

  while (current) {
    pathParts.unshift(current.name);
    current = current.parentId
      ? departments.find(item => item.id === current!.parentId)
      : undefined;
  }

  return pathParts.join(" / ");
};

/**
 * 计算部门在树中的深度（root = 0）。
 */
const getDepartmentDepth = (departments: OrganizationDepartmentItem[], deptId: string): number => {
  let depth = 0;
  let current = departments.find(item => item.id === deptId);

  while (current?.parentId) {
    depth += 1;
    current = departments.find(item => item.id === current!.parentId);
  }

  return depth;
};

/**
 * 递归排序部门树，父节点在前、子节点紧随其后。
 */
const flattenDepartmentTree = (
  departments: OrganizationDepartmentItem[],
  parentId: string | null = null,
): OrganizationDepartmentItem[] => {
  const children = departments.filter(item => item.parentId === parentId);
  const result: OrganizationDepartmentItem[] = [];

  for (const child of children) {
    result.push(child);
    result.push(...flattenDepartmentTree(departments, child.id));
  }

  return result;
};

/**
 * 组织管理视图 — 部门树 + 成员表分栏布局。
 */
export const OrganizationManagementView = ({
  departments,
  embedded = false,
  canAssignRoles = true,
  canChangeMemberStatus = true,
  canEditMembers = true,
  canInviteMembers = true,
  canManageDepartments = true,
  canRemoveMembers = true,
  onAddDepartment,
  onInviteTenantMember,
  onOpenSubscriptionManage,
  onRemoveDepartment,
  onRemoveUser,
  onSetDepartmentLeader,
  onUpdateDepartment,
  onUpdateUser,
  onUpdateUserDepartment,
  onUpdateUserStatus,
  roles,
  tenantSnapshot,
  users,
}: OrganizationManagementViewProps): JSX.Element => {
  /* ---------- 选中部门 ---------- */
  const [selectedDeptId, setSelectedDeptId] = useState<string>(() => departments[0]?.id ?? "");

  /* ---------- Modal 状态 ---------- */
  const [isDeptCreateOpen, setIsDeptCreateOpen] = useState(false);
  const [isDeptEditOpen, setIsDeptEditOpen] = useState(false);
  const [isUserCreateOpen, setIsUserCreateOpen] = useState(false);
  const [isUserEditOpen, setIsUserEditOpen] = useState(false);

  const [draftDept, setDraftDept] = useState<DraftDepartmentForm>({ name: "", parentId: null });
  const [draftUser, setDraftUser] = useState<DraftUserForm>({
    departmentId: "",
    name: "",
    phone: "",
    roleId: DEFAULT_TENANT_ROLE_IDS.employee,
  });
  const [editingUserId, setEditingUserId] = useState("");
  const [memberSearchKeyword, setMemberSearchKeyword] = useState("");
  const [leadeepEnabledUserIds, setLeadeepEnabledUserIds] = useState<Set<string>>(
    () =>
      new Set(
        users
          .filter(user => user.status === "active")
          .slice(0, 3)
          .map(user => user.id),
      ),
  );

  /* ---------- 派生数据 ---------- */
  const flatDepts = useMemo(() => flattenDepartmentTree(departments), [departments]);

  const selectedDept = useMemo(
    () => departments.find(item => item.id === selectedDeptId) ?? departments[0] ?? null,
    [departments, selectedDeptId],
  );

  const descendantIds = useMemo(
    () => (selectedDept ? getDescendantDeptIds(departments, selectedDept.id) : new Set<string>()),
    [departments, selectedDept],
  );

  const directChildren = useMemo(
    () => departments.filter(item => item.parentId === selectedDept?.id),
    [departments, selectedDept],
  );

  const departmentMembers = useMemo(
    () => users.filter(user => descendantIds.has(user.departmentId)),
    [descendantIds, users],
  );

  const directMembers = useMemo(
    () => users.filter(user => user.departmentId === selectedDept?.id),
    [selectedDept, users],
  );
  const departmentLeadeepEnabledCount = useMemo(
    () =>
      departmentMembers.filter(
        user => user.status === "active" && leadeepEnabledUserIds.has(user.id),
      ).length,
    [departmentMembers, leadeepEnabledUserIds],
  );

  const leaderUser = useMemo(
    () =>
      selectedDept?.leaderUserId
        ? (users.find(item => item.id === selectedDept.leaderUserId) ?? null)
        : null,
    [selectedDept, users],
  );
  const isRootDept = selectedDept?.parentId === null;
  const canManageTeamSeats =
    tenantSnapshot?.edition === "team" && typeof onOpenSubscriptionManage === "function";
  const totalEffectiveSeats = tenantSnapshot?.totalSeats ?? users.length;
  const usedEffectiveSeats = tenantSnapshot?.usedSeats ?? users.length;
  const remainingEffectiveSeats = Math.max(totalEffectiveSeats - usedEffectiveSeats, 0);
  const tenantOwnerUserId = tenantSnapshot?.adminUserId ?? "";
  const seatExpiresAt = tenantSnapshot?.planExpiresAt ?? "随当前订阅到期";
  const canCreateUserBySeatRule =
    Boolean(tenantSnapshot) && tenantSnapshot?.edition === "team" && remainingEffectiveSeats > 0;

  const deptOptions = useMemo(
    () =>
      departments.map(item => ({
        label: buildDepartmentPath(departments, item.id),
        value: item.id,
      })),
    [departments],
  );
  const roleOptions = useMemo(
    () =>
      roles?.length
        ? roles.map(role => ({ label: role.name, value: role.id }))
        : FALLBACK_MEMBER_ROLE_OPTIONS,
    [roles],
  );
  const roleNameMap = useMemo(
    () => new Map((roles ?? []).map(role => [role.id, role.name])),
    [roles],
  );
  const getUserRoleLabel = useCallback(
    (user: FrontisWebUserItem): string => {
      const roleNames = getUserRoleIds(user, roles)
        .map(roleId => roleNameMap.get(roleId))
        .filter((roleName): roleName is string => Boolean(roleName));

      return roleNames.length ? roleNames.join("、") : getRoleLabel(user.role);
    },
    [roleNameMap, roles],
  );
  const getUserSeatInfo = useCallback(
    (user: FrontisWebUserItem) => {
      const isTenantOwner = tenantOwnerUserId === user.id;

      if (isTenantOwner) {
        return {
          expiresLabel: "长期有效",
          typeLabel: "长期免费",
        };
      }

      return {
        expiresLabel: tenantSnapshot?.planExpiresAt
          ? `${tenantSnapshot.planExpiresAt} 到期`
          : seatExpiresAt,
        typeLabel: "",
      };
    },
    [seatExpiresAt, tenantOwnerUserId, tenantSnapshot?.planExpiresAt],
  );
  const filteredDepartmentMembers = useMemo(() => {
    const keyword = memberSearchKeyword.trim().toLowerCase();

    if (!keyword) {
      return departmentMembers;
    }

    return departmentMembers.filter(user => {
      const searchText = [
        user.name,
        user.phone,
        getUserRoleLabel(user),
        getUserStatusLabel(user.status),
        leadeepEnabledUserIds.has(user.id) ? "Leadeep 已开放" : "Leadeep 未开放",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(keyword);
    });
  }, [
    departmentMembers,
    getUserRoleLabel,
    leadeepEnabledUserIds,
    memberSearchKeyword,
  ]);

  /* ---------- 部门操作 ---------- */
  const handleOpenDeptCreate = useCallback((): void => {
    setDraftDept({ name: "", parentId: selectedDept?.id ?? null });
    setIsDeptCreateOpen(true);
  }, [selectedDept]);

  const handleSubmitDeptCreate = useCallback((): void => {
    const nextName = draftDept.name.trim();

    if (!nextName) {
      message.warning("请输入部门名称");
      return;
    }

    onAddDepartment({
      id: `dept-${Date.now()}`,
      leaderUserId: undefined,
      name: nextName,
      parentId: draftDept.parentId,
    });
    setIsDeptCreateOpen(false);
    message.success(`已创建部门：${nextName}`);
  }, [draftDept, onAddDepartment]);

  const handleOpenDeptEdit = useCallback((): void => {
    if (!selectedDept) {
      return;
    }

    setDraftDept({ name: selectedDept.name, parentId: selectedDept.parentId });
    setIsDeptEditOpen(true);
  }, [selectedDept]);

  const handleSubmitDeptEdit = useCallback((): void => {
    if (!selectedDept) {
      return;
    }

    const nextName = draftDept.name.trim();

    if (!nextName) {
      message.warning("请输入部门名称");
      return;
    }

    onUpdateDepartment(selectedDept.id, { name: nextName });
    setIsDeptEditOpen(false);
    message.success(`已更新部门：${nextName}`);
  }, [draftDept, onUpdateDepartment, selectedDept]);

  const handleDeleteDept = useCallback((): void => {
    if (!selectedDept) {
      return;
    }

    if (selectedDept.parentId === null) {
      message.warning("一级部门不可删除");
      return;
    }

    const hasChildren = departments.some(item => item.parentId === selectedDept.id);

    if (hasChildren) {
      message.warning("该部门下有子部门，请先删除子部门");
      return;
    }

    const hasMembers = users.some(user => user.departmentId === selectedDept.id);

    if (hasMembers) {
      message.warning("该部门下有成员，请先移除成员或将成员转移至其他部门");
      return;
    }

    onRemoveDepartment(selectedDept.id);

    const remaining = departments.filter(item => item.id !== selectedDept.id);

    if (remaining.length) {
      setSelectedDeptId(remaining[0].id);
    }

    message.success(`已删除部门：${selectedDept.name}`);
  }, [departments, onRemoveDepartment, selectedDept, users]);

  /* ---------- 成员操作 ---------- */
  const handleOpenUserCreate = useCallback((): void => {
    if (!tenantSnapshot) {
      message.warning("当前账号未绑定租户，无法添加成员。");
      return;
    }

    if (tenantSnapshot.edition !== "team") {
      message.warning("当前租户仍是个人版，请先通过团队扩充购买席位。");
      return;
    }

    if (remainingEffectiveSeats <= 0) {
      message.warning("当前有效席位额度不足，暂无法继续添加成员。");
      return;
    }

    setEditingUserId("");
    setDraftUser({
      departmentId: selectedDept?.id ?? "",
      name: "",
      phone: "",
      roleId: roleOptions[0]?.value ?? DEFAULT_TENANT_ROLE_IDS.employee,
    });
    setIsUserCreateOpen(true);
  }, [remainingEffectiveSeats, roleOptions, selectedDept, tenantSnapshot]);

  const handleOpenUserEdit = useCallback(
    (user: FrontisWebUserItem): void => {
      setEditingUserId(user.id);
      setDraftUser({
        departmentId: user.departmentId,
        name: user.name,
        phone: user.phone,
        roleId: getUserPrimaryRoleId(user, roles),
      });
      setIsUserEditOpen(true);
    },
    [roles],
  );

  const handleSubmitUserCreate = useCallback((): void => {
    const nextName = draftUser.name.trim();
    const nextPhone = draftUser.phone.trim();

    if (!nextName || !nextPhone) {
      message.warning("请填写姓名和手机号");
      return;
    }

    if (!onInviteTenantMember) {
      return;
    }

    const hasAdded = onInviteTenantMember({
      departmentId: draftUser.departmentId || selectedDept?.id || "dept-default",
      inviterName:
        tenantSnapshot?.users.find(item => item.id === tenantSnapshot.adminUserId)?.name ??
        "当前管理员",
      name: nextName,
      phone: nextPhone,
      role: getLegacyUserRoleByTenantRoleId(draftUser.roleId),
      roleIds: [draftUser.roleId],
    });

    if (!hasAdded) {
      return;
    }

    setIsUserCreateOpen(false);
    message.success(`已添加成员：${nextName}`);
  }, [draftUser, onInviteTenantMember, selectedDept, tenantSnapshot]);

  const handleSubmitUserEdit = useCallback((): void => {
    if (!editingUserId) {
      return;
    }

    const nextName = draftUser.name.trim();

    if (!nextName) {
      message.warning("请填写姓名");
      return;
    }

    onUpdateUser(editingUserId, {
      name: nextName,
      phone: draftUser.phone,
      role: getLegacyUserRoleByTenantRoleId(draftUser.roleId),
      roleIds: [draftUser.roleId],
    });

    const currentUser = users.find(item => item.id === editingUserId);

    if (currentUser && currentUser.departmentId !== draftUser.departmentId) {
      onUpdateUserDepartment(editingUserId, draftUser.departmentId);
    }

    setIsUserEditOpen(false);
    setEditingUserId("");
    message.success(`已更新成员：${nextName}`);
  }, [draftUser, editingUserId, onUpdateUser, onUpdateUserDepartment, users]);

  const handleSetLeader = useCallback(
    (userId: string): void => {
      if (!selectedDept) {
        return;
      }

      const targetUser = users.find(item => item.id === userId);

      onSetDepartmentLeader(selectedDept.id, userId);
      message.success(`已设置 ${targetUser?.name ?? ""} 为部门负责人`);
    },
    [onSetDepartmentLeader, selectedDept, users],
  );

  const handleToggleLeadeepAccess = useCallback((user: FrontisWebUserItem): void => {
    if (user.status !== "active") {
      message.warning("成员状态异常，不能开放 Leadeep 权限。");
      return;
    }

    setLeadeepEnabledUserIds(current => {
      const next = new Set(current);

      if (next.has(user.id)) {
        next.delete(user.id);
        message.success(`${user.name} 的 Leadeep 权限已关闭。`);
      } else {
        next.add(user.id);
        message.success(`${user.name} 已开放 Leadeep 权限，可在用户卡片扫码下载移动端。`);
      }

      return next;
    });
  }, []);

  /* ---------- 部门树左侧 ---------- */
  const renderDepartmentTree = (): JSX.Element => (
    <div className={adminStyles.consoleSidebar}>
      <div className={adminStyles.consolePaneHeader}>
        <h2 className={adminStyles.consolePaneTitle}>部门结构</h2>
        <div className={adminStyles.consoleActions} style={{ marginTop: 12 }}>
          {canManageDepartments ? (
            <>
              <Button size="small" icon={<PlusOutlined />} onClick={handleOpenDeptCreate}>
                新增部门
              </Button>
              <Button
                size="small"
                icon={<EditOutlined />}
                disabled={!selectedDept}
                onClick={handleOpenDeptEdit}
              >
                编辑
              </Button>
              <Popconfirm
                title="确认删除此部门？"
                description="有子部门或成员时无法删除"
                onConfirm={handleDeleteDept}
                okText="确认"
                cancelText="取消"
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!selectedDept || isRootDept}
                >
                  删除
                </Button>
              </Popconfirm>
            </>
          ) : null}
        </div>
      </div>

      <div className={adminStyles.consoleSidebarList}>
        {flatDepts.map(dept => {
          const depth = getDepartmentDepth(departments, dept.id);
          const memberCount = users.filter(item => item.departmentId === dept.id).length;
          const leader = dept.leaderUserId
            ? users.find(item => item.id === dept.leaderUserId)
            : null;

          return (
            <button
              key={dept.id}
              type="button"
              className={classNames(
                adminStyles.consoleSidebarItem,
                selectedDeptId === dept.id && adminStyles.consoleSidebarItemActive,
              )}
              style={{ paddingLeft: 12 + depth * 18 }}
              onClick={() => setSelectedDeptId(dept.id)}
            >
              <div className={adminStyles.consoleSidebarItemTitle}>{dept.name}</div>
              <div className={adminStyles.consoleSidebarItemMeta}>
                负责人 {leader?.name ?? "未指派"}
                <span className={adminStyles.consolePill} style={{ marginLeft: 8 }}>
                  {memberCount} 人
                </span>
              </div>
            </button>
          );
        })}
        {!flatDepts.length && (
          <div className={adminStyles.consoleEmpty} style={{ padding: 24 }}>
            暂无部门，请新增部门。
          </div>
        )}
      </div>
    </div>
  );

  /* ---------- 成员列表右侧 ---------- */
  const renderMemberPane = (): JSX.Element => {
    if (!selectedDept) {
      return (
        <div className={adminStyles.consoleContentPane}>
          <div className={adminStyles.consoleEmpty} style={{ padding: 48 }}>
            请在左侧选择一个部门
          </div>
        </div>
      );
    }

    return (
      <div className={adminStyles.consoleContentPane}>
        {/* 指标卡片 */}
        <div className={adminStyles.consoleSummaryStrip}>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>部门负责人</span>
            <span
              className={adminStyles.consoleSummaryValue}
              style={{ fontSize: 16, lineHeight: "24px" }}
            >
              {leaderUser?.name ?? "待设置"}
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>直属成员</span>
            <span
              className={adminStyles.consoleSummaryValue}
              style={{ fontSize: 16, lineHeight: "24px" }}
            >
              {directMembers.length}
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>Leadeep 已开放</span>
            <span
              className={adminStyles.consoleSummaryValue}
              style={{ fontSize: 16, lineHeight: "24px" }}
            >
              {departmentLeadeepEnabledCount}
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>下级部门</span>
            <span
              className={adminStyles.consoleSummaryValue}
              style={{ fontSize: 16, lineHeight: "24px" }}
            >
              {directChildren.length}
            </span>
          </div>
        </div>

        <div className={adminStyles.consoleToolbar} style={{ marginTop: 16 }}>
          <Input
            allowClear
            className={adminStyles.consoleInlineSearch}
            placeholder="搜索姓名、手机号、角色"
            prefix={<SearchOutlined />}
            value={memberSearchKeyword}
            onChange={event => setMemberSearchKeyword(event.target.value)}
          />
          <span className={adminStyles.consoleMetaTag}>
            {memberSearchKeyword.trim()
              ? `${filteredDepartmentMembers.length}/${departmentMembers.length} 人`
              : `${departmentMembers.length} 人`}
          </span>
        </div>

        {/* 成员表 */}
        <div className={adminStyles.consoleHtmlTableWrap} style={{ marginTop: 16 }}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>姓名</th>
                <th>手机号</th>
                <th>角色</th>
                <th>账号状态</th>
                <th>Leadeep 权限</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartmentMembers.length ? (
                filteredDepartmentMembers.map(user => (
                    <tr key={user.id}>
                      <td className={adminStyles.consoleHtmlTableStrong}>{user.name}</td>
                      <td>{user.phone}</td>
                      <td>
                        <span className={adminStyles.consolePill}>{getUserRoleLabel(user)}</span>
                      </td>
                      <td>
                        <span
                          className={adminStyles.consolePill}
                          style={{
                            background:
                              user.status === "active"
                                ? "rgba(22, 163, 74, 0.12)"
                                : "rgba(229, 72, 77, 0.12)",
                            color: user.status === "active" ? "#17a34a" : "#e5484d",
                          }}
                        >
                          {getUserStatusLabel(user.status)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={adminStyles.consolePill}
                          style={{
                            background: leadeepEnabledUserIds.has(user.id)
                              ? "rgba(15, 159, 143, 0.12)"
                              : "rgba(100, 113, 132, 0.12)",
                            color: leadeepEnabledUserIds.has(user.id) ? "#0f9f8f" : "#647184",
                          }}
                        >
                          {leadeepEnabledUserIds.has(user.id) ? "已开放" : "未开放"}
                        </span>
                      </td>
                      <td>
                        <div className={adminStyles.consoleActions}>
                          {/* 设负责人 */}
                          {canManageDepartments &&
                            user.status === "active" &&
                            selectedDept.leaderUserId !== user.id &&
                            user.departmentId === selectedDept.id && (
                              <Button size="small" onClick={() => handleSetLeader(user.id)}>
                                设负责人
                              </Button>
                            )}
                          {selectedDept.leaderUserId === user.id && (
                            <span className={adminStyles.consolePill}>当前负责人</span>
                          )}
                          {canEditMembers ? (
                            <Button size="small" onClick={() => handleOpenUserEdit(user)}>
                              编辑
                            </Button>
                          ) : null}
                          {canChangeMemberStatus ? (
                            <Button
                              size="small"
                              disabled={user.status !== "active"}
                              onClick={() => handleToggleLeadeepAccess(user)}
                            >
                              {leadeepEnabledUserIds.has(user.id) ? "关闭 Leadeep" : "开放 Leadeep"}
                            </Button>
                          ) : null}
                          {canChangeMemberStatus ? (
                            <Button
                              size="small"
                              danger={user.status === "active"}
                              onClick={() => {
                                const nextStatus: FrontisUserStatus =
                                  user.status === "active" ? "disabled" : "active";
                                onUpdateUserStatus(user.id, nextStatus);

                                if (
                                  nextStatus === "disabled" &&
                                  selectedDept.leaderUserId === user.id
                                ) {
                                  onSetDepartmentLeader(selectedDept.id, undefined);
                                }

                                if (nextStatus === "disabled") {
                                  setLeadeepEnabledUserIds(current => {
                                    const next = new Set(current);
                                    next.delete(user.id);
                                    return next;
                                  });
                                }

                                message.success(
                                  nextStatus === "active"
                                    ? `${user.name} 已启用，可继续使用工作台能力。`
                                    : `${user.name} 已禁用。`,
                                );
                              }}
                            >
                              {user.status === "active" ? "禁用" : "启用"}
                            </Button>
                          ) : null}
                          {canRemoveMembers ? (
                            <Popconfirm
                              title={`确认移除 ${user.name}？`}
                              onConfirm={() => {
                                if (selectedDept.leaderUserId === user.id) {
                                  onSetDepartmentLeader(selectedDept.id, undefined);
                                }

                                onRemoveUser(user.id);
                                message.success(`${user.name} 已移除。`);
                              }}
                              okText="移除"
                              cancelText="取消"
                            >
                              <Button size="small" danger>
                                移除
                              </Button>
                            </Popconfirm>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className={adminStyles.consoleEmpty}>
                      {departmentMembers.length ? "没有匹配的成员" : "当前部门暂无直属成员"}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const content = (
    <>
      {embedded ? null : (
        <header className={adminStyles.consoleHeader}>
          <div className={adminStyles.consoleHeaderMain}>
            <h1 className={adminStyles.consoleTitle}>组织管理</h1>
          </div>
          <div className={adminStyles.consoleActions}>
            {tenantSnapshot ? (
              <span className={adminStyles.consoleMetaTag}>
                有效席位 {usedEffectiveSeats}/{totalEffectiveSeats}
              </span>
            ) : null}
            {canManageTeamSeats ? (
              <>
                <Button
                  icon={<CreditCardOutlined />}
                  onClick={() => onOpenSubscriptionManage?.("renew")}
                >
                  续约
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => onOpenSubscriptionManage?.("addSeats")}
                >
                  增加席位
                </Button>
              </>
            ) : null}
            {onInviteTenantMember && canInviteMembers ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenUserCreate}>
                添加成员
              </Button>
            ) : null}
          </div>
        </header>
      )}

      {tenantSnapshot ? (
        <div className={adminStyles.consoleSummaryStrip} style={{ marginBottom: 16 }}>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>最大有效席位</span>
            <span className={adminStyles.consoleSummaryValue}>{totalEffectiveSeats}</span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>已占用席位</span>
            <span className={adminStyles.consoleSummaryValue}>{usedEffectiveSeats}</span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>可添加成员</span>
            <span className={adminStyles.consoleSummaryValue}>{remainingEffectiveSeats}</span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>席位有效期</span>
            <span
              className={adminStyles.consoleSummaryValue}
              style={{ fontSize: 16, lineHeight: "24px" }}
            >
              {seatExpiresAt}
            </span>
          </div>
        </div>
      ) : null}

      <div className={adminStyles.consoleSplitLayout}>
        {renderDepartmentTree()}
        {renderMemberPane()}
      </div>

      {/* 新增部门 */}
      <Modal
        title="新增部门"
        open={isDeptCreateOpen}
        okText="创建"
        cancelText="取消"
        onCancel={() => setIsDeptCreateOpen(false)}
        onOk={handleSubmitDeptCreate}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>上级部门</span>
            <span className={adminStyles.consoleInfoValue}>
              {draftDept.parentId
                ? buildDepartmentPath(departments, draftDept.parentId)
                : "顶级部门"}
            </span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>部门名称</span>
            <Input
              placeholder="请输入部门名称"
              value={draftDept.name}
              onChange={event =>
                setDraftDept(current => ({ ...current, name: event.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      {/* 编辑部门 */}
      <Modal
        title="编辑部门"
        open={isDeptEditOpen}
        okText="保存"
        cancelText="取消"
        onCancel={() => setIsDeptEditOpen(false)}
        onOk={handleSubmitDeptEdit}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>部门名称</span>
            <Input
              placeholder="请输入部门名称"
              value={draftDept.name}
              onChange={event =>
                setDraftDept(current => ({ ...current, name: event.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      {/* 添加成员 */}
      <Modal
        title="添加成员加入租户"
        open={isUserCreateOpen}
        okText="添加"
        cancelText="取消"
        okButtonProps={{ disabled: !canCreateUserBySeatRule }}
        onCancel={() => {
          setIsUserCreateOpen(false);
          setEditingUserId("");
        }}
        onOk={handleSubmitUserCreate}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>姓名</span>
            <Input
              placeholder="请输入成员姓名"
              value={draftUser.name}
              onChange={event =>
                setDraftUser(current => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>手机号</span>
            <Input
              placeholder="请输入手机号"
              value={draftUser.phone}
              onChange={event =>
                setDraftUser(current => ({
                  ...current,
                  phone: event.target.value.replace(/\D/g, "").slice(0, 11),
                }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>所属部门</span>
            <Select
              style={{ width: "100%" }}
              value={draftUser.departmentId}
              options={deptOptions}
              onChange={value => setDraftUser(current => ({ ...current, departmentId: value }))}
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>角色</span>
            <Select
              style={{ width: "100%" }}
              value={draftUser.roleId}
              options={roleOptions}
              disabled={!canAssignRoles}
              onChange={value => setDraftUser(current => ({ ...current, roleId: value }))}
            />
          </div>
        </div>
      </Modal>

      {/* 编辑成员 */}
      <Modal
        title="编辑成员"
        open={isUserEditOpen}
        okText="保存"
        cancelText="取消"
        onCancel={() => {
          setIsUserEditOpen(false);
          setEditingUserId("");
        }}
        onOk={handleSubmitUserEdit}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>姓名</span>
            <Input
              placeholder="请输入成员姓名"
              value={draftUser.name}
              onChange={event =>
                setDraftUser(current => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>手机号</span>
            <Input disabled value={draftUser.phone} />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>所属部门</span>
            <Select
              style={{ width: "100%" }}
              value={draftUser.departmentId}
              options={deptOptions}
              onChange={value => setDraftUser(current => ({ ...current, departmentId: value }))}
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>角色</span>
            <Select
              style={{ width: "100%" }}
              value={draftUser.roleId}
              options={roleOptions}
              disabled={!canAssignRoles}
              onChange={value => setDraftUser(current => ({ ...current, roleId: value }))}
            />
          </div>
        </div>
      </Modal>
    </>
  );

  if (embedded) {
    return content;
  }

  return <div className={adminStyles.consolePage}>{content}</div>;
};
