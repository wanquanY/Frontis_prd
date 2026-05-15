import { useMemo, useState } from "react";

import { Button } from "antd";
import classNames from "classnames";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import type {
  MockTenantManagementSnapshot,
  MockTenantPointsLedgerItem,
  MockTenantPointsOrderItem,
  MockTenantSubscriptionOrderItem,
} from "@/feature/auth/types";

import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./TenantPointsView.module.less";

interface TenantPointsViewProps {
  onOpenRecharge?: () => void;
  tenantSnapshot: MockTenantManagementSnapshot;
}

type OrderRecordTabKey = "ledger" | "orders";
type PointsRangeKey = "week" | "month" | "all";
type PointsLedgerDirectionFilter = "all" | "income" | "expense";
type TenantOrderRecordStatus = MockTenantPointsOrderItem["status"];

interface TenantOrderRecordItem {
  amount: number;
  createdAt: string;
  detailLabel: string;
  id: string;
  orderNo: string;
  paidAt?: string;
  paymentChannelLabel: string;
  purchaserName: string;
  sortTime: number;
  status: TenantOrderRecordStatus;
  subjectLabel: string;
  typeLabel: string;
}

const ORDER_RECORD_TAB_OPTIONS: Array<{ key: OrderRecordTabKey; label: string }> = [
  { key: "ledger", label: "积分流水" },
  { key: "orders", label: "购买记录" },
];

const POINTS_RANGE_OPTIONS: Array<{ key: PointsRangeKey; label: string }> = [
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
  { key: "all", label: "全部" },
];

const POINTS_LEDGER_DIRECTION_OPTIONS: Array<{
  key: PointsLedgerDirectionFilter;
  label: string;
}> = [
  { key: "all", label: "全部" },
  { key: "income", label: "增加" },
  { key: "expense", label: "消耗" },
];

const POINTS_LEDGER_SOURCE_LABEL_MAP: Record<string, string> = {
  "MetaAgent 协作消耗": "ME 调用",
  "MetaAgent 调度消耗": "ME 调用",
  MetaAgent协作消耗: "ME 调用",
  MetaAgent调度消耗: "ME 调用",
  管理后台配置消耗: "ME 调用",
  管理员充值: "购买标准积分包",
  运营配置积分: "购买标准积分包",
  集团积分包到账: "购买标准积分包",
  注册赠送: "注册送积分",
  试点赠送积分: "购买标准积分包",
};

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

const isLedgerRecordInRange = (
  record: MockTenantPointsLedgerItem,
  rangeKey: PointsRangeKey,
): boolean => {
  if (rangeKey === "all") {
    return true;
  }

  const occurredAt = parseMockOccurredAt(record.createdAt);

  if (rangeKey === "month") {
    return occurredAt.isSame(MOCK_TODAY, "month");
  }

  return occurredAt.isSame(MOCK_TODAY, "week") || occurredAt.isSame(MOCK_TODAY, "day");
};

const renderLedgerDirectionTag = (record: MockTenantPointsLedgerItem): JSX.Element => {
  const isIncome = record.direction === "income";

  return (
    <span
      className={`${adminStyles.consoleStatusTag} ${
        isIncome ? adminStyles.consoleStatusTagSuccess : adminStyles.consoleStatusTagDanger
      }`}
    >
      {isIncome ? "增加" : "消耗"}
    </span>
  );
};

const getLegacyAgentLedgerSourceLabel = (record: MockTenantPointsLedgerItem): string | null => {
  if (!record.title.includes("AI 专家") && !record.title.includes("AI专家")) {
    return null;
  }

  const callMatch = record.description.match(/调用(.+?)(生成|运行|。)/);
  if (callMatch?.[1]) {
    return callMatch[1].trim();
  }

  const experienceMatch = record.description.match(/体验(.+?)(的本次|。)/);
  if (experienceMatch?.[1]) {
    return experienceMatch[1].trim();
  }

  return null;
};

const getLedgerSourceLabel = (record: MockTenantPointsLedgerItem): string =>
  POINTS_LEDGER_SOURCE_LABEL_MAP[record.title] ??
  getLegacyAgentLedgerSourceLabel(record) ??
  record.title;

const getLedgerActorLabel = (record: MockTenantPointsLedgerItem): string => {
  if (record.direction === "income" && ["平台运营", "平台系统"].includes(record.actorName)) {
    return "FrontisAI";
  }

  return record.actorName;
};

const renderLedgerPoints = (record: MockTenantPointsLedgerItem): JSX.Element => {
  const isIncome = record.direction === "income";

  return (
    <strong className={isIncome ? styles.pointsIncomeText : styles.pointsExpenseText}>
      {isIncome ? "+" : "-"}
      {record.points.toLocaleString("zh-CN")}
    </strong>
  );
};

