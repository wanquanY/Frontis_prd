import classNames from "classnames";
import {
  AlertOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  CheckOutlined,
  CloseOutlined,
  DatabaseOutlined,
  DownOutlined,
  EditOutlined,
  FileTextOutlined,
  FolderOutlined,
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
import { Avatar, Dropdown, Input, Popover } from "antd";
import type { Block } from "@/types/block";

import type {
  AiCeoHomeCaseItem,
  AiCeoHomePromptItem,
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
import type { ArtifactItem } from "@/types/artifact";
import { CHAT_ATTACHMENT_ACCEPT_ATTR } from "@/utils/chatAttachmentFileTypes";

import type {
  ChatMessage,
  DialogueGeneratedResultItem,
  DialogueSessionItem,
  EmployeeItem,
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
import { DialogueHomeView } from "./DialogueHomeView";
import { DialogueResultPanel } from "./DialogueResultPanel";
import styles from "../FrontisPage.module.less";

interface DialoguePrototypeViewProps {
  activeEmployee: EmployeeItem;
  activeDialogueArtifacts: ArtifactItem[];
  activeDialogueResults: DialogueGeneratedResultItem[];
  activeDialogueSession: DialogueSessionItem | null;
  allEmployees: EmployeeItem[];
  conversationEmployeeDirectory: EmployeeItem[];
  activeExpertTeamMembers: EmployeeItem[];
  accountMenuItems: MenuProps["items"];
  defaultAgentIds: string[];
  dialoguePlaceholder: string;
  dialogueAttachments: WorkspaceComposerAttachmentItem[];
  dialogueInputValue: string;
  dialogueMessages: ChatMessage[];
  dialogueSessions: DialogueSessionItem[];
  followupSuggestions: string[];
  caseReplayActionLabel?: string;
  caseReplayOpenPanel?: "artifacts" | "results" | null;
  homeCaseItems?: AiCeoHomeCaseItem[];
  homePromptItems: AiCeoHomePromptItem[];
  homeSkillItems: AiCeoHomeSkillItem[];
  isHomeVisible: boolean;
  isCaseReplayMode?: boolean;
  isSidebarCollapsed: boolean;
  isDialogueResponding: boolean;
  onCaseReplayAction?: () => void;
  onCreateDialogueSession: () => void;
  onDialogueAttachmentsSelected: (files?: FileList | File[] | null) => void;
  onDialogueInputChange: (value: string) => void;
  onHomeCaseSelect: (item: AiCeoHomeCaseItem) => void;
  onDialogueSessionSelect: (sessionId: string) => void;
  onFollowupClick: (question: string) => void;
  onHomePromptSend: (question: string) => void;
  onRenameDefaultAgent: (employeeId: string, name: string) => void;
  onRemoveDialogueSession: (sessionId: string) => void;
  onRenameDialogueSession: (sessionId: string, title: string) => void;
  onEmployeeSelect: (employeeId: string) => void;
  onRemoveAttachment: (attachmentUid: string) => void;
  onSkillSelect: (skillId: string) => void;
  onSendDialogue: () => void;
  onToggleSidebar: () => void;
  selectedSkillIds: string[];
  onStopDialogue: () => void;
  viewerName: string;
}

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
const DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH = 336;
const DIALOGUE_ARTIFACT_PREVIEW_PANEL_DEFAULT_WIDTH = 620;
const DIALOGUE_RESULT_PANEL_DEFAULT_WIDTH = 960;
const DIALOGUE_SIDE_PANEL_MIN_WIDTH = 320;
const DIALOGUE_SIDE_PANEL_MAX_WIDTH = 960;
const TEAM_MENTION_ALL_OPTION_ID = "team-mention-all";
const TEAM_MENTION_ALL_LABEL = "所有agent";
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

/**
 * 对话视图。
 */
export const DialoguePrototypeView = ({
  activeEmployee,
  activeDialogueArtifacts,
  activeDialogueResults,
  activeDialogueSession,
  allEmployees,
  conversationEmployeeDirectory,
  activeExpertTeamMembers,
  accountMenuItems,
  defaultAgentIds,
  dialoguePlaceholder,
  dialogueAttachments,
  dialogueInputValue,
  dialogueMessages,
  dialogueSessions,
  followupSuggestions,
  caseReplayActionLabel,
  caseReplayOpenPanel,
  homeCaseItems,
  homePromptItems,
  homeSkillItems,
  isHomeVisible,
  isCaseReplayMode = false,
  isSidebarCollapsed,
  isDialogueResponding,
  onCaseReplayAction,
  onCreateDialogueSession,
  onDialogueAttachmentsSelected,
  onDialogueInputChange,
  onHomeCaseSelect,
  onDialogueSessionSelect,
  onFollowupClick,
  onHomePromptSend,
  onRenameDefaultAgent,
  onRemoveDialogueSession,
  onRenameDialogueSession,
  onEmployeeSelect,
  onRemoveAttachment,
  onSkillSelect,
  onSendDialogue,
  onToggleSidebar,
  selectedSkillIds,
  onStopDialogue,
  viewerName,
}: DialoguePrototypeViewProps): JSX.Element => {
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const agentNameInputRef = useRef<InputRef | null>(null);
  const sessionTitleInputRef = useRef<InputRef | null>(null);
  const employeeSwitcherRef = useRef<HTMLDivElement | null>(null);
  const skillTrackRef = useRef<HTMLDivElement | null>(null);
  const dialogueShellRef = useRef<HTMLDivElement | null>(null);
  const latestResultIdRef = useRef<string>("");
  const latestAutoOpenedArtifactKeyRef = useRef<string>("");
  const wasDialogueRespondingRef = useRef<boolean>(false);
  const sidePanelResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const sidePanelPendingWidthRef = useRef<number>(DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH);
  const [sidePanelMode, setSidePanelMode] = useState<"artifacts" | "results" | null>(null);
  const [preferredArtifactId, setPreferredArtifactId] = useState<string>();
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [isArtifactPreviewing, setIsArtifactPreviewing] = useState<boolean>(false);
  const [isEmployeeSwitcherOpen, setIsEmployeeSwitcherOpen] = useState<boolean>(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editingAgentName, setEditingAgentName] = useState<string>("");
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
  const isStackedLayout = viewportWidth <= 1100;
  const isArtifactPanelVisible =
    !isHomeVisible && sidePanelMode === "artifacts" && hasArtifactPanel;
  const isResultPanelVisible = !isHomeVisible && sidePanelMode === "results" && hasResultPanel;
  const isSidePanelVisible = isArtifactPanelVisible || isResultPanelVisible;
  const clampSidePanelWidth = useCallback(
    (width: number): number => {
      if (!Number.isFinite(width)) {
        return DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH;
      }

      const sidebarReservedWidth = isSidebarCollapsed ? 72 : 252;
      const viewportLimitedMax = Math.min(
        DIALOGUE_SIDE_PANEL_MAX_WIDTH,
        Math.max(DIALOGUE_SIDE_PANEL_MIN_WIDTH, viewportWidth - sidebarReservedWidth - 360),
      );

      return Math.min(viewportLimitedMax, Math.max(DIALOGUE_SIDE_PANEL_MIN_WIDTH, width));
    },
    [isSidebarCollapsed, viewportWidth],
  );
  const resolvedSidePanelWidth = clampSidePanelWidth(sidePanelWidth);
  const getDialogueShellColumns = useCallback(
    (panelWidth: number): string =>
      isSidebarCollapsed
        ? `72px minmax(0, 1fr) 10px ${panelWidth}px`
        : `252px minmax(0, 1fr) 10px ${panelWidth}px`,
    [isSidebarCollapsed],
  );
  const dialogueShellStyle = useMemo<CSSProperties | undefined>(() => {
    if (isStackedLayout) {
      return undefined;
    }

    if (isSidePanelVisible) {
      return {
        gridTemplateColumns: getDialogueShellColumns(resolvedSidePanelWidth),
      };
    }

    return {
      gridTemplateColumns: isSidebarCollapsed ? "72px minmax(0, 1fr)" : "252px minmax(0, 1fr)",
    };
  }, [
    getDialogueShellColumns,
    isSidebarCollapsed,
    isSidePanelVisible,
    isStackedLayout,
    resolvedSidePanelWidth,
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
  const { visibleSkillItems, overflowSkillItems } = useMemo(() => {
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

    activeExpertTeamMembers.forEach(member => {
      actorAvatarEntries[member.id] = {
        icon: member.avatarUrl,
        name: member.name,
      };
      actorAvatarEntries[member.name] = {
        icon: member.avatarUrl,
        name: member.name,
      };
    });

    return actorAvatarEntries;
  }, [activeEmployee.avatarUrl, activeEmployee.id, activeEmployee.name, activeExpertTeamMembers]);
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
    if (dialogueSessions.some(item => item.id === editingSessionId)) return;
    setEditingSessionId(null);
    setEditingSessionTitle("");
  }, [dialogueSessions, editingSessionId]);

  useEffect(() => {
    if (!editingSessionId) return;
    sessionTitleInputRef.current?.focus({ cursor: "all" });
  }, [editingSessionId]);

  useEffect(() => {
    if (!editingAgentId) return;
    agentNameInputRef.current?.focus({ cursor: "all" });
  }, [editingAgentId]);

  useEffect(() => {
    if (!isHomeVisible) {
      return;
    }
    setSidePanelMode(null);
    setPreferredArtifactId(undefined);
    setActiveResultId(null);
    setIsArtifactPreviewing(false);
  }, [isHomeVisible]);

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
    if (!isEmployeeSwitcherOpen) {
      setEditingAgentId(null);
      setEditingAgentName("");
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (employeeSwitcherRef.current?.contains(event.target)) {
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
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!editingAgentId) return;
    if (allEmployees.some(item => item.id === editingAgentId)) return;
    setEditingAgentId(null);
    setEditingAgentName("");
  }, [allEmployees, editingAgentId]);

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
  }, [clampSidePanelWidth, viewportWidth, isSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DIALOGUE_SIDE_PANEL_WIDTH_KEY, String(resolvedSidePanelWidth));
  }, [resolvedSidePanelWidth]);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent): void => {
      const current = sidePanelResizeStateRef.current;
      if (!current || isStackedLayout) {
        return;
      }
      const deltaX = event.clientX - current.startX;
      const nextWidth = clampSidePanelWidth(current.startWidth - deltaX);
      sidePanelPendingWidthRef.current = nextWidth;
      if (dialogueShellRef.current) {
        dialogueShellRef.current.style.gridTemplateColumns = getDialogueShellColumns(nextWidth);
      }
    };

    const handlePointerUp = (): void => {
      if (!sidePanelResizeStateRef.current) {
        return;
      }

      setSidePanelWidth(sidePanelPendingWidthRef.current);
      sidePanelResizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [clampSidePanelWidth, getDialogueShellColumns, isStackedLayout]);

  const handleMenuButtonClick = (event: ReactMouseEvent<HTMLElement>): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleMenuButtonKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    event.stopPropagation();
  };

  const handleStartRenameAgent = (employeeId: string, currentName: string): void => {
    setEditingAgentId(employeeId);
    setEditingAgentName(currentName);
  };

  const handleCancelRenameAgent = (): void => {
    setEditingAgentId(null);
    setEditingAgentName("");
  };

  const handleSubmitRenameAgent = (): void => {
    if (!editingAgentId) return;
    const nextName = editingAgentName.trim();
    if (!nextName) {
      handleCancelRenameAgent();
      return;
    }
    onRenameDefaultAgent(editingAgentId, nextName);
    setEditingAgentId(null);
    setEditingAgentName("");
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
            const isDefaultAgent = defaultAgentIds.includes(item.id);
            const isEditingAgent = editingAgentId === item.id;
            const teamMembers = resolveExpertTeamMembersForItem(item);

            return (
              <div key={item.id} className={styles.dialogueSwitcherItemRow}>
                {isEditingAgent ? (
                  <div
                    className={classNames(styles.dialogueSwitcherItem, {
                      [styles.dialogueSwitcherItemActive]: item.id === activeEmployee.id,
                      [styles.dialogueSwitcherItemEditing]: true,
                    })}
                  >
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
                    <span className={styles.dialogueSwitcherItemBody}>
                      <span className={styles.dialogueSwitcherAgentEditRow}>
                        <Input
                          ref={agentNameInputRef}
                          size="small"
                          value={editingAgentName}
                          maxLength={24}
                          placeholder="输入默认 Agent 名称"
                          className={styles.dialogueSwitcherAgentEditInput}
                          onChange={event => setEditingAgentName(event.target.value)}
                          onPressEnter={handleSubmitRenameAgent}
                          onBlur={handleSubmitRenameAgent}
                          onKeyDown={event => {
                            event.stopPropagation();
                            if (event.key === "Escape") {
                              handleCancelRenameAgent();
                            }
                          }}
                        />
                      </span>
                    </span>
                  </div>
                ) : (
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
                    {item.isExpertTeam ? (
                      <DialogueTeamAvatar team={item} members={teamMembers} />
                    ) : (
                      <span className={styles.employeeAvatarWrap}>
                        <Avatar
                          src={item.avatarUrl}
                          size={40}
                          className={styles.dialogueHeroAvatar}
                        >
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
                )}

                {isDefaultAgent && !isEditingAgent ? (
                  <button
                    type="button"
                    className={styles.dialogueSwitcherAgentAction}
                    aria-label={`编辑 ${item.name} 名称`}
                    onClick={event => {
                      handleMenuButtonClick(event);
                      handleStartRenameAgent(item.id, item.name);
                    }}
                  >
                    <EditOutlined />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
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
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
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
          activeEmployee.isExpertTeam ? null : (
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
          )
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
    activeEmployee.isExpertTeam && activeExpertTeamMembers.length > 0 ? (
      <>
        {activeExpertTeamMembers.map(member => {
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
                    <Avatar src={member.avatarUrl} size={40}>
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
                <Avatar src={member.avatarUrl} size={40} className={styles.dialogueExpertAvatar}>
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
  const expertTeamToolbarStrip = expertTeamMemberAvatars ? (
    <div
      className={classNames(styles.dialogueExpertTeamStrip, styles.dialogueExpertTeamStripToolbar)}
    >
      <div
        className={classNames(
          styles.dialogueExpertTeamAvatars,
          styles.dialogueExpertTeamAvatarsToolbar,
        )}
      >
        {expertTeamMemberAvatars}
      </div>
    </div>
  ) : null;
  const expertTeamScenarioLabel = useMemo(
    () =>
      activeEmployee.isExpertTeam
        ? getExpertTeamScenarioLabel(activeEmployee.summary, activeEmployee.name)
        : "",
    [activeEmployee.isExpertTeam, activeEmployee.name, activeEmployee.summary],
  );
  const expertTeamHomeLabel = useMemo(() => {
    if (!activeEmployee.isExpertTeam) {
      return "";
    }

    const normalizedTeamName = activeEmployee.name.replace(/专家团$/, "").trim();

    return normalizedTeamName || expertTeamScenarioLabel || activeEmployee.name;
  }, [activeEmployee.isExpertTeam, activeEmployee.name, expertTeamScenarioLabel]);
  const dialogueHomeHeroTitle = activeEmployee.isExpertTeam
    ? `Hi ${viewerName}，请说你的${expertTeamHomeLabel}需求`
    : `Hi ${viewerName}，有什么可以帮你的？`;

  return (
    <div
      ref={dialogueShellRef}
      className={classNames(styles.dialogueShell, {
        [styles.dialogueShellSidebarCollapsed]: isSidebarCollapsed,
        [styles.dialogueShellArtifactsHidden]: !isSidePanelVisible,
      })}
      style={dialogueShellStyle}
    >
      <aside
        ref={isSidebarCollapsed ? employeeSwitcherRef : undefined}
        className={classNames(styles.dialogueSidebarCard, {
          [styles.dialogueSidebarCardCollapsed]: isSidebarCollapsed,
        })}
      >
        {isSidebarCollapsed ? (
          <>
            <div className={styles.dialogueCollapsedCapsule}>
              <button
                type="button"
                className={styles.dialogueCollapsedBrandButton}
                aria-label="展开左侧面板"
                onClick={onToggleSidebar}
              >
                <span className={styles.dialogueCollapsedBrandLogo}>F</span>
                <span className={styles.dialogueCollapsedBrandExpand}>
                  <MenuUnfoldOutlined />
                </span>
              </button>
              <button
                type="button"
                className={classNames(
                  styles.dialogueCollapsedActionButton,
                  styles.dialogueCollapsedPrimaryButton,
                )}
                aria-label="新开会话"
                onClick={onCreateDialogueSession}
              >
                <PlusOutlined />
              </button>
              <div className={styles.dialogueCollapsedAgentSlot}>
                <button
                  type="button"
                  className={styles.dialogueCollapsedActionButton}
                  aria-expanded={isEmployeeSwitcherOpen}
                  aria-label="快速切换 AI 专家"
                  title={activeEmployee.name}
                  onClick={() => setIsEmployeeSwitcherOpen(current => !current)}
                >
                  {activeEmployee.isExpertTeam ? (
                    <DialogueTeamAvatar team={activeEmployee} members={activeExpertTeamMembers} />
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
                          [styles.employeeStatusDotOffline]: activeEmployee.status === "offline",
                          [styles.employeeStatusDotError]: activeEmployee.status === "exception",
                        })}
                      />
                    </span>
                  )}
                </button>
              </div>

              <div className={styles.dialogueCollapsedFooter}>
                <Dropdown
                  menu={{ items: accountMenuItems }}
                  placement="topRight"
                  trigger={["click"]}
                >
                  <button
                    type="button"
                    className={classNames(
                      styles.dialogueCollapsedActionButton,
                      styles.dialogueCollapsedUserButton,
                    )}
                    aria-label="打开账户菜单"
                  >
                    <Avatar className={styles.accountAvatar} size={40}>
                      {viewerName.slice(0, 1)}
                    </Avatar>
                  </button>
                </Dropdown>
              </div>
            </div>
            {isEmployeeSwitcherOpen ? (
              <div
                className={classNames(
                  styles.dialogueAgentDropdownMenu,
                  styles.dialogueAgentDropdownMenuCollapsed,
                )}
              >
                {employeeSwitcherMenu}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className={styles.sidebarTop}>
              <div className={styles.brandCard}>
                <span className={styles.brandLogo}>F</span>
                <div className={styles.brandCopy}>
                  <div className={styles.brandTitle}>Frontis AI</div>
                  <div className={styles.brandSubtitle}>智能工作台</div>
                </div>
              </div>
              <button
                type="button"
                className={styles.sidebarToggle}
                aria-label="收起左侧面板"
                onClick={onToggleSidebar}
              >
                <MenuFoldOutlined />
              </button>
            </div>

            <div className={styles.dialogueSidebarTopBar}>
              <div className={styles.dialogueSidebarSectionTitle}>AI 专家</div>
            </div>

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
                  {activeEmployee.isExpertTeam ? (
                    <DialogueTeamAvatar team={activeEmployee} members={activeExpertTeamMembers} />
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
                          [styles.employeeStatusDotOffline]: activeEmployee.status === "offline",
                          [styles.employeeStatusDotError]: activeEmployee.status === "exception",
                        })}
                      />
                    </span>
                  )}
                  <span className={styles.dialogueSwitcherItemBody}>
                    <span className={styles.dialogueSwitcherItemName}>{activeEmployee.name}</span>
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

            <button
              type="button"
              className={styles.dialogueNewSessionButton}
              onClick={onCreateDialogueSession}
            >
              <PlusOutlined />
              <span>新对话</span>
            </button>

            <div className={styles.dialogueSessionSection}>
              <div className={styles.dialogueSessionHeading}>最近对话</div>
              <div className={styles.dialogueSessionList}>
                {dialogueSessions.length > 0 ? (
                  dialogueSessions.map(item => {
                    return (
                      <div
                        key={item.id}
                        className={classNames(styles.dialogueSessionItem, {
                          [styles.dialogueSessionItemActive]: item.id === activeDialogueSession?.id,
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
                              onChange={event => setEditingSessionTitle(event.target.value)}
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
                                <span className={styles.dialogueSessionTitle}>{item.title}</span>
                                <span className={styles.dialogueSessionTime}>{item.updatedAt}</span>
                              </span>
                            </button>
                            <Dropdown
                              menu={{ items: getDialogueSessionMenuItems(item.id, item.title) }}
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
                    );
                  })
                ) : (
                  <div className={styles.dialogueSessionEmpty}>当前 AI 专家还没有历史会话</div>
                )}
              </div>
            </div>

            <div className={classNames(styles.sidebarBottom, styles.dialogueSidebarFooter)}>
              <Dropdown menu={{ items: accountMenuItems }} placement="topLeft" trigger={["click"]}>
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
                    <span className={styles.accountMeta}>当前登录账号</span>
                  </span>
                </button>
              </Dropdown>
            </div>
          </>
        )}
      </aside>

      <section
        className={classNames(styles.dialogueMainCard, {
          [styles.dialogueMainCardSidebarCollapsed]: isSidebarCollapsed,
        })}
      >
        {!isHomeVisible ? (
          <div className={styles.dialogueViewToolbar}>
            {expertTeamToolbarStrip}
            <div className={styles.dialogueViewToolbarGroup}>
              <button
                type="button"
                className={classNames(styles.dialogueViewButton, {
                  [styles.dialogueViewButtonActive]: isArtifactPanelVisible,
                })}
                onClick={handleToggleArtifactsPanel}
                disabled={!hasArtifactPanel}
              >
                <FolderOutlined />
                <span>成果</span>
              </button>
            </div>
          </div>
        ) : null}

        {isHomeVisible ? (
          <div className={styles.dialogueHomeLayout}>
            <div
              className={classNames(styles.dialogueHomeHero, {
                [styles.dialogueHomeHeroExpertTeam]: activeEmployee.isExpertTeam,
              })}
            >
              {activeEmployee.isExpertTeam ? (
                expertTeamMemberStrip
              ) : (
                <Avatar
                  src={activeEmployee.avatarUrl}
                  size={88}
                  className={styles.dialogueHomeHeroAvatar}
                >
                  {getAvatarText(activeEmployee.name)}
                </Avatar>
              )}
              <h2 className={styles.dialogueHomeHeroTitle}>{dialogueHomeHeroTitle}</h2>
            </div>
            {composerNode}
            <DialogueHomeView
              caseItems={homeCaseItems}
              promptItems={homePromptItems}
              onCaseSelect={onHomeCaseSelect}
              onPromptSend={onHomePromptSend}
            />
          </div>
        ) : (
          <>
            <div className={styles.dialogueStage}>
              <div className={styles.chatPanelBody}>
                <WorkspaceChatPanel
                  blocks={chatBlocks}
                  messages={chatMessages}
                  followupSuggestions={followupSuggestions}
                  actorAvatars={dialogueActorAvatars}
                  currentSessionId={activeDialogueSession?.id ?? activeEmployee.id}
                  isStreaming={isDialogueResponding}
                  assistantAvatarUrl={activeEmployee.avatarUrl}
                  assistantAvatarAlt={activeEmployee.name}
                  workspaceSummary={activeEmployee.summary}
                  greeting="输入消息或上传文件，开始协作"
                  showMessageMeta={true}
                  onFollowupClick={onFollowupClick}
                  onOpenArtifact={handleOpenArtifact}
                  onOpenResult={handleOpenResult}
                />
              </div>
            </div>
            {composerNode}
          </>
        )}
      </section>

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
          <ArtifactPreviewPanel
            files={activeDialogueArtifacts}
            loading={false}
            error=""
            onClose={() => {
              setSidePanelMode(null);
              setIsArtifactPreviewing(false);
            }}
            onDownloadFile={downloadArtifact}
            resolveFileUrl={resolveArtifactUrl}
            onPreviewStateChange={setIsArtifactPreviewing}
            preferredFileId={preferredArtifactId}
          />
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
