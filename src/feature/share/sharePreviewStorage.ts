import type { ArtifactItem } from "@/types/artifact";

export type SharePreviewKind = "artifact";

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

export interface SharePreviewSnapshot {
  createdAt: string;
  description: string;
  kind: SharePreviewKind;
  title: string;
  token: string;
  artifact?: SharePreviewArtifactSnapshot;
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

export const createMockSharePreviewSnapshot = (
  token: string,
): SharePreviewSnapshot => {
  const baseSnapshot = {
    token,
    createdAt: new Date().toISOString(),
  };

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
