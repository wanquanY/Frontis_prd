import { fetchEventSource, type EventSourceMessage } from "@microsoft/fetch-event-source";
import { getAuthToken, useAuthStore } from "@/store/auth";
import { appEnv } from "@/utils/env";
import { reportRequestAbortToFeishu } from "@/utils/feishuReport";
import { logger } from "@/utils/logger";
import { abortRequest, readRequestAbortMeta, type RequestAbortReason } from "@/utils/requestAbort";
import {
  buildFetchTraceContext,
  createRequestId,
  resolveRequestDurationMs,
  type RequestTraceMeta,
} from "@/utils/requestTrace";

export type SystemEventHandler<T = unknown> = (payload: T, raw?: EventSourceMessage) => void;

type LifecycleKind = "open" | "error" | "close";

interface SystemEventsRetryState {
  has401Retried: boolean;
  lastConnectedAt: number;
  shortLivedReconnects: number;
}

interface SystemEventsRuntimeState {
  eventHandlers: Map<string, Set<SystemEventHandler>>;
  lifecycleHandlers: Record<LifecycleKind, Set<(arg?: unknown) => void>>;
  controller: AbortController | null;
  isStarting: boolean;
  isConnected: boolean;
  startPromise: Promise<void> | null;
  consumerCount: number;
  retryState: SystemEventsRetryState;
}

const SYSTEM_EVENTS_RUNTIME_KEY = "__SYNGENTS_WEB_SYSTEM_EVENTS_STATE__";

const systemEventsHost = globalThis as typeof globalThis & {
  __SYNGENTS_WEB_SYSTEM_EVENTS_STATE__?: SystemEventsRuntimeState;
};

const createRuntimeState = (): SystemEventsRuntimeState => ({
  eventHandlers: new Map<string, Set<SystemEventHandler>>(),
  lifecycleHandlers: {
    open: new Set(),
    error: new Set(),
    close: new Set(),
  },
  controller: null,
  isStarting: false,
  isConnected: false,
  startPromise: null,
  consumerCount: 0,
  retryState: {
    has401Retried: false,
    lastConnectedAt: 0,
    shortLivedReconnects: 0,
  },
});

const runtimeState =
  systemEventsHost[SYSTEM_EVENTS_RUNTIME_KEY] ??
  (systemEventsHost[SYSTEM_EVENTS_RUNTIME_KEY] = createRuntimeState());

const getUrl = (): string => {
  const baseUrl = (appEnv.apiBaseUrl || "").replace(/\/$/, "");
  const path = "/api/v1/system-events/subscribe";
  return baseUrl ? `${baseUrl}${path}` : path;
};

const emitLifecycle = (kind: LifecycleKind, arg?: unknown): void => {
  runtimeState.lifecycleHandlers[kind].forEach(listener => {
    try {
      listener(arg);
    } catch (error) {
      logger.warn("systemEvents lifecycle listener error", error);
    }
  });
};

const dispatchEvent = (type: string, payload: unknown, raw?: EventSourceMessage): void => {
  const listeners = runtimeState.eventHandlers.get(type);
  if (!listeners || listeners.size === 0) return;
  listeners.forEach(handler => {
    try {
      handler(payload, raw);
    } catch (error) {
      logger.warn("systemEvents handler error", error);
    }
  });
};

const parseJsonLines = (raw: string): unknown[] => {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const results: unknown[] = [];
  lines.forEach(line => {
    try {
      results.push(JSON.parse(line));
    } catch (error) {
      logger.warn("systemEvents: failed to parse line", line, error);
    }
  });
  return results;
};

const isEventStreamResponse = (res: Response): boolean =>
  (res.headers.get("content-type") || "").toLowerCase().includes("text/event-stream");

const applyJitter = (delayMs: number, ratio = 0.2): number => {
  if (delayMs <= 0) return 0;
  const bounded = Math.max(0, Math.min(0.9, ratio));
  const minFactor = 1 - bounded;
  const maxFactor = 1 + bounded;
  const factor = minFactor + Math.random() * (maxFactor - minFactor);
  return Math.max(0, Math.floor(delayMs * factor));
};

const stopInternal = (reason?: RequestAbortReason): void => {
  if (runtimeState.controller) {
    if (reason) {
      abortRequest(runtimeState.controller, {
        reason,
      });
    } else {
      runtimeState.controller.abort();
    }
    runtimeState.controller = null;
  }
};

