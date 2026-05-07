import { OPERATIONS_INITIAL_AGENT_PLAZA_CATEGORIES } from "@/feature/operations/mockData";
import type {
  OperationsAgentPlazaCategoryOption,
  OperationsAgentPlazaCategoryStatus,
} from "@/feature/operations/types";

const OPERATIONS_AGENT_PLAZA_CATEGORIES_STORAGE_KEY = "frontis.operations.agent-plaza-categories";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidCategoryStatus = (value: unknown): value is OperationsAgentPlazaCategoryStatus =>
  value === "active" || value === "inactive";

const isValidAgentPlazaCategory = (value: unknown): value is OperationsAgentPlazaCategoryOption => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.sortOrder === "number" &&
    isValidCategoryStatus(value.status) &&
    typeof value.updatedAt === "string"
  );
};

const cloneAgentPlazaCategory = (
  category: OperationsAgentPlazaCategoryOption,
): OperationsAgentPlazaCategoryOption => ({
  ...category,
  name: category.name.trim(),
  sortOrder: Number.isFinite(category.sortOrder) ? category.sortOrder : 0,
  status: category.status === "inactive" ? "inactive" : "active",
});

const sortAgentPlazaCategories = (
  categories: OperationsAgentPlazaCategoryOption[],
): OperationsAgentPlazaCategoryOption[] =>
  [...categories].sort((leftItem, rightItem) => {
    if (leftItem.sortOrder !== rightItem.sortOrder) {
      return leftItem.sortOrder - rightItem.sortOrder;
    }

    return leftItem.updatedAt.localeCompare(rightItem.updatedAt);
  });

const readStoredAgentPlazaCategories = (): OperationsAgentPlazaCategoryOption[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(OPERATIONS_AGENT_PLAZA_CATEGORIES_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue.filter(isValidAgentPlazaCategory).map(cloneAgentPlazaCategory);
  } catch {
    return null;
  }
};

const mergeStoredCategoriesWithPreset = (
  storedCategories: OperationsAgentPlazaCategoryOption[],
): OperationsAgentPlazaCategoryOption[] => {
  const storedCategoryMap = new Map(storedCategories.map(item => [item.id, item]));
  const presetCategoryIds = new Set(OPERATIONS_INITIAL_AGENT_PLAZA_CATEGORIES.map(item => item.id));

  return sortAgentPlazaCategories([
    ...OPERATIONS_INITIAL_AGENT_PLAZA_CATEGORIES.map(presetCategory =>
      cloneAgentPlazaCategory(storedCategoryMap.get(presetCategory.id) ?? presetCategory),
    ),
    ...storedCategories
      .filter(item => !presetCategoryIds.has(item.id))
      .map(cloneAgentPlazaCategory),
  ]).filter(item => item.name.length > 0);
};

/**
 * 读取运营后台商品分类配置。
 */
export const loadStoredAgentPlazaCategories = (): OperationsAgentPlazaCategoryOption[] =>
  mergeStoredCategoriesWithPreset(readStoredAgentPlazaCategories() ?? []);

/**
 * 保存运营后台商品分类配置。
 */
export const saveStoredAgentPlazaCategories = (
  categories: OperationsAgentPlazaCategoryOption[],
): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OPERATIONS_AGENT_PLAZA_CATEGORIES_STORAGE_KEY,
    JSON.stringify(sortAgentPlazaCategories(categories).map(cloneAgentPlazaCategory)),
  );
};
