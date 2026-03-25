import { reportErrorToFeishu } from "@/utils/feishuReport";
import { logger } from "@/utils/logger";

/** 只上报影响功能的关键资源标签 */
const CRITICAL_RESOURCE_TAGS = new Set(["script", "link"]);

/** 已知无害的错误模式，无需上报 */
const IGNORED_ERROR_PATTERNS = [
  /ResizeObserver loop/i,
  /Loading chunk .* failed/i,
  /chrome-extension:\/\//,
  /moz-extension:\/\//,
  /safari-extension:\/\//,
  // floating-ui 在 DOM 元素卸载后异步计算定位导致的无害错误（BlockNote 编辑器）
  /reading 'isConnected'/,
];

/** 判断是否为已知无害错误 */
function isIgnoredError(message: string, filename?: string, stack?: string): boolean {
  const text = `${message} ${filename ?? ""} ${stack ?? ""}`;
  return IGNORED_ERROR_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * 判断是否为 Axios/HTTP 层已处理过的错误
 * httpClient 的 onError 拦截器会 reject 带有 response/config 属性的 AxiosError，
 * 这类错误已经由 reportHttpErrorToFeishu 上报过，无需重复上报。
 */
function isAxiosError(reason: unknown): boolean {
  if (reason == null || typeof reason !== "object") return false;
  const err = reason as Record<string, unknown>;
  return "isAxiosError" in err || ("config" in err && "response" in err);
}

/**
 * 初始化全局错误监听
 * - window error: 捕获 JS 运行时错误 & 资源加载失败
 * - unhandledrejection: 捕获未处理的 Promise rejection（排除已由 httpClient 上报的接口错误）
 *
 * 所有监听回调内部均有 try-catch 保护，确保不影响原有业务。
 * 应在 ReactDOM.createRoot 之前调用。
 */
export function initGlobalErrorHandler(): void {
  // JS 运行时错误 & 资源加载失败
  window.addEventListener(
    "error",
    event => {
      try {
        // 资源加载失败（如 <img>、<script>）不会冒泡到 window.onerror，但会被 capture 阶段捕获
        if (event.target && event.target !== window) {
          const el = event.target as HTMLElement;
          const tagName = el.tagName?.toLowerCase() ?? "";
          if (!CRITICAL_RESOURCE_TAGS.has(tagName)) return;
          const src = (el as HTMLImageElement).src || (el as HTMLLinkElement).href || "";
          if (!src) return;
          // 过滤掉发版导致的 chunk 加载失败（旧 chunk 文件 404）
          // Vite 使用 <link rel="modulepreload"> 预加载 JS，使用 <link rel="stylesheet"> 加载 CSS
          // 匹配格式: /assets/[name]-[hash].[js|css]
          if (/\/assets\/\w+-\w+\.(js|css)(\?|$)/.test(src)) return;
          reportErrorToFeishu({
            type: "ResourceLoadError",
            message: `${tagName} 资源加载失败: ${src}`,
          });
          return;
        }

        // JS 运行时错误
        const { message, filename, lineno, colno, error } = event;
        if (isIgnoredError(message, filename, error?.stack)) return;
        logger.error("[GlobalError]", message, filename, lineno, colno);
        reportErrorToFeishu({
          type: error?.name || "Error",
          message: message || "Unknown error",
          stack: error?.stack,
          extra: filename ? `${filename}:${lineno}:${colno}` : undefined,
        });
      } catch {
        // 监听回调自身出错静默忽略，绝不影响业务
      }
    },
    true, // capture 阶段，确保能捕获资源加载失败
  );

  // 未处理的 Promise rejection（排除 httpClient 已上报的接口错误）
  window.addEventListener("unhandledrejection", event => {
    try {
      const reason = event.reason;

      // httpClient 的接口错误已由 reportHttpErrorToFeishu 上报，跳过避免重复
      if (isAxiosError(reason)) return;

      const message =
        reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Unknown";
      const stack = reason instanceof Error ? reason.stack : undefined;
      if (isIgnoredError(message, undefined, stack)) return;

      logger.error("[UnhandledRejection]", reason);
      reportErrorToFeishu({
        type: "UnhandledRejection",
        message,
        stack,
      });
    } catch {
      // 监听回调自身出错静默忽略，绝不影响业务
    }
  });
}
