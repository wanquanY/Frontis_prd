import { useCallback, useMemo, useState } from "react";

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Alert, Avatar, Button, Checkbox, Input, Modal, Radio, Select, Tag, message } from "antd";

import type { EmployeeItem, EmployeeVisibility, FrontisWebTabKey, WorkspaceItem } from "../../types";
import type { OwnedExpertTeam } from "./types";
import {
  INITIAL_PROVIDER_CONFIGS,
  PROVIDER_MODEL_CATALOG,
  PROVIDER_OPTIONS,
  isProviderConfigured,
} from "../FrontisWebViews";

import styles from "./AgentStoreView.module.less";

const DEPARTMENT_MEMBERS: Record<string, string[]> = {
  管理层: ["杨万泉"],
  市场部: ["陈雪梅"],
  销售部: ["王晨"],
  财务部: ["李婷"],
  人力资源部: ["周可"],
};

const DEPARTMENT_OPTIONS = Object.keys(DEPARTMENT_MEMBERS).map(item => ({
  label: item,
  value: item,
}));

const MEMBER_DEVICE_MAP: Record<string, string[]> = {
  杨万泉: ["workspace-cloud", "workspace-local-bj"],
  陈雪梅: ["workspace-local"],
  王晨: ["workspace-local-sh"],
  李婷: ["workspace-local-sh"],
  周可: [],
};

/**
 * AI 专家版本信息。
 */
export const EXPERT_VERSION_INFO: Record<
  string,
  { version: string; newVersion?: string; updateNotes?: string[] }
> = {
  "employee-pm": {
    version: "v2.1",
    newVersion: "v2.2",
    updateNotes: ["新增智能需求拆解", "支持多轮方案对比"],
  },
  "employee-designer": {
    version: "v1.8",
    newVersion: "v1.9",
    updateNotes: ["新增智能配色功能", "支持更多模板风格"],
  },
  "employee-research": { version: "v1.5" },
  "employee-ops": { version: "v1.3" },
  "employee-writer": {
    version: "v1.6",
    newVersion: "v1.7",
    updateNotes: ["优化内容生成质量", "支持多语言输出"],
  },
  "employee-sales": { version: "v2.0" },
  "employee-local-ops": { version: "v1.1" },
};

interface AgentStoreTeamDetailProps {
  employees: EmployeeItem[];
  memberNames: string[];
  onBack: () => void;
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateEmployeeAccess: (
    employeeId: string,
    visibility: EmployeeVisibility,
    boundMembers: string[],
  ) => void;
  onUpdateEmployeeModel: (employeeId: string, model: string) => void;
  team: OwnedExpertTeam;
  workspace?: WorkspaceItem;
  workspaces: WorkspaceItem[];
}

