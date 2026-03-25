import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

import {
  CloseOutlined,
  ColumnWidthOutlined,
  DesktopOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { App as AntdApp, Input, Modal, Select, message } from "antd";
import classNames from "classnames";

import { getAdminAiEmployeeList } from "@/apis/AdminAiEmployeeApi";
import {
  createCoworkerChannelArtifactDownloadUrl,
  getCoworkerChannelSpaceChannelAgentRuntimeStatuses,
  type CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem,
} from "@/apis/CoworkerChannelApi";
import { getStorageSTS } from "@/apis/FileApi";
import { CommonButton } from "@/components/CommonButton/CommonButton";
import { SynClawArtifactsPanel } from "@/feature/synclaw/components/SynClawArtifactsPanel";
import { SynClawSpaceTree } from "@/feature/synclaw/components/SynClawSpaceTree";
import { SynClawCreateChannelModal } from "@/feature/synclaw/components/modals/SynClawCreateChannelModal";
import { SynClawManageAgentsModal } from "@/feature/synclaw/components/modals/SynClawManageAgentsModal";
import { useSynClawArtifactsPanelState } from "@/feature/synclaw/hooks/useSynClawArtifactsPanelState";
import { useSynClawChannelManagement } from "@/feature/synclaw/hooks/useSynClawChannelManagement";
import { useSynClawChannelRuntime } from "@/feature/synclaw/hooks/useSynClawChannelRuntime";
import { useCoworkerChannelArtifactsPanel } from "@/feature/synclaw/hooks/useCoworkerChannelArtifactsPanel";
import { useSynClawWorkspace } from "@/feature/synclaw/hooks/useSynClawWorkspace";
import type { SynClawArtifactItem } from "@/feature/synclaw/types";
import type { SynClawAiEmployee } from "@/feature/synclaw/types/page";
import {
  DEFAULT_CHAT_MESSAGES,
  EMPTY_SYNCLAW_SPACES,
  FIRST_SPACE_NAV_HINT_LABEL,
  FIRST_SPACE_NAV_HINT_STORAGE_KEY,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SYNCLAW_SIDEBAR_COLLAPSED_KEY,
  SYNCLAW_SIDEBAR_WIDTH_KEY,
  resolveAiEmployeeDisabledReason,
} from "@/feature/synclaw/utils/pageHelpers";
import { buildSynClawSpaceAvatarMeta } from "@/feature/synclaw/utils/spaceAvatar";
import { WorkspaceChatPanel } from "@/feature/workspace/components/WorkspaceChatPanel";
import { WorkspaceComposer } from "@/feature/workspace/components/WorkspaceComposer";
import { WorkspaceEmptyState } from "@/feature/workspace/components/WorkspaceEmptyState";
import { WORKSPACE_MODEL_OPTIONS } from "@/feature/workspace/types";
import type { WorkspaceModelId } from "@/feature/workspace/types";
import { useAuthStore } from "@/store/auth";
import { useHomeStore } from "@/store/home";
import { CHAT_ATTACHMENT_ACCEPT_ATTR } from "@/utils/chatAttachmentFileTypes";
import { AddIcon, LayoutIcon } from "@/utils/icons";
import { uploadToTencentCloud } from "@/utils/tencentUpload";

import workspaceStyles from "@/pages/synclaw/SynClawPage.module.less";

import { PrdGroupChatHeader } from "./PrdGroupChatHeader";
import styles from "../PrdPage.module.less";

const MAX_SPACE_COVER_SIZE = 5 * 1024 * 1024;
const GROUP_RUNTIME_PANEL_WIDTH_KEY = "prd-group-runtime-panel-width";
const GROUP_RUNTIME_PANEL_DEFAULT_WIDTH = 420;
const GROUP_RUNTIME_PANEL_MIN_WIDTH = 320;
const GROUP_RUNTIME_PANEL_MAX_WIDTH = 680;

type GroupViewMode = "split" | "cloudspace";

interface GroupRuntimeAgentItem {
  id: string;
  name: string;
  avatarUrl?: string;
  runtimeId: string;
  runtimeName: string;
  runtimeAgentId?: string;
}

interface GroupRuntimeDeviceItem {
  key: string;
  runtimeId: string;
  runtimeName: string;
  agents: GroupRuntimeAgentItem[];
}

const isCanceledRequestError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === "AbortError" || error.name === "CanceledError") {
    return true;
  }
  return "code" in error && error.code === "ERR_CANCELED";
};

const validateSpaceCoverFile = (file: File): void => {
  if (!file.type.startsWith("image/")) {
    throw new Error("仅支持上传图片格式的空间封面");
  }
  if (file.size > MAX_SPACE_COVER_SIZE) {
    throw new Error("空间封面大小不能超过 5MB");
  }
};

const normalizeRuntimeAiEmployees = (
  items: Awaited<ReturnType<typeof getAdminAiEmployeeList>>["items"],
): SynClawAiEmployee[] => {
  const dedupedEmployees = new Map<string, SynClawAiEmployee>();
  items.forEach(item => {
    if (item.source !== "coworker" || !item.managed_by_coworker) return;
    if (typeof item.coworker_agent_id !== "number" || item.coworker_agent_id <= 0) return;
    const role = item.role ?? item.agent_code ?? item.description ?? "AI员工";
    const bindableId = String(item.coworker_agent_id);
    const disabledReason = resolveAiEmployeeDisabledReason(item);
    dedupedEmployees.set(bindableId, {
      id: bindableId,
      name: item.name,
      role: role || "AI员工",
      avatarUrl: item.avatar_url ?? undefined,
      runtimeId: item.runtime_id ?? undefined,
      runtimeName: item.runtime_id ?? "未绑定工作站",
      bindable: !disabledReason,
      disabledReason,
      provisioningStatus: item.runtime_provisioning_status ?? null,
      remoteStatus: item.remote_status ?? null,
      runtimeAgentId: item.runtime_agent_id?.trim() || undefined,
    });
  });
  return Array.from(dedupedEmployees.values());
};

/**
 * PRD 群聊视图。
 *
 * 直接复用 SynClaw 真实空间、频道与群聊运行时能力，仅在 PRD 原型页内嵌展示。
 */
