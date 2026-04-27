import { useCallback, useMemo, useState } from "react";

import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, Modal, Select, message } from "antd";
import classNames from "classnames";

import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import styles from "./OperationsPlatformView.module.less";

interface PermissionItem {
  id: string;
  label: string;
}

interface PermissionGroup {
  items: PermissionItem[];
  title: string;
}

interface OperationsRoleItem {
  builtin: boolean;
  id: string;
  memberIds: string[];
  name: string;
  permissionIds: string[];
  scopeLabel: string;
}

interface OperationsAccountItem {
  id: string;
  name: string;
  phone: string;
  roleId: string;
  status: "active" | "disabled";
}

interface TenantPresetRoleItem {
  id: string;
  name: string;
  permissionIds: string[];
  scopeLabel: string;
}

interface DraftRoleForm {
  name: string;
  permissionIds: string[];
  scopeLabel: string;
}

interface DraftAccountForm {
  name: string;
  phone: string;
  roleId: string;
}

type OrganizationConsoleTabKey = "accounts" | "operationRoles" | "tenantPresets";

const OPERATION_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "租户",
    items: [
      { id: "tenant.create", label: "创建租户" },
      { id: "tenant.edit", label: "编辑租户" },
      { id: "tenant.status", label: "启停租户" },
      { id: "tenant.member.manage", label: "管理租户成员" },
    ],
  },
  {
    title: "商品",
    items: [
      { id: "product.manage", label: "管理商品" },
      { id: "order.view", label: "查看订单" },
      { id: "fulfillment.manage", label: "处理交付" },
      { id: "points.manage", label: "积分运营" },
    ],
  },
  {
    title: "AI 专家",
    items: [
      { id: "agent.review", label: "上架审批" },
      { id: "agent.plaza.manage", label: "广场管理" },
      { id: "agent.category.manage", label: "分类管理" },
      { id: "agent.contact.manage", label: "客服配置" },
    ],
  },
  {
    title: "平台",
    items: [
      { id: "ops.account.manage", label: "运营账号" },
      { id: "ops.role.manage", label: "运营角色" },
      { id: "tenant.preset.manage", label: "预设角色" },
      { id: "resource.manage", label: "资源池" },
    ],
  },
];

