import type { Dayjs } from "dayjs";

import { FDE_DELIVERY_STEPS } from "@/feature/fde/mockData";
import type {
  FdeDeliveryOrderItem,
  FdeDeliveryOrderStatus,
  FdeDeliveryStepItem,
  FdeDeliveryStepKey,
  FdeOrderDeviceType,
  FdeOrderItem,
  FdeOrderLineItem,
} from "@/feature/fde/types";
import { getFdeDeliveryStepIndex } from "@/feature/fde/utils";

interface DeliveryStepGuide {
  title: string;
  buttonLabel: string;
}

export interface DeviceAllocationFormState {
  cloudWorkbenchQuota: number | null;
  localWorkbenchQuota: number | null;
  localClientQuota: number | null;
  effectiveAt: string;
}

export interface DeviceAllocationRecord extends DeviceAllocationFormState {
  configuredAt: string;
  isConfigured: boolean;
}

export interface CreateOrderFormState {
  customerName: string;
  launchTargetDate: Dayjs | null;
  deliveryNote: string;
  tenantCode: string;
  tenantSeatCount: number | null;
}

export interface CreateBusinessOrderFormState {
  remark: string;
  lineItems: FdeOrderLineItem[];
}

export interface ExpertGroupFormState {
  name: string;
  description: string;
}

export interface OrderPreviewFieldItem {
  label: string;
  value: string;
}

export type AgentPlazaScope = "public" | "mine";
export type AgentSelectMode = "single" | "group";
export type DeliveryStatusFilter = "all" | FdeDeliveryOrderStatus;
export type DeliveryViewMode = "list" | "detail";
export type DeliveryDetailTabKey = "orderInfo" | FdeDeliveryStepKey;
export type DeliveryOrdersUpdater = (
  items: FdeDeliveryOrderItem[],
) => FdeDeliveryOrderItem[];

export const DELIVERY_STEP_GUIDES: Record<FdeDeliveryStepKey, DeliveryStepGuide> = {
  deviceConfig: {
    title: "设备分配",
    buttonLabel: "完成设备分配",
  },
  agentConfig: {
    title: "租户 Agent 下发",
    buttonLabel: "完成 Agent 下发",
  },
  apiTest: {
    title: "企业后台配置",
    buttonLabel: "完成企业后台配置",
  },
  preflight: {
    title: "交付验收",
    buttonLabel: "完成交付验收",
  },
};

export const BUSINESS_DEVICE_TYPE_OPTIONS: Array<{
  label: string;
  value: FdeOrderDeviceType;
}> = [
  { label: "云端工作站", value: "云端工作站" },
  { label: "本地工作站", value: "本地工作站" },
  { label: "本地客户端授权", value: "本地客户端授权" },
];

/**
 * 生成交付专家团唯一标识。
 */
export const createGroupId = (): string => `delivery-group-${Date.now().toString(36)}`;

/**
 * 创建空的租户创建表单状态。
 */
export const createInitialOrderForm = (): CreateOrderFormState => ({
  customerName: "",
  launchTargetDate: null,
  deliveryNote: "",
  tenantCode: "",
  tenantSeatCount: null,
});

/**
 * 创建空的专家团表单状态。
 */
export const createInitialExpertGroupForm = (): ExpertGroupFormState => ({
  name: "",
  description: "",
});

/**
 * 创建空的订单创建表单状态。
 */
export const createInitialBusinessOrderForm = (): CreateBusinessOrderFormState => ({
  remark: "",
  lineItems: [],
});

/**
 * 格式化订单金额。
 */
export const formatAmount = (value: number): string => `¥ ${value.toLocaleString("zh-CN")}`;

/**
 * 格式化积分数量。
 */
export const formatTokenCount = (value: number): string => {
  if (value >= 10000) {
    const normalizedValue = value / 10000;

    return `${Number.isInteger(normalizedValue) ? normalizedValue.toFixed(0) : normalizedValue.toFixed(1)} 万积分`;
  }

  return `${value.toLocaleString("zh-CN")} 积分`;
};

/**
 * 格式化商品有效时长。
 */
export const formatValidityLabel = (months?: number): string =>
  months && months > 0 ? `${months} 个月` : "未设置";

/**
 * 根据步骤键获取交付步骤文案。
 */
export const getStepKeyLabel = (stepKey: FdeDeliveryStepKey): string =>
  FDE_DELIVERY_STEPS.find(item => item.key === stepKey)?.label ?? stepKey;

/**
 * 根据当前步骤推导租户状态文案。
 */
export const getTenantStatusLabel = (stepKey: FdeDeliveryStepKey): string => {
  if (stepKey === "deviceConfig") {
    return "租户已创建";
  }

  if (stepKey === "agentConfig") {
    return "初始化中";
  }

  if (stepKey === "apiTest") {
    return "Agent 已下发";
  }

  return "待交付验收";
};

/**
 * 根据当前步骤推导交付状态。
 */
