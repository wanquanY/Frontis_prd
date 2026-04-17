/**
 * 运营后台登录角色。
 */
export type OperationsRole = "superAdmin" | "operator";

/**
 * 运营后台一级导航 key。
 */
export type OperationsPlatformTabKey =
  | "tenants"
  | "agents"
  | "products"
  | "fulfillment"
  | "resources";

/**
 * 运营后台租户状态。
 */
export type OperationsTenantStatus = "pending" | "active" | "suspended";

/**
 * 运营后台租户类型。
 */
export type OperationsTenantType = "enterprise" | "fde" | "internal";

/**
 * Agent 提审状态。
 */
export type OperationsAgentApprovalStatus = "pending" | "approved" | "rejected";

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
export type OperationsProductBillingMode =
  | "subscription"
  | "quotaPackage"
  | "postpaid"
  | "oneTime";

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
export type OperationsProductStatus = "draft" | "active" | "inactive";

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
export type OperationsResourcePoolType =
  | "physicalDevice"
  | "virtualDevice"
  | "thirdPartyApi";

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
  industry: string;
  adminName: string;
  adminPhone: string;
  seatCount: number;
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
  seatCount: number;
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
  rejectReason?: string;
  lastReviewedAt?: string;
}

/**
 * 商品对象。
 */
export interface OperationsProduct {
  id: string;
  name: string;
  supplyKind: OperationsProductSupplyKind;
  deliveryKind: OperationsProductDeliveryKind;
  billingMode: OperationsProductBillingMode;
  meteringUnit: OperationsProductMeteringUnit;
  billingSpec: OperationsProductBillingSpec;
  linkedAgentId?: string;
  linkedAgentName?: string;
  resourcePoolId?: string;
  resourcePoolName?: string;
  description: string;
  price: number;
  status: OperationsProductStatus;
  updatedAt: string;
}

/**
 * 商品表单。
 */
export interface OperationsProductForm {
  name: string;
  supplyKind: OperationsProductSupplyKind;
  deliveryKind: OperationsProductDeliveryKind;
  billingMode: OperationsProductBillingMode;
  meteringUnit: OperationsProductMeteringUnit;
  billingSpec: OperationsProductBillingSpec;
  linkedAgentId?: string;
  resourcePoolId?: string;
  description: string;
  price: number;
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
