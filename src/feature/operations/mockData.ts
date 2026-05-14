import type {
  OperationsAccount,
  OperationsAgentSubmission,
  OperationsCommunityGroupConfig,
  OperationsFulfillment,
  OperationsExternalMeteredService,
  OperationsExternalMeteredServiceForm,
  OperationsExternalServiceMeteringUnit,
  OperationsMeteringProvider,
  OperationsMeteringProviderForm,
  OperationsMeteringProviderKind,
  OperationsModelInterfaceFormat,
  OperationsModelModality,
  OperationsModelService,
  OperationsModelServiceForm,
  OperationsPlatformTabKey,
  OperationsReferralRecord,
  OperationsRegistrationStrategy,
  OperationsAgentPlazaCategory,
  OperationsAgentPlazaCategoryOption,
  OperationsSkillCenterCategory,
  OperationsSkillCenterCategoryOption,
  OperationsProduct,
  OperationsProductBillingScope,
  OperationsProductSaleType,
  OperationsProductSubscriptionPlan,
  OperationsProductTrialUnit,
  OperationsProductBillingMode,
  OperationsProductBillingSpec,
  OperationsProductDeliveryKind,
  OperationsProductForm,
  OperationsProductMeteringUnit,
  OperationsResourcePool,
  OperationsResourcePoolAllocationMode,
  OperationsResourcePoolCapacityUnit,
  OperationsResourcePoolForm,
  OperationsResourcePoolType,
  OperationsServiceContactConfig,
  OperationsTenant,
  OperationsTenantForm,
  OperationsTenantMemberForm,
} from "@/feature/operations/types";
import {
  DEPARTMENT_LEAD_PERMISSION_IDS,
  DEFAULT_TENANT_ROLE_IDS,
  OPERATIONS_PERMISSION_IDS,
  OPERATIONS_SUPER_ADMIN_PERMISSION_IDS,
  SYSTEM_ACCESS_DERIVED_PERMISSION_IDS,
  TENANT_ADMIN_PERMISSION_IDS,
  TENANT_MEMBER_PERMISSION_IDS,
  TENANT_PERMISSION_IDS,
  normalizeTenantRolePermissionIds,
} from "@/constants/tenantRolePermissions";

export const OPERATIONS_DEFAULT_PATH = "/ops/tenants";
export const OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID = "role-tenant-operations-admin";
export const NEW_USER_INITIAL_PERMISSION_IDS: string[] = [
  "workspace.metaAgent.use",
  "workspace.expert.use",
  TENANT_PERMISSION_IDS.expertPlazaView,
  TENANT_PERMISSION_IDS.skillCenterView,
  TENANT_PERMISSION_IDS.evolutionLabView,
];

export interface OperationsTenantInitialAdminRoleOption {
  value: string;
  label: string;
  description: string;
  moduleLabels: string[];
  permissionIds: string[];
}

const DEFAULT_OPERATIONS_TENANT_INITIAL_ADMIN_ROLE_OPTION: OperationsTenantInitialAdminRoleOption =
  {
    value: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
    label: "组织管理员",
    description: "进入工作台和管理后台，负责组织、角色和 AI 专家管理。",
    moduleLabels: ["FrontisAI工作台", "企业管理后台"],
    permissionIds: TENANT_ADMIN_PERMISSION_IDS,
  };

export const OPERATIONS_TENANT_INITIAL_ADMIN_ROLE_OPTIONS: OperationsTenantInitialAdminRoleOption[] =
  [
    DEFAULT_OPERATIONS_TENANT_INITIAL_ADMIN_ROLE_OPTION,
    {
      value: OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID,
      label: "租户运营管理员",
      description: "在组织管理员权限基础上，额外获得运营管理后台入口。",
      moduleLabels: ["FrontisAI工作台", "企业管理后台", "租户运营后台"],
      permissionIds: OPERATIONS_SUPER_ADMIN_PERMISSION_IDS,
    },
    {
      value: DEFAULT_TENANT_ROLE_IDS.departmentLead,
      label: "部门负责人",
      description: "进入工作台和受限管理后台，负责部门成员与团队 AI 专家配置。",
      moduleLabels: ["FrontisAI工作台", "企业管理后台"],
      permissionIds: DEPARTMENT_LEAD_PERMISSION_IDS,
    },
    {
      value: DEFAULT_TENANT_ROLE_IDS.employee,
      label: "普通成员",
      description: "仅进入工作台，使用已授权的 ME 与 AI 专家。",
      moduleLabels: ["FrontisAI工作台"],
      permissionIds: TENANT_MEMBER_PERMISSION_IDS,
    },
  ];

export const getOperationsTenantInitialAdminRoleOption = (
  roleId: string,
): OperationsTenantInitialAdminRoleOption =>
  OPERATIONS_TENANT_INITIAL_ADMIN_ROLE_OPTIONS.find(item => item.value === roleId) ??
  DEFAULT_OPERATIONS_TENANT_INITIAL_ADMIN_ROLE_OPTION;

export const resolveOperationsTenantAgentListingAccess = (roleId: string): boolean =>
  getOperationsTenantInitialAdminRoleOption(roleId).permissionIds.some(
    permissionId =>
      permissionId === TENANT_PERMISSION_IDS.agentPublishMarketplace ||
      permissionId === TENANT_PERMISSION_IDS.agentPublishPublic,
  );

export const resolveOperationsTenantAgentListingAccessByPermissions = (
  permissionIds: string[],
): boolean =>
  permissionIds.some(
    permissionId =>
      permissionId === TENANT_PERMISSION_IDS.agentPublishMarketplace ||
      permissionId === TENANT_PERMISSION_IDS.agentPublishPublic,
  );

export const resolveOperationsTenantModuleLabels = (permissionIds: string[]): string[] => {
  const normalizedPermissionIds = normalizeTenantRolePermissionIds(permissionIds);
  const moduleLabels: string[] = [];

  if (
    normalizedPermissionIds.some(permissionId =>
      SYSTEM_ACCESS_DERIVED_PERMISSION_IDS.workspace.includes(permissionId),
    )
  ) {
    moduleLabels.push("FrontisAI工作台");
  }

  if (
    normalizedPermissionIds.some(permissionId =>
      SYSTEM_ACCESS_DERIVED_PERMISSION_IDS.admin.includes(permissionId),
    )
  ) {
    moduleLabels.push("企业管理后台");
  }

  if (
    normalizedPermissionIds.some(permissionId =>
      SYSTEM_ACCESS_DERIVED_PERMISSION_IDS.operations.includes(permissionId),
    )
  ) {
    moduleLabels.push("运营管理平台");
  }

  return moduleLabels;
};

/**
 * 解析运营后台登录后的进入路径。
 */
export const resolveOperationsEntryPath = (redirectPath?: string): string => {
  const normalizedRedirectPath = redirectPath?.trim();

  if (!normalizedRedirectPath?.startsWith("/ops")) {
    return OPERATIONS_DEFAULT_PATH;
  }

  return normalizedRedirectPath;
};

