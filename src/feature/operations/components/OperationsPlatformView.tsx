import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ApartmentOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Avatar, Button, Dropdown, Empty, Input, Modal, Select, message } from "antd";
import classNames from "classnames";
import { useNavigate, useParams } from "react-router-dom";

import { useOperationsAuth } from "@/feature/operations/hooks/useOperationsAuth";
import { useOperationsPlatform } from "@/feature/operations/hooks/useOperationsPlatform";
import {
  OPERATIONS_AGENT_PLAZA_VISIBILITY_LABELS,
  OPERATIONS_DEFAULT_PATH,
  OPERATIONS_TAB_OPTIONS,
} from "@/feature/operations/mockData";
import type {
  OperationsAgentSubmission,
  OperationsPlatformTabKey,
  OperationsTenant,
  OperationsTenantForm,
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

interface AgentReviewState {
  open: boolean;
  submissionId?: string;
}

interface RejectEditorState {
  open: boolean;
  submissionId?: string;
  reason: string;
}

interface AgentPlazaEditorState {
  open: boolean;
  submissionId?: string;
  category: NonNullable<OperationsAgentSubmission["plazaCategory"]>;
  visibility: NonNullable<OperationsAgentSubmission["plazaVisibility"]>;
  visibleTenantIds: string[];
  status: NonNullable<OperationsAgentSubmission["plazaStatus"]>;
}

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
  onToggleStatus: (tenant: OperationsTenant) => void;
}

interface AgentConsoleProps {
  submissions: OperationsAgentSubmission[];
  statusLabels: Record<OperationsAgentSubmission["status"], string>;
  onReview: (submissionId: string) => void;
}

interface AgentPlazaConsoleProps {
  submissions: OperationsAgentSubmission[];
  tenants: OperationsTenant[];
  onEdit: (submission: OperationsAgentSubmission) => void;
}

const OPERATIONS_TAB_ICON_MAP: Record<OperationsPlatformTabKey, JSX.Element> = {
  tenants: <ApartmentOutlined />,
  agents: <CheckCircleOutlined />,
  agentPlaza: <AppstoreOutlined />,
};

const TENANT_FIELD_IDS = {
  name: "operations-tenant-name",
  code: "operations-tenant-code",
  industry: "operations-tenant-industry",
  adminName: "operations-tenant-admin-name",
  adminPhone: "operations-tenant-admin-phone",
  hasFdeAccess: "operations-tenant-has-fde-access",
  seatCount: "operations-tenant-seat-count",
  effectiveAt: "operations-tenant-effective-at",
  expiresAt: "operations-tenant-expires-at",
} as const;

const AGENT_PLAZA_FIELD_IDS = {
  category: "operations-agent-plaza-category",
  visibility: "operations-agent-plaza-visibility",
  visibleTenantIds: "operations-agent-plaza-visible-tenant-ids",
  status: "operations-agent-plaza-status",
} as const;

const REJECT_FIELD_ID = "operations-agent-reject-reason";
const OPERATIONS_TENANT_LIST_PATH = "/ops/tenants";

const getTabKeyFromPath = (tabPath?: string, tenantId?: string): OperationsPlatformTabKey => {
  if (tenantId || tabPath === "tenants") {
    return "tenants";
  }

  if (tabPath === "agents" || tabPath === "agentPlaza") {
    return tabPath;
  }

  return "tenants";
};

const buildTenantDetailPath = (tenantId: string): string => `${OPERATIONS_TENANT_LIST_PATH}/${tenantId}`;

const formatTenantValidity = (tenant: OperationsTenant): string =>
  `${tenant.effectiveAt} 至 ${tenant.expiresAt}`;

const getTenantStatusClassName = (status: OperationsTenant["status"]): string =>
  classNames(
    adminStyles.consoleStatusTag,
    status === "active" && adminStyles.consoleStatusTagSuccess,
    status === "pending" && adminStyles.consoleStatusTagWarning,
    status === "suspended" && adminStyles.consoleStatusTagDanger,
  );

