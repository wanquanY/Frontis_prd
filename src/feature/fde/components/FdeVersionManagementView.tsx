import { useEffect, useMemo, useState } from "react";

import { DownOutlined, RightOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { Button, Empty, Input, Modal, Select, message } from "antd";

import type {
  FdeTeamMemberItem,
  FdeVersionHistoryItem,
  FdeVersionManagementStatus,
  FdeVersionManagementTaskItem,
} from "@/feature/fde/types";

import styles from "./FdeVersionManagementView.module.less";

const ROLLBACK_REASON_OPTIONS = [
  { label: "版本结果不符合预期", value: "版本结果不符合预期" },
  { label: "客户现网流程不兼容", value: "客户现网流程不兼容" },
  { label: "升级后反馈异常增多", value: "升级后反馈异常增多" },
  { label: "其他业务原因", value: "其他业务原因" },
] as const;

interface FdeVersionManagementViewProps {
  items: FdeVersionManagementTaskItem[];
  members: FdeTeamMemberItem[];
  selectedTaskId: string;
  setSelectedTaskId: (taskId: string) => void;
}

interface VersionCustomerGroup {
  customerId: string;
  customerName: string;
  tasks: FdeVersionManagementTaskItem[];
}

interface VersionDrawerState {
  taskId: string;
  version: string;
}

const getStatusClassName = (status: FdeVersionManagementStatus): string => {
  if (status === "当前版本") {
    return styles.statusCurrent;
  }

  if (status === "可升级") {
    return styles.statusUpgradable;
  }

  if (status === "已推送") {
    return styles.statusPushed;
  }

  if (status === "已回退") {
    return styles.statusRolledBack;
  }

  return styles.statusIgnored;
};

const getVersionStatusClassName = (statusLabel: string): string => {
  if (statusLabel === "当前线上版本") {
    return styles.historyStatusCurrent;
  }

  if (statusLabel === "可升级" || statusLabel === "已推送") {
    return styles.historyStatusUpgradable;
  }

  if (statusLabel === "可回退" || statusLabel === "已回退") {
    return styles.historyStatusRolledBack;
  }

  if (statusLabel === "已忽略") {
    return styles.historyStatusIgnored;
  }

  return styles.historyStatusDefault;
};

const buildCustomerGroups = (items: FdeVersionManagementTaskItem[]): VersionCustomerGroup[] => {
  const groups = new Map<string, VersionCustomerGroup>();

  items.forEach(item => {
    const existing = groups.get(item.customerId);

    if (existing) {
      existing.tasks.push(item);
      return;
    }

    groups.set(item.customerId, {
      customerId: item.customerId,
      customerName: item.customerName,
      tasks: [item],
    });
  });

  return Array.from(groups.values());
};

const findRollbackTarget = (
  history: FdeVersionHistoryItem[],
  currentVersion: string,
): FdeVersionHistoryItem | null => {
  const currentIndex = history.findIndex(item => item.version === currentVersion);

  if (currentIndex >= 0 && currentIndex < history.length - 1) {
    return history[currentIndex + 1];
  }

  return history.find(item => item.version !== currentVersion) ?? null;
};

const normalizeHistory = (
  history: FdeVersionHistoryItem[],
  currentVersion: string,
  latestVersion: string,
  latestStatusLabel: string,
): FdeVersionHistoryItem[] =>
  history.map(item => {
    if (item.version === currentVersion) {
      return {
        ...item,
        isCurrent: true,
        statusLabel: "当前线上版本",
      };
    }

    if (item.version === latestVersion) {
      return {
        ...item,
        isCurrent: false,
        statusLabel: latestStatusLabel,
      };
    }

    return {
      ...item,
      isCurrent: false,
      statusLabel: item.statusLabel === "当前线上版本" ? "历史版本" : item.statusLabel,
    };
  });

const buildRollbackNote = (reason: string, remark: string): string => {
  if (!remark.trim()) {
    return `回退原因：${reason}`;
  }

  return `回退原因：${reason}；备注：${remark.trim()}`;
};

const getVersionStatusLabel = (
  task: FdeVersionManagementTaskItem,
  version: FdeVersionHistoryItem,
): string => {
  const rollbackTarget = findRollbackTarget(task.versionHistory, task.currentVersion);

  if (version.version === task.currentVersion) {
    return "当前线上版本";
  }

  if (task.status === "当前版本" && rollbackTarget?.version === version.version) {
    return "可回退";
  }

  if (version.version === task.latestVersion) {
    return task.status;
  }

  return version.statusLabel === "当前线上版本" ? "历史版本" : version.statusLabel;
};

const getTaskSourceTags = (task: FdeVersionManagementTaskItem): string[] => {
  if (task.collectionLabels?.length) {
    return task.collectionLabels;
  }

  return [task.deliverySourceLabel ?? "单个下发"];
};

/**
 * FDE AI 专家版本管理视图。
 */
export const FdeVersionManagementView = ({
  items,
  selectedTaskId,
  setSelectedTaskId,
}: FdeVersionManagementViewProps): JSX.Element => {
  const [taskState, setTaskState] = useState<FdeVersionManagementTaskItem[]>(items);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(items[0]?.customerId ?? "");
  const [expandedTaskId, setExpandedTaskId] = useState<string>(items[0]?.id ?? "");
  const [drawerState, setDrawerState] = useState<VersionDrawerState | null>(null);
  const [showRollbackForm, setShowRollbackForm] = useState<boolean>(false);
  const [rollbackReason, setRollbackReason] = useState<string>("");
  const [rollbackRemark, setRollbackRemark] = useState<string>("");

  useEffect(() => {
    setTaskState(items);
  }, [items]);

  const customerGroups = useMemo(() => buildCustomerGroups(taskState), [taskState]);
  const selectedCustomer = useMemo(
    () =>
      customerGroups.find(item => item.customerId === selectedCustomerId) ??
      customerGroups.find(item => item.tasks.some(task => task.id === selectedTaskId)) ??
      customerGroups[0] ??
      null,
    [customerGroups, selectedCustomerId, selectedTaskId],
  );
  const selectedCustomerTasks = selectedCustomer?.tasks ?? [];
  const drawerTask = useMemo(
    () => (drawerState ? taskState.find(item => item.id === drawerState.taskId) ?? null : null),
    [drawerState, taskState],
  );
  const drawerVersion = useMemo(
    () =>
      drawerTask && drawerState
        ? drawerTask.versionHistory.find(item => item.version === drawerState.version) ?? null
        : null,
    [drawerState, drawerTask],
  );
  const drawerRollbackTarget = useMemo(
    () => (drawerTask ? findRollbackTarget(drawerTask.versionHistory, drawerTask.currentVersion) : null),
    [drawerTask],
  );

  useEffect(() => {
    if (!selectedCustomer && customerGroups[0]) {
      setSelectedCustomerId(customerGroups[0].customerId);
      setExpandedTaskId(customerGroups[0].tasks[0]?.id ?? "");
      return;
    }

    if (
      selectedCustomerId &&
      !customerGroups.some(item => item.customerId === selectedCustomerId) &&
      customerGroups[0]
    ) {
      setSelectedCustomerId(customerGroups[0].customerId);
      setExpandedTaskId(customerGroups[0].tasks[0]?.id ?? "");
    }
  }, [customerGroups, selectedCustomer, selectedCustomerId]);

  const resetRollbackDraft = (): void => {
    setShowRollbackForm(false);
    setRollbackReason("");
    setRollbackRemark("");
  };

  const updateTask = (
    taskId: string,
    updater: (task: FdeVersionManagementTaskItem) => FdeVersionManagementTaskItem,
  ): void => {
    setTaskState(previous => previous.map(item => (item.id === taskId ? updater(item) : item)));
  };

  const handleSelectCustomer = (customerId: string): void => {
    const targetCustomer = customerGroups.find(item => item.customerId === customerId);

    if (!targetCustomer?.tasks.length) {
      return;
    }

    setSelectedCustomerId(customerId);
    setSelectedTaskId(targetCustomer.tasks[0].id);
    setExpandedTaskId(targetCustomer.tasks[0].id);
    setDrawerState(null);
    resetRollbackDraft();
  };

  const handleToggleTask = (taskId: string): void => {
    setExpandedTaskId(previous => (previous === taskId ? "" : taskId));
    setSelectedTaskId(taskId);
  };

  const handleOpenDrawer = (taskId: string, version: string): void => {
    setSelectedTaskId(taskId);
    setDrawerState({ taskId, version });
    resetRollbackDraft();
  };

  const handleCloseDrawer = (): void => {
    setDrawerState(null);
    resetRollbackDraft();
  };

  const handlePushUpgrade = (taskId: string): void => {
    updateTask(taskId, item => ({
      ...item,
      status: "已推送",
      lastActionLabel: "已推送升级",
      lastActionAt: "刚刚",
      customerDecisionHint: "等待企业管理员确认是否切到新版本。",
      ignoreReason: undefined,
      versionHistory: normalizeHistory(
        item.versionHistory,
        item.currentVersion,
        item.latestVersion,
        "已推送",
      ),
    }));
    message.success("升级已推送给企业管理员。");
  };

  const handleMarkCurrent = (taskId: string): void => {
    updateTask(taskId, item => ({
      ...item,
      status: "当前版本",
      currentVersion: item.latestVersion,
      lastActionLabel: `已切换到 ${item.latestVersion}`,
      lastActionAt: "刚刚",
      customerDecisionHint: "企业已切换到当前最新版本。",
      ignoreReason: undefined,
      versionHistory: normalizeHistory(
        item.versionHistory,
        item.latestVersion,
        item.latestVersion,
        "当前线上版本",
      ),
    }));
    message.success("已标记为当前版本。");
  };

  const handleIgnoreUpgrade = (taskId: string): void => {
    updateTask(taskId, item => ({
      ...item,
      status: "已忽略",
      lastActionLabel: "已忽略本次版本",
      lastActionAt: "刚刚",
      customerDecisionHint: "企业管理员决定本轮先不切版本。",
      ignoreReason: "当前业务窗口不适合切换版本，保留现状。",
      versionHistory: normalizeHistory(
        item.versionHistory,
        item.currentVersion,
        item.latestVersion,
        "已忽略",
      ),
    }));
    message.info("已记录为忽略本次版本。");
  };

  const handleConfirmRollback = (taskId: string, targetVersion: string): void => {
    const targetTask = taskState.find(item => item.id === taskId);

    if (!targetTask) {
      return;
    }

    const nextRollbackTarget =
      targetTask.versionHistory.find(item => item.version === targetVersion) ?? null;

    if (!nextRollbackTarget || nextRollbackTarget.version === targetTask.currentVersion) {
      message.warning("当前选择的版本不能执行回退。");
      return;
    }

    if (!rollbackReason) {
      message.warning("请先选择回退原因。");
      return;
    }

    updateTask(taskId, item => ({
      ...item,
      status: "已回退",
      currentVersion: nextRollbackTarget.version,
      lastActionLabel: `已回退到 ${nextRollbackTarget.version}`,
      lastActionAt: "刚刚",
      customerDecisionHint: `企业已从 ${item.currentVersion} 回退到 ${nextRollbackTarget.version}。`,
      ignoreReason: buildRollbackNote(rollbackReason, rollbackRemark),
      versionHistory: normalizeHistory(
        item.versionHistory,
        nextRollbackTarget.version,
        item.latestVersion,
        "已回退",
      ),
    }));
    message.success(`已回退到 ${nextRollbackTarget.version}。`);
    resetRollbackDraft();
  };

  const handleRestoreUpgradable = (taskId: string): void => {
    updateTask(taskId, item => ({
      ...item,
      status: "可升级",
      lastActionLabel: "恢复可升级",
      lastActionAt: "刚刚",
      customerDecisionHint: "该 Agent 已恢复到可升级状态，可重新推送。",
      ignoreReason: undefined,
      versionHistory: normalizeHistory(
        item.versionHistory,
        item.currentVersion,
        item.latestVersion,
        "可升级",
      ),
    }));
    message.success("已恢复为可升级状态。");
  };

  const renderDrawerActions = (): JSX.Element => {
    if (!drawerTask || !drawerVersion) {
      return <></>;
    }

    const isCurrentVersion = drawerVersion.version === drawerTask.currentVersion;
    const isLatestVersion = drawerVersion.version === drawerTask.latestVersion;
    const isRollbackCandidate =
      drawerTask.status === "当前版本" && drawerRollbackTarget?.version === drawerVersion.version;

    if (isRollbackCandidate) {
      return (
        <>
          <Button danger type="primary" onClick={() => setShowRollbackForm(true)}>
            执行回退
          </Button>
          <span className={styles.actionHintText}>该版本是当前线上版本的上一个稳定版本。</span>
        </>
      );
    }

    if (isCurrentVersion) {
      return <span className={styles.actionHintText}>当前线上版本，无需处理。</span>;
    }

    if (isLatestVersion && drawerTask.status === "可升级") {
      return (
        <>
          <Button type="primary" onClick={() => handlePushUpgrade(drawerTask.id)}>
            推送升级
          </Button>
          <Button onClick={() => handleIgnoreUpgrade(drawerTask.id)}>忽略本次版本</Button>
        </>
      );
    }

    if (isLatestVersion && drawerTask.status === "已推送") {
      return (
        <>
          <Button type="primary" onClick={() => handleMarkCurrent(drawerTask.id)}>
            标记为当前版本
          </Button>
          <Button onClick={() => handleIgnoreUpgrade(drawerTask.id)}>忽略本次版本</Button>
        </>
      );
    }

    if (isLatestVersion && drawerTask.status === "已忽略") {
      return (
        <Button type="primary" onClick={() => handleRestoreUpgradable(drawerTask.id)}>
          恢复可升级
        </Button>
      );
    }

    if (isLatestVersion && drawerTask.status === "已回退") {
      return (
        <>
          <Button type="primary" onClick={() => handlePushUpgrade(drawerTask.id)}>
            重新推送升级
          </Button>
          <Button onClick={() => handleRestoreUpgradable(drawerTask.id)}>恢复可升级</Button>
        </>
      );
    }

    return <span className={styles.actionHintText}>该版本记录仅支持查看详情。</span>;
  };

  if (!taskState.length) {
    return <Empty description="当前视角下暂无 AI 专家版本任务" />;
  }

  return (
    <>
      <div className={styles.layout}>
        <aside className={styles.customerSidebar}>
          <div className={styles.sidebarTitle}>租户列表</div>
          <div className={styles.customerList}>
            {customerGroups.map(customer => {
              return (
                <button
                  key={customer.customerId}
                  type="button"
                  className={classNames(
                    styles.customerItem,
                    customer.customerId === selectedCustomer?.customerId && styles.customerItemActive,
                  )}
                  onClick={() => handleSelectCustomer(customer.customerId)}
                >
                  <div className={styles.customerName}>{customer.customerName}</div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={styles.contentPanel}>
          {selectedCustomer ? (
            <>
              <div className={styles.pageHeader}>
                <div className={styles.pageTitle}>{selectedCustomer.customerName}</div>
              </div>

              <div className={styles.agentList}>
                {selectedCustomerTasks.map(task => (
                  <div key={task.id} className={styles.agentBlock}>
                    <button
                      type="button"
                      className={styles.agentRow}
                      onClick={() => handleToggleTask(task.id)}
                    >
                      <span className={styles.expandIcon}>
                        {expandedTaskId === task.id ? <DownOutlined /> : <RightOutlined />}
                      </span>
                      <span className={styles.agentColName}>
                        <span className={styles.agentName}>{task.agentName}</span>
                        <span className={styles.agentTagList}>
                          {getTaskSourceTags(task).map(tag => (
                            <span key={tag} className={styles.agentTag}>
                              {tag}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className={styles.agentCol}>{task.currentVersion}</span>
                      <span className={styles.agentCol}>{task.latestVersion}</span>
                      <span className={classNames(styles.statusTag, getStatusClassName(task.status))}>
                        {task.status}
                      </span>
                      <span className={styles.agentCol}>{task.lastActionLabel}</span>
                    </button>

                    {expandedTaskId === task.id ? (
                      <div className={styles.versionList}>
                        <div className={styles.versionHeader}>
                          <span>版本号</span>
                          <span>发布时间</span>
                          <span>状态</span>
                          <span>说明</span>
                          <span>操作</span>
                        </div>
                        {task.versionHistory.map(version => {
                          const versionStatusLabel = getVersionStatusLabel(task, version);

                          return (
                            <div key={version.version} className={styles.versionRow}>
                              <span className={styles.versionValue}>{version.version}</span>
                              <span className={styles.versionValue}>{version.releaseDate}</span>
                              <span
                                className={classNames(
                                  styles.historyStatus,
                                  getVersionStatusClassName(versionStatusLabel),
                                )}
                              >
                                {versionStatusLabel}
                              </span>
                              <span className={styles.versionSummary}>{version.summary}</span>
                              <Button
                                type="link"
                                onClick={() => handleOpenDrawer(task.id, version.version)}
                              >
                                查看详情
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty description="请选择租户" />
          )}
        </section>
      </div>

      <Modal
        open={Boolean(drawerState && drawerTask && drawerVersion)}
        onCancel={handleCloseDrawer}
        title={null}
        width={720}
        footer={null}
        className={styles.versionModal}
      >
        {drawerTask && drawerVersion ? (
          <div className={styles.drawerBody}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerCustomer}>{drawerTask.customerName}</div>
              <div className={styles.drawerTitle}>{drawerTask.agentName}</div>
              <div className={styles.drawerVersionLine}>
                版本 {drawerVersion.version} · {drawerVersion.releaseDate}
              </div>
            </div>

            <div className={styles.drawerSection}>
              <div className={styles.drawerSectionTitle}>版本信息</div>
              <div className={styles.drawerMetaList}>
                <div className={styles.drawerMetaRow}>
                  <span className={styles.drawerMetaLabel}>状态</span>
                  <span
                    className={classNames(
                      styles.historyStatus,
                      getVersionStatusClassName(getVersionStatusLabel(drawerTask, drawerVersion)),
                    )}
                  >
                    {getVersionStatusLabel(drawerTask, drawerVersion)}
                  </span>
                </div>
                <div className={styles.drawerMetaRow}>
                  <span className={styles.drawerMetaLabel}>来源</span>
                  <span className={styles.drawerMetaValue}>{getTaskSourceTags(drawerTask).join("、")}</span>
                </div>
                <div className={styles.drawerMetaRow}>
                  <span className={styles.drawerMetaLabel}>作用范围</span>
                  <span className={styles.drawerMetaValue}>{drawerTask.targetScope}</span>
                </div>
                <div className={styles.drawerMetaRow}>
                  <span className={styles.drawerMetaLabel}>最近操作</span>
                  <span className={styles.drawerMetaValue}>{drawerTask.lastActionLabel}</span>
                </div>
                <div className={styles.drawerMetaRow}>
                  <span className={styles.drawerMetaLabel}>版本说明</span>
                  <span className={styles.drawerMetaValue}>{drawerVersion.summary}</span>
                </div>
              </div>
            </div>

            {(drawerTask.customerDecisionHint || drawerTask.ignoreReason) && (
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>处理记录</div>
                <div className={styles.drawerTextList}>
                  {drawerTask.customerDecisionHint ? (
                    <div className={styles.drawerText}>{drawerTask.customerDecisionHint}</div>
                  ) : null}
                  {drawerTask.ignoreReason ? (
                    <div className={styles.drawerText}>{drawerTask.ignoreReason}</div>
                  ) : null}
                </div>
              </div>
            )}

            <div className={styles.drawerSection}>
              <div className={styles.drawerSectionTitle}>版本操作</div>
              <div className={styles.actionRow}>{renderDrawerActions()}</div>
            </div>

            {showRollbackForm && drawerRollbackTarget?.version === drawerVersion.version ? (
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionTitle}>执行回退</div>
                <div className={styles.rollbackSteps}>
                  <div className={styles.rollbackStep}>
                    1. 当前线上版本将回退到该稳定版本
                  </div>
                  <div className={styles.rollbackStep}>2. 选择回退原因</div>
                  <div className={styles.rollbackStep}>3. 备注执行说明后确认回退</div>
                </div>
                <div className={styles.rollbackForm}>
                  <div className={styles.formField}>
                    <span className={styles.formLabel}>回退版本</span>
                    <div className={styles.rollbackVersionBox}>
                      <span className={styles.rollbackVersionArrow}>{drawerTask.currentVersion}</span>
                      <span className={styles.rollbackVersionArrow}>→</span>
                      <span className={styles.rollbackVersionTarget}>{drawerVersion.version}</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <span className={styles.formLabel}>回退原因 *</span>
                    <Select
                      value={rollbackReason || undefined}
                      placeholder="请选择回退原因"
                      options={ROLLBACK_REASON_OPTIONS.map(item => ({
                        label: item.label,
                        value: item.value,
                      }))}
                      onChange={setRollbackReason}
                    />
                  </div>
                  <div className={styles.formField}>
                    <span className={styles.formLabel}>备注</span>
                    <Input.TextArea
                      value={rollbackRemark}
                      rows={3}
                      placeholder="补充租户反馈、异常现象或执行说明"
                      onChange={event => setRollbackRemark(event.target.value)}
                    />
                  </div>
                  <div className={styles.actionRow}>
                    <Button
                      danger
                      type="primary"
                      onClick={() => handleConfirmRollback(drawerTask.id, drawerVersion.version)}
                    >
                      确认回退
                    </Button>
                    <Button onClick={resetRollbackDraft}>取消</Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
};
