import { useCallback, useMemo, useState } from "react";

import classNames from "classnames";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, Modal, Popconfirm, message } from "antd";

import {
  DEPARTMENT_LEAD_PERMISSION_IDS,
  TENANT_MEMBER_PERMISSION_IDS,
  TENANT_ROLE_PERMISSION_GROUPS,
  TENANT_ROLE_PERMISSION_IDS,
} from "@/constants/tenantRolePermissions";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import type { FrontisWebUserItem } from "../types";

import adminStyles from "./FrontisAdminViews.module.less";

interface TenantRoleItem {
  builtin: boolean;
  id: string;
  memberIds: string[];
  name: string;
  permissionIds: string[];
}

interface DraftRoleForm {
  name: string;
  permissionIds: string[];
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
      memberIds: adminUsers.map(user => user.id),
      permissionIds: TENANT_ROLE_PERMISSION_IDS,
    },
    {
      id: "role-department-lead",
      builtin: true,
      name: "部门负责人",
      memberIds: leadUsers.map(user => user.id),
      permissionIds: DEPARTMENT_LEAD_PERMISSION_IDS,
    },
    {
      id: "role-tenant-member",
      builtin: true,
      name: "普通成员",
      memberIds: memberUsers.map(user => user.id),
      permissionIds: TENANT_MEMBER_PERMISSION_IDS,
    },
  ];
};

const getPermissionLabel = (permissionId: string): string =>
  PERMISSION_LABEL_BY_ID.get(permissionId) ?? permissionId;

