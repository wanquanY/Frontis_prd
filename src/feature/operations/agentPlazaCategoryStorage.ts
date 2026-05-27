import {
  OPERATIONS_INITIAL_AGENT_PLAZA_CATEGORIES,
  OPERATIONS_INITIAL_AGENT_STORE_ZONES,
} from "@/feature/operations/mockData";
import type {
  OperationsAgentPlazaCategoryOption,
  OperationsAgentPlazaCategoryStatus,
  OperationsAgentStoreZoneOption,
} from "@/feature/operations/types";

const OPERATIONS_AGENT_PLAZA_CATEGORIES_STORAGE_KEY = "frontis.operations.agent-plaza-categories";
const OPERATIONS_AGENT_STORE_ZONES_STORAGE_KEY = "frontis.operations.agent-store-zones";

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
    (typeof value.zoneId === "string" || typeof value.zoneId === "undefined") &&
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
  zoneId: category.zoneId || OPERATIONS_INITIAL_AGENT_STORE_ZONES[0].id,
  name: category.name.trim(),
  sortOrder: Number.isFinite(category.sortOrder) ? category.sortOrder : 0,
  status: category.status === "inactive" ? "inactive" : "active",
});

const isValidAgentStoreZone = (value: unknown): value is OperationsAgentStoreZoneOption => {
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

const cloneAgentStoreZone = (zone: OperationsAgentStoreZoneOption): OperationsAgentStoreZoneOption => ({
  ...zone,
  name: zone.name.trim(),
  sortOrder: Number.isFinite(zone.sortOrder) ? zone.sortOrder : 0,
  status: zone.status === "inactive" ? "inactive" : "active",
});

const sortAgentPlazaCategories = (
  categories: OperationsAgentPlazaCategoryOption[],
): OperationsAgentPlazaCategoryOption[] =>
  [...categories].sort((leftItem, rightItem) => {
    if (leftItem.zoneId !== rightItem.zoneId) {
      return leftItem.zoneId.localeCompare(rightItem.zoneId);
    }

    if (leftItem.sortOrder !== rightItem.sortOrder) {
      return leftItem.sortOrder - rightItem.sortOrder;
    }

    return leftItem.updatedAt.localeCompare(rightItem.updatedAt);
  });

const sortAgentStoreZones = (
  zones: OperationsAgentStoreZoneOption[],
): OperationsAgentStoreZoneOption[] =>
  [...zones].sort((leftItem, rightItem) => {
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

const readStoredAgentStoreZones = (): OperationsAgentStoreZoneOption[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(OPERATIONS_AGENT_STORE_ZONES_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue.filter(isValidAgentStoreZone).map(cloneAgentStoreZone);
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

const mergeStoredZonesWithPreset = (
  storedZones: OperationsAgentStoreZoneOption[],
): OperationsAgentStoreZoneOption[] => {
  const storedZoneMap = new Map(storedZones.map(item => [item.id, item]));
  const presetZoneIds = new Set(OPERATIONS_INITIAL_AGENT_STORE_ZONES.map(item => item.id));

  return sortAgentStoreZones([
    ...OPERATIONS_INITIAL_AGENT_STORE_ZONES.map(presetZone =>
      cloneAgentStoreZone(storedZoneMap.get(presetZone.id) ?? presetZone),
    ),
    ...storedZones.filter(item => !presetZoneIds.has(item.id)).map(cloneAgentStoreZone),
  ]).filter(item => item.name.length > 0);
};

/**
 * 读取运营后台专家广场场景分类配置。
 */
export const loadStoredAgentPlazaCategories = (): OperationsAgentPlazaCategoryOption[] =>
  mergeStoredCategoriesWithPreset(readStoredAgentPlazaCategories() ?? []);

/**
 * 读取运营后台专家商店专区配置。
 */
export const loadStoredAgentStoreZones = (): OperationsAgentStoreZoneOption[] =>
  mergeStoredZonesWithPreset(readStoredAgentStoreZones() ?? []);

/**
 * 保存运营后台专家广场场景分类配置。
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

/**
 * 保存运营后台专家商店专区配置。
 */
export const saveStoredAgentStoreZones = (zones: OperationsAgentStoreZoneOption[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    OPERATIONS_AGENT_STORE_ZONES_STORAGE_KEY,
    JSON.stringify(sortAgentStoreZones(zones).map(cloneAgentStoreZone)),
  );
};
