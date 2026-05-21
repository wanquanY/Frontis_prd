import { useMemo, useState } from "react";

import { InputNumber } from "antd";
import classNames from "classnames";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import type {
  OperationsPointsUsageRecord,
  OperationsRegistrationStrategy,
  OperationsTenant,
} from "@/feature/operations/types";
import {
  formatOperationsCurrency,
  formatOperationsPoints,
} from "@/feature/operations/serviceMeteringUtils";
import adminStyles from "@/pages/components/FrontisAdminViews.module.less";

import platformStyles from "./OperationsPlatformView.module.less";

interface OperationsPointsConsoleProps {
  embedded?: boolean;
  pointsUsageRecords: OperationsPointsUsageRecord[];
  registrationStrategy: OperationsRegistrationStrategy;
  tenants: OperationsTenant[];
  onUpdateRegistrationStrategy: (
    patch: Partial<
      Pick<
        OperationsRegistrationStrategy,
        | "defaultGiftPoints"
        | "pointsPerCny"
        | "minimumDeductPoints"
        | "roundingUnit"
      >
    >,
  ) => void;
}

type OperationsPointsTabKey = "rules" | "reconciliation";
type OperationsPointsUsageRangeKey = "today" | "week" | "month" | "all";

interface OperationsCustomerUsageSummary {
  tenantName: string;
  latestOccurredAt: string;
  costAmount: number;
  points: number;
  recordCount: number;
  saleAmount: number;
  userCount: number;
}

const POINTS_TAB_OPTIONS: Array<{ key: OperationsPointsTabKey; label: string }> = [
  { key: "rules", label: "积分规则" },
  { key: "reconciliation", label: "消耗对账" },
];

const POINTS_USAGE_RANGE_OPTIONS: Array<{ key: OperationsPointsUsageRangeKey; label: string }> = [
  { key: "today", label: "今日" },
  { key: "week", label: "近一周" },
  { key: "month", label: "近一月" },
  { key: "all", label: "全部" },
];

const MOCK_TODAY = dayjs("2026-04-24 12:00");

const buildStatusClassName = (tone?: "primary" | "success" | "warning" | "danger"): string =>
  classNames(
    adminStyles.consoleStatusTag,
    tone === "primary" && adminStyles.consoleStatusTagPrimary,
    tone === "success" && adminStyles.consoleStatusTagSuccess,
    tone === "warning" && adminStyles.consoleStatusTagWarning,
    tone === "danger" && adminStyles.consoleStatusTagDanger,
  );

const parseOperationsOccurredAt = (occurredAt: string): Dayjs => {
  const parsedValue = dayjs(occurredAt);

  return parsedValue.isValid() ? parsedValue : MOCK_TODAY;
};

const isUsageRecordInRange = (
  record: OperationsPointsUsageRecord,
  rangeKey: OperationsPointsUsageRangeKey,
): boolean => {
  if (rangeKey === "all") return true;

  const occurredAt = parseOperationsOccurredAt(record.occurredAt);

  if (rangeKey === "today") return occurredAt.isSame(MOCK_TODAY, "day");
  if (rangeKey === "month") {
    return !occurredAt.isBefore(MOCK_TODAY.subtract(1, "month")) && !occurredAt.isAfter(MOCK_TODAY);
  }

  return !occurredAt.isBefore(MOCK_TODAY.subtract(1, "week")) && !occurredAt.isAfter(MOCK_TODAY);
};

const buildCustomerUsageSummaries = (
  records: OperationsPointsUsageRecord[],
): OperationsCustomerUsageSummary[] => {
  const tenantRecordMap = records.reduce<Map<string, OperationsPointsUsageRecord[]>>(
    (recordMap, record) => {
      recordMap.set(record.tenantName, [...(recordMap.get(record.tenantName) ?? []), record]);

      return recordMap;
    },
    new Map<string, OperationsPointsUsageRecord[]>(),
  );

  return Array.from(tenantRecordMap.entries())
    .map(([tenantName, tenantRecords]) => {
      const sortedRecords = [...tenantRecords].sort(
        (leftRecord, rightRecord) =>
          parseOperationsOccurredAt(rightRecord.occurredAt).valueOf() -
          parseOperationsOccurredAt(leftRecord.occurredAt).valueOf(),
      );
      const userCount = new Set(tenantRecords.map(record => record.userName)).size;

      return {
        tenantName,
        latestOccurredAt: sortedRecords[0]?.occurredAt ?? "-",
        costAmount: tenantRecords.reduce((sum, record) => sum + record.costAmount, 0),
        points: tenantRecords.reduce((sum, record) => sum + record.points, 0),
        recordCount: tenantRecords.length,
        saleAmount: tenantRecords.reduce((sum, record) => sum + record.saleAmount, 0),
        userCount,
      };
    })
    .sort((leftSummary, rightSummary) => rightSummary.points - leftSummary.points);
};

/**
 * 运营后台积分运营控制台，承载积分规则和消耗对账。
 */
