import dayjs from "dayjs";
import type { Block, MessageAttachment } from "@/types/block";
import type {
  WorkspaceChatMessage,
  WorkspaceComposerAttachmentItem,
} from "@/feature/workspace/types";
import type { ArtifactItem } from "@/types/artifact";

import type {
  AttachmentItem,
  ChatMessage,
  AutomationStatus,
  ConnectionMode,
  EmployeeItem,
  EmployeeStatus,
  StatusTone,
  WorkspaceType,
} from "./types";

/**
 * 提取名称头像文案。
 */
export const getAvatarText = (name: string): string => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return "AI";
  }
  const segments = trimmedName.split(/\s+/).filter(Boolean);
  if (segments.length > 1) {
    return segments
      .slice(0, 2)
      .map(item => item.charAt(0).toUpperCase())
      .join("");
  }
  return trimmedName.slice(0, 2).toUpperCase();
};

/**
 * 从专家团摘要中提取适合展示在问候语和输入框里的场景描述。
 */
export const getExpertTeamScenarioLabel = (summary: string, fallbackName: string): string => {
  const normalizedSummary = summary.split("。")[0]?.trim() ?? "";
  const normalizedLabel = normalizedSummary
    .replace(/，?(端到端覆盖|覆盖|加速).*/, "")
    .replace(/等场景.*/, "")
    .trim();

  return normalizedLabel || fallbackName.trim() || "当前业务场景";
};

/**
 * 生成在线随机头像地址。
 */
export const getAvatarUrl = (seed: string): string =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`;

/**
 * 生成专家团默认主 agent 的差异化头像地址。
 */
export const getMetaagentAvatarUrl = (seed: string): string =>
  `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}`;

/**
 * PRD 默认 AI 专家头像预设。
 */
export const EMPLOYEE_AVATAR_PRESETS: string[] = [
  getAvatarUrl("prd-employee-avatar-1"),
  getAvatarUrl("prd-employee-avatar-2"),
  getAvatarUrl("prd-employee-avatar-3"),
  getAvatarUrl("prd-employee-avatar-4"),
  getAvatarUrl("prd-employee-avatar-5"),
  getAvatarUrl("prd-employee-avatar-6"),
];

export interface ConversationEmployeeGroupItem {
  key: string;
  title: string;
  items: EmployeeItem[];
}

const extractConversationEmployeeGroupTitle = (
  employee: EmployeeItem,
  defaultAgentIds: Set<string>,
): string => {
  if (defaultAgentIds.has(employee.id)) {
    return "默认专家";
  }

  return "其他专家";
};

/**
 * 生成原型页本地 ID。
 */
export const createId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * 按默认专家与可识别的专家团，为对话工作台中的 AI 专家列表分组。
 */
export const groupConversationEmployees = (
  employees: EmployeeItem[],
  defaultAgentIds: string[] = [],
): ConversationEmployeeGroupItem[] => {
  const defaultAgentIdSet = new Set(defaultAgentIds);
  const groupMap = new Map<string, ConversationEmployeeGroupItem>();

  employees.forEach(employee => {
    const title = extractConversationEmployeeGroupTitle(employee, defaultAgentIdSet);
    const groupKey = title === "默认专家" ? "default" : `group-${title}`;
    const currentGroup = groupMap.get(groupKey);

    if (currentGroup) {
      currentGroup.items.push(employee);
      return;
    }

    groupMap.set(groupKey, {
      key: groupKey,
      title,
      items: [employee],
    });
  });

  return Array.from(groupMap.values());
};

interface WorkspaceActivationInfo {
  activationCode: string;
  activationExpiresAt: string;
  activationValidDays: number;
  activationHint: string;
}

const createActivationCode = (): string =>
  `EDGE-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

/**
 * 生成设备激活码信息，默认 1 天有效。
 */
