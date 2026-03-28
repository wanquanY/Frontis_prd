import { useMemo } from "react";

import { Button, Empty, Progress, message } from "antd";

import type { FdeFeedbackAgentItem } from "@/feature/fde/types";

import styles from "./FdeFeedbackBoardView.module.less";

interface FdeFeedbackBoardViewProps {
  items: FdeFeedbackAgentItem[];
  selectedAgentId: string;
  setSelectedAgentId: (agentId: string) => void;
  triggerEvolution: (agentId: string) => void;
}

/**
 * 数据回流看板视图。
 */
export const FdeFeedbackBoardView = ({
  items,
  selectedAgentId,
  setSelectedAgentId,
  triggerEvolution,
}: FdeFeedbackBoardViewProps): JSX.Element => {
  const selectedAgent = useMemo(
    () => items.find(item => item.id === selectedAgentId) ?? items[0] ?? null,
    [items, selectedAgentId],
  );

  if (!items.length) {
    return <Empty description="当前视角下暂无回流数据" />;
  }

  return (
    <div className={styles.workbench}>
      <aside className={styles.agentRail}>
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            className={styles.agentCard}
            data-active={item.id === selectedAgent?.id}
            onClick={() => setSelectedAgentId(item.id)}
          >
            <div className={styles.agentName}>{item.agentName}</div>
            <div className={styles.agentMeta}>{item.customerName}</div>
            <div className={styles.agentMeta}>进化评分 {item.evolutionScore}</div>
          </button>
        ))}
      </aside>

      <article className={styles.detailPanel}>
        {selectedAgent ? (
          <>
            <div className={styles.header}>
              <div>
                <div className={styles.eyebrow}>数据回流看板</div>
                <h2 className={styles.title}>{selectedAgent.agentName}</h2>
                <p className={styles.description}>
                  {selectedAgent.customerName} · {selectedAgent.scenarioName}
                </p>
              </div>
              <Button
                type="primary"
                className={styles.triggerButton}
                onClick={() => {
                  triggerEvolution(selectedAgent.id);
                  message.success("已加入进化任务队列。");
                }}
              >
                手动触发进化
              </Button>
            </div>

            <section className={styles.metricGrid}>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>解决率</span>
                <strong className={styles.metricValue}>{selectedAgent.resolutionRate}%</strong>
                <Progress
                  percent={selectedAgent.resolutionRate}
                  showInfo={false}
                  strokeColor="var(--fdeAccent)"
                />
              </article>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>触发次数</span>
                <strong className={styles.metricValue}>{selectedAgent.triggerCount}</strong>
                <span className={styles.metricHint}>最近 30 天</span>
              </article>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>进化评分</span>
                <strong className={styles.metricValue}>{selectedAgent.evolutionScore}</strong>
                <span className={styles.metricHint}>最近进化：{selectedAgent.lastEvolvedAt}</span>
              </article>
            </section>

            <section className={styles.detailGrid}>
              <article className={styles.card}>
                <div className={styles.sectionTitle}>核心技能</div>
                <div className={styles.tagList}>
                  {selectedAgent.skillTags.map(item => (
                    <span key={item} className={styles.tag}>
                      {item}
                    </span>
                  ))}
                </div>
              </article>

              <article className={styles.card}>
                <div className={styles.sectionTitle}>问题信号</div>
                <div className={styles.signalList}>
                  {selectedAgent.issueSignals.map(item => (
                    <div key={item} className={styles.signalItem}>
                      <span className={styles.signalDot} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <article className={styles.recommendationCard}>
              <div className={styles.sectionTitle}>FDE 进化建议</div>
              <p className={styles.recommendationText}>{selectedAgent.recommendation}</p>
            </article>
          </>
        ) : (
          <Empty description="请选择 Agent" />
        )}
      </article>
    </div>
  );
};