export const OPERATIONS_TAB_OPTIONS: Array<{
  key: OperationsPlatformTabKey;
  label: string;
  description: string;
  permissionIds: string[];
}> = [
  {
    key: "tenants",
    label: "租户管理",
    description: "创建租户并配置初始管理员账号。",
    permissionIds: [OPERATIONS_PERMISSION_IDS.tenantManage],
  },
  {
    key: "organization",
    label: "组织管理",
    description: "复用管理后台组织树与成员管理能力。",
    permissionIds: [OPERATIONS_PERMISSION_IDS.organizationManage],
  },
  {
    key: "roleManagement",
    label: "角色管理",
    description: "复用管理后台角色、权限项和角色成员关系。",
    permissionIds: [OPERATIONS_PERMISSION_IDS.roleManage],
  },
  {
    key: "products",
    label: "商品中心",
    description: "维护 AI专家商品、专家广场分类和技能中心分类。",
    permissionIds: [OPERATIONS_PERMISSION_IDS.productManage],
  },
  {
    key: "agents",
    label: "AI专家上架审批",
    description: "审核具备专家广场平台公开申请权限的租户成员提交的 AI 专家平台公开申请。",
    permissionIds: [OPERATIONS_PERMISSION_IDS.agentReview],
  },
  {
    key: "platformConfig",
    label: "运营配置",
    description: "维护用户侧账户弹窗的交流群二维码等平台运营信息。",
    permissionIds: [OPERATIONS_PERMISSION_IDS.platformConfig],
  },
];

export const OPERATIONS_ACCOUNT_OPTIONS: OperationsAccount[] = [
  {
    accountId: "ops-account-yang-wanquan",
    userId: "user-admin-001",
    name: "杨万泉",
    phone: "13800000001",
    role: "superAdmin",
    roleLabel: "平台超管",
    description: "负责平台租户创建、组织角色权限、商品中心和 AI专家上架审批。",
    verificationCode: "123456",
    entryPath: "/ops/tenants",
  },
  {
    accountId: "ops-account-super-admin",
    userId: "ops-user-001",
    name: "周明越",
    phone: "13800008881",
    role: "superAdmin",
    roleLabel: "平台超管",
    description: "负责平台租户创建、组织角色权限、商品中心和 AI专家上架审批。",
    verificationCode: "123456",
    entryPath: "/ops/tenants",
  },
  {
    accountId: "ops-account-operator",
    userId: "ops-user-002",
    name: "陈可心",
    phone: "13800008882",
    role: "operator",
    roleLabel: "平台运营",
    description: "负责日常租户维护、商品中心和 AI专家上架审批。",
    verificationCode: "123456",
    entryPath: "/ops/agents",
  },
];

export const OPERATIONS_INITIAL_TENANTS: OperationsTenant[] = [
  {
    id: "tenant-enterprise-demo",
    name: "星澜服饰租户",
    code: "ENT-2026-001",
    type: "enterprise",
    deploymentMode: "privateCloud",
    edition: "team",
    industry: "零售服饰",
    adminName: "杨万泉",
    adminPhone: "13800008883",
    adminPermissionIds: OPERATIONS_SUPER_ADMIN_PERMISSION_IDS,
    adminRoleId: OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID,
    adminRoleLabel: "租户运营管理员",
    hasAgentListingAccess: true,
    hasOperationsConsoleAccess: true,
    seatCount: 80,
    effectiveAt: "2026-04-02",
    expiresAt: "2027-03-31",
    moduleLabels: ["FrontisAI工作台", "企业管理后台", "租户运营后台"],
    members: [
      {
        id: "ops-tenant-001-member-001",
        name: "杨万泉",
        phone: "13800008883",
        roleId: OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID,
        roleLabel: "租户运营管理员",
        addedAt: "2026-04-02 10:30",
      },
      {
        id: "ops-tenant-001-member-002",
        name: "林若岚",
        phone: "13800009999",
        roleLabel: "成员",
        addedAt: "2026-04-03 09:18",
      },
      {
        id: "ops-tenant-001-member-003",
        name: "沈安",
        phone: "13800002221",
        roleLabel: "成员",
        addedAt: "2026-04-05 14:26",
      },
    ],
    status: "active",
    createdAt: "2026-04-02 10:30",
    updatedAt: "2026-04-16 18:20",
  },
  {
    id: "tenant-enterprise-east-ops",
    name: "凌光零售华东租户",
    code: "ENT-EAST-2026-017",
    type: "enterprise",
    deploymentMode: "publicCloud",
    edition: "team",
    industry: "连锁零售",
    adminName: "周倩",
    adminPhone: "13800002222",
    adminPermissionIds: TENANT_ADMIN_PERMISSION_IDS,
    adminRoleId: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
    adminRoleLabel: "组织管理员",
    hasAgentListingAccess: true,
    hasOperationsConsoleAccess: false,
    seatCount: 20,
    effectiveAt: "2026-04-14",
    expiresAt: "2026-06-30",
    moduleLabels: ["FrontisAI工作台", "企业管理后台"],
    members: [
      {
        id: "ops-tenant-002-member-001",
        name: "周倩",
        phone: "13800002222",
        roleId: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
        roleLabel: "组织管理员",
        addedAt: "2026-04-14 09:12",
      },
    ],
    status: "pending",
    createdAt: "2026-04-14 09:12",
    updatedAt: "2026-04-14 09:12",
  },
  {
    id: "tenant-personal-studio-demo",
    name: "李想的工作室",
    code: "SELF-2026-430",
    type: "enterprise",
    deploymentMode: "publicCloud",
    edition: "personal",
    industry: "个人工作室",
    adminName: "李想",
    adminPhone: "13800005555",
    adminPermissionIds: TENANT_ADMIN_PERMISSION_IDS,
    adminRoleId: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
    adminRoleLabel: "组织管理员",
    hasAgentListingAccess: true,
    hasOperationsConsoleAccess: false,
    seatCount: 1,
    effectiveAt: "2026-04-20",
    expiresAt: "2027-04-19",
    moduleLabels: ["FrontisAI工作台", "企业管理后台"],
    members: [
      {
        id: "ops-tenant-personal-member-001",
        name: "李想",
        phone: "13800005555",
        roleId: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
        roleLabel: "组织管理员",
        addedAt: "2026-04-20 10:12",
      },
    ],
    status: "active",
    createdAt: "2026-04-20 10:12",
    updatedAt: "2026-04-20 10:12",
  },
  {
    id: "tenant-enterprise-hq",
    name: "星澜服饰集团租户",
    code: "ENT-HQ-2026-001",
    type: "enterprise",
    deploymentMode: "publicCloud",
    edition: "team",
    industry: "品牌零售",
    adminName: "杨万泉",
    adminPhone: "13800009999",
    adminPermissionIds: OPERATIONS_SUPER_ADMIN_PERMISSION_IDS,
    adminRoleId: OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID,
    adminRoleLabel: "租户运营管理员",
    hasAgentListingAccess: true,
    hasOperationsConsoleAccess: true,
    seatCount: 60,
    effectiveAt: "2026-03-12",
    expiresAt: "2026-12-31",
    moduleLabels: ["FrontisAI工作台", "企业管理后台", "租户运营后台"],
    members: [
      {
        id: "ops-tenant-003-member-001",
        name: "杨万泉",
        phone: "13800009999",
        roleId: OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID,
        roleLabel: "租户运营管理员",
        addedAt: "2026-03-12 11:18",
      },
    ],
    status: "active",
    createdAt: "2026-03-12 11:18",
    updatedAt: "2026-04-17 09:10",
  },
  {
    id: "ops-tenant-004",
    name: "Frontis 内部运营组",
    code: "OPS-INT-001",
    type: "internal",
    deploymentMode: "publicCloud",
    edition: "team",
    industry: "平台运营",
    adminName: "周明越",
    adminPhone: "13800008881",
    adminPermissionIds: OPERATIONS_SUPER_ADMIN_PERMISSION_IDS,
    adminRoleId: OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID,
    adminRoleLabel: "租户运营管理员",
    hasAgentListingAccess: true,
    hasOperationsConsoleAccess: true,
    seatCount: 15,
    effectiveAt: "2026-03-12",
    expiresAt: "2026-12-31",
    moduleLabels: ["FrontisAI工作台", "企业管理后台", "租户运营后台"],
    members: [
      {
        id: "ops-tenant-003-member-001",
        name: "周明越",
        phone: "13800008881",
        roleId: OPERATIONS_TENANT_OPERATIONS_ADMIN_ROLE_ID,
        roleLabel: "租户运营管理员",
        addedAt: "2026-03-12 11:18",
      },
      {
        id: "ops-tenant-003-member-002",
        name: "陈可心",
        phone: "13800008882",
        roleLabel: "成员",
        addedAt: "2026-03-18 10:08",
      },
    ],
    status: "active",
    createdAt: "2026-03-12 11:18",
    updatedAt: "2026-04-17 09:10",
  },
];

