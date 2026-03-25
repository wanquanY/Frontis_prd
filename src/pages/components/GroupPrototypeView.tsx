import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import {
  CloseOutlined,
  ColumnWidthOutlined,
  DesktopOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Input, Modal, Select, message } from "antd";
import classNames from "classnames";

import { CommonButton } from "@/components/CommonButton/CommonButton";
import { SynClawArtifactsPanel } from "@/pages/synclaw/components/SynClawArtifactsPanel";
import type { SynClawMemberItem } from "@/pages/synclaw/components/SynClawChatHeader";
import { SynClawSpaceTree } from "@/pages/synclaw/components/SynClawSpaceTree";
import { SynClawCreateChannelModal } from "@/pages/synclaw/components/modals/SynClawCreateChannelModal";
import { SynClawManageAgentsModal } from "@/pages/synclaw/components/modals/SynClawManageAgentsModal";
import type { SynClawArtifactItem, SynClawSpaceItem } from "@/pages/synclaw/types";
import { WorkspaceChatPanel } from "@/feature/workspace/components/WorkspaceChatPanel";
import { WorkspaceComposer } from "@/feature/workspace/components/WorkspaceComposer";
import { WorkspaceEmptyState } from "@/feature/workspace/components/WorkspaceEmptyState";
import {
  WORKSPACE_MODEL_OPTIONS,
  type WorkspaceComposerAttachmentItem,
  type WorkspaceComposerMentionOption,
} from "@/feature/workspace/types";
import {
  INITIAL_GROUP_AI_EMPLOYEES,
  INITIAL_GROUP_CHANNEL_AGENT_IDS,
  INITIAL_GROUP_CHANNEL_ARTIFACTS,
  INITIAL_GROUP_CHANNEL_MESSAGES,
  INITIAL_GROUP_CHANNEL_TENANT_MEMBERS,
  INITIAL_GROUP_SPACES,
  INITIAL_GROUP_TENANT_MEMBER_OPTIONS,
} from "@/mocks/mockData";
import type {
  CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem,
  CreateSynClawChannelPayload,
  SynClawAiEmployee,
  SynClawTenantMemberSelection,
} from "@/types/prdPrototype";
import { CHAT_ATTACHMENT_ACCEPT_ATTR, isChatAttachmentFileAllowed } from "@/utils/chatAttachmentFileTypes";
import { AddIcon, LayoutIcon } from "@/utils/icons";

import workspaceStyles from "@/pages/SynClawPage.module.less";

import { GroupChatHeader } from "./GroupChatHeader";
import {
  buildAttachmentItem,
  buildWorkspaceChatBlocks,
  buildWorkspaceChatMessages,
  createComposerAttachment,
  createId,
  downloadArtifact,
  resolveArtifactUrl,
  revokeComposerAttachmentPreview,
} from "../utils";
import type { ChatMessage } from "../types";
import styles from "../FrontisPage.module.less";

type GroupViewMode = "split" | "cloudspace";
type SpaceModalMode = "create" | "rename";
type ChannelModalMode = "create" | "rename";

const DEFAULT_SIDEBAR_WIDTH = 320;
const DEFAULT_RUNTIME_PANEL_WIDTH = 420;

const toMemberAvatarText = (name: string): string => Array.from(name.trim())[0] ?? "?";

const cloneSpaces = (): SynClawSpaceItem[] =>
  INITIAL_GROUP_SPACES.map(space => ({
    ...space,
    channels: space.channels.map(channel => ({ ...channel })),
  }));

const cloneMessages = (): Record<string, ChatMessage[]> =>
  Object.fromEntries(
    Object.entries(INITIAL_GROUP_CHANNEL_MESSAGES).map(([channelId, messages]) => [
      channelId,
      messages.map(item => ({
        ...item,
        attachments: item.attachments?.map(attachment => ({ ...attachment })),
        blocks: item.blocks ? JSON.parse(JSON.stringify(item.blocks)) : undefined,
      })),
    ]),
  );

const cloneArtifacts = (): Record<string, SynClawArtifactItem[]> =>
  Object.fromEntries(
    Object.entries(INITIAL_GROUP_CHANNEL_ARTIFACTS).map(([channelId, files]) => [
      channelId,
      files.map(file => ({ ...file })),
    ]),
  );

const cloneAgentIds = (): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(INITIAL_GROUP_CHANNEL_AGENT_IDS).map(([channelId, agentIds]) => [
      channelId,
      [...agentIds],
    ]),
  );

const cloneTenantMembers = (): Record<string, SynClawTenantMemberSelection[]> =>
  Object.fromEntries(
    Object.entries(INITIAL_GROUP_CHANNEL_TENANT_MEMBERS).map(([channelId, members]) => [
      channelId,
      members.map(item => ({ ...item })),
    ]),
  );

