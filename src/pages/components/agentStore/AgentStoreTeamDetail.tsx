import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Avatar, Button, Modal, Radio, Select, message } from "antd";

import type {
  EmployeeItem,
  EmployeeVisibility,
  FrontisWebTabKey,
  FrontisWebUserItem,
  WorkspaceItem,
} from "../../types";
import type { ExpertDeploymentState, ExpertDeviceAccessState } from "./types";
import {
  INITIAL_PROVIDER_CONFIGS,
  PROVIDER_MODEL_CATALOG,
  PROVIDER_OPTIONS,
  isProviderConfigured,
} from "../FrontisWebViews";
import adminStyles from "../FrontisAdminViews.module.less";
import {
  getAssignedWorkspaceIdsForExpert,
  getDeviceAccessStateForExpert,
  getEffectiveMembersForDeviceAccess,
} from "./utils";

import styles from "./AgentStoreView.module.less";

/**
 * AI 专家版本信息。
 */
export const EXPERT_VERSION_INFO: Record<
  string,
  { updateNotes?: string[]; version: string; newVersion?: string }
> = {
  "employee-pm": {
    version: "v2.1",
    newVersion: "v2.2",
    updateNotes: ["新增经营结论摘要模板", "补充多轮差异解释能力"],
  },
  "employee-designer": {
    version: "v1.8",
    newVersion: "v1.9",
    updateNotes: ["补充更细的员工评估维度", "新增证据摘要视图"],
  },
  "employee-research": { version: "v1.5" },
  "employee-ops": { version: "v1.3" },
  "employee-writer": {
    version: "v1.6",
    newVersion: "v1.7",
    updateNotes: ["优化 CEO 口吻一致性", "新增经营问答收口模板"],
  },
  "employee-sales": { version: "v2.0" },
  "employee-local-ops": { version: "v1.1" },
};

interface AgentStoreTeamDetailProps {
  deploymentByEmployeeId: Record<string, ExpertDeploymentState>;
  deviceOwners: Record<string, string | null>;
  detailTitle: string;
  employees: EmployeeItem[];
  memberNames: string[];
  onBack: () => void;
  onAttachEmployeeToDevice: (employeeId: string, workspaceId: string) => void;
  onDetachEmployeeFromDevice: (employeeId: string, workspaceId: string) => void;
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateDeviceAccess: (
    employeeId: string,
    workspaceId: string,
    visibility: EmployeeVisibility,
    boundMembers: string[],
  ) => void;
  onUpdateModel: (employeeId: string, model: string) => void;
  users: FrontisWebUserItem[];
  workspaces: WorkspaceItem[];
}

const getVersionTagClassName = (hasNewVersion: boolean): string =>
  hasNewVersion
    ? `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagWarning}`
    : `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagSuccess}`;

const getDeployTagClassName = (isAssigned: boolean): string =>
  isAssigned
    ? `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagSuccess}`
    : `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagWarning}`;

/**
 * AI 专家团/单个 AI 专家详情视图。
 */
