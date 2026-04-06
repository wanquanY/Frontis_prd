import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FDE_DELIVERY_ORDERS,
  FDE_ORDER_ITEMS,
  FDE_OPERATIONS_CUSTOMERS,
  FDE_OPPORTUNITIES,
  FDE_PRIMARY_LEADER_MEMBER_ID,
  FDE_TEAM_MEMBERS,
  FDE_VERSION_MANAGEMENT_TASKS,
  FDE_WORKBENCH_NAV_GROUPS,
  FDE_WORKBENCH_TABS,
} from "@/feature/fde/mockData";
import type {
  FdeAgentMonitorItem,
  FdeCreateOrderPayload,
  FdeCreateOrderResult,
  FdeCreateDeliveryChangePayload,
  FdeDeliveryChangeRecordItem,
  FdeDeliveryChangeStatus,
  FdeDeliveryOrderItem,
  FdeOrderAgentLineItem,
  FdeOrderDeviceLineItem,
  FdeOrderFulfillmentExecutionRecordItem,
  FdeOrderFulfillmentItem,
  FdeOrderFulfillmentType,
  FdeOrderItem,
  FdeOrderLineItem,
  FdeOrderTokensLineItem,
  FdeOperationsCustomerItem,
  FdeOpportunityItem,
  FdeTeamMemberDraft,
  FdeTeamMemberItem,
  FdeVersionManagementTaskItem,
  FdeWorkbenchTabKey,
  UseFdeWorkbenchResult,
} from "@/feature/fde/types";

const buildId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const canManageTeamMembers = (role: FdeTeamMemberItem["role"]): boolean =>
  role === "leader" || role === "admin";

const FDE_DEVELOPMENT_VISIBLE_KEYS: FdeWorkbenchTabKey[] = [
  "agentDev",
  "skillMarket",
  "agentStore",
  "opsInsights",
];

const getDefaultMemberTitle = (role: FdeTeamMemberDraft["role"]): string => {
  if (role === "leader") {
    return "FDE 团队负责人";
  }

  if (role === "admin") {
    return "FDE 团队管理员";
  }

  return "FDE 成员";
};

const buildTeamMember = (
  payload: FdeTeamMemberDraft,
  sourceLabel: string,
): FdeTeamMemberItem => ({
  id: buildId("fde-member"),
  name: payload.name.trim(),
  title: payload.title.trim() || getDefaultMemberTitle(payload.role),
  phone: payload.phone.trim(),
  role: payload.role,
  status: "online",
  accountStatus: "enabled",
  joinedAt: new Date().toLocaleDateString("zh-CN").replace(/\//g, "-"),
  permissionKeys: payload.permissionKeys,
  sourceLabel,
  focusScenes: payload.focusScenes,
  avatarSeed: payload.name.trim() || `fde-${Date.now()}`,
});

const buildChangeRecordStatusLabel = (order: FdeDeliveryOrderItem): FdeDeliveryChangeStatus => {
  if (order.deliveryStatus === "已交付") {
    return "已完成";
  }

  if (order.completedSteps.length || order.currentStep !== "deviceConfig") {
    return "执行中";
  }

  return "待执行";
};

const buildCustomerAssetSnapshot = (customer: FdeOperationsCustomerItem): string[] => {
  const quotaLines = customer.assetQuotas
    .filter(item => item.label !== "租户席位额度")
    .map(item => `${item.label} ${item.used}/${item.total}${item.unit}`);

  return [...quotaLines, `AI 专家 ${customer.agents.length} 个`, `设备资产 ${customer.devices.length} 台`];
};

const buildChangeRecordFromOrder = (
  order: FdeDeliveryOrderItem,
  beforeSnapshot: string[],
  afterSnapshot: string[],
  completedAt?: string,
): FdeDeliveryChangeRecordItem => ({
  id: order.id,
  orderId: order.orderNo,
  type: order.changeType ?? "追加设备",
  summary: order.deliveryNote,
  detailItems: (order.changeDetailItems ?? []).map(item =>
    item.beforeValue ? `${item.label}：${item.beforeValue} -> ${item.afterValue}` : `${item.label}：${item.afterValue}`,
  ),
  statusLabel: buildChangeRecordStatusLabel(order),
  requestedByName: order.requestedByName ?? "FDE 发起",
  requestedAt: order.createdAt,
  expectedEffectiveAt: order.launchTargetDate,
  beforeSnapshot,
  afterSnapshot,
  completedAt:
    completedAt ??
    (order.deliveryStatus === "已交付"
      ? new Date().toLocaleString("zh-CN", { hour12: false })
      : undefined),
});

const updateQuotaItems = (
  quotas: FdeOperationsCustomerItem["assetQuotas"],
  order: FdeDeliveryOrderItem,
): FdeOperationsCustomerItem["assetQuotas"] =>
  quotas.map(item => {
    const adjustment = order.quotaAdjustments?.find(change => change.label === item.label);

    if (!adjustment) {
      return item;
    }

    return {
      ...item,
      used: item.used + adjustment.delta,
      total: item.total + adjustment.delta,
    };
  });

const appendUniqueAgents = (
  currentAgents: FdeAgentMonitorItem[],
  additions: FdeAgentMonitorItem[],
): FdeAgentMonitorItem[] => {
  const seenNames = new Set(currentAgents.map(item => item.name));
  const nextAgents = [...currentAgents];

  additions.forEach(agent => {
    if (seenNames.has(agent.name)) {
      return;
    }

    nextAgents.push(agent);
    seenNames.add(agent.name);
  });

  return nextAgents;
};

const createOrderNo = (): string => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = now.getTime().toString().slice(-3);
  return `ORD-${date}-${suffix}`;
};

const formatAmountLabel = (value: number): string => `¥ ${value.toLocaleString("zh-CN")}`;

const formatTokenCountLabel = (value: number): string => {
  if (value >= 10000) {
    const normalizedValue = value / 10000;

    return `${Number.isInteger(normalizedValue) ? normalizedValue.toFixed(0) : normalizedValue.toFixed(1)} 万 tokens`;
  }

  return `${value.toLocaleString("zh-CN")} tokens`;
};

const parseNumberLabel = (value: string): number => {
  const normalizedValue = value.replaceAll(",", "");
  const matchedValue = normalizedValue.match(/[\d.]+/);

  return matchedValue ? Number(matchedValue[0]) : 0;
};

const parseTokenCountLabel = (value: string): number => {
  const normalizedValue = value.replaceAll(",", "");
  const wanMatch = normalizedValue.match(/([\d.]+)\s*万/);

  if (wanMatch) {
    return Math.round(Number(wanMatch[1]) * 10000);
  }

  return Math.round(parseNumberLabel(normalizedValue));
};

const isDeviceLineItem = (item: FdeOrderLineItem): item is FdeOrderDeviceLineItem => item.kind === "device";

const isAgentLineItem = (item: FdeOrderLineItem): item is FdeOrderAgentLineItem => item.kind === "agent";

const isTokensLineItem = (item: FdeOrderLineItem): item is FdeOrderTokensLineItem => item.kind === "tokens";

const getTeamMemberNameById = (
  memberId: string,
  members: FdeTeamMemberItem[],
): string =>
  members.find(item => item.id === memberId)?.name ??
  FDE_TEAM_MEMBERS.find(item => item.id === memberId)?.name ??
  "FDE";

