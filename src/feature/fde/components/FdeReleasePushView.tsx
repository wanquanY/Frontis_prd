import { useMemo } from "react";

import classNames from "classnames";
import { Empty, Progress } from "antd";

import type { FdeReleasePushItem, FdeTeamMemberItem } from "@/feature/fde/types";
import { getFdeMemberName } from "@/feature/fde/utils";

import styles from "./FdeReleasePushView.module.less";

interface FdeReleasePushViewProps {
  items: FdeReleasePushItem[];
  members: FdeTeamMemberItem[];
  selectedReleaseId: string;
  setSelectedReleaseId: (releaseId: string) => void;
}

const getReleaseClassName = (status: FdeReleasePushItem["status"]): string => {
  if (status === "待发布") {
    return styles.statusPending;
  }

  if (status === "灰度中") {
    return styles.statusRolling;
  }

  if (status === "已完成") {
    return styles.statusDone;
  }

  return styles.statusRollback;
};

/**
 * 版本推送视图。
 */
export const FdeReleasePushView = ({
  items,
  members,
  selectedReleaseId,
  setSelectedReleaseId,
}: FdeReleasePushViewProps): JSX.Element => {
  const selectedRelease = useMemo(
    () => items.find(item => item.id === selectedReleaseId) ?? items[0] ?? null,
    [items, selectedReleaseId],
  );

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
            <div className={styles.releaseMeta}>{item.targetCustomers.join(" / ")}</div>
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
                <span className={styles.metricLabel}>采纳率</span>
                <strong className={styles.metricValue}>{selectedRelease.adoptionRate}%</strong>
              </div>
            </div>

            <article className={styles.card}>
              <div className={styles.sectionTitle}>推送节奏</div>
              <div className={styles.releaseMetaRow}>更新时间：{selectedRelease.pushedAt}</div>
              <Progress percent={selectedRelease.adoptionRate} strokeColor="var(--fdeAccent)" />
            </article>

            <article className={styles.card}>
              <div className={styles.sectionTitle}>发布说明</div>
              <div className={styles.noteList}>
                {selectedRelease.releaseNotes.map(item => (
                  <div key={item} className={styles.noteItem}>
                    <span className={styles.noteDot} />
                    <span>{item}</span>
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
