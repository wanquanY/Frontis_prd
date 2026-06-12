import {
  OPERATIONS_INITIAL_METERING_PROVIDERS,
  OPERATIONS_INITIAL_MODEL_SERVICES,
} from "@/feature/operations/mockData";
import type {
  OperationsMeteringProvider,
  OperationsMeteringProviderKind,
  OperationsMeteringStatus,
  OperationsModelMeteringProtocol,
  OperationsModelRegion,
  OperationsModelService,
  OperationsServicePricingMode,
} from "@/feature/operations/types";

const OPERATIONS_METERING_PROVIDERS_STORAGE_KEY = "frontis.operations.metering-providers";
const OPERATIONS_MODEL_SERVICES_STORAGE_KEY = "frontis.operations.model-services.v7";

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

const isModelMeteringProtocol = (value: unknown): value is OperationsModelMeteringProtocol =>
  value === "openai" || value === "claude";

const isModelRegion = (value: unknown): value is OperationsModelRegion =>
  value === "domestic" || value === "overseas";

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
    isString(value.modelCode) &&
    isString(value.modelName) &&
    isModelRegion(value.modelRegion) &&
    isString(value.modelValue) &&
    isModelMeteringProtocol(value.interfaceFormat) &&
    isNumber(value.inputCostPerMillion) &&
    isNumber(value.cacheCostPerMillion) &&
    isNumber(value.outputCostPerMillion) &&
    isPricingMode(value.pricingMode) &&
    isNumber(value.markupRate) &&
    isNumber(value.grossMarginRate) &&
    isNumber(value.inputSalePricePerMillion) &&
    isNumber(value.cacheSalePricePerMillion) &&
    isNumber(value.outputSalePricePerMillion) &&
    isNumber(value.sortOrder) &&
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
  modelCode: item.modelCode,
  modelName: item.modelName,
  modelRegion: item.modelRegion,
  modelValue: item.modelValue,
  interfaceFormat: item.interfaceFormat,
  inputCostPerMillion: item.inputCostPerMillion,
  cacheCostPerMillion: item.cacheCostPerMillion,
  outputCostPerMillion: item.outputCostPerMillion,
  pricingMode: item.pricingMode,
  markupRate: item.markupRate,
  grossMarginRate: item.grossMarginRate,
  inputSalePricePerMillion: item.inputSalePricePerMillion,
  cacheSalePricePerMillion: item.cacheSalePricePerMillion,
  outputSalePricePerMillion: item.outputSalePricePerMillion,
  sortOrder: item.sortOrder,
  status: item.status,
  updatedAt: item.updatedAt,
});

const mergeStoredModelServiceConfig = (
  presetItem: OperationsModelService,
  storedItem?: OperationsModelService,
): OperationsModelService => {
  if (!storedItem) {
    return cloneModelService(presetItem);
  }

  return cloneModelService({
    ...presetItem,
    modelCode: storedItem.modelCode,
    modelName: storedItem.modelName,
    modelRegion: storedItem.modelRegion,
    modelValue: storedItem.modelValue,
    interfaceFormat: storedItem.interfaceFormat,
    inputCostPerMillion: storedItem.inputCostPerMillion,
    cacheCostPerMillion: storedItem.cacheCostPerMillion,
    outputCostPerMillion: storedItem.outputCostPerMillion,
    pricingMode: storedItem.pricingMode,
    markupRate: storedItem.markupRate,
    grossMarginRate: storedItem.grossMarginRate,
    inputSalePricePerMillion: storedItem.inputSalePricePerMillion,
    cacheSalePricePerMillion: storedItem.cacheSalePricePerMillion,
    outputSalePricePerMillion: storedItem.outputSalePricePerMillion,
    sortOrder: storedItem.sortOrder,
    status: storedItem.status,
    updatedAt: storedItem.updatedAt,
  });
};

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
export const loadStoredOperationsModelServices = (): OperationsModelService[] => {
  const storedItems =
    loadStoredList(OPERATIONS_MODEL_SERVICES_STORAGE_KEY, isValidModelService) ?? [];
  const presetMap = new Map(OPERATIONS_INITIAL_MODEL_SERVICES.map(item => [item.id, item]));
  const mergedPresetIds = new Set<string>();

  const storedMergedItems = storedItems.map(storedItem => {
    const presetItem = presetMap.get(storedItem.id);

    if (!presetItem) {
      return cloneModelService(storedItem);
    }

    mergedPresetIds.add(presetItem.id);

    return mergeStoredModelServiceConfig(presetItem, storedItem);
  });

  const missingPresetItems = OPERATIONS_INITIAL_MODEL_SERVICES.filter(
    presetItem => !mergedPresetIds.has(presetItem.id),
  ).map(cloneModelService);

  return [...storedMergedItems, ...missingPresetItems];
};

/**
 * 保存运营后台大模型资源。
 */
export const saveStoredOperationsModelServices = (models: OperationsModelService[]): void => {
  saveStoredList(OPERATIONS_MODEL_SERVICES_STORAGE_KEY, models.map(cloneModelService));
};
