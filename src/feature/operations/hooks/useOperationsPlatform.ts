import { useCallback, useEffect, useMemo, useState } from "react";

import {
  loadStoredAgentPlazaCategories,
  loadStoredAgentStoreZones,
  saveStoredAgentPlazaCategories,
  saveStoredAgentStoreZones,
} from "@/feature/operations/agentPlazaCategoryStorage";
import {
  getMockTenantManagementSnapshot,
  saveMockTenantManagementSnapshot,
} from "@/feature/auth/mockTenantRegistry";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";
import {
  createMockPointsPackage,
  getMockPointsPackages,
  updateMockPointsPackage,
} from "@/feature/points/mockPointsCommerce";
import type {
  MockPointsPackageInput,
  MockPointsPackageOption,
  MockPointsPackageUpdate,
} from "@/feature/points/types";
import {
  loadStoredOperationsProducts,
  saveStoredOperationsProducts,
} from "@/feature/operations/commerceStorage";
import {
  loadStoredOperationsMeteringProviders,
  loadStoredOperationsModelServices,
  saveStoredOperationsMeteringProviders,
  saveStoredOperationsModelServices,
} from "@/feature/operations/serviceMeteringStorage";
import {
  loadOperationsCommunityGroupConfig,
  loadOperationsRegistrationStrategy,
  loadOperationsServiceContactConfig,
  saveOperationsCommunityGroupConfig,
  saveOperationsRegistrationStrategy,
  saveOperationsServiceContactConfig,
} from "@/feature/operations/platformConfigStorage";
import {
  normalizeAiAgentSceneTags,
  resolveAiAgentSceneTags,
} from "@/feature/operations/agentSceneTags";
import {
  loadStoredSkillCenterCategories,
  saveStoredSkillCenterCategories,
} from "@/feature/operations/skillCenterCategoryStorage";
import {
  OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
  OPERATIONS_AGENT_STATUS_LABELS,
  OPERATIONS_INITIAL_AGENT_SUBMISSIONS,
  OPERATIONS_INITIAL_POINTS_USAGE_RECORDS,
  OPERATIONS_INITIAL_TENANTS,
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
  OPERATIONS_TENANT_STATUS_LABELS,
  createDefaultAgentSubscriptionPlans,
  createEmptyOperationsProductForm,
  createEmptyOperationsTenantForm,
  resolveOperationsTenantAgentListingAccessByPermissions,
  resolveOperationsTenantModuleLabels,
} from "@/feature/operations/mockData";
import {
  loadStoredOperationsTenants,
  saveStoredOperationsTenants,
} from "@/feature/operations/tenantStorage";
import {
  applyMockSubscriptionPlanToTenant,
  createMockSubscriptionPlanTemplate,
  getMockSubscriptionPlanValidityLabel,
  getMockSubscriptionPlanTemplates,
  getPrimaryMockSubscriptionPlanSpec,
  updateMockSubscriptionPlanTemplate,
} from "@/feature/subscription/mockSubscriptionPlans";
import type {
  MockSubscriptionPlanKey,
  MockSubscriptionPlanPurchaseOption,
  MockSubscriptionPlanTemplate,
  MockSubscriptionPlanTemplateInput,
} from "@/feature/subscription/types";
import type {
  OperationsAgentPlazaCategoryOption,
  OperationsAgentStoreZoneOption,
  OperationsAgentSubmission,
  OperationsCommunityGroupConfig,
  OperationsMeteringProvider,
  OperationsMeteringProviderForm,
  OperationsModelService,
  OperationsModelServiceForm,
  OperationsProduct,
  OperationsProductForm,
  OperationsProductSubscriptionPlan,
  OperationsProductSubscriptionPlanStatus,
  OperationsPointsUsageRecord,
  OperationsRegistrationStrategy,
  OperationsServiceContactConfig,
  OperationsSkillCenterCategoryOption,
  OperationsTenant,
  OperationsTenantEntitlementRevokePayload,
  OperationsTenantEntitlementRevokeResult,
  OperationsTenantForm,
  OperationsTenantPointsRechargePayload,
  OperationsTenantSeatAllocationPayload,
  OperationsTenantSeatRenewalPayload,
} from "@/feature/operations/types";
import {
  addTenantSeatPackageValidity,
  getLatestTenantActiveSeatExpiresAt,
} from "@/feature/operations/tenantSeatEntitlementRules";
import {
  DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT,
  buildAdminTenantMember,
  buildOperationsAgentPlazaCategoryId,
  buildOperationsMeteringProviderId,
  buildOperationsModelServiceId,
  buildOperationsProductId,
  buildOperationsSkillCenterCategoryId,
  formatOperationsTimestamp,
  getTenantEntitlementGrants,
  syncAdminTenantMember,
} from "@/feature/operations/operationsPlatformHookUtils";
import { calculateOperationsSalePrice } from "@/feature/operations/serviceMeteringUtils";
import { useOperationsAuthStore } from "@/store/operationsAuth";
import {
  loadEnterpriseCommodityApplications,
  saveEnterpriseCommodityApplications,
} from "@/feature/workbenchLab/commodityApplications";
import {
  DEFAULT_TENANT_ROLE_IDS,
  normalizeTenantRolePermissionIds,
} from "@/constants/tenantRolePermissions";

