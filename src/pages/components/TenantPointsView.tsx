import { useMemo, useState } from "react";

import { Button, Modal, Popover } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import type {
  MockTenantManagementSnapshot,
  MockTenantPointsUsageRecordItem,
} from "@/feature/auth/types";

import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./TenantPointsView.module.less";

interface TenantPointsViewProps {
  tenantSnapshot: MockTenantManagementSnapshot;
}

type TenantPointsTabKey = "usage";
type PointsUsageRangeKey = "week" | "month" | "all";

interface UsageActorSummary {
  actorName: string;
  roleLabel: string;
  latestOccurredAt: string;
  points: number;
  records: MockTenantPointsUsageRecordItem[];
  sourceSummaries: UsageSourceSummary[];
  usageCount: number;
}

interface UsageSourceSummary {
  sourceLabel: string;
  points: number;
  usageCount: number;
}

const POINTS_TAB_OPTIONS: Array<{ key: TenantPointsTabKey; label: string }> = [
  { key: "usage", label: "积分消耗" },
];

const POINTS_USAGE_RANGE_OPTIONS: Array<{ key: PointsUsageRangeKey; label: string }> = [
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
  { key: "all", label: "全部" },
];

const MAX_VISIBLE_SOURCE_COUNT = 2;
const MOCK_TODAY = dayjs("2026-04-24 12:00");

const getUserRoleLabel = (
  tenantSnapshot: MockTenantManagementSnapshot,
  actorName: string,
): string => {
  const matchedUser = tenantSnapshot.users.find(user => user.name === actorName);

  if (!matchedUser) {
    return tenantSnapshot.edition === "personal" ? "租户管理员" : "租户成员";
  }

  if (matchedUser.role === "enterpriseAdmin") {
    return "租户管理员";
  }

  if (matchedUser.role === "departmentLead") {
    return "协作负责人";
  }

  return "租户成员";
};

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

const isUsageRecordInRange = (
  record: MockTenantPointsUsageRecordItem,
  rangeKey: PointsUsageRangeKey,
): boolean => {
  if (rangeKey === "all") {
    return true;
  }

  const occurredAt = parseMockOccurredAt(record.occurredAt);

  if (rangeKey === "month") {
    return occurredAt.isSame(MOCK_TODAY, "month");
  }

  return occurredAt.isSame(MOCK_TODAY, "week") || occurredAt.isSame(MOCK_TODAY, "day");
};

const getUsageRecordSourceLabel = (record: MockTenantPointsUsageRecordItem): string => {
  if (record.channelLabel === "MetaAgent") {
    return "MetaAgent";
  }

  return `${record.channelLabel} · ${record.targetLabel}`;
};

const buildUsageSourceSummaries = (
  records: MockTenantPointsUsageRecordItem[],
): UsageSourceSummary[] => {
  const sourceRecordMap = records.reduce<Map<string, MockTenantPointsUsageRecordItem[]>>(
    (recordMap, record) => {
      const sourceLabel = getUsageRecordSourceLabel(record);
      recordMap.set(sourceLabel, [...(recordMap.get(sourceLabel) ?? []), record]);

      return recordMap;
    },
    new Map<string, MockTenantPointsUsageRecordItem[]>(),
  );

  return Array.from(sourceRecordMap.entries())
    .map(([sourceLabel, sourceRecords]) => ({
      sourceLabel,
      points: sourceRecords.reduce((sum, record) => sum + record.points, 0),
      usageCount: sourceRecords.length,
    }))
    .sort((leftSummary, rightSummary) => rightSummary.points - leftSummary.points);
};

const buildUsageActorSummaries = (
  tenantSnapshot: MockTenantManagementSnapshot,
  records: MockTenantPointsUsageRecordItem[],
): UsageActorSummary[] => {
  const actorRecordMap = records.reduce<Map<string, MockTenantPointsUsageRecordItem[]>>(
    (recordMap, record) => {
      recordMap.set(record.actorName, [...(recordMap.get(record.actorName) ?? []), record]);

      return recordMap;
    },
    new Map<string, MockTenantPointsUsageRecordItem[]>(),
  );

  return Array.from(actorRecordMap.entries())
    .map(([actorName, actorRecords]) => {
      const sortedRecords = [...actorRecords].sort(
        (leftRecord, rightRecord) =>
          parseMockOccurredAt(rightRecord.occurredAt).valueOf() -
          parseMockOccurredAt(leftRecord.occurredAt).valueOf(),
      );

      return {
        actorName,
        roleLabel: getUserRoleLabel(tenantSnapshot, actorName),
        latestOccurredAt: sortedRecords[0]?.occurredAt ?? "-",
        points: actorRecords.reduce((sum, record) => sum + record.points, 0),
        records: sortedRecords,
        sourceSummaries: buildUsageSourceSummaries(actorRecords),
        usageCount: actorRecords.length,
      };
    })
    .sort((leftSummary, rightSummary) => rightSummary.points - leftSummary.points);
};

