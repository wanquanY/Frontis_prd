import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, Modal, Select, message } from "antd";

import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import type { FrontisWebUserItem } from "../types";

import adminStyles from "./FrontisAdminViews.module.less";
import { getRoleLabel } from "./FrontisWebViews";

interface RolePermissionItem {
  id: string;
  label: string;
}

interface RolePermissionGroup {
  items: RolePermissionItem[];
  title: string;
}

interface TenantRoleItem {
  builtin: boolean;
  id: string;
  memberIds: string[];
  name: string;
  permissionIds: string[];
  scopeLabel: string;
}

interface DraftRoleForm {
  name: string;
  permissionIds: string[];
  scopeLabel: string;
}

export interface RoleManagementViewProps {
  tenantSnapshot: MockTenantManagementSnapshot;
  users: FrontisWebUserItem[];
}

const ROLE_PERMISSION_GROUPS: RolePermissionGroup[] = [
  {
    title: "工作台",
    items: [
      { id: "workspace.metaAgent.use", label: "使用 MetaAgent" },
      { id: "workspace.expert.use", label: "使用专家工作室" },
      { id: "workspace.trajectory.viewOwn", label: "查看本人轨迹" },
      { id: "workspace.deliverable.viewOwn", label: "查看本人成果" },
    ],
  },
  {
    title: "组织成员",
    items: [
      { id: "org.department.view", label: "查看组织架构" },
      { id: "org.department.manage", label: "管理部门" },
      { id: "org.member.invite", label: "邀请成员" },
      { id: "org.member.edit", label: "编辑成员" },
      { id: "org.member.status", label: "成员启停" },
      { id: "org.member.remove", label: "移除成员" },
      { id: "org.seat.manage", label: "席位管理" },
    ],
  },
  {
    title: "角色权限",
    items: [
      { id: "role.view", label: "查看角色" },
      { id: "role.custom.manage", label: "管理自定义角色" },
      { id: "role.assign", label: "分配成员角色" },
    ],
  },
  {
    title: "AI 专家",
    items: [
      { id: "agent.view", label: "查看 AI 专家" },
      { id: "agent.open", label: "开通 AI 专家" },
      { id: "agent.access.manage", label: "专家授权" },
      { id: "agent.share.manage", label: "团队分享管理" },
    ],
  },
  {
    title: "模型与设备",
    items: [
      { id: "model.view", label: "查看模型配置" },
      { id: "model.configure", label: "编辑模型配置" },
      { id: "device.view", label: "查看设备" },
      { id: "device.manage", label: "管理设备" },
    ],
  },
  {
    title: "积分与统计",
    items: [
      { id: "points.view", label: "查看积分" },
      { id: "points.recharge", label: "购买积分" },
      { id: "points.order.view", label: "查看订单" },
      { id: "analytics.self.view", label: "本人统计" },
      { id: "analytics.department.view", label: "部门统计" },
      { id: "analytics.tenant.view", label: "全租户统计" },
    ],
  },
];

const PERMISSION_LABEL_BY_ID = new Map(
  ROLE_PERMISSION_GROUPS.flatMap(group => group.items.map(item => [item.id, item.label])),
);

const DEFAULT_DRAFT_ROLE: DraftRoleForm = {
  name: "",
  permissionIds: [],
  scopeLabel: "全租户",
};

const createInitialRoles = (users: FrontisWebUserItem[]): TenantRoleItem[] => {
  const adminUsers = users.filter(user => user.role === "enterpriseAdmin");
  const leadUsers = users.filter(user => user.role === "departmentLead");
  const memberUsers = users.filter(user => user.role === "employee");

  return [
    {
      id: "role-enterprise-admin",
      builtin: true,
      name: "组织管理员",
      scopeLabel: "全租户",
      memberIds: adminUsers.map(user => user.id),
      permissionIds: ROLE_PERMISSION_GROUPS.flatMap(group => group.items.map(item => item.id)),
    },
    {
      id: "role-department-lead",
      builtin: true,
      name: "部门负责人",
      scopeLabel: "所属部门",
      memberIds: leadUsers.map(user => user.id),
      permissionIds: [
        "workspace.metaAgent.use",
        "workspace.expert.use",
        "workspace.trajectory.viewOwn",
        "workspace.deliverable.viewOwn",
        "org.department.view",
        "org.member.invite",
        "org.member.edit",
        "org.member.status",
        "agent.view",
        "agent.access.manage",
        "agent.share.manage",
        "model.view",
        "device.view",
        "points.view",
        "analytics.self.view",
        "analytics.department.view",
      ],
    },
    {
      id: "role-tenant-member",
      builtin: true,
      name: "普通成员",
      scopeLabel: "本人",
      memberIds: memberUsers.map(user => user.id),
      permissionIds: [
        "workspace.metaAgent.use",
        "workspace.expert.use",
        "workspace.trajectory.viewOwn",
        "workspace.deliverable.viewOwn",
        "agent.view",
        "points.view",
        "analytics.self.view",
      ],
    },
  ];
};

