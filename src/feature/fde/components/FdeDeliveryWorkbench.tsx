import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Empty, message } from "antd";

import { FDE_AGENT_CATALOG_ITEMS } from "@/feature/fde/agentCatalog";
import type {
  FdeAgentCatalogItem,
  FdeCreateOrderPayload,
  FdeCreateOrderResult,
  FdeDeliveryAgentGroupItem,
  FdeDeliveryAgentPackageItem,
  FdeDeliveryOrderItem,
  FdeDeliveryStepKey,
  FdeOrderAgentLineItem,
  FdeOrderDeviceLineItem,
  FdeOrderDeviceType,
  FdeOrderItem,
  FdeOrderTokensLineItem,
  FdeTeamMemberItem,
} from "@/feature/fde/types";

import { FdeDeliveryAgentModal } from "./FdeDeliveryAgentModal";
import { FdeDeliveryCreateBusinessOrderModal } from "./FdeDeliveryCreateBusinessOrderModal";
import { FdeDeliveryCreateTenantModal } from "./FdeDeliveryCreateTenantModal";
import { FdeDeliveryDeviceModal } from "./FdeDeliveryDeviceModal";
import { FdeDeliveryExpertGroupModal } from "./FdeDeliveryExpertGroupModal";
import { FdeDeliveryOrderInfoPanel } from "./FdeDeliveryOrderInfoPanel";
import { FdeDeliveryOrderPreviewModal } from "./FdeDeliveryOrderPreviewModal";
import { FdeDeliveryStepPanel } from "./FdeDeliveryStepPanel";
import { FdeDeliveryWorkbenchDetailView } from "./FdeDeliveryWorkbenchDetailView";
import { FdeDeliveryWorkbenchListView } from "./FdeDeliveryWorkbenchListView";
import {
  type AgentPlazaScope,
  type AgentSelectMode,
  type CreateBusinessOrderFormState,
  type CreateOrderFormState,
  type DeliveryDetailTabKey,
  type DeliveryOrdersUpdater,
  type DeliveryStatusFilter,
  type DeliveryViewMode,
  type DeviceAllocationFormState,
  type DeviceAllocationRecord,
  type ExpertGroupFormState,
  buildDefaultDeviceRecord,
  buildDeviceFormState,
  createGroupId,
  createInitialBusinessOrderForm,
  createInitialExpertGroupForm,
  createInitialOrderForm,
  getDeliveryStatusLabel,
  getLinkedDeliveryOrder,
  getOrderAssignedAgentNames,
  getStepKeyLabel,
  getTenantStatusLabel,
  getVisibleDeliverySteps,
  hasPendingDevicePrefill,
  isAgentOrderLineItem,
  isDeliveryItemDelivered,
  isDeviceOrderLineItem,
  isTokensOrderLineItem,
} from "./fdeDeliveryWorkbenchUtils";

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

const createOrderNo = (): string => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = now.getTime().toString().slice(-3);
  return `FDE-${date}-${suffix}`;
};

const buildManualOrder = (
  payload: CreateOrderFormState,
  currentMemberId: string,
): FdeDeliveryOrderItem => {
  const customerName = payload.customerName.trim();
  const scenarioName = "待配置交付场景";
  const createdAt = new Date().toLocaleString("zh-CN", { hour12: false });
  const tenantSeatCount = payload.tenantSeatCount ?? 0;
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
    orderAmount: "待确认",
    tenantName: customerName,
    tenantCode: payload.tenantCode.trim(),
    adminName: "",
    adminPhone: "",
    attachments: [],
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
    expertNames: [],
    requiredInputs: DEFAULT_REQUIRED_INPUTS,
    handoffItems: DEFAULT_HANDOFF_ITEMS,
    agentGroups: [],
    agentPackages: [],
    adminTodo: DEFAULT_ADMIN_TODO,
    apiTargets: [],
    memberCount: tenantSeatCount,
    createdAt,
    launchTargetDate: payload.launchTargetDate?.format("YYYY-MM-DD HH:mm") || "待确认",
    deliveryNote: payload.deliveryNote.trim() || "租户已创建，请先在租户下新建订单后再开始交付。",
    preflightChecks: DEFAULT_PREFLIGHT_CHECKS,
    completedSteps: [],
    deliveryStatus: "待配置",
  };
};

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

