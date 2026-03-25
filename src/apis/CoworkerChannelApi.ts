import { getAuthToken } from "@/store/auth";
import { BlockAggregator, type ActorRole, type Block, type BlockEvent } from "@/types/block";
import { appEnv } from "@/utils/env";
import { reportRequestAbortToFeishu, reportRequestErrorToFeishu } from "@/utils/feishuReport";
import { abortRequest, readRequestAbortMeta, type RequestAbortReason } from "@/utils/requestAbort";
import { httpClient } from "@/utils/http";
import {
  buildFetchTraceContext,
  createRequestId,
  resolveRequestDurationMs,
  type RequestTraceMeta,
} from "@/utils/requestTrace";

interface UnknownRecord {
  [key: string]: unknown;
}

export type CoworkerChannelAgentTriggerMode = "auto_single_ai" | "mention_required";

/**
 * Coworker 频道树中的频道项（标准化后）。
 */
export interface CoworkerChannelTreeChannelItem {
  id: string;
  name: string;
}

/**
 * Coworker 频道树中的空间项（标准化后）。
 */
export interface CoworkerChannelTreeSpaceItem {
  id: string;
  name: string;
  coverUrl?: string;
  channels: CoworkerChannelTreeChannelItem[];
}

/**
 * 获取频道树接口参数。
 */
export interface GetCoworkerChannelSpacesTreeParams {
  keyword?: string;
  status?: string;
  channelKeyword?: string;
  dispatchMode?: string;
  includeEmptySpaces?: boolean;
  channelLimit?: number;
}

/**
 * 创建频道空间请求参数。
 */
export interface CreateCoworkerChannelSpaceParams {
  channelSpaceId: string;
  name: string;
  cover?: string;
  description?: string;
  status?: string;
}

/**
 * 更新频道空间请求参数。
 */
export interface UpdateCoworkerChannelSpaceParams {
  name: string;
  cover?: string;
  description?: string;
  status?: string;
}

/**
 * 创建频道请求参数。
 */
export interface CreateCoworkerChannelParams {
  channelSpaceId: string;
  channelId: string;
  name: string;
  description?: string;
  dispatchMode?: string;
  agentTriggerMode?: CoworkerChannelAgentTriggerMode;
  allowBots?: boolean;
  defaultAgentId?: number;
  status?: string;
}

/**
 * 更新频道请求参数。
 */
export interface UpdateCoworkerChannelParams {
  name: string;
  description?: string;
  dispatchMode?: string;
  agentTriggerMode?: CoworkerChannelAgentTriggerMode;
  allowBots?: boolean;
  defaultAgentId?: number;
  status?: string;
}

/**
 * 绑定频道 Agent 请求参数。
 */
export interface BindCoworkerChannelAgentParams {
  channelId: string;
  agentId: number;
  status?: string;
  alias?: string;
}

/**
 * 解绑频道 Agent 请求参数。
 */
export interface UnbindCoworkerChannelAgentParams {
  channelId: string;
  agentId: number;
}

/**
 * 频道对话任务请求参数。
 */
export interface CreateCoworkerChannelChatTaskParams {
  message: string;
  requestId?: string;
  targetAgentIds?: string[];
  attachmentIds?: number[];
}

/**
 * 查询频道 Block 请求参数。
 */
export interface GetCoworkerChannelBlocksParams {
  beforeId?: string;
  limit?: number;
  requestId?: string;
  kind?: string;
}

/**
 * 查询频道成果文件请求参数。
 */
export interface GetCoworkerChannelArtifactsParams {
  cursor?: string;
  limit?: number;
  pathPrefix?: string;
  includeDeleted?: boolean;
}

/**
 * 查询频道空间成员列表接口参数。
 */
export interface GetCoworkerChannelSpaceMembersParams {
  status?: string;
  skip?: number;
  limit?: number;
}

/**
 * 频道空间成员（标准化后）。
 */
export interface CoworkerChannelSpaceMemberItem {
  identityId: string;
  displayName: string;
  role?: string;
  accessRole?: "owner" | "manager" | "speaker" | "viewer" | string;
  status?: string;
  avatarUrl?: string;
  identityType?: string;
}

export interface CoworkerChannelMemberReplaceItem {
  identityId: string;
  accessRole: "owner" | "manager" | "speaker" | "viewer";
  status?: string;
}

export interface CoworkerTenantMemberCandidateItem {
  identityId: string;
  username?: string;
  phone?: string;
  email?: string;
  isOwner: boolean;
  isTenantAdmin: boolean;
}

/**
 * 频道已绑定 Agent（标准化后）。
 */
export interface CoworkerChannelAgentItem {
  agentId: string;
  alias?: string;
  displayName?: string;
  avatarUrl?: string;
  status?: string;
  boundAt?: string;
}

/**
 * 频道已绑定 Agent 的 runtime / plugin 状态快照（用于 UI 展示忙碌/空闲）。
 */
export interface CoworkerChannelAgentRuntimeStatusItem {
  channelId: string;
  agentId: string;
  displayName: string;
  bindingStatus?: string;
  runtimeId?: string;
  runtimeStatus?: string;
  runtimeLastSeenAt?: number;
  runtimeAgentId: string;
  runtimeAgentStatus?: string;
  runtimeActiveSessionKeys?: string[];
  runtimeActiveSessionCount?: number;
  runtimeObservedAt?: number;
  runtimeProvisioningStatus?: string;
  runtimeLastErrorCode?: string;
  runtimeLastErrorMessage?: string;
}

/**
 * 频道空间内（批量）频道与 Agent 的 runtime/plugin 状态快照。
 * 用于左侧频道列表展示忙碌红点与 agent 头像。
 */
export interface CoworkerChannelSpaceChannelAgentRuntimeStatusAgentItem {
  channelId: string;
  agentId: string;
  displayName: string;
  avatarUrl?: string;
  runtimeAgentId?: string;
  runtimeAgentStatus?: string;
  runtimeActiveSessionKeys?: string[];
  runtimeActiveSessionCount?: number;
  isWorkingHere?: boolean;
  isBusyElsewhere?: boolean;
}

export interface CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem {
  channelId: string;
  channelName: string;
  agentCount: number;
  workingHereCount: number;
  busy: boolean;
  agents: CoworkerChannelSpaceChannelAgentRuntimeStatusAgentItem[];
}

/**
 * 创建频道对话任务结果。
 */
export interface CoworkerChannelChatTaskResult {
  requestId: string;
  plannedTargetIds: string[];
  dispatchMode?: string;
  dispatchReason?: string;
}

/**
 * 终止频道对话任务结果。
 */
export interface CoworkerChannelAbortTaskResult {
  requestId: string;
  channelId: string;
  status: string;
  abortRequested: boolean;
  started: boolean;
  completed: boolean;
  matchedRuns: number;
  dispatchedRuntimeIds: string[];
  runtimeFailures: Array<{
    runtimeId: string;
    statusCode?: number;
    message?: string;
  }>;
}

export interface CoworkerChannelBlocksResult {
  blocks: Block[];
  lastEventId?: string;
}

/**
 * 频道成果文件（标准化后）。
 */
