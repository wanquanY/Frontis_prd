import type {
  OperationsModelBillingUnitPriceConfig,
  OperationsRegistrationStrategy,
  OperationsServicePricingMode,
} from "@/feature/operations/types";

export interface OperationsModelTokenUsageInput {
  standardInputTokens: number;
  cacheTokens?: number;
  outputTokens: number;
}

export interface OperationsModelTokenBillingResult {
  standardInputTokens: number;
  cacheTokens: number;
  outputTokens: number;
  standardInputCostAmount: number;
  cacheCostAmount: number;
  outputCostAmount: number;
  costAmount: number;
  standardInputSaleAmount: number;
  cacheSaleAmount: number;
  outputSaleAmount: number;
  saleAmount: number;
  marginAmount: number;
  points: number;
}

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

const calculateTokenAmount = (tokens: number, pricePerMillion: number): number =>
  normalizeOperationsMoney((Math.max(Math.floor(tokens), 0) / 1_000_000) * pricePerMillion);

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
 * 按供应商适配器归一化后的三个计费桶计算模型调用成本、售价和积分。
 */
export const calculateOperationsModelTokenBilling = (
  usage: OperationsModelTokenUsageInput,
  modelService: Pick<
    OperationsModelBillingUnitPriceConfig,
    | "inputCostPerMillion"
    | "cacheCostPerMillion"
    | "outputCostPerMillion"
    | "inputSalePricePerMillion"
    | "cacheSalePricePerMillion"
    | "outputSalePricePerMillion"
  >,
  registrationStrategy: OperationsRegistrationStrategy,
): OperationsModelTokenBillingResult => {
  const standardInputTokens = Math.max(Math.floor(usage.standardInputTokens), 0);
  const cacheTokens = Math.max(Math.floor(usage.cacheTokens ?? 0), 0);
  const outputTokens = Math.max(Math.floor(usage.outputTokens), 0);

  const standardInputCostAmount = calculateTokenAmount(
    standardInputTokens,
    modelService.inputCostPerMillion,
  );
  const cacheCostAmount = calculateTokenAmount(cacheTokens, modelService.cacheCostPerMillion);
  const outputCostAmount = calculateTokenAmount(outputTokens, modelService.outputCostPerMillion);
  const costAmount = normalizeOperationsMoney(
    standardInputCostAmount + cacheCostAmount + outputCostAmount,
  );

  const standardInputSaleAmount = calculateTokenAmount(
    standardInputTokens,
    modelService.inputSalePricePerMillion,
  );
  const cacheSaleAmount = calculateTokenAmount(cacheTokens, modelService.cacheSalePricePerMillion);
  const outputSaleAmount = calculateTokenAmount(
    outputTokens,
    modelService.outputSalePricePerMillion,
  );
  const saleAmount = normalizeOperationsMoney(
    standardInputSaleAmount + cacheSaleAmount + outputSaleAmount,
  );

  return {
    standardInputTokens,
    cacheTokens,
    outputTokens,
    standardInputCostAmount,
    cacheCostAmount,
    outputCostAmount,
    costAmount,
    standardInputSaleAmount,
    cacheSaleAmount,
    outputSaleAmount,
    saleAmount,
    marginAmount: normalizeOperationsMoney(saleAmount - costAmount),
    points: convertOperationsSaleToPoints(saleAmount, registrationStrategy),
  };
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
