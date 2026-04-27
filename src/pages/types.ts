import type { Block } from "@/types/block";
import type { ReactNode } from "react";

/**
 * FrontisAI Web 端角色类型。
 */
export type FrontisWebRole = "employee" | "admin";

/**
 * FrontisAI Web 端一级导航标识。
 */
export type FrontisWebTabKey =
  | "overview"
  | "points"
  | "dashboard"
  | "dialogue"
  | "group"
  | "automation"
  | "store"
  | "devices"
  | "models"
  | "access"
  | "organization"
  | "roleManagement"
  | "notifications";

/**
 * 工作站类型。
 */
export type WorkspaceType = "cloud" | "local" | "edge";

/**
 * 通用状态色值枚举。
 */
export type StatusTone =
  | "online"
  | "busy"
  | "idle"
  | "pending"
  | "paused"
  | "draft"
  | "offline"
  | "error";

/**
 * 用户侧 AI 专家状态。
 */
export type EmployeeStatus = "online" | "running" | "idle" | "exception" | "offline";

/**
 * AI 员工连接模式。
 */
export type ConnectionMode = "cloud" | "local";
export type EmployeeSource = "coworker" | "openclaw";
export type EmployeeVisibility = "all" | "bound";
export type OrganizationSubjectType = "company" | "department" | "user";
/**
 * AI 专家的配置方式。
 * `device` 表示先绑定设备，再按设备分配可用权限；`permission` 表示直接分配可用权限。
 */
export type ExpertSetupMode = "device" | "permission";

/**
 * AI 专家组织范围授权主体。
 */
export interface AccessScopeSubject {
  subjectId: string;
  subjectName: string;
  subjectType: OrganizationSubjectType;
}

/**
 * 企业组织部门节点。
 */
export interface OrganizationDepartmentItem {
  id: string;
  leaderUserId?: string;
  name: string;
  parentId: string | null;
}

/**
 * 企业组织树节点。
 */
export interface OrganizationTreeNode {
  children?: OrganizationTreeNode[];
  id: string;
  name: string;
  type: OrganizationSubjectType;
}

/**
 * 对话消息角色。
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * 自动化任务状态。
 */
export type AutomationStatus = "active" | "paused" | "draft";

/**
 * FrontisAI Web 端一级导航项定义。
 */
export interface FrontisWebTabItem {
  key: FrontisWebTabKey;
  label: string;
  labels?: Partial<Record<FrontisWebRole, string>>;
  icon: ReactNode;
  roles: FrontisWebRole[];
}

/**
 * 工作站信息。
 */
export interface WorkspaceItem {
  id: string;
  name: string;
  type: WorkspaceType;
  status: StatusTone;
  region: string;
  summary: string;
  runtimeHint: string;
  activationCode?: string;
  activationExpiresAt?: string;
  activationValidDays?: number;
  activationHint?: string;
}

/**
 * AI 员工信息。
 */
export interface EmployeeItem {
  id: string;
  name: string;
  avatarUrl?: string;
  role: string;
  /** 是否为 AI 专家团工作台入口。 */
  isExpertTeam?: boolean;
  /** 专家团唯一标识。 */
  expertTeamId?: string;
  /** 专家团成员 AI 专家 id 列表。 */
  expertTeamMemberIds?: string[];
  /** 专家团默认主专家 id。 */
  expertTeamPrimaryMemberId?: string;
  /** 可见端范围。 */
  portalRoles: FrontisWebRole[];
  status: EmployeeStatus;
  workspaceId: string;
  connectionMode: ConnectionMode;
  model: string;
  summary: string;
  lastAction: string;
  source: EmployeeSource;
  visibility: EmployeeVisibility;
  /** AI 专家开发者姓名，原型中用于后台资产归属展示。 */
  developerName?: string;
  subAgentModel?: string;
  agentId: string;
  runtimeAgentId: string;
  accessScopeSubjects: AccessScopeSubject[];
  boundMembers: string[];
  welcomeMessage: string;
  systemPrompt: string;
  skills?: string[];
  /** 管理后台 mock 用的配置要求，不直接对用户展示。 */
  expertSetupMode?: ExpertSetupMode;
}

/**
 * 附件信息。
 */
export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  sizeLabel: string;
  mimeType: string;
  url?: string;
}

/**
 * 聊天消息。
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  author: string;
  content: string;
  timeLabel: string;
  attachments?: AttachmentItem[];
  blocks?: Block[];
  /** 当前轮回复底部展示的猜你想问列表。 */
  followupSuggestions?: string[];
}

/**
 * 单聊会话信息。
 */
