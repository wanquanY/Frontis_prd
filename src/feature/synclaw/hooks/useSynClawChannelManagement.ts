import { useCallback, useState } from "react";

import type { ModalFuncProps } from "antd";

import { getAdminAiEmployeeList } from "@/apis/AdminAiEmployeeApi";
import type { CoworkerChannelMemberReplaceItem } from "@/apis/CoworkerChannelApi";
import type { UseSynClawWorkspaceResult } from "@/feature/synclaw/hooks/useSynClawWorkspace";
import {
  type SynClawAiEmployee,
  type SynClawChannelModalMode,
  type SynClawCurrentUser,
  type SynClawCreateChannelSubmitPayload,
  type SynClawTenantMemberOption,
  type SynClawTenantMemberSelection,
} from "@/feature/synclaw/types/page";
import {
  buildChannelMemberSelectionSnapshot,
  normalizeSelectedTenantMembers,
  normalizeTenantMemberOptions,
  resolveActionErrorMessage,
  resolveAiEmployeeDisabledReason,
} from "@/feature/synclaw/utils/pageHelpers";

interface UseSynClawChannelManagementParams extends Pick<
  UseSynClawWorkspaceResult,
  | "bindChannelAgent"
  | "createChannel"
  | "loadChannelAgents"
  | "loadChannelMembers"
  | "loadTenantMemberCandidates"
  | "removeChannel"
  | "replaceChannelMembers"
  | "unbindChannelAgent"
  | "updateChannel"
> {
  activeChannelId?: string;
  currentUser?: SynClawCurrentUser;
  selectedChannelAgentIds: string[];
  refreshActiveChannelRoster: () => Promise<void>;
  onExpandSpace: (spaceId: string) => void;
  onSelectCreatedChannel?: (spaceId: string, channelId: string) => void;
  onDeleteChannelSuccess?: (spaceId: string, channelId: string) => void;
  showConfirm: (config: ModalFuncProps) => void;
  onMessageSuccess: (content: string) => void;
  onMessageError: (content: string) => void;
  onMessageWarning: (content: string) => void;
  onAiEmployeesChange?: (employees: SynClawAiEmployee[]) => void;
}

interface UseSynClawChannelManagementResult {
  channelModalMode: SynClawChannelModalMode;
  isCreateChannelModalOpen: boolean;
  isCreatingChannel: boolean;
  createChannelDefaultSpaceId?: string;
  editingChannelName: string;
  editingChannelAgentIds: string[];
  editingChannelTenantMembers: SynClawTenantMemberSelection[];
  aiEmployees: SynClawAiEmployee[];
  isFetchingAiEmployees: boolean;
  tenantMemberOptions: SynClawTenantMemberOption[];
  isFetchingTenantMembers: boolean;
  isManageAgentsModalOpen: boolean;
  isSavingChannelAgents: boolean;
  manageAgentsTenantMembers: SynClawTenantMemberSelection[];
  handleOpenCreateChannel: (spaceId: string) => void;
  handleRenameChannel: (spaceId: string, channelId: string, channelName: string) => void;
  handleDeleteChannel: (spaceId: string, channelId: string, channelName: string) => void;
  handleCreateChannelCancel: () => void;
  handleCreateChannelSubmit: (payload: SynClawCreateChannelSubmitPayload) => Promise<void>;
  handleOpenManageAgentsModal: () => void;
  handleCloseManageAgentsModal: () => void;
  handleSubmitManageAgents: (payload: {
    agentIds: string[];
    tenantMembers: SynClawTenantMemberSelection[];
  }) => Promise<void>;
}

/**
 * 管理 SynClaw 频道相关交互：
 * - 频道创建/编辑/删除
 * - 频道成员（AI 员工 + 租户成员）维护
 * - 频道弹窗与候选列表加载状态
 */