const buildRuntimeStatusMap = (
  spaces: SynClawSpaceItem[],
  aiEmployees: SynClawAiEmployee[],
  channelAgentIds: Record<string, string[]>,
  activeChannelId?: string,
): Record<string, CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem> => {
  const employeeMap = new Map(aiEmployees.map(item => [item.id, item]));
  const result: Record<string, CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem> = {};

  spaces.forEach(space => {
    space.channels.forEach(channel => {
      const selectedAgents = (channelAgentIds[channel.id] ?? [])
        .map(agentId => employeeMap.get(agentId))
        .filter((item): item is SynClawAiEmployee => Boolean(item));
      const agents = selectedAgents.map(item => ({
        channelId: channel.id,
        agentId: item.id,
        displayName: item.name,
        avatarUrl: item.avatarUrl,
        runtimeAgentId: item.runtimeAgentId,
        runtimeAgentStatus: item.remoteStatus ?? undefined,
        isWorkingHere: channel.id === activeChannelId,
        isBusyElsewhere: channel.id !== activeChannelId,
      }));
      result[channel.id] = {
        channelId: channel.id,
        channelName: channel.name,
        agentCount: agents.length,
        workingHereCount: channel.id === activeChannelId ? agents.length : 0,
        busy: channel.id === activeChannelId && agents.length > 0,
        agents,
      };
    });
  });

  return result;
};

const resolveChannelTitle = (spaces: SynClawSpaceItem[], channelId?: string): string => {
  if (!channelId) return "";
  for (const space of spaces) {
    const found = space.channels.find(item => item.id === channelId);
    if (found) return found.name;
  }
  return "";
};

const resolveChannelMembers = (
  channelId: string | undefined,
  aiEmployees: SynClawAiEmployee[],
  channelAgentIds: Record<string, string[]>,
  tenantMembersByChannel: Record<string, SynClawTenantMemberSelection[]>,
): SynClawMemberItem[] => {
  if (!channelId) return [];
  const aiEmployeeMap = new Map(aiEmployees.map(item => [item.id, item]));
  const humanMembers = (tenantMembersByChannel[channelId] ?? []).map(item => {
    const option = INITIAL_GROUP_TENANT_MEMBER_OPTIONS.find(candidate => candidate.id === item.identityId);
    return {
      id: item.identityId,
      name: option?.name ?? item.identityId,
      kind: "human" as const,
      status: "online" as const,
      avatarText: toMemberAvatarText(option?.name ?? item.identityId),
      accessRole: item.accessRole,
    };
  });
  const aiMembers = (channelAgentIds[channelId] ?? []).map(agentId => {
    const employee = aiEmployeeMap.get(agentId);
    return {
      id: agentId,
      name: employee?.name ?? `AI ${agentId}`,
      kind: "ai" as const,
      status: "online" as const,
      avatarUrl: employee?.avatarUrl,
      accessRole: "speaker" as const,
    };
  });
  return [...humanMembers, ...aiMembers];
};

