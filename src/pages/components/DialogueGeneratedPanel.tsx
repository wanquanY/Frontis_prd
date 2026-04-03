import classNames from "classnames";
import {
  AlertOutlined,
  BulbFilled,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  LeftOutlined,
  LineChartOutlined,
  RiseOutlined,
  SearchOutlined,
  TeamOutlined,
  TrophyFilled,
  UpOutlined,
  WarningFilled,
} from "@ant-design/icons";

import type {
  DialogueBenchmarkFindPanelState,
  DialogueBenchmarkPersonItem,
  DialogueCeoSynthesisPanelState,
  DialogueDispatchExecutionPanelState,
  DialogueDimensionScoreItem,
  DialogueEmployeeAssessPanelState,
  DialogueFocusPersonItem,
  DialogueGeneratedMetricItem,
  DialogueGeneratedPanelState,
  DialogueGeneratedPanelTone,
  DialogueGeneratedTagItem,
  DialogueRankZoneItem,
  DialogueRedlineDetectPanelState,
  DialogueScoreRankPanelState,
  DialogueSequenceCardItem,
  DialogueSequenceOverviewPanelState,
  DialogueWarningItem,
} from "../types";
import styles from "./DialogueGeneratedPanel.module.less";

interface DialogueGeneratedPanelProps {
  panel: DialogueGeneratedPanelState | null;
  onBack?: () => void;
  onClose?: () => void;
}

const resolveToneClassName = (tone?: DialogueGeneratedPanelTone): string | undefined => {
  if (tone === "positive") return styles.tonePositive;
  if (tone === "warning") return styles.toneWarning;
  if (tone === "danger") return styles.toneDanger;
  if (tone === "accent") return styles.toneAccent;
  return undefined;
};

const getNumericValue = (value: string): number => {
  const parsedValue = Number.parseFloat(value);
  if (Number.isNaN(parsedValue)) {
    return 0;
  }
  return parsedValue;
};

const getAvatarLabel = (name: string, avatarLabel?: string): string =>
  avatarLabel?.trim() || name.trim().charAt(0) || "AI";

const resolveDeltaClassName = (delta: string): string =>
  delta.trim().startsWith("-") ? styles.deltaNegative : styles.deltaPositive;

const resolveMetricIcon = (label: string): JSX.Element => {
  if (label.includes("人员")) return <TeamOutlined />;
  if (label.includes("预警")) return <AlertOutlined />;
  if (label.includes("标杆")) return <TrophyFilled />;
  return <LineChartOutlined />;
};

const resolveRankToneClassName = (rankLabel: string): string | undefined => {
  if (rankLabel === "1") return styles.rankToneGold;
  if (rankLabel === "2") return styles.rankToneSilver;
  if (rankLabel === "3") return styles.rankToneBronze;
  return undefined;
};

const shouldShowRankLabel = (rankLabel: string): boolean => {
  const numericRank = Number.parseInt(rankLabel, 10);
  if (!Number.isFinite(numericRank)) {
    return rankLabel.trim().length > 0;
  }
  return numericRank <= 9;
};

const renderViewerToolbar = (onBack?: () => void, onClose?: () => void): JSX.Element | null => {
  if (!onBack && !onClose) {
    return null;
  }

  return (
    <div className={styles.viewerToolbar}>
      {onBack ? (
        <button
          type="button"
          className={styles.viewerIconButton}
          aria-label="返回结果列表"
          onClick={onBack}
        >
          <LeftOutlined />
        </button>
      ) : null}
      {onClose ? (
        <button
          type="button"
          className={styles.viewerIconButton}
          aria-label="关闭结果面板"
          onClick={onClose}
        >
          <CloseOutlined />
        </button>
      ) : null}
    </div>
  );
};

const renderMetricCard = (item: DialogueGeneratedMetricItem): JSX.Element => (
  <article
    key={item.label}
    className={classNames(styles.overviewMetricCard, resolveToneClassName(item.tone))}
  >
    <span className={styles.overviewMetricIcon}>{resolveMetricIcon(item.label)}</span>
    <div className={styles.overviewMetricBody}>
      <div className={styles.overviewMetricValueRow}>
        <span className={styles.overviewMetricValue}>{item.value}</span>
        {item.delta ? (
          <span className={classNames(styles.overviewMetricDelta, resolveDeltaClassName(item.delta))}>
            {item.delta}
          </span>
        ) : null}
      </div>
      <div className={styles.overviewMetricLabel}>{item.label}</div>
      {item.hint ? <div className={styles.overviewMetricHint}>{item.hint}</div> : null}
    </div>
  </article>
);

