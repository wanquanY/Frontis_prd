import classNames from "classnames";
import {
  CloseOutlined,
  DownloadOutlined,
  LeftOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { Empty, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useSynClawArtifactPreview } from "@/pages/synclaw/hooks/useSynClawArtifactPreview";
import type { SynClawArtifactItem } from "@/pages/synclaw/types";
import { resolveFileLogo } from "@/utils/fileLogo";

import styles from "./OpenClawChatFilesPanelV2.module.less";

interface OpenClawChatFilesPanelV2Props {
  files: SynClawArtifactItem[];
  preferredFileId?: string;
  onClose: () => void;
  onDownloadFile: (file: SynClawArtifactItem) => void;
  onLinkFile: (file: SynClawArtifactItem) => void;
  onPreviewStateChange?: (previewing: boolean) => void;
  resolveFileUrl: (file: SynClawArtifactItem) => Promise<string>;
}

/**
 * OpenClaw V2 会话文件面板。
 *
 * 复用现有成果文件与预览 hook，但按 source `OpenClawSessionFilesPanel`
 * 的交互结构重写为列表/预览两态。
 */
export const OpenClawChatFilesPanelV2 = ({
  files,
  preferredFileId,
  onClose,
  onDownloadFile,
  onLinkFile,
  onPreviewStateChange,
  resolveFileUrl,
}: OpenClawChatFilesPanelV2Props): JSX.Element => {
  const [selectedFileId, setSelectedFileId] = useState<string>();

  const selectedFile = useMemo(
    () => files.find(item => item.id === selectedFileId),
    [files, selectedFileId],
  );
  const previewState = useSynClawArtifactPreview(selectedFile, resolveFileUrl);
  const isPreviewMode = Boolean(selectedFile);

  useEffect(() => {
    if (!preferredFileId) {
      return;
    }
    if (!files.some(item => item.id === preferredFileId)) {
      return;
    }
    setSelectedFileId(preferredFileId);
  }, [files, preferredFileId]);

  useEffect(() => {
    onPreviewStateChange?.(isPreviewMode);
  }, [isPreviewMode, onPreviewStateChange]);

  const handleBackToList = useCallback((): void => {
    setSelectedFileId(undefined);
  }, []);

  const renderPreviewBody = (): JSX.Element => {
    if (!selectedFile) {
      return (
        <div className={styles.emptyState}>
          <Empty description="该文件不存在或已被移除" />
        </div>
      );
    }

    if (previewState.loading) {
      return (
        <div className={styles.loadingWrap}>
          <Spin tip="正在加载文件预览..." />
        </div>
      );
    }

    if (previewState.error) {
      return (
        <div className={styles.emptyState}>
          <Empty description={previewState.error} />
        </div>
      );
    }

    if (previewState.previewType === "image" && previewState.previewUrl) {
      return (
        <div className={styles.imageWrap}>
          <img className={styles.previewImage} src={previewState.previewUrl} alt={selectedFile.fileName} />
        </div>
      );
    }

    if (previewState.previewType === "video" && previewState.previewUrl) {
      return (
        <div className={styles.mediaWrap}>
          <video className={styles.previewMedia} src={previewState.previewUrl} controls playsInline preload="metadata">
            <track kind="captions" />
          </video>
        </div>
      );
    }

    if (previewState.previewType === "audio" && previewState.previewUrl) {
      return (
        <div className={styles.audioWrap}>
          <audio className={styles.previewAudio} src={previewState.previewUrl} controls preload="metadata">
            <track kind="captions" />
          </audio>
        </div>
      );
    }

    if (previewState.previewType === "pdf" && previewState.previewUrl) {
      return (
        <div className={styles.frameWrap}>
          <iframe className={styles.previewFrame} title={selectedFile.fileName} src={previewState.previewUrl} />
        </div>
      );
    }

    if (previewState.previewType === "html" && previewState.previewBody.trim()) {
      return (
        <div className={styles.frameWrap}>
          <iframe
            className={styles.previewFrame}
            title={selectedFile.fileName}
            srcDoc={previewState.previewBody}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      );
    }

    if (previewState.previewType === "markdown" && previewState.previewBody.trim()) {
      return (
        <div className={styles.markdownWrap}>
          <div className={styles.markdownCard}>
            <MarkdownRenderer source={previewState.previewBody} />
          </div>
        </div>
      );
    }

    if (
      (previewState.previewType === "code" || previewState.previewType === "text") &&
      previewState.previewBody.trim()
    ) {
      return (
        <div className={styles.codeWrap}>
          <pre className={styles.codeBlock}>
            <code>{previewState.previewBody}</code>
          </pre>
        </div>
      );
    }

    if (previewState.previewType === "office") {
      return (
        <div className={styles.emptyState}>
          <Empty description="当前类型暂不支持内嵌预览，可下载后查看。" />
        </div>
      );
    }

    return (
      <div className={styles.emptyState}>
        <Empty description="该文件类型暂不支持内置预览" />
      </div>
    );
  };

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        {isPreviewMode ? (
          <button
            type="button"
            className={styles.navButton}
            aria-label="返回文件列表"
            onClick={handleBackToList}
          >
            <LeftOutlined />
          </button>
        ) : null}

        <div className={styles.headerText}>
          <div className={styles.headerTitle}>
            {isPreviewMode ? (selectedFile?.fileName ?? "文件不存在或已移除") : "会话文件"}
          </div>
          <div className={styles.headerSubtitle}>
            {isPreviewMode
              ? (selectedFile?.producedAt ?? "")
              : `${files.length} 个文件，可关联到当前对话`}
          </div>
        </div>

        <div className={styles.headerActions}>
          {selectedFile ? (
            <>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => onLinkFile(selectedFile)}
              >
                <LinkOutlined />
                <span>关联到对话</span>
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => onDownloadFile(selectedFile)}
              >
                <DownloadOutlined />
                <span>下载文件</span>
              </button>
            </>
          ) : null}

          <button
            type="button"
            className={styles.closeButton}
            aria-label="关闭文件面板"
            onClick={onClose}
          >
            <CloseOutlined />
          </button>
        </div>
      </header>

      {!isPreviewMode ? (
        <div className={styles.list}>
          {files.length > 0 ? (
            files.map(file => {
              const fileLogo = resolveFileLogo(file.fileName);

              return (
                <button
                  key={file.id}
                  type="button"
                  className={classNames(styles.fileCard, {
                    [styles.fileCardActive]: selectedFileId === file.id,
                  })}
                  onClick={() => setSelectedFileId(file.id)}
                >
                  <span className={styles.fileIconWrap}>
                    <img
                      className={styles.fileIcon}
                      src={fileLogo.src}
                      alt={fileLogo.alt}
                    />
                  </span>
                  <span className={styles.fileMain}>
                    <span className={styles.fileName}>{file.fileName}</span>
                    <span className={styles.fileMeta}>{file.producedAt}</span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className={styles.emptyState}>
              <Empty description="当前会话暂无可展示文件" />
            </div>
          )}
        </div>
      ) : (
        <div className={styles.preview}>{renderPreviewBody()}</div>
      )}
    </div>
  );
};
