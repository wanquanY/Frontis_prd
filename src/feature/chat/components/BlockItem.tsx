/**
 * BlockItem 组件
 * 渲染单个 Block，根据 kind 类型显示不同的 UI
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  Component,
  type ReactNode,
} from "react";
import classNames from "classnames";
import { Bubble, Think, Actions } from "@ant-design/x";
import { Input, InputNumber, Select, DatePicker, Switch, Rate, message } from "antd";
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  CodeOutlined,
  CloseCircleFilled,
  DownOutlined,
  EditOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LoadingOutlined,
  DownloadOutlined,
  PaperClipOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type {
  ArtifactData,
  AskUserType,
  Block,
  DynamicsWorkflowNodeData,
  DynamicsWorkflowTextData,
  DynamicsWorkflowToolData,
  ErrorData,
  FormFieldDef,
  HITLRequestData,
  HITLRespondPayload,
  TextData,
  ToolResultData,
  ToolUseData,
  ToolSearchResultItem,
  MessageAttachment,
  PlanData,
  ArtifactImage,
  ResultCardsData,
} from "@/types/block";
import { decodeMention, MENTION_DISPLAY_REGEX } from "@/utils/mention";
import { formatFileSize, getFileExtension } from "@/utils/file";
import { resolveFileLogo } from "@/utils/fileLogo";
import { ChatMarkdown } from "./ChatMarkdown";
import styles from "./BlockItem.module.less";
import copyIcon from "@/assets/images/copy-icon.png";
import arrowUpIcon from "@/assets/images/arrow-up.png";
import thinkIcon from "@/assets/images/think-icon.png";
import turnLeftIcon from "@/assets/images/turn-left.png";
import turnRightIcon from "@/assets/images/turn-right.png";
import processingIcon from "@/assets/images/processing-icon.png";
import planCompleteIcon from "@/assets/images/planIcon/plan-complete.png";
import planFailedIcon from "@/assets/images/planIcon/plan-failed.png";
import planPendingIcon from "@/assets/images/planIcon/plan-pending.png";
import knowledgeIcon from "@/assets/images/knowledge-icon.png";
import planIgnoreIcon from "@/assets/images/planIcon/plan-ignore.png";

import fileListIcon from "@/assets/images/toolsIcon/file-list-icon.png";
import fileReadIcon from "@/assets/images/toolsIcon/file-read-icon.png";
import htmlAnalysisIcon from "@/assets/images/toolsIcon/html-analysis-icon.png";
import readAttachmentIcon from "@/assets/images/toolsIcon/read-attachment-icon.png";
import readDocIcon from "@/assets/images/toolsIcon/read-doc-icon.png";
// import readHtmlIcon from "@/assets/images/toolsIcon/read-html-icon.png"
import webSearchIcon from "@/assets/images/toolsIcon/web-search-icon.png";
import planListIcon from "@/assets/images/toolsIcon/plan-list-icon.png";
import askUserIcon from "@/assets/images/toolsIcon/ask-user-icon.png";
import rememberHistoryIcon from "@/assets/images/toolsIcon/remember-history-icon.png";
import hitlError from "@/assets/images/hitl-error.png";

interface MentionDisplaySegment {
  text: string;
  highlighted: boolean;
}

const buildMentionDisplaySegments = (content: string): MentionDisplaySegment[] => {
  if (!content) return [];
  const segments: MentionDisplaySegment[] = [];
  let cursor = 0;

  for (const matched of content.matchAll(MENTION_DISPLAY_REGEX)) {
    const prefix = matched[1] || "";
    const rawToken = matched[2] || "";
    const matchedIndex = matched.index ?? -1;
    if (matchedIndex < 0) continue;
    const mentionStart = matchedIndex + prefix.length;
    const mentionEnd = mentionStart + rawToken.length + 1;

    if (cursor < mentionStart) {
      segments.push({
        text: content.slice(cursor, mentionStart),
        highlighted: false,
      });
    }

    segments.push({
      text: content.slice(mentionStart, mentionEnd),
      highlighted: true,
    });
    cursor = mentionEnd;
  }

  if (cursor < content.length) {
    segments.push({
      text: content.slice(cursor),
      highlighted: false,
    });
  }

  return segments;
};

interface BlockItemProps {
  block: Block;
  onHITLRespond?: (payload: HITLRespondPayload) => void; // 使用 blockId 而不是 requestId
  onOpenArtifact?: (block: Block) => void;
  onOpenResult?: (resultId: string) => void;
  onDownloadArtifact?: (url: string) => void;
  onAddArtifactToKnowledge?: (artifactId: string) => void;
  /** 控制复制按钮的显示与复制内容（仅助手 text） */
  copyContext?: {
    showCopy?: boolean;
    copyText?: string;
  };
}

interface MarkdownErrorBoundaryProps {
  content: string;
  children: ReactNode;
}

interface MarkdownErrorBoundaryState {
  hasError: boolean;
}

interface BlockCopyContext {
  showCopy?: boolean;
  copyText?: string;
}

const buildCopyActionItems = (copyText: string) => [
  {
    key: "copy",
    label: "复制",
    actionRender: () => {
      return (
        <Actions.Copy
          text={copyText}
          icon={<img src={copyIcon} alt="copy" className={styles.copyIcon} />}
        />
      );
    },
  },
];

const submitPrototypeFeedback = async (): Promise<{ success: boolean; error?: string }> => {
  await new Promise(resolve => {
    window.setTimeout(resolve, 240);
  });
  return { success: true };
};

const TOOL_CONTAINER_KINDS = new Set(["tool_use", "tool", "subagent", "sub_agent"]);
const MESSAGE_TOOL_SEQUENCE_KINDS = new Set([
  "tool_use",
  "tool",
  "subagent",
  "sub_agent",
  "tool_result",
]);

const TOOL_DISPLAY_NAME_MAP: Record<string, string> = {
  exec: "执行命令",
  bash: "执行命令",
  browser: "浏览器操作",
  web_fetch: "网页抓取",
  web_search: "网页搜索",
  read: "读取文件",
  write: "写入文件",
  edit: "编辑文件",
  ask_user: "请求用户确认",
  recall_history: "回顾历史",
  plan: "任务规划",
  read_attachment: "读取附件",
  analyze_attachment: "分析附件",
  list_space_data: "列出空间文件",
  read_space_data: "读取空间文件",
  analyze_space_data: "分析空间文件",
  read_url: "读取链接",
  generate_image: "生成图片",
};

const resolveToolDisplayName = (rawName?: string): string => {
  const normalizedName = typeof rawName === "string" ? rawName.trim() : "";
  if (!normalizedName) return "工具";
  return TOOL_DISPLAY_NAME_MAP[normalizedName.toLowerCase()] || normalizedName;
};

const resolveTextBlockContent = (block: Block): string => {
  if (block.kind !== "text") return "";
  const content = (block.data as Partial<TextData>).content;
  return typeof content === "string" ? content.trim() : "";
};

const normalizeThinkingContent = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.replace(/^\s*Reasoning:\s*/i, "");
};

const STREAMING_TEXT_BATCH_SIZE = 3;
const STREAMING_TEXT_STEP_MS = 28;

const useTypewriterText = (content: string, isStreaming: boolean): string => {
  const [visibleLength, setVisibleLength] = useState<number>(() =>
    isStreaming ? 0 : content.length,
  );
  const previousContentRef = useRef(content);

  useEffect(() => {
    if (!isStreaming) {
      previousContentRef.current = content;
      setVisibleLength(content.length);
      return;
    }

    const previousContent = previousContentRef.current;
    previousContentRef.current = content;

    setVisibleLength(currentVisibleLength => {
      if (content.startsWith(previousContent)) {
        return Math.min(content.length, Math.max(currentVisibleLength, previousContent.length));
      }

      return 0;
    });
  }, [content, isStreaming]);

  useEffect(() => {
    if (!isStreaming || visibleLength >= content.length) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setVisibleLength(currentVisibleLength =>
        Math.min(content.length, currentVisibleLength + STREAMING_TEXT_BATCH_SIZE),
      );
    }, STREAMING_TEXT_STEP_MS);

    return () => window.clearTimeout(timerId);
  }, [content, isStreaming, visibleLength]);

  return isStreaming ? content.slice(0, visibleLength) : content;
};

class MarkdownErrorBoundary extends Component<
  MarkdownErrorBoundaryProps,
  MarkdownErrorBoundaryState
> {
  state: MarkdownErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MarkdownErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: MarkdownErrorBoundaryProps): void {
    if (prevProps.content !== this.props.content && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <div className={styles.text}>{this.props.content}</div>;
    }
    return this.props.children;
  }
}

