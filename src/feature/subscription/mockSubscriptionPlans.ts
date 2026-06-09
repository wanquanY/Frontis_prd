import type {
  MockTenantManagementSnapshot,
  MockTenantSubscriptionOrderItem,
} from "@/feature/auth/types";
import {
  getMockTenantManagementSnapshot,
  saveMockTenantManagementSnapshot,
} from "@/feature/auth/mockTenantRegistry";

import type {
  MockSelfServeSubscriptionPlanKey,
  MockSubscriptionBillingCycle,
  MockSubscriptionPlanKey,
  MockSubscriptionPlanScope,
  MockSubscriptionPlanPurchaseInput,
  MockSubscriptionPlanPurchaseOption,
  MockSubscriptionPlanSpec,
  MockSubscriptionPurchaseMode,
  MockSubscriptionPlanStatus,
  MockSubscriptionPlanTemplate,
  MockSubscriptionPlanTemplateInput,
  MockSubscriptionValidityUnit,
} from "./types";

const MOCK_SUBSCRIPTION_PLAN_STORAGE_KEY = "frontis.mock.team-seat-packages.v3";
const MOCK_SUBSCRIPTION_TODAY = "2026-05-25";
const TEAM_MONTHLY_SEAT_PACKAGE_KEY = "team-monthly-seat-package";
const TEAM_YEARLY_SEAT_PACKAGE_KEY = "team-yearly-seat-package";
const INTERNAL_SEAT_PACKAGE_KEY = "internal-offline-seat-package";
const PRIMARY_SEAT_SPEC_KEY = "seat-package-main";
const MONTHLY_SEAT_SPEC_KEY = "monthly-seat-package";
const YEARLY_SEAT_SPEC_KEY = "yearly-seat-package";
const LEGACY_INTERNAL_SEAT_BILLING_CYCLE = ["internal", "free"].join("-");
const LEGACY_INTERNAL_SEAT_SPEC_TITLE = ["长期", "免费席位包"].join("");
const LEGACY_SUBSCRIPTION_PLAN_KEYS = new Set([
  "lite",
  "pro-monthly",
  "pro-yearly",
  "enterprise-contract-yearly",
  "team-seat-package",
]);

type CreateMockSubscriptionPlanPayload = MockSubscriptionPlanTemplateInput;

interface DateParts {
  day: number;
  month: number;
  year: number;
}

const VALIDITY_UNIT_LABELS: Record<MockSubscriptionValidityUnit, string> = {
  day: "天",
  month: "月",
  year: "年",
};

