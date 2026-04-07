import type { JSX } from "react";

import classNames from "classnames";
import { Input, Select } from "antd";

import type { FdeDeliveryOrderItem } from "@/feature/fde/types";

import { type DeliveryStatusFilter, getStepKeyLabel } from "./fdeDeliveryWorkbenchUtils";
import styles from "./FdeDeliveryWorkbench.module.less";

interface FdeDeliveryWorkbenchListViewProps {
  items: FdeDeliveryOrderItem[];
  searchKeyword: string;
  deliveryStatusFilter: DeliveryStatusFilter;
  setSearchKeyword: (value: string) => void;
  setDeliveryStatusFilter: (value: DeliveryStatusFilter) => void;
  onEnterDetail: (orderId: string) => void;
}

/**
 * FDE 配置交付一级列表视图，按租户交付单展示。
 */
export const FdeDeliveryWorkbenchListView = ({
  items,
  searchKeyword,
  deliveryStatusFilter,
  setSearchKeyword,
  setDeliveryStatusFilter,
  onEnterDetail,
}: FdeDeliveryWorkbenchListViewProps): JSX.Element => (
  <>
    <div className={styles.listFilters}>
      <Input
        value={searchKeyword}
        className={styles.searchInput}
        placeholder="搜索客户名称、租户名称、租户编码或交付场景"
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
        <span>客户名称</span>
        <span>租户名称</span>
        <span>交付场景</span>
        <span>交付状态</span>
        <span>交付时间</span>
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
            <span className={styles.tableStrong}>{item.customerName}</span>
            <span>{item.tenantName}</span>
            <span>{item.scenarioName}</span>
            <span
              className={classNames(
                styles.listStatus,
                item.deliveryStatus === "已交付" && styles.listStatusDelivered,
              )}
            >
              {item.deliveryStatus}
            </span>
            <span>{item.launchTargetDate}</span>
            <span>{getStepKeyLabel(item.currentStep)}</span>
            <span className={styles.listAction}>进入配置交付</span>
          </button>
        ))
      ) : (
        <div className={styles.listEmpty}>当前筛选条件下暂无交付单</div>
      )}
    </div>
  </>
);
