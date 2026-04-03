import dayjs from "dayjs";
import type { Block, MessageAttachment } from "@/types/block";
import type {
  WorkspaceChatMessage,
  WorkspaceComposerAttachmentItem,
} from "@/feature/workspace/types";
import type { SynClawArtifactItem, SynClawSpaceItem } from "@/pages/synclaw/types";

import type {
  AttachmentItem,
  ChannelItem,
  ChatMessage,
  AutomationStatus,
  ConnectionMode,
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
 * 生成在线随机头像地址。
 */
export const getAvatarUrl = (seed: string): string =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`;

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

/**
 * 生成原型页本地 ID。
 */
export const createId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
 * 生成边缘工作站激活码信息。
 */
export const createWorkspaceActivationInfo = (): WorkspaceActivationInfo => {
  const activationValidDays = 7;

  return {
    activationCode: createActivationCode(),
    activationExpiresAt: dayjs().add(activationValidDays, "day").toISOString(),
    activationValidDays,
    activationHint: "已生成激活码，请在工作站客户端输入后完成激活。",
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
export const resolveArtifactUrl = async (file: SynClawArtifactItem): Promise<string> =>
  file.canonicalPath ?? "";

/**
 * 触发原型页成果文件下载。
 */
export const downloadArtifact = (file: SynClawArtifactItem): void => {
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
export const buildSynClawSpacesFromChannels = (channels: ChannelItem[]): SynClawSpaceItem[] => {
  const grouped = channels.reduce<Map<string, SynClawSpaceItem>>((result, channel) => {
    const current = result.get(channel.spaceName) ?? {
      id: channel.spaceName,
      name: channel.spaceName,
      channels: [],
    };
    current.channels.push({
      id: channel.id,
      name: channel.name,
    });
    result.set(channel.spaceName, current);
    return result;
  }, new Map<string, SynClawSpaceItem>());

  return Array.from(grouped.values());
};

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
export const getStatusLabel = (status: StatusTone | AutomationStatus): string => {
  if (status === "online") return "在线";
  if (status === "busy") return "运行中";
  if (status === "idle") return "空闲";
  if (status === "pending") return "待激活";
  if (status === "paused") return "已暂停";
  return "草稿";
};

/**
 * 获取状态对应的样式类名。
 */
export const getStatusClassName = (
  status: StatusTone | AutomationStatus,
  classNames: Record<string, string>,
): string => {
  if (status === "busy") return classNames.statusBusy;
  if (status === "idle") return classNames.statusIdle;
  if (status === "pending") return classNames.statusPending;
  if (status === "paused") return classNames.statusPaused;
  if (status === "draft") return classNames.statusDraft;
  return classNames.statusOnline;
};

/**
 * 获取自动化任务启停按钮文案。
 */
export const getAutomationToggleLabel = (status: AutomationStatus): string =>
  status === "active" ? "暂停任务" : "启用任务";
