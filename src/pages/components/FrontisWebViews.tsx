import { useEffect, useMemo, useState } from "react";

import classNames from "classnames";
import { DesktopOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button, Empty, Select, Tag } from "antd";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { SynClawArtifactItem } from "@/pages/synclaw/types";

import type {
  DialogueSessionItem,
  EmployeeItem,
  FrontisUserRole,
  FrontisUserStatus,
  FrontisWebUserItem,
  WorkspaceItem,
} from "../types";
import { downloadArtifact } from "../utils";
import styles from "./FrontisWebViews.module.less";

type ResultPreviewKind = "markdown" | "text" | "html" | "image" | "unsupported";

interface ResultRecord extends SynClawArtifactItem {
  employeeId: string;
  employeeName: string;
  sessionId: string;
  sessionTitle: string;
  previewKind: ResultPreviewKind;
}

interface ResultManagementViewProps {
  artifactsBySession: Record<string, SynClawArtifactItem[]>;
  dialogueSessions: DialogueSessionItem[];
  employees: EmployeeItem[];
}

export interface AdminDashboardViewProps {
  artifactsBySession: Record<string, SynClawArtifactItem[]>;
  dialogueSessions: DialogueSessionItem[];
  employees: EmployeeItem[];
  users: FrontisWebUserItem[];
}

export interface DeviceManagementViewProps {
  employees: EmployeeItem[];
  workspaces: WorkspaceItem[];
}

export interface UserManagementViewProps {
  employees: EmployeeItem[];
  users: FrontisWebUserItem[];
}

export type ScheduledTaskStatus = "active" | "paused";
export type ScheduledTaskRunStatus = "running" | "success" | "failed";
export type ScheduledTaskFrequency = "单次" | "每日" | "每周";
export type DashboardTimeRange = "today" | "week" | "month" | "quarter";
export type DashboardGranularity = "day" | "week" | "month";
export type DashboardRankingDimension = "agent" | "user";
export type DashboardPrdKey = "all" | "frontis-web-v01" | "synclaw-window" | "artifact-panel";
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

interface ScheduledTaskRunRecord {
  id: string;
  startedAt: string;
  status: ScheduledTaskRunStatus;
  summary: string;
}

export interface ScheduledTaskItem {
  employeeId: string;
  frequency: ScheduledTaskFrequency;
  id: string;
  instruction: string;
  lastRunSummary: string;
  name: string;
  nextRunAt: string;
  runs: ScheduledTaskRunRecord[];
  status: ScheduledTaskStatus;
}

export interface ScheduledTaskViewProps {
  employees: EmployeeItem[];
}

interface DashboardPrdOption {
  activityMultiplier: number;
  automationRatio: number;
  employeeWeights: Record<string, number>;
  key: DashboardPrdKey;
  label: string;
  resultKeywords: string[];
  tokenMultiplier: number;
  userWeights: Record<string, number>;
}

interface DashboardTimelinePoint {
  automationTasks: number;
  cost: number;
  dialogues: number;
  label: string;
  results: number;
  tokens: number;
}

interface DashboardMetricCardItem {
  delta: number;
  hint: string;
  label: string;
  value: string;
}

interface DashboardRankingRow {
  id: string;
  label: string;
  meta: string;
  value: number;
  valueLabel: string;
}

interface DashboardTaskRow {
  failed: number;
  id: string;
  name: string;
  success: number;
  total: number;
}

interface DashboardFunnelStep {
  hint: string;
  label: string;
  value: number;
}

interface DashboardHeatmapCell {
  count: number;
  hourLabel: string;
  intensity: number;
}

