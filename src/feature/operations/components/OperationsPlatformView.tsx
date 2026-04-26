import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AppstoreOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  ControlOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  ReadOutlined,
  RobotOutlined,
  SearchOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import {
  Avatar,
  Button,
  Dropdown,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  message,
} from "antd";
import classNames from "classnames";
import { useNavigate, useParams } from "react-router-dom";

import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import { useOperationsPlatform } from "@/feature/operations/hooks/useOperationsPlatform";
import type { MockTenantPointsOrderItem, MockTenantPointsOrderStatus } from "@/feature/auth/types";
import type { MockPointsPackageOption } from "@/feature/points/types";
import type {
  MockTenantPlanPackageOption,
  MockTenantSeatPricing,
} from "@/feature/tenantPlan/types";
import {
  OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
  OPERATIONS_AGENT_PLAZA_VISIBILITY_LABELS,
  OPERATIONS_DEFAULT_PATH,
  OPERATIONS_TAB_OPTIONS,
} from "@/feature/operations/mockData";
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
  OperationsPlatformTabKey,
  OperationsProduct,
  OperationsProductForm,
  OperationsResourcePool,
  OperationsResourcePoolForm,
  OperationsTenant,
  OperationsTenantForm,
  OperationsTenantMemberForm,
} from "@/feature/operations/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";
import shellStyles from "@/pages/FrontisPage.module.less";

import { OperationsPointsConsole } from "./OperationsPointsConsole";
import styles from "./OperationsPlatformView.module.less";
import {
  OperationsResourceMeteringConsole,
  type OperationsResourceMeteringMode,
} from "./OperationsResourceMeteringConsole";

const USER_MANUAL_ROUTE_PATH = "/user-manual";

interface TenantEditorState {
  open: boolean;
  mode: "create" | "edit";
  tenantId?: string;
  form: OperationsTenantForm;
}

interface TenantMemberEditorState {
  open: boolean;
  tenantId?: string;
  form: OperationsTenantMemberForm;
}

interface ProductEditorState {
  open: boolean;
  mode: "create" | "edit";
  productId?: string;
  form: OperationsProductForm;
}

interface AgentPlazaEditorState {
  open: boolean;
  productId?: string;
  category: NonNullable<OperationsProduct["plazaCategory"]>;
  visibility: NonNullable<OperationsProduct["plazaVisibility"]>;
  visibleTenantIds: string[];
  status: NonNullable<OperationsProduct["plazaStatus"]>;
}

interface AgentPlazaCategoryEditorState {
  open: boolean;
  mode: "create" | "edit";
  categoryId?: string;
  name: string;
  sortOrder: number;
}

interface ResourcePoolEditorState {
  open: boolean;
  mode: "create" | "edit";
  resourcePoolId?: string;
  form: OperationsResourcePoolForm;
}

interface AgentReviewState {
  open: boolean;
  submissionId?: string;
}

interface RejectEditorState {
  open: boolean;
  submissionId?: string;
  reason: string;
}

type AgentFilterValue = "all" | OperationsAgentSubmission["status"];
type AgentPlazaConsoleTabKey = "delivery" | "category";
type TenantDetailTabKey = "base" | "members";
type ProductConsoleTabKey = "standard" | "points" | "team" | "seat";
type ResourcePoolConsoleTabKey = "pools" | OperationsResourceMeteringMode;

interface TenantConsoleProps {
  tenants: OperationsTenant[];
  statusLabels: Record<OperationsTenant["status"], string>;
  onCreate: () => void;
  onViewDetail: (tenantId: string) => void;
}

interface TenantDetailConsoleProps {
  tenant: OperationsTenant | null;
  statusLabels: Record<OperationsTenant["status"], string>;
  onBack: () => void;
  onEdit: (tenant: OperationsTenant) => void;
  onAddMember: (tenant: OperationsTenant) => void;
  onToggleStatus: (tenant: OperationsTenant) => void;
}

interface AgentConsoleProps {
  submissions: OperationsAgentSubmission[];
  statusLabels: Record<OperationsAgentSubmission["status"], string>;
  onOpenReview: (submissionId: string) => void;
}

interface AgentPlazaConsoleProps {
  products: OperationsProduct[];
  tenants: OperationsTenant[];
  categories: OperationsAgentPlazaCategoryOption[];
  plazaVisibilityLabels: typeof OPERATIONS_AGENT_PLAZA_VISIBILITY_LABELS;
  onEdit: (product: OperationsProduct) => void;
  onCreateCategory: () => void;
  onEditCategory: (category: OperationsAgentPlazaCategoryOption) => void;
  onToggleCategoryStatus: (category: OperationsAgentPlazaCategoryOption) => void;
}

interface ProductConsoleProps {
  products: OperationsProduct[];
  pointsPackages: MockPointsPackageOption[];
  teamPackages: MockTenantPlanPackageOption[];
  seatPricing: MockTenantSeatPricing;
  statusLabels: Record<OperationsProduct["status"], string>;
  productSaleTypeLabels: Record<OperationsProduct["saleType"], string>;
  productTrialUnitLabels: Record<NonNullable<OperationsProduct["trialUnit"]>, string>;
  productDeliveryKindLabels: Record<OperationsProduct["deliveryKind"], string>;
  productBillingSpecLabels: Record<NonNullable<OperationsProduct["billingSpec"]>, string>;
  onCreate: () => void;
  onViewDetail: (productId: string) => void;
  onCreatePointsPackage: (
    payload: Pick<
      MockPointsPackageOption,
      "title" | "description" | "points" | "price" | "tagLabel"
    >,
  ) => void;
  onUpdatePointsPackage: (
    packageId: string,
    updates: Partial<
      Pick<
        MockPointsPackageOption,
        "title" | "description" | "points" | "price" | "status" | "sortOrder" | "tagLabel"
      >
    >,
  ) => void;
  onCreateTeamPackage: (
    payload: Pick<
      MockTenantPlanPackageOption,
      "title" | "description" | "includedSeats" | "price" | "tagLabel"
    >,
  ) => void;
  onUpdateTeamPackage: (
    packageId: string,
    updates: Partial<
      Pick<
        MockTenantPlanPackageOption,
        "title" | "description" | "includedSeats" | "price" | "status" | "sortOrder" | "tagLabel"
      >
    >,
  ) => void;
  onUpdateSeatPricing: (
    updates: Partial<Pick<MockTenantSeatPricing, "pricePerSeat" | "billingCycleLabel">>,
  ) => void;
}

interface ProductDetailConsoleProps {
  product: OperationsProduct | null;
  statusLabels: Record<OperationsProduct["status"], string>;
  productSaleTypeLabels: Record<OperationsProduct["saleType"], string>;
  productTrialUnitLabels: Record<NonNullable<OperationsProduct["trialUnit"]>, string>;
  productDeliveryKindLabels: Record<OperationsProduct["deliveryKind"], string>;
  productBillingModeLabels: Record<OperationsProduct["billingMode"], string>;
  productMeteringUnitLabels: Record<OperationsProduct["meteringUnit"], string>;
  productBillingSpecLabels: Record<NonNullable<OperationsProduct["billingSpec"]>, string>;
  onBack: () => void;
  onEdit: (product: OperationsProduct) => void;
  onToggleStatus: (product: OperationsProduct) => void;
}

interface PointsPackageEditorState {
  open: boolean;
  packageId?: string;
  title: string;
  description: string;
  points: number;
  price: number;
  tagLabel: string;
}

interface TeamPackageEditorState {
  open: boolean;
  packageId?: string;
  title: string;
  description: string;
  includedSeats: number;
  price: number;
  tagLabel: string;
}

interface SeatPricingEditorState {
  open: boolean;
  pricePerSeat: number;
}

interface FulfillmentConsoleProps {
  fulfillments: OperationsFulfillment[];
  pointOrders: Array<
    MockTenantPointsOrderItem & {
      tenantId: string;
      tenantName: string;
      tenantCode: string;
    }
  >;
  fulfillmentStatusLabels: Record<OperationsFulfillment["status"], string>;
  productDeliveryKindLabels: Record<OperationsProduct["deliveryKind"], string>;
}

interface ResourcePoolConsoleProps {
  resourcePools: OperationsResourcePool[];
  meteringProviders: OperationsMeteringProvider[];
  modelServices: OperationsModelService[];
  externalMeteredServices: OperationsExternalMeteredService[];
  resourcePoolTypeLabels: Record<OperationsResourcePool["resourceType"], string>;
  resourcePoolAllocationModeLabels: Record<OperationsResourcePool["allocationMode"], string>;
  resourcePoolCapacityUnitLabels: Record<OperationsResourcePool["capacityUnit"], string>;
  onCreate: () => void;
  onEdit: (resourcePool: OperationsResourcePool) => void;
  onCreateMeteringProvider: (form: OperationsMeteringProviderForm) => void;
  onUpdateMeteringProvider: (providerId: string, form: OperationsMeteringProviderForm) => void;
  onCreateModelService: (form: OperationsModelServiceForm) => void;
  onUpdateModelService: (modelId: string, form: OperationsModelServiceForm) => void;
  onCreateExternalMeteredService: (form: OperationsExternalMeteredServiceForm) => void;
  onUpdateExternalMeteredService: (
    serviceId: string,
    form: OperationsExternalMeteredServiceForm,
  ) => void;
}

const OPERATIONS_TAB_ICON_MAP: Record<OperationsPlatformTabKey, JSX.Element> = {
  tenants: <ApartmentOutlined />,
  agentPlaza: <AppstoreOutlined />,
  agents: <RobotOutlined />,
  products: <ShopOutlined />,
  fulfillment: <DeploymentUnitOutlined />,
  resources: <DatabaseOutlined />,
  points: <ControlOutlined />,
};

const TENANT_FIELD_IDS = {
  name: "operations-tenant-name",
  code: "operations-tenant-code",
  industry: "operations-tenant-industry",
  adminName: "operations-tenant-admin-name",
  adminPhone: "operations-tenant-admin-phone",
  agentListingService: "operations-tenant-agent-listing-service",
  seatCount: "operations-tenant-seat-count",
  effectiveAt: "operations-tenant-effective-at",
  expiresAt: "operations-tenant-expires-at",
  moduleLabels: "operations-tenant-module-labels",
} as const;

const TENANT_MEMBER_FIELD_IDS = {
  name: "operations-tenant-member-name",
  phone: "operations-tenant-member-phone",
} as const;

const PRODUCT_FIELD_IDS = {
  name: "operations-product-name",
  supplyKind: "operations-product-supply-kind",
  deliveryKind: "operations-product-delivery-kind",
  saleType: "operations-product-sale-type",
  billingMode: "operations-product-billing-mode",
  meteringUnit: "operations-product-metering-unit",
  billingSpec: "operations-product-billing-spec",
  linkedAgentId: "operations-product-linked-agent",
  resourcePoolId: "operations-product-resource-pool",
  price: "operations-product-price",
  supportsTrial: "operations-product-supports-trial",
  trialUnit: "operations-product-trial-unit",
  trialValue: "operations-product-trial-value",
  freeRule: "operations-product-free-rule",
  description: "operations-product-description",
} as const;

const AGENT_PLAZA_FIELD_IDS = {
  category: "operations-agent-plaza-category",
  visibility: "operations-agent-plaza-visibility",
  visibleTenantIds: "operations-agent-plaza-visible-tenants",
  status: "operations-agent-plaza-status",
} as const;

const AGENT_PLAZA_CATEGORY_FIELD_IDS = {
  name: "operations-agent-plaza-category-name",
  sortOrder: "operations-agent-plaza-category-sort-order",
} as const;

const RESOURCE_POOL_FIELD_IDS = {
  name: "operations-resource-pool-name",
  resourceType: "operations-resource-pool-type",
  provider: "operations-resource-pool-provider",
  allocationMode: "operations-resource-pool-allocation-mode",
  totalCapacity: "operations-resource-pool-total-capacity",
  availableCapacity: "operations-resource-pool-available-capacity",
  capacityUnit: "operations-resource-pool-capacity-unit",
} as const;

const REJECT_FIELD_ID = "operations-agent-reject-reason";
const OPERATIONS_TENANT_LIST_PATH = "/ops/tenants";
const OPERATIONS_PRODUCT_LIST_PATH = "/ops/products";

const getTabKeyFromPath = (tabPath?: string): OperationsPlatformTabKey | null => {
  if (
    tabPath === "tenants" ||
    tabPath === "agentPlaza" ||
    tabPath === "agents" ||
    tabPath === "products" ||
    tabPath === "fulfillment" ||
    tabPath === "resources" ||
    tabPath === "points"
  ) {
    return tabPath;
  }

  return null;
};

const PRODUCT_CONSOLE_TAB_OPTIONS: Array<{
  key: ProductConsoleTabKey;
  label: string;
}> = [
  { key: "standard", label: "AI专家与资源商品" },
  { key: "points", label: "积分包商品" },
  { key: "team", label: "团队套餐商品" },
  { key: "seat", label: "席位加购商品" },
];

const AGENT_PLAZA_CONSOLE_TAB_OPTIONS: Array<{
  key: AgentPlazaConsoleTabKey;
  label: string;
}> = [
  { key: "delivery", label: "投放管理" },
  { key: "category", label: "分类管理" },
];

const RESOURCE_POOL_CONSOLE_TAB_OPTIONS: Array<{
  key: ResourcePoolConsoleTabKey;
  label: string;
}> = [
  { key: "pools", label: "资源池列表" },
  { key: "models", label: "大模型资源" },
  { key: "interfaces", label: "接口资源" },
];

const OPERATIONS_MODAL_WIDTHS = {
  compact: 560,
  standard: 720,
  large: 880,
  productEditor: 860,
  review: 760,
} as const;

const buildTenantDetailPath = (tenantId: string): string =>
  `${OPERATIONS_TENANT_LIST_PATH}/${tenantId}`;

const buildProductDetailPath = (productId: string): string =>
  `${OPERATIONS_PRODUCT_LIST_PATH}/${productId}`;

const formatCurrency = (value: number): string => `¥${value.toLocaleString("zh-CN")}`;

const buildStatusClassName = (tone?: "primary" | "success" | "warning" | "danger"): string =>
  classNames(
    adminStyles.consoleStatusTag,
    tone === "primary" && adminStyles.consoleStatusTagPrimary,
    tone === "success" && adminStyles.consoleStatusTagSuccess,
    tone === "warning" && adminStyles.consoleStatusTagWarning,
    tone === "danger" && adminStyles.consoleStatusTagDanger,
  );

const getTenantStatusClassName = (status: OperationsTenant["status"]): string => {
  if (status === "active") {
    return buildStatusClassName("success");
  }

  if (status === "pending") {
    return buildStatusClassName("warning");
  }

  return buildStatusClassName("danger");
};

const getAgentStatusClassName = (status: OperationsAgentSubmission["status"]): string => {
  if (status === "approved") {
    return buildStatusClassName("success");
  }

  if (status === "pending") {
    return buildStatusClassName("warning");
  }

  return buildStatusClassName("danger");
};

const getProductStatusClassName = (status: OperationsProduct["status"]): string => {
  if (status === "active") {
    return buildStatusClassName("success");
  }

  if (status === "pendingProductization" || status === "draft") {
    return buildStatusClassName("warning");
  }

  return buildStatusClassName();
};

const getAgentPlazaStatus = (
  product: OperationsProduct,
): NonNullable<OperationsProduct["plazaStatus"]> =>
  product.plazaStatus ?? (product.status === "active" ? "online" : "offline");

const getAgentPlazaStatusClassName = (
  status: NonNullable<OperationsProduct["plazaStatus"]>,
): string =>
  status === "online" ? buildStatusClassName("success") : buildStatusClassName("danger");

const getAgentPlazaStatusLabel = (status: NonNullable<OperationsProduct["plazaStatus"]>): string =>
  status === "online" ? "已上架" : "已下架";

const getAgentPlazaCategoryStatusClassName = (
  status: OperationsAgentPlazaCategoryOption["status"],
): string => (status === "active" ? buildStatusClassName("success") : buildStatusClassName());

const getAgentPlazaCategoryStatusLabel = (
  status: OperationsAgentPlazaCategoryOption["status"],
): string => (status === "active" ? "启用" : "停用");

