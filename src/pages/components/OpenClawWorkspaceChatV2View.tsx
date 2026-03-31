import classNames from "classnames";
import {
  AlertOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  DatabaseOutlined,
  DownOutlined,
  FileTextOutlined,
  FolderOutlined,
  MenuFoldOutlined,
  MessageOutlined,
  MoreOutlined,
  PlusOutlined,
  RightOutlined,
  StarOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { InputRef, MenuProps } from "antd";
import { Avatar, Dropdown, Empty, Input } from "antd";
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

import {
  AI_CEO_AGENT_HOME_CONFIGS,
  AI_CEO_DEFAULT_HOME_CONFIG,
  type AiCeoHomeSkillItem,
} from "@/constants/aiCeoHome";
import { WorkspaceChatPanel } from "@/feature/workspace/components/WorkspaceChatPanel";
import { WorkspaceComposer } from "@/feature/workspace/components/WorkspaceComposer";
import {
  WORKSPACE_MODEL_OPTIONS,
  type WorkspaceComposerAttachmentItem,
} from "@/feature/workspace/types";
import { findDialogueScenario } from "@/pages/dialogueScenarioSimulation";
import type { SynClawArtifactItem } from "@/pages/synclaw/types";
import {
  CHAT_ATTACHMENT_ACCEPT_ATTR,
  isChatAttachmentFileAllowed,
} from "@/utils/chatAttachmentFileTypes";

import type {
  DialogueGeneratedResultItem,
  DialogueSessionItem,
  EmployeeItem,
  FrontisWebRole,
  FrontisWebUserItem,
} from "../types";
import {
  buildAttachmentItem,
  buildWorkspaceChatBlocks,
  buildWorkspaceChatMessages,
  createComposerAttachment,
  createId,
  downloadArtifact,
  getAvatarText,
  resolveArtifactUrl,
  revokeComposerAttachmentPreview,
} from "../utils";
import { OpenClawChatFilesPanelV2 } from "./OpenClawChatFilesPanelV2";
import { DialogueResultPanel } from "./DialogueResultPanel";
import styles from "./OpenClawWorkspaceChatV2View.module.less";

const DEFAULT_CONVERSATION_EMPLOYEE_ID = "employee-writer";
const MAX_VISIBLE_SKILL_COUNT = 5;
const OPENCLAW_SIDEBAR_WIDTH = 248;
const SIDE_PANEL_WIDTH_STORAGE_KEY = "frontis-openclaw-v2-chat-side-panel-width";
const ARTIFACT_LIST_PANEL_DEFAULT_WIDTH = 360;
const ARTIFACT_PREVIEW_PANEL_DEFAULT_WIDTH = 720;
const RESULT_PANEL_DEFAULT_WIDTH = 960;
const SIDE_PANEL_MIN_WIDTH = 340;
const SIDE_PANEL_MAX_WIDTH = 1120;
const SKILL_BUTTON_GAP = 6;
const SKILL_BUTTON_BASE_WIDTH = 44;
const SELECTED_SKILL_BUTTON_BASE_WIDTH = 68;
const SKILL_BUTTON_FONT =
  '500 14px "PingFang SC", system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

let skillMeasureContext: CanvasRenderingContext2D | null = null;

const renderSkillIcon = (iconKey: AiCeoHomeSkillItem["iconKey"]): JSX.Element => {
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

interface OpenClawWorkspaceChatV2ViewProps {
  viewRole: FrontisWebRole;
  currentUser: FrontisWebUserItem | null;
  employees: EmployeeItem[];
  initialSessions: DialogueSessionItem[];
  initialArtifactsBySession: Record<string, SynClawArtifactItem[]>;
  initialResultsBySession: Record<string, DialogueGeneratedResultItem[]>;
}

type OpenClawSidePanelMode = "artifacts" | "results" | null;

/**
 * OpenClaw V2 聊天工作台。
 *
 * 保留现有流式 mock 与结果卡片能力，但把页面结构调整为更接近
 * OpenClaw Tauri 客户端的会话壳布局。
 */
export const OpenClawWorkspaceChatV2View = ({
  viewRole,
  currentUser,
  employees,
  initialSessions,
  initialArtifactsBySession,
  initialResultsBySession,
}: OpenClawWorkspaceChatV2ViewProps): JSX.Element => {
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const employeeSwitcherRef = useRef<HTMLDivElement | null>(null);
  const skillTrackRef = useRef<HTMLDivElement | null>(null);
  const dialogueShellRef = useRef<HTMLDivElement | null>(null);
  const sessionTitleInputRef = useRef<InputRef | null>(null);
  const sidePanelLoadedRef = useRef<boolean>(false);
  const sidePanelResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const sidePanelPendingWidthRef = useRef<number>(ARTIFACT_LIST_PANEL_DEFAULT_WIDTH);
  const dialogueTimerRefs = useRef<number[]>([]);
  const latestDialogueAttachmentsRef = useRef<WorkspaceComposerAttachmentItem[]>([]);
  const [isDialogueSidebarCollapsed, setIsDialogueSidebarCollapsed] = useState<boolean>(false);
  const [isEmployeeSwitcherOpen, setIsEmployeeSwitcherOpen] = useState<boolean>(false);
  const [dialogueSessions, setDialogueSessions] =
    useState<DialogueSessionItem[]>(initialSessions);
  const [dialogueArtifactsBySession, setDialogueArtifactsBySession] = useState<
    Record<string, SynClawArtifactItem[]>
  >(initialArtifactsBySession);
  const [dialogueResultsBySession, setDialogueResultsBySession] = useState<
    Record<string, DialogueGeneratedResultItem[]>
  >(initialResultsBySession);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string>(
    DEFAULT_CONVERSATION_EMPLOYEE_ID,
  );
  const [activeDialogueSessionId, setActiveDialogueSessionId] = useState<string>("");
  const [isDialogueHomeActive, setIsDialogueHomeActive] = useState<boolean>(true);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [dialogueInputValue, setDialogueInputValue] = useState<string>("");
  const [dialogueAttachments, setDialogueAttachments] = useState<WorkspaceComposerAttachmentItem[]>(
    [],
  );
  const [respondingDialogueSessionId, setRespondingDialogueSessionId] = useState<string | null>(
    null,
  );
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState<string>("");
  const [skillTrackWidth, setSkillTrackWidth] = useState<number>(0);
  const [sidePanelMode, setSidePanelMode] = useState<OpenClawSidePanelMode>(null);
  const [preferredArtifactId, setPreferredArtifactId] = useState<string>();
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [isArtifactPreviewing, setIsArtifactPreviewing] = useState<boolean>(false);
  const [sidePanelWidth, setSidePanelWidth] = useState<number>(RESULT_PANEL_DEFAULT_WIDTH);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );

  const conversationEmployees = useMemo(() => {
    if (viewRole === "admin") {
      return employees;
    }

    const assignedAgentIds = new Set(currentUser?.assignedAgentIds ?? []);

    return employees.filter(item => assignedAgentIds.has(item.id));
  }, [currentUser?.assignedAgentIds, employees, viewRole]);

  const activeEmployee = useMemo(
    () =>
      conversationEmployees.find(item => item.id === activeEmployeeId) ??
      conversationEmployees[0] ??
      null,
    [activeEmployeeId, conversationEmployees],
  );

  const employeeDialogueSessions = useMemo(
    () =>
      activeEmployee ? dialogueSessions.filter(item => item.employeeId === activeEmployee.id) : [],
    [activeEmployee, dialogueSessions],
  );

  const activeDialogueSession = useMemo(() => {
    if (isDialogueHomeActive) {
      return null;
    }

    return (
      employeeDialogueSessions.find(item => item.id === activeDialogueSessionId) ??
      employeeDialogueSessions[0] ??
      null
    );
  }, [activeDialogueSessionId, employeeDialogueSessions, isDialogueHomeActive]);

  const dialogueMessages = activeDialogueSession?.messages ?? [];
  const activeDialogueArtifacts = useMemo(
    () => (activeDialogueSession ? (dialogueArtifactsBySession[activeDialogueSession.id] ?? []) : []),
    [activeDialogueSession, dialogueArtifactsBySession],
  );
  const activeDialogueResults = useMemo(
    () => (activeDialogueSession ? (dialogueResultsBySession[activeDialogueSession.id] ?? []) : []),
    [activeDialogueSession, dialogueResultsBySession],
  );
  const isDialogueResponding = activeDialogueSession?.id === respondingDialogueSessionId;
  const activeAgentHomeConfig = useMemo(
    () =>
      activeEmployee
        ? (AI_CEO_AGENT_HOME_CONFIGS[activeEmployee.id] ?? AI_CEO_DEFAULT_HOME_CONFIG)
        : AI_CEO_DEFAULT_HOME_CONFIG,
    [activeEmployee],
  );
  const selectedSkill = useMemo(
    () =>
      selectedSkillId
        ? (activeAgentHomeConfig.skillItems.find(item => item.id === selectedSkillId) ?? null)
        : null,
    [activeAgentHomeConfig.skillItems, selectedSkillId],
  );
  const dialoguePlaceholder = useMemo(
    () =>
      selectedSkill
        ? `已选择技能：${selectedSkill.name}，请输入你的具体需求`
        : "输入消息或上传附件",
    [selectedSkill],
  );
  const selectedSkillItem = selectedSkill;
  const availableSkillItems = useMemo(
    () => activeAgentHomeConfig.skillItems.filter(item => item.id !== selectedSkillId),
    [activeAgentHomeConfig.skillItems, selectedSkillId],
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

    const nextVisibleSkillItems: AiCeoHomeSkillItem[] = [];
    let usedWidth = selectedSkillItem ? getSkillButtonWidth(selectedSkillItem.name, true) : 0;
    const moreButtonWidth = getSkillButtonWidth("更多");

    for (let index = 0; index < availableSkillItems.length; index += 1) {
      const currentItem = availableSkillItems[index];
      const hasRemainingItems = index < availableSkillItems.length - 1;
      const nextItemWidth =
        (usedWidth > 0 ? SKILL_BUTTON_GAP : 0) + getSkillButtonWidth(currentItem.name);
      const reservedMoreWidth = hasRemainingItems ? SKILL_BUTTON_GAP + moreButtonWidth : 0;

      if (
        nextVisibleSkillItems.length < maxVisibleSkillCount &&
        usedWidth + nextItemWidth + reservedMoreWidth <= skillTrackWidth
      ) {
        nextVisibleSkillItems.push(currentItem);
        usedWidth += nextItemWidth;
        continue;
      }

      return {
        visibleSkillItems: nextVisibleSkillItems,
        overflowSkillItems: availableSkillItems.slice(index),
      };
    }

    return {
      visibleSkillItems: nextVisibleSkillItems,
      overflowSkillItems: [],
    };
  }, [availableSkillItems, selectedSkillItem, skillTrackWidth]);
  const moreSkillMenuItems = useMemo<NonNullable<MenuProps["items"]>>(
    () =>
      overflowSkillItems.map(item => ({
        key: item.id,
        label: (
          <span className={styles.skillMenuItem}>
            <span className={styles.skillMenuItemIcon}>{renderSkillIcon(item.iconKey)}</span>
            <span>{item.name}</span>
          </span>
        ),
      })),
    [overflowSkillItems],
  );
  const chatMessages = useMemo(
    () => buildWorkspaceChatMessages(dialogueMessages),
    [dialogueMessages],
  );
  const chatBlocks = useMemo(
    () => buildWorkspaceChatBlocks(dialogueMessages),
    [dialogueMessages],
  );
  const dialogueActorAvatars = useMemo(
    () =>
      conversationEmployees.reduce<Record<string, { icon?: string; name?: string }>>(
        (result, item) => {
          result[item.id] = {
            icon: item.avatarUrl,
            name: item.name,
          };
          result[item.name] = {
            icon: item.avatarUrl,
            name: item.name,
          };
          return result;
        },
        {},
      ),
    [conversationEmployees],
  );
  const hasArtifactPanel = activeDialogueArtifacts.length > 0;
  const hasResultPanel = activeDialogueResults.length > 0;
  const isStackedLayout = viewportWidth <= 1100;
  const isArtifactPanelVisible =
    !isDialogueHomeActive && sidePanelMode === "artifacts" && hasArtifactPanel;
  const isResultPanelVisible =
    !isDialogueHomeActive && sidePanelMode === "results" && hasResultPanel;
  const isSidePanelVisible = isArtifactPanelVisible || isResultPanelVisible;

  const clampSidePanelWidth = useCallback(
    (width: number): number => {
      if (!Number.isFinite(width)) {
        return RESULT_PANEL_DEFAULT_WIDTH;
      }

      const reservedShellWidth = isDialogueSidebarCollapsed ? 140 : OPENCLAW_SIDEBAR_WIDTH + 120;
      const viewportLimitedMax = Math.min(
        SIDE_PANEL_MAX_WIDTH,
        Math.max(SIDE_PANEL_MIN_WIDTH, viewportWidth - reservedShellWidth - 280),
      );

      return Math.min(viewportLimitedMax, Math.max(SIDE_PANEL_MIN_WIDTH, width));
    },
    [isDialogueSidebarCollapsed, viewportWidth],
  );
  const resolvedSidePanelWidth = clampSidePanelWidth(sidePanelWidth);
  const chatLayoutStyle = useMemo<CSSProperties | undefined>(() => {
    if (isStackedLayout) {
      return undefined;
    }

    if (!isSidePanelVisible) {
      return {
        gridTemplateColumns: "minmax(0, 1fr)",
      };
    }

    return {
      gridTemplateColumns: `minmax(0, 1fr) 10px ${resolvedSidePanelWidth}px`,
    };
  }, [isSidePanelVisible, isStackedLayout, resolvedSidePanelWidth]);

  useEffect(() => {
    if (!conversationEmployees.length) {
      setActiveEmployeeId("");
      return;
    }

    if (conversationEmployees.some(item => item.id === activeEmployeeId)) {
      return;
    }

    setActiveEmployeeId(conversationEmployees[0].id);
  }, [activeEmployeeId, conversationEmployees]);

  useEffect(() => {
    if (isDialogueHomeActive) {
      if (activeDialogueSessionId !== "") {
        setActiveDialogueSessionId("");
      }
      return;
    }

    if (!employeeDialogueSessions.length) {
      if (activeDialogueSessionId !== "") {
        setActiveDialogueSessionId("");
      }
      return;
    }

    if (employeeDialogueSessions.some(item => item.id === activeDialogueSessionId)) {
      return;
    }

    setActiveDialogueSessionId(employeeDialogueSessions[0].id);
  }, [activeDialogueSessionId, employeeDialogueSessions, isDialogueHomeActive]);

  useEffect(() => {
    latestDialogueAttachmentsRef.current = dialogueAttachments;
  }, [dialogueAttachments]);

  useEffect(() => {
    if (!selectedSkillId) {
      return;
    }

    if (activeAgentHomeConfig.skillItems.some(item => item.id === selectedSkillId)) {
      return;
    }

    setSelectedSkillId(null);
  }, [activeAgentHomeConfig.skillItems, selectedSkillId]);

  const clearDialogueTimers = useCallback((): void => {
    dialogueTimerRefs.current.forEach(timerId => window.clearTimeout(timerId));
    dialogueTimerRefs.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearDialogueTimers();
      latestDialogueAttachmentsRef.current.forEach(revokeComposerAttachmentPreview);
    };
  }, [clearDialogueTimers]);

  useEffect(() => {
    if (!isDialogueHomeActive) {
      return;
    }
    setSidePanelMode(null);
    setPreferredArtifactId(undefined);
    setActiveResultId(null);
    setIsArtifactPreviewing(false);
  }, [isDialogueHomeActive]);

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
          Math.max(currentWidth, ARTIFACT_PREVIEW_PANEL_DEFAULT_WIDTH),
        );
        sidePanelPendingWidthRef.current = nextWidth;
        return nextWidth;
      });
      return;
    }

    const nextWidth = clampSidePanelWidth(ARTIFACT_LIST_PANEL_DEFAULT_WIDTH);
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
    if (!isDialogueSidebarCollapsed) {
      return;
    }
    setIsEmployeeSwitcherOpen(false);
  }, [isDialogueSidebarCollapsed]);

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
    if (sidePanelLoadedRef.current || typeof window === "undefined") {
      return;
    }

    sidePanelLoadedRef.current = true;
    const savedWidth = window.localStorage.getItem(SIDE_PANEL_WIDTH_STORAGE_KEY);
    const nextWidth = clampSidePanelWidth(
      savedWidth ? Number.parseFloat(savedWidth) : RESULT_PANEL_DEFAULT_WIDTH,
    );
    setSidePanelWidth(nextWidth);
    sidePanelPendingWidthRef.current = nextWidth;
  }, [clampSidePanelWidth]);

  useEffect(() => {
    const nextWidth = clampSidePanelWidth(sidePanelPendingWidthRef.current);
    setSidePanelWidth(nextWidth);
    sidePanelPendingWidthRef.current = nextWidth;
  }, [clampSidePanelWidth, viewportWidth, isDialogueSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(SIDE_PANEL_WIDTH_STORAGE_KEY, String(resolvedSidePanelWidth));
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
        dialogueShellRef.current.style.gridTemplateColumns = `minmax(0, 1fr) 10px ${nextWidth}px`;
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
  }, [clampSidePanelWidth, isStackedLayout]);

  const buildAllowedComposerAttachments = useCallback(
    (files?: FileList | File[] | null): WorkspaceComposerAttachmentItem[] =>
      Array.from(files ?? []).reduce<WorkspaceComposerAttachmentItem[]>((result, file) => {
        if (!isChatAttachmentFileAllowed(file)) {
          return result;
        }
        result.push(createComposerAttachment(file));
        return result;
      }, []),
    [],
  );

  const handleDialogueAttachmentsSelected = useCallback(
    (files?: FileList | File[] | null): void => {
      const nextAttachments = buildAllowedComposerAttachments(files);
      if (!nextAttachments.length) {
        return;
      }

      setDialogueAttachments(prev => [...prev, ...nextAttachments]);
    },
    [buildAllowedComposerAttachments],
  );

  const handleRemoveDialogueAttachment = useCallback((attachmentUid: string): void => {
    setDialogueAttachments(prev => {
      const target = prev.find(item => item.uid === attachmentUid);

      if (target) {
        revokeComposerAttachmentPreview(target);
      }

      return prev.filter(item => item.uid !== attachmentUid);
    });
  }, []);

  const handleSelectEmployee = useCallback(
    (employeeId: string): void => {
      setActiveEmployeeId(employeeId);
      const nextEmployeeSessions = dialogueSessions.filter(item => item.employeeId === employeeId);
      setActiveDialogueSessionId(isDialogueHomeActive ? "" : (nextEmployeeSessions[0]?.id ?? ""));
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillId(null);
      setSidePanelMode(null);
      setPreferredArtifactId(undefined);
      setActiveResultId(null);
      setIsArtifactPreviewing(false);
    },
    [dialogueAttachments, dialogueSessions, isDialogueHomeActive],
  );

  const handleSelectDialogueSession = useCallback(
    (sessionId: string): void => {
      setIsDialogueHomeActive(false);
      setActiveDialogueSessionId(sessionId);
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setDialogueInputValue("");
      setSelectedSkillId(null);
    },
    [dialogueAttachments],
  );

  const handleCreateDialogueSession = useCallback((): void => {
    setIsDialogueHomeActive(true);
    setActiveDialogueSessionId("");
    dialogueAttachments.forEach(revokeComposerAttachmentPreview);
    setDialogueAttachments([]);
    setDialogueInputValue("");
    setSelectedSkillId(null);
  }, [dialogueAttachments]);

  const handleSelectSkill = useCallback((skillId: string): void => {
    setSelectedSkillId(current => (current === skillId ? null : skillId));
  }, []);

  const handleRenameDialogueSession = useCallback((sessionId: string, title: string): void => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }
    setDialogueSessions(prev =>
      prev.map(item => (item.id === sessionId ? { ...item, title: nextTitle } : item)),
    );
  }, []);

  const handleRemoveDialogueSession = useCallback(
    (sessionId: string): void => {
      const targetSession = dialogueSessions.find(item => item.id === sessionId);
      if (!targetSession) {
        return;
      }

      const nextSessions = dialogueSessions.filter(item => item.id !== sessionId);
      setDialogueSessions(nextSessions);
      setDialogueArtifactsBySession(prev => {
        const nextArtifacts = { ...prev };
        delete nextArtifacts[sessionId];
        return nextArtifacts;
      });
      setDialogueResultsBySession(prev => {
        const nextResults = { ...prev };
        delete nextResults[sessionId];
        return nextResults;
      });

      if (activeDialogueSessionId !== sessionId) {
        return;
      }

      const nextEmployeeSessions = nextSessions.filter(
        item => item.employeeId === targetSession.employeeId,
      );
      if (nextEmployeeSessions.length === 0) {
        setIsDialogueHomeActive(true);
      }
      setActiveDialogueSessionId(nextEmployeeSessions[0]?.id ?? "");
    },
    [activeDialogueSessionId, dialogueSessions],
  );

  const updateDialogueSession = useCallback(
    (
      sessionId: string,
      updater: (session: DialogueSessionItem) => DialogueSessionItem,
    ): void => {
      setDialogueSessions(prev => {
        const currentSession = prev.find(item => item.id === sessionId);
        if (!currentSession) {
          return prev;
        }

        const nextSession = updater(currentSession);
        return [nextSession, ...prev.filter(item => item.id !== sessionId)];
      });
    },
    [],
  );

  const commitDialogue = useCallback(
    (rawInput: string): void => {
      if (!activeEmployee) {
        return;
      }

      const content = rawInput.trim();
      if (!content && dialogueAttachments.length === 0) {
        return;
      }

      const fallbackContent = "已发送附件，请结合文件内容继续处理。";
      const scenarioQuestion = content || fallbackContent;
      const matchedScenario = findDialogueScenario(
        activeEmployee.id,
        scenarioQuestion,
        createId("dialogue-scenario"),
      );
      const targetSessionId = activeDialogueSession?.id ?? createId("dialogue-session");
      const nextSessionTitle =
        matchedScenario?.title ??
        (content.length > 0
          ? content.slice(0, 18)
          : (dialogueAttachments[0]?.name ??
            (selectedSkill ? `${selectedSkill.name}需求` : "新对话")));
      const messageAttachments =
        dialogueAttachments.length > 0 ? dialogueAttachments.map(buildAttachmentItem) : undefined;
      const userMessageContent = selectedSkill
        ? `技能：${selectedSkill.name}\n需求：${content || fallbackContent}`
        : (content || fallbackContent);
      const sessionPreview = selectedSkill
        ? `${selectedSkill.name} · ${content || fallbackContent}`
        : (content || fallbackContent);

      const nextUserMessage = {
        id: createId("dialogue"),
        role: "user" as const,
        author: "你",
        content: userMessageContent,
        timeLabel: "刚刚",
        attachments: messageAttachments,
      };

      setDialogueSessions(prev => {
        const hasTargetSession = prev.some(item => item.id === targetSessionId);
        if (!hasTargetSession) {
          return [
            {
              id: targetSessionId,
              employeeId: activeEmployee.id,
              title: nextSessionTitle,
              preview: sessionPreview,
              updatedAt: "刚刚",
              messages: [nextUserMessage],
            },
            ...prev,
          ];
        }

        const currentSession = prev.find(item => item.id === targetSessionId);
        if (!currentSession) {
          return prev;
        }

        const nextSession: DialogueSessionItem = {
          ...currentSession,
          title: currentSession.messages.length === 0 ? nextSessionTitle : currentSession.title,
          preview: sessionPreview,
          updatedAt: "刚刚",
          messages: [...currentSession.messages, nextUserMessage],
        };

        return [nextSession, ...prev.filter(item => item.id !== targetSessionId)];
      });

      setActiveDialogueSessionId(targetSessionId);
      setIsDialogueHomeActive(false);
      setDialogueInputValue("");
      setSelectedSkillId(null);
      dialogueAttachments.forEach(revokeComposerAttachmentPreview);
      setDialogueAttachments([]);
      setRespondingDialogueSessionId(targetSessionId);
      clearDialogueTimers();

      if (matchedScenario) {
        const [firstFrame, ...remainingFrames] = matchedScenario.frames;
        const assistantMessageId = createId("dialogue");

        if (!firstFrame) {
          setRespondingDialogueSessionId(null);
          return;
        }

        setDialogueArtifactsBySession(prev => ({
          ...prev,
          [targetSessionId]: [],
        }));
        setDialogueResultsBySession(prev => ({
          ...prev,
          [targetSessionId]: [],
        }));
        setDialogueArtifactsBySession(prev => {
          if (!firstFrame.artifacts) {
            return prev;
          }
          return {
            ...prev,
            [targetSessionId]: firstFrame.artifacts,
          };
        });
        setDialogueResultsBySession(prev => {
          if (!firstFrame.results) {
            return prev;
          }
          return {
            ...prev,
            [targetSessionId]: firstFrame.results,
          };
        });

        updateDialogueSession(targetSessionId, currentSession => ({
          ...currentSession,
          preview: firstFrame.preview,
          updatedAt: "刚刚",
          messages: [
            ...currentSession.messages,
            {
              id: assistantMessageId,
              role: "assistant",
              author: activeEmployee.name,
              content: firstFrame.preview,
              timeLabel: "刚刚",
              blocks: firstFrame.blocks,
            },
          ],
        }));

        if (remainingFrames.length === 0) {
          setRespondingDialogueSessionId(null);
          return;
        }

        let accumulatedDelayMs = 0;

        remainingFrames.forEach((frame, frameIndex) => {
          accumulatedDelayMs += frame.delayMs;
          const isLastFrame = frameIndex === remainingFrames.length - 1;
          const timerId = window.setTimeout(() => {
            updateDialogueSession(targetSessionId, currentSession => ({
              ...currentSession,
              preview: frame.preview,
              updatedAt: "刚刚",
              messages: currentSession.messages.map(message =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content: frame.preview,
                      timeLabel: "刚刚",
                      blocks: frame.blocks,
                    }
                  : message,
              ),
            }));

            if (frame.artifacts) {
              setDialogueArtifactsBySession(prev => ({
                ...prev,
                [targetSessionId]: frame.artifacts ?? [],
              }));
            }

            if (frame.results) {
              setDialogueResultsBySession(prev => ({
                ...prev,
                [targetSessionId]: frame.results ?? [],
              }));
            }

            dialogueTimerRefs.current = dialogueTimerRefs.current.filter(
              currentTimerId => currentTimerId !== timerId,
            );

            if (isLastFrame) {
              setRespondingDialogueSessionId(current =>
                current === targetSessionId ? null : current,
              );
            }
          }, accumulatedDelayMs);

          dialogueTimerRefs.current.push(timerId);
        });

        return;
      }

      const responseText = selectedSkill
        ? `已按「${selectedSkill.name}」开始处理，我会先聚焦这项能力来回应你的需求。`
        : "已继续处理当前任务，结果会直接回流到本轮对话和右侧成果面板；如需管理员或其他角色协同，我会同步提醒。";

      const timerId = window.setTimeout(() => {
        const nextAssistantMessage = {
          id: createId("dialogue"),
          role: "assistant" as const,
          author: activeEmployee.name,
          content: `${responseText} 同时我会把相关事项同步到当前会话和定时任务页，方便继续追踪。`,
          timeLabel: "刚刚",
        };
        setDialogueSessions(prev => {
          const currentSession = prev.find(item => item.id === targetSessionId);
          if (!currentSession) {
            return prev;
          }

          const nextSession: DialogueSessionItem = {
            ...currentSession,
            preview: nextAssistantMessage.content,
            updatedAt: "刚刚",
            messages: [...currentSession.messages, nextAssistantMessage],
          };

          return [nextSession, ...prev.filter(item => item.id !== targetSessionId)];
        });
        setRespondingDialogueSessionId(current => (current === targetSessionId ? null : current));
        dialogueTimerRefs.current = dialogueTimerRefs.current.filter(
          currentTimerId => currentTimerId !== timerId,
        );
      }, 1200);

      dialogueTimerRefs.current.push(timerId);
    },
    [
      activeDialogueSession,
      activeEmployee,
      clearDialogueTimers,
      dialogueAttachments,
      selectedSkill,
      updateDialogueSession,
    ],
  );

  const handleSendDialogue = useCallback((): void => {
    commitDialogue(dialogueInputValue);
  }, [commitDialogue, dialogueInputValue]);

  const handleSendDialogueHomePrompt = useCallback((question: string): void => {
    commitDialogue(question);
  }, [commitDialogue]);

  const handleStopDialogue = useCallback((): void => {
    if (!isDialogueResponding || !activeDialogueSession) {
      return;
    }

    clearDialogueTimers();
    setRespondingDialogueSessionId(null);
    setDialogueSessions(prev => {
      const currentSession = prev.find(item => item.id === activeDialogueSession.id);
      if (!currentSession) {
        return prev;
      }

      const nextSession: DialogueSessionItem = {
        ...currentSession,
        preview: "本轮对话已被手动终止。",
        updatedAt: "刚刚",
        messages: [
          ...currentSession.messages,
          {
            id: createId("dialogue"),
            role: "system",
            author: "系统",
            content: "本轮对话已被手动终止。你可以继续补充信息后重新发送。",
            timeLabel: "刚刚",
          },
        ],
      };

      return [nextSession, ...prev.filter(item => item.id !== activeDialogueSession.id)];
    });
  }, [activeDialogueSession, clearDialogueTimers, isDialogueResponding]);

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
    if (!editingSessionId) {
      return;
    }
    const nextTitle = editingSessionTitle.trim();
    if (!nextTitle) {
      return;
    }
    handleRenameDialogueSession(editingSessionId, nextTitle);
    setEditingSessionId(null);
    setEditingSessionTitle("");
  };

  const getDialogueSessionMenuItems = useCallback(
    (sessionId: string, currentTitle: string): MenuProps["items"] => [
      {
        key: "rename",
        label: "重命名",
        onClick: () => handleStartRenameSession(sessionId, currentTitle),
      },
      {
        key: "remove",
        label: "删除",
        danger: true,
        onClick: () => handleRemoveDialogueSession(sessionId),
      },
    ],
    [handleRemoveDialogueSession],
  );

  const handleOpenArtifact = useCallback(
    (artifactId: string): void => {
      const matchedFile = activeDialogueArtifacts.find(
        item => item.id === artifactId || item.artifactId === artifactId,
      );
      if (!matchedFile) {
        return;
      }

      setPreferredArtifactId(matchedFile.id);
      setIsArtifactPreviewing(true);
      setSidePanelWidth(currentWidth =>
        clampSidePanelWidth(Math.max(currentWidth, ARTIFACT_PREVIEW_PANEL_DEFAULT_WIDTH)),
      );
      setSidePanelMode("artifacts");
    },
    [activeDialogueArtifacts, clampSidePanelWidth],
  );

  const handleOpenResult = useCallback(
    (resultId: string): void => {
      if (!activeDialogueResults.some(item => item.id === resultId)) {
        return;
      }
      setSidePanelWidth(currentWidth =>
        clampSidePanelWidth(Math.max(currentWidth, RESULT_PANEL_DEFAULT_WIDTH)),
      );
      setActiveResultId(resultId);
      setSidePanelMode("results");
    },
    [activeDialogueResults, clampSidePanelWidth],
  );

  const handleToggleArtifactsPanel = useCallback((): void => {
    if (!hasArtifactPanel) {
      return;
    }
    setPreferredArtifactId(undefined);
    setIsArtifactPreviewing(false);
    setSidePanelWidth(clampSidePanelWidth(ARTIFACT_LIST_PANEL_DEFAULT_WIDTH));
    setSidePanelMode(current => (current === "artifacts" ? null : "artifacts"));
  }, [clampSidePanelWidth, hasArtifactPanel]);

  const handleSelectResultCard = useCallback(
    (resultId: string): void => {
      if (!activeDialogueResults.some(item => item.id === resultId)) {
        return;
      }
      setSidePanelWidth(currentWidth =>
        clampSidePanelWidth(Math.max(currentWidth, RESULT_PANEL_DEFAULT_WIDTH)),
      );
      setActiveResultId(resultId);
      setSidePanelMode("results");
    },
    [activeDialogueResults, clampSidePanelWidth],
  );

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

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      handleDialogueAttachmentsSelected(event.target.files);
      event.target.value = "";
    },
    [handleDialogueAttachmentsSelected],
  );

  const handleLinkArtifactToInput = useCallback((file: SynClawArtifactItem): void => {
    const fileRef = `#文件 ${file.fileName}`;
    setDialogueInputValue(current => (current.trim() ? `${current}\n${fileRef}` : fileRef));
  }, []);

  if (!activeEmployee) {
    return (
      <div className={styles.emptyPageState}>
        <Empty description="当前账号暂未分配 Agent，请联系管理员分配后再开始对话。" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div
        className={classNames(styles.shellSidebarWrap, {
          [styles.shellSidebarWrapCollapsed]: isDialogueSidebarCollapsed,
        })}
      >
        <aside
          className={classNames(styles.shellSidebar, {
            [styles.shellSidebarCollapsed]: isDialogueSidebarCollapsed,
          })}
        >
          <div className={styles.sidebarTopbar}>
            <div className={styles.sectionTitle}>AI 专家</div>
            <button
              type="button"
              className={styles.collapseButton}
              aria-label="收起会话侧栏"
              onClick={() => setIsDialogueSidebarCollapsed(true)}
            >
              <MenuFoldOutlined />
            </button>
          </div>

          <div ref={employeeSwitcherRef} className={styles.agentSelectSection}>
            <button
              type="button"
              className={styles.agentSelectButton}
              aria-expanded={isEmployeeSwitcherOpen}
              aria-label="切换 AI 专家"
              onClick={() => setIsEmployeeSwitcherOpen(current => !current)}
            >
              <span className={styles.agentSelectCurrent}>
                <Avatar src={activeEmployee.avatarUrl} size={40} className={styles.agentSelectAvatar}>
                  {getAvatarText(activeEmployee.name)}
                </Avatar>
                <span className={styles.agentSelectName}>{activeEmployee.name}</span>
              </span>
              <DownOutlined
                className={classNames(styles.agentSelectArrow, {
                  [styles.agentSelectArrowOpen]: isEmployeeSwitcherOpen,
                })}
              />
            </button>

            {isEmployeeSwitcherOpen ? (
              <div className={styles.agentDropdownMenu}>
                <div className={styles.agentOptionList}>
                  {conversationEmployees.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={classNames(styles.agentOption, {
                        [styles.agentOptionActive]: item.id === activeEmployee.id,
                      })}
                      onClick={() => {
                        handleSelectEmployee(item.id);
                        setIsEmployeeSwitcherOpen(false);
                      }}
                    >
                      <Avatar src={item.avatarUrl} size={40} className={styles.agentOptionAvatar}>
                        {getAvatarText(item.name)}
                      </Avatar>
                      <span className={styles.agentOptionName}>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <button type="button" className={styles.newChatButton} onClick={handleCreateDialogueSession}>
            <PlusOutlined />
            <span>新对话</span>
          </button>

          <div className={styles.sectionTitle}>最近对话</div>
          <div className={styles.sessionList}>
            {employeeDialogueSessions.length > 0 ? (
              employeeDialogueSessions.map(item => (
                <div
                  key={item.id}
                  className={classNames(styles.sessionEntry, {
                    [styles.sessionEntryActive]: item.id === activeDialogueSession?.id,
                  })}
                >
                  {editingSessionId === item.id ? (
                    <div className={styles.sessionEditor}>
                      <Input
                        ref={sessionTitleInputRef}
                        size="small"
                        value={editingSessionTitle}
                        placeholder="输入会话名称"
                        onClick={event => event.stopPropagation()}
                        onChange={event => setEditingSessionTitle(event.target.value)}
                        onPressEnter={handleSubmitRenameSession}
                      />
                      <div className={styles.sessionEditorActions}>
                        <button
                          type="button"
                          className={styles.sessionEditorButton}
                          aria-label="保存会话名称"
                          onClick={handleSubmitRenameSession}
                        >
                          <CheckOutlined />
                        </button>
                        <button
                          type="button"
                          className={styles.sessionEditorButton}
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
                        className={styles.sessionItem}
                        onClick={() => handleSelectDialogueSession(item.id)}
                      >
                        <span className={styles.sessionTitle}>{item.title}</span>
                        <span className={styles.sessionTime}>{item.updatedAt}</span>
                      </button>
                      <Dropdown
                        menu={{ items: getDialogueSessionMenuItems(item.id, item.title) }}
                        trigger={["click"]}
                      >
                        <button
                          type="button"
                          className={styles.sessionMoreButton}
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
              ))
            ) : (
              <div className={styles.sessionEmpty}>暂无会话</div>
            )}
          </div>
        </aside>
      </div>

      <div className={styles.chatShell}>
        {isDialogueSidebarCollapsed ? (
          <button
            type="button"
            className={styles.reopenButton}
            aria-label={`展开 ${activeEmployee.name} 会话侧栏`}
            onClick={() => setIsDialogueSidebarCollapsed(false)}
          >
            <Avatar src={activeEmployee.avatarUrl} size={52} className={styles.reopenAvatar}>
              {getAvatarText(activeEmployee.name)}
            </Avatar>
            <span className={styles.reopenOverlay}>
              <RightOutlined />
            </span>
          </button>
        ) : null}

        <div
          ref={dialogueShellRef}
          className={styles.chatLayout}
          style={chatLayoutStyle}
        >
          <main className={styles.main}>
            {!isDialogueHomeActive && hasArtifactPanel ? (
              <button
                type="button"
                className={classNames(styles.filesTrigger, {
                  [styles.filesTriggerActive]: isArtifactPanelVisible,
                })}
                aria-label={isArtifactPanelVisible ? "关闭成果文件面板" : "打开成果文件面板"}
                title={isArtifactPanelVisible ? "关闭成果文件面板" : "打开成果文件面板"}
                onClick={handleToggleArtifactsPanel}
              >
                <FolderOutlined />
              </button>
            ) : null}

            <div className={styles.stage}>
              {isDialogueHomeActive ? (
                <div className={styles.homeStage}>
                  <Avatar src={activeEmployee.avatarUrl} size={72} className={styles.homeAvatar}>
                    {getAvatarText(activeEmployee.name)}
                  </Avatar>
                  <h2 className={styles.homeTitle}>{activeEmployee.name}</h2>
                  <p className={styles.homeIntro}>{activeAgentHomeConfig.intro}</p>
                  <div className={styles.promptList}>
                    {activeAgentHomeConfig.promptItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.promptButton}
                        onClick={() => handleSendDialogueHomePrompt(item.question)}
                      >
                        <span className={styles.promptButtonLabel}>{item.question}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.chatPanel}>
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
                      onOpenArtifact={block => {
                        const blockData =
                          block.data && typeof block.data === "object"
                            ? (block.data as Record<string, unknown>)
                            : null;
                        const artifactId =
                          blockData && typeof blockData.artifact_id === "string"
                            ? blockData.artifact_id.trim()
                            : "";
                        if (!artifactId) {
                          return;
                        }
                        handleOpenArtifact(artifactId);
                      }}
                      onOpenResult={handleOpenResult}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.composer}>
              <WorkspaceComposer
                value={dialogueInputValue}
                rootClassName={styles.composerInner}
                placeholder={dialoguePlaceholder}
                attachments={dialogueAttachments}
                onRemoveAttachment={handleRemoveDialogueAttachment}
                onAttachmentsSelected={handleDialogueAttachmentsSelected}
                allowAttachmentOnlySend={true}
                footerExtra={
                  <div className={styles.composerHelper}>
                    <div className={styles.composerSkillBar}>
                      <span className={styles.composerSkillDivider} aria-hidden={true} />
                      <div ref={skillTrackRef} className={styles.composerSkillTrack}>
                        {selectedSkillItem ? (
                          <div className={styles.skillSelected}>
                            <span className={styles.skillButtonIcon}>
                              {renderSkillIcon(selectedSkillItem.iconKey)}
                            </span>
                            <span className={styles.skillButtonLabel}>{selectedSkillItem.name}</span>
                            <button
                              type="button"
                              className={styles.skillClearButton}
                              aria-label={`取消技能 ${selectedSkillItem.name}`}
                              onClick={() => handleSelectSkill(selectedSkillItem.id)}
                            >
                              <CloseOutlined />
                            </button>
                          </div>
                        ) : null}
                        {visibleSkillItems.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            className={styles.skillButton}
                            onClick={() => handleSelectSkill(item.id)}
                          >
                            <span className={styles.skillButtonIcon}>
                              {renderSkillIcon(item.iconKey)}
                            </span>
                            <span className={styles.skillButtonLabel}>{item.name}</span>
                          </button>
                        ))}
                        {overflowSkillItems.length > 0 ? (
                          <Dropdown
                            menu={{
                              items: moreSkillMenuItems,
                              onClick: ({ key }) => {
                                handleSelectSkill(String(key));
                              },
                            }}
                            trigger={["click"]}
                            placement="topRight"
                          >
                            <button type="button" className={styles.skillButton}>
                              <span className={styles.skillButtonIcon}>
                                <MoreOutlined />
                              </span>
                              <span className={styles.skillButtonLabel}>更多</span>
                            </button>
                          </Dropdown>
                        ) : null}
                      </div>
                    </div>
                  </div>
                }
                sending={isDialogueResponding}
                showModelSelector={false}
                modelLabel={activeEmployee.model}
                selectedModelId={WORKSPACE_MODEL_OPTIONS[0]?.id ?? 1}
                modelMenuOpen={false}
                modelOptions={WORKSPACE_MODEL_OPTIONS}
                onValueChange={setDialogueInputValue}
                onAttach={() => attachmentInputRef.current?.click()}
                onSend={handleSendDialogue}
                onAbort={handleStopDialogue}
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
          </main>

          {isSidePanelVisible && !isStackedLayout ? (
            <div
              className={styles.resizeHandle}
              role="separator"
              aria-label="调整右侧面板宽度"
              aria-orientation="vertical"
              onMouseDown={handleSidePanelResizeStart}
            />
          ) : null}

          {isArtifactPanelVisible ? (
            <aside className={styles.toolPanel}>
              <OpenClawChatFilesPanelV2
                files={activeDialogueArtifacts}
                onClose={() => {
                  setSidePanelMode(null);
                  setIsArtifactPreviewing(false);
                }}
                onDownloadFile={downloadArtifact}
                resolveFileUrl={resolveArtifactUrl}
                onLinkFile={handleLinkArtifactToInput}
                onPreviewStateChange={setIsArtifactPreviewing}
                preferredFileId={preferredArtifactId}
              />
            </aside>
          ) : null}

          {isResultPanelVisible ? (
            <aside className={styles.toolPanel}>
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
      </div>
    </div>
  );
};