export interface CoworkerChannelArtifactItem {
  artifactId: string;
  channelId: string;
  canonicalPath: string;
  displayName: string;
  latestVersionId?: number;
  latestSha256?: string;
  latestSize?: number;
  latestMimeType?: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 频道成果文件列表结果。
 */
export interface CoworkerChannelArtifactListResult {
  items: CoworkerChannelArtifactItem[];
  nextCursor?: string;
}

/**
 * 频道成果文件下载地址结果。
 */
export interface CoworkerChannelArtifactDownloadUrlResult {
  artifactId: string;
  versionId: string;
  downloadUrl: string;
  storageKey: string;
}

/**
 * 频道流式消息分片事件。
 */
export interface CoworkerChannelStreamChunkEvent {
  event_id?: string;
  request_id?: string;
  run_id?: string;
  agent_id?: string;
  seq?: number;
  delta?: string;
  textDelta?: string;
  text?: string;
  thinkingDelta?: string;
  thinking?: string;
  reasoning_content?: string;
  kind?: "answer" | "thinking" | "tool" | string;
  [key: string]: unknown;
}

/**
 * 频道流式元信息事件。
 */
export interface CoworkerChannelStreamMetaEvent {
  event_id?: string;
  request_id?: string;
  run_id?: string;
  channel_id: string;
  channel_name?: string;
  agent_id?: string;
}

/**
 * 频道流式完成事件。
 */
export interface CoworkerChannelStreamDoneEvent {
  event_id?: string;
  request_id?: string;
  run_id?: string;
  agent_id?: string;
  session_key?: string;
  final_text?: string;
  no_reply?: boolean;
  reply_status?: string;
}

/**
 * 频道流式回调。
 */
export interface CoworkerChannelStreamCallbacks {
  onMeta?: (event: CoworkerChannelStreamMetaEvent) => void;
  onChunk?: (event: CoworkerChannelStreamChunkEvent) => void;
  onBlock?: (event: BlockEvent) => void;
  onDone?: (event: CoworkerChannelStreamDoneEvent) => void;
  onError?: (message: string) => void;
}

/**
 * 频道流式连接句柄。
 */
export interface CoworkerChannelStreamConnection {
  requestId: string;
  close: (reason?: RequestAbortReason) => void;
  finished: Promise<void>;
}

const resolveRecord = (value: unknown): UnknownRecord | undefined =>
  value && typeof value === "object" ? (value as UnknownRecord) : undefined;

const isPlainObject = (value: unknown): value is UnknownRecord => {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
};

const readStringField = (record: UnknownRecord | undefined, keys: string[]): string | undefined => {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
};

const readNumberField = (record: UnknownRecord | undefined, keys: string[]): number | undefined => {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const readArrayField = (record: UnknownRecord | undefined, keys: string[]): unknown[] => {
  if (!record) return [];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const readStringArrayField = (
  record: UnknownRecord | undefined,
  keys: string[],
): string[] | undefined => {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) continue;
    const normalized = value
      .map(item => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return normalized.length ? normalized : [];
  }
  return undefined;
};

const readIdAsString = (
  record: UnknownRecord | undefined,
  stringKeys: string[],
  numberKeys: string[] = stringKeys,
): string | undefined => {
  const stringValue = readStringField(record, stringKeys);
  if (stringValue) return stringValue;

  const numberValue = readNumberField(record, numberKeys);
  if (typeof numberValue !== "number") return undefined;
  return String(numberValue);
};

const normalizeActorRole = (value: unknown): ActorRole | undefined => {
  if (value === "user" || value === "assistant" || value === "system") {
    return value;
  }
  return undefined;
};

const normalizeTimestampValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue)) {
      return numericValue > 1e12 ? numericValue : numericValue * 1000;
    }
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const resolveChannelSpacesPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const rootRecord = resolveRecord(payload);
  if (!rootRecord) return [];

  const rootCandidates = readArrayField(rootRecord, [
    "items",
    "spaces",
    "channel_spaces",
    "list",
    "rows",
  ]);
  if (rootCandidates.length) return rootCandidates;

  const nestedData = resolveRecord(rootRecord.data);
  if (!nestedData) return [];

  const nestedCandidates = readArrayField(nestedData, [
    "items",
    "spaces",
    "channel_spaces",
    "list",
    "rows",
  ]);
  if (nestedCandidates.length) return nestedCandidates;

  return [];
};

const buildApiUrl = (path: string): string => {
  const base = (appEnv.apiBaseUrl || "").trim().replace(/\/+$/, "");
  if (!base) return path;
  return `${base}${path}`;
};

const consumeSseFrames = (buffer: string): { frames: string[]; remaining: string } => {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const frames: string[] = [];
  let cursor = 0;

  for (;;) {
    const next = normalized.indexOf("\n\n", cursor);
    if (next < 0) break;
    frames.push(normalized.slice(cursor, next));
    cursor = next + 2;
  }

  return {
    frames,
    remaining: normalized.slice(cursor),
  };
};

const parseEventData = (raw: string): unknown => {
  const text = raw.trim();
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
};

const parseSseFrame = (frame: string): { event: string; data: unknown; id?: string } | null => {
  const lines = frame.split("\n");
  let eventName = "message";
  let eventId: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("id:")) {
      const nextId = line.slice("id:".length).trim();
      eventId = nextId || undefined;
      continue;
    }
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  return {
    event: eventName,
    data: parseEventData(dataLines.join("\n")),
    id: eventId,
  };
};

const normalizeErrorMessage = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const createStreamRequestId = (): string => createRequestId("stream");

const readResponseDetail = async (response: Response): Promise<string> => {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
};

const reportFetchRequestFailure = (params: {
  method: string;
  url: string;
  response?: Response;
  message: string;
  detail?: string;
  requestParams?: unknown;
  traceMeta: RequestTraceMeta;
}): void => {
  reportRequestErrorToFeishu({
    method: params.method,
    url: params.url,
    status: params.response?.status,
    statusText: params.response?.statusText,
    params: params.requestParams,
    message: params.message,
    detail: params.detail,
    requestId: params.traceMeta.requestId,
    durationMs: resolveRequestDurationMs(params.traceMeta),
  });
};

const reportFetchRequestAbort = (params: {
  method: string;
  url: string;
  requestParams?: unknown;
  traceMeta: RequestTraceMeta;
  signal: AbortSignal;
}): void => {
  reportRequestAbortToFeishu({
    method: params.method,
    url: params.url,
    params: params.requestParams,
    requestId: params.traceMeta.requestId,
    durationMs: resolveRequestDurationMs(params.traceMeta),
    abortMeta: readRequestAbortMeta(params.signal),
  });
};

const waitForAbortableDelay = (delayMs: number, signal: AbortSignal): Promise<void> => {
  if (signal.aborted) {
    return Promise.reject(new DOMException("The operation was aborted.", "AbortError"));
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);

    const handleAbort = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", handleAbort);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };

    signal.addEventListener("abort", handleAbort, { once: true });
  });
};

const extractHttpStatusFromError = (error: unknown): number | null => {
  const message = error instanceof Error ? error.message : normalizeErrorMessage(error);
  const matched = /^HTTP_(\d{3})(?::|$)/.exec(message);
  if (!matched) return null;
  const status = Number(matched[1]);
  return Number.isFinite(status) ? status : null;
};

interface CoworkerChannelStreamBlockAdapterState {
  channelId: string;
  requestId: string;
  metaAgentId?: string;
  messageBlockIds: Map<string, string>;
  textBlockContents: Map<string, string>;
  thinkingBlockContents: Map<string, string>;
  activeTextBlockIds: Map<string, string>;
  textSegmentCounts: Map<string, number>;
  activeThinkingBlockIds: Map<string, string>;
  thinkingSegmentCounts: Map<string, number>;
  lastActivityKinds: Map<string, "thinking" | "text" | "tool" | "error">;
}

const normalizeStreamActorId = (value: unknown, fallback?: string): string => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (fallback?.trim()) return fallback.trim();
  return "assistant";
};

const buildSyntheticBlockEvent = (params: {
  blockId: string;
  parentId?: string | null;
  kind: Block["kind"];
  op: BlockEvent["op"];
  data: Record<string, unknown>;
  actorId: string;
  channelId: string;
  requestId: string;
  timestamp: number;
  eventId: string;
}): BlockEvent => ({
  block_id: params.blockId,
  parent_id: params.parentId,
  kind: params.kind,
  op: params.op,
  data: params.data,
  persistence: "transient",
  protocol_version: "1.0",
  event_id: params.eventId,
  timestamp: params.timestamp,
  session_id: params.channelId,
  invocation_id: params.requestId,
  actor: {
    id: params.actorId,
    role: params.kind === "error" ? "system" : "assistant",
  },
});

const ensureSyntheticMessageBlock = (
  state: CoworkerChannelStreamBlockAdapterState,
  callbacks: CoworkerChannelStreamCallbacks,
  params: {
    actorId?: string;
    timestamp: number;
    eventId: string;
  },
): { actorId: string; messageBlockId: string } => {
  const actorId = normalizeStreamActorId(params.actorId, state.metaAgentId);
  let messageBlockId = state.messageBlockIds.get(actorId);
  if (!messageBlockId) {
    messageBlockId = `synclaw-stream-${state.requestId}:${actorId}:message`;
    state.messageBlockIds.set(actorId, messageBlockId);
    callbacks.onBlock?.(
      buildSyntheticBlockEvent({
        blockId: messageBlockId,
        kind: "message",
        op: "apply",
        data: { status: "streaming" },
        actorId,
        channelId: state.channelId,
        requestId: state.requestId,
        timestamp: params.timestamp,
        eventId: `${params.eventId}:message`,
      }),
    );
  }
  return { actorId, messageBlockId };
};

const completeSyntheticThinkingBlock = (
  state: CoworkerChannelStreamBlockAdapterState,
  callbacks: CoworkerChannelStreamCallbacks,
  params: {
    actorId?: string;
    eventId: string;
    timestamp: number;
  },
): { actorId: string; messageBlockId: string } => {
  const { actorId, messageBlockId } = ensureSyntheticMessageBlock(state, callbacks, params);
  const activeThinkingBlockId = state.activeThinkingBlockIds.get(actorId);
  if (!activeThinkingBlockId) {
    return { actorId, messageBlockId };
  }

  callbacks.onBlock?.(
    buildSyntheticBlockEvent({
      blockId: activeThinkingBlockId,
      parentId: messageBlockId,
      kind: "thinking",
      op: "patch",
      data: { status: "completed" },
      actorId,
      channelId: state.channelId,
      requestId: state.requestId,
      timestamp: params.timestamp,
      eventId: `${params.eventId}:thinking-complete`,
    }),
  );
  state.activeThinkingBlockIds.delete(actorId);
  return { actorId, messageBlockId };
};

