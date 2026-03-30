/**
 * FDE 工作台视角。
 */
export type FdeWorkbenchRole = "leader" | "engineer";

/**
 * FDE 工作台一级导航标识。
 */
export type FdeWorkbenchTabKey =
  | "overview"
  | "opportunities"
  | "leads"
  | "delivery"
  | "operations"
  | "feedback"
  | "evolution"
  | "releases";

/**
 * FDE 成员状态。
 */
export type FdeMemberStatus = "online" | "busy" | "offline";

/**
 * 商机阶段。
 */
export type FdeOpportunityStage = "初步沟通" | "产品演示" | "方案推荐" | "商务谈判" | "已成交";

/**
 * 线索工单状态。
 */
export type FdeLeadStatus = "新线索" | "跟进中" | "已转商机" | "已放弃";

/**
 * FDE 任务优先级。
 */
export type FdePriorityLevel = "高" | "中" | "低";

/**
 * 商机风险等级。
 */
export type FdeOpportunityRiskLevel = "低风险" | "关注" | "高风险";

/**
 * 设备部署方式。
 */
export type FdeDeviceMode = "云端设备" | "本地设备" | "混合部署";

/**
 * 交付流程步骤键。
 */
export type FdeDeliveryStepKey =
  | "customerConfirm"
  | "deviceConfig"
  | "agentConfig"
  | "apiTest"
  | "memberInit"
  | "preflight";

/**
 * 交付 blocker 状态。
 */
export type FdeDeliveryBlockerStatus = "待处理" | "处理中" | "已解决";

/**
 * API 联调状态。
 */
export type FdeDeliveryApiStatus = "待联调" | "联调中" | "已完成";

/**
 * 上线验收状态。
 */
export type FdeDeliveryAcceptanceStatus = "待验收" | "验收中" | "已完成";

/**
 * 客户运行健康度。
 */
export type FdeMonitorHealth = "healthy" | "attention" | "risk";

/**
 * 告警等级。
 */
export type FdeAlertSeverity = "高" | "中" | "低";

/**
 * 告警处理状态。
 */
export type FdeAlertStatus = "待确认" | "处理中" | "已关闭";

/**
 * 告警来源。
 */
export type FdeAlertSourceType = "专家" | "接口" | "设备";

/**
 * 监控诊断状态。
 */
export type FdeDiagnosticStatus = "正常" | "关注" | "异常";

/**
 * Agent 进化任务状态。
 */
export type FdeEvolutionTaskStatus =
  | "排队中"
  | "训练中"
  | "已暂停"
  | "待审核"
  | "已驳回"
  | "已完成"
  | "已终止";

/**
 * 进化任务审核结论。
 */
export type FdeEvolutionReviewDecision = "通过" | "驳回";

/**
 * 版本推送状态。
 */
export type FdeReleasePushStatus = "待发布" | "灰度中" | "已暂停" | "已完成" | "已回退";

/**
 * 客户维度发布状态。
 */
export type FdeReleaseCustomerStatus = "待发布" | "灰度中" | "已暂停" | "已完成" | "已回退";

/**
 * FDE 团队成员。
 */
export interface FdeTeamMemberItem {
  id: string;
  name: string;
  title: string;
  role: FdeWorkbenchRole;
  status: FdeMemberStatus;
  focusScenes: string[];
  avatarSeed: string;
}

/**
 * 工作台导航项。
 */
export interface FdeWorkbenchTabItem {
  key: FdeWorkbenchTabKey;
  label: string;
  description: string;
}

/**
 * 工作台目标实体类型。
 */
export type FdeWorkbenchEntityType =
  | "lead"
  | "opportunity"
  | "delivery"
  | "operations"
  | "feedback"
  | "evolution"
  | "release";

/**
 * 工作台待办强调色。
 */
export type FdeWorkbenchTodoTone = "accent" | "warning" | "success";

/**
 * 工作台统一筛选项。
 */
export interface FdeWorkbenchFilterState {
  ownerId: string;
  sceneName: string;
  searchKeyword: string;
  statusLabel: string;
}

