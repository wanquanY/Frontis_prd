import { useCallback, useMemo, useState } from "react";

import { ArrowLeftOutlined, DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Popconfirm, Select, message } from "antd";

import type { FrontisWebUserItem, WorkspaceItem } from "../types";
import { downloadPrototypeFile } from "../utils";
import {
  doesExpertRequireDeviceBinding,
  getAssignedWorkspaceIdsForExpert,
  getDeviceAccessStateForExpert,
  getEffectiveMembersForDeviceAccess,
} from "./agentStore/utils";
import type { ExpertDeploymentState } from "./agentStore/types";

import adminStyles from "./FrontisAdminViews.module.less";
import {
  buildDevicePresentations,
  getDeviceDisplayName,
} from "./FrontisWebViews";
import type { DeviceManagementViewProps } from "./FrontisWebViews";

const COMPANY_MANAGED_DEVICE_TYPES = new Set(["cloud", "edge"]);
type DeviceKind = "cloud-workstation" | "local-workstation" | "local-client";
type DeviceFilterKey =
  | "all"
  | "cloud-workstation"
  | "local-workstation"
  | "local-client"
  | "pending";

const DEVICE_KIND_LABEL: Record<DeviceKind, string> = {
  "cloud-workstation": "云端工作站",
  "local-client": "本地客户端",
  "local-workstation": "本地工作站",
};

const DEVICE_KIND_QUOTA: Record<DeviceKind, number> = {
  "cloud-workstation": 12,
  "local-client": 80,
  "local-workstation": 20,
};

interface ClientDownloadItem {
  fileName: string;
  key: string;
  label: string;
  packageName: string;
}

const CLIENT_DOWNLOAD_OPTIONS: ClientDownloadItem[] = [
  {
    fileName: "FrontisAI-macos-apple-silicon-installer.txt",
    key: "macos-apple-silicon",
    label: "下载 macOS（Apple 芯片）",
    packageName: "FrontisAI-macOS-AppleSilicon.dmg",
  },
  {
    fileName: "FrontisAI-macos-intel-installer.txt",
    key: "macos-intel",
    label: "下载 macOS（Intel 芯片）",
    packageName: "FrontisAI-macOS-Intel.dmg",
  },
  {
    fileName: "FrontisAI-windows-installer.txt",
    key: "windows",
    label: "下载 Windows",
    packageName: "FrontisAI-Windows-x64.exe",
  },
];

interface PendingDeviceItem {
  activationCode: string;
  deviceKind: DeviceKind;
  id: string;
  location: string;
  name: string;
  ownerId: string | null;
}

const INITIAL_PENDING_DEVICES: PendingDeviceItem[] = [
  {
    activationCode: "SC-DEMO-LOCAL-01",
    deviceKind: "local-client",
    id: "pending-local-client-01",
    location: "成都门店 · 收银台",
    name: "成都门店收银客户端",
    ownerId: "user-member-001",
  },
];

type ExistingDeviceItem = ReturnType<typeof buildDevicePresentations>[number];

interface ExistingDeviceRecord {
  id: string;
  kind: "existing";
  item: ExistingDeviceItem;
}

interface PendingDeviceRecord {
  id: string;
  kind: "pending";
  item: PendingDeviceItem;
}

type DeviceRecord = ExistingDeviceRecord | PendingDeviceRecord;
type ExistingDeviceStatusLabel = "待配置" | "待激活" | "在线" | "异常" | "离线";

interface ExistingDeviceStatus {
  label: ExistingDeviceStatusLabel;
  tone: "success" | "warning" | "danger";
}

const isDeviceOnline = (status: string): boolean => ["online", "running"].includes(status);

const resolveDeviceKind = (workspaceType: string): DeviceKind => {
  if (workspaceType === "cloud") {
    return "cloud-workstation";
  }

  if (workspaceType === "edge") {
    return "local-workstation";
  }

  return "local-client";
};

const getStatusClassName = (tone: "success" | "warning" | "danger"): string => {
  if (tone === "success") {
    return `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagSuccess}`;
  }

  if (tone === "warning") {
    return `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagWarning}`;
  }

  return `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagDanger}`;
};

const getPendingDeviceStatus = (): { label: string; tone: "warning" } => ({
  label: "待激活",
  tone: "warning",
});

