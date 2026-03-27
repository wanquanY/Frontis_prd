import { useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Empty, Input, Select, Tag, message } from "antd";

import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./FrontisWebViews.module.less";
import {
  DEFAULT_SCHEDULED_TASKS,
  getTaskRunStatusLabel,
  getTaskStatusLabel,
} from "./FrontisWebViews";
import type {
  ScheduledTaskFrequency,
  ScheduledTaskItem,
  ScheduledTaskViewProps,
} from "./FrontisWebViews";

/**
 * 定时任务视图。
 */
export const ScheduledTaskView = ({ employees }: ScheduledTaskViewProps): JSX.Element => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [taskName, setTaskName] = useState<string>("");
  const [taskInstruction, setTaskInstruction] = useState<string>("");
  const [taskEmployeeId, setTaskEmployeeId] = useState<string>(employees[0]?.id ?? "");
  const [taskFrequency, setTaskFrequency] = useState<ScheduledTaskFrequency>("每日");
  const [tasks, setTasks] = useState<ScheduledTaskItem[]>(DEFAULT_SCHEDULED_TASKS);

  useEffect(() => {
    if (!taskEmployeeId && employees[0]) {
      setTaskEmployeeId(employees[0].id);
    }
  }, [employees, taskEmployeeId]);

  const employeeMap = useMemo(() => new Map(employees.map(item => [item.id, item])), [employees]);
  const allowedEmployeeIds = useMemo(() => new Set(employees.map(item => item.id)), [employees]);
  const agentOptions = useMemo(
    () => [
      { label: "全部 Agent", value: "all" },
      ...employees.map(item => ({
        label: item.name,
        value: item.id,
      })),
    ],
    [employees],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter(item => {
        if (!allowedEmployeeIds.has(item.employeeId)) {
          return false;
        }
        return selectedAgentId === "all" ? true : item.employeeId === selectedAgentId;
      }),
    [allowedEmployeeIds, selectedAgentId, tasks],
  );

  const selectedTask = useMemo(
    () => filteredTasks.find(item => item.id === selectedTaskId) ?? filteredTasks[0] ?? null,
    [filteredTasks, selectedTaskId],
  );

  useEffect(() => {
    if (!filteredTasks.length) {
      setSelectedTaskId("");
      return;
    }
    if (filteredTasks.some(item => item.id === selectedTaskId)) {
      return;
    }
    setSelectedTaskId(filteredTasks[0].id);
  }, [filteredTasks, selectedTaskId]);

  if (employees.length === 0) {
    return (
      <div className={styles.view}>
        <section className={styles.sectionCard}>
          <div className={styles.emptyState}>
            <Empty description="当前账号暂未分配 Agent，暂时无法创建定时任务。" />
          </div>
        </section>
      </div>
    );
  }

  const handleCreateTask = (): void => {
    const nextName = taskName.trim();
    const nextInstruction = taskInstruction.trim();
    if (!nextName || !nextInstruction || !taskEmployeeId) {
      message.info("请先补全任务名称、执行 Agent 和任务说明。");
      return;
    }

    const nextTask: ScheduledTaskItem = {
      employeeId: taskEmployeeId,
      frequency: taskFrequency,
      id: `task-${Date.now()}`,
      instruction: nextInstruction,
      lastRunSummary: "新任务待执行。",
      name: nextName,
      nextRunAt:
        taskFrequency === "单次"
          ? "今天 18:00"
          : taskFrequency === "每日"
            ? "明天 09:00"
            : "下周一 10:00",
      runs: [],
      status: "active",
    };

    setTasks(prev => [nextTask, ...prev]);
    setSelectedAgentId("all");
    setSelectedTaskId(nextTask.id);
    setTaskName("");
    setTaskInstruction("");
    setTaskFrequency("每日");
    message.success("定时任务已创建");
  };

  return (
    <div className={styles.view}>
      <section className={styles.heroCard}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>定时任务</span>
          <h2 className={styles.heroTitle}>按 Agent 创建单次、每日或每周任务，并跟踪执行结果</h2>
          <p className={styles.heroDescription}>
            任务结构按文档收敛为 Web 端普通用户能力，不再暴露空间、频道或群聊绑定。
          </p>
        </div>
        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>任务总数</span>
            <strong className={styles.summaryValue}>{tasks.length}</strong>
            <span className={styles.summaryHint}>按 Agent 维度统一查看</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>启用中</span>
            <strong className={styles.summaryValue}>
              {tasks.filter(item => item.status === "active").length}
            </strong>
            <span className={styles.summaryHint}>暂停后可随时恢复</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>最近执行</span>
            <strong className={styles.summaryValue}>{tasks[0]?.nextRunAt ?? "--"}</strong>
            <span className={styles.summaryHint}>完成后将在站内通知结果</span>
          </article>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>新建任务</div>
            <div className={styles.sectionDescription}>
              填写任务名称、执行 Agent、频率和自然语言任务说明。
            </div>
          </div>
        </div>

        <div className={styles.taskComposerGrid}>
          <Input
            placeholder="任务名称，例如：每日销售日报"
            value={taskName}
            onChange={event => setTaskName(event.target.value)}
          />
          <Select
            options={employees.map(item => ({
              label: item.name,
              value: item.id,
            }))}
            value={taskEmployeeId}
            onChange={value => setTaskEmployeeId(value)}
          />
          <Select
            options={[
              { label: "单次", value: "单次" },
              { label: "每日", value: "每日" },
              { label: "每周", value: "每周" },
            ]}
            value={taskFrequency}
            onChange={value => setTaskFrequency(value as ScheduledTaskFrequency)}
          />
          <Input.TextArea
            className={styles.taskTextarea}
            placeholder="输入自然语言任务说明，例如：每天早上 9 点整理昨天新增线索并输出一段摘要。"
            rows={4}
            value={taskInstruction}
            onChange={event => setTaskInstruction(event.target.value)}
          />
          <div className={styles.compactActions}>
            <Button type="primary" onClick={handleCreateTask}>
              创建任务
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>任务列表与执行记录</div>
            <div className={styles.sectionDescription}>
              支持启用、停用和删除任务，并查看最近执行历史。
            </div>
          </div>
          <Select
            className={styles.filterSelect}
            options={agentOptions}
            value={selectedAgentId}
            onChange={value => setSelectedAgentId(value)}
          />
        </div>

        <div className={styles.splitLayout}>
          <div className={styles.listPane}>
            {filteredTasks.length === 0 ? (
              <div className={styles.emptyState}>
                <Empty description="当前筛选条件下暂无任务" />
              </div>
            ) : (
              <div className={styles.cardList}>
                {filteredTasks.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={classNames(styles.rowCard, {
                      [styles.rowCardActive]: item.id === selectedTask?.id,
                    })}
                    onClick={() => setSelectedTaskId(item.id)}
                  >
                    <div className={styles.rowCardHeader}>
                      <span className={styles.rowCardTitle}>{item.name}</span>
                      <Tag bordered={false} className={styles.lightTag}>
                        {getTaskStatusLabel(item.status)}
                      </Tag>
                    </div>
                    <div className={styles.rowCardMeta}>
                      <span>{employeeMap.get(item.employeeId)?.name ?? item.employeeId}</span>
                      <span>{item.frequency}</span>
                    </div>
                    <div className={styles.rowCardSummary}>{item.lastRunSummary}</div>
                    <div className={styles.rowCardFooter}>
                      <span className={styles.metaChip}>下次执行 {item.nextRunAt}</span>
                      <span className={styles.metaChip}>{item.runs.length} 条记录</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.detailPane}>
            {selectedTask ? (
              <>
                <div className={styles.detailHero}>
                  <div className={styles.detailTitleWrap}>
                    <div className={styles.detailTitle}>{selectedTask.name}</div>
                    <div className={styles.detailSub}>
                      {employeeMap.get(selectedTask.employeeId)?.name ?? selectedTask.employeeId} ·{" "}
                      {selectedTask.frequency}
                    </div>
                  </div>
                  <div className={styles.compactActions}>
                    <Button
                      onClick={() =>
                        setTasks(prev =>
                          prev.map(item =>
                            item.id === selectedTask.id
                              ? {
                                  ...item,
                                  status: item.status === "active" ? "paused" : "active",
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {selectedTask.status === "active" ? "停用任务" : "启用任务"}
                    </Button>
                    <Button
                      danger
                      onClick={() => {
                        setTasks(prev => prev.filter(item => item.id !== selectedTask.id));
                        setSelectedTaskId("");
                        message.success("任务已删除");
                      }}
                    >
                      删除任务
                    </Button>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailMetric}>
                    <span className={styles.detailMetricLabel}>任务状态</span>
                    <span className={styles.detailMetricValue}>
                      {getTaskStatusLabel(selectedTask.status)}
                    </span>
                  </div>
                  <div className={styles.detailMetric}>
                    <span className={styles.detailMetricLabel}>下次执行</span>
                    <span className={styles.detailMetricValue}>{selectedTask.nextRunAt}</span>
                  </div>
                  <div className={styles.detailMetric}>
                    <span className={styles.detailMetricLabel}>最近结果</span>
                    <span className={styles.detailMetricValue}>{selectedTask.lastRunSummary}</span>
                  </div>
                </div>

                <div className={classNames(styles.detailBlock, adminStyles.detailBlock)}>
                  <div className={adminStyles.detailBlockTitle}>任务说明</div>
                  <div className={styles.taskInstruction}>{selectedTask.instruction}</div>
                </div>

                <div className={classNames(styles.detailBlock, adminStyles.detailBlock)}>
                  <div className={adminStyles.detailBlockTitle}>执行历史</div>
                  <div className={styles.tableList}>
                    {selectedTask.runs.length > 0 ? (
                      selectedTask.runs.map(run => (
                        <div key={run.id} className={styles.tableRow}>
                          <div className={styles.tablePrimary}>
                            <div className={styles.tableTitle}>{run.startedAt}</div>
                            <div className={styles.tableMeta}>{run.summary}</div>
                          </div>
                          <div className={styles.tableValue}>
                            {getTaskRunStatusLabel(run.status)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.inlineMuted}>新建任务将在首次执行后展示历史记录。</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <Empty description="请选择一个任务查看详情" />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
