import type { AxiosError } from "axios";
import type { AxiosRequestConfig } from "axios";
import { appEnv, isProd, isTest } from "@/utils/env";
import { resolveRequestAbortReasonLabel, type RequestAbortMeta } from "@/utils/requestAbort";
import {
  readRequestIdFromHeaders,
  resolveRequestDurationMs,
  resolveRequestId,
  type RequestTraceCarrier,
} from "@/utils/requestTrace";
import { useAuthStore } from "@/store/auth";

/**
 * 飞书 Webhook 请求体（文本消息）
 * @see https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN
 */
interface FeishuTextPayload {
  msg_type: "text";
  content: { text: string };
}

/* ========== 全局限流 ========== */

/** 每分钟最多上报次数 */
const MAX_REPORTS_PER_MINUTE = 10;
/** 滑动窗口：记录每次上报的时间戳 */
let _reportTimestamps: number[] = [];

/**
 * 检查是否超出频率限制
 * 滑动窗口算法：保留最近 1 分钟内的上报时间戳，超过阈值则丢弃
 */
function isRateLimited(): boolean {
  const now = Date.now();
  _reportTimestamps = _reportTimestamps.filter(t => now - t < 60_000);
  if (_reportTimestamps.length >= MAX_REPORTS_PER_MINUTE) return true;
  _reportTimestamps.push(now);
  return false;
}

/* ========== 去重 ========== */

/** 10 秒内相同 key 不重复上报 */
const _recentErrors = new Map<string, number>();
const DEDUP_INTERVAL = 60_000;

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const last = _recentErrors.get(key);
  if (last && now - last < DEDUP_INTERVAL) return true;
  _recentErrors.set(key, now);
  // 清理过期条目，防止内存泄漏
  if (_recentErrors.size > 200) {
    for (const [k, ts] of _recentErrors) {
      if (now - ts > DEDUP_INTERVAL) _recentErrors.delete(k);
    }
  }
  return false;
}

/* ========== 用户信息 ========== */

/** 从 auth store 读取当前用户信息，用于上报时标识操作人 */
function getUserLabel(): string {
  try {
    const user = useAuthStore.getState().user;
    if (!user) return "未登录";
    return `${user.username}(ID:${user.id})`;
  } catch {
    return "未知";
  }
}

/* ========== 内部公共发送 ========== */

/**
 * 向飞书 Webhook 发送文本消息（内部方法）
 * - fire-and-forget，内部 catch 保证不抛错
 * - 统一走限流 + 签名逻辑
 */
function sendToFeishu(text: string): void {
  try {
    if (!isProd && !isTest) return;
    const webhook = appEnv.feishuWebhook;
    if (!webhook || typeof webhook !== "string" || !webhook.trim()) return;
    if (isRateLimited()) return;

    const payload: FeishuTextPayload = { msg_type: "text", content: { text } };
    const body = JSON.stringify(payload);
    const secret = appEnv.feishuWebhookSecret?.trim();

    if (secret) {
      void (async () => {
        try {
          const timestamp = String(Math.floor(Date.now() / 1000));
          const sign = await computeFeishuSign(timestamp, secret);
          const url = `${webhook}${webhook.includes("?") ? "&" : "?"}timestamp=${encodeURIComponent(timestamp)}&sign=${encodeURIComponent(sign)}`;
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          });
        } catch {
          // 静默忽略
        }
      })();
    } else {
      fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // 整个发送过程出错也静默忽略，绝不影响业务
  }
}

/* ========== 敏感字段脱敏 ========== */

const SENSITIVE_KEYS = ["password", "sms_code", "token", "access_token", "refresh_token", "secret"];

function stringifyParams(obj: unknown): string {
  if (obj == null) return "";
  if (typeof obj !== "object") return String(obj);
  try {
    const redacted: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const lower = k.toLowerCase();
      redacted[k] = SENSITIVE_KEYS.some(s => lower.includes(s.toLowerCase())) ? "***" : v;
    }
    return JSON.stringify(redacted);
  } catch {
    return String(obj);
  }
}

/* ========== HTTP 接口错误上报 ========== */

/**
 * 将接口报错信息上报到飞书群机器人
 * - 仅在配置了 VITE_FEISHU_WEBHOOK 时执行
 * - 采用 fire-and-forget，不阻塞主流程，内部 catch 避免抛错
 */
