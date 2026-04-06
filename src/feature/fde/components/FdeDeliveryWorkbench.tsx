import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dayjs } from "dayjs";

import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import classNames from "classnames";
import { Button, DatePicker, Empty, Input, InputNumber, Modal, Select, message } from "antd";

import { FDE_AGENT_CATALOG_ITEMS } from "@/feature/fde/agentCatalog";
import { FDE_DELIVERY_STEPS } from "@/feature/fde/mockData";
import type {
  FdeAgentCatalogItem,
  FdeCreateOrderPayload,
  FdeCreateOrderResult,
  FdeAgentMonitorItem,
  FdeDeliveryAgentGroupItem,
  FdeDeliveryAgentPackageItem,
  FdeDeliveryChangeType,
  FdeDeliveryOrderItem,
  FdeDeliveryOrderStatus,
  FdeDeliveryStepItem,
  FdeDeliveryStepKey,
  FdeDeviceMonitorItem,
  FdeOrderAgentLineItem,
  FdeOrderDeviceLineItem,
  FdeOrderDeviceType,
  FdeOrderItem,
  FdeOrderLineItem,
  FdeOrderTokensLineItem,
  FdeTeamMemberItem,
} from "@/feature/fde/types";
import { getFdeDeliveryStepIndex, getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryWorkbenchProps {
  items: FdeDeliveryOrderItem[];
  orderItems: FdeOrderItem[];
  members: FdeTeamMemberItem[];
  currentMemberId: string;
  createOrder: (payload: FdeCreateOrderPayload) => FdeCreateOrderResult;
  selectedOrderId: string;
  syncOrders: (orders: FdeDeliveryOrderItem[]) => void;
  setSelectedOrderId: (orderId: string) => void;
}

interface DeliveryStepGuide {
  title: string;
  buttonLabel: string;
}

interface CreateOrderFormState {
  customerName: string;
  launchTargetDate: Dayjs | null;
  deliveryNote: string;
  tenantCode: string;
  tenantSeatCount: number | null;
  linkedOrderIds: string[];
}

interface DeviceAllocationFormState {
  cloudWorkbenchQuota: number | null;
  localWorkbenchQuota: number | null;
  localClientQuota: number | null;
  effectiveAt: string;
}

interface DeviceAllocationRecord extends DeviceAllocationFormState {
  configuredAt: string;
  isConfigured: boolean;
}

interface ExpertGroupFormState {
  name: string;
  description: string;
}

const BUSINESS_DEVICE_TYPE_OPTIONS: Array<{ label: string; value: FdeOrderDeviceType }> = [
  { label: "云端工作站", value: "云端工作站" },
  { label: "本地工作站", value: "本地工作站" },
  { label: "本地客户端授权", value: "本地客户端授权" },
];

interface CreateDeliveryRecordFormState {
  linkedOrderIds: string[];
  launchTargetDate: Dayjs | null;
  deliveryNote: string;
}

interface CreateBusinessOrderFormState {
  remark: string;
  lineItems: FdeOrderLineItem[];
}

type AgentPlazaScope = "public" | "mine";
type AgentSelectMode = "single" | "group";
type DeliveryStatusFilter = "all" | FdeDeliveryOrderStatus;

type DeliveryViewMode = "list" | "detail";
type DeliveryDetailTabKey = "orderInfo" | FdeDeliveryStepKey;
type DeliveryOrdersUpdater = (items: FdeDeliveryOrderItem[]) => FdeDeliveryOrderItem[];
type OrderPreviewFieldItem = {
  label: string;
  value: string;
};

interface LinkedOrderDeliveryDraft {
  changeType: FdeDeliveryChangeType | null;
  totalAmount: number;
  deviceConfig: FdeDeliveryOrderItem["deviceConfig"];
  expertNames: string[];
  agentPackages: FdeDeliveryAgentPackageItem[];
  changeDetailItems: NonNullable<FdeDeliveryOrderItem["changeDetailItems"]>;
  quotaAdjustments: NonNullable<FdeDeliveryOrderItem["quotaAdjustments"]>;
  deviceAdditions: FdeDeviceMonitorItem[];
  agentAdditions: FdeAgentMonitorItem[];
  summaryLabel: string;
}

const DELIVERY_STEP_GUIDES: Record<FdeDeliveryStepKey, DeliveryStepGuide> = {
  deviceConfig: {
    title: "设备分配",
    buttonLabel: "完成设备分配",
  },
  agentConfig: {
    title: "租户 Agent 下发",
    buttonLabel: "完成 Agent 下发",
  },
  apiTest: {
    title: "企业后台初始化",
    buttonLabel: "完成后台初始化",
  },
  preflight: {
    title: "交付验收",
    buttonLabel: "完成交付验收",
  },
};

const DEFAULT_REQUIRED_INPUTS: string[] = [
  "企业管理员姓名与联系方式",
  "初始化员工名单",
  "设备部署需求确认",
  "可用 Agent 范围确认",
];

const DEFAULT_ADMIN_TODO: string[] = [
  "在企业管理后台创建管理员账号",
  "配置员工、部门和设备归属关系",
  "确认 Agent 权限范围后开放使用",
];

const DEFAULT_PREFLIGHT_CHECKS: string[] = [
  "租户已创建",
  "初始化信息已补齐",
  "设备归属已确认",
  "企业管理员已接收交付说明",
];

const DEFAULT_HANDOFF_ITEMS: string[] = [
  "企业管理员已接手后台配置",
  "设备与人员绑定关系已确认",
  "可用 Agent 已完成下发",
];

const createOrderId = (): string => `delivery-manual-${Date.now().toString(36)}`;
const createGroupId = (): string => `delivery-group-${Date.now().toString(36)}`;

const createOrderNo = (): string => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = now.getTime().toString().slice(-3);
  return `FDE-${date}-${suffix}`;
};

const createInitialOrderForm = (): CreateOrderFormState => ({
  customerName: "",
  launchTargetDate: null,
  deliveryNote: "",
  tenantCode: "",
  tenantSeatCount: null,
  linkedOrderIds: [],
});

const createInitialExpertGroupForm = (): ExpertGroupFormState => ({
  name: "",
  description: "",
});

const createInitialDeliveryRecordForm = (): CreateDeliveryRecordFormState => ({
  linkedOrderIds: [],
  launchTargetDate: null,
  deliveryNote: "",
});

const createInitialBusinessOrderForm = (): CreateBusinessOrderFormState => ({
  remark: "",
  lineItems: [],
});

const getStepKeyLabel = (stepKey: FdeDeliveryStepKey): string =>
  FDE_DELIVERY_STEPS.find(item => item.key === stepKey)?.label ?? stepKey;

