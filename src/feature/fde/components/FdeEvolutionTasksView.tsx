import { useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Empty, Input, Progress, message } from "antd";

import type {
  FdeEvolutionReviewDecision,
  FdeEvolutionTaskItem,
  FdeEvolutionTaskStatus,
  FdeTeamMemberItem,
} from "@/feature/fde/types";
import { getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeEvolutionTasksView.module.less";

const { TextArea } = Input;

interface FdeEvolutionTasksViewProps {
  items: FdeEvolutionTaskItem[];
  members: FdeTeamMemberItem[];
  selectedTaskId: string;
  setSelectedTaskId: (taskId: string) => void;
  startTask: (taskId: string) => FdeEvolutionTaskStatus | null;
  pauseTask: (taskId: string) => FdeEvolutionTaskStatus | null;
  retryTask: (taskId: string) => FdeEvolutionTaskStatus | null;
  terminateTask: (taskId: string) => FdeEvolutionTaskStatus | null;
  submitTaskReview: (taskId: string) => FdeEvolutionTaskStatus | null;
  reviewTask: (
    taskId: string,
    decision: FdeEvolutionReviewDecision,
    note: string,
  ) => FdeEvolutionTaskStatus | null;
  createReleaseFromTask: (taskId: string) => string | null;
}

const getStatusClassName = (status: FdeEvolutionTaskItem["status"]): string => {
  if (status === "排队中") {
    return styles.statusQueued;
  }

  if (status === "训练中") {
    return styles.statusRunning;
  }

  if (status === "已暂停") {
    return styles.statusPaused;
  }

  if (status === "待审核") {
    return styles.statusReview;
  }

  if (status === "已驳回") {
    return styles.statusRejected;
  }

  if (status === "已终止") {
    return styles.statusTerminated;
  }

  return styles.statusDone;
};

const getDecisionClassName = (decision: FdeEvolutionReviewDecision): string =>
  decision === "通过" ? styles.decisionApproved : styles.decisionRejected;

/**
 * 进化任务管理视图。
 */
export const FdeEvolutionTasksView = ({
  items,
  members,
  selectedTaskId,
  setSelectedTaskId,
  startTask,
  pauseTask,
  retryTask,
  terminateTask,
  submitTaskReview,
  reviewTask,
  createReleaseFromTask,
}: FdeEvolutionTasksViewProps): JSX.Element => {
  const [reviewNote, setReviewNote] = useState<string>("");
  const selectedTask = useMemo(
    () => items.find(item => item.id === selectedTaskId) ?? items[0] ?? null,
    [items, selectedTaskId],
  );
  const latestReview = selectedTask?.reviewRecords[0] ?? null;

  useEffect(() => {
    setReviewNote("");
  }, [selectedTask?.id]);

  const handleStatusAction = (action: () => FdeEvolutionTaskStatus | null, successText: string) => {
    const nextStatus = action();
    if (!nextStatus) {
      message.warning("当前任务状态不支持这个操作。");
      return;
    }

    message.success(successText);
  };

  const handleReview = (decision: FdeEvolutionReviewDecision): void => {
    if (!selectedTask) {
      return;
    }

    const trimmedNote = reviewNote.trim();
    if (!trimmedNote) {
      message.warning("请先填写审核意见。");
      return;
    }

    const nextStatus = reviewTask(selectedTask.id, decision, trimmedNote);
    if (!nextStatus) {
      message.warning("当前任务不在待审核状态。");
      return;
    }

    message.success(decision === "通过" ? "已通过审核。" : "已驳回当前候选版本。");
    setReviewNote("");
  };

  const handleCreateRelease = (): void => {
    if (!selectedTask) {
      return;
    }

    const nextReleaseId = createReleaseFromTask(selectedTask.id);
    if (!nextReleaseId) {
      message.warning("当前任务尚未审核通过，无法创建发布单。");
      return;
    }

    message.success(
      selectedTask.releaseId ? "已打开关联发布单。" : "已创建发布单，并切换到版本推送模块。",
    );
  };

  if (!items.length) {
    return <Empty description="当前视角下暂无进化任务" />;
  }

  return (
    <div className={styles.workbench}>
      <section className={styles.taskGrid}>
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
            <Progress percent={item.progress} showInfo={false} strokeColor="var(--fdeAccent)" />
          </button>
        ))}
      </section>

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
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>提交审核</span>
                <strong className={styles.infoValue}>{selectedTask.submittedAt || "未提交"}</strong>
              </div>
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>最新审核</span>
                <strong className={styles.infoValue}>
                  {latestReview
                    ? `${latestReview.decision} · ${getFdeMemberName(members, latestReview.reviewerId)}`
                    : "暂无结果"}
                </strong>
              </div>
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>发布单</span>
                <strong className={styles.infoValue}>
                  {selectedTask.releaseId ? "已创建" : "未创建"}
                </strong>
              </div>
            </div>

            <article className={styles.actionCard}>
              <div className={styles.sectionTitle}>任务动作</div>
              <div className={styles.actionRow}>
                {selectedTask.status === "排队中" ? (
                  <>
                    <Button
                      type="primary"
                      onClick={() =>
                        handleStatusAction(
                          () => startTask(selectedTask.id),
                          "任务已开始训练。",
                        )
                      }
                    >
                      开始训练
                    </Button>
                    <Button
                      danger
                      onClick={() =>
                        handleStatusAction(
                          () => terminateTask(selectedTask.id),
                          "任务已终止。",
                        )
                      }
                    >
                      终止任务
                    </Button>
                  </>
                ) : null}

                {selectedTask.status === "训练中" ? (
                  <>
                    <Button
                      onClick={() =>
                        handleStatusAction(
                          () => pauseTask(selectedTask.id),
                          "任务已暂停。",
                        )
                      }
                    >
                      暂停训练
                    </Button>
                    <Button
                      type="primary"
                      onClick={() =>
                        handleStatusAction(
                          () => submitTaskReview(selectedTask.id),
                          "任务已提交审核。",
                        )
                      }
                    >
                      提交审核
                    </Button>
                    <Button
                      danger
                      onClick={() =>
                        handleStatusAction(
                          () => terminateTask(selectedTask.id),
                          "任务已终止。",
                        )
                      }
                    >
                      终止任务
                    </Button>
                  </>
                ) : null}

                {selectedTask.status === "已暂停" ? (
                  <>
                    <Button
                      type="primary"
                      onClick={() =>
                        handleStatusAction(
                          () => startTask(selectedTask.id),
                          "任务已恢复训练。",
                        )
                      }
                    >
                      继续训练
                    </Button>
                    <Button
                      onClick={() =>
                        handleStatusAction(
                          () => submitTaskReview(selectedTask.id),
                          "任务已提交审核。",
                        )
                      }
                    >
                      提交审核
                    </Button>
                    <Button
                      danger
                      onClick={() =>
                        handleStatusAction(
                          () => terminateTask(selectedTask.id),
                          "任务已终止。",
                        )
                      }
                    >
                      终止任务
                    </Button>
                  </>
                ) : null}

                {selectedTask.status === "待审核" ? (
                  <>
                    <Button type="primary" onClick={() => handleReview("通过")}>
                      审核通过
                    </Button>
                    <Button danger onClick={() => handleReview("驳回")}>
                      审核驳回
                    </Button>
                  </>
                ) : null}

                {selectedTask.status === "已驳回" || selectedTask.status === "已终止" ? (
                  <Button
                    type="primary"
                    onClick={() =>
                      handleStatusAction(
                        () => retryTask(selectedTask.id),
                        "任务已重新进入训练。",
                      )
                    }
                  >
                    重试训练
                  </Button>
                ) : null}

                {selectedTask.status === "已完成" ? (
                  <Button type="primary" onClick={handleCreateRelease}>
                    {selectedTask.releaseId ? "查看发布单" : "创建发布单"}
                  </Button>
                ) : null}
              </div>

              {selectedTask.status === "待审核" ? (
                <div className={styles.reviewPanel}>
                  <div className={styles.sectionTitle}>审核意见</div>
                  <TextArea
                    className={styles.reviewInput}
                    rows={4}
                    value={reviewNote}
                    placeholder="请输入通过或驳回的原因，便于后续追踪和回看。"
                    onChange={event => setReviewNote(event.target.value)}
                  />
                </div>
              ) : null}
            </article>

            <article className={styles.summaryCard}>
              <div className={styles.sectionTitle}>任务摘要</div>
              <p className={styles.summaryText}>{selectedTask.summary}</p>
            </article>

            <article className={styles.summaryCard}>
              <div className={styles.sectionTitle}>来源信号</div>
              <div className={styles.skillList}>
                {selectedTask.sourceSignalTitles.map(item => (
                  <span key={item} className={styles.skillTag}>
                    {item}
                  </span>
                ))}
              </div>
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

            <article className={styles.summaryCard}>
              <div className={styles.sectionTitle}>候选版本差异</div>
              <p className={styles.summaryText}>{selectedTask.diffSummary}</p>
              {selectedTask.manualNote ? (
                <p className={styles.summaryText}>FDE 备注：{selectedTask.manualNote}</p>
              ) : null}
            </article>

            <article className={styles.summaryCard}>
              <div className={styles.sectionTitle}>审核记录</div>
              {selectedTask.reviewRecords.length ? (
                <div className={styles.reviewList}>
                  {selectedTask.reviewRecords.map(item => (
                    <div key={item.id} className={styles.reviewItem}>
                      <div className={styles.reviewHeader}>
                        <span
                          className={classNames(
                            styles.statusTag,
                            getDecisionClassName(item.decision),
                          )}
                        >
                          {item.decision}
                        </span>
                        <span className={styles.reviewMeta}>
                          {getFdeMemberName(members, item.reviewerId)} · {item.reviewedAt}
                        </span>
                      </div>
                      <p className={styles.summaryText}>{item.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyText}>当前还没有审核记录。</div>
              )}
            </article>

            <article className={styles.summaryCard}>
              <div className={styles.sectionTitle}>任务流转记录</div>
              <div className={styles.timelineList}>
                {selectedTask.timeline.map(item => (
                  <div key={item.id} className={styles.timelineItem}>
                    <div className={styles.timelineHeader}>
                      <strong className={styles.taskName}>{item.title}</strong>
                      <span className={styles.timelineTime}>{item.createdAt}</span>
                    </div>
                    <p className={styles.summaryText}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </article>
          </>
        ) : (
          <Empty description="请选择进化任务" />
        )}
      </article>
    </div>
  );
};
