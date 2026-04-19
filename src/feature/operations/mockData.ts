import type {
  OperationsAccount,
  OperationsAgentSubmission,
  OperationsFulfillment,
  OperationsPlatformTabKey,
  OperationsAgentPlazaCategory,
  OperationsAgentPlazaVisibility,
  OperationsProduct,
  OperationsProductSaleType,
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
  OperationsTenant,
  OperationsTenantForm,
  OperationsTenantMemberForm,
  OperationsUsageRecord,
  OperationsUsageTrendPoint,
} from "@/feature/operations/types";

export const OPERATIONS_DEFAULT_PATH = "/ops/tenants";

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
}> = [
  {
    key: "tenants",
    label: "租户管理",
    description: "创建租户并配置管理员账号。",
  },
  {
    key: "agents",
    label: "AI专家上架审批",
    description: "审核具备 FDE 权限的租户员工提交的 AI专家上架申请。",
  },
  {
    key: "agentPlaza",
    label: "AI专家广场管理",
    description: "维护已审批通过 AI 专家的广场分类、展示状态和可见范围。",
  },
];

export const OPERATIONS_ACCOUNT_OPTIONS: OperationsAccount[] = [
  {
    accountId: "ops-account-super-admin",
    userId: "ops-user-001",
    name: "周明越",
    phone: "13800008881",
    role: "superAdmin",
    roleLabel: "平台超管",
    description: "负责平台租户创建、FDE权限配置、AI专家上架审批和广场管理。",
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
    description: "负责日常租户维护、AI专家上架审批和 AI专家广场管理。",
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
    industry: "零售服饰",
    adminName: "杨万泉",
    adminPhone: "13800008883",
    hasFdeAccess: true,
    seatCount: 80,
    effectiveAt: "2026-04-02",
    expiresAt: "2027-03-31",
    moduleLabels: ["FrontisAI工作台"],
    members: [
      {
        id: "ops-tenant-001-member-001",
        name: "杨万泉",
        phone: "13800008883",
        roleLabel: "管理员",
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
    industry: "连锁零售",
    adminName: "周倩",
    adminPhone: "13800002222",
    hasFdeAccess: false,
    seatCount: 20,
    effectiveAt: "2026-04-14",
    expiresAt: "2026-06-30",
    moduleLabels: ["FrontisAI工作台"],
    members: [
      {
        id: "ops-tenant-002-member-001",
        name: "周倩",
        phone: "13800002222",
        roleLabel: "管理员",
        addedAt: "2026-04-14 09:12",
      },
    ],
    status: "pending",
    createdAt: "2026-04-14 09:12",
    updatedAt: "2026-04-14 09:12",
  },
  {
    id: "tenant-enterprise-hq",
    name: "星澜服饰集团租户",
    code: "ENT-HQ-2026-001",
    type: "enterprise",
    industry: "品牌零售",
    adminName: "杨万泉",
    adminPhone: "13800009999",
    hasFdeAccess: true,
    seatCount: 60,
    effectiveAt: "2026-03-12",
    expiresAt: "2026-12-31",
    moduleLabels: ["FrontisAI工作台"],
    members: [
      {
        id: "ops-tenant-003-member-001",
        name: "杨万泉",
        phone: "13800009999",
        roleLabel: "管理员",
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
    industry: "平台运营",
    adminName: "周明越",
    adminPhone: "13800008881",
    hasFdeAccess: true,
    seatCount: 15,
    effectiveAt: "2026-03-12",
    expiresAt: "2026-12-31",
    moduleLabels: ["运营后台"],
    members: [
      {
        id: "ops-tenant-003-member-001",
        name: "周明越",
        phone: "13800008881",
        roleLabel: "管理员",
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
    submitter: "张三 - 星澜服饰租户",
    submittedAt: "2026-04-16 13:20",
    status: "pending",
    submissionType: "squarePublish",
    currentScopeLabel: "已发布到企业 AI专家广场",
    submitReason: "该 AI专家 已在租户内稳定使用，申请上架到平台 AI专家广场供更多租户直接使用。",
    targetCustomers: "零售连锁、门店经营分析团队",
    description: "面向零售客户的经营复盘 Agent，支持日报总结、异常门店识别和行动建议输出。",
  },
  {
    id: "ops-agent-002",
    name: "客户对账核验助手",
    version: "v2.0.1",
    submitter: "王晨 - 凌光零售华东租户",
    submittedAt: "2026-04-15 19:05",
    status: "approved",
    submissionType: "squarePublish",
    currentScopeLabel: "已发布到企业 AI专家广场",
    submitReason: "企业内部验证完成，希望上架到平台 AI专家广场，供更多财务场景租户复用。",
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
    submitter: "李雪 - 星澜服饰租户",
    submittedAt: "2026-04-14 17:40",
    status: "rejected",
    submissionType: "squarePublish",
    currentScopeLabel: "已发布到企业 AI专家广场",
    submitReason: "希望上架到平台 AI专家广场，对外提供巡检与告警能力。",
    targetCustomers: "设备运维、巡检团队",
    description: "面向交付运维场景，识别设备在线状态、异常告警和建议修复动作。",
    rejectReason: "缺少异常工况下的结果说明，当前版本不适合直接进入平台资产池。",
    lastReviewedAt: "2026-04-15 10:30",
  },
  {
    id: "ops-agent-004",
    name: "商品运营素材助手",
    version: "v1.1.2",
    submitter: "林若岚 - 星澜服饰集团租户",
    submittedAt: "2026-04-13 16:25",
    status: "approved",
    submissionType: "squarePublish",
    currentScopeLabel: "已发布到企业 AI专家广场",
    submitReason: "申请上架平台 AI专家广场，面向电商运营客户统一开放使用。",
    targetCustomers: "电商运营、内容团队",
    description: "生成商品卖点、详情页文案和推广素材建议，适合商品中心快速包装。",
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
    submitter: "陈可心 - Frontis 内部运营组",
    submittedAt: "2026-04-12 11:10",
    status: "approved",
    submissionType: "squarePublish",
    currentScopeLabel: "已发布到企业 AI专家广场",
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

export const OPERATIONS_INITIAL_PRODUCTS: OperationsProduct[] = [
  {
    id: "ops-product-001",
    name: "商品运营素材助手",
    supplyKind: "agent",
    deliveryKind: "softwareService",
    saleType: "paid",
    billingMode: "subscription",
    meteringUnit: "duration",
    billingSpec: "year",
    linkedAgentId: "ops-agent-004",
    linkedAgentName: "商品运营素材助手",
    description: "该 AI专家 已通过商品化审核，请先完善售价、试用和售卖规则后再上架。",
    price: 0,
    supportsTrial: false,
    trialUnit: "day",
    trialValue: 7,
    status: "pendingProductization",
    plazaCategory: "通用",
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    plazaSort: 20,
    updatedAt: "2026-04-16 15:12",
  },
  {
    id: "ops-product-002",
    name: "对账核验标准版",
    supplyKind: "agent",
    deliveryKind: "softwareService",
    saleType: "paid",
    billingMode: "subscription",
    meteringUnit: "duration",
    billingSpec: "year",
    linkedAgentId: "ops-agent-002",
    linkedAgentName: "客户对账核验助手",
    description: "面向付款核验与运营对账的标准化 Agent 商品。",
    price: 6800,
    supportsTrial: true,
    trialUnit: "day",
    trialValue: 14,
    status: "active",
    plazaCategory: "供应链",
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    plazaSort: 10,
    updatedAt: "2026-04-16 10:42",
  },
  {
    id: "ops-product-003",
    name: "云端工作站 10 席位包",
    supplyKind: "standard",
    deliveryKind: "virtualDevice",
    saleType: "paid",
    billingMode: "subscription",
    meteringUnit: "seat",
    billingSpec: "seat_10_year",
    resourcePoolId: "ops-resource-pool-002",
    resourcePoolName: "华东云端工作站资源池",
    description: "提供云端工作站资源和统一账号接入能力。",
    price: 9600,
    supportsTrial: false,
    trialUnit: "day",
    trialValue: 7,
    status: "active",
    updatedAt: "2026-04-15 18:28",
  },
  {
    id: "ops-product-004",
    name: "模型积分包 50 万",
    supplyKind: "standard",
    deliveryKind: "thirdPartyApi",
    saleType: "paid",
    billingMode: "quotaPackage",
    meteringUnit: "token",
    billingSpec: "token_1m",
    resourcePoolId: "ops-resource-pool-003",
    resourcePoolName: "多模型 API 配额池",
    description: "提供标准模型调用额度，适合阶段性扩容。",
    price: 12000,
    supportsTrial: false,
    trialUnit: "count",
    trialValue: 1000,
    status: "active",
    updatedAt: "2026-04-15 16:08",
  },
  {
    id: "ops-product-006",
    name: "OCR 识别调用包 10000次",
    supplyKind: "standard",
    deliveryKind: "thirdPartyApi",
    saleType: "paid",
    billingMode: "quotaPackage",
    meteringUnit: "call",
    billingSpec: "call_10k",
    resourcePoolId: "ops-resource-pool-004",
    resourcePoolName: "第三方 OCR 接口账号池",
    description: "提供按次调用的 OCR 识别能力，适合票据、回单和门店单据识别场景。",
    price: 100,
    supportsTrial: false,
    trialUnit: "count",
    trialValue: 100,
    status: "active",
    updatedAt: "2026-04-17 10:08",
  },
  {
    id: "ops-product-hw-001",
    name: "门店巡检终端标准版",
    supplyKind: "standard",
    deliveryKind: "physicalDevice",
    saleType: "paid",
    billingMode: "oneTime",
    meteringUnit: "device",
    billingSpec: "device_once",
    resourcePoolId: "ops-resource-pool-001",
    resourcePoolName: "硬件终端库存池",
    description: "提供门店巡检采集终端和基础安装包，适合线下巡检标准化部署。",
    price: 2499,
    supportsTrial: false,
    trialUnit: "day",
    trialValue: 7,
    status: "active",
    updatedAt: "2026-04-17 10:40",
  },
  {
    id: "ops-product-005",
    name: "实施陪跑服务包",
    supplyKind: "standard",
    deliveryKind: "softwareService",
    saleType: "paid",
    billingMode: "oneTime",
    meteringUnit: "service",
    billingSpec: "service_once",
    description: "面向新客户上线期的实施培训、复盘陪跑和运营交接支持。",
    price: 5800,
    supportsTrial: false,
    trialUnit: "day",
    trialValue: 7,
    status: "inactive",
    updatedAt: "2026-04-12 11:30",
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
    status: "active",
    plazaCategory: "办公协同",
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    plazaSort: 8,
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
    productName: "模型积分包 50 万",
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

export const OPERATIONS_USAGE_TREND_POINTS: OperationsUsageTrendPoint[] = [
  { periodLabel: "04-11", requestCount: 1240, tokenCount: 368000, totalCost: 1820 },
  { periodLabel: "04-12", requestCount: 1380, tokenCount: 402500, totalCost: 1985 },
  { periodLabel: "04-13", requestCount: 1525, tokenCount: 449200, totalCost: 2240 },
  { periodLabel: "04-14", requestCount: 1670, tokenCount: 486800, totalCost: 2415 },
  { periodLabel: "04-15", requestCount: 1810, tokenCount: 519600, totalCost: 2588 },
  { periodLabel: "04-16", requestCount: 1945, tokenCount: 551400, totalCost: 2796 },
  { periodLabel: "04-17", requestCount: 1760, tokenCount: 504000, totalCost: 2632 },
];

export const OPERATIONS_USAGE_RECORDS: OperationsUsageRecord[] = [
  {
    id: "ops-usage-001",
    tenantId: "ops-tenant-001",
    tenantName: "星澜服饰集团",
    productId: "ops-product-002",
    productName: "对账核验标准版",
    agentName: "客户对账核验助手",
    requestCount: 1420,
    tokenCount: 422000,
    activeUsers: 18,
    totalCost: 2150,
    periodLabel: "近 7 天",
  },
  {
    id: "ops-usage-002",
    tenantId: "ops-tenant-001",
    tenantName: "星澜服饰集团",
    productId: "ops-product-003",
    productName: "云端工作站 10 席位包",
    agentName: "工作站运行资源",
    requestCount: 960,
    tokenCount: 301000,
    activeUsers: 24,
    totalCost: 1680,
    periodLabel: "近 7 天",
  },
  {
    id: "ops-usage-003",
    tenantId: "ops-tenant-001",
    tenantName: "星澜服饰集团",
    productId: "ops-product-004",
    productName: "模型积分包 50 万",
    agentName: "多模型资源池",
    requestCount: 2105,
    tokenCount: 618000,
    activeUsers: 11,
    totalCost: 2986,
    periodLabel: "近 7 天",
  },
  {
    id: "ops-usage-004",
    tenantId: "ops-tenant-003",
    tenantName: "Frontis 内部运营组",
    productId: "ops-product-005",
    productName: "实施陪跑服务包",
    agentName: "运营交付协同",
    requestCount: 430,
    tokenCount: 124000,
    activeUsers: 6,
    totalCost: 714,
    periodLabel: "近 7 天",
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

export const OPERATIONS_TENANT_MODULE_OPTIONS: string[] = [
  "FrontisAI工作台",
  "运营后台",
];

export const OPERATIONS_AGENT_PLAZA_CATEGORY_OPTIONS: Array<{
  value: OperationsAgentPlazaCategory;
  label: string;
}> = [
  { value: "通用", label: "通用" },
  { value: "销售", label: "销售" },
  { value: "生产", label: "生产" },
  { value: "供应链", label: "供应链" },
  { value: "办公协同", label: "办公协同" },
];

export const OPERATIONS_AGENT_PLAZA_VISIBILITY_LABELS: Record<
  OperationsAgentPlazaVisibility,
  string
> = {
  public: "全平台可见",
  tenant: "指定租户可见",
};

export const OPERATIONS_AGENT_STATUS_LABELS: Record<
  OperationsAgentSubmission["status"],
  string
> = {
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

export const OPERATIONS_PRODUCT_SALE_TYPE_LABELS: Record<
  OperationsProductSaleType,
  string
> = {
  free: "免费商品",
  paid: "付费商品",
};

export const OPERATIONS_PRODUCT_TRIAL_UNIT_LABELS: Record<
  OperationsProductTrialUnit,
  string
> = {
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

export const OPERATIONS_PRODUCT_BILLING_MODE_LABELS: Record<
  OperationsProductBillingMode,
  string
> = {
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

export const OPERATIONS_PRODUCT_BILLING_SPEC_LABELS: Record<
  OperationsProductBillingSpec,
  string
> = {
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

export const OPERATIONS_FULFILLMENT_STATUS_LABELS: Record<
  OperationsFulfillment["status"],
  string
> = {
  pending: "待分配",
  allocating: "分配中",
  delivering: "交付中",
  active: "已开通",
  completed: "已完成",
};

export const OPERATIONS_RESOURCE_POOL_TYPE_LABELS: Record<
  OperationsResourcePoolType,
  string
> = {
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

export const createEmptyOperationsTenantForm = (): OperationsTenantForm => ({
  name: "",
  code: "",
  industry: "",
  adminName: "",
  adminPhone: "",
  hasFdeAccess: false,
  seatCount: 0,
  effectiveAt: "",
  expiresAt: "",
  moduleLabels: [],
});

export const createEmptyOperationsTenantMemberForm = (): OperationsTenantMemberForm => ({
  name: "",
  phone: "",
});

export const createEmptyOperationsProductForm = (): OperationsProductForm => ({
  name: "",
  supplyKind: "standard",
  deliveryKind: "softwareService",
  saleType: "paid",
  billingMode: "subscription",
  meteringUnit: "duration",
  billingSpec: "year",
  linkedAgentId: undefined,
  resourcePoolId: undefined,
  description: "",
  price: 0,
  supportsTrial: false,
  trialUnit: "day",
  trialValue: 7,
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
