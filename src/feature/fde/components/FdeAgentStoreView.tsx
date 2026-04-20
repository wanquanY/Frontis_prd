import { useCallback, useMemo, useState } from "react";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Input, Modal, Select, message } from "antd";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getAvatarUrl } from "@/pages/utils";
import { OPERATIONS_INITIAL_TENANTS } from "@/feature/operations/mockData";
import { loadStoredOperationsTenants } from "@/feature/operations/tenantStorage";
import type { OperationsAgentSubmission } from "@/feature/operations/types";
import {
  loadEnterpriseCommodityApplications,
  saveEnterpriseCommodityApplications,
} from "@/feature/fde/enterpriseCommodityApplications";

import styles from "./FdeAgentStoreView.module.less";

interface FdeAgentStoreViewProps {
  onNavigateToAgentDev?: () => void;
  viewerRole?: "employee" | "admin";
}

interface SkillItem {
  name: string;
  type: string;
}

interface VersionItem {
  v: string;
  desc: string;
  date: string;
  cur?: boolean;
}

type AgentScope = "public" | "team" | "personal";
type AgentShelfFilter = "all" | "enterprise" | "platform" | "mine";
type BusinessLineFilter = "all" | "general" | "production" | "sales" | "supplyChain";
type AgentSourceType = "enterprise" | "platform";
type AgentDistributionScope = "enterpriseOnly" | "allTenants" | "assignedTenants";

interface AgentItem {
  id: number;
  name: string;
  version: string;
  domain: string;
  desc: string;
  scene: string;
  techShape: string;
  model: string;
  runtime: string;
  ownerName: string;
  sourceType: AgentSourceType;
  distributionScope: AgentDistributionScope;
  submitTime: string;
  scope: AgentScope;
  sharedTargetLabel?: string;
  skills: SkillItem[];
  versions: VersionItem[];
  installCount: number;
  activeUsers: number;
  rating: number;
  updatedAt: string;
}

interface ShelfApplicationEditorState {
  open: boolean;
  name: string;
  reason: string;
}

const SHELF_APPLICATION_NAME_FIELD_ID = "fde-agent-store-shelf-name";
const SHELF_APPLICATION_REASON_FIELD_ID = "fde-agent-store-shelf-reason";

const AGENT_AVATAR_SEEDS: string[] = [
  "employee-pm",
  "employee-designer",
  "employee-research",
  "employee-ops",
  "employee-sales",
  "employee-product-manager",
  "employee-architect",
  "employee-growth",
];
const AGENT_DETAIL_PLACEHOLDER_TEXT = "AI专家详情不分功能和展现信息参考原孙楠设计";

const DOMAIN_TONE_MAP: Record<string, string> = {
  sales: "linear-gradient(180deg, #dff4ff 0%, #ebf8ff 58%, #f5fbff 100%)",
  delivery: "linear-gradient(180deg, #e4f6ff 0%, #edf9ff 58%, #f6fbff 100%)",
  procurement: "linear-gradient(180deg, #e9f8ff 0%, #f1faff 58%, #f7fbff 100%)",
  management: "linear-gradient(180deg, #e8f8ff 0%, #f0fbff 58%, #f7fcff 100%)",
};

