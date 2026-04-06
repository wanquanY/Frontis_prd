import type { JSX, ReactNode } from "react";

import { ArrowLeftOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { Button } from "antd";

import type {
  FdeDeliveryOrderItem,
  FdeDeliveryStepKey,
  FdeOrderItem,
} from "@/feature/fde/types";

import {
  type DeliveryDetailTabKey,
  getLinkedDeliveryOrder,
  getStepKeyLabel,
  getStepStatusLabel,
  getVisibleDeliverySteps,
} from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryWorkbenchDetailViewProps {
  orders: FdeOrderItem[];
  deliveryItems: FdeDeliveryOrderItem[];
  selectedBusinessOrder: FdeOrderItem;
  selectedDeliveryOrder: FdeDeliveryOrderItem | null;
  selectedDetailTab: DeliveryDetailTabKey;
  onBackToList: () => void;
  onEnterDetail: (orderId: string) => void;
  onSelectDetailTab: (tab: DeliveryDetailTabKey) => void;
  children: ReactNode;
}

const getStepStatusClassName = (
  status: "已完成" | "已跳过" | "进行中" | "待处理",
): string => {
  if (status === "已完成") {
    return styles.stepStatusDone;
  }

  if (status === "已跳过") {
    return styles.stepStatusSkipped;
  }

  if (status === "进行中") {
    return styles.stepStatusActive;
  }

  return styles.stepStatusPending;
};

const renderStepButton = (
  stepKey: FdeDeliveryStepKey,
  label: string,
  stepStatus: "已完成" | "已跳过" | "进行中" | "待处理",
  selectedDetailTab: DeliveryDetailTabKey,
  onSelectDetailTab: (tab: DeliveryDetailTabKey) => void,
): JSX.Element => (
  <button
    key={stepKey}
    type="button"
    className={classNames(
      styles.stepButton,
      stepKey === selectedDetailTab && styles.stepButtonActive,
    )}
    onClick={() => onSelectDetailTab(stepKey)}
  >
    <span>{label}</span>
    <span className={classNames(styles.stepStatus, getStepStatusClassName(stepStatus))}>
      {stepStatus}
    </span>
  </button>
);

/**
 * FDE 交付工作台详情页壳子。
 */
export const FdeDeliveryWorkbenchDetailView = ({
  orders,
  deliveryItems,
  selectedBusinessOrder,
  selectedDeliveryOrder,
  selectedDetailTab,
  onBackToList,
  onEnterDetail,
  onSelectDetailTab,
  children,
}: FdeDeliveryWorkbenchDetailViewProps): JSX.Element => (
  <div className={styles.layout}>
    <div className={styles.detailView}>
      <div className={styles.pageBar}>
        <div className={styles.titleGroup}>
          <Button
            type="text"
            className={styles.backButton}
            icon={<ArrowLeftOutlined />}
            onClick={onBackToList}
          >
            返回订单列表
          </Button>
          <h2 className={styles.pageTitle}>{selectedBusinessOrder.customerName}</h2>
        </div>
      </div>

      <div className={styles.detailShell}>
        <aside className={styles.recordSidebar}>
          <div className={styles.recordSidebarHeader}>
            <div>
              <div className={styles.sectionTitle}>订单列表</div>
              <div className={styles.deliveryHint}>按订单逐笔推进交付</div>
            </div>
          </div>
          <div className={styles.recordSidebarList}>
            {orders.map(item => {
              const deliveryOrder = getLinkedDeliveryOrder(item, deliveryItems);

              return (
                <button
                  key={item.id}
                  type="button"
                  className={classNames(
                    styles.recordSidebarItem,
                    item.id === selectedBusinessOrder.id && styles.recordSidebarItemActive,
                  )}
                  onClick={() => onEnterDetail(item.id)}
                >
                  <div className={styles.tenantRecordTitleRow}>
                    <span className={styles.tenantRecordTitle}>{item.orderNo}</span>
                    <span className={styles.deliveryTypeTag}>
                      {deliveryOrder?.deliveryStatus ?? "待配置"}
                    </span>
                  </div>
                  <div className={styles.tenantRecordMeta}>{item.customerName}</div>
                  <div className={styles.tenantRecordMeta}>{item.tenantName ?? "-"}</div>
                  <div className={styles.tenantRecordMeta}>
                    当前步骤：
                    {deliveryOrder ? getStepKeyLabel(deliveryOrder.currentStep) : "待开始"}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className={styles.recordMain}>
          <div className={styles.recordMainHeader}>
            <div className={styles.sectionTitle}>交付操作</div>
            <div className={styles.deliveryHint}>
              当前按订单推进交付步骤，订单信息直接作为交付输入。
            </div>
          </div>

          <div className={styles.stepNav}>
            <button
              type="button"
              className={classNames(
                styles.stepButton,
                selectedDetailTab === "orderInfo" && styles.stepButtonActive,
              )}
              onClick={() => onSelectDetailTab("orderInfo")}
            >
              <span>订单信息</span>
            </button>
            {selectedDeliveryOrder
              ? getVisibleDeliverySteps(selectedDeliveryOrder).map(step =>
                  renderStepButton(
                    step.key,
                    step.label,
                    getStepStatusLabel(selectedDeliveryOrder, step.key),
                    selectedDetailTab,
                    onSelectDetailTab,
                  ),
                )
              : null}
          </div>

          <div className={styles.recordMainBody}>{children}</div>
        </div>
      </div>
    </div>
  </div>
);
