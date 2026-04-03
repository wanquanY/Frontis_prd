import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { Button, Empty, Input, InputNumber, Modal, message } from "antd";

import { FDE_DELIVERY_STEPS } from "@/feature/fde/mockData";
import type {
  FdeDeliveryAgentGroupItem,
  FdeDeliveryAgentPackageItem,
  FdeDeliveryOrderItem,
  FdeDeliveryOrderStatus,
  FdeDeliveryStepKey,
  FdeTeamMemberItem,
} from "@/feature/fde/types";
import { getFdeDeliveryStepIndex, getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryWorkbenchProps {
  items: FdeDeliveryOrderItem[];
  members: FdeTeamMemberItem[];
  currentMemberId: string;
  selectedOrderId: string;
  setSelectedOrderId: (orderId: string) => void;
}

interface DeliveryStepGuide {
  title: string;
  buttonLabel: string;
}

interface CreateOrderFormState {
  customerName: string;
  scenarioName: string;
  orderAmount: string;
  launchTargetDate: string;
  industry: string;
  deliveryNote: string;
}

interface TenantCreateFormState {
  tenantName: string;
  adminName: string;
  adminPhone: string;
  tenantSeatCount: number | null;
  tenantCode: string;
}

interface TenantCreateRecord extends TenantCreateFormState {
  createdAt: string;
  isCreated: boolean;
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

type AgentPlazaScope = "public" | "mine";
type AgentSelectMode = "single" | "group";

interface AgentPlazaItem extends FdeDeliveryAgentPackageItem {
  id: string;
  scope: AgentPlazaScope;
  sceneCategory: string;
  description: string;
}

type DeliveryViewMode = "list" | "detail";
type DeliveryDetailTabKey = "orderInfo" | FdeDeliveryStepKey;

const DELIVERY_STEP_GUIDES: Record<FdeDeliveryStepKey, DeliveryStepGuide> = {
  customerConfirm: {
    title: "租户创建",
    buttonLabel: "完成租户创建",
  },
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

const AGENT_PLAZA_ITEMS: AgentPlazaItem[] = [
  {
    id: "agent-public-01",
    name: "AI CEO 教练",
    releaseVersion: "v2.4.1",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "待企业配置权限范围。",
    scope: "public",
    sceneCategory: "经营管理",
    description: "适合老板经营复盘、管理动作生成和跨部门协同建议。",
  },
  {
    id: "agent-public-02",
    name: "招聘协同官",
    releaseVersion: "v1.9.0",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合 HR 与业务负责人协同使用。",
    scope: "public",
    sceneCategory: "组织协同",
    description: "适合招聘推进、面试反馈归纳和候选人协同。",
  },
  {
    id: "agent-public-03",
    name: "门店经营日报官",
    releaseVersion: "v1.8.3",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "建议绑定门店经营数据后开放给管理层。",
    scope: "public",
    sceneCategory: "经营管理",
    description: "适合门店营收汇总、日结日报和经营异常提醒。",
  },
  {
    id: "agent-public-04",
    name: "供应链异常雷达",
    releaseVersion: "v2.0.2",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "建议与库存、采购数据联动后使用。",
    scope: "public",
    sceneCategory: "供应链",
    description: "适合库存预警、交付延迟和补货建议。",
  },
  {
    id: "agent-public-05",
    name: "财务对账助手",
    releaseVersion: "v1.6.8",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "建议开放给财务负责人和门店会计使用。",
    scope: "public",
    sceneCategory: "经营管理",
    description: "适合账单核对、异常流水归因和门店财务周报整理。",
  },
  {
    id: "agent-public-06",
    name: "经营波动分析师",
    releaseVersion: "v1.4.5",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合经营负责人查看门店波动和原因归纳。",
    scope: "public",
    sceneCategory: "经营管理",
    description: "适合日销、毛利、退货和活动表现波动的结构化分析。",
  },
  {
    id: "agent-public-07",
    name: "面试复盘官",
    releaseVersion: "v1.3.9",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "建议面试官和 HRBP 协同使用。",
    scope: "public",
    sceneCategory: "组织协同",
    description: "适合沉淀面试纪要、总结面试结论和输出候选人评估摘要。",
  },
  {
    id: "agent-public-08",
    name: "绩效诊断官",
    releaseVersion: "v1.2.7",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "建议管理层和 HRBP 在绩效评审前使用。",
    scope: "public",
    sceneCategory: "组织协同",
    description: "适合绩效波动诊断、中层表现总结和人员风险预警。",
  },
  {
    id: "agent-public-09",
    name: "采购补货官",
    releaseVersion: "v1.7.1",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "建议采购与仓配团队配合使用。",
    scope: "public",
    sceneCategory: "供应链",
    description: "适合采购建议、补货节奏安排和缺货风险提前预警。",
  },
  {
    id: "agent-public-10",
    name: "履约监控官",
    releaseVersion: "v1.5.6",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合履约团队做时效巡检和异常分单。",
    scope: "public",
    sceneCategory: "供应链",
    description: "适合订单发货监控、履约延误识别和售后风险提醒。",
  },
  {
    id: "agent-public-11",
    name: "销售线索官",
    releaseVersion: "v1.6.2",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合销售负责人和业务拓展团队使用。",
    scope: "public",
    sceneCategory: "销售增长",
    description: "适合线索分级、客户跟进提醒和成交机会归纳。",
  },
  {
    id: "agent-public-12",
    name: "复购运营官",
    releaseVersion: "v1.3.4",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合会员运营和私域团队联动使用。",
    scope: "public",
    sceneCategory: "销售增长",
    description: "适合老客唤醒、复购活动建议和用户分层运营。",
  },
  {
    id: "agent-public-13",
    name: "客服质检官",
    releaseVersion: "v1.4.9",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合客服主管和售后团队质检使用。",
    scope: "public",
    sceneCategory: "客户服务",
    description: "适合客服会话质检、投诉归因和服务问题归纳。",
  },
  {
    id: "agent-public-14",
    name: "工单流转官",
    releaseVersion: "v1.2.6",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合售后和服务交付团队跟踪工单。",
    scope: "public",
    sceneCategory: "客户服务",
    description: "适合服务工单分派、流转提醒和超时节点追踪。",
  },
  {
    id: "agent-public-15",
    name: "库存盘点助手",
    releaseVersion: "v1.1.8",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合仓库主管和门店盘点负责人使用。",
    scope: "public",
    sceneCategory: "供应链",
    description: "适合盘点差异归纳、库存健康检查和异常门店提示。",
  },
  {
    id: "agent-public-16",
    name: "经营复盘助手",
    releaseVersion: "v1.9.4",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合老板和经营管理层做周期复盘。",
    scope: "public",
    sceneCategory: "经营管理",
    description: "适合周经营复盘、关键指标总结和经营动作建议。",
  },
  {
    id: "agent-public-17",
    name: "门店巡检助手",
    releaseVersion: "v1.3.2",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合区域督导和门店负责人配合使用。",
    scope: "public",
    sceneCategory: "经营管理",
    description: "适合巡店记录沉淀、问题归类和整改动作跟进。",
  },
  {
    id: "agent-public-18",
    name: "直播复盘官",
    releaseVersion: "v1.2.9",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合直播运营和品牌方复盘使用。",
    scope: "public",
    sceneCategory: "销售增长",
    description: "适合直播数据复盘、商品表现归因和下轮排期建议。",
  },
  {
    id: "agent-public-19",
    name: "售后满意度官",
    releaseVersion: "v1.1.7",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合客服主管和服务交付团队使用。",
    scope: "public",
    sceneCategory: "客户服务",
    description: "适合用户评价归纳、售后体验总结和高频问题沉淀。",
  },
  {
    id: "agent-public-20",
    name: "采购价格观察员",
    releaseVersion: "v1.0.8",
    sourceLabel: "公共广场",
    statusLabel: "待下发",
    permissionHint: "适合采购团队做价格波动追踪。",
    scope: "public",
    sceneCategory: "供应链",
    description: "适合供应商价格波动识别、比价提醒和进货窗口建议。",
  },
  {
    id: "agent-mine-01",
    name: "零售试点复盘师",
    releaseVersion: "v0.9.6",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "当前 FDE 自定义版本，仅对试点租户开放。",
    scope: "mine",
    sceneCategory: "客户专属",
    description: "适合首批零售试点客户做经营复盘和门店周报。",
  },
  {
    id: "agent-mine-02",
    name: "组织试点陪跑官",
    releaseVersion: "v0.8.4",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合组织管理试点客户做专项交付。",
    scope: "mine",
    sceneCategory: "交付专属",
    description: "适合组织管理、招聘协同和部门试点陪跑。",
  },
  {
    id: "agent-mine-03",
    name: "电商运营陪跑官",
    releaseVersion: "v0.7.9",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合电商商家试点租户做专项交付。",
    scope: "mine",
    sceneCategory: "试点扩展",
    description: "适合选品、投放、店铺经营试点的专项支持。",
  },
  {
    id: "agent-mine-04",
    name: "零售晨会陪跑官",
    releaseVersion: "v0.8.9",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合零售客户日会播报和店长跟进场景。",
    scope: "mine",
    sceneCategory: "客户专属",
    description: "适合串联晨会播报、昨日经营复盘和今日动作提醒。",
  },
  {
    id: "agent-mine-05",
    name: "招聘面板复盘官",
    releaseVersion: "v0.8.2",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合招聘专项交付，聚焦岗位漏斗复盘。",
    scope: "mine",
    sceneCategory: "交付专属",
    description: "适合招聘看板搭建、岗位漏斗分析和招聘周报整理。",
  },
  {
    id: "agent-mine-06",
    name: "店仓补货排班官",
    releaseVersion: "v0.7.4",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合零售和电商试点客户联动仓配与门店。",
    scope: "mine",
    sceneCategory: "试点扩展",
    description: "适合门店缺货补货、人员排班建议和高峰时段预排。",
  },
  {
    id: "agent-mine-07",
    name: "财务口径校对官",
    releaseVersion: "v0.6.8",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合财务试点客户做口径梳理和异常复核。",
    scope: "mine",
    sceneCategory: "客户专属",
    description: "适合财务对账口径校对、跨表差异说明和报表一致性复核。",
  },
  {
    id: "agent-mine-08",
    name: "门店巡店记录官",
    releaseVersion: "v0.7.2",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合零售客户巡店和现场问题记录。",
    scope: "mine",
    sceneCategory: "客户专属",
    description: "适合巡店纪要沉淀、现场问题汇总和整改动作同步。",
  },
  {
    id: "agent-mine-09",
    name: "交付验收陪跑官",
    releaseVersion: "v0.6.9",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合首期交付客户做验收陪跑和培训。",
    scope: "mine",
    sceneCategory: "交付专属",
    description: "适合交付验收、培训任务梳理和问题闭环记录。",
  },
  {
    id: "agent-mine-10",
    name: "客服回访陪跑官",
    releaseVersion: "v0.6.5",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合客户试点期做回访跟进和满意度追踪。",
    scope: "mine",
    sceneCategory: "交付专属",
    description: "适合回访记录、问题归档和试点反馈整理。",
  },
  {
    id: "agent-mine-11",
    name: "销售跟单陪跑官",
    releaseVersion: "v0.5.8",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合销售试点客户做跟单提醒和机会归纳。",
    scope: "mine",
    sceneCategory: "试点扩展",
    description: "适合跟单节奏提醒、客户阶段总结和成交机会提示。",
  },
  {
    id: "agent-mine-12",
    name: "服务质检试点官",
    releaseVersion: "v0.5.2",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合客服与服务质检试点客户专项交付。",
    scope: "mine",
    sceneCategory: "试点扩展",
    description: "适合会话质检、服务抽检和投诉问题专项分析。",
  },
  {
    id: "agent-mine-13",
    name: "零售督导陪跑官",
    releaseVersion: "v0.9.1",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合零售交付客户做督导巡店和整改跟进。",
    scope: "mine",
    sceneCategory: "交付专属",
    description: "适合首批门店试点客户做督导陪跑和现场问题跟踪。",
  },
  {
    id: "agent-mine-14",
    name: "客服升级试点官",
    releaseVersion: "v0.8.6",
    sourceLabel: "我的 Agent",
    statusLabel: "待下发",
    permissionHint: "适合服务质检客户做专项交付试点。",
    scope: "mine",
    sceneCategory: "试点扩展",
    description: "适合售后升级项目，辅助梳理工单问题和服务改进动作。",
  },
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
  scenarioName: "",
  orderAmount: "",
  launchTargetDate: "",
  industry: "",
  deliveryNote: "",
});

const createInitialExpertGroupForm = (): ExpertGroupFormState => ({
  name: "",
  description: "",
});

const getStepKeyLabel = (stepKey: FdeDeliveryStepKey): string =>
  FDE_DELIVERY_STEPS.find(item => item.key === stepKey)?.label ?? stepKey;

const getTenantStatusLabel = (stepKey: FdeDeliveryStepKey): string => {
  if (stepKey === "customerConfirm") {
    return "待创建租户";
  }

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
  if (stepKey === "customerConfirm") {
    return "待配置";
  }

  return "配置中";
};

const getStepStatusLabel = (
  order: FdeDeliveryOrderItem,
  stepKey: FdeDeliveryStepKey,
): "已完成" | "进行中" | "待处理" => {
  if (order.completedSteps.includes(stepKey)) {
    return "已完成";
  }

  if (order.currentStep === stepKey) {
    return "进行中";
  }

  return "待处理";
};

const getStepStatusClassName = (
  status: "已完成" | "进行中" | "待处理",
): string => {
  if (status === "已完成") {
    return styles.stepStatusDone;
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
  const isConfigured =
    order.currentStep !== "customerConfirm" ||
    order.completedSteps.includes("deviceConfig") ||
    order.deviceConfig.cloudDeviceCount > 0 ||
    order.deviceConfig.localDeviceCount > 0;

  return {
    cloudWorkbenchQuota: order.deviceConfig.cloudDeviceCount || 0,
    localWorkbenchQuota: order.deviceConfig.localDeviceCount || 0,
    localClientQuota: 0,
    effectiveAt: order.launchTargetDate || "",
    configuredAt: isConfigured ? order.createdAt : "",
    isConfigured,
  };
};

const buildDeviceFormState = (record: DeviceAllocationRecord): DeviceAllocationFormState => ({
  cloudWorkbenchQuota: record.cloudWorkbenchQuota,
  localWorkbenchQuota: record.localWorkbenchQuota,
  localClientQuota: record.localClientQuota,
  effectiveAt: record.effectiveAt,
});

const buildDefaultTenantRecord = (order: FdeDeliveryOrderItem): TenantCreateRecord => {
  const isCreated =
    order.tenantStatusLabel === "租户已创建" ||
    order.tenantStatusLabel === "初始化中" ||
    order.tenantStatusLabel === "Agent 已下发" ||
    order.tenantStatusLabel === "待交付验收" ||
    getFdeDeliveryStepIndex(order.currentStep) > 0;

  return {
    tenantName: `${order.customerName}租户`,
    adminName: "",
    adminPhone: "",
    tenantSeatCount: order.memberCount || null,
    tenantCode: "",
    createdAt: isCreated ? order.createdAt : "",
    isCreated,
  };
};

const buildTenantFormState = (record: TenantCreateRecord): TenantCreateFormState => ({
  tenantName: record.tenantName,
  adminName: record.adminName,
  adminPhone: record.adminPhone,
  tenantSeatCount: record.tenantSeatCount,
  tenantCode: record.tenantCode,
});

const buildManualOrder = (
  payload: CreateOrderFormState,
  currentMemberId: string,
): FdeDeliveryOrderItem => {
  const scenarioName = payload.scenarioName.trim();
  const createdAt = new Date().toLocaleString("zh-CN", { hour12: false });

  return {
    id: createOrderId(),
    leadId: "",
    customerName: payload.customerName.trim(),
    orderNo: createOrderNo(),
    assignedToId: currentMemberId,
    industry: payload.industry.trim() || "待确认",
    scenarioName,
    currentStep: "customerConfirm",
    stepProgress: 0,
    orderAmount: payload.orderAmount.trim(),
    tenantStatusLabel: "待创建租户",
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
    expertNames: [scenarioName],
    requiredInputs: DEFAULT_REQUIRED_INPUTS,
    handoffItems: DEFAULT_HANDOFF_ITEMS,
    agentGroups: [],
    agentPackages: [
      {
        name: scenarioName,
        releaseVersion: "v1.0.0",
        sourceLabel: "待下发",
        statusLabel: "待配置",
        permissionHint: "需在企业管理后台确认开放范围。",
      },
    ],
    adminTodo: DEFAULT_ADMIN_TODO,
    apiTargets: [],
    memberCount: 0,
    createdAt,
    launchTargetDate: payload.launchTargetDate.trim() || "待确认",
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

/**
 * 配置交付视图。
 */
export const FdeDeliveryWorkbench = ({
  items,
  members,
  currentMemberId,
  selectedOrderId,
  setSelectedOrderId,
}: FdeDeliveryWorkbenchProps): JSX.Element => {
  const [orders, setOrders] = useState<FdeDeliveryOrderItem[]>(items);
  const [viewMode, setViewMode] = useState<DeliveryViewMode>("list");
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState<boolean>(false);
  const [isTenantDrawerOpen, setIsTenantDrawerOpen] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [isExpertGroupModalOpen, setIsExpertGroupModalOpen] = useState<boolean>(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState<boolean>(false);
  const [tenantDrawerOrderId, setTenantDrawerOrderId] = useState<string>("");
  const [deviceModalOrderId, setDeviceModalOrderId] = useState<string>("");
  const [agentModalOrderId, setAgentModalOrderId] = useState<string>("");
  const [agentSelectMode, setAgentSelectMode] = useState<AgentSelectMode>("single");
  const [agentScope, setAgentScope] = useState<AgentPlazaScope>("public");
  const [agentSceneCategory, setAgentSceneCategory] = useState<string>("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [selectedDetailTab, setSelectedDetailTab] = useState<DeliveryDetailTabKey>("orderInfo");
  const [createOrderForm, setCreateOrderForm] = useState<CreateOrderFormState>(createInitialOrderForm());
  const [expertGroupForm, setExpertGroupForm] = useState<ExpertGroupFormState>(
    createInitialExpertGroupForm(),
  );
  const [tenantForm, setTenantForm] = useState<TenantCreateFormState>({
    tenantName: "",
    adminName: "",
    adminPhone: "",
    tenantSeatCount: null,
    tenantCode: "",
  });
  const [deviceForm, setDeviceForm] = useState<DeviceAllocationFormState>({
    cloudWorkbenchQuota: 0,
    localWorkbenchQuota: 0,
    localClientQuota: 0,
    effectiveAt: "",
  });
  const [tenantRecords, setTenantRecords] = useState<Record<string, TenantCreateRecord>>(() =>
    items.reduce<Record<string, TenantCreateRecord>>((accumulator, item) => {
      accumulator[item.id] = buildDefaultTenantRecord(item);
      return accumulator;
    }, {}),
  );
  const [deviceRecords, setDeviceRecords] = useState<Record<string, DeviceAllocationRecord>>(() =>
    items.reduce<Record<string, DeviceAllocationRecord>>((accumulator, item) => {
      accumulator[item.id] = buildDefaultDeviceRecord(item);
      return accumulator;
    }, {}),
  );

  useEffect(() => {
    setOrders(previous => {
      const manualOrders = previous.filter(
        previousItem => !items.some(item => item.id === previousItem.id),
      );
      return [...manualOrders, ...items];
    });
  }, [items]);

  useEffect(() => {
    setTenantRecords(previous => {
      const nextRecords = { ...previous };
      orders.forEach(order => {
        if (!nextRecords[order.id]) {
          nextRecords[order.id] = buildDefaultTenantRecord(order);
        }
      });
      return nextRecords;
    });
  }, [orders]);

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

  useEffect(() => {
    if (!orders.length) {
      return;
    }

    const hasSelectedOrder = orders.some(item => item.id === selectedOrderId);
    if (!hasSelectedOrder) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId, setSelectedOrderId]);

  const selectedOrder = useMemo(
    () => orders.find(item => item.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );
  const selectedTenantRecord = selectedOrder ? tenantRecords[selectedOrder.id] : null;
  const selectedDeviceRecord = selectedOrder ? deviceRecords[selectedOrder.id] : null;
  const agentSceneCategories = useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          AGENT_PLAZA_ITEMS.filter(item => item.scope === agentScope).map(item => item.sceneCategory),
        ),
      ),
    [agentScope],
  );
  const visibleAgentPlazaItems = useMemo<AgentPlazaItem[]>(
    () =>
      AGENT_PLAZA_ITEMS.filter(
        item =>
          item.scope === agentScope &&
          (!agentSceneCategory || item.sceneCategory === agentSceneCategory),
      ),
    [agentSceneCategory, agentScope],
  );

  useEffect(() => {
    if (viewMode === "detail" && !selectedOrder) {
      setViewMode("list");
    }
  }, [selectedOrder, viewMode]);

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }

    setSelectedDetailTab("orderInfo");
  }, [selectedOrder?.id]);

  useEffect(() => {
    if (!agentSceneCategories.length) {
      setAgentSceneCategory("");
      return;
    }

    if (!agentSceneCategories.includes(agentSceneCategory)) {
      setAgentSceneCategory(agentSceneCategories[0]);
    }
  }, [agentSceneCategories, agentSceneCategory]);

  const handleOpenAdmin = useCallback((): void => {
    window.open("/web/admin", "_blank", "noopener,noreferrer");
  }, []);

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

  const handleOpenTenantDrawer = useCallback((order: FdeDeliveryOrderItem): void => {
    const record = tenantRecords[order.id] ?? buildDefaultTenantRecord(order);
    setTenantDrawerOrderId(order.id);
    setTenantForm(buildTenantFormState(record));
    setIsTenantDrawerOpen(true);
  }, [tenantRecords]);

  const handleCloseTenantDrawer = useCallback((): void => {
    setIsTenantDrawerOpen(false);
    setTenantDrawerOrderId("");
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
      !createOrderForm.scenarioName.trim() ||
      !createOrderForm.orderAmount.trim()
    ) {
      message.warning("请先补齐客户名称、场景名称和订单金额。");
      return;
    }

    const nextOrder = buildManualOrder(createOrderForm, currentMemberId || members[0]?.id || "");

    setOrders(previous => [nextOrder, ...previous]);
    setSelectedOrderId(nextOrder.id);
    setViewMode("detail");
    setIsCreateDrawerOpen(false);
    message.success("订单已创建。");
  }, [createOrderForm, currentMemberId, members, setSelectedOrderId]);

  const handleTenantFieldChange = useCallback(
    <TKey extends keyof TenantCreateFormState>(key: TKey, value: TenantCreateFormState[TKey]): void => {
      setTenantForm(previous => ({
        ...previous,
        [key]: value,
      }));
    },
    [],
  );

  const handleDeviceFieldChange = useCallback(
    <TKey extends keyof DeviceAllocationFormState>(key: TKey, value: DeviceAllocationFormState[TKey]): void => {
      setDeviceForm(previous => ({
        ...previous,
        [key]: value,
      }));
    },
    [],
  );

  const handleCreateTenant = useCallback((): void => {
    if (!tenantDrawerOrderId) {
      return;
    }

    if (
      !tenantForm.tenantName.trim() ||
      !tenantForm.adminName.trim() ||
      !tenantForm.adminPhone.trim() ||
      tenantForm.tenantSeatCount === null
    ) {
      message.warning("请先补齐租户名称、管理员姓名、管理员手机号和租户席位。");
      return;
    }

    const createdAt = new Date().toLocaleString("zh-CN", { hour12: false });

    setTenantRecords(previous => ({
      ...previous,
      [tenantDrawerOrderId]: {
        ...tenantForm,
        createdAt,
        isCreated: true,
      },
    }));

    setOrders(previous =>
      previous.map(item =>
        item.id === tenantDrawerOrderId
          ? {
              ...item,
              tenantStatusLabel: "租户已创建",
              memberCount: tenantForm.tenantSeatCount ?? item.memberCount,
            }
          : item,
      ),
    );

    setIsTenantDrawerOpen(false);
    setTenantDrawerOrderId("");
    message.success("租户已创建。");
  }, [tenantDrawerOrderId, tenantForm]);

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

    setOrders(previous =>
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
  }, [deviceForm, deviceModalOrderId]);

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

  const handleAddAgentToOrder = useCallback((agent: AgentPlazaItem): void => {
    if (!agentModalOrderId) {
      return;
    }

    let hasDuplicate = false;

    setOrders(previous =>
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
  }, [agentModalOrderId]);

  const handleConfirmAgentGroup = useCallback((): void => {
    if (!agentModalOrderId) {
      return;
    }

    if (!selectedAgentIds.length) {
      message.warning("请先选择至少一个 AI 专家加入专家团。");
      return;
    }

    const selectedAgents = AGENT_PLAZA_ITEMS.filter(item => selectedAgentIds.includes(item.id));
    let duplicateCount = 0;

    setOrders(previous =>
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
  }, [agentModalOrderId, expertGroupForm.description, expertGroupForm.name, selectedAgentIds]);

  const handleDeliverAgentGroup = useCallback((orderId: string, groupId: string): void => {
    setOrders(previous =>
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
  }, []);

  const handleDeliverSingleAgent = useCallback((orderId: string, agentName: string): void => {
    setOrders(previous =>
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
  }, []);

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

  const handleAdvanceStep = useCallback((): void => {
    if (!selectedOrder) {
      return;
    }

    if (selectedOrder.currentStep === "customerConfirm" && !selectedTenantRecord?.isCreated) {
      message.warning("请先在第一步完成租户创建。");
      return;
    }

    if (selectedOrder.currentStep === "deviceConfig" && !selectedDeviceRecord?.isConfigured) {
      message.warning("请先在设备分配步骤配置设备额度。");
      return;
    }

    if (selectedOrder.currentStep === "agentConfig") {
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

    const nextStep = FDE_DELIVERY_STEPS[getFdeDeliveryStepIndex(selectedOrder.currentStep) + 1];

    setOrders(previous =>
      previous.map(item => {
        if (item.id !== selectedOrder.id) {
          return item;
        }

        const completedSteps = Array.from(new Set([...item.completedSteps, item.currentStep]));

        if (!nextStep) {
          return {
            ...item,
            completedSteps,
            currentStep: item.currentStep,
            stepProgress: 100,
            tenantStatusLabel: "已完成初始化",
            deliveryStatus: "已交付",
          };
        }

        return {
          ...item,
          completedSteps,
          currentStep: nextStep.key,
          stepProgress: Math.round((completedSteps.length / FDE_DELIVERY_STEPS.length) * 100),
          tenantStatusLabel: getTenantStatusLabel(nextStep.key),
          deliveryStatus: getDeliveryStatusLabel(nextStep.key),
        };
      }),
    );

    if (!nextStep) {
      message.success("已完成交付验收。");
      return;
    }

    message.success(`已进入 ${nextStep.label}。`);
  }, [selectedDeviceRecord?.isConfigured, selectedOrder, selectedTenantRecord?.isCreated]);

  const renderStepContent = useCallback(
    (order: FdeDeliveryOrderItem, stepKey: DeliveryDetailTabKey): JSX.Element => {
      if (stepKey === "orderInfo") {
        return (
          <section className={styles.section}>
            <div className={styles.sectionTitle}>订单信息</div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单编号</span>
                <span className={styles.infoValue}>{order.orderNo}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>客户名称</span>
                <span className={styles.infoValue}>{order.customerName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>场景名称</span>
                <span className={styles.infoValue}>{order.scenarioName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单状态</span>
                <span className={styles.infoValue}>{order.deliveryStatus}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>当前步骤</span>
                <span className={styles.infoValue}>
                  {DELIVERY_STEP_GUIDES[order.currentStep].title}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>当前负责人</span>
                <span className={styles.infoValue}>
                  {getFdeMemberName(members, order.assignedToId)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单金额</span>
                <span className={styles.infoValue}>{order.orderAmount}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>所属行业</span>
                <span className={styles.infoValue}>{order.industry}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>计划上线时间</span>
                <span className={styles.infoValue}>{order.launchTargetDate}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>创建时间</span>
                <span className={styles.infoValue}>{order.createdAt}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单备注</span>
                <span className={styles.infoValue}>{order.deliveryNote}</span>
              </div>
            </div>
          </section>
        );
      }

      if (stepKey === "customerConfirm") {
        const tenantRecord = tenantRecords[order.id] ?? buildDefaultTenantRecord(order);
        const isCurrentStep = order.currentStep === "customerConfirm";

        return (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>租户创建与初始化</div>
              <div className={styles.sectionActions}>
                <Button onClick={() => handleOpenTenantDrawer(order)}>
                  {tenantRecord.isCreated ? "编辑租户信息" : "创建租户"}
                </Button>
                {isCurrentStep ? (
                  <Button type="primary" onClick={handleAdvanceStep}>
                    {DELIVERY_STEP_GUIDES.customerConfirm.buttonLabel}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>租户状态</span>
                <span className={styles.infoValue}>
                  {tenantRecord.isCreated ? "租户已创建" : "待创建租户"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>租户名称</span>
                <span className={styles.infoValue}>{tenantRecord.tenantName || "待填写"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>企业管理员</span>
                <span className={styles.infoValue}>{tenantRecord.adminName || "待填写"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>管理员手机号</span>
                <span className={styles.infoValue}>{tenantRecord.adminPhone || "待填写"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>租户编码</span>
                <span className={styles.infoValue}>{tenantRecord.tenantCode || "未填写"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>租户席位</span>
                <span className={styles.infoValue}>
                  {tenantRecord.tenantSeatCount ?? "待填写"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>创建时间</span>
                <span className={styles.infoValue}>{tenantRecord.createdAt || "待创建"}</span>
              </div>
            </div>
            <div className={styles.subSection}>
              <div className={styles.subSectionTitle}>初始化输入</div>
              <div className={styles.lineList}>
                {(order.requiredInputs ?? []).map(item => (
                  <div key={item} className={styles.lineItem}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }

      if (stepKey === "deviceConfig") {
        const isCurrentStep = order.currentStep === "deviceConfig";
        const deviceRecord = deviceRecords[order.id] ?? buildDefaultDeviceRecord(order);

        return (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>设备分配</div>
              <div className={styles.sectionActions}>
                <Button onClick={() => handleOpenDeviceModal(order)}>配置设备额度</Button>
                {isCurrentStep ? (
                  <Button type="primary" onClick={handleAdvanceStep}>
                    {DELIVERY_STEP_GUIDES.deviceConfig.buttonLabel}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>分配状态</span>
                <span className={styles.infoValue}>
                  {deviceRecord.isConfigured ? "已配置设备额度" : "待配置设备额度"}
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
                {isCurrentStep ? (
                  <Button type="primary" onClick={handleAdvanceStep}>
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

        return (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>企业后台初始化</div>
              <div className={styles.sectionActions}>
                <Button onClick={handleOpenAdmin}>进入企业管理后台</Button>
                {isCurrentStep ? (
                  <Button type="primary" onClick={handleAdvanceStep}>
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
                <Button type="primary" onClick={handleAdvanceStep}>
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
      deviceRecords,
      handleAdvanceStep,
      handleOpenAdmin,
      handleOpenAgentModal,
      handleOpenDeviceModal,
      handleOpenExpertGroupModal,
      handleOpenTenantDrawer,
      members,
      tenantRecords,
    ],
  );

  if (!orders.length) {
    return (
      <div className={styles.layout}>
        <div className={styles.pageBar}>
          <h2 className={styles.pageTitle}>订单列表</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateDrawer}>
            创建订单
          </Button>
        </div>
        <Empty description="当前暂无配置交付订单" />
        <Modal
          title="创建订单"
          open={isCreateDrawerOpen}
          width={420}
          onCancel={handleCloseCreateDrawer}
          footer={null}
          destroyOnClose
        >
          <div className={styles.drawerForm}>
            <div className={styles.drawerField}>
              <div className={styles.drawerLabel}>客户名称</div>
              <Input
                value={createOrderForm.customerName}
                placeholder="请输入客户名称"
                onChange={event => handleCreateFieldChange("customerName", event.target.value)}
              />
            </div>
            <div className={styles.drawerField}>
              <div className={styles.drawerLabel}>场景名称</div>
              <Input
                value={createOrderForm.scenarioName}
                placeholder="请输入交付场景"
                onChange={event => handleCreateFieldChange("scenarioName", event.target.value)}
              />
            </div>
            <div className={styles.drawerField}>
              <div className={styles.drawerLabel}>订单金额</div>
              <Input
                value={createOrderForm.orderAmount}
                placeholder="请输入订单金额"
                onChange={event => handleCreateFieldChange("orderAmount", event.target.value)}
              />
            </div>
            <div className={styles.drawerField}>
              <div className={styles.drawerLabel}>计划上线时间</div>
              <Input
                value={createOrderForm.launchTargetDate}
                placeholder="例如 2026-04-20"
                onChange={event => handleCreateFieldChange("launchTargetDate", event.target.value)}
              />
            </div>
            <div className={styles.drawerField}>
              <div className={styles.drawerLabel}>所属行业</div>
              <Input
                value={createOrderForm.industry}
                placeholder="请输入行业"
                onChange={event => handleCreateFieldChange("industry", event.target.value)}
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
                创建订单
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className={styles.layout}>
        <div className={styles.pageBar}>
          <h2 className={styles.pageTitle}>订单列表</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateDrawer}>
            创建订单
          </Button>
        </div>

        <div className={styles.listTable}>
          <div className={styles.listHeader}>
            <span>客户名称</span>
            <span>场景名称</span>
            <span>状态</span>
            <span>计划上线时间</span>
            <span>当前步骤</span>
            <span>操作</span>
          </div>
          {orders.map(item => (
            <button
              key={item.id}
              type="button"
              className={styles.listRow}
              onClick={() => handleEnterDetail(item.id)}
            >
              <span className={styles.tableStrong}>{item.customerName}</span>
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
              <span className={styles.listAction}>查看详情</span>
            </button>
          ))}
        </div>

        <Modal
          title="创建订单"
          open={isCreateDrawerOpen}
          width={420}
          onCancel={handleCloseCreateDrawer}
          footer={null}
          destroyOnClose
        >
          <div className={styles.drawerForm}>
            <div className={styles.drawerField}>
              <div className={styles.drawerLabel}>客户名称</div>
              <Input
                value={createOrderForm.customerName}
                placeholder="请输入客户名称"
                onChange={event => handleCreateFieldChange("customerName", event.target.value)}
              />
            </div>
            <div className={styles.drawerField}>
              <div className={styles.drawerLabel}>场景名称</div>
              <Input
                value={createOrderForm.scenarioName}
                placeholder="请输入交付场景"
                onChange={event => handleCreateFieldChange("scenarioName", event.target.value)}
              />
            </div>
            <div className={styles.drawerField}>
              <div className={styles.drawerLabel}>订单金额</div>
              <Input
                value={createOrderForm.orderAmount}
                placeholder="请输入订单金额"
                onChange={event => handleCreateFieldChange("orderAmount", event.target.value)}
              />
            </div>
            <div className={styles.drawerField}>
              <div className={styles.drawerLabel}>计划上线时间</div>
              <Input
                value={createOrderForm.launchTargetDate}
                placeholder="例如 2026-04-20"
                onChange={event => handleCreateFieldChange("launchTargetDate", event.target.value)}
              />
            </div>
            <div className={styles.drawerField}>
              <div className={styles.drawerLabel}>所属行业</div>
              <Input
                value={createOrderForm.industry}
                placeholder="请输入行业"
                onChange={event => handleCreateFieldChange("industry", event.target.value)}
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
                创建订单
              </Button>
            </div>
          </div>
        </Modal>
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
                返回订单列表
              </Button>
              <h2 className={styles.pageTitle}>{selectedOrder.customerName}</h2>
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
            {FDE_DELIVERY_STEPS.map(step => {
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

          {renderStepContent(selectedOrder, selectedDetailTab)}
        </div>
      ) : (
        <Empty description="请选择订单" />
      )}
      <Modal
        title="创建租户"
        open={isTenantDrawerOpen}
        width={420}
        onCancel={handleCloseTenantDrawer}
        footer={null}
        destroyOnClose
      >
        <div className={styles.drawerForm}>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>租户名称</div>
            <Input
              value={tenantForm.tenantName}
              placeholder="请输入租户名称"
              onChange={event => handleTenantFieldChange("tenantName", event.target.value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>租户编码</div>
            <Input
              value={tenantForm.tenantCode}
              placeholder="请输入租户编码（可选）"
              onChange={event => handleTenantFieldChange("tenantCode", event.target.value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>企业管理员姓名</div>
            <Input
              value={tenantForm.adminName}
              placeholder="请输入管理员姓名"
              onChange={event => handleTenantFieldChange("adminName", event.target.value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>管理员手机号</div>
            <Input
              value={tenantForm.adminPhone}
              placeholder="请输入管理员手机号"
              onChange={event => handleTenantFieldChange("adminPhone", event.target.value)}
            />
          </div>
          <div className={styles.drawerField}>
            <div className={styles.drawerLabel}>租户席位</div>
            <InputNumber
              className={styles.fullWidthNumberInput}
              value={tenantForm.tenantSeatCount}
              min={0}
              placeholder="请输入租户席位数量"
              onChange={value => handleTenantFieldChange("tenantSeatCount", value)}
            />
          </div>
          <div className={styles.drawerActions}>
            <Button onClick={handleCloseTenantDrawer}>取消</Button>
            <Button type="primary" onClick={handleCreateTenant}>
              创建租户
            </Button>
          </div>
        </div>
      </Modal>
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
