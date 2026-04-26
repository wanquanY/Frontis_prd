import {
  OPERATIONS_INITIAL_EXTERNAL_METERED_SERVICES,
  OPERATIONS_INITIAL_METERING_PROVIDERS,
  OPERATIONS_INITIAL_MODEL_SERVICES,
  OPERATIONS_INITIAL_POINTS_USAGE_RECORDS,
} from "@/feature/operations/mockData";
import type {
  OperationsExternalMeteredService,
  OperationsExternalServiceMeteringUnit,
  OperationsMeteringProvider,
  OperationsMeteringProviderKind,
  OperationsModelInterfaceFormat,
  OperationsMeteringStatus,
  OperationsModelModality,
  OperationsModelService,
  OperationsPointsUsageRecord,
  OperationsPointsUsageSourceType,
  OperationsUsagePricingMode,
} from "@/feature/operations/types";

const OPERATIONS_METERING_PROVIDERS_STORAGE_KEY = "frontis.operations.metering-providers";
const OPERATIONS_MODEL_SERVICES_STORAGE_KEY = "frontis.operations.model-services";
const OPERATIONS_EXTERNAL_SERVICES_STORAGE_KEY = "frontis.operations.external-metered-services";
const OPERATIONS_POINTS_USAGE_RECORDS_STORAGE_KEY = "frontis.operations.points-usage-records";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isMeteringStatus = (value: unknown): value is OperationsMeteringStatus =>
  value === "active" || value === "inactive";

const isProviderKind = (value: unknown): value is OperationsMeteringProviderKind =>
  value === "largeModel" || value === "thirdPartyApi" || value === "skillService";

const isModelModality = (value: unknown): value is OperationsModelModality =>
  value === "text" || value === "multimodal" || value === "embedding" || value === "image";

const isModelInterfaceFormat = (value: unknown): value is OperationsModelInterfaceFormat =>
  value === "openai" || value === "anthropic" || value === "gemini";

const isPricingMode = (value: unknown): value is OperationsUsagePricingMode =>
  value === "markup" || value === "grossMargin" || value === "manual";

const isExternalMeteringUnit = (value: unknown): value is OperationsExternalServiceMeteringUnit =>
  value === "call" ||
  value === "request" ||
  value === "minute" ||
  value === "image" ||
  value === "thousandCharacters";

const isUsageSourceType = (value: unknown): value is OperationsPointsUsageSourceType =>
  value === "largeModel" || value === "skill" || value === "thirdPartyApi";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isValidProvider = (value: unknown): value is OperationsMeteringProvider => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.name) &&
    isProviderKind(value.providerKind) &&
    (typeof value.baseUrl === "undefined" || isString(value.baseUrl)) &&
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
    (typeof value.interfaceFormat === "undefined" ||
      isModelInterfaceFormat(value.interfaceFormat)) &&
    isModelModality(value.modality) &&
    (typeof value.reasoningEnabled === "undefined" ||
      typeof value.reasoningEnabled === "boolean") &&
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

const isValidUsageRecord = (value: unknown): value is OperationsPointsUsageRecord => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.tenantName) &&
    isString(value.userName) &&
    isUsageSourceType(value.sourceType) &&
    isString(value.sourceName) &&
    isString(value.providerName) &&
    isNumber(value.costAmount) &&
    isNumber(value.saleAmount) &&
    isNumber(value.points) &&
    isNumber(value.marginAmount) &&
    isString(value.occurredAt)
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
    ...presetItems.map(item => {
      const storedItem = storedMap.get(item.id);

      return storedItem ? { ...item, ...storedItem } : { ...item };
    }),
    ...storedItems.filter(item => !presetIds.has(item.id)),
  ];
};

