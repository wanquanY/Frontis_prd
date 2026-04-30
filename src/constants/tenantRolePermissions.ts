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
      { id: "workspace.deliverable.viewOwn", label: "查看本人成果" },
    ],
  },
  {
    title: "AI 专家开发",
    items: [
      { id: "agent.develop.create", label: "创建 AI 专家" },
      { id: "agent.develop.editOwn", label: "编辑本人 AI 专家" },
      { id: "skill.manageOwn", label: "管理本人 Skill" },
      { id: "agent.plaza.submit", label: "提交广场上架" },
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
    title: "AI 专家管理",
    items: [
      { id: "agent.manage.view", label: "查看 AI 专家" },
      { id: "agent.access.manage", label: "管理可用范围" },
      { id: "agent.model.configure", label: "配置专家模型" },
      { id: "agent.cost.configure", label: "配置成本核算" },
      { id: "agent.version.view", label: "查看版本记录" },
    ],
  },
  {
    title: "模型配置",
    items: [
      { id: "model.provider.view", label: "查看模型供应商" },
      { id: "model.provider.manage", label: "管理模型供应商" },
      { id: "model.list.manage", label: "管理模型清单" },
    ],
  },
  {
    title: "积分管理",
    items: [
      { id: "points.usage.view", label: "查看积分消耗" },
      { id: "points.detail.view", label: "查看积分明细" },
    ],
  },
  {
    title: "数据看板",
    items: [
      { id: "dashboard.team.view", label: "查看团队看板" },
      { id: "dashboard.memberUsage.view", label: "查看成员用量" },
      { id: "dashboard.agentUsage.view", label: "查看专家用量" },
      { id: "dashboard.agentDevelopment.view", label: "查看开发分布" },
    ],
  },
];

export const TENANT_ROLE_PERMISSION_IDS: string[] = TENANT_ROLE_PERMISSION_GROUPS.flatMap(group =>
  group.items.map(item => item.id),
);

export const DEPARTMENT_LEAD_PERMISSION_IDS: string[] = [
  "workspace.metaAgent.use",
  "workspace.expert.use",
  "workspace.deliverable.viewOwn",
  "agent.develop.create",
  "agent.develop.editOwn",
  "skill.manageOwn",
  "agent.plaza.submit",
  "org.department.view",
  "org.member.invite",
  "org.member.edit",
  "org.member.status",
  "agent.manage.view",
  "agent.access.manage",
  "agent.version.view",
  "points.usage.view",
  "dashboard.memberUsage.view",
  "dashboard.agentUsage.view",
];

export const TENANT_MEMBER_PERMISSION_IDS: string[] = [
  "workspace.metaAgent.use",
  "workspace.expert.use",
  "workspace.deliverable.viewOwn",
  "agent.develop.create",
  "agent.develop.editOwn",
  "skill.manageOwn",
  "agent.plaza.submit",
  "agent.manage.view",
];
