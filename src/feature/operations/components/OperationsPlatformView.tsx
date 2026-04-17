import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
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
  message,
} from "antd";
import classNames from "classnames";
import { useNavigate, useParams } from "react-router-dom";

import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import { useOperationsPlatform } from "@/feature/operations/hooks/useOperationsPlatform";
import {
  OPERATIONS_DEFAULT_PATH,
  OPERATIONS_TAB_OPTIONS,
  OPERATIONS_TENANT_MODULE_OPTIONS,
} from "@/feature/operations/mockData";
import type {
  OperationsAgentSubmission,
  OperationsFulfillment,
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

import styles from "./OperationsPlatformView.module.less";

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
type TenantDetailTabKey = "base" | "members";

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

interface ProductConsoleProps {
  products: OperationsProduct[];
  statusLabels: Record<OperationsProduct["status"], string>;
  productDeliveryKindLabels: Record<OperationsProduct["deliveryKind"], string>;
  productBillingSpecLabels: Record<OperationsProduct["billingSpec"], string>;
  onCreate: () => void;
  onViewDetail: (productId: string) => void;
}

interface ProductDetailConsoleProps {
  product: OperationsProduct | null;
  statusLabels: Record<OperationsProduct["status"], string>;
  productDeliveryKindLabels: Record<OperationsProduct["deliveryKind"], string>;
  productBillingModeLabels: Record<OperationsProduct["billingMode"], string>;
  productMeteringUnitLabels: Record<OperationsProduct["meteringUnit"], string>;
  productBillingSpecLabels: Record<OperationsProduct["billingSpec"], string>;
  onBack: () => void;
  onEdit: (product: OperationsProduct) => void;
  onToggleStatus: (product: OperationsProduct) => void;
}

interface FulfillmentConsoleProps {
  fulfillments: OperationsFulfillment[];
  fulfillmentStatusLabels: Record<OperationsFulfillment["status"], string>;
  productDeliveryKindLabels: Record<OperationsProduct["deliveryKind"], string>;
}

interface ResourcePoolConsoleProps {
  resourcePools: OperationsResourcePool[];
  resourcePoolTypeLabels: Record<OperationsResourcePool["resourceType"], string>;
  resourcePoolAllocationModeLabels: Record<
    OperationsResourcePool["allocationMode"],
    string
  >;
  resourcePoolCapacityUnitLabels: Record<OperationsResourcePool["capacityUnit"], string>;
  onCreate: () => void;
  onEdit: (resourcePool: OperationsResourcePool) => void;
}

const OPERATIONS_TAB_ICON_MAP: Record<OperationsPlatformTabKey, JSX.Element> = {
  tenants: <ApartmentOutlined />,
  agents: <RobotOutlined />,
  products: <ShopOutlined />,
  fulfillment: <DeploymentUnitOutlined />,
  resources: <DatabaseOutlined />,
};

const TENANT_FIELD_IDS = {
  name: "operations-tenant-name",
  code: "operations-tenant-code",
  industry: "operations-tenant-industry",
  adminName: "operations-tenant-admin-name",
  adminPhone: "operations-tenant-admin-phone",
  seatCount: "operations-tenant-seat-count",
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
  billingMode: "operations-product-billing-mode",
  meteringUnit: "operations-product-metering-unit",
  billingSpec: "operations-product-billing-spec",
  linkedAgentId: "operations-product-linked-agent",
  resourcePoolId: "operations-product-resource-pool",
  price: "operations-product-price",
  description: "operations-product-description",
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
    tabPath === "agents" ||
    tabPath === "products" ||
    tabPath === "fulfillment" ||
    tabPath === "resources"
  ) {
    return tabPath;
  }

  return null;
};

const buildTenantDetailPath = (tenantId: string): string =>
  `${OPERATIONS_TENANT_LIST_PATH}/${tenantId}`;

const buildProductDetailPath = (productId: string): string =>
  `${OPERATIONS_PRODUCT_LIST_PATH}/${productId}`;

const formatCurrency = (value: number): string => `¥${value.toLocaleString("zh-CN")}`;

const buildStatusClassName = (
  tone?: "primary" | "success" | "warning" | "danger",
): string =>
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

const getAgentStatusClassName = (
  status: OperationsAgentSubmission["status"],
): string => {
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

  if (status === "draft") {
    return buildStatusClassName("warning");
  }

  return buildStatusClassName();
};

