import { OPERATIONS_INITIAL_SKILL_CENTER_CATEGORIES } from "@/feature/operations/mockData";
import type {
  OperationsSkillCenterCategoryOption,
  OperationsSkillCenterCategoryStatus,
} from "@/feature/operations/types";

const OPERATIONS_SKILL_CENTER_CATEGORIES_STORAGE_KEY = "frontis.operations.skill-center-categories";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidSkillCenterCategoryStatus = (
  value: unknown,
): value is OperationsSkillCenterCategoryStatus => value === "active" || value === "inactive";

const isValidSkillCenterCategory = (
  value: unknown,
): value is OperationsSkillCenterCategoryOption => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.sortOrder === "number" &&
    isValidSkillCenterCategoryStatus(value.status) &&
    typeof value.updatedAt === "string"
  );
};

const cloneSkillCenterCategory = (
  category: OperationsSkillCenterCategoryOption,
): OperationsSkillCenterCategoryOption => ({
  ...category,
  name: category.name.trim(),
  sortOrder: Number.isFinite(category.sortOrder) ? category.sortOrder : 0,
  status: category.status === "inactive" ? "inactive" : "active",
});

const sortSkillCenterCategories = (
  categories: OperationsSkillCenterCategoryOption[],
): OperationsSkillCenterCategoryOption[] =>
  [...categories].sort((leftItem, rightItem) => {
    if (leftItem.sortOrder !== rightItem.sortOrder) {
      return leftItem.sortOrder - rightItem.sortOrder;
    }

    return leftItem.updatedAt.localeCompare(rightItem.updatedAt);
  });

const readStoredSkillCenterCategories = (): OperationsSkillCenterCategoryOption[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(OPERATIONS_SKILL_CENTER_CATEGORIES_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue.filter(isValidSkillCenterCategory).map(cloneSkillCenterCategory);
  } catch {
    return null;
  }
};

const mergeStoredCategoriesWithPreset = (
  storedCategories: OperationsSkillCenterCategoryOption[],
): OperationsSkillCenterCategoryOption[] => {
  const storedCategoryMap = new Map(storedCategories.map(item => [item.id, item]));
  const presetCategoryIds = new Set(
    OPERATIONS_INITIAL_SKILL_CENTER_CATEGORIES.map(item => item.id),
  );

  return sortSkillCenterCategories([
    ...OPERATIONS_INITIAL_SKILL_CENTER_CATEGORIES.map(presetCategory =>
      cloneSkillCenterCategory(storedCategoryMap.get(presetCategory.id) ?? presetCategory),
    ),
    ...storedCategories
      .filter(item => !presetCategoryIds.has(item.id))
      .map(cloneSkillCenterCategory),
  ]).filter(item => item.name.length > 0);
};

/**
 * 读取运营后台技能中心分类配置。
 */
export const loadStoredSkillCenterCategories = (): OperationsSkillCenterCategoryOption[] =>
  mergeStoredCategoriesWithPreset(readStoredSkillCenterCategories() ?? []);

/**
 * 保存运营后台技能中心分类配置。
 */
export const saveStoredSkillCenterCategories = (
  categories: OperationsSkillCenterCategoryOption[],
): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OPERATIONS_SKILL_CENTER_CATEGORIES_STORAGE_KEY,
    JSON.stringify(sortSkillCenterCategories(categories).map(cloneSkillCenterCategory)),
  );
};