export const GroupPrototypeView = (): JSX.Element => {
  const { modal } = AntdApp.useApp();
  const homeCurrentUser = useHomeStore(state => state.user);
  const fetchHomeCurrentUser = useHomeStore(state => state.fetchUser);
  const isLoadingHomeCurrentUser = useHomeStore(state => state.isLoadingUser);
  const authCurrentUser = useAuthStore(state => state.user);
  const authToken = useAuthStore(state => state.token?.access_token);
  const currentUser = useMemo(
    () => authCurrentUser ?? homeCurrentUser,
    [authCurrentUser, homeCurrentUser],
  );

  useEffect(() => {
    if (currentUser || !authToken || isLoadingHomeCurrentUser) return;
    void fetchHomeCurrentUser();
  }, [authToken, currentUser, fetchHomeCurrentUser, isLoadingHomeCurrentUser]);

  const {
    spaces,
    spacesLoading,
    spacesInitialized,
    createSpace,
    updateSpace,
    removeSpace,
    createChannel,
    updateChannel,
    removeChannel,
    sendChannelChatTask,
    abortChannelChatTask,
    loadChannelBlocks,
    loadChannelBlocksSnapshot,
    loadChannelAgents,
    loadChannelMembers,
    loadTenantMemberCandidates,
    loadSpaceMembers,
    replaceChannelMembers,
    subscribeChannelEvents,
    bindChannelAgent,
    unbindChannelAgent,
  } = useSynClawWorkspace({
    fallbackSpaces: EMPTY_SYNCLAW_SPACES,
  });
  const [activeSpaceId, setActiveSpaceId] = useState<string>("");
  const [activeChannelId, setActiveChannelId] = useState<string | undefined>(undefined);
  const [expandedSpaceIds, setExpandedSpaceIds] = useState<Set<string>>(() => new Set<string>());
  const [channelRuntimeStatusById, setChannelRuntimeStatusById] = useState<
    Record<string, CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem>
  >({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCreatingSpace, setIsCreatingSpace] = useState<boolean>(false);
  const [spaceModalMode, setSpaceModalMode] = useState<"create" | "rename">("create");
  const [editingSpaceId, setEditingSpaceId] = useState<string | undefined>(undefined);
  const [showFirstSpaceNavHint, setShowFirstSpaceNavHint] = useState<boolean>(false);
  const [hasShownFirstSpaceNavHint, setHasShownFirstSpaceNavHint] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(FIRST_SPACE_NAV_HINT_STORAGE_KEY) === "1";
  });
  const [spaceName, setSpaceName] = useState<string>("");
  const [spaceCoverUrl, setSpaceCoverUrl] = useState<string>("");
  const [isUploadingSpaceCover, setIsUploadingSpaceCover] = useState<boolean>(false);
  const [selectedModelId, setSelectedModelId] = useState<WorkspaceModelId>(
    WORKSPACE_MODEL_OPTIONS[0]?.id ?? 1,
  );
  const [isModelMenuOpen, setIsModelMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_DEFAULT_WIDTH);
  const [runtimePanelWidth, setRuntimePanelWidth] = useState<number>(
    GROUP_RUNTIME_PANEL_DEFAULT_WIDTH,
  );
  const [groupViewMode, setGroupViewMode] = useState<GroupViewMode>("split");
  const [isRuntimePanelOpen, setIsRuntimePanelOpen] = useState<boolean>(false);
  const [runtimeRefreshKey, setRuntimeRefreshKey] = useState<number>(0);
  const [availableAiEmployees, setAvailableAiEmployees] = useState<SynClawAiEmployee[]>([]);
  const [activeRuntimeAgentId, setActiveRuntimeAgentId] = useState<string>("");

  const pendingFirstSpaceNavHintRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const spaceCoverInputRef = useRef<HTMLInputElement | null>(null);
  const sidebarColumnRef = useRef<HTMLElement | null>(null);
  const runtimeColumnRef = useRef<HTMLElement | null>(null);
  const sidebarResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const runtimeResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const sidebarPendingWidthRef = useRef<number>(SIDEBAR_DEFAULT_WIDTH);
  const runtimePendingWidthRef = useRef<number>(GROUP_RUNTIME_PANEL_DEFAULT_WIDTH);
  const sidebarRuntimeStatusAbortRef = useRef<AbortController | null>(null);

  const handleExpandSpace = useCallback((spaceId: string): void => {
    setExpandedSpaceIds(prev => {
      if (prev.has(spaceId)) return prev;
      const next = new Set(prev);
      next.add(spaceId);
      return next;
    });
  }, []);

  const {
    files: artifactFiles,
    loading: artifactsLoading,
    error: artifactsError,
    refresh: refreshArtifacts,
  } = useCoworkerChannelArtifactsPanel(activeChannelId);
  const {
    isArtifactsPanelOpen,
    isArtifactsPreviewing,
    resolvedArtifactsPanelWidth,
    artifactsColumnRef,
    handleOpenArtifactsPanel,
    handleCloseArtifactsPanel,
    handleArtifactsResizeStart,
    handleArtifactsPreviewStateChange,
  } = useSynClawArtifactsPanelState({ activeChannelId });

  const {
    spaceMembers,
    spaceMembersLoading,
    channelAgents,
    chatBlocks,
    chatInputValue,
    composerAttachments,
    isSendingChat,
    composerFocusKey,
    composerMentionOptions,
    mentionableActorLabels,
    actorAvatars,
    selectedChannelAgentIds,
    canCurrentUserSpeak,
    composerPlaceholder,
    isChannelWorkspaceReady,
    setChatInputValue,
    handleComposerAttachmentsSelected,
    handleRemoveComposerAttachment,
    refreshActiveChannelRoster,
    handleSendChat,
    handleAbortChat,
    handleComposerKeyDown,
    handleInsertActorMention,
  } = useSynClawChannelRuntime({
    activeChannelId,
    activeSpaceId,
    spaces,
    currentUser,
    loadChannelMembers,
    loadSpaceMembers,
    loadChannelAgents,
    loadChannelBlocks,
    loadChannelBlocksSnapshot,
    subscribeChannelEvents,
    sendChannelChatTask,
    abortChannelChatTask,
    refreshArtifacts,
    aiEmployees: availableAiEmployees,
    onMessageError: message.error,
    onMessageWarning: message.warning,
  });

  const handleSelectChannel = useCallback((spaceId: string, channelId: string): void => {
    setShowFirstSpaceNavHint(false);
    setActiveSpaceId(spaceId);
    setActiveChannelId(channelId);
    setExpandedSpaceIds(prev => {
      if (prev.has(spaceId)) return prev;
      const next = new Set(prev);
      next.add(spaceId);
      return next;
    });
  }, []);

  const handleChannelDeleted = useCallback(
    (spaceId: string, channelId: string): void => {
      if (channelId !== activeChannelId) return;

      const targetSpace = spaces.find(space => space.id === spaceId);
      if (!targetSpace) return;

      const currentChannelIndex = targetSpace.channels.findIndex(item => item.id === channelId);
      if (currentChannelIndex < 0) return;

      const previousChannel = targetSpace.channels[currentChannelIndex - 1];
      const nextChannel = targetSpace.channels[currentChannelIndex + 1];
      const fallbackChannelId = previousChannel?.id ?? nextChannel?.id;

      setActiveSpaceId(spaceId);
      setActiveChannelId(fallbackChannelId);
      setExpandedSpaceIds(prev => {
        if (prev.has(spaceId)) return prev;
        const next = new Set(prev);
        next.add(spaceId);
        return next;
      });
    },
    [activeChannelId, spaces],
  );

  const {
    channelModalMode,
    isCreateChannelModalOpen,
    isCreatingChannel,
    createChannelDefaultSpaceId,
    editingChannelName,
    editingChannelAgentIds,
    editingChannelTenantMembers,
    aiEmployees: modalAiEmployees,
    isFetchingAiEmployees,
    tenantMemberOptions,
    isFetchingTenantMembers,
    isManageAgentsModalOpen,
    isSavingChannelAgents,
    manageAgentsTenantMembers,
    handleOpenCreateChannel,
    handleRenameChannel,
    handleDeleteChannel,
    handleCreateChannelCancel,
    handleCreateChannelSubmit,
    handleOpenManageAgentsModal,
    handleCloseManageAgentsModal,
    handleSubmitManageAgents,
  } = useSynClawChannelManagement({
    activeChannelId,
    currentUser,
    selectedChannelAgentIds,
    bindChannelAgent,
    createChannel,
    loadChannelAgents,
    loadChannelMembers,
    loadTenantMemberCandidates,
    removeChannel,
    replaceChannelMembers,
    unbindChannelAgent,
    updateChannel,
    refreshActiveChannelRoster,
    onExpandSpace: handleExpandSpace,
    onSelectCreatedChannel: handleSelectChannel,
    onDeleteChannelSuccess: handleChannelDeleted,
    showConfirm: modal.confirm,
    onMessageSuccess: message.success,
    onMessageError: message.error,
    onMessageWarning: message.warning,
    onAiEmployeesChange: setAvailableAiEmployees,
  });

  const fetchAvailableAiEmployees = useCallback(async (): Promise<void> => {
    try {
      const response = await getAdminAiEmployeeList({
        source: "coworker",
        manageable_only: true,
        skip: 0,
        limit: 200,
      });
      setAvailableAiEmployees(normalizeRuntimeAiEmployees(response.items));
    } catch {
      setAvailableAiEmployees([]);
    }
  }, []);

  useEffect(() => {
    void fetchAvailableAiEmployees();
  }, [fetchAvailableAiEmployees]);

  const channelAgentMap = useMemo(() => {
    return channelAgents.reduce<Map<string, (typeof channelAgents)[number]>>((result, item) => {
      result.set(item.agentId, item);
      return result;
    }, new Map());
  }, [channelAgents]);

  const availableAiEmployeeMap = useMemo(() => {
    return availableAiEmployees.reduce<Map<string, SynClawAiEmployee>>((result, item) => {
      result.set(item.id, item);
      return result;
    }, new Map());
  }, [availableAiEmployees]);

  const cloudRuntimeAgents = useMemo<GroupRuntimeAgentItem[]>(() => {
    const resolvedAgents: Array<GroupRuntimeAgentItem | null> = selectedChannelAgentIds.map(
      agentId => {
        const employee = availableAiEmployeeMap.get(agentId);
        const channelAgent = channelAgentMap.get(agentId);
        const runtimeId = employee?.runtimeId?.trim() || "";
        const runtimeName = employee?.runtimeName?.trim() || "";
        if (!runtimeId || !runtimeName || runtimeName === "未绑定工作站") {
          return null;
        }
        return {
          id: agentId,
          name:
            employee?.name.trim() ||
            channelAgent?.displayName?.trim() ||
            channelAgent?.alias?.trim() ||
            `AI专家 ${agentId}`,
          avatarUrl: employee?.avatarUrl ?? channelAgent?.avatarUrl,
          runtimeId,
          runtimeName,
          runtimeAgentId: employee?.runtimeAgentId?.trim() || undefined,
        } satisfies GroupRuntimeAgentItem;
      },
    );
    return resolvedAgents.filter((item): item is GroupRuntimeAgentItem => item !== null);
  }, [availableAiEmployeeMap, channelAgentMap, selectedChannelAgentIds]);

  const runtimeDevices = useMemo<GroupRuntimeDeviceItem[]>(() => {
    const grouped = cloudRuntimeAgents.reduce<Map<string, GroupRuntimeDeviceItem>>(
      (result, item) => {
        const runtimeKey = item.runtimeId || item.id;
        const current = result.get(runtimeKey);
        if (current) {
          current.agents.push(item);
          return result;
        }
        result.set(runtimeKey, {
          key: runtimeKey,
          runtimeId: item.runtimeId,
          runtimeName: item.runtimeName,
          agents: [item],
        });
        return result;
      },
      new Map(),
    );

    return Array.from(grouped.values()).sort((left, right) =>
      left.runtimeName.localeCompare(right.runtimeName, "zh-CN"),
    );
  }, [cloudRuntimeAgents]);

  const activeRuntimeAgent = useMemo(() => {
    return (
      cloudRuntimeAgents.find(item => item.id === activeRuntimeAgentId) ?? cloudRuntimeAgents[0]
    );
  }, [activeRuntimeAgentId, cloudRuntimeAgents]);

  const activeRuntimeDevice = useMemo(() => {
    if (!activeRuntimeAgent) return undefined;
    return runtimeDevices.find(item => item.runtimeId === activeRuntimeAgent.runtimeId);
  }, [activeRuntimeAgent, runtimeDevices]);

  const sharedRuntimeAgents = useMemo(() => {
    if (!activeRuntimeDevice || !activeRuntimeAgent) return [];
    return activeRuntimeDevice.agents.filter(item => item.id !== activeRuntimeAgent.id);
  }, [activeRuntimeAgent, activeRuntimeDevice]);

  const runtimeAgentSelectOptions = useMemo(() => {
    return cloudRuntimeAgents.map(item => {
      const deviceAgentCount =
        runtimeDevices.find(device => device.runtimeId === item.runtimeId)?.agents.length ?? 1;
      const isCurrentDevice = item.runtimeId === activeRuntimeDevice?.runtimeId;
      return {
        value: item.id,
        label: isCurrentDevice ? `${item.name}（当前设备）` : item.name,
        disabled: isCurrentDevice,
        title:
          deviceAgentCount > 1
            ? `${item.runtimeName} · 共用 ${deviceAgentCount} 人`
            : `${item.runtimeName} · 独立设备`,
      };
    });
  }, [activeRuntimeDevice?.runtimeId, cloudRuntimeAgents, runtimeDevices]);

  const isCloudRuntime = cloudRuntimeAgents.length > 0;
  const isArtifactsVisible = isArtifactsPanelOpen && groupViewMode !== "cloudspace";

  const sidebarRuntimeStatusSpaceIds = useMemo(() => {
    const normalizedActiveSpaceId = activeSpaceId.trim();
    if (!normalizedActiveSpaceId) {
      return [];
    }
    const hasActiveSpace = spaces.some(space => space.id === normalizedActiveSpaceId);
    return hasActiveSpace ? [normalizedActiveSpaceId] : [];
  }, [activeSpaceId, spaces]);

  const refreshSidebarChannelRuntimeStatuses = useCallback(async (): Promise<
    Record<string, CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem>
  > => {
    if (!sidebarRuntimeStatusSpaceIds.length) {
      return {};
    }

    sidebarRuntimeStatusAbortRef.current?.abort();
    const controller = new AbortController();
    sidebarRuntimeStatusAbortRef.current = controller;

    const next: Record<string, CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem> = {};
    let successfulSpaces = 0;

    try {
      for (const spaceId of sidebarRuntimeStatusSpaceIds) {
        try {
          const items = await getCoworkerChannelSpaceChannelAgentRuntimeStatuses(spaceId, {
            signal: controller.signal,
          });
          if (controller.signal.aborted) {
            return {};
          }
          successfulSpaces += 1;
          items.forEach(item => {
            next[item.channelId] = item;
          });
        } catch (error) {
          if (controller.signal.aborted || isCanceledRequestError(error)) {
            return {};
          }
        }
      }

      if (successfulSpaces === 0) {
        throw new Error("SIDEBAR_RUNTIME_STATUS_FETCH_FAILED");
      }

      if (Object.keys(next).length > 0) {
        setChannelRuntimeStatusById(prev => ({
          ...prev,
          ...next,
        }));
      }
      return next;
    } finally {
      if (sidebarRuntimeStatusAbortRef.current === controller) {
        sidebarRuntimeStatusAbortRef.current = null;
      }
    }
  }, [sidebarRuntimeStatusSpaceIds]);

  useEffect(() => {
    if (!spacesInitialized) return;
    if (sidebarRuntimeStatusSpaceIds.length <= 0) {
      sidebarRuntimeStatusAbortRef.current?.abort();
      sidebarRuntimeStatusAbortRef.current = null;
      return;
    }

    let cancelled = false;
    let timer: number | null = null;
    let consecutiveErrors = 0;

    const applyJitter = (delayMs: number, ratio = 0.2): number => {
      const bounded = Math.max(0, Math.min(0.9, ratio));
      const minFactor = 1 - bounded;
      const maxFactor = 1 + bounded;
      const factor = minFactor + Math.random() * (maxFactor - minFactor);
      return Math.max(0, Math.floor(delayMs * factor));
    };

    const scheduleNext = (delayMs: number): void => {
      if (cancelled) return;
      if (timer) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => {
        void tick();
      }, applyJitter(delayMs));
    };

    const tick = async (): Promise<void> => {
      if (cancelled) return;

      const isHidden = typeof document !== "undefined" && document.hidden;
      if (isHidden) {
        scheduleNext(30_000);
        return;
      }

      try {
        const latest = await refreshSidebarChannelRuntimeStatuses();
        if (cancelled) return;
        consecutiveErrors = 0;
        const hasBusy = Object.values(latest).some(item => item.busy);
        scheduleNext(hasBusy ? 5_000 : 15_000);
      } catch (error) {
        if (isCanceledRequestError(error)) {
          return;
        }
        consecutiveErrors += 1;
        const delay = Math.min(30_000, 5_000 * 2 ** Math.min(consecutiveErrors, 2));
        scheduleNext(delay);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
      sidebarRuntimeStatusAbortRef.current?.abort();
      sidebarRuntimeStatusAbortRef.current = null;
    };
  }, [refreshSidebarChannelRuntimeStatuses, sidebarRuntimeStatusSpaceIds, spacesInitialized]);

  const handleCreateSpace = useCallback((): void => {
    setSpaceModalMode("create");
    setEditingSpaceId(undefined);
    setSpaceName("");
    setSpaceCoverUrl("");
    setIsCreateModalOpen(true);
  }, []);

  const handleCreateModalClose = useCallback((): void => {
    if (isCreatingSpace || isUploadingSpaceCover) return;
    setIsCreateModalOpen(false);
    setSpaceModalMode("create");
    setEditingSpaceId(undefined);
    setSpaceName("");
    setSpaceCoverUrl("");
  }, [isCreatingSpace, isUploadingSpaceCover]);

  const handleOpenSpaceCoverPicker = useCallback((): void => {
    if (isUploadingSpaceCover) return;
    spaceCoverInputRef.current?.click();
  }, [isUploadingSpaceCover]);

  const handleSpaceCoverFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      try {
        validateSpaceCoverFile(file);
        setIsUploadingSpaceCover(true);
        const sts = await getStorageSTS();
        const uploadResult = await uploadToTencentCloud(file, sts, undefined, "space_cover");
        setSpaceCoverUrl(uploadResult.location);
        message.success("空间封面上传成功");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "空间封面上传失败");
      } finally {
        setIsUploadingSpaceCover(false);
      }
    },
    [],
  );

  const handleCreateModalOk = useCallback(async (): Promise<void> => {
    if (isCreatingSpace || isUploadingSpaceCover) return;
    const nextSpaceName = spaceName.trim();
    if (!nextSpaceName) {
      message.warning("请输入空间名称");
      return;
    }

    const isRenameMode = spaceModalMode === "rename";
    const targetSpaceId = editingSpaceId;
    const shouldShowFirstSpaceNavHint =
      !isRenameMode && spaces.length === 0 && !hasShownFirstSpaceNavHint;
    if (isRenameMode && !targetSpaceId) {
      message.error("当前空间不存在，无法重命名");
      return;
    }

    setIsCreatingSpace(true);
    try {
      if (isRenameMode) {
        if (!targetSpaceId) {
          message.error("当前空间不存在，无法重命名");
          return;
        }
        await updateSpace(targetSpaceId, nextSpaceName, spaceCoverUrl || undefined);
      } else {
        await createSpace(nextSpaceName, spaceCoverUrl || undefined);
        if (shouldShowFirstSpaceNavHint) {
          pendingFirstSpaceNavHintRef.current = true;
        }
      }
      setIsCreateModalOpen(false);
      setSpaceModalMode("create");
      setEditingSpaceId(undefined);
      setSpaceName("");
      setSpaceCoverUrl("");
      message.success(isRenameMode ? "空间已重命名" : "空间已创建");
    } catch {
      message.error(isRenameMode ? "重命名空间失败，请稍后再试" : "创建空间失败，请稍后再试");
    } finally {
      setIsCreatingSpace(false);
    }
  }, [
    createSpace,
    editingSpaceId,
    hasShownFirstSpaceNavHint,
    isCreatingSpace,
    isUploadingSpaceCover,
    spaceCoverUrl,
    spaceModalMode,
    spaceName,
    spaces.length,
    updateSpace,
  ]);

  const handleRenameSpace = useCallback(
    (spaceId: string, currentSpaceName: string): void => {
      const currentSpace = spaces.find(space => space.id === spaceId);
      setSpaceModalMode("rename");
      setEditingSpaceId(spaceId);
      setSpaceName(currentSpaceName);
      setSpaceCoverUrl(currentSpace?.coverUrl ?? "");
      setIsCreateModalOpen(true);
    },
    [spaces],
  );

  const spaceCoverFallbackSeed = editingSpaceId || spaceName.trim() || "space";
  const spaceCoverFallbackMeta = useMemo(
    () => buildSynClawSpaceAvatarMeta(spaceCoverFallbackSeed, spaceName),
    [spaceCoverFallbackSeed, spaceName],
  );

  const handleDeleteSpace = useCallback(
    (spaceId: string, currentSpaceName: string): void => {
      modal.confirm({
        title: "删除空间",
        content: `确认删除空间"${currentSpaceName}"吗？删除后无法恢复。`,
        centered: true,
        okText: "删除",
        okButtonProps: { danger: true },
        cancelText: "取消",
        onOk: async () => {
          try {
            await removeSpace(spaceId);
            message.success("空间已删除");
          } catch {
            message.error("删除空间失败，请稍后再试");
          }
        },
      });
    },
    [modal, removeSpace],
  );

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

  const handleSelectSpace = useCallback(
    (spaceId: string): void => {
      const targetSpace = spaces.find(space => space.id === spaceId);
      if (!targetSpace) return;

      setShowFirstSpaceNavHint(false);
      setActiveSpaceId(spaceId);
      setExpandedSpaceIds(prev => {
        if (prev.has(spaceId)) return prev;
        const next = new Set(prev);
        next.add(spaceId);
        return next;
      });

      const nextChannelId = targetSpace.channels.some(channel => channel.id === activeChannelId)
        ? activeChannelId
        : targetSpace.channels[0]?.id;

      setActiveChannelId(nextChannelId);
    },
    [activeChannelId, spaces],
  );

  const resolveArtifactAccessUrl = useCallback(
    async (file: SynClawArtifactItem): Promise<string> => {
      if (!activeChannelId || !file.artifactId) {
        throw new Error("当前文件暂时无法访问");
      }
      if (file.isDeleted) {
        throw new Error("该成果文件已删除");
      }
      const result = await createCoworkerChannelArtifactDownloadUrl(
        activeChannelId,
        file.artifactId,
      );
      if (!result.downloadUrl) {
        throw new Error("文件访问链接为空");
      }
      return result.downloadUrl;
    },
    [activeChannelId],
  );

  const handleDownloadArtifact = useCallback(
    async (file: SynClawArtifactItem): Promise<void> => {
      try {
        const downloadUrl = await resolveArtifactAccessUrl(file);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "下载成果文件失败";
        message.error(errorMessage);
      }
    },
    [resolveArtifactAccessUrl],
  );

  const activeChannelTitle = useMemo(() => {
    if (!activeChannelId) return "";
    for (const space of spaces) {
      const found = space.channels.find(channel => channel.id === activeChannelId);
      if (found) return found.name;
    }
    return "";
  }, [activeChannelId, spaces]);

  const activeSpaceTitle = useMemo(() => {
    if (!activeSpaceId) return "";
    return spaces.find(space => space.id === activeSpaceId)?.name ?? "";
  }, [activeSpaceId, spaces]);

  const modelLabel = useMemo(() => {
    const current = WORKSPACE_MODEL_OPTIONS.find(option => option.id === selectedModelId);
    return current?.label ?? WORKSPACE_MODEL_OPTIONS[0]?.label ?? "";
  }, [selectedModelId]);

  const clampSidebarWidth = useCallback((width: number): number => {
    if (!Number.isFinite(width)) return SIDEBAR_DEFAULT_WIDTH;
    const viewportLimitedMax =
      typeof window === "undefined"
        ? SIDEBAR_MAX_WIDTH
        : Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, window.innerWidth - 720));
    return Math.min(viewportLimitedMax, Math.max(SIDEBAR_MIN_WIDTH, width));
  }, []);

  const resolvedSidebarWidth = useMemo(
    () => clampSidebarWidth(sidebarWidth),
    [clampSidebarWidth, sidebarWidth],
  );

  const clampRuntimePanelWidth = useCallback(
    (width: number): number => {
      if (!Number.isFinite(width)) return GROUP_RUNTIME_PANEL_DEFAULT_WIDTH;
      if (typeof window === "undefined") {
        return Math.min(
          GROUP_RUNTIME_PANEL_MAX_WIDTH,
          Math.max(GROUP_RUNTIME_PANEL_MIN_WIDTH, width),
        );
      }
      const sidebarReservedWidth = isSidebarCollapsed
        ? SIDEBAR_COLLAPSED_WIDTH
        : resolvedSidebarWidth;
      const artifactsReservedWidth =
        activeChannelId && isArtifactsPanelOpen && groupViewMode !== "cloudspace"
          ? resolvedArtifactsPanelWidth + 10
          : 0;
      const viewportLimitedMax = Math.min(
        GROUP_RUNTIME_PANEL_MAX_WIDTH,
        Math.max(
          GROUP_RUNTIME_PANEL_MIN_WIDTH,
          window.innerWidth - sidebarReservedWidth - artifactsReservedWidth - 540,
        ),
      );
      return Math.min(viewportLimitedMax, Math.max(GROUP_RUNTIME_PANEL_MIN_WIDTH, width));
    },
    [
      activeChannelId,
      groupViewMode,
      isArtifactsPanelOpen,
      isSidebarCollapsed,
      resolvedArtifactsPanelWidth,
      resolvedSidebarWidth,
    ],
  );

  const resolvedRuntimePanelWidth = useMemo(
    () => clampRuntimePanelWidth(runtimePanelWidth),
    [clampRuntimePanelWidth, runtimePanelWidth],
  );

  const handleSidebarResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>): void => {
      event.preventDefault();
      sidebarResizeStateRef.current = {
        startX: event.clientX,
        startWidth: resolvedSidebarWidth,
      };
      sidebarPendingWidthRef.current = resolvedSidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [resolvedSidebarWidth],
  );

  const handleToggleSidebarCollapsed = useCallback((): void => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

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
      const current = sidebarResizeStateRef.current;
      if (!current) return;
      const deltaX = event.clientX - current.startX;
      const nextWidth = clampSidebarWidth(current.startWidth + deltaX);
      sidebarPendingWidthRef.current = nextWidth;
      if (sidebarColumnRef.current) {
        sidebarColumnRef.current.style.width = `${nextWidth}px`;
        sidebarColumnRef.current.style.minWidth = `${nextWidth}px`;
      }
    };

    const handlePointerUp = () => {
      if (!sidebarResizeStateRef.current) return;
      setSidebarWidth(sidebarPendingWidthRef.current);
      sidebarResizeStateRef.current = null;
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
  }, [clampSidebarWidth]);

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
    const savedCollapsed = window.localStorage.getItem(SYNCLAW_SIDEBAR_COLLAPSED_KEY);
    setIsSidebarCollapsed(savedCollapsed === "1");
    const savedWidth = window.localStorage.getItem(SYNCLAW_SIDEBAR_WIDTH_KEY);
    const nextWidth = clampSidebarWidth(
      savedWidth ? Number.parseFloat(savedWidth) : SIDEBAR_DEFAULT_WIDTH,
    );
    setSidebarWidth(nextWidth);
    sidebarPendingWidthRef.current = nextWidth;
  }, [clampSidebarWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedWidth = window.localStorage.getItem(GROUP_RUNTIME_PANEL_WIDTH_KEY);
    const nextWidth = clampRuntimePanelWidth(
      savedWidth ? Number.parseFloat(savedWidth) : GROUP_RUNTIME_PANEL_DEFAULT_WIDTH,
    );
    setRuntimePanelWidth(nextWidth);
    runtimePendingWidthRef.current = nextWidth;
  }, [clampRuntimePanelWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SYNCLAW_SIDEBAR_COLLAPSED_KEY, isSidebarCollapsed ? "1" : "0");
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SYNCLAW_SIDEBAR_WIDTH_KEY, String(resolvedSidebarWidth));
  }, [resolvedSidebarWidth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(GROUP_RUNTIME_PANEL_WIDTH_KEY, String(resolvedRuntimePanelWidth));
  }, [resolvedRuntimePanelWidth]);

  useEffect(() => {
    if (!spaces.length) {
      setActiveSpaceId("");
      setActiveChannelId(undefined);
      return;
    }
    setActiveSpaceId(prev => {
      if (spaces.some(space => space.id === prev)) return prev;
      return spaces[0]?.id ?? "";
    });
  }, [spaces]);

  useEffect(() => {
    if (!isCloudRuntime) {
      setGroupViewMode("split");
      setIsRuntimePanelOpen(false);
      setActiveRuntimeAgentId("");
      return;
    }
    if (cloudRuntimeAgents.some(item => item.id === activeRuntimeAgentId)) return;
    setActiveRuntimeAgentId(cloudRuntimeAgents[0]?.id ?? "");
  }, [activeRuntimeAgentId, cloudRuntimeAgents, isCloudRuntime]);

  useEffect(() => {
    if (!activeChannelId || !isCloudRuntime) {
      setIsRuntimePanelOpen(false);
      return;
    }
    setIsRuntimePanelOpen(true);
  }, [activeChannelId, isCloudRuntime]);

  useEffect(() => {
    setExpandedSpaceIds(prev => {
      const spaceIds = new Set(spaces.map(space => space.id));
      const next = new Set<string>();
      prev.forEach(spaceId => {
        if (spaceIds.has(spaceId)) {
          next.add(spaceId);
        }
      });
      if (!next.size) {
        spaces.slice(0, 2).forEach(space => {
          next.add(space.id);
        });
      }
      return next;
    });
  }, [spaces]);

  useEffect(() => {
    const validChannelIds = new Set(
      spaces.flatMap(space => space.channels.map(channel => channel.id)),
    );
    setChannelRuntimeStatusById(prev => {
      const nextEntries = Object.entries(prev).filter(([channelId]) =>
        validChannelIds.has(channelId),
      );
      if (nextEntries.length === Object.keys(prev).length) {
        return prev;
      }
      return Object.fromEntries(nextEntries);
    });
  }, [spaces]);

  useEffect(() => {
    if (!activeSpaceId) {
      setActiveChannelId(undefined);
      return;
    }

    const currentSpace = spaces.find(space => space.id === activeSpaceId);
    if (!currentSpace) {
      setActiveChannelId(undefined);
      return;
    }

    if (currentSpace.channels.some(channel => channel.id === activeChannelId)) return;
    setActiveChannelId(currentSpace.channels[0]?.id);
  }, [activeChannelId, activeSpaceId, spaces]);

  useEffect(() => {
    if (!pendingFirstSpaceNavHintRef.current) return;
    if (hasShownFirstSpaceNavHint) {
      pendingFirstSpaceNavHintRef.current = false;
      return;
    }
    if (!spaces.length) return;

    pendingFirstSpaceNavHintRef.current = false;
    setShowFirstSpaceNavHint(true);
    setHasShownFirstSpaceNavHint(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FIRST_SPACE_NAV_HINT_STORAGE_KEY, "1");
    }
  }, [hasShownFirstSpaceNavHint, spaces.length]);

  useEffect(() => {
    if (!showFirstSpaceNavHint) return;
    const timer = window.setTimeout(() => {
      setShowFirstSpaceNavHint(false);
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [showFirstSpaceNavHint]);

  const hasAnyChannels = useMemo(() => {
    return spaces.some(space => space.channels.length > 0);
  }, [spaces]);

  const hasActiveChannel = Boolean(activeChannelId && activeChannelTitle);
  const renderedChatBlocks = isChannelWorkspaceReady ? chatBlocks : [];
  const shouldSuppressWorkspaceEmpty = !spacesInitialized || (hasAnyChannels && !hasActiveChannel);
  const shouldShowWorkspaceEmpty = spacesInitialized && !spacesLoading && !hasAnyChannels;
  const showArtifactsColumn = hasActiveChannel && isArtifactsVisible;
  const showRuntimeSplitColumn =
    hasActiveChannel && isCloudRuntime && groupViewMode === "split" && isRuntimePanelOpen;
  const isRuntimeFullscreen = hasActiveChannel && isCloudRuntime && groupViewMode === "cloudspace";

  const renderRuntimePanel = (): JSX.Element | null => {
    if (!activeRuntimeAgent || !activeRuntimeDevice) {
      return null;
    }

    return (
      <div
        className={classNames(styles.dialogueRuntimePanel, {
          [styles.dialogueRuntimePanelFull]: groupViewMode === "cloudspace",
        })}
      >
        <div className={styles.groupRuntimePanelHeader}>
          <div className={styles.groupRuntimePanelToolbar}>
            <div className={styles.groupRuntimeAgentSelectWrap}>
              <Select<string>
                value={activeRuntimeAgent.id}
                className={styles.groupRuntimeAgentSelect}
                popupClassName={styles.groupRuntimeAgentSelectPopup}
                options={runtimeAgentSelectOptions}
                optionFilterProp="label"
                showSearch={cloudRuntimeAgents.length > 6}
                onChange={value => setActiveRuntimeAgentId(value)}
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
                aria-label="刷新远端桌面"
                onClick={() => setRuntimeRefreshKey(prev => prev + 1)}
              >
                <ReloadOutlined />
              </button>
              {groupViewMode === "split" ? (
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
        </div>

        <div className={styles.groupRuntimePanelBody}>
          <div
            key={`${activeRuntimeAgent.id}-${runtimeRefreshKey}`}
            className={styles.groupRuntimeDesktopWindow}
          >
            <div className={styles.groupRuntimeDesktopHeader}>
              <div className={styles.groupRuntimeDesktopDots} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className={styles.groupRuntimeDesktopHeaderTitle}>
                {activeChannelTitle || "当前频道"} · {activeRuntimeDevice.runtimeName}
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
                    当前查看：{activeRuntimeAgent.name}
                  </span>
                  <span className={styles.groupRuntimeDesktopBadge}>
                    {sharedRuntimeAgents.length > 0
                      ? `共享设备 · ${activeRuntimeDevice.agents.length} 个 Agent`
                      : "独立设备"}
                  </span>
                </div>

                <div className={styles.groupRuntimeDesktopMainWindow}>
                  <div className={styles.groupRuntimeDesktopWindowBar}>
                    <span className={styles.groupRuntimeDesktopWindowTitle}>浏览器任务面板</span>
                    <span className={styles.groupRuntimeDesktopWindowMeta}>
                      执行中频道：{activeChannelTitle || "群聊频道"}
                    </span>
                  </div>
                  <div className={styles.groupRuntimeDesktopScene}>
                    <div className={styles.groupRuntimeDesktopHeroCard}>
                      <span className={styles.groupRuntimeDesktopLabel}>当前设备</span>
                      <span className={styles.groupRuntimeDesktopValue}>
                        {activeRuntimeDevice.runtimeName}
                      </span>
                      <span className={styles.groupRuntimeDesktopText}>
                        设备桌面保持和频道上下文绑定，切换 agent 仅切换当前查看对象。
                      </span>
                    </div>

                    <div className={styles.groupRuntimeDesktopGrid}>
                      <div className={styles.groupRuntimeDesktopCard}>网页检索</div>
                      <div className={styles.groupRuntimeDesktopCard}>资料整理</div>
                      <div className={styles.groupRuntimeDesktopCard}>文件回传</div>
                      <div className={styles.groupRuntimeDesktopCard}>
                        {sharedRuntimeAgents.length > 0
                          ? `协作 Agent：${sharedRuntimeAgents.map(item => item.name).join(" / ")}`
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
        aria-label="空间与频道"
        ref={sidebarColumnRef}
        style={{
          width: `${isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : resolvedSidebarWidth}px`,
          minWidth: `${isSidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : resolvedSidebarWidth}px`,
        }}
      >
        {isSidebarCollapsed ? (
          <div className={workspaceStyles.leftPanelCollapsedBox} aria-label="空间与频道已收起">
            <button
              type="button"
              className={workspaceStyles.leftPanelCollapsedButton}
              onClick={handleToggleSidebarCollapsed}
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
                  aria-label="收起空间与频道列表"
                  onClick={handleToggleSidebarCollapsed}
                >
                  <LayoutIcon className={workspaceStyles.leftPanelCollapseIcon} />
                </button>
              </div>
            </div>
            <div className={workspaceStyles.leftPanelDivider} />

            <div className={workspaceStyles.leftPanelContent}>
              {spaces.length > 0 ? (
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
              ) : (
                <div className={workspaceStyles.leftPanelEmpty}>
                  <button
                    type="button"
                    className={workspaceStyles.createSpaceCard}
                    aria-label="创建空间"
                    onClick={handleCreateSpace}
                  >
                    <span className={workspaceStyles.createSpaceIcon} aria-hidden="true">
                      <AddIcon className={workspaceStyles.createSpaceIconSvg} />
                    </span>
                    <span className={workspaceStyles.createSpaceTitle}>创建空间</span>
                    <span className={workspaceStyles.createSpaceDesc}>新建空间，立即体验</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      <div
        className={classNames(workspaceStyles.sidebarResizeHandle, {
          [workspaceStyles.resizeHandleHidden]: isSidebarCollapsed,
        })}
        role="separator"
        aria-label="调整空间与频道列表宽度"
        aria-orientation="vertical"
        onMouseDown={handleSidebarResizeStart}
      />

      <section className={workspaceStyles.rightPanel} aria-label="工作空间">
        {hasActiveChannel ? (
          <div className={workspaceStyles.chatMainColumn}>
            {isRuntimeFullscreen ? (
              renderRuntimePanel()
            ) : (
              <>
                <PrdGroupChatHeader
                  title={activeChannelTitle}
                  members={spaceMembers}
                  membersLoading={spaceMembersLoading}
                  onManageMembers={handleOpenManageAgentsModal}
                  onOpenFolder={handleOpenArtifactsPanel}
                  onOpenDevice={
                    isCloudRuntime
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
                      messages={DEFAULT_CHAT_MESSAGES}
                      currentSessionId={activeChannelId}
                      actorAvatars={actorAvatars}
                      mentionableActorLabels={mentionableActorLabels}
                      isStreaming={isSendingChat}
                      isHistoryLoading={!isChannelWorkspaceReady}
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
                    placeholder={composerPlaceholder}
                    mentionOptions={composerMentionOptions}
                    focusKey={composerFocusKey}
                    isChatPage={true}
                    sending={isSendingChat}
                    showModelSelector={false}
                    sendDisabled={!canCurrentUserSpeak}
                    modelLabel={modelLabel}
                    selectedModelId={selectedModelId}
                    modelMenuOpen={isModelMenuOpen}
                    modelOptions={WORKSPACE_MODEL_OPTIONS}
                    onValueChange={setChatInputValue}
                    onKeyDown={handleComposerKeyDown}
                    onAttach={() => fileInputRef.current?.click()}
                    attachments={composerAttachments}
                    onRemoveAttachment={handleRemoveComposerAttachment}
                    onAttachmentsSelected={handleComposerAttachmentsSelected}
                    allowAttachmentOnlySend={true}
                    onToggleModelMenu={() => setIsModelMenuOpen(open => !open)}
                    onCloseModelMenu={() => setIsModelMenuOpen(false)}
                    onSelectModel={setSelectedModelId}
                    onSend={handleSendChat}
                    onAbort={handleAbortChat}
                  />
                </div>
              </>
            )}
          </div>
        ) : shouldSuppressWorkspaceEmpty ? (
          <>
            <div className={workspaceStyles.rightTopBar}>
              <div className={workspaceStyles.rightTopBarTitle}>工作空间</div>
            </div>
            <div className={workspaceStyles.rightContent} />
          </>
        ) : shouldShowWorkspaceEmpty ? (
          <>
            {activeSpaceId ? (
              <PrdGroupChatHeader
                title={activeSpaceTitle || "工作空间"}
                members={spaceMembers}
                membersLoading={spaceMembersLoading}
              />
            ) : (
              <div className={workspaceStyles.rightTopBar}>
                <div className={workspaceStyles.rightTopBarTitle}>工作空间</div>
              </div>
            )}
            <div className={workspaceStyles.rightContent}>
              <WorkspaceEmptyState
                title="创建工作空间"
                subtitle="与 AI 伙伴一起，让你的想法快速落地为成果"
                showGuides={false}
                showNavHint={showFirstSpaceNavHint}
                navHintLabel={FIRST_SPACE_NAV_HINT_LABEL}
                actionLabel={spaces.length ? undefined : "创建工作空间"}
                onActionClick={spaces.length ? undefined : handleCreateSpace}
              />
            </div>
          </>
        ) : null}

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
        <>
          <div
            className={workspaceStyles.artifactsResizeHandle}
            role="separator"
            aria-label="调整云端桌面宽度"
            aria-orientation="vertical"
            onMouseDown={handleRuntimeResizeStart}
          />
          <aside
            className={styles.groupRuntimeColumn}
            aria-label="云端桌面"
            ref={runtimeColumnRef}
            style={{
              width: `${resolvedRuntimePanelWidth}px`,
              minWidth: `${resolvedRuntimePanelWidth}px`,
            }}
          >
            {renderRuntimePanel()}
          </aside>
        </>
      ) : null}

      {showArtifactsColumn ? (
        <>
          <div
            className={classNames(workspaceStyles.artifactsResizeHandle, {
              [workspaceStyles.artifactsResizeHandlePassive]: isArtifactsPreviewing,
            })}
            role="separator"
            aria-label="调整成果面板宽度"
            aria-orientation="vertical"
            onMouseDown={handleArtifactsResizeStart}
          />

          <aside
            className={workspaceStyles.artifactsColumn}
            aria-label="成果文件列表"
            ref={artifactsColumnRef}
            style={{
              width: `${resolvedArtifactsPanelWidth}px`,
              minWidth: `${resolvedArtifactsPanelWidth}px`,
            }}
          >
            <SynClawArtifactsPanel
              files={artifactFiles}
              loading={artifactsLoading}
              error={artifactsError}
              onClose={handleCloseArtifactsPanel}
              onDownloadFile={handleDownloadArtifact}
              resolveFileUrl={resolveArtifactAccessUrl}
              onPreviewStateChange={handleArtifactsPreviewStateChange}
            />
          </aside>
        </>
      ) : null}

      <Modal
        open={isCreateModalOpen}
        title={
          <div className={workspaceStyles.spaceModalTitle}>
            {spaceModalMode === "rename" ? "编辑空间" : "新建空间"}
          </div>
        }
        onCancel={handleCreateModalClose}
        rootClassName={workspaceStyles.spaceModal}
        width={520}
        footer={
          <div className={workspaceStyles.spaceModalFooter}>
            <button
              type="button"
              className={workspaceStyles.spaceModalCancelButton}
              onClick={handleCreateModalClose}
              disabled={isCreatingSpace || isUploadingSpaceCover}
            >
              取消
            </button>
            <CommonButton
              variant="confirm"
              className={workspaceStyles.spaceModalConfirmButton}
              onClick={() => {
                void handleCreateModalOk();
              }}
              disabled={isCreatingSpace || isUploadingSpaceCover}
            >
              {isUploadingSpaceCover
                ? "上传中..."
                : isCreatingSpace
                  ? spaceModalMode === "rename"
                    ? "保存中..."
                    : "创建中..."
                  : spaceModalMode === "rename"
                    ? "保存"
                    : "创建"}
            </CommonButton>
          </div>
        }
        destroyOnHidden={true}
      >
        <div className={workspaceStyles.spaceModalBody}>
          <div className={workspaceStyles.spaceCoverSection}>
            <div className={workspaceStyles.modalLabel}>空间封面</div>
            <button
              type="button"
              className={workspaceStyles.spaceCoverCard}
              onClick={handleOpenSpaceCoverPicker}
              disabled={isUploadingSpaceCover}
            >
              {spaceCoverUrl ? (
                <img className={workspaceStyles.spaceCoverImage} src={spaceCoverUrl} alt="" />
              ) : (
                <span
                  className={workspaceStyles.spaceCoverFallbackAvatar}
                  style={{
                    background: spaceCoverFallbackMeta.background,
                    color: spaceCoverFallbackMeta.textColor,
                  }}
                >
                  <span
                    className={classNames(workspaceStyles.spaceCoverFallbackText, {
                      [workspaceStyles.spaceCoverFallbackTextMultiLine]:
                        spaceCoverFallbackMeta.lines.length > 1,
                    })}
                  >
                    {spaceCoverFallbackMeta.lines.map(line => (
                      <span
                        key={`space-cover-${line}`}
                        className={workspaceStyles.spaceCoverFallbackLine}
                      >
                        {line}
                      </span>
                    ))}
                  </span>
                </span>
              )}
              <span className={workspaceStyles.spaceCoverAction}>
                {isUploadingSpaceCover ? "上传中..." : spaceCoverUrl ? "更换封面" : "上传封面"}
              </span>
            </button>
            <input
              ref={spaceCoverInputRef}
              className={workspaceStyles.hiddenInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleSpaceCoverFileChange}
            />
          </div>

          <div className={workspaceStyles.spaceFormSection}>
            <label className={workspaceStyles.modalLabel} htmlFor="prd-synclaw-space-name">
              空间名称
            </label>
            <Input
              id="prd-synclaw-space-name"
              placeholder="请输入空间名称"
              value={spaceName}
              onChange={event => setSpaceName(event.target.value)}
              disabled={isCreatingSpace}
            />
          </div>
        </div>
      </Modal>

      <SynClawCreateChannelModal
        styles={workspaceStyles}
        mode={channelModalMode}
        open={isCreateChannelModalOpen}
        spaces={spaces}
        aiEmployees={modalAiEmployees}
        tenantEmployees={tenantMemberOptions}
        aiEmployeesLoading={isFetchingAiEmployees}
        tenantEmployeesLoading={isFetchingTenantMembers}
        defaultSpaceId={createChannelDefaultSpaceId}
        initialChannelName={editingChannelName}
        initialAiEmployeeIds={editingChannelAgentIds}
        initialTenantMembers={editingChannelTenantMembers}
        submitting={isCreatingChannel}
        onCancel={handleCreateChannelCancel}
        onSubmit={payload => {
          void handleCreateChannelSubmit(payload);
        }}
      />

      <SynClawManageAgentsModal
        styles={workspaceStyles}
        open={isManageAgentsModalOpen}
        aiEmployees={modalAiEmployees}
        selectedAgentIds={selectedChannelAgentIds}
        tenantEmployees={tenantMemberOptions}
        selectedTenantMembers={manageAgentsTenantMembers}
        loading={isFetchingAiEmployees || isFetchingTenantMembers}
        submitting={isSavingChannelAgents}
        onCancel={handleCloseManageAgentsModal}
        onSubmit={payload => {
          void handleSubmitManageAgents(payload);
        }}
      />
    </div>
  );
};