/** 不需要上报的客户端 HTTP 状态码（预期业务流程） */
const SKIP_HTTP_STATUS = new Set([400, 404, 409, 422]);

interface TraceableAxiosRequestConfig extends AxiosRequestConfig, RequestTraceCarrier {}

export interface RequestErrorReportOptions {
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  params?: unknown;
  message: string;
  detail?: string;
  bizCode?: unknown;
  requestId?: string;
  durationMs?: number;
  abortReason?: string;
}

export interface RequestAbortReportOptions {
  method: string;
  url: string;
  params?: unknown;
  requestId?: string;
  durationMs?: number;
  abortMeta?: RequestAbortMeta;
}

const buildFullUrl = (url: string, base?: string): string => {
  if (url.startsWith("http")) {
    return url;
  }
  if (!base) {
    return url;
  }
  return `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
};

const isLikelyNetworkFailure = (message: string): boolean => {
  return (
    message.includes("network error") ||
    message.includes("failed to fetch") ||
    message.includes("load failed")
  );
};

/**
 * 将通用请求错误信息上报到飞书群机器人。
 */
export function reportRequestErrorToFeishu({
  method,
  url,
  status,
  statusText,
  params,
  message,
  detail,
  bizCode,
  requestId,
  durationMs,
  abortReason,
}: RequestErrorReportOptions): void {
  try {
    const normalizedMessage = message.trim().toLowerCase();

    if (
      normalizedMessage === "canceled" ||
      normalizedMessage === "aborterror" ||
      normalizedMessage.includes("aborted")
    ) {
      return;
    }

    if (status && SKIP_HTTP_STATUS.has(status)) {
      return;
    }

    if (!navigator.onLine) {
      return;
    }

    if (!status && isLikelyNetworkFailure(normalizedMessage)) {
      return;
    }

    const normalizedMethod = method.toUpperCase() || "GET";
    const dedupKey = `http:${normalizedMethod}:${url}:${status ?? ""}`;
    if (isDuplicate(dedupKey)) {
      return;
    }

    const requestParamsLine = params == null ? "" : `请求参数: ${stringifyParams(params)}`;
    const requestIdLine = requestId?.trim() ? `链路ID: ${requestId.trim()}` : "";
    const durationLine =
      typeof durationMs === "number" && Number.isFinite(durationMs)
        ? `耗时: ${Math.max(0, Math.round(durationMs))}ms`
        : "";
    const abortReasonLine = abortReason?.trim() ? `取消原因: ${abortReason.trim()}` : "";

    const text = [
      "【前端接口报错】",
      `环境: ${appEnv.mode ?? "unknown"}`,
      `用户: ${getUserLabel()}`,
      `时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
      `请求: ${normalizedMethod} ${url}`,
      requestIdLine,
      durationLine,
      requestParamsLine,
      `状态: ${status ?? "-"} ${statusText ?? ""}`.trim(),
      bizCode != null ? `业务码: ${String(bizCode)}` : "",
      abortReasonLine,
      `错误: ${message || "Unknown error"}`,
      detail ? `详情: ${detail}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    sendToFeishu(text);
  } catch {
    // 上报过程出错静默忽略，绝不影响业务
  }
}

/**
 * 将请求取消信息上报到飞书群机器人。
 */
export function reportRequestAbortToFeishu({
  method,
  url,
  params,
  requestId,
  durationMs,
  abortMeta,
}: RequestAbortReportOptions): void {
  try {
    if (!navigator.onLine) {
      return;
    }

    const abortReasonText = resolveRequestAbortReasonLabel(abortMeta) || "未知取消原因";
    const normalizedMethod = method.toUpperCase() || "GET";
    const dedupKey = `abort:${normalizedMethod}:${url}:${abortMeta?.reason ?? "unknown"}`;
    if (isDuplicate(dedupKey)) {
      return;
    }

    const requestParamsLine = params == null ? "" : `请求参数: ${stringifyParams(params)}`;
    const requestIdLine = requestId?.trim() ? `链路ID: ${requestId.trim()}` : "";
    const durationLine =
      typeof durationMs === "number" && Number.isFinite(durationMs)
        ? `耗时: ${Math.max(0, Math.round(durationMs))}ms`
        : "";

    const text = [
      "【前端请求取消】",
      `环境: ${appEnv.mode ?? "unknown"}`,
      `用户: ${getUserLabel()}`,
      `时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
      `请求: ${normalizedMethod} ${url}`,
      requestIdLine,
      durationLine,
      requestParamsLine,
      `取消原因: ${abortReasonText}`,
    ]
      .filter(Boolean)
      .join("\n");

    sendToFeishu(text);
  } catch {
    // 上报过程出错静默忽略，绝不影响业务
  }
}

