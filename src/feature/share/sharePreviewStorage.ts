import type { Block } from "@/types/block";
import type { ArtifactItem } from "@/types/artifact";

export type SharePreviewKind = "artifact" | "conversation";

export interface SharePreviewArtifactSnapshot {
  artifactId: string;
  canonicalPath?: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  mimeType?: string;
  producedAt: string;
  producerName: string;
  taskName: string;
  content?: string;
}

export interface SharePreviewConversationItem {
  id: string;
  content: string;
  role: "user" | "assistant" | "system" | "unknown";
  title: string;
}

type SharePreviewConversationRole = SharePreviewConversationItem["role"];

export interface SharePreviewSnapshot {
  createdAt: string;
  description: string;
  kind: SharePreviewKind;
  title: string;
  token: string;
  artifact?: SharePreviewArtifactSnapshot;
  conversationItems?: SharePreviewConversationItem[];
}

const SHARE_PREVIEW_STORAGE_PREFIX = "frontis_share_preview_snapshot:";
const SHARE_PREVIEW_REVOKED_PREFIX = "frontis_share_preview_revoked:";

const SUPPORTED_SHARE_FILE_EXTENSIONS = new Set([
  "md",
  "markdown",
  "html",
  "htm",
  "txt",
  "json",
  "csv",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "svg",
]);

const SUPPORTED_SHARE_MIME_PREFIXES = ["text/", "image/"];

const SUPPORTED_SHARE_MIME_KEYWORDS = [
  "html",
  "markdown",
  "json",
  "csv",
  "pdf",
  "word",
  "excel",
  "spreadsheet",
  "presentation",
  "powerpoint",
  "officedocument",
];

export const normalizeShareToken = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "frontis-share";
};

export const buildSharePreviewStorageKey = (
  kind: SharePreviewKind,
  token: string,
): string => `${SHARE_PREVIEW_STORAGE_PREFIX}${kind}:${token}`;

export const buildSharePreviewRevokedKey = (
  kind: SharePreviewKind,
  token: string,
): string => `${SHARE_PREVIEW_REVOKED_PREFIX}${kind}:${token}`;

const getFileExtension = (fileNameOrType?: string): string => {
  const normalized = fileNameOrType?.trim().toLowerCase() ?? "";
  if (!normalized) return "";
  const lastDotIndex = normalized.lastIndexOf(".");
  return lastDotIndex >= 0 ? normalized.slice(lastDotIndex + 1) : normalized;
};

export const resolveArtifactShareExtension = (artifact: Pick<ArtifactItem, "fileName" | "fileType">): string =>
  getFileExtension(artifact.fileName) || getFileExtension(artifact.fileType);

export const isArtifactShareFileSupported = (artifact: Pick<ArtifactItem, "fileName" | "fileType" | "mimeType">): boolean => {
  const extension = resolveArtifactShareExtension(artifact);
  const mimeType = artifact.mimeType?.toLowerCase() ?? "";

  return (
    SUPPORTED_SHARE_FILE_EXTENSIONS.has(extension) ||
    SUPPORTED_SHARE_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix)) ||
    SUPPORTED_SHARE_MIME_KEYWORDS.some(keyword => mimeType.includes(keyword))
  );
};

const decodeDataUrlContent = (url?: string): string => {
  if (!url || !url.startsWith("data:")) {
    return "";
  }

  const commaIndex = url.indexOf(",");
  if (commaIndex < 0) {
    return "";
  }

  try {
    return decodeURIComponent(url.slice(commaIndex + 1));
  } catch {
    return "";
  }
};

const extractBlockContent = (block: Block): string => {
  const directContent = block.data?.content;
  if (typeof directContent === "string" && directContent.trim()) {
    return directContent.trim();
  }

  const artifactTitle = block.data?.file_name ?? block.data?.fileName ?? block.data?.title;
  if (typeof artifactTitle === "string" && artifactTitle.trim()) {
    return `成果文件：${artifactTitle.trim()}`;
  }

  return (block.children ?? [])
    .map(child => extractBlockContent(child))
    .filter(Boolean)
    .join("\n\n");
};

const normalizeConversationRole = (role?: string): SharePreviewConversationRole => {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }

  return "unknown";
};

