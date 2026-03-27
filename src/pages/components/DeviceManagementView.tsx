import { useMemo } from "react";

import classNames from "classnames";
import { Tag } from "antd";

import { getStatusLabel } from "../utils";
import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./FrontisWebViews.module.less";
import {
  buildDevicePresentations,
  getDeviceDisplayName,
  getDeviceManagementHint,
  renderDeviceWorkspaceIcon,
} from "./FrontisWebViews";
import type { DeviceManagementViewProps } from "./FrontisWebViews";

/**
 * 设备管理视图。
 */
export const DeviceManagementView = ({
  employees,
  workspaces,
}: DeviceManagementViewProps): JSX.Element => {
  const devices = useMemo(
    () => buildDevicePresentations(workspaces, employees),
    [employees, workspaces],
  );
  const onlineDeviceCount = useMemo(
    () => devices.filter(item => item.workspace.status === "online").length,
    [devices],
  );

  return (
    <div className={styles.view}>
      <section className={styles.heroCard}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>设备管理</span>
          <h2 className={styles.heroTitle}>查看租户下工作站、在线状态和当前运行的 Agent</h2>
          <p className={styles.heroDescription}>
            延续现有工作站卡片风格，统一以设备名称作为主识别信息，并展示设备编号、激活时间和备注位置。
          </p>
        </div>
        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>工作站总数</span>
            <strong className={styles.summaryValue}>{devices.length}</strong>
            <span className={styles.summaryHint}>工作站卡片统一按名称识别与管理</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>在线工作站</span>
            <strong className={styles.summaryValue}>{onlineDeviceCount}</strong>
            <span className={styles.summaryHint}>离线设备需尽快排查连接状态</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>运行中 Agent</span>
            <strong className={styles.summaryValue}>{employees.length}</strong>
            <span className={styles.summaryHint}>支持在卡片内直接查看归属 Agent</span>
          </article>
        </div>
      </section>

      <div className={styles.deviceGrid}>
        {devices.map(item => {
          const runningAgents = employees.filter(
            employee => employee.workspaceId === item.workspace.id,
          );
          const visibleAgents = runningAgents.slice(0, 2);
          const hiddenAgentCount = runningAgents.length - visibleAgents.length;
          return (
            <article key={item.workspace.id} className={styles.deviceCard}>
              <div className={styles.deviceHero}>
                <div className={styles.deviceIdentity}>
                  <div className={styles.deviceIconWrap}>{renderDeviceWorkspaceIcon()}</div>
                  <div className={styles.deviceIdentityBody}>
                    <div className={styles.deviceTitle}>
                      {getDeviceDisplayName(item.workspace.name)}
                    </div>
                    <div className={styles.deviceCode}>{item.code}</div>
                  </div>
                </div>
                <Tag bordered={false} className={styles.lightTag}>
                  {getStatusLabel(item.workspace.status)}
                </Tag>
              </div>

              <div className={styles.deviceMetaStack}>
                <div className={styles.deviceMetaRow}>
                  <span className={styles.deviceMetaLabel}>位置备注</span>
                  <span className={styles.deviceMetaText}>{item.location}</span>
                </div>
                <div className={styles.deviceMetaRow}>
                  <span className={styles.deviceMetaLabel}>激活时间</span>
                  <span className={styles.deviceMetaText}>{item.activatedAt}</span>
                </div>
              </div>

              <div className={styles.deviceAgentRow}>
                <div className={styles.deviceAgentLabel}>运行中的 Agent</div>
                <div className={styles.pillRow}>
                  {visibleAgents.map(agent => (
                    <span key={agent.id} className={styles.pill}>
                      {agent.name}
                    </span>
                  ))}
                  {hiddenAgentCount > 0 ? (
                    <span className={styles.metaChip}>+{hiddenAgentCount}</span>
                  ) : null}
                </div>
              </div>

              <div className={classNames(styles.deviceHint, adminStyles.deviceHint)}>
                {getDeviceManagementHint(item.workspace)}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