const AGENTS: AgentItem[] = [
  {
    id: 1,
    name: "销售话术助手",
    version: "v1.2.0",
    domain: "sales",
    desc: "根据客户画像与历史沟通记录，实时生成个性化销售话术与应对策略，提升转化率与客户满意度。",
    scene: "销售沟通",
    techShape: "对话型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    ownerName: "杨万泉",
    sourceType: "enterprise",
    distributionScope: "enterpriseOnly",
    submitTime: "2026-04-01 09:30",
    scope: "public",
    installCount: 128,
    activeUsers: 326,
    rating: 4.7,
    updatedAt: "2026-04-15",
    skills: [
      { name: "客户意图识别", type: "知识型" },
      { name: "话术生成引擎", type: "创作型" },
      { name: "历史数据检索", type: "知识型" },
    ],
    versions: [
      { v: "v1.2.0", desc: "新增行业话术模板库", date: "2026-04-15", cur: true },
      { v: "v1.1.0", desc: "优化意图识别准确率", date: "2026-04-08" },
    ],
  },
  {
    id: 2,
    name: "商机跟进提醒",
    version: "v1.0.5",
    domain: "sales",
    desc: "自动追踪销售漏斗各阶段商机，根据停留时长智能推送跟进提醒，避免商机流失。",
    scene: "商机管理",
    techShape: "触发型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    ownerName: "李婷",
    sourceType: "enterprise",
    distributionScope: "enterpriseOnly",
    submitTime: "2026-03-28 14:20",
    scope: "team",
    sharedTargetLabel: "销售部、客户成功部",
    installCount: 56,
    activeUsers: 38,
    rating: 4.5,
    updatedAt: "2026-04-10",
    skills: [
      { name: "商机监控", type: "触发型" },
      { name: "消息推送", type: "联动型" },
    ],
    versions: [
      { v: "v1.0.5", desc: "修复提醒延迟问题", date: "2026-04-10", cur: true },
      { v: "v1.0.0", desc: "首版发布", date: "2026-04-01" },
    ],
  },
  {
    id: 3,
    name: "项目交付助手",
    version: "v2.0.0",
    domain: "delivery",
    desc: "智能追踪项目里程碑与任务进度，自动生成周报与风险预警，帮助 PM 高效管理交付节奏。",
    scene: "项目管理",
    techShape: "工作流型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    ownerName: "王晨",
    sourceType: "enterprise",
    distributionScope: "enterpriseOnly",
    submitTime: "2026-03-25 10:00",
    scope: "public",
    installCount: 203,
    activeUsers: 482,
    rating: 4.8,
    updatedAt: "2026-04-12",
    skills: [
      { name: "项目进度分析", type: "知识型" },
      { name: "周报生成", type: "创作型" },
    ],
    versions: [
      { v: "v2.0.0", desc: "新增风险预警", date: "2026-04-12", cur: true },
      { v: "v1.5.0", desc: "优化周报格式", date: "2026-04-05" },
    ],
  },
  {
    id: 4,
    name: "合同审查助手",
    version: "v1.1.0",
    domain: "procurement",
    desc: "智能识别合同中的风险条款，自动提取关键日期、金额与义务，生成审核摘要。",
    scene: "合同审核",
    techShape: "知识型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    ownerName: "赵六",
    sourceType: "enterprise",
    distributionScope: "enterpriseOnly",
    submitTime: "2026-03-30 16:00",
    scope: "public",
    installCount: 34,
    activeUsers: 91,
    rating: 4.4,
    updatedAt: "2026-04-11",
    skills: [
      { name: "合同风险识别", type: "知识型" },
      { name: "条款提取", type: "脚本型" },
    ],
    versions: [{ v: "v1.1.0", desc: "优化风险识别准确率", date: "2026-04-11", cur: true }],
  },
  {
    id: 5,
    name: "每日工作简报",
    version: "v1.4.0",
    domain: "management",
    desc: "自动汇聚多渠道工作信息，每日定时生成结构化工作简报，支持自定义模板。",
    scene: "办公效率",
    techShape: "创作型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    ownerName: "杨万泉",
    sourceType: "enterprise",
    distributionScope: "enterpriseOnly",
    submitTime: "2026-03-20 08:00",
    scope: "personal",
    installCount: 1,
    activeUsers: 1,
    rating: 4.9,
    updatedAt: "2026-04-13",
    skills: [
      { name: "信息聚合", type: "知识型" },
      { name: "简报生成", type: "创作型" },
    ],
    versions: [
      { v: "v1.4.0", desc: "新增自定义模板", date: "2026-04-13", cur: true },
      { v: "v1.3.0", desc: "优化聚合逻辑", date: "2026-04-06" },
    ],
  },
  {
    id: 6,
    name: "会议纪要助手",
    version: "v1.2.0",
    domain: "management",
    desc: "实时转写会议录音，自动提取决策事项与行动计划，生成结构化会议纪要。",
    scene: "会议管理",
    techShape: "知识型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    ownerName: "周可",
    sourceType: "enterprise",
    distributionScope: "enterpriseOnly",
    submitTime: "2026-03-22 14:00",
    scope: "team",
    sharedTargetLabel: "产品部、设计部",
    installCount: 178,
    activeUsers: 74,
    rating: 4.7,
    updatedAt: "2026-04-09",
    skills: [
      { name: "录音转写", type: "知识型" },
      { name: "纪要生成", type: "创作型" },
    ],
    versions: [{ v: "v1.2.0", desc: "优化转写准确率", date: "2026-04-09", cur: true }],
  },
  {
    id: 7,
    name: "权限审批助手",
    version: "v1.2.0",
    domain: "management",
    desc: "自动处理权限申请，智能校验合规性并推送审批流。",
    scene: "权限管理",
    techShape: "工作流型",
    model: "Claude Sonnet 4.6",
    runtime: "标准Runtime",
    ownerName: "赵六",
    sourceType: "enterprise",
    distributionScope: "enterpriseOnly",
    submitTime: "2026-03-18 14:00",
    scope: "public",
    installCount: 89,
    activeUsers: 165,
    rating: 4.6,
    updatedAt: "2026-04-08",
    skills: [
      { name: "权限检查", type: "脚本型" },
      { name: "审批流", type: "工作流型" },
    ],
    versions: [{ v: "v1.2.0", desc: "新增批量审批", date: "2026-04-08", cur: true }],
  },
  {
    id: 8,
    name: "行业方案顾问",
    version: "v3.1.0",
    domain: "management",
    desc: "沉淀 Frontis 平台跨行业最佳实践，帮助业务团队快速生成行业方案建议、价值主张和实施路径。",
    scene: "方案咨询",
    techShape: "知识型",
    model: "Claude Sonnet 4.6",
    runtime: "增强Runtime",
    ownerName: "Frontis 平台",
    sourceType: "platform",
    distributionScope: "allTenants",
    submitTime: "2026-04-02 11:00",
    scope: "public",
    installCount: 416,
    activeUsers: 1089,
    rating: 4.8,
    updatedAt: "2026-04-16",
    skills: [
      { name: "行业知识检索", type: "知识型" },
      { name: "方案结构生成", type: "创作型" },
    ],
    versions: [
      { v: "v3.1.0", desc: "新增制造与零售行业模板", date: "2026-04-16", cur: true },
      { v: "v3.0.0", desc: "升级平台知识库", date: "2026-04-03" },
    ],
  },
  {
    id: 9,
    name: "线索清洗助手",
    version: "v2.3.1",
    domain: "sales",
    desc: "对导入线索进行字段补全、重复识别与优先级标注，帮助销售团队快速完成线索分层。",
    scene: "线索管理",
    techShape: "工作流型",
    model: "Claude Sonnet 4.6",
    runtime: "增强Runtime",
    ownerName: "Frontis 平台",
    sourceType: "platform",
    distributionScope: "assignedTenants",
    submitTime: "2026-04-06 15:40",
    scope: "team",
    sharedTargetLabel: "销售部、市场部",
    installCount: 264,
    activeUsers: 512,
    rating: 4.6,
    updatedAt: "2026-04-17",
    skills: [
      { name: "线索去重", type: "脚本型" },
      { name: "优先级打分", type: "知识型" },
    ],
    versions: [
      { v: "v2.3.1", desc: "支持 CRM 字段映射", date: "2026-04-17", cur: true },
      { v: "v2.2.0", desc: "新增行业标签清洗", date: "2026-04-09" },
    ],
  },
];