export const createConversationShareItems = (
  blocks: Block[],
): SharePreviewConversationItem[] =>
  blocks
    .map(block => {
      const role = normalizeConversationRole(block.actorRole);
      const actorName = block.actorName?.trim();
      const title =
        actorName ||
        (role === "user" ? "用户" : role === "assistant" ? "ME" : role === "system" ? "系统" : "消息");
      return {
        id: block.id,
        content: extractBlockContent(block),
        role,
        title,
      };
    })
    .filter(item => item.content.trim());

export const createArtifactShareSnapshot = (
  token: string,
  artifact: ArtifactItem,
): SharePreviewSnapshot => ({
  kind: "artifact",
  token,
  title: artifact.fileName,
  description: `${artifact.producerName} · ${artifact.producedAt}`,
  createdAt: new Date().toISOString(),
  artifact: {
    artifactId: artifact.artifactId || artifact.id,
    canonicalPath: artifact.canonicalPath,
    content: decodeDataUrlContent(artifact.canonicalPath),
    fileName: artifact.fileName,
    fileSize: artifact.fileSize,
    fileType: artifact.fileType,
    mimeType: artifact.mimeType,
    producedAt: artifact.producedAt,
    producerName: artifact.producerName,
    taskName: artifact.taskName,
  },
});

export const createConversationShareSnapshot = (
  token: string,
  title: string,
  blocks: Block[],
): SharePreviewSnapshot => {
  const conversationItems = createConversationShareItems(blocks);
  return {
    kind: "conversation",
    token,
    title,
    description: `已选择 ${conversationItems.length} 条消息`,
    createdAt: new Date().toISOString(),
    conversationItems,
  };
};

export const createMockSharePreviewSnapshot = (
  kind: SharePreviewKind,
  token: string,
): SharePreviewSnapshot => {
  const baseSnapshot = {
    token,
    createdAt: new Date().toISOString(),
  };

  if (kind === "conversation") {
    return {
      ...baseSnapshot,
      kind: "conversation",
      title: "ME 会话分享",
      description: "已选择 2 条消息",
      conversationItems: [
        {
          id: "mock-user-question",
          role: "user",
          title: "杨万泉",
          content: "帮我看一下 Leadeep 移动端对接这期 PRD，整理一下现在还缺哪些产品规则。",
        },
        {
          id: "mock-me-answer",
          role: "assistant",
          title: "ME",
          content:
            "当前重点缺口有三块：移动端权限开通规则、绑定会话的同步边界、交叉用户的余额迁移口径。建议把它们放进同一版需求列表，避免研发拆成三套孤立逻辑。",
        },
      ],
    };
  }

  return {
    ...baseSnapshot,
    kind: "artifact",
    title: "ME 输出文件预览能力说明.docx",
    description: "ME · 14:31",
    artifact: {
      artifactId: "mock-share-docx",
      fileName: "ME 输出文件预览能力说明.docx",
      fileType: "docx",
      fileSize: "42 KB",
      producedAt: "14:31",
      producerName: "ME",
      taskName: "输出文件预览能力说明",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content:
        "分享页需要直接展示被分享的内容，不再展示额外标签和说明区。",
    },
  };
};

export const saveSharePreviewSnapshot = (snapshot: SharePreviewSnapshot): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(buildSharePreviewRevokedKey(snapshot.kind, snapshot.token));
  window.localStorage.setItem(
    buildSharePreviewStorageKey(snapshot.kind, snapshot.token),
    JSON.stringify(snapshot),
  );
};

export const revokeSharePreviewSnapshot = (
  kind: SharePreviewKind,
  token: string,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(buildSharePreviewStorageKey(kind, token));
  window.localStorage.setItem(buildSharePreviewRevokedKey(kind, token), "true");
};

export const isSharePreviewRevoked = (
  kind: SharePreviewKind,
  token: string,
): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(buildSharePreviewRevokedKey(kind, token)) === "true";
};

export const loadSharePreviewSnapshot = (
  kind: SharePreviewKind,
  token: string,
): SharePreviewSnapshot | null => {
  if (typeof window === "undefined") {
    return null;
  }

  if (isSharePreviewRevoked(kind, token)) {
    return null;
  }

  const rawSnapshot = window.localStorage.getItem(buildSharePreviewStorageKey(kind, token));
  if (!rawSnapshot) {
    return null;
  }

  try {
    return JSON.parse(rawSnapshot) as SharePreviewSnapshot;
  } catch {
    return null;
  }
};
