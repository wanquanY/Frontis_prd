import { useCallback, useEffect, useMemo, useState } from "react";

import dayjs from "dayjs";
import classNames from "classnames";
import { DownOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Dropdown, Input, Modal, Select, message } from "antd";

import type { DialogueSessionItem, EmployeeItem } from "@/pages/types";

import type {
  OpenClawV2AutomationRunItem,
  OpenClawV2AutomationRunStatus,
  OpenClawV2AutomationTaskItem,
} from "../openClawV2Mock";
import styles from "./OpenClawTasksV2View.module.less";

type TaskEnabledFilter = "all" | "enabled" | "disabled";
type TaskSessionTargetFilter = "all" | "main" | "isolated";
type TaskSortField = "updatedAt" | "nextRunAt" | "name";
type TaskSortDirection = "asc" | "desc";

interface OpenClawTasksV2ViewProps {
  employees: EmployeeItem[];
  dialogueSessions: DialogueSessionItem[];
  initialTasks: OpenClawV2AutomationTaskItem[];
}

interface TaskFormState {
  name: string;
  description: string;
  agentId: string;
  sessionTarget: "main" | "isolated";
  sessionId: string;
  scheduleKind: "at" | "every" | "cron";
  scheduleLabel: string;
}

const DEFAULT_TASK_FORM_STATE = (employees: EmployeeItem[]): TaskFormState => ({
  name: "",
  description: "",
  agentId: employees[0]?.id ?? "",
  sessionTarget: "main",
  sessionId: "",
  scheduleKind: "at",
  scheduleLabel: "每天 09:30",
});

const cloneRunItem = (item: OpenClawV2AutomationRunItem): OpenClawV2AutomationRunItem => ({
  ...item,
});

const cloneTaskItem = (
  item: OpenClawV2AutomationTaskItem,
): OpenClawV2AutomationTaskItem => ({
  ...item,
  runs: item.runs.map(cloneRunItem),
});

const formatTimestamp = (value: string): string => {
  const parsed = dayjs(value);

  if (!parsed.isValid()) {
    return "--";
  }

  return parsed.format("MM-DD HH:mm");
};

const resolveStatusLabel = (status: OpenClawV2AutomationRunStatus): string => {
  if (status === "completed") {
    return "已完成";
  }
  if (status === "running") {
    return "执行中";
  }
  if (status === "failed") {
    return "失败";
  }

  return "待执行";
};

const buildTaskFormState = (task: OpenClawV2AutomationTaskItem): TaskFormState => ({
  name: task.name,
  description: task.description,
  agentId: task.agentId,
  sessionTarget: task.sessionTarget,
  sessionId: task.sessionId ?? "",
  scheduleKind: task.scheduleKind,
  scheduleLabel: task.scheduleLabel,
});

/**
 * OpenClaw V2 自动化任务页。
 */