const emitSyntheticTextualBlock = (
  state: CoworkerChannelStreamBlockAdapterState,
  callbacks: CoworkerChannelStreamCallbacks,
  params: {
    actorId?: string;
    eventId: string;
    timestamp: number;
    content?: string;
    delta?: string;
    kind: "text" | "thinking";
  },
): void => {
  const baseParams = {
    actorId: params.actorId,
    timestamp: params.timestamp,
    eventId: params.eventId,
  };
  const { actorId, messageBlockId } =
    params.kind === "thinking"
      ? ensureSyntheticMessageBlock(state, callbacks, baseParams)
      : completeSyntheticThinkingBlock(state, callbacks, baseParams);

  const isThinking = params.kind === "thinking";
  const activeBlockIdMap = isThinking ? state.activeThinkingBlockIds : state.activeTextBlockIds;
  const segmentCountMap = isThinking ? state.thinkingSegmentCounts : state.textSegmentCounts;
  const blockContentMap = isThinking ? state.thinkingBlockContents : state.textBlockContents;
  const existingBlockId = isThinking
    ? state.lastActivityKinds.get(actorId) === "thinking"
      ? state.activeThinkingBlockIds.get(actorId)
      : undefined
    : state.lastActivityKinds.get(actorId) === "text"
      ? state.activeTextBlockIds.get(actorId)
      : undefined;
  const snapshot = typeof params.content === "string" ? params.content : "";
  const delta = typeof params.delta === "string" ? params.delta : "";

  let blockId = existingBlockId;
  let segmentIndex: number | undefined;
  if (!blockId) {
    const initialContent = snapshot || delta;
    if (!initialContent) return;

    segmentIndex = (segmentCountMap.get(actorId) || 0) + 1;
    segmentCountMap.set(actorId, segmentIndex);
    blockId = `${messageBlockId}:${params.kind}:${segmentIndex}`;
    activeBlockIdMap.set(actorId, blockId);

    blockContentMap.set(blockId, initialContent);
    callbacks.onBlock?.(
      buildSyntheticBlockEvent({
        blockId,
        parentId: messageBlockId,
        kind: params.kind,
        op: "apply",
        data: isThinking
          ? {
              content: initialContent,
              status: "streaming",
              segment_index: segmentIndex,
            }
          : {
              content: initialContent,
              role: "assistant",
              status: "streaming",
              segment_index: segmentIndex,
            },
        actorId,
        channelId: state.channelId,
        requestId: state.requestId,
        timestamp: params.timestamp,
        eventId: `${params.eventId}:${params.kind}`,
      }),
    );
    state.lastActivityKinds.set(actorId, params.kind);
    return;
  }

  const currentContent = blockContentMap.get(blockId) || "";
  let op: BlockEvent["op"] = "delta";
  let nextContent = currentContent;
  let emittedContent = "";

  if (delta) {
    const expectedSnapshot = `${currentContent}${delta}`;
    if (snapshot && snapshot !== expectedSnapshot) {
      op = "patch";
      emittedContent = snapshot;
      nextContent = snapshot;
    } else {
      emittedContent = delta;
      nextContent = expectedSnapshot;
    }
  } else if (snapshot) {
    if (snapshot === currentContent) return;
    if (snapshot.startsWith(currentContent)) {
      emittedContent = snapshot.slice(currentContent.length);
      if (!emittedContent) return;
      nextContent = snapshot;
    } else {
      op = "patch";
      emittedContent = snapshot;
      nextContent = snapshot;
    }
  } else {
    return;
  }

  blockContentMap.set(blockId, nextContent);
  callbacks.onBlock?.(
    buildSyntheticBlockEvent({
      blockId,
      parentId: messageBlockId,
      kind: params.kind,
      op,
      data: { content: emittedContent },
      actorId,
      channelId: state.channelId,
      requestId: state.requestId,
      timestamp: params.timestamp,
      eventId: `${params.eventId}:${params.kind}`,
    }),
  );
  state.lastActivityKinds.set(actorId, params.kind);
};

const emitSyntheticErrorBlock = (
  state: CoworkerChannelStreamBlockAdapterState,
  callbacks: CoworkerChannelStreamCallbacks,
  params: {
    actorId?: string;
    eventId: string;
    timestamp: number;
    message: string;
  },
): void => {
  if (!params.message.trim()) return;
  const { actorId, messageBlockId } = ensureSyntheticMessageBlock(state, callbacks, {
    actorId: params.actorId,
    timestamp: params.timestamp,
    eventId: params.eventId,
  });
  callbacks.onBlock?.(
    buildSyntheticBlockEvent({
      blockId: `${messageBlockId}:error`,
      parentId: messageBlockId,
      kind: "error",
      op: "apply",
      data: { message: params.message },
      actorId,
      channelId: state.channelId,
      requestId: state.requestId,
      timestamp: params.timestamp,
      eventId: `${params.eventId}:error`,
    }),
  );
};

const resolveMembersPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const rootRecord = resolveRecord(payload);
  if (!rootRecord) return [];

  const rootCandidates = readArrayField(rootRecord, ["items", "members", "list", "rows"]);
  if (rootCandidates.length) return rootCandidates;

  const nestedData = resolveRecord(rootRecord.data);
  if (!nestedData) return [];

  const nestedCandidates = readArrayField(nestedData, ["items", "members", "list", "rows"]);
  if (nestedCandidates.length) return nestedCandidates;

  return [];
};

const resolveItemsPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const rootRecord = resolveRecord(payload);
  if (!rootRecord) return [];

  const rootCandidates = readArrayField(rootRecord, ["items", "list", "rows"]);
  if (rootCandidates.length) return rootCandidates;

  const nestedData = resolveRecord(rootRecord.data);
  if (!nestedData) return [];

  const nestedCandidates = readArrayField(nestedData, ["items", "list", "rows"]);
  if (nestedCandidates.length) return nestedCandidates;

  return [];
};

const resolveAgentsPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const rootRecord = resolveRecord(payload);
  if (!rootRecord) return [];

  const rootCandidates = readArrayField(rootRecord, [
    "items",
    "agents",
    "bindings",
    "list",
    "rows",
  ]);
  if (rootCandidates.length) return rootCandidates;

  const nestedData = resolveRecord(rootRecord.data);
  if (!nestedData) return [];

  const nestedCandidates = readArrayField(nestedData, [
    "items",
    "agents",
    "bindings",
    "list",
    "rows",
  ]);
  if (nestedCandidates.length) return nestedCandidates;

  return [];
};

const normalizeChannelItem = (payload: unknown): CoworkerChannelTreeChannelItem | null => {
  const record = resolveRecord(payload);
  if (!record) return null;

  const id = readIdAsString(record, ["channel_id", "id"]);
  const name = readStringField(record, ["name", "title"]);
  if (!id || !name) return null;

  return { id, name };
};

const normalizeSpaceItem = (payload: unknown): CoworkerChannelTreeSpaceItem | null => {
  const record = resolveRecord(payload);
  if (!record) return null;

  const id = readIdAsString(record, ["channel_space_id", "space_id", "id"]);
  const name = readStringField(record, ["name", "title"]);
  if (!id || !name) return null;
  const coverUrl = readStringField(record, [
    "cover",
    "cover_url",
    "coverUrl",
    "avatar",
    "avatar_url",
    "avatarUrl",
    "icon",
  ]);

  const channelPayload = readArrayField(record, ["channels", "channel_list", "children"]);
  const channels = channelPayload
    .map(item => normalizeChannelItem(item))
    .filter((item): item is CoworkerChannelTreeChannelItem => Boolean(item));

  return { id, name, coverUrl, channels };
};

const normalizeChannelBlock = (payload: unknown): Block | null => {
  const record = resolveRecord(payload);
  if (!record) return null;

  const id = readIdAsString(record, ["block_id", "id"]);
  if (!id) return null;

  const rawKind = readStringField(record, ["kind"]) ?? "text";
  const dataRaw = resolveRecord(record.data);
  const actorRaw = resolveRecord(record.actor);
  const actorMetaRaw = resolveRecord(actorRaw?.meta);
  const actorRole =
    normalizeActorRole(readStringField(actorRaw, ["role"])) ??
    (rawKind === "user_message"
      ? "user"
      : rawKind === "assistant_message"
        ? "assistant"
        : undefined);
  const kind = rawKind === "user_message" || rawKind === "assistant_message" ? "text" : rawKind;
  const normalizedData =
    kind === "text"
      ? {
          ...(dataRaw ?? {}),
          content:
            readStringField(dataRaw, ["content", "text", "message"]) ??
            readStringField(record, ["content", "text", "message"]) ??
            "",
          role: actorRole,
          status: readStringField(dataRaw, ["status"]) ?? "done",
        }
      : (dataRaw ?? {});

  return {
    id,
    kind,
    data: normalizedData,
    parentId: readStringField(record, ["parent_id", "parentId"]),
    invocationId:
      readIdAsString(record, ["invocation_id", "invocationId"]) ??
      readIdAsString(record, ["request_id", "requestId"]),
    historyId: readNumberField(record, ["id"]),
    sequence: readNumberField(record, ["sequence"]),
    timestamp:
      normalizeTimestampValue(record.created_at) ??
      normalizeTimestampValue(record.timestamp) ??
      normalizeTimestampValue(record.issued_at),
    actorId: readIdAsString(actorRaw, ["id"]),
    actorName: readStringField(actorRaw, ["name", "display_name", "displayName"]),
    actorRole,
    actorMeta: actorMetaRaw ?? undefined,
  };
};