const getFulfillmentStatusClassName = (
  status: OperationsFulfillment["status"],
): string => {
  if (status === "active" || status === "completed") {
    return buildStatusClassName("success");
  }

  if (status === "pending" || status === "delivering") {
    return buildStatusClassName("warning");
  }

  return buildStatusClassName("primary");
};

const getTenantMemberInitial = (name: string): string => Array.from(name.trim())[0] ?? "员";

const getProductBillingSpecLabel = (
  productBillingSpecLabels: Record<OperationsProduct["billingSpec"], string>,
  billingSpec: OperationsProduct["billingSpec"],
): string => productBillingSpecLabels[billingSpec];

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
    billingSpecOptions
      .filter(item => item.modes.includes(billingMode))
      .flatMap(item => item.units),
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
    .filter(
      item =>
        item.modes.includes(billingMode) && item.units.includes(meteringUnit),
    )
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
        const searchSource = [
          item.name,
          item.adminName,
          item.adminPhone,
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
                    <td className={styles.tenantModulesCell}>
                      {tenant.moduleLabels.join("、")}
                    </td>
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
      [member.name, member.phone, member.roleLabel]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
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
                <h3 className={classNames(adminStyles.detailBlockTitle, styles.detailBlockTitleReset)}>
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
                <h3 className={classNames(adminStyles.detailBlockTitle, styles.detailBlockTitleReset)}>
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
          <h1 className={adminStyles.consoleTitle}>Agent 审核</h1>
        </div>

        <div className={adminStyles.consoleHeaderSide}>
          <Input
            className={adminStyles.consoleInlineSearch}
            value={keyword}
            placeholder="搜索 Agent 名称、版本、提审人"
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
            <h2 className={adminStyles.consoleSectionTitle}>提审列表</h2>
          </div>
        </div>

        {filteredSubmissions.length ? (
          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>Agent</th>
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
                      <Button
                        size="small"
                        type="link"
                        onClick={() => onOpenReview(submission.id)}
                      >
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
  statusLabels,
  productDeliveryKindLabels,
  productBillingSpecLabels,
  onCreate,
  onViewDetail,
}: ProductConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");

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

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>商品管理</h1>
        </div>

        <div className={adminStyles.consoleHeaderSide}>
          <Input
            className={adminStyles.consoleInlineSearch}
            value={keyword}
            placeholder="搜索商品名称、关联供给"
            onChange={event => setKeyword(event.target.value)}
          />
          <Button type="primary" onClick={onCreate}>
            创建商品
          </Button>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>商品列表</h2>
          </div>
        </div>

        {filteredProducts.length ? (
          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>商品</th>
                  <th>交付类型</th>
                  <th>关联供给</th>
                  <th>售价</th>
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
                    <td>{productDeliveryKindLabels[product.deliveryKind]}</td>
                    <td>
                      {product.supplyKind === "agent"
                        ? product.linkedAgentName ?? "未绑定 Agent"
                        : product.resourcePoolName ?? "无需资源池"}
                    </td>
                    <td>
                      {formatCurrency(product.price)} / {" "}
                      {getProductBillingSpecLabel(
                        productBillingSpecLabels,
                        product.billingSpec,
                      )}
                    </td>
                    <td>
                      <span className={getProductStatusClassName(product.status)}>
                        {statusLabels[product.status]}
                      </span>
                    </td>
                    <td>{product.updatedAt}</td>
                    <td>
                      <Button
                        size="small"
                        type="link"
                        onClick={() => onViewDetail(product.id)}
                      >
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
            <Empty description="当前筛选下暂无商品。" />
          </div>
        )}
      </section>
    </div>
  );
};

