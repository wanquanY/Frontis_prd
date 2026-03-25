/**
 * Session API
 * 会话管理与任务执行接口
 */

import { httpClient } from "@/utils/http";
import { appEnv } from "@/utils/env";
import { reportRequestAbortToFeishu } from "@/utils/feishuReport";
import { abortRequest, readRequestAbortMeta, type RequestAbortReason } from "@/utils/requestAbort";
import {
  buildFetchTraceContext,
  createRequestId,
  resolveRequestDurationMs,
  type RequestTraceMeta,
} from "@/utils/requestTrace";
import { getAuthToken, useAuthStore } from "@/store/auth";
import { logger } from "@/utils/logger";
import type { Block, BlockEvent, ActorRole, ArtifactImage } from "@/types/block";

// ============ LLM Models ============

export interface LLMModel {
  id: number;
  display_name: string;
  model_name: string;
  provider: string;
  icon: string;
  description: string;
}

// ============ Session Types ============

export interface TaskStatus {
  status: "idle" | "running" | "suspended";
  invocation_id: string | null;
  suspended_request: {
    request_id: string;
    request_type: string;
  } | null;
}

export interface Session {
  id: number;
  title: string | null;
  space_id: number | null;
  current_agent_id: number | null;
  current_model_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  task?: TaskStatus;
}

export interface SessionListItem extends Session {
  last_message?: string | null;
  block_count?: number;
}

export interface SessionCreateParams {
  title?: string;
  space_id?: number;
}

export interface SessionUpdateParams {
  title?: string;
  space_id?: number;
}

export interface SessionListParams {
  limit?: number;
  offset?: number;
  agent_id?: number;
  space_id?: number | null;
  q?: string;
}

