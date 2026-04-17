import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import {
  DeleteOutlined,
  EditOutlined,
  ImportOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Input, Modal, Popconfirm, Select, message } from "antd";

import type {
  EmployeeItem,
  FrontisUserRole,
  FrontisUserStatus,
  FrontisWebUserItem,
  OrganizationDepartmentItem,
} from "../types";

import adminStyles from "./FrontisAdminViews.module.less";
import { getRoleLabel, getUserStatusLabel } from "./FrontisWebViews";

export interface OrganizationManagementViewProps {
  departments: OrganizationDepartmentItem[];
  employees: EmployeeItem[];
  onAddDepartment: (dept: OrganizationDepartmentItem) => void;
  onAddUsers: (users: FrontisWebUserItem[]) => void;
  onRemoveDepartment: (deptId: string) => void;
  onRemoveUser: (userId: string) => void;
  onSetDepartmentLeader: (deptId: string, userId: string | undefined) => void;
  onUpdateDepartment: (deptId: string, updates: Partial<Pick<OrganizationDepartmentItem, "name">>) => void;
  onUpdateUser: (
    userId: string,
    updates: Pick<FrontisWebUserItem, "name" | "phone" | "role">,
  ) => void;
  onUpdateUserDepartment: (userId: string, departmentId: string) => void;
  onUpdateUserStatus: (userId: string, status: FrontisUserStatus) => void;
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
  role: FrontisUserRole;
}

const MEMBER_ROLE_OPTIONS: Array<{ label: string; value: FrontisUserRole }> = [
  { label: "企业管理员", value: "enterpriseAdmin" },
  { label: "部门负责人", value: "departmentLead" },
  { label: "普通员工", value: "employee" },
];

const buildAssignedAgentIds = (
  role: FrontisUserRole,
  employees: EmployeeItem[],
): string[] => employees.map(item => item.id);

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
const buildDepartmentPath = (
  departments: OrganizationDepartmentItem[],
  deptId: string,
): string => {
  const pathParts: string[] = [];
  let current = departments.find(item => item.id === deptId);

  while (current) {
    pathParts.unshift(current.name);
    current = current.parentId ? departments.find(item => item.id === current!.parentId) : undefined;
  }

  return pathParts.join(" / ");
};

/**
 * 计算部门在树中的深度（root = 0）。
 */
