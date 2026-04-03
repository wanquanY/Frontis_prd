/**
 * FDE 工作台视角。
 */
export type FdeWorkbenchRole = "leader" | "engineer";

/**
 * FDE 工作台一级导航标识。
 */
export type FdeWorkbenchTabKey =
  | "opportunities"
  | "leads"
  | "delivery"
  | "operations"
  | "versionManagement"
  | "feedback"
  | "evolution";

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
export type FdeLeadStatus = "新线索" | "跟进中" | "已成单" | "已放弃";

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
  | "preflight";

/**
 * 客户运行健康度。
 */
export type FdeMonitorHealth = "healthy" | "attention" | "risk";

/**
 * Agent 进化任务状态。
 */
export type FdeEvolutionTaskStatus =
  | "排队中"
  | "进化中"
  | "进化已完成"
  | "已推送客户审核中"
  | "客户已采纳"
  | "客户未采纳";

/**
 * FDE 租户版本推送状态。
 */
export type FdeVersionManagementStatus =
  | "当前版本"
  | "可升级"
  | "已推送"
  | "已忽略"
  | "已回退";

/**
 * 配置交付订单状态。
 */
export type FdeDeliveryOrderStatus = "待配置" | "配置中" | "已交付";

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
 * 商机条目。
 */
export interface FdeOpportunityItem {
  id: string;
  companyName: string;
  scenarioName: string;
  industry: string;
  stage: FdeOpportunityStage;
  amountWan: number;
  winRate: number;
  ownerId: string;
  nextAction: string;
  nextActionDate: string;
  source: string;
  summary: string;
}

/**
 * 跟进进度记录。
 */
export interface FdeLeadProgressItem {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
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
  budgetLabel: string;
  summary: string;
  remark: string;
  progressList: FdeLeadProgressItem[];
  closedNote?: string;
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
  budgetLabel: string;
  summary: string;
  remark: string;
  assignedToId: string | null;
}

/**
 * 设备配置详情。
 */