const SHELF_FILTER_OPTIONS: Array<{ label: string; value: AgentShelfFilter }> = [
  { label: "全部", value: "all" },
  { label: "企业自研", value: "enterprise" },
  { label: "FrontisAI发布", value: "platform" },
  { label: "我的", value: "mine" },
];

const BUSINESS_LINE_OPTIONS: Array<{ label: string; value: BusinessLineFilter }> = [
  { label: "全部业务领域", value: "all" },
  { label: "通用", value: "general" },
  { label: "生产", value: "production" },
  { label: "销售", value: "sales" },
  { label: "供应链", value: "supplyChain" },
];

const DOMAIN_BUSINESS_LINE_MAP: Record<string, Exclude<BusinessLineFilter, "all">> = {
  sales: "sales",
  delivery: "production",
  procurement: "supplyChain",
  management: "general",
};

const BUSINESS_LINE_LABEL_MAP: Record<Exclude<BusinessLineFilter, "all">, string> = {
  general: "通用",
  production: "生产",
  sales: "销售",
  supplyChain: "供应链",
};

const getBusinessLineValue = (domain: string): Exclude<BusinessLineFilter, "all"> =>
  DOMAIN_BUSINESS_LINE_MAP[domain] ?? "general";

const getBusinessLineLabel = (domain: string): string =>
  BUSINESS_LINE_LABEL_MAP[getBusinessLineValue(domain)];