export const OPERATIONS_INITIAL_AGENT_SUBMISSIONS: OperationsAgentSubmission[] = [
  {
    id: "ops-agent-001",
    name: "零售经营复盘官",
    version: "v1.3.0",
    submitter: "张三",
    submittedAt: "2026-04-16 13:20",
    status: "pending",
    submissionType: "squarePublish",
    currentScopeLabel: "已发布到专家广场",
    submitReason: "该 AI 专家已在租户内稳定使用，申请进入专家广场供更多租户直接使用。",
    targetCustomers: "零售连锁、门店经营分析团队",
    description: "面向零售客户的经营复盘 Agent，支持日报总结、异常门店识别和行动建议输出。",
  },
  {
    id: "ops-agent-002",
    name: "客户对账核验助手",
    version: "v2.0.1",
    submitter: "王晨",
    submittedAt: "2026-04-15 19:05",
    status: "approved",
    submissionType: "squarePublish",
    currentScopeLabel: "已发布到专家广场",
    submitReason: "租户内部验证完成，希望进入专家广场，供更多财务场景租户复用。",
    targetCustomers: "财务共享中心、对账运营团队",
    description: "自动核对客户付款凭证与订单金额，辅助运营完成到账核验。",
    lastReviewedAt: "2026-04-16 10:15",
    plazaCategory: "供应链",
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    plazaStatus: "online",
    plazaUpdatedAt: "2026-04-16 10:20",
  },
  {
    id: "ops-agent-003",
    name: "设备巡检助手",
    version: "v0.9.4",
    submitter: "李雪",
    submittedAt: "2026-04-14 17:40",
    status: "rejected",
    submissionType: "squarePublish",
    currentScopeLabel: "已发布到专家广场",
    submitReason: "希望进入专家广场，对外提供巡检与告警能力。",
    targetCustomers: "设备运维、巡检团队",
    description: "面向交付运维场景，识别设备在线状态、异常告警和建议修复动作。",
    rejectReason: "缺少异常工况下的结果说明，当前版本不适合直接进入平台资产池。",
    lastReviewedAt: "2026-04-15 10:30",
  },
  {
    id: "ops-agent-004",
    name: "商品运营素材助手",
    version: "v1.1.2",
    submitter: "林若岚",
    submittedAt: "2026-04-13 16:25",
    status: "approved",
    submissionType: "squarePublish",
    currentScopeLabel: "已发布到专家广场",
    submitReason: "申请进入专家广场，面向电商运营租户统一开放使用。",
    targetCustomers: "电商运营、内容团队",
    description: "生成商品卖点、详情页文案和推广素材建议，适合内容团队快速复用。",
    lastReviewedAt: "2026-04-14 09:40",
    plazaCategory: "销售",
    plazaVisibility: "tenant",
    visibleTenantIds: ["tenant-enterprise-demo", "tenant-enterprise-hq"],
    visibleTenantNames: ["星澜服饰租户", "星澜服饰集团租户"],
    plazaStatus: "offline",
    plazaUpdatedAt: "2026-04-14 09:45",
  },
  {
    id: "ops-agent-005",
    name: "制度问答助手",
    version: "v1.0.3",
    submitter: "陈可心",
    submittedAt: "2026-04-12 11:10",
    status: "approved",
    submissionType: "squarePublish",
    currentScopeLabel: "已发布到专家广场",
    submitReason: "适合作为平台通用 AI专家 上架给全部租户体验。",
    targetCustomers: "行政、HR、运营支持团队",
    description: "基于制度库和流程说明回答员工常见问题，适合做平台通用免费专家。",
    lastReviewedAt: "2026-04-12 17:20",
    plazaCategory: "通用",
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    plazaStatus: "online",
    plazaUpdatedAt: "2026-04-12 17:25",
  },
];

export const OPERATIONS_INITIAL_REGISTRATION_STRATEGY: OperationsRegistrationStrategy = {
  initialPermissionIds: NEW_USER_INITIAL_PERMISSION_IDS,
  defaultGiftPoints: 6000,
  enabled: true,
  referralDailyRewardLimit: 10,
  referralEnabled: true,
  referralInviteeRewardPoints: 0,
  referralInviterRewardPoints: 200,
  referralMonthlyRewardLimit: 80,
  pointsPerCny: 100,
  minimumDeductPoints: 1,
  roundingUnit: 1,
  updatedAt: "2026-04-23 10:30",
};

export const OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG: OperationsServiceContactConfig = {
  enabled: true,
  contactName: "FrontisAI 客服",
  qrCodeValue: "frontis-service-contact-default",
  remarkTemplate: "添加时请备注 AI 专家名称，客服会根据你的使用场景确认后续方案。",
  updatedAt: "2026-04-24 20:30",
};

export const OPERATIONS_INITIAL_COMMUNITY_GROUP_CONFIG: OperationsCommunityGroupConfig = {
  enabled: true,
  groupName: "FrontisAI 用户交流群",
  qrCodeValue: "https://frontis.ai/community/user-group",
  description: "扫码加入用户交流群，获取产品更新、使用答疑和优秀案例分享。",
  updatedAt: "2026-05-10 18:30",
};

