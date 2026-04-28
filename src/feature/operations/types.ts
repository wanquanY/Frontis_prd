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
  | "agents"
  | "products"
  | "fulfillment"
  | "resources"
  | "points"
  | "agentPlaza";

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
 * Agent 提审状态。
 */
export type OperationsAgentApprovalStatus = "pending" | "approved" | "rejected";

/**
 * AI专家广场上架状态。
 */
export type OperationsAgentPlazaStatus = "online" | "offline";

/**
 * Agent 提审类型。
 */
export type OperationsAgentSubmissionType = "squarePublish" | "commodityApplication";

/**
 * AI专家广场分类名称，由运营后台维护。
 */
export type OperationsAgentPlazaCategory = string;

/**
 * AI专家广场分类状态。
 */
export type OperationsAgentPlazaCategoryStatus = "active" | "inactive";

/**
 * AI专家广场可见范围。
 */
export type OperationsAgentPlazaVisibility = "public" | "tenant";

/**
 * AI专家广场分类配置项。
 */
export interface OperationsAgentPlazaCategoryOption {
  id: string;
  name: OperationsAgentPlazaCategory;
  sortOrder: number;
  status: OperationsAgentPlazaCategoryStatus;
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
 * Agent 商品联系客服入口模式。
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
  industry: string;
  adminName: string;
  adminPhone: string;
  hasAgentListingAccess: boolean;
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
  deploymentMode: OperationsTenantDeploymentMode;
  industry: string;
  adminName: string;
  adminPhone: string;
  hasAgentListingAccess: boolean;
  seatCount: number;
  effectiveAt: string;
  expiresAt: string;
  moduleLabels: string[];
}

/**
 * 运营后台租户成员对象。
 */
export interface OperationsTenantMember {
  id: string;
  name: string;
  phone: string;
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
 * 平台侧注册赠送积分规则。
 */
export interface OperationsRegistrationStrategy {
  defaultGiftPoints: number;
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
 * 积分消耗计费配置状态。
 */
export type OperationsMeteringStatus = "active" | "inactive";

/**
 * 积分消耗服务商类型。
 */
export type OperationsMeteringProviderKind = "largeModel" | "thirdPartyApi" | "skillService";

/**
 * 模型能力类型。
 */
export type OperationsModelModality = "text" | "multimodal" | "embedding" | "image";

/**
 * 模型接口格式。
 */
export type OperationsModelInterfaceFormat = "anthropic" | "gemini" | "openai";

/**
 * 消耗计费定价模式。
 */
export type OperationsUsagePricingMode = "markup" | "grossMargin" | "manual";

/**
 * 第三方接口计量单位。
 */
export type OperationsExternalServiceMeteringUnit =
  | "call"
  | "request"
  | "minute"
  | "image"
  | "thousandCharacters";

/**
 * 消耗来源类型。
 */
export type OperationsPointsUsageSourceType = "largeModel" | "skill" | "thirdPartyApi";

/**
 * 积分消耗服务商。
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
 * 积分消耗服务商表单。
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
  pricingMode: OperationsUsagePricingMode;
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
  pricingMode: OperationsUsagePricingMode;
  markupRate: number;
  grossMarginRate: number;
  inputSalePricePerMillion: number;
  outputSalePricePerMillion: number;
  status: OperationsMeteringStatus;
}

/**
 * 第三方接口或 Skill 计费配置。
 */
export interface OperationsExternalMeteredService {
  id: string;
  providerId: string;
  providerName: string;
  name: string;
  serviceTypeLabel: string;
  meteringUnit: OperationsExternalServiceMeteringUnit;
  costPerUnit: number;
  pricingMode: OperationsUsagePricingMode;
  markupRate: number;
  grossMarginRate: number;
  salePricePerUnit: number;
  status: OperationsMeteringStatus;
  updatedAt: string;
}

/**
 * 第三方接口或 Skill 计费配置表单。
 */
export interface OperationsExternalMeteredServiceForm {
  providerId: string;
  name: string;
  serviceTypeLabel: string;
  meteringUnit: OperationsExternalServiceMeteringUnit;
  costPerUnit: number;
  pricingMode: OperationsUsagePricingMode;
  markupRate: number;
  grossMarginRate: number;
  salePricePerUnit: number;
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
  submissionType?: OperationsAgentSubmissionType;
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

/**
 * 用量费用明细。
 */
export interface OperationsUsageRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  productId: string;
  productName: string;
  agentName: string;
  requestCount: number;
  tokenCount: number;
  activeUsers: number;
  totalCost: number;
  periodLabel: string;
}

/**
 * 用量费用趋势点。
 */
export interface OperationsUsageTrendPoint {
  periodLabel: string;
  requestCount: number;
  tokenCount: number;
  totalCost: number;
}
