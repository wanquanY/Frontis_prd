import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { Avatar, Button, InputNumber, Radio, Select, Tabs, TreeSelect, message } from "antd";

import {
  buildAccessScopeSubjectLookup,
  buildOrganizationTree,
  getOrganizationRootDepartmentName,
  normalizeAccessScopeSubjects,
} from "@/utils/organizationAccess";
import type {
  AccessScopeSubject,
  EmployeeItem,
  EmployeeVisibility,
  FrontisWebUserItem,
  OrganizationDepartmentItem,
  OrganizationTreeNode,
} from "../../types";
import type { AgentLaborCostConfig } from "./types";
import {
  INITIAL_PROVIDER_CONFIGS,
  PROVIDER_MODEL_CATALOG,
  PROVIDER_OPTIONS,
  isProviderConfigured,
} from "../FrontisWebViews";
import adminStyles from "../FrontisAdminViews.module.less";
import { getExpertOwnershipMeta } from "./expertOwnershipMeta";
import { getExpertAccessScopeSummary, isExpertAccessConfigured } from "./utils";

import styles from "./AgentStoreView.module.less";

interface ExpertVersionRecord {
  changeNotes: string[];
  publishedAt: string;
  publisherName: string;
  summary: string;
  version: string;
}

interface ExpertVersionInfo {
  currentVersion: string;
  records: ExpertVersionRecord[];
}

const buildVersionInfo = (records: ExpertVersionRecord[]): ExpertVersionInfo => ({
  currentVersion: records[0]?.version ?? "v1.0",
  records,
});

/**
 * 企业自研 AI 专家版本记录。
 */
