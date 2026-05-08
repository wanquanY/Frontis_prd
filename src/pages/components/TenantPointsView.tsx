import { useMemo, useState } from "react";

import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import type {
  MockTenantManagementSnapshot,
  MockTenantPointsLedgerItem,
} from "@/feature/auth/types";

import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./TenantPointsView.module.less";

interface TenantPointsViewProps {
  tenantSnapshot: MockTenantManagementSnapshot;
}

type PointsRangeKey = "week" | "month" | "all";
type PointsLedgerDirectionFilter = "all" | "income" | "expense";

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

/**
 * 租户积分管理视图，展示积分账务流水。
 */
export const TenantPointsView = ({ tenantSnapshot }: TenantPointsViewProps): JSX.Element => {
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
  const ledgerIncomePoints = useMemo(
    () =>
      filteredLedgerRecords
        .filter(record => record.direction === "income")
        .reduce((sum, record) => sum + record.points, 0),
    [filteredLedgerRecords],
  );
  const ledgerExpensePoints = useMemo(
    () =>
      filteredLedgerRecords
        .filter(record => record.direction === "expense")
        .reduce((sum, record) => sum + record.points, 0),
    [filteredLedgerRecords],
  );
  const activeLedgerRangeLabel =
    POINTS_RANGE_OPTIONS.find(item => item.key === activeLedgerRange)?.label ?? "本月";

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>积分管理</h1>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
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

        <div className={adminStyles.consoleSummaryStrip}>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>增加积分</span>
            <span className={adminStyles.consoleSummaryValue}>
              {ledgerIncomePoints.toLocaleString("zh-CN")}
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>消耗积分</span>
            <span className={adminStyles.consoleSummaryValue}>
              {ledgerExpensePoints.toLocaleString("zh-CN")}
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>流水记录</span>
            <span className={adminStyles.consoleSummaryValue}>
              {filteredLedgerRecords.length} 条
            </span>
          </div>
          <div className={adminStyles.consoleSummaryItem}>
            <span className={adminStyles.consoleSummaryLabel}>时间范围</span>
            <span className={adminStyles.consoleSummaryValue}>{activeLedgerRangeLabel}</span>
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
      </section>
    </div>
  );
};