const formatCurrency = (value: number): string =>
  `¥${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getOrderSortTime = (order: Pick<TenantOrderRecordItem, "createdAt" | "paidAt">): number =>
  parseMockOccurredAt(order.paidAt ?? order.createdAt).valueOf();

const buildPointsOrder = (order: MockTenantPointsOrderItem): TenantOrderRecordItem => ({
  amount: order.amount,
  createdAt: order.createdAt,
  detailLabel: `${order.packagePoints.toLocaleString("zh-CN")} 积分`,
  id: `points-${order.id}`,
  orderNo: order.orderNo,
  paidAt: order.paidAt,
  paymentChannelLabel: order.paymentChannelLabel,
  purchaserName: order.purchaserName,
  sortTime: getOrderSortTime(order),
  status: order.status,
  subjectLabel: order.packageTitle,
  typeLabel: "积分订单",
});

const buildSubscriptionOrder = (order: MockTenantSubscriptionOrderItem): TenantOrderRecordItem => {
  const purchaseModeLabel = order.purchaseMode === "renew" ? "续约" : "新增";

  return {
    amount: order.amount,
    createdAt: order.createdAt,
    detailLabel: `${purchaseModeLabel} ${order.seatCount} 席 · ${order.billingCycleLabel}`,
    id: `subscription-${order.id}`,
    orderNo: order.orderNo,
    paidAt: order.paidAt,
    paymentChannelLabel: order.paymentChannelLabel,
    purchaserName: order.purchaserName,
    sortTime: getOrderSortTime(order),
    status: order.status,
    subjectLabel: order.planTitle,
    typeLabel: "订阅订单",
  };
};

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
 * 租户订单记录视图，展示积分流水和购买记录。
 */
export const TenantPointsView = ({
  onOpenRecharge,
  tenantSnapshot,
}: TenantPointsViewProps): JSX.Element => {
  const [activeOrderRecordTab, setActiveOrderRecordTab] = useState<OrderRecordTabKey>("ledger");
  const [activeLedgerRange, setActiveLedgerRange] = useState<PointsRangeKey>("month");
  const [activeLedgerDirection, setActiveLedgerDirection] =
    useState<PointsLedgerDirectionFilter>("all");

  const filteredLedgerRecords = useMemo(
    () =>
      tenantSnapshot.pointsLedger
        .filter(record => isLedgerRecordInRange(record, activeLedgerRange))
        .filter(record =>
          activeLedgerDirection === "all" ? true : record.direction === activeLedgerDirection,
        )
        .sort(
          (leftRecord, rightRecord) =>
            parseMockOccurredAt(rightRecord.createdAt).valueOf() -
            parseMockOccurredAt(leftRecord.createdAt).valueOf(),
        ),
    [activeLedgerDirection, activeLedgerRange, tenantSnapshot.pointsLedger],
  );

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
        {onOpenRecharge ? (
          <Button type="primary" onClick={onOpenRecharge}>
            购买积分
          </Button>
        ) : null}
      </header>

      <section className={adminStyles.consoleSection}>
        <div className={adminStyles.consoleTabs}>
          {ORDER_RECORD_TAB_OPTIONS.map(item => (
            <button
              key={item.key}
              type="button"
              className={classNames(adminStyles.consoleTabButton, {
                [adminStyles.consoleTabButtonActive]: activeOrderRecordTab === item.key,
              })}
              onClick={() => setActiveOrderRecordTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {activeOrderRecordTab === "ledger" ? (
          <>
            <div className={styles.ledgerToolbar}>
              <div className={styles.ledgerBalance}>
                <span>当前余额</span>
                <strong>{tenantSnapshot.pointsBalance.toLocaleString("zh-CN")}</strong>
              </div>
              <div className={styles.ledgerFilters}>
                <div className={styles.rangeBar}>
                  {POINTS_RANGE_OPTIONS.map(item => (
                    <button
                      key={item.key}
                      type="button"
                      className={`${styles.rangeButton} ${
                        activeLedgerRange === item.key ? styles.rangeButtonActive : ""
                      }`}
                      onClick={() => setActiveLedgerRange(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className={styles.rangeBar}>
                  {POINTS_LEDGER_DIRECTION_OPTIONS.map(item => (
                    <button
                      key={item.key}
                      type="button"
                      className={`${styles.rangeButton} ${
                        activeLedgerDirection === item.key ? styles.rangeButtonActive : ""
                      }`}
                      onClick={() => setActiveLedgerDirection(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={adminStyles.consoleHtmlTableWrap}>
              <table className={adminStyles.consoleHtmlTable}>
                <thead>
                  <tr>
                    <th>类型</th>
                    <th>来源</th>
                    <th>积分</th>
                    <th>操作人</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedgerRecords.length ? (
                    filteredLedgerRecords.map(record => (
                      <tr key={record.id}>
                        <td>{renderLedgerDirectionTag(record)}</td>
                        <td className={adminStyles.consoleHtmlTableStrong}>
                          {getLedgerSourceLabel(record)}
                        </td>
                        <td>{renderLedgerPoints(record)}</td>
                        <td>{getLedgerActorLabel(record)}</td>
                        <td>{record.createdAt}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className={styles.emptyCell}>
                        当前暂无积分流水记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>订单类型</th>
                  <th>订单内容</th>
                  <th>数量 / 周期</th>
                  <th>支付金额</th>
                  <th>状态</th>
                  <th>支付方式</th>
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
                      <td>{order.detailLabel}</td>
                      <td>{formatCurrency(order.amount)}</td>
                      <td>{renderOrderStatusTag(order.status)}</td>
                      <td>{order.paymentChannelLabel}</td>
                      <td>{order.purchaserName}</td>
                      <td>{order.createdAt}</td>
                      <td>{order.paidAt ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className={styles.emptyCell}>
                      当前暂无购买记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
