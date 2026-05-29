import type {
  MockPointsPackageInput,
  MockPointsPackageOption,
  MockPointsPackagePurchaseSnapshot,
  MockPointsPackageUpdate,
} from "@/feature/points/types";

const MOCK_POINTS_PACKAGE_STORAGE_KEY = "frontis.mock.points-packages";

const PRESET_POINTS_PACKAGES: MockPointsPackageOption[] = [
  {
    id: "starter",
    title: "基础积分包",
    description: "适合新租户体验 ME、AI 专家与轻量 Skill 调用。",
    points: 5000,
    price: 29,
    scope: "public",
    status: "active",
    sortOrder: 10,
    updatedAt: "2026-04-23 10:20",
  },
  {
    id: "standard",
    title: "标准积分包",
    description: "适合日常高频使用与管理后台租户协作场景。",
    points: 10000,
    price: 100,
    giftPoints: 100,
    scope: "public",
    status: "active",
    sortOrder: 20,
    tagLabel: "推荐",
    updatedAt: "2026-04-23 10:20",
  },
  {
    id: "growth",
    title: "增长积分包",
    description: "适合多人协作、重模型调用与持续运行的租户。",
    points: 60000,
    price: 249,
    scope: "public",
    status: "active",
    sortOrder: 30,
    updatedAt: "2026-04-23 10:20",
  },
  {
    id: "internal-offline-contract-points",
    title: "线下合同积分包",
    description: "仅运营后台可见，用于给线下成单租户充值积分。",
    points: 100000,
    price: 0,
    giftPoints: 0,
    scope: "internal",
    status: "active",
    sortOrder: 90,
    tagLabel: "内部",
    updatedAt: "2026-05-29 10:00",
  },
];

const isValidPointsPackage = (value: unknown): value is MockPointsPackageOption =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  "title" in value &&
  "points" in value &&
  "price" in value;

const clonePointsPackage = (item: MockPointsPackageOption): MockPointsPackageOption => ({
  ...item,
});

const mergePointsPackage = (
  basePackage: MockPointsPackageOption | undefined,
  overridePackage: MockPointsPackageOption,
): MockPointsPackageOption => ({
  ...basePackage,
  ...overridePackage,
  giftPoints: overridePackage.giftPoints ?? basePackage?.giftPoints,
});

const normalizePackageMoney = (value: number): number => Number(Math.max(0, value).toFixed(2));

/**
 * 生成积分包购买快照，锁定用户下单时的价格和到账权益。
 */
export const buildMockPointsPackagePurchaseSnapshot = (
  pointsPackage: MockPointsPackageOption,
  now = Date.now(),
): MockPointsPackagePurchaseSnapshot => {
  void now;
  const discountFactor = 1;
  const originalPrice = normalizePackageMoney(pointsPackage.price);
  const payableAmount = normalizePackageMoney(originalPrice * discountFactor);
  const basePoints = Math.max(Math.floor(pointsPackage.points), 0);
  const giftPoints = Math.max(Math.floor(pointsPackage.giftPoints ?? 0), 0);

  return {
    packageId: pointsPackage.id,
    packageTitle: pointsPackage.title,
    description: pointsPackage.description,
    basePoints,
    giftPoints,
    totalPoints: basePoints + giftPoints,
    originalPrice,
    payableAmount,
    discountAmount: normalizePackageMoney(originalPrice - payableAmount),
    discountFactor,
    promotionActive: false,
    tagLabel: pointsPackage.tagLabel,
  };
};

const readStoredPointsPackages = (): MockPointsPackageOption[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(MOCK_POINTS_PACKAGE_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isValidPointsPackage).map(item => ({
      ...clonePointsPackage(item),
      status: item.status === "inactive" ? "inactive" : "active",
      scope: item.scope === "internal" ? "internal" : "public",
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "刚刚",
      description: typeof item.description === "string" ? item.description : "",
      giftPoints: typeof item.giftPoints === "number" ? item.giftPoints : undefined,
    }));
  } catch {
    return [];
  }
};

const writeStoredPointsPackages = (packages: MockPointsPackageOption[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MOCK_POINTS_PACKAGE_STORAGE_KEY, JSON.stringify(packages));
};

const mergePointsPackages = (
  presetPackages: MockPointsPackageOption[],
  storedPackages: MockPointsPackageOption[],
): MockPointsPackageOption[] => {
  const packageMap = new Map<string, MockPointsPackageOption>();

  presetPackages.forEach(item => {
    packageMap.set(item.id, clonePointsPackage(item));
  });

  storedPackages.forEach(item => {
    packageMap.set(item.id, mergePointsPackage(packageMap.get(item.id), clonePointsPackage(item)));
  });

  return Array.from(packageMap.values()).sort((leftItem, rightItem) => {
    if (leftItem.sortOrder !== rightItem.sortOrder) {
      return leftItem.sortOrder - rightItem.sortOrder;
    }

    return leftItem.id.localeCompare(rightItem.id);
  });
};

/**
 * 读取当前原型中全部积分包配置。
 */
export const getMockPointsPackages = (): MockPointsPackageOption[] =>
  mergePointsPackages(PRESET_POINTS_PACKAGES, readStoredPointsPackages());

/**
 * 读取当前处于可售状态的积分包。
 */
export const getActiveMockPointsPackages = (): MockPointsPackageOption[] =>
  getMockPointsPackages().filter(item => item.status === "active" && item.scope !== "internal");

/**
 * 创建积分包商品。
 */
export const createMockPointsPackage = (
  payload: MockPointsPackageInput,
): MockPointsPackageOption[] => {
  const currentPackages = getMockPointsPackages();
  const nextPackage: MockPointsPackageOption = {
    id: `points-${Date.now()}`,
    title: payload.title,
    description: payload.description,
    points: payload.points,
    price: payload.price,
    giftPoints: Math.max(Math.floor(payload.giftPoints ?? 0), 0),
    scope: payload.scope ?? "public",
    status: "active",
    sortOrder:
      currentPackages.reduce((maxSortOrder, item) => Math.max(maxSortOrder, item.sortOrder), 0) +
      10,
    tagLabel: payload.tagLabel || undefined,
    updatedAt: "刚刚",
  };
  const nextPackages = [...currentPackages, nextPackage];

  writeStoredPointsPackages(nextPackages);

  return nextPackages;
};

/**
 * 更新指定积分包配置。
 */
export const updateMockPointsPackage = (
  packageId: string,
  updates: MockPointsPackageUpdate,
): MockPointsPackageOption[] => {
  const nextPackages = getMockPointsPackages().map(item =>
    item.id === packageId
      ? {
          ...item,
          ...updates,
          updatedAt: "刚刚",
        }
      : item,
  );

  writeStoredPointsPackages(nextPackages);

  return nextPackages;
};
