import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DownloadOutlined,
  ExportOutlined,
  GlobalOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { message, Popover, Spin } from "antd";
import classNames from "classnames";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useArtifactPreview } from "@/feature/workspace/hooks/useArtifactPreview";
import type { ArtifactFileGroup, ArtifactItem } from "@/types/artifact";
import { resolveFileLogo } from "@/utils/fileLogo";

import styles from "./ArtifactPreviewPanel.module.less";

interface ArtifactPreviewPanelProps {
  files: ArtifactItem[];
  fileGroups?: ArtifactFileGroup[];
  showHeader?: boolean;
  reserveHeaderActionSpace?: boolean;
  loading?: boolean;
  error?: string;
  onDownloadFile?: (file: ArtifactItem) => void;
  onShareFile?: (file: ArtifactItem) => ArtifactShareInfo | void;
  onShareFileEnabledChange?: (
    file: ArtifactItem,
    enabled: boolean,
    shareInfo: ArtifactShareInfo | null,
  ) => void;
  resolveFileUrl?: (file: ArtifactItem) => Promise<string>;
  onPreviewStateChange?: (previewing: boolean) => void;
  preferredFileId?: string;
}

interface ArtifactShareInfo {
  link: string;
}

type HtmlPreviewMode = "preview" | "source";

interface SpreadsheetPreviewSheet {
  name: string;
  columns: string[];
  rows: string[][];
}

interface PresentationPreviewSlide {
  title: string;
  subtitle?: string;
  bullets: string[];
  imageUrl?: string;
}

type CodeTokenKind =
  | "plain"
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "function"
  | "property"
  | "literal"
  | "operator"
  | "tag";

interface CodeToken {
  text: string;
  kind: CodeTokenKind;
}

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringifyCell = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(item => stringifyCell(item)) : [];

const PYTHON_KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const JS_KEYWORDS = new Set([
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "interface",
  "let",
  "new",
  "return",
  "switch",
  "throw",
  "try",
  "type",
  "while",
]);

const SQL_KEYWORDS = new Set([
  "and",
  "as",
  "by",
  "case",
  "delete",
  "from",
  "group",
  "having",
  "insert",
  "into",
  "join",
  "left",
  "limit",
  "on",
  "or",
  "order",
  "right",
  "select",
  "set",
  "then",
  "update",
  "values",
  "when",
  "where",
]);

const LITERALS = new Set(["true", "false", "null", "undefined", "none", "True", "False", "None"]);

const getFileExtension = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();
  return extension && extension !== fileName.toLowerCase() ? extension : "";
};

