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
  loadStoredSkillCenterCategories,
  saveStoredSkillCenterCategories,
} from "@/feature/operations/skillCenterCategoryStorage";
import {
  loadStoredMyZoneCategories,
  saveStoredMyZoneCategories,
} from "@/feature/operations/myZoneCategoryStorage";
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
  OPERATIONS_PRODUCT_TRIAL_UNIT_LABELS,
  OPERATIONS_PRODUCT_TRIAL_UNIT_OPTIONS,
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
  createMockSalesChannelContractCode,
  getMockSalesChannelContractCodes,
  getMockSubscriptionPlanTemplates,
  updateMockSalesChannelContractCode,
  updateMockSubscriptionPlanTemplate,
} from "@/feature/subscription/mockSubscriptionPlans";
import type {
  MockSalesChannelContractCode,
  MockSalesChannelContractCodeInput,
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
  OperationsMyZoneCategoryOption,
  OperationsProduct,
  OperationsProductForm,
  OperationsProductSubscriptionPlan,
  OperationsProductSubscriptionPlanStatus,
  OperationsPointsUsageRecord,
  OperationsRegistrationStrategy,
  OperationsServiceContactConfig,
  OperationsSkillCenterCategoryOption,
  OperationsTenant,
  OperationsTenantForm,
  OperationsTenantPointsRechargePayload,
  OperationsTenantSeatAllocationPayload,
} from "@/feature/operations/types";
import { calculateOperationsSalePrice } from "@/feature/operations/serviceMeteringUtils";
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
  myZoneCategories: OperationsMyZoneCategoryOption[];
  approvedAgentSubmissions: OperationsAgentSubmission[];
  approvedAgents: OperationsAgentSubmission[];
  products: OperationsProduct[];
  meteringProviders: OperationsMeteringProvider[];
  modelServices: OperationsModelService[];
  pointsPackages: MockPointsPackageOption[];
  salesChannelContractCodes: MockSalesChannelContractCode[];
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
  productTrialUnitLabels: typeof OPERATIONS_PRODUCT_TRIAL_UNIT_LABELS;
  productDeliveryKindLabels: typeof OPERATIONS_PRODUCT_DELIVERY_KIND_LABELS;
  productBillingModeLabels: typeof OPERATIONS_PRODUCT_BILLING_MODE_LABELS;
  productMeteringUnitLabels: typeof OPERATIONS_PRODUCT_METERING_UNIT_LABELS;
  productBillingSpecLabels: typeof OPERATIONS_PRODUCT_BILLING_SPEC_LABELS;
  productDeliveryKindOptions: typeof OPERATIONS_PRODUCT_DELIVERY_KIND_OPTIONS;
  productSaleTypeOptions: typeof OPERATIONS_PRODUCT_SALE_TYPE_OPTIONS;
  productTrialUnitOptions: typeof OPERATIONS_PRODUCT_TRIAL_UNIT_OPTIONS;
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
  createSalesChannelContractCode: (payload: MockSalesChannelContractCodeInput) => void;
  updateSalesChannelContractCode: (
    code: string,
    updates: Partial<MockSalesChannelContractCodeInput>,
  ) => void;
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
  createMyZoneCategory: (
    payload: Pick<OperationsMyZoneCategoryOption, "name" | "sortOrder">,
  ) => void;
  updateMyZoneCategory: (
    categoryId: string,
    updates: Partial<Pick<OperationsMyZoneCategoryOption, "name" | "sortOrder" | "status">>,
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
const buildAgentPlazaCategoryId = (): string => `ops-agent-plaza-category-${Date.now()}`;
const buildSkillCenterCategoryId = (): string => `ops-skill-center-category-${Date.now()}`;
const buildMyZoneCategoryId = (): string => `ops-my-zone-category-${Date.now()}`;
const buildMeteringProviderId = (): string => `ops-metering-provider-${Date.now()}`;
const buildModelServiceId = (): string => `ops-model-service-${Date.now()}`;
const DEFAULT_ADMIN_SEAT_COUNT = 1;

const buildAdminTenantMember = (adminName: string, adminPhone: string, addedAt: string) => ({
  id: buildTenantMemberId(),
  name: adminName.trim(),
  phone: adminPhone.trim(),
  roleId: DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
  roleLabel: "初始管理员",
  addedAt,
});

const syncAdminTenantMember = (
  members: OperationsTenant["members"],
  adminName: string,
  adminPhone: string,
  fallbackAddedAt: string,
): OperationsTenant["members"] => {
  const adminMemberIndex = members.findIndex(
    item => item.phone === adminPhone.trim() || item.roleLabel.includes("管理员"),
  );

  if (adminMemberIndex < 0) {
    return [buildAdminTenantMember(adminName, adminPhone, fallbackAddedAt), ...members];
  }

  return members.map((item, index) =>
    index === adminMemberIndex
      ? {
          ...item,
          name: adminName.trim(),
          phone: adminPhone.trim(),
          roleId: item.roleId ?? DEFAULT_TENANT_ROLE_IDS.enterpriseAdmin,
          roleLabel: "初始管理员",
        }
      : item,
  );
};

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
    includedSeats: DEFAULT_ADMIN_SEAT_COUNT,
    extraSeatCount: 0,
    planExpiresAt: "长期有效",
    hasAgentListingAccess: tenant.hasAgentListingAccess,
    invitePolicyLabel: "系统已为初始管理员开通 1 个长期有效席位。",
    lowBalanceThreshold: 5000,
    monthlyUsedPoints: 0,
    pointsBalance: 0,
    totalSeats: DEFAULT_ADMIN_SEAT_COUNT,
    usedSeats: DEFAULT_ADMIN_SEAT_COUNT,
    users: [adminUser],
    agentUsageRecords: [],
    pointsLedger: [],
    pointsUsageRecords: [],
    pointsOrders: [],
    subscriptionOrders: [],
  };
};