export const useSynClawChannelManagement = ({
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
  onExpandSpace,
  onSelectCreatedChannel,
  onDeleteChannelSuccess,
  showConfirm,
  onMessageSuccess,
  onMessageError,
  onMessageWarning,
  onAiEmployeesChange,
}: UseSynClawChannelManagementParams): UseSynClawChannelManagementResult => {
  const [channelModalMode, setChannelModalMode] = useState<SynClawChannelModalMode>("create");
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [createChannelDefaultSpaceId, setCreateChannelDefaultSpaceId] = useState<
    string | undefined
  >(undefined);
  const [editingChannel, setEditingChannel] = useState<
    { spaceId: string; channelId: string } | undefined
  >(undefined);
  const [editingChannelName, setEditingChannelName] = useState("");
  const [editingChannelAgentIds, setEditingChannelAgentIds] = useState<string[]>([]);
  const [editingChannelTenantMembers, setEditingChannelTenantMembers] = useState<
    SynClawTenantMemberSelection[]
  >([]);
  const [aiEmployees, setAiEmployees] = useState<SynClawAiEmployee[]>([]);
  const [isFetchingAiEmployees, setIsFetchingAiEmployees] = useState(false);
  const [tenantMemberOptions, setTenantMemberOptions] = useState<SynClawTenantMemberOption[]>([]);
  const [isFetchingTenantMembers, setIsFetchingTenantMembers] = useState(false);
  const [isManageAgentsModalOpen, setIsManageAgentsModalOpen] = useState(false);
  const [isSavingChannelAgents, setIsSavingChannelAgents] = useState(false);
  const [manageAgentsTenantMembers, setManageAgentsTenantMembers] = useState<
    SynClawTenantMemberSelection[]
  >([]);

  const resetChannelModalState = useCallback(() => {
    setChannelModalMode("create");
    setEditingChannel(undefined);
    setEditingChannelName("");
    setEditingChannelAgentIds([]);
    setEditingChannelTenantMembers([]);
    setCreateChannelDefaultSpaceId(undefined);
  }, []);

  const fetchAiEmployees = useCallback(async (): Promise<void> => {
    setIsFetchingAiEmployees(true);
    try {
      const response = await getAdminAiEmployeeList({
        source: "coworker",
        visible_only: true,
        skip: 0,
        limit: 200,
      });
      const dedupedEmployees = new Map<string, SynClawAiEmployee>();
      response.items.forEach(item => {
        if (item.source !== "coworker" || !item.managed_by_coworker) return;
        if (typeof item.coworker_agent_id !== "number" || item.coworker_agent_id <= 0) return;
        const role = item.role ?? item.agent_code ?? item.description ?? "AI员工";
        const bindableId = String(item.coworker_agent_id);
        if (!bindableId) return;
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
      const nextAiEmployees = Array.from(dedupedEmployees.values());
      setAiEmployees(nextAiEmployees);
      onAiEmployeesChange?.(nextAiEmployees);
    } catch (error) {
      const errorMessage = resolveActionErrorMessage(error, "获取 AI 员工列表失败");
      onMessageError(errorMessage);
      setAiEmployees([]);
      onAiEmployeesChange?.([]);
    } finally {
      setIsFetchingAiEmployees(false);
    }
  }, [onAiEmployeesChange, onMessageError]);

  const fetchTenantMemberOptions = useCallback(async (): Promise<void> => {
    setIsFetchingTenantMembers(true);
    try {
      const items = await loadTenantMemberCandidates();
      setTenantMemberOptions(normalizeTenantMemberOptions(items));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "获取租户员工失败";
      onMessageError(errorMessage);
      setTenantMemberOptions([]);
    } finally {
      setIsFetchingTenantMembers(false);
    }
  }, [loadTenantMemberCandidates, onMessageError]);

  const handleOpenCreateChannel = useCallback(
    (spaceId: string): void => {
      setChannelModalMode("create");
      setEditingChannel(undefined);
      setEditingChannelName("");
      setEditingChannelAgentIds([]);
      setEditingChannelTenantMembers([]);
      setCreateChannelDefaultSpaceId(spaceId);
      setIsCreateChannelModalOpen(true);
      void fetchAiEmployees();
      void fetchTenantMemberOptions();
    },
    [fetchAiEmployees, fetchTenantMemberOptions],
  );

  const handleRenameChannel = useCallback(
    (spaceId: string, channelId: string, channelName: string): void => {
      setChannelModalMode("rename");
      setEditingChannel({ spaceId, channelId });
      setEditingChannelName(channelName);
      setEditingChannelAgentIds([]);
      setEditingChannelTenantMembers([]);
      setCreateChannelDefaultSpaceId(spaceId);
      void fetchAiEmployees();
      void fetchTenantMemberOptions();
      void loadChannelAgents(channelId)
        .then(agentItems => {
          setEditingChannelAgentIds(agentItems.map(item => item.agentId).filter(Boolean));
        })
        .catch(() => {
          onMessageError("获取频道 AI 员工失败，请稍后再试");
          setEditingChannelAgentIds([]);
        });
      void loadChannelMembers(channelId)
        .then(memberItems => {
          setEditingChannelTenantMembers(normalizeSelectedTenantMembers(memberItems, currentUser));
        })
        .catch(() => {
          onMessageError("获取频道员工失败，请稍后再试");
          setEditingChannelTenantMembers([]);
        });
      setIsCreateChannelModalOpen(true);
    },
    [
      currentUser,
      fetchAiEmployees,
      fetchTenantMemberOptions,
      loadChannelAgents,
      loadChannelMembers,
      onMessageError,
    ],
  );

  const handleDeleteChannel = useCallback(
    (spaceId: string, channelId: string, channelName: string): void => {
      showConfirm({
        title: "删除频道",
        content: `确认删除频道“${channelName}”吗？删除后无法恢复。`,
        centered: true,
        okText: "删除",
        okButtonProps: { danger: true },
        cancelText: "取消",
        onOk: async () => {
          try {
            await removeChannel(spaceId, channelId);
            onDeleteChannelSuccess?.(spaceId, channelId);
            onMessageSuccess("频道已删除");
          } catch {
            onMessageError("删除频道失败，请稍后再试");
          }
        },
      });
    },
    [onDeleteChannelSuccess, onMessageError, onMessageSuccess, removeChannel, showConfirm],
  );

  const handleCreateChannelCancel = useCallback((): void => {
    if (isCreatingChannel) return;
    setIsCreateChannelModalOpen(false);
    resetChannelModalState();
  }, [isCreatingChannel, resetChannelModalState]);

  const handleCreateChannelSubmit = useCallback(
    async (payload: SynClawCreateChannelSubmitPayload): Promise<void> => {
      if (isCreatingChannel) return;
      const channelName = payload.channelName.trim();
      if (!channelName) {
        onMessageWarning("请输入频道名称");
        return;
      }

      setIsCreatingChannel(true);
      try {
        if (channelModalMode === "rename") {
          if (!editingChannel) {
            onMessageError("当前频道不存在，无法编辑");
            return;
          }
          await updateChannel(editingChannel.spaceId, editingChannel.channelId, channelName);
          const currentAgentIds = (await loadChannelAgents(editingChannel.channelId))
            .map(item => item.agentId)
            .filter(Boolean);
          const currentTenantMembers = normalizeSelectedTenantMembers(
            await loadChannelMembers(editingChannel.channelId),
            currentUser,
          );
          const nextAgentIds = Array.from(new Set(payload.aiEmployeeIds.filter(Boolean)));
          const currentAgentIdSet = new Set(currentAgentIds);
          const nextAgentIdSet = new Set(nextAgentIds);
          const agentIdsToAdd = nextAgentIds.filter(agentId => !currentAgentIdSet.has(agentId));
          const agentIdsToRemove = currentAgentIds.filter(agentId => !nextAgentIdSet.has(agentId));
          await Promise.all([
            ...agentIdsToAdd.map(agentId => bindChannelAgent(editingChannel.channelId, agentId)),
            ...agentIdsToRemove.map(agentId =>
              unbindChannelAgent(editingChannel.channelId, agentId),
            ),
          ]);
          const currentTenantMembersKey = buildChannelMemberSelectionSnapshot(currentTenantMembers);
          const nextTenantMembersKey = buildChannelMemberSelectionSnapshot(payload.tenantMembers);
          if (currentTenantMembersKey !== nextTenantMembersKey) {
            await replaceChannelMembers(editingChannel.channelId, payload.tenantMembers);
          }
          if (activeChannelId === editingChannel.channelId) {
            await refreshActiveChannelRoster();
          }
          onExpandSpace(editingChannel.spaceId);
        } else {
          const createdChannel = await createChannel({
            ...payload,
            channelName,
          });
          onExpandSpace(payload.spaceId);
          onSelectCreatedChannel?.(createdChannel.spaceId, createdChannel.channelId);
        }

        setIsCreateChannelModalOpen(false);
        resetChannelModalState();
        onMessageSuccess(channelModalMode === "rename" ? "频道已编辑" : "频道已创建");
      } catch (error) {
        onMessageError(
          resolveActionErrorMessage(
            error,
            channelModalMode === "rename" ? "编辑频道失败，请稍后再试" : "创建频道失败，请稍后再试",
          ),
        );
      } finally {
        setIsCreatingChannel(false);
      }
    },
    [
      activeChannelId,
      bindChannelAgent,
      channelModalMode,
      createChannel,
      currentUser,
      editingChannel,
      isCreatingChannel,
      loadChannelAgents,
      loadChannelMembers,
      onExpandSpace,
      onSelectCreatedChannel,
      onMessageError,
      onMessageSuccess,
      onMessageWarning,
      refreshActiveChannelRoster,
      replaceChannelMembers,
      resetChannelModalState,
      unbindChannelAgent,
      updateChannel,
    ],
  );

  const handleOpenManageAgentsModal = useCallback((): void => {
    if (!activeChannelId) return;
    setIsManageAgentsModalOpen(true);
    void fetchAiEmployees();
    void fetchTenantMemberOptions();
    void loadChannelMembers(activeChannelId)
      .then(memberItems => {
        setManageAgentsTenantMembers(normalizeSelectedTenantMembers(memberItems, currentUser));
      })
      .catch(() => {
        onMessageError("获取频道员工失败，请稍后再试");
        setManageAgentsTenantMembers([]);
      });
  }, [
    activeChannelId,
    currentUser,
    fetchAiEmployees,
    fetchTenantMemberOptions,
    loadChannelMembers,
    onMessageError,
  ]);

  const handleCloseManageAgentsModal = useCallback((): void => {
    if (isSavingChannelAgents) return;
    setIsManageAgentsModalOpen(false);
    setManageAgentsTenantMembers([]);
  }, [isSavingChannelAgents]);

  const handleSubmitManageAgents = useCallback(
    async (payload: {
      agentIds: string[];
      tenantMembers: SynClawTenantMemberSelection[];
    }): Promise<void> => {
      if (!activeChannelId || isSavingChannelAgents) return;

      const currentAgentIdSet = new Set(selectedChannelAgentIds);
      const nextAgentIdSet = new Set(payload.agentIds);
      const agentIdsToAdd = payload.agentIds.filter(agentId => !currentAgentIdSet.has(agentId));
      const agentIdsToRemove = selectedChannelAgentIds.filter(
        agentId => !nextAgentIdSet.has(agentId),
      );

      setIsSavingChannelAgents(true);
      try {
        await Promise.all([
          ...agentIdsToAdd.map(agentId => bindChannelAgent(activeChannelId, agentId)),
          ...agentIdsToRemove.map(agentId => unbindChannelAgent(activeChannelId, agentId)),
        ]);
        await replaceChannelMembers(
          activeChannelId,
          payload.tenantMembers.map<CoworkerChannelMemberReplaceItem>(item => ({
            identityId: item.identityId,
            accessRole: item.accessRole,
          })),
        );
        await refreshActiveChannelRoster();
        setIsManageAgentsModalOpen(false);
        onMessageSuccess("频道成员已更新");
      } catch (error) {
        onMessageError(resolveActionErrorMessage(error, "更新频道成员失败，请稍后再试"));
      } finally {
        setIsSavingChannelAgents(false);
      }
    },
    [
      activeChannelId,
      bindChannelAgent,
      isSavingChannelAgents,
      onMessageError,
      onMessageSuccess,
      refreshActiveChannelRoster,
      replaceChannelMembers,
      selectedChannelAgentIds,
      unbindChannelAgent,
    ],
  );

  return {
    channelModalMode,
    isCreateChannelModalOpen,
    isCreatingChannel,
    createChannelDefaultSpaceId,
    editingChannelName,
    editingChannelAgentIds,
    editingChannelTenantMembers,
    aiEmployees,
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
  };
};
