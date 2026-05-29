import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import {
  getMockTenantManagementSnapshot,
  saveMockTenantManagementSnapshot,
} from "@/feature/auth/mockTenantRegistry";
import { formatSalesDateTime } from "@/feature/sales/salesDateFormat";
import { resolveMainCodeFromContractInput } from "@/feature/sales/salesCodeFormat";
import { activateSalesLeadCode } from "@/feature/sales/salesStorage";

import type {
  MockSalesChannelContractCode,
  MockSalesChannelContractCodeInput,
  MockSelfServeSubscriptionPlanKey,
  MockSubscriptionBillingCycle,
  MockSubscriptionCustomerTier,
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

const MOCK_CONTRACT_CODE_STORAGE_KEY = "frontis.mock.sales-channel-contract-codes";
const MOCK_SUBSCRIPTION_PLAN_STORAGE_KEY = "frontis.mock.team-seat-packages.v2";
const MOCK_SUBSCRIPTION_TODAY = "2026-05-25";
const MOCK_PROMOTION_ENDS_AT = "2026-08-25";
const PRO_MONTHLY_SEAT_PRICE = 39;
const PRO_YEARLY_SEAT_PRICE = 399;
const ENTERPRISE_MINIMUM_SEATS_AFTER_PROMOTION = 10;
const TEAM_SEAT_PACKAGE_KEY = "team-seat-package";
const INTERNAL_SEAT_PACKAGE_KEY = "internal-offline-seat-package";
const MONTHLY_SEAT_SPEC_KEY = "monthly-seat-package";
const YEARLY_SEAT_SPEC_KEY = "yearly-seat-package";
const LEGACY_INTERNAL_SEAT_BILLING_CYCLE = ["internal", "free"].join("-");
const LEGACY_INTERNAL_SEAT_SPEC_TITLE = ["长期", "免费席位包"].join("");
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

const normalizeChannelDiscountFactor = (value: unknown, fallback = 0.8): number => {
  const discountFactor = typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.max(Math.min(discountFactor, 1), 0.01);
};

const formatChannelDiscount = (discountFactor: number): string =>
  `${Math.round(normalizeChannelDiscountFactor(discountFactor) * 100) / 10} 折`;

const PRESET_CONTRACT_CODES: MockSalesChannelContractCode[] = [
  {
    code: "DGMAIN299",
    channelName: "星澜集团渠道",
    discountFactor: 0.75,
    ownerName: "杨万泉",
    ownerPhone: "13800000001",
    tenantId: "tenant-enterprise-hq",
    tenantName: "星澜服饰集团租户",
    salesMemberId: "user-admin-001",
    salesMemberName: "杨万泉",
    salesMemberPhone: "13800000001",
    status: "active",
    serviceLabel: "大观销售签约跟进、团队版开通协同",
  },
  {
    code: "SALES299",
    channelName: "直营销售",
    discountFactor: 0.75,
    ownerName: "王晨",
    ownerPhone: "13800008881",
    tenantId: "ops-tenant-frontis",
    tenantName: "Frontis 官方演示租户",
    salesMemberId: "tenant-member-frontis-admin",
    salesMemberName: "杨万泉",
    salesMemberPhone: "13800000001",
    status: "active",
    serviceLabel: "专属销售跟进、Agent 定制化需求对接",
  },
  {
    code: "CHANNEL299",
    channelName: "华东渠道",
    discountFactor: 0.85,
    ownerName: "李婷",
    ownerPhone: "13900008882",
    tenantId: "ops-tenant-yuedong",
    tenantName: "悦动科技",
    salesMemberId: "tenant-member-yuedong-admin",
    salesMemberName: "陈思远",
    salesMemberPhone: "13900000002",
    status: "active",
    serviceLabel: "渠道专属售后、Agent 定制化需求对接",
  },
  {
    code: "EXPIRED299",
    channelName: "历史渠道",
    discountFactor: 0.8,
    ownerName: "赵立",
    ownerPhone: "13700008883",
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

const createPresetSubscriptionPlanSpecs = (): MockSubscriptionPlanSpec[] => [
  {
    key: MONTHLY_SEAT_SPEC_KEY,
    title: "月付席位包",
    billingCycle: "monthly",
    billingCycleLabel: "按月支付",
    enabled: true,
    priceAmount: PRO_MONTHLY_SEAT_PRICE,
    giftPoints: 1000,
    validityCount: 1,
    validityUnit: "month",
    contractPriceEnabled: true,
    contractPriceAmount: 0,
  },
  {
    key: YEARLY_SEAT_SPEC_KEY,
    title: "年付席位包",
    billingCycle: "yearly",
    billingCycleLabel: "按年支付",
    enabled: true,
    priceAmount: PRO_YEARLY_SEAT_PRICE,
    giftPoints: 12000,
    validityCount: 1,
    validityUnit: "year",
    contractPriceEnabled: true,
    contractPriceAmount: 0,
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

const getEnabledMockSubscriptionPlanSpecs = (
  plan: MockSubscriptionPlanTemplate,
): MockSubscriptionPlanSpec[] => getMockSubscriptionPlanSpecs(plan).filter(item => item.enabled);

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
  ...plan.specs.flatMap(spec =>
    spec.enabled
      ? [
          `${spec.title} ${formatSeatUnitPrice(spec.priceAmount, spec.validityUnit)}`,
          `${spec.title}赠送 ${spec.giftPoints.toLocaleString("zh-CN")} 积分`,
          ...(spec.contractPriceEnabled ? [`${spec.title}支持签约码渠道折扣`] : []),
        ]
      : [],
  ),
];

const PRESET_SUBSCRIPTION_PLANS: MockSubscriptionPlanTemplate[] = [
  {
    key: TEAM_SEAT_PACKAGE_KEY,
    sequence: "01",
    title: "团队席位包",
    seatCount: 1,
    monthlyEnabled: true,
    yearlyEnabled: true,
    contractYearlyEnabled: true,
    monthlyPriceAmount: PRO_MONTHLY_SEAT_PRICE,
    yearlyPriceAmount: PRO_YEARLY_SEAT_PRICE,
    contractYearlyPriceAmount: 0,
    monthlyGiftPoints: 1000,
    yearlyGiftPoints: 12000,
    monthlyValidityCount: 1,
    yearlyValidityCount: 1,
    specs: createPresetSubscriptionPlanSpecs(),
    scope: "public",
    status: "active",
    updatedAt: "2026-05-25 10:00",
  },
  {
    key: INTERNAL_SEAT_PACKAGE_KEY,
    sequence: "02",
    title: "线下合同席位包",
    seatCount: 1,
    monthlyEnabled: true,
    yearlyEnabled: true,
    contractYearlyEnabled: false,
    monthlyPriceAmount: 0,
    yearlyPriceAmount: 0,
    contractYearlyPriceAmount: 0,
    monthlyGiftPoints: 0,
    yearlyGiftPoints: 0,
    monthlyValidityCount: 1,
    yearlyValidityCount: 1,
    specs: [
      {
        key: `${INTERNAL_SEAT_PACKAGE_KEY}-monthly`,
        title: "月付席位包",
        billingCycle: "monthly",
        billingCycleLabel: "按月支付",
        enabled: true,
        priceAmount: 0,
        giftPoints: 0,
        validityCount: 1,
        validityUnit: "month",
        contractPriceEnabled: false,
        contractPriceAmount: 0,
      },
      {
        key: `${INTERNAL_SEAT_PACKAGE_KEY}-yearly`,
        title: "年付席位包",
        billingCycle: "yearly",
        billingCycleLabel: "按年支付",
        enabled: true,
        priceAmount: 0,
        giftPoints: 0,
        validityCount: 1,
        validityUnit: "year",
        contractPriceEnabled: false,
        contractPriceAmount: 0,
      },
    ],
    scope: "internal",
    status: "active",
    updatedAt: "2026-05-29 10:00",
  },
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

const readContractCodeStatus = (
  value: unknown,
  fallback: MockSalesChannelContractCode["status"],
): MockSalesChannelContractCode["status"] =>
  value === "inactive" || value === "active" ? value : fallback;

const readValidityUnit = (
  value: unknown,
  fallback: MockSubscriptionValidityUnit,
): MockSubscriptionValidityUnit => (value === "year" || value === "month" ? value : fallback);

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
    title: "月付席位包",
    billingCycle: "monthly",
    billingCycleLabel: "按月支付",
    enabled: plan.monthlyEnabled,
    priceAmount: plan.monthlyPriceAmount,
    giftPoints: plan.monthlyGiftPoints,
    validityCount: plan.monthlyValidityCount,
    validityUnit: "month",
    contractPriceEnabled: false,
    contractPriceAmount: Math.max(Math.floor(plan.monthlyPriceAmount * 0.8), 0),
  },
  {
    key: YEARLY_SEAT_SPEC_KEY,
    title: "年付席位包",
    billingCycle: "yearly",
    billingCycleLabel: "按年支付",
    enabled: plan.yearlyEnabled,
    priceAmount: plan.yearlyPriceAmount,
    giftPoints: plan.yearlyGiftPoints,
    validityCount: plan.yearlyValidityCount,
    validityUnit: "year",
    contractPriceEnabled: plan.contractYearlyEnabled,
    contractPriceAmount: plan.contractYearlyPriceAmount,
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
    contractPriceEnabled: readBoolean(spec.contractPriceEnabled, fallbackSpec.contractPriceEnabled),
    contractPriceAmount: readNumber(spec.contractPriceAmount, fallbackSpec.contractPriceAmount),
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
  const contractSpec = yearlySpec ?? monthlySpec;

  return {
    ...plan,
    specs: specs.map(cloneSubscriptionPlanSpec),
    monthlyEnabled: monthlySpec?.enabled ?? false,
    yearlyEnabled: yearlySpec?.enabled ?? false,
    contractYearlyEnabled: contractSpec?.contractPriceEnabled ?? false,
    monthlyPriceAmount: monthlySpec?.priceAmount ?? plan.monthlyPriceAmount,
    yearlyPriceAmount: yearlySpec?.priceAmount ?? plan.yearlyPriceAmount,
    contractYearlyPriceAmount: contractSpec?.contractPriceAmount ?? plan.contractYearlyPriceAmount,
    monthlyGiftPoints: monthlySpec?.giftPoints ?? plan.monthlyGiftPoints,
    yearlyGiftPoints: yearlySpec?.giftPoints ?? plan.yearlyGiftPoints,
    monthlyValidityCount: monthlySpec?.validityCount ?? plan.monthlyValidityCount,
    yearlyValidityCount: yearlySpec?.validityCount ?? plan.yearlyValidityCount,
  };
};

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
    discountFactor: normalizeChannelDiscountFactor(
      contractCode.discountFactor,
      fallbackCode.discountFactor,
    ),
    ownerName: readString(contractCode.ownerName, fallbackCode.ownerName).trim(),
    ownerPhone: readString(contractCode.ownerPhone, fallbackCode.ownerPhone ?? "").trim(),
    tenantId: readString(contractCode.tenantId, fallbackCode.tenantId ?? "").trim(),
    tenantName: readString(contractCode.tenantName, fallbackCode.tenantName ?? "").trim(),
    salesMemberId: readString(contractCode.salesMemberId, fallbackCode.salesMemberId ?? "").trim(),
    salesMemberName: readString(
      contractCode.salesMemberName,
      fallbackCode.salesMemberName ?? "",
    ).trim(),
    salesMemberPhone: readString(
      contractCode.salesMemberPhone,
      fallbackCode.salesMemberPhone ?? "",
    ).trim(),
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
    discountFactor: 0.8,
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

  const normalizedPlan: MockSubscriptionPlanTemplate = {
    key: readString(plan.key, fallbackPlan.key),
    sequence: readString(plan.sequence, fallbackPlan.sequence),
    title: readString(plan.title, fallbackPlan.title),
    seatCount,
    monthlyEnabled: readBoolean(plan.monthlyEnabled, fallbackPlan.monthlyEnabled),
    yearlyEnabled: readBoolean(plan.yearlyEnabled, fallbackPlan.yearlyEnabled),
    contractYearlyEnabled: readBoolean(
      plan.contractYearlyEnabled,
      fallbackPlan.contractYearlyEnabled,
    ),
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
    contractYearlyEnabled: readBoolean(
      plan.contractYearlyEnabled,
      fallbackPlan.contractYearlyEnabled,
    ),
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

const getLatestPaidSubscriptionOrder = (tenantSnapshot?: MockTenantManagementSnapshot | null) =>
  tenantSnapshot?.subscriptionOrders.find(order => order.status === "paid") ?? null;

export const getMockTenantActiveSubscriptionBillingCycle = (
  tenantSnapshot?: MockTenantManagementSnapshot | null,
): MockSubscriptionBillingCycle | null => {
  if (!isDateAfter(tenantSnapshot?.planExpiresAt, MOCK_SUBSCRIPTION_TODAY)) {
    return null;
  }

  return getLatestPaidSubscriptionOrder(tenantSnapshot)?.billingCycle ?? null;
};

export const getMockTenantActiveSubscriptionContractCode = (
  tenantSnapshot?: MockTenantManagementSnapshot | null,
): string => {
  if (!isDateAfter(tenantSnapshot?.planExpiresAt, MOCK_SUBSCRIPTION_TODAY)) {
    return "";
  }

  return getLatestPaidSubscriptionOrder(tenantSnapshot)?.contractCode ?? "";
};

const findContractCode = (contractCode?: string): MockSalesChannelContractCode | null => {
  const normalizedCode = resolveMainCodeFromContractInput(contractCode);

  if (!normalizedCode) {
    return null;
  }

  for (const item of getMockSalesChannelContractCodes()) {
    if (item.code === normalizedCode) {
      return item;
    }
  }

  return null;
};

const getPromotionIsActive = (): boolean =>
  toDate(MOCK_SUBSCRIPTION_TODAY).getTime() <= toDate(MOCK_PROMOTION_ENDS_AT).getTime();

const getPlanBillingConfig = (
  plan: MockSubscriptionPlanTemplate,
  billingCycle: MockSubscriptionBillingCycle,
  channelDiscountFactor?: number,
): {
  giftPoints: number;
  priceAmount: number;
  validityCount: number;
  validityUnit: MockSubscriptionValidityUnit;
} => {
  const matchedSpec = getPrimarySpecByBillingCycle(plan, billingCycle);

  if (matchedSpec) {
    return {
      giftPoints: matchedSpec.giftPoints,
      priceAmount:
        matchedSpec.contractPriceEnabled && typeof channelDiscountFactor === "number"
          ? Math.max(Math.floor(matchedSpec.priceAmount * channelDiscountFactor), 0)
          : matchedSpec.priceAmount,
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

  return matchedCode
    ? `已应用渠道折扣（${formatChannelDiscount(matchedCode.discountFactor)}）`
    : "已应用渠道折扣";
};

const resolveEnterpriseQualification = (
  input: MockSubscriptionPlanPurchaseInput,
  matchedCode: MockSalesChannelContractCode | null,
): {
  customerTier: MockSubscriptionCustomerTier;
  enterpriseQualified: boolean;
  ruleMessage: string;
} => {
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
      ruleMessage: `未达到签约码优惠起订席位`,
    };
  }

  return {
    customerTier: "enterprise",
    enterpriseQualified: true,
    ruleMessage: "",
  };
};

/**
 * 读取当前签约码。
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
 * 新建签约码。
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
 * 更新签约码。
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
  const draftPlan: MockSubscriptionPlanTemplate = {
    key: buildSubscriptionPlanKey(payload.title),
    sequence: buildSubscriptionPlanSequence(currentPlans),
    title: payload.title.trim(),
    seatCount: payload.seatCount,
    monthlyEnabled: payload.monthlyEnabled,
    yearlyEnabled: payload.yearlyEnabled,
    contractYearlyEnabled: payload.contractYearlyEnabled,
    monthlyPriceAmount: payload.monthlyPriceAmount,
    yearlyPriceAmount: payload.yearlyPriceAmount,
    contractYearlyPriceAmount: payload.contractYearlyPriceAmount,
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

    const draftPlan: MockSubscriptionPlanTemplate = {
      ...item,
      title: typeof updates.title === "string" ? updates.title.trim() : item.title,
      seatCount,
      monthlyEnabled: readBoolean(updates.monthlyEnabled, item.monthlyEnabled),
      yearlyEnabled: readBoolean(updates.yearlyEnabled, item.yearlyEnabled),
      contractYearlyEnabled: readBoolean(updates.contractYearlyEnabled, item.contractYearlyEnabled),
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
 * 读取当前用户侧可展示的订阅包。
 */
export const getActiveMockSubscriptionPlanTemplates = (): MockSubscriptionPlanTemplate[] =>
  getMockSubscriptionPlanTemplates().filter(
    item => item.status === "active" && item.scope !== "internal",
  );

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
  const selectedPlan = getConfiguredSubscriptionPlan();
  const activeBillingCycle =
    purchaseMode === "addSeats"
      ? getMockTenantActiveSubscriptionBillingCycle(tenantSnapshot)
      : null;
  const effectiveBillingCycle = activeBillingCycle ?? input.billingCycle;
  const selectedSpec = getPrimarySpecByBillingCycle(selectedPlan, effectiveBillingCycle);

  if (!selectedSpec?.enabled) {
    return null;
  }

  const activeContractCode =
    selectedSpec.contractPriceEnabled && purchaseMode === "addSeats"
      ? getMockTenantActiveSubscriptionContractCode(tenantSnapshot)
      : "";
  const effectiveContractCode = input.contractCode?.trim().toUpperCase() || activeContractCode;
  const seatCount =
    purchaseMode === "renew"
      ? Math.max(Math.floor(tenantSnapshot?.totalSeats ?? input.seatCount), 1)
      : Math.max(Math.floor(input.seatCount), 1);
  const normalizedInput: MockSubscriptionPlanPurchaseInput = {
    billingCycle: effectiveBillingCycle,
    contractCode: selectedSpec.contractPriceEnabled ? effectiveContractCode : "",
    purchaseMode,
    seatCount,
  };
  const contractCodeEnabled = selectedSpec.contractPriceEnabled;
  const matchedCode = contractCodeEnabled ? findContractCode(normalizedInput.contractCode) : null;
  const qualification = contractCodeEnabled
    ? resolveEnterpriseQualification(normalizedInput, matchedCode)
    : {
        customerTier: "pro" as MockSubscriptionCustomerTier,
        enterpriseQualified: false,
        ruleMessage: "",
      };
  const channelDiscountFactor = qualification.enterpriseQualified
    ? normalizeChannelDiscountFactor(matchedCode?.discountFactor)
    : undefined;
  const cycleConfig = getPlanBillingConfig(
    selectedPlan,
    normalizedInput.billingCycle,
    channelDiscountFactor,
  );
  const originalCycleConfig = getPlanBillingConfig(selectedPlan, normalizedInput.billingCycle);
  const expiryInfo = getAlignedExpiryInfo(cycleConfig, tenantSnapshot, purchaseMode);
  const originalUnitPrice = originalCycleConfig.priceAmount;
  const originalAmount = Math.ceil(originalUnitPrice * seatCount * expiryInfo.prorationRate);
  const amount = Math.ceil(cycleConfig.priceAmount * seatCount * expiryInfo.prorationRate);
  const planLabel = selectedSpec.title;
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
    prorationLabel: expiryInfo.prorationLabel,
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
  const activationTimestamp = formatSalesDateTime(new Date(timestamp));
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
      : `${purchaseOption.planLabel}已开通，新增订阅席位 ${purchaseOption.seatCount} 个，到期时间 ${purchaseOption.expiresAt}${
          purchaseOption.prorationLabel ? `，${purchaseOption.prorationLabel}` : ""
        }。`;

  activateSalesLeadCode(purchaseOption.contractCode, {
    amount: purchaseOption.amount,
    customerTenantName: matchedSnapshot.tenantName,
    effectiveAt: activationTimestamp,
    orderNo: subscriptionOrder.orderNo,
    seatCount: purchaseOption.seatCount,
  });

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
