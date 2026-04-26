import type {
  MockTenantPlanPackageOption,
  MockTenantSeatPricing,
} from "@/feature/tenantPlan/types";

const MOCK_TEAM_PLAN_PACKAGE_STORAGE_KEY = "frontis.mock.team-plan-packages";
const MOCK_TEAM_SEAT_PRICING_STORAGE_KEY = "frontis.mock.team-seat-pricing";

const PRESET_TEAM_PLAN_PACKAGES: MockTenantPlanPackageOption[] = [
  {
    id: "team-5",
    title: "团队 5 席版",
    description: "适合小团队开始协作，开通组织管理、成员邀请和基础席位能力。",
    includedSeats: 5,
    price: 2999,
    billingCycleLabel: "按年订阅",
    status: "active",
    sortOrder: 10,
    updatedAt: "2026-04-23 18:20",
  },
  {
    id: "team-20",
    title: "团队 20 席版",
    description: "适合稳定协作团队，包含更多基础席位与团队协作能力。",
    includedSeats: 20,
    price: 9999,
    billingCycleLabel: "按年订阅",
    status: "active",
    sortOrder: 20,
    tagLabel: "推荐",
    updatedAt: "2026-04-23 18:20",
  },
];

const PRESET_TEAM_SEAT_PRICING: MockTenantSeatPricing = {
  pricePerSeat: 399,
  billingCycleLabel: "按席位 / 年",
  updatedAt: "2026-04-23 18:20",
};

const isValidTeamPlanPackage = (value: unknown): value is MockTenantPlanPackageOption =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  "title" in value &&
  "includedSeats" in value &&
  "price" in value;

const isValidTeamSeatPricing = (value: unknown): value is MockTenantSeatPricing =>
  typeof value === "object" &&
  value !== null &&
  "pricePerSeat" in value &&
  "billingCycleLabel" in value;

const cloneTeamPlanPackage = (
  item: MockTenantPlanPackageOption,
): MockTenantPlanPackageOption => ({
  ...item,
});

const cloneSeatPricing = (pricing: MockTenantSeatPricing): MockTenantSeatPricing => ({
  ...pricing,
});

const readStoredTeamPlanPackages = (): MockTenantPlanPackageOption[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(MOCK_TEAM_PLAN_PACKAGE_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isValidTeamPlanPackage).map(item => ({
      ...cloneTeamPlanPackage(item),
      status: item.status === "inactive" ? "inactive" : "active",
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
      billingCycleLabel:
        typeof item.billingCycleLabel === "string" ? item.billingCycleLabel : "按年订阅",
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "刚刚",
      description: typeof item.description === "string" ? item.description : "",
    }));
  } catch {
    return [];
  }
};

const writeStoredTeamPlanPackages = (packages: MockTenantPlanPackageOption[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MOCK_TEAM_PLAN_PACKAGE_STORAGE_KEY, JSON.stringify(packages));
};

const readStoredSeatPricing = (): MockTenantSeatPricing | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(MOCK_TEAM_SEAT_PRICING_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!isValidTeamSeatPricing(parsedValue)) {
      return null;
    }

    return cloneSeatPricing({
      ...parsedValue,
      updatedAt: typeof parsedValue.updatedAt === "string" ? parsedValue.updatedAt : "刚刚",
    });
  } catch {
    return null;
  }
};

const writeStoredSeatPricing = (pricing: MockTenantSeatPricing): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MOCK_TEAM_SEAT_PRICING_STORAGE_KEY, JSON.stringify(pricing));
};

const mergeTeamPlanPackages = (
  presetPackages: MockTenantPlanPackageOption[],
  storedPackages: MockTenantPlanPackageOption[],
): MockTenantPlanPackageOption[] => {
  const packageMap = new Map<string, MockTenantPlanPackageOption>();

  presetPackages.forEach(item => {
    packageMap.set(item.id, cloneTeamPlanPackage(item));
  });

  storedPackages.forEach(item => {
    packageMap.set(item.id, cloneTeamPlanPackage(item));
  });

  return Array.from(packageMap.values()).sort((leftItem, rightItem) => {
    if (leftItem.sortOrder !== rightItem.sortOrder) {
      return leftItem.sortOrder - rightItem.sortOrder;
    }

    return leftItem.id.localeCompare(rightItem.id);
  });
};

/**
 * 读取当前原型中全部团队套餐配置。
 */
export const getMockTenantPlanPackages = (): MockTenantPlanPackageOption[] =>
  mergeTeamPlanPackages(PRESET_TEAM_PLAN_PACKAGES, readStoredTeamPlanPackages());

/**
 * 读取当前处于可售状态的团队套餐。
 */
export const getActiveMockTenantPlanPackages = (): MockTenantPlanPackageOption[] =>
  getMockTenantPlanPackages().filter(item => item.status === "active");

/**
 * 创建团队套餐商品。
 */
export const createMockTenantPlanPackage = (
  payload: Pick<
    MockTenantPlanPackageOption,
    "title" | "description" | "includedSeats" | "price" | "tagLabel"
  >,
): MockTenantPlanPackageOption[] => {
  const currentPackages = getMockTenantPlanPackages();
  const nextPackage: MockTenantPlanPackageOption = {
    id: `team-${Date.now()}`,
    title: payload.title,
    description: payload.description,
    includedSeats: payload.includedSeats,
    price: payload.price,
    billingCycleLabel: "按年订阅",
    status: "active",
    sortOrder:
      currentPackages.reduce((maxSortOrder, item) => Math.max(maxSortOrder, item.sortOrder), 0) +
      10,
    tagLabel: payload.tagLabel || undefined,
    updatedAt: "刚刚",
  };
  const nextPackages = [...currentPackages, nextPackage];

  writeStoredTeamPlanPackages(nextPackages);

  return nextPackages;
};

/**
 * 更新指定团队套餐配置。
 */
export const updateMockTenantPlanPackage = (
  packageId: string,
  updates: Partial<
    Pick<
      MockTenantPlanPackageOption,
      "title" | "description" | "includedSeats" | "price" | "status" | "sortOrder" | "tagLabel"
    >
  >,
): MockTenantPlanPackageOption[] => {
  const nextPackages = getMockTenantPlanPackages().map(item =>
    item.id === packageId
      ? {
          ...item,
          ...updates,
          updatedAt: "刚刚",
        }
      : item,
  );

  writeStoredTeamPlanPackages(nextPackages);

  return nextPackages;
};

/**
 * 读取当前单席位扩容价格。
 */
export const getMockTenantSeatPricing = (): MockTenantSeatPricing =>
  readStoredSeatPricing() ?? cloneSeatPricing(PRESET_TEAM_SEAT_PRICING);

/**
 * 更新单席位扩容价格。
 */
export const updateMockTenantSeatPricing = (
  updates: Partial<Pick<MockTenantSeatPricing, "pricePerSeat" | "billingCycleLabel">>,
): MockTenantSeatPricing => {
  const nextPricing: MockTenantSeatPricing = {
    ...getMockTenantSeatPricing(),
    ...updates,
    updatedAt: "刚刚",
  };

  writeStoredSeatPricing(nextPricing);

  return nextPricing;
};