const renderSourcePopoverContent = (sourceSummaries: UsageSourceSummary[]): JSX.Element => (
  <div className={styles.sourcePopoverContent}>
    {sourceSummaries.map(item => (
      <div key={item.sourceLabel} className={styles.sourcePopoverItem}>
        <span>{item.sourceLabel}</span>
        <strong>-{item.points.toLocaleString("zh-CN")}</strong>
      </div>
    ))}
  </div>
);

const renderSourceTags = (sourceSummaries: UsageSourceSummary[]): JSX.Element => {
  const visibleSources = sourceSummaries.slice(0, MAX_VISIBLE_SOURCE_COUNT);
  const hiddenSourceCount = sourceSummaries.length - visibleSources.length;
  const tagGroup = (
    <div className={styles.sourceTagGroup}>
      {visibleSources.map(item => (
        <span key={item.sourceLabel} className={styles.sourceTag}>
          {item.sourceLabel}
        </span>
      ))}
      {hiddenSourceCount > 0 ? (
        <span className={`${styles.sourceTag} ${styles.sourceMoreTag}`}>+{hiddenSourceCount}</span>
      ) : null}
    </div>
  );

  if (hiddenSourceCount <= 0) {
    return tagGroup;
  }

  return (
    <Popover
      content={renderSourcePopoverContent(sourceSummaries)}
      placement="bottomLeft"
      trigger="hover"
    >
      {tagGroup}
    </Popover>
  );
};