export const OPERATIONS_INITIAL_REFERRAL_RECORDS: OperationsReferralRecord[] = [
  {
    id: "ops-referral-001",
    inviterName: "杨万泉",
    inviterTenantName: "星澜服饰租户",
    inviteeName: "赵明",
    inviteePhoneMasked: "138****6621",
    inviteeTenantName: "赵明的工作室",
    status: "rewarded",
    rewardPoints: 200,
    registeredAt: "2026-04-24 09:36",
    rewardedAt: "2026-04-24 09:37",
    sourceLabel: "邀请海报扫码",
  },
  {
    id: "ops-referral-002",
    inviterName: "李想",
    inviterTenantName: "李想的工作室",
    inviteeName: "沈佳",
    inviteePhoneMasked: "139****2718",
    inviteeTenantName: "沈佳的工作室",
    status: "registered",
    rewardPoints: 200,
    registeredAt: "2026-04-23 18:20",
    sourceLabel: "邀请链接",
  },
  {
    id: "ops-referral-003",
    inviterName: "王晨",
    inviterTenantName: "凌光零售华东租户",
    inviteeName: "陈可心",
    inviteePhoneMasked: "137****5160",
    inviteeTenantName: "陈可心的工作室",
    status: "pending",
    rewardPoints: 200,
    registeredAt: "2026-04-23 14:12",
    sourceLabel: "邀请海报扫码",
  },
  {
    id: "ops-referral-004",
    inviterName: "周明越",
    inviterTenantName: "北辰科技个人租户",
    inviteeName: "刘云",
    inviteePhoneMasked: "136****8935",
    inviteeTenantName: "刘云的工作室",
    status: "blocked",
    rewardPoints: 0,
    registeredAt: "2026-04-22 20:42",
    sourceLabel: "邀请链接",
  },
];

export const OPERATIONS_INITIAL_METERING_PROVIDERS: OperationsMeteringProvider[] = [
  {
    id: "ops-metering-provider-openai",
    name: "OpenAI",
    providerKind: "largeModel",
    baseUrl: "https://api.openai.com/v1",
    billingCurrency: "CNY",
    credentialStatusLabel: "sk-****-openai",
    status: "active",
    updatedAt: "2026-04-23 11:20",
  },
  {
    id: "ops-metering-provider-bailian",
    name: "阿里云百炼",
    providerKind: "largeModel",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    billingCurrency: "CNY",
    credentialStatusLabel: "sk-****-bailian",
    status: "active",
    updatedAt: "2026-04-22 16:40",
  },
  {
    id: "ops-metering-provider-tianyancha",
    name: "企业信息接口服务",
    providerKind: "thirdPartyApi",
    baseUrl: "https://api.company-data.example.com",
    billingCurrency: "CNY",
    credentialStatusLabel: "ak-****-company",
    status: "active",
    updatedAt: "2026-04-21 14:15",
  },
];

export const OPERATIONS_INITIAL_MODEL_SERVICES: OperationsModelService[] = [
  {
    id: "ops-model-service-gpt-4-1",
    providerId: "ops-metering-provider-openai",
    providerName: "OpenAI",
    modelCode: "gpt-4.1",
    modelName: "GPT-4.1",
    interfaceFormat: "openai",
    modality: "multimodal",
    reasoningEnabled: true,
    inputCostPerMillion: 5,
    outputCostPerMillion: 15,
    pricingMode: "markup",
    markupRate: 1.4,
    grossMarginRate: 30,
    inputSalePricePerMillion: 7,
    outputSalePricePerMillion: 21,
    status: "active",
    updatedAt: "2026-04-23 11:30",
  },
  {
    id: "ops-model-service-qwen-max",
    providerId: "ops-metering-provider-bailian",
    providerName: "阿里云百炼",
    modelCode: "qwen-max",
    modelName: "通义千问 Max",
    interfaceFormat: "openai",
    modality: "text",
    reasoningEnabled: true,
    inputCostPerMillion: 4,
    outputCostPerMillion: 12,
    pricingMode: "grossMargin",
    markupRate: 1.35,
    grossMarginRate: 28,
    inputSalePricePerMillion: 5.56,
    outputSalePricePerMillion: 16.67,
    status: "active",
    updatedAt: "2026-04-22 17:10",
  },
  {
    id: "ops-model-service-embedding",
    providerId: "ops-metering-provider-openai",
    providerName: "OpenAI",
    modelCode: "text-embedding-3-large",
    modelName: "Embedding Large",
    interfaceFormat: "openai",
    modality: "embedding",
    reasoningEnabled: false,
    inputCostPerMillion: 0.9,
    outputCostPerMillion: 0,
    pricingMode: "markup",
    markupRate: 1.6,
    grossMarginRate: 30,
    inputSalePricePerMillion: 1.44,
    outputSalePricePerMillion: 0,
    status: "active",
    updatedAt: "2026-04-21 18:30",
  },
];

export const OPERATIONS_INITIAL_EXTERNAL_METERED_SERVICES: OperationsExternalMeteredService[] = [
  {
    id: "ops-external-service-company-search",
    providerId: "ops-metering-provider-tianyancha",
    providerName: "企业信息接口服务",
    name: "企业工商信息查询",
    serviceTypeLabel: "第三方 API",
    meteringUnit: "call",
    costPerUnit: 0.08,
    pricingMode: "markup",
    markupRate: 1.5,
    grossMarginRate: 30,
    salePricePerUnit: 0.12,
    status: "active",
    updatedAt: "2026-04-21 15:05",
  },
  {
    id: "ops-external-service-ocr",
    providerId: "ops-metering-provider-bailian",
    providerName: "阿里云百炼",
    name: "票据 OCR 识别",
    serviceTypeLabel: "Skill 外部能力",
    meteringUnit: "image",
    costPerUnit: 0.03,
    pricingMode: "markup",
    markupRate: 1.4,
    grossMarginRate: 30,
    salePricePerUnit: 0.042,
    status: "active",
    updatedAt: "2026-04-20 10:50",
  },
];