const getTenantStatusLabel = (stepKey: FdeDeliveryStepKey): string => {
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

const getDeliveryStatusLabel = (stepKey: FdeDeliveryStepKey): FdeDeliveryOrderStatus => {
  if (stepKey === "deviceConfig") {
    return "待配置";
  }

  return "配置中";
};

const getVisibleDeliverySteps = (order: FdeDeliveryOrderItem): FdeDeliveryStepItem[] => {
  if (order.orderKind !== "change" || order.useFullFlow) {
    return FDE_DELIVERY_STEPS;
  }

  if (order.changeType === "追加设备") {
    return FDE_DELIVERY_STEPS.filter(
      step => step.key === "deviceConfig" || step.key === "preflight",
    );
  }

  if (order.changeType === "追加Agent") {
    return FDE_DELIVERY_STEPS.filter(
      step => step.key === "agentConfig" || step.key === "preflight",
    );
  }

  if (order.changeType === "追加设备与Agent") {
    return FDE_DELIVERY_STEPS.filter(
      step =>
        step.key === "deviceConfig" ||
        step.key === "agentConfig" ||
        step.key === "preflight",
    );
  }

  return FDE_DELIVERY_STEPS;
};

const getStepStatusLabel = (
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

const getStepStatusClassName = (
  status: "已完成" | "已跳过" | "进行中" | "待处理",
): string => {
  if (status === "已完成") {
    return styles.stepStatusDone;
  }

  if (status === "已跳过") {
    return styles.stepStatusSkipped;
  }

  if (status === "进行中") {
    return styles.stepStatusActive;
  }

  return styles.stepStatusPending;
};

const getDeliveryItemStatusClassName = (statusLabel: string): string => {
  if (statusLabel.includes("已")) {
    return styles.deliveryStatusDone;
  }

  if (statusLabel.includes("待")) {
    return styles.deliveryStatusPending;
  }

  return styles.deliveryStatusNeutral;
};

const isDeliveryItemDelivered = (statusLabel: string): boolean => statusLabel.startsWith("已");

const buildDefaultDeviceRecord = (order: FdeDeliveryOrderItem): DeviceAllocationRecord => {
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

const hasPendingDevicePrefill = (record: DeviceAllocationRecord): boolean =>
  !record.isConfigured &&
  ((record.cloudWorkbenchQuota ?? 0) > 0 ||
    (record.localWorkbenchQuota ?? 0) > 0 ||
    (record.localClientQuota ?? 0) > 0);

const buildDeviceFormState = (record: DeviceAllocationRecord): DeviceAllocationFormState => ({
  cloudWorkbenchQuota: record.cloudWorkbenchQuota,
  localWorkbenchQuota: record.localWorkbenchQuota,
  localClientQuota: record.localClientQuota,
  effectiveAt: record.effectiveAt,
});

const buildManualOrder = (
  payload: CreateOrderFormState,
  currentMemberId: string,
  linkedOrders: FdeOrderItem[],
): FdeDeliveryOrderItem => {
  const customerName = payload.customerName.trim();
  const scenarioName = "待配置交付场景";
  const createdAt = new Date().toLocaleString("zh-CN", { hour12: false });
  const tenantSeatCount = payload.tenantSeatCount ?? 0;
  const totalAmount = linkedOrders.reduce((total, item) => total + item.totalAmount, 0);
  const tenantId = createOrderId();

  return {
    id: tenantId,
    tenantId,
    leadId: "",
    customerName,
    orderNo: createOrderNo(),
    assignedToId: currentMemberId,
    orderKind: "initial",
    industry: "待确认",
    scenarioName,
    currentStep: "deviceConfig",
    stepProgress: 0,
    orderAmount: totalAmount ? `¥ ${totalAmount.toLocaleString("zh-CN")}` : "待确认",
    tenantName: customerName,
    tenantCode: payload.tenantCode.trim(),
    adminName: "",
    adminPhone: "",
    attachments: [],
    linkedOrderIds: payload.linkedOrderIds,
    tenantStatusLabel: "租户已创建",
    deviceConfig: {
      mode: "云端设备",
      cloudDeviceCount: 0,
      localDeviceCount: 0,
      cloudNodeName: "",
      localDeviceName: "",
      pairingCode: "",
      osOwner: "LeDeep OS",
      region: "",
    },
    expertNames: ["待配置 AI 专家"],
    requiredInputs: DEFAULT_REQUIRED_INPUTS,
    handoffItems: DEFAULT_HANDOFF_ITEMS,
    agentGroups: [],
    agentPackages: [
      {
        name: "待配置 AI 专家",
        releaseVersion: "v1.0.0",
        sourceLabel: "待下发",
        statusLabel: "待配置",
        permissionHint: "需在企业管理后台确认开放范围。",
      },
    ],
    adminTodo: DEFAULT_ADMIN_TODO,
    apiTargets: [],
    memberCount: tenantSeatCount,
    createdAt,
    launchTargetDate: payload.launchTargetDate?.format("YYYY-MM-DD HH:mm") || "待确认",
    deliveryNote: payload.deliveryNote.trim() || "待补充交付说明",
    preflightChecks: DEFAULT_PREFLIGHT_CHECKS,
    completedSteps: [],
    deliveryStatus: "待配置",
  };
};

const getOrderAssignedAgentNames = (order: FdeDeliveryOrderItem): string[] => {
  const directAgentNames = (order.agentPackages ?? []).map(item => item.name);
  const groupAgentNames = (order.agentGroups ?? []).flatMap(group =>
    group.agents.map(item => item.name),
  );

  return Array.from(new Set([...directAgentNames, ...groupAgentNames]));
};

const isAgentOrderLineItem = (
  item: FdeOrderLineItem,
): item is Extract<FdeOrderLineItem, { kind: "agent" }> => item.kind === "agent";

const isDeviceOrderLineItem = (
  item: FdeOrderLineItem,
): item is Extract<FdeOrderLineItem, { kind: "device" }> => item.kind === "device";

const isTokensOrderLineItem = (
  item: FdeOrderLineItem,
): item is Extract<FdeOrderLineItem, { kind: "tokens" }> => item.kind === "tokens";

const createBusinessOrderLineId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const createBusinessDeviceLineItem = (deviceType: FdeOrderDeviceType): FdeOrderDeviceLineItem => ({
  id: createBusinessOrderLineId("device"),
  kind: "device",
  deviceType,
  quantity: 1,
  validityMonths: 12,
  unitPrice: 0,
  totalAmount: 0,
});

const createBusinessTokensLineItem = (): FdeOrderTokensLineItem => ({
  id: createBusinessOrderLineId("tokens"),
  kind: "tokens",
  tokenCount: 0,
  totalAmount: 0,
});

const createBusinessAgentLineItem = (agent: FdeAgentCatalogItem): FdeOrderAgentLineItem => ({
  id: createBusinessOrderLineId("agent"),
  kind: "agent",
  agentCatalogId: agent.id,
  agentName: agent.name,
  releaseVersion: agent.releaseVersion,
  sourceLabel: agent.sourceLabel,
  quantity: 1,
  validityMonths: 12,
  unitPrice: 0,
  totalAmount: 0,
});

const formatAmount = (value: number): string => `¥ ${value.toLocaleString("zh-CN")}`;

const formatTokenCount = (value: number): string => {
  if (value >= 10000) {
    const wanValue = value / 10000;
    const normalizedValue = Number.isInteger(wanValue) ? wanValue.toFixed(0) : wanValue.toFixed(1);
    return `${normalizedValue} 万 tokens`;
  }

  return `${value.toLocaleString("zh-CN")} tokens`;
};

const formatValidityLabel = (months?: number): string =>
  months && months > 0 ? `${months} 个月` : "未设置";

const appendUniqueOrderIds = (
  currentOrderIds: string[] | undefined,
  nextOrderIds: string[],
): string[] => Array.from(new Set([...(currentOrderIds ?? []), ...nextOrderIds]));

const appendUniqueStepKeys = (
  currentStepKeys: FdeDeliveryStepKey[] | undefined,
  nextStepKey: FdeDeliveryStepKey,
): FdeDeliveryStepKey[] => Array.from(new Set([...(currentStepKeys ?? []), nextStepKey]));

const getOrderDeviceUnit = (deviceType: FdeOrderDeviceLineItem["deviceType"]): string =>
  deviceType === "本地客户端授权" ? "个" : "台";

const shouldAllowSkipStep = (
  order: FdeDeliveryOrderItem,
  stepKey: FdeDeliveryStepKey,
): boolean => {
  if (stepKey === "deviceConfig") {
    return (
      order.deviceConfig.cloudDeviceCount === 0 &&
      order.deviceConfig.localDeviceCount === 0 &&
      (order.quotaAdjustments?.find(item => item.label === "本地客户端授权")?.delta ?? 0) === 0
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

const buildLinkedOrderDeliveryDraft = (
  draftId: string,
  linkedOrders: FdeOrderItem[],
  tenantOrder: FdeDeliveryOrderItem,
): LinkedOrderDeliveryDraft => {
  const deviceLineItems = linkedOrders.flatMap(item => item.lineItems.filter(isDeviceOrderLineItem));
  const agentLineItems = linkedOrders.flatMap(item => item.lineItems.filter(isAgentOrderLineItem));
  const totalAmount = linkedOrders.reduce((total, item) => total + item.totalAmount, 0);
  const cloudDeviceCount = deviceLineItems
    .filter(item => item.deviceType === "云端工作站")
    .reduce((total, item) => total + item.quantity, 0);
  const localDeviceCount = deviceLineItems
    .filter(item => item.deviceType === "本地工作站")
    .reduce((total, item) => total + item.quantity, 0);
  const localClientCount = deviceLineItems
    .filter(item => item.deviceType === "本地客户端授权")
    .reduce((total, item) => total + item.quantity, 0);
  const expertNames = Array.from(new Set(agentLineItems.map(item => item.agentName)));
  const agentPackages = Array.from(
    new Map(
      agentLineItems.map(item => [
        item.agentName,
        {
          name: item.agentName,
          releaseVersion: item.releaseVersion,
          sourceLabel: item.sourceLabel,
          statusLabel: "待下发",
          permissionHint: "待确认授权成员",
        },
      ]),
    ).values(),
  );
  const hasDevice = Boolean(deviceLineItems.length);
  const hasAgent = Boolean(agentLineItems.length);
  const changeType: FdeDeliveryChangeType | null = hasDevice
    ? hasAgent
      ? "追加设备与Agent"
      : "追加设备"
    : hasAgent
      ? "追加Agent"
      : null;

  return {
    changeType,
    totalAmount,
    deviceConfig: {
      mode:
        cloudDeviceCount && localDeviceCount
          ? "混合部署"
          : localDeviceCount || localClientCount
            ? "本地设备"
            : "云端设备",
      cloudDeviceCount,
      localDeviceCount,
      cloudNodeName: cloudDeviceCount ? "云端工作站" : "",
      localDeviceName: localDeviceCount ? "本地工作站" : "",
      pairingCode: "",
      osOwner: tenantOrder.deviceConfig.osOwner,
      region: tenantOrder.deviceConfig.region,
    },
    expertNames,
    agentPackages,
    changeDetailItems: [
      ...deviceLineItems.map(item => ({
        id: `${draftId}-${item.id}`,
        label: item.deviceType,
        afterValue: `${item.quantity} ${getOrderDeviceUnit(item.deviceType)}`,
      })),
      ...agentLineItems.map(item => ({
        id: `${draftId}-${item.id}`,
        label: "新增 Agent",
        afterValue: item.agentName,
      })),
    ],
    quotaAdjustments: [
      { label: "云端设备额度", delta: cloudDeviceCount, unit: "台" },
      { label: "本地设备额度", delta: localDeviceCount, unit: "台" },
      { label: "本地客户端授权", delta: localClientCount, unit: "个" },
    ].filter(item => item.delta > 0),
    deviceAdditions: deviceLineItems.flatMap(item =>
      Array.from({ length: item.quantity }).map((_, index) => ({
        id: `${draftId}-${item.id}-${index + 1}`,
        name: `${item.deviceType} ${index + 1}`,
        type: item.deviceType === "云端工作站" ? "cloud" : "local",
        status: "online" as const,
        uptime: "0 小时",
        categoryLabel: item.deviceType,
        ownerLabel: "订单预分配",
        assignedEmployeeName: "待客户分配",
        locationLabel: tenantOrder.deviceConfig.region || "待确认",
      })),
    ),
    agentAdditions: Array.from(
      new Map(
        agentLineItems.map(item => [
          item.agentName,
          {
            name: item.agentName,
            runningHours: 0,
            completedTasks: 0,
            currentVersion: item.releaseVersion,
            latestVersion: item.releaseVersion,
            deliverySourceLabel: item.sourceLabel,
            permissionScope: "待确认授权成员",
            assignedMembers: [],
            modelLabel: "Frontis 标准模型",
            deploymentLabel: "待确认",
          },
        ]),
      ).values(),
    ),
    summaryLabel: [
      deviceLineItems.length ? `设备 ${deviceLineItems.length} 项` : "",
      agentLineItems.length ? `AI 专家 ${expertNames.length} 项` : "",
    ]
      .filter(Boolean)
      .join(" / "),
  };
};

const getRelatedBusinessOrders = (
  deliveryOrder: FdeDeliveryOrderItem,
  orderItems: FdeOrderItem[],
): FdeOrderItem[] => {
  const directLinkedOrders = orderItems.filter(item =>
    (deliveryOrder.linkedOrderIds ?? []).includes(item.id),
  );

  if (directLinkedOrders.length) {
    return directLinkedOrders;
  }

  if (deliveryOrder.orderKind === "change") {
    return orderItems.filter(item =>
      item.fulfillmentItems.some(fulfillment => fulfillment.linkedRecordId === deliveryOrder.id),
    );
  }

  return orderItems.filter(item => item.tenantId === deliveryOrder.id);
};

const getLinkedDeliveryOrderByBusinessOrder = (
  businessOrder: FdeOrderItem,
  deliveryOrders: FdeDeliveryOrderItem[],
): FdeDeliveryOrderItem | null => {
  const linkedRecordId = businessOrder.fulfillmentItems.find(
    item =>
      (item.linkedRecordType === "delivery" || item.linkedRecordType === "change") &&
      item.linkedRecordId,
  )?.linkedRecordId;

  if (linkedRecordId) {
    return deliveryOrders.find(item => item.id === linkedRecordId) ?? null;
  }

  if (!businessOrder.tenantId) {
    return null;
  }

  return (
    deliveryOrders.find(
      item => item.id === businessOrder.tenantId && item.orderKind === "initial",
    ) ?? null
  );
};

const getOrderSummaryLabel = (order: FdeOrderItem): string => {
  const deviceCount = order.lineItems.filter(isDeviceOrderLineItem).length;
  const agentCount = order.lineItems.filter(isAgentOrderLineItem).length;
  const tokenCount = order.lineItems.filter(isTokensOrderLineItem).length;

  return [
    deviceCount ? `设备 ${deviceCount} 项` : "",
    agentCount ? `AI 专家 ${agentCount} 项` : "",
    tokenCount ? `tokens ${tokenCount} 项` : "",
  ]
    .filter(Boolean)
    .join(" / ");
};

const getDeliveryRecordLabel = (order: FdeDeliveryOrderItem): string =>
  order.orderKind === "initial" ? "首次交付" : order.changeType ?? "交付变更";

const sortTenantDeliveryRecords = (
  records: FdeDeliveryOrderItem[],
): FdeDeliveryOrderItem[] =>
  [...records].sort((left, right) => {
    if (left.orderKind !== right.orderKind) {
      return left.orderKind === "initial" ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });

/**
 * 配置交付视图。
 */
export const FdeDeliveryWorkbench = ({
  items,
  orderItems,
  members,
  currentMemberId,
  createOrder,
  selectedOrderId,
  syncOrders,
  setSelectedOrderId,
}: FdeDeliveryWorkbenchProps): JSX.Element => {
  const [orders, setOrders] = useState<FdeDeliveryOrderItem[]>(items);
  const [viewMode, setViewMode] = useState<DeliveryViewMode>(() =>
    items.find(item => item.id === selectedOrderId)?.orderKind === "change" ||
    orderItems.some(item => item.id === selectedOrderId)
      ? "detail"
      : "list",
  );
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState<boolean>(false);
  const [isCreateDeliveryModalOpen, setIsCreateDeliveryModalOpen] = useState<boolean>(false);
  const [isCreateBusinessOrderModalOpen, setIsCreateBusinessOrderModalOpen] =
    useState<boolean>(false);
  const [isBusinessAgentModalOpen, setIsBusinessAgentModalOpen] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [isExpertGroupModalOpen, setIsExpertGroupModalOpen] = useState<boolean>(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState<boolean>(false);
  const [deviceModalOrderId, setDeviceModalOrderId] = useState<string>("");
  const [agentModalOrderId, setAgentModalOrderId] = useState<string>("");
  const [agentSelectMode, setAgentSelectMode] = useState<AgentSelectMode>("single");
  const [agentScope, setAgentScope] = useState<AgentPlazaScope>("public");
  const [agentSceneCategory, setAgentSceneCategory] = useState<string>("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [selectedDetailTab, setSelectedDetailTab] = useState<DeliveryDetailTabKey>("orderInfo");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<DeliveryStatusFilter>("all");
  const [previewOrderId, setPreviewOrderId] = useState<string>("");
  const ordersRef = useRef<FdeDeliveryOrderItem[]>(items);
  const previousSelectedOrderIdRef = useRef<string>(selectedOrderId);
  const [createOrderForm, setCreateOrderForm] = useState<CreateOrderFormState>(createInitialOrderForm());
  const [createBusinessOrderForm, setCreateBusinessOrderForm] =
    useState<CreateBusinessOrderFormState>(createInitialBusinessOrderForm());
  const [createDeliveryForm, setCreateDeliveryForm] = useState<CreateDeliveryRecordFormState>(
    createInitialDeliveryRecordForm(),
  );
  const [expertGroupForm, setExpertGroupForm] = useState<ExpertGroupFormState>(
    createInitialExpertGroupForm(),
  );
  const [deviceForm, setDeviceForm] = useState<DeviceAllocationFormState>({
    cloudWorkbenchQuota: 0,
    localWorkbenchQuota: 0,
    localClientQuota: 0,
    effectiveAt: "",
  });
  const [deviceRecords, setDeviceRecords] = useState<Record<string, DeviceAllocationRecord>>(() =>
    items.reduce<Record<string, DeviceAllocationRecord>>((accumulator, item) => {
      accumulator[item.id] = buildDefaultDeviceRecord(item);
      return accumulator;
    }, {}),
  );

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    setOrders(previous => {
      const manualOrders = previous.filter(
        previousItem => !items.some(item => item.id === previousItem.id),
      );
      return [...manualOrders, ...items];
    });
  }, [items]);

  useEffect(() => {
    setDeviceRecords(previous => {
      const nextRecords = { ...previous };
      orders.forEach(order => {
        if (!nextRecords[order.id]) {
          nextRecords[order.id] = buildDefaultDeviceRecord(order);
        }
      });
      return nextRecords;
    });
  }, [orders]);

  const tenantListItems = useMemo<FdeDeliveryOrderItem[]>(
    () => orders.filter(item => item.orderKind === "initial"),
    [orders],
  );
  const selectableIds = useMemo<Set<string>>(
    () => new Set([...tenantListItems.map(item => item.id), ...orderItems.map(item => item.id)]),
    [orderItems, tenantListItems],
  );

  useEffect(() => {
    if (!tenantListItems.length) {
      return;
    }

    if (!selectableIds.has(selectedOrderId)) {
      setSelectedOrderId(tenantListItems[0].id);
    }
  }, [selectableIds, selectedOrderId, setSelectedOrderId, tenantListItems]);

  const selectedDeliveryRecord = useMemo(
    () => orders.find(item => item.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );
  const selectedBusinessOrder = useMemo(
    () => orderItems.find(item => item.id === selectedOrderId) ?? null,
    [orderItems, selectedOrderId],
  );
  const selectedTenantOrder = useMemo<FdeDeliveryOrderItem | null>(() => {
    if (selectedBusinessOrder?.tenantId) {
      return tenantListItems.find(item => item.id === selectedBusinessOrder.tenantId) ?? null;
    }

    if (!selectedDeliveryRecord) {
      return tenantListItems[0] ?? null;
    }

    if (selectedDeliveryRecord.orderKind === "initial") {
      return selectedDeliveryRecord;
    }

    return tenantListItems.find(item => item.id === selectedDeliveryRecord.tenantId) ?? null;
  }, [selectedBusinessOrder, selectedDeliveryRecord, tenantListItems]);
  const tenantDeliveryRecords = useMemo<FdeDeliveryOrderItem[]>(
    () =>
      selectedTenantOrder
        ? sortTenantDeliveryRecords(
            orders.filter(item => item.tenantId === selectedTenantOrder.tenantId),
          )
        : [],
    [orders, selectedTenantOrder],
  );
  const tenantBusinessOrders = useMemo<FdeOrderItem[]>(
    () =>
      selectedTenantOrder
        ? orderItems.filter(
            item => item.tenantId === selectedTenantOrder.id && item.businessType !== "续费",
          )
        : [],
    [orderItems, selectedTenantOrder],
  );
  const activeBusinessOrder = useMemo<FdeOrderItem | null>(
    () =>
      selectedBusinessOrder &&
      tenantBusinessOrders.some(item => item.id === selectedBusinessOrder.id)
        ? selectedBusinessOrder
        : tenantBusinessOrders[0] ?? null,
    [selectedBusinessOrder, tenantBusinessOrders],
  );
  const selectedOrder = useMemo<FdeDeliveryOrderItem | null>(
    () => {
      if (activeBusinessOrder) {
        return (
          getLinkedDeliveryOrderByBusinessOrder(activeBusinessOrder, orders) ?? selectedTenantOrder
        );
      }

      if (selectedDeliveryRecord) {
        return selectedDeliveryRecord.orderKind === "initial"
          ? selectedDeliveryRecord
          : selectedDeliveryRecord;
      }

      return selectedTenantOrder;
    },
    [activeBusinessOrder, orders, selectedDeliveryRecord, selectedTenantOrder],
  );
  const selectedTenantCustomerId = useMemo<string | undefined>(
    () =>
      tenantDeliveryRecords.find(item => item.relatedCustomerId)?.relatedCustomerId ??
      selectedTenantOrder?.relatedCustomerId,
    [selectedTenantOrder, tenantDeliveryRecords],
  );
  const selectedDeviceRecord = selectedOrder ? deviceRecords[selectedOrder.id] : null;
  const agentSceneCategories = useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          FDE_AGENT_CATALOG_ITEMS.filter(item => item.scope === agentScope).map(
            item => item.sceneCategory,
          ),
        ),
      ),
    [agentScope],
  );
  const visibleAgentPlazaItems = useMemo<FdeAgentCatalogItem[]>(
    () =>
      FDE_AGENT_CATALOG_ITEMS.filter(
        item =>
          item.scope === agentScope &&
          (!agentSceneCategory || item.sceneCategory === agentSceneCategory),
      ),
    [agentSceneCategory, agentScope],
  );
  const filteredOrderItems = useMemo<FdeDeliveryOrderItem[]>(
    () => {
      const normalizedKeyword = searchKeyword.trim().toLowerCase();

      return tenantListItems.filter(item => {
        const matchesStatus =
          deliveryStatusFilter === "all" || item.deliveryStatus === deliveryStatusFilter;

        if (!matchesStatus) {
          return false;
        }

        if (!normalizedKeyword) {
          return true;
        }

        const searchSource = [
          item.customerName,
          item.tenantName,
          item.tenantCode,
          item.scenarioName,
        ]
          .join(" ")
          .toLowerCase();

        return searchSource.includes(normalizedKeyword);
      });
    },
    [deliveryStatusFilter, searchKeyword, tenantListItems],
  );
  const selectedPreviewOrder = useMemo<FdeOrderItem | null>(
    () => orderItems.find(item => item.id === previewOrderId) ?? null,
    [orderItems, previewOrderId],
  );
  const previewLinkedTenant = useMemo<FdeDeliveryOrderItem | null>(
    () => {
      if (!selectedPreviewOrder) {
        return null;
      }

      return (
        orders.find(item => item.id === selectedPreviewOrder.tenantId) ??
        orders.find(item => item.linkedOrderIds?.includes(selectedPreviewOrder.id)) ??
        null
      );
    },
    [orders, selectedPreviewOrder],
  );
  const linkedOrdersInCreateModal = useMemo<FdeOrderItem[]>(
    () => orderItems.filter(item => createOrderForm.linkedOrderIds.includes(item.id)),
    [createOrderForm.linkedOrderIds, orderItems],
  );
  const linkedOrdersAmountLabel = useMemo<string>(
    () => {
      const totalAmount = linkedOrdersInCreateModal.reduce((total, item) => total + item.totalAmount, 0);

      return totalAmount ? `¥ ${totalAmount.toLocaleString("zh-CN")}` : "未关联订单";
    },
    [linkedOrdersInCreateModal],
  );
  const linkableOrderOptions = useMemo<FdeOrderItem[]>(
    () => {
      const normalizedCustomerName = createOrderForm.customerName.trim();

      return orderItems.filter(item => {
        if (item.tenantId) {
          return false;
        }

        if (!normalizedCustomerName) {
          return true;
        }

        return item.customerName === normalizedCustomerName;
      });
    },
    [createOrderForm.customerName, orderItems],
  );
  const linkedOrdersInDeliveryModal = useMemo<FdeOrderItem[]>(
    () => orderItems.filter(item => createDeliveryForm.linkedOrderIds.includes(item.id)),
    [createDeliveryForm.linkedOrderIds, orderItems],
  );
  const createDeliveryOrderOptions = useMemo<FdeOrderItem[]>(
    () => {
      if (!selectedOrder) {
        return [];
      }

      return orderItems.filter(item => {
        const isSameCustomer = item.customerName === selectedOrder.customerName;
        const isBoundToCurrentTenant = item.tenantId === selectedOrder.tenantId;
        const isUnbound = !item.tenantId;
        const alreadyLinkedToChangeRecord = orders.some(
          order =>
            order.orderKind === "change" &&
            order.tenantId === selectedOrder.tenantId &&
            order.linkedOrderIds?.includes(item.id),
        );

        if (!isSameCustomer || alreadyLinkedToChangeRecord) {
          return false;
        }

        if (item.status === "已完成") {
          return false;
        }

        return isBoundToCurrentTenant || isUnbound;
      });
    },
    [orderItems, orders, selectedOrder],
  );
  const createDeliveryDraft = useMemo<LinkedOrderDeliveryDraft | null>(
    () =>
      selectedTenantOrder && linkedOrdersInDeliveryModal.length
        ? buildLinkedOrderDeliveryDraft(
            `delivery-draft-${selectedTenantOrder.tenantId}`,
            linkedOrdersInDeliveryModal,
            selectedTenantOrder,
          )
        : null,
    [linkedOrdersInDeliveryModal, selectedTenantOrder],
  );

  useEffect(() => {
    if (viewMode === "detail" && !selectedTenantOrder) {
      setViewMode("list");
    }
  }, [selectedTenantOrder, viewMode]);

  useEffect(() => {
    if (!activeBusinessOrder && !selectedOrder) {
      return;
    }

    setSelectedDetailTab("orderInfo");
  }, [activeBusinessOrder?.id, selectedOrder?.id]);

  useEffect(() => {
    const hadPreviousSelectedOrderInCurrentList = selectableIds.has(
      previousSelectedOrderIdRef.current,
    );

    if (
      previousSelectedOrderIdRef.current &&
      hadPreviousSelectedOrderInCurrentList &&
      previousSelectedOrderIdRef.current !== selectedOrderId &&
      selectableIds.has(selectedOrderId)
    ) {
      setViewMode("detail");
    }

    previousSelectedOrderIdRef.current = selectedOrderId;
  }, [selectableIds, selectedOrderId]);

  useEffect(() => {
    if (!agentSceneCategories.length) {
      setAgentSceneCategory("");
      return;
    }

    if (!agentSceneCategories.includes(agentSceneCategory)) {
      setAgentSceneCategory(agentSceneCategories[0]);
    }
  }, [agentSceneCategories, agentSceneCategory]);

  useEffect(() => {
    if (!createOrderForm.linkedOrderIds.length) {
      return;
    }

    const normalizedCustomerName = createOrderForm.customerName.trim();
    const validLinkedOrderIds = orderItems
      .filter(
        item =>
          createOrderForm.linkedOrderIds.includes(item.id) &&
          (!normalizedCustomerName || item.customerName === normalizedCustomerName),
      )
      .map(item => item.id);

    if (validLinkedOrderIds.length === createOrderForm.linkedOrderIds.length) {
      return;
    }

    setCreateOrderForm(previous => ({
      ...previous,
      linkedOrderIds: validLinkedOrderIds,
    }));
  }, [createOrderForm.customerName, createOrderForm.linkedOrderIds, orderItems]);

  useEffect(() => {
    if (!createDeliveryForm.linkedOrderIds.length) {
      return;
    }

    const validLinkedOrderIds = createDeliveryOrderOptions
      .filter(item => createDeliveryForm.linkedOrderIds.includes(item.id))
      .map(item => item.id);

    if (validLinkedOrderIds.length === createDeliveryForm.linkedOrderIds.length) {
      return;
    }

    setCreateDeliveryForm(previous => ({
      ...previous,
      linkedOrderIds: validLinkedOrderIds,
    }));
  }, [createDeliveryForm.linkedOrderIds, createDeliveryOrderOptions]);

  const handleOpenAdmin = useCallback((): void => {
    window.open("/web/admin", "_blank", "noopener,noreferrer");
  }, []);

  const commitOrders = useCallback(
    (updater: DeliveryOrdersUpdater): FdeDeliveryOrderItem[] => {
      const nextOrders = updater(ordersRef.current);
      ordersRef.current = nextOrders;
      setOrders(nextOrders);
      syncOrders(nextOrders);
      return nextOrders;
    },
    [syncOrders],
  );

  const handleCreateFieldChange = useCallback(
    <TKey extends keyof CreateOrderFormState>(
      key: TKey,
      value: CreateOrderFormState[TKey],
    ): void => {
      setCreateOrderForm(previous => ({
        ...previous,
        [key]: value,
      }));
    },
    [],
  );

  const handleOpenCreateDrawer = useCallback((): void => {
    setCreateOrderForm(createInitialOrderForm());
    setIsCreateDrawerOpen(true);
  }, []);

  const handleCloseCreateDrawer = useCallback((): void => {
    setIsCreateDrawerOpen(false);
  }, []);

  const handleOpenCreateBusinessOrderModal = useCallback((): void => {
    if (!selectedTenantOrder) {
      return;
    }

    setCreateBusinessOrderForm(createInitialBusinessOrderForm());
    setIsCreateBusinessOrderModalOpen(true);
  }, [selectedTenantOrder]);

  const handleCloseCreateBusinessOrderModal = useCallback((): void => {
    setIsCreateBusinessOrderModalOpen(false);
    setIsBusinessAgentModalOpen(false);
    setCreateBusinessOrderForm(createInitialBusinessOrderForm());
  }, []);

  const handleCreateDeliveryFieldChange = useCallback(
    <TKey extends keyof CreateDeliveryRecordFormState>(
      key: TKey,
      value: CreateDeliveryRecordFormState[TKey],
    ): void => {
      setCreateDeliveryForm(previous => ({
        ...previous,
        [key]: value,
      }));
    },
    [],
  );

  const handleOpenCreateDeliveryModal = useCallback((): void => {
    if (!selectedTenantOrder) {
      return;
    }

    setCreateDeliveryForm({
      ...createInitialDeliveryRecordForm(),
      launchTargetDate: null,
    });
    setIsCreateDeliveryModalOpen(true);
  }, [selectedTenantOrder]);

  const handleCloseCreateDeliveryModal = useCallback((): void => {
    setIsCreateDeliveryModalOpen(false);
    setCreateDeliveryForm(createInitialDeliveryRecordForm());
  }, []);

  const handleOpenOrderPreview = useCallback((orderId: string): void => {
    setPreviewOrderId(orderId);
  }, []);

  const handleCloseOrderPreview = useCallback((): void => {
    setPreviewOrderId("");
  }, []);

  const handleLinkedOrderIdsChange = useCallback(
    (nextLinkedOrderIds: string[]): void => {
      const selectedLinkedOrders = orderItems.filter(item => nextLinkedOrderIds.includes(item.id));
      const fallbackCustomerName = selectedLinkedOrders[0]?.customerName ?? "";
      const nextCustomerName = createOrderForm.customerName.trim() || fallbackCustomerName;
      const validLinkedOrderIds = selectedLinkedOrders
        .filter(item => !nextCustomerName || item.customerName === nextCustomerName)
        .map(item => item.id);

      setCreateOrderForm(previous => ({
        ...previous,
        customerName: previous.customerName.trim() || fallbackCustomerName,
        linkedOrderIds: validLinkedOrderIds,
      }));
    },
    [createOrderForm.customerName, orderItems],
  );

  const handleUpdateBusinessOrderRemark = useCallback((value: string): void => {
    setCreateBusinessOrderForm(previous => ({
      ...previous,
      remark: value,
    }));
  }, []);

  const handleAddBusinessDeviceLine = useCallback((deviceType: FdeOrderDeviceType): void => {
    setCreateBusinessOrderForm(previous => ({
      ...previous,
      lineItems: [...previous.lineItems, createBusinessDeviceLineItem(deviceType)],
    }));
  }, []);

  const handleAddBusinessTokensLine = useCallback((): void => {
    setCreateBusinessOrderForm(previous => ({
      ...previous,
      lineItems: [...previous.lineItems, createBusinessTokensLineItem()],
    }));
  }, []);

  const handleOpenBusinessAgentModal = useCallback((): void => {
    setAgentScope("public");
    setAgentSceneCategory("");
    setIsBusinessAgentModalOpen(true);
  }, []);

  const handleCloseBusinessAgentModal = useCallback((): void => {
    setIsBusinessAgentModalOpen(false);
  }, []);

  const handleAddBusinessAgentLine = useCallback((targetAgent: FdeAgentCatalogItem): void => {
    let hasDuplicate = false;

    setCreateBusinessOrderForm(previous => {
      if (
        previous.lineItems.some(
          item => isAgentOrderLineItem(item) && item.agentCatalogId === targetAgent.id,
        )
      ) {
        hasDuplicate = true;
        return previous;
      }

      return {
        ...previous,
        lineItems: [...previous.lineItems, createBusinessAgentLineItem(targetAgent)],
      };
    });

    if (hasDuplicate) {
      message.warning("该 AI 专家已经在当前订单中。");
      return;
    }
  }, []);

  const handleRemoveBusinessLineItem = useCallback((lineItemId: string): void => {
    setCreateBusinessOrderForm(previous => ({
      ...previous,
      lineItems: previous.lineItems.filter(item => item.id !== lineItemId),
    }));
  }, []);

  const handleUpdateBusinessDeviceLine = useCallback(
    <TKey extends keyof FdeOrderDeviceLineItem>(
      lineItemId: string,
      key: TKey,
      value: FdeOrderDeviceLineItem[TKey],
    ): void => {
      setCreateBusinessOrderForm(previous => ({
        ...previous,
        lineItems: previous.lineItems.map(item => {
          if (!isDeviceOrderLineItem(item) || item.id !== lineItemId) {
            return item;
          }

          const nextItem = {
            ...item,
            [key]: value,
          };

          return {
            ...nextItem,
            totalAmount: nextItem.quantity * nextItem.unitPrice,
          };
        }),
      }));
    },
    [],
  );

  const handleUpdateBusinessAgentLinePrice = useCallback(
    (lineItemId: string, unitPrice: number | null): void => {
      setCreateBusinessOrderForm(previous => ({
        ...previous,
        lineItems: previous.lineItems.map(item =>
          isAgentOrderLineItem(item) && item.id === lineItemId
            ? {
                ...item,
                unitPrice: unitPrice ?? 0,
                totalAmount: unitPrice ?? 0,
              }
            : item,
        ),
      }));
    },
    [],
  );

  const handleUpdateBusinessAgentLineValidity = useCallback(
    (lineItemId: string, validityMonths: number | null): void => {
      setCreateBusinessOrderForm(previous => ({
        ...previous,
        lineItems: previous.lineItems.map(item =>
          isAgentOrderLineItem(item) && item.id === lineItemId
            ? {
                ...item,
                validityMonths: validityMonths ?? 0,
              }
            : item,
        ),
      }));
    },
    [],
  );

  const handleUpdateBusinessTokensLine = useCallback(
    <TKey extends keyof FdeOrderTokensLineItem>(
      lineItemId: string,
      key: TKey,
      value: FdeOrderTokensLineItem[TKey],
    ): void => {
      setCreateBusinessOrderForm(previous => ({
        ...previous,
        lineItems: previous.lineItems.map(item =>
          isTokensOrderLineItem(item) && item.id === lineItemId
            ? {
                ...item,
                [key]: value,
              }
            : item,
        ),
      }));
    },
    [],
  );

  const handleDeliveryLinkedOrderIdsChange = useCallback((nextLinkedOrderIds: string[]): void => {
    setCreateDeliveryForm(previous => ({
      ...previous,
      linkedOrderIds: nextLinkedOrderIds,
    }));
  }, []);

  const handleOpenDeviceModal = useCallback((order: FdeDeliveryOrderItem): void => {
    const record = deviceRecords[order.id] ?? buildDefaultDeviceRecord(order);
    setDeviceModalOrderId(order.id);
    setDeviceForm(buildDeviceFormState(record));
    setIsDeviceModalOpen(true);
  }, [deviceRecords]);

  const handleCloseDeviceModal = useCallback((): void => {
    setIsDeviceModalOpen(false);
    setDeviceModalOrderId("");
  }, []);

  const handleOpenExpertGroupModal = useCallback((order: FdeDeliveryOrderItem): void => {
    setAgentModalOrderId(order.id);
    setExpertGroupForm(createInitialExpertGroupForm());
    setSelectedAgentIds([]);
    setIsExpertGroupModalOpen(true);
  }, []);

  const handleCloseExpertGroupModal = useCallback((): void => {
    setIsExpertGroupModalOpen(false);
    setExpertGroupForm(createInitialExpertGroupForm());
    setAgentModalOrderId("");
  }, []);

  const handleExpertGroupFieldChange = useCallback(
    <TKey extends keyof ExpertGroupFormState>(key: TKey, value: ExpertGroupFormState[TKey]): void => {
      setExpertGroupForm(previous => ({
        ...previous,
        [key]: value,
      }));
    },
    [],
  );

  const handleOpenAgentModal = useCallback((order: FdeDeliveryOrderItem, mode: AgentSelectMode): void => {
    setAgentModalOrderId(order.id);
    setAgentSelectMode(mode);
    setAgentScope("public");
    setAgentSceneCategory("");
    setSelectedAgentIds([]);
    setExpertGroupForm(createInitialExpertGroupForm());
    setIsAgentModalOpen(true);
  }, []);

  const handleCloseAgentModal = useCallback((): void => {
    setIsAgentModalOpen(false);
    setAgentModalOrderId("");
    setSelectedAgentIds([]);
    setAgentSelectMode("single");
    setExpertGroupForm(createInitialExpertGroupForm());
  }, []);

  const handleCreateOrder = useCallback((): void => {
    if (
      !createOrderForm.customerName.trim() ||
      createOrderForm.tenantSeatCount === null ||
      !createOrderForm.launchTargetDate
    ) {
      message.warning("请先补齐客户名称、席位和交付时间。");
      return;
    }

    const linkedOrders = linkedOrdersInCreateModal;
    const linkedOrderDraft = buildLinkedOrderDeliveryDraft(
      "create-tenant",
      linkedOrders,
      {
        ...buildManualOrder(createOrderForm, currentMemberId || members[0]?.id || "", []),
        deviceConfig: {
          mode: "云端设备",
          cloudDeviceCount: 0,
          localDeviceCount: 0,
          cloudNodeName: "",
          localDeviceName: "",
          pairingCode: "",
          osOwner: "LeDeep OS",
          region: "待确认地域",
        },
      },
    );
    const manualOrder = buildManualOrder(
      createOrderForm,
      currentMemberId || members[0]?.id || "",
      linkedOrders,
    );
    const nextOrder = {
      ...manualOrder,
      deviceConfig:
        linkedOrderDraft.changeType !== null
          ? linkedOrderDraft.deviceConfig
          : manualOrder.deviceConfig,
      expertNames: linkedOrderDraft.expertNames.length
        ? linkedOrderDraft.expertNames
        : manualOrder.expertNames,
      agentPackages: linkedOrderDraft.agentPackages.length
        ? linkedOrderDraft.agentPackages
        : manualOrder.agentPackages,
      changeDetailItems: linkedOrderDraft.changeDetailItems,
      quotaAdjustments: linkedOrderDraft.quotaAdjustments,
      deviceAdditions: linkedOrderDraft.deviceAdditions,
      agentAdditions: linkedOrderDraft.agentAdditions,
      deliveryNote: [
        manualOrder.deliveryNote,
        linkedOrders.length ? `已关联 ${linkedOrders.length} 笔订单` : "",
        linkedOrderDraft.summaryLabel ? `已按订单预分配 ${linkedOrderDraft.summaryLabel}` : "",
      ]
        .filter(Boolean)
        .join("；"),
    };

    commitOrders(previous => [nextOrder, ...previous]);
    setSelectedOrderId(nextOrder.id);
    setViewMode("detail");
    setIsCreateDrawerOpen(false);
    message.success("租户已创建，已进入配置交付。");
  }, [commitOrders, createOrderForm, currentMemberId, linkedOrdersInCreateModal, members, setSelectedOrderId]);

  const createBusinessOrderTotalAmount = useMemo<number>(
    () =>
      createBusinessOrderForm.lineItems.reduce((total, item) => total + item.totalAmount, 0),
    [createBusinessOrderForm.lineItems],
  );

  const handleCreateBusinessOrder = useCallback((): void => {
    if (!selectedTenantOrder) {
      return;
    }

    if (!createBusinessOrderForm.lineItems.length) {
      message.warning("请先添加至少一个商品明细。");
      return;
    }

    const hasInvalidLineItem = createBusinessOrderForm.lineItems.some(item => {
      if (isDeviceOrderLineItem(item)) {
        return (
          item.quantity <= 0 ||
          item.unitPrice <= 0 ||
          item.totalAmount <= 0 ||
          (item.validityMonths ?? 0) <= 0
        );
      }

      if (isAgentOrderLineItem(item)) {
        return item.unitPrice <= 0 || item.totalAmount <= 0 || (item.validityMonths ?? 0) <= 0;
      }

      return item.tokenCount <= 0 || item.totalAmount <= 0;
    });

    if (hasInvalidLineItem) {
      message.warning("请先补齐商品数量和金额。");
      return;
    }

    const result = createOrder({
      customerName: selectedTenantOrder.customerName,
      tenantId: selectedTenantOrder.id,
      remark: createBusinessOrderForm.remark.trim(),
      lineItems: createBusinessOrderForm.lineItems,
    });

    if (!result.orderId) {
      message.warning("当前租户不可用，请刷新后重试。");
      return;
    }

    setSelectedOrderId(result.orderId);
    setSelectedDetailTab("orderInfo");
    setViewMode("detail");
    handleCloseCreateBusinessOrderModal();
    message.success("订单已创建，并已绑定到当前租户。");
  }, [
    createBusinessOrderForm.lineItems,
    createBusinessOrderForm.remark,
    createOrder,
    handleCloseCreateBusinessOrderModal,
    selectedTenantOrder,
    setSelectedOrderId,
  ]);

  const handleCreateDelivery = useCallback((): void => {
    if (!selectedTenantOrder) {
      return;
    }

    if (!createDeliveryForm.linkedOrderIds.length) {
      message.warning("请先关联至少一笔订单。");
      return;
    }

    if (!createDeliveryForm.launchTargetDate) {
      message.warning("请先设置交付时间。");
      return;
    }

    if (!createDeliveryDraft?.changeType) {
      message.warning("所选订单未包含设备或 AI 专家，无需创建交付记录。");
      return;
    }

    const now = new Date().toLocaleString("zh-CN", { hour12: false });
    const currentMemberName =
      getFdeMemberName(members, currentMemberId) || members[0]?.name || "FDE";
    const nextOrderId = createOrderId();
    const relatedOrderNumbers = linkedOrdersInDeliveryModal.map(item => item.orderNo).join("、");
    const nextOrder: FdeDeliveryOrderItem = {
      id: nextOrderId,
      tenantId: selectedTenantOrder.tenantId,
      leadId: "",
      customerName: selectedTenantOrder.customerName,
      orderNo: createOrderNo(),
      assignedToId: currentMemberId || selectedTenantOrder.assignedToId,
      orderKind: "change",
      relatedCustomerId: selectedTenantCustomerId,
      changeType: createDeliveryDraft.changeType,
      changeReason: "订单关联新增交付",
      requestedByName: currentMemberName,
      industry: selectedTenantOrder.industry,
      scenarioName: "订单追加交付",
      currentStep:
        createDeliveryDraft.changeType === "追加Agent" ? "agentConfig" : "deviceConfig",
      stepProgress: 0,
      orderAmount: createDeliveryDraft.totalAmount
        ? `¥ ${createDeliveryDraft.totalAmount.toLocaleString("zh-CN")}`
        : "待确认",
      tenantName: selectedTenantOrder.tenantName,
      tenantCode: selectedTenantOrder.tenantCode,
      adminName: "",
      adminPhone: "",
      attachments: [],
      linkedOrderIds: createDeliveryForm.linkedOrderIds,
      useFullFlow: true,
      skippedSteps: [],
      sourceLabel: "订单关联新增交付",
      tenantStatusLabel: "增量交付执行中",
      deliveryBoundary: "当前交付记录由订单关联生成，已按订单内容预分配待执行资源。",
      deliveryNote:
        createDeliveryForm.deliveryNote.trim() ||
        `已关联订单 ${relatedOrderNumbers}，设备与 Agent 已按订单内容预分配。`,
      deviceConfig: createDeliveryDraft.deviceConfig,
      expertNames: createDeliveryDraft.expertNames,
      requiredInputs: [
        "确认订单范围",
        "确认设备归属与授权对象",
        "确认生效时间",
      ],
      handoffItems: [
        "订单对应资源已完成交付",
        "设备归属与授权对象已确认",
        "客户已收到交付说明",
      ],
      agentGroups: [],
      agentPackages: createDeliveryDraft.agentPackages,
      adminTodo: ["按订单分配设备归属", "按订单下发 AI 专家", "同步客户交付说明"],
      apiTargets: [],
      memberCount: selectedTenantOrder.memberCount,
      createdAt: now,
      launchTargetDate: createDeliveryForm.launchTargetDate.format("YYYY-MM-DD HH:mm"),
      preflightChecks: [
        "订单资源已全部分配",
        "设备和 AI 专家已完成下发",
        "交付说明已同步",
      ],
      completedSteps: [],
      deliveryStatus: "待配置",
      changeDetailItems: createDeliveryDraft.changeDetailItems,
      quotaAdjustments: createDeliveryDraft.quotaAdjustments,
      deviceAdditions: createDeliveryDraft.deviceAdditions,
      agentAdditions: createDeliveryDraft.agentAdditions,
    };

    commitOrders(previous =>
      [
        nextOrder,
        ...previous.map(item =>
          item.id === selectedTenantOrder.id
            ? {
                ...item,
                linkedOrderIds: appendUniqueOrderIds(
                  item.linkedOrderIds,
                  createDeliveryForm.linkedOrderIds,
                ),
              }
            : item,
        ),
      ],
    );
    setSelectedOrderId(nextOrder.id);
    setViewMode("detail");
    setSelectedDetailTab("orderInfo");
    setIsCreateDeliveryModalOpen(false);
    setCreateDeliveryForm(createInitialDeliveryRecordForm());
    message.success("新增交付记录已创建，订单中的设备与 AI 专家已预分配。");
  }, [
    commitOrders,
    createDeliveryDraft,
    createDeliveryForm,
    currentMemberId,
    linkedOrdersInDeliveryModal,
    members,
    selectedTenantOrder,
    selectedTenantCustomerId,
    setSelectedOrderId,
  ]);

  const handleDeviceFieldChange = useCallback(
    <TKey extends keyof DeviceAllocationFormState>(key: TKey, value: DeviceAllocationFormState[TKey]): void => {
      setDeviceForm(previous => ({
        ...previous,
        [key]: value,
      }));
    },
    [],
  );

  const handleSaveDeviceAllocation = useCallback((): void => {
    if (!deviceModalOrderId) {
      return;
    }

    if (
      deviceForm.cloudWorkbenchQuota === null ||
      deviceForm.localWorkbenchQuota === null ||
      deviceForm.localClientQuota === null ||
      !deviceForm.effectiveAt.trim()
    ) {
      message.warning("请先补齐三类设备额度和生效时间。");
      return;
    }

    const configuredAt = new Date().toLocaleString("zh-CN", { hour12: false });

    setDeviceRecords(previous => ({
      ...previous,
      [deviceModalOrderId]: {
        ...deviceForm,
        configuredAt,
        isConfigured: true,
      },
    }));

    commitOrders(previous =>
      previous.map(item =>
        item.id === deviceModalOrderId
          ? {
              ...item,
              launchTargetDate: deviceForm.effectiveAt.trim(),
              deviceConfig: {
                ...item.deviceConfig,
                mode: "混合部署",
                cloudDeviceCount: deviceForm.cloudWorkbenchQuota ?? 0,
                localDeviceCount: deviceForm.localWorkbenchQuota ?? 0,
                cloudNodeName:
                  (deviceForm.cloudWorkbenchQuota ?? 0) > 0 ? "云端工作站" : "",
                localDeviceName:
                  (deviceForm.localWorkbenchQuota ?? 0) > 0 ? "本地工作站" : "",
              },
            }
          : item,
      ),
    );

    setIsDeviceModalOpen(false);
    setDeviceModalOrderId("");
    message.success("设备额度已保存。");
  }, [commitOrders, deviceForm, deviceModalOrderId]);

  const handleProceedToGroupAgentSelection = useCallback((): void => {
    if (!agentModalOrderId) {
      return;
    }

    if (!expertGroupForm.name.trim() || !expertGroupForm.description.trim()) {
      message.warning("请先补齐专家团名称和介绍。");
      return;
    }

    setIsExpertGroupModalOpen(false);
    setAgentSelectMode("group");
    setAgentScope("public");
    setAgentSceneCategory("");
    setSelectedAgentIds([]);
    setIsAgentModalOpen(true);
  }, [agentModalOrderId, expertGroupForm.description, expertGroupForm.name]);

  const handleToggleAgentSelection = useCallback((agentId: string): void => {
    setSelectedAgentIds(previous =>
      previous.includes(agentId)
        ? previous.filter(item => item !== agentId)
        : [...previous, agentId],
    );
  }, []);

  const handleAddAgentToOrder = useCallback((agent: FdeAgentCatalogItem): void => {
    if (!agentModalOrderId) {
      return;
    }

    let hasDuplicate = false;

    commitOrders(previous =>
      previous.map(item => {
        if (item.id !== agentModalOrderId) {
          return item;
        }

        const assignedAgentNames = getOrderAssignedAgentNames(item);
        if (assignedAgentNames.includes(agent.name)) {
          hasDuplicate = true;
          return item;
        }

        const currentPackages = item.agentPackages ?? [];
        return {
          ...item,
          expertNames: Array.from(new Set([...item.expertNames, agent.name])),
          agentPackages: [
            ...currentPackages,
            {
              name: agent.name,
              releaseVersion: agent.releaseVersion,
              sourceLabel: agent.sourceLabel,
              statusLabel: "待下发",
              permissionHint: agent.permissionHint,
            },
          ],
        };
      }),
    );

    if (hasDuplicate) {
      message.warning("该 Agent 已经添加到当前租户。");
      return;
    }

    message.success(`已添加 ${agent.name}。`);
  }, [agentModalOrderId, commitOrders]);

  const handleConfirmAgentGroup = useCallback((): void => {
    if (!agentModalOrderId) {
      return;
    }

    if (!selectedAgentIds.length) {
      message.warning("请先选择至少一个 AI 专家加入专家团。");
      return;
    }

    const selectedAgents = FDE_AGENT_CATALOG_ITEMS.filter(item => selectedAgentIds.includes(item.id));
    let duplicateCount = 0;

    commitOrders(previous =>
      previous.map(item => {
        if (item.id !== agentModalOrderId) {
          return item;
        }

        const assignedAgentNames = getOrderAssignedAgentNames(item);
        const nextAgents: FdeDeliveryAgentPackageItem[] = selectedAgents
          .filter(agent => {
            const isDuplicate = assignedAgentNames.includes(agent.name);
            if (isDuplicate) {
              duplicateCount += 1;
            }
            return !isDuplicate;
          })
          .map(agent => ({
            name: agent.name,
            releaseVersion: agent.releaseVersion,
            sourceLabel: agent.sourceLabel,
            statusLabel: "待下发",
            permissionHint: agent.permissionHint,
          }));

        if (!nextAgents.length) {
          return item;
        }

        const nextGroup: FdeDeliveryAgentGroupItem = {
          id: createGroupId(),
          name: expertGroupForm.name.trim(),
          description: expertGroupForm.description.trim(),
          sourceLabel: "FDE 组合交付",
          statusLabel: "待下发",
          agents: nextAgents,
        };

        return {
          ...item,
          expertNames: Array.from(
            new Set([...item.expertNames, ...nextAgents.map(agent => agent.name)]),
          ),
          agentGroups: [...(item.agentGroups ?? []), nextGroup],
        };
      }),
    );

    if (duplicateCount === selectedAgentIds.length) {
      message.warning("所选 AI 专家已经全部存在于当前订单中。");
      return;
    }

    setIsAgentModalOpen(false);
    setAgentModalOrderId("");
    setSelectedAgentIds([]);
    setExpertGroupForm(createInitialExpertGroupForm());
    setAgentSelectMode("single");
    message.success(
      duplicateCount
        ? `专家团已创建，已自动跳过 ${duplicateCount} 个重复 AI 专家。`
        : "AI 专家团已创建并加入订单。",
    );
  }, [agentModalOrderId, commitOrders, expertGroupForm.description, expertGroupForm.name, selectedAgentIds]);

  const handleDeliverAgentGroup = useCallback((orderId: string, groupId: string): void => {
    commitOrders(previous =>
      previous.map(item => {
        if (item.id !== orderId) {
          return item;
        }

        return {
          ...item,
          agentGroups: (item.agentGroups ?? []).map(group =>
            group.id === groupId
              ? {
                  ...group,
                  statusLabel: "已下发到租户",
                  agents: group.agents.map(agent => ({
                    ...agent,
                    statusLabel: "已下发到租户",
                  })),
                }
              : group,
          ),
        };
      }),
    );

    message.success("AI 专家团已下发到租户。");
  }, [commitOrders]);

  const handleDeliverSingleAgent = useCallback((orderId: string, agentName: string): void => {
    commitOrders(previous =>
      previous.map(item => {
        if (item.id !== orderId) {
          return item;
        }

        return {
          ...item,
          agentPackages: (item.agentPackages ?? []).map(agent =>
            agent.name === agentName
              ? {
                  ...agent,
                  statusLabel: "已下发到租户",
                }
              : agent,
          ),
        };
      }),
    );

    message.success(`${agentName} 已下发到租户。`);
  }, [commitOrders]);

  const handleEnterDetail = useCallback(
    (orderId: string): void => {
      setSelectedOrderId(orderId);
      setViewMode("detail");
      setSelectedDetailTab("orderInfo");
    },
    [setSelectedOrderId],
  );

  const handleBackToList = useCallback((): void => {
    setViewMode("list");
  }, []);

  const handleAdvanceStep = useCallback((skipCurrentStep = false): void => {
    if (!selectedOrder) {
      return;
    }

    if (
      !skipCurrentStep &&
      selectedOrder.currentStep === "deviceConfig" &&
      !selectedDeviceRecord?.isConfigured
    ) {
      message.warning("请先在设备分配步骤配置设备额度。");
      return;
    }

    if (!skipCurrentStep && selectedOrder.currentStep === "agentConfig") {
      const groupItems = selectedOrder.agentGroups ?? [];
      const singleItems = selectedOrder.agentPackages ?? [];
      const deliveryItems = [
        ...groupItems.map(item => item.statusLabel),
        ...singleItems.map(item => item.statusLabel),
      ];

      if (!deliveryItems.length) {
        message.warning("请先添加待下发记录。");
        return;
      }

      if (deliveryItems.some(item => !isDeliveryItemDelivered(item))) {
        message.warning("请先执行下发操作，再完成 Agent 下发。");
        return;
      }
    }

    const visibleSteps = getVisibleDeliverySteps(selectedOrder);
    const currentStepIndex = visibleSteps.findIndex(step => step.key === selectedOrder.currentStep);
    const nextStep = currentStepIndex >= 0 ? visibleSteps[currentStepIndex + 1] : undefined;

    commitOrders(previous =>
      previous.map(item => {
        if (item.id !== selectedOrder.id) {
          return item;
        }

        const completedSteps = skipCurrentStep
          ? item.completedSteps
          : appendUniqueStepKeys(item.completedSteps, item.currentStep);
        const skippedSteps = skipCurrentStep
          ? appendUniqueStepKeys(item.skippedSteps, item.currentStep)
          : item.skippedSteps ?? [];
        const progressedStepCount = new Set([...completedSteps, ...skippedSteps]).size;

        if (!nextStep) {
          return {
            ...item,
            completedSteps,
            skippedSteps,
            currentStep: item.currentStep,
            stepProgress: 100,
            tenantStatusLabel: "已完成初始化",
            deliveryStatus: "已交付",
          };
        }

        return {
          ...item,
          completedSteps,
          skippedSteps,
          currentStep: nextStep.key,
          stepProgress: Math.round((progressedStepCount / visibleSteps.length) * 100),
          tenantStatusLabel: getTenantStatusLabel(nextStep.key),
          deliveryStatus: getDeliveryStatusLabel(nextStep.key),
        };
      }),
    );

    if (!nextStep) {
      message.success(skipCurrentStep ? "已跳过当前步骤并完成交付验收。" : "已完成交付验收。");
      return;
    }

    message.success(
      skipCurrentStep
        ? `已跳过 ${getStepKeyLabel(selectedOrder.currentStep)}，进入 ${nextStep.label}。`
        : `已进入 ${nextStep.label}。`,
    );
  }, [commitOrders, selectedDeviceRecord?.isConfigured, selectedOrder]);

  const renderBusinessOrderLineItems = useCallback((businessOrder: FdeOrderItem): JSX.Element => {
    if (!businessOrder.lineItems.length) {
      return <div className={styles.emptyHint}>当前订单未配置商品明细。</div>;
    }

    return (
      <div className={styles.relatedOrderList}>
        {businessOrder.lineItems.map(item => (
          <div key={item.id} className={styles.relatedOrderCard}>
            <div className={styles.relatedOrderMain}>
              <div className={styles.relatedOrderTitleRow}>
                <span className={styles.relatedOrderTitle}>
                  {isDeviceOrderLineItem(item)
                    ? item.deviceType
                    : isAgentOrderLineItem(item)
                      ? item.agentName
                      : "tokens 资源包"}
                </span>
                <span className={styles.deliveryTypeTag}>
                  {isDeviceOrderLineItem(item)
                    ? "设备"
                    : isAgentOrderLineItem(item)
                      ? "AI 专家"
                      : "tokens"}
                </span>
              </div>
              <div className={styles.relatedOrderMeta}>
                {isDeviceOrderLineItem(item)
                  ? `数量 ${item.quantity} / 单价 ${formatAmount(item.unitPrice)} / 小计 ${formatAmount(item.totalAmount)} / 有效时长 ${formatValidityLabel(item.validityMonths)}`
                  : isAgentOrderLineItem(item)
                    ? `${item.releaseVersion} · ${item.sourceLabel} · ${formatAmount(item.totalAmount)} · 有效时长 ${formatValidityLabel(item.validityMonths)}`
                    : `${formatTokenCount(item.tokenCount)} · ${formatAmount(item.totalAmount)}`}
              </div>
              {((isDeviceOrderLineItem(item) || isAgentOrderLineItem(item)) &&
              item.deliveredAssetIds?.length) ? (
                <div className={styles.relatedOrderMeta}>
                  资产ID：{item.deliveredAssetIds.join("、")} · 到期时间：{item.expiresAt ?? "待交付后生成"}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }, []);

  const renderStepContent = useCallback(
    (order: FdeDeliveryOrderItem, stepKey: DeliveryDetailTabKey): JSX.Element => {
      if (stepKey === "orderInfo") {
        if (!activeBusinessOrder) {
          return (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>订单信息</div>
                <div className={styles.deliveryHint}>当前租户还没有绑定订单</div>
              </div>
              <div className={styles.emptyHint}>
                可先在左侧点击“新建订单”，再按订单推进交付配置。
              </div>
            </section>
          );
        }

        return (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>订单信息</div>
              <div className={styles.deliveryHint}>
                当前按订单推进交付，配置动作会同步到该订单对应的交付流程。
              </div>
            </div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单编号</span>
                <span className={styles.infoValue}>{activeBusinessOrder.orderNo}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单类型</span>
                <span className={styles.infoValue}>{activeBusinessOrder.businessType ?? "新购"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单状态</span>
                <span className={styles.infoValue}>{activeBusinessOrder.status}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>商品摘要</span>
                <span className={styles.infoValue}>{getOrderSummaryLabel(activeBusinessOrder)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>总金额</span>
                <span className={styles.infoValue}>
                  {formatAmount(activeBusinessOrder.totalAmount)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>创建时间</span>
                <span className={styles.infoValue}>{activeBusinessOrder.createdAt}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>关联交付</span>
                <span className={styles.infoValue}>
                  {order.orderKind === "initial" ? "首期交付" : order.changeType ?? "交付变更"} ·{" "}
                  {order.deliveryStatus}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单备注</span>
                <span className={styles.infoValue}>{activeBusinessOrder.remark || "未填写"}</span>
              </div>
            </div>
            <div className={styles.subSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.subSectionTitle}>商品明细</div>
                <Button onClick={() => handleOpenOrderPreview(activeBusinessOrder.id)}>
                  查看完整订单
                </Button>
              </div>
              {renderBusinessOrderLineItems(activeBusinessOrder)}
            </div>
            <div className={styles.subSection}>
              <div className={styles.subSectionTitle}>履约任务</div>
              {activeBusinessOrder.fulfillmentItems.length ? (
                <div className={styles.relatedOrderList}>
                  {activeBusinessOrder.fulfillmentItems.map(item => (
                    <div key={item.id} className={styles.relatedOrderCard}>
                      <div className={styles.relatedOrderMain}>
                        <div className={styles.relatedOrderTitleRow}>
                          <span className={styles.relatedOrderTitle}>{item.type}</span>
                          <span className={styles.deliveryTypeTag}>{item.status}</span>
                        </div>
                        <div className={styles.relatedOrderMeta}>{item.summary}</div>
                        <div className={styles.relatedOrderMeta}>
                          最近更新时间：{item.updatedAt}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyHint}>当前订单还没有履约任务。</div>
              )}
            </div>
          </section>
        );
      }

      if (stepKey === "deviceConfig") {
        const isCurrentStep = order.currentStep === "deviceConfig";
        const deviceRecord = deviceRecords[order.id] ?? buildDefaultDeviceRecord(order);
        const allowSkipCurrentStep = isCurrentStep && shouldAllowSkipStep(order, "deviceConfig");
        const hasPendingPrefill = hasPendingDevicePrefill(deviceRecord);

        return (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>设备分配</div>
              <div className={styles.sectionActions}>
                <Button onClick={() => handleOpenDeviceModal(order)}>配置设备额度</Button>
                {allowSkipCurrentStep ? (
                  <Button onClick={() => handleAdvanceStep(true)}>跳过此步骤</Button>
                ) : null}
                {isCurrentStep ? (
                  <Button type="primary" onClick={() => handleAdvanceStep()}>
                    {DELIVERY_STEP_GUIDES.deviceConfig.buttonLabel}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>分配状态</span>
                <span className={styles.infoValue}>
                  {deviceRecord.isConfigured
                    ? "已配置设备额度"
                    : hasPendingPrefill
                      ? "已按订单预填，待确认分配"
                      : "待配置设备额度"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>云端工作站额度</span>
                <span className={styles.infoValue}>
                  {deviceRecord.cloudWorkbenchQuota ?? 0} 台
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>本地工作站额度</span>
                <span className={styles.infoValue}>
                  {deviceRecord.localWorkbenchQuota ?? 0} 台
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>本地客户端额度</span>
                <span className={styles.infoValue}>
                  {deviceRecord.localClientQuota ?? 0} 个
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>生效时间</span>
                <span className={styles.infoValue}>{deviceRecord.effectiveAt || "待设置"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>最近保存时间</span>
                <span className={styles.infoValue}>{deviceRecord.configuredAt || "未保存"}</span>
              </div>
            </div>
          </section>
        );
      }

      if (stepKey === "agentConfig") {
        const isCurrentStep = order.currentStep === "agentConfig";
        const allowSkipCurrentStep = isCurrentStep && shouldAllowSkipStep(order, "agentConfig");
        const deliveryItems = [
          ...(order.agentGroups ?? []).map(group => ({
            id: group.id,
            kind: "group" as const,
            title: group.name,
            sourceLabel: group.sourceLabel,
            statusLabel: group.statusLabel,
            versionLabel: `${group.agents.length} 个 AI 专家`,
            description: "",
            agentNames: group.agents.map(item => item.name),
          })),
          ...(order.agentPackages ?? []).map(item => ({
            id: item.name,
            kind: "agent" as const,
            title: item.name,
            sourceLabel: item.sourceLabel,
            statusLabel: item.statusLabel,
            versionLabel: item.releaseVersion,
            description: "",
            agentNames: [] as string[],
          })),
        ];

        return (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>租户 Agent 下发</div>
              <div className={styles.sectionActions}>
                <Button onClick={() => handleOpenExpertGroupModal(order)}>添加 AI 专家团</Button>
                <Button onClick={() => handleOpenAgentModal(order, "single")}>
                  直接添加单个 AI 专家
                </Button>
                {allowSkipCurrentStep ? (
                  <Button onClick={() => handleAdvanceStep(true)}>跳过此步骤</Button>
                ) : null}
                {isCurrentStep ? (
                  <Button type="primary" onClick={() => handleAdvanceStep()}>
                    {DELIVERY_STEP_GUIDES.agentConfig.buttonLabel}
                  </Button>
                ) : null}
              </div>
            </div>
            {deliveryItems.length ? (
              <div className={styles.deliveryList}>
                {deliveryItems.map(item => (
                  <div key={`${item.kind}-${item.id}`} className={styles.deliveryCard}>
                    <div className={styles.deliveryCardHeader}>
                      <div className={styles.deliveryCardHeading}>
                        <div className={styles.deliveryCardTitleRow}>
                          <div className={styles.deliveryCardTitle}>{item.title}</div>
                          <span className={styles.deliveryTypeTag}>
                            {item.kind === "group" ? "专家团" : "AI 专家"}
                          </span>
                        </div>
                        <div className={styles.deliveryMetaRow}>
                          <span className={styles.deliveryMetaTag}>{item.sourceLabel}</span>
                          <span className={styles.deliveryMetaTag}>
                            {item.kind === "group" ? item.versionLabel : `版本 ${item.versionLabel}`}
                          </span>
                        </div>
                      </div>
                      <div className={styles.deliveryActions}>
                        <span
                          className={classNames(
                            styles.deliveryStatus,
                            getDeliveryItemStatusClassName(item.statusLabel),
                          )}
                        >
                          {item.statusLabel}
                        </span>
                        {!isDeliveryItemDelivered(item.statusLabel) ? (
                          <Button
                            size="small"
                            type="primary"
                            onClick={() =>
                              item.kind === "group"
                                ? handleDeliverAgentGroup(order.id, item.id)
                                : handleDeliverSingleAgent(order.id, item.id)
                            }
                          >
                            下发到租户
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {item.kind === "group" ? (
                      <div className={styles.deliveryTagList}>
                        {item.agentNames.map(name => (
                          <span key={name} className={styles.deliveryTag}>
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyHint}>当前未添加待下发的 AI 专家记录</div>
            )}
          </section>
        );
      }

      if (stepKey === "apiTest") {
        const isCurrentStep = order.currentStep === "apiTest";
        const allowSkipCurrentStep = isCurrentStep && shouldAllowSkipStep(order, "apiTest");

        return (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>企业后台初始化</div>
              <div className={styles.sectionActions}>
                <Button onClick={handleOpenAdmin}>进入企业管理后台</Button>
                {allowSkipCurrentStep ? (
                  <Button onClick={() => handleAdvanceStep(true)}>跳过此步骤</Button>
                ) : null}
                {isCurrentStep ? (
                  <Button type="primary" onClick={() => handleAdvanceStep()}>
                    {DELIVERY_STEP_GUIDES.apiTest.buttonLabel}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className={styles.lineList}>
              {(order.adminTodo ?? []).map(item => (
                <div key={item} className={styles.lineItem}>
                  {item}
                </div>
              ))}
            </div>
            {order.apiTargets.length ? (
              <div className={styles.subSection}>
                <div className={styles.subSectionTitle}>待补接口</div>
                <div className={styles.inlineText}>{order.apiTargets.join("、")}</div>
              </div>
            ) : null}
          </section>
        );
      }

      const isCurrentStep = order.currentStep === "preflight";

      return (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>交付验收与交接</div>
            <div className={styles.sectionActions}>
              {isCurrentStep ? (
                <Button type="primary" onClick={() => handleAdvanceStep()}>
                  {DELIVERY_STEP_GUIDES.preflight.buttonLabel}
                </Button>
              ) : null}
            </div>
          </div>
          <div className={styles.subSection}>
            <div className={styles.subSectionTitle}>验收检查</div>
            <div className={styles.lineList}>
              {order.preflightChecks.map(item => (
                <div key={item} className={styles.lineItem}>
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.subSection}>
            <div className={styles.subSectionTitle}>交接事项</div>
            <div className={styles.lineList}>
              {(order.handoffItems ?? []).map(item => (
                <div key={item} className={styles.lineItem}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    },
    [
      activeBusinessOrder,
      deviceRecords,
      handleAdvanceStep,
      handleOpenAdmin,
      handleOpenAgentModal,
      handleOpenDeviceModal,
      handleOpenExpertGroupModal,
      handleOpenOrderPreview,
      members,
      orderItems,
      renderBusinessOrderLineItems,
    ],
  );

  const createTenantModal = (
    <Modal
      title="创建租户"
      open={isCreateDrawerOpen}
      width={460}
      rootClassName={styles.createTenantModal}
      onCancel={handleCloseCreateDrawer}
      footer={null}
      destroyOnClose
    >
      <div className={styles.createTenantBody}>
        <div className={styles.drawerForm}>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>关联订单</div>
            <Select
              mode="multiple"
              allowClear
              className={styles.fullWidthSelect}
              placeholder={
                createOrderForm.customerName.trim()
                  ? "选择该客户下未关联租户的订单"
                  : "可先输入客户名称，再选择要绑定的订单"
              }
              value={createOrderForm.linkedOrderIds}
              options={linkableOrderOptions.map(item => ({
                label: `${item.orderNo} · ${item.customerName} · ¥ ${item.totalAmount.toLocaleString(
                  "zh-CN",
                )}`,
                value: item.id,
              }))}
              onChange={handleLinkedOrderIdsChange}
            />
            <div className={styles.deliveryHint}>
              一个租户可关联多个订单；订单中已明确的设备与 AI 专家会自动预分配到交付流程。
            </div>
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>客户名称</div>
            <Input
              value={createOrderForm.customerName}
              placeholder="可手动填写客户 / 租户名称，或通过关联订单自动带出"
              onChange={event => handleCreateFieldChange("customerName", event.target.value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>订单汇总</div>
            <div className={styles.linkedOrderSummary}>
              <span>已关联 {linkedOrdersInCreateModal.length} 笔订单</span>
              <strong>{linkedOrdersAmountLabel}</strong>
            </div>
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>租户编码</div>
            <Input
              value={createOrderForm.tenantCode}
              placeholder="请输入租户编码（可选）"
              onChange={event => handleCreateFieldChange("tenantCode", event.target.value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>租户席位</div>
            <InputNumber
              className={styles.fullWidthNumberInput}
              value={createOrderForm.tenantSeatCount}
              min={0}
              placeholder="请输入租户席位数量"
              onChange={value => handleCreateFieldChange("tenantSeatCount", value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>交付时间</div>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              className={styles.fullWidthDatePicker}
              value={createOrderForm.launchTargetDate}
              placeholder="请选择交付时间"
              onChange={value => handleCreateFieldChange("launchTargetDate", value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>交付备注</div>
            <Input.TextArea
              value={createOrderForm.deliveryNote}
              rows={4}
              placeholder="补充交付要求"
              onChange={event => handleCreateFieldChange("deliveryNote", event.target.value)}
            />
          </div>
          <div className={styles.drawerActions}>
            <Button onClick={handleCloseCreateDrawer}>取消</Button>
            <Button type="primary" onClick={handleCreateOrder}>
              创建租户并进入配置交付
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
  const createDeliveryModal = (
    <Modal
      title="新建交付"
      open={isCreateDeliveryModalOpen}
      width={520}
      rootClassName={styles.createTenantModal}
      onCancel={handleCloseCreateDeliveryModal}
      footer={null}
      destroyOnClose
    >
      <div className={styles.createTenantBody}>
        <div className={styles.drawerForm}>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>关联订单</div>
            <Select
              mode="multiple"
              allowClear
              className={styles.fullWidthSelect}
              placeholder="选择当前租户下的订单，或同客户未绑定租户的订单"
              value={createDeliveryForm.linkedOrderIds}
              options={createDeliveryOrderOptions.map(item => ({
                label: `${item.orderNo} · ${item.customerName} · ¥ ${item.totalAmount.toLocaleString(
                  "zh-CN",
                )}`,
                value: item.id,
              }))}
              onChange={handleDeliveryLinkedOrderIdsChange}
            />
            <div className={styles.deliveryHint}>
              支持关联当前租户下的订单，也支持绑定同客户未关联租户的订单。
            </div>
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>预分配结果</div>
            <div className={styles.linkedOrderSummary}>
              <span>{createDeliveryDraft?.summaryLabel || "暂未识别设备或 AI 专家"}</span>
              <strong>
                {createDeliveryDraft?.totalAmount
                  ? `¥ ${createDeliveryDraft.totalAmount.toLocaleString("zh-CN")}`
                  : "待选择订单"}
              </strong>
            </div>
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>交付时间</div>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              className={styles.fullWidthDatePicker}
              value={createDeliveryForm.launchTargetDate}
              placeholder="请选择交付时间"
              onChange={value => handleCreateDeliveryFieldChange("launchTargetDate", value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>交付备注</div>
            <Input.TextArea
              value={createDeliveryForm.deliveryNote}
              rows={4}
              placeholder="补充这次交付的说明"
              onChange={event =>
                handleCreateDeliveryFieldChange("deliveryNote", event.target.value)
              }
            />
          </div>
          <div className={styles.drawerActions}>
            <Button onClick={handleCloseCreateDeliveryModal}>取消</Button>
            <Button type="primary" onClick={handleCreateDelivery}>
              创建交付并进入操作
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
  const createBusinessOrderModal = (
    <Modal
      title="新建订单"
      open={isCreateBusinessOrderModalOpen}
      width={820}
      rootClassName={styles.createTenantModal}
      onCancel={handleCloseCreateBusinessOrderModal}
      footer={null}
      destroyOnClose
    >
      <div className={styles.createTenantBody}>
        <div className={styles.drawerForm}>
          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>客户名称</span>
              <span className={styles.infoValue}>{selectedTenantOrder?.customerName ?? "-"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>关联租户</span>
              <span className={styles.infoValue}>{selectedTenantOrder?.tenantName ?? "-"}</span>
            </div>
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>订单备注</div>
            <Input.TextArea
              value={createBusinessOrderForm.remark}
              rows={3}
              placeholder="补充订单说明、交付背景或客户要求"
              onChange={event => handleUpdateBusinessOrderRemark(event.target.value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.sectionHeader}>
              <div className={styles.drawerLabel}>商品明细</div>
              <div className={styles.inlineActions}>
                <Button onClick={() => handleAddBusinessDeviceLine("云端工作站")}>
                  添加设备
                </Button>
                <Button onClick={handleOpenBusinessAgentModal}>从专家广场添加 AI 专家</Button>
                <Button onClick={handleAddBusinessTokensLine}>添加 tokens</Button>
              </div>
            </div>
          </div>
          {createBusinessOrderForm.lineItems.length ? (
            <div className={styles.lineItemList}>
              {createBusinessOrderForm.lineItems.map(item => {
                if (isDeviceOrderLineItem(item)) {
                  return (
                    <div key={item.id} className={styles.lineItemCard}>
                      <div className={styles.lineItemHeader}>
                        <div className={styles.lineItemTitle}>{item.deviceType}</div>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveBusinessLineItem(item.id)}
                        />
                      </div>
                      <div className={styles.lineItemGrid}>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>设备类型</div>
                          <Select
                            className={styles.fullWidthControl}
                            value={item.deviceType}
                            options={BUSINESS_DEVICE_TYPE_OPTIONS}
                            onChange={value =>
                              handleUpdateBusinessDeviceLine(item.id, "deviceType", value)
                            }
                          />
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>数量</div>
                          <InputNumber
                            className={styles.fullWidthControl}
                            min={1}
                            value={item.quantity}
                            onChange={value =>
                              handleUpdateBusinessDeviceLine(item.id, "quantity", value ?? 0)
                            }
                          />
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>单价</div>
                          <InputNumber
                            className={styles.fullWidthControl}
                            min={0}
                            value={item.unitPrice}
                            formatter={value => `${value ?? ""}`}
                            onChange={value =>
                              handleUpdateBusinessDeviceLine(item.id, "unitPrice", value ?? 0)
                            }
                          />
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>有效时长（月）</div>
                          <InputNumber
                            className={styles.fullWidthControl}
                            min={1}
                            value={item.validityMonths}
                            onChange={value =>
                              handleUpdateBusinessDeviceLine(item.id, "validityMonths", value ?? 0)
                            }
                          />
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>小计</div>
                          <div className={styles.amountValue}>{formatAmount(item.totalAmount)}</div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isAgentOrderLineItem(item)) {
                  return (
                    <div key={item.id} className={styles.lineItemCard}>
                      <div className={styles.lineItemHeader}>
                        <div>
                          <div className={styles.lineItemTitle}>{item.agentName}</div>
                          <div className={styles.lineItemHint}>
                            {item.releaseVersion} · {item.sourceLabel}
                          </div>
                        </div>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveBusinessLineItem(item.id)}
                        />
                      </div>
                      <div className={styles.lineItemGrid}>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>商品单价</div>
                          <InputNumber
                            className={styles.fullWidthControl}
                            min={0}
                            value={item.unitPrice}
                            formatter={value => `${value ?? ""}`}
                            onChange={value =>
                              handleUpdateBusinessAgentLinePrice(item.id, value)
                            }
                          />
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>数量</div>
                          <div className={styles.amountValue}>1</div>
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>有效时长（月）</div>
                          <InputNumber
                            className={styles.fullWidthControl}
                            min={1}
                            value={item.validityMonths}
                            onChange={value =>
                              handleUpdateBusinessAgentLineValidity(item.id, value)
                            }
                          />
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>小计</div>
                          <div className={styles.amountValue}>{formatAmount(item.totalAmount)}</div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={item.id} className={styles.lineItemCard}>
                    <div className={styles.lineItemHeader}>
                      <div>
                        <div className={styles.lineItemTitle}>tokens 资源包</div>
                        <div className={styles.lineItemHint}>独立记录数量与金额</div>
                      </div>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveBusinessLineItem(item.id)}
                      />
                    </div>
                    <div className={styles.lineItemGrid}>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>tokens 数量</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={0}
                          value={item.tokenCount}
                          onChange={value =>
                            handleUpdateBusinessTokensLine(item.id, "tokenCount", value ?? 0)
                          }
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>金额</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={0}
                          value={item.totalAmount}
                          formatter={value => `${value ?? ""}`}
                          onChange={value =>
                            handleUpdateBusinessTokensLine(item.id, "totalAmount", value ?? 0)
                          }
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>数量展示</div>
                        <div className={styles.amountValue}>{formatTokenCount(item.tokenCount)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyHint}>先添加设备、AI 专家或 tokens 商品。</div>
          )}
          <div className={styles.summaryBar}>
            <div className={styles.summaryLabel}>订单总金额</div>
            <div className={styles.summaryValue}>{formatAmount(createBusinessOrderTotalAmount)}</div>
          </div>
          <div className={styles.drawerActions}>
            <Button onClick={handleCloseCreateBusinessOrderModal}>取消</Button>
            <Button type="primary" onClick={handleCreateBusinessOrder}>
              创建订单
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
  const businessAgentModal = (
    <Modal
      title="专家广场"
      open={isBusinessAgentModalOpen}
      centered
      width={980}
      rootClassName={styles.agentPlazaModal}
      onCancel={handleCloseBusinessAgentModal}
      footer={null}
      destroyOnClose
    >
      <div className={styles.agentPlaza}>
        <div className={styles.agentScopeTabs}>
          <button
            type="button"
            className={classNames(
              styles.agentScopeButton,
              agentScope === "public" && styles.agentScopeButtonActive,
            )}
            onClick={() => setAgentScope("public")}
          >
            公共
          </button>
          <button
            type="button"
            className={classNames(
              styles.agentScopeButton,
              agentScope === "mine" && styles.agentScopeButtonActive,
            )}
            onClick={() => setAgentScope("mine")}
          >
            我的
          </button>
        </div>

        <div className={styles.agentSceneTabs}>
          {agentSceneCategories.map(category => (
            <button
              key={category}
              type="button"
              className={classNames(
                styles.agentSceneButton,
                agentSceneCategory === category && styles.agentSceneButtonActive,
              )}
              onClick={() => setAgentSceneCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className={styles.agentPlazaList}>
          {visibleAgentPlazaItems.map(agent => (
            <div key={agent.id} className={styles.agentCard}>
              <div className={styles.agentCardHeader}>
                <div className={styles.agentAvatar}>{agent.name.slice(0, 1)}</div>
                <div className={styles.agentCardMeta}>
                  <div className={styles.agentCardName}>{agent.name}</div>
                  <div className={styles.agentCardVersion}>{agent.releaseVersion}</div>
                </div>
              </div>
              <div className={styles.agentDescription}>{agent.description}</div>
              <Button
                type="primary"
                className={styles.agentAddButton}
                onClick={() => handleAddBusinessAgentLine(agent)}
              >
                添加到订单
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
  const previewOrderFields: OrderPreviewFieldItem[] = selectedPreviewOrder
    ? [
        { label: "订单编号", value: selectedPreviewOrder.orderNo },
        { label: "客户名称", value: selectedPreviewOrder.customerName },
        { label: "订单类型", value: selectedPreviewOrder.businessType ?? "新购" },
        { label: "订单状态", value: selectedPreviewOrder.status },
        { label: "总金额", value: `¥ ${selectedPreviewOrder.totalAmount.toLocaleString("zh-CN")}` },
        { label: "创建时间", value: selectedPreviewOrder.createdAt },
        { label: "订单备注", value: selectedPreviewOrder.remark || "未填写" },
      ]
    : [];
  const orderPreviewModal = (
    <Modal
      title="订单信息"
      open={Boolean(selectedPreviewOrder)}
      width={760}
      rootClassName={styles.orderPreviewModal}
      onCancel={handleCloseOrderPreview}
      footer={null}
      destroyOnClose
    >
      {selectedPreviewOrder ? (
        <div className={styles.orderPreviewBody}>
          <div className={styles.infoRows}>
            {previewOrderFields.map(item => (
              <div key={item.label} className={styles.infoRow}>
                <span className={styles.infoLabel}>{item.label}</span>
                <span className={styles.infoValue}>{item.value}</span>
              </div>
            ))}
          </div>
          <div className={styles.subSection}>
            <div className={styles.subSectionTitle}>关联租户</div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>租户名称</span>
                <span className={styles.infoValue}>
                  {selectedPreviewOrder.tenantName ?? "未关联"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>租户编码</span>
                <span className={styles.infoValue}>
                  {selectedPreviewOrder.tenantCode ?? "未关联"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>交付状态</span>
                <span className={styles.infoValue}>
                  {previewLinkedTenant?.deliveryStatus ?? "未关联"}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.subSection}>
            <div className={styles.subSectionTitle}>商品明细</div>
            <div className={styles.relatedOrderList}>
              {selectedPreviewOrder.lineItems.map(item => (
                <div key={item.id} className={styles.relatedOrderCard}>
                  <div className={styles.relatedOrderMain}>
                    <div className={styles.relatedOrderTitleRow}>
                      <span className={styles.relatedOrderTitle}>
                        {isDeviceOrderLineItem(item)
                          ? item.deviceType
                          : isAgentOrderLineItem(item)
                            ? item.agentName
                            : "tokens 资源包"}
                      </span>
                      <span className={styles.deliveryTypeTag}>
                        {isDeviceOrderLineItem(item)
                          ? "设备"
                          : isAgentOrderLineItem(item)
                            ? "AI 专家"
                            : "tokens"}
                      </span>
                    </div>
                    <div className={styles.relatedOrderMeta}>
                      {isDeviceOrderLineItem(item)
                        ? `数量 ${item.quantity} / 单价 ¥ ${item.unitPrice.toLocaleString("zh-CN")} / 小计 ¥ ${item.totalAmount.toLocaleString("zh-CN")} / 有效时长 ${formatValidityLabel(item.validityMonths)}`
                        : isAgentOrderLineItem(item)
                          ? `${item.releaseVersion} · ${item.sourceLabel} · ¥ ${item.totalAmount.toLocaleString("zh-CN")} · 有效时长 ${formatValidityLabel(item.validityMonths)}`
                          : `${item.tokenCount.toLocaleString("zh-CN")} tokens · ¥ ${item.totalAmount.toLocaleString("zh-CN")}`}
                    </div>
                    {((isDeviceOrderLineItem(item) || isAgentOrderLineItem(item)) &&
                    item.deliveredAssetIds?.length) ? (
                      <div className={styles.relatedOrderMeta}>
                        资产ID：{item.deliveredAssetIds.join("、")} · 到期时间：{item.expiresAt ?? "待交付后生成"}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.subSection}>
            <div className={styles.subSectionTitle}>履约任务</div>
            {selectedPreviewOrder.fulfillmentItems.length ? (
              <div className={styles.relatedOrderList}>
                {selectedPreviewOrder.fulfillmentItems.map(item => (
                  <div key={item.id} className={styles.relatedOrderCard}>
                    <div className={styles.relatedOrderMain}>
                      <div className={styles.relatedOrderTitleRow}>
                        <span className={styles.relatedOrderTitle}>{item.type}</span>
                        <span className={styles.deliveryTypeTag}>{item.status}</span>
                      </div>
                      <div className={styles.relatedOrderMeta}>{item.summary}</div>
                      <div className={styles.relatedOrderMeta}>最近更新时间：{item.updatedAt}</div>
                      {item.executionRecords.length ? (
                        <div className={styles.executionRecordList}>
                          {item.executionRecords.map(record => (
                            <div key={record.id} className={styles.executionRecordItem}>
                              <div className={styles.executionRecordHeader}>
                                <span className={styles.executionRecordAction}>
                                  {record.actionLabel}
                                </span>
                                <span className={styles.executionRecordResult}>
                                  {record.resultLabel}
                                </span>
                              </div>
                              <div className={styles.executionRecordMeta}>
                                {record.operatorName} · {record.operatedAt}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyHint}>当前订单还没有履约任务</div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );

  if (!orders.length) {
    return (
      <div className={styles.layout}>
        <div className={styles.pageBarActionsOnly}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateDrawer}>
            创建租户
          </Button>
        </div>
        <Empty description="当前暂无交付单" />
        {createTenantModal}
        {orderPreviewModal}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className={styles.layout}>
        <div className={styles.pageBarActionsOnly}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateDrawer}>
            创建租户
          </Button>
        </div>
        <div className={styles.listFilters}>
          <Input
            value={searchKeyword}
            className={styles.searchInput}
            placeholder="搜索客户名称、租户名称、租户编码或交付场景"
            onChange={event => setSearchKeyword(event.target.value)}
          />
          <Select<DeliveryStatusFilter>
            value={deliveryStatusFilter}
            className={styles.filterSelect}
            options={[
              { label: "全部状态", value: "all" },
              { label: "待配置", value: "待配置" },
              { label: "配置中", value: "配置中" },
              { label: "已交付", value: "已交付" },
            ]}
            onChange={value => setDeliveryStatusFilter(value)}
          />
        </div>

        <div className={styles.listTable}>
          <div className={styles.listHeader}>
            <span>客户名称</span>
            <span>租户名称</span>
            <span>交付场景</span>
            <span>交付状态</span>
            <span>交付时间</span>
            <span>当前步骤</span>
            <span>操作</span>
          </div>
          {filteredOrderItems.length ? (
            filteredOrderItems.map(item => (
              <button
                key={item.id}
                type="button"
                className={styles.listRow}
                onClick={() => handleEnterDetail(item.id)}
              >
                <span className={styles.tableStrong}>{item.customerName}</span>
                <span>{item.tenantName}</span>
                <span>{item.scenarioName}</span>
                <span
                  className={classNames(
                    styles.listStatus,
                    item.deliveryStatus === "已交付" && styles.listStatusDelivered,
                  )}
                >
                  {item.deliveryStatus}
                </span>
                <span>{item.launchTargetDate}</span>
                <span>{getStepKeyLabel(item.currentStep)}</span>
                <span className={styles.listAction}>进入配置交付</span>
              </button>
            ))
          ) : (
            <div className={styles.listEmpty}>当前筛选条件下暂无交付单</div>
          )}
        </div>
        {createTenantModal}
        {orderPreviewModal}
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {selectedOrder ? (
        <div className={styles.detailView}>
          <div className={styles.pageBar}>
            <div className={styles.titleGroup}>
              <Button
                type="text"
                className={styles.backButton}
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToList}
              >
                返回交付列表
              </Button>
              <h2 className={styles.pageTitle}>{selectedTenantOrder?.tenantName ?? selectedOrder.customerName}</h2>
            </div>
          </div>

          <div className={styles.detailShell}>
            <aside className={styles.recordSidebar}>
              <div className={styles.recordSidebarHeader}>
                <div>
                  <div className={styles.sectionTitle}>订单列表</div>
                  <div className={styles.deliveryHint}>
                    {selectedTenantOrder?.tenantName ?? selectedOrder.tenantName} 当前共有 {tenantBusinessOrders.length} 笔订单
                  </div>
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleOpenCreateBusinessOrderModal}
                >
                  新建订单
                </Button>
              </div>
              <div className={styles.recordSidebarList}>
                {tenantBusinessOrders.length ? (
                  tenantBusinessOrders.map(item => {
                    const linkedDeliveryOrder =
                      getLinkedDeliveryOrderByBusinessOrder(item, tenantDeliveryRecords) ??
                      selectedTenantOrder;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={classNames(
                          styles.recordSidebarItem,
                          item.id === activeBusinessOrder?.id && styles.recordSidebarItemActive,
                        )}
                        onClick={() => handleEnterDetail(item.id)}
                      >
                        <div className={styles.tenantRecordTitleRow}>
                          <span className={styles.tenantRecordTitle}>{item.orderNo}</span>
                          <span className={styles.deliveryTypeTag}>{item.status}</span>
                        </div>
                        <div className={styles.tenantRecordMeta}>{getOrderSummaryLabel(item)}</div>
                        <div className={styles.tenantRecordMeta}>
                          {formatAmount(item.totalAmount)} · {item.createdAt}
                        </div>
                        <div className={styles.tenantRecordMeta}>
                          当前步骤：
                          {linkedDeliveryOrder
                            ? getStepKeyLabel(linkedDeliveryOrder.currentStep)
                            : "待开始"}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className={styles.emptyHint}>当前租户还没有订单</div>
                )}
              </div>
            </aside>

            <div className={styles.recordMain}>
              <div className={styles.recordMainHeader}>
                <div className={styles.sectionTitle}>交付操作</div>
                <div className={styles.deliveryHint}>
                  当前按订单推进交付配置，订单里的设备与 AI 专家会直接进入对应步骤。
                </div>
              </div>

              <div className={styles.stepNav}>
                <button
                  type="button"
                  className={classNames(
                    styles.stepButton,
                    selectedDetailTab === "orderInfo" && styles.stepButtonActive,
                  )}
                  onClick={() => setSelectedDetailTab("orderInfo")}
                >
                  <span>订单信息</span>
                </button>
                {getVisibleDeliverySteps(selectedOrder).map(step => {
                  const stepStatus = getStepStatusLabel(selectedOrder, step.key);

                  return (
                    <button
                      key={step.key}
                      type="button"
                      className={classNames(
                        styles.stepButton,
                        step.key === selectedDetailTab && styles.stepButtonActive,
                      )}
                      onClick={() => setSelectedDetailTab(step.key)}
                    >
                      <span>{step.label}</span>
                      <span
                        className={classNames(
                          styles.stepStatus,
                          getStepStatusClassName(stepStatus),
                        )}
                      >
                        {stepStatus}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.recordMainBody}>
                {renderStepContent(selectedOrder, selectedDetailTab)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Empty description="请选择交付单" />
      )}
      {createBusinessOrderModal}
      {businessAgentModal}
      {orderPreviewModal}
      <Modal
        title="配置设备额度"
        open={isDeviceModalOpen}
        width={420}
        onCancel={handleCloseDeviceModal}
        footer={null}
        destroyOnClose
      >
        <div className={styles.drawerForm}>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>云端工作站额度</div>
            <InputNumber
              className={styles.fullWidthNumberInput}
              value={deviceForm.cloudWorkbenchQuota}
              min={0}
              placeholder="请输入云端工作站额度"
              onChange={value => handleDeviceFieldChange("cloudWorkbenchQuota", value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>本地工作站额度</div>
            <InputNumber
              className={styles.fullWidthNumberInput}
              value={deviceForm.localWorkbenchQuota}
              min={0}
              placeholder="请输入本地工作站额度"
              onChange={value => handleDeviceFieldChange("localWorkbenchQuota", value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>本地客户端额度</div>
            <InputNumber
              className={styles.fullWidthNumberInput}
              value={deviceForm.localClientQuota}
              min={0}
              placeholder="请输入本地客户端额度"
              onChange={value => handleDeviceFieldChange("localClientQuota", value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>生效时间</div>
            <Input
              value={deviceForm.effectiveAt}
              placeholder="例如 2026-04-20 10:00"
              onChange={event => handleDeviceFieldChange("effectiveAt", event.target.value)}
            />
          </div>
          <div className={styles.drawerActions}>
            <Button onClick={handleCloseDeviceModal}>取消</Button>
            <Button type="primary" onClick={handleSaveDeviceAllocation}>
              保存设备额度
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        title="创建 AI 专家团"
        open={isExpertGroupModalOpen}
        width={520}
        onCancel={handleCloseExpertGroupModal}
        footer={null}
        destroyOnClose
      >
        <div className={styles.drawerForm}>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>专家团名称</div>
            <Input
              value={expertGroupForm.name}
              placeholder="请输入专家团名称"
              onChange={event => handleExpertGroupFieldChange("name", event.target.value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>专家团介绍</div>
            <Input.TextArea
              value={expertGroupForm.description}
              rows={4}
              placeholder="请输入专家团介绍"
              onChange={event =>
                handleExpertGroupFieldChange("description", event.target.value)
              }
            />
          </div>
          <div className={styles.drawerActions}>
            <Button onClick={handleCloseExpertGroupModal}>取消</Button>
            <Button type="primary" onClick={handleProceedToGroupAgentSelection}>
              下一步选择 AI 专家
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        title={agentSelectMode === "group" ? "为专家团选择 AI 专家" : "Agent 广场"}
        open={isAgentModalOpen}
        centered
        width={980}
        rootClassName={styles.agentPlazaModal}
        onCancel={handleCloseAgentModal}
        footer={null}
        destroyOnClose
      >
        <div className={styles.agentPlaza}>
          {agentSelectMode === "group" ? (
            <div className={styles.groupDraftBar}>
              <div className={styles.groupDraftTitle}>{expertGroupForm.name}</div>
              <div className={styles.groupDraftDescription}>{expertGroupForm.description}</div>
            </div>
          ) : null}
          <div className={styles.agentScopeTabs}>
            <button
              type="button"
              className={classNames(
                styles.agentScopeButton,
                agentScope === "public" && styles.agentScopeButtonActive,
              )}
              onClick={() => setAgentScope("public")}
            >
              公共
            </button>
            <button
              type="button"
              className={classNames(
                styles.agentScopeButton,
                agentScope === "mine" && styles.agentScopeButtonActive,
              )}
              onClick={() => setAgentScope("mine")}
            >
              我的
            </button>
          </div>

          <div className={styles.agentSceneTabs}>
            {agentSceneCategories.map(category => (
              <button
                key={category}
                type="button"
                className={classNames(
                  styles.agentSceneButton,
                  agentSceneCategory === category && styles.agentSceneButtonActive,
                )}
                onClick={() => setAgentSceneCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className={styles.agentPlazaList}>
            {visibleAgentPlazaItems.map(agent => (
              <div
                key={agent.id}
                className={classNames(
                  styles.agentCard,
                  agentSelectMode === "group" &&
                    selectedAgentIds.includes(agent.id) &&
                    styles.agentCardSelected,
                )}
              >
                <div className={styles.agentCardHeader}>
                  <div className={styles.agentAvatar}>{agent.name.slice(0, 1)}</div>
                  <div className={styles.agentCardMeta}>
                    <div className={styles.agentCardName}>{agent.name}</div>
                    <div className={styles.agentCardVersion}>{agent.releaseVersion}</div>
                  </div>
                </div>
                <div className={styles.agentDescription}>{agent.description}</div>
                {agentSelectMode === "group" ? (
                  <Button
                    type={selectedAgentIds.includes(agent.id) ? "primary" : "default"}
                    className={styles.agentAddButton}
                    onClick={() => handleToggleAgentSelection(agent.id)}
                  >
                    {selectedAgentIds.includes(agent.id) ? "已加入专家团" : "加入专家团"}
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    className={styles.agentAddButton}
                    onClick={() => handleAddAgentToOrder(agent)}
                  >
                    添加到租户
                  </Button>
                )}
              </div>
            ))}
          </div>
          {agentSelectMode === "group" ? (
            <div className={styles.groupDraftActions}>
              <span className={styles.groupDraftCount}>已选择 {selectedAgentIds.length} 个 AI 专家</span>
              <div className={styles.drawerActions}>
                <Button onClick={handleCloseAgentModal}>取消</Button>
                <Button type="primary" onClick={handleConfirmAgentGroup}>
                  创建专家团并加入订单
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};