const getPermissionLabel = (permissionId: string): string =>
  PERMISSION_LABEL_BY_ID.get(permissionId) ?? permissionId;

/**
 * 组织角色与后台权限配置视图。
 */
export const RoleManagementView = ({
  tenantSnapshot,
  users,
}: RoleManagementViewProps): JSX.Element => {
  const [roles, setRoles] = useState<TenantRoleItem[]>(() => createInitialRoles(users));
  const [selectedRoleId, setSelectedRoleId] = useState<string>("role-enterprise-admin");
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [editingRoleId, setEditingRoleId] = useState<string>("");
  const [draftRole, setDraftRole] = useState<DraftRoleForm>(DEFAULT_DRAFT_ROLE);

  const selectedRole = useMemo<TenantRoleItem | null>(
    () => roles.find(role => role.id === selectedRoleId) ?? roles[0] ?? null,
    [roles, selectedRoleId],
  );

  const assignedUsers = useMemo<FrontisWebUserItem[]>(
    () => (selectedRole ? users.filter(user => selectedRole.memberIds.includes(user.id)) : []),
    [selectedRole, users],
  );

  const handleOpenCreate = useCallback((): void => {
    setEditingRoleId("");
    setDraftRole(DEFAULT_DRAFT_ROLE);
    setIsRoleModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((role: TenantRoleItem): void => {
    if (role.builtin) {
      message.info("平台预设角色不可编辑");
      return;
    }

    setEditingRoleId(role.id);
    setDraftRole({
      name: role.name,
      permissionIds: role.permissionIds,
      scopeLabel: role.scopeLabel,
    });
    setIsRoleModalOpen(true);
  }, []);

  const handleCloseModal = useCallback((): void => {
    setIsRoleModalOpen(false);
    setEditingRoleId("");
    setDraftRole(DEFAULT_DRAFT_ROLE);
  }, []);

  const handleSubmitRole = useCallback((): void => {
    const nextName = draftRole.name.trim();

    if (!nextName) {
      message.warning("请输入角色名称");
      return;
    }

    if (!draftRole.permissionIds.length) {
      message.warning("请至少选择一项权限");
      return;
    }

    if (editingRoleId) {
      setRoles(currentRoles =>
        currentRoles.map(role =>
          role.id === editingRoleId && !role.builtin
            ? {
                ...role,
                name: nextName,
                permissionIds: draftRole.permissionIds,
                scopeLabel: draftRole.scopeLabel,
              }
            : role,
        ),
      );
      setSelectedRoleId(editingRoleId);
      message.success("已保存");
      handleCloseModal();
      return;
    }

    const nextRole: TenantRoleItem = {
      id: `role-custom-${Date.now()}`,
      builtin: false,
      memberIds: [],
      name: nextName,
      permissionIds: draftRole.permissionIds,
      scopeLabel: draftRole.scopeLabel,
    };

    setRoles(currentRoles => [...currentRoles, nextRole]);
    setSelectedRoleId(nextRole.id);
    message.success("已创建");
    handleCloseModal();
  }, [draftRole, editingRoleId, handleCloseModal]);

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>角色管理</h1>
        </div>
        <div className={adminStyles.consoleActions}>
          <span className={adminStyles.consoleMetaTag}>
            {tenantSnapshot.edition === "team" ? "团队版" : "个人版"}
          </span>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            创建角色
          </Button>
        </div>
      </header>

      <div className={adminStyles.consoleSplitLayout}>
        <aside className={adminStyles.consoleSidebar}>
          <div className={adminStyles.consoleSidebarList}>
            {roles.map(role => (
              <button
                key={role.id}
                type="button"
                className={classNames(
                  adminStyles.consoleSidebarItem,
                  selectedRole?.id === role.id && adminStyles.consoleSidebarItemActive,
                )}
                onClick={() => setSelectedRoleId(role.id)}
              >
                <span className={adminStyles.consoleSidebarItemTitle}>{role.name}</span>
                <span className={adminStyles.consoleSidebarItemMeta}>
                  {role.scopeLabel}
                  <span className={adminStyles.consolePill}>{role.memberIds.length}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className={adminStyles.consoleContentPane}>
          {selectedRole ? (
            <>
              <div className={adminStyles.consolePaneHeader}>
                <div className={adminStyles.consolePaneHeaderMain}>
                  <h2 className={adminStyles.consolePaneTitle}>{selectedRole.name}</h2>
                  <div className={adminStyles.roleHeaderMeta}>
                    <span className={adminStyles.consolePill}>{selectedRole.scopeLabel}</span>
                    <span className={adminStyles.consolePill}>
                      {selectedRole.permissionIds.length} 项权限
                    </span>
                    <span className={adminStyles.consolePill}>{assignedUsers.length} 名成员</span>
                    {selectedRole.builtin ? (
                      <span className={adminStyles.consolePill}>平台预设</span>
                    ) : null}
                  </div>
                </div>
                {selectedRole.builtin ? null : (
                  <Button icon={<EditOutlined />} onClick={() => handleOpenEdit(selectedRole)}>
                    编辑
                  </Button>
                )}
              </div>

              <div className={adminStyles.consoleSection}>
                <h3 className={adminStyles.consoleSectionTitle}>权限</h3>
                <div className={adminStyles.rolePermissionMatrix}>
                  {ROLE_PERMISSION_GROUPS.map(group => (
                    <div key={group.title} className={adminStyles.rolePermissionMatrixGroup}>
                      <div className={adminStyles.rolePermissionMatrixTitle}>{group.title}</div>
                      <div className={adminStyles.rolePermissionMatrixList}>
                        {group.items.map(permission => {
                          const isEnabled = selectedRole.permissionIds.includes(permission.id);

                          return (
                            <div
                              key={permission.id}
                              className={adminStyles.rolePermissionMatrixRow}
                            >
                              <span>{permission.label}</span>
                              <span
                                className={classNames(
                                  adminStyles.rolePermissionMatrixStatus,
                                  !isEnabled && adminStyles.rolePermissionMatrixStatusMuted,
                                )}
                              >
                                {isEnabled ? "开启" : "关闭"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={adminStyles.consoleSection}>
                <div className={adminStyles.consoleSectionHeader}>
                  <h3 className={adminStyles.consoleSectionTitle}>成员</h3>
                </div>
                <div className={adminStyles.consoleHtmlTableWrap}>
                  <table className={adminStyles.consoleHtmlTable}>
                    <thead>
                      <tr>
                        <th>成员</th>
                        <th>组织角色</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedUsers.length ? (
                        assignedUsers.map(user => (
                          <tr key={user.id}>
                            <td>
                              <span className={adminStyles.consoleHtmlTableStrong}>
                                {user.name}
                              </span>
                              <div>{user.phone}</div>
                            </td>
                            <td>{getRoleLabel(user.role)}</td>
                            <td>{user.status === "active" ? "启用" : "停用"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3}>
                            <div className={adminStyles.consoleEmpty}>暂无成员</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className={adminStyles.consoleEmpty}>暂无角色</div>
          )}
        </section>
      </div>

      <Modal
        title={editingRoleId ? "编辑角色" : "创建角色"}
        open={isRoleModalOpen}
        okText={editingRoleId ? "保存" : "创建"}
        cancelText="取消"
        width={680}
        onCancel={handleCloseModal}
        onOk={handleSubmitRole}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>角色名称</span>
            <Input
              placeholder="请输入角色名称"
              value={draftRole.name}
              onChange={event =>
                setDraftRole(current => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>生效范围</span>
            <Select
              value={draftRole.scopeLabel}
              options={[
                { label: "全租户", value: "全租户" },
                { label: "所属部门", value: "所属部门" },
                { label: "指定成员", value: "指定成员" },
              ]}
              onChange={scopeLabel => setDraftRole(current => ({ ...current, scopeLabel }))}
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>权限</span>
            <div className={adminStyles.rolePermissionPicker}>
              {ROLE_PERMISSION_GROUPS.map(group => (
                <div key={group.title} className={adminStyles.rolePermissionPickerGroup}>
                  <div className={adminStyles.rolePermissionMatrixTitle}>{group.title}</div>
                  <Checkbox.Group
                    value={draftRole.permissionIds}
                    onChange={checkedValues =>
                      setDraftRole(current => ({
                        ...current,
                        permissionIds: checkedValues.map(String),
                      }))
                    }
                  >
                    <div className={adminStyles.rolePermissionCheckboxList}>
                      {group.items.map(permission => (
                        <Checkbox key={permission.id} value={permission.id}>
                          {getPermissionLabel(permission.id)}
                        </Checkbox>
                      ))}
                    </div>
                  </Checkbox.Group>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
