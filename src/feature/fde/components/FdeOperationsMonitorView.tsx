import { useCallback, useEffect, useMemo, useState } from "react";

import dayjs from "dayjs";
import { DownOutlined, RightOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { Button, Empty, Input, InputNumber, Modal, message } from "antd";

import type {
  FdeAssetQuotaItem,
  FdeCreateOrderResult,
  FdeOperationsCustomerItem,
  FdeRenewAssetPayload,
} from "@/feature/fde/types";

import styles from "./FdeOperationsMonitorView.module.less";

interface FdeOperationsMonitorViewProps {
  items: FdeOperationsCustomerItem[];
  selectedCustomerId: string;
  setSelectedCustomerId: (customerId: string) => void;
  onNavigateToDelivery: () => void;
  renewAsset: (payload: FdeRenewAssetPayload) => FdeCreateOrderResult;
}

type FdeAssetDetailTabKey = "recharge" | "devices" | "agents" | "changes";
type FdeAgentAssetRow =
  | {
      kind: "group";
      key: string;
      groupName: string;
      agents: FdeOperationsCustomerItem["agents"];
    }
  | {
      kind: "single";
      key: string;
      agent: FdeOperationsCustomerItem["agents"][number];
    };

interface RenewAssetDraft {
  assetId: string;
  assetName: string;
  assetType: "device" | "agent";
  expiresAt?: string;
}

const getQuotaMetaLabel = (quota: FdeAssetQuotaItem): string => {
  const remaining = Math.max(quota.total - quota.used, 0);
  return `已用 ${quota.used}${quota.unit} / 剩余 ${remaining}${quota.unit}`;
};

const getAgentTargetLabel = (item: FdeOperationsCustomerItem["agents"][number]): string => {
  if (item.deploymentLabel === "全公司可用") {
    return "全员";
  }

  return item.assignedMembers?.join("、") ?? "暂未分配";
};

const getAgentSourceTags = (item: FdeOperationsCustomerItem["agents"][number]): string[] => {
  const tags = item.collectionLabels?.length
    ? item.collectionLabels
    : [item.deliverySourceLabel ?? "单个下发"];

  return tags;
};

const getChangeStatusClassName = (
  status: FdeOperationsCustomerItem["changeRecords"][number]["statusLabel"],
): string => {
  if (status === "已完成") {
    return styles.changeStatusDone;
  }

  if (status === "已取消") {
    return styles.changeStatusCanceled;
  }

  return styles.changeStatusPending;
};

const formatDateTimeLabel = (value?: string): string => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-");

const getAssetStatusClassName = (expiresAt?: string): string => {
  if (!expiresAt) {
    return styles.assetStatusExpiring;
  }

  if (dayjs(expiresAt).isBefore(dayjs())) {
    return styles.assetStatusExpired;
  }

  if (dayjs(expiresAt).diff(dayjs(), "day") <= 30) {
    return styles.assetStatusExpiring;
  }

  return styles.assetStatusActive;
};

const getAssetStatusLabel = (expiresAt?: string): string => {
  if (!expiresAt) {
    return "待确认";
  }

  if (dayjs(expiresAt).isBefore(dayjs())) {
    return "已到期";
  }

  if (dayjs(expiresAt).diff(dayjs(), "day") <= 30) {
    return "即将到期";
  }

  return "生效中";
};

const getAssetRemainingLabel = (expiresAt?: string): string => {
  if (!expiresAt) {
    return "待确认";
  }

  const now = dayjs();
  const diffDays = dayjs(expiresAt).diff(now, "day");

  if (diffDays < 0) {
    return `已过期 ${Math.abs(diffDays)} 天`;
  }

  return `剩余 ${diffDays} 天`;
};

const buildAgentAssetRows = (agents: FdeOperationsCustomerItem["agents"]): FdeAgentAssetRow[] => {
  const groupedAgents = new Map<string, FdeOperationsCustomerItem["agents"]>();

  agents.forEach(agent => {
    const groupName = agent.collectionLabels?.[0];

    if (!groupName) {
      return;
    }

    const existing = groupedAgents.get(groupName);

    if (existing) {
      existing.push(agent);
      return;
    }

    groupedAgents.set(groupName, [agent]);
  });

  const seenGroups = new Set<string>();

  return agents.flatMap<FdeAgentAssetRow>(agent => {
    const groupName = agent.collectionLabels?.[0];

    if (!groupName) {
      return [
        {
          kind: "single",
          key: `agent-${agent.name}`,
          agent,
        },
      ];
    }

    if (seenGroups.has(groupName)) {
      return [];
    }

    seenGroups.add(groupName);
    const groupItems = groupedAgents.get(groupName) ?? [agent];

    return [
      {
        kind: "group",
        key: `group-${groupName}`,
        groupName,
        agents: groupItems,
      },
    ];
  });
};

/**
 * 客户资产管理视图。
 */
export const FdeOperationsMonitorView = ({
  items,
  selectedCustomerId,
  setSelectedCustomerId,
  onNavigateToDelivery,
  renewAsset,
}: FdeOperationsMonitorViewProps): JSX.Element => {
  const [activeDetailTab, setActiveDetailTab] = useState<FdeAssetDetailTabKey>("recharge");
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>([]);
  const [renewDraft, setRenewDraft] = useState<RenewAssetDraft | null>(null);
  const [renewValidityMonths, setRenewValidityMonths] = useState<number>(12);
  const [renewAmount, setRenewAmount] = useState<number>(0);
  const [renewRemark, setRenewRemark] = useState<string>("");
  const deliveredItems = useMemo<FdeOperationsCustomerItem[]>(
    () => items.filter(item => item.isDelivered),
    [items],
  );
  const selectedCustomer = useMemo(
    () => deliveredItems.find(item => item.id === selectedCustomerId) ?? deliveredItems[0] ?? null,
    [deliveredItems, selectedCustomerId],
  );
  const agentAssetRows = useMemo<FdeAgentAssetRow[]>(
    () => (selectedCustomer ? buildAgentAssetRows(selectedCustomer.agents) : []),
    [selectedCustomer],
  );

  useEffect(() => {
    setExpandedGroupKeys([]);
  }, [selectedCustomer?.id]);

  const handleToggleGroup = useCallback((groupKey: string): void => {
    setExpandedGroupKeys(previous =>
      previous.includes(groupKey)
        ? previous.filter(item => item !== groupKey)
        : [...previous, groupKey],
    );
  }, []);

  const handleOpenRenewModal = useCallback(
    (draft: RenewAssetDraft): void => {
      setRenewDraft(draft);
      setRenewValidityMonths(12);
      setRenewAmount(0);
      setRenewRemark(`${draft.assetName} 续费`);
    },
    [],
  );

  const handleCloseRenewModal = useCallback((): void => {
    setRenewDraft(null);
    setRenewValidityMonths(12);
    setRenewAmount(0);
    setRenewRemark("");
  }, []);

  const handleConfirmRenew = useCallback((): void => {
    if (!selectedCustomer || !renewDraft) {
      return;
    }

    if (renewValidityMonths <= 0 || renewAmount <= 0) {
      message.warning("请先补齐续费时长和金额。");
      return;
    }

    const result = renewAsset({
      customerId: selectedCustomer.id,
      assetId: renewDraft.assetId,
      assetType: renewDraft.assetType,
      validityMonths: renewValidityMonths,
      totalAmount: renewAmount,
      remark: renewRemark.trim(),
    });

    if (!result.orderId) {
      message.warning("续费创建失败，请刷新后重试。");
      return;
    }

    handleCloseRenewModal();
    message.success("已创建续费订单，正在进入配置交付。");
    onNavigateToDelivery();
  }, [
    handleCloseRenewModal,
    onNavigateToDelivery,
    renewAmount,
    renewAsset,
    renewDraft,
    renewRemark,
    renewValidityMonths,
    selectedCustomer,
  ]);

  if (!deliveredItems.length) {
    return <Empty description="当前暂无已交付租户资产" />;
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.customerSidebar}>
        <div className={styles.sidebarTitle}>租户列表</div>
        <div className={styles.customerList}>
          {deliveredItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={classNames(
                styles.customerItem,
                item.id === selectedCustomer?.id && styles.customerItemActive,
              )}
              onClick={() => setSelectedCustomerId(item.id)}
            >
              <span className={styles.customerName}>{item.customerName}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className={styles.contentPanel}>
        {selectedCustomer ? (
          <>
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderMain}>
                <h2 className={styles.pageTitle}>{selectedCustomer.customerName}</h2>
                <div className={styles.pageSubtitle}>
                  {selectedCustomer.tenantStatusLabel ?? "已交付租户"}
                </div>
              </div>
            </div>

            <section className={styles.section}>
              <div className={styles.sectionTitle}>资产概况</div>
              <div className={styles.overviewGrid}>
                {selectedCustomer.assetQuotas.map(item => (
                  <div key={item.id} className={styles.overviewCard}>
                    <div className={styles.cardLabel}>{item.label}</div>
                    <div className={styles.cardValue}>
                      {item.used}/{item.total}
                      {item.unit}
                    </div>
                    <div className={styles.cardMeta}>{getQuotaMetaLabel(item)}</div>
                  </div>
                ))}
                <div className={styles.overviewCard}>
                  <div className={styles.cardLabel}>Token 使用情况</div>
                  <div className={styles.cardValue}>{selectedCustomer.tokenUsage.usedLabel}</div>
                  <div className={styles.cardMeta}>
                    {selectedCustomer.tokenUsage.billingCycleLabel} / 上限{" "}
                    {selectedCustomer.tokenUsage.limitLabel}
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>资产明细</div>
                <div className={styles.detailTabs}>
                  <button
                    type="button"
                    className={classNames(
                      styles.detailTab,
                      activeDetailTab === "recharge" && styles.detailTabActive,
                    )}
                    onClick={() => setActiveDetailTab("recharge")}
                  >
                    充值记录
                  </button>
                  <button
                    type="button"
                    className={classNames(
                      styles.detailTab,
                      activeDetailTab === "devices" && styles.detailTabActive,
                    )}
                    onClick={() => setActiveDetailTab("devices")}
                  >
                    设备资产
                  </button>
                  <button
                    type="button"
                    className={classNames(
                      styles.detailTab,
                      activeDetailTab === "agents" && styles.detailTabActive,
                    )}
                    onClick={() => setActiveDetailTab("agents")}
                  >
                    AI 专家资产
                  </button>
                  <button
                    type="button"
                    className={classNames(
                      styles.detailTab,
                      activeDetailTab === "changes" && styles.detailTabActive,
                    )}
                    onClick={() => setActiveDetailTab("changes")}
                  >
                    交付变更记录
                  </button>
                </div>
              </div>

              {activeDetailTab === "recharge" ? (
                <>
                  <div className={styles.tableHeaderRecharge}>
                    <span>充值时间</span>
                    <span>充值金额</span>
                    <span>积分变动</span>
                    <span>充值渠道</span>
                    <span>操作人</span>
                    <span>状态</span>
                  </div>
                  {selectedCustomer.rechargeRecords.map(record => (
                    <div key={record.id} className={styles.tableRowRecharge}>
                      <span>{record.rechargeDate}</span>
                      <span className={styles.tableStrong}>{record.amountLabel}</span>
                      <span>{record.pointsLabel}</span>
                      <span>{record.channelLabel}</span>
                      <span>{record.operatorName}</span>
                      <span>{record.statusLabel}</span>
                    </div>
                  ))}
                </>
              ) : null}

              {activeDetailTab === "devices" ? (
                <>
                  <div className={styles.tableHeaderDevice}>
                    <span>设备</span>
                    <span>资产ID</span>
                    <span>类型</span>
                    <span>状态</span>
                    <span>到期时间</span>
                    <span>剩余时间</span>
                    <span>操作</span>
                  </div>
                  {selectedCustomer.devices.map(device => (
                    <div key={device.id} className={styles.tableRowDevice}>
                      <span className={styles.tableStrong}>{device.name}</span>
                      <span>{device.assetId ?? "-"}</span>
                      <span>{device.categoryLabel ?? "待确认"}</span>
                      <span
                        className={classNames(
                          styles.assetStatus,
                          getAssetStatusClassName(device.expiresAt),
                        )}
                      >
                        {getAssetStatusLabel(device.expiresAt)}
                      </span>
                      <span>{formatDateTimeLabel(device.expiresAt)}</span>
                      <span>{getAssetRemainingLabel(device.expiresAt)}</span>
                      <span>
                        <Button
                          size="small"
                          onClick={() =>
                            handleOpenRenewModal({
                              assetId: device.assetId ?? device.id,
                              assetName: device.name,
                              assetType: "device",
                              expiresAt: device.expiresAt,
                            })
                          }
                        >
                          续费
                        </Button>
                      </span>
                    </div>
                  ))}
                </>
              ) : null}

              {activeDetailTab === "agents" ? (
                <>
                  <div className={styles.tableHeaderAgent}>
                    <span>AI 专家</span>
                    <span>资产ID</span>
                    <span>当前版本</span>
                    <span>授权对象</span>
                    <span>到期时间</span>
                    <span>状态</span>
                    <span>操作</span>
                  </div>
                  {agentAssetRows.map(row => {
                    if (row.kind === "group") {
                      const isExpanded = expandedGroupKeys.includes(row.key);

                      return (
                        <div key={row.key} className={styles.agentGroupBlock}>
                          <button
                            type="button"
                            className={classNames(styles.tableRowAgent, styles.tableRowAgentButton)}
                            onClick={() => handleToggleGroup(row.key)}
                          >
                            <span className={styles.agentPrimaryCell}>
                              <span className={styles.agentGroupTitle}>
                                <span className={styles.expandIcon}>
                                  {isExpanded ? <DownOutlined /> : <RightOutlined />}
                                </span>
                                <span className={styles.tableStrong}>{row.groupName}</span>
                              </span>
                              <span className={styles.agentGroupMeta}>
                                包含 {row.agents.length} 个 AI 专家
                              </span>
                              <span className={styles.agentSourceTags}>
                                <span className={styles.agentSourceTag}>专家团</span>
                              </span>
                            </span>
                            <span>-</span>
                            <span>-</span>
                            <span>-</span>
                            <span>-</span>
                            <span>-</span>
                            <span>-</span>
                          </button>
                          {isExpanded
                            ? row.agents.map(agent => (
                                <div
                                  key={`${row.key}-${agent.name}`}
                                  className={classNames(
                                    styles.tableRowAgent,
                                    styles.tableRowAgentChild,
                                  )}
                                >
                                  <span className={styles.agentPrimaryCell}>
                                    <span className={styles.agentChildTitle}>
                                      <span className={styles.tableStrong}>{agent.name}</span>
                                    </span>
                                  </span>
                                  <span>{agent.assetId ?? "-"}</span>
                                  <span>{agent.currentVersion ?? "待确认"}</span>
                                  <span>{getAgentTargetLabel(agent)}</span>
                                  <span>{formatDateTimeLabel(agent.expiresAt)}</span>
                                  <span
                                    className={classNames(
                                      styles.assetStatus,
                                      getAssetStatusClassName(agent.expiresAt),
                                    )}
                                  >
                                    {getAssetStatusLabel(agent.expiresAt)}
                                  </span>
                                  <span>
                                    <Button
                                      size="small"
                                      onClick={() =>
                                        handleOpenRenewModal({
                                          assetId: agent.assetId ?? agent.name,
                                          assetName: agent.name,
                                          assetType: "agent",
                                          expiresAt: agent.expiresAt,
                                        })
                                      }
                                    >
                                      续费
                                    </Button>
                                  </span>
                                </div>
                              ))
                            : null}
                        </div>
                      );
                    }

                    const agent = row.agent;

                    return (
                      <div key={row.key} className={styles.tableRowAgent}>
                        <span className={styles.agentPrimaryCell}>
                          <span className={styles.tableStrong}>{agent.name}</span>
                          <span className={styles.agentSourceTags}>
                            {getAgentSourceTags(agent).map(tag => (
                              <span key={tag} className={styles.agentSourceTag}>
                                {tag}
                              </span>
                            ))}
                          </span>
                        </span>
                        <span>{agent.assetId ?? "-"}</span>
                        <span>{agent.currentVersion ?? "待确认"}</span>
                        <span>{getAgentTargetLabel(agent)}</span>
                        <span>{formatDateTimeLabel(agent.expiresAt)}</span>
                        <span
                          className={classNames(
                            styles.assetStatus,
                            getAssetStatusClassName(agent.expiresAt),
                          )}
                        >
                          {getAssetStatusLabel(agent.expiresAt)}
                        </span>
                        <span>
                          <Button
                            size="small"
                            onClick={() =>
                              handleOpenRenewModal({
                                assetId: agent.assetId ?? agent.name,
                                assetName: agent.name,
                                assetType: "agent",
                                expiresAt: agent.expiresAt,
                              })
                            }
                          >
                            续费
                          </Button>
                        </span>
                      </div>
                    );
                  })}
                </>
              ) : null}

              {activeDetailTab === "changes" ? (
                selectedCustomer.changeRecords.length ? (
                  <>
                    <div className={styles.tableHeaderChange}>
                      <span>变更单号</span>
                      <span>类型</span>
                      <span>内容摘要</span>
                      <span>状态</span>
                      <span>发起人</span>
                      <span>计划生效</span>
                      <span>完成时间</span>
                    </div>
                    {selectedCustomer.changeRecords.map(record => (
                      <div key={record.id} className={styles.tableRowChange}>
                        <span className={styles.tableStrong}>{record.orderId}</span>
                        <span>{record.type}</span>
                        <span className={styles.changeSummaryCell}>
                          <span className={styles.tableStrong}>{record.summary}</span>
                          <span className={styles.changeDetailMeta}>
                            {record.detailItems.length
                              ? record.detailItems.join(" · ")
                              : "暂无变更明细"}
                          </span>
                        </span>
                        <span
                          className={classNames(
                            styles.changeStatus,
                            getChangeStatusClassName(record.statusLabel),
                          )}
                        >
                          {record.statusLabel}
                        </span>
                        <span>{record.requestedByName}</span>
                        <span>{record.expectedEffectiveAt}</span>
                        <span>{record.completedAt ?? "进行中"}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className={styles.emptyHint}>当前暂无交付变更记录</div>
                )
              ) : null}
            </section>
          </>
          ) : (
            <Empty description="请选择租户" />
          )}
        </section>
      <Modal
        title="资产续费"
        open={Boolean(renewDraft)}
        onCancel={handleCloseRenewModal}
        onOk={handleConfirmRenew}
        okText="创建续费订单"
        destroyOnClose
      >
        {renewDraft ? (
          <div className={styles.renewModalBody}>
            <div className={styles.renewInfoRow}>
              <span className={styles.infoLabel}>资产名称</span>
              <span className={styles.infoValue}>{renewDraft.assetName}</span>
            </div>
            <div className={styles.renewInfoRow}>
              <span className={styles.infoLabel}>资产ID</span>
              <span className={styles.infoValue}>{renewDraft.assetId}</span>
            </div>
            <div className={styles.renewInfoRow}>
              <span className={styles.infoLabel}>当前到期</span>
              <span className={styles.infoValue}>{formatDateTimeLabel(renewDraft.expiresAt)}</span>
            </div>
            <div className={styles.renewFormField}>
              <div className={styles.fieldLabel}>续费时长（月）</div>
              <InputNumber
                className={styles.fullWidthControl}
                min={1}
                value={renewValidityMonths}
                onChange={value => setRenewValidityMonths(value ?? 0)}
              />
            </div>
            <div className={styles.renewFormField}>
              <div className={styles.fieldLabel}>续费金额</div>
              <InputNumber
                className={styles.fullWidthControl}
                min={0}
                value={renewAmount}
                onChange={value => setRenewAmount(value ?? 0)}
              />
            </div>
            <div className={styles.renewFormField}>
              <div className={styles.fieldLabel}>订单备注</div>
              <Input
                value={renewRemark}
                onChange={event => setRenewRemark(event.target.value)}
                placeholder="补充续费说明"
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