/**
 * 工作台跳转目标。
 */
export interface FdeWorkbenchTargetInfo {
  entityId: string;
  entityType: FdeWorkbenchEntityType;
  tabKey: FdeWorkbenchTabKey;
}

/**
 * FDE 工作记录时间线条目。
 */
export interface FdeTimelineItem {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
}

/**
 * 商机条目。
 */
export interface FdeOpportunityItem {
  id: string;
  sourceLeadId: string | null;
  companyName: string;
  contactName: string;
  contactPhone: string;
  scenarioName: string;
  industry: string;
  stage: FdeOpportunityStage;
  amountWan: number;
  winRate: number;
  ownerId: string;
  priority: FdePriorityLevel;
  riskLevel: FdeOpportunityRiskLevel;
  budgetLabel: string;
  nextAction: string;
  nextActionDate: string;
  estimatedSignDate: string;
  source: string;
  summary: string;
  blockers: string[];
  timeline: FdeTimelineItem[];
}

/**
 * 商机跟进信息更新载荷。
 */
export interface FdeOpportunityFollowUpPayload {
  amountWan: number;
  blockers: string[];
  budgetLabel: string;
  estimatedSignDate: string;
  nextAction: string;
  nextActionDate: string;
  riskLevel: FdeOpportunityRiskLevel;
  summary: string;
}

/**
 * 线索工单。
 */
export interface FdeLeadItem {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  interestedScenes: string[];
  source: string;
  createdAt: string;
  status: FdeLeadStatus;
  assignedToId: string | null;
  priority: FdePriorityLevel;
  budgetLabel: string;
  nextFollowUpAt: string;
  lastFollowUpAt: string;
  summary: string;
  remark: string;
  timeline: FdeTimelineItem[];
}

/**
 * 线索工单创建表单。
 */
export interface FdeLeadFormState {
  companyName: string;
  contactName: string;
  phone: string;
  interestedScenes: string[];
  source: string;
  priority: FdePriorityLevel;
  budgetLabel: string;
  nextFollowUpAt: string;
  summary: string;
  remark: string;
  assignedToId: string | null;
}

/**
 * 设备配置详情。
 */
export interface FdeDeviceConfigInfo {
  mode: FdeDeviceMode;
  cloudNodeName: string;
  localDeviceName: string;
  pairingCode: string;
  osOwner: string;
  region: string;
}

/**
 * 交付步骤。
 */
export interface FdeDeliveryStepItem {
  key: FdeDeliveryStepKey;
  label: string;
}

/**
 * 交付 blocker 条目。
 */
export interface FdeDeliveryBlockerItem {
  id: string;
  title: string;
  detail: string;
  dueDate: string;
  ownerId: string;
  status: FdeDeliveryBlockerStatus;
}

/**
 * API 联调记录。
 */
export interface FdeDeliveryApiIntegrationItem {
  id: string;
  name: string;
  note: string;
  status: FdeDeliveryApiStatus;
}

/**
 * 成员初始化进度。
 */
export interface FdeDeliveryMemberInitInfo {
  targetCount: number;
  activatedCount: number;
  trainingCompletedCount: number;
  summary: string;
}

/**
 * 上线验收信息。
 */
export interface FdeDeliveryAcceptanceInfo {
  status: FdeDeliveryAcceptanceStatus;
  acceptedAt: string;
  handoverOwner: string;
  summary: string;
  checklist: string[];
}

/**
 * 交付工单。
 */
export interface FdeDeliveryOrderItem {
  id: string;
  leadId: string | null;
  sourceOpportunityId: string | null;
  customerName: string;
  orderNo: string;
  assignedToId: string;
  industry: string;
  scenarioName: string;
  currentStep: FdeDeliveryStepKey;
  stepProgress: number;
  deviceConfig: FdeDeviceConfigInfo;
  expertNames: string[];
  apiTargets: string[];
  apiIntegrations: FdeDeliveryApiIntegrationItem[];
  memberCount: number;
  memberInit: FdeDeliveryMemberInitInfo;
  blockers: FdeDeliveryBlockerItem[];
  createdAt: string;
  launchTargetDate: string;
  preflightChecks: string[];
  acceptance: FdeDeliveryAcceptanceInfo;
}

