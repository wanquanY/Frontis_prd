import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import {
  getMockTenantManagementSnapshot,
  saveMockTenantManagementSnapshot,
} from "@/feature/auth/mockTenantRegistry";

import type {
  MockSalesChannelContractCode,
  MockSalesChannelContractCodeInput,
  MockSelfServeSubscriptionPlanKey,
  MockSubscriptionBillingCycle,
  MockSubscriptionCustomerTier,
  MockSubscriptionPlanKey,
  MockSubscriptionPlanPurchaseInput,
  MockSubscriptionPlanPurchaseOption,
  MockSubscriptionPurchaseMode,
  MockSubscriptionPlanStatus,
  MockSubscriptionPlanTemplate,
  MockSubscriptionPlanTemplateInput,
  MockSubscriptionValidityUnit,
} from "./types";

const MOCK_CONTRACT_CODE_STORAGE_KEY = "frontis.mock.sales-channel-contract-codes";
const MOCK_SUBSCRIPTION_PLAN_STORAGE_KEY = "frontis.mock.team-seat-packages.v2";
const MOCK_SUBSCRIPTION_TODAY = "2026-05-25";
const MOCK_PROMOTION_ENDS_AT = "2026-08-25";
const PRO_MONTHLY_SEAT_PRICE = 39;
const PRO_YEARLY_SEAT_PRICE = 399;
const ENTERPRISE_YEARLY_SEAT_PRICE = 299;
const ENTERPRISE_MINIMUM_SEATS_AFTER_PROMOTION = 10;
const TEAM_SEAT_PACKAGE_KEY = "team-seat-package";
const LEGACY_SUBSCRIPTION_PLAN_KEYS = new Set([
  "lite",
  "pro-monthly",
  "pro-yearly",
  "enterprise-contract-yearly",
]);

type CreateMockSubscriptionPlanPayload = MockSubscriptionPlanTemplateInput;
type CreateMockSalesChannelContractCodePayload = MockSalesChannelContractCodeInput;

interface DateParts {
  day: number;
  month: number;
  year: number;
}

const VALIDITY_UNIT_LABELS: Record<MockSubscriptionValidityUnit, string> = {
  month: "月",
  year: "年",
};

const PRESET_CONTRACT_CODES: MockSalesChannelContractCode[] = [
  {
    code: "SALES299",
    channelName: "直营销售",
    ownerName: "王晨",
    status: "active",
    serviceLabel: "专属销售跟进、Agent 定制化需求对接",
  },
  {
    code: "CHANNEL299",
    channelName: "华东渠道",
    ownerName: "李婷",
    status: "active",
    serviceLabel: "渠道专属售后、Agent 定制化需求对接",
  },
  {
    code: "EXPIRED299",
    channelName: "历史渠道",
    ownerName: "赵立",
    status: "inactive",
    serviceLabel: "已停用签约码",
  },
];

/**
 * 格式化订阅包有效期展示文案。
 */
export const formatMockSubscriptionValidity = (
  validityCount: number,
  validityUnit: MockSubscriptionValidityUnit,
): string =>
  validityCount > 0 ? `${validityCount} ${VALIDITY_UNIT_LABELS[validityUnit]}` : "长期有效";

const formatSeatUnitPrice = (
  priceAmount: number,
  validityUnit: MockSubscriptionValidityUnit,
): string =>
  `¥${Math.max(priceAmount, 0).toLocaleString("zh-CN")} / 席 / ${VALIDITY_UNIT_LABELS[validityUnit]}`;

/**
 * 根据团队席位包配置生成运营侧展示信息。
 */
export const buildMockSubscriptionPlanBenefitTexts = (
  plan: Pick<
    MockSubscriptionPlanTemplate,
    | "contractYearlyPriceAmount"
    | "monthlyGiftPoints"
    | "monthlyPriceAmount"
    | "monthlyValidityCount"
    | "seatCount"
    | "yearlyGiftPoints"
    | "yearlyPriceAmount"
    | "yearlyValidityCount"
  >,
): string[] => [
  `${plan.seatCount} 个席位单位`,
  `月付 ${formatSeatUnitPrice(plan.monthlyPriceAmount, "month")}`,
  `年付 ${formatSeatUnitPrice(plan.yearlyPriceAmount, "year")}`,
  `签约年付 ${formatSeatUnitPrice(plan.contractYearlyPriceAmount, "year")}`,
  `月付有效期 ${formatMockSubscriptionValidity(plan.monthlyValidityCount, "month")}`,
  `年付有效期 ${formatMockSubscriptionValidity(plan.yearlyValidityCount, "year")}`,
  `月付赠送 ${plan.monthlyGiftPoints.toLocaleString("zh-CN")} 积分`,
  `年付赠送 ${plan.yearlyGiftPoints.toLocaleString("zh-CN")} 积分`,
];

