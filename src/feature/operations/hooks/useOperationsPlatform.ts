import { useCallback, useEffect, useMemo, useState } from "react";

import {
  loadStoredAgentPlazaCategories,
  saveStoredAgentPlazaCategories,
} from "@/feature/operations/agentPlazaCategoryStorage";
import {
  loadStoredOperationsProducts,
  saveStoredOperationsProducts,
} from "@/feature/operations/commerceStorage";
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
  OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
  OPERATIONS_AGENT_STATUS_LABELS,
  OPERATIONS_INITIAL_AGENT_SUBMISSIONS,
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
  OPERATIONS_TENANT_INITIAL_ADMIN_ROLE_OPTIONS,
  createDefaultAgentSubscriptionPlans,
  createEmptyOperationsProductForm,
  createEmptyOperationsTenantForm,
  getOperationsTenantInitialAdminRoleOption,
  resolveOperationsTenantAgentListingAccess,
  type OperationsTenantInitialAdminRoleOption,
} from "@/feature/operations/mockData";
import {
  loadStoredOperationsTenants,
  saveStoredOperationsTenants,
} from "@/feature/operations/tenantStorage";
import type {
  OperationsAgentPlazaCategoryOption,
  OperationsAgentSubmission,
  OperationsCommunityGroupConfig,
  OperationsProduct,
  OperationsProductForm,
  OperationsProductSubscriptionPlan,
  OperationsProductSubscriptionPlanStatus,
  OperationsRegistrationStrategy,
  OperationsServiceContactConfig,
  OperationsSkillCenterCategoryOption,
  OperationsTenant,
  OperationsTenantForm,
} from "@/feature/operations/types";
import {
  loadEnterpriseCommodityApplications,
  saveEnterpriseCommodityApplications,
} from "@/feature/fde/enterpriseCommodityApplications";

