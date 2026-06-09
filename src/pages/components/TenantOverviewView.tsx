import { useMemo, useState } from "react";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, DatePicker, Popover } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import type {
  MockTenantAgentUsageRecordItem,
  MockTenantBillingMode,
  MockTenantDeploymentMode,
  MockTenantManagementSnapshot,
} from "@/feature/auth/types";
import type { EmployeeItem } from "@/pages/types";

import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./TenantOverviewView.module.less";

interface TenantOverviewViewProps {
  billingMode: MockTenantBillingMode;
  deploymentMode: MockTenantDeploymentMode;
  employees: EmployeeItem[];
  tenantSnapshot: MockTenantManagementSnapshot;
}

type UsageRangeKey = "today" | "week" | "month" | "custom";
type UsageDetailView = "members" | "agents" | "developers" | null;

interface MemberUsageSummary {
  actorName: string;
  agentCount: number;
  agentNames: string[];
  callCount: number;
  departmentName: string;
  latestOccurredAt: string;
  totalMetric: number;
  totalTokens: number;
}

interface AgentUsageSummary {
  agentName: string;
  callCount: number;
  industryStandardCost: number;
  memberCount: number;
  memberNames: string[];
  myLaborCost: number;
  totalMetric: number;
  totalTokens: number;
}

interface DeveloperSummary {
  developerName: string;
  expertNames: string[];
  expertCount: number;
}

interface TokenTrendPoint {
  label: string;
  showLabel: boolean;
  showValue: boolean;
  value: number;
}

const USAGE_RANGE_OPTIONS: Array<{ key: UsageRangeKey; label: string }> = [
  { key: "today", label: "今日" },
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
  { key: "custom", label: "自定义" },
];

const DASHBOARD_RANK_LIMIT = 5;
const MAX_VISIBLE_AGENT_TAG_COUNT = 3;
const MAX_VISIBLE_MEMBER_TAG_COUNT = 3;
const MOCK_TODAY = dayjs("2026-04-24 18:00");
const DEFAULT_CUSTOM_USAGE_RANGE: [Dayjs, Dayjs] = [
  MOCK_TODAY.subtract(6, "day").startOf("day"),
  MOCK_TODAY.endOf("day"),
];
const { RangePicker } = DatePicker;

type TrendBucketUnit = "hour" | "day" | "week" | "month";

interface TrendBucket {
  endAt: Dayjs;
  label: string;
  showLabel: boolean;
  showValue: boolean;
  startAt: Dayjs;
}

const getTotalTokens = (record: MockTenantAgentUsageRecordItem): number =>
  record.inputTokens + record.outputTokens;

const getUsageMetricValue = (
  record: MockTenantAgentUsageRecordItem,
  billingMode: MockTenantBillingMode,
): number => {
  if (billingMode === "cost") {
    return record.costAmount ?? Math.round(getTotalTokens(record) * 0.0012);
  }

  return record.points ?? Math.round(getTotalTokens(record) / 32);
};