const PRESET_SUBSCRIPTION_PLANS: MockSubscriptionPlanTemplate[] = [
  {
    key: TEAM_SEAT_PACKAGE_KEY,
    sequence: "01",
    title: "团队席位包",
    seatCount: 1,
    monthlyPriceAmount: PRO_MONTHLY_SEAT_PRICE,
    yearlyPriceAmount: PRO_YEARLY_SEAT_PRICE,
    contractYearlyPriceAmount: ENTERPRISE_YEARLY_SEAT_PRICE,
    monthlyGiftPoints: 1000,
    yearlyGiftPoints: 12000,
    monthlyValidityCount: 1,
    yearlyValidityCount: 1,
    status: "active",
    updatedAt: "2026-05-25 10:00",
  },
];

const cloneSubscriptionPlan = (
  plan: MockSubscriptionPlanTemplate,
): MockSubscriptionPlanTemplate => ({
  ...plan,
});

const buildSubscriptionPlanKey = (title: string): MockSubscriptionPlanKey => {
  const normalizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `seat-package-${normalizedTitle || "team"}-${Date.now()}`;
};

const buildSubscriptionPlanSequence = (plans: MockSubscriptionPlanTemplate[]): string =>
  `${plans.length + 1}`.padStart(2, "0");

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const readNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const readString = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const readStatus = (
  value: unknown,
  fallback: MockSubscriptionPlanStatus,
): MockSubscriptionPlanStatus => (value === "inactive" || value === "active" ? value : fallback);

const readContractCodeStatus = (
  value: unknown,
  fallback: MockSalesChannelContractCode["status"],
): MockSalesChannelContractCode["status"] =>
  value === "inactive" || value === "active" ? value : fallback;

const readValidityUnit = (
  value: unknown,
  fallback: MockSubscriptionValidityUnit,
): MockSubscriptionValidityUnit => (value === "year" || value === "month" ? value : fallback);

const normalizeContractCode = (code: string): string => code.trim().toUpperCase();

const cloneContractCode = (
  contractCode: MockSalesChannelContractCode,
): MockSalesChannelContractCode => ({
  ...contractCode,
});

const normalizeStoredContractCode = (
  value: unknown,
  fallbackCode: MockSalesChannelContractCode,
): MockSalesChannelContractCode => {
  const contractCode = readRecord(value);

  if (!contractCode) {
    return cloneContractCode(fallbackCode);
  }

  return {
    code: normalizeContractCode(readString(contractCode.code, fallbackCode.code)),
    channelName: readString(contractCode.channelName, fallbackCode.channelName).trim(),
    ownerName: readString(contractCode.ownerName, fallbackCode.ownerName).trim(),
    status: readContractCodeStatus(contractCode.status, fallbackCode.status),
    serviceLabel: readString(contractCode.serviceLabel, fallbackCode.serviceLabel).trim(),
  };
};

const createCustomFallbackContractCode = (value: unknown): MockSalesChannelContractCode | null => {
  const contractCode = readRecord(value);

  if (!contractCode || typeof contractCode.code !== "string") {
    return null;
  }

  return normalizeStoredContractCode(contractCode, {
    code: contractCode.code,
    channelName: "",
    ownerName: "",
    status: "active",
    serviceLabel: "",
  });
};

