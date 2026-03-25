import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { useComposerAttachments } from "@/feature/chat/hooks/useComposerAttachments";
import type { SynClawMemberItem } from "@/feature/synclaw/components/SynClawChatHeader";
import type {
  SynClawAiEmployee,
  SynClawCurrentUser,
  SynClawMentionAgent,
} from "@/feature/synclaw/types/page";
import type { SynClawSpaceItem } from "@/feature/synclaw/types";
import type { UseSynClawWorkspaceResult } from "@/feature/synclaw/hooks/useSynClawWorkspace";
import type {
  WorkspaceComposerAttachmentItem,
  WorkspaceComposerMentionOption,
} from "@/feature/workspace/types";
import {
  DEFAULT_CHAT_PLACEHOLDER,
  buildActorNameAliases,
  buildMentionAgents,
  mergeCurrentUserMember,
  normalizeSpaceMembers,
  resolveMentionPayload,
} from "@/feature/synclaw/utils/pageHelpers";
import { BlockAggregator, type Block, type BlockEvent } from "@/types/block";
import type { RequestAbortReason } from "@/utils/requestAbort";

const PENDING_CHAT_REQUEST_STORAGE_KEY = "synclaw:channelPendingRequests";
const PENDING_CHAT_REQUEST_TTL_MS = 1000 * 60 * 60 * 12;

interface StoredPendingChatRequestEntry {
  requestId: string;
  updatedAt: number;
}

interface StoredPendingChatRequestMap {
  [channelId: string]: StoredPendingChatRequestEntry[];
}

const readStoredPendingChatRequests = (channelId?: string): string[] => {
  if (!channelId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_CHAT_REQUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const channelEntries = (parsed as StoredPendingChatRequestMap)[channelId];
    if (!Array.isArray(channelEntries)) return [];
    const now = Date.now();
    return channelEntries
      .filter(entry => {
        if (!entry || typeof entry !== "object") return false;
        if (typeof entry.requestId !== "string" || !entry.requestId.trim()) return false;
        if (typeof entry.updatedAt !== "number" || !Number.isFinite(entry.updatedAt)) return false;
        return now - entry.updatedAt <= PENDING_CHAT_REQUEST_TTL_MS;
      })
      .map(entry => entry.requestId.trim());
  } catch {
    return [];
  }
};

