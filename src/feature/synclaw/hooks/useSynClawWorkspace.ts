import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Block } from "@/types/block";
import {
  abortCoworkerChannelChatTask,
  bindCoworkerChannelAgent,
  type CoworkerChannelAbortTaskResult,
  type CoworkerChannelAgentItem,
  type CoworkerChannelBlocksResult,
  type CoworkerChannelChatTaskResult,
  type CoworkerChannelStreamCallbacks,
  type CoworkerChannelStreamConnection,
  createCoworkerChannel,
  createCoworkerChannelChatTask,
  createCoworkerChannelSpace,
  deleteCoworkerChannel,
  deleteCoworkerChannelSpace,
  getCoworkerChannelAgents,
  getCoworkerChannelBlocks,
  getCoworkerChannelBlocksSnapshot,
  getCoworkerChannelMembers,
  getCoworkerTenantMemberCandidates,
  getCoworkerChannelSpacesTree,
  replaceCoworkerChannelMembers,
  subscribeCoworkerChannelEvents,
  streamCoworkerChannelMessage,
  unbindCoworkerChannelAgent,
  updateCoworkerChannel,
  updateCoworkerChannelSpace,
  type CoworkerChannelSpaceMemberItem,
  type CoworkerChannelMemberReplaceItem,
  type CoworkerTenantMemberCandidateItem,
  type CoworkerChannelTreeSpaceItem,
} from "@/apis/CoworkerChannelApi";
import type { SynClawSpaceItem } from "@/feature/synclaw/types";

export interface CreateSynClawChannelPayload {
  spaceId: string;
  channelName: string;
  aiEmployeeIds: string[];
  tenantMembers: CoworkerChannelMemberReplaceItem[];
}

export interface CreateSynClawChannelResult {
  channelId: string;
  spaceId: string;
}

interface UseSynClawWorkspaceOptions {
  fallbackSpaces: SynClawSpaceItem[];
}

export interface UseSynClawWorkspaceResult {
  spaces: SynClawSpaceItem[];
  spacesLoading: boolean;
  spacesInitialized: boolean;
  usingFallbackSpaces: boolean;
  refreshSpaces: () => Promise<void>;
  loadSpaceMembers: (spaceId: string) => Promise<CoworkerChannelSpaceMemberItem[]>;
  loadChannelMembers: (channelId: string) => Promise<CoworkerChannelSpaceMemberItem[]>;
  loadTenantMemberCandidates: () => Promise<CoworkerTenantMemberCandidateItem[]>;
  loadChannelAgents: (channelId: string) => Promise<CoworkerChannelAgentItem[]>;
  replaceChannelMembers: (
    channelId: string,
    members: CoworkerChannelMemberReplaceItem[],
  ) => Promise<CoworkerChannelSpaceMemberItem[]>;
  bindChannelAgent: (channelId: string, agentId: string) => Promise<void>;
  unbindChannelAgent: (channelId: string, agentId: string) => Promise<void>;
  createSpace: (spaceName: string, coverUrl?: string) => Promise<void>;
  updateSpace: (spaceId: string, spaceName: string, coverUrl?: string) => Promise<void>;
  removeSpace: (spaceId: string) => Promise<void>;
  createChannel: (payload: CreateSynClawChannelPayload) => Promise<CreateSynClawChannelResult>;
  updateChannel: (spaceId: string, channelId: string, channelName: string) => Promise<void>;
  removeChannel: (spaceId: string, channelId: string) => Promise<void>;
  sendChannelChatTask: (
    channelId: string,
    params: {
      message: string;
      targetAgentIds?: string[];
      attachmentIds?: number[];
      requestId?: string;
    },
  ) => Promise<CoworkerChannelChatTaskResult>;
  abortChannelChatTask: (
    channelId: string,
    requestId: string,
  ) => Promise<CoworkerChannelAbortTaskResult>;
  streamChannelChatTask: (
    channelId: string,
    params: {
      message: string;
      targetAgentIds?: string[];
      requestId?: string;
      lastId?: string;
    },
    callbacks: CoworkerChannelStreamCallbacks,
  ) => CoworkerChannelStreamConnection;
  loadChannelBlocks: (
    channelId: string,
    params?: {
      requestId?: string;
      limit?: number;
    },
  ) => Promise<Block[]>;
  loadChannelBlocksSnapshot: (
    channelId: string,
    params?: {
      requestId?: string;
      limit?: number;
    },
  ) => Promise<CoworkerChannelBlocksResult>;
  subscribeChannelEvents: (
    channelId: string,
    params: {
      lastId?: string;
    },
    callbacks: CoworkerChannelStreamCallbacks,
  ) => CoworkerChannelStreamConnection;
}

const normalizeSpaces = (spaces: CoworkerChannelTreeSpaceItem[]): SynClawSpaceItem[] =>
  spaces.map(space => ({
    id: space.id,
    name: space.name,
    coverUrl: space.coverUrl,
    channels: space.channels.map(channel => ({
      id: channel.id,
      name: channel.name,
    })),
  }));

