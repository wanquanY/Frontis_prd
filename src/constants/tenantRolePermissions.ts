import {
  EVOLUTION_LAB_LABEL,
  EXPERT_PLAZA_LABEL,
  EXPERT_STUDIO_LABEL,
  MANAGEMENT_CONSOLE_LABEL,
  SKILL_CENTER_LABEL,
} from "./brand";

/**
 * 租户侧角色权限项。
 */
export interface TenantRolePermissionItem {
  id: string;
  label: string;
}

/**
 * 租户侧角色权限菜单。
 */
export interface TenantRolePermissionMenu {
  displayMode?: "leaf" | "group";
  items: TenantRolePermissionItem[];
  title: string;
}

/**
 * 租户侧角色权限分组，一级为系统，二级为系统菜单，三级为页面功能。
 */
export interface TenantRolePermissionGroup {
  menus: TenantRolePermissionMenu[];
  title: string;
}

/**
 * 租户默认角色 key，与历史用户角色字段保持兼容。
 */
export type BuiltinTenantRoleKey = "enterpriseAdmin" | "departmentLead" | "employee";

/**
 * 组织角色定义。后台组织管理、角色管理与运营组织管理共用这一模型。
 */
export interface TenantRoleItem {
  builtin: boolean;
  id: string;
  memberIds: string[];
  name: string;
  permissionIds: string[];
}

export const DEFAULT_TENANT_ROLE_IDS: Record<BuiltinTenantRoleKey, string> = {
  enterpriseAdmin: "role-enterprise-admin",
  departmentLead: "role-department-lead",
  employee: "role-tenant-member",
};

export const SYSTEM_ACCESS_PERMISSION_IDS = {
  workspace: "system.workspace.access",
  admin: "system.admin.access",
  operations: "system.ops.access",
} as const;

export const OPERATIONS_PERMISSION_IDS = {
  tenantManage: "ops.tenant.manage",
  organizationManage: "ops.organization.manage",
  roleManage: "ops.role.manage",
  billingManage: "ops.billing.manage",
  pointsManage: "ops.points.manage",
  orderManage: "ops.order.manage",
  productManage: "ops.product.manage",
  resourceManage: "ops.resource.manage",
  agentReview: "ops.agent.review",
  platformConfig: "ops.platform.config",
} as const;

export const MANAGEMENT_PERMISSION_IDS = {
  dashboardView: "admin.dashboard.view",
  channelManage: "admin.channel.manage",
  pointsManage: "admin.points.manage",
  agentManage: "admin.agent.manage",
  organizationManage: "admin.organization.manage",
  roleManage: "admin.role.manage",
} as const;

export const TENANT_PERMISSION_IDS = {
  expertPlazaView: "workspace.expertPlaza.view",
  skillCenterView: "workspace.skillCenter.view",
  mcpPublishTenant: "workspace.skillCenter.mcp.publishTenant",
  mcpPublishPublic: "workspace.skillCenter.mcp.publishPublic",
  evolutionLabView: "development.view",
  develop: "development.manageOwn",
  agentPublishTenant: "agent.publish.tenant",
  agentPublishMarketplace: "agent.publish.marketplace",
  agentPublishPublic: "agent.publish.public",
  skillPublishPublic: "skill.publish.public",
} as const;

const WORKSPACE_PERMISSION_MENUS: TenantRolePermissionMenu[] = [
  {
    displayMode: "leaf",
    title: EXPERT_STUDIO_LABEL,
    items: [{ id: "workspace.expert.use", label: EXPERT_STUDIO_LABEL }],
  },
  {
    displayMode: "leaf",
    title: EXPERT_PLAZA_LABEL,
    items: [{ id: TENANT_PERMISSION_IDS.expertPlazaView, label: EXPERT_PLAZA_LABEL }],
  },
  {
    title: SKILL_CENTER_LABEL,
    items: [
      { id: TENANT_PERMISSION_IDS.skillCenterView, label: "浏览 Skill 和 MCP" },
      {
        id: TENANT_PERMISSION_IDS.mcpPublishTenant,
        label: `发布 skill/MCP 到${SKILL_CENTER_LABEL}（组织内）`,
      },
      {
        id: TENANT_PERMISSION_IDS.mcpPublishPublic,
        label: `上架 skill/MCP 到${SKILL_CENTER_LABEL}（平台公开）`,
      },
    ],
  },
  {
    title: EVOLUTION_LAB_LABEL,
    items: [
      { id: TENANT_PERMISSION_IDS.evolutionLabView, label: `查看${EVOLUTION_LAB_LABEL}` },
      { id: TENANT_PERMISSION_IDS.develop, label: "开发 AI 专家与 Skill" },
      {
        id: TENANT_PERMISSION_IDS.agentPublishTenant,
        label: `发布 AI 专家到${EXPERT_PLAZA_LABEL}（企业内）`,
      },
      {
        id: TENANT_PERMISSION_IDS.agentPublishMarketplace,
        label: `提交 AI 专家进入${EXPERT_PLAZA_LABEL}平台公开申请`,
      },
      {
        id: TENANT_PERMISSION_IDS.agentPublishPublic,
        label: `直接发布 AI 专家到${EXPERT_PLAZA_LABEL}（平台公开）`,
      },
      {
        id: TENANT_PERMISSION_IDS.skillPublishPublic,
        label: `直接发布 Skill 到${SKILL_CENTER_LABEL}（平台公开）`,
      },
    ],
  },
];