export interface DialogueSessionItem {
  id: string;
  employeeId: string;
  title: string;
  preview: string;
  updatedAt: string;
  messages: ChatMessage[];
}

/**
 * MetaAgent 单线程中的可回溯记忆片段。
 */
export interface MetaAgentWorkTrajectoryDeliverableItem {
  id: string;
  fileName: string;
  metaLabel: string;
  anchorBlockId?: string;
}

/**
 * MetaAgent 每日工作轨迹中的任务项。
 */
export interface MetaAgentWorkTrajectoryTaskItem {
  id: string;
  title: string;
  agentName: string;
  status: "running" | "completed";
  metaLabel: string;
  anchorBlockId: string;
}

/**
 * MetaAgent 单线程中按日自动生成的工作轨迹。
 */
export interface MetaAgentWorkTrajectoryItem {
  id: string;
  title: string;
  promptPreview: string;
  resultPreview: string;
  anchorBlockId: string;
  occurredAt: string;
  displayTimeLabel: string;
  participantNames: string[];
  deliverables: MetaAgentWorkTrajectoryDeliverableItem[];
  tasks: MetaAgentWorkTrajectoryTaskItem[];
}

export type DialogueGeneratedPanelStatus = "running" | "success";
export type DialogueGeneratedPanelTone = "neutral" | "positive" | "warning" | "danger" | "accent";

export interface DialogueGeneratedMetricItem {
  label: string;
  value: string;
  hint?: string;
  delta?: string;
  tone?: DialogueGeneratedPanelTone;
}

export interface DialogueGeneratedTagItem {
  label: string;
  tone?: DialogueGeneratedPanelTone;
}

export interface DialogueGeneratedActionItem {
  id: string;
  label: string;
  tone?: DialogueGeneratedPanelTone;
}

export interface DialogueSequenceCardItem {
  id: string;
  name: string;
  peopleLabel: string;
  roleLabel: string;
  score: string;
  trend: string;
  benchmarkLabel: string;
  alertLabel: string;
  focusTags: DialogueGeneratedTagItem[];
}

export interface DialogueDimensionScoreItem {
  id: string;
  label: string;
  weightLabel: string;
  score: string;
  delta: string;
  tone?: DialogueGeneratedPanelTone;
}

export interface DialogueRedlineStatusItem {
  id: string;
  label: string;
  description: string;
  statusLabel: string;
  tone?: DialogueGeneratedPanelTone;
}

export interface DialogueEvidenceItem {
  id: string;
  source: string;
  date: string;
  content: string;
}

export interface DialogueWarningItem {
  id: string;
  name: string;
  roleLabel: string;
  sequenceLabel: string;
  reason: string;
  dimensionLabel: string;
  score: string;
  levelLabel: string;
  dateLabel?: string;
  suggestion: string;
  tone?: DialogueGeneratedPanelTone;
  actions: DialogueGeneratedActionItem[];
}

export interface DialogueBenchmarkPersonItem {
  id: string;
  rankLabel: string;
  name: string;
  roleLabel: string;
  levelLabel: string;
  score: string;
  delta: string;
  story: string;
  avatarLabel?: string;
  dateLabel?: string;
  tone?: DialogueGeneratedPanelTone;
}

export interface DialogueRankZoneItem {
  id: string;
  title: string;
  countLabel: string;
  tone?: DialogueGeneratedPanelTone;
  collapsed?: boolean;
  members: DialogueBenchmarkPersonItem[];
}

export interface DialogueFocusPersonItem {
  id: string;
  name: string;
  summary: string;
  tone?: DialogueGeneratedPanelTone;
}

export interface DialogueDispatchRecipientItem {
  id: string;
  name: string;
  roleLabel: string;
  channelLabel: string;
  statusLabel: string;
  summary: string;
  note?: string;
  tone?: DialogueGeneratedPanelTone;
}

export interface DialogueDispatchConversationItem {
  id: string;
  actorLabel: string;
  summary: string;
  detail?: string;
  avatarLabel?: string;
  direction?: "incoming" | "outgoing" | "system";
  timeLabel?: string;
  statusLabel?: string;
  tagLabel?: string;
  edited?: boolean;
  tone?: DialogueGeneratedPanelTone;
}

interface DialogueGeneratedPanelBase {
  id: string;
  kind:
    | "sequenceOverview"
    | "employeeAssess"
    | "redlineDetect"
    | "benchmarkFind"
    | "scoreRank"
    | "ceoSynthesis"
    | "dispatchExecution";
  title: string;
  subtitle: string;
  skillName: string;
  updatedAt: string;
  status: DialogueGeneratedPanelStatus;
}