const formatTokenCount = (value: number): string => {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(value >= 100000 ? 1 : 2)}万`;
  }

  return value.toLocaleString("zh-CN");
};

const formatCostAmount = (value: number): string => `¥${value.toLocaleString("zh-CN")}`;

const formatPointsAmount = (value: number): string => value.toLocaleString("zh-CN");

const formatMetricValue = (value: number, billingMode: MockTenantBillingMode): string =>
  billingMode === "cost" ? formatCostAmount(value) : formatPointsAmount(value);

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

  return MOCK_TODAY;
};

const getBusinessWeekStart = (date: Dayjs): Dayjs =>
  date.startOf("day").subtract((date.day() + 6) % 7, "day");

const isWithinRange = (date: Dayjs, startAt: Dayjs, endAt: Dayjs): boolean =>
  !date.isBefore(startAt) && date.isBefore(endAt);

const getUsageRangeBoundary = (
  rangeKey: UsageRangeKey,
  customRange: [Dayjs, Dayjs],
): { startAt: Dayjs; endAt: Dayjs } => {
  if (rangeKey === "custom") {
    return {
      startAt: customRange[0].startOf("day"),
      endAt: customRange[1].endOf("day").add(1, "millisecond"),
    };
  }

  if (rangeKey === "today") {
    return {
      startAt: MOCK_TODAY.startOf("day"),
      endAt: MOCK_TODAY.startOf("hour").add(1, "hour"),
    };
  }

  if (rangeKey === "week") {
    return {
      startAt: getBusinessWeekStart(MOCK_TODAY),
      endAt: MOCK_TODAY.endOf("day").add(1, "millisecond"),
    };
  }

  if (rangeKey === "month") {
    return {
      startAt: MOCK_TODAY.startOf("month"),
      endAt: MOCK_TODAY.endOf("day").add(1, "millisecond"),
    };
  }

  return {
    startAt: MOCK_TODAY.startOf("month"),
    endAt: MOCK_TODAY.endOf("day").add(1, "millisecond"),
  };
};

const isAgentUsageRecordInRange = (
  record: MockTenantAgentUsageRecordItem,
  rangeKey: UsageRangeKey,
  customRange: [Dayjs, Dayjs],
): boolean => {
  const occurredAt = parseMockOccurredAt(record.occurredAt);
  const { startAt, endAt } = getUsageRangeBoundary(rangeKey, customRange);

  return isWithinRange(occurredAt, startAt, endAt);
};

const buildMemberUsageSummaries = (
  records: MockTenantAgentUsageRecordItem[],
  billingMode: MockTenantBillingMode,
): MemberUsageSummary[] => {
  const recordMap = records.reduce<Map<string, MockTenantAgentUsageRecordItem[]>>(
    (nextMap, record) => {
      nextMap.set(record.actorName, [...(nextMap.get(record.actorName) ?? []), record]);

      return nextMap;
    },
    new Map<string, MockTenantAgentUsageRecordItem[]>(),
  );

  return Array.from(recordMap.entries())
    .map(([actorName, memberRecords]) => {
      const agentTokenMap = memberRecords.reduce<Map<string, number>>((nextMap, record) => {
        nextMap.set(
          record.agentName,
          (nextMap.get(record.agentName) ?? 0) + getTotalTokens(record),
        );

        return nextMap;
      }, new Map<string, number>());
      const agentNames = Array.from(agentTokenMap.entries())
        .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
        .map(([agentName]) => agentName);
      const latestRecord = [...memberRecords].sort(
        (leftRecord, rightRecord) =>
          parseMockOccurredAt(rightRecord.occurredAt).valueOf() -
          parseMockOccurredAt(leftRecord.occurredAt).valueOf(),
      )[0];

      return {
        actorName,
        agentCount: agentNames.length,
        agentNames,
        callCount: memberRecords.reduce((sum, record) => sum + record.callCount, 0),
        departmentName: latestRecord?.departmentName ?? "-",
        latestOccurredAt: latestRecord?.occurredAt ?? "-",
        totalMetric: memberRecords.reduce(
          (sum, record) => sum + getUsageMetricValue(record, billingMode),
          0,
        ),
        totalTokens: memberRecords.reduce((sum, record) => sum + getTotalTokens(record), 0),
      };
    })
    .sort((leftSummary, rightSummary) => rightSummary.totalMetric - leftSummary.totalMetric);
};

const buildAgentUsageSummaries = (
  records: MockTenantAgentUsageRecordItem[],
  billingMode: MockTenantBillingMode,
  employees: EmployeeItem[],
): AgentUsageSummary[] => {
  const employeeMap = new Map(employees.map(employee => [employee.name, employee]));
  const recordMap = records.reduce<Map<string, MockTenantAgentUsageRecordItem[]>>(
    (nextMap, record) => {
      nextMap.set(record.agentName, [...(nextMap.get(record.agentName) ?? []), record]);

      return nextMap;
    },
    new Map<string, MockTenantAgentUsageRecordItem[]>(),
  );

  return Array.from(recordMap.entries())
    .map(([agentName, agentRecords]) => {
      const employee = employeeMap.get(agentName);
      const memberTokenMap = agentRecords.reduce<Map<string, number>>((nextMap, record) => {
        nextMap.set(
          record.actorName,
          (nextMap.get(record.actorName) ?? 0) + getTotalTokens(record),
        );

        return nextMap;
      }, new Map<string, number>());
      const memberNames = Array.from(memberTokenMap.entries())
        .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
        .map(([memberName]) => memberName);

      return {
        agentName,
        callCount: agentRecords.reduce((sum, record) => sum + record.callCount, 0),
        industryStandardCost:
          employee?.industryStandardCost ??
          agentRecords.reduce((sum, record) => sum + (record.industryBenchmarkCostAmount ?? 0), 0),
        memberCount: memberNames.length,
        memberNames,
        myLaborCost:
          employee?.myLaborCost ??
          agentRecords.reduce((sum, record) => sum + (record.humanCostAmount ?? 0), 0),
        totalMetric: agentRecords.reduce(
          (sum, record) => sum + getUsageMetricValue(record, billingMode),
          0,
        ),
        totalTokens: agentRecords.reduce((sum, record) => sum + getTotalTokens(record), 0),
      };
    })
    .sort((leftSummary, rightSummary) => rightSummary.totalMetric - leftSummary.totalMetric);
};

const buildDeveloperSummaries = (employees: EmployeeItem[]): DeveloperSummary[] => {
  const developerExpertMap = employees.reduce<Map<string, string[]>>((nextMap, employee) => {
    const developerName = employee.developerName?.trim();

    if (!developerName) {
      return nextMap;
    }

    nextMap.set(developerName, [...(nextMap.get(developerName) ?? []), employee.name]);

    return nextMap;
  }, new Map<string, string[]>());

  return Array.from(developerExpertMap.entries())
    .map(([developerName, expertNames]) => ({
      developerName,
      expertNames: [...expertNames].sort((leftName, rightName) =>
        leftName.localeCompare(rightName, "zh-Hans-CN"),
      ),
      expertCount: expertNames.length,
    }))
    .sort(
      (leftSummary, rightSummary) =>
        rightSummary.expertCount - leftSummary.expertCount ||
        leftSummary.developerName.localeCompare(rightSummary.developerName, "zh-Hans-CN"),
    );
};

const buildTrendBuckets = (
  rangeKey: UsageRangeKey,
  customRange: [Dayjs, Dayjs],
  records: MockTenantAgentUsageRecordItem[],
): TrendBucket[] => {
  const { startAt, endAt } = getUsageRangeBoundary(rangeKey, customRange);
  const rangeDays = Math.max(endAt.diff(startAt, "day"), 1);
  const unit: TrendBucketUnit =
    rangeKey === "today"
      ? "hour"
      : rangeKey === "custom" && rangeDays > 120
        ? "month"
        : rangeKey === "custom" && rangeDays > 45
          ? "week"
          : "day";
  const buckets: TrendBucket[] = [];
  let cursor =
    unit === "hour"
      ? startAt.startOf("hour")
      : unit === "week"
        ? getBusinessWeekStart(startAt)
        : unit === "month"
          ? startAt.startOf("month")
          : startAt.startOf("day");

  while (cursor.isBefore(endAt)) {
    const bucketStartAt = unit === "week" && cursor.isBefore(startAt) ? startAt : cursor;
    const rawBucketEndAt =
      unit === "hour"
        ? cursor.add(1, "hour")
        : unit === "day"
          ? cursor.add(1, "day")
          : unit === "week"
            ? cursor.add(1, "week")
            : cursor.add(1, "month");
    const bucketEndAt = rawBucketEndAt.isAfter(endAt) ? endAt : rawBucketEndAt;

    buckets.push({
      startAt: bucketStartAt,
      endAt: bucketEndAt,
      label:
        unit === "hour"
          ? bucketStartAt.format("HH:00")
          : unit === "week"
            ? `${bucketStartAt.format("M/D")}-${bucketEndAt.subtract(1, "day").format("M/D")}`
            : unit === "month"
              ? bucketStartAt.format("M月")
              : bucketStartAt.format("M/D"),
      showLabel: false,
      showValue: false,
    });

    cursor = rawBucketEndAt;
  }

  const visibleInterval =
    unit === "hour"
      ? 4
      : unit === "day" && buckets.length > 14
        ? 7
        : unit === "day" && buckets.length > 8
          ? 3
          : 1;
  const lastIndex = buckets.length - 1;

  return buckets.map((bucket, index) => {
    const shouldShow = index === 0 || index === lastIndex || index % visibleInterval === 0;

    return {
      ...bucket,
      showLabel: shouldShow,
      showValue: shouldShow,
    };
  });
};

const buildMetricTrendPoints = (
  records: MockTenantAgentUsageRecordItem[],
  billingMode: MockTenantBillingMode,
  rangeKey: UsageRangeKey,
  customRange: [Dayjs, Dayjs],
): TokenTrendPoint[] =>
  buildTrendBuckets(rangeKey, customRange, records).map(bucket => ({
    label: bucket.label,
    showLabel: bucket.showLabel,
    showValue: bucket.showValue,
    value: records.reduce((sum, record) => {
      const occurredAt = parseMockOccurredAt(record.occurredAt);

      if (!isWithinRange(occurredAt, bucket.startAt, bucket.endAt)) {
        return sum;
      }

      return sum + getUsageMetricValue(record, billingMode);
    }, 0),
  }));

const renderUsageBars = (
  summaries: Array<{ label: string; value: number }>,
  maxValue: number,
  formatValue: (value: number) => string = formatTokenCount,
): JSX.Element => (
  <div className={styles.usageBars}>
    {summaries.map(item => (
      <div key={item.label} className={styles.usageBarRow}>
        <div className={styles.usageBarLabel}>
          <span>{item.label}</span>
        </div>
        <div className={styles.usageBarTrack}>
          <span
            className={styles.usageBarFill}
            style={{ width: `${maxValue ? Math.max((item.value / maxValue) * 100, 4) : 0}%` }}
          />
        </div>
        <strong>{formatValue(item.value)}</strong>
      </div>
    ))}
  </div>
);

const renderAgentColumnChart = (
  summaries: AgentUsageSummary[],
  maxValue: number,
  billingMode: MockTenantBillingMode,
): JSX.Element => (
  <div className={styles.columnChart}>
    {summaries.map(item => (
      <div key={item.agentName} className={styles.columnItem}>
        <div className={styles.columnValue}>
          {formatMetricValue(item.totalMetric, billingMode)}
        </div>
        <div className={styles.columnTrack}>
          <span
            className={styles.columnFill}
            style={{
              height: `${maxValue ? Math.max((item.totalMetric / maxValue) * 100, 8) : 0}%`,
            }}
          />
        </div>
        <div className={styles.columnLabel}>{item.agentName}</div>
      </div>
    ))}
  </div>
);

const renderMetricTrendChart = (
  points: TokenTrendPoint[],
  billingMode: MockTenantBillingMode,
): JSX.Element => {
  const chartWidth = 640;
  const chartHeight = 180;
  const chartPaddingX = 18;
  const chartPaddingTop = 18;
  const chartPaddingBottom = 34;
  const maxValue = Math.max(...points.map(item => item.value), 1);
  const plotWidth = chartWidth - chartPaddingX * 2;
  const plotHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
  const linePoints = points.map((item, index) => {
    const x = chartPaddingX + (plotWidth / Math.max(points.length - 1, 1)) * index;
    const y = chartPaddingTop + plotHeight - (item.value / maxValue) * plotHeight;

    return { ...item, x, y };
  });
  const polylinePoints = linePoints.map(item => `${item.x},${item.y}`).join(" ");
  const areaPoints = [
    `${chartPaddingX},${chartHeight - chartPaddingBottom}`,
    polylinePoints,
    `${chartWidth - chartPaddingX},${chartHeight - chartPaddingBottom}`,
  ].join(" ");

  return (
    <div className={styles.trendChart}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={billingMode === "cost" ? "企业成本消耗趋势" : "企业积分消耗趋势"}
      >
        <polygon className={styles.trendArea} points={areaPoints} />
        <polyline className={styles.trendLine} points={polylinePoints} />
        {linePoints.map(item => (
          <g key={item.label}>
            <circle className={styles.trendPoint} cx={item.x} cy={item.y} r="4" />
            {item.showValue ? (
              <text className={styles.trendValue} x={item.x} y={item.y - 10}>
                {formatMetricValue(item.value, billingMode)}
              </text>
            ) : null}
            {item.showLabel ? (
              <text className={styles.trendLabel} x={item.x} y={chartHeight - 10}>
                {item.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
};

const renderDeveloperDistribution = (summaries: DeveloperSummary[]): JSX.Element => (
  <div className={styles.developerChart}>
    {summaries.map(item => (
      <div key={item.developerName} className={styles.developerChartRow}>
        <span className={styles.developerName}>{item.developerName}</span>
        <span className={styles.developerTrack}>
          <span
            className={styles.developerFill}
            style={{
              width: `${
                summaries[0]?.expertCount
                  ? Math.max((item.expertCount / summaries[0].expertCount) * 100, 8)
                  : 0
              }%`,
            }}
          />
        </span>
        <strong>{item.expertCount}</strong>
      </div>
    ))}
  </div>
);

const renderAgentTags = (agentNames: string[]): JSX.Element => {
  const visibleAgentNames = agentNames.slice(0, MAX_VISIBLE_AGENT_TAG_COUNT);
  const hiddenAgentNames = agentNames.slice(MAX_VISIBLE_AGENT_TAG_COUNT);
  const tagGroup = (
    <div className={styles.agentTagGroup}>
      {visibleAgentNames.map(agentName => (
        <span key={agentName} className={styles.agentTag}>
          {agentName}
        </span>
      ))}
      {hiddenAgentNames.length ? (
        <span className={`${styles.agentTag} ${styles.agentMoreTag}`}>
          +{hiddenAgentNames.length}
        </span>
      ) : null}
    </div>
  );

  if (!hiddenAgentNames.length) {
    return tagGroup;
  }

  return (
    <Popover
      content={
        <div className={styles.agentPopover}>
          {agentNames.map(agentName => (
            <span key={agentName} className={styles.agentTag}>
              {agentName}
            </span>
          ))}
        </div>
      }
      placement="bottomLeft"
      trigger="hover"
    >
      {tagGroup}
    </Popover>
  );
};

const renderNameTags = (names: string[]): JSX.Element => {
  const visibleNames = names.slice(0, MAX_VISIBLE_MEMBER_TAG_COUNT);
  const hiddenNames = names.slice(MAX_VISIBLE_MEMBER_TAG_COUNT);
  const tagGroup = (
    <div className={styles.agentTagGroup}>
      {visibleNames.map(name => (
        <span key={name} className={styles.agentTag}>
          {name}
        </span>
      ))}
      {hiddenNames.length ? (
        <span className={`${styles.agentTag} ${styles.agentMoreTag}`}>
          +{hiddenNames.length}
        </span>
      ) : null}
    </div>
  );

  if (!hiddenNames.length) {
    return tagGroup;
  }

  return (
    <Popover
      content={
        <div className={styles.agentPopover}>
          {names.map(name => (
            <span key={name} className={styles.agentTag}>
              {name}
            </span>
          ))}
        </div>
      }
      placement="bottomLeft"
      trigger="hover"
    >
      {tagGroup}
    </Popover>
  );
};

const renderMembersUsageTable = (
  summaries: MemberUsageSummary[],
  billingMode: MockTenantBillingMode,
): JSX.Element => (
  <div className={adminStyles.consoleHtmlTableWrap}>
    <table className={adminStyles.consoleHtmlTable}>
      <thead>
        <tr>
          <th>成员</th>
          <th>部门</th>
          <th>{billingMode === "cost" ? "成本" : "积分"}</th>
          <th>Tokens</th>
          <th>调用次数</th>
          <th>使用专家数</th>
          <th>使用 AI 专家</th>
          <th>最近使用</th>
        </tr>
      </thead>
      <tbody>
        {summaries.length ? (
          summaries.map(item => (
            <tr key={item.actorName}>
              <td>
                <div className={adminStyles.consoleHtmlTableStrong}>{item.actorName}</div>
              </td>
              <td>{item.departmentName}</td>
              <td>{formatMetricValue(item.totalMetric, billingMode)}</td>
              <td>{formatTokenCount(item.totalTokens)}</td>
              <td>{item.callCount.toLocaleString("zh-CN")} 次</td>
              <td>{item.agentCount} 个</td>
              <td>{renderAgentTags(item.agentNames)}</td>
              <td>{item.latestOccurredAt}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={8} className={styles.emptyCell}>
              当前时间范围暂无成员用量记录
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const renderAgentsUsageTable = (
  summaries: AgentUsageSummary[],
  billingMode: MockTenantBillingMode,
): JSX.Element => {
  const isCostBilling = billingMode === "cost";

  return (
    <div className={adminStyles.consoleHtmlTableWrap}>
      <table className={adminStyles.consoleHtmlTable}>
        <thead>
          <tr>
            <th>AI 专家</th>
            <th>{isCostBilling ? "成本" : "积分"}</th>
            <th>Tokens</th>
            <th>调用次数</th>
            <th>调用成员</th>
            <th>调用成员数</th>
            <th>{isCostBilling ? "单次平均成本" : "单次平均 Tokens"}</th>
            {isCostBilling ? <th>我的人力成本</th> : null}
            {isCostBilling ? <th>行业标准成本</th> : null}
          </tr>
        </thead>
        <tbody>
          {summaries.length ? (
            summaries.map(item => (
              <tr key={item.agentName}>
                <td>
                  <div className={adminStyles.consoleHtmlTableStrong}>{item.agentName}</div>
                </td>
                <td>{formatMetricValue(item.totalMetric, billingMode)}</td>
                <td>{formatTokenCount(item.totalTokens)}</td>
                <td>{item.callCount.toLocaleString("zh-CN")} 次</td>
                <td>{renderNameTags(item.memberNames)}</td>
                <td>{item.memberCount} 人</td>
                <td>
                  {item.callCount
                    ? isCostBilling
                      ? formatCostAmount(Math.round(item.totalMetric / item.callCount))
                      : formatTokenCount(Math.round(item.totalTokens / item.callCount))
                    : "-"}
                </td>
                {isCostBilling ? <td>{formatCostAmount(item.myLaborCost)}</td> : null}
                {isCostBilling ? <td>{formatCostAmount(item.industryStandardCost)}</td> : null}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={isCostBilling ? 9 : 7} className={styles.emptyCell}>
                当前时间范围暂无 AI 专家用量记录
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const renderDevelopersTable = (summaries: DeveloperSummary[]): JSX.Element => (
  <div className={adminStyles.consoleHtmlTableWrap}>
    <table className={adminStyles.consoleHtmlTable}>
      <thead>
        <tr>
          <th>开发者</th>
          <th>AI 专家数量</th>
          <th>AI 专家</th>
        </tr>
      </thead>
      <tbody>
        {summaries.length ? (
          summaries.map(item => (
            <tr key={item.developerName}>
              <td>
                <div className={adminStyles.consoleHtmlTableStrong}>{item.developerName}</div>
              </td>
              <td>{item.expertCount} 个</td>
              <td>{renderAgentTags(item.expertNames)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={3} className={styles.emptyCell}>
              暂无 AI 专家开发记录
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

/**
 * 租户总览视图。
 */
export const TenantOverviewView = ({
  billingMode,
  deploymentMode,
  employees,
  tenantSnapshot,
}: TenantOverviewViewProps): JSX.Element => {
  const [activeUsageRange, setActiveUsageRange] = useState<UsageRangeKey>("month");
  const [customUsageRange, setCustomUsageRange] = useState<[Dayjs, Dayjs]>(
    DEFAULT_CUSTOM_USAGE_RANGE,
  );
  const [activeDetailView, setActiveDetailView] = useState<UsageDetailView>(null);
  const isTeamEdition = tenantSnapshot.edition === "team";
  const filteredAgentUsageRecords = useMemo(
    () =>
      tenantSnapshot.agentUsageRecords.filter(record =>
        isAgentUsageRecordInRange(record, activeUsageRange, customUsageRange),
      ),
    [activeUsageRange, customUsageRange, tenantSnapshot.agentUsageRecords],
  );
  const memberUsageSummaries = useMemo(
    () => buildMemberUsageSummaries(filteredAgentUsageRecords, billingMode),
    [billingMode, filteredAgentUsageRecords],
  );
  const agentUsageSummaries = useMemo(
    () => buildAgentUsageSummaries(filteredAgentUsageRecords, billingMode, employees),
    [billingMode, employees, filteredAgentUsageRecords],
  );
  const developerSummaries = useMemo(() => buildDeveloperSummaries(employees), [employees]);
  const totalUsageMetric = useMemo(
    () =>
      filteredAgentUsageRecords.reduce(
        (sum, record) => sum + getUsageMetricValue(record, billingMode),
        0,
      ),
    [billingMode, filteredAgentUsageRecords],
  );
  const totalAgentCalls = useMemo(
    () => filteredAgentUsageRecords.reduce((sum, record) => sum + record.callCount, 0),
    [filteredAgentUsageRecords],
  );
  const metricTrendPoints = useMemo(
    () =>
      buildMetricTrendPoints(
        filteredAgentUsageRecords,
        billingMode,
        activeUsageRange,
        customUsageRange,
      ),
    [activeUsageRange, billingMode, customUsageRange, filteredAgentUsageRecords],
  );
  const maxMemberMetric = Math.max(...memberUsageSummaries.map(item => item.totalMetric), 0);
  const maxAgentMetric = Math.max(...agentUsageSummaries.map(item => item.totalMetric), 0);
  const metricLabel = billingMode === "cost" ? "成本" : "积分";
  const detailTitle =
    activeDetailView === "members"
      ? "成员用量明细"
      : activeDetailView === "agents"
        ? "AI 专家调用明细"
        : "AI 专家开发明细";
  const renderUsageRangeControl = (): JSX.Element => (
    <div className={styles.rangeBar}>
      {USAGE_RANGE_OPTIONS.map(item => (
        <button
          key={item.key}
          type="button"
          className={`${styles.rangeButton} ${
            activeUsageRange === item.key ? styles.rangeButtonActive : ""
          }`}
          onClick={() => setActiveUsageRange(item.key)}
        >
          {item.label}
        </button>
      ))}
      {activeUsageRange === "custom" ? (
        <RangePicker
          allowClear={false}
          value={customUsageRange}
          onChange={dates => {
            if (!dates?.[0] || !dates[1]) {
              return;
            }

            setCustomUsageRange([dates[0], dates[1]]);
          }}
        />
      ) : null}
    </div>
  );

  if (activeDetailView) {
    return (
      <div className={adminStyles.consolePage}>
        <header className={adminStyles.consoleHeader}>
          <div className={styles.detailHeaderMain}>
            <Button
              className={styles.detailBackButton}
              icon={<ArrowLeftOutlined />}
              onClick={() => setActiveDetailView(null)}
            >
              返回总览
            </Button>
            <h1 className={adminStyles.consoleTitle}>{detailTitle}</h1>
          </div>
          {activeDetailView === "developers" ? null : renderUsageRangeControl()}
        </header>

        <section className={adminStyles.consoleSection}>
          {activeDetailView === "members"
            ? renderMembersUsageTable(memberUsageSummaries, billingMode)
            : activeDetailView === "agents"
              ? renderAgentsUsageTable(agentUsageSummaries, billingMode)
              : renderDevelopersTable(developerSummaries)}
        </section>
      </div>
    );
  }

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>
            {deploymentMode === "privateCloud" ? "驾驶舱" : "租户总览"}
          </h1>
          <p className={adminStyles.consoleSubtitle}>{tenantSnapshot.tenantName}</p>
        </div>
      </header>

      {isTeamEdition ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>
                {deploymentMode === "privateCloud" ? "企业 AI 驾驶舱" : "团队 AI 专家看板"}
              </h2>
            </div>
            {renderUsageRangeControl()}
          </div>

          <div className={adminStyles.consoleSummaryStrip}>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>
                {billingMode === "cost" ? "成本消耗" : "积分消耗"}
              </span>
              <span className={adminStyles.consoleSummaryValue}>
                {formatMetricValue(totalUsageMetric, billingMode)}
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>调用次数</span>
              <span className={adminStyles.consoleSummaryValue}>
                {totalAgentCalls.toLocaleString("zh-CN")}
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>使用成员</span>
              <span className={adminStyles.consoleSummaryValue}>
                {memberUsageSummaries.length} 人
              </span>
            </div>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>使用 AI 专家</span>
              <span className={adminStyles.consoleSummaryValue}>
                {agentUsageSummaries.length} 个
              </span>
            </div>
          </div>

          <div className={styles.dashboardGrid}>
            <div className={`${styles.dashboardPane} ${styles.dashboardPaneTrend}`}>
              <div className={styles.dashboardPaneHeader}>
                <div>
                  <h3>
                    {billingMode === "cost" ? "企业成本消耗趋势" : "企业积分消耗趋势"}
                  </h3>
                </div>
              </div>
              {renderMetricTrendChart(metricTrendPoints, billingMode)}
            </div>
            <div className={`${styles.dashboardPane} ${styles.dashboardPaneAgent}`}>
              <div className={styles.dashboardPaneHeader}>
                <div>
                  <h3>AI 专家用量排行</h3>
                  <span>按{metricLabel}</span>
                </div>
                <Button type="link" onClick={() => setActiveDetailView("agents")}>
                  调用明细
                </Button>
              </div>
              {renderAgentColumnChart(
                agentUsageSummaries.slice(0, DASHBOARD_RANK_LIMIT),
                maxAgentMetric,
                billingMode,
              )}
            </div>
            <div className={`${styles.dashboardPane} ${styles.dashboardPaneMember}`}>
              <div className={styles.dashboardPaneHeader}>
                <div>
                  <h3>成员用量排行</h3>
                  <span>按{metricLabel}</span>
                </div>
                <Button type="link" onClick={() => setActiveDetailView("members")}>
                  用量明细
                </Button>
              </div>
              {renderUsageBars(
                memberUsageSummaries.slice(0, DASHBOARD_RANK_LIMIT).map(item => ({
                  label: item.actorName,
                  value: item.totalMetric,
                })),
                maxMemberMetric,
                value => formatMetricValue(value, billingMode),
              )}
            </div>
            <div className={`${styles.dashboardPane} ${styles.dashboardPaneDeveloper}`}>
              <div className={styles.dashboardPaneHeader}>
                <div>
                  <h3>AI 专家开发分布</h3>
                </div>
                <Button type="link" onClick={() => setActiveDetailView("developers")}>
                  开发明细
                </Button>
              </div>
              {renderDeveloperDistribution(developerSummaries.slice(0, DASHBOARD_RANK_LIMIT))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};
