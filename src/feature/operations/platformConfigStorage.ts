import {
  OPERATIONS_INITIAL_REGISTRATION_STRATEGY,
  OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG,
} from "@/feature/operations/mockData";
import type {
  OperationsRegistrationStrategy,
  OperationsServiceContactConfig,
} from "@/feature/operations/types";

const OPERATIONS_REGISTRATION_STRATEGY_STORAGE_KEY = "frontis.ops.registration-strategy";
const OPERATIONS_SERVICE_CONTACT_CONFIG_STORAGE_KEY = "frontis.ops.service-contact-config";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidRegistrationStrategy = (value: unknown): value is OperationsRegistrationStrategy =>
  isRecord(value) && typeof value.defaultGiftPoints === "number";

const isValidServiceContactConfig = (value: unknown): value is OperationsServiceContactConfig =>
  isRecord(value) && typeof value.qrCodeValue === "string";

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

const cloneServiceContactConfig = (
  config: OperationsServiceContactConfig,
): OperationsServiceContactConfig => ({
  enabled:
    typeof config.enabled === "boolean"
      ? config.enabled
      : OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG.enabled,
  contactName:
    typeof config.contactName === "string" && config.contactName.trim()
      ? config.contactName.trim()
      : OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG.contactName,
  qrCodeValue:
    typeof config.qrCodeValue === "string" && config.qrCodeValue.trim()
      ? config.qrCodeValue.trim()
      : OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG.qrCodeValue,
  remarkTemplate:
    typeof config.remarkTemplate === "string" && config.remarkTemplate.trim()
      ? config.remarkTemplate.trim()
      : OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG.remarkTemplate,
  updatedAt:
    typeof config.updatedAt === "string"
      ? config.updatedAt
      : OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG.updatedAt,
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

/**
 * 读取平台默认客服二维码配置。
 */
export const loadOperationsServiceContactConfig = (): OperationsServiceContactConfig => {
  if (typeof window === "undefined") {
    return cloneServiceContactConfig(OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG);
  }

  try {
    const rawValue = window.localStorage.getItem(OPERATIONS_SERVICE_CONTACT_CONFIG_STORAGE_KEY);

    if (!rawValue) {
      return cloneServiceContactConfig(OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG);
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isValidServiceContactConfig(parsedValue)) {
      return cloneServiceContactConfig(OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG);
    }

    return cloneServiceContactConfig(parsedValue);
  } catch {
    return cloneServiceContactConfig(OPERATIONS_INITIAL_SERVICE_CONTACT_CONFIG);
  }
};

/**
 * 保存平台默认客服二维码配置。
 */
export const saveOperationsServiceContactConfig = (
  config: OperationsServiceContactConfig,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OPERATIONS_SERVICE_CONTACT_CONFIG_STORAGE_KEY,
    JSON.stringify(cloneServiceContactConfig(config)),
  );
};
