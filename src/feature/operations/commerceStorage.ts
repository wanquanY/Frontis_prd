import {
  createDefaultAgentSubscriptionPlans,
  OPERATIONS_INITIAL_FULFILLMENTS,
  OPERATIONS_INITIAL_PRODUCTS,
  OPERATIONS_INITIAL_RESOURCE_POOLS,
} from "@/feature/operations/mockData";
import type {
  OperationsFulfillment,
  OperationsProduct,
  OperationsResourcePool,
} from "@/feature/operations/types";

const OPERATIONS_PRODUCTS_STORAGE_KEY = "frontis.operations.products";
const OPERATIONS_FULFILLMENTS_STORAGE_KEY = "frontis.operations.fulfillments";
const OPERATIONS_RESOURCE_POOLS_STORAGE_KEY = "frontis.operations.resource-pools";

const cloneProduct = (item: OperationsProduct): OperationsProduct => ({
  ...item,
  subscriptionPlans: item.subscriptionPlans
    ? item.subscriptionPlans.map(plan => ({ ...plan }))
    : undefined,
  visibleTenantIds: item.visibleTenantIds ? [...item.visibleTenantIds] : [],
  visibleTenantNames: item.visibleTenantNames ? [...item.visibleTenantNames] : [],
  billingScopes: item.billingScopes ? [...item.billingScopes] : ["points"],
  storeZones: item.storeZones?.length ? [...item.storeZones] : item.storeZone ? [item.storeZone] : [],
  plazaCategoryByZone: item.plazaCategoryByZone ? { ...item.plazaCategoryByZone } : {},
  tags: item.tags ? [...item.tags] : [],
});

const cloneFulfillment = (item: OperationsFulfillment): OperationsFulfillment => ({
  ...item,
});

const cloneResourcePool = (item: OperationsResourcePool): OperationsResourcePool => ({
  ...item,
});

const isValidProduct = (value: unknown): value is OperationsProduct =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  "name" in value &&
  "saleType" in value &&
  "status" in value;

const isValidFulfillment = (value: unknown): value is OperationsFulfillment =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  "orderNo" in value &&
  "productId" in value &&
  "status" in value;

const isValidResourcePool = (value: unknown): value is OperationsResourcePool =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  "name" in value &&
  "resourceType" in value &&
  "allocationMode" in value;

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

const shouldUseAgentSubscriptionPlans = (product: OperationsProduct): boolean =>
  product.supplyKind === "agent" &&
  product.saleType === "paid" &&
  product.billingMode === "subscription";

const normalizeAgentProductAcquisition = (product: OperationsProduct): OperationsProduct => {
  if (product.supplyKind !== "agent") {
    return product;
  }

  return {
    ...product,
    supportsTrial: false,
    trialUnit: undefined,
    trialValue: undefined,
  };
};

const normalizeAgentSubscriptionProduct = (
  product: OperationsProduct,
  presetProduct?: OperationsProduct,
): OperationsProduct => {
  const normalizedProduct = normalizeAgentProductAcquisition(product);
  const productWithContact: OperationsProduct = {
    ...normalizedProduct,
    plazaVisibility: "public",
    visibleTenantIds: [],
    visibleTenantNames: [],
    billingScopes: normalizedProduct.billingScopes?.length
      ? [...normalizedProduct.billingScopes]
      : ["points"],
    contactMode: normalizedProduct.contactMode ?? "disabled",
    contactQrCodeValue: normalizedProduct.contactQrCodeValue?.trim() ?? "",
    contactRemark: normalizedProduct.contactRemark?.trim() ?? "",
    tags: normalizedProduct.tags ? [...normalizedProduct.tags] : [],
    storeZones: normalizedProduct.storeZones?.length
      ? [...normalizedProduct.storeZones]
      : normalizedProduct.storeZone
        ? [normalizedProduct.storeZone]
        : [],
    plazaCategoryByZone:
      normalizedProduct.plazaCategoryByZone ??
      (normalizedProduct.storeZone && normalizedProduct.plazaCategory
        ? { [normalizedProduct.storeZone]: normalizedProduct.plazaCategory }
        : {}),
  };

  if (!shouldUseAgentSubscriptionPlans(product)) {
    return productWithContact;
  }

  const presetPlans = presetProduct?.subscriptionPlans?.length
    ? presetProduct.subscriptionPlans
    : createDefaultAgentSubscriptionPlans();
  const productPlans = product.subscriptionPlans?.length ? product.subscriptionPlans : presetPlans;
  const productPlanKeys = new Set(productPlans.map(plan => plan.key));
  const mergedPlans = [
    ...productPlans,
    ...presetPlans.filter(plan => !productPlanKeys.has(plan.key)),
  ].sort((leftItem, rightItem) => leftItem.sortOrder - rightItem.sortOrder);

  return {
    ...productWithContact,
    billingSpec: undefined,
    price: undefined,
    subscriptionPlans: mergedPlans.map(plan => ({ ...plan })),
  };
};

