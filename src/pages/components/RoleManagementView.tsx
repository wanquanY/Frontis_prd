import { useCallback, useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, Modal, Popconfirm, message } from "antd";

import {
  createDefaultTenantRoles,
  DEFAULT_TENANT_ROLE_IDS,
  TENANT_ROLE_PERMISSION_GROUPS,
  TENANT_ROLE_PERMISSION_IDS,
  normalizeTenantRolePermissionIds,
  syncTenantRoleMembers,
  type TenantRolePermissionGroup,
  type TenantRolePermissionMenu,
  type TenantRoleItem,
} from "@/constants/tenantRolePermissions";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import type { FrontisWebUserItem } from "../types";

import adminStyles from "./FrontisAdminViews.module.less";

interface DraftRoleForm {
  name: string;
  permissionIds: string[];
}

export interface RoleManagementViewProps {
  onRolesChange?: (roles: TenantRoleItem[]) => void;
  onSelectedRoleIdChange?: (roleId: string) => void;
  canManageCustomRoles?: boolean;
  roles?: TenantRoleItem[];
  selectedRoleId?: string;
  tenantSnapshot: MockTenantManagementSnapshot;
  users: FrontisWebUserItem[];
  embedded?: boolean;
}

const PERMISSION_LABEL_BY_ID = new Map(
  TENANT_ROLE_PERMISSION_GROUPS.flatMap(group =>
    group.menus.flatMap(menu => menu.items.map(item => [item.id, item.label])),
  ),
);

const DEFAULT_DRAFT_ROLE: DraftRoleForm = {
  name: "",
  permissionIds: [],
};

const getPermissionLabel = (permissionId: string): string =>
  PERMISSION_LABEL_BY_ID.get(permissionId) ?? permissionId;

const getPermissionGroupItemIds = (group: TenantRolePermissionGroup): string[] =>
  group.menus.flatMap(menu => menu.items.map(item => item.id));

const getPermissionMenuItemIds = (menu: TenantRolePermissionMenu): string[] =>
  menu.items.map(item => item.id);

const isLeafPermissionMenu = (menu: TenantRolePermissionMenu): boolean =>
  menu.displayMode === "leaf";