/**
 * 交付工单更新载荷。
 */
export interface FdeDeliveryOrderUpdatePayload {
  acceptance: FdeDeliveryAcceptanceInfo;
  apiIntegrations: FdeDeliveryApiIntegrationItem[];
  deviceConfig: FdeDeviceConfigInfo;
  expertNames: string[];
  launchTargetDate: string;
  memberCount: number;
  memberInit: FdeDeliveryMemberInitInfo;
  preflightChecks: string[];
}

/**
 * 运营监控告警。
 */
export interface FdeOperationsAlertItem {
  id: string;
  title: string;
  detail: string;
  sourceType: FdeAlertSourceType;
  sourceName: string;
  severity: FdeAlertSeverity;
  status: FdeAlertStatus;
  ownerId: string;
  createdAt: string;
  resolution: string;
}

/**
 * 运营诊断条目。
 */
export interface FdeOperationsDiagnosticItem {
  id: string;
  name: string;
  note: string;
  status: FdeDiagnosticStatus;
}

/**
 * 运营趋势点。
 */
export interface FdeOperationsTrendPoint {
  label: string;
  alertCount: number;
  completionRate: number;
  messageVolume: number;
  onlineRate: number;
}

/**
 * 运营监控客户条目。
 */
export interface FdeOperationsCustomerItem {
  id: string;
  customerName: string;
  scenarioName: string;
  assignedToId: string;
  health: FdeMonitorHealth;
  activeExperts: number;
  onlineExperts: number;
  issueCount: number;
  messageVolume24h: number;
  taskCompletionRate: number;
  lastHeartbeat: string;
  alertSummary: string;
  highlights: string[];
  alerts: FdeOperationsAlertItem[];
  agentDiagnostics: FdeOperationsDiagnosticItem[];
  apiDiagnostics: FdeOperationsDiagnosticItem[];
  deviceDiagnostics: FdeOperationsDiagnosticItem[];
  trends: FdeOperationsTrendPoint[];
}

/**
 * 回流问题分类。
 */
export type FdeFeedbackIssueCategory =
  | "知识缺口"
  | "数据延迟"
  | "接口异常"
  | "规则误判"
  | "幻觉回答"
  | "用户表达不匹配";

/**
 * 回流问题信号。
 */
export interface FdeFeedbackSignalItem {
  id: string;
  category: FdeFeedbackIssueCategory;
  detail: string;
  impactedSkill: string;
  sampleCount: number;
  title: string;
}

/**
 * 回流样本。
 */
export interface FdeFeedbackSampleItem {
  id: string;
  createdAt: string;
  expectedReply: string;
  issueCategory: FdeFeedbackIssueCategory;
  observedReply: string;
  question: string;
  signalId: string;
}

/**
 * 回流效果对比。
 */
export interface FdeFeedbackComparisonInfo {
  afterSummary: string;
  beforeSummary: string;
}

/**
 * 进化任务创建载荷。
 */
export interface FdeEvolutionCreatePayload {
  manualNote: string;
  signalIds: string[];
}

/**
 * 进化任务审核记录。
 */
export interface FdeEvolutionReviewRecordItem {
  id: string;
  decision: FdeEvolutionReviewDecision;
  note: string;
  reviewedAt: string;
  reviewerId: string;
}

/**
 * 数据回流 Agent 指标。
 */
export interface FdeFeedbackAgentItem {
  id: string;
  agentName: string;
  customerName: string;
  assignedToId: string;
  scenarioName: string;
  resolutionRate: number;
  triggerCount: number;
  evolutionScore: number;
  lastEvolvedAt: string;
  skillTags: string[];
  issueSignals: FdeFeedbackSignalItem[];
  samples: FdeFeedbackSampleItem[];
  comparison: FdeFeedbackComparisonInfo;
  manualRemark: string;
  recommendation: string;
}

/**
 * 进化任务。
 */