const getAgentStatusClassName = (status: OperationsAgentSubmission["status"]): string =>
  classNames(
    adminStyles.consoleStatusTag,
    status === "approved" && adminStyles.consoleStatusTagSuccess,
    status === "pending" && adminStyles.consoleStatusTagWarning,
    status === "rejected" && adminStyles.consoleStatusTagDanger,
  );

const getPlazaStatusClassName = (status: NonNullable<OperationsAgentSubmission["plazaStatus"]>): string =>
  classNames(
    adminStyles.consoleStatusTag,
    status === "online" && adminStyles.consoleStatusTagSuccess,
    status === "offline" && adminStyles.consoleStatusTagWarning,
  );

const getPlazaStatusLabel = (status: NonNullable<OperationsAgentSubmission["plazaStatus"]>): string =>
  status === "online" ? "展示中" : "已下线";

const TenantConsole = ({
  tenants,
  statusLabels,
  onCreate,
  onViewDetail,
}: TenantConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");

  const filteredTenants = useMemo(
    () =>
      tenants.filter(item =>
        [item.name, item.adminName, item.adminPhone, item.code]
          .join(" ")
          .toLowerCase()
          .includes(keyword.trim().toLowerCase()),
      ),
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
                  <th>FDE权限</th>
                  <th>有效期</th>
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
                    <td>{tenant.hasFdeAccess ? "已开通" : "未开通"}</td>
                    <td>{formatTenantValidity(tenant)}</td>
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
  onToggleStatus,
}: TenantDetailConsoleProps): JSX.Element => {
  if (!tenant) {
    return (
      <section className={adminStyles.consoleSection}>
        <div className={styles.emptyWrap}>
          <Empty description="未找到该租户。">
            <Button onClick={onBack}>返回租户列表</Button>
          </Empty>
        </div>
      </section>
    );
  }

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <div className={adminStyles.consoleActions}>
            <Button type="link" size="small" onClick={onBack}>
              返回租户列表
            </Button>
          </div>
          <h1 className={adminStyles.consoleTitle}>{tenant.name}</h1>
        </div>
        <div className={adminStyles.consoleActions}>
          <span className={getTenantStatusClassName(tenant.status)}>{statusLabels[tenant.status]}</span>
          <Button onClick={() => onEdit(tenant)}>编辑资料</Button>
          <Button onClick={() => onToggleStatus(tenant)}>
            {tenant.status === "suspended" ? "启用租户" : "停用租户"}
          </Button>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={classNames(styles.detailGrid, styles.tenantDetailGrid)}>
          <section className={adminStyles.detailBlock}>
            <h3 className={classNames(adminStyles.detailBlockTitle, styles.detailBlockTitleReset)}>
              租户信息
            </h3>
            <div className={adminStyles.consoleRows}>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>租户名称</span>
                <span className={adminStyles.consoleInfoValue}>{tenant.name}</span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>租户编码</span>
                <span className={adminStyles.consoleInfoValue}>{tenant.code}</span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>管理员</span>
                <span className={adminStyles.consoleInfoValue}>
                  {tenant.adminName} · {tenant.adminPhone}
                </span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>FDE权限</span>
                <span className={adminStyles.consoleInfoValue}>
                  {tenant.hasFdeAccess ? "已开通，员工可申请上架" : "未开通"}
                </span>
              </div>
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>有效期</span>
                <span className={adminStyles.consoleInfoValue}>{formatTenantValidity(tenant)}</span>
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
        </div>
      </section>
    </div>
  );
};