interface UseOperationsPlatformResult {
  tenants: OperationsTenant[];
  agentSubmissions: OperationsAgentSubmission[];
  agentStoreZones: OperationsAgentStoreZoneOption[];
  agentPlazaCategories: OperationsAgentPlazaCategoryOption[];
  skillCenterCategories: OperationsSkillCenterCategoryOption[];
  approvedAgentSubmissions: OperationsAgentSubmission[];
  approvedAgents: OperationsAgentSubmission[];
  products: OperationsProduct[];
  meteringProviders: OperationsMeteringProvider[];
  modelServices: OperationsModelService[];
  pointsPackages: MockPointsPackageOption[];
  subscriptionPlans: MockSubscriptionPlanTemplate[];
  pointsUsageRecords: OperationsPointsUsageRecord[];
  registrationStrategy: OperationsRegistrationStrategy;
  serviceContactConfig: OperationsServiceContactConfig;
  communityGroupConfig: OperationsCommunityGroupConfig;
  emptyTenantForm: OperationsTenantForm;
  emptyProductForm: OperationsProductForm;
  tenantStatusLabels: typeof OPERATIONS_TENANT_STATUS_LABELS;
  agentStatusLabels: typeof OPERATIONS_AGENT_STATUS_LABELS;
  productStatusLabels: typeof OPERATIONS_PRODUCT_STATUS_LABELS;
  productSupplyKindLabels: typeof OPERATIONS_PRODUCT_SUPPLY_KIND_LABELS;
  productSaleTypeLabels: typeof OPERATIONS_PRODUCT_SALE_TYPE_LABELS;
  productDeliveryKindLabels: typeof OPERATIONS_PRODUCT_DELIVERY_KIND_LABELS;
  productBillingModeLabels: typeof OPERATIONS_PRODUCT_BILLING_MODE_LABELS;
  productMeteringUnitLabels: typeof OPERATIONS_PRODUCT_METERING_UNIT_LABELS;
  productBillingSpecLabels: typeof OPERATIONS_PRODUCT_BILLING_SPEC_LABELS;
  productDeliveryKindOptions: typeof OPERATIONS_PRODUCT_DELIVERY_KIND_OPTIONS;
  productSaleTypeOptions: typeof OPERATIONS_PRODUCT_SALE_TYPE_OPTIONS;
  productBillingModeOptions: typeof OPERATIONS_PRODUCT_BILLING_MODE_OPTIONS;
  productMeteringUnitOptions: typeof OPERATIONS_PRODUCT_METERING_UNIT_OPTIONS;
  productBillingSpecOptions: typeof OPERATIONS_PRODUCT_BILLING_SPEC_OPTIONS;
  createTenant: (form: OperationsTenantForm) => void;
  updateTenant: (tenantId: string, form: OperationsTenantForm) => void;
  updateTenantStatus: (tenantId: string, status: OperationsTenant["status"]) => void;
  rechargeTenantPoints: (
    tenantId: string,
    payload: OperationsTenantPointsRechargePayload,
  ) => boolean;
  allocateTenantSeats: (
    tenantId: string,
    payload: OperationsTenantSeatAllocationPayload,
  ) => boolean;
  renewTenantSeats: (tenantId: string, payload: OperationsTenantSeatRenewalPayload) => boolean;
  revokeTenantEntitlement: (
    tenantId: string,
    payload: OperationsTenantEntitlementRevokePayload,
  ) => OperationsTenantEntitlementRevokeResult;
  approveAgent: (submissionId: string) => void;
  rejectAgent: (submissionId: string, reason: string) => void;
  createProduct: (form: OperationsProductForm) => void;
  updateProduct: (productId: string, form: OperationsProductForm) => void;
  updateProductStatus: (productId: string, status: OperationsProduct["status"]) => void;
  createMeteringProvider: (form: OperationsMeteringProviderForm) => void;
  updateMeteringProvider: (providerId: string, form: OperationsMeteringProviderForm) => void;
  createModelService: (form: OperationsModelServiceForm) => void;
  updateModelService: (modelId: string, form: OperationsModelServiceForm) => void;
  createPointsPackage: (payload: MockPointsPackageInput) => void;
  updatePointsPackage: (packageId: string, updates: MockPointsPackageUpdate) => void;
  updateSubscriptionPlan: (
    planKey: MockSubscriptionPlanKey,
    updates: Partial<MockSubscriptionPlanTemplateInput>,
  ) => void;
  createSubscriptionPlan: (payload: MockSubscriptionPlanTemplateInput) => void;
  applyTenantSubscriptionPlan: (
    tenantId: string,
    purchaseOption: MockSubscriptionPlanPurchaseOption,
  ) => boolean;
  updateServiceContactConfig: (
    config: Pick<
      OperationsServiceContactConfig,
      "enabled" | "contactName" | "qrCodeValue" | "remarkTemplate"
    >,
  ) => void;
  updateCommunityGroupConfig: (
    config: Pick<
      OperationsCommunityGroupConfig,
      "enabled" | "groupName" | "qrCodeValue" | "description"
    >,
  ) => void;
  updateRegistrationStrategy: (
    config: Partial<
      Pick<
        OperationsRegistrationStrategy,
        | "enabled"
        | "initialPermissionIds"
        | "defaultGiftPoints"
        | "pointsPerCny"
        | "minimumDeductPoints"
        | "roundingUnit"
      >
    >,
  ) => void;
  createAgentPlazaCategory: (
    payload: Pick<OperationsAgentPlazaCategoryOption, "zoneId" | "name" | "sortOrder">,
  ) => void;
  updateAgentPlazaCategory: (
    categoryId: string,
    updates: Partial<
      Pick<OperationsAgentPlazaCategoryOption, "zoneId" | "name" | "sortOrder" | "status">
    >,
  ) => void;
  createAgentStoreZone: (
    payload: Pick<OperationsAgentStoreZoneOption, "name" | "sortOrder">,
  ) => void;
  updateAgentStoreZone: (
    zoneId: string,
    updates: Partial<Pick<OperationsAgentStoreZoneOption, "name" | "sortOrder" | "status">>,
  ) => void;
  createSkillCenterCategory: (
    payload: Pick<OperationsSkillCenterCategoryOption, "name" | "sortOrder">,
  ) => void;
  updateSkillCenterCategory: (
    categoryId: string,
    updates: Partial<Pick<OperationsSkillCenterCategoryOption, "name" | "sortOrder" | "status">>,
  ) => void;
}

const buildTenantSnapshotFromTenant = (tenant: OperationsTenant): MockTenantManagementSnapshot => {
  const adminUser = {
    id: `${tenant.id}-admin-user`,
    departmentId: "dept-root",
    name: tenant.adminName,
    phone: tenant.adminPhone,
    role: "enterpriseAdmin" as const,
    roleIds: [DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin],
    status: "active" as const,
    assignedAgentIds: [],
    assignedWorkspaceIds: [],
    lastActiveAt: "刚刚",
    dialogueCount: 0,
    tokenUsage: 0,
    resultCount: 0,
  };

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantCode: tenant.code,
    ownerAccountId: `${tenant.id}-owner`,
    adminUserId: adminUser.id,
    deploymentMode: tenant.deploymentMode,
    billingMode: tenant.billingMode,
    edition: "personal",
    planLabel: "默认管理员席位",
    includedSeats: DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT,
    extraSeatCount: 0,
    planExpiresAt: "长期有效",
    hasAgentListingAccess: tenant.hasAgentListingAccess,
    invitePolicyLabel: "系统已为初始管理员开通 1 个长期有效席位。",
    lowBalanceThreshold: 5000,
    monthlyUsedPoints: 0,
    pointsBalance: 0,
    totalSeats: DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT,
    usedSeats: DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT,
    users: [adminUser],
    agentUsageRecords: [],
    pointsLedger: [],
    pointsUsageRecords: [],
    pointsOrders: [],
    subscriptionOrders: [],
    entitlementGrants: [],
  };
};

const buildTenantFromForm = (form: OperationsTenantForm): OperationsTenant => {
  const createdAt = formatOperationsTimestamp();
  const adminPermissionIds = normalizeTenantRolePermissionIds(form.adminPermissionIds);
  const moduleLabels = resolveOperationsTenantModuleLabels(adminPermissionIds);
  const hasOperationsConsoleAccess = moduleLabels.some(label => label.includes("运营"));
  const hasAgentListingAccess =
    resolveOperationsTenantAgentListingAccessByPermissions(adminPermissionIds);

  return {
    id: `ops-tenant-${Date.now()}`,
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    type: "enterprise",
    deploymentMode: "publicCloud",
    edition: "personal",
    billingMode: form.billingMode,
    industry: form.industry.trim(),
    adminName: form.adminName.trim(),
    adminPhone: form.adminPhone.trim(),
    adminPermissionIds,
    adminRoleId: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
    adminRoleLabel: "初始管理员",
    hasAgentListingAccess,
    hasOperationsConsoleAccess,
    seatCount: DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT,
    effectiveAt: createdAt,
    expiresAt: "长期有效",
    moduleLabels,
    members: [buildAdminTenantMember(form.adminName, form.adminPhone, createdAt)],
    status: "pending",
    createdAt,
    updatedAt: createdAt,
  };
};

const buildMeteringProviderFromForm = (
  form: OperationsMeteringProviderForm,
): OperationsMeteringProvider => ({
  id: buildOperationsMeteringProviderId(),
  name: form.name.trim(),
  providerKind: form.providerKind,
  baseUrl: form.baseUrl.trim(),
  billingCurrency: form.billingCurrency.trim() || "CNY",
  credentialStatusLabel: form.credentialStatusLabel.trim(),
  status: form.status,
  updatedAt: formatOperationsTimestamp(),
});