const normalizeStoredPlan = (
  value: unknown,
  fallbackPlan: MockSubscriptionPlanTemplate,
): MockSubscriptionPlanTemplate => {
  const plan = readRecord(value);

  if (!plan) {
    return cloneSubscriptionPlan(fallbackPlan);
  }

  const seatCount = readNumber(plan.seatCount, fallbackPlan.seatCount);
  const legacyValidityUnit = readValidityUnit(plan.validityUnit, "month");
  const legacyPriceAmount = readNumber(plan.priceAmount, 0);
  const legacyGiftPoints = readNumber(plan.giftPoints, 0);
  const legacyValidityCount = readNumber(plan.validityCount, 1);

  return {
    key: readString(plan.key, fallbackPlan.key),
    sequence: readString(plan.sequence, fallbackPlan.sequence),
    title: readString(plan.title, fallbackPlan.title),
    seatCount,
    monthlyPriceAmount: readNumber(
      plan.monthlyPriceAmount,
      legacyValidityUnit === "month" && legacyPriceAmount > 0
        ? legacyPriceAmount
        : fallbackPlan.monthlyPriceAmount,
    ),
    yearlyPriceAmount: readNumber(
      plan.yearlyPriceAmount,
      legacyValidityUnit === "year" && legacyPriceAmount > 0
        ? legacyPriceAmount
        : fallbackPlan.yearlyPriceAmount,
    ),
    contractYearlyPriceAmount: readNumber(
      plan.contractYearlyPriceAmount,
      fallbackPlan.contractYearlyPriceAmount,
    ),
    monthlyGiftPoints: readNumber(
      plan.monthlyGiftPoints,
      legacyValidityUnit === "month" ? legacyGiftPoints : fallbackPlan.monthlyGiftPoints,
    ),
    yearlyGiftPoints: readNumber(
      plan.yearlyGiftPoints,
      legacyValidityUnit === "year" ? legacyGiftPoints : fallbackPlan.yearlyGiftPoints,
    ),
    monthlyValidityCount: readNumber(
      plan.monthlyValidityCount,
      legacyValidityUnit === "month" ? legacyValidityCount : fallbackPlan.monthlyValidityCount,
    ),
    yearlyValidityCount: readNumber(
      plan.yearlyValidityCount,
      legacyValidityUnit === "year" ? legacyValidityCount : fallbackPlan.yearlyValidityCount,
    ),
    status: readStatus(plan.status, fallbackPlan.status),
    updatedAt: readString(plan.updatedAt, fallbackPlan.updatedAt),
  };
};

const createCustomFallbackPlan = (
  value: unknown,
  index: number,
): MockSubscriptionPlanTemplate | null => {
  const plan = readRecord(value);

  if (!plan || typeof plan.key !== "string") {
    return null;
  }

  const fallbackPlan = PRESET_SUBSCRIPTION_PLANS[0];

  return {
    key: plan.key,
    sequence: readString(
      plan.sequence,
      `${PRESET_SUBSCRIPTION_PLANS.length + index + 1}`.padStart(2, "0"),
    ),
    title: readString(plan.title, "团队席位包"),
    seatCount: readNumber(plan.seatCount, fallbackPlan.seatCount),
    monthlyPriceAmount: readNumber(plan.monthlyPriceAmount, fallbackPlan.monthlyPriceAmount),
    yearlyPriceAmount: readNumber(plan.yearlyPriceAmount, fallbackPlan.yearlyPriceAmount),
    contractYearlyPriceAmount: readNumber(
      plan.contractYearlyPriceAmount,
      fallbackPlan.contractYearlyPriceAmount,
    ),
    monthlyGiftPoints: readNumber(plan.monthlyGiftPoints, fallbackPlan.monthlyGiftPoints),
    yearlyGiftPoints: readNumber(plan.yearlyGiftPoints, fallbackPlan.yearlyGiftPoints),
    monthlyValidityCount: readNumber(plan.monthlyValidityCount, fallbackPlan.monthlyValidityCount),
    yearlyValidityCount: readNumber(plan.yearlyValidityCount, fallbackPlan.yearlyValidityCount),
    status: readStatus(plan.status, "active"),
    updatedAt: readString(plan.updatedAt, "刚刚"),
  };
};

