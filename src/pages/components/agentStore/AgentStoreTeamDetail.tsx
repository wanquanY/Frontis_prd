import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Avatar, Button, Modal, Radio, Select, message } from "antd";

import type { EmployeeItem, EmployeeVisibility, FrontisWebTabKey, WorkspaceItem } from "../../types";
import type { ExpertDeploymentState } from "./types";
import {
  INITIAL_PROVIDER_CONFIGS,
  PROVIDER_MODEL_CATALOG,
  PROVIDER_OPTIONS,
  isProviderConfigured,
} from "../FrontisWebViews";
import adminStyles from "../FrontisAdminViews.module.less";

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
  detailTitle: string;
  employees: EmployeeItem[];
  memberNames: string[];
  onBack: () => void;
  onBindWorkspace: (employeeId: string, workspaceId: string) => void;
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateAccess: (
    employeeId: string,
    visibility: EmployeeVisibility,
    boundMembers: string[],
  ) => void;
  onUpdateModel: (employeeId: string, model: string) => void;
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
  detailTitle,
  employees,
  memberNames,
  onBack,
  onBindWorkspace,
  onNavigateToTab,
  onUpdateAccess,
  onUpdateModel,
  workspaces,
}: AgentStoreTeamDetailProps): JSX.Element => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(employees[0]?.id ?? null);
  const hasSwitcher = employees.length > 1;
  const workspaceMap = useMemo(
    () => new Map(workspaces.map(workspace => [workspace.id, workspace])),
    [workspaces],
  );

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
                const deploymentState = deploymentByEmployeeId[employee.id] ?? {
                  assignedWorkspaceId: null,
                  isDeviceLocked: false,
                };
                const assignedWorkspace = deploymentState.assignedWorkspaceId
                  ? workspaceMap.get(deploymentState.assignedWorkspaceId)
                  : undefined;
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
                          {assignedWorkspace ? assignedWorkspace.name : "待绑定设备"}
                        </span>
                      </div>
                    </div>
                    <p className={styles.detailAgentRailSummary}>{employee.summary}</p>
                    <div className={styles.detailAgentRailTags}>
                      <span className={getDeployTagClassName(Boolean(assignedWorkspace))}>
                        {assignedWorkspace ? "已配置" : "待分配"}
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
                deploymentState={
                  deploymentByEmployeeId[selectedEmployee.id] ?? {
                    assignedWorkspaceId: null,
                    isDeviceLocked: false,
                  }
                }
                employee={selectedEmployee}
                memberNames={memberNames}
                onBindWorkspace={onBindWorkspace}
                onNavigateToTab={onNavigateToTab}
                onUpdateAccess={onUpdateAccess}
                onUpdateModel={onUpdateModel}
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
  deploymentState: ExpertDeploymentState;
  employee: EmployeeItem;
  memberNames: string[];
  onBindWorkspace: (employeeId: string, workspaceId: string) => void;
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateAccess: (
    employeeId: string,
    visibility: EmployeeVisibility,
    boundMembers: string[],
  ) => void;
  onUpdateModel: (employeeId: string, model: string) => void;
  workspaces: WorkspaceItem[];
}