export const EXPERT_VERSION_INFO: Record<string, ExpertVersionInfo> = {
  "employee-pm": buildVersionInfo([
    {
      changeNotes: ["新增经营结论摘要模板", "补充多轮差异解释能力"],
      publishedAt: "2026-04-18",
      publisherName: "王晨",
      summary: "补强序列总览专家在经营复盘场景下的总结与追问能力。",
      version: "v2.2",
    },
    {
      changeNotes: ["优化评分解释结构", "统一序列预警口径"],
      publishedAt: "2026-03-26",
      publisherName: "王晨",
      summary: "重构经营管理视图的解释链路，作为当前稳定基线版本。",
      version: "v2.1",
    },
    {
      changeNotes: ["建立基础评分框架", "接入预警摘要模版"],
      publishedAt: "2026-02-12",
      publisherName: "王晨",
      summary: "首个企业内发布版本。",
      version: "v2.0",
    },
  ]),
  "employee-designer": buildVersionInfo([
    {
      changeNotes: ["补充更细的员工评估维度", "新增证据摘要视图"],
      publishedAt: "2026-04-11",
      publisherName: "李婷",
      summary: "增强设计评估专家的证据透出与可解释性。",
      version: "v1.9",
    },
    {
      changeNotes: ["完善评估结论模板", "补充评审建议话术"],
      publishedAt: "2026-03-08",
      publisherName: "李婷",
      summary: "优化设计评审输出结构。",
      version: "v1.8",
    },
    {
      changeNotes: ["建立设计评审基础模版"],
      publishedAt: "2026-01-20",
      publisherName: "李婷",
      summary: "首个企业内发布版本。",
      version: "v1.7",
    },
  ]),
  "employee-research": buildVersionInfo([
    {
      changeNotes: ["补充洞察摘要模版", "完善访谈标签归类"],
      publishedAt: "2026-03-29",
      publisherName: "陈雪梅",
      summary: "优化研究专家在用户洞察汇总场景下的输出质量。",
      version: "v1.5",
    },
    {
      changeNotes: ["接入基础访谈纪要结构"],
      publishedAt: "2026-02-16",
      publisherName: "陈雪梅",
      summary: "首个企业内发布版本。",
      version: "v1.4",
    },
  ]),
  "employee-ops": buildVersionInfo([
    {
      changeNotes: ["补充经营异常说明模版", "优化复盘结论格式"],
      publishedAt: "2026-03-15",
      publisherName: "王晨",
      summary: "提升经营专家在异常经营跟踪场景下的表达一致性。",
      version: "v1.3",
    },
    {
      changeNotes: ["建立基础经营周报模版"],
      publishedAt: "2026-01-28",
      publisherName: "王晨",
      summary: "首个企业内发布版本。",
      version: "v1.2",
    },
  ]),
  "employee-writer": buildVersionInfo([
    {
      changeNotes: ["优化 CEO 口吻一致性", "新增经营问答收口模板"],
      publishedAt: "2026-04-17",
      publisherName: "杨万泉",
      summary: "补强 CEO 专家在经营答复与汇报场景下的稳定性。",
      version: "v1.7",
    },
    {
      changeNotes: ["增强高层简报模版", "补充长文本压缩策略"],
      publishedAt: "2026-03-10",
      publisherName: "杨万泉",
      summary: "优化高层汇报与对外表达的一致性。",
      version: "v1.6",
    },
    {
      changeNotes: ["建立基础 CEO 话术框架"],
      publishedAt: "2026-02-03",
      publisherName: "杨万泉",
      summary: "首个企业内发布版本。",
      version: "v1.5",
    },
  ]),
  "employee-sales": buildVersionInfo([
    {
      changeNotes: ["补充商机阶段提醒模版", "优化销售异议处理建议"],
      publishedAt: "2026-04-09",
      publisherName: "赵立",
      summary: "升级销售跟进提醒专家在阶段判断上的输出准确性。",
      version: "v2.0",
    },
    {
      changeNotes: ["建立商机跟进基础场景"],
      publishedAt: "2026-02-27",
      publisherName: "赵立",
      summary: "首个企业内发布版本。",
      version: "v1.9",
    },
  ]),
  "employee-architect": buildVersionInfo([
    {
      changeNotes: ["补充架构约束检查项", "新增模块依赖说明模板"],
      publishedAt: "2026-04-19",
      publisherName: "陈雪梅",
      summary: "增强架构专家在方案评审时的边界检查能力。",
      version: "v1.5",
    },
    {
      changeNotes: ["规范技术方案输出结构", "补充风险说明模板"],
      publishedAt: "2026-03-14",
      publisherName: "陈雪梅",
      summary: "优化技术方案评审输出的一致性。",
      version: "v1.4",
    },
    {
      changeNotes: ["建立基础架构评审模版"],
      publishedAt: "2026-01-31",
      publisherName: "陈雪梅",
      summary: "首个企业内发布版本。",
      version: "v1.3",
    },
  ]),
  "employee-growth": buildVersionInfo([
    {
      changeNotes: ["新增漏斗实验模板", "补充首屏转化指标口径"],
      publishedAt: "2026-04-12",
      publisherName: "王晨",
      summary: "完善增长专家在转化诊断场景下的输出模版。",
      version: "v1.3",
    },
    {
      changeNotes: ["建立增长分析基础指标模版"],
      publishedAt: "2026-02-18",
      publisherName: "王晨",
      summary: "首个企业内发布版本。",
      version: "v1.2",
    },
  ]),
  "employee-qa": buildVersionInfo([
    {
      changeNotes: ["新增回归范围分层建议", "补充上线前验收卡点"],
      publishedAt: "2026-04-10",
      publisherName: "赵立",
      summary: "增强 QA 专家在回归和上线验收场景下的风险提示能力。",
      version: "v1.2",
    },
    {
      changeNotes: ["建立基础测试评审模版"],
      publishedAt: "2026-02-14",
      publisherName: "赵立",
      summary: "首个企业内发布版本。",
      version: "v1.1",
    },
  ]),
  "employee-data": buildVersionInfo([
    {
      changeNotes: ["补充看板指标字典", "新增异常波动解释模板"],
      publishedAt: "2026-04-16",
      publisherName: "周可",
      summary: "提升数据专家在指标解释与异常排查场景下的输出完整度。",
      version: "v1.4",
    },
    {
      changeNotes: ["建立核心指标看板说明模版"],
      publishedAt: "2026-02-22",
      publisherName: "周可",
      summary: "首个企业内发布版本。",
      version: "v1.3",
    },
  ]),
  "employee-user-researcher": buildVersionInfo([
    {
      changeNotes: ["新增访谈纪要结构化输出", "补充用户痛点优先级对比视图"],
      publishedAt: "2026-04-13",
      publisherName: "李婷",
      summary: "完善用户研究专家在洞察沉淀与汇总场景下的结构化输出。",
      version: "v1.3",
    },
    {
      changeNotes: ["建立访谈摘要基础模版"],
      publishedAt: "2026-02-19",
      publisherName: "李婷",
      summary: "首个企业内发布版本。",
      version: "v1.2",
    },
  ]),
  "employee-local-ops": buildVersionInfo([
    {
      changeNotes: ["建立本地经营专家初版能力"],
      publishedAt: "2026-03-05",
      publisherName: "王晨",
      summary: "首个企业内发布版本。",
      version: "v1.1",
    },
  ]),
};

