/**
 * 租户侧角色权限项。
 */
export interface TenantRolePermissionItem {
  id: string;
  label: string;
}

/**
 * 租户侧角色权限分组。
 */
export interface TenantRolePermissionGroup {
  items: TenantRolePermissionItem[];
  title: string;
}

/**
 * V0.6 租户侧可配置权限清单。
 */
export const TENANT_ROLE_PERMISSION_GROUPS: TenantRolePermissionGroup[] = [
  {
    title: "工作台",
    items: [
      { id: "workspace.metaAgent.use", label: "使用 MetaAgent" },
      { id: "workspace.expert.use", label: "使用专家工作室" },
    ],
  },
  {
    title: "AI 专家开发",
    items: [
      { id: "agent.develop.manageOwn", label: "开发本人 AI 专家" },
      { id: "skill.manageOwn", label: "开发本人 Skill" },
      { id: "agent.publish.tenant", label: "发布给团队使用" },
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
    title: "MetaAgent 管理",
    items: [
      { id: "metaAgent.session.manage", label: "管理会话配置" },
      { id: "metaAgent.channel.manage", label: "管理渠道连接" },
    ],
  },
  {
    title: "AI 专家管理",
    items: [
      { id: "agent.manage.tenant", label: "管理团队 AI 专家" },
      { id: "agent.access.manage", label: "管理可用范围" },
      { id: "agent.model.configure", label: "配置专家模型" },
      { id: "agent.cost.configure", label: "配置成本核算" },
    ],
  },
  {
    title: "模型配置",
    items: [{ id: "model.configure", label: "管理模型配置" }],
  },
  {
    title: "积分管理",
    items: [{ id: "points.manage", label: "查看积分消耗" }],
  },
  {
    title: "数据看板",
    items: [{ id: "dashboard.view", label: "查看团队看板" }],
  },
];

export const TENANT_ROLE_PERMISSION_IDS: string[] = TENANT_ROLE_PERMISSION_GROUPS.flatMap(group =>
  group.items.map(item => item.id),
);

export const DEPARTMENT_LEAD_PERMISSION_IDS: string[] = [
  "workspace.metaAgent.use",
  "workspace.expert.use",
  "agent.develop.manageOwn",
  "skill.manageOwn",
  "agent.publish.tenant",
  "org.department.view",
  "org.member.invite",
  "org.member.edit",
  "org.member.status",
  "agent.manage.tenant",
  "agent.access.manage",
  "points.manage",
  "dashboard.view",
];

export const TENANT_MEMBER_PERMISSION_IDS: string[] = [
  "workspace.metaAgent.use",
  "workspace.expert.use",
  "agent.develop.manageOwn",
  "skill.manageOwn",
  "agent.publish.tenant",
];