const MANAGEMENT_PERMISSION_MENUS: TenantRolePermissionMenu[] = [
  {
    displayMode: "leaf",
    title: "驾驶舱",
    items: [{ id: MANAGEMENT_PERMISSION_IDS.dashboardView, label: "驾驶舱" }],
  },
  {
    displayMode: "leaf",
    title: "订单记录",
    items: [{ id: MANAGEMENT_PERMISSION_IDS.pointsManage, label: "订单记录" }],
  },
  {
    displayMode: "leaf",
    title: "AI 专家管理",
    items: [{ id: MANAGEMENT_PERMISSION_IDS.agentManage, label: "AI 专家管理" }],
  },
  {
    displayMode: "leaf",
    title: "组织管理",
    items: [{ id: MANAGEMENT_PERMISSION_IDS.organizationManage, label: "组织管理" }],
  },
  {
    displayMode: "leaf",
    title: "Channel 管理",
    items: [{ id: MANAGEMENT_PERMISSION_IDS.channelManage, label: "Channel 管理" }],
  },
  {
    displayMode: "leaf",
    title: "角色管理",
    items: [{ id: MANAGEMENT_PERMISSION_IDS.roleManage, label: "角色管理" }],
  },
];

const OPERATIONS_PERMISSION_MENUS: TenantRolePermissionMenu[] = [
  {
    displayMode: "leaf",
    title: "租户管理",
    items: [{ id: OPERATIONS_PERMISSION_IDS.tenantManage, label: "租户管理" }],
  },
  {
    displayMode: "leaf",
    title: "组织管理",
    items: [{ id: OPERATIONS_PERMISSION_IDS.organizationManage, label: "组织管理" }],
  },
  {
    displayMode: "leaf",
    title: "角色管理",
    items: [{ id: OPERATIONS_PERMISSION_IDS.roleManage, label: "角色管理" }],
  },
  {
    displayMode: "leaf",
    title: "商品中心",
    items: [{ id: OPERATIONS_PERMISSION_IDS.productManage, label: "商品中心" }],
  },
  {
    displayMode: "leaf",
    title: "资源池",
    items: [{ id: OPERATIONS_PERMISSION_IDS.resourceManage, label: "资源池" }],
  },
  {
    displayMode: "group",
    title: "积分和订阅运营",
    items: [
      { id: OPERATIONS_PERMISSION_IDS.pointsManage, label: "积分运营" },
      { id: OPERATIONS_PERMISSION_IDS.billingManage, label: "订阅运营" },
    ],
  },
  {
    displayMode: "leaf",
    title: "订单中心",
    items: [{ id: OPERATIONS_PERMISSION_IDS.orderManage, label: "订单中心" }],
  },
  {
    displayMode: "leaf",
    title: `${EXPERT_PLAZA_LABEL}审核`,
    items: [{ id: OPERATIONS_PERMISSION_IDS.agentReview, label: `${EXPERT_PLAZA_LABEL}审核` }],
  },
  {
    displayMode: "leaf",
    title: "运营配置",
    items: [{ id: OPERATIONS_PERMISSION_IDS.platformConfig, label: "运营配置" }],
  },
];

/**
 * V0.6 租户侧可配置权限清单。
 */
