/**
 * 运营后台登录角色。
 */
export type OperationsRole = "superAdmin" | "operator";

/**
 * 运营后台一级导航 key。
 */
export type OperationsPlatformTabKey =
  | "tenants"
  | "organization"
  | "roleManagement"
  | "products"
  | "resources"
  | "points"
  | "orders"
  | "agents"
  | "platformConfig";

/**
 * 运营后台租户状态。
 */
export type OperationsTenantStatus = "pending" | "active" | "suspended";

/**
 * 运营后台租户类型。
 */
export type OperationsTenantType = "enterprise" | "internal";

/**
 * 运营后台租户部署类型。
 */
export type OperationsTenantDeploymentMode = "publicCloud" | "privateCloud";

/**
 * 运营后台租户版本。
 */
export type OperationsTenantEdition = "personal" | "team";

/**
 * 运营后台租户计费方式。
 */
export type OperationsTenantBillingMode = "points" | "cost";

/**
 * Agent 提审状态。
 */
export type OperationsAgentApprovalStatus = "pending" | "approved" | "rejected";

/**
 * AI专家商品上架状态。
 */
export type OperationsAgentPlazaStatus = "online" | "offline";

/**
 * 商品分类名称，由运营后台维护。
 */
export type OperationsAgentPlazaCategory = string;

/**
 * 商品分类状态。
 */
export type OperationsAgentPlazaCategoryStatus = "active" | "inactive";

/**
 * 商品可见范围。
 */
export type OperationsAgentPlazaVisibility = "public" | "tenant";

/**
 * 商品适用的租户计费方式。
 */
export type OperationsProductBillingScope = "points" | "cost";

/**
 * 商品分类配置项。
 */
export interface OperationsAgentPlazaCategoryOption {
  id: string;
  name: OperationsAgentPlazaCategory;
  sortOrder: number;
  status: OperationsAgentPlazaCategoryStatus;
  updatedAt: string;
}

/**
 * 技能中心分类名称，由运营后台维护。
 */
export type OperationsSkillCenterCategory = string;

/**
 * 技能中心分类状态。
 */
export type OperationsSkillCenterCategoryStatus = "active" | "inactive";

/**
 * 技能中心分类配置项。
 */
export interface OperationsSkillCenterCategoryOption {
  id: string;
  name: OperationsSkillCenterCategory;
  sortOrder: number;
  status: OperationsSkillCenterCategoryStatus;
  updatedAt: string;
}

/**
 * 商品售卖类型。
 */
export type OperationsProductSaleType = "free" | "paid";

/**
 * AI 专家订阅方案周期。
 */
export type OperationsProductSubscriptionPlanKey = "month" | "quarter" | "year";

/**
 * AI 专家订阅方案状态。
 */
export type OperationsProductSubscriptionPlanStatus = "active" | "inactive";

/**
 * 商品试用规则。
 */
export type OperationsProductTrialUnit = "day" | "count";

/**
 * Agent 商品客服入口模式。
 */
export type OperationsProductContactMode = "disabled" | "platformDefault" | "custom";

/**
 * 商品供给类型。
 */
export type OperationsProductSupplyKind = "agent" | "standard";

/**
 * 商品交付类型。
 */
export type OperationsProductDeliveryKind =
  | "physicalDevice"
  | "virtualDevice"
  | "thirdPartyApi"
  | "softwareService";

/**
 * 商品计费模式。
 */
export type OperationsProductBillingMode = "subscription" | "quotaPackage" | "postpaid" | "oneTime";

/**
 * 商品计量对象。
 */
export type OperationsProductMeteringUnit =
  | "duration"
  | "device"
  | "seat"
  | "package"
  | "call"
  | "token"
  | "service";

/**
 * 商品结算规格。
 */
export type OperationsProductBillingSpec =
  | "year"
  | "month"
  | "device_once"
  | "seat_10_year"
  | "seat_50_year"
  | "package_once"
  | "call_1k"
  | "call_10k"
  | "token_1m"
  | "token_5m"
  | "service_once";

/**
 * 商品状态。
 */