const readStoredSubscriptionPlans = (): unknown[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(MOCK_SUBSCRIPTION_PLAN_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const readStoredContractCodes = (): unknown[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(MOCK_CONTRACT_CODE_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const writeStoredSubscriptionPlans = (plans: MockSubscriptionPlanTemplate[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MOCK_SUBSCRIPTION_PLAN_STORAGE_KEY, JSON.stringify(plans));
};

const writeStoredContractCodes = (contractCodes: MockSalesChannelContractCode[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MOCK_CONTRACT_CODE_STORAGE_KEY, JSON.stringify(contractCodes));
};

const sortContractCodes = (
  contractCodes: MockSalesChannelContractCode[],
): MockSalesChannelContractCode[] =>
  [...contractCodes].sort((leftItem, rightItem) => leftItem.code.localeCompare(rightItem.code));

const sortSubscriptionPlans = (
  plans: MockSubscriptionPlanTemplate[],
): MockSubscriptionPlanTemplate[] =>
  [...plans].sort((leftItem, rightItem) => {
    const leftSequence = Number.parseInt(leftItem.sequence, 10);
    const rightSequence = Number.parseInt(rightItem.sequence, 10);

    if (leftSequence !== rightSequence) {
      return leftSequence - rightSequence;
    }

    return leftItem.title.localeCompare(rightItem.title, "zh-CN");
  });

const parseDate = (dateValue: string): DateParts => {
  const [year = "2026", month = "01", day = "01"] = dateValue.split("-");

  return {
    year: Number.parseInt(year, 10),
    month: Number.parseInt(month, 10),
    day: Number.parseInt(day, 10),
  };
};

const toDate = (dateValue: string): Date => {
  const date = parseDate(dateValue);

  return new Date(date.year, date.month - 1, date.day);
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const addMonths = (dateValue: string, monthCount: number): string => {
  const currentDate = toDate(dateValue);
  currentDate.setMonth(currentDate.getMonth() + monthCount);

  return formatDate(currentDate);
};

const addYears = (dateValue: string, yearCount: number): string => {
  const currentDate = toDate(dateValue);
  currentDate.setFullYear(currentDate.getFullYear() + yearCount);

  return formatDate(currentDate);
};

const getDaysBetween = (startDateValue: string, endDateValue: string): number => {
  const startDate = toDate(startDateValue);
  const endDate = toDate(endDateValue);
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.max(Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs), 0);
};

const isDateAfter = (leftDateValue: string | undefined, rightDateValue: string): boolean =>
  Boolean(leftDateValue) && getDaysBetween(rightDateValue, leftDateValue ?? rightDateValue) > 0;

const findContractCode = (contractCode?: string): MockSalesChannelContractCode | null => {
  const normalizedCode = contractCode?.trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  return getMockSalesChannelContractCodes().find(item => item.code === normalizedCode) ?? null;
};

const getPromotionIsActive = (): boolean =>
  toDate(MOCK_SUBSCRIPTION_TODAY).getTime() <= toDate(MOCK_PROMOTION_ENDS_AT).getTime();

const getPlanBillingConfig = (
  plan: MockSubscriptionPlanTemplate,
  billingCycle: MockSubscriptionBillingCycle,
  enterpriseQualified: boolean,
): {
  giftPoints: number;
  priceAmount: number;
  validityCount: number;
  validityUnit: MockSubscriptionValidityUnit;
} => {
  if (billingCycle === "monthly") {
    return {
      giftPoints: plan.monthlyGiftPoints,
      priceAmount: plan.monthlyPriceAmount,
      validityCount: plan.monthlyValidityCount,
      validityUnit: "month",
    };
  }

  return {
    giftPoints: plan.yearlyGiftPoints,
    priceAmount: enterpriseQualified ? plan.contractYearlyPriceAmount : plan.yearlyPriceAmount,
    validityCount: plan.yearlyValidityCount,
    validityUnit: "year",
  };
};

const getPlanCycleDays = (
  plan: Pick<ReturnType<typeof getPlanBillingConfig>, "validityCount" | "validityUnit">,
): number => {
  const cycleCount = Math.max(plan.validityCount, 1);

  return plan.validityUnit === "month" ? cycleCount * 30 : cycleCount * 365;
};

const getDefaultExpiresAt = (
  plan: Pick<ReturnType<typeof getPlanBillingConfig>, "validityCount" | "validityUnit">,
): string =>
  plan.validityUnit === "month"
    ? addMonths(MOCK_SUBSCRIPTION_TODAY, Math.max(plan.validityCount, 1))
    : addYears(MOCK_SUBSCRIPTION_TODAY, Math.max(plan.validityCount, 1));

const addPlanValidity = (
  dateValue: string,
  plan: Pick<ReturnType<typeof getPlanBillingConfig>, "validityCount" | "validityUnit">,
): string =>
  plan.validityUnit === "month"
    ? addMonths(dateValue, Math.max(plan.validityCount, 1))
    : addYears(dateValue, Math.max(plan.validityCount, 1));

const getAlignedExpiryInfo = (
  plan: Pick<ReturnType<typeof getPlanBillingConfig>, "validityCount" | "validityUnit">,
  tenantSnapshot?: MockTenantManagementSnapshot | null,
  purchaseMode: MockSubscriptionPurchaseMode = "addSeats",
): {
  expiresAt: string;
  prorationRate: number;
} => {
  const currentExpiry = tenantSnapshot?.planExpiresAt;

  if (purchaseMode === "renew") {
    const renewalBaseDate = isDateAfter(currentExpiry, MOCK_SUBSCRIPTION_TODAY)
      ? (currentExpiry ?? MOCK_SUBSCRIPTION_TODAY)
      : MOCK_SUBSCRIPTION_TODAY;

    return {
      expiresAt: addPlanValidity(renewalBaseDate, plan),
      prorationRate: 1,
    };
  }

  if (!isDateAfter(currentExpiry, MOCK_SUBSCRIPTION_TODAY)) {
    return {
      expiresAt: getDefaultExpiresAt(plan),
      prorationRate: 1,
    };
  }

  const remainingDays = getDaysBetween(MOCK_SUBSCRIPTION_TODAY, currentExpiry ?? "");
  const cycleDays = getPlanCycleDays(plan);

  return {
    expiresAt: currentExpiry ?? getDefaultExpiresAt(plan),
    prorationRate: Math.min(1, remainingDays / cycleDays),
  };
};

const getConfiguredSubscriptionPlan = (): MockSubscriptionPlanTemplate =>
  getActiveMockSubscriptionPlanTemplates()[0] ??
  cloneSubscriptionPlan(PRESET_SUBSCRIPTION_PLANS[0]);

const getContractCodeStatusLabel = (
  contractCode: string | undefined,
  matchedCode: MockSalesChannelContractCode | null,
): string | undefined => {
  if (!contractCode?.trim()) {
    return undefined;
  }

  if (!matchedCode) {
    return "签约码无效";
  }

  if (matchedCode.status !== "active") {
    return "签约码已停用";
  }

  return "已应用签约价";
};

const resolveEnterpriseQualification = (
  input: MockSubscriptionPlanPurchaseInput,
  matchedCode: MockSalesChannelContractCode | null,
): {
  customerTier: MockSubscriptionCustomerTier;
  enterpriseQualified: boolean;
  ruleMessage: string;
} => {
  if (input.billingCycle === "monthly") {
    return {
      customerTier: "pro",
      enterpriseQualified: false,
      ruleMessage: "",
    };
  }

  if (!input.contractCode?.trim()) {
    return {
      customerTier: "pro",
      enterpriseQualified: false,
      ruleMessage: "",
    };
  }

  if (!matchedCode || matchedCode.status !== "active") {
    return {
      customerTier: "pro",
      enterpriseQualified: false,
      ruleMessage: "",
    };
  }

  if (!getPromotionIsActive() && input.seatCount < ENTERPRISE_MINIMUM_SEATS_AFTER_PROMOTION) {
    return {
      customerTier: "pro",
      enterpriseQualified: false,
      ruleMessage: `未达到签约价起订席位`,
    };
  }

  return {
    customerTier: "enterprise",
    enterpriseQualified: true,
    ruleMessage: "",
  };
};

/**
 * 读取当前销售或渠道签约码。
 */
export const getMockSalesChannelContractCodes = (): MockSalesChannelContractCode[] => {
  const storedCodes = readStoredContractCodes();
  const presetCodes = new Set(PRESET_CONTRACT_CODES.map(item => item.code));
  const normalizedPresetCodes = PRESET_CONTRACT_CODES.map(presetCode => {
    const storedCode = storedCodes.find(item => {
      const contractCode = readRecord(item);
      const normalizedCode =
        typeof contractCode?.code === "string" ? normalizeContractCode(contractCode.code) : "";

      return normalizedCode === normalizeContractCode(presetCode.code);
    });

    return normalizeStoredContractCode(storedCode, presetCode);
  });
  const normalizedCustomCodes = storedCodes
    .filter(item => {
      const contractCode = readRecord(item);
      const normalizedCode =
        typeof contractCode?.code === "string" ? normalizeContractCode(contractCode.code) : "";

      return normalizedCode && !presetCodes.has(normalizedCode);
    })
    .map(createCustomFallbackContractCode)
    .filter((item): item is MockSalesChannelContractCode => Boolean(item));

  return [...normalizedPresetCodes, ...sortContractCodes(normalizedCustomCodes)];
};

/**
 * 新建销售或渠道签约码。
 */
export const createMockSalesChannelContractCode = (
  payload: CreateMockSalesChannelContractCodePayload,
): MockSalesChannelContractCode[] => {
  const nextCode = normalizeStoredContractCode(payload, payload);
  const currentCodes = getMockSalesChannelContractCodes();
  const nextCodes = sortContractCodes([
    ...currentCodes.filter(item => item.code !== nextCode.code),
    nextCode,
  ]);

  writeStoredContractCodes(nextCodes);

  return nextCodes;
};

/**
 * 更新销售或渠道签约码。
 */
export const updateMockSalesChannelContractCode = (
  code: string,
  updates: Partial<CreateMockSalesChannelContractCodePayload>,
): MockSalesChannelContractCode[] => {
  const normalizedCurrentCode = normalizeContractCode(code);
  const currentCodes = getMockSalesChannelContractCodes();
  const nextCodes = currentCodes.map(item => {
    if (item.code !== normalizedCurrentCode) {
      return item;
    }

    return normalizeStoredContractCode(
      {
        ...item,
        ...updates,
        code:
          typeof updates.code === "string"
            ? normalizeContractCode(updates.code)
            : normalizedCurrentCode,
      },
      item,
    );
  });
  const dedupedCodes = Array.from(new Map(nextCodes.map(item => [item.code, item])).values());

  writeStoredContractCodes(sortContractCodes(dedupedCodes));

  return sortContractCodes(dedupedCodes);
};

/**
 * 读取订阅策略摘要。
 */
export const getMockSubscriptionPricingPolicy = (): {
  enterpriseMinimumSeatsAfterPromotion: number;
  enterpriseYearlySeatPrice: number;
  proMonthlySeatPrice: number;
  proYearlySeatPrice: number;
  promotionEndsAt: string;
} => {
  const packageTemplate = getConfiguredSubscriptionPlan();

  return {
    enterpriseMinimumSeatsAfterPromotion: ENTERPRISE_MINIMUM_SEATS_AFTER_PROMOTION,
    enterpriseYearlySeatPrice: packageTemplate.contractYearlyPriceAmount,
    proMonthlySeatPrice: packageTemplate.monthlyPriceAmount,
    proYearlySeatPrice: packageTemplate.yearlyPriceAmount,
    promotionEndsAt: MOCK_PROMOTION_ENDS_AT,
  };
};

/**
 * 读取订阅包配置。
 */
export const getMockSubscriptionPlanTemplates = (): MockSubscriptionPlanTemplate[] => {
  const storedPlans = readStoredSubscriptionPlans();
  const presetPlanKeys = new Set(PRESET_SUBSCRIPTION_PLANS.map(item => item.key));
  const normalizedPresetPlans = PRESET_SUBSCRIPTION_PLANS.map(presetPlan => {
    const storedPlan = storedPlans.find(item => readRecord(item)?.key === presetPlan.key);

    return normalizeStoredPlan(storedPlan, presetPlan);
  });
  const normalizedCustomPlans = storedPlans
    .filter(item => {
      const plan = readRecord(item);

      return (
        typeof plan?.key === "string" &&
        !presetPlanKeys.has(plan.key) &&
        !LEGACY_SUBSCRIPTION_PLAN_KEYS.has(plan.key)
      );
    })
    .map(createCustomFallbackPlan)
    .filter((item): item is MockSubscriptionPlanTemplate => Boolean(item))
    .map(item => normalizeStoredPlan(item, item));

  return sortSubscriptionPlans([...normalizedPresetPlans, ...normalizedCustomPlans]);
};

/**
 * 新建订阅包配置。
 */
export const createMockSubscriptionPlanTemplate = (
  payload: CreateMockSubscriptionPlanPayload,
): MockSubscriptionPlanTemplate[] => {
  const currentPlans = getMockSubscriptionPlanTemplates();
  const nextPlan: MockSubscriptionPlanTemplate = {
    key: buildSubscriptionPlanKey(payload.title),
    sequence: buildSubscriptionPlanSequence(currentPlans),
    title: payload.title.trim(),
    seatCount: payload.seatCount,
    monthlyPriceAmount: payload.monthlyPriceAmount,
    yearlyPriceAmount: payload.yearlyPriceAmount,
    contractYearlyPriceAmount: payload.contractYearlyPriceAmount,
    monthlyGiftPoints: payload.monthlyGiftPoints,
    yearlyGiftPoints: payload.yearlyGiftPoints,
    monthlyValidityCount: payload.monthlyValidityCount,
    yearlyValidityCount: payload.yearlyValidityCount,
    status: payload.status,
    updatedAt: "刚刚",
  };

  const nextPlans = sortSubscriptionPlans([...currentPlans, nextPlan]);

  writeStoredSubscriptionPlans(nextPlans);

  return nextPlans;
};

/**
 * 更新订阅包配置。
 */
export const updateMockSubscriptionPlanTemplate = (
  planKey: MockSubscriptionPlanKey,
  updates: Partial<CreateMockSubscriptionPlanPayload>,
): MockSubscriptionPlanTemplate[] => {
  const nextPlans = getMockSubscriptionPlanTemplates().map(item => {
    if (item.key !== planKey) {
      return item;
    }

    const seatCount = readNumber(updates.seatCount, item.seatCount);

    return {
      ...item,
      title: typeof updates.title === "string" ? updates.title.trim() : item.title,
      seatCount,
      monthlyPriceAmount: readNumber(updates.monthlyPriceAmount, item.monthlyPriceAmount),
      yearlyPriceAmount: readNumber(updates.yearlyPriceAmount, item.yearlyPriceAmount),
      contractYearlyPriceAmount: readNumber(
        updates.contractYearlyPriceAmount,
        item.contractYearlyPriceAmount,
      ),
      monthlyGiftPoints: readNumber(updates.monthlyGiftPoints, item.monthlyGiftPoints),
      yearlyGiftPoints: readNumber(updates.yearlyGiftPoints, item.yearlyGiftPoints),
      monthlyValidityCount: readNumber(updates.monthlyValidityCount, item.monthlyValidityCount),
      yearlyValidityCount: readNumber(updates.yearlyValidityCount, item.yearlyValidityCount),
      status: readStatus(updates.status, item.status),
      updatedAt: "刚刚",
    };
  });

  writeStoredSubscriptionPlans(nextPlans);

  return nextPlans;
};

/**
 * 读取当前用户侧可展示的订阅包。
 */
export const getActiveMockSubscriptionPlanTemplates = (): MockSubscriptionPlanTemplate[] =>
  getMockSubscriptionPlanTemplates().filter(item => item.status === "active");

/**
 * 读取单个订阅包配置。
 */
export const getMockSubscriptionPlanTemplate = (
  planKey: MockSubscriptionPlanKey,
): MockSubscriptionPlanTemplate =>
  getMockSubscriptionPlanTemplates().find(item => item.key === planKey) ??
  cloneSubscriptionPlan(PRESET_SUBSCRIPTION_PLANS[0]);

/**
 * 获取自助支付所需的订阅购买快照。
 */
export const getMockSubscriptionPlanPurchaseOption = (
  input: MockSubscriptionPlanPurchaseInput,
  tenantSnapshot?: MockTenantManagementSnapshot | null,
): MockSubscriptionPlanPurchaseOption | null => {
  const purchaseMode = input.purchaseMode ?? "addSeats";
  const seatCount =
    purchaseMode === "renew"
      ? Math.max(Math.floor(tenantSnapshot?.totalSeats ?? input.seatCount), 1)
      : Math.max(Math.floor(input.seatCount), 1);
  const normalizedInput: MockSubscriptionPlanPurchaseInput = {
    billingCycle: input.billingCycle,
    contractCode: input.billingCycle === "yearly" ? input.contractCode?.trim().toUpperCase() : "",
    purchaseMode,
    seatCount,
  };
  const matchedCode = findContractCode(normalizedInput.contractCode);
  const qualification = resolveEnterpriseQualification(normalizedInput, matchedCode);
  const selectedPlan = getConfiguredSubscriptionPlan();
  const cycleConfig = getPlanBillingConfig(
    selectedPlan,
    normalizedInput.billingCycle,
    qualification.enterpriseQualified,
  );
  const originalCycleConfig = getPlanBillingConfig(
    selectedPlan,
    normalizedInput.billingCycle,
    false,
  );
  const expiryInfo = getAlignedExpiryInfo(cycleConfig, tenantSnapshot, purchaseMode);
  const originalUnitPrice = originalCycleConfig.priceAmount;
  const originalAmount = Math.ceil(originalUnitPrice * seatCount * expiryInfo.prorationRate);
  const amount = Math.ceil(cycleConfig.priceAmount * seatCount * expiryInfo.prorationRate);
  const planLabel = selectedPlan.title;
  const validityLabel = formatMockSubscriptionValidity(
    cycleConfig.validityCount,
    cycleConfig.validityUnit,
  );

  return {
    planKey: selectedPlan.key as MockSelfServeSubscriptionPlanKey,
    planLabel,
    billingCycle: normalizedInput.billingCycle,
    billingCycleLabel: validityLabel,
    contractCode: normalizedInput.contractCode || undefined,
    contractCodeStatusLabel: getContractCodeStatusLabel(normalizedInput.contractCode, matchedCode),
    customerTier: qualification.customerTier,
    discountAmount: Math.max(originalAmount - amount, 0),
    enterpriseQualified: qualification.enterpriseQualified,
    expiresAt: expiryInfo.expiresAt,
    originalAmount,
    ownerName: qualification.enterpriseQualified ? matchedCode?.ownerName : undefined,
    priceLabel: formatSeatUnitPrice(cycleConfig.priceAmount, cycleConfig.validityUnit),
    purchaseMode,
    seatCount,
    seatLabel: purchaseMode === "renew" ? `续约 ${seatCount} 个席位` : `${seatCount} 个席位`,
    serviceLabel: qualification.enterpriseQualified ? matchedCode?.serviceLabel : undefined,
    unitPrice: cycleConfig.priceAmount,
    giftPoints: cycleConfig.giftPoints,
    channelName: qualification.enterpriseQualified ? matchedCode?.channelName : undefined,
    amount,
    prorationLabel: undefined,
    ruleMessage: qualification.ruleMessage,
  };
};

/**
 * 按订阅购买快照更新租户。席位统一写入同一到期日，企业版由年付签约码规则自动判定。
 */
export const applyMockSubscriptionPlanToTenant = (
  tenantId: string,
  purchaseOption: MockSubscriptionPlanPurchaseOption,
  options?: {
    actorName?: string;
    orderSourceLabel?: string;
    paymentChannelLabel?: string;
  },
): MockTenantManagementSnapshot | null => {
  const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

  if (!matchedSnapshot) {
    return null;
  }

  const timestamp = Date.now();
  const nextTotalSeats =
    purchaseOption.purchaseMode === "renew"
      ? Math.max(matchedSnapshot.usedSeats, matchedSnapshot.totalSeats)
      : Math.max(matchedSnapshot.usedSeats, matchedSnapshot.totalSeats + purchaseOption.seatCount);
  const nextPointsBalance = matchedSnapshot.pointsBalance + purchaseOption.giftPoints;
  const pointsGiftLedger =
    purchaseOption.giftPoints > 0
      ? {
          id: `${tenantId}-subscription-gift-${timestamp}`,
          title: `${purchaseOption.planLabel}赠送积分`,
          description: `${purchaseOption.planLabel}开通后赠送积分，积分永久有效。`,
          points: purchaseOption.giftPoints,
          direction: "income" as const,
          createdAt: "刚刚",
          actorName: options?.actorName ?? matchedSnapshot.adminUserId,
        }
      : null;
  const subscriptionOrder = {
    id: `${tenantId}-subscription-order-${timestamp}`,
    orderNo: `SUB-${timestamp.toString().slice(-10)}`,
    planKey: purchaseOption.planKey,
    planTitle: purchaseOption.planLabel,
    amount: purchaseOption.amount,
    seatCount: purchaseOption.seatCount,
    billingCycleLabel: purchaseOption.billingCycleLabel,
    status: "paid" as const,
    orderSourceLabel: options?.orderSourceLabel ?? "运营后台开通",
    paymentChannelLabel: options?.paymentChannelLabel ?? "统一扫码支付",
    purchaserName: options?.actorName ?? matchedSnapshot.adminUserId,
    createdAt: "刚刚",
    paidAt: "刚刚",
    billingCycle: purchaseOption.billingCycle,
    unitPrice: purchaseOption.unitPrice,
    originalAmount: purchaseOption.originalAmount,
    discountAmount: purchaseOption.discountAmount,
    contractCode: purchaseOption.contractCode,
    customerTier: purchaseOption.customerTier,
    channelName: purchaseOption.channelName,
    ownerName: purchaseOption.ownerName,
    serviceLabel: purchaseOption.serviceLabel,
    expiresAt: purchaseOption.expiresAt,
    prorationLabel: purchaseOption.prorationLabel,
    purchaseMode: purchaseOption.purchaseMode,
  };
  const nextIncludedSeats =
    purchaseOption.purchaseMode === "renew"
      ? matchedSnapshot.includedSeats
      : matchedSnapshot.includedSeats + purchaseOption.seatCount;
  const invitePolicyLabel =
    purchaseOption.purchaseMode === "renew"
      ? `${purchaseOption.planLabel}已续约，当前 ${nextTotalSeats} 个席位，到期时间 ${purchaseOption.expiresAt}。`
      : `${purchaseOption.planLabel}已开通，新增订阅席位 ${purchaseOption.seatCount} 个，到期时间 ${purchaseOption.expiresAt}。`;

  return saveMockTenantManagementSnapshot({
    ...matchedSnapshot,
    edition: "team",
    planLabel: "Pro 团队版",
    includedSeats: nextIncludedSeats,
    extraSeatCount: 0,
    totalSeats: nextTotalSeats,
    teamPlanPackageId: purchaseOption.planKey,
    planExpiresAt: purchaseOption.expiresAt,
    pointsBalance: nextPointsBalance,
    invitePolicyLabel,
    pointsLedger: pointsGiftLedger
      ? [pointsGiftLedger, ...(matchedSnapshot.pointsLedger ?? [])]
      : (matchedSnapshot.pointsLedger ?? []),
    subscriptionOrders: [subscriptionOrder, ...(matchedSnapshot.subscriptionOrders ?? [])],
  });
};
