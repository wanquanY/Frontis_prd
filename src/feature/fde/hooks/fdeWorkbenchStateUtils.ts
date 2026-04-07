import dayjs from "dayjs";

import { FDE_TEAM_MEMBERS } from "@/feature/fde/mockData";
import type {
  FdeAgentMonitorItem,
  FdeAssetType,
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
  FdeTeamMemberDraft,
  FdeTeamMemberItem,
  FdeWorkbenchTabKey,
} from "@/feature/fde/types";

export const FDE_DEVELOPMENT_VISIBLE_KEYS: FdeWorkbenchTabKey[] = [
  "agentDev",
  "skillMarket",
  "agentStore",
  "opsInsights",
];

const DEFAULT_VALIDITY_MONTHS = 12;

/**
 * 生成 FDE 业务内的本地唯一标识。
 */
export const buildId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

/**
 * 判断当前角色是否可管理 FDE 成员。
 */
export const canManageTeamMembers = (role: FdeTeamMemberItem["role"]): boolean =>
  role === "leader" || role === "admin";

/**
 * 根据成员角色生成默认职务名称。
 */
export const getDefaultMemberTitle = (role: FdeTeamMemberDraft["role"]): string => {
  if (role === "leader") {
    return "FDE 团队负责人";
  }

  if (role === "admin") {
    return "FDE 团队管理员";
  }

  return "FDE 成员";
};

/**
 * 构造 FDE 团队成员数据。
 */
