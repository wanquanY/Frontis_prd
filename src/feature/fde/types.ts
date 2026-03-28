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
  | "memberInit"
  | "preflight";

/**
 * 客户运行健康度。
 */
export type FdeMonitorHealth = "healthy" | "attention" | "risk";

/**
 * Agent 进化任务状态。
 */
export type FdeEvolutionTaskStatus = "排队中" | "训练中" | "待审核" | "已完成";

/**
 * 版本推送状态。
 */
export type FdeReleasePushStatus = "待发布" | "灰度中" | "已完成" | "已回退";

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
  deviceConfig: FdeDeviceConfigInfo;
  expertNames: string[];
  apiTargets: string[];
  memberCount: number;
  createdAt: string;
  launchTargetDate: string;
  preflightChecks: string[];
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
  issueSignals: string[];
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
  changedSkills: string[];
  summary: string;
}

/**
 * 版本推送记录。
 */
export interface FdeReleasePushItem {
  id: string;
  agentName: string;
  version: string;
  assignedToId: string;
  targetCustomers: string[];
  status: FdeReleasePushStatus;
  pushedAt: string;
  adoptionRate: number;
  summary: string;
  releaseNotes: string[];
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
  leads: FdeLeadItem[];
  opportunities: FdeOpportunityItem[];
  operationsCustomers: FdeOperationsCustomerItem[];
  releasePushes: FdeReleasePushItem[];
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
  createLead: (payload: FdeLeadFormState) => void;
  assignLead: (leadId: string, memberId: string | null) => void;
  updateLeadStatus: (leadId: string, status: FdeLeadStatus) => void;
  triggerEvolution: (agentId: string) => void;
  tabs: FdeWorkbenchTabItem[];
  teamMembers: FdeTeamMemberItem[];
}
