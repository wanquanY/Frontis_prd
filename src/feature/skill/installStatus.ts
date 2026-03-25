import type { CoworkerAgentSkillInstallStatusResponse } from "@/apis/SkillApi";

const INSTALL_STATUS_PROGRESS_MAP: Record<string, number> = {
  queued: 0,
  downloading: 20,
  verifying: 40,
  materializing: 60,
  installing: 80,
  binding: 90,
  running: 80,
  succeeded: 100,
  installed: 100,
  skipped: 100,
  disabled: 100,
  failed: 100,
  error: 100,
};

const INSTALL_STATUS_LABEL_MAP: Record<string, string> = {
  queued: "等待同步",
  downloading: "下载中",
  verifying: "校验中",
  materializing: "同步到本地",
  installing: "安装依赖",
  binding: "生效中",
  running: "安装中",
  succeeded: "已安装",
  installed: "已安装",
  skipped: "已安装",
  disabled: "已移除",
  failed: "安装失败",
  error: "安装失败",
};

const INSTALL_MESSAGE_LABEL_MAP: Record<string, string> = {
  waiting_for_runtime_pull: "等待 Runtime 拉取安装计划",
  downloading_package: "正在下载 Skill 包",
  verifying_package_checksum: "正在校验 Skill 包",
  extracting_skill_package: "正在解压 Skill 包",
  preparing_skill_destination: "正在清理旧 Skill 目录",
  copying_skill_files: "正在写入 Skill 文件",
  skill_materialized: "Skill 已同步到本地工作区",
  skill_ready_after_materialize: "Skill 已同步到本地工作区并可使用",
  skill_already_materialized: "Skill 已是最新状态，无需重新同步",
  running_skill_installer: "正在安装 Skill 依赖",
  verifying_skill_binding: "正在校验 AI员工 生效状态",
  skill_installed_and_bound: "Skill 已安装并生效",
  skill_bound: "Skill 已生效",
  skill_agent_install_unsupported: "当前工作站不支持给该 AI员工 单独执行 Skill 安装器",
  skill_materialize_failed: "Skill 同步到本地失败",
  skill_install_failed: "Skill 依赖安装失败",
  skill_bind_failed: "Skill 生效校验失败",
  skill_disabled_by_plan: "Skill 已按计划移除",
};

const TERMINAL_INSTALL_STATUSES = new Set([
  "succeeded",
  "installed",
  "skipped",
  "disabled",
  "failed",
  "error",
]);

/**
 * 统一的 Skill 安装状态快照，供列表卡片和安装弹窗复用。
 */
export interface SkillInstallLifecycle {
  status: string;
  stage: string;
  statusLabel: string;
  messageLabel: string;
  progressPercent: number;
  errorCode?: string;
  errorMessage?: string;
  isTerminal: boolean;
  isInstalled: boolean;
  isFailed: boolean;
  isRunning: boolean;
}

const normalizeToken = (value?: string | null): string =>
  String(value || "")
    .trim()
    .toLowerCase();

/**
 * 将后端返回的安装状态转换成前端可直接渲染的统一结构。
 */
export function resolveSkillInstallLifecycle(
  status: CoworkerAgentSkillInstallStatusResponse | null | undefined,
): SkillInstallLifecycle | null {
  if (!status) {
    return null;
  }

  const resolvedStatus =
    normalizeToken(status.target?.status) ||
    normalizeToken(status.inventory?.install_status) ||
    normalizeToken(status.job?.status) ||
    (status.binding.enabled ? "queued" : "");

  if (!resolvedStatus) {
    return null;
  }

  const resolvedStage =
    normalizeToken(status.target?.current_stage) ||
    normalizeToken(status.inventory?.install_stage) ||
    resolvedStatus;

  const progressPercent =
    status.target?.progress_percent ??
    status.inventory?.progress_percent ??
    INSTALL_STATUS_PROGRESS_MAP[resolvedStage] ??
    INSTALL_STATUS_PROGRESS_MAP[resolvedStatus] ??
    0;

  const rawMessage =
    normalizeToken(status.target?.progress_message) ||
    normalizeToken(status.inventory?.progress_message);
  const messageLabel =
    INSTALL_MESSAGE_LABEL_MAP[rawMessage] ||
    INSTALL_STATUS_LABEL_MAP[resolvedStage] ||
    INSTALL_STATUS_LABEL_MAP[resolvedStatus] ||
    "处理中";

  const errorCode =
    status.target?.error_code ||
    status.inventory?.error_code ||
    status.job?.last_error_code ||
    undefined;
  const errorMessage =
    status.target?.error_message ||
    status.inventory?.error_message ||
    status.job?.last_error_message ||
    undefined;
  const isTerminal = TERMINAL_INSTALL_STATUSES.has(resolvedStatus);
  const isFailed = resolvedStatus === "failed" || resolvedStatus === "error";
  const isInstalled =
    resolvedStatus === "succeeded" ||
    resolvedStatus === "installed" ||
    resolvedStatus === "skipped";
  const uninstallRequested = status.binding.enabled === false;
  const statusLabel = uninstallRequested
    ? isFailed
      ? "卸载失败"
      : resolvedStatus === "disabled"
        ? "已移除"
        : isTerminal
          ? "已移除"
          : "卸载中"
    : INSTALL_STATUS_LABEL_MAP[resolvedStatus] || "处理中";
  const resolvedMessageLabel = uninstallRequested
    ? rawMessage === "skill_disabled_by_plan"
      ? "Skill 已按计划移除"
      : rawMessage === "waiting_for_runtime_pull"
        ? "等待 Runtime 拉取卸载计划"
        : isFailed
          ? "Runtime 卸载 Skill 失败"
          : isTerminal
            ? "Skill 已按计划移除"
            : "等待工作站卸载并回传结果"
    : messageLabel;

  return {
    status: resolvedStatus,
    stage: resolvedStage,
    statusLabel,
    messageLabel: resolvedMessageLabel,
    progressPercent: Math.max(0, Math.min(100, Math.floor(progressPercent))),
    errorCode,
    errorMessage,
    isTerminal,
    isInstalled,
    isFailed,
    isRunning: !isTerminal,
  };
}

/**
 * 判断当前 Skill 是否仍需继续轮询安装状态。
 */
export function shouldPollSkillInstallStatus(
  status: CoworkerAgentSkillInstallStatusResponse | null | undefined,
): boolean {
  const lifecycle = resolveSkillInstallLifecycle(status);
  return lifecycle !== null && !lifecycle.isTerminal;
}
