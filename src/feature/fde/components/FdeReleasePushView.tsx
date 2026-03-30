import { useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { Button, Checkbox, Empty, Input, InputNumber, Progress, message } from "antd";

import type {
  FdeReleaseCustomerStatus,
  FdeReleasePushItem,
  FdeReleasePushStatus,
  FdeReleasePushUpdatePayload,
  FdeTeamMemberItem,
} from "@/feature/fde/types";
import { getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeReleasePushView.module.less";

const { TextArea } = Input;

interface FdeReleasePushViewProps {
  items: FdeReleasePushItem[];
  members: FdeTeamMemberItem[];
  selectedReleaseId: string;
  setSelectedReleaseId: (releaseId: string) => void;
  updateReleasePush: (releaseId: string, payload: FdeReleasePushUpdatePayload) => boolean;
  startReleasePush: (releaseId: string) => FdeReleasePushStatus | null;
  pauseReleasePush: (releaseId: string) => FdeReleasePushStatus | null;
  completeReleasePush: (releaseId: string) => FdeReleasePushStatus | null;
  rollbackReleasePush: (releaseId: string, reason: string) => FdeReleasePushStatus | null;
}

const getReleaseClassName = (status: FdeReleasePushStatus): string => {
  if (status === "待发布") {
    return styles.statusPending;
  }

  if (status === "灰度中") {
    return styles.statusRolling;
  }

  if (status === "已暂停") {
    return styles.statusPaused;
  }

  if (status === "已完成") {
    return styles.statusDone;
  }

  return styles.statusRollback;
};

const getCustomerStatusClassName = (status: FdeReleaseCustomerStatus): string =>
  getReleaseClassName(status);

/**
 * 版本推送视图。
 */
export const FdeReleasePushView = ({
  items,
  members,
  selectedReleaseId,
  setSelectedReleaseId,
  updateReleasePush,
  startReleasePush,
  pauseReleasePush,
  completeReleasePush,
  rollbackReleasePush,
}: FdeReleasePushViewProps): JSX.Element => {
  const [targetCustomers, setTargetCustomers] = useState<string[]>([]);
  const [grayPercent, setGrayPercent] = useState<number>(30);
  const [rollbackReason, setRollbackReason] = useState<string>("");
  const selectedRelease = useMemo(
    () => items.find(item => item.id === selectedReleaseId) ?? items[0] ?? null,
    [items, selectedReleaseId],
  );
  const isDraftEditable =
    selectedRelease?.status === "待发布" || selectedRelease?.status === "已暂停";
  const canRollback =
    selectedRelease?.status === "灰度中" ||
    selectedRelease?.status === "已暂停" ||
    selectedRelease?.status === "已完成";

  useEffect(() => {
    if (!selectedRelease) {
      setTargetCustomers([]);
      setGrayPercent(30);
      setRollbackReason("");
      return;
    }

    setTargetCustomers(selectedRelease.targetCustomers);
    setGrayPercent(selectedRelease.grayPercent);
    setRollbackReason(selectedRelease.rollbackReason);
  }, [selectedRelease]);

  const handleSaveConfig = (): void => {
    if (!selectedRelease) {
      return;
    }

    if (!targetCustomers.length) {
      message.warning("请至少选择一个目标客户。");
      return;
    }

    const didUpdate = updateReleasePush(selectedRelease.id, {
      grayPercent,
      targetCustomers,
    });
    if (!didUpdate) {
      message.warning("当前发布单状态不支持修改配置。");
      return;
    }

    message.success("已保存发布配置。");
  };

  const handleStatusAction = (
    action: () => FdeReleasePushStatus | null,
    successText: string,
    failedText: string,
  ): void => {
    const nextStatus = action();
    if (!nextStatus) {
      message.warning(failedText);
      return;
    }

    message.success(successText);
  };

  const handleRollback = (): void => {
    if (!selectedRelease) {
      return;
    }

    const trimmedReason = rollbackReason.trim();
    if (!trimmedReason) {
      message.warning("请先填写回退原因。");
      return;
    }

    const nextStatus = rollbackReleasePush(selectedRelease.id, trimmedReason);
    if (!nextStatus) {
      message.warning("当前发布单还不能执行回退。");
      return;
    }

    message.success("已执行版本回退。");
  };

  if (!items.length) {
    return <Empty description="当前视角下暂无版本推送记录" />;
  }

  return (
    <div className={styles.workbench}>
      <aside className={styles.releaseRail}>
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            className={classNames(
              styles.releaseCard,
              item.id === selectedRelease?.id && styles.releaseCardActive,
            )}
            onClick={() => setSelectedReleaseId(item.id)}
          >
            <div className={styles.releaseTop}>
              <strong>{item.agentName}</strong>
              <span className={classNames(styles.statusTag, getReleaseClassName(item.status))}>
                {item.status}
              </span>
            </div>
            <div className={styles.releaseMeta}>{item.version}</div>
            <div className={styles.releaseMeta}>目标客户 {item.targetCustomers.length} 家</div>
            <div className={styles.releaseMeta}>灰度比例 {item.grayPercent}%</div>
          </button>
        ))}
      </aside>

      <article className={styles.detailPanel}>
        {selectedRelease ? (
          <>
            <div className={styles.header}>
              <div>
                <div className={styles.eyebrow}>版本推送</div>
                <h2 className={styles.title}>
                  {selectedRelease.agentName} · {selectedRelease.version}
                </h2>
                <p className={styles.description}>{selectedRelease.summary}</p>
              </div>
              <span
                className={classNames(
                  styles.statusTag,
                  getReleaseClassName(selectedRelease.status),
                )}
              >
                {selectedRelease.status}
              </span>
            </div>

            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>负责人</span>
                <strong className={styles.metricValue}>
                  {getFdeMemberName(members, selectedRelease.assignedToId)}
                </strong>
              </div>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>目标客户</span>
                <strong className={styles.metricValue}>
                  {selectedRelease.targetCustomers.length} 家
                </strong>
              </div>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>灰度比例</span>
                <strong className={styles.metricValue}>{selectedRelease.grayPercent}%</strong>
              </div>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>采纳率</span>
                <strong className={styles.metricValue}>{selectedRelease.adoptionRate}%</strong>
              </div>
            </div>

            <article className={styles.actionCard}>
              <div className={styles.sectionTitle}>发布控制</div>
              <div className={styles.configGrid}>
                <div className={styles.configBlock}>
                  <div className={styles.configTitle}>目标客户选择</div>
                  <Checkbox.Group
                    className={styles.checkboxGroup}
                    disabled={!isDraftEditable}
                    value={targetCustomers}
                    options={selectedRelease.availableCustomers.map(item => ({
                      label: item,
                      value: item,
                    }))}
                    onChange={value =>
                      setTargetCustomers(value.filter((item): item is string => typeof item === "string"))
                    }
                  />
                </div>
                <div className={styles.configBlock}>
                  <div className={styles.configTitle}>灰度比例</div>
                  <InputNumber
                    className={styles.percentInput}
                    disabled={!isDraftEditable}
                    min={10}
                    max={100}
                    step={10}
                    value={grayPercent}
                    addonAfter="%"
                    onChange={value => setGrayPercent(Number(value ?? 30))}
                  />
                  <div className={styles.helperText}>建议先从 30% 灰度开始，再视反馈逐步放量。</div>
                </div>
              </div>

              <div className={styles.actionRow}>
                {isDraftEditable ? (
                  <Button onClick={handleSaveConfig}>保存发布配置</Button>
                ) : null}

                {selectedRelease.status === "待发布" || selectedRelease.status === "已暂停" ? (
                  <Button
                    type="primary"
                    onClick={() =>
                      handleStatusAction(
                        () => startReleasePush(selectedRelease.id),
                        selectedRelease.status === "待发布" ? "已启动灰度发布。" : "已恢复灰度发布。",
                        "当前发布单还不能开始推送。",
                      )
                    }
                  >
                    {selectedRelease.status === "待发布" ? "开始灰度" : "恢复灰度"}
                  </Button>
                ) : null}

                {selectedRelease.status === "灰度中" ? (
                  <>
                    <Button
                      onClick={() =>
                        handleStatusAction(
                          () => pauseReleasePush(selectedRelease.id),
                          "灰度发布已暂停。",
                          "当前发布单不在灰度中。",
                        )
                      }
                    >
                      暂停灰度
                    </Button>
                    <Button
                      type="primary"
                      onClick={() =>
                        handleStatusAction(
                          () => completeReleasePush(selectedRelease.id),
                          "已完成全量发布。",
                          "当前发布单无法直接全量推送。",
                        )
                      }
                    >
                      全量发布
                    </Button>
                  </>
                ) : null}

                {selectedRelease.status === "已暂停" ? (
                  <Button
                    type="primary"
                    onClick={() =>
                      handleStatusAction(
                        () => completeReleasePush(selectedRelease.id),
                        "已完成全量发布。",
                        "当前发布单无法直接全量推送。",
                      )
                    }
                  >
                    直接全量发布
                  </Button>
                ) : null}
              </div>

              {canRollback ? (
                <div className={styles.rollbackPanel}>
                  <div className={styles.configTitle}>回退原因</div>
                  <TextArea
                    rows={3}
                    value={rollbackReason}
                    placeholder="请记录回退原因，例如关键指标异常、客户反馈波动或灰度结果不稳定。"
                    onChange={event => setRollbackReason(event.target.value)}
                  />
                  <Button danger onClick={handleRollback}>
                    执行回退
                  </Button>
                </div>
              ) : null}
            </article>

            <article className={styles.card}>
              <div className={styles.sectionTitle}>推送节奏</div>
              <div className={styles.releaseMetaRow}>最近操作：{selectedRelease.pushedAt}</div>
              <Progress percent={selectedRelease.adoptionRate} strokeColor="var(--fdeAccent)" />
              {selectedRelease.rollbackReason ? (
                <div className={styles.rollbackNote}>回退原因：{selectedRelease.rollbackReason}</div>
              ) : null}
            </article>

            <article className={styles.card}>
              <div className={styles.sectionTitle}>客户维度结果</div>
              <div className={styles.customerList}>
                {selectedRelease.customerResults.map(item => (
                  <div key={item.id} className={styles.customerItem}>
                    <div className={styles.customerTop}>
                      <strong>{item.customerName}</strong>
                      <span
                        className={classNames(
                          styles.statusTag,
                          getCustomerStatusClassName(item.status),
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className={styles.customerMetrics}>
                      <span>灰度 {item.rolloutPercent}%</span>
                      <span>采纳率 {item.adoptionRate}%</span>
                    </div>
                    <div className={styles.releaseMetaRow}>{item.feedback}</div>
                    <div className={styles.releaseMetaRow}>更新时间：{item.lastUpdatedAt}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.card}>
              <div className={styles.sectionTitle}>发布说明</div>
              <div className={styles.sectionList}>
                {selectedRelease.releaseSections.map(section => (
                  <div key={section.title} className={styles.sectionCard}>
                    <div className={styles.configTitle}>{section.title}</div>
                    <div className={styles.noteList}>
                      {section.items.map(item => (
                        <div key={item} className={styles.noteItem}>
                          <span className={styles.noteDot} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.card}>
              <div className={styles.sectionTitle}>操作记录</div>
              <div className={styles.timelineList}>
                {selectedRelease.timeline.map(item => (
                  <div key={item.id} className={styles.timelineItem}>
                    <div className={styles.timelineHeader}>
                      <strong>{item.title}</strong>
                      <span className={styles.releaseMetaRow}>{item.createdAt}</span>
                    </div>
                    <div className={styles.releaseMetaRow}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </article>
          </>
        ) : (
          <Empty description="请选择推送记录" />
        )}
      </article>
    </div>
  );
};
