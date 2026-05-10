import { useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { DesktopOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button, Empty, Select, Tag } from "antd";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { ExpertDeploymentState } from "@/pages/components/agentStore/types";
import type { ArtifactItem } from "@/types/artifact";

import type {
  DialogueSessionItem,
  EmployeeItem,
  FrontisUserRole,
  FrontisUserStatus,
  FrontisWebUserItem,
  OrganizationDepartmentItem,
  WorkspaceItem,
} from "../types";
import { downloadArtifact } from "../utils";
import styles from "./FrontisWebViews.module.less";

type ResultPreviewKind = "markdown" | "text" | "html" | "image" | "unsupported";

interface ResultRecord extends ArtifactItem {
  employeeId: string;
  employeeName: string;
  sessionId: string;
  sessionTitle: string;
  previewKind: ResultPreviewKind;
}

interface ResultManagementViewProps {
  artifactsBySession: Record<string, ArtifactItem[]>;
  dialogueSessions: DialogueSessionItem[];
  employees: EmployeeItem[];
}

export interface DeviceManagementViewProps {
  deploymentByEmployeeId: Record<string, ExpertDeploymentState>;
  deviceOwners: Record<string, string | null>;
  employees: EmployeeItem[];
  organizationDepartments: OrganizationDepartmentItem[];
  onAddWorkspace: (workspace: WorkspaceItem, ownerId: string | null) => void;
  onAssignDeviceOwner: (deviceId: string, ownerId: string | null) => void;
  onRemoveWorkspace: (workspaceId: string) => void;
  users: FrontisWebUserItem[];
  workspaces: WorkspaceItem[];
}
type ModelProviderCapability =
  | "LLM"
  | "TEXT EMBEDDING"
  | "RERANK"
  | "SPEECH2TEXT"
  | "MODERATION"
  | "TTS";
type ModelProviderConnectivityStatus = "idle" | "success" | "failed";

interface DevicePresentation {
  activatedAt: string;
  code: string;
  location: string;
  workspace: WorkspaceItem;
}

interface ModelProviderOption {
  capabilities: ModelProviderCapability[];
  defaultBaseUrl: string;
  description: string;
  inputCost: string;
  key: string;
  label: string;
  logoText: string;
  monthlyEstimate: string;
  outputCost: string;
  price: string;
}

export interface ModelProviderConfigState {
  apiKey: string;
  baseUrl: string;
  connectivityStatus: ModelProviderConnectivityStatus;
  fetchedModels: string[];
  lastCheckedAt: string;
}

export const PROVIDER_OPTIONS: ModelProviderOption[] = [
  {
    capabilities: ["LLM", "TEXT EMBEDDING", "SPEECH2TEXT", "MODERATION", "TTS"],
    defaultBaseUrl: "https://api.openai.com/v1",
    description: "GPT-4o、GPT-4 Turbo 等前沿大语言模型",
    inputCost: "$0.002 /1K",
    key: "openai",
    label: "OpenAI",
    logoText: "O",
    monthlyEstimate: "¥约 3,200",
    outputCost: "$0.0040 /1K",
    price: "$0.002 USD / 1K tokens",
  },
  {
    capabilities: ["LLM", "TEXT EMBEDDING"],
    defaultBaseUrl: "https://api.anthropic.com/v1",
    description: "Claude 3.5 Sonnet、Claude 3 Opus 等安全可靠的AI助手",
    inputCost: "$0.003 /1K",
    key: "anthropic",
    label: "Anthropic",
    logoText: "A",
    monthlyEstimate: "¥约 4,800",
    outputCost: "$0.015 /1K",
    price: "$0.003 USD / 1K tokens",
  },
  {
    capabilities: ["LLM", "TEXT EMBEDDING"],
    defaultBaseUrl: "https://api.deepseek.com/v1",
    description: "国产顶尖开源大模型，性价比极高",
    inputCost: "$0.0001 /1K",
    key: "deepseek",
    label: "DeepSeek",
    logoText: "D",
    monthlyEstimate: "¥约 200",
    outputCost: "$0.0002 /1K",
    price: "$0.0001 USD / 1K tokens",
  },
  {
    capabilities: ["LLM", "RERANK", "TEXT EMBEDDING", "SPEECH2TEXT"],
    defaultBaseUrl: "https://your-api-host.example.com/v1",
    description: "私有化部署，完全数据自主可控",
    inputCost: "—",
    key: "local",
    label: "本地部署",
    logoText: "L",
    monthlyEstimate: "按硬件成本",
    outputCost: "—",
    price: "硬件投入",
  },
];

export const PROVIDER_MODEL_CATALOG: Record<string, string[]> = {
  anthropic: ["claude-3-7-sonnet", "claude-3-5-sonnet", "claude-3-5-haiku"],
  deepseek: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
  local: ["frontis-chat-32k", "frontis-reasoner"],
  openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
};

export const INITIAL_PROVIDER_CONFIGS: Record<string, ModelProviderConfigState> = {
  anthropic: {
    apiKey: "",
    baseUrl: "",
    connectivityStatus: "idle",
    fetchedModels: [],
    lastCheckedAt: "",
  },
  deepseek: {
    apiKey: "",
    baseUrl: "",
    connectivityStatus: "idle",
    fetchedModels: [],
    lastCheckedAt: "",
  },
  local: {
    apiKey: "sk-local-demo-0198",
    baseUrl: "https://gateway.frontis.ai/v1",
    connectivityStatus: "success",
    fetchedModels: PROVIDER_MODEL_CATALOG.local,
    lastCheckedAt: "今天 09:48",
  },
  openai: {
    apiKey: "sk-openai-demo-8451",
    baseUrl: "",
    connectivityStatus: "success",
    fetchedModels: PROVIDER_MODEL_CATALOG.openai,
    lastCheckedAt: "今天 10:24",
  },
};

const DEVICE_META_BY_WORKSPACE_ID: Record<string, Omit<DevicePresentation, "workspace">> = {
  "workspace-cloud": {
    activatedAt: "2026-03-04 11:20",
    code: "CLD-2026-0301",
    location: "上海 · 产品中心",
  },
  "workspace-local": {
    activatedAt: "2026-03-10 09:45",
    code: "CLD-2026-0302",
    location: "上海 · 销售中心",
  },
  "workspace-local-sh": {
    activatedAt: "2026-03-18 14:30",
    code: "BOX-2026-0401",
    location: "上海 · 门店",
  },
  "workspace-local-bj": {
    activatedAt: "2026-03-20 10:00",
    code: "BOX-2026-0402",
    location: "北京 · 总部",
  },
};

const decodeDataUrlContent = (url?: string): string => {
  if (!url || !url.startsWith("data:")) {
    return "";
  }
  const commaIndex = url.indexOf(",");
  if (commaIndex < 0) {
    return "";
  }
  return decodeURIComponent(url.slice(commaIndex + 1));
};

const resolveResultPreviewKind = (artifact: ArtifactItem): ResultPreviewKind => {
  const mimeType = artifact.mimeType?.toLowerCase() ?? "";
  const fileType = artifact.fileType.toLowerCase();
  if (mimeType.includes("markdown") || fileType === "md" || fileType === "markdown") {
    return "markdown";
  }
  if (mimeType === "application/json" || mimeType.startsWith("text/") || fileType === "json") {
    return mimeType.includes("html") || fileType === "html" ? "html" : "text";
  }
  if (
    mimeType.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(fileType)
  ) {
    return "image";
  }
  return "unsupported";
};

const resolveResultTypeLabel = (artifact: ResultRecord): string => {
  const fileType = artifact.fileType.toUpperCase();
  if (artifact.previewKind === "markdown") return `${fileType} · 可在线预览`;
  if (artifact.previewKind === "text") return `${fileType} · 文本预览`;
  if (artifact.previewKind === "html") return `${fileType} · 页面预览`;
  if (artifact.previewKind === "image") return `${fileType} · 图片预览`;
  return `${fileType} · 仅下载`;
};

export const getRoleLabel = (role: FrontisUserRole): string =>
  role === "enterpriseAdmin" ? "租户管理员" : role === "departmentLead" ? "协作负责人" : "租户成员";

export const getUserStatusLabel = (status: FrontisUserStatus): string =>
  status === "active" ? "已启用" : "已禁用";

export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });

