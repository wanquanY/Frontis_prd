import { useCallback, useMemo, useState } from "react";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Input, Modal, Select, message } from "antd";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getAvatarUrl } from "@/pages/utils";
import {
  OPERATIONS_INITIAL_TENANTS,
} from "@/feature/operations/mockData";
import {
  loadStoredOperationsTenants,
} from "@/feature/operations/tenantStorage";
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
type AgentDetailTabKey = "basic" | "skills" | "versions" | "operations";
type AgentShelfFilter = "all" | "public" | "shared" | "mine";
type BusinessLineFilter = "all" | "general" | "production" | "sales" | "supplyChain";

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
  source: string;
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

const AGENT_FRAMEWORK_NAME = "Syngent";
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
    source: "杨万泉",
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
    source: "李婷",
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
    source: "王晨",
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
    source: "赵六",
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
    source: "杨万泉",
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
    source: "周可",
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
    source: "赵六",
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
];

const SHELF_FILTER_OPTIONS: Array<{ label: string; value: AgentShelfFilter }> = [
  { label: "全部", value: "all" },
  { label: "公开", value: "public" },
  { label: "团队共享", value: "shared" },
  { label: "我的", value: "mine" },
];

const BUSINESS_LINE_OPTIONS: Array<{ label: string; value: BusinessLineFilter }> = [
  { label: "全部业务领域", value: "all" },
  { label: "通用", value: "general" },
  { label: "生产", value: "production" },
  { label: "销售", value: "sales" },
  { label: "供应链", value: "supplyChain" },
];

