import { useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Empty, Input, Progress, Select, message } from "antd";

import type {
  FdeEvolutionCreatePayload,
  FdeFeedbackAgentItem,
  FdeFeedbackIssueCategory,
  FdeFeedbackSignalItem,
} from "@/feature/fde/types";

import styles from "./FdeFeedbackBoardView.module.less";

interface FdeFeedbackBoardViewProps {
  items: FdeFeedbackAgentItem[];
  selectedAgentId: string;
  setSelectedAgentId: (agentId: string) => void;
  triggerEvolution: (agentId: string, payload?: FdeEvolutionCreatePayload) => string | null;
}

const ALL_CATEGORY_FILTER = "全部分类";

const getCategoryClassName = (category: FdeFeedbackIssueCategory): string => {
  if (category === "知识缺口" || category === "规则误判") {
    return styles.categoryWarning;
  }

  if (category === "数据延迟" || category === "接口异常") {
    return styles.categoryDanger;
  }

  return styles.categoryAccent;
};

/**
 * 数据回流看板视图。
 */
export const FdeFeedbackBoardView = ({
  items,
  selectedAgentId,
  setSelectedAgentId,
  triggerEvolution,
}: FdeFeedbackBoardViewProps): JSX.Element => {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY_FILTER);
  const [selectedSignalIds, setSelectedSignalIds] = useState<string[]>([]);
  const [manualNote, setManualNote] = useState<string>("");
  const selectedAgent = useMemo(
    () => items.find(item => item.id === selectedAgentId) ?? items[0] ?? null,
    [items, selectedAgentId],
  );
  const categoryOptions = useMemo<string[]>(
    () =>
      selectedAgent
        ? [
            ALL_CATEGORY_FILTER,
            ...Array.from(new Set(selectedAgent.issueSignals.map(item => item.category))),
          ]
        : [ALL_CATEGORY_FILTER],
    [selectedAgent],
  );
  const filteredSignals = useMemo<FdeFeedbackSignalItem[]>(
    () =>
      selectedAgent
        ? selectedAgent.issueSignals.filter(item =>
            activeCategory === ALL_CATEGORY_FILTER ? true : item.category === activeCategory,
          )
        : [],
    [activeCategory, selectedAgent],
  );
  const filteredSamples = useMemo(
    () =>
      selectedAgent
        ? selectedAgent.samples.filter(item => {
            const matchesCategory =
              activeCategory === ALL_CATEGORY_FILTER ? true : item.issueCategory === activeCategory;
            const matchesSignal =
              selectedSignalIds.length > 0 ? selectedSignalIds.includes(item.signalId) : true;
            return matchesCategory && matchesSignal;
          })
        : [],
    [activeCategory, selectedAgent, selectedSignalIds],
  );

  useEffect(() => {
    setSelectedSignalIds([]);
    setManualNote(selectedAgent?.manualRemark ?? "");
    setActiveCategory(ALL_CATEGORY_FILTER);
  }, [selectedAgent?.id, selectedAgent?.manualRemark]);

  const handleToggleSignal = (signalId: string): void => {
    setSelectedSignalIds(previous =>
      previous.includes(signalId)
        ? previous.filter(item => item !== signalId)
        : [...previous, signalId],
    );
  };

  const handleTriggerEvolution = (): void => {
    if (!selectedAgent) {
      return;
    }

    const targetSignalIds =
      selectedSignalIds.length > 0 ? selectedSignalIds : filteredSignals.map(item => item.id);

    if (!targetSignalIds.length) {
      message.warning("当前没有可创建任务的问题信号。");
      return;
    }

    const nextTaskId = triggerEvolution(selectedAgent.id, {
      manualNote: manualNote.trim(),
      signalIds: targetSignalIds,
    });

    if (!nextTaskId) {
      message.warning("当前回流任务不存在，无法创建进化任务。");
      return;
    }

    message.success("已根据所选信号创建进化任务。");
  };

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
              <Button type="primary" className={styles.triggerButton} onClick={handleTriggerEvolution}>
                基于选中信号创建任务
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

            <section className={styles.controlCard}>
              <div className={styles.controlHeader}>
                <div className={styles.sectionTitle}>问题信号详情</div>
                <Select
                  className={styles.categorySelect}
                  value={activeCategory}
                  options={categoryOptions.map(item => ({
                    label: item,
                    value: item,
                  }))}
                  onChange={value => setActiveCategory(value)}
                />
              </div>
              <div className={styles.signalList}>
                {filteredSignals.map(item => {
                  const isSelected = selectedSignalIds.includes(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={classNames(styles.signalItem, isSelected && styles.signalItemActive)}
                      onClick={() => handleToggleSignal(item.id)}
                    >
                      <div className={styles.signalHeader}>
                        <strong>{item.title}</strong>
                        <span
                          className={classNames(
                            styles.categoryTag,
                            getCategoryClassName(item.category),
                          )}
                        >
                          {item.category}
                        </span>
                      </div>
                      <div className={styles.signalMeta}>
                        影响技能：{item.impactedSkill} · 样本 {item.sampleCount} 条
                      </div>
                      <div className={styles.signalDetail}>{item.detail}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={styles.detailGrid}>
              <article className={styles.card}>
                <div className={styles.sectionTitle}>回流样本列表</div>
                <div className={styles.sampleList}>
                  {filteredSamples.map(item => (
                    <div key={item.id} className={styles.sampleItem}>
                      <div className={styles.sampleHeader}>
                        <span
                          className={classNames(
                            styles.categoryTag,
                            getCategoryClassName(item.issueCategory),
                          )}
                        >
                          {item.issueCategory}
                        </span>
                        <span className={styles.sampleTime}>{item.createdAt}</span>
                      </div>
                      <div className={styles.sampleQuestion}>问题：{item.question}</div>
                      <div className={styles.sampleBlock}>当前回复：{item.observedReply}</div>
                      <div className={styles.sampleBlock}>期望回复：{item.expectedReply}</div>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.card}>
                <div className={styles.sectionTitle}>进化前后效果对比</div>
                <div className={styles.compareGrid}>
                  <div className={styles.compareCard}>
                    <div className={styles.compareLabel}>当前问题</div>
                    <p className={styles.compareText}>{selectedAgent.comparison.beforeSummary}</p>
                  </div>
                  <div className={styles.compareCard}>
                    <div className={styles.compareLabel}>进化目标</div>
                    <p className={styles.compareText}>{selectedAgent.comparison.afterSummary}</p>
                  </div>
                </div>
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
                <div className={styles.sectionTitle}>FDE 建议与备注</div>
                <p className={styles.recommendationText}>{selectedAgent.recommendation}</p>
                <Input.TextArea
                  rows={4}
                  value={manualNote}
                  onChange={event => setManualNote(event.target.value)}
                  placeholder="补充本轮进化备注，创建任务时会一并带入。"
                />
              </article>
            </section>
          </>
        ) : (
          <Empty description="请选择 Agent" />
        )}
      </article>
    </div>
  );
};