const getSortedAgentPlazaCategories = (
  categories: OperationsAgentPlazaCategoryOption[],
): OperationsAgentPlazaCategoryOption[] =>
  [...categories].sort((leftItem, rightItem) => {
    if (leftItem.sortOrder !== rightItem.sortOrder) {
      return leftItem.sortOrder - rightItem.sortOrder;
    }

    return leftItem.updatedAt.localeCompare(rightItem.updatedAt);
  });

const getAgentPlazaCategorySelectOptions = (
  categories: OperationsAgentPlazaCategoryOption[],
  currentCategory: string,
): Array<{ label: string; value: string; disabled?: boolean }> => {
  const activeOptions = getSortedAgentPlazaCategories(categories)
    .filter(item => item.status === "active")
    .map(item => ({
      label: item.name,
      value: item.name,
    }));
  const hasCurrentOption = activeOptions.some(item => item.value === currentCategory);

  if (hasCurrentOption || !currentCategory.trim()) {
    return activeOptions;
  }

  return [
    {
      label: `${currentCategory}（已停用）`,
      value: currentCategory,
      disabled: true,
    },
    ...activeOptions,
  ];
};

const getFulfillmentStatusClassName = (status: OperationsFulfillment["status"]): string => {
  if (status === "active" || status === "completed") {
    return buildStatusClassName("success");
  }

  if (status === "pending" || status === "delivering") {
    return buildStatusClassName("warning");
  }

  return buildStatusClassName("primary");
};

const POINT_ORDER_STATUS_LABELS: Record<MockTenantPointsOrderStatus, string> = {
  paid: "已支付",
  pending: "待支付",
  expired: "已过期",
  closed: "已关闭",
};

const getPaymentStatusClassName = (status: MockTenantPointsOrderStatus | "paid"): string => {
  if (status === "paid") {
    return buildStatusClassName("success");
  }

  if (status === "pending") {
    return buildStatusClassName("warning");
  }

  return buildStatusClassName("danger");
};

interface OperationsOrderCenterRow {
  id: string;
  orderNo: string;
  orderTypeLabel: string;
  tenantName: string;
  tenantCode?: string;
  productName: string;
  productMeta: string;
  amountLabel: string;
  purchaserName: string;
  paymentStatusLabel: string;
  paymentStatusClassName: string;
  fulfillmentStatusLabel: string;
  fulfillmentStatusClassName: string;
  fulfillmentResult: string;
  paidAt: string;
  updatedAt: string;
  searchText: string;
}

const getTenantMemberInitial = (name: string): string => Array.from(name.trim())[0] ?? "员";

const getProductBillingSpecLabel = (
  productBillingSpecLabels: Record<NonNullable<OperationsProduct["billingSpec"]>, string>,
  billingSpec: OperationsProduct["billingSpec"],
): string => (billingSpec ? productBillingSpecLabels[billingSpec] : "-");

const getActiveSubscriptionPlans = (product: OperationsProduct) =>
  (product.subscriptionPlans ?? [])
    .filter(item => item.status === "active")
    .sort((leftItem, rightItem) => leftItem.sortOrder - rightItem.sortOrder);

const getPrimarySubscriptionPlan = (product: OperationsProduct) =>
  getActiveSubscriptionPlans(product)[0];

const getSubscriptionPlansSummary = (product: OperationsProduct): string => {
  const activePlans = getActiveSubscriptionPlans(product);

  if (!activePlans.length) {
    return "未配置订阅方案";
  }

  return activePlans.map(item => item.title).join(" / ");
};

const getProductPriceLabel = (
  product: OperationsProduct,
  productBillingSpecLabels: Record<NonNullable<OperationsProduct["billingSpec"]>, string>,
): string => {
  if (product.saleType === "free") {
    return "免费";
  }

  const primaryPlan = getPrimarySubscriptionPlan(product);

  if (primaryPlan) {
    return `${formatCurrency(primaryPlan.price)} / ${primaryPlan.title}`;
  }

  return `${formatCurrency(product.price ?? 0)} / ${getProductBillingSpecLabel(
    productBillingSpecLabels,
    product.billingSpec,
  )}`;
};

const getProductTrialLabel = (
  product: OperationsProduct,
  productTrialUnitLabels: Record<NonNullable<OperationsProduct["trialUnit"]>, string>,
): string => {
  if (!product.supportsTrial || !product.trialUnit || !product.trialValue) {
    return "不支持试用";
  }

  return `${product.trialValue}${productTrialUnitLabels[product.trialUnit]}`;
};

const getResourcePoolTypeByDeliveryKind = (
  deliveryKind: OperationsProduct["deliveryKind"],
): OperationsResourcePool["resourceType"] | null => {
  if (deliveryKind === "physicalDevice") {
    return "physicalDevice";
  }

  if (deliveryKind === "virtualDevice") {
    return "virtualDevice";
  }

  if (deliveryKind === "thirdPartyApi") {
    return "thirdPartyApi";
  }

  return null;
};

const getAvailableResourcePoolOptions = (
  resourcePools: OperationsResourcePool[],
  deliveryKind: OperationsProduct["deliveryKind"],
): Array<{
  value: string;
  label: string;
}> => {
  const resourceType = getResourcePoolTypeByDeliveryKind(deliveryKind);

  if (!resourceType) {
    return [];
  }

  return resourcePools
    .filter(item => item.resourceType === resourceType)
    .map(item => ({
      value: item.id,
      label: item.name,
    }));
};

const getAvailableCapacityUnitOptions = (
  capacityUnitOptions: Array<{
    value: OperationsResourcePool["capacityUnit"];
    label: string;
    resourceTypes: OperationsResourcePool["resourceType"][];
  }>,
  resourceType: OperationsResourcePool["resourceType"],
): Array<{
  value: OperationsResourcePool["capacityUnit"];
  label: string;
}> =>
  capacityUnitOptions
    .filter(item => item.resourceTypes.includes(resourceType))
    .map(item => ({
      value: item.value,
      label: item.label,
    }));

const getResourcePoolCapacityLabel = (
  resourcePool: OperationsResourcePool,
  resourcePoolCapacityUnitLabels: Record<OperationsResourcePool["capacityUnit"], string>,
): string =>
  `${resourcePool.availableCapacity}/${resourcePool.totalCapacity} ${resourcePoolCapacityUnitLabels[resourcePool.capacityUnit]}`;

const getAvailableMeteringUnitOptions = (
  meteringUnitOptions: Array<{
    value: OperationsProduct["meteringUnit"];
    label: string;
  }>,
  billingSpecOptions: Array<{
    value: OperationsProduct["billingSpec"];
    label: string;
    modes: OperationsProduct["billingMode"][];
    units: OperationsProduct["meteringUnit"][];
  }>,
  billingMode: OperationsProduct["billingMode"],
): Array<{
  value: OperationsProduct["meteringUnit"];
  label: string;
}> => {
  const allowedUnits = new Set<OperationsProduct["meteringUnit"]>(
    billingSpecOptions.filter(item => item.modes.includes(billingMode)).flatMap(item => item.units),
  );

  return meteringUnitOptions.filter(item => allowedUnits.has(item.value));
};

const getAvailableBillingSpecOptions = (
  billingSpecOptions: Array<{
    value: OperationsProduct["billingSpec"];
    label: string;
    modes: OperationsProduct["billingMode"][];
    units: OperationsProduct["meteringUnit"][];
  }>,
  billingMode: OperationsProduct["billingMode"],
  meteringUnit: OperationsProduct["meteringUnit"],
): Array<{
  value: OperationsProduct["billingSpec"];
  label: string;
}> =>
  billingSpecOptions
    .filter(item => item.modes.includes(billingMode) && item.units.includes(meteringUnit))
    .map(item => ({
      value: item.value,
      label: item.label,
    }));