const mergeStoredProvidersWithPreset = (
  storedItems: OperationsMeteringProvider[],
): OperationsMeteringProvider[] => {
  const storedMap = new Map(storedItems.map(item => [item.id, item]));
  const presetIds = new Set(OPERATIONS_INITIAL_METERING_PROVIDERS.map(item => item.id));

  return [
    ...OPERATIONS_INITIAL_METERING_PROVIDERS.map(presetProvider => {
      const storedProvider = storedMap.get(presetProvider.id);

      if (!storedProvider) {
        return { ...presetProvider };
      }

      return {
        ...presetProvider,
        ...storedProvider,
        baseUrl: storedProvider.baseUrl.trim() || presetProvider.baseUrl,
        credentialStatusLabel:
          storedProvider.credentialStatusLabel.trim() === "已配置密钥"
            ? presetProvider.credentialStatusLabel
            : storedProvider.credentialStatusLabel,
      };
    }),
    ...storedItems.filter(item => !presetIds.has(item.id)),
  ];
};

const cloneProvider = (item: OperationsMeteringProvider): OperationsMeteringProvider => ({
  ...item,
  baseUrl: item.baseUrl ?? "",
});

const cloneModelService = (item: OperationsModelService): OperationsModelService => ({
  ...item,
  interfaceFormat: item.interfaceFormat ?? "openai",
  reasoningEnabled: item.reasoningEnabled ?? true,
});

const cloneExternalService = (
  item: OperationsExternalMeteredService,
): OperationsExternalMeteredService => ({
  ...item,
});

const cloneUsageRecord = (item: OperationsPointsUsageRecord): OperationsPointsUsageRecord => ({
  ...item,
});

/**
 * 读取运营后台积分消耗服务商。
 */
export const loadStoredOperationsMeteringProviders = (): OperationsMeteringProvider[] =>
  mergeStoredProvidersWithPreset(
    loadStoredList(OPERATIONS_METERING_PROVIDERS_STORAGE_KEY, isValidProvider) ?? [],
  ).map(cloneProvider);

/**
 * 保存运营后台积分消耗服务商。
 */
export const saveStoredOperationsMeteringProviders = (
  providers: OperationsMeteringProvider[],
): void => {
  saveStoredList(OPERATIONS_METERING_PROVIDERS_STORAGE_KEY, providers.map(cloneProvider));
};

/**
 * 读取运营后台大模型计费配置。
 */
export const loadStoredOperationsModelServices = (): OperationsModelService[] =>
  mergeStoredWithPreset(
    loadStoredList(OPERATIONS_MODEL_SERVICES_STORAGE_KEY, isValidModelService) ?? [],
    OPERATIONS_INITIAL_MODEL_SERVICES,
  ).map(cloneModelService);

/**
 * 保存运营后台大模型计费配置。
 */
export const saveStoredOperationsModelServices = (models: OperationsModelService[]): void => {
  saveStoredList(OPERATIONS_MODEL_SERVICES_STORAGE_KEY, models.map(cloneModelService));
};

/**
 * 读取运营后台第三方接口或 Skill 计费配置。
 */
export const loadStoredOperationsExternalMeteredServices = (): OperationsExternalMeteredService[] =>
  mergeStoredWithPreset(
    loadStoredList(OPERATIONS_EXTERNAL_SERVICES_STORAGE_KEY, isValidExternalService) ?? [],
    OPERATIONS_INITIAL_EXTERNAL_METERED_SERVICES,
  ).map(cloneExternalService);

/**
 * 保存运营后台第三方接口或 Skill 计费配置。
 */
export const saveStoredOperationsExternalMeteredServices = (
  services: OperationsExternalMeteredService[],
): void => {
  saveStoredList(OPERATIONS_EXTERNAL_SERVICES_STORAGE_KEY, services.map(cloneExternalService));
};

/**
 * 读取运营后台积分消耗对账记录。
 */
export const loadStoredOperationsPointsUsageRecords = (): OperationsPointsUsageRecord[] =>
  (
    loadStoredList(OPERATIONS_POINTS_USAGE_RECORDS_STORAGE_KEY, isValidUsageRecord) ??
    OPERATIONS_INITIAL_POINTS_USAGE_RECORDS
  ).map(cloneUsageRecord);

/**
 * 保存运营后台积分消耗对账记录。
 */
export const saveStoredOperationsPointsUsageRecords = (
  records: OperationsPointsUsageRecord[],
): void => {
  saveStoredList(OPERATIONS_POINTS_USAGE_RECORDS_STORAGE_KEY, records.map(cloneUsageRecord));
};
