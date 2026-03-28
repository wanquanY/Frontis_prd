import { useCallback, useMemo, useState } from "react";

import { ArrowLeftOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Radio, Select, Tag, message } from "antd";

import type { EmployeeItem, EmployeeVisibility, FrontisWebTabKey, WorkspaceItem } from "../../types";
import type { OwnedExpertTeam } from "./types";
import {
  INITIAL_PROVIDER_CONFIGS,
  PROVIDER_MODEL_CATALOG,
  PROVIDER_OPTIONS,
  isProviderConfigured,
} from "../FrontisWebViews";

import styles from "./AgentStoreView.module.less";

const STATUS_LABEL: Record<string, string> = {
  online: "在线",
  busy: "运行中",
  idle: "空闲",
  pending: "等待",
  paused: "已暂停",
  draft: "异常",
};

const STATUS_DOT: Record<string, string> = {
  online: styles.dotOnline,
  busy: styles.dotOnline,
  idle: styles.dotWaiting,
  pending: styles.dotWaiting,
  paused: styles.dotOffline,
  draft: styles.dotError,
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
              <span>版本 {team.version}</span>
              <span>·</span>
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
}

const ExpertConfigCard = ({
  allModelOptions,
  employee,
  hasAnyProvider,
  memberNames,
  onNavigateToTab,
  onUpdateAccess,
  onUpdateModel,
}: ExpertConfigCardProps): JSX.Element => {
  const [visibility, setVisibility] = useState<EmployeeVisibility>(employee.visibility);
  const [bound, setBound] = useState<string[]>(employee.boundMembers);
  const [selectedModel, setSelectedModel] = useState<string>(employee.model);

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
            <span className={STATUS_DOT[employee.status] ?? styles.dotOffline} />
            <span className={styles.expertStatusLabel}>
              {STATUS_LABEL[employee.status] ?? "未知"}
            </span>
          </div>
          <p className={styles.expertRole}>{employee.role}</p>
        </div>
      </div>

      {/* Permission config */}
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
    </div>
  );
};