export interface FdeDeviceConfigInfo {
  mode: FdeDeviceMode;
  cloudDeviceCount: number;
  localDeviceCount: number;
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
 * 交付工单。
 */
export interface FdeDeliveryOrderItem {
  id: string;
  leadId: string;
  customerName: string;
  orderNo: string;
  assignedToId: string;
  industry: string;
  scenarioName: string;
  currentStep: FdeDeliveryStepKey;
  stepProgress: number;
  orderAmount: string;
  sourceLabel?: string;
  tenantStatusLabel?: string;
  deliveryBoundary?: string;
  deviceConfig: FdeDeviceConfigInfo;
  expertNames: string[];
  requiredInputs?: string[];
  handoffItems?: string[];
  agentGroups?: FdeDeliveryAgentGroupItem[];
  agentPackages?: FdeDeliveryAgentPackageItem[];
  adminTodo?: string[];
  apiTargets: string[];
  memberCount: number;
  createdAt: string;
  launchTargetDate: string;
  deliveryNote: string;
  preflightChecks: string[];
  completedSteps: FdeDeliveryStepKey[];
  deliveryStatus: FdeDeliveryOrderStatus;
}

/**
 * 运营监控客户条目。
 */
export interface FdeOperationsCustomerItem {
  id: string;
  customerName: string;
  scenarioName: string;
  assignedToId: string;
  isDelivered: boolean;
  health: FdeMonitorHealth;
  tenantStatusLabel?: string;
  deviceSummary?: string;
  modelUsageSummary?: string;
  assetValueSummary?: string;
  activeExperts: number;
  onlineExperts: number;
  issueCount: number;
  messageVolume24h: number;
  taskCompletionRate: number;
  lastHeartbeat: string;
  alertSummary: string;
  highlights: string[];
  assetQuotas: FdeAssetQuotaItem[];
  pointsBalanceLabel: string;
  tokenUsage: FdeTokenUsageInfo;
  rechargeRecords: FdeRechargeRecordItem[];
  devices: FdeDeviceMonitorItem[];
  agents: FdeAgentMonitorItem[];
  alerts: FdeAlertItem[];
}

/**
 * 客户资产额度条目。
 */
export interface FdeAssetQuotaItem {
  id: string;
  label: string;
  used: number;
  total: number;
  unit: string;
}

/**
 * Token 使用信息。
 */
export interface FdeTokenUsageInfo {
  usedLabel: string;
  limitLabel: string;
  billingCycleLabel: string;
}

/**
 * 充值记录条目。
 */
export interface FdeRechargeRecordItem {
  id: string;
  rechargeDate: string;
  amountLabel: string;
  pointsLabel: string;
  channelLabel: string;
  operatorName: string;
  statusLabel: string;
}

/**
 * 设备监控条目。
 */
export interface FdeDeviceMonitorItem {
  id: string;
  name: string;
  type: "cloud" | "local";
  status: "online" | "offline";
  uptime: string;
  categoryLabel?: string;
  ownerLabel?: string;
  activationLabel?: string;
  assignedEmployeeName?: string;
  locationLabel?: string;
}

/**
 * Agent 监控条目。
 */
export interface FdeAgentMonitorItem {
  name: string;
  runningHours: number;
  completedTasks: number;
  currentVersion?: string;
  latestVersion?: string;
  deliverySourceLabel?: string;
  collectionLabels?: string[];
  permissionScope?: string;
  assignedMembers?: string[];
  modelLabel?: string;
  deploymentLabel?: string;
}

/**
 * 交付阶段的 Agent 下发包。
 */
export interface FdeDeliveryAgentPackageItem {
  name: string;
  releaseVersion: string;
  sourceLabel: string;
  statusLabel: string;
  permissionHint: string;
}

/**
 * 交付阶段的 AI 专家团。
 */
export interface FdeDeliveryAgentGroupItem {
  id: string;
  name: string;
  description: string;
  sourceLabel: string;
  statusLabel: string;
  agents: FdeDeliveryAgentPackageItem[];
}

/**
 * 告警条目。
 */
export interface FdeAlertItem {
  id: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  time: string;
}

/**
 * 数据回流 Agent 指标。
 */
export interface FdeFeedbackAgentItem {
  id: string;
  agentName: string;
  customerName: string;
  customerId: string;
  assignedToId: string;
  scenarioName: string;
  resolutionRate: number;
  triggerCount: number;
  evolutionScore: number;
  lastEvolvedAt: string;
  currentVersion: string;
  skills: FdeAgentSkillItem[];
  feedbackData: FdeFeedbackDataItem[];
}

/**
 * Agent 技能项。
 */
export interface FdeAgentSkillItem {
  name: string;
  version: string;
}

/**
 * 回流数据项。
 */
export interface FdeFeedbackDataItem {
  date: string;
  triggerCount: number;
  successCount: number;
  failCount: number;
  avgResponseTime: number;
}

/**
 * 技能基准对比结果。
 */
export interface FdeBenchmarkResult {
  skillName: string;
  oldVersion: string;
  newVersion: string;
  metrics: Array<{
    name: string;
    oldValue: string;
    newValue: string;
    improvement: string;
  }>;
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
  changedSkills: string[];
  summary: string;
  queuePosition?: number;
  estimatedTime?: string;
  benchmarkResults?: FdeBenchmarkResult[];
  upgradeNotes?: string;
  currentVersion?: string;
  rejectionReason?: string;
}

/**
 * FDE 租户 Agent 版本管理任务。
 */
export interface FdeVersionManagementTaskItem {
  id: string;
  customerId: string;
  customerName: string;
  agentName: string;
  assignedToId: string;
  deliverySourceLabel?: string;
  collectionLabels?: string[];
  currentVersion: string;
  latestVersion: string;
  status: FdeVersionManagementStatus;
  targetScope: string;
  targetMembers: string[];
  releaseDate: string;
  lastActionLabel: string;
  lastActionAt: string;
  releaseSummary: string;
  diffHighlights: string[];
  riskHint: string;
  customerDecisionHint?: string;
  ignoreReason?: string;
  versionHistory: FdeVersionHistoryItem[];
}

/**
 * AI 专家历史版本记录。
 */
export interface FdeVersionHistoryItem {
  version: string;
  releaseDate: string;
  statusLabel: string;
  summary: string;
  isCurrent?: boolean;
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
  versionTasks: FdeVersionManagementTaskItem[];
  filteredDeliveryOrders: FdeDeliveryOrderItem[];
  filteredEvolutionTasks: FdeEvolutionTaskItem[];
  filteredFeedbackAgents: FdeFeedbackAgentItem[];
  filteredLeads: FdeLeadItem[];
  filteredOpportunities: FdeOpportunityItem[];
  filteredOperationsCustomers: FdeOperationsCustomerItem[];
  filteredVersionTasks: FdeVersionManagementTaskItem[];
  leads: FdeLeadItem[];
  opportunities: FdeOpportunityItem[];
  operationsCustomers: FdeOperationsCustomerItem[];
  selectedDeliveryOrderId: string;
  selectedEvolutionTaskId: string;
  selectedFeedbackAgentId: string;
  selectedLeadId: string;
  selectedOperationsCustomerId: string;
  selectedOpportunityId: string;
  selectedVersionTaskId: string;
  setActiveMemberId: (memberId: string) => void;
  setActiveRole: (role: FdeWorkbenchRole) => void;
  setActiveTab: (tab: FdeWorkbenchTabKey) => void;
  setSelectedDeliveryOrderId: (orderId: string) => void;
  setSelectedEvolutionTaskId: (taskId: string) => void;
  setSelectedFeedbackAgentId: (agentId: string) => void;
  setSelectedLeadId: (leadId: string) => void;
  setSelectedOperationsCustomerId: (customerId: string) => void;
  setSelectedOpportunityId: (opportunityId: string) => void;
  setSelectedVersionTaskId: (taskId: string) => void;
  createLead: (payload: FdeLeadFormState) => void;
  assignLead: (leadId: string, memberId: string | null) => void;
  updateLeadStatus: (leadId: string, status: FdeLeadStatus, closedNote?: string) => void;
  addLeadProgress: (leadId: string, content: string) => void;
  triggerEvolution: (agentId: string) => void;
  tabs: FdeWorkbenchTabItem[];
  teamMembers: FdeTeamMemberItem[];
}