const getFulfillmentCreatedActionLabel = (type: FdeOrderFulfillmentType): string => {
  if (type === "首期配置交付") {
    return "创建首期配置交付任务";
  }

  if (type === "设备追加") {
    return "创建设备追加交付单";
  }

  if (type === "Agent追加") {
    return "创建Agent追加交付单";
  }

  return "创建Tokens发放任务";
};

const getFulfillmentStartedActionLabel = (type: FdeOrderFulfillmentType): string => {
  if (type === "首期配置交付") {
    return "开始执行首期配置交付";
  }

  if (type === "设备追加") {
    return "开始执行设备追加交付";
  }

  if (type === "Agent追加") {
    return "开始执行Agent追加交付";
  }

  return "开始处理Tokens发放";
};

const getFulfillmentCompletedActionLabel = (type: FdeOrderFulfillmentType): string => {
  if (type === "首期配置交付") {
    return "完成首期配置交付";
  }

  if (type === "设备追加") {
    return "完成设备追加交付";
  }

  if (type === "Agent追加") {
    return "完成Agent追加交付";
  }

  return "完成Tokens发放";
};

const appendFulfillmentExecutionRecord = (
  records: FdeOrderFulfillmentExecutionRecordItem[],
  record: FdeOrderFulfillmentExecutionRecordItem,
): FdeOrderFulfillmentExecutionRecordItem[] =>
  records.some(item => item.id === record.id) ? records : [...records, record];

const buildFulfillmentStatusFromDelivery = (
  order: FdeDeliveryOrderItem,
): FdeOrderFulfillmentItem["status"] => {
  if (order.deliveryStatus === "已交付") {
    return "已完成";
  }

  if (order.deliveryStatus === "配置中" || order.completedSteps.length) {
    return "处理中";
  }

  return "待处理";
};

const buildOrderStatus = (
  tenantId: string | undefined,
  fulfillmentItems: FdeOrderFulfillmentItem[],
): FdeOrderItem["status"] => {
  if (!tenantId) {
    return "待关联租户";
  }

  if (!fulfillmentItems.length) {
    return "待履约";
  }

  if (fulfillmentItems.every(item => item.status === "已完成")) {
    return "已完成";
  }

  if (fulfillmentItems.some(item => item.status === "处理中")) {
    return "履约中";
  }

  return "待履约";
};

const appendUniqueOrderIds = (currentOrderIds: string[] | undefined, orderId: string): string[] =>
  Array.from(new Set([...(currentOrderIds ?? []), orderId]));

const applyTokenRecharges = (
  customers: FdeOperationsCustomerItem[],
  drafts: Array<{
    amount: number;
    createdAt: string;
    customerId: string;
    operatorName: string;
    recordId: string;
    tokenCount: number;
  }>,
): FdeOperationsCustomerItem[] =>
  customers.map(customer => {
    const targetDrafts = drafts.filter(item => item.customerId === customer.id);

    if (!targetDrafts.length) {
      return customer;
    }

    return targetDrafts.reduce<FdeOperationsCustomerItem>((currentCustomer, draft) => {
      if (currentCustomer.rechargeRecords.some(item => item.id === draft.recordId)) {
        return currentCustomer;
      }

      const nextLimitCount =
        parseTokenCountLabel(currentCustomer.tokenUsage.limitLabel) + draft.tokenCount;
      const nextPointsBalance = parseNumberLabel(currentCustomer.pointsBalanceLabel) + draft.amount;

      return {
        ...currentCustomer,
        pointsBalanceLabel: `${nextPointsBalance.toLocaleString("zh-CN")} 积分`,
        tokenUsage: {
          ...currentCustomer.tokenUsage,
          limitLabel: formatTokenCountLabel(nextLimitCount),
        },
        rechargeRecords: [
          {
            id: draft.recordId,
            rechargeDate: draft.createdAt,
            amountLabel: formatAmountLabel(draft.amount),
            pointsLabel: `+${formatTokenCountLabel(draft.tokenCount)}`,
            channelLabel: "订单发放",
            operatorName: draft.operatorName,
            statusLabel: "已到账",
          },
          ...currentCustomer.rechargeRecords,
        ],
      };
    }, customer);
  });

const appendUniqueAgentPackages = (
  currentPackages: NonNullable<FdeDeliveryOrderItem["agentPackages"]>,
  lineItems: FdeOrderAgentLineItem[],
): NonNullable<FdeDeliveryOrderItem["agentPackages"]> => {
  const existingNames = new Set(currentPackages.map(item => item.name));
  const nextPackages = [...currentPackages];

  lineItems.forEach(item => {
    if (existingNames.has(item.agentName)) {
      return;
    }

    nextPackages.push({
      name: item.agentName,
      releaseVersion: item.releaseVersion,
      sourceLabel: item.sourceLabel,
      statusLabel: "待下发",
      permissionHint: "待确认授权成员",
    });
    existingNames.add(item.agentName);
  });

  return nextPackages;
};

const changeOrderIncludesDevice = (order: FdeDeliveryOrderItem): boolean =>
  order.changeType === "追加设备" || order.changeType === "追加设备与Agent";

const changeOrderIncludesAgent = (order: FdeDeliveryOrderItem): boolean =>
  order.changeType === "追加Agent" || order.changeType === "追加设备与Agent";

const getDeviceLineItemSummary = (lineItems: FdeOrderDeviceLineItem[]): string =>
  lineItems
    .map(item => {
      const unit = item.deviceType === "本地客户端授权" ? "个" : "台";
      return `${item.deviceType} ${item.quantity} ${unit}`;
    })
    .join(" / ");

const getAgentLineItemSummary = (lineItems: FdeOrderAgentLineItem[]): string =>
  Array.from(new Set(lineItems.map(item => item.agentName))).join(" / ");

const buildChangeFulfillmentItem = (
  orderId: string,
  type: Extract<FdeOrderFulfillmentType, "设备追加" | "Agent追加">,
  summary: string,
  deliveryOrder: FdeDeliveryOrderItem,
  members: FdeTeamMemberItem[],
): FdeOrderFulfillmentItem => {
  const status = buildFulfillmentStatusFromDelivery(deliveryOrder);
  const operatorName = getTeamMemberNameById(deliveryOrder.assignedToId, members);
  let executionRecords: FdeOrderFulfillmentExecutionRecordItem[] = [
    {
      id: `${orderId}-${deliveryOrder.id}-${type}-created`,
      actionLabel: getFulfillmentCreatedActionLabel(type),
      resultLabel: status === "待处理" ? "已创建" : "执行中",
      operatorName,
      operatedAt: deliveryOrder.createdAt,
    },
  ];

  if (status === "处理中" || status === "已完成") {
    executionRecords = appendFulfillmentExecutionRecord(executionRecords, {
      id: `${orderId}-${deliveryOrder.id}-${type}-started`,
      actionLabel: getFulfillmentStartedActionLabel(type),
      resultLabel: "执行中",
      operatorName,
      operatedAt: deliveryOrder.createdAt,
    });
  }

  if (status === "已完成") {
    executionRecords = appendFulfillmentExecutionRecord(executionRecords, {
      id: `${orderId}-${deliveryOrder.id}-${type}-completed`,
      actionLabel: getFulfillmentCompletedActionLabel(type),
      resultLabel: "已完成",
      operatorName,
      operatedAt: deliveryOrder.launchTargetDate,
    });
  }

  return {
    id: `${orderId}-${deliveryOrder.id}-${type}`,
    type,
    summary,
    status,
    linkedRecordId: deliveryOrder.id,
    linkedRecordType: "change",
    updatedAt:
      deliveryOrder.deliveryStatus === "已交付"
        ? deliveryOrder.launchTargetDate
        : deliveryOrder.createdAt,
    executionRecords,
  };
};

