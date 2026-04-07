import { useCallback, useMemo, type MouseEvent } from "react";

import { DownloadOutlined } from "@ant-design/icons";

import type { ArtifactData, ArtifactImage, Block } from "@/types/block";
import { resolveFileLogo } from "@/utils/fileLogo";

import styles from "./BlockItem.module.less";
import knowledgeIcon from "@/assets/images/knowledge-icon.png";

/**
 * 成果块组件属性。
 */
export interface ArtifactBlockProps {
  block: Block;
  onOpenArtifact?: (block: Block) => void;
  onDownloadArtifact?: (artifactId: string) => void;
  onAddArtifactToKnowledge?: (artifactId: string) => void;
}

/**
 * 渲染会话中的成果卡片。
 */
export const ArtifactBlock = ({
  block,
  onOpenArtifact,
  onDownloadArtifact,
  onAddArtifactToKnowledge,
}: ArtifactBlockProps) => {
  const data = block.data as unknown as ArtifactData;
  const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : "成果";

  const isImage = data.kind === "image_gallery" || data.kind === "image";
  const isPpt = data.kind === "ppt";
  const isVideo = data.kind === "video";
  const isMarkdown = data.kind === "markdown";
  const isHtml = data.kind === "html";
  const artifactId = typeof data.artifact_id === "string" ? data.artifact_id.trim() : "";
  const status = typeof data.status === "string" ? data.status : "";
  const isCompleted = status === "completed" || status === "finalized";

  const previewImageUrl = useMemo((): string | undefined => {
    if (!isImage && !isPpt) {
      return undefined;
    }

    const payload = data.data;
    if (!payload || typeof payload !== "object") {
      return undefined;
    }

    if (isPpt) {
      const slides = (payload as { slides?: Array<{ image_url?: string }> }).slides;
      if (Array.isArray(slides) && slides.length > 0) {
        return slides[0].image_url;
      }

      return undefined;
    }

    const images = (payload as { images?: unknown }).images;
    if (!Array.isArray(images)) {
      return undefined;
    }

    const firstImage = images.find(
      (item: { url?: string; index?: number }): item is { url: string } =>
        typeof item.url === "string" && item.url.trim().length > 0,
    );

    return firstImage?.url;
  }, [data.data, isImage, isPpt]);

  const videoUrl = useMemo((): string | undefined => {
    if (!isVideo) {
      return undefined;
    }

    const payload = data.data;
    if (!payload || typeof payload !== "object") {
      return undefined;
    }

    const url = (payload as { video_url?: string }).video_url;
    return typeof url === "string" && url.trim().length > 0 ? url.trim() : undefined;
  }, [data.data, isVideo]);

  const typeIcon = useMemo(() => {
    if (isImage || isVideo || isPpt) {
      return null;
    }

    if (isMarkdown) {
      return resolveFileLogo("artifact.md");
    }

    if (isHtml) {
      return resolveFileLogo("artifact.html");
    }

    return resolveFileLogo("artifact.txt");
  }, [isHtml, isImage, isMarkdown, isPpt, isVideo]);

  const metaText = useMemo((): string => {
    if (status === "generating" || status === "streaming" || block.isStreaming) {
      return "生成中…";
    }

    if (isImage) {
      return `${(data.data as { images?: ArtifactImage[] }).images?.length || 0}张图片`;
    }

    if (isPpt) {
      const slides = (data.data as { slides?: unknown[] })?.slides;
      return `${slides?.length || 0}页PPT`;
    }

    if (isVideo) {
      const duration = (data.data as { duration?: number })?.duration;
      return duration ? `${duration}秒视频` : "视频";
    }

    return "点击查看详情";
  }, [block.isStreaming, data.data, isImage, isPpt, isVideo, status]);

  const handleDownload = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (!isCompleted || !artifactId) {
        return;
      }

      onDownloadArtifact?.(artifactId);
    },
    [artifactId, isCompleted, onDownloadArtifact],
  );

  const handleAddToKnowledge = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (!isCompleted || !data.artifact_id) {
        return;
      }

      onAddArtifactToKnowledge?.(data.artifact_id);
    },
    [data.artifact_id, isCompleted, onAddArtifactToKnowledge],
  );

  const canClickDuringStreaming = !isImage && !isVideo && !isPpt;
  const isClickable = isCompleted || canClickDuringStreaming;

  return (
    <div className={styles.artifactBlock}>
      <div className={styles.artifactWrapper}>
        <button
          type="button"
          className={styles.artifactCard}
          onClick={() => {
            if (!isClickable) {
              return;
            }

            onOpenArtifact?.(block);
          }}
          aria-label={`查看成果：${title}`}
          disabled={!isClickable}
        >
          <span className={styles.artifactIconSlot} aria-hidden={true}>
            {isImage || isPpt ? (
              previewImageUrl ? (
                <img className={styles.artifactThumb} src={previewImageUrl} alt="" />
              ) : (
                <span className={styles.artifactThumbPlaceholder} aria-hidden={true} />
              )
            ) : isVideo ? (
              videoUrl ? (
                <span className={styles.artifactVideoThumb}>
                  <span className={styles.artifactVideoPlayIcon} aria-hidden={true}>
                    ▶
                  </span>
                </span>
              ) : (
                <span className={styles.artifactThumbPlaceholder} aria-hidden={true} />
              )
            ) : typeIcon ? (
              <img className={styles.artifactFileIcon} src={typeIcon.src} alt={typeIcon.alt} />
            ) : null}
          </span>

          <span className={styles.artifactInfo}>
            <span className={styles.artifactTitle} title={title}>
              {title}
            </span>
            <span className={styles.artifactMeta} title={metaText}>
              {metaText}
            </span>
          </span>

          {(onDownloadArtifact || onAddArtifactToKnowledge) && (
            <span className={styles.artifactActions} aria-label="成果操作">
              {onDownloadArtifact ? (
                <button
                  type="button"
                  className={styles.artifactActionButton}
                  aria-label="下载成果"
                  disabled={!isCompleted || !artifactId}
                  onClick={handleDownload}
                >
                  <DownloadOutlined className={styles.artifactActionIcon} />
                </button>
              ) : null}
              {onAddArtifactToKnowledge ? (
                <button
                  type="button"
                  className={styles.artifactActionButton}
                  aria-label="加入知识库"
                  disabled={!isCompleted || !artifactId}
                  onClick={handleAddToKnowledge}
                >
                  <img src={knowledgeIcon} alt="" className={styles.artifactActionIcon} />
                </button>
              ) : null}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
