import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AppstoreOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
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
  getSystemEntryMenuLabel,
} from "@/feature/auth/mockAccounts";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import { useOperationsPlatform } from "@/feature/operations/hooks/useOperationsPlatform";
import type { MockAuthSystemEntry, MockTenantManagementSnapshot } from "@/feature/auth/types";
import {
  OPERATIONS_DEFAULT_PATH,
  OPERATIONS_TAB_OPTIONS,
  OPERATIONS_TENANT_BILLING_MODE_LABELS,
  OPERATIONS_TENANT_BILLING_MODE_OPTIONS,
} from "@/feature/operations/mockData";
import { hasAnyPermission, hasPermission } from "@/utils/tenantRoleAccess";
import {
  OPERATIONS_PERMISSION_IDS,
  TENANT_ROLE_PERMISSION_GROUPS,
  normalizeTenantRolePermissionIds,
} from "@/constants/tenantRolePermissions";
import { PRODUCT_LOGO_URL, PRODUCT_NAME, PRODUCT_SLOGAN } from "@/constants/brand";
import type {
  OperationsAgentSubmission,
  OperationsPlatformTabKey,
  OperationsTenant,
  OperationsTenantEdition,
  OperationsTenantForm,
} from "@/feature/operations/types";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";
import shellStyles from "@/pages/FrontisPage.module.less";

import styles from "./OperationsPlatformView.module.less";
import { OperationsOrganizationConsole } from "./OperationsOrganizationConsole";
import { OperationsOrderCenterConsole } from "./OperationsOrderCenterConsole";
import { OperationsPlatformConfigConsole } from "./OperationsPlatformConfigConsole";
import { OperationsPointsSubscriptionConsole } from "./OperationsPointsSubscriptionConsole";
import { OperationsProductConsole } from "./OperationsProductConsole";
import { OperationsResourceMeteringConsole } from "./OperationsResourceMeteringConsole";

