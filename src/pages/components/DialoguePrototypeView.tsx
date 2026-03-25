import classNames from "classnames";
import {
  CheckOutlined,
  ApiOutlined,
  CloseOutlined,
  CloudOutlined,
  ColumnWidthOutlined,
  DesktopOutlined,
  FolderOutlined,
  LaptopOutlined,
  MenuFoldOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { InputRef, MenuProps } from "antd";
import { Avatar, Dropdown, Input } from "antd";

import { SynClawArtifactsPanel } from "@/pages/synclaw/components/SynClawArtifactsPanel";
import type { SynClawArtifactItem } from "@/pages/synclaw/types";
import { WorkspaceChatPanel } from "@/feature/workspace/components/WorkspaceChatPanel";
import { WorkspaceComposer } from "@/feature/workspace/components/WorkspaceComposer";
import type { WorkspaceComposerAttachmentItem } from "@/feature/workspace/types";
import { WORKSPACE_MODEL_OPTIONS } from "@/feature/workspace/types";
import { CHAT_ATTACHMENT_ACCEPT_ATTR } from "@/utils/chatAttachmentFileTypes";

import type { ChatMessage, DialogueSessionItem, EmployeeItem, WorkspaceItem } from "../types";
import {
  buildWorkspaceChatBlocks,
  buildWorkspaceChatMessages,
  downloadArtifact,
  getAvatarText,
  resolveArtifactUrl,
} from "../utils";
import styles from "../FrontisPage.module.less";

interface DialoguePrototypeViewProps {
  activeEmployee: EmployeeItem;
  activeDialogueArtifacts: SynClawArtifactItem[];
  activeDialogueSession: DialogueSessionItem | null;
  activeWorkspace: WorkspaceItem;
  allEmployees: EmployeeItem[];
  allWorkspaces: WorkspaceItem[];
  dialogueAttachments: WorkspaceComposerAttachmentItem[];
  dialogueInputValue: string;
  dialogueMessages: ChatMessage[];
  dialogueSessions: DialogueSessionItem[];
  isDialogueResponding: boolean;
  onCreateDialogueSession: () => void;
  onDialogueAttachmentsSelected: (files?: FileList | File[] | null) => void;
  onDialogueInputChange: (value: string) => void;
  onDialogueSessionSelect: (sessionId: string) => void;
  onRemoveDialogueSession: (sessionId: string) => void;
  onRenameDialogueSession: (sessionId: string, title: string) => void;
  onEmployeeSelect: (employeeId: string) => void;
  onRemoveAttachment: (attachmentUid: string) => void;
  onSendDialogue: () => void;
  onStopDialogue: () => void;
  workspaceEmployees: EmployeeItem[];
}

const DIALOGUE_RUNTIME_PANEL_WIDTH_KEY = "prd-dialogue-runtime-panel-width";
const DIALOGUE_RUNTIME_PANEL_DEFAULT_WIDTH = 420;
const DIALOGUE_RUNTIME_PANEL_MIN_WIDTH = 320;
const DIALOGUE_RUNTIME_PANEL_MAX_WIDTH = 680;

type DialogueViewMode = "split" | "cloudspace";

/**
 * 对话视图。
 */
export const DialoguePrototypeView = ({
  activeEmployee,
  activeDialogueArtifacts,
  activeDialogueSession,
  activeWorkspace,
  allEmployees,
  allWorkspaces,
  dialogueAttachments,
  dialogueInputValue,
  dialogueMessages,
  dialogueSessions,
  isDialogueResponding,
  onCreateDialogueSession,
  onDialogueAttachmentsSelected,
  onDialogueInputChange,
  onDialogueSessionSelect,
  onRemoveDialogueSession,
  onRenameDialogueSession,
  onEmployeeSelect,
  onRemoveAttachment,
  onSendDialogue,
  onStopDialogue,
}: DialoguePrototypeViewProps): JSX.Element => {
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const sessionTitleInputRef = useRef<InputRef | null>(null);
  const switcherPanelRef = useRef<HTMLDivElement | null>(null);
  const [isEmployeeSwitcherOpen, setIsEmployeeSwitcherOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isArtifactsPanelOpen, setIsArtifactsPanelOpen] = useState<boolean>(false);
  const [dialogueViewMode, setDialogueViewMode] = useState<DialogueViewMode>("split");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState<string>("");
  const [isRuntimePanelOpen, setIsRuntimePanelOpen] = useState<boolean>(false);
  const [runtimePanelWidth, setRuntimePanelWidth] = useState<number>(
    DIALOGUE_RUNTIME_PANEL_DEFAULT_WIDTH,
  );
  const [runtimeRefreshKey, setRuntimeRefreshKey] = useState<number>(0);
  const runtimeColumnRef = useRef<HTMLElement | null>(null);
  const runtimeResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const runtimePendingWidthRef = useRef<number>(DIALOGUE_RUNTIME_PANEL_DEFAULT_WIDTH);
  const isCloudRuntime =
    activeWorkspace.type === "cloud" && activeEmployee.connectionMode === "cloud";
  const isArtifactsVisible = isArtifactsPanelOpen && dialogueViewMode !== "cloudspace";
  const showRuntimeSplitColumn =
    isCloudRuntime && dialogueViewMode === "split" && isRuntimePanelOpen;
  const isRuntimeFullscreen = isCloudRuntime && dialogueViewMode === "cloudspace";
  const workspaceById = useMemo(
    () => new Map(allWorkspaces.map(item => [item.id, item])),
    [allWorkspaces],
  );

  const chatMessages = useMemo(
    () => buildWorkspaceChatMessages(dialogueMessages),
    [dialogueMessages],
  );
  const chatBlocks = useMemo(() => buildWorkspaceChatBlocks(dialogueMessages), [dialogueMessages]);

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onDialogueAttachmentsSelected(event.currentTarget.files);
    event.currentTarget.value = "";
  };

  useEffect(() => {
    setIsEmployeeSwitcherOpen(false);
  }, [activeEmployee.id]);

  useEffect(() => {
    if (isSidebarCollapsed) {
      setIsEmployeeSwitcherOpen(false);
    }
  }, [isSidebarCollapsed]);

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
    if (!isCloudRuntime) {
      setDialogueViewMode("split");
      setIsRuntimePanelOpen(false);
    }
  }, [isCloudRuntime]);

  useEffect(() => {
    if (!isCloudRuntime) return;
    setIsRuntimePanelOpen(true);
  }, [activeDialogueSession?.id, activeEmployee.id, isCloudRuntime]);

  const clampRuntimePanelWidth = useCallback(
    (width: number): number => {
      if (!Number.isFinite(width)) return DIALOGUE_RUNTIME_PANEL_DEFAULT_WIDTH;
      if (typeof window === "undefined") {
        return Math.min(
          DIALOGUE_RUNTIME_PANEL_MAX_WIDTH,
          Math.max(DIALOGUE_RUNTIME_PANEL_MIN_WIDTH, width),
        );
      }
      const sidebarReservedWidth = isSidebarCollapsed ? 0 : 252;
      const artifactsReservedWidth = isArtifactsVisible ? 422 : 0;
      const viewportLimitedMax = Math.min(
        DIALOGUE_RUNTIME_PANEL_MAX_WIDTH,
        Math.max(
          DIALOGUE_RUNTIME_PANEL_MIN_WIDTH,
          window.innerWidth - sidebarReservedWidth - artifactsReservedWidth - 420,
        ),
      );
      return Math.min(viewportLimitedMax, Math.max(DIALOGUE_RUNTIME_PANEL_MIN_WIDTH, width));
    },
    [isArtifactsVisible, isSidebarCollapsed],
  );

  const resolvedRuntimePanelWidth = useMemo(
    () => clampRuntimePanelWidth(runtimePanelWidth),
    [clampRuntimePanelWidth, runtimePanelWidth],
  );

  const handleRuntimeResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>): void => {
      event.preventDefault();
      runtimeResizeStateRef.current = {
        startX: event.clientX,
        startWidth: resolvedRuntimePanelWidth,
      };
      runtimePendingWidthRef.current = resolvedRuntimePanelWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [resolvedRuntimePanelWidth],
  );

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      const current = runtimeResizeStateRef.current;
      if (!current) return;
      const deltaX = event.clientX - current.startX;
      const nextWidth = clampRuntimePanelWidth(current.startWidth - deltaX);
      runtimePendingWidthRef.current = nextWidth;
      if (runtimeColumnRef.current) {
        runtimeColumnRef.current.style.width = `${nextWidth}px`;
        runtimeColumnRef.current.style.minWidth = `${nextWidth}px`;
      }
    };

    const handlePointerUp = () => {
      if (!runtimeResizeStateRef.current) return;
      setRuntimePanelWidth(runtimePendingWidthRef.current);
      runtimeResizeStateRef.current = null;
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
  }, [clampRuntimePanelWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedWidth = window.localStorage.getItem(DIALOGUE_RUNTIME_PANEL_WIDTH_KEY);
    const nextWidth = clampRuntimePanelWidth(
      savedWidth ? Number.parseFloat(savedWidth) : DIALOGUE_RUNTIME_PANEL_DEFAULT_WIDTH,
    );
    setRuntimePanelWidth(nextWidth);
    runtimePendingWidthRef.current = nextWidth;
  }, [clampRuntimePanelWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      DIALOGUE_RUNTIME_PANEL_WIDTH_KEY,
      String(resolvedRuntimePanelWidth),
    );
  }, [resolvedRuntimePanelWidth]);

  useEffect(() => {
    if (!isEmployeeSwitcherOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (switcherPanelRef.current?.contains(event.target)) {
        return;
      }
      setIsEmployeeSwitcherOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isEmployeeSwitcherOpen]);

  const handleSelectEmployee = (employeeId: string): void => {
    onEmployeeSelect(employeeId);
    setIsEmployeeSwitcherOpen(false);
  };

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

  const resolveEmployeeWorkspace = (employee: EmployeeItem): WorkspaceItem | undefined =>
    workspaceById.get(employee.workspaceId);

  const resolveRuntimeLabel = (employee: EmployeeItem): string => {
    const workspace = resolveEmployeeWorkspace(employee);
    if (workspace?.type === "cloud") return "云端";
    if (workspace?.type === "edge") return "边缘";
    return "本地";
  };

  const renderRuntimeIcon = (employee: EmployeeItem): JSX.Element => {
    const workspace = resolveEmployeeWorkspace(employee);
    if (workspace?.type === "cloud") return <CloudOutlined />;
    if (workspace?.type === "edge") return <ApiOutlined />;
    return <LaptopOutlined />;
  };

  const renderCloudRuntimePanel = (): JSX.Element => (
    <div
      className={classNames(styles.dialogueRuntimePanel, {
        [styles.dialogueRuntimePanelFull]: dialogueViewMode === "cloudspace",
      })}
    >
      <div className={styles.groupRuntimePanelHeader}>
        <div className={styles.dialogueRuntimePanelToolbarSpacer} />
        <div className={styles.groupRuntimeViewControls}>
          <button
            type="button"
            className={classNames(styles.groupRuntimeOverlayButton, {
              [styles.groupRuntimeOverlayButtonActive]: dialogueViewMode === "split",
            })}
            onClick={() => {
              setDialogueViewMode("split");
              setIsRuntimePanelOpen(true);
            }}
          >
            <ColumnWidthOutlined />
            <span>分屏</span>
          </button>
          <button
            type="button"
            className={classNames(styles.groupRuntimeOverlayButton, {
              [styles.groupRuntimeOverlayButtonActive]: dialogueViewMode === "cloudspace",
            })}
            onClick={() => setDialogueViewMode("cloudspace")}
          >
            <DesktopOutlined />
            <span>全屏</span>
          </button>
          <button
            type="button"
            className={styles.groupRuntimeOverlayIconButton}
            aria-label="刷新远端桌面"
            onClick={() => setRuntimeRefreshKey(prev => prev + 1)}
          >
            <ReloadOutlined />
          </button>
          {dialogueViewMode === "split" ? (
            <button
              type="button"
              className={styles.groupRuntimeOverlayIconButton}
              aria-label="关闭桌面面板"
              onClick={() => setIsRuntimePanelOpen(false)}
            >
              <CloseOutlined />
            </button>
          ) : null}
        </div>
      </div>
      <div className={styles.groupRuntimePanelBody}>
        <div key={runtimeRefreshKey} className={styles.groupRuntimeDesktopWindow}>
          <div className={styles.groupRuntimeDesktopHeader}>
            <div className={styles.groupRuntimeDesktopDots} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className={styles.groupRuntimeDesktopHeaderTitle}>
              {activeEmployee.name} · {activeWorkspace.name}
            </span>
          </div>
          <div className={styles.groupRuntimeDesktopBody}>
            <div className={styles.groupRuntimeDesktopSidebar}>
              <span>Home</span>
              <span>Workspace</span>
              <span>Browser</span>
              <span>Artifacts</span>
            </div>
            <div className={styles.groupRuntimeDesktopCanvas}>
              <div className={styles.groupRuntimeDesktopStatusRow}>
                <span className={styles.groupRuntimeDesktopBadge}>
                  当前查看：{activeEmployee.name}
                </span>
                <span className={styles.groupRuntimeDesktopBadge}>{activeWorkspace.name}</span>
              </div>
              <div className={styles.groupRuntimeDesktopMainWindow}>
                <div className={styles.groupRuntimeDesktopWindowBar}>
                  <span className={styles.groupRuntimeDesktopWindowTitle}>浏览器任务面板</span>
                  <span className={styles.groupRuntimeDesktopWindowMeta}>
                    工作站：{activeWorkspace.runtimeHint}
                  </span>
                </div>
                <div className={styles.groupRuntimeDesktopScene}>
                  <div className={styles.groupRuntimeDesktopHeroCard}>
                    <span className={styles.groupRuntimeDesktopLabel}>当前设备</span>
                    <span className={styles.groupRuntimeDesktopValue}>{activeWorkspace.name}</span>
                    <span className={styles.groupRuntimeDesktopText}>
                      桌面窗口与当前对话上下文保持同步，资料检索与文件整理都会回写到本轮会话。
                    </span>
                  </div>

                  <div className={styles.groupRuntimeDesktopGrid}>
                    <div className={styles.groupRuntimeDesktopCard}>网页检索</div>
                    <div className={styles.groupRuntimeDesktopCard}>资料整理</div>
                    <div className={styles.groupRuntimeDesktopCard}>文件回传</div>
                    <div className={styles.groupRuntimeDesktopCard}>
                      {activeEmployee.lastAction}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.groupRuntimeDesktopDock}>
                <span className={styles.groupRuntimeDesktopDockItem}>Browser</span>
                <span className={styles.groupRuntimeDesktopDockItem}>Docs</span>
                <span className={styles.groupRuntimeDesktopDockItem}>Files</span>
                <span className={styles.groupRuntimeDesktopDockItem}>Sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={classNames(styles.dialogueShell, {
        [styles.dialogueShellSidebarCollapsed]: isSidebarCollapsed && !showRuntimeSplitColumn,
        [styles.dialogueShellArtifactsHidden]: !isArtifactsVisible && !showRuntimeSplitColumn,
        [styles.dialogueShellRuntimeVisible]: showRuntimeSplitColumn,
        [styles.dialogueShellRuntimeArtifactsHidden]: showRuntimeSplitColumn && !isArtifactsVisible,
        [styles.dialogueShellRuntimeSidebarCollapsed]: showRuntimeSplitColumn && isSidebarCollapsed,
        [styles.dialogueShellRuntimeSidebarCollapsedArtifactsHidden]:
          showRuntimeSplitColumn && isSidebarCollapsed && !isArtifactsVisible,
      })}
    >
      {!isSidebarCollapsed ? (
        <aside className={styles.dialogueSidebarCard}>
          <div className={styles.dialogueSidebarTopBar}>
            <button
              type="button"
              className={styles.dialogueSidebarAction}
              onClick={() => setIsEmployeeSwitcherOpen(open => !open)}
            >
              <SwapOutlined />
              <span>切换</span>
            </button>
            <button
              type="button"
              className={styles.dialogueSidebarIconButton}
              aria-label="收起对话侧栏"
              onClick={() => setIsSidebarCollapsed(true)}
            >
              <MenuFoldOutlined />
            </button>
          </div>

          {isEmployeeSwitcherOpen && (
            <div ref={switcherPanelRef} className={styles.dialogueFloatingSwitcher}>
              <div className={styles.dialogueSwitcherList}>
                {allEmployees.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={classNames(styles.dialogueSwitcherItem, {
                      [styles.dialogueSwitcherItemActive]: item.id === activeEmployee.id,
                    })}
                    onClick={() => handleSelectEmployee(item.id)}
                  >
                    <span className={styles.employeeAvatarWrap}>
                      <Avatar src={item.avatarUrl} size={52} className={styles.dialogueHeroAvatar}>
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
                      <span className={styles.dialogueSwitcherItemMeta}>
                        {resolveRuntimeLabel(item)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.dialogueHeroCard}>
            <span className={styles.dialogueHeroAvatarWrap}>
              <Avatar
                src={activeEmployee.avatarUrl}
                size={88}
                className={styles.dialogueHeroAvatar}
              >
                {getAvatarText(activeEmployee.name)}
              </Avatar>
              <span
                className={classNames(styles.employeeStatusDot, styles.dialogueHeroStatusDot, {
                  [styles.employeeStatusDotIdle]: activeEmployee.status === "idle",
                  [styles.employeeStatusDotBusy]: activeEmployee.status === "busy",
                  [styles.employeeStatusDotPending]:
                    activeEmployee.status === "pending" ||
                    activeEmployee.status === "paused" ||
                    activeEmployee.status === "draft",
                })}
              />
            </span>
            <div className={styles.dialogueHeroName}>{activeEmployee.name}</div>
            <span className={styles.dialogueHeroBadge}>
              {renderRuntimeIcon(activeEmployee)}
              <span>{resolveRuntimeLabel(activeEmployee)}</span>
            </span>
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
                dialogueSessions.map(item => (
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
                          <span className={styles.dialogueSessionTitle}>{item.title}</span>
                          <span className={styles.dialogueSessionTime}>{item.updatedAt}</span>
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
                ))
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
        {isSidebarCollapsed ? (
          <button
            type="button"
            className={styles.dialogueCollapsedAvatarButton}
            aria-label="展开对话侧栏"
            onClick={() => setIsSidebarCollapsed(false)}
          >
            <span className={styles.dialogueCollapsedAvatarWrap}>
              <Avatar
                src={activeEmployee.avatarUrl}
                size={40}
                className={styles.dialogueCollapsedAvatar}
              >
                {getAvatarText(activeEmployee.name)}
              </Avatar>
              <span
                className={classNames(styles.employeeStatusDot, styles.dialogueCollapsedAvatarDot, {
                  [styles.employeeStatusDotIdle]: activeEmployee.status === "idle",
                  [styles.employeeStatusDotBusy]: activeEmployee.status === "busy",
                  [styles.employeeStatusDotPending]:
                    activeEmployee.status === "pending" ||
                    activeEmployee.status === "paused" ||
                    activeEmployee.status === "draft",
                })}
              />
            </span>
          </button>
        ) : null}

        {isRuntimeFullscreen ? (
          renderCloudRuntimePanel()
        ) : (
          <>
            <div className={styles.dialogueViewToolbar}>
              <div className={styles.dialogueViewToolbarGroup}>
                {isCloudRuntime ? (
                  <button
                    type="button"
                    className={classNames(styles.dialogueViewButton, {
                      [styles.dialogueViewButtonActive]: showRuntimeSplitColumn,
                    })}
                    onClick={() => {
                      setDialogueViewMode("split");
                      setIsRuntimePanelOpen(true);
                    }}
                  >
                    <DesktopOutlined />
                    <span>设备</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className={classNames(styles.dialogueViewButton, {
                    [styles.dialogueViewButtonActive]: isArtifactsVisible,
                  })}
                  onClick={() => setIsArtifactsPanelOpen(open => !open)}
                >
                  <FolderOutlined />
                  <span>成果</span>
                </button>
              </div>
            </div>

            <div className={styles.dialogueStage}>
              <div className={styles.chatPanelBody}>
                <WorkspaceChatPanel
                  blocks={chatBlocks}
                  messages={chatMessages}
                  currentSessionId={activeDialogueSession?.id ?? activeEmployee.id}
                  isStreaming={isDialogueResponding}
                  assistantAvatarAlt={activeEmployee.name}
                  workspaceSummary={activeEmployee.summary}
                  greeting="输入消息或上传文件，开始协作"
                />
              </div>
            </div>

            <div className={styles.composerWrap}>
              <WorkspaceComposer
                rootClassName={styles.synclawComposer}
                value={dialogueInputValue}
                placeholder="输入消息或上传附件"
                attachments={dialogueAttachments}
                onRemoveAttachment={onRemoveAttachment}
                onAttachmentsSelected={onDialogueAttachmentsSelected}
                allowAttachmentOnlySend={true}
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
                multiple
                accept={CHAT_ATTACHMENT_ACCEPT_ATTR}
                onChange={handleFileInputChange}
              />
            </div>
          </>
        )}
      </section>

      {showRuntimeSplitColumn ? (
        <>
          <div
            className={styles.dialogueRuntimeResizeHandle}
            role="separator"
            aria-label="调整桌面面板宽度"
            aria-orientation="vertical"
            onMouseDown={handleRuntimeResizeStart}
          />
          <aside
            className={styles.dialogueRuntimeColumn}
            aria-label="云端桌面"
            ref={runtimeColumnRef}
            style={{
              width: `${resolvedRuntimePanelWidth}px`,
              minWidth: `${resolvedRuntimePanelWidth}px`,
            }}
          >
            {renderCloudRuntimePanel()}
          </aside>
        </>
      ) : null}

      {isArtifactsVisible ? (
        <aside className={styles.dialogueArtifactsCard}>
          <SynClawArtifactsPanel
            files={activeDialogueArtifacts}
            onClose={() => setIsArtifactsPanelOpen(false)}
            onDownloadFile={downloadArtifact}
            resolveFileUrl={resolveArtifactUrl}
          />
        </aside>
      ) : null}
    </div>
  );
};