export const GroupPrototypeView = (): JSX.Element => {
  const [spaces, setSpaces] = useState<SynClawSpaceItem[]>(cloneSpaces);
  const [channelMessages, setChannelMessages] = useState<Record<string, ChatMessage[]>>(cloneMessages);
  const [channelArtifacts, setChannelArtifacts] = useState<Record<string, SynClawArtifactItem[]>>(cloneArtifacts);
  const [channelAgentIds, setChannelAgentIds] = useState<Record<string, string[]>>(cloneAgentIds);
  const [tenantMembersByChannel, setTenantMembersByChannel] = useState<Record<string, SynClawTenantMemberSelection[]>>(cloneTenantMembers);
  const [activeSpaceId, setActiveSpaceId] = useState<string>(INITIAL_GROUP_SPACES[0]?.id ?? "");
  const [activeChannelId, setActiveChannelId] = useState<string | undefined>(
    INITIAL_GROUP_SPACES[0]?.channels[0]?.id,
  );
  const [expandedSpaceIds, setExpandedSpaceIds] = useState<Set<string>>(
    () => new Set(INITIAL_GROUP_SPACES.map(item => item.id)),
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [sidebarWidth] = useState<number>(DEFAULT_SIDEBAR_WIDTH);
  const [runtimePanelWidth] = useState<number>(DEFAULT_RUNTIME_PANEL_WIDTH);
  const [groupViewMode, setGroupViewMode] = useState<GroupViewMode>("split");
  const [isRuntimePanelOpen, setIsRuntimePanelOpen] = useState<boolean>(true);
  const [runtimeRefreshKey, setRuntimeRefreshKey] = useState<number>(0);
  const [isArtifactsPanelOpen, setIsArtifactsPanelOpen] = useState<boolean>(true);
  const [selectedModelId, setSelectedModelId] = useState<number>(WORKSPACE_MODEL_OPTIONS[0]?.id ?? 1);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState<boolean>(false);
  const [chatInputValue, setChatInputValue] = useState<string>("");
  const [composerAttachments, setComposerAttachments] = useState<WorkspaceComposerAttachmentItem[]>([]);
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const [spaceModalMode, setSpaceModalMode] = useState<SpaceModalMode>("create");
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState<boolean>(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string>();
  const [spaceName, setSpaceName] = useState<string>("");
  const [channelModalMode, setChannelModalMode] = useState<ChannelModalMode>("create");
  const [isChannelModalOpen, setIsChannelModalOpen] = useState<boolean>(false);
  const [editingChannelId, setEditingChannelId] = useState<string>();
  const [editingChannelSpaceId, setEditingChannelSpaceId] = useState<string>();
  const [isManageAgentsModalOpen, setIsManageAgentsModalOpen] = useState<boolean>(false);
  const [activeRuntimeAgentId, setActiveRuntimeAgentId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const responseTimerRef = useRef<number | null>(null);

  const activeSpace = useMemo(
    () => spaces.find(item => item.id === activeSpaceId) ?? spaces[0],
    [activeSpaceId, spaces],
  );
  const activeChannelTitle = useMemo(
    () => resolveChannelTitle(spaces, activeChannelId),
    [activeChannelId, spaces],
  );
  const activeMessages = activeChannelId ? channelMessages[activeChannelId] ?? [] : [];
  const renderedChatBlocks = useMemo(() => buildWorkspaceChatBlocks(activeMessages), [activeMessages]);
  const renderedChatMessages = useMemo(() => buildWorkspaceChatMessages(activeMessages), [activeMessages]);
  const spaceMembers = useMemo(
    () =>
      resolveChannelMembers(
        activeChannelId,
        INITIAL_GROUP_AI_EMPLOYEES,
        channelAgentIds,
        tenantMembersByChannel,
      ),
    [activeChannelId, channelAgentIds, tenantMembersByChannel],
  );
  const composerMentionOptions = useMemo<WorkspaceComposerMentionOption[]>(() => {
    return INITIAL_GROUP_AI_EMPLOYEES.map(item => ({
      id: item.id,
      label: item.name,
      mentionLabel: item.name,
      avatarUrl: item.avatarUrl,
      kind: "ai",
    }));
  }, []);
  const actorAvatars = useMemo(
    () =>
      Object.fromEntries(
        INITIAL_GROUP_AI_EMPLOYEES.map(item => [item.name, item.avatarUrl ?? ""]),
      ),
    [],
  );
  const mentionableActorLabels = useMemo(
    () => INITIAL_GROUP_AI_EMPLOYEES.map(item => item.name),
    [],
  );
  const channelRuntimeStatusById = useMemo(
    () => buildRuntimeStatusMap(spaces, INITIAL_GROUP_AI_EMPLOYEES, channelAgentIds, activeChannelId),
    [activeChannelId, channelAgentIds, spaces],
  );
  const cloudRuntimeAgents = useMemo(
    () =>
      (channelAgentIds[activeChannelId ?? ""] ?? [])
        .map(agentId => INITIAL_GROUP_AI_EMPLOYEES.find(item => item.id === agentId))
        .filter(
          (item): item is SynClawAiEmployee => Boolean(item && item.runtimeId?.startsWith("runtime-cloud")),
        ),
    [activeChannelId, channelAgentIds],
  );
  const activeRuntimeAgent = useMemo(
    () => cloudRuntimeAgents.find(item => item.id === activeRuntimeAgentId) ?? cloudRuntimeAgents[0],
    [activeRuntimeAgentId, cloudRuntimeAgents],
  );
  const modelLabel = useMemo(
    () => WORKSPACE_MODEL_OPTIONS.find(option => option.id === selectedModelId)?.label ?? WORKSPACE_MODEL_OPTIONS[0]?.label ?? "",
    [selectedModelId],
  );

  useEffect(() => {
    if (cloudRuntimeAgents.some(item => item.id === activeRuntimeAgentId)) return;
    setActiveRuntimeAgentId(cloudRuntimeAgents[0]?.id ?? "");
  }, [activeRuntimeAgentId, cloudRuntimeAgents]);

  useEffect(() => {
    return () => {
      if (responseTimerRef.current !== null) {
        window.clearTimeout(responseTimerRef.current);
      }
      composerAttachments.forEach(revokeComposerAttachmentPreview);
    };
  }, [composerAttachments]);

  useEffect(() => {
    if (!activeSpace) {
      setActiveChannelId(undefined);
      return;
    }
    if (activeSpace.channels.some(item => item.id === activeChannelId)) return;
    setActiveChannelId(activeSpace.channels[0]?.id);
  }, [activeChannelId, activeSpace]);

  const handleToggleSpace = useCallback((spaceId: string): void => {
    setExpandedSpaceIds(prev => {
      const next = new Set(prev);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return next;
    });
  }, []);

  const handleSelectSpace = useCallback((spaceId: string): void => {
    const targetSpace = spaces.find(item => item.id === spaceId);
    if (!targetSpace) return;
    setActiveSpaceId(spaceId);
    setActiveChannelId(targetSpace.channels[0]?.id);
    setExpandedSpaceIds(prev => new Set(prev).add(spaceId));
  }, [spaces]);

  const handleSelectChannel = useCallback((spaceId: string, channelId: string): void => {
    setActiveSpaceId(spaceId);
    setActiveChannelId(channelId);
  }, []);

  const handleCreateSpace = useCallback((): void => {
    setSpaceModalMode("create");
    setEditingSpaceId(undefined);
    setSpaceName("");
    setIsSpaceModalOpen(true);
  }, []);

  const handleRenameSpace = useCallback((spaceId: string, currentSpaceName: string): void => {
    setSpaceModalMode("rename");
    setEditingSpaceId(spaceId);
    setSpaceName(currentSpaceName);
    setIsSpaceModalOpen(true);
  }, []);

  const handleSubmitSpace = useCallback((): void => {
    const nextName = spaceName.trim();
    if (!nextName) {
      message.warning("请输入空间名称");
      return;
    }
    if (spaceModalMode === "rename" && editingSpaceId) {
      setSpaces(prev =>
        prev.map(item => (item.id === editingSpaceId ? { ...item, name: nextName } : item)),
      );
      message.success("空间已更新");
    } else {
      const nextSpaceId = createId("space");
      setSpaces(prev => [
        ...prev,
        {
          id: nextSpaceId,
          name: nextName,
          channels: [],
        },
      ]);
      setExpandedSpaceIds(prev => new Set(prev).add(nextSpaceId));
      setActiveSpaceId(nextSpaceId);
      message.success("空间已创建");
    }
    setIsSpaceModalOpen(false);
  }, [editingSpaceId, spaceModalMode, spaceName]);

  const handleDeleteSpace = useCallback((spaceId: string, currentSpaceName: string): void => {
    Modal.confirm({
      title: "删除空间",
      content: `确认删除空间「${currentSpaceName}」吗？`,
      centered: true,
      okButtonProps: { danger: true },
      onOk: () => {
        setSpaces(prev => prev.filter(item => item.id !== spaceId));
        setExpandedSpaceIds(prev => {
          const next = new Set(prev);
          next.delete(spaceId);
          return next;
        });
        if (activeSpaceId === spaceId) {
          const fallbackSpace = spaces.find(item => item.id !== spaceId);
          setActiveSpaceId(fallbackSpace?.id ?? "");
          setActiveChannelId(fallbackSpace?.channels[0]?.id);
        }
        message.success("空间已删除");
      },
    });
  }, [activeSpaceId, spaces]);

  const handleOpenCreateChannel = useCallback((spaceId: string): void => {
    setChannelModalMode("create");
    setEditingChannelId(undefined);
    setEditingChannelSpaceId(spaceId);
    setIsChannelModalOpen(true);
  }, []);

  const handleRenameChannel = useCallback((spaceId: string, channelId: string): void => {
    setChannelModalMode("rename");
    setEditingChannelId(channelId);
    setEditingChannelSpaceId(spaceId);
    setIsChannelModalOpen(true);
  }, []);

  const handleDeleteChannel = useCallback((spaceId: string, channelId: string, channelName: string): void => {
    Modal.confirm({
      title: "删除频道",
      content: `确认删除频道「${channelName}」吗？`,
      centered: true,
      okButtonProps: { danger: true },
      onOk: () => {
        setSpaces(prev =>
          prev.map(space =>
            space.id === spaceId
              ? { ...space, channels: space.channels.filter(channel => channel.id !== channelId) }
              : space,
          ),
        );
        if (activeChannelId === channelId) {
          const nextSpace = spaces.find(space => space.id === spaceId);
          const fallbackChannel = nextSpace?.channels.find(channel => channel.id !== channelId);
          setActiveChannelId(fallbackChannel?.id);
        }
        message.success("频道已删除");
      },
    });
  }, [activeChannelId, spaces]);

  const handleChannelModalSubmit = useCallback((payload: CreateSynClawChannelPayload): void => {
    if (!payload.channelName.trim()) {
      message.warning("请输入频道名称");
      return;
    }
    if (channelModalMode === "rename" && editingChannelId && editingChannelSpaceId) {
      setSpaces(prev =>
        prev.map(space =>
          space.id === editingChannelSpaceId
            ? {
                ...space,
                channels: space.channels.map(channel =>
                  channel.id === editingChannelId
                    ? { ...channel, name: payload.channelName.trim() }
                    : channel,
                ),
              }
            : space,
        ),
      );
      setChannelAgentIds(prev => ({ ...prev, [editingChannelId]: [...payload.aiEmployeeIds] }));
      setTenantMembersByChannel(prev => ({
        ...prev,
        [editingChannelId]: payload.tenantMembers.map(item => ({ ...item })),
      }));
      message.success("频道已更新");
    } else {
      const nextChannelId = createId("channel");
      setSpaces(prev =>
        prev.map(space =>
          space.id === payload.spaceId
            ? {
                ...space,
                channels: [
                  ...space.channels,
                  { id: nextChannelId, name: payload.channelName.trim() },
                ],
              }
            : space,
        ),
      );
      setChannelMessages(prev => ({ ...prev, [nextChannelId]: [] }));
      setChannelArtifacts(prev => ({ ...prev, [nextChannelId]: [] }));
      setChannelAgentIds(prev => ({ ...prev, [nextChannelId]: [...payload.aiEmployeeIds] }));
      setTenantMembersByChannel(prev => ({
        ...prev,
        [nextChannelId]: payload.tenantMembers.map(item => ({ ...item })),
      }));
      setActiveSpaceId(payload.spaceId);
      setActiveChannelId(nextChannelId);
      setExpandedSpaceIds(prev => new Set(prev).add(payload.spaceId));
      message.success("频道已创建");
    }
    setIsChannelModalOpen(false);
  }, [channelModalMode, editingChannelId, editingChannelSpaceId]);

  const handleSendChat = useCallback((): void => {
    if (!activeChannelId) return;
    const content = chatInputValue.trim();
    if (!content && composerAttachments.length === 0) return;
    const attachments = composerAttachments.map(buildAttachmentItem);
    const nextUserMessage: ChatMessage = {
      id: createId("group-user"),
      role: "user",
      author: "你",
      content,
      timeLabel: "刚刚",
      attachments: attachments.length ? attachments : undefined,
    };
    setChannelMessages(prev => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] ?? []), nextUserMessage],
    }));
    setChatInputValue("");
    setComposerAttachments(prev => {
      prev.forEach(revokeComposerAttachmentPreview);
      return [];
    });
    setIsSendingChat(true);
    if (responseTimerRef.current !== null) {
      window.clearTimeout(responseTimerRef.current);
    }
    responseTimerRef.current = window.setTimeout(() => {
      const responder =
        INITIAL_GROUP_AI_EMPLOYEES.find(item => item.id === (channelAgentIds[activeChannelId]?.[0] ?? "")) ??
        INITIAL_GROUP_AI_EMPLOYEES[0];
      const reply: ChatMessage = {
        id: createId("group-assistant"),
        role: "assistant",
        author: responder?.name ?? "产品策略官",
        content:
          content.length > 32
            ? `已收到长文本内容，我会先按频道上下文整理重点，再把结果回写到成果面板。`
            : `已同步「${content || "附件内容"}」到当前频道，后续会继续输出结构化结果。`,
        timeLabel: "刚刚",
      };
      setChannelMessages(prev => ({
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] ?? []), reply],
      }));
      setIsSendingChat(false);
      responseTimerRef.current = null;
    }, 520);
  }, [activeChannelId, channelAgentIds, chatInputValue, composerAttachments]);

  const handleComposerKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendChat();
    }
  }, [handleSendChat]);

  const handleComposerAttachmentsSelected = useCallback((files?: FileList | File[] | null): void => {
    const nextItems = Array.from(files ?? []).reduce<WorkspaceComposerAttachmentItem[]>((result, file) => {
      if (!isChatAttachmentFileAllowed(file)) return result;
      result.push(createComposerAttachment(file));
      return result;
    }, []);
    if (!nextItems.length) return;
    setComposerAttachments(prev => [...prev, ...nextItems]);
  }, []);

  const handleRemoveComposerAttachment = useCallback((uid: string): void => {
    setComposerAttachments(prev => {
      const target = prev.find(item => item.uid === uid);
      if (target) {
        revokeComposerAttachmentPreview(target);
      }
      return prev.filter(item => item.uid !== uid);
    });
  }, []);

  const handleInsertActorMention = useCallback((name: string): void => {
    setChatInputValue(prev => `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}@${name} `);
  }, []);

  const handleSubmitManageAgents = useCallback((payload: { agentIds: string[]; tenantMembers: SynClawTenantMemberSelection[] }): void => {
    if (!activeChannelId) return;
    setChannelAgentIds(prev => ({ ...prev, [activeChannelId]: [...payload.agentIds] }));
    setTenantMembersByChannel(prev => ({
      ...prev,
      [activeChannelId]: payload.tenantMembers.map(item => ({ ...item })),
    }));
    setIsManageAgentsModalOpen(false);
    message.success("频道成员已更新");
  }, [activeChannelId]);

  const showArtifactsColumn = Boolean(activeChannelId && isArtifactsPanelOpen && groupViewMode !== "cloudspace");
  const showRuntimeSplitColumn = Boolean(activeChannelId && cloudRuntimeAgents.length > 0 && isRuntimePanelOpen && groupViewMode === "split");
  const isRuntimeFullscreen = Boolean(activeChannelId && cloudRuntimeAgents.length > 0 && groupViewMode === "cloudspace");

  const renderRuntimePanel = (): JSX.Element | null => {
    if (!activeRuntimeAgent) return null;
    const sameRuntimeAgents = cloudRuntimeAgents.filter(item => item.runtimeId === activeRuntimeAgent.runtimeId);

    return (
      <div className={classNames(styles.dialogueRuntimePanel, { [styles.dialogueRuntimePanelFull]: groupViewMode === "cloudspace" })}>
        <div className={styles.groupRuntimePanelHeader}>
          <div className={styles.groupRuntimePanelToolbar}>
            <div className={styles.groupRuntimeAgentSelectWrap}>
              <Select<string>
                value={activeRuntimeAgent.id}
                className={styles.groupRuntimeAgentSelect}
                popupClassName={styles.groupRuntimeAgentSelectPopup}
                options={cloudRuntimeAgents.map(item => ({ value: item.id, label: item.name }))}
                onChange={setActiveRuntimeAgentId}
              />
            </div>
            <div className={styles.groupRuntimeViewControls}>
              <button
                type="button"
                className={classNames(styles.groupRuntimeOverlayButton, {
                  [styles.groupRuntimeOverlayButtonActive]: groupViewMode === "split",
                })}
                onClick={() => setGroupViewMode("split")}
              >
                <ColumnWidthOutlined />
                <span>分屏</span>
              </button>
              <button
                type="button"
                className={classNames(styles.groupRuntimeOverlayButton, {
                  [styles.groupRuntimeOverlayButtonActive]: groupViewMode === "cloudspace",
                })}
                onClick={() => setGroupViewMode("cloudspace")}
              >
                <DesktopOutlined />
                <span>全屏</span>
              </button>
              <button
                type="button"
                className={styles.groupRuntimeOverlayIconButton}
                onClick={() => setRuntimeRefreshKey(prev => prev + 1)}
                aria-label="刷新设备面板"
              >
                <ReloadOutlined />
              </button>
              {groupViewMode === "split" ? (
                <button
                  type="button"
                  className={styles.groupRuntimeOverlayIconButton}
                  onClick={() => setIsRuntimePanelOpen(false)}
                  aria-label="关闭设备面板"
                >
                  <CloseOutlined />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.groupRuntimePanelBody}>
          <div key={`${activeRuntimeAgent.id}-${runtimeRefreshKey}`} className={styles.groupRuntimeDesktopWindow}>
            <div className={styles.groupRuntimeDesktopHeader}>
              <div className={styles.groupRuntimeDesktopDots} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className={styles.groupRuntimeDesktopHeaderTitle}>
                {activeChannelTitle || "当前频道"} · {activeRuntimeAgent.runtimeName}
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
                  <span className={styles.groupRuntimeDesktopBadge}>当前查看：{activeRuntimeAgent.name}</span>
                  <span className={styles.groupRuntimeDesktopBadge}>
                    {sameRuntimeAgents.length > 1 ? `共享设备 · ${sameRuntimeAgents.length} 个 Agent` : "独立设备"}
                  </span>
                </div>
                <div className={styles.groupRuntimeDesktopMainWindow}>
                  <div className={styles.groupRuntimeDesktopWindowBar}>
                    <span className={styles.groupRuntimeDesktopWindowTitle}>浏览器任务面板</span>
                    <span className={styles.groupRuntimeDesktopWindowMeta}>设备与频道上下文持续同步</span>
                  </div>
                  <div className={styles.groupRuntimeDesktopScene}>
                    <div className={styles.groupRuntimeDesktopHeroCard}>
                      <span className={styles.groupRuntimeDesktopLabel}>当前设备</span>
                      <span className={styles.groupRuntimeDesktopValue}>{activeRuntimeAgent.runtimeName}</span>
                      <span className={styles.groupRuntimeDesktopText}>当前展示为纯原型桌面，用于承载云端设备视图与频道协作关系。</span>
                    </div>
                    <div className={styles.groupRuntimeDesktopGrid}>
                      <div className={styles.groupRuntimeDesktopCard}>网页检索</div>
                      <div className={styles.groupRuntimeDesktopCard}>资料整理</div>
                      <div className={styles.groupRuntimeDesktopCard}>文件回传</div>
                      <div className={styles.groupRuntimeDesktopCard}>
                        {sameRuntimeAgents.length > 1
                          ? `协作 Agent：${sameRuntimeAgents.map(item => item.name).join(" / ")}`
                          : "当前无其他协作 Agent"}
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
  };

  return (
    <div className={workspaceStyles.workspaceLayout} aria-label="PRD 群聊工作区">
      <aside
        className={classNames(workspaceStyles.leftPanel, {
          [workspaceStyles.leftPanelCollapsed]: isSidebarCollapsed,
        })}
        ref={null}
        style={{
          width: `${isSidebarCollapsed ? 72 : sidebarWidth}px`,
          minWidth: `${isSidebarCollapsed ? 72 : sidebarWidth}px`,
        }}
      >
        {isSidebarCollapsed ? (
          <div className={workspaceStyles.leftPanelCollapsedBox}>
            <button
              type="button"
              className={workspaceStyles.leftPanelCollapsedButton}
              onClick={() => setIsSidebarCollapsed(false)}
              aria-label="展开空间与频道列表"
            >
              <LayoutIcon className={workspaceStyles.leftPanelCollapsedIcon} />
            </button>
          </div>
        ) : (
          <>
            <div className={workspaceStyles.leftPanelHeader}>
              <div className={workspaceStyles.leftPanelTitle}>空间与频道</div>
              <div className={workspaceStyles.leftPanelHeaderActions}>
                <button
                  type="button"
                  className={workspaceStyles.leftPanelCollapseButton}
                  onClick={() => setIsSidebarCollapsed(true)}
                  aria-label="收起空间与频道列表"
                >
                  <LayoutIcon className={workspaceStyles.leftPanelCollapseIcon} />
                </button>
              </div>
            </div>
            <div className={workspaceStyles.leftPanelDivider} />
            <div className={workspaceStyles.leftPanelContent}>
              <SynClawSpaceTree
                spaces={spaces}
                expandedSpaceIds={expandedSpaceIds}
                activeSpaceId={activeSpaceId}
                activeChannelId={activeChannelId}
                channelRuntimeStatusById={channelRuntimeStatusById}
                onToggleSpace={handleToggleSpace}
                onSelectSpace={handleSelectSpace}
                onCreateSpace={handleCreateSpace}
                onSelectChannel={handleSelectChannel}
                onAddChannel={handleOpenCreateChannel}
                onRenameSpace={handleRenameSpace}
                onDeleteSpace={handleDeleteSpace}
                onRenameChannel={handleRenameChannel}
                onDeleteChannel={handleDeleteChannel}
              />
            </div>
          </>
        )}
      </aside>

      <section className={workspaceStyles.rightPanel} aria-label="工作空间">
        {activeChannelId ? (
          <div className={workspaceStyles.chatMainColumn}>
            {isRuntimeFullscreen ? (
              renderRuntimePanel()
            ) : (
              <>
                <GroupChatHeader
                  title={activeChannelTitle}
                  members={spaceMembers}
                  onManageMembers={() => setIsManageAgentsModalOpen(true)}
                  onOpenFolder={() => setIsArtifactsPanelOpen(true)}
                  onOpenDevice={
                    cloudRuntimeAgents.length > 0
                      ? () => {
                          setGroupViewMode("split");
                          setIsRuntimePanelOpen(true);
                        }
                      : undefined
                  }
                  isDeviceActive={showRuntimeSplitColumn}
                />

                <div className={styles.dialogueStage}>
                  <div className={workspaceStyles.chatPanelWrap} aria-label="对话区">
                    <WorkspaceChatPanel
                      blocks={renderedChatBlocks}
                      messages={renderedChatMessages}
                      currentSessionId={activeChannelId}
                      actorAvatars={actorAvatars}
                      mentionableActorLabels={mentionableActorLabels}
                      isStreaming={isSendingChat}
                      isHistoryLoading={false}
                      showMessageMeta={true}
                      showStreamingPlaceholder={false}
                      onActorNameClick={handleInsertActorMention}
                    />
                  </div>
                </div>

                <div className={workspaceStyles.composerWrap} aria-label="输入区">
                  <WorkspaceComposer
                    rootClassName={workspaceStyles.synclawComposer}
                    value={chatInputValue}
                    placeholder="输入消息或上传附件"
                    mentionOptions={composerMentionOptions}
                    attachments={composerAttachments}
                    allowAttachmentOnlySend={true}
                    sending={isSendingChat}
                    showModelSelector={false}
                    sendDisabled={false}
                    modelLabel={modelLabel}
                    selectedModelId={selectedModelId}
                    modelMenuOpen={isModelMenuOpen}
                    modelOptions={WORKSPACE_MODEL_OPTIONS}
                    isChatPage={true}
                    onValueChange={setChatInputValue}
                    onKeyDown={handleComposerKeyDown}
                    onAttach={() => fileInputRef.current?.click()}
                    onRemoveAttachment={handleRemoveComposerAttachment}
                    onAttachmentsSelected={handleComposerAttachmentsSelected}
                    onToggleModelMenu={() => setIsModelMenuOpen(open => !open)}
                    onCloseModelMenu={() => setIsModelMenuOpen(false)}
                    onSelectModel={setSelectedModelId}
                    onSend={handleSendChat}
                    onAbort={async () => {
                      if (responseTimerRef.current !== null) {
                        window.clearTimeout(responseTimerRef.current);
                        responseTimerRef.current = null;
                      }
                      setIsSendingChat(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className={workspaceStyles.rightContent}>
            <WorkspaceEmptyState
              title="创建工作空间"
              subtitle="与 AI 伙伴一起，让你的想法快速落地为成果"
              showGuides={false}
              actionLabel="创建工作空间"
              onActionClick={handleCreateSpace}
            />
          </div>
        )}

        <input
          ref={fileInputRef}
          className={workspaceStyles.hiddenInput}
          type="file"
          multiple={true}
          accept={CHAT_ATTACHMENT_ACCEPT_ATTR}
          onChange={event => {
            handleComposerAttachmentsSelected(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
      </section>

      {showRuntimeSplitColumn ? (
        <aside
          className={styles.groupRuntimeColumn}
          style={{ width: `${runtimePanelWidth}px`, minWidth: `${runtimePanelWidth}px` }}
        >
          {renderRuntimePanel()}
        </aside>
      ) : null}

      {showArtifactsColumn ? (
        <aside className={workspaceStyles.artifactsColumn} style={{ width: "360px", minWidth: "360px" }}>
          <SynClawArtifactsPanel
            files={activeChannelId ? channelArtifacts[activeChannelId] ?? [] : []}
            loading={false}
            error=""
            onClose={() => setIsArtifactsPanelOpen(false)}
            onDownloadFile={downloadArtifact}
            resolveFileUrl={resolveArtifactUrl}
          />
        </aside>
      ) : null}

      <Modal
        open={isSpaceModalOpen}
        title={spaceModalMode === "rename" ? "编辑空间" : "新建空间"}
        onCancel={() => setIsSpaceModalOpen(false)}
        onOk={handleSubmitSpace}
        destroyOnHidden={true}
      >
        <Input value={spaceName} placeholder="请输入空间名称" onChange={event => setSpaceName(event.target.value)} />
      </Modal>

      <SynClawCreateChannelModal
        styles={workspaceStyles}
        mode={channelModalMode}
        open={isChannelModalOpen}
        spaces={spaces}
        aiEmployees={INITIAL_GROUP_AI_EMPLOYEES}
        tenantEmployees={INITIAL_GROUP_TENANT_MEMBER_OPTIONS}
        defaultSpaceId={editingChannelSpaceId ?? activeSpaceId}
        initialChannelName={
          channelModalMode === "rename" && editingChannelId
            ? resolveChannelTitle(spaces, editingChannelId)
            : ""
        }
        initialAiEmployeeIds={editingChannelId ? channelAgentIds[editingChannelId] ?? [] : []}
        initialTenantMembers={editingChannelId ? tenantMembersByChannel[editingChannelId] ?? [] : []}
        onCancel={() => setIsChannelModalOpen(false)}
        onSubmit={handleChannelModalSubmit}
      />

      <SynClawManageAgentsModal
        styles={workspaceStyles}
        open={isManageAgentsModalOpen}
        aiEmployees={INITIAL_GROUP_AI_EMPLOYEES}
        selectedAgentIds={activeChannelId ? channelAgentIds[activeChannelId] ?? [] : []}
        tenantEmployees={INITIAL_GROUP_TENANT_MEMBER_OPTIONS}
        selectedTenantMembers={activeChannelId ? tenantMembersByChannel[activeChannelId] ?? [] : []}
        onCancel={() => setIsManageAgentsModalOpen(false)}
        onSubmit={handleSubmitManageAgents}
      />
    </div>
  );
};
