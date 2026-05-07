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
  TeamOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Button, Dropdown, Empty, Input, InputNumber, Modal, Select, message } from "antd";
import classNames from "classnames";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  findIdentityForPath,
  getLoginPath,
  getSystemEntries,
  rechargeMockTenantPoints,
} from "@/feature/auth/mockAccounts";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import {
  getMockTenantManagementSnapshot,
  saveMockTenantManagementSnapshot,
} from "@/feature/auth/mockTenantRegistry";
import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import { useOperationsPlatform } from "@/feature/operations/hooks/useOperationsPlatform";
import type {
  MockAuthSystemEntry,
  MockTenantManagementSnapshot,
  MockTenantPointsOrderItem,
  MockTenantPointsOrderStatus,
} from "@/feature/auth/types";
import {
  OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
  OPERATIONS_DEFAULT_PATH,
  OPERATIONS_PRODUCT_BILLING_SCOPE_LABELS,
  OPERATIONS_PRODUCT_BILLING_SCOPE_OPTIONS,
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
  OperationsProductBillingScope,
  OperationsProductForm,
  OperationsResourcePool,
  OperationsResourcePoolForm,
  OperationsTenant,
  OperationsTenantDeploymentMode,
  OperationsTenantEdition,
  OperationsTenantForm,
} from "@/feature/operations/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";
import shellStyles from "@/pages/FrontisPage.module.less";

import { OperationsPointsConsole } from "./OperationsPointsConsole";
import styles from "./OperationsPlatformView.module.less";
import {
  OperationsResourceMeteringConsole,
  type OperationsResourceMeteringMode,
} from "./OperationsResourceMeteringConsole";
import { OperationsOrganizationConsole } from "./OperationsOrganizationConsole";

const USER_MANUAL_ROUTE_PATH = "/user-manual";

interface TenantEditorState {
  open: boolean;
  mode: "create" | "edit";
  tenantId?: string;
  form: OperationsTenantForm;
}

