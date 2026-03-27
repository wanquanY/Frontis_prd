import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import dayjs, { type Dayjs } from "dayjs";
import classNames from "classnames";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { DatePicker, Empty, Input, InputNumber, Modal, Pagination, Select, message } from "antd";

import { CommonButton } from "@/components/CommonButton/CommonButton";
import type {
  AutomationTaskDisplayStatus,
  AutomationTaskQuickFilterKey,
} from "@/feature/automation-task/types";
import type { WorkspaceComposerAttachmentItem } from "@/feature/workspace/types";
import { isChatAttachmentFileAllowed } from "@/utils/chatAttachmentFileTypes";
import { formatFileSize } from "@/utils/file";
import { resolveFileLogo } from "@/utils/fileLogo";

import { INITIAL_AUTOMATION_TASK_EXAMPLES } from "@/mocks/mockData";
import {
  createComposerAttachment,
  getAvatarText,
  revokeComposerAttachmentPreview,
} from "../utils";
import type { DialogueSessionItem, EmployeeItem } from "../types";
import automationStyles from "@/feature/automation-task/components/AutomationTaskView.module.less";
import localStyles from "./AutomationTaskView.module.less";

type TaskStatus = "active" | "paused" | "draft";
type ScheduleKind = "at" | "every" | "cron";
type ScheduleKindFilter = "all" | ScheduleKind;
type BindingMode = "newSession" | "session";
type BindingModeFilter = "all" | BindingMode;

/**
 * 自动化任务页参数。
 */
interface AutomationTaskViewProps {
  employees: EmployeeItem[];
  dialogueSessions: DialogueSessionItem[];
}

interface TaskAttachmentItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
}

interface TaskRunItem {
  id: string;
  sequence: number;
  taskTime: string;
  status: AutomationTaskDisplayStatus;
  result: string;
}

interface TaskItem {
  taskId: number;
  title: string;
  description: string;
  executorAgentId: string;
  bindingMode: BindingMode;
  sessionId?: string;
  scheduleKind: ScheduleKind;
  scheduleSummary: string;
  nextRunAt?: string;
  startTime?: string;
  status: TaskStatus;
  displayStatus: AutomationTaskDisplayStatus;
  runCount: number;
  lastRunAt?: string;
  attachments: TaskAttachmentItem[];
  runs: TaskRunItem[];
}

interface TaskDraftState {
  title: string;
  description: string;
  agentId: string;
  bindingMode: BindingMode;
  sessionId: string;
  scheduleKind: ScheduleKind;
  everyMinutes: number;
  cronExpr: string;
  startTime: Dayjs | null;
}

type TaskModalMode = "create" | "edit" | null;

const PAGE_SIZE = 5;

const TASK_STATUS_LABEL: Record<AutomationTaskDisplayStatus, string> = {
  completed: "已完成",
  running: "执行中",
  pending: "待执行",
  failed: "失败",
};

const QUICK_FILTER_LABEL: Record<AutomationTaskQuickFilterKey, string> = {
  all: "全部任务",
  running: "执行中",
  completed: "已完成",
  pending: "待执行",
  failed: "失败",
};

const CONTEXT_MODE_META: Record<
  BindingMode,
  {
    title: string;
    description: string;
  }
> = {
  newSession: {
    title: "新会话",
    description: "任务执行时会在所选 Agent 下自动创建一个新会话并沉淀成果。",
  },
  session: {
    title: "绑定已有会话",
    description: "直接延续所选 Agent 的历史会话上下文和成果面板。",
  },
};

const DEFAULT_DRAFT = (): TaskDraftState => ({
  title: "",
  description: "",
  agentId: "",
  bindingMode: "newSession",
  sessionId: "",
  scheduleKind: "at",
  everyMinutes: 120,
  cronExpr: "0 10 * * 1-5",
  startTime: dayjs().add(1, "day").hour(9).minute(0).second(0),
});

const formatDateTime = (value?: string): string => {
  if (!value) return "--";
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "--";
  return parsed.format("MM-DD HH:mm");
};

const resolveScheduleSummary = (
  kind: ScheduleKind,
  startTime: Dayjs | null,
  everyMinutes: number,
  cronExpr: string,
): string => {
  if (kind === "at") {
    return startTime ? `单次 ${startTime.format("MM-DD HH:mm")}` : "单次";
  }
  if (kind === "every") {
    return `每 ${Math.max(1, everyMinutes)} 分钟`;
  }
  return cronExpr.trim() ? `Cron · ${cronExpr.trim()}` : "Cron";
};

const resolveBindingMode = (value: string): BindingMode => {
  if (value === "session") return "session";
  return "newSession";
};

const resolveScheduleKind = (value: string): ScheduleKind => {
  if (value === "every" || value === "cron") return value;
  return "at";
};

const resolveTaskStatus = (value: string): TaskStatus => {
  if (value === "paused" || value === "draft") return value;
  return "active";
};

const resolveDisplayStatus = (value: string): AutomationTaskDisplayStatus => {
  if (value === "running" || value === "failed" || value === "completed") return value;
  return "pending";
};

