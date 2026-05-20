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
 * 平台团队席位包售卖规格。月付、年付、签约价都只是规格属性，不作为特殊业务分支。
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
  | "status"
>;

/**
 * 签约子码。
 */
export interface MockSalesChannelContractSubCode {
  code: string;
  ownerName?: string;
  status: "active" | "inactive";
  serviceLabel?: string;
}

/**
 * 签约码。
 */
export interface MockSalesChannelContractCode {
  code: string;
  channelName: string;
  ownerName: string;
  status: "active" | "inactive";
  serviceLabel: string;
  subCodes: MockSalesChannelContractSubCode[];
}

/**
 * 运营后台维护签约码时提交的配置。
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
