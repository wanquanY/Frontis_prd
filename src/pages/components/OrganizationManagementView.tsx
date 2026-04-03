import { useCallback, useMemo, useState } from "react";

import { ImportOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Popconfirm, Select, message } from "antd";

import type {
  EmployeeItem,
  FrontisUserRole,
  FrontisUserStatus,
  FrontisWebUserItem,
} from "../types";

import adminStyles from "./FrontisAdminViews.module.less";
import { getRoleLabel, getUserStatusLabel } from "./FrontisWebViews";

interface OrganizationManagementViewProps {
  employees: EmployeeItem[];
  onAddUsers: (users: FrontisWebUserItem[]) => void;
  onRemoveUser: (userId: string) => void;
  onUpdateUser: (
    userId: string,
    updates: Pick<FrontisWebUserItem, "name" | "phone" | "role">,
  ) => void;
  onUpdateUserStatus: (userId: string, status: FrontisUserStatus) => void;
  users: FrontisWebUserItem[];
}

interface DraftUserForm {
  name: string;
  phone: string;
  role: FrontisUserRole;
}

const DEFAULT_DRAFT_USER: DraftUserForm = {
  name: "",
  phone: "",
  role: "member",
};

const ROLE_OPTIONS: Array<{ label: string; value: FrontisUserRole }> = [
  { label: "企业老板", value: "boss" },
  { label: "企业管理员", value: "admin" },
  { label: "普通员工", value: "member" },
];

const buildRoleScopeLabel = (role: FrontisUserRole): string => {
  if (role === "boss") {
    return "可进入管理后台和对话工作台";
  }

  if (role === "admin") {
    return "可进入管理后台和对话工作台";
  }

  return "仅可进入对话工作台";
};

const buildAssignedAgentIds = (
  role: FrontisUserRole,
  employees: EmployeeItem[],
  existingAgentIds?: string[],
): string[] => {
  if (role === "member") {
    return existingAgentIds ?? employees.map(item => item.id);
  }

  return employees.map(item => item.id);
};

/**
 * 人员管理视图。
 */