const normalizeExampleTask = (
  example: (typeof INITIAL_AUTOMATION_TASK_EXAMPLES)[number],
): TaskItem => ({
  taskId: example.taskId,
  title: example.title,
  description: example.description,
  executorAgentId: example.executorAgentId,
  bindingMode: resolveBindingMode(example.bindingMode),
  sessionId: example.sessionId,
  scheduleKind: resolveScheduleKind(example.scheduleKind),
  scheduleSummary: example.scheduleSummary,
  nextRunAt: example.nextRunAt,
  startTime: example.startTime,
  status: resolveTaskStatus(example.status),
  displayStatus: resolveDisplayStatus(example.displayStatus),
  runCount: example.runCount,
  lastRunAt: example.lastRunAt,
  attachments: example.attachments.map(item => ({
    id: item.id,
    name: item.name,
    size: item.size,
    mimeType: item.mimeType,
  })),
  runs: example.runs.map(item => ({
    id: item.id,
    sequence: item.sequence,
    taskTime: item.taskTime,
    status: resolveDisplayStatus(item.status),
    result: item.result,
  })),
});

const cloneAttachmentAsComposerItem = (
  attachment: TaskAttachmentItem,
): WorkspaceComposerAttachmentItem => ({
  uid: attachment.id,
  id: Number(Date.now()),
  name: attachment.name,
  size: attachment.size,
  mimeType: attachment.mimeType,
  percent: 100,
  status: "done",
  url: attachment.url,
});

/**
 * FrontisAI Web 自动化任务视图。
 */
