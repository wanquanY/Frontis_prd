import classNames from "classnames";
import dayjs, { type Dayjs } from "dayjs";
import {
  AlertOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  CheckOutlined,
  CloseOutlined,
  DatabaseOutlined,
  DownOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  StarOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { InputRef, MenuProps } from "antd";
import { Avatar, DatePicker, Dropdown, Input, Modal, Popover, QRCode } from "antd";
import type { Block } from "@/types/block";
import { resolveFileLogo } from "@/utils/fileLogo";

import type {
  AiCeoHomeSkillItem,
  AiCeoSkillIconKey,
} from "@/constants/aiCeoHome";
import { ArtifactPreviewPanel } from "@/feature/workspace/components/ArtifactPreviewPanel";
import { WorkspaceChatPanel } from "@/feature/workspace/components/WorkspaceChatPanel";
import { WorkspaceComposer } from "@/feature/workspace/components/WorkspaceComposer";
import {
  WORKSPACE_MODEL_OPTIONS,
  type WorkspaceComposerMentionOption,
  type WorkspaceComposerAttachmentItem,
} from "@/feature/workspace/types";
import type { ArtifactFileGroup, ArtifactItem } from "@/types/artifact";
import { CHAT_ATTACHMENT_ACCEPT_ATTR } from "@/utils/chatAttachmentFileTypes";

import type {
  ChatMessage,
  DialogueGeneratedResultItem,
  DialogueSessionItem,
  EmployeeItem,
  MetaAgentWorkTrajectoryItem,
} from "../types";
import {
  buildWorkspaceChatBlocks,
  buildWorkspaceChatMessages,
  downloadArtifact,
  getAvatarText,
  getExpertTeamScenarioLabel,
  groupConversationEmployees,
  resolveArtifactUrl,
} from "../utils";
import { DialogueHistoryPanel } from "./DialogueHistoryPanel";
import { DialogueInsightPanel } from "./DialogueInsightPanel";
import { buildDialogueInsightTasks } from "./dialogueInsightPanelUtils";
import { DialogueResultPanel } from "./DialogueResultPanel";
import styles from "../FrontisPage.module.less";

interface DialoguePrototypeViewProps {
  activeEmployee: EmployeeItem;
  activeDialogueArtifacts: ArtifactItem[];
  activeDialogueResults: DialogueGeneratedResultItem[];
  activeDialogueSession: DialogueSessionItem | null;
  activeMetaAgentTrajectory: MetaAgentWorkTrajectoryItem | null;
  allEmployees: EmployeeItem[];
  conversationEmployeeDirectory: EmployeeItem[];
  activeExpertTeamMembers: EmployeeItem[];
  accountMenuItems: MenuProps["items"];
  accountMetaLabel?: string;
  defaultAgentIds: string[];
  dialoguePlaceholder: string;
  dialogueAttachments: WorkspaceComposerAttachmentItem[];
  dialogueInputValue: string;
  dialogueMessages: ChatMessage[];
  allDialogueSessions: DialogueSessionItem[];
  dialogueSessions: DialogueSessionItem[];
  focusBlockId?: string;
  caseReplayActionLabel?: string;
  caseReplayOpenPanel?: "artifacts" | "results" | null;
  homeSkillItems: AiCeoHomeSkillItem[];
  meSchedulableExperts?: EmployeeItem[];
  isHomeVisible: boolean;
  isCaseReplayMode?: boolean;
  isDialogueResponding: boolean;
  onCaseReplayAction?: () => void;
  onCreateDialogueSession: () => void;
  onDialogueAttachmentsSelected: (files?: FileList | File[] | null) => void;
  onDialogueInputChange: (value: string) => void;
  onDialogueSessionSelect: (sessionId: string) => void;
  onQuickPromptSend: (question: string) => void;
  onSelectMetaAgentTrajectory: (trajectoryId: string, anchorBlockId?: string) => void;
  onClearMetaAgentTrajectory: () => void;
  onFeishuConnect?: () => void;
  onRemoveEmployee?: (employeeId: string) => void;
  onRemoveDialogueSession: (sessionId: string) => void;
  onRenameDialogueSession: (sessionId: string, title: string) => void;
  onEmployeeSelect: (employeeId: string) => void;
  onRemoveAttachment: (attachmentUid: string) => void;
  onSkillSelect: (skillId: string) => void;
  onSendDialogue: () => void;
  selectedSkillIds: string[];
  onStopDialogue: () => void;
  hideAgentSidebar?: boolean;
  hideInternalSidebar?: boolean;
  showAgentSwitcher?: boolean;
  showDialogueSessionMenu?: boolean;
  metaAgentTrajectoryItems: MetaAgentWorkTrajectoryItem[];
  showAccountEntry?: boolean;
  showFeishuConnectAction?: boolean;
  isFeishuConnected?: boolean;
  feishuQrCode?: string;
  viewerName: string;
}

type MetaAgentTrajectoryTimeFilterKey =
  | "today"
  | "recentWeek"
  | "recentMonth"
  | "recentThreeMonths"
  | "custom";

const META_AGENT_TRAJECTORY_TIME_FILTER_OPTIONS: Array<{
  key: MetaAgentTrajectoryTimeFilterKey;
  label: string;
}> = [
  { key: "today", label: "今天" },
  { key: "recentWeek", label: "最近一周" },
  { key: "recentMonth", label: "最近一个月" },
  { key: "recentThreeMonths", label: "最近三个月" },
  { key: "custom", label: "自定义范围" },
];

const getMetaAgentTaskStatusLabel = (
  status: MetaAgentWorkTrajectoryItem["tasks"][number]["status"],
): string => {
  if (status === "running") {
    return "执行中";
  }

  if (status === "failed") {
    return "执行失败";
  }

  return "执行完成";
};

const normalizeMemoryQuery = (value: string): string => value.trim().toLowerCase();

const getMetaAgentTrajectoryMatchScore = (
  item: MetaAgentWorkTrajectoryItem,
  normalizedQuery: string,
): number => {
  if (!normalizedQuery) {
    return 0;
  }

  const promptPreview = item.promptPreview.toLowerCase();
  const resultPreview = item.resultPreview.toLowerCase();
  const title = item.title.toLowerCase();
  const participantLabel = item.participantNames.join(" ").toLowerCase();
  const taskLabel = item.tasks
    .map(task => `${task.title} ${task.agentName} ${task.metaLabel}`)
    .join(" ")
    .toLowerCase();
  const deliverableLabel = item.deliverables
    .map(deliverable => `${deliverable.fileName} ${deliverable.metaLabel}`)
    .join(" ")
    .toLowerCase();
  const occurredAt = dayjs(item.occurredAt);
  const timeLabel = [
    item.displayTimeLabel,
    occurredAt.format("YYYY-MM-DD"),
    occurredAt.format("YYYY年M月D日"),
    occurredAt.format("M月D日"),
    occurredAt.format("YYYY/MM/DD"),
  ]
    .join(" ")
    .toLowerCase();
  let score = 0;

  if (title.includes(normalizedQuery)) {
    score += 6;
  }

  if (promptPreview.includes(normalizedQuery)) {
    score += 5;
  }

  if (resultPreview.includes(normalizedQuery)) {
    score += 4;
  }

  if (participantLabel.includes(normalizedQuery)) {
    score += 3;
  }

  if (taskLabel.includes(normalizedQuery)) {
    score += 4;
  }

  if (deliverableLabel.includes(normalizedQuery)) {
    score += 4;
  }

  if (timeLabel.includes(normalizedQuery)) {
    score += 5;
  }

  const uniqueChars = Array.from(new Set(Array.from(normalizedQuery).filter(char => char.trim())));
  const fuzzyCharMatches = uniqueChars.reduce((count, char) => {
    if (
      title.includes(char) ||
      promptPreview.includes(char) ||
      resultPreview.includes(char) ||
      participantLabel.includes(char) ||
      deliverableLabel.includes(char) ||
      timeLabel.includes(char)
    ) {
      return count + 1;
    }

    return count;
  }, 0);

  return score + fuzzyCharMatches * 0.35;
};

interface DialogueTeamCompositeAvatarProps {
  members: EmployeeItem[];
}

const DialogueTeamCompositeAvatar = ({
  members,
}: DialogueTeamCompositeAvatarProps): JSX.Element => {
  const visibleMembers = members.slice(0, 9);
  const useCompactGrid = visibleMembers.length <= 4;

  return (
    <span
      className={classNames(
        styles.dialogueTeamAvatarStack,
        useCompactGrid && styles.dialogueTeamAvatarStackCompact,
      )}
    >
      {visibleMembers.map(member => (
        <span key={member.id} className={styles.dialogueTeamAvatarItem}>
          {member.avatarUrl ? (
            <img
              className={styles.dialogueTeamAvatarImage}
              src={member.avatarUrl}
              alt={member.name}
            />
          ) : (
            <span className={styles.dialogueTeamAvatarFallback}>{getAvatarText(member.name)}</span>
          )}
        </span>
      ))}
    </span>
  );
};

interface DialogueTeamAvatarProps {
  team: EmployeeItem;
  members: EmployeeItem[];
}

const DialogueTeamAvatar = ({ team, members }: DialogueTeamAvatarProps): JSX.Element => {
  const visibleMembers = members.slice(0, 9);
  const soloMember = visibleMembers[0];

  if (visibleMembers.length <= 1) {
    const avatarSource = soloMember?.avatarUrl ?? team.avatarUrl;
    const avatarName = soloMember?.name ?? team.name;

    return (
      <span className={styles.employeeAvatarWrap}>
        <Avatar src={avatarSource} size={40} className={styles.dialogueHeroAvatar}>
          {getAvatarText(avatarName)}
        </Avatar>
      </span>
    );
  }

  return <DialogueTeamCompositeAvatar members={visibleMembers} />;
};

const renderSkillIcon = (iconKey: AiCeoSkillIconKey): JSX.Element => {
  switch (iconKey) {
    case "overview":
      return <BarChartOutlined />;
    case "employee":
      return <UserOutlined />;
    case "risk":
      return <AlertOutlined />;
    case "document":
      return <FileTextOutlined />;
    case "process":
      return <ApartmentOutlined />;
    case "database":
      return <DatabaseOutlined />;
    case "task":
      return <CheckCircleOutlined />;
    case "benchmark":
      return <StarOutlined />;
    case "ranking":
      return <TrophyOutlined />;
    case "chat":
      return <MessageOutlined />;
  }
};

const MAX_VISIBLE_SKILL_COUNT = 5;
const SKILL_BUTTON_GAP = 6;
const SKILL_BUTTON_BASE_WIDTH = 44;
const SELECTED_SKILL_BUTTON_BASE_WIDTH = 68;
const DIALOGUE_SIDE_PANEL_WIDTH_KEY = "frontis-dialogue-side-panel-width";
const DIALOGUE_SIDEBAR_COLLAPSED_WIDTH = 72;
const DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH = 380;
const DIALOGUE_ARTIFACT_PREVIEW_PANEL_DEFAULT_WIDTH = 860;
const DIALOGUE_RESULT_PANEL_DEFAULT_WIDTH = 960;
const DIALOGUE_SIDE_PANEL_MIN_WIDTH = 360;
const DIALOGUE_SIDE_PANEL_MAX_WIDTH = 1180;
const TEAM_MENTION_ALL_OPTION_ID = "team-mention-all";
const TEAM_MENTION_ALL_LABEL = "所有agent";
const EXPERT_TEAM_MAIN_AGENT_NAME = "ME";
const SKILL_BUTTON_FONT =
  '500 14px "PingFang SC", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

let skillMeasureContext: CanvasRenderingContext2D | null = null;

const measureSkillLabelWidth = (label: string): number => {
  if (typeof document === "undefined") {
    return label.length * 14;
  }
  if (!skillMeasureContext) {
    skillMeasureContext = document.createElement("canvas").getContext("2d");
  }
  if (!skillMeasureContext) {
    return label.length * 14;
  }
  skillMeasureContext.font = SKILL_BUTTON_FONT;
  return Math.ceil(skillMeasureContext.measureText(label).width);
};

const getSkillButtonWidth = (label: string, isSelected = false): number =>
  measureSkillLabelWidth(label) +
  (isSelected ? SELECTED_SKILL_BUTTON_BASE_WIDTH : SKILL_BUTTON_BASE_WIDTH);

const isMetaCoordinatorEmployee = (
  employee: EmployeeItem,
  defaultAgentIds: readonly string[],
): boolean =>
  Boolean(
    employee.isExpertTeam &&
    defaultAgentIds.includes(employee.id) &&
    employee.name === EXPERT_TEAM_MAIN_AGENT_NAME,
  );

const shouldRenderAsExpertTeam = (employee: EmployeeItem): boolean =>
  Boolean(employee.isExpertTeam && employee.name !== EXPERT_TEAM_MAIN_AGENT_NAME);

/**
 * 对话视图。
 */
export const DialoguePrototypeView = ({
  activeEmployee,
  activeDialogueArtifacts,
  activeDialogueResults,
  activeDialogueSession,
  activeMetaAgentTrajectory,
  allEmployees,
  conversationEmployeeDirectory,
  activeExpertTeamMembers,
  accountMenuItems,
  accountMetaLabel,
  defaultAgentIds,
  dialoguePlaceholder,
  dialogueAttachments,
  dialogueInputValue,
  dialogueMessages,
  allDialogueSessions,
  dialogueSessions,
  focusBlockId,
  caseReplayActionLabel,
  caseReplayOpenPanel,
  homeSkillItems,
  meSchedulableExperts = [],
  isHomeVisible,
  isCaseReplayMode = false,
  isDialogueResponding,
  onCaseReplayAction,
  onCreateDialogueSession,
  onDialogueAttachmentsSelected,
  onDialogueInputChange,
  onDialogueSessionSelect,
  onQuickPromptSend,
  onSelectMetaAgentTrajectory,
  onClearMetaAgentTrajectory,
  onFeishuConnect,
  onRemoveEmployee,
  onRemoveDialogueSession,
  onRenameDialogueSession,
  onEmployeeSelect,
  onRemoveAttachment,
  onSkillSelect,
  onSendDialogue,
  selectedSkillIds,
  onStopDialogue,
  hideAgentSidebar = false,
  hideInternalSidebar = false,
  showAgentSwitcher = true,
  showDialogueSessionMenu = true,
  metaAgentTrajectoryItems,
  showAccountEntry = true,
  showFeishuConnectAction = false,
  isFeishuConnected = false,
  feishuQrCode = "",
  viewerName,
}: DialoguePrototypeViewProps): JSX.Element => {
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const sessionTitleInputRef = useRef<InputRef | null>(null);
  const employeeSwitcherRef = useRef<HTMLDivElement | null>(null);
  const homeEmployeeSwitcherRef = useRef<HTMLDivElement | null>(null);
  const metaAgentTrajectoryTimeFilterRef = useRef<HTMLDivElement | null>(null);
  const skillTrackRef = useRef<HTMLDivElement | null>(null);
  const dialogueShellRef = useRef<HTMLDivElement | null>(null);
  const latestResultIdRef = useRef<string>("");
  const latestAutoOpenedArtifactKeyRef = useRef<string>("");
  const wasDialogueRespondingRef = useRef<boolean>(false);
  const sidePanelResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const sidePanelPendingWidthRef = useRef<number>(DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH);
  const sidePanelResizeFrameRef = useRef<number | null>(null);
  const [sidePanelMode, setSidePanelMode] = useState<"artifacts" | "results" | null>(null);
  const [preferredArtifactId, setPreferredArtifactId] = useState<string>();
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [isDialogueHistoryOpen, setIsDialogueHistoryOpen] = useState<boolean>(false);
  const [historyFocusBlockId, setHistoryFocusBlockId] = useState<string>("");
  const [historyFocusRequestKey, setHistoryFocusRequestKey] = useState<string>("");
  const [isMetaAgentTrajectoryOpen, setIsMetaAgentTrajectoryOpen] = useState<boolean>(false);
  const [isFeishuQrModalOpen, setIsFeishuQrModalOpen] = useState<boolean>(false);
  const [metaAgentTrajectorySearchValue, setMetaAgentTrajectorySearchValue] = useState<string>("");
  const [isMetaAgentTrajectoryTimeFilterOpen, setIsMetaAgentTrajectoryTimeFilterOpen] =
    useState<boolean>(false);
  const [metaAgentTrajectoryTimeFilterKey, setMetaAgentTrajectoryTimeFilterKey] =
    useState<MetaAgentTrajectoryTimeFilterKey>("recentMonth");
  const [metaAgentTrajectoryTimeFilterView, setMetaAgentTrajectoryTimeFilterView] = useState<
    "options" | "custom"
  >("options");
  const [metaAgentTrajectoryDateRange, setMetaAgentTrajectoryDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [metaAgentTrajectoryDraftDateRange, setMetaAgentTrajectoryDraftDateRange] = useState<
    [Dayjs | null, Dayjs | null]
  >([null, null]);
  const [selectedMetaAgentTimelineGroupKey, setSelectedMetaAgentTimelineGroupKey] = useState<
    string | null
  >(null);
  const [selectedMetaAgentTrajectoryDetailId, setSelectedMetaAgentTrajectoryDetailId] = useState<
    string | null
  >(null);
  const [selectedMetaAgentTrajectoryDetailTab, setSelectedMetaAgentTrajectoryDetailTab] = useState<
    "tasks" | "deliverables"
  >("tasks");
  const [expandedOutputTaskGroupIds, setExpandedOutputTaskGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isArtifactPreviewing, setIsArtifactPreviewing] = useState<boolean>(false);
  const [isEmployeeSwitcherOpen, setIsEmployeeSwitcherOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSidePanelResizing, setIsSidePanelResizing] = useState<boolean>(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState<string>("");
  const [skillTrackWidth, setSkillTrackWidth] = useState<number>(0);
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(
    DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH,
  );
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );
  const hasArtifactPanel = activeDialogueArtifacts.length > 0;
  const hasResultPanel = activeDialogueResults.length > 0;
  const employeeGroups = useMemo(
    () => groupConversationEmployees(allEmployees, defaultAgentIds),
    [allEmployees, defaultAgentIds],
  );
  const canRemoveEmployee = Boolean(onRemoveEmployee) && allEmployees.length > 1;
  const dialogueSessionGroups = useMemo(() => {
    const employeeMap = new Map(allEmployees.map(employee => [employee.id, employee]));
    const sessionsByEmployee = new Map<string, DialogueSessionItem[]>();

    allDialogueSessions.forEach(session => {
      if (!employeeMap.has(session.employeeId)) {
        return;
      }

      const employeeSessions = sessionsByEmployee.get(session.employeeId) ?? [];
      employeeSessions.push(session);
      sessionsByEmployee.set(session.employeeId, employeeSessions);
    });

    return allEmployees
      .map(employee => ({
        employee,
        sessions: sessionsByEmployee.get(employee.id) ?? [],
      }))
      .filter(group => group.sessions.length > 0);
  }, [allDialogueSessions, allEmployees]);
  const shouldShowAgentSidebar = !hideAgentSidebar && !hideInternalSidebar;
  const shouldShowMetaAgentTrajectory =
    hideAgentSidebar && metaAgentTrajectoryItems.length > 0 && !isHomeVisible;
  const isStackedLayout = viewportWidth <= 1100;
  const isArtifactPanelVisible =
    !isHomeVisible && sidePanelMode === "artifacts" && hasArtifactPanel;
  const isResultPanelVisible = !isHomeVisible && sidePanelMode === "results" && hasResultPanel;
  const isSidePanelVisible = isArtifactPanelVisible || isResultPanelVisible;
  const isMetaAgentWorkspace =
    hideAgentSidebar && isMetaCoordinatorEmployee(activeEmployee, defaultAgentIds);
  const handleOpenFeishuQrModal = useCallback((): void => {
    if (isFeishuConnected) {
      return;
    }

    setIsFeishuQrModalOpen(true);
  }, [isFeishuConnected]);
  const handleConfirmFeishuConnection = useCallback((): void => {
    onFeishuConnect?.();
    setIsFeishuQrModalOpen(false);
  }, [onFeishuConnect]);
  const resolvedFocusBlockId = focusBlockId?.trim() || historyFocusBlockId;
  const resolvedFocusRequestKey = focusBlockId?.trim()
    ? `external:${focusBlockId.trim()}`
    : historyFocusRequestKey;
  const clampSidePanelWidth = useCallback(
    (width: number): number => {
      if (!Number.isFinite(width)) {
        return DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH;
      }

      const sidebarReservedWidth = 252;
      const viewportLimitedMax = Math.min(
        DIALOGUE_SIDE_PANEL_MAX_WIDTH,
        Math.max(DIALOGUE_SIDE_PANEL_MIN_WIDTH, viewportWidth - sidebarReservedWidth - 180),
      );

      return Math.min(viewportLimitedMax, Math.max(DIALOGUE_SIDE_PANEL_MIN_WIDTH, width));
    },
    [viewportWidth],
  );
  const resolvedSidePanelWidth = clampSidePanelWidth(sidePanelWidth);
  const buildVisibleSidePanelGridTemplateColumns = useCallback(
    (panelWidth: number): string => {
      if (!shouldShowAgentSidebar) {
        return `minmax(0, 1fr) 10px ${panelWidth}px`;
      }

      const sidebarWidth = isSidebarCollapsed ? DIALOGUE_SIDEBAR_COLLAPSED_WIDTH : 252;

      return `${sidebarWidth}px minmax(0, 1fr) 10px ${panelWidth}px`;
    },
    [isSidebarCollapsed, shouldShowAgentSidebar],
  );
  const dialogueShellStyle = useMemo<CSSProperties | undefined>(() => {
    if (isStackedLayout) {
      return undefined;
    }

    if (!shouldShowAgentSidebar) {
      if (isSidePanelVisible) {
        return {
          gridTemplateColumns: buildVisibleSidePanelGridTemplateColumns(resolvedSidePanelWidth),
        };
      }

      return {
        gridTemplateColumns: "minmax(0, 1fr) 0px 0px",
      };
    }

    const sidebarWidth = isSidebarCollapsed ? DIALOGUE_SIDEBAR_COLLAPSED_WIDTH : 252;

    if (isSidePanelVisible) {
      return {
        gridTemplateColumns: buildVisibleSidePanelGridTemplateColumns(resolvedSidePanelWidth),
      };
    }

    return {
      gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr) 0px 0px`,
    };
  }, [
    buildVisibleSidePanelGridTemplateColumns,
    isSidePanelVisible,
    isSidebarCollapsed,
    isStackedLayout,
    resolvedSidePanelWidth,
    shouldShowAgentSidebar,
  ]);

  const chatMessages = useMemo(
    () => buildWorkspaceChatMessages(dialogueMessages),
    [dialogueMessages],
  );
  const chatBlocks = useMemo(() => buildWorkspaceChatBlocks(dialogueMessages), [dialogueMessages]);
  const selectedSkillItems = useMemo(
    () => homeSkillItems.filter(item => selectedSkillIds.includes(item.id)),
    [homeSkillItems, selectedSkillIds],
  );
  const availableSkillItems = useMemo(
    () => homeSkillItems.filter(item => !selectedSkillIds.includes(item.id)),
    [homeSkillItems, selectedSkillIds],
  );
  const shouldShowComposerSkillBar =
    !activeEmployee.isExpertTeam &&
    (selectedSkillItems.length > 0 || availableSkillItems.length > 0);
  const dialogueInsightTasks = useMemo(
    () =>
      buildDialogueInsightTasks({
        activeName: activeEmployee.name,
        messages: dialogueMessages,
        trajectories: metaAgentTrajectoryItems,
      }),
    [activeEmployee.name, dialogueMessages, metaAgentTrajectoryItems],
  );
  const shouldShowDialogueInsightPanel =
    isMetaAgentWorkspace &&
    !isHomeVisible &&
    !isSidePanelVisible &&
    dialogueInsightTasks.length > 0;
  const shouldShowWorkRecordEntry = isMetaAgentWorkspace && !isHomeVisible && !isSidePanelVisible;
  const { visibleSkillItems, overflowSkillItems } = useMemo(() => {
    if (selectedSkillItems.length > 0) {
      return {
        visibleSkillItems: [],
        overflowSkillItems: [],
      };
    }

    const maxVisibleSkillCount = Math.max(MAX_VISIBLE_SKILL_COUNT - selectedSkillItems.length, 0);

    if (skillTrackWidth <= 0) {
      return {
        visibleSkillItems: availableSkillItems.slice(0, maxVisibleSkillCount),
        overflowSkillItems: availableSkillItems.slice(maxVisibleSkillCount),
      };
    }

    const visibleItems: AiCeoHomeSkillItem[] = [];
    let usedWidth = selectedSkillItems.reduce((total, item, index) => {
      const nextWidth = getSkillButtonWidth(item.name, true);
      return total + nextWidth + (index > 0 ? SKILL_BUTTON_GAP : 0);
    }, 0);
    const moreButtonWidth = getSkillButtonWidth("更多");

    for (let index = 0; index < availableSkillItems.length; index += 1) {
      const currentItem = availableSkillItems[index];
      const hasRemainingItems = index < availableSkillItems.length - 1;
      const nextItemWidth =
        (usedWidth > 0 ? SKILL_BUTTON_GAP : 0) + getSkillButtonWidth(currentItem.name);
      const reservedMoreWidth = hasRemainingItems ? SKILL_BUTTON_GAP + moreButtonWidth : 0;

      if (
        visibleItems.length < maxVisibleSkillCount &&
        usedWidth + nextItemWidth + reservedMoreWidth <= skillTrackWidth
      ) {
        visibleItems.push(currentItem);
        usedWidth += nextItemWidth;
        continue;
      }

      return {
        visibleSkillItems: visibleItems,
        overflowSkillItems: availableSkillItems.slice(index),
      };
    }

    return {
      visibleSkillItems: visibleItems,
      overflowSkillItems: [],
    };
  }, [availableSkillItems, selectedSkillItems, skillTrackWidth]);
  const moreSkillMenuItems = useMemo<NonNullable<MenuProps["items"]>>(
    () =>
      overflowSkillItems.map(item => ({
        key: item.id,
        label: (
          <span className={styles.dialogueSkillMenuItem}>
            <span className={styles.dialogueSkillMenuItemIcon}>
              {renderSkillIcon(item.iconKey)}
            </span>
            <span>{item.name}</span>
          </span>
        ),
      })),
    [overflowSkillItems],
  );
  const metaAgentTrajectoryTimeFilterLabel = useMemo(() => {
    if (metaAgentTrajectoryTimeFilterKey === "custom") {
      if (metaAgentTrajectoryDateRange?.[0] && metaAgentTrajectoryDateRange?.[1]) {
        return `${metaAgentTrajectoryDateRange[0].format("M月D日")} - ${metaAgentTrajectoryDateRange[1].format("M月D日")}`;
      }

      return "自定义范围";
    }

    return (
      META_AGENT_TRAJECTORY_TIME_FILTER_OPTIONS.find(
        item => item.key === metaAgentTrajectoryTimeFilterKey,
      )?.label ?? "时间"
    );
  }, [metaAgentTrajectoryDateRange, metaAgentTrajectoryTimeFilterKey]);
  const metaAgentTrajectoryTimeScale = useMemo<"week" | "month">(() => {
    if (
      metaAgentTrajectoryTimeFilterKey === "today" ||
      metaAgentTrajectoryTimeFilterKey === "recentWeek"
    ) {
      return "week";
    }

    if (metaAgentTrajectoryTimeFilterKey === "recentMonth") {
      return "week";
    }

    if (metaAgentTrajectoryTimeFilterKey === "recentThreeMonths") {
      return "month";
    }

    if (metaAgentTrajectoryDateRange?.[0] && metaAgentTrajectoryDateRange?.[1]) {
      const rangeLengthInDays =
        Math.abs(metaAgentTrajectoryDateRange[1].diff(metaAgentTrajectoryDateRange[0], "day")) + 1;

      return rangeLengthInDays <= 45 ? "week" : "month";
    }

    return "week";
  }, [metaAgentTrajectoryDateRange, metaAgentTrajectoryTimeFilterKey]);
  const isMetaAgentTrajectoryCustomRangeValid = Boolean(
    metaAgentTrajectoryDraftDateRange[0] && metaAgentTrajectoryDraftDateRange[1],
  );
  const rangedMetaAgentTrajectoryItems = useMemo(() => {
    const now = dayjs();
    const presetFilteredItems = metaAgentTrajectoryItems.filter(item => {
      const occurredAt = dayjs(item.occurredAt);

      if (metaAgentTrajectoryTimeFilterKey === "today") {
        return occurredAt.isSame(now, "day");
      }

      if (metaAgentTrajectoryTimeFilterKey === "recentWeek") {
        const rangeStart = now.subtract(7, "day").startOf("day");

        return occurredAt.isAfter(rangeStart) || occurredAt.isSame(rangeStart);
      }

      if (metaAgentTrajectoryTimeFilterKey === "recentMonth") {
        const rangeStart = now.subtract(1, "month").startOf("day");

        return occurredAt.isAfter(rangeStart) || occurredAt.isSame(rangeStart);
      }

      if (metaAgentTrajectoryTimeFilterKey === "recentThreeMonths") {
        const rangeStart = now.subtract(3, "month").startOf("day");

        return occurredAt.isAfter(rangeStart) || occurredAt.isSame(rangeStart);
      }

      if (
        metaAgentTrajectoryTimeFilterKey === "custom" &&
        metaAgentTrajectoryDateRange?.[0] &&
        metaAgentTrajectoryDateRange?.[1]
      ) {
        const rangeStart = metaAgentTrajectoryDateRange[0].startOf("day");
        const rangeEnd = metaAgentTrajectoryDateRange[1].endOf("day");

        return (
          (occurredAt.isAfter(rangeStart) || occurredAt.isSame(rangeStart)) &&
          (occurredAt.isBefore(rangeEnd) || occurredAt.isSame(rangeEnd))
        );
      }

      return true;
    });

    return presetFilteredItems;
  }, [metaAgentTrajectoryDateRange, metaAgentTrajectoryItems, metaAgentTrajectoryTimeFilterKey]);
  const visibleMetaAgentTrajectoryCandidates = useMemo(() => {
    const normalizedKeyword = normalizeMemoryQuery(metaAgentTrajectorySearchValue);
    const rankedItems = rangedMetaAgentTrajectoryItems
      .map(item => ({
        item,
        score: getMetaAgentTrajectoryMatchScore(item, normalizedKeyword),
      }))
      .filter(entry => !normalizedKeyword || entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map(entry => entry.item);

    return rankedItems.slice(0, 8);
  }, [metaAgentTrajectorySearchValue, rangedMetaAgentTrajectoryItems]);
  const metaAgentTimelineGroups = useMemo(() => {
    const groupedMap = new Map<
      string,
      {
        key: string;
        label: string;
        hint: string;
        startedAt: string;
        items: MetaAgentWorkTrajectoryItem[];
      }
    >();

    rangedMetaAgentTrajectoryItems.forEach(item => {
      const occurredAt = dayjs(item.occurredAt);
      const groupStart =
        metaAgentTrajectoryTimeScale === "week"
          ? occurredAt.startOf("week")
          : occurredAt.startOf("month");
      const groupEnd =
        metaAgentTrajectoryTimeScale === "week"
          ? occurredAt.endOf("week")
          : occurredAt.endOf("month");
      const groupKey =
        metaAgentTrajectoryTimeScale === "week"
          ? groupStart.format("YYYY-MM-DD")
          : groupStart.format("YYYY-MM");
      const nextGroup = groupedMap.get(groupKey);
      const label =
        metaAgentTrajectoryTimeScale === "week"
          ? `${groupStart.format("M月D日")} - ${groupEnd.format("M月D日")}`
          : groupStart.format("YYYY年M月");
      const hint =
        metaAgentTrajectoryTimeScale === "week"
          ? `共 ${groupStart.isSame(groupEnd, "day") ? "1天" : "1周"}`
          : "按月查看";

      if (nextGroup) {
        nextGroup.items.push(item);
        return;
      }

      groupedMap.set(groupKey, {
        key: groupKey,
        label,
        hint,
        startedAt: groupStart.toISOString(),
        items: [item],
      });
    });

    return Array.from(groupedMap.values()).sort(
      (left, right) => dayjs(right.startedAt).valueOf() - dayjs(left.startedAt).valueOf(),
    );
  }, [metaAgentTrajectoryTimeScale, rangedMetaAgentTrajectoryItems]);
  const selectedMetaAgentTimelineGroup = useMemo(
    () =>
      metaAgentTimelineGroups.find(group => group.key === selectedMetaAgentTimelineGroupKey) ??
      metaAgentTimelineGroups[0] ??
      null,
    [metaAgentTimelineGroups, selectedMetaAgentTimelineGroupKey],
  );
  const isMetaAgentTrajectorySearchMode = Boolean(
    normalizeMemoryQuery(metaAgentTrajectorySearchValue),
  );
  const selectedMetaAgentTrajectoryDetail = useMemo(
    () =>
      metaAgentTrajectoryItems.find(item => item.id === selectedMetaAgentTrajectoryDetailId) ??
      null,
    [metaAgentTrajectoryItems, selectedMetaAgentTrajectoryDetailId],
  );
  const metaAgentArtifactGroups = useMemo<ArtifactFileGroup[] | undefined>(() => {
    if (!shouldShowMetaAgentTrajectory || !metaAgentTrajectoryItems.length) {
      return undefined;
    }

    const normalizeArtifactGroupText = (value: string): string => value.trim().toLowerCase();
    const fileDirectory = new Map<string, ArtifactItem>();
    activeDialogueArtifacts.forEach(item => {
      fileDirectory.set(item.id, item);
      fileDirectory.set(item.artifactId, item);
      fileDirectory.set(item.fileName, item);
    });

    const groupedFileIds = new Set<string>();
    const groupDrafts = metaAgentTrajectoryItems.map(item => {
      const groupFiles = item.deliverables.reduce<ArtifactItem[]>((result, deliverable) => {
        const matchedFile =
          fileDirectory.get(deliverable.id) ?? fileDirectory.get(deliverable.fileName) ?? null;

        if (!matchedFile || groupedFileIds.has(matchedFile.id)) {
          return result;
        }

        groupedFileIds.add(matchedFile.id);
        result.push(matchedFile);
        return result;
      }, []);

      return {
        id: item.id,
        title: item.title,
        files: groupFiles,
      };
    });

    const resolveTargetGroupIndex = (file: ArtifactItem): number => {
      const artifactText = normalizeArtifactGroupText(
        `${file.fileName} ${file.taskName} ${file.producerName}`,
      );
      const groupTitles = groupDrafts.map(group => normalizeArtifactGroupText(group.title));
      const riskGroupIndex = groupTitles.findIndex(title => title.includes("风险"));
      const deliveryGroupIndex = groupTitles.findIndex(
        title =>
          title.includes("prd") ||
          title.includes("需求") ||
          title.includes("拆解") ||
          title.includes("边界"),
      );

      if (
        riskGroupIndex >= 0 &&
        (artifactText.includes("风险") ||
          artifactText.includes("上线") ||
          artifactText.includes("验收") ||
          artifactText.includes("回归"))
      ) {
        return riskGroupIndex;
      }

      if (
        deliveryGroupIndex >= 0 &&
        (artifactText.includes("prd") ||
          artifactText.includes("v430") ||
          artifactText.includes("需求") ||
          artifactText.includes("架构") ||
          artifactText.includes("流程") ||
          artifactText.includes("模块") ||
          artifactText.includes("边界") ||
          artifactText.includes("依赖"))
      ) {
        return deliveryGroupIndex;
      }

      return groupDrafts.reduce((targetIndex, group, index) => {
        if (group.files.length < groupDrafts[targetIndex].files.length) {
          return index;
        }

        return targetIndex;
      }, 0);
    };

    const ungroupedFiles = activeDialogueArtifacts.filter(item => !groupedFileIds.has(item.id));
    ungroupedFiles.forEach(file => {
      const targetGroupIndex = resolveTargetGroupIndex(file);
      groupDrafts[targetGroupIndex]?.files.push(file);
    });

    return groupDrafts.filter(group => group.files.length > 0);
  }, [activeDialogueArtifacts, metaAgentTrajectoryItems, shouldShowMetaAgentTrajectory]);
  const trajectoryParticipantDirectory = useMemo(() => {
    const employeeDirectory = new Map<string, EmployeeItem>();

    [...conversationEmployeeDirectory, ...allEmployees].forEach(employee => {
      employeeDirectory.set(employee.name, employee);
    });

    return employeeDirectory;
  }, [allEmployees, conversationEmployeeDirectory]);
  const dialogueActorAvatars = useMemo(() => {
    const actorAvatarEntries: Record<string, { icon?: string; name: string }> = {
      [activeEmployee.id]: {
        icon: activeEmployee.avatarUrl,
        name: activeEmployee.name,
      },
      [activeEmployee.name]: {
        icon: activeEmployee.avatarUrl,
        name: activeEmployee.name,
      },
    };

    activeEmployee.expertTeamMemberIds?.forEach(memberId => {
      const member = conversationEmployeeDirectory.find(item => item.id === memberId) ?? null;
      if (!member) {
        return;
      }

      actorAvatarEntries[member.id] = {
        icon: member.avatarUrl,
        name: member.name,
      };

      if (member.name !== activeEmployee.name) {
        actorAvatarEntries[member.name] = {
          icon: member.avatarUrl,
          name: member.name,
        };
      }
    });

    return actorAvatarEntries;
  }, [
    activeEmployee.avatarUrl,
    activeEmployee.expertTeamMemberIds,
    activeEmployee.id,
    activeEmployee.name,
    conversationEmployeeDirectory,
  ]);
  const isMetaCoordinatorAgent = useCallback(
    (employee: EmployeeItem): boolean => isMetaCoordinatorEmployee(employee, defaultAgentIds),
    [defaultAgentIds],
  );
  const supportsDialogueSessions = !isMetaCoordinatorAgent(activeEmployee);
  const shouldShowExpertTeamUi =
    shouldRenderAsExpertTeam(activeEmployee) && !isMetaCoordinatorAgent(activeEmployee);
  const expertTeamMentionOptions = useMemo<WorkspaceComposerMentionOption[]>(
    () =>
      activeEmployee.isExpertTeam
        ? [
            {
              id: TEAM_MENTION_ALL_OPTION_ID,
              label: TEAM_MENTION_ALL_LABEL,
              mentionLabel: TEAM_MENTION_ALL_LABEL,
              alias: activeEmployee.name,
              kind: "ai",
            },
            ...activeExpertTeamMembers.map(member => ({
              id: member.id,
              label: member.name,
              mentionLabel: member.name,
              alias: member.role,
              avatarUrl: member.avatarUrl,
              kind: "ai" as const,
            })),
          ]
        : [],
    [activeEmployee.isExpertTeam, activeEmployee.name, activeExpertTeamMembers],
  );
  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onDialogueAttachmentsSelected(event.currentTarget.files);
    event.currentTarget.value = "";
  };

  useEffect(() => {
    if (!editingSessionId) return;
    if (allDialogueSessions.some(item => item.id === editingSessionId)) return;
    setEditingSessionId(null);
    setEditingSessionTitle("");
  }, [allDialogueSessions, editingSessionId]);

  useEffect(() => {
    if (!editingSessionId) return;
    sessionTitleInputRef.current?.focus({ cursor: "all" });
  }, [editingSessionId]);

  useEffect(() => {
    if (!isHomeVisible) {
      return;
    }
    setSidePanelMode(null);
    setPreferredArtifactId(undefined);
    setActiveResultId(null);
    setIsArtifactPreviewing(false);
    setIsDialogueHistoryOpen(false);
  }, [isHomeVisible]);

  useEffect(() => {
    if (!isSidePanelVisible) {
      return;
    }

    setIsDialogueHistoryOpen(false);
  }, [isSidePanelVisible]);

  useEffect(() => {
    if (shouldShowWorkRecordEntry || !isDialogueHistoryOpen) {
      return;
    }

    setIsDialogueHistoryOpen(false);
  }, [isDialogueHistoryOpen, shouldShowWorkRecordEntry]);

  useEffect(() => {
    setIsDialogueHistoryOpen(false);
    setHistoryFocusBlockId("");
    setHistoryFocusRequestKey("");
  }, [activeEmployee.id]);

  useEffect(() => {
    if (shouldShowMetaAgentTrajectory) {
      return;
    }

    setIsMetaAgentTrajectoryOpen(false);
    setIsMetaAgentTrajectoryTimeFilterOpen(false);
  }, [shouldShowMetaAgentTrajectory]);

  useEffect(() => {
    setMetaAgentTrajectorySearchValue("");
    setIsMetaAgentTrajectoryTimeFilterOpen(false);
    setMetaAgentTrajectoryTimeFilterKey("recentMonth");
    setMetaAgentTrajectoryTimeFilterView("options");
    setMetaAgentTrajectoryDateRange(null);
    setMetaAgentTrajectoryDraftDateRange([null, null]);
    setSelectedMetaAgentTimelineGroupKey(null);
  }, [activeEmployee.id]);

  useEffect(() => {
    if (isMetaAgentTrajectoryOpen) {
      return;
    }

    setIsMetaAgentTrajectoryTimeFilterOpen(false);
    setMetaAgentTrajectoryTimeFilterView("options");
  }, [isMetaAgentTrajectoryOpen]);

  useEffect(() => {
    if (!isMetaAgentTrajectoryTimeFilterOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (metaAgentTrajectoryTimeFilterRef.current?.contains(event.target)) {
        return;
      }

      setIsMetaAgentTrajectoryTimeFilterOpen(false);
      setMetaAgentTrajectoryTimeFilterView("options");
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isMetaAgentTrajectoryTimeFilterOpen]);

  useEffect(() => {
    if (!metaAgentTimelineGroups.length) {
      setSelectedMetaAgentTimelineGroupKey(null);
      return;
    }

    if (
      selectedMetaAgentTimelineGroupKey &&
      metaAgentTimelineGroups.some(group => group.key === selectedMetaAgentTimelineGroupKey)
    ) {
      return;
    }

    setSelectedMetaAgentTimelineGroupKey(metaAgentTimelineGroups[0].key);
  }, [metaAgentTimelineGroups, selectedMetaAgentTimelineGroupKey]);

  useEffect(() => {
    if (!metaAgentTrajectoryItems.length) {
      setExpandedOutputTaskGroupIds(new Set());
      return;
    }

    setExpandedOutputTaskGroupIds(new Set([metaAgentTrajectoryItems[0].id]));
  }, [metaAgentTrajectoryItems]);

  useEffect(() => {
    setSidePanelMode(null);
    setPreferredArtifactId(undefined);
    setActiveResultId(null);
    setIsArtifactPreviewing(false);
  }, [activeDialogueSession?.id]);

  useEffect(() => {
    if (sidePanelMode === "artifacts" && !hasArtifactPanel) {
      setSidePanelMode(null);
      setPreferredArtifactId(undefined);
      setIsArtifactPreviewing(false);
    }
  }, [hasArtifactPanel, sidePanelMode]);

  useEffect(() => {
    if (sidePanelMode === "results" && !hasResultPanel) {
      setSidePanelMode(null);
      setActiveResultId(null);
    }
  }, [hasResultPanel, sidePanelMode]);

  useEffect(() => {
    if (sidePanelMode !== "artifacts") {
      return;
    }

    if (isArtifactPreviewing) {
      setSidePanelWidth(currentWidth => {
        const nextWidth = clampSidePanelWidth(
          Math.max(currentWidth, DIALOGUE_ARTIFACT_PREVIEW_PANEL_DEFAULT_WIDTH),
        );
        sidePanelPendingWidthRef.current = nextWidth;
        return nextWidth;
      });
      return;
    }

    const nextWidth = clampSidePanelWidth(DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH);
    sidePanelPendingWidthRef.current = nextWidth;
    setSidePanelWidth(nextWidth);
  }, [clampSidePanelWidth, isArtifactPreviewing, sidePanelMode]);

  useEffect(() => {
    if (!activeResultId) {
      return;
    }
    if (activeDialogueResults.some(item => item.id === activeResultId)) {
      return;
    }
    setActiveResultId(null);
  }, [activeDialogueResults, activeResultId]);

  useEffect(() => {
    if (isDialogueResponding) {
      latestResultIdRef.current = "";
      return;
    }
    const latestResult = activeDialogueResults[activeDialogueResults.length - 1];
    if (!latestResult) {
      latestResultIdRef.current = "";
      return;
    }

    if (latestResult.panel.kind === "dispatchExecution") {
      latestResultIdRef.current = "";
      return;
    }

    latestResultIdRef.current = latestResult.id;
  }, [activeDialogueResults, activeDialogueSession?.id, isDialogueResponding]);

  useEffect(() => {
    const latestResult = activeDialogueResults[activeDialogueResults.length - 1];
    const latestResultId = latestResult?.id ?? "";
    if (!latestResultId) {
      latestResultIdRef.current = "";
      return;
    }
    if (latestResultIdRef.current === latestResultId) {
      return;
    }

    latestResultIdRef.current = latestResultId;
  }, [activeDialogueResults]);

  useEffect(() => {
    const latestArtifact = activeDialogueArtifacts[activeDialogueArtifacts.length - 1];
    const latestArtifactId = latestArtifact?.id ?? "";
    const activeSessionId = activeDialogueSession?.id ?? "";
    const wasResponding = wasDialogueRespondingRef.current;

    wasDialogueRespondingRef.current = isDialogueResponding;

    if (
      isHomeVisible ||
      isCaseReplayMode ||
      !activeSessionId ||
      !latestArtifactId ||
      isDialogueResponding ||
      !wasResponding ||
      sidePanelMode !== null
    ) {
      return;
    }

    const autoOpenKey = `${activeSessionId}:${latestArtifactId}`;
    if (latestAutoOpenedArtifactKeyRef.current === autoOpenKey) {
      return;
    }

    latestAutoOpenedArtifactKeyRef.current = autoOpenKey;
    setPreferredArtifactId(latestArtifactId);
    setIsArtifactPreviewing(false);
    setSidePanelWidth(currentWidth =>
      clampSidePanelWidth(Math.max(currentWidth, DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH)),
    );
    setSidePanelMode("artifacts");
  }, [
    activeDialogueArtifacts,
    activeDialogueSession?.id,
    clampSidePanelWidth,
    isCaseReplayMode,
    isDialogueResponding,
    isHomeVisible,
    sidePanelMode,
  ]);

  useEffect(() => {
    if (isHomeVisible || !isCaseReplayMode || !caseReplayOpenPanel) {
      return;
    }

    if (caseReplayOpenPanel === "results") {
      const latestResult = activeDialogueResults[activeDialogueResults.length - 1];
      if (!latestResult) {
        return;
      }
      setSidePanelWidth(currentWidth =>
        clampSidePanelWidth(Math.max(currentWidth, DIALOGUE_RESULT_PANEL_DEFAULT_WIDTH)),
      );
      setActiveResultId(latestResult.id);
      setSidePanelMode("results");
      return;
    }

    const preferredArtifact = activeDialogueArtifacts[0];
    if (!preferredArtifact) {
      return;
    }
    setPreferredArtifactId(preferredArtifact.id);
    setIsArtifactPreviewing(true);
    setSidePanelWidth(currentWidth =>
      clampSidePanelWidth(Math.max(currentWidth, DIALOGUE_ARTIFACT_PREVIEW_PANEL_DEFAULT_WIDTH)),
    );
    setSidePanelMode("artifacts");
  }, [
    activeDialogueArtifacts,
    activeDialogueResults,
    caseReplayOpenPanel,
    clampSidePanelWidth,
    isCaseReplayMode,
    isHomeVisible,
  ]);

  useEffect(() => {
    if (isHomeVisible || !isCaseReplayMode || !caseReplayOpenPanel) {
      return;
    }

    if (caseReplayOpenPanel === "results") {
      const latestResult = activeDialogueResults[activeDialogueResults.length - 1];
      if (!latestResult) {
        return;
      }
      setSidePanelWidth(currentWidth =>
        clampSidePanelWidth(Math.max(currentWidth, DIALOGUE_RESULT_PANEL_DEFAULT_WIDTH)),
      );
      setActiveResultId(latestResult.id);
      setSidePanelMode("results");
      return;
    }

    const preferredArtifact = activeDialogueArtifacts[0];
    if (!preferredArtifact) {
      return;
    }
    setPreferredArtifactId(preferredArtifact.id);
    setIsArtifactPreviewing(true);
    setSidePanelWidth(currentWidth =>
      clampSidePanelWidth(Math.max(currentWidth, DIALOGUE_ARTIFACT_PREVIEW_PANEL_DEFAULT_WIDTH)),
    );
    setSidePanelMode("artifacts");
  }, [
    activeDialogueArtifacts,
    activeDialogueResults,
    caseReplayOpenPanel,
    clampSidePanelWidth,
    isCaseReplayMode,
    isHomeVisible,
  ]);

  useEffect(() => {
    if (!isEmployeeSwitcherOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (employeeSwitcherRef.current?.contains(event.target)) {
        return;
      }
      if (homeEmployeeSwitcherRef.current?.contains(event.target)) {
        return;
      }
      setIsEmployeeSwitcherOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isEmployeeSwitcherOpen]);

  useEffect(() => {
    if (!isSidebarCollapsed) {
      return;
    }

    setIsEmployeeSwitcherOpen(false);
    setEditingSessionId(null);
    setEditingSessionTitle("");
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!isStackedLayout) {
      return;
    }

    setIsSidebarCollapsed(false);
  }, [isStackedLayout]);

  useEffect(() => {
    const skillTrackElement = skillTrackRef.current;
    if (!skillTrackElement) {
      return;
    }

    const updateSkillTrackWidth = (): void => {
      setSkillTrackWidth(skillTrackElement.clientWidth);
    };

    updateSkillTrackWidth();

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        updateSkillTrackWidth();
      });
      resizeObserver.observe(skillTrackElement);
      return () => {
        resizeObserver.disconnect();
      };
    }

    window.addEventListener("resize", updateSkillTrackWidth);
    return () => {
      window.removeEventListener("resize", updateSkillTrackWidth);
    };
  }, []);

  useEffect(() => {
    const handleResize = (): void => {
      setViewportWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedWidth = window.localStorage.getItem(DIALOGUE_SIDE_PANEL_WIDTH_KEY);
    const nextWidth = clampSidePanelWidth(
      savedWidth ? Number.parseFloat(savedWidth) : DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH,
    );
    setSidePanelWidth(nextWidth);
    sidePanelPendingWidthRef.current = nextWidth;
  }, [clampSidePanelWidth]);

  useEffect(() => {
    const nextWidth = clampSidePanelWidth(sidePanelPendingWidthRef.current);
    setSidePanelWidth(nextWidth);
    sidePanelPendingWidthRef.current = nextWidth;
  }, [clampSidePanelWidth, viewportWidth]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DIALOGUE_SIDE_PANEL_WIDTH_KEY, String(resolvedSidePanelWidth));
  }, [resolvedSidePanelWidth]);

  useEffect(() => {
    const applyPendingSidePanelWidth = (): void => {
      sidePanelResizeFrameRef.current = null;

      if (!dialogueShellRef.current || isStackedLayout) {
        return;
      }

      dialogueShellRef.current.style.gridTemplateColumns = buildVisibleSidePanelGridTemplateColumns(
        sidePanelPendingWidthRef.current,
      );
    };

    const handlePointerMove = (event: MouseEvent): void => {
      const current = sidePanelResizeStateRef.current;
      if (!current || isStackedLayout) {
        return;
      }
      const deltaX = event.clientX - current.startX;
      const nextWidth = clampSidePanelWidth(current.startWidth - deltaX);
      sidePanelPendingWidthRef.current = nextWidth;

      if (sidePanelResizeFrameRef.current === null) {
        sidePanelResizeFrameRef.current = window.requestAnimationFrame(applyPendingSidePanelWidth);
      }
    };

    const handlePointerUp = (): void => {
      if (!sidePanelResizeStateRef.current) {
        return;
      }

      if (sidePanelResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(sidePanelResizeFrameRef.current);
        sidePanelResizeFrameRef.current = null;
      }

      applyPendingSidePanelWidth();
      setSidePanelWidth(sidePanelPendingWidthRef.current);
      sidePanelResizeStateRef.current = null;
      setIsSidePanelResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    return () => {
      if (sidePanelResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(sidePanelResizeFrameRef.current);
        sidePanelResizeFrameRef.current = null;
      }
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [buildVisibleSidePanelGridTemplateColumns, clampSidePanelWidth, isStackedLayout]);

  const handleMenuButtonClick = (event: ReactMouseEvent<HTMLElement>): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleMenuButtonKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    event.stopPropagation();
  };

  const handleStartRenameSession = (sessionId: string, currentTitle: string): void => {
    setEditingSessionId(sessionId);
    setEditingSessionTitle(currentTitle);
  };

  const handleCancelRenameSession = (): void => {
    setEditingSessionId(null);
    setEditingSessionTitle("");
  };

  const handleSubmitRenameSession = (): void => {
    if (!editingSessionId) return;
    const nextTitle = editingSessionTitle.trim();
    if (!nextTitle) return;
    onRenameDialogueSession(editingSessionId, nextTitle);
    setEditingSessionId(null);
    setEditingSessionTitle("");
  };

  const getDialogueSessionMenuItems = (
    sessionId: string,
    currentTitle: string,
  ): MenuProps["items"] => [
    {
      key: "rename",
      label: "重命名",
      onClick: () => handleStartRenameSession(sessionId, currentTitle),
    },
    {
      key: "remove",
      label: "删除",
      danger: true,
      onClick: () => onRemoveDialogueSession(sessionId),
    },
  ];

  const getEmployeeMenuItems = (employee: EmployeeItem): MenuProps["items"] => [
    {
      key: "remove",
      label: "移除",
      danger: true,
      onClick: () => onRemoveEmployee?.(employee.id),
    },
  ];

  const resolveExpertTeamMembersForItem = useCallback(
    (employee: EmployeeItem): EmployeeItem[] => {
      if (!employee.isExpertTeam || !employee.expertTeamMemberIds?.length) {
        return [];
      }

      return employee.expertTeamMemberIds
        .map(memberId => conversationEmployeeDirectory.find(item => item.id === memberId) ?? null)
        .filter((item): item is EmployeeItem => item !== null);
    },
    [conversationEmployeeDirectory],
  );
  const employeeSwitcherMenu = (
    <div className={styles.dialogueSwitcherList}>
      {employeeGroups.map(group => (
        <div key={group.key} className={styles.dialogueSwitcherGroup}>
          <div className={styles.dialogueSwitcherGroupTitle}>{group.title}</div>
          {group.items.map(item => {
            const teamMembers = resolveExpertTeamMembersForItem(item);

            return (
              <div key={item.id} className={styles.dialogueSwitcherItemRow}>
                <button
                  type="button"
                  className={classNames(styles.dialogueSwitcherItem, {
                    [styles.dialogueSwitcherItemActive]: item.id === activeEmployee.id,
                  })}
                  title={item.name}
                  onClick={() => {
                    onEmployeeSelect(item.id);
                    setIsEmployeeSwitcherOpen(false);
                  }}
                >
                  {shouldRenderAsExpertTeam(item) && !isMetaCoordinatorAgent(item) ? (
                    <DialogueTeamAvatar team={item} members={teamMembers} />
                  ) : (
                    <span className={styles.employeeAvatarWrap}>
                      <Avatar src={item.avatarUrl} size={40} className={styles.dialogueHeroAvatar}>
                        {getAvatarText(item.name)}
                      </Avatar>
                      <span
                        className={classNames(styles.employeeStatusDot, {
                          [styles.employeeStatusDotBusy]: item.status === "running",
                          [styles.employeeStatusDotOffline]: item.status === "offline",
                          [styles.employeeStatusDotError]: item.status === "exception",
                        })}
                      />
                    </span>
                  )}
                  <span className={styles.dialogueSwitcherItemBody}>
                    <span className={styles.dialogueSwitcherItemName} title={item.name}>
                      {item.name}
                    </span>
                  </span>
                </button>
                {canRemoveEmployee ? (
                  <Dropdown
                    menu={{
                      items: getEmployeeMenuItems(item),
                    }}
                    trigger={["click"]}
                  >
                    <button
                      type="button"
                      className={styles.dialogueSwitcherAgentAction}
                      aria-label="AI 专家操作"
                      onClick={handleMenuButtonClick}
                      onKeyDown={handleMenuButtonKeyDown}
                    >
                      <MoreOutlined />
                    </button>
                  </Dropdown>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const homeEmployeeSwitcherMenu = (
    <div className={styles.dialogueHomeExpertDropdownMenu}>
      {allEmployees.map(item => {
        const teamMembers = resolveExpertTeamMembersForItem(item);
        const isActive = item.id === activeEmployee.id;

        return (
          <button
            key={item.id}
            type="button"
            className={classNames(styles.dialogueHomeExpertOption, {
              [styles.dialogueHomeExpertOptionActive]: isActive,
            })}
            title={item.name}
            onClick={event => {
              event.stopPropagation();
              onEmployeeSelect(item.id);
              setIsEmployeeSwitcherOpen(false);
            }}
          >
            {shouldRenderAsExpertTeam(item) && !isMetaCoordinatorAgent(item) ? (
              <DialogueTeamAvatar team={item} members={teamMembers} />
            ) : (
              <span className={styles.employeeAvatarWrap}>
                <Avatar src={item.avatarUrl} size={34} className={styles.dialogueHeroAvatar}>
                  {getAvatarText(item.name)}
                </Avatar>
                <span
                  className={classNames(styles.employeeStatusDot, {
                    [styles.employeeStatusDotBusy]: item.status === "running",
                    [styles.employeeStatusDotOffline]: item.status === "offline",
                    [styles.employeeStatusDotError]: item.status === "exception",
                  })}
                />
              </span>
            )}
            <span className={styles.dialogueHomeExpertOptionName}>{item.name}</span>
            {isActive ? <CheckOutlined className={styles.dialogueHomeExpertOptionCheck} /> : null}
          </button>
        );
      })}
    </div>
  );

  const handleOpenArtifact = (block: Block): void => {
    const blockData =
      block.data && typeof block.data === "object" ? (block.data as Record<string, unknown>) : null;
    const artifactId =
      blockData && typeof blockData.artifact_id === "string" ? blockData.artifact_id.trim() : "";
    if (!artifactId) {
      return;
    }

    const matchedFile = activeDialogueArtifacts.find(
      item => item.id === artifactId || item.artifactId === artifactId,
    );
    if (!matchedFile) {
      return;
    }

    setPreferredArtifactId(matchedFile.id);
    setIsArtifactPreviewing(true);
    setSidePanelWidth(currentWidth =>
      clampSidePanelWidth(Math.max(currentWidth, DIALOGUE_ARTIFACT_PREVIEW_PANEL_DEFAULT_WIDTH)),
    );
    setSidePanelMode("artifacts");
  };

  const handleOpenResult = (resultId: string): void => {
    if (!activeDialogueResults.some(item => item.id === resultId)) {
      return;
    }
    setSidePanelWidth(currentWidth =>
      clampSidePanelWidth(Math.max(currentWidth, DIALOGUE_RESULT_PANEL_DEFAULT_WIDTH)),
    );
    setActiveResultId(resultId);
    setSidePanelMode("results");
  };

  const handleToggleArtifactsPanel = (): void => {
    if (!hasArtifactPanel) {
      return;
    }
    setPreferredArtifactId(undefined);
    setIsArtifactPreviewing(false);
    setSidePanelWidth(clampSidePanelWidth(DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH));
    setSidePanelMode(current => (current === "artifacts" ? null : "artifacts"));
  };

  const handleSelectResultCard = (resultId: string): void => {
    if (!activeDialogueResults.some(item => item.id === resultId)) {
      return;
    }
    setSidePanelWidth(currentWidth =>
      clampSidePanelWidth(Math.max(currentWidth, DIALOGUE_RESULT_PANEL_DEFAULT_WIDTH)),
    );
    setActiveResultId(resultId);
    setSidePanelMode("results");
  };

  const handleLocateDialogueHistoryMessage = (sessionId: string, anchorBlockId: string): void => {
    if (!anchorBlockId.trim()) {
      return;
    }

    if (sessionId !== activeDialogueSession?.id) {
      onDialogueSessionSelect(sessionId);
    }

    setHistoryFocusBlockId(anchorBlockId);
    setHistoryFocusRequestKey(`${sessionId}:${anchorBlockId}:${Date.now()}`);
  };

  const handleSidePanelResizeStart = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (isStackedLayout) {
      return;
    }
    event.preventDefault();
    sidePanelResizeStateRef.current = {
      startX: event.clientX,
      startWidth: resolvedSidePanelWidth,
    };
    sidePanelPendingWidthRef.current = resolvedSidePanelWidth;
    setIsSidePanelResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleToggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed(current => !current);
    setIsEmployeeSwitcherOpen(false);
  }, []);

  const handleExpandSidebar = useCallback(() => {
    setIsSidebarCollapsed(false);
  }, []);

  const handleToggleMetaAgentTrajectoryTimeFilter = (): void => {
    setIsMetaAgentTrajectoryTimeFilterOpen(current => !current);
    setMetaAgentTrajectoryTimeFilterView("options");
    setMetaAgentTrajectoryDraftDateRange(metaAgentTrajectoryDateRange ?? [null, null]);
  };

  const handleSelectMetaAgentTrajectoryTimeFilter = (
    filterKey: MetaAgentTrajectoryTimeFilterKey,
  ): void => {
    if (filterKey === "custom") {
      setMetaAgentTrajectoryTimeFilterView("custom");
      setMetaAgentTrajectoryDraftDateRange(metaAgentTrajectoryDateRange ?? [null, null]);
      return;
    }

    setMetaAgentTrajectoryTimeFilterKey(filterKey);
    setIsMetaAgentTrajectoryTimeFilterOpen(false);
    setMetaAgentTrajectoryTimeFilterView("options");
  };

  const handleMetaAgentTrajectoryCustomDateChange = (
    fieldIndex: 0 | 1,
    value: Dayjs | null,
  ): void => {
    setMetaAgentTrajectoryDraftDateRange(current => {
      const nextRange: [Dayjs | null, Dayjs | null] = [current[0], current[1]];
      nextRange[fieldIndex] = value;
      return nextRange;
    });
  };

  const handleCancelMetaAgentTrajectoryCustomRange = (): void => {
    setMetaAgentTrajectoryDraftDateRange(metaAgentTrajectoryDateRange ?? [null, null]);
    setMetaAgentTrajectoryTimeFilterView("options");
  };

  const handleConfirmMetaAgentTrajectoryCustomRange = (): void => {
    const [rangeStart, rangeEnd] = metaAgentTrajectoryDraftDateRange;

    if (!rangeStart || !rangeEnd) {
      return;
    }

    const normalizedRange: [Dayjs, Dayjs] = rangeStart.isAfter(rangeEnd)
      ? [rangeEnd, rangeStart]
      : [rangeStart, rangeEnd];

    setMetaAgentTrajectoryDateRange(normalizedRange);
    setMetaAgentTrajectoryTimeFilterKey("custom");
    setIsMetaAgentTrajectoryTimeFilterOpen(false);
    setMetaAgentTrajectoryTimeFilterView("options");
  };

  const handleLocateMetaAgentTrajectory = (trajectoryId: string, anchorBlockId?: string): void => {
    onSelectMetaAgentTrajectory(trajectoryId, anchorBlockId);
    setSelectedMetaAgentTrajectoryDetailId(null);
    setSelectedMetaAgentTrajectoryDetailTab("tasks");
    setIsMetaAgentTrajectoryOpen(false);
  };

  const handleToggleOutputTaskGroup = (trajectoryId: string): void => {
    setExpandedOutputTaskGroupIds(current => {
      const nextGroupIds = new Set(current);

      if (nextGroupIds.has(trajectoryId)) {
        nextGroupIds.delete(trajectoryId);
      } else {
        nextGroupIds.add(trajectoryId);
      }

      return nextGroupIds;
    });
  };

  const getTrajectoryParticipantItems = (participantNames: string[]): EmployeeItem[] =>
    participantNames
      .map(name => trajectoryParticipantDirectory.get(name) ?? null)
      .filter((employee): employee is EmployeeItem => employee !== null)
      .slice(0, 3);

  const renderMetaAgentTrajectoryRecordCard = (
    item: MetaAgentWorkTrajectoryItem,
    variant: "timeline" | "search",
  ): JSX.Element => {
    const participantItems = getTrajectoryParticipantItems(item.participantNames);

    return (
      <button
        key={item.id}
        type="button"
        className={classNames(styles.metaAgentTrajectoryRecordCard, {
          [styles.metaAgentTrajectoryRecordCardSearch]: variant === "search",
        })}
        onClick={() => {
          setSelectedMetaAgentTrajectoryDetailId(item.id);
          setSelectedMetaAgentTrajectoryDetailTab("tasks");
        }}
      >
        <div className={styles.metaAgentTrajectoryRecordCardHeader}>
          <span className={styles.metaAgentTrajectoryRecordCardTitle}>{item.title}</span>
          <span className={styles.metaAgentTrajectoryRecordCardTime}>{item.displayTimeLabel}</span>
        </div>
        <div className={styles.metaAgentTrajectoryRecordCardSummary}>{item.resultPreview}</div>
        {participantItems.length ? (
          <div className={styles.metaAgentTrajectoryRecordCardExperts}>
            <div className={styles.metaAgentTrajectoryParticipantAvatars}>
              {participantItems.map(participant => (
                <Avatar
                  key={participant.id}
                  src={participant.avatarUrl}
                  size={24}
                  className={styles.metaAgentTrajectoryParticipantAvatar}
                >
                  {getAvatarText(participant.name)}
                </Avatar>
              ))}
            </div>
            <span className={styles.metaAgentTrajectoryRecordCardExpertsLabel}>
              {item.participantNames.join("、")}
            </span>
          </div>
        ) : null}
        {item.deliverables.length ? (
          <div className={styles.metaAgentTrajectoryRecordCardDeliverables}>
            <span className={styles.metaAgentTrajectoryRecordCardDeliverableLabel}>成果</span>
            <div className={styles.metaAgentTrajectoryRecordCardDeliverableList}>
              {item.deliverables.map(deliverable => {
                const fileLogo = resolveFileLogo(deliverable.fileName);

                return (
                  <span key={deliverable.id} className={styles.metaAgentTrajectoryDeliverableItem}>
                    <span className={styles.metaAgentTrajectoryDeliverableIcon} aria-hidden={true}>
                      <img
                        className={styles.metaAgentTrajectoryDeliverableIconImage}
                        src={fileLogo.src}
                        alt={fileLogo.alt}
                      />
                    </span>
                    <span className={styles.metaAgentTrajectoryDeliverableBody}>
                      <span
                        className={styles.metaAgentTrajectoryDeliverableTitle}
                        title={deliverable.fileName}
                      >
                        {deliverable.fileName}
                      </span>
                      <span className={styles.metaAgentTrajectoryDeliverableMeta}>
                        {deliverable.metaLabel}
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className={styles.metaAgentTrajectoryRecordCardFooter}>
          <span>{`${item.tasks.length} 个任务 · ${item.deliverables.length} 个成果`}</span>
          <span>查看详情</span>
        </div>
      </button>
    );
  };

  const renderMetaAgentTrajectoryDetail = (item: MetaAgentWorkTrajectoryItem): JSX.Element => (
    <div className={styles.metaAgentTrajectoryDetailMask} role="presentation">
      <section className={styles.metaAgentTrajectoryDetailPanel} aria-label="工作轨迹详情">
        <header className={styles.metaAgentTrajectoryDetailHeader}>
          <div className={styles.metaAgentTrajectoryDetailTitleGroup}>
            <span className={styles.metaAgentTrajectoryDetailEyebrow}>
              {`${item.displayTimeLabel} 自动总结`}
            </span>
            <h3>{item.title}</h3>
            <p>{item.resultPreview}</p>
          </div>
          <button
            type="button"
            className={styles.metaAgentTrajectoryDismissButton}
            onClick={() => {
              setSelectedMetaAgentTrajectoryDetailId(null);
              setSelectedMetaAgentTrajectoryDetailTab("tasks");
            }}
          >
            <CloseOutlined />
          </button>
        </header>

        <div className={styles.metaAgentTrajectoryDetailTabs} role="tablist" aria-label="详情内容">
          <button
            type="button"
            role="tab"
            aria-selected={selectedMetaAgentTrajectoryDetailTab === "tasks"}
            className={classNames(styles.metaAgentTrajectoryDetailTab, {
              [styles.metaAgentTrajectoryDetailTabActive]:
                selectedMetaAgentTrajectoryDetailTab === "tasks",
            })}
            onClick={() => setSelectedMetaAgentTrajectoryDetailTab("tasks")}
          >
            <span>任务</span>
            <strong>{item.tasks.length}</strong>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedMetaAgentTrajectoryDetailTab === "deliverables"}
            className={classNames(styles.metaAgentTrajectoryDetailTab, {
              [styles.metaAgentTrajectoryDetailTabActive]:
                selectedMetaAgentTrajectoryDetailTab === "deliverables",
            })}
            onClick={() => setSelectedMetaAgentTrajectoryDetailTab("deliverables")}
          >
            <span>成果</span>
            <strong>{item.deliverables.length}</strong>
          </button>
        </div>

        <div className={styles.metaAgentTrajectoryDetailBody}>
          {selectedMetaAgentTrajectoryDetailTab === "tasks" ? (
            <div className={styles.metaAgentTrajectoryDetailList}>
              {item.tasks.map(task => (
                <button
                  key={task.id}
                  type="button"
                  className={styles.metaAgentTrajectoryDetailTask}
                  onClick={() => handleLocateMetaAgentTrajectory(item.id, task.anchorBlockId)}
                >
                  <span className={styles.metaAgentTrajectoryDetailTaskStatus}>
                    {getMetaAgentTaskStatusLabel(task.status)}
                  </span>
                  <span className={styles.metaAgentTrajectoryDetailTaskBody}>
                    <strong>{task.title}</strong>
                    <span>{`${task.agentName} · ${task.metaLabel}`}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {selectedMetaAgentTrajectoryDetailTab === "deliverables" ? (
            item.deliverables.length ? (
              <div className={styles.metaAgentTrajectoryDetailList}>
                {item.deliverables.map(deliverable => {
                  const fileLogo = resolveFileLogo(deliverable.fileName);

                  return (
                    <button
                      key={deliverable.id}
                      type="button"
                      className={styles.metaAgentTrajectoryDetailDeliverable}
                      onClick={() =>
                        handleLocateMetaAgentTrajectory(
                          item.id,
                          deliverable.anchorBlockId ?? item.anchorBlockId,
                        )
                      }
                    >
                      <span
                        className={styles.metaAgentTrajectoryDeliverableIcon}
                        aria-hidden={true}
                      >
                        <img
                          className={styles.metaAgentTrajectoryDeliverableIconImage}
                          src={fileLogo.src}
                          alt={fileLogo.alt}
                        />
                      </span>
                      <span className={styles.metaAgentTrajectoryDetailTaskBody}>
                        <strong>{deliverable.fileName}</strong>
                        <span>{deliverable.metaLabel}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.metaAgentTrajectoryDetailEmpty}>当天暂无成果文件。</div>
            )
          ) : null}
        </div>
      </section>
    </div>
  );

  const renderOutputTaskPanel = (): JSX.Element => {
    if (!metaAgentTrajectoryItems.length) {
      return <div className={styles.outputPanelEmpty}>当前还没有任务记录。</div>;
    }

    return (
      <div className={styles.outputTaskList}>
        {metaAgentTrajectoryItems.map(item => {
          const isExpanded = expandedOutputTaskGroupIds.has(item.id);

          return (
            <section key={item.id} className={styles.outputTaskGroup}>
              <button
                type="button"
                className={styles.outputTaskGroupHeader}
                aria-expanded={isExpanded}
                onClick={() => handleToggleOutputTaskGroup(item.id)}
              >
                <span className={styles.outputTaskGroupTitle} title={item.title}>
                  {item.title}
                </span>
                <span className={styles.outputTaskGroupMeta}>
                  <span className={styles.outputTaskGroupCount}>{item.tasks.length}</span>
                  <span
                    className={classNames(styles.outputTaskGroupChevron, {
                      [styles.outputTaskGroupChevronOpen]: isExpanded,
                    })}
                    aria-hidden={true}
                  />
                </span>
              </button>
              {isExpanded ? (
                <div className={styles.outputTaskGroupBody}>
                  {item.tasks.map(task => (
                    <button
                      key={task.id}
                      type="button"
                      className={styles.outputTaskItem}
                      onClick={() => handleLocateMetaAgentTrajectory(item.id, task.anchorBlockId)}
                    >
                      <span className={styles.outputTaskStatus}>
                        {getMetaAgentTaskStatusLabel(task.status)}
                      </span>
                      <span className={styles.outputTaskBody}>
                        <strong>{task.title}</strong>
                        <span>{`${task.agentName} · ${task.metaLabel}`}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    );
  };

  const composerNode = isCaseReplayMode ? (
    <div className={styles.dialogueCaseActionWrap}>
      <button
        type="button"
        className={classNames(styles.primaryButton, styles.dialogueCaseActionButton)}
        onClick={onCaseReplayAction}
      >
        {caseReplayActionLabel ?? "立即实践"}
      </button>
    </div>
  ) : (
    <div className={styles.composerWrap}>
      <WorkspaceComposer
        rootClassName={styles.synclawComposer}
        value={dialogueInputValue}
        placeholder={dialoguePlaceholder}
        mentionOptions={activeEmployee.isExpertTeam ? [] : expertTeamMentionOptions}
        attachments={dialogueAttachments}
        onRemoveAttachment={onRemoveAttachment}
        onAttachmentsSelected={onDialogueAttachmentsSelected}
        allowAttachmentOnlySend={true}
        footerExtra={
          shouldShowComposerSkillBar ? (
            <div className={styles.dialogueComposerSkillBar}>
              <span className={styles.dialogueComposerSkillDivider} aria-hidden={true} />
              <div ref={skillTrackRef} className={styles.dialogueComposerSkillTrack}>
                {selectedSkillItems.map(skill => (
                  <div key={skill.id} className={styles.dialogueComposerSkillSelected}>
                    <span className={styles.dialogueComposerSkillIcon}>
                      {renderSkillIcon(skill.iconKey)}
                    </span>
                    <span className={styles.dialogueComposerSkillLabel}>{skill.name}</span>
                    <button
                      type="button"
                      className={styles.dialogueComposerSkillClearButton}
                      aria-label={`取消选择 ${skill.name}`}
                      onClick={() => onSkillSelect(skill.id)}
                    >
                      <CloseOutlined />
                    </button>
                  </div>
                ))}
                {visibleSkillItems.map(skill => (
                  <button
                    key={skill.id}
                    type="button"
                    className={styles.dialogueComposerSkillButton}
                    onClick={() => onSkillSelect(skill.id)}
                  >
                    <span className={styles.dialogueComposerSkillIcon}>
                      {renderSkillIcon(skill.iconKey)}
                    </span>
                    <span className={styles.dialogueComposerSkillLabel}>{skill.name}</span>
                  </button>
                ))}
                {overflowSkillItems.length > 0 ? (
                  <Dropdown
                    menu={{
                      items: moreSkillMenuItems,
                      onClick: ({ key }) => onSkillSelect(String(key)),
                    }}
                    placement="topLeft"
                    trigger={["click"]}
                  >
                    <button type="button" className={styles.dialogueComposerSkillButton}>
                      <span className={styles.dialogueComposerSkillIcon}>
                        <MoreOutlined />
                      </span>
                      <span className={styles.dialogueComposerSkillLabel}>更多</span>
                    </button>
                  </Dropdown>
                ) : null}
              </div>
            </div>
          ) : null
        }
        sending={isDialogueResponding}
        showModelSelector={false}
        modelLabel={activeEmployee.model}
        selectedModelId={WORKSPACE_MODEL_OPTIONS[0]?.id ?? 1}
        modelMenuOpen={false}
        modelOptions={WORKSPACE_MODEL_OPTIONS}
        onValueChange={onDialogueInputChange}
        onAttach={() => attachmentInputRef.current?.click()}
        onSend={onSendDialogue}
        onAbort={onStopDialogue}
        isChatPage={true}
      />
      <input
        ref={attachmentInputRef}
        className={styles.hiddenInput}
        type="file"
        multiple={true}
        accept={CHAT_ATTACHMENT_ACCEPT_ATTR}
        onChange={handleFileInputChange}
      />
    </div>
  );
  const expertTeamMemberAvatars =
    shouldShowExpertTeamUi && activeExpertTeamMembers.length > 0 ? (
      <>
        {activeExpertTeamMembers.map(member => {
          const isMainAgent = member.name === EXPERT_TEAM_MAIN_AGENT_NAME;
          const memberSkillNames = homeSkillItems
            .filter(skill => member.skills?.includes(skill.id))
            .map(skill => skill.name);

          return (
            <Popover
              key={member.id}
              placement="top"
              content={
                <div className={styles.dialogueExpertCard}>
                  <div className={styles.dialogueExpertCardHeader}>
                    <Avatar
                      src={member.avatarUrl}
                      size={40}
                      className={classNames(
                        styles.dialogueExpertAvatar,
                        isMainAgent && styles.dialogueExpertAvatarMainAgent,
                      )}
                    >
                      {getAvatarText(member.name)}
                    </Avatar>
                    <div className={styles.dialogueExpertCardCopy}>
                      <div className={styles.dialogueExpertCardName}>{member.name}</div>
                    </div>
                  </div>
                  <div className={styles.dialogueExpertCardSummary}>{member.summary}</div>
                  {memberSkillNames.length > 0 ? (
                    <div className={styles.dialogueExpertCardSkills}>
                      {memberSkillNames.map(skillName => (
                        <span key={skillName} className={styles.dialogueExpertCardSkillTag}>
                          {skillName}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              }
            >
              <button type="button" className={styles.dialogueExpertAvatarButton}>
                <Avatar
                  src={member.avatarUrl}
                  size={40}
                  className={classNames(
                    styles.dialogueExpertAvatar,
                    isMainAgent && styles.dialogueExpertAvatarMainAgent,
                  )}
                >
                  {getAvatarText(member.name)}
                </Avatar>
              </button>
            </Popover>
          );
        })}
      </>
    ) : null;
  const expertTeamMemberStrip = expertTeamMemberAvatars ? (
    <div className={styles.dialogueExpertTeamStrip}>
      <div className={styles.dialogueExpertTeamAvatars}>{expertTeamMemberAvatars}</div>
    </div>
  ) : null;
  const expertTeamScenarioLabel = useMemo(
    () =>
      shouldShowExpertTeamUi
        ? getExpertTeamScenarioLabel(activeEmployee.summary, activeEmployee.name)
        : "",
    [activeEmployee.name, activeEmployee.summary, shouldShowExpertTeamUi],
  );
  const expertTeamHomeLabel = useMemo(() => {
    if (!shouldShowExpertTeamUi) {
      return "";
    }

    const normalizedTeamName = activeEmployee.name.replace(/专家团$/, "").trim();

    return normalizedTeamName || expertTeamScenarioLabel || activeEmployee.name;
  }, [activeEmployee.name, expertTeamScenarioLabel, shouldShowExpertTeamUi]);
  const dialogueHomeHeroTitle = shouldShowExpertTeamUi
    ? `Hi ${viewerName}，请说你的${expertTeamHomeLabel}需求`
    : `Hi ${viewerName}，有什么可以帮你的？`;

  return (
    <div
      ref={dialogueShellRef}
      className={classNames(styles.dialogueShell, {
        [styles.dialogueShellArtifactsHidden]: !isSidePanelVisible,
        [styles.dialogueShellResizing]: isSidePanelResizing,
        [styles.dialogueShellRuntimeSidebarCollapsed]:
          isSidebarCollapsed && isSidePanelVisible && !isStackedLayout,
        [styles.dialogueShellRuntimeSidebarCollapsedArtifactsHidden]:
          isSidebarCollapsed && !isSidePanelVisible && !isStackedLayout,
      })}
      style={dialogueShellStyle}
    >
      {shouldShowAgentSidebar ? (
        <aside
          className={classNames(styles.dialogueSidebarCard, {
            [styles.dialogueSidebarCardCollapsed]: isSidebarCollapsed,
          })}
        >
          {isSidebarCollapsed ? (
            <button
              type="button"
              className={classNames(
                styles.dialogueCollapsedAvatarButton,
                styles.dialogueCollapsedBrandButton,
              )}
              aria-label={`展开左侧栏，当前 AI 专家：${activeEmployee.name}`}
              onClick={handleExpandSidebar}
            >
              <span className={styles.dialogueCollapsedBrandLogo}>
                <span className={styles.dialogueCollapsedAvatarWrap}>
                  {shouldShowExpertTeamUi ? (
                    <DialogueTeamAvatar team={activeEmployee} members={activeExpertTeamMembers} />
                  ) : (
                    <span className={styles.employeeAvatarWrap}>
                      <Avatar
                        src={activeEmployee.avatarUrl}
                        size={40}
                        className={classNames(
                          styles.dialogueHeroAvatar,
                          styles.dialogueCollapsedAvatar,
                        )}
                      >
                        {getAvatarText(activeEmployee.name)}
                      </Avatar>
                      <span
                        className={classNames(
                          styles.employeeStatusDot,
                          styles.dialogueCollapsedAvatarDot,
                          {
                            [styles.employeeStatusDotBusy]: activeEmployee.status === "running",
                            [styles.employeeStatusDotOffline]: activeEmployee.status === "offline",
                            [styles.employeeStatusDotError]: activeEmployee.status === "exception",
                          },
                        )}
                      />
                    </span>
                  )}
                </span>
              </span>
              <span className={styles.dialogueCollapsedBrandExpand}>
                <MenuUnfoldOutlined />
              </span>
            </button>
          ) : (
            <>
              <div className={styles.dialogueSidebarTopBar}>
                <div className={styles.dialogueSidebarSectionTitle}>AI 专家</div>
                {!isStackedLayout ? (
                  <button
                    type="button"
                    className={styles.dialogueSidebarIconButton}
                    aria-label="收起左侧栏"
                    onClick={handleToggleSidebarCollapsed}
                  >
                    <MenuFoldOutlined />
                  </button>
                ) : null}
              </div>

              {showAgentSwitcher ? (
                <div ref={employeeSwitcherRef} className={styles.dialogueAgentListSection}>
                  <button
                    type="button"
                    className={styles.dialogueAgentSelectButton}
                    aria-expanded={isEmployeeSwitcherOpen}
                    aria-label="切换 AI 专家"
                    title={activeEmployee.name}
                    onClick={() => setIsEmployeeSwitcherOpen(current => !current)}
                  >
                    <span className={styles.dialogueAgentSelectCurrent}>
                      {shouldShowExpertTeamUi ? (
                        <DialogueTeamAvatar
                          team={activeEmployee}
                          members={activeExpertTeamMembers}
                        />
                      ) : (
                        <span className={styles.employeeAvatarWrap}>
                          <Avatar
                            src={activeEmployee.avatarUrl}
                            size={40}
                            className={styles.dialogueHeroAvatar}
                          >
                            {getAvatarText(activeEmployee.name)}
                          </Avatar>
                          <span
                            className={classNames(styles.employeeStatusDot, {
                              [styles.employeeStatusDotBusy]: activeEmployee.status === "running",
                              [styles.employeeStatusDotOffline]:
                                activeEmployee.status === "offline",
                              [styles.employeeStatusDotError]:
                                activeEmployee.status === "exception",
                            })}
                          />
                        </span>
                      )}
                      <span className={styles.dialogueSwitcherItemBody}>
                        <span className={styles.dialogueSwitcherItemName}>
                          {activeEmployee.name}
                        </span>
                      </span>
                    </span>
                    <DownOutlined
                      className={classNames(styles.dialogueAgentSelectArrow, {
                        [styles.dialogueAgentSelectArrowOpen]: isEmployeeSwitcherOpen,
                      })}
                    />
                  </button>

                  {isEmployeeSwitcherOpen ? (
                    <div className={styles.dialogueAgentDropdownMenu}>{employeeSwitcherMenu}</div>
                  ) : null}
                </div>
              ) : null}

              {supportsDialogueSessions ? (
                <>
                  <button
                    type="button"
                    className={styles.dialogueNewSessionButton}
                    onClick={onCreateDialogueSession}
                  >
                    <PlusOutlined />
                    <span>新对话</span>
                  </button>

                  {showDialogueSessionMenu ? (
                    <div className={styles.dialogueSessionSection}>
                      <div className={styles.dialogueSessionHeading}>会话记录</div>
                      <div className={styles.dialogueSessionList}>
                        {dialogueSessionGroups.length > 0 ? (
                          dialogueSessionGroups.map(group => (
                            <div key={group.employee.id} className={styles.dialogueSwitcherGroup}>
                              <div className={styles.dialogueSwitcherGroupTitle}>
                                {group.employee.name}
                              </div>
                              {group.sessions.map(item => (
                                <div
                                  key={item.id}
                                  className={classNames(styles.dialogueSessionItem, {
                                    [styles.dialogueSessionItemActive]:
                                      item.id === activeDialogueSession?.id,
                                  })}
                                >
                                  {editingSessionId === item.id ? (
                                    <div className={styles.dialogueSessionEditor}>
                                      <Input
                                        ref={sessionTitleInputRef}
                                        size="small"
                                        value={editingSessionTitle}
                                        placeholder="输入会话名称"
                                        onClick={event => event.stopPropagation()}
                                        onChange={event =>
                                          setEditingSessionTitle(event.target.value)
                                        }
                                        onPressEnter={() => handleSubmitRenameSession()}
                                      />
                                      <div className={styles.dialogueSessionEditorActions}>
                                        <button
                                          type="button"
                                          className={styles.dialogueSessionEditorButton}
                                          aria-label="保存会话名称"
                                          onClick={handleSubmitRenameSession}
                                        >
                                          <CheckOutlined />
                                        </button>
                                        <button
                                          type="button"
                                          className={styles.dialogueSessionEditorButton}
                                          aria-label="取消重命名"
                                          onClick={handleCancelRenameSession}
                                        >
                                          <CloseOutlined />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        className={styles.dialogueSessionMainButton}
                                        onClick={() => onDialogueSessionSelect(item.id)}
                                      >
                                        <span className={styles.dialogueSessionContent}>
                                          <span className={styles.dialogueSessionTitle}>
                                            {item.title}
                                          </span>
                                          <span className={styles.dialogueSessionTime}>
                                            {item.updatedAt}
                                          </span>
                                        </span>
                                      </button>
                                      <Dropdown
                                        menu={{
                                          items: getDialogueSessionMenuItems(item.id, item.title),
                                        }}
                                        trigger={["click"]}
                                      >
                                        <button
                                          type="button"
                                          className={styles.dialogueSessionMenuButton}
                                          aria-label="会话操作"
                                          onClick={handleMenuButtonClick}
                                          onKeyDown={handleMenuButtonKeyDown}
                                        >
                                          <MoreOutlined />
                                        </button>
                                      </Dropdown>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          <div className={styles.dialogueSessionEmpty}>暂无历史会话</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {showAccountEntry ? (
                <div className={classNames(styles.sidebarBottom, styles.dialogueSidebarFooter)}>
                  <Dropdown
                    menu={{ items: accountMenuItems }}
                    placement="topLeft"
                    trigger={["click"]}
                  >
                    <button
                      type="button"
                      className={classNames(styles.accountTrigger, styles.accountTriggerExpanded)}
                      aria-label="打开账户菜单"
                    >
                      <Avatar className={styles.accountAvatar} size={36}>
                        {viewerName.slice(0, 1)}
                      </Avatar>
                      <span className={styles.accountBody}>
                        <span className={styles.accountName}>{viewerName}</span>
                        {accountMetaLabel ? (
                          <span className={styles.accountMeta}>{accountMetaLabel}</span>
                        ) : null}
                      </span>
                    </button>
                  </Dropdown>
                </div>
              ) : null}
            </>
          )}
        </aside>
      ) : null}

      <section className={styles.dialogueMainCard}>
        {isHomeVisible ? (
          <div className={styles.dialogueHomeLayout}>
            <div className={styles.dialogueHomeDock}>
              {allEmployees.length > 1 ? (
                <div ref={homeEmployeeSwitcherRef} className={styles.dialogueHomeExpertSwitchWrap}>
                  <button
                    type="button"
                    className={styles.dialogueHomeExpertSwitch}
                    aria-label="切换首页 AI 专家"
                    aria-expanded={isEmployeeSwitcherOpen}
                    onClick={() => setIsEmployeeSwitcherOpen(current => !current)}
                  >
                    <span className={styles.dialogueHomeExpertSwitchAvatar}>
                      {shouldShowExpertTeamUi ? (
                        <DialogueTeamAvatar
                          team={activeEmployee}
                          members={activeExpertTeamMembers}
                        />
                      ) : (
                        <Avatar
                          src={activeEmployee.avatarUrl}
                          size={28}
                          className={styles.dialogueHeroAvatar}
                        >
                          {getAvatarText(activeEmployee.name)}
                        </Avatar>
                      )}
                    </span>
                    <span className={styles.dialogueHomeExpertSwitchText}>
                      {activeEmployee.name}
                    </span>
                    <DownOutlined
                      className={classNames(styles.dialogueHomeExpertSwitchIcon, {
                        [styles.dialogueHomeExpertSwitchIconOpen]: isEmployeeSwitcherOpen,
                      })}
                    />
                  </button>
                  {isEmployeeSwitcherOpen ? homeEmployeeSwitcherMenu : null}
                </div>
              ) : null}

              {meSchedulableExperts.length > 0 ? (
                <section
                  className={styles.dialogueHomeDispatchPanel}
                  aria-label="ME 可调度 AI 专家"
                >
                  <div className={styles.dialogueHomeDispatchHeader}>可调度</div>
                  <div className={styles.dialogueHomeDispatchList}>
                    {meSchedulableExperts.map(expert => (
                      <article key={expert.id} className={styles.dialogueHomeDispatchItem}>
                        <div className={styles.dialogueHomeDispatchAvatar}>
                          {expert.avatarUrl ? (
                            <img alt={expert.name} src={expert.avatarUrl} />
                          ) : (
                            <span>{getAvatarText(expert.name)}</span>
                          )}
                        </div>
                        <strong>{expert.name}</strong>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <div
              className={classNames(styles.dialogueHomeHero, {
                [styles.dialogueHomeHeroExpertTeam]: shouldShowExpertTeamUi,
              })}
            >
              {shouldShowExpertTeamUi ? expertTeamMemberStrip : null}
              <h2 className={styles.dialogueHomeHeroTitle}>{dialogueHomeHeroTitle}</h2>
            </div>
            {composerNode}
          </div>
        ) : (
          <>
            <div className={classNames(styles.dialogueStage, styles.dialogueStageHeaderOffset)}>
              <div className={styles.chatPanelBody}>
                <WorkspaceChatPanel
                  blocks={chatBlocks}
                  focusBlockId={resolvedFocusBlockId}
                  focusRequestKey={resolvedFocusRequestKey}
                  messages={chatMessages}
                  actorAvatars={dialogueActorAvatars}
                  currentSessionId={activeDialogueSession?.id ?? activeEmployee.id}
                  isStreaming={isDialogueResponding}
                  assistantAvatarUrl={activeEmployee.avatarUrl}
                  assistantAvatarAlt={activeEmployee.name}
                  workspaceSummary={activeEmployee.summary}
                  greeting="输入消息或上传文件，开始协作"
                  showMessageMeta={true}
                  collapseAssignedActorOutputs={isMetaAgentWorkspace}
                  onOpenArtifact={handleOpenArtifact}
                  onOpenResult={handleOpenResult}
                  onQuickActionSend={onQuickPromptSend}
                />
              </div>
            </div>
            {composerNode}
          </>
        )}
      </section>

      {showFeishuConnectAction || !isHomeVisible ? (
        <div className={styles.dialogueTopRightActions}>
          {showFeishuConnectAction ? (
            <button
              type="button"
              className={classNames(styles.dialogueViewButton, styles.feishuConnectButton, {
                [styles.feishuConnectButtonConnected]: isFeishuConnected,
              })}
              disabled={isFeishuConnected}
              onClick={handleOpenFeishuQrModal}
            >
              {isFeishuConnected ? <CheckCircleOutlined /> : <MessageOutlined />}
              <span>{isFeishuConnected ? "已连接" : "扫码连接飞书"}</span>
            </button>
          ) : null}
          {!isHomeVisible ? (
            <>
              {shouldShowWorkRecordEntry ? (
                <button
                  type="button"
                  className={classNames(styles.dialogueViewButton, styles.dialogueViewPanelButton, {
                    [styles.dialogueViewButtonActive]: isDialogueHistoryOpen,
                  })}
                  aria-label={isDialogueHistoryOpen ? "关闭工作记录" : "打开工作记录"}
                  aria-pressed={isDialogueHistoryOpen}
                  title={isDialogueHistoryOpen ? "关闭工作记录" : "工作记录"}
                  onClick={() => setIsDialogueHistoryOpen(current => !current)}
                >
                  <HistoryOutlined className={styles.dialogueViewHistoryIcon} />
                </button>
              ) : null}
              <button
                type="button"
                className={classNames(styles.dialogueViewButton, styles.dialogueViewPanelButton, {
                  [styles.dialogueViewButtonActive]: isArtifactPanelVisible,
                })}
                aria-label={isArtifactPanelVisible ? "收起成果列表" : "展开成果列表"}
                aria-pressed={isArtifactPanelVisible}
                title={isArtifactPanelVisible ? "收起成果列表" : "展开成果列表"}
                onClick={handleToggleArtifactsPanel}
                disabled={!hasArtifactPanel}
              >
                <span
                  className={classNames(styles.dialogueViewPanelIcon, {
                    [styles.dialogueViewPanelIconCollapsed]: isArtifactPanelVisible,
                  })}
                  aria-hidden={true}
                />
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <Modal
        className={styles.feishuQrModal}
        width={420}
        centered
        title="扫码连接飞书"
        open={isFeishuQrModalOpen}
        footer={null}
        onCancel={() => setIsFeishuQrModalOpen(false)}
      >
        <button
          type="button"
          className={styles.feishuQrCard}
          onClick={handleConfirmFeishuConnection}
        >
          <QRCode value={feishuQrCode || "https://applink.feishu.cn/client/bot/open"} size={220} />
          <span>点击二维码模拟扫码连接</span>
        </button>
      </Modal>

      {shouldShowWorkRecordEntry && isDialogueHistoryOpen ? (
        <DialogueHistoryPanel
          sessions={dialogueSessions}
          onClose={() => setIsDialogueHistoryOpen(false)}
          onLocateMessage={handleLocateDialogueHistoryMessage}
        />
      ) : null}

      {shouldShowDialogueInsightPanel ? (
        <DialogueInsightPanel tasks={dialogueInsightTasks} />
      ) : null}

      {isSidePanelVisible && !isStackedLayout ? (
        <div
          className={styles.dialogueRuntimeResizeHandle}
          role="separator"
          aria-label="调整右侧面板宽度"
          aria-orientation="vertical"
          onMouseDown={handleSidePanelResizeStart}
        />
      ) : null}

      {isArtifactPanelVisible ? (
        <aside
          className={styles.dialogueArtifactsCard}
          style={!isStackedLayout ? { borderLeft: 0 } : undefined}
        >
          <div className={styles.outputPanel}>
            {!isArtifactPreviewing ? (
              <div className={styles.outputPanelHeader}>
                <div className={styles.outputPanelTitleGroup}>
                  <span className={styles.outputPanelTitle}>成果列表</span>
                </div>
              </div>
            ) : null}
            <div className={styles.outputPanelBody}>
              <ArtifactPreviewPanel
                files={activeDialogueArtifacts}
                showHeader={false}
                reserveHeaderActionSpace={!isStackedLayout}
                loading={false}
                error=""
                onDownloadFile={downloadArtifact}
                resolveFileUrl={resolveArtifactUrl}
                onPreviewStateChange={setIsArtifactPreviewing}
                preferredFileId={preferredArtifactId}
              />
            </div>
          </div>
        </aside>
      ) : null}

      {isResultPanelVisible ? (
        <aside
          className={styles.dialogueArtifactsCard}
          style={!isStackedLayout ? { borderLeft: 0 } : undefined}
        >
          <DialogueResultPanel
            results={activeDialogueResults}
            activeResultId={activeResultId}
            onSelectResult={handleSelectResultCard}
            onBackToGrid={() => setActiveResultId(null)}
            onClose={() => setSidePanelMode(null)}
          />
        </aside>
      ) : null}
    </div>
  );
};