interface TenantEditorState {
  open: boolean;
  mode: "create" | "edit";
  tenantId?: string;
  form: OperationsTenantForm;
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

interface TenantConsoleProps {
  canCreate: boolean;
  tenants: OperationsTenant[];
  statusLabels: Record<OperationsTenant["status"], string>;
  onCreate: () => void;
  onViewDetail: (tenantId: string) => void;
}

interface TenantDetailConsoleProps {
  canEdit: boolean;
  canToggleStatus: boolean;
  tenant: OperationsTenant | null;
  tenantSnapshot: MockTenantManagementSnapshot | null;
  statusLabels: Record<OperationsTenant["status"], string>;
  onBack: () => void;
  onEdit: (tenant: OperationsTenant) => void;
  onToggleStatus: (tenant: OperationsTenant) => void;
}

interface AgentConsoleProps {
  canReview: boolean;
  submissions: OperationsAgentSubmission[];
  statusLabels: Record<OperationsAgentSubmission["status"], string>;
  onOpenReview: (submissionId: string) => void;
}

const OPERATIONS_TAB_ICON_MAP: Record<OperationsPlatformTabKey, JSX.Element> = {
  tenants: <ApartmentOutlined />,
  organization: <TeamOutlined />,
  roleManagement: <SafetyCertificateOutlined />,
  products: <ShopOutlined />,
  resources: <DatabaseOutlined />,
  points: <CreditCardOutlined />,
  orders: <FileTextOutlined />,
  agents: <RobotOutlined />,
  platformConfig: <SettingOutlined />,
};

const TENANT_FIELD_IDS = {
  name: "operations-tenant-name",
  code: "operations-tenant-code",
  industry: "operations-tenant-industry",
  adminName: "operations-tenant-admin-name",
  adminPhone: "operations-tenant-admin-phone",
  billingMode: "operations-tenant-billing-mode",
  seatCount: "operations-tenant-seat-count",
  effectiveAt: "operations-tenant-effective-at",
  expiresAt: "operations-tenant-expires-at",
  moduleLabels: "operations-tenant-module-labels",
} as const;

const OPERATIONS_TENANT_EDITION_LABELS: Record<OperationsTenantEdition, string> = {
  personal: "个人版",
  team: "团队版",
};

const REJECT_FIELD_ID = "operations-agent-reject-reason";
const OPERATIONS_TENANT_LIST_PATH = "/ops/tenants";
const OPERATIONS_PRODUCT_LIST_PATH = "/ops/products";

const getTabKeyFromPath = (tabPath?: string): OperationsPlatformTabKey | null => {
  if (
    tabPath === "tenants" ||
    tabPath === "organization" ||
    tabPath === "roleManagement" ||
    tabPath === "products" ||
    tabPath === "resources" ||
    tabPath === "points" ||
    tabPath === "orders" ||
    tabPath === "agents" ||
    tabPath === "platformConfig"
  ) {
    return tabPath;
  }

  return null;
};

const OPERATIONS_MODAL_WIDTHS = {
  compact: 560,
  standard: 720,
  large: 880,
  review: 760,
} as const;

const PERMISSION_LABEL_MAP = new Map<string, string>(
  TENANT_ROLE_PERMISSION_GROUPS.flatMap(group =>
    group.menus.flatMap(menu => menu.items.map(item => [item.id, item.label] as const)),
  ),
);

const TENANT_PERMISSION_SELECT_OPTIONS = TENANT_ROLE_PERMISSION_GROUPS.map(group => ({
  label: group.title,
  options: group.menus.flatMap(menu =>
    menu.items.map(permission => ({
      value: permission.id,
      label: menu.displayMode === "leaf" ? permission.label : `${menu.title} / ${permission.label}`,
    })),
  ),
}));

const getPermissionLabel = (permissionId: string): string =>
  PERMISSION_LABEL_MAP.get(permissionId) ?? permissionId;

const buildTenantDetailPath = (tenantId: string): string =>
  `${OPERATIONS_TENANT_LIST_PATH}/${tenantId}`;

const buildProductDetailPath = (productId: string): string =>
  `${OPERATIONS_PRODUCT_LIST_PATH}/${productId}`;

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

const TenantConsole = ({
  canCreate,
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
          OPERATIONS_TENANT_EDITION_LABELS[item.edition],
          OPERATIONS_TENANT_BILLING_MODE_LABELS[item.billingMode],
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
            placeholder="搜索租户名称、初始管理员"
            onChange={event => setKeyword(event.target.value)}
          />
          {canCreate ? (
            <Button type="primary" onClick={onCreate}>
              创建租户
            </Button>
          ) : null}
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
                  <th>初始管理员</th>
                  <th>管理员权限</th>
                  <th>版本</th>
                  <th>计费方式</th>
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
                    <td>{tenant.adminName}</td>
                    <td>{tenant.adminPermissionIds.length} 项</td>
                    <td>{OPERATIONS_TENANT_EDITION_LABELS[tenant.edition]}</td>
                    <td>{OPERATIONS_TENANT_BILLING_MODE_LABELS[tenant.billingMode]}</td>
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
  canEdit,
  canToggleStatus,
  tenant,
  tenantSnapshot,
  statusLabels,
  onBack,
  onEdit,
  onToggleStatus,
}: TenantDetailConsoleProps): JSX.Element => {
  const latestPointsLedger = tenantSnapshot?.pointsLedger[0] ?? null;
  const isPointsBillingTenant =
    tenant?.billingMode === "points" && tenantSnapshot?.billingMode === "points";

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
            {canEdit ? <Button onClick={() => onEdit(tenant)}>编辑资料</Button> : null}
            {canToggleStatus ? (
              <Button onClick={() => onToggleStatus(tenant)}>
                {tenant.status === "suspended" ? "启用租户" : "停用租户"}
              </Button>
            ) : null}
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
                  <span className={adminStyles.consoleInfoLabel}>版本</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {OPERATIONS_TENANT_EDITION_LABELS[tenant.edition]}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>计费方式</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {OPERATIONS_TENANT_BILLING_MODE_LABELS[tenant.billingMode]}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>初始管理员</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {tenant.adminName || "待录入"} · {tenant.adminPhone || "待补充"}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>管理员权限</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {tenant.adminPermissionIds.length} 项
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

            <section className={adminStyles.detailBlock}>
              <h3
                className={classNames(adminStyles.detailBlockTitle, styles.detailBlockTitleReset)}
              >
                计费与积分
              </h3>
              <div className={adminStyles.consoleRows}>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>计费方式</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {OPERATIONS_TENANT_BILLING_MODE_LABELS[tenant.billingMode]}
                  </span>
                </div>
                <div className={adminStyles.consoleInfoRow}>
                  <span className={adminStyles.consoleInfoLabel}>当前计划</span>
                  <span className={adminStyles.consoleInfoValue}>
                    {tenantSnapshot?.planLabel ?? "-"}
                  </span>
                </div>
                {isPointsBillingTenant ? (
                  <>
                    <div className={adminStyles.consoleInfoRow}>
                      <span className={adminStyles.consoleInfoLabel}>积分余额</span>
                      <span className={adminStyles.consoleInfoValue}>
                        {tenantSnapshot.pointsBalance.toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <div className={adminStyles.consoleInfoRow}>
                      <span className={adminStyles.consoleInfoLabel}>低余额阈值</span>
                      <span className={adminStyles.consoleInfoValue}>
                        {tenantSnapshot.lowBalanceThreshold.toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <div className={adminStyles.consoleInfoRow}>
                      <span className={adminStyles.consoleInfoLabel}>本月消耗</span>
                      <span className={adminStyles.consoleInfoValue}>
                        {tenantSnapshot.monthlyUsedPoints.toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <div className={adminStyles.consoleInfoRow}>
                      <span className={adminStyles.consoleInfoLabel}>最近流水</span>
                      <span className={adminStyles.consoleInfoValue}>
                        {latestPointsLedger
                          ? `${latestPointsLedger.title} · ${latestPointsLedger.points > 0 ? "+" : ""}${latestPointsLedger.points.toLocaleString("zh-CN")}`
                          : "-"}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            </section>

            <section className={adminStyles.detailBlock}>
              <h3
                className={classNames(adminStyles.detailBlockTitle, styles.detailBlockTitleReset)}
              >
                初始管理员权限
              </h3>
              <div className={styles.permissionTagList}>
                {tenant.adminPermissionIds.map(permissionId => (
                  <span key={permissionId} className={adminStyles.consolePill}>
                    {getPermissionLabel(permissionId)}
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
    </div>
  );
};

const AgentConsole = ({
  canReview,
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
            <h2 className={adminStyles.consoleSectionTitle}>上架申请列表</h2>
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
                        ? "AI专家上架"
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
                      {canReview ? (
                        <Button
                          size="small"
                          type="link"
                          onClick={() => onOpenReview(submission.id)}
                        >
                          审批
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          type="link"
                          onClick={() => onOpenReview(submission.id)}
                        >
                          查看
                        </Button>
                      )}
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
    agentStatusLabels,
    agentPlazaCategories,
    agentSubmissions,
    approveAgent,
    approvedAgents,
    applyTenantSubscriptionPlan,
    communityGroupConfig,
    createAgentPlazaCategory,
    createExternalMeteredService,
    createMeteringProvider,
    createModelService,
    createPointsPackage,
    createProduct,
    createSalesChannelContractCode,
    createSkillCenterCategory,
    createSubscriptionPlan,
    createTenant,
    emptyTenantForm,
    emptyProductForm,
    externalMeteredServices,
    meteringProviders,
    modelServices,
    productStatusLabels,
    productTrialUnitLabels,
    productTrialUnitOptions,
    pointsPackages,
    pointsUsageRecords,
    products,
    registrationStrategy,
    referralRecords,
    rejectAgent,
    salesChannelContractCodes,
    serviceContactConfig,
    skillCenterCategories,
    subscriptionPlans,
    tenantStatusLabels,
    tenants,
    updateAgentPlazaCategory,
    updateExternalMeteredService,
    updateMeteringProvider,
    updateModelService,
    updateProduct,
    updateProductStatus,
    updateSalesChannelContractCode,
    updateCommunityGroupConfig,
    updatePointsPackage,
    updateRegistrationStrategy,
    updateServiceContactConfig,
    updateSkillCenterCategory,
    updateSubscriptionPlan,
    updateTenant,
    updateTenantStatus,
  } = useOperationsPlatform();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [tenantEditor, setTenantEditor] = useState<TenantEditorState>({
    open: false,
    mode: "create",
    form: emptyTenantForm,
  });
  const [agentReview, setAgentReview] = useState<AgentReviewState>({
    open: false,
  });
  const [rejectEditor, setRejectEditor] = useState<RejectEditorState>({
    open: false,
    reason: "",
  });

  const activeTabFromPath = useMemo<OperationsPlatformTabKey | null>(
    () => getTabKeyFromPath(tabPath),
    [tabPath],
  );
  const activeTabFromRoute = useMemo<OperationsPlatformTabKey | null>(
    () => activeTabFromPath ?? (tenantId ? "tenants" : productId ? "products" : null),
    [activeTabFromPath, productId, tenantId],
  );
  const operationsIdentity = useMemo(
    () => findIdentityForPath(unifiedSession?.identities, OPERATIONS_DEFAULT_PATH, ["admin"]),
    [unifiedSession?.identities],
  );
  const visibleOperationsTabs = useMemo(
    () =>
      operationsIdentity?.permissionIds
        ? OPERATIONS_TAB_OPTIONS.filter(item =>
            hasAnyPermission(operationsIdentity.permissionIds ?? [], item.permissionIds),
          )
        : OPERATIONS_TAB_OPTIONS,
    [operationsIdentity?.permissionIds],
  );
  const hasOperationsPermission = useCallback(
    (permissionId: string): boolean =>
      operationsIdentity?.permissionIds
        ? hasPermission(operationsIdentity.permissionIds, permissionId)
        : true,
    [operationsIdentity?.permissionIds],
  );
  const canManageTenants = hasOperationsPermission(OPERATIONS_PERMISSION_IDS.tenantManage);
  const canReviewAgent = hasOperationsPermission(OPERATIONS_PERMISSION_IDS.agentReview);
  const canManageOrganization = hasOperationsPermission(
    OPERATIONS_PERMISSION_IDS.organizationManage,
  );
  const canManageRoles = hasOperationsPermission(OPERATIONS_PERMISSION_IDS.roleManage);
  const canManageBilling = hasOperationsPermission(OPERATIONS_PERMISSION_IDS.billingManage);
  const canManageOrders = hasOperationsPermission(OPERATIONS_PERMISSION_IDS.orderManage);
  const canManagePoints = hasOperationsPermission(OPERATIONS_PERMISSION_IDS.pointsManage);
  const canManageResources = hasOperationsPermission(OPERATIONS_PERMISSION_IDS.resourceManage);
  const activeTab = useMemo<OperationsPlatformTabKey>(
    () => activeTabFromRoute ?? visibleOperationsTabs[0]?.key ?? "tenants",
    [activeTabFromRoute, visibleOperationsTabs],
  );

  useEffect(() => {
    if (!visibleOperationsTabs.length) {
      return;
    }

    const isAllowedTab = visibleOperationsTabs.some(item => item.key === activeTabFromRoute);

    if (activeTabFromRoute && isAllowedTab) {
      return;
    }

    navigate(`/ops/${visibleOperationsTabs[0]?.key ?? "tenants"}`, { replace: true });
  }, [activeTabFromRoute, navigate, visibleOperationsTabs]);

  const handleLogout = useCallback((): void => {
    const redirectPath = `${location.pathname}${location.search}`;

    logoutUnified();
    logout();
    message.success("已退出登录。");
    navigate(getLoginPath(redirectPath), { replace: true });
  }, [location.pathname, location.search, logout, logoutUnified, navigate]);
  const systemEntries = useMemo(() => {
    return getSystemEntries(
      unifiedSession?.identities ?? [],
      operationsIdentity?.tenantId,
      operationsIdentity?.id,
    );
  }, [operationsIdentity?.id, operationsIdentity?.tenantId, unifiedSession?.identities]);
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

  const handleOpenProductDetail = useCallback(
    (nextProductId: string): void => {
      navigate(buildProductDetailPath(nextProductId));
    },
    [navigate],
  );

  const handleBackToProductList = useCallback((): void => {
    navigate(OPERATIONS_PRODUCT_LIST_PATH);
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
        adminPermissionIds: normalizeTenantRolePermissionIds(tenant.adminPermissionIds),
        billingMode: tenant.billingMode,
        seatCount: tenant.seatCount,
        effectiveAt: tenant.effectiveAt,
        expiresAt: tenant.expiresAt,
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
      !tenantEditor.form.adminPermissionIds.length ||
      !tenantEditor.form.billingMode ||
      tenantEditor.form.adminPhone.trim().length !== 11 ||
      tenantEditor.form.seatCount < 1 ||
      !tenantEditor.form.effectiveAt.trim() ||
      !tenantEditor.form.expiresAt.trim()
    ) {
      message.warning("请先补齐租户名称、初始管理员信息、计费方式、席位数量、生效时间和失效时间。");
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
    message.success("已驳回当前 AI专家上架申请。");
    setRejectEditor({
      open: false,
      reason: "",
    });
    setAgentReview({
      open: false,
    });
  }, [rejectAgent, rejectEditor]);

  const accountMenuItems: MenuProps["items"] = [
    ...systemEntries.map(entry => ({
      key: `system-entry-${entry.identityId}`,
      icon: <AppstoreOutlined />,
      label: getSystemEntryMenuLabel(entry),
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
  const activeTenantSnapshot = useMemo<MockTenantManagementSnapshot | null>(
    () => (activeTenant ? getMockTenantManagementSnapshot(activeTenant.id) : null),
    [activeTenant],
  );
  const activeReviewSubmission = useMemo<OperationsAgentSubmission | null>(
    () => agentSubmissions.find(item => item.id === agentReview.submissionId) ?? null,
    [agentReview.submissionId, agentSubmissions],
  );
  const content = useMemo((): JSX.Element => {
    if (!visibleOperationsTabs.length) {
      return <Empty description="当前角色暂无运营管理权限" />;
    }

    if (activeTab === "tenants") {
      if (tenantId) {
        return (
          <TenantDetailConsole
            canEdit={canManageTenants}
            canToggleStatus={canManageTenants}
            tenant={activeTenant}
            tenantSnapshot={activeTenantSnapshot}
            statusLabels={tenantStatusLabels}
            onBack={handleBackToTenantList}
            onEdit={handleOpenEditTenant}
            onToggleStatus={handleToggleTenantStatus}
          />
        );
      }

      return (
        <TenantConsole
          canCreate={canManageTenants}
          tenants={tenants}
          statusLabels={tenantStatusLabels}
          onCreate={handleOpenCreateTenant}
          onViewDetail={handleOpenTenantDetail}
        />
      );
    }

    if (activeTab === "organization") {
      return (
        <OperationsOrganizationConsole
          canAssignRoles={canManageRoles}
          canChangeMemberStatus={canManageOrganization}
          canEditMembers={canManageOrganization}
          canInviteMembers={canManageOrganization}
          canManageCustomRoles={canManageRoles}
          canManageDepartments={canManageOrganization}
          canRemoveMembers={canManageOrganization}
          view="organization"
        />
      );
    }

    if (activeTab === "roleManagement") {
      return (
        <OperationsOrganizationConsole
          canAssignRoles={canManageRoles}
          canChangeMemberStatus={canManageOrganization}
          canEditMembers={canManageOrganization}
          canInviteMembers={canManageOrganization}
          canManageCustomRoles={canManageRoles}
          canManageDepartments={canManageOrganization}
          canRemoveMembers={canManageOrganization}
          view="roleManagement"
        />
      );
    }

    if (activeTab === "products") {
      return (
        <OperationsProductConsole
          approvedAgents={approvedAgents}
          categories={agentPlazaCategories}
          emptyProductForm={emptyProductForm}
          productId={productId}
          productStatusLabels={productStatusLabels}
          productTrialUnitLabels={productTrialUnitLabels}
          productTrialUnitOptions={productTrialUnitOptions}
          products={products}
          serviceContactConfig={serviceContactConfig}
          skillCategories={skillCenterCategories}
          tenants={tenants}
          onBackToProductList={handleBackToProductList}
          onCreateCategory={createAgentPlazaCategory}
          onCreateProduct={createProduct}
          onCreateSkillCategory={createSkillCenterCategory}
          onNavigateToProduct={handleOpenProductDetail}
          onToggleProductStatus={updateProductStatus}
          onUpdateServiceContactConfig={updateServiceContactConfig}
          onUpdateCategory={updateAgentPlazaCategory}
          onUpdateSkillCategory={updateSkillCenterCategory}
          onUpdateProduct={updateProduct}
        />
      );
    }

    if (activeTab === "resources") {
      if (!canManageResources) {
        return <Empty description="当前角色暂无资源池权限" />;
      }

      return (
        <OperationsResourceMeteringConsole
          externalMeteredServices={externalMeteredServices}
          meteringProviders={meteringProviders}
          modelServices={modelServices}
          onCreateExternalMeteredService={createExternalMeteredService}
          onCreateMeteringProvider={createMeteringProvider}
          onCreateModelService={createModelService}
          onUpdateExternalMeteredService={updateExternalMeteredService}
          onUpdateMeteringProvider={updateMeteringProvider}
          onUpdateModelService={updateModelService}
        />
      );
    }

    if (activeTab === "points") {
      if (!canManagePoints && !canManageBilling) {
        return <Empty description="当前角色暂无积分和订阅运营权限" />;
      }

      return (
        <OperationsPointsSubscriptionConsole
          canManageBilling={canManageBilling}
          canManagePoints={canManagePoints}
          pointsPackages={pointsPackages}
          pointsUsageRecords={pointsUsageRecords}
          referralRecords={referralRecords}
          registrationStrategy={registrationStrategy}
          salesChannelContractCodes={salesChannelContractCodes}
          subscriptionPlans={subscriptionPlans}
          tenants={tenants}
          onApplyTenantSubscriptionPlan={applyTenantSubscriptionPlan}
          onCreateSalesChannelContractCode={createSalesChannelContractCode}
          onCreateSubscriptionPlan={createSubscriptionPlan}
          onCreatePointsPackage={createPointsPackage}
          onUpdatePointsPackage={updatePointsPackage}
          onUpdateSalesChannelContractCode={updateSalesChannelContractCode}
          onUpdateSubscriptionPlan={updateSubscriptionPlan}
          onUpdateRegistrationStrategy={updateRegistrationStrategy}
        />
      );
    }

    if (activeTab === "orders") {
      if (!canManageOrders) {
        return <Empty description="当前角色暂无订单中心权限" />;
      }

      return <OperationsOrderCenterConsole tenants={tenants} />;
    }

    if (activeTab === "agents") {
      return (
        <AgentConsole
          canReview={canReviewAgent}
          submissions={agentSubmissions}
          statusLabels={agentStatusLabels}
          onOpenReview={handleOpenAgentReview}
        />
      );
    }

    if (activeTab === "platformConfig") {
      return (
        <OperationsPlatformConfigConsole
          communityGroupConfig={communityGroupConfig}
          registrationStrategy={registrationStrategy}
          onUpdateCommunityGroupConfig={updateCommunityGroupConfig}
          onUpdateRegistrationStrategy={updateRegistrationStrategy}
        />
      );
    }

    return (
      <TenantConsole
        canCreate={canManageTenants}
        tenants={tenants}
        statusLabels={tenantStatusLabels}
        onCreate={handleOpenCreateTenant}
        onViewDetail={handleOpenTenantDetail}
      />
    );
  }, [
    activeTenant,
    activeTenantSnapshot,
    activeTab,
    agentPlazaCategories,
    agentStatusLabels,
    agentSubmissions,
    applyTenantSubscriptionPlan,
    approvedAgents,
    canManageBilling,
    canManageOrders,
    canManagePoints,
    canManageResources,
    canManageTenants,
    canManageOrganization,
    canManageRoles,
    canReviewAgent,
    communityGroupConfig,
    createAgentPlazaCategory,
    createExternalMeteredService,
    createMeteringProvider,
    createModelService,
    createPointsPackage,
    createProduct,
    createSalesChannelContractCode,
    createSkillCenterCategory,
    createSubscriptionPlan,
    emptyProductForm,
    externalMeteredServices,
    handleBackToProductList,
    handleBackToTenantList,
    handleOpenAgentReview,
    handleOpenCreateTenant,
    handleOpenEditTenant,
    handleOpenProductDetail,
    handleOpenTenantDetail,
    handleToggleTenantStatus,
    meteringProviders,
    modelServices,
    productId,
    productStatusLabels,
    productTrialUnitLabels,
    productTrialUnitOptions,
    pointsPackages,
    pointsUsageRecords,
    products,
    registrationStrategy,
    referralRecords,
    salesChannelContractCodes,
    skillCenterCategories,
    serviceContactConfig,
    subscriptionPlans,
    tenantId,
    tenantStatusLabels,
    tenants,
    updateAgentPlazaCategory,
    updateCommunityGroupConfig,
    updateExternalMeteredService,
    updateMeteringProvider,
    updateModelService,
    updatePointsPackage,
    updateProduct,
    updateProductStatus,
    updateSalesChannelContractCode,
    updateRegistrationStrategy,
    updateServiceContactConfig,
    updateSkillCenterCategory,
    updateSubscriptionPlan,
    visibleOperationsTabs.length,
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
                <img className={shellStyles.brandLogo} src={PRODUCT_LOGO_URL} alt={PRODUCT_NAME} />
                {isSidebarCollapsed ? null : (
                  <div className={shellStyles.brandCopy}>
                    <div className={shellStyles.brandTitle}>{PRODUCT_NAME}</div>
                    <div className={shellStyles.brandSubtitle}>{PRODUCT_SLOGAN}</div>
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
            {visibleOperationsTabs.map(item => (
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
              初始管理员姓名
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
              初始管理员手机号
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

          <div className={classNames(styles.modalField, styles.fullSpanField)}>
            <div className={styles.tenantPermissionHeader}>
              <span className={styles.modalLabel}>初始管理员权限</span>
              <span className={adminStyles.consolePill}>
                已选 {tenantEditor.form.adminPermissionIds.length} 项
              </span>
            </div>
            <Select<string[]>
              className={styles.permissionSelect}
              mode="multiple"
              allowClear
              showSearch
              placeholder="请选择初始管理员拥有的权限"
              value={tenantEditor.form.adminPermissionIds}
              options={TENANT_PERMISSION_SELECT_OPTIONS}
              maxTagCount="responsive"
              optionFilterProp="label"
              onChange={nextPermissionIds =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    adminPermissionIds: normalizeTenantRolePermissionIds(nextPermissionIds),
                  },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.billingMode}>
              计费方式
            </label>
            <Select<OperationsTenantForm["billingMode"]>
              id={TENANT_FIELD_IDS.billingMode}
              className={styles.fullWidthInput}
              disabled={tenantEditor.mode === "edit"}
              value={tenantEditor.form.billingMode}
              options={OPERATIONS_TENANT_BILLING_MODE_OPTIONS}
              onChange={nextBillingMode =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    billingMode: nextBillingMode,
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
        open={agentReview.open}
        title={activeReviewSubmission?.name ?? "上架审核"}
        className={classNames(styles.fixedModal, styles.reviewModal)}
        onCancel={handleCloseAgentReview}
        footer={
          activeReviewSubmission ? (
            <>
              <Button key="close" onClick={handleCloseAgentReview}>
                关闭
              </Button>
              {activeReviewSubmission.status === "pending" && canReviewAgent ? (
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
                      ? "申请上架 AI专家"
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
                    <span className={adminStyles.consoleInfoLabel}>拟上架名称</span>
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
              <h3 className={adminStyles.detailBlockTitle}>上架说明</h3>
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