const isOwnedByCurrentUser = (agent: AgentItem, currentEmployeeName: string): boolean =>
  agent.ownerName === currentEmployeeName && agent.sourceType === "enterprise";

const getSourceLabel = (agent: AgentItem): string =>
  agent.sourceType === "platform" ? "FrontisAI发布" : "企业自研";

const getSourceDescription = (agent: AgentItem): string =>
  agent.sourceType === "platform" ? "FrontisAI发布 AI专家" : "企业自研 AI专家";

const getActionLabel = (isAdded: boolean): string => {
  return isAdded ? "已添加" : "添加到工作台";
};

const getActionToneClassName = (agent: AgentItem, isAdded: boolean): string => {
  if (isAdded) {
    return styles.cardActionButton;
  }

  return `${styles.cardActionButton} ${styles.cardActionButtonPrimary}`;
};

const getDetailActionToneClassName = (agent: AgentItem, isAdded: boolean): string => {
  if (isAdded) {
    return styles.detailSecondaryButton;
  }

  return `${styles.detailPrimaryButton} ${styles.detailPrimaryButtonDark}`;
};

const getAgentAvatarSeed = (agentId: number): string =>
  AGENT_AVATAR_SEEDS[(agentId - 1) % AGENT_AVATAR_SEEDS.length];