const renderTagList = (tags: DialogueGeneratedTagItem[]): JSX.Element => (
  <div className={styles.inlineTagList}>
    {tags.map(tag => (
      <span
        key={tag.label}
        className={classNames(styles.inlineTag, resolveToneClassName(tag.tone))}
      >
        {tag.label}
      </span>
    ))}
  </div>
);

const renderSequenceCard = (item: DialogueSequenceCardItem): JSX.Element => (
  <article key={item.id} className={styles.sequenceBoardCard}>
    <div className={styles.sequenceBoardHeader}>
      <div>
        <div className={styles.sequenceBoardNameRow}>
          <h3 className={styles.sequenceBoardName}>{item.name}</h3>
          <span className={styles.sequenceBoardCount}>{item.peopleLabel}</span>
        </div>
        <div className={styles.sequenceBoardRole}>{item.roleLabel}</div>
      </div>
      <div className={styles.sequenceBoardScoreBlock}>
        <span className={styles.sequenceBoardScore}>{item.score}</span>
        <span className={classNames(styles.sequenceBoardTrend, resolveDeltaClassName(item.trend))}>
          {item.trend}
        </span>
      </div>
    </div>

    <div className={styles.sequenceBoardTagsLabel}>专项评估：</div>
    {renderTagList(item.focusTags)}

    <div className={styles.sequenceBoardFooter}>
      <span className={styles.sequenceBoardMeta}>
        <TrophyFilled />
        <span>{item.benchmarkLabel}</span>
      </span>
      <span className={styles.sequenceBoardMeta}>
        <WarningFilled />
        <span>{item.alertLabel}</span>
      </span>
    </div>
  </article>
);

const renderSequenceOverview = (panel: DialogueSequenceOverviewPanelState): JSX.Element => (
  <div className={styles.mockPage}>
    <div className={styles.mockPageBody}>
      <section className={styles.pageIntro}>
        <h1 className={styles.pageTitle}>序列总览</h1>
        <div className={styles.pageSubtleText}>数据更新时间：2026/02/05 08:00</div>
      </section>

      <div className={styles.overviewMetricGrid}>{panel.payload.summaryMetrics.map(renderMetricCard)}</div>

      <section className={styles.pageFilterRow}>
        <span className={styles.filterLabel}>排序方式：</span>
        <span className={classNames(styles.filterChip, styles.filterChipActive)}>
          {panel.payload.sortLabel}
        </span>
        <span className={styles.filterChip}>得分从低到高</span>
        <span className={styles.filterChip}>预警数量</span>
        <span className={styles.filterChip}>名称</span>
      </section>

      <div className={styles.sequenceBoardGrid}>
        {panel.payload.sequenceCards.map(renderSequenceCard)}
      </div>
    </div>
  </div>
);

const buildRadarPoints = (items: DialogueDimensionScoreItem[]): string => {
  const center = 122;
  const radius = 78;

  return items
    .map((item, index) => {
      const angle = -Math.PI / 2 + (index / items.length) * Math.PI * 2;
      const scoreRatio = Math.max(0.1, Math.min(1, getNumericValue(item.score) / 100));
      const pointRadius = radius * scoreRatio;
      const x = center + Math.cos(angle) * pointRadius;
      const y = center + Math.sin(angle) * pointRadius;
      return `${x},${y}`;
    })
    .join(" ");
};

const renderRadarPolygon = (pointCount: number, ratio: number): string => {
  const center = 122;
  const radius = 78 * ratio;
  return Array.from({ length: pointCount }, (_, index) => {
    const angle = -Math.PI / 2 + (index / pointCount) * Math.PI * 2;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return `${x},${y}`;
  }).join(" ");
};