export const formatCurrentDateTime = (): string => {
  const date = new Date();
  const pad = (value: number): string => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const maskApiKey = (apiKey: string): string => {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    return "未授权";
  }
  if (trimmedApiKey.length <= 10) {
    return `${trimmedApiKey.slice(0, 4)}****`;
  }
  return `${trimmedApiKey.slice(0, 6)}****${trimmedApiKey.slice(-4)}`;
};

export const isProviderConfigured = (config: ModelProviderConfigState): boolean =>
  Boolean(config.apiKey.trim());

export const getProviderStatusLabel = (config: ModelProviderConfigState): string => {
  if (!isProviderConfigured(config)) {
    return "未授权";
  }
  if (config.connectivityStatus === "success") {
    return "已连通";
  }
  if (config.connectivityStatus === "failed") {
    return "连接失败";
  }
  return "待测试";
};

export const getProviderStatusTone = (
  config: ModelProviderConfigState,
): "success" | "warning" | "danger" => {
  if (!isProviderConfigured(config)) {
    return "danger";
  }
  if (config.connectivityStatus === "success") {
    return "success";
  }
  if (config.connectivityStatus === "failed") {
    return "danger";
  }
  return "warning";
};

export const isProviderConnectionAvailable = (config: ModelProviderConfigState): boolean => {
  const normalizedBaseUrl = config.baseUrl.trim().toLowerCase();
  return (
    Boolean(config.apiKey.trim()) &&
    !normalizedBaseUrl.includes("invalid") &&
    !normalizedBaseUrl.includes("error")
  );
};