export const OPERATIONS_INITIAL_PRODUCTS: OperationsProduct[] = [
  {
    id: "ops-product-001",
    name: "商品运营素材助手",
    supplyKind: "agent",
    deliveryKind: "softwareService",
    saleType: "free",
    billingMode: "subscription",
    meteringUnit: "duration",
    linkedAgentId: "ops-agent-004",
    linkedAgentName: "商品运营素材助手",
    description: "该 AI专家 已通过商品化审核，请先完善免费试用策略后再上架。",
    subscriptionPlans: createDefaultAgentSubscriptionPlans(),
    supportsTrial: false,
    trialUnit: "day",
    trialValue: 7,
    contactMode: "disabled",
    contactQrCodeValue: "",
    contactRemark: "",
    status: "pendingProductization",
    plazaCategory: "通用",
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    plazaStatus: "offline",
    plazaSort: 20,
    billingScopes: ["points", "cost"],
    updatedAt: "2026-04-16 15:12",
  },
  {
    id: "ops-product-002",
    name: "对账核验标准版",
    supplyKind: "agent",
    deliveryKind: "softwareService",
    saleType: "free",
    billingMode: "subscription",
    meteringUnit: "duration",
    linkedAgentId: "ops-agent-002",
    linkedAgentName: "客户对账核验助手",
    description: "面向付款核验与运营对账的标准化 Agent 商品。",
    subscriptionPlans: [
      {
        key: "month",
        title: "包月",
        description: "适合短期需求",
        durationLabel: "30天",
        price: 399,
        status: "active",
        sortOrder: 10,
      },
      {
        key: "quarter",
        title: "包季",
        description: "性价比之选",
        durationLabel: "90天",
        price: 999,
        originalPrice: 1197,
        tagLabel: "8折优惠",
        status: "active",
        sortOrder: 20,
      },
      {
        key: "year",
        title: "包年",
        description: "长期使用最划算",
        durationLabel: "365天",
        price: 2999,
        originalPrice: 4788,
        tagLabel: "6折优惠",
        status: "active",
        sortOrder: 30,
      },
    ],
    supportsTrial: true,
    trialUnit: "day",
    trialValue: 14,
    contactMode: "disabled",
    contactQrCodeValue: "",
    contactRemark: "",
    status: "active",
    plazaCategory: "供应链",
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    plazaStatus: "online",
    plazaSort: 10,
    billingScopes: ["points"],
    updatedAt: "2026-04-16 10:42",
  },
  {
    id: "ops-product-004",
    name: "商品运营增长专家",
    supplyKind: "agent",
    deliveryKind: "softwareService",
    saleType: "free",
    billingMode: "subscription",
    meteringUnit: "duration",
    linkedAgentId: "ops-agent-004",
    linkedAgentName: "商品运营素材助手",
    description: "面向电商和内容团队的增长型 AI 专家，支持素材流程和试用策略配置。",
    subscriptionPlans: [
      {
        key: "month",
        title: "包月",
        description: "适合短期活动",
        durationLabel: "30天",
        price: 599,
        status: "active",
        sortOrder: 10,
      },
      {
        key: "quarter",
        title: "包季",
        description: "适合季度运营节奏",
        durationLabel: "90天",
        price: 1599,
        originalPrice: 1797,
        tagLabel: "推荐",
        status: "active",
        sortOrder: 20,
      },
      {
        key: "year",
        title: "包年",
        description: "适合稳定内容团队",
        durationLabel: "365天",
        price: 4999,
        originalPrice: 7188,
        tagLabel: "企业优选",
        status: "active",
        sortOrder: 30,
      },
    ],
    supportsTrial: false,
    trialUnit: "day",
    trialValue: 7,
    contactMode: "platformDefault",
    contactQrCodeValue: "",
    contactRemark: "",
    status: "active",
    plazaCategory: "销售",
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    plazaStatus: "online",
    plazaSort: 20,
    billingScopes: ["cost"],
    updatedAt: "2026-04-17 10:08",
  },
  {
    id: "ops-product-007",
    name: "制度问答助手免费版",
    supplyKind: "agent",
    deliveryKind: "softwareService",
    saleType: "free",
    billingMode: "subscription",
    meteringUnit: "duration",
    billingSpec: "year",
    linkedAgentId: "ops-agent-005",
    linkedAgentName: "制度问答助手",
    description: "面向通用知识问答场景的免费 AI专家 商品，可直接领取开通。",
    price: 0,
    supportsTrial: false,
    trialUnit: "day",
    trialValue: 7,
    contactMode: "disabled",
    contactQrCodeValue: "",
    contactRemark: "",
    status: "active",
    plazaCategory: "办公协同",
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    plazaStatus: "online",
    plazaSort: 8,
    billingScopes: ["points", "cost"],
    updatedAt: "2026-04-17 14:10",
  },
];

export const OPERATIONS_INITIAL_FULFILLMENTS: OperationsFulfillment[] = [
  {
    id: "ops-fulfillment-001",
    orderNo: "OPS-ORDER-20260417-001",
    tenantId: "ops-tenant-001",
    tenantName: "星澜服饰集团",
    productId: "ops-product-003",
    productName: "云端工作站 10 席位包",
    deliveryKind: "virtualDevice",
    quantity: 1,
    status: "active",
    resourcePoolId: "ops-resource-pool-002",
    resourcePoolName: "华东云端工作站资源池",
    allocationTarget: "vm-east-cluster-017 / 10席",
    startsAt: "2026-04-16 10:20",
    expiresAt: "2027-04-15 23:59",
    updatedAt: "2026-04-16 10:22",
  },
  {
    id: "ops-fulfillment-002",
    orderNo: "OPS-ORDER-20260417-002",
    tenantId: "ops-tenant-003",
    tenantName: "Frontis 内部运营组",
    productId: "ops-product-004",
    productName: "模型服务额度 50 万",
    deliveryKind: "thirdPartyApi",
    quantity: 1,
    status: "active",
    resourcePoolId: "ops-resource-pool-003",
    resourcePoolName: "多模型 API 配额池",
    allocationTarget: "api-quota-pack-224 / 100万Tokens",
    startsAt: "2026-04-15 14:40",
    expiresAt: "2026-05-15 23:59",
    updatedAt: "2026-04-15 14:42",
  },
  {
    id: "ops-fulfillment-003",
    orderNo: "OPS-ORDER-20260417-003",
    tenantId: "ops-tenant-001",
    tenantName: "星澜服饰集团",
    productId: "ops-product-005",
    productName: "实施陪跑服务包",
    deliveryKind: "softwareService",
    quantity: 1,
    status: "delivering",
    allocationTarget: "实施顾问已排期：2026-04-20",
    startsAt: "2026-04-17 09:30",
    updatedAt: "2026-04-17 09:30",
  },
  {
    id: "ops-fulfillment-004",
    orderNo: "OPS-ORDER-20260417-004",
    tenantId: "ops-tenant-003",
    tenantName: "Frontis 内部运营组",
    productId: "ops-product-hw-001",
    productName: "门店巡检终端标准版",
    deliveryKind: "physicalDevice",
    quantity: 6,
    status: "pending",
    resourcePoolId: "ops-resource-pool-001",
    resourcePoolName: "硬件终端库存池",
    allocationTarget: "待出库分配序列号",
    startsAt: "2026-04-17 11:10",
    updatedAt: "2026-04-17 11:10",
  },
  {
    id: "ops-fulfillment-005",
    orderNo: "OPS-ORDER-20260417-005",
    tenantId: "ops-tenant-002",
    tenantName: "百汇零售",
    productId: "ops-product-006",
    productName: "OCR 识别调用包 10000次",
    deliveryKind: "thirdPartyApi",
    quantity: 1,
    status: "allocating",
    resourcePoolId: "ops-resource-pool-004",
    resourcePoolName: "第三方 OCR 接口账号池",
    allocationTarget: "正在开通独立 OCR 接口账号并初始化调用额度",
    startsAt: "2026-04-17 13:20",
    expiresAt: "2026-05-17 23:59",
    updatedAt: "2026-04-17 13:24",
  },
  {
    id: "ops-fulfillment-006",
    orderNo: "OPS-ORDER-20260417-006",
    tenantId: "ops-tenant-001",
    tenantName: "星澜服饰集团",
    productId: "ops-product-005",
    productName: "实施陪跑服务包",
    deliveryKind: "softwareService",
    quantity: 1,
    status: "completed",
    allocationTarget: "上线培训、交接复盘与验收单已完成归档",
    startsAt: "2026-04-08 10:00",
    updatedAt: "2026-04-16 18:10",
  },
];