export interface DialogueSequenceOverviewPanelState extends DialogueGeneratedPanelBase {
  kind: "sequenceOverview";
  payload: {
    summaryMetrics: DialogueGeneratedMetricItem[];
    sortLabel: string;
    sequenceCards: DialogueSequenceCardItem[];
    insight: string;
  };
}

export interface DialogueEmployeeAssessPanelState extends DialogueGeneratedPanelBase {
  kind: "employeeAssess";
  payload: {
    employeeName: string;
    employeeRole: string;
    sequenceLabel: string;
    score: string;
    trend: string;
    zoneLabel: string;
    dimensionScores: DialogueDimensionScoreItem[];
    redlineStatuses: DialogueRedlineStatusItem[];
    evidences: DialogueEvidenceItem[];
    actionItems: string[];
  };
}

export interface DialogueRedlineDetectPanelState extends DialogueGeneratedPanelBase {
  kind: "redlineDetect";
  payload: {
    alertSummary: string;
    warnings: DialogueWarningItem[];
  };
}

export interface DialogueBenchmarkFindPanelState extends DialogueGeneratedPanelBase {
  kind: "benchmarkFind";
  payload: {
    viewMode: "ranking" | "achievement";
    sequenceLabel: string;
    benchmarkPeople: DialogueBenchmarkPersonItem[];
    middleZoneCountLabel: string;
    attentionPeople: DialogueBenchmarkPersonItem[];
    actionItems: string[];
  };
}

export interface DialogueScoreRankPanelState extends DialogueGeneratedPanelBase {
  kind: "scoreRank";
  payload: {
    viewMode: "overview" | "fullList";
    sequenceLabel: string;
    peopleCountLabel: string;
    averageScoreLabel: string;
    dimensions: DialogueGeneratedTagItem[];
    benchmarkLineLabel: string;
    attentionLineLabel: string;
    zones: DialogueRankZoneItem[];
  };
}

export interface DialogueCeoSynthesisPanelState extends DialogueGeneratedPanelBase {
  kind: "ceoSynthesis";
  payload: {
    summaryMetrics: DialogueGeneratedMetricItem[];
    focusAreas: DialogueFocusPersonItem[];
    keyPerson: DialogueBenchmarkPersonItem;
    risks: DialogueFocusPersonItem[];
    actionItems: string[];
    closingLine: string;
    promptSuggestions: string[];
    greetingLines: string[];
    questionSuggestions: string[];
    inputPlaceholder: string;
  };
}

export interface DialogueDispatchExecutionPanelState extends DialogueGeneratedPanelBase {
  kind: "dispatchExecution";
  payload: {
    summaryMetrics: DialogueGeneratedMetricItem[];
    dispatchLabel: string;
    recipients: DialogueDispatchRecipientItem[];
    conversationItems: DialogueDispatchConversationItem[];
    messagePreview: string;
    actionItems: string[];
  };
}

export type DialogueGeneratedPanelState =
  | DialogueSequenceOverviewPanelState
  | DialogueEmployeeAssessPanelState
  | DialogueRedlineDetectPanelState
  | DialogueBenchmarkFindPanelState
  | DialogueScoreRankPanelState
  | DialogueCeoSynthesisPanelState
  | DialogueDispatchExecutionPanelState;

/**
 * 对话结果卡片项。
 */
export interface DialogueGeneratedResultItem {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  badge?: string;
  panel: DialogueGeneratedPanelState;
}

/**
 * 群聊频道信息。
 */
export interface ChannelItem {
  id: string;
  name: string;
  spaceName: string;
  summary: string;
  status: StatusTone;
  members: string[];
}

/**
 * 技能信息。
 */
export interface SkillItem {
  id: string;
  name: string;
  category: string;
  summary: string;
  installedFor: string[];
  supportAutomation: boolean;
}

/**
 * 自动化任务信息。
 */
export interface AutomationTaskItem {
  id: string;
  title: string;
  employeeId: string;
  scope: string;
  schedule: string;
  status: AutomationStatus;
  lastRun: string;
  summary: string;
}

/**
 * FrontisAI Web 端用户角色。
 */
export type FrontisUserRole = "enterpriseAdmin" | "departmentLead" | "employee";

/**
 * FrontisAI Web 端用户状态。
 */
export type FrontisUserStatus = "active" | "disabled";

/**
 * FrontisAI Web 端用户信息。
 */
export interface FrontisWebUserItem {
  id: string;
  departmentId: string;
  name: string;
  phone: string;
  role: FrontisUserRole;
  status: FrontisUserStatus;
  assignedAgentIds: string[];
  assignedWorkspaceIds?: string[];
  lastActiveAt: string;
  dialogueCount: number;
  tokenUsage: number;
  resultCount: number;
}
