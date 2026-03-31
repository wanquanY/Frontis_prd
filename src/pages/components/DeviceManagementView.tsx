import { useCallback, useMemo, useState } from "react";

import {
  AppleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ToolOutlined,
  UserOutlined,
  WarningOutlined,
  WindowsOutlined,
} from "@ant-design/icons";
import { Button, Input, Modal, Popconfirm, Select, Tag, Tooltip, message } from "antd";

import type { FrontisWebUserItem } from "../types";

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

/** 本地设备配额上限 */
const LOCAL_DEVICE_QUOTA = 80;

const isDeviceOnline = (status: string): boolean =>
  ["online", "busy", "idle"].includes(status);

export const DeviceManagementView = ({
  employees,
  workspaces,
  users,
}: DeviceManagementViewProps & { users: FrontisWebUserItem[] }): JSX.Element => {
  const devices = useMemo(
    () => buildDevicePresentations(workspaces, employees),
    [employees, workspaces],
  );

  const [isLocalDeviceModalOpen, setIsLocalDeviceModalOpen] = useState(false);
  const [localDeviceName, setLocalDeviceName] = useState("");
  const [localDeviceLocation, setLocalDeviceLocation] = useState("");
  const [localDeviceOwner, setLocalDeviceOwner] = useState<string | null>(null);
  const [pendingDevices, setPendingDevices] = useState<Array<{
    id: string;
    name: string;
    location: string;
    ownerId: string | null;
    activationCode: string;
    isOnline: boolean;
  }>>([]);
  const [deviceOwners, setDeviceOwners] = useState<Record<string, string | null>>({});
  const [editingOwnerId, setEditingOwnerId] = useState<{ deviceId: string; ownerId: string | null } | null>(null);

  /** 已上线/下线状态覆盖（key: workspace id / pending id） */
  const [deviceStatusOverrides, setDeviceStatusOverrides] = useState<Record<string, boolean>>({});
  /** 已移除的设备 ID 集合 */
  const [removedDeviceIds, setRemovedDeviceIds] = useState<Set<string>>(new Set());

  const activeUsers = useMemo(
    () => users.filter(u => u.status === "active"),
    [users],
  );

  const userOptions = useMemo(
    () => activeUsers.map(u => ({ label: u.name, value: u.id })),
    [activeUsers],
  );

  const getOwnerName = useCallback(
    (ownerId: string | null): string | null => {
      if (!ownerId) return null;
      return activeUsers.find(u => u.id === ownerId)?.name ?? null;
    },
    [activeUsers],
  );

  /** 判断某个已有设备当前是否在线（考虑覆盖状态） */
  const resolveOnlineStatus = useCallback(
    (workspaceId: string, originalStatus: string): boolean => {
      if (workspaceId in deviceStatusOverrides) return deviceStatusOverrides[workspaceId];
      return isDeviceOnline(originalStatus);
    },
    [deviceStatusOverrides],
  );

  /** 过滤掉已移除的已有设备 */
  const visibleDevices = useMemo(
    () => devices.filter(item => !removedDeviceIds.has(item.workspace.id)),
    [devices, removedDeviceIds],
  );

  const onlineDeviceCount = useMemo(
    () => visibleDevices.filter(item => resolveOnlineStatus(item.workspace.id, item.workspace.status)).length,
    [visibleDevices, resolveOnlineStatus],
  );

  const offlineDeviceCount = visibleDevices.length - onlineDeviceCount;

  const onlineAgentCount = useMemo(
    () =>
      employees.filter(e => {
        const ws = workspaces.find(w => w.id === e.workspaceId);
        return ws && !removedDeviceIds.has(ws.id) && resolveOnlineStatus(ws.id, ws.status);
      }).length,
    [employees, workspaces, removedDeviceIds, resolveOnlineStatus],
  );

  const offlineAgentCount = useMemo(
    () =>
      employees.filter(e => {
        const ws = workspaces.find(w => w.id === e.workspaceId);
        return ws && !removedDeviceIds.has(ws.id);
      }).length - onlineAgentCount,
    [employees, workspaces, removedDeviceIds, onlineAgentCount],
  );

  /** 判断设备上是否部署了 AI 专家 */
  const hasDeployedAgents = useCallback(
    (workspaceId: string): boolean =>
      employees.some(e => e.workspaceId === workspaceId),
    [employees],
  );

  /** 本地设备已用数量（不含已移除的） */
  const currentLocalCount = useMemo(() => {
    const existingLocal = workspaces.filter(w => w.type !== "cloud" && !removedDeviceIds.has(w.id)).length;
    return existingLocal + pendingDevices.length;
  }, [workspaces, removedDeviceIds, pendingDevices]);

  const remainingQuota = LOCAL_DEVICE_QUOTA - currentLocalCount;

  const handleRepair = useCallback(() => {
    message.success("报修请求已提交，FDE 工程师将在 2 小时内联系您处理");
  }, []);

  /** 上线/下线切换 */
  const handleToggleDeviceStatus = useCallback((deviceId: string, currentlyOnline: boolean) => {
    setDeviceStatusOverrides(prev => ({ ...prev, [deviceId]: !currentlyOnline }));
    message.success(currentlyOnline ? "设备已下线" : "设备已上线");
  }, []);

  /** 移除设备 */
  const handleRemoveDevice = useCallback((deviceId: string, isPending: boolean) => {
    if (isPending) {
      setPendingDevices(prev => prev.filter(d => d.id !== deviceId));
    } else {
      setRemovedDeviceIds(prev => new Set([...prev, deviceId]));
    }
    message.success("设备已移除");
  }, []);

  const handleAddLocalDevice = useCallback(() => {
    if (remainingQuota <= 0) {
      message.error("本地设备配额已用完，请先下线并移除不再使用的设备");
      return;
    }
    if (!localDeviceName.trim()) {
      message.warning("请输入设备名称");
      return;
    }
    const activationCode = `SC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    setPendingDevices(prev => [
      ...prev,
      {
        id: `pending-${Date.now()}`,
        name: localDeviceName.trim(),
        location: localDeviceLocation.trim() || "未填写",
        ownerId: localDeviceOwner,
        activationCode,
        isOnline: false,
      },
    ]);
    message.success("设备已创建，请将激活码提供给员工");
    setIsLocalDeviceModalOpen(false);
    setLocalDeviceName("");
    setLocalDeviceLocation("");
    setLocalDeviceOwner(null);
  }, [localDeviceName, localDeviceLocation, localDeviceOwner, remainingQuota]);

  const handleAssignOwner = useCallback((deviceId: string, ownerId: string | null) => {
    setDeviceOwners(prev => ({ ...prev, [deviceId]: ownerId }));
    setEditingOwnerId(null);
    if (ownerId) {
      message.success("已分配所属员工");
    } else {
      message.success("已取消分配");
    }
  }, []);

  return (
    <div className={styles.view}>
      <div className={adminStyles.devicePageHeader}>
        <h1 className={adminStyles.devicePageTitle}>设备管理</h1>
        <p className={adminStyles.devicePageSubtitle}>
          查看并管理你购买的所有设备，实时掌握运行状态
        </p>

        <div className={adminStyles.deviceStatsRow}>
          <div className={adminStyles.deviceStatCard}>
            <strong className={adminStyles.deviceStatValue}>{visibleDevices.length + pendingDevices.length}</strong>
            <span className={adminStyles.deviceStatLabel}>设备总数</span>
            <span className={adminStyles.deviceStatHint}>
              云端 {visibleDevices.filter(d => d.workspace.type === "cloud").length} 台 · 本地 {visibleDevices.filter(d => d.workspace.type !== "cloud").length + pendingDevices.length} 台
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

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>SynClaw 客户端下载</div>
            <div className={styles.sectionDescription}>
              员工下载并安装 SynClaw 客户端后，使用管理员分配的激活码即可将个人电脑接入企业设备管理
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button icon={<AppleOutlined />} size="large">
            macOS (Apple 芯片)
          </Button>
          <Button icon={<AppleOutlined />} size="large">
            macOS (Intel 芯片)
          </Button>
          <Button icon={<WindowsOutlined />} size="large">
            Windows
          </Button>
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 8px" }}>
        <div className={styles.sectionTitle} style={{ fontSize: 16, fontWeight: 600 }}>设备列表</div>
        <Tooltip title={remainingQuota <= 0 ? "本地设备配额已用完，请先下线并移除不再使用的设备" : undefined}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={remainingQuota <= 0}
            onClick={() => setIsLocalDeviceModalOpen(true)}
          >
            添加本地设备（剩余 {remainingQuota}）
          </Button>
        </Tooltip>
      </div>

      <div className={styles.deviceGrid}>
        {visibleDevices.map(item => {
          const online = resolveOnlineStatus(item.workspace.id, item.workspace.status);
          const agentsOnDevice = employees.filter(
            employee => employee.workspaceId === item.workspace.id,
          );
          const ownerId = deviceOwners[item.workspace.id] ?? null;
          const ownerName = getOwnerName(ownerId);
          const isEditingThisOwner = editingOwnerId?.deviceId === item.workspace.id;
          const deviceHasAgents = hasDeployedAgents(item.workspace.id);

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
                <div className={styles.deviceMetaRow}>
                  <span className={styles.deviceMetaLabel}>所属员工</span>
                  <span className={styles.deviceMetaText}>
                    {isEditingThisOwner ? (
                      <Select
                        allowClear
                        size="small"
                        style={{ width: 140 }}
                        placeholder="选择员工"
                        options={userOptions}
                        value={editingOwnerId.ownerId}
                        onChange={val => handleAssignOwner(item.workspace.id, val ?? null)}
                        onBlur={() => setEditingOwnerId(null)}
                        autoFocus
                      />
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <UserOutlined
                          style={{
                            color: ownerName ? "var(--primary-color, #1677ff)" : "#bbb",
                            fontSize: 13,
                          }}
                        />
                        <span
                          style={{
                            color: ownerName ? "inherit" : "var(--text-secondary)",
                            fontSize: 13,
                          }}
                        >
                          {ownerName ?? "未分配"}
                        </span>
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          style={{ fontSize: 12, padding: "0 4px" }}
                          onClick={() =>
                            setEditingOwnerId({ deviceId: item.workspace.id, ownerId })
                          }
                        >
                          {ownerName ? "更改" : "分配"}
                        </Button>
                      </span>
                    )}
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

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Button
                  icon={<PoweroffOutlined />}
                  onClick={() => handleToggleDeviceStatus(item.workspace.id, online)}
                >
                  {online ? "下线" : "上线"}
                </Button>
                {!online && (
                  deviceHasAgents ? (
                    <Tooltip title="该设备上部署了 AI 专家，不允许移除">
                      <Button danger disabled icon={<DeleteOutlined />}>
                        移除
                      </Button>
                    </Tooltip>
                  ) : (
                    <Popconfirm
                      title="确认移除此设备？"
                      description="移除后将释放本地设备配额"
                      onConfirm={() => handleRemoveDevice(item.workspace.id, false)}
                      okText="确认"
                      cancelText="取消"
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        移除
                      </Button>
                    </Popconfirm>
                  )
                )}
                {!online && (
                  <Button
                    type="primary"
                    danger
                    icon={<ToolOutlined />}
                    onClick={handleRepair}
                  >
                    一键报修
                  </Button>
                )}
              </div>
            </article>
          );
        })}

        {pendingDevices.map(item => {
          const ownerName = getOwnerName(item.ownerId);
          const isEditingThisOwner = editingOwnerId?.deviceId === item.id;

          return (
            <article key={item.id} className={styles.deviceCard}>
              <div className={styles.deviceHero}>
                <div className={styles.deviceIdentity}>
                  <div className={styles.deviceIconWrap}>{renderDeviceWorkspaceIcon()}</div>
                  <div className={styles.deviceIdentityBody}>
                    <div className={styles.deviceTitle}>{item.name}</div>
                    <div className={styles.deviceCode}>{item.activationCode}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Tag bordered={false} className={styles.lightTag}>🖥️ 本地</Tag>
                  <Tag bordered={false} color="warning">⏳ 待激活</Tag>
                </div>
              </div>

              <div className={styles.deviceMetaStack}>
                <div className={styles.deviceMetaRow}>
                  <span className={styles.deviceMetaLabel}>部署位置</span>
                  <span className={styles.deviceMetaText}>{item.location}</span>
                </div>
                <div className={styles.deviceMetaRow}>
                  <span className={styles.deviceMetaLabel}>所属员工</span>
                  <span className={styles.deviceMetaText}>
                    {isEditingThisOwner ? (
                      <Select
                        allowClear
                        size="small"
                        style={{ width: 140 }}
                        placeholder="选择员工"
                        options={userOptions}
                        value={editingOwnerId.ownerId}
                        onChange={val => {
                          setPendingDevices(prev =>
                            prev.map(d => d.id === item.id ? { ...d, ownerId: val ?? null } : d),
                          );
                          setEditingOwnerId(null);
                          message.success(val ? "已分配所属员工" : "已取消分配");
                        }}
                        onBlur={() => setEditingOwnerId(null)}
                        autoFocus
                      />
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <UserOutlined
                          style={{
                            color: ownerName ? "var(--primary-color, #1677ff)" : "#bbb",
                            fontSize: 13,
                          }}
                        />
                        <span
                          style={{
                            color: ownerName ? "inherit" : "var(--text-secondary)",
                            fontSize: 13,
                          }}
                        >
                          {ownerName ?? "未分配"}
                        </span>
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          style={{ fontSize: 12, padding: "0 4px" }}
                          onClick={() =>
                            setEditingOwnerId({ deviceId: item.id, ownerId: item.ownerId })
                          }
                        >
                          {ownerName ? "更改" : "分配"}
                        </Button>
                      </span>
                    )}
                  </span>
                </div>
                <div className={styles.deviceMetaRow}>
                  <span className={styles.deviceMetaLabel}>激活码</span>
                  <span className={styles.deviceMetaText} style={{ fontFamily: "monospace", fontWeight: 600 }}>
                    {item.activationCode}
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        void navigator.clipboard.writeText(item.activationCode);
                        message.success("激活码已复制");
                      }}
                    >
                      复制
                    </Button>
                  </span>
                </div>
              </div>

              <div className={styles.deviceAgentRow}>
                <div className={styles.deviceAgentLabel}>部署 AI 专家</div>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  设备待激活，请员工在 SynClaw 客户端输入激活码
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Popconfirm
                  title="确认移除此设备？"
                  description="移除后将释放本地设备配额"
                  onConfirm={() => handleRemoveDevice(item.id, true)}
                  okText="确认"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    移除
                  </Button>
                </Popconfirm>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        title="添加本地设备"
        open={isLocalDeviceModalOpen}
        onCancel={() => setIsLocalDeviceModalOpen(false)}
        onOk={handleAddLocalDevice}
        okText="确认"
        cancelText="取消"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "12px 0" }}>
          <div>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>设备名称</div>
            <Input
              placeholder="如：hw-sz-001"
              value={localDeviceName}
              onChange={e => setLocalDeviceName(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>部署位置</div>
            <Input
              placeholder="如：深圳数据中心"
              value={localDeviceLocation}
              onChange={e => setLocalDeviceLocation(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, fontWeight: 600 }}>所属员工</div>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder="选择所属员工（可选）"
              options={userOptions}
              value={localDeviceOwner}
              onChange={val => setLocalDeviceOwner(val ?? null)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
