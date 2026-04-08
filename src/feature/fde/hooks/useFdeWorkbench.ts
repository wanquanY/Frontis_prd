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
  FdeCreateOrderPayload,
  FdeCreateOrderResult,
  FdeCreateDeliveryChangePayload,
  FdeDeliveryOrderItem,
  FdeOrderAgentLineItem,
  FdeOrderDeviceLineItem,
  FdeOrderFulfillmentItem,
  FdeOrderItem,
  FdeOrderLineItem,
  FdeOperationsCustomerItem,
  FdeRenewAssetPayload,
  FdeVersionManagementTaskItem,
  FdeWorkbenchTabKey,
  UseFdeWorkbenchResult,
} from "@/feature/fde/types";
import {
  FDE_DEVELOPMENT_VISIBLE_KEYS,
  buildOrderStatus,
  buildChangeRecordFromOrder,
  buildCustomerAssetSnapshot,
  buildId,
  createOrderNo,
  getLineItemValidityMonths,
  hydrateExistingAssets,
  isAgentLineItem,
  isDeviceLineItem,
  resolveDeviceLineTypeFromAsset,
  syncOrdersWithDeliveryState,
  updateQuotaItems,
} from "./fdeWorkbenchStateUtils";
import { useFdeOpportunityState } from "./useFdeOpportunityState";
import { useFdeTeamMembersState } from "./useFdeTeamMembersState";

const INITIAL_FDE_SYNCED_STATE = syncOrdersWithDeliveryState(
  FDE_ORDER_ITEMS,
  FDE_DELIVERY_ORDERS,
  hydrateExistingAssets(FDE_OPERATIONS_CUSTOMERS, FDE_DELIVERY_ORDERS),
  FDE_TEAM_MEMBERS,
  FDE_TEAM_MEMBERS[0]?.name ?? "FDE",
);

const createDeliveryOrderNo = (): string => `FDE-DEL-${Date.now()}`;

const getDeviceUnitLabel = (deviceType: FdeOrderDeviceLineItem["deviceType"]): string =>
  deviceType === "本地客户端授权" ? "个" : "台";

/**
 * 根据订单商品预填一笔独立交付单，步骤完成状态仍需人工推进。
 */
