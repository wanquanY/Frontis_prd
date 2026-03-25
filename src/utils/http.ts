import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { appEnv } from "@/utils/env";
import { reportHttpErrorToFeishu } from "@/utils/feishuReport";
import { logger } from "@/utils/logger";
import { cleanParams, sleep } from "@/utils/request";
import {
  REQUEST_ID_HEADER,
  createRequestTraceMeta,
  readRequestIdFromHeaders,
  resolveRequestDurationMs,
  type RequestTraceMeta,
} from "@/utils/requestTrace";
import { getAuthToken, useAuthStore } from "@/store/auth";

// Thread-safe token refresh handling
let isRefreshing = false;
let refreshSubscribers: ((token?: string) => void)[] = [];

const onTokenRefreshed = (token?: string) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token?: string) => void) => {
  refreshSubscribers.push(callback);
};

const isRefreshRequest = (url?: string) => typeof url === "string" && url.includes("/auth/refresh");
const isCanceledRequestError = (error: AxiosError): boolean =>
  error.code === "ERR_CANCELED" || axios.isCancel(error);

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * HttpRequestConfig
 *
 * 扩展自 AxiosRequestConfig，添加项目内通用的请求选项：
 * - `enableCache`：针对 GET 请求启用内存缓存
 * - `cacheTtl`：缓存有效期（毫秒）
 * - `retry`：失败后自动重试次数
 * - `retryDelay`：重试间隔（毫秒）
 */
export interface HttpRequestConfig<T = unknown> extends AxiosRequestConfig<T> {
  enableCache?: boolean;
  cacheTtl?: number;
  retry?: number;
  retryDelay?: number;
  requestId?: string;
  traceMeta?: RequestTraceMeta;
}

type CacheRecord = { expireAt: number; data: unknown };

interface HttpRuntimeRequestConfig<T = unknown> extends HttpRequestConfig<T> {
  __retryCount?: number;
  __isRetryRequest?: boolean;
}

/**
 * HttpClient
 *
 * 封装 axios 的轻量客户端：
 * - 在构造器中创建 axios 实例并注入请求/响应拦截器
 * - 提供内存缓存（针对 GET）与重试逻辑
 */
class HttpClient {
  private instance: AxiosInstance;
  private cache = new Map<string, CacheRecord>();

  constructor() {
    this.instance = axios.create({
      baseURL: appEnv.apiBaseUrl,
      timeout: 10000,
    });

    this.instance.interceptors.request.use(this.onRequest);
    this.instance.interceptors.response.use(this.onResponse, this.onError);
  }

  /**
   * onRequest
   *
   * 请求拦截器：
   * - 从 store 中读取认证 token 并注入 Authorization 头
   * - 对 params 进行清理（去除空值）
   * - 检查 token 是否即将过期，如果是则尝试刷新
   */
  private onRequest = async (
    config: InternalAxiosRequestConfig<unknown>,
  ): Promise<InternalAxiosRequestConfig<unknown>> => {
    const runtimeConfig = config as InternalAxiosRequestConfig<unknown> & HttpRuntimeRequestConfig;

    if (runtimeConfig.params) {
      runtimeConfig.params = cleanParams(runtimeConfig.params);
    }

    const traceMeta =
      runtimeConfig.traceMeta ??
      createRequestTraceMeta({
        requestId: runtimeConfig.requestId,
        headers: runtimeConfig.headers,
        params: runtimeConfig.params,
        data: runtimeConfig.data,
      });
    runtimeConfig.traceMeta = traceMeta;
    runtimeConfig.requestId = traceMeta.requestId;

    const applyRequestHeaders = (token?: string): void => {
      const headers = AxiosHeaders.from(runtimeConfig.headers);
      headers.set(REQUEST_ID_HEADER, traceMeta.requestId);
      if (token) {
        headers.setAuthorization(`Bearer ${token}`);
      }
      runtimeConfig.headers = headers;
    };

    // Skip token refresh check for the refresh token request itself
    if (!isRefreshRequest(runtimeConfig.url)) {
      const authStore = useAuthStore.getState();

      // Check if token is expired or about to expire
      if (authStore.isTokenExpired() && authStore.token?.refresh_token) {
        // If already refreshing, wait for the new token
        if (isRefreshing) {
          return new Promise<InternalAxiosRequestConfig<unknown>>((resolve, reject) => {
            addRefreshSubscriber(newToken => {
              if (!newToken) {
                reject(new Error("Token refresh failed"));
                return;
              }
              applyRequestHeaders(newToken);
              resolve(runtimeConfig);
            });
          });
        }

        // If not refreshing, start the refresh process
        isRefreshing = true;

        try {
          const success = await authStore.refreshToken();
          const newToken = getAuthToken();
          if (success && newToken) {
            applyRequestHeaders(newToken);
            onTokenRefreshed(newToken);
          } else {
            onTokenRefreshed();
            void authStore.logout({ callApi: false });
          }
        } catch (error) {
          logger.error("Token refresh failed", error);
          onTokenRefreshed();
          void authStore.logout({ callApi: false });
        } finally {
          isRefreshing = false;
        }
      }
    }

    if (!isRefreshRequest(runtimeConfig.url)) {
      const token = getAuthToken();
      if (token) {
        applyRequestHeaders(token);
      } else {
        applyRequestHeaders();
      }
    } else {
      applyRequestHeaders();
    }

    return runtimeConfig;
  };