/**
 * 格式化席位包有效时间展示文案。
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

const createSeatPackageSpec = (
  title: string,
  priceAmount: number,
  giftPoints: number,
  validityCount: number,
  validityUnit: MockSubscriptionValidityUnit,
): MockSubscriptionPlanSpec => ({
  key: PRIMARY_SEAT_SPEC_KEY,
  title,
  billingCycle: PRIMARY_SEAT_SPEC_KEY,
  billingCycleLabel: formatMockSubscriptionValidity(validityCount, validityUnit),
  enabled: true,
  priceAmount,
  giftPoints,
  validityCount,
  validityUnit,
  contractPriceEnabled: false,
  contractPriceAmount: 0,
});

const createPresetSubscriptionPlanSpecs = (): MockSubscriptionPlanSpec[] => [
  createSeatPackageSpec("月席位包", 199, 0, 1, "month"),
];

const createMonthlySeatPackageSpecs = (): MockSubscriptionPlanSpec[] => [
  createSeatPackageSpec("月席位包", 199, 0, 1, "month"),
];

const createYearlySeatPackageSpecs = (): MockSubscriptionPlanSpec[] => [
  createSeatPackageSpec("年席位包", 1999, 0, 1, "year"),
];

const createInternalSeatPackageSpecs = (): MockSubscriptionPlanSpec[] => [
  createSeatPackageSpec("线下合同席位包 15 个月", 0, 5000, 15, "month"),
];

const PRESET_SUBSCRIPTION_PLANS: MockSubscriptionPlanTemplate[] = [
  {
    key: TEAM_MONTHLY_SEAT_PACKAGE_KEY,
    sequence: "01",
    title: "月席位包",
    seatCount: 1,
    monthlyEnabled: true,
    yearlyEnabled: false,
    contractYearlyEnabled: false,
    monthlyPriceAmount: 199,
    yearlyPriceAmount: 0,
    contractYearlyPriceAmount: 0,
    monthlyGiftPoints: 0,
    yearlyGiftPoints: 0,
    monthlyValidityCount: 1,
    yearlyValidityCount: 1,
    specs: createMonthlySeatPackageSpecs(),
    scope: "public",
    status: "active",
    updatedAt: "2026-05-25 10:00",
  },
  {
    key: TEAM_YEARLY_SEAT_PACKAGE_KEY,
    sequence: "02",
    title: "年席位包",
    seatCount: 1,
    monthlyEnabled: true,
    yearlyEnabled: false,
    contractYearlyEnabled: false,
    monthlyPriceAmount: 1999,
    yearlyPriceAmount: 1999,
    contractYearlyPriceAmount: 0,
    monthlyGiftPoints: 0,
    yearlyGiftPoints: 0,
    monthlyValidityCount: 12,
    yearlyValidityCount: 1,
    specs: createYearlySeatPackageSpecs(),
    scope: "public",
    status: "active",
    updatedAt: "2026-05-25 10:05",
  },
  {
    key: INTERNAL_SEAT_PACKAGE_KEY,
    sequence: "03",
    title: "线下合同席位包 15 个月",
    seatCount: 1,
    monthlyEnabled: true,
    yearlyEnabled: false,
    contractYearlyEnabled: false,
    monthlyPriceAmount: 0,
    yearlyPriceAmount: 0,
    contractYearlyPriceAmount: 0,
    monthlyGiftPoints: 5000,
    yearlyGiftPoints: 0,
    monthlyValidityCount: 15,
    yearlyValidityCount: 1,
    specs: createInternalSeatPackageSpecs(),
    scope: "internal",
    status: "active",
    updatedAt: "2026-05-25 10:10",
  },
];

const cloneSubscriptionPlanSpec = (spec: MockSubscriptionPlanSpec): MockSubscriptionPlanSpec => ({
  ...spec,
});

const getMockSubscriptionPlanSpecs = (
  plan: MockSubscriptionPlanTemplate,
): MockSubscriptionPlanSpec[] =>
  plan.specs.length > 0
    ? plan.specs.map(cloneSubscriptionPlanSpec)
    : createPresetSubscriptionPlanSpecs();

export const getPrimaryMockSubscriptionPlanSpec = (
  plan: MockSubscriptionPlanTemplate,
): MockSubscriptionPlanSpec => {
  const specs = getMockSubscriptionPlanSpecs(plan);
  const fallbackSpec = createPresetSubscriptionPlanSpecs()[0];

  if (!fallbackSpec) {
    throw new Error("Missing preset subscription plan spec.");
  }

  return specs.find(item => item.enabled) ?? specs[0] ?? fallbackSpec;
};

export const getMockSubscriptionPlanValidityLabel = (
  plan: MockSubscriptionPlanTemplate,
): string => {
  const spec = getPrimaryMockSubscriptionPlanSpec(plan);

  return formatMockSubscriptionValidity(spec.validityCount, spec.validityUnit);
};

/**
 * 根据团队席位包配置生成运营侧展示信息。
 */