export interface SessionListResponse {
  sessions: SessionListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface SessionStatusResponse {
  session_id: number;
  is_suspended: boolean;
  suspended_invocation_id: string | null;
  current_agent_id: number | null;
  current_model_id: number | null;
}

// ============ Block Types ============

export interface BlockHistoryItem {
  id: number; // 数据库 ID，用于分页 before_id
  block_id: string;
  kind: string;
  data: Record<string, unknown>;
  parent_id: string | null;
  sequence: number;
  invocation_id?: string;
  actor?: { id: string; role: ActorRole } | null;
}

export interface BlockHistoryResponse {
  blocks: BlockHistoryItem[];
  has_more: boolean;
  last_event_id: string | null;
}

export interface BlockHistoryParams {
  limit?: number;
  before_id?: number;
}

// ============ Task Types ============
export interface HitlTaskData {
  action: "submit" | "ignore";
  selected?: string[];
  custom_input?: string;
}

export interface HitlTaskPayload {
  id: string;
  data: HitlTaskData;
}

export interface TaskParams {
  message: string;
  agent_id?: number;
  model_id?: number;
  attachment_ids?: number[];
  enable_thinking?: boolean;
  space_data_ids?: number[];
  hitl?: HitlTaskPayload; // HITL 响应 payload
}

export interface AbortResponse {
  status: "aborted" | "not_running";
  session_id: number;
}

// ============ Session CRUD ============

/**
 * 创建新会话
 * POST /v1/sessions
 */
export function createSession(params: SessionCreateParams = {}) {
  return httpClient.post<Session>("/api/v1/sessions", params);
}

/**
 * 获取会话详情
 * GET /v1/sessions/{session_id}
 */
export function getSession(sessionId: number) {
  return httpClient.get<Session>(`/api/v1/sessions/${sessionId}`);
}

/**
 * 更新会话
 * POST /v1/sessions/{session_id}
 */
export function updateSession(sessionId: number, params: SessionUpdateParams) {
  return httpClient.post<Session>(`/api/v1/sessions/${sessionId}`, params);
}

/**
 * 移动/更新会话（含 title、space_id）
 * POST /v1/sessions/{session_id}
 */
export function moveSession(sessionId: number, params: { space_id?: number; title?: string }) {
  return updateSession(sessionId, params);
}

/**
 * 删除会话
 * DELETE /v1/sessions/{session_id}
 */
export function deleteSession(sessionId: number) {
  return httpClient.delete(`/api/v1/sessions/${sessionId}`);
}

/**
 * 列出会话
 * GET /v1/sessions
 */
export function listSessions(params: SessionListParams = {}) {
  return httpClient.get<SessionListResponse>("/api/v1/sessions", { params });
}

/**
 * 获取LLM模型列表
 * - GET /v1/sessions/llm-models
 */
export function getLLMModels() {
  return httpClient.get<LLMModel[]>("/api/v1/sessions/llm-models");
}

/**
 * 获取会话状态
 * GET /v1/sessions/{session_id}/status
 */
export function getSessionStatus(sessionId: number) {
  return httpClient.get<SessionStatusResponse>(`/api/v1/sessions/${sessionId}/status`);
}

// ============ Blocks API ============

/**
 * 获取会话的 Block 历史（分页 + before_id）
 * GET /v1/sessions/{session_id}/blocks
 */
export async function getSessionBlockHistory(
  sessionId: number,
  params: BlockHistoryParams = {},
): Promise<{
  blocks: Block[];
  hasMore: boolean;
  nextBeforeId: number | null;
  lastEventId: string | null;
}> {
  const { limit = 50, before_id } = params;
  const response = await httpClient.get<BlockHistoryResponse>(
    `/api/v1/sessions/${sessionId}/blocks`,
    {
      params: { limit, before_id },
    },
  );

  const historyItems = response?.blocks || [];
  // 后端倒序返回（最新在前），前端需正序渲染：反转后加载
  const mappedBlocks: Block[] = historyItems
    .map(item => ({
      id: item.block_id,
      kind: item.kind,
      data: item.data || {},
      parentId: item.parent_id ?? undefined,
      sequence: item.sequence,
      actorId: item.actor?.id,
      actorRole: item.actor?.role,
      historyId: item.id,
    }))
    .reverse();

  const nextBeforeId =
    historyItems.length > 0 ? Math.min(...historyItems.map(item => item.id)) : (before_id ?? null);

  return {
    blocks: mappedBlocks,
    hasMore: Boolean(response?.has_more),
    nextBeforeId,
    lastEventId: response?.last_event_id ?? null,
  };
}

// ============ Task API ============

/**
 * 中断任务
 * POST /v1/sessions/{session_id}/task/abort
 */
export function abortTask(sessionId: number) {
  return httpClient.post<AbortResponse>(`/api/v1/sessions/${sessionId}/task/abort`);
}

// ============ SSE Stream ============

export interface SSECallbacks {
  onBlock?: (event: BlockEvent, sseId: string) => void;
  onComplete?: (data: { invocation_id: string; block_count: number }, sseId: string) => void;
  onSuspended?: (
    data: { invocation_id: string; block_count: number; request_id: string; request_type: string },
    sseId: string,
  ) => void;
  onAborted?: (data: { invocation_id: string; block_count: number }, sseId: string) => void;
  onError?: (
    data: { error_message: string; invocation_id?: string; block_count?: number },
    sseId: string,
  ) => void;
  onConnectionError?: (error: Error) => void;
  onConnected?: () => void;
}

/**
 * 启动任务（后台运行）
 * POST /v1/sessions/{session_id}/task
 */
export function postTask(sessionId: number, params: TaskParams) {
  return httpClient.post<{ session_id: number }>(`/api/v1/sessions/${sessionId}/task`, params);
}

/**
 * 订阅事件流（SSE）
 * POST /v1/sessions/{session_id}/stream
 *
 * @param sessionId 会话 ID
 * @param lastEventId 上次收到的事件 ID（0=从开头，$=只看新的）
 * @param callbacks SSE 回调
 * @returns 关闭函数
 */
export function subscribeStream(
  sessionId: number,
  lastEventId: string,
  callbacks: SSECallbacks,
): { close: (reason?: RequestAbortReason) => void; connected: Promise<boolean> } {
  const baseUrl = appEnv.apiBaseUrl || "";
  const url = `${baseUrl}/api/v1/sessions/${sessionId}/stream`;
  const controller = new AbortController();
  let isAborted = false;
  const requestId = createRequestId("session-stream");
  let activeAbortContext:
    | {
        method: string;
        url: string;
        requestParams?: unknown;
        traceMeta: RequestTraceMeta;
      }
    | undefined;
  let resolveConnected: (success: boolean) => void;
  const connectedPromise = new Promise<boolean>(resolve => {
    resolveConnected = resolve;
  });

  const connect = async (isRetry = false) => {
    if (isAborted) {
      resolveConnected(false);
      return;
    }

    // 检查并刷新 token（如果即将过期）
    const authStore = useAuthStore.getState();
    if (authStore.isTokenExpired() && authStore.token?.refresh_token) {
      try {
        const success = await authStore.refreshToken();
        if (!success) {
          logger.error("Session SSE: Token refresh failed before connect");
          callbacks.onConnectionError?.(new Error("令牌刷新失败"));
          return;
        }
      } catch (error) {
        logger.error("Session SSE: Token refresh error", error);
        callbacks.onConnectionError?.(error instanceof Error ? error : new Error(String(error)));
        return;
      }
    }

    const token = getAuthToken();
    if (!token) {
      logger.error("Session SSE: No auth token available");
      callbacks.onConnectionError?.(new Error("未登录"));
      resolveConnected(false);
      return;
    }

    try {
      const streamPayload = {
        last_id: lastEventId,
      };
      const streamTrace = buildFetchTraceContext({
        requestId,
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
          Authorization: `Bearer ${token}`,
        },
        data: streamPayload,
      });
      activeAbortContext = {
        method: "POST",
        url,
        requestParams: streamPayload,
        traceMeta: streamTrace.traceMeta,
      };
      const response = await fetch(url, {
        method: "POST",
        headers: streamTrace.headers,
        body: JSON.stringify(streamPayload),
        signal: controller.signal,
      });

      // 处理 401：尝试刷新 token 并重连
      if (response.status === 401 && !isRetry) {
        logger.warn("Session SSE: Received 401, attempting token refresh");
        const refreshSuccess = await authStore.refreshToken();
        if (refreshSuccess) {
          logger.info("Session SSE: Token refreshed, reconnecting");
          return connect(true);
        } else {
          logger.error("Session SSE: Token refresh failed");
          await authStore.logout({ callApi: false });
          callbacks.onConnectionError?.(new Error("令牌刷新失败，请重新登录"));
          resolveConnected(false);
          return;
        }
      }

      if (!response.ok) {
        resolveConnected(false);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        resolveConnected(false);
        throw new Error("No response body");
      }

      // 连接成功
      resolveConnected(true);
      callbacks.onConnected?.();

      const decoder = new TextDecoder();
      let eventType = "";
      let currentSseId = "";
      let lineBuffer = ""; // 缓存不完整的行

      const processLine = (line: string) => {
        if (line.startsWith("id:")) {
          currentSseId = line.substring(3).trim();
        } else if (line.startsWith("event:")) {
          eventType = line.substring(6).trim();
        } else if (line.startsWith("data:")) {
          const dataStr = line.substring(5).trim();
          if (!dataStr) return;

          try {
            const data = JSON.parse(dataStr);
            switch (eventType) {
              case "block":
                callbacks.onBlock?.(data, currentSseId);
                break;
              case "complete":
                callbacks.onComplete?.(data, currentSseId);
                break;
              case "suspended":
                callbacks.onSuspended?.(data, currentSseId);
                break;
              case "aborted":
                callbacks.onAborted?.(data, currentSseId);
                break;
              case "error":
                callbacks.onError?.(data, currentSseId);
                break;
              default:
                if (data.block_id) {
                  callbacks.onBlock?.(data, currentSseId);
                }
            }
          } catch {
            console.warn("Failed to parse SSE data:", dataStr);
          }
          eventType = "";
        }
      };

      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done || isAborted) return;

        const text = decoder.decode(value, { stream: true });
        // 拼接上次的不完整行
        const combined = lineBuffer + text;
        const lines = combined.split("\n");

        // 最后一个元素可能是不完整的行，留到下次
        lineBuffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            processLine(line);
          }
        }
        return pump();
      };

      await pump();
      activeAbortContext = undefined;
      // Stream 正常结束（服务器重启/断开）— 通知上层重连
      if (!isAborted) {
        callbacks.onConnectionError?.(new Error("SSE 连接已断开"));
      }
    } catch (error) {
      if (isAborted || (error instanceof Error && error.name === "AbortError")) {
        if (activeAbortContext) {
          reportRequestAbortToFeishu({
            method: activeAbortContext.method,
            url: activeAbortContext.url,
            params: activeAbortContext.requestParams,
            requestId: activeAbortContext.traceMeta.requestId,
            durationMs: resolveRequestDurationMs(activeAbortContext.traceMeta),
            abortMeta: readRequestAbortMeta(controller.signal),
          });
        }
        resolveConnected(false);
        return;
      }
      resolveConnected(false);
      callbacks.onConnectionError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  void connect();

  return {
    close: reason => {
      isAborted = true;
      abortRequest(controller, {
        reason: reason ?? "stream_restart",
      });
    },
    connected: connectedPromise,
  };
}

