import { useMemo } from "react";

import classNames from "classnames";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import type {
  MockTenantManagementSnapshot,
  MockTenantPointsOrderItem,
  MockTenantSubscriptionOrderItem,
} from "@/feature/auth/types";
import {
  formatMockPointsOrderBenefit,
  formatMockSubscriptionOrderBenefit,
} from "@/feature/auth/mockOrderDisplay";

import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./TenantPointsView.module.less";

interface TenantPointsViewProps {
  tenantSnapshot: MockTenantManagementSnapshot;
}

type TenantOrderRecordStatus = MockTenantPointsOrderItem["status"];

interface TenantOrderRecordItem {
  amount: number;
  benefitLabel: string;
  createdAt: string;
  id: string;
  orderNo: string;
  paidAt?: string;
  purchaserName: string;
  sortTime: number;
  status: TenantOrderRecordStatus;
  subjectLabel: string;
  typeLabel: string;
}

const ORDER_STATUS_LABELS: Record<TenantOrderRecordStatus, string> = {
  paid: "已支付",
  pending: "待支付",
  expired: "已过期",
  closed: "已关闭",
};

const ORDER_STATUS_CLASS_NAMES: Record<TenantOrderRecordStatus, string | undefined> = {
  paid: adminStyles.consoleStatusTagSuccess,
  pending: adminStyles.consoleStatusTagWarning,
  expired: adminStyles.consoleStatusTagDanger,
  closed: undefined,
};

const MOCK_TODAY = dayjs("2026-04-24 12:00");

const parseMockOccurredAt = (occurredAt: string): Dayjs => {
  const normalizedValue = occurredAt.trim();
  const timeMatch = normalizedValue.match(/(\d{1,2}):(\d{2})/);
  const hour = timeMatch ? Number(timeMatch[1]) : 0;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;

  if (normalizedValue.startsWith("今天")) {
    return MOCK_TODAY.hour(hour).minute(minute).second(0);
  }

  if (normalizedValue.startsWith("昨天")) {
    return MOCK_TODAY.subtract(1, "day").hour(hour).minute(minute).second(0);
  }

  const currentMonthDateMatch = normalizedValue.match(/本月\s*(\d{1,2})\s*日?/);

  if (currentMonthDateMatch) {
    return MOCK_TODAY.date(Number(currentMonthDateMatch[1])).hour(hour).minute(minute).second(0);
  }

  const fullDateMatch = normalizedValue.match(/(\d{4})-(\d{2})-(\d{2})/);

  if (fullDateMatch) {
    return dayjs(`${fullDateMatch[1]}-${fullDateMatch[2]}-${fullDateMatch[3]}`)
      .hour(hour)
      .minute(minute)
      .second(0);
  }

  const monthDateMatch = normalizedValue.match(/(\d{1,2})月\s*(\d{1,2})/);

  if (monthDateMatch) {
    return dayjs(`2026-${monthDateMatch[1].padStart(2, "0")}-${monthDateMatch[2].padStart(2, "0")}`)
      .hour(hour)
      .minute(minute)
      .second(0);
  }

  return MOCK_TODAY;
};

const formatCurrency = (value: number): string =>
  `¥${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getOrderSortTime = (order: Pick<TenantOrderRecordItem, "createdAt" | "paidAt">): number =>
  parseMockOccurredAt(order.paidAt ?? order.createdAt).valueOf();

const isOfflineOrderLabel = (value?: string): boolean => value === "线下订单";

const buildPointsOrder = (order: MockTenantPointsOrderItem): TenantOrderRecordItem => ({
  amount: order.amount,
  benefitLabel: formatMockPointsOrderBenefit(order),
  createdAt: order.createdAt,
  id: `points-${order.id}`,
  orderNo: order.orderNo,
  paidAt: order.paidAt,
  purchaserName: order.purchaserName,
  sortTime: getOrderSortTime(order),
  status: order.status,
  subjectLabel: order.packageTitle,
  typeLabel: isOfflineOrderLabel(order.paymentChannelLabel) ? "线下订单" : "积分订单",
});

const buildSubscriptionOrder = (order: MockTenantSubscriptionOrderItem): TenantOrderRecordItem => ({
  amount: order.amount,
  benefitLabel: formatMockSubscriptionOrderBenefit(order),
  createdAt: order.createdAt,
  id: `subscription-${order.id}`,
  orderNo: order.orderNo,
  paidAt: order.paidAt,
  purchaserName: order.purchaserName,
  sortTime: getOrderSortTime(order),
  status: order.status,
  subjectLabel: order.planTitle,
  typeLabel:
    isOfflineOrderLabel(order.orderSourceLabel) || isOfflineOrderLabel(order.paymentChannelLabel)
      ? "线下订单"
      : "订阅订单",
});

const sortOrderRecordItems = (orders: TenantOrderRecordItem[]): TenantOrderRecordItem[] =>
  [...orders].sort(
    (leftOrder, rightOrder) =>
      rightOrder.sortTime - leftOrder.sortTime ||
      rightOrder.orderNo.localeCompare(leftOrder.orderNo),
  );

const renderOrderStatusTag = (status: TenantOrderRecordStatus): JSX.Element => (
  <span className={classNames(adminStyles.consoleStatusTag, ORDER_STATUS_CLASS_NAMES[status])}>
    {ORDER_STATUS_LABELS[status]}
  </span>
);

/**
 * 租户订单记录视图，展示积分包和团队席位购买订单。
 */
export const TenantPointsView = ({ tenantSnapshot }: TenantPointsViewProps): JSX.Element => {
  const orderRecordItems = useMemo(
    () =>
      sortOrderRecordItems([
        ...tenantSnapshot.pointsOrders.map(buildPointsOrder),
        ...tenantSnapshot.subscriptionOrders.map(buildSubscriptionOrder),
      ]),
    [tenantSnapshot.pointsOrders, tenantSnapshot.subscriptionOrders],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>订单记录</h1>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleHtmlTableWrap}>
          <table className={adminStyles.consoleHtmlTable}>
            <thead>
              <tr>
                <th>订单号</th>
                <th>订单类型</th>
                <th>订单内容</th>
                <th>权益明细</th>
                <th>支付金额</th>
                <th>状态</th>
                <th>购买人</th>
                <th>下单时间</th>
                <th>支付时间</th>
              </tr>
            </thead>
            <tbody>
              {orderRecordItems.length ? (
                orderRecordItems.map(order => (
                  <tr key={order.id}>
                    <td className={adminStyles.consoleHtmlTableStrong}>{order.orderNo}</td>
                    <td>
                      <span className={adminStyles.consolePill}>{order.typeLabel}</span>
                    </td>
                    <td>{order.subjectLabel}</td>
                    <td>{order.benefitLabel}</td>
                    <td>{formatCurrency(order.amount)}</td>
                    <td>{renderOrderStatusTag(order.status)}</td>
                    <td>{order.purchaserName}</td>
                    <td>{order.createdAt}</td>
                    <td>{order.paidAt ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className={styles.emptyCell}>
                    当前暂无订单记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