export const TENANT_ROLE_PERMISSION_GROUPS: TenantRolePermissionGroup[] = [
  {
    title: "工作台",
    menus: WORKSPACE_PERMISSION_MENUS,
  },
  {
    title: MANAGEMENT_CONSOLE_LABEL,
    menus: MANAGEMENT_PERMISSION_MENUS,
  },
  {
    title: "运营管理平台",
    menus: OPERATIONS_PERMISSION_MENUS,
  },
];

export const TENANT_ROLE_PERMISSION_IDS: string[] = TENANT_ROLE_PERMISSION_GROUPS.flatMap(group =>
  group.menus.flatMap(menu => menu.items.map(item => item.id)),
);

export const SYSTEM_ACCESS_DERIVED_PERMISSION_IDS: Record<
  keyof typeof SYSTEM_ACCESS_PERMISSION_IDS,
  string[]
> = {
  workspace: WORKSPACE_PERMISSION_MENUS.flatMap(menu => menu.items.map(item => item.id)),
  admin: MANAGEMENT_PERMISSION_MENUS.flatMap(menu => menu.items.map(item => item.id)),
  operations: OPERATIONS_PERMISSION_MENUS.flatMap(menu => menu.items.map(item => item.id)),
};

const LEGACY_TENANT_PERMISSION_ID_MAPPINGS: Record<string, string> = {
  "agent.develop.manageOwn": TENANT_PERMISSION_IDS.develop,
  "agent.manage.tenant": MANAGEMENT_PERMISSION_IDS.agentManage,
  "agent.access.manage": MANAGEMENT_PERMISSION_IDS.agentManage,
  "org.department.view": MANAGEMENT_PERMISSION_IDS.organizationManage,
  "org.department.manage": MANAGEMENT_PERMISSION_IDS.organizationManage,
  "org.member.invite": MANAGEMENT_PERMISSION_IDS.organizationManage,
  "org.member.edit": MANAGEMENT_PERMISSION_IDS.organizationManage,
  "org.member.status": MANAGEMENT_PERMISSION_IDS.organizationManage,
  "org.member.remove": MANAGEMENT_PERMISSION_IDS.organizationManage,
  "role.view": MANAGEMENT_PERMISSION_IDS.roleManage,
  "role.custom.manage": MANAGEMENT_PERMISSION_IDS.roleManage,
  "role.assign": MANAGEMENT_PERMISSION_IDS.roleManage,
  "tenant.points.view": MANAGEMENT_PERMISSION_IDS.pointsManage,
  "tenant.points.manage": MANAGEMENT_PERMISSION_IDS.pointsManage,
  "channel.feishu.manage": MANAGEMENT_PERMISSION_IDS.channelManage,
  "dashboard.view": MANAGEMENT_PERMISSION_IDS.dashboardView,
  "ops.tenant.view": OPERATIONS_PERMISSION_IDS.tenantManage,
  "ops.tenant.create": OPERATIONS_PERMISSION_IDS.tenantManage,
  "ops.tenant.edit": OPERATIONS_PERMISSION_IDS.tenantManage,
  "ops.tenant.status": OPERATIONS_PERMISSION_IDS.tenantManage,
  "mcp.publish.marketplace": TENANT_PERMISSION_IDS.mcpPublishPublic,
  "mcp.publish.public": TENANT_PERMISSION_IDS.mcpPublishPublic,
  "mcp.publish.tenant": TENANT_PERMISSION_IDS.mcpPublishTenant,
  "skill.manageOwn": TENANT_PERMISSION_IDS.develop,
};

/**
 * 归一化角色权限，兼容早期拆开的开发、管理后台与运营后台细粒度权限。
 */
export const normalizeTenantRolePermissionIds = (permissionIds: string[]): string[] => {
  const permissionSet = new Set<string>();

  permissionIds.forEach(permissionId => {
    const normalizedPermissionId =
      LEGACY_TENANT_PERMISSION_ID_MAPPINGS[permissionId] ?? permissionId;

    if (TENANT_ROLE_PERMISSION_IDS.includes(normalizedPermissionId)) {
      permissionSet.add(normalizedPermissionId);
    }
  });

  return TENANT_ROLE_PERMISSION_IDS.filter(permissionId => permissionSet.has(permissionId));
};

export const TENANT_ADMIN_PERMISSION_IDS: string[] = TENANT_ROLE_PERMISSION_IDS.filter(
  permissionId => !permissionId.startsWith("ops."),
);