const AgentConsole = ({
  submissions,
  statusLabels,
  onReview,
}: AgentConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | OperationsAgentSubmission["status"]>("all");

  const filteredSubmissions = useMemo(
    () =>
      submissions
        .filter(item => (statusFilter === "all" ? true : item.status === statusFilter))
        .filter(item =>
          [item.name, item.version, item.submitter, item.currentScopeLabel ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(keyword.trim().toLowerCase()),
        ),
    [keyword, statusFilter, submissions],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>AI专家上架审批</h1>
        </div>
        <div className={adminStyles.consoleHeaderSide}>
          <Input
            className={adminStyles.consoleInlineSearch}
            value={keyword}
            placeholder="搜索 AI专家、版本、提交人"
            onChange={event => setKeyword(event.target.value)}
          />
          <Select
            value={statusFilter}
            options={[
              { value: "all", label: "全部状态" },
              { value: "pending", label: "待审批" },
              { value: "approved", label: "已通过" },
              { value: "rejected", label: "已驳回" },
            ]}
            onChange={value => setStatusFilter(value)}
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
                  <th>版本</th>
                  <th>提交人</th>
                  <th>当前发布范围</th>
                  <th>状态</th>
                  <th>提交时间</th>
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
                        onClick={() => onReview(submission.id)}
                      >
                        <span className={styles.recordEntryTitle}>{submission.name}</span>
                      </button>
                    </td>
                    <td>{submission.version}</td>
                    <td>{submission.submitter}</td>
                    <td>{submission.currentScopeLabel ?? "待补充"}</td>
                    <td>
                      <span className={getAgentStatusClassName(submission.status)}>
                        {statusLabels[submission.status]}
                      </span>
                    </td>
                    <td>{submission.submittedAt}</td>
                    <td>{submission.lastReviewedAt ?? "待处理"}</td>
                    <td>
                      <Button size="small" type="link" onClick={() => onReview(submission.id)}>
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
            <Empty description="当前筛选下暂无上架申请。" />
          </div>
        )}
      </section>
    </div>
  );
};