export interface FdeEvolutionTaskItem {
  id: string;
  agentName: string;
  customerName: string;
  assignedToId: string;
  status: FdeEvolutionTaskStatus;
  progress: number;
  versionCandidate: string;
  source: string;
  startedAt: string;
  expectedFinishAt: string;
  submittedAt: string;
  reviewedAt: string;
  reviewedById: string;
  releaseId: string | null;
  changedSkills: string[];
  sourceSignalIds: string[];
  sourceSignalTitles: string[];
  diffSummary: string;
  manualNote: string;
  summary: string;
  reviewRecords: FdeEvolutionReviewRecordItem[];
  timeline: FdeTimelineItem[];
}

/**
 * 版本推送记录。
 */
export interface FdeReleaseNoteSectionItem {
  title: string;
  items: string[];
}

/**
 * 客户维度发布结果。
 */
export interface FdeReleaseCustomerResultItem {
  id: string;
  customerName: string;
  status: FdeReleaseCustomerStatus;
  rolloutPercent: number;
  adoptionRate: number;
  feedback: string;
  lastUpdatedAt: string;
}

/**
 * 发布配置更新载荷。
 */
export interface FdeReleasePushUpdatePayload {
  grayPercent: number;
  targetCustomers: string[];
}

/**
 * 版本推送记录。
 */
export interface FdeReleasePushItem {
  id: string;
  agentName: string;
  version: string;
  sourceTaskId: string | null;
  assignedToId: string;
  grayPercent: number;
  targetCustomers: string[];
  availableCustomers: string[];
  status: FdeReleasePushStatus;
  pushedAt: string;
  adoptionRate: number;
  rollbackReason: string;
  summary: string;
  releaseSections: FdeReleaseNoteSectionItem[];
  customerResults: FdeReleaseCustomerResultItem[];
  timeline: FdeTimelineItem[];
}

/**
 * 工作台待办条目。
 */
export interface FdeWorkbenchTodoItem extends FdeWorkbenchTargetInfo {
  count: number;
  description: string;
  disabled: boolean;
  id: string;
  label: string;
  scopeLabel: string;
  tone: FdeWorkbenchTodoTone;
}

/**
 * 工作台统一动态条目。
 */
export interface FdeWorkbenchActivityItem extends FdeWorkbenchTargetInfo {
  createdAt: string;
  detail: string;
  id: string;
  moduleLabel: string;
  title: string;
}

/**
 * 工作台快速定位条目。
 */
export interface FdeWorkbenchSearchResultItem extends FdeWorkbenchTargetInfo {
  id: string;
  moduleLabel: string;
  ownerLabel: string;
  statusLabel: string;
  subtitle: string;
  title: string;
}

/**
 * FDE 工作台 hook 返回结构。
 */
