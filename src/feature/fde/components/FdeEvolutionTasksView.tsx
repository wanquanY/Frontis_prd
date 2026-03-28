import { useMemo } from "react";

import classNames from "classnames";
import { Empty, Progress } from "antd";

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
  if (status === "排队中") {
    return styles.statusQueued;
  }

  if (status === "训练中") {
    return styles.statusRunning;
  }

  if (status === "待审核") {
    return styles.statusReview;
  }

  return styles.statusDone;
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
  const selectedTask = useMemo(
    () => items.find(item => item.id === selectedTaskId) ?? items[0] ?? null,
    [items, selectedTaskId],
  );

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
          </>
        ) : (
          <Empty description="请选择进化任务" />
        )}
      </article>
    </div>
  );
};
