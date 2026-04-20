import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Avatar, Button, Radio, Select, Tabs, TreeSelect, message } from "antd";

import {
  buildAccessScopeSubjectLookup,
  buildAccessScopeSummary,
  buildOrganizationTree,
  normalizeAccessScopeSubjects,
} from "@/utils/organizationAccess";
import type {
  AccessScopeSubject,
  EmployeeItem,
  EmployeeVisibility,
  FrontisWebTabKey,
  FrontisWebUserItem,
  OrganizationDepartmentItem,
  OrganizationTreeNode,
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
import { getExpertAssetMeta } from "./expertAssetMeta";
import {
  doesExpertRequireDeviceBinding,
  getExpertAccessScopeSummary,
  getEffectiveMembersForDeviceAccess,
  getPendingPermissionWorkspaceIdsForExpert,
  getAssignedWorkspaceIdsForExpert,
  getDeviceAccessStateForExpert,
  isDeviceAccessConfigured,
  isExpertAccessConfigured,
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
  "employee-architect": {
    version: "v1.4",
    newVersion: "v1.5",
    updateNotes: ["补充架构约束检查项", "新增模块依赖说明模板"],
  },
  "employee-growth": {
    version: "v1.2",
    newVersion: "v1.3",
    updateNotes: ["新增漏斗实验模板", "补充首屏转化指标口径"],
  },
  "employee-qa": {
    version: "v1.1",
    newVersion: "v1.2",
    updateNotes: ["新增回归范围分层建议", "补充上线前验收卡点"],
  },
  "employee-data": {
    version: "v1.3",
    newVersion: "v1.4",
    updateNotes: ["补充看板指标字典", "新增异常波动解释模板"],
  },
  "employee-user-researcher": {
    version: "v1.2",
    newVersion: "v1.3",
    updateNotes: ["新增访谈纪要结构化输出", "补充用户痛点优先级对比视图"],
  },
  "employee-local-ops": { version: "v1.1" },
};

type ExpertConfigTabKey = "workspaceAccess" | "modelConfig" | "versionControl";

interface AgentStoreTeamDetailProps {
  deploymentByEmployeeId: Record<string, ExpertDeploymentState>;
  deviceOwners: Record<string, string | null>;
  detailTitle: string;
  employees: EmployeeItem[];
  organizationDepartments: OrganizationDepartmentItem[];
  onBack: () => void;
  onAttachEmployeeToDevice: (employeeId: string, workspaceId: string) => void;
  onDetachEmployeeFromDevice: (employeeId: string, workspaceId: string) => void;
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateDeviceAccess: (
    employeeId: string,
    workspaceId: string,
    visibility: EmployeeVisibility,
    accessScopeSubjects: AccessScopeSubject[],
  ) => void;
  onUpdateModel: (employeeId: string, model: string) => void;
  users: FrontisWebUserItem[];
  workspaces: WorkspaceItem[];
}

type OrganizationTreeValue = `${"company" | "department" | "user"}:${string}`;
interface OrganizationTreeSelectNode {
  children?: OrganizationTreeSelectNode[];
  key: OrganizationTreeValue;
  title: string;
  value: OrganizationTreeValue;
}

const toTreeValue = (
  subjectType: AccessScopeSubject["subjectType"],
  subjectId: string,
): OrganizationTreeValue => `${subjectType}:${subjectId}`;

const mapTreeNodesToSelectData = (nodes: OrganizationTreeNode[]): OrganizationTreeSelectNode[] =>
  nodes.map(node => ({
    children: node.children ? mapTreeNodesToSelectData(node.children) : undefined,
    key: toTreeValue(node.type, node.id),
    title: node.name,
    value: toTreeValue(node.type, node.id),
  }));

const getVersionTagClassName = (hasNewVersion: boolean): string =>
  hasNewVersion
    ? `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagWarning}`
    : `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagSuccess}`;

const getDeployTagClassName = (isAssigned: boolean): string =>
  isAssigned
    ? `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagSuccess}`
    : `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagWarning}`;

const getDeviceConfiguredLabel = (
  employee: EmployeeItem,
  deploymentState?: ExpertDeploymentState,
): string => {
  const assignedWorkspaceIds = getAssignedWorkspaceIdsForExpert(employee, deploymentState);

  if (!assignedWorkspaceIds.length) {
    return "待绑定设备";
  }

  const pendingPermissionWorkspaceIds = getPendingPermissionWorkspaceIdsForExpert(
    employee,
    deploymentState,
  );

  if (!pendingPermissionWorkspaceIds.length) {
    return `已配置 ${assignedWorkspaceIds.length} 台设备`;
  }

  return pendingPermissionWorkspaceIds.length === assignedWorkspaceIds.length
    ? "待分配权限"
    : `待分配权限 ${pendingPermissionWorkspaceIds.length} 台`;
};

/**
 * AI 专家详情视图。
 */
export const AgentStoreTeamDetail = ({
  deploymentByEmployeeId,
  deviceOwners,
  detailTitle,
  employees,
  organizationDepartments,
  onBack,
  onAttachEmployeeToDevice,
  onDetachEmployeeFromDevice,
  onNavigateToTab,
  onUpdateDeviceAccess,
  onUpdateModel,
  users,
  workspaces,
}: AgentStoreTeamDetailProps): JSX.Element => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    employees[0]?.id ?? null,
  );
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
                const requiresDeviceBinding = doesExpertRequireDeviceBinding(employee);
                const isConfigured = isExpertAccessConfigured(
                  employee,
                  deploymentByEmployeeId[employee.id],
                );
                const assetMeta = getExpertAssetMeta(employee);
                const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? { version: "v1.0" };
                const hasNewVersion =
                  assetMeta.source === "purchased" &&
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
                          {requiresDeviceBinding
                            ? getDeviceConfiguredLabel(
                                employee,
                                deploymentByEmployeeId[employee.id],
                              )
                            : getExpertAccessScopeSummary(
                                employee.visibility,
                                employee.accessScopeSubjects,
                              )}
                        </span>
                      </div>
                    </div>
                    <p className={styles.detailAgentRailSummary}>{employee.summary}</p>
                    <div className={styles.detailAgentRailTags}>
                      <span className={getDeployTagClassName(isConfigured)}>
                        {isConfigured
                          ? "已配置"
                          : requiresDeviceBinding
                            ? getDeviceConfiguredLabel(
                                employee,
                                deploymentByEmployeeId[employee.id],
                              )
                            : "待分配权限"}
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
                organizationDepartments={organizationDepartments}
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
  organizationDepartments: OrganizationDepartmentItem[];
  onAttachEmployeeToDevice: (employeeId: string, workspaceId: string) => void;
  onDetachEmployeeFromDevice: (employeeId: string, workspaceId: string) => void;
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateDeviceAccess: (
    employeeId: string,
    workspaceId: string,
    visibility: EmployeeVisibility,
    accessScopeSubjects: AccessScopeSubject[],
  ) => void;
  onUpdateModel: (employeeId: string, model: string) => void;
  users: FrontisWebUserItem[];
  workspaces: WorkspaceItem[];
}

