import { useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Empty, Input, Modal, Progress, message } from "antd";

import type { FdeEvolutionTaskItem, FdeTeamMemberItem } from "@/feature/fde/types";
import { getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeEvolutionTasksView.module.less";

interface FdeEvolutionTasksViewProps {
  items: FdeEvolutionTaskItem[];
  members: FdeTeamMemberItem[];
  selectedTaskId: string;
  setSelectedTaskId: (taskId: string) => void;
}

const getStatusClassName = (status: FdeEvolutionTaskItem["status"]): string => {
  if (status === "排队中") return styles.statusQueued;
  if (status === "进化中") return styles.statusRunning;
  if (status === "进化已完成") return styles.statusCompleted;
  if (status === "已推送客户审核中") return styles.statusReview;
  if (status === "客户已采纳") return styles.statusAdopted;
  return styles.statusRejected;
};

/**
 * 进化任务管理视图。
 */
export const FdeEvolutionTasksView = ({
  items,
  members,
  selectedTaskId,
  setSelectedTaskId,
}: FdeEvolutionTasksViewProps): JSX.Element => {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeNotes, setUpgradeNotes] = useState("");

  const selectedTask = useMemo(
    () => items.find(item => item.id === selectedTaskId) ?? items[0] ?? null,
    [items, selectedTaskId],
  );

  const handleSubmitUpgrade = (): void => {
    message.success("升级审核已提交给客户");
    setIsUpgradeModalOpen(false);
    setUpgradeNotes("");
  };

  if (!items.length) {
    return <Empty description="当前视角下暂无进化任务" />;
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.taskList}>
        <div className={styles.sectionTitle}>进化任务列表</div>
        <div className={styles.taskListBody}>
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              className={classNames(
                styles.taskCard,
                item.id === selectedTask?.id && styles.taskCardActive,
              )}
              onClick={() => setSelectedTaskId(item.id)}
            >
              <div className={styles.taskHeader}>
                <div>
                  <div className={styles.taskName}>{item.agentName}</div>
                  <div className={styles.taskMeta}>{item.customerName}</div>
                </div>
                <span className={classNames(styles.statusTag, getStatusClassName(item.status))}>
                  {item.status}
                </span>
              </div>
              <div className={styles.taskMeta}>候选版本 {item.versionCandidate}</div>
              <Progress percent={item.progress} showInfo={false} strokeColor="var(--primary)" />
            </button>
          ))}
        </div>
      </aside>

      <article className={styles.detailPanel}>
        {selectedTask ? (
          <>
            <div className={styles.header}>
              <div>
                <div className={styles.eyebrow}>进化任务管理</div>
                <h2 className={styles.title}>{selectedTask.agentName}</h2>
                <p className={styles.description}>
                  {selectedTask.customerName} · {selectedTask.versionCandidate}
                </p>
              </div>
              <span
                className={classNames(styles.statusTag, getStatusClassName(selectedTask.status))}
              >
                {selectedTask.status}
              </span>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>负责人</span>
                <strong className={styles.infoValue}>
                  {getFdeMemberName(members, selectedTask.assignedToId)}
                </strong>
              </div>
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>任务来源</span>
                <strong className={styles.infoValue}>{selectedTask.source}</strong>
              </div>
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>开始时间</span>
                <strong className={styles.infoValue}>{selectedTask.startedAt}</strong>
              </div>
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>预计完成</span>
                <strong className={styles.infoValue}>{selectedTask.expectedFinishAt}</strong>
              </div>
            </div>

            <article className={styles.summaryCard}>
              <div className={styles.sectionTitle}>任务摘要</div>
              <p className={styles.summaryText}>{selectedTask.summary}</p>
            </article>

            <article className={styles.skillCard}>
              <div className={styles.sectionTitle}>本轮变更技能</div>
              <div className={styles.skillList}>
                {selectedTask.changedSkills.map(item => (
                  <span key={item} className={styles.skillTag}>
                    {item}
                  </span>
                ))}
              </div>
            </article>

            {selectedTask.status === "排队中" && selectedTask.queuePosition && (
              <article className={styles.queueCard}>
                <div className={styles.queueIcon}>⏳</div>
                <div className={styles.queueTitle}>任务排队中</div>
                <div className={styles.queueText}>
                  前面还有 <strong>{selectedTask.queuePosition}</strong> 个任务正在处理
                </div>
              </article>
            )}

            {selectedTask.status === "进化中" && selectedTask.estimatedTime && (
              <article className={styles.trainingCard}>
                <div className={styles.trainingTitle}>进化训练中</div>
                <Progress
                  percent={selectedTask.progress}
                  strokeColor="var(--primary)"
                  className={styles.trainingProgress}
                />
                <div className={styles.trainingText}>预计还需 {selectedTask.estimatedTime}</div>
              </article>
            )}

            {selectedTask.status === "进化已完成" && selectedTask.benchmarkResults && (
              <>
                {selectedTask.benchmarkResults.map((result, idx) => (
                  <article key={idx} className={styles.benchmarkCard}>
                    <div className={styles.benchmarkHeader}>
                      <div className={styles.sectionTitle}>{result.skillName}</div>
                      <div className={styles.versionBadge}>
                        {result.oldVersion} → {result.newVersion}
                      </div>
                    </div>
                    <div className={styles.benchmarkTable}>
                      <div className={styles.tableHeader}>
                        <div className={styles.tableCell}>指标</div>
                        <div className={styles.tableCell}>{result.oldVersion}</div>
                        <div className={styles.tableCell}>{result.newVersion}</div>
                        <div className={styles.tableCell}>变化</div>
                      </div>
                      {result.metrics.map((metric, mIdx) => (
                        <div key={mIdx} className={styles.tableRow}>
                          <div className={styles.tableCell}>{metric.name}</div>
                          <div className={styles.tableCell}>{metric.oldValue}</div>
                          <div className={styles.tableCell}>{metric.newValue}</div>
                          <div className={classNames(styles.tableCell, styles.improvementCell)}>
                            {metric.improvement}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}

                <div className={styles.actionButtons}>
                  <Button onClick={() => message.info("重新进化功能开发中")}>重新进化</Button>
                  <Button onClick={() => message.info("新版本测试功能开发中")}>
                    新版本测试
                  </Button>
                  <Button type="primary" onClick={() => setIsUpgradeModalOpen(true)}>
                    提交升级审核
                  </Button>
                </div>
              </>
            )}

            {selectedTask.status === "已推送客户审核中" && selectedTask.upgradeNotes && (
              <article className={styles.reviewCard}>
                <div className={styles.reviewTitle}>已推送客户审核</div>
                <div className={styles.reviewInfo}>
                  <div className={styles.reviewLabel}>推送版本</div>
                  <div className={styles.reviewValue}>{selectedTask.versionCandidate}</div>
                </div>
                <div className={styles.reviewInfo}>
                  <div className={styles.reviewLabel}>当前版本</div>
                  <div className={styles.reviewValue}>{selectedTask.currentVersion}</div>
                </div>
                <div className={styles.reviewInfo}>
                  <div className={styles.reviewLabel}>版本升级说明</div>
                  <div className={styles.reviewValue}>{selectedTask.upgradeNotes}</div>
                </div>
              </article>
            )}

            {selectedTask.status === "客户已采纳" && selectedTask.currentVersion && (
              <article className={styles.adoptedCard}>
                <div className={styles.adoptedIcon}>✓</div>
                <div className={styles.adoptedTitle}>客户已采纳</div>
                <div className={styles.adoptedInfo}>
                  <div className={styles.adoptedLabel}>当前版本</div>
                  <div className={styles.adoptedValue}>{selectedTask.currentVersion}</div>
                </div>
                {selectedTask.upgradeNotes && (
                  <div className={styles.adoptedNotes}>{selectedTask.upgradeNotes}</div>
                )}
              </article>
            )}

            {selectedTask.status === "客户未采纳" && selectedTask.rejectionReason && (
              <article className={styles.rejectedCard}>
                <div className={styles.rejectedIcon}>✕</div>
                <div className={styles.rejectedTitle}>客户未采纳</div>
                <div className={styles.rejectedReason}>
                  <div className={styles.rejectedLabel}>未采纳原因</div>
                  <div className={styles.rejectedText}>{selectedTask.rejectionReason}</div>
                </div>
              </article>
            )}
          </>
        ) : (
          <Empty description="请选择进化任务" />
        )}
      </article>

      <Modal
        title="提交升级审核"
        open={isUpgradeModalOpen}
        onOk={handleSubmitUpgrade}
        onCancel={() => setIsUpgradeModalOpen(false)}
        okText="提交审核"
        cancelText="取消"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalLabel}>版本升级说明</div>
          <Input.TextArea
            rows={4}
            placeholder="请输入版本升级说明，描述本次进化的主要改进点和注意事项..."
            value={upgradeNotes}
            onChange={e => setUpgradeNotes(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