export const createWorkspaceActivationInfo = (activationValidDays = 1): WorkspaceActivationInfo => {
  const normalizedValidDays = activationValidDays > 0 ? activationValidDays : 1;

  return {
    activationCode: createActivationCode(),
    activationExpiresAt: dayjs().add(normalizedValidDays, "day").toISOString(),
    activationValidDays: normalizedValidDays,
    activationHint: `激活码默认 ${normalizedValidDays} 天有效，激活成功后立即销毁；未激活前可重新生成新码。`,
  };
};

/**
 * 获取边缘工作站激活码标题。
 */
export const getActivationTitle = (activationValidDays?: number): string => {
  if (typeof activationValidDays === "number" && activationValidDays > 0) {
    return `激活码（${activationValidDays}天有效，使用后自动销毁）`;
  }

  return "激活码（有效期内使用后自动销毁）";
};

/**
 * 获取边缘工作站激活码过期时间提示。
 */
export const getActivationExpireText = (activationExpiresAt?: string): string => {
  if (!activationExpiresAt) return "";

  const value = dayjs(activationExpiresAt);
  if (!value.isValid()) return "";

  return `截止到${value.format("YYYY-MM-DD HH:mm")}过期`;
};

/**
 * 解析原型页成果文件可访问地址。
 */
export const resolveArtifactUrl = async (file: ArtifactItem): Promise<string> =>
  file.canonicalPath ?? "";

/**
 * 触发原型页成果文件下载。
 */