const TENANT_PERMISSION_GROUPS: PermissionGroup[] = [
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

const DEFAULT_ROLE_FORM: DraftRoleForm = {
  name: "",
  permissionIds: [],
  scopeLabel: "全平台",
};

const DEFAULT_ACCOUNT_FORM: DraftAccountForm = {
  name: "",
  phone: "",
  roleId: "ops-role-operator-admin",
};

const getPermissionIds = (groups: PermissionGroup[]): string[] =>
  groups.flatMap(group => group.items.map(item => item.id));

const createInitialOperationRoles = (): OperationsRoleItem[] => [
  {
    id: "ops-role-super-admin",
    builtin: true,
    name: "平台超管",
    scopeLabel: "全平台",
    memberIds: ["ops-account-001"],
    permissionIds: getPermissionIds(OPERATION_PERMISSION_GROUPS),
  },
  {
    id: "ops-role-operator-admin",
    builtin: true,
    name: "运营管理员",
    scopeLabel: "全平台",
    memberIds: ["ops-account-002"],
    permissionIds: [
      "tenant.create",
      "tenant.edit",
      "tenant.status",
      "tenant.member.manage",
      "product.manage",
      "order.view",
      "fulfillment.manage",
      "points.manage",
      "agent.review",
      "agent.plaza.manage",
      "agent.category.manage",
      "agent.contact.manage",
    ],
  },
  {
    id: "ops-role-service",
    builtin: true,
    name: "客服运营",
    scopeLabel: "服务工单",
    memberIds: [],
    permissionIds: ["tenant.edit", "order.view", "fulfillment.manage", "agent.contact.manage"],
  },
];

const createInitialAccounts = (): OperationsAccountItem[] => [
  {
    id: "ops-account-001",
    name: "周明越",
    phone: "13800008881",
    roleId: "ops-role-super-admin",
    status: "active",
  },
  {
    id: "ops-account-002",
    name: "陈可心",
    phone: "13800008882",
    roleId: "ops-role-operator-admin",
    status: "active",
  },
];

const createInitialTenantPresets = (): TenantPresetRoleItem[] => [
  {
    id: "tenant-preset-org-admin",
    name: "组织管理员",
    scopeLabel: "全租户",
    permissionIds: getPermissionIds(TENANT_PERMISSION_GROUPS),
  },
  {
    id: "tenant-preset-department-lead",
    name: "部门负责人",
    scopeLabel: "所属部门",
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
    id: "tenant-preset-member",
    name: "普通成员",
    scopeLabel: "本人",
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

const TAB_OPTIONS: Array<{ key: OrganizationConsoleTabKey; label: string }> = [
  { key: "accounts", label: "运营账号" },
  { key: "operationRoles", label: "运营角色" },
  { key: "tenantPresets", label: "平台预设角色" },
];

const getRoleLabel = (roles: OperationsRoleItem[], roleId: string): string =>
  roles.find(role => role.id === roleId)?.name ?? "未分配";

const renderPermissionMatrix = (
  groups: PermissionGroup[],
  permissionIds: string[],
): JSX.Element => (
  <div className={adminStyles.rolePermissionMatrix}>
    {groups.map(group => (
      <div key={group.title} className={adminStyles.rolePermissionMatrixGroup}>
        <div className={adminStyles.rolePermissionMatrixTitle}>{group.title}</div>
        <div className={adminStyles.rolePermissionMatrixList}>
          {group.items.map(permission => {
            const isEnabled = permissionIds.includes(permission.id);

            return (
              <div key={permission.id} className={adminStyles.rolePermissionMatrixRow}>
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
);

/**
 * 运营后台组织、运营角色与全平台预设角色管理视图。
 */
export const OperationsOrganizationConsole = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<OrganizationConsoleTabKey>("accounts");
  const [operationRoles, setOperationRoles] = useState<OperationsRoleItem[]>(
    createInitialOperationRoles,
  );
  const [accounts, setAccounts] = useState<OperationsAccountItem[]>(createInitialAccounts);
  const [tenantPresets, setTenantPresets] = useState<TenantPresetRoleItem[]>(
    createInitialTenantPresets,
  );
  const [selectedOperationRoleId, setSelectedOperationRoleId] =
    useState<string>("ops-role-operator-admin");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("tenant-preset-org-admin");
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isOperationRoleModalOpen, setIsOperationRoleModalOpen] = useState<boolean>(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [editingOperationRoleId, setEditingOperationRoleId] = useState<string>("");
  const [editingPresetId, setEditingPresetId] = useState<string>("");
  const [draftAccount, setDraftAccount] = useState<DraftAccountForm>(DEFAULT_ACCOUNT_FORM);
  const [draftRole, setDraftRole] = useState<DraftRoleForm>(DEFAULT_ROLE_FORM);
  const [draftPreset, setDraftPreset] = useState<DraftRoleForm>(DEFAULT_ROLE_FORM);

  const selectedOperationRole = useMemo<OperationsRoleItem | null>(
    () => operationRoles.find(role => role.id === selectedOperationRoleId) ?? operationRoles[0],
    [operationRoles, selectedOperationRoleId],
  );
  const selectedPreset = useMemo<TenantPresetRoleItem | null>(
    () => tenantPresets.find(role => role.id === selectedPresetId) ?? tenantPresets[0],
    [selectedPresetId, tenantPresets],
  );

  const handleOpenAccountModal = useCallback((): void => {
    setDraftAccount(DEFAULT_ACCOUNT_FORM);
    setIsAccountModalOpen(true);
  }, []);

  const handleCreateAccount = useCallback((): void => {
    const name = draftAccount.name.trim();
    const phone = draftAccount.phone.trim();

    if (!name || !phone) {
      message.warning("请填写账号信息");
      return;
    }

    const nextAccount: OperationsAccountItem = {
      id: `ops-account-${Date.now()}`,
      name,
      phone,
      roleId: draftAccount.roleId,
      status: "active",
    };

    setAccounts(current => [...current, nextAccount]);
    setOperationRoles(current =>
      current.map(role =>
        role.id === draftAccount.roleId
          ? { ...role, memberIds: [...role.memberIds, nextAccount.id] }
          : role,
      ),
    );
    setIsAccountModalOpen(false);
    message.success("已创建账号");
  }, [draftAccount]);

  const handleOpenCreateOperationRole = useCallback((): void => {
    setEditingOperationRoleId("");
    setDraftRole(DEFAULT_ROLE_FORM);
    setIsOperationRoleModalOpen(true);
  }, []);

  const handleOpenEditOperationRole = useCallback((role: OperationsRoleItem): void => {
    if (role.builtin) {
      message.info("系统角色不可编辑");
      return;
    }

    setEditingOperationRoleId(role.id);
    setDraftRole({
      name: role.name,
      permissionIds: role.permissionIds,
      scopeLabel: role.scopeLabel,
    });
    setIsOperationRoleModalOpen(true);
  }, []);

  const handleSubmitOperationRole = useCallback((): void => {
    const name = draftRole.name.trim();

    if (!name || !draftRole.permissionIds.length) {
      message.warning("请填写角色名称并选择权限");
      return;
    }

    if (editingOperationRoleId) {
      setOperationRoles(current =>
        current.map(role =>
          role.id === editingOperationRoleId && !role.builtin
            ? {
                ...role,
                name,
                permissionIds: draftRole.permissionIds,
                scopeLabel: draftRole.scopeLabel,
              }
            : role,
        ),
      );
      setSelectedOperationRoleId(editingOperationRoleId);
    } else {
      const nextRole: OperationsRoleItem = {
        id: `ops-role-custom-${Date.now()}`,
        builtin: false,
        memberIds: [],
        name,
        permissionIds: draftRole.permissionIds,
        scopeLabel: draftRole.scopeLabel,
      };

      setOperationRoles(current => [...current, nextRole]);
      setSelectedOperationRoleId(nextRole.id);
    }

    setIsOperationRoleModalOpen(false);
    message.success("已保存");
  }, [draftRole, editingOperationRoleId]);

  const handleOpenPresetModal = useCallback((role: TenantPresetRoleItem): void => {
    setEditingPresetId(role.id);
    setSelectedPresetId(role.id);
    setDraftPreset({
      name: role.name,
      permissionIds: role.permissionIds,
      scopeLabel: role.scopeLabel,
    });
    setIsPresetModalOpen(true);
  }, []);

  const handleOpenCreatePreset = useCallback((): void => {
    setEditingPresetId("");
    setDraftPreset({
      name: "",
      permissionIds: [],
      scopeLabel: "全租户",
    });
    setIsPresetModalOpen(true);
  }, []);

  const handleClosePresetModal = useCallback((): void => {
    setEditingPresetId("");
    setDraftPreset(DEFAULT_ROLE_FORM);
    setIsPresetModalOpen(false);
  }, []);

  const handleSubmitPreset = useCallback((): void => {
    const name = draftPreset.name.trim();

    if (!name) {
      message.warning("请输入角色名称");
      return;
    }

    if (!draftPreset.permissionIds.length) {
      message.warning("请至少选择一项权限");
      return;
    }

    if (editingPresetId) {
      setTenantPresets(current =>
        current.map(role =>
          role.id === editingPresetId
            ? {
                ...role,
                name,
                permissionIds: draftPreset.permissionIds,
                scopeLabel: draftPreset.scopeLabel,
              }
            : role,
        ),
      );
      setSelectedPresetId(editingPresetId);
    } else {
      const nextPreset: TenantPresetRoleItem = {
        id: `tenant-preset-custom-${Date.now()}`,
        name,
        permissionIds: draftPreset.permissionIds,
        scopeLabel: draftPreset.scopeLabel,
      };

      setTenantPresets(current => [...current, nextPreset]);
      setSelectedPresetId(nextPreset.id);
    }

    handleClosePresetModal();
    message.success("已保存预设");
  }, [draftPreset, editingPresetId, handleClosePresetModal]);

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>组织管理</h1>
        </div>
      </header>

      <div className={styles.detailTabBar}>
        {TAB_OPTIONS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={classNames(
              styles.detailTabButton,
              activeTab === tab.key && styles.detailTabButtonActive,
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "accounts" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <h2 className={adminStyles.consoleSectionTitle}>运营账号</h2>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAccountModal}>
              创建账号
            </Button>
          </div>
          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>账号</th>
                  <th>手机号</th>
                  <th>角色</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(account => (
                  <tr key={account.id}>
                    <td>
                      <span className={adminStyles.consoleHtmlTableStrong}>{account.name}</span>
                    </td>
                    <td>{account.phone}</td>
                    <td>{getRoleLabel(operationRoles, account.roleId)}</td>
                    <td>{account.status === "active" ? "启用" : "停用"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "operationRoles" ? (
        <div className={adminStyles.consoleSplitLayout}>
          <aside className={adminStyles.consoleSidebar}>
            <div className={adminStyles.consoleSectionHeader}>
              <h2 className={adminStyles.consoleSectionTitle}>运营角色</h2>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreateOperationRole}
              >
                创建角色
              </Button>
            </div>
            <div className={adminStyles.consoleSidebarList}>
              {operationRoles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  className={classNames(
                    adminStyles.consoleSidebarItem,
                    selectedOperationRole?.id === role.id && adminStyles.consoleSidebarItemActive,
                  )}
                  onClick={() => setSelectedOperationRoleId(role.id)}
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
            {selectedOperationRole ? (
              <>
                <div className={adminStyles.consolePaneHeader}>
                  <div className={adminStyles.consolePaneHeaderMain}>
                    <h2 className={adminStyles.consolePaneTitle}>{selectedOperationRole.name}</h2>
                    <div className={adminStyles.roleHeaderMeta}>
                      <span className={adminStyles.consolePill}>
                        {selectedOperationRole.scopeLabel}
                      </span>
                      <span className={adminStyles.consolePill}>
                        {selectedOperationRole.permissionIds.length} 项权限
                      </span>
                      {selectedOperationRole.builtin ? (
                        <span className={adminStyles.consolePill}>系统角色</span>
                      ) : null}
                    </div>
                  </div>
                  {selectedOperationRole.builtin ? null : (
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => handleOpenEditOperationRole(selectedOperationRole)}
                    >
                      编辑
                    </Button>
                  )}
                </div>
                <div className={adminStyles.consoleSection}>
                  <h3 className={adminStyles.consoleSectionTitle}>权限</h3>
                  {renderPermissionMatrix(
                    OPERATION_PERMISSION_GROUPS,
                    selectedOperationRole.permissionIds,
                  )}
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeTab === "tenantPresets" ? (
        <div className={adminStyles.consoleSplitLayout}>
          <aside className={adminStyles.consoleSidebar}>
            <div className={adminStyles.consoleSidebarList}>
              {tenantPresets.map(role => (
                <button
                  key={role.id}
                  type="button"
                  className={classNames(
                    adminStyles.consoleSidebarItem,
                    selectedPreset?.id === role.id && adminStyles.consoleSidebarItemActive,
                  )}
                  onClick={() => setSelectedPresetId(role.id)}
                >
                  <span className={adminStyles.consoleSidebarItemTitle}>{role.name}</span>
                  <span className={adminStyles.consoleSidebarItemMeta}>{role.scopeLabel}</span>
                </button>
              ))}
            </div>
          </aside>
          <section className={adminStyles.consoleContentPane}>
            {selectedPreset ? (
              <>
                <div className={adminStyles.consolePaneHeader}>
                  <div className={adminStyles.consolePaneHeaderMain}>
                    <h2 className={adminStyles.consolePaneTitle}>{selectedPreset.name}</h2>
                    <div className={adminStyles.roleHeaderMeta}>
                      <span className={adminStyles.consolePill}>{selectedPreset.scopeLabel}</span>
                      <span className={adminStyles.consolePill}>
                        {selectedPreset.permissionIds.length} 项权限
                      </span>
                    </div>
                  </div>
                  <div className={adminStyles.consoleActions}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreatePreset}>
                      创建预设角色
                    </Button>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => handleOpenPresetModal(selectedPreset)}
                    >
                      编辑
                    </Button>
                  </div>
                </div>
                <div className={adminStyles.consoleSection}>
                  <h3 className={adminStyles.consoleSectionTitle}>权限</h3>
                  {renderPermissionMatrix(TENANT_PERMISSION_GROUPS, selectedPreset.permissionIds)}
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      <Modal
        title="创建账号"
        open={isAccountModalOpen}
        okText="创建"
        cancelText="取消"
        width={520}
        onCancel={() => setIsAccountModalOpen(false)}
        onOk={handleCreateAccount}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>姓名</span>
            <Input
              value={draftAccount.name}
              onChange={event =>
                setDraftAccount(current => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>手机号</span>
            <Input
              value={draftAccount.phone}
              onChange={event =>
                setDraftAccount(current => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>角色</span>
            <Select
              value={draftAccount.roleId}
              options={operationRoles.map(role => ({ label: role.name, value: role.id }))}
              onChange={roleId => setDraftAccount(current => ({ ...current, roleId }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title={editingOperationRoleId ? "编辑运营角色" : "创建运营角色"}
        open={isOperationRoleModalOpen}
        okText="保存"
        cancelText="取消"
        className={classNames(styles.fixedModal, styles.largeModal)}
        width={760}
        onCancel={() => setIsOperationRoleModalOpen(false)}
        onOk={handleSubmitOperationRole}
        destroyOnHidden
      >
        <RoleForm
          groups={OPERATION_PERMISSION_GROUPS}
          scopeOptions={[
            { label: "全平台", value: "全平台" },
            { label: "运营业务", value: "运营业务" },
            { label: "服务工单", value: "服务工单" },
          ]}
          value={draftRole}
          onChange={setDraftRole}
        />
      </Modal>

      <Modal
        title={editingPresetId ? "编辑平台预设角色" : "创建平台预设角色"}
        open={isPresetModalOpen}
        okText="保存"
        cancelText="取消"
        className={classNames(styles.fixedModal, styles.largeModal)}
        width={760}
        onCancel={handleClosePresetModal}
        onOk={handleSubmitPreset}
        destroyOnHidden
      >
        <RoleForm
          groups={TENANT_PERMISSION_GROUPS}
          scopeOptions={[
            { label: "全租户", value: "全租户" },
            { label: "所属部门", value: "所属部门" },
            { label: "本人", value: "本人" },
          ]}
          value={draftPreset}
          onChange={setDraftPreset}
        />
      </Modal>
    </div>
  );
};

interface RoleFormProps {
  groups: PermissionGroup[];
  onChange: (value: DraftRoleForm) => void;
  readonlyName?: boolean;
  scopeOptions: Array<{ label: string; value: string }>;
  value: DraftRoleForm;
}

const RoleForm = ({
  groups,
  onChange,
  readonlyName = false,
  scopeOptions,
  value,
}: RoleFormProps): JSX.Element => (
  <div className={adminStyles.consoleRows}>
    <div className={adminStyles.consoleInfoRow}>
      <span className={adminStyles.consoleInfoLabel}>角色名称</span>
      <Input
        disabled={readonlyName}
        value={value.name}
        onChange={event => onChange({ ...value, name: event.target.value })}
      />
    </div>
    <div className={adminStyles.consoleInfoRow}>
      <span className={adminStyles.consoleInfoLabel}>生效范围</span>
      <Select
        value={value.scopeLabel}
        options={scopeOptions}
        onChange={scopeLabel => onChange({ ...value, scopeLabel })}
      />
    </div>
    <div className={adminStyles.consoleInfoRow}>
      <span className={adminStyles.consoleInfoLabel}>权限</span>
      <div className={adminStyles.rolePermissionPicker}>
        {groups.map(group => (
          <div key={group.title} className={adminStyles.rolePermissionPickerGroup}>
            <div className={adminStyles.rolePermissionMatrixTitle}>{group.title}</div>
            <Checkbox.Group
              value={value.permissionIds}
              onChange={checkedValues =>
                onChange({ ...value, permissionIds: checkedValues.map(String) })
              }
            >
              <div className={adminStyles.rolePermissionCheckboxList}>
                {group.items.map(permission => (
                  <Checkbox key={permission.id} value={permission.id}>
                    {permission.label}
                  </Checkbox>
                ))}
              </div>
            </Checkbox.Group>
          </div>
        ))}
      </div>
    </div>
  </div>
);
