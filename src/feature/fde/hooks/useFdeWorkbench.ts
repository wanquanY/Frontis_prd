import { useCallback, useMemo, useState } from "react";

import {
  FDE_DELIVERY_ORDERS,
  FDE_EVOLUTION_TASKS,
  FDE_FEEDBACK_AGENTS,
  FDE_LEADS,
  FDE_OPERATIONS_CUSTOMERS,
  FDE_OPPORTUNITIES,
  FDE_TEAM_MEMBERS,
  FDE_WORKBENCH_TABS,
} from "@/feature/fde/mockData";
import type {
  FdeDeliveryOrderItem,
  FdeEvolutionTaskItem,
  FdeFeedbackAgentItem,
  FdeLeadFormState,
  FdeLeadItem,
  FdeLeadStatus,
  FdeOperationsCustomerItem,
  FdeOpportunityItem,
  FdeTeamMemberItem,
  FdeWorkbenchRole,
  FdeWorkbenchTabKey,
  UseFdeWorkbenchResult,
} from "@/feature/fde/types";

const buildId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const createDeliveryOrderFromLead = (lead: FdeLeadItem): FdeDeliveryOrderItem => ({
  id: buildId("delivery"),
  leadId: lead.id,
  customerName: lead.companyName,
  orderNo: `FDE-${Date.now()}`,
  assignedToId: lead.assignedToId ?? "fde-engineer-chenlan",
  industry: "待确认行业",
  scenarioName: lead.interestedScenes[0] ?? "待定义试点场景",
  currentStep: "customerConfirm",
  stepProgress: 12,
  orderAmount: lead.budgetLabel || "待确认金额",
  deviceConfig: {
    mode: "云端设备",
    cloudDeviceCount: 1,
    localDeviceCount: 0,
    cloudNodeName: "待确认云端节点",
    localDeviceName: "待确认本地设备",
    pairingCode: "待 OS 提供",
    osOwner: "LeDeep OS",
    region: "待确认地域",
  },
  expertNames: lead.interestedScenes.length ? lead.interestedScenes : ["待配置 AI 专家团"],
  apiTargets: ["待确认 CRM API", "待确认经营数据接口"],
  memberCount: 0,
  createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
  launchTargetDate: "待确认上线时间",
  deliveryNote: lead.remark || lead.summary || "待补充交付说明",
  preflightChecks: ["客户信息确认中", "设备方案待锁定", "成员初始化待开始"],
  completedSteps: [],
  deliveryStatus: "待配置",
});

/**
 * FDE 工作台本地状态与交互逻辑。
 */