const TenantConsole = ({
  tenants,
  statusLabels,
  onCreate,
  onViewDetail,
}: TenantConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");

  const filteredTenants = useMemo<OperationsTenant[]>(
    () =>
      tenants.filter(item => {
        const searchSource = [item.name, item.adminName, item.adminPhone, ...item.moduleLabels]
          .join(" ")
          .toLowerCase();

        return searchSource.includes(keyword.trim().toLowerCase());
      }),
    [keyword, tenants],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>租户管理</h1>
        </div>
        <div className={adminStyles.consoleHeaderSide}>
          <Input
            className={adminStyles.consoleInlineSearch}
            value={keyword}
            placeholder="搜索租户名称、管理员"
            onChange={event => setKeyword(event.target.value)}
          />
          <Button type="primary" onClick={onCreate}>
            创建租户
          </Button>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>租户列表</h2>
          </div>
        </div>

        {filteredTenants.length ? (
          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>租户</th>
                  <th>管理员</th>
                  <th>开通范围</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map(tenant => (
                  <tr key={tenant.id}>
                    <td>
                      <button
                        type="button"
                        className={styles.tenantEntryButton}
                        onClick={() => onViewDetail(tenant.id)}
                      >
                        <span className={styles.tenantEntryTitle}>{tenant.name}</span>
                      </button>
                    </td>
                    <td>
                      {tenant.adminName} · {tenant.adminPhone}
                    </td>
                    <td className={styles.tenantModulesCell}>{tenant.moduleLabels.join("、")}</td>
                    <td>
                      <span className={getTenantStatusClassName(tenant.status)}>
                        {statusLabels[tenant.status]}
                      </span>
                    </td>
                    <td>{tenant.updatedAt}</td>
                    <td>
                      <Button size="small" type="link" onClick={() => onViewDetail(tenant.id)}>
                        查看详情
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyWrap}>
            <Empty description="当前筛选下暂无租户。" />
          </div>
        )}
      </section>
    </div>
  );
};

const TenantDetailConsole = ({
  tenant,
  statusLabels,
  onBack,
  onEdit,
  onAddMember,
  onToggleStatus,
}: TenantDetailConsoleProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TenantDetailTabKey>("base");
  const [memberKeyword, setMemberKeyword] = useState<string>("");

  useEffect(() => {
    setActiveTab("base");
    setMemberKeyword("");
  }, [tenant?.id]);

  const filteredMembers = useMemo(() => {
    if (!tenant) {
      return [];
    }

    const keyword = memberKeyword.trim().toLowerCase();

    if (!keyword) {
      return tenant.members;
    }

    return tenant.members.filter(member =>
      [member.name, member.phone, member.roleLabel].join(" ").toLowerCase().includes(keyword),
    );
  }, [memberKeyword, tenant]);

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <div className={adminStyles.consoleActions}>
            <Button type="link" size="small" onClick={onBack}>
              返回租户列表
            </Button>
          </div>
          <h1 className={adminStyles.consoleTitle}>{tenant?.name ?? "租户详情"}</h1>
        </div>

        {tenant ? (
          <div className={adminStyles.consoleActions}>
            <span className={getTenantStatusClassName(tenant.status)}>
              {statusLabels[tenant.status]}
            </span>
            <Button onClick={() => onEdit(tenant)}>编辑资料</Button>
            <Button onClick={() => onToggleStatus(tenant)}>
              {tenant.status === "suspended" ? "启用租户" : "停用租户"}
            </Button>
          </div>
        ) : null}
      </header>

      {tenant ? (
        <section className={adminStyles.consoleSection}>
          <div className={styles.detailTabBar}>
            <button
              type="button"
              className={classNames(
                styles.detailTabButton,
                activeTab === "base" && styles.detailTabButtonActive,
              )}
              onClick={() => setActiveTab("base")}
            >
              基本信息
            </button>
            <button
              type="button"
              className={classNames(
                styles.detailTabButton,
                activeTab === "members" && styles.detailTabButtonActive,
              )}
              onClick={() => setActiveTab("members")}
            >
              成员管理
            </button>
          </div>

          {activeTab === "base" ? (
            <div className={classNames(styles.detailGrid, styles.tenantDetailGrid)}>
              <section className={adminStyles.detailBlock}>
                <h3
                  className={classNames(adminStyles.detailBlockTitle, styles.detailBlockTitleReset)}
                >
                  基础信息
                </h3>
                <div className={adminStyles.consoleRows}>
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>管理员</span>
                    <span className={adminStyles.consoleInfoValue}>
                      {tenant.adminName || "待录入"} · {tenant.adminPhone || "待补充"}
                    </span>
                  </div>
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>席位数量</span>
                    <span className={adminStyles.consoleInfoValue}>{tenant.seatCount}</span>
                  </div>
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>已用席位</span>
                    <span className={adminStyles.consoleInfoValue}>{tenant.members.length}</span>
                  </div>
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>AI专家上架服务</span>
                    <span className={adminStyles.consoleInfoValue}>
                      {tenant.hasAgentListingAccess ? "已开通" : "未开通"}
                    </span>
                  </div>
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>生效时间</span>
                    <span className={adminStyles.consoleInfoValue}>{tenant.effectiveAt}</span>
                  </div>
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>到期时间</span>
                    <span className={adminStyles.consoleInfoValue}>{tenant.expiresAt}</span>
                  </div>
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>创建时间</span>
                    <span className={adminStyles.consoleInfoValue}>{tenant.createdAt}</span>
                  </div>
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>更新时间</span>
                    <span className={adminStyles.consoleInfoValue}>{tenant.updatedAt}</span>
                  </div>
                </div>
              </section>

              <section className={adminStyles.detailBlock}>
                <h3
                  className={classNames(adminStyles.detailBlockTitle, styles.detailBlockTitleReset)}
                >
                  开通范围
                </h3>
                <div className={styles.pillRow}>
                  {tenant.moduleLabels.map(label => (
                    <span key={label} className={adminStyles.consolePill}>
                      {label}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className={styles.memberTabPanel}>
              <div className={styles.memberSearchRow}>
                <Input
                  className={styles.memberSearch}
                  value={memberKeyword}
                  placeholder="搜索成员姓名或手机号"
                  prefix={<SearchOutlined />}
                  onChange={event => setMemberKeyword(event.target.value)}
                />
              </div>

              <div className={styles.memberSection}>
                <div className={styles.memberSectionHeader}>
                  <div>
                    <h3 className={styles.memberSectionTitle}>成员</h3>
                    <p className={styles.memberSectionMeta}>
                      {tenant.members.length}/{tenant.seatCount} 席
                    </p>
                  </div>
                  <Button
                    type="primary"
                    onClick={() => onAddMember(tenant)}
                    disabled={tenant.members.length >= tenant.seatCount}
                  >
                    添加成员
                  </Button>
                </div>

                {filteredMembers.length ? (
                  <div className={styles.memberList}>
                    {filteredMembers.map(member => (
                      <div key={member.id} className={styles.memberRow}>
                        <Avatar className={styles.memberAvatar} size={48}>
                          {getTenantMemberInitial(member.name)}
                        </Avatar>
                        <div className={styles.memberBody}>
                          <span className={styles.memberName}>{member.name}</span>
                          <span className={styles.memberMeta}>
                            {member.roleLabel} · {member.phone}
                          </span>
                        </div>
                        <span className={styles.memberAddedAt}>{member.addedAt}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyWrap}>
                    <Empty description="当前筛选下暂无成员。" />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className={adminStyles.consoleSection}>
          <div className={styles.emptyWrap}>
            <Empty description="未找到该租户。">
              <Button onClick={onBack}>返回租户列表</Button>
            </Empty>
          </div>
        </section>
      )}
    </div>
  );
};

const AgentConsole = ({
  submissions,
  statusLabels,
  onOpenReview,
}: AgentConsoleProps): JSX.Element => {
  const [statusFilter, setStatusFilter] = useState<AgentFilterValue>("all");
  const [keyword, setKeyword] = useState<string>("");

  const filteredSubmissions = useMemo<OperationsAgentSubmission[]>(
    () =>
      submissions
        .filter(item => (statusFilter === "all" ? true : item.status === statusFilter))
        .filter(item => {
          const searchSource = [item.name, item.version, item.submitter].join(" ").toLowerCase();

          return searchSource.includes(keyword.trim().toLowerCase());
        }),
    [keyword, statusFilter, submissions],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>AI专家审核</h1>
        </div>

        <div className={adminStyles.consoleHeaderSide}>
          <Input
            className={adminStyles.consoleInlineSearch}
            value={keyword}
            placeholder="搜索 AI专家名称、版本、提审人"
            onChange={event => setKeyword(event.target.value)}
          />
          <Select<AgentFilterValue>
            value={statusFilter}
            options={[
              { value: "all", label: "全部状态" },
              { value: "pending", label: "待审核" },
              { value: "approved", label: "审核通过" },
              { value: "rejected", label: "审核驳回" },
            ]}
            onChange={setStatusFilter}
          />
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>商品化申请列表</h2>
          </div>
        </div>

        {filteredSubmissions.length ? (
          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>AI专家</th>
                  <th>申请类型</th>
                  <th>版本</th>
                  <th>提审人</th>
                  <th>状态</th>
                  <th>提审时间</th>
                  <th>最近处理</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(submission => (
                  <tr key={submission.id}>
                    <td>
                      <button
                        type="button"
                        className={styles.recordEntryButton}
                        onClick={() => onOpenReview(submission.id)}
                      >
                        <span className={styles.recordEntryTitle}>{submission.name}</span>
                      </button>
                    </td>
                    <td>
                      {submission.submissionType === "commodityApplication"
                        ? "发布为商品"
                        : "广场发布"}
                    </td>
                    <td>{submission.version}</td>
                    <td>{submission.submitter}</td>
                    <td>
                      <span className={getAgentStatusClassName(submission.status)}>
                        {statusLabels[submission.status]}
                      </span>
                    </td>
                    <td>{submission.submittedAt}</td>
                    <td>{submission.lastReviewedAt ?? "待处理"}</td>
                    <td>
                      <Button size="small" type="link" onClick={() => onOpenReview(submission.id)}>
                        审批
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyWrap}>
            <Empty description="当前筛选下暂无提审记录。" />
          </div>
        )}
      </section>
    </div>
  );
};

const AgentPlazaConsole = ({
  products,
  tenants,
  categories,
  plazaVisibilityLabels,
  onEdit,
  onCreateCategory,
  onEditCategory,
  onToggleCategoryStatus,
}: AgentPlazaConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [activeConsoleTab, setActiveConsoleTab] = useState<AgentPlazaConsoleTabKey>("delivery");

  const sortedCategories = useMemo<OperationsAgentPlazaCategoryOption[]>(
    () => getSortedAgentPlazaCategories(categories),
    [categories],
  );
  const agentProducts = useMemo<OperationsProduct[]>(
    () => products.filter(item => item.supplyKind === "agent"),
    [products],
  );

  const filteredProducts = useMemo<OperationsProduct[]>(
    () =>
      agentProducts.filter(item => {
        const searchSource = [
          item.name,
          item.linkedAgentName ?? "",
          item.plazaCategory ?? "",
          ...(item.visibleTenantNames ?? []),
        ]
          .join(" ")
          .toLowerCase();

        return searchSource.includes(keyword.trim().toLowerCase());
      }),
    [agentProducts, keyword],
  );

  const enterpriseTenantCount = tenants.filter(item => item.type === "enterprise").length;
  const activeCategoryCount = sortedCategories.filter(item => item.status === "active").length;

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>AI专家广场管理</h1>
          <p className={adminStyles.consoleSubtitle}>
            仅维护已商品化 AI 专家的广场投放信息，管理分类、展示范围和指定租户可见性。
          </p>
        </div>

        <div className={adminStyles.consoleHeaderSide}>
          {activeConsoleTab === "delivery" ? (
            <Input
              className={adminStyles.consoleInlineSearch}
              value={keyword}
              placeholder="搜索商品名称、AI专家、分类、可见租户"
              onChange={event => setKeyword(event.target.value)}
            />
          ) : (
            <Button type="primary" onClick={onCreateCategory}>
              <PlusOutlined />
              新建分类
            </Button>
          )}
        </div>
      </header>

      <div className={styles.detailTabBar}>
        {AGENT_PLAZA_CONSOLE_TAB_OPTIONS.map(item => (
          <button
            key={item.key}
            type="button"
            className={classNames(
              styles.detailTabButton,
              activeConsoleTab === item.key && styles.detailTabButtonActive,
            )}
            onClick={() => setActiveConsoleTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeConsoleTab === "delivery" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>投放列表</h2>
              <p className={adminStyles.consoleSectionMeta}>
                当前显示 {filteredProducts.length} 个 AI 专家商品；全部共 {agentProducts.length}{" "}
                个，支持 {enterpriseTenantCount} 个企业租户定向投放。
              </p>
            </div>
          </div>

          {filteredProducts.length ? (
            <div className={adminStyles.consoleHtmlTableWrap}>
              <table className={adminStyles.consoleHtmlTable}>
                <thead>
                  <tr>
                    <th>AI专家</th>
                    <th>商品名称</th>
                    <th>广场分类</th>
                    <th>可见范围</th>
                    <th>广场状态</th>
                    <th>商品状态</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const visibilityLabel =
                      product.plazaVisibility === "tenant"
                        ? `${plazaVisibilityLabels.tenant} · ${
                            product.visibleTenantNames?.join("、") || "未选择租户"
                          }`
                        : plazaVisibilityLabels.public;
                    const plazaStatus = getAgentPlazaStatus(product);

                    return (
                      <tr key={product.id}>
                        <td>{product.linkedAgentName ?? "未绑定 AI专家"}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.recordEntryButton}
                            onClick={() => onEdit(product)}
                          >
                            <span className={styles.recordEntryTitle}>{product.name}</span>
                          </button>
                        </td>
                        <td>{product.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY}</td>
                        <td>{visibilityLabel}</td>
                        <td>
                          <span className={getAgentPlazaStatusClassName(plazaStatus)}>
                            {getAgentPlazaStatusLabel(plazaStatus)}
                          </span>
                        </td>
                        <td>
                          <span className={getProductStatusClassName(product.status)}>
                            {product.status === "active"
                              ? "已上架"
                              : product.status === "draft"
                                ? "待配置"
                                : "已下线"}
                          </span>
                        </td>
                        <td>{product.updatedAt}</td>
                        <td>
                          <Button size="small" type="link" onClick={() => onEdit(product)}>
                            编辑投放
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyWrap}>
              <Empty description="当前筛选下暂无已商品化 AI专家。" />
            </div>
          )}
        </section>
      ) : (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>分类列表</h2>
              <p className={adminStyles.consoleSectionMeta}>
                共 {sortedCategories.length} 个分类，{activeCategoryCount}{" "}
                个启用；启用分类会同步出现在用户侧 AI 专家广场筛选中。
              </p>
            </div>
          </div>

          {sortedCategories.length ? (
            <div className={adminStyles.consoleHtmlTableWrap}>
              <table className={adminStyles.consoleHtmlTable}>
                <thead>
                  <tr>
                    <th>分类名称</th>
                    <th>排序</th>
                    <th>状态</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map(category => (
                    <tr key={category.id}>
                      <td className={adminStyles.consoleHtmlTableStrong}>{category.name}</td>
                      <td>{category.sortOrder}</td>
                      <td>
                        <span className={getAgentPlazaCategoryStatusClassName(category.status)}>
                          {getAgentPlazaCategoryStatusLabel(category.status)}
                        </span>
                      </td>
                      <td>{category.updatedAt}</td>
                      <td>
                        <div className={adminStyles.consoleActions}>
                          <Button size="small" type="link" onClick={() => onEditCategory(category)}>
                            编辑
                          </Button>
                          <Button
                            size="small"
                            type="link"
                            onClick={() => onToggleCategoryStatus(category)}
                          >
                            {category.status === "active" ? "停用" : "启用"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyWrap}>
              <Empty description="暂无 AI专家广场分类，请先创建分类。" />
            </div>
          )}
        </section>
      )}
    </div>
  );
};

const ProductConsole = ({
  products,
  pointsPackages,
  teamPackages,
  seatPricing,
  statusLabels,
  productSaleTypeLabels,
  productTrialUnitLabels,
  productDeliveryKindLabels,
  productBillingSpecLabels,
  onCreate,
  onViewDetail,
  onCreatePointsPackage,
  onUpdatePointsPackage,
  onCreateTeamPackage,
  onUpdateTeamPackage,
  onUpdateSeatPricing,
}: ProductConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [activeProductTab, setActiveProductTab] = useState<ProductConsoleTabKey>("standard");
  const [pointsPackageEditor, setPointsPackageEditor] = useState<PointsPackageEditorState>({
    open: false,
    title: "",
    description: "",
    points: 0,
    price: 0,
    tagLabel: "",
  });
  const [teamPackageEditor, setTeamPackageEditor] = useState<TeamPackageEditorState>({
    open: false,
    title: "",
    description: "",
    includedSeats: 0,
    price: 0,
    tagLabel: "",
  });
  const [seatPricingEditor, setSeatPricingEditor] = useState<SeatPricingEditorState>({
    open: false,
    pricePerSeat: seatPricing.pricePerSeat,
  });

  const filteredProducts = useMemo<OperationsProduct[]>(
    () =>
      products.filter(item => {
        const searchSource = [
          item.name,
          item.linkedAgentName ?? "",
          item.resourcePoolName ?? "",
          item.description,
        ]
          .join(" ")
          .toLowerCase();

        return searchSource.includes(keyword.trim().toLowerCase());
      }),
    [keyword, products],
  );

  const handleOpenCreatePointsPackage = (): void => {
    setPointsPackageEditor({
      open: true,
      title: "",
      description: "",
      points: 0,
      price: 0,
      tagLabel: "",
    });
  };

  const handleOpenEditPointsPackage = (targetPackage: MockPointsPackageOption): void => {
    setPointsPackageEditor({
      open: true,
      packageId: targetPackage.id,
      title: targetPackage.title,
      description: targetPackage.description,
      points: targetPackage.points,
      price: targetPackage.price,
      tagLabel: targetPackage.tagLabel ?? "",
    });
  };

  const handleSubmitPointsPackageEditor = (): void => {
    if (
      !pointsPackageEditor.title.trim() ||
      pointsPackageEditor.points <= 0 ||
      pointsPackageEditor.price <= 0
    ) {
      message.warning("请先补齐积分包名称、积分数量和价格。");
      return;
    }

    const payload = {
      title: pointsPackageEditor.title.trim(),
      description: pointsPackageEditor.description.trim(),
      points: pointsPackageEditor.points,
      price: pointsPackageEditor.price,
      tagLabel: pointsPackageEditor.tagLabel.trim() || undefined,
    };

    if (pointsPackageEditor.packageId) {
      onUpdatePointsPackage(pointsPackageEditor.packageId, payload);
      message.success("积分包商品已更新。");
    } else {
      onCreatePointsPackage(payload);
      message.success("积分包商品已创建。");
    }

    setPointsPackageEditor({
      open: false,
      title: "",
      description: "",
      points: 0,
      price: 0,
      tagLabel: "",
    });
  };

  const handleOpenCreateTeamPackage = (): void => {
    setTeamPackageEditor({
      open: true,
      title: "",
      description: "",
      includedSeats: 0,
      price: 0,
      tagLabel: "",
    });
  };

  const handleOpenEditTeamPackage = (targetPackage: MockTenantPlanPackageOption): void => {
    setTeamPackageEditor({
      open: true,
      packageId: targetPackage.id,
      title: targetPackage.title,
      description: targetPackage.description,
      includedSeats: targetPackage.includedSeats,
      price: targetPackage.price,
      tagLabel: targetPackage.tagLabel ?? "",
    });
  };

  const handleSubmitTeamPackageEditor = (): void => {
    if (
      !teamPackageEditor.title.trim() ||
      teamPackageEditor.includedSeats <= 0 ||
      teamPackageEditor.price <= 0
    ) {
      message.warning("请先补齐团队套餐名称、席位数和价格。");
      return;
    }

    const payload = {
      title: teamPackageEditor.title.trim(),
      description: teamPackageEditor.description.trim(),
      includedSeats: teamPackageEditor.includedSeats,
      price: teamPackageEditor.price,
      tagLabel: teamPackageEditor.tagLabel.trim() || undefined,
    };

    if (teamPackageEditor.packageId) {
      onUpdateTeamPackage(teamPackageEditor.packageId, payload);
      message.success("团队套餐商品已更新。");
    } else {
      onCreateTeamPackage(payload);
      message.success("团队套餐商品已创建。");
    }

    setTeamPackageEditor({
      open: false,
      title: "",
      description: "",
      includedSeats: 0,
      price: 0,
      tagLabel: "",
    });
  };

  const handleSubmitSeatPricingEditor = (): void => {
    if (seatPricingEditor.pricePerSeat <= 0) {
      message.warning("请输入有效的单席位价格。");
      return;
    }

    onUpdateSeatPricing({
      pricePerSeat: seatPricingEditor.pricePerSeat,
    });
    setSeatPricingEditor(current => ({
      ...current,
      open: false,
    }));
    message.success("席位加购商品价格已更新。");
  };

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>商品中心</h1>
        </div>

        <div className={adminStyles.consoleHeaderSide}>
          {activeProductTab === "standard" ? (
            <>
              <Input
                className={adminStyles.consoleInlineSearch}
                value={keyword}
                placeholder="搜索商品名称、关联供给"
                onChange={event => setKeyword(event.target.value)}
              />
              <Button type="primary" onClick={onCreate}>
                新建标准商品
              </Button>
            </>
          ) : null}
          {activeProductTab === "points" ? (
            <Button type="primary" onClick={handleOpenCreatePointsPackage}>
              新建积分包
            </Button>
          ) : null}
          {activeProductTab === "team" ? (
            <Button type="primary" onClick={handleOpenCreateTeamPackage}>
              新建团队套餐
            </Button>
          ) : null}
          {activeProductTab === "seat" ? (
            <Button
              type="primary"
              onClick={() =>
                setSeatPricingEditor({
                  open: true,
                  pricePerSeat: seatPricing.pricePerSeat,
                })
              }
            >
              编辑价格
            </Button>
          ) : null}
        </div>
      </header>

      <div className={styles.detailTabBar}>
        {PRODUCT_CONSOLE_TAB_OPTIONS.map(item => (
          <button
            key={item.key}
            type="button"
            className={classNames(
              styles.detailTabButton,
              activeProductTab === item.key && styles.detailTabButtonActive,
            )}
            onClick={() => setActiveProductTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeProductTab === "standard" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>AI专家与资源商品</h2>
            </div>
          </div>

          {filteredProducts.length ? (
            <div className={adminStyles.consoleHtmlTableWrap}>
              <table className={adminStyles.consoleHtmlTable}>
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>售卖类型</th>
                    <th>试用</th>
                    <th>交付类型</th>
                    <th>关联供给</th>
                    <th>价格策略</th>
                    <th>状态</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr key={product.id}>
                      <td>
                        <button
                          type="button"
                          className={styles.recordEntryButton}
                          onClick={() => onViewDetail(product.id)}
                        >
                          <span className={styles.recordEntryTitle}>{product.name}</span>
                        </button>
                      </td>
                      <td>{productSaleTypeLabels[product.saleType]}</td>
                      <td>{getProductTrialLabel(product, productTrialUnitLabels)}</td>
                      <td>{productDeliveryKindLabels[product.deliveryKind]}</td>
                      <td>
                        {product.supplyKind === "agent"
                          ? (product.linkedAgentName ?? "未绑定 AI专家")
                          : (product.resourcePoolName ?? "无需资源池")}
                      </td>
                      <td>{getProductPriceLabel(product, productBillingSpecLabels)}</td>
                      <td>
                        <span className={getProductStatusClassName(product.status)}>
                          {statusLabels[product.status]}
                        </span>
                      </td>
                      <td>{product.updatedAt}</td>
                      <td>
                        <Button size="small" type="link" onClick={() => onViewDetail(product.id)}>
                          {product.status === "pendingProductization" ? "完善商品" : "查看详情"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyWrap}>
              <Empty description="当前筛选下暂无商品。" />
            </div>
          )}
        </section>
      ) : null}

      {activeProductTab === "points" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>积分包商品</h2>
              <p className={adminStyles.consoleSectionMeta}>
                用户侧购买后生成统一订单，支付成功自动增加租户积分余额。
              </p>
            </div>
          </div>

          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>商品</th>
                  <th>积分数量</th>
                  <th>售价</th>
                  <th>推荐标记</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pointsPackages.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className={adminStyles.consoleHtmlTableStrong}>{item.title}</div>
                      <div className={adminStyles.consoleSidebarItemMeta}>{item.description}</div>
                    </td>
                    <td>{item.points.toLocaleString("zh-CN")} 积分</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{item.tagLabel ?? "无"}</td>
                    <td>
                      <span
                        className={
                          item.status === "active"
                            ? buildStatusClassName("success")
                            : buildStatusClassName("danger")
                        }
                      >
                        {item.status === "active" ? "在售" : "停售"}
                      </span>
                    </td>
                    <td>{item.updatedAt}</td>
                    <td>
                      <div className={adminStyles.consoleActions}>
                        <Button size="small" onClick={() => handleOpenEditPointsPackage(item)}>
                          编辑
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            onUpdatePointsPackage(item.id, {
                              status: item.status === "active" ? "inactive" : "active",
                            });
                            message.success(
                              item.status === "active"
                                ? "积分包商品已停售。"
                                : "积分包商品已恢复在售。",
                            );
                          }}
                        >
                          {item.status === "active" ? "停售" : "上架"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeProductTab === "team" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>团队套餐商品</h2>
              <p className={adminStyles.consoleSectionMeta}>
                用户侧购买后生成统一订单，支付成功开通团队版并增加基础席位。
              </p>
            </div>
          </div>

          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>商品</th>
                  <th>包含席位</th>
                  <th>年付价格</th>
                  <th>推荐标记</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {teamPackages.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className={adminStyles.consoleHtmlTableStrong}>{item.title}</div>
                      <div className={adminStyles.consoleSidebarItemMeta}>{item.description}</div>
                    </td>
                    <td>{item.includedSeats} 席</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{item.tagLabel ?? "无"}</td>
                    <td>
                      <span
                        className={
                          item.status === "active"
                            ? buildStatusClassName("success")
                            : buildStatusClassName("danger")
                        }
                      >
                        {item.status === "active" ? "在售" : "停售"}
                      </span>
                    </td>
                    <td>{item.updatedAt}</td>
                    <td>
                      <div className={adminStyles.consoleActions}>
                        <Button size="small" onClick={() => handleOpenEditTeamPackage(item)}>
                          编辑
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            onUpdateTeamPackage(item.id, {
                              status: item.status === "active" ? "inactive" : "active",
                            });
                            message.success(
                              item.status === "active"
                                ? "团队套餐商品已停售。"
                                : "团队套餐商品已恢复在售。",
                            );
                          }}
                        >
                          {item.status === "active" ? "停售" : "上架"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeProductTab === "seat" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>席位加购商品</h2>
              <p className={adminStyles.consoleSectionMeta}>
                团队版租户购买后生成统一订单，支付成功增加可用席位。
              </p>
            </div>
          </div>

          <div className={adminStyles.consoleRows}>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>当前价格</span>
              <span className={adminStyles.consoleInfoValue}>
                {formatCurrency(seatPricing.pricePerSeat)}
              </span>
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>计费周期</span>
              <span className={adminStyles.consoleInfoValue}>{seatPricing.billingCycleLabel}</span>
            </div>
          </div>
        </section>
      ) : null}

      <Modal
        open={pointsPackageEditor.open}
        title={pointsPackageEditor.packageId ? "编辑积分包商品" : "新建积分包商品"}
        className={classNames(styles.fixedModal, styles.standardModal)}
        width={OPERATIONS_MODAL_WIDTHS.standard}
        okText="保存"
        cancelText="取消"
        onCancel={() =>
          setPointsPackageEditor({
            open: false,
            title: "",
            description: "",
            points: 0,
            price: 0,
            tagLabel: "",
          })
        }
        onOk={handleSubmitPointsPackageEditor}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>商品名称</span>
            <Input
              value={pointsPackageEditor.title}
              onChange={event =>
                setPointsPackageEditor(current => ({ ...current, title: event.target.value }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>说明</span>
            <Input
              value={pointsPackageEditor.description}
              onChange={event =>
                setPointsPackageEditor(current => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>积分数量</span>
            <InputNumber
              min={1000}
              value={pointsPackageEditor.points}
              onChange={value =>
                setPointsPackageEditor(current => ({ ...current, points: Number(value ?? 0) }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>售价</span>
            <InputNumber
              min={1}
              value={pointsPackageEditor.price}
              onChange={value =>
                setPointsPackageEditor(current => ({ ...current, price: Number(value ?? 0) }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>推荐标记</span>
            <Input
              value={pointsPackageEditor.tagLabel}
              onChange={event =>
                setPointsPackageEditor(current => ({ ...current, tagLabel: event.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={teamPackageEditor.open}
        title={teamPackageEditor.packageId ? "编辑团队套餐商品" : "新建团队套餐商品"}
        className={classNames(styles.fixedModal, styles.standardModal)}
        width={OPERATIONS_MODAL_WIDTHS.standard}
        okText="保存"
        cancelText="取消"
        onCancel={() =>
          setTeamPackageEditor({
            open: false,
            title: "",
            description: "",
            includedSeats: 0,
            price: 0,
            tagLabel: "",
          })
        }
        onOk={handleSubmitTeamPackageEditor}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>商品名称</span>
            <Input
              value={teamPackageEditor.title}
              onChange={event =>
                setTeamPackageEditor(current => ({ ...current, title: event.target.value }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>说明</span>
            <Input
              value={teamPackageEditor.description}
              onChange={event =>
                setTeamPackageEditor(current => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>包含席位</span>
            <InputNumber
              min={1}
              value={teamPackageEditor.includedSeats}
              onChange={value =>
                setTeamPackageEditor(current => ({
                  ...current,
                  includedSeats: Number(value ?? 0),
                }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>年付价格</span>
            <InputNumber
              min={1}
              value={teamPackageEditor.price}
              onChange={value =>
                setTeamPackageEditor(current => ({ ...current, price: Number(value ?? 0) }))
              }
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>推荐标记</span>
            <Input
              value={teamPackageEditor.tagLabel}
              onChange={event =>
                setTeamPackageEditor(current => ({ ...current, tagLabel: event.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={seatPricingEditor.open}
        title="编辑席位加购商品"
        className={classNames(styles.fixedModal, styles.compactModal)}
        width={OPERATIONS_MODAL_WIDTHS.compact}
        okText="保存"
        cancelText="取消"
        onCancel={() =>
          setSeatPricingEditor({
            open: false,
            pricePerSeat: seatPricing.pricePerSeat,
          })
        }
        onOk={handleSubmitSeatPricingEditor}
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>单席位价格</span>
            <InputNumber
              min={1}
              value={seatPricingEditor.pricePerSeat}
              onChange={value =>
                setSeatPricingEditor(current => ({
                  ...current,
                  pricePerSeat: Number(value ?? 0),
                }))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

const ProductDetailConsole = ({
  product,
  statusLabels,
  productSaleTypeLabels,
  productTrialUnitLabels,
  productDeliveryKindLabels,
  productBillingModeLabels,
  productMeteringUnitLabels,
  productBillingSpecLabels,
  onBack,
  onEdit,
  onToggleStatus,
}: ProductDetailConsoleProps): JSX.Element => {
  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <div className={adminStyles.consoleActions}>
            <Button type="link" size="small" onClick={onBack}>
              返回商品列表
            </Button>
          </div>
          <h1 className={adminStyles.consoleTitle}>{product?.name ?? "商品详情"}</h1>
          <p className={adminStyles.consoleSubtitle}>
            {product
              ? `${
                  product.supplyKind === "agent"
                    ? (product.linkedAgentName ?? "未绑定 AI专家")
                    : (product.resourcePoolName ?? "无需资源池")
                }`
              : "当前商品不存在或已被移除，请返回列表重新选择。"}
          </p>
        </div>

        {product ? (
          <div className={adminStyles.consoleActions}>
            <span className={getProductStatusClassName(product.status)}>
              {statusLabels[product.status]}
            </span>
            <Button onClick={() => onEdit(product)}>
              {product.status === "pendingProductization" ? "完善商品" : "编辑商品"}
            </Button>
            <Button onClick={() => onToggleStatus(product)}>
              {product.status === "active" ? "下架商品" : "上架商品"}
            </Button>
          </div>
        ) : null}
      </header>

      {product ? (
        <section className={adminStyles.consoleSection}>
          {product.status === "pendingProductization" ? (
            <div className={styles.alertBlock}>
              该 AI专家 已通过审核，请先完善商品名称、售卖方式、价格与试用策略后再上架。
            </div>
          ) : null}
          <div className={styles.detailGrid}>
            <section className={adminStyles.detailBlock}>
              <h3 className={adminStyles.detailBlockTitle}>售卖信息</h3>
              <div className={adminStyles.consoleRows}>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>售卖类型</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {productSaleTypeLabels[product.saleType]}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>价格策略</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {getProductPriceLabel(product, productBillingSpecLabels)}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>试用策略</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {getProductTrialLabel(product, productTrialUnitLabels)}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>客户端动作</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {product.saleType === "free"
                      ? "立即获取"
                      : product.supportsTrial
                        ? "选择订阅方案 + 立即购买 + 免费试用"
                        : "选择订阅方案 + 立即购买"}
                  </span>
                </div>
                {product.saleType === "paid" ? (
                  <>
                    <div className={adminStyles.consoleInfoRow}>
                      <span className={adminStyles.consoleInfoLabel}>计费模式</span>
                      <span className={adminStyles.consoleInfoValue}>
                        {productBillingModeLabels[product.billingMode]}
                      </span>
                    </div>
                    <div className={adminStyles.consoleInfoRow}>
                      <span className={adminStyles.consoleInfoLabel}>计量对象</span>
                      <span className={adminStyles.consoleInfoValue}>
                        {productMeteringUnitLabels[product.meteringUnit]}
                      </span>
                    </div>
                    <div className={adminStyles.consoleInfoRow}>
                      <span className={adminStyles.consoleInfoLabel}>结算规格</span>
                      <span className={adminStyles.consoleInfoValue}>
                        {product.subscriptionPlans?.length
                          ? getSubscriptionPlansSummary(product)
                          : getProductBillingSpecLabel(
                              productBillingSpecLabels,
                              product.billingSpec,
                            )}
                      </span>
                    </div>
                  </>
                ) : null}
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>交付类型</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {productDeliveryKindLabels[product.deliveryKind]}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>更新时间</span>
                  <span className={adminStyles.consoleInfoValue}>{product.updatedAt}</span>
                </div>
                {product.subscriptionPlans?.length ? (
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>订阅方案</span>
                    <span className={adminStyles.consoleInfoValue}>
                      {getActiveSubscriptionPlans(product)
                        .map(
                          item =>
                            `${item.title} ${formatCurrency(item.price)} / ${item.durationLabel}`,
                        )
                        .join(" / ")}
                    </span>
                  </div>
                ) : null}
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>关联供给</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {product.supplyKind === "agent"
                      ? (product.linkedAgentName ?? "未绑定 AI专家")
                      : (product.resourcePoolName ?? "无需资源池")}
                  </span>
                </div>
              </div>
            </section>

            <section className={adminStyles.detailBlock}>
              <h3 className={adminStyles.detailBlockTitle}>商品描述</h3>
              <p className={styles.detailParagraph}>{product.description}</p>
            </section>
          </div>
        </section>
      ) : (
        <section className={adminStyles.consoleSection}>
          <div className={styles.emptyWrap}>
            <Empty description="未找到该商品。">
              <Button onClick={onBack}>返回商品列表</Button>
            </Empty>
          </div>
        </section>
      )}
    </div>
  );
};

const FulfillmentConsole = ({
  fulfillments,
  pointOrders,
  fulfillmentStatusLabels,
  productDeliveryKindLabels,
}: FulfillmentConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");

  const orderRows = useMemo<OperationsOrderCenterRow[]>(
    () =>
      [
        ...pointOrders.map(item => {
          const fulfillmentStatusLabel =
            item.status === "paid" ? "积分已到账" : POINT_ORDER_STATUS_LABELS[item.status];
          const searchText = [
            item.orderNo,
            item.tenantName,
            item.tenantCode,
            item.packageTitle,
            item.purchaserName,
            fulfillmentStatusLabel,
          ].join(" ");

          return {
            id: `points-${item.id}`,
            orderNo: item.orderNo,
            orderTypeLabel: "积分包",
            tenantName: item.tenantName,
            tenantCode: item.tenantCode,
            productName: item.packageTitle,
            productMeta: `${item.packagePoints.toLocaleString("zh-CN")} 积分`,
            amountLabel: formatCurrency(item.amount),
            purchaserName: item.purchaserName,
            paymentStatusLabel: POINT_ORDER_STATUS_LABELS[item.status],
            paymentStatusClassName: getPaymentStatusClassName(item.status),
            fulfillmentStatusLabel,
            fulfillmentStatusClassName:
              item.status === "paid"
                ? buildStatusClassName("success")
                : getPaymentStatusClassName(item.status),
            fulfillmentResult:
              item.status === "paid"
                ? `租户积分余额增加 ${item.packagePoints.toLocaleString("zh-CN")} 积分`
                : "支付完成后自动到账",
            paidAt: item.paidAt ?? "未支付",
            updatedAt: item.paidAt ?? item.createdAt,
            searchText,
          };
        }),
        ...fulfillments.map(item => {
          const deliveryKindLabel = productDeliveryKindLabels[item.deliveryKind];
          const fulfillmentStatusLabel = fulfillmentStatusLabels[item.status];
          const searchText = [
            item.orderNo,
            item.tenantName,
            item.productName,
            deliveryKindLabel,
            item.resourcePoolName ?? "",
            item.allocationTarget,
            fulfillmentStatusLabel,
          ].join(" ");

          return {
            id: `fulfillment-${item.id}`,
            orderNo: item.orderNo,
            orderTypeLabel: "商品订单",
            tenantName: item.tenantName,
            productName: item.productName,
            productMeta: `${deliveryKindLabel} · 数量 ${item.quantity}`,
            amountLabel: "按订单实付",
            purchaserName: "客户侧购买",
            paymentStatusLabel: "已支付",
            paymentStatusClassName: getPaymentStatusClassName("paid"),
            fulfillmentStatusLabel,
            fulfillmentStatusClassName: getFulfillmentStatusClassName(item.status),
            fulfillmentResult: item.allocationTarget,
            paidAt: item.startsAt,
            updatedAt: item.updatedAt,
            searchText,
          };
        }),
      ].sort((leftItem, rightItem) => rightItem.updatedAt.localeCompare(leftItem.updatedAt)),
    [fulfillmentStatusLabels, fulfillments, pointOrders, productDeliveryKindLabels],
  );

  const filteredOrderRows = useMemo<OperationsOrderCenterRow[]>(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return orderRows;
    }

    return orderRows.filter(item => item.searchText.toLowerCase().includes(normalizedKeyword));
  }, [keyword, orderRows]);

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>订单中心</h1>
        </div>

        <div className={adminStyles.consoleHeaderSide}>
          <Input
            className={adminStyles.consoleInlineSearch}
            value={keyword}
            placeholder="搜索订单号、租户、商品、购买人、开通结果"
            onChange={event => setKeyword(event.target.value)}
          />
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>统一订单与开通记录</h2>
            <p className={adminStyles.consoleSectionMeta}>共 {filteredOrderRows.length} 笔订单</p>
          </div>
        </div>

        {filteredOrderRows.length ? (
          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>类型</th>
                  <th>租户</th>
                  <th>商品</th>
                  <th>金额</th>
                  <th>购买人</th>
                  <th>支付状态</th>
                  <th>开通状态</th>
                  <th>开通结果</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrderRows.map(item => (
                  <tr key={item.id}>
                    <td>{item.orderNo}</td>
                    <td>{item.orderTypeLabel}</td>
                    <td>
                      <div>{item.tenantName}</div>
                      {item.tenantCode ? (
                        <div className={adminStyles.consoleSidebarItemMeta}>{item.tenantCode}</div>
                      ) : null}
                    </td>
                    <td>
                      <div>{item.productName}</div>
                      <div className={adminStyles.consoleSidebarItemMeta}>{item.productMeta}</div>
                    </td>
                    <td>{item.amountLabel}</td>
                    <td>{item.purchaserName}</td>
                    <td>
                      <span className={item.paymentStatusClassName}>{item.paymentStatusLabel}</span>
                    </td>
                    <td>
                      <span className={item.fulfillmentStatusClassName}>
                        {item.fulfillmentStatusLabel}
                      </span>
                    </td>
                    <td>{item.fulfillmentResult}</td>
                    <td>{item.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyWrap}>
            <Empty description="当前筛选下暂无订单。" />
          </div>
        )}
      </section>
    </div>
  );
};

const ResourcePoolConsole = ({
  resourcePools,
  meteringProviders,
  modelServices,
  externalMeteredServices,
  resourcePoolTypeLabels,
  resourcePoolAllocationModeLabels,
  resourcePoolCapacityUnitLabels,
  onCreate,
  onEdit,
  onCreateMeteringProvider,
  onUpdateMeteringProvider,
  onCreateModelService,
  onUpdateModelService,
  onCreateExternalMeteredService,
  onUpdateExternalMeteredService,
}: ResourcePoolConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [activeResourceTab, setActiveResourceTab] = useState<ResourcePoolConsoleTabKey>("pools");

  const filteredResourcePools = useMemo<OperationsResourcePool[]>(
    () =>
      resourcePools.filter(item => {
        const searchSource = [item.name, item.provider].join(" ").toLowerCase();

        return searchSource.includes(keyword.trim().toLowerCase());
      }),
    [keyword, resourcePools],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>资源池管理</h1>
          <p className={adminStyles.consoleSubtitle}>
            统一维护底层资源供给、成本和资源计量规则；可售商品和订单仍在商品中心与订单中心管理。
          </p>
        </div>
      </header>

      <div className={styles.detailTabBar}>
        {RESOURCE_POOL_CONSOLE_TAB_OPTIONS.map(item => (
          <button
            key={item.key}
            type="button"
            className={classNames(
              styles.detailTabButton,
              activeResourceTab === item.key && styles.detailTabButtonActive,
            )}
            onClick={() => setActiveResourceTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeResourceTab === "pools" ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>资源池列表</h2>
              <p className={adminStyles.consoleSectionDescription}>
                管理设备、云端工作站、模型配额、第三方接口账号等可分配资源。
              </p>
            </div>
            <div className={adminStyles.consoleInlineActions}>
              <Input
                className={adminStyles.consoleInlineSearch}
                value={keyword}
                placeholder="搜索资源池名称、供应商"
                onChange={event => setKeyword(event.target.value)}
              />
              <Button type="primary" onClick={onCreate}>
                创建资源池
              </Button>
            </div>
          </div>

          {filteredResourcePools.length ? (
            <div className={adminStyles.consoleHtmlTableWrap}>
              <table className={adminStyles.consoleHtmlTable}>
                <thead>
                  <tr>
                    <th>资源池</th>
                    <th>类型</th>
                    <th>供应商</th>
                    <th>分配方式</th>
                    <th>可用容量</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResourcePools.map(resourcePool => (
                    <tr key={resourcePool.id}>
                      <td>{resourcePool.name}</td>
                      <td>{resourcePoolTypeLabels[resourcePool.resourceType]}</td>
                      <td>{resourcePool.provider}</td>
                      <td>{resourcePoolAllocationModeLabels[resourcePool.allocationMode]}</td>
                      <td>
                        {getResourcePoolCapacityLabel(resourcePool, resourcePoolCapacityUnitLabels)}
                      </td>
                      <td>{resourcePool.updatedAt}</td>
                      <td>
                        <Button size="small" type="link" onClick={() => onEdit(resourcePool)}>
                          编辑资源池
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyWrap}>
              <Empty description="当前筛选下暂无资源池。" />
            </div>
          )}
        </section>
      ) : (
        <OperationsResourceMeteringConsole
          mode={activeResourceTab}
          meteringProviders={meteringProviders}
          modelServices={modelServices}
          externalMeteredServices={externalMeteredServices}
          onCreateMeteringProvider={onCreateMeteringProvider}
          onUpdateMeteringProvider={onUpdateMeteringProvider}
          onCreateModelService={onCreateModelService}
          onUpdateModelService={onUpdateModelService}
          onCreateExternalMeteredService={onCreateExternalMeteredService}
          onUpdateExternalMeteredService={onUpdateExternalMeteredService}
        />
      )}
    </div>
  );
};

/**
 * 运营后台主视图，按企业管理后台的骨架和内容标准重构。
 */
export const OperationsPlatformView = (): JSX.Element => {
  const navigate = useNavigate();
  const { tabPath, tenantId, productId } = useParams<{
    tabPath?: string;
    tenantId?: string;
    productId?: string;
  }>();
  const { logout, session } = useOperationsAuth();
  const {
    addTenantMember,
    agentPlazaCategories,
    agentStatusLabels,
    agentSubmissions,
    approveAgent,
    approvedAgents,
    createExternalMeteredService,
    createMeteringProvider,
    createModelService,
    createResourcePool,
    createProduct,
    createAgentPlazaCategory,
    createPointsPackage,
    createTeamPlanPackage,
    createTenant,
    emptyResourcePoolForm,
    emptyProductForm,
    emptyTenantForm,
    emptyTenantMemberForm,
    externalMeteredServices,
    fulfillmentStatusLabels,
    fulfillments,
    meteringProviders,
    modelServices,
    pointsOrders,
    pointsPackages,
    pointsUsageRecords,
    referralRecords,
    productBillingModeLabels,
    productDeliveryKindLabels,
    productDeliveryKindOptions,
    productBillingModeOptions,
    productBillingSpecLabels,
    productBillingSpecOptions,
    productMeteringUnitLabels,
    productMeteringUnitOptions,
    productSaleTypeLabels,
    productSaleTypeOptions,
    productStatusLabels,
    productSupplyKindLabels,
    productTrialUnitLabels,
    productTrialUnitOptions,
    products,
    resourcePoolAllocationModeLabels,
    resourcePoolAllocationModeOptions,
    resourcePoolCapacityUnitLabels,
    resourcePoolCapacityUnitOptions,
    resourcePoolTypeLabels,
    resourcePoolTypeOptions,
    resourcePools,
    registrationStrategy,
    rejectAgent,
    teamPlanPackages,
    teamSeatPricing,
    tenantStatusLabels,
    tenants,
    updateAgentPlazaSettings,
    updateAgentPlazaCategory,
    updateExternalMeteredService,
    updateMeteringProvider,
    updateModelService,
    updatePointsPackage,
    updateRegistrationStrategy,
    updateResourcePool,
    updateProduct,
    updateProductStatus,
    updateTeamPlanPackage,
    updateTeamSeatPricing,
    updateTenant,
    updateTenantStatus,
  } = useOperationsPlatform();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [tenantEditor, setTenantEditor] = useState<TenantEditorState>({
    open: false,
    mode: "create",
    form: emptyTenantForm,
  });
  const [tenantMemberEditor, setTenantMemberEditor] = useState<TenantMemberEditorState>({
    open: false,
    form: emptyTenantMemberForm,
  });
  const [productEditor, setProductEditor] = useState<ProductEditorState>({
    open: false,
    mode: "create",
    form: emptyProductForm,
  });
  const [agentPlazaEditor, setAgentPlazaEditor] = useState<AgentPlazaEditorState>({
    open: false,
    category: OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
    visibility: "public",
    visibleTenantIds: [],
    status: "offline",
  });
  const [agentPlazaCategoryEditor, setAgentPlazaCategoryEditor] =
    useState<AgentPlazaCategoryEditorState>({
      open: false,
      mode: "create",
      name: "",
      sortOrder: 10,
    });
  const [resourcePoolEditor, setResourcePoolEditor] = useState<ResourcePoolEditorState>({
    open: false,
    mode: "create",
    form: emptyResourcePoolForm,
  });
  const [agentReview, setAgentReview] = useState<AgentReviewState>({
    open: false,
  });
  const [rejectEditor, setRejectEditor] = useState<RejectEditorState>({
    open: false,
    reason: "",
  });

  const availableMeteringUnitOptions = useMemo(
    () =>
      getAvailableMeteringUnitOptions(
        productMeteringUnitOptions,
        productBillingSpecOptions,
        productEditor.form.billingMode,
      ),
    [productBillingSpecOptions, productEditor.form.billingMode, productMeteringUnitOptions],
  );

  const availableBillingSpecOptions = useMemo(
    () =>
      getAvailableBillingSpecOptions(
        productBillingSpecOptions,
        productEditor.form.billingMode,
        productEditor.form.meteringUnit,
      ),
    [productBillingSpecOptions, productEditor.form.billingMode, productEditor.form.meteringUnit],
  );

  const availableResourcePoolOptions = useMemo(
    () => getAvailableResourcePoolOptions(resourcePools, productEditor.form.deliveryKind),
    [productEditor.form.deliveryKind, resourcePools],
  );

  const availableCapacityUnitOptions = useMemo(
    () =>
      getAvailableCapacityUnitOptions(
        resourcePoolCapacityUnitOptions,
        resourcePoolEditor.form.resourceType,
      ),
    [resourcePoolCapacityUnitOptions, resourcePoolEditor.form.resourceType],
  );

  const agentPlazaCategoryOptions = useMemo(
    () => getAgentPlazaCategorySelectOptions(agentPlazaCategories, agentPlazaEditor.category),
    [agentPlazaCategories, agentPlazaEditor.category],
  );

  const activeTabFromPath = useMemo<OperationsPlatformTabKey | null>(
    () => getTabKeyFromPath(tabPath),
    [tabPath],
  );
  const hasDetailRoute = Boolean(tenantId || productId);
  const activeTab = useMemo<OperationsPlatformTabKey>(
    () => activeTabFromPath ?? (tenantId ? "tenants" : productId ? "products" : "tenants"),
    [activeTabFromPath, productId, tenantId],
  );

  useEffect(() => {
    if (activeTabFromPath || hasDetailRoute) {
      return;
    }

    navigate(OPERATIONS_DEFAULT_PATH, { replace: true });
  }, [activeTabFromPath, hasDetailRoute, navigate]);

  const handleLogout = useCallback((): void => {
    logout();
    message.success("已退出运营后台。");
    navigate("/ops/login", { replace: true });
  }, [logout, navigate]);
  const handleOpenUserManual = useCallback((): void => {
    window.open(USER_MANUAL_ROUTE_PATH, "_blank", "noopener,noreferrer");
  }, []);

  const handleTabChange = useCallback(
    (nextTab: OperationsPlatformTabKey): void => {
      navigate(`/ops/${nextTab}`, { replace: true });
    },
    [navigate],
  );

  const handleOpenTenantDetail = useCallback(
    (nextTenantId: string): void => {
      navigate(buildTenantDetailPath(nextTenantId));
    },
    [navigate],
  );

  const handleBackToTenantList = useCallback((): void => {
    navigate(OPERATIONS_TENANT_LIST_PATH);
  }, [navigate]);

  const handleOpenAgentReview = useCallback((nextSubmissionId: string): void => {
    setAgentReview({
      open: true,
      submissionId: nextSubmissionId,
    });
  }, []);

  const handleCloseAgentReview = useCallback((): void => {
    setAgentReview({
      open: false,
    });
  }, []);

  const handleOpenCreateTenant = useCallback((): void => {
    setTenantEditor({
      open: true,
      mode: "create",
      form: emptyTenantForm,
    });
  }, [emptyTenantForm]);

  const handleOpenEditTenant = useCallback((tenant: OperationsTenant): void => {
    setTenantEditor({
      open: true,
      mode: "edit",
      tenantId: tenant.id,
      form: {
        name: tenant.name,
        code: tenant.code,
        industry: tenant.industry,
        adminName: tenant.adminName,
        adminPhone: tenant.adminPhone,
        hasAgentListingAccess: tenant.hasAgentListingAccess,
        seatCount: tenant.seatCount,
        effectiveAt: tenant.effectiveAt,
        expiresAt: tenant.expiresAt,
        moduleLabels: tenant.moduleLabels,
      },
    });
  }, []);

  const handleSubmitTenant = useCallback((): void => {
    const editingTenant = tenantEditor.tenantId
      ? (tenants.find(item => item.id === tenantEditor.tenantId) ?? null)
      : null;

    if (
      !tenantEditor.form.name.trim() ||
      !tenantEditor.form.adminName.trim() ||
      tenantEditor.form.adminPhone.trim().length !== 11 ||
      tenantEditor.form.seatCount < 1 ||
      !tenantEditor.form.effectiveAt.trim() ||
      !tenantEditor.form.expiresAt.trim()
    ) {
      message.warning("请先补齐租户名称、管理员信息、席位数量、生效时间和失效时间。");
      return;
    }

    if (editingTenant && tenantEditor.form.seatCount < editingTenant.members.length) {
      message.warning("席位数量不能少于当前已加入的成员数量。");
      return;
    }

    if (tenantEditor.mode === "create") {
      createTenant(tenantEditor.form);
      message.success("租户已创建。");
    } else if (tenantEditor.tenantId) {
      updateTenant(tenantEditor.tenantId, tenantEditor.form);
      message.success("租户信息已更新。");
    }

    setTenantEditor({
      open: false,
      mode: "create",
      form: emptyTenantForm,
    });
  }, [createTenant, emptyTenantForm, tenantEditor, tenants, updateTenant]);

  const handleOpenAddTenantMember = useCallback(
    (tenant: OperationsTenant): void => {
      if (tenant.members.length >= tenant.seatCount) {
        message.warning("当前租户席位已满，无法继续添加成员。");
        return;
      }

      setTenantMemberEditor({
        open: true,
        tenantId: tenant.id,
        form: emptyTenantMemberForm,
      });
    },
    [emptyTenantMemberForm],
  );

  const handleSubmitTenantMember = useCallback((): void => {
    if (
      !tenantMemberEditor.tenantId ||
      !tenantMemberEditor.form.name.trim() ||
      tenantMemberEditor.form.phone.trim().length !== 11
    ) {
      message.warning("请先补齐成员姓名和手机号。");
      return;
    }

    const targetTenant = tenants.find(item => item.id === tenantMemberEditor.tenantId) ?? null;

    if (!targetTenant) {
      message.warning("未找到当前租户。");
      return;
    }

    if (targetTenant.members.length >= targetTenant.seatCount) {
      message.warning("当前租户席位已满，无法继续添加成员。");
      return;
    }

    addTenantMember(tenantMemberEditor.tenantId, tenantMemberEditor.form);
    message.success("成员已添加。");
    setTenantMemberEditor({
      open: false,
      form: emptyTenantMemberForm,
    });
  }, [addTenantMember, emptyTenantMemberForm, tenantMemberEditor, tenants]);

  const handleToggleTenantStatus = useCallback(
    (tenant: OperationsTenant): void => {
      const nextStatus = tenant.status === "suspended" ? "active" : "suspended";

      updateTenantStatus(tenant.id, nextStatus);
      message.success(nextStatus === "active" ? "租户已启用。" : "租户已停用。");
    },
    [updateTenantStatus],
  );

  const handleOpenCreateProduct = useCallback((): void => {
    setProductEditor({
      open: true,
      mode: "create",
      form: emptyProductForm,
    });
  }, [emptyProductForm]);

  const handleOpenEditProduct = useCallback(
    (product: OperationsProduct): void => {
      setProductEditor({
        open: true,
        mode: "edit",
        productId: product.id,
        form: {
          name: product.name,
          supplyKind: product.supplyKind,
          deliveryKind: product.deliveryKind,
          saleType: product.saleType,
          billingMode: product.billingMode,
          meteringUnit: product.meteringUnit,
          billingSpec: product.billingSpec,
          linkedAgentId: product.linkedAgentId,
          resourcePoolId: product.resourcePoolId,
          description: product.description,
          price: product.price ?? 0,
          subscriptionPlans:
            product.subscriptionPlans?.map(item => ({
              ...item,
            })) ?? emptyProductForm.subscriptionPlans,
          supportsTrial: product.supportsTrial,
          trialUnit: product.trialUnit ?? "day",
          trialValue: product.trialValue ?? 7,
        },
      });
    },
    [emptyProductForm.subscriptionPlans],
  );

  const handleSubmitProduct = useCallback((): void => {
    if (!productEditor.form.name.trim()) {
      message.warning("请先补齐商品名称。");
      return;
    }

    if (productEditor.form.supplyKind === "agent" && !productEditor.form.linkedAgentId) {
      message.warning("Agent 商品必须从已审核通过的 AI专家中选择一个绑定。");
      return;
    }

    if (productEditor.form.saleType === "paid") {
      const usesSubscriptionPlans =
        productEditor.form.billingMode === "subscription" &&
        productEditor.form.supplyKind === "agent";

      if (
        !productEditor.form.billingMode ||
        !productEditor.form.meteringUnit ||
        (!usesSubscriptionPlans && !productEditor.form.billingSpec)
      ) {
        message.warning("付费商品请先补齐计费模式、计量对象和结算规格。");
        return;
      }

      if (usesSubscriptionPlans) {
        const invalidPlan = productEditor.form.subscriptionPlans.find(item => item.price <= 0);
        const hasActivePlan = productEditor.form.subscriptionPlans.some(
          item => item.status === "active",
        );

        if (invalidPlan) {
          message.warning(`${invalidPlan.title}价格必须大于 0。`);
          return;
        }

        if (!hasActivePlan) {
          message.warning("至少需要启用一个订阅方案。");
          return;
        }
      } else if ((productEditor.form.price ?? 0) <= 0) {
        message.warning("付费商品售价必须大于 0。");
        return;
      }

      if (productEditor.form.supportsTrial && productEditor.form.trialValue <= 0) {
        message.warning("请先填写有效的试用规则。");
        return;
      }
    }

    if (
      productEditor.form.deliveryKind !== "softwareService" &&
      !productEditor.form.resourcePoolId
    ) {
      message.warning("当前交付类型需要选择一个资源池。");
      return;
    }

    if (productEditor.mode === "create") {
      createProduct(productEditor.form);
      message.success("商品已创建。");
    } else if (productEditor.productId) {
      updateProduct(productEditor.productId, productEditor.form);
      message.success("商品信息已更新。");
    }

    setProductEditor({
      open: false,
      mode: "create",
      form: emptyProductForm,
    });
  }, [createProduct, emptyProductForm, productEditor, updateProduct]);

  const handleOpenCreateResourcePool = useCallback((): void => {
    setResourcePoolEditor({
      open: true,
      mode: "create",
      form: emptyResourcePoolForm,
    });
  }, [emptyResourcePoolForm]);

  const handleOpenEditResourcePool = useCallback((resourcePool: OperationsResourcePool): void => {
    setResourcePoolEditor({
      open: true,
      mode: "edit",
      resourcePoolId: resourcePool.id,
      form: {
        name: resourcePool.name,
        resourceType: resourcePool.resourceType,
        provider: resourcePool.provider,
        allocationMode: resourcePool.allocationMode,
        totalCapacity: resourcePool.totalCapacity,
        availableCapacity: resourcePool.availableCapacity,
        capacityUnit: resourcePool.capacityUnit,
      },
    });
  }, []);

  const handleSubmitResourcePool = useCallback((): void => {
    if (
      !resourcePoolEditor.form.name.trim() ||
      !resourcePoolEditor.form.provider.trim() ||
      resourcePoolEditor.form.totalCapacity < 1
    ) {
      message.warning("请先补齐资源池名称、供应商和总容量。");
      return;
    }

    if (
      resourcePoolEditor.form.availableCapacity < 0 ||
      resourcePoolEditor.form.availableCapacity > resourcePoolEditor.form.totalCapacity
    ) {
      message.warning("可用容量必须大于等于 0，且不能超过总容量。");
      return;
    }

    if (resourcePoolEditor.mode === "create") {
      createResourcePool(resourcePoolEditor.form);
      message.success("资源池已创建。");
    } else if (resourcePoolEditor.resourcePoolId) {
      updateResourcePool(resourcePoolEditor.resourcePoolId, resourcePoolEditor.form);
      message.success("资源池已更新。");
    }

    setResourcePoolEditor({
      open: false,
      mode: "create",
      form: emptyResourcePoolForm,
    });
  }, [createResourcePool, emptyResourcePoolForm, resourcePoolEditor, updateResourcePool]);

  const handleOpenCreateAgentPlazaCategory = useCallback((): void => {
    const maxSortOrder = agentPlazaCategories.reduce(
      (result, item) => Math.max(result, item.sortOrder),
      0,
    );

    setAgentPlazaCategoryEditor({
      open: true,
      mode: "create",
      name: "",
      sortOrder: maxSortOrder + 10,
    });
  }, [agentPlazaCategories]);

  const handleOpenEditAgentPlazaCategory = useCallback(
    (category: OperationsAgentPlazaCategoryOption): void => {
      setAgentPlazaCategoryEditor({
        open: true,
        mode: "edit",
        categoryId: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
      });
    },
    [],
  );

  const handleCloseAgentPlazaCategoryEditor = useCallback((): void => {
    setAgentPlazaCategoryEditor({
      open: false,
      mode: "create",
      name: "",
      sortOrder: 10,
    });
  }, []);

  const handleSubmitAgentPlazaCategory = useCallback((): void => {
    const nextName = agentPlazaCategoryEditor.name.trim();

    if (!nextName || agentPlazaCategoryEditor.sortOrder < 0) {
      message.warning("请先补齐分类名称，并填写有效排序。");
      return;
    }

    const hasDuplicateName = agentPlazaCategories.some(
      item =>
        item.id !== agentPlazaCategoryEditor.categoryId &&
        item.name.trim().toLowerCase() === nextName.toLowerCase(),
    );

    if (hasDuplicateName) {
      message.warning("分类名称已存在，请换一个名称。");
      return;
    }

    if (agentPlazaCategoryEditor.mode === "create") {
      createAgentPlazaCategory({
        name: nextName,
        sortOrder: agentPlazaCategoryEditor.sortOrder,
      });
      message.success("AI专家广场分类已创建。");
    } else if (agentPlazaCategoryEditor.categoryId) {
      updateAgentPlazaCategory(agentPlazaCategoryEditor.categoryId, {
        name: nextName,
        sortOrder: agentPlazaCategoryEditor.sortOrder,
      });
      message.success("AI专家广场分类已更新。");
    }

    handleCloseAgentPlazaCategoryEditor();
  }, [
    agentPlazaCategories,
    agentPlazaCategoryEditor,
    createAgentPlazaCategory,
    handleCloseAgentPlazaCategoryEditor,
    updateAgentPlazaCategory,
  ]);

  const handleToggleAgentPlazaCategoryStatus = useCallback(
    (category: OperationsAgentPlazaCategoryOption): void => {
      const nextStatus = category.status === "active" ? "inactive" : "active";
      const activeCategoryCount = agentPlazaCategories.filter(
        item => item.status === "active",
      ).length;

      if (category.status === "active" && activeCategoryCount <= 1) {
        message.warning("至少需要保留一个启用分类。");
        return;
      }

      updateAgentPlazaCategory(category.id, {
        status: nextStatus,
      });
      message.success(nextStatus === "active" ? "分类已启用。" : "分类已停用。");
    },
    [agentPlazaCategories, updateAgentPlazaCategory],
  );

  const handleOpenEditAgentPlaza = useCallback((product: OperationsProduct): void => {
    setAgentPlazaEditor({
      open: true,
      productId: product.id,
      category: product.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
      visibility: product.plazaVisibility ?? "public",
      visibleTenantIds: product.visibleTenantIds ?? [],
      status: getAgentPlazaStatus(product),
    });
  }, []);

  const handleSubmitAgentPlazaSettings = useCallback((): void => {
    if (!agentPlazaEditor.productId) {
      message.warning("未找到当前 AI专家商品。");
      return;
    }

    if (agentPlazaEditor.visibility === "tenant" && !agentPlazaEditor.visibleTenantIds.length) {
      message.warning("指定租户可见时，至少选择一个企业租户。");
      return;
    }

    const selectedCategory =
      agentPlazaCategories.find(item => item.name === agentPlazaEditor.category) ?? null;

    if (!selectedCategory || selectedCategory.status !== "active") {
      message.warning("请选择一个启用中的广场分类。");
      return;
    }

    const targetProduct = products.find(item => item.id === agentPlazaEditor.productId) ?? null;

    if (agentPlazaEditor.status === "online" && targetProduct?.status !== "active") {
      message.warning("商品未上架时不能上架到 AI专家广场。");
      return;
    }

    const visibleTenantNames = tenants
      .filter(item => agentPlazaEditor.visibleTenantIds.includes(item.id))
      .map(item => item.name);

    updateAgentPlazaSettings(agentPlazaEditor.productId, {
      plazaCategory: agentPlazaEditor.category,
      plazaVisibility: agentPlazaEditor.visibility,
      visibleTenantIds:
        agentPlazaEditor.visibility === "tenant" ? agentPlazaEditor.visibleTenantIds : [],
      visibleTenantNames: agentPlazaEditor.visibility === "tenant" ? visibleTenantNames : [],
      plazaStatus: agentPlazaEditor.status,
    });
    message.success("AI专家广场投放设置已更新。");
    setAgentPlazaEditor({
      open: false,
      category: OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
      visibility: "public",
      visibleTenantIds: [],
      status: "offline",
    });
  }, [agentPlazaCategories, agentPlazaEditor, products, tenants, updateAgentPlazaSettings]);

  const handleToggleProductStatus = useCallback(
    (product: OperationsProduct): void => {
      if (product.status === "pendingProductization") {
        message.warning("请先完善商品信息，再执行上架。");
        return;
      }

      const nextStatus = product.status === "active" ? "inactive" : "active";

      updateProductStatus(product.id, nextStatus);
      message.success(nextStatus === "active" ? "商品已上架。" : "商品已下架。");
    },
    [updateProductStatus],
  );

  const handleOpenProductDetail = useCallback(
    (nextProductId: string): void => {
      navigate(buildProductDetailPath(nextProductId));
    },
    [navigate],
  );

  const handleBackToProductList = useCallback((): void => {
    navigate(OPERATIONS_PRODUCT_LIST_PATH);
  }, [navigate]);

  const handleApproveAgent = useCallback(
    (submissionId: string): void => {
      approveAgent(submissionId);
      message.success("AI专家审核已通过，可继续在商品中心转成商品。");
      setAgentReview({
        open: false,
      });
    },
    [approveAgent],
  );

  const handleOpenRejectAgent = useCallback((submission: OperationsAgentSubmission): void => {
    setRejectEditor({
      open: true,
      submissionId: submission.id,
      reason: submission.rejectReason ?? "",
    });
  }, []);

  const handleSubmitRejectAgent = useCallback((): void => {
    if (!rejectEditor.submissionId || !rejectEditor.reason.trim()) {
      message.warning("请先填写驳回原因。");
      return;
    }

    rejectAgent(rejectEditor.submissionId, rejectEditor.reason);
    message.success("已驳回当前 AI专家商品化申请。");
    setRejectEditor({
      open: false,
      reason: "",
    });
    setAgentReview({
      open: false,
    });
  }, [rejectAgent, rejectEditor]);

  const accountMenuItems: MenuProps["items"] = [
    {
      key: "open-user-manual",
      icon: <ReadOutlined />,
      label: "产品使用指南",
      onClick: handleOpenUserManual,
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const activeTenant = useMemo<OperationsTenant | null>(
    () => tenants.find(item => item.id === tenantId) ?? null,
    [tenantId, tenants],
  );
  const activeReviewSubmission = useMemo<OperationsAgentSubmission | null>(
    () => agentSubmissions.find(item => item.id === agentReview.submissionId) ?? null,
    [agentReview.submissionId, agentSubmissions],
  );
  const activeProduct = useMemo<OperationsProduct | null>(
    () => products.find(item => item.id === productId) ?? null,
    [productId, products],
  );

  const content = useMemo((): JSX.Element => {
    if (activeTab === "tenants") {
      if (tenantId) {
        return (
          <TenantDetailConsole
            tenant={activeTenant}
            statusLabels={tenantStatusLabels}
            onBack={handleBackToTenantList}
            onEdit={handleOpenEditTenant}
            onAddMember={handleOpenAddTenantMember}
            onToggleStatus={handleToggleTenantStatus}
          />
        );
      }

      return (
        <TenantConsole
          tenants={tenants}
          statusLabels={tenantStatusLabels}
          onCreate={handleOpenCreateTenant}
          onViewDetail={handleOpenTenantDetail}
        />
      );
    }

    if (activeTab === "agents") {
      return (
        <AgentConsole
          submissions={agentSubmissions}
          statusLabels={agentStatusLabels}
          onOpenReview={handleOpenAgentReview}
        />
      );
    }

    if (activeTab === "agentPlaza") {
      return (
        <AgentPlazaConsole
          products={products}
          tenants={tenants.filter(item => item.type === "enterprise")}
          categories={agentPlazaCategories}
          plazaVisibilityLabels={OPERATIONS_AGENT_PLAZA_VISIBILITY_LABELS}
          onEdit={handleOpenEditAgentPlaza}
          onCreateCategory={handleOpenCreateAgentPlazaCategory}
          onEditCategory={handleOpenEditAgentPlazaCategory}
          onToggleCategoryStatus={handleToggleAgentPlazaCategoryStatus}
        />
      );
    }

    if (activeTab === "products") {
      if (productId) {
        return (
          <ProductDetailConsole
            product={activeProduct}
            statusLabels={productStatusLabels}
            productSaleTypeLabels={productSaleTypeLabels}
            productTrialUnitLabels={productTrialUnitLabels}
            productDeliveryKindLabels={productDeliveryKindLabels}
            productBillingModeLabels={productBillingModeLabels}
            productMeteringUnitLabels={productMeteringUnitLabels}
            productBillingSpecLabels={productBillingSpecLabels}
            onBack={handleBackToProductList}
            onEdit={handleOpenEditProduct}
            onToggleStatus={handleToggleProductStatus}
          />
        );
      }

      return (
        <ProductConsole
          products={products}
          pointsPackages={pointsPackages}
          teamPackages={teamPlanPackages}
          seatPricing={teamSeatPricing}
          statusLabels={productStatusLabels}
          productSaleTypeLabels={productSaleTypeLabels}
          productTrialUnitLabels={productTrialUnitLabels}
          productDeliveryKindLabels={productDeliveryKindLabels}
          productBillingSpecLabels={productBillingSpecLabels}
          onCreate={handleOpenCreateProduct}
          onViewDetail={handleOpenProductDetail}
          onCreatePointsPackage={createPointsPackage}
          onUpdatePointsPackage={updatePointsPackage}
          onCreateTeamPackage={createTeamPlanPackage}
          onUpdateTeamPackage={updateTeamPlanPackage}
          onUpdateSeatPricing={updateTeamSeatPricing}
        />
      );
    }

    if (activeTab === "fulfillment") {
      return (
        <FulfillmentConsole
          fulfillments={fulfillments}
          pointOrders={pointsOrders}
          fulfillmentStatusLabels={fulfillmentStatusLabels}
          productDeliveryKindLabels={productDeliveryKindLabels}
        />
      );
    }

    if (activeTab === "resources") {
      return (
        <ResourcePoolConsole
          resourcePools={resourcePools}
          meteringProviders={meteringProviders}
          modelServices={modelServices}
          externalMeteredServices={externalMeteredServices}
          resourcePoolTypeLabels={resourcePoolTypeLabels}
          resourcePoolAllocationModeLabels={resourcePoolAllocationModeLabels}
          resourcePoolCapacityUnitLabels={resourcePoolCapacityUnitLabels}
          onCreate={handleOpenCreateResourcePool}
          onEdit={handleOpenEditResourcePool}
          onCreateMeteringProvider={createMeteringProvider}
          onUpdateMeteringProvider={updateMeteringProvider}
          onCreateModelService={createModelService}
          onUpdateModelService={updateModelService}
          onCreateExternalMeteredService={createExternalMeteredService}
          onUpdateExternalMeteredService={updateExternalMeteredService}
        />
      );
    }

    if (activeTab === "points") {
      return (
        <OperationsPointsConsole
          registrationStrategy={registrationStrategy}
          pointsUsageRecords={pointsUsageRecords}
          referralRecords={referralRecords}
          onUpdateRegistrationStrategy={updateRegistrationStrategy}
        />
      );
    }

    return (
      <TenantConsole
        tenants={tenants}
        statusLabels={tenantStatusLabels}
        onCreate={handleOpenCreateTenant}
        onViewDetail={handleOpenTenantDetail}
      />
    );
  }, [
    activeProduct,
    activeTenant,
    activeTab,
    agentPlazaCategories,
    agentStatusLabels,
    agentSubmissions,
    createExternalMeteredService,
    createMeteringProvider,
    createModelService,
    createPointsPackage,
    externalMeteredServices,
    fulfillments,
    fulfillmentStatusLabels,
    handleBackToProductList,
    handleBackToTenantList,
    handleOpenAddTenantMember,
    handleOpenAgentReview,
    handleOpenCreateAgentPlazaCategory,
    handleOpenCreateProduct,
    handleOpenCreateResourcePool,
    handleOpenCreateTenant,
    handleOpenEditAgentPlaza,
    handleOpenEditAgentPlazaCategory,
    handleOpenEditResourcePool,
    handleOpenEditProduct,
    handleOpenEditTenant,
    handleOpenTenantDetail,
    handleOpenProductDetail,
    handleToggleProductStatus,
    handleToggleAgentPlazaCategoryStatus,
    handleToggleTenantStatus,
    meteringProviders,
    modelServices,
    productBillingModeLabels,
    productBillingSpecLabels,
    productDeliveryKindLabels,
    productMeteringUnitLabels,
    pointsOrders,
    pointsPackages,
    pointsUsageRecords,
    referralRecords,
    productSaleTypeLabels,
    productStatusLabels,
    productTrialUnitLabels,
    productId,
    products,
    registrationStrategy,
    resourcePoolAllocationModeLabels,
    resourcePoolCapacityUnitLabels,
    resourcePoolTypeLabels,
    resourcePools,
    teamPlanPackages,
    teamSeatPricing,
    tenantId,
    tenantStatusLabels,
    tenants,
    createTeamPlanPackage,
    updateExternalMeteredService,
    updateMeteringProvider,
    updateModelService,
    updatePointsPackage,
    updateRegistrationStrategy,
    updateTeamPlanPackage,
    updateTeamSeatPricing,
  ]);

  return (
    <div className={shellStyles.adminPage}>
      <div className={shellStyles.adminBody}>
        <aside
          className={classNames(shellStyles.adminSidebar, {
            [shellStyles.adminSidebarCollapsed]: isSidebarCollapsed,
          })}
        >
          <div className={shellStyles.adminSidebarTop}>
            <div
              className={classNames(shellStyles.adminSidebarBrandRow, {
                [shellStyles.adminSidebarBrandRowCollapsed]: isSidebarCollapsed,
              })}
            >
              <div
                className={classNames(shellStyles.brandCard, {
                  [shellStyles.brandCardCollapsed]: isSidebarCollapsed,
                })}
              >
                <span className={shellStyles.brandLogo}>F</span>
                {isSidebarCollapsed ? null : (
                  <div className={shellStyles.brandCopy}>
                    <div className={shellStyles.brandTitle}>Frontis AI</div>
                    <div className={shellStyles.brandSubtitle}>运营后台</div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className={shellStyles.sidebarToggle}
                aria-label={isSidebarCollapsed ? "展开左侧菜单" : "收起左侧菜单"}
                onClick={() => setIsSidebarCollapsed(current => !current)}
              >
                {isSidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>
            </div>
          </div>

          <div
            className={classNames(shellStyles.adminSidebarSection, {
              [shellStyles.adminSidebarSectionCollapsed]: isSidebarCollapsed,
            })}
          >
            {OPERATIONS_TAB_OPTIONS.map(item => (
              <button
                key={item.key}
                type="button"
                className={classNames(shellStyles.adminNavButton, {
                  [shellStyles.adminNavButtonActive]: item.key === activeTab,
                  [shellStyles.adminNavButtonCollapsed]: isSidebarCollapsed,
                })}
                onClick={() => handleTabChange(item.key)}
              >
                <span className={shellStyles.tabIcon}>{OPERATIONS_TAB_ICON_MAP[item.key]}</span>
                <span className={shellStyles.tabLabel}>{item.label}</span>
              </button>
            ))}
          </div>

          <div
            className={classNames(shellStyles.adminSidebarFooter, {
              [shellStyles.adminSidebarFooterCollapsed]: isSidebarCollapsed,
            })}
          >
            <Dropdown
              menu={{ items: accountMenuItems }}
              placement={isSidebarCollapsed ? "topRight" : "topLeft"}
              trigger={["click"]}
            >
              <button
                type="button"
                className={classNames(shellStyles.accountTrigger, {
                  [shellStyles.accountTriggerExpanded]: !isSidebarCollapsed,
                })}
                aria-label="打开运营后台账户菜单"
              >
                <Avatar className={shellStyles.accountAvatar} size={36}>
                  {session?.name.slice(0, 1) ?? "O"}
                </Avatar>
                {isSidebarCollapsed ? null : (
                  <span className={shellStyles.accountBody}>
                    <span className={shellStyles.accountName}>{session?.name ?? "未登录"}</span>
                    <span className={shellStyles.accountMeta}>
                      {session?.roleLabel ?? "运营后台"}
                    </span>
                  </span>
                )}
              </button>
            </Dropdown>
          </div>
        </aside>

        <main className={shellStyles.adminMain}>
          <div className={classNames(shellStyles.mainPanel, shellStyles.adminMainPanel)}>
            <div
              className={classNames(
                shellStyles.content,
                shellStyles.featureContent,
                shellStyles.adminFeatureContent,
              )}
            >
              {content}
            </div>
          </div>
        </main>
      </div>

      <Modal
        open={tenantEditor.open}
        title={tenantEditor.mode === "create" ? "创建租户" : "编辑租户"}
        className={classNames(styles.fixedModal, styles.largeModal)}
        width={OPERATIONS_MODAL_WIDTHS.large}
        onCancel={() =>
          setTenantEditor({
            open: false,
            mode: "create",
            form: emptyTenantForm,
          })
        }
        onOk={handleSubmitTenant}
        destroyOnHidden
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.name}>
              租户名称
            </label>
            <Input
              id={TENANT_FIELD_IDS.name}
              value={tenantEditor.form.name}
              onChange={event =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    name: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.code}>
              租户编码（可选）
            </label>
            <Input
              id={TENANT_FIELD_IDS.code}
              value={tenantEditor.form.code}
              onChange={event =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    code: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.industry}>
              行业（可选）
            </label>
            <Input
              id={TENANT_FIELD_IDS.industry}
              value={tenantEditor.form.industry}
              onChange={event =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    industry: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.adminName}>
              管理员姓名
            </label>
            <Input
              id={TENANT_FIELD_IDS.adminName}
              value={tenantEditor.form.adminName}
              onChange={event =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    adminName: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.adminPhone}>
              管理员手机号
            </label>
            <Input
              id={TENANT_FIELD_IDS.adminPhone}
              value={tenantEditor.form.adminPhone}
              onChange={event =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    adminPhone: event.target.value.replace(/\D/g, "").slice(0, 11),
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.agentListingService}>
              AI专家上架服务
            </label>
            <Select<"disabled" | "enabled">
              id={TENANT_FIELD_IDS.agentListingService}
              value={tenantEditor.form.hasAgentListingAccess ? "enabled" : "disabled"}
              options={[
                { value: "disabled", label: "未开通" },
                { value: "enabled", label: "已开通" },
              ]}
              onChange={nextValue =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    hasAgentListingAccess: nextValue === "enabled",
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.seatCount}>
              席位数量
            </label>
            <InputNumber
              id={TENANT_FIELD_IDS.seatCount}
              className={styles.fullWidthInput}
              min={1}
              precision={0}
              value={tenantEditor.form.seatCount || null}
              onChange={nextValue =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    seatCount: typeof nextValue === "number" ? nextValue : 0,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.effectiveAt}>
              生效时间
            </label>
            <Input
              id={TENANT_FIELD_IDS.effectiveAt}
              type="date"
              value={tenantEditor.form.effectiveAt}
              onChange={event =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    effectiveAt: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.expiresAt}>
              失效时间
            </label>
            <Input
              id={TENANT_FIELD_IDS.expiresAt}
              type="date"
              value={tenantEditor.form.expiresAt}
              onChange={event =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    expiresAt: event.target.value,
                  },
                }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={tenantMemberEditor.open}
        title="添加成员"
        className={classNames(styles.fixedModal, styles.compactModal)}
        width={OPERATIONS_MODAL_WIDTHS.compact}
        onCancel={() =>
          setTenantMemberEditor({
            open: false,
            form: emptyTenantMemberForm,
          })
        }
        onOk={handleSubmitTenantMember}
        destroyOnHidden
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_MEMBER_FIELD_IDS.name}>
              成员姓名
            </label>
            <Input
              id={TENANT_MEMBER_FIELD_IDS.name}
              value={tenantMemberEditor.form.name}
              onChange={event =>
                setTenantMemberEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    name: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_MEMBER_FIELD_IDS.phone}>
              成员手机号
            </label>
            <Input
              id={TENANT_MEMBER_FIELD_IDS.phone}
              value={tenantMemberEditor.form.phone}
              onChange={event =>
                setTenantMemberEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    phone: event.target.value.replace(/\D/g, "").slice(0, 11),
                  },
                }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={productEditor.open}
        title={productEditor.mode === "create" ? "创建商品" : "编辑商品"}
        className={classNames(styles.fixedModal, styles.productEditorModal)}
        width={OPERATIONS_MODAL_WIDTHS.productEditor}
        onCancel={() =>
          setProductEditor({
            open: false,
            mode: "create",
            form: emptyProductForm,
          })
        }
        onOk={handleSubmitProduct}
        destroyOnHidden
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.name}>
              商品名称
            </label>
            <Input
              id={PRODUCT_FIELD_IDS.name}
              value={productEditor.form.name}
              onChange={event =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    name: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.supplyKind}>
              商品供给
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.supplyKind}
              value={productEditor.form.supplyKind}
              options={Object.entries(productSupplyKindLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    supplyKind: nextValue,
                    linkedAgentId:
                      nextValue === "agent" ? currentState.form.linkedAgentId : undefined,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.deliveryKind}>
              交付类型
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.deliveryKind}
              value={productEditor.form.deliveryKind}
              options={productDeliveryKindOptions}
              onChange={nextValue =>
                setProductEditor(currentState => {
                  const nextResourcePoolOptions = getAvailableResourcePoolOptions(
                    resourcePools,
                    nextValue,
                  );
                  const nextResourcePoolId =
                    nextValue === "softwareService"
                      ? undefined
                      : nextResourcePoolOptions.some(
                            item => item.value === currentState.form.resourcePoolId,
                          )
                        ? currentState.form.resourcePoolId
                        : nextResourcePoolOptions[0]?.value;

                  return {
                    ...currentState,
                    form: {
                      ...currentState.form,
                      deliveryKind: nextValue,
                      resourcePoolId: nextResourcePoolId,
                    },
                  };
                })
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.saleType}>
              售卖类型
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.saleType}
              value={productEditor.form.saleType}
              options={productSaleTypeOptions}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    saleType: nextValue,
                    price: nextValue === "free" ? 0 : currentState.form.price,
                    supportsTrial: nextValue === "paid" ? currentState.form.supportsTrial : false,
                  },
                }))
              }
            />
          </div>

          {productEditor.form.supplyKind === "agent" ? (
            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.linkedAgentId}>
                绑定 AI专家
              </label>
              <Select
                id={PRODUCT_FIELD_IDS.linkedAgentId}
                value={productEditor.form.linkedAgentId}
                placeholder="请选择已审核通过的 AI专家"
                options={approvedAgents.map(item => ({
                  value: item.id,
                  label: `${item.name} · ${item.version}`,
                }))}
                onChange={nextValue =>
                  setProductEditor(currentState => ({
                    ...currentState,
                    form: {
                      ...currentState.form,
                      linkedAgentId: nextValue,
                    },
                  }))
                }
              />
            </div>
          ) : null}

          {productEditor.form.deliveryKind !== "softwareService" ? (
            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.resourcePoolId}>
                资源池
              </label>
              <Select
                id={PRODUCT_FIELD_IDS.resourcePoolId}
                value={productEditor.form.resourcePoolId}
                placeholder="请选择交付资源池"
                options={availableResourcePoolOptions}
                onChange={nextValue =>
                  setProductEditor(currentState => ({
                    ...currentState,
                    form: {
                      ...currentState.form,
                      resourcePoolId: nextValue,
                    },
                  }))
                }
              />
            </div>
          ) : null}

          {productEditor.form.saleType === "paid" ? (
            <>
              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.billingMode}>
                  计费模式
                </label>
                <Select
                  id={PRODUCT_FIELD_IDS.billingMode}
                  value={productEditor.form.billingMode}
                  options={productBillingModeOptions}
                  onChange={nextValue =>
                    setProductEditor(currentState => {
                      const nextMeteringUnitOptions = getAvailableMeteringUnitOptions(
                        productMeteringUnitOptions,
                        productBillingSpecOptions,
                        nextValue,
                      );
                      const nextMeteringUnit = nextMeteringUnitOptions.some(
                        item => item.value === currentState.form.meteringUnit,
                      )
                        ? currentState.form.meteringUnit
                        : (nextMeteringUnitOptions[0]?.value ?? currentState.form.meteringUnit);
                      const nextBillingSpecOptions = getAvailableBillingSpecOptions(
                        productBillingSpecOptions,
                        nextValue,
                        nextMeteringUnit,
                      );
                      const nextBillingSpec = nextBillingSpecOptions.some(
                        item => item.value === currentState.form.billingSpec,
                      )
                        ? currentState.form.billingSpec
                        : (nextBillingSpecOptions[0]?.value ?? currentState.form.billingSpec);

                      return {
                        ...currentState,
                        form: {
                          ...currentState.form,
                          billingMode: nextValue,
                          meteringUnit: nextMeteringUnit,
                          billingSpec: nextBillingSpec,
                        },
                      };
                    })
                  }
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.meteringUnit}>
                  计量对象
                </label>
                <Select
                  id={PRODUCT_FIELD_IDS.meteringUnit}
                  value={productEditor.form.meteringUnit}
                  options={availableMeteringUnitOptions}
                  onChange={nextValue =>
                    setProductEditor(currentState => {
                      const nextBillingSpecOptions = getAvailableBillingSpecOptions(
                        productBillingSpecOptions,
                        currentState.form.billingMode,
                        nextValue,
                      );
                      const nextBillingSpec = nextBillingSpecOptions.some(
                        item => item.value === currentState.form.billingSpec,
                      )
                        ? currentState.form.billingSpec
                        : (nextBillingSpecOptions[0]?.value ?? currentState.form.billingSpec);

                      return {
                        ...currentState,
                        form: {
                          ...currentState.form,
                          meteringUnit: nextValue,
                          billingSpec: nextBillingSpec,
                        },
                      };
                    })
                  }
                />
              </div>

              {productEditor.form.saleType === "paid" &&
              productEditor.form.billingMode === "subscription" &&
              productEditor.form.supplyKind === "agent" ? (
                <div className={`${styles.modalField} ${styles.fullSpanField}`}>
                  <span className={styles.modalLabel}>订阅方案（月费 / 季费 / 年费）</span>
                  <div className={styles.subscriptionPlanEditorList}>
                    {productEditor.form.subscriptionPlans
                      .slice()
                      .sort((leftItem, rightItem) => leftItem.sortOrder - rightItem.sortOrder)
                      .map((plan, index) => (
                        <div key={plan.key} className={styles.subscriptionPlanEditorCard}>
                          <div className={styles.subscriptionPlanEditorHead}>
                            <div>
                              <strong>{plan.title}</strong>
                              <span>{plan.description}</span>
                            </div>
                            <Select
                              value={plan.status}
                              options={[
                                { value: "active", label: "启用" },
                                { value: "inactive", label: "停用" },
                              ]}
                              onChange={nextValue =>
                                setProductEditor(currentState => ({
                                  ...currentState,
                                  form: {
                                    ...currentState.form,
                                    subscriptionPlans: currentState.form.subscriptionPlans.map(
                                      item =>
                                        item.key === plan.key
                                          ? {
                                              ...item,
                                              status: nextValue,
                                            }
                                          : item,
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className={styles.subscriptionPlanEditorGrid}>
                            <div className={styles.modalField}>
                              <span className={styles.modalLabel}>{plan.title}费用</span>
                              <InputNumber
                                className={styles.fullWidthInput}
                                min={0}
                                precision={0}
                                value={plan.price}
                                onChange={nextValue =>
                                  setProductEditor(currentState => ({
                                    ...currentState,
                                    form: {
                                      ...currentState.form,
                                      subscriptionPlans: currentState.form.subscriptionPlans.map(
                                        item =>
                                          item.key === plan.key
                                            ? {
                                                ...item,
                                                price: nextValue ?? 0,
                                              }
                                            : item,
                                      ),
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className={styles.modalField}>
                              <span className={styles.modalLabel}>划线价</span>
                              <InputNumber
                                className={styles.fullWidthInput}
                                min={0}
                                precision={0}
                                value={plan.originalPrice}
                                onChange={nextValue =>
                                  setProductEditor(currentState => ({
                                    ...currentState,
                                    form: {
                                      ...currentState.form,
                                      subscriptionPlans: currentState.form.subscriptionPlans.map(
                                        item =>
                                          item.key === plan.key
                                            ? {
                                                ...item,
                                                originalPrice:
                                                  nextValue && nextValue > 0
                                                    ? nextValue
                                                    : undefined,
                                              }
                                            : item,
                                      ),
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className={styles.modalField}>
                              <span className={styles.modalLabel}>优惠标签</span>
                              <Input
                                value={plan.tagLabel}
                                onChange={event =>
                                  setProductEditor(currentState => ({
                                    ...currentState,
                                    form: {
                                      ...currentState.form,
                                      subscriptionPlans: currentState.form.subscriptionPlans.map(
                                        item =>
                                          item.key === plan.key
                                            ? {
                                                ...item,
                                                tagLabel: event.target.value.trim() || undefined,
                                              }
                                            : item,
                                      ),
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className={styles.subscriptionPlanEditorFoot}>
                            <span>{plan.durationLabel}</span>
                            <span>{index === 0 ? "用户侧默认展示在左侧" : "按配置顺序展示"}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.modalField}>
                    <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.billingSpec}>
                      结算规格
                    </label>
                    <Select
                      id={PRODUCT_FIELD_IDS.billingSpec}
                      value={productEditor.form.billingSpec}
                      options={availableBillingSpecOptions}
                      onChange={nextValue =>
                        setProductEditor(currentState => ({
                          ...currentState,
                          form: {
                            ...currentState.form,
                            billingSpec: nextValue,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className={styles.modalField}>
                    <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.price}>
                      售价
                    </label>
                    <InputNumber
                      id={PRODUCT_FIELD_IDS.price}
                      className={styles.fullWidthInput}
                      min={0}
                      precision={0}
                      value={productEditor.form.price}
                      onChange={nextValue =>
                        setProductEditor(currentState => ({
                          ...currentState,
                          form: {
                            ...currentState.form,
                            price: nextValue ?? 0,
                          },
                        }))
                      }
                    />
                  </div>
                </>
              )}

              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.supportsTrial}>
                  试用策略
                </label>
                <Select
                  id={PRODUCT_FIELD_IDS.supportsTrial}
                  value={productEditor.form.supportsTrial ? "enabled" : "disabled"}
                  options={[
                    { value: "disabled", label: "不支持试用" },
                    { value: "enabled", label: "支持试用" },
                  ]}
                  onChange={nextValue =>
                    setProductEditor(currentState => ({
                      ...currentState,
                      form: {
                        ...currentState.form,
                        supportsTrial: nextValue === "enabled",
                      },
                    }))
                  }
                />
              </div>

              {productEditor.form.supportsTrial ? (
                <>
                  <div className={styles.modalField}>
                    <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.trialUnit}>
                      试用方式
                    </label>
                    <Select
                      id={PRODUCT_FIELD_IDS.trialUnit}
                      value={productEditor.form.trialUnit}
                      options={productTrialUnitOptions}
                      onChange={nextValue =>
                        setProductEditor(currentState => ({
                          ...currentState,
                          form: {
                            ...currentState.form,
                            trialUnit: nextValue,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className={styles.modalField}>
                    <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.trialValue}>
                      试用规则
                    </label>
                    <InputNumber
                      id={PRODUCT_FIELD_IDS.trialValue}
                      className={styles.fullWidthInput}
                      min={1}
                      precision={0}
                      value={productEditor.form.trialValue}
                      addonAfter={productTrialUnitLabels[productEditor.form.trialUnit]}
                      onChange={nextValue =>
                        setProductEditor(currentState => ({
                          ...currentState,
                          form: {
                            ...currentState.form,
                            trialValue: nextValue ?? 1,
                          },
                        }))
                      }
                    />
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
              <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.freeRule}>
                免费商品规则
              </label>
              <Input
                id={PRODUCT_FIELD_IDS.freeRule}
                value="客户端展示为“立即获取”，不展示试用入口。"
                disabled
              />
            </div>
          )}

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.description}>
              商品描述
            </label>
            <Input.TextArea
              id={PRODUCT_FIELD_IDS.description}
              rows={4}
              value={productEditor.form.description}
              onChange={event =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    description: event.target.value,
                  },
                }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={agentPlazaCategoryEditor.open}
        title={agentPlazaCategoryEditor.mode === "create" ? "新建广场分类" : "编辑广场分类"}
        className={classNames(styles.fixedModal, styles.compactModal)}
        width={OPERATIONS_MODAL_WIDTHS.compact}
        onCancel={handleCloseAgentPlazaCategoryEditor}
        onOk={handleSubmitAgentPlazaCategory}
        destroyOnHidden
      >
        <div className={styles.formGrid}>
          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_CATEGORY_FIELD_IDS.name}>
              分类名称
            </label>
            <Input
              id={AGENT_PLAZA_CATEGORY_FIELD_IDS.name}
              value={agentPlazaCategoryEditor.name}
              placeholder="如 销售、供应链、财务"
              onChange={event =>
                setAgentPlazaCategoryEditor(currentState => ({
                  ...currentState,
                  name: event.target.value,
                }))
              }
            />
          </div>

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_CATEGORY_FIELD_IDS.sortOrder}>
              排序
            </label>
            <InputNumber
              id={AGENT_PLAZA_CATEGORY_FIELD_IDS.sortOrder}
              className={styles.fullWidthInput}
              min={0}
              value={agentPlazaCategoryEditor.sortOrder}
              onChange={nextValue =>
                setAgentPlazaCategoryEditor(currentState => ({
                  ...currentState,
                  sortOrder: typeof nextValue === "number" ? nextValue : 0,
                }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={agentPlazaEditor.open}
        title="编辑 AI专家广场投放"
        className={classNames(styles.fixedModal, styles.standardModal)}
        width={OPERATIONS_MODAL_WIDTHS.standard}
        onCancel={() =>
          setAgentPlazaEditor({
            open: false,
            category: OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
            visibility: "public",
            visibleTenantIds: [],
            status: "offline",
          })
        }
        onOk={handleSubmitAgentPlazaSettings}
        destroyOnHidden
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_FIELD_IDS.category}>
              广场分类
            </label>
            <Select
              id={AGENT_PLAZA_FIELD_IDS.category}
              value={agentPlazaEditor.category}
              options={agentPlazaCategoryOptions}
              onChange={nextValue =>
                setAgentPlazaEditor(currentState => ({
                  ...currentState,
                  category: nextValue,
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_FIELD_IDS.visibility}>
              可见范围
            </label>
            <Select
              id={AGENT_PLAZA_FIELD_IDS.visibility}
              value={agentPlazaEditor.visibility}
              options={Object.entries(OPERATIONS_AGENT_PLAZA_VISIBILITY_LABELS).map(
                ([value, label]) => ({
                  value,
                  label,
                }),
              )}
              onChange={nextValue =>
                setAgentPlazaEditor(currentState => ({
                  ...currentState,
                  visibility: nextValue,
                  visibleTenantIds: nextValue === "tenant" ? currentState.visibleTenantIds : [],
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_FIELD_IDS.status}>
              上架状态
            </label>
            <div className={adminStyles.consoleActions}>
              <Switch
                id={AGENT_PLAZA_FIELD_IDS.status}
                checked={agentPlazaEditor.status === "online"}
                checkedChildren="上架"
                unCheckedChildren="下架"
                onChange={checked =>
                  setAgentPlazaEditor(currentState => ({
                    ...currentState,
                    status: checked ? "online" : "offline",
                  }))
                }
              />
              <span className={adminStyles.consoleInfoValue}>
                当前为{agentPlazaEditor.status === "online" ? "上架" : "下架"}
              </span>
            </div>
          </div>

          {agentPlazaEditor.visibility === "tenant" ? (
            <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
              <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_FIELD_IDS.visibleTenantIds}>
                指定可见租户
              </label>
              <Select
                id={AGENT_PLAZA_FIELD_IDS.visibleTenantIds}
                mode="multiple"
                value={agentPlazaEditor.visibleTenantIds}
                placeholder="请选择可见租户"
                options={tenants
                  .filter(item => item.type === "enterprise")
                  .map(item => ({
                    value: item.id,
                    label: item.name,
                  }))}
                onChange={nextValue =>
                  setAgentPlazaEditor(currentState => ({
                    ...currentState,
                    visibleTenantIds: nextValue,
                  }))
                }
              />
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={resourcePoolEditor.open}
        title={resourcePoolEditor.mode === "create" ? "创建资源池" : "编辑资源池"}
        className={classNames(styles.fixedModal, styles.largeModal)}
        width={OPERATIONS_MODAL_WIDTHS.large}
        onCancel={() =>
          setResourcePoolEditor({
            open: false,
            mode: "create",
            form: emptyResourcePoolForm,
          })
        }
        onOk={handleSubmitResourcePool}
        destroyOnHidden
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={RESOURCE_POOL_FIELD_IDS.name}>
              资源池名称
            </label>
            <Input
              id={RESOURCE_POOL_FIELD_IDS.name}
              value={resourcePoolEditor.form.name}
              onChange={event =>
                setResourcePoolEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    name: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={RESOURCE_POOL_FIELD_IDS.resourceType}>
              资源类型
            </label>
            <Select
              id={RESOURCE_POOL_FIELD_IDS.resourceType}
              value={resourcePoolEditor.form.resourceType}
              options={resourcePoolTypeOptions}
              onChange={nextValue =>
                setResourcePoolEditor(currentState => {
                  const nextCapacityUnitOptions = getAvailableCapacityUnitOptions(
                    resourcePoolCapacityUnitOptions,
                    nextValue,
                  );
                  const nextCapacityUnit = nextCapacityUnitOptions.some(
                    item => item.value === currentState.form.capacityUnit,
                  )
                    ? currentState.form.capacityUnit
                    : (nextCapacityUnitOptions[0]?.value ?? currentState.form.capacityUnit);

                  return {
                    ...currentState,
                    form: {
                      ...currentState.form,
                      resourceType: nextValue,
                      capacityUnit: nextCapacityUnit,
                    },
                  };
                })
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={RESOURCE_POOL_FIELD_IDS.provider}>
              供应商
            </label>
            <Input
              id={RESOURCE_POOL_FIELD_IDS.provider}
              value={resourcePoolEditor.form.provider}
              onChange={event =>
                setResourcePoolEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    provider: event.target.value,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={RESOURCE_POOL_FIELD_IDS.allocationMode}>
              分配方式
            </label>
            <Select
              id={RESOURCE_POOL_FIELD_IDS.allocationMode}
              value={resourcePoolEditor.form.allocationMode}
              options={resourcePoolAllocationModeOptions}
              onChange={nextValue =>
                setResourcePoolEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    allocationMode: nextValue,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={RESOURCE_POOL_FIELD_IDS.totalCapacity}>
              总容量
            </label>
            <InputNumber
              id={RESOURCE_POOL_FIELD_IDS.totalCapacity}
              className={styles.fullWidthInput}
              min={0}
              precision={0}
              value={resourcePoolEditor.form.totalCapacity}
              onChange={nextValue =>
                setResourcePoolEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    totalCapacity: nextValue ?? 0,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label
              className={styles.modalLabel}
              htmlFor={RESOURCE_POOL_FIELD_IDS.availableCapacity}
            >
              可用容量
            </label>
            <InputNumber
              id={RESOURCE_POOL_FIELD_IDS.availableCapacity}
              className={styles.fullWidthInput}
              min={0}
              precision={0}
              value={resourcePoolEditor.form.availableCapacity}
              onChange={nextValue =>
                setResourcePoolEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    availableCapacity: nextValue ?? 0,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={RESOURCE_POOL_FIELD_IDS.capacityUnit}>
              容量单位
            </label>
            <Select
              id={RESOURCE_POOL_FIELD_IDS.capacityUnit}
              value={resourcePoolEditor.form.capacityUnit}
              options={availableCapacityUnitOptions}
              onChange={nextValue =>
                setResourcePoolEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    capacityUnit: nextValue,
                  },
                }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={agentReview.open}
        title={activeReviewSubmission?.name ?? "商品化审核"}
        className={classNames(styles.fixedModal, styles.reviewModal)}
        onCancel={handleCloseAgentReview}
        footer={
          activeReviewSubmission ? (
            <>
              <Button key="close" onClick={handleCloseAgentReview}>
                关闭
              </Button>
              {activeReviewSubmission.status === "pending" ? (
                <>
                  <Button
                    key="reject"
                    onClick={() => handleOpenRejectAgent(activeReviewSubmission)}
                  >
                    驳回并填写意见
                  </Button>
                  <Button
                    key="approve"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleApproveAgent(activeReviewSubmission.id)}
                  >
                    审核通过并进入商品中心
                  </Button>
                </>
              ) : null}
            </>
          ) : (
            <Button key="close" onClick={handleCloseAgentReview}>
              关闭
            </Button>
          )
        }
        width={OPERATIONS_MODAL_WIDTHS.review}
        destroyOnHidden
      >
        {activeReviewSubmission ? (
          <div className={styles.modalDetailStack}>
            <div className={styles.reviewModalMeta}>
              <span className={getAgentStatusClassName(activeReviewSubmission.status)}>
                {agentStatusLabels[activeReviewSubmission.status]}
              </span>
              <span className={styles.reviewModalMetaText}>
                {activeReviewSubmission.version} · {activeReviewSubmission.submitter}
              </span>
            </div>

            <section className={adminStyles.detailBlock}>
              <h3 className={adminStyles.detailBlockTitle}>审核信息</h3>
              <div className={adminStyles.consoleRows}>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>申请类型</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {activeReviewSubmission.submissionType === "commodityApplication"
                      ? "申请发布为商品"
                      : "广场发布"}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>提审人</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {activeReviewSubmission.submitter}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>提审时间</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {activeReviewSubmission.submittedAt}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>版本</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {activeReviewSubmission.version}
                  </span>
                </div>
                {activeReviewSubmission.proposedProductName ? (
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>拟上架商品名</span>
                    <span className={adminStyles.consoleInfoValue}>
                      {activeReviewSubmission.proposedProductName}
                    </span>
                  </div>
                ) : null}
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>最近处理</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {activeReviewSubmission.lastReviewedAt ?? "待处理"}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>当前发布范围</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {activeReviewSubmission.currentScopeLabel ?? "未设置"}
                  </span>
                </div>
              </div>
            </section>

            <section className={adminStyles.detailBlock}>
              <h3 className={adminStyles.detailBlockTitle}>商品化说明</h3>
              <p className={styles.detailParagraph}>{activeReviewSubmission.description}</p>
              {activeReviewSubmission.submitReason ? (
                <div className={styles.reviewMetaBlock}>
                  <span className={styles.reviewMetaLabel}>申请理由</span>
                  <p className={styles.detailParagraph}>{activeReviewSubmission.submitReason}</p>
                </div>
              ) : null}
              {activeReviewSubmission.targetCustomers ? (
                <div className={styles.reviewMetaBlock}>
                  <span className={styles.reviewMetaLabel}>适用客户</span>
                  <p className={styles.detailParagraph}>{activeReviewSubmission.targetCustomers}</p>
                </div>
              ) : null}
              {activeReviewSubmission.rejectReason ? (
                <div className={styles.alertBlock}>
                  驳回原因：{activeReviewSubmission.rejectReason}
                </div>
              ) : null}
            </section>
          </div>
        ) : (
          <div className={styles.emptyWrap}>
            <Empty description="未找到该提审记录。" />
          </div>
        )}
      </Modal>

      <Modal
        open={rejectEditor.open}
        title="驳回 Agent 提审"
        className={classNames(styles.fixedModal, styles.compactModal)}
        width={OPERATIONS_MODAL_WIDTHS.compact}
        onCancel={() =>
          setRejectEditor({
            open: false,
            reason: "",
          })
        }
        onOk={handleSubmitRejectAgent}
        destroyOnHidden
      >
        <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
          <label className={styles.modalLabel} htmlFor={REJECT_FIELD_ID}>
            驳回原因
          </label>
          <Input.TextArea
            id={REJECT_FIELD_ID}
            rows={4}
            value={rejectEditor.reason}
            onChange={event =>
              setRejectEditor(currentState => ({
                ...currentState,
                reason: event.target.value,
              }))
            }
          />
        </div>
      </Modal>
    </div>
  );
};