export const downloadArtifact = (file: ArtifactItem): void => {
  if (!file.canonicalPath) {
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = file.canonicalPath;
  anchor.download = file.fileName;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

interface PrototypeDownloadFileOptions {
  content: string;
  fileName: string;
  mimeType?: string;
}

/**
 * 触发原型页本地占位文件下载。
 */
export const downloadPrototypeFile = ({
  content,
  fileName,
  mimeType = "text/plain;charset=utf-8",
}: PrototypeDownloadFileOptions): void => {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
};

/**
 * 格式化附件体积展示文案。
 */
export const formatFileSizeLabel = (size: number): string => {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${size} B`;
};

/**
 * 将本地文件转换为可直接绑定到 WorkspaceComposer 的附件项。
 */
export const createComposerAttachment = (file: File): WorkspaceComposerAttachmentItem => ({
  uid: createId("attachment"),
  id: Date.now(),
  name: file.name,
  size: file.size,
  mimeType: file.type || "application/octet-stream",
  percent: 100,
  status: "done",
  url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
});

/**
 * 释放附件预览 URL。
 */
export const revokeComposerAttachmentPreview = (
  attachment: WorkspaceComposerAttachmentItem,
): void => {
  if (attachment.url?.startsWith("blob:")) {
    URL.revokeObjectURL(attachment.url);
  }
};

/**
 * 转换为页面消息附件结构。
 */
export const buildAttachmentItem = (
  attachment: WorkspaceComposerAttachmentItem,
): AttachmentItem => ({
  id: attachment.uid,
  name: attachment.name,
  size: attachment.size,
  sizeLabel: formatFileSizeLabel(attachment.size),
  mimeType: attachment.mimeType,
  url: attachment.url,
});

const resolveMessageTimestamp = (timeLabel: string): number => {
  if (timeLabel === "刚刚") {
    return Date.now();
  }
  const matched = /^(\d{2}):(\d{2})$/.exec(timeLabel.trim());
  if (!matched) {
    return Date.now();
  }
  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
};

const buildBlockAttachments = (attachments?: AttachmentItem[]): MessageAttachment[] | undefined => {
  if (!attachments?.length) return undefined;
  return attachments.map((item, index) => ({
    id: index + 1,
    name: item.name,
    size: item.size,
    mime_type: item.mimeType,
    url: item.url,
  }));
};

interface NormalizeBlocksOptions {
  actorName: string;
  actorRole: "user" | "assistant";
  timestamp: number;
  sequenceRef: { value: number };
  parentId?: string | null;
}

const normalizeBlocks = (blocks: Block[], options: NormalizeBlocksOptions): Block[] =>
  blocks.map(block => {
    const nextSequence = options.sequenceRef.value++;
    const nextBlock: Block = {
      ...block,
      data: { ...block.data },
      actorId: block.actorId ?? options.actorName,
      actorName: block.actorName ?? options.actorName,
      actorRole: block.actorRole ?? options.actorRole,
      parentId: block.parentId ?? options.parentId,
      timestamp: block.timestamp ?? options.timestamp + nextSequence,
      sequence: nextSequence,
    };

    if (block.children?.length) {
      nextBlock.children = normalizeBlocks(block.children, {
        ...options,
        parentId: nextBlock.id,
      });
    }

    return nextBlock;
  });

/**
 * 转换为 WorkspaceChatPanel 消息结构。
 */
export const buildWorkspaceChatMessages = (messages: ChatMessage[]): WorkspaceChatMessage[] =>
  messages.map(message => ({
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
    streaming: false,
  }));

/**
 * 转换为 WorkspaceChatPanel Block 结构。
 */
export const buildWorkspaceChatBlocks = (messages: ChatMessage[]): Block[] => {
  const sequenceRef = { value: 0 };

  return messages.flatMap(message => {
    const timestamp = resolveMessageTimestamp(message.timeLabel);
    const actorRole = message.role === "user" ? "user" : "assistant";

    if (message.blocks?.length) {
      return normalizeBlocks(message.blocks, {
        actorName: message.author,
        actorRole,
        timestamp,
        sequenceRef,
      });
    }

    return [
      {
        id: message.id,
        kind: "text",
        data: {
          content: message.content,
          role: actorRole,
          status: "completed",
          attachments: buildBlockAttachments(message.attachments),
        },
        actorId: message.author,
        actorName: message.author,
        actorRole,
        timestamp,
        sequence: sequenceRef.value++,
      },
    ];
  });
};

/**
 * 根据频道列表构建 SynClaw 空间树数据。
 */

/**
 * 获取工作站类型中文标签。
 */
export const getWorkspaceTypeLabel = (type: WorkspaceType): string => {
  if (type === "cloud") return "云端工作站";
  if (type === "local") return "本地工作站";
  return "边缘工作站";
};

/**
 * 获取连接模式中文标签。
 */
export const getConnectionLabel = (mode: ConnectionMode): string =>
  mode === "cloud" ? "云端虚拟机" : "本地连接";

/**
 * 获取状态中文标签。
 */
export const getStatusLabel = (status: StatusTone | EmployeeStatus | AutomationStatus): string => {
  if (status === "online") return "在线";
  if (status === "running") return "运行中";
  if (status === "exception") return "异常";
  if (status === "busy") return "运行中";
  if (status === "idle") return "空闲";
  if (status === "pending") return "待激活";
  if (status === "paused") return "已暂停";
  if (status === "offline") return "离线";
  if (status === "error") return "异常中断";
  return "草稿";
};

/**
 * 获取状态对应的样式类名。
 */
export const getStatusClassName = (
  status: StatusTone | EmployeeStatus | AutomationStatus,
  classNames: Record<string, string>,
): string => {
  if (status === "running") return classNames.statusBusy;
  if (status === "exception") return classNames.statusError;
  if (status === "busy") return classNames.statusBusy;
  if (status === "idle") return classNames.statusIdle;
  if (status === "pending") return classNames.statusPending;
  if (status === "paused") return classNames.statusPaused;
  if (status === "draft") return classNames.statusDraft;
  if (status === "offline") return classNames.statusOffline;
  if (status === "error") return classNames.statusError;
  return classNames.statusOnline;
};

/**
 * 获取自动化任务启停按钮文案。
 */
export const getAutomationToggleLabel = (status: AutomationStatus): string =>
  status === "active" ? "暂停任务" : "启用任务";