export const renderDeviceWorkspaceIcon = (): JSX.Element => <DesktopOutlined />;

export const getDeviceDisplayName = (name: string): string => name;

export const getDeviceManagementHint = (workspace: WorkspaceItem): string => {
  if (workspace.status === "draft" || workspace.status === "paused") {
    return "设备离线，专家暂停服务";
  }
  if (workspace.status === "pending") {
    return "当前工作站待激活，激活后可分配 Agent 并接入任务。";
  }
  return "可在此查看工作站在线状态、归属 Agent 和基础运行信息。";
};

export const buildResultRecords = (
  artifactsBySession: Record<string, ArtifactItem[]>,
  dialogueSessions: DialogueSessionItem[],
  employees: EmployeeItem[],
): ResultRecord[] => {
  const sessionMap = new Map(dialogueSessions.map(item => [item.id, item]));
  const employeeMap = new Map(employees.map(item => [item.id, item]));

  return Object.entries(artifactsBySession)
    .flatMap(([sessionId, artifacts]) => {
      const session = sessionMap.get(sessionId);
      if (!session) return [];
      const employee = employeeMap.get(session.employeeId);
      if (!employee) return [];
      return artifacts.map<ResultRecord>(artifact => ({
        ...artifact,
        employeeId: employee.id,
        employeeName: employee.name,
        previewKind: resolveResultPreviewKind(artifact),
        sessionId,
        sessionTitle: session.title,
      }));
    })
    .sort((left, right) => right.producedAt.localeCompare(left.producedAt));
};

export const buildDevicePresentations = (
  workspaces: WorkspaceItem[],
  employees: EmployeeItem[],
): DevicePresentation[] =>
  workspaces.map(workspace => {
    const meta = DEVICE_META_BY_WORKSPACE_ID[workspace.id] ?? {
      activatedAt: "2026-03-01 00:00",
      code: `BX-${workspace.id.slice(-4).toUpperCase()}`,
      location: "未填写位置备注",
    };
    return {
      ...meta,
      workspace: {
        ...workspace,
        summary: `${workspace.summary} 当前运行 ${employees.filter(item => item.workspaceId === workspace.id).length} 个 Agent。`,
      },
    };
  });

const renderResultPreview = (artifact: ResultRecord): JSX.Element => {
  if (artifact.previewKind === "markdown") {
    return (
      <div className={styles.markdownShell}>
        <MarkdownRenderer
          source={decodeDataUrlContent(artifact.canonicalPath)}
          enableMermaidActions={true}
          artifactFileName={artifact.fileName}
        />
      </div>
    );
  }

  if (artifact.previewKind === "text") {
    return <pre className={styles.previewCode}>{decodeDataUrlContent(artifact.canonicalPath)}</pre>;
  }

  if (artifact.previewKind === "html") {
    return (
      <iframe
        className={styles.previewFrame}
        src={artifact.canonicalPath}
        title={artifact.fileName}
      />
    );
  }

  if (artifact.previewKind === "image") {
    return (
      <div className={styles.previewImageWrap}>
        <img alt={artifact.fileName} className={styles.previewImage} src={artifact.canonicalPath} />
      </div>
    );
  }

  return (
    <div className={styles.emptyPreview}>
      <DownloadOutlined className={styles.emptyPreviewIcon} />
      <div className={styles.emptyPreviewTitle}>当前格式暂不支持在线预览</div>
      <div className={styles.emptyPreviewDescription}>
        原型阶段保留了下载入口，后续可接 Office / PDF 在线预览方案。
      </div>
    </div>
  );
};

/**
 * 成果管理视图。
 */
