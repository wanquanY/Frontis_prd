import type { JSX } from "react";

import classNames from "classnames";
import { Input, Select } from "antd";

import type { FdeDeliveryOrderItem, FdeOrderItem } from "@/feature/fde/types";

import {
  type DeliveryStatusFilter,
  getOrderCurrentStepLabel,
  getOrderDeliveryStatus,
  getOrderSummaryLabel,
} from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryWorkbenchListViewProps {
  items: FdeOrderItem[];
  deliveryItems: FdeDeliveryOrderItem[];
  searchKeyword: string;
  deliveryStatusFilter: DeliveryStatusFilter;
  setSearchKeyword: (value: string) => void;
  setDeliveryStatusFilter: (value: DeliveryStatusFilter) => void;
  onEnterDetail: (orderId: string) => void;
}

/**
 * FDE 交付工作台订单列表视图。
 */
export const FdeDeliveryWorkbenchListView = ({
  items,
  deliveryItems,
  searchKeyword,
  deliveryStatusFilter,
  setSearchKeyword,
  setDeliveryStatusFilter,
  onEnterDetail,
}: FdeDeliveryWorkbenchListViewProps): JSX.Element => (
  <div className={styles.layout}>
    <div className={styles.listFilters}>
      <Input
        value={searchKeyword}
        className={styles.searchInput}
        placeholder="搜索订单编号、客户名称、租户名称或租户编码"
        onChange={event => setSearchKeyword(event.target.value)}
      />
      <Select<DeliveryStatusFilter>
        value={deliveryStatusFilter}
        className={styles.filterSelect}
        options={[
          { label: "全部状态", value: "all" },
          { label: "待配置", value: "待配置" },
          { label: "配置中", value: "配置中" },
          { label: "已交付", value: "已交付" },
        ]}
        onChange={value => setDeliveryStatusFilter(value)}
      />
    </div>

    <div className={styles.listTable}>
      <div className={styles.listHeader}>
        <span>订单编号</span>
        <span>客户名称</span>
        <span>租户名称</span>
        <span>商品摘要</span>
        <span>交付状态</span>
        <span>当前步骤</span>
        <span>操作</span>
      </div>
      {items.length ? (
        items.map(item => (
          <button
            key={item.id}
            type="button"
            className={styles.listRow}
            onClick={() => onEnterDetail(item.id)}
          >
            <span>{item.orderNo}</span>
            <span className={styles.tableStrong}>{item.customerName}</span>
            <span>{item.tenantName ?? "-"}</span>
            <span>{getOrderSummaryLabel(item)}</span>
            <span
              className={classNames(
                styles.listStatus,
                getOrderDeliveryStatus(item, deliveryItems) === "已交付" &&
                  styles.listStatusDelivered,
              )}
            >
              {getOrderDeliveryStatus(item, deliveryItems)}
            </span>
            <span>{getOrderCurrentStepLabel(item, deliveryItems)}</span>
            <span className={styles.listAction}>进入配置交付</span>
          </button>
        ))
      ) : (
        <div className={styles.listEmpty}>当前筛选条件下暂无订单</div>
      )}
    </div>
  </div>
);
