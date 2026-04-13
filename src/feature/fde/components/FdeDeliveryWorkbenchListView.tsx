import type { JSX } from "react";

import { Input, Select } from "antd";

import type { FdeDeliveryOrderItem } from "@/feature/fde/types";

import { type DeliveryStatusFilter } from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryTenantSummaryItem {
  deliveredOrders: number;
  latestUpdatedAt: string;
  pendingOrders: number;
  processingOrders: number;
  totalOrders: number;
}

interface FdeDeliveryWorkbenchListViewProps {
  items: FdeDeliveryOrderItem[];
  summaryMap: Record<string, FdeDeliveryTenantSummaryItem>;
  searchKeyword: string;
  deliveryStatusFilter: DeliveryStatusFilter;
  setSearchKeyword: (value: string) => void;
  setDeliveryStatusFilter: (value: DeliveryStatusFilter) => void;
  onEnterDetail: (orderId: string) => void;
}

const getTenantDisplayName = (item: FdeDeliveryOrderItem): string =>
  item.tenantName?.trim() || item.customerName;

/**
 * FDE 配置交付一级列表视图，按租户交付单展示。
 */
export const FdeDeliveryWorkbenchListView = ({
  items,
  summaryMap,
  searchKeyword,
  deliveryStatusFilter,
  setSearchKeyword,
  setDeliveryStatusFilter,
  onEnterDetail,
}: FdeDeliveryWorkbenchListViewProps): JSX.Element => {
  return (
    <>
      <div className={styles.listFilters}>
        <Input
          value={searchKeyword}
          className={styles.searchInput}
          placeholder="搜索租户名称或租户编码"
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
          <span>租户名称</span>
          <span>订单概况</span>
          <span>交付概况</span>
          <span>最近更新</span>
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
              <span className={styles.tableStrong}>{getTenantDisplayName(item)}</span>
              <span>
                {summaryMap[item.id]?.totalOrders
                  ? `共 ${summaryMap[item.id].totalOrders} 单`
                  : "暂无订单"}
              </span>
              <span className={styles.deliveryOverview}>
                <span className={styles.deliveryOverviewItem}>
                  已交付 {summaryMap[item.id]?.deliveredOrders ?? 0}
                </span>
              </span>
              <span>{summaryMap[item.id]?.latestUpdatedAt ?? "-"}</span>
              <span className={styles.listAction}>进入租户</span>
            </button>
          ))
        ) : (
          <div className={styles.listEmpty}>当前筛选条件下暂无租户</div>
        )}
      </div>
    </>
  );
};