export const ResultManagementView = ({
  artifactsBySession,
  dialogueSessions,
  employees,
}: ResultManagementViewProps): JSX.Element => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [selectedResultId, setSelectedResultId] = useState<string>("");

  const resultRecords = useMemo(
    () => buildResultRecords(artifactsBySession, dialogueSessions, employees),
    [artifactsBySession, dialogueSessions, employees],
  );

  const filteredResults = useMemo(
    () =>
      resultRecords.filter(item =>
        selectedAgentId === "all" ? true : item.employeeId === selectedAgentId,
      ),
    [resultRecords, selectedAgentId],
  );

  const selectedResult = useMemo(
    () => filteredResults.find(item => item.id === selectedResultId) ?? filteredResults[0] ?? null,
    [filteredResults, selectedResultId],
  );

  useEffect(() => {
    if (!filteredResults.length) {
      setSelectedResultId("");
      return;
    }
    if (filteredResults.some(item => item.id === selectedResultId)) {
      return;
    }
    setSelectedResultId(filteredResults[0].id);
  }, [filteredResults, selectedResultId]);

  const previewableCount = useMemo(
    () => resultRecords.filter(item => item.previewKind !== "unsupported").length,
    [resultRecords],
  );

  const employeeOptions = useMemo(
    () => [
      { label: "全部 Agent", value: "all" },
      ...employees.map(item => ({
        label: item.name,
        value: item.id,
      })),
    ],
    [employees],
  );

  return (
    <div className={styles.view}>
      <section className={styles.heroCard}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>成果管理</span>
          <h2 className={styles.heroTitle}>统一查看所有 Agent 产出的文件与结果</h2>
          <p className={styles.heroDescription}>
            当前原型已按文档收敛为 Web 端成果管理入口，支持按 Agent 汇总查看、在线预览和下载。
          </p>
        </div>
        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>成果总数</span>
            <strong className={styles.summaryValue}>{resultRecords.length}</strong>
            <span className={styles.summaryHint}>来自 {employees.length} 个 Agent</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>可预览成果</span>
            <strong className={styles.summaryValue}>{previewableCount}</strong>
            <span className={styles.summaryHint}>覆盖 Markdown / HTML / JSON / 图片</span>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>最近更新</span>
            <strong className={styles.summaryValue}>
              {resultRecords[0]?.producedAt.slice(5, 16) ?? "--"}
            </strong>
            <span className={styles.summaryHint}>按时间倒序展示</span>
          </article>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>成果列表</div>
            <div className={styles.sectionDescription}>按 Agent 筛选当前账号下的所有产出文件。</div>
          </div>
          <Select
            className={styles.filterSelect}
            options={employeeOptions}
            value={selectedAgentId}
            onChange={value => setSelectedAgentId(value)}
          />
        </div>

        <div className={styles.splitLayout}>
          <div className={styles.listPane}>
            {filteredResults.length === 0 ? (
              <div className={styles.emptyState}>
                <Empty description="当前筛选条件下暂无成果" />
              </div>
            ) : (
              <div className={styles.cardList}>
                {filteredResults.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={classNames(styles.rowCard, {
                      [styles.rowCardActive]: item.id === selectedResult?.id,
                    })}
                    onClick={() => setSelectedResultId(item.id)}
                  >
                    <div className={styles.rowCardHeader}>
                      <span className={styles.rowCardTitle}>{item.fileName}</span>
                      <Tag bordered={false} className={styles.lightTag}>
                        {item.fileType.toUpperCase()}
                      </Tag>
                    </div>
                    <div className={styles.rowCardMeta}>
                      <span>{item.employeeName}</span>
                      <span>{item.producedAt}</span>
                    </div>
                    <div className={styles.rowCardSummary}>{item.taskName}</div>
                    <div className={styles.rowCardFooter}>
                      <span className={styles.metaChip}>{resolveResultTypeLabel(item)}</span>
                      <span className={styles.metaChip}>{item.fileSize}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.detailPane}>
            {selectedResult ? (
              <>
                <div className={styles.detailHero}>
                  <div>
                    <div className={styles.detailTitle}>{selectedResult.fileName}</div>
                    <div className={styles.detailSub}>
                      {selectedResult.employeeName} · {selectedResult.sessionTitle}
                    </div>
                  </div>
                  <div className={styles.compactActions}>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => downloadArtifact(selectedResult)}
                    >
                      下载成果
                    </Button>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailMetric}>
                    <span className={styles.detailMetricLabel}>任务来源</span>
                    <span className={styles.detailMetricValue}>{selectedResult.taskName}</span>
                  </div>
                  <div className={styles.detailMetric}>
                    <span className={styles.detailMetricLabel}>文件类型</span>
                    <span className={styles.detailMetricValue}>
                      {resolveResultTypeLabel(selectedResult)}
                    </span>
                  </div>
                  <div className={styles.detailMetric}>
                    <span className={styles.detailMetricLabel}>产出时间</span>
                    <span className={styles.detailMetricValue}>{selectedResult.producedAt}</span>
                  </div>
                </div>

                <div className={styles.previewPanel}>{renderResultPreview(selectedResult)}</div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <Empty description="请选择左侧成果文件查看详情" />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
