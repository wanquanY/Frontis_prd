import { appEnv } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const shouldLog = (level: LogLevel) =>
  LEVEL_ORDER[level] >= LEVEL_ORDER[appEnv.logLevel as LogLevel];

export const logger = {
  debug: (...args: unknown[]) => shouldLog("debug") && console.debug("[DEBUG]", ...args),
  info: (...args: unknown[]) => shouldLog("info") && console.info("[INFO]", ...args),
  warn: (...args: unknown[]) => shouldLog("warn") && console.warn("[WARN]", ...args),
  error: (...args: unknown[]) => shouldLog("error") && console.error("[ERROR]", ...args),
};
