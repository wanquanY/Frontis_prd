import type { JSX } from "react";

import { Modal } from "antd";

import type { FdeDeliveryOrderItem, FdeOrderItem, FdeOrderLineItem } from "@/feature/fde/types";

import {
  formatAmount,
  formatTokenCount,
  formatValidityLabel,
  isAgentOrderLineItem,
  isDeviceOrderLineItem,
  type OrderPreviewFieldItem,
} from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryOrderPreviewModalProps {
  order: FdeOrderItem | null;
  linkedTenant: FdeDeliveryOrderItem | null;
  onClose: () => void;
}

const buildPreviewFields = (order: FdeOrderItem): OrderPreviewFieldItem[] => [
  { label: "订单编号", value: order.orderNo },
  { label: "客户名称", value: order.customerName },
  { label: "订单类型", value: order.businessType ?? "新购" },
  { label: "订单状态", value: order.status },
  { label: "总金额", value: formatAmount(order.totalAmount) },
  { label: "创建时间", value: order.createdAt },
  { label: "订单备注", value: order.remark || "未填写" },
];

const renderOrderLineItems = (lineItems: FdeOrderLineItem[]): JSX.Element => (
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
              资产ID：{item.deliveredAssetIds.join("、")} · 到期时间：{item.expiresAt ?? "待交付后生成"}
            </div>
          ) : null}
        </div>
      </div>
    ))}
  </div>
);

/**
 * FDE 订单预览弹窗。
 */
export const FdeDeliveryOrderPreviewModal = ({
  order,
  linkedTenant,
  onClose,
}: FdeDeliveryOrderPreviewModalProps): JSX.Element => (
  <Modal
    title="订单信息"
    open={Boolean(order)}
    width={760}
    rootClassName={styles.orderPreviewModal}
    onCancel={onClose}
    footer={null}
    destroyOnClose
  >
    {order ? (
      <div className={styles.orderPreviewBody}>
        <div className={styles.infoRows}>
          {buildPreviewFields(order).map(item => (
            <div key={item.label} className={styles.infoRow}>
              <span className={styles.infoLabel}>{item.label}</span>
              <span className={styles.infoValue}>{item.value}</span>
            </div>
          ))}
        </div>
        <div className={styles.subSection}>
          <div className={styles.subSectionTitle}>关联租户</div>
          <div className={styles.infoRows}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>租户名称</span>
              <span className={styles.infoValue}>{order.tenantName ?? "未关联"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>租户编码</span>
              <span className={styles.infoValue}>{order.tenantCode ?? "未关联"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>交付状态</span>
              <span className={styles.infoValue}>{linkedTenant?.deliveryStatus ?? "未关联"}</span>
            </div>
          </div>
        </div>
        <div className={styles.subSection}>
          <div className={styles.subSectionTitle}>商品明细</div>
          {renderOrderLineItems(order.lineItems)}
        </div>
        <div className={styles.subSection}>
          <div className={styles.subSectionTitle}>履约任务</div>
          {order.fulfillmentItems.length ? (
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
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyHint}>当前订单还没有履约任务</div>
          )}
        </div>
      </div>
    ) : null}
  </Modal>
);