const buildTenantFromForm = (form: OperationsTenantForm): OperationsTenant => {
  const createdAt = formatTimestamp();
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
    seatCount: DEFAULT_ADMIN_SEAT_COUNT,
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
  id: buildMeteringProviderId(),
  name: form.name.trim(),
  providerKind: form.providerKind,
  baseUrl: form.baseUrl.trim(),
  billingCurrency: form.billingCurrency.trim() || "CNY",
  credentialStatusLabel: form.credentialStatusLabel.trim(),
  status: form.status,
  updatedAt: formatTimestamp(),
});

const buildModelServiceFromForm = (form: OperationsModelServiceForm): OperationsModelService => ({
  id: buildModelServiceId(),
  providerId: form.providerId,
  modelCode: form.modelCode.trim(),
  modelName: form.modelName.trim(),
  inputCostPerMillion: form.inputCostPerMillion,
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
  identityAvatarUrl: "",
  identityName: submission.name,
  identityDescription: submission.description,
  usageGuide: "",
  subscriptionPlans: createDefaultAgentSubscriptionPlans(),
  supportsTrial: false,
  trialUnit: "day",
  trialValue: 7,
  contactMode: "disabled",
  contactQrCodeValue: "",
  contactRemark: "",
  storeZone: submission.plazaCategory === "通用" ? "roleZone" : "industryExpert",
  storeZones: [submission.plazaCategory === "通用" ? "roleZone" : "industryExpert"],
  status: "pendingProductization",
  plazaCategory: OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
  plazaCategoryByZone: {
    [submission.plazaCategory === "通用" ? "roleZone" : "industryExpert"]:
      OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
  },
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
): OperationsProduct => {
  const linkedSubmission =
    form.supplyKind === "agent" && form.linkedAgentId
      ? approvedSubmissions.find(item => item.id === form.linkedAgentId)
      : undefined;
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
    resourcePoolId: undefined,
    resourcePoolName: undefined,
    description: form.description.trim(),
    identityAvatarUrl: form.identityAvatarUrl.trim(),
    identityName: form.identityName.trim(),
    identityDescription: form.identityDescription.trim(),
    usageGuide: form.usageGuide.trim(),
    price: form.saleType === "free" ? 0 : useSubscriptionPlans ? undefined : form.price,
    subscriptionPlans: useSubscriptionPlans
      ? normalizeSubscriptionPlans(form.subscriptionPlans)
      : undefined,
    supportsTrial: form.supportsTrial,
    trialUnit: form.supportsTrial ? form.trialUnit : undefined,
    trialValue: form.supportsTrial ? form.trialValue : undefined,
    contactMode: form.contactMode,
    contactQrCodeValue: form.contactMode === "custom" ? form.contactQrCodeValue.trim() : "",
    contactRemark: form.contactMode === "custom" ? form.contactRemark.trim() : "",
    status: form.plazaStatus === "online" ? "active" : "draft",
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
    updatedAt: formatTimestamp(),
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
  name: submission.name,
  version: submission.version,
  submitter: normalizeSubmissionSubmitter(submission.submitter),
  submittedAt: submission.submittedAt,
  status: submission.status,
  description: submission.description,
  proposedProductName: submission.proposedProductName,
  submitReason: submission.submitReason,
  targetCustomers: submission.targetCustomers,
  currentScopeLabel: submission.currentScopeLabel,
  rejectReason: submission.rejectReason,
  lastReviewedAt: submission.lastReviewedAt,
  plazaCategory: submission.plazaCategory,
  plazaVisibility: submission.plazaVisibility,
  visibleTenantIds: submission.visibleTenantIds,
  visibleTenantNames: submission.visibleTenantNames,
  plazaStatus: submission.plazaStatus,
  plazaUpdatedAt: submission.plazaUpdatedAt,
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
  const [myZoneCategories, setMyZoneCategories] = useState<OperationsMyZoneCategoryOption[]>(() =>
    loadStoredMyZoneCategories(),
  );
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
  const [salesChannelContractCodes, setSalesChannelContractCodes] = useState<
    MockSalesChannelContractCode[]
  >(() => getMockSalesChannelContractCodes());
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
    saveStoredMyZoneCategories(myZoneCategories);
  }, [myZoneCategories]);

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
      const createdAt = formatTimestamp();

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
            actorName: "运营后台",
          },
          ...(matchedSnapshot.pointsLedger ?? []),
        ],
        pointsOrders: [
          {
            id: `${tenantId}-ops-points-order-${timestamp}`,
            orderNo: `OPS-POINTS-${timestamp.toString().slice(-10)}`,
            packageId: payload.packageId,
            packageTitle: payload.packageTitle,
            packagePoints: basePoints,
            totalPoints,
            amount: 0,
            originalAmount: 0,
            discountAmount: 0,
            status: "paid",
            paymentChannelLabel: "线下订单",
            purchaserName: "运营后台",
            createdAt,
            paidAt: createdAt,
          },
          ...(matchedSnapshot.pointsOrders ?? []),
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
    [],
  );

  const allocateTenantSeats = useCallback(
    (tenantId: string, payload: OperationsTenantSeatAllocationPayload): boolean => {
      const matchedSnapshot = getMockTenantManagementSnapshot(tenantId);

      if (!matchedSnapshot) {
        return false;
      }

      const timestamp = Date.now();
      const seatCount = Math.max(Math.floor(payload.seatCount), 1);
      const createdAt = formatTimestamp();
      const nextTotalSeats = Math.max(
        matchedSnapshot.usedSeats,
        matchedSnapshot.totalSeats + seatCount,
      );
      const nextIncludedSeats = matchedSnapshot.includedSeats + seatCount;

      saveMockTenantManagementSnapshot({
        ...matchedSnapshot,
        edition: "team",
        planLabel: payload.planTitle,
        includedSeats: nextIncludedSeats,
        totalSeats: nextTotalSeats,
        teamPlanPackageId: payload.planKey,
        planExpiresAt: payload.expiresAt,
        invitePolicyLabel: `运营已分配 ${seatCount} 个席位，到期时间 ${payload.expiresAt}。`,
        pointsBalance: matchedSnapshot.pointsBalance + Math.max(Math.floor(payload.giftPoints), 0),
        pointsLedger:
          payload.giftPoints > 0
            ? [
                {
                  id: `${tenantId}-ops-seat-gift-points-${timestamp}`,
                  title: `${payload.specTitle}赠送积分`,
                  description: "运营通过内部席位包给租户分配席位时赠送。",
                  points: Math.max(Math.floor(payload.giftPoints), 0),
                  direction: "income",
                  createdAt,
                  actorName: "运营后台",
                },
                ...(matchedSnapshot.pointsLedger ?? []),
              ]
            : matchedSnapshot.pointsLedger,
        subscriptionOrders: [
          {
            id: `${tenantId}-ops-seat-order-${timestamp}`,
            orderNo: `OPS-SEAT-${timestamp.toString().slice(-10)}`,
            planKey: payload.planKey,
            planTitle: payload.specTitle,
            amount: 0,
            seatCount,
            billingCycleLabel: payload.expiresAt === "长期有效" ? "长期有效" : "线下合同周期",
            status: "paid",
            orderSourceLabel: "线下订单",
            paymentChannelLabel: "线下订单",
            purchaserName: "运营后台",
            createdAt,
            paidAt: createdAt,
            billingCycle: payload.specKey,
            unitPrice: 0,
            originalAmount: 0,
            discountAmount: 0,
            expiresAt: payload.expiresAt,
            purchaseMode: "addSeats",
          },
          ...(matchedSnapshot.subscriptionOrders ?? []),
        ],
      });

      setTenants(currentTenants =>
        currentTenants.map(item =>
          item.id === tenantId
            ? {
                ...item,
                edition: "team",
                seatCount: nextTotalSeats,
                updatedAt: createdAt,
              }
            : item,
        ),
      );

      return true;
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
            resourcePoolId: undefined,
            resourcePoolName: undefined,
            description: form.description.trim(),
            identityAvatarUrl: form.identityAvatarUrl.trim(),
            identityName: form.identityName.trim(),
            identityDescription: form.identityDescription.trim(),
            usageGuide: form.usageGuide.trim(),
            price: form.saleType === "free" ? 0 : useSubscriptionPlans ? undefined : form.price,
            subscriptionPlans: useSubscriptionPlans
              ? normalizeSubscriptionPlans(form.subscriptionPlans)
              : undefined,
            supportsTrial: form.supportsTrial,
            trialUnit: form.supportsTrial ? form.trialUnit : undefined,
            trialValue: form.supportsTrial ? form.trialValue : undefined,
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
            updatedAt: formatTimestamp(),
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
                updatedAt: formatTimestamp(),
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

  const createSalesChannelContractCode = useCallback(
    (payload: MockSalesChannelContractCodeInput): void => {
      setSalesChannelContractCodes(createMockSalesChannelContractCode(payload));
    },
    [],
  );

  const updateSalesChannelContractCode = useCallback(
    (code: string, updates: Partial<MockSalesChannelContractCodeInput>): void => {
      setSalesChannelContractCodes(updateMockSalesChannelContractCode(code, updates));
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
        orderSourceLabel: "运营后台开通",
        paymentChannelLabel: "运营后台确认",
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
                updatedAt: formatTimestamp(),
              }
            : item,
        ),
      );

      return true;
    },
    [],
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
        updatedAt: formatTimestamp(),
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
        updatedAt: formatTimestamp(),
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
        updatedAt: formatTimestamp(),
      }));
    },
    [],
  );

  const createAgentPlazaCategory = useCallback(
    (payload: Pick<OperationsAgentPlazaCategoryOption, "zoneId" | "name" | "sortOrder">): void => {
      const updatedAt = formatTimestamp();

      setAgentPlazaCategories(currentCategories =>
        sortCategoryOptions([
          ...currentCategories,
          {
            id: buildAgentPlazaCategoryId(),
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

      const updatedAt = formatTimestamp();
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
      const updatedAt = formatTimestamp();

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
      const updatedAt = formatTimestamp();

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
      const updatedAt = formatTimestamp();

      setSkillCenterCategories(currentCategories =>
        sortCategoryOptions([
          ...currentCategories,
          {
            id: buildSkillCenterCategoryId(),
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

      const updatedAt = formatTimestamp();
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

  const createMyZoneCategory = useCallback(
    (payload: Pick<OperationsMyZoneCategoryOption, "name" | "sortOrder">): void => {
      const updatedAt = formatTimestamp();

      setMyZoneCategories(currentCategories =>
        sortCategoryOptions([
          ...currentCategories,
          {
            id: buildMyZoneCategoryId(),
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

  const updateMyZoneCategory = useCallback(
    (
      categoryId: string,
      updates: Partial<Pick<OperationsMyZoneCategoryOption, "name" | "sortOrder" | "status">>,
    ): void => {
      const currentCategory = myZoneCategories.find(item => item.id === categoryId) ?? null;

      if (!currentCategory) {
        return;
      }

      const updatedAt = formatTimestamp();
      const nextName = updates.name?.trim() || currentCategory.name;

      setMyZoneCategories(currentCategories =>
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
    [myZoneCategories],
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
    myZoneCategories,
    approvedAgentSubmissions,
    approvedAgents: approvedAgentSubmissions,
    products,
    meteringProviders,
    modelServices,
    pointsPackages,
    salesChannelContractCodes,
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
    productTrialUnitLabels: OPERATIONS_PRODUCT_TRIAL_UNIT_LABELS,
    productDeliveryKindLabels: OPERATIONS_PRODUCT_DELIVERY_KIND_LABELS,
    productBillingModeLabels: OPERATIONS_PRODUCT_BILLING_MODE_LABELS,
    productMeteringUnitLabels: OPERATIONS_PRODUCT_METERING_UNIT_LABELS,
    productBillingSpecLabels: OPERATIONS_PRODUCT_BILLING_SPEC_LABELS,
    productDeliveryKindOptions: OPERATIONS_PRODUCT_DELIVERY_KIND_OPTIONS,
    productSaleTypeOptions: OPERATIONS_PRODUCT_SALE_TYPE_OPTIONS,
    productTrialUnitOptions: OPERATIONS_PRODUCT_TRIAL_UNIT_OPTIONS,
    productBillingModeOptions: OPERATIONS_PRODUCT_BILLING_MODE_OPTIONS,
    productMeteringUnitOptions: OPERATIONS_PRODUCT_METERING_UNIT_OPTIONS,
    productBillingSpecOptions: OPERATIONS_PRODUCT_BILLING_SPEC_OPTIONS,
    createTenant,
    updateTenant,
    updateTenantStatus,
    rechargeTenantPoints,
    allocateTenantSeats,
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
    createSalesChannelContractCode,
    updateSalesChannelContractCode,
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
    createMyZoneCategory,
    updateMyZoneCategory,
  };
};