const buildInitialFulfillmentItems = (
  order: FdeOrderItem,
  tenantOrder: FdeDeliveryOrderItem,
  members: FdeTeamMemberItem[],
): FdeOrderFulfillmentItem[] => {
  const deviceLineItems = order.lineItems.filter(isDeviceLineItem);
  const agentLineItems = order.lineItems.filter(isAgentLineItem);
  const tokenLineItems = order.lineItems.filter(isTokensLineItem);
  const nextItems: FdeOrderFulfillmentItem[] = [];
  const operatorName = getTeamMemberNameById(tenantOrder.assignedToId, members);
  const orderOperatorName = getTeamMemberNameById(order.assignedToId, members);
  const deliveryStatus = buildFulfillmentStatusFromDelivery(tenantOrder);

  if (deviceLineItems.length || agentLineItems.length) {
    nextItems.push({
      id: `${order.id}-fulfillment-delivery`,
      type: "首期配置交付",
      summary: [
        deviceLineItems.length ? `设备 ${deviceLineItems.length} 项` : "",
        agentLineItems.length ? `AI 专家 ${agentLineItems.length} 项` : "",
      ]
        .filter(Boolean)
        .join(" / "),
      status: deliveryStatus,
      linkedRecordId: tenantOrder.id,
      linkedRecordType: "delivery",
      updatedAt: tenantOrder.createdAt,
      executionRecords: [
        {
          id: `${order.id}-fulfillment-delivery-created`,
          actionLabel: getFulfillmentCreatedActionLabel("首期配置交付"),
          resultLabel: deliveryStatus === "待处理" ? "已创建" : "执行中",
          operatorName,
          operatedAt: tenantOrder.createdAt,
        },
      ],
    });
  }

  if (tokenLineItems.length) {
    const tokenCount = tokenLineItems.reduce((total, item) => total + item.tokenCount, 0);

    nextItems.push({
      id: `${order.id}-fulfillment-tokens`,
      type: "Tokens发放",
      summary: formatTokenCountLabel(tokenCount),
      status: "待处理",
      updatedAt: order.createdAt,
      executionRecords: [
        {
          id: `${order.id}-fulfillment-tokens-created`,
          actionLabel: getFulfillmentCreatedActionLabel("Tokens发放"),
          resultLabel: "已创建",
          operatorName: orderOperatorName,
          operatedAt: order.createdAt,
        },
      ],
    });
  }

  return nextItems;
};