const buildModelServiceFromForm = (form: OperationsModelServiceForm): OperationsModelService => ({
  id: buildOperationsModelServiceId(),
  providerId: form.providerId,
  modelCode: form.modelCode.trim(),
  modelName: form.modelName.trim(),
  inputCostPerMillion: form.inputCostPerMillion,
  cacheCreationCostPerMillion: form.cacheCreationCostPerMillion,
  cacheReadCostPerMillion: form.cacheReadCostPerMillion,
  outputCostPerMillion: form.outputCostPerMillion,
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
  cacheCreationSalePricePerMillion: calculateOperationsSalePrice(
    form.cacheCreationCostPerMillion,
    form.pricingMode,
    form.markupRate,
    form.grossMarginRate,
    form.cacheCreationSalePricePerMillion,
  ),
  cacheReadSalePricePerMillion: calculateOperationsSalePrice(
    form.cacheReadCostPerMillion,
    form.pricingMode,
    form.markupRate,
    form.grossMarginRate,
    form.cacheReadSalePricePerMillion,
  ),
  outputSalePricePerMillion: calculateOperationsSalePrice(
    form.outputCostPerMillion,
    form.pricingMode,
    form.markupRate,
    form.grossMarginRate,
    form.outputSalePricePerMillion,
  ),
  status: form.status,
  updatedAt: formatOperationsTimestamp(),
});

interface SortableOperationsCategory {
  sortOrder: number;
  updatedAt: string;
}

const sortCategoryOptions = <TCategory extends SortableOperationsCategory>(
  categories: TCategory[],
): TCategory[] =>
  [...categories].sort((leftItem, rightItem) => {
    if (leftItem.sortOrder !== rightItem.sortOrder) {
      return leftItem.sortOrder - rightItem.sortOrder;
    }

    return leftItem.updatedAt.localeCompare(rightItem.updatedAt);
  });

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

const shouldUseSubscriptionPlans = (form: OperationsProductForm): boolean =>
  form.saleType === "paid" && form.billingMode === "subscription" && form.supplyKind === "agent";

const normalizeSubmissionSceneTags = (
  sceneTags: string[] | undefined,
  fallbackTag: string,
): string[] => resolveAiAgentSceneTags(sceneTags, [fallbackTag]);

const getSubmissionSourceAgentId = (submission: OperationsAgentSubmission): string =>
  submission.sourceAgentId ?? submission.id;

const getProductLinkedAgentSourceId = (product: OperationsProduct): string | undefined =>
  product.linkedAgentSourceId ?? product.linkedAgentId;

const buildProductFromForm = (
  form: OperationsProductForm,
  approvedSubmissions: OperationsAgentSubmission[],
): OperationsProduct => {
  const linkedSubmission =
    form.supplyKind === "agent" && form.linkedAgentId
      ? approvedSubmissions.find(item => item.id === form.linkedAgentId)
      : undefined;
  const useSubscriptionPlans = shouldUseSubscriptionPlans(form);
  const supportsTrial = form.supplyKind === "agent" ? false : form.supportsTrial;

  return {
    id: buildOperationsProductId(),
    name: form.name.trim(),
    supplyKind: form.supplyKind,
    deliveryKind: form.deliveryKind,
    saleType: form.saleType,
    billingMode: form.billingMode,
    meteringUnit: form.meteringUnit,
    billingSpec: useSubscriptionPlans ? undefined : form.billingSpec,
    linkedAgentId: linkedSubmission?.id,
    linkedAgentSourceId: linkedSubmission
      ? getSubmissionSourceAgentId(linkedSubmission)
      : undefined,
    linkedAgentName: linkedSubmission?.name,
    resourcePoolId: undefined,
    resourcePoolName: undefined,
    description: form.description.trim(),
    identityAvatarUrl: form.identityAvatarUrl.trim(),
    identityName: form.identityName.trim(),
    identityDescription: form.identityDescription.trim(),
    usageGuide: form.usageGuide.trim(),
    tags: form.tags,
    price: form.saleType === "free" ? 0 : useSubscriptionPlans ? undefined : form.price,
    subscriptionPlans: useSubscriptionPlans
      ? normalizeSubscriptionPlans(form.subscriptionPlans)
      : undefined,
    supportsTrial,
    trialUnit: supportsTrial ? form.trialUnit : undefined,
    trialValue: supportsTrial ? form.trialValue : undefined,
    contactMode: form.contactMode,
    contactQrCodeValue: form.contactMode === "custom" ? form.contactQrCodeValue.trim() : "",
    contactRemark: form.contactMode === "custom" ? form.contactRemark.trim() : "",
    status: form.plazaStatus === "online" ? "active" : "inactive",
    storeZone: form.storeZone,
    storeZones: form.storeZones,
    plazaCategory: form.plazaCategory,
    plazaCategoryByZone: form.plazaCategoryByZone,
    plazaVisibility: form.plazaVisibility,
    visibleTenantIds: form.plazaVisibility === "tenant" ? form.visibleTenantIds : [],
    visibleTenantNames: form.plazaVisibility === "tenant" ? form.visibleTenantNames : [],
    plazaStatus: form.plazaStatus,
    plazaSort: form.plazaSort,
    billingScopes: form.billingScopes,
    updatedAt: formatOperationsTimestamp(),
  };
};

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

const normalizeSubmissionSubmitter = (submitter: string): string =>
  submitter.split(" - ")[0].trim();

