import type { JSX } from "react";

import { Button } from "antd";

import type {
  FdeDeliveryOrderItem,
  FdeOrderFulfillmentItem,
  FdeOrderItem,
  FdeOrderLineItem,
} from "@/feature/fde/types";

import {
  formatAmount,
  formatTokenCount,
  formatValidityLabel,
  getOrderSummaryLabel,
  isAgentOrderLineItem,
  isDeviceOrderLineItem,
} from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryOrderInfoPanelProps {
  order: FdeOrderItem | null;
  deliveryOrder: FdeDeliveryOrderItem | null;
  onOpenPreviewOrder: (orderId: string) => void;
}

const renderOrderLineItems = (lineItems: FdeOrderLineItem[]): JSX.Element => {
  if (!lineItems.length) {
    return <div className={styles.emptyHint}>当前订单未配置商品明细。</div>;
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
                ? `数量 ${item.quantity} / 单价 ${formatAmount(item.unitPrice)} / 小计 ${formatAmount(item.totalAmount)} / 有效时长 ${formatValidityLabel(item.validityMonths)}`
                : isAgentOrderLineItem(item)
                  ? `${item.releaseVersion} · ${item.sourceLabel} · ${formatAmount(item.totalAmount)} · 有效时长 ${formatValidityLabel(item.validityMonths)}`
                  : `${formatTokenCount(item.tokenCount)} · ${formatAmount(item.totalAmount)}`}
            </div>
            {(isDeviceOrderLineItem(item) || isAgentOrderLineItem(item)) &&
            item.deliveredAssetIds?.length ? (
              <div className={styles.relatedOrderMeta}>
                资产ID：{item.deliveredAssetIds.join("、")} · 到期时间：
                {item.expiresAt ?? "待交付后生成"}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

const renderFulfillmentItems = (items: FdeOrderFulfillmentItem[]): JSX.Element => {
  if (!items.length) {
    return <div className={styles.emptyHint}>当前订单还没有履约任务。</div>;
  }

  return (
    <div className={styles.relatedOrderList}>
      {items.map(item => (
        <div key={item.id} className={styles.relatedOrderCard}>
          <div className={styles.relatedOrderMain}>
            <div className={styles.relatedOrderTitleRow}>
              <span className={styles.relatedOrderTitle}>{item.type}</span>
              <span className={styles.deliveryTypeTag}>{item.status}</span>
            </div>
            <div className={styles.relatedOrderMeta}>{item.summary}</div>
            <div className={styles.relatedOrderMeta}>最近更新时间：{item.updatedAt}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * FDE 配置交付中的订单信息面板。
 */
export const FdeDeliveryOrderInfoPanel = ({
  order,
  deliveryOrder,
  onOpenPreviewOrder,
}: FdeDeliveryOrderInfoPanelProps): JSX.Element => {
  if (!order) {
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>订单信息</div>
          <div className={styles.deliveryHint}>当前租户还没有绑定订单</div>
        </div>
        <div className={styles.emptyHint}>可先在左侧点击“新建订单”，再按订单推进交付配置。</div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>订单信息</div>
        <div className={styles.deliveryHint}>
          当前按订单推进交付，配置动作会同步到该订单对应的交付流程。
        </div>
      </div>
      <div className={styles.infoRows}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>订单编号</span>
          <span className={styles.infoValue}>{order.orderNo}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>订单类型</span>
          <span className={styles.infoValue}>{order.businessType ?? "新购"}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>订单状态</span>
          <span className={styles.infoValue}>{order.status}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>商品摘要</span>
          <span className={styles.infoValue}>{getOrderSummaryLabel(order)}</span>
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
          <span className={styles.infoLabel}>关联交付</span>
          <span className={styles.infoValue}>
            {deliveryOrder
              ? `${deliveryOrder.orderKind === "initial" ? "首期交付" : deliveryOrder.changeType ?? "交付变更"} · ${deliveryOrder.deliveryStatus}`
              : "当前订单不涉及人工交付"}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>订单备注</span>
          <span className={styles.infoValue}>{order.remark || "未填写"}</span>
        </div>
      </div>
      <div className={styles.subSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.subSectionTitle}>商品明细</div>
          <Button onClick={() => onOpenPreviewOrder(order.id)}>查看完整订单</Button>
        </div>
        {renderOrderLineItems(order.lineItems)}
      </div>
      <div className={styles.subSection}>
        <div className={styles.subSectionTitle}>履约任务</div>
        {renderFulfillmentItems(order.fulfillmentItems)}
      </div>
    </section>
  );
};
