import classNames from "classnames";
import {
  AlertOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  CheckOutlined,
  CloseOutlined,
  DatabaseOutlined,
  DownOutlined,
  FileTextOutlined,
  FolderOutlined,
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
import { Avatar, Dropdown, Input } from "antd";
import type { Block } from "@/types/block";

import type {
  AiCeoHomePromptItem,
  AiCeoHomeSkillItem,
  AiCeoSkillIconKey,
} from "@/constants/aiCeoHome";
import { WorkspaceChatPanel } from "@/feature/workspace/components/WorkspaceChatPanel";
import { WorkspaceComposer } from "@/feature/workspace/components/WorkspaceComposer";
import {
  WORKSPACE_MODEL_OPTIONS,
  type WorkspaceComposerAttachmentItem,
} from "@/feature/workspace/types";
import { SynClawArtifactsPanel } from "@/pages/synclaw/components/SynClawArtifactsPanel";
import type { SynClawArtifactItem } from "@/pages/synclaw/types";
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
  resolveArtifactUrl,
} from "../utils";
import { DialogueHomeView } from "./DialogueHomeView";
import { DialogueResultPanel } from "./DialogueResultPanel";
import styles from "../FrontisPage.module.less";

interface DialoguePrototypeViewProps {
  activeEmployee: EmployeeItem;
  activeDialogueArtifacts: SynClawArtifactItem[];
  activeDialogueResults: DialogueGeneratedResultItem[];
  activeDialogueSession: DialogueSessionItem | null;
  allEmployees: EmployeeItem[];
  dialoguePlaceholder: string;
  dialogueAttachments: WorkspaceComposerAttachmentItem[];
  dialogueInputValue: string;
  dialogueMessages: ChatMessage[];
  dialogueSessions: DialogueSessionItem[];
  homeIntro: string;
  homePromptItems: AiCeoHomePromptItem[];
  homeSkillItems: AiCeoHomeSkillItem[];
  isHomeVisible: boolean;
  isSidebarCollapsed: boolean;
  isDialogueResponding: boolean;
  onCreateDialogueSession: () => void;
  onDialogueAttachmentsSelected: (files?: FileList | File[] | null) => void;
  onDialogueInputChange: (value: string) => void;
  onDialogueSessionSelect: (sessionId: string) => void;
  onHomePromptSend: (question: string) => void;
  onRemoveDialogueSession: (sessionId: string) => void;
  onRenameDialogueSession: (sessionId: string, title: string) => void;
  onEmployeeSelect: (employeeId: string) => void;
  onRemoveAttachment: (attachmentUid: string) => void;
  onSkillSelect: (skillId: string) => void;
  onSendDialogue: () => void;
  selectedSkillId: string | null;
  onStopDialogue: () => void;
}

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
  dialoguePlaceholder,
  dialogueAttachments,
  dialogueInputValue,
  dialogueMessages,
  dialogueSessions,
  homeIntro,
  homePromptItems,
  homeSkillItems,
  isHomeVisible,
  isSidebarCollapsed,
  isDialogueResponding,
  onCreateDialogueSession,
  onDialogueAttachmentsSelected,
  onDialogueInputChange,
  onDialogueSessionSelect,
  onHomePromptSend,
  onRemoveDialogueSession,
  onRenameDialogueSession,
  onEmployeeSelect,
  onRemoveAttachment,
  onSkillSelect,
  onSendDialogue,
  selectedSkillId,
  onStopDialogue,
}: DialoguePrototypeViewProps): JSX.Element => {
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const sessionTitleInputRef = useRef<InputRef | null>(null);
  const employeeSwitcherRef = useRef<HTMLDivElement | null>(null);
  const skillTrackRef = useRef<HTMLDivElement | null>(null);
  const dialogueShellRef = useRef<HTMLDivElement | null>(null);
  const sidePanelResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const sidePanelPendingWidthRef = useRef<number>(DIALOGUE_ARTIFACT_LIST_PANEL_DEFAULT_WIDTH);
  const [sidePanelMode, setSidePanelMode] = useState<"artifacts" | "results" | null>(null);
  const [preferredArtifactId, setPreferredArtifactId] = useState<string>();
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [isArtifactPreviewing, setIsArtifactPreviewing] = useState<boolean>(false);
  const [isEmployeeSwitcherOpen, setIsEmployeeSwitcherOpen] = useState<boolean>(false);
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
        Math.max(
          DIALOGUE_SIDE_PANEL_MIN_WIDTH,
          viewportWidth - sidebarReservedWidth - 360,
        ),
      );

      return Math.min(viewportLimitedMax, Math.max(DIALOGUE_SIDE_PANEL_MIN_WIDTH, width));
    },
    [isSidebarCollapsed, viewportWidth],
  );
  const resolvedSidePanelWidth = clampSidePanelWidth(sidePanelWidth);
  const getDialogueShellColumns = useCallback(
    (panelWidth: number): string =>
      isSidebarCollapsed
        ? `minmax(0, 1fr) 10px ${panelWidth}px`
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
      gridTemplateColumns: isSidebarCollapsed ? "minmax(0, 1fr)" : "252px minmax(0, 1fr)",
    };
  }, [isSidebarCollapsed, isSidePanelVisible, isStackedLayout, resolvedSidePanelWidth]);

  const chatMessages = useMemo(
    () => buildWorkspaceChatMessages(dialogueMessages),
    [dialogueMessages],
  );
  const chatBlocks = useMemo(() => buildWorkspaceChatBlocks(dialogueMessages), [dialogueMessages]);
  const selectedSkillItem = useMemo(
    () => homeSkillItems.find(item => item.id === selectedSkillId) ?? null,
    [homeSkillItems, selectedSkillId],
  );
  const availableSkillItems = useMemo(
    () => homeSkillItems.filter(item => item.id !== selectedSkillId),
    [homeSkillItems, selectedSkillId],
  );
  const { visibleSkillItems, overflowSkillItems } = useMemo(() => {
    const maxVisibleSkillCount = Math.max(
      MAX_VISIBLE_SKILL_COUNT - (selectedSkillItem ? 1 : 0),
      0,
    );

    if (skillTrackWidth <= 0) {
      return {
        visibleSkillItems: availableSkillItems.slice(0, maxVisibleSkillCount),
        overflowSkillItems: availableSkillItems.slice(maxVisibleSkillCount),
      };
    }

    const visibleItems: AiCeoHomeSkillItem[] = [];
    let usedWidth = selectedSkillItem ? getSkillButtonWidth(selectedSkillItem.name, true) : 0;
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
  }, [availableSkillItems, selectedSkillItem, skillTrackWidth]);
  const moreSkillMenuItems = useMemo<NonNullable<MenuProps["items"]>>(
    () =>
      overflowSkillItems.map(item => ({
        key: item.id,
        label: (
          <span className={styles.dialogueSkillMenuItem}>
            <span className={styles.dialogueSkillMenuItemIcon}>{renderSkillIcon(item.iconKey)}</span>
            <span>{item.name}</span>
          </span>
        ),
      })),
    [overflowSkillItems],
  );
  const dialogueActorAvatars = useMemo(
    () => ({
      [activeEmployee.id]: {
        icon: activeEmployee.avatarUrl,
        name: activeEmployee.name,
      },
      [activeEmployee.name]: {
        icon: activeEmployee.avatarUrl,
        name: activeEmployee.name,
      },
    }),
    [activeEmployee.avatarUrl, activeEmployee.id, activeEmployee.name],
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
  }, []);

  useEffect(() => {
    const nextWidth = clampSidePanelWidth(sidePanelPendingWidthRef.current);
    setSidePanelWidth(nextWidth);
    sidePanelPendingWidthRef.current = nextWidth;
  }, [viewportWidth, isSidebarCollapsed]);

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

  return (
    <div
      ref={dialogueShellRef}
      className={classNames(styles.dialogueShell, {
        [styles.dialogueShellSidebarCollapsed]: isSidebarCollapsed,
        [styles.dialogueShellArtifactsHidden]: !isSidePanelVisible,
      })}
      style={dialogueShellStyle}
    >
      {!isSidebarCollapsed ? (
        <aside className={styles.dialogueSidebarCard}>
          <div className={styles.dialogueSidebarTopBar}>
            <div className={styles.dialogueSidebarSectionTitle}>AI 专家</div>
          </div>

          <div ref={employeeSwitcherRef} className={styles.dialogueAgentListSection}>
            <button
              type="button"
              className={styles.dialogueAgentSelectButton}
              aria-expanded={isEmployeeSwitcherOpen}
              aria-label="切换 AI 专家"
              onClick={() => setIsEmployeeSwitcherOpen(current => !current)}
            >
              <span className={styles.dialogueAgentSelectCurrent}>
                <span className={styles.employeeAvatarWrap}>
                  <Avatar src={activeEmployee.avatarUrl} size={40} className={styles.dialogueHeroAvatar}>
                    {getAvatarText(activeEmployee.name)}
                  </Avatar>
                  <span
                    className={classNames(styles.employeeStatusDot, {
                      [styles.employeeStatusDotIdle]: activeEmployee.status === "idle",
                      [styles.employeeStatusDotBusy]: activeEmployee.status === "busy",
                      [styles.employeeStatusDotPending]:
                        activeEmployee.status === "pending" ||
                        activeEmployee.status === "paused" ||
                        activeEmployee.status === "draft",
                    })}
                  />
                </span>
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
              <div className={styles.dialogueAgentDropdownMenu}>
                <div className={styles.dialogueSwitcherList}>
                  {allEmployees.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={classNames(styles.dialogueSwitcherItem, {
                        [styles.dialogueSwitcherItemActive]: item.id === activeEmployee.id,
                      })}
                      onClick={() => {
                        onEmployeeSelect(item.id);
                        setIsEmployeeSwitcherOpen(false);
                      }}
                    >
                      <span className={styles.employeeAvatarWrap}>
                        <Avatar src={item.avatarUrl} size={40} className={styles.dialogueHeroAvatar}>
                          {getAvatarText(item.name)}
                        </Avatar>
                        <span
                          className={classNames(styles.employeeStatusDot, {
                            [styles.employeeStatusDotIdle]: item.status === "idle",
                            [styles.employeeStatusDotBusy]: item.status === "busy",
                            [styles.employeeStatusDotPending]:
                              item.status === "pending" ||
                              item.status === "paused" ||
                              item.status === "draft",
                          })}
                        />
                      </span>
                      <span className={styles.dialogueSwitcherItemBody}>
                        <span className={styles.dialogueSwitcherItemName}>{item.name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
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
        </aside>
      ) : null}

      <section
        className={classNames(styles.dialogueMainCard, {
          [styles.dialogueMainCardSidebarCollapsed]: isSidebarCollapsed,
        })}
      >
        {!isHomeVisible ? (
          <div className={styles.dialogueViewToolbar}>
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
          <DialogueHomeView
            agentName={activeEmployee.name}
            intro={homeIntro}
            promptItems={homePromptItems}
            onPromptSend={onHomePromptSend}
          />
        ) : (
          <div className={styles.dialogueStage}>
            <div className={styles.chatPanelBody}>
              <WorkspaceChatPanel
                blocks={chatBlocks}
                messages={chatMessages}
                actorAvatars={dialogueActorAvatars}
                currentSessionId={activeDialogueSession?.id ?? activeEmployee.id}
                isStreaming={isDialogueResponding}
                assistantAvatarUrl={activeEmployee.avatarUrl}
                assistantAvatarAlt={activeEmployee.name}
                workspaceSummary={activeEmployee.summary}
                greeting="输入消息或上传文件，开始协作"
                onOpenArtifact={handleOpenArtifact}
                onOpenResult={handleOpenResult}
              />
            </div>
          </div>
        )}

        <div className={styles.composerWrap}>
          <WorkspaceComposer
            rootClassName={styles.synclawComposer}
            value={dialogueInputValue}
            placeholder={dialoguePlaceholder}
            attachments={dialogueAttachments}
            onRemoveAttachment={onRemoveAttachment}
            onAttachmentsSelected={onDialogueAttachmentsSelected}
            allowAttachmentOnlySend={true}
            footerExtra={
              <div className={styles.dialogueComposerSkillBar}>
                <span className={styles.dialogueComposerSkillDivider} aria-hidden={true} />
                <div ref={skillTrackRef} className={styles.dialogueComposerSkillTrack}>
                  {selectedSkillItem ? (
                    <div className={styles.dialogueComposerSkillSelected}>
                      <span className={styles.dialogueComposerSkillIcon}>
                        {renderSkillIcon(selectedSkillItem.iconKey)}
                      </span>
                      <span className={styles.dialogueComposerSkillLabel}>
                        {selectedSkillItem.name}
                      </span>
                      <button
                        type="button"
                        className={styles.dialogueComposerSkillClearButton}
                        aria-label={`取消选择 ${selectedSkillItem.name}`}
                        onClick={() => onSkillSelect(selectedSkillItem.id)}
                      >
                        <CloseOutlined />
                      </button>
                    </div>
                  ) : null}
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
                        selectable: true,
                        selectedKeys: selectedSkillId ? [selectedSkillId] : [],
                        onClick: ({ key }) => onSkillSelect(String(key)),
                      }}
                      placement="topLeft"
                      trigger={["click"]}
                    >
                      <button
                        type="button"
                        className={styles.dialogueComposerSkillButton}
                      >
                        <span className={styles.dialogueComposerSkillIcon}>
                          <MoreOutlined />
                        </span>
                        <span className={styles.dialogueComposerSkillLabel}>更多</span>
                      </button>
                    </Dropdown>
                  ) : null}
                </div>
              </div>
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
          <SynClawArtifactsPanel
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
