import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, Modal, Select, message } from "antd";

import {
  DEPARTMENT_LEAD_PERMISSION_IDS,
  TENANT_MEMBER_PERMISSION_IDS,
  TENANT_ROLE_PERMISSION_GROUPS,
  TENANT_ROLE_PERMISSION_IDS,
} from "@/constants/tenantRolePermissions";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import type { FrontisWebUserItem } from "../types";

import adminStyles from "./FrontisAdminViews.module.less";
import { getRoleLabel } from "./FrontisWebViews";

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

const PERMISSION_LABEL_BY_ID = new Map(
  TENANT_ROLE_PERMISSION_GROUPS.flatMap(group => group.items.map(item => [item.id, item.label])),
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
      permissionIds: TENANT_ROLE_PERMISSION_IDS,
    },
    {
      id: "role-department-lead",
      builtin: true,
      name: "部门负责人",
      scopeLabel: "所属部门",
      memberIds: leadUsers.map(user => user.id),
      permissionIds: DEPARTMENT_LEAD_PERMISSION_IDS,
    },
    {
      id: "role-tenant-member",
      builtin: true,
      name: "普通成员",
      scopeLabel: "本人",
      memberIds: memberUsers.map(user => user.id),
      permissionIds: TENANT_MEMBER_PERMISSION_IDS,
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
                  {TENANT_ROLE_PERMISSION_GROUPS.map(group => (
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
              {TENANT_ROLE_PERMISSION_GROUPS.map(group => (
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