export function BlockItem({
  block,
  onHITLRespond,
  onOpenArtifact,
  onOpenResult,
  onDownloadArtifact,
  onAddArtifactToKnowledge,
  copyContext,
}: BlockItemProps) {
  const isUser = block.actorRole === "user" || (block.data as { role?: string }).role === "user";

  switch (block.kind) {
    case "text":
      return <TextBlock block={block} isUser={isUser} copyContext={copyContext} />;
    case "user_input":
      return <TextBlock block={block} isUser={true} />;
    case "thinking":
      return <ThinkingBlock block={block} />;
    case "plan":
      return <PlanBlock block={block} />;
    case "tool_use":
    case "tool":
    case "subagent":
    case "sub_agent":
      return (
        <ToolUseBlock block={block} onHITLRespond={onHITLRespond} onOpenArtifact={onOpenArtifact} />
      );
    case "tool_result":
      return <ToolResultBlock block={block} />;
    // dynamics_workflow_tool 作为 tool_use 的子块渲染，不单独处理
    case "ask_user":
    case "hitl_request":
    case "hitl":
      return <HITLRequestBlock block={block} onRespond={onHITLRespond} />;
    case "artifact":
      return (
        <ArtifactBlock
          block={block}
          onOpenArtifact={onOpenArtifact}
          onDownloadArtifact={onDownloadArtifact}
          onAddArtifactToKnowledge={onAddArtifactToKnowledge}
        />
      );
    case "result_cards":
      return <ResultCardsBlock block={block} onOpenResult={onOpenResult} />;
    case "error":
      return <ErrorBlock block={block} />;
    case "message":
      return (
        <MessageBlock
          block={block}
          onHITLRespond={onHITLRespond}
          onOpenArtifact={onOpenArtifact}
          onOpenResult={onOpenResult}
          onDownloadArtifact={onDownloadArtifact}
          onAddArtifactToKnowledge={onAddArtifactToKnowledge}
          copyContext={copyContext}
        />
      );
    default:
      return null;
  }
}

