import type {
  OperationsRegistrationStrategy,
  OperationsServicePricingMode,
} from "@/feature/operations/types";

/**
 * 规范化运营侧资源计量金额，保留足够的小额接口计费精度。
 */
export const normalizeOperationsMoney = (value: number): number =>
  Number(Math.max(0, value).toFixed(4));

/**
 * 根据资源成本和定价策略计算资源计量单价。
 */
export const calculateOperationsSalePrice = (
  cost: number,
  pricingMode: OperationsServicePricingMode,
  markupRate: number,
  grossMarginRate: number,
  manualSalePrice: number,
): number => {
  if (pricingMode === "manual") {
    return normalizeOperationsMoney(manualSalePrice);
  }

  if (pricingMode === "grossMargin") {
    const safeGrossMarginRate = Math.min(Math.max(grossMarginRate, 0), 95);

    return normalizeOperationsMoney(cost / (1 - safeGrossMarginRate / 100));
  }

  return normalizeOperationsMoney(cost * Math.max(markupRate, 1));
};

/**
 * 把资源计量金额按积分规则换算为扣减积分。
 */
export const convertOperationsSaleToPoints = (
  saleAmount: number,
  registrationStrategy: OperationsRegistrationStrategy,
): number => {
  const rawPoints = saleAmount * registrationStrategy.pointsPerCny;
  const roundingUnit = Math.max(registrationStrategy.roundingUnit, 1);
  const roundedPoints = Math.ceil(rawPoints / roundingUnit) * roundingUnit;

  return Math.max(registrationStrategy.minimumDeductPoints, roundedPoints);
};

/**
 * 格式化运营侧人民币金额。
 */
export const formatOperationsCurrency = (value: number): string =>
  `¥${value.toLocaleString("zh-CN", {
    minimumFractionDigits: value > 0 && value < 1 ? 3 : 2,
    maximumFractionDigits: 4,
  })}`;

/**
 * 格式化运营侧积分数量。
 */
export const formatOperationsPoints = (value: number): string =>
  `${value.toLocaleString("zh-CN")} 积分`;