export function reportHttpErrorToFeishu(
  error: AxiosError,
  config?: TraceableAxiosRequestConfig,
): void {
  try {
    const status = error.response?.status;
    const normalizedMessage = error.message.trim().toLowerCase();

    // AbortController / axios 主动取消请求属于预期行为，不上报。
    if (
      error.code === "ERR_CANCELED" ||
      error.name === "CanceledError" ||
      normalizedMessage === "canceled"
    ) {
      return;
    }

    // 跳过客户端错误（400/404/409/422 属于预期业务流程）
    if (status && SKIP_HTTP_STATUS.has(status)) return;

    // 用户离线时的网络错误不上报
    if (!navigator.onLine) return;

    // Network Error（无响应的网络错误，如断网、服务不可达、CORS 等）不上报
    if (error.code === "ERR_NETWORK") return;

    const method = config?.method?.toUpperCase() ?? "GET";
    const url = config?.url ?? "";
    const base = config?.baseURL || appEnv.apiBaseUrl;
    const fullUrl = buildFullUrl(url, base);

    const statusText = error.response?.statusText ?? "";
    const message = error.message || "Unknown error";
    const responseData =
      error.response?.data && typeof error.response.data === "object"
        ? (error.response.data as Record<string, unknown>)
        : null;
    const dataMsg = responseData && "message" in responseData ? String(responseData.message) : "";
    const bizCode = responseData && "code" in responseData ? responseData.code : null;
    const requestId =
      readRequestIdFromHeaders(error.response?.headers) ||
      resolveRequestId({
        requestId: config?.requestId,
        headers: config?.headers,
        params: config?.params,
        data: config?.data,
      });
    const durationMs = resolveRequestDurationMs(config?.traceMeta);

    reportRequestErrorToFeishu({
      method,
      url: fullUrl,
      status,
      statusText,
      params: method === "GET" ? config?.params : config?.data,
      message,
      detail: dataMsg,
      bizCode,
      requestId,
      durationMs,
    });
  } catch {
    // 上报过程出错静默忽略，绝不影响业务
  }
}

/* ========== 通用运行时错误上报 ========== */

interface ReportErrorOptions {
  /** 错误类型，如 "TypeError"、"UnhandledRejection"、"React ErrorBoundary" */
  type: string;
  /** 错误信息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 额外上下文 */
  extra?: string;
}

/**
 * 将前端运行时错误上报到飞书群机器人
 * - fire-and-forget，不阻塞主流程
 * - 10 秒内同一错误自动去重
 * - 全局每分钟最多上报 10 次
 */
export function reportErrorToFeishu({ type, message, stack, extra }: ReportErrorOptions): void {
  try {
    const dedupKey = `rt:${type}:${message}`;
    if (isDuplicate(dedupKey)) return;

    const text = [
      "【前端运行时报错】",
      `环境: ${appEnv.mode ?? "unknown"}`,
      `用户: ${getUserLabel()}`,
      `时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
      `页面: ${location.href}`,
      `错误类型: ${type}`,
      `错误信息: ${message}`,
      stack ? `堆栈:\n${stack}` : "",
      extra ? `附加信息: ${extra}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    sendToFeishu(text);
  } catch {
    // 上报过程出错静默忽略，绝不影响业务
  }
}

/* ========== 飞书签名 ========== */

/**
 * 飞书自定义机器人签名：密钥 = timestamp + "\\n" + secret，对空串做 HmacSHA256 再 Base64
 * @see https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN
 */
async function computeFeishuSign(timestamp: string, secret: string): Promise<string> {
  const keyStr = `${timestamp}\n${secret}`;
  const keyBytes = new TextEncoder().encode(keyStr);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new ArrayBuffer(0));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
