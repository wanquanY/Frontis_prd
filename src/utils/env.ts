type LogLevel = "debug" | "info" | "warn" | "error";

const {
  VITE_API_BASE_URL,
  VITE_APP_LOG_LEVEL,
  VITE_FEISHU_WEBHOOK,
  VITE_FEISHU_WEBHOOK_SECRET,
  MODE,
} = import.meta.env;

export const appEnv = {
  apiBaseUrl: VITE_API_BASE_URL || "",
  logLevel: (VITE_APP_LOG_LEVEL as LogLevel) || "info",
  /** 飞书机器人 Webhook，配置后接口报错将统一上报到飞书 */
  feishuWebhook: VITE_FEISHU_WEBHOOK || "",
  /** 飞书机器人签名校验密钥（与飞书后台「签名校验」中配置一致），配置后请求会带签名防伪造 */
  feishuWebhookSecret: VITE_FEISHU_WEBHOOK_SECRET || "",
  mode: MODE,
} as const;

export const isDev = MODE === "development";
export const isProd = MODE === "production";
export const isTest = MODE === "test";