const appendUniqueStepKeys = (
  currentStepKeys: FdeDeliveryStepKey[] | undefined,
  nextStepKey: FdeDeliveryStepKey,
): FdeDeliveryStepKey[] => Array.from(new Set([...(currentStepKeys ?? []), nextStepKey]));

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
            orders.filter(
              item =>
                item.orderKind === "change" && item.tenantId === selectedTenantOrder.tenantId,
            ),
          )
        : [],
    [orders, selectedTenantOrder],
  );
  const tenantBusinessOrders = useMemo<FdeOrderItem[]>(
    () =>
      selectedTenantOrder
        ? orderItems.filter(item => item.tenantId === selectedTenantOrder.id)
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
  const selectedDeliveryOrder = useMemo<FdeDeliveryOrderItem | null>(
    () => (activeBusinessOrder ? getLinkedDeliveryOrder(activeBusinessOrder, orders) : null),
    [activeBusinessOrder, orders],
  );
  const selectedDeviceRecord = selectedDeliveryOrder
    ? deviceRecords[selectedDeliveryOrder.id]
    : null;
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
  useEffect(() => {
    if (viewMode === "detail" && !selectedTenantOrder) {
      setViewMode("list");
    }
  }, [selectedTenantOrder, viewMode]);

  useEffect(() => {
    if (!activeBusinessOrder) {
      return;
    }

    setSelectedDetailTab("orderInfo");
  }, [activeBusinessOrder?.id, selectedDeliveryOrder?.id]);

  useEffect(() => {
    if (selectedDeliveryOrder || selectedDetailTab === "orderInfo") {
      return;
    }

    setSelectedDetailTab("orderInfo");
  }, [selectedDeliveryOrder, selectedDetailTab]);

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

  const handleOpenOrderPreview = useCallback((orderId: string): void => {
    setPreviewOrderId(orderId);
  }, []);

  const handleCloseOrderPreview = useCallback((): void => {
    setPreviewOrderId("");
  }, []);

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

    const nextOrder = buildManualOrder(
      createOrderForm,
      currentMemberId || members[0]?.id || "",
    );

    commitOrders(previous => [nextOrder, ...previous]);
    setSelectedOrderId(nextOrder.id);
    setViewMode("detail");
    setSelectedDetailTab("orderInfo");
    setIsCreateDrawerOpen(false);
    message.success("租户已创建，请先在租户下新建订单后再开始交付。");
  }, [commitOrders, createOrderForm, currentMemberId, members, setSelectedOrderId]);

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
    message.success("订单已创建，设备与 AI 专家已按订单内容预填到交付步骤。");
  }, [
    createBusinessOrderForm.lineItems,
    createBusinessOrderForm.remark,
    createOrder,
    handleCloseCreateBusinessOrderModal,
    selectedTenantOrder,
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
    if (!selectedDeliveryOrder) {
      return;
    }

    const currentDeviceRecord =
      selectedDeliveryOrder.currentStep === "deviceConfig"
        ? selectedDeviceRecord ?? buildDefaultDeviceRecord(selectedDeliveryOrder)
        : null;
    const canCompleteDeviceStep =
      currentDeviceRecord !== null &&
      (currentDeviceRecord.isConfigured || hasPendingDevicePrefill(currentDeviceRecord));

    if (
      !skipCurrentStep &&
      selectedDeliveryOrder.currentStep === "deviceConfig" &&
      !canCompleteDeviceStep
    ) {
      message.warning("当前订单还没有可确认的设备分配信息。");
      return;
    }

    if (!skipCurrentStep && selectedDeliveryOrder.currentStep === "agentConfig") {
      const groupItems = selectedDeliveryOrder.agentGroups ?? [];
      const singleItems = selectedDeliveryOrder.agentPackages ?? [];
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

    const visibleSteps = getVisibleDeliverySteps(selectedDeliveryOrder);
    const currentStepIndex = visibleSteps.findIndex(
      step => step.key === selectedDeliveryOrder.currentStep,
    );
    const nextStep = currentStepIndex >= 0 ? visibleSteps[currentStepIndex + 1] : undefined;

    commitOrders(previous =>
      previous.map(item => {
        if (item.id !== selectedDeliveryOrder.id) {
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
        ? `已跳过 ${getStepKeyLabel(selectedDeliveryOrder.currentStep)}，进入 ${nextStep.label}。`
        : `已进入 ${nextStep.label}。`,
    );
  }, [commitOrders, selectedDeliveryOrder, selectedDeviceRecord]);

  const createTenantModal = (
    <FdeDeliveryCreateTenantModal
      open={isCreateDrawerOpen}
      form={createOrderForm}
      onClose={handleCloseCreateDrawer}
      onSubmit={handleCreateOrder}
      onChange={handleCreateFieldChange}
    />
  );
  const createBusinessOrderModal = (
    <FdeDeliveryCreateBusinessOrderModal
      open={isCreateBusinessOrderModalOpen}
      tenantCustomerName={selectedTenantOrder?.customerName}
      tenantName={selectedTenantOrder?.tenantName}
      form={createBusinessOrderForm}
      totalAmount={createBusinessOrderTotalAmount}
      onClose={handleCloseCreateBusinessOrderModal}
      onSubmit={handleCreateBusinessOrder}
      onUpdateRemark={handleUpdateBusinessOrderRemark}
      onAddDeviceLine={() => handleAddBusinessDeviceLine("云端工作站")}
      onOpenAgentModal={handleOpenBusinessAgentModal}
      onAddTokensLine={handleAddBusinessTokensLine}
      onRemoveLineItem={handleRemoveBusinessLineItem}
      onUpdateDeviceLine={handleUpdateBusinessDeviceLine}
      onUpdateAgentLinePrice={handleUpdateBusinessAgentLinePrice}
      onUpdateAgentLineValidity={handleUpdateBusinessAgentLineValidity}
      onUpdateTokensLine={handleUpdateBusinessTokensLine}
    />
  );
  const businessAgentModal = (
    <FdeDeliveryAgentModal
      open={isBusinessAgentModalOpen}
      agentSelectMode="single"
      agentScope={agentScope}
      agentSceneCategory={agentSceneCategory}
      agentSceneCategories={agentSceneCategories}
      visibleAgentPlazaItems={visibleAgentPlazaItems}
      selectedAgentIds={[]}
      expertGroupForm={expertGroupForm}
      setAgentScope={setAgentScope}
      setAgentSceneCategory={setAgentSceneCategory}
      onClose={handleCloseBusinessAgentModal}
      onToggleAgentSelection={handleToggleAgentSelection}
      onAddAgentToOrder={handleAddBusinessAgentLine}
      onConfirmAgentGroup={handleConfirmAgentGroup}
    />
  );
  const orderPreviewModal = (
    <FdeDeliveryOrderPreviewModal
      order={selectedPreviewOrder}
      linkedTenant={previewLinkedTenant}
      onClose={handleCloseOrderPreview}
    />
  );

  if (!orders.length) {
    return (
      <div className={styles.layout}>
        <div className={styles.pageBarActionsOnly}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateDrawer}>
            创建租户
          </Button>
        </div>
        <Empty description="当前暂无租户" />
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
        <FdeDeliveryWorkbenchListView
          items={filteredOrderItems}
          searchKeyword={searchKeyword}
          deliveryStatusFilter={deliveryStatusFilter}
          setSearchKeyword={setSearchKeyword}
          setDeliveryStatusFilter={setDeliveryStatusFilter}
          onEnterDetail={handleEnterDetail}
        />
        {createTenantModal}
        {orderPreviewModal}
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {selectedTenantOrder ? (
        <FdeDeliveryWorkbenchDetailView
          selectedTenantOrder={selectedTenantOrder}
          selectedDeliveryOrder={selectedDeliveryOrder}
          tenantBusinessOrders={tenantBusinessOrders}
          tenantDeliveryRecords={tenantDeliveryRecords}
          activeBusinessOrder={activeBusinessOrder}
          selectedDetailTab={selectedDetailTab}
          onBackToList={handleBackToList}
          onEnterDetail={handleEnterDetail}
          onOpenCreateBusinessOrderModal={handleOpenCreateBusinessOrderModal}
          onSelectDetailTab={setSelectedDetailTab}
        >
          {selectedDetailTab === "orderInfo" || !selectedDeliveryOrder ? (
            <FdeDeliveryOrderInfoPanel
              order={activeBusinessOrder}
              deliveryOrder={selectedDeliveryOrder}
              onOpenPreviewOrder={handleOpenOrderPreview}
            />
          ) : (
            <FdeDeliveryStepPanel
              deliveryOrder={selectedDeliveryOrder}
              selectedDetailTab={selectedDetailTab}
              deviceRecord={selectedDeviceRecord}
              onOpenDeviceModal={handleOpenDeviceModal}
              onAdvanceStep={handleAdvanceStep}
              onOpenExpertGroupModal={handleOpenExpertGroupModal}
              onOpenAgentModal={handleOpenAgentModal}
              onDeliverAgentGroup={handleDeliverAgentGroup}
              onDeliverSingleAgent={handleDeliverSingleAgent}
              onOpenAdmin={handleOpenAdmin}
            />
          )}
        </FdeDeliveryWorkbenchDetailView>
      ) : (
        <Empty description="请选择租户" />
      )}
      {createBusinessOrderModal}
      {businessAgentModal}
      {orderPreviewModal}
      <FdeDeliveryDeviceModal
        open={isDeviceModalOpen}
        form={deviceForm}
        onClose={handleCloseDeviceModal}
        onSave={handleSaveDeviceAllocation}
        onChange={handleDeviceFieldChange}
      />
      <FdeDeliveryExpertGroupModal
        open={isExpertGroupModalOpen}
        form={expertGroupForm}
        onClose={handleCloseExpertGroupModal}
        onNext={handleProceedToGroupAgentSelection}
        onChange={handleExpertGroupFieldChange}
      />
      <FdeDeliveryAgentModal
        open={isAgentModalOpen}
        agentSelectMode={agentSelectMode}
        agentScope={agentScope}
        agentSceneCategory={agentSceneCategory}
        agentSceneCategories={agentSceneCategories}
        visibleAgentPlazaItems={visibleAgentPlazaItems}
        selectedAgentIds={selectedAgentIds}
        expertGroupForm={expertGroupForm}
        setAgentScope={setAgentScope}
        setAgentSceneCategory={setAgentSceneCategory}
        onClose={handleCloseAgentModal}
        onToggleAgentSelection={handleToggleAgentSelection}
        onAddAgentToOrder={handleAddAgentToOrder}
        onConfirmAgentGroup={handleConfirmAgentGroup}
      />
    </div>
  );
};