interface ProductEditorState {
  open: boolean;
  mode: "create" | "edit";
  productId?: string;
  form: OperationsProductForm;
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
type ProductConsoleTabKey = "delivery" | "category";
type ResourcePoolConsoleTabKey = OperationsResourceMeteringMode;

interface TenantConsoleProps {
  tenants: OperationsTenant[];
  statusLabels: Record<OperationsTenant["status"], string>;
  onCreate: () => void;
  onViewDetail: (tenantId: string) => void;
}

interface TenantDetailConsoleProps {
  tenant: OperationsTenant | null;
  pointsActorName: string;
  statusLabels: Record<OperationsTenant["status"], string>;
  onBack: () => void;
  onEdit: (tenant: OperationsTenant) => void;
  onToggleStatus: (tenant: OperationsTenant) => void;
}

interface AgentConsoleProps {
  submissions: OperationsAgentSubmission[];
  statusLabels: Record<OperationsAgentSubmission["status"], string>;
  onOpenReview: (submissionId: string) => void;
}

interface ProductConsoleProps {
  products: OperationsProduct[];
  categories: OperationsAgentPlazaCategoryOption[];
  statusLabels: Record<OperationsProduct["status"], string>;
  productTrialUnitLabels: Record<NonNullable<OperationsProduct["trialUnit"]>, string>;
  onCreate: () => void;
  onViewDetail: (productId: string) => void;
  onCreateCategory: () => void;
  onEditCategory: (category: OperationsAgentPlazaCategoryOption) => void;
  onToggleCategoryStatus: (category: OperationsAgentPlazaCategoryOption) => void;
}

interface ProductDetailConsoleProps {
  product: OperationsProduct | null;
  statusLabels: Record<OperationsProduct["status"], string>;
  productTrialUnitLabels: Record<NonNullable<OperationsProduct["trialUnit"]>, string>;
  onBack: () => void;
  onEdit: (product: OperationsProduct) => void;
  onToggleStatus: (product: OperationsProduct) => void;
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
  meteringProviders: OperationsMeteringProvider[];
  modelServices: OperationsModelService[];
  externalMeteredServices: OperationsExternalMeteredService[];
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
  organization: <TeamOutlined />,
  agents: <RobotOutlined />,
  products: <ShopOutlined />,
  fulfillment: <DeploymentUnitOutlined />,
  resources: <DatabaseOutlined />,
  points: <ControlOutlined />,
};

const TENANT_FIELD_IDS = {
  name: "operations-tenant-name",
  code: "operations-tenant-code",
  deploymentMode: "operations-tenant-billing-mode",
  industry: "operations-tenant-industry",
  adminName: "operations-tenant-admin-name",
  adminPhone: "operations-tenant-admin-phone",
  agentListingService: "operations-tenant-agent-listing-service",
  seatCount: "operations-tenant-seat-count",
  effectiveAt: "operations-tenant-effective-at",
  expiresAt: "operations-tenant-expires-at",
  moduleLabels: "operations-tenant-module-labels",
} as const;

const OPERATIONS_TENANT_DEPLOYMENT_MODE_LABELS: Record<OperationsTenantDeploymentMode, string> = {
  publicCloud: "积分计费",
  privateCloud: "成本计费",
};

const OPERATIONS_TENANT_EDITION_LABELS: Record<OperationsTenantEdition, string> = {
  personal: "个人版",
  team: "团队版",
};

const OPERATIONS_TENANT_DEPLOYMENT_MODE_OPTIONS: Array<{
  label: string;
  value: OperationsTenantDeploymentMode;
}> = [
  { label: "积分计费", value: "publicCloud" },
  { label: "成本计费", value: "privateCloud" },
];

type ProductAcquisitionMode = "freeAdd" | "trial";

const PRODUCT_ACQUISITION_MODE_OPTIONS: Array<{
  value: ProductAcquisitionMode;
  label: string;
}> = [
  { value: "freeAdd", label: "免费添加" },
  { value: "trial", label: "免费试用" },
];

const PRODUCT_FIELD_IDS = {
  name: "operations-product-name",
  category: "operations-product-category",
  billingScopes: "operations-product-billing-scopes",
  status: "operations-product-status",
  acquisitionMode: "operations-product-acquisition-mode",
  linkedAgentId: "operations-product-linked-agent",
  trialUnit: "operations-product-trial-unit",
  trialValue: "operations-product-trial-value",
  description: "operations-product-description",
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
    tabPath === "organization" ||
    tabPath === "agents" ||
    tabPath === "products" ||
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
  { key: "delivery", label: "商品列表" },
  { key: "category", label: "分类管理" },
];

const RESOURCE_POOL_CONSOLE_TAB_OPTIONS: Array<{
  key: ResourcePoolConsoleTabKey;
  label: string;
}> = [
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

const formatPoints = (value: number): string => value.toLocaleString("zh-CN");

const buildOperationsTenantPointsSnapshot = (
  tenant: OperationsTenant,
  points: number,
  actorName: string,
  description: string,
): MockTenantManagementSnapshot => ({
  tenantId: tenant.id,
  tenantName: tenant.name,
  tenantCode: tenant.code,
  ownerAccountId: `${tenant.id}-owner`,
  adminUserId: `${tenant.id}-admin`,
  deploymentMode: tenant.deploymentMode,
  edition: tenant.edition,
  planLabel: tenant.edition === "personal" ? "个人版" : `团队 ${tenant.seatCount} 席版`,
  includedSeats: tenant.seatCount,
  extraSeatCount: 0,
  teamPlanPackageId: tenant.edition === "team" ? "team-custom" : undefined,
  planExpiresAt: tenant.expiresAt,
  hasAgentListingAccess: tenant.hasAgentListingAccess,
  invitePolicyLabel:
    tenant.edition === "team" ? "团队版租户支持组织管理与成员邀请。" : "个人版租户仅保留本人席位。",
  lowBalanceThreshold: 2000,
  monthlyUsedPoints: 0,
  pointsBalance: points,
  totalSeats: tenant.seatCount,
  usedSeats: Math.max(tenant.members.length, 1),
  users: [],
  agentUsageRecords: [],
  pointsLedger: [
    {
      id: `${tenant.id}-operations-points-${Date.now()}`,
      title: "购买标准积分包",
      description,
      points,
      direction: "income",
      createdAt: "刚刚",
      actorName,
    },
  ],
  pointsUsageRecords: [],
  pointsOrders: [],
  referralRecords: [],
});

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

const getProductTrialLabel = (
  product: OperationsProduct,
  productTrialUnitLabels: Record<NonNullable<OperationsProduct["trialUnit"]>, string>,
): string => {
  if (!product.supportsTrial || !product.trialUnit || !product.trialValue) {
    return "不支持试用";
  }

  return `${product.trialValue}${productTrialUnitLabels[product.trialUnit]}`;
};

const getProductBillingScopeLabel = (product: OperationsProduct): string => {
  const billingScopes: OperationsProductBillingScope[] = product.billingScopes?.length
    ? product.billingScopes
    : ["points"];

  return billingScopes.map(item => OPERATIONS_PRODUCT_BILLING_SCOPE_LABELS[item]).join(" / ");
};

const getProductAcquisitionLabel = (product: OperationsProduct): string => {
  if (product.supportsTrial) {
    return "免费试用";
  }

  return "免费添加";
};

const getProductAcquisitionMode = (
  form: Pick<OperationsProductForm, "supportsTrial">,
): ProductAcquisitionMode => {
  if (form.supportsTrial) {
    return "trial";
  }

  return "freeAdd";
};

const applyProductAcquisitionMode = (
  form: OperationsProductForm,
  mode: ProductAcquisitionMode,
): OperationsProductForm => {
  const shouldSupportTrial = mode === "trial";

  return {
    ...form,
    supportsTrial: shouldSupportTrial,
    contactMode: "disabled",
    contactQrCodeValue: "",
    contactRemark: "",
  };
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
        const searchSource = [
          item.name,
          item.adminName,
          item.adminPhone,
          OPERATIONS_TENANT_DEPLOYMENT_MODE_LABELS[item.deploymentMode],
          OPERATIONS_TENANT_EDITION_LABELS[item.edition],
          ...item.moduleLabels,
        ]
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
                  <th>计费模式</th>
                  <th>版本</th>
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
                    <td>{OPERATIONS_TENANT_DEPLOYMENT_MODE_LABELS[tenant.deploymentMode]}</td>
                    <td>{OPERATIONS_TENANT_EDITION_LABELS[tenant.edition]}</td>
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
  pointsActorName,
  statusLabels,
  onBack,
  onEdit,
  onToggleStatus,
}: TenantDetailConsoleProps): JSX.Element => {
  const [pointsSnapshotVersion, setPointsSnapshotVersion] = useState<number>(0);
  const [pointsEditor, setPointsEditor] = useState<{
    open: boolean;
    amount: number;
    description: string;
  }>({
    open: false,
    amount: 10000,
    description: "运营后台为租户补充积分额度。",
  });

  useEffect(() => {
    setPointsSnapshotVersion(0);
    setPointsEditor({
      open: false,
      amount: 10000,
      description: "运营后台为租户补充积分额度。",
    });
  }, [tenant?.id]);

  const tenantPointsSnapshot = useMemo(
    () =>
      tenant?.deploymentMode === "publicCloud" ? getMockTenantManagementSnapshot(tenant.id) : null,
    [pointsSnapshotVersion, tenant?.deploymentMode, tenant?.id],
  );

  const handleOpenPointsEditor = useCallback((): void => {
    setPointsEditor({
      open: true,
      amount: 10000,
      description: "运营后台为租户补充积分额度。",
    });
  }, []);

  const handleClosePointsEditor = useCallback((): void => {
    setPointsEditor(current => ({
      ...current,
      open: false,
    }));
  }, []);

  const handleSubmitPointsEditor = useCallback((): void => {
    if (!tenant || tenant.deploymentMode !== "publicCloud") {
      return;
    }

    const nextAmount = Math.trunc(pointsEditor.amount);
    const nextDescription = pointsEditor.description.trim() || "运营后台为租户补充积分额度。";

    if (nextAmount <= 0) {
      message.warning("请填写大于 0 的积分数量。");
      return;
    }

    const updatedSnapshot =
      rechargeMockTenantPoints(tenant.id, nextAmount, pointsActorName, {
        title: "购买标准积分包",
        description: nextDescription,
      }) ??
      saveMockTenantManagementSnapshot(
        buildOperationsTenantPointsSnapshot(tenant, nextAmount, pointsActorName, nextDescription),
      );

    if (!updatedSnapshot) {
      message.error("积分配置失败，请稍后重试。");
      return;
    }

    setPointsSnapshotVersion(version => version + 1);
    handleClosePointsEditor();
    message.success(`已为 ${tenant.name} 增加 ${formatPoints(nextAmount)} 积分`);
  }, [
    handleClosePointsEditor,
    pointsActorName,
    pointsEditor.amount,
    pointsEditor.description,
    tenant,
  ]);

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
            {tenant.deploymentMode === "publicCloud" ? (
              <Button onClick={handleOpenPointsEditor}>配置积分</Button>
            ) : null}
            <Button onClick={() => onEdit(tenant)}>编辑资料</Button>
            <Button onClick={() => onToggleStatus(tenant)}>
              {tenant.status === "suspended" ? "启用租户" : "停用租户"}
            </Button>
          </div>
        ) : null}
      </header>

      {tenant ? (
        <section className={adminStyles.consoleSection}>
          <div className={classNames(styles.detailGrid, styles.tenantDetailGrid)}>
            <section className={adminStyles.detailBlock}>
              <h3
                className={classNames(adminStyles.detailBlockTitle, styles.detailBlockTitleReset)}
              >
                基础信息
              </h3>
              <div className={adminStyles.consoleRows}>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>计费模式</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {OPERATIONS_TENANT_DEPLOYMENT_MODE_LABELS[tenant.deploymentMode]}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>版本</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {OPERATIONS_TENANT_EDITION_LABELS[tenant.edition]}
                  </span>
                </div>
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
                {tenant.deploymentMode === "publicCloud" ? (
                  <div className={adminStyles.consoleInfoRow}>
                    <span className={adminStyles.consoleInfoLabel}>积分余额</span>
                    <span className={adminStyles.consoleInfoValue}>
                      {tenantPointsSnapshot
                        ? `${formatPoints(tenantPointsSnapshot.pointsBalance)} 积分`
                        : "未初始化"}
                    </span>
                  </div>
                ) : null}
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

      {tenant?.deploymentMode === "publicCloud" ? (
        <Modal
          width={OPERATIONS_MODAL_WIDTHS.compact}
          open={pointsEditor.open}
          title="配置租户积分"
          okText="确认增加"
          cancelText="取消"
          onCancel={handleClosePointsEditor}
          onOk={handleSubmitPointsEditor}
        >
          <div className={styles.modalForm}>
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>当前余额</span>
              <span className={adminStyles.consoleInfoValue}>
                {tenantPointsSnapshot
                  ? `${formatPoints(tenantPointsSnapshot.pointsBalance)} 积分`
                  : "未初始化"}
              </span>
            </div>
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>本次增加积分</span>
              <InputNumber
                className={styles.modalControl}
                min={1}
                precision={0}
                value={pointsEditor.amount}
                onChange={value =>
                  setPointsEditor(current => ({
                    ...current,
                    amount: Number(value ?? 0),
                  }))
                }
              />
            </div>
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>备注</span>
              <Input.TextArea
                rows={3}
                value={pointsEditor.description}
                onChange={event =>
                  setPointsEditor(current => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        </Modal>
      ) : null}
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

const ProductConsole = ({
  products,
  categories,
  statusLabels,
  productTrialUnitLabels,
  onCreate,
  onViewDetail,
  onCreateCategory,
  onEditCategory,
  onToggleCategoryStatus,
}: ProductConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [activeConsoleTab, setActiveConsoleTab] = useState<ProductConsoleTabKey>("delivery");
  const sortedCategories = useMemo<OperationsAgentPlazaCategoryOption[]>(
    () => getSortedAgentPlazaCategories(categories),
    [categories],
  );
  const activeCategoryCount = sortedCategories.filter(item => item.status === "active").length;

  const filteredAgentProducts = useMemo<OperationsProduct[]>(
    () =>
      products.filter(item => {
        if (item.supplyKind !== "agent") {
          return false;
        }

        const searchSource = [
          item.name,
          item.linkedAgentName ?? "",
          item.description,
          item.plazaCategory ?? "",
          getProductAcquisitionLabel(item),
          getProductBillingScopeLabel(item),
        ]
          .join(" ")
          .toLowerCase();

        return searchSource.includes(keyword.trim().toLowerCase());
      }),
    [keyword, products],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>商品中心</h1>
        </div>

        <div className={adminStyles.consoleHeaderSide}>
          {activeConsoleTab === "delivery" ? (
            <>
              <Input
                className={adminStyles.consoleInlineSearch}
                value={keyword}
                placeholder="搜索 AI专家商品、分类、计费模型"
                onChange={event => setKeyword(event.target.value)}
              />
              <Button type="primary" onClick={onCreate}>
                新建AI专家商品
              </Button>
            </>
          ) : (
            <Button type="primary" onClick={onCreateCategory}>
              <PlusOutlined />
              新建分类
            </Button>
          )}
        </div>
      </header>

      <div className={styles.detailTabBar}>
        {PRODUCT_CONSOLE_TAB_OPTIONS.map(item => (
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
              <h2 className={adminStyles.consoleSectionTitle}>AI专家商品</h2>
            </div>
          </div>

          {filteredAgentProducts.length ? (
            <div className={adminStyles.consoleHtmlTableWrap}>
              <table className={adminStyles.consoleHtmlTable}>
                <thead>
                  <tr>
                    <th>AI专家商品</th>
                    <th>分类</th>
                    <th>计费模型</th>
                    <th>获取方式</th>
                    <th>试用规则</th>
                    <th>上架状态</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgentProducts.map(product => (
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
                      <td>{product.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY}</td>
                      <td>{getProductBillingScopeLabel(product)}</td>
                      <td>{getProductAcquisitionLabel(product)}</td>
                      <td>{getProductTrialLabel(product, productTrialUnitLabels)}</td>
                      <td>
                        <span className={getProductStatusClassName(product.status)}>
                          {statusLabels[product.status]}
                        </span>
                      </td>
                      <td>{product.updatedAt}</td>
                      <td>
                        <Button size="small" type="link" onClick={() => onViewDetail(product.id)}>
                          {product.status === "pendingProductization" ? "完善配置" : "查看详情"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyWrap}>
              <Empty description="当前筛选下暂无 AI专家商品。" />
            </div>
          )}
        </section>
      ) : (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>分类管理</h2>
              <p className={adminStyles.consoleSectionMeta}>
                共 {sortedCategories.length} 个分类，{activeCategoryCount} 个启用。
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
              <Empty description="暂无商品分类，请先创建分类。" />
            </div>
          )}
        </section>
      )}
    </div>
  );
};

const ProductDetailConsole = ({
  product,
  statusLabels,
  productTrialUnitLabels,
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
              ? getProductAcquisitionLabel(product)
              : "当前商品不存在或已被移除，请返回列表重新选择。"}
          </p>
        </div>

        {product ? (
          <div className={adminStyles.consoleActions}>
            <span className={getProductStatusClassName(product.status)}>
              {statusLabels[product.status]}
            </span>
            <Button onClick={() => onEdit(product)}>
              {product.status === "pendingProductization" ? "完善配置" : "编辑配置"}
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
              该 AI专家 已通过审核，请先完善获取方式和试用规则后再上架。
            </div>
          ) : null}
          <div className={styles.detailGrid}>
            <section className={adminStyles.detailBlock}>
              <h3 className={adminStyles.detailBlockTitle}>获取配置</h3>
              <div className={adminStyles.consoleRows}>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>商品分类</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {product.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>计费模型</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {getProductBillingScopeLabel(product)}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>获取方式</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {getProductAcquisitionLabel(product)}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>试用策略</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {getProductTrialLabel(product, productTrialUnitLabels)}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>关联 AI专家</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {product.linkedAgentName ?? "未绑定 AI专家"}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>更新时间</span>
                  <span className={adminStyles.consoleInfoValue}>{product.updatedAt}</span>
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
  meteringProviders,
  modelServices,
  externalMeteredServices,
  onCreateMeteringProvider,
  onUpdateMeteringProvider,
  onCreateModelService,
  onUpdateModelService,
  onCreateExternalMeteredService,
  onUpdateExternalMeteredService,
}: ResourcePoolConsoleProps): JSX.Element => {
  const [activeResourceTab, setActiveResourceTab] = useState<ResourcePoolConsoleTabKey>("models");

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>资源池管理</h1>
          <p className={adminStyles.consoleSubtitle}>
            统一维护大模型与接口资源的成本、计量规则和可用状态。
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
    </div>
  );
};

/**
 * 运营后台主视图，按企业管理后台的骨架和内容标准重构。
 */
export const OperationsPlatformView = (): JSX.Element => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tabPath, tenantId, productId } = useParams<{
    tabPath?: string;
    tenantId?: string;
    productId?: string;
  }>();
  const { activateIdentity, logout: logoutUnified, session: unifiedSession } = useMockAuth();
  const { loginByAccountId, logout, session } = useOperationsAuth();
  const {
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
    externalMeteredServices,
    fulfillmentStatusLabels,
    fulfillments,
    meteringProviders,
    modelServices,
    pointsOrders,
    pointsPackages,
    pointsUsageRecords,
    referralRecords,
    productDeliveryKindLabels,
    productStatusLabels,
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
  const [productEditor, setProductEditor] = useState<ProductEditorState>({
    open: false,
    mode: "create",
    form: emptyProductForm,
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

  const availableCapacityUnitOptions = useMemo(
    () =>
      getAvailableCapacityUnitOptions(
        resourcePoolCapacityUnitOptions,
        resourcePoolEditor.form.resourceType,
      ),
    [resourcePoolCapacityUnitOptions, resourcePoolEditor.form.resourceType],
  );

  const agentPlazaCategoryOptions = useMemo(
    () =>
      getAgentPlazaCategorySelectOptions(agentPlazaCategories, productEditor.form.plazaCategory),
    [agentPlazaCategories, productEditor.form.plazaCategory],
  );

  const activeTabFromPath = useMemo<OperationsPlatformTabKey | null>(
    () => getTabKeyFromPath(tabPath),
    [tabPath],
  );
  const hasDetailRoute = Boolean(tenantId || productId);
  const activeTab = useMemo<OperationsPlatformTabKey>(
    () => activeTabFromPath ?? (productId ? "products" : "tenants"),
    [activeTabFromPath, productId],
  );

  useEffect(() => {
    if (activeTabFromPath || hasDetailRoute) {
      return;
    }

    navigate(OPERATIONS_DEFAULT_PATH, { replace: true });
  }, [activeTabFromPath, hasDetailRoute, navigate]);

  const handleLogout = useCallback((): void => {
    const redirectPath = `${location.pathname}${location.search}`;

    logoutUnified();
    logout();
    message.success("已退出登录。");
    navigate(getLoginPath(redirectPath), { replace: true });
  }, [location.pathname, location.search, logout, logoutUnified, navigate]);
  const handleOpenUserManual = useCallback((): void => {
    window.open(USER_MANUAL_ROUTE_PATH, "_blank", "noopener,noreferrer");
  }, []);

  const systemEntries = useMemo(() => {
    const operationsIdentity = findIdentityForPath(
      unifiedSession?.identities,
      OPERATIONS_DEFAULT_PATH,
      ["admin"],
    );

    return getSystemEntries(
      unifiedSession?.identities ?? [],
      operationsIdentity?.tenantId,
      operationsIdentity?.id,
    );
  }, [unifiedSession?.identities]);
  const handleOpenSystemEntry = useCallback(
    (entry: MockAuthSystemEntry): void => {
      if (entry.platform === "operationsAdmin" && entry.operationsAccountId) {
        const identityResult = activateIdentity(entry.identityId, entry.entryPath);

        if (!identityResult.success) {
          message.error(identityResult.message);
          return;
        }

        const result = loginByAccountId(entry.operationsAccountId, entry.entryPath);

        if (!result.success) {
          message.error(result.message);
          return;
        }

        navigate(result.redirectPath ?? entry.entryPath, { replace: true });
        return;
      }

      const result = activateIdentity(entry.identityId, entry.entryPath);

      if (!result.success) {
        message.error(result.message);
        return;
      }

      navigate(result.redirectPath ?? entry.entryPath, { replace: true });
    },
    [activateIdentity, loginByAccountId, navigate],
  );

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
        deploymentMode: tenant.deploymentMode,
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
      form: {
        ...emptyProductForm,
        supplyKind: "agent",
        deliveryKind: "softwareService",
        billingMode: "subscription",
        meteringUnit: "duration",
        billingSpec: "year",
        contactMode: "disabled",
        plazaCategory: OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
        plazaStatus: "offline",
        billingScopes: ["points"],
      },
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
          supplyKind: "agent",
          deliveryKind: "softwareService",
          saleType: "free",
          billingMode: "subscription",
          meteringUnit: "duration",
          billingSpec: "year",
          linkedAgentId: product.linkedAgentId,
          resourcePoolId: undefined,
          description: product.description,
          price: 0,
          subscriptionPlans:
            product.subscriptionPlans?.map(item => ({
              ...item,
            })) ?? emptyProductForm.subscriptionPlans,
          supportsTrial: product.supportsTrial,
          trialUnit: product.trialUnit ?? "day",
          trialValue: product.trialValue ?? 7,
          contactMode: "disabled",
          contactQrCodeValue: "",
          contactRemark: "",
          plazaCategory: product.plazaCategory ?? OPERATIONS_AGENT_PLAZA_DEFAULT_CATEGORY,
          plazaStatus: product.status === "active" ? "online" : (product.plazaStatus ?? "offline"),
          billingScopes: product.billingScopes?.length ? product.billingScopes : ["points"],
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

    if (!productEditor.form.linkedAgentId) {
      message.warning("请选择绑定 AI专家。");
      return;
    }

    if (!productEditor.form.billingScopes.length) {
      message.warning("请选择计费模型。");
      return;
    }

    if (productEditor.form.supportsTrial && productEditor.form.trialValue <= 0) {
      message.warning("请填写有效的试用规则。");
      return;
    }

    const normalizedForm: OperationsProductForm = {
      ...productEditor.form,
      supplyKind: "agent",
      deliveryKind: "softwareService",
      saleType: "free",
      billingMode: "subscription",
      meteringUnit: "duration",
      billingSpec: "year",
      resourcePoolId: undefined,
      price: 0,
      contactMode: "disabled",
      contactQrCodeValue: "",
      contactRemark: "",
    };

    if (productEditor.mode === "create") {
      createProduct(normalizedForm);
      message.success("商品已创建。");
    } else if (productEditor.productId) {
      updateProduct(productEditor.productId, normalizedForm);
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
      message.success("商品分类已创建。");
    } else if (agentPlazaCategoryEditor.categoryId) {
      updateAgentPlazaCategory(agentPlazaCategoryEditor.categoryId, {
        name: nextName,
        sortOrder: agentPlazaCategoryEditor.sortOrder,
      });
      message.success("商品分类已更新。");
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
      message.success("AI专家审核已通过，可在商品中心继续完善商品信息。");
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
    ...systemEntries.map(entry => ({
      key: `system-entry-${entry.identityId}`,
      icon: <AppstoreOutlined />,
      label: `进入${entry.label}`,
      onClick: () => handleOpenSystemEntry(entry),
    })),
    ...(systemEntries.length
      ? [
          {
            type: "divider" as const,
          },
        ]
      : []),
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
            pointsActorName="FrontisAI"
            statusLabels={tenantStatusLabels}
            onBack={handleBackToTenantList}
            onEdit={handleOpenEditTenant}
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

    if (activeTab === "organization") {
      return <OperationsOrganizationConsole />;
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

    if (activeTab === "products") {
      if (productId) {
        return (
          <ProductDetailConsole
            product={activeProduct}
            statusLabels={productStatusLabels}
            productTrialUnitLabels={productTrialUnitLabels}
            onBack={handleBackToProductList}
            onEdit={handleOpenEditProduct}
            onToggleStatus={handleToggleProductStatus}
          />
        );
      }

      return (
        <ProductConsole
          products={products}
          categories={agentPlazaCategories}
          statusLabels={productStatusLabels}
          productTrialUnitLabels={productTrialUnitLabels}
          onCreate={handleOpenCreateProduct}
          onViewDetail={handleOpenProductDetail}
          onCreateCategory={handleOpenCreateAgentPlazaCategory}
          onEditCategory={handleOpenEditAgentPlazaCategory}
          onToggleCategoryStatus={handleToggleAgentPlazaCategoryStatus}
        />
      );
    }

    if (activeTab === "resources") {
      return (
        <ResourcePoolConsole
          meteringProviders={meteringProviders}
          modelServices={modelServices}
          externalMeteredServices={externalMeteredServices}
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
    handleOpenAgentReview,
    handleOpenCreateAgentPlazaCategory,
    handleOpenCreateProduct,
    handleOpenCreateResourcePool,
    handleOpenCreateTenant,
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
    productDeliveryKindLabels,
    pointsOrders,
    pointsPackages,
    pointsUsageRecords,
    referralRecords,
    productStatusLabels,
    productTrialUnitLabels,
    productId,
    products,
    registrationStrategy,
    resourcePoolAllocationModeLabels,
    resourcePoolCapacityUnitLabels,
    resourcePoolTypeLabels,
    resourcePools,
    session?.name,
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
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.deploymentMode}>
              计费模式
            </label>
            <Select<OperationsTenantDeploymentMode>
              id={TENANT_FIELD_IDS.deploymentMode}
              value={tenantEditor.form.deploymentMode}
              options={OPERATIONS_TENANT_DEPLOYMENT_MODE_OPTIONS}
              onChange={nextValue =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    deploymentMode: nextValue,
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
        open={productEditor.open}
        title={productEditor.mode === "create" ? "创建AI专家商品" : "编辑AI专家商品"}
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

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.acquisitionMode}>
              获取方式
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.acquisitionMode}
              value={getProductAcquisitionMode(productEditor.form)}
              options={PRODUCT_ACQUISITION_MODE_OPTIONS}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: applyProductAcquisitionMode(currentState.form, nextValue),
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.category}>
              商品分类
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.category}
              value={productEditor.form.plazaCategory}
              options={agentPlazaCategoryOptions}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    plazaCategory: nextValue,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.billingScopes}>
              计费模型
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.billingScopes}
              mode="multiple"
              value={productEditor.form.billingScopes}
              options={OPERATIONS_PRODUCT_BILLING_SCOPE_OPTIONS}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    billingScopes: nextValue,
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={PRODUCT_FIELD_IDS.status}>
              上架状态
            </label>
            <Select
              id={PRODUCT_FIELD_IDS.status}
              value={productEditor.form.plazaStatus}
              options={[
                { value: "offline", label: "下架" },
                { value: "online", label: "上架" },
              ]}
              onChange={nextValue =>
                setProductEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    plazaStatus: nextValue,
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
        title={agentPlazaCategoryEditor.mode === "create" ? "新建商品分类" : "编辑商品分类"}
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
                    审核通过
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
