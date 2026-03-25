import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCoworkerChannelArtifacts,
  type CoworkerChannelArtifactItem,
} from "@/apis/CoworkerChannelApi";
import type { SynClawArtifactItem } from "@/feature/synclaw/types";

const normalizeText = (value?: string): string => (typeof value === "string" ? value.trim() : "");

const getFileExtension = (value: string): string => {
  const lastDotIndex = value.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex >= value.length - 1) return "";
  return value.slice(lastDotIndex + 1).toLowerCase();
};

const formatArtifactSize = (size?: number): string => {
  if (typeof size !== "number" || !Number.isFinite(size) || size < 0) return "---";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const resolveArtifactFileType = (artifact: CoworkerChannelArtifactItem): string => {
  const filename = normalizeText(artifact.displayName || artifact.canonicalPath);
  const extension = getFileExtension(filename);
  if (extension) return extension;

  const mimeType = normalizeText(artifact.latestMimeType).toLowerCase();
  if (mimeType.includes("/")) {
    const subtype = mimeType.split("/").pop();
    if (subtype) {
      if (subtype === "plain") return "txt";
      return subtype;
    }
  }
  return "file";
};

const formatProducedAt = (value?: string): string => {
  const normalized = normalizeText(value);
  if (!normalized) return "--";
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) return normalized;

  const target = new Date(timestamp);
  const now = new Date();
  const sameDay =
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate();

  const formatter = new Intl.DateTimeFormat(
    "zh-CN",
    sameDay
      ? {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      : {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        },
  );
  return formatter.format(target);
};

const normalizeArtifactItem = (artifact: CoworkerChannelArtifactItem): SynClawArtifactItem => ({
  id: artifact.artifactId,
  artifactId: artifact.artifactId,
  fileName: artifact.displayName,
  fileType: resolveArtifactFileType(artifact),
  producerName: artifact.isDeleted ? "已删除" : "频道产物",
  producedAt: formatProducedAt(artifact.updatedAt || artifact.createdAt),
  fileSize: formatArtifactSize(artifact.latestSize),
  taskName:
    normalizeText(artifact.canonicalPath) &&
    normalizeText(artifact.canonicalPath) !== normalizeText(artifact.displayName)
      ? artifact.canonicalPath
      : "",
  canonicalPath: artifact.canonicalPath,
  mimeType: artifact.latestMimeType,
  isDeleted: artifact.isDeleted,
});

export interface UseCoworkerChannelArtifactsPanelResult {
  files: SynClawArtifactItem[];
  total: number;
  loading: boolean;
  error?: string;
  refresh: () => void;
}

/**
 * useCoworkerChannelArtifactsPanel
 *
 * 负责拉取当前 Coworker 频道的成果文件列表，并转换为 SynClaw 成果面板可直接展示的数据。
 */
export const useCoworkerChannelArtifactsPanel = (
  channelId?: string,
): UseCoworkerChannelArtifactsPanelResult => {
  const [artifacts, setArtifacts] = useState<SynClawArtifactItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [refreshSeq, setRefreshSeq] = useState(0);

  const refresh = useCallback(() => {
    setRefreshSeq(seq => seq + 1);
  }, []);

  useEffect(() => {
    const resolvedChannelId = normalizeText(channelId);
    if (!resolvedChannelId) {
      setArtifacts([]);
      setLoading(false);
      setError(undefined);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(undefined);

    getCoworkerChannelArtifacts(resolvedChannelId, { limit: 100 })
      .then(result => {
        if (cancelled) return;
        const sortedItems = [...result.items].sort((left, right) => {
          const leftTime = Date.parse(left.updatedAt || left.createdAt || "");
          const rightTime = Date.parse(right.updatedAt || right.createdAt || "");
          if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return 0;
          return rightTime - leftTime;
        });
        setArtifacts(sortedItems.map(item => normalizeArtifactItem(item)));
      })
      .catch(err => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "获取频道成果失败";
        setArtifacts([]);
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
  }, [channelId, refreshSeq]);

  const files = useMemo(() => artifacts, [artifacts]);

  return {
    files,
    total: files.length,
    loading,
    error,
    refresh,
  };
};
