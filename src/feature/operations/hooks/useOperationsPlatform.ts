import { useCallback, useMemo, useState } from "react";

import {
  loadEnterpriseCommodityApplications,
  saveEnterpriseCommodityApplications,
} from "@/feature/fde/enterpriseCommodityApplications";
import {
  OPERATIONS_AGENT_STATUS_LABELS,
  OPERATIONS_FULFILLMENT_STATUS_LABELS,
  OPERATIONS_INITIAL_AGENT_SUBMISSIONS,
  OPERATIONS_INITIAL_FULFILLMENTS,
  OPERATIONS_INITIAL_PRODUCTS,
  OPERATIONS_INITIAL_RESOURCE_POOLS,
  OPERATIONS_INITIAL_TENANTS,
  OPERATIONS_PRODUCT_SALE_TYPE_LABELS,
  OPERATIONS_PRODUCT_SALE_TYPE_OPTIONS,
  OPERATIONS_PRODUCT_TRIAL_UNIT_LABELS,
  OPERATIONS_PRODUCT_TRIAL_UNIT_OPTIONS,
  OPERATIONS_PRODUCT_BILLING_MODE_LABELS,
  OPERATIONS_PRODUCT_BILLING_MODE_OPTIONS,
  OPERATIONS_PRODUCT_BILLING_SPEC_LABELS,
  OPERATIONS_PRODUCT_BILLING_SPEC_OPTIONS,
  OPERATIONS_PRODUCT_DELIVERY_KIND_LABELS,
  OPERATIONS_PRODUCT_DELIVERY_KIND_OPTIONS,
  OPERATIONS_PRODUCT_METERING_UNIT_LABELS,
  OPERATIONS_PRODUCT_METERING_UNIT_OPTIONS,
  OPERATIONS_PRODUCT_STATUS_LABELS,
  OPERATIONS_PRODUCT_SUPPLY_KIND_LABELS,
  OPERATIONS_RESOURCE_POOL_ALLOCATION_MODE_LABELS,
  OPERATIONS_RESOURCE_POOL_ALLOCATION_MODE_OPTIONS,
  OPERATIONS_RESOURCE_POOL_CAPACITY_UNIT_LABELS,
  OPERATIONS_RESOURCE_POOL_CAPACITY_UNIT_OPTIONS,
  OPERATIONS_RESOURCE_POOL_TYPE_LABELS,
  OPERATIONS_RESOURCE_POOL_TYPE_OPTIONS,
  OPERATIONS_TENANT_STATUS_LABELS,
  createEmptyOperationsProductForm,
  createEmptyOperationsResourcePoolForm,
  createEmptyOperationsTenantForm,
  createEmptyOperationsTenantMemberForm,
} from "@/feature/operations/mockData";
import type {
  OperationsAgentSubmission,
  OperationsFulfillment,
  OperationsProduct,
  OperationsProductForm,
  OperationsResourcePool,
  OperationsResourcePoolForm,
  OperationsTenant,
  OperationsTenantForm,
  OperationsTenantMember,
  OperationsTenantMemberForm,
} from "@/feature/operations/types";

