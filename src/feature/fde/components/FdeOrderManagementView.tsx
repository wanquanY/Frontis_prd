import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import classNames from "classnames";
import { Button, Empty, Input, InputNumber, Modal, Select, message } from "antd";

import { FDE_AGENT_CATALOG_ITEMS } from "@/feature/fde/agentCatalog";
import type {
  FdeAgentCatalogItem,
  FdeCreateOrderPayload,
  FdeCreateOrderResult,
  FdeDeliveryOrderItem,
  FdeOrderAgentGroupLineItem,
  FdeOrderAgentLineItem,
  FdeOrderDeviceLineItem,
  FdeOrderDeviceType,
  FdeOrderItem,
  FdeOrderLineItem,
  FdeOrderStatus,
  FdeOrderTokensLineItem,
} from "@/feature/fde/types";

import { FdeDeliveryAgentModal } from "./FdeDeliveryAgentModal";
import { FdeDeliveryExpertGroupModal } from "./FdeDeliveryExpertGroupModal";
import {
  type AgentPlazaScope,
  type AgentSelectMode,
  createInitialExpertGroupForm,
  type ExpertGroupFormState,
} from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeOrderManagementView.module.less";

interface FdeOrderManagementViewProps {
  items: FdeOrderItem[];
  deliveryOrders: FdeDeliveryOrderItem[];
  selectedOrderId: string;
  setSelectedOrderId: (orderId: string) => void;
  createOrder: (payload: FdeCreateOrderPayload) => FdeCreateOrderResult;
  onNavigateToDelivery: () => void;
}

interface CreateOrderFormState {
  tenantId?: string;
  remark: string;
  lineItems: FdeOrderLineItem[];
}

type OrderViewMode = "list" | "detail";
type TenantFilterValue = string;

const ALL_TENANT_FILTER_VALUE = "__all__";

const DEVICE_TYPE_OPTIONS: Array<{ label: string; value: FdeOrderDeviceType }> = [
  { label: "云端工作站", value: "云端工作站" },
  { label: "本地工作站", value: "本地工作站" },
  { label: "本地客户端授权", value: "本地客户端授权" },
];

const createLineId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

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

const getOrderStatusClassName = (status: FdeOrderStatus): string => {
  if (status === "已完成") {
    return styles.orderStatusDone;
  }

  if (status === "履约中") {
    return styles.orderStatusProcessing;
  }

  return styles.orderStatusPending;
};

const getFulfillmentStatusClassName = (status: FdeOrderItem["fulfillmentItems"][number]["status"]): string => {
  if (status === "已完成") {
    return styles.fulfillmentStatusDone;
  }

  if (status === "处理中") {
    return styles.fulfillmentStatusProcessing;
  }

  return styles.fulfillmentStatusPending;
};

const isDeviceLineItem = (item: FdeOrderLineItem): item is FdeOrderDeviceLineItem => item.kind === "device";

const isAgentLineItem = (item: FdeOrderLineItem): item is FdeOrderAgentLineItem => item.kind === "agent";

const isAgentGroupLineItem = (
  item: FdeOrderLineItem,
): item is FdeOrderAgentGroupLineItem => item.kind === "agentGroup";

const isTokensLineItem = (item: FdeOrderLineItem): item is FdeOrderTokensLineItem => item.kind === "tokens";

const getTenantDisplayName = (item: Pick<FdeOrderItem, "customerName" | "tenantName">): string =>
  item.tenantName?.trim() || item.customerName;

const createInitialOrderForm = (): CreateOrderFormState => ({
  tenantId: undefined,
  remark: "",
  lineItems: [],
});

const createDeviceLineItem = (): FdeOrderDeviceLineItem => ({
  id: createLineId("device"),
  kind: "device",
  deviceType: "云端工作站",
  quantity: 1,
  validityMonths: 12,
  unitPrice: 0,
  totalAmount: 0,
});

const createTokensLineItem = (): FdeOrderTokensLineItem => ({
  id: createLineId("tokens"),
  kind: "tokens",
  tokenCount: 0,
  totalAmount: 0,
});

