import { useMemo } from "react";

import classNames from "classnames";
import { Empty } from "antd";

import type { FdeOperationsCustomerItem, FdeTeamMemberItem } from "@/feature/fde/types";
import { getFdeHealthLabel } from "@/feature/fde/utils";

import styles from "./FdeOperationsMonitorView.module.less";

interface FdeOperationsMonitorViewProps {
  items: FdeOperationsCustomerItem[];
  selectedCustomerId: string;
  setSelectedCustomerId: (customerId: string) => void;
  activeMemberId: string;
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

const getAlertSeverityClass = (severity: string): string => {
  switch (severity) {
    case "critical":
      return styles.alertCritical;
    case "high":
      return styles.alertHigh;
    case "medium":
      return styles.alertMedium;
    default:
      return styles.alertLow;
  }
};

/**
 * 运营监控视图。
 */
export const FdeOperationsMonitorView = ({
  items,
  selectedCustomerId,
  setSelectedCustomerId,
  activeMemberId,
}: FdeOperationsMonitorViewProps): JSX.Element => {
  const selectedCustomer = useMemo(
    () => items.find(item => item.id === selectedCustomerId) ?? items[0] ?? null,
    [items, selectedCustomerId],
  );

  const allAlerts = useMemo(() => {
    return items.flatMap(customer =>
      customer.alerts.map(alert => ({
        ...alert,
        customerName: customer.customerName,
      })),
    );
  }, [items]);

  if (!items.length) {
    return <Empty description="当前视角下暂无运营监控客户" />;
  }

  return (
    <div className={styles.monitorLayout}>
      {allAlerts.length > 0 && (
        <section className={styles.alertCenter}>
          <div className={styles.alertCenterTitle}>告警通知中心</div>
          <div className={styles.alertList}>
            {allAlerts.map(alert => (
              <div key={alert.id} className={classNames(styles.alertItem, getAlertSeverityClass(alert.severity))}>
                <div className={styles.alertDot} />
                <div className={styles.alertContent}>
                  <span className={styles.alertCustomer}>{alert.customerName}</span>
                  <span className={styles.alertMessage}>{alert.message}</span>
                </div>
                <span className={styles.alertTime}>{alert.time}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={styles.workbench}>
        <aside className={styles.customerList}>
          <div className={styles.sectionTitle}>客户列表</div>
          <div className={styles.customerListBody}>
            {items.map(item => (
              <button
                key={item.id}
                type="button"
                className={classNames(
                  styles.customerCard,
                  item.id === selectedCustomer?.id && styles.customerCardActive,
                  item.alerts.length > 0 && styles.customerCardAlert,
                )}
                onClick={() => setSelectedCustomerId(item.id)}
              >
                <div className={styles.customerTop}>
                  <strong>{item.customerName}</strong>
                  {item.alerts.length > 0 && <span className={styles.alertBadge}>!</span>}
                </div>
                <div className={styles.customerMeta}>{item.scenarioName}</div>
                <div className={styles.customerMeta}>{item.lastHeartbeat}</div>
              </button>
            ))}
          </div>
        </aside>

        <article className={styles.detailPanel}>
          {selectedCustomer ? (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <div className={styles.detailEyebrow}>运营监控</div>
                  <h2 className={styles.detailTitle}>{selectedCustomer.customerName}</h2>
                  <p className={styles.detailDescription}>{selectedCustomer.scenarioName}</p>
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

              <section className={styles.card}>
                <div className={styles.cardTitle}>设备情况</div>
                <div className={styles.deviceGrid}>
                  {selectedCustomer.devices.map(device => (
                    <div key={device.id} className={styles.deviceCard}>
                      <div className={styles.deviceHeader}>
                        <span className={styles.deviceIcon}>
                          {device.type === "cloud" ? "☁️" : "💻"}
                        </span>
                        <span className={styles.deviceName}>{device.name}</span>
                        <span
                          className={classNames(
                            styles.deviceStatus,
                            device.status === "online" ? styles.deviceStatusOnline : styles.deviceStatusOffline,
                          )}
                        >
                          {device.status === "online" ? "在线" : "离线"}
                        </span>
                      </div>
                      <div className={styles.deviceMeta}>运行时长: {device.uptime}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardTitle}>AI 专家团运行情况</div>
                <div className={styles.agentGrid}>
                  {selectedCustomer.agents.map((agent, idx) => (
                    <div key={idx} className={styles.agentCard}>
                      <div className={styles.agentName}>{agent.name}</div>
                      <div className={styles.agentStats}>
                        <div className={styles.agentStat}>
                          <span className={styles.agentStatLabel}>运行时长</span>
                          <span className={styles.agentStatValue}>{agent.runningHours} 小时</span>
                        </div>
                        <div className={styles.agentStat}>
                          <span className={styles.agentStatLabel}>完成任务</span>
                          <span className={styles.agentStatValue}>{agent.completedTasks} 条</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <Empty description="请选择客户" />
          )}
        </article>
      </div>
    </div>
  );
};