const normalizeAgentSubmission = (
  submission: OperationsAgentSubmission,
): OperationsAgentSubmission => ({
  id: submission.id,
  sourceAgentId: submission.sourceAgentId,
  applicationKind: submission.applicationKind,
  name: submission.name,
  version: submission.version,
  submitter: normalizeSubmissionSubmitter(submission.submitter),
  submittedAt: submission.submittedAt,
  status: submission.status,
  description: submission.description,
  avatarUrl: submission.avatarUrl,
  usageGuide: submission.usageGuide?.trim() || undefined,
  sceneTags: normalizeAiAgentSceneTags(submission.sceneTags),
  submitReason: submission.submitReason,
  currentScopeLabel: submission.currentScopeLabel,
  rejectReason: submission.rejectReason,
  lastReviewedAt: submission.lastReviewedAt,
  plazaCategory: submission.plazaCategory,
  plazaVisibility: submission.plazaVisibility,
  visibleTenantIds: submission.visibleTenantIds,
  visibleTenantNames: submission.visibleTenantNames,
  plazaStatus: submission.plazaStatus,
  plazaUpdatedAt: submission.plazaUpdatedAt,
  skills: submission.skills,
  coreFiles: submission.coreFiles,
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
 * 提供运营后台租户管理与 AI 专家上架审核所需的本地 mock 状态和交互动作。
 */
export const useOperationsPlatform = (): UseOperationsPlatformResult => {
  const operationsSession = useOperationsAuthStore(state => state.session);
  const currentOperatorUserId = operationsSession?.userId;
  const currentOperatorName = operationsSession?.name ?? "未记录";
  const currentOperatorRoleLabel = operationsSession?.roleLabel;
  const [tenants, setTenants] = useState<OperationsTenant[]>(() =>
    mergeStoredTenantsWithPreset(OPERATIONS_INITIAL_TENANTS, loadStoredOperationsTenants()),
  );
  const [agentSubmissions, setAgentSubmissions] = useState<OperationsAgentSubmission[]>(
    buildInitialAgentSubmissions,
  );
  const [agentStoreZones, setAgentStoreZones] = useState<OperationsAgentStoreZoneOption[]>(() =>
    loadStoredAgentStoreZones(),
  );
  const [agentPlazaCategories, setAgentPlazaCategories] = useState<
    OperationsAgentPlazaCategoryOption[]
  >(() => loadStoredAgentPlazaCategories());
  const [skillCenterCategories, setSkillCenterCategories] = useState<
    OperationsSkillCenterCategoryOption[]
  >(() => loadStoredSkillCenterCategories());
  const [products, setProducts] = useState<OperationsProduct[]>(() =>
    loadStoredOperationsProducts(),
  );
  const [meteringProviders, setMeteringProviders] = useState<OperationsMeteringProvider[]>(() =>
    loadStoredOperationsMeteringProviders(),
  );
  const [modelServices, setModelServices] = useState<OperationsModelService[]>(() =>
    loadStoredOperationsModelServices(),
  );
  const [pointsUsageRecords] = useState<OperationsPointsUsageRecord[]>(
    () => OPERATIONS_INITIAL_POINTS_USAGE_RECORDS,
  );
  const [pointsPackages, setPointsPackages] = useState<MockPointsPackageOption[]>(() =>
    getMockPointsPackages(),
  );
  const [subscriptionPlans, setSubscriptionPlans] = useState<MockSubscriptionPlanTemplate[]>(() =>
    getMockSubscriptionPlanTemplates(),
  );
  const [registrationStrategy, setRegistrationStrategy] = useState<OperationsRegistrationStrategy>(
    () => loadOperationsRegistrationStrategy(),
  );
  const [serviceContactConfig, setServiceContactConfig] = useState<OperationsServiceContactConfig>(
    () => loadOperationsServiceContactConfig(),
  );
  const [communityGroupConfig, setCommunityGroupConfig] = useState<OperationsCommunityGroupConfig>(
    () => loadOperationsCommunityGroupConfig(),
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
    saveStoredAgentStoreZones(agentStoreZones);
  }, [agentStoreZones]);

  useEffect(() => {
    saveStoredSkillCenterCategories(skillCenterCategories);
  }, [skillCenterCategories]);

  useEffect(() => {
    saveStoredOperationsProducts(products);
  }, [products]);

  useEffect(() => {
    saveStoredOperationsMeteringProviders(meteringProviders);
  }, [meteringProviders]);

  useEffect(() => {
    saveStoredOperationsModelServices(modelServices);
  }, [modelServices]);

  useEffect(() => {
    saveOperationsRegistrationStrategy(registrationStrategy);
  }, [registrationStrategy]);

  useEffect(() => {
    saveOperationsServiceContactConfig(serviceContactConfig);
  }, [serviceContactConfig]);

  useEffect(() => {
    saveOperationsCommunityGroupConfig(communityGroupConfig);
  }, [communityGroupConfig]);

  const approvedAgentSubmissions = useMemo<OperationsAgentSubmission[]>(
    () => agentSubmissions.filter(item => item.status === "approved"),
    [agentSubmissions],
  );

  const createTenant = useCallback((form: OperationsTenantForm): void => {
    const nextTenant = buildTenantFromForm(form);

    saveMockTenantManagementSnapshot(buildTenantSnapshotFromTenant(nextTenant));
    setTenants(currentTenants => [nextTenant, ...currentTenants]);
  }, []);

  const updateTenant = useCallback((tenantId: string, form: OperationsTenantForm): void => {
    const adminPermissionIds = normalizeTenantRolePermissionIds(form.adminPermissionIds);
    const moduleLabels = resolveOperationsTenantModuleLabels(adminPermissionIds);
    const hasOperationsConsoleAccess = moduleLabels.some(label => label.includes("运营"));
    const hasAgentListingAccess =
      resolveOperationsTenantAgentListingAccessByPermissions(adminPermissionIds);

    setTenants(currentTenants =>
      currentTenants.map(item =>
        item.id === tenantId
          ? {
              ...item,
              name: form.name.trim(),
              code: form.code.trim().toUpperCase(),
              edition: item.edition,
              billingMode: item.billingMode,
              industry: form.industry.trim(),
              adminName: form.adminName.trim(),
              adminPhone: form.adminPhone.trim(),
              adminPermissionIds,
              adminRoleId: item.adminRoleId,
              adminRoleLabel: item.adminRoleLabel,
              hasAgentListingAccess,
              hasOperationsConsoleAccess,
              seatCount: item.seatCount,
              effectiveAt: item.effectiveAt,
              expiresAt: item.expiresAt,
              moduleLabels,
              members: syncAdminTenantMember(
                item.members,
                form.adminName,
                form.adminPhone,
                item.createdAt,
              ),
              updatedAt: formatOperationsTimestamp(),
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
                updatedAt: formatOperationsTimestamp(),
              }
            : item,
        ),
      );
    },
    [],
  );

  const rechargeTenantPoints = useCallback(
    (tenantId: string, payload: OperationsTenantPointsRechargePayload): boolean => {
      const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

      if (!matchedSnapshot) {
        return false;
      }

      const timestamp = Date.now();
      const basePoints = Math.max(Math.floor(payload.points), 0);
      const giftPoints = Math.max(Math.floor(payload.giftPoints), 0);
      const totalPoints = Math.max(basePoints + giftPoints, 1);
      const createdAt = formatOperationsTimestamp();
      const orderId = `${tenantId}-ops-points-order-${timestamp}`;
      const orderNo = `OPS-POINTS-${timestamp.toString().slice(-10)}`;
      const grantId = `${tenantId}-ops-points-grant-${timestamp}`;

      saveMockTenantManagementSnapshot({
        ...matchedSnapshot,
        pointsBalance: matchedSnapshot.pointsBalance + totalPoints,
        pointsLedger: [
          {
            id: `${tenantId}-ops-points-recharge-${timestamp}`,
            title: payload.packageTitle,
            description: payload.remark?.trim() || "运营通过内部积分包给租户充值。",
            points: totalPoints,
            direction: "income",
            createdAt,
            actorName: currentOperatorName,
          },
          ...(matchedSnapshot.pointsLedger ?? []),
        ],
        pointsOrders: [
          {
            id: orderId,
            orderNo,
            packageId: payload.packageId,
            packageTitle: payload.packageTitle,
            packagePoints: basePoints,
            totalPoints,
            amount: 0,
            originalAmount: 0,
            discountAmount: 0,
            status: "paid",
            orderSourceLabel: "运营后台开通",
            paymentChannelLabel: "线下订单",
            purchaserName: "-",
            operatorUserId: currentOperatorUserId,
            operatorName: currentOperatorName,
            operatorRoleLabel: currentOperatorRoleLabel,
            createdAt,
            paidAt: createdAt,
          },
          ...(matchedSnapshot.pointsOrders ?? []),
        ],
        entitlementGrants: [
          {
            id: grantId,
            kind: "points",
            title: payload.packageTitle,
            description: payload.remark?.trim() || "运营通过内部积分包给租户充值。",
            orderId,
            orderNo,
            points: totalPoints,
            status: "active",
            createdAt,
            operatorUserId: currentOperatorUserId,
            operatorName: currentOperatorName,
            operatorRoleLabel: currentOperatorRoleLabel,
          },
          ...getTenantEntitlementGrants(matchedSnapshot),
        ],
      });

      setTenants(currentTenants =>
        currentTenants.map(item =>
          item.id === tenantId
            ? {
                ...item,
                updatedAt: createdAt,
              }
            : item,
        ),
      );

      return true;
    },
    [currentOperatorName, currentOperatorRoleLabel, currentOperatorUserId],
  );

  const allocateTenantSeats = useCallback(
    (tenantId: string, payload: OperationsTenantSeatAllocationPayload): boolean => {
      const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);
      const selectedPlan = subscriptionPlans.find(
        item =>
          item.key === payload.planKey && item.scope === "internal" && item.status === "active",
      );
      const selectedSpec = selectedPlan ? getPrimaryMockSubscriptionPlanSpec(selectedPlan) : null;

      if (!matchedSnapshot || !selectedPlan || !selectedSpec) {
        return false;
      }

      const timestamp = Date.now();
      const seatCount = Math.max(Math.floor(payload.seatCount), 1);
      const giftPoints = Math.max(Math.floor(selectedSpec.giftPoints), 0);
      const createdAt = formatOperationsTimestamp();
      const currentExpiresAt = getLatestTenantActiveSeatExpiresAt(matchedSnapshot);
      const expiresAt =
        currentExpiresAt ??
        addTenantSeatPackageValidity(
          createdAt.slice(0, 10),
          selectedSpec.validityCount,
          selectedSpec.validityUnit,
        );
      const planTitle = selectedPlan.title;
      const validityLabel = getMockSubscriptionPlanValidityLabel(selectedPlan);
      const originalAmount = selectedSpec.priceAmount * seatCount;
      const orderId = `${tenantId}-ops-seat-order-${timestamp}`;
      const orderNo = `OPS-SEAT-${timestamp.toString().slice(-10)}`;
      const grantId = `${tenantId}-ops-seat-grant-${timestamp}`;
      const nextTotalSeats = Math.max(
        matchedSnapshot.usedSeats,
        matchedSnapshot.totalSeats + seatCount,
      );
      const nextIncludedSeats = matchedSnapshot.includedSeats + seatCount;

      saveMockTenantManagementSnapshot({
        ...matchedSnapshot,
        edition: "team",
        planLabel: planTitle,
        includedSeats: nextIncludedSeats,
        totalSeats: nextTotalSeats,
        teamPlanPackageId: selectedPlan.key,
        planExpiresAt: expiresAt,
        invitePolicyLabel: `运营已分配 ${seatCount} 个席位，到期时间 ${expiresAt}。`,
        pointsBalance: matchedSnapshot.pointsBalance + giftPoints,
        pointsLedger:
          giftPoints > 0
            ? [
                {
                  id: `${tenantId}-ops-seat-gift-points-${timestamp}`,
                  title: `${planTitle}赠送积分`,
                  description: "运营通过内部席位包给租户分配席位时赠送。",
                  points: giftPoints,
                  direction: "income",
                  createdAt,
                  actorName: currentOperatorName,
                },
                ...(matchedSnapshot.pointsLedger ?? []),
              ]
            : matchedSnapshot.pointsLedger,
        subscriptionOrders: [
          {
            id: orderId,
            orderNo,
            planKey: selectedPlan.key,
            planTitle,
            amount: originalAmount,
            seatCount,
            billingCycleLabel: validityLabel,
            status: "paid",
            orderSourceLabel: "运营后台开通",
            paymentChannelLabel: "线下订单",
            purchaserName: "-",
            operatorUserId: currentOperatorUserId,
            operatorName: currentOperatorName,
            operatorRoleLabel: currentOperatorRoleLabel,
            createdAt,
            paidAt: createdAt,
            billingCycle: selectedSpec.key,
            unitPrice: selectedSpec.priceAmount,
            originalAmount,
            discountAmount: 0,
            expiresAt,
            purchaseMode: "addSeats",
          },
          ...(matchedSnapshot.subscriptionOrders ?? []),
        ],
        entitlementGrants: [
          {
            id: grantId,
            kind: "seats",
            title: planTitle,
            description:
              payload.remark?.trim() ||
              `运营给租户分配 ${seatCount} 个席位，到期时间 ${expiresAt}。`,
            orderId,
            orderNo,
            seatCount,
            seatAction: "allocation",
            giftPoints,
            expiresAt,
            afterExpiresAt: expiresAt,
            status: "active",
            createdAt,
            operatorUserId: currentOperatorUserId,
            operatorName: currentOperatorName,
            operatorRoleLabel: currentOperatorRoleLabel,
          },
          ...getTenantEntitlementGrants(matchedSnapshot),
        ],
      });

      setTenants(currentTenants =>
        currentTenants.map(item =>
          item.id === tenantId
            ? {
                ...item,
                edition: "team",
                seatCount: nextTotalSeats,
                expiresAt,
                updatedAt: createdAt,
              }
            : item,
        ),
      );

      return true;
    },
    [currentOperatorName, currentOperatorRoleLabel, currentOperatorUserId, subscriptionPlans],
  );

  const renewTenantSeats = useCallback(
    (tenantId: string, payload: OperationsTenantSeatRenewalPayload): boolean => {
      const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);
      const selectedPlan = subscriptionPlans.find(
        item =>
          item.key === payload.planKey && item.scope === "internal" && item.status === "active",
      );
      const selectedSpec = selectedPlan ? getPrimaryMockSubscriptionPlanSpec(selectedPlan) : null;

      if (!matchedSnapshot || !selectedPlan || !selectedSpec) {
        return false;
      }

      const currentExpiresAt = getLatestTenantActiveSeatExpiresAt(matchedSnapshot);
      const renewedSeatCount = Math.max(
        matchedSnapshot.totalSeats,
        matchedSnapshot.usedSeats,
        DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT,
      );

      if (!currentExpiresAt || renewedSeatCount <= DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT) {
        return false;
      }

      const timestamp = Date.now();
      const createdAt = formatOperationsTimestamp();
      const planTitle = selectedPlan.title;
      const validityLabel = getMockSubscriptionPlanValidityLabel(selectedPlan);
      const giftPoints = Math.max(Math.floor(selectedSpec.giftPoints), 0);
      const expiresAt = addTenantSeatPackageValidity(
        currentExpiresAt,
        selectedSpec.validityCount,
        selectedSpec.validityUnit,
      );
      const originalAmount = selectedSpec.priceAmount * renewedSeatCount;
      const orderId = `${tenantId}-ops-seat-renewal-order-${timestamp}`;
      const orderNo = `OPS-RENEW-${timestamp.toString().slice(-10)}`;
      const grantId = `${tenantId}-ops-seat-renewal-${timestamp}`;

      saveMockTenantManagementSnapshot({
        ...matchedSnapshot,
        edition: "team",
        planLabel: planTitle,
        teamPlanPackageId: selectedPlan.key,
        planExpiresAt: expiresAt,
        invitePolicyLabel: `运营已续约 ${renewedSeatCount} 个席位，到期时间 ${expiresAt}。`,
        pointsBalance: matchedSnapshot.pointsBalance + giftPoints,
        pointsLedger:
          giftPoints > 0
            ? [
                {
                  id: `${tenantId}-ops-seat-renewal-gift-points-${timestamp}`,
                  title: `${planTitle}续约赠送积分`,
                  description: "运营通过内部席位包给租户续约席位时赠送。",
                  points: giftPoints,
                  direction: "income",
                  createdAt,
                  actorName: currentOperatorName,
                },
                ...(matchedSnapshot.pointsLedger ?? []),
              ]
            : matchedSnapshot.pointsLedger,
        subscriptionOrders: [
          {
            id: orderId,
            orderNo,
            planKey: selectedPlan.key,
            planTitle,
            amount: originalAmount,
            seatCount: renewedSeatCount,
            billingCycleLabel: validityLabel,
            status: "paid",
            orderSourceLabel: "运营后台席位续约",
            paymentChannelLabel: "线下订单",
            purchaserName: "-",
            operatorUserId: currentOperatorUserId,
            operatorName: currentOperatorName,
            operatorRoleLabel: currentOperatorRoleLabel,
            createdAt,
            paidAt: createdAt,
            billingCycle: selectedSpec.key,
            unitPrice: selectedSpec.priceAmount,
            originalAmount,
            discountAmount: 0,
            expiresAt,
            purchaseMode: "renew",
          },
          ...(matchedSnapshot.subscriptionOrders ?? []),
        ],
        entitlementGrants: [
          {
            id: grantId,
            kind: "seats",
            title: planTitle,
            description:
              payload.remark?.trim() ||
              `运营给租户 ${renewedSeatCount} 个有效席位续约，从 ${currentExpiresAt} 顺延至 ${expiresAt}。`,
            orderId,
            orderNo,
            seatCount: renewedSeatCount,
            seatAction: "renewal",
            giftPoints,
            expiresAt,
            beforeExpiresAt: currentExpiresAt,
            afterExpiresAt: expiresAt,
            status: "active",
            createdAt,
            operatorUserId: currentOperatorUserId,
            operatorName: currentOperatorName,
            operatorRoleLabel: currentOperatorRoleLabel,
          },
          ...getTenantEntitlementGrants(matchedSnapshot),
        ],
      });

      setTenants(currentTenants =>
        currentTenants.map(item =>
          item.id === tenantId
            ? {
                ...item,
                edition: "team",
                seatCount: renewedSeatCount,
                expiresAt,
                updatedAt: createdAt,
              }
            : item,
        ),
      );

      return true;
    },
    [currentOperatorName, currentOperatorRoleLabel, currentOperatorUserId, subscriptionPlans],
  );

  const revokeTenantEntitlement = useCallback(
    (
      tenantId: string,
      payload: OperationsTenantEntitlementRevokePayload,
    ): OperationsTenantEntitlementRevokeResult => {
      const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

      if (!matchedSnapshot) {
        return { success: false, message: "未找到租户权益数据。" };
      }

      const revokeReason = payload.reason.trim();

      if (!revokeReason) {
        return { success: false, message: "请填写撤销原因。" };
      }

      const grants = getTenantEntitlementGrants(matchedSnapshot);
      const matchedGrant = grants.find(item => item.id === payload.grantId);

      if (!matchedGrant) {
        return { success: false, message: "未找到可撤销的发放记录。" };
      }

      if (matchedGrant.status === "revoked") {
        return { success: false, message: "该发放记录已撤销。" };
      }

      const timestamp = Date.now();
      const revokedAt = formatOperationsTimestamp();
      const nextGrants = grants.map(item =>
        item.id === matchedGrant.id
          ? {
              ...item,
              status: "revoked" as const,
              revokedAt,
              revokedBy: currentOperatorName,
              revokeReason,
            }
          : item,
      );

      if (matchedGrant.kind === "points") {
        const revokePoints = Math.max(Math.floor(matchedGrant.points ?? 0), 0);

        if (revokePoints < 1) {
          return { success: false, message: "该积分包没有可撤销的积分额度。" };
        }

        if (matchedSnapshot.pointsBalance < revokePoints) {
          return { success: false, message: "当前积分余额不足，无法撤销该积分包。" };
        }

        saveMockTenantManagementSnapshot({
          ...matchedSnapshot,
          pointsBalance: matchedSnapshot.pointsBalance - revokePoints,
          pointsLedger: [
            {
              id: `${tenantId}-ops-points-revoke-${timestamp}`,
              title: `撤销${matchedGrant.title}`,
              description: `撤销原因：${revokeReason}`,
              points: revokePoints,
              direction: "expense",
              createdAt: revokedAt,
              actorName: currentOperatorName,
            },
            ...(matchedSnapshot.pointsLedger ?? []),
          ],
          pointsOrders: (matchedSnapshot.pointsOrders ?? []).map(order =>
            order.id === matchedGrant.orderId
              ? {
                  ...order,
                  status: "closed",
                }
              : order,
          ),
          entitlementGrants: nextGrants,
        });

        setTenants(currentTenants =>
          currentTenants.map(item =>
            item.id === tenantId
              ? {
                  ...item,
                  updatedAt: revokedAt,
                }
              : item,
          ),
        );

        return { success: true, message: "积分包发放已撤销。" };
      }

      if (matchedGrant.seatAction === "renewal") {
        return { success: false, message: "席位续约记录不在发放撤销范围内。" };
      }

      const revokeSeats = Math.max(Math.floor(matchedGrant.seatCount ?? 0), 0);
      const giftPoints = Math.max(Math.floor(matchedGrant.giftPoints ?? 0), 0);
      const nextTotalSeats = matchedSnapshot.totalSeats - revokeSeats;

      if (revokeSeats < 1) {
        return { success: false, message: "该席位包没有可撤销的席位额度。" };
      }

      if (nextTotalSeats < matchedSnapshot.usedSeats) {
        return { success: false, message: "席位已被占用，无法撤销该席位包。" };
      }

      if (giftPoints > 0 && matchedSnapshot.pointsBalance < giftPoints) {
        return { success: false, message: "席位包赠送积分已被消耗，无法撤销该席位包。" };
      }

      const activeSeatGrants = nextGrants.filter(
        item => item.kind === "seats" && item.status === "active",
      );
      const latestActiveSeatGrant = activeSeatGrants[0];
      const normalizedTotalSeats = Math.max(DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT, nextTotalSeats);
      const nextIncludedSeats = Math.max(
        DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT,
        matchedSnapshot.includedSeats - revokeSeats,
      );
      const nextEdition =
        normalizedTotalSeats > DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT ? "team" : "personal";
      const nextPlanLabel =
        latestActiveSeatGrant?.title ??
        (normalizedTotalSeats > DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT
          ? matchedSnapshot.planLabel
          : "默认管理员席位");
      const latestActiveSeatExpiresAt =
        normalizedTotalSeats > DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT
          ? getLatestTenantActiveSeatExpiresAt({
              ...matchedSnapshot,
              entitlementGrants: nextGrants,
              totalSeats: normalizedTotalSeats,
            })
          : null;
      const nextPlanExpiresAt =
        latestActiveSeatExpiresAt ??
        latestActiveSeatGrant?.expiresAt ??
        (normalizedTotalSeats > DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT
          ? (matchedSnapshot.planExpiresAt ?? "长期有效")
          : "长期有效");

      saveMockTenantManagementSnapshot({
        ...matchedSnapshot,
        edition: nextEdition,
        planLabel: nextPlanLabel,
        includedSeats: nextIncludedSeats,
        totalSeats: normalizedTotalSeats,
        planExpiresAt: nextPlanExpiresAt,
        invitePolicyLabel:
          normalizedTotalSeats > DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT
            ? `运营已分配 ${normalizedTotalSeats - DEFAULT_OPERATIONS_ADMIN_SEAT_COUNT} 个席位，到期时间 ${nextPlanExpiresAt}。`
            : "系统已为初始管理员开通 1 个长期有效席位。",
        pointsBalance: matchedSnapshot.pointsBalance - giftPoints,
        pointsLedger:
          giftPoints > 0
            ? [
                {
                  id: `${tenantId}-ops-seat-gift-points-revoke-${timestamp}`,
                  title: `撤销${matchedGrant.title}赠送积分`,
                  description: `撤销原因：${revokeReason}`,
                  points: giftPoints,
                  direction: "expense",
                  createdAt: revokedAt,
                  actorName: currentOperatorName,
                },
                ...(matchedSnapshot.pointsLedger ?? []),
              ]
            : matchedSnapshot.pointsLedger,
        subscriptionOrders: (matchedSnapshot.subscriptionOrders ?? []).map(order =>
          order.id === matchedGrant.orderId
            ? {
                ...order,
                status: "closed",
              }
            : order,
        ),
        entitlementGrants: nextGrants,
      });

      setTenants(currentTenants =>
        currentTenants.map(item =>
          item.id === tenantId
            ? {
                ...item,
                edition: nextEdition,
                seatCount: normalizedTotalSeats,
                expiresAt: nextPlanExpiresAt,
                updatedAt: revokedAt,
              }
            : item,
        ),
      );

      return { success: true, message: "席位包发放已撤销。" };
    },
    [currentOperatorName],
  );

  const approveAgent = useCallback(
    (submissionId: string): void => {
      const reviewedAt = formatOperationsTimestamp();
      const approvedSubmission = agentSubmissions.find(item => item.id === submissionId) ?? null;
      const reviewedSubmission = approvedSubmission
        ? {
            ...approvedSubmission,
            status: "approved" as const,
            rejectReason: undefined,
            lastReviewedAt: reviewedAt,
            plazaCategory:
              approvedSubmission.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
            plazaVisibility: approvedSubmission.plazaVisibility ?? "public",
            visibleTenantIds: approvedSubmission.visibleTenantIds ?? [],
            visibleTenantNames: approvedSubmission.visibleTenantNames ?? [],
            plazaStatus: approvedSubmission.plazaStatus ?? "offline",
            plazaUpdatedAt: approvedSubmission.plazaUpdatedAt ?? reviewedAt,
          }
        : null;

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

      if (!reviewedSubmission) {
        return;
      }

      setProducts(currentProducts => {
        const sourceAgentId = getSubmissionSourceAgentId(reviewedSubmission);
        const existingProduct = currentProducts.find(
          item => getProductLinkedAgentSourceId(item) === sourceAgentId,
        );

        if (existingProduct) {
          return currentProducts.map(item =>
            item.id === existingProduct.id
              ? {
                ...item,
                linkedAgentId: reviewedSubmission.id,
                linkedAgentSourceId: sourceAgentId,
                linkedAgentName: reviewedSubmission.name,
                name: reviewedSubmission.name,
                description: reviewedSubmission.description,
                identityAvatarUrl: reviewedSubmission.avatarUrl ?? "",
                identityName: reviewedSubmission.name,
                identityDescription: reviewedSubmission.description,
                usageGuide: reviewedSubmission.usageGuide?.trim() || "",
                tags: normalizeSubmissionSceneTags(
                  reviewedSubmission.sceneTags,
                  reviewedSubmission.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
                ),
                contactMode: "disabled",
                contactQrCodeValue: "",
                contactRemark: "",
                updatedAt: reviewedAt,
              }
            : item,
          );
        }

        return currentProducts;
      });
    },
    [agentSubmissions],
  );

  const rejectAgent = useCallback((submissionId: string, reason: string): void => {
    const reviewedAt = formatOperationsTimestamp();

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
        buildProductFromForm(form, approvedAgentSubmissions),
        ...currentProducts,
      ]);
    },
    [approvedAgentSubmissions],
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
          const useSubscriptionPlans = shouldUseSubscriptionPlans(form);
          const supportsTrial = form.supplyKind === "agent" ? false : form.supportsTrial;

          return {
            ...item,
            name: form.name.trim(),
            supplyKind: form.supplyKind,
            deliveryKind: form.deliveryKind,
            saleType: form.saleType,
            billingMode: form.billingMode,
            meteringUnit: form.meteringUnit,
            billingSpec: useSubscriptionPlans ? undefined : form.billingSpec,
            linkedAgentId: linkedSubmission?.id ?? item.linkedAgentId,
            linkedAgentSourceId: linkedSubmission
              ? getSubmissionSourceAgentId(linkedSubmission)
              : item.linkedAgentSourceId,
            linkedAgentName: linkedSubmission?.name ?? item.linkedAgentName,
            resourcePoolId: undefined,
            resourcePoolName: undefined,
            description: form.description.trim(),
            identityAvatarUrl: form.identityAvatarUrl.trim(),
            identityName: form.identityName.trim(),
            identityDescription: form.identityDescription.trim(),
            usageGuide: form.usageGuide.trim(),
            tags: form.tags,
            price: form.saleType === "free" ? 0 : useSubscriptionPlans ? undefined : form.price,
            subscriptionPlans: useSubscriptionPlans
              ? normalizeSubscriptionPlans(form.subscriptionPlans)
              : undefined,
            supportsTrial,
            trialUnit: supportsTrial ? form.trialUnit : undefined,
            trialValue: supportsTrial ? form.trialValue : undefined,
            contactMode: form.contactMode,
            contactQrCodeValue: form.contactMode === "custom" ? form.contactQrCodeValue.trim() : "",
            contactRemark: form.contactMode === "custom" ? form.contactRemark.trim() : "",
            status: form.plazaStatus === "online" ? "active" : "inactive",
            storeZone: form.storeZone,
            storeZones: form.storeZones,
            plazaCategory: form.plazaCategory,
            plazaCategoryByZone: form.plazaCategoryByZone,
            plazaVisibility: form.plazaVisibility,
            visibleTenantIds: form.plazaVisibility === "tenant" ? form.visibleTenantIds : [],
            visibleTenantNames: form.plazaVisibility === "tenant" ? form.visibleTenantNames : [],
            plazaStatus: form.plazaStatus,
            plazaSort: form.plazaSort,
            billingScopes: form.billingScopes,
            updatedAt: formatOperationsTimestamp(),
          };
        }),
      );
    },
    [approvedAgentSubmissions],
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
                updatedAt: formatOperationsTimestamp(),
              }
            : item,
        ),
      );
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
      const nextProvider = buildMeteringProviderFromForm(form);

      setMeteringProviders(currentProviders =>
        currentProviders.map(item =>
          item.id === providerId
            ? {
                ...nextProvider,
                id: item.id,
              }
            : item,
        ),
      );
    },
    [],
  );

  const createModelService = useCallback((form: OperationsModelServiceForm): void => {
    setModelServices(currentModels => [buildModelServiceFromForm(form), ...currentModels]);
  }, []);

  const updateModelService = useCallback(
    (modelId: string, form: OperationsModelServiceForm): void => {
      setModelServices(currentModels =>
        currentModels.map(item =>
          item.id === modelId
            ? {
                ...buildModelServiceFromForm(form),
                id: item.id,
              }
            : item,
        ),
      );
    },
    [],
  );

  const createPointsPackage = useCallback((payload: MockPointsPackageInput): void => {
    setPointsPackages(createMockPointsPackage(payload));
  }, []);

  const updatePointsPackage = useCallback(
    (packageId: string, updates: MockPointsPackageUpdate): void => {
      setPointsPackages(updateMockPointsPackage(packageId, updates));
    },
    [],
  );

  const updateSubscriptionPlan = useCallback(
    (
      planKey: MockSubscriptionPlanKey,
      updates: Partial<MockSubscriptionPlanTemplateInput>,
    ): void => {
      setSubscriptionPlans(updateMockSubscriptionPlanTemplate(planKey, updates));
    },
    [],
  );

  const createSubscriptionPlan = useCallback((payload: MockSubscriptionPlanTemplateInput): void => {
    setSubscriptionPlans(createMockSubscriptionPlanTemplate(payload));
  }, []);

  const applyTenantSubscriptionPlan = useCallback(
    (tenantId: string, purchaseOption: MockSubscriptionPlanPurchaseOption): boolean => {
      const nextSnapshot = applyMockSubscriptionPlanToTenant(tenantId, purchaseOption, {
        actorName: currentOperatorName,
        orderSourceLabel: "运营后台开通",
        paymentChannelLabel: "运营后台确认",
        purchaserName: "-",
        operatorUserId: currentOperatorUserId,
        operatorName: currentOperatorName,
        operatorRoleLabel: currentOperatorRoleLabel,
      });

      if (!nextSnapshot) {
        return false;
      }

      setTenants(currentTenants =>
        currentTenants.map(item =>
          item.id === tenantId
            ? {
                ...item,
                edition: nextSnapshot.edition,
                seatCount: nextSnapshot.totalSeats,
                updatedAt: formatOperationsTimestamp(),
              }
            : item,
        ),
      );

      return true;
    },
    [currentOperatorName, currentOperatorRoleLabel, currentOperatorUserId],
  );

  const updateServiceContactConfig = useCallback(
    (
      config: Pick<
        OperationsServiceContactConfig,
        "enabled" | "contactName" | "qrCodeValue" | "remarkTemplate"
      >,
    ): void => {
      setServiceContactConfig({
        enabled: config.enabled,
        contactName: config.contactName.trim(),
        qrCodeValue: config.qrCodeValue.trim(),
        remarkTemplate: config.remarkTemplate.trim(),
        updatedAt: formatOperationsTimestamp(),
      });
    },
    [],
  );

  const updateCommunityGroupConfig = useCallback(
    (
      config: Pick<
        OperationsCommunityGroupConfig,
        "enabled" | "groupName" | "qrCodeValue" | "description"
      >,
    ): void => {
      setCommunityGroupConfig({
        enabled: config.enabled,
        groupName: config.groupName.trim(),
        qrCodeValue: config.qrCodeValue.trim(),
        description: config.description.trim(),
        updatedAt: formatOperationsTimestamp(),
      });
    },
    [],
  );

  const updateRegistrationStrategy = useCallback(
    (
      config: Partial<
        Pick<
          OperationsRegistrationStrategy,
          | "enabled"
          | "initialPermissionIds"
          | "defaultGiftPoints"
          | "pointsPerCny"
          | "minimumDeductPoints"
          | "roundingUnit"
        >
      >,
    ): void => {
      setRegistrationStrategy(currentStrategy => ({
        ...currentStrategy,
        ...config,
        initialPermissionIds: config.initialPermissionIds
          ? [...config.initialPermissionIds]
          : currentStrategy.initialPermissionIds,
        updatedAt: formatOperationsTimestamp(),
      }));
    },
    [],
  );

  const createAgentPlazaCategory = useCallback(
    (payload: Pick<OperationsAgentPlazaCategoryOption, "zoneId" | "name" | "sortOrder">): void => {
      const updatedAt = formatOperationsTimestamp();

      setAgentPlazaCategories(currentCategories =>
        sortCategoryOptions([
          ...currentCategories,
          {
            id: buildOperationsAgentPlazaCategoryId(),
            zoneId: payload.zoneId,
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
      updates: Partial<
        Pick<OperationsAgentPlazaCategoryOption, "zoneId" | "name" | "sortOrder" | "status">
      >,
    ): void => {
      const currentCategory = agentPlazaCategories.find(item => item.id === categoryId) ?? null;

      if (!currentCategory) {
        return;
      }

      const updatedAt = formatOperationsTimestamp();
      const nextName = updates.name?.trim() || currentCategory.name;
      const hasRenamed = nextName !== currentCategory.name;

      setAgentPlazaCategories(currentCategories =>
        sortCategoryOptions(
          currentCategories.map(item =>
            item.id === categoryId
              ? {
                  ...item,
                  ...updates,
                  zoneId: updates.zoneId ?? item.zoneId,
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
          item.plazaCategory === currentCategory.name ||
          item.plazaCategoryByZone?.[currentCategory.zoneId] === currentCategory.name
            ? {
                ...item,
                plazaCategory: nextName,
                plazaCategoryByZone: {
                  ...(item.plazaCategoryByZone ?? {}),
                  [currentCategory.zoneId]: nextName,
                },
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

  const createAgentStoreZone = useCallback(
    (payload: Pick<OperationsAgentStoreZoneOption, "name" | "sortOrder">): void => {
      const updatedAt = formatOperationsTimestamp();

      setAgentStoreZones(currentZones =>
        sortCategoryOptions([
          ...currentZones,
          {
            id: `ops-agent-store-zone-${Date.now()}`,
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

  const updateAgentStoreZone = useCallback(
    (
      zoneId: string,
      updates: Partial<Pick<OperationsAgentStoreZoneOption, "name" | "sortOrder" | "status">>,
    ): void => {
      const updatedAt = formatOperationsTimestamp();

      setAgentStoreZones(currentZones =>
        sortCategoryOptions(
          currentZones.map(item =>
            item.id === zoneId
              ? {
                  ...item,
                  ...updates,
                  name: updates.name?.trim() || item.name,
                  sortOrder:
                    typeof updates.sortOrder === "number" ? updates.sortOrder : item.sortOrder,
                  status: updates.status ?? item.status,
                  updatedAt,
                }
              : item,
          ),
        ),
      );
    },
    [],
  );

  const createSkillCenterCategory = useCallback(
    (payload: Pick<OperationsSkillCenterCategoryOption, "name" | "sortOrder">): void => {
      const updatedAt = formatOperationsTimestamp();

      setSkillCenterCategories(currentCategories =>
        sortCategoryOptions([
          ...currentCategories,
          {
            id: buildOperationsSkillCenterCategoryId(),
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

  const updateSkillCenterCategory = useCallback(
    (
      categoryId: string,
      updates: Partial<Pick<OperationsSkillCenterCategoryOption, "name" | "sortOrder" | "status">>,
    ): void => {
      const currentCategory = skillCenterCategories.find(item => item.id === categoryId) ?? null;

      if (!currentCategory) {
        return;
      }

      const updatedAt = formatOperationsTimestamp();
      const nextName = updates.name?.trim() || currentCategory.name;

      setSkillCenterCategories(currentCategories =>
        sortCategoryOptions(
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
    },
    [skillCenterCategories],
  );

  const emptyTenantForm = useMemo<OperationsTenantForm>(
    () => createEmptyOperationsTenantForm(),
    [],
  );
  const emptyProductForm = useMemo<OperationsProductForm>(
    () => createEmptyOperationsProductForm(),
    [],
  );

  return {
    tenants,
    agentSubmissions,
    agentStoreZones,
    agentPlazaCategories,
    skillCenterCategories,
    approvedAgentSubmissions,
    approvedAgents: approvedAgentSubmissions,
    products,
    meteringProviders,
    modelServices,
    pointsPackages,
    subscriptionPlans,
    pointsUsageRecords,
    registrationStrategy,
    serviceContactConfig,
    communityGroupConfig,
    emptyTenantForm,
    emptyProductForm,
    tenantStatusLabels: OPERATIONS_TENANT_STATUS_LABELS,
    agentStatusLabels: OPERATIONS_AGENT_STATUS_LABELS,
    productStatusLabels: OPERATIONS_PRODUCT_STATUS_LABELS,
    productSupplyKindLabels: OPERATIONS_PRODUCT_SUPPLY_KIND_LABELS,
    productSaleTypeLabels: OPERATIONS_PRODUCT_SALE_TYPE_LABELS,
    productDeliveryKindLabels: OPERATIONS_PRODUCT_DELIVERY_KIND_LABELS,
    productBillingModeLabels: OPERATIONS_PRODUCT_BILLING_MODE_LABELS,
    productMeteringUnitLabels: OPERATIONS_PRODUCT_METERING_UNIT_LABELS,
    productBillingSpecLabels: OPERATIONS_PRODUCT_BILLING_SPEC_LABELS,
    productDeliveryKindOptions: OPERATIONS_PRODUCT_DELIVERY_KIND_OPTIONS,
    productSaleTypeOptions: OPERATIONS_PRODUCT_SALE_TYPE_OPTIONS,
    productBillingModeOptions: OPERATIONS_PRODUCT_BILLING_MODE_OPTIONS,
    productMeteringUnitOptions: OPERATIONS_PRODUCT_METERING_UNIT_OPTIONS,
    productBillingSpecOptions: OPERATIONS_PRODUCT_BILLING_SPEC_OPTIONS,
    createTenant,
    updateTenant,
    updateTenantStatus,
    rechargeTenantPoints,
    allocateTenantSeats,
    renewTenantSeats,
    revokeTenantEntitlement,
    approveAgent,
    rejectAgent,
    createProduct,
    updateProduct,
    updateProductStatus,
    createMeteringProvider,
    updateMeteringProvider,
    createModelService,
    updateModelService,
    createPointsPackage,
    updatePointsPackage,
    updateSubscriptionPlan,
    createSubscriptionPlan,
    applyTenantSubscriptionPlan,
    updateServiceContactConfig,
    updateCommunityGroupConfig,
    updateRegistrationStrategy,
    createAgentPlazaCategory,
    updateAgentPlazaCategory,
    createAgentStoreZone,
    updateAgentStoreZone,
    createSkillCenterCategory,
    updateSkillCenterCategory,
  };
};