const createAgentLineItem = (agent: FdeAgentCatalogItem): FdeOrderAgentLineItem => ({
  id: createLineId("agent"),
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

const createAgentGroupLineItem = (
  form: ExpertGroupFormState,
  agents: FdeAgentCatalogItem[],
): FdeOrderAgentGroupLineItem => ({
  id: createLineId("agent-group"),
  kind: "agentGroup",
  groupName: form.name.trim(),
  groupDescription: form.description.trim(),
  sourceLabel: "FDE 组合交付",
  agents: agents.map(agent => ({
    name: agent.name,
    releaseVersion: agent.releaseVersion,
    sourceLabel: agent.sourceLabel,
    statusLabel: "待下发",
    permissionHint: agent.permissionHint,
  })),
  quantity: 1,
  validityMonths: 12,
  unitPrice: 0,
  totalAmount: 0,
});

const buildOrderSummary = (lineItems: FdeOrderLineItem[]): string => {
  const deviceCount = lineItems.filter(isDeviceLineItem).length;
  const agentCount = lineItems.filter(isAgentLineItem).length;
  const agentGroupCount = lineItems.filter(isAgentGroupLineItem).length;
  const tokenCount = lineItems.filter(isTokensLineItem).length;
  const summaryParts = [
    deviceCount ? `设备 ${deviceCount} 项` : "",
    agentCount ? `AI 专家 ${agentCount} 项` : "",
    agentGroupCount ? `AI 专家团 ${agentGroupCount} 项` : "",
    tokenCount ? `tokens ${tokenCount} 项` : "",
  ].filter(Boolean);

  return summaryParts.join(" / ") || "未添加商品";
};

const DELIVERY_STEP_LABELS: Record<FdeDeliveryOrderItem["currentStep"], string> = {
  deviceConfig: "设备分配",
  agentConfig: "租户 Agent 下发",
  apiTest: "企业后台配置",
  preflight: "交付验收",
};

const getTenantStatusLabel = (tenant: FdeDeliveryOrderItem | null): string => {
  if (!tenant) {
    return "未关联";
  }

  return `${tenant.deliveryStatus} · ${DELIVERY_STEP_LABELS[tenant.currentStep]}`;
};

/**
 * FDE 订单管理视图。
 */
export const FdeOrderManagementView = ({
  items,
  deliveryOrders,
  selectedOrderId,
  setSelectedOrderId,
  createOrder,
  onNavigateToDelivery,
}: FdeOrderManagementViewProps): JSX.Element => {
  const [viewMode, setViewMode] = useState<OrderViewMode>("list");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isExpertGroupModalOpen, setIsExpertGroupModalOpen] = useState<boolean>(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState<boolean>(false);
  const [agentSelectMode, setAgentSelectMode] = useState<AgentSelectMode>("single");
  const [agentScope, setAgentScope] = useState<AgentPlazaScope>("public");
  const [agentSceneCategory, setAgentSceneCategory] = useState<string>("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [tenantFilter, setTenantFilter] = useState<TenantFilterValue>(ALL_TENANT_FILTER_VALUE);
  const [createForm, setCreateForm] = useState<CreateOrderFormState>(createInitialOrderForm());
  const [expertGroupForm, setExpertGroupForm] = useState<ExpertGroupFormState>(
    createInitialExpertGroupForm(),
  );

  const selectedOrder = useMemo(
    () => items.find(item => item.id === selectedOrderId) ?? items[0] ?? null,
    [items, selectedOrderId],
  );
  const tenantOptions = useMemo<FdeDeliveryOrderItem[]>(
    () => deliveryOrders.filter(item => item.orderKind === "initial"),
    [deliveryOrders],
  );
  const totalAmount = useMemo<number>(
    () => createForm.lineItems.reduce((total, item) => total + item.totalAmount, 0),
    [createForm.lineItems],
  );
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
  const visibleAgentItems = useMemo<FdeAgentCatalogItem[]>(
    () =>
      FDE_AGENT_CATALOG_ITEMS.filter(
        item =>
          item.scope === agentScope &&
          (!agentSceneCategory || item.sceneCategory === agentSceneCategory),
      ),
    [agentSceneCategory, agentScope],
  );
  const tenantFilterOptions = useMemo<Array<{ label: string; value: TenantFilterValue }>>(
    () => {
      const seenTenantKeys = new Set<string>();
      const dynamicOptions = items.flatMap(item => {
        const tenantKey = item.tenantId ?? item.tenantName;
        const tenantLabel = item.tenantName;

        if (!tenantKey || !tenantLabel || seenTenantKeys.has(tenantKey)) {
          return [];
        }

        seenTenantKeys.add(tenantKey);
        return [
          {
            label: tenantLabel,
            value: tenantKey,
          },
        ];
      });

      return [
        { label: "全部租户", value: ALL_TENANT_FILTER_VALUE },
        ...dynamicOptions,
      ];
    },
    [items],
  );
  const filteredItems = useMemo<FdeOrderItem[]>(
    () => {
      const normalizedKeyword = searchKeyword.trim().toLowerCase();

      return items.filter(item => {
        const matchesTenant =
          tenantFilter === ALL_TENANT_FILTER_VALUE
            ? true
            : item.tenantId === tenantFilter || item.tenantName === tenantFilter;

        if (!matchesTenant) {
          return false;
        }

        if (!normalizedKeyword) {
          return true;
        }

        const searchSource = [
          item.orderNo,
          getTenantDisplayName(item),
          item.tenantCode ?? "",
          item.status,
        ]
          .join(" ")
          .toLowerCase();

        return searchSource.includes(normalizedKeyword);
      });
    },
    [items, searchKeyword, tenantFilter],
  );

  useEffect(() => {
    if (!items.length) {
      return;
    }

    if (!items.some(item => item.id === selectedOrderId)) {
      setSelectedOrderId(items[0].id);
    }
  }, [items, selectedOrderId, setSelectedOrderId]);

  useEffect(() => {
    if (!agentSceneCategories.length) {
      setAgentSceneCategory("");
      return;
    }

    if (!agentSceneCategories.includes(agentSceneCategory)) {
      setAgentSceneCategory(agentSceneCategories[0]);
    }
  }, [agentSceneCategories, agentSceneCategory]);

  const handleOpenCreateModal = useCallback((): void => {
    setCreateForm(createInitialOrderForm());
    setIsCreateModalOpen(true);
  }, []);

  const handleCloseCreateModal = useCallback((): void => {
    setIsCreateModalOpen(false);
    setIsExpertGroupModalOpen(false);
    setIsAgentModalOpen(false);
    setAgentSelectMode("single");
    setSelectedAgentIds([]);
    setExpertGroupForm(createInitialExpertGroupForm());
    setCreateForm(createInitialOrderForm());
  }, []);

  const handleUpdateForm = useCallback(
    <TKey extends keyof CreateOrderFormState>(key: TKey, value: CreateOrderFormState[TKey]): void => {
      setCreateForm(previous => ({
        ...previous,
        [key]: value,
      }));
    },
    [],
  );

  const handleTenantChange = useCallback(
    (tenantId?: string): void => {
      setCreateForm(previous => ({
        ...previous,
        tenantId,
      }));
    },
    [],
  );

  const handleAddDeviceLine = useCallback((): void => {
    setCreateForm(previous => ({
      ...previous,
      lineItems: [...previous.lineItems, createDeviceLineItem()],
    }));
  }, []);

  const handleAddTokensLine = useCallback((): void => {
    setCreateForm(previous => ({
      ...previous,
      lineItems: [...previous.lineItems, createTokensLineItem()],
    }));
  }, []);

  const handleRemoveLineItem = useCallback((lineItemId: string): void => {
    setCreateForm(previous => ({
      ...previous,
      lineItems: previous.lineItems.filter(item => item.id !== lineItemId),
    }));
  }, []);

  const handleUpdateDeviceLine = useCallback(
    <TKey extends keyof FdeOrderDeviceLineItem>(
      lineItemId: string,
      key: TKey,
      value: FdeOrderDeviceLineItem[TKey],
    ): void => {
      setCreateForm(previous => ({
        ...previous,
        lineItems: previous.lineItems.map(item => {
          if (!isDeviceLineItem(item) || item.id !== lineItemId) {
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

  const handleUpdateAgentLinePrice = useCallback((lineItemId: string, unitPrice: number | null): void => {
    setCreateForm(previous => ({
      ...previous,
      lineItems: previous.lineItems.map(item =>
        (isAgentLineItem(item) || isAgentGroupLineItem(item)) && item.id === lineItemId
          ? {
              ...item,
              unitPrice: unitPrice ?? 0,
              totalAmount: unitPrice ?? 0,
            }
          : item,
      ),
    }));
  }, []);

  const handleUpdateAgentLineValidity = useCallback((lineItemId: string, validityMonths: number | null): void => {
    setCreateForm(previous => ({
      ...previous,
      lineItems: previous.lineItems.map(item =>
        (isAgentLineItem(item) || isAgentGroupLineItem(item)) && item.id === lineItemId
          ? {
              ...item,
              validityMonths: validityMonths ?? 0,
            }
          : item,
      ),
    }));
  }, []);

  const handleUpdateTokensLine = useCallback(
    <TKey extends keyof FdeOrderTokensLineItem>(
      lineItemId: string,
      key: TKey,
      value: FdeOrderTokensLineItem[TKey],
    ): void => {
      setCreateForm(previous => ({
        ...previous,
        lineItems: previous.lineItems.map(item =>
          isTokensLineItem(item) && item.id === lineItemId
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

  const handleOpenAgentModal = useCallback((mode: AgentSelectMode = "single"): void => {
    setAgentSelectMode(mode);
    setAgentScope("public");
    setAgentSceneCategory("");
    setSelectedAgentIds([]);
    setIsAgentModalOpen(true);
  }, []);

  const handleCloseAgentModal = useCallback((): void => {
    setIsAgentModalOpen(false);
    setAgentSelectMode("single");
    setSelectedAgentIds([]);
  }, []);

  const handleOpenExpertGroupModal = useCallback((): void => {
    setExpertGroupForm(createInitialExpertGroupForm());
    setSelectedAgentIds([]);
    setIsExpertGroupModalOpen(true);
  }, []);

  const handleCloseExpertGroupModal = useCallback((): void => {
    setIsExpertGroupModalOpen(false);
    setExpertGroupForm(createInitialExpertGroupForm());
    setSelectedAgentIds([]);
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

  const handleProceedToGroupAgentSelection = useCallback((): void => {
    if (!expertGroupForm.name.trim() || !expertGroupForm.description.trim()) {
      message.warning("请先补齐专家团名称和介绍。");
      return;
    }

    setIsExpertGroupModalOpen(false);
    handleOpenAgentModal("group");
  }, [expertGroupForm.description, expertGroupForm.name, handleOpenAgentModal]);

  const handleToggleAgentSelection = useCallback((agentId: string): void => {
    setSelectedAgentIds(previous =>
      previous.includes(agentId)
        ? previous.filter(item => item !== agentId)
        : [...previous, agentId],
    );
  }, []);

  const handleAddAgentLine = useCallback((agent: FdeAgentCatalogItem): void => {
    let isDuplicate = false;

    setCreateForm(previous => {
      if (
        previous.lineItems.some(
          item =>
            (isAgentLineItem(item) && item.agentCatalogId === agent.id) ||
            (isAgentGroupLineItem(item) &&
              item.agents.some(groupAgent => groupAgent.name === agent.name)),
        )
      ) {
        isDuplicate = true;
        return previous;
      }

      return {
        ...previous,
        lineItems: [...previous.lineItems, createAgentLineItem(agent)],
      };
    });

    if (isDuplicate) {
      message.warning("该 AI 专家已经在当前订单中。");
      return;
    }

    message.success(`已加入 ${agent.name}。`);
  }, []);

  const handleConfirmAgentGroup = useCallback((): void => {
    if (!selectedAgentIds.length) {
      message.warning("请先选择至少一个 AI 专家加入专家团。");
      return;
    }

    const selectedAgents = FDE_AGENT_CATALOG_ITEMS.filter(item => selectedAgentIds.includes(item.id));
    let duplicateCount = 0;

    setCreateForm(previous => {
      const assignedAgentNames = new Set(
        previous.lineItems.flatMap(item => {
          if (isAgentLineItem(item)) {
            return [item.agentName];
          }

          if (isAgentGroupLineItem(item)) {
            return item.agents.map(agent => agent.name);
          }

          return [];
        }),
      );
      const availableAgents = selectedAgents.filter(agent => {
        const isDuplicate = assignedAgentNames.has(agent.name);
        if (isDuplicate) {
          duplicateCount += 1;
        }
        return !isDuplicate;
      });

      if (!availableAgents.length) {
        return previous;
      }

      return {
        ...previous,
        lineItems: [
          ...previous.lineItems,
          createAgentGroupLineItem(expertGroupForm, availableAgents),
        ],
      };
    });

    if (duplicateCount === selectedAgentIds.length) {
      message.warning("所选 AI 专家已经全部存在于当前订单中。");
      return;
    }

    setIsAgentModalOpen(false);
    setAgentSelectMode("single");
    setSelectedAgentIds([]);
    setExpertGroupForm(createInitialExpertGroupForm());
    message.success(
      duplicateCount
        ? `专家团已创建，已自动跳过 ${duplicateCount} 个重复 AI 专家。`
        : "AI 专家团已创建并加入订单。",
    );
  }, [expertGroupForm, selectedAgentIds]);

  const handleCreateOrder = useCallback((): void => {
    if (!createForm.tenantId) {
      message.warning("请先选择订单所属租户。");
      return;
    }

    const targetTenant = tenantOptions.find(item => item.id === createForm.tenantId);

    if (!targetTenant) {
      message.warning("当前租户不存在，请重新选择。");
      return;
    }

    if (!createForm.lineItems.length) {
      message.warning("请先添加至少一个商品明细。");
      return;
    }

    const hasInvalidLineItem = createForm.lineItems.some(item => {
      if (isDeviceLineItem(item)) {
        return (
          item.quantity <= 0 ||
          item.unitPrice <= 0 ||
          item.totalAmount <= 0 ||
          (item.validityMonths ?? 0) <= 0
        );
      }

      if (isAgentLineItem(item)) {
        return item.unitPrice <= 0 || item.totalAmount <= 0 || (item.validityMonths ?? 0) <= 0;
      }

      if (isAgentGroupLineItem(item)) {
        return (
          !item.agents.length ||
          item.unitPrice <= 0 ||
          item.totalAmount <= 0 ||
          (item.validityMonths ?? 0) <= 0
        );
      }

      return item.tokenCount <= 0 || item.totalAmount <= 0;
    });

    if (hasInvalidLineItem) {
      message.warning("请先补齐商品数量和金额。");
      return;
    }

    const result = createOrder({
      customerName: targetTenant.customerName.trim(),
      tenantId: createForm.tenantId,
      remark: createForm.remark.trim(),
      lineItems: createForm.lineItems,
    });

    if (!result.orderId) {
      message.warning("当前租户不存在，请重新选择。");
      return;
    }

    setSelectedOrderId(result.orderId);
    setViewMode("detail");
    handleCloseCreateModal();
    message.success("订单已创建。");
  }, [createForm, createOrder, handleCloseCreateModal, setSelectedOrderId, tenantOptions]);

  const handleEnterDetail = useCallback(
    (orderId: string): void => {
      setSelectedOrderId(orderId);
      setViewMode("detail");
    },
    [setSelectedOrderId],
  );

  const handleBackToList = useCallback((): void => {
    setViewMode("list");
  }, []);

  const renderLineItems = useCallback((lineItems: FdeOrderLineItem[]): JSX.Element => {
    if (!lineItems.length) {
      return <div className={styles.emptyHint}>当前未添加任何商品。</div>;
    }

    return (
      <div className={styles.detailList}>
        {lineItems.map(item => {
          if (isDeviceLineItem(item)) {
            return (
              <div key={item.id} className={styles.detailCard}>
                <div className={styles.detailTitleRow}>
                  <span className={styles.detailTitle}>{item.deviceType}</span>
                  <span className={styles.detailTag}>设备</span>
                </div>
                <div className={styles.detailMeta}>
                  数量 {item.quantity} / 单价 {formatAmount(item.unitPrice)} / 小计 {formatAmount(item.totalAmount)} / 有效时长{" "}
                  {formatValidityLabel(item.validityMonths)}
                </div>
                {item.deliveredAssetIds?.length ? (
                  <div className={styles.detailSubMeta}>
                    资产ID：{item.deliveredAssetIds.join("、")} · 到期时间：{item.expiresAt ?? "待交付后生成"}
                  </div>
                ) : null}
              </div>
            );
          }

          if (isAgentLineItem(item)) {
            return (
              <div key={item.id} className={styles.detailCard}>
                <div className={styles.detailTitleRow}>
                  <span className={styles.detailTitle}>{item.agentName}</span>
                  <span className={styles.detailTag}>AI 专家</span>
                </div>
                <div className={styles.detailMeta}>
                  {item.releaseVersion} · {item.sourceLabel} · {formatAmount(item.totalAmount)} · 有效时长{" "}
                  {formatValidityLabel(item.validityMonths)}
                </div>
                {item.deliveredAssetIds?.length ? (
                  <div className={styles.detailSubMeta}>
                    资产ID：{item.deliveredAssetIds.join("、")} · 到期时间：{item.expiresAt ?? "待交付后生成"}
                  </div>
                ) : null}
              </div>
            );
          }

          if (isAgentGroupLineItem(item)) {
            return (
              <div key={item.id} className={styles.detailCard}>
                <div className={styles.detailTitleRow}>
                  <span className={styles.detailTitle}>{item.groupName}</span>
                  <span className={styles.detailTag}>AI 专家团</span>
                </div>
                <div className={styles.detailMeta}>
                  {item.sourceLabel} · {item.agents.length} 个 AI 专家 · {formatAmount(item.totalAmount)} ·
                  有效时长 {formatValidityLabel(item.validityMonths)}
                </div>
                <div className={styles.detailSubMeta}>
                  包含：{item.agents.map(agent => agent.name).join("、")}
                </div>
                {item.deliveredAssetIds?.length ? (
                  <div className={styles.detailSubMeta}>
                    资产ID：{item.deliveredAssetIds.join("、")} · 到期时间：{item.expiresAt ?? "待交付后生成"}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <div key={item.id} className={styles.detailCard}>
              <div className={styles.detailTitleRow}>
                <span className={styles.detailTitle}>tokens 资源包</span>
                <span className={styles.detailTag}>tokens</span>
              </div>
              <div className={styles.detailMeta}>
                {formatTokenCount(item.tokenCount)} · {formatAmount(item.totalAmount)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, []);

  const createOrderModal = (
    <Modal
      title="创建订单"
      open={isCreateModalOpen}
      width={840}
      rootClassName={styles.createOrderModal}
      onCancel={handleCloseCreateModal}
      footer={null}
      destroyOnClose
    >
      <div className={styles.createOrderBody}>
        <div className={styles.formSection}>
          <div className={styles.sectionTitle}>订单信息</div>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <div className={styles.fieldLabel}>关联租户</div>
              <Select
                className={styles.fullWidthControl}
                placeholder="请选择订单所属租户"
                value={createForm.tenantId}
                options={tenantOptions.map(item => ({
                  label: item.tenantName,
                  value: item.id,
                }))}
                onChange={value => handleTenantChange(value)}
              />
            </div>
          </div>
          <div className={styles.formField}>
            <div className={styles.fieldLabel}>订单备注</div>
            <Input.TextArea
              rows={3}
              value={createForm.remark}
              placeholder="补充订单说明、交付背景或客户要求"
              onChange={event => handleUpdateForm("remark", event.target.value)}
            />
          </div>
        </div>

        <div className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>商品明细</div>
            <div className={styles.inlineActions}>
              <Button onClick={handleAddDeviceLine}>添加设备</Button>
              <Button onClick={handleOpenExpertGroupModal}>添加 AI 专家团</Button>
              <Button onClick={() => handleOpenAgentModal("single")}>直接添加单个 AI 专家</Button>
              <Button onClick={handleAddTokensLine}>添加 tokens</Button>
            </div>
          </div>
          {createForm.lineItems.length ? (
            <div className={styles.lineItemList}>
              {createForm.lineItems.map(item => {
                if (isDeviceLineItem(item)) {
                  return (
                    <div key={item.id} className={styles.lineItemCard}>
                      <div className={styles.lineItemHeader}>
                        <div className={styles.lineItemTitle}>设备</div>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveLineItem(item.id)}
                        />
                      </div>
                      <div className={styles.lineItemGrid}>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>设备类型</div>
                          <Select
                            className={styles.fullWidthControl}
                            value={item.deviceType}
                            options={DEVICE_TYPE_OPTIONS}
                            onChange={value => handleUpdateDeviceLine(item.id, "deviceType", value)}
                          />
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>数量</div>
                          <InputNumber
                            className={styles.fullWidthControl}
                            min={1}
                            value={item.quantity}
                            onChange={value => handleUpdateDeviceLine(item.id, "quantity", value ?? 0)}
                          />
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>单价</div>
                          <InputNumber
                            className={styles.fullWidthControl}
                            min={0}
                            value={item.unitPrice}
                            formatter={value => `${value ?? ""}`}
                            onChange={value => handleUpdateDeviceLine(item.id, "unitPrice", value ?? 0)}
                          />
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>有效时长（月）</div>
                          <InputNumber
                            className={styles.fullWidthControl}
                            min={1}
                            value={item.validityMonths}
                            onChange={value =>
                              handleUpdateDeviceLine(item.id, "validityMonths", value ?? 0)
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

                if (isAgentLineItem(item)) {
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
                          onClick={() => handleRemoveLineItem(item.id)}
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
                            onChange={value => handleUpdateAgentLinePrice(item.id, value)}
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
                            onChange={value => handleUpdateAgentLineValidity(item.id, value)}
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

                if (isAgentGroupLineItem(item)) {
                  return (
                    <div key={item.id} className={styles.lineItemCard}>
                      <div className={styles.lineItemHeader}>
                        <div>
                          <div className={styles.lineItemTitle}>{item.groupName}</div>
                          <div className={styles.lineItemHint}>
                            {item.sourceLabel} · {item.agents.length} 个 AI 专家
                          </div>
                        </div>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveLineItem(item.id)}
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
                            onChange={value => handleUpdateAgentLinePrice(item.id, value)}
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
                            onChange={value => handleUpdateAgentLineValidity(item.id, value)}
                          />
                        </div>
                        <div className={styles.formField}>
                          <div className={styles.fieldLabel}>小计</div>
                          <div className={styles.amountValue}>{formatAmount(item.totalAmount)}</div>
                        </div>
                      </div>
                      <div className={styles.lineItemHint}>
                        包含：{item.agents.map(agent => agent.name).join("、")}
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
                        onClick={() => handleRemoveLineItem(item.id)}
                      />
                    </div>
                    <div className={styles.lineItemGrid}>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>tokens 数量</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={0}
                          value={item.tokenCount}
                          onChange={value => handleUpdateTokensLine(item.id, "tokenCount", value ?? 0)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <div className={styles.fieldLabel}>金额</div>
                        <InputNumber
                          className={styles.fullWidthControl}
                          min={0}
                          value={item.totalAmount}
                          formatter={value => `${value ?? ""}`}
                          onChange={value => handleUpdateTokensLine(item.id, "totalAmount", value ?? 0)}
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
            <div className={styles.emptyHint}>先添加设备、AI 专家团、AI 专家或 tokens 商品。</div>
          )}
        </div>

        <div className={styles.summaryBar}>
          <div className={styles.summaryLabel}>订单总金额</div>
          <div className={styles.summaryValue}>{formatAmount(totalAmount)}</div>
        </div>

        <div className={styles.modalActions}>
          <Button onClick={handleCloseCreateModal}>取消</Button>
          <Button type="primary" icon={<ShoppingCartOutlined />} onClick={handleCreateOrder}>
            创建订单
          </Button>
        </div>
      </div>
    </Modal>
  );
  const expertGroupModal = (
    <FdeDeliveryExpertGroupModal
      open={isExpertGroupModalOpen}
      form={expertGroupForm}
      onClose={handleCloseExpertGroupModal}
      onNext={handleProceedToGroupAgentSelection}
      onChange={handleExpertGroupFieldChange}
    />
  );
  const agentModal = (
    <FdeDeliveryAgentModal
      open={isAgentModalOpen}
      agentSelectMode={agentSelectMode}
      agentScope={agentScope}
      agentSceneCategory={agentSceneCategory}
      agentSceneCategories={agentSceneCategories}
      visibleAgentPlazaItems={visibleAgentItems}
      selectedAgentIds={selectedAgentIds}
      expertGroupForm={expertGroupForm}
      setAgentScope={setAgentScope}
      setAgentSceneCategory={setAgentSceneCategory}
      onClose={handleCloseAgentModal}
      onToggleAgentSelection={handleToggleAgentSelection}
      onAddAgentToOrder={handleAddAgentLine}
      onConfirmAgentGroup={handleConfirmAgentGroup}
    />
  );

  if (!items.length) {
    return (
      <div className={styles.layout}>
        <div className={styles.pageBarActionsOnly}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            创建订单
          </Button>
        </div>
        <Empty description="当前暂无订单" />
        {createOrderModal}
        {expertGroupModal}
        {agentModal}
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className={styles.layout}>
        <div className={styles.pageBarActionsOnly}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            创建订单
          </Button>
        </div>
        <div className={styles.listFilters}>
          <Input
            value={searchKeyword}
            className={styles.searchInput}
            placeholder="搜索订单编号、租户名称或租户编码"
            onChange={event => setSearchKeyword(event.target.value)}
          />
          <Select<TenantFilterValue>
            value={tenantFilter}
            className={styles.filterSelect}
            options={tenantFilterOptions}
            onChange={value => setTenantFilter(value)}
          />
        </div>
        <div className={styles.listTable}>
          <div className={styles.listHeader}>
            <span>订单编号</span>
            <span>租户名称</span>
            <span>商品摘要</span>
            <span>总金额</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          {filteredItems.length ? (
            filteredItems.map(item => (
              <button
                key={item.id}
                type="button"
                className={styles.listRow}
                onClick={() => handleEnterDetail(item.id)}
              >
                <span>{item.orderNo}</span>
                <span className={styles.tableStrong}>{getTenantDisplayName(item)}</span>
                <span>{buildOrderSummary(item.lineItems)}</span>
                <span>{formatAmount(item.totalAmount)}</span>
                <span className={classNames(styles.orderStatus, getOrderStatusClassName(item.status))}>
                  {item.status}
                </span>
                <span className={styles.listAction}>查看订单详情</span>
              </button>
            ))
          ) : (
            <div className={styles.listEmpty}>当前筛选条件下暂无订单</div>
          )}
        </div>
        {createOrderModal}
        {expertGroupModal}
        {agentModal}
      </div>
    );
  }

  const linkedTenant =
    deliveryOrders.find(item => item.id === selectedOrder?.tenantId) ??
    deliveryOrders.find(item => item.linkedOrderIds?.includes(selectedOrder?.id ?? ""));

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
              <h2 className={styles.pageTitle}>{getTenantDisplayName(selectedOrder)}</h2>
            </div>
            <Button type="primary" onClick={onNavigateToDelivery}>进入配置交付</Button>
          </div>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>订单信息</div>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单编号</span>
                <span className={styles.infoValue}>{selectedOrder.orderNo}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单类型</span>
                <span className={styles.infoValue}>{selectedOrder.businessType ?? "新购"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单状态</span>
                <span className={styles.infoValue}>{selectedOrder.status}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>总金额</span>
                <span className={styles.infoValue}>{formatAmount(selectedOrder.totalAmount)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>创建时间</span>
                <span className={styles.infoValue}>{selectedOrder.createdAt}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>订单备注</span>
                <span className={styles.infoValue}>{selectedOrder.remark || "未填写"}</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>商品明细</div>
            {renderLineItems(selectedOrder.lineItems)}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>租户信息</div>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>租户名称</span>
                <span className={styles.infoValue}>{getTenantDisplayName(selectedOrder)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>租户编码</span>
                <span className={styles.infoValue}>{selectedOrder.tenantCode ?? "-"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>交付状态</span>
                <span className={styles.infoValue}>{getTenantStatusLabel(linkedTenant ?? null)}</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>履约任务</div>
            {selectedOrder.fulfillmentItems.length ? (
              <div className={styles.detailList}>
                {selectedOrder.fulfillmentItems.map(item => (
                  <div key={item.id} className={styles.detailCard}>
                    <div className={styles.detailTitleRow}>
                      <span className={styles.detailTitle}>{item.type}</span>
                      <span
                        className={classNames(
                          styles.fulfillmentStatus,
                          getFulfillmentStatusClassName(item.status),
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className={styles.detailMeta}>{item.summary}</div>
                    <div className={styles.detailSubMeta}>最近更新时间：{item.updatedAt}</div>
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
                    ) : (
                      <div className={styles.emptyHint}>当前履约任务暂无执行记录。</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyHint}>当前订单还没有生成履约任务。</div>
            )}
          </section>
        </div>
      ) : (
        <Empty description="请选择订单" />
      )}
      {createOrderModal}
      {expertGroupModal}
      {agentModal}
    </div>
  );
};