export const useFdeWorkbench = (): UseFdeWorkbenchResult => {
  const [activeTab, setActiveTab] = useState<FdeWorkbenchTabKey>("opportunities");
  const [activeRole, setActiveRole] = useState<FdeWorkbenchRole>("leader");
  const engineerMembers = useMemo(
    () => FDE_TEAM_MEMBERS.filter(item => item.role === "engineer"),
    [],
  );
  const [activeMemberId, setActiveMemberId] = useState<string>(engineerMembers[0]?.id ?? "");
  const [opportunities] = useState<FdeOpportunityItem[]>(FDE_OPPORTUNITIES);
  const [leads, setLeads] = useState<FdeLeadItem[]>(FDE_LEADS);
  const [deliveryOrders, setDeliveryOrders] = useState<FdeDeliveryOrderItem[]>(FDE_DELIVERY_ORDERS);
  const [operationsCustomers] = useState<FdeOperationsCustomerItem[]>(FDE_OPERATIONS_CUSTOMERS);
  const [feedbackAgents] = useState<FdeFeedbackAgentItem[]>(FDE_FEEDBACK_AGENTS);
  const [evolutionTasks, setEvolutionTasks] = useState<FdeEvolutionTaskItem[]>(FDE_EVOLUTION_TASKS);
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

  const activeMember = useMemo<FdeTeamMemberItem>(
    () =>
      engineerMembers.find(item => item.id === activeMemberId) ??
      engineerMembers[0] ??
      FDE_TEAM_MEMBERS[0],
    [activeMemberId, engineerMembers],
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

  const filteredOpportunities = useMemo<FdeOpportunityItem[]>(
    () =>
      activeRole === "leader"
        ? opportunities
        : opportunities.filter(item => item.ownerId === activeMember.id),
    [activeMember.id, activeRole, opportunities],
  );
  const filteredLeads = useMemo<FdeLeadItem[]>(() => {
    if (activeRole === "leader") {
      return leads;
    }
    // FDE 员工只能看到跟进中且分配给自己的线索
    return leads.filter(
      item => item.status === "跟进中" && item.assignedToId === activeMember.id,
    );
  }, [activeMember.id, activeRole, leads]);
  const filteredDeliveryOrders = useMemo<FdeDeliveryOrderItem[]>(
    () => filterByPerspective(deliveryOrders),
    [deliveryOrders, filterByPerspective],
  );
  const filteredOperationsCustomers = useMemo<FdeOperationsCustomerItem[]>(
    () => filterByPerspective(operationsCustomers),
    [filterByPerspective, operationsCustomers],
  );
  const filteredFeedbackAgents = useMemo<FdeFeedbackAgentItem[]>(
    () => filterByPerspective(feedbackAgents),
    [feedbackAgents, filterByPerspective],
  );
  const filteredEvolutionTasks = useMemo<FdeEvolutionTaskItem[]>(
    () => filterByPerspective(evolutionTasks),
    [evolutionTasks, filterByPerspective],
  );

  const createLead = useCallback((payload: FdeLeadFormState): void => {
    const nextLead: FdeLeadItem = {
      id: buildId("lead"),
      companyName: payload.companyName.trim(),
      contactName: payload.contactName.trim(),
      phone: payload.phone.trim(),
      interestedScenes: payload.interestedScenes,
      source: payload.source.trim(),
      createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      status: "新线索",
      assignedToId: payload.assignedToId,
      budgetLabel: payload.budgetLabel.trim() || "待确认预算",
      summary: payload.summary.trim(),
      remark: payload.remark.trim(),
      progressList: [],
    };

    setLeads(previous => [nextLead, ...previous]);
    setSelectedLeadId(nextLead.id);
  }, []);

  const assignLead = useCallback((leadId: string, memberId: string | null): void => {
    setLeads(previous =>
      previous.map(item => {
        if (item.id !== leadId) {
          return item;
        }
        // 分配跟进人后，如果是新线索，自动变成跟进中
        const nextStatus = item.status === "新线索" && memberId ? "跟进中" : item.status;
        return { ...item, assignedToId: memberId, status: nextStatus };
      }),
    );
  }, []);

  const updateLeadStatus = useCallback(
    (leadId: string, status: FdeLeadStatus, closedNote?: string): void => {
      setLeads(previous =>
        previous.map(item =>
          item.id === leadId ? { ...item, status, closedNote: closedNote || item.closedNote } : item,
        ),
      );

      if (status !== "已成单") {
        return;
      }

      const targetLead = leads.find(item => item.id === leadId);
      if (!targetLead) {
        return;
      }

      setDeliveryOrders(previous => {
        if (previous.some(item => item.leadId === leadId)) {
          return previous;
        }

        const nextOrder = createDeliveryOrderFromLead(targetLead);
        setSelectedDeliveryOrderId(nextOrder.id);
        return [nextOrder, ...previous];
      });
    },
    [leads],
  );

  const triggerEvolution = useCallback(
    (agentId: string): void => {
      const targetAgent = feedbackAgents.find(item => item.id === agentId);
      if (!targetAgent) {
        return;
      }

      setEvolutionTasks(previous => {
        const hasPendingTask = previous.some(
          item =>
            item.agentName === targetAgent.agentName &&
            item.customerName === targetAgent.customerName &&
            item.status !== "进化已完成" &&
            item.status !== "客户已采纳" &&
            item.status !== "客户未采纳",
        );

        if (hasPendingTask) {
          return previous;
        }

        const nextTask: FdeEvolutionTaskItem = {
          id: buildId("evo"),
          agentName: targetAgent.agentName,
          customerName: targetAgent.customerName,
          assignedToId: targetAgent.assignedToId,
          status: "排队中",
          progress: 6,
          versionCandidate: "vNext",
          source: "手动触发",
          startedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
          expectedFinishAt: "预计 24 小时内完成",
          changedSkills: targetAgent.skills.map(item => item.name),
          summary: `基于 ${targetAgent.customerName} 最新回流数据，准备对 ${targetAgent.agentName} 发起进化。`,
        };

        setSelectedEvolutionTaskId(nextTask.id);
        return [nextTask, ...previous];
      });
    },
    [feedbackAgents],
  );

  const addLeadProgress = useCallback(
    (leadId: string, content: string): void => {
      setLeads(previous =>
        previous.map(item => {
          if (item.id !== leadId) {
            return item;
          }
          const newProgress = {
            id: buildId("progress"),
            content: content.trim(),
            createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
            createdBy: activeMember.id,
          };
          return {
            ...item,
            progressList: [...item.progressList, newProgress],
          };
        }),
      );
    },
    [activeMember.id],
  );

  return {
    activeMember,
    activeRole,
    activeTab,
    deliveryOrders,
    evolutionTasks,
    feedbackAgents,
    filteredDeliveryOrders,
    filteredEvolutionTasks,
    filteredFeedbackAgents,
    filteredLeads,
    filteredOpportunities,
    filteredOperationsCustomers,
    leads,
    opportunities,
    operationsCustomers,
    selectedDeliveryOrderId,
    selectedEvolutionTaskId,
    selectedFeedbackAgentId,
    selectedLeadId,
    selectedOperationsCustomerId,
    selectedOpportunityId,
    setActiveMemberId,
    setActiveRole,
    setActiveTab,
    setSelectedDeliveryOrderId,
    setSelectedEvolutionTaskId,
    setSelectedFeedbackAgentId,
    setSelectedLeadId,
    setSelectedOperationsCustomerId,
    setSelectedOpportunityId,
    createLead,
    assignLead,
    updateLeadStatus,
    addLeadProgress,
    triggerEvolution,
    tabs: FDE_WORKBENCH_TABS,
    teamMembers: FDE_TEAM_MEMBERS,
  };
};