const syncOrdersWithDeliveryState = (
  orders: FdeOrderItem[],
  deliveryOrders: FdeDeliveryOrderItem[],
  customers: FdeOperationsCustomerItem[],
  members: FdeTeamMemberItem[],
  operatorName: string,
): { customers: FdeOperationsCustomerItem[]; orders: FdeOrderItem[] } => {
  let nextCustomers = customers;
  const now = new Date().toLocaleString("zh-CN", { hour12: false });

  const nextOrders = orders.map(order => {
    const boundTenant =
      (order.tenantId
        ? deliveryOrders.find(item => item.id === order.tenantId && item.orderKind === "initial")
        : undefined) ??
      deliveryOrders.find(
        item => item.orderKind === "initial" && item.linkedOrderIds?.includes(order.id),
      );

    let nextOrder = boundTenant
      ? {
          ...order,
          customerName: boundTenant.customerName,
          tenantId: boundTenant.id,
          tenantName: boundTenant.tenantName,
          tenantCode: boundTenant.tenantCode,
        }
      : order;
    const linkedChangeOrders = deliveryOrders.filter(
      item => item.orderKind === "change" && item.linkedOrderIds?.includes(order.id),
    );

    let fulfillmentItems = nextOrder.fulfillmentItems.map(item => {
      if (
        item.linkedRecordType === "delivery" ||
        item.linkedRecordType === "change"
      ) {
        const linkedDeliveryOrder = deliveryOrders.find(record => record.id === item.linkedRecordId);

        if (!linkedDeliveryOrder) {
          return item;
        }

        const nextStatus = buildFulfillmentStatusFromDelivery(linkedDeliveryOrder);
        const linkedOperatorName = getTeamMemberNameById(linkedDeliveryOrder.assignedToId, members);
        let executionRecords = appendFulfillmentExecutionRecord(item.executionRecords ?? [], {
          id: `${item.id}-created`,
          actionLabel: getFulfillmentCreatedActionLabel(item.type),
          resultLabel: nextStatus === "待处理" ? "已创建" : "执行中",
          operatorName: linkedOperatorName,
          operatedAt: linkedDeliveryOrder.createdAt,
        });

        if (nextStatus === "处理中" || nextStatus === "已完成") {
          executionRecords = appendFulfillmentExecutionRecord(executionRecords, {
            id: `${item.id}-started`,
            actionLabel: getFulfillmentStartedActionLabel(item.type),
            resultLabel: "执行中",
            operatorName: linkedOperatorName,
            operatedAt: linkedDeliveryOrder.createdAt,
          });
        }

        if (nextStatus === "已完成") {
          executionRecords = appendFulfillmentExecutionRecord(executionRecords, {
            id: `${item.id}-completed`,
            actionLabel: getFulfillmentCompletedActionLabel(item.type),
            resultLabel: "已完成",
            operatorName: linkedOperatorName,
            operatedAt: linkedDeliveryOrder.launchTargetDate,
          });
        }

        return {
          ...item,
          status: nextStatus,
          updatedAt:
            linkedDeliveryOrder.deliveryStatus === "已交付"
              ? linkedDeliveryOrder.launchTargetDate
              : linkedDeliveryOrder.createdAt,
          executionRecords,
        };
      }

      return item;
    });

    if (linkedChangeOrders.length) {
      const deviceLineItems = nextOrder.lineItems.filter(isDeviceLineItem);
      const agentLineItems = nextOrder.lineItems.filter(isAgentLineItem);

      linkedChangeOrders.forEach(changeOrder => {
        if (
          changeOrderIncludesDevice(changeOrder) &&
          deviceLineItems.length &&
          !fulfillmentItems.some(
            item => item.linkedRecordId === changeOrder.id && item.type === "设备追加",
          )
        ) {
          fulfillmentItems = [
            ...fulfillmentItems,
            buildChangeFulfillmentItem(
              nextOrder.id,
              "设备追加",
              getDeviceLineItemSummary(deviceLineItems),
              changeOrder,
              members,
            ),
          ];
        }

        if (
          changeOrderIncludesAgent(changeOrder) &&
          agentLineItems.length &&
          !fulfillmentItems.some(
            item => item.linkedRecordId === changeOrder.id && item.type === "Agent追加",
          )
        ) {
          fulfillmentItems = [
            ...fulfillmentItems,
            buildChangeFulfillmentItem(
              nextOrder.id,
              "Agent追加",
              getAgentLineItemSummary(agentLineItems),
              changeOrder,
              members,
            ),
          ];
        }
      });
    }

    if (boundTenant && !fulfillmentItems.length && !linkedChangeOrders.length) {
      fulfillmentItems = buildInitialFulfillmentItems(nextOrder, boundTenant, members);
    }

    if (
      boundTenant &&
      !fulfillmentItems.some(item => item.type === "首期配置交付") &&
      nextOrder.lineItems.some(item => isDeviceLineItem(item) || isAgentLineItem(item))
    ) {
      fulfillmentItems = [
        {
          id: `${nextOrder.id}-fulfillment-delivery`,
          type: "首期配置交付",
          summary: [
            nextOrder.lineItems.some(isDeviceLineItem) ? "设备交付" : "",
            nextOrder.lineItems.some(isAgentLineItem) ? "AI 专家下发" : "",
          ]
            .filter(Boolean)
            .join(" / "),
          status: buildFulfillmentStatusFromDelivery(boundTenant),
          linkedRecordId: boundTenant.id,
          linkedRecordType: "delivery",
          updatedAt: boundTenant.createdAt,
          executionRecords: [
            {
              id: `${nextOrder.id}-fulfillment-delivery-created`,
              actionLabel: getFulfillmentCreatedActionLabel("首期配置交付"),
              resultLabel:
                buildFulfillmentStatusFromDelivery(boundTenant) === "待处理" ? "已创建" : "执行中",
              operatorName: getTeamMemberNameById(boundTenant.assignedToId, members),
              operatedAt: boundTenant.createdAt,
            },
          ],
        },
        ...fulfillmentItems,
      ];
    }

    if (
      boundTenant &&
      !fulfillmentItems.some(item => item.type === "Tokens发放") &&
      nextOrder.lineItems.some(isTokensLineItem)
    ) {
      const totalTokenCount = nextOrder.lineItems
        .filter(isTokensLineItem)
        .reduce((total, item) => total + item.tokenCount, 0);

      fulfillmentItems = [
        ...fulfillmentItems,
        {
          id: `${nextOrder.id}-fulfillment-tokens`,
          type: "Tokens发放",
          summary: formatTokenCountLabel(totalTokenCount),
          status: "待处理",
          updatedAt: nextOrder.createdAt,
          executionRecords: [
            {
              id: `${nextOrder.id}-fulfillment-tokens-created`,
              actionLabel: getFulfillmentCreatedActionLabel("Tokens发放"),
              resultLabel: "已创建",
              operatorName: getTeamMemberNameById(nextOrder.assignedToId, members),
              operatedAt: nextOrder.createdAt,
            },
          ],
        },
      ];
    }

    if (boundTenant?.deliveryStatus === "已交付") {
      const totalTokenCount = nextOrder.lineItems
        .filter(isTokensLineItem)
        .reduce((total, item) => total + item.tokenCount, 0);
      const totalTokenAmount = nextOrder.lineItems
        .filter(isTokensLineItem)
        .reduce((total, item) => total + item.totalAmount, 0);
      const linkedCustomer = nextCustomers.find(
        item => item.customerName === boundTenant.customerName,
      );

      if (linkedCustomer && totalTokenCount > 0 && totalTokenAmount > 0) {
        fulfillmentItems = fulfillmentItems.map(item => {
          if (item.type !== "Tokens发放") {
            return item;
          }

          if (item.status === "已完成") {
            return {
              ...item,
              executionRecords: appendFulfillmentExecutionRecord(item.executionRecords ?? [], {
                id: `${item.id}-completed`,
                actionLabel: getFulfillmentCompletedActionLabel("Tokens发放"),
                resultLabel: "已完成",
                operatorName,
                operatedAt: item.updatedAt,
              }),
            };
          }

          const recordId = item.linkedRecordId ?? `recharge-${nextOrder.id}`;

          nextCustomers = applyTokenRecharges(nextCustomers, [
            {
              amount: totalTokenAmount,
              createdAt: now,
              customerId: linkedCustomer.id,
              operatorName,
              recordId,
              tokenCount: totalTokenCount,
            },
          ]);

          return {
            ...item,
            status: "已完成",
            linkedRecordId: recordId,
            linkedRecordType: "recharge",
            updatedAt: now,
            executionRecords: appendFulfillmentExecutionRecord(item.executionRecords ?? [], {
              id: `${item.id}-completed`,
              actionLabel: getFulfillmentCompletedActionLabel("Tokens发放"),
              resultLabel: "已完成",
              operatorName,
              operatedAt: now,
            }),
          };
        });
      }
    }

    nextOrder = {
      ...nextOrder,
      fulfillmentItems,
      status: buildOrderStatus(nextOrder.tenantId, fulfillmentItems),
    };

    return nextOrder;
  });

  return { customers: nextCustomers, orders: nextOrders };
};

const INITIAL_FDE_SYNCED_STATE = syncOrdersWithDeliveryState(
  FDE_ORDER_ITEMS,
  FDE_DELIVERY_ORDERS,
  FDE_OPERATIONS_CUSTOMERS,
  FDE_TEAM_MEMBERS,
  FDE_TEAM_MEMBERS[0]?.name ?? "FDE",
);

/**
 * FDE 工作台本地状态与交互逻辑。
 */