const ExpertConfigPanel = ({
  deploymentState,
  deviceOwners,
  employee,
  organizationDepartments,
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
  const [activeTabKey, setActiveTabKey] = useState<ExpertConfigTabKey>("workspaceAccess");
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
  const [permissionAccessDraft, setPermissionAccessDraft] = useState<ExpertDeviceAccessState>(
    () => ({
      accessScopeSubjects: [...employee.accessScopeSubjects],
      visibility: employee.visibility,
    }),
  );
  const organizationTreeData = useMemo(
    () => mapTreeNodesToSelectData(buildOrganizationTree(organizationDepartments, users)),
    [organizationDepartments, users],
  );
  const accessScopeSubjectLookup = useMemo(
    () => buildAccessScopeSubjectLookup(organizationDepartments, users),
    [organizationDepartments, users],
  );
  const normalizeTreeValuesToSubjects = useCallback(
    (
      nextValues: Array<OrganizationTreeValue | { value: OrganizationTreeValue }>,
    ): AccessScopeSubject[] =>
      normalizeAccessScopeSubjects(
        nextValues
          .map(item => {
            const nextValue = typeof item === "string" ? item : item.value;
            return accessScopeSubjectLookup[nextValue] ?? null;
          })
          .filter((item): item is AccessScopeSubject => Boolean(item)),
        organizationDepartments,
      ),
    [accessScopeSubjectLookup, organizationDepartments],
  );
  const [versionIgnored, setVersionIgnored] = useState<boolean>(false);
  const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? { version: "v1.0" };
  const [currentVersion, setCurrentVersion] = useState<string>(versionInfo.version);
  const requiresDeviceBinding = doesExpertRequireDeviceBinding(employee);
  const isAssigned = assignedWorkspaceIds.length > 0;
  const canConfigureModel = requiresDeviceBinding ? isAssigned : true;
  const assetMeta = getExpertAssetMeta(employee);
  const requiresUpgradeConfirmation = assetMeta.source === "purchased";
  const latestVersion = versionInfo.newVersion ?? versionInfo.version;
  const effectiveVersion = requiresUpgradeConfirmation ? currentVersion : latestVersion;

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
      current && assignedWorkspaceIds.includes(current)
        ? current
        : (assignedWorkspaceIds[0] ?? null),
    );
  }, [assignedWorkspaceIds, deploymentState, employee]);

  useEffect(() => {
    setPermissionAccessDraft({
      accessScopeSubjects: [...employee.accessScopeSubjects],
      visibility: employee.visibility,
    });
  }, [employee]);

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
    requiresUpgradeConfirmation &&
    Boolean(versionInfo.newVersion) &&
    currentVersion !== versionInfo.newVersion &&
    !versionIgnored;
  const permissionAccessSummary = getExpertAccessScopeSummary(
    permissionAccessDraft.visibility,
    permissionAccessDraft.accessScopeSubjects,
  );
  const modelStatusLabel = hasAnyProvider ? selectedModel : "待配置";
  const modelStatusHint = hasAnyProvider
    ? canConfigureModel
      ? "当前生效模型"
      : "绑定设备后生效"
    : "需先完成管理员模型配置";
  const versionStatusLabel = hasNewVersion
    ? `待升级至 ${versionInfo.newVersion}`
    : `当前 ${effectiveVersion}`;

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

  const assignedWorkspaceEntries = useMemo(
    () =>
      assignedWorkspaces.map(workspace => {
        const ownerId = deviceOwners[workspace.id] ?? null;
        const ownerName = ownerId ? (users.find(user => user.id === ownerId)?.name ?? null) : null;
        const accessState =
          accessDraftsByWorkspaceId[workspace.id] ??
          getDeviceAccessStateForExpert(employee, workspace.id, deploymentState);

        return {
          accessState,
          ownerName,
          workspace,
        };
      }),
    [accessDraftsByWorkspaceId, assignedWorkspaces, deploymentState, deviceOwners, employee, users],
  );
  const selectedAccessWorkspace = useMemo(
    () =>
      selectedAccessWorkspaceId
        ? (workspaces.find(workspace => workspace.id === selectedAccessWorkspaceId) ?? null)
        : null,
    [selectedAccessWorkspaceId, workspaces],
  );
  const selectedAccessOwnerId = selectedAccessWorkspaceId
    ? (deviceOwners[selectedAccessWorkspaceId] ?? null)
    : null;
  const selectedAccessOwnerName = selectedAccessOwnerId
    ? (users.find(user => user.id === selectedAccessOwnerId)?.name ?? null)
    : null;
  const selectedEffectiveMembers = useMemo(() => {
    if (!selectedAccessState) {
      return [];
    }

    return getEffectiveMembersForDeviceAccess(
      selectedAccessState,
      selectedAccessOwnerId,
      users,
      organizationDepartments,
    );
  }, [organizationDepartments, selectedAccessOwnerId, selectedAccessState, users]);
  const permissionTreeValues = useMemo(
    () =>
      permissionAccessDraft.accessScopeSubjects.map(subject => ({
        label: subject.subjectName,
        value: toTreeValue(subject.subjectType, subject.subjectId),
      })),
    [permissionAccessDraft.accessScopeSubjects],
  );
  const selectedAccessTreeValues = useMemo(
    () =>
      selectedAccessState
        ? selectedAccessState.accessScopeSubjects.map(subject => ({
            label: subject.subjectName,
            value: toTreeValue(subject.subjectType, subject.subjectId),
          }))
        : [],
    [selectedAccessState],
  );

  const handleAttachWorkspaceClick = useCallback((): void => {
    if (!draftWorkspaceId) {
      message.warning("请先选择要绑定的设备");
      return;
    }

    onAttachEmployeeToDevice(employee.id, draftWorkspaceId);
    setAccessDraftsByWorkspaceId(prev => ({
      ...prev,
      [draftWorkspaceId]: requiresDeviceBinding
        ? {
            accessScopeSubjects: [],
            visibility: "bound",
          }
        : getDeviceAccessStateForExpert(employee, draftWorkspaceId, deploymentState),
    }));
    setSelectedAccessWorkspaceId(draftWorkspaceId);
    setDraftWorkspaceId(undefined);
    message.success(`${employee.name} 已新增到该设备`);
  }, [
    deploymentState,
    draftWorkspaceId,
    employee,
    onAttachEmployeeToDevice,
    requiresDeviceBinding,
  ]);

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
          requiresDeviceBinding
            ? {
                accessScopeSubjects: [],
                visibility: "bound" as const,
              }
            : getDeviceAccessStateForExpert(employee, workspaceId, deploymentState),
        ]),
      ),
    }));
    setSelectedAccessWorkspaceId(nextWorkspaceIds[0] ?? null);
    setDraftWorkspaceId(undefined);
    message.success(`${employee.name} 已一键分配到 ${nextWorkspaceIds.length} 个设备`);
  }, [
    availableWorkspaceOptions,
    deploymentState,
    employee,
    onAttachEmployeeToDevice,
    requiresDeviceBinding,
  ]);

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
          ? (assignedWorkspaceIds.find(item => item !== workspaceId) ?? null)
          : current,
      );
      message.success(`${employee.name} 已从该设备移除`);
    },
    [assignedWorkspaceIds, employee.id, employee.name, onDetachEmployeeFromDevice],
  );

  const handleSaveExpertAccess = useCallback((): void => {
    if (!requiresDeviceBinding) {
      onUpdateDeviceAccess(
        employee.id,
        employee.workspaceId,
        permissionAccessDraft.visibility,
        permissionAccessDraft.accessScopeSubjects,
      );
      message.success(`${employee.name} 权限已更新`);
      return;
    }

    if (!selectedAccessWorkspaceId || !selectedAccessState) {
      message.warning("请先选择要配置权限的设备");
      return;
    }

    onUpdateDeviceAccess(
      employee.id,
      selectedAccessWorkspaceId,
      selectedAccessState.visibility,
      selectedAccessState.accessScopeSubjects,
    );
    message.success(`${employee.name} 设备权限已更新`);
  }, [
    employee.id,
    employee.name,
    employee.workspaceId,
    onUpdateDeviceAccess,
    permissionAccessDraft.accessScopeSubjects,
    permissionAccessDraft.visibility,
    requiresDeviceBinding,
    selectedAccessState,
    selectedAccessWorkspaceId,
  ]);

  const handleChangeAccessVisibility = useCallback(
    (nextVisibility: EmployeeVisibility): void => {
      if (!requiresDeviceBinding) {
        setPermissionAccessDraft(prev => ({
          ...prev,
          visibility: nextVisibility,
        }));
        return;
      }

      if (!selectedAccessWorkspaceId) {
        return;
      }

      setAccessDraftsByWorkspaceId(prev => ({
        ...prev,
        [selectedAccessWorkspaceId]: {
          ...(prev[selectedAccessWorkspaceId] ?? {
            accessScopeSubjects: [],
            visibility: employee.visibility,
          }),
          visibility: nextVisibility,
        },
      }));
    },
    [employee.visibility, requiresDeviceBinding, selectedAccessWorkspaceId],
  );

  const handleChangeAccessSubjects = useCallback(
    (nextSubjects: Array<OrganizationTreeValue | { value: OrganizationTreeValue }>): void => {
      const normalizedSubjects = normalizeTreeValuesToSubjects(nextSubjects);

      if (!requiresDeviceBinding) {
        setPermissionAccessDraft(prev => ({
          ...prev,
          accessScopeSubjects: normalizedSubjects,
        }));
        return;
      }

      if (!selectedAccessWorkspaceId) {
        return;
      }

      setAccessDraftsByWorkspaceId(prev => ({
        ...prev,
        [selectedAccessWorkspaceId]: {
          ...(prev[selectedAccessWorkspaceId] ?? {
            accessScopeSubjects: [],
            visibility: employee.visibility,
          }),
          accessScopeSubjects: normalizedSubjects,
        },
      }));
    },
    [
      employee.visibility,
      normalizeTreeValuesToSubjects,
      requiresDeviceBinding,
      selectedAccessWorkspaceId,
    ],
  );

  const handleModelChange = useCallback(
    (model: string): void => {
      if (requiresDeviceBinding && !isAssigned) {
        message.warning("请先绑定设备");
        return;
      }

      setSelectedModel(model);
      onUpdateModel(employee.id, model);
      message.success(`${employee.name} 模型已切换为 ${model}`);
    },
    [employee.id, employee.name, isAssigned, onUpdateModel, requiresDeviceBinding],
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
  const handleTabChange = useCallback((nextTabKey: string): void => {
    if (
      nextTabKey === "workspaceAccess" ||
      nextTabKey === "modelConfig" ||
      nextTabKey === "versionControl"
    ) {
      setActiveTabKey(nextTabKey);
    }
  }, []);

  return (
    <div className={styles.expertConfigPanel}>
      <div className={styles.expertConfigPanelHeader}>
        <Avatar className={styles.expertConfigPanelAvatar} src={employee.avatarUrl} size={52}>
          {employee.name.slice(0, 1)}
        </Avatar>
        <div className={styles.expertConfigPanelIdentity}>
          <div className={styles.simpleExpertTitleRow}>
            <span className={styles.simpleExpertName}>{employee.name}</span>
          </div>
          <p className={styles.simpleExpertRole}>{employee.role}</p>
          <div className={styles.expertConfigMetaRow}>
            <span className={styles.expertConfigMetaItem}>
              <span className={styles.expertConfigMetaLabel}>来源</span>
              <span className={styles.expertConfigMetaValue}>{assetMeta.sourceLabel}</span>
            </span>
            <span className={styles.expertConfigMetaItem}>
              <span className={styles.expertConfigMetaLabel}>{assetMeta.ownerLabel}</span>
              <span className={styles.expertConfigMetaValue}>{assetMeta.ownerName}</span>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.expertConfigSummaryGrid}>
        <div className={styles.expertConfigSummaryCard}>
          <span className={styles.expertConfigSummaryLabel}>当前模型</span>
          <span className={styles.expertConfigSummaryValue}>{modelStatusLabel}</span>
          <span className={styles.expertConfigSummaryHint}>{modelStatusHint}</span>
        </div>
        <div className={styles.expertConfigSummaryCard}>
          <span className={styles.expertConfigSummaryLabel}>版本状态</span>
          <span className={getVersionTagClassName(hasNewVersion)}>{versionStatusLabel}</span>
          <span className={styles.expertConfigSummaryHint}>
            {hasNewVersion ? "可在版本处理里查看更新说明" : "当前版本已生效"}
          </span>
        </div>
      </div>

      <Tabs
        size="small"
        className={styles.expertConfigTabs}
        activeKey={activeTabKey}
        items={[
          { key: "workspaceAccess", label: "权限管理" },
          { key: "modelConfig", label: "模型配置" },
          { key: "versionControl", label: "版本处理" },
        ]}
        onChange={handleTabChange}
      />

      {activeTabKey === "workspaceAccess" ? (
        <div className={styles.expertConfigTabPanel}>
          {requiresDeviceBinding ? (
            <div className={styles.expertConfigSinglePanel}>
              <div className={styles.deviceWorkspaceLayout}>
                <div className={styles.deviceWorkspacePanel}>
                  <div className={styles.deviceWorkspacePanelHeader}>
                    <div className={styles.deviceWorkspacePanelHead}>
                      <span className={styles.simpleExpertBlockLabel}>设备分配</span>
                      <span className={styles.simpleExpertHint}>
                        先绑定设备，再为当前选中设备配置可用范围。
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
                      {assignedWorkspaceEntries.map(({ accessState, ownerName, workspace }) => {
                        const isCurrentWorkspace = selectedAccessWorkspaceId === workspace.id;
                        const isWorkspaceConfigured = isDeviceAccessConfigured(accessState);
                        const effectiveMembers = getEffectiveMembersForDeviceAccess(
                          accessState,
                          deviceOwners[workspace.id] ?? null,
                          users,
                          organizationDepartments,
                        );

                        return (
                          <div
                            key={`${workspace.id}-access`}
                            className={`${styles.assignedWorkspaceCard} ${
                              isCurrentWorkspace ? styles.assignedWorkspaceCardActive : ""
                            }`}
                          >
                            <button
                              type="button"
                              className={styles.assignedWorkspaceMain}
                              onClick={() => setSelectedAccessWorkspaceId(workspace.id)}
                            >
                              <div className={styles.assignedWorkspaceHeader}>
                                <span className={styles.assignedWorkspaceName}>
                                  {workspace.name}
                                </span>
                                <span className={styles.assignedWorkspacePermission}>
                                  {isWorkspaceConfigured ? "权限已配置" : "待分配权限"}
                                </span>
                              </div>
                              <span className={styles.assignedWorkspaceMeta}>
                                {ownerName ? `设备拥有者：${ownerName}` : "暂未设置设备拥有者"}
                              </span>
                              <span className={styles.assignedWorkspaceMeta}>
                                {accessState.visibility === "all"
                                  ? "当前对全公司开放"
                                  : effectiveMembers.length
                                    ? `当前组织范围：${buildAccessScopeSummary(accessState.accessScopeSubjects)}`
                                    : "当前尚未配置组织范围"}
                              </span>
                            </button>
                            <Button
                              size="small"
                              danger
                              onClick={() => handleRemoveWorkspace(workspace.id)}
                            >
                              移除
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.deviceWorkspaceEmpty}>
                      当前还没有绑定设备。你可以先新增单个设备，或者直接一键分配到全部设备。
                    </div>
                  )}
                </div>

                <div className={styles.deviceWorkspacePanel}>
                  <div className={styles.deviceWorkspacePanelHead}>
                    <span className={styles.simpleExpertBlockLabel}>设备权限</span>
                    <span className={styles.simpleExpertHint}>
                      设备拥有者默认可用，其余成员按组织范围生效。
                    </span>
                  </div>
                  {selectedAccessWorkspace && selectedAccessState ? (
                    <div className={styles.devicePermissionCard}>
                      <div className={styles.devicePermissionHeader}>
                        <div className={styles.devicePermissionIdentity}>
                          <span className={styles.devicePermissionName}>
                            {selectedAccessWorkspace.name}
                          </span>
                          <span className={styles.devicePermissionMeta}>
                            {selectedAccessOwnerName
                              ? `设备拥有者：${selectedAccessOwnerName}`
                              : "暂未设置设备拥有者"}
                          </span>
                          <span className={styles.devicePermissionMeta}>
                            {selectedAccessState.visibility === "all"
                              ? "当前对全公司开放"
                              : selectedEffectiveMembers.length
                                ? `当前组织范围：${buildAccessScopeSummary(selectedAccessState.accessScopeSubjects)}`
                                : "当前尚未配置组织范围"}
                          </span>
                        </div>
                        <span className={styles.devicePermissionStatus}>
                          {isDeviceAccessConfigured(selectedAccessState)
                            ? "已配置权限"
                            : "待分配权限"}
                        </span>
                      </div>

                      <div className={styles.devicePermissionControls}>
                        <Radio.Group
                          value={selectedAccessState.visibility}
                          onChange={event => handleChangeAccessVisibility(event.target.value)}
                          size="small"
                        >
                          <Radio value="all">全公司可用</Radio>
                          <Radio value="bound">按组织范围配置</Radio>
                        </Radio.Group>
                        {selectedAccessState.visibility === "bound" ? (
                          <TreeSelect
                            className={adminStyles.consoleControl}
                            treeCheckable={true}
                            treeCheckStrictly={true}
                            showCheckedStrategy={TreeSelect.SHOW_PARENT}
                            placeholder="选择当前设备可使用的组织范围"
                            size="small"
                            value={selectedAccessTreeValues}
                            onChange={value =>
                              handleChangeAccessSubjects(Array.isArray(value) ? value : [])
                            }
                            treeData={organizationTreeData}
                            allowClear={true}
                            showSearch={true}
                          />
                        ) : null}
                      </div>

                      <span className={styles.simpleExpertHint}>
                        {selectedAccessState.visibility === "all"
                          ? "保存后该设备上的此 AI 专家将对全公司开放。"
                          : selectedAccessState.accessScopeSubjects.length
                            ? `保存后该设备将开放给 ${buildAccessScopeSummary(selectedAccessState.accessScopeSubjects)}${selectedAccessOwnerName ? "，设备拥有者默认可用。" : "。"}`
                            : selectedAccessOwnerName
                              ? "当前还没有配置组织范围；保存后仅设备拥有者默认可使用。"
                              : "当前还没有配置组织范围，且该设备尚未设置拥有者。"}
                      </span>

                      <div className={adminStyles.consoleActions}>
                        <Button size="small" type="primary" onClick={handleSaveExpertAccess}>
                          保存当前设备权限
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.deviceWorkspaceEmpty}>
                      请先完成设备分配，再为当前设备配置可用权限。
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.expertConfigSinglePanel}>
              <div className={styles.simpleExpertBlock}>
                <span className={styles.simpleExpertBlockLabel}>可用范围</span>
                <span className={styles.simpleExpertHint}>
                  该 AI 专家不依赖设备绑定，直接配置可用范围即可生效。
                </span>
                <div className={styles.devicePermissionControls}>
                  <Radio.Group
                    value={permissionAccessDraft.visibility}
                    onChange={event => handleChangeAccessVisibility(event.target.value)}
                    size="small"
                  >
                    <Radio value="all">全公司可用</Radio>
                    <Radio value="bound">按组织范围配置</Radio>
                  </Radio.Group>
                  {permissionAccessDraft.visibility === "bound" ? (
                    <TreeSelect
                      className={adminStyles.consoleControl}
                      treeCheckable={true}
                      treeCheckStrictly={true}
                      showCheckedStrategy={TreeSelect.SHOW_PARENT}
                      placeholder="选择可使用的组织范围"
                      size="small"
                      value={permissionTreeValues}
                      onChange={value =>
                        handleChangeAccessSubjects(Array.isArray(value) ? value : [])
                      }
                      treeData={organizationTreeData}
                      allowClear={true}
                      showSearch={true}
                    />
                  ) : null}
                </div>
                <span className={styles.simpleExpertHint}>
                  {permissionAccessDraft.visibility === "all"
                    ? "保存后将对全公司成员开放。"
                    : permissionAccessDraft.accessScopeSubjects.length
                      ? `保存后将开放给 ${permissionAccessSummary}。`
                      : "当前尚未选择任何组织范围。"}
                </span>
                <div className={adminStyles.consoleActions}>
                  <Button size="small" type="primary" onClick={handleSaveExpertAccess}>
                    保存权限
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {activeTabKey === "modelConfig" ? (
        <div className={styles.expertConfigTabPanel}>
          <div className={styles.expertConfigSinglePanel}>
            <div className={styles.simpleExpertBlock}>
              <span className={styles.simpleExpertBlockLabel}>当前模型</span>
              {hasAnyProvider ? (
                <>
                  <Select
                    className={adminStyles.consoleControl}
                    placeholder="选择大模型"
                    size="small"
                    disabled={!canConfigureModel}
                    value={selectedModel || undefined}
                    onChange={handleModelChange}
                    options={allModelOptions}
                  />
                  <span className={styles.simpleExpertHint}>当前生效模型：{selectedModel}</span>
                  {requiresDeviceBinding && !isAssigned ? (
                    <span className={styles.simpleExpertHint}>
                      设备未绑定前，模型配置不会生效。
                    </span>
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
        </div>
      ) : null}

      {activeTabKey === "versionControl" ? (
        <div className={styles.expertConfigTabPanel}>
          <div className={styles.expertConfigSinglePanel}>
            <div className={styles.simpleExpertBlock}>
              <span className={styles.simpleExpertBlockLabel}>版本信息</span>
              <p className={styles.upgradeVersions}>
                当前版本 {effectiveVersion}
                {hasNewVersion ? ` / 最新版本 ${versionInfo.newVersion}` : ""}
              </p>
              <div className={styles.upgradeNotes}>
                <p className={styles.upgradeNotesTitle}>
                  {hasNewVersion
                    ? "版本更新说明"
                    : assetMeta.source === "purchased"
                    ? "当前版本说明"
                    : "当前发布说明"}
                </p>
                {(versionInfo.updateNotes ?? ["当前版本暂无额外说明。"]).map(note => (
                  <p key={note} className={styles.upgradeNoteItem}>
                    <CheckCircleOutlined className={styles.upgradeCheckIcon} />
                    {note}
                  </p>
                ))}
              </div>
              {hasNewVersion ? (
                <div className={adminStyles.consoleActions}>
                  <Button size="small" type="primary" onClick={handleUpgrade}>
                    接受升级
                  </Button>
                  <Button size="small" onClick={handleIgnoreVersion}>
                    忽略升级
                  </Button>
                </div>
              ) : (
                <span className={styles.simpleExpertHint}>
                  {assetMeta.source === "purchased"
                    ? "当前版本已处理完成，无需额外操作。"
                    : "企业开发资产发布后自动同步，无需管理员确认。"}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