// ============ Artifacts API ============

export interface ArtifactResponse {
  id: number;
  artifact_id: string;
  kind: string;
  title: string | null;
  summary: string | null;
  data:
    | { images?: ArtifactImage[]; prompt?: string; sequential?: boolean; size?: number }
    | { content_url?: string; word_count?: number };
  created_at: string | null;
  updated_at: string | null;
}

export interface ArtifactsListResponse {
  artifacts: ArtifactResponse[];
  total: number;
}

/**
 * 列出会话的 Artifacts
 * GET /v1/sessions/{session_id}/artifacts
 */
export function listSessionArtifacts(sessionId: number, kind?: string) {
  const params: Record<string, unknown> = {};
  if (kind) {
    params.kind = kind;
  }
  return httpClient.get<ArtifactsListResponse>(`/api/v1/sessions/${sessionId}/artifacts`, {
    params,
  });
}

/**
 * 获取 Artifact 详情
 * GET /v1/artifacts/{artifact_id}
 */
export function getArtifact(artifactId: string) {
  return httpClient.get<ArtifactResponse>(`/api/v1/artifacts/${artifactId}`);
}

export interface ArtifactUpdateData {
  title?: string;
  content?: string;
}

/**
 * 更新 Artifact（仅 markdown/html 类型）
 * PUT /v1/artifacts/{artifact_id}
 */
