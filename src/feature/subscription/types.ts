import type { MockTenantPointsOrderStatus } from "@/feature/auth/types";

/**
 * 平台席位包标识，支持预置席位包和运营后台自定义席位包。
 */
export type MockSubscriptionPlanKey = string;

/**
 * 支持用户侧自助支付的席位包标识。
 */
export type MockSelfServeSubscriptionPlanKey = string;

/**
 * 席位包状态。
 */
export type MockSubscriptionPlanStatus = "active" | "inactive";

/**
 * 席位包可见范围。内部包只供运营后台给指定租户分配席位，用户侧不可见。
 */
export type MockSubscriptionPlanScope = "public" | "internal";

/**
 * 席位包有效时间单位。
 */
export type MockSubscriptionValidityUnit = "day" | "month" | "year";

/**
 * 席位包规格兼容标识。新席位包只有一个主规格，历史订单仍可能保留旧标识。
 */
export type MockSubscriptionBillingCycle = string;

/**
 * 订阅开通订单状态。
 */
export type MockSubscriptionOrderStatus = MockTenantPointsOrderStatus;

/**
 * 平台团队席位包售卖规格。席位包售卖后影响席位容量、赠送积分和席位有效期。
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
  /** 历史原型字段，仅用于兼容旧本地数据；当前版本不展示也不参与计价。 */
  contractPriceEnabled: boolean;
  /** 历史原型字段，仅用于兼容旧本地数据；当前版本不展示也不参与计价。 */
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

/**
 * Pro 席位购买输入。
 */
export type MockSubscriptionPurchaseMode = "addSeats" | "renew";

export interface MockSubscriptionPlanPurchaseInput {
  billingCycle?: MockSubscriptionBillingCycle;
  planKey?: MockSubscriptionPlanKey;
  purchaseMode?: MockSubscriptionPurchaseMode;
  seatCount: number;
}

/**
 * 用户侧自助购买席位包时使用的支付快照。
 */
export interface MockSubscriptionPlanPurchaseOption {
  planKey: MockSelfServeSubscriptionPlanKey;
  planLabel: string;
  billingCycle: MockSubscriptionBillingCycle;
  billingCycleLabel: string;
  discountAmount: number;
  expiresAt: string;
  originalAmount: number;
  priceLabel: string;
  purchaseMode: MockSubscriptionPurchaseMode;
  seatCount: number;
  seatLabel: string;
  unitPrice: number;
  giftPoints: number;
  amount: number;
  paymentChannelLabel?: string;
  prorationLabel?: string;
}
