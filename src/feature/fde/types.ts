/**
 * FDE 工作台视角。
 */
export type FdeWorkbenchRole = "leader" | "admin" | "groupLeader" | "member";

/**
 * FDE 工作台一级导航标识。
 */
export type FdeWorkbenchTabKey =
  | "opportunities"
  | "dashboard"
  | "orderManagement"
  | "delivery"
  | "operations"
  | "teamManagement"
  | "versionManagement"
  | "agentDev"
  | "skillMarket"
  | "agentStore"
  | "opsInsights"
  | "fdeOrgManagement";

/**
 * FDE 成员模块权限。
 */
export type FdeTeamPermissionKey =
  | "opportunities"
  | "orderManagement"
  | "delivery"
  | "operations"
  | "teamManagement"
  | "versionManagement"
  | "agentDev"
  | "skillMarket"
  | "agentStore"
  | "opsInsights"
  | "fdeOrgManagement";

/**
 * FDE 成员状态。
 */
export type FdeMemberStatus = "online" | "busy" | "offline";

/**
 * FDE 成员账号状态。
 */
export type FdeTeamAccountStatus = "enabled" | "disabled";

/**
 * 商机阶段。
 */
export type FdeOpportunityStage = "初步沟通" | "产品演示" | "方案推荐" | "商务谈判" | "已成交";

/**
 * 商机状态。
 */
export type FdeOpportunityStatus = "未开始" | "对接中" | "已成单" | "异常终止";

/**
 * 商机创建方式。
 */
export type FdeOpportunitySourceType = "自动同步" | "手动创建";

/**
 * 设备部署方式。
 */
export type FdeDeviceMode = "云端设备" | "本地设备" | "混合部署";

/**
 * 交付流程步骤键。
 */
export type FdeDeliveryStepKey =
  | "deviceConfig"
  | "agentConfig"
  | "apiTest"
  | "preflight";

/**
 * 客户运行健康度。
 */
export type FdeMonitorHealth = "healthy" | "attention" | "risk";

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
 * 配置交付单据类型。
 */
export type FdeDeliveryOrderKind = "initial" | "change";

/**
 * 配置交付变更类型。
 */
export type FdeDeliveryChangeType = "追加设备" | "追加Agent" | "追加设备与Agent" | "资产续费";

/**
 * 资产变更记录中的资产类型。
 */
export type FdeAssetChangeRecordAssetType = "设备" | "AI 专家" | "设备 / AI 专家";

/**
 * 资产变更记录类型。
 */
export type FdeAssetChangeRecordType =
  | "新增设备"
  | "新增 AI 专家"
  | "新增设备与 AI 专家"
  | "设备续费"
  | "AI 专家续费"
  | "AI 专家升级"
  | "AI 专家回退"
  | "移除设备"
  | "移除 AI 专家";

/**
 * FDE 订单状态。
 */
export type FdeOrderStatus = "待履约" | "履约中" | "已完成";

/**
 * FDE 订单业务类型。
 */
export type FdeOrderBusinessType = "新购" | "续费";

/**
 * FDE 订单商品类型。
 */
export type FdeOrderLineItemKind = "device" | "agent" | "agentGroup" | "tokens";

/**
 * 设备商品类型。
 */
export type FdeOrderDeviceType = "云端工作站" | "本地工作站" | "本地客户端授权";

/**
 * 订单履约类型。
 */
export type FdeOrderFulfillmentType =
  | "首期配置交付"
  | "设备追加"
  | "Agent追加"
  | "Tokens发放"
  | "资产续费";

/**
 * 订单履约状态。
 */
export type FdeOrderFulfillmentStatus = "待处理" | "处理中" | "已完成";

/**
 * 专家广场来源范围。
 */
export type FdeAgentCatalogScope = "public" | "mine";

/**
 * FDE 资产类型。
 */
export type FdeAssetType = "device" | "agent";

/**
 * 商机分配对象类型。
 */
export type FdeOpportunityAssignmentTargetType = "group" | "member";

/**
 * FDE 小组条目。
 */
export interface FdeTeamGroupItem {
  id: string;
  name: string;
  leadId: string;
  description: string;
}

/**
 * FDE 组织树节点。
 */
export interface FdeOrgNodeItem {
  id: string;
  name: string;
  parentId: string | null;
  leaderMemberId: string | null;
}

/**
 * FDE 团队成员。
 */
