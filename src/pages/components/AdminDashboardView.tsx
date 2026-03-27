import { useMemo, useState } from "react";

import classNames from "classnames";
import { Select, Tag } from "antd";

import styles from "./FrontisWebViews.module.less";
import {
  buildDashboardFunnelSteps,
  buildDashboardHeatmap,
  buildDashboardMetricCards,
  buildDashboardRankingRows,
  buildDashboardTaskRows,
  buildDashboardTimeline,
  buildResultRecords,
  DASHBOARD_GRANULARITY_OPTIONS,
  DASHBOARD_LINE_CHART_HEIGHT,
  DASHBOARD_LINE_CHART_PADDING,
  DASHBOARD_LINE_CHART_WIDTH,
  DASHBOARD_PRD_OPTIONS,
  DASHBOARD_TIME_RANGE_OPTIONS,
  resolveDashboardPrdOption,
} from "./FrontisWebViews";
import type {
  AdminDashboardViewProps,
  DashboardGranularity,
  DashboardPrdKey,
  DashboardRankingDimension,
  DashboardTimeRange,
} from "./FrontisWebViews";

/**
 * 数据看板视图。
 */
export const AdminDashboardView = ({
  artifactsBySession,
  dialogueSessions,
  employees,
  users,
}: AdminDashboardViewProps): JSX.Element => {
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>("month");
  const [granularity, setGranularity] = useState<DashboardGranularity>("day");
  const [selectedPrdKey, setSelectedPrdKey] = useState<DashboardPrdKey>("frontis-web-v01");
  const [rankingDimension, setRankingDimension] = useState<DashboardRankingDimension>("agent");
  const resultRecords = useMemo(
    () => buildResultRecords(artifactsBySession, dialogueSessions, employees),
    [artifactsBySession, dialogueSessions, employees],
  );
  const selectedPrdOption = useMemo(
    () => resolveDashboardPrdOption(selectedPrdKey),
    [selectedPrdKey],
  );
  const activeUserCount = useMemo(() => {
    const baseActiveUsers = users.filter(item => item.dialogueCount > 0).length;
    const timeFactorMap: Record<DashboardTimeRange, number> = {
      month: 1,
      quarter: 1.08,
      today: 0.78,
      week: 0.92,
    };
    return Math.max(
      1,
      Math.min(
        users.length,
        Math.round(
          baseActiveUsers *
            timeFactorMap[timeRange] *
            Math.min(1.08, selectedPrdOption.activityMultiplier),
        ),
      ),
    );
  }, [selectedPrdOption.activityMultiplier, timeRange, users]);
  const dashboardTimeline = useMemo(
    () => buildDashboardTimeline(resultRecords, timeRange, granularity, selectedPrdOption, users),
    [granularity, resultRecords, selectedPrdOption, timeRange, users],
  );
  const metricCards = useMemo(
    () =>
      buildDashboardMetricCards(
        activeUserCount,
        timeRange,
        dashboardTimeline,
        users.length,
        selectedPrdKey,
      ),
    [activeUserCount, dashboardTimeline, selectedPrdKey, timeRange, users.length],
  );
  const rankingRows = useMemo(
    () =>
      buildDashboardRankingRows(
        rankingDimension,
        dialogueSessions,
        employees,
        selectedPrdOption,
        resultRecords,
        timeRange,
        users,
      ),
    [
      dialogueSessions,
      employees,
      rankingDimension,
      resultRecords,
      selectedPrdOption,
      timeRange,
      users,
    ],
  );
  const taskRows = useMemo(
    () => buildDashboardTaskRows(employees, selectedPrdOption, resultRecords, timeRange),
    [employees, resultRecords, selectedPrdOption, timeRange],
  );
  const funnelSteps = useMemo(
    () => buildDashboardFunnelSteps(activeUserCount, timeRange, users.length),
    [activeUserCount, timeRange, users.length],
  );
  const heatmapRows = useMemo(
    () => buildDashboardHeatmap(activeUserCount, selectedPrdOption, dashboardTimeline),
    [activeUserCount, dashboardTimeline, selectedPrdOption],
  );
  const rankingMaxValue = rankingRows[0]?.value ?? 1;
  const totalDialogueTasks = dashboardTimeline.reduce((sum, item) => sum + item.dialogues, 0);
  const totalAutomationTasks = dashboardTimeline.reduce(
    (sum, item) => sum + item.automationTasks,
    0,
  );
  const totalTaskCount = totalDialogueTasks + totalAutomationTasks;
  const totalResultCount = dashboardTimeline.reduce((sum, item) => sum + item.results, 0);
  const averageResultCount = Number(
    (totalResultCount / Math.max(1, dashboardTimeline.length)).toFixed(1),
  );
  const dialogueTaskRatio = totalTaskCount > 0 ? totalDialogueTasks / totalTaskCount : 0;
  const donutAngle = Math.round(dialogueTaskRatio * 360);
  const workloadMaxValue = Math.max(
    1,
    ...dashboardTimeline.map(item => item.dialogues + item.automationTasks),
  );
  const resultMaxValue = Math.max(1, ...dashboardTimeline.map(item => item.results));
  const peakResultPoint = dashboardTimeline.reduce(
    (current, item) => (item.results > current.results ? item : current),
    dashboardTimeline[0] ?? {
      automationTasks: 0,
      cost: 0,
      dialogues: 0,
      label: "",
      results: 0,
      tokens: 0,
    },
  );
  const tokenMaxValue = Math.max(1, ...dashboardTimeline.map(item => item.tokens));
  const costMaxValue = Math.max(1, ...dashboardTimeline.map(item => item.cost));
  const tokenCoordinates = useMemo(
    () =>
      dashboardTimeline.map((item, index) => {
        const usableWidth =
          DASHBOARD_LINE_CHART_WIDTH -
          DASHBOARD_LINE_CHART_PADDING.left -
          DASHBOARD_LINE_CHART_PADDING.right;
        const usableHeight =
          DASHBOARD_LINE_CHART_HEIGHT -
          DASHBOARD_LINE_CHART_PADDING.top -
          DASHBOARD_LINE_CHART_PADDING.bottom;
        const x =
          DASHBOARD_LINE_CHART_PADDING.left +
          (dashboardTimeline.length === 1
            ? 0
            : (usableWidth / (dashboardTimeline.length - 1)) * index);
        const y =
          DASHBOARD_LINE_CHART_PADDING.top +
          usableHeight -
          (item.tokens / tokenMaxValue) * usableHeight;
        return {
          label: item.label,
          value: item.tokens,
          x,
          y,
        };
      }),
    [dashboardTimeline, tokenMaxValue],
  );
  const costCoordinates = useMemo(
    () =>
      dashboardTimeline.map((item, index) => {
        const usableWidth =
          DASHBOARD_LINE_CHART_WIDTH -
          DASHBOARD_LINE_CHART_PADDING.left -
          DASHBOARD_LINE_CHART_PADDING.right;
        const usableHeight =
          DASHBOARD_LINE_CHART_HEIGHT -
          DASHBOARD_LINE_CHART_PADDING.top -
          DASHBOARD_LINE_CHART_PADDING.bottom;
        const x =
          DASHBOARD_LINE_CHART_PADDING.left +
          (dashboardTimeline.length === 1
            ? 0
            : (usableWidth / (dashboardTimeline.length - 1)) * index);
        const y =
          DASHBOARD_LINE_CHART_PADDING.top +
          usableHeight -
          (item.cost / costMaxValue) * usableHeight;
        return {
          label: item.label,
          value: item.cost,
          x,
          y,
        };
      }),
    [costMaxValue, dashboardTimeline],
  );
  const tokenPolyline = tokenCoordinates.map(item => `${item.x},${item.y}`).join(" ");
  const costPolyline = costCoordinates.map(item => `${item.x},${item.y}`).join(" ");
  const tokenAreaPath = tokenCoordinates.length
    ? `M ${tokenCoordinates[0]?.x ?? DASHBOARD_LINE_CHART_PADDING.left} ${DASHBOARD_LINE_CHART_HEIGHT - DASHBOARD_LINE_CHART_PADDING.bottom} L ${tokenCoordinates
        .map(item => `${item.x} ${item.y}`)
        .join(
          " L ",
        )} L ${tokenCoordinates[tokenCoordinates.length - 1]?.x ?? DASHBOARD_LINE_CHART_PADDING.left} ${DASHBOARD_LINE_CHART_HEIGHT - DASHBOARD_LINE_CHART_PADDING.bottom} Z`
    : "";
  const highlightTokenPoint = tokenCoordinates.reduce(
    (current, item) => (item.value > current.value ? item : current),
    tokenCoordinates[0] ?? { label: "", value: 0, x: 0, y: 0 },
  );
  const formatDeltaLabel = (delta: number): string => `${delta > 0 ? "+" : ""}${delta}% vs 上期`;
  const rankingTitle = rankingDimension === "agent" ? "Token 消耗排行" : "员工消耗排行";
  const rankingDescription =
    rankingDimension === "agent" ? "按 Agent 观察成本集中在哪些岗位。" : "切到员工维度后可以看到实际使用负载。";

  return (
    <div className={styles.view}>
      <section className={styles.heroCard}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>数据看板</span>
          <h2 className={styles.heroTitle}>从成本、工作量、采纳率到交付产出，重建可视化 dashboard</h2>
          <p className={styles.heroDescription}>
            参考你提供的 PRD `4.1 数据看板`，当前页面已经支持按时间范围、数据粒度和 PRD 文档联动切换，图表会跟随筛选一起更新。
          </p>
        </div>
        <div className={styles.dashboardHeroAside}>
          <div className={styles.dashboardHeroChip}>PRD 口径：{selectedPrdOption.label}</div>
          <div className={styles.dashboardHeroChip}>
            时间范围：{DASHBOARD_TIME_RANGE_OPTIONS.find(item => item.value === timeRange)?.label}
          </div>
          <div className={styles.dashboardHeroChip}>
            数据粒度：
            {DASHBOARD_GRANULARITY_OPTIONS.find(item => item.value === granularity)?.label}
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>全局筛选</div>
            <div className={styles.sectionDescription}>所有图表和汇总卡片会联动响应当前筛选条件。</div>
          </div>
        </div>
        <div className={styles.dashboardFilterBar}>
          <Select
            className={styles.dashboardFilterSelect}
            options={DASHBOARD_TIME_RANGE_OPTIONS}
            value={timeRange}
            onChange={value => setTimeRange(value as DashboardTimeRange)}
          />
          <Select
            className={styles.dashboardFilterSelect}
            options={DASHBOARD_GRANULARITY_OPTIONS}
            value={granularity}
            onChange={value => setGranularity(value as DashboardGranularity)}
          />
          <Select
            className={styles.dashboardFilterSelectWide}
            options={DASHBOARD_PRD_OPTIONS.map(item => ({
              label: item.label,
              value: item.key,
            }))}
            value={selectedPrdKey}
            onChange={value => setSelectedPrdKey(value as DashboardPrdKey)}
          />
        </div>

        <div className={styles.dashboardMetricGrid}>
          {metricCards.map(item => (
            <article key={item.label} className={styles.summaryCard}>
              <div className={styles.dashboardMetricHeader}>
                <span className={styles.summaryLabel}>{item.label}</span>
                <span
                  className={classNames(styles.dashboardMetricDelta, {
                    [styles.dashboardMetricDeltaNegative]: item.delta < 0,
                  })}
                >
                  {formatDeltaLabel(item.delta)}
                </span>
              </div>
              <strong className={styles.summaryValue}>{item.value}</strong>
              <span className={styles.summaryHint}>{item.hint}</span>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.dashboardGrid}>
        <section className={classNames(styles.sectionCard, styles.dashboardPanelWide)}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>Token 消耗趋势</div>
              <div className={styles.sectionDescription}>折线叠加 Token 与费用，异常峰值会直接高亮显示。</div>
            </div>
            <Tag bordered={false} className={styles.primaryTag}>
              {selectedPrdOption.label}
            </Tag>
          </div>
          <div className={styles.dashboardChartWrap}>
            <div className={styles.dashboardLegend}>
              <span className={styles.dashboardLegendItem}>
                <span className={classNames(styles.dashboardLegendDot, styles.dashboardLegendDotPrimary)} />
                Token
              </span>
              <span className={styles.dashboardLegendItem}>
                <span className={classNames(styles.dashboardLegendDot, styles.dashboardLegendDotSecondary)} />
                费用
              </span>
              <span className={styles.dashboardLegendHighlight}>
                峰值 {highlightTokenPoint.label} · {highlightTokenPoint.value.toLocaleString()} Tokens
              </span>
            </div>
            <svg
              className={styles.dashboardLineChart}
              viewBox={`0 0 ${DASHBOARD_LINE_CHART_WIDTH} ${DASHBOARD_LINE_CHART_HEIGHT}`}
              role="img"
              aria-label="Token 消耗趋势图"
            >
              <defs>
                <linearGradient id="dashboardTokenArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {Array.from({ length: 4 }, (_, index) => {
                const y =
                  DASHBOARD_LINE_CHART_PADDING.top +
                  ((DASHBOARD_LINE_CHART_HEIGHT -
                    DASHBOARD_LINE_CHART_PADDING.top -
                    DASHBOARD_LINE_CHART_PADDING.bottom) /
                    3) *
                    index;
                return (
                  <line
                    key={`grid-${y}`}
                    className={styles.dashboardGridLine}
                    x1={DASHBOARD_LINE_CHART_PADDING.left}
                    x2={DASHBOARD_LINE_CHART_WIDTH - DASHBOARD_LINE_CHART_PADDING.right}
                    y1={y}
                    y2={y}
                  />
                );
              })}
              <path className={styles.dashboardAreaPath} d={tokenAreaPath} fill="url(#dashboardTokenArea)" />
              <polyline className={styles.dashboardPrimaryLine} points={tokenPolyline} />
              <polyline className={styles.dashboardSecondaryLine} points={costPolyline} />
              {tokenCoordinates.map(item => (
                <g key={item.label}>
                  <circle className={styles.dashboardPrimaryPoint} cx={item.x} cy={item.y} r="4" />
                  <text className={styles.dashboardAxisLabel} x={item.x} y={DASHBOARD_LINE_CHART_HEIGHT - 8}>
                    {item.label}
                  </text>
                </g>
              ))}
              <circle className={styles.dashboardHighlightRing} cx={highlightTokenPoint.x} cy={highlightTokenPoint.y} r="8" />
            </svg>
          </div>
        </section>

        <section className={classNames(styles.sectionCard, styles.dashboardPanelSide)}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>{rankingTitle}</div>
              <div className={styles.sectionDescription}>{rankingDescription}</div>
            </div>
          </div>
          <div className={styles.dashboardToggleGroup}>
            {[
              { label: "按 Agent", value: "agent" as const },
              { label: "按员工", value: "user" as const },
            ].map(item => (
              <button
                key={item.value}
                type="button"
                className={classNames(styles.dashboardToggleButton, {
                  [styles.dashboardToggleButtonActive]: rankingDimension === item.value,
                })}
                onClick={() => setRankingDimension(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className={styles.dashboardRankingList}>
            {rankingRows.map(item => (
              <div key={item.id} className={styles.dashboardRankingRow}>
                <div className={styles.dashboardRankingHeader}>
                  <div className={styles.tableTitle}>{item.label}</div>
                  <div className={styles.tableValue}>{item.valueLabel}</div>
                </div>
                <div className={styles.tableMeta}>{item.meta}</div>
                <div className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{ width: `${Math.max(14, (item.value / rankingMaxValue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={classNames(styles.sectionCard, styles.dashboardPanelWide)}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>工作量分析</div>
              <div className={styles.sectionDescription}>用堆叠柱状图对比每个时间片里的对话任务和自动化任务占比。</div>
            </div>
          </div>
          <div className={styles.dashboardStackedChart}>
            {dashboardTimeline.map(item => (
              <div key={item.label} className={styles.dashboardStackedColumn}>
                <div className={styles.dashboardStackedValue}>
                  {(item.dialogues + item.automationTasks).toLocaleString()}
                </div>
                <div className={styles.dashboardStackedBars}>
                  <span
                    className={styles.dashboardStackedBarPrimary}
                    style={{
                      height: `${Math.max(
                        8,
                        ((item.dialogues + item.automationTasks) / workloadMaxValue) * 100,
                      )}%`,
                    }}
                  >
                    <span
                      className={styles.dashboardStackedBarSecondary}
                      style={{
                        height: `${Math.max(
                          12,
                          (item.automationTasks / Math.max(1, item.dialogues + item.automationTasks)) * 100,
                        )}%`,
                      }}
                    />
                  </span>
                </div>
                <div className={styles.dashboardStackedLabel}>{item.label}</div>
              </div>
            ))}
          </div>
          <div className={styles.dashboardLegend}>
            <span className={styles.dashboardLegendItem}>
              <span className={classNames(styles.dashboardLegendDot, styles.dashboardLegendDotPrimary)} />
              对话任务
            </span>
            <span className={styles.dashboardLegendItem}>
              <span className={classNames(styles.dashboardLegendDot, styles.dashboardLegendDotAccent)} />
              自动化任务
            </span>
            <span className={styles.dashboardLegendHighlight}>成果产出 {totalResultCount} 份</span>
          </div>
        </section>

        <section className={classNames(styles.sectionCard, styles.dashboardPanelSide)}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>任务完成量分布</div>
              <div className={styles.sectionDescription}>区分对话任务与自动化任务，再看各 Agent 的完成情况。</div>
            </div>
          </div>
          <div className={styles.dashboardDonutRow}>
            <div
              className={styles.dashboardDonut}
              style={{
                background: `conic-gradient(var(--primary) 0 ${donutAngle}deg, color-mix(in srgb, var(--text) 10%, var(--surface)) ${donutAngle}deg 360deg)`,
              }}
            >
              <div className={styles.dashboardDonutInner}>
                <div className={styles.dashboardDonutValue}>{totalTaskCount}</div>
                <div className={styles.dashboardDonutLabel}>任务总量</div>
              </div>
            </div>
            <div className={styles.dashboardDonutMeta}>
              <div className={styles.dashboardDonutMetaRow}>
                <span className={classNames(styles.dashboardLegendDot, styles.dashboardLegendDotPrimary)} />
                对话任务 {totalDialogueTasks}
              </div>
              <div className={styles.dashboardDonutMetaRow}>
                <span className={classNames(styles.dashboardLegendDot, styles.dashboardLegendDotAccent)} />
                自动化任务 {totalAutomationTasks}
              </div>
            </div>
          </div>
          <div className={styles.dashboardMiniList}>
            {taskRows.map(item => (
              <div key={item.id} className={styles.dashboardMiniRow}>
                <div className={styles.dashboardRankingHeader}>
                  <div className={styles.tableTitle}>{item.name}</div>
                  <div className={styles.tableValue}>{item.total}</div>
                </div>
                <div className={styles.tableMeta}>成功 {item.success} 次 · 失败 {item.failed} 次</div>
              </div>
            ))}
          </div>
        </section>

        <section className={classNames(styles.sectionCard, styles.dashboardPanelWide)}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>活跃时段热力图</div>
              <div className={styles.sectionDescription}>按一周 7 天和 24 小时分布对话密度，查看员工真正会在什么时间用 AI。</div>
            </div>
          </div>
          <div className={styles.dashboardHeatmap}>
            <div className={styles.dashboardHeatmapHeader}>
              <span className={styles.dashboardHeatmapHeaderCell} />
              {Array.from({ length: 24 }, (_, hour) => (
                <span key={`hour-${hour}`} className={styles.dashboardHeatmapHeaderCell}>
                  {hour % 4 === 0 ? hour : ""}
                </span>
              ))}
            </div>
            {heatmapRows.map(row => (
              <div key={row.dayLabel} className={styles.dashboardHeatmapRow}>
                <span className={styles.dashboardHeatmapDay}>{row.dayLabel}</span>
                {row.cells.map(cell => (
                  <span
                    key={`${row.dayLabel}-${cell.hourLabel}`}
                    className={styles.dashboardHeatmapCell}
                    style={{ opacity: 0.18 + cell.intensity * 0.82 }}
                    title={`${row.dayLabel} ${cell.hourLabel} · ${cell.count} 次对话`}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className={classNames(styles.sectionCard, styles.dashboardPanelSide)}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>员工采纳漏斗</div>
              <div className={styles.sectionDescription}>帮助老板判断 AI 落地推广是否真的被用起来了。</div>
            </div>
          </div>
          <div className={styles.dashboardFunnel}>
            {funnelSteps.map(item => (
              <div key={item.label} className={styles.dashboardFunnelRow}>
                <div className={styles.dashboardRankingHeader}>
                  <div className={styles.tableTitle}>{item.label}</div>
                  <div className={styles.tableValue}>{item.value}</div>
                </div>
                <div className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${Math.max(18, (item.value / Math.max(1, funnelSteps[0]?.value ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
                <div className={styles.tableMeta}>{item.hint}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={classNames(styles.sectionCard, styles.dashboardPanelFull)}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={styles.sectionTitle}>成果产出数量</div>
              <div className={styles.sectionDescription}>只按时间维度统计成果数量，不再展开文件明细，方便直接判断当前周期的交付节奏。</div>
            </div>
            <Tag bordered={false} className={styles.lightTag}>
              当前维度：{selectedPrdOption.label} · {DASHBOARD_GRANULARITY_OPTIONS.find(item => item.value === granularity)?.label}
            </Tag>
          </div>
          <div className={styles.dashboardDocumentStats}>
            <article className={styles.dashboardMicroCard}>
              <span className={styles.summaryLabel}>当期成果总数</span>
              <strong className={styles.dashboardMicroValue}>{totalResultCount}</strong>
            </article>
            <article className={styles.dashboardMicroCard}>
              <span className={styles.summaryLabel}>单个时间片均值</span>
              <strong className={styles.dashboardMicroValue}>{averageResultCount}</strong>
            </article>
            <article className={styles.dashboardMicroCard}>
              <span className={styles.summaryLabel}>峰值时间片</span>
              <strong className={styles.dashboardMicroValue}>
                {peakResultPoint.label || "--"} / {peakResultPoint.results}
              </strong>
            </article>
          </div>
          <div className={styles.dashboardResultTimeline}>
            {dashboardTimeline.map(item => (
              <div key={`result-${item.label}`} className={styles.dashboardResultColumn}>
                <div className={styles.dashboardStackedValue}>{item.results}</div>
                <div className={styles.dashboardResultBarTrack}>
                  <span
                    className={styles.dashboardResultBar}
                    style={{ height: `${Math.max(10, (item.results / resultMaxValue) * 100)}%` }}
                  />
                </div>
                <div className={styles.dashboardStackedLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
