const REQUEST_ID_FIELDS = ["requestId", "request_id", "invocationId", "invocation_id"] as const;

export const REQUEST_ID_HEADER = "X-Request-Id";

interface RequestTraceLookupContext {
  requestId?: string;
  headers?: unknown;
  params?: unknown;
  data?: unknown;
}

interface HeaderReader {
  get: (name: string) => unknown;
}

export interface RequestTraceMeta {
  requestId: string;
  startedAt: number;
}

export interface RequestTraceCarrier {
  requestId?: string;
  traceMeta?: RequestTraceMeta;
}

export interface FetchTraceContext {
  headers: Headers;
  traceMeta: RequestTraceMeta;
}

const normalizeTraceValue = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
};

const hasHeaderReader = (value: unknown): value is HeaderReader => {
  return Boolean(
    value && typeof value === "object" && "get" in value && typeof value.get === "function",
  );
};

const readRequestIdFromRecord = (record: Record<string, unknown>): string | undefined => {
  for (const key of REQUEST_ID_FIELDS) {
    const requestId = normalizeTraceValue(record[key]);
    if (requestId) {
      return requestId;
    }
  }
  return undefined;
};

const readRequestIdFromPayload = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) {
    for (const key of REQUEST_ID_FIELDS) {
      const requestId = normalizeTraceValue(value.get(key));
      if (requestId) {
        return requestId;
      }
    }
    return undefined;
  }

  if (typeof FormData !== "undefined" && value instanceof FormData) {
    for (const key of REQUEST_ID_FIELDS) {
      const requestId = normalizeTraceValue(value.get(key));
      if (requestId) {
        return requestId;
      }
    }
    return undefined;
  }

  if (isRecord(value)) {
    return readRequestIdFromRecord(value);
  }

  return undefined;
};

/**
 * 生成前端侧链路请求 ID。
 */
export function createRequestId(prefix = "web"): string {
  const normalizedPrefix = prefix.trim() || "web";
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${normalizedPrefix}-${crypto.randomUUID()}`;
  }
  return `${normalizedPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 从请求头对象中读取链路请求 ID。
 */
export function readRequestIdFromHeaders(headers?: unknown): string | undefined {
  if (!headers) {
    return undefined;
  }

  if (hasHeaderReader(headers)) {
    const requestId =
      normalizeTraceValue(headers.get(REQUEST_ID_HEADER)) ||
      normalizeTraceValue(headers.get(REQUEST_ID_HEADER.toLowerCase()));
    if (requestId) {
      return requestId;
    }
  }

  if (!isRecord(headers)) {
    return undefined;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== REQUEST_ID_HEADER.toLowerCase()) {
      continue;
    }
    const requestId = normalizeTraceValue(value);
    if (requestId) {
      return requestId;
    }
  }

  return undefined;
}

/**
 * 从请求上下文中解析链路请求 ID。
 */
export function resolveRequestId(context: RequestTraceLookupContext = {}): string | undefined {
  return (
    normalizeTraceValue(context.requestId) ||
    readRequestIdFromHeaders(context.headers) ||
    readRequestIdFromPayload(context.params) ||
    readRequestIdFromPayload(context.data)
  );
}

/**
 * 创建请求链路元信息，用于记录 requestId 和起始时间。
 */
export function createRequestTraceMeta(context: RequestTraceLookupContext = {}): RequestTraceMeta {
  return {
    requestId: resolveRequestId(context) || createRequestId(),
    startedAt: Date.now(),
  };
}

/**
 * 为原生 fetch 请求构造带链路 ID 的请求头与元信息。
 */
export function buildFetchTraceContext(
  context: RequestTraceLookupContext & {
    headers?: HeadersInit;
  } = {},
): FetchTraceContext {
  const traceMeta = createRequestTraceMeta(context);
  const headers = new Headers(context.headers);
  headers.set(REQUEST_ID_HEADER, traceMeta.requestId);
  return {
    headers,
    traceMeta,
  };
}

/**
 * 计算请求耗时，返回毫秒值。
 */
export function resolveRequestDurationMs(
  traceMeta?: RequestTraceMeta,
  finishedAt = Date.now(),
): number | undefined {
  if (!traceMeta) {
    return undefined;
  }
  const durationMs = finishedAt - traceMeta.startedAt;
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return undefined;
  }
  return durationMs;
}