interface UseOperationsPlatformResult {
  tenants: OperationsTenant[];
  agentSubmissions: OperationsAgentSubmission[];
  agentPlazaCategories: OperationsAgentPlazaCategoryOption[];
  skillCenterCategories: OperationsSkillCenterCategoryOption[];
  approvedAgentSubmissions: OperationsAgentSubmission[];
  approvedAgents: OperationsAgentSubmission[];
  products: OperationsProduct[];
  registrationStrategy: OperationsRegistrationStrategy;
  serviceContactConfig: OperationsServiceContactConfig;
  communityGroupConfig: OperationsCommunityGroupConfig;
  emptyTenantForm: OperationsTenantForm;
  emptyProductForm: OperationsProductForm;
  tenantInitialAdminRoleOptions: OperationsTenantInitialAdminRoleOption[];
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
  approveAgent: (submissionId: string) => void;
  rejectAgent: (submissionId: string, reason: string) => void;
  createProduct: (form: OperationsProductForm) => void;
  updateProduct: (productId: string, form: OperationsProductForm) => void;
  updateProductStatus: (productId: string, status: OperationsProduct["status"]) => void;
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
    config: Pick<OperationsRegistrationStrategy, "enabled" | "initialPermissionIds">,
  ) => void;
  createAgentPlazaCategory: (
    payload: Pick<OperationsAgentPlazaCategoryOption, "name" | "sortOrder">,
  ) => void;
  updateAgentPlazaCategory: (
    categoryId: string,
    updates: Partial<Pick<OperationsAgentPlazaCategoryOption, "name" | "sortOrder" | "status">>,
  ) => void;
  createSkillCenterCategory: (
    payload: Pick<OperationsSkillCenterCategoryOption, "name" | "sortOrder">,
  ) => void;
  updateSkillCenterCategory: (
    categoryId: string,
    updates: Partial<Pick<OperationsSkillCenterCategoryOption, "name" | "sortOrder" | "status">>,
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

const resolveTenantEditionBySeatCount = (seatCount: number): OperationsTenant["edition"] =>
  seatCount <= 1 ? "personal" : "team";

const buildAdminTenantMember = (
  adminName: string,
  adminPhone: string,
  addedAt: string,
  roleId: string,
  roleLabel: string,
) => ({
  id: buildTenantMemberId(),
  name: adminName.trim(),
  phone: adminPhone.trim(),
  roleId,
  roleLabel,
  addedAt,
});

const syncAdminTenantMember = (
  members: OperationsTenant["members"],
  adminName: string,
  adminPhone: string,
  adminRoleId: string,
  adminRoleLabel: string,
  fallbackAddedAt: string,
): OperationsTenant["members"] => {
  const adminMemberIndex = members.findIndex(
    item => item.phone === adminPhone.trim() || item.roleLabel.includes("管理员"),
  );

  if (adminMemberIndex < 0) {
    return [
      buildAdminTenantMember(adminName, adminPhone, fallbackAddedAt, adminRoleId, adminRoleLabel),
      ...members,
    ];
  }

  return members.map((item, index) =>
    index === adminMemberIndex
      ? {
          ...item,
          name: adminName.trim(),
          phone: adminPhone.trim(),
          roleId: adminRoleId,
          roleLabel: adminRoleLabel,
        }
      : item,
  );
};

const buildTenantFromForm = (form: OperationsTenantForm): OperationsTenant => {
  const createdAt = formatTimestamp();
  const adminRole = getOperationsTenantInitialAdminRoleOption(form.adminRoleId);
  const hasOperationsConsoleAccess = adminRole.moduleLabels.some(label => label.includes("运营"));
  const hasAgentListingAccess = resolveOperationsTenantAgentListingAccess(adminRole.value);

  return {
    id: `ops-tenant-${Date.now()}`,
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    type: "enterprise",
    deploymentMode: "publicCloud",
    edition: resolveTenantEditionBySeatCount(form.seatCount),
    industry: form.industry.trim(),
    adminName: form.adminName.trim(),
    adminPhone: form.adminPhone.trim(),
    adminRoleId: adminRole.value,
    adminRoleLabel: adminRole.label,
    hasAgentListingAccess,
    hasOperationsConsoleAccess,
    seatCount: form.seatCount,
    effectiveAt: form.effectiveAt.trim(),
    expiresAt: form.expiresAt.trim(),
    moduleLabels: adminRole.moduleLabels,
    members: [
      buildAdminTenantMember(
        form.adminName,
        form.adminPhone,
        createdAt,
        adminRole.value,
        adminRole.label,
      ),
    ],
    status: "pending",
    createdAt,
    updatedAt: createdAt,
  };
};

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
    plazaCategory: form.plazaCategory,
    plazaVisibility: form.plazaVisibility,
    visibleTenantIds: form.plazaVisibility === "tenant" ? form.visibleTenantIds : [],
    visibleTenantNames: form.plazaVisibility === "tenant" ? form.visibleTenantNames : [],
    plazaStatus: form.plazaStatus,
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
 * 提供运营后台租户管理与 AI 专家上架审核所需的本地 mock 状态和交互动作。
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
  const [skillCenterCategories, setSkillCenterCategories] = useState<
    OperationsSkillCenterCategoryOption[]
  >(() => loadStoredSkillCenterCategories());
  const [products, setProducts] = useState<OperationsProduct[]>(() =>
    loadStoredOperationsProducts(),
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
    saveStoredSkillCenterCategories(skillCenterCategories);
  }, [skillCenterCategories]);

  useEffect(() => {
    saveStoredOperationsProducts(products);
  }, [products]);

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
    setTenants(currentTenants => [buildTenantFromForm(form), ...currentTenants]);
  }, []);

  const updateTenant = useCallback((tenantId: string, form: OperationsTenantForm): void => {
    const adminRole = getOperationsTenantInitialAdminRoleOption(form.adminRoleId);
    const hasOperationsConsoleAccess = adminRole.moduleLabels.some(label => label.includes("运营"));
    const hasAgentListingAccess = resolveOperationsTenantAgentListingAccess(adminRole.value);

    setTenants(currentTenants =>
      currentTenants.map(item =>
        item.id === tenantId
          ? {
              ...item,
              name: form.name.trim(),
              code: form.code.trim().toUpperCase(),
              edition: resolveTenantEditionBySeatCount(form.seatCount),
              industry: form.industry.trim(),
              adminName: form.adminName.trim(),
              adminPhone: form.adminPhone.trim(),
              adminRoleId: adminRole.value,
              adminRoleLabel: adminRole.label,
              hasAgentListingAccess,
              hasOperationsConsoleAccess,
              seatCount: form.seatCount,
              effectiveAt: form.effectiveAt.trim(),
              expiresAt: form.expiresAt.trim(),
              moduleLabels: adminRole.moduleLabels,
              members: syncAdminTenantMember(
                item.members,
                form.adminName,
                form.adminPhone,
                adminRole.value,
                adminRole.label,
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
    (config: Pick<OperationsRegistrationStrategy, "enabled" | "initialPermissionIds">): void => {
      setRegistrationStrategy(currentStrategy => ({
        ...currentStrategy,
        enabled: config.enabled,
        initialPermissionIds: [...config.initialPermissionIds],
        updatedAt: formatTimestamp(),
      }));
    },
    [],
  );

  const createAgentPlazaCategory = useCallback(
    (payload: Pick<OperationsAgentPlazaCategoryOption, "name" | "sortOrder">): void => {
      const updatedAt = formatTimestamp();

      setAgentPlazaCategories(currentCategories =>
        sortCategoryOptions([
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

  const tenantInitialAdminRoleOptions = useMemo<OperationsTenantInitialAdminRoleOption[]>(
    () => OPERATIONS_TENANT_INITIAL_ADMIN_ROLE_OPTIONS,
    [],
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
    agentPlazaCategories,
    skillCenterCategories,
    approvedAgentSubmissions,
    approvedAgents: approvedAgentSubmissions,
    products,
    registrationStrategy,
    serviceContactConfig,
    communityGroupConfig,
    emptyTenantForm,
    emptyProductForm,
    tenantInitialAdminRoleOptions,
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
    approveAgent,
    rejectAgent,
    createProduct,
    updateProduct,
    updateProductStatus,
    updateServiceContactConfig,
    updateCommunityGroupConfig,
    updateRegistrationStrategy,
    createAgentPlazaCategory,
    updateAgentPlazaCategory,
    createSkillCenterCategory,
    updateSkillCenterCategory,
  };
};