// ============ Message Block (container) ============
function MessageBlock({
  block,
  onHITLRespond,
  onOpenArtifact,
  onOpenResult,
  onDownloadArtifact,
  onAddArtifactToKnowledge,
  copyContext,
}: {
  block: Block;
  onHITLRespond?: (payload: HITLRespondPayload) => void;
  onOpenArtifact?: (block: Block) => void;
  onOpenResult?: (resultId: string) => void;
  onDownloadArtifact?: (url: string) => void;
  onAddArtifactToKnowledge?: (artifactId: string) => void;
  copyContext?: BlockCopyContext;
}) {
  const orderedChildren = useMemo(() => {
    const children = block.children || [];
    const toolParentIds = new Set(
      children.filter(child => TOOL_CONTAINER_KINDS.has(child.kind)).map(child => child.id),
    );

    return children.filter(child => {
      if (child.kind === "text") {
        return resolveTextBlockContent(child).length > 0;
      }
      if (child.kind !== "tool_result" || !child.parentId) return true;
      return !toolParentIds.has(child.parentId);
    });
  }, [block.children]);

  const orderedSegments = useMemo(() => {
    return orderedChildren.reduce<Array<{ type: "tool-sequence" | "single"; children: Block[] }>>(
      (segments, child) => {
        const isToolSequenceItem = MESSAGE_TOOL_SEQUENCE_KINDS.has(child.kind);
        const lastSegment = segments[segments.length - 1];

        if (isToolSequenceItem) {
          if (lastSegment && lastSegment.type === "tool-sequence") {
            lastSegment.children.push(child);
            return segments;
          }
          segments.push({ type: "tool-sequence", children: [child] });
          return segments;
        }

        segments.push({ type: "single", children: [child] });
        return segments;
      },
      [],
    );
  }, [orderedChildren]);

  const childCopyContextMap = useMemo(() => {
    const textChildren = orderedChildren.filter(child => child.kind === "text");
    if (!textChildren.length) return {};

    const combinedText = textChildren
      .map(child => {
        const data = child.data as Partial<TextData>;
        return typeof data.content === "string" ? data.content : "";
      })
      .filter(Boolean)
      .join("\n\n");

    if (!combinedText) return {};

    return textChildren.reduce<Record<string, BlockCopyContext>>((map, child) => {
      map[child.id] = {
        showCopy: false,
        copyText: combinedText,
      };
      return map;
    }, {});
  }, [orderedChildren]);

  const messageCopyText = useMemo(() => {
    const lastTextChild = [...orderedChildren].reverse().find(child => child.kind === "text");
    if (!lastTextChild) return "";
    return childCopyContextMap[lastTextChild.id]?.copyText ?? "";
  }, [childCopyContextMap, orderedChildren]);

  const messageCopyActions = useMemo(() => {
    if (!messageCopyText) return null;
    return <Actions items={buildCopyActionItems(messageCopyText)} />;
  }, [messageCopyText]);

  return (
    <div className={styles.messageBlock}>
      {orderedSegments.length ? (
        <div className={styles.messageActivityGroup}>
          {orderedSegments.map((segment, segmentIndex) => (
            <div
              key={`${segment.type}-${segment.children[0]?.id || segmentIndex}`}
              className={segment.type === "tool-sequence" ? styles.messageToolSequence : undefined}
            >
              {segment.children.map(child => (
                <BlockItem
                  key={child.id}
                  block={child}
                  onHITLRespond={onHITLRespond}
                  onOpenArtifact={onOpenArtifact}
                  onOpenResult={onOpenResult}
                  onDownloadArtifact={onDownloadArtifact}
                  onAddArtifactToKnowledge={onAddArtifactToKnowledge}
                  copyContext={childCopyContextMap[child.id] ?? copyContext}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {messageCopyActions ? (
        <div className={styles.messageActions}>{messageCopyActions}</div>
      ) : null}
    </div>
  );
}

const ASSISTANT_RESULT_MESSAGE_TYPES = new Set([
  "result_summary",
  "analysis_result",
  "artifact_summary",
  "deliverable_summary",
]);

const normalizeAssistantResultMessageType = (value?: string): string => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

const normalizeAssistantResultAttachments = (
  attachments: MessageAttachment[],
): MessageAttachment[] => {
  return attachments
    .map((attachment, index) => {
      const url = attachment.url?.trim() || attachment.thumb_url?.trim() || "";
      const name = attachment.name?.trim() || url || "附件";
      const safeId = Number.isFinite(attachment.id) ? attachment.id : index;
      return {
        ...attachment,
        id: safeId,
        name,
        url,
      };
    })
    .slice(0, 8);
};

const isAssistantResultImageAttachment = (attachment: MessageAttachment): boolean => {
  const mime = attachment.mime_type?.trim().toLowerCase() || "";
  const target = `${attachment.url || ""} ${attachment.thumb_url || ""} ${attachment.name || ""}`;
  return mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i.test(target);
};

// ============ Text Block ============
function TextBlock({
  block,
  isUser,
  copyContext,
}: {
  block: Block;
  isUser: boolean;
  copyContext?: BlockCopyContext;
}) {
  const data = block.data as unknown as TextData;
  const content = data.content || "";
  const displayContent = isUser ? decodeMention(content) : content;
  const isStreaming = !isUser && (block.isStreaming || data.status === "streaming");
  const streamedDisplayContent = useTypewriterText(displayContent, isStreaming);
  const userMentionSegments = useMemo(
    () => (isUser ? buildMentionDisplaySegments(displayContent) : []),
    [displayContent, isUser],
  );
  const attachments = (data.attachments as MessageAttachment[] | undefined) || [];
  const explicitResultAttachments =
    (data.result_attachments as MessageAttachment[] | undefined) || [];
  const mediaAttachments = (data.media as MessageAttachment[] | undefined) || [];
  const resultAttachmentsSource =
    explicitResultAttachments.length > 0
      ? explicitResultAttachments
      : mediaAttachments.length > 0
        ? mediaAttachments
        : attachments;
  const resultAttachments = useMemo(
    () => normalizeAssistantResultAttachments(resultAttachmentsSource),
    [resultAttachmentsSource],
  );
  const resultImageAttachments = useMemo(
    () => resultAttachments.filter(isAssistantResultImageAttachment),
    [resultAttachments],
  );
  const resultFileAttachments = useMemo(
    () => resultAttachments.filter(item => !isAssistantResultImageAttachment(item)),
    [resultAttachments],
  );
  const normalizedMessageType = normalizeAssistantResultMessageType(data.message_type);
  const normalizedRenderStyle = normalizeAssistantResultMessageType(data.render_style);
  const processCount =
    typeof data.process_count === "number" && Number.isFinite(data.process_count)
      ? data.process_count
      : undefined;
  const shouldRenderAssistantResultMessage =
    !isUser &&
    (ASSISTANT_RESULT_MESSAGE_TYPES.has(normalizedMessageType) ||
      normalizedRenderStyle === "result_summary" ||
      normalizedRenderStyle === "analysis_result" ||
      explicitResultAttachments.length > 0 ||
      mediaAttachments.length > 0 ||
      typeof processCount === "number");
  const shouldShowCopy = isUser ? true : copyContext?.showCopy === true;
  const copyText = isUser ? displayContent : (copyContext?.copyText ?? content);
  const actionItems = (text: string) =>
    shouldShowCopy ? buildCopyActionItems(copyText ?? text) : [];
  const copyActions = shouldShowCopy ? <Actions items={actionItems(content)} /> : null;
  const shouldShowProcessButton = typeof processCount === "number" && processCount > 0;
  const hasAssistantResultActions = Boolean(copyActions) || shouldShowProcessButton;

  const handleOpenResultAttachment = useCallback((attachment: MessageAttachment) => {
    const targetUrl = attachment.url?.trim() || attachment.thumb_url?.trim() || "";
    if (!targetUrl) {
      message.info("该附件暂不支持打开");
      return;
    }
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }, []);

  const handleViewProcess = useCallback(() => {
    message.info("过程详情功能开发中");
  }, []);

  if (shouldRenderAssistantResultMessage) {
    return (
      <div
        className={classNames(
          styles.textBlock,
          styles.assistantMessage,
          styles.assistantResultMessage,
        )}
      >
        <div className={styles.assistantResultCard}>
          <div className={styles.assistantResultBody}>
            <MarkdownErrorBoundary content={streamedDisplayContent}>
              <ChatMarkdown source={streamedDisplayContent} />
            </MarkdownErrorBoundary>
          </div>

          {resultImageAttachments.length > 0 ? (
            <div className={styles.assistantResultImageGrid} role="list" aria-label="成果图片">
              {resultImageAttachments.map((attachment, index) => {
                const imageUrl = attachment.url?.trim() || attachment.thumb_url?.trim() || "";
                return (
                  <button
                    key={`${attachment.id}-${index}-image`}
                    type="button"
                    className={styles.assistantResultImageItem}
                    onClick={() => handleOpenResultAttachment(attachment)}
                    aria-label={`打开图片：${attachment.name}`}
                  >
                    <img
                      src={imageUrl}
                      alt={attachment.name}
                      className={styles.assistantResultImage}
                      loading="lazy"
                    />
                    <span className={styles.assistantResultImageName} title={attachment.name}>
                      {attachment.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {resultFileAttachments.length > 0 ? (
            <div className={styles.assistantResultAttachmentList} role="list" aria-label="成果附件">
              {resultFileAttachments.map((attachment, index) => (
                <button
                  key={`${attachment.id}-${index}`}
                  type="button"
                  className={styles.assistantResultAttachmentItem}
                  onClick={() => handleOpenResultAttachment(attachment)}
                  aria-label={`打开附件：${attachment.name}`}
                >
                  <span className={styles.assistantResultAttachmentIcon} aria-hidden="true">
                    <PaperClipOutlined />
                  </span>
                  <span className={styles.assistantResultAttachmentName} title={attachment.name}>
                    {attachment.name}
                  </span>
                  <DownloadOutlined className={styles.assistantResultAttachmentAction} />
                </button>
              ))}
            </div>
          ) : null}

          {hasAssistantResultActions ? (
            <div className={styles.assistantResultActions}>
              {copyActions}
              {shouldShowProcessButton ? (
                <button
                  type="button"
                  className={styles.assistantResultProcessButton}
                  onClick={handleViewProcess}
                >
                  <ThunderboltOutlined className={styles.assistantResultProcessIcon} />
                  查看过程 {processCount}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.textBlock} ${isUser ? styles.userMessage : styles.assistantMessage}`}>
      {attachments.length > 0 ? <AttachmentRow attachments={attachments} /> : null}
      {isUser ? (
        <Bubble
          content={
            <span className={styles.userMessageText}>
              {userMentionSegments.map(segment => (
                <span
                  key={`${segment.text}-${segment.highlighted ? "mention" : "text"}`}
                  className={
                    segment.highlighted ? styles.userMessageMention : styles.userMessagePlain
                  }
                >
                  {segment.text}
                </span>
              ))}
            </span>
          }
          footer={<Actions items={actionItems(displayContent)} />}
          footerPlacement="outer-end"
        />
      ) : (
        <Bubble
          content={
            <MarkdownErrorBoundary content={streamedDisplayContent}>
              <ChatMarkdown source={streamedDisplayContent} />
            </MarkdownErrorBoundary>
          }
          variant="borderless"
          footer={copyActions}
          footerPlacement="outer-start"
        />
      )}
    </div>
  );
}

function AttachmentRow({ attachments }: { attachments: MessageAttachment[] }) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({ canLeft: false, canRight: false });

  const normalized = attachments.slice(0, 10).map(att => {
    const url = att.url || att.thumb_url || "";
    const name = att.name || url || "附件";
    const mime = att.mime_type || "";
    const ext = getFileExtension(name).toUpperCase();
    const isImage =
      mime.startsWith("image/") ||
      /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url) ||
      /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);

    return { ...att, url, name, mime, ext, isImage };
  });

  const updateScrollState = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    setScrollState({
      canLeft: scrollLeft > 0,
      canRight: scrollLeft < maxScroll - 1,
    });
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [updateScrollState, normalized.length]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handler = () => updateScrollState();
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, [updateScrollState]);

  return (
    <div className={styles.userAttachmentListWrapper}>
      {scrollState.canLeft ? (
        <img
          src={turnLeftIcon}
          alt="向左滑动附件"
          className={classNames(styles.userAttachmentScrollBtn, styles.userAttachmentScrollLeft)}
          onClick={() => {
            const el = listRef.current;
            if (!el) return;
            el.scrollTo({ left: 0, behavior: "smooth" });
          }}
        />
      ) : null}

      <div
        className={classNames(styles.userAttachmentList, {
          [styles.userAttachmentMaskLeft]: scrollState.canLeft,
          [styles.userAttachmentMaskRight]: scrollState.canRight,
        })}
        ref={listRef}
        role="list"
        aria-label="用户附件"
      >
        {normalized.map(att =>
          att.isImage ? (
            <div
              key={att.id}
              className={styles.userAttachmentThumb}
              role="listitem"
              title={att.name}
            >
              {att.url ? (
                <img className={styles.userAttachmentThumbImage} src={att.url} alt={att.name} />
              ) : (
                <span className={styles.userAttachmentThumbPlaceholder} aria-hidden="true">
                  <span className={styles.userAttachmentThumbExt}>{att.ext || "IMG"}</span>
                </span>
              )}
            </div>
          ) : (
            <div
              key={att.id}
              className={styles.userAttachmentItem}
              role="listitem"
              title={att.name}
            >
              <span className={styles.userAttachmentIcon} aria-hidden="true">
                <img
                  className={styles.userAttachmentIconImage}
                  src={resolveFileLogo(att.name).src}
                  alt={resolveFileLogo(att.name).alt}
                />
              </span>
              <span className={styles.userAttachmentInfo}>
                <span className={styles.userAttachmentName}>{att.name}</span>
                {typeof att.size === "number" ? (
                  <span className={styles.userAttachmentMeta}>{formatFileSize(att.size)}</span>
                ) : null}
              </span>
            </div>
          ),
        )}
      </div>

      {scrollState.canRight ? (
        <img
          src={turnRightIcon}
          alt="向右滑动附件"
          className={classNames(styles.userAttachmentScrollBtn, styles.userAttachmentScrollRight)}
          onClick={() => {
            const el = listRef.current;
            if (!el) return;
            el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
          }}
        />
      ) : null}
    </div>
  );
}

// ============ Thinking Block ============
function ThinkingBlock({ block }: { block: Block }) {
  const data = block.data as unknown as TextData;
  const content = normalizeThinkingContent(data.content);
  const isStreaming = block.isStreaming || data.status === "streaming";
  const displayContent = useTypewriterText(content, isStreaming);
  const isComplete = !isStreaming || data.status === "completed";
  const [expanded, setExpanded] = useState(!isComplete);

  useEffect(() => {
    setExpanded(!isComplete);
  }, [isComplete]);

  // Don't render empty thinking blocks
  if (!content && !block.isStreaming) return null;

  return (
    <div className={styles.thinkingBlock}>
      <Think
        icon={<img src={thinkIcon} alt="think" className={styles.thinkIcon} />}
        title={isComplete ? "思考完成" : "正在思考中"}
        expanded={expanded}
        onExpand={() => setExpanded(!expanded)}
        blink={!isComplete}
      >
        <div className={styles.thinkingMarkdown}>
          <MarkdownErrorBoundary content={displayContent}>
            <ChatMarkdown source={displayContent} />
          </MarkdownErrorBoundary>
        </div>
      </Think>
    </div>
  );
}

// ============ Tool Use Block ============
function ToolUseBlock({
  block,
  onHITLRespond,
  onOpenArtifact,
}: {
  block: Block;
  onHITLRespond?: (payload: HITLRespondPayload) => void;
  onOpenArtifact?: (block: Block) => void;
}) {
  const data = block.data as unknown as ToolUseData;

  const toolIcon = useMemo(() => {
    const map: Record<string, JSX.Element> = {
      exec: <CodeOutlined />,
      bash: <CodeOutlined />,
      browser: <GlobalOutlined />,
      web_fetch: <SearchOutlined />,
      read: <FileTextOutlined />,
      write: <EditOutlined />,
      edit: <EditOutlined />,
      web_search: <img src={webSearchIcon} alt="web_search" />,
      ask_user: <img src={askUserIcon} alt="ask_user" />,
      read_attachment: <img src={readAttachmentIcon} alt="read_attachment" />,
      analyze_attachment: <img src={htmlAnalysisIcon} alt="analyze_attachment" />,
      list_space_data: <img src={fileListIcon} alt="list_space_data" />,
      read_space_data: <img src={fileReadIcon} alt="read_space_data" />,
      analyze_space_data: <img src={htmlAnalysisIcon} alt="analyze_space_data" />,
      read_url: <img src={readDocIcon} alt="read_url" />,
      generate_image: <img src={readAttachmentIcon} alt="generate_image" />,
      recall_history: <img src={rememberHistoryIcon} alt="recall_history" />,
      plan: <img src={planListIcon} alt="plan" />,
    };
    return map[data.name] ?? <ToolOutlined />;
  }, [data.name]);

  // 获取子块中的 tool_result
  const resultBlock = block.children?.find(c => c.kind === "tool_result");
  const resultData = resultBlock?.data as unknown as ToolResultData | undefined;
  const isResultError = resultData?.is_error === true;

  // 获取子块中的 dynamics_workflow_tool
  const dwfBlock = block.children?.find(c => c.kind === "dynamics_workflow_tool");
  const hitlChild = block.children?.find(
    child => child.kind === "hitl" || child.kind === "ask_user" || child.kind === "hitl_request",
  );

  const stage = typeof data.stage === "string" ? data.stage.trim().toLowerCase() : "";
  const status =
    typeof data.status === "string" && data.status.trim()
      ? data.status.trim()
      : stage === "start"
        ? "running"
        : stage === "end"
          ? "success"
          : stage === "error"
            ? "failed"
            : "pending";
  const isRunning = status === "running";
  const isFailed = status === "failed";
  const isAborted = status === "aborted";
  const isSuspended = status === "suspended";
  const isSuccess = status === "success" || status === "completed" || status === "done";
  const isError = isFailed || isResultError;
  const isSubagent =
    block.kind === "subagent" ||
    block.kind === "sub_agent" ||
    data.is_subagent === true ||
    [
      "sub_agent",
      "subagent",
      "spawn_subagent",
      "sessions_spawn",
      "sessions.spawn",
      "subagents_spawn",
      "subagents.spawn",
    ].includes(
      String(data.name || "")
        .trim()
        .toLowerCase(),
    );

  const displayName =
    typeof data.display_name === "string" && data.display_name.trim()
      ? resolveToolDisplayName(data.display_name)
      : resolveToolDisplayName(data.name);
  const purpose = typeof data.purpose === "string" ? data.purpose.trim() : "";
  const shouldShowPurpose = Boolean(purpose);
  const subagentLabel =
    typeof data.subagent_label === "string" && data.subagent_label.trim()
      ? data.subagent_label.trim()
      : "";
  const subagentSessionKey =
    typeof data.subagent_session_key === "string" && data.subagent_session_key.trim()
      ? data.subagent_session_key.trim()
      : "";
  const subagentSessionId =
    typeof data.subagent_session_id === "string" && data.subagent_session_id.trim()
      ? data.subagent_session_id.trim()
      : "";
  const subagentRunId =
    typeof data.subagent_run_id === "string" && data.subagent_run_id.trim()
      ? data.subagent_run_id.trim()
      : "";
  const resultContent = typeof resultData?.content === "string" ? resultData.content.trim() : "";
  const searchResults = useMemo(
    () => (data.search_results as ToolSearchResultItem[] | undefined) || [],
    [data.search_results],
  );
  const [resultExpanded, setResultExpanded] = useState(false);
  const [resultOverflow, setResultOverflow] = useState(false);
  const resultListRef = useRef<HTMLDivElement | null>(null);
  const [isOutputExpanded, setIsOutputExpanded] = useState(isRunning);
  const [outputOverflow, setOutputOverflow] = useState(false);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const shouldShowOutputToggle = !!resultContent && (outputOverflow || !isRunning);
  const handleToggleOutput = useCallback(() => {
    if (!shouldShowOutputToggle) return;
    setIsOutputExpanded(value => !value);
  }, [shouldShowOutputToggle]);

  useEffect(() => {
    if (isRunning) {
      setIsOutputExpanded(true);
      return;
    }
    if (isSuccess || isAborted) {
      setIsOutputExpanded(false);
    }
  }, [isAborted, isRunning, isSuccess]);

  useEffect(() => {
    if (resultExpanded || searchResults.length === 0) {
      setResultOverflow(false);
      return;
    }
    const el = resultListRef.current;
    if (!el) return;
    const raf = window.requestAnimationFrame(() => {
      const hasOverflow = el.scrollHeight - el.clientHeight > 2;
      setResultOverflow(hasOverflow);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [resultExpanded, searchResults]);

  useEffect(() => {
    if (!resultContent) {
      setOutputOverflow(false);
      return;
    }
    const el = outputRef.current;
    if (!el) return;
    const raf = window.requestAnimationFrame(() => {
      const hasOverflow = el.scrollHeight - el.clientHeight > 2;
      setOutputOverflow(hasOverflow);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [resultContent, isOutputExpanded]);

  // 如果有 DWF 子块，直接渲染 DynamicsWorkflowBlock
  if (dwfBlock) {
    return <DynamicsWorkflowBlock block={dwfBlock} />;
  }

  if (isSubagent) {
    return (
      <SubagentBlock
        block={block}
        data={data}
        status={status}
        displayName={displayName}
        purpose={purpose}
        subagentLabel={subagentLabel}
        onHITLRespond={onHITLRespond}
        onOpenArtifact={onOpenArtifact}
      />
    );
  }

  return (
    <div className={styles.toolBlock}>
      <div className={styles.toolWrapper}>
        <div
          className={classNames(
            styles.toolUseTag,
            { [styles.toolUseTagClickable]: shouldShowOutputToggle },
            data.name === "plan" ? styles.toolUseTagPlan : "",
            {
              [styles.toolUseTagRunning]: isRunning,
              [styles.toolUseTagError]: isError,
              [styles.toolUseTagAborted]: isAborted,
              [styles.toolUseTagSuspended]: isSuspended,
            },
          )}
          aria-label={[
            displayName,
            shouldShowPurpose ? purpose : undefined,
            isSuspended
              ? "等待用户"
              : isRunning
                ? "执行中"
                : isError
                  ? "执行失败"
                  : isAborted
                    ? "已中止"
                    : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          role={shouldShowOutputToggle ? "button" : undefined}
          tabIndex={shouldShowOutputToggle ? 0 : undefined}
          aria-expanded={shouldShowOutputToggle ? isOutputExpanded : undefined}
          onClick={shouldShowOutputToggle ? handleToggleOutput : undefined}
          onKeyDown={
            shouldShowOutputToggle
              ? event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleToggleOutput();
                  }
                }
              : undefined
          }
        >
          <span className={styles.toolUseIcon} aria-hidden="true">
            {toolIcon}
          </span>

          <span className={styles.toolUseName} title={displayName}>
            {displayName}
          </span>

          {isSubagent ? <span className={styles.toolUseSubagentBadge}>Subagent</span> : null}

          {shouldShowPurpose ? (
            <>
              <span className={styles.toolUseDivider} aria-hidden="true" />
              <span className={styles.toolUsePurpose} title={purpose}>
                {purpose}
              </span>
            </>
          ) : null}

          <span className={styles.toolUseHeaderActions}>
            {isSuspended ? (
              <span className={styles.toolUseStatusSuspended}>
                <span className={styles.toolUseStatusDot} aria-hidden="true" />
                <span className={styles.toolUseStatusText}>等待用户</span>
              </span>
            ) : isRunning ? (
              <span className={styles.toolUseStatusProcess}>
                <span className={styles.toolUseSpinner} aria-hidden="true" />
                <span className={styles.toolUseStatusText}>执行中…</span>
              </span>
            ) : isError ? (
              <span className={styles.toolUseStatusError}>
                <CloseCircleFilled className={styles.toolUseStatusIcon} aria-hidden="true" />
                <span className={styles.toolUseStatusText}>执行失败</span>
              </span>
            ) : isAborted ? (
              <span className={styles.toolUseStatusAborted}>
                <CloseCircleFilled className={styles.toolUseStatusIcon} aria-hidden="true" />
                <span className={styles.toolUseStatusText}>已中止</span>
              </span>
            ) : isSuccess ? (
              <span className={styles.toolUseStatusSuccess}>
                <CheckCircleOutlined className={styles.toolUseStatusIcon} aria-hidden="true" />
                <span className={styles.toolUseStatusText}>已完成</span>
              </span>
            ) : null}

            {shouldShowOutputToggle ? (
              <span
                className={classNames(styles.toolUseChevronBtn, {
                  [styles.toolUseChevronBtnExpanded]: isOutputExpanded,
                })}
                aria-hidden="true"
              >
                <DownOutlined />
              </span>
            ) : null}
          </span>
        </div>

        {isSubagent &&
        (subagentLabel || subagentSessionKey || subagentSessionId || subagentRunId) ? (
          <div className={styles.toolUseMeta}>
            {subagentLabel ? (
              <>
                <span className={styles.toolUseMetaLabel}>任务</span>
                <span className={styles.toolUseMetaValue}>{subagentLabel}</span>
              </>
            ) : null}
            {subagentSessionKey ? (
              <>
                <span className={styles.toolUseMetaLabel}>会话</span>
                <span className={styles.toolUseMetaValue} title={subagentSessionKey}>
                  {subagentSessionKey}
                </span>
              </>
            ) : subagentSessionId ? (
              <>
                <span className={styles.toolUseMetaLabel}>会话</span>
                <span className={styles.toolUseMetaValue} title={subagentSessionId}>
                  {subagentSessionId}
                </span>
              </>
            ) : null}
            {subagentRunId ? (
              <>
                <span className={styles.toolUseMetaLabel}>Run</span>
                <span className={styles.toolUseMetaValue} title={subagentRunId}>
                  {subagentRunId}
                </span>
              </>
            ) : null}
          </div>
        ) : null}

        {searchResults.length > 0 ? (
          <div className={styles.toolUseResultsWrapper}>
            <div
              className={classNames(styles.toolUseResults, {
                [styles.toolUseResultsExpanded]: resultExpanded,
                [styles.toolUseResultsCollapsible]: !resultExpanded,
              })}
              aria-label="搜索结果"
              ref={resultListRef}
            >
              {searchResults.map((item, idx) => (
                <div key={`${item.url}-${idx}`} className={styles.toolUseResultItem}>
                  <div className={styles.toolUseResultTitle}>
                    {item.site_name ? (
                      <span className={styles.toolUseResultSite}>{item.site_name}</span>
                    ) : null}
                    <span className={styles.toolUseResultLink}>{item.title || item.url}</span>
                  </div>
                  {item.snippet ? (
                    <div className={styles.toolUseResultSnippet}>{item.snippet}</div>
                  ) : null}
                  <div className={styles.toolUseResultMeta}>
                    {item.published_at ? <span>{item.published_at}</span> : null}
                    <span className={styles.toolUseResultUrl}>{item.url}</span>
                  </div>
                </div>
              ))}
            </div>
            {!resultExpanded && resultOverflow ? (
              <div className={styles.toolUseResultsToggleWrap}>
                <button
                  type="button"
                  className={styles.toolUseResultsToggleBtn}
                  onClick={() => setResultExpanded(true)}
                  aria-label="展开更多搜索结果"
                >
                  展开更多
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {resultContent ? (
          <div className={styles.toolUseOutputSection}>
            <div
              className={classNames(styles.toolUseOutputViewport, {
                [styles.toolUseOutputViewportExpanded]: isOutputExpanded,
                [styles.toolUseOutputViewportCollapsed]: !isOutputExpanded,
              })}
            >
              <div
                ref={outputRef}
                className={classNames(styles.toolUseOutputBox, {
                  [styles.toolUseOutputError]: isResultError,
                  [styles.toolUseOutputBoxScrollable]: isOutputExpanded,
                })}
              >
                {resultContent}
              </div>
            </div>
          </div>
        ) : null}

        {/* 工具报错不展示技术性错误信息 */}

        {hitlChild ? (
          <div className={styles.toolHitlChild}>
            <BlockItem
              block={hitlChild}
              onHITLRespond={onHITLRespond}
              onOpenArtifact={onOpenArtifact}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SubagentBlock({
  block,
  status,
  displayName,
  purpose,
  subagentLabel,
  onHITLRespond,
  onOpenArtifact,
}: {
  block: Block;
  data: ToolUseData;
  status: string;
  displayName: string;
  purpose: string;
  subagentLabel: string;
  onHITLRespond?: (payload: HITLRespondPayload) => void;
  onOpenArtifact?: (block: Block) => void;
}) {
  const childBlocks = block.children || [];
  const title = subagentLabel || displayName || "Subagent";

  const statusToneClass = classNames({
    [styles.subagentStatusRunning]: status === "running",
    [styles.subagentStatusSuccess]:
      status === "success" || status === "completed" || status === "done",
    [styles.subagentStatusError]: status === "failed",
    [styles.subagentStatusSuspended]: status === "suspended",
    [styles.subagentStatusAborted]: status === "aborted",
  });

  const statusLabel =
    status === "running"
      ? "执行中"
      : status === "success" || status === "completed" || status === "done"
        ? "已完成"
        : status === "failed"
          ? "执行失败"
          : status === "suspended"
            ? "等待用户"
            : status === "aborted"
              ? "已中止"
              : "处理中";

  return (
    <div className={styles.toolBlock}>
      <div className={styles.toolWrapper}>
        <div
          className={classNames(styles.toolUseTag, {
            [styles.toolUseTagRunning]: status === "running",
            [styles.toolUseTagError]: status === "failed",
            [styles.toolUseTagAborted]: status === "aborted",
            [styles.toolUseTagSuspended]: status === "suspended",
          })}
          aria-label={`${title} ${statusLabel}`}
        >
          <span className={styles.toolUseIcon} aria-hidden="true">
            <ToolOutlined />
          </span>
          <span className={styles.toolUseName} title={title}>
            {title}
          </span>
          <span className={styles.toolUseSubagentBadge}>Subagent</span>
          {purpose ? (
            <>
              <span className={styles.toolUseDivider} aria-hidden="true" />
              <span className={styles.toolUsePurpose} title={purpose}>
                {purpose}
              </span>
            </>
          ) : null}
          <span className={classNames(styles.subagentStatus, statusToneClass)}>{statusLabel}</span>
        </div>

        {childBlocks.length ? (
          <div className={styles.subagentSection}>
            <div className={styles.subagentRawStream}>
              {childBlocks.map(child => (
                <div key={child.id} className={styles.subagentRawStreamItem}>
                  <BlockItem
                    block={child}
                    onHITLRespond={onHITLRespond}
                    onOpenArtifact={onOpenArtifact}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ToolResultBlock({ block }: { block: Block }) {
  const data = block.data as unknown as ToolResultData;
  const resultContent = typeof data.content === "string" ? data.content.trim() : "";
  const [isExpanded, setIsExpanded] = useState(block.isStreaming);
  const [hasOverflow, setHasOverflow] = useState(false);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const shouldShowToggle = hasOverflow || !block.isStreaming;

  useEffect(() => {
    if (block.isStreaming) {
      setIsExpanded(true);
      return;
    }
    setIsExpanded(false);
  }, [block.isStreaming]);

  useEffect(() => {
    if (!resultContent) {
      setHasOverflow(false);
      return;
    }
    const el = outputRef.current;
    if (!el) return;
    const raf = window.requestAnimationFrame(() => {
      const overflow = el.scrollHeight - el.clientHeight > 2;
      setHasOverflow(overflow);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isExpanded, resultContent]);

  if (!resultContent) return null;

  return (
    <div className={styles.toolBlock}>
      <div className={styles.toolWrapper}>
        <div className={styles.toolUseOutputSection}>
          {shouldShowToggle ? (
            <div className={styles.toolUseOutputActions}>
              <button
                type="button"
                className={classNames(styles.toolUseChevronBtn, {
                  [styles.toolUseChevronBtnExpanded]: isExpanded,
                })}
                onClick={() => setIsExpanded(value => !value)}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "收起工具输出" : "展开工具输出"}
              >
                <DownOutlined />
              </button>
            </div>
          ) : null}

          <div
            className={classNames(styles.toolUseOutputViewport, {
              [styles.toolUseOutputViewportExpanded]: isExpanded,
              [styles.toolUseOutputViewportCollapsed]: !isExpanded,
            })}
          >
            <div
              ref={outputRef}
              className={classNames(styles.toolUseOutputBox, {
                [styles.toolUseOutputError]: data.is_error === true,
                [styles.toolUseOutputBoxScrollable]: isExpanded,
              })}
            >
              {resultContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Plan Block ============
function PlanBlock({ block }: { block: Block }) {
  const data = block.data as unknown as PlanData;
  const statusRaw = typeof data.status === "string" ? data.status : "";
  const isCompleted = statusRaw === "completed";

  const title =
    typeof data.title === "string" && data.title.trim() ? data.title.trim() : "任务计划";

  const items = useMemo(() => {
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const normalized = rawItems.map((item, idx) => {
      const index =
        typeof item.index === "number" && Number.isFinite(item.index) ? item.index : idx;
      const stepTitle =
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : `步骤 ${index + 1}`;
      const spec = typeof item.spec === "string" && item.spec.trim() ? item.spec.trim() : null;
      const itemStatus = typeof item.status === "string" ? item.status : "pending";
      return { index, title: stepTitle, spec, status: itemStatus };
    });
    normalized.sort((a, b) => a.index - b.index);
    return normalized;
  }, [data.items]);

  const [collapsed, setCollapsed] = useState<boolean>(isCompleted);

  // 执行完成后自动收起；其他状态允许用户自由展开/收起
  useEffect(() => {
    if (isCompleted) {
      setCollapsed(true);
    }
  }, [isCompleted]);

  const renderItemIcon = (itemStatus: string) => {
    switch (itemStatus) {
      case "running":
        return (
          <img
            src={processingIcon}
            alt=""
            className={styles.planItemRunningIcon}
            aria-hidden={true}
          />
        );
      case "completed":
        return (
          <img
            src={planCompleteIcon}
            alt=""
            className={styles.planItemCompleted}
            aria-hidden={true}
          />
        );
      case "failed":
        return (
          <img src={planFailedIcon} alt="" className={styles.planItemFailed} aria-hidden={true} />
        );
      case "pending":
      default:
        return (
          <img src={planPendingIcon} alt="" className={styles.planItemPending} aria-hidden={true} />
        );
    }
  };

  const renderItemLineClass = (itemStatus: string) =>
    itemStatus === "completed" ? styles.planItemLineActive : styles.planItemLineMuted;

  const [planExpanded, setPlanExpanded] = useState(false);
  const [planOverflow, setPlanOverflow] = useState(false);
  const planListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (collapsed || planExpanded) {
      setPlanOverflow(false);
      return;
    }
    const el = planListRef.current;
    if (!el) return;
    const raf = window.requestAnimationFrame(() => {
      const hasOverflow = el.scrollHeight - el.clientHeight > 2;
      setPlanOverflow(hasOverflow);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [collapsed, planExpanded, items.length]);

  return (
    <div className={styles.toolPlanBlock}>
      <div className={styles.toolWrapper}>
        <div className={styles.planCard} aria-label="任务计划">
          <button
            type="button"
            className={classNames(styles.planHeader, styles.planHeaderClickable)}
            onClick={() => {
              setCollapsed(v => !v);
            }}
            aria-expanded={!collapsed}
            aria-controls={`plan-body-${block.id}`}
          >
            <span className={styles.planHeaderIcon} aria-hidden="true">
              {/* <UnorderedListOutlined /> */}
              <img src={planListIcon} alt="" />
            </span>

            <span className={styles.planHeaderTitle} title={title}>
              {title}
            </span>

            <span
              className={classNames(styles.planChevron, {
                [styles.planChevronCollapsed]: collapsed,
              })}
              aria-hidden="true"
            >
              <img src={arrowUpIcon} alt="" />
            </span>
          </button>

          <div
            id={`plan-body-${block.id}`}
            className={classNames(styles.planBody, {
              [styles.planBodyCollapsed]: collapsed,
            })}
            aria-hidden={collapsed}
          >
            <div
              className={classNames(styles.planItemList, {
                [styles.planItemListExpanded]: planExpanded,
              })}
              role="list"
              aria-label="计划步骤"
              ref={planListRef}
            >
              {items.map((item, idx) => {
                const isLast = idx === items.length - 1;
                const isRunning = item.status === "running";
                return (
                  <div key={item.index} className={styles.planItem} role="listitem">
                    <div className={styles.planItemLeft} aria-hidden="true">
                      {renderItemIcon(item.status)}
                      {!isLast ? (
                        <span
                          className={classNames(
                            styles.planItemLine,
                            renderItemLineClass(item.status),
                          )}
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>

                    <div className={styles.planItemRight}>
                      <div
                        className={classNames(styles.planItemTitle, {
                          [styles.planItemTitleRunning]: isRunning,
                        })}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                      {item.spec ? (
                        <div className={styles.planItemSpec} title={item.spec}>
                          {item.spec}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {!planExpanded && planOverflow ? (
              <div className={styles.planToggleWrap}>
                <button
                  type="button"
                  className={styles.planToggleBtn}
                  onClick={() => setPlanExpanded(true)}
                  aria-label="展开更多计划步骤"
                >
                  展开更多
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Dynamics Workflow Tool Block ============

/**
 * 从 DWF 子块中提取节点和文本信息
 * 支持层级结构: DWF Container -> Node -> Text
 */
function extractDwfNodes(children: Block[] | undefined): {
  nodes: Array<{
    blockId: string;
    nodeId: string;
    nodeType: string;
    title: string;
    index: number;
    status: "running" | "succeeded" | "failed";
    elapsedTime?: number;
    error?: string | null;
    textContent?: string;
    isStreaming?: boolean;
  }>;
} {
  const nodes: Array<{
    blockId: string;
    nodeId: string;
    nodeType: string;
    title: string;
    index: number;
    status: "running" | "succeeded" | "failed";
    elapsedTime?: number;
    error?: string | null;
    textContent?: string;
    isStreaming?: boolean;
  }> = [];

  if (!children) return { nodes };

  for (const child of children) {
    // 检查是否为节点块 (node_started / node_finished)
    const childData = child.data as unknown as DynamicsWorkflowNodeData;
    if (childData.event === "node_started" || childData.event === "node_finished") {
      // 查找该节点的文本子块
      let textContent = "";
      let textStreaming = false;
      if (child.children) {
        for (const textChild of child.children) {
          const textData = textChild.data as unknown as DynamicsWorkflowTextData;
          if (textData.event === "text_chunk") {
            textContent += textData.text || "";
            if (textChild.isStreaming) {
              textStreaming = true;
            }
          }
        }
      }

      nodes.push({
        blockId: child.id,
        nodeId: childData.node_id,
        nodeType: childData.node_type,
        title: childData.title,
        index: childData.index,
        status: childData.status,
        elapsedTime: childData.elapsed_time,
        error: childData.error,
        textContent: textContent || undefined,
        isStreaming: child.isStreaming || textStreaming,
      });
    }
  }

  // 按 index 排序
  nodes.sort((a, b) => a.index - b.index);
  return { nodes };
}

function DynamicsWorkflowBlock({ block }: { block: Block }) {
  const data = block.data as unknown as DynamicsWorkflowToolData;
  const status = data.status || "running";
  const isRunning = status === "running" || block.isStreaming;
  const isSuccess = status === "succeeded";
  const isFailed = status === "failed";

  // 默认展开
  const [showDetail, setShowDetail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRating, setSubmittedRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [rating, setRating] = useState<number>(0);

  const feedbackInfo = data.feedback_info;

  // 提取节点信息
  const { nodes } = extractDwfNodes(block.children);

  const handleFeedbackSubmit = async () => {
    if (!feedbackInfo || submitted || rating === 0) return;
    try {
      setSubmitting(true);
      const resp = await submitPrototypeFeedback();
      if (resp.success) {
        setSubmitted(true);
        setSubmittedRating(rating);
        message.success("反馈提交成功");
      } else {
        message.error(resp.error || "反馈提交失败");
      }
    } catch (e) {
      console.error("submit feedback error", e);
      message.error("反馈提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusText = () => {
    if (isRunning) return "执行中...";
    if (isSuccess) return "执行成功";
    if (isFailed) return "执行失败";
    return "";
  };

  const statusText = renderStatusText();

  const headerStatusClass = isRunning
    ? styles.running
    : isFailed
      ? styles.error
      : isSuccess
        ? styles.success
        : "";

  const { outputs, text_content: textContent, error } = data;

  // 节点状态图标
  const getNodeStatusIcon = (nodeStatus: string, nodeStreaming?: boolean) => {
    if (nodeStatus === "running" || nodeStreaming) return "⏳";
    if (nodeStatus === "succeeded") return "✅";
    if (nodeStatus === "failed") return "❌";
    return "⭕";
  };

  return (
    <div className={styles.toolBlock}>
      <div className={styles.toolWrapper}>
        <div className={`${styles.toolCard} ${headerStatusClass}`}>
          <button
            type="button"
            className={styles.toolHeader}
            onClick={() => setShowDetail(!showDetail)}
          >
            <span className={styles.toolIcon}>{isFailed ? "⚠️" : isSuccess ? "✅" : "🧩"}</span>
            <span className={styles.toolName}>
              {resolveToolDisplayName(data.tool_name) || "Dynamics Workflow"}
            </span>
            {statusText && (
              <span className={`${styles.toolStatus} ${headerStatusClass}`}>{statusText}</span>
            )}
            <img
              src={arrowUpIcon}
              alt="arrow-up"
              className={`${styles.expandIcon} ${showDetail ? styles.expanded : ""}`}
            />
          </button>

          {showDetail ? (
            <div className={styles.toolContent}>
              {data.inputs ? (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>输入参数:</div>
                  <pre className={styles.code}>{JSON.stringify(data.inputs, null, 2)}</pre>
                </div>
              ) : null}

              {/* 节点列表 - 实时显示工作流节点执行过程 */}
              {nodes.length > 0 ? (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>工作流节点:</div>
                  <div className={styles.dwfNodeList}>
                    {nodes.map(node => (
                      <div
                        key={node.blockId}
                        className={`${styles.dwfNode} ${
                          styles[
                            `dwfNode${node.status.charAt(0).toUpperCase()}${node.status.slice(1)}`
                          ] || ""
                        }`}
                      >
                        <div className={styles.dwfNodeHeader}>
                          <span className={styles.dwfNodeIcon}>
                            {getNodeStatusIcon(node.status, node.isStreaming)}
                          </span>
                          <span className={styles.dwfNodeTitle}>{node.title}</span>
                          <span className={styles.dwfNodeType}>{node.nodeType}</span>
                          {node.elapsedTime !== undefined ? (
                            <span className={styles.dwfNodeTime}>
                              {node.elapsedTime.toFixed(2)}s
                            </span>
                          ) : null}
                        </div>
                        {/* 流式文本输出 */}
                        {node.textContent ? (
                          <div className={styles.dwfNodeText}>
                            {node.textContent}
                            {node.isStreaming ? <span className={styles.cursor} /> : null}
                          </div>
                        ) : null}
                        {/* 节点错误 */}
                        {node.error ? (
                          <div className={styles.dwfNodeError}>{node.error}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 最终文本结果 (在 PATCH 中返回) */}
              {textContent ? (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>工作流结果:</div>
                  <div className={styles.textResult}>
                    {textContent.split("\n").map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {outputs ? (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>原始输出:</div>
                  <pre className={styles.code}>{JSON.stringify(outputs, null, 2)}</pre>
                </div>
              ) : null}

              {error ? (
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>错误信息:</div>
                  <pre className={`${styles.code} ${styles.errorCode}`}>{error}</pre>
                </div>
              ) : null}

              {/* 反馈区域 - 放在底部 */}
              {isSuccess && feedbackInfo ? (
                <div className={styles.feedbackSection}>
                  <div className={styles.feedbackLabel}>请评价此结果:</div>
                  {submitted ? (
                    <div className={styles.feedbackDone}>
                      <CheckCircleFilled /> 已评价 {submittedRating} 分
                    </div>
                  ) : (
                    <div className={styles.feedbackForm}>
                      <div className={styles.feedbackRating}>
                        <Rate value={rating} onChange={setRating} disabled={submitting} />
                        <span className={styles.ratingText}>
                          {rating > 0 ? `${rating} 分` : "请打分"}
                        </span>
                      </div>
                      <Input.TextArea
                        placeholder="可选：补充说明你的评价..."
                        rows={2}
                        value={feedbackComment}
                        onChange={e => setFeedbackComment(e.target.value)}
                        disabled={submitting}
                        className={styles.feedbackTextarea}
                      />
                      <button
                        type="button"
                        className={styles.feedbackSubmitBtn}
                        onClick={() => void handleFeedbackSubmit()}
                        disabled={submitting || rating === 0}
                      >
                        {submitting ? "提交中..." : "提交反馈"}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ============ Form Field (for HITL form mode) ============
function FormField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const renderControl = () => {
    switch (field.field_type) {
      case "text":
        return (
          <Input
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );
      case "textarea":
        return (
          <Input.TextArea
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            disabled={disabled}
          />
        );
      case "number":
        return (
          <InputNumber
            value={value as number | undefined}
            onChange={v => onChange(v)}
            placeholder={field.placeholder}
            disabled={disabled}
            style={{ width: "100%" }}
          />
        );
      case "select":
        return (
          <Select
            value={(value as string) ?? undefined}
            onChange={v => onChange(v)}
            placeholder={field.placeholder || "请选择"}
            disabled={disabled}
            options={(field.options || []).map(o => ({ label: o, value: o }))}
            style={{ width: "100%" }}
          />
        );
      case "multi_select":
        return (
          <Select
            mode="multiple"
            value={(value as string[]) ?? []}
            onChange={v => onChange(v)}
            placeholder={field.placeholder || "请选择"}
            disabled={disabled}
            options={(field.options || []).map(o => ({ label: o, value: o }))}
            style={{ width: "100%" }}
          />
        );
      case "date":
        return (
          <DatePicker
            value={undefined}
            onChange={(_d, dateStr) => onChange(dateStr)}
            placeholder={field.placeholder || "请选择日期"}
            disabled={disabled}
            style={{ width: "100%" }}
          />
        );
      case "switch":
        return <Switch checked={!!value} onChange={v => onChange(v)} disabled={disabled} />;
      default:
        return (
          <Input
            value={(value as string) ?? ""}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className={styles.hitlFormItem}>
      <label className={styles.hitlFormLabel}>{field.label}</label>
      <div className={styles.hitlFormControl}>{renderControl()}</div>
    </div>
  );
}

// ============ HITL Request Block ============
function HITLRequestBlock({
  block,
  onRespond,
}: {
  block: Block;
  onRespond?: (payload: HITLRespondPayload) => void;
}) {
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const data = block.data as unknown as HITLRequestData;

  const status = data.status || "pending";
  const isResponded = status === "submitted" || status === "ignored";
  const askUserType: AskUserType = data.type || "single_select";
  const choices = useMemo(() => data.choices || [], [data.choices]);
  const fields = useMemo(() => data.fields || [], [data.fields]);
  const isForm = askUserType === "form";
  const isMultiSelect = askUserType === "multi_select";
  const allowCustom = data.allow_custom ?? false;
  const hitlId = data.hitl_id || block.id;
  const promptField = (block.data as { prompt?: unknown }).prompt;
  const isShowError = isForm
    ? !Array.isArray(fields) || fields.length === 0
    : !Array.isArray(choices) || choices.length === 0;

  // 新块或未提交状态下重置本地输入
  useEffect(() => {
    if (!isResponded) {
      setSelectedChoices([]);
      setCustomInput("");
      setFormValues(() => {
        const defaults: Record<string, unknown> = {};
        for (const f of fields) {
          if (f.default !== undefined) defaults[f.name] = f.default;
        }
        return defaults;
      });
      setIsSubmitting(false);
      setIsCollapsed(false);
    }
  }, [block.id, fields, isResponded]);

  // 根据后端回填的响应预填选项/文本
  useEffect(() => {
    const applyRespondedState = () => {
      if (!isResponded) return;
      const rawResponse = (data as { response?: unknown }).response;
      const responseObj =
        rawResponse && typeof rawResponse === "object" && !Array.isArray(rawResponse)
          ? (rawResponse as {
              selected?: string[];
              custom_input?: string;
              form_data?: Record<string, unknown>;
            })
          : undefined;

      // 表单模式回填
      if (isForm && responseObj?.form_data) {
        setFormValues(responseObj.form_data);
        return;
      }

      const resolvedSelected = responseObj?.selected?.filter(Boolean);
      const resolvedCustom =
        typeof responseObj?.custom_input === "string" ? responseObj.custom_input.trim() : "";

      if (resolvedSelected && resolvedSelected.length > 0) {
        setSelectedChoices(resolvedSelected);
        setCustomInput("");
        return;
      }

      if (resolvedCustom) {
        setSelectedChoices([]);
        setCustomInput(resolvedCustom);
        return;
      }

      setSelectedChoices([]);
      setCustomInput("");
    };

    applyRespondedState();
  }, [choices, data, isForm, isMultiSelect, isResponded]);

  // 等待后端 patch 把 status 更新后，结束本地 submitting 状态，避免 UI 一直处于“提交中”
  useEffect(() => {
    if (isResponded) {
      setIsSubmitting(false);
    }
  }, [isResponded]);

  // 后端可能透传 prompt，用于展示本次 ask_user 的提问文案
  const promptText = useMemo(() => {
    if (typeof data.title === "string" && data.title.trim()) return data.title.trim();
    if (typeof promptField === "string" && promptField.trim()) return promptField.trim();
    if (isForm) return "请填写以下信息：";
    return isMultiSelect ? "请选择您的下一步操作（可多选）：" : "请选择您的下一步操作：";
  }, [data.title, isForm, isMultiSelect, promptField]);

  const customPlaceholder = useMemo(() => {
    if (typeof data.custom_placeholder === "string" && data.custom_placeholder.trim()) {
      return data.custom_placeholder.trim();
    }
    if (isResponded) return "已提交，不可编辑";
    if (selectedChoices.length > 0) return "已选择选项，无法输入";
    return "请输入补充说明";
  }, [data.custom_placeholder, isResponded, selectedChoices.length]);

  const handleSingleSelect = (choice: string) => {
    if (isResponded) return;
    const alreadySelected = selectedChoices.includes(choice);
    setSelectedChoices(alreadySelected ? [] : [choice]);
    if (!alreadySelected) {
      setCustomInput("");
    }
  };

  const handleMultiSelect = (choice: string) => {
    if (isResponded) return;
    setSelectedChoices(prev =>
      prev.includes(choice) ? prev.filter(c => c !== choice) : [...prev, choice],
    );
    setCustomInput("");
  };

  const handleSubmit = () => {
    if (isResponded || isSubmitting) return;
    if (!onRespond) return;

    setIsSubmitting(true);
    setIsCollapsed(true);

    if (isForm) {
      // 表单模式：把 formValues 作为 message 摘要
      const summary = fields
        .map(f => {
          const v = formValues[f.name];
          return v !== undefined && v !== "" && v !== null ? `${f.label}: ${v}` : null;
        })
        .filter(Boolean)
        .join("; ");
      onRespond({
        blockId: block.id,
        hitlId,
        action: "submit",
        formData: formValues,
        message: summary || "已提交表单",
      });
      return;
    }

    const trimmedInput = customInput.trim();
    const responseText = isMultiSelect
      ? selectedChoices.join(", ") || trimmedInput
      : selectedChoices[0] || trimmedInput;

    if (!responseText) return;

    onRespond({
      blockId: block.id,
      hitlId,
      action: "submit",
      selected: selectedChoices.length > 0 ? selectedChoices : undefined,
      customInput: allowCustom ? trimmedInput : undefined,
      message: responseText,
    });
  };

  const handleIgnore = () => {
    if (isResponded || isSubmitting) return;
    if (!onRespond) return;
    setIsSubmitting(true);
    setIsCollapsed(true);
    onRespond({
      blockId: block.id,
      hitlId,
      action: "ignore",
      message: "ignored",
    });
  };

  const canSubmit = () => {
    if (isSubmitting || isResponded) return false;
    if (isForm) {
      // 表单模式：至少有一个字段有值即可提交
      return Object.values(formValues).some(v => v !== undefined && v !== "" && v !== null);
    }
    return selectedChoices.length > 0 || (allowCustom && customInput.trim().length > 0);
  };

  return (
    <div className={styles.hitlBlock}>
      <div
        className={classNames(styles.hitlCard, {
          [styles.hitlCardCollapsed]: isCollapsed,
          [styles.hitlCardSubmitting]: isSubmitting,
          [styles.hitlCardResponded]: isResponded,
        })}
      >
        {isShowError ? (
          <div className={styles.hitlError}>
            <img className={styles.hitlErrorImg} src={hitlError} alt="error" />
            <div className={styles.hitlErrorMsgText}>Oops!生成表单失败，请继续和我对话吧</div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className={classNames(styles.hitlHeader, {
                [styles.hitlHeaderCollapsed]: isCollapsed,
              })}
              onClick={() => setIsCollapsed(v => !v)}
              aria-expanded={!isCollapsed}
              aria-controls={`hitl-body-${block.id}`}
            >
              <span className={styles.hitlHeaderIcon} aria-hidden="true">
                <FileTextOutlined />
              </span>
              <span className={styles.hitlHeaderText} title={promptText}>
                {promptText}
              </span>
              {isSubmitting ? (
                <span
                  className={classNames(styles.hitlStatus, styles.hitlStatusLoading)}
                  aria-live="polite"
                >
                  <LoadingOutlined spin />
                  提交中
                </span>
              ) : isResponded ? (
                <span className={classNames(styles.hitlStatus)}>
                  {status === "ignored" ? (
                    <img src={planIgnoreIcon} alt="ignore" />
                  ) : (
                    <img src={planCompleteIcon} alt="ignore" />
                  )}
                  {status === "ignored" ? "已忽略" : "已提交"}
                </span>
              ) : null}
              <span
                className={classNames(styles.hitlChevron, {
                  [styles.hitlChevronCollapsed]: isCollapsed,
                })}
                aria-hidden="true"
              >
                <img src={arrowUpIcon} alt="arrow-up" />
              </span>
            </button>

            <div
              id={`hitl-body-${block.id}`}
              className={classNames(styles.hitlBody, { [styles.hitlBodyCollapsed]: isCollapsed })}
              aria-hidden={isCollapsed}
            >
              {isForm ? (
                <div className={styles.hitlFormFields}>
                  {fields.map(field => (
                    <FormField
                      key={field.name}
                      field={field}
                      value={formValues[field.name]}
                      onChange={v => setFormValues(prev => ({ ...prev, [field.name]: v }))}
                      disabled={isSubmitting || isResponded}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <div
                    className={styles.hitlChoices}
                    role={isMultiSelect ? "group" : "radiogroup"}
                    aria-label="请选择"
                  >
                    {choices.map((choice, index) => {
                      const isSelected = selectedChoices.includes(choice);
                      return (
                        <button
                          key={`${choice}-${index}`}
                          type="button"
                          onClick={() =>
                            isMultiSelect ? handleMultiSelect(choice) : handleSingleSelect(choice)
                          }
                          className={styles.hitlChoiceBtn}
                          disabled={isSubmitting || isResponded}
                          tabIndex={isCollapsed || isResponded ? -1 : undefined}
                          role={isMultiSelect ? "checkbox" : "radio"}
                          aria-checked={isSelected}
                        >
                          <span
                            className={classNames(
                              styles.hitlIndicator,
                              isMultiSelect
                                ? styles.hitlIndicatorMulti
                                : styles.hitlIndicatorSingle,
                              {
                                [styles.hitlIndicatorSelected]: isSelected,
                              },
                            )}
                            aria-hidden="true"
                          />
                          <span className={styles.hitlChoiceText} title={choice}>
                            {choice}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {allowCustom ? (
                    <div className={styles.hitlCustom}>
                      <textarea
                        value={customInput}
                        onChange={e => {
                          if (isResponded) return;
                          setCustomInput(e.target.value);
                          setSelectedChoices([]);
                        }}
                        placeholder={customPlaceholder}
                        rows={4}
                        className={styles.hitlTextarea}
                        disabled={isSubmitting || isResponded || selectedChoices.length > 0}
                        tabIndex={isCollapsed || isResponded ? -1 : undefined}
                      />
                    </div>
                  ) : null}
                </>
              )}
              {!isResponded ? (
                <div className={styles.hitlActions}>
                  <button
                    type="button"
                    onClick={handleIgnore}
                    disabled={isSubmitting || isResponded}
                    className={styles.hitlIgnoreBtn}
                    tabIndex={isCollapsed || isResponded ? -1 : undefined}
                  >
                    忽略
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit()}
                    className={styles.hitlConfirmBtn}
                    tabIndex={isCollapsed || isResponded ? -1 : undefined}
                  >
                    {isSubmitting ? "提交中..." : "确认"}
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultCardsBlock({
  block,
  onOpenResult,
}: {
  block: Block;
  onOpenResult?: (resultId: string) => void;
}) {
  const data = block.data as unknown as ResultCardsData;
  const items = Array.isArray(data.items)
    ? data.items.filter(item => typeof item.id === "string" && typeof item.title === "string")
    : [];

  if (!items.length) {
    return null;
  }

  return (
    <div className={styles.resultCardsBlock}>
      <div className={styles.resultCardsGrid}>
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            className={styles.resultCard}
            onClick={() => onOpenResult?.(item.id)}
            disabled={!onOpenResult}
            aria-label={`打开结果：${item.title}`}
          >
            <span className={styles.resultCardIcon} aria-hidden={true}>
              <FileTextOutlined />
            </span>
            <span className={styles.resultCardBody}>
              {item.badge ? <span className={styles.resultCardBadge}>{item.badge}</span> : null}
              <span className={styles.resultCardTitle}>{item.title}</span>
              {item.subtitle ? (
                <span className={styles.resultCardSubtitle}>{item.subtitle}</span>
              ) : null}
              {item.created_at ? (
                <span className={styles.resultCardMeta}>创建时间：{item.created_at}</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ Artifact Block ============
function ArtifactBlock({
  block,
  onOpenArtifact,
  onDownloadArtifact,
  onAddArtifactToKnowledge,
}: {
  block: Block;
  onOpenArtifact?: (block: Block) => void;
  onDownloadArtifact?: (artifactId: string) => void;
  onAddArtifactToKnowledge?: (artifactId: string) => void;
  isActive?: boolean;
}) {
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
    if (!isImage && !isPpt) return undefined;
    const payload = data.data;
    if (!payload || typeof payload !== "object") return undefined;
    // PPT: 取第一页 slide 的 image_url
    if (isPpt) {
      const slides = (payload as { slides?: Array<{ image_url?: string }> }).slides;
      if (Array.isArray(slides) && slides.length > 0) {
        return slides[0].image_url;
      }
      return undefined;
    }
    const images = (payload as { images?: unknown }).images;
    if (!Array.isArray(images)) return undefined;
    const first = images.find(
      (item: { url?: string; index?: number }): item is { url: string } =>
        typeof item.url === "string" && item.url.trim().length > 0,
    );
    return first?.url;
  }, [data.data, isImage, isPpt]);

  const videoUrl = useMemo((): string | undefined => {
    if (!isVideo) return undefined;
    const payload = data.data;
    if (!payload || typeof payload !== "object") return undefined;
    const url = (payload as { video_url?: string }).video_url;
    return typeof url === "string" && url.trim().length > 0 ? url.trim() : undefined;
  }, [data.data, isVideo]);

  const typeIcon = useMemo(() => {
    if (isImage || isVideo || isPpt) return null;
    if (isMarkdown) return resolveFileLogo("artifact.md");
    if (isHtml) return resolveFileLogo("artifact.html");
    return resolveFileLogo("artifact.txt");
  }, [isHtml, isImage, isPpt, isVideo, isMarkdown]);

  const metaText = useMemo((): string => {
    if (status === "generating" || status === "streaming" || block.isStreaming) return "生成中…";
    if (isImage) return `${(data.data as { images?: ArtifactImage[] }).images?.length || 0}张图片`;
    if (isPpt) {
      const slides = (data.data as { slides?: unknown[] })?.slides;
      return `${slides?.length || 0}页PPT`;
    }
    if (isVideo) {
      const d = (data.data as { duration?: number })?.duration;
      return d ? `${d}秒视频` : "视频";
    }
    return "点击查看详情";
  }, [block.isStreaming, status, data.data, isImage, isPpt, isVideo]);

  const handleDownload = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (!isCompleted) return;
      if (!artifactId) return;
      onDownloadArtifact?.(artifactId);
    },
    [artifactId, isCompleted, onDownloadArtifact],
  );

  const handleAddToKnowledge = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (!isCompleted) return;
      if (onAddArtifactToKnowledge && data.artifact_id) {
        onAddArtifactToKnowledge(data.artifact_id);
      }
    },
    [data.artifact_id, isCompleted, onAddArtifactToKnowledge],
  );

  // 非图片/视频类（markdown/html）在生成中也允许点击预览
  const canClickDuringStreaming = !isImage && !isVideo && !isPpt;
  const isClickable = isCompleted || canClickDuringStreaming;

  return (
    <div className={styles.artifactBlock}>
      <div className={styles.artifactWrapper}>
        <button
          type="button"
          className={styles.artifactCard}
          onClick={() => {
            if (!isClickable) return;
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
}

// ============ Error Block ============
function ErrorBlock({ block }: { block: Block }) {
  const data = block.data as unknown as ErrorData;
  const rawMessage = typeof data.message === "string" ? data.message.trim() : "";
  const normalizedMessage = rawMessage.toLowerCase();
  const isAbortedState =
    normalizedMessage.includes("aborted") || normalizedMessage.includes("已停止");
  const isStreamEndedState = normalizedMessage.includes("without terminal event");

  if (isAbortedState) {
    return (
      <div className={styles.errorBlock}>
        <div className={styles.errorWrapper}>
          <div className={styles.stoppedDivider} role="status" aria-label="本次对话已停止">
            <span className={styles.stoppedDividerText}>已停止</span>
          </div>
        </div>
      </div>
    );
  }

  if (isStreamEndedState) {
    return (
      <div className={styles.errorBlock}>
        <div className={styles.errorWrapper}>
          <div className={styles.warningDivider} role="status" aria-label="本次对话异常结束">
            <span className={styles.warningDividerText}>异常结束</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.errorBlock}>
      <div className={styles.errorWrapper}>
        <div className={styles.errorCard}>
          <div className={styles.errorHeader}>
            <span>⚠️</span>
            <span>错误</span>
          </div>
          <div className={styles.errorMessage}>{rawMessage}</div>
          {data.code ? <div className={styles.errorCodeText}>代码: {data.code}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default BlockItem;