const mergeStoredProductsWithPreset = (
  storedProducts: OperationsProduct[],
): OperationsProduct[] => {
  const storedProductMap = new Map(storedProducts.map(item => [item.id, item]));
  const presetProductIds = new Set(OPERATIONS_INITIAL_PRODUCTS.map(item => item.id));

  return [
    ...OPERATIONS_INITIAL_PRODUCTS.map(presetProduct => {
      const storedProduct = storedProductMap.get(presetProduct.id);

      return normalizeAgentSubscriptionProduct(
        {
          ...presetProduct,
          ...storedProduct,
          subscriptionPlans: storedProduct?.subscriptionPlans?.length
            ? storedProduct.subscriptionPlans
            : presetProduct.subscriptionPlans,
        },
        presetProduct,
      );
    }),
    ...storedProducts
      .filter(item => !presetProductIds.has(item.id))
      .map(item => normalizeAgentSubscriptionProduct(item)),
  ];
};

/**
 * 读取运营后台当前全部 AI 专家上架配置。
 */
export const loadStoredOperationsProducts = (): OperationsProduct[] =>
  mergeStoredProductsWithPreset(
    loadStoredList(OPERATIONS_PRODUCTS_STORAGE_KEY, isValidProduct) ?? [],
  ).map(cloneProduct);

/**
 * 保存运营后台当前全部 AI 专家上架配置。
 */
export const saveStoredOperationsProducts = (products: OperationsProduct[]): void => {
  saveStoredList(
    OPERATIONS_PRODUCTS_STORAGE_KEY,
    products.map(product => cloneProduct(normalizeAgentProductAcquisition(product))),
  );
};

/**
 * 读取运营后台交付实例列表。
 */
export const loadStoredOperationsFulfillments = (): OperationsFulfillment[] =>
  (
    loadStoredList(OPERATIONS_FULFILLMENTS_STORAGE_KEY, isValidFulfillment) ??
    OPERATIONS_INITIAL_FULFILLMENTS
  ).map(cloneFulfillment);

/**
 * 保存运营后台交付实例列表。
 */
export const saveStoredOperationsFulfillments = (fulfillments: OperationsFulfillment[]): void => {
  saveStoredList(OPERATIONS_FULFILLMENTS_STORAGE_KEY, fulfillments.map(cloneFulfillment));
};

/**
 * 读取运营后台资源池列表。
 */
export const loadStoredOperationsResourcePools = (): OperationsResourcePool[] =>
  (
    loadStoredList(OPERATIONS_RESOURCE_POOLS_STORAGE_KEY, isValidResourcePool) ??
    OPERATIONS_INITIAL_RESOURCE_POOLS
  ).map(cloneResourcePool);

/**
 * 保存运营后台资源池列表。
 */
export const saveStoredOperationsResourcePools = (
  resourcePools: OperationsResourcePool[],
): void => {
  saveStoredList(OPERATIONS_RESOURCE_POOLS_STORAGE_KEY, resourcePools.map(cloneResourcePool));
};