type ExpertConfigTabKey =
  | "workspaceAccess"
  | "modelConfig"
  | "costAccounting"
  | "versionHistory";

interface AgentStoreTeamDetailProps {
  platformModelOnly: boolean;
  allowPermissionManagement: boolean;
  allowLaborCostConfiguration: boolean;
  detailTitle: string;
  employees: EmployeeItem[];
  organizationDepartments: OrganizationDepartmentItem[];
  onBack: () => void;
  onUpdateAccess: (
    employeeId: string,
    visibility: EmployeeVisibility,
    accessScopeSubjects: AccessScopeSubject[],
  ) => void;
  onUpdateLaborCosts: (employeeId: string, costs: AgentLaborCostConfig) => void;
  onUpdateModel: (employeeId: string, model: string) => void;
  users: FrontisWebUserItem[];
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

const getVersionTagClassName = (): string =>
  `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagPrimary}`;

const getDeployTagClassName = (isAssigned: boolean): string =>
  isAssigned
    ? `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagSuccess}`
    : `${adminStyles.consoleStatusTag} ${adminStyles.consoleStatusTagWarning}`;

/**
 * AI 专家详情视图。
 */
export const AgentStoreTeamDetail = ({
  platformModelOnly,
  allowPermissionManagement,
  allowLaborCostConfiguration,
  detailTitle,
  employees,
  organizationDepartments,
  onBack,
  onUpdateAccess,
  onUpdateLaborCosts,
  onUpdateModel,
  users,
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
                const isConfigured = isExpertAccessConfigured(employee);
                const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? buildVersionInfo([]);

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
                          {getExpertAccessScopeSummary(
                            employee.visibility,
                            employee.accessScopeSubjects,
                            organizationDepartments,
                          )}
                        </span>
                      </div>
                    </div>
                    <p className={styles.detailAgentRailSummary}>{employee.summary}</p>
                    <div className={styles.detailAgentRailTags}>
                      <span className={getDeployTagClassName(isConfigured)}>
                        {isConfigured ? "已配置" : "待分配权限"}
                      </span>
                      <span className={getVersionTagClassName()}>
                        {`当前 ${versionInfo.currentVersion}`}
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
                platformModelOnly={platformModelOnly}
                allowPermissionManagement={allowPermissionManagement}
                allowLaborCostConfiguration={allowLaborCostConfiguration}
                employee={selectedEmployee}
                organizationDepartments={organizationDepartments}
                onUpdateAccess={onUpdateAccess}
                onUpdateLaborCosts={onUpdateLaborCosts}
                onUpdateModel={onUpdateModel}
                users={users}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

interface ExpertConfigPanelProps {
  platformModelOnly: boolean;
  allowPermissionManagement: boolean;
  allowLaborCostConfiguration: boolean;
  employee: EmployeeItem;
  organizationDepartments: OrganizationDepartmentItem[];
  onUpdateAccess: (
    employeeId: string,
    visibility: EmployeeVisibility,
    accessScopeSubjects: AccessScopeSubject[],
  ) => void;
  onUpdateLaborCosts: (employeeId: string, costs: AgentLaborCostConfig) => void;
  onUpdateModel: (employeeId: string, model: string) => void;
  users: FrontisWebUserItem[];
}

const ExpertConfigPanel = ({
  platformModelOnly,
  allowPermissionManagement,
  allowLaborCostConfiguration,
  employee,
  organizationDepartments,
  onUpdateAccess,
  onUpdateLaborCosts,
  onUpdateModel,
  users,
}: ExpertConfigPanelProps): JSX.Element => {
  const [selectedModel, setSelectedModel] = useState<string>(employee.model);
  const [laborCostDraft, setLaborCostDraft] = useState<AgentLaborCostConfig>(() => ({
    industryStandardCost: employee.industryStandardCost ?? 0,
    myLaborCost: employee.myLaborCost ?? 0,
  }));
  const [activeTabKey, setActiveTabKey] = useState<ExpertConfigTabKey>(
    allowPermissionManagement ? "workspaceAccess" : "modelConfig",
  );
  const [permissionAccessDraft, setPermissionAccessDraft] = useState<{
    accessScopeSubjects: AccessScopeSubject[];
    visibility: EmployeeVisibility;
  }>(() => ({
      accessScopeSubjects: [...employee.accessScopeSubjects],
      visibility: employee.visibility,
    }));
  const organizationTreeData = useMemo(
    () => mapTreeNodesToSelectData(buildOrganizationTree(organizationDepartments, users)),
    [organizationDepartments, users],
  );
  const accessScopeSubjectLookup = useMemo(
    () => buildAccessScopeSubjectLookup(organizationDepartments, users),
    [organizationDepartments, users],
  );
  const rootDepartmentName = useMemo(
    () => getOrganizationRootDepartmentName(organizationDepartments),
    [organizationDepartments],
  );
  const ownershipMeta = getExpertOwnershipMeta(employee);
  const versionInfo = EXPERT_VERSION_INFO[employee.id] ?? buildVersionInfo([]);
  const versionRecords = versionInfo.records;
  const currentVersion = versionInfo.currentVersion;
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
  useEffect(() => {
    setPermissionAccessDraft({
      accessScopeSubjects: [...employee.accessScopeSubjects],
      visibility: employee.visibility,
    });
  }, [employee]);

  useEffect(() => {
    setLaborCostDraft({
      industryStandardCost: employee.industryStandardCost ?? 0,
      myLaborCost: employee.myLaborCost ?? 0,
    });
  }, [employee.id, employee.industryStandardCost, employee.myLaborCost]);

  useEffect(() => {
    if (!allowPermissionManagement && activeTabKey === "workspaceAccess") {
      setActiveTabKey("modelConfig");
    }
  }, [activeTabKey, allowPermissionManagement]);

  const { allModelOptions, hasAnyProvider } = useMemo(() => {
    if (platformModelOnly) {
      const nextOptions = (PROVIDER_MODEL_CATALOG.local ?? []).map(model => ({
        label: `${model}（平台提供）`,
        value: model,
      }));

      return {
        allModelOptions: nextOptions,
        hasAnyProvider: nextOptions.length > 0,
      };
    }

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
  }, [platformModelOnly]);
  const permissionAccessSummary = getExpertAccessScopeSummary(
    permissionAccessDraft.visibility,
    permissionAccessDraft.accessScopeSubjects,
    organizationDepartments,
  );
  const modelStatusLabel = hasAnyProvider ? selectedModel : "待配置";
  const modelStatusHint = hasAnyProvider
    ? platformModelOnly
      ? "平台提供模型"
      : "当前生效模型"
    : platformModelOnly
      ? "暂无平台可用模型"
      : "需先完成管理员模型配置";
  const versionStatusLabel = `${versionRecords.length} 个版本`;
  const permissionTreeValues = useMemo(
    () =>
      permissionAccessDraft.accessScopeSubjects.map(subject => ({
        label: subject.subjectName,
        value: toTreeValue(subject.subjectType, subject.subjectId),
      })),
    [permissionAccessDraft.accessScopeSubjects],
  );

  const handleSaveExpertAccess = useCallback((): void => {
    onUpdateAccess(
      employee.id,
      permissionAccessDraft.visibility,
      permissionAccessDraft.accessScopeSubjects,
    );
    message.success(`${employee.name} 权限已更新`);
  }, [
    employee.id,
    employee.name,
    onUpdateAccess,
    permissionAccessDraft.accessScopeSubjects,
    permissionAccessDraft.visibility,
  ]);

  const handleChangeAccessVisibility = useCallback(
    (nextVisibility: EmployeeVisibility): void => {
      setPermissionAccessDraft(prev => ({
        ...prev,
        visibility: nextVisibility,
      }));
    },
    [],
  );

  const handleChangeAccessSubjects = useCallback(
    (nextSubjects: Array<OrganizationTreeValue | { value: OrganizationTreeValue }>): void => {
      const normalizedSubjects = normalizeTreeValuesToSubjects(nextSubjects);

      setPermissionAccessDraft(prev => ({
        ...prev,
        accessScopeSubjects: normalizedSubjects,
      }));
    },
    [normalizeTreeValuesToSubjects],
  );

  const handleModelChange = useCallback(
    (model: string): void => {
      setSelectedModel(model);
      onUpdateModel(employee.id, model);
      message.success(`${employee.name} 模型已切换为 ${model}`);
    },
    [employee.id, employee.name, onUpdateModel],
  );

  const handleLaborCostChange = useCallback(
    (field: keyof AgentLaborCostConfig, value: number | null): void => {
      setLaborCostDraft(prev => ({
        ...prev,
        [field]: Math.max(0, Math.round(value ?? 0)),
      }));
    },
    [],
  );

  const handleSaveLaborCosts = useCallback((): void => {
    onUpdateLaborCosts(employee.id, laborCostDraft);
    message.success(`${employee.name} 成本参数已保存`);
  }, [employee.id, employee.name, laborCostDraft, onUpdateLaborCosts]);

  const handleTabChange = useCallback(
    (nextTabKey: string): void => {
      if (
        (allowPermissionManagement && nextTabKey === "workspaceAccess") ||
        nextTabKey === "modelConfig" ||
        (allowLaborCostConfiguration && nextTabKey === "costAccounting") ||
        nextTabKey === "versionHistory"
      ) {
        setActiveTabKey(nextTabKey);
      }
    },
    [allowLaborCostConfiguration, allowPermissionManagement],
  );

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
              <span className={styles.expertConfigMetaLabel}>{ownershipMeta.ownerLabel}</span>
              <span className={styles.expertConfigMetaValue}>{ownershipMeta.ownerName}</span>
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
          <span className={styles.expertConfigSummaryLabel}>版本记录</span>
          <span className={getVersionTagClassName()}>{versionStatusLabel}</span>
          <span className={styles.expertConfigSummaryHint}>
            {`当前生效 ${currentVersion}，仅作发布记录，无需企业管理员审核`}
          </span>
        </div>
      </div>

      <Tabs
        size="small"
        className={styles.expertConfigTabs}
        activeKey={activeTabKey}
        items={[
          ...(allowPermissionManagement ? [{ key: "workspaceAccess", label: "权限管理" }] : []),
          { key: "modelConfig", label: "模型配置" },
          ...(allowLaborCostConfiguration ? [{ key: "costAccounting", label: "成本核算" }] : []),
          { key: "versionHistory", label: "版本记录" },
        ]}
        onChange={handleTabChange}
      />

      {allowPermissionManagement && activeTabKey === "workspaceAccess" ? (
        <div className={styles.expertConfigTabPanel}>
          <div className={styles.expertConfigSinglePanel}>
            <div className={styles.simpleExpertBlock}>
              <span className={styles.simpleExpertBlockLabel}>可用范围</span>
              <span className={styles.simpleExpertHint}>
                配置该 AI 专家的组织或成员可用范围。
              </span>
              <div className={styles.permissionControls}>
                <Radio.Group
                  value={permissionAccessDraft.visibility}
                  onChange={event => handleChangeAccessVisibility(event.target.value)}
                  size="small"
                >
                  <Radio value="all">{`${rootDepartmentName}可用`}</Radio>
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
                  ? `保存后将对${rootDepartmentName}开放。`
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
                    value={selectedModel || undefined}
                    onChange={handleModelChange}
                    options={allModelOptions}
                  />
                  <span className={styles.simpleExpertHint}>当前生效模型：{selectedModel}</span>
                </>
              ) : (
                <>
                  <span className={styles.simpleExpertHint}>
                    {platformModelOnly
                      ? "暂无平台可用大模型。"
                      : "暂无可用大模型，请先完成管理员模型配置。"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {allowLaborCostConfiguration && activeTabKey === "costAccounting" ? (
        <div className={styles.expertConfigTabPanel}>
          <div className={styles.expertConfigSinglePanel}>
            <div className={styles.simpleExpertBlock}>
              <span className={styles.simpleExpertBlockLabel}>成本核算</span>
              <div className={styles.laborCostGrid}>
                <label className={styles.laborCostField}>
                  <span className={styles.laborCostLabel}>我的人力成本</span>
                  <InputNumber
                    className={styles.laborCostInput}
                    min={0}
                    precision={0}
                    prefix="¥"
                    size="small"
                    value={laborCostDraft.myLaborCost}
                    onChange={value => handleLaborCostChange("myLaborCost", value)}
                  />
                </label>
                <label className={styles.laborCostField}>
                  <span className={styles.laborCostLabel}>行业标准成本</span>
                  <InputNumber
                    className={styles.laborCostInput}
                    min={0}
                    precision={0}
                    prefix="¥"
                    size="small"
                    value={laborCostDraft.industryStandardCost}
                    onChange={value => handleLaborCostChange("industryStandardCost", value)}
                  />
                </label>
                <Button size="small" type="primary" onClick={handleSaveLaborCosts}>
                  保存
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTabKey === "versionHistory" ? (
        <div className={styles.expertConfigTabPanel}>
          <div className={styles.expertConfigSinglePanel}>
            <div className={styles.simpleExpertBlock}>
              <span className={styles.simpleExpertBlockLabel}>版本历史</span>
              <p className={styles.upgradeVersions}>
                {`当前生效版本 ${currentVersion}，共记录 ${versionRecords.length} 个版本。`}
              </p>
              <span className={styles.simpleExpertHint}>
                企业自研 AI
                专家发布后会自动记入版本记录，当前仅用于查看和追溯，不涉及企业管理员审核。
              </span>
              <div className={styles.versionRecordList}>
                {versionRecords.map((record, index) => (
                  <article key={record.version} className={styles.versionRecordCard}>
                    <div className={styles.versionRecordHeader}>
                      <div className={styles.versionRecordLead}>
                        <span className={styles.versionRecordVersion}>{record.version}</span>
                        <span
                          className={
                            index === 0
                              ? styles.versionRecordBadgeCurrent
                              : styles.versionRecordBadgeHistory
                          }
                        >
                          {index === 0 ? "当前生效" : "历史版本"}
                        </span>
                      </div>
                      <span className={styles.versionRecordMeta}>
                        {`${record.publishedAt} · 发布人 ${record.publisherName}`}
                      </span>
                    </div>
                    <p className={styles.versionRecordSummary}>{record.summary}</p>
                    <div className={styles.upgradeNotes}>
                      <p className={styles.upgradeNotesTitle}>变更说明</p>
                      {record.changeNotes.map(note => (
                        <p key={`${record.version}-${note}`} className={styles.upgradeNoteItem}>
                          <CheckCircleOutlined className={styles.upgradeCheckIcon} />
                          {note}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
