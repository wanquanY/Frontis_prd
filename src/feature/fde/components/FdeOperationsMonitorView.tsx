import { useMemo } from "react";

import classNames from "classnames";
import { Empty, Progress } from "antd";

import type { FdeOperationsCustomerItem } from "@/feature/fde/types";
import { getFdeHealthLabel } from "@/feature/fde/utils";

import styles from "./FdeOperationsMonitorView.module.less";

interface FdeOperationsMonitorViewProps {
  items: FdeOperationsCustomerItem[];
  selectedCustomerId: string;
  setSelectedCustomerId: (customerId: string) => void;
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

/**
 * 运营监控视图。
 */
export const FdeOperationsMonitorView = ({
  items,
  selectedCustomerId,
  setSelectedCustomerId,
}: FdeOperationsMonitorViewProps): JSX.Element => {
  const selectedCustomer = useMemo(
    () => items.find(item => item.id === selectedCustomerId) ?? items[0] ?? null,
    [items, selectedCustomerId],
  );

  if (!items.length) {
    return <Empty description="当前视角下暂无运营监控客户" />;
  }

  return (
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
                  <span className={styles.metricLabel}>告警数</span>
                  <strong className={styles.metricValue}>{selectedCustomer.issueCount}</strong>
                </div>
              </div>
            </article>

            <article className={styles.alertCard}>
              <div className={styles.sectionTitle}>运行摘要</div>
              <p className={styles.summaryText}>{selectedCustomer.alertSummary}</p>
              <Progress
                percent={selectedCustomer.taskCompletionRate}
                strokeColor="var(--fdeAccent)"
                trailColor="var(--fdeBorder)"
              />
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
          </>
        ) : null}
      </section>
    </div>
  );
};