const normalizeChannelSpaceMemberItem = (
  payload: unknown,
): CoworkerChannelSpaceMemberItem | null => {
  const record = resolveRecord(payload);
  if (!record) return null;

  const identityRecord =
    resolveRecord(record.identity) ??
    resolveRecord(record.member) ??
    resolveRecord(record.user) ??
    resolveRecord(record.profile);
  const profileRecord = resolveRecord(record.profile);

  const identityId =
    readIdAsString(record, ["identity_id", "identityId", "member_id", "memberId", "id"]) ??
    readIdAsString(identityRecord, ["identity_id", "identityId", "id", "member_id", "memberId"]);
  if (!identityId) return null;

  const displayName =
    readStringField(record, ["display_name", "displayName", "name", "username"]) ??
    readStringField(identityRecord, ["display_name", "displayName", "name", "username"]);
  if (!displayName) return null;

  return {
    identityId,
    displayName,
    role:
      readStringField(record, ["role"]) ??
      readStringField(identityRecord, ["role"]) ??
      readStringField(profileRecord, ["role"]),
    accessRole:
      readStringField(record, ["access_role", "accessRole"]) ??
      readStringField(identityRecord, ["access_role", "accessRole"]) ??
      readStringField(profileRecord, ["access_role", "accessRole"]),
    status:
      readStringField(record, ["status", "online_status", "onlineStatus"]) ??
      readStringField(identityRecord, ["status", "online_status", "onlineStatus"]),
    avatarUrl:
      readStringField(record, ["avatar", "avatar_url", "avatarUrl", "icon"]) ??
      readStringField(identityRecord, ["avatar", "avatar_url", "avatarUrl", "icon"]),
    identityType:
      readStringField(record, ["identity_type", "identityType", "member_type", "memberType"]) ??
      readStringField(identityRecord, [
        "identity_type",
        "identityType",
        "member_type",
        "memberType",
        "type",
      ]),
  };
};

const normalizeChannelAgentItem = (payload: unknown): CoworkerChannelAgentItem | null => {
  const record = resolveRecord(payload);
  if (!record) return null;

  const agentId = readIdAsString(record, ["agent_id", "agentId", "id"]);
  if (!agentId) return null;

  return {
    agentId,
    alias: readStringField(record, ["alias", "name", "display_name", "displayName"]),
    displayName: readStringField(record, ["display_name", "displayName", "alias", "name"]),
    avatarUrl: readStringField(record, ["avatar", "avatar_url", "avatarUrl", "icon"]),
    status: readStringField(record, ["status"]),
    boundAt: readStringField(record, ["bound_at", "boundAt", "joined_at", "joinedAt"]),
  };
};

const normalizeChannelChatTaskResult = (payload: unknown): CoworkerChannelChatTaskResult => {
  const record = resolveRecord(payload);
  const nestedData = resolveRecord(record?.data);
  const source = nestedData ?? record;

  const requestId =
    readStringField(source, ["request_id", "requestId", "session_key", "sessionKey"]) ?? "";
  const plannedTargetIds = readArrayField(source, ["planned_targets", "plannedTargetIds"])
    .map(item => {
      if (typeof item === "string" && item.trim()) return item;
      if (typeof item === "number" && Number.isFinite(item)) return String(item);
      if (item && typeof item === "object") {
        const record = item as UnknownRecord;
        const runtimeAgentId = readStringField(record, ["runtime_agent_id", "runtimeAgentId"]);
        if (runtimeAgentId) return runtimeAgentId;
        const agentId = readNumberField(record, ["agent_id", "agentId"]);
        if (typeof agentId === "number" && Number.isFinite(agentId)) {
          return String(agentId);
        }
      }
      return "";
    })
    .filter((item): item is string => Boolean(item));
  const dispatchResult =
    resolveRecord(source?.dispatch_result) ?? resolveRecord(source?.dispatchResult);

  return {
    requestId,
    plannedTargetIds,
    dispatchMode: readStringField(dispatchResult, ["mode"]),
    dispatchReason: readStringField(dispatchResult, ["reason"]),
  };
};

const normalizeChannelAbortTaskResult = (payload: unknown): CoworkerChannelAbortTaskResult => {
  const record = resolveRecord(payload);
  const nestedData = resolveRecord(record?.data);
  const source = nestedData ?? record;

  const runtimeFailures = readArrayField(source, ["runtime_failures", "runtimeFailures"]).flatMap(
    item => {
      const failure = resolveRecord(item);
      const runtimeId = readStringField(failure, ["runtime_id", "runtimeId"]) ?? "";
      if (!runtimeId) return [];
      return [
        {
          runtimeId,
          statusCode: readNumberField(failure, ["status_code", "statusCode"]),
          message: readStringField(failure, ["message", "detail"]),
        },
      ];
    },
  );

  return {
    requestId: readStringField(source, ["request_id", "requestId"]) ?? "",
    channelId: readStringField(source, ["channel_id", "channelId"]) ?? "",
    status: readStringField(source, ["status"]) ?? "unknown",
    abortRequested: normalizeBooleanField(
      source?.abort_requested ?? source?.abortRequested ?? false,
    ),
    started: normalizeBooleanField(source?.started ?? false),
    completed: normalizeBooleanField(source?.completed ?? false),
    matchedRuns: readNumberField(source, ["matched_runs", "matchedRuns"]) ?? 0,
    dispatchedRuntimeIds: readArrayField(source, ["dispatched_runtime_ids", "dispatchedRuntimeIds"])
      .map(item => (typeof item === "string" ? item.trim() : ""))
      .filter((item): item is string => Boolean(item)),
    runtimeFailures,
  };
};

const resolveChannelArtifactListPayload = (
  payload: unknown,
): {
  items: unknown[];
  nextCursor?: string;
} => {
  const rootRecord = resolveRecord(payload);
  const nestedData = resolveRecord(rootRecord?.data);
  const source = nestedData ?? rootRecord;
  const items = Array.isArray(payload)
    ? payload
    : readArrayField(source, ["items", "artifacts", "list", "rows"]);
  return {
    items,
    nextCursor:
      readStringField(source, ["next_cursor", "nextCursor"]) ||
      readStringField(rootRecord, ["next_cursor", "nextCursor"]) ||
      undefined,
  };
};

const normalizeBooleanField = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
};

const normalizeChannelArtifactItem = (payload: unknown): CoworkerChannelArtifactItem | null => {
  const record = resolveRecord(payload);
  if (!record) return null;

  const artifactId = readIdAsString(record, ["artifact_id", "artifactId", "id"]);
  const channelId = readIdAsString(record, ["channel_id", "channelId"]);
  const canonicalPath = readStringField(record, ["canonical_path", "canonicalPath"]);
  const displayName = readStringField(record, ["display_name", "displayName", "name"]);
  if (!artifactId || !channelId || !canonicalPath || !displayName) return null;

  return {
    artifactId,
    channelId,
    canonicalPath,
    displayName,
    latestVersionId: readNumberField(record, ["latest_version_id", "latestVersionId"]),
    latestSha256: readStringField(record, ["latest_sha256", "latestSha256"]),
    latestSize: readNumberField(record, ["latest_size", "latestSize"]),
    latestMimeType: readStringField(record, ["latest_mime_type", "latestMimeType", "mime_type"]),
    isDeleted: normalizeBooleanField(record.is_deleted ?? record.isDeleted),
    createdAt: readStringField(record, ["created_at", "createdAt"]),
    updatedAt: readStringField(record, ["updated_at", "updatedAt"]),
  };
};

const normalizeChannelArtifactDownloadUrlResult = (
  payload: unknown,
): CoworkerChannelArtifactDownloadUrlResult => {
  const rootRecord = resolveRecord(payload);
  const nestedData = resolveRecord(rootRecord?.data);
  const source = nestedData ?? rootRecord;

  return {
    artifactId: readIdAsString(source, ["artifact_id", "artifactId"]) || "",
    versionId: readIdAsString(source, ["version_id", "versionId"]) || "",
    downloadUrl: readStringField(source, ["download_url", "downloadUrl"]) || "",
    storageKey: readStringField(source, ["storage_key", "storageKey"]) || "",
  };
};

/**
 * 获取 Coworker 空间/频道树。
 */
export async function getCoworkerChannelSpacesTree(
  params: GetCoworkerChannelSpacesTreeParams = {},
): Promise<CoworkerChannelTreeSpaceItem[]> {
  const payload = await httpClient.get<unknown>("/api/v1/coworker/channel-spaces/tree", {
    params: {
      keyword: params.keyword,
      status: params.status,
      channel_keyword: params.channelKeyword,
      dispatch_mode: params.dispatchMode,
      include_empty_spaces: params.includeEmptySpaces,
      channel_limit: params.channelLimit,
    },
  });

  return resolveChannelSpacesPayload(payload)
    .map(item => normalizeSpaceItem(item))
    .filter((item): item is CoworkerChannelTreeSpaceItem => Boolean(item));
}