export interface UseFdeWorkbenchResult {
  activeTab: FdeWorkbenchTabKey;
  activeMember: FdeTeamMemberItem;
  activeRole: FdeWorkbenchRole;
  deliveryOrders: FdeDeliveryOrderItem[];
  evolutionTasks: FdeEvolutionTaskItem[];
  feedbackAgents: FdeFeedbackAgentItem[];
  filteredDeliveryOrders: FdeDeliveryOrderItem[];
  filteredEvolutionTasks: FdeEvolutionTaskItem[];
  filteredFeedbackAgents: FdeFeedbackAgentItem[];
  filteredLeads: FdeLeadItem[];
  filteredOpportunities: FdeOpportunityItem[];
  filteredOperationsCustomers: FdeOperationsCustomerItem[];
  filteredReleasePushes: FdeReleasePushItem[];
  activityFeed: FdeWorkbenchActivityItem[];
  hasActiveFilters: boolean;
  leads: FdeLeadItem[];
  opportunities: FdeOpportunityItem[];
  operationsCustomers: FdeOperationsCustomerItem[];
  releasePushes: FdeReleasePushItem[];
  searchResults: FdeWorkbenchSearchResultItem[];
  statusOptions: string[];
  todoItems: FdeWorkbenchTodoItem[];
  workbenchFilters: FdeWorkbenchFilterState;
  selectedDeliveryOrderId: string;
  selectedEvolutionTaskId: string;
  selectedFeedbackAgentId: string;
  selectedLeadId: string;
  selectedOperationsCustomerId: string;
  selectedOpportunityId: string;
  selectedReleasePushId: string;
  setActiveMemberId: (memberId: string) => void;
  setActiveRole: (role: FdeWorkbenchRole) => void;
  setActiveTab: (tab: FdeWorkbenchTabKey) => void;
  setSelectedDeliveryOrderId: (orderId: string) => void;
  setSelectedEvolutionTaskId: (taskId: string) => void;
  setSelectedFeedbackAgentId: (agentId: string) => void;
  setSelectedLeadId: (leadId: string) => void;
  setSelectedOperationsCustomerId: (customerId: string) => void;
  setSelectedOpportunityId: (opportunityId: string) => void;
  setSelectedReleasePushId: (releaseId: string) => void;
  resetWorkbenchFilters: () => void;
  setWorkbenchFilterOwnerId: (ownerId: string) => void;
  setWorkbenchFilterSceneName: (sceneName: string) => void;
  setWorkbenchFilterSearchKeyword: (keyword: string) => void;
  setWorkbenchFilterStatusLabel: (statusLabel: string) => void;
  createLead: (payload: FdeLeadFormState) => void;
  assignLead: (leadId: string, memberId: string | null) => void;
  updateLeadStatus: (leadId: string, status: FdeLeadStatus) => void;
  convertLeadToOpportunity: (leadId: string) => string | null;
  updateOpportunityStage: (
    opportunityId: string,
    direction: "next" | "previous",
  ) => FdeOpportunityStage | null;
  updateOpportunityFollowUp: (
    opportunityId: string,
    payload: FdeOpportunityFollowUpPayload,
  ) => void;
  convertOpportunityToDelivery: (opportunityId: string) => string | null;
  updateDeliveryStep: (
    orderId: string,
    direction: "next" | "previous",
  ) => FdeDeliveryStepKey | null;
  updateDeliveryOrder: (orderId: string, payload: FdeDeliveryOrderUpdatePayload) => void;
  addDeliveryBlocker: (orderId: string, blocker: Omit<FdeDeliveryBlockerItem, "id">) => void;
  updateDeliveryBlockerStatus: (
    orderId: string,
    blockerId: string,
    status: FdeDeliveryBlockerStatus,
  ) => void;
  updateOperationsAlertStatus: (
    customerId: string,
    alertId: string,
    status: FdeAlertStatus,
  ) => void;
  assignOperationsAlert: (customerId: string, alertId: string, ownerId: string) => void;
  recordOperationsAlertResolution: (
    customerId: string,
    alertId: string,
    resolution: string,
  ) => void;
  triggerEvolution: (agentId: string, payload?: FdeEvolutionCreatePayload) => string | null;
  startEvolutionTask: (taskId: string) => FdeEvolutionTaskStatus | null;
  pauseEvolutionTask: (taskId: string) => FdeEvolutionTaskStatus | null;
  retryEvolutionTask: (taskId: string) => FdeEvolutionTaskStatus | null;
  terminateEvolutionTask: (taskId: string) => FdeEvolutionTaskStatus | null;
  submitEvolutionTaskReview: (taskId: string) => FdeEvolutionTaskStatus | null;
  reviewEvolutionTask: (
    taskId: string,
    decision: FdeEvolutionReviewDecision,
    note: string,
  ) => FdeEvolutionTaskStatus | null;
  createReleaseFromEvolutionTask: (taskId: string) => string | null;
  updateReleasePush: (releaseId: string, payload: FdeReleasePushUpdatePayload) => boolean;
  startReleasePush: (releaseId: string) => FdeReleasePushStatus | null;
  pauseReleasePush: (releaseId: string) => FdeReleasePushStatus | null;
  completeReleasePush: (releaseId: string) => FdeReleasePushStatus | null;
  rollbackReleasePush: (releaseId: string, reason: string) => FdeReleasePushStatus | null;
  tabs: FdeWorkbenchTabItem[];
  teamMembers: FdeTeamMemberItem[];
}
