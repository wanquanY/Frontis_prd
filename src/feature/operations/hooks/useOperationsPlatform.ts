import { useCallback, useEffect, useMemo, useState } from "react";

import { getAllMockTenantPointsOrders } from "@/feature/auth/mockTenantRegistry";
import {
  loadStoredAgentPlazaCategories,
  saveStoredAgentPlazaCategories,
} from "@/feature/operations/agentPlazaCategoryStorage";
import {
  loadStoredOperationsFulfillments,
  loadStoredOperationsProducts,
  loadStoredOperationsResourcePools,
  saveStoredOperationsFulfillments,
  saveStoredOperationsProducts,
  saveStoredOperationsResourcePools,
} from "@/feature/operations/commerceStorage";
import {
  OPERATIONS_AGENT_STATUS_LABELS,
  OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
  OPERATIONS_FULFILLMENT_STATUS_LABELS,
  OPERATIONS_INITIAL_AGENT_SUBMISSIONS,
  OPERATIONS_INITIAL_REFERRAL_RECORDS,
  OPERATIONS_INITIAL_TENANTS,
  OPERATIONS_INITIAL_REGISTRATION_STRATEGY,
  OPERATIONS_PRODUCT_BILLING_MODE_LABELS,
  OPERATIONS_PRODUCT_BILLING_MODE_OPTIONS,
  OPERATIONS_PRODUCT_BILLING_SPEC_LABELS,
  OPERATIONS_PRODUCT_BILLING_SPEC_OPTIONS,
  OPERATIONS_PRODUCT_DELIVERY_KIND_LABELS,
  OPERATIONS_PRODUCT_DELIVERY_KIND_OPTIONS,
  OPERATIONS_PRODUCT_METERING_UNIT_LABELS,
  OPERATIONS_PRODUCT_METERING_UNIT_OPTIONS,
  OPERATIONS_PRODUCT_SALE_TYPE_LABELS,
  OPERATIONS_PRODUCT_SALE_TYPE_OPTIONS,
  OPERATIONS_PRODUCT_STATUS_LABELS,
  OPERATIONS_PRODUCT_SUPPLY_KIND_LABELS,
  OPERATIONS_PRODUCT_TRIAL_UNIT_LABELS,
  OPERATIONS_PRODUCT_TRIAL_UNIT_OPTIONS,
  OPERATIONS_RESOURCE_POOL_ALLOCATION_MODE_LABELS,
  OPERATIONS_RESOURCE_POOL_ALLOCATION_MODE_OPTIONS,
  OPERATIONS_RESOURCE_POOL_CAPACITY_UNIT_LABELS,
  OPERATIONS_RESOURCE_POOL_CAPACITY_UNIT_OPTIONS,
  OPERATIONS_RESOURCE_POOL_TYPE_LABELS,
  OPERATIONS_RESOURCE_POOL_TYPE_OPTIONS,
  OPERATIONS_TENANT_STATUS_LABELS,
  createDefaultAgentSubscriptionPlans,
  createEmptyOperationsProductForm,
  createEmptyOperationsTenantMemberForm,
  createEmptyOperationsResourcePoolForm,
  createEmptyOperationsTenantForm,
} from "@/feature/operations/mockData";
import {
  loadOperationsRegistrationStrategy,
  loadOperationsServiceContactConfig,
  saveOperationsRegistrationStrategy,
  saveOperationsServiceContactConfig,
} from "@/feature/operations/platformConfigStorage";
import {
  loadStoredOperationsExternalMeteredServices,
  loadStoredOperationsMeteringProviders,
  loadStoredOperationsModelServices,
  loadStoredOperationsPointsUsageRecords,
  saveStoredOperationsExternalMeteredServices,
  saveStoredOperationsMeteringProviders,
  saveStoredOperationsModelServices,
  saveStoredOperationsPointsUsageRecords,
} from "@/feature/operations/serviceMeteringStorage";
import {
  calculateOperationsSalePrice,
  normalizeOperationsMoney,
} from "@/feature/operations/serviceMeteringUtils";
import {
  loadStoredOperationsTenants,
  saveStoredOperationsTenants,
} from "@/feature/operations/tenantStorage";
import type {
  OperationsAgentPlazaCategoryOption,
  OperationsAgentSubmission,
  OperationsExternalMeteredService,
  OperationsExternalMeteredServiceForm,
  OperationsFulfillment,
  OperationsMeteringProvider,
  OperationsMeteringProviderForm,
  OperationsModelService,
  OperationsModelServiceForm,
  OperationsProduct,
  OperationsProductForm,
  OperationsProductSubscriptionPlan,
  OperationsProductSubscriptionPlanStatus,
  OperationsPointsUsageRecord,
  OperationsReferralRecord,
  OperationsRegistrationStrategy,
  OperationsResourcePool,
  OperationsResourcePoolForm,
  OperationsServiceContactConfig,
  OperationsTenant,
  OperationsTenantForm,
  OperationsTenantMemberForm,
} from "@/feature/operations/types";
import {
  loadEnterpriseCommodityApplications,
  saveEnterpriseCommodityApplications,
} from "@/feature/fde/enterpriseCommodityApplications";
import {
  createMockPointsPackage,
  getMockPointsPackages,
  updateMockPointsPackage,
} from "@/feature/points/mockPointsCommerce";
import type { MockPointsPackageOption } from "@/feature/points/types";
import {
  createMockTenantPlanPackage,
  getMockTenantPlanPackages,
  getMockTenantSeatPricing,
  updateMockTenantPlanPackage,
  updateMockTenantSeatPricing,
} from "@/feature/tenantPlan/mockTenantPlanCommerce";
import type {
  MockTenantPlanPackageOption,
  MockTenantSeatPricing,
} from "@/feature/tenantPlan/types";

