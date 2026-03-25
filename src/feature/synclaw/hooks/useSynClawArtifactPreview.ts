import { useEffect, useMemo, useState } from "react";
import { fetchWorkspaceArtifactBody } from "@/feature/workspace/apis";
import type { SynClawArtifactItem } from "@/feature/synclaw/types";

export type SynClawArtifactPreviewType =
  | "image"
  | "video"
  | "audio"
  | "markdown"
  | "html"
  | "pdf"
  | "code"
  | "text"
  | "office"
  | "unknown";

export interface UseSynClawArtifactPreviewResult {
  previewType: SynClawArtifactPreviewType;
  previewUrl?: string;
  previewBody: string;
  loading: boolean;
  error?: string;
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "ogg"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "m4a", "aac", "ogg", "flac"]);
const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);
const CODE_EXTENSIONS = new Set([
  "json",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "go",
  "rs",
  "sh",
  "sql",
  "yaml",
  "yml",
  "xml",
  "toml",
  "ini",
  "log",
  "csv",
  "tsv",
]);
const TEXT_EXTENSIONS = new Set(["txt", "text"]);
const OFFICE_EXTENSIONS = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx"]);

const normalizeText = (value?: string): string => (typeof value === "string" ? value.trim() : "");

const resolveExtension = (file?: SynClawArtifactItem): string => {
  const fileName = normalizeText(file?.fileName || file?.canonicalPath);
  if (!fileName.includes(".")) return normalizeText(file?.fileType).toLowerCase();
  return (
    fileName.split(".").pop()?.trim().toLowerCase() || normalizeText(file?.fileType).toLowerCase()
  );
};

const resolvePreviewType = (file?: SynClawArtifactItem): SynClawArtifactPreviewType => {
  const mimeType = normalizeText(file?.mimeType).toLowerCase();
  const extension = resolveExtension(file);

  if (mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) return "image";
  if (mimeType.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) return "video";
  if (mimeType.startsWith("audio/") || AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (mimeType === "application/pdf" || extension === "pdf") return "pdf";
  if (mimeType.includes("markdown") || MARKDOWN_EXTENSIONS.has(extension)) return "markdown";
  if (mimeType.includes("html") || extension === "html" || extension === "htm") return "html";
  if (mimeType.startsWith("text/")) {
    if (extension === "html" || extension === "htm") return "html";
    if (MARKDOWN_EXTENSIONS.has(extension)) return "markdown";
    if (CODE_EXTENSIONS.has(extension)) return "code";
    return "text";
  }
  if (mimeType.includes("json") || CODE_EXTENSIONS.has(extension)) return "code";
  if (TEXT_EXTENSIONS.has(extension)) return "text";
  if (OFFICE_EXTENSIONS.has(extension)) return "office";
  return "unknown";
};

const requiresTextBody = (previewType: SynClawArtifactPreviewType): boolean =>
  previewType === "markdown" ||
  previewType === "html" ||
  previewType === "code" ||
  previewType === "text";

/**
 * useSynClawArtifactPreview
 *
 * 根据当前选中的频道成果文件推断预览类型，并在需要时申请签名 URL 与拉取文本内容。
 */
export const useSynClawArtifactPreview = (
  file: SynClawArtifactItem | undefined,
  resolveFileUrl?: (file: SynClawArtifactItem) => Promise<string>,
): UseSynClawArtifactPreviewResult => {
  const previewType = useMemo(() => resolvePreviewType(file), [file]);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [previewBody, setPreviewBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(undefined);
      setPreviewBody("");
      setLoading(false);
      setError(undefined);
      return;
    }
    if (file.isDeleted) {
      setPreviewUrl(undefined);
      setPreviewBody("");
      setLoading(false);
      setError("该成果文件已删除，无法预览");
      return;
    }
    if (!resolveFileUrl) {
      setPreviewUrl(undefined);
      setPreviewBody("");
      setLoading(false);
      setError("预览链接未配置");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(undefined);
    setPreviewBody("");

    resolveFileUrl(file)
      .then(async url => {
        if (cancelled) return;
        setPreviewUrl(url);
        if (requiresTextBody(previewType)) {
          const body = await fetchWorkspaceArtifactBody(url);
          if (cancelled) return;
          setPreviewBody(body);
        }
      })
      .catch(err => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "加载文件预览失败";
        setPreviewUrl(undefined);
        setPreviewBody("");
        setError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file, previewType, resolveFileUrl]);

  return {
    previewType,
    previewUrl,
    previewBody,
    loading,
    error,
  };
};