export const OrganizationManagementView = ({
  employees,
  onAddUsers,
  onRemoveUser,
  onUpdateUser,
  onUpdateUserStatus,
  users,
}: OrganizationManagementViewProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<FrontisUserRole | "all">("all");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [isImportUserModalOpen, setIsImportUserModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string>("");
  const [draftUser, setDraftUser] = useState<DraftUserForm>(DEFAULT_DRAFT_USER);
  const [importText, setImportText] = useState<string>("");

  const filteredUsers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return users.filter(user => {
      const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;
      const matchesKeyword =
        !normalizedKeyword ||
        [user.name, user.phone].join(" ").toLowerCase().includes(normalizedKeyword);

      return matchesRole && matchesKeyword;
    });
  }, [keyword, roleFilter, users]);

  const handleOpenAddUserModal = useCallback((): void => {
    setEditingUserId("");
    setDraftUser(DEFAULT_DRAFT_USER);
    setIsAddUserModalOpen(true);
  }, []);

  const handleOpenEditUserModal = useCallback((user: FrontisWebUserItem): void => {
    setEditingUserId(user.id);
    setDraftUser({
      name: user.name,
      phone: user.phone,
      role: user.role,
    });
    setIsAddUserModalOpen(true);
  }, []);

  const handleSubmitUser = useCallback((): void => {
    const nextName = draftUser.name.trim();
    const nextPhone = draftUser.phone.trim();

    if (!nextName || !nextPhone) {
      message.warning("请填写姓名和手机号");
      return;
    }

    if (editingUserId) {
      onUpdateUser(editingUserId, {
        name: nextName,
        phone: nextPhone,
        role: draftUser.role,
      });
      setDraftUser(DEFAULT_DRAFT_USER);
      setEditingUserId("");
      setIsAddUserModalOpen(false);
      message.success(`已更新员工：${nextName}`);
      return;
    }

    onAddUsers([
      {
        assignedAgentIds: buildAssignedAgentIds(draftUser.role, employees),
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
    setDraftUser(DEFAULT_DRAFT_USER);
    setIsAddUserModalOpen(false);
    setEditingUserId("");
    message.success(`已添加员工：${nextName}`);
  }, [draftUser, editingUserId, employees, onAddUsers, onUpdateUser]);

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
      const [name = "", phone = "", roleValue = "member"] = row.split(",").map(item => item.trim());
      const normalizedRole =
        roleValue === "boss" || roleValue === "admin" || roleValue === "member"
          ? roleValue
          : "member";

      return {
        assignedAgentIds: buildAssignedAgentIds(normalizedRole, employees),
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
    setIsImportUserModalOpen(false);
    message.success(`已导入 ${nextUsers.length} 个员工`);
  }, [employees, importText, onAddUsers]);

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>人员管理</h1>
        </div>
        <div className={adminStyles.consoleHeaderSide}>
          <Button icon={<ImportOutlined />} onClick={() => setIsImportUserModalOpen(true)}>
            导入员工
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddUserModal}>
            添加员工
          </Button>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>人员列表</h2>
          </div>
          <div className={adminStyles.consoleActions}>
            <Input
              className={adminStyles.consoleControl}
              placeholder="搜索姓名或手机号"
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
            />
            <Select
              className={adminStyles.consoleControl}
              options={[
                { label: "全部角色", value: "all" },
                ...ROLE_OPTIONS,
              ]}
              value={roleFilter}
              onChange={value => setRoleFilter(value as FrontisUserRole | "all")}
            />
          </div>
        </div>

        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>姓名</th>
                <th>手机号</th>
                <th>角色</th>
                <th>权限范围</th>
                <th>账号状态</th>
                <th>最近活跃</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length ? (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td className={adminStyles.consoleHtmlTableStrong}>{user.name}</td>
                    <td>{user.phone}</td>
                    <td>{getRoleLabel(user.role)}</td>
                    <td>{buildRoleScopeLabel(user.role)}</td>
                    <td>{getUserStatusLabel(user.status)}</td>
                    <td>{user.lastActiveAt}</td>
                    <td>
                      <div className={adminStyles.consoleActions}>
                        <Button size="small" onClick={() => handleOpenEditUserModal(user)}>
                          编辑
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            const nextStatus: FrontisUserStatus =
                              user.status === "active" ? "disabled" : "active";
                            onUpdateUserStatus(user.id, nextStatus);
                            message.success(
                              `${user.name} 已${nextStatus === "active" ? "启用" : "禁用"}`,
                            );
                          }}
                        >
                          {user.status === "active" ? "禁用" : "启用"}
                        </Button>
                        <Popconfirm
                          title="确认移除此员工？"
                          onConfirm={() => {
                            onRemoveUser(user.id);
                            message.success(`${user.name} 已移除`);
                          }}
                          okText="确认"
                          cancelText="取消"
                        >
                          <Button size="small" danger>
                            移除
                          </Button>
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className={adminStyles.consoleEmpty}>当前没有匹配的员工。</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        title={editingUserId ? "编辑员工" : "添加员工"}
        open={isAddUserModalOpen}
        okText="确认"
        cancelText="取消"
        onCancel={() => {
          setIsAddUserModalOpen(false);
          setEditingUserId("");
          setDraftUser(DEFAULT_DRAFT_USER);
        }}
        onOk={handleSubmitUser}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>姓名</span>
            <Input
              placeholder="请输入员工姓名"
              value={draftUser.name}
              onChange={event =>
                setDraftUser(current => ({
                  ...current,
                  name: event.target.value,
                }))
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
                  phone: event.target.value,
                }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>角色</span>
            <Select
              className={adminStyles.consoleControl}
              value={draftUser.role}
              options={ROLE_OPTIONS}
              onChange={value =>
                setDraftUser(current => ({
                  ...current,
                  role: value,
                }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="导入员工"
        open={isImportUserModalOpen}
        okText="确认导入"
        cancelText="取消"
        onCancel={() => setIsImportUserModalOpen(false)}
        onOk={handleImportUsers}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>导入格式</span>
            <span className={adminStyles.consoleInfoValue}>每行一人：姓名,手机号,角色</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>角色值</span>
            <span className={adminStyles.consoleInfoValue}>boss / admin / member</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>员工数据</span>
            <Input.TextArea
              rows={8}
              placeholder={"张总,13800000021,boss\n李主管,13800000022,admin\n王晨,13800000023,member"}
              value={importText}
              onChange={event => setImportText(event.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