export function updateArtifact(artifactId: string, data: ArtifactUpdateData) {
  return httpClient.put<ArtifactResponse>(`/api/v1/artifacts/${artifactId}`, { data });
}

// ============ PPT Slide Regenerate ============

export interface SlideRegenerateRequest {
  prompt: string;
  reference_images?: string[];
}

export interface SlideRegenerateData {
  slide_index: number;
  prompt: string;
  image_url: string;
}

/**
 * 重新生成 PPT 指定页
 * POST /v1/artifacts/{artifact_id}/slides/{slide_index}/regenerate
 */
export function regeneratePptSlide(
  artifactId: string,
  slideIndex: number,
  data: SlideRegenerateRequest,
) {
  return httpClient.post<{ code: number; data: SlideRegenerateData }>(
    `/api/v1/artifacts/${artifactId}/slides/${slideIndex}/regenerate`,
    data,
    { timeout: 300000 },
  );
}

// ============ PPT Slides Update ============

export interface SlideUpdateItem {
  index: number;
  prompt: string;
  image_url?: string | null;
}

/**
 * 更新 PPT slides（顺序调整）
 * PUT /v1/artifacts/{artifact_id}/slides
 */
export function updatePptSlides(artifactId: string, slides: SlideUpdateItem[]) {
  return httpClient.put(`/api/v1/artifacts/${artifactId}/slides`, { slides });
}

/**
 * 导出 PPT 为 .pptx 文件
 * POST /v1/artifacts/{artifact_id}/export/pptx
 */
export function exportPptx(artifactId: string): Promise<Blob> {
  return httpClient.post<Blob>(`/api/v1/artifacts/${artifactId}/export/pptx`, undefined, {
    responseType: "blob",
    timeout: 120000,
  });
}