const renderUsageSummaryTable = (
  summaries: UsageActorSummary[],
  totalPoints: number,
  onOpenSummary: (summary: UsageActorSummary) => void,
): JSX.Element => (
  <div className={adminStyles.consoleHtmlTableWrap}>
    <table className={adminStyles.consoleHtmlTable}>
      <thead>
        <tr>
          <th>使用人</th>
          <th>消耗积分</th>
          <th>占比</th>
          <th>使用次数</th>
          <th>消耗来源</th>
          <th>最近使用</th>
        </tr>
      </thead>
      <tbody>
        {summaries.length ? (
          summaries.map(item => (
            <tr key={item.actorName}>
              <td>
                <button
                  type="button"
                  className={styles.orderNoButton}
                  onClick={() => onOpenSummary(item)}
                >
                  {item.actorName}
                </button>
                <div className={adminStyles.consoleSidebarItemMeta}>{item.roleLabel}</div>
              </td>
              <td>
                <span
                  className={`${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagDanger}`}
                >
                  -{item.points.toLocaleString("zh-CN")}
                </span>
              </td>
              <td>{totalPoints ? `${Math.round((item.points / totalPoints) * 100)}%` : "-"}</td>
              <td>{item.usageCount} 次</td>
              <td>{renderSourceTags(item.sourceSummaries)}</td>
              <td>{item.latestOccurredAt}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={6} className={styles.emptyCell}>
              当前暂无积分消耗记录
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

/**
 * 租户积分管理视图，展示积分消耗记录。
 */
export const TenantPointsView = ({ tenantSnapshot }: TenantPointsViewProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TenantPointsTabKey>("usage");
  const [activeUsageRange, setActiveUsageRange] = useState<PointsUsageRangeKey>("month");
  const [activeUsageSummary, setActiveUsageSummary] = useState<UsageActorSummary | null>(null);

  const filteredUsageRecords = useMemo(
    () =>
      tenantSnapshot.pointsUsageRecords.filter(record =>
        isUsageRecordInRange(record, activeUsageRange),
      ),
    [activeUsageRange, tenantSnapshot.pointsUsageRecords],
  );
  const usageActorSummaries = useMemo(
    () => buildUsageActorSummaries(tenantSnapshot, filteredUsageRecords),
    [filteredUsageRecords, tenantSnapshot],
  );
  const totalUsagePoints = useMemo(
    () => filteredUsageRecords.reduce((sum, record) => sum + record.points, 0),
    [filteredUsageRecords],
  );
  const usageSourceSummaries = useMemo(
    () => buildUsageSourceSummaries(activeUsageSummary?.records ?? []),
    [activeUsageSummary],
  );
  const activeUsageRangeLabel =
    POINTS_USAGE_RANGE_OPTIONS.find(item => item.key === activeUsageRange)?.label ?? "本月";
  const activeUserCount = usageActorSummaries.length;
  const averageUsagePoints = activeUserCount ? Math.round(totalUsagePoints / activeUserCount) : 0;

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>积分管理</h1>
        </div>
      </header>

      <div className={styles.tabBar}>
        {POINTS_TAB_OPTIONS.map(item => (
          <button
            key={item.key}
            type="button"
            className={`${styles.tabButton} ${activeTab === item.key ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === "usage" ? (
        <section className={adminStyles.consoleSection}>
          <div className={styles.rangeHeader}>
            <div className={styles.rangeBar}>
              {POINTS_USAGE_RANGE_OPTIONS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.rangeButton} ${
                    activeUsageRange === item.key ? styles.rangeButtonActive : ""
                  }`}
                  onClick={() => {
                    setActiveUsageRange(item.key);
                    setActiveUsageSummary(null);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={adminStyles.consoleSummaryStrip}>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>消耗积分</span>
              <span className={adminStyles.consoleSummaryValue}>
                {totalUsagePoints.toLocaleString("zh-CN")}
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>使用人数</span>
              <span className={adminStyles.consoleSummaryValue}>{activeUserCount} 人</span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>使用次数</span>
              <span className={adminStyles.consoleSummaryValue}>
                {filteredUsageRecords.length} 次
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>人均消耗</span>
              <span className={adminStyles.consoleSummaryValue}>
                {averageUsagePoints.toLocaleString("zh-CN")}
              </span>
            </div>
          </div>

          {renderUsageSummaryTable(usageActorSummaries, totalUsagePoints, setActiveUsageSummary)}
        </section>
      ) : null}

      <Modal
        open={Boolean(activeUsageSummary)}
        title={activeUsageSummary ? `${activeUsageSummary.actorName} · 积分消耗` : "积分消耗"}
        onCancel={() => setActiveUsageSummary(null)}
        footer={
          <Button type="primary" onClick={() => setActiveUsageSummary(null)}>
            关闭
          </Button>
        }
        width={760}
        destroyOnClose
      >
        {activeUsageSummary ? (
          <div className={styles.usageDetailModal}>
            <div className={styles.usageDetailSummary}>
              <div className={styles.usageDetailSummaryItem}>
                <span className={styles.usageDetailLabel}>时间范围</span>
                <strong>{activeUsageRangeLabel}</strong>
              </div>
              <div className={styles.usageDetailSummaryItem}>
                <span className={styles.usageDetailLabel}>消耗积分</span>
                <strong>{activeUsageSummary.points.toLocaleString("zh-CN")}</strong>
              </div>
              <div className={styles.usageDetailSummaryItem}>
                <span className={styles.usageDetailLabel}>使用次数</span>
                <strong>{activeUsageSummary.usageCount} 次</strong>
              </div>
              <div className={styles.usageDetailSummaryItem}>
                <span className={styles.usageDetailLabel}>最近使用</span>
                <strong>{activeUsageSummary.latestOccurredAt}</strong>
              </div>
            </div>

            <section className={styles.usageDetailSection}>
              <h3 className={styles.usageDetailTitle}>来源构成</h3>
              <div className={adminStyles.consoleHtmlTableWrap}>
                <table className={adminStyles.consoleHtmlTable}>
                  <thead>
                    <tr>
                      <th>来源</th>
                      <th>消耗积分</th>
                      <th>使用次数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageSourceSummaries.map(item => (
                      <tr key={item.sourceLabel}>
                        <td className={adminStyles.consoleHtmlTableStrong}>{item.sourceLabel}</td>
                        <td>-{item.points.toLocaleString("zh-CN")}</td>
                        <td>{item.usageCount} 次</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.usageDetailSection}>
              <h3 className={styles.usageDetailTitle}>最近明细</h3>
              <div className={adminStyles.consoleHtmlTableWrap}>
                <table className={adminStyles.consoleHtmlTable}>
                  <thead>
                    <tr>
                      <th>消耗对象</th>
                      <th>模型 / 接口</th>
                      <th>时间</th>
                      <th>积分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsageSummary.records.slice(0, 5).map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className={adminStyles.consoleHtmlTableStrong}>
                            {item.targetLabel}
                          </div>
                          <div className={adminStyles.consoleSidebarItemMeta}>
                            {item.description}
                          </div>
                        </td>
                        <td>{item.runtimeLabel}</td>
                        <td>{item.occurredAt}</td>
                        <td>-{item.points.toLocaleString("zh-CN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
