import { useEffect, useMemo, useState } from "react";

import { DownOutlined, RightOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { Empty } from "antd";

import type { FdeAssetQuotaItem, FdeOperationsCustomerItem } from "@/feature/fde/types";

import styles from "./FdeOperationsMonitorView.module.less";

interface FdeOperationsMonitorViewProps {
  items: FdeOperationsCustomerItem[];
  selectedCustomerId: string;
  setSelectedCustomerId: (customerId: string) => void;
}

type FdeAssetDetailTabKey = "recharge" | "devices" | "agents";
type FdeAgentAssetRow =
  | {
      kind: "group";
      key: string;
      groupName: string;
      agents: FdeOperationsCustomerItem["agents"];
      completedTasks: number;
    }
  | {
      kind: "single";
      key: string;
      agent: FdeOperationsCustomerItem["agents"][number];
    };

const getDeviceStatusClassName = (status: "online" | "offline"): string => {
  return status === "online" ? styles.deviceStatusOnline : styles.deviceStatusOffline;
};

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

const getAgentSourceTags = (
  item: FdeOperationsCustomerItem["agents"][number],
): string[] => {
  const tags = item.collectionLabels?.length
    ? item.collectionLabels
    : [item.deliverySourceLabel ?? "单个下发"];

  return tags;
};

const buildAgentAssetRows = (
  agents: FdeOperationsCustomerItem["agents"],
): FdeAgentAssetRow[] => {
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
        completedTasks: groupItems.reduce((total, item) => total + item.completedTasks, 0),
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
}: FdeOperationsMonitorViewProps): JSX.Element => {
  const [activeDetailTab, setActiveDetailTab] = useState<FdeAssetDetailTabKey>("recharge");
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>([]);
  const deliveredItems = useMemo<FdeOperationsCustomerItem[]>(
    () => items.filter(item => item.isDelivered),
    [items],
  );
  const selectedCustomer = useMemo(
    () =>
      deliveredItems.find(item => item.id === selectedCustomerId) ?? deliveredItems[0] ?? null,
    [deliveredItems, selectedCustomerId],
  );
  const agentAssetRows = useMemo<FdeAgentAssetRow[]>(
    () => (selectedCustomer ? buildAgentAssetRows(selectedCustomer.agents) : []),
    [selectedCustomer],
  );

  useEffect(() => {
    setExpandedGroupKeys([]);
  }, [selectedCustomer?.id]);

  const handleToggleGroup = (groupKey: string): void => {
    setExpandedGroupKeys(previous =>
      previous.includes(groupKey)
        ? previous.filter(item => item !== groupKey)
        : [...previous, groupKey],
    );
  };

  if (!deliveredItems.length) {
    return <Empty description="当前暂无已交付客户资产" />;
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.customerSidebar}>
        <div className={styles.sidebarTitle}>客户列表</div>
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
              <h2 className={styles.pageTitle}>{selectedCustomer.customerName}</h2>
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
                  <div className={styles.cardLabel}>积分余额</div>
                  <div className={styles.cardValue}>{selectedCustomer.pointsBalanceLabel}</div>
                  <div className={styles.cardMeta}>当前可用余额</div>
                </div>
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
                    <span>类型</span>
                    <span>状态</span>
                    <span>归属</span>
                    <span>绑定员工</span>
                    <span>位置</span>
                    <span>运行时长</span>
                  </div>
                  {selectedCustomer.devices.map(device => (
                    <div key={device.id} className={styles.tableRowDevice}>
                      <span className={styles.tableStrong}>{device.name}</span>
                      <span>{device.categoryLabel ?? "待确认"}</span>
                      <span
                        className={classNames(
                          styles.deviceStatus,
                          getDeviceStatusClassName(device.status),
                        )}
                      >
                        {device.status === "online" ? "在线" : "离线"}
                      </span>
                      <span>{device.ownerLabel ?? "待确认"}</span>
                      <span>{device.assignedEmployeeName ?? "暂未绑定"}</span>
                      <span>{device.locationLabel ?? "待确认"}</span>
                      <span>{device.uptime}</span>
                    </div>
                  ))}
                </>
              ) : null}

              {activeDetailTab === "agents" ? (
                <>
                  <div className={styles.tableHeaderAgent}>
                    <span>AI 专家</span>
                    <span>当前版本</span>
                    <span>模型</span>
                    <span>已完成任务</span>
                    <span>授权对象</span>
                    <span>可用范围</span>
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
                            <span>{row.completedTasks} 条</span>
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
                                  <span>{agent.currentVersion ?? "待确认"}</span>
                                  <span>{agent.modelLabel ?? "待配置"}</span>
                                  <span>{agent.completedTasks} 条</span>
                                  <span>{getAgentTargetLabel(agent)}</span>
                                  <span>{agent.deploymentLabel ?? "指定范围可用"}</span>
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
                        <span>{agent.currentVersion ?? "待确认"}</span>
                        <span>{agent.modelLabel ?? "待配置"}</span>
                        <span>{agent.completedTasks} 条</span>
                        <span>{getAgentTargetLabel(agent)}</span>
                        <span>{agent.deploymentLabel ?? "指定范围可用"}</span>
                      </div>
                    );
                  })}
                </>
              ) : null}
            </section>
          </>
        ) : (
          <Empty description="请选择客户" />
        )}
      </section>
    </div>
  );
};