export const DeviceManagementView = ({
  deploymentByEmployeeId,
  deviceOwners,
  employees,
  onAddWorkspace,
  onAssignDeviceOwner,
  onRemoveWorkspace,
  workspaces,
  users,
}: DeviceManagementViewProps): JSX.Element => {
  const devices = useMemo(
    () => buildDevicePresentations(workspaces, employees),
    [employees, workspaces],
  );
  const activeUsers = useMemo(
    () => users.filter(user => user.status === "active"),
    [users],
  );
  const userOptions = useMemo(
    () => activeUsers.map(user => ({ label: user.name, value: user.id })),
    [activeUsers],
  );

  const [activeFilter, setActiveFilter] = useState<DeviceFilterKey>("all");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isLocalDeviceModalOpen, setIsLocalDeviceModalOpen] = useState<boolean>(false);
  const [deviceStatusOverrides, setDeviceStatusOverrides] = useState<Record<string, boolean>>({});
  const [draftDeviceName, setDraftDeviceName] = useState<string>("");
  const [draftDeviceLocation, setDraftDeviceLocation] = useState<string>("");
  const [draftDeviceOwner, setDraftDeviceOwner] = useState<string | null>(null);
  const [draftDeviceKind, setDraftDeviceKind] = useState<DeviceKind | null>(null);
  const [deviceLocationOverrides, setDeviceLocationOverrides] = useState<Record<string, string>>({});
  const [deviceNameOverrides, setDeviceNameOverrides] = useState<Record<string, string>>({});
  const [pendingDevices, setPendingDevices] = useState<PendingDeviceItem[]>(INITIAL_PENDING_DEVICES);

  const getOwnerName = useCallback(
    (ownerId: string | null): string | null => {
      if (!ownerId) {
        return null;
      }
      return activeUsers.find(user => user.id === ownerId)?.name ?? null;
    },
    [activeUsers],
  );

  const resolveOnlineStatus = useCallback(
    (workspaceId: string, originalStatus: string): boolean => {
      if (workspaceId in deviceStatusOverrides) {
        return deviceStatusOverrides[workspaceId];
      }
      return isDeviceOnline(originalStatus);
    },
    [deviceStatusOverrides],
  );

  const resolveExistingDeviceStatus = useCallback(
    (
      workspaceId: string,
      workspaceStatus: WorkspaceItem["status"],
      ownerId: string | null,
    ): ExistingDeviceStatus => {
      if (!ownerId) {
        return {
          label: "待配置",
          tone: "warning",
        };
      }

      if (workspaceId in deviceStatusOverrides) {
        return deviceStatusOverrides[workspaceId]
          ? {
              label: "在线",
              tone: "success",
            }
          : {
              label: "离线",
              tone: "danger",
            };
      }

      if (workspaceStatus === "pending") {
        return {
          label: "待激活",
          tone: "warning",
        };
      }

      if (workspaceStatus === "error") {
        return {
          label: "异常",
          tone: "danger",
        };
      }

      if (workspaceStatus === "offline" || workspaceStatus === "draft" || workspaceStatus === "paused") {
        return {
          label: "离线",
          tone: "danger",
        };
      }

      return {
        label: "在线",
        tone: "success",
      };
    },
    [deviceStatusOverrides],
  );

  const getExistingDeviceName = useCallback(
    (deviceId: string, fallbackName: string): string => {
      if (deviceId in deviceNameOverrides) {
        return deviceNameOverrides[deviceId] ?? "";
      }

      return getDeviceDisplayName(fallbackName);
    },
    [deviceNameOverrides],
  );

  const getExistingDeviceLocation = useCallback(
    (deviceId: string, fallbackLocation: string): string => {
      if (deviceId in deviceLocationOverrides) {
        return deviceLocationOverrides[deviceId] ?? "";
      }

      return fallbackLocation;
    },
    [deviceLocationOverrides],
  );

  const visibleDevices = useMemo(() => devices, [devices]);

  const companyManagedDevices = useMemo(
    () =>
      visibleDevices.filter(device => COMPANY_MANAGED_DEVICE_TYPES.has(device.workspace.type)),
    [visibleDevices],
  );
  const nonCompanyManagedDevices = useMemo(
    () =>
      visibleDevices.filter(device => !COMPANY_MANAGED_DEVICE_TYPES.has(device.workspace.type)),
    [visibleDevices],
  );

  const deviceCountByKind = useMemo(() => {
    const initialCounts: Record<DeviceKind, number> = {
      "cloud-workstation": 0,
      "local-client": 0,
      "local-workstation": 0,
    };

    visibleDevices.forEach(device => {
      const deviceKind = resolveDeviceKind(device.workspace.type);
      initialCounts[deviceKind] += 1;
    });

    pendingDevices.forEach(device => {
      initialCounts[device.deviceKind] += 1;
    });

    return initialCounts;
  }, [pendingDevices, visibleDevices]);

  const onlineDeviceCount = useMemo(
    () =>
      visibleDevices.filter(device => {
        const ownerId = deviceOwners[device.workspace.id] ?? null;
        return (
          resolveExistingDeviceStatus(
            device.workspace.id,
            device.workspace.status,
            ownerId,
          ).label === "在线"
        );
      }).length,
    [deviceOwners, resolveExistingDeviceStatus, visibleDevices],
  );

  const abnormalDeviceCount = useMemo(
    () => visibleDevices.length + pendingDevices.length - onlineDeviceCount,
    [onlineDeviceCount, pendingDevices.length, visibleDevices.length],
  );

  const activeExpertCount = useMemo(
    () => employees.filter(employee => ["running", "online"].includes(employee.status)).length,
    [employees],
  );

  const allRecords = useMemo<DeviceRecord[]>(
    () => [
      ...companyManagedDevices.map<DeviceRecord>(item => ({
        id: item.workspace.id,
        item,
        kind: "existing",
      })),
      ...nonCompanyManagedDevices.map<DeviceRecord>(item => ({
        id: item.workspace.id,
        item,
        kind: "existing",
      })),
      ...pendingDevices.map<DeviceRecord>(item => ({
        id: item.id,
        item,
        kind: "pending",
      })),
    ],
    [companyManagedDevices, nonCompanyManagedDevices, pendingDevices],
  );

  const filteredRecords = useMemo(() => {
    switch (activeFilter) {
      case "cloud-workstation":
      case "local-workstation":
      case "local-client":
        return allRecords.filter(record =>
          record.kind === "pending"
            ? record.item.deviceKind === activeFilter
            : resolveDeviceKind(record.item.workspace.type) === activeFilter,
        );
      case "pending":
        return allRecords.filter(record => record.kind === "pending");
      case "all":
      default:
        return allRecords;
    }
  }, [activeFilter, allRecords]);

  const selectedRecord = useMemo(
    () => allRecords.find(record => record.id === selectedDeviceId) ?? null,
    [allRecords, selectedDeviceId],
  );
  const selectedRecordHeader = useMemo(() => {
    if (!selectedRecord) {
      return null;
    }

    if (selectedRecord.kind === "pending") {
      return {
        statusLabel: "待激活",
        statusTone: "warning" as const,
        subtitle: selectedRecord.item.activationCode,
        title: selectedRecord.item.name,
        typeLabel: DEVICE_KIND_LABEL[selectedRecord.item.deviceKind],
      };
    }

    const ownerId = deviceOwners[selectedRecord.item.workspace.id] ?? null;
    const status = resolveExistingDeviceStatus(
      selectedRecord.item.workspace.id,
      selectedRecord.item.workspace.status,
      ownerId,
    );

    return {
      statusLabel: status.label,
      statusTone: status.tone,
      subtitle: selectedRecord.item.code,
      title: getExistingDeviceName(selectedRecord.item.workspace.id, selectedRecord.item.workspace.name),
      typeLabel: DEVICE_KIND_LABEL[resolveDeviceKind(selectedRecord.item.workspace.type)],
    };
  }, [deviceOwners, getExistingDeviceName, resolveExistingDeviceStatus, selectedRecord]);

  const summaryItems = useMemo(
    () => [
      {
        hint: `已用 ${deviceCountByKind["cloud-workstation"]} 台 / 总额 ${DEVICE_KIND_QUOTA["cloud-workstation"]} 台`,
        label: "云端工作站额度",
        value: `${deviceCountByKind["cloud-workstation"]}/${DEVICE_KIND_QUOTA["cloud-workstation"]}`,
      },
      {
        hint: `已用 ${deviceCountByKind["local-workstation"]} 台 / 总额 ${DEVICE_KIND_QUOTA["local-workstation"]} 台`,
        label: "本地工作站额度",
        value: `${deviceCountByKind["local-workstation"]}/${DEVICE_KIND_QUOTA["local-workstation"]}`,
      },
      {
        hint: `已用 ${deviceCountByKind["local-client"]} 台 / 总额 ${DEVICE_KIND_QUOTA["local-client"]} 台`,
        label: "本地客户端额度",
        value: `${deviceCountByKind["local-client"]}/${DEVICE_KIND_QUOTA["local-client"]}`,
      },
      {
        hint: `当前支撑 ${activeExpertCount} 个活跃 AI 专家`,
        label: "待处理设备",
        value: `${abnormalDeviceCount} 台`,
      },
    ],
    [
      abnormalDeviceCount,
      activeExpertCount,
      deviceCountByKind,
    ],
  );

  const handleRepair = useCallback((): void => {
    message.success("报修请求已提交，FDE 工程师将在 2 小时内联系您处理");
  }, []);

  const handleToggleDeviceStatus = useCallback((deviceId: string, currentlyOnline: boolean): void => {
    setDeviceStatusOverrides(prev => ({ ...prev, [deviceId]: !currentlyOnline }));
    message.success(currentlyOnline ? "设备已下线" : "设备已上线");
  }, []);

  const handleRemoveDevice = useCallback((deviceId: string, isPending: boolean): void => {
    if (isPending) {
      setPendingDevices(prev => prev.filter(device => device.id !== deviceId));
    } else {
      onRemoveWorkspace(deviceId);
    }
    message.success("设备已移除");
  }, [onRemoveWorkspace]);

  const handleAddLocalDevice = useCallback((): void => {
    if (!draftDeviceKind) {
      message.warning("请选择设备类型");
      return;
    }
    const remainingQuota = DEVICE_KIND_QUOTA[draftDeviceKind] - deviceCountByKind[draftDeviceKind];
    if (remainingQuota <= 0) {
      message.error(`${DEVICE_KIND_LABEL[draftDeviceKind]}额度已用完，请先移除不再使用的设备`);
      return;
    }
    if (!draftDeviceName.trim()) {
      message.warning("请输入设备名称");
      return;
    }

    if (draftDeviceKind === "cloud-workstation") {
      const nextWorkspaceId = `workspace-cloud-${Date.now()}`;
      const nextWorkspace: WorkspaceItem = {
        id: nextWorkspaceId,
        name: draftDeviceName.trim(),
        type: "cloud",
        status: "online",
        region: draftDeviceLocation.trim() || "云端资源池",
        summary: "新增的云端工作站，可直接分配 Agent 并接入任务。",
        runtimeHint: "支持桌面预览、成果文件和扫码辅助。",
      };

      onAddWorkspace(nextWorkspace, draftDeviceOwner);
      setSelectedDeviceId(nextWorkspaceId);
      setActiveFilter("cloud-workstation");
      setIsLocalDeviceModalOpen(false);
      setDraftDeviceName("");
      setDraftDeviceLocation("");
      setDraftDeviceOwner(null);
      setDraftDeviceKind(null);
      message.success("已添加云端设备，当前状态为待配置，请先分配所属人");
      return;
    }

    const activationCode = `SC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const nextDeviceId = `pending-${Date.now()}`;

    setPendingDevices(prev => [
      ...prev,
      {
        activationCode,
        deviceKind: draftDeviceKind,
        id: nextDeviceId,
        location: draftDeviceLocation.trim() || "未填写",
        name: draftDeviceName.trim(),
        ownerId: draftDeviceOwner,
      },
    ]);
    setSelectedDeviceId(nextDeviceId);
    setActiveFilter("pending");
    setIsLocalDeviceModalOpen(false);
    setDraftDeviceName("");
    setDraftDeviceLocation("");
    setDraftDeviceOwner(null);
    setDraftDeviceKind(null);
    message.success("已创建设备并生成激活码");
  }, [
    deviceCountByKind,
    draftDeviceKind,
    draftDeviceLocation,
    draftDeviceName,
    draftDeviceOwner,
    onAddWorkspace,
  ]);

  const handleAssignOwner = useCallback(
    (deviceId: string, ownerId: string | null): void => {
      if (pendingDevices.some(device => device.id === deviceId)) {
        setPendingDevices(prev =>
          prev.map(device =>
            device.id === deviceId
              ? {
                  ...device,
                  ownerId,
                }
              : device,
          ),
        );
      } else {
        onAssignDeviceOwner(deviceId, ownerId);
      }
      message.success(ownerId ? "已更新设备归属" : "已清空设备归属");
    },
    [onAssignDeviceOwner, pendingDevices],
  );

  const handleRenameExistingDevice = useCallback((deviceId: string, value: string): void => {
    setDeviceNameOverrides(prev => ({
      ...prev,
      [deviceId]: value,
    }));
  }, []);

  const handleUpdateExistingDeviceLocation = useCallback((deviceId: string, value: string): void => {
    setDeviceLocationOverrides(prev => ({
      ...prev,
      [deviceId]: value,
    }));
  }, []);

  const handleUpdatePendingDevice = useCallback(
    (deviceId: string, updates: Partial<Pick<PendingDeviceItem, "location" | "name">>): void => {
      setPendingDevices(prev =>
        prev.map(device =>
          device.id === deviceId
            ? {
                ...device,
                ...updates,
              }
            : device,
        ),
      );
    },
    [],
  );

  const handleDownloadClient = useCallback((downloadItem: ClientDownloadItem): void => {
    downloadPrototypeFile({
      content: [
        "Frontis AI 客户端安装包下载占位文件",
        "",
        `下载入口：${downloadItem.label}`,
        `正式安装包名称：${downloadItem.packageName}`,
        "适用场景：企业管理后台 -> 设备管理 -> 本地客户端安装",
        "",
        "说明：",
        "1. 当前原型提供一键下载入口，便于演示不同系统安装包分发。",
        "2. 正式环境可将该下载逻辑替换为 CDN / OSS 的真实安装包地址。",
        "3. Mac 客户端已区分 Apple 芯片与 Intel 芯片。",
      ].join("\n"),
      fileName: downloadItem.fileName,
    });
    message.success(`${downloadItem.label}已开始下载`);
  }, []);

  const filterOptions = useMemo(
    () => [
      { key: "all" as const, label: `全部 (${allRecords.length})` },
      {
        key: "cloud-workstation" as const,
        label: `${DEVICE_KIND_LABEL["cloud-workstation"]} (${deviceCountByKind["cloud-workstation"]})`,
      },
      {
        key: "local-workstation" as const,
        label: `${DEVICE_KIND_LABEL["local-workstation"]} (${deviceCountByKind["local-workstation"]})`,
      },
      {
        key: "local-client" as const,
        label: `${DEVICE_KIND_LABEL["local-client"]} (${deviceCountByKind["local-client"]})`,
      },
      { key: "pending" as const, label: `待激活 (${pendingDevices.length})` },
    ],
    [allRecords.length, deviceCountByKind, pendingDevices.length],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consoleHeader}>
        <div className={adminStyles.consoleHeaderMain}>
          {selectedRecordHeader ? (
            <>
              <div className={adminStyles.consoleToolbarGroup}>
                <Button
                  icon={<ArrowLeftOutlined />}
                  size="small"
                  onClick={() => setSelectedDeviceId("")}
                >
                  返回上一页
                </Button>
                <h1 className={adminStyles.consoleTitle}>{selectedRecordHeader.title}</h1>
              </div>
              <div className={adminStyles.consoleMetaRow}>
                <span className={adminStyles.consoleMetaTag}>{selectedRecordHeader.typeLabel}</span>
                <span className={getStatusClassName(selectedRecordHeader.statusTone)}>
                  {selectedRecordHeader.statusLabel}
                </span>
              </div>
            </>
          ) : (
            <h1 className={adminStyles.consoleTitle}>设备管理</h1>
          )}
        </div>
      </header>

      {!selectedRecord ? (
        <>
          <div className={adminStyles.consoleSummaryStrip}>
            {summaryItems.map(item => (
              <div key={item.label} className={adminStyles.consoleSummaryItem}>
                <span className={adminStyles.consoleSummaryLabel}>{item.label}</span>
                <strong className={adminStyles.consoleSummaryValue}>{item.value}</strong>
                <span className={adminStyles.consoleSummaryHint}>{item.hint}</span>
              </div>
            ))}
          </div>

          <section className={adminStyles.consoleSection}>
            <div className={adminStyles.consoleSectionHeader}>
              <div className={adminStyles.consoleSectionHeaderMain}>
                <h2 className={adminStyles.consoleSectionTitle}>客户端下载</h2>
              </div>
            </div>
            <div className={adminStyles.consolePillRow}>
              {CLIENT_DOWNLOAD_OPTIONS.map(downloadItem => (
                <Button
                  key={downloadItem.key}
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownloadClient(downloadItem)}
                >
                  {downloadItem.label}
                </Button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {selectedRecord ? (
        <section className={adminStyles.consoleSection}>
          {selectedRecord.kind === "pending" ? (
            <PendingDeviceDetail
              device={selectedRecord.item}
              handleAssignOwner={handleAssignOwner}
              handleRemoveDevice={handleRemoveDevice}
              handleUpdatePendingDevice={handleUpdatePendingDevice}
              userOptions={userOptions}
            />
          ) : (
            <ExistingDeviceDetail
              device={selectedRecord.item}
              deviceOwners={deviceOwners}
              deviceLocation={getExistingDeviceLocation(
                selectedRecord.item.workspace.id,
                selectedRecord.item.location,
              )}
              deviceName={getExistingDeviceName(
                selectedRecord.item.workspace.id,
                selectedRecord.item.workspace.name,
              )}
              deploymentByEmployeeId={deploymentByEmployeeId}
              employees={employees}
              getOwnerName={getOwnerName}
              handleAssignOwner={handleAssignOwner}
              handleRenameDevice={handleRenameExistingDevice}
              handleRemoveDevice={handleRemoveDevice}
              handleRepair={handleRepair}
              handleToggleDeviceStatus={handleToggleDeviceStatus}
              handleUpdateDeviceLocation={handleUpdateExistingDeviceLocation}
              resolveOnlineStatus={resolveOnlineStatus}
              users={users}
              userOptions={userOptions}
            />
          )}
        </section>
      ) : (
        <section className={adminStyles.consoleSection}>
          <div className={adminStyles.consoleSectionHeader}>
            <div className={adminStyles.consoleSectionHeaderMain}>
              <h2 className={adminStyles.consoleSectionTitle}>设备列表</h2>
            </div>
            <div className={adminStyles.consoleActions}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsLocalDeviceModalOpen(true)}
              >
                添加设备
              </Button>
            </div>
          </div>

          <div className={adminStyles.consoleTabs}>
            {filterOptions.map(option => (
              <button
                key={option.key}
                type="button"
                className={`${adminStyles.consoleTabButton} ${
                  activeFilter === option.key ? adminStyles.consoleTabButtonActive : ""
                }`}
                onClick={() => setActiveFilter(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className={adminStyles.consoleHtmlTableWrap}>
            <table className={adminStyles.consoleHtmlTable}>
              <thead>
                <tr>
                  <th>设备名称</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>所属员工</th>
                  <th>部署位置</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length ? (
                  filteredRecords.map(record => {
                    if (record.kind === "pending") {
                      const pendingStatus = getPendingDeviceStatus();

                      return (
                        <tr key={record.id}>
                          <td className={adminStyles.consoleHtmlTableStrong}>{record.item.name}</td>
                          <td>{DEVICE_KIND_LABEL[record.item.deviceKind]}</td>
                          <td>
                            <span className={getStatusClassName(pendingStatus.tone)}>
                              {pendingStatus.label}
                            </span>
                          </td>
                          <td>{getOwnerName(record.item.ownerId) ?? ""}</td>
                          <td>{record.item.location}</td>
                          <td>
                            <Button size="small" onClick={() => setSelectedDeviceId(record.id)}>
                              查看详情
                            </Button>
                          </td>
                        </tr>
                      );
                    }

                    const ownerId = deviceOwners[record.item.workspace.id] ?? null;
                    const existingStatus = resolveExistingDeviceStatus(
                      record.item.workspace.id,
                      record.item.workspace.status,
                      ownerId,
                    );

                    return (
                      <tr key={record.id}>
                        <td className={adminStyles.consoleHtmlTableStrong}>
                          {getExistingDeviceName(record.item.workspace.id, record.item.workspace.name)}
                        </td>
                        <td>{DEVICE_KIND_LABEL[resolveDeviceKind(record.item.workspace.type)]}</td>
                        <td>
                          <span className={getStatusClassName(existingStatus.tone)}>
                            {existingStatus.label}
                          </span>
                        </td>
                        <td>{getOwnerName(ownerId) ?? ""}</td>
                        <td>
                          {getExistingDeviceLocation(record.item.workspace.id, record.item.location)}
                        </td>
                        <td>
                          <Button size="small" onClick={() => setSelectedDeviceId(record.id)}>
                            查看详情
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className={adminStyles.consoleEmpty}>当前筛选下暂无设备。</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal
        title="添加设备"
        open={isLocalDeviceModalOpen}
        onCancel={() => setIsLocalDeviceModalOpen(false)}
        onOk={handleAddLocalDevice}
        okText="确认"
        cancelText="取消"
      >
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>设备类型</span>
            <Select
              className={adminStyles.consoleControl}
              placeholder="请选择设备类型"
              options={Object.entries(DEVICE_KIND_LABEL).map(([value, label]) => ({
                label: `${label}（额度 ${deviceCountByKind[value as DeviceKind]}/${DEVICE_KIND_QUOTA[value as DeviceKind]}）`,
                value,
              }))}
              value={draftDeviceKind ?? undefined}
              onChange={value => setDraftDeviceKind(value)}
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>设备名称</span>
            <Input
              placeholder="如：sz-local-001"
              value={draftDeviceName}
              onChange={event => setDraftDeviceName(event.target.value)}
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>部署位置</span>
            <Input
              placeholder="如：深圳数据中心"
              value={draftDeviceLocation}
              onChange={event => setDraftDeviceLocation(event.target.value)}
            />
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>所属员工</span>
            <Select
              className={adminStyles.consoleControl}
              allowClear
              placeholder="选择所属员工（可选）"
              options={userOptions}
              value={draftDeviceOwner ?? undefined}
              onChange={value => setDraftDeviceOwner(value ?? null)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

interface ExistingDeviceDetailProps {
  device: ExistingDeviceItem;
  deviceOwners: Record<string, string | null>;
  deviceLocation: string;
  deviceName: string;
  deploymentByEmployeeId: Record<string, ExpertDeploymentState>;
  employees: DeviceManagementViewProps["employees"];
  getOwnerName: (ownerId: string | null) => string | null;
  handleAssignOwner: (deviceId: string, ownerId: string | null) => void;
  handleRenameDevice: (deviceId: string, value: string) => void;
  handleRemoveDevice: (deviceId: string, isPending: boolean) => void;
  handleRepair: () => void;
  handleToggleDeviceStatus: (deviceId: string, currentlyOnline: boolean) => void;
  handleUpdateDeviceLocation: (deviceId: string, value: string) => void;
  resolveOnlineStatus: (workspaceId: string, originalStatus: string) => boolean;
  users: FrontisWebUserItem[];
  userOptions: Array<{ label: string; value: string }>;
}

const ExistingDeviceDetail = ({
  device,
  deviceOwners,
  deviceLocation,
  deviceName,
  deploymentByEmployeeId,
  employees,
  getOwnerName,
  handleAssignOwner,
  handleRenameDevice,
  handleRemoveDevice,
  handleRepair,
  handleToggleDeviceStatus,
  handleUpdateDeviceLocation,
  resolveOnlineStatus,
  users,
  userOptions,
}: ExistingDeviceDetailProps): JSX.Element => {
  const online = resolveOnlineStatus(device.workspace.id, device.workspace.status);
  const ownerId = deviceOwners[device.workspace.id] ?? null;
  const deviceKind = resolveDeviceKind(device.workspace.type);
  const deployedAgents = useMemo(
    () =>
      employees
        .filter(employee =>
          getAssignedWorkspaceIdsForExpert(
            employee,
            deploymentByEmployeeId[employee.id],
          ).includes(device.workspace.id),
        )
        .map(employee => {
          const requiresDeviceBinding = doesExpertRequireDeviceBinding(employee);
          const accessState = getDeviceAccessStateForExpert(
            employee,
            device.workspace.id,
            deploymentByEmployeeId[employee.id],
          );

          return {
            accessState,
            employee,
            memberSummary:
              accessState.visibility === "all"
                ? "全公司可用"
                : getEffectiveMembersForDeviceAccess(accessState, ownerId, users).join("、") ||
                  (requiresDeviceBinding ? "待分配设备权限" : "暂未配置可用成员"),
            requiresDeviceBinding,
          };
        }),
    [deploymentByEmployeeId, device.workspace.id, employees, getOwnerName, ownerId, users],
  );

  return (
    <>
      <section className={adminStyles.consoleSection}>
        <h3 className={adminStyles.consoleSectionTitle}>基础信息</h3>
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>设备名称</span>
            <div className={adminStyles.consoleInfoValue}>
              <Input
                value={deviceName}
                onChange={event => handleRenameDevice(device.workspace.id, event.target.value)}
              />
            </div>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>设备 ID</span>
            <span className={adminStyles.consoleInfoValue}>{device.code}</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>部署位置</span>
            <div className={adminStyles.consoleInfoValue}>
              <Input
                value={deviceLocation}
                onChange={event =>
                  handleUpdateDeviceLocation(device.workspace.id, event.target.value)
                }
              />
            </div>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>设备类型</span>
            <span className={adminStyles.consoleInfoValue}>{DEVICE_KIND_LABEL[deviceKind]}</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>激活时间</span>
            <span className={adminStyles.consoleInfoValue}>{device.activatedAt}</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>所属员工</span>
            <div className={adminStyles.consoleInfoValue}>
              <Select
                className={adminStyles.consoleControl}
                allowClear
                placeholder="选择员工（可选）"
                options={userOptions}
                value={ownerId ?? undefined}
                onChange={value => handleAssignOwner(device.workspace.id, value ?? null)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={adminStyles.consoleSection}>
        <h3 className={adminStyles.consoleSectionTitle}>部署 AI 专家</h3>
        <div className={adminStyles.consoleRows}>
          {deployedAgents.length ? (
            deployedAgents.map(({ accessState, employee, memberSummary, requiresDeviceBinding }) => (
              <div key={employee.id} className={adminStyles.consoleInfoRow}>
                <span className={adminStyles.consoleInfoLabel}>{employee.name}</span>
                <div className={adminStyles.consoleInfoValue}>
                  <div className={adminStyles.consoleRows}>
                    <span>{memberSummary}</span>
                    <span className={adminStyles.consoleSummaryHint}>
                      {requiresDeviceBinding
                        ? ownerId
                          ? `该 AI 专家仅随设备拥有者 ${getOwnerName(ownerId) ?? "未命名成员"} 生效。`
                          : "该 AI 专家按设备拥有者生效，请先补充设备拥有者。"
                        : accessState.visibility === "all"
                          ? "当前设备中该 Agent 对全公司成员开放。"
                          : ownerId
                            ? `设备拥有者 ${getOwnerName(ownerId) ?? "未命名成员"} 默认拥有可用权限。`
                            : "当前设备中该 Agent 按指定成员生效。"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <span className={adminStyles.consoleEmpty}>暂无已生效的 AI 专家。</span>
          )}
        </div>
      </section>

      <section className={adminStyles.consoleSection}>
        <h3 className={adminStyles.consoleSectionTitle}>管理员操作</h3>
        <div className={adminStyles.consoleActions}>
          <Button onClick={() => handleToggleDeviceStatus(device.workspace.id, online)}>
            {online ? "下线设备" : "恢复上线"}
          </Button>
          {!online ? (
            <Button type="primary" danger onClick={handleRepair}>
              一键报修
            </Button>
          ) : null}
          <Popconfirm
            title="确认移除此设备？"
            description={`移除后将释放 ${DEVICE_KIND_LABEL[deviceKind]} 额度`}
            onConfirm={() => handleRemoveDevice(device.workspace.id, false)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger>移除设备</Button>
          </Popconfirm>
        </div>
      </section>
    </>
  );
};

interface PendingDeviceDetailProps {
  device: PendingDeviceItem;
  handleAssignOwner: (deviceId: string, ownerId: string | null) => void;
  handleRemoveDevice: (deviceId: string, isPending: boolean) => void;
  handleUpdatePendingDevice: (
    deviceId: string,
    updates: Partial<Pick<PendingDeviceItem, "location" | "name">>,
  ) => void;
  userOptions: Array<{ label: string; value: string }>;
}

const PendingDeviceDetail = ({
  device,
  handleAssignOwner,
  handleRemoveDevice,
  handleUpdatePendingDevice,
  userOptions,
}: PendingDeviceDetailProps): JSX.Element => {
  return (
    <>
      <section className={adminStyles.consoleSection}>
        <h3 className={adminStyles.consoleSectionTitle}>基础信息</h3>
        <div className={adminStyles.consoleRows}>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>设备名称</span>
            <div className={adminStyles.consoleInfoValue}>
              <Input
                value={device.name}
                onChange={event =>
                  handleUpdatePendingDevice(device.id, { name: event.target.value })
                }
              />
            </div>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>激活码</span>
            <span className={adminStyles.consoleInfoValue}>{device.activationCode}</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>部署位置</span>
            <div className={adminStyles.consoleInfoValue}>
              <Input
                value={device.location}
                onChange={event =>
                  handleUpdatePendingDevice(device.id, { location: event.target.value })
                }
              />
            </div>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>设备类型</span>
            <span className={adminStyles.consoleInfoValue}>{DEVICE_KIND_LABEL[device.deviceKind]}</span>
          </div>
          <div className={adminStyles.consoleInfoRow}>
            <span className={adminStyles.consoleInfoLabel}>所属员工</span>
            <div className={adminStyles.consoleInfoValue}>
              <Select
                className={adminStyles.consoleControl}
                allowClear
                placeholder="选择员工（可选）"
                options={userOptions}
                value={device.ownerId ?? undefined}
                onChange={value => handleAssignOwner(device.id, value ?? null)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={adminStyles.consoleSection}>
        <h3 className={adminStyles.consoleSectionTitle}>管理员操作</h3>
        <div className={adminStyles.consoleActions}>
          <Button
            onClick={() => {
              void navigator.clipboard.writeText(device.activationCode);
              message.success("激活码已复制");
            }}
          >
            复制激活码
          </Button>
          <Popconfirm
            title="确认移除此设备？"
            description={`移除后将释放 ${DEVICE_KIND_LABEL[device.deviceKind]} 额度`}
            onConfirm={() => handleRemoveDevice(device.id, true)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger>移除设备</Button>
          </Popconfirm>
        </div>
      </section>
    </>
  );
};
