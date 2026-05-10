import { useMemo, useState } from "react";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  LoadingOutlined,
  UpOutlined,
} from "@ant-design/icons";
import classNames from "classnames";

import type { ArtifactItem } from "@/types/artifact";
import { resolveFileLogo } from "@/utils/fileLogo";

import type {
  DialogueInsightTaskItem,
  DialogueInsightTaskStatus,
} from "./dialogueInsightPanelUtils";
import styles from "./DialogueInsightPanel.module.less";

interface DialogueInsightPanelProps {
  tasks: DialogueInsightTaskItem[];
  files: ArtifactItem[];
  onOpenFile: (file: ArtifactItem) => void;
}

const getAvatarText = (name: string): string => name.trim().slice(0, 1) || "AI";

const TASK_STATUS_LABELS: Record<DialogueInsightTaskStatus, string> = {
  running: "执行中",
  completed: "已完成",
  aborted: "执行失败",
};

const TASK_STATUS_ICON_CLASS_NAMES: Record<DialogueInsightTaskStatus, string> = {
  running: styles.taskStatusRunning,
  completed: styles.taskStatusCompleted,
  aborted: styles.taskStatusAborted,
};

const TASK_STATUS_ICONS: Record<DialogueInsightTaskStatus, JSX.Element> = {
  running: <LoadingOutlined />,
  completed: <CheckCircleFilled />,
  aborted: <CloseCircleFilled />,
};

interface TaskStatusIconProps {
  status: DialogueInsightTaskStatus;
}

const TaskStatusIcon = ({ status }: TaskStatusIconProps): JSX.Element => (
  <span
    className={classNames(styles.taskStatusIcon, TASK_STATUS_ICON_CLASS_NAMES[status])}
    aria-label={TASK_STATUS_LABELS[status]}
    title={TASK_STATUS_LABELS[status]}
  >
    {TASK_STATUS_ICONS[status]}
  </span>
);

/**
 * ME 对话右上角动态面板，展示当前任务进度和当日成果文件。
 */
export const DialogueInsightPanel = ({
  tasks,
  files,
  onOpenFile,
}: DialogueInsightPanelProps): JSX.Element | null => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasTasks = tasks.length > 0;
  const hasFiles = files.length > 0;
  const latestTask = useMemo(
    () => tasks.find(task => task.status === "running") ?? tasks.at(-1) ?? null,
    [tasks],
  );

  if (!hasTasks && !hasFiles) {
    return null;
  }

  const displayTask = latestTask ?? tasks[0] ?? null;

  const handleToggleExpanded = (): void => {
    setIsExpanded(current => !current);
  };

  return (
    <aside
      className={classNames(styles.panel, {
        [styles.panelCollapsed]: !isExpanded,
        [styles.panelSingleSection]: hasTasks !== hasFiles,
      })}
      aria-label="ME 对话动态面板"
    >
      {hasTasks ? (
        <section className={classNames(styles.section, styles.progressSection)}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>进度</div>
            <button
              type="button"
              className={styles.toggleButton}
              aria-label={isExpanded ? "收起进度卡片" : "展开进度卡片"}
              aria-expanded={isExpanded}
              onClick={handleToggleExpanded}
            >
              {isExpanded ? <UpOutlined /> : <DownOutlined />}
            </button>
          </div>

          {isExpanded ? (
            <div className={styles.taskList}>
              {tasks.map(task => (
                <article key={task.id} className={styles.taskItem}>
                  <span className={styles.taskHeader}>
                    <TaskStatusIcon status={task.status} />
                    <span className={styles.taskDescription} title={task.taskDescription}>
                      {task.taskDescription}
                    </span>
                  </span>
                  <span className={styles.taskExpert}>
                    <span className={styles.agentAvatar} aria-hidden={true}>
                      {task.expertAvatarUrl ? (
                        <img
                          className={styles.agentAvatarImage}
                          src={task.expertAvatarUrl}
                          alt=""
                        />
                      ) : (
                        getAvatarText(task.expertAvatarLabel ?? task.expertName)
                      )}
                    </span>
                    <span className={styles.agentName} title={task.expertName}>
                      {task.expertName}
                    </span>
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.collapsedProgress} aria-label="当前最新进度">
              {displayTask ? (
                <>
                  <TaskStatusIcon status={displayTask.status} />
                  <span className={styles.collapsedTaskTitle} title={displayTask.taskDescription}>
                    {displayTask.taskDescription}
                  </span>
                </>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {isExpanded && hasFiles ? (
        <section className={classNames(styles.section, styles.resultSection)}>
          <div className={styles.sectionTitle}>今日成果</div>
          <div className={styles.fileList} role="list" aria-label="今日成果文件列表">
            {files.map(file => {
              const logo = resolveFileLogo(file.fileName);

              return (
                <button
                  key={file.id}
                  type="button"
                  className={styles.fileItem}
                  onClick={() => onOpenFile(file)}
                >
                  <span className={styles.fileIcon} aria-hidden={true}>
                    <img className={styles.fileIconImage} src={logo.src} alt={logo.alt} />
                  </span>
                  <span className={styles.fileName} title={file.fileName}>
                    {file.fileName}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </aside>
  );
};
