/**
 * 自动化任务展示状态。
 */
export type AutomationTaskDisplayStatus = "pending" | "running" | "failed" | "completed";

/**
 * 自动化任务触发类型。
 */
export type AutomationTaskTriggerType = "once" | "daily" | "every" | "cron" | "recurring";

export type AutomationTaskScheduleKind = "at" | "every" | "cron";

export type AutomationTaskSchedulePayload =
  | { kind: "at"; at: string }
  | { kind: "every"; everyMs: number; anchorMs?: number }
  | { kind: "cron"; expr: string; tz?: string };

/**
 * 自动化任务附件信息。
 */
export interface AutomationTaskAttachmentInfo {
  attachmentId: number;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

/**
 * 自动化任务列表项。
 */
export interface AutomationTaskInfo {
  taskId: number;
  taskCode: string;
  title: string;
  description: string;
  channelWorkspaceId: string;
  channelWorkspaceName: string;
  channelId: string;
  channelName: string;
  executorAgentId: number;
  executorAgentName: string;
  sessionTarget?: "current" | "silent";
  sessionKey?: string;
  triggerType: AutomationTaskTriggerType;
  startTime?: string;
  scheduleKind?: AutomationTaskScheduleKind;
  schedulePayload?: AutomationTaskSchedulePayload;
  scheduleSummary?: string;
  nextRunAt?: string;
  status?: string;
  summaryStatus?: string;
  displayStatus: AutomationTaskDisplayStatus;
  latestRunStatus: string;
  runCount: number;
  attachments: AutomationTaskAttachmentInfo[];
  lastRunAt?: string;
  lastActivityAt?: string;
  updatedAt?: string;
  inventory?: {
    externalJobId?: string;
    enabledObserved?: boolean;
    nextRunAtObserved?: string;
    runningAtObserved?: string;
    lastRunAtObserved?: string;
    lastRunStatusObserved?: string;
    lastDeliveryStatusObserved?: string;
    consecutiveErrors?: number;
    driftStatus?: string;
    lastReportedAt?: string;
    lastError?: unknown;
  };
}

/**
 * 自动化任务执行记录。
 */
export interface AutomationTaskRunInfo {
  runId: number;
  taskId: number;
  externalRunId?: string;
  sequence: number;
  taskTime?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  status: string;
  result: string;
  triggerSource?: string;
  channelRequestId?: string;
  channelRunId?: string;
  resultBlockId?: string;
}

/**
 * 自动化任务右侧快速筛选键。
 */
export type AutomationTaskQuickFilterKey = "all" | AutomationTaskDisplayStatus;

/**
 * 自动化任务统计信息。
 */
export interface AutomationTaskStats {
  all: number;
  running: number;
  completed: number;
  pending: number;
  failed: number;
}

/**
 * 执行记录分页状态。
 */
export interface AutomationTaskRunPageState {
  items: AutomationTaskRunInfo[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
}