interface UseOperationsPlatformResult {
  tenants: OperationsTenant[];
  agentSubmissions: OperationsAgentSubmission[];
  agentPlazaCategories: OperationsAgentPlazaCategoryOption[];
  approvedAgentSubmissions: OperationsAgentSubmission[];
  approvedAgents: OperationsAgentSubmission[];
  products: OperationsProduct[];
  fulfillments: OperationsFulfillment[];
  resourcePools: OperationsResourcePool[];
  registrationStrategy: OperationsRegistrationStrategy;
  serviceContactConfig: OperationsServiceContactConfig;
  referralRecords: OperationsReferralRecord[];
  meteringProviders: OperationsMeteringProvider[];
  modelServices: OperationsModelService[];
  externalMeteredServices: OperationsExternalMeteredService[];
  pointsUsageRecords: OperationsPointsUsageRecord[];
  pointsPackages: MockPointsPackageOption[];
  teamPlanPackages: MockTenantPlanPackageOption[];
  teamSeatPricing: MockTenantSeatPricing;
  pointsOrders: ReturnType<typeof getAllMockTenantPointsOrders>;
  emptyTenantForm: OperationsTenantForm;
  emptyTenantMemberForm: OperationsTenantMemberForm;
  emptyProductForm: OperationsProductForm;
  emptyResourcePoolForm: OperationsResourcePoolForm;
  tenantStatusLabels: typeof OPERATIONS_TENANT_STATUS_LABELS;
  agentStatusLabels: typeof OPERATIONS_AGENT_STATUS_LABELS;
  fulfillmentStatusLabels: typeof OPERATIONS_FULFILLMENT_STATUS_LABELS;
  productStatusLabels: typeof OPERATIONS_PRODUCT_STATUS_LABELS;
  productSupplyKindLabels: typeof OPERATIONS_PRODUCT_SUPPLY_KIND_LABELS;
  productSaleTypeLabels: typeof OPERATIONS_PRODUCT_SALE_TYPE_LABELS;
  productTrialUnitLabels: typeof OPERATIONS_PRODUCT_TRIAL_UNIT_LABELS;
  productDeliveryKindLabels: typeof OPERATIONS_PRODUCT_DELIVERY_KIND_LABELS;
  productBillingModeLabels: typeof OPERATIONS_PRODUCT_BILLING_MODE_LABELS;
  productMeteringUnitLabels: typeof OPERATIONS_PRODUCT_METERING_UNIT_LABELS;
  productBillingSpecLabels: typeof OPERATIONS_PRODUCT_BILLING_SPEC_LABELS;
  resourcePoolTypeLabels: typeof OPERATIONS_RESOURCE_POOL_TYPE_LABELS;
  resourcePoolAllocationModeLabels: typeof OPERATIONS_RESOURCE_POOL_ALLOCATION_MODE_LABELS;
  resourcePoolCapacityUnitLabels: typeof OPERATIONS_RESOURCE_POOL_CAPACITY_UNIT_LABELS;
  productDeliveryKindOptions: typeof OPERATIONS_PRODUCT_DELIVERY_KIND_OPTIONS;
  productSaleTypeOptions: typeof OPERATIONS_PRODUCT_SALE_TYPE_OPTIONS;
  productTrialUnitOptions: typeof OPERATIONS_PRODUCT_TRIAL_UNIT_OPTIONS;
  productBillingModeOptions: typeof OPERATIONS_PRODUCT_BILLING_MODE_OPTIONS;
  productMeteringUnitOptions: typeof OPERATIONS_PRODUCT_METERING_UNIT_OPTIONS;
  productBillingSpecOptions: typeof OPERATIONS_PRODUCT_BILLING_SPEC_OPTIONS;
  resourcePoolTypeOptions: typeof OPERATIONS_RESOURCE_POOL_TYPE_OPTIONS;
  resourcePoolAllocationModeOptions: typeof OPERATIONS_RESOURCE_POOL_ALLOCATION_MODE_OPTIONS;
  resourcePoolCapacityUnitOptions: typeof OPERATIONS_RESOURCE_POOL_CAPACITY_UNIT_OPTIONS;
  createTenant: (form: OperationsTenantForm) => void;
  addTenantMember: (tenantId: string, form: OperationsTenantMemberForm) => void;
  updateTenant: (tenantId: string, form: OperationsTenantForm) => void;
  updateTenantStatus: (tenantId: string, status: OperationsTenant["status"]) => void;
  approveAgent: (submissionId: string) => void;
  rejectAgent: (submissionId: string, reason: string) => void;
  createProduct: (form: OperationsProductForm) => void;
  updateProduct: (productId: string, form: OperationsProductForm) => void;
  updateProductStatus: (productId: string, status: OperationsProduct["status"]) => void;
  updateAgentPlazaSettings: (
    productId: string,
    patch: Pick<
      OperationsProduct,
      | "plazaCategory"
      | "plazaVisibility"
      | "visibleTenantIds"
      | "visibleTenantNames"
      | "plazaStatus"
    >,
  ) => void;
  createAgentPlazaCategory: (
    payload: Pick<OperationsAgentPlazaCategoryOption, "name" | "sortOrder">,
  ) => void;
  updateAgentPlazaCategory: (
    categoryId: string,
    updates: Partial<Pick<OperationsAgentPlazaCategoryOption, "name" | "sortOrder" | "status">>,
  ) => void;
  createResourcePool: (form: OperationsResourcePoolForm) => void;
  updateResourcePool: (resourcePoolId: string, form: OperationsResourcePoolForm) => void;
  updateRegistrationStrategy: (
    patch: Partial<
      Pick<
        OperationsRegistrationStrategy,
        | "defaultGiftPoints"
        | "pointsPerCny"
        | "minimumDeductPoints"
        | "roundingUnit"
        | "referralDailyRewardLimit"
        | "referralEnabled"
        | "referralInviteeRewardPoints"
        | "referralInviterRewardPoints"
        | "referralMonthlyRewardLimit"
      >
    >,
  ) => void;
  updateServiceContactConfig: (
    patch: Partial<
      Pick<
        OperationsServiceContactConfig,
        "enabled" | "contactName" | "qrCodeValue" | "remarkTemplate"
      >
    >,
  ) => void;
  createMeteringProvider: (form: OperationsMeteringProviderForm) => void;
  updateMeteringProvider: (providerId: string, form: OperationsMeteringProviderForm) => void;
  createModelService: (form: OperationsModelServiceForm) => void;
  updateModelService: (modelId: string, form: OperationsModelServiceForm) => void;
  createExternalMeteredService: (form: OperationsExternalMeteredServiceForm) => void;
  updateExternalMeteredService: (
    serviceId: string,
    form: OperationsExternalMeteredServiceForm,
  ) => void;
  updateTeamPlanPackage: (
    packageId: string,
    updates: Partial<
      Pick<
        MockTenantPlanPackageOption,
        "title" | "description" | "includedSeats" | "price" | "status" | "sortOrder" | "tagLabel"
      >
    >,
  ) => void;
  createTeamPlanPackage: (
    payload: Pick<
      MockTenantPlanPackageOption,
      "title" | "description" | "includedSeats" | "price" | "tagLabel"
    >,
  ) => void;
  updateTeamSeatPricing: (
    updates: Partial<Pick<MockTenantSeatPricing, "pricePerSeat" | "billingCycleLabel">>,
  ) => void;
  updatePointsPackage: (
    packageId: string,
    updates: Partial<
      Pick<
        MockPointsPackageOption,
        "title" | "description" | "points" | "price" | "status" | "sortOrder" | "tagLabel"
      >
    >,
  ) => void;
  createPointsPackage: (
    payload: Pick<
      MockPointsPackageOption,
      "title" | "description" | "points" | "price" | "tagLabel"
    >,
  ) => void;
}

