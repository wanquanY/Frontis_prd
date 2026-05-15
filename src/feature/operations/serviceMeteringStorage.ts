import {
  OPERATIONS_INITIAL_EXTERNAL_METERED_SERVICES,
  OPERATIONS_INITIAL_METERING_PROVIDERS,
  OPERATIONS_INITIAL_MODEL_SERVICES,
} from "@/feature/operations/mockData";
import type {
  OperationsExternalMeteredService,
  OperationsExternalServiceMeteringUnit,
  OperationsMeteringProvider,
  OperationsMeteringProviderKind,
  OperationsMeteringStatus,
  OperationsModelInterfaceFormat,
  OperationsModelModality,
  OperationsModelService,
  OperationsServicePricingMode,
} from "@/feature/operations/types";

const OPERATIONS_METERING_PROVIDERS_STORAGE_KEY = "frontis.operations.metering-providers";
const OPERATIONS_MODEL_SERVICES_STORAGE_KEY = "frontis.operations.model-services";
const OPERATIONS_EXTERNAL_SERVICES_STORAGE_KEY = "frontis.operations.external-metered-services";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isMeteringStatus = (value: unknown): value is OperationsMeteringStatus =>
  value === "active" || value === "inactive";

const isProviderKind = (value: unknown): value is OperationsMeteringProviderKind =>
  value === "largeModel" || value === "thirdPartyApi" || value === "skillService";

const isModelModality = (value: unknown): value is OperationsModelModality =>
  value === "text" || value === "multimodal" || value === "embedding" || value === "image";

const isModelInterfaceFormat = (value: unknown): value is OperationsModelInterfaceFormat =>
  value === "openai" || value === "anthropic" || value === "gemini";

const isPricingMode = (value: unknown): value is OperationsServicePricingMode =>
  value === "markup" || value === "grossMargin" || value === "manual";

const isExternalMeteringUnit = (value: unknown): value is OperationsExternalServiceMeteringUnit =>
  value === "call" ||
  value === "request" ||
  value === "minute" ||
  value === "image" ||
  value === "thousandCharacters";

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
    isString(value.providerName) &&
    isString(value.modelCode) &&
    isString(value.modelName) &&
    isModelInterfaceFormat(value.interfaceFormat) &&
    isModelModality(value.modality) &&
    typeof value.reasoningEnabled === "boolean" &&
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

const isValidExternalService = (value: unknown): value is OperationsExternalMeteredService => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.providerId) &&
    isString(value.providerName) &&
    isString(value.name) &&
    isString(value.serviceTypeLabel) &&
    isExternalMeteringUnit(value.meteringUnit) &&
    isNumber(value.costPerUnit) &&
    isPricingMode(value.pricingMode) &&
    isNumber(value.markupRate) &&
    isNumber(value.grossMarginRate) &&
    isNumber(value.salePricePerUnit) &&
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
  ...item,
});

const cloneExternalService = (
  item: OperationsExternalMeteredService,
): OperationsExternalMeteredService => ({
  ...item,
});

/**
 * 读取运营后台资源供应商。
 */
export const loadStoredOperationsMeteringProviders = (): OperationsMeteringProvider[] =>
  mergeStoredWithPreset(
    loadStoredList(OPERATIONS_METERING_PROVIDERS_STORAGE_KEY, isValidProvider) ?? [],
    OPERATIONS_INITIAL_METERING_PROVIDERS,
  ).map(cloneProvider);

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

/**
 * 读取运营后台第三方接口资源。
 */
export const loadStoredOperationsExternalMeteredServices = (): OperationsExternalMeteredService[] =>
  mergeStoredWithPreset(
    loadStoredList(OPERATIONS_EXTERNAL_SERVICES_STORAGE_KEY, isValidExternalService) ?? [],
    OPERATIONS_INITIAL_EXTERNAL_METERED_SERVICES,
  ).map(cloneExternalService);

/**
 * 保存运营后台第三方接口资源。
 */
export const saveStoredOperationsExternalMeteredServices = (
  services: OperationsExternalMeteredService[],
): void => {
  saveStoredList(OPERATIONS_EXTERNAL_SERVICES_STORAGE_KEY, services.map(cloneExternalService));
};