/**
 * 获取频道空间成员列表。
 */
export async function getCoworkerChannelSpaceMembers(
  channelSpaceId: string,
  params: GetCoworkerChannelSpaceMembersParams = {},
): Promise<CoworkerChannelSpaceMemberItem[]> {
  const payload = await httpClient.get<unknown>(
    `/api/v1/coworker/channel-spaces/${channelSpaceId}/members`,
    {
      params: {
        status: params.status,
        skip: params.skip,
        limit: params.limit,
      },
    },
  );

  return resolveMembersPayload(payload)
    .map(item => normalizeChannelSpaceMemberItem(item))
    .filter((item): item is CoworkerChannelSpaceMemberItem => Boolean(item));
}

/**
 * 获取频道成员列表。
 */
export async function getCoworkerChannelMembers(
  channelId: string,
): Promise<CoworkerChannelSpaceMemberItem[]> {
  const payload = await httpClient.get<unknown>(`/api/v1/coworker/channels/${channelId}/members`);

  return resolveMembersPayload(payload)
    .map(item => normalizeChannelSpaceMemberItem(item))
    .filter((item): item is CoworkerChannelSpaceMemberItem => Boolean(item));
}

export async function replaceCoworkerChannelMembers(
  channelId: string,
  items: CoworkerChannelMemberReplaceItem[],
): Promise<CoworkerChannelSpaceMemberItem[]> {
  const payload = await httpClient.put<unknown>(`/api/v1/coworker/channels/${channelId}/members`, {
    items: items.map(item => ({
      identity_id: Number(item.identityId),
      access_role: item.accessRole,
      status: item.status ?? "active",
    })),
  });

  return resolveMembersPayload(payload)
    .map(item => normalizeChannelSpaceMemberItem(item))
    .filter((item): item is CoworkerChannelSpaceMemberItem => Boolean(item));
}

export async function getCoworkerTenantMemberCandidates(
  keyword?: string,
): Promise<CoworkerTenantMemberCandidateItem[]> {
  const payload = await httpClient.get<unknown>("/api/v1/coworker/agents/owners/candidates", {
    params: {
      keyword,
    },
  });
  return resolveMembersPayload(payload).reduce<CoworkerTenantMemberCandidateItem[]>(
    (result, item) => {
      const record = resolveRecord(item);
      if (!record) return result;
      const identityId = readIdAsString(record, ["identity_id", "identityId", "id"]);
      if (!identityId) return result;
      result.push({
        identityId,
        username: readStringField(record, ["username", "name"]),
        phone: readStringField(record, ["phone"]),
        email: readStringField(record, ["email"]),
        isOwner: Boolean(record.is_owner),
        isTenantAdmin: Boolean(record.is_tenant_admin),
      });
      return result;
    },
    [],
  );
}

/**
 * 获取频道已绑定 Agent 列表。
 */
export async function getCoworkerChannelAgents(
  channelId: string,
): Promise<CoworkerChannelAgentItem[]> {
  const payload = await httpClient.get<unknown>(`/api/v1/coworker/channels/${channelId}/agents`);

  return resolveAgentsPayload(payload)
    .map(item => normalizeChannelAgentItem(item))
    .filter((item): item is CoworkerChannelAgentItem => Boolean(item));
}

function normalizeChannelAgentRuntimeStatusItem(
  record: unknown,
): CoworkerChannelAgentRuntimeStatusItem | null {
  if (!isPlainObject(record)) return null;
  const channelId = readStringField(record, ["channel_id", "channelId"]);
  const agentId = readStringField(record, ["agent_id", "agentId"]);
  const displayName = readStringField(record, ["display_name", "displayName", "alias", "name"]);
  const runtimeAgentId =
    readStringField(record, ["runtime_agent_id", "runtimeAgentId"]) ?? `cw-${agentId ?? ""}`;

  if (!channelId || !agentId || !displayName || !runtimeAgentId) return null;

  return {
    channelId,
    agentId,
    displayName,
    bindingStatus: readStringField(record, ["binding_status", "bindingStatus"]) ?? undefined,
    runtimeId: readStringField(record, ["runtime_id", "runtimeId"]) ?? undefined,
    runtimeStatus: readStringField(record, ["runtime_status", "runtimeStatus"]) ?? undefined,
    runtimeLastSeenAt:
      readNumberField(record, ["runtime_last_seen_at", "runtimeLastSeenAt"]) ?? undefined,
    runtimeAgentId,
    runtimeAgentStatus:
      readStringField(record, ["runtime_agent_status", "runtimeAgentStatus"]) ?? undefined,
    runtimeActiveSessionKeys:
      readStringArrayField(record, ["runtime_active_session_keys", "runtimeActiveSessionKeys"]) ??
      undefined,
    runtimeActiveSessionCount:
      readNumberField(record, ["runtime_active_session_count", "runtimeActiveSessionCount"]) ??
      undefined,
    runtimeObservedAt:
      readNumberField(record, ["runtime_observed_at", "runtimeObservedAt"]) ?? undefined,
    runtimeProvisioningStatus:
      readStringField(record, ["runtime_provisioning_status", "runtimeProvisioningStatus"]) ??
      undefined,
    runtimeLastErrorCode:
      readStringField(record, ["runtime_last_error_code", "runtimeLastErrorCode"]) ?? undefined,
    runtimeLastErrorMessage:
      readStringField(record, ["runtime_last_error_message", "runtimeLastErrorMessage"]) ??
      undefined,
  };
}

function normalizeChannelSpaceChannelAgentRuntimeStatusAgentItem(
  record: unknown,
): CoworkerChannelSpaceChannelAgentRuntimeStatusAgentItem | null {
  const resolved = resolveRecord(record);
  if (!resolved) return null;

  const channelId = readStringField(resolved, ["channel_id", "channelId"]);
  const agentId = readIdAsString(resolved, ["agent_id", "agentId"]);
  const displayName = readStringField(resolved, ["display_name", "displayName", "alias", "name"]);
  if (!channelId || !agentId || !displayName) return null;

  return {
    channelId,
    agentId,
    displayName,
    avatarUrl:
      readStringField(resolved, ["avatar_url", "avatarUrl", "avatar", "icon"]) ?? undefined,
    runtimeAgentId: readStringField(resolved, ["runtime_agent_id", "runtimeAgentId"]) ?? undefined,
    runtimeAgentStatus:
      readStringField(resolved, ["runtime_agent_status", "runtimeAgentStatus"]) ?? undefined,
    runtimeActiveSessionKeys:
      readStringArrayField(resolved, ["runtime_active_session_keys", "runtimeActiveSessionKeys"]) ??
      undefined,
    runtimeActiveSessionCount:
      readNumberField(resolved, ["runtime_active_session_count", "runtimeActiveSessionCount"]) ??
      undefined,
    isWorkingHere:
      typeof (resolved as UnknownRecord).is_working_here === "boolean"
        ? Boolean((resolved as UnknownRecord).is_working_here)
        : normalizeBooleanField((resolved as UnknownRecord).isWorkingHere),
    isBusyElsewhere:
      typeof (resolved as UnknownRecord).is_busy_elsewhere === "boolean"
        ? Boolean((resolved as UnknownRecord).is_busy_elsewhere)
        : normalizeBooleanField((resolved as UnknownRecord).isBusyElsewhere),
  };
}

function normalizeChannelSpaceChannelAgentRuntimeStatusChannelItem(
  record: unknown,
): CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem | null {
  const resolved = resolveRecord(record);
  if (!resolved) return null;

  const channelId = readStringField(resolved, ["channel_id", "channelId"]);
  const channelName = readStringField(resolved, ["channel_name", "channelName", "name"]);
  if (!channelId || !channelName) return null;

  const agents = readArrayField(resolved, ["agents"])
    .map(item => normalizeChannelSpaceChannelAgentRuntimeStatusAgentItem(item))
    .filter((item): item is CoworkerChannelSpaceChannelAgentRuntimeStatusAgentItem =>
      Boolean(item),
    );

  return {
    channelId,
    channelName,
    agentCount: readNumberField(resolved, ["agent_count", "agentCount"]) ?? agents.length,
    workingHereCount: readNumberField(resolved, ["working_here_count", "workingHereCount"]) ?? 0,
    busy: normalizeBooleanField((resolved as UnknownRecord).busy),
    agents,
  };
}

/**
 * 获取频道已绑定 Agent 的 runtime/plugin 状态快照。
 */
export async function getCoworkerChannelAgentRuntimeStatuses(
  channelId: string,
): Promise<CoworkerChannelAgentRuntimeStatusItem[]> {
  const payload = await httpClient.get<unknown>(
    `/api/v1/coworker/channels/${channelId}/agents/runtime-status`,
  );
  const items = resolveItemsPayload(payload);
  return items
    .map(item => normalizeChannelAgentRuntimeStatusItem(item))
    .filter((item): item is CoworkerChannelAgentRuntimeStatusItem => Boolean(item));
}