const ProductDetailConsole = ({
  product,
  statusLabels,
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
                    ? (product.linkedAgentName ?? "未绑定 Agent")
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
            <Button onClick={() => onEdit(product)}>编辑商品</Button>
            <Button onClick={() => onToggleStatus(product)}>
              {product.status === "active" ? "下架商品" : "上架商品"}
            </Button>
          </div>
        ) : null}
      </header>

      {product ? (
        <section className={adminStyles.consoleSection}>
          <div className={styles.detailGrid}>
            <section className={adminStyles.detailBlock}>
              <h3 className={adminStyles.detailBlockTitle}>售卖信息</h3>
              <div className={adminStyles.consoleRows}>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>售价</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {formatCurrency(product.price)} / {" "}
                    {getProductBillingSpecLabel(
                      productBillingSpecLabels,
                      product.billingSpec,
                    )}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>计费模式</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {productBillingModeLabels[product.billingMode]}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>交付类型</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {productDeliveryKindLabels[product.deliveryKind]}
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
                    {getProductBillingSpecLabel(
                      productBillingSpecLabels,
                      product.billingSpec,
                    )}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>更新时间</span>
                  <span className={adminStyles.consoleInfoValue}>{product.updatedAt}</span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>关联供给</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {product.supplyKind === "agent"
                      ? product.linkedAgentName ?? "未绑定 Agent"
                      : product.resourcePoolName ?? "无需资源池"}
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
  fulfillmentStatusLabels,
  productDeliveryKindLabels,
}: FulfillmentConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");

  const filteredFulfillments = useMemo<OperationsFulfillment[]>(
    () =>
      fulfillments.filter(item => {
        const searchSource = [
          item.orderNo,
          item.tenantName,
          item.productName,
          item.resourcePoolName ?? "",
          item.allocationTarget,
        ]
          .join(" ")
          .toLowerCase();

        return searchSource.includes(keyword.trim().toLowerCase());
      }),
    [fulfillments, keyword],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>交付管理</h1>
        </div>

        <div className={adminStyles.consoleHeaderSide}>
          <Input
            className={adminStyles.consoleInlineSearch}
            value={keyword}
            placeholder="搜索订单号、租户、商品、资源池"
            onChange={event => setKeyword(event.target.value)}
          />
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>交付实例列表</h2>
          </div>
        </div>

        {filteredFulfillments.length ? (
          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>租户</th>
                  <th>商品</th>
                  <th>交付类型</th>
                  <th>分配结果</th>
                  <th>状态</th>
                  <th>到期时间</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredFulfillments.map(fulfillment => (
                  <tr key={fulfillment.id}>
                    <td>{fulfillment.orderNo}</td>
                    <td>{fulfillment.tenantName}</td>
                    <td>{fulfillment.productName}</td>
                    <td>{productDeliveryKindLabels[fulfillment.deliveryKind]}</td>
                    <td>{fulfillment.allocationTarget}</td>
                    <td>
                      <span className={getFulfillmentStatusClassName(fulfillment.status)}>
                        {fulfillmentStatusLabels[fulfillment.status]}
                      </span>
                    </td>
                    <td>{fulfillment.expiresAt ?? "长期有效"}</td>
                    <td>{fulfillment.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyWrap}>
            <Empty description="当前筛选下暂无交付记录。" />
          </div>
        )}
      </section>
    </div>
  );
};

const ResourcePoolConsole = ({
  resourcePools,
  resourcePoolTypeLabels,
  resourcePoolAllocationModeLabels,
  resourcePoolCapacityUnitLabels,
  onCreate,
  onEdit,
}: ResourcePoolConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");

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
        </div>

        <div className={adminStyles.consoleHeaderSide}>
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
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>资源池列表</h2>
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
                    <td>
                      {
                        resourcePoolAllocationModeLabels[
                          resourcePool.allocationMode
                        ]
                      }
                    </td>
                    <td>
                      {getResourcePoolCapacityLabel(
                        resourcePool,
                        resourcePoolCapacityUnitLabels,
                      )}
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
    agentStatusLabels,
    agentSubmissions,
    approveAgent,
    approvedAgents,
    createResourcePool,
    createProduct,
    createTenant,
    emptyResourcePoolForm,
    emptyProductForm,
    emptyTenantForm,
    emptyTenantMemberForm,
    fulfillmentStatusLabels,
    fulfillments,
    productBillingModeLabels,
    productDeliveryKindLabels,
    productDeliveryKindOptions,
    productBillingModeOptions,
    productBillingSpecLabels,
    productBillingSpecOptions,
    productMeteringUnitLabels,
    productMeteringUnitOptions,
    productStatusLabels,
    productSupplyKindLabels,
    products,
    resourcePoolAllocationModeLabels,
    resourcePoolAllocationModeOptions,
    resourcePoolCapacityUnitLabels,
    resourcePoolCapacityUnitOptions,
    resourcePoolTypeLabels,
    resourcePoolTypeOptions,
    resourcePools,
    rejectAgent,
    tenantStatusLabels,
    tenants,
    updateResourcePool,
    updateProduct,
    updateProductStatus,
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
    [
      productBillingSpecOptions,
      productEditor.form.billingMode,
      productEditor.form.meteringUnit,
    ],
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

  const activeTabFromPath = useMemo<OperationsPlatformTabKey | null>(
    () => getTabKeyFromPath(tabPath),
    [tabPath],
  );
  const hasDetailRoute = Boolean(tenantId || productId);
  const activeTab = useMemo<OperationsPlatformTabKey>(
    () =>
      activeTabFromPath ??
      (tenantId ? "tenants" : productId ? "products" : "tenants"),
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

  const handleOpenAgentReview = useCallback(
    (nextSubmissionId: string): void => {
      setAgentReview({
        open: true,
        submissionId: nextSubmissionId,
      });
    },
    [],
  );

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
        seatCount: tenant.seatCount,
        expiresAt: tenant.expiresAt,
        moduleLabels: tenant.moduleLabels,
      },
    });
  }, []);

  const handleSubmitTenant = useCallback((): void => {
    const editingTenant = tenantEditor.tenantId
      ? tenants.find(item => item.id === tenantEditor.tenantId) ?? null
      : null;

    if (
      !tenantEditor.form.name.trim() ||
      !tenantEditor.form.adminName.trim() ||
      tenantEditor.form.adminPhone.trim().length !== 11 ||
      tenantEditor.form.seatCount < 1 ||
      !tenantEditor.form.expiresAt.trim() ||
      !tenantEditor.form.moduleLabels.length
    ) {
      message.warning("请先补齐租户名称、管理员信息、席位数量、到期时间和系统模块权限。");
      return;
    }

    if (
      editingTenant &&
      tenantEditor.form.seatCount < editingTenant.members.length
    ) {
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

  const handleOpenAddTenantMember = useCallback((tenant: OperationsTenant): void => {
    if (tenant.members.length >= tenant.seatCount) {
      message.warning("当前租户席位已满，无法继续添加成员。");
      return;
    }

    setTenantMemberEditor({
      open: true,
      tenantId: tenant.id,
      form: emptyTenantMemberForm,
    });
  }, [emptyTenantMemberForm]);

  const handleSubmitTenantMember = useCallback((): void => {
    if (
      !tenantMemberEditor.tenantId ||
      !tenantMemberEditor.form.name.trim() ||
      tenantMemberEditor.form.phone.trim().length !== 11
    ) {
      message.warning("请先补齐成员姓名和手机号。");
      return;
    }

    const targetTenant =
      tenants.find(item => item.id === tenantMemberEditor.tenantId) ?? null;

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

  const handleOpenEditProduct = useCallback((product: OperationsProduct): void => {
    setProductEditor({
      open: true,
      mode: "edit",
      productId: product.id,
      form: {
        name: product.name,
        supplyKind: product.supplyKind,
        deliveryKind: product.deliveryKind,
        billingMode: product.billingMode,
        meteringUnit: product.meteringUnit,
        billingSpec: product.billingSpec,
        linkedAgentId: product.linkedAgentId,
        resourcePoolId: product.resourcePoolId,
        description: product.description,
        price: product.price,
      },
    });
  }, []);

  const handleSubmitProduct = useCallback((): void => {
    if (
      !productEditor.form.name.trim() ||
      !productEditor.form.billingMode ||
      !productEditor.form.meteringUnit ||
      !productEditor.form.billingSpec
    ) {
      message.warning("请先补齐商品名称和计费信息。");
      return;
    }

    if (
      productEditor.form.supplyKind === "agent" &&
      !productEditor.form.linkedAgentId
    ) {
      message.warning("Agent 商品必须从 Agent Store 选择一个 Agent 绑定。");
      return;
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

  const handleToggleProductStatus = useCallback(
    (product: OperationsProduct): void => {
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
      message.success("Agent 审核已通过，已进入平台供给池。");
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
    message.success("已驳回当前 Agent 提审。");
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

    if (activeTab === "products") {
      if (productId) {
        return (
          <ProductDetailConsole
            product={activeProduct}
            statusLabels={productStatusLabels}
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
          statusLabels={productStatusLabels}
          productDeliveryKindLabels={productDeliveryKindLabels}
          productBillingSpecLabels={productBillingSpecLabels}
          onCreate={handleOpenCreateProduct}
          onViewDetail={handleOpenProductDetail}
        />
      );
    }

    if (activeTab === "fulfillment") {
      return (
        <FulfillmentConsole
          fulfillments={fulfillments}
          fulfillmentStatusLabels={fulfillmentStatusLabels}
          productDeliveryKindLabels={productDeliveryKindLabels}
        />
      );
    }

    if (activeTab === "resources") {
      return (
        <ResourcePoolConsole
          resourcePools={resourcePools}
          resourcePoolTypeLabels={resourcePoolTypeLabels}
          resourcePoolAllocationModeLabels={resourcePoolAllocationModeLabels}
          resourcePoolCapacityUnitLabels={resourcePoolCapacityUnitLabels}
          onCreate={handleOpenCreateResourcePool}
          onEdit={handleOpenEditResourcePool}
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
    agentStatusLabels,
    agentSubmissions,
    fulfillments,
    fulfillmentStatusLabels,
    handleBackToProductList,
    handleBackToTenantList,
    handleOpenAddTenantMember,
    handleOpenAgentReview,
    handleOpenCreateProduct,
    handleOpenCreateResourcePool,
    handleOpenCreateTenant,
    handleOpenEditResourcePool,
    handleOpenEditProduct,
    handleOpenEditTenant,
    handleOpenTenantDetail,
    handleOpenProductDetail,
    handleToggleProductStatus,
    handleToggleTenantStatus,
    productBillingModeLabels,
    productBillingSpecLabels,
    productDeliveryKindLabels,
    productMeteringUnitLabels,
    productStatusLabels,
    productId,
    products,
    resourcePoolAllocationModeLabels,
    resourcePoolCapacityUnitLabels,
    resourcePoolTypeLabels,
    resourcePools,
    tenantId,
    tenantStatusLabels,
    tenants,
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
                <span className={shellStyles.tabIcon}>
                  {OPERATIONS_TAB_ICON_MAP[item.key]}
                </span>
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
                    <span className={shellStyles.accountName}>
                      {session?.name ?? "未登录"}
                    </span>
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
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.expiresAt}>
              到期时间
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

          <div className={styles.modalField}>
            <label
              className={styles.modalLabel}
              htmlFor={TENANT_FIELD_IDS.adminPhone}
            >
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

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label
              className={styles.modalLabel}
              htmlFor={TENANT_FIELD_IDS.moduleLabels}
            >
              系统模块权限
            </label>
            <Select
              id={TENANT_FIELD_IDS.moduleLabels}
              mode="multiple"
              placeholder="请选择系统模块权限"
              value={tenantEditor.form.moduleLabels}
              options={OPERATIONS_TENANT_MODULE_OPTIONS.map(item => ({
                value: item,
                label: item,
              }))}
              onChange={nextValue =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    moduleLabels: nextValue,
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

          {productEditor.form.supplyKind === "agent" ? (
            <div className={styles.modalField}>
              <label
                className={styles.modalLabel}
                htmlFor={PRODUCT_FIELD_IDS.linkedAgentId}
              >
                绑定 Agent
              </label>
              <Select
                id={PRODUCT_FIELD_IDS.linkedAgentId}
                value={productEditor.form.linkedAgentId}
                placeholder="请选择 Agent Store 中的 Agent"
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
              <label
                className={styles.modalLabel}
                htmlFor={PRODUCT_FIELD_IDS.resourcePoolId}
              >
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

          <div className={`${styles.modalField} ${styles.modalFieldWide}`}>
            <label
              className={styles.modalLabel}
              htmlFor={PRODUCT_FIELD_IDS.description}
            >
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
        open={resourcePoolEditor.open}
        title={resourcePoolEditor.mode === "create" ? "创建资源池" : "编辑资源池"}
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
            <label
              className={styles.modalLabel}
              htmlFor={RESOURCE_POOL_FIELD_IDS.allocationMode}
            >
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
            <label
              className={styles.modalLabel}
              htmlFor={RESOURCE_POOL_FIELD_IDS.totalCapacity}
            >
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
            <label
              className={styles.modalLabel}
              htmlFor={RESOURCE_POOL_FIELD_IDS.capacityUnit}
            >
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
        title={activeReviewSubmission?.name ?? "Agent 审批"}
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
        width={760}
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
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>最近处理</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {activeReviewSubmission.lastReviewedAt ?? "待处理"}
                  </span>
                </div>
              </div>
            </section>

            <section className={adminStyles.detailBlock}>
              <h3 className={adminStyles.detailBlockTitle}>内容说明</h3>
              <p className={styles.detailParagraph}>{activeReviewSubmission.description}</p>
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
