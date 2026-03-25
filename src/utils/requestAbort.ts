const REQUEST_ABORT_REASON_LABELS = {
  user_stop: "用户主动停止",
  channel_switch: "切换频道",
  session_switch: "切换会话",
  component_unmount: "组件卸载",
  stream_restart: "重建流连接",
  message_resend: "重新发起消息",
  no_consumers: "无活跃订阅者",
  system_stop: "手动停止系统事件",
} as const;

export type RequestAbortReason = keyof typeof REQUEST_ABORT_REASON_LABELS;

export interface RequestAbortMeta {
  reason: RequestAbortReason;
  detail?: string;
}

const abortMetaStore = new WeakMap<AbortSignal, RequestAbortMeta>();

const normalizeAbortReason = (value: unknown): RequestAbortReason | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  if (value in REQUEST_ABORT_REASON_LABELS) {
    return value as RequestAbortReason;
  }
  return undefined;
};

/**
 * 使用业务原因中止请求，并将原因附着到 signal 上。
 */
export function abortRequest(controller: AbortController, meta: RequestAbortMeta): void {
  abortMetaStore.set(controller.signal, meta);
  controller.abort();
}

/**
 * 读取请求中止原因。
 */
export function readRequestAbortMeta(signal?: AbortSignal | null): RequestAbortMeta | undefined {
  if (!signal) {
    return undefined;
  }

  const storedMeta = abortMetaStore.get(signal);
  if (storedMeta) {
    return storedMeta;
  }

  const signalWithReason = signal as AbortSignal & {
    reason?: unknown;
  };
  const nativeReason = signalWithReason.reason;

  const normalizedReason = normalizeAbortReason(nativeReason);
  if (normalizedReason) {
    return {
      reason: normalizedReason,
    };
  }

  if (nativeReason && typeof nativeReason === "object") {
    const record = nativeReason as Record<string, unknown>;
    const objectReason = normalizeAbortReason(record.reason);
    if (objectReason) {
      return {
        reason: objectReason,
        detail: typeof record.detail === "string" ? record.detail : undefined,
      };
    }
  }

  return undefined;
}

/**
 * 将中止原因转换为可读文本。
 */
export function resolveRequestAbortReasonLabel(meta?: RequestAbortMeta): string | undefined {
  if (!meta) {
    return undefined;
  }
  const label = REQUEST_ABORT_REASON_LABELS[meta.reason];
  if (!label) {
    return undefined;
  }
  return meta.detail?.trim() ? `${label}(${meta.detail.trim()})` : label;
}