const getSelectedPermissionCount = (permissionIds: string[], selectedPermissionIds: string[]) =>
  permissionIds.filter(permissionId => selectedPermissionIds.includes(permissionId)).length;

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
  onRolesChange,
  onSelectedRoleIdChange,
  canManageCustomRoles = true,
  roles: controlledRoles,
  selectedRoleId: controlledSelectedRoleId,
  users,
  embedded = false,
}: RoleManagementViewProps): JSX.Element => {
  const [innerRoles, setInnerRoles] = useState<TenantRoleItem[]>(() =>
    createDefaultTenantRoles(users),
  );
  const [innerSelectedRoleId, setInnerSelectedRoleId] = useState<string>(
    DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
  );
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [editingRoleId, setEditingRoleId] = useState<string>("");
  const [draftRole, setDraftRole] = useState<DraftRoleForm>(DEFAULT_DRAFT_ROLE);
  const roles = controlledRoles ?? innerRoles;
  const selectedRoleId = controlledSelectedRoleId ?? innerSelectedRoleId;

  const updateRoles = useCallback(
    (nextRoles: TenantRoleItem[]): void => {
      if (onRolesChange) {
        onRolesChange(nextRoles);
        return;
      }

      setInnerRoles(nextRoles);
    },
    [onRolesChange],
  );

  const updateSelectedRoleId = useCallback(
    (nextRoleId: string): void => {
      if (onSelectedRoleIdChange) {
        onSelectedRoleIdChange(nextRoleId);
        return;
      }

      setInnerSelectedRoleId(nextRoleId);
    },
    [onSelectedRoleIdChange],
  );

  useEffect(() => {
    if (controlledRoles) {
      return;
    }

    setInnerRoles(currentRoles => syncTenantRoleMembers(currentRoles, users));
  }, [controlledRoles, users]);

  const selectedRole = useMemo<TenantRoleItem | null>(
    () => roles.find(role => role.id === selectedRoleId) ?? roles[0] ?? null,
    [roles, selectedRoleId],
  );
  const selectedPermissionIds = useMemo<string[]>(
    () => (selectedRole ? normalizeTenantRolePermissionIds(selectedRole.permissionIds) : []),
    [selectedRole],
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
            menus: group.menus
              .map(menu => ({
                ...menu,
                items: menu.items.filter(permission =>
                  selectedPermissionIds.includes(permission.id),
                ),
              }))
              .filter(menu => menu.items.length > 0),
          })).filter(group => group.menus.length > 0)
        : [],
    [selectedPermissionIds, selectedRole],
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
    setEditingRoleId(role.id);
    setDraftRole({
      name: role.name,
      permissionIds: normalizeTenantRolePermissionIds(role.permissionIds),
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

  const handleDeleteRole = useCallback(
    (role: TenantRoleItem): void => {
      if (role.memberIds.length > 0) {
        message.warning("请先移除该角色下的成员");
        return;
      }

      const nextRoles = roles.filter(item => item.id !== role.id);

      updateRoles(nextRoles);
      updateSelectedRoleId(selectedRoleId === role.id ? (nextRoles[0]?.id ?? "") : selectedRoleId);
      message.success("角色已删除");
    },
    [roles, selectedRoleId, updateRoles, updateSelectedRoleId],
  );

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
      updateRoles(
        roles.map(role =>
          role.id === editingRoleId
            ? {
                ...role,
                name: nextName,
                permissionIds: normalizeTenantRolePermissionIds(draftRole.permissionIds),
              }
            : role,
        ),
      );
      updateSelectedRoleId(editingRoleId);
      message.success("已保存");
      handleCloseModal();
      return;
    }

    const nextRole: TenantRoleItem = {
      id: `role-custom-${Date.now()}`,
      builtin: false,
      memberIds: [],
      name: nextName,
      permissionIds: normalizeTenantRolePermissionIds(draftRole.permissionIds),
    };

    updateRoles([...roles, nextRole]);
    updateSelectedRoleId(nextRole.id);
    message.success("已创建");
    handleCloseModal();
  }, [draftRole, editingRoleId, handleCloseModal, roles, updateRoles, updateSelectedRoleId]);

  return (
    <div className={classNames(!embedded && adminStyles.consolePage)}>
      {embedded ? null : (
        <header className={adminStyles.consoleHeader}>
          <div className={adminStyles.consoleHeaderMain}>
            <h1 className={adminStyles.consoleTitle}>角色管理</h1>
          </div>
          <div className={adminStyles.consoleActions}>
            {canManageCustomRoles ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                创建角色
              </Button>
            ) : null}
          </div>
        </header>
      )}

      {embedded ? (
        <div className={adminStyles.consoleHeader}>
          <div className={adminStyles.consoleHeaderMain}>
            <h2 className={adminStyles.consolePaneTitle}>角色权限</h2>
          </div>
          <div className={adminStyles.consoleActions}>
            {canManageCustomRoles ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
                创建角色
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

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
                onClick={() => updateSelectedRoleId(role.id)}
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
                      {selectedPermissionIds.length} 项权限
                    </span>
                    <span className={adminStyles.consolePill}>{assignedUsers.length} 名成员</span>
                  </div>
                </div>
                {!canManageCustomRoles ? null : (
                  <div className={adminStyles.consoleActions}>
                    <Button icon={<EditOutlined />} onClick={() => handleOpenEdit(selectedRole)}>
                      编辑
                    </Button>
                    <Popconfirm
                      title="删除角色"
                      description="删除后该角色将从租户角色列表移除。"
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
                        <span className={adminStyles.consolePill}>
                          {getPermissionGroupItemIds(group).length} 项
                        </span>
                      </div>
                      <div className={adminStyles.rolePermissionTreeItems}>
                        {group.menus.map(menu =>
                          isLeafPermissionMenu(menu) ? (
                            <div
                              key={menu.title}
                              className={adminStyles.rolePermissionTreeMenuLeaf}
                            >
                              <span className={adminStyles.rolePermissionTreeDot} />
                              <strong>{menu.items[0]?.label ?? menu.title}</strong>
                            </div>
                          ) : (
                            <div key={menu.title} className={adminStyles.rolePermissionTreeMenu}>
                              <div className={adminStyles.rolePermissionTreeMenuHeader}>
                                <span className={adminStyles.rolePermissionTreeDot} />
                                <strong>{menu.title}</strong>
                              </div>
                              <div className={adminStyles.rolePermissionTreeFunctionList}>
                                {menu.items.map(permission => (
                                  <div
                                    key={permission.id}
                                    className={adminStyles.rolePermissionTreeItem}
                                  >
                                    <span className={adminStyles.rolePermissionTreeDot} />
                                    <span>{permission.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ),
                        )}
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
                      checked={getPermissionGroupItemIds(group).every(permissionId =>
                        draftRole.permissionIds.includes(permissionId),
                      )}
                      indeterminate={
                        getPermissionGroupItemIds(group).some(permissionId =>
                          draftRole.permissionIds.includes(permissionId),
                        ) &&
                        !getPermissionGroupItemIds(group).every(permissionId =>
                          draftRole.permissionIds.includes(permissionId),
                        )
                      }
                      onChange={event =>
                        handleTogglePermissionGroup(
                          getPermissionGroupItemIds(group),
                          event.target.checked,
                        )
                      }
                    >
                      <span className={adminStyles.rolePermissionMatrixTitle}>{group.title}</span>
                    </Checkbox>
                    <span className={adminStyles.consolePill}>
                      {getSelectedPermissionCount(
                        getPermissionGroupItemIds(group),
                        draftRole.permissionIds,
                      )}
                      /{getPermissionGroupItemIds(group).length}
                    </span>
                  </div>
                  <div className={adminStyles.rolePermissionPickerMenuList}>
                    {group.menus.map(menu => {
                      const menuPermissionIds = getPermissionMenuItemIds(menu);
                      const isMenuChecked = menuPermissionIds.every(permissionId =>
                        draftRole.permissionIds.includes(permissionId),
                      );
                      const isMenuIndeterminate =
                        menuPermissionIds.some(permissionId =>
                          draftRole.permissionIds.includes(permissionId),
                        ) && !isMenuChecked;

                      if (isLeafPermissionMenu(menu)) {
                        return (
                          <div
                            key={menu.title}
                            className={adminStyles.rolePermissionPickerMenuLeaf}
                          >
                            <Checkbox
                              checked={isMenuChecked}
                              onChange={event =>
                                handleTogglePermissionGroup(menuPermissionIds, event.target.checked)
                              }
                            >
                              <span className={adminStyles.rolePermissionMatrixTitle}>
                                {menu.items[0]?.label ?? menu.title}
                              </span>
                            </Checkbox>
                          </div>
                        );
                      }

                      return (
                        <div key={menu.title} className={adminStyles.rolePermissionPickerMenu}>
                          <div className={adminStyles.rolePermissionPickerMenuHeader}>
                            <Checkbox
                              checked={isMenuChecked}
                              indeterminate={isMenuIndeterminate}
                              onChange={event =>
                                handleTogglePermissionGroup(menuPermissionIds, event.target.checked)
                              }
                            >
                              <span className={adminStyles.rolePermissionMatrixTitle}>
                                {menu.title}
                              </span>
                            </Checkbox>
                            <span className={adminStyles.consolePill}>
                              {getSelectedPermissionCount(
                                menuPermissionIds,
                                draftRole.permissionIds,
                              )}
                              /{menuPermissionIds.length}
                            </span>
                          </div>
                          <div className={adminStyles.rolePermissionPickerFunctionList}>
                            {menu.items.map(permission => (
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
                      );
                    })}
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
