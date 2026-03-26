import classNames from "classnames";
import {
  CheckOutlined,
  ApiOutlined,
  CloseOutlined,
  CloudOutlined,
  FolderOutlined,
  LaptopOutlined,
  MenuFoldOutlined,
  MoreOutlined,
  PlusOutlined,
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

import type { ChatMessage, DialogueSessionItem, EmployeeItem } from "../types";
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
  allEmployees: EmployeeItem[];
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
}

/**
 * 对话视图。
 */
export const DialoguePrototypeView = ({
  activeEmployee,
  activeDialogueArtifacts,
  activeDialogueSession,
  allEmployees,
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
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState<string>("");
  const isArtifactsVisible = isArtifactsPanelOpen;

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

  const resolveRuntimeLabel = (employee: EmployeeItem): string => {
    if (employee.connectionMode === "cloud") return "云端";
    if (employee.connectionMode === "edge") return "边缘";
    return "本地";
  };

  const renderRuntimeIcon = (employee: EmployeeItem): JSX.Element => {
    if (employee.connectionMode === "cloud") return <CloudOutlined />;
    if (employee.connectionMode === "edge") return <ApiOutlined />;
    return <LaptopOutlined />;
  };

  return (
    <div
      className={classNames(styles.dialogueShell, {
        [styles.dialogueShellSidebarCollapsed]: isSidebarCollapsed,
        [styles.dialogueShellArtifactsHidden]: !isArtifactsVisible,
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

        <>
          <div className={styles.dialogueViewToolbar}>
            <div className={styles.dialogueViewToolbarGroup}>
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
      </section>

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
