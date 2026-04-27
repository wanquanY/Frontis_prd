import { useMemo, useState } from "react";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Popover } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import type {
  MockTenantAgentUsageRecordItem,
  MockTenantManagementSnapshot,
} from "@/feature/auth/types";
import type { EmployeeItem } from "@/pages/types";

import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./TenantOverviewView.module.less";

interface TenantOverviewViewProps {
  employees: EmployeeItem[];
  tenantSnapshot: MockTenantManagementSnapshot;
}

type UsageRangeKey = "week" | "month" | "all";
type UsageDetailView = "members" | "agents" | "developers" | null;

interface MemberUsageSummary {
  actorName: string;
  agentCount: number;
  agentNames: string[];
  callCount: number;
  departmentName: string;
  latestOccurredAt: string;
  totalTokens: number;
}

interface AgentUsageSummary {
  agentName: string;
  callCount: number;
  memberCount: number;
  memberNames: string[];
  totalTokens: number;
}

interface DeveloperSummary {
  developerName: string;
  expertNames: string[];
  expertCount: number;
}

interface TokenTrendPoint {
  label: string;
  value: number;
}

const USAGE_RANGE_OPTIONS: Array<{ key: UsageRangeKey; label: string }> = [
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
  { key: "all", label: "全部" },
];

const DASHBOARD_RANK_LIMIT = 5;
const MAX_VISIBLE_AGENT_TAG_COUNT = 3;
const MOCK_TODAY = dayjs("2026-04-24 12:00");
const TREND_WEIGHTS: Record<UsageRangeKey, number[]> = {
  week: [0.68, 0.82, 0.76, 0.92, 1.08, 0.96, 1.18],
  month: [0.72, 0.84, 0.91, 1.06, 1.14],
  all: [0.58, 0.66, 0.8, 0.96, 1.08, 1.22],
};

const getTotalTokens = (record: MockTenantAgentUsageRecordItem): number =>
  record.inputTokens + record.outputTokens;