export const OPERATIONS_INITIAL_RESOURCE_POOLS: OperationsResourcePool[] = [
  {
    id: "ops-resource-pool-001",
    name: "硬件终端库存池",
    resourceType: "physicalDevice",
    provider: "Frontis 设备中心",
    allocationMode: "allocateExisting",
    totalCapacity: 120,
    availableCapacity: 48,
    capacityUnit: "device",
    updatedAt: "2026-04-17 10:40",
  },
  {
    id: "ops-resource-pool-002",
    name: "华东云端工作站资源池",
    resourceType: "virtualDevice",
    provider: "阿里云华东",
    allocationMode: "allocateExisting",
    totalCapacity: 80,
    availableCapacity: 24,
    capacityUnit: "instance",
    updatedAt: "2026-04-17 10:18",
  },
  {
    id: "ops-resource-pool-003",
    name: "多模型 API 配额池",
    resourceType: "thirdPartyApi",
    provider: "OpenAI / 百炼",
    allocationMode: "allocateExisting",
    totalCapacity: 300,
    availableCapacity: 112,
    capacityUnit: "token_1m",
    updatedAt: "2026-04-17 09:56",
  },
  {
    id: "ops-resource-pool-004",
    name: "第三方 OCR 接口账号池",
    resourceType: "thirdPartyApi",
    provider: "OCR Cloud",
    allocationMode: "createOnDemand",
    totalCapacity: 999,
    availableCapacity: 999,
    capacityUnit: "apiKey",
    updatedAt: "2026-04-17 08:40",
  },
];

export const OPERATIONS_TENANT_STATUS_LABELS: Record<OperationsTenant["status"], string> = {
  pending: "待激活",
  active: "启用中",
  suspended: "已停用",
};

export const OPERATIONS_TENANT_TYPE_LABELS: Record<OperationsTenant["type"], string> = {
  enterprise: "企业租户",
  internal: "内部租户",
};

export const OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY: OperationsAgentPlazaCategory = "通用";
export const OPERATIONS_SKILL_CENTER_DEFAULT_CATEGORY: OperationsSkillCenterCategory = "通用";

export const OPERATIONS_INITIAL_AGENT_PLAZA_CATEGORIES: OperationsAgentPlazaCategoryOption[] = [
  {
    id: "ops-agent-plaza-category-general",
    name: "通用",
    sortOrder: 10,
    status: "active",
    updatedAt: "2026-04-16 10:42",
  },
  {
    id: "ops-agent-plaza-category-sales",
    name: "销售",
    sortOrder: 20,
    status: "active",
    updatedAt: "2026-04-16 10:42",
  },
  {
    id: "ops-agent-plaza-category-production",
    name: "生产",
    sortOrder: 30,
    status: "active",
    updatedAt: "2026-04-16 10:42",
  },
  {
    id: "ops-agent-plaza-category-supply-chain",
    name: "供应链",
    sortOrder: 40,
    status: "active",
    updatedAt: "2026-04-16 10:42",
  },
  {
    id: "ops-agent-plaza-category-office",
    name: "办公协同",
    sortOrder: 50,
    status: "active",
    updatedAt: "2026-04-16 10:42",
  },
];

export const OPERATIONS_INITIAL_SKILL_CENTER_CATEGORIES: OperationsSkillCenterCategoryOption[] = [
  {
    id: "ops-skill-center-category-general",
    name: "通用",
    sortOrder: 10,
    status: "active",
    updatedAt: "2026-04-16 10:42",
  },
  {
    id: "ops-skill-center-category-workflow",
    name: "工作流",
    sortOrder: 20,
    status: "active",
    updatedAt: "2026-04-16 10:42",
  },
  {
    id: "ops-skill-center-category-tool",
    name: "工具",
    sortOrder: 30,
    status: "active",
    updatedAt: "2026-04-16 10:42",
  },
  {
    id: "ops-skill-center-category-model",
    name: "模型能力",
    sortOrder: 40,
    status: "active",
    updatedAt: "2026-04-16 10:42",
  },
  {
    id: "ops-skill-center-category-data",
    name: "数据分析",
    sortOrder: 50,
    status: "active",
    updatedAt: "2026-04-16 10:42",
  },
];

export const OPERATIONS_PRODUCT_BILLING_SCOPE_LABELS: Record<
  OperationsProductBillingScope,
  string
> = {
  points: "积分计费",
  cost: "成本计费",
};

export const OPERATIONS_PRODUCT_BILLING_SCOPE_OPTIONS: Array<{
  value: OperationsProductBillingScope;
  label: string;
}> = [
  { value: "points", label: OPERATIONS_PRODUCT_BILLING_SCOPE_LABELS.points },
  { value: "cost", label: OPERATIONS_PRODUCT_BILLING_SCOPE_LABELS.cost },
];

export const OPERATIONS_AGENT_STATUS_LABELS: Record<OperationsAgentSubmission["status"], string> = {
  pending: "待审核",
  approved: "审核通过",
  rejected: "审核驳回",
};

export const OPERATIONS_PRODUCT_STATUS_LABELS: Record<OperationsProduct["status"], string> = {
  pendingProductization: "待商品化",
  draft: "草稿",
  active: "在售",
  inactive: "已下架",
};

export const OPERATIONS_PRODUCT_SALE_TYPE_LABELS: Record<OperationsProductSaleType, string> = {
  free: "免费商品",
  paid: "付费商品",
};

export const OPERATIONS_PRODUCT_TRIAL_UNIT_LABELS: Record<OperationsProductTrialUnit, string> = {
  day: "天",
  count: "次",
};

export const OPERATIONS_PRODUCT_SUPPLY_KIND_LABELS: Record<
  OperationsProduct["supplyKind"],
  string
> = {
  agent: "Agent 商品",
  standard: "标准商品",
};

export const OPERATIONS_PRODUCT_DELIVERY_KIND_LABELS: Record<
  OperationsProductDeliveryKind,
  string
> = {
  physicalDevice: "实体设备",
  virtualDevice: "云端虚拟设备",
  thirdPartyApi: "第三方接口",
  softwareService: "软件服务",
};