export type OperationsProductStatus = "pendingProductization" | "draft" | "active" | "inactive";

/**
 * 交付实例状态。
 */
export type OperationsFulfillmentStatus =
  | "pending"
  | "allocating"
  | "delivering"
  | "active"
  | "completed";

/**
 * 资源池类型。
 */
export type OperationsResourcePoolType = "physicalDevice" | "virtualDevice" | "thirdPartyApi";

/**
 * 资源池分配方式。
 */
export type OperationsResourcePoolAllocationMode = "allocateExisting" | "createOnDemand";

/**
 * 资源池容量单位。
 */
export type OperationsResourcePoolCapacityUnit =
  | "device"
  | "instance"
  | "apiKey"
  | "call_10k"
  | "token_1m";

/**
 * 运营后台模拟登录账号。
 */
export interface OperationsAccount {
  accountId: string;
  userId: string;
  name: string;
  phone: string;
  role: OperationsRole;
  roleLabel: string;
  description: string;
  verificationCode: string;
  entryPath: string;
}

/**
 * 运营后台登录会话。
 */
export interface OperationsSession {
  accountId: string;
  userId: string;
  name: string;
  phone: string;
  role: OperationsRole;
  roleLabel: string;
  loginAt: string;
  entryPath: string;
}

/**
 * 运营后台登录参数。
 */
export interface OperationsLoginParams {
  phone: string;
  verificationCode: string;
  redirectPath?: string;
}

/**
 * 运营后台登录动作结果。
 */
export interface OperationsAuthActionResult {
  success: boolean;
  message: string;
  redirectPath?: string;
  account?: OperationsAccount;
  session?: OperationsSession;
}

/**
 * 运营后台租户对象。
 */
