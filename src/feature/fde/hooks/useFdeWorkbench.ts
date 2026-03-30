import { useCallback, useMemo, useState } from "react";

import {
  FDE_DELIVERY_STEPS,
  FDE_DELIVERY_ORDERS,
  FDE_EVOLUTION_TASKS,
  FDE_FEEDBACK_AGENTS,
  FDE_LEADS,
  FDE_OPERATIONS_CUSTOMERS,
  FDE_OPPORTUNITIES,
  FDE_RELEASE_PUSHES,
  FDE_TEAM_MEMBERS,
  FDE_WORKBENCH_TABS,
} from "@/feature/fde/mockData";
import type {
  FdeAlertStatus,
  FdeDeliveryBlockerItem,
  FdeDeliveryBlockerStatus,
  FdeDeliveryOrderUpdatePayload,
  FdeDeliveryOrderItem,
  FdeDeliveryStepKey,
  FdeEvolutionCreatePayload,
  FdeEvolutionReviewDecision,
  FdeEvolutionTaskItem,
  FdeEvolutionTaskStatus,
  FdeFeedbackAgentItem,
  FdeLeadFormState,
  FdeLeadItem,
  FdeLeadStatus,
  FdeOperationsCustomerItem,
  FdeOpportunityFollowUpPayload,
  FdeOpportunityItem,
  FdeOpportunityStage,
  FdeReleasePushStatus,
  FdeReleasePushUpdatePayload,
  FdeReleasePushItem,
  FdeTeamMemberItem,
  FdeTimelineItem,
  FdeWorkbenchActivityItem,
  FdeWorkbenchEntityType,
  FdeWorkbenchFilterState,
  FdeWorkbenchRole,
  FdeWorkbenchSearchResultItem,
  FdeWorkbenchTabKey,
  FdeWorkbenchTodoItem,
  UseFdeWorkbenchResult,
} from "@/feature/fde/types";
import {
  FDE_OPPORTUNITY_STAGE_ORDER,
  getFdeDeliveryStepIndex,
  getFdeHealthLabel,
} from "@/feature/fde/utils";

const buildId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const formatDatePart = (value: number): string => value.toString().padStart(2, "0");

const getCurrentDateTime = (): string => {
  const date = new Date();

  return `${date.getFullYear()}-${formatDatePart(date.getMonth() + 1)}-${formatDatePart(
    date.getDate(),
  )} ${formatDatePart(date.getHours())}:${formatDatePart(date.getMinutes())}`;
};

const getCurrentDate = (): string => getCurrentDateTime().slice(0, 10);

const createTimelineItem = (
  title: string,
  detail: string,
  createdAt: string = getCurrentDateTime(),
): FdeTimelineItem => ({
  id: buildId("timeline"),
  title,
  detail,
  createdAt,
});

const resolveOpportunityAmountWan = (budgetLabel: string): number => {
  const amountMatches = budgetLabel.match(/\d+(\.\d+)?/g);

  if (!amountMatches?.length) {
    return 12;
  }

  const numericValues = amountMatches.map(item => Number(item));
  if (numericValues.length === 1) {
    return numericValues[0];
  }

  const total = numericValues.reduce((sum, item) => sum + item, 0);
  return Number((total / numericValues.length).toFixed(1));
};

const resolveOpportunityWinRate = (stage: FdeOpportunityStage): number => {
  if (stage === "初步沟通") {
    return 35;
  }

  if (stage === "产品演示") {
    return 52;
  }

  if (stage === "方案推荐") {
    return 68;
  }

  if (stage === "商务谈判") {
    return 85;
  }

  return 100;
};

const buildOrderNo = (): string => {
  const date = new Date();
  const datePart = `${date.getFullYear()}${formatDatePart(date.getMonth() + 1)}${formatDatePart(
    date.getDate(),
  )}`;
  const timePart = `${formatDatePart(date.getHours())}${formatDatePart(date.getMinutes())}`;

  return `FDE-${datePart}-${timePart}`;
};

const DELIVERY_STEP_PROGRESS_MAP: Record<FdeDeliveryStepKey, number> = {
  customerConfirm: 12,
  deviceConfig: 26,
  agentConfig: 48,
  apiTest: 66,
  memberInit: 82,
  preflight: 96,
};

const resolveDeliveryStepProgress = (stepKey: FdeDeliveryStepKey): number =>
  DELIVERY_STEP_PROGRESS_MAP[stepKey];