const AgentPlazaConsole = ({
  submissions,
  tenants,
  onEdit,
}: AgentPlazaConsoleProps): JSX.Element => {
  const [keyword, setKeyword] = useState<string>("");

  const filteredSubmissions = useMemo(
    () =>
      submissions.filter(item =>
        [
          item.name,
          item.version,
          item.plazaCategory ?? "",
          ...(item.visibleTenantNames ?? []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword.trim().toLowerCase()),
      ),
    [keyword, submissions],
  );

  const enterpriseTenantCount = useMemo(
    () => tenants.filter(item => item.type === "enterprise").length,
    [tenants],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>AI专家广场管理</h1>
          <p className={adminStyles.consoleSubtitle}>
            管理已审批通过 AI专家 的广场分类、展示状态和租户可见范围。
          </p>
        </div>
        <div className={adminStyles.consoleHeaderSide}>
          <Input
            className={adminStyles.consoleInlineSearch}
            value={keyword}
            placeholder="搜索 AI专家、分类、租户"
            onChange={event => setKeyword(event.target.value)}
          />
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <div className={adminStyles.consoleSectionHeaderMain}>
            <h2 className={adminStyles.consoleSectionTitle}>广场投放列表</h2>
            <p className={adminStyles.consoleSectionMeta}>
              共 {submissions.length} 个 AI专家 ，支持 {enterpriseTenantCount} 个企业租户定向可见。
            </p>
          </div>
        </div>

        {filteredSubmissions.length ? (
          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>AI专家</th>
                  <th>版本</th>
                  <th>广场分类</th>
                  <th>可见范围</th>
                  <th>展示状态</th>
                  <th>最近处理</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map(submission => {
                  const visibilityLabel =
                    submission.plazaVisibility === "tenant"
                      ? `${OPERATIONS_AGENT_PLAZA_VISIBILITY_LABELS.tenant} · ${
                          submission.visibleTenantNames?.join("、") || "未选择租户"
                        }`
                      : OPERATIONS_AGENT_PLAZA_VISIBILITY_LABELS.public;

                  return (
                    <tr key={submission.id}>
                      <td>
                        <button
                          type="button"
                          className={styles.recordEntryButton}
                          onClick={() => onEdit(submission)}
                        >
                          <span className={styles.recordEntryTitle}>{submission.name}</span>
                        </button>
                      </td>
                      <td>{submission.version}</td>
                      <td>{submission.plazaCategory ?? "通用"}</td>
                      <td>{visibilityLabel}</td>
                      <td>
                        <span className={getPlazaStatusClassName(submission.plazaStatus ?? "offline")}>
                          {getPlazaStatusLabel(submission.plazaStatus ?? "offline")}
                        </span>
                      </td>
                      <td>{submission.plazaUpdatedAt ?? submission.lastReviewedAt ?? "待配置"}</td>
                      <td>
                        <Button size="small" type="link" onClick={() => onEdit(submission)}>
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
            <Empty description="当前筛选下暂无可管理的 AI专家。" />
          </div>
        )}
      </section>
    </div>
  );
};

/**
 * 运营后台主工作台，当前按租户管理、AI专家上架审批、AI专家广场管理三块能力组织。
 */
export const OperationsPlatformView = (): JSX.Element => {
  const navigate = useNavigate();
  const { tabPath, tenantId } = useParams<{
    tabPath?: string;
    tenantId?: string;
  }>();
  const { logout, session } = useOperationsAuth();
  const {
    tenants,
    agentSubmissions,
    approvedAgentSubmissions,
    emptyTenantForm,
    tenantStatusLabels,
    agentStatusLabels,
    createTenant,
    updateTenant,
    updateTenantStatus,
    approveAgent,
    rejectAgent,
    updateAgentPlazaSettings,
  } = useOperationsPlatform();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [tenantEditor, setTenantEditor] = useState<TenantEditorState>({
    open: false,
    mode: "create",
    form: emptyTenantForm,
  });
  const [agentReview, setAgentReview] = useState<AgentReviewState>({ open: false });
  const [rejectEditor, setRejectEditor] = useState<RejectEditorState>({
    open: false,
    reason: "",
  });
  const [plazaEditor, setPlazaEditor] = useState<AgentPlazaEditorState>({
    open: false,
    category: "通用",
    visibility: "public",
    visibleTenantIds: [],
    status: "offline",
  });

  const activeTab = getTabKeyFromPath(tabPath, tenantId);

  useEffect(() => {
    if (tenantId) {
      return;
    }

    if (tabPath === "tenants" || tabPath === "agents" || tabPath === "agentPlaza") {
      return;
    }

    navigate(OPERATIONS_DEFAULT_PATH, { replace: true });
  }, [navigate, tabPath, tenantId]);

  const handleLogout = useCallback((): void => {
    logout();
    message.success("已退出运营后台。");
    navigate("/ops/login", { replace: true });
  }, [logout, navigate]);

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
        hasFdeAccess: tenant.hasFdeAccess,
        seatCount: tenant.seatCount,
        effectiveAt: tenant.effectiveAt,
        expiresAt: tenant.expiresAt,
        moduleLabels: tenant.moduleLabels,
      },
    });
  }, []);

  const handleSubmitTenant = useCallback((): void => {
    const normalizedTenantForm: OperationsTenantForm = {
      ...tenantEditor.form,
      code: tenantEditor.form.code.trim(),
      industry: tenantEditor.form.industry.trim(),
      seatCount: tenantEditor.form.seatCount > 0 ? tenantEditor.form.seatCount : 1,
      effectiveAt: tenantEditor.form.effectiveAt.trim(),
      expiresAt: tenantEditor.form.expiresAt.trim(),
      moduleLabels: tenantEditor.form.moduleLabels.length
        ? tenantEditor.form.moduleLabels
        : ["FrontisAI工作台"],
    };

    if (
      !normalizedTenantForm.name.trim() ||
      !normalizedTenantForm.code ||
      !normalizedTenantForm.industry ||
      !normalizedTenantForm.adminName.trim() ||
      normalizedTenantForm.adminPhone.trim().length !== 11 ||
      !normalizedTenantForm.effectiveAt ||
      !normalizedTenantForm.expiresAt
    ) {
      message.warning("请先补齐租户基础信息和管理员信息。");
      return;
    }

    if (normalizedTenantForm.effectiveAt > normalizedTenantForm.expiresAt) {
      message.warning("失效时间不能早于生效时间。");
      return;
    }

    if (tenantEditor.mode === "create") {
      createTenant(normalizedTenantForm);
      message.success("租户已创建。");
    } else if (tenantEditor.tenantId) {
      updateTenant(tenantEditor.tenantId, normalizedTenantForm);
      message.success("租户信息已更新。");
    }

    setTenantEditor({
      open: false,
      mode: "create",
      form: emptyTenantForm,
    });
  }, [createTenant, emptyTenantForm, tenantEditor, updateTenant]);

  const handleToggleTenantStatus = useCallback(
    (tenant: OperationsTenant): void => {
      const nextStatus = tenant.status === "suspended" ? "active" : "suspended";

      updateTenantStatus(tenant.id, nextStatus);
      message.success(nextStatus === "active" ? "租户已启用。" : "租户已停用。");
    },
    [updateTenantStatus],
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

  const handleOpenReview = useCallback((submissionId: string): void => {
    setAgentReview({ open: true, submissionId });
  }, []);

  const handleApproveAgent = useCallback((): void => {
    if (!agentReview.submissionId) {
      return;
    }

    approveAgent(agentReview.submissionId);
    setAgentReview({ open: false });
    message.success("AI专家上架申请已审批通过。");
  }, [agentReview.submissionId, approveAgent]);

  const handleOpenReject = useCallback((): void => {
    if (!agentReview.submissionId) {
      return;
    }

    setRejectEditor({
      open: true,
      submissionId: agentReview.submissionId,
      reason: "",
    });
  }, [agentReview.submissionId]);

  const handleSubmitReject = useCallback((): void => {
    if (!rejectEditor.submissionId || !rejectEditor.reason.trim()) {
      message.warning("请先填写驳回原因。");
      return;
    }

    rejectAgent(rejectEditor.submissionId, rejectEditor.reason);
    setRejectEditor({ open: false, reason: "" });
    setAgentReview({ open: false });
    message.success("AI专家上架申请已驳回。");
  }, [rejectAgent, rejectEditor]);

  const handleOpenPlazaEditor = useCallback((submission: OperationsAgentSubmission): void => {
    setPlazaEditor({
      open: true,
      submissionId: submission.id,
      category: submission.plazaCategory ?? "通用",
      visibility: submission.plazaVisibility ?? "public",
      visibleTenantIds: submission.visibleTenantIds ?? [],
      status: submission.plazaStatus ?? "offline",
    });
  }, []);

  const handleSubmitPlazaSettings = useCallback((): void => {
    if (!plazaEditor.submissionId) {
      return;
    }

    const visibleTenants = tenants.filter(item => plazaEditor.visibleTenantIds.includes(item.id));

    if (plazaEditor.visibility === "tenant" && !visibleTenants.length) {
      message.warning("请至少选择一个可见租户。");
      return;
    }

    updateAgentPlazaSettings(plazaEditor.submissionId, {
      plazaCategory: plazaEditor.category,
      plazaVisibility: plazaEditor.visibility,
      visibleTenantIds: plazaEditor.visibility === "tenant" ? plazaEditor.visibleTenantIds : [],
      visibleTenantNames:
        plazaEditor.visibility === "tenant" ? visibleTenants.map(item => item.name) : [],
      plazaStatus: plazaEditor.status,
    });
    setPlazaEditor({
      open: false,
      category: "通用",
      visibility: "public",
      visibleTenantIds: [],
      status: "offline",
    });
    message.success("AI专家广场投放设置已更新。");
  }, [plazaEditor, tenants, updateAgentPlazaSettings]);

  const activeTenant = useMemo(
    () => tenants.find(item => item.id === tenantId) ?? null,
    [tenantId, tenants],
  );

  const currentReviewSubmission = useMemo(
    () =>
      agentReview.submissionId
        ? agentSubmissions.find(item => item.id === agentReview.submissionId) ?? null
        : null,
    [agentReview.submissionId, agentSubmissions],
  );

  const accountMenuItems: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const enterpriseTenantOptions = useMemo(
    () =>
      tenants
        .filter(item => item.type === "enterprise")
        .map(item => ({
          value: item.id,
          label: item.name,
        })),
    [tenants],
  );

  const content =
    activeTab === "agents" ? (
      <AgentConsole
        submissions={agentSubmissions}
        statusLabels={agentStatusLabels}
        onReview={handleOpenReview}
      />
    ) : activeTab === "agentPlaza" ? (
      <AgentPlazaConsole
        submissions={approvedAgentSubmissions}
        tenants={tenants}
        onEdit={handleOpenPlazaEditor}
      />
    ) : tenantId ? (
      <TenantDetailConsole
        tenant={activeTenant}
        statusLabels={tenantStatusLabels}
        onBack={handleBackToTenantList}
        onEdit={handleOpenEditTenant}
        onToggleStatus={handleToggleTenantStatus}
      />
    ) : (
      <TenantConsole
        tenants={tenants}
        statusLabels={tenantStatusLabels}
        onCreate={handleOpenCreateTenant}
        onViewDetail={handleOpenTenantDetail}
      />
    );

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
                  [shellStyles.adminNavButtonActive]: activeTab === item.key,
                  [shellStyles.adminNavButtonCollapsed]: isSidebarCollapsed,
                })}
                onClick={() => navigate(`/ops/${item.key}`, { replace: item.key === "tenants" })}
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
                  form: { ...currentState.form, name: event.target.value },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.code}>
              租户编码
            </label>
            <Input
              id={TENANT_FIELD_IDS.code}
              value={tenantEditor.form.code}
              placeholder="如 ENT-2026-001"
              onChange={event =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: { ...currentState.form, code: event.target.value.toUpperCase() },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.industry}>
              所属行业
            </label>
            <Input
              id={TENANT_FIELD_IDS.industry}
              value={tenantEditor.form.industry}
              onChange={event =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: { ...currentState.form, industry: event.target.value },
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
                  form: { ...currentState.form, adminName: event.target.value },
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
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.hasFdeAccess}>
              FDE权限
            </label>
            <Select<boolean>
              id={TENANT_FIELD_IDS.hasFdeAccess}
              value={tenantEditor.form.hasFdeAccess}
              options={[
                { value: true, label: "已开通" },
                { value: false, label: "未开通" },
              ]}
              onChange={value =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: { ...currentState.form, hasFdeAccess: value },
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={TENANT_FIELD_IDS.seatCount}>
              座席数量
            </label>
            <Input
              id={TENANT_FIELD_IDS.seatCount}
              type="number"
              min={1}
              value={tenantEditor.form.seatCount > 0 ? `${tenantEditor.form.seatCount}` : ""}
              onChange={event =>
                setTenantEditor(currentState => ({
                  ...currentState,
                  form: {
                    ...currentState.form,
                    seatCount: Number(event.target.value.replace(/\D/g, "")) || 0,
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
                  form: { ...currentState.form, effectiveAt: event.target.value },
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
                  form: { ...currentState.form, expiresAt: event.target.value },
                }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={agentReview.open}
        title="AI专家上架审批"
        onCancel={() => setAgentReview({ open: false })}
        onOk={handleApproveAgent}
        okText={currentReviewSubmission?.status === "approved" ? "已审批通过" : "审批通过"}
        okButtonProps={{ disabled: currentReviewSubmission?.status === "approved" }}
        cancelText={currentReviewSubmission?.status === "pending" ? "关闭" : "关闭"}
        footer={
          currentReviewSubmission ? (
            <div className={styles.modalFooterActions}>
              <Button onClick={() => setAgentReview({ open: false })}>关闭</Button>
              {currentReviewSubmission.status === "pending" ? (
                <Button onClick={handleOpenReject}>驳回</Button>
              ) : null}
              <Button
                type="primary"
                disabled={currentReviewSubmission.status === "approved"}
                onClick={handleApproveAgent}
              >
                {currentReviewSubmission.status === "approved" ? "已审批通过" : "审批通过"}
              </Button>
            </div>
          ) : null
        }
        destroyOnHidden
      >
        {currentReviewSubmission ? (
          <div className={adminStyles.consoleRows}>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>AI专家</span>
              <span className={adminStyles.consoleInfoValue}>{currentReviewSubmission.name}</span>
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>版本</span>
              <span className={adminStyles.consoleInfoValue}>{currentReviewSubmission.version}</span>
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>提交人</span>
              <span className={adminStyles.consoleInfoValue}>{currentReviewSubmission.submitter}</span>
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>当前范围</span>
              <span className={adminStyles.consoleInfoValue}>
                {currentReviewSubmission.currentScopeLabel ?? "待补充"}
              </span>
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>申请状态</span>
              <span className={adminStyles.consoleInfoValue}>
                <span className={getAgentStatusClassName(currentReviewSubmission.status)}>
                  {agentStatusLabels[currentReviewSubmission.status]}
                </span>
              </span>
            </div>
            <div className={adminStyles.consoleInfoRow}>
              <span className={adminStyles.consoleInfoLabel}>申请理由</span>
              <span className={adminStyles.consoleInfoValue}>
                {currentReviewSubmission.submitReason ?? "待补充"}
              </span>
            </div>
            {currentReviewSubmission.rejectReason ? (
              <div className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>驳回原因</span>
                <span className={adminStyles.consoleInfoValue}>
                  {currentReviewSubmission.rejectReason}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <Empty description="未找到对应申请。" />
        )}
      </Modal>

      <Modal
        open={rejectEditor.open}
        title="驳回上架申请"
        onCancel={() => setRejectEditor({ open: false, reason: "" })}
        onOk={handleSubmitReject}
        destroyOnHidden
      >
        <div className={styles.modalField}>
          <label className={styles.modalLabel} htmlFor={REJECT_FIELD_ID}>
            驳回原因
          </label>
          <Input.TextArea
            id={REJECT_FIELD_ID}
            rows={4}
            value={rejectEditor.reason}
            placeholder="请填写驳回原因"
            onChange={event =>
              setRejectEditor(currentState => ({
                ...currentState,
                reason: event.target.value,
              }))
            }
          />
        </div>
      </Modal>

      <Modal
        open={plazaEditor.open}
        title="编辑 AI专家广场投放"
        onCancel={() =>
          setPlazaEditor({
            open: false,
            category: "通用",
            visibility: "public",
            visibleTenantIds: [],
            status: "offline",
          })
        }
        onOk={handleSubmitPlazaSettings}
        destroyOnHidden
      >
        <div className={styles.formGrid}>
          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_FIELD_IDS.category}>
              广场分类
            </label>
            <Select
              id={AGENT_PLAZA_FIELD_IDS.category}
              value={plazaEditor.category}
              options={[
                { value: "通用", label: "通用" },
                { value: "销售", label: "销售" },
                { value: "生产", label: "生产" },
                { value: "供应链", label: "供应链" },
                { value: "办公协同", label: "办公协同" },
              ]}
              onChange={value =>
                setPlazaEditor(currentState => ({ ...currentState, category: value }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_FIELD_IDS.visibility}>
              可见范围
            </label>
            <Select
              id={AGENT_PLAZA_FIELD_IDS.visibility}
              value={plazaEditor.visibility}
              options={[
                { value: "public", label: "全平台可见" },
                { value: "tenant", label: "指定租户可见" },
              ]}
              onChange={value =>
                setPlazaEditor(currentState => ({
                  ...currentState,
                  visibility: value,
                  visibleTenantIds: value === "tenant" ? currentState.visibleTenantIds : [],
                }))
              }
            />
          </div>

          <div className={styles.modalField}>
            <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_FIELD_IDS.status}>
              展示状态
            </label>
            <Select
              id={AGENT_PLAZA_FIELD_IDS.status}
              value={plazaEditor.status}
              options={[
                { value: "online", label: "展示中" },
                { value: "offline", label: "已下线" },
              ]}
              onChange={value =>
                setPlazaEditor(currentState => ({ ...currentState, status: value }))
              }
            />
          </div>

          {plazaEditor.visibility === "tenant" ? (
            <div className={styles.modalField}>
              <label className={styles.modalLabel} htmlFor={AGENT_PLAZA_FIELD_IDS.visibleTenantIds}>
                指定租户
              </label>
              <Select
                id={AGENT_PLAZA_FIELD_IDS.visibleTenantIds}
                mode="multiple"
                value={plazaEditor.visibleTenantIds}
                options={enterpriseTenantOptions}
                onChange={value =>
                  setPlazaEditor(currentState => ({
                    ...currentState,
                    visibleTenantIds: value,
                  }))
                }
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};