export const getDeliveryStatusLabel = (
  stepKey: FdeDeliveryStepKey,
): FdeDeliveryOrderStatus => {
  if (stepKey === "deviceConfig") {
    return "待配置";
  }

  return "配置中";
};

/**
 * 获取当前交付单实际需要展示的步骤。
 */
export const getVisibleDeliverySteps = (
  order: FdeDeliveryOrderItem,
): FdeDeliveryStepItem[] => {
  if (order.orderKind !== "change" || order.useFullFlow) {
    return FDE_DELIVERY_STEPS;
  }

  if (order.changeType === "追加设备") {
    return FDE_DELIVERY_STEPS.filter(
      step =>
        step.key === "deviceConfig" || step.key === "apiTest" || step.key === "preflight",
    );
  }

  if (order.changeType === "追加Agent") {
    return FDE_DELIVERY_STEPS.filter(
      step =>
        step.key === "agentConfig" || step.key === "apiTest" || step.key === "preflight",
    );
  }

  if (order.changeType === "追加设备与Agent") {
    return FDE_DELIVERY_STEPS.filter(
      step =>
        step.key === "deviceConfig" ||
        step.key === "agentConfig" ||
        step.key === "apiTest" ||
        step.key === "preflight",
    );
  }

  if (order.changeType === "资产续费") {
    const hasDeviceRenewal =
      order.deviceConfig.cloudDeviceCount > 0 || order.deviceConfig.localDeviceCount > 0;
    const hasAgentRenewal = order.expertNames.length > 0;

    if (hasDeviceRenewal && hasAgentRenewal) {
      return FDE_DELIVERY_STEPS.filter(
        step =>
          step.key === "deviceConfig" ||
          step.key === "agentConfig" ||
          step.key === "apiTest" ||
          step.key === "preflight",
      );
    }

    if (hasDeviceRenewal) {
      return FDE_DELIVERY_STEPS.filter(
        step =>
          step.key === "deviceConfig" || step.key === "apiTest" || step.key === "preflight",
      );
    }

    if (hasAgentRenewal) {
      return FDE_DELIVERY_STEPS.filter(
        step =>
          step.key === "agentConfig" || step.key === "apiTest" || step.key === "preflight",
      );
    }
  }

  return FDE_DELIVERY_STEPS;
};

/**
 * 获取步骤在当前交付单中的状态文案。
 */
export const getStepStatusLabel = (
  order: FdeDeliveryOrderItem,
  stepKey: FdeDeliveryStepKey,
): "已完成" | "已跳过" | "进行中" | "待处理" => {
  if (order.skippedSteps?.includes(stepKey)) {
    return "已跳过";
  }

  if (order.completedSteps.includes(stepKey)) {
    return "已完成";
  }

  if (order.currentStep === stepKey) {
    return "进行中";
  }

  return "待处理";
};

/**
 * 判断下发项是否已经完成交付。
 */
export const isDeliveryItemDelivered = (statusLabel: string): boolean =>
  statusLabel.startsWith("已");

/**
 * 基于交付单构建设备额度记录。
 */
export const buildDefaultDeviceRecord = (
  order: FdeDeliveryOrderItem | null,
): DeviceAllocationRecord => {
  if (!order) {
    return {
      cloudWorkbenchQuota: 0,
      localWorkbenchQuota: 0,
      localClientQuota: 0,
      effectiveAt: "",
      configuredAt: "",
      isConfigured: false,
    };
  }

  const localClientQuota =
    order.quotaAdjustments?.find(item => item.label === "本地客户端授权")?.delta ?? 0;
  const isConfigured =
    order.completedSteps.includes("deviceConfig") ||
    getFdeDeliveryStepIndex(order.currentStep) > getFdeDeliveryStepIndex("deviceConfig");

  return {
    cloudWorkbenchQuota: order.deviceConfig.cloudDeviceCount || 0,
    localWorkbenchQuota: order.deviceConfig.localDeviceCount || 0,
    localClientQuota,
    effectiveAt: order.launchTargetDate || "",
    configuredAt: isConfigured ? order.createdAt : "",
    isConfigured,
  };
};

/**
 * 判断当前设备额度是否只是预填，尚未确认保存。
 */
export const hasPendingDevicePrefill = (
  record: DeviceAllocationRecord,
): boolean =>
  !record.isConfigured &&
  ((record.cloudWorkbenchQuota ?? 0) > 0 ||
    (record.localWorkbenchQuota ?? 0) > 0 ||
    (record.localClientQuota ?? 0) > 0);

/**
 * 将设备记录转换为弹窗表单状态。
 */
export const buildDeviceFormState = (
  record: DeviceAllocationRecord,
): DeviceAllocationFormState => ({
  cloudWorkbenchQuota: record.cloudWorkbenchQuota,
  localWorkbenchQuota: record.localWorkbenchQuota,
  localClientQuota: record.localClientQuota,
  effectiveAt: record.effectiveAt,
});