const formatSubmittedAt = (): string => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = `${currentDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${currentDate.getDate()}`.padStart(2, "0");
  const hours = `${currentDate.getHours()}`.padStart(2, "0");
  const minutes = `${currentDate.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const buildShelfApplicationId = (agentId: number, tenantId?: string): string =>
  `ops-agent-square-${tenantId ?? "default"}-${agentId}`;

/**
 * AI 专家广场视图，统一承接企业自研与平台投放专家的浏览和添加。
 */
export const FdeAgentStoreView = ({
  onNavigateToAgentDev,
}: FdeAgentStoreViewProps): JSX.Element => {
  const { activeIdentity, session } = useMockAuth();
  const [shelfFilter, setShelfFilter] = useState<AgentShelfFilter>("all");
  const [businessLineFilter, setBusinessLineFilter] = useState<BusinessLineFilter>("all");
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null);
  const [addedAgentIds, setAddedAgentIds] = useState<number[]>([]);
  const [commodityApplications, setCommodityApplications] = useState<OperationsAgentSubmission[]>(
    () => loadEnterpriseCommodityApplications(),
  );
  const [shelfApplicationEditor, setShelfApplicationEditor] = useState<ShelfApplicationEditorState>(
    {
      open: false,
      name: "",
      reason: "",
    },
  );
  const currentEmployeeName = activeIdentity?.subjectName ?? session?.name ?? "";

  const filteredAgents = useMemo(
    () =>
      AGENTS.filter(agent => {
        if (agent.scope === "personal" && !isOwnedByCurrentUser(agent, currentEmployeeName)) {
          return false;
        }

        if (shelfFilter === "enterprise" && agent.sourceType !== "enterprise") {
          return false;
        }

        if (shelfFilter === "platform" && agent.sourceType !== "platform") {
          return false;
        }

        if (shelfFilter === "mine" && !isOwnedByCurrentUser(agent, currentEmployeeName)) {
          return false;
        }

        if (
          businessLineFilter !== "all" &&
          getBusinessLineValue(agent.domain) !== businessLineFilter
        ) {
          return false;
        }

        return true;
      }),
    [businessLineFilter, currentEmployeeName, shelfFilter],
  );

  const selectedAgentAdded = useMemo(
    () => (selectedAgent ? addedAgentIds.includes(selectedAgent.id) : false),
    [addedAgentIds, selectedAgent],
  );

  const activeTenantHasFdeAccess = useMemo((): boolean => {
    const currentTenantId = activeIdentity?.tenantId;

    if (!currentTenantId) {
      return false;
    }

    const currentTenant = (loadStoredOperationsTenants() ?? OPERATIONS_INITIAL_TENANTS).find(
      item => item.id === currentTenantId,
    );

    return currentTenant?.hasFdeAccess ?? false;
  }, [activeIdentity?.tenantId]);

  const selectedAgentSubmission = useMemo((): OperationsAgentSubmission | null => {
    if (!selectedAgent) {
      return null;
    }

    const submissionId = buildShelfApplicationId(selectedAgent.id, activeIdentity?.tenantId);

    return commodityApplications.find(item => item.id === submissionId) ?? null;
  }, [activeIdentity?.tenantId, commodityApplications, selectedAgent]);

  const canApplyShelf = useMemo(
    () =>
      Boolean(
        selectedAgent &&
          selectedAgent.sourceType === "enterprise" &&
          selectedAgent.ownerName === currentEmployeeName &&
          activeTenantHasFdeAccess,
      ),
    [activeTenantHasFdeAccess, currentEmployeeName, selectedAgent],
  );

  const handleOpenDetail = useCallback((agent: AgentItem): void => {
    setCommodityApplications(loadEnterpriseCommodityApplications());
    setSelectedAgent(agent);
  }, []);

  const handleCloseDetail = useCallback((): void => {
    setSelectedAgent(null);
  }, []);

  const handleCloseShelfApplication = useCallback((): void => {
    setShelfApplicationEditor({
      open: false,
      name: "",
      reason: "",
    });
  }, []);

  const handleOpenShelfApplication = useCallback((): void => {
    if (!selectedAgent) {
      return;
    }

    setShelfApplicationEditor({
      open: true,
      name: selectedAgent.name,
      reason: selectedAgentSubmission?.submitReason ?? "",
    });
  }, [selectedAgent, selectedAgentSubmission?.submitReason]);

  const handleSubmitShelfApplication = useCallback((): void => {
    if (!selectedAgent || !activeIdentity?.tenantName) {
      return;
    }

    const applicationName = shelfApplicationEditor.name.trim();
    const applicationReason = shelfApplicationEditor.reason.trim();

    if (!applicationName || !applicationReason) {
      message.warning("请先补齐上架名称和申请理由。");
      return;
    }

    const submissionId = buildShelfApplicationId(selectedAgent.id, activeIdentity.tenantId);
    const nextApplications = loadEnterpriseCommodityApplications();
    const nextSubmission: OperationsAgentSubmission = {
      id: submissionId,
      name: applicationName,
      version: selectedAgent.version,
      submitter: `${currentEmployeeName} - ${activeIdentity.tenantName}`,
      submittedAt: formatSubmittedAt(),
      status: "pending",
      submissionType: "squarePublish",
      currentScopeLabel:
        selectedAgent.scope === "public"
          ? "企业公开"
          : selectedAgent.scope === "team"
            ? "团队共享"
            : "仅自己",
      submitReason: applicationReason,
      description: selectedAgent.desc,
      rejectReason: undefined,
      lastReviewedAt: undefined,
    };
    const existingIndex = nextApplications.findIndex(item => item.id === submissionId);

    if (existingIndex >= 0) {
      nextApplications[existingIndex] = nextSubmission;
    } else {
      nextApplications.unshift(nextSubmission);
    }

    saveEnterpriseCommodityApplications(nextApplications);
    setCommodityApplications(nextApplications);
    setShelfApplicationEditor({
      open: false,
      name: "",
      reason: "",
    });
    message.success("上架申请已提交，等待运营审批。");
  }, [
    activeIdentity?.tenantId,
    activeIdentity?.tenantName,
    currentEmployeeName,
    selectedAgent,
    shelfApplicationEditor,
  ]);

  const handleUseAgent = useCallback(
    (agent: AgentItem): void => {
      if (addedAgentIds.includes(agent.id)) {
        message.info(`「${agent.name}」已经在你的工作台中。`);
        return;
      }

      setAddedAgentIds(currentIds => [...currentIds, agent.id]);
      message.success(`已将「${agent.name}」添加到工作台。`);
    },
    [addedAgentIds],
  );

  const detailContent = useMemo((): JSX.Element | null => {
    if (!selectedAgent) {
      return null;
    }

    return (
      <div className={styles.detailPaneBody}>
        <section className={styles.detailBlock}>
          <h3 className={styles.detailBlockTitle}>{selectedAgent.name}</h3>
          <div className={styles.detailBlockDivider} />
          <div className={styles.detailPlaceholderCard}>
            <p>{AGENT_DETAIL_PLACEHOLDER_TEXT}</p>
          </div>
        </section>
      </div>
    );
  }, [selectedAgent]);

  return (
    <div className={styles.root}>
      <div className={styles.toolbarCard}>
        <div className={styles.filterGroup}>
          <Select
            className={styles.filterSelect}
            options={SHELF_FILTER_OPTIONS}
            popupMatchSelectWidth={false}
            value={shelfFilter}
            onChange={value => setShelfFilter(value)}
          />
          <Select
            className={styles.filterSelect}
            options={BUSINESS_LINE_OPTIONS}
            popupMatchSelectWidth={false}
            value={businessLineFilter}
            onChange={value => setBusinessLineFilter(value)}
          />
        </div>

        <Button className={styles.createButton} type="primary" onClick={onNavigateToAgentDev}>
          <PlusOutlined />
          创建Agent
        </Button>
      </div>

      {filteredAgents.length ? (
        <div className={styles.agentGrid}>
          {filteredAgents.map(agent => {
            const isAdded = addedAgentIds.includes(agent.id);

            return (
              <article key={agent.id} className={styles.agentCard}>
                <button
                  type="button"
                  className={styles.cardPreviewButton}
                  onClick={() => handleOpenDetail(agent)}
                >
                  <div
                    className={styles.visualPanel}
                    style={{
                      background: DOMAIN_TONE_MAP[agent.domain] ?? DOMAIN_TONE_MAP.management,
                    }}
                  >
                    <span className={styles.visibilityBadge}>{getSourceLabel(agent)}</span>
                    <div className={styles.visualGlow} />
                    <img
                      alt={agent.name}
                      className={styles.agentPortrait}
                      src={getAvatarUrl(getAgentAvatarSeed(agent.id))}
                    />
                  </div>

                    <div className={styles.cardBody}>
                      <div className={styles.cardTitleRow}>
                        <h3 className={styles.cardTitle}>{agent.name}</h3>
                        <div className={styles.cardVersionMeta}>
                          <span className={styles.versionBadge}>{agent.version}</span>
                        </div>
                      </div>

                    <div className={styles.badgeRow}>
                      <span className={`${styles.miniBadge} ${styles.domainBadge}`}>
                        {getBusinessLineLabel(agent.domain)}
                      </span>
                    </div>

                    <p className={styles.agentDescription}>{agent.desc}</p>
                    <div className={styles.cardDeliveryInfo}>
                      <strong>{agent.ownerName}</strong>
                      <span>{getSourceDescription(agent)}</span>
                    </div>
                  </div>
                </button>

                <div className={styles.cardFooter}>
                  <Button
                    className={getActionToneClassName(agent, isAdded)}
                    type="default"
                    onClick={() => handleUseAgent(agent)}
                  >
                    {getActionLabel(isAdded)}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Empty description="当前筛选条件下暂无可用 AI专家。" />
        </div>
      )}

      <Modal
        className={styles.detailModal}
        wrapClassName={styles.detailModalWrap}
        footer={null}
        open={Boolean(selectedAgent)}
        title={
          <span className={styles.detailModalTitle}>{selectedAgent?.name ?? "AI专家详情"}</span>
        }
        width={680}
        onCancel={handleCloseDetail}
        destroyOnHidden
      >
        {selectedAgent ? (
          <div className={styles.detailShell}>
            <div className={styles.detailScrollArea}>{detailContent}</div>

            <div className={styles.detailActionBar}>
              <div className={styles.detailActionButtons}>
                {canApplyShelf ? (
                  <Button
                    className={styles.detailSecondaryButton}
                    disabled={
                      selectedAgentSubmission?.status === "pending" ||
                      selectedAgentSubmission?.status === "approved"
                    }
                    onClick={handleOpenShelfApplication}
                  >
                    {selectedAgentSubmission?.status === "approved"
                      ? "已通过上架审批"
                      : selectedAgentSubmission?.status === "pending"
                        ? "待上架审批"
                        : selectedAgentSubmission?.status === "rejected"
                          ? "重新申请上架"
                          : "申请上架"}
                  </Button>
                ) : null}
                <Button className={styles.detailCloseButton} onClick={handleCloseDetail}>
                  关闭
                </Button>
                <Button
                  className={getDetailActionToneClassName(selectedAgent, selectedAgentAdded)}
                  onClick={() => handleUseAgent(selectedAgent)}
                >
                  {getActionLabel(selectedAgentAdded)}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        className={styles.shelfApplicationModal}
        wrapClassName={styles.shelfApplicationModalWrap}
        footer={null}
        open={shelfApplicationEditor.open}
        title={<span className={styles.shelfApplicationModalTitle}>申请上架</span>}
        width={640}
        onCancel={handleCloseShelfApplication}
        destroyOnHidden
      >
        <div className={styles.shelfApplicationBody}>
          <div className={styles.shelfApplicationIntro}>
            <div className={styles.shelfApplicationIntroBadge}>平台审核</div>
            <p className={styles.shelfApplicationIntroText}>
              提交后将进入平台侧审核，审核通过后可扩大当前 AI专家 的可见范围，面向更多租户展示和使用。
            </p>
          </div>

          <div className={styles.shelfApplicationForm}>
            <div className={styles.shelfApplicationField}>
              <label
                className={styles.shelfApplicationLabel}
                htmlFor={SHELF_APPLICATION_NAME_FIELD_ID}
              >
                上架名称
                <span className={styles.shelfApplicationRequired}>*</span>
              </label>
              <Input
                id={SHELF_APPLICATION_NAME_FIELD_ID}
                className={styles.shelfApplicationInput}
                value={shelfApplicationEditor.name}
                placeholder="请输入上架名称"
                onChange={event =>
                  setShelfApplicationEditor(currentState => ({
                    ...currentState,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className={`${styles.shelfApplicationField} ${styles.shelfApplicationFieldFull}`}>
              <label
                className={styles.shelfApplicationLabel}
                htmlFor={SHELF_APPLICATION_REASON_FIELD_ID}
              >
                申请理由
                <span className={styles.shelfApplicationRequired}>*</span>
              </label>
              <Input.TextArea
                id={SHELF_APPLICATION_REASON_FIELD_ID}
                className={styles.shelfApplicationTextarea}
                rows={5}
                value={shelfApplicationEditor.reason}
                placeholder="请说明该 AI专家 的适用场景、稳定性表现，以及为什么适合扩大到更多租户可见"
                onChange={event =>
                  setShelfApplicationEditor(currentState => ({
                    ...currentState,
                    reason: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className={styles.shelfApplicationActionBar}>
            <Button
              className={styles.shelfApplicationCancelButton}
              onClick={handleCloseShelfApplication}
            >
              取消
            </Button>
            <Button
              className={styles.shelfApplicationSubmitButton}
              onClick={handleSubmitShelfApplication}
            >
              提交申请
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
