import { OPERATIONS_INITIAL_REGISTRATION_STRATEGY } from "@/feature/operations/mockData";
import type { OperationsRegistrationStrategy } from "@/feature/operations/types";

const OPERATIONS_REGISTRATION_STRATEGY_STORAGE_KEY = "frontis.ops.registration-strategy";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidRegistrationStrategy = (value: unknown): value is OperationsRegistrationStrategy =>
  isRecord(value) && typeof value.defaultGiftPoints === "number";

const getPositiveNumber = (value: unknown, fallbackValue: number): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallbackValue;

const getNonNegativeNumber = (value: unknown, fallbackValue: number): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallbackValue;

const cloneRegistrationStrategy = (
  strategy: OperationsRegistrationStrategy,
): OperationsRegistrationStrategy => ({
  defaultGiftPoints: getNonNegativeNumber(
    strategy.defaultGiftPoints,
    OPERATIONS_INITIAL_REGISTRATION_STRATEGY.defaultGiftPoints,
  ),
  referralDailyRewardLimit: getPositiveNumber(
    strategy.referralDailyRewardLimit,
    OPERATIONS_INITIAL_REGISTRATION_STRATEGY.referralDailyRewardLimit,
  ),
  referralEnabled:
    typeof strategy.referralEnabled === "boolean"
      ? strategy.referralEnabled
      : OPERATIONS_INITIAL_REGISTRATION_STRATEGY.referralEnabled,
  referralInviteeRewardPoints: getNonNegativeNumber(
    strategy.referralInviteeRewardPoints,
    OPERATIONS_INITIAL_REGISTRATION_STRATEGY.referralInviteeRewardPoints,
  ),
  referralInviterRewardPoints: getNonNegativeNumber(
    strategy.referralInviterRewardPoints,
    OPERATIONS_INITIAL_REGISTRATION_STRATEGY.referralInviterRewardPoints,
  ),
  referralMonthlyRewardLimit: getPositiveNumber(
    strategy.referralMonthlyRewardLimit,
    OPERATIONS_INITIAL_REGISTRATION_STRATEGY.referralMonthlyRewardLimit,
  ),
  pointsPerCny: getPositiveNumber(
    strategy.pointsPerCny,
    OPERATIONS_INITIAL_REGISTRATION_STRATEGY.pointsPerCny,
  ),
  minimumDeductPoints: getPositiveNumber(
    strategy.minimumDeductPoints,
    OPERATIONS_INITIAL_REGISTRATION_STRATEGY.minimumDeductPoints,
  ),
  roundingUnit: getPositiveNumber(
    strategy.roundingUnit,
    OPERATIONS_INITIAL_REGISTRATION_STRATEGY.roundingUnit,
  ),
  updatedAt:
    typeof strategy.updatedAt === "string"
      ? strategy.updatedAt
      : OPERATIONS_INITIAL_REGISTRATION_STRATEGY.updatedAt,
});

/**
 * 读取平台侧注册送积分规则。
 */
export const loadOperationsRegistrationStrategy = (): OperationsRegistrationStrategy => {
  if (typeof window === "undefined") {
    return cloneRegistrationStrategy(OPERATIONS_INITIAL_REGISTRATION_STRATEGY);
  }

  try {
    const rawValue = window.localStorage.getItem(OPERATIONS_REGISTRATION_STRATEGY_STORAGE_KEY);

    if (!rawValue) {
      return cloneRegistrationStrategy(OPERATIONS_INITIAL_REGISTRATION_STRATEGY);
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isValidRegistrationStrategy(parsedValue)) {
      return cloneRegistrationStrategy(OPERATIONS_INITIAL_REGISTRATION_STRATEGY);
    }

    return cloneRegistrationStrategy(parsedValue);
  } catch {
    return cloneRegistrationStrategy(OPERATIONS_INITIAL_REGISTRATION_STRATEGY);
  }
};

/**
 * 保存平台侧注册送积分规则。
 */
export const saveOperationsRegistrationStrategy = (
  strategy: OperationsRegistrationStrategy,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OPERATIONS_REGISTRATION_STRATEGY_STORAGE_KEY,
    JSON.stringify(strategy),
  );
};
