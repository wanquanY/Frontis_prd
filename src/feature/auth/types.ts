import type { FrontisUserRole, FrontisWebRole, FrontisWebUserItem } from "@/pages/types";

export type MockAuthRole = FrontisWebRole;
export type MockIdentityPlatform = "enterpriseWorkspace" | "enterpriseAdmin" | "operationsAdmin";

/**
 * 统一用户的可选身份入口定义。
 */
export interface MockAuthIdentity {
  id: string;
  subjectId: string;
  subjectName: string;
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  platform: MockIdentityPlatform;
  platformLabel: string;
  permissionIds?: string[];
  role: MockAuthRole;
  roleLabel: string;
  description: string;
  entryPath: string;
  operationsAccountId?: string;
}

/**
 * 当前账号可见的系统入口。
 */
export interface MockAuthSystemEntry {
  identityId: string;
  label: string;
  entryPath: string;
  platform: MockIdentityPlatform;
  operationsAccountId?: string;
}

/**
 * 当前账号可切换的租户入口。
 */
export interface MockAuthTenantEntry {
  tenantId: string;
  tenantName: string;
  tenantCode: string;
}

/**
 * 模拟登录账号信息。
 */
export interface MockAuthAccount {
  accountId: string;
  userId: string;
  name: string;
  phone: string;
  password?: string;
  passwordSetupRequired?: boolean;
  role: MockAuthRole;
  roleLabel: string;
  description: string;
  verificationCode: string;
  identities: MockAuthIdentity[];
  quickLoginIdentityId?: string;
}

/**
 * 模拟登录会话信息。
 */
export interface MockAuthSession {
  accountId: string;
  userId: string;
  name: string;
  phone: string;
  role: MockAuthRole | null;
  roleLabel?: string;
  loginAt: string;
  identities: MockAuthIdentity[];
  activeIdentityId?: string;
  deploymentMode?: MockTenantDeploymentMode;
}

/**
 * 租户额度流水方向。
 */
export type MockTenantPointsLedgerDirection = "income" | "expense";

/**
 * 租户额度流水记录。
 */
export interface MockTenantPointsLedgerItem {
  id: string;
  title: string;
  description: string;
  points: number;
  direction: MockTenantPointsLedgerDirection;
  createdAt: string;
  actorName: string;
}

/**
 * 租户额度消耗记录。
 */
export interface MockTenantPointsUsageRecordItem {
  id: string;
  channelLabel: string;
  targetLabel: string;
  actorName: string;
  runtimeLabel: string;
  points: number;
  occurredAt: string;
  description: string;
}

/**
 * 租户积分购买订单状态。
 */
export type MockTenantPointsOrderStatus = "paid" | "pending" | "expired" | "closed";

/**
 * 租户积分购买订单。
 */
export interface MockTenantPointsOrderItem {
  id: string;
  orderNo: string;
  packageId: string;
  packageTitle: string;
  packagePoints: number;
  giftPoints?: number;
  totalPoints?: number;
  amount: number;
  originalAmount?: number;
  discountAmount?: number;
  discountFactor?: number;
  promotionEndsAt?: string;
  status: MockTenantPointsOrderStatus;
  paymentChannelLabel: string;
  purchaserName: string;
  createdAt: string;
  paidAt?: string;
}

/**
 * 租户订阅开通订单。
 */
export interface MockTenantSubscriptionOrderItem {
  id: string;
  orderNo: string;
  planKey: string;
  planTitle: string;
  amount: number;
  seatCount: number;
  billingCycleLabel: string;
  status: MockTenantPointsOrderStatus;
  orderSourceLabel: string;
  paymentChannelLabel: string;
  purchaserName: string;
  createdAt: string;
  paidAt?: string;
  billingCycle?: string;
  unitPrice?: number;
  originalAmount?: number;
  discountAmount?: number;
  contractCode?: string;
  customerTier?: "pro" | "enterprise";
  channelName?: string;
  ownerName?: string;
  serviceLabel?: string;
  expiresAt?: string;
  prorationLabel?: string;
  purchaseMode?: "addSeats" | "renew";
}

/**
 * 租户当前版本。
 */
export type MockTenantEdition = "personal" | "team";

/**
 * 租户部署形态。
 */
export type MockTenantDeploymentMode = "publicCloud" | "privateCloud";

/**
 * 租户计费口径。
 */
export type MockTenantBillingMode = "points" | "cost";

/**
 * 团队版 AI 专家用量记录。
 */
export interface MockTenantAgentUsageRecordItem {
  id: string;
  actorName: string;
  agentName: string;
  departmentName: string;
  inputTokens: number;
  outputTokens: number;
  callCount: number;
  occurredAt: string;
  costAmount?: number;
  humanCostAmount?: number;
  industryBenchmarkCostAmount?: number;
  points?: number;
}

/**
 * 租户管理后台中的基础运营信息。
 */
export interface MockTenantManagementSnapshot {
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  ownerAccountId: string;
  adminUserId: string;
  deploymentMode: MockTenantDeploymentMode;
  billingMode: MockTenantBillingMode;
  edition: MockTenantEdition;
  planLabel: string;
  includedSeats: number;
  extraSeatCount: number;
  teamPlanPackageId?: string;
  planExpiresAt?: string;
  hasAgentListingAccess: boolean;
  invitePolicyLabel: string;
  lowBalanceThreshold: number;
  monthlyUsedPoints: number;
  pointsBalance: number;
  totalSeats: number;
  usedSeats: number;
  users: FrontisWebUserItem[];
  agentUsageRecords: MockTenantAgentUsageRecordItem[];
  pointsLedger: MockTenantPointsLedgerItem[];
  pointsUsageRecords: MockTenantPointsUsageRecordItem[];
  pointsOrders: MockTenantPointsOrderItem[];
  subscriptionOrders: MockTenantSubscriptionOrderItem[];
}

/**
 * 模拟自注册参数。
 */
export interface MockTenantRegistrationParams {
  name: string;
  phone: string;
  tenantName: string;
  verificationCode: string;
}

/**
 * 模拟密码登录提交参数。
 */
export interface MockPasswordLoginParams {
  phone: string;
  password: string;
  redirectPath?: string;
  deploymentMode?: MockTenantDeploymentMode;
}

/**
 * 模拟首次设置密码参数。
 */
export interface MockPasswordSetupParams {
  accountId: string;
  password: string;
  confirmPassword: string;
  redirectPath?: string;
  deploymentMode?: MockTenantDeploymentMode;
}

/**
 * 模拟租户邀请成员参数。
 */
export interface MockTenantInviteMemberParams {
  departmentId: string;
  inviterName: string;
  name: string;
  phone: string;
  role: FrontisUserRole;
  roleIds?: string[];
}

/**
 * 模拟登录提交参数。
 */
export interface MockLoginParams {
  phone: string;
  verificationCode: string;
  redirectPath?: string;
  deploymentMode?: MockTenantDeploymentMode;
}

/**
 * 模拟登录动作结果。
 */
export interface MockAuthActionResult {
  success: boolean;
  message: string;
  redirectPath?: string;
  verificationCode?: string;
  requiresPasswordSetup?: boolean;
  isNewlyRegistered?: boolean;
  account?: MockAuthAccount;
  session?: MockAuthSession;
  identity?: MockAuthIdentity;
}