export const AutomationTaskView = ({
  employees,
  dialogueSessions,
}: AutomationTaskViewProps): JSX.Element => {
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const latestDraftAttachmentsRef = useRef<WorkspaceComposerAttachmentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>(() =>
    INITIAL_AUTOMATION_TASK_EXAMPLES.map(normalizeExampleTask),
  );
  const [keyword, setKeyword] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [selectedBindingMode, setSelectedBindingMode] = useState<BindingModeFilter>("all");
  const [selectedScheduleKind, setSelectedScheduleKind] = useState<ScheduleKindFilter>("all");
  const [selectedQuickFilter, setSelectedQuickFilter] =
    useState<AutomationTaskQuickFilterKey>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedTaskId, setExpandedTaskId] = useState<number>();
  const [modalMode, setModalMode] = useState<TaskModalMode>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [draft, setDraft] = useState<TaskDraftState>(DEFAULT_DRAFT);
  const [draftAttachments, setDraftAttachments] = useState<WorkspaceComposerAttachmentItem[]>([]);

  useEffect(() => {
    latestDraftAttachmentsRef.current = draftAttachments;
  }, [draftAttachments]);

  useEffect(() => {
    return () => {
      latestDraftAttachmentsRef.current.forEach(revokeComposerAttachmentPreview);
    };
  }, []);

  const employeeById = useMemo(() => new Map(employees.map(item => [item.id, item])), [employees]);
  const sessionById = useMemo(
    () => new Map(dialogueSessions.map(item => [item.id, item])),
    [dialogueSessions],
  );
  const visibleEmployeeIdSet = useMemo(() => new Set(employees.map(item => item.id)), [employees]);

  const agentOptions = useMemo(
    () =>
      employees.map(item => ({
        label: item.name,
        value: item.id,
      })),
    [employees],
  );

  const draftSessionOptions = useMemo(
    () =>
      dialogueSessions.filter(item => item.employeeId === draft.agentId).map(item => ({
        label: `${item.title} · ${item.updatedAt}`,
        value: item.id,
      })),
    [dialogueSessions, draft.agentId],
  );

  const selectedDraftAgent = draft.agentId ? employeeById.get(draft.agentId) : undefined;
  const visibleTasks = useMemo(
    () => tasks.filter(task => visibleEmployeeIdSet.has(task.executorAgentId)),
    [tasks, visibleEmployeeIdSet],
  );
  const newSessionPreviewTitle = draft.title.trim() || "自动化任务新会话";

  useEffect(() => {
    if (selectedAgentId !== "all" && !visibleEmployeeIdSet.has(selectedAgentId)) {
      setSelectedAgentId("all");
    }
  }, [selectedAgentId, visibleEmployeeIdSet]);

  useEffect(() => {
    if (draft.agentId && !visibleEmployeeIdSet.has(draft.agentId)) {
      setDraft(prev => ({
        ...prev,
        agentId: "",
        sessionId: "",
        bindingMode: "newSession",
      }));
    }
  }, [draft.agentId, visibleEmployeeIdSet]);

  const filteredTasks = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return visibleTasks.filter(task => {
      if (selectedQuickFilter !== "all" && task.displayStatus !== selectedQuickFilter) return false;
      if (selectedAgentId !== "all" && task.executorAgentId !== selectedAgentId) return false;
      if (selectedBindingMode !== "all" && task.bindingMode !== selectedBindingMode) return false;
      if (selectedScheduleKind !== "all" && task.scheduleKind !== selectedScheduleKind) {
        return false;
      }
      if (!normalizedKeyword) return true;

      const agentName = employeeById.get(task.executorAgentId)?.name ?? "";
      const sessionTitle = task.sessionId ? (sessionById.get(task.sessionId)?.title ?? "") : "";
      const bindingLabel = task.bindingMode === "session" ? "已有会话" : "新会话";
      return [task.title, task.description, agentName, sessionTitle, bindingLabel]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword);
    });
  }, [
    employeeById,
    keyword,
    selectedAgentId,
    selectedBindingMode,
    selectedQuickFilter,
    selectedScheduleKind,
    sessionById,
    visibleTasks,
  ]);

  const pagedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredTasks]);

  const stats = useMemo(
    () => ({
      all: visibleTasks.length,
      running: visibleTasks.filter(item => item.displayStatus === "running").length,
      completed: visibleTasks.filter(item => item.displayStatus === "completed").length,
      pending: visibleTasks.filter(item => item.displayStatus === "pending").length,
      failed: visibleTasks.filter(item => item.displayStatus === "failed").length,
    }),
    [visibleTasks],
  );

  const successRateText = useMemo(() => {
    if (!stats.all) return "0%";
    return `${Math.round((stats.completed / stats.all) * 100)}%`;
  }, [stats.all, stats.completed]);

  const quickFilterItems = useMemo(
    () => [
      { key: "all" as const, count: stats.all, icon: <BarChartOutlined /> },
      { key: "running" as const, count: stats.running, icon: <ClockCircleOutlined /> },
      { key: "completed" as const, count: stats.completed, icon: <CheckCircleOutlined /> },
      { key: "pending" as const, count: stats.pending, icon: <ExclamationCircleOutlined /> },
      { key: "failed" as const, count: stats.failed, icon: <CloseCircleOutlined /> },
    ],
    [stats],
  );

  const createDisabled = useMemo(() => {
    if (!draft.agentId || !draft.title.trim()) return true;
    if (draft.bindingMode === "session" && !draft.sessionId) return true;
    if (draft.scheduleKind === "at" && !draft.startTime) return true;
    if (draft.scheduleKind === "every" && draft.everyMinutes < 1) return true;
    if (draft.scheduleKind === "cron" && !draft.cronExpr.trim()) return true;
    return false;
  }, [draft]);

  const subtitleText = `共 ${filteredTasks.length} 个任务`;

  const cleanupDraftAttachments = useCallback((attachments: WorkspaceComposerAttachmentItem[]) => {
    attachments.forEach(revokeComposerAttachmentPreview);
  }, []);

  const resetDraftState = useCallback((): void => {
    cleanupDraftAttachments(latestDraftAttachmentsRef.current);
    setDraft(DEFAULT_DRAFT());
    setDraftAttachments([]);
    setEditingTaskId(null);
  }, [cleanupDraftAttachments]);

  const openCreateModal = useCallback((): void => {
    resetDraftState();
    setModalMode("create");
  }, [resetDraftState]);

  const closeTaskModal = useCallback((): void => {
    setModalMode(null);
    resetDraftState();
  }, [resetDraftState]);

  const handleDraftValueChange = useCallback(
    <TKey extends keyof TaskDraftState>(key: TKey, value: TaskDraftState[TKey]): void => {
      setDraft(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleDraftAgentChange = useCallback((value: string): void => {
    setDraft(prev => ({
      ...prev,
      agentId: value,
      sessionId:
        prev.bindingMode === "session" &&
        dialogueSessions.some(
          item => item.id === prev.sessionId && item.employeeId === value,
        )
          ? prev.sessionId
          : "",
    }));
  }, [dialogueSessions]);

  const handleDraftBindingModeChange = useCallback((mode: BindingMode): void => {
    setDraft(prev => ({
      ...prev,
      bindingMode: mode,
      sessionId: mode === "session" ? prev.sessionId : "",
    }));
  }, []);

  const buildAllowedAttachments = useCallback(
    (files?: FileList | File[] | null): WorkspaceComposerAttachmentItem[] => {
      const existingKeys = new Set(draftAttachments.map(item => `${item.name}-${item.size}`));
      return Array.from(files ?? []).reduce<WorkspaceComposerAttachmentItem[]>((result, file) => {
        if (!isChatAttachmentFileAllowed(file)) {
          return result;
        }
        const fileKey = `${file.name}-${file.size}`;
        if (existingKeys.has(fileKey)) {
          return result;
        }
        existingKeys.add(fileKey);
        result.push(createComposerAttachment(file));
        return result;
      }, []);
    },
    [draftAttachments],
  );

  const handleDraftAttachmentsSelected = useCallback(
    (files?: FileList | File[] | null): void => {
      const nextAttachments = buildAllowedAttachments(files);
      if (!nextAttachments.length) return;
      setDraftAttachments(prev => [...prev, ...nextAttachments]);
    },
    [buildAllowedAttachments],
  );

  const handleDraftFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      handleDraftAttachmentsSelected(event.currentTarget.files);
      event.currentTarget.value = "";
    },
    [handleDraftAttachmentsSelected],
  );

  const handleRemoveDraftAttachment = useCallback((uid: string): void => {
    setDraftAttachments(prev => {
      const target = prev.find(item => item.uid === uid);
      if (target) {
        revokeComposerAttachmentPreview(target);
      }
      return prev.filter(item => item.uid !== uid);
    });
  }, []);

  const handleOpenAttachmentPicker = useCallback((): void => {
    attachmentInputRef.current?.click();
  }, []);

  const handleAttachmentDragOver = useCallback((event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
  }, []);

  const handleAttachmentDrop = useCallback(
    (event: DragEvent<HTMLElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      handleDraftAttachmentsSelected(event.dataTransfer?.files);
    },
    [handleDraftAttachmentsSelected],
  );

  const handleAttachmentKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handleOpenAttachmentPicker();
    },
    [handleOpenAttachmentPicker],
  );

  const resolveTaskContextSummary = useCallback(
    (task: TaskItem): string => {
      if (task.bindingMode === "session") {
        const sessionTitle = task.sessionId
          ? (sessionById.get(task.sessionId)?.title ?? "指定会话")
          : "指定会话";
        return `绑定会话 · ${sessionTitle}`;
      }
      return "执行时创建新会话";
    },
    [sessionById],
  );

  const buildTaskFromDraft = useCallback(
    (taskId: number, existingTask?: TaskItem): TaskItem => {
      const scheduleSummary = resolveScheduleSummary(
        draft.scheduleKind,
        draft.startTime,
        draft.everyMinutes,
        draft.cronExpr,
      );
      const nextRunAt = draft.startTime?.toISOString();
      const attachments = draftAttachments.map(item => ({
        id: item.uid,
        name: item.name,
        size: item.size,
        mimeType: item.mimeType,
        url: item.url,
      }));

      return {
        taskId,
        title: draft.title.trim(),
        description: draft.description.trim(),
        executorAgentId: draft.agentId,
        bindingMode: draft.bindingMode,
        sessionId: draft.bindingMode === "session" ? draft.sessionId : undefined,
        scheduleKind: draft.scheduleKind,
        scheduleSummary,
        nextRunAt,
        startTime: nextRunAt,
        status: existingTask?.status ?? "active",
        displayStatus:
          existingTask?.status === "paused"
            ? "pending"
            : (existingTask?.displayStatus ?? "pending"),
        runCount: existingTask?.runCount ?? 0,
        lastRunAt: existingTask?.lastRunAt,
        attachments,
        runs: existingTask?.runs ?? [],
      };
    },
    [draft, draftAttachments],
  );

  const handleCreateTaskSubmit = useCallback((): void => {
    if (createDisabled) return;
    const nextTaskId = Date.now();
    const nextTask = buildTaskFromDraft(nextTaskId);
    setTasks(prev => [nextTask, ...prev]);
    setCurrentPage(1);
    closeTaskModal();
    message.success("已创建自动化任务");
  }, [buildTaskFromDraft, closeTaskModal, createDisabled]);

  const handleOpenEditModal = useCallback(
    (task: TaskItem): void => {
      cleanupDraftAttachments(latestDraftAttachmentsRef.current);
      setDraft({
        title: task.title,
        description: task.description,
        agentId: task.executorAgentId,
        bindingMode: task.bindingMode,
        sessionId: task.sessionId ?? "",
        scheduleKind: task.scheduleKind,
        everyMinutes:
          task.scheduleKind === "every"
            ? Number(/每\s*(\d+)/.exec(task.scheduleSummary)?.[1] ?? "120")
            : 120,
        cronExpr:
          task.scheduleKind === "cron"
            ? task.scheduleSummary.replace(/^Cron · /, "")
            : "0 10 * * 1-5",
        startTime: task.startTime ? dayjs(task.startTime) : dayjs().add(1, "day").hour(9).minute(0),
      });
      setDraftAttachments(task.attachments.map(cloneAttachmentAsComposerItem));
      setEditingTaskId(task.taskId);
      setModalMode("edit");
    },
    [cleanupDraftAttachments],
  );

  const handleUpdateTaskSubmit = useCallback((): void => {
    if (!editingTaskId || createDisabled) return;
    setTasks(prev =>
      prev.map(item =>
        item.taskId === editingTaskId ? buildTaskFromDraft(item.taskId, item) : item,
      ),
    );
    closeTaskModal();
    message.success("已更新自动化任务");
  }, [buildTaskFromDraft, closeTaskModal, createDisabled, editingTaskId]);

  const handlePauseResumeTask = useCallback((taskId: number): void => {
    setTasks(prev =>
      prev.map(item => {
        if (item.taskId !== taskId) return item;
        const nextStatus: TaskStatus = item.status === "paused" ? "active" : "paused";
        return {
          ...item,
          status: nextStatus,
          displayStatus: nextStatus === "paused" ? "pending" : "running",
        };
      }),
    );
  }, []);

  const handleRunNowTask = useCallback(
    (taskId: number): void => {
      const runAt = dayjs().toISOString();
      setTasks(prev =>
        prev.map(item => {
          if (item.taskId !== taskId) return item;
          const nextSequence = item.runs[0]?.sequence
            ? item.runs[0].sequence + 1
            : item.runCount + 1;
          return {
            ...item,
            status: "active",
            displayStatus: "completed",
            runCount: item.runCount + 1,
            lastRunAt: runAt,
            runs: [
              {
                id: `run-${item.taskId}-${nextSequence}`,
                sequence: nextSequence,
                taskTime: runAt,
                status: "completed",
                result: `${employeeById.get(item.executorAgentId)?.name ?? "Agent"} 已完成这次模拟执行。`,
              },
              ...item.runs,
            ],
          };
        }),
      );
      message.success("已模拟执行一次任务");
    },
    [employeeById],
  );

  const handleDeleteTask = useCallback((taskId: number): void => {
    setTasks(prev => prev.filter(item => item.taskId !== taskId));
    setExpandedTaskId(prev => (prev === taskId ? undefined : prev));
    message.success("已删除自动化任务");
  }, []);

  const handleDeleteTaskConfirm = useCallback(
    (taskId: number): void => {
      Modal.confirm({
        title: "删除任务",
        content: "确认删除该自动化任务吗？",
        okText: "删除",
        okButtonProps: { danger: true },
        cancelText: "取消",
        onOk: async () => {
          handleDeleteTask(taskId);
        },
      });
    },
    [handleDeleteTask],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, selectedAgentId, selectedBindingMode, selectedQuickFilter, selectedScheduleKind]);

  const renderTaskAttachmentList = (attachments: TaskAttachmentItem[]): JSX.Element => {
    if (!attachments.length) {
      return <span className={automationStyles.noAttachment}>无附件</span>;
    }

    return (
      <>
        {attachments.map(attachment => {
          const logo = resolveFileLogo(attachment.name);
          return (
            <span key={attachment.id} className={automationStyles.attachmentItem}>
              <img src={logo.src} className={automationStyles.attachmentIcon} alt={logo.alt} />
              <span className={automationStyles.attachmentText}>
                {attachment.name} · {formatFileSize(attachment.size)}
              </span>
            </span>
          );
        })}
      </>
    );
  };

  return (
    <div className={automationStyles.page}>
      <div className={automationStyles.contentCard}>
        <div className={automationStyles.contentHeader}>
          <div className={automationStyles.contentHeaderLeading}>
            <h1 className={automationStyles.title}>自动化</h1>
            <span className={automationStyles.subtitle}>{subtitleText}</span>
          </div>
        </div>

        <div className={automationStyles.contentBody}>
          <div className={automationStyles.mainColumn}>
            <div className={automationStyles.filtersRow}>
              <div className={automationStyles.filterGroup}>
                <Select<string>
                  value={selectedAgentId}
                  className={automationStyles.filterSelect}
                  suffixIcon={<DownOutlined className={automationStyles.filterArrow} />}
                  options={[{ label: "全部 Agent", value: "all" }, ...agentOptions]}
                  onChange={value => setSelectedAgentId(value)}
                  popupMatchSelectWidth={false}
                  optionFilterProp="label"
                  showSearch={true}
                  prefix={<RobotOutlined className={automationStyles.filterPrefixIcon} />}
                />

                <Select<string>
                  value={selectedBindingMode}
                  className={automationStyles.filterSelect}
                  suffixIcon={<DownOutlined className={automationStyles.filterArrow} />}
                  options={[
                    { label: "全部会话", value: "all" },
                    { label: "新会话", value: "newSession" },
                    { label: "已有会话", value: "session" },
                  ]}
                  onChange={value => setSelectedBindingMode(value as BindingModeFilter)}
                  popupMatchSelectWidth={false}
                  optionFilterProp="label"
                  showSearch={true}
                  prefix={<MessageOutlined className={automationStyles.filterPrefixIcon} />}
                />

                <Select<string>
                  value={selectedScheduleKind}
                  className={automationStyles.filterSelect}
                  suffixIcon={<DownOutlined className={automationStyles.filterArrow} />}
                  options={[
                    { label: "全部周期", value: "all" },
                    { label: "单次", value: "at" },
                    { label: "间隔", value: "every" },
                    { label: "Cron", value: "cron" },
                  ]}
                  onChange={value => setSelectedScheduleKind(value as ScheduleKindFilter)}
                  popupMatchSelectWidth={false}
                  optionFilterProp="label"
                  showSearch={true}
                  prefix={<ClockCircleOutlined className={automationStyles.filterPrefixIcon} />}
                />
              </div>

              <Input
                value={keyword}
                className={automationStyles.searchInput}
                placeholder="搜索任务"
                prefix={<SearchOutlined className={automationStyles.searchIcon} />}
                allowClear={true}
                onChange={event => setKeyword(event.target.value)}
              />
            </div>

            <section className={automationStyles.tableWrap} aria-label="FrontisAI 自动化任务列表">
              <div className={automationStyles.tableHeader}>
                <div className={automationStyles.taskColHeader}>任务</div>
                <div>执行者</div>
                <div>周期</div>
                <div>下次执行</div>
                <div>执行状态</div>
                <div>记录数</div>
              </div>

              <div className={automationStyles.tableBody}>
                {pagedTasks.length ? (
                  pagedTasks.map(task => {
                    const isExpanded = expandedTaskId === task.taskId;
                    const executorName =
                      employeeById.get(task.executorAgentId)?.name ?? "未命名 Agent";

                    return (
                      <div
                        key={task.taskId}
                        className={classNames(automationStyles.taskGroup, {
                          [automationStyles.taskGroupExpanded]: isExpanded,
                        })}
                      >
                        <div
                          className={automationStyles.taskRow}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setExpandedTaskId(prev =>
                              prev === task.taskId ? undefined : task.taskId,
                            )
                          }
                          onKeyDown={event => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            setExpandedTaskId(prev =>
                              prev === task.taskId ? undefined : task.taskId,
                            );
                          }}
                        >
                          <div className={automationStyles.taskCell}>
                            <span className={automationStyles.expandButton} aria-hidden>
                              <DownOutlined
                                className={
                                  isExpanded
                                    ? automationStyles.expandIcon
                                    : automationStyles.expandIconCollapsed
                                }
                              />
                            </span>
                            <div className={automationStyles.taskInfo}>
                              <div className={automationStyles.taskTitle}>{task.title}</div>
                              <div className={automationStyles.taskDesc}>{task.description}</div>
                            </div>
                          </div>

                          <div className={automationStyles.baseText}>{executorName}</div>
                          <div className={automationStyles.baseText}>{task.scheduleSummary}</div>
                          <div className={automationStyles.baseText}>
                            {formatDateTime(task.nextRunAt || task.startTime)}
                          </div>
                          <div>
                            <span
                              className={classNames(automationStyles.statusPill, {
                                [automationStyles.statusCompleted]:
                                  task.displayStatus === "completed",
                                [automationStyles.statusRunning]: task.displayStatus === "running",
                                [automationStyles.statusPending]: task.displayStatus === "pending",
                                [automationStyles.statusFailed]: task.displayStatus === "failed",
                              })}
                            >
                              {TASK_STATUS_LABEL[task.displayStatus]}
                            </span>
                          </div>
                          <div className={automationStyles.baseText}>{task.runCount}</div>
                        </div>

                        {isExpanded ? (
                          <div className={automationStyles.expandPanel}>
                            <div className={localStyles.taskContextSummary}>
                              <span className={localStyles.taskContextPill}>
                                {resolveTaskContextSummary(task)}
                              </span>
                              <span className={localStyles.taskContextPill}>
                                最近执行：{formatDateTime(task.lastRunAt)}
                              </span>
                            </div>

                            <div className={automationStyles.attachmentsRow}>
                              <span className={automationStyles.attachmentsLabel}>附件：</span>
                              <div className={automationStyles.attachmentsList}>
                                {renderTaskAttachmentList(task.attachments)}
                              </div>
                            </div>

                            <div className={localStyles.bindingMetaGrid}>
                              <div className={localStyles.bindingMetaCard}>
                                <span className={localStyles.bindingMetaLabel}>绑定方式</span>
                                <span className={localStyles.bindingMetaValue}>
                                  {task.bindingMode === "session" ? "已有会话" : "新会话"}
                                </span>
                              </div>
                              <div className={localStyles.bindingMetaCard}>
                                <span className={localStyles.bindingMetaLabel}>执行 Agent</span>
                                <span className={localStyles.bindingMetaValue}>{executorName}</span>
                              </div>
                              <div className={localStyles.bindingMetaCard}>
                                <span className={localStyles.bindingMetaLabel}>下次执行</span>
                                <span className={localStyles.bindingMetaValue}>
                                  {formatDateTime(task.nextRunAt)}
                                </span>
                              </div>
                            </div>

                            <div className={automationStyles.taskActionsRow}>
                              <CommonButton
                                variant="confirm"
                                className={automationStyles.taskActionButton}
                                onClick={event => {
                                  event.stopPropagation();
                                  handleOpenEditModal(task);
                                }}
                              >
                                编辑
                              </CommonButton>
                              <CommonButton
                                variant="cancel"
                                className={automationStyles.taskActionButton}
                                onClick={event => {
                                  event.stopPropagation();
                                  handlePauseResumeTask(task.taskId);
                                }}
                              >
                                {task.status === "paused" ? "恢复" : "暂停"}
                              </CommonButton>
                              <CommonButton
                                variant="confirm"
                                className={automationStyles.taskActionButton}
                                onClick={event => {
                                  event.stopPropagation();
                                  handleRunNowTask(task.taskId);
                                }}
                              >
                                立即执行
                              </CommonButton>
                              <CommonButton
                                variant="danger"
                                className={automationStyles.taskActionButton}
                                onClick={event => {
                                  event.stopPropagation();
                                  handleDeleteTaskConfirm(task.taskId);
                                }}
                              >
                                删除
                              </CommonButton>
                            </div>

                            <div className={automationStyles.runTable}>
                              <div className={automationStyles.runHeader}>
                                <div>执行序号</div>
                                <div>任务时间</div>
                                <div>状态</div>
                                <div>结果</div>
                              </div>
                              <div className={automationStyles.runBody}>
                                {task.runs.length ? (
                                  task.runs.map(run => (
                                    <div key={run.id} className={automationStyles.runRow}>
                                      <div>#{run.sequence}</div>
                                      <div>{formatDateTime(run.taskTime)}</div>
                                      <div>
                                        <span
                                          className={classNames(automationStyles.runStatusPill, {
                                            [automationStyles.runStatusCompleted]:
                                              run.status === "completed",
                                            [automationStyles.runStatusRunning]:
                                              run.status === "running",
                                            [automationStyles.runStatusPending]:
                                              run.status === "pending",
                                            [automationStyles.runStatusFailed]:
                                              run.status === "failed",
                                          })}
                                        >
                                          {TASK_STATUS_LABEL[run.status]}
                                        </span>
                                      </div>
                                      <div
                                        className={automationStyles.runResult}
                                        title={run.result}
                                      >
                                        {run.result}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className={automationStyles.runEmpty}>
                                    <Empty
                                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                                      description="暂无执行记录"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className={automationStyles.emptyWrap}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={employees.length ? "暂无任务" : "当前账号暂未分配 Agent"}
                    />
                  </div>
                )}
              </div>

              <div className={automationStyles.tablePagination}>
                <Pagination
                  size="small"
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={filteredTasks.length}
                  showSizeChanger={false}
                  onChange={page => setCurrentPage(page)}
                />
              </div>
            </section>
          </div>

          <aside className={automationStyles.sideColumn}>
            <button
              type="button"
              className={automationStyles.createButton}
              disabled={!employees.length}
              onClick={openCreateModal}
            >
              <PlusOutlined className={automationStyles.createButtonIcon} />
              创建任务
            </button>

            <div className={automationStyles.statsCard}>
              <div className={automationStyles.cardTitleRow}>
                <BarChartOutlined className={automationStyles.cardTitleIcon} />
                <h3 className={automationStyles.cardTitle}>任务统计</h3>
              </div>

              <div className={automationStyles.statsContent}>
                <div className={automationStyles.statsItem}>
                  <div className={automationStyles.statsValue}>{stats.all}</div>
                  <div className={automationStyles.statsLabel}>总任务数</div>
                </div>
                <div className={automationStyles.statsItem}>
                  <div className={automationStyles.statsValueSuccess}>{successRateText}</div>
                  <div className={automationStyles.statsLabel}>执行成功率</div>
                </div>
              </div>
            </div>

            <div className={automationStyles.quickFilterCard}>
              <div className={automationStyles.cardTitleRow}>
                <CheckCircleFilled className={automationStyles.cardTitleIcon} />
                <h3 className={automationStyles.cardTitle}>快速筛选</h3>
              </div>

              <div className={automationStyles.quickFilterList}>
                {quickFilterItems.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    className={classNames(automationStyles.quickFilterItem, {
                      [automationStyles.quickFilterItemActive]: selectedQuickFilter === item.key,
                    })}
                    onClick={() => setSelectedQuickFilter(item.key)}
                  >
                    <span className={automationStyles.quickFilterInfo}>
                      <span
                        className={classNames(automationStyles.quickFilterIcon, {
                          [automationStyles.quickFilterIconRunning]: item.key === "running",
                          [automationStyles.quickFilterIconCompleted]: item.key === "completed",
                          [automationStyles.quickFilterIconPending]: item.key === "pending",
                          [automationStyles.quickFilterIconFailed]: item.key === "failed",
                        })}
                      >
                        {item.icon}
                      </span>
                      <span>{QUICK_FILTER_LABEL[item.key]}</span>
                    </span>
                    <span
                      className={classNames(automationStyles.quickFilterCount, {
                        [automationStyles.quickFilterCountActive]: selectedQuickFilter === item.key,
                      })}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Modal
        open={modalMode !== null}
        centered
        destroyOnClose={true}
        footer={null}
        closable={false}
        width={876}
        rootClassName={automationStyles.createTaskModal}
        onCancel={closeTaskModal}
      >
        <div className={classNames(automationStyles.modalCard, localStyles.modalThemeScope)}>
          <div className={automationStyles.modalHeader}>
            <h2 className={automationStyles.modalTitle}>
              {modalMode === "edit" ? "编辑任务" : "创建任务"}
            </h2>
            <button
              type="button"
              className={automationStyles.modalCloseButton}
              aria-label="关闭"
              onClick={closeTaskModal}
            >
              <CloseOutlined />
            </button>
          </div>

          <div className={automationStyles.modalBody}>
            <div className={automationStyles.formBlock}>
              <div className={automationStyles.formLabel}>Agent</div>
              <Select<string>
                value={draft.agentId || undefined}
                className={automationStyles.modalSelect}
                options={agentOptions}
                suffixIcon={<DownOutlined className={automationStyles.filterArrow} />}
                optionFilterProp="label"
                showSearch={true}
                placeholder="先选择一个 Agent"
                prefix={<RobotOutlined className={automationStyles.filterPrefixIcon} />}
                onChange={handleDraftAgentChange}
              />
              {selectedDraftAgent ? (
                <div className={localStyles.agentSummaryCard}>
                  <span className={localStyles.agentSummaryTitle}>
                    {selectedDraftAgent.name} · {getAvatarText(selectedDraftAgent.name)}
                  </span>
                  <span className={localStyles.agentSummaryMeta}>{selectedDraftAgent.role}</span>
                  <span className={localStyles.agentSummaryMeta}>{selectedDraftAgent.summary}</span>
                </div>
              ) : (
                <div className={automationStyles.formHint}>
                  先选 Agent，再决定绑定已有会话，还是为任务创建一个新会话。
                </div>
              )}
            </div>

            <div className={automationStyles.formBlock}>
              <label className={automationStyles.formLabel} htmlFor="prd-automation-title">
                任务标题
              </label>
              <Input
                id="prd-automation-title"
                value={draft.title}
                className={automationStyles.modalInput}
                placeholder="简要描述这个任务……"
                onChange={event => handleDraftValueChange("title", event.target.value)}
              />
            </div>

            <div className={automationStyles.formGrid}>
              <div className={automationStyles.formBlock}>
                <label className={automationStyles.formLabel} htmlFor="prd-automation-desc">
                  任务描述
                </label>
                <Input.TextArea
                  id="prd-automation-desc"
                  value={draft.description}
                  className={automationStyles.modalTextArea}
                  autoSize={{ minRows: 3, maxRows: 3 }}
                  placeholder="详细说明任务要求、结果"
                  onChange={event => handleDraftValueChange("description", event.target.value)}
                />
              </div>

              <div className={automationStyles.formBlock}>
                <div className={automationStyles.formLabel}>描述附件</div>
                <div
                  className={automationStyles.uploadArea}
                  role="button"
                  tabIndex={0}
                  aria-label="上传附件"
                  onClick={handleOpenAttachmentPicker}
                  onKeyDown={handleAttachmentKeyDown}
                  onDragOver={handleAttachmentDragOver}
                  onDrop={handleAttachmentDrop}
                >
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    className={automationStyles.fileInput}
                    onChange={handleDraftFileInputChange}
                  />
                  <UploadOutlined className={automationStyles.uploadIcon} />
                  <div className={automationStyles.uploadText}>可上传需求文档、示例数据等</div>
                  <div className={automationStyles.uploadHint}>拖拽或点击</div>
                </div>
              </div>
            </div>

            {draftAttachments.length ? (
              <div className={automationStyles.uploadList}>
                {draftAttachments.map(item => {
                  const logo = resolveFileLogo(item.name);
                  return (
                    <div key={item.uid} className={automationStyles.uploadItem}>
                      <span className={automationStyles.uploadItemIcon}>
                        <img
                          src={logo.src}
                          alt={logo.alt}
                          className={automationStyles.uploadItemIconImg}
                        />
                      </span>
                      <div className={automationStyles.uploadItemInfo}>
                        <div className={automationStyles.uploadItemName}>{item.name}</div>
                        <div className={automationStyles.uploadItemMeta}>
                          {formatFileSize(item.size)} · 已添加到原型任务
                        </div>
                      </div>
                      <button
                        type="button"
                        className={automationStyles.uploadItemRemove}
                        onClick={() => handleRemoveDraftAttachment(item.uid)}
                      >
                        <CloseOutlined />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className={automationStyles.formBlock}>
              <div className={automationStyles.formLabel}>会话绑定</div>
              <div
                className={localStyles.contextModeTabs}
                role="tablist"
                aria-label="会话绑定方式"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={draft.bindingMode === "newSession"}
                  className={classNames(localStyles.contextModeTab, {
                    [localStyles.contextModeTabActive]: draft.bindingMode === "newSession",
                  })}
                  onClick={() => handleDraftBindingModeChange("newSession")}
                >
                  新会话
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={draft.bindingMode === "session"}
                  className={classNames(localStyles.contextModeTab, {
                    [localStyles.contextModeTabActive]: draft.bindingMode === "session",
                  })}
                  onClick={() => handleDraftBindingModeChange("session")}
                >
                  已有会话
                </button>
              </div>
              <div className={localStyles.contextModePanel}>
                <div className={localStyles.contextModePanelTitle}>
                  {CONTEXT_MODE_META[draft.bindingMode].title}
                </div>
                <div className={localStyles.contextModePanelDesc}>
                  {CONTEXT_MODE_META[draft.bindingMode].description}
                </div>
              </div>
            </div>

            {draft.bindingMode === "newSession" ? (
              <div className={automationStyles.formBlock}>
                <div className={automationStyles.formLabel}>新会话预览</div>
                <div className={localStyles.bindingPreview}>
                  <span className={localStyles.bindingPreviewItem}>执行时自动创建新会话</span>
                  <span className={localStyles.bindingPreviewItem}>
                    会话标题：{newSessionPreviewTitle}
                  </span>
                  <span className={localStyles.bindingPreviewItem}>
                    结果会写回该会话的成果面板
                  </span>
                </div>
              </div>
            ) : null}

            {draft.bindingMode === "session" ? (
              <div className={automationStyles.formBlock}>
                <div className={automationStyles.formLabel}>已有会话</div>
                {draft.agentId && draftSessionOptions.length ? (
                  <Select<string>
                    value={draft.sessionId || undefined}
                    className={automationStyles.modalSelect}
                    options={draftSessionOptions}
                    suffixIcon={<DownOutlined className={automationStyles.filterArrow} />}
                    optionFilterProp="label"
                    showSearch={true}
                    placeholder="选择该 Agent 的某个会话"
                    onChange={value => handleDraftValueChange("sessionId", value)}
                  />
                ) : (
                  <div className={localStyles.emptySessionHint}>
                    {draft.agentId
                      ? "这个 Agent 当前还没有可绑定的历史会话，可切换为新会话。"
                      : "先选择一个 Agent，再绑定它的某个会话。"}
                  </div>
                )}
              </div>
            ) : null}

            <div className={automationStyles.formGrid}>
              <div className={automationStyles.formBlock}>
                <div className={automationStyles.formLabel}>调度类型</div>
                <Select<ScheduleKind>
                  value={draft.scheduleKind}
                  className={automationStyles.modalSelect}
                  suffixIcon={<DownOutlined className={automationStyles.filterArrow} />}
                  options={[
                    { label: "单次（At）", value: "at" },
                    { label: "间隔（Every）", value: "every" },
                    { label: "Cron 表达式", value: "cron" },
                  ]}
                  onChange={value => handleDraftValueChange("scheduleKind", value)}
                />
              </div>

              <div className={automationStyles.formBlock}>
                {draft.scheduleKind === "at" ? (
                  <>
                    <div className={automationStyles.formLabel}>执行时间</div>
                    <DatePicker
                      value={draft.startTime}
                      className={automationStyles.modalDatePicker}
                      showTime={{ format: "HH:mm" }}
                      format="MM/DD/YYYY, hh:mm A"
                      suffixIcon={<CalendarOutlined />}
                      onChange={value => handleDraftValueChange("startTime", value)}
                    />
                  </>
                ) : draft.scheduleKind === "every" ? (
                  <>
                    <div className={automationStyles.formLabel}>间隔（分钟）</div>
                    <InputNumber
                      value={draft.everyMinutes}
                      className={automationStyles.modalInput}
                      min={1}
                      max={60 * 24}
                      precision={0}
                      onChange={value => handleDraftValueChange("everyMinutes", Number(value ?? 1))}
                      addonAfter="分钟"
                    />
                  </>
                ) : (
                  <>
                    <div className={automationStyles.formLabel}>Cron 表达式</div>
                    <Input
                      value={draft.cronExpr}
                      className={automationStyles.modalInput}
                      placeholder="例如：0 10 * * 1-5"
                      onChange={event => handleDraftValueChange("cronExpr", event.target.value)}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={automationStyles.modalFooter}>
            <CommonButton
              variant="cancel"
              className={automationStyles.modalFooterButton}
              onClick={closeTaskModal}
            >
              取消
            </CommonButton>
            <CommonButton
              variant="confirm"
              className={automationStyles.modalFooterButton}
              disabled={createDisabled}
              onClick={modalMode === "edit" ? handleUpdateTaskSubmit : handleCreateTaskSubmit}
            >
              {modalMode === "edit" ? "保存修改" : "立即创建"}
            </CommonButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
