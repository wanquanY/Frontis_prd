import type { JSX, ReactNode } from "react";

import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
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
  getOrderSummaryLabel,
  getStepKeyLabel,
  getStepStatusLabel,
  getVisibleDeliverySteps,
} from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryWorkbenchDetailViewProps {
  selectedTenantOrder: FdeDeliveryOrderItem;
  selectedDeliveryOrder: FdeDeliveryOrderItem | null;
  tenantBusinessOrders: FdeOrderItem[];
  tenantDeliveryRecords: FdeDeliveryOrderItem[];
  activeBusinessOrder: FdeOrderItem | null;
  selectedDetailTab: DeliveryDetailTabKey;
  onBackToList: () => void;
  onEnterDetail: (orderId: string) => void;
  onOpenCreateBusinessOrderModal: () => void;
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
 * FDE 配置交付详情壳子，负责承载租户下订单侧栏和步骤导航。
 */
export const FdeDeliveryWorkbenchDetailView = ({
  selectedTenantOrder,
  selectedDeliveryOrder,
  tenantBusinessOrders,
  tenantDeliveryRecords,
  activeBusinessOrder,
  selectedDetailTab,
  onBackToList,
  onEnterDetail,
  onOpenCreateBusinessOrderModal,
  onSelectDetailTab,
  children,
}: FdeDeliveryWorkbenchDetailViewProps): JSX.Element => (
  <div className={styles.detailView}>
    <div className={styles.pageBar}>
      <div className={styles.titleGroup}>
        <Button
          type="text"
          className={styles.backButton}
          icon={<ArrowLeftOutlined />}
          onClick={onBackToList}
        >
          返回交付列表
        </Button>
        <h2 className={styles.pageTitle}>{selectedTenantOrder.tenantName}</h2>
      </div>
    </div>

    <div className={styles.detailShell}>
      <aside className={styles.recordSidebar}>
        <div className={styles.recordSidebarHeader}>
          <div>
            <div className={styles.sectionTitle}>订单列表</div>
            <div className={styles.deliveryHint}>
              {selectedTenantOrder.tenantName} 当前共有 {tenantBusinessOrders.length} 笔订单
            </div>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onOpenCreateBusinessOrderModal}
          >
            新建订单
          </Button>
        </div>
        <div className={styles.recordSidebarList}>
          {tenantBusinessOrders.length ? (
            tenantBusinessOrders.map(item => {
              const linkedDeliveryOrder = getLinkedDeliveryOrder(item, tenantDeliveryRecords);

              return (
                <button
                  key={item.id}
                  type="button"
                  className={classNames(
                    styles.recordSidebarItem,
                    item.id === activeBusinessOrder?.id && styles.recordSidebarItemActive,
                  )}
                  onClick={() => onEnterDetail(item.id)}
                >
                  <div className={styles.tenantRecordTitleRow}>
                    <span className={styles.tenantRecordTitle}>{item.orderNo}</span>
                    <span className={styles.deliveryTypeTag}>{item.status}</span>
                  </div>
                  <div className={styles.tenantRecordMeta}>{getOrderSummaryLabel(item)}</div>
                  <div className={styles.tenantRecordMeta}>
                    ¥ {item.totalAmount.toLocaleString("zh-CN")} · {item.createdAt}
                  </div>
                  <div className={styles.tenantRecordMeta}>
                    当前步骤：
                    {linkedDeliveryOrder ? getStepKeyLabel(linkedDeliveryOrder.currentStep) : "待开始"}
                  </div>
                </button>
              );
            })
          ) : (
            <div className={styles.emptyHint}>当前租户还没有订单</div>
          )}
        </div>
      </aside>

      <div className={styles.recordMain}>
        <div className={styles.recordMainHeader}>
          <div className={styles.sectionTitle}>交付操作</div>
          <div className={styles.deliveryHint}>
            {activeBusinessOrder
              ? selectedDeliveryOrder
                ? "当前按订单推进交付配置，订单里的设备与 AI 专家会预填到对应步骤，完成状态需要手动更新。"
                : "当前订单不包含需要人工交付的设备或 AI 专家，可先查看订单信息。"
              : "当前租户还没有订单，请先在左侧创建订单后再开始交付。"}
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
);