const getSpreadsheetColumnName = (index: number): string => {
  let columnIndex = index + 1;
  let name = "";

  while (columnIndex > 0) {
    const remainder = (columnIndex - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    columnIndex = Math.floor((columnIndex - 1) / 26);
  }

  return name;
};

const resolveCodeLanguageLabel = (fileName: string): string => {
  const extension = getFileExtension(fileName);
  const languageMap: Record<string, string> = {
    js: "JavaScript",
    jsx: "React JSX",
    ts: "TypeScript",
    tsx: "React TSX",
    py: "Python",
    json: "JSON",
    html: "HTML",
    css: "CSS",
    less: "Less",
    scss: "SCSS",
    sql: "SQL",
    yaml: "YAML",
    yml: "YAML",
    md: "Markdown",
    txt: "Text",
  };

  return languageMap[extension] ?? (extension ? extension.toUpperCase() : "Text");
};

const getKeywordSet = (extension: string): Set<string> => {
  if (extension === "py") return PYTHON_KEYWORDS;
  if (extension === "sql") return SQL_KEYWORDS;
  if (["js", "jsx", "ts", "tsx"].includes(extension)) return JS_KEYWORDS;
  return new Set<string>();
};

const pushPlainToken = (tokens: CodeToken[], text: string): void => {
  if (!text) return;
  const previousToken = tokens[tokens.length - 1];
  if (previousToken?.kind === "plain") {
    previousToken.text += text;
    return;
  }
  tokens.push({ text, kind: "plain" });
};

const tokenizeHtmlLine = (line: string): CodeToken[] => {
  const tokens: CodeToken[] = [];
  const pattern =
    /(<!--.*?-->)|(<!doctype\b|<\/?[A-Za-z][\w:-]*)|([A-Za-z_:][\w:.-]*)(?==)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*')|([<>/=])/gi;
  let lastIndex = 0;

  line.replace(pattern, (match, comment, tag, property, stringValue, operator, offset: number) => {
    pushPlainToken(tokens, line.slice(lastIndex, offset));

    if (comment) tokens.push({ text: match, kind: "comment" });
    else if (tag) tokens.push({ text: match, kind: "tag" });
    else if (property) tokens.push({ text: match, kind: "property" });
    else if (stringValue) tokens.push({ text: match, kind: "string" });
    else if (operator) tokens.push({ text: match, kind: "operator" });

    lastIndex = offset + match.length;
    return match;
  });

  pushPlainToken(tokens, line.slice(lastIndex));
  return tokens;
};

const tokenizeCodeLine = (line: string, fileName: string): CodeToken[] => {
  const extension = getFileExtension(fileName);

  if (extension === "html" || extension === "htm") {
    return tokenizeHtmlLine(line);
  }

  const keywordSet = getKeywordSet(extension);
  const commentPattern = extension === "py" ? "#.*" : "\\/\\/.*|\\/\\*.*?\\*\\/";
  const pattern = new RegExp(
    `(${commentPattern})|("(?:\\\\.|[^"])*"|'(?:\\\\.|[^'])*'|\\\`(?:\\\\.|[^\\\`])*\\\`)|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b[A-Za-z_$][\\w$]*(?=\\s*\\())|(\\b[A-Za-z_$][\\w$]*\\b)|([{}[\\]().,:;+\\-*/%=<>!&|?])`,
    "g",
  );
  const tokens: CodeToken[] = [];
  let lastIndex = 0;

  line.replace(
    pattern,
    (
      match,
      comment,
      stringValue,
      numberValue,
      functionName,
      identifier,
      operator,
      offset: number,
    ) => {
      pushPlainToken(tokens, line.slice(lastIndex, offset));

      if (comment) tokens.push({ text: match, kind: "comment" });
      else if (stringValue) tokens.push({ text: match, kind: "string" });
      else if (numberValue) tokens.push({ text: match, kind: "number" });
      else if (functionName) tokens.push({ text: match, kind: "function" });
      else if (identifier) {
        if (keywordSet.has(identifier) || SQL_KEYWORDS.has(identifier.toLowerCase())) {
          tokens.push({ text: match, kind: "keyword" });
        } else if (LITERALS.has(identifier)) {
          tokens.push({ text: match, kind: "literal" });
        } else {
          tokens.push({ text: match, kind: "plain" });
        }
      } else if (operator) tokens.push({ text: match, kind: "operator" });

      lastIndex = offset + match.length;
      return match;
    },
  );

  pushPlainToken(tokens, line.slice(lastIndex));
  return tokens;
};

const getCodeTokenClassName = (kind: CodeTokenKind): string | undefined => {
  const classMap: Record<CodeTokenKind, string | undefined> = {
    plain: undefined,
    keyword: styles.codeTokenKeyword,
    string: styles.codeTokenString,
    comment: styles.codeTokenComment,
    number: styles.codeTokenNumber,
    function: styles.codeTokenFunction,
    property: styles.codeTokenProperty,
    literal: styles.codeTokenLiteral,
    operator: styles.codeTokenOperator,
    tag: styles.codeTokenTag,
  };

  return classMap[kind];
};

const parseSpreadsheetSheets = (body: string): SpreadsheetPreviewSheet[] => {
  const trimmedBody = body.trim();
  if (!trimmedBody) return [];

  try {
    const parsed: unknown = JSON.parse(trimmedBody);
    if (isRecord(parsed) && Array.isArray(parsed.sheets)) {
      return parsed.sheets
        .filter(isRecord)
        .map((sheet, index) => ({
          name:
            typeof sheet.name === "string" && sheet.name.trim() ? sheet.name : `Sheet ${index + 1}`,
          columns: toStringArray(sheet.columns),
          rows: Array.isArray(sheet.rows)
            ? sheet.rows.map(row => toStringArray(row)).filter(row => row.length > 0)
            : [],
        }))
        .filter(sheet => sheet.columns.length > 0 || sheet.rows.length > 0);
    }
  } catch {
    // 非 JSON 时按 CSV / TSV 文本降级解析。
  }

  const delimiter = trimmedBody.includes("\t") ? "\t" : ",";
  const rows = trimmedBody
    .split(/\r?\n/)
    .map(line => line.split(delimiter).map(cell => cell.trim()))
    .filter(row => row.some(Boolean));

  if (!rows.length) return [];

  const [columns, ...dataRows] = rows;
  return [
    {
      name: "Sheet 1",
      columns,
      rows: dataRows,
    },
  ];
};

const parsePresentationSlides = (body: string): PresentationPreviewSlide[] => {
  const trimmedBody = body.trim();
  if (!trimmedBody) return [];

  try {
    const parsed: unknown = JSON.parse(trimmedBody);
    if (isRecord(parsed) && Array.isArray(parsed.slides)) {
      return parsed.slides.filter(isRecord).map((slide, index) => ({
        title:
          typeof slide.title === "string" && slide.title.trim()
            ? slide.title
            : `第 ${index + 1} 页`,
        subtitle: typeof slide.subtitle === "string" ? slide.subtitle : undefined,
        bullets: toStringArray(slide.bullets),
        imageUrl: typeof slide.imageUrl === "string" ? slide.imageUrl : undefined,
      }));
    }
  } catch {
    // 非 JSON 时按纯文本生成一页预览。
  }

  return [
    {
      title: "演示文稿预览",
      bullets: trimmedBody.split(/\r?\n/).filter(Boolean),
    },
  ];
};

/**
 * ArtifactPreviewPanel
 *
 * 通用成果文件面板，仅负责展示与本地检索交互。
 */
export const ArtifactPreviewPanel = ({
  files,
  fileGroups,
  showHeader = true,
  reserveHeaderActionSpace = false,
  loading = false,
  error,
  onDownloadFile,
  onShareFile,
  onShareFileEnabledChange,
  resolveFileUrl,
  onPreviewStateChange,
  preferredFileId,
}: ArtifactPreviewPanelProps): JSX.Element => {
  const [keyword, setKeyword] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string>();
  const [htmlPreviewMode, setHtmlPreviewMode] = useState<HtmlPreviewMode>("preview");
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set());
  const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
  const [artifactShareInfo, setArtifactShareInfo] = useState<ArtifactShareInfo | null>(null);
  const [artifactShareEnabled, setArtifactShareEnabled] = useState(true);

  const filteredFiles = useMemo(() => {
    const normalized = normalizeKeyword(keyword);
    if (!normalized) return files;
    return files.filter(item => {
      return [item.fileName, item.taskName, item.producerName]
        .map(candidate => candidate.toLowerCase())
        .some(candidate => candidate.includes(normalized));
    });
  }, [files, keyword]);
  const filteredFileGroups = useMemo<ArtifactFileGroup[]>(() => {
    if (!fileGroups?.length) {
      return [];
    }

    const filteredFileIds = new Set(filteredFiles.map(item => item.id));

    return fileGroups
      .map(group => ({
        ...group,
        files: group.files.filter(item => filteredFileIds.has(item.id)),
      }))
      .filter(group => group.files.length > 0);
  }, [fileGroups, filteredFiles]);
  const normalizedKeyword = normalizeKeyword(keyword);

  const handleKeywordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setKeyword(event.target.value);
  }, []);

  const selectedFile = useMemo(
    () => files.find(item => item.id === selectedFileId),
    [files, selectedFileId],
  );
  const previewState = useArtifactPreview(selectedFile, resolveFileUrl);

  useEffect(() => {
    setSharePopoverOpen(false);
    setArtifactShareInfo(null);
  }, [selectedFile?.id]);

  useEffect(() => {
    if (!preferredFileId) {
      return;
    }

    if (!files.some(item => item.id === preferredFileId)) {
      return;
    }

    setSelectedFileId(current => (current === preferredFileId ? current : preferredFileId));
  }, [files, preferredFileId]);

  useEffect(() => {
    onPreviewStateChange?.(Boolean(selectedFile));
  }, [onPreviewStateChange, selectedFile]);

  useEffect(() => {
    setHtmlPreviewMode("preview");
    setSelectedSlideIndex(0);
    setSelectedSheetIndex(0);
  }, [selectedFileId]);

  useEffect(() => {
    if (!fileGroups?.length) {
      setExpandedGroupIds(new Set());
      return;
    }

    setExpandedGroupIds(new Set([fileGroups[0].id]));
  }, [fileGroups]);

  const handleBackToList = useCallback(() => {
    setSelectedFileId(undefined);
  }, []);

  const handleOpenFileDetail = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  const handleToggleFileGroup = useCallback((groupId: string) => {
    setExpandedGroupIds(current => {
      const nextGroupIds = new Set(current);

      if (nextGroupIds.has(groupId)) {
        nextGroupIds.delete(groupId);
      } else {
        nextGroupIds.add(groupId);
      }

      return nextGroupIds;
    });
  }, []);

  const handleDownloadFile = useCallback(() => {
    if (!selectedFile || !onDownloadFile) return;
    onDownloadFile(selectedFile);
  }, [onDownloadFile, selectedFile]);

  const handleSharePopoverOpenChange = useCallback((open: boolean): void => {
    if (!open) {
      setSharePopoverOpen(false);
      return;
    }

    if (!selectedFile || !onShareFile || selectedFile.isDeleted) {
      setSharePopoverOpen(false);
      return;
    }

    const nextShareInfo = onShareFile(selectedFile);
    if (!nextShareInfo) {
      setSharePopoverOpen(false);
      return;
    }

    setArtifactShareInfo(nextShareInfo);
    setArtifactShareEnabled(true);
    setSharePopoverOpen(true);
  }, [onShareFile, selectedFile]);

  const handleCopyArtifactShareLink = useCallback(async (): Promise<void> => {
    if (!artifactShareInfo?.link || !artifactShareEnabled) {
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(artifactShareInfo.link);
        message.success("分享链接已复制");
        return;
      }

      if (typeof document !== "undefined") {
        const input = document.createElement("textarea");
        input.value = artifactShareInfo.link;
        input.setAttribute("readonly", "true");
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        message.success("分享链接已复制");
        return;
      }
    } catch {
      // 复制失败时用统一提示，不暴露浏览器能力差异。
    }

    message.warning("复制失败，请重新点击复制链接");
  }, [artifactShareEnabled, artifactShareInfo?.link]);

  const handleToggleArtifactShare = useCallback((): void => {
    if (!selectedFile) {
      return;
    }

    setArtifactShareEnabled(current => {
      const nextEnabled = !current;
      onShareFileEnabledChange?.(selectedFile, nextEnabled, artifactShareInfo);
      return nextEnabled;
    });
  }, [artifactShareInfo, onShareFileEnabledChange, selectedFile]);

  const handleSwitchHtmlPreviewMode = useCallback((mode: HtmlPreviewMode) => {
    setHtmlPreviewMode(mode);
  }, []);

  const handleOpenHtmlDelivery = useCallback(() => {
    if (!selectedFile || previewState.previewType !== "html" || !previewState.previewBody.trim()) {
      return;
    }

    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      return;
    }

    previewWindow.document.open();
    previewWindow.document.write(previewState.previewBody);
    previewWindow.document.close();
    previewWindow.document.title = selectedFile.fileName;
  }, [previewState.previewBody, previewState.previewType, selectedFile]);

  const shouldShowHtmlTabs = previewState.previewType === "html";
  const shouldRenderGroupedList = Boolean(fileGroups?.length);

  const renderCodePreview = useCallback(
    (content: string): JSX.Element => {
      const lines = content.replace(/\n$/, "").split("\n");
      const languageLabel = selectedFile ? resolveCodeLanguageLabel(selectedFile.fileName) : "Text";

      return (
        <div className={styles.codeStage}>
          <div className={styles.codeToolbar}>
            <span className={styles.codeLanguage}>{languageLabel}</span>
            <span className={styles.codeMeta}>{lines.length} 行</span>
          </div>
          <pre className={styles.codeBlock}>
            <code>
              {lines.map((line, index) => (
                <span key={`${index}-${line}`} className={styles.codeLine}>
                  <span className={styles.codeLineNumber}>{index + 1}</span>
                  <span className={styles.codeLineContent}>
                    {line
                      ? tokenizeCodeLine(line, selectedFile?.fileName ?? "").map(
                          (token, tokenIndex) => (
                            <span
                              key={`${index}-${tokenIndex}-${token.text}`}
                              className={getCodeTokenClassName(token.kind)}
                            >
                              {token.text}
                            </span>
                          ),
                        )
                      : " "}
                  </span>
                </span>
              ))}
            </code>
          </pre>
        </div>
      );
    },
    [selectedFile],
  );

  const renderFileCard = useCallback(
    (item: ArtifactItem): JSX.Element => {
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
              <DownloadOutlined className={styles.fileActionIcon} />
            </button>
          </span>
        </article>
      );
    },
    [handleOpenFileDetail, onDownloadFile],
  );

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
        <div className={styles.videoStage}>
          <div className={styles.videoPlayerShell}>
            <video
              className={styles.mediaVideo}
              src={previewState.previewUrl}
              poster={selectedFile.previewPosterUrl}
              controls
              playsInline
              preload="metadata"
            >
              <track kind="captions" />
            </video>
          </div>
          <div className={styles.mediaCaption}>
            <span>{selectedFile.fileName}</span>
            <span>{selectedFile.fileSize}</span>
          </div>
        </div>
      );
    }

    if (previewState.previewType === "audio" && previewState.previewUrl) {
      return (
        <div className={styles.audioStage}>
          <div className={styles.audioCard}>
            <div className={styles.audioMeta}>
              <div className={styles.audioCover} aria-hidden={true}>
                <span />
              </div>
              <div className={styles.audioInfo}>
                <div className={styles.audioTitle}>{selectedFile.fileName}</div>
                <div className={styles.audioSubtitle}>
                  {selectedFile.fileSize} · {selectedFile.producedAt}
                </div>
              </div>
            </div>
            <div className={styles.audioWave} aria-hidden={true}>
              {Array.from({ length: 28 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <audio
              className={styles.audioPlayer}
              src={previewState.previewUrl}
              controls
              preload="metadata"
            >
              <track kind="captions" />
            </audio>
          </div>
        </div>
      );
    }

    if (previewState.previewType === "document" || previewState.previewType === "markdown") {
      return previewState.previewBody.trim() ? (
        <div className={styles.documentStage}>
          <div className={styles.documentPaper}>
            <MarkdownRenderer
              source={previewState.previewBody}
              enableMermaidActions={true}
              artifactFileName={selectedFile.fileName}
            />
          </div>
        </div>
      ) : (
        <div className={styles.previewStateBox} role="alert">
          <div className={styles.previewStateTitle}>暂无可预览内容</div>
        </div>
      );
    }

    if (previewState.previewType === "spreadsheet") {
      const sheets = parseSpreadsheetSheets(previewState.previewBody);
      const activeSheet = sheets[Math.min(selectedSheetIndex, sheets.length - 1)];

      return activeSheet ? (
        <div className={styles.spreadsheetStage} aria-label="表格文件预览">
          <div className={styles.workbookToolbar}>
            <div className={styles.nameBox}>A1</div>
            <div className={styles.formulaBar}>
              <span className={styles.formulaLabel}>fx</span>
              <span className={styles.formulaValue}>{activeSheet.columns[0] ?? ""}</span>
            </div>
          </div>
          <div className={styles.workbookGridWrap}>
            <table className={styles.workbookGrid}>
              <thead>
                <tr>
                  <th className={styles.cornerCell} aria-label="选择全部单元格" />
                  {activeSheet.columns.map((column, columnIndex) => (
                    <th key={column} className={styles.columnHeader}>
                      {getSpreadsheetColumnName(columnIndex)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className={styles.rowHeader}>1</th>
                  {activeSheet.columns.map((column, columnIndex) => (
                    <td
                      key={column}
                      className={columnIndex === 0 ? styles.activeSpreadsheetCell : undefined}
                    >
                      {column}
                    </td>
                  ))}
                </tr>
                {activeSheet.rows.map((row, rowIndex) => (
                  <tr key={`${activeSheet.name}-${rowIndex}`}>
                    <th className={styles.rowHeader}>{rowIndex + 2}</th>
                    {activeSheet.columns.map((column, columnIndex) => (
                      <td key={`${column}-${columnIndex}`}>{row[columnIndex] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.sheetTabBar} role="tablist" aria-label="工作表">
            {sheets.map((sheet, index) => (
              <button
                key={sheet.name}
                type="button"
                role="tab"
                aria-selected={selectedSheetIndex === index}
                className={`${styles.sheetTab} ${
                  selectedSheetIndex === index ? styles.sheetTabActive : ""
                }`}
                onClick={() => setSelectedSheetIndex(index)}
              >
                {sheet.name}
              </button>
            ))}
            <span className={styles.sheetTabSpacer} />
          </div>
          <div className={styles.workbookStatusBar}>
            <span>就绪</span>
            <span>
              {activeSheet.rows.length + 1} 行 · {activeSheet.columns.length} 列
            </span>
          </div>
        </div>
      ) : (
        <div className={styles.previewStateBox} role="alert">
          <div className={styles.previewStateTitle}>暂无可预览内容</div>
        </div>
      );
    }

    if (previewState.previewType === "presentation") {
      const slides = parsePresentationSlides(previewState.previewBody);
      const activeSlide = slides[Math.min(selectedSlideIndex, slides.length - 1)];

      return activeSlide ? (
        <div className={styles.presentationStage} aria-label="演示文稿预览">
          <div className={styles.presentationCanvas}>
            <article className={styles.slideCard}>
              <div className={styles.slideIndex}>
                {selectedSlideIndex + 1} / {slides.length}
              </div>
              <div className={styles.slideBody}>
                <h3>{activeSlide.title}</h3>
                {activeSlide.subtitle ? <p>{activeSlide.subtitle}</p> : null}
                {activeSlide.bullets.length ? (
                  <ul>
                    {activeSlide.bullets.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {activeSlide.imageUrl ? (
                <img
                  className={styles.slideImage}
                  src={activeSlide.imageUrl}
                  alt=""
                  aria-hidden={true}
                />
              ) : null}
            </article>
          </div>
          <div className={styles.slideFilmstrip} role="tablist" aria-label="幻灯片缩略图">
            {slides.map((slide, index) => (
              <button
                key={`${slide.title}-${index}`}
                type="button"
                role="tab"
                aria-selected={selectedSlideIndex === index}
                className={classNames(styles.slideThumb, {
                  [styles.slideThumbActive]: selectedSlideIndex === index,
                })}
                onClick={() => setSelectedSlideIndex(index)}
              >
                <span className={styles.slideThumbIndex}>{index + 1}</span>
                <span className={styles.slideThumbTitle}>{slide.title}</span>
              </button>
            ))}
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
        htmlPreviewMode === "source" ? (
          renderCodePreview(previewState.previewBody)
        ) : (
          <div className={styles.htmlStage}>
            <div className={styles.htmlViewport}>
              <iframe
                className={styles.previewIframe}
                title={`预览: ${selectedFile.fileName}`}
                srcDoc={previewState.previewBody}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        )
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
        renderCodePreview(previewState.previewBody)
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
  }, [
    htmlPreviewMode,
    previewState,
    renderCodePreview,
    selectedFile,
    selectedSheetIndex,
    selectedSlideIndex,
  ]);

  return (
    <aside
      className={classNames(styles.panel, {
        [styles.panelHeaderActionReserved]: reserveHeaderActionSpace,
      })}
      aria-label="成果文件面板"
    >
      {!selectedFile && showHeader ? (
        <div className={styles.header}>
          <div className={styles.headerText}>
            <div className={styles.title}>成果</div>
            <div className={styles.subtitle}>
              {loading ? "成果文件加载中..." : `${files.length} 个成果文件`}
            </div>
          </div>
        </div>
      ) : selectedFile ? (
        <div className={styles.previewHeader}>
          <div className={styles.previewHeaderInfo}>
            <button
              type="button"
              className={classNames(styles.previewIconButton, styles.backButton)}
              aria-label="返回成果列表"
              title="返回成果列表"
              onClick={handleBackToList}
            >
              <ArrowLeftOutlined className={styles.previewHeaderIcon} />
            </button>
            <div className={styles.previewHeaderMeta}>
              <div className={styles.previewHeaderTitle} title={selectedFile.fileName}>
                {selectedFile.fileName}
              </div>
            </div>
          </div>
          <div className={styles.previewHeaderActions}>
            {shouldShowHtmlTabs ? (
              <div className={styles.previewTabGroup} role="tablist" aria-label="HTML 预览模式">
                <button
                  type="button"
                  role="tab"
                  aria-selected={htmlPreviewMode === "preview"}
                  className={classNames(
                    styles.previewTab,
                    htmlPreviewMode === "preview" ? styles.previewTabActive : undefined,
                  )}
                  onClick={() => handleSwitchHtmlPreviewMode("preview")}
                >
                  预览
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={htmlPreviewMode === "source"}
                  className={classNames(
                    styles.previewTab,
                    htmlPreviewMode === "source" ? styles.previewTabActive : undefined,
                  )}
                  onClick={() => handleSwitchHtmlPreviewMode("source")}
                >
                  源码
                </button>
              </div>
            ) : null}
            {shouldShowHtmlTabs ? (
              <button
                type="button"
                className={styles.previewIconButton}
                onClick={handleOpenHtmlDelivery}
                disabled={!previewState.previewBody.trim()}
                aria-label="新窗口打开预览"
                title="新窗口打开"
              >
                <ExportOutlined className={styles.previewHeaderIcon} />
              </button>
            ) : null}
            <Popover
              arrow={false}
              trigger={["hover"]}
              placement="bottomRight"
              open={sharePopoverOpen}
              onOpenChange={handleSharePopoverOpenChange}
              overlayClassName={styles.artifactSharePopover}
              content={
                <section className={styles.artifactShareCard} aria-label="分享文档">
                  <h3 className={styles.artifactShareTitle}>分享文档</h3>
                  <div className={styles.artifactShareStatusRow}>
                    <span className={styles.artifactShareIcon} aria-hidden={true}>
                      <GlobalOutlined />
                    </span>
                    <div className={styles.artifactShareStatusText}>
                      <strong>
                        {artifactShareEnabled ? "互联网分享已开启" : "互联网分享已关闭"}
                      </strong>
                      <span>任何获得链接的人可阅读</span>
                    </div>
                    <button
                      type="button"
                      className={classNames(styles.artifactShareSwitch, {
                        [styles.artifactShareSwitchOff]: !artifactShareEnabled,
                      })}
                      aria-pressed={artifactShareEnabled}
                      aria-label={artifactShareEnabled ? "关闭互联网分享" : "开启互联网分享"}
                      onClick={handleToggleArtifactShare}
                    >
                      <span />
                    </button>
                  </div>
                  <div className={styles.artifactShareLinkRow}>
                    <div
                      className={classNames(styles.artifactShareLinkBox, {
                        [styles.artifactShareLinkBoxDisabled]: !artifactShareEnabled,
                      })}
                      title={artifactShareInfo?.link}
                    >
                      {artifactShareInfo?.link || ""}
                    </div>
                    <button
                      type="button"
                      className={styles.artifactShareCopyButton}
                      onClick={handleCopyArtifactShareLink}
                      disabled={!artifactShareEnabled}
                    >
                      <CopyOutlined />
                      <span>复制链接</span>
                    </button>
                  </div>
                  <div className={styles.artifactShareDivider} />
                </section>
              }
            >
              <span className={styles.previewActionPopoverAnchor}>
                <button
                  type="button"
                  className={styles.previewIconButton}
                  disabled={!onShareFile || selectedFile.isDeleted}
                  aria-label={`分享 ${selectedFile.fileName}`}
                  title="分享"
                >
                  <ShareAltOutlined className={styles.previewHeaderIcon} />
                </button>
              </span>
            </Popover>
            <button
              type="button"
              className={styles.previewIconButton}
              onClick={handleDownloadFile}
              disabled={!onDownloadFile || selectedFile.isDeleted}
              aria-label={`下载 ${selectedFile.fileName}`}
              title="下载"
            >
              <DownloadOutlined className={styles.previewHeaderIcon} />
            </button>
          </div>
        </div>
      ) : null}

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
              ) : shouldRenderGroupedList ? (
                filteredFileGroups.length > 0 ? (
                  filteredFileGroups.map(group => {
                    const isExpanded = Boolean(normalizedKeyword) || expandedGroupIds.has(group.id);

                    return (
                      <section key={group.id} className={styles.fileGroup} aria-label={group.title}>
                        <button
                          type="button"
                          className={styles.fileGroupHeader}
                          aria-expanded={isExpanded}
                          onClick={() => handleToggleFileGroup(group.id)}
                        >
                          <span className={styles.fileGroupTitleWrap}>
                            <span className={styles.fileGroupTitle} title={group.title}>
                              {group.title}
                            </span>
                          </span>
                          <span className={styles.fileGroupMeta}>
                            <span className={styles.fileGroupCount}>{group.files.length}</span>
                            <span
                              className={classNames(styles.fileGroupChevron, {
                                [styles.fileGroupChevronOpen]: isExpanded,
                              })}
                              aria-hidden={true}
                            />
                          </span>
                        </button>
                        {isExpanded ? (
                          <div className={styles.fileGroupList}>
                            {group.files.map(item => renderFileCard(item))}
                          </div>
                        ) : null}
                      </section>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>
                    {keyword.trim() ? "暂无匹配结果" : "当前工作轨迹还没有同步成果文件"}
                  </div>
                )
              ) : filteredFiles.length > 0 ? (
                filteredFiles.map(item => renderFileCard(item))
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