const DETAIL_TAB_OPTIONS: Array<{ key: AgentDetailTabKey; label: string }> = [
  { key: "basic", label: "基础信息" },
  { key: "skills", label: "关联Skill" },
  { key: "versions", label: "版本信息" },
  { key: "operations", label: "运营数据" },
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

const getScopeLabel = (scope: AgentScope): string => {
  if (scope === "team") {
    return "团队共享";
  }

  if (scope === "personal") {
    return "我的";
  }

  return "公开";
};

const getDetailScopeLabel = (agent: AgentItem): string => {
  if (agent.scope === "team") {
    return agent.sharedTargetLabel ?? "指定团队";
  }

  if (agent.scope === "personal") {
    return "仅自己可见";
  }

  return "所有租户可见";
};

const isOwnedByCurrentUser = (agent: AgentItem, currentEmployeeName: string): boolean =>
  agent.source === currentEmployeeName;

const getUsageRuleLabel = (agent: AgentItem): string => {
  if (agent.scope === "personal") {
    return "仅开发者自己使用";
  }

  if (agent.scope === "team") {
    return "被共享成员可直接添加使用";
  }

  return "所有用户均可直接添加使用";
};

const getActionLabel = (
  agent: AgentItem,
  isAdded: boolean,
  currentEmployeeName: string,
): string => {
  if (agent.scope === "personal" && isOwnedByCurrentUser(agent, currentEmployeeName)) {
    return "进入开发";
  }

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
 * AI 专家广场视图，当前按“发布后直接使用”的最小范围设计。
 */
export const FdeAgentStoreView = ({
  onNavigateToAgentDev,
  viewerRole = "employee",
}: FdeAgentStoreViewProps): JSX.Element => {
  const { activeIdentity, session } = useMockAuth();
  const [shelfFilter, setShelfFilter] = useState<AgentShelfFilter>("all");
  const [businessLineFilter, setBusinessLineFilter] = useState<BusinessLineFilter>("all");
  const [detailTab, setDetailTab] = useState<AgentDetailTabKey>("basic");
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null);
  const [addedAgentIds, setAddedAgentIds] = useState<number[]>([]);
  const [commodityApplications, setCommodityApplications] = useState<OperationsAgentSubmission[]>(
    () => loadEnterpriseCommodityApplications(),
  );
  const [shelfApplicationEditor, setShelfApplicationEditor] = useState<ShelfApplicationEditorState>({
    open: false,
    name: "",
    reason: "",
  });
  const currentEmployeeName = activeIdentity?.subjectName ?? session?.name ?? "";

  const filteredAgents = useMemo(
    () =>
      AGENTS.filter(agent => {
        if (agent.scope === "personal" && !isOwnedByCurrentUser(agent, currentEmployeeName)) {
          return false;
        }

        if (shelfFilter === "public" && agent.scope !== "public") {
          return false;
        }

        if (shelfFilter === "shared" && agent.scope !== "team") {
          return false;
        }

        if (
          shelfFilter === "mine" &&
          !isOwnedByCurrentUser(agent, currentEmployeeName)
        ) {
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
          selectedAgent.source === currentEmployeeName &&
          activeTenantHasFdeAccess,
      ),
    [activeTenantHasFdeAccess, currentEmployeeName, selectedAgent],
  );

  const handleOpenDetail = useCallback((agent: AgentItem): void => {
    setCommodityApplications(loadEnterpriseCommodityApplications());
    setSelectedAgent(agent);
    setDetailTab("basic");
  }, []);

  const handleCloseDetail = useCallback((): void => {
    setSelectedAgent(null);
    setDetailTab("basic");
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
      currentScopeLabel: getScopeLabel(selectedAgent.scope),
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
      if (agent.scope === "personal" && isOwnedByCurrentUser(agent, currentEmployeeName)) {
        if (onNavigateToAgentDev) {
          onNavigateToAgentDev();
        } else {
          message.info("请前往开发与进化继续完善这个 AI专家。");
        }
        return;
      }

      if (addedAgentIds.includes(agent.id)) {
        message.info(`「${agent.name}」已经在你的工作台中。`);
        return;
      }

      setAddedAgentIds(currentIds => [...currentIds, agent.id]);
      message.success(`已将「${agent.name}」添加到工作台。`);
    },
    [addedAgentIds, currentEmployeeName, onNavigateToAgentDev],
  );

  const detailContent = useMemo((): JSX.Element | null => {
    if (!selectedAgent) {
      return null;
    }

    if (detailTab === "skills") {
      return (
        <div className={styles.detailPaneBody}>
          <section className={styles.detailBlock}>
            <h3 className={styles.detailBlockTitle}>关联Skill</h3>
            <div className={styles.detailBlockDivider} />
            <div className={styles.detailSkillGrid}>
              {selectedAgent.skills.map(skill => (
                <article key={`${selectedAgent.id}-${skill.name}`} className={styles.detailSkillCard}>
                  <span className={styles.detailSkillTypeTag}>{skill.type}</span>
                  <h4 className={styles.detailSkillCardTitle}>{skill.name}</h4>
                  <p className={styles.detailSkillCardText}>
                    用于支撑 {selectedAgent.scene} 场景下的核心执行能力。
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (detailTab === "versions") {
      return (
        <div className={styles.detailPaneBody}>
          <section className={styles.detailBlock}>
            <h3 className={styles.detailBlockTitle}>版本信息</h3>
            <div className={styles.detailBlockDivider} />
            <div className={styles.versionList}>
              {selectedAgent.versions.map(version => (
                <div key={`${selectedAgent.id}-${version.v}`} className={styles.versionItem}>
                  <div>
                    <strong>{version.v}</strong>
                    <p>{version.desc}</p>
                  </div>
                  <div className={styles.versionMeta}>
                    {version.cur ? (
                      <span className={styles.detailMetaChip}>当前版本</span>
                    ) : null}
                    <span>{version.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (detailTab === "operations") {
      return (
        <div className={styles.detailPaneBody}>
          <section className={styles.detailBlock}>
            <h3 className={styles.detailBlockTitle}>运营数据</h3>
            <div className={styles.detailBlockDivider} />
            <div className={styles.detailOperationGrid}>
              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>当前状态</span>
                <strong className={styles.detailMetricValue}>已发布</strong>
              </div>
              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>添加次数</span>
                <strong className={styles.detailMetricValue}>{selectedAgent.installCount}</strong>
              </div>
              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>活跃用户</span>
                <strong className={styles.detailMetricValue}>{selectedAgent.activeUsers}</strong>
              </div>
              <div className={styles.detailMetricCard}>
                <span className={styles.detailMetricLabel}>评分</span>
                <strong className={styles.detailMetricValue}>{selectedAgent.rating} / 5.0</strong>
              </div>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className={styles.detailPaneBody}>
        <section className={styles.detailBlock}>
          <h3 className={styles.detailBlockTitle}>基础信息</h3>
          <div className={styles.detailBlockDivider} />
          <div className={styles.detailProfileCard}>
            <img
              alt={selectedAgent.name}
              className={styles.detailAvatar}
              src={getAvatarUrl(getAgentAvatarSeed(selectedAgent.id))}
            />
            <div className={styles.detailProfileMain}>
              <div className={styles.detailProfileTitleRow}>
                <h4 className={styles.detailProfileTitle}>{selectedAgent.name}</h4>
                <span className={styles.detailStatusBadge}>已发布</span>
              </div>
              <div className={styles.detailProfileMetaRow}>
                <span>
                  开发者：<strong>{selectedAgent.source}</strong>
                </span>
                <span>
                  发布时间：<strong>{selectedAgent.submitTime.split(" ")[0]}</strong>
                </span>
                <span className={styles.detailScopeRow}>
                  发布范围：
                  <span className={styles.detailMetaChip}>{getScopeLabel(selectedAgent.scope)}</span>
                </span>
              </div>
            </div>
          </div>
          <div className={styles.detailIntroSection}>
            <h4 className={styles.detailSubTitle}>简介</h4>
            <div className={styles.detailIntroCard}>
              <p>{selectedAgent.desc}</p>
            </div>
          </div>
        </section>

        <section className={styles.detailBlock}>
          <h3 className={styles.detailBlockTitle}>发布与使用</h3>
          <div className={styles.detailBlockDivider} />
          <div className={styles.detailKeyValueGrid}>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>发布方式</span>
              <strong className={styles.detailKeyValueValue}>{getScopeLabel(selectedAgent.scope)}</strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>可见范围</span>
              <strong className={styles.detailKeyValueValue}>{getDetailScopeLabel(selectedAgent)}</strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>当前角色</span>
              <strong className={styles.detailKeyValueValue}>
                {viewerRole === "admin" ? "管理员" : "普通员工"}
              </strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>使用方式</span>
              <strong className={styles.detailKeyValueValue}>{getUsageRuleLabel(selectedAgent)}</strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>当前状态</span>
              <strong className={styles.detailKeyValueValue}>
                {selectedAgent.scope === "personal" &&
                isOwnedByCurrentUser(selectedAgent, currentEmployeeName)
                  ? "仅自己可用"
                  : selectedAgentAdded
                    ? "已添加到工作台"
                    : "可直接添加"}
              </strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>最近更新</span>
              <strong className={styles.detailKeyValueValue}>{selectedAgent.updatedAt}</strong>
            </div>
            {selectedAgent.source === currentEmployeeName ? (
              <div className={styles.detailKeyValueItem}>
                <span className={styles.detailKeyValueLabel}>上架申请</span>
                <strong className={styles.detailKeyValueValue}>
                  {activeTenantHasFdeAccess
                    ? selectedAgentSubmission?.status === "approved"
                      ? "已通过审批"
                      : selectedAgentSubmission?.status === "pending"
                        ? "待审批"
                        : selectedAgentSubmission?.status === "rejected"
                          ? "已驳回，可重新申请"
                          : "未申请"
                    : "当前租户未开通FDE权限"}
                </strong>
              </div>
            ) : null}
          </div>
        </section>

        <section className={styles.detailBlock}>
          <h3 className={styles.detailBlockTitle}>业务信息</h3>
          <div className={styles.detailBlockDivider} />
          <div className={styles.detailKeyValueGrid}>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>业务领域</span>
              <strong className={styles.detailKeyValueValue}>
                {getBusinessLineLabel(selectedAgent.domain)}
              </strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>业务场景</span>
              <strong className={styles.detailKeyValueValue}>{selectedAgent.scene}</strong>
            </div>
          </div>
        </section>

        <section className={styles.detailBlock}>
          <h3 className={styles.detailBlockTitle}>技术配置</h3>
          <div className={styles.detailBlockDivider} />
          <div className={styles.detailKeyValueGrid}>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>AGENT 框架</span>
              <strong className={styles.detailKeyValueValue}>{AGENT_FRAMEWORK_NAME}</strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>技术形态</span>
              <strong className={styles.detailKeyValueValue}>{selectedAgent.techShape}</strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>绑定模型</span>
              <strong className={styles.detailKeyValueValue}>{selectedAgent.model}</strong>
            </div>
            <div className={styles.detailKeyValueItem}>
              <span className={styles.detailKeyValueLabel}>Runtime 类型</span>
              <strong className={styles.detailKeyValueValue}>{selectedAgent.runtime}</strong>
            </div>
          </div>
        </section>
      </div>
    );
  }, [
    activeTenantHasFdeAccess,
    currentEmployeeName,
    detailTab,
    selectedAgent,
    selectedAgentAdded,
    selectedAgentSubmission,
    viewerRole,
  ]);

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
                      background:
                        DOMAIN_TONE_MAP[agent.domain] ?? DOMAIN_TONE_MAP.management,
                    }}
                  >
                    <span className={styles.visibilityBadge}>{getScopeLabel(agent.scope)}</span>
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
                        <span className={styles.publishBadge}>已发布</span>
                        <span className={styles.versionText}>{agent.version}</span>
                      </div>
                    </div>

                    <div className={styles.badgeRow}>
                      <span className={`${styles.miniBadge} ${styles.domainBadge}`}>
                        {getBusinessLineLabel(agent.domain)}
                      </span>
                      <span className={`${styles.miniBadge} ${styles.scopeBadge}`}>
                        {agent.scope === "team"
                          ? agent.sharedTargetLabel ?? "团队共享"
                          : agent.scope === "personal"
                            ? "个人发布"
                            : "所有人可用"}
                      </span>
                    </div>

                    <p className={styles.agentDescription}>{agent.desc}</p>
                    <div className={styles.cardDeliveryInfo}>
                      <strong>{agent.source}</strong>
                      <span>{getUsageRuleLabel(agent)}</span>
                    </div>
                  </div>
                </button>

                <div className={styles.cardFooter}>
                  <Button
                    className={getActionToneClassName(agent, isAdded)}
                    type="default"
                    onClick={() => handleUseAgent(agent)}
                  >
                    {getActionLabel(agent, isAdded, currentEmployeeName)}
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
        title={<span className={styles.detailModalTitle}>{selectedAgent?.name ?? "AI专家详情"}</span>}
        width={680}
        onCancel={handleCloseDetail}
        destroyOnHidden
      >
        {selectedAgent ? (
          <div className={styles.detailShell}>
            <div className={styles.detailTabBar}>
              {DETAIL_TAB_OPTIONS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={
                    detailTab === item.key
                      ? `${styles.detailTabButton} ${styles.detailTabButtonActive}`
                      : styles.detailTabButton
                  }
                  onClick={() => setDetailTab(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className={styles.detailScrollArea}>{detailContent}</div>

            <div className={styles.detailActionBar}>
              <div className={styles.detailActionButtons}>
                {canApplyShelf ? (
                  <Button
                    className={styles.detailSecondaryButton}
                    disabled={selectedAgentSubmission?.status === "pending" || selectedAgentSubmission?.status === "approved"}
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
                  {getActionLabel(selectedAgent, selectedAgentAdded, currentEmployeeName)}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={shelfApplicationEditor.open}
        title="申请上架"
        onCancel={() =>
          setShelfApplicationEditor({
            open: false,
            name: "",
            reason: "",
          })
        }
        onOk={handleSubmitShelfApplication}
        destroyOnHidden
      >
        <div className={styles.detailKeyValueGrid}>
          <div className={styles.detailKeyValueItem}>
            <span className={styles.detailKeyValueLabel}>上架名称</span>
            <Input
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
          <div className={styles.detailKeyValueItem}>
            <span className={styles.detailKeyValueLabel}>申请理由</span>
            <Input.TextArea
              rows={4}
              value={shelfApplicationEditor.reason}
              placeholder="请输入申请理由"
              onChange={event =>
                setShelfApplicationEditor(currentState => ({
                  ...currentState,
                  reason: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