export const DEPARTMENT_LEAD_PERMISSION_IDS: string[] = [
  "workspace.expert.use",
  TENANT_PERMISSION_IDS.develop,
  TENANT_PERMISSION_IDS.agentPublishTenant,
  MANAGEMENT_PERMISSION_IDS.agentManage,
  MANAGEMENT_PERMISSION_IDS.organizationManage,
];

export const TENANT_MEMBER_PERMISSION_IDS: string[] = [
  "workspace.expert.use",
  TENANT_PERMISSION_IDS.expertPlazaView,
  TENANT_PERMISSION_IDS.skillCenterView,
  TENANT_PERMISSION_IDS.evolutionLabView,
  TENANT_PERMISSION_IDS.develop,
  TENANT_PERMISSION_IDS.agentPublishTenant,
];

export const OPERATIONS_SUPER_ADMIN_PERMISSION_IDS: string[] = [
  ...TENANT_ADMIN_PERMISSION_IDS,
  ...Object.values(OPERATIONS_PERMISSION_IDS),
];

export const OPERATIONS_OPERATOR_PERMISSION_IDS: string[] = [
  OPERATIONS_PERMISSION_IDS.tenantManage,
  OPERATIONS_PERMISSION_IDS.billingManage,
  OPERATIONS_PERMISSION_IDS.pointsManage,
  OPERATIONS_PERMISSION_IDS.orderManage,
  OPERATIONS_PERMISSION_IDS.productManage,
  OPERATIONS_PERMISSION_IDS.resourceManage,
  OPERATIONS_PERMISSION_IDS.agentReview,
  OPERATIONS_PERMISSION_IDS.platformConfig,
];

export const OPERATIONS_AGENT_REVIEWER_PERMISSION_IDS: string[] = [
  OPERATIONS_PERMISSION_IDS.agentReview,
];

const DEFAULT_TENANT_ROLE_CONFIGS: Array<{
  fallbackRole: BuiltinTenantRoleKey;
  id: string;
  name: string;
  permissionIds: string[];
}> = [
  {
    id: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
    fallbackRole: "enterpriseAdmin",
    name: "组织管理员",
    permissionIds: TENANT_ADMIN_PERMISSION_IDS,
  },
  {
    id: DEFAULT_TENANT_ROLE_IDS.departmentLead,
    fallbackRole: "departmentLead",
    name: "部门负责人",
    permissionIds: DEPARTMENT_LEAD_PERMISSION_IDS,
  },
  {
    id: DEFAULT_TENANT_ROLE_IDS.employee,
    fallbackRole: "employee",
    name: "普通成员",
    permissionIds: TENANT_MEMBER_PERMISSION_IDS,
  },
];

interface TenantRoleUserLike {
  id: string;
  role: BuiltinTenantRoleKey;
  roleIds?: string[];
}

const resolveBuiltinRoleMemberIds = (
  users: TenantRoleUserLike[],
  roleId: string,
  fallbackRole: BuiltinTenantRoleKey,
): string[] =>
  users
    .filter(user =>
      user.roleIds?.length ? user.roleIds.includes(roleId) : user.role === fallbackRole,
    )
    .map(user => user.id);

/**
 * 基于用户列表创建统一的租户默认角色。
 */
export const createDefaultTenantRoles = (users: TenantRoleUserLike[]): TenantRoleItem[] =>
  DEFAULT_TENANT_ROLE_CONFIGS.map(config => ({
    id: config.id,
    builtin: false,
    name: config.name,
    memberIds: resolveBuiltinRoleMemberIds(users, config.id, config.fallbackRole),
    permissionIds: normalizeTenantRolePermissionIds(config.permissionIds),
  }));

/**
 * 按用户的角色绑定关系刷新角色成员，保留现有角色的权限配置。
 */
export const syncTenantRoleMembers = (
  roles: TenantRoleItem[],
  users: TenantRoleUserLike[],
): TenantRoleItem[] =>
  roles.map(role => {
    const matchedDefaultConfig = DEFAULT_TENANT_ROLE_CONFIGS.find(config => config.id === role.id);

    if (matchedDefaultConfig) {
      return {
        ...role,
        memberIds: resolveBuiltinRoleMemberIds(users, role.id, matchedDefaultConfig.fallbackRole),
        permissionIds: normalizeTenantRolePermissionIds(role.permissionIds),
      };
    }

    return {
      ...role,
      memberIds: users.filter(user => user.roleIds?.includes(role.id)).map(user => user.id),
      permissionIds: normalizeTenantRolePermissionIds(role.permissionIds),
    };
  });
