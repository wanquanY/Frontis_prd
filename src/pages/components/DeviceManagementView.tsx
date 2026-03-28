import { useCallback, useMemo } from "react";

import { Button, Tag, message } from "antd";
import { ToolOutlined, WarningOutlined } from "@ant-design/icons";

import adminStyles from "./FrontisAdminViews.module.less";
import styles from "./FrontisWebViews.module.less";
import {
  buildDevicePresentations,
  getDeviceDisplayName,
  renderDeviceWorkspaceIcon,
} from "./FrontisWebViews";
import type { DeviceManagementViewProps } from "./FrontisWebViews";

const DEVICE_TYPE_LABEL: Record<string, string> = {
  cloud: "☁️ 云端",
  local: "🖥️ 本地",
  edge: "🖥️ 边缘",
};

const isDeviceOnline = (status: string): boolean =>
  ["online", "busy", "idle"].includes(status);

export const DeviceManagementView = ({
  employees,
  workspaces,
}: DeviceManagementViewProps): JSX.Element => {
  const devices = useMemo(
    () => buildDevicePresentations(workspaces, employees),
    [employees, workspaces],
  );

  const onlineDeviceCount = useMemo(
    () => devices.filter(item => isDeviceOnline(item.workspace.status)).length,
    [devices],
  );

  const offlineDeviceCount = devices.length - onlineDeviceCount;

  const cloudCount = useMemo(
    () => workspaces.filter(w => w.type === "cloud").length,
    [workspaces],
  );
  const localCount = workspaces.length - cloudCount;

  const onlineAgentCount = useMemo(
    () =>
      employees.filter(e => {
        const ws = workspaces.find(w => w.id === e.workspaceId);
        return ws && isDeviceOnline(ws.status);
      }).length,
    [employees, workspaces],
  );

  const offlineAgentCount = employees.length - onlineAgentCount;

  const handleRepair = useCallback(() => {
    message.success("报修请求已提交，FDE 工程师将在 2 小时内联系您处理");
  }, []);

  return (
    <div className={styles.view}>
      {/* Header — same style as AgentStoreView */}
      <div className={adminStyles.devicePageHeader}>
        <h1 className={adminStyles.devicePageTitle}>设备管理</h1>
        <p className={adminStyles.devicePageSubtitle}>
          查看并管理你购买的所有设备，实时掌握运行状态
        </p>

        {/* 3 stats inline */}
        <div className={adminStyles.deviceStatsRow}>
          <div className={adminStyles.deviceStatCard}>
            <strong className={adminStyles.deviceStatValue}>{devices.length}</strong>
            <span className={adminStyles.deviceStatLabel}>设备总数</span>
            <span className={adminStyles.deviceStatHint}>
              云端 {cloudCount} 台 · 本地 {localCount} 台
            </span>
          </div>
          <div className={adminStyles.deviceStatCard}>
            <strong className={adminStyles.deviceStatValue}>{onlineDeviceCount}</strong>
            <span className={adminStyles.deviceStatLabel}>运行中</span>
            <span className={adminStyles.deviceStatHint}>
              共部署了 {onlineAgentCount} 个 AI 专家
            </span>
          </div>
          <div className={adminStyles.deviceStatCard}>
            <strong className={adminStyles.deviceStatValue}>{offlineDeviceCount}</strong>
            <span className={adminStyles.deviceStatLabel}>离线中</span>
            <span className={adminStyles.deviceStatHint}>
              共部署了 {offlineAgentCount} 个 AI 专家
            </span>
          </div>
        </div>
      </div>

      {/* Device cards */}
      <div className={styles.deviceGrid}>
        {devices.map(item => {
          const online = isDeviceOnline(item.workspace.status);
          const agentsOnDevice = employees.filter(
            employee => employee.workspaceId === item.workspace.id,
          );

          return (
            <article key={item.workspace.id} className={styles.deviceCard}>
              <div className={styles.deviceHero}>
                <div className={styles.deviceIdentity}>
                  <div className={styles.deviceIconWrap}>{renderDeviceWorkspaceIcon()}</div>
                  <div className={styles.deviceIdentityBody}>
                    <div className={styles.deviceTitle}>
                      {getDeviceDisplayName(item.workspace.name)}
                      {!online && (
                        <WarningOutlined style={{ color: "#e5484d", marginLeft: 6, fontSize: 14 }} />
                      )}
                    </div>
                    <div className={styles.deviceCode} style={{ whiteSpace: "nowrap" }}>
                      {item.code}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Tag bordered={false} className={styles.lightTag}>
                    {DEVICE_TYPE_LABEL[item.workspace.type] ?? item.workspace.type}
                  </Tag>
                  <Tag bordered={false} color={online ? "success" : "error"}>
                    {online ? "🟢 运行中" : "🔴 离线中"}
                  </Tag>
                </div>
              </div>

              <div className={styles.deviceMetaStack}>
                <div className={styles.deviceMetaRow}>
                  <span className={styles.deviceMetaLabel}>设备 ID</span>
                  <span className={styles.deviceMetaText} style={{ whiteSpace: "nowrap" }}>
                    {item.code}
                  </span>
                </div>
                <div className={styles.deviceMetaRow}>
                  <span className={styles.deviceMetaLabel}>激活时间</span>
                  <span className={styles.deviceMetaText} style={{ whiteSpace: "nowrap" }}>
                    {item.activatedAt}
                  </span>
                </div>
              </div>

              <div className={styles.deviceAgentRow}>
                <div className={styles.deviceAgentLabel}>部署 AI 专家</div>
                {online ? (
                  <div className={styles.pillRow}>
                    {agentsOnDevice.map(agent => (
                      <span key={agent.id} className={styles.pill}>
                        {agent.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    设备离线，专家暂停服务
                  </span>
                )}
              </div>

              {!online && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Button
                    type="primary"
                    danger
                    icon={<ToolOutlined />}
                    onClick={handleRepair}
                  >
                    一键报修
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};