const resolveNextPermissionIds = (
  currentPermissionIds: string[],
  permissionIds: string[],
  checked: boolean,
): string[] => {
  const permissionSet = new Set(currentPermissionIds);

  permissionIds.forEach(permissionId => {
    if (checked) {
      permissionSet.add(permissionId);
      return;
    }

    permissionSet.delete(permissionId);
  });

  return TENANT_ROLE_PERMISSION_IDS.filter(permissionId => permissionSet.has(permissionId));
};

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
  const selectedPermissionGroups = useMemo(
    () =>
      selectedRole
        ? TENANT_ROLE_PERMISSION_GROUPS.map(group => ({
            ...group,
            items: group.items.filter(permission =>
              selectedRole.permissionIds.includes(permission.id),
            ),
          })).filter(group => group.items.length > 0)
        : [],
    [selectedRole],
  );
  const isAllPermissionsChecked =
    draftRole.permissionIds.length === TENANT_ROLE_PERMISSION_IDS.length;
  const isAllPermissionsIndeterminate =
    draftRole.permissionIds.length > 0 &&
    draftRole.permissionIds.length < TENANT_ROLE_PERMISSION_IDS.length;

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
    });
    setIsRoleModalOpen(true);
  }, []);

  const handleCloseModal = useCallback((): void => {
    setIsRoleModalOpen(false);
    setEditingRoleId("");
    setDraftRole(DEFAULT_DRAFT_ROLE);
  }, []);

  const handleToggleAllPermissions = useCallback((checked: boolean): void => {
    setDraftRole(current => ({
      ...current,
      permissionIds: checked ? TENANT_ROLE_PERMISSION_IDS : [],
    }));
  }, []);

  const handleTogglePermissionGroup = useCallback(
    (permissionIds: string[], checked: boolean): void => {
      setDraftRole(current => ({
        ...current,
        permissionIds: resolveNextPermissionIds(current.permissionIds, permissionIds, checked),
      }));
    },
    [],
  );

  const handleTogglePermission = useCallback((permissionId: string, checked: boolean): void => {
    setDraftRole(current => ({
      ...current,
      permissionIds: resolveNextPermissionIds(current.permissionIds, [permissionId], checked),
    }));
  }, []);

  const handleDeleteRole = useCallback((role: TenantRoleItem): void => {
    if (role.builtin) {
      message.info("平台预设角色不可删除");
      return;
    }

    if (role.memberIds.length > 0) {
      message.warning("请先移除该角色下的成员");
      return;
    }

    setRoles(currentRoles => currentRoles.filter(item => item.id !== role.id));
    setSelectedRoleId(currentSelectedRoleId =>
      currentSelectedRoleId === role.id ? "role-enterprise-admin" : currentSelectedRoleId,
    );
    message.success("角色已删除");
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
                  <div className={adminStyles.consoleActions}>
                    <Button icon={<EditOutlined />} onClick={() => handleOpenEdit(selectedRole)}>
                      编辑
                    </Button>
                    <Popconfirm
                      title="删除角色"
                      description="删除后该自定义角色将从租户角色列表移除。"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDeleteRole(selectedRole)}
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </div>
                )}
              </div>

              <div className={adminStyles.consoleSection}>
                <h3 className={adminStyles.consoleSectionTitle}>权限</h3>
                <div className={adminStyles.rolePermissionTree}>
                  {selectedPermissionGroups.map(group => (
                    <div key={group.title} className={adminStyles.rolePermissionTreeGroup}>
                      <div className={adminStyles.rolePermissionTreeHeader}>
                        <span className={adminStyles.rolePermissionTreeTitle}>{group.title}</span>
                        <span className={adminStyles.consolePill}>{group.items.length} 项</span>
                      </div>
                      <div className={adminStyles.rolePermissionTreeItems}>
                        {group.items.map(permission => (
                          <div key={permission.id} className={adminStyles.rolePermissionTreeItem}>
                            <span className={adminStyles.rolePermissionTreeDot} />
                            <span>{permission.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
        width={720}
        className={adminStyles.roleEditorModal}
        style={{ top: 32, paddingBottom: 0 }}
        styles={{
          body: {
            maxHeight: "calc(100vh - 178px)",
            overflowY: "auto",
            paddingRight: 18,
          },
        }}
        onCancel={handleCloseModal}
        onOk={handleSubmitRole}
      >
        <div className={adminStyles.roleEditorBody}>
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
            <span className={adminStyles.consoleInfoLabel}>权限</span>
            <div className={adminStyles.rolePermissionPicker}>
              <div className={adminStyles.rolePermissionPickerToolbar}>
                <Checkbox
                  checked={isAllPermissionsChecked}
                  indeterminate={isAllPermissionsIndeterminate}
                  onChange={event => handleToggleAllPermissions(event.target.checked)}
                >
                  全部权限
                </Checkbox>
                <span className={adminStyles.consolePill}>
                  已选 {draftRole.permissionIds.length} / {TENANT_ROLE_PERMISSION_IDS.length}
                </span>
              </div>
              {TENANT_ROLE_PERMISSION_GROUPS.map(group => (
                <div key={group.title} className={adminStyles.rolePermissionPickerGroup}>
                  <div className={adminStyles.rolePermissionGroupHeader}>
                    <Checkbox
                      checked={group.items.every(permission =>
                        draftRole.permissionIds.includes(permission.id),
                      )}
                      indeterminate={
                        group.items.some(permission =>
                          draftRole.permissionIds.includes(permission.id),
                        ) &&
                        !group.items.every(permission =>
                          draftRole.permissionIds.includes(permission.id),
                        )
                      }
                      onChange={event =>
                        handleTogglePermissionGroup(
                          group.items.map(permission => permission.id),
                          event.target.checked,
                        )
                      }
                    >
                      <span className={adminStyles.rolePermissionMatrixTitle}>{group.title}</span>
                    </Checkbox>
                    <span className={adminStyles.consolePill}>
                      {
                        group.items.filter(permission =>
                          draftRole.permissionIds.includes(permission.id),
                        ).length
                      }
                      /{group.items.length}
                    </span>
                  </div>
                  <div className={adminStyles.rolePermissionCheckboxList}>
                    {group.items.map(permission => (
                      <Checkbox
                        key={permission.id}
                        checked={draftRole.permissionIds.includes(permission.id)}
                        onChange={event =>
                          handleTogglePermission(permission.id, event.target.checked)
                        }
                      >
                        {getPermissionLabel(permission.id)}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