/**
 * 获取频道空间内频道的 runtime/plugin 状态快照（批量）。
 */
export async function getCoworkerChannelSpaceChannelAgentRuntimeStatuses(
  channelSpaceId: string,
  params: {
    limit?: number;
    signal?: AbortSignal;
  } = {},
): Promise<CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem[]> {
  const payload = await httpClient.get<unknown>(
    `/api/v1/coworker/channel-spaces/${channelSpaceId}/channels/agents/runtime-status`,
    {
      params: {
        limit: params.limit,
      },
      signal: params.signal,
      timeout: 30000,
    },
  );
  const items = resolveItemsPayload(payload);
  return items
    .map(item => normalizeChannelSpaceChannelAgentRuntimeStatusChannelItem(item))
    .filter((item): item is CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem =>
      Boolean(item),
    );
}

/**
 * 创建 Coworker 频道空间。
 */
export function createCoworkerChannelSpace(
  params: CreateCoworkerChannelSpaceParams,
): Promise<unknown> {
  return httpClient.post<unknown>("/api/v1/coworker/channel-spaces", {
    channel_space_id: params.channelSpaceId,
    name: params.name,
    cover: params.cover,
    description: params.description,
    status: params.status ?? "active",
  });
}

/**
 * 更新 Coworker 频道空间。
 */
export function updateCoworkerChannelSpace(
  channelSpaceId: string,
  params: UpdateCoworkerChannelSpaceParams,
): Promise<unknown> {
  return httpClient.put<unknown>(`/api/v1/coworker/channel-spaces/${channelSpaceId}`, {
    name: params.name,
    cover: params.cover,
    description: params.description,
    status: params.status ?? "active",
  });
}

/**
 * 删除 Coworker 频道空间。
 */
export function deleteCoworkerChannelSpace(channelSpaceId: string): Promise<unknown> {
  return httpClient.delete<unknown>(`/api/v1/coworker/channel-spaces/${channelSpaceId}`);
}

/**
 * 创建 Coworker 频道。
 */
export function createCoworkerChannel(params: CreateCoworkerChannelParams): Promise<unknown> {
  return httpClient.post<unknown>(
    `/api/v1/coworker/channel-spaces/${params.channelSpaceId}/channels`,
    {
      channel_id: params.channelId,
      name: params.name,
      description: params.description,
      dispatch_mode: params.dispatchMode ?? "default",
      agent_trigger_mode: params.agentTriggerMode ?? "auto_single_ai",
      allow_bots: params.allowBots ?? true,
      default_agent_id: params.defaultAgentId,
      status: params.status ?? "active",
    },
  );
}

/**
 * 更新 Coworker 频道。
 */
export function updateCoworkerChannel(
  channelSpaceId: string,
  channelId: string,
  params: UpdateCoworkerChannelParams,
): Promise<unknown> {
  return httpClient.put<unknown>(
    `/api/v1/coworker/channel-spaces/${channelSpaceId}/channels/${channelId}`,
    {
      name: params.name,
      description: params.description,
      dispatch_mode: params.dispatchMode,
      agent_trigger_mode: params.agentTriggerMode,
      allow_bots: params.allowBots,
      default_agent_id: params.defaultAgentId,
      status: params.status ?? "active",
    },
  );
}

/**
 * 删除 Coworker 频道。
 */
export function deleteCoworkerChannel(channelSpaceId: string, channelId: string): Promise<unknown> {
  return httpClient.delete<unknown>(
    `/api/v1/coworker/channel-spaces/${channelSpaceId}/channels/${channelId}`,
  );
}

/**
 * 绑定频道 Agent。
 */
export function bindCoworkerChannelAgent(params: BindCoworkerChannelAgentParams): Promise<unknown> {
  return httpClient.post<unknown>(`/api/v1/coworker/channels/${params.channelId}/agents`, {
    agent_id: params.agentId,
    status: params.status ?? "active",
    alias: params.alias,
  });
}

/**
 * 解绑频道 Agent。
 */
export function unbindCoworkerChannelAgent(
  params: UnbindCoworkerChannelAgentParams,
): Promise<unknown> {
  return httpClient.delete<unknown>(
    `/api/v1/coworker/channels/${params.channelId}/agents/${params.agentId}`,
  );
}

/**
 * 创建频道对话任务（发送消息）。
 */
export function createCoworkerChannelChatTask(
  channelId: string,
  params: CreateCoworkerChannelChatTaskParams,
): Promise<CoworkerChannelChatTaskResult> {
  return httpClient
    .post<unknown>(
      `/api/v1/coworker/channels/${channelId}/chat/task`,
      {
        message: params.message,
        request_id: params.requestId,
        target_agent_ids: params.targetAgentIds,
        attachment_ids: params.attachmentIds,
      },
      {
        requestId: params.requestId,
      },
    )
    .then(payload => normalizeChannelChatTaskResult(payload));
}

/**
 * 终止频道对话任务。
 */
export function abortCoworkerChannelChatTask(
  channelId: string,
  requestId: string,
): Promise<CoworkerChannelAbortTaskResult> {
  return httpClient
    .post<unknown>(
      `/api/v1/coworker/channels/${channelId}/requests/${requestId}/abort`,
      undefined,
      {
        requestId,
      },
    )
    .then(payload => normalizeChannelAbortTaskResult(payload));
}

/**
 * 发送频道消息并建立流式响应。
 */