const formatTokenCount = (value: number): string => {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(value >= 100000 ? 1 : 2)}万`;
  }

  return value.toLocaleString("zh-CN");
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

  return MOCK_TODAY;
};

const isAgentUsageRecordInRange = (
  record: MockTenantAgentUsageRecordItem,
  rangeKey: UsageRangeKey,
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

const buildMemberUsageSummaries = (
  records: MockTenantAgentUsageRecordItem[],
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
        totalTokens: memberRecords.reduce((sum, record) => sum + getTotalTokens(record), 0),
      };
    })
    .sort((leftSummary, rightSummary) => rightSummary.totalTokens - leftSummary.totalTokens);
};

const buildAgentUsageSummaries = (
  records: MockTenantAgentUsageRecordItem[],
): AgentUsageSummary[] => {
  const recordMap = records.reduce<Map<string, MockTenantAgentUsageRecordItem[]>>(
    (nextMap, record) => {
      nextMap.set(record.agentName, [...(nextMap.get(record.agentName) ?? []), record]);

      return nextMap;
    },
    new Map<string, MockTenantAgentUsageRecordItem[]>(),
  );

  return Array.from(recordMap.entries())
    .map(([agentName, agentRecords]) => {
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
        memberCount: memberNames.length,
        memberNames,
        totalTokens: agentRecords.reduce((sum, record) => sum + getTotalTokens(record), 0),
      };
    })
    .sort((leftSummary, rightSummary) => rightSummary.totalTokens - leftSummary.totalTokens);
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

const buildTokenTrendPoints = (totalTokens: number, rangeKey: UsageRangeKey): TokenTrendPoint[] => {
  const weights = TREND_WEIGHTS[rangeKey];
  const averageValue = totalTokens / weights.length;

  return weights.map((weight, index) => {
    const pointDate =
      rangeKey === "week"
        ? MOCK_TODAY.subtract(weights.length - index - 1, "day")
        : rangeKey === "month"
          ? MOCK_TODAY.subtract(weights.length - index - 1, "week")
          : MOCK_TODAY.subtract(weights.length - index - 1, "month");

    return {
      label:
        rangeKey === "week"
          ? pointDate.format("M/D")
          : rangeKey === "month"
            ? `${pointDate.format("M/D")}周`
            : pointDate.format("M月"),
      value: Math.round(averageValue * weight),
    };
  });
};

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

const renderAgentColumnChart = (summaries: AgentUsageSummary[], maxValue: number): JSX.Element => (
  <div className={styles.columnChart}>
    {summaries.map(item => (
      <div key={item.agentName} className={styles.columnItem}>
        <div className={styles.columnValue}>{formatTokenCount(item.totalTokens)}</div>
        <div className={styles.columnTrack}>
          <span
            className={styles.columnFill}
            style={{
              height: `${maxValue ? Math.max((item.totalTokens / maxValue) * 100, 8) : 0}%`,
            }}
          />
        </div>
        <div className={styles.columnLabel}>{item.agentName}</div>
      </div>
    ))}
  </div>
);

const renderTokenTrendChart = (points: TokenTrendPoint[]): JSX.Element => {
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
        aria-label="企业 Tokens 消耗趋势"
      >
        <polygon className={styles.trendArea} points={areaPoints} />
        <polyline className={styles.trendLine} points={polylinePoints} />
        {linePoints.map(item => (
          <g key={item.label}>
            <circle className={styles.trendPoint} cx={item.x} cy={item.y} r="4" />
            <text className={styles.trendValue} x={item.x} y={item.y - 10}>
              {formatTokenCount(item.value)}
            </text>
            <text className={styles.trendLabel} x={item.x} y={chartHeight - 10}>
              {item.label}
            </text>
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

const renderNameTags = (names: string[]): JSX.Element => (
  <div className={styles.agentTagGroup}>
    {names.map(name => (
      <span key={name} className={styles.agentTag}>
        {name}
      </span>
    ))}
  </div>
);

const renderMembersUsageTable = (summaries: MemberUsageSummary[]): JSX.Element => (
  <div className={adminStyles.consoleHtmlTableWrap}>
    <table className={adminStyles.consoleHtmlTable}>
      <thead>
        <tr>
          <th>成员</th>
          <th>部门</th>
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
              <td>{formatTokenCount(item.totalTokens)}</td>
              <td>{item.callCount.toLocaleString("zh-CN")} 次</td>
              <td>{item.agentCount} 个</td>
              <td>{renderAgentTags(item.agentNames)}</td>
              <td>{item.latestOccurredAt}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={7} className={styles.emptyCell}>
              当前时间范围暂无成员用量记录
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const renderAgentsUsageTable = (summaries: AgentUsageSummary[]): JSX.Element => (
  <div className={adminStyles.consoleHtmlTableWrap}>
    <table className={adminStyles.consoleHtmlTable}>
      <thead>
        <tr>
          <th>AI 专家</th>
          <th>Tokens</th>
          <th>调用次数</th>
          <th>调用成员</th>
          <th>调用成员数</th>
          <th>单次平均 Tokens</th>
        </tr>
      </thead>
      <tbody>
        {summaries.length ? (
          summaries.map(item => (
            <tr key={item.agentName}>
              <td>
                <div className={adminStyles.consoleHtmlTableStrong}>{item.agentName}</div>
              </td>
              <td>{formatTokenCount(item.totalTokens)}</td>
              <td>{item.callCount.toLocaleString("zh-CN")} 次</td>
              <td>{renderNameTags(item.memberNames)}</td>
              <td>{item.memberCount} 人</td>
              <td>
                {item.callCount
                  ? formatTokenCount(Math.round(item.totalTokens / item.callCount))
                  : "-"}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={6} className={styles.emptyCell}>
              当前时间范围暂无 AI 专家用量记录
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

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
  employees,
  tenantSnapshot,
}: TenantOverviewViewProps): JSX.Element => {
  const [activeUsageRange, setActiveUsageRange] = useState<UsageRangeKey>("month");
  const [activeDetailView, setActiveDetailView] = useState<UsageDetailView>(null);
  const isTeamEdition = tenantSnapshot.edition === "team";
  const filteredAgentUsageRecords = useMemo(
    () =>
      tenantSnapshot.agentUsageRecords.filter(record =>
        isAgentUsageRecordInRange(record, activeUsageRange),
      ),
    [activeUsageRange, tenantSnapshot.agentUsageRecords],
  );
  const memberUsageSummaries = useMemo(
    () => buildMemberUsageSummaries(filteredAgentUsageRecords),
    [filteredAgentUsageRecords],
  );
  const agentUsageSummaries = useMemo(
    () => buildAgentUsageSummaries(filteredAgentUsageRecords),
    [filteredAgentUsageRecords],
  );
  const developerSummaries = useMemo(() => buildDeveloperSummaries(employees), [employees]);
  const totalAgentTokens = useMemo(
    () => filteredAgentUsageRecords.reduce((sum, record) => sum + getTotalTokens(record), 0),
    [filteredAgentUsageRecords],
  );
  const totalAgentCalls = useMemo(
    () => filteredAgentUsageRecords.reduce((sum, record) => sum + record.callCount, 0),
    [filteredAgentUsageRecords],
  );
  const tokenTrendPoints = useMemo(
    () => buildTokenTrendPoints(totalAgentTokens, activeUsageRange),
    [activeUsageRange, totalAgentTokens],
  );
  const maxMemberTokens = Math.max(...memberUsageSummaries.map(item => item.totalTokens), 0);
  const maxAgentTokens = Math.max(...agentUsageSummaries.map(item => item.totalTokens), 0);
  const activeUsageRangeLabel =
    USAGE_RANGE_OPTIONS.find(item => item.key === activeUsageRange)?.label ?? "本月";
  const detailTitle =
    activeDetailView === "members"
      ? "成员用量明细"
      : activeDetailView === "agents"
        ? "AI 专家调用明细"
        : "AI 专家开发明细";

  if (activeDetailView) {
    return (
      <div className={adminStyles.consolePage}>
        <header className={adminStyles.consoleHeader}>
          <div className={adminStyles.consoleHeaderMain}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setActiveDetailView(null)}>
              返回总览
            </Button>
            <h1 className={adminStyles.consoleTitle}>{detailTitle}</h1>
            <p className={adminStyles.consoleSubtitle}>
              {activeDetailView === "developers"
                ? `${tenantSnapshot.tenantName} · 全部开发者`
                : `${tenantSnapshot.tenantName} · ${activeUsageRangeLabel}`}
            </p>
          </div>
          {activeDetailView === "developers" ? null : (
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
            </div>
          )}
        </header>

        <section className={adminStyles.consoleSection}>
          {activeDetailView === "members"
            ? renderMembersUsageTable(memberUsageSummaries)
            : activeDetailView === "agents"
              ? renderAgentsUsageTable(agentUsageSummaries)
              : renderDevelopersTable(developerSummaries)}
        </section>
      </div>
    );
  }

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          <h1 className={adminStyles.consoleTitle}>租户总览</h1>
          <p className={adminStyles.consoleSubtitle}>{tenantSnapshot.tenantName}</p>
        </div>
      </header>

      {isTeamEdition ? (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>团队 AI 专家看板</h2>
            </div>
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
            </div>
          </div>

          <div className={adminStyles.consoleSummaryStrip}>
            <div className={adminStyles.consoleSummaryItem}>
              <span className={adminStyles.consoleSummaryLabel}>团队 Tokens</span>
              <span className={adminStyles.consoleSummaryValue}>
                {formatTokenCount(totalAgentTokens)}
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
                  <h3>企业 Tokens 消耗趋势</h3>
                </div>
              </div>
              {renderTokenTrendChart(tokenTrendPoints)}
            </div>
            <div className={`${styles.dashboardPane} ${styles.dashboardPaneAgent}`}>
              <div className={styles.dashboardPaneHeader}>
                <div>
                  <h3>AI 专家消耗排行</h3>
                  <span>按 Tokens</span>
                </div>
                <Button type="link" onClick={() => setActiveDetailView("agents")}>
                  调用明细
                </Button>
              </div>
              {renderAgentColumnChart(
                agentUsageSummaries.slice(0, DASHBOARD_RANK_LIMIT),
                maxAgentTokens,
              )}
            </div>
            <div className={`${styles.dashboardPane} ${styles.dashboardPaneMember}`}>
              <div className={styles.dashboardPaneHeader}>
                <div>
                  <h3>成员用量排行</h3>
                  <span>按 Tokens</span>
                </div>
                <Button type="link" onClick={() => setActiveDetailView("members")}>
                  用量明细
                </Button>
              </div>
              {renderUsageBars(
                memberUsageSummaries.slice(0, DASHBOARD_RANK_LIMIT).map(item => ({
                  label: item.actorName,
                  value: item.totalTokens,
                })),
                maxMemberTokens,
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