const renderRadarChart = (items: DialogueDimensionScoreItem[]): JSX.Element => {
  const labels = items.slice(0, 8);

  return (
    <div className={styles.radarChartWrap}>
      <svg viewBox="0 0 244 244" className={styles.radarChart} aria-hidden={true}>
        {[0.25, 0.5, 0.75, 1].map(level => (
          <polygon
            key={level}
            points={renderRadarPolygon(labels.length, level)}
            className={styles.radarGrid}
          />
        ))}
        {labels.map((item, index) => {
          const angle = -Math.PI / 2 + (index / labels.length) * Math.PI * 2;
          const axisX = 122 + Math.cos(angle) * 78;
          const axisY = 122 + Math.sin(angle) * 78;

          return (
            <line
              key={item.id}
              x1="122"
              y1="122"
              x2={axisX}
              y2={axisY}
              className={styles.radarAxis}
            />
          );
        })}
        <polygon points={buildRadarPoints(labels)} className={styles.radarFill} />
        <polygon points={buildRadarPoints(labels)} className={styles.radarStroke} />
        {labels.map((item, index) => {
          const angle = -Math.PI / 2 + (index / labels.length) * Math.PI * 2;
          const pointRadius = 78 * Math.max(0.1, Math.min(1, getNumericValue(item.score) / 100));
          const pointX = 122 + Math.cos(angle) * pointRadius;
          const pointY = 122 + Math.sin(angle) * pointRadius;
          return <circle key={`${item.id}-point`} cx={pointX} cy={pointY} r="3.4" className={styles.radarPoint} />;
        })}
      </svg>

      {labels.map((item, index) => {
        const angle = -Math.PI / 2 + (index / labels.length) * Math.PI * 2;
        const labelX = 122 + Math.cos(angle) * 104;
        const labelY = 122 + Math.sin(angle) * 104;
        const textAnchor =
          Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";

        return (
          <span
            key={`${item.id}-label`}
            className={styles.radarLabel}
            style={
              {
                left: `${labelX}px`,
                top: `${labelY}px`,
                textAlign: textAnchor === "middle" ? "center" : undefined,
                transform:
                  textAnchor === "middle"
                    ? "translate(-50%, -50%)"
                    : textAnchor === "end"
                      ? "translate(-100%, -50%)"
                      : "translate(0, -50%)",
              } as React.CSSProperties
            }
          >
            {item.label}
          </span>
        );
      })}
    </div>
  );
};