export const AgentStoreTeamDetail = ({
  deploymentByEmployeeId,
  deviceOwners,
  detailTitle,
  employees,
  memberNames,
  onBack,
  onAttachEmployeeToDevice,
  onDetachEmployeeFromDevice,
  onNavigateToTab,
  onUpdateDeviceAccess,
  onUpdateModel,
  users,
  workspaces,
}: AgentStoreTeamDetailProps): JSX.Element => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(employees[0]?.id ?? null);
  const hasSwitcher = employees.length > 1;

  useEffect(() => {
    if (!employees.length) {
      setSelectedEmployeeId(null);
      return;
    }

    if (!selectedEmployeeId || !employees.some(employee => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0]?.id ?? null);
    }
  }, [employees, selectedEmployeeId]);

  const selectedEmployee = useMemo(
    () => employees.find(employee => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  return (
    <div className={adminStyles.consolePage}>
      <header className={adminStyles.consolePaneHeader}>
        <div className={adminStyles.consolePaneHeaderMain}>
          <div className={adminStyles.consoleActions}>
            <Button type="link" icon={<ArrowLeftOutlined />} size="small" onClick={onBack}>
              返回上一页
            </Button>
            <h2 className={adminStyles.consolePaneTitle}>{detailTitle}</h2>
          </div>
        </div>
      </header>

      <section className={adminStyles.consoleSection}>
        <div
          className={
            hasSwitcher ? styles.detailWorkspaceLayout : styles.detailWorkspaceLayoutSingle
          }
        >
          {hasSwitcher ? (
            <aside className={styles.detailAgentRail}>
              {employees.map(employee => {
                const assignedWorkspaceIds = getAssignedWorkspaceIdsForExpert(
                  employee,
                  deploymentByEmployeeId[employee.id],
                );
                const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? { version: "v1.0" };
                const hasNewVersion =
                  Boolean(versionInfo.newVersion) && versionInfo.newVersion !== versionInfo.version;

                return (
                  <button
                    key={employee.id}
                    type="button"
                    className={`${styles.detailAgentRailItem} ${
                      employee.id === selectedEmployeeId ? styles.detailAgentRailItemActive : ""
                    }`}
                    onClick={() => setSelectedEmployeeId(employee.id)}
                  >
                    <div className={styles.detailAgentRailTop}>
                      <Avatar src={employee.avatarUrl} size={36}>
                        {employee.name.slice(0, 1)}
                      </Avatar>
                      <div className={styles.detailAgentRailBody}>
                        <span className={styles.detailAgentRailName}>{employee.name}</span>
                        <span className={styles.detailAgentRailMeta}>
                          {assignedWorkspaceIds.length
                            ? `已分配 ${assignedWorkspaceIds.length} 个设备`
                            : "待绑定设备"}
                        </span>
                      </div>
                    </div>
                    <p className={styles.detailAgentRailSummary}>{employee.summary}</p>
                    <div className={styles.detailAgentRailTags}>
                      <span className={getDeployTagClassName(Boolean(assignedWorkspaceIds.length))}>
                        {assignedWorkspaceIds.length ? "已配置" : "待分配"}
                      </span>
                      <span className={getVersionTagClassName(hasNewVersion)}>
                        {hasNewVersion ? `待升级 ${versionInfo.newVersion}` : versionInfo.version}
                      </span>
                    </div>
                  </button>
                );
              })}
            </aside>
          ) : null}

          <div className={styles.detailAgentPanel}>
            {selectedEmployee ? (
              <ExpertConfigPanel
                key={selectedEmployee.id}
                deploymentState={deploymentByEmployeeId[selectedEmployee.id]}
                deviceOwners={deviceOwners}
                employee={selectedEmployee}
                memberNames={memberNames}
                onAttachEmployeeToDevice={onAttachEmployeeToDevice}
                onDetachEmployeeFromDevice={onDetachEmployeeFromDevice}
                onNavigateToTab={onNavigateToTab}
                onUpdateDeviceAccess={onUpdateDeviceAccess}
                onUpdateModel={onUpdateModel}
                users={users}
                workspaces={workspaces}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

interface ExpertConfigPanelProps {
  deploymentState?: ExpertDeploymentState;
  deviceOwners: Record<string, string | null>;
  employee: EmployeeItem;
  memberNames: string[];
  onAttachEmployeeToDevice: (employeeId: string, workspaceId: string) => void;
  onDetachEmployeeFromDevice: (employeeId: string, workspaceId: string) => void;
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateDeviceAccess: (
    employeeId: string,
    workspaceId: string,
    visibility: EmployeeVisibility,
    boundMembers: string[],
  ) => void;
  onUpdateModel: (employeeId: string, model: string) => void;
  users: FrontisWebUserItem[];
  workspaces: WorkspaceItem[];
}

const ExpertConfigPanel = ({
  deploymentState,
  deviceOwners,
  employee,
  memberNames,
  onAttachEmployeeToDevice,
  onDetachEmployeeFromDevice,
  onNavigateToTab,
  onUpdateDeviceAccess,
  onUpdateModel,
  users,
  workspaces,
}: ExpertConfigPanelProps): JSX.Element => {
  const [selectedModel, setSelectedModel] = useState<string>(employee.model);
  const [draftWorkspaceId, setDraftWorkspaceId] = useState<string | undefined>();
  const assignedWorkspaceIds = useMemo(
    () => getAssignedWorkspaceIdsForExpert(employee, deploymentState),
    [deploymentState, employee],
  );
  const [selectedAccessWorkspaceId, setSelectedAccessWorkspaceId] = useState<string | null>(
    assignedWorkspaceIds[0] ?? null,
  );
  const [accessDraftsByWorkspaceId, setAccessDraftsByWorkspaceId] = useState<
    Record<string, ExpertDeviceAccessState>
  >(() =>
    Object.fromEntries(
      assignedWorkspaceIds.map(workspaceId => [
        workspaceId,
        getDeviceAccessStateForExpert(employee, workspaceId, deploymentState),
      ]),
    ),
  );
  const [isVersionDiffOpen, setIsVersionDiffOpen] = useState<boolean>(false);
  const [versionIgnored, setVersionIgnored] = useState<boolean>(false);
  const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? { version: "v1.0" };
  const [currentVersion, setCurrentVersion] = useState<string>(versionInfo.version);
  const isAssigned = assignedWorkspaceIds.length > 0;

  useEffect(() => {
    setAccessDraftsByWorkspaceId(
      Object.fromEntries(
        assignedWorkspaceIds.map(workspaceId => [
          workspaceId,
          getDeviceAccessStateForExpert(employee, workspaceId, deploymentState),
        ]),
      ),
    );
    setSelectedAccessWorkspaceId(current =>
      current && assignedWorkspaceIds.includes(current) ? current : assignedWorkspaceIds[0] ?? null,
    );
  }, [assignedWorkspaceIds, deploymentState, employee]);

  const { allModelOptions, hasAnyProvider } = useMemo(() => {
    const configuredProviders = PROVIDER_OPTIONS.filter(provider =>
      isProviderConfigured(INITIAL_PROVIDER_CONFIGS[provider.key]),
    );
    const nextOptions = configuredProviders.flatMap(provider =>
      (PROVIDER_MODEL_CATALOG[provider.key] ?? []).map(model => ({
        label: `${model}（${provider.label}）`,
        value: model,
      })),
    );

    return {
      allModelOptions: nextOptions,
      hasAnyProvider: nextOptions.length > 0,
    };
  }, []);

  const hasNewVersion =
    Boolean(versionInfo.newVersion) &&
    currentVersion !== versionInfo.newVersion &&
    !versionIgnored;

  const workspaceOptions = useMemo(
    () =>
      workspaces.map(item => ({
        label: `${item.name}（${item.region}）`,
        value: item.id,
      })),
    [workspaces],
  );

  const availableWorkspaceOptions = useMemo(
    () => workspaceOptions.filter(item => !assignedWorkspaceIds.includes(item.value)),
    [assignedWorkspaceIds, workspaceOptions],
  );

  const assignedWorkspaces = useMemo(
    () =>
      assignedWorkspaceIds
        .map(workspaceId => workspaces.find(item => item.id === workspaceId) ?? null)
        .filter((item): item is WorkspaceItem => Boolean(item)),
    [assignedWorkspaceIds, workspaces],
  );

  const selectedAccessState = useMemo(() => {
    if (!selectedAccessWorkspaceId) {
      return null;
    }

    return (
      accessDraftsByWorkspaceId[selectedAccessWorkspaceId] ??
      getDeviceAccessStateForExpert(employee, selectedAccessWorkspaceId, deploymentState)
    );
  }, [accessDraftsByWorkspaceId, deploymentState, employee, selectedAccessWorkspaceId]);

  const selectedOwnerId = selectedAccessWorkspaceId ? deviceOwners[selectedAccessWorkspaceId] ?? null : null;
  const selectedOwnerName = selectedOwnerId
    ? users.find(user => user.id === selectedOwnerId)?.name ?? null
    : null;
  const assignedWorkspaceEntries = useMemo(
    () =>
      assignedWorkspaces.map(workspace => {
        const accessState =
          accessDraftsByWorkspaceId[workspace.id] ??
          getDeviceAccessStateForExpert(employee, workspace.id, deploymentState);
        const ownerId = deviceOwners[workspace.id] ?? null;
        const ownerName = ownerId ? users.find(user => user.id === ownerId)?.name ?? null : null;
        const effectiveMembers = getEffectiveMembersForDeviceAccess(accessState, ownerId, users);

        return {
          accessState,
          effectiveMembers,
          ownerName,
          permissionLabel:
            accessState.visibility === "all"
              ? "全公司可用"
              : `指定 ${effectiveMembers.length} 人可用`,
          workspace,
        };
      }),
    [accessDraftsByWorkspaceId, assignedWorkspaces, deploymentState, deviceOwners, employee, users],
  );
  const selectedWorkspaceEntry = useMemo(
    () =>
      assignedWorkspaceEntries.find(entry => entry.workspace.id === selectedAccessWorkspaceId) ?? null,
    [assignedWorkspaceEntries, selectedAccessWorkspaceId],
  );
  const selectedEffectiveMembers = useMemo(() => {
    if (!selectedAccessWorkspaceId || !selectedAccessState || selectedAccessState.visibility === "all") {
      return [];
    }

    return getEffectiveMembersForDeviceAccess(selectedAccessState, selectedOwnerId, users);
  }, [selectedAccessState, selectedAccessWorkspaceId, selectedOwnerId, users]);
  const selectedAccessSummary = useMemo(() => {
    if (!selectedAccessWorkspaceId || !selectedAccessState) {
      return "请先选择一个已分配设备，再配置该设备上的可用权限。";
    }

    if (selectedAccessState.visibility === "all") {
      return `全公司可用，共 ${memberNames.length} 名成员。`;
    }

    const effectiveMembers = getEffectiveMembersForDeviceAccess(
      selectedAccessState,
      selectedOwnerId,
      users,
    );
    if (!effectiveMembers.length) {
      return "当前未配置可用成员。";
    }

    return `指定成员可用，共 ${effectiveMembers.length} 人。`;
  }, [memberNames.length, selectedAccessState, selectedAccessWorkspaceId, selectedOwnerId, users]);

  const handleAttachWorkspaceClick = useCallback((): void => {
    if (!draftWorkspaceId) {
      message.warning("请先选择要绑定的设备");
      return;
    }

    onAttachEmployeeToDevice(employee.id, draftWorkspaceId);
    setAccessDraftsByWorkspaceId(prev => ({
      ...prev,
      [draftWorkspaceId]: getDeviceAccessStateForExpert(employee, draftWorkspaceId, deploymentState),
    }));
    setSelectedAccessWorkspaceId(draftWorkspaceId);
    setDraftWorkspaceId(undefined);
    message.success(`${employee.name} 已新增到该设备`);
  }, [deploymentState, draftWorkspaceId, employee, onAttachEmployeeToDevice]);

  const handleAttachAllWorkspaces = useCallback((): void => {
    const nextWorkspaceIds = availableWorkspaceOptions.map(option => option.value);

    if (!nextWorkspaceIds.length) {
      message.info("当前没有可新增分配的设备");
      return;
    }

    nextWorkspaceIds.forEach(workspaceId => {
      onAttachEmployeeToDevice(employee.id, workspaceId);
    });
    setAccessDraftsByWorkspaceId(prev => ({
      ...prev,
      ...Object.fromEntries(
        nextWorkspaceIds.map(workspaceId => [
          workspaceId,
          getDeviceAccessStateForExpert(employee, workspaceId, deploymentState),
        ]),
      ),
    }));
    setSelectedAccessWorkspaceId(nextWorkspaceIds[0] ?? null);
    setDraftWorkspaceId(undefined);
    message.success(`${employee.name} 已一键分配到 ${nextWorkspaceIds.length} 个设备`);
  }, [availableWorkspaceOptions, deploymentState, employee, onAttachEmployeeToDevice]);

  const handleRemoveWorkspace = useCallback(
    (workspaceId: string): void => {
      onDetachEmployeeFromDevice(employee.id, workspaceId);
      setAccessDraftsByWorkspaceId(prev => {
        const nextState = { ...prev };
        delete nextState[workspaceId];
        return nextState;
      });
      setSelectedAccessWorkspaceId(current =>
        current === workspaceId
          ? assignedWorkspaceIds.find(item => item !== workspaceId) ?? null
          : current,
      );
      message.success(`${employee.name} 已从该设备移除`);
    },
    [assignedWorkspaceIds, employee.id, employee.name, onDetachEmployeeFromDevice],
  );

  const handleSaveDeviceAccess = useCallback((): void => {
    if (!selectedAccessWorkspaceId || !selectedAccessState) {
      message.warning("请先选择要配置权限的设备");
      return;
    }

    onUpdateDeviceAccess(
      employee.id,
      selectedAccessWorkspaceId,
      selectedAccessState.visibility,
      selectedAccessState.boundMembers,
    );
    message.success(`${employee.name} 设备权限已更新`);
  }, [employee.id, employee.name, onUpdateDeviceAccess, selectedAccessState, selectedAccessWorkspaceId]);

  const handleChangeAccessVisibility = useCallback((nextVisibility: EmployeeVisibility): void => {
    if (!selectedAccessWorkspaceId) {
      return;
    }

    setAccessDraftsByWorkspaceId(prev => ({
      ...prev,
      [selectedAccessWorkspaceId]: {
        ...(prev[selectedAccessWorkspaceId] ?? {
          boundMembers: [],
          visibility: employee.visibility,
        }),
        visibility: nextVisibility,
      },
    }));
  }, [employee.visibility, selectedAccessWorkspaceId]);

  const handleChangeAccessMembers = useCallback((nextMembers: string[]): void => {
    if (!selectedAccessWorkspaceId) {
      return;
    }

    setAccessDraftsByWorkspaceId(prev => ({
      ...prev,
      [selectedAccessWorkspaceId]: {
        ...(prev[selectedAccessWorkspaceId] ?? {
          boundMembers: [],
          visibility: employee.visibility,
        }),
        boundMembers: nextMembers,
      },
    }));
  }, [employee.visibility, selectedAccessWorkspaceId]);

  const handleModelChange = useCallback(
    (model: string): void => {
      if (!isAssigned) {
        message.warning("请先绑定设备");
        return;
      }

      setSelectedModel(model);
      onUpdateModel(employee.id, model);
      message.success(`${employee.name} 模型已切换为 ${model}`);
    },
    [employee.id, employee.name, isAssigned, onUpdateModel],
  );

  const handleUpgrade = useCallback((): void => {
    if (!versionInfo.newVersion) {
      return;
    }

    setCurrentVersion(versionInfo.newVersion);
    setVersionIgnored(false);
    message.success(`${employee.name} 已升级到 ${versionInfo.newVersion}`);
  }, [employee.name, versionInfo.newVersion]);

  const handleIgnoreVersion = useCallback((): void => {
    setVersionIgnored(true);
    message.info("已忽略本次升级提醒");
  }, []);

  return (
    <div className={styles.expertConfigPanel}>
      <div className={styles.expertConfigPanelHeader}>
        <Avatar src={employee.avatarUrl} size={44}>
          {employee.name.slice(0, 1)}
        </Avatar>
        <div className={styles.expertConfigPanelIdentity}>
          <div className={styles.simpleExpertTitleRow}>
            <span className={styles.simpleExpertName}>{employee.name}</span>
            <span className={getVersionTagClassName(hasNewVersion)}>
              {hasNewVersion ? `待升级至 ${versionInfo.newVersion}` : `当前 ${currentVersion}`}
            </span>
            <span className={getDeployTagClassName(isAssigned)}>
              {isAssigned ? `已分配 ${assignedWorkspaceIds.length} 个设备` : "待分配"}
            </span>
          </div>
          <p className={styles.simpleExpertRole}>{employee.role}</p>
        </div>
      </div>

      <div className={styles.expertConfigPanelSection}>
        <div className={styles.deviceWorkspaceLayout}>
          <section className={styles.deviceWorkspacePanel}>
            <div className={styles.deviceWorkspacePanelHeader}>
              <div className={styles.deviceWorkspacePanelHead}>
                <span className={styles.simpleExpertBlockLabel}>设备分配</span>
                <span className={styles.simpleExpertHint}>
                  一个 AI 专家可以同时分配到多个设备。先在左侧完成设备分配，再切换右侧管理该设备上的权限。
                </span>
              </div>
              <Button
                size="small"
                disabled={!availableWorkspaceOptions.length}
                onClick={handleAttachAllWorkspaces}
              >
                一键全部分配
              </Button>
            </div>
            <div className={styles.deviceBindingActions}>
              <Select
                className={adminStyles.consoleControl}
                placeholder="选择要新增分配的设备"
                size="small"
                value={draftWorkspaceId}
                onChange={value => setDraftWorkspaceId(value)}
                options={availableWorkspaceOptions}
              />
              <Button
                size="small"
                type="primary"
                disabled={!availableWorkspaceOptions.length}
                onClick={handleAttachWorkspaceClick}
              >
                新增分配
              </Button>
            </div>
            {assignedWorkspaceEntries.length ? (
              <div className={styles.assignedWorkspaceList}>
                {assignedWorkspaceEntries.map(({ ownerName, permissionLabel, workspace }) => (
                  <div
                    key={workspace.id}
                    className={`${styles.assignedWorkspaceCard} ${
                      selectedAccessWorkspaceId === workspace.id ? styles.assignedWorkspaceCardActive : ""
                    }`}
                  >
                    <button
                      type="button"
                      className={styles.assignedWorkspaceMain}
                      onClick={() => setSelectedAccessWorkspaceId(workspace.id)}
                    >
                      <div className={styles.assignedWorkspaceHeader}>
                        <span className={styles.assignedWorkspaceName}>{workspace.name}</span>
                        <span className={styles.assignedWorkspacePermission}>{permissionLabel}</span>
                      </div>
                      <span className={styles.assignedWorkspaceMeta}>
                        {ownerName ? `设备拥有者：${ownerName}` : "暂未设置设备拥有者"}
                      </span>
                    </button>
                    <Button size="small" danger onClick={() => handleRemoveWorkspace(workspace.id)}>
                      移除
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.deviceWorkspaceEmpty}>
                还没有分配设备。你可以先新增单个设备，或者直接一键分配到全部设备。
              </div>
            )}
          </section>

          <section className={styles.deviceWorkspacePanel}>
            <div className={styles.deviceWorkspacePanelHeader}>
              <div className={styles.deviceWorkspacePanelHead}>
                <span className={styles.simpleExpertBlockLabel}>权限管理</span>
                <span className={styles.simpleExpertHint}>
                  权限始终按当前选中设备生效，不同设备可以配置不同的可用范围。
                </span>
              </div>
            </div>
            {selectedWorkspaceEntry ? (
              <>
                <div className={styles.devicePermissionCard}>
                  <div className={styles.devicePermissionHeader}>
                    <div className={styles.devicePermissionIdentity}>
                      <span className={styles.devicePermissionName}>
                        {selectedWorkspaceEntry.workspace.name}
                      </span>
                      <span className={styles.devicePermissionMeta}>
                        {selectedWorkspaceEntry.workspace.region}
                        {selectedWorkspaceEntry.ownerName
                          ? ` · 设备拥有者：${selectedWorkspaceEntry.ownerName}`
                          : " · 暂未设置设备拥有者"}
                      </span>
                    </div>
                    <span className={styles.devicePermissionStatus}>
                      {selectedWorkspaceEntry.permissionLabel}
                    </span>
                  </div>

                  <div className={styles.devicePermissionControls}>
                    <Radio.Group
                      value={selectedAccessState?.visibility}
                      disabled={!selectedAccessWorkspaceId}
                      onChange={event => handleChangeAccessVisibility(event.target.value)}
                      size="small"
                    >
                      <Radio value="all">全公司可用</Radio>
                      <Radio value="bound">指定员工可用</Radio>
                    </Radio.Group>
                    {selectedAccessState?.visibility === "bound" ? (
                      <Select
                        className={adminStyles.consoleControl}
                        mode="multiple"
                        placeholder="选择额外可使用成员"
                        size="small"
                        disabled={!selectedAccessWorkspaceId}
                        value={selectedAccessState.boundMembers}
                        onChange={handleChangeAccessMembers}
                        options={memberNames.map(name => ({ label: name, value: name }))}
                      />
                    ) : null}
                  </div>

                  <div className={styles.devicePermissionPreview}>
                    <span className={styles.devicePermissionPreviewLabel}>可用成员预览</span>
                    {selectedAccessState?.visibility === "all" ? (
                      <span className={styles.simpleExpertHint}>
                        当前设备中的该 Agent 对全公司成员开放。
                      </span>
                    ) : selectedEffectiveMembers.length ? (
                      <div className={styles.devicePermissionMembers}>
                        {selectedEffectiveMembers.map(name => (
                          <span key={name} className={styles.devicePermissionMember}>
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.simpleExpertHint}>当前还没有可用成员。</span>
                    )}
                    <span className={styles.simpleExpertHint}>{selectedAccessSummary}</span>
                    {selectedOwnerName ? (
                      <span className={styles.simpleExpertHint}>
                        设备拥有者 {selectedOwnerName} 默认拥有该设备中的 Agent 可用权限。
                      </span>
                    ) : null}
                  </div>

                  <div className={adminStyles.consoleActions}>
                    <Button
                      size="small"
                      type="primary"
                      disabled={!selectedAccessWorkspaceId}
                      onClick={handleSaveDeviceAccess}
                    >
                      保存权限
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.deviceWorkspaceEmpty}>
                请先在左侧选择一个已分配设备，再配置当前设备上的 Agent 权限。
              </div>
            )}
          </section>
        </div>
      </div>

      <div className={styles.expertConfigPanelSection}>
        <div className={styles.simpleExpertBlock}>
          <span className={styles.simpleExpertBlockLabel}>模型配置</span>
          {hasAnyProvider ? (
            <>
              <Select
                className={adminStyles.consoleControl}
                placeholder="选择大模型"
                size="small"
                disabled={!isAssigned}
                value={selectedModel || undefined}
                onChange={handleModelChange}
                options={allModelOptions}
              />
              <span className={styles.simpleExpertHint}>当前生效模型：{selectedModel}</span>
              {!isAssigned ? (
                <span className={styles.simpleExpertHint}>设备未绑定前，模型配置不会生效。</span>
              ) : null}
            </>
          ) : (
            <>
              <span className={styles.simpleExpertHint}>
                暂无可用大模型，请先完成管理员模型配置。
              </span>
              <div className={adminStyles.consoleActions}>
                <Button size="small" onClick={() => onNavigateToTab("models")}>
                  前往模型配置
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.expertConfigPanelSection}>
        <div className={styles.simpleExpertBlock}>
          <span className={styles.simpleExpertBlockLabel}>版本处理</span>
          <span className={styles.simpleExpertHint}>
            当前版本 {currentVersion}
            {versionInfo.newVersion ? ` / 最新版本 ${versionInfo.newVersion}` : ""}
          </span>
          <div className={adminStyles.consoleActions}>
            <Button size="small" onClick={() => setIsVersionDiffOpen(true)}>
              查看差异
            </Button>
            {hasNewVersion ? (
              <>
                <Button size="small" type="primary" onClick={handleUpgrade}>
                  接受升级
                </Button>
                <Button size="small" onClick={handleIgnoreVersion}>
                  忽略升级
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Modal
        cancelText="关闭"
        footer={null}
        open={isVersionDiffOpen}
        title={`${employee.name} 版本差异`}
        onCancel={() => setIsVersionDiffOpen(false)}
      >
        <div className={styles.upgradeModal}>
          <div className={styles.upgradeInfo}>
            <Avatar src={employee.avatarUrl} size={48}>
              {employee.name.slice(0, 1)}
            </Avatar>
            <div>
              <p className={styles.upgradeName}>{employee.name}</p>
              <p className={styles.upgradeVersions}>
                当前版本 <strong>{currentVersion}</strong>
                {versionInfo.newVersion ? (
                  <>
                    {" "}
                    → 最新版本 <span className={styles.upgradeNewVersion}>{versionInfo.newVersion}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className={styles.upgradeNotes}>
            <p className={styles.upgradeNotesTitle}>本次版本差异</p>
            {(versionInfo.updateNotes ?? ["当前版本暂无额外差异说明。"]).map(note => (
              <p key={note} className={styles.upgradeNoteItem}>
                <CheckCircleOutlined className={styles.upgradeCheckIcon} />
                {note}
              </p>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