const getDepartmentDepth = (
  departments: OrganizationDepartmentItem[],
  deptId: string,
): number => {
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
  employees,
  onAddDepartment,
  onAddUsers,
  onRemoveDepartment,
  onRemoveUser,
  onSetDepartmentLeader,
  onUpdateDepartment,
  onUpdateUser,
  onUpdateUserDepartment,
  onUpdateUserStatus,
  users,
}: OrganizationManagementViewProps): JSX.Element => {
  /* ---------- 选中部门 ---------- */
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    () => departments[0]?.id ?? "",
  );

  /* ---------- Modal 状态 ---------- */
  const [isDeptCreateOpen, setIsDeptCreateOpen] = useState(false);
  const [isDeptEditOpen, setIsDeptEditOpen] = useState(false);
  const [isUserCreateOpen, setIsUserCreateOpen] = useState(false);
  const [isUserEditOpen, setIsUserEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const [draftDept, setDraftDept] = useState<DraftDepartmentForm>({ name: "", parentId: null });
  const [draftUser, setDraftUser] = useState<DraftUserForm>({
    departmentId: "",
    name: "",
    phone: "",
    role: "employee",
  });
  const [editingUserId, setEditingUserId] = useState("");
  const [importText, setImportText] = useState("");

  /* ---------- 派生数据 ---------- */
  const flatDepts = useMemo(
    () => flattenDepartmentTree(departments),
    [departments],
  );

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

  const leaderUser = useMemo(
    () =>
      selectedDept?.leaderUserId
        ? users.find(item => item.id === selectedDept.leaderUserId) ?? null
        : null,
    [selectedDept, users],
  );
  const isRootDept = selectedDept?.parentId === null;

  const deptOptions = useMemo(
    () => departments.map(item => ({ label: buildDepartmentPath(departments, item.id), value: item.id })),
    [departments],
  );

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
    setEditingUserId("");
    setDraftUser({
      departmentId: selectedDept?.id ?? "",
      name: "",
      phone: "",
      role: "employee",
    });
    setIsUserCreateOpen(true);
  }, [selectedDept]);

  const handleOpenUserEdit = useCallback((user: FrontisWebUserItem): void => {
    setEditingUserId(user.id);
    setDraftUser({
      departmentId: user.departmentId,
      name: user.name,
      phone: user.phone,
      role: user.role,
    });
    setIsUserEditOpen(true);
  }, []);

  const handleSubmitUserCreate = useCallback((): void => {
    const nextName = draftUser.name.trim();
    const nextPhone = draftUser.phone.trim();

    if (!nextName || !nextPhone) {
      message.warning("请填写姓名和手机号");
      return;
    }

    onAddUsers([
      {
        assignedAgentIds: buildAssignedAgentIds(draftUser.role, employees),
        departmentId: draftUser.departmentId || selectedDept?.id || "dept-default",
        dialogueCount: 0,
        id: `user-${Date.now()}`,
        lastActiveAt: "从未使用",
        name: nextName,
        phone: nextPhone,
        resultCount: 0,
        role: draftUser.role,
        status: "active",
        tokenUsage: 0,
      },
    ]);
    setIsUserCreateOpen(false);
    message.success(`已添加员工：${nextName}`);
  }, [draftUser, employees, onAddUsers, selectedDept]);

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
      role: draftUser.role,
    });

    const currentUser = users.find(item => item.id === editingUserId);

    if (currentUser && currentUser.departmentId !== draftUser.departmentId) {
      onUpdateUserDepartment(editingUserId, draftUser.departmentId);
    }

    setIsUserEditOpen(false);
    setEditingUserId("");
    message.success(`已更新员工：${nextName}`);
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

  const handleImportUsers = useCallback((): void => {
    const rows = importText
      .split("\n")
      .map(item => item.trim())
      .filter(Boolean);

    if (!rows.length) {
      message.warning("请输入导入内容");
      return;
    }

    const nextUsers: FrontisWebUserItem[] = rows.map((row, index) => {
      const [name = "", phone = "", roleValue = "employee"] = row
        .split(",")
        .map(item => item.trim());
      const normalizedRole: FrontisUserRole =
        roleValue === "enterpriseAdmin" || roleValue === "departmentLead" || roleValue === "employee"
          ? roleValue
          : "employee";

      return {
        assignedAgentIds: buildAssignedAgentIds(normalizedRole, employees),
        departmentId: selectedDept?.id ?? "dept-default",
        dialogueCount: 0,
        id: `imported-user-${Date.now()}-${index}`,
        lastActiveAt: "从未使用",
        name: name || `导入员工${index + 1}`,
        phone: phone || `1380000${String(index).padStart(4, "0")}`,
        resultCount: 0,
        role: normalizedRole,
        status: "active",
        tokenUsage: 0,
      };
    });

    onAddUsers(nextUsers);
    setImportText("");
    setIsImportOpen(false);
    message.success(`已导入 ${nextUsers.length} 个员工`);
  }, [employees, importText, onAddUsers, selectedDept]);

  /* ---------- 部门树左侧 ---------- */
  const renderDepartmentTree = (): JSX.Element => (
    <div className={adminStyles.consoleSidebar}>
      <div className={adminStyles.consolePaneHeader}>
        <h2 className={adminStyles.consolePaneTitle}>部门结构</h2>
        <div className={adminStyles.consoleActions} style={{ marginTop: 12 }}>
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
        <div className={adminStyles.consolePaneHeader}>
          <h2 className={adminStyles.consolePaneTitle}>{selectedDept.name} · 成员</h2>
          <div className={adminStyles.consoleSidebarItemMeta} style={{ marginTop: 4 }}>
            {buildDepartmentPath(departments, selectedDept.id)}
          </div>
        </div>

        {/* 指标卡片 */}
        <div className={adminStyles.consoleSummaryStrip}>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>部门负责人</span>
            <span className={adminStyles.consoleSummaryValue} style={{ fontSize: 16, lineHeight: "24px" }}>
              {leaderUser?.name ?? "待设置"}
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>直属成员</span>
            <span className={adminStyles.consoleSummaryValue} style={{ fontSize: 16, lineHeight: "24px" }}>
              {directMembers.length}
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>下级部门</span>
            <span className={adminStyles.consoleSummaryValue} style={{ fontSize: 16, lineHeight: "24px" }}>
              {directChildren.length}
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className={adminStyles.consoleActions} style={{ marginTop: 16 }}>
          <Button icon={<ImportOutlined />} onClick={() => setIsImportOpen(true)}>
            Excel导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenUserCreate}>
            添加员工
          </Button>
        </div>

        {/* 成员表 */}
        <div className={adminStyles.consoleHtmlTableWrap} style={{ marginTop: 16 }}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>姓名</th>
                <th>手机号</th>
                <th>角色</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {departmentMembers.length ? (
                departmentMembers.map(user => (
                  <tr key={user.id}>
                    <td className={adminStyles.consoleHtmlTableStrong}>{user.name}</td>
                    <td>{user.phone}</td>
                    <td>
                      <span className={adminStyles.consolePill}>{getRoleLabel(user.role)}</span>
                    </td>
                    <td>
                      <span
                        className={adminStyles.consolePill}
                        style={{
                          background: user.status === "active"
                            ? "rgba(22, 163, 74, 0.12)"
                            : "rgba(229, 72, 77, 0.12)",
                          color: user.status === "active" ? "#17a34a" : "#e5484d",
                        }}
                      >
                        {getUserStatusLabel(user.status)}
                      </span>
                    </td>
                    <td>
                      <div className={adminStyles.consoleActions}>
                        {/* 设负责人 */}
                        {user.status === "active" &&
                          selectedDept.leaderUserId !== user.id &&
                          user.departmentId === selectedDept.id && (
                          <Button size="small" onClick={() => handleSetLeader(user.id)}>
                            设负责人
                          </Button>
                        )}
                        {selectedDept.leaderUserId === user.id && (
                          <span className={adminStyles.consolePill}>当前负责人</span>
                        )}
                        <Button size="small" onClick={() => handleOpenUserEdit(user)}>
                          编辑
                        </Button>
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

                            message.success(
                              `${user.name} 已${nextStatus === "active" ? "启用" : "停用"}`,
                            );
                          }}
                        >
                          {user.status === "active" ? "停用" : "启用"}
                        </Button>
                        <Popconfirm
                          title={`确认删除 ${user.name}？`}
                          onConfirm={() => {
                            if (selectedDept.leaderUserId === user.id) {
                              onSetDepartmentLeader(selectedDept.id, undefined);
                            }

                            onRemoveUser(user.id);
                            message.success(`${user.name} 已删除`);
                          }}
                          okText="确认"
                          cancelText="取消"
                        >
                          <Button size="small" danger>
                            删除
                          </Button>
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className={adminStyles.consoleEmpty}>当前部门暂无直属成员</div>
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
            <p className={adminStyles.consoleSubtitle}>
              管理企业组织架构，维护部门结构与人员信息。
            </p>
          </div>
        </header>
      )}

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

      {/* 添加员工 */}
      <Modal
        title="添加员工"
        open={isUserCreateOpen}
        okText="创建"
        cancelText="取消"
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
              placeholder="请输入员工姓名"
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
                setDraftUser(current => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>所属部门</span>
            <Select
              style={{ width: "100%" }}
              value={draftUser.departmentId}
              options={deptOptions}
              onChange={value =>
                setDraftUser(current => ({ ...current, departmentId: value }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>角色</span>
            <Select
              style={{ width: "100%" }}
              value={draftUser.role}
              options={MEMBER_ROLE_OPTIONS}
              onChange={value =>
                setDraftUser(current => ({ ...current, role: value }))
              }
            />
          </div>
        </div>
      </Modal>

      {/* 编辑员工 */}
      <Modal
        title="编辑员工"
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
              placeholder="请输入员工姓名"
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
              onChange={value =>
                setDraftUser(current => ({ ...current, departmentId: value }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>角色</span>
            <Select
              style={{ width: "100%" }}
              value={draftUser.role}
              options={MEMBER_ROLE_OPTIONS}
              onChange={value =>
                setDraftUser(current => ({ ...current, role: value }))
              }
            />
          </div>
        </div>
      </Modal>

      {/* Excel导入 */}
      <Modal
        title="Excel导入员工"
        open={isImportOpen}
        okText="开始导入"
        cancelText="取消"
        onCancel={() => setIsImportOpen(false)}
        onOk={handleImportUsers}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>导入目标</span>
            <span className={adminStyles.consoleInfoValue}>
              {selectedDept ? buildDepartmentPath(departments, selectedDept.id) : "未选择部门"}
            </span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>导入格式</span>
            <span className={adminStyles.consoleInfoValue}>每行一人：姓名,手机号,角色</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>粘贴内容</span>
            <Input.TextArea
              rows={8}
              placeholder={
                "张三,13800000021,employee\n李四,13800000022,departmentLead\n王五,13800000023,enterpriseAdmin"
              }
              value={importText}
              onChange={event => setImportText(event.target.value)}
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
