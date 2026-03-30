import { useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Empty, Input, Modal, Progress, Select, message } from "antd";

import type {
  FdeAlertStatus,
  FdeOperationsAlertItem,
  FdeOperationsCustomerItem,
  FdeTeamMemberItem,
} from "@/feature/fde/types";
import { getFdeHealthLabel, getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeOperationsMonitorView.module.less";

interface FdeOperationsMonitorViewProps {
  items: FdeOperationsCustomerItem[];
  members: FdeTeamMemberItem[];
  selectedCustomerId: string;
  setSelectedCustomerId: (customerId: string) => void;
  updateAlertStatus: (customerId: string, alertId: string, status: FdeAlertStatus) => void;
  assignAlert: (customerId: string, alertId: string, ownerId: string) => void;
  recordAlertResolution: (customerId: string, alertId: string, resolution: string) => void;
  openDelivery: (customerName: string) => void;
  openFeedback: (customerName: string) => void;
}

interface AlertModalState {
  alertId: string;
  ownerId: string;
  resolution: string;
}

const getHealthClassName = (health: FdeOperationsCustomerItem["health"]): string => {
  if (health === "healthy") {
    return styles.healthHealthy;
  }

  if (health === "attention") {
    return styles.healthAttention;
  }

  return styles.healthRisk;
};

const getSeverityClassName = (severity: FdeOperationsAlertItem["severity"]): string => {
  if (severity === "高") {
    return styles.severityHigh;
  }

  if (severity === "中") {
    return styles.severityMedium;
  }

  return styles.severityLow;
};

const getAlertStatusClassName = (status: FdeOperationsAlertItem["status"]): string => {
  if (status === "已关闭") {
    return styles.alertClosed;
  }

  if (status === "处理中") {
    return styles.alertProcessing;
  }

  return styles.alertPending;
};

const getDiagnosticClassName = (status: "正常" | "关注" | "异常"): string => {
  if (status === "正常") {
    return styles.healthHealthy;
  }

  if (status === "关注") {
    return styles.healthAttention;
  }

  return styles.healthRisk;
};

const getNextAlertStatus = (status: FdeOperationsAlertItem["status"]): FdeAlertStatus => {
  if (status === "待确认") {
    return "处理中";
  }

  if (status === "处理中") {
    return "已关闭";
  }

  return "处理中";
};

/**
 * 运营监控视图。
 */
export const FdeOperationsMonitorView = ({
  items,
  members,
  selectedCustomerId,
  setSelectedCustomerId,
  updateAlertStatus,
  assignAlert,
  recordAlertResolution,
  openDelivery,
  openFeedback,
}: FdeOperationsMonitorViewProps): JSX.Element => {
  const [alertModalState, setAlertModalState] = useState<AlertModalState | null>(null);
  const selectedCustomer = useMemo(
    () => items.find(item => item.id === selectedCustomerId) ?? items[0] ?? null,
    [items, selectedCustomerId],
  );
  const openAlerts = useMemo(
    () => selectedCustomer?.alerts.filter(item => item.status !== "已关闭") ?? [],
    [selectedCustomer],
  );
  const averageOnlineRate = useMemo(() => {
    if (!selectedCustomer?.trends.length) {
      return 0;
    }

    return Math.round(
      selectedCustomer.trends.reduce((sum, item) => sum + item.onlineRate, 0) /
        selectedCustomer.trends.length,
    );
  }, [selectedCustomer]);

  const handleAlertStatusUpdate = (alertId: string, status: FdeOperationsAlertItem["status"]): void => {
    if (!selectedCustomer) {
      return;
    }

    const nextStatus = getNextAlertStatus(status);
    updateAlertStatus(selectedCustomer.id, alertId, nextStatus);
    message.success(`告警状态已更新为${nextStatus}。`);
  };

  const handleCloseAlert = (alertId: string): void => {
    if (!selectedCustomer) {
      return;
    }

    updateAlertStatus(selectedCustomer.id, alertId, "已关闭");
    message.success("告警已关闭。");
  };

  const handleOpenAlertModal = (alert: FdeOperationsAlertItem): void => {
    setAlertModalState({
      alertId: alert.id,
      ownerId: alert.ownerId,
      resolution: alert.resolution,
    });
  };

  const handleSubmitAlertModal = (): void => {
    if (!selectedCustomer || !alertModalState) {
      return;
    }

    assignAlert(selectedCustomer.id, alertModalState.alertId, alertModalState.ownerId);
    recordAlertResolution(selectedCustomer.id, alertModalState.alertId, alertModalState.resolution);
    setAlertModalState(null);
    message.success("已更新告警负责人和处理结果。");
  };

  if (!items.length) {
    return <Empty description="当前视角下暂无运营监控客户" />;
  }

  return (
    <>
      <div className={styles.workbench}>
        <section className={styles.customerRail}>
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              className={classNames(
                styles.customerCard,
                item.id === selectedCustomer?.id && styles.customerCardActive,
              )}
              onClick={() => setSelectedCustomerId(item.id)}
            >
              <div className={styles.customerTop}>
                <strong>{item.customerName}</strong>
                <span className={classNames(styles.healthTag, getHealthClassName(item.health))}>
                  {getFdeHealthLabel(item.health)}
                </span>
              </div>
              <div className={styles.customerMeta}>{item.scenarioName}</div>
              <div className={styles.customerMeta}>{item.lastHeartbeat}</div>
              <div className={styles.customerMeta}>未关闭告警：{item.issueCount}</div>
            </button>
          ))}
        </section>

        <section className={styles.detailGrid}>
          {selectedCustomer ? (
            <>
              <article className={styles.heroCard}>
                <div className={styles.heroHeader}>
                  <div>
                    <div className={styles.eyebrow}>运营监控</div>
                    <h2 className={styles.title}>{selectedCustomer.customerName}</h2>
                    <p className={styles.description}>{selectedCustomer.scenarioName}</p>
                  </div>
                  <div
                    className={classNames(
                      styles.healthTag,
                      getHealthClassName(selectedCustomer.health),
                    )}
                  >
                    {getFdeHealthLabel(selectedCustomer.health)}
                  </div>
                </div>
                <div className={styles.metricGrid}>
                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>在线专家</span>
                    <strong className={styles.metricValue}>
                      {selectedCustomer.onlineExperts}/{selectedCustomer.activeExperts}
                    </strong>
                  </div>
                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>24h 消息量</span>
                    <strong className={styles.metricValue}>
                      {selectedCustomer.messageVolume24h.toLocaleString()}
                    </strong>
                  </div>
                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>完成率</span>
                    <strong className={styles.metricValue}>
                      {selectedCustomer.taskCompletionRate}%
                    </strong>
                  </div>
                  <div className={styles.metricCard}>
                    <span className={styles.metricLabel}>未关闭告警</span>
                    <strong className={styles.metricValue}>{openAlerts.length}</strong>
                  </div>
                </div>
                {selectedCustomer.health === "risk" ? (
                  <div className={styles.jumpActions}>
                    <Button onClick={() => openDelivery(selectedCustomer.customerName)}>
                      查看交付工单
                    </Button>
                    <Button type="primary" ghost onClick={() => openFeedback(selectedCustomer.customerName)}>
                      查看回流数据
                    </Button>
                  </div>
                ) : null}
              </article>

              <article className={styles.alertCard}>
                <div className={styles.sectionTitle}>告警面板</div>
                <div className={styles.summaryText}>{selectedCustomer.alertSummary}</div>
                {selectedCustomer.alerts.length ? (
                  <div className={styles.alertList}>
                    {selectedCustomer.alerts.map(alert => (
                      <div key={alert.id} className={styles.alertItem}>
                        <div className={styles.alertHeader}>
                          <div>
                            <strong>{alert.title}</strong>
                            <div className={styles.alertMeta}>
                              {alert.sourceType} · {alert.sourceName} · {alert.createdAt}
                            </div>
                          </div>
                          <div className={styles.alertTags}>
                            <span
                              className={classNames(
                                styles.statusTag,
                                getSeverityClassName(alert.severity),
                              )}
                            >
                              {alert.severity}级
                            </span>
                            <span
                              className={classNames(
                                styles.statusTag,
                                getAlertStatusClassName(alert.status),
                              )}
                            >
                              {alert.status}
                            </span>
                          </div>
                        </div>
                        <div className={styles.alertDetail}>{alert.detail}</div>
                        <div className={styles.alertMeta}>
                          当前负责人：{getFdeMemberName(members, alert.ownerId)}
                        </div>
                        <div className={styles.alertResolution}>
                          处理结果：{alert.resolution || "待补充处理结果"}
                        </div>
                        <div className={styles.alertActions}>
                          {alert.status !== "已关闭" ? (
                            <Button size="small" onClick={() => handleAlertStatusUpdate(alert.id, alert.status)}>
                              {alert.status === "待确认" ? "确认处理" : "推进到关闭"}
                            </Button>
                          ) : null}
                          {alert.status !== "已关闭" ? (
                            <Button size="small" onClick={() => handleCloseAlert(alert.id)}>
                              关闭告警
                            </Button>
                          ) : null}
                          <Button size="small" onClick={() => handleOpenAlertModal(alert)}>
                            指派 / 记录结果
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="当前客户暂无具体告警" />
                )}
              </article>

              <article className={styles.trendCard}>
                <div className={styles.sectionTitle}>运行趋势</div>
                <div className={styles.trendSummary}>
                  <span>平均在线率 {averageOnlineRate}%</span>
                  <span>最近 5 天趋势概览</span>
                </div>
                <div className={styles.trendList}>
                  {selectedCustomer.trends.map(item => (
                    <div key={item.label} className={styles.trendItem}>
                      <div className={styles.trendLabel}>{item.label}</div>
                      <div className={styles.trendBars}>
                        <div className={styles.trendMetric}>
                          <span className={styles.metricLabel}>消息量</span>
                          <Progress
                            percent={Math.min(100, Math.round(item.messageVolume / 10))}
                            showInfo={false}
                            strokeColor="var(--fdeAccent)"
                          />
                        </div>
                        <div className={styles.trendMetric}>
                          <span className={styles.metricLabel}>完成率</span>
                          <Progress
                            percent={item.completionRate}
                            showInfo={false}
                            strokeColor="var(--fdeSuccess)"
                          />
                        </div>
                        <div className={styles.trendMetric}>
                          <span className={styles.metricLabel}>在线率</span>
                          <Progress
                            percent={item.onlineRate}
                            showInfo={false}
                            strokeColor="var(--primary)"
                          />
                        </div>
                      </div>
                      <div className={styles.trendMeta}>告警 {item.alertCount} 条</div>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.highlightCard}>
                <div className={styles.sectionTitle}>关键亮点</div>
                <div className={styles.highlightList}>
                  {selectedCustomer.highlights.map(item => (
                    <div key={item} className={styles.highlightItem}>
                      <span className={styles.highlightDot} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.diagnosticCard}>
                <div className={styles.sectionTitle}>故障定位</div>
                <div className={styles.diagnosticGrid}>
                  <section className={styles.diagnosticSection}>
                    <div className={styles.diagnosticTitle}>专家状态</div>
                    {selectedCustomer.agentDiagnostics.map(item => (
                      <div key={item.id} className={styles.diagnosticItem}>
                        <div className={styles.alertHeader}>
                          <strong>{item.name}</strong>
                          <span
                            className={classNames(
                              styles.statusTag,
                              getDiagnosticClassName(item.status),
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className={styles.alertDetail}>{item.note}</div>
                      </div>
                    ))}
                  </section>
                  <section className={styles.diagnosticSection}>
                    <div className={styles.diagnosticTitle}>接口状态</div>
                    {selectedCustomer.apiDiagnostics.map(item => (
                      <div key={item.id} className={styles.diagnosticItem}>
                        <div className={styles.alertHeader}>
                          <strong>{item.name}</strong>
                          <span
                            className={classNames(
                              styles.statusTag,
                              getDiagnosticClassName(item.status),
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className={styles.alertDetail}>{item.note}</div>
                      </div>
                    ))}
                  </section>
                  <section className={styles.diagnosticSection}>
                    <div className={styles.diagnosticTitle}>设备节点</div>
                    {selectedCustomer.deviceDiagnostics.map(item => (
                      <div key={item.id} className={styles.diagnosticItem}>
                        <div className={styles.alertHeader}>
                          <strong>{item.name}</strong>
                          <span
                            className={classNames(
                              styles.statusTag,
                              getDiagnosticClassName(item.status),
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className={styles.alertDetail}>{item.note}</div>
                      </div>
                    ))}
                  </section>
                </div>
              </article>
            </>
          ) : null}
        </section>
      </div>

      <Modal
        title="告警处理记录"
        open={Boolean(alertModalState)}
        okText="保存处理记录"
        cancelText="取消"
        onCancel={() => setAlertModalState(null)}
        onOk={handleSubmitAlertModal}
      >
        {alertModalState ? (
          <div className={styles.modalForm}>
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>负责人</span>
              <Select
                value={alertModalState.ownerId}
                options={members.map(item => ({
                  label: item.name,
                  value: item.id,
                }))}
                onChange={value =>
                  setAlertModalState(previous =>
                    previous
                      ? {
                          ...previous,
                          ownerId: value,
                        }
                      : previous,
                  )
                }
              />
            </div>
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>处理结果</span>
              <Input.TextArea
                rows={4}
                value={alertModalState.resolution}
                onChange={event =>
                  setAlertModalState(previous =>
                    previous
                      ? {
                          ...previous,
                          resolution: event.target.value,
                        }
                      : previous,
                  )
                }
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};