export const buildMockSubscriptionPlanBenefitTexts = (
  plan: Pick<
    MockSubscriptionPlanTemplate,
    | "contractYearlyPriceAmount"
    | "contractYearlyEnabled"
    | "monthlyEnabled"
    | "monthlyGiftPoints"
    | "monthlyPriceAmount"
    | "monthlyValidityCount"
    | "seatCount"
    | "yearlyEnabled"
    | "yearlyGiftPoints"
    | "yearlyPriceAmount"
    | "yearlyValidityCount"
    | "specs"
  >,
): string[] => [
  `${plan.seatCount} 个席位单位`,
  ...plan.specs.slice(0, 1).map(spec => {
    const validityLabel = formatMockSubscriptionValidity(spec.validityCount, spec.validityUnit);

    return `每席 ¥${Math.max(spec.priceAmount, 0).toLocaleString("zh-CN")} / ${validityLabel}，赠送 ${spec.giftPoints.toLocaleString("zh-CN")} 积分`;
  }),
];

const cloneSubscriptionPlan = (
  plan: MockSubscriptionPlanTemplate,
): MockSubscriptionPlanTemplate => ({
  ...plan,
  specs: plan.specs.map(cloneSubscriptionPlanSpec),
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

const readBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const readString = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const readStatus = (
  value: unknown,
  fallback: MockSubscriptionPlanStatus,
): MockSubscriptionPlanStatus => (value === "inactive" || value === "active" ? value : fallback);

const readPlanScope = (
  value: unknown,
  fallback: MockSubscriptionPlanScope,
): MockSubscriptionPlanScope => (value === "internal" || value === "public" ? value : fallback);

const readValidityUnit = (
  value: unknown,
  fallback: MockSubscriptionValidityUnit,
): MockSubscriptionValidityUnit =>
  value === "day" || value === "month" || value === "year" ? value : fallback;

const buildLegacyPlanSpecs = (
  plan: Pick<
    MockSubscriptionPlanTemplate,
    | "contractYearlyEnabled"
    | "contractYearlyPriceAmount"
    | "monthlyEnabled"
    | "monthlyGiftPoints"
    | "monthlyPriceAmount"
    | "monthlyValidityCount"
    | "yearlyEnabled"
    | "yearlyGiftPoints"
    | "yearlyPriceAmount"
    | "yearlyValidityCount"
  >,
): MockSubscriptionPlanSpec[] => [
  {
    key: MONTHLY_SEAT_SPEC_KEY,
    title: "1 个月席位包",
    billingCycle: "monthly",
    billingCycleLabel: "1 个月",
    enabled: plan.monthlyEnabled,
    priceAmount: plan.monthlyPriceAmount,
    giftPoints: plan.monthlyGiftPoints,
    validityCount: plan.monthlyValidityCount,
    validityUnit: "month",
    contractPriceEnabled: false,
    contractPriceAmount: 0,
  },
  {
    key: YEARLY_SEAT_SPEC_KEY,
    title: "12 个月席位包",
    billingCycle: "yearly",
    billingCycleLabel: "12 个月",
    enabled: plan.yearlyEnabled,
    priceAmount: plan.yearlyPriceAmount,
    giftPoints: plan.yearlyGiftPoints,
    validityCount: plan.yearlyValidityCount,
    validityUnit: "year",
    contractPriceEnabled: false,
    contractPriceAmount: 0,
  },
];

const normalizePlanSpec = (
  value: unknown,
  fallbackSpec: MockSubscriptionPlanSpec,
): MockSubscriptionPlanSpec | null => {
  const spec = readRecord(value);

  if (!spec) {
    return cloneSubscriptionPlanSpec(fallbackSpec);
  }

  const billingCycle = readString(spec.billingCycle, fallbackSpec.billingCycle).trim();
  const key = readString(spec.key, fallbackSpec.key || billingCycle).trim();

  if (!key || !billingCycle) {
    return null;
  }

  return {
    key,
    title: readString(spec.title, fallbackSpec.title).trim() || fallbackSpec.title,
    billingCycle,
    billingCycleLabel:
      readString(spec.billingCycleLabel, fallbackSpec.billingCycleLabel).trim() ||
      fallbackSpec.billingCycleLabel,
    enabled: readBoolean(spec.enabled, fallbackSpec.enabled),
    priceAmount: readNumber(spec.priceAmount, fallbackSpec.priceAmount),
    giftPoints: readNumber(spec.giftPoints, fallbackSpec.giftPoints),
    validityCount: readNumber(spec.validityCount, fallbackSpec.validityCount),
    validityUnit: readValidityUnit(spec.validityUnit, fallbackSpec.validityUnit),
    contractPriceEnabled: false,
    contractPriceAmount: 0,
  };
};

const normalizePlanSpecs = (
  value: unknown,
  fallbackSpecs: MockSubscriptionPlanSpec[],
): MockSubscriptionPlanSpec[] => {
  if (!Array.isArray(value)) {
    return fallbackSpecs.map(cloneSubscriptionPlanSpec);
  }

  if (
    value.some(item => {
      const spec = readRecord(item);

      return (
        readString(spec?.billingCycle, "") === LEGACY_INTERNAL_SEAT_BILLING_CYCLE ||
        readString(spec?.title, "") === LEGACY_INTERNAL_SEAT_SPEC_TITLE
      );
    })
  ) {
    return fallbackSpecs.map(cloneSubscriptionPlanSpec);
  }

  const fallbackByKey = new Map(fallbackSpecs.map(item => [item.key, item]));
  const normalizedSpecs = value
    .map((item, index) => {
      const itemRecord = readRecord(item);
      const fallbackSpec =
        fallbackByKey.get(readString(itemRecord?.key, "")) ??
        fallbackSpecs[index] ??
        fallbackSpecs[0];

      return normalizePlanSpec(item, fallbackSpec);
    })
    .filter((item): item is MockSubscriptionPlanSpec => Boolean(item));
  const dedupedSpecs = Array.from(new Map(normalizedSpecs.map(item => [item.key, item])).values());

  return dedupedSpecs.length > 0 ? dedupedSpecs : fallbackSpecs.map(cloneSubscriptionPlanSpec);
};

const getPrimarySpecByBillingCycle = (
  plan: MockSubscriptionPlanTemplate,
  billingCycle: MockSubscriptionBillingCycle,
): MockSubscriptionPlanSpec | null =>
  getMockSubscriptionPlanSpecs(plan).find(item => item.billingCycle === billingCycle) ?? null;

const applySpecsToLegacyFields = (
  plan: MockSubscriptionPlanTemplate,
  specs: MockSubscriptionPlanSpec[],
): MockSubscriptionPlanTemplate => {
  const monthlySpec = specs.find(item => item.billingCycle === "monthly") ?? specs[0];
  const yearlySpec = specs.find(item => item.billingCycle === "yearly") ?? specs[1] ?? specs[0];
  return {
    ...plan,
    specs: specs.map(cloneSubscriptionPlanSpec),
    monthlyEnabled: monthlySpec?.enabled ?? false,
    yearlyEnabled: yearlySpec?.enabled ?? false,
    contractYearlyEnabled: false,
    monthlyPriceAmount: monthlySpec?.priceAmount ?? plan.monthlyPriceAmount,
    yearlyPriceAmount: yearlySpec?.priceAmount ?? plan.yearlyPriceAmount,
    contractYearlyPriceAmount: 0,
    monthlyGiftPoints: monthlySpec?.giftPoints ?? plan.monthlyGiftPoints,
    yearlyGiftPoints: yearlySpec?.giftPoints ?? plan.yearlyGiftPoints,
    monthlyValidityCount: monthlySpec?.validityCount ?? plan.monthlyValidityCount,
    yearlyValidityCount: yearlySpec?.validityCount ?? plan.yearlyValidityCount,
  };
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

  const normalizedPlan: MockSubscriptionPlanTemplate = {
    key: readString(plan.key, fallbackPlan.key),
    sequence: readString(plan.sequence, fallbackPlan.sequence),
    title: readString(plan.title, fallbackPlan.title),
    seatCount,
    monthlyEnabled: readBoolean(plan.monthlyEnabled, fallbackPlan.monthlyEnabled),
    yearlyEnabled: readBoolean(plan.yearlyEnabled, fallbackPlan.yearlyEnabled),
    contractYearlyEnabled: false,
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
    contractYearlyPriceAmount: 0,
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
    specs: [],
    scope: readPlanScope(plan.scope, fallbackPlan.scope),
    status: readStatus(plan.status, fallbackPlan.status),
    updatedAt: readString(plan.updatedAt, fallbackPlan.updatedAt),
  };

  return applySpecsToLegacyFields(
    normalizedPlan,
    normalizePlanSpecs(plan.specs, buildLegacyPlanSpecs(normalizedPlan)),
  );
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

  const normalizedPlan: MockSubscriptionPlanTemplate = {
    key: plan.key,
    sequence: readString(
      plan.sequence,
      `${PRESET_SUBSCRIPTION_PLANS.length + index + 1}`.padStart(2, "0"),
    ),
    title: readString(plan.title, "团队席位包"),
    seatCount: readNumber(plan.seatCount, fallbackPlan.seatCount),
    monthlyEnabled: readBoolean(plan.monthlyEnabled, fallbackPlan.monthlyEnabled),
    yearlyEnabled: readBoolean(plan.yearlyEnabled, fallbackPlan.yearlyEnabled),
    contractYearlyEnabled: false,
    monthlyPriceAmount: readNumber(plan.monthlyPriceAmount, fallbackPlan.monthlyPriceAmount),
    yearlyPriceAmount: readNumber(plan.yearlyPriceAmount, fallbackPlan.yearlyPriceAmount),
    contractYearlyPriceAmount: 0,
    monthlyGiftPoints: readNumber(plan.monthlyGiftPoints, fallbackPlan.monthlyGiftPoints),
    yearlyGiftPoints: readNumber(plan.yearlyGiftPoints, fallbackPlan.yearlyGiftPoints),
    monthlyValidityCount: readNumber(plan.monthlyValidityCount, fallbackPlan.monthlyValidityCount),
    yearlyValidityCount: readNumber(plan.yearlyValidityCount, fallbackPlan.yearlyValidityCount),
    specs: [],
    scope: readPlanScope(plan.scope, fallbackPlan.scope),
    status: readStatus(plan.status, "active"),
    updatedAt: readString(plan.updatedAt, "刚刚"),
  };

  return applySpecsToLegacyFields(
    normalizedPlan,
    normalizePlanSpecs(plan.specs, buildLegacyPlanSpecs(normalizedPlan)),
  );
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

const writeStoredSubscriptionPlans = (plans: MockSubscriptionPlanTemplate[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MOCK_SUBSCRIPTION_PLAN_STORAGE_KEY, JSON.stringify(plans));
};

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

const addDays = (dateValue: string, dayCount: number): string => {
  const currentDate = toDate(dateValue);
  currentDate.setDate(currentDate.getDate() + dayCount);

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

const getOrderTimeRank = (order: MockTenantSubscriptionOrderItem): number | null => {
  const dateValue = (order.paidAt ?? order.createdAt).trim().replace(" ", "T");
  const timestamp = Date.parse(dateValue);

  return Number.isFinite(timestamp) ? timestamp : null;
};

const getLatestPaidSubscriptionOrder = (
  tenantSnapshot?: MockTenantManagementSnapshot | null,
): MockTenantSubscriptionOrderItem | null =>
  (tenantSnapshot?.subscriptionOrders ?? [])
    .filter(order => order.status === "paid")
    .reduce<MockTenantSubscriptionOrderItem | null>((latestOrder, currentOrder) => {
      if (!latestOrder) {
        return currentOrder;
      }

      const latestRank = getOrderTimeRank(latestOrder);
      const currentRank = getOrderTimeRank(currentOrder);

      if (latestRank === null || currentRank === null) {
        return latestOrder;
      }

      return currentRank > latestRank ? currentOrder : latestOrder;
    }, null);

export const getMockTenantActiveSubscriptionBillingCycle = (
  tenantSnapshot?: MockTenantManagementSnapshot | null,
): MockSubscriptionBillingCycle | null => {
  if (!isDateAfter(tenantSnapshot?.planExpiresAt, MOCK_SUBSCRIPTION_TODAY)) {
    return null;
  }

  return getLatestPaidSubscriptionOrder(tenantSnapshot)?.billingCycle ?? null;
};

export const getMockTenantActiveSubscriptionPlanKey = (
  tenantSnapshot?: MockTenantManagementSnapshot | null,
): MockSubscriptionPlanKey | null => {
  if (!isDateAfter(tenantSnapshot?.planExpiresAt, MOCK_SUBSCRIPTION_TODAY)) {
    return null;
  }

  return (
    getLatestPaidSubscriptionOrder(tenantSnapshot)?.planKey ??
    tenantSnapshot?.teamPlanPackageId ??
    null
  );
};

const getPlanBillingConfig = (
  plan: MockSubscriptionPlanTemplate,
  billingCycle?: MockSubscriptionBillingCycle,
): {
  giftPoints: number;
  priceAmount: number;
  validityCount: number;
  validityUnit: MockSubscriptionValidityUnit;
} => {
  const matchedSpec = billingCycle
    ? getPrimarySpecByBillingCycle(plan, billingCycle)
    : getPrimaryMockSubscriptionPlanSpec(plan);

  if (matchedSpec) {
    return {
      giftPoints: matchedSpec.giftPoints,
      priceAmount: matchedSpec.priceAmount,
      validityCount: matchedSpec.validityCount,
      validityUnit: matchedSpec.validityUnit,
    };
  }

  return {
    giftPoints: plan.monthlyGiftPoints,
    priceAmount: plan.monthlyPriceAmount,
    validityCount: plan.monthlyValidityCount,
    validityUnit: "month",
  };
};

const getPlanCycleDays = (
  plan: Pick<ReturnType<typeof getPlanBillingConfig>, "validityCount" | "validityUnit">,
): number => {
  const cycleCount = Math.max(plan.validityCount, 1);

  if (plan.validityUnit === "day") {
    return cycleCount;
  }

  return plan.validityUnit === "month" ? cycleCount * 30 : cycleCount * 365;
};

const getDefaultExpiresAt = (
  plan: Pick<ReturnType<typeof getPlanBillingConfig>, "validityCount" | "validityUnit">,
): string =>
  plan.validityUnit === "day"
    ? addDays(MOCK_SUBSCRIPTION_TODAY, Math.max(plan.validityCount, 1))
    : plan.validityUnit === "month"
      ? addMonths(MOCK_SUBSCRIPTION_TODAY, Math.max(plan.validityCount, 1))
      : addYears(MOCK_SUBSCRIPTION_TODAY, Math.max(plan.validityCount, 1));

const addPlanValidity = (
  dateValue: string,
  plan: Pick<ReturnType<typeof getPlanBillingConfig>, "validityCount" | "validityUnit">,
): string =>
  plan.validityUnit === "day"
    ? addDays(dateValue, Math.max(plan.validityCount, 1))
    : plan.validityUnit === "month"
      ? addMonths(dateValue, Math.max(plan.validityCount, 1))
      : addYears(dateValue, Math.max(plan.validityCount, 1));

const getAlignedExpiryInfo = (
  plan: Pick<ReturnType<typeof getPlanBillingConfig>, "validityCount" | "validityUnit">,
  tenantSnapshot?: MockTenantManagementSnapshot | null,
  purchaseMode: MockSubscriptionPurchaseMode = "addSeats",
): {
  expiresAt: string;
  prorationRate: number;
  prorationLabel?: string;
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
  const prorationRate = remainingDays / cycleDays;

  return {
    expiresAt: currentExpiry ?? getDefaultExpiresAt(plan),
    prorationRate,
    prorationLabel: `新增席位按剩余 ${remainingDays} 天折算`,
  };
};

const getConfiguredSubscriptionPlan = (
  planKey?: MockSubscriptionPlanKey,
): MockSubscriptionPlanTemplate => {
  const activePlans = getActiveMockSubscriptionPlanTemplates();

  if (planKey) {
    const matchedActivePlan = activePlans.find(item => item.key === planKey);

    if (matchedActivePlan) {
      return matchedActivePlan;
    }

    const matchedAnyPlan = getMockSubscriptionPlanTemplates().find(item => item.key === planKey);

    if (matchedAnyPlan) {
      return matchedAnyPlan;
    }
  }

  return activePlans[0] ?? cloneSubscriptionPlan(PRESET_SUBSCRIPTION_PLANS[0]);
};

/**
 * 读取席位包配置。
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
 * 新建席位包配置。
 */
export const createMockSubscriptionPlanTemplate = (
  payload: CreateMockSubscriptionPlanPayload,
): MockSubscriptionPlanTemplate[] => {
  const currentPlans = getMockSubscriptionPlanTemplates();
  const draftPlan: MockSubscriptionPlanTemplate = {
    key: buildSubscriptionPlanKey(payload.title),
    sequence: buildSubscriptionPlanSequence(currentPlans),
    title: payload.title.trim(),
    seatCount: payload.seatCount,
    monthlyEnabled: payload.monthlyEnabled,
    yearlyEnabled: payload.yearlyEnabled,
    contractYearlyEnabled: false,
    monthlyPriceAmount: payload.monthlyPriceAmount,
    yearlyPriceAmount: payload.yearlyPriceAmount,
    contractYearlyPriceAmount: 0,
    monthlyGiftPoints: payload.monthlyGiftPoints,
    yearlyGiftPoints: payload.yearlyGiftPoints,
    monthlyValidityCount: payload.monthlyValidityCount,
    yearlyValidityCount: payload.yearlyValidityCount,
    specs: [],
    scope: payload.scope,
    status: payload.status,
    updatedAt: "刚刚",
  };
  const nextPlan = applySpecsToLegacyFields(
    draftPlan,
    normalizePlanSpecs(payload.specs, buildLegacyPlanSpecs(draftPlan)),
  );

  const nextPlans = sortSubscriptionPlans([...currentPlans, nextPlan]);

  writeStoredSubscriptionPlans(nextPlans);

  return nextPlans;
};

/**
 * 更新席位包配置。
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

    const draftPlan: MockSubscriptionPlanTemplate = {
      ...item,
      title: typeof updates.title === "string" ? updates.title.trim() : item.title,
      seatCount,
      monthlyEnabled: readBoolean(updates.monthlyEnabled, item.monthlyEnabled),
      yearlyEnabled: readBoolean(updates.yearlyEnabled, item.yearlyEnabled),
      contractYearlyEnabled: false,
      monthlyPriceAmount: readNumber(updates.monthlyPriceAmount, item.monthlyPriceAmount),
      yearlyPriceAmount: readNumber(updates.yearlyPriceAmount, item.yearlyPriceAmount),
      contractYearlyPriceAmount: 0,
      monthlyGiftPoints: readNumber(updates.monthlyGiftPoints, item.monthlyGiftPoints),
      yearlyGiftPoints: readNumber(updates.yearlyGiftPoints, item.yearlyGiftPoints),
      monthlyValidityCount: readNumber(updates.monthlyValidityCount, item.monthlyValidityCount),
      yearlyValidityCount: readNumber(updates.yearlyValidityCount, item.yearlyValidityCount),
      specs: item.specs,
      scope: readPlanScope(updates.scope, item.scope),
      status: readStatus(updates.status, item.status),
      updatedAt: "刚刚",
    };

    return applySpecsToLegacyFields(
      draftPlan,
      normalizePlanSpecs(updates.specs ?? item.specs, buildLegacyPlanSpecs(draftPlan)),
    );
  });

  writeStoredSubscriptionPlans(nextPlans);

  return nextPlans;
};

/**
 * 读取当前用户侧可展示的席位包。
 */
export const getActiveMockSubscriptionPlanTemplates = (): MockSubscriptionPlanTemplate[] =>
  getMockSubscriptionPlanTemplates().filter(
    item => item.status === "active" && item.scope !== "internal",
  );

/**
 * 读取单个席位包配置。
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
  const activePlanKey =
    purchaseMode === "addSeats" ? getMockTenantActiveSubscriptionPlanKey(tenantSnapshot) : null;
  const activeBillingCycle =
    purchaseMode === "addSeats"
      ? getMockTenantActiveSubscriptionBillingCycle(tenantSnapshot)
      : null;
  const selectedPlan = getConfiguredSubscriptionPlan(activePlanKey ?? input.planKey);
  const requestedBillingCycle = activeBillingCycle ?? input.billingCycle;
  const selectedSpec =
    (requestedBillingCycle
      ? getPrimarySpecByBillingCycle(selectedPlan, requestedBillingCycle)
      : null) ?? getPrimaryMockSubscriptionPlanSpec(selectedPlan);

  if (!selectedSpec?.enabled) {
    return null;
  }

  const seatCount =
    purchaseMode === "renew"
      ? Math.max(Math.floor(tenantSnapshot?.totalSeats ?? input.seatCount), 1)
      : Math.max(Math.floor(input.seatCount), 1);
  const normalizedInput: MockSubscriptionPlanPurchaseInput = {
    billingCycle: selectedSpec.billingCycle,
    planKey: selectedPlan.key,
    purchaseMode,
    seatCount,
  };
  const cycleConfig = getPlanBillingConfig(selectedPlan, normalizedInput.billingCycle);
  const expiryInfo = getAlignedExpiryInfo(cycleConfig, tenantSnapshot, purchaseMode);
  const originalAmount = Math.ceil(cycleConfig.priceAmount * seatCount * expiryInfo.prorationRate);
  const amount = Math.ceil(cycleConfig.priceAmount * seatCount * expiryInfo.prorationRate);
  const planLabel = selectedPlan.title;
  const validityLabel = formatMockSubscriptionValidity(
    cycleConfig.validityCount,
    cycleConfig.validityUnit,
  );

  return {
    planKey: selectedPlan.key as MockSelfServeSubscriptionPlanKey,
    planLabel,
    billingCycle: normalizedInput.billingCycle ?? selectedSpec.billingCycle,
    billingCycleLabel: validityLabel,
    discountAmount: 0,
    expiresAt: expiryInfo.expiresAt,
    originalAmount,
    priceLabel: formatSeatUnitPrice(cycleConfig.priceAmount, cycleConfig.validityUnit),
    purchaseMode,
    seatCount,
    seatLabel: purchaseMode === "renew" ? `续约 ${seatCount} 个席位` : `${seatCount} 个席位`,
    unitPrice: cycleConfig.priceAmount,
    giftPoints: cycleConfig.giftPoints,
    amount,
    prorationLabel: expiryInfo.prorationLabel,
  };
};

/**
 * 按订阅购买快照更新租户。席位统一写入同一到期日。
 */
export const applyMockSubscriptionPlanToTenant = (
  tenantId: string,
  purchaseOption: MockSubscriptionPlanPurchaseOption,
  options?: {
    actorName?: string;
    orderSourceLabel?: string;
    paymentChannelLabel?: string;
    purchaserName?: string;
    operatorUserId?: string;
    operatorName?: string;
    operatorRoleLabel?: string;
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
    purchaserName: options?.purchaserName ?? options?.actorName ?? matchedSnapshot.adminUserId,
    operatorUserId: options?.operatorUserId,
    operatorName: options?.operatorName,
    operatorRoleLabel: options?.operatorRoleLabel,
    createdAt: "刚刚",
    paidAt: "刚刚",
    billingCycle: purchaseOption.billingCycle,
    unitPrice: purchaseOption.unitPrice,
    originalAmount: purchaseOption.originalAmount,
    discountAmount: purchaseOption.discountAmount,
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
      : `${purchaseOption.planLabel}已开通，新增订阅席位 ${purchaseOption.seatCount} 个，到期时间 ${purchaseOption.expiresAt}${
          purchaseOption.prorationLabel ? `，${purchaseOption.prorationLabel}` : ""
        }。`;

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