export interface FdeTeamMemberItem {
  id: string;
  name: string;
  title: string;
  phone: string;
  role: FdeWorkbenchRole;
  groupId?: string;
  groupName?: string;
  orgNodeId?: string;
  status: FdeMemberStatus;
  accountStatus: FdeTeamAccountStatus;
  joinedAt: string;
  permissionKeys: FdeTeamPermissionKey[];
  sourceLabel: string;
  focusScenes: string[];
  avatarSeed: string;
  employeeNo?: string;
}

/**
 * FDE 成员权限定义。
 */
export interface FdeTeamPermissionItem {
  key: FdeTeamPermissionKey;
  label: string;
  description: string;
}

/**
 * FDE 成员草稿。
 */
export interface FdeTeamMemberDraft {
  name: string;
  title: string;
  phone: string;
  role: FdeWorkbenchRole;
  permissionKeys: FdeTeamPermissionKey[];
  focusScenes: string[];
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
 * 工作台导航子分组。
 */
export interface FdeWorkbenchNavSubGroup {
  groupKey: string;
  groupLabel: string;
  items: FdeWorkbenchTabItem[];
}

/**
 * 工作台导航分组。
 */
export interface FdeWorkbenchNavGroup {
  groupKey: string;
  groupLabel: string;
  items: FdeWorkbenchTabItem[];
  subGroups?: FdeWorkbenchNavSubGroup[];
}

/**
 * 商机条目。
 */
export interface FdeOpportunityRequirementInfo {
  sourceType: FdeOpportunitySourceType;
  sourceEntryLabel?: string;
  createdAt: string;
  createdByName: string;
  contactName: string;
  contactPhone: string;
  interestedAgents: string[];
  requirementDescription: string;
}

/**
 * 商机评论条目。
 */
export interface FdeOpportunityCommentItem {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  replyToCommentId?: string;
  replyToAuthorId?: string;
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
  status: FdeOpportunityStatus;
  amountWan: number;
  winRate: number;
  ownerId: string | null;
  ownerGroupId?: string | null;
  ownerGroupName?: string;
  source: string;
  summary: string;
  requirementInfo: FdeOpportunityRequirementInfo;
  comments: FdeOpportunityCommentItem[];
}

/**
 * 新增商机评论入参。
 */
export interface FdeAddOpportunityCommentPayload {
  opportunityId: string;
  content: string;
  replyToCommentId?: string;
}

/**
 * 手动创建商机入参。
 */
export interface FdeCreateOpportunityPayload {
  companyName: string;
  scenarioName: string;
  industry: string;
  amountWan: number;
  contactName: string;
  contactPhone: string;
  interestedAgents: string[];
  requirementDescription: string;
  ownerId?: string | null;
  ownerGroupId?: string | null;
}

/**
 * 商机分配入参。
 */
export interface FdeOpportunityAssignmentPayload {
  targetId: string | null;
  targetType: FdeOpportunityAssignmentTargetType | null;
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
 * 配置交付附件。
 */
export interface FdeDeliveryAttachmentItem {
  id: string;
  name: string;
  sizeLabel: string;
  typeLabel: string;
  uploadedAt: string;
}

/**
 * 交付变更项。
 */
export interface FdeDeliveryChangeDetailItem {
  id: string;
  label: string;
  beforeValue?: string;
  afterValue: string;
}

/**
 * 交付额度调整项。
 */
export interface FdeDeliveryQuotaAdjustmentItem {
  label: string;
  delta: number;
  unit: string;
}

/**
 * 交付工单。
 */
export interface FdeDeliveryOrderItem {
  id: string;
  tenantId: string;
  leadId: string;
  customerName: string;
  orderNo: string;
  assignedToId: string;
  orderKind: FdeDeliveryOrderKind;
  industry: string;
  scenarioName: string;
  currentStep: FdeDeliveryStepKey;
  stepProgress: number;
  orderAmount: string;
  tenantName: string;
  tenantCode: string;
  adminName: string;
  adminPhone: string;
  attachments: FdeDeliveryAttachmentItem[];
  linkedOrderIds?: string[];
  useFullFlow?: boolean;
  skippedSteps?: FdeDeliveryStepKey[];
  relatedCustomerId?: string;
  changeType?: FdeDeliveryChangeType;
  changeReason?: string;
  requestedByName?: string;
  changeDetailItems?: FdeDeliveryChangeDetailItem[];
  quotaAdjustments?: FdeDeliveryQuotaAdjustmentItem[];
  deviceAdditions?: FdeDeviceMonitorItem[];
  agentAdditions?: FdeAgentMonitorItem[];
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
  deliveredAt?: string;
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
  tenantId?: string;
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
  pointsAddRecords: FdePointsAddRecordItem[];
  pointsConsumeRecords: FdePointsConsumeRecordItem[];
  devices: FdeDeviceMonitorItem[];
  agents: FdeAgentMonitorItem[];
  alerts: FdeAlertItem[];
  changeRecords: FdeDeliveryChangeRecordItem[];
}

/**
 * 资产变更记录。
 */
export interface FdeDeliveryChangeRecordItem {
  id: string;
  orderId: string;
  assetType: FdeAssetChangeRecordAssetType;
  targetName: string;
  type: FdeAssetChangeRecordType;
  summary: string;
  detailItems: string[];
  requestedByName: string;
  changedAt: string;
  sourceLabel: string;
  beforeSnapshot: string[];
  afterSnapshot: string[];
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
 * 积分添加记录条目。
 */
export interface FdePointsAddRecordItem {
  id: string;
  createdAt: string;
  amountLabel: string;
  pointsLabel: string;
  channelLabel: string;
  operatorName: string;
}

/**
 * 积分消耗记录条目。
 */
export interface FdePointsConsumeRecordItem {
  id: string;
  createdAt: string;
  pointsLabel: string;
  sourceLabel: string;
  targetName: string;
  operatorName: string;
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
  assetId?: string;
  sourceOrderId?: string;
  validityMonths?: number;
  activatedAt?: string;
  expiresAt?: string;
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
  assetId?: string;
  sourceOrderId?: string;
  validityMonths?: number;
  activatedAt?: string;
  expiresAt?: string;
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
 * 专家广场单个版本信息。
 */
export interface FdeAgentCatalogVersionItem {
  releaseVersion: string;
  description: string;
}

/**
 * 专家广场商品项。
 */
export interface FdeAgentCatalogItem {
  id: string;
  name: string;
  releaseVersion: string;
  sourceLabel: string;
  statusLabel: string;
  permissionHint: string;
  scope: FdeAgentCatalogScope;
  sceneCategory: string;
  description: string;
  versions: FdeAgentCatalogVersionItem[];
}

/**
 * 订单设备商品行。
 */
export interface FdeOrderDeviceLineItem {
  id: string;
  kind: "device";
  deviceType: FdeOrderDeviceType;
  quantity: number;
  validityMonths?: number;
  renewalTargetAssetId?: string;
  deliveredAssetIds?: string[];
  activatedAt?: string;
  expiresAt?: string;
  unitPrice: number;
  totalAmount: number;
}

/**
 * 订单 AI 专家商品行。
 */
export interface FdeOrderAgentLineItem {
  id: string;
  kind: "agent";
  agentCatalogId: string;
  agentName: string;
  releaseVersion: string;
  sourceLabel: string;
  quantity: number;
  validityMonths?: number;
  renewalTargetAssetId?: string;
  deliveredAssetIds?: string[];
  activatedAt?: string;
  expiresAt?: string;
  unitPrice: number;
  totalAmount: number;
}

/**
 * 订单 AI 专家团商品行。
 */
export interface FdeOrderAgentGroupLineItem {
  id: string;
  kind: "agentGroup";
  groupName: string;
  groupDescription: string;
  sourceLabel: string;
  agents: FdeDeliveryAgentPackageItem[];
  quantity: number;
  validityMonths?: number;
  deliveredAssetIds?: string[];
  activatedAt?: string;
  expiresAt?: string;
  unitPrice: number;
  totalAmount: number;
}

/**
 * 订单 tokens 商品行。
 */
export interface FdeOrderTokensLineItem {
  id: string;
  kind: "tokens";
  tokenCount: number;
  totalAmount: number;
}

/**
 * 订单商品行。
 */
export type FdeOrderLineItem =
  | FdeOrderDeviceLineItem
  | FdeOrderAgentLineItem
  | FdeOrderAgentGroupLineItem
  | FdeOrderTokensLineItem;

/**
 * 订单履约执行记录。
 */
export interface FdeOrderFulfillmentExecutionRecordItem {
  id: string;
  actionLabel: string;
  resultLabel: string;
  operatorName: string;
  operatedAt: string;
}

/**
 * 订单履约任务。
 */
export interface FdeOrderFulfillmentItem {
  id: string;
  type: FdeOrderFulfillmentType;
  summary: string;
  status: FdeOrderFulfillmentStatus;
  linkedRecordId?: string;
  linkedRecordType?: "delivery" | "change" | "recharge";
  updatedAt: string;
  executionRecords: FdeOrderFulfillmentExecutionRecordItem[];
}

/**
 * 订单条目。
 */
export interface FdeOrderItem {
  id: string;
  orderNo: string;
  customerName: string;
  assignedToId: string;
  businessType?: FdeOrderBusinessType;
  tenantId?: string;
  tenantName?: string;
  tenantCode?: string;
  status: FdeOrderStatus;
  totalAmount: number;
  remark: string;
  lineItems: FdeOrderLineItem[];
  fulfillmentItems: FdeOrderFulfillmentItem[];
  createdAt: string;
}

/**
 * 创建订单入参。
 */
export interface FdeCreateOrderPayload {
  customerName: string;
  tenantId: string;
  remark: string;
  lineItems: FdeOrderLineItem[];
}

/**
 * 创建订单返回值。
 */
export interface FdeCreateOrderResult {
  orderId: string;
  shouldPromptCreateTenant: boolean;
}

/**
 * 资产续费入参。
 */
export interface FdeRenewAssetPayload {
  customerId: string;
  assetId: string;
  assetType: FdeAssetType;
  validityMonths: number;
  totalAmount: number;
  remark: string;
}

/**
 * 创建设备追加变更单入参。
 */
export interface FdeCreateDeviceChangePayload {
  customerId: string;
  customerName: string;
  linkedOrderId?: string;
  expectedEffectiveAt: string;
  reason: string;
  note: string;
  cloudWorkbenchCount: number;
  localWorkbenchCount: number;
  localClientCount: number;
}

/**
 * 创建 Agent 追加变更单入参。
 */
export interface FdeCreateAgentChangePayload {
  customerId: string;
  customerName: string;
  linkedOrderId?: string;
  expectedEffectiveAt: string;
  reason: string;
  note: string;
  agentName: string;
  releaseVersion: string;
  sourceLabel: string;
  targetMembers: string[];
}

/**
 * 创建交付变更单入参。
 */
export type FdeCreateDeliveryChangePayload =
  | ({ type: "追加设备" } & FdeCreateDeviceChangePayload)
  | ({ type: "追加Agent" } & FdeCreateAgentChangePayload);

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
  canManageMembers: boolean;
  orders: FdeOrderItem[];
  deliveryOrders: FdeDeliveryOrderItem[];
  versionTasks: FdeVersionManagementTaskItem[];
  filteredOpportunities: FdeOpportunityItem[];
  filteredOrders: FdeOrderItem[];
  filteredDeliveryOrders: FdeDeliveryOrderItem[];
  filteredOperationsCustomers: FdeOperationsCustomerItem[];
  filteredVersionTasks: FdeVersionManagementTaskItem[];
  opportunities: FdeOpportunityItem[];
  operationsCustomers: FdeOperationsCustomerItem[];
  selectedOpportunityId: string;
  selectedOrderManagementId: string;
  selectedDeliveryOrderId: string;
  selectedOperationsCustomerId: string;
  selectedVersionTaskId: string;
  setActiveTab: (tab: FdeWorkbenchTabKey) => void;
  createOrder: (payload: FdeCreateOrderPayload) => FdeCreateOrderResult;
  assignOpportunity: (
    opportunityId: string,
    payload: FdeOpportunityAssignmentPayload,
  ) => void;
  createOpportunity: (payload: FdeCreateOpportunityPayload) => void;
  updateOpportunityStatus: (opportunityId: string, status: FdeOpportunityStatus) => void;
  addOpportunityComment: (payload: FdeAddOpportunityCommentPayload) => void;
  renewAsset: (payload: FdeRenewAssetPayload) => FdeCreateOrderResult;
  syncDeliveryOrders: (orders: FdeDeliveryOrderItem[]) => void;
  createDeliveryChangeOrder: (payload: FdeCreateDeliveryChangePayload) => string;
  setSelectedOpportunityId: (opportunityId: string) => void;
  setSelectedOrderManagementId: (orderId: string) => void;
  setSelectedDeliveryOrderId: (orderId: string) => void;
  setSelectedOperationsCustomerId: (customerId: string) => void;
  setSelectedVersionTaskId: (taskId: string) => void;
  addTeamMember: (payload: FdeTeamMemberDraft) => void;
  importTeamMembers: (payloads: FdeTeamMemberDraft[]) => void;
  removeTeamMember: (memberId: string) => void;
  toggleTeamMemberStatus: (memberId: string) => void;
  updateTeamMember: (memberId: string, payload: FdeTeamMemberDraft) => void;
  tabs: FdeWorkbenchTabItem[];
  navGroups: FdeWorkbenchNavGroup[];
  teamGroups: FdeTeamGroupItem[];
  teamMembers: FdeTeamMemberItem[];
  visibleTeamMembers: FdeTeamMemberItem[];
  orgNodes: FdeOrgNodeItem[];
  addOrgNode: (node: FdeOrgNodeItem) => void;
  updateOrgNode: (nodeId: string, updates: Partial<Pick<FdeOrgNodeItem, "name">>) => void;
  removeOrgNode: (nodeId: string) => void;
  setOrgNodeLeader: (nodeId: string, memberId: string | null) => void;
}

/* ─── Skill 市场 ─── */

export type FdeSkillType = "workflow" | "skill" | "model" | "tool";
export type FdeSkillVisibility = "public" | "private" | "team";
export type FdeSkillMarketTab = "mcp" | "public" | "team" | "mine";
export type FdeSkillCategoryFilter = "all" | FdeSkillType;

export interface FdeSkillVersionItem {
  version: string;
  releaseNote: string;
  publishTime: string;
}

export interface FdeSkillItem {
  id: string;
  name: string;
  version: string;
  type: FdeSkillType;
  tags: string[];
  description: string;
  publisher: string;
  publishTime: string;
  iconColor: string;
  iconText: string;
  visibility: FdeSkillVisibility;
  isSharedToMe?: boolean;
  isSharedByMe?: boolean;
  versions: FdeSkillVersionItem[];
}

export interface FdeSkillPresetCover {
  key: string;
  label: string;
  gradient: string;
  emoji: string;
}

/* ─── Agent Store ─── */

export type FdeAgentType = "metaagent" | "syngent" | "openclaw";
export type FdeAgentCategory = "general" | "production" | "supply" | "sales";
export type FdeAgentCategoryFilter = "all" | FdeAgentCategory;
export type FdeAgentMarketTab = "public" | "team" | "mine";

export interface FdeAgentSkillRef {
  skillName: string;
  version: string;
}

export interface FdeAgentFeedbackRow {
  id: string;
  summary: string;
  source: "线上回流" | "人工标注";
  rating: number;
  toolCallRounds: number;
  dialogueRounds: number;
  tokenUsage: number;
  enterprise: string;
}

export interface FdeAgentVersionEvolution {
  skillTriggerAccuracy: string;
  skillTriggerAccuracyTrend: string;
  taskCompletionRate: string;
  taskCompletionRateTrend: string;
  qualityScore: string;
  qualityScoreTrend: string;
  executionTime: string;
  executionTimeTrend: string;
  tokenUsage: string;
  tokenUsageTrend: string;
  regressionRetention: string;
  regressionRetentionTrend: string;
}

export interface FdeAgentEvalReportMetric {
  label: string;
  value: string;
  trend: string;
}

export interface FdeAgentEvalReport {
  summary: string;
  overallScore: number;
  overallScoreTrend: string;
  metrics: FdeAgentEvalReportMetric[];
  testTime: string;
  testRounds: number;
  testScenes: string[];
  issues: string;
  suggestions: string;
  conclusion: string;
}

export interface FdeAgentVersionItem {
  version: string;
  releaseNote: string;
  publishTime: string;
  evolution?: FdeAgentVersionEvolution;
  evalReport?: FdeAgentEvalReport;
}

export interface FdeAgentItem {
  id: string;
  name: string;
  version: string;
  agentType: FdeAgentType;
  category: FdeAgentCategory;
  tags: string[];
  description: string;
  publisher: string;
  publishTime: string;
  iconColor: string;
  iconText: string;
  visibility: FdeSkillVisibility;
  isSharedToMe?: boolean;
  isSharedByMe?: boolean;
  skills: FdeAgentSkillRef[];
  versions: FdeAgentVersionItem[];
  feedbackData: FdeAgentFeedbackRow[];
}

/* ─── Agent 工作空间（Frontis 开发） ─── */

export type FdeAgentFramework = "MetaAgent" | "Syngent" | "OpenClaw";

export interface FdeWorkspaceConversation {
  id: string;
  title: string;
  summary: string;
  date: string;
}

export interface FdeWorkspaceKnowledgeBase {
  id: string;
  name: string;
  fileCount: number;
}

export interface FdeWorkspaceFeedback {
  enterprise: string;
  count: number;
}

export interface FdeWorkspaceResult {
  id: string;
  title: string;
  resultCount: number;
  lastDate: string;
}

export interface FdeAgentWorkspace {
  id: string;
  name: string;
  description: string;
  iconColor: string;
  iconText: string;
  framework: FdeAgentFramework;
  skillCount: number;
  skills: { name: string; version: string }[];
  createdAt: string;
  conversations: FdeWorkspaceConversation[];
  knowledgeBases: FdeWorkspaceKnowledgeBase[];
  feedbackData: FdeWorkspaceFeedback[];
  results: FdeWorkspaceResult[];
  fileCount: number;
  overviewText: string;
}