const renderEmployeeAssess = (panel: DialogueEmployeeAssessPanelState): JSX.Element => {
  const topScores = [...panel.payload.dimensionScores]
    .sort((left, right) => getNumericValue(right.score) - getNumericValue(left.score))
    .slice(0, 3);

  return (
    <div className={styles.mockPage}>
      <div className={styles.mockPageBody}>
        <div className={styles.assessLayout}>
          <div className={styles.assessSidebar}>
            <section className={styles.assessSurface}>
              <div className={styles.assessProfileRow}>
                <span className={styles.assessAvatar}>{getAvatarLabel(panel.payload.employeeName)}</span>
                <div className={styles.assessProfileMain}>
                  <div className={styles.assessProfileName}>{panel.payload.employeeName}</div>
                  <div className={styles.assessProfileMeta}>
                    {panel.payload.sequenceLabel} | {panel.payload.employeeRole}
                  </div>
                  <div className={styles.assessProfileMeta}>综合评分 {panel.payload.score}</div>
                </div>
              </div>
              {renderRadarChart(panel.payload.dimensionScores)}
            </section>

            <section className={styles.assessSurface}>
              <div className={styles.assessSectionTitle}>红线状态</div>
              <div className={styles.redlineChecklist}>
                {panel.payload.redlineStatuses.map(item => (
                  <article key={item.id} className={styles.redlineChecklistItem}>
                    <span className={styles.redlineChecklistIcon}>
                      <CheckOutlined />
                    </span>
                    <div>
                      <div className={styles.redlineChecklistTitle}>{item.label}</div>
                      <div className={styles.redlineChecklistText}>{item.description}</div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.assessSurface}>
              <div className={styles.assessSectionTitle}>三高评分</div>
              <div className={styles.highScoreList}>
                {topScores.map(item => (
                  <div key={item.id} className={styles.highScoreItem}>
                    <span>{item.label}</span>
                    <span className={classNames(styles.highScoreValue, resolveToneClassName(item.tone))}>
                      {item.score}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className={styles.assessDetailSurface}>
            <div className={styles.assessSectionTitle}>维度详情</div>
            <div className={styles.assessDimensionList}>
              {panel.payload.dimensionScores.map(item => (
                <article key={item.id} className={styles.assessDimensionRow}>
                  <div>
                    <div className={styles.assessDimensionTitleRow}>
                      <span className={styles.assessDimensionTitle}>{item.label}</span>
                      {item.id === "craft" || item.id === "digital" ? (
                        <span className={styles.dimensionSpecialBadge}>专项</span>
                      ) : null}
                    </div>
                    <div className={styles.assessDimensionWeight}>{item.weightLabel}</div>
                  </div>
                  <div className={styles.assessDimensionScoreSide}>
                    <span className={classNames(styles.assessDimensionScore, resolveToneClassName(item.tone))}>
                      {item.score}
                    </span>
                    <span className={classNames(styles.assessDimensionDelta, resolveDeltaClassName(item.delta))}>
                      {item.delta}
                    </span>
                    <DownOutlined className={styles.assessDimensionArrow} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const renderWarningAction = (label: string): JSX.Element => {
  const isDanger = label.includes("立即");
  const isWarning = label.includes("提醒");

  return (
    <button
      key={label}
      type="button"
      className={classNames(styles.warningActionButton, {
        [styles.warningActionButtonDanger]: isDanger,
        [styles.warningActionButtonWarning]: isWarning,
      })}
    >
      {label}
    </button>
  );
};

const renderWarningCard = (item: DialogueWarningItem): JSX.Element => (
  <article key={item.id} className={styles.warningPanelCard}>
    <div className={styles.warningPanelHeader}>
      <div className={styles.warningPersonBlock}>
        <span className={styles.warningAvatar}>{getAvatarLabel(item.name)}</span>
        <div>
          <div className={styles.warningPersonName}>{item.name}</div>
          <div className={styles.warningPersonMeta}>
            {item.sequenceLabel} | {item.roleLabel}
          </div>
        </div>
      </div>
      <div className={styles.warningHeaderRight}>
        <div className={styles.warningLevelRow}>
          <span className={styles.warningLevelBadge}>{item.levelLabel}</span>
          <span className={styles.warningDate}>{item.dateLabel}</span>
        </div>
        <div className={styles.warningScoreText}>{item.score}</div>
      </div>
    </div>

    <div className={styles.warningInfoRow}>
      <span className={styles.warningInfoLabel}>预警原因：</span>
      <span className={styles.warningInfoValue}>{item.reason}</span>
    </div>
    <div className={styles.warningInfoRow}>
      <span className={styles.warningInfoLabel}>关键维度：</span>
      <span className={styles.warningInfoValue}>{item.dimensionLabel}</span>
    </div>

    <div className={styles.warningSuggestionBanner}>
      <BulbFilled />
      <span>{item.suggestion}</span>
    </div>

    <div className={styles.warningActionRow}>{item.actions.map(action => renderWarningAction(action.label))}</div>
  </article>
);

const renderRedlineDetect = (panel: DialogueRedlineDetectPanelState): JSX.Element => (
  <div className={styles.mockPage}>
    <div className={styles.mockPageBody}>
      <section className={styles.timeRangeBar}>
        <span className={styles.filterLabel}>时间范围：</span>
        <span className={styles.filterChip}>近7天</span>
        <span className={classNames(styles.filterChip, styles.filterChipDark)}>近30天</span>
        <span className={styles.filterChip}>近90天</span>
      </section>

      <section className={styles.warningSection}>
        <div className={styles.warningSectionTitleRow}>
          <div className={styles.warningSectionTitle}>
            <span className={styles.warningSectionDot} />
            <span>红色预警</span>
            <span className={styles.warningSectionCount}>{panel.payload.warnings.length}</span>
          </div>
          <UpOutlined className={styles.warningSectionArrow} />
        </div>

        <div className={styles.warningPanelList}>{panel.payload.warnings.map(renderWarningCard)}</div>
      </section>
    </div>
  </div>
);

const renderRankMember = (
  item: DialogueBenchmarkPersonItem,
  options?: { showStory?: boolean; forcePlainRank?: boolean },
): JSX.Element => (
  <article key={item.id} className={styles.rankMemberRow}>
    <div className={styles.rankMemberMain}>
      {shouldShowRankLabel(item.rankLabel) ? (
        <span
          className={classNames(
            styles.rankCircle,
            resolveRankToneClassName(item.rankLabel),
            options?.forcePlainRank ? styles.rankCirclePlain : undefined,
          )}
        >
          {item.rankLabel}
        </span>
      ) : null}
      <span className={styles.rankAvatar}>{getAvatarLabel(item.name, item.avatarLabel)}</span>
      <div className={styles.rankMemberText}>
        <div className={styles.rankMemberNameRow}>
          <span className={styles.rankMemberName}>{item.name}</span>
          <span
            className={classNames(styles.rankMemberDot, resolveToneClassName(item.tone))}
            aria-hidden={true}
          />
        </div>
        <div className={styles.rankMemberMeta}>
          {item.roleLabel} | {item.levelLabel.replace(" · ", " | ")}
        </div>
        {options?.showStory ? <div className={styles.rankMemberStory}>{item.story}</div> : null}
      </div>
    </div>

    <div className={styles.rankMemberScoreSide}>
      <span className={classNames(styles.rankMemberScoreBubble, resolveToneClassName(item.tone))}>
        {item.score}
      </span>
      <span className={classNames(styles.rankMemberDelta, resolveDeltaClassName(item.delta))}>
        {item.delta}
      </span>
    </div>
  </article>
);

const renderZoneCard = (
  zone: DialogueRankZoneItem,
  options?: { showMembersWhenCollapsed?: boolean; showStories?: boolean },
): JSX.Element => {
  const shouldRenderMembers = !zone.collapsed || options?.showMembersWhenCollapsed;

  return (
    <section
      key={zone.id}
      className={classNames(styles.rankZoneCard, resolveToneClassName(zone.tone))}
    >
      <div className={styles.rankZoneHeader}>
        <div className={styles.rankZoneTitle}>
          <span>{zone.title}</span>
          <span className={styles.rankZoneCount}>{zone.countLabel}</span>
        </div>
        {zone.collapsed ? <DownOutlined className={styles.rankZoneArrow} /> : <UpOutlined className={styles.rankZoneArrow} />}
      </div>
      {shouldRenderMembers ? (
        <div className={styles.rankZoneMemberList}>
          {zone.members.map(item => renderRankMember(item, { showStory: options?.showStories }))}
        </div>
      ) : null}
    </section>
  );
};

const renderBenchmarkRanking = (panel: DialogueBenchmarkFindPanelState): JSX.Element => (
  <div className={styles.mockPage}>
    <div className={styles.mockPageBody}>
      <section className={classNames(styles.rankZoneCard, styles.tonePositive)}>
        <div className={styles.rankZoneHeader}>
          <div className={styles.rankZoneTitle}>
            <span>标杆区（≥90分）</span>
            <span className={styles.rankZoneCount}>{panel.payload.benchmarkPeople.length}人</span>
          </div>
        </div>
        <div className={styles.rankZoneMemberList}>
          {panel.payload.benchmarkPeople.map(item => renderRankMember(item))}
        </div>
      </section>

      <section className={classNames(styles.rankZoneCard, styles.toneWarning)}>
        <div className={styles.rankZoneHeader}>
          <div className={styles.rankZoneTitle}>
            <span>中间区（60-89分）</span>
            <span className={styles.rankZoneCount}>{panel.payload.middleZoneCountLabel}</span>
          </div>
          <DownOutlined className={styles.rankZoneArrow} />
        </div>
      </section>

      <section className={classNames(styles.rankZoneCard, styles.toneDanger)}>
        <div className={styles.rankZoneHeader}>
          <div className={styles.rankZoneTitle}>
            <span>关注区（&lt;60分）</span>
            <span className={styles.rankZoneCount}>{panel.payload.attentionPeople.length}人</span>
          </div>
        </div>
        <div className={styles.rankZoneMemberList}>
          {panel.payload.attentionPeople.map(item =>
            renderRankMember(item, { forcePlainRank: true }),
          )}
        </div>
      </section>
    </div>
  </div>
);

const renderBenchmarkAchievement = (panel: DialogueBenchmarkFindPanelState): JSX.Element => (
  <div className={styles.mockPage}>
    <div className={styles.mockPageBody}>
      <div className={styles.achievementList}>
        {panel.payload.benchmarkPeople.map(item => (
          <article key={item.id} className={styles.achievementCard}>
            <div className={styles.achievementHeader}>
              <div className={styles.achievementPerson}>
                <span className={styles.achievementAvatar}>{getAvatarLabel(item.name, item.avatarLabel)}</span>
                <div>
                  <div className={styles.achievementName}>{item.name}</div>
                  <div className={styles.achievementMeta}>
                    {panel.payload.sequenceLabel} | {item.levelLabel.replace(" · ", " | ")}
                  </div>
                </div>
              </div>
              <div className={styles.achievementScoreBlock}>
                <span className={classNames(styles.achievementScore, resolveToneClassName(item.tone))}>
                  {item.score}分
                </span>
                <span className={styles.achievementDate}>{item.dateLabel}</span>
              </div>
            </div>

            <div className={styles.achievementBanner}>
              <TrophyFilled />
              <span>{item.story}</span>
            </div>

            <div className={styles.achievementFoot}>
              <div className={styles.achievementDeltaRow}>
                <span>较上期提升</span>
                <span className={classNames(styles.achievementDelta, resolveDeltaClassName(item.delta))}>
                  {item.delta}
                </span>
              </div>

              <div className={styles.achievementActions}>
                <button type="button" className={styles.achievementPrimaryButton}>
                  👏 公开表扬
                </button>
                <button type="button" className={styles.achievementSecondaryButton}>
                  <SearchOutlined />
                  <span>查看详情</span>
                </button>
              </div>
              <div className={styles.achievementChannelText}>🔔 通知渠道：系统内通知（全体员工）</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  </div>
);

const renderBenchmarkFind = (panel: DialogueBenchmarkFindPanelState): JSX.Element =>
  panel.payload.viewMode === "achievement"
    ? renderBenchmarkAchievement(panel)
    : renderBenchmarkRanking(panel);

const renderScoreHeader = (panel: DialogueScoreRankPanelState): JSX.Element => (
  <>
    <section className={styles.pageHeaderRow}>
      <button type="button" className={styles.backLinkButton}>
        ← 返回总览
      </button>
    </section>

    <section className={styles.scorePageHeading}>
      <div>
        <h1 className={styles.pageTitle}>{panel.payload.sequenceLabel}</h1>
        <div className={styles.scoreMetaRow}>
          <span className={styles.scoreMetaItem}>
            <TeamOutlined />
            <span>{panel.payload.peopleCountLabel}</span>
          </span>
          <span className={styles.scoreMetaItem}>
            <LineChartOutlined />
            <span>平均分: {panel.payload.averageScoreLabel}</span>
          </span>
        </div>
      </div>
      <div className={styles.thresholdTagRow}>
        <span className={classNames(styles.thresholdTag, styles.tonePositive)}>
          标杆线: {panel.payload.benchmarkLineLabel}
        </span>
        <span className={classNames(styles.thresholdTag, styles.toneDanger)}>
          关注线: {panel.payload.attentionLineLabel}
        </span>
      </div>
    </section>

    <section className={styles.dimensionBand}>
      <span className={styles.dimensionBandLabel}>本序列专项评估维度：</span>
      {renderTagList(panel.payload.dimensions)}
    </section>

    <section className={styles.pageFilterRow}>
      <span className={styles.filterLabel}>预警状态：</span>
      <span className={classNames(styles.filterChip, styles.filterChipActive)}>全部</span>
      <span className={styles.filterChip}>红色预警</span>
      <span className={styles.filterChip}>黄色关注</span>
      <span className={styles.filterChip}>绿色达标</span>
      <span className={styles.filterLabel}>职级：</span>
      <span className={classNames(styles.filterChip, styles.filterChipActive)}>全部</span>
      <span className={styles.filterChip}>L7</span>
      <span className={styles.filterChip}>L6</span>
      <span className={styles.filterChip}>L5</span>
      <span className={styles.filterChip}>L4</span>
    </section>
  </>
);

const renderScoreRank = (panel: DialogueScoreRankPanelState): JSX.Element => (
  <div className={styles.mockPage}>
    <div className={styles.mockPageBody}>
      {renderScoreHeader(panel)}
      {panel.payload.zones.map(zone =>
        renderZoneCard(zone, {
          showStories: false,
        }),
      )}
    </div>
  </div>
);

const renderCeoFocusCard = (item: DialogueFocusPersonItem): JSX.Element => (
  <article
    key={item.id}
    className={classNames(styles.ceoFocusCard, resolveToneClassName(item.tone))}
  >
    <div className={styles.ceoFocusCardHeader}>
      <span className={styles.ceoFocusCardTitle}>{item.name}</span>
      <span
        className={classNames(styles.ceoFocusCardDot, resolveToneClassName(item.tone))}
        aria-hidden={true}
      />
    </div>
    <div className={styles.ceoFocusCardSummary}>{item.summary}</div>
  </article>
);

const renderCeoRiskCard = (item: DialogueFocusPersonItem): JSX.Element => (
  <article
    key={item.id}
    className={classNames(styles.ceoRiskCard, resolveToneClassName(item.tone))}
  >
    <div className={styles.ceoRiskHeader}>
      <span className={styles.ceoRiskAvatar}>{getAvatarLabel(item.name)}</span>
      <div>
        <div className={styles.ceoRiskName}>{item.name}</div>
        <div className={styles.ceoRiskLabel}>需要老板过问</div>
      </div>
    </div>
    <div className={styles.ceoRiskSummary}>{item.summary}</div>
  </article>
);

const renderCeoActionItem = (action: string, index: number): JSX.Element => (
  <article key={action} className={styles.ceoActionItem}>
    <span className={styles.ceoActionIndex}>{index + 1}</span>
    <div className={styles.ceoActionText}>{action}</div>
  </article>
);

const renderCeoSynthesis = (panel: DialogueCeoSynthesisPanelState): JSX.Element => {
  const followupPrompts = [...panel.payload.promptSuggestions, ...panel.payload.questionSuggestions];

  return (
    <div className={styles.mockPage}>
      <div className={styles.mockPageBody}>
        <section className={styles.ceoHero}>
          <div className={styles.ceoHeroMetaRow}>
            <span className={styles.ceoHeroBadge}>{panel.skillName}</span>
            <span className={styles.pageSubtleText}>更新时间：{panel.updatedAt}</span>
          </div>
          <h1 className={styles.pageTitle}>CEO 综合研判</h1>
          <div className={styles.ceoHeroHeadline}>一句话定调：{panel.payload.closingLine}</div>
          <div className={styles.ceoHeroSummary}>{panel.subtitle}</div>
        </section>

        <div className={styles.overviewMetricGrid}>
          {panel.payload.summaryMetrics.map(renderMetricCard)}
        </div>

        <div className={styles.ceoBoardGrid}>
          <section className={classNames(styles.ceoSectionSurface, styles.ceoFocusSection)}>
            <div className={styles.ceoSectionHeader}>
              <span className={styles.ceoSectionIcon}>
                <LineChartOutlined />
              </span>
              <div>
                <div className={styles.ceoSectionEyebrow}>盘面重点</div>
                <div className={styles.ceoSectionTitle}>当前必须讲清的经营面</div>
              </div>
            </div>
            <div className={styles.ceoFocusGrid}>
              {panel.payload.focusAreas.map(renderCeoFocusCard)}
            </div>
          </section>

          <section
            className={classNames(
              styles.ceoSectionSurface,
              styles.ceoKeyPersonSurface,
              resolveToneClassName(panel.payload.keyPerson.tone),
            )}
          >
            <div className={styles.ceoSectionHeader}>
              <span className={styles.ceoSectionIcon}>
                <TrophyFilled />
              </span>
              <div>
                <div className={styles.ceoSectionEyebrow}>关键人判断</div>
                <div className={styles.ceoSectionTitle}>当前最值得重点培养的人</div>
              </div>
            </div>

            <div className={styles.ceoKeyPersonCard}>
              <div className={styles.ceoKeyPersonMain}>
                <div className={styles.ceoKeyPersonBadgeRow}>
                  <span className={styles.ceoKeyPersonBadge}>{panel.payload.keyPerson.rankLabel}</span>
                </div>
                <div className={styles.ceoKeyPersonName}>{panel.payload.keyPerson.name}</div>
                <div className={styles.ceoKeyPersonMeta}>
                  {panel.payload.keyPerson.roleLabel} | {panel.payload.keyPerson.levelLabel}
                </div>
                <div className={styles.ceoKeyPersonStory}>{panel.payload.keyPerson.story}</div>
              </div>
              <div className={styles.ceoKeyPersonScoreSide}>
                <span
                  className={classNames(
                    styles.ceoKeyPersonScore,
                    resolveToneClassName(panel.payload.keyPerson.tone),
                  )}
                >
                  {panel.payload.keyPerson.score}
                </span>
                <span
                  className={classNames(
                    styles.ceoKeyPersonDelta,
                    resolveDeltaClassName(panel.payload.keyPerson.delta),
                  )}
                >
                  {panel.payload.keyPerson.delta}
                </span>
              </div>
            </div>
          </section>

          <section className={classNames(styles.ceoSectionSurface, styles.ceoActionSection)}>
            <div className={styles.ceoSectionHeader}>
              <span className={styles.ceoSectionIcon}>
                <AlertOutlined />
              </span>
              <div>
                <div className={styles.ceoSectionEyebrow}>风险收口</div>
                <div className={styles.ceoSectionTitle}>今天不能混在普通关注区里的问题</div>
              </div>
            </div>
            <div className={styles.ceoRiskList}>
              {panel.payload.risks.map(renderCeoRiskCard)}
            </div>
          </section>

          <section className={styles.ceoSectionSurface}>
            <div className={styles.ceoSectionHeader}>
              <span className={styles.ceoSectionIcon}>
                <BulbFilled />
              </span>
              <div>
                <div className={styles.ceoSectionEyebrow}>管理动作</div>
                <div className={styles.ceoSectionTitle}>老板今天可以直接交办的事</div>
              </div>
            </div>
            <div className={styles.ceoActionList}>
              {panel.payload.actionItems.map(renderCeoActionItem)}
            </div>
          </section>
        </div>

        <section className={styles.ceoFollowupSurface}>
          <div className={styles.ceoSectionHeader}>
            <span className={styles.ceoSectionIcon}>
              <RiseOutlined />
            </span>
            <div>
              <div className={styles.ceoSectionEyebrow}>继续追问</div>
              <div className={styles.ceoSectionTitle}>下一步建议继续往下 drill-down 的方向</div>
            </div>
          </div>
          <div className={styles.ceoPromptList}>
            {followupPrompts.map(item => (
              <span key={item} className={styles.ceoPromptChip}>
                {item}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const renderDispatchExecution = (panel: DialogueDispatchExecutionPanelState): JSX.Element => {
  const isGroupConversation = panel.payload.recipients.length > 1;
  const primaryRecipient = panel.payload.recipients[0];
  const headerTitle = isGroupConversation ? "今日经营收口群" : primaryRecipient?.name ?? "飞书会话";
  const headerSubtitle = isGroupConversation
    ? `${panel.payload.recipients.map(item => item.name).join("、")} · 近两天消息`
    : `${primaryRecipient?.roleLabel ?? "负责人"} · 近两天消息`;

  return (
    <div className={styles.dispatchPanelPage}>
      <div className={styles.dispatchChatSurface}>
        <div className={styles.dispatchChatHeader}>
          <div className={styles.dispatchChatHeaderMain}>
            <span className={styles.dispatchChatHeaderAvatar}>
              {isGroupConversation ? "群" : primaryRecipient?.name.slice(0, 1)}
            </span>
            <div>
              <div className={styles.dispatchChatHeaderTitle}>{headerTitle}</div>
              <div className={styles.dispatchChatHeaderSubtitle}>{headerSubtitle}</div>
            </div>
          </div>
          <span className={styles.dispatchChatHeaderStatus}>
            {panel.status === "running" ? "发送中" : "已同步"}
          </span>
        </div>

        <div className={styles.dispatchConversationList}>
          {panel.payload.conversationItems.map(item => {
            if (item.direction === "system") {
              return (
                <div key={item.id} className={styles.dispatchChatSystemRow}>
                  <span className={styles.dispatchChatSystemBadge}>{item.summary}</span>
                </div>
              );
            }

            const isOutgoing = item.direction !== "incoming";

            return (
              <div
                key={item.id}
                className={classNames(styles.dispatchChatMessageRow, {
                  [styles.dispatchChatMessageRowOutgoing]: isOutgoing,
                })}
              >
                {!isOutgoing ? (
                  <span className={styles.dispatchChatMessageAvatar}>
                    {item.avatarLabel ?? item.actorLabel.slice(0, 1)}
                  </span>
                ) : null}

                <div
                  className={classNames(styles.dispatchChatMessageMain, {
                    [styles.dispatchChatMessageMainOutgoing]: isOutgoing,
                  })}
                >
                  <div
                    className={classNames(styles.dispatchChatMessageMeta, {
                      [styles.dispatchChatMessageMetaOutgoing]: isOutgoing,
                    })}
                  >
                    <span className={styles.dispatchChatMessageName}>{item.actorLabel}</span>
                    {item.tagLabel ? (
                      <span className={styles.dispatchChatMessageTag}>{item.tagLabel}</span>
                    ) : null}
                  </div>

                  <article
                    className={classNames(styles.dispatchChatMessageBubble, {
                      [styles.dispatchChatMessageBubbleOutgoing]: isOutgoing,
                      [styles.dispatchChatMessageBubbleIncoming]: !isOutgoing,
                    })}
                  >
                    <div className={styles.dispatchChatMessageText}>{item.summary}</div>
                    {item.detail ? (
                      <div className={styles.dispatchChatMessageDetail}>{item.detail}</div>
                    ) : null}
                  </article>

                  <div
                    className={classNames(styles.dispatchChatMessageFoot, {
                      [styles.dispatchChatMessageFootOutgoing]: isOutgoing,
                    })}
                  >
                    {item.timeLabel ? (
                      <span className={styles.dispatchChatMessageTime}>{item.timeLabel}</span>
                    ) : null}
                    {item.edited ? (
                      <span className={styles.dispatchChatMessageEdited}>已编辑</span>
                    ) : null}
                    {item.statusLabel ? (
                      <span className={styles.dispatchChatMessageStatus}>{item.statusLabel}</span>
                    ) : null}
                  </div>
                </div>

                {isOutgoing ? (
                  <span
                    className={classNames(
                      styles.dispatchChatMessageAvatar,
                      styles.dispatchChatMessageAvatarOutgoing,
                    )}
                  >
                    {item.avatarLabel ?? item.actorLabel.slice(0, 1)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const renderPanelBody = (
  panel: DialogueGeneratedPanelState,
  onClose?: () => void,
): JSX.Element => {
  if (panel.kind === "sequenceOverview") {
    return renderSequenceOverview(panel);
  }
  if (panel.kind === "employeeAssess") {
    return renderEmployeeAssess(panel);
  }
  if (panel.kind === "redlineDetect") {
    return renderRedlineDetect(panel);
  }
  if (panel.kind === "benchmarkFind") {
    return renderBenchmarkFind(panel);
  }
  if (panel.kind === "scoreRank") {
    return renderScoreRank(panel);
  }
  if (panel.kind === "dispatchExecution") {
    return renderDispatchExecution(panel);
  }
  return renderCeoSynthesis(panel);
};

/**
 * 对话场景的生成式右侧面板。
 */
export const DialogueGeneratedPanel = ({
  panel,
  onBack,
  onClose,
}: DialogueGeneratedPanelProps): JSX.Element => {
  if (!panel) {
    return (
      <aside className={styles.panel}>
        <div className={styles.emptyState}>
          <RiseOutlined className={styles.emptyStateIcon} />
          <div className={styles.emptyStateTitle}>结果将在这里展开</div>
          <div className={styles.emptyStateText}>
            当 agent 调用 skill 并拿到结构化结果后，这里会生成对应的交互式面板。
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.panel} aria-label="结果面板">
      {renderViewerToolbar(onBack, onClose)}
      <div className={styles.viewport}>{renderPanelBody(panel, onClose)}</div>
    </aside>
  );
};