const ExpertConfigPanel = ({
  deploymentState,
  employee,
  memberNames,
  onBindWorkspace,
  onNavigateToTab,
  onUpdateAccess,
  onUpdateModel,
  workspaces,
}: ExpertConfigPanelProps): JSX.Element => {
  const [visibility, setVisibility] = useState<EmployeeVisibility>(employee.visibility);
  const [boundMembers, setBoundMembers] = useState<string[]>(employee.boundMembers);
  const [selectedModel, setSelectedModel] = useState<string>(employee.model);
  const [draftWorkspaceId, setDraftWorkspaceId] = useState<string | undefined>(
    deploymentState.assignedWorkspaceId ?? undefined,
  );
  const [isVersionDiffOpen, setIsVersionDiffOpen] = useState<boolean>(false);
  const [versionIgnored, setVersionIgnored] = useState<boolean>(false);
  const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? { version: "v1.0" };
  const [currentVersion, setCurrentVersion] = useState<string>(versionInfo.version);
  const isAssigned = Boolean(deploymentState.assignedWorkspaceId);

  useEffect(() => {
    setDraftWorkspaceId(deploymentState.assignedWorkspaceId ?? undefined);
  }, [deploymentState.assignedWorkspaceId]);

  const runtimeWorkspace = useMemo(
    () => workspaces.find(item => item.id === deploymentState.assignedWorkspaceId) ?? null,
    [deploymentState.assignedWorkspaceId, workspaces],
  );

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

  const accessSummary =
    visibility === "all"
      ? `全公司可用，共 ${memberNames.length} 名成员`
      : `指定成员可用，共 ${boundMembers.length} 人`;

  const workspaceOptions = useMemo(
    () =>
      workspaces.map(item => ({
        label: `${item.name}（${item.region}）`,
        value: item.id,
      })),
    [workspaces],
  );

  const handleBindWorkspaceClick = useCallback((): void => {
    if (!draftWorkspaceId) {
      message.warning("请先选择要绑定的设备");
      return;
    }

    onBindWorkspace(employee.id, draftWorkspaceId);
    message.success(`${employee.name} 已绑定设备，后续不可再更改设备`);
  }, [draftWorkspaceId, employee.id, employee.name, onBindWorkspace]);

  const handleSaveAccess = useCallback((): void => {
    if (!isAssigned) {
      message.warning("请先绑定设备");
      return;
    }

    onUpdateAccess(employee.id, visibility, boundMembers);
    message.success(`${employee.name} 权限已更新`);
  }, [boundMembers, employee.id, employee.name, isAssigned, onUpdateAccess, visibility]);

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
              {isAssigned ? "已配置" : "待分配"}
            </span>
          </div>
          <p className={styles.simpleExpertRole}>{employee.role}</p>
        </div>
      </div>

      <div className={styles.expertConfigPanelSection}>
        <div className={styles.simpleExpertBlock}>
          <span className={styles.simpleExpertBlockLabel}>设备绑定</span>
          <Select
            className={adminStyles.consoleControl}
            placeholder="选择绑定设备"
            size="small"
            disabled={deploymentState.isDeviceLocked}
            value={draftWorkspaceId}
            onChange={value => setDraftWorkspaceId(value)}
            options={workspaceOptions}
          />
          <span className={styles.simpleExpertHint}>
            {isAssigned
              ? `已绑定设备：${runtimeWorkspace?.name ?? "已绑定"}。绑定后设备不可更改。`
              : "请先绑定设备，再继续配置使用人和模型。"}
          </span>
          {!deploymentState.isDeviceLocked ? (
            <div className={adminStyles.consoleActions}>
              <Button size="small" type="primary" onClick={handleBindWorkspaceClick}>
                绑定设备
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.expertConfigPanelSection}>
        <div className={styles.simpleExpertBlock}>
          <span className={styles.simpleExpertBlockLabel}>权限配置</span>
          <Radio.Group
            value={visibility}
            disabled={!isAssigned}
            onChange={event => setVisibility(event.target.value)}
            size="small"
          >
            <Radio value="all">全公司可用</Radio>
            <Radio value="bound">指定员工可用</Radio>
          </Radio.Group>
          {visibility === "bound" ? (
            <Select
              className={adminStyles.consoleControl}
              mode="multiple"
              placeholder="选择可使用的成员"
              size="small"
              disabled={!isAssigned}
              value={boundMembers}
              onChange={setBoundMembers}
              options={memberNames.map(name => ({ label: name, value: name }))}
            />
          ) : null}
          <span className={styles.simpleExpertHint}>{accessSummary}</span>
          {!isAssigned ? (
            <span className={styles.simpleExpertHint}>设备未绑定前，不能分配使用人。</span>
          ) : null}
          <div className={adminStyles.consoleActions}>
            <Button size="small" type="primary" disabled={!isAssigned} onClick={handleSaveAccess}>
              保存权限
            </Button>
          </div>
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