export const AgentStoreTeamDetail = ({
  employees,
  memberNames,
  onBack,
  onNavigateToTab,
  onUpdateEmployeeAccess,
  onUpdateEmployeeModel,
  team,
  workspace,
  workspaces,
}: AgentStoreTeamDetailProps): JSX.Element => {
  const isOnline = employees.some(e => ["online", "busy", "idle"].includes(e.status));

  const { allModelOptions, hasAnyProvider } = useMemo(() => {
    const configuredProviders = PROVIDER_OPTIONS.filter(p =>
      isProviderConfigured(INITIAL_PROVIDER_CONFIGS[p.key]),
    );
    const options = configuredProviders.flatMap(p =>
      (PROVIDER_MODEL_CATALOG[p.key] ?? []).map(m => ({
        label: `${m}  (${p.label})`,
        value: m,
      })),
    );
    return { allModelOptions: options, hasAnyProvider: options.length > 0 };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.detailHeader}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ArrowLeftOutlined />
          返回AI专家团
        </button>

        <div className={styles.detailTitleRow}>
          <div className={styles.cardIcon} style={{ background: `${team.categoryColor}12` }}>
            <span style={{ fontSize: 24 }}>{team.icon}</span>
          </div>
          <div>
            <div className={styles.cardTitleRow}>
              <h1 className={styles.detailTitle}>{team.name}</h1>
              <Tag color={team.categoryColor} bordered={false}>
                {team.category}
              </Tag>
              <span className={isOnline ? styles.badgeOnline : styles.badgeOffline}>
                {isOnline ? "在线" : "离线"}
              </span>
            </div>
            <p className={styles.detailSubtitle}>{team.description}</p>
            <div className={styles.detailMeta}>
              <span>累计任务 {team.cumulativeTaskCount.toLocaleString()}</span>
              {workspace && (
                <>
                  <span>·</span>
                  <span>运行在 {workspace.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <h2 className={styles.sectionTitle}>AI 专家列表</h2>

      <div className={styles.expertGrid}>
        {employees.map(employee => (
          <ExpertConfigCard
            key={employee.id}
            allModelOptions={allModelOptions}
            employee={employee}
            hasAnyProvider={hasAnyProvider}
            memberNames={memberNames}
            onNavigateToTab={onNavigateToTab}
            onUpdateAccess={onUpdateEmployeeAccess}
            onUpdateModel={onUpdateEmployeeModel}
            workspaces={workspaces}
          />
        ))}
      </div>
    </div>
  );
};

/* ── Per-expert config card ── */

interface ExpertConfigCardProps {
  allModelOptions: Array<{ label: string; value: string }>;
  employee: EmployeeItem;
  hasAnyProvider: boolean;
  memberNames: string[];
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateAccess: (
    employeeId: string,
    visibility: EmployeeVisibility,
    boundMembers: string[],
  ) => void;
  onUpdateModel: (employeeId: string, model: string) => void;
  workspaces: WorkspaceItem[];
}

const ExpertConfigCard = ({
  allModelOptions,
  employee,
  hasAnyProvider,
  memberNames,
  onNavigateToTab,
  onUpdateAccess,
  onUpdateModel,
  workspaces,
}: ExpertConfigCardProps): JSX.Element => {
  const [visibility, setVisibility] = useState<EmployeeVisibility>(employee.visibility);
  const [bound, setBound] = useState<string[]>(employee.boundMembers);
  const [selectedModel, setSelectedModel] = useState<string>(employee.model);
  const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? { version: "v1.0" };
  const [currentVersion, setCurrentVersion] = useState<string>(versionInfo.version);
  const [versionIgnored, setVersionIgnored] = useState<boolean>(false);
  const [deployModalOpen, setDeployModalOpen] = useState<boolean>(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [deployedDeviceIds, setDeployedDeviceIds] = useState<string[]>(() => [employee.workspaceId]);
  const [filterMode, setFilterMode] = useState<"device" | "department" | "employee">("device");
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [filterDeviceName, setFilterDeviceName] = useState<string>("");
  const hasNewVersion =
    Boolean(versionInfo.newVersion) &&
    currentVersion !== versionInfo.newVersion &&
    !versionIgnored;

  const filteredDevices = useMemo(() => {
    let nextWorkspaces = workspaces;

    if (filterMode === "department" && filterDepartment) {
      const members = DEPARTMENT_MEMBERS[filterDepartment] ?? [];
      const workspaceIds = members.flatMap(member => MEMBER_DEVICE_MAP[member] ?? []);
      const workspaceIdSet = new Set(workspaceIds);
      nextWorkspaces = nextWorkspaces.filter(item => workspaceIdSet.has(item.id));
    }

    if (filterMode === "employee" && filterEmployee) {
      const workspaceIds = MEMBER_DEVICE_MAP[filterEmployee] ?? [];
      const workspaceIdSet = new Set(workspaceIds);
      nextWorkspaces = nextWorkspaces.filter(item => workspaceIdSet.has(item.id));
    }

    if (filterMode === "device" && filterDeviceName.trim()) {
      const keyword = filterDeviceName.trim().toLowerCase();
      nextWorkspaces = nextWorkspaces.filter(
        item =>
          item.name.toLowerCase().includes(keyword) || item.id.toLowerCase().includes(keyword),
      );
    }

    return nextWorkspaces;
  }, [filterDepartment, filterDeviceName, filterEmployee, filterMode, workspaces]);

  const allFilteredSelected =
    filteredDevices.length > 0 &&
    filteredDevices.every(item => selectedDeviceIds.includes(item.id));

  const handleSaveAccess = useCallback(() => {
    onUpdateAccess(employee.id, visibility, bound);
    message.success(`${employee.name} 权限已更新`);
  }, [bound, employee.id, employee.name, onUpdateAccess, visibility]);

  const handleModelChange = useCallback(
    (model: string) => {
      setSelectedModel(model);
      onUpdateModel(employee.id, model);
      message.success(`${employee.name} 模型已切换为 ${model}`);
    },
    [employee.id, employee.name, onUpdateModel],
  );

  const handleUpgrade = useCallback(() => {
    if (!versionInfo.newVersion) {
      return;
    }
    setCurrentVersion(versionInfo.newVersion);
    message.success(`${employee.name} 已升级到 ${versionInfo.newVersion}`);
  }, [employee.name, versionInfo.newVersion]);

  const handleIgnoreVersion = useCallback(() => {
    setVersionIgnored(true);
    message.info("已忽略此版本更新");
  }, []);

  const handleToggleDevice = useCallback((deviceId: string) => {
    setSelectedDeviceIds(current =>
      current.includes(deviceId)
        ? current.filter(item => item !== deviceId)
        : [...current, deviceId],
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = filteredDevices.map(item => item.id);
    const isAllSelected = allIds.every(item => selectedDeviceIds.includes(item));

    if (isAllSelected) {
      setSelectedDeviceIds(current => current.filter(item => !allIds.includes(item)));
      return;
    }

    setSelectedDeviceIds(current => [...new Set([...current, ...allIds])]);
  }, [filteredDevices, selectedDeviceIds]);

  const handleDeployConfirm = useCallback(() => {
    const nextIds = selectedDeviceIds.filter(item => !deployedDeviceIds.includes(item));

    if (nextIds.length === 0) {
      message.warning("未选择新的设备，所选设备均已下发");
      return;
    }

    const deviceNames = nextIds
      .map(item => workspaces.find(workspace => workspace.id === item)?.name ?? item)
      .join("、");

    setDeployedDeviceIds(current => [...new Set([...current, ...nextIds])]);
    message.success(`${employee.name} 已新下发到 ${nextIds.length} 台设备：${deviceNames}`);
    setDeployModalOpen(false);
    setSelectedDeviceIds([]);
  }, [deployedDeviceIds, employee.name, selectedDeviceIds, workspaces]);

  const handleOpenDeployModal = useCallback(() => {
    setSelectedDeviceIds([]);
    setFilterMode("device");
    setFilterDepartment(null);
    setFilterEmployee(null);
    setFilterDeviceName("");
    setDeployModalOpen(true);
  }, []);

  return (
    <div className={styles.expertCard}>
      {/* Expert info */}
      <div className={styles.expertInfo}>
        <Avatar src={employee.avatarUrl} size={48} className={styles.expertAvatar}>
          {employee.name.slice(0, 1)}
        </Avatar>
        <div className={styles.expertMeta}>
          <div className={styles.expertNameRow}>
            <span className={styles.expertName}>{employee.name}</span>
            <Tag bordered={false} style={{ fontSize: 11, margin: 0 }}>
              {currentVersion}
            </Tag>
            {hasNewVersion ? (
              <span className={styles.updateBadge}>{versionInfo.newVersion} 可升级</span>
            ) : null}
          </div>
          <p className={styles.expertRole}>{employee.role}</p>
        </div>
      </div>

      {hasNewVersion ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            background: "color-mix(in srgb, #fa8c16 8%, transparent)",
            border: "1px solid color-mix(in srgb, #fa8c16 20%, transparent)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            新版本 {versionInfo.newVersion} 可用
          </div>
          {versionInfo.updateNotes ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {versionInfo.updateNotes.map(note => (
                <span key={note}>
                  <CheckCircleOutlined
                    style={{ color: "#52c41a", marginRight: 4, fontSize: 11 }}
                  />
                  {note}
                </span>
              ))}
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="primary" size="small" onClick={handleUpgrade}>
              立即升级
            </Button>
            <Button size="small" onClick={handleIgnoreVersion}>
              忽略
            </Button>
          </div>
        </div>
      ) : null}

      <div className={styles.configSection}>
        <p className={styles.configLabel}>下发到设备</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Button type="primary" icon={<SendOutlined />} size="small" onClick={handleOpenDeployModal}>
            选择设备并下发
          </Button>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            已下发 <strong style={{ color: "var(--text)" }}>{deployedDeviceIds.length}</strong>{" "}
            台设备
          </span>
        </div>
      </div>

      <div className={styles.configSection}>
        <p className={styles.configLabel}>权限配置</p>
        <Radio.Group
          value={visibility}
          onChange={e => setVisibility(e.target.value)}
          size="small"
        >
          <Radio value="all">全员可见</Radio>
          <Radio value="bound">指定成员</Radio>
        </Radio.Group>
        {visibility === "bound" && (
          <Select
            mode="multiple"
            placeholder="选择可使用的成员"
            size="small"
            style={{ width: "100%", marginTop: 8 }}
            value={bound}
            onChange={setBound}
            options={memberNames.map(n => ({ label: n, value: n }))}
          />
        )}
        <Button size="small" type="primary" style={{ marginTop: 8 }} onClick={handleSaveAccess}>
          保存权限
        </Button>
      </div>

      {/* Model config */}
      <div className={styles.configSection}>
        <p className={styles.configLabel}>模型配置</p>
        {hasAnyProvider ? (
          <Select
            placeholder="选择大模型"
            size="small"
            style={{ width: "100%" }}
            value={selectedModel || undefined}
            onChange={handleModelChange}
            options={allModelOptions}
          />
        ) : (
          <Alert
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message="暂无可用大模型，请前往配置"
            action={
              <Button size="small" onClick={() => onNavigateToTab("models")}>
                前往模型配置
              </Button>
            }
          />
        )}
      </div>

      <Modal
        title={`下发「${employee.name}」到设备`}
        open={deployModalOpen}
        onCancel={() => setDeployModalOpen(false)}
        onOk={handleDeployConfirm}
        okText={`确认下发 (${
          selectedDeviceIds.filter(item => !deployedDeviceIds.includes(item)).length
        } 台新设备)`}
        cancelText="取消"
        width={560}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
          {deployedDeviceIds.length > 0 ? (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "color-mix(in srgb, var(--primary-color, #1677ff) 6%, transparent)",
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              该专家已下发到{" "}
              <strong style={{ color: "var(--text)" }}>{deployedDeviceIds.length}</strong>{" "}
              台设备：
              {deployedDeviceIds
                .map(item => workspaces.find(workspace => workspace.id === item)?.name ?? item)
                .join("、")}
            </div>
          ) : null}

          <div>
            <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13 }}>筛选方式</div>
            <Radio.Group
              value={filterMode}
              onChange={event => setFilterMode(event.target.value)}
              size="small"
            >
              <Radio.Button value="device">按设备名称</Radio.Button>
              <Radio.Button value="department">按部门</Radio.Button>
              <Radio.Button value="employee">按员工</Radio.Button>
            </Radio.Group>
          </div>

          {filterMode === "device" ? (
            <Input
              placeholder="搜索设备名称…"
              prefix={<SearchOutlined />}
              allowClear
              value={filterDeviceName}
              onChange={event => setFilterDeviceName(event.target.value)}
            />
          ) : null}
          {filterMode === "department" ? (
            <Select
              allowClear
              placeholder="选择部门"
              style={{ width: "100%" }}
              value={filterDepartment}
              onChange={value => setFilterDepartment(value ?? null)}
              options={DEPARTMENT_OPTIONS}
            />
          ) : null}
          {filterMode === "employee" ? (
            <Select
              allowClear
              showSearch
              placeholder="选择员工"
              style={{ width: "100%" }}
              value={filterEmployee}
              onChange={value => setFilterEmployee(value ?? null)}
              options={memberNames.map(item => ({ label: item, value: item }))}
            />
          ) : null}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Checkbox
              checked={allFilteredSelected}
              indeterminate={
                !allFilteredSelected &&
                filteredDevices.some(item => selectedDeviceIds.includes(item.id))
              }
              onChange={handleSelectAll}
            >
              全选（共 {filteredDevices.length} 台设备）
            </Checkbox>
            {selectedDeviceIds.length > 0 ? (
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                已选 {selectedDeviceIds.length} 台
              </span>
            ) : null}
          </div>

          <div
            style={{
              maxHeight: 300,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {filteredDevices.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  padding: 24,
                  fontSize: 13,
                }}
              >
                未找到匹配的设备
              </div>
            ) : (
              filteredDevices.map(device => {
                const isOnline = ["online", "busy", "idle"].includes(device.status);
                const isDeployed = deployedDeviceIds.includes(device.id);
                const isSelected = selectedDeviceIds.includes(device.id);

                return (
                  <label
                    key={device.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid",
                      borderColor: isDeployed
                        ? "color-mix(in srgb, #52c41a 40%, transparent)"
                        : isSelected
                          ? "var(--primary-color, #1677ff)"
                          : "color-mix(in srgb, var(--text, #333) 10%, transparent)",
                      background: isDeployed
                        ? "color-mix(in srgb, #52c41a 6%, transparent)"
                        : isSelected
                          ? "color-mix(in srgb, var(--primary-color, #1677ff) 5%, transparent)"
                          : "transparent",
                      cursor: "pointer",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                  >
                    <Checkbox
                      checked={isDeployed || isSelected}
                      disabled={isDeployed}
                      onChange={() => handleToggleDevice(device.id)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        {device.name}
                        {isDeployed ? (
                          <Tag
                            bordered={false}
                            color="success"
                            style={{ fontSize: 11, margin: 0, lineHeight: "18px" }}
                          >
                            已下发
                          </Tag>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {device.region} · {device.type === "cloud" ? "云端" : "本地"}
                      </div>
                    </div>
                    <Tag
                      bordered={false}
                      color={isOnline ? "success" : "default"}
                      style={{ fontSize: 11, margin: 0 }}
                    >
                      {isOnline ? "在线" : "离线"}
                    </Tag>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
