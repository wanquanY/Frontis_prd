import { useMemo } from "react";

import classNames from "classnames";
import { Empty, Progress } from "antd";

import type { FdeOpportunityItem, FdeTeamMemberItem } from "@/feature/fde/types";
import {
  FDE_OPPORTUNITY_STAGE_ORDER,
  formatWanAmount,
  getFdeMemberName,
} from "@/feature/fde/utils";

import styles from "./FdeOpportunityWorkbench.module.less";

interface FdeOpportunityWorkbenchProps {
  items: FdeOpportunityItem[];
  members: FdeTeamMemberItem[];
  selectedOpportunityId: string;
  setSelectedOpportunityId: (opportunityId: string) => void;
}

const getStageClassName = (stage: string): string => {
  if (stage === "初步沟通") {
    return styles.stageBlue;
  }

  if (stage === "产品演示") {
    return styles.stagePurple;
  }

  if (stage === "方案推荐") {
    return styles.stageAmber;
  }

  if (stage === "商务谈判") {
    return styles.stageGreen;
  }

  return styles.stageRose;
};

/**
 * 商机工作台。
 */
export const FdeOpportunityWorkbench = ({
  items,
  members,
  selectedOpportunityId,
  setSelectedOpportunityId,
}: FdeOpportunityWorkbenchProps): JSX.Element => {
  const stageGroups = useMemo(
    () =>
      FDE_OPPORTUNITY_STAGE_ORDER.map(stage => ({
        items: items.filter(item => item.stage === stage),
        stage,
      })),
    [items],
  );
  const selectedOpportunity = useMemo(
    () => items.find(item => item.id === selectedOpportunityId) ?? items[0] ?? null,
    [items, selectedOpportunityId],
  );
  const totalAmount = useMemo(
    () => items.reduce((total, item) => total + item.amountWan, 0),
    [items],
  );
  const convertedAmount = useMemo(
    () =>
      items
        .filter(item => item.stage === "已成交")
        .reduce((total, item) => total + item.amountWan, 0),
    [items],
  );
  const averageWinRate = useMemo(() => {
    if (!items.length) {
      return 0;
    }

    return Math.round(items.reduce((total, item) => total + item.winRate, 0) / items.length);
  }, [items]);
  const currentMonthLeads = useMemo(() => items.length + 9, [items.length]);
  const topOpportunities = useMemo(
    () => [...items].sort((left, right) => right.amountWan - left.amountWan).slice(0, 5),
    [items],
  );

  if (!items.length) {
    return <Empty description="当前视角下暂无商机数据" />;
  }

  return (
    <div className={styles.workbench}>
      <section className={styles.metricGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>商机总金额</span>
          <strong className={styles.metricValue}>{formatWanAmount(totalAmount)}</strong>
          <span className={styles.metricHint}>覆盖官网咨询、转介绍和服务页留资</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>已成交金额</span>
          <strong className={styles.metricValue}>{formatWanAmount(convertedAmount)}</strong>
          <span className={styles.metricHint}>正式转单后自动进入配置交付</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>平均胜率</span>
          <strong className={styles.metricValue}>{averageWinRate}%</strong>
          <span className={styles.metricHint}>按当前负责人评估口径推算</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>本月新增商机</span>
          <strong className={styles.metricValue}>{currentMonthLeads}</strong>
          <span className={styles.metricHint}>包含线索转商机和直接入池商机</span>
        </article>
      </section>

      <section className={styles.kanbanSection}>
        {stageGroups.map(group => (
          <article key={group.stage} className={styles.stageColumn}>
            <div className={classNames(styles.stageHeader, getStageClassName(group.stage))}>
              <span>{group.stage}</span>
              <span className={styles.stageCount}>{group.items.length}</span>
            </div>

            <div className={styles.stageList}>
              {group.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={classNames(
                    styles.stageCard,
                    item.id === selectedOpportunity?.id && styles.stageCardActive,
                  )}
                  onClick={() => setSelectedOpportunityId(item.id)}
                >
                  <div className={styles.stageCardTitle}>{item.companyName}</div>
                  <div className={styles.stageCardScene}>{item.scenarioName}</div>
                  <div className={styles.stageCardMeta}>
                    <span>{formatWanAmount(item.amountWan)}</span>
                    <span>{item.nextActionDate}</span>
                  </div>
                  <Progress
                    percent={item.winRate}
                    showInfo={false}
                    strokeColor="var(--fdeAccent)"
                  />
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.analyticsGrid}>
        <article className={styles.detailCard}>
          {selectedOpportunity ? (
            <>
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.cardEyebrow}>当前商机</div>
                  <h2 className={styles.cardTitle}>{selectedOpportunity.companyName}</h2>
                </div>
                <div
                  className={classNames(
                    styles.stageBadge,
                    getStageClassName(selectedOpportunity.stage),
                  )}
                >
                  {selectedOpportunity.stage}
                </div>
              </div>

              <p className={styles.cardSummary}>{selectedOpportunity.summary}</p>

              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>业务场景</span>
                  <span className={styles.detailValue}>{selectedOpportunity.scenarioName}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>行业</span>
                  <span className={styles.detailValue}>{selectedOpportunity.industry}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>负责人</span>
                  <span className={styles.detailValue}>
                    {getFdeMemberName(members, selectedOpportunity.ownerId)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>来源</span>
                  <span className={styles.detailValue}>{selectedOpportunity.source}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>下一动作</span>
                  <span className={styles.detailValue}>{selectedOpportunity.nextAction}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>预计金额</span>
                  <span className={styles.detailValue}>
                    {formatWanAmount(selectedOpportunity.amountWan)}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </article>

        <article className={styles.rankCard}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardEyebrow}>TOP 商机</div>
              <h2 className={styles.cardTitle}>按金额排序</h2>
            </div>
          </div>
          <div className={styles.rankList}>
            {topOpportunities.map((item, index) => (
              <div key={item.id} className={styles.rankItem}>
                <div className={styles.rankIndex}>{index + 1}</div>
                <div className={styles.rankInfo}>
                  <div className={styles.rankCompany}>{item.companyName}</div>
                  <div className={styles.rankScene}>
                    {item.stage} / {item.scenarioName}
                  </div>
                </div>
                <div className={styles.rankAmount}>{formatWanAmount(item.amountWan)}</div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
};