interface UseOperationsPlatformResult {
  tenants: OperationsTenant[];
  agentSubmissions: OperationsAgentSubmission[];
  products: OperationsProduct[];
  fulfillments: OperationsFulfillment[];
  resourcePools: OperationsResourcePool[];
  approvedAgents: OperationsAgentSubmission[];
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
  updateTenant: (tenantId: string, form: OperationsTenantForm) => void;
  addTenantMember: (tenantId: string, form: OperationsTenantMemberForm) => void;
  updateTenantStatus: (tenantId: string, status: OperationsTenant["status"]) => void;
  approveAgent: (submissionId: string) => void;
  rejectAgent: (submissionId: string, reason: string) => void;
  createProduct: (form: OperationsProductForm) => void;
  updateProduct: (productId: string, form: OperationsProductForm) => void;
  createResourcePool: (form: OperationsResourcePoolForm) => void;
  updateResourcePool: (resourcePoolId: string, form: OperationsResourcePoolForm) => void;
  updateProductStatus: (productId: string, status: OperationsProduct["status"]) => void;
  updateAgentPlazaSettings: (
    productId: string,
    patch: Pick<
      OperationsProduct,
      "plazaCategory" | "plazaVisibility" | "visibleTenantIds" | "visibleTenantNames"
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
const buildResourcePoolId = (): string => `ops-resource-pool-${Date.now()}`;

const buildAdminTenantMember = (
  adminName: string,
  adminPhone: string,
  addedAt: string,
): OperationsTenantMember => ({
  id: buildTenantMemberId(),
  name: adminName.trim(),
  phone: adminPhone.trim(),
  roleLabel: "管理员",
  addedAt,
});

const syncAdminTenantMember = (
  members: OperationsTenantMember[],
  adminName: string,
  adminPhone: string,
  fallbackAddedAt: string,
): OperationsTenantMember[] => {
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

const buildTenantFromForm = (form: OperationsTenantForm): OperationsTenant => {
  const createdAt = formatTimestamp();

  return {
    id: `ops-tenant-${Date.now()}`,
    name: form.name.trim(),
    code: form.code.trim().toUpperCase(),
    type: "enterprise",
    industry: form.industry.trim(),
    adminName: form.adminName.trim(),
    adminPhone: form.adminPhone.trim(),
    seatCount: form.seatCount,
    expiresAt: form.expiresAt.trim(),
    moduleLabels: form.moduleLabels,
    members: [buildAdminTenantMember(form.adminName, form.adminPhone, createdAt)],
    status: "pending",
    createdAt,
    updatedAt: createdAt,
  };
};

const buildTenantMemberFromForm = (
  form: OperationsTenantMemberForm,
): OperationsTenantMember => ({
  id: buildTenantMemberId(),
  name: form.name.trim(),
  phone: form.phone.trim(),
  roleLabel: "成员",
  addedAt: formatTimestamp(),
});

const getResourcePoolNameById = (
  resourcePools: OperationsResourcePool[],
  resourcePoolId?: string,
): string | undefined =>
  resourcePoolId
    ? resourcePools.find(item => item.id === resourcePoolId)?.name
    : undefined;

const buildProductFromForm = (
  form: OperationsProductForm,
  approvedAgents: OperationsAgentSubmission[],
  resourcePools: OperationsResourcePool[],
): OperationsProduct => {
  const linkedAgent =
    form.supplyKind === "agent" && form.linkedAgentId
      ? approvedAgents.find(item => item.id === form.linkedAgentId)
      : undefined;
  const resourcePoolId =
    form.deliveryKind === "softwareService" ? undefined : form.resourcePoolId;

  return {
    id: `ops-product-${Date.now()}`,
    name: form.name.trim(),
    supplyKind: form.supplyKind,
    deliveryKind: form.deliveryKind,
    saleType: form.saleType,
    billingMode: form.billingMode,
    meteringUnit: form.meteringUnit,
    billingSpec: form.billingSpec,
    linkedAgentId: linkedAgent?.id,
    linkedAgentName: linkedAgent?.name,
    resourcePoolId,
    resourcePoolName: getResourcePoolNameById(resourcePools, resourcePoolId),
    description: form.description.trim(),
    price: form.saleType === "free" ? 0 : form.price,
    supportsTrial: form.saleType === "paid" ? form.supportsTrial : false,
    trialUnit: form.saleType === "paid" ? form.trialUnit : undefined,
    trialValue:
      form.saleType === "paid" && form.supportsTrial ? form.trialValue : undefined,
    status: "draft",
    updatedAt: formatTimestamp(),
  };
};

const buildPendingProductFromSubmission = (
  submission: OperationsAgentSubmission,
): OperationsProduct => ({
  id: `ops-product-${Date.now()}`,
  name: submission.proposedProductName?.trim() || `${submission.name} 商品版`,
  supplyKind: "agent",
  deliveryKind: "softwareService",
  saleType: "paid",
  billingMode: "subscription",
  meteringUnit: "duration",
  billingSpec: "year",
  linkedAgentId: submission.id,
  linkedAgentName: submission.name,
  description: "该 AI专家 已通过商品化审核，请先完善售价、试用和售卖规则后再上架。",
  price: 0,
  supportsTrial: false,
  trialUnit: "day",
  trialValue: 7,
  status: "pendingProductization",
  updatedAt: formatTimestamp(),
});

const buildResourcePoolFromForm = (
  form: OperationsResourcePoolForm,
): OperationsResourcePool => ({
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

const buildInitialAgentSubmissions = (): OperationsAgentSubmission[] => {
  const persistedApplications = loadEnterpriseCommodityApplications();
  const initialSubmissionIds = new Set(
    OPERATIONS_INITIAL_AGENT_SUBMISSIONS.map(item => item.id),
  );

  return [
    ...persistedApplications.filter(item => !initialSubmissionIds.has(item.id)),
    ...OPERATIONS_INITIAL_AGENT_SUBMISSIONS,
  ];
};

const syncCommodityApplicationReview = (
  submissionId: string,
  patch: Pick<
    OperationsAgentSubmission,
    "status" | "rejectReason" | "lastReviewedAt"
  >,
): void => {
  const persistedApplications = loadEnterpriseCommodityApplications();

  if (!persistedApplications.length) {
    return;
  }

  const nextApplications = persistedApplications.map(item =>
    item.id === submissionId
      ? {
          ...item,
          ...patch,
        }
      : item,
  );

  saveEnterpriseCommodityApplications(nextApplications);
};

/**
 * 提供运营后台原型所需的本地 mock 状态和交互动作。
 */
export const useOperationsPlatform = (): UseOperationsPlatformResult => {
  const [tenants, setTenants] = useState<OperationsTenant[]>(OPERATIONS_INITIAL_TENANTS);
  const [agentSubmissions, setAgentSubmissions] = useState<OperationsAgentSubmission[]>(
    buildInitialAgentSubmissions,
  );
  const [products, setProducts] = useState<OperationsProduct[]>(OPERATIONS_INITIAL_PRODUCTS);
  const [fulfillments, setFulfillments] = useState<OperationsFulfillment[]>(
    OPERATIONS_INITIAL_FULFILLMENTS,
  );
  const [resourcePools, setResourcePools] = useState<OperationsResourcePool[]>(
    OPERATIONS_INITIAL_RESOURCE_POOLS,
  );

  const approvedAgents = useMemo<OperationsAgentSubmission[]>(
    () => agentSubmissions.filter(item => item.status === "approved"),
    [agentSubmissions],
  );

  const createTenant = useCallback((form: OperationsTenantForm): void => {
    const nextTenant = buildTenantFromForm(form);

    setTenants(currentTenants => [nextTenant, ...currentTenants]);
  }, []);

  const updateTenant = useCallback((tenantId: string, form: OperationsTenantForm): void => {
    setTenants(currentTenants =>
      currentTenants.map(item =>
        item.id === tenantId
          ? {
              ...item,
              name: form.name.trim(),
              code: form.code.trim().toUpperCase(),
              industry: form.industry.trim(),
              adminName: form.adminName.trim(),
              adminPhone: form.adminPhone.trim(),
              seatCount: form.seatCount,
              expiresAt: form.expiresAt.trim(),
              moduleLabels: form.moduleLabels,
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

  const addTenantMember = useCallback((tenantId: string, form: OperationsTenantMemberForm): void => {
    setTenants(currentTenants =>
      currentTenants.map(item =>
        item.id === tenantId
          ? item.members.length >= item.seatCount
            ? item
            : {
                ...item,
                members: [...item.members, buildTenantMemberFromForm(form)],
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

  const approveAgent = useCallback((submissionId: string): void => {
    const reviewedAt = formatTimestamp();
    const approvedSubmission =
      agentSubmissions.find(item => item.id === submissionId) ?? null;

    setAgentSubmissions(currentSubmissions =>
      currentSubmissions.map(item =>
        item.id === submissionId
          ? {
              ...item,
              status: "approved",
              rejectReason: undefined,
              lastReviewedAt: reviewedAt,
            }
          : item,
      ),
    );
    syncCommodityApplicationReview(submissionId, {
      status: "approved",
      rejectReason: undefined,
      lastReviewedAt: reviewedAt,
    });
    if (!approvedSubmission) {
      return;
    }

    setProducts(currentProducts => {
      if (currentProducts.some(item => item.linkedAgentId === submissionId)) {
        return currentProducts;
      }

      return [buildPendingProductFromSubmission(approvedSubmission), ...currentProducts];
    });
  }, [agentSubmissions]);

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
    syncCommodityApplicationReview(submissionId, {
      status: "rejected",
      rejectReason: reason.trim(),
      lastReviewedAt: reviewedAt,
    });
  }, []);

  const createProduct = useCallback(
    (form: OperationsProductForm): void => {
      const nextProduct = buildProductFromForm(form, approvedAgents, resourcePools);

      setProducts(currentProducts => [nextProduct, ...currentProducts]);
    },
    [approvedAgents, resourcePools],
  );

  const updateProduct = useCallback(
    (productId: string, form: OperationsProductForm): void => {
      setProducts(currentProducts =>
        currentProducts.map(item => {
          if (item.id !== productId) {
            return item;
          }

          const linkedAgent =
            form.supplyKind === "agent" && form.linkedAgentId
              ? approvedAgents.find(agent => agent.id === form.linkedAgentId)
              : undefined;
          const resourcePoolId =
            form.deliveryKind === "softwareService" ? undefined : form.resourcePoolId;

          return {
            ...item,
            name: form.name.trim(),
            supplyKind: form.supplyKind,
            deliveryKind: form.deliveryKind,
            saleType: form.saleType,
            billingMode: form.billingMode,
            meteringUnit: form.meteringUnit,
            billingSpec: form.billingSpec,
            linkedAgentId: linkedAgent?.id,
            linkedAgentName: linkedAgent?.name,
            resourcePoolId,
            resourcePoolName: getResourcePoolNameById(resourcePools, resourcePoolId),
            description: form.description.trim(),
            price: form.saleType === "free" ? 0 : form.price,
            supportsTrial: form.saleType === "paid" ? form.supportsTrial : false,
            trialUnit: form.saleType === "paid" ? form.trialUnit : undefined,
            trialValue:
              form.saleType === "paid" && form.supportsTrial
                ? form.trialValue
                : undefined,
            status:
              item.status === "pendingProductization" ? "draft" : item.status,
            updatedAt: formatTimestamp(),
          };
        }),
      );
    },
    [approvedAgents, resourcePools],
  );

  const createResourcePool = useCallback((form: OperationsResourcePoolForm): void => {
    const nextResourcePool = buildResourcePoolFromForm(form);

    setResourcePools(currentPools => [nextResourcePool, ...currentPools]);
  }, []);

  const updateResourcePool = useCallback(
    (resourcePoolId: string, form: OperationsResourcePoolForm): void => {
      const updatedAt = formatTimestamp();
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
                updatedAt,
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
                updatedAt,
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
                updatedAt,
              }
            : item,
        ),
      );
    },
    [],
  );

  const updateProductStatus = useCallback(
    (productId: string, status: OperationsProduct["status"]): void => {
      setProducts(currentProducts =>
        currentProducts.map(item =>
          item.id === productId
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

  const updateAgentPlazaSettings = useCallback(
    (
      productId: string,
      patch: Pick<
        OperationsProduct,
        "plazaCategory" | "plazaVisibility" | "visibleTenantIds" | "visibleTenantNames"
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

  return {
    tenants,
    agentSubmissions,
    products,
    fulfillments,
    resourcePools,
    approvedAgents,
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
    updateTenant,
    addTenantMember,
    updateTenantStatus,
    approveAgent,
    rejectAgent,
    createProduct,
    updateProduct,
    createResourcePool,
    updateResourcePool,
    updateProductStatus,
    updateAgentPlazaSettings,
  };
};