const formatTimestamp = (): string => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = `${currentDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${currentDate.getDate()}`.padStart(2, "0");
  const hours = `${currentDate.getHours()}`.padStart(2, "0");
  const minutes = `${currentDate.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const buildTenantMemberId = (): string => `ops-tenant-member-${Date.now()}`;
const buildProductId = (): string => `ops-product-${Date.now()}`;
const buildResourcePoolId = (): string => `ops-resource-pool-${Date.now()}`;
const buildAgentPlazaCategoryId = (): string => `ops-agent-plaza-category-${Date.now()}`;
const buildMeteringProviderId = (): string => `ops-metering-provider-${Date.now()}`;
const buildModelServiceId = (): string => `ops-model-service-${Date.now()}`;
const buildExternalMeteredServiceId = (): string => `ops-external-service-${Date.now()}`;

const resolveTenantEditionBySeatCount = (seatCount: number): OperationsTenant["edition"] =>
  seatCount <= 1 ? "personal" : "team";

const resolveMeteringProviderName = (
  providers: OperationsMeteringProvider[],
  providerId: string,
): string => providers.find(item => item.id === providerId)?.name ?? "";

const buildMeteringProviderFromForm = (
  form: OperationsMeteringProviderForm,
): OperationsMeteringProvider => ({
  id: buildMeteringProviderId(),
  name: form.name.trim(),
  providerKind: form.providerKind,
  baseUrl: form.baseUrl.trim(),
  billingCurrency: form.billingCurrency.trim() || "CNY",
  credentialStatusLabel: form.credentialStatusLabel.trim() || "未配置",
  status: form.status,
  updatedAt: formatTimestamp(),
});

const buildModelServiceFromForm = (
  form: OperationsModelServiceForm,
  providers: OperationsMeteringProvider[],
): OperationsModelService => ({
  id: buildModelServiceId(),
  providerId: form.providerId,
  providerName: resolveMeteringProviderName(providers, form.providerId),
  modelCode: form.modelCode.trim(),
  modelName: form.modelName.trim(),
  interfaceFormat: form.interfaceFormat,
  modality: form.modality,
  reasoningEnabled: form.reasoningEnabled,
  inputCostPerMillion: normalizeOperationsMoney(form.inputCostPerMillion),
  outputCostPerMillion: normalizeOperationsMoney(form.outputCostPerMillion),
  pricingMode: form.pricingMode,
  markupRate: form.markupRate,
  grossMarginRate: form.grossMarginRate,
  inputSalePricePerMillion: calculateOperationsSalePrice(
    form.inputCostPerMillion,
    form.pricingMode,
    form.markupRate,
    form.grossMarginRate,
    form.inputSalePricePerMillion,
  ),
  outputSalePricePerMillion: calculateOperationsSalePrice(
    form.outputCostPerMillion,
    form.pricingMode,
    form.markupRate,
    form.grossMarginRate,
    form.outputSalePricePerMillion,
  ),
  status: form.status,
  updatedAt: formatTimestamp(),
});

const buildExternalMeteredServiceFromForm = (
  form: OperationsExternalMeteredServiceForm,
  providers: OperationsMeteringProvider[],
): OperationsExternalMeteredService => ({
  id: buildExternalMeteredServiceId(),
  providerId: form.providerId,
  providerName: resolveMeteringProviderName(providers, form.providerId),
  name: form.name.trim(),
  serviceTypeLabel: form.serviceTypeLabel.trim() || "第三方 API",
  meteringUnit: form.meteringUnit,
  costPerUnit: normalizeOperationsMoney(form.costPerUnit),
  pricingMode: form.pricingMode,
  markupRate: form.markupRate,
  grossMarginRate: form.grossMarginRate,
  salePricePerUnit: calculateOperationsSalePrice(
    form.costPerUnit,
    form.pricingMode,
    form.markupRate,
    form.grossMarginRate,
    form.salePricePerUnit,
  ),
  status: form.status,
  updatedAt: formatTimestamp(),
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

const buildAdminTenantMember = (adminName: string, adminPhone: string, addedAt: string) => ({
  id: buildTenantMemberId(),
  name: adminName.trim(),
  phone: adminPhone.trim(),
  roleLabel: "管理员",
  addedAt,
});

const syncAdminTenantMember = (
  members: OperationsTenant["members"],
  adminName: string,
  adminPhone: string,
  fallbackAddedAt: string,
): OperationsTenant["members"] => {
  const adminMemberIndex = members.findIndex(item => item.roleLabel === "管理员");

  if (adminMemberIndex < 0) {
    return [buildAdminTenantMember(adminName, adminPhone, fallbackAddedAt), ...members];
  }

  return members.map((item, index) =>
    index === adminMemberIndex
      ? {
          ...item,
          name: adminName.trim(),
          phone: adminPhone.trim(),
        }
      : item,
  );
};

const resolveTenantModuleLabels = (hasOperationsConsoleAccess: boolean): string[] => [
  "FrontisAI工作台",
  "企业管理后台",
  ...(hasOperationsConsoleAccess ? ["租户运营后台"] : []),
];

const buildTenantFromForm = (form: OperationsTenantForm): OperationsTenant => {
  const createdAt = formatTimestamp();

  return {
    id: `ops-tenant-${Date.now()}`,
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    type: "enterprise",
    deploymentMode: form.deploymentMode,
    edition: resolveTenantEditionBySeatCount(form.seatCount),
    industry: form.industry.trim(),
    adminName: form.adminName.trim(),
    adminPhone: form.adminPhone.trim(),
    hasAgentListingAccess: form.hasAgentListingAccess,
    hasOperationsConsoleAccess: form.hasOperationsConsoleAccess,
    seatCount: form.seatCount,
    effectiveAt: form.effectiveAt.trim(),
    expiresAt: form.expiresAt.trim(),
    moduleLabels: resolveTenantModuleLabels(form.hasOperationsConsoleAccess),
    members: [buildAdminTenantMember(form.adminName, form.adminPhone, createdAt)],
    status: "pending",
    createdAt,
    updatedAt: createdAt,
  };
};

const getResourcePoolNameById = (
  resourcePools: OperationsResourcePool[],
  resourcePoolId?: string,
): string | undefined =>
  resourcePoolId ? resourcePools.find(item => item.id === resourcePoolId)?.name : undefined;

const cloneSubscriptionPlan = (
  plan: OperationsProductSubscriptionPlan,
): OperationsProductSubscriptionPlan => ({
  ...plan,
});

const normalizeSubscriptionPlans = (
  plans: OperationsProductSubscriptionPlan[],
): OperationsProductSubscriptionPlan[] =>
  plans
    .map(item => {
      const status: OperationsProductSubscriptionPlanStatus =
        item.status === "inactive" ? "inactive" : "active";

      return {
        ...cloneSubscriptionPlan(item),
        price: Math.max(0, Number(item.price) || 0),
        originalPrice:
          typeof item.originalPrice === "number" && item.originalPrice > 0
            ? item.originalPrice
            : undefined,
        status,
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
      };
    })
    .sort((leftItem, rightItem) => leftItem.sortOrder - rightItem.sortOrder);

const mergeStoredTenantsWithPreset = (
  presetTenants: OperationsTenant[],
  storedTenants: OperationsTenant[] | null,
): OperationsTenant[] => {
  if (!storedTenants) {
    return presetTenants;
  }

  const storedTenantMap = new Map(storedTenants.map(tenant => [tenant.id, tenant]));
  const presetTenantIds = new Set(presetTenants.map(tenant => tenant.id));

  return [
    ...presetTenants.map(tenant => storedTenantMap.get(tenant.id) ?? tenant),
    ...storedTenants.filter(tenant => !presetTenantIds.has(tenant.id)),
  ];
};

const shouldUseSubscriptionPlans = (form: OperationsProductForm): boolean =>
  form.saleType === "paid" && form.billingMode === "subscription" && form.supplyKind === "agent";

const buildPendingProductFromSubmission = (
  submission: OperationsAgentSubmission,
): OperationsProduct => ({
  id: buildProductId(),
  name: submission.proposedProductName?.trim() || `${submission.name} 标准版`,
  supplyKind: "agent",
  deliveryKind: "softwareService",
  saleType: "free",
  billingMode: "subscription",
  meteringUnit: "duration",
  linkedAgentId: submission.id,
  linkedAgentName: submission.name,
  description: "该 AI专家 已通过商品化审核，请完善获取方式和试用规则后再上架。",
  subscriptionPlans: createDefaultAgentSubscriptionPlans(),
  supportsTrial: false,
  trialUnit: "day",
  trialValue: 7,
  contactMode: "disabled",
  contactQrCodeValue: "",
  contactRemark: "",
  status: "pendingProductization",
  plazaCategory: OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
  plazaVisibility: "public",
  visibleTenantIds: [],
  visibleTenantNames: [],
  plazaStatus: submission.plazaStatus ?? "offline",
  plazaSort: 0,
  billingScopes: ["points"],
  updatedAt: formatTimestamp(),
});

const buildProductFromForm = (
  form: OperationsProductForm,
  approvedSubmissions: OperationsAgentSubmission[],
  resourcePools: OperationsResourcePool[],
): OperationsProduct => {
  const linkedSubmission =
    form.supplyKind === "agent" && form.linkedAgentId
      ? approvedSubmissions.find(item => item.id === form.linkedAgentId)
      : undefined;
  const nextResourcePoolId =
    form.deliveryKind === "softwareService" ? undefined : form.resourcePoolId;
  const useSubscriptionPlans = shouldUseSubscriptionPlans(form);

  return {
    id: buildProductId(),
    name: form.name.trim(),
    supplyKind: form.supplyKind,
    deliveryKind: form.deliveryKind,
    saleType: form.saleType,
    billingMode: form.billingMode,
    meteringUnit: form.meteringUnit,
    billingSpec: useSubscriptionPlans ? undefined : form.billingSpec,
    linkedAgentId: linkedSubmission?.id,
    linkedAgentName: linkedSubmission?.name,
    resourcePoolId: nextResourcePoolId,
    resourcePoolName: getResourcePoolNameById(resourcePools, nextResourcePoolId),
    description: form.description.trim(),
    price: form.saleType === "free" ? 0 : useSubscriptionPlans ? undefined : form.price,
    subscriptionPlans: useSubscriptionPlans
      ? normalizeSubscriptionPlans(form.subscriptionPlans)
      : undefined,
    supportsTrial: form.supportsTrial,
    trialUnit: form.supportsTrial ? form.trialUnit : undefined,
    trialValue: form.supportsTrial ? form.trialValue : undefined,
    contactMode: "disabled",
    contactQrCodeValue: undefined,
    contactRemark: undefined,
    status: form.plazaStatus === "online" ? "active" : "draft",
    plazaCategory: form.plazaCategory,
    plazaVisibility: form.plazaVisibility,
    visibleTenantIds: form.plazaVisibility === "tenant" ? form.visibleTenantIds : [],
    visibleTenantNames: form.plazaVisibility === "tenant" ? form.visibleTenantNames : [],
    plazaStatus: form.plazaStatus,
    plazaSort: 0,
    billingScopes: form.billingScopes,
    updatedAt: formatTimestamp(),
  };
};

const buildResourcePoolFromForm = (form: OperationsResourcePoolForm): OperationsResourcePool => ({
  id: buildResourcePoolId(),
  name: form.name.trim(),
  resourceType: form.resourceType,
  provider: form.provider.trim(),
  allocationMode: form.allocationMode,
  totalCapacity: form.totalCapacity,
  availableCapacity: form.availableCapacity,
  capacityUnit: form.capacityUnit,
  updatedAt: formatTimestamp(),
});

const normalizeSubmissionSubmitter = (submitter: string): string =>
  submitter.split(" - ")[0].trim();

const normalizeAgentSubmission = (
  submission: OperationsAgentSubmission,
): OperationsAgentSubmission => ({
  ...submission,
  submitter: normalizeSubmissionSubmitter(submission.submitter),
});

const buildInitialAgentSubmissions = (): OperationsAgentSubmission[] => {
  const submissionMap = new Map<string, OperationsAgentSubmission>();

  OPERATIONS_INITIAL_AGENT_SUBMISSIONS.forEach(item => {
    submissionMap.set(item.id, normalizeAgentSubmission(item));
  });

  loadEnterpriseCommodityApplications().forEach(item => {
    const currentItem = submissionMap.get(item.id);
    submissionMap.set(
      item.id,
      normalizeAgentSubmission(currentItem ? { ...currentItem, ...item } : item),
    );
  });

  return Array.from(submissionMap.values()).sort((leftItem, rightItem) =>
    rightItem.submittedAt.localeCompare(leftItem.submittedAt),
  );
};

/**
 * 提供运营后台所需的本地 mock 状态与交互动作。
 */
export const useOperationsPlatform = (): UseOperationsPlatformResult => {
  const [tenants, setTenants] = useState<OperationsTenant[]>(() =>
    mergeStoredTenantsWithPreset(OPERATIONS_INITIAL_TENANTS, loadStoredOperationsTenants()),
  );
  const [agentSubmissions, setAgentSubmissions] = useState<OperationsAgentSubmission[]>(
    buildInitialAgentSubmissions,
  );
  const [agentPlazaCategories, setAgentPlazaCategories] = useState<
    OperationsAgentPlazaCategoryOption[]
  >(() => loadStoredAgentPlazaCategories());
  const [products, setProducts] = useState<OperationsProduct[]>(() =>
    loadStoredOperationsProducts(),
  );
  const [fulfillments, setFulfillments] = useState<OperationsFulfillment[]>(() =>
    loadStoredOperationsFulfillments(),
  );
  const [resourcePools, setResourcePools] = useState<OperationsResourcePool[]>(() =>
    loadStoredOperationsResourcePools(),
  );
  const [registrationStrategy, setRegistrationStrategy] = useState<OperationsRegistrationStrategy>(
    () => loadOperationsRegistrationStrategy() ?? OPERATIONS_INITIAL_REGISTRATION_STRATEGY,
  );
  const [serviceContactConfig, setServiceContactConfig] = useState<OperationsServiceContactConfig>(
    () => loadOperationsServiceContactConfig(),
  );
  const [meteringProviders, setMeteringProviders] = useState<OperationsMeteringProvider[]>(() =>
    loadStoredOperationsMeteringProviders(),
  );
  const [modelServices, setModelServices] = useState<OperationsModelService[]>(() =>
    loadStoredOperationsModelServices(),
  );
  const [externalMeteredServices, setExternalMeteredServices] = useState<
    OperationsExternalMeteredService[]
  >(() => loadStoredOperationsExternalMeteredServices());
  const [pointsUsageRecords] = useState<OperationsPointsUsageRecord[]>(() =>
    loadStoredOperationsPointsUsageRecords(),
  );
  const [referralRecords] = useState<OperationsReferralRecord[]>(() =>
    OPERATIONS_INITIAL_REFERRAL_RECORDS.map(item => ({ ...item })),
  );
  const [pointsPackages, setPointsPackages] = useState<MockPointsPackageOption[]>(() =>
    getMockPointsPackages(),
  );
  const [teamPlanPackages, setTeamPlanPackages] = useState<MockTenantPlanPackageOption[]>(() =>
    getMockTenantPlanPackages(),
  );
  const [teamSeatPricing, setTeamSeatPricing] = useState<MockTenantSeatPricing>(() =>
    getMockTenantSeatPricing(),
  );

  useEffect(() => {
    saveStoredOperationsTenants(tenants);
  }, [tenants]);

  useEffect(() => {
    saveEnterpriseCommodityApplications(agentSubmissions);
  }, [agentSubmissions]);

  useEffect(() => {
    saveStoredAgentPlazaCategories(agentPlazaCategories);
  }, [agentPlazaCategories]);

  useEffect(() => {
    saveStoredOperationsProducts(products);
  }, [products]);

  useEffect(() => {
    saveStoredOperationsFulfillments(fulfillments);
  }, [fulfillments]);

  useEffect(() => {
    saveStoredOperationsResourcePools(resourcePools);
  }, [resourcePools]);

  useEffect(() => {
    saveOperationsRegistrationStrategy(registrationStrategy);
  }, [registrationStrategy]);

  useEffect(() => {
    saveOperationsServiceContactConfig(serviceContactConfig);
  }, [serviceContactConfig]);

  useEffect(() => {
    saveStoredOperationsMeteringProviders(meteringProviders);
  }, [meteringProviders]);

  useEffect(() => {
    saveStoredOperationsModelServices(modelServices);
  }, [modelServices]);

  useEffect(() => {
    saveStoredOperationsExternalMeteredServices(externalMeteredServices);
  }, [externalMeteredServices]);

  useEffect(() => {
    saveStoredOperationsPointsUsageRecords(pointsUsageRecords);
  }, [pointsUsageRecords]);

  const approvedAgentSubmissions = useMemo<OperationsAgentSubmission[]>(
    () => agentSubmissions.filter(item => item.status === "approved"),
    [agentSubmissions],
  );
  const pointsOrders = getAllMockTenantPointsOrders();

  const createTenant = useCallback((form: OperationsTenantForm): void => {
    setTenants(currentTenants => [buildTenantFromForm(form), ...currentTenants]);
  }, []);

  const addTenantMember = useCallback(
    (tenantId: string, form: OperationsTenantMemberForm): void => {
      const nextTimestamp = formatTimestamp();

      setTenants(currentTenants =>
        currentTenants.map(item =>
          item.id === tenantId
            ? {
                ...item,
                members: [
                  ...item.members,
                  {
                    id: buildTenantMemberId(),
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    roleLabel: "成员",
                    addedAt: nextTimestamp,
                  },
                ],
                updatedAt: nextTimestamp,
              }
            : item,
        ),
      );
    },
    [],
  );

  const updateTenant = useCallback((tenantId: string, form: OperationsTenantForm): void => {
    setTenants(currentTenants =>
      currentTenants.map(item =>
        item.id === tenantId
          ? {
              ...item,
              name: form.name.trim(),
              code: form.code.trim().toUpperCase(),
              deploymentMode: form.deploymentMode,
              edition: resolveTenantEditionBySeatCount(form.seatCount),
              industry: form.industry.trim(),
              adminName: form.adminName.trim(),
              adminPhone: form.adminPhone.trim(),
              hasAgentListingAccess: form.hasAgentListingAccess,
              hasOperationsConsoleAccess: form.hasOperationsConsoleAccess,
              seatCount: form.seatCount,
              effectiveAt: form.effectiveAt.trim(),
              expiresAt: form.expiresAt.trim(),
              moduleLabels: resolveTenantModuleLabels(form.hasOperationsConsoleAccess),
              members: syncAdminTenantMember(
                item.members,
                form.adminName,
                form.adminPhone,
                item.createdAt,
              ),
              updatedAt: formatTimestamp(),
            }
          : item,
      ),
    );
  }, []);

  const updateTenantStatus = useCallback(
    (tenantId: string, status: OperationsTenant["status"]): void => {
      setTenants(currentTenants =>
        currentTenants.map(item =>
          item.id === tenantId
            ? {
                ...item,
                status,
                updatedAt: formatTimestamp(),
              }
            : item,
        ),
      );
    },
    [],
  );

  const approveAgent = useCallback(
    (submissionId: string): void => {
      const reviewedAt = formatTimestamp();
      const approvedSubmission = agentSubmissions.find(item => item.id === submissionId) ?? null;

      setAgentSubmissions(currentSubmissions =>
        currentSubmissions.map(item =>
          item.id === submissionId
            ? {
                ...item,
                status: "approved",
                rejectReason: undefined,
                lastReviewedAt: reviewedAt,
                plazaCategory: item.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
                plazaVisibility: item.plazaVisibility ?? "public",
                visibleTenantIds: item.visibleTenantIds ?? [],
                visibleTenantNames: item.visibleTenantNames ?? [],
                plazaStatus: item.plazaStatus ?? "offline",
                plazaUpdatedAt: item.plazaUpdatedAt ?? reviewedAt,
              }
            : item,
        ),
      );

      if (!approvedSubmission) {
        return;
      }

      setProducts(currentProducts => {
        if (currentProducts.some(item => item.linkedAgentId === submissionId)) {
          return currentProducts;
        }

        return [buildPendingProductFromSubmission(approvedSubmission), ...currentProducts];
      });
    },
    [agentSubmissions],
  );

  const rejectAgent = useCallback((submissionId: string, reason: string): void => {
    const reviewedAt = formatTimestamp();

    setAgentSubmissions(currentSubmissions =>
      currentSubmissions.map(item =>
        item.id === submissionId
          ? {
              ...item,
              status: "rejected",
              rejectReason: reason.trim(),
              lastReviewedAt: reviewedAt,
            }
          : item,
      ),
    );
  }, []);

  const createProduct = useCallback(
    (form: OperationsProductForm): void => {
      setProducts(currentProducts => [
        buildProductFromForm(form, approvedAgentSubmissions, resourcePools),
        ...currentProducts,
      ]);
    },
    [approvedAgentSubmissions, resourcePools],
  );

  const updateProduct = useCallback(
    (productId: string, form: OperationsProductForm): void => {
      setProducts(currentProducts =>
        currentProducts.map(item => {
          if (item.id !== productId) {
            return item;
          }

          const linkedSubmission =
            form.supplyKind === "agent" && form.linkedAgentId
              ? approvedAgentSubmissions.find(agent => agent.id === form.linkedAgentId)
              : undefined;
          const nextResourcePoolId =
            form.deliveryKind === "softwareService" ? undefined : form.resourcePoolId;
          const useSubscriptionPlans = shouldUseSubscriptionPlans(form);

          return {
            ...item,
            name: form.name.trim(),
            supplyKind: form.supplyKind,
            deliveryKind: form.deliveryKind,
            saleType: form.saleType,
            billingMode: form.billingMode,
            meteringUnit: form.meteringUnit,
            billingSpec: useSubscriptionPlans ? undefined : form.billingSpec,
            linkedAgentId: linkedSubmission?.id,
            linkedAgentName: linkedSubmission?.name,
            resourcePoolId: nextResourcePoolId,
            resourcePoolName: getResourcePoolNameById(resourcePools, nextResourcePoolId),
            description: form.description.trim(),
            price: form.saleType === "free" ? 0 : useSubscriptionPlans ? undefined : form.price,
            subscriptionPlans: useSubscriptionPlans
              ? normalizeSubscriptionPlans(form.subscriptionPlans)
              : undefined,
            supportsTrial: form.supportsTrial,
            trialUnit: form.supportsTrial ? form.trialUnit : undefined,
            trialValue: form.supportsTrial ? form.trialValue : undefined,
            contactMode: "disabled",
            contactQrCodeValue: undefined,
            contactRemark: undefined,
            status: form.plazaStatus === "online" ? "active" : "inactive",
            plazaCategory: form.plazaCategory,
            plazaVisibility: form.plazaVisibility,
            visibleTenantIds: form.plazaVisibility === "tenant" ? form.visibleTenantIds : [],
            visibleTenantNames: form.plazaVisibility === "tenant" ? form.visibleTenantNames : [],
            plazaStatus: form.plazaStatus,
            billingScopes: form.billingScopes,
            updatedAt: formatTimestamp(),
          };
        }),
      );
    },
    [approvedAgentSubmissions, resourcePools],
  );

  const updateProductStatus = useCallback(
    (productId: string, status: OperationsProduct["status"]): void => {
      setProducts(currentProducts =>
        currentProducts.map(item =>
          item.id === productId
            ? {
                ...item,
                status,
                plazaStatus: status === "active" ? "online" : "offline",
                updatedAt: formatTimestamp(),
              }
            : item,
        ),
      );
    },
    [],
  );

  const updateAgentPlazaSettings = useCallback(
    (
      productId: string,
      patch: Pick<
        OperationsProduct,
        | "plazaCategory"
        | "plazaVisibility"
        | "visibleTenantIds"
        | "visibleTenantNames"
        | "plazaStatus"
      >,
    ): void => {
      setProducts(currentProducts =>
        currentProducts.map(item =>
          item.id === productId
            ? {
                ...item,
                ...patch,
                updatedAt: formatTimestamp(),
              }
            : item,
        ),
      );
    },
    [],
  );

  const createAgentPlazaCategory = useCallback(
    (payload: Pick<OperationsAgentPlazaCategoryOption, "name" | "sortOrder">): void => {
      const updatedAt = formatTimestamp();

      setAgentPlazaCategories(currentCategories =>
        sortAgentPlazaCategories([
          ...currentCategories,
          {
            id: buildAgentPlazaCategoryId(),
            name: payload.name.trim(),
            sortOrder: payload.sortOrder,
            status: "active",
            updatedAt,
          },
        ]),
      );
    },
    [],
  );

  const updateAgentPlazaCategory = useCallback(
    (
      categoryId: string,
      updates: Partial<Pick<OperationsAgentPlazaCategoryOption, "name" | "sortOrder" | "status">>,
    ): void => {
      const currentCategory = agentPlazaCategories.find(item => item.id === categoryId) ?? null;

      if (!currentCategory) {
        return;
      }

      const updatedAt = formatTimestamp();
      const nextName = updates.name?.trim() || currentCategory.name;
      const hasRenamed = nextName !== currentCategory.name;

      setAgentPlazaCategories(currentCategories =>
        sortAgentPlazaCategories(
          currentCategories.map(item =>
            item.id === categoryId
              ? {
                  ...item,
                  ...updates,
                  name: nextName,
                  sortOrder:
                    typeof updates.sortOrder === "number" ? updates.sortOrder : item.sortOrder,
                  status: updates.status ?? item.status,
                  updatedAt,
                }
              : item,
          ),
        ),
      );

      if (!hasRenamed) {
        return;
      }

      setProducts(currentProducts =>
        currentProducts.map(item =>
          item.plazaCategory === currentCategory.name
            ? {
                ...item,
                plazaCategory: nextName,
                updatedAt,
              }
            : item,
        ),
      );

      setAgentSubmissions(currentSubmissions =>
        currentSubmissions.map(item =>
          item.plazaCategory === currentCategory.name
            ? {
                ...item,
                plazaCategory: nextName,
                plazaUpdatedAt: updatedAt,
              }
            : item,
        ),
      );
    },
    [agentPlazaCategories],
  );

  const createResourcePool = useCallback((form: OperationsResourcePoolForm): void => {
    setResourcePools(currentPools => [buildResourcePoolFromForm(form), ...currentPools]);
  }, []);

  const updateResourcePool = useCallback(
    (resourcePoolId: string, form: OperationsResourcePoolForm): void => {
      const nextUpdatedAt = formatTimestamp();
      const nextPoolName = form.name.trim();

      setResourcePools(currentPools =>
        currentPools.map(item =>
          item.id === resourcePoolId
            ? {
                ...item,
                name: nextPoolName,
                resourceType: form.resourceType,
                provider: form.provider.trim(),
                allocationMode: form.allocationMode,
                totalCapacity: form.totalCapacity,
                availableCapacity: form.availableCapacity,
                capacityUnit: form.capacityUnit,
                updatedAt: nextUpdatedAt,
              }
            : item,
        ),
      );

      setProducts(currentProducts =>
        currentProducts.map(item =>
          item.resourcePoolId === resourcePoolId
            ? {
                ...item,
                resourcePoolName: nextPoolName,
                updatedAt: nextUpdatedAt,
              }
            : item,
        ),
      );

      setFulfillments(currentFulfillments =>
        currentFulfillments.map(item =>
          item.resourcePoolId === resourcePoolId
            ? {
                ...item,
                resourcePoolName: nextPoolName,
                updatedAt: nextUpdatedAt,
              }
            : item,
        ),
      );
    },
    [],
  );

  const updateRegistrationStrategy = useCallback(
    (
      patch: Partial<
        Pick<
          OperationsRegistrationStrategy,
          | "defaultGiftPoints"
          | "pointsPerCny"
          | "minimumDeductPoints"
          | "roundingUnit"
          | "referralDailyRewardLimit"
          | "referralEnabled"
          | "referralInviteeRewardPoints"
          | "referralInviterRewardPoints"
          | "referralMonthlyRewardLimit"
        >
      >,
    ): void => {
      setRegistrationStrategy(currentState => ({
        ...currentState,
        ...patch,
        updatedAt: formatTimestamp(),
      }));
    },
    [],
  );

  const updateServiceContactConfig = useCallback(
    (
      patch: Partial<
        Pick<
          OperationsServiceContactConfig,
          "enabled" | "contactName" | "qrCodeValue" | "remarkTemplate"
        >
      >,
    ): void => {
      setServiceContactConfig(currentState => ({
        ...currentState,
        ...patch,
        contactName: patch.contactName?.trim() ?? currentState.contactName,
        qrCodeValue: patch.qrCodeValue?.trim() ?? currentState.qrCodeValue,
        remarkTemplate: patch.remarkTemplate?.trim() ?? currentState.remarkTemplate,
        updatedAt: formatTimestamp(),
      }));
    },
    [],
  );

  const createMeteringProvider = useCallback((form: OperationsMeteringProviderForm): void => {
    setMeteringProviders(currentProviders => [
      buildMeteringProviderFromForm(form),
      ...currentProviders,
    ]);
  }, []);

  const updateMeteringProvider = useCallback(
    (providerId: string, form: OperationsMeteringProviderForm): void => {
      const nextProviderName = form.name.trim();
      const nextUpdatedAt = formatTimestamp();

      setMeteringProviders(currentProviders =>
        currentProviders.map(item =>
          item.id === providerId
            ? {
                ...item,
                name: nextProviderName,
                providerKind: form.providerKind,
                baseUrl: form.baseUrl.trim(),
                billingCurrency: form.billingCurrency.trim() || "CNY",
                credentialStatusLabel: form.credentialStatusLabel.trim() || "未配置",
                status: form.status,
                updatedAt: nextUpdatedAt,
              }
            : item,
        ),
      );

      setModelServices(currentModels =>
        currentModels.map(item =>
          item.providerId === providerId
            ? {
                ...item,
                providerName: nextProviderName,
                updatedAt: nextUpdatedAt,
              }
            : item,
        ),
      );

      setExternalMeteredServices(currentServices =>
        currentServices.map(item =>
          item.providerId === providerId
            ? {
                ...item,
                providerName: nextProviderName,
                updatedAt: nextUpdatedAt,
              }
            : item,
        ),
      );
    },
    [],
  );

  const createModelService = useCallback(
    (form: OperationsModelServiceForm): void => {
      setModelServices(currentModels => [
        buildModelServiceFromForm(form, meteringProviders),
        ...currentModels,
      ]);
    },
    [meteringProviders],
  );

  const updateModelService = useCallback(
    (modelId: string, form: OperationsModelServiceForm): void => {
      setModelServices(currentModels =>
        currentModels.map(item =>
          item.id === modelId
            ? {
                ...buildModelServiceFromForm(form, meteringProviders),
                id: item.id,
              }
            : item,
        ),
      );
    },
    [meteringProviders],
  );

  const createExternalMeteredService = useCallback(
    (form: OperationsExternalMeteredServiceForm): void => {
      setExternalMeteredServices(currentServices => [
        buildExternalMeteredServiceFromForm(form, meteringProviders),
        ...currentServices,
      ]);
    },
    [meteringProviders],
  );

  const updateExternalMeteredService = useCallback(
    (serviceId: string, form: OperationsExternalMeteredServiceForm): void => {
      setExternalMeteredServices(currentServices =>
        currentServices.map(item =>
          item.id === serviceId
            ? {
                ...buildExternalMeteredServiceFromForm(form, meteringProviders),
                id: item.id,
              }
            : item,
        ),
      );
    },
    [meteringProviders],
  );

  const handleUpdatePointsPackage = useCallback(
    (
      packageId: string,
      updates: Partial<
        Pick<
          MockPointsPackageOption,
          "title" | "description" | "points" | "price" | "status" | "sortOrder" | "tagLabel"
        >
      >,
    ): void => {
      setPointsPackages(updateMockPointsPackage(packageId, updates));
    },
    [],
  );

  const handleCreatePointsPackage = useCallback(
    (
      payload: Pick<
        MockPointsPackageOption,
        "title" | "description" | "points" | "price" | "tagLabel"
      >,
    ): void => {
      setPointsPackages(createMockPointsPackage(payload));
    },
    [],
  );

  const handleUpdateTeamPlanPackage = useCallback(
    (
      packageId: string,
      updates: Partial<
        Pick<
          MockTenantPlanPackageOption,
          "title" | "description" | "includedSeats" | "price" | "status" | "sortOrder" | "tagLabel"
        >
      >,
    ): void => {
      setTeamPlanPackages(updateMockTenantPlanPackage(packageId, updates));
    },
    [],
  );

  const handleCreateTeamPlanPackage = useCallback(
    (
      payload: Pick<
        MockTenantPlanPackageOption,
        "title" | "description" | "includedSeats" | "price" | "tagLabel"
      >,
    ): void => {
      setTeamPlanPackages(createMockTenantPlanPackage(payload));
    },
    [],
  );

  const handleUpdateTeamSeatPricing = useCallback(
    (updates: Partial<Pick<MockTenantSeatPricing, "pricePerSeat" | "billingCycleLabel">>): void => {
      setTeamSeatPricing(updateMockTenantSeatPricing(updates));
    },
    [],
  );

  return {
    tenants,
    agentSubmissions,
    agentPlazaCategories,
    approvedAgentSubmissions,
    approvedAgents: approvedAgentSubmissions,
    products,
    fulfillments,
    resourcePools,
    registrationStrategy,
    serviceContactConfig,
    referralRecords,
    meteringProviders,
    modelServices,
    externalMeteredServices,
    pointsUsageRecords,
    pointsPackages,
    teamPlanPackages,
    teamSeatPricing,
    pointsOrders,
    emptyTenantForm: createEmptyOperationsTenantForm(),
    emptyTenantMemberForm: createEmptyOperationsTenantMemberForm(),
    emptyProductForm: createEmptyOperationsProductForm(),
    emptyResourcePoolForm: createEmptyOperationsResourcePoolForm(),
    tenantStatusLabels: OPERATIONS_TENANT_STATUS_LABELS,
    agentStatusLabels: OPERATIONS_AGENT_STATUS_LABELS,
    fulfillmentStatusLabels: OPERATIONS_FULFILLMENT_STATUS_LABELS,
    productStatusLabels: OPERATIONS_PRODUCT_STATUS_LABELS,
    productSupplyKindLabels: OPERATIONS_PRODUCT_SUPPLY_KIND_LABELS,
    productSaleTypeLabels: OPERATIONS_PRODUCT_SALE_TYPE_LABELS,
    productTrialUnitLabels: OPERATIONS_PRODUCT_TRIAL_UNIT_LABELS,
    productDeliveryKindLabels: OPERATIONS_PRODUCT_DELIVERY_KIND_LABELS,
    productBillingModeLabels: OPERATIONS_PRODUCT_BILLING_MODE_LABELS,
    productMeteringUnitLabels: OPERATIONS_PRODUCT_METERING_UNIT_LABELS,
    productBillingSpecLabels: OPERATIONS_PRODUCT_BILLING_SPEC_LABELS,
    resourcePoolTypeLabels: OPERATIONS_RESOURCE_POOL_TYPE_LABELS,
    resourcePoolAllocationModeLabels: OPERATIONS_RESOURCE_POOL_ALLOCATION_MODE_LABELS,
    resourcePoolCapacityUnitLabels: OPERATIONS_RESOURCE_POOL_CAPACITY_UNIT_LABELS,
    productDeliveryKindOptions: OPERATIONS_PRODUCT_DELIVERY_KIND_OPTIONS,
    productSaleTypeOptions: OPERATIONS_PRODUCT_SALE_TYPE_OPTIONS,
    productTrialUnitOptions: OPERATIONS_PRODUCT_TRIAL_UNIT_OPTIONS,
    productBillingModeOptions: OPERATIONS_PRODUCT_BILLING_MODE_OPTIONS,
    productMeteringUnitOptions: OPERATIONS_PRODUCT_METERING_UNIT_OPTIONS,
    productBillingSpecOptions: OPERATIONS_PRODUCT_BILLING_SPEC_OPTIONS,
    resourcePoolTypeOptions: OPERATIONS_RESOURCE_POOL_TYPE_OPTIONS,
    resourcePoolAllocationModeOptions: OPERATIONS_RESOURCE_POOL_ALLOCATION_MODE_OPTIONS,
    resourcePoolCapacityUnitOptions: OPERATIONS_RESOURCE_POOL_CAPACITY_UNIT_OPTIONS,
    createTenant,
    addTenantMember,
    updateTenant,
    updateTenantStatus,
    approveAgent,
    rejectAgent,
    createProduct,
    updateProduct,
    updateProductStatus,
    updateAgentPlazaSettings,
    createAgentPlazaCategory,
    updateAgentPlazaCategory,
    createResourcePool,
    updateResourcePool,
    updateRegistrationStrategy,
    updateServiceContactConfig,
    createMeteringProvider,
    updateMeteringProvider,
    createModelService,
    updateModelService,
    createExternalMeteredService,
    updateExternalMeteredService,
    updateTeamPlanPackage: handleUpdateTeamPlanPackage,
    createTeamPlanPackage: handleCreateTeamPlanPackage,
    updateTeamSeatPricing: handleUpdateTeamSeatPricing,
    updatePointsPackage: handleUpdatePointsPackage,
    createPointsPackage: handleCreatePointsPackage,
  };
};