const persistStoredPendingChatRequests = (
  channelId: string,
  requestIds: Iterable<string>,
): void => {
  if (!channelId || typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(PENDING_CHAT_REQUEST_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    const nextMap: StoredPendingChatRequestMap =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? { ...(parsed as StoredPendingChatRequestMap) }
        : {};
    const now = Date.now();

    Object.entries(nextMap).forEach(([key, entries]) => {
      if (!Array.isArray(entries)) {
        delete nextMap[key];
        return;
      }
      nextMap[key] = entries.filter(entry => {
        if (!entry || typeof entry !== "object") return false;
        if (typeof entry.requestId !== "string" || !entry.requestId.trim()) return false;
        if (typeof entry.updatedAt !== "number" || !Number.isFinite(entry.updatedAt)) return false;
        return now - entry.updatedAt <= PENDING_CHAT_REQUEST_TTL_MS;
      });
      if (nextMap[key].length === 0) {
        delete nextMap[key];
      }
    });

    const normalizedRequestIds = [
      ...new Set([...requestIds].map(item => item.trim()).filter(Boolean)),
    ];
    if (normalizedRequestIds.length > 0) {
      nextMap[channelId] = normalizedRequestIds.map(requestId => ({
        requestId,
        updatedAt: now,
      }));
    } else {
      delete nextMap[channelId];
    }

    window.localStorage.setItem(PENDING_CHAT_REQUEST_STORAGE_KEY, JSON.stringify(nextMap));
  } catch {
    // Ignore storage failures and keep in-memory behavior working.
  }
};

const isAbortedErrorBlockEvent = (event: BlockEvent): boolean => {
  if (event.kind !== "error") return false;
  const message =
    typeof event.data.message === "string" ? event.data.message.trim().toLowerCase() : "";
  if (!message) return false;
  return message.includes("aborted") || message.includes("已停止");
};

const closeChannelStream = (
  connection:
    | {
        close: (reason?: RequestAbortReason) => void;
      }
    | null
    | undefined,
  reason: RequestAbortReason,
): void => {
  connection?.close(reason);
};

const visitBlocks = (blocks: Block[], visitor: (block: Block) => void): void => {
  blocks.forEach(block => {
    visitor(block);
    if (Array.isArray(block.children) && block.children.length > 0) {
      visitBlocks(block.children, visitor);
    }
  });
};

const collectTerminalInvocationIds = (blocks: Block[]): Set<string> => {
  const terminalInvocationIds = new Set<string>();

  visitBlocks(blocks, block => {
    const invocationId = block.invocationId?.trim();
    if (!invocationId) return;

    if (block.kind === "error") {
      terminalInvocationIds.add(invocationId);
      return;
    }

    if (block.kind === "text") {
      const status =
        typeof block.data.status === "string" ? block.data.status.trim().toLowerCase() : "";
      if (
        status === "done" ||
        status === "completed" ||
        status === "failed" ||
        status === "aborted"
      ) {
        terminalInvocationIds.add(invocationId);
      }
    }
  });

  return terminalInvocationIds;
};

interface UseSynClawChannelRuntimeParams extends Pick<
  UseSynClawWorkspaceResult,
  | "loadChannelMembers"
  | "loadSpaceMembers"
  | "loadChannelAgents"
  | "loadChannelBlocks"
  | "loadChannelBlocksSnapshot"
  | "subscribeChannelEvents"
  | "sendChannelChatTask"
  | "abortChannelChatTask"
> {
  activeChannelId?: string;
  activeSpaceId: string;
  spaces: SynClawSpaceItem[];
  currentUser?: SynClawCurrentUser;
  /**
   * Deep-link 场景（例如自动化任务跳转到 SynClaw）携带的 request_id。
   * 用于补齐指定 request 的历史 blocks（避免被默认 limit 截断）。
   */
  deepLinkRequestId?: string;
  refreshArtifacts: () => void;
  aiEmployees?: SynClawAiEmployee[];
  onMessageError: (content: string) => void;
  onMessageWarning: (content: string) => void;
}

interface UseSynClawChannelRuntimeResult {
  spaceMembers: SynClawMemberItem[];
  spaceMembersLoading: boolean;
  channelAgents: ReturnType<UseSynClawWorkspaceResult["loadChannelAgents"]> extends Promise<
    infer TData
  >
    ? TData
    : never;
  chatBlocks: Block[];
  chatInputValue: string;
  composerAttachments: WorkspaceComposerAttachmentItem[];
  isSendingChat: boolean;
  composerFocusKey: number;
  mentionAgents: SynClawMentionAgent[];
  composerMentionOptions: WorkspaceComposerMentionOption[];
  mentionableActorLabels: Record<string, string>;
  actorAvatars: Record<string, { icon?: string; name?: string }>;
  selectedChannelAgentIds: string[];
  canCurrentUserSpeak: boolean;
  composerPlaceholder: string;
  isChannelWorkspaceReady: boolean;
  setChatInputValue: (value: string) => void;
  handleComposerAttachmentsSelected: (files?: FileList | File[] | null) => void;
  handleRemoveComposerAttachment: (uid: string) => void;
  refreshActiveChannelRoster: () => Promise<void>;
  handleSendChat: () => void;
  handleAbortChat: () => Promise<void>;
  handleComposerKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  handleInsertActorMention: (actorName: string) => void;
}

const isCompletedAttachment = (
  item: WorkspaceComposerAttachmentItem,
): item is WorkspaceComposerAttachmentItem & { id: number } =>
  item.status === "done" && typeof item.id === "number" && Number.isFinite(item.id);

const normalizeMentionKey = (value: string): string => value.trim().toLowerCase();

const buildMentionKeyCountMap = (values: string[]): Map<string, number> => {
  const countMap = new Map<string, number>();
  values
    .map(item => item.trim())
    .filter(Boolean)
    .forEach(item => {
      const normalizedKey = normalizeMentionKey(item);
      countMap.set(normalizedKey, (countMap.get(normalizedKey) ?? 0) + 1);
    });
  return countMap;
};

const buildMentionLabelWithSuffix = (label: string, fallbackId: string): string => {
  const normalizedLabel = label.trim() || "actor";
  const normalizedFallbackId = fallbackId.trim() || "actor";
  const suffix = normalizedFallbackId.slice(-4) || normalizedFallbackId;
  return `${normalizedLabel}-${suffix}`;
};

const pickUniqueMentionLabel = (
  baseLabel: string,
  alternativeLabels: Array<string | undefined>,
  duplicateCountMap: Map<string, number>,
  usedLabelKeys: Set<string>,
  fallbackId: string,
): string => {
  const normalizedBaseLabel = baseLabel.trim();
  const candidateLabels =
    (duplicateCountMap.get(normalizeMentionKey(normalizedBaseLabel)) ?? 0) <= 1
      ? [normalizedBaseLabel, ...alternativeLabels]
      : alternativeLabels;

  for (const candidate of candidateLabels) {
    const trimmedCandidate = candidate?.trim();
    if (!trimmedCandidate) continue;
    const normalizedCandidateKey = normalizeMentionKey(trimmedCandidate);
    if (usedLabelKeys.has(normalizedCandidateKey)) continue;
    usedLabelKeys.add(normalizedCandidateKey);
    return trimmedCandidate;
  }

  let fallbackLabel = buildMentionLabelWithSuffix(normalizedBaseLabel, fallbackId);
  let fallbackKey = normalizeMentionKey(fallbackLabel);
  let duplicateIndex = 2;
  while (usedLabelKeys.has(fallbackKey)) {
    fallbackLabel = `${buildMentionLabelWithSuffix(normalizedBaseLabel, fallbackId)}-${duplicateIndex}`;
    fallbackKey = normalizeMentionKey(fallbackLabel);
    duplicateIndex += 1;
  }
  usedLabelKeys.add(fallbackKey);
  return fallbackLabel;
};

const appendActorMention = (value: string, actorName: string): string => {
  const normalizedActorName = actorName.trim();
  if (!normalizedActorName) return value;
  if (!value.trim()) {
    return `@${normalizedActorName} `;
  }
  if (/[ \n]$/.test(value)) {
    return `${value}@${normalizedActorName} `;
  }
  return `${value} @${normalizedActorName} `;
};

/**
 * 管理 SynClaw 频道运行态：
 * - 频道成员/Agent/消息流拉取与同步
 * - @Agent 解析与消息发送
 * - 聊天区展示态（blocks、输入框、发送状态）维护
 */
export const useSynClawChannelRuntime = ({
  activeChannelId,
  activeSpaceId,
  spaces,
  currentUser,
  deepLinkRequestId,
  loadChannelMembers,
  loadSpaceMembers,
  loadChannelAgents,
  loadChannelBlocks,
  loadChannelBlocksSnapshot,
  subscribeChannelEvents,
  sendChannelChatTask,
  abortChannelChatTask,
  refreshArtifacts,
  aiEmployees = [],
  onMessageError,
  onMessageWarning,
}: UseSynClawChannelRuntimeParams): UseSynClawChannelRuntimeResult => {
  const [spaceMembers, setSpaceMembers] = useState<SynClawMemberItem[]>([]);
  const [spaceMembersLoading, setSpaceMembersLoading] = useState(false);
  const [channelAgents, setChannelAgents] = useState<
    ReturnType<UseSynClawWorkspaceResult["loadChannelAgents"]> extends Promise<infer TData>
      ? TData
      : never
  >([]);
  const [chatBlocks, setChatBlocks] = useState<Block[]>([]);
  const [chatInputValue, setChatInputValue] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [composerFocusKey, setComposerFocusKey] = useState(0);
  const [channelMembersReady, setChannelMembersReady] = useState(false);
  const [channelHistoryReady, setChannelHistoryReady] = useState(false);

  const activeChannelStreamRef = useRef<ReturnType<
    UseSynClawWorkspaceResult["subscribeChannelEvents"]
  > | null>(null);
  const activeChannelAggregatorRef = useRef<BlockAggregator | null>(null);
  const pendingRequestIdsRef = useRef<Set<string>>(new Set());
  const abortingRequestIdsRef = useRef<Set<string>>(new Set());
  const artifactRefreshTimersRef = useRef<number[]>([]);
  const {
    composerAttachments,
    handleComposerAttachmentsSelected,
    handleRemoveComposerAttachment,
    resetComposerAttachments,
  } = useComposerAttachments({
    disabled: isSendingChat,
  });

  const mentionAgents = useMemo(
    () => buildMentionAgents(channelAgents, spaceMembers, aiEmployees),
    [aiEmployees, channelAgents, spaceMembers],
  );

  const actorAvatars = useMemo<Record<string, { icon?: string; name?: string }>>(() => {
    const avatars: Record<string, { icon?: string; name?: string }> = {};

    spaceMembers.forEach(member => {
      buildActorNameAliases(member.id).forEach(alias => {
        avatars[alias] = {
          icon: member.avatarUrl,
          name: member.name,
        };
      });
    });

    channelAgents.forEach(agent => {
      const displayName = agent.displayName?.trim() || agent.alias?.trim() || "";
      const avatarEntry = {
        icon: agent.avatarUrl,
        name: displayName || undefined,
      };

      buildActorNameAliases(agent.agentId).forEach(alias => {
        avatars[alias] = {
          ...avatars[alias],
          ...avatarEntry,
        };
      });

      if (displayName) {
        avatars[displayName] = {
          ...avatars[displayName],
          ...avatarEntry,
        };
      }
    });

    aiEmployees.forEach(employee => {
      const avatarEntry = {
        icon: employee.avatarUrl,
        name: employee.name,
      };

      buildActorNameAliases(employee.id).forEach(alias => {
        avatars[alias] = {
          ...avatars[alias],
          ...avatarEntry,
        };
      });

      if (employee.runtimeAgentId?.trim()) {
        buildActorNameAliases(employee.runtimeAgentId.trim()).forEach(alias => {
          avatars[alias] = {
            ...avatars[alias],
            ...avatarEntry,
          };
        });
      }

      if (employee.name.trim()) {
        avatars[employee.name.trim()] = {
          ...avatars[employee.name.trim()],
          ...avatarEntry,
        };
      }
    });

    mentionAgents.forEach(agent => {
      const currentAvatar = avatars[agent.agentId];
      avatars[agent.agentId] = {
        ...currentAvatar,
        name: currentAvatar?.name || agent.displayName,
      };
    });

    return avatars;
  }, [aiEmployees, channelAgents, mentionAgents, spaceMembers]);

  const composerMentionOptions = useMemo<WorkspaceComposerMentionOption[]>(() => {
    const humanMembers = spaceMembers
      .filter(member => member.kind === "human")
      .filter(member => !currentUser || member.id !== String(currentUser.id));
    const duplicateCountMap = buildMentionKeyCountMap([
      ...mentionAgents.map(agent => agent.displayName),
      ...humanMembers.map(member => member.name),
    ]);
    const usedLabelKeys = new Set<string>();
    const options: WorkspaceComposerMentionOption[] = [];

    mentionAgents.forEach(agent => {
      const mentionLabel = pickUniqueMentionLabel(
        agent.displayName,
        [agent.alias, buildMentionLabelWithSuffix(agent.displayName, agent.agentId)],
        duplicateCountMap,
        usedLabelKeys,
        agent.agentId,
      );

      options.push({
        id: agent.agentId,
        label: agent.displayName,
        mentionLabel,
        alias: agent.alias,
        avatarUrl: actorAvatars[agent.agentId]?.icon,
        kind: "ai",
      });
    });

    humanMembers.forEach(member => {
      const mentionLabel = pickUniqueMentionLabel(
        member.name,
        [buildMentionLabelWithSuffix(member.name, member.id)],
        duplicateCountMap,
        usedLabelKeys,
        member.id,
      );

      options.push({
        id: `member:${member.id}`,
        label: member.name,
        mentionLabel,
        avatarUrl: member.avatarUrl,
        kind: "member",
      });
    });

    return options;
  }, [actorAvatars, currentUser, mentionAgents, spaceMembers]);

  const mentionableActorLabels = useMemo<Record<string, string>>(() => {
    const labelMap: Record<string, string> = {};
    const aiDisplayNameCountMap = buildMentionKeyCountMap(
      mentionAgents.map(agent => agent.displayName),
    );

    composerMentionOptions
      .filter(
        (option): option is WorkspaceComposerMentionOption & { kind: "ai" } => option.kind === "ai",
      )
      .forEach(option => {
        const mentionLabel = option.mentionLabel?.trim() || option.label.trim();
        if (!mentionLabel) return;
        labelMap[option.id] = mentionLabel;

        const normalizedLabelKey = normalizeMentionKey(option.label);
        if ((aiDisplayNameCountMap.get(normalizedLabelKey) ?? 0) <= 1 && option.label.trim()) {
          labelMap[option.label.trim()] = mentionLabel;
        }
      });

    return labelMap;
  }, [composerMentionOptions, mentionAgents]);

  const mentionPayloadAgents = useMemo(
    () =>
      mentionAgents.map(agent => {
        const mentionLabel = mentionableActorLabels[agent.agentId];
        const normalizedMentionLabel = mentionLabel?.trim();
        return {
          ...agent,
          keywords: normalizedMentionLabel
            ? Array.from(new Set([...agent.keywords, normalizeMentionKey(normalizedMentionLabel)]))
            : agent.keywords,
        };
      }),
    [mentionAgents, mentionableActorLabels],
  );

  const selectedChannelAgentIds = useMemo(
    () => channelAgents.map(agent => agent.agentId),
    [channelAgents],
  );

  const canCurrentUserSpeak = useMemo(() => {
    if (!activeChannelId || !currentUser) return false;
    const currentMember = spaceMembers.find(member => member.id === String(currentUser.id));
    const normalizedRole = (currentMember?.accessRole || "").trim().toLowerCase();
    return (
      normalizedRole === "owner" || normalizedRole === "manager" || normalizedRole === "speaker"
    );
  }, [activeChannelId, currentUser, spaceMembers]);

  const activeHumanMemberCount = useMemo(
    () => spaceMembers.filter(member => member.kind !== "ai").length,
    [spaceMembers],
  );

  const isDirectAiConversation = useMemo(
    () => mentionAgents.length === 1 && activeHumanMemberCount <= 1,
    [activeHumanMemberCount, mentionAgents],
  );

  const composerPlaceholder = useMemo(() => {
    if (mentionAgents.length === 0) return DEFAULT_CHAT_PLACEHOLDER;
    if (isDirectAiConversation) {
      const targetName = mentionAgents[0]?.displayName || "AI 员工";
      return `输入消息，直接与 ${targetName} 对话，Shift + Enter 换行`;
    }
    const hintText = mentionAgents
      .slice(0, 2)
      .map(agent => `@${agent.displayName}`)
      .join(" / ");
    return `输入消息，可用 ${hintText} 指定 AI；不 @ 则仅发送给频道成员，Shift + Enter 换行`;
  }, [isDirectAiConversation, mentionAgents]);

  const refreshActiveChannelRoster = useCallback(async (): Promise<void> => {
    if (!activeChannelId) return;

    const [agentItems, memberItems, remoteBlocks] = await Promise.all([
      loadChannelAgents(activeChannelId),
      loadChannelMembers(activeChannelId),
      loadChannelBlocks(activeChannelId),
    ]);

    setChannelAgents(agentItems);
    setSpaceMembers(mergeCurrentUserMember(normalizeSpaceMembers(memberItems), currentUser));
    activeChannelAggregatorRef.current?.loadHistory(remoteBlocks);
    setChatBlocks(remoteBlocks);
  }, [activeChannelId, currentUser, loadChannelAgents, loadChannelBlocks, loadChannelMembers]);

  const syncActiveChannelBlocks = useCallback(() => {
    const nextBlocks = activeChannelAggregatorRef.current?.getGroupedBlocks() ?? [];
    setChatBlocks(nextBlocks);
  }, []);

  const syncPendingRequestStorage = useCallback(() => {
    if (!activeChannelId) return;
    persistStoredPendingChatRequests(activeChannelId, pendingRequestIdsRef.current);
  }, [activeChannelId]);

  const settlePendingRequest = useCallback(
    (requestId?: string) => {
      if (requestId) {
        pendingRequestIdsRef.current.delete(requestId);
      } else {
        pendingRequestIdsRef.current.clear();
      }
      syncPendingRequestStorage();
      setIsSendingChat(pendingRequestIdsRef.current.size > 0);
    },
    [syncPendingRequestStorage],
  );

  const clearScheduledArtifactRefreshes = useCallback(() => {
    artifactRefreshTimersRef.current.forEach(timer => {
      window.clearTimeout(timer);
    });
    artifactRefreshTimersRef.current = [];
  }, []);

  const scheduleArtifactRefreshReconcile = useCallback(() => {
    clearScheduledArtifactRefreshes();
    refreshArtifacts();
    [1500, 4000, 9000].forEach(delayMs => {
      const timer = window.setTimeout(() => {
        refreshArtifacts();
      }, delayMs);
      artifactRefreshTimersRef.current.push(timer);
    });
  }, [clearScheduledArtifactRefreshes, refreshArtifacts]);

  const handleSendChat = useCallback(() => {
    if (isSendingChat) return;
    const content = chatInputValue.trim();
    const attachmentIds = composerAttachments.filter(isCompletedAttachment).map(item => item.id);
    if (!content && attachmentIds.length === 0) return;
    if (!activeChannelId) {
      onMessageWarning("请先选择频道");
      return;
    }
    if (!canCurrentUserSpeak) {
      onMessageWarning("当前频道为仅观看权限，无法发言");
      return;
    }
    if (composerAttachments.some(item => item.status === "uploading")) {
      onMessageWarning("附件上传中，请稍后发送");
      return;
    }

    const payload =
      content.length > 0
        ? resolveMentionPayload(content, mentionPayloadAgents)
        : {
            message: "",
            targetAgentIds: undefined,
          };
    if (!payload.message && attachmentIds.length === 0) return;
    const requestId = `synclaw-request-${Date.now()}`;
    pendingRequestIdsRef.current.add(requestId);
    syncPendingRequestStorage();
    setIsSendingChat(true);
    setChatInputValue("");
    setComposerFocusKey(key => key + 1);

    void sendChannelChatTask(activeChannelId, {
      message: payload.message,
      targetAgentIds: payload.targetAgentIds,
      attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      requestId,
    })
      .then(() => {
        resetComposerAttachments();
      })
      .catch(() => {
        settlePendingRequest(requestId);
        setChatInputValue(content);
        setComposerFocusKey(key => key + 1);
        onMessageError("消息发送失败，请稍后再试");
      });
  }, [
    activeChannelId,
    canCurrentUserSpeak,
    chatInputValue,
    composerAttachments,
    mentionPayloadAgents,
    onMessageError,
    onMessageWarning,
    resetComposerAttachments,
    sendChannelChatTask,
    settlePendingRequest,
    syncPendingRequestStorage,
    isSendingChat,
  ]);

  const handleComposerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const nativeEvent = event.nativeEvent;
      if (nativeEvent.isComposing || nativeEvent.keyCode === 229) return;
      if (event.key !== "Enter") return;
      if (event.shiftKey) return;
      event.preventDefault();
      handleSendChat();
    },
    [handleSendChat],
  );

  const handleInsertActorMention = useCallback((actorName: string): void => {
    const normalizedActorName = actorName.trim();
    if (!normalizedActorName) return;
    setChatInputValue(currentValue => appendActorMention(currentValue, normalizedActorName));
    setComposerFocusKey(key => key + 1);
  }, []);

  const handleAbortChat = useCallback(async (): Promise<void> => {
    if (!activeChannelId) return;
    const pendingRequestIds = [...pendingRequestIdsRef.current].filter(Boolean);
    if (pendingRequestIds.length === 0) return;

    try {
      await Promise.all(
        pendingRequestIds.map(async requestId => {
          if (abortingRequestIdsRef.current.has(requestId)) return;
          abortingRequestIdsRef.current.add(requestId);
          try {
            const result = await abortChannelChatTask(activeChannelId, requestId);
            if (result.completed) {
              settlePendingRequest(requestId);
            }
          } finally {
            abortingRequestIdsRef.current.delete(requestId);
          }
        }),
      );
    } catch {
      onMessageError("终止对话失败，请稍后再试");
    }
  }, [abortChannelChatTask, activeChannelId, onMessageError, settlePendingRequest]);

  useEffect(() => {
    closeChannelStream(activeChannelStreamRef.current, "channel_switch");
    activeChannelStreamRef.current = null;
    activeChannelAggregatorRef.current = null;
    pendingRequestIdsRef.current.clear();
    abortingRequestIdsRef.current.clear();
    clearScheduledArtifactRefreshes();
    if (!activeChannelId) {
      setIsSendingChat(false);
      resetComposerAttachments();
      return;
    }
    resetComposerAttachments();
    const restoredPendingRequestIds = readStoredPendingChatRequests(activeChannelId);
    pendingRequestIdsRef.current = new Set(restoredPendingRequestIds);
    setIsSendingChat(restoredPendingRequestIds.length > 0);
  }, [activeChannelId, clearScheduledArtifactRefreshes, resetComposerAttachments]);

  useEffect(() => {
    const pendingRequestIds = pendingRequestIdsRef.current;
    const abortingRequestIds = abortingRequestIdsRef.current;
    return () => {
      closeChannelStream(activeChannelStreamRef.current, "component_unmount");
      activeChannelStreamRef.current = null;
      activeChannelAggregatorRef.current = null;
      pendingRequestIds.clear();
      abortingRequestIds.clear();
      clearScheduledArtifactRefreshes();
    };
  }, [clearScheduledArtifactRefreshes]);

  useEffect(() => {
    const hasActiveSpace =
      Boolean(activeSpaceId) && spaces.some(space => space.id === activeSpaceId);
    if (!hasActiveSpace) {
      setSpaceMembers([]);
      setSpaceMembersLoading(false);
      setChannelMembersReady(!activeChannelId);
      return;
    }

    let cancelled = false;
    setSpaceMembersLoading(true);
    setChannelMembersReady(false);

    const run = async () => {
      try {
        const memberItems = activeChannelId
          ? await loadChannelMembers(activeChannelId)
          : await loadSpaceMembers(activeSpaceId);
        if (cancelled) return;
        setSpaceMembers(mergeCurrentUserMember(normalizeSpaceMembers(memberItems), currentUser));
      } catch {
        if (cancelled) return;
        setSpaceMembers(mergeCurrentUserMember([], currentUser));
      } finally {
        if (!cancelled) {
          setSpaceMembersLoading(false);
          setChannelMembersReady(true);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [activeChannelId, activeSpaceId, currentUser, loadChannelMembers, loadSpaceMembers, spaces]);

  useEffect(() => {
    if (!activeChannelId) {
      setChannelAgents([]);
      return;
    }
    let cancelled = false;

    const run = async () => {
      try {
        const agentItems = await loadChannelAgents(activeChannelId);
        if (cancelled) return;
        setChannelAgents(agentItems);
      } catch {
        if (cancelled) return;
        setChannelAgents([]);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [activeChannelId, loadChannelAgents]);

  useEffect(() => {
    if (!activeChannelId) {
      setChatBlocks([]);
      setChannelHistoryReady(true);
      return;
    }
    let cancelled = false;
    const streamAggregator = new BlockAggregator();
    activeChannelAggregatorRef.current = streamAggregator;
    setChannelHistoryReady(false);

    const run = async () => {
      const flattenBlocks = (blocks: Block[]): Block[] => {
        const output: Block[] = [];

        const visit = (block: Block): void => {
          const nextBlock = { ...block } as Block & { children?: Block[] };
          const children = nextBlock.children;
          delete nextBlock.children;
          output.push(nextBlock);
          (children || []).forEach(child => visit(child));
        };

        blocks.forEach(block => visit(block));
        return output;
      };

      let snapshot:
        | {
            blocks: Block[];
            lastEventId?: string;
          }
        | undefined;
      try {
        snapshot = await loadChannelBlocksSnapshot(activeChannelId);
        if (cancelled) return;

        let baseBlocks = flattenBlocks(snapshot.blocks);
        const normalizedDeepLinkRequestId = (deepLinkRequestId || "").trim();
        if (normalizedDeepLinkRequestId) {
          try {
            const deepSnapshot = await loadChannelBlocksSnapshot(activeChannelId, {
              requestId: normalizedDeepLinkRequestId,
              limit: 200,
            });
            if (cancelled) return;
            const merged = new Map<string, Block>();
            for (const item of [...baseBlocks, ...flattenBlocks(deepSnapshot.blocks)]) {
              const existing = merged.get(item.id);
              if (!existing) {
                merged.set(item.id, item);
                continue;
              }
              const existingHistoryId =
                typeof existing.historyId === "number" ? existing.historyId : 0;
              const incomingHistoryId = typeof item.historyId === "number" ? item.historyId : 0;
              if (incomingHistoryId >= existingHistoryId) {
                merged.set(item.id, item);
              }
            }
            baseBlocks = [...merged.values()];
          } catch {
            // ignore deep-link hydration failures
          }
        }

        if (cancelled) return;

        baseBlocks.sort((a, b) => {
          const seqA = typeof a.sequence === "number" ? a.sequence : Number.MAX_SAFE_INTEGER;
          const seqB = typeof b.sequence === "number" ? b.sequence : Number.MAX_SAFE_INTEGER;
          if (seqA !== seqB) return seqA - seqB;
          const tsA = typeof a.timestamp === "number" ? a.timestamp : 0;
          const tsB = typeof b.timestamp === "number" ? b.timestamp : 0;
          if (tsA !== tsB) return tsA - tsB;
          const idA = typeof a.historyId === "number" ? a.historyId : 0;
          const idB = typeof b.historyId === "number" ? b.historyId : 0;
          return idA - idB;
        });

        const terminalInvocationIds = collectTerminalInvocationIds(baseBlocks);
        terminalInvocationIds.forEach(invocationId => {
          pendingRequestIdsRef.current.delete(invocationId);
        });
        if (cancelled) return;
        syncPendingRequestStorage();
        setIsSendingChat(pendingRequestIdsRef.current.size > 0);

        streamAggregator.loadHistory(baseBlocks);
        setChatBlocks(streamAggregator.getGroupedBlocks());
      } catch {
        if (cancelled) return;
        setChatBlocks([]);
        setChannelHistoryReady(true);
        return;
      }

      if (cancelled) return;
      if (!snapshot) return;
      setChannelHistoryReady(true);
      setChatInputValue("");
      setComposerFocusKey(key => key + 1);

      const streamConnection = subscribeChannelEvents(
        activeChannelId,
        {
          lastId: snapshot.lastEventId || "$",
        },
        {
          onBlock: event => {
            if (cancelled) return;
            if (isAbortedErrorBlockEvent(event)) {
              settlePendingRequest(event.invocation_id);
            }
            streamAggregator.process(event);
            syncActiveChannelBlocks();
          },
          onDone: event => {
            if (cancelled) return;
            streamAggregator.markInvocationComplete(event.request_id);
            syncActiveChannelBlocks();
            settlePendingRequest(event.request_id);
            scheduleArtifactRefreshReconcile();
          },
          onError: errorMessage => {
            if (cancelled) return;
            settlePendingRequest();
            if (errorMessage) {
              onMessageError(errorMessage);
            }
          },
        },
      );

      closeChannelStream(activeChannelStreamRef.current, "stream_restart");
      activeChannelStreamRef.current = streamConnection;
      void streamConnection.finished.finally(() => {
        if (activeChannelStreamRef.current === streamConnection) {
          activeChannelStreamRef.current = null;
        }
      });
    };

    void run();

    return () => {
      cancelled = true;
      if (activeChannelStreamRef.current) {
        activeChannelStreamRef.current.close("stream_restart");
        activeChannelStreamRef.current = null;
      }
    };
  }, [
    activeChannelId,
    deepLinkRequestId,
    loadChannelBlocksSnapshot,
    onMessageError,
    refreshArtifacts,
    scheduleArtifactRefreshReconcile,
    settlePendingRequest,
    subscribeChannelEvents,
    syncPendingRequestStorage,
    syncActiveChannelBlocks,
  ]);

  const isChannelWorkspaceReady = !activeChannelId || (channelMembersReady && channelHistoryReady);

  return {
    spaceMembers,
    spaceMembersLoading,
    channelAgents,
    chatBlocks,
    chatInputValue,
    composerAttachments,
    isSendingChat,
    composerFocusKey,
    mentionAgents,
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
  };
};