export const useFdeWorkbench = (currentUserId?: string): UseFdeWorkbenchResult => {
  const [activeTab, setActiveTab] = useState<FdeWorkbenchTabKey>(
    currentUserId === FDE_PRIMARY_LEADER_MEMBER_ID ? "dashboard" : "delivery",
  );
  const previousUserIdRef = useRef<string | undefined>(currentUserId);
  const [teamMembers, setTeamMembers] = useState<FdeTeamMemberItem[]>(FDE_TEAM_MEMBERS);
  const [opportunities] = useState<FdeOpportunityItem[]>(FDE_OPPORTUNITIES);
  const [orders, setOrders] = useState<FdeOrderItem[]>(INITIAL_FDE_SYNCED_STATE.orders);
  const [deliveryOrders, setDeliveryOrders] = useState<FdeDeliveryOrderItem[]>(FDE_DELIVERY_ORDERS);
  const [operationsCustomers, setOperationsCustomers] =
    useState<FdeOperationsCustomerItem[]>(INITIAL_FDE_SYNCED_STATE.customers);
  const [versionTasks] = useState<FdeVersionManagementTaskItem[]>(FDE_VERSION_MANAGEMENT_TASKS);
  const [selectedOrderManagementId, setSelectedOrderManagementId] = useState<string>(
    INITIAL_FDE_SYNCED_STATE.orders[0]?.id ?? "",
  );
  const [selectedDeliveryOrderId, setSelectedDeliveryOrderId] = useState<string>(
    FDE_DELIVERY_ORDERS[0]?.id ?? "",
  );
  const [selectedOperationsCustomerId, setSelectedOperationsCustomerId] = useState<string>(
    FDE_OPERATIONS_CUSTOMERS[0]?.id ?? "",
  );
  const [selectedVersionTaskId, setSelectedVersionTaskId] = useState<string>(
    FDE_VERSION_MANAGEMENT_TASKS[0]?.id ?? "",
  );
  const ordersRef = useRef<FdeOrderItem[]>(INITIAL_FDE_SYNCED_STATE.orders);
  const deliveryOrdersRef = useRef<FdeDeliveryOrderItem[]>(FDE_DELIVERY_ORDERS);
  const operationsCustomersRef = useRef<FdeOperationsCustomerItem[]>(
    INITIAL_FDE_SYNCED_STATE.customers,
  );

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    deliveryOrdersRef.current = deliveryOrders;
  }, [deliveryOrders]);

  useEffect(() => {
    operationsCustomersRef.current = operationsCustomers;
  }, [operationsCustomers]);

  const activeMember = useMemo<FdeTeamMemberItem>(
    () => teamMembers.find(item => item.id === currentUserId) ?? teamMembers[0] ?? FDE_TEAM_MEMBERS[0],
    [currentUserId, teamMembers],
  );
  const activeRole = activeMember.role;
  const canManageMembers = canManageTeamMembers(activeRole);
  const shouldShowLeaderDashboard = activeRole === "leader";
  const tabs = useMemo(
    () => {
      if (canManageTeamMembers(activeRole)) {
        return shouldShowLeaderDashboard
          ? FDE_WORKBENCH_TABS
          : FDE_WORKBENCH_TABS.filter(item => item.key !== "dashboard");
      }

      const visibleKeys = new Set<string>([
        ...activeMember.permissionKeys,
        ...FDE_DEVELOPMENT_VISIBLE_KEYS,
      ]);
      return FDE_WORKBENCH_TABS.filter(item => visibleKeys.has(item.key));
    },
    [activeMember.permissionKeys, activeRole, shouldShowLeaderDashboard],
  );
  const navGroups = useMemo(
    () => {
      if (canManageTeamMembers(activeRole)) {
        return shouldShowLeaderDashboard
          ? FDE_WORKBENCH_NAV_GROUPS
          : FDE_WORKBENCH_NAV_GROUPS.map(group => ({
              ...group,
              items: group.items.filter(item => item.key !== "dashboard"),
              subGroups: group.subGroups
                ?.map(sub => ({
                  ...sub,
                  items: sub.items.filter(item => item.key !== "dashboard"),
                }))
                .filter(sub => sub.items.length),
            })).filter(group => group.items.length || group.subGroups?.length);
      }

      const visibleKeys = new Set<string>([
        ...activeMember.permissionKeys,
        ...FDE_DEVELOPMENT_VISIBLE_KEYS,
      ]);

      return FDE_WORKBENCH_NAV_GROUPS.map(group => ({
        ...group,
        items: group.items.filter(item => visibleKeys.has(item.key)),
        subGroups: group.subGroups
          ?.map(sub => ({
            ...sub,
            items: sub.items.filter(item => visibleKeys.has(item.key)),
          }))
          .filter(sub => sub.items.length),
      })).filter(group => group.items.length || group.subGroups?.length);
    },
    [activeMember.permissionKeys, activeRole, shouldShowLeaderDashboard],
  );

  useEffect(() => {
    if (previousUserIdRef.current === currentUserId) {
      return;
    }

    previousUserIdRef.current = currentUserId;
    setActiveTab(currentUserId === FDE_PRIMARY_LEADER_MEMBER_ID ? "dashboard" : "delivery");
  }, [currentUserId]);

  useEffect(() => {
    if (tabs.length && !tabs.some(item => item.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  const filterByPerspective = useCallback(
    <TItem extends { assignedToId: string }>(items: TItem[]): TItem[] => {
      if (canManageTeamMembers(activeRole)) {
        return items;
      }

      return items.filter(item => item.assignedToId === activeMember.id);
    },
    [activeMember.id, activeRole],
  );

  const filteredOrders = useMemo<FdeOrderItem[]>(
    () => filterByPerspective(orders),
    [filterByPerspective, orders],
  );
  const filteredDeliveryOrders = useMemo<FdeDeliveryOrderItem[]>(
    () => filterByPerspective(deliveryOrders),
    [deliveryOrders, filterByPerspective],
  );
  const filteredOperationsCustomers = useMemo<FdeOperationsCustomerItem[]>(
    () => filterByPerspective(operationsCustomers),
    [filterByPerspective, operationsCustomers],
  );
  const filteredVersionTasks = useMemo<FdeVersionManagementTaskItem[]>(
    () => filterByPerspective(versionTasks),
    [filterByPerspective, versionTasks],
  );

  const syncDeliveryOrders = useCallback((updatedOrders: FdeDeliveryOrderItem[]): void => {
    const previousOrders = deliveryOrdersRef.current;
    const updatedOrderIds = new Set(updatedOrders.map(item => item.id));
    const nextDeliveryOrders = [
      ...updatedOrders,
      ...previousOrders.filter(item => !updatedOrderIds.has(item.id)),
    ];

    const nextOperationsCustomers = operationsCustomersRef.current.map(customer => {
      const relatedOrders = nextDeliveryOrders.filter(
        order => order.orderKind === "change" && order.relatedCustomerId === customer.id,
      );

      if (!relatedOrders.length) {
        return customer;
      }

      return relatedOrders.reduce<FdeOperationsCustomerItem>((currentCustomer, order) => {
        const previousOrder = previousOrders.find(item => item.id === order.id);
        const hasJustCompleted =
          previousOrder?.deliveryStatus !== "已交付" && order.deliveryStatus === "已交付";
        let updatedCustomer = currentCustomer;
        const existingRecord = currentCustomer.changeRecords.find(item => item.id === order.id);

        if (hasJustCompleted) {
          const completedChangeCount = currentCustomer.changeRecords.filter(
            item => item.statusLabel === "已完成",
          ).length;
          const nextAssetQuotas = updateQuotaItems(currentCustomer.assetQuotas, order);
          const nextDevices = order.deviceAdditions?.length
            ? [...currentCustomer.devices, ...order.deviceAdditions]
            : currentCustomer.devices;
          const nextAgents = order.agentAdditions?.length
            ? appendUniqueAgents(currentCustomer.agents, order.agentAdditions)
            : currentCustomer.agents;

          updatedCustomer = {
            ...currentCustomer,
            assetQuotas: nextAssetQuotas,
            devices: nextDevices,
            agents: nextAgents,
            activeExperts: nextAgents.length,
            onlineExperts: nextAgents.length,
            deviceSummary: `${nextDevices.length} 台设备运行中`,
            assetValueSummary: `累计下发 ${nextAgents.length} 个 Agent / 已完成 ${completedChangeCount + 1} 次变更`,
          };
        }

        const beforeSnapshot =
          previousOrder?.deliveryStatus === "已交付"
            ? existingRecord?.beforeSnapshot ?? buildCustomerAssetSnapshot(currentCustomer)
            : buildCustomerAssetSnapshot(currentCustomer);
        const afterSnapshot = hasJustCompleted
          ? buildCustomerAssetSnapshot(updatedCustomer)
          : existingRecord?.afterSnapshot ?? [];
        const nextRecord = buildChangeRecordFromOrder(
          order,
          beforeSnapshot,
          afterSnapshot,
          hasJustCompleted ? undefined : existingRecord?.completedAt,
        );

        return {
          ...updatedCustomer,
          changeRecords: [
            nextRecord,
            ...updatedCustomer.changeRecords.filter(item => item.id !== order.id),
          ],
        };
      }, customer);
    });
    const syncedOrderState = syncOrdersWithDeliveryState(
      ordersRef.current,
      nextDeliveryOrders,
      nextOperationsCustomers,
      teamMembers,
      activeMember.name,
    );

    deliveryOrdersRef.current = nextDeliveryOrders;
    operationsCustomersRef.current = syncedOrderState.customers;
    ordersRef.current = syncedOrderState.orders;
    setDeliveryOrders(nextDeliveryOrders);
    setOperationsCustomers(syncedOrderState.customers);
    setOrders(syncedOrderState.orders);
  }, [activeMember.name, teamMembers]);

  const createDeliveryChangeOrder = useCallback(
    (payload: FdeCreateDeliveryChangePayload): string => {
      const now = new Date().toLocaleString("zh-CN", { hour12: false });
      const baseOrder =
        deliveryOrdersRef.current.find(
          item => item.customerName === payload.customerName && item.orderKind === "initial",
        ) ?? deliveryOrdersRef.current.find(item => item.customerName === payload.customerName);
      const orderId = buildId("delivery-change");
      const orderNo = `FDE-CHG-${Date.now()}`;

      const nextOrder: FdeDeliveryOrderItem =
        payload.type === "追加设备"
          ? {
              id: orderId,
              tenantId: baseOrder?.tenantId ?? baseOrder?.id ?? orderId,
              leadId: "",
              customerName: payload.customerName,
              orderNo,
              assignedToId: baseOrder?.assignedToId ?? activeMember.id,
              orderKind: "change",
              relatedCustomerId: payload.customerId,
              changeType: payload.type,
              changeReason: payload.reason,
              requestedByName: activeMember.name,
              industry: baseOrder?.industry ?? "已交付客户增配",
              scenarioName: baseOrder?.scenarioName ?? "交付后增配",
              currentStep: "deviceConfig",
              stepProgress: 0,
              orderAmount: "增配中",
              tenantName: baseOrder?.tenantName ?? payload.customerName,
              tenantCode: baseOrder?.tenantCode ?? "",
              adminName: "",
              adminPhone: "",
              attachments: [],
              sourceLabel: "已交付客户追加设备",
              tenantStatusLabel: "变更执行中",
              deliveryBoundary: "客户已完成首期交付，当前新增设备变更单进入执行。",
              deliveryNote: payload.note.trim() || payload.reason.trim(),
              deviceConfig: {
                mode: "混合部署",
                cloudDeviceCount: payload.cloudWorkbenchCount,
                localDeviceCount: payload.localWorkbenchCount,
                cloudNodeName: payload.cloudWorkbenchCount ? "待分配云端工作站" : "",
                localDeviceName: payload.localWorkbenchCount ? "待分配本地工作站" : "",
                pairingCode: "",
                osOwner: "LeDeep OS",
                region: baseOrder?.deviceConfig.region ?? "待确认",
              },
              expertNames: [],
              requiredInputs: ["确认增配设备归属", "确认生效时间", "确认变更影响范围"],
              handoffItems: ["新增设备已交付到客户租户", "设备归属已确认", "变更已进入正式使用"],
              agentGroups: [],
              agentPackages: [],
              adminTodo: ["确认新增设备绑定的员工和位置", "确认本次扩容生效范围"],
              apiTargets: [],
              memberCount: baseOrder?.memberCount ?? 0,
              createdAt: now,
              launchTargetDate: payload.expectedEffectiveAt,
              preflightChecks: ["新增设备已分配", "设备归属已确认", "变更说明已同步至企业管理员"],
              completedSteps: [],
              deliveryStatus: "待配置",
              changeDetailItems: [
                {
                  id: `${orderId}-detail-cloud`,
                  label: "云端工作站",
                  afterValue: `+${payload.cloudWorkbenchCount} 台`,
                },
                {
                  id: `${orderId}-detail-local`,
                  label: "本地工作站",
                  afterValue: `+${payload.localWorkbenchCount} 台`,
                },
                {
                  id: `${orderId}-detail-client`,
                  label: "本地客户端授权",
                  afterValue: `+${payload.localClientCount} 个`,
                },
              ],
              quotaAdjustments: [
                { label: "云端设备额度", delta: payload.cloudWorkbenchCount, unit: "台" },
                { label: "本地设备额度", delta: payload.localWorkbenchCount, unit: "台" },
              ].filter(item => item.delta > 0),
              deviceAdditions: [
                ...Array.from({ length: payload.cloudWorkbenchCount }).map((_, index) => ({
                  id: `${orderId}-cloud-${index + 1}`,
                  name: `追加云端工作站 ${index + 1}`,
                  type: "cloud" as const,
                  status: "online" as const,
                  uptime: "0 小时",
                  categoryLabel: "云端工作站",
                  ownerLabel: "FDE 追加变更",
                  assignedEmployeeName: "待客户分配",
                  locationLabel: baseOrder?.deviceConfig.region ?? "待确认",
                })),
                ...Array.from({ length: payload.localWorkbenchCount }).map((_, index) => ({
                  id: `${orderId}-local-${index + 1}`,
                  name: `追加本地工作站 ${index + 1}`,
                  type: "local" as const,
                  status: "online" as const,
                  uptime: "0 小时",
                  categoryLabel: "本地工作站",
                  ownerLabel: "FDE 追加变更",
                  assignedEmployeeName: "待客户分配",
                  locationLabel: baseOrder?.deviceConfig.region ?? "待确认",
                })),
              ],
              agentAdditions: [],
            }
          : {
              id: orderId,
              tenantId: baseOrder?.tenantId ?? baseOrder?.id ?? orderId,
              leadId: "",
              customerName: payload.customerName,
              orderNo,
              assignedToId: baseOrder?.assignedToId ?? activeMember.id,
              orderKind: "change",
              relatedCustomerId: payload.customerId,
              changeType: payload.type,
              changeReason: payload.reason,
              requestedByName: activeMember.name,
              industry: baseOrder?.industry ?? "已交付客户增配",
              scenarioName: payload.agentName,
              currentStep: "agentConfig",
              stepProgress: 0,
              orderAmount: "增配中",
              tenantName: baseOrder?.tenantName ?? payload.customerName,
              tenantCode: baseOrder?.tenantCode ?? "",
              adminName: "",
              adminPhone: "",
              attachments: [],
              sourceLabel: "已交付客户追加Agent",
              tenantStatusLabel: "变更执行中",
              deliveryBoundary: "客户已完成首期交付，当前新增 Agent 变更单进入执行。",
              deliveryNote: payload.note.trim() || payload.reason.trim(),
              deviceConfig: baseOrder?.deviceConfig ?? {
                mode: "云端设备",
                cloudDeviceCount: 0,
                localDeviceCount: 0,
                cloudNodeName: "",
                localDeviceName: "",
                pairingCode: "",
                osOwner: "LeDeep OS",
                region: "待确认",
              },
              expertNames: [payload.agentName],
              requiredInputs: ["确认授权成员", "确认上线时间", "确认使用范围"],
              handoffItems: ["新增 Agent 已下发到客户租户", "授权对象已确认", "变更已进入正式使用"],
              agentGroups: [],
              agentPackages: [
                {
                  name: payload.agentName,
                  releaseVersion: payload.releaseVersion,
                  sourceLabel: payload.sourceLabel,
                  statusLabel: "待下发",
                  permissionHint: payload.targetMembers.length
                    ? `计划开放给 ${payload.targetMembers.join("、")}`
                    : "待确认授权对象",
                },
              ],
              adminTodo: ["确认新增 Agent 的授权成员", "确认正式开放范围"],
              apiTargets: [],
              memberCount: baseOrder?.memberCount ?? 0,
              createdAt: now,
              launchTargetDate: payload.expectedEffectiveAt,
              preflightChecks: ["新增 Agent 已下发", "授权范围已确认", "变更说明已同步至企业管理员"],
              completedSteps: [],
              deliveryStatus: "配置中",
              changeDetailItems: [
                {
                  id: `${orderId}-detail-agent`,
                  label: "新增 Agent",
                  afterValue: payload.agentName,
                },
                {
                  id: `${orderId}-detail-target`,
                  label: "授权对象",
                  afterValue: payload.targetMembers.length ? payload.targetMembers.join("、") : "待确认",
                },
              ],
              quotaAdjustments: [],
              deviceAdditions: [],
              agentAdditions: [
                {
                  name: payload.agentName,
                  runningHours: 0,
                  completedTasks: 0,
                  currentVersion: payload.releaseVersion,
                  latestVersion: payload.releaseVersion,
                  deliverySourceLabel: payload.sourceLabel,
                  permissionScope: payload.targetMembers.length ? payload.targetMembers.join("、") : "待确认",
                  assignedMembers: payload.targetMembers,
                  modelLabel: "Frontis 标准模型",
                  deploymentLabel: payload.targetMembers.length ? "定向授权" : "待确认",
                },
              ],
            };

      const nextDeliveryOrders = [nextOrder, ...deliveryOrdersRef.current];
      const nextOperationsCustomers = operationsCustomersRef.current.map(customer => {
        if (customer.id !== payload.customerId) {
          return customer;
        }

        const snapshot = buildCustomerAssetSnapshot(customer);
        const nextRecord = buildChangeRecordFromOrder(nextOrder, snapshot, []);

        return {
          ...customer,
          changeRecords: [nextRecord, ...customer.changeRecords],
        };
      });

      deliveryOrdersRef.current = nextDeliveryOrders;
      operationsCustomersRef.current = nextOperationsCustomers;
      setSelectedDeliveryOrderId(nextOrder.id);
      setDeliveryOrders(nextDeliveryOrders);
      setOperationsCustomers(nextOperationsCustomers);

      return nextOrder.id;
    },
    [activeMember.id, activeMember.name],
  );

  const createOrder = useCallback(
    (payload: FdeCreateOrderPayload): FdeCreateOrderResult => {
      const createdAt = new Date().toLocaleString("zh-CN", { hour12: false });
      const nextOrderId = buildId("order");
      const nextLineItems = payload.lineItems.map(item => {
        if (isDeviceLineItem(item)) {
          return {
            ...item,
            totalAmount: item.quantity * item.unitPrice,
          };
        }

        if (isAgentLineItem(item)) {
          return {
            ...item,
            quantity: 1,
            totalAmount: item.unitPrice,
          };
        }

        return item;
      });
      const totalAmount = nextLineItems.reduce((total, item) => total + item.totalAmount, 0);
      const initialOrder: FdeOrderItem = {
        id: nextOrderId,
        orderNo: createOrderNo(),
        customerName: payload.customerName.trim(),
        assignedToId: activeMember.id,
        status: "待关联租户",
        totalAmount,
        remark: payload.remark.trim(),
        lineItems: nextLineItems,
        fulfillmentItems: [],
        createdAt,
      };
      const tenantOrder = payload.tenantId
        ? deliveryOrdersRef.current.find(
            item => item.id === payload.tenantId && item.orderKind === "initial",
          )
        : undefined;

      if (!tenantOrder) {
        const nextOrders = [initialOrder, ...ordersRef.current];
        ordersRef.current = nextOrders;
        setOrders(nextOrders);
        setSelectedOrderManagementId(nextOrderId);

        return {
          orderId: nextOrderId,
          shouldPromptCreateTenant: true,
        };
      }

      const deviceLineItems = nextLineItems.filter(isDeviceLineItem);
      const agentLineItems = nextLineItems.filter(isAgentLineItem);
      const tokenLineItems = nextLineItems.filter(isTokensLineItem);
      let nextDeliveryOrders = deliveryOrdersRef.current.map(item =>
        item.id === tenantOrder.id
          ? {
              ...item,
              linkedOrderIds: appendUniqueOrderIds(item.linkedOrderIds, nextOrderId),
              expertNames: Array.from(
                new Set([...item.expertNames, ...agentLineItems.map(agent => agent.agentName)]),
              ),
              agentPackages: appendUniqueAgentPackages(item.agentPackages ?? [], agentLineItems),
            }
          : item,
      );
      let nextOperationsCustomers = operationsCustomersRef.current;
      let fulfillmentItems: FdeOrderFulfillmentItem[] = [];
      const linkedTenant =
        nextDeliveryOrders.find(item => item.id === tenantOrder.id) ?? tenantOrder;

      deliveryOrdersRef.current = nextDeliveryOrders;
      setDeliveryOrders(nextDeliveryOrders);

      if (linkedTenant.deliveryStatus === "已交付") {
        const cloudWorkbenchCount = deviceLineItems
          .filter(item => item.deviceType === "云端工作站")
          .reduce((total, item) => total + item.quantity, 0);
        const localWorkbenchCount = deviceLineItems
          .filter(item => item.deviceType === "本地工作站")
          .reduce((total, item) => total + item.quantity, 0);
        const localClientCount = deviceLineItems
          .filter(item => item.deviceType === "本地客户端授权")
          .reduce((total, item) => total + item.quantity, 0);

        if (cloudWorkbenchCount || localWorkbenchCount || localClientCount) {
          const changeOrderId = createDeliveryChangeOrder({
            type: "追加设备",
            customerId:
              operationsCustomersRef.current.find(
                item => item.customerName === linkedTenant.customerName,
              )?.id ?? "",
            customerName: linkedTenant.customerName,
            expectedEffectiveAt: linkedTenant.launchTargetDate,
            reason: payload.remark.trim() || "订单追加设备资源",
            note: payload.remark.trim() || "由订单管理自动生成的设备追加单",
            cloudWorkbenchCount,
            localWorkbenchCount,
            localClientCount,
          });

          fulfillmentItems.push({
            id: `${nextOrderId}-fulfillment-device`,
            type: "设备追加",
            summary: [
              cloudWorkbenchCount ? `云端工作站 ${cloudWorkbenchCount} 台` : "",
              localWorkbenchCount ? `本地工作站 ${localWorkbenchCount} 台` : "",
              localClientCount ? `本地客户端授权 ${localClientCount} 个` : "",
            ]
              .filter(Boolean)
              .join(" / "),
            status: "处理中",
            linkedRecordId: changeOrderId,
            linkedRecordType: "change",
            updatedAt: createdAt,
            executionRecords: [
              {
                id: `${nextOrderId}-fulfillment-device-created`,
                actionLabel: getFulfillmentCreatedActionLabel("设备追加"),
                resultLabel: "执行中",
                operatorName: activeMember.name,
                operatedAt: createdAt,
              },
            ],
          });
        }

        agentLineItems.forEach(item => {
          const changeOrderId = createDeliveryChangeOrder({
            type: "追加Agent",
            customerId:
              operationsCustomersRef.current.find(
                customer => customer.customerName === linkedTenant.customerName,
              )?.id ?? "",
            customerName: linkedTenant.customerName,
            agentName: item.agentName,
            releaseVersion: item.releaseVersion,
            sourceLabel: item.sourceLabel,
            targetMembers: [],
            expectedEffectiveAt: linkedTenant.launchTargetDate,
            reason: payload.remark.trim() || "订单追加 AI 专家",
            note: payload.remark.trim() || `由订单管理自动生成的 ${item.agentName} 追加单`,
          });

          fulfillmentItems.push({
            id: `${nextOrderId}-fulfillment-agent-${item.id}`,
            type: "Agent追加",
            summary: item.agentName,
            status: "处理中",
            linkedRecordId: changeOrderId,
            linkedRecordType: "change",
            updatedAt: createdAt,
            executionRecords: [
              {
                id: `${nextOrderId}-fulfillment-agent-${item.id}-created`,
                actionLabel: getFulfillmentCreatedActionLabel("Agent追加"),
                resultLabel: "执行中",
                operatorName: activeMember.name,
                operatedAt: createdAt,
              },
            ],
          });
        });

        nextOperationsCustomers = operationsCustomersRef.current;

        if (tokenLineItems.length) {
          const totalTokenCount = tokenLineItems.reduce((total, item) => total + item.tokenCount, 0);
          const totalTokenAmount = tokenLineItems.reduce((total, item) => total + item.totalAmount, 0);
          const linkedCustomer = operationsCustomersRef.current.find(
            item => item.customerName === linkedTenant.customerName,
          );

          if (linkedCustomer) {
            const recordId = `recharge-${nextOrderId}`;
            nextOperationsCustomers = applyTokenRecharges(nextOperationsCustomers, [
              {
                amount: totalTokenAmount,
                createdAt,
                customerId: linkedCustomer.id,
                operatorName: activeMember.name,
                recordId,
                tokenCount: totalTokenCount,
              },
            ]);

            fulfillmentItems.push({
              id: `${nextOrderId}-fulfillment-token`,
              type: "Tokens发放",
              summary: formatTokenCountLabel(totalTokenCount),
              status: "已完成",
              linkedRecordId: recordId,
              linkedRecordType: "recharge",
              updatedAt: createdAt,
              executionRecords: [
                {
                  id: `${nextOrderId}-fulfillment-token-created`,
                  actionLabel: getFulfillmentCreatedActionLabel("Tokens发放"),
                  resultLabel: "已创建",
                  operatorName: activeMember.name,
                  operatedAt: createdAt,
                },
                {
                  id: `${nextOrderId}-fulfillment-token-completed`,
                  actionLabel: getFulfillmentCompletedActionLabel("Tokens发放"),
                  resultLabel: "已完成",
                  operatorName: activeMember.name,
                  operatedAt: createdAt,
                },
              ],
            });
          }
        }

        nextDeliveryOrders = deliveryOrdersRef.current;
      } else {
        const draftOrder = {
          ...initialOrder,
          tenantId: linkedTenant.id,
          tenantName: linkedTenant.tenantName,
          tenantCode: linkedTenant.tenantCode,
        };

        fulfillmentItems = buildInitialFulfillmentItems(draftOrder, linkedTenant, teamMembers);
      }

      const nextOrder: FdeOrderItem = {
        ...initialOrder,
        customerName: linkedTenant.customerName,
        tenantId: linkedTenant.id,
        tenantName: linkedTenant.tenantName,
        tenantCode: linkedTenant.tenantCode,
        fulfillmentItems,
        status: buildOrderStatus(linkedTenant.id, fulfillmentItems),
      };
      const nextOrders = [nextOrder, ...ordersRef.current];
      const syncedOrderState = syncOrdersWithDeliveryState(
        nextOrders,
        nextDeliveryOrders,
        nextOperationsCustomers,
        teamMembers,
        activeMember.name,
      );

      ordersRef.current = syncedOrderState.orders;
      operationsCustomersRef.current = syncedOrderState.customers;
      deliveryOrdersRef.current = nextDeliveryOrders;
      setOrders(syncedOrderState.orders);
      setOperationsCustomers(syncedOrderState.customers);
      setDeliveryOrders(nextDeliveryOrders);
      setSelectedOrderManagementId(nextOrderId);

      return {
        orderId: nextOrderId,
        shouldPromptCreateTenant: false,
      };
    },
    [activeMember.id, activeMember.name, createDeliveryChangeOrder, teamMembers],
  );

  const addTeamMember = useCallback(
    (payload: FdeTeamMemberDraft): void => {
      if (!canManageTeamMembers(activeRole)) {
        return;
      }

      const nextMember = buildTeamMember(payload, "手动添加");
      setTeamMembers(previous => [nextMember, ...previous]);
    },
    [activeRole],
  );

  const importTeamMembers = useCallback(
    (payloads: FdeTeamMemberDraft[]): void => {
      if (!canManageTeamMembers(activeRole) || !payloads.length) {
        return;
      }

      const importedMembers = payloads.map(payload => buildTeamMember(payload, "批量导入"));
      setTeamMembers(previous => [...importedMembers, ...previous]);
    },
    [activeRole],
  );

  const updateTeamMember = useCallback(
    (memberId: string, payload: FdeTeamMemberDraft): void => {
      if (!canManageTeamMembers(activeRole)) {
        return;
      }

      setTeamMembers(previous =>
        previous.map(item =>
          item.id === memberId
            ? {
                ...item,
                name: payload.name.trim(),
                title: payload.title.trim() || getDefaultMemberTitle(payload.role),
                phone: payload.phone.trim(),
                role: payload.role,
                permissionKeys: payload.permissionKeys,
                focusScenes: payload.focusScenes,
              }
            : item,
        ),
      );
    },
    [activeRole],
  );

  const toggleTeamMemberStatus = useCallback(
    (memberId: string): void => {
      if (!canManageTeamMembers(activeRole)) {
        return;
      }

      setTeamMembers(previous =>
        previous.map(item =>
          item.id === memberId
            ? {
                ...item,
                accountStatus: item.accountStatus === "enabled" ? "disabled" : "enabled",
              }
            : item,
        ),
      );
    },
    [activeRole],
  );

  const removeTeamMember = useCallback(
    (memberId: string): void => {
      if (!canManageTeamMembers(activeRole)) {
        return;
      }

      setTeamMembers(previous => {
        if (previous.length <= 1) {
          return previous;
        }

        if (memberId === currentUserId) {
          return previous;
        }

        return previous.filter(item => item.id !== memberId);
      });
    },
    [activeRole, currentUserId],
  );

  return {
    activeMember,
    activeRole,
    activeTab,
    canManageMembers,
    orders,
    deliveryOrders,
    versionTasks,
    filteredOrders,
    filteredDeliveryOrders,
    filteredOperationsCustomers,
    filteredVersionTasks,
    opportunities,
    operationsCustomers,
    selectedOrderManagementId,
    selectedDeliveryOrderId,
    selectedOperationsCustomerId,
    selectedVersionTaskId,
    setActiveTab,
    createOrder,
    syncDeliveryOrders,
    createDeliveryChangeOrder,
    setSelectedOrderManagementId,
    setSelectedDeliveryOrderId,
    setSelectedOperationsCustomerId,
    setSelectedVersionTaskId,
    addTeamMember,
    importTeamMembers,
    removeTeamMember,
    toggleTeamMemberStatus,
    updateTeamMember,
    tabs,
    navGroups,
    teamMembers,
  };
};
