import type { JSX } from "react";

import type {
  FdeDeliveryOrderItem,
  FdeOrderItem,
  FdeOrderLineItem,
} from "@/feature/fde/types";

import {
  formatAmount,
  formatTokenCount,
  getStepKeyLabel,
  isAgentOrderLineItem,
  isDeviceOrderLineItem,
} from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryOrderInfoPanelProps {
  order: FdeOrderItem;
  deliveryOrder: FdeDeliveryOrderItem | null;
}

const renderOrderLineItems = (lineItems: FdeOrderLineItem[]): JSX.Element => {
  if (!lineItems.length) {
    return <div className={styles.emptyHint}>当前未添加任何商品。</div>;
  }

  return (
    <div className={styles.relatedOrderList}>
      {lineItems.map(item => (
        <div key={item.id} className={styles.relatedOrderCard}>
          <div className={styles.relatedOrderMain}>
            <div className={styles.relatedOrderTitleRow}>
              <span className={styles.relatedOrderTitle}>
                {isDeviceOrderLineItem(item)
                  ? item.deviceType
                  : isAgentOrderLineItem(item)
                    ? item.agentName
                    : "tokens 资源包"}
              </span>
              <span className={styles.deliveryTypeTag}>
                {isDeviceOrderLineItem(item)
                  ? "设备"
                  : isAgentOrderLineItem(item)
                    ? "AI 专家"
                    : "tokens"}
              </span>
            </div>
            <div className={styles.relatedOrderMeta}>
              {isDeviceOrderLineItem(item)
                ? `数量 ${item.quantity} / 单价 ${formatAmount(item.unitPrice)} / 小计 ${formatAmount(item.totalAmount)}`
                : isAgentOrderLineItem(item)
                  ? `${item.releaseVersion} · ${item.sourceLabel} · ${formatAmount(item.totalAmount)}`
                  : `${formatTokenCount(item.tokenCount)} · ${formatAmount(item.totalAmount)}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const renderFulfillmentItems = (order: FdeOrderItem): JSX.Element => {
  if (!order.fulfillmentItems.length) {
    return <div className={styles.emptyHint}>当前订单还没有履约任务。</div>;
  }

  return (
    <div className={styles.relatedOrderList}>
      {order.fulfillmentItems.map(item => (
        <div key={item.id} className={styles.relatedOrderCard}>
          <div className={styles.relatedOrderMain}>
            <div className={styles.relatedOrderTitleRow}>
              <span className={styles.relatedOrderTitle}>{item.type}</span>
              <span className={styles.deliveryTypeTag}>{item.status}</span>
            </div>
            <div className={styles.relatedOrderMeta}>{item.summary}</div>
            <div className={styles.relatedOrderMeta}>最近更新时间：{item.updatedAt}</div>
            {item.executionRecords.length ? (
              <div className={styles.deliveryList}>
                {item.executionRecords.map(record => (
                  <div key={record.id} className={styles.deliveryCard}>
                    <div className={styles.deliveryCardHeader}>
                      <div className={styles.deliveryCardHeading}>
                        <div className={styles.deliveryCardTitleRow}>
                          <div className={styles.deliveryCardTitle}>{record.actionLabel}</div>
                          <span className={styles.deliveryTypeTag}>{record.resultLabel}</span>
                        </div>
                        <div className={styles.deliveryHint}>
                          {record.operatorName} · {record.operatedAt}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * FDE 交付工作台中的订单信息面板。
 */
export const FdeDeliveryOrderInfoPanel = ({
  order,
  deliveryOrder,
}: FdeDeliveryOrderInfoPanelProps): JSX.Element => (
  <>
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>订单信息</div>
        <div className={styles.deliveryHint}>
          当前交付步骤直接使用订单内容，不再额外关联交付记录。
        </div>
      </div>
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
          <span className={styles.infoLabel}>租户名称</span>
          <span className={styles.infoValue}>{order.tenantName ?? "-"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>租户编码</span>
          <span className={styles.infoValue}>{order.tenantCode ?? "-"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>订单状态</span>
          <span className={styles.infoValue}>{order.status}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>交付状态</span>
          <span className={styles.infoValue}>
            {deliveryOrder
              ? `${deliveryOrder.deliveryStatus} · ${getStepKeyLabel(deliveryOrder.currentStep)}`
              : "待生成交付流程"}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>总金额</span>
          <span className={styles.infoValue}>{formatAmount(order.totalAmount)}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>创建时间</span>
          <span className={styles.infoValue}>{order.createdAt}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>订单备注</span>
          <span className={styles.infoValue}>{order.remark || "未填写"}</span>
        </div>
      </div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionTitle}>商品明细</div>
      {renderOrderLineItems(order.lineItems)}
    </section>

    <section className={styles.section}>
      <div className={styles.sectionTitle}>履约任务</div>
      {renderFulfillmentItems(order)}
    </section>
  </>
);