const startInternal = async (): Promise<void> => {
  if (runtimeState.startPromise) {
    return runtimeState.startPromise;
  }

  const token = getAuthToken();
  if (!token) return;
  if (runtimeState.isConnected || runtimeState.isStarting) return;

  runtimeState.isStarting = true;
  runtimeState.retryState.has401Retried = false;

  const controller = new AbortController();
  runtimeState.controller = controller;
  const url = getUrl();
  const requestId = createRequestId("system-events");
  let activeTraceMeta: RequestTraceMeta | undefined;

  const startPromise = fetchEventSource(url, {
    signal: controller.signal,
    openWhenHidden: false,
    async fetch(input, init) {
      const nextToken = getAuthToken();
      const tracedRequest = buildFetchTraceContext({
        requestId,
        headers: init?.headers,
      });
      activeTraceMeta = tracedRequest.traceMeta;
      if (nextToken) {
        tracedRequest.headers.set("Authorization", `Bearer ${nextToken}`);
      }
      return globalThis.fetch(input, {
        ...init,
        headers: tracedRequest.headers,
      });
    },
    async onopen(res) {
      if (res.ok && isEventStreamResponse(res)) {
        runtimeState.retryState.has401Retried = false;
        runtimeState.retryState.lastConnectedAt = Date.now();
        runtimeState.retryState.shortLivedReconnects = 0;
        runtimeState.isConnected = true;
        emitLifecycle("open");
        return;
      }

      if (res.status === 401) {
        if (runtimeState.retryState.has401Retried) {
          stopInternal();
          return;
        }
        runtimeState.retryState.has401Retried = true;
        const refreshed = await useAuthStore.getState().refreshToken();
        if (!refreshed) {
          stopInternal();
          return;
        }
        throw new Error("401_RETRY");
      }

      if (res.status >= 400 && res.status < 500) {
        stopInternal();
        throw new Error(`HTTP_${res.status}`);
      }

      throw new Error(`HTTP_${res.status}`);
    },
    onmessage(ev) {
      if (!ev?.data || !ev.event) return;
      const parsed = parseJsonLines(ev.data);
      parsed.forEach(item => dispatchEvent(ev.event, item, ev));
    },
    onclose() {
      runtimeState.isConnected = false;
      emitLifecycle("close");
      throw new Error("closed");
    },
    onerror(err) {
      runtimeState.isConnected = false;
      if (controller.signal.aborted) throw err;
      if (err?.message === "401_RETRY") return 0;

      const now = Date.now();
      const connectedDuration = runtimeState.retryState.lastConnectedAt
        ? now - runtimeState.retryState.lastConnectedAt
        : Number.POSITIVE_INFINITY;
      if (connectedDuration < 2000) {
        runtimeState.retryState.shortLivedReconnects += 1;
      } else {
        runtimeState.retryState.shortLivedReconnects = 0;
      }

      emitLifecycle("error", err);

      const backoffMultiplier = Math.min(runtimeState.retryState.shortLivedReconnects, 4);
      const delay = 3000 * Math.pow(2, backoffMultiplier);
      return Math.min(applyJitter(delay), 30000);
    },
  })
    .catch(error => {
      if (error?.message === "401_RETRY") {
        runtimeState.isConnected = false;
        runtimeState.isStarting = false;
        runtimeState.startPromise = null;
        void startInternal();
        return;
      }
      if (controller.signal.aborted) {
        const abortMeta = readRequestAbortMeta(controller.signal);
        if (abortMeta && activeTraceMeta) {
          reportRequestAbortToFeishu({
            method: "GET",
            url,
            requestId: activeTraceMeta.requestId,
            durationMs: resolveRequestDurationMs(activeTraceMeta),
            abortMeta,
          });
        }
      }
      if (!controller.signal.aborted) {
        emitLifecycle("error", error);
      }
      runtimeState.isConnected = false;
    })
    .finally(() => {
      if (runtimeState.controller === controller && controller.signal.aborted) {
        runtimeState.controller = null;
      }
      runtimeState.isStarting = false;
      if (runtimeState.startPromise === startPromise) {
        runtimeState.startPromise = null;
      }
    });

  runtimeState.startPromise = startPromise;
  return startPromise;
};

/**
 * 注册一个 system-events 使用者，并确保全局 SSE 连接只维持一条。
 */
export const retainSystemEvents = (): (() => void) => {
  runtimeState.consumerCount += 1;
  void startInternal();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    runtimeState.consumerCount = Math.max(0, runtimeState.consumerCount - 1);
    if (runtimeState.consumerCount === 0) {
      stopInternal("no_consumers");
      runtimeState.isConnected = false;
      runtimeState.isStarting = false;
      runtimeState.startPromise = null;
    }
  };
};

export const ensureSystemEventsRunning = (): void => {
  if (runtimeState.isConnected) return;
  if (runtimeState.isStarting) {
    if (!runtimeState.controller || runtimeState.controller.signal.aborted) {
      runtimeState.isStarting = false;
    } else {
      return;
    }
  }
  void startInternal();
};

export const stopSystemEvents = (): void => {
  runtimeState.consumerCount = 0;
  stopInternal("system_stop");
  runtimeState.isConnected = false;
  runtimeState.isStarting = false;
  runtimeState.startPromise = null;
};

export const subscribeSystemEvent = <T = unknown>(
  event: string,
  handler: SystemEventHandler<T>,
): (() => void) => {
  const set = runtimeState.eventHandlers.get(event) ?? new Set<SystemEventHandler>();
  set.add(handler as SystemEventHandler);
  runtimeState.eventHandlers.set(event, set);
  return () => {
    const current = runtimeState.eventHandlers.get(event);
    if (!current) return;
    current.delete(handler as SystemEventHandler);
    if (current.size === 0) {
      runtimeState.eventHandlers.delete(event);
    }
  };
};

export const subscribeSystemLifecycle = (
  kind: LifecycleKind,
  listener: (arg?: unknown) => void,
): (() => void) => {
  runtimeState.lifecycleHandlers[kind].add(listener);
  return () => runtimeState.lifecycleHandlers[kind].delete(listener);
};

export const isSystemEventsActive = (): boolean =>
  !!runtimeState.controller && !runtimeState.controller.signal.aborted;
