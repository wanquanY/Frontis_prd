import { useMemo } from "react";

import { Empty } from "antd";
import classNames from "classnames";

import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import type {
  MockTenantPointsOrderItem,
  MockTenantSubscriptionOrderItem,
} from "@/feature/auth/types";
import type { OperationsTenant } from "@/feature/operations/types";
import { formatOperationsCurrency } from "@/feature/operations/serviceMeteringUtils";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

interface OperationsOrderCenterConsoleProps {
  tenants: OperationsTenant[];
}

type UnifiedOrderStatus = MockTenantPointsOrderItem["status"];
type UnifiedOrderType = "points" | "subscription";

interface UnifiedOperationsOrder {
  amount: number;
  createdAt: string;
  id: string;
  orderNo: string;
  paidAt?: string;
  paymentChannelLabel: string;
  purchaserName: string;
  status: UnifiedOrderStatus;
  subjectLabel: string;
  tenantName: string;
  type: UnifiedOrderType;
  typeLabel: string;
  detailLabel: string;
}

const ORDER_STATUS_LABELS: Record<UnifiedOrderStatus, string> = {
  paid: "已支付",
  pending: "待支付",
  expired: "已过期",
  closed: "已关闭",
};

const ORDER_STATUS_CLASS_NAMES: Record<UnifiedOrderStatus, string | undefined> = {
  paid: adminStyles.consoleStatusTagSuccess,
  pending: adminStyles.consoleStatusTagWarning,
  expired: adminStyles.consoleStatusTagDanger,
  closed: undefined,
};

const buildStatusClassName = (status: UnifiedOrderStatus): string =>
  classNames(adminStyles.consoleStatusTag, ORDER_STATUS_CLASS_NAMES[status]);

const getStatusLabel = (status: UnifiedOrderStatus): string => ORDER_STATUS_LABELS[status];

const buildPointsOrder = (
  tenantName: string,
  order: MockTenantPointsOrderItem,
): UnifiedOperationsOrder => ({
  amount: order.amount,
  createdAt: order.createdAt,
  detailLabel: `${order.packagePoints.toLocaleString("zh-CN")} 积分`,
  id: `points-${order.id}`,
  orderNo: order.orderNo,
  paidAt: order.paidAt,
  paymentChannelLabel: order.paymentChannelLabel,
  purchaserName: order.purchaserName,
  status: order.status,
  subjectLabel: order.packageTitle,
  tenantName,
  type: "points",
  typeLabel: "积分订单",
});

const buildSubscriptionOrder = (
  tenantName: string,
  order: MockTenantSubscriptionOrderItem,
): UnifiedOperationsOrder => ({
  amount: order.amount,
  createdAt: order.createdAt,
  detailLabel: `${order.seatCount} 席 · ${order.billingCycleLabel}`,
  id: `subscription-${order.id}`,
  orderNo: order.orderNo,
  paidAt: order.paidAt,
  paymentChannelLabel: order.paymentChannelLabel,
  purchaserName: order.purchaserName,
  status: order.status,
  subjectLabel: order.planTitle,
  tenantName,
  type: "subscription",
  typeLabel: "订阅订单",
});

const sortOrders = (orders: UnifiedOperationsOrder[]): UnifiedOperationsOrder[] =>
  [...orders].sort((leftItem, rightItem) =>
    (rightItem.paidAt ?? rightItem.createdAt).localeCompare(leftItem.paidAt ?? leftItem.createdAt),
  );

/**
 * 运营后台统一订单中心，只展示积分订单和订阅订单列表。
 */
export const OperationsOrderCenterConsole = ({
  tenants,
}: OperationsOrderCenterConsoleProps): JSX.Element => {
  const orders = useMemo<UnifiedOperationsOrder[]>(
    () =>
      sortOrders(
        tenants.flatMap(tenant => {
          const snapshot = getMockTenantManagementSnapshot(tenant.id);

          if (!snapshot) {
            return [];
          }

          return [
            ...snapshot.pointsOrders.map(order => buildPointsOrder(tenant.name, order)),
            ...snapshot.subscriptionOrders.map(order => buildSubscriptionOrder(tenant.name, order)),
          ];
        }),
      ),
    [tenants],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>订单中心</h1>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleSectionHeader}>
          <h2 className={adminStyles.consoleSectionTitle}>订单列表</h2>
        </div>
        {orders.length ? (
          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>订单类型</th>
                  <th>租户</th>
                  <th>订单内容</th>
                  <th>数量 / 周期</th>
                  <th>支付金额</th>
                  <th>支付方式</th>
                  <th>购买人</th>
                  <th>状态</th>
                  <th>下单时间</th>
                  <th>支付时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className={adminStyles.consoleHtmlTableStrong}>{order.orderNo}</td>
                    <td>
                      <span className={adminStyles.consolePill}>{order.typeLabel}</span>
                    </td>
                    <td>{order.tenantName}</td>
                    <td>{order.subjectLabel}</td>
                    <td>{order.detailLabel}</td>
                    <td>{formatOperationsCurrency(order.amount)}</td>
                    <td>{order.paymentChannelLabel}</td>
                    <td>{order.purchaserName}</td>
                    <td>
                      <span className={buildStatusClassName(order.status)}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td>{order.createdAt}</td>
                    <td>{order.paidAt ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty description="暂无订单。" />
        )}
      </section>
    </div>
  );
};