/**
 * 获取当前交付单已添加的 AI 专家名称。
 */
export const getOrderAssignedAgentNames = (
  order: FdeDeliveryOrderItem,
): string[] => {
  const directAgentNames = (order.agentPackages ?? []).map(item => item.name);
  const groupAgentNames = (order.agentGroups ?? []).flatMap(group =>
    group.agents.map(item => item.name),
  );

  return Array.from(new Set([...directAgentNames, ...groupAgentNames]));
};

/**
 * 判断订单行是否为 AI 专家商品。
 */
export const isAgentOrderLineItem = (
  item: FdeOrderLineItem,
): item is Extract<FdeOrderLineItem, { kind: "agent" }> => item.kind === "agent";

/**
 * 判断订单行是否为 AI 专家团商品。
 */
export const isAgentGroupOrderLineItem = (
  item: FdeOrderLineItem,
): item is Extract<FdeOrderLineItem, { kind: "agentGroup" }> => item.kind === "agentGroup";

/**
 * 判断订单行是否为设备商品。
 */
export const isDeviceOrderLineItem = (
  item: FdeOrderLineItem,
): item is Extract<FdeOrderLineItem, { kind: "device" }> => item.kind === "device";

/**
 * 判断订单行是否为 tokens 商品。
 */
export const isTokensOrderLineItem = (
  item: FdeOrderLineItem,
): item is Extract<FdeOrderLineItem, { kind: "tokens" }> => item.kind === "tokens";

/**
 * 判断当前步骤是否允许直接跳过。
 */
export const shouldAllowSkipStep = (
  order: FdeDeliveryOrderItem,
  stepKey: FdeDeliveryStepKey,
): boolean => {
  if (stepKey === "deviceConfig") {
    return (
      order.deviceConfig.cloudDeviceCount === 0 &&
      order.deviceConfig.localDeviceCount === 0 &&
      (order.quotaAdjustments?.find(item => item.label === "本地客户端授权")?.delta ??
        0) === 0
    );
  }

  if (stepKey === "agentConfig") {
    return !order.agentGroups?.length && !order.agentPackages?.length;
  }

  if (stepKey === "apiTest") {
    return order.orderKind === "change" || Boolean(order.useFullFlow);
  }

  return false;
};

/**
 * 生成订单内容摘要。
 */
export const getOrderSummaryLabel = (order: FdeOrderItem): string => {
  const deviceCount = order.lineItems.filter(isDeviceOrderLineItem).length;
  const agentCount = order.lineItems.filter(isAgentOrderLineItem).length;
  const agentGroupCount = order.lineItems.filter(isAgentGroupOrderLineItem).length;
  const tokenCount = order.lineItems.filter(isTokensOrderLineItem).length;

  return [
    deviceCount ? `设备 ${deviceCount} 项` : "",
    agentCount ? `AI 专家 ${agentCount} 项` : "",
    agentGroupCount ? `AI 专家团 ${agentGroupCount} 项` : "",
    tokenCount ? `积分 ${tokenCount} 项` : "",
  ]
    .filter(Boolean)
    .join(" / ");
};

/**
 * 判断订单是否需要进入交付流程。
 */
export const isDeliverableOrder = (order: FdeOrderItem): boolean =>
  order.lineItems.some(
    item =>
      isDeviceOrderLineItem(item) ||
      isAgentOrderLineItem(item) ||
      isAgentGroupOrderLineItem(item),
  );

/**
 * 根据订单查找对应的交付单。
 */
export const getLinkedDeliveryOrder = (
  order: FdeOrderItem,
  deliveryItems: FdeDeliveryOrderItem[],
): FdeDeliveryOrderItem | null => {
  const linkedRecordId = order.fulfillmentItems.find(
    item =>
      (item.linkedRecordType === "delivery" || item.linkedRecordType === "change") &&
      item.linkedRecordId,
  )?.linkedRecordId;

  if (linkedRecordId) {
    return deliveryItems.find(item => item.id === linkedRecordId) ?? null;
  }

  return (
    deliveryItems.find(
      item => item.orderKind === "change" && item.linkedOrderIds?.includes(order.id),
    ) ?? null
  );
};

/**
 * 获取订单对应的交付状态。
 */
export const getOrderDeliveryStatus = (
  order: FdeOrderItem,
  deliveryItems: FdeDeliveryOrderItem[],
): FdeDeliveryOrderStatus =>
  getLinkedDeliveryOrder(order, deliveryItems)?.deliveryStatus ?? "待配置";

/**
 * 获取订单当前所在交付步骤文案。
 */
export const getOrderCurrentStepLabel = (
  order: FdeOrderItem,
  deliveryItems: FdeDeliveryOrderItem[],
): string => {
  const linkedDeliveryOrder = getLinkedDeliveryOrder(order, deliveryItems);

  return linkedDeliveryOrder ? getStepKeyLabel(linkedDeliveryOrder.currentStep) : "待开始";
};