export const OperationsPointsConsole = ({
  embedded = false,
  pointsUsageRecords,
  registrationStrategy,
  onUpdateRegistrationStrategy,
}: OperationsPointsConsoleProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<OperationsPointsTabKey>("rules");
  const [activeUsageRange, setActiveUsageRange] = useState<OperationsPointsUsageRangeKey>("month");

  const filteredUsageRecords = useMemo(
    () => pointsUsageRecords.filter(record => isUsageRecordInRange(record, activeUsageRange)),
    [activeUsageRange, pointsUsageRecords],
  );
  const customerUsageSummaries = useMemo(
    () => buildCustomerUsageSummaries(filteredUsageRecords),
    [filteredUsageRecords],
  );
  const activeUsageRangeLabel =
    POINTS_USAGE_RANGE_OPTIONS.find(item => item.key === activeUsageRange)?.label ?? "近一月";
  const renderRules = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>积分规则</h2>
        </div>
      </div>

      <div className={adminStyles.consoleRows}>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>注册送积分</span>
          <InputNumber
            min={0}
            className={platformStyles.fullWidthInput}
            value={registrationStrategy.defaultGiftPoints}
            onChange={value =>
              onUpdateRegistrationStrategy({ defaultGiftPoints: Number(value ?? 0) })
            }
          />
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>积分汇率（¥1 可兑换积分）</span>
          <InputNumber
            min={1}
            className={platformStyles.fullWidthInput}
            value={registrationStrategy.pointsPerCny}
            onChange={value => onUpdateRegistrationStrategy({ pointsPerCny: Number(value ?? 1) })}
          />
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>最小扣减（积分）</span>
          <InputNumber
            min={1}
            className={platformStyles.fullWidthInput}
            value={registrationStrategy.minimumDeductPoints}
            onChange={value =>
              onUpdateRegistrationStrategy({ minimumDeductPoints: Number(value ?? 1) })
            }
          />
        </div>
        <div className={adminStyles.consoleInfoRow}>
          <span className={adminStyles.consoleInfoLabel}>取整单位（积分）</span>
          <InputNumber
            min={1}
            className={platformStyles.fullWidthInput}
            value={registrationStrategy.roundingUnit}
            onChange={value => onUpdateRegistrationStrategy({ roundingUnit: Number(value ?? 1) })}
          />
        </div>
      </div>
    </section>
  );

  const renderReconciliation = (): JSX.Element => (
    <section className={adminStyles.consoleSection}>
      <div className={adminStyles.consoleSectionHeader}>
        <div className={adminStyles.consoleSectionHeaderMain}>
          <h2 className={adminStyles.consoleSectionTitle}>消耗对账</h2>
        </div>
        <div className={platformStyles.rangeBar}>
          {POINTS_USAGE_RANGE_OPTIONS.map(item => (
            <button
              key={item.key}
              type="button"
              className={classNames(
                platformStyles.rangeButton,
                activeUsageRange === item.key && platformStyles.rangeButtonActive,
              )}
              onClick={() => setActiveUsageRange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={adminStyles.consoleHtmlTableWrap}>
        <table className={adminStyles.consoleHtmlTable}>
          <thead>
            <tr>
              <th>客户 / 租户</th>
              <th>时间范围</th>
              <th>消耗积分</th>
              <th>计量金额</th>
              <th>成本</th>
              <th>使用人数</th>
              <th>消耗次数</th>
              <th>最近消耗</th>
            </tr>
          </thead>
          <tbody>
            {customerUsageSummaries.length ? (
              customerUsageSummaries.map(summary => (
                <tr key={summary.tenantName}>
                  <td className={adminStyles.consoleHtmlTableStrong}>{summary.tenantName}</td>
                  <td>{activeUsageRangeLabel}</td>
                  <td>
                    <span className={buildStatusClassName("danger")}>
                      -{formatOperationsPoints(summary.points)}
                    </span>
                  </td>
                  <td>{formatOperationsCurrency(summary.saleAmount)}</td>
                  <td>{formatOperationsCurrency(summary.costAmount)}</td>
                  <td>{summary.userCount} 人</td>
                  <td>{summary.recordCount} 次</td>
                  <td>{summary.latestOccurredAt}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className={platformStyles.emptyTableCell}>
                  当前时间范围暂无客户消耗
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderActiveContent = (): JSX.Element => {
    if (activeTab === "rules") return renderRules();

    return renderReconciliation();
  };

  return (
    <div className={embedded ? undefined : adminStyles.consolePage}>
      {embedded ? null : (
        <header className={adminStyles.consoleHeader}>
          <div className={adminStyles.consoleHeaderMain}>
            <h1 className={adminStyles.consoleTitle}>积分运营</h1>
          </div>
        </header>
      )}

      <div className={platformStyles.detailTabBar}>
        {POINTS_TAB_OPTIONS.map(item => (
          <button
            key={item.key}
            type="button"
            className={classNames(
              platformStyles.detailTabButton,
              activeTab === item.key && platformStyles.detailTabButtonActive,
            )}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {renderActiveContent()}
    </div>
  );
};
