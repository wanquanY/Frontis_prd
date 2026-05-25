import {
  OPERATIONS_INITIAL_METERING_PROVIDERS,
  OPERATIONS_INITIAL_MODEL_SERVICES,
} from "@/feature/operations/mockData";
import type {
  OperationsMeteringProvider,
  OperationsMeteringProviderKind,
  OperationsMeteringStatus,
  OperationsModelService,
  OperationsServicePricingMode,
} from "@/feature/operations/types";

const OPERATIONS_METERING_PROVIDERS_STORAGE_KEY = "frontis.operations.metering-providers";
const OPERATIONS_MODEL_SERVICES_STORAGE_KEY = "frontis.operations.model-services";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isMeteringStatus = (value: unknown): value is OperationsMeteringStatus =>
  value === "active" || value === "inactive";

const isProviderKind = (value: unknown): value is OperationsMeteringProviderKind =>
  value === "largeModel";

const isPricingMode = (value: unknown): value is OperationsServicePricingMode =>
  value === "markup" || value === "grossMargin" || value === "manual";

const isValidProvider = (value: unknown): value is OperationsMeteringProvider => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isProviderKind(value.providerKind) &&
    isString(value.baseUrl) &&
    isString(value.billingCurrency) &&
    isString(value.credentialStatusLabel) &&
    isMeteringStatus(value.status) &&
    isString(value.updatedAt)
  );
};

const isValidModelService = (value: unknown): value is OperationsModelService => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.providerId) &&
    isString(value.modelCode) &&
    isString(value.modelName) &&
    isNumber(value.inputCostPerMillion) &&
    isNumber(value.outputCostPerMillion) &&
    isPricingMode(value.pricingMode) &&
    isNumber(value.markupRate) &&
    isNumber(value.grossMarginRate) &&
    isNumber(value.inputSalePricePerMillion) &&
    isNumber(value.outputSalePricePerMillion) &&
    isMeteringStatus(value.status) &&
    isString(value.updatedAt)
  );
};

const loadStoredList = <TItem>(
  storageKey: string,
  validator: (value: unknown) => value is TItem,
): TItem[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue.filter(validator);
  } catch {
    return null;
  }
};

const saveStoredList = <TItem>(storageKey: string, items: TItem[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(items));
};

const mergeStoredWithPreset = <TItem extends { id: string }>(
  storedItems: TItem[],
  presetItems: TItem[],
): TItem[] => {
  const storedMap = new Map(storedItems.map(item => [item.id, item]));
  const presetIds = new Set(presetItems.map(item => item.id));

  return [
    ...presetItems.map(item => ({ ...item, ...storedMap.get(item.id) })),
    ...storedItems.filter(item => !presetIds.has(item.id)),
  ];
};

const cloneProvider = (item: OperationsMeteringProvider): OperationsMeteringProvider => ({
  ...item,
});

const cloneModelService = (item: OperationsModelService): OperationsModelService => ({
  id: item.id,
  providerId: item.providerId,
  modelCode: item.modelCode,
  modelName: item.modelName,
  inputCostPerMillion: item.inputCostPerMillion,
  outputCostPerMillion: item.outputCostPerMillion,
  pricingMode: item.pricingMode,
  markupRate: item.markupRate,
  grossMarginRate: item.grossMarginRate,
  inputSalePricePerMillion: item.inputSalePricePerMillion,
  outputSalePricePerMillion: item.outputSalePricePerMillion,
  status: item.status,
  updatedAt: item.updatedAt,
});

/**
 * 读取运营后台资源供应商。
 */
export const loadStoredOperationsMeteringProviders = (): OperationsMeteringProvider[] =>
  mergeStoredWithPreset(
    loadStoredList(OPERATIONS_METERING_PROVIDERS_STORAGE_KEY, isValidProvider) ?? [],
    OPERATIONS_INITIAL_METERING_PROVIDERS,
  )
    .filter(item => item.providerKind === "largeModel")
    .map(cloneProvider);

/**
 * 保存运营后台资源供应商。
 */
export const saveStoredOperationsMeteringProviders = (
  providers: OperationsMeteringProvider[],
): void => {
  saveStoredList(OPERATIONS_METERING_PROVIDERS_STORAGE_KEY, providers.map(cloneProvider));
};

/**
 * 读取运营后台大模型资源。
 */
export const loadStoredOperationsModelServices = (): OperationsModelService[] =>
  mergeStoredWithPreset(
    loadStoredList(OPERATIONS_MODEL_SERVICES_STORAGE_KEY, isValidModelService) ?? [],
    OPERATIONS_INITIAL_MODEL_SERVICES,
  ).map(cloneModelService);

/**
 * 保存运营后台大模型资源。
 */
export const saveStoredOperationsModelServices = (models: OperationsModelService[]): void => {
  saveStoredList(OPERATIONS_MODEL_SERVICES_STORAGE_KEY, models.map(cloneModelService));
};