const createVersionCandidate = (): string => `v${Math.floor(Math.random() * 3) + 2}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;

const LEADER_REVIEWER_ID: string =
  FDE_TEAM_MEMBERS.find(item => item.role === "leader")?.id ?? FDE_TEAM_MEMBERS[0]?.id ?? "";

const isEvolutionTaskOpen = (status: FdeEvolutionTaskStatus): boolean =>
  status !== "已完成" && status !== "已终止";

const normalizeCustomerNames = (customerNames: string[]): string[] =>
  Array.from(new Set(customerNames.map(item => item.trim()).filter(Boolean)));

const calculateReleaseAdoptionRate = (
  customerResults: FdeReleasePushItem["customerResults"],
  targetCustomers: string[],
): number => {
  const targetCustomerSet = new Set(targetCustomers);
  const activeResults = customerResults.filter(item => targetCustomerSet.has(item.customerName));
  if (!activeResults.length) {
    return 0;
  }

  const total = activeResults.reduce((sum, item) => sum + item.adoptionRate, 0);
  return Math.round(total / activeResults.length);
};

const resolveTimestamp = (value: string): number => {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return 0;
  }

  const parsedValue = Date.parse(normalizedValue.replace(" ", "T"));
  if (Number.isNaN(parsedValue)) {
    return 0;
  }

  return parsedValue;
};

const compareByDateTimeDesc = <TItem extends { createdAt: string }>(left: TItem, right: TItem): number =>
  resolveTimestamp(right.createdAt) - resolveTimestamp(left.createdAt);

const createTodoItem = (
  id: string,
  label: string,
  description: string,
  count: number,
  target: {
    entityId: string;
    entityType: FdeWorkbenchEntityType;
    tabKey: FdeWorkbenchTabKey;
  },
  scopeLabel: string,
  tone: FdeWorkbenchTodoItem["tone"],
): FdeWorkbenchTodoItem => ({
  id,
  label,
  description,
  count,
  disabled: count === 0,
  scopeLabel,
  tone,
  ...target,
});

const matchesKeyword = (keyword: string, values: string[]): boolean => {
  if (!keyword) {
    return true;
  }

  const normalizedKeyword = keyword.toLowerCase();
  return values.some(item => item.toLowerCase().includes(normalizedKeyword));
};

const matchesSceneName = (selectedSceneName: string, sceneNames: string[]): boolean =>
  selectedSceneName === "all" || sceneNames.includes(selectedSceneName);

const matchesStatusLabel = (selectedStatusLabel: string, statusLabels: string[]): boolean =>
  selectedStatusLabel === "all" || statusLabels.includes(selectedStatusLabel);

const getDeliveryStepLabel = (stepKey: FdeDeliveryStepKey): string =>
  FDE_DELIVERY_STEPS.find(item => item.key === stepKey)?.label ?? stepKey;

const matchesOwnerId = (
  selectedOwnerId: string,
  ownerId: string | null | undefined,
): boolean => selectedOwnerId === "all" || ownerId === selectedOwnerId;

const DEFAULT_WORKBENCH_FILTERS: FdeWorkbenchFilterState = {
  ownerId: "all",
  sceneName: "all",
  searchKeyword: "",
  statusLabel: "all",
};

const buildEvolutionReleaseSections = (
  task: FdeEvolutionTaskItem,
  targetCustomers: string[],
): FdeReleasePushItem["releaseSections"] => [
  {
    title: "本次变更",
    items: [task.diffSummary, ...task.changedSkills.map(item => `更新技能：${item}`)],
  },
  {
    title: "目标客户",
    items: targetCustomers,
  },
  {
    title: "观察重点",
    items: [
      ...(task.sourceSignalTitles.length ? task.sourceSignalTitles : ["观察本轮问题信号是否下降"]),
      ...(task.manualNote ? [`FDE 备注：${task.manualNote}`] : []),
    ],
  },
];

const createReleaseCustomerResults = (
  availableCustomers: string[],
  targetCustomers: string[],
  grayPercent: number,
  createdAt: string,
): FdeReleasePushItem["customerResults"] =>
  availableCustomers.map(customerName => {
    const isTargetCustomer = targetCustomers.includes(customerName);

    return {
      id: buildId("release-customer"),
      customerName,
      status: "待发布",
      rolloutPercent: isTargetCustomer ? grayPercent : 0,
      adoptionRate: 0,
      feedback: isTargetCustomer ? "已纳入本轮发布范围，等待启动灰度。" : "当前未纳入本轮发布范围。",
      lastUpdatedAt: createdAt,
    };
  });

const syncReleaseCustomerResults = (
  release: FdeReleasePushItem,
  targetCustomers: string[],
  grayPercent: number,
  updatedAt: string,
): FdeReleasePushItem["customerResults"] => {
  const targetCustomerSet = new Set(targetCustomers);
  const nextAvailableCustomers = normalizeCustomerNames([
    ...release.availableCustomers,
    ...targetCustomers,
    ...release.customerResults.map(item => item.customerName),
  ]);

  return nextAvailableCustomers.map(customerName => {
    const currentItem = release.customerResults.find(item => item.customerName === customerName);
    const isTargetCustomer = targetCustomerSet.has(customerName);

    if (!currentItem) {
      return {
        id: buildId("release-customer"),
        customerName,
        status: "待发布",
        rolloutPercent: isTargetCustomer ? grayPercent : 0,
        adoptionRate: 0,
        feedback: isTargetCustomer
          ? "已纳入本轮发布范围，等待启动灰度。"
          : "当前未纳入本轮发布范围。",
        lastUpdatedAt: updatedAt,
      };
    }

    if (!isTargetCustomer && !["已完成", "已回退"].includes(currentItem.status)) {
      return {
        ...currentItem,
        status: "待发布",
        rolloutPercent: 0,
        adoptionRate: 0,
        feedback: "当前未纳入本轮发布范围。",
        lastUpdatedAt: updatedAt,
      };
    }

    if (isTargetCustomer && ["待发布", "已暂停"].includes(currentItem.status)) {
      return {
        ...currentItem,
        rolloutPercent: grayPercent,
        feedback:
          currentItem.status === "已暂停"
            ? "已更新灰度比例，等待恢复推送。"
            : "已纳入本轮发布范围，等待启动灰度。",
        lastUpdatedAt: updatedAt,
      };
    }

    return currentItem;
  });
};

const createReleaseFromEvolutionTaskItem = (
  task: FdeEvolutionTaskItem,
  createdAt: string,
  availableCustomers: string[],
): FdeReleasePushItem => ({
  id: buildId("release"),
  agentName: task.agentName,
  version: task.versionCandidate,
  sourceTaskId: task.id,
  assignedToId: task.assignedToId,
  grayPercent: 30,
  targetCustomers: [task.customerName],
  availableCustomers,
  status: "待发布",
  pushedAt: createdAt,
  adoptionRate: 0,
  rollbackReason: "",
  summary: `${task.agentName} 已通过审核，等待配置灰度比例并选择正式推送范围。`,
  releaseSections: buildEvolutionReleaseSections(task, [task.customerName]),
  customerResults: createReleaseCustomerResults(availableCustomers, [task.customerName], 30, createdAt),
  timeline: [
    createTimelineItem("创建发布单", `已根据 ${task.agentName} 的审核结果生成发布单。`, createdAt),
  ],
});

const createOpportunityFromLead = (lead: FdeLeadItem, createdAt: string): FdeOpportunityItem => {
  const nextActionDate = lead.nextFollowUpAt
    ? lead.nextFollowUpAt.slice(0, 10)
    : getCurrentDate();

  return {
    id: buildId("opp"),
    sourceLeadId: lead.id,
    companyName: lead.companyName,
    contactName: lead.contactName,
    contactPhone: lead.phone,
    scenarioName: lead.interestedScenes[0] ?? "待定义试点场景",
    industry: "待确认行业",
    stage: "初步沟通",
    amountWan: resolveOpportunityAmountWan(lead.budgetLabel),
    winRate: 35,
    ownerId: lead.assignedToId ?? "fde-engineer-chenlan",
    priority: lead.priority,
    riskLevel: "关注",
    budgetLabel: lead.budgetLabel,
    nextAction: "安排首次方案沟通",
    nextActionDate,
    estimatedSignDate: "待确认签约时间",
    source: lead.source,
    summary: lead.summary,
    blockers: [],
    timeline: [
      ...lead.timeline,
      createTimelineItem(
        "线索转商机",
        `已从线索工单转入商机工作台，当前跟进人：${
          lead.assignedToId
            ? FDE_TEAM_MEMBERS.find(item => item.id === lead.assignedToId)?.name ?? "待分配"
            : "待分配"
        }。`,
        createdAt,
      ),
    ],
  };
};

const createDeliveryOrderFromOpportunity = (
  opportunity: FdeOpportunityItem,
  createdAt: string,
): FdeDeliveryOrderItem => ({
  id: buildId("delivery"),
  leadId: opportunity.sourceLeadId,
  sourceOpportunityId: opportunity.id,
  customerName: opportunity.companyName,
  orderNo: buildOrderNo(),
  assignedToId: opportunity.ownerId,
  industry: opportunity.industry,
  scenarioName: opportunity.scenarioName,
  currentStep: "customerConfirm",
  stepProgress: resolveDeliveryStepProgress("customerConfirm"),
  deviceConfig: {
    mode: "混合部署",
    cloudNodeName: "待确认云端节点",
    localDeviceName: "待确认本地设备",
    pairingCode: "待 OS 提供",
    osOwner: "LeDeep OS",
    region: "待确认交付地域",
  },
  expertNames: ["交付编排师", "场景配置师", "联调助手"],
  apiTargets: ["待确认业务 API", "待确认组织接口"],
  apiIntegrations: [
    {
      id: buildId("delivery-api"),
      name: "待确认业务 API",
      note: "等待客户确认首批业务系统接口。",
      status: "待联调",
    },
    {
      id: buildId("delivery-api"),
      name: "待确认组织接口",
      note: "等待客户确认组织与权限同步方式。",
      status: "待联调",
    },
  ],
  memberCount: 0,
  memberInit: {
    targetCount: 0,
    activatedCount: 0,
    trainingCompletedCount: 0,
    summary: "待确认首批试点成员名单。",
  },
  blockers: [],
  createdAt,
  launchTargetDate: opportunity.estimatedSignDate,
  preflightChecks: ["客户信息待确认", "设备数量待确认", "试点成员名单待收集"],
  acceptance: {
    status: "待验收",
    acceptedAt: "",
    handoverOwner: "王琳",
    summary: "待完成配置交付后进入客户验收。",
    checklist: ["关键场景演示通过", "客户负责人确认交接", "上线回退预案已同步"],
  },
});

/**
 * FDE 工作台本地状态与交互逻辑。
 */
export const useFdeWorkbench = (): UseFdeWorkbenchResult => {
  const [activeTab, setActiveTab] = useState<FdeWorkbenchTabKey>("overview");
  const [activeRole, setActiveRole] = useState<FdeWorkbenchRole>("leader");
  const engineerMembers = useMemo(
    () => FDE_TEAM_MEMBERS.filter(item => item.role === "engineer"),
    [],
  );
  const [activeMemberId, setActiveMemberId] = useState<string>(engineerMembers[0]?.id ?? "");
  const [opportunities, setOpportunities] = useState<FdeOpportunityItem[]>(FDE_OPPORTUNITIES);
  const [leads, setLeads] = useState<FdeLeadItem[]>(FDE_LEADS);
  const [deliveryOrders, setDeliveryOrders] = useState<FdeDeliveryOrderItem[]>(FDE_DELIVERY_ORDERS);
  const [operationsCustomers, setOperationsCustomers] = useState<FdeOperationsCustomerItem[]>(
    FDE_OPERATIONS_CUSTOMERS,
  );
  const [feedbackAgents] = useState<FdeFeedbackAgentItem[]>(FDE_FEEDBACK_AGENTS);
  const [evolutionTasks, setEvolutionTasks] = useState<FdeEvolutionTaskItem[]>(FDE_EVOLUTION_TASKS);
  const [releasePushes, setReleasePushes] = useState<FdeReleasePushItem[]>(FDE_RELEASE_PUSHES);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>(
    FDE_OPPORTUNITIES[0]?.id ?? "",
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string>(FDE_LEADS[0]?.id ?? "");
  const [selectedDeliveryOrderId, setSelectedDeliveryOrderId] = useState<string>(
    FDE_DELIVERY_ORDERS[0]?.id ?? "",
  );
  const [selectedOperationsCustomerId, setSelectedOperationsCustomerId] = useState<string>(
    FDE_OPERATIONS_CUSTOMERS[0]?.id ?? "",
  );
  const [selectedFeedbackAgentId, setSelectedFeedbackAgentId] = useState<string>(
    FDE_FEEDBACK_AGENTS[0]?.id ?? "",
  );
  const [selectedEvolutionTaskId, setSelectedEvolutionTaskId] = useState<string>(
    FDE_EVOLUTION_TASKS[0]?.id ?? "",
  );
  const [selectedReleasePushId, setSelectedReleasePushId] = useState<string>(
    FDE_RELEASE_PUSHES[0]?.id ?? "",
  );
  const [workbenchFilters, setWorkbenchFilters] = useState<FdeWorkbenchFilterState>(
    DEFAULT_WORKBENCH_FILTERS,
  );

  const activeMember = useMemo<FdeTeamMemberItem>(
    () =>
      engineerMembers.find(item => item.id === activeMemberId) ??
      engineerMembers[0] ??
      FDE_TEAM_MEMBERS[0],
    [activeMemberId, engineerMembers],
  );
  const teamMemberNameMap = useMemo<Map<string, string>>(
    () => new Map(FDE_TEAM_MEMBERS.map(item => [item.id, item.name])),
    [],
  );

  const filterByPerspective = useCallback(
    <TItem extends { assignedToId: string }>(items: TItem[]): TItem[] => {
      if (activeRole === "leader") {
        return items;
      }

      return items.filter(item => item.assignedToId === activeMember.id);
    },
    [activeMember.id, activeRole],
  );

  const roleScopedOpportunities = useMemo<FdeOpportunityItem[]>(
    () =>
      activeRole === "leader"
        ? opportunities
        : opportunities.filter(item => item.ownerId === activeMember.id),
    [activeMember.id, activeRole, opportunities],
  );
  const roleScopedLeads = useMemo<FdeLeadItem[]>(
    () =>
      activeRole === "leader" ? leads : leads.filter(item => item.assignedToId === activeMember.id),
    [activeMember.id, activeRole, leads],
  );
  const roleScopedDeliveryOrders = useMemo<FdeDeliveryOrderItem[]>(
    () => filterByPerspective(deliveryOrders),
    [deliveryOrders, filterByPerspective],
  );
  const roleScopedOperationsCustomers = useMemo<FdeOperationsCustomerItem[]>(
    () => filterByPerspective(operationsCustomers),
    [filterByPerspective, operationsCustomers],
  );
  const roleScopedFeedbackAgents = useMemo<FdeFeedbackAgentItem[]>(
    () => filterByPerspective(feedbackAgents),
    [feedbackAgents, filterByPerspective],
  );
  const roleScopedEvolutionTasks = useMemo<FdeEvolutionTaskItem[]>(
    () => filterByPerspective(evolutionTasks),
    [evolutionTasks, filterByPerspective],
  );
  const roleScopedReleasePushes = useMemo<FdeReleasePushItem[]>(
    () => filterByPerspective(releasePushes),
    [filterByPerspective, releasePushes],
  );
  const sceneNameByCustomer = useMemo<Map<string, string>>(() => {
    const sceneMap = new Map<string, string>();

    opportunities.forEach(item => {
      sceneMap.set(item.companyName, item.scenarioName);
    });
    leads.forEach(item => {
      sceneMap.set(item.companyName, item.interestedScenes[0] ?? "待定义试点场景");
    });
    deliveryOrders.forEach(item => {
      sceneMap.set(item.customerName, item.scenarioName);
    });
    operationsCustomers.forEach(item => {
      sceneMap.set(item.customerName, item.scenarioName);
    });
    feedbackAgents.forEach(item => {
      sceneMap.set(item.customerName, item.scenarioName);
    });

    return sceneMap;
  }, [deliveryOrders, feedbackAgents, leads, opportunities, operationsCustomers]);
  const dashboardFilteredOpportunities = useMemo<FdeOpportunityItem[]>(
    () =>
      roleScopedOpportunities.filter(item =>
        matchesOwnerId(workbenchFilters.ownerId, item.ownerId) &&
        matchesSceneName(workbenchFilters.sceneName, [item.scenarioName]) &&
        matchesStatusLabel(workbenchFilters.statusLabel, [item.stage]) &&
        matchesKeyword(workbenchFilters.searchKeyword, [
          item.companyName,
          item.contactName,
          item.contactPhone,
          item.scenarioName,
          item.industry,
          item.stage,
          item.priority,
          item.riskLevel,
          item.budgetLabel,
          item.nextAction,
          item.nextActionDate,
          item.estimatedSignDate,
          item.source,
          item.summary,
          ...item.blockers,
          ...item.timeline.map(timelineItem => `${timelineItem.title} ${timelineItem.detail}`),
        ]),
      ),
    [roleScopedOpportunities, workbenchFilters],
  );
  const dashboardFilteredLeads = useMemo<FdeLeadItem[]>(
    () =>
      roleScopedLeads.filter(item =>
        matchesOwnerId(workbenchFilters.ownerId, item.assignedToId) &&
        matchesSceneName(workbenchFilters.sceneName, item.interestedScenes) &&
        matchesStatusLabel(workbenchFilters.statusLabel, [item.status]) &&
        matchesKeyword(workbenchFilters.searchKeyword, [
          item.companyName,
          item.contactName,
          item.phone,
          item.source,
          item.priority,
          item.budgetLabel,
          item.nextFollowUpAt,
          item.lastFollowUpAt,
          item.summary,
          item.remark,
          ...item.interestedScenes,
          ...item.timeline.map(timelineItem => `${timelineItem.title} ${timelineItem.detail}`),
        ]),
      ),
    [roleScopedLeads, workbenchFilters],
  );
  const dashboardFilteredDeliveryOrders = useMemo<FdeDeliveryOrderItem[]>(
    () =>
      roleScopedDeliveryOrders.filter(item =>
        matchesOwnerId(workbenchFilters.ownerId, item.assignedToId) &&
        matchesSceneName(workbenchFilters.sceneName, [item.scenarioName]) &&
        matchesStatusLabel(workbenchFilters.statusLabel, [getDeliveryStepLabel(item.currentStep)]) &&
        matchesKeyword(workbenchFilters.searchKeyword, [
          item.customerName,
          item.orderNo,
          item.industry,
          item.scenarioName,
          item.currentStep,
          getDeliveryStepLabel(item.currentStep),
          item.deviceConfig.mode,
          item.deviceConfig.cloudNodeName,
          item.deviceConfig.localDeviceName,
          item.deviceConfig.osOwner,
          item.deviceConfig.region,
          item.launchTargetDate,
          item.acceptance.summary,
          ...item.expertNames,
          ...item.apiTargets,
          ...item.preflightChecks,
          ...item.blockers.map(blocker => `${blocker.title} ${blocker.detail} ${blocker.status}`),
        ]),
      ),
    [roleScopedDeliveryOrders, workbenchFilters],
  );
  const dashboardFilteredOperationsCustomers = useMemo<FdeOperationsCustomerItem[]>(
    () =>
      roleScopedOperationsCustomers.filter(item =>
        matchesOwnerId(workbenchFilters.ownerId, item.assignedToId) &&
        matchesSceneName(workbenchFilters.sceneName, [item.scenarioName]) &&
        matchesStatusLabel(workbenchFilters.statusLabel, [getFdeHealthLabel(item.health)]) &&
        matchesKeyword(workbenchFilters.searchKeyword, [
          item.customerName,
          item.scenarioName,
          getFdeHealthLabel(item.health),
          item.alertSummary,
          item.lastHeartbeat,
          ...item.highlights,
          ...item.alerts.map(alert => `${alert.title} ${alert.detail} ${alert.status} ${alert.severity}`),
          ...item.agentDiagnostics.map(diagnostic => `${diagnostic.name} ${diagnostic.note} ${diagnostic.status}`),
          ...item.apiDiagnostics.map(diagnostic => `${diagnostic.name} ${diagnostic.note} ${diagnostic.status}`),
          ...item.deviceDiagnostics.map(
            diagnostic => `${diagnostic.name} ${diagnostic.note} ${diagnostic.status}`,
          ),
        ]),
      ),
    [roleScopedOperationsCustomers, workbenchFilters],
  );
  const dashboardFilteredFeedbackAgents = useMemo<FdeFeedbackAgentItem[]>(
    () =>
      roleScopedFeedbackAgents.filter(item =>
        matchesOwnerId(workbenchFilters.ownerId, item.assignedToId) &&
        matchesSceneName(workbenchFilters.sceneName, [item.scenarioName]) &&
        matchesStatusLabel(workbenchFilters.statusLabel, ["回流待分析"]) &&
        matchesKeyword(workbenchFilters.searchKeyword, [
          item.agentName,
          item.customerName,
          item.scenarioName,
          item.lastEvolvedAt,
          item.manualRemark,
          item.recommendation,
          ...item.skillTags,
          ...item.issueSignals.map(signal => `${signal.title} ${signal.detail} ${signal.category}`),
          ...item.samples.map(sample => `${sample.question} ${sample.observedReply} ${sample.issueCategory}`),
        ]),
      ),
    [roleScopedFeedbackAgents, workbenchFilters],
  );
  const dashboardFilteredEvolutionTasks = useMemo<FdeEvolutionTaskItem[]>(
    () =>
      roleScopedEvolutionTasks.filter(item =>
        matchesOwnerId(workbenchFilters.ownerId, item.assignedToId) &&
        matchesSceneName(workbenchFilters.sceneName, [sceneNameByCustomer.get(item.customerName) ?? "待定义试点场景"]) &&
        matchesStatusLabel(workbenchFilters.statusLabel, [item.status]) &&
        matchesKeyword(workbenchFilters.searchKeyword, [
          item.agentName,
          item.customerName,
          item.status,
          item.versionCandidate,
          item.source,
          item.expectedFinishAt,
          item.summary,
          item.diffSummary,
          item.manualNote,
          ...item.changedSkills,
          ...item.sourceSignalTitles,
          ...item.timeline.map(timelineItem => `${timelineItem.title} ${timelineItem.detail}`),
        ]),
      ),
    [roleScopedEvolutionTasks, sceneNameByCustomer, workbenchFilters],
  );
  const dashboardFilteredReleasePushes = useMemo<FdeReleasePushItem[]>(
    () =>
      roleScopedReleasePushes.filter(item =>
        matchesOwnerId(workbenchFilters.ownerId, item.assignedToId) &&
        matchesSceneName(
          workbenchFilters.sceneName,
          item.targetCustomers.map(
            customerName => sceneNameByCustomer.get(customerName) ?? "待定义试点场景",
          ),
        ) &&
        matchesStatusLabel(workbenchFilters.statusLabel, [item.status]) &&
        matchesKeyword(workbenchFilters.searchKeyword, [
          item.agentName,
          item.version,
          item.status,
          item.summary,
          item.rollbackReason,
          ...item.targetCustomers,
          ...item.releaseSections.flatMap(section => [section.title, ...section.items]),
          ...item.timeline.map(timelineItem => `${timelineItem.title} ${timelineItem.detail}`),
        ]),
      ),
    [roleScopedReleasePushes, sceneNameByCustomer, workbenchFilters],
  );
  const statusOptions = useMemo<string[]>(
    () =>
      Array.from(
        new Set([
          ...roleScopedLeads.map(item => item.status),
          ...roleScopedOpportunities.map(item => item.stage),
          ...roleScopedDeliveryOrders.map(item => getDeliveryStepLabel(item.currentStep)),
          ...roleScopedOperationsCustomers.map(item => getFdeHealthLabel(item.health)),
          ...roleScopedFeedbackAgents.map(() => "回流待分析"),
          ...roleScopedEvolutionTasks.map(item => item.status),
          ...roleScopedReleasePushes.map(item => item.status),
        ]),
      ).sort((left, right) => left.localeCompare(right, "zh-CN")),
    [
      roleScopedDeliveryOrders,
      roleScopedEvolutionTasks,
      roleScopedFeedbackAgents,
      roleScopedLeads,
      roleScopedOpportunities,
      roleScopedOperationsCustomers,
      roleScopedReleasePushes,
    ],
  );
  const filteredOpportunities = roleScopedOpportunities;
  const filteredLeads = roleScopedLeads;
  const filteredDeliveryOrders = roleScopedDeliveryOrders;
  const filteredOperationsCustomers = roleScopedOperationsCustomers;
  const filteredFeedbackAgents = roleScopedFeedbackAgents;
  const filteredEvolutionTasks = roleScopedEvolutionTasks;
  const filteredReleasePushes = roleScopedReleasePushes;
  const hasActiveFilters = useMemo<boolean>(
    () =>
      workbenchFilters.ownerId !== DEFAULT_WORKBENCH_FILTERS.ownerId ||
      workbenchFilters.sceneName !== DEFAULT_WORKBENCH_FILTERS.sceneName ||
      workbenchFilters.statusLabel !== DEFAULT_WORKBENCH_FILTERS.statusLabel ||
      workbenchFilters.searchKeyword.trim() !== DEFAULT_WORKBENCH_FILTERS.searchKeyword,
    [workbenchFilters],
  );
  const searchResults = useMemo<FdeWorkbenchSearchResultItem[]>(() => {
    const buildOwnerLabel = (ownerId: string | null | undefined): string =>
      ownerId ? teamMemberNameMap.get(ownerId) ?? "未命名成员" : "待分配";

    return [
      ...dashboardFilteredLeads.map(item => ({
        id: `lead-result-${item.id}`,
        moduleLabel: "线索工单",
        ownerLabel: buildOwnerLabel(item.assignedToId),
        statusLabel: item.status,
        subtitle: `${item.source} · ${item.interestedScenes.join(" / ") || "待定义试点场景"}`,
        title: item.companyName,
        entityId: item.id,
        entityType: "lead" as const,
        tabKey: "leads" as const,
      })),
      ...dashboardFilteredOpportunities.map(item => ({
        id: `opportunity-result-${item.id}`,
        moduleLabel: "商机工作台",
        ownerLabel: buildOwnerLabel(item.ownerId),
        statusLabel: item.stage,
        subtitle: `${item.scenarioName} · ${item.contactName} · ${item.amountWan} 万`,
        title: item.companyName,
        entityId: item.id,
        entityType: "opportunity" as const,
        tabKey: "opportunities" as const,
      })),
      ...dashboardFilteredDeliveryOrders.map(item => ({
        id: `delivery-result-${item.id}`,
        moduleLabel: "配置交付",
        ownerLabel: buildOwnerLabel(item.assignedToId),
        statusLabel: getDeliveryStepLabel(item.currentStep),
        subtitle: `${item.scenarioName} · ${item.orderNo}`,
        title: item.customerName,
        entityId: item.id,
        entityType: "delivery" as const,
        tabKey: "delivery" as const,
      })),
      ...dashboardFilteredOperationsCustomers.map(item => ({
        id: `operations-result-${item.id}`,
        moduleLabel: "运营监控",
        ownerLabel: buildOwnerLabel(item.assignedToId),
        statusLabel: getFdeHealthLabel(item.health),
        subtitle: `${item.scenarioName} · 未关闭告警 ${item.issueCount} 条`,
        title: item.customerName,
        entityId: item.id,
        entityType: "operations" as const,
        tabKey: "operations" as const,
      })),
      ...dashboardFilteredFeedbackAgents.map(item => ({
        id: `feedback-result-${item.id}`,
        moduleLabel: "数据回流",
        ownerLabel: buildOwnerLabel(item.assignedToId),
        statusLabel: "回流待分析",
        subtitle: `${item.customerName} · ${item.scenarioName}`,
        title: item.agentName,
        entityId: item.id,
        entityType: "feedback" as const,
        tabKey: "feedback" as const,
      })),
      ...dashboardFilteredEvolutionTasks.map(item => ({
        id: `evolution-result-${item.id}`,
        moduleLabel: "进化任务",
        ownerLabel: buildOwnerLabel(item.assignedToId),
        statusLabel: item.status,
        subtitle: `${item.customerName} · ${item.versionCandidate}`,
        title: item.agentName,
        entityId: item.id,
        entityType: "evolution" as const,
        tabKey: "evolution" as const,
      })),
      ...dashboardFilteredReleasePushes.map(item => ({
        id: `release-result-${item.id}`,
        moduleLabel: "版本推送",
        ownerLabel: buildOwnerLabel(item.assignedToId),
        statusLabel: item.status,
        subtitle: `${item.targetCustomers.join(" / ") || "待选择客户"} · ${item.version}`,
        title: item.agentName,
        entityId: item.id,
        entityType: "release" as const,
        tabKey: "releases" as const,
      })),
    ].slice(0, 12);
  }, [
    dashboardFilteredDeliveryOrders,
    dashboardFilteredEvolutionTasks,
    dashboardFilteredFeedbackAgents,
    dashboardFilteredLeads,
    dashboardFilteredOpportunities,
    dashboardFilteredOperationsCustomers,
    dashboardFilteredReleasePushes,
    teamMemberNameMap,
  ]);
  const releaseCustomerOptions = useMemo<string[]>(
    () =>
      normalizeCustomerNames([
        ...deliveryOrders.map(item => item.customerName),
        ...operationsCustomers.map(item => item.customerName),
        ...feedbackAgents.map(item => item.customerName),
        ...releasePushes.flatMap(item => item.availableCustomers),
      ]),
    [deliveryOrders, feedbackAgents, operationsCustomers, releasePushes],
  );
  const todoItems = useMemo<FdeWorkbenchTodoItem[]>(() => {
    if (activeRole === "leader") {
      const unassignedLeads = leads.filter(
        item =>
          item.assignedToId === null && !["已转商机", "已放弃"].includes(item.status),
      );
      const activeOpportunityItems = opportunities.filter(item => item.stage !== "已成交");
      const pendingBlockers = deliveryOrders.flatMap(order =>
        order.blockers
          .filter(blocker => blocker.status !== "已解决")
          .map(blocker => ({
            blocker,
            order,
          })),
      );
      const pendingAlerts = operationsCustomers.flatMap(customer =>
        customer.alerts
          .filter(alert => alert.status !== "已关闭")
          .map(alert => ({
            alert,
            customer,
          })),
      );
      const reviewTasks = evolutionTasks.filter(item => item.status === "待审核");
      const pendingReleases = releasePushes.filter(item =>
        ["待发布", "已暂停"].includes(item.status),
      );

      return [
        createTodoItem(
          "leader-unassigned-leads",
          "待分配线索",
          unassignedLeads.length
            ? `首条待分配：${unassignedLeads[0].companyName} · ${unassignedLeads[0].source}`
            : "当前没有待分配线索。",
          unassignedLeads.length,
          {
            entityId: unassignedLeads[0]?.id ?? selectedLeadId,
            entityType: "lead",
            tabKey: "leads",
          },
          "团队待办",
          "warning",
        ),
        createTodoItem(
          "leader-opportunities",
          "待推进商机",
          activeOpportunityItems.length
            ? `优先推进：${activeOpportunityItems[0].companyName} · ${activeOpportunityItems[0].stage}`
            : "当前商机推进节奏正常。",
          activeOpportunityItems.length,
          {
            entityId: activeOpportunityItems[0]?.id ?? selectedOpportunityId,
            entityType: "opportunity",
            tabKey: "opportunities",
          },
          "团队待办",
          "accent",
        ),
        createTodoItem(
          "leader-blockers",
          "待处理 blocker",
          pendingBlockers.length
            ? `优先处理：${pendingBlockers[0].order.customerName} · ${pendingBlockers[0].blocker.title}`
            : "当前没有未解决的交付 blocker。",
          pendingBlockers.length,
          {
            entityId: pendingBlockers[0]?.order.id ?? selectedDeliveryOrderId,
            entityType: "delivery",
            tabKey: "delivery",
          },
          "团队待办",
          "warning",
        ),
        createTodoItem(
          "leader-alerts",
          "待处理告警",
          pendingAlerts.length
            ? `最高优先：${pendingAlerts[0].customer.customerName} · ${pendingAlerts[0].alert.title}`
            : "当前没有待处理告警。",
          pendingAlerts.length,
          {
            entityId: pendingAlerts[0]?.customer.id ?? selectedOperationsCustomerId,
            entityType: "operations",
            tabKey: "operations",
          },
          "团队待办",
          "warning",
        ),
        createTodoItem(
          "leader-reviews",
          "待审核进化任务",
          reviewTasks.length
            ? `最新待审：${reviewTasks[0].agentName} · ${reviewTasks[0].customerName}`
            : "当前没有待审核进化任务。",
          reviewTasks.length,
          {
            entityId: reviewTasks[0]?.id ?? selectedEvolutionTaskId,
            entityType: "evolution",
            tabKey: "evolution",
          },
          "负责人动作",
          "accent",
        ),
        createTodoItem(
          "leader-releases",
          "待发布版本",
          pendingReleases.length
            ? `最近待发：${pendingReleases[0].agentName} · ${pendingReleases[0].version}`
            : "当前没有待发布版本。",
          pendingReleases.length,
          {
            entityId: pendingReleases[0]?.id ?? selectedReleasePushId,
            entityType: "release",
            tabKey: "releases",
          },
          "负责人动作",
          "success",
        ),
      ];
    }

    const myLeads = roleScopedLeads.filter(item => ["新线索", "跟进中"].includes(item.status));
    const myOpportunities = roleScopedOpportunities.filter(item => item.stage !== "已成交");
    const myBlockers = roleScopedDeliveryOrders.flatMap(order =>
      order.blockers
        .filter(blocker => blocker.status !== "已解决")
        .map(blocker => ({
          blocker,
          order,
        })),
    );
    const myAlerts = roleScopedOperationsCustomers.flatMap(customer =>
      customer.alerts
        .filter(alert => alert.status !== "已关闭")
        .map(alert => ({
          alert,
          customer,
        })),
    );
    const myEvolutionTasks = roleScopedEvolutionTasks.filter(item =>
      ["排队中", "训练中", "已暂停", "已驳回"].includes(item.status),
    );
    const myPendingReleases = roleScopedReleasePushes.filter(item =>
      ["待发布", "已暂停"].includes(item.status),
    );

    return [
      createTodoItem(
        "engineer-leads",
        "我的线索跟进",
        myLeads.length
          ? `优先跟进：${myLeads[0].companyName} · ${myLeads[0].nextFollowUpAt || "待补回访时间"}`
          : "当前没有需要跟进的线索。",
        myLeads.length,
        {
          entityId: myLeads[0]?.id ?? selectedLeadId,
          entityType: "lead",
          tabKey: "leads",
        },
        "我的待办",
        "accent",
      ),
      createTodoItem(
        "engineer-opportunities",
        "我的商机推进",
        myOpportunities.length
          ? `最近推进：${myOpportunities[0].companyName} · ${myOpportunities[0].stage}`
          : "当前没有待推进商机。",
        myOpportunities.length,
        {
          entityId: myOpportunities[0]?.id ?? selectedOpportunityId,
          entityType: "opportunity",
          tabKey: "opportunities",
        },
        "我的待办",
        "accent",
      ),
      createTodoItem(
        "engineer-blockers",
        "我的 blocker",
        myBlockers.length
          ? `优先处理：${myBlockers[0].order.customerName} · ${myBlockers[0].blocker.title}`
          : "当前没有待处理 blocker。",
        myBlockers.length,
        {
          entityId: myBlockers[0]?.order.id ?? selectedDeliveryOrderId,
          entityType: "delivery",
          tabKey: "delivery",
        },
        "我的待办",
        "warning",
      ),
      createTodoItem(
        "engineer-alerts",
        "我的告警处理",
        myAlerts.length
          ? `当前告警：${myAlerts[0].customer.customerName} · ${myAlerts[0].alert.title}`
          : "当前没有待处理告警。",
        myAlerts.length,
        {
          entityId: myAlerts[0]?.customer.id ?? selectedOperationsCustomerId,
          entityType: "operations",
          tabKey: "operations",
        },
        "我的待办",
        "warning",
      ),
      createTodoItem(
        "engineer-evolution",
        "我的进化任务",
        myEvolutionTasks.length
          ? `最近任务：${myEvolutionTasks[0].agentName} · ${myEvolutionTasks[0].status}`
          : "当前没有需要推进的进化任务。",
        myEvolutionTasks.length,
        {
          entityId: myEvolutionTasks[0]?.id ?? selectedEvolutionTaskId,
          entityType: "evolution",
          tabKey: "evolution",
        },
        "我的待办",
        "accent",
      ),
      createTodoItem(
        "engineer-releases",
        "我的待发布版本",
        myPendingReleases.length
          ? `准备发布：${myPendingReleases[0].agentName} · ${myPendingReleases[0].version}`
          : "当前没有待发布版本。",
        myPendingReleases.length,
        {
          entityId: myPendingReleases[0]?.id ?? selectedReleasePushId,
          entityType: "release",
          tabKey: "releases",
        },
        "我的待办",
        "success",
      ),
    ];
  }, [
    activeRole,
    deliveryOrders,
    evolutionTasks,
    leads,
    opportunities,
    operationsCustomers,
    releasePushes,
    roleScopedDeliveryOrders,
    roleScopedEvolutionTasks,
    roleScopedLeads,
    roleScopedOperationsCustomers,
    roleScopedOpportunities,
    roleScopedReleasePushes,
    selectedDeliveryOrderId,
    selectedEvolutionTaskId,
    selectedLeadId,
    selectedOperationsCustomerId,
    selectedOpportunityId,
    selectedReleasePushId,
  ]);
  const activityFeed = useMemo<FdeWorkbenchActivityItem[]>(() => {
    const leadActivities = dashboardFilteredLeads.flatMap(item =>
      item.timeline.slice(0, 2).map(timelineItem => ({
        id: `${item.id}-${timelineItem.id}`,
        title: timelineItem.title,
        detail: `${item.companyName} · ${timelineItem.detail}`,
        createdAt: timelineItem.createdAt,
        moduleLabel: "线索工单",
        entityId: item.id,
        entityType: "lead" as const,
        tabKey: "leads" as const,
      })),
    );
    const opportunityActivities = dashboardFilteredOpportunities.flatMap(item =>
      item.timeline.slice(0, 2).map(timelineItem => ({
        id: `${item.id}-${timelineItem.id}`,
        title: timelineItem.title,
        detail: `${item.companyName} · ${timelineItem.detail}`,
        createdAt: timelineItem.createdAt,
        moduleLabel: "商机工作台",
        entityId: item.id,
        entityType: "opportunity" as const,
        tabKey: "opportunities" as const,
      })),
    );
    const deliveryActivities = dashboardFilteredDeliveryOrders.map(item => ({
      id: `${item.id}-delivery-progress`,
      title: `交付推进 · ${getDeliveryStepLabel(item.currentStep)}`,
      detail: `${item.customerName} · 当前进度 ${item.stepProgress}%`,
      createdAt: item.createdAt,
      moduleLabel: "配置交付",
      entityId: item.id,
      entityType: "delivery" as const,
      tabKey: "delivery" as const,
    }));
    const feedbackActivities = dashboardFilteredFeedbackAgents.map(item => ({
      id: `${item.id}-feedback-focus`,
      title: `回流分析 · ${item.agentName}`,
      detail: `${item.customerName} · ${item.recommendation}`,
      createdAt: item.lastEvolvedAt,
      moduleLabel: "数据回流",
      entityId: item.id,
      entityType: "feedback" as const,
      tabKey: "feedback" as const,
    }));
    const evolutionActivities = dashboardFilteredEvolutionTasks.flatMap(item =>
      item.timeline.slice(0, 2).map(timelineItem => ({
        id: `${item.id}-${timelineItem.id}`,
        title: timelineItem.title,
        detail: `${item.customerName} · ${timelineItem.detail}`,
        createdAt: timelineItem.createdAt,
        moduleLabel: "进化任务",
        entityId: item.id,
        entityType: "evolution" as const,
        tabKey: "evolution" as const,
      })),
    );
    const releaseActivities = dashboardFilteredReleasePushes.flatMap(item =>
      item.timeline.slice(0, 2).map(timelineItem => ({
        id: `${item.id}-${timelineItem.id}`,
        title: timelineItem.title,
        detail: `${item.agentName} ${item.version} · ${timelineItem.detail}`,
        createdAt: timelineItem.createdAt,
        moduleLabel: "版本推送",
        entityId: item.id,
        entityType: "release" as const,
        tabKey: "releases" as const,
      })),
    );
    const alertActivities = dashboardFilteredOperationsCustomers.flatMap(customer =>
      customer.alerts
        .filter(alert => alert.status !== "已关闭")
        .map(alert => ({
          id: `${customer.id}-${alert.id}`,
          title: `告警待处理 · ${alert.title}`,
          detail: `${customer.customerName} · ${alert.detail}`,
          createdAt: alert.createdAt,
          moduleLabel: "运营监控",
          entityId: customer.id,
          entityType: "operations" as const,
          tabKey: "operations" as const,
        })),
    );

    return [
      ...leadActivities,
      ...opportunityActivities,
      ...deliveryActivities,
      ...feedbackActivities,
      ...evolutionActivities,
      ...releaseActivities,
      ...alertActivities,
    ]
      .sort(compareByDateTimeDesc)
      .slice(0, 8);
  }, [
    dashboardFilteredDeliveryOrders,
    dashboardFilteredEvolutionTasks,
    dashboardFilteredFeedbackAgents,
    dashboardFilteredLeads,
    dashboardFilteredOperationsCustomers,
    dashboardFilteredOpportunities,
    dashboardFilteredReleasePushes,
  ]);
  const resetWorkbenchFilters = useCallback((): void => {
    setWorkbenchFilters(DEFAULT_WORKBENCH_FILTERS);
  }, []);
  const setWorkbenchFilterOwnerId = useCallback((ownerId: string): void => {
    setWorkbenchFilters(previous => ({
      ...previous,
      ownerId,
    }));
  }, []);
  const setWorkbenchFilterSceneName = useCallback((sceneName: string): void => {
    setWorkbenchFilters(previous => ({
      ...previous,
      sceneName,
    }));
  }, []);
  const setWorkbenchFilterSearchKeyword = useCallback((keyword: string): void => {
    setWorkbenchFilters(previous => ({
      ...previous,
      searchKeyword: keyword,
    }));
  }, []);
  const setWorkbenchFilterStatusLabel = useCallback((statusLabel: string): void => {
    setWorkbenchFilters(previous => ({
      ...previous,
      statusLabel,
    }));
  }, []);

  const createLead = useCallback((payload: FdeLeadFormState): void => {
    const createdAt = getCurrentDateTime();
    const nextLead: FdeLeadItem = {
      id: buildId("lead"),
      companyName: payload.companyName.trim(),
      contactName: payload.contactName.trim(),
      phone: payload.phone.trim(),
      interestedScenes: payload.interestedScenes,
      source: payload.source.trim(),
      createdAt,
      status: "新线索",
      assignedToId: payload.assignedToId,
      priority: payload.priority,
      budgetLabel: payload.budgetLabel.trim() || "待确认预算",
      nextFollowUpAt: payload.nextFollowUpAt.trim(),
      lastFollowUpAt: createdAt,
      summary: payload.summary.trim(),
      remark: payload.remark.trim(),
      timeline: [
        createTimelineItem(
          "线索创建",
          "已由 FDE 主动录入线索工单，等待后续跟进。",
          createdAt,
        ),
      ],
    };

    setLeads(previous => [nextLead, ...previous]);
    setSelectedLeadId(nextLead.id);
  }, []);

  const assignLead = useCallback((leadId: string, memberId: string | null): void => {
    const assignedMemberName = memberId
      ? FDE_TEAM_MEMBERS.find(item => item.id === memberId)?.name ?? "待分配"
      : "待分配";

    setLeads(previous =>
      previous.map(item =>
        item.id === leadId
          ? {
              ...item,
              assignedToId: memberId,
              timeline: [
                createTimelineItem("负责人调整", `当前跟进人已更新为 ${assignedMemberName}。`),
                ...item.timeline,
              ],
            }
          : item,
      ),
    );
  }, []);

  const updateLeadStatus = useCallback(
    (leadId: string, status: FdeLeadStatus): void => {
      const updatedAt = getCurrentDateTime();

      setLeads(previous =>
        previous.map(item => {
          if (item.id !== leadId) {
            return item;
          }

          if (item.status === status) {
            return item;
          }

          const statusDetail =
            status === "跟进中"
              ? "已开始持续跟进，并补充下一步回访计划。"
              : status === "已放弃"
                ? "线索暂不继续推进，已移出当前重点跟进范围。"
                : "线索状态已更新。";

          return {
            ...item,
            status,
            lastFollowUpAt: updatedAt,
            nextFollowUpAt: status === "已放弃" ? "" : item.nextFollowUpAt,
            timeline: [
              createTimelineItem(`状态更新为${status}`, statusDetail, updatedAt),
              ...item.timeline,
            ],
          };
        }),
      );
    },
    [],
  );

  const convertLeadToOpportunity = useCallback(
    (leadId: string): string | null => {
      const convertedAt = getCurrentDateTime();
      const targetLead = leads.find(item => item.id === leadId);
      if (!targetLead) {
        return null;
      }

      const existingOpportunity = opportunities.find(item => item.sourceLeadId === leadId);
      const nextOpportunityId = existingOpportunity?.id ?? buildId("opp");

      setLeads(previous =>
        previous.map(item =>
          item.id === leadId
            ? {
                ...item,
                status: "已转商机",
                lastFollowUpAt: convertedAt,
                nextFollowUpAt: "",
                timeline:
                  item.status === "已转商机"
                    ? item.timeline
                    : [
                        createTimelineItem(
                          "线索转商机",
                          "该线索已转入商机工作台继续推进。",
                          convertedAt,
                        ),
                        ...item.timeline,
                      ],
              }
            : item,
        ),
      );

      if (existingOpportunity) {
        setSelectedOpportunityId(existingOpportunity.id);
        return existingOpportunity.id;
      }

      const nextOpportunity = {
        ...createOpportunityFromLead(targetLead, convertedAt),
        id: nextOpportunityId,
      };

      setOpportunities(previous => [nextOpportunity, ...previous]);
      setSelectedOpportunityId(nextOpportunity.id);
      return nextOpportunity.id;
    },
    [leads, opportunities],
  );

  const updateOpportunityStage = useCallback(
    (opportunityId: string, direction: "next" | "previous"): FdeOpportunityStage | null => {
      const targetOpportunity = opportunities.find(item => item.id === opportunityId);
      if (!targetOpportunity) {
        return null;
      }

      const currentIndex = FDE_OPPORTUNITY_STAGE_ORDER.findIndex(
        item => item === targetOpportunity.stage,
      );
      const nextIndex =
        direction === "next"
          ? Math.min(FDE_OPPORTUNITY_STAGE_ORDER.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
      const nextStage = FDE_OPPORTUNITY_STAGE_ORDER[nextIndex];

      if (nextStage === targetOpportunity.stage) {
        return nextStage;
      }

      const updatedAt = getCurrentDateTime();
      const timelineTitle = direction === "next" ? "推进商机阶段" : "回退商机阶段";
      const timelineDetail = `商机阶段已从 ${targetOpportunity.stage} 调整为 ${nextStage}。`;

      setOpportunities(previous =>
        previous.map(item =>
          item.id === opportunityId
            ? {
                ...item,
                stage: nextStage,
                winRate: resolveOpportunityWinRate(nextStage),
                nextAction:
                  nextStage === "已成交" ? "进入配置交付与设备发货" : item.nextAction,
                nextActionDate:
                  nextStage === "已成交" ? getCurrentDate() : item.nextActionDate,
                timeline: [
                  createTimelineItem(timelineTitle, timelineDetail, updatedAt),
                  ...item.timeline,
                ],
              }
            : item,
        ),
      );

      return nextStage;
    },
    [opportunities],
  );

  const updateOpportunityFollowUp = useCallback(
    (opportunityId: string, payload: FdeOpportunityFollowUpPayload): void => {
      const updatedAt = getCurrentDateTime();

      setOpportunities(previous =>
        previous.map(item =>
          item.id === opportunityId
            ? {
                ...item,
                amountWan: payload.amountWan,
                blockers: payload.blockers,
                budgetLabel: payload.budgetLabel.trim(),
                estimatedSignDate: payload.estimatedSignDate.trim(),
                nextAction: payload.nextAction.trim(),
                nextActionDate: payload.nextActionDate.trim(),
                riskLevel: payload.riskLevel,
                summary: payload.summary.trim(),
                timeline: [
                  createTimelineItem(
                    "更新跟进计划",
                    `下一动作已更新为“${payload.nextAction.trim() || "待补充"}”，预计推进时间 ${
                      payload.nextActionDate.trim() || "待确认"
                    }。`,
                    updatedAt,
                  ),
                  ...item.timeline,
                ],
              }
            : item,
        ),
      );
    },
    [],
  );

  const convertOpportunityToDelivery = useCallback(
    (opportunityId: string): string | null => {
      const targetOpportunity = opportunities.find(item => item.id === opportunityId);
      if (!targetOpportunity) {
        return null;
      }

      const existingOrder = deliveryOrders.find(item => item.sourceOpportunityId === opportunityId);
      if (existingOrder) {
        setSelectedDeliveryOrderId(existingOrder.id);
        return existingOrder.id;
      }

      const convertedAt = getCurrentDateTime();
      const nextOrder = createDeliveryOrderFromOpportunity(targetOpportunity, convertedAt);

      setDeliveryOrders(previous => [nextOrder, ...previous]);
      setSelectedDeliveryOrderId(nextOrder.id);
      setOpportunities(previous =>
        previous.map(item =>
          item.id === opportunityId
            ? {
                ...item,
                stage: "已成交",
                winRate: 100,
                nextAction: "进入配置交付与设备发货",
                nextActionDate: getCurrentDate(),
                timeline: [
                  createTimelineItem(
                    "转入配置交付",
                    `已创建交付工单 ${nextOrder.orderNo}，进入配置交付阶段。`,
                    convertedAt,
                  ),
                  ...item.timeline,
                ],
              }
            : item,
        ),
      );

      return nextOrder.id;
    },
    [deliveryOrders, opportunities],
  );

  const updateDeliveryStep = useCallback(
    (orderId: string, direction: "next" | "previous"): FdeDeliveryStepKey | null => {
      const targetOrder = deliveryOrders.find(item => item.id === orderId);
      if (!targetOrder) {
        return null;
      }

      const currentIndex = getFdeDeliveryStepIndex(targetOrder.currentStep);
      const nextIndex =
        direction === "next"
          ? Math.min(currentIndex + 1, FDE_DELIVERY_STEPS.length - 1)
          : Math.max(currentIndex - 1, 0);
      const nextStep = FDE_DELIVERY_STEPS[nextIndex]?.key ?? targetOrder.currentStep;

      if (nextStep === targetOrder.currentStep) {
        return nextStep;
      }

      setDeliveryOrders(previous =>
        previous.map(item =>
          item.id === orderId
            ? {
                ...item,
                currentStep: nextStep,
                stepProgress: resolveDeliveryStepProgress(nextStep),
              }
            : item,
        ),
      );

      return nextStep;
    },
    [deliveryOrders],
  );

  const updateDeliveryOrder = useCallback(
    (orderId: string, payload: FdeDeliveryOrderUpdatePayload): void => {
      setDeliveryOrders(previous =>
        previous.map(item =>
          item.id === orderId
            ? {
                ...item,
                acceptance: payload.acceptance,
                apiIntegrations: payload.apiIntegrations,
                apiTargets: payload.apiIntegrations.map(apiItem => apiItem.name),
                deviceConfig: payload.deviceConfig,
                expertNames: payload.expertNames,
                launchTargetDate: payload.launchTargetDate.trim(),
                memberCount: payload.memberCount,
                memberInit: payload.memberInit,
                preflightChecks: payload.preflightChecks,
              }
            : item,
        ),
      );
    },
    [],
  );

  const addDeliveryBlocker = useCallback(
    (orderId: string, blocker: Omit<FdeDeliveryBlockerItem, "id">): void => {
      const nextBlocker: FdeDeliveryBlockerItem = {
        ...blocker,
        id: buildId("delivery-blocker"),
      };

      setDeliveryOrders(previous =>
        previous.map(item =>
          item.id === orderId
            ? {
                ...item,
                blockers: [nextBlocker, ...item.blockers],
              }
            : item,
        ),
      );
    },
    [],
  );

  const updateDeliveryBlockerStatus = useCallback(
    (orderId: string, blockerId: string, status: FdeDeliveryBlockerStatus): void => {
      setDeliveryOrders(previous =>
        previous.map(item =>
          item.id === orderId
            ? {
                ...item,
                blockers: item.blockers.map(blocker =>
                  blocker.id === blockerId
                    ? {
                        ...blocker,
                        status,
                      }
                    : blocker,
                ),
              }
            : item,
        ),
      );
    },
    [],
  );

  const updateOperationsAlertStatus = useCallback(
    (customerId: string, alertId: string, status: FdeAlertStatus): void => {
      setOperationsCustomers(previous =>
        previous.map(item => {
          if (item.id !== customerId) {
            return item;
          }

          const nextAlerts = item.alerts.map(alert =>
            alert.id === alertId
              ? {
                  ...alert,
                  status,
                }
              : alert,
          );

          return {
            ...item,
            alerts: nextAlerts,
            issueCount: nextAlerts.filter(alert => alert.status !== "已关闭").length,
          };
        }),
      );
    },
    [],
  );

  const assignOperationsAlert = useCallback(
    (customerId: string, alertId: string, ownerId: string): void => {
      setOperationsCustomers(previous =>
        previous.map(item => {
          if (item.id !== customerId) {
            return item;
          }

          return {
            ...item,
            alerts: item.alerts.map(alert =>
              alert.id === alertId
                ? {
                    ...alert,
                    ownerId,
                  }
                : alert,
            ),
          };
        }),
      );
    },
    [],
  );

  const recordOperationsAlertResolution = useCallback(
    (customerId: string, alertId: string, resolution: string): void => {
      setOperationsCustomers(previous =>
        previous.map(item => {
          if (item.id !== customerId) {
            return item;
          }

          return {
            ...item,
            alerts: item.alerts.map(alert =>
              alert.id === alertId
                ? {
                    ...alert,
                    resolution: resolution.trim(),
                  }
                : alert,
            ),
          };
        }),
      );
    },
    [],
  );

  const triggerEvolution = useCallback(
    (agentId: string, payload?: FdeEvolutionCreatePayload): string | null => {
      const targetAgent = feedbackAgents.find(item => item.id === agentId);
      if (!targetAgent) {
        return null;
      }

      const selectedSignals =
        payload?.signalIds.length
          ? targetAgent.issueSignals.filter(item => payload.signalIds.includes(item.id))
          : targetAgent.issueSignals;
      const sourceSignalTitles = selectedSignals.map(item => item.title);
      const changedSkills = Array.from(new Set(selectedSignals.map(item => item.impactedSkill)));
      const diffSummary = selectedSignals.length
        ? `本轮聚焦 ${sourceSignalTitles.join(" / ")}，预计调整 ${changedSkills.join(" / ")}。`
        : "本轮按默认回流建议补齐问题信号。";
      const manualNote = payload?.manualNote.trim() ?? "";
      let nextTaskId: string | null = null;

      setEvolutionTasks(previous => {
        const hasPendingTask = previous.some(
          item =>
            item.agentName === targetAgent.agentName &&
            item.customerName === targetAgent.customerName &&
            isEvolutionTaskOpen(item.status) &&
            item.sourceSignalTitles.some(title => sourceSignalTitles.includes(title)),
        );

        if (hasPendingTask) {
          const existingTask = previous.find(
            item =>
              item.agentName === targetAgent.agentName &&
              item.customerName === targetAgent.customerName &&
              isEvolutionTaskOpen(item.status) &&
              item.sourceSignalTitles.some(title => sourceSignalTitles.includes(title)),
          );
          nextTaskId = existingTask?.id ?? null;
          return previous;
        }

        const createdAt = getCurrentDateTime();
        const nextTask: FdeEvolutionTaskItem = {
          id: buildId("evo"),
          agentName: targetAgent.agentName,
          customerName: targetAgent.customerName,
          assignedToId: targetAgent.assignedToId,
          status: "排队中",
          progress: 6,
          versionCandidate: createVersionCandidate(),
          source: payload?.signalIds.length ? "部分信号触发" : "手动触发",
          startedAt: createdAt,
          expectedFinishAt: "预计 24 小时内完成",
          submittedAt: "",
          reviewedAt: "",
          reviewedById: "",
          releaseId: null,
          changedSkills: changedSkills.length ? changedSkills : targetAgent.skillTags,
          sourceSignalIds: selectedSignals.map(item => item.id),
          sourceSignalTitles,
          diffSummary,
          manualNote,
          summary: `基于 ${targetAgent.customerName} 最新回流数据，准备对 ${targetAgent.agentName} 发起进化。${
            manualNote ? ` 备注：${manualNote}` : ""
          }`,
          reviewRecords: [],
          timeline: [
            createTimelineItem(
              "创建任务",
              `已基于 ${targetAgent.customerName} 的回流信号创建进化任务。`,
              createdAt,
            ),
          ],
        };

        setSelectedEvolutionTaskId(nextTask.id);
        nextTaskId = nextTask.id;
        return [nextTask, ...previous];
      });

      return nextTaskId;
    },
    [feedbackAgents],
  );

  const startEvolutionTask = useCallback((taskId: string): FdeEvolutionTaskStatus | null => {
    const updatedAt = getCurrentDateTime();
    let nextStatus: FdeEvolutionTaskStatus | null = null;

    setEvolutionTasks(previous =>
      previous.map(item => {
        if (item.id !== taskId) {
          return item;
        }

        if (!["排队中", "已暂停"].includes(item.status)) {
          return item;
        }

        nextStatus = "训练中";
        return {
          ...item,
          status: "训练中",
          progress: Math.max(item.progress, 24),
          expectedFinishAt: "预计 12 小时内完成",
          timeline: [
            createTimelineItem(
              "开始训练",
              item.status === "已暂停"
                ? "任务已从暂停状态恢复，继续训练当前候选版本。"
                : "任务已进入训练阶段，正在生成新的候选版本。",
              updatedAt,
            ),
            ...item.timeline,
          ],
        };
      }),
    );

    return nextStatus;
  }, []);

  const pauseEvolutionTask = useCallback((taskId: string): FdeEvolutionTaskStatus | null => {
    const updatedAt = getCurrentDateTime();
    let nextStatus: FdeEvolutionTaskStatus | null = null;

    setEvolutionTasks(previous =>
      previous.map(item => {
        if (item.id !== taskId) {
          return item;
        }

        if (item.status !== "训练中") {
          return item;
        }

        nextStatus = "已暂停";
        return {
          ...item,
          status: "已暂停",
          timeline: [
            createTimelineItem("暂停训练", "任务已暂时挂起，等待进一步处理。", updatedAt),
            ...item.timeline,
          ],
        };
      }),
    );

    return nextStatus;
  }, []);

  const retryEvolutionTask = useCallback((taskId: string): FdeEvolutionTaskStatus | null => {
    const updatedAt = getCurrentDateTime();
    let nextStatus: FdeEvolutionTaskStatus | null = null;

    setEvolutionTasks(previous =>
      previous.map(item => {
        if (item.id !== taskId) {
          return item;
        }

        if (!["已驳回", "已终止"].includes(item.status)) {
          return item;
        }

        nextStatus = "训练中";
        return {
          ...item,
          status: "训练中",
          progress: 18,
          startedAt: updatedAt,
          expectedFinishAt: "预计 24 小时内完成",
          submittedAt: "",
          reviewedAt: "",
          reviewedById: "",
          timeline: [
            createTimelineItem(
              "重新训练",
              "任务已重新进入训练阶段，将基于当前信号重新生成候选版本。",
              updatedAt,
            ),
            ...item.timeline,
          ],
        };
      }),
    );

    return nextStatus;
  }, []);

  const terminateEvolutionTask = useCallback((taskId: string): FdeEvolutionTaskStatus | null => {
    const updatedAt = getCurrentDateTime();
    let nextStatus: FdeEvolutionTaskStatus | null = null;

    setEvolutionTasks(previous =>
      previous.map(item => {
        if (item.id !== taskId) {
          return item;
        }

        if (["已完成", "已终止"].includes(item.status)) {
          return item;
        }

        nextStatus = "已终止";
        return {
          ...item,
          status: "已终止",
          timeline: [
            createTimelineItem("终止任务", "任务已被手动终止，当前候选版本不再继续推进。", updatedAt),
            ...item.timeline,
          ],
        };
      }),
    );

    return nextStatus;
  }, []);

  const submitEvolutionTaskReview = useCallback(
    (taskId: string): FdeEvolutionTaskStatus | null => {
      const updatedAt = getCurrentDateTime();
      let nextStatus: FdeEvolutionTaskStatus | null = null;

      setEvolutionTasks(previous =>
        previous.map(item => {
          if (item.id !== taskId) {
            return item;
          }

          if (!["训练中", "已暂停"].includes(item.status)) {
            return item;
          }

          nextStatus = "待审核";
          return {
            ...item,
            status: "待审核",
            progress: 100,
            submittedAt: updatedAt,
            timeline: [
              createTimelineItem(
                "提交审核",
                "候选版本已完成训练，等待团队负责人审核。",
                updatedAt,
              ),
              ...item.timeline,
            ],
          };
        }),
      );

      return nextStatus;
    },
    [],
  );

  const reviewEvolutionTask = useCallback(
    (
      taskId: string,
      decision: FdeEvolutionReviewDecision,
      note: string,
    ): FdeEvolutionTaskStatus | null => {
      const updatedAt = getCurrentDateTime();
      const trimmedNote = note.trim();
      let nextStatus: FdeEvolutionTaskStatus | null = null;

      setEvolutionTasks(previous =>
        previous.map(item => {
          if (item.id !== taskId) {
            return item;
          }

          if (item.status !== "待审核") {
            return item;
          }

          const reviewStatus: FdeEvolutionTaskStatus = decision === "通过" ? "已完成" : "已驳回";
          nextStatus = reviewStatus;
          return {
            ...item,
            status: reviewStatus,
            reviewedAt: updatedAt,
            reviewedById: LEADER_REVIEWER_ID,
            progress: decision === "通过" ? 100 : 78,
            reviewRecords: [
              {
                id: buildId("review"),
                decision,
                note: trimmedNote,
                reviewedAt: updatedAt,
                reviewerId: LEADER_REVIEWER_ID,
              },
              ...item.reviewRecords,
            ],
            timeline: [
              createTimelineItem(
                decision === "通过" ? "审核通过" : "审核驳回",
                decision === "通过"
                  ? `团队负责人已通过审核。${trimmedNote ? ` 审核意见：${trimmedNote}` : ""}`
                  : `团队负责人已驳回当前候选版本。${trimmedNote ? ` 审核意见：${trimmedNote}` : ""}`,
                updatedAt,
              ),
              ...item.timeline,
            ],
          };
        }),
      );

      return nextStatus;
    },
    [],
  );

  const createReleaseFromEvolutionTask = useCallback(
    (taskId: string): string | null => {
      const targetTask = evolutionTasks.find(item => item.id === taskId);
      if (!targetTask || targetTask.status !== "已完成") {
        return null;
      }

      const existingRelease =
        releasePushes.find(item => item.sourceTaskId === taskId) ??
        (targetTask.releaseId
          ? releasePushes.find(item => item.id === targetTask.releaseId) ?? null
          : null);
      if (existingRelease) {
        setSelectedReleasePushId(existingRelease.id);
        return existingRelease.id;
      }

      const createdAt = getCurrentDateTime();
      const nextRelease = createReleaseFromEvolutionTaskItem(
        targetTask,
        createdAt,
        normalizeCustomerNames([targetTask.customerName, ...releaseCustomerOptions]),
      );

      setReleasePushes(previous => [nextRelease, ...previous]);
      setSelectedReleasePushId(nextRelease.id);
      setEvolutionTasks(previous =>
        previous.map(item =>
          item.id === taskId
            ? {
                ...item,
                releaseId: nextRelease.id,
                timeline: [
                  createTimelineItem(
                    "创建发布单",
                    `已生成版本推送单 ${nextRelease.version}，等待配置灰度与发布范围。`,
                    createdAt,
                  ),
                  ...item.timeline,
                ],
              }
            : item,
        ),
      );

      return nextRelease.id;
    },
    [evolutionTasks, releaseCustomerOptions, releasePushes],
  );

  const updateReleasePush = useCallback(
    (releaseId: string, payload: FdeReleasePushUpdatePayload): boolean => {
      const updatedAt = getCurrentDateTime();
      const targetCustomers = normalizeCustomerNames(payload.targetCustomers);
      let didUpdate = false;

      setReleasePushes(previous =>
        previous.map(item => {
          if (item.id !== releaseId) {
            return item;
          }

          if (!["待发布", "已暂停"].includes(item.status) || !targetCustomers.length) {
            return item;
          }

          const nextCustomerResults = syncReleaseCustomerResults(
            item,
            targetCustomers,
            payload.grayPercent,
            updatedAt,
          );
          didUpdate = true;

          return {
            ...item,
            grayPercent: payload.grayPercent,
            targetCustomers,
            availableCustomers: normalizeCustomerNames([...item.availableCustomers, ...targetCustomers]),
            customerResults: nextCustomerResults,
            adoptionRate: calculateReleaseAdoptionRate(nextCustomerResults, targetCustomers),
            releaseSections: item.releaseSections.map(section =>
              section.title === "目标客户"
                ? {
                    ...section,
                    items: targetCustomers,
                  }
                : section,
            ),
            timeline: [
              createTimelineItem(
                "更新发布配置",
                `已更新目标客户范围，共 ${targetCustomers.length} 家，灰度比例调整为 ${payload.grayPercent}%。`,
                updatedAt,
              ),
              ...item.timeline,
            ],
          };
        }),
      );

      return didUpdate;
    },
    [],
  );

  const startReleasePush = useCallback((releaseId: string): FdeReleasePushStatus | null => {
    const updatedAt = getCurrentDateTime();
    let nextStatus: FdeReleasePushStatus | null = null;

    setReleasePushes(previous =>
      previous.map(item => {
        if (item.id !== releaseId) {
          return item;
        }

        if (!["待发布", "已暂停"].includes(item.status) || !item.targetCustomers.length) {
          return item;
        }

        const targetCustomerSet = new Set(item.targetCustomers);
        const nextCustomerResults: FdeReleasePushItem["customerResults"] = item.customerResults.map(
          customerItem =>
            targetCustomerSet.has(customerItem.customerName)
              ? {
                  ...customerItem,
                  status: "灰度中",
                  rolloutPercent: item.grayPercent,
                  adoptionRate:
                    customerItem.status === "已暂停"
                      ? Math.max(customerItem.adoptionRate, item.grayPercent)
                      : item.grayPercent,
                  feedback: "已进入灰度观察，关注采纳率与关键指标变化。",
                  lastUpdatedAt: updatedAt,
                }
              : customerItem,
        );

        nextStatus = "灰度中";
        return {
          ...item,
          status: "灰度中",
          pushedAt: updatedAt,
          customerResults: nextCustomerResults,
          adoptionRate: calculateReleaseAdoptionRate(nextCustomerResults, item.targetCustomers),
          timeline: [
            createTimelineItem(
              "开始灰度",
              `已对 ${item.targetCustomers.join(" / ")} 启动 ${item.grayPercent}% 灰度推送。`,
              updatedAt,
            ),
            ...item.timeline,
          ],
        };
      }),
    );

    return nextStatus;
  }, []);

  const pauseReleasePush = useCallback((releaseId: string): FdeReleasePushStatus | null => {
    const updatedAt = getCurrentDateTime();
    let nextStatus: FdeReleasePushStatus | null = null;

    setReleasePushes(previous =>
      previous.map(item => {
        if (item.id !== releaseId) {
          return item;
        }

        if (item.status !== "灰度中") {
          return item;
        }

        const targetCustomerSet = new Set(item.targetCustomers);
        const nextCustomerResults: FdeReleasePushItem["customerResults"] = item.customerResults.map(
          customerItem =>
            targetCustomerSet.has(customerItem.customerName)
              ? {
                  ...customerItem,
                  status: "已暂停",
                  feedback: "当前灰度已暂停，等待进一步配置或恢复。",
                  lastUpdatedAt: updatedAt,
                }
              : customerItem,
        );

        nextStatus = "已暂停";
        return {
          ...item,
          status: "已暂停",
          pushedAt: updatedAt,
          customerResults: nextCustomerResults,
          timeline: [
            createTimelineItem("暂停灰度", "灰度推送已暂停，当前结果已保留。", updatedAt),
            ...item.timeline,
          ],
        };
      }),
    );

    return nextStatus;
  }, []);

  const completeReleasePush = useCallback((releaseId: string): FdeReleasePushStatus | null => {
    const updatedAt = getCurrentDateTime();
    let nextStatus: FdeReleasePushStatus | null = null;

    setReleasePushes(previous =>
      previous.map(item => {
        if (item.id !== releaseId) {
          return item;
        }

        if (!["待发布", "灰度中", "已暂停"].includes(item.status) || !item.targetCustomers.length) {
          return item;
        }

        const targetCustomerSet = new Set(item.targetCustomers);
        const nextCustomerResults: FdeReleasePushItem["customerResults"] = item.customerResults.map(
          customerItem =>
            targetCustomerSet.has(customerItem.customerName)
              ? {
                  ...customerItem,
                  status: "已完成",
                  rolloutPercent: 100,
                  adoptionRate: 100,
                  feedback: "已完成全量发布，客户侧版本切换稳定。",
                  lastUpdatedAt: updatedAt,
                }
              : customerItem,
        );

        nextStatus = "已完成";
        return {
          ...item,
          status: "已完成",
          grayPercent: 100,
          pushedAt: updatedAt,
          customerResults: nextCustomerResults,
          adoptionRate: calculateReleaseAdoptionRate(nextCustomerResults, item.targetCustomers),
          timeline: [
            createTimelineItem(
              "全量发布",
              `已完成 ${item.targetCustomers.join(" / ")} 的全量推送。`,
              updatedAt,
            ),
            ...item.timeline,
          ],
        };
      }),
    );

    return nextStatus;
  }, []);

  const rollbackReleasePush = useCallback(
    (releaseId: string, reason: string): FdeReleasePushStatus | null => {
      const updatedAt = getCurrentDateTime();
      const trimmedReason = reason.trim();
      let nextStatus: FdeReleasePushStatus | null = null;

      setReleasePushes(previous =>
        previous.map(item => {
          if (item.id !== releaseId) {
            return item;
          }

          if (!["灰度中", "已暂停", "已完成"].includes(item.status) || !trimmedReason) {
            return item;
          }

          const targetCustomerSet = new Set(item.targetCustomers);
          const nextCustomerResults: FdeReleasePushItem["customerResults"] = item.customerResults.map(
            customerItem =>
              targetCustomerSet.has(customerItem.customerName)
                ? {
                    ...customerItem,
                    status: "已回退",
                    rolloutPercent: 0,
                    adoptionRate: 0,
                    feedback: `已回退：${trimmedReason}`,
                    lastUpdatedAt: updatedAt,
                  }
                : customerItem,
          );

          nextStatus = "已回退";
          return {
            ...item,
            status: "已回退",
            pushedAt: updatedAt,
            rollbackReason: trimmedReason,
            customerResults: nextCustomerResults,
            adoptionRate: calculateReleaseAdoptionRate(nextCustomerResults, item.targetCustomers),
            timeline: [
              createTimelineItem(
                "执行回退",
                `已回退当前版本。回退原因：${trimmedReason}`,
                updatedAt,
              ),
              ...item.timeline,
            ],
          };
        }),
      );

      return nextStatus;
    },
    [],
  );

  return {
    activeMember,
    activeRole,
    activeTab,
    activityFeed,
    deliveryOrders,
    evolutionTasks,
    feedbackAgents,
    filteredDeliveryOrders,
    filteredEvolutionTasks,
    filteredFeedbackAgents,
    filteredLeads,
    filteredOpportunities,
    filteredOperationsCustomers,
    filteredReleasePushes,
    hasActiveFilters,
    leads,
    opportunities,
    operationsCustomers,
    releasePushes,
    searchResults,
    statusOptions,
    todoItems,
    workbenchFilters,
    selectedDeliveryOrderId,
    selectedEvolutionTaskId,
    selectedFeedbackAgentId,
    selectedLeadId,
    selectedOperationsCustomerId,
    selectedOpportunityId,
    selectedReleasePushId,
    setActiveMemberId,
    setActiveRole,
    setActiveTab,
    setSelectedDeliveryOrderId,
    setSelectedEvolutionTaskId,
    setSelectedFeedbackAgentId,
    setSelectedLeadId,
    setSelectedOperationsCustomerId,
    setSelectedOpportunityId,
    setSelectedReleasePushId,
    resetWorkbenchFilters,
    setWorkbenchFilterOwnerId,
    setWorkbenchFilterSceneName,
    setWorkbenchFilterSearchKeyword,
    setWorkbenchFilterStatusLabel,
    createLead,
    assignLead,
    updateLeadStatus,
    convertLeadToOpportunity,
    updateOpportunityStage,
    updateOpportunityFollowUp,
    convertOpportunityToDelivery,
    updateDeliveryStep,
    updateDeliveryOrder,
    addDeliveryBlocker,
    updateDeliveryBlockerStatus,
    updateOperationsAlertStatus,
    assignOperationsAlert,
    recordOperationsAlertResolution,
    triggerEvolution,
    startEvolutionTask,
    pauseEvolutionTask,
    retryEvolutionTask,
    terminateEvolutionTask,
    submitEvolutionTaskReview,
    reviewEvolutionTask,
    createReleaseFromEvolutionTask,
    updateReleasePush,
    startReleasePush,
    pauseReleasePush,
    completeReleasePush,
    rollbackReleasePush,
    tabs: FDE_WORKBENCH_TABS,
    teamMembers: FDE_TEAM_MEMBERS,
  };
};