export function streamCoworkerChannelMessage(
  channelId: string,
  params: CreateCoworkerChannelChatTaskParams & {
    lastId?: string;
  },
  callbacks: CoworkerChannelStreamCallbacks,
): CoworkerChannelStreamConnection {
  const controller = new AbortController();
  const token = getAuthToken();
  const requestId = params.requestId?.trim() || createStreamRequestId();
  let activeAbortContext:
    | {
        method: string;
        url: string;
        requestParams?: unknown;
        traceMeta: RequestTraceMeta;
      }
    | undefined;
  const blockAdapterState: CoworkerChannelStreamBlockAdapterState = {
    channelId,
    requestId,
    messageBlockIds: new Map<string, string>(),
    textBlockContents: new Map<string, string>(),
    thinkingBlockContents: new Map<string, string>(),
    activeTextBlockIds: new Map<string, string>(),
    textSegmentCounts: new Map<string, number>(),
    activeThinkingBlockIds: new Map<string, string>(),
    thinkingSegmentCounts: new Map<string, number>(),
    lastActivityKinds: new Map<string, "thinking" | "text" | "tool" | "error">(),
  };
  const taskUrl = buildApiUrl(`/api/v1/coworker/channels/${channelId}/chat/task`);
  const streamUrl = buildApiUrl(`/api/v1/coworker/channels/${channelId}/chat/stream`);

  const finished = (async () => {
    const taskPayload = {
      request_id: requestId,
      message: params.message,
      target_agent_ids: params.targetAgentIds,
      attachment_ids: params.attachmentIds,
    };
    const taskTrace = buildFetchTraceContext({
      requestId,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      data: taskPayload,
    });
    activeAbortContext = {
      method: "POST",
      url: taskUrl,
      requestParams: taskPayload,
      traceMeta: taskTrace.traceMeta,
    };
    const taskResponse = await fetch(taskUrl, {
      method: "POST",
      headers: taskTrace.headers,
      body: JSON.stringify(taskPayload),
      signal: controller.signal,
    });

    if (!taskResponse.ok) {
      const detail = await readResponseDetail(taskResponse);
      const message = `HTTP ${taskResponse.status}`;
      reportFetchRequestFailure({
        method: "POST",
        url: taskUrl,
        response: taskResponse,
        message,
        detail,
        requestParams: taskPayload,
        traceMeta: taskTrace.traceMeta,
      });
      throw new Error(detail || message);
    }

    const streamPayload = {
      request_id: requestId,
      last_id: params.lastId || "$",
    };
    const streamTrace = buildFetchTraceContext({
      requestId,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      data: streamPayload,
    });
    activeAbortContext = {
      method: "POST",
      url: streamUrl,
      requestParams: streamPayload,
      traceMeta: streamTrace.traceMeta,
    };
    const response = await fetch(streamUrl, {
      method: "POST",
      headers: streamTrace.headers,
      body: JSON.stringify(streamPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await readResponseDetail(response);
      const message = `HTTP ${response.status}`;
      reportFetchRequestFailure({
        method: "POST",
        url: streamUrl,
        response,
        message,
        detail,
        requestParams: streamPayload,
        traceMeta: streamTrace.traceMeta,
      });
      throw new Error(detail || message);
    }

    if (!response.body) {
      reportFetchRequestFailure({
        method: "POST",
        url: streamUrl,
        response,
        message: "stream body is empty",
        requestParams: streamPayload,
        traceMeta: streamTrace.traceMeta,
      });
      throw new Error("stream body is empty");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { frames, remaining } = consumeSseFrames(buffer);
      buffer = remaining;

      for (const frame of frames) {
        const parsed = parseSseFrame(frame);
        if (!parsed) continue;

        const data = resolveRecord(parsed.data);
        if (parsed.event === "meta" && data) {
          const metaEvent = {
            ...data,
            event_id: normalizeErrorMessage(data.event_id) || parsed.id,
          } as CoworkerChannelStreamMetaEvent;
          blockAdapterState.metaAgentId = metaEvent.agent_id || blockAdapterState.metaAgentId;
          callbacks.onMeta?.(metaEvent);
          continue;
        }
        if (parsed.event === "block" && data) {
          const blockEvent: BlockEvent = {
            block_id: readIdAsString(data, ["block_id"]) || `blk-${Date.now()}`,
            parent_id: readIdAsString(data, ["parent_id"]) || null,
            kind: readStringField(data, ["kind"]) || "text",
            op:
              (readStringField(data, ["op"])?.toLowerCase() as BlockEvent["op"] | undefined) ||
              "apply",
            data: resolveRecord(data.data) || {},
            persistence:
              (readStringField(data, ["persistence"])?.toLowerCase() as
                | BlockEvent["persistence"]
                | undefined) || "persistent",
            branch: readStringField(data, ["branch"]) || null,
            protocol_version: readStringField(data, ["protocol_version"]) || "1.0",
            event_id: readStringField(data, ["event_id"]) || parsed.id || `block-${Date.now()}`,
            timestamp: readNumberField(data, ["timestamp"]) || Date.now(),
            session_id: readIdAsString(data, ["session_id"]) || channelId,
            invocation_id: readIdAsString(data, ["invocation_id"]) || requestId,
            actor: (() => {
              const actor = resolveRecord(data.actor);
              if (!actor) return null;
              const actorId = readIdAsString(actor, ["id"]);
              const actorRole = normalizeActorRole(readStringField(actor, ["role"]));
              if (!actorId || !actorRole) return null;
              return {
                id: actorId,
                role: actorRole,
                name: readStringField(actor, ["name"]) || undefined,
                meta: resolveRecord(actor.meta) || undefined,
              };
            })(),
          };
          blockAdapterState.metaAgentId = blockEvent.actor?.id || blockAdapterState.metaAgentId;
          callbacks.onBlock?.(blockEvent);
          continue;
        }
        if (parsed.event === "chunk" && data) {
          const chunkEvent = {
            ...data,
            event_id: normalizeErrorMessage(data.event_id) || parsed.id,
          } as CoworkerChannelStreamChunkEvent;
          const isThinkingChunk = chunkEvent.kind === "thinking";
          const chunkText = isThinkingChunk
            ? chunkEvent.thinking || chunkEvent.reasoning_content || chunkEvent.text || ""
            : chunkEvent.text || chunkEvent.reasoning_content || "";
          const chunkDelta = isThinkingChunk
            ? chunkEvent.thinkingDelta || chunkEvent.delta || chunkEvent.textDelta || ""
            : chunkEvent.delta || chunkEvent.textDelta || "";
          emitSyntheticTextualBlock(blockAdapterState, callbacks, {
            actorId: chunkEvent.agent_id,
            eventId: chunkEvent.event_id || `chunk-${Date.now()}`,
            timestamp: Date.now(),
            content: chunkText,
            delta: chunkDelta,
            kind: isThinkingChunk ? "thinking" : "text",
          });
          callbacks.onChunk?.(chunkEvent);
          continue;
        }
        if (parsed.event === "tool" && data) {
          const toolEvent = {
            ...data,
            event_id: normalizeErrorMessage(data.event_id) || parsed.id,
          };
          const toolRecord = resolveRecord(toolEvent);
          const toolName = readStringField(toolRecord, ["tool_name"]) || "tool";
          const toolPhase = readStringField(toolRecord, ["tool_phase"]);
          const timestamp = Date.now();
          const { actorId, messageBlockId } = completeSyntheticThinkingBlock(
            blockAdapterState,
            callbacks,
            {
              actorId: readIdAsString(toolRecord, ["agent_id"]),
              timestamp,
              eventId: normalizeErrorMessage(toolEvent.event_id) || `tool-${timestamp}`,
            },
          );
          callbacks.onBlock?.(
            buildSyntheticBlockEvent({
              blockId: `${messageBlockId}:tool:${normalizeErrorMessage(toolEvent.event_id) || timestamp}`,
              parentId: messageBlockId,
              kind: "tool_use",
              op: "apply",
              data: {
                name: toolName,
                display_name: toolName,
                purpose: toolPhase,
                status: "running",
              },
              actorId,
              channelId,
              requestId,
              timestamp,
              eventId: `${normalizeErrorMessage(toolEvent.event_id) || timestamp}:tool`,
            }),
          );
          blockAdapterState.lastActivityKinds.set(actorId, "tool");
          continue;
        }
        if (parsed.event === "done" && data) {
          const doneEvent = {
            ...data,
            event_id: normalizeErrorMessage(data.event_id) || parsed.id,
          } as CoworkerChannelStreamDoneEvent;
          completeSyntheticThinkingBlock(blockAdapterState, callbacks, {
            actorId: normalizeErrorMessage(doneEvent.agent_id),
            eventId: doneEvent.event_id || parsed.id || `done-${Date.now()}`,
            timestamp: Date.now(),
          });
          callbacks.onDone?.(doneEvent);
          continue;
        }
        if (parsed.event === "error") {
          const messageText = normalizeErrorMessage(data?.message);
          completeSyntheticThinkingBlock(blockAdapterState, callbacks, {
            actorId: normalizeErrorMessage(data?.agent_id),
            eventId: parsed.id || `error-${Date.now()}`,
            timestamp: Date.now(),
          });
          emitSyntheticErrorBlock(blockAdapterState, callbacks, {
            actorId: normalizeErrorMessage(data?.agent_id),
            eventId: parsed.id || `error-${Date.now()}`,
            timestamp: Date.now(),
            message: messageText,
          });
          if (messageText) {
            const actorId = normalizeStreamActorId(data?.agent_id, blockAdapterState.metaAgentId);
            blockAdapterState.lastActivityKinds.set(actorId, "error");
          }
          if (messageText) callbacks.onError?.(messageText);
        }
      }
    }
    activeAbortContext = undefined;
  })().catch(error => {
    if (controller.signal.aborted) {
      if (activeAbortContext) {
        reportFetchRequestAbort({
          ...activeAbortContext,
          signal: controller.signal,
        });
      }
      return;
    }
    const messageText = normalizeErrorMessage(error instanceof Error ? error.message : error);
    if (messageText) callbacks.onError?.(messageText);
  });

  return {
    requestId,
    close: reason =>
      abortRequest(controller, {
        reason: reason ?? "stream_restart",
      }),
    finished,
  };
}

/**
 * 订阅频道事件流（聊天室常驻连接）。
 */
export function subscribeCoworkerChannelEvents(
  channelId: string,
  params: {
    lastId?: string;
  },
  callbacks: CoworkerChannelStreamCallbacks,
): CoworkerChannelStreamConnection {
  const controller = new AbortController();
  const token = getAuthToken();
  const requestId = `channel-subscribe-${channelId}`;
  const streamUrl = buildApiUrl(`/api/v1/coworker/channels/${channelId}/chat/stream`);
  let lastEventId = params.lastId?.trim() || "$";
  let activeAbortContext:
    | {
        method: string;
        url: string;
        requestParams?: unknown;
        traceMeta: RequestTraceMeta;
      }
    | undefined;

  const finished = (async () => {
    let reconnectAttempt = 0;

    const consumeResponseStream = async (): Promise<void> => {
      const nextToken = getAuthToken() || token;
      const streamPayload = {
        last_id: lastEventId,
      };
      const streamTrace = buildFetchTraceContext({
        requestId,
        headers: {
          "Content-Type": "application/json",
          ...(nextToken ? { Authorization: `Bearer ${nextToken}` } : {}),
        },
        data: streamPayload,
      });
      activeAbortContext = {
        method: "POST",
        url: streamUrl,
        requestParams: streamPayload,
        traceMeta: streamTrace.traceMeta,
      };
      const response = await fetch(streamUrl, {
        method: "POST",
        headers: streamTrace.headers,
        body: JSON.stringify(streamPayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await readResponseDetail(response);
        reportFetchRequestFailure({
          method: "POST",
          url: streamUrl,
          response,
          message: `HTTP ${response.status}`,
          detail,
          requestParams: streamPayload,
          traceMeta: streamTrace.traceMeta,
        });
        throw new Error(`HTTP_${response.status}${detail ? `:${detail}` : ""}`);
      }

      if (!response.body) {
        reportFetchRequestFailure({
          method: "POST",
          url: streamUrl,
          response,
          message: "stream body is empty",
          requestParams: streamPayload,
          traceMeta: streamTrace.traceMeta,
        });
        throw new Error("stream body is empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const { frames, remaining } = consumeSseFrames(buffer);
        buffer = remaining;

        for (const frame of frames) {
          const parsed = parseSseFrame(frame);
          if (!parsed) continue;
          if (parsed.id?.trim()) {
            lastEventId = parsed.id.trim();
          }
          const envelope = resolveRecord(parsed.data);
          const data = resolveRecord(envelope?.data);
          const actor = resolveRecord(envelope?.actor);
          const requestToken = readStringField(envelope, ["request_id", "requestId"]) || requestId;
          const agentId =
            readIdAsString(actor, ["id"]) ||
            readIdAsString(envelope, ["agent_id", "agentId"]) ||
            undefined;

          if (parsed.event === "meta" && data) {
            callbacks.onMeta?.({
              event_id: parsed.id,
              request_id: requestToken,
              run_id: readStringField(envelope, ["run_id", "runId"]),
              channel_id: readStringField(envelope, ["channel_id", "channelId"]) || channelId,
              channel_name: readStringField(envelope, ["channel_name", "channelName"]),
              agent_id: agentId,
            });
            continue;
          }

          if (parsed.event === "block" && data) {
            callbacks.onBlock?.({
              block_id: readIdAsString(data, ["block_id"]) || `blk-${Date.now()}`,
              parent_id: readIdAsString(data, ["parent_id"]) || null,
              kind: readStringField(data, ["kind"]) || "text",
              op:
                (readStringField(data, ["op"])?.toLowerCase() as BlockEvent["op"] | undefined) ||
                "apply",
              data: resolveRecord(data.data) || {},
              persistence:
                (readStringField(data, ["persistence"])?.toLowerCase() as
                  | BlockEvent["persistence"]
                  | undefined) || "persistent",
              branch: readStringField(data, ["branch"]) || null,
              protocol_version: readStringField(data, ["protocol_version"]) || "1.0",
              event_id: readStringField(data, ["event_id"]) || parsed.id || `block-${Date.now()}`,
              timestamp: readNumberField(data, ["timestamp"]) || Date.now(),
              session_id: readIdAsString(data, ["session_id"]) || channelId,
              invocation_id: readIdAsString(data, ["invocation_id"]) || requestToken,
              actor:
                agentId && normalizeActorRole(readStringField(actor, ["role"]))
                  ? {
                      id: agentId,
                      role: normalizeActorRole(readStringField(actor, ["role"])) || "assistant",
                      name: readStringField(actor, ["name"]) || undefined,
                      meta: resolveRecord(actor?.meta) || undefined,
                    }
                  : undefined,
            });
            continue;
          }

          if (parsed.event === "done" && data) {
            callbacks.onDone?.({
              event_id: parsed.id,
              request_id: requestToken,
              run_id: readStringField(envelope, ["run_id", "runId"]),
              agent_id: agentId,
              session_key: readStringField(data, ["session_key", "sessionKey"]),
              final_text: readStringField(data, ["final_text", "finalText"]),
              no_reply: false,
            });
            continue;
          }

          if (parsed.event === "ignored" && data) {
            callbacks.onDone?.({
              event_id: parsed.id,
              request_id: requestToken,
              run_id: readStringField(envelope, ["run_id", "runId"]),
              agent_id: agentId,
              no_reply: true,
              reply_status: readStringField(data, ["reason", "status"]) || "ignored",
            });
            continue;
          }

          if (parsed.event === "user" && data) {
            const blockId = readIdAsString(envelope, ["block_id"]) || `blk-user-${Date.now()}`;
            const actorId = agentId || readIdAsString(actor, ["id"]) || "user";
            const attachments = Array.isArray(data.attachments)
              ? data.attachments.filter(item => item && typeof item === "object")
              : [];
            const attachmentIds = Array.isArray(data.attachment_ids)
              ? data.attachment_ids.filter(item => typeof item === "number")
              : [];
            callbacks.onBlock?.({
              block_id: blockId,
              parent_id: null,
              kind: "text",
              op: "apply",
              data: {
                content: readStringField(data, ["content", "text", "message"]) || "",
                role: "user",
                status: "done",
                attachments,
                attachment_ids: attachmentIds,
              },
              persistence: "persistent",
              branch: null,
              protocol_version: "1.0",
              event_id: parsed.id || `user-${Date.now()}`,
              timestamp: readNumberField(envelope, ["timestamp"]) || Date.now(),
              session_id: channelId,
              invocation_id: requestToken,
              actor: {
                id: actorId,
                role: "user",
                name: readStringField(actor, ["name"]) || undefined,
                meta: resolveRecord(actor?.meta) || undefined,
              },
            });
            continue;
          }

          if (parsed.event === "error") {
            const messageText =
              readStringField(data, ["message"]) || readStringField(envelope, ["message"]);
            if (messageText) callbacks.onError?.(messageText);
          }
        }
      }
      activeAbortContext = undefined;
    };

    while (!controller.signal.aborted) {
      try {
        await consumeResponseStream();
        reconnectAttempt = 0;
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const httpStatus = extractHttpStatusFromError(error);
        if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
          throw error;
        }
        reconnectAttempt += 1;
      }

      await waitForAbortableDelay(
        Math.min(15000, 1000 * 2 ** Math.min(reconnectAttempt, 4)),
        controller.signal,
      );
    }
  })().catch(error => {
    if (controller.signal.aborted) {
      if (activeAbortContext) {
        reportFetchRequestAbort({
          ...activeAbortContext,
          signal: controller.signal,
        });
      }
      return;
    }
    const messageText = normalizeErrorMessage(error instanceof Error ? error.message : error);
    if (messageText) callbacks.onError?.(messageText);
  });

  return {
    requestId,
    close: reason =>
      abortRequest(controller, {
        reason: reason ?? "stream_restart",
      }),
    finished,
  };
}

/**
 * 获取频道 Block 列表及最新事件游标。
 */
export async function getCoworkerChannelBlocksSnapshot(
  channelId: string,
  params: GetCoworkerChannelBlocksParams = {},
): Promise<CoworkerChannelBlocksResult> {
  const payload = await httpClient.get<unknown>(`/api/v1/coworker/channels/${channelId}/blocks`, {
    params: {
      before_id: params.beforeId,
      limit: params.limit,
      request_id: params.requestId,
      kind: params.kind,
    },
  });

  const rootRecord = resolveRecord(payload);
  const nestedDataRecord = resolveRecord(rootRecord?.data);
  const lastEventId =
    readStringField(nestedDataRecord, ["last_event_id", "lastEventId"]) ||
    readStringField(rootRecord, ["last_event_id", "lastEventId"]) ||
    undefined;
  const rootBlocks = readArrayField(rootRecord, ["blocks", "items", "list", "rows"]);
  const nestedBlocks = readArrayField(nestedDataRecord, ["blocks", "items", "list", "rows"]);
  const blockListRaw = Array.isArray(payload)
    ? payload
    : rootBlocks.length
      ? rootBlocks
      : nestedBlocks;
  const normalizedBlocks = blockListRaw
    .map(item => normalizeChannelBlock(item))
    .filter((item): item is Block => Boolean(item))
    .sort((a, b) => {
      if (typeof a.sequence !== "number" || typeof b.sequence !== "number") return 0;
      return a.sequence - b.sequence;
    });

  const aggregator = new BlockAggregator();
  aggregator.loadHistory(normalizedBlocks);
  return {
    blocks: aggregator.getGroupedBlocks(),
    lastEventId,
  };
}

/**
 * 获取频道 Block 列表（标准化为页面可直接消费的 Block）。
 */
export async function getCoworkerChannelBlocks(
  channelId: string,
  params: GetCoworkerChannelBlocksParams = {},
): Promise<Block[]> {
  const snapshot = await getCoworkerChannelBlocksSnapshot(channelId, params);
  return snapshot.blocks;
}

/**
 * 获取频道成果文件列表。
 */
export async function getCoworkerChannelArtifacts(
  channelId: string,
  params: GetCoworkerChannelArtifactsParams = {},
): Promise<CoworkerChannelArtifactListResult> {
  const payload = await httpClient.get<unknown>(
    `/api/v1/coworker/channels/${channelId}/artifacts`,
    {
      params: {
        cursor: params.cursor,
        limit: params.limit,
        path_prefix: params.pathPrefix,
        include_deleted: params.includeDeleted,
      },
    },
  );

  const resolved = resolveChannelArtifactListPayload(payload);
  return {
    items: resolved.items
      .map(item => normalizeChannelArtifactItem(item))
      .filter((item): item is CoworkerChannelArtifactItem => Boolean(item)),
    nextCursor: resolved.nextCursor,
  };
}

/**
 * 创建频道成果文件下载链接。
 */
export async function createCoworkerChannelArtifactDownloadUrl(
  channelId: string,
  artifactId: string,
): Promise<CoworkerChannelArtifactDownloadUrlResult> {
  const payload = await httpClient.post<unknown>(
    `/api/v1/coworker/channels/${channelId}/artifacts/${artifactId}/download-url`,
  );
  return normalizeChannelArtifactDownloadUrlResult(payload);
}