export interface OperationsTenant {
  id: string;
  name: string;
  code: string;
  type: OperationsTenantType;
  deploymentMode: OperationsTenantDeploymentMode;
  edition: OperationsTenantEdition;
  billingMode: OperationsTenantBillingMode;
  industry: string;
  adminName: string;
  adminPhone: string;
  adminPermissionIds: string[];
  adminRoleId: string;
  adminRoleLabel: string;
  hasAgentListingAccess: boolean;
  hasOperationsConsoleAccess: boolean;
  seatCount: number;
  effectiveAt: string;
  expiresAt: string;
  moduleLabels: string[];
  members: OperationsTenantMember[];
  status: OperationsTenantStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * 运营后台新建租户表单。
 */
export interface OperationsTenantForm {
  name: string;
  code: string;
  industry: string;
  adminName: string;
  adminPhone: string;
  adminPermissionIds: string[];
  billingMode: OperationsTenantBillingMode;
  seatCount: number;
  effectiveAt: string;
  expiresAt: string;
}

/**
 * 运营后台租户成员对象。
 */
export interface OperationsTenantMember {
  id: string;
  name: string;
  phone: string;
  roleId?: string;
  roleLabel: string;
  addedAt: string;
}

/**
 * 运营后台新增租户成员表单。
 */
export interface OperationsTenantMemberForm {
  name: string;
  phone: string;
}

/**
 * 平台侧新用户注册策略。
 */
export interface OperationsRegistrationStrategy {
  initialPermissionIds: string[];
  defaultGiftPoints: number;
  enabled: boolean;
  referralDailyRewardLimit: number;
  referralEnabled: boolean;
  referralInviteeRewardPoints: number;
  referralInviterRewardPoints: number;
  referralMonthlyRewardLimit: number;
  pointsPerCny: number;
  minimumDeductPoints: number;
  roundingUnit: number;
  updatedAt: string;
}

/**
 * 平台默认客服二维码配置。
 */
export interface OperationsServiceContactConfig {
  enabled: boolean;
  contactName: string;
  qrCodeValue: string;
  remarkTemplate: string;
  updatedAt: string;
}

/**
 * 用户侧交流群入群链接二维码配置。
 */
export interface OperationsCommunityGroupConfig {
  enabled: boolean;
  groupName: string;
  qrCodeValue: string;
  description: string;
  updatedAt: string;
}

/**
 * 邀请裂变奖励状态。
 */
export type OperationsReferralStatus = "rewarded" | "registered" | "pending" | "blocked";

/**
 * 邀请裂变运营记录。
 */
export interface OperationsReferralRecord {
  id: string;
  inviterName: string;
  inviterTenantName: string;
  inviteeName: string;
  inviteePhoneMasked: string;
  inviteeTenantName: string;
  status: OperationsReferralStatus;
  rewardPoints: number;
  registeredAt: string;
  rewardedAt?: string;
  sourceLabel: string;
}

/**
 * 平台服务配置状态。
 */
export type OperationsMeteringStatus = "active" | "inactive";

/**
 * 平台服务商类型。
 */
export type OperationsMeteringProviderKind = "largeModel";

/**
 * 模型能力类型。
 */
export type OperationsModelModality = "text" | "multimodal" | "embedding" | "image";

/**
 * 模型接口格式。
 */
export type OperationsModelInterfaceFormat = "anthropic" | "gemini" | "openai";

/**
 * 服务定价模式。
 */
export type OperationsServicePricingMode = "markup" | "grossMargin" | "manual";

/**
 * 积分消耗来源类型。
 */
export type OperationsPointsUsageSourceType = "largeModel" | "skill" | "thirdPartyApi";

/**
 * 平台服务商。
 */
export interface OperationsMeteringProvider {
  id: string;
  name: string;
  providerKind: OperationsMeteringProviderKind;
  baseUrl: string;
  billingCurrency: string;
  credentialStatusLabel: string;
  status: OperationsMeteringStatus;
  updatedAt: string;
}

/**
 * 平台服务商表单。
 */
export interface OperationsMeteringProviderForm {
  name: string;
  providerKind: OperationsMeteringProviderKind;
  baseUrl: string;
  billingCurrency: string;
  credentialStatusLabel: string;
  status: OperationsMeteringStatus;
}

/**
 * 大模型计费配置。
 */
export interface OperationsModelService {
  id: string;
  providerId: string;
  providerName: string;
  modelCode: string;
  modelName: string;
  interfaceFormat: OperationsModelInterfaceFormat;
  modality: OperationsModelModality;
  reasoningEnabled: boolean;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  pricingMode: OperationsServicePricingMode;
  markupRate: number;
  grossMarginRate: number;
  inputSalePricePerMillion: number;
  outputSalePricePerMillion: number;
  status: OperationsMeteringStatus;
  updatedAt: string;
}

/**
 * 大模型计费配置表单。
 */
export interface OperationsModelServiceForm {
  providerId: string;
  modelCode: string;
  modelName: string;
  interfaceFormat: OperationsModelInterfaceFormat;
  modality: OperationsModelModality;
  reasoningEnabled: boolean;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  pricingMode: OperationsServicePricingMode;
  markupRate: number;
  grossMarginRate: number;
  inputSalePricePerMillion: number;
  outputSalePricePerMillion: number;
  status: OperationsMeteringStatus;
}

/**
 * 积分消耗对账记录。
 */
export interface OperationsPointsUsageRecord {
  id: string;
  tenantName: string;
  userName: string;
  sourceType: OperationsPointsUsageSourceType;
  sourceName: string;
  providerName: string;
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
  unitCount?: number;
  unitLabel?: string;
  costAmount: number;
  saleAmount: number;
  points: number;
  marginAmount: number;
  occurredAt: string;
}

/**
 * Agent 提审对象。
 */
export interface OperationsAgentSubmission {
  id: string;
  name: string;
  version: string;
  submitter: string;
  submittedAt: string;
  status: OperationsAgentApprovalStatus;
  description: string;
  proposedProductName?: string;
  submitReason?: string;
  targetCustomers?: string;
  currentScopeLabel?: string;
  rejectReason?: string;
  lastReviewedAt?: string;
  plazaCategory?: OperationsAgentPlazaCategory;
  plazaVisibility?: OperationsAgentPlazaVisibility;
  visibleTenantIds?: string[];
  visibleTenantNames?: string[];
  plazaStatus?: OperationsAgentPlazaStatus;
  plazaUpdatedAt?: string;
}

/**
 * 商品对象。
 */
export interface OperationsProduct {
  id: string;
  name: string;
  supplyKind: OperationsProductSupplyKind;
  deliveryKind: OperationsProductDeliveryKind;
  saleType: OperationsProductSaleType;
  billingMode: OperationsProductBillingMode;
  meteringUnit: OperationsProductMeteringUnit;
  billingSpec?: OperationsProductBillingSpec;
  linkedAgentId?: string;
  linkedAgentName?: string;
  resourcePoolId?: string;
  resourcePoolName?: string;
  description: string;
  price?: number;
  subscriptionPlans?: OperationsProductSubscriptionPlan[];
  supportsTrial: boolean;
  trialUnit?: OperationsProductTrialUnit;
  trialValue?: number;
  contactMode?: OperationsProductContactMode;
  contactQrCodeValue?: string;
  contactRemark?: string;
  status: OperationsProductStatus;
  plazaCategory?: OperationsAgentPlazaCategory;
  plazaVisibility?: OperationsAgentPlazaVisibility;
  visibleTenantIds?: string[];
  visibleTenantNames?: string[];
  plazaStatus?: OperationsAgentPlazaStatus;
  plazaSort?: number;
  billingScopes?: OperationsProductBillingScope[];
  updatedAt: string;
}

/**
 * 商品表单。
 */
export interface OperationsProductForm {
  name: string;
  supplyKind: OperationsProductSupplyKind;
  deliveryKind: OperationsProductDeliveryKind;
  saleType: OperationsProductSaleType;
  billingMode: OperationsProductBillingMode;
  meteringUnit: OperationsProductMeteringUnit;
  billingSpec?: OperationsProductBillingSpec;
  linkedAgentId?: string;
  resourcePoolId?: string;
  description: string;
  price?: number;
  subscriptionPlans: OperationsProductSubscriptionPlan[];
  supportsTrial: boolean;
  trialUnit: OperationsProductTrialUnit;
  trialValue: number;
  contactMode: OperationsProductContactMode;
  contactQrCodeValue: string;
  contactRemark: string;
  plazaCategory: OperationsAgentPlazaCategory;
  plazaVisibility: OperationsAgentPlazaVisibility;
  visibleTenantIds: string[];
  visibleTenantNames: string[];
  plazaStatus: OperationsAgentPlazaStatus;
  billingScopes: OperationsProductBillingScope[];
}

/**
 * AI 专家订阅方案。
 */
export interface OperationsProductSubscriptionPlan {
  key: OperationsProductSubscriptionPlanKey;
  title: string;
  description: string;
  durationLabel: string;
  price: number;
  originalPrice?: number;
  tagLabel?: string;
  status: OperationsProductSubscriptionPlanStatus;
  sortOrder: number;
}

/**
 * 交付实例对象。
 */
export interface OperationsFulfillment {
  id: string;
  orderNo: string;
  tenantId: string;
  tenantName: string;
  productId: string;
  productName: string;
  deliveryKind: OperationsProductDeliveryKind;
  quantity: number;
  status: OperationsFulfillmentStatus;
  resourcePoolId?: string;
  resourcePoolName?: string;
  allocationTarget: string;
  startsAt: string;
  expiresAt?: string;
  updatedAt: string;
}

/**
 * 资源池对象。
 */
export interface OperationsResourcePool {
  id: string;
  name: string;
  resourceType: OperationsResourcePoolType;
  provider: string;
  allocationMode: OperationsResourcePoolAllocationMode;
  totalCapacity: number;
  availableCapacity: number;
  capacityUnit: OperationsResourcePoolCapacityUnit;
  updatedAt: string;
}

/**
 * 资源池表单。
 */
export interface OperationsResourcePoolForm {
  name: string;
  resourceType: OperationsResourcePoolType;
  provider: string;
  allocationMode: OperationsResourcePoolAllocationMode;
  totalCapacity: number;
  availableCapacity: number;
  capacityUnit: OperationsResourcePoolCapacityUnit;
}