const buildOrderLinkedDeliveryRecord = (payload: {
  assignedToId: string;
  createdAt: string;
  lineItems: FdeOrderLineItem[];
  linkedTenant: FdeDeliveryOrderItem;
  orderId: string;
  relatedCustomerId: string;
  remark: string;
  requestedByName: string;
  totalAmount: number;
}): FdeDeliveryOrderItem | null => {
  const deviceLineItems = payload.lineItems.filter(isDeviceLineItem);
  const agentLineItems = payload.lineItems.filter(isAgentLineItem);
  const isRenewalOrder = [...deviceLineItems, ...agentLineItems].some(item =>
    Boolean(item.renewalTargetAssetId),
  );

  if (!deviceLineItems.length && !agentLineItems.length) {
    return null;
  }

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
  const hasDevice = deviceLineItems.length > 0;
  const hasAgent = agentLineItems.length > 0;
  const changeType = isRenewalOrder
    ? "资产续费"
    : hasDevice
      ? hasAgent
        ? "追加设备与Agent"
        : "追加设备"
      : "追加Agent";

  return {
    id: buildId("delivery-order"),
    tenantId: payload.linkedTenant.id,
    leadId: "",
    customerName: payload.linkedTenant.customerName,
    orderNo: createDeliveryOrderNo(),
    assignedToId: payload.assignedToId,
    orderKind: "change",
    relatedCustomerId: payload.relatedCustomerId,
    changeType,
    changeReason: isRenewalOrder ? "续费订单创建后待执行交付" : "订单创建后待执行交付",
    requestedByName: payload.requestedByName,
    industry: payload.linkedTenant.industry,
    scenarioName: isRenewalOrder
      ? hasDevice
        ? "订单设备续费交付"
        : expertNames.join("、") || "订单AI专家续费交付"
      : hasDevice
        ? hasAgent
          ? "订单设备与AI专家交付"
          : "订单设备交付"
        : expertNames.join("、") || "订单AI专家交付",
    currentStep: hasDevice ? "deviceConfig" : "agentConfig",
    stepProgress: 0,
    orderAmount: payload.totalAmount
      ? `¥ ${payload.totalAmount.toLocaleString("zh-CN")}`
      : "待确认",
    tenantName: payload.linkedTenant.tenantName,
    tenantCode: payload.linkedTenant.tenantCode,
    adminName: payload.linkedTenant.adminName,
    adminPhone: payload.linkedTenant.adminPhone,
    attachments: [],
    linkedOrderIds: [payload.orderId],
    skippedSteps: [],
    sourceLabel: isRenewalOrder ? "订单预填续费交付" : "订单预填交付",
    tenantStatusLabel: isRenewalOrder ? "待执行资产续费" : "待按订单执行交付",
    deliveryBoundary: isRenewalOrder
      ? "续费订单仅用于预填续费资产，步骤完成状态需要人工手动更新。"
      : "订单商品仅用于预填设备和 AI 专家，步骤完成状态需要人工手动更新。",
    deliveryNote:
      payload.remark.trim() ||
      (isRenewalOrder
        ? "续费订单已创建，请确认续费资产与生效时间后手动完成交付。"
        : "订单已创建，设备与 AI 专家已按订单内容预填到交付步骤。"),
    deviceConfig: {
      mode:
        cloudDeviceCount && (localDeviceCount || localClientCount)
          ? "混合部署"
          : localDeviceCount || localClientCount
            ? "本地设备"
            : "云端设备",
      cloudDeviceCount,
      localDeviceCount,
      cloudNodeName: cloudDeviceCount ? "待分配云端工作站" : "",
      localDeviceName: localDeviceCount ? "待分配本地工作站" : "",
      pairingCode: "",
      osOwner: payload.linkedTenant.deviceConfig.osOwner,
      region: payload.linkedTenant.deviceConfig.region,
    },
    expertNames,
    requiredInputs: isRenewalOrder
      ? ["确认续费资产范围", "确认交付生效时间", "确认续费说明"]
      : ["确认订单范围", "确认设备归属与授权对象", "确认交付生效时间"],
    handoffItems: isRenewalOrder
      ? ["续费资产已完成交付", "新的有效期已确认", "客户已收到续费说明"]
      : ["订单资源已完成交付", "设备与授权对象已确认", "客户已收到交付说明"],
    agentGroups: [],
    agentPackages: Array.from(
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
    ),
    adminTodo: isRenewalOrder
      ? ["确认续费资产与生效时间", "手动推进续费交付步骤", "同步客户续费说明"]
      : ["按订单确认设备归属", "按订单下发 AI 专家", "同步客户交付说明"],
    apiTargets: [],
    memberCount: payload.linkedTenant.memberCount,
    createdAt: payload.createdAt,
    launchTargetDate: payload.linkedTenant.launchTargetDate,
    preflightChecks: isRenewalOrder
      ? ["续费资产已确认", "新的有效期已确认", "续费说明已同步"]
      : ["订单资源已全部分配", "设备和 AI 专家已完成下发", "交付说明已同步"],
    completedSteps: [],
    deliveryStatus: "待配置",
    changeDetailItems: [
      ...deviceLineItems.map(item => ({
        id: `${payload.orderId}-${item.id}`,
        label: isRenewalOrder ? "续费设备" : item.deviceType,
        afterValue: isRenewalOrder
          ? `${item.deviceType} · ${getLineItemValidityMonths(item)} 个月`
          : `${item.quantity} ${getDeviceUnitLabel(item.deviceType)}`,
      })),
      ...agentLineItems.map(item => ({
        id: `${payload.orderId}-${item.id}`,
        label: isRenewalOrder ? "续费 Agent" : "新增 Agent",
        afterValue: isRenewalOrder
          ? `${item.agentName} · ${getLineItemValidityMonths(item)} 个月`
          : item.agentName,
      })),
    ],
    quotaAdjustments: isRenewalOrder
      ? []
      : [
          { label: "云端设备额度", delta: cloudDeviceCount, unit: "台" },
          { label: "本地设备额度", delta: localDeviceCount, unit: "台" },
          { label: "本地客户端授权", delta: localClientCount, unit: "个" },
        ].filter(item => item.delta > 0),
    deviceAdditions: isRenewalOrder
      ? []
      : deviceLineItems.flatMap(item =>
          Array.from({ length: item.quantity }).map((_, index) => ({
            id: `${payload.orderId}-${item.id}-${index + 1}`,
            name: `${item.deviceType} ${index + 1}`,
            type: item.deviceType === "云端工作站" ? "cloud" : "local",
            status: "online" as const,
            uptime: "0 小时",
            categoryLabel: item.deviceType,
            ownerLabel: "订单预填",
            assignedEmployeeName: "待客户分配",
            locationLabel: payload.linkedTenant.deviceConfig.region || "待确认",
          })),
        ),
    agentAdditions: isRenewalOrder
      ? []
      : Array.from(
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
  };
};

/**
 * FDE 工作台本地状态与交互逻辑。
 */
export const useFdeWorkbench = (currentUserId?: string): UseFdeWorkbenchResult => {
  const [activeTab, setActiveTab] = useState<FdeWorkbenchTabKey>(
    currentUserId === FDE_PRIMARY_LEADER_MEMBER_ID ? "dashboard" : "delivery",
  );
  const previousUserIdRef = useRef<string | undefined>(currentUserId);
  const [orders, setOrders] = useState<FdeOrderItem[]>(INITIAL_FDE_SYNCED_STATE.orders);
  const [deliveryOrders, setDeliveryOrders] = useState<FdeDeliveryOrderItem[]>(FDE_DELIVERY_ORDERS);
  const [operationsCustomers, setOperationsCustomers] = useState<FdeOperationsCustomerItem[]>(
    INITIAL_FDE_SYNCED_STATE.customers,
  );
  const [versionTasks] = useState<FdeVersionManagementTaskItem[]>(FDE_VERSION_MANAGEMENT_TASKS);
  const [selectedOrderManagementId, setSelectedOrderManagementId] = useState<string>(
    INITIAL_FDE_SYNCED_STATE.orders[0]?.id ?? "",
  );
  const [selectedDeliveryOrderId, setSelectedDeliveryOrderId] = useState<string>(
    FDE_DELIVERY_ORDERS.find(item => item.orderKind === "initial")?.id ??
      FDE_DELIVERY_ORDERS[0]?.id ??
      "",
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
  const {
    teamMembers,
    activeMember,
    activeRole,
    canManageMembers,
    addTeamMember,
    importTeamMembers,
    updateTeamMember,
    toggleTeamMemberStatus,
    removeTeamMember,
  } = useFdeTeamMembersState({
    currentUserId,
    initialTeamMembers: FDE_TEAM_MEMBERS,
  });

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    deliveryOrdersRef.current = deliveryOrders;
  }, [deliveryOrders]);

  useEffect(() => {
    operationsCustomersRef.current = operationsCustomers;
  }, [operationsCustomers]);

  const shouldShowLeaderDashboard = activeRole === "leader";
  const {
    opportunities,
    filteredOpportunities,
    selectedOpportunityId,
    setSelectedOpportunityId,
    assignOpportunity,
    createOpportunity,
    updateOpportunityStatus,
    addOpportunityComment,
  } = useFdeOpportunityState({
    activeMemberId: activeMember.id,
    activeMemberName: activeMember.name,
    activeRole,
    initialOpportunities: FDE_OPPORTUNITIES,
  });
  const tabs = useMemo(() => {
    if (canManageMembers) {
      return shouldShowLeaderDashboard
        ? FDE_WORKBENCH_TABS
        : FDE_WORKBENCH_TABS.filter(item => item.key !== "dashboard");
    }

    const visibleKeys = new Set<string>([
      ...activeMember.permissionKeys,
      ...FDE_DEVELOPMENT_VISIBLE_KEYS,
    ]);
    return FDE_WORKBENCH_TABS.filter(item => visibleKeys.has(item.key));
  }, [activeMember.permissionKeys, canManageMembers, shouldShowLeaderDashboard]);
  const navGroups = useMemo(() => {
    if (canManageMembers) {
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
  }, [activeMember.permissionKeys, canManageMembers, shouldShowLeaderDashboard]);

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
      if (canManageMembers) {
        return items;
      }

      return items.filter(item => item.assignedToId === activeMember.id);
    },
    [activeMember.id, canManageMembers],
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

  const syncDeliveryOrders = useCallback(
    (updatedOrders: FdeDeliveryOrderItem[]): void => {
      const previousOrders = deliveryOrdersRef.current;
      const completedAt = new Date().toLocaleString("zh-CN", { hour12: false });
      const updatedOrderIds = new Set(updatedOrders.map(item => item.id));
      const nextDeliveryOrders = [
        ...updatedOrders.map(item => {
          const previousOrder = previousOrders.find(previous => previous.id === item.id);
          const hasJustCompleted =
            previousOrder?.deliveryStatus !== "已交付" && item.deliveryStatus === "已交付";

          if (hasJustCompleted) {
            return {
              ...item,
              deliveredAt: completedAt,
            };
          }

          if (item.deliveryStatus === "已交付" && !item.deliveredAt) {
            return {
              ...item,
              deliveredAt: previousOrder?.deliveredAt ?? completedAt,
            };
          }

          return item;
        }),
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
            const nextDeviceCount =
              currentCustomer.devices.length + (order.deviceAdditions?.length ?? 0);
            const nextAgentCount =
              currentCustomer.agents.length + (order.agentAdditions?.length ?? 0);

            updatedCustomer = {
              ...currentCustomer,
              assetQuotas: nextAssetQuotas,
              activeExperts: nextAgentCount,
              onlineExperts: nextAgentCount,
              deviceSummary: `${nextDeviceCount} 台设备运行中`,
              assetValueSummary: `累计下发 ${nextAgentCount} 个 Agent / 已完成 ${completedChangeCount + 1} 次变更`,
            };
          }

          const beforeSnapshot =
            previousOrder?.deliveryStatus === "已交付"
              ? (existingRecord?.beforeSnapshot ?? buildCustomerAssetSnapshot(currentCustomer))
              : buildCustomerAssetSnapshot(currentCustomer);
          const afterSnapshot = hasJustCompleted
            ? buildCustomerAssetSnapshot(updatedCustomer)
            : (existingRecord?.afterSnapshot ?? []);
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
    },
    [activeMember.name, teamMembers],
  );

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
              linkedOrderIds: payload.linkedOrderId ? [payload.linkedOrderId] : [],
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
              linkedOrderIds: payload.linkedOrderId ? [payload.linkedOrderId] : [],
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
              preflightChecks: [
                "新增 Agent 已下发",
                "授权范围已确认",
                "变更说明已同步至企业管理员",
              ],
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
                  afterValue: payload.targetMembers.length
                    ? payload.targetMembers.join("、")
                    : "待确认",
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
                  permissionScope: payload.targetMembers.length
                    ? payload.targetMembers.join("、")
                    : "待确认",
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
      const nextLineItems: FdeOrderLineItem[] = payload.lineItems.map(item => {
        if (isDeviceLineItem(item)) {
          return {
            ...item,
            validityMonths: getLineItemValidityMonths(item),
            totalAmount: item.quantity * item.unitPrice,
          };
        }

        if (isAgentLineItem(item)) {
          return {
            ...item,
            quantity: 1,
            validityMonths: getLineItemValidityMonths(item),
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
        businessType: "新购",
        tenantId: payload.tenantId,
        status: "待履约",
        totalAmount,
        remark: payload.remark.trim(),
        lineItems: nextLineItems,
        fulfillmentItems: [],
        createdAt,
      };
      const tenantOrder = deliveryOrdersRef.current.find(
        item => item.id === payload.tenantId && item.orderKind === "initial",
      );

      if (!tenantOrder) {
        return {
          orderId: "",
          shouldPromptCreateTenant: false,
        };
      }

      let nextDeliveryOrders = deliveryOrdersRef.current;
      let nextOperationsCustomers = operationsCustomersRef.current;
      const fulfillmentItems: FdeOrderFulfillmentItem[] = [];
      const linkedTenant = tenantOrder;
      const linkedCustomerId =
        operationsCustomersRef.current.find(item => item.customerName === linkedTenant.customerName)
          ?.id ??
        linkedTenant.relatedCustomerId ??
        "";
      const linkedDeliveryOrder = buildOrderLinkedDeliveryRecord({
        assignedToId: linkedTenant.assignedToId || activeMember.id,
        createdAt,
        lineItems: nextLineItems,
        linkedTenant,
        orderId: nextOrderId,
        relatedCustomerId: linkedCustomerId,
        remark: payload.remark,
        requestedByName: activeMember.name,
        totalAmount,
      });

      if (linkedDeliveryOrder) {
        nextDeliveryOrders = [linkedDeliveryOrder, ...deliveryOrdersRef.current];
        if (linkedCustomerId) {
          nextOperationsCustomers = operationsCustomersRef.current.map(customer => {
            if (customer.id !== linkedCustomerId) {
              return customer;
            }

            const snapshot = buildCustomerAssetSnapshot(customer);
            const nextRecord = buildChangeRecordFromOrder(linkedDeliveryOrder, snapshot, []);

            return {
              ...customer,
              changeRecords: [nextRecord, ...customer.changeRecords],
            };
          });
        }
      }

      const nextOrder: FdeOrderItem = {
        ...initialOrder,
        customerName: linkedTenant.customerName,
        tenantId: linkedTenant.id,
        tenantName: linkedTenant.tenantName,
        tenantCode: linkedTenant.tenantCode,
        fulfillmentItems,
        status: buildOrderStatus(fulfillmentItems),
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
      setSelectedDeliveryOrderId(nextOrderId);

      return {
        orderId: nextOrderId,
        shouldPromptCreateTenant: false,
      };
    },
    [activeMember.id, activeMember.name, teamMembers],
  );

  const renewAsset = useCallback(
    (payload: FdeRenewAssetPayload): FdeCreateOrderResult => {
      const createdAt = new Date().toLocaleString("zh-CN", { hour12: false });
      const nextOrderId = buildId("order");
      const linkedCustomer = operationsCustomersRef.current.find(
        item => item.id === payload.customerId,
      );

      if (!linkedCustomer) {
        return {
          orderId: "",
          shouldPromptCreateTenant: false,
        };
      }

      let nextLineItem: FdeOrderDeviceLineItem | FdeOrderAgentLineItem | null = null;
      let renewalTenantId = linkedCustomer.tenantId ?? "";
      const nextOperationsCustomers = operationsCustomersRef.current.map(customer => {
        if (customer.id !== payload.customerId) {
          return customer;
        }

        if (payload.assetType === "device") {
          const targetDevice = customer.devices.find(
            item => item.assetId === payload.assetId || item.id === payload.assetId,
          );

          if (!targetDevice) {
            return customer;
          }

          if (!renewalTenantId && targetDevice.sourceOrderId) {
            renewalTenantId =
              ordersRef.current.find(order => order.id === targetDevice.sourceOrderId)?.tenantId ??
              "";
          }

          nextLineItem = {
            id: buildId("order-device"),
            kind: "device",
            deviceType: resolveDeviceLineTypeFromAsset(targetDevice),
            quantity: 1,
            validityMonths: payload.validityMonths,
            renewalTargetAssetId: targetDevice.assetId ?? targetDevice.id,
            unitPrice: payload.totalAmount,
            totalAmount: payload.totalAmount,
          };

          return customer;
        }

        const targetAgent = customer.agents.find(
          item => item.assetId === payload.assetId || item.name === payload.assetId,
        );

        if (!targetAgent) {
          return customer;
        }

        if (!renewalTenantId && targetAgent.sourceOrderId) {
          renewalTenantId =
            ordersRef.current.find(order => order.id === targetAgent.sourceOrderId)?.tenantId ?? "";
        }

        nextLineItem = {
          id: buildId("order-agent"),
          kind: "agent",
          agentCatalogId: targetAgent.assetId ?? payload.assetId,
          agentName: targetAgent.name,
          releaseVersion: targetAgent.currentVersion ?? targetAgent.latestVersion ?? "v1.0.0",
          sourceLabel: targetAgent.deliverySourceLabel ?? "资产续费",
          quantity: 1,
          validityMonths: payload.validityMonths,
          renewalTargetAssetId: targetAgent.assetId ?? targetAgent.name,
          unitPrice: payload.totalAmount,
          totalAmount: payload.totalAmount,
        };

        return customer;
      });

      const linkedTenant =
        (renewalTenantId
          ? deliveryOrdersRef.current.find(
              item => item.orderKind === "initial" && item.id === renewalTenantId,
            )
          : undefined) ??
        deliveryOrdersRef.current.find(
          item => item.orderKind === "initial" && item.customerName === linkedCustomer.customerName,
        );

      if (!nextLineItem || !linkedTenant) {
        return {
          orderId: "",
          shouldPromptCreateTenant: false,
        };
      }

      const linkedDeliveryOrder = buildOrderLinkedDeliveryRecord({
        assignedToId: linkedTenant.assignedToId || activeMember.id,
        createdAt,
        lineItems: [nextLineItem],
        linkedTenant,
        orderId: nextOrderId,
        relatedCustomerId: linkedCustomer.id,
        remark: payload.remark,
        requestedByName: activeMember.name,
        totalAmount: payload.totalAmount,
      });
      const nextDeliveryOrders = linkedDeliveryOrder
        ? [linkedDeliveryOrder, ...deliveryOrdersRef.current]
        : deliveryOrdersRef.current;
      const nextOperationsCustomersWithChanges = linkedDeliveryOrder
        ? nextOperationsCustomers.map(customer => {
            if (customer.id !== payload.customerId) {
              return customer;
            }

            const snapshot = buildCustomerAssetSnapshot(customer);
            const nextRecord = buildChangeRecordFromOrder(linkedDeliveryOrder, snapshot, []);

            return {
              ...customer,
              changeRecords: [nextRecord, ...customer.changeRecords],
            };
          })
        : nextOperationsCustomers;
      const nextOrder: FdeOrderItem = {
        id: nextOrderId,
        orderNo: createOrderNo(),
        customerName: linkedTenant.customerName,
        assignedToId: activeMember.id,
        businessType: "续费",
        tenantId: linkedTenant.id,
        tenantName: linkedTenant.tenantName,
        tenantCode: linkedTenant.tenantCode,
        status: "待履约",
        totalAmount: payload.totalAmount,
        remark: payload.remark.trim(),
        lineItems: [nextLineItem],
        fulfillmentItems: [],
        createdAt,
      };
      const syncedOrderState = syncOrdersWithDeliveryState(
        [nextOrder, ...ordersRef.current],
        nextDeliveryOrders,
        nextOperationsCustomersWithChanges,
        teamMembers,
        activeMember.name,
      );

      deliveryOrdersRef.current = nextDeliveryOrders;
      ordersRef.current = syncedOrderState.orders;
      operationsCustomersRef.current = syncedOrderState.customers;
      setDeliveryOrders(nextDeliveryOrders);
      setOrders(syncedOrderState.orders);
      setOperationsCustomers(syncedOrderState.customers);
      setSelectedOrderManagementId(nextOrderId);
      setSelectedDeliveryOrderId(nextOrderId);

      return {
        orderId: nextOrderId,
        shouldPromptCreateTenant: false,
      };
    },
    [activeMember.id, activeMember.name, teamMembers],
  );

  return {
    activeMember,
    activeRole,
    activeTab,
    canManageMembers,
    orders,
    deliveryOrders,
    versionTasks,
    filteredOpportunities,
    filteredOrders,
    filteredDeliveryOrders,
    filteredOperationsCustomers,
    filteredVersionTasks,
    opportunities,
    operationsCustomers,
    selectedOpportunityId,
    selectedOrderManagementId,
    selectedDeliveryOrderId,
    selectedOperationsCustomerId,
    selectedVersionTaskId,
    setActiveTab,
    createOrder,
    assignOpportunity,
    createOpportunity,
    updateOpportunityStatus,
    addOpportunityComment,
    renewAsset,
    syncDeliveryOrders,
    createDeliveryChangeOrder,
    setSelectedOpportunityId,
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
