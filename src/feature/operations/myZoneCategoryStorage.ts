import { OPERATIONS_INITIAL_MY_ZONE_CATEGORIES } from "@/feature/operations/mockData";
import type {
  OperationsMyZoneCategoryOption,
  OperationsMyZoneCategoryStatus,
} from "@/feature/operations/types";

const OPERATIONS_MY_ZONE_CATEGORIES_STORAGE_KEY = "frontis.operations.my-zone-categories";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidMyZoneCategoryStatus = (value: unknown): value is OperationsMyZoneCategoryStatus =>
  value === "active" || value === "inactive";

const isValidMyZoneCategory = (value: unknown): value is OperationsMyZoneCategoryOption => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.sortOrder === "number" &&
    isValidMyZoneCategoryStatus(value.status) &&
    typeof value.updatedAt === "string"
  );
};

const cloneMyZoneCategory = (
  category: OperationsMyZoneCategoryOption,
): OperationsMyZoneCategoryOption => ({
  ...category,
  name: category.name.trim(),
  sortOrder: Number.isFinite(category.sortOrder) ? category.sortOrder : 0,
  status: category.status === "inactive" ? "inactive" : "active",
});

const sortMyZoneCategories = (
  categories: OperationsMyZoneCategoryOption[],
): OperationsMyZoneCategoryOption[] =>
  [...categories].sort((leftItem, rightItem) => {
    if (leftItem.sortOrder !== rightItem.sortOrder) {
      return leftItem.sortOrder - rightItem.sortOrder;
    }

    return leftItem.updatedAt.localeCompare(rightItem.updatedAt);
  });

const readStoredMyZoneCategories = (): OperationsMyZoneCategoryOption[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(OPERATIONS_MY_ZONE_CATEGORIES_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue.filter(isValidMyZoneCategory).map(cloneMyZoneCategory);
  } catch {
    return null;
  }
};

const mergeStoredCategoriesWithPreset = (
  storedCategories: OperationsMyZoneCategoryOption[],
): OperationsMyZoneCategoryOption[] => {
  const storedCategoryMap = new Map(storedCategories.map(item => [item.id, item]));
  const presetCategoryIds = new Set(OPERATIONS_INITIAL_MY_ZONE_CATEGORIES.map(item => item.id));

  return sortMyZoneCategories([
    ...OPERATIONS_INITIAL_MY_ZONE_CATEGORIES.map(presetCategory =>
      cloneMyZoneCategory(storedCategoryMap.get(presetCategory.id) ?? presetCategory),
    ),
    ...storedCategories.filter(item => !presetCategoryIds.has(item.id)).map(cloneMyZoneCategory),
  ]).filter(item => item.name.length > 0);
};

/**
 * 读取运营后台我的专区分类配置。
 */
export const loadStoredMyZoneCategories = (): OperationsMyZoneCategoryOption[] =>
  mergeStoredCategoriesWithPreset(readStoredMyZoneCategories() ?? []);

/**
 * 保存运营后台我的专区分类配置。
 */
export const saveStoredMyZoneCategories = (categories: OperationsMyZoneCategoryOption[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OPERATIONS_MY_ZONE_CATEGORIES_STORAGE_KEY,
    JSON.stringify(sortMyZoneCategories(categories).map(cloneMyZoneCategory)),
  );
};