export const OpenClawTasksV2View = ({
  employees,
  dialogueSessions,
  initialTasks,
}: OpenClawTasksV2ViewProps): JSX.Element => {
  const [tasks, setTasks] = useState<OpenClawV2AutomationTaskItem[]>(() =>
    initialTasks.map(cloneTaskItem),
  );
  const [connected, setConnected] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [query, setQuery] = useState<string>("");
  const [enabledFilter, setEnabledFilter] = useState<TaskEnabledFilter>("all");
  const [sessionTargetFilter, setSessionTargetFilter] =
    useState<TaskSessionTargetFilter>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<TaskSortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<TaskSortDirection>("desc");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [taskForm, setTaskForm] = useState<TaskFormState>(() => DEFAULT_TASK_FORM_STATE(employees));
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() => dayjs().format("MM-DD HH:mm"));

  useEffect(() => {
    setTasks(initialTasks.map(cloneTaskItem));
  }, [initialTasks]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tasks
      .filter(item => {
        const agentName = employees.find(employee => employee.id === item.agentId)?.name ?? "";
        const matchesQuery =
          !normalizedQuery ||
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery) ||
          agentName.toLowerCase().includes(normalizedQuery);

        if (!matchesQuery) {
          return false;
        }

        if (enabledFilter === "enabled" && !item.enabled) {
          return false;
        }
        if (enabledFilter === "disabled" && item.enabled) {
          return false;
        }
        if (sessionTargetFilter !== "all" && item.sessionTarget !== sessionTargetFilter) {
          return false;
        }
        if (agentFilter !== "all" && item.agentId !== agentFilter) {
          return false;
        }

        return true;
      })
      .slice()
      .sort((left, right) => {
        const multiplier = sortDirection === "asc" ? 1 : -1;

        if (sortField === "name") {
          return left.name.localeCompare(right.name, "zh-CN") * multiplier;
        }

        const leftValue = dayjs(
          sortField === "updatedAt" ? left.updatedAt : left.nextRunAt,
        ).valueOf();
        const rightValue = dayjs(
          sortField === "updatedAt" ? right.updatedAt : right.nextRunAt,
        ).valueOf();

        return (leftValue - rightValue) * multiplier;
      });
  }, [
    agentFilter,
    employees,
    enabledFilter,
    query,
    sessionTargetFilter,
    sortDirection,
    sortField,
    tasks,
  ]);

  const jobsTotal = tasks.length;
  const recentRunsTotal = tasks.reduce((count, item) => count + item.runs.length, 0);

  const agentOptions = useMemo(
    () =>
      employees.map(item => ({
        label: item.name,
        value: item.id,
      })),
    [employees],
  );

  const handleConnect = useCallback((): void => {
    setConnected(true);
    message.success("OpenClaw 网关已连接。");
  }, []);

  const handleRefresh = useCallback((): void => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setLastRefreshedAt(dayjs().format("MM-DD HH:mm"));
      message.success("自动化任务列表已刷新。");
    }, 350);
  }, []);

  const openCreateModal = useCallback((): void => {
    setEditingTaskId(null);
    setTaskForm(DEFAULT_TASK_FORM_STATE(employees));
    setIsTaskModalOpen(true);
  }, [employees]);

  const openEditModal = useCallback(
    (task: OpenClawV2AutomationTaskItem): void => {
      setEditingTaskId(task.id);
      setTaskForm(buildTaskFormState(task));
      setIsTaskModalOpen(true);
    },
    [],
  );

  const closeTaskModal = useCallback((): void => {
    setIsTaskModalOpen(false);
  }, []);

  const updateTask = useCallback(
    (
      taskId: string,
      updater: (task: OpenClawV2AutomationTaskItem) => OpenClawV2AutomationTaskItem,
    ): void => {
      setTasks(prev => prev.map(item => (item.id === taskId ? updater(cloneTaskItem(item)) : item)));
    },
    [],
  );

  const handleToggleExpanded = useCallback((taskId: string): void => {
    setExpandedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(item => item !== taskId) : [...prev, taskId],
    );
  }, []);

  const handleImmediateRun = useCallback(
    (task: OpenClawV2AutomationTaskItem): void => {
      const now = dayjs().toISOString();

      updateTask(task.id, item => ({
        ...item,
        status: "running",
        updatedAt: now,
        runs: [
          {
            id: `${item.id}-run-${Date.now()}`,
            sequence: item.runs.length + 1,
            taskTime: now,
            status: "running",
            result: "已触发一次立即执行，等待子任务写回结果。",
            durationLabel: "运行中",
          },
          ...item.runs,
        ],
      }));

      message.success(`已触发任务「${task.name}」立即执行。`);
    },
    [updateTask],
  );

  const handleToggleEnabled = useCallback(
    (task: OpenClawV2AutomationTaskItem): void => {
      updateTask(task.id, item => ({
        ...item,
        enabled: !item.enabled,
        status: !item.enabled ? "pending" : item.status,
      }));

      message.success(task.enabled ? "任务已停用。" : "任务已启用。");
    },
    [updateTask],
  );

  const handleDeleteTask = useCallback((taskId: string): void => {
    setTasks(prev => prev.filter(item => item.id !== taskId));
    setExpandedTaskIds(prev => prev.filter(item => item !== taskId));
    message.success("任务已删除。");
  }, []);

  const handleSubmitTask = useCallback((): void => {
    if (!taskForm.name.trim()) {
      message.warning("请先填写任务名称。");
      return;
    }

    if (!taskForm.agentId) {
      message.warning("请先选择工作目录。");
      return;
    }

    const now = dayjs().toISOString();

    if (editingTaskId) {
      updateTask(editingTaskId, item => ({
        ...item,
        name: taskForm.name.trim(),
        description: taskForm.description.trim(),
        agentId: taskForm.agentId,
        sessionTarget: taskForm.sessionTarget,
        sessionId: taskForm.sessionTarget === "main" ? taskForm.sessionId || undefined : undefined,
        scheduleKind: taskForm.scheduleKind,
        scheduleLabel: taskForm.scheduleLabel.trim(),
        updatedAt: now,
      }));
      message.success("任务已更新。");
    } else {
      setTasks(prev => [
        {
          id: `${Date.now()}`,
          name: taskForm.name.trim(),
          description: taskForm.description.trim(),
          agentId: taskForm.agentId,
          sessionTarget: taskForm.sessionTarget,
          wakeMode: "next-heartbeat",
          scheduleKind: taskForm.scheduleKind,
          scheduleLabel: taskForm.scheduleLabel.trim(),
          nextRunAt: dayjs().add(1, "day").hour(9).minute(30).toISOString(),
          updatedAt: now,
          enabled: true,
          status: "pending",
          sessionId: taskForm.sessionTarget === "main" ? taskForm.sessionId || undefined : undefined,
          runs: [],
        },
        ...prev,
      ]);
      message.success("任务已创建。");
    }

    setIsTaskModalOpen(false);
  }, [editingTaskId, taskForm, updateTask]);

  const resolveTaskMenuItems = useCallback(
    (task: OpenClawV2AutomationTaskItem): MenuProps["items"] => [
      {
        key: "edit",
        label: "编辑",
        onClick: () => openEditModal(task),
      },
      {
        key: "toggle",
        label: task.enabled ? "停用" : "启用",
        onClick: () => handleToggleEnabled(task),
      },
      {
        key: "run",
        label: "立即执行",
        onClick: () => handleImmediateRun(task),
      },
      {
        type: "divider",
      },
      {
        key: "delete",
        danger: true,
        label: "删除",
        onClick: () => handleDeleteTask(task.id),
      },
    ],
    [handleDeleteTask, handleImmediateRun, handleToggleEnabled, openEditModal],
  );

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.toolbar}>
          <div className={styles.toolbarMain}>
            <h1 className={styles.title}>自动化任务</h1>
            <p className={styles.subtitle}>
              按工作目录归属管理任务，支持创建、编辑、立即执行、查看执行记录，并可跳转到对应会话定位执行内容。
            </p>
          </div>
          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={classNames(styles.button, styles.buttonGhost, {
                [styles.buttonConnected]: connected,
              })}
              onClick={handleConnect}
            >
              <span
                className={classNames(styles.dot, {
                  [styles.dotConnected]: connected,
                })}
              />
              {connected ? "已连接" : "连接网关"}
            </button>
            <button
              type="button"
              className={classNames(styles.button, styles.buttonGhost)}
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? "刷新中..." : "刷新"}
            </button>
            <button
              type="button"
              className={classNames(styles.button, styles.buttonPrimary)}
              onClick={openCreateModal}
            >
              + 创建任务
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.statusStrip}>
            <article className={styles.statusItem}>
              <div className={styles.statusLabel}>调度器状态</div>
              <div className={styles.statusValue}>
                <span className={classNames(styles.pill, styles.pillSuccess)}>
                  {connected ? "已启用" : "未连接"}
                </span>
              </div>
              <div className={styles.statusMeta}>下次唤醒：今天 23:00</div>
            </article>

            <article className={styles.statusItem}>
              <div className={styles.statusLabel}>任务总数</div>
              <div className={styles.statusValue}>{jobsTotal}</div>
              <div className={styles.statusMeta}>当前筛选：{filteredTasks.length} 条</div>
            </article>

            <article className={styles.statusItem}>
              <div className={styles.statusLabel}>运行记录</div>
              <div className={styles.statusValue}>{recentRunsTotal}</div>
              <div className={styles.statusMeta}>最近 200 条用于快速预览</div>
            </article>

            <article className={styles.statusItem}>
              <div className={styles.statusLabel}>最近刷新</div>
              <div className={styles.statusValue}>{lastRefreshedAt}</div>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>筛选与排序</div>
          </div>

          <div className={styles.filters}>
            <label className={styles.fieldGrow}>
              <span className={styles.fieldLabel}>搜索</span>
              <Input
                value={query}
                placeholder="按任务名 / 描述 / 工作目录过滤"
                onChange={event => setQuery(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>启用状态</span>
              <Select
                value={enabledFilter}
                options={[
                  { value: "all", label: "全部" },
                  { value: "enabled", label: "仅启用" },
                  { value: "disabled", label: "仅停用" },
                ]}
                onChange={value => setEnabledFilter(value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>任务目标</span>
              <Select
                value={sessionTargetFilter}
                options={[
                  { value: "all", label: "全部" },
                  { value: "main", label: "主会话" },
                  { value: "isolated", label: "隔离执行" },
                ]}
                onChange={value => setSessionTargetFilter(value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>工作目录</span>
              <Select
                value={agentFilter}
                options={[{ value: "all", label: "全部" }, ...agentOptions]}
                onChange={value => setAgentFilter(value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>排序字段</span>
              <Select
                value={sortField}
                options={[
                  { value: "updatedAt", label: "更新时间" },
                  { value: "nextRunAt", label: "下次执行" },
                  { value: "name", label: "任务名称" },
                ]}
                onChange={value => setSortField(value)}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>排序方向</span>
              <Select
                value={sortDirection}
                options={[
                  { value: "asc", label: "升序" },
                  { value: "desc", label: "降序" },
                ]}
                onChange={value => setSortDirection(value)}
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>任务列表</div>
            <div className={styles.sectionMeta}>
              当前 {filteredTasks.length} / {jobsTotal}
            </div>
          </div>

          <div className={styles.taskTable}>
            <div className={styles.taskTableHead}>
              <div>执行记录</div>
              <div>任务</div>
              <div>工作目录</div>
              <div>周期</div>
              <div>下次执行</div>
              <div>状态</div>
              <div>记录数</div>
              <div>操作</div>
            </div>

            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => {
                const isExpanded = expandedTaskIds.includes(task.id);
                const agent = employees.find(item => item.id === task.agentId) ?? null;

                return (
                  <article
                    key={task.id}
                    className={classNames(styles.taskRow, {
                      [styles.taskRowExpanded]: isExpanded,
                    })}
                  >
                    <div
                      className={styles.taskSummary}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleToggleExpanded(task.id)}
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleToggleExpanded(task.id);
                        }
                      }}
                    >
                      <div>
                        <span className={styles.rowExpandHint}>
                          <DownOutlined
                            className={classNames(styles.rowExpandIcon, {
                              [styles.rowExpandIconExpanded]: isExpanded,
                            })}
                          />
                          <span>{isExpanded ? "收起记录" : "展开记录"}</span>
                        </span>
                      </div>

                      <div className={styles.jobCellMain}>
                        <div className={styles.jobTitle}>{task.name}</div>
                        <div className={styles.jobSubtitle}>{task.description}</div>
                      </div>

                      <div className={styles.jobCell}>{agent?.name ?? task.agentId}</div>
                      <div className={styles.jobCell}>{task.scheduleLabel}</div>
                      <div className={styles.jobCell}>{formatTimestamp(task.nextRunAt)}</div>
                      <div>
                        <span
                          className={classNames(styles.pill, {
                            [styles.pillSuccess]: task.status === "completed",
                            [styles.pillWarning]: task.status === "pending",
                            [styles.pillDanger]: task.status === "failed",
                            [styles.pillRunning]: task.status === "running",
                          })}
                        >
                          {resolveStatusLabel(task.status)}
                        </span>
                      </div>
                      <div className={styles.jobCell}>{task.runs.length}</div>
                      <div className={styles.jobActions} onClick={event => event.stopPropagation()}>
                        <Dropdown
                          menu={{ items: resolveTaskMenuItems(task) }}
                          placement="bottomRight"
                          trigger={["click"]}
                        >
                          <button type="button" className={styles.rowMenuButton}>
                            ⋮
                          </button>
                        </Dropdown>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className={styles.taskDetail}>
                        <div className={styles.detailMeta}>
                          <span>
                            会话目标：{task.sessionTarget === "main" ? "主会话" : "隔离执行"}
                          </span>
                          <span>执行时机：{task.wakeMode === "now" ? "立即执行" : "按计划执行"}</span>
                          <span>
                            SessionKey：
                            {task.sessionId
                              ? dialogueSessions.find(item => item.id === task.sessionId)?.title ??
                                task.sessionId
                              : "--"}
                          </span>
                          <span>更新：{formatTimestamp(task.updatedAt)}</span>
                        </div>

                        <div className={styles.runTable}>
                          <div className={styles.runTableHead}>
                            <div>序号</div>
                            <div>计划 / 触发</div>
                            <div>执行耗时</div>
                            <div>状态</div>
                            <div>结果摘要</div>
                            <div>操作</div>
                          </div>

                          {task.runs.length > 0 ? (
                            task.runs.map((run, index) => (
                              <div key={run.id} className={styles.runTableRow}>
                                <div>#{index + 1}</div>
                                <div>{formatTimestamp(run.taskTime)}</div>
                                <div>{run.durationLabel}</div>
                                <div>
                                  <span
                                    className={classNames(styles.pill, {
                                      [styles.pillSuccess]: run.status === "completed",
                                      [styles.pillWarning]: run.status === "pending",
                                      [styles.pillDanger]: run.status === "failed",
                                      [styles.pillRunning]: run.status === "running",
                                    })}
                                  >
                                    {resolveStatusLabel(run.status)}
                                  </span>
                                </div>
                                <div className={styles.runSummary}>{run.result}</div>
                                <div>
                                  <button
                                    type="button"
                                    className={styles.miniButton}
                                    onClick={() =>
                                      message.info("V2 原型暂未接真实会话跳转，这里保留入口。")
                                    }
                                  >
                                    去会话
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className={styles.runTableEmpty}>暂无执行记录</div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className={styles.emptyTable}>当前筛选条件下暂无任务</div>
            )}
          </div>
        </section>

        <Modal
          open={isTaskModalOpen}
          title={editingTaskId ? "编辑自动化任务" : "创建自动化任务"}
          okText={editingTaskId ? "保存更新" : "创建任务"}
          cancelText="取消"
          onOk={handleSubmitTask}
          onCancel={closeTaskModal}
        >
          <div className={styles.modalGrid}>
            <label className={styles.modalField}>
              <span className={styles.fieldLabel}>任务名称</span>
              <Input
                value={taskForm.name}
                placeholder="例如：每日晨报"
                onChange={event =>
                  setTaskForm(prev => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.modalField}>
              <span className={styles.fieldLabel}>任务描述</span>
              <Input
                value={taskForm.description}
                placeholder="补充任务目标和输出要求"
                onChange={event =>
                  setTaskForm(prev => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.modalField}>
              <span className={styles.fieldLabel}>工作目录</span>
              <Select
                value={taskForm.agentId}
                options={agentOptions}
                onChange={value =>
                  setTaskForm(prev => ({
                    ...prev,
                    agentId: value,
                  }))
                }
              />
            </label>

            <label className={styles.modalField}>
              <span className={styles.fieldLabel}>会话目标</span>
              <Select
                value={taskForm.sessionTarget}
                options={[
                  { value: "main", label: "主会话（发送到当前对话）" },
                  { value: "isolated", label: "独立执行（后台单独运行）" },
                ]}
                onChange={value =>
                  setTaskForm(prev => ({
                    ...prev,
                    sessionTarget: value,
                  }))
                }
              />
            </label>

            {taskForm.sessionTarget === "main" ? (
              <label className={classNames(styles.modalField, styles.modalFieldWide)}>
                <span className={styles.fieldLabel}>绑定会话</span>
                <Select
                  value={taskForm.sessionId || undefined}
                  placeholder="请选择一个会话"
                  options={dialogueSessions
                    .filter(item => item.employeeId === taskForm.agentId)
                    .map(item => ({
                      value: item.id,
                      label: item.title,
                    }))}
                  onChange={value =>
                    setTaskForm(prev => ({
                      ...prev,
                      sessionId: value,
                    }))
                  }
                />
              </label>
            ) : null}

            <label className={styles.modalField}>
              <span className={styles.fieldLabel}>计划类型</span>
              <Select
                value={taskForm.scheduleKind}
                options={[
                  { value: "at", label: "单次" },
                  { value: "every", label: "固定频率" },
                  { value: "cron", label: "Cron" },
                ]}
                onChange={value =>
                  setTaskForm(prev => ({
                    ...prev,
                    scheduleKind: value,
                  }))
                }
              />
            </label>

            <label className={styles.modalField}>
              <span className={styles.fieldLabel}>计划描述</span>
              <Input
                value={taskForm.scheduleLabel}
                placeholder="例如：工作日 09:30"
                onChange={event =>
                  setTaskForm(prev => ({
                    ...prev,
                    scheduleLabel: event.target.value,
                  }))
                }
              />
            </label>
          </div>
        </Modal>
      </div>
    </div>
  );
};
