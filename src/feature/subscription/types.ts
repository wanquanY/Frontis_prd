import type { MockTenantPointsOrderStatus } from "@/feature/auth/types";

/**
 * 平台订阅计划标识，支持预置计划和运营后台自定义计划。
 */
export type MockSubscriptionPlanKey = string;

/**
 * 支持用户侧自助支付的订阅计划标识。
 */
export type MockSelfServeSubscriptionPlanKey = string;

/**
 * 订阅计划状态。
 */
export type MockSubscriptionPlanStatus = "active" | "inactive";

/**
 * 席位包可见范围。内部包只供运营后台给指定租户分配席位，用户侧不可见。
 */
export type MockSubscriptionPlanScope = "public" | "internal";

/**
 * 订阅包有效周期单位。
 */
export type MockSubscriptionValidityUnit = "month" | "year";

/**
 * 席位包规格周期标识。预置规格使用 monthly/yearly，运营可扩展自定义策略。
 */
export type MockSubscriptionBillingCycle = string;

/**
 * 订阅购买后判定的客户版本。
 */
export type MockSubscriptionCustomerTier = "pro" | "enterprise";

/**
 * 订阅开通订单状态。
 */
export type MockSubscriptionOrderStatus = MockTenantPointsOrderStatus;

/**
 * 平台团队席位包售卖规格。席位包只配置是否启用渠道码优惠，最终价格由渠道码所属渠道单价计算。
 */
export interface MockSubscriptionPlanSpec {
  key: string;
  title: string;
  billingCycle: MockSubscriptionBillingCycle;
  billingCycleLabel: string;
  enabled: boolean;
  priceAmount: number;
  giftPoints: number;
  validityCount: number;
  validityUnit: MockSubscriptionValidityUnit;
  contractPriceEnabled: boolean;
  /** 历史原型字段，仅用于兼容旧本地数据；新价格逻辑不再读取该金额。 */
  contractPriceAmount: number;
}

/**
 * 平台团队席位包。席位包售卖后影响席位容量、赠送积分和席位有效期。
 */
export interface MockSubscriptionPlanTemplate {
  key: MockSubscriptionPlanKey;
  sequence: string;
  title: string;
  seatCount: number;
  monthlyEnabled: boolean;
  yearlyEnabled: boolean;
  contractYearlyEnabled: boolean;
  monthlyPriceAmount: number;
  yearlyPriceAmount: number;
  contractYearlyPriceAmount: number;
  monthlyGiftPoints: number;
  yearlyGiftPoints: number;
  monthlyValidityCount: number;
  yearlyValidityCount: number;
  specs: MockSubscriptionPlanSpec[];
  scope: MockSubscriptionPlanScope;
  status: MockSubscriptionPlanStatus;
  updatedAt: string;
}

/**
 * 运营后台维护团队席位包时提交的配置。
 */
export type MockSubscriptionPlanTemplateInput = Pick<
  MockSubscriptionPlanTemplate,
  | "title"
  | "seatCount"
  | "monthlyEnabled"
  | "yearlyEnabled"
  | "contractYearlyEnabled"
  | "monthlyPriceAmount"
  | "yearlyPriceAmount"
  | "contractYearlyPriceAmount"
  | "monthlyGiftPoints"
  | "yearlyGiftPoints"
  | "monthlyValidityCount"
  | "yearlyValidityCount"
  | "specs"
  | "scope"
  | "status"
>;

export interface MockSalesChannelContractCodePriceVersion {
  codeQuota: number;
  createdAt: string;
  id: string;
  operationLabel: "create" | "appendQuota" | "updateUnitPrice";
  unitPriceAmount: number;
}

/**
 * 渠道主码。渠道主码是渠道码三段格式中的第一段，负责承载渠道额度和单价规则。
 */
export interface MockSalesChannelContractCode {
  code: string;
  channelName: string;
  /** 历史原型字段，仅用于兼容旧本地数据；新渠道码价格不再读取该系数。 */
  discountFactor: number;
  codeQuota: number;
  ownerName: string;
  ownerPhone?: string;
  priceVersions: MockSalesChannelContractCodePriceVersion[];
  salesMemberId?: string;
  salesMemberName?: string;
  salesMemberPhone?: string;
  status: "active" | "inactive";
  serviceLabel: string;
  tenantId?: string;
  tenantName?: string;
  unitPriceAmount: number;
}

/**
 * 运营后台维护渠道码时提交的配置。
 */
export type MockSalesChannelContractCodeInput = MockSalesChannelContractCode;

/**
 * Pro 席位购买输入。
 */
export type MockSubscriptionPurchaseMode = "addSeats" | "renew";

export interface MockSubscriptionPlanPurchaseInput {
  billingCycle: MockSubscriptionBillingCycle;
  contractCode?: string;
  purchaseMode?: MockSubscriptionPurchaseMode;
  seatCount: number;
}

/**
 * 用户侧自助购买订阅计划时使用的支付快照。
 */
export interface MockSubscriptionPlanPurchaseOption {
  planKey: MockSelfServeSubscriptionPlanKey;
  planLabel: string;
  billingCycle: MockSubscriptionBillingCycle;
  billingCycleLabel: string;
  contractCode?: string;
  contractCodeStatusLabel?: string;
  customerTier: MockSubscriptionCustomerTier;
  discountAmount: number;
  enterpriseQualified: boolean;
  expiresAt: string;
  originalAmount: number;
  ownerName?: string;
  priceLabel: string;
  purchaseMode: MockSubscriptionPurchaseMode;
  seatCount: number;
  seatLabel: string;
  serviceLabel?: string;
  unitPrice: number;
  giftPoints: number;
  channelName?: string;
  amount: number;
  paymentChannelLabel?: string;
  prorationLabel?: string;
  ruleMessage: string;
}