export const buildTeamMember = (
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

/**
 * 构建客户当前资产快照，用于变更记录对比。
 */
export const buildCustomerAssetSnapshot = (
  customer: FdeOperationsCustomerItem,
): string[] => {
  const quotaLines = customer.assetQuotas
    .filter(item => item.label !== "租户席位额度")
    .map(item => `${item.label} ${item.used}/${item.total}${item.unit}`);

  return [
    ...quotaLines,
    `AI 专家 ${customer.agents.length} 个`,
    `设备资产 ${customer.devices.length} 台`,
  ];
};

/**
 * 根据交付单生成客户变更记录。
 */
export const buildChangeRecordFromOrder = (
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
    item.beforeValue
      ? `${item.label}：${item.beforeValue} -> ${item.afterValue}`
      : `${item.label}：${item.afterValue}`,
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

/**
 * 按交付变更更新客户额度快照。
 */
export const updateQuotaItems = (
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

/**
 * 生成订单编号。
 */
export const createOrderNo = (): string => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = now.getTime().toString().slice(-3);
  return `ORD-${date}-${suffix}`;
};

const formatAmountLabel = (value: number): string => `¥ ${value.toLocaleString("zh-CN")}`;

/**
 * 格式化 tokens 数量文案。
 */
export const formatTokenCountLabel = (value: number): string => {
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

const normalizeDateTime = (value: string): string => dayjs(value).format("YYYY-MM-DD HH:mm");

const resolveDeliveryCompletedAt = (order: FdeDeliveryOrderItem): string =>
  normalizeDateTime(order.deliveredAt ?? order.launchTargetDate);

/**
 * 计算有效期顺延后的到期时间。
 */
export const addValidityMonths = (startedAt: string, validityMonths: number): string =>
  dayjs(startedAt).add(validityMonths, "month").format("YYYY-MM-DD HH:mm");

/**
 * 获取订单商品有效时长，未填时回落到默认值。
 */
export const getLineItemValidityMonths = (
  item: FdeOrderDeviceLineItem | FdeOrderAgentLineItem,
): number => item.validityMonths ?? DEFAULT_VALIDITY_MONTHS;

const buildStableAssetId = (
  type: FdeAssetType,
  lineItemId: string,
  sequence = 1,
): string => {
  const normalizedId = lineItemId.replaceAll(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  const prefix = type === "device" ? "AST-DEV" : "AST-AGT";
  const suffix = type === "device" ? `-${String(sequence).padStart(2, "0")}` : "";

  return `${prefix}-${normalizedId}${suffix}`;
};

const buildDeviceMonitorType = (
  deviceType: FdeOrderDeviceLineItem["deviceType"],
): "cloud" | "local" => (deviceType === "云端工作站" ? "cloud" : "local");

const buildDefaultDeviceAssetName = (
  deviceType: FdeOrderDeviceLineItem["deviceType"],
  sequence: number,
): string => `${deviceType} ${String(sequence).padStart(2, "0")}`;

const matchesDeviceTemplate = (
  template: FdeOperationsCustomerItem["devices"][number],
  deviceType: FdeOrderDeviceLineItem["deviceType"],
): boolean => {
  if (deviceType === "云端工作站") {
    return template.type === "cloud";
  }

  if (deviceType === "本地客户端授权") {
    return template.categoryLabel === "本地客户端授权";
  }

  return template.type === "local" && template.categoryLabel !== "本地客户端授权";
};

const appendUniqueDeviceAssets = (
  currentAssets: FdeOperationsCustomerItem["devices"],
  additions: FdeOperationsCustomerItem["devices"],
): FdeOperationsCustomerItem["devices"] => {
  const existingAssetIds = new Set(currentAssets.map(item => item.assetId).filter(Boolean));
  return [
    ...currentAssets,
    ...additions.filter(item => !item.assetId || !existingAssetIds.has(item.assetId)),
  ];
};

const appendUniqueAgentAssets = (
  currentAssets: FdeOperationsCustomerItem["agents"],
  additions: FdeOperationsCustomerItem["agents"],
): FdeOperationsCustomerItem["agents"] => {
  const existingAssetIds = new Set(currentAssets.map(item => item.assetId).filter(Boolean));
  return [
    ...currentAssets,
    ...additions.filter(item => !item.assetId || !existingAssetIds.has(item.assetId)),
  ];
};

const buildDeviceAssetsFromLineItem = (
  order: FdeOrderItem,
  lineItem: FdeOrderDeviceLineItem,
  completedAt: string,
  templates: FdeOperationsCustomerItem["devices"],
): FdeOperationsCustomerItem["devices"] => {
  const validityMonths = getLineItemValidityMonths(lineItem);
  const expiresAt = addValidityMonths(completedAt, validityMonths);
  const matchedTemplates = templates.filter(item => matchesDeviceTemplate(item, lineItem.deviceType));

  return Array.from({ length: lineItem.quantity }).map((_, index) => {
    const template = matchedTemplates[index];

    return {
      ...(template ?? {
        id: `${lineItem.id}-device-${index + 1}`,
        name: buildDefaultDeviceAssetName(lineItem.deviceType, index + 1),
        type: buildDeviceMonitorType(lineItem.deviceType),
        status: "online",
        uptime: "0小时",
        categoryLabel: lineItem.deviceType,
        ownerLabel: lineItem.deviceType === "云端工作站" ? "FDE 统管" : "企业员工",
        activationLabel: "已激活",
        assignedEmployeeName:
          lineItem.deviceType === "云端工作站" ? undefined : "待客户分配",
        locationLabel: order.tenantName ?? order.customerName,
      }),
      assetId: buildStableAssetId("device", lineItem.id, index + 1),
      sourceOrderId: order.id,
      validityMonths,
      activatedAt: completedAt,
      expiresAt,
      categoryLabel: template?.categoryLabel ?? lineItem.deviceType,
    };
  });
};

const buildAgentAssetsFromLineItem = (
  order: FdeOrderItem,
  lineItem: FdeOrderAgentLineItem,
  completedAt: string,
  templates: FdeOperationsCustomerItem["agents"],
): FdeOperationsCustomerItem["agents"] => {
  const validityMonths = getLineItemValidityMonths(lineItem);
  const expiresAt = addValidityMonths(completedAt, validityMonths);
  const template = templates[0];

  return [
    {
      ...(template ?? {
        name: lineItem.agentName,
        runningHours: 0,
        completedTasks: 0,
        currentVersion: lineItem.releaseVersion,
        latestVersion: lineItem.releaseVersion,
        deliverySourceLabel: lineItem.sourceLabel,
        modelLabel: "Frontis 标准模型",
        deploymentLabel: "待企业管理员配置",
      }),
      assetId: buildStableAssetId("agent", lineItem.id),
      sourceOrderId: order.id,
      validityMonths,
      activatedAt: completedAt,
      expiresAt,
      name: template?.name ?? lineItem.agentName,
      currentVersion: template?.currentVersion ?? lineItem.releaseVersion,
      latestVersion: template?.latestVersion ?? lineItem.releaseVersion,
      deliverySourceLabel: template?.deliverySourceLabel ?? lineItem.sourceLabel,
    },
  ];
};

/**
 * 计算续费应从哪个时间点继续顺延。
 */
export const resolveRenewalBaseAt = (
  expiresAt: string | undefined,
  renewedAt: string,
): string => {
  if (!expiresAt) {
    return renewedAt;
  }

  return dayjs(expiresAt).isAfter(dayjs(renewedAt)) ? expiresAt : renewedAt;
};

/**
 * 根据设备资产反推订单设备类型。
 */
export const resolveDeviceLineTypeFromAsset = (
  device: FdeOperationsCustomerItem["devices"][number],
): FdeOrderDeviceLineItem["deviceType"] => {
  if (device.categoryLabel === "本地客户端授权") {
    return "本地客户端授权";
  }

  return device.type === "cloud" ? "云端工作站" : "本地工作站";
};

/**
 * 为历史资产补齐资产 ID、开始时间和到期时间。
 */
export const hydrateExistingAssets = (
  customers: FdeOperationsCustomerItem[],
  deliveryOrders: FdeDeliveryOrderItem[],
): FdeOperationsCustomerItem[] =>
  customers.map(customer => {
    const linkedTenant = deliveryOrders.find(
      item => item.orderKind === "initial" && item.customerName === customer.customerName,
    );
    const defaultActivatedAt = linkedTenant
      ? resolveDeliveryCompletedAt(linkedTenant)
      : new Date().toLocaleString("zh-CN", { hour12: false });

    return {
      ...customer,
      devices: customer.devices.map((device, index) => {
        const activatedAt = device.activatedAt ?? defaultActivatedAt;
        const validityMonths = device.validityMonths ?? DEFAULT_VALIDITY_MONTHS;

        return {
          ...device,
          assetId:
            device.assetId ??
            `AST-DEV-${customer.id.slice(-2).toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
          validityMonths,
          activatedAt,
          expiresAt: device.expiresAt ?? addValidityMonths(activatedAt, validityMonths),
        };
      }),
      agents: customer.agents.map((agent, index) => {
        const activatedAt = agent.activatedAt ?? defaultActivatedAt;
        const validityMonths = agent.validityMonths ?? DEFAULT_VALIDITY_MONTHS;

        return {
          ...agent,
          assetId:
            agent.assetId ??
            `AST-AGT-${customer.id.slice(-2).toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
          validityMonths,
          activatedAt,
          expiresAt: agent.expiresAt ?? addValidityMonths(activatedAt, validityMonths),
        };
      }),
    };
  });

/**
 * 判断订单商品是否为设备项。
 */
export const isDeviceLineItem = (item: FdeOrderLineItem): item is FdeOrderDeviceLineItem =>
  item.kind === "device";

/**
 * 判断订单商品是否为 AI 专家项。
 */
export const isAgentLineItem = (item: FdeOrderLineItem): item is FdeOrderAgentLineItem =>
  item.kind === "agent";

/**
 * 判断订单商品是否为 tokens 项。
 */
export const isTokensLineItem = (item: FdeOrderLineItem): item is FdeOrderTokensLineItem =>
  item.kind === "tokens";

/**
 * 判断订单是否包含需要人工交付的商品。
 */
export const hasManualDeliveryLineItem = (order: FdeOrderItem): boolean =>
  order.lineItems.some(item => isDeviceLineItem(item) || isAgentLineItem(item));

const getTeamMemberNameById = (
  memberId: string,
  members: FdeTeamMemberItem[],
): string =>
  members.find(item => item.id === memberId)?.name ??
  FDE_TEAM_MEMBERS.find(item => item.id === memberId)?.name ??
  "FDE";

/**
 * 获取履约创建动作文案。
 */
export const getFulfillmentCreatedActionLabel = (type: FdeOrderFulfillmentType): string => {
  if (type === "首期配置交付") {
    return "创建首期配置交付任务";
  }

  if (type === "设备追加") {
    return "创建设备追加交付单";
  }

  if (type === "Agent追加") {
    return "创建Agent追加交付单";
  }

  if (type === "资产续费") {
    return "创建资产续费订单";
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

  if (type === "资产续费") {
    return "开始处理资产续费";
  }

  return "开始处理Tokens发放";
};

/**
 * 获取履约完成动作文案。
 */
export const getFulfillmentCompletedActionLabel = (type: FdeOrderFulfillmentType): string => {
  if (type === "首期配置交付") {
    return "完成首期配置交付";
  }

  if (type === "设备追加") {
    return "完成设备追加交付";
  }

  if (type === "Agent追加") {
    return "完成Agent追加交付";
  }

  if (type === "资产续费") {
    return "完成资产续费";
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

/**
 * 根据履约项汇总订单状态。
 */
export const buildOrderStatus = (
  fulfillmentItems: FdeOrderFulfillmentItem[],
): FdeOrderItem["status"] => {
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

/**
 * 向关联订单列表追加去重后的订单 ID。
 */
export const appendUniqueOrderIds = (
  currentOrderIds: string[] | undefined,
  orderId: string,
): string[] => Array.from(new Set([...(currentOrderIds ?? []), orderId]));

/**
 * 将 tokens 充值结果回写到客户资产快照。
 */
export const applyTokenRecharges = (
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

/**
 * 向交付单里补充待下发的 Agent 包。
 */
export const appendUniqueAgentPackages = (
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
      operatedAt: resolveDeliveryCompletedAt(deliveryOrder),
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
        ? resolveDeliveryCompletedAt(deliveryOrder)
        : deliveryOrder.createdAt,
    executionRecords,
  };
};

/**
 * 根据首期租户交付单构建订单履约任务。
 */
export const buildInitialFulfillmentItems = (
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

/**
 * 根据交付状态同步订单、资产和履约任务。
 */
export const syncOrdersWithDeliveryState = (
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
    const linkedInitialDelivery =
      boundTenant?.linkedOrderIds?.includes(order.id) ? boundTenant : undefined;
    const linkedChangeOrders = deliveryOrders.filter(
      item => item.orderKind === "change" && item.linkedOrderIds?.includes(order.id),
    );

    let fulfillmentItems = nextOrder.fulfillmentItems.map(item => {
      if (item.linkedRecordType === "delivery" || item.linkedRecordType === "change") {
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
            operatedAt: resolveDeliveryCompletedAt(linkedDeliveryOrder),
          });
        }

        return {
          ...item,
          status: nextStatus,
          updatedAt:
            linkedDeliveryOrder.deliveryStatus === "已交付"
              ? resolveDeliveryCompletedAt(linkedDeliveryOrder)
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

    if (linkedInitialDelivery && !fulfillmentItems.length && !linkedChangeOrders.length) {
      fulfillmentItems = buildInitialFulfillmentItems(nextOrder, linkedInitialDelivery, members);
    }

    if (
      linkedInitialDelivery &&
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
          status: buildFulfillmentStatusFromDelivery(linkedInitialDelivery),
          linkedRecordId: linkedInitialDelivery.id,
          linkedRecordType: "delivery",
          updatedAt: linkedInitialDelivery.createdAt,
          executionRecords: [
            {
              id: `${nextOrder.id}-fulfillment-delivery-created`,
              actionLabel: getFulfillmentCreatedActionLabel("首期配置交付"),
              resultLabel:
                buildFulfillmentStatusFromDelivery(linkedInitialDelivery) === "待处理"
                  ? "已创建"
                  : "执行中",
              operatorName: getTeamMemberNameById(linkedInitialDelivery.assignedToId, members),
              operatedAt: linkedInitialDelivery.createdAt,
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
      const linkedCustomer = nextCustomers.find(item => item.customerName === boundTenant.customerName);

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

      const linkedCustomer = nextCustomers.find(item => item.customerName === nextOrder.customerName);

      if (linkedCustomer) {
        const completedInitialRecord = fulfillmentItems.some(
          item => item.type === "首期配置交付" && item.status === "已完成",
        )
        ? linkedInitialDelivery
        : undefined;
      const completedDeviceChangeRecordId = fulfillmentItems.find(
        item => item.type === "设备追加" && item.status === "已完成",
      )?.linkedRecordId;
      const completedAgentChangeRecordId = fulfillmentItems.find(
        item => item.type === "Agent追加" && item.status === "已完成",
      )?.linkedRecordId;
      const completedDeviceDelivery =
        linkedChangeOrders.find(item => item.id === completedDeviceChangeRecordId) ??
        completedInitialRecord;
      const completedAgentDelivery =
        linkedChangeOrders.find(item => item.id === completedAgentChangeRecordId) ??
        completedInitialRecord;
      let nextCustomer = linkedCustomer;
      const nextLineItems = nextOrder.lineItems.map(item => {
        if (
          isDeviceLineItem(item) &&
          !item.renewalTargetAssetId &&
          !item.deliveredAssetIds?.length &&
          completedDeviceDelivery
        ) {
          const completedAt = resolveDeliveryCompletedAt(completedDeviceDelivery);
          const deviceAssets = buildDeviceAssetsFromLineItem(
            nextOrder,
            item,
            completedAt,
            completedDeviceDelivery.deviceAdditions ?? [],
          );

          nextCustomer = {
            ...nextCustomer,
            devices: appendUniqueDeviceAssets(nextCustomer.devices, deviceAssets),
          };

          return {
            ...item,
            validityMonths: getLineItemValidityMonths(item),
            deliveredAssetIds: deviceAssets.map(asset => asset.assetId ?? asset.id),
            activatedAt: completedAt,
            expiresAt: deviceAssets[0]?.expiresAt,
          };
        }

        if (
          isAgentLineItem(item) &&
          !item.renewalTargetAssetId &&
          !item.deliveredAssetIds?.length &&
          completedAgentDelivery
        ) {
          const completedAt = resolveDeliveryCompletedAt(completedAgentDelivery);
          const agentAssets = buildAgentAssetsFromLineItem(
            nextOrder,
            item,
            completedAt,
            completedAgentDelivery.agentAdditions ?? [],
          );

          nextCustomer = {
            ...nextCustomer,
            agents: appendUniqueAgentAssets(nextCustomer.agents, agentAssets),
          };

          return {
            ...item,
            validityMonths: getLineItemValidityMonths(item),
            deliveredAssetIds: agentAssets.map(asset => asset.assetId ?? asset.name),
            activatedAt: completedAt,
            expiresAt: agentAssets[0]?.expiresAt,
          };
        }

        return item;
      });

      if (
        nextCustomer.devices.length !== linkedCustomer.devices.length ||
        nextCustomer.agents.length !== linkedCustomer.agents.length
      ) {
        nextCustomers = nextCustomers.map(item =>
          item.id === linkedCustomer.id
            ? {
                ...nextCustomer,
                activeExperts: nextCustomer.agents.length,
                onlineExperts: nextCustomer.agents.length,
                deviceSummary: `${nextCustomer.devices.length} 台设备运行中`,
                assetValueSummary: `累计下发 ${nextCustomer.agents.length} 个 Agent / 设备资产 ${nextCustomer.devices.length} 台`,
              }
            : item,
        );
      }

      nextOrder = {
        ...nextOrder,
        lineItems: nextLineItems,
      };
    }

    nextOrder = {
      ...nextOrder,
      fulfillmentItems,
      status: buildOrderStatus(fulfillmentItems),
    };

    return nextOrder;
  });

  return { customers: nextCustomers, orders: nextOrders };
};