export const OPERATIONS_PRODUCT_DELIVERY_KIND_OPTIONS: Array<{
  value: OperationsProductDeliveryKind;
  label: string;
}> = [
  { value: "softwareService", label: "软件服务" },
  { value: "physicalDevice", label: "实体设备" },
  { value: "virtualDevice", label: "云端虚拟设备" },
  { value: "thirdPartyApi", label: "第三方接口" },
];

export const OPERATIONS_PRODUCT_BILLING_MODE_LABELS: Record<OperationsProductBillingMode, string> =
  {
    subscription: "订阅制",
    quotaPackage: "按量包",
    postpaid: "按量后付费",
    oneTime: "一次性服务",
  };

export const OPERATIONS_PRODUCT_METERING_UNIT_LABELS: Record<
  OperationsProductMeteringUnit,
  string
> = {
  duration: "订阅时长",
  device: "设备",
  seat: "席位",
  package: "包",
  call: "调用次数",
  token: "Tokens",
  service: "服务次数",
};

export const OPERATIONS_PRODUCT_BILLING_SPEC_LABELS: Record<OperationsProductBillingSpec, string> =
  {
    year: "1年",
    month: "1月",
    device_once: "1台",
    seat_10_year: "10席 / 年",
    seat_50_year: "50席 / 年",
    package_once: "1包",
    call_1k: "1000次调用",
    call_10k: "10000次调用",
    token_1m: "100万 Tokens",
    token_5m: "500万 Tokens",
    service_once: "1次",
  };

export const OPERATIONS_PRODUCT_BILLING_MODE_OPTIONS: Array<{
  value: OperationsProductBillingMode;
  label: string;
}> = [
  { value: "subscription", label: "订阅制" },
  { value: "quotaPackage", label: "按量包" },
  { value: "postpaid", label: "按量后付费" },
  { value: "oneTime", label: "一次性服务" },
];

export const OPERATIONS_PRODUCT_SALE_TYPE_OPTIONS: Array<{
  value: OperationsProductSaleType;
  label: string;
}> = [
  { value: "free", label: "免费商品" },
  { value: "paid", label: "付费商品" },
];

export const OPERATIONS_PRODUCT_TRIAL_UNIT_OPTIONS: Array<{
  value: OperationsProductTrialUnit;
  label: string;
}> = [
  { value: "day", label: "按天试用" },
  { value: "count", label: "按次数试用" },
];

export const OPERATIONS_PRODUCT_METERING_UNIT_OPTIONS: Array<{
  value: OperationsProductMeteringUnit;
  label: string;
}> = [
  { value: "duration", label: "订阅时长" },
  { value: "device", label: "设备" },
  { value: "seat", label: "席位" },
  { value: "package", label: "包" },
  { value: "call", label: "调用次数" },
  { value: "token", label: "Tokens" },
  { value: "service", label: "服务次数" },
];

export const OPERATIONS_PRODUCT_BILLING_SPEC_OPTIONS: Array<{
  value: OperationsProductBillingSpec;
  label: string;
  modes: OperationsProductBillingMode[];
  units: OperationsProductMeteringUnit[];
}> = [
  {
    value: "year",
    label: "1年",
    modes: ["subscription"],
    units: ["duration"],
  },
  {
    value: "month",
    label: "1月",
    modes: ["subscription"],
    units: ["duration"],
  },
  {
    value: "device_once",
    label: "1台",
    modes: ["oneTime"],
    units: ["device"],
  },
  {
    value: "seat_10_year",
    label: "10席 / 年",
    modes: ["subscription"],
    units: ["seat"],
  },
  {
    value: "seat_50_year",
    label: "50席 / 年",
    modes: ["subscription"],
    units: ["seat"],
  },
  {
    value: "package_once",
    label: "1包",
    modes: ["quotaPackage"],
    units: ["package"],
  },
  {
    value: "call_1k",
    label: "1000次调用",
    modes: ["quotaPackage", "postpaid"],
    units: ["call"],
  },
  {
    value: "call_10k",
    label: "10000次调用",
    modes: ["quotaPackage", "postpaid"],
    units: ["call"],
  },
  {
    value: "token_1m",
    label: "100万 Tokens",
    modes: ["quotaPackage", "postpaid"],
    units: ["token"],
  },
  {
    value: "token_5m",
    label: "500万 Tokens",
    modes: ["quotaPackage", "postpaid"],
    units: ["token"],
  },
  {
    value: "service_once",
    label: "1次",
    modes: ["oneTime"],
    units: ["service"],
  },
];

export const OPERATIONS_FULFILLMENT_STATUS_LABELS: Record<OperationsFulfillment["status"], string> =
  {
    pending: "待分配",
    allocating: "分配中",
    delivering: "交付中",
    active: "已开通",
    completed: "已完成",
  };

export const OPERATIONS_RESOURCE_POOL_TYPE_LABELS: Record<OperationsResourcePoolType, string> = {
  physicalDevice: "实体设备",
  virtualDevice: "云端虚拟设备",
  thirdPartyApi: "第三方接口",
};

export const OPERATIONS_RESOURCE_POOL_TYPE_OPTIONS: Array<{
  value: OperationsResourcePoolType;
  label: string;
}> = [
  { value: "physicalDevice", label: "实体设备" },
  { value: "virtualDevice", label: "云端虚拟设备" },
  { value: "thirdPartyApi", label: "第三方接口" },
];

export const OPERATIONS_RESOURCE_POOL_ALLOCATION_MODE_LABELS: Record<
  OperationsResourcePoolAllocationMode,
  string
> = {
  allocateExisting: "从现有池分配",
  createOnDemand: "按需创建",
};

export const OPERATIONS_RESOURCE_POOL_ALLOCATION_MODE_OPTIONS: Array<{
  value: OperationsResourcePoolAllocationMode;
  label: string;
}> = [
  { value: "allocateExisting", label: "从现有池分配" },
  { value: "createOnDemand", label: "按需创建" },
];

export const OPERATIONS_RESOURCE_POOL_CAPACITY_UNIT_LABELS: Record<
  OperationsResourcePoolCapacityUnit,
  string
> = {
  device: "台",
  instance: "实例",
  apiKey: "个接口账号",
  call_10k: "万次调用包",
  token_1m: "百万 Tokens 包",
};

export const OPERATIONS_RESOURCE_POOL_CAPACITY_UNIT_OPTIONS: Array<{
  value: OperationsResourcePoolCapacityUnit;
  label: string;
  resourceTypes: OperationsResourcePoolType[];
}> = [
  {
    value: "device",
    label: "台",
    resourceTypes: ["physicalDevice"],
  },
  {
    value: "instance",
    label: "实例",
    resourceTypes: ["virtualDevice"],
  },
  {
    value: "apiKey",
    label: "个接口账号",
    resourceTypes: ["thirdPartyApi"],
  },
  {
    value: "call_10k",
    label: "万次调用包",
    resourceTypes: ["thirdPartyApi"],
  },
  {
    value: "token_1m",
    label: "百万 Tokens 包",
    resourceTypes: ["thirdPartyApi"],
  },
];