  /**
   * onResponse
   *
   * 响应拦截器：
   * - 兼容后端统一返回结构 `{ code, data, message }`，当 code !== 200 时抛出错误
   * - 否则返回 `data.data`（若存在）或完整 response.data
   */
  private onResponse = (response: AxiosResponse) => {
    const runtimeConfig = response.config as InternalAxiosRequestConfig<unknown> &
      HttpRuntimeRequestConfig;
    const responseRequestId = readRequestIdFromHeaders(response.headers);
    if (responseRequestId) {
      runtimeConfig.requestId = responseRequestId;
      if (runtimeConfig.traceMeta) {
        runtimeConfig.traceMeta.requestId = responseRequestId;
      }
    }

    const durationMs = resolveRequestDurationMs(runtimeConfig.traceMeta);
    if (durationMs !== undefined) {
      logger.debug("HTTP Response", {
        url: runtimeConfig.url,
        status: response.status,
        requestId: runtimeConfig.requestId,
        durationMs,
      });
    }

    const { data } = response;
    if (data && typeof data === "object" && "code" in data && data.code !== 200) {
      const error = new Error((data as { message?: string }).message || "Request Error");
      return Promise.reject(error);
    }
    return data?.data ?? data;
  };

  /**
   * onError
   *
   * 响应错误处理：
   * - 支持基于 `config.retry` 的自动重试（带 `retryDelay`）
   * - 当超过重试次数时记录错误并抛出
   * - 处理 401 错误，尝试刷新令牌
   */
  private onError = async (error: AxiosError) => {
    const config = (error.config || {}) as HttpRuntimeRequestConfig;
    const responseRequestId = readRequestIdFromHeaders(error.response?.headers);
    if (responseRequestId) {
      config.requestId = responseRequestId;
      if (config.traceMeta) {
        config.traceMeta.requestId = responseRequestId;
      }
    }

    // AbortController 主动取消请求属于预期行为，不触发重试和告警上报。
    if (isCanceledRequestError(error)) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized errors
    if (
      error.response?.status === 401 &&
      !config.__isRetryRequest &&
      !isRefreshRequest(config.url)
    ) {
      const authStore = useAuthStore.getState();

      // If already refreshing, wait for the new token
      if (isRefreshing) {
        return new Promise<InternalAxiosRequestConfig<unknown>>((resolve, reject) => {
          addRefreshSubscriber(newToken => {
            if (!newToken) {
              reportHttpErrorToFeishu(error, config);
              reject(error);
              return;
            }
            // Create new headers object with correct type
            const headers = AxiosHeaders.from(config.headers as AxiosHeaders);
            headers.setAuthorization(`Bearer ${newToken}`);
            config.headers = headers;
            // Mark as retry request to prevent infinite loop
            config.__isRetryRequest = true;
            resolve(config as InternalAxiosRequestConfig<unknown>);
          });
        }).then(updatedConfig => this.instance.request(updatedConfig));
      }

      // If not refreshing, start the refresh process
      isRefreshing = true;

      try {
        const success = await authStore.refreshToken();
        const newToken = getAuthToken();
        if (success && newToken) {
          // Create new headers object with correct type
          const headers = AxiosHeaders.from(config.headers as AxiosHeaders);
          headers.setAuthorization(`Bearer ${newToken}`);
          config.headers = headers;
          // Mark as retry request to prevent infinite loop
          config.__isRetryRequest = true;
          onTokenRefreshed(newToken);
          return this.instance.request(config as InternalAxiosRequestConfig<unknown>);
        }
        onTokenRefreshed();
        reportHttpErrorToFeishu(error, config);
        void authStore.logout({ callApi: false });
        return Promise.reject(error);
      } catch (refreshError) {
        logger.error("Token refresh failed in error handler", refreshError);
        // Refresh failed, logout the user
        reportHttpErrorToFeishu(error, config);
        void authStore.logout({ callApi: false });
        onTokenRefreshed();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle normal retry logic
    const { retry = 0, retryDelay = 500 } = config;
    config.__retryCount = config.__retryCount || 0;

    if (config.__retryCount < retry) {
      config.__retryCount += 1;
      logger.warn("Request failed, retrying", config.url, `(${config.__retryCount}/${retry})`);
      await sleep(retryDelay);
      return this.instance.request(config as InternalAxiosRequestConfig<unknown>);
    }

    logger.error("HTTP Error:", error.message);
    if (
      error.response?.data &&
      typeof error.response.data === "object" &&
      "message" in error.response.data
    ) {
      error.message = String(error.response.data.message);
    } else if (
      error.response?.data &&
      typeof error.response.data === "object" &&
      "detail" in error.response.data
    ) {
      const detail = (error.response.data as { detail?: unknown }).detail;
      if (typeof detail === "string" && detail.trim()) {
        error.message = detail;
      } else if (detail && typeof detail === "object" && "message" in detail) {
        error.message = String((detail as { message?: unknown }).message || error.message);
      }
    }
    reportHttpErrorToFeishu(error, config);
    return Promise.reject(error);
  };

  /**
   * buildCacheKey
   *
   * 基于 method/url/params/data 序列化生成缓存键（用于 GET 缓存）
   */
  private buildCacheKey(config: HttpRequestConfig) {
    const { method = "get", url = "", params, data } = config;
    const serialized = JSON.stringify({ method, url, params, data });
    return serialized;
  }

  /**
   * readCache
   *
   * 从内存缓存读取值，若过期则移除并返回 null
   */
  private readCache<T>(key: string) {
    const hit = this.cache.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expireAt) {
      this.cache.delete(key);
      return null;
    }
    return hit.data as T;
  }

  /**
   * writeCache
   *
   * 将数据写入内存缓存并设置过期时间（毫秒）
   */
  private writeCache(key: string, data: unknown, ttl: number) {
    this.cache.set(key, { data, expireAt: Date.now() + ttl });
  }

  /**
   * request
   *
   * 公共请求方法：
   * - 合并传入配置
   * - 对 GET 请求根据 `enableCache` 启用内存缓存策略
   * - 其他方法直接透传到 axios 实例
   */
  private async request<T>(method: HttpMethod, config: HttpRequestConfig) {
    const merged: HttpRequestConfig = {
      method,
      ...config,
    };
    if (method === "get" && merged.enableCache) {
      const key = this.buildCacheKey(merged);
      const cached = this.readCache<T>(key);
      if (cached) {
        logger.debug("Cache hit", merged.url);
        return cached;
      }
      const data = await this.instance.request<T, T>(merged);
      this.writeCache(key, data, merged.cacheTtl || 5000);
      return data;
    }

    return this.instance.request<T, T>(merged);
  }

  /**
   * get
   *
   * 方便的 GET 封装，支持 `HttpRequestConfig` 的扩展选项
   */
  get<T>(url: string, config: HttpRequestConfig = {}) {
    return this.request<T>("get", { url, ...config });
  }

  /**
   * post
   *
   * 发送 POST 请求并支持扩展配置（如重试）
   */
  post<T>(url: string, data?: unknown, config: HttpRequestConfig = {}) {
    return this.request<T>("post", { url, data, ...config });
  }

  /**
   * put
   */
  put<T>(url: string, data?: unknown, config: HttpRequestConfig = {}) {
    return this.request<T>("put", { url, data, ...config });
  }

  /**
   * patch
   */
  patch<T>(url: string, data?: unknown, config: HttpRequestConfig = {}) {
    return this.request<T>("patch", { url, data, ...config });
  }

  /**
   * delete
   */
  delete<T>(url: string, config: HttpRequestConfig = {}) {
    return this.request<T>("delete", { url, ...config });
  }
}

/**
 * 全局导出的 httpClient 实例
 * - 在项目中直接使用 `httpClient.get/post/...` 发起请求
 */
export const httpClient = new HttpClient();