const createClientId = (prefix: string): string => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
};

const resolveAgentIds = (rawIds: string[]): number[] =>
  rawIds
    .map(item => Number(item))
    .filter(item => Number.isFinite(item) && item > 0)
    .map(item => Number(item));

/**
 * useSynClawWorkspace
 *
 * 统一管理 SynClaw 页面的数据副作用：
 * - 空间/频道树拉取
 * - 新建空间/频道
 * - 频道发消息（task）
 * - 频道历史 blocks 拉取
 */
export const useSynClawWorkspace = ({
  fallbackSpaces,
}: UseSynClawWorkspaceOptions): UseSynClawWorkspaceResult => {
  const [spaces, setSpaces] = useState<SynClawSpaceItem[]>(fallbackSpaces);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesInitialized, setSpacesInitialized] = useState(false);
  const [usingFallbackSpaces, setUsingFallbackSpaces] = useState(true);
  const fallbackSpacesRef = useRef<SynClawSpaceItem[]>(fallbackSpaces);

  useEffect(() => {
    fallbackSpacesRef.current = fallbackSpaces;
  }, [fallbackSpaces]);

  const refreshSpaces = useCallback(async (): Promise<void> => {
    setSpacesLoading(true);
    try {
      const response = await getCoworkerChannelSpacesTree();
      const nextSpaces = normalizeSpaces(response);
      setSpaces(nextSpaces);
      setUsingFallbackSpaces(false);
    } catch {
      setSpaces(prev => (prev.length ? prev : fallbackSpacesRef.current));
      setUsingFallbackSpaces(true);
      throw new Error("FETCH_SYNCLAW_SPACES_FAILED");
    } finally {
      setSpacesLoading(false);
      setSpacesInitialized(true);
    }
  }, []);

  const createSpace = useCallback(
    async (spaceName: string, coverUrl?: string): Promise<void> => {
      await createCoworkerChannelSpace({
        channelSpaceId: createClientId("space"),
        name: spaceName,
        cover: coverUrl,
        status: "active",
      });
      await refreshSpaces();
    },
    [refreshSpaces],
  );

  const updateSpace = useCallback(
    async (spaceId: string, spaceName: string, coverUrl?: string): Promise<void> => {
      await updateCoworkerChannelSpace(spaceId, {
        name: spaceName,
        cover: coverUrl,
        status: "active",
      });
      await refreshSpaces();
    },
    [refreshSpaces],
  );

  const removeSpace = useCallback(
    async (spaceId: string): Promise<void> => {
      await deleteCoworkerChannelSpace(spaceId);
      await refreshSpaces();
    },
    [refreshSpaces],
  );

  const createChannel = useCallback(
    async (payload: CreateSynClawChannelPayload): Promise<CreateSynClawChannelResult> => {
      const channelId = createClientId("channel");
      await createCoworkerChannel({
        channelSpaceId: payload.spaceId,
        channelId,
        name: payload.channelName,
        dispatchMode: "default",
        agentTriggerMode: "auto_single_ai",
        allowBots: true,
        status: "active",
      });

      const numericAgentIds = resolveAgentIds(payload.aiEmployeeIds);
      if (numericAgentIds.length) {
        await Promise.all(
          numericAgentIds.map(agentId =>
            bindCoworkerChannelAgent({
              channelId,
              agentId,
              status: "active",
            }),
          ),
        );
      }

      if (payload.tenantMembers.length) {
        await replaceCoworkerChannelMembers(channelId, payload.tenantMembers);
      }

      await refreshSpaces();
      return {
        channelId,
        spaceId: payload.spaceId,
      };
    },
    [refreshSpaces],
  );

  const updateChannel = useCallback(
    async (spaceId: string, channelId: string, channelName: string): Promise<void> => {
      await updateCoworkerChannel(spaceId, channelId, {
        name: channelName,
        status: "active",
      });
      await refreshSpaces();
    },
    [refreshSpaces],
  );

  const removeChannel = useCallback(
    async (spaceId: string, channelId: string): Promise<void> => {
      await deleteCoworkerChannel(spaceId, channelId);
      await refreshSpaces();
    },
    [refreshSpaces],
  );

  const sendChannelChatTask = useCallback(
    async (
      channelId: string,
      params: {
        message: string;
        targetAgentIds?: string[];
        attachmentIds?: number[];
        requestId?: string;
      },
    ): Promise<CoworkerChannelChatTaskResult> => {
      return createCoworkerChannelChatTask(channelId, {
        message: params.message,
        requestId: params.requestId?.trim() || createClientId("request"),
        targetAgentIds: params.targetAgentIds,
        attachmentIds: params.attachmentIds,
      });
    },
    [],
  );

  const abortChannelChatTask = useCallback(
    async (channelId: string, requestId: string): Promise<CoworkerChannelAbortTaskResult> => {
      return abortCoworkerChannelChatTask(channelId, requestId.trim());
    },
    [],
  );

  const loadChannelBlocks = useCallback(
    async (
      channelId: string,
      params?: {
        requestId?: string;
        limit?: number;
      },
    ): Promise<Block[]> => {
      return getCoworkerChannelBlocks(channelId, {
        limit: params?.limit ?? 100,
        requestId: params?.requestId,
      });
    },
    [],
  );

  const loadChannelBlocksSnapshot = useCallback(
    async (
      channelId: string,
      params?: {
        requestId?: string;
        limit?: number;
      },
    ): Promise<CoworkerChannelBlocksResult> => {
      return getCoworkerChannelBlocksSnapshot(channelId, {
        limit: params?.limit ?? 100,
        requestId: params?.requestId,
      });
    },
    [],
  );

  const loadSpaceMembers = useCallback(
    async (spaceId: string): Promise<CoworkerChannelSpaceMemberItem[]> => {
      if (!spaceId.trim()) return [];
      return [];
    },
    [],
  );

  const loadChannelMembers = useCallback(
    async (channelId: string): Promise<CoworkerChannelSpaceMemberItem[]> => {
      if (!channelId.trim()) return [];
      return getCoworkerChannelMembers(channelId);
    },
    [],
  );

  const loadTenantMemberCandidates = useCallback(async (): Promise<
    CoworkerTenantMemberCandidateItem[]
  > => {
    return getCoworkerTenantMemberCandidates();
  }, []);

  const loadChannelAgents = useCallback(
    async (channelId: string): Promise<CoworkerChannelAgentItem[]> => {
      if (!channelId.trim()) return [];
      return getCoworkerChannelAgents(channelId);
    },
    [],
  );

  const replaceChannelMembers = useCallback(
    async (
      channelId: string,
      members: CoworkerChannelMemberReplaceItem[],
    ): Promise<CoworkerChannelSpaceMemberItem[]> => {
      if (!channelId.trim()) return [];
      return replaceCoworkerChannelMembers(channelId, members);
    },
    [],
  );

  const streamChannelChatTask = useCallback(
    (
      channelId: string,
      params: {
        message: string;
        targetAgentIds?: string[];
        requestId?: string;
        lastId?: string;
      },
      callbacks: CoworkerChannelStreamCallbacks,
    ): CoworkerChannelStreamConnection => {
      return streamCoworkerChannelMessage(channelId, params, callbacks);
    },
    [],
  );

  const subscribeChannelEvents = useCallback(
    (
      channelId: string,
      params: {
        lastId?: string;
      },
      callbacks: CoworkerChannelStreamCallbacks,
    ): CoworkerChannelStreamConnection => {
      return subscribeCoworkerChannelEvents(channelId, params, callbacks);
    },
    [],
  );

  const bindChannelAgent = useCallback(
    async (channelId: string, agentId: string): Promise<void> => {
      const numericAgentId = Number(agentId);
      if (!Number.isFinite(numericAgentId) || numericAgentId <= 0) {
        throw new Error("INVALID_AGENT_ID");
      }
      await bindCoworkerChannelAgent({
        channelId,
        agentId: numericAgentId,
        status: "active",
      });
    },
    [],
  );

  const unbindChannelAgent = useCallback(
    async (channelId: string, agentId: string): Promise<void> => {
      const numericAgentId = Number(agentId);
      if (!Number.isFinite(numericAgentId) || numericAgentId <= 0) {
        throw new Error("INVALID_AGENT_ID");
      }
      await unbindCoworkerChannelAgent({
        channelId,
        agentId: numericAgentId,
      });
    },
    [],
  );

  useEffect(() => {
    void refreshSpaces().catch(() => undefined);
  }, [refreshSpaces]);

  return useMemo(
    () => ({
      spaces,
      spacesLoading,
      spacesInitialized,
      usingFallbackSpaces,
      refreshSpaces,
      loadSpaceMembers,
      loadChannelMembers,
      loadTenantMemberCandidates,
      loadChannelAgents,
      replaceChannelMembers,
      bindChannelAgent,
      unbindChannelAgent,
      createSpace,
      updateSpace,
      removeSpace,
      createChannel,
      updateChannel,
      removeChannel,
      sendChannelChatTask,
      abortChannelChatTask,
      subscribeChannelEvents,
      streamChannelChatTask,
      loadChannelBlocks,
      loadChannelBlocksSnapshot,
    }),
    [
      createChannel,
      createSpace,
      abortChannelChatTask,
      bindChannelAgent,
      updateChannel,
      updateSpace,
      removeChannel,
      loadChannelAgents,
      loadTenantMemberCandidates,
      removeSpace,
      replaceChannelMembers,
      unbindChannelAgent,
      loadChannelMembers,
      loadSpaceMembers,
      loadChannelBlocks,
      loadChannelBlocksSnapshot,
      refreshSpaces,
      sendChannelChatTask,
      subscribeChannelEvents,
      streamChannelChatTask,
      spaces,
      spacesLoading,
      spacesInitialized,
      usingFallbackSpaces,
    ],
  );
};