export const OPERATIONS_METERING_PROVIDER_KIND_LABELS: Record<
  OperationsMeteringProviderKind,
  string
> = {
  largeModel: "大模型服务商",
  thirdPartyApi: "第三方接口服务商",
  skillService: "Skill 能力服务商",
};

export const OPERATIONS_METERING_STATUS_LABELS: Record<"active" | "inactive", string> = {
  active: "启用",
  inactive: "停用",
};

export const OPERATIONS_MODEL_MODALITY_LABELS: Record<OperationsModelModality, string> = {
  text: "文本模型",
  multimodal: "多模态模型",
  embedding: "向量模型",
  image: "图像模型",
};

export const OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS: Record<
  OperationsModelInterfaceFormat,
  string
> = {
  openai: "OpenAI 格式",
  anthropic: "Anthropic 格式",
  gemini: "Gemini 格式",
};

export const OPERATIONS_SERVICE_PRICING_MODE_LABELS: Record<
  "markup" | "grossMargin" | "manual",
  string
> = {
  markup: "成本倍率",
  grossMargin: "目标毛利率",
  manual: "手动售价",
};

export const OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_LABELS: Record<
  OperationsExternalServiceMeteringUnit,
  string
> = {
  call: "次调用",
  request: "次请求",
  minute: "分钟",
  image: "张图片",
  thousandCharacters: "千字符",
};

export const OPERATIONS_METERING_PROVIDER_KIND_OPTIONS: Array<{
  value: OperationsMeteringProviderKind;
  label: string;
}> = [
  { value: "largeModel", label: OPERATIONS_METERING_PROVIDER_KIND_LABELS.largeModel },
  { value: "thirdPartyApi", label: OPERATIONS_METERING_PROVIDER_KIND_LABELS.thirdPartyApi },
  { value: "skillService", label: OPERATIONS_METERING_PROVIDER_KIND_LABELS.skillService },
];

export const OPERATIONS_MODEL_MODALITY_OPTIONS: Array<{
  value: OperationsModelModality;
  label: string;
}> = [
  { value: "text", label: OPERATIONS_MODEL_MODALITY_LABELS.text },
  { value: "multimodal", label: OPERATIONS_MODEL_MODALITY_LABELS.multimodal },
  { value: "embedding", label: OPERATIONS_MODEL_MODALITY_LABELS.embedding },
  { value: "image", label: OPERATIONS_MODEL_MODALITY_LABELS.image },
];

export const OPERATIONS_MODEL_INTERFACE_FORMAT_OPTIONS: Array<{
  value: OperationsModelInterfaceFormat;
  label: string;
}> = [
  { value: "openai", label: OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS.openai },
  { value: "anthropic", label: OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS.anthropic },
  { value: "gemini", label: OPERATIONS_MODEL_INTERFACE_FORMAT_LABELS.gemini },
];

export const OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_OPTIONS: Array<{
  value: OperationsExternalServiceMeteringUnit;
  label: string;
}> = [
  { value: "call", label: OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_LABELS.call },
  { value: "request", label: OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_LABELS.request },
  { value: "minute", label: OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_LABELS.minute },
  { value: "image", label: OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_LABELS.image },
  {
    value: "thousandCharacters",
    label: OPERATIONS_EXTERNAL_SERVICE_METERING_UNIT_LABELS.thousandCharacters,
  },
];

export const createEmptyOperationsTenantForm = (): OperationsTenantForm => ({
  name: "",
  code: "",
  industry: "",
  adminName: "",
  adminPhone: "",
  adminPermissionIds: TENANT_ADMIN_PERMISSION_IDS,
  seatCount: 0,
  effectiveAt: "",
  expiresAt: "",
});

export const createEmptyOperationsTenantMemberForm = (): OperationsTenantMemberForm => ({
  name: "",
  phone: "",
});

export function createDefaultAgentSubscriptionPlans(): OperationsProductSubscriptionPlan[] {
  return [
    {
      key: "month",
      title: "包月",
      description: "适合短期需求",
      durationLabel: "30天",
      price: 299,
      status: "active",
      sortOrder: 10,
    },
    {
      key: "quarter",
      title: "包季",
      description: "性价比之选",
      durationLabel: "90天",
      price: 799,
      originalPrice: 897,
      tagLabel: "9折优惠",
      status: "active",
      sortOrder: 20,
    },
    {
      key: "year",
      title: "包年",
      description: "长期使用最划算",
      durationLabel: "365天",
      price: 2499,
      originalPrice: 3588,
      tagLabel: "7折优惠",
      status: "active",
      sortOrder: 30,
    },
  ];
}

export const createEmptyOperationsProductForm = (): OperationsProductForm => ({
  name: "",
  supplyKind: "agent",
  deliveryKind: "softwareService",
  saleType: "free",
  billingMode: "subscription",
  meteringUnit: "duration",
  billingSpec: "year",
  linkedAgentId: undefined,
  resourcePoolId: undefined,
  description: "",
  price: 0,
  subscriptionPlans: createDefaultAgentSubscriptionPlans(),
  supportsTrial: false,
  trialUnit: "day",
  trialValue: 7,
  contactMode: "disabled",
  contactQrCodeValue: "",
  contactRemark: "",
  plazaCategory: OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
  plazaVisibility: "public",
  visibleTenantIds: [],
  visibleTenantNames: [],
  plazaStatus: "offline",
  billingScopes: ["points"],
});

export const createEmptyOperationsResourcePoolForm = (): OperationsResourcePoolForm => ({
  name: "",
  resourceType: "physicalDevice",
  provider: "",
  allocationMode: "allocateExisting",
  totalCapacity: 0,
  availableCapacity: 0,
  capacityUnit: "device",
});

export const createEmptyOperationsMeteringProviderForm = (): OperationsMeteringProviderForm => ({
  name: "",
  providerKind: "largeModel",
  baseUrl: "",
  billingCurrency: "CNY",
  credentialStatusLabel: "",
  status: "active",
});

export const createEmptyOperationsModelServiceForm = (): OperationsModelServiceForm => ({
  providerId: "",
  modelCode: "",
  modelName: "",
  interfaceFormat: "openai",
  modality: "text",
  reasoningEnabled: true,
  inputCostPerMillion: 0,
  outputCostPerMillion: 0,
  pricingMode: "markup",
  markupRate: 1.3,
  grossMarginRate: 30,
  inputSalePricePerMillion: 0,
  outputSalePricePerMillion: 0,
  status: "active",
});

export const createEmptyOperationsExternalMeteredServiceForm =
  (): OperationsExternalMeteredServiceForm => ({
    providerId: "",
    name: "",
    serviceTypeLabel: "第三方 API",
    meteringUnit: "call",
    costPerUnit: 0,
    pricingMode: "markup",
    markupRate: 1.3,
    grossMarginRate: 30,
    salePricePerUnit: 0,
    status: "active",
  });
