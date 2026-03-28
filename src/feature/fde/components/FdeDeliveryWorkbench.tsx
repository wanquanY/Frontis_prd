import { useMemo } from "react";

import classNames from "classnames";
import { Empty, Progress } from "antd";

import { FDE_DELIVERY_STEPS } from "@/feature/fde/mockData";
import type { FdeDeliveryOrderItem, FdeTeamMemberItem } from "@/feature/fde/types";
import { getFdeDeliveryStepIndex, getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryWorkbenchProps {
  items: FdeDeliveryOrderItem[];
  members: FdeTeamMemberItem[];
  selectedOrderId: string;
  setSelectedOrderId: (orderId: string) => void;
}

/**
 * 配置交付视图。
 */
export const FdeDeliveryWorkbench = ({
  items,
  members,
  selectedOrderId,
  setSelectedOrderId,
}: FdeDeliveryWorkbenchProps): JSX.Element => {
  const selectedOrder = useMemo(
    () => items.find(item => item.id === selectedOrderId) ?? items[0] ?? null,
    [items, selectedOrderId],
  );

  if (!items.length) {
    return <Empty description="当前视角下暂无配置交付工单" />;
  }

  return (
    <div className={styles.workbench}>
      <aside className={styles.orderList}>
        <div className={styles.sectionTitle}>正式订单</div>
        <div className={styles.orderListBody}>
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              className={classNames(
                styles.orderItem,
                item.id === selectedOrder?.id && styles.orderItemActive,
              )}
              onClick={() => setSelectedOrderId(item.id)}
            >
              <div className={styles.orderItemHeader}>
                <strong>{item.customerName}</strong>
                <span className={styles.orderProgress}>{item.stepProgress}%</span>
              </div>
              <div className={styles.orderItemMeta}>{item.orderNo}</div>
              <div className={styles.orderItemMeta}>{item.scenarioName}</div>
              <Progress
                percent={item.stepProgress}
                showInfo={false}
                strokeColor="var(--fdeAccent)"
              />
            </button>
          ))}
        </div>
      </aside>

      <article className={styles.detailPanel}>
        {selectedOrder ? (
          <>
            <div className={styles.detailHeader}>
              <div>
                <div className={styles.detailEyebrow}>配置交付</div>
                <h2 className={styles.detailTitle}>{selectedOrder.customerName}</h2>
                <p className={styles.detailDescription}>
                  {selectedOrder.scenarioName} · 当前负责人：
                  {getFdeMemberName(members, selectedOrder.assignedToId)}
                </p>
              </div>
              <div className={styles.detailMeta}>
                <span>{selectedOrder.orderNo}</span>
                <span>目标上线：{selectedOrder.launchTargetDate}</span>
              </div>
            </div>

            <div className={styles.stepRail}>
              {FDE_DELIVERY_STEPS.map((step, index) => {
                const activeIndex = getFdeDeliveryStepIndex(selectedOrder.currentStep);
                const isCompleted = index < activeIndex;
                const isCurrent = index === activeIndex;

                return (
                  <div key={step.key} className={styles.stepItem}>
                    <div
                      className={classNames(
                        styles.stepBadge,
                        isCompleted && styles.stepBadgeDone,
                        isCurrent && styles.stepBadgeCurrent,
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className={styles.stepLabel}>{step.label}</div>
                  </div>
                );
              })}
            </div>

            <div className={styles.contentGrid}>
              <section className={styles.card}>
                <div className={styles.cardTitle}>客户与交付概览</div>
                <div className={styles.factGrid}>
                  <div className={styles.factItem}>
                    <span className={styles.factLabel}>行业</span>
                    <span className={styles.factValue}>{selectedOrder.industry}</span>
                  </div>
                  <div className={styles.factItem}>
                    <span className={styles.factLabel}>成员初始化</span>
                    <span className={styles.factValue}>{selectedOrder.memberCount} 人</span>
                  </div>
                  <div className={styles.factItem}>
                    <span className={styles.factLabel}>Agent 专家团</span>
                    <span className={styles.factValue}>
                      {selectedOrder.expertNames.join(" / ")}
                    </span>
                  </div>
                  <div className={styles.factItem}>
                    <span className={styles.factLabel}>API 对接</span>
                    <span className={styles.factValue}>{selectedOrder.apiTargets.join(" / ")}</span>
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardTitle}>设备配置</div>
                <div className={styles.factGrid}>
                  <div className={styles.factItem}>
                    <span className={styles.factLabel}>部署方式</span>
                    <span className={styles.factValue}>{selectedOrder.deviceConfig.mode}</span>
                  </div>
                  <div className={styles.factItem}>
                    <span className={styles.factLabel}>云端设备</span>
                    <span className={styles.factValue}>
                      {selectedOrder.deviceConfig.cloudNodeName}
                    </span>
                  </div>
                  <div className={styles.factItem}>
                    <span className={styles.factLabel}>本地设备</span>
                    <span className={styles.factValue}>
                      {selectedOrder.deviceConfig.localDeviceName}
                    </span>
                  </div>
                  <div className={styles.factItem}>
                    <span className={styles.factLabel}>设备配对码</span>
                    <span className={styles.factValue}>
                      {selectedOrder.deviceConfig.pairingCode}
                    </span>
                  </div>
                  <div className={styles.factItem}>
                    <span className={styles.factLabel}>OS 提供方</span>
                    <span className={styles.factValue}>{selectedOrder.deviceConfig.osOwner}</span>
                  </div>
                  <div className={styles.factItem}>
                    <span className={styles.factLabel}>地域</span>
                    <span className={styles.factValue}>{selectedOrder.deviceConfig.region}</span>
                  </div>
                </div>
              </section>
            </div>

            <section className={styles.card}>
              <div className={styles.cardTitle}>发货前检查</div>
              <div className={styles.checkList}>
                {selectedOrder.preflightChecks.map(item => (
                  <div key={item} className={styles.checkItem}>
                    <span className={styles.checkDot} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <Empty description="请选择交付工单" />
        )}
      </article>
    </div>
  );
};