interface DashboardHeatmapRow {
  cells: DashboardHeatmapCell[];
  dayLabel: string;
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

export const DASHBOARD_TIME_RANGE_OPTIONS: Array<{ label: string; value: DashboardTimeRange }> = [
  { label: "今日", value: "today" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
  { label: "近 3 个月", value: "quarter" },
];

export const DASHBOARD_GRANULARITY_OPTIONS: Array<{ label: string; value: DashboardGranularity }> =
  [
    { label: "按天", value: "day" },
    { label: "按周", value: "week" },
    { label: "按月", value: "month" },
  ];

export const DASHBOARD_PRD_OPTIONS: DashboardPrdOption[] = [
  {
    activityMultiplier: 1,
    automationRatio: 0.26,
    employeeWeights: {},
    key: "all",
    label: "全部 PRD",
    resultKeywords: [],
    tokenMultiplier: 1,
    userWeights: {},
  },
  {
    activityMultiplier: 1.14,
    automationRatio: 0.34,
    employeeWeights: {
      "employee-ops": 1.28,
      "employee-pm": 1.42,
      "employee-research": 1.08,
    },
    key: "frontis-web-v01",
    label: "FrontisAI Web PRD v0.1",
    resultKeywords: ["prd", "需求", "验收", "checklist"],
    tokenMultiplier: 1.22,
    userWeights: {
      "user-admin-001": 1.24,
      "user-admin-002": 1.12,
      "user-member-001": 1.06,
    },
  },
  {
    activityMultiplier: 1.1,
    automationRatio: 0.22,
    employeeWeights: {
      "employee-designer": 1.24,
      "employee-pm": 1.36,
      "employee-research": 1.18,
    },
    key: "synclaw-window",
    label: "SynClaw 独立窗口 PRD",
    resultKeywords: ["独立窗口", "dialogue", "structure", "切换", "layout"],
    tokenMultiplier: 1.08,
    userWeights: {
      "user-admin-001": 1.18,
      "user-member-001": 1.08,
      "user-member-002": 1.14,
    },
  },
  {
    activityMultiplier: 0.92,
    automationRatio: 0.18,
    employeeWeights: {
      "employee-ops": 1.22,
      "employee-pm": 1.08,
      "employee-writer": 1.18,
    },
    key: "artifact-panel",
    label: "成果面板接入 PRD",
    resultKeywords: ["成果", "artifact", "channel", "flow", "panel", "检查"],
    tokenMultiplier: 0.94,
    userWeights: {
      "user-admin-001": 1.08,
      "user-admin-002": 1.14,
      "user-member-002": 1.02,
    },
  },
];

export const DASHBOARD_LINE_CHART_WIDTH = 640;
export const DASHBOARD_LINE_CHART_HEIGHT = 260;
export const DASHBOARD_LINE_CHART_PADDING = {
  bottom: 34,
  left: 16,
  right: 16,
  top: 18,
} as const;

export const DEFAULT_SCHEDULED_TASKS: ScheduledTaskItem[] = [
  {
    employeeId: "employee-pm",
    frequency: "每日",
    id: "task-frontis-daily-1",
    instruction: "每天早上 9 点汇总昨天的产品需求变更，并整理成一段摘要。",
    lastRunSummary: "已输出昨日需求摘要，等待确认优先级。",
    name: "每日需求摘要",
    nextRunAt: "明天 09:00",
    runs: [
      {
        id: "task-frontis-daily-1-run-1",
        startedAt: "今天 09:00",
        status: "success",
        summary: "成功生成 1 份需求摘要并同步到当前对话成果面板。",
      },
      {
        id: "task-frontis-daily-1-run-2",
        startedAt: "昨天 09:00",
        status: "success",
        summary: "成功生成昨日需求汇总。",
      },
    ],
    status: "active",
  },
  {
    employeeId: "employee-research",
    frequency: "每周",
    id: "task-frontis-weekly-1",
    instruction: "每周一上午 10 点整理竞品动态，输出本周值得关注的更新。",
    lastRunSummary: "上周竞品动态已归档，待管理员查看。",
    name: "每周竞品追踪",
    nextRunAt: "下周一 10:00",
    runs: [
      {
        id: "task-frontis-weekly-1-run-1",
        startedAt: "本周一 10:00",
        status: "success",
        summary: "成功整理 3 条竞品更新并形成周报。",
      },
    ],
    status: "active",
  },
  {
    employeeId: "employee-writer",
    frequency: "单次",
    id: "task-frontis-once-1",
    instruction: "今晚 7 点整理会议纪要并同步到当前对话成果面板。",
    lastRunSummary: "等待下一次执行。",
    name: "整理会议纪要",
    nextRunAt: "今天 19:00",
    runs: [],
    status: "paused",
  },
];

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

const resolveResultPreviewKind = (artifact: SynClawArtifactItem): ResultPreviewKind => {
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
  role === "admin" ? "企业老板" : "普通员工";

export const getUserStatusLabel = (status: FrontisUserStatus): string =>
  status === "active" ? "已启用" : "已禁用";

export const getTaskStatusLabel = (status: ScheduledTaskStatus): string =>
  status === "active" ? "已启用" : "已暂停";

export const getTaskRunStatusLabel = (status: ScheduledTaskRunStatus): string => {
  if (status === "running") return "执行中";
  if (status === "failed") return "执行失败";
  return "执行成功";
};

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
  artifactsBySession: Record<string, SynClawArtifactItem[]>,
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

const buildAgentTokenRanking = (
  employees: EmployeeItem[],
  dialogueSessions: DialogueSessionItem[],
  resultRecords: ResultRecord[],
) =>
  employees
    .map((employee, index) => {
      const sessionCount = dialogueSessions.filter(item => item.employeeId === employee.id).length;
      const resultCount = resultRecords.filter(item => item.employeeId === employee.id).length;
      const tokens = sessionCount * 18000 + resultCount * 9500 + (index + 1) * 3200;
      return {
        cost: (tokens / 1000) * 0.018,
        employeeId: employee.id,
        name: employee.name,
        resultCount,
        tokens,
      };
    })
    .sort((left, right) => right.tokens - left.tokens);

const buildUserRanking = (users: FrontisWebUserItem[]) =>
  [...users].sort((left, right) => right.tokenUsage - left.tokenUsage);

export const resolveDashboardPrdOption = (key: DashboardPrdKey): DashboardPrdOption =>
  DASHBOARD_PRD_OPTIONS.find(item => item.key === key) ?? DASHBOARD_PRD_OPTIONS[0];

const getDashboardWeight = (weights: Record<string, number>, id: string): number => {
  if (!Object.keys(weights).length) {
    return 1;
  }
  return weights[id] ?? 0.78;
};

const resolveDashboardLabels = (
  timeRange: DashboardTimeRange,
  granularity: DashboardGranularity,
): string[] => {
  if (timeRange === "today") {
    return ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  }

  if (timeRange === "week" && granularity === "day") {
    return ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  }

  if (timeRange === "week" && granularity === "week") {
    return ["W1", "W2", "W3", "W4", "W5"];
  }

  if (timeRange === "month" && granularity === "day") {
    return ["03/01", "03/05", "03/09", "03/13", "03/17", "03/21", "03/25", "03/29"];
  }

  if (timeRange === "month" && granularity === "week") {
    return ["第 1 周", "第 2 周", "第 3 周", "第 4 周", "第 5 周"];
  }

  if (timeRange === "quarter" && granularity === "day") {
    return ["01/18", "02/01", "02/14", "02/28", "03/10", "03/18", "03/27"];
  }

  if (timeRange === "quarter" && granularity === "week") {
    return ["W1", "W3", "W5", "W7", "W9", "W11", "W13"];
  }

  if (timeRange === "quarter" && granularity === "month") {
    return ["1 月", "2 月", "3 月"];
  }

  return ["1 月", "2 月", "3 月", "4 月"];
};

const buildDistributedSeries = (
  total: number,
  pointCount: number,
  phase: number,
  emphasisIndex: number,
): number[] => {
  if (pointCount <= 0) {
    return [];
  }

  const safeTotal = Math.max(0, total);
  const weights = Array.from({ length: pointCount }, (_, index) => {
    const position = pointCount === 1 ? 0 : index / (pointCount - 1);
    const wave = Math.sin(position * Math.PI * 1.4 + phase) * 0.24;
    const trend = 0.92 + position * 0.28;
    const spike = index === emphasisIndex ? 0.3 : 0;
    return Math.max(0.35, trend + wave + spike);
  });
  const weightSum = weights.reduce((sum, item) => sum + item, 0);
  let allocated = 0;

  return weights.map((weight, index) => {
    if (index === pointCount - 1) {
      return Math.max(0, safeTotal - allocated);
    }

    const value = Math.max(0, Math.round((safeTotal * weight) / weightSum));
    allocated += value;
    return value;
  });
};

export const buildDashboardTimeline = (
  resultRecords: ResultRecord[],
  timeRange: DashboardTimeRange,
  granularity: DashboardGranularity,
  prdOption: DashboardPrdOption,
  users: FrontisWebUserItem[],
): DashboardTimelinePoint[] => {
  const labels = resolveDashboardLabels(timeRange, granularity);
  const emphasisIndex = Math.max(1, Math.floor(labels.length * 0.68));
  const totalUserTokens = users.reduce((sum, item) => sum + item.tokenUsage, 0);
  const totalDialogues = users.reduce((sum, item) => sum + item.dialogueCount, 0);
  const totalResults = users.reduce((sum, item) => sum + item.resultCount, 0);
  const timeFactorMap: Record<DashboardTimeRange, number> = {
    month: 1,
    quarter: 2.25,
    today: 0.22,
    week: 0.56,
  };

  const tokenTotal = Math.max(
    12000,
    Math.round(totalUserTokens * timeFactorMap[timeRange] * prdOption.tokenMultiplier),
  );
  const dialogueTotal = Math.max(
    8,
    Math.round(totalDialogues * timeFactorMap[timeRange] * prdOption.activityMultiplier),
  );
  const automationTotal = Math.max(1, Math.round(dialogueTotal * prdOption.automationRatio));
  const resultTotal = Math.max(
    1,
    Math.round(totalResults * timeFactorMap[timeRange] * prdOption.activityMultiplier * 0.52),
  );

  const tokenSeries = buildDistributedSeries(
    tokenTotal,
    labels.length,
    granularity === "month" ? 0.8 : 0.22,
    emphasisIndex,
  );
  const dialogueSeries = buildDistributedSeries(
    dialogueTotal,
    labels.length,
    0.54,
    emphasisIndex - 1,
  );
  const automationSeries = buildDistributedSeries(automationTotal, labels.length, 1.02, 1);
  const resultSeries = buildDistributedSeries(resultTotal, labels.length, 0.7, emphasisIndex);

  return labels.map((label, index) => {
    const tokens = tokenSeries[index] ?? 0;
    return {
      automationTasks: automationSeries[index] ?? 0,
      cost: Number(((tokens / 1000) * 0.018).toFixed(2)),
      dialogues: dialogueSeries[index] ?? 0,
      label,
      results: resultSeries[index] ?? 0,
      tokens,
    };
  });
};

export const buildDashboardMetricCards = (
  activeUsers: number,
  timeRange: DashboardTimeRange,
  timeline: DashboardTimelinePoint[],
  totalUsers: number,
  prdKey: DashboardPrdKey,
): DashboardMetricCardItem[] => {
  const totalTokens = timeline.reduce((sum, item) => sum + item.tokens, 0);
  const totalCost = timeline.reduce((sum, item) => sum + item.cost, 0);
  const totalDialogues = timeline.reduce((sum, item) => sum + item.dialogues, 0);
  const totalTasks = timeline.reduce((sum, item) => sum + item.dialogues + item.automationTasks, 0);
  const adoptionRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const baseDeltaMap: Record<DashboardTimeRange, number> = {
    month: 6,
    quarter: 13,
    today: 11,
    week: 8,
  };
  const prdDeltaBias: Record<DashboardPrdKey, number> = {
    all: 0,
    "artifact-panel": -1,
    "frontis-web-v01": 3,
    "synclaw-window": 2,
  };
  const baseDelta = baseDeltaMap[timeRange] + prdDeltaBias[prdKey];

  return [
    {
      delta: baseDelta + 2,
      hint: "主看 Token 走势与峰值时段",
      label: "Token 总消耗",
      value: totalTokens.toLocaleString(),
    },
    {
      delta: baseDelta + 1,
      hint: `预估费用 ￥${totalCost.toFixed(1)}`,
      label: "预估总费用",
      value: `￥${totalCost.toFixed(1)}`,
    },
    {
      delta: baseDelta - 1,
      hint: "员工对话和指令轮次汇总",
      label: "总对话次数",
      value: totalDialogues.toLocaleString(),
    },
    {
      delta: baseDelta + 4,
      hint: "对话任务与自动化任务合并统计",
      label: "任务完成数",
      value: totalTasks.toLocaleString(),
    },
    {
      delta: Math.max(-3, baseDelta - 4),
      hint: `${activeUsers}/${totalUsers} 名员工在当前口径下活跃`,
      label: "活跃员工数",
      value: activeUsers.toString(),
    },
    {
      delta: Math.max(-2, baseDelta - 3),
      hint: "有过对话行为的员工占比",
      label: "AI 采纳率",
      value: `${adoptionRate}%`,
    },
  ];
};

export const buildDashboardRankingRows = (
  dimension: DashboardRankingDimension,
  dialogueSessions: DialogueSessionItem[],
  employees: EmployeeItem[],
  prdOption: DashboardPrdOption,
  resultRecords: ResultRecord[],
  timeRange: DashboardTimeRange,
  users: FrontisWebUserItem[],
): DashboardRankingRow[] => {
  const timeFactorMap: Record<DashboardTimeRange, number> = {
    month: 1,
    quarter: 2.1,
    today: 0.24,
    week: 0.58,
  };
  const scaleFactor = timeFactorMap[timeRange] * prdOption.tokenMultiplier;

  if (dimension === "user") {
    return buildUserRanking(users)
      .map(item => {
        const weightedTokens = Math.max(
          0,
          Math.round(
            item.tokenUsage * scaleFactor * getDashboardWeight(prdOption.userWeights, item.id),
          ),
        );
        const weightedDialogues = Math.max(
          0,
          Math.round(item.dialogueCount * timeFactorMap[timeRange]),
        );

        return {
          id: item.id,
          label: item.name,
          meta: `${getRoleLabel(item.role)} · ${weightedTokens.toLocaleString()} Tokens`,
          value: weightedTokens,
          valueLabel: `${weightedDialogues} 次`,
        };
      })
      .sort((left, right) => right.value - left.value)
      .slice(0, 5);
  }

  return buildAgentTokenRanking(employees, dialogueSessions, resultRecords)
    .map(item => {
      const weightedTokens = Math.max(
        0,
        Math.round(
          item.tokens *
            scaleFactor *
            getDashboardWeight(prdOption.employeeWeights, item.employeeId),
        ),
      );
      return {
        id: item.employeeId,
        label: item.name,
        meta: `${weightedTokens.toLocaleString()} Tokens · 产出 ${item.resultCount} 份成果`,
        value: weightedTokens,
        valueLabel: `￥${((weightedTokens / 1000) * 0.018).toFixed(1)}`,
      };
    })
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);
};

export const buildDashboardTaskRows = (
  employees: EmployeeItem[],
  prdOption: DashboardPrdOption,
  resultRecords: ResultRecord[],
  timeRange: DashboardTimeRange,
): DashboardTaskRow[] => {
  const timeFactorMap: Record<DashboardTimeRange, number> = {
    month: 1,
    quarter: 2.2,
    today: 0.24,
    week: 0.58,
  };

  return employees
    .map((employee, index) => {
      const resultCount = resultRecords.filter(item => item.employeeId === employee.id).length;
      const weight = getDashboardWeight(prdOption.employeeWeights, employee.id);
      const success = Math.max(
        1,
        Math.round((resultCount * 4 + 3 + index) * timeFactorMap[timeRange] * weight),
      );
      const failed = Math.max(
        0,
        Math.round((employee.status === "paused" ? 2.4 : 0.8) + index * 0.4),
      );
      return {
        failed,
        id: employee.id,
        name: employee.name,
        success,
        total: success + failed,
      };
    })
    .sort((left, right) => right.total - left.total)
    .slice(0, 4);
};

export const buildDashboardFunnelSteps = (
  activeUsers: number,
  timeRange: DashboardTimeRange,
  totalUsers: number,
): DashboardFunnelStep[] => {
  const loggedInUsers = Math.max(activeUsers, Math.min(totalUsers, totalUsers - 1));
  const weekActiveDeduction = timeRange === "today" ? 1 : timeRange === "quarter" ? 0 : 1;
  const weeklyActiveUsers = Math.max(0, Math.min(activeUsers, activeUsers - weekActiveDeduction));

  return [
    {
      hint: "租户已开通账号",
      label: "总员工数",
      value: totalUsers,
    },
    {
      hint: "至少完成过一次登录",
      label: "已登录员工",
      value: loggedInUsers,
    },
    {
      hint: "有过真实对话行为",
      label: "有对话行为",
      value: activeUsers,
    },
    {
      hint: "最近一周仍在回访使用",
      label: "本周活跃",
      value: weeklyActiveUsers,
    },
  ];
};

export const buildDashboardHeatmap = (
  activeUsers: number,
  prdOption: DashboardPrdOption,
  timeline: DashboardTimelinePoint[],
): DashboardHeatmapRow[] => {
  const dayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const totalDialogues = timeline.reduce((sum, item) => sum + item.dialogues, 0);
  const primaryPeak =
    prdOption.key === "artifact-panel" ? 14 : prdOption.key === "synclaw-window" ? 11 : 16;
  const secondaryPeak = prdOption.key === "frontis-web-v01" ? 19 : 10;

  return dayLabels.map((dayLabel, dayIndex) => ({
    cells: Array.from({ length: 24 }, (_, hour) => {
      const workdayFactor = dayIndex < 5 ? 1 : 0.58;
      const hourOffsetPrimary = Math.abs(hour - primaryPeak);
      const hourOffsetSecondary = Math.abs(hour - secondaryPeak);
      const baseIntensity =
        Math.max(0, 1 - hourOffsetPrimary / 8) * 0.68 +
        Math.max(0, 1 - hourOffsetSecondary / 10) * 0.28;
      const normalizedIntensity = Math.min(
        1,
        Math.max(0.08, baseIntensity * workdayFactor * prdOption.activityMultiplier),
      );
      return {
        count: Math.round((totalDialogues / 34) * normalizedIntensity + activeUsers * 0.3),
        hourLabel: `${hour.toString().padStart(2, "0")}:00`,
        intensity: normalizedIntensity,
      };
    }),
    dayLabel,
  }));
};

const renderResultPreview = (artifact: ResultRecord): JSX.Element => {
  if (artifact.previewKind === "markdown") {
    return (
      <div className={styles.markdownShell}>
        <MarkdownRenderer source={decodeDataUrlContent(artifact.canonicalPath)} />
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
