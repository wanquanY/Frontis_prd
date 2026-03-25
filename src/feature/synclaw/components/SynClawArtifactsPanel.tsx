import { Spin } from "antd";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useSynClawArtifactPreview } from "@/feature/synclaw/hooks/useSynClawArtifactPreview";
import type { SynClawArtifactItem } from "@/feature/synclaw/types";
import { resolveFileLogo } from "@/utils/fileLogo";
import { DownloadOutlineIcon } from "@/utils/icons";
import styles from "./SynClawArtifactsPanel.module.less";

interface SynClawArtifactsPanelProps {
  files: SynClawArtifactItem[];
  loading?: boolean;
  error?: string;
  onClose?: () => void;
  onDownloadFile?: (file: SynClawArtifactItem) => void;
  resolveFileUrl?: (file: SynClawArtifactItem) => Promise<string>;
  onPreviewStateChange?: (previewing: boolean) => void;
}

const CloseIcon = ({ className }: { className?: string }): JSX.Element => (
  <svg
    viewBox="0 0 12 12"
    width="12"
    height="12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }): JSX.Element => (
  <svg
    viewBox="0 0 20 20"
    width="20"
    height="20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <circle cx="9.2" cy="9.2" r="5.4" stroke="currentColor" strokeWidth="1.5" />
    <path d="M13.2 13.2L16.2 16.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const normalizeKeyword = (value: string): string => value.trim().toLowerCase();

/**
 * SynClawArtifactsPanel
 *
 * SynClaw 频道右侧成果文件面板，仅负责展示与本地检索交互。
 */
export const SynClawArtifactsPanel = ({
  files,
  loading = false,
  error,
  onClose,
  onDownloadFile,
  resolveFileUrl,
  onPreviewStateChange,
}: SynClawArtifactsPanelProps): JSX.Element => {
  const [keyword, setKeyword] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string>();

  const filteredFiles = useMemo(() => {
    const normalized = normalizeKeyword(keyword);
    if (!normalized) return files;
    return files.filter(item => {
      return [item.fileName, item.taskName, item.producerName]
        .map(candidate => candidate.toLowerCase())
        .some(candidate => candidate.includes(normalized));
    });
  }, [files, keyword]);

  const handleKeywordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setKeyword(event.target.value);
  }, []);

  const selectedFile = useMemo(
    () => files.find(item => item.id === selectedFileId),
    [files, selectedFileId],
  );
  const previewState = useSynClawArtifactPreview(selectedFile, resolveFileUrl);

  useEffect(() => {
    onPreviewStateChange?.(Boolean(selectedFile));
  }, [onPreviewStateChange, selectedFile]);

  const handleClosePanel = useCallback(() => {
    setSelectedFileId(undefined);
    onClose?.();
  }, [onClose]);

  const handleBackToList = useCallback(() => {
    setSelectedFileId(undefined);
  }, []);

  const handleOpenFileDetail = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  const handleDownloadFile = useCallback(() => {
    if (!selectedFile || !onDownloadFile) return;
    onDownloadFile(selectedFile);
  }, [onDownloadFile, selectedFile]);

  const renderDetailPreview = useCallback((): JSX.Element => {
    if (!selectedFile) {
      return <div className={styles.previewNote}>请选择一个成果文件查看详情。</div>;
    }

    if (previewState.loading) {
      return (
        <div className={styles.previewStateBox} aria-label="成果预览加载中">
          <Spin />
          <div className={styles.previewStateText}>正在加载文件预览...</div>
        </div>
      );
    }

    if (previewState.error) {
      return (
        <div className={styles.previewStateBox} role="alert">
          <div className={styles.previewStateTitle}>预览失败</div>
          <div className={styles.previewStateText}>{previewState.error}</div>
        </div>
      );
    }

    if (previewState.previewType === "image" && previewState.previewUrl) {
      return (
        <div className={styles.mediaStage}>
          <img
            className={styles.mediaImage}
            src={previewState.previewUrl}
            alt={selectedFile.fileName}
          />
        </div>
      );
    }

    if (previewState.previewType === "video" && previewState.previewUrl) {
      return (
        <div className={styles.mediaStage}>
          <video
            className={styles.mediaVideo}
            src={previewState.previewUrl}
            controls
            playsInline
            preload="metadata"
          >
            <track kind="captions" />
          </video>
        </div>
      );
    }

    if (previewState.previewType === "audio" && previewState.previewUrl) {
      return (
        <div className={styles.audioStage}>
          <audio
            className={styles.audioPlayer}
            src={previewState.previewUrl}
            controls
            preload="metadata"
          >
            <track kind="captions" />
          </audio>
        </div>
      );
    }

    if (previewState.previewType === "markdown") {
      return previewState.previewBody.trim() ? (
        <div className={styles.markdownStage}>
          <div className={styles.markdownCard}>
            <MarkdownRenderer source={previewState.previewBody} />
          </div>
        </div>
      ) : (
        <div className={styles.previewStateBox} role="alert">
          <div className={styles.previewStateTitle}>暂无可预览内容</div>
        </div>
      );
    }

    if (previewState.previewType === "html") {
      return previewState.previewBody.trim() ? (
        <div className={styles.iframeStage}>
          <iframe
            className={styles.previewIframe}
            title={`预览: ${selectedFile.fileName}`}
            srcDoc={previewState.previewBody}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : (
        <div className={styles.previewStateBox} role="alert">
          <div className={styles.previewStateTitle}>暂无可预览内容</div>
        </div>
      );
    }

    if (previewState.previewType === "pdf" && previewState.previewUrl) {
      return (
        <div className={styles.iframeStage}>
          <iframe
            className={styles.previewIframe}
            title={`预览: ${selectedFile.fileName}`}
            src={previewState.previewUrl}
          />
        </div>
      );
    }

    if (previewState.previewType === "code" || previewState.previewType === "text") {
      return previewState.previewBody.trim() ? (
        <div className={styles.codeStage}>
          <pre className={styles.codeBlock}>
            <code>{previewState.previewBody}</code>
          </pre>
        </div>
      ) : (
        <div className={styles.previewStateBox} role="alert">
          <div className={styles.previewStateTitle}>暂无可预览内容</div>
        </div>
      );
    }

    if (previewState.previewType === "office") {
      return (
        <div className={styles.previewStateBox}>
          <div className={styles.previewStateTitle}>当前类型暂不支持内嵌预览</div>
          <div className={styles.previewStateText}>
            可通过“下载”或浏览器新开页面查看该 Office 文件。
          </div>
        </div>
      );
    }

    return (
      <div className={styles.previewStateBox}>
        <div className={styles.previewStateTitle}>暂不支持预览该类型文件</div>
        <div className={styles.previewStateText}>你仍然可以下载该文件后在本地查看。</div>
      </div>
    );
  }, [previewState, selectedFile]);

  return (
    <aside className={styles.panel} aria-label="成果文件面板">
      {!selectedFile ? (
        <div className={styles.header}>
          <div className={styles.headerText}>
            <div className={styles.title}>成果</div>
            <div className={styles.subtitle}>
              {loading ? "成果文件加载中..." : `${files.length} 个成果文件`}
            </div>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="关闭成果面板"
            onClick={handleClosePanel}
          >
            <CloseIcon className={styles.closeIcon} />
          </button>
        </div>
      ) : (
        <div className={styles.previewHeader}>
          <button
            type="button"
            className={styles.backButton}
            aria-label="返回成果列表"
            onClick={handleBackToList}
          >
            ← 返回
          </button>
          <div className={styles.previewHeaderActions}>
            <button
              type="button"
              className={styles.previewHeaderButton}
              onClick={handleDownloadFile}
              disabled={!onDownloadFile || selectedFile.isDeleted}
            >
              下载
            </button>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="关闭成果面板"
              onClick={handleClosePanel}
            >
              <CloseIcon className={styles.closeIcon} />
            </button>
          </div>
        </div>
      )}

      <div className={styles.content}>
        {!selectedFile ? (
          <>
            <div className={styles.searchWrap}>
              <label className={styles.searchBox} aria-label="搜索成果文件">
                <SearchIcon className={styles.searchIcon} />
                <input
                  type="search"
                  className={styles.searchInput}
                  value={keyword}
                  placeholder="搜索文件名、任务、产出人..."
                  onChange={handleKeywordChange}
                />
              </label>
            </div>

            <div className={styles.list} role="list" aria-label="成果文件列表">
              {error ? (
                <div className={styles.emptyState}>{error}</div>
              ) : loading ? (
                <div className={styles.emptyState}>正在同步成果文件...</div>
              ) : filteredFiles.length > 0 ? (
                filteredFiles.map(item => {
                  const logo = resolveFileLogo(item.fileName);
                  return (
                    <article key={item.id} className={styles.fileCard} role="listitem">
                      <button
                        type="button"
                        className={styles.fileCardButton}
                        aria-label={`查看成果详情：${item.fileName}`}
                        onClick={() => handleOpenFileDetail(item.id)}
                      >
                        <span className={styles.fileCardIcon} aria-hidden={true}>
                          <img className={styles.fileCardIconImage} src={logo.src} alt={logo.alt} />
                        </span>
                        <span className={styles.fileCardBody}>
                          <span className={styles.fileCardTitleRow}>
                            <span className={styles.fileName} title={item.fileName}>
                              {item.fileName}
                            </span>
                          </span>
                          <span className={styles.fileMeta}>
                            {item.fileSize} · {item.producedAt}
                          </span>
                        </span>
                      </button>
                      <span className={styles.fileCardActions} aria-label="成果操作">
                        <button
                          type="button"
                          className={styles.fileActionButton}
                          aria-label="下载成果"
                          title="下载"
                          disabled={!onDownloadFile || item.isDeleted}
                          onClick={() => onDownloadFile?.(item)}
                        >
                          <DownloadOutlineIcon className={styles.fileActionIcon} />
                        </button>
                      </span>
                    </article>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  {keyword.trim() ? "暂无匹配结果" : "当前频道还没有同步成果文件"}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.detailLayout}>
            <section className={styles.sectionCard} aria-label="文件预览">
              <div className={styles.previewCard}>{renderDetailPreview()}</div>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
};
