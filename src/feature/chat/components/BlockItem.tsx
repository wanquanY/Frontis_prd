/**
 * BlockItem 组件
 * 渲染单个 Block，根据 kind 类型显示不同的 UI
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import classNames from "classnames";
import { Bubble, Actions } from "@ant-design/x";
import { Input, InputNumber, Select, DatePicker, Switch, Rate, message } from "antd";
import {
  ApiOutlined,
  BranchesOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CloudDownloadOutlined,
  CodeOutlined,
  CloseCircleFilled,
  DatabaseOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  HistoryOutlined,
  LoadingOutlined,
  OrderedListOutlined,
  PaperClipOutlined,
  PictureOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type {
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
  ToolContactLookupItem,
  ToolResultData,
  ToolUseData,
  ToolSearchResultItem,
  MessageAttachment,
  PlanData,
} from "@/types/block";
import { submitPrototypeFeedback } from "@/feature/chat/utils/prototypeFeedback";
import { decodeMention, MENTION_DISPLAY_REGEX } from "@/utils/mention";

import { AttachmentRow } from "./AttachmentRow";
import { ArtifactBlock } from "./ArtifactBlock";
import { AssistantFeedbackAction } from "./AssistantFeedbackAction";
import { ChatMarkdown } from "./ChatMarkdown";
import { MarkdownErrorBoundary } from "./MarkdownErrorBoundary";
import { ThinkingBlock } from "./ThinkingBlock";
import { useTypewriterText } from "./useTypewriterText";
import styles from "./BlockItem.module.less";
import copyIcon from "@/assets/images/copy-icon.png";
import arrowUpIcon from "@/assets/images/arrow-up.png";
import processingIcon from "@/assets/images/processing-icon.png";
import planCompleteIcon from "@/assets/images/planIcon/plan-complete.png";
import planFailedIcon from "@/assets/images/planIcon/plan-failed.png";
import planPendingIcon from "@/assets/images/planIcon/plan-pending.png";
import planIgnoreIcon from "@/assets/images/planIcon/plan-ignore.png";

import planListIcon from "@/assets/images/toolsIcon/plan-list-icon.png";
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

const resolveContactAvatarLabel = (item: ToolContactLookupItem): string => {
  if (item.avatarLabel?.trim()) {
    return item.avatarLabel.trim();
  }

  if (item.typeLabel.includes("群")) {
    return "群";
  }

  return item.name.trim().charAt(0) || "人";
};

interface BlockItemProps {
  block: Block;
  onHITLRespond?: (payload: HITLRespondPayload) => void; // 使用 blockId 而不是 requestId
  onOpenArtifact?: (block: Block) => void;
  onOpenResult?: (resultId: string) => void;
  onToolExpand?: () => void;
  onDownloadArtifact?: (url: string) => void;
  onAddArtifactToKnowledge?: (artifactId: string) => void;
  /** 点击消息底部快捷建议后直接发送。 */
  onQuickActionSend?: (prompt: string) => void;
  /** 是否禁用消息底部快捷建议。 */
  quickActionDisabled?: boolean;
  /** 控制助手消息复制/反馈操作的显示与复制内容。 */
  copyContext?: {
    showCopy?: boolean;
    copyText?: string;
  };
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

const normalizeToolKeyword = (value?: string): string =>
  typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s.-]+/g, "_")
    : "";

const includesAnyToolKeyword = (value: string, keywords: string[]): boolean =>
  keywords.some(keyword => value.includes(keyword));

const resolveToolIcon = (name?: string, displayName?: string): JSX.Element => {
  const normalizedName = normalizeToolKeyword(name);
  const normalizedDisplayName = normalizeToolKeyword(displayName);
  const keyword = `${normalizedName} ${normalizedDisplayName}`;

  if (
    includesAnyToolKeyword(keyword, [
      "task_continue",
      "task_done",
      "task_fail",
      "任务继续",
      "任务完成",
      "任务失败",
    ])
  ) {
    return <RobotOutlined />;
  }

  if (
    normalizedName.includes("task_dispatch") ||
    normalizedDisplayName.includes("任务分发") ||
    (normalizedName.includes("workbench_task") && normalizedDisplayName.includes("任务分发"))
  ) {
    return <BranchesOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["skill", "技能"])) {
    return <ThunderboltOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["mcp", "飞书", "feishu", "api"])) {
    return <ApiOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["web_search", "search", "搜索"])) {
    return <SearchOutlined />;
  }

  if (
    includesAnyToolKeyword(keyword, [
      "browser",
      "web_fetch",
      "read_url",
      "html",
      "网页",
      "浏览器",
      "链接",
    ])
  ) {
    return <GlobalOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["http", "request", "download", "下载", "抓取"])) {
    return <CloudDownloadOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["list", "ls", "目录", "列出", "文件列表"])) {
    return <FolderOpenOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["read", "读取", "查看"])) {
    return <FileSearchOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["write", "create", "生成", "创建", "写入"])) {
    return <FileAddOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["edit", "patch", "修改", "编辑"])) {
    return <EditOutlined />;
  }

  if (
    includesAnyToolKeyword(keyword, ["exec", "bash", "shell", "python", "code", "代码", "命令"])
  ) {
    return <CodeOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["database", "sql", "table", "sheet", "表格", "数据"])) {
    return <DatabaseOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["image", "picture", "图片", "图像"])) {
    return <PictureOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["ask_user", "hitl", "确认", "询问"])) {
    return <QuestionCircleOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["recall_history", "history", "记忆", "历史"])) {
    return <HistoryOutlined />;
  }

  if (includesAnyToolKeyword(keyword, ["plan", "todo", "任务列表", "规划"])) {
    return <OrderedListOutlined />;
  }

  return <ToolOutlined />;
};

const resolveTextBlockContent = (block: Block): string => {
  if (block.kind !== "text") return "";
  const content = (block.data as Partial<TextData>).content;
  return typeof content === "string" ? content.trim() : "";
};

const normalizeQuickActionPrompts = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);
};

interface QuickActionListProps {
  prompts: string[];
  disabled: boolean;
  onSend?: (prompt: string) => void;
}

const collectQuickActionPrompts = (blocks: Block[]): string[] => {
  const promptSet = new Set<string>();

  blocks.forEach(child => {
    if (child.kind !== "text") {
      return;
    }

    const data = child.data as Partial<TextData>;
    normalizeQuickActionPrompts(data.followupSuggestions).forEach(prompt => {
      promptSet.add(prompt);
    });
  });

  return Array.from(promptSet).slice(0, 4);
};

const QuickActionList = ({
  prompts,
  disabled,
  onSend,
}: QuickActionListProps): JSX.Element | null => {
  if (!prompts.length || !onSend) {
    return null;
  }

  return (
    <div className={styles.messageQuickActions} aria-label="快捷操作">
      {prompts.map(prompt => (
        <button
          key={prompt}
          type="button"
          className={styles.messageQuickActionButton}
          disabled={disabled}
          onClick={() => onSend(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
};

const resolveToolAvatarLabel = (label?: string): string => {
  const normalizedLabel = label?.trim() ?? "";
  if (!normalizedLabel) {
    return "AI";
  }

  return normalizedLabel.slice(0, 2).toUpperCase();
};

const renderToolAvatar = (avatarUrl?: string, avatarLabel?: string): JSX.Element => {
  const normalizedAvatarUrl = avatarUrl?.trim() ?? "";

  return normalizedAvatarUrl ? (
    <img
      className={styles.toolUseAvatarImage}
      src={normalizedAvatarUrl}
      alt={avatarLabel || "AI"}
    />
  ) : (
    <span className={styles.toolUseAvatarFallback}>{resolveToolAvatarLabel(avatarLabel)}</span>
  );
};

export function BlockItem({
  block,
  onHITLRespond,
  onOpenArtifact,
  onOpenResult,
  onToolExpand,
  onDownloadArtifact,
  onAddArtifactToKnowledge,
  onQuickActionSend,
  quickActionDisabled = false,
  copyContext,
}: BlockItemProps) {
  const isUser = block.actorRole === "user" || (block.data as { role?: string }).role === "user";

  switch (block.kind) {
    case "text":
      return (
        <TextBlock
          block={block}
          isUser={isUser}
          copyContext={copyContext}
          onQuickActionSend={onQuickActionSend}
          quickActionDisabled={quickActionDisabled}
        />
      );
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
        <ToolUseBlock
          block={block}
          onHITLRespond={onHITLRespond}
          onOpenArtifact={onOpenArtifact}
          onToolExpand={onToolExpand}
        />
      );
    case "tool_result":
      return <ToolResultBlock block={block} onToolExpand={onToolExpand} />;
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
      return null;
    case "error":
      return <ErrorBlock block={block} />;
    case "message":
      return (
        <MessageBlock
          block={block}
          onHITLRespond={onHITLRespond}
          onOpenArtifact={onOpenArtifact}
          onOpenResult={onOpenResult}
          onToolExpand={onToolExpand}
          onDownloadArtifact={onDownloadArtifact}
          onAddArtifactToKnowledge={onAddArtifactToKnowledge}
          onQuickActionSend={onQuickActionSend}
          quickActionDisabled={quickActionDisabled}
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
  onToolExpand,
  onDownloadArtifact,
  onAddArtifactToKnowledge,
  onQuickActionSend,
  quickActionDisabled = false,
  copyContext,
}: {
  block: Block;
  onHITLRespond?: (payload: HITLRespondPayload) => void;
  onOpenArtifact?: (block: Block) => void;
  onOpenResult?: (resultId: string) => void;
  onToolExpand?: () => void;
  onDownloadArtifact?: (url: string) => void;
  onAddArtifactToKnowledge?: (artifactId: string) => void;
  onQuickActionSend?: (prompt: string) => void;
  quickActionDisabled?: boolean;
  copyContext?: BlockCopyContext;
}) {
  const orderedChildren = useMemo(() => {
    const children = block.children || [];
    const toolParentIds = new Set(
      children.filter(child => TOOL_CONTAINER_KINDS.has(child.kind)).map(child => child.id),
    );

    return children.filter(child => {
      if (child.kind === "result_cards") {
        return false;
      }

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

  const ownMessageCopyText = useMemo(() => {
    const lastTextChild = [...orderedChildren].reverse().find(child => child.kind === "text");
    if (!lastTextChild) return "";
    return childCopyContextMap[lastTextChild.id]?.copyText ?? "";
  }, [childCopyContextMap, orderedChildren]);

  const messageCopyText = useMemo(() => {
    if (typeof copyContext?.showCopy === "boolean") {
      return copyContext.showCopy ? copyContext.copyText?.trim() || ownMessageCopyText : "";
    }

    return ownMessageCopyText;
  }, [copyContext?.copyText, copyContext?.showCopy, ownMessageCopyText]);

  const messageCopyActions = useMemo(() => {
    if (!messageCopyText) return null;
    return <Actions items={buildCopyActionItems(messageCopyText)} />;
  }, [messageCopyText]);
  const messageFeedbackAction = messageCopyText ? (
    <AssistantFeedbackAction blockId={block.id} />
  ) : null;
  const messageActions =
    messageCopyActions || messageFeedbackAction ? (
      <div className={styles.assistantInlineActions}>
        {messageCopyActions}
        {messageFeedbackAction}
      </div>
    ) : null;
  const messageQuickActionPrompts = useMemo(
    () => collectQuickActionPrompts(orderedChildren),
    [orderedChildren],
  );
  const messageQuickActions = (
    <QuickActionList
      prompts={messageQuickActionPrompts}
      disabled={quickActionDisabled}
      onSend={onQuickActionSend}
    />
  );

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
                  onToolExpand={onToolExpand}
                  onDownloadArtifact={onDownloadArtifact}
                  onAddArtifactToKnowledge={onAddArtifactToKnowledge}
                  onQuickActionSend={onQuickActionSend}
                  quickActionDisabled={quickActionDisabled}
                  copyContext={childCopyContextMap[child.id] ?? copyContext}
                />
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {messageActions ? <div className={styles.messageActions}>{messageActions}</div> : null}
      {messageQuickActions}
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
  onQuickActionSend,
  quickActionDisabled = false,
}: {
  block: Block;
  isUser: boolean;
  copyContext?: BlockCopyContext;
  onQuickActionSend?: (prompt: string) => void;
  quickActionDisabled?: boolean;
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
  const quickActionPrompts = !isUser ? normalizeQuickActionPrompts(data.followupSuggestions) : [];
  const shouldShowInlineQuickActions = !isUser && copyContext?.showCopy !== false;
  const actionItems = (text: string) =>
    shouldShowCopy ? buildCopyActionItems(copyText ?? text) : [];
  const copyActions = shouldShowCopy ? <Actions items={actionItems(content)} /> : null;
  const feedbackAction =
    !isUser && shouldShowCopy ? <AssistantFeedbackAction blockId={block.id} /> : null;
  const assistantFooterActions =
    copyActions || feedbackAction ? (
      <div className={styles.assistantInlineActions}>
        {copyActions}
        {feedbackAction}
      </div>
    ) : null;
  const shouldShowProcessButton = typeof processCount === "number" && processCount > 0;
  const hasAssistantResultActions =
    Boolean(copyActions) || Boolean(feedbackAction) || shouldShowProcessButton;

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

  const quickActions = shouldShowInlineQuickActions ? (
    <QuickActionList
      prompts={quickActionPrompts}
      disabled={quickActionDisabled}
      onSend={onQuickActionSend}
    />
  ) : null;

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
              {assistantFooterActions}
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
        <>
          <Bubble
            content={
              <MarkdownErrorBoundary content={streamedDisplayContent}>
                <ChatMarkdown source={streamedDisplayContent} />
              </MarkdownErrorBoundary>
            }
            variant="borderless"
            footer={assistantFooterActions}
            footerPlacement="outer-start"
          />
          {quickActions}
        </>
      )}
    </div>
  );
}

// ============ Tool Use Block ============
function ToolUseBlock({
  block,
  onHITLRespond,
  onOpenArtifact,
  onToolExpand,
}: {
  block: Block;
  onHITLRespond?: (payload: HITLRespondPayload) => void;
  onOpenArtifact?: (block: Block) => void;
  onToolExpand?: () => void;
}) {
  const data = block.data as unknown as ToolUseData;

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
  const toolIcon = useMemo(() => resolveToolIcon(data.name, displayName), [data.name, displayName]);
  const normalizedToolName =
    typeof data.name === "string" && data.name.trim() ? data.name.trim().toLowerCase() : "";
  const isWorkbenchTask =
    normalizedToolName === "task_dispatch" ||
    normalizedToolName.startsWith("workbench-task") ||
    normalizedToolName.startsWith("workbench_task");
  const avatarUrl =
    typeof data.avatar_url === "string" && data.avatar_url.trim() ? data.avatar_url.trim() : "";
  const avatarLabel =
    typeof data.avatar_label === "string" && data.avatar_label.trim()
      ? data.avatar_label.trim()
      : "";
  const shouldShowAssigneeAvatar = isWorkbenchTask && Boolean(avatarUrl || avatarLabel);
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
  const contactResults = useMemo(
    () => (data.contact_results as ToolContactLookupItem[] | undefined) || [],
    [data.contact_results],
  );
  const [resultExpanded, setResultExpanded] = useState(false);
  const [resultOverflow, setResultOverflow] = useState(false);
  const resultListRef = useRef<HTMLDivElement | null>(null);
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);
  const [outputOverflow, setOutputOverflow] = useState(false);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const hasStructuredOutput = contactResults.length > 0 || !!resultContent;
  const isToolPanelExpanded = isOutputExpanded || searchResults.length > 0;
  const shouldShowOutputToggle =
    hasStructuredOutput && (contactResults.length > 0 || outputOverflow || !isRunning);
  const handleToggleOutput = useCallback(() => {
    if (!shouldShowOutputToggle) return;
    const nextExpanded = !isOutputExpanded;
    if (nextExpanded) {
      onToolExpand?.();
    }
    setIsOutputExpanded(value => !value);
  }, [isOutputExpanded, onToolExpand, shouldShowOutputToggle]);

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
        avatarUrl={avatarUrl}
        avatarLabel={avatarLabel}
        purpose={purpose}
        subagentLabel={subagentLabel}
        onHITLRespond={onHITLRespond}
        onOpenArtifact={onOpenArtifact}
        onToolExpand={onToolExpand}
      />
    );
  }

  return (
    <div className={styles.toolBlock}>
      <div
        className={classNames(styles.toolWrapper, {
          [styles.toolWrapperExpanded]: isToolPanelExpanded,
        })}
      >
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

          {shouldShowPurpose || shouldShowAssigneeAvatar ? (
            <>
              <span className={styles.toolUseDivider} aria-hidden="true" />
              {shouldShowAssigneeAvatar ? (
                <span className={styles.toolUseAssigneeAvatar} aria-hidden="true">
                  {renderToolAvatar(avatarUrl, avatarLabel)}
                </span>
              ) : null}
              {shouldShowPurpose ? (
                <span className={styles.toolUsePurpose} title={purpose}>
                  {purpose}
                </span>
              ) : null}
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
                <span className={styles.toolUseStatusText}>执行中</span>
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
                <span className={styles.toolUseStatusText}>执行完成</span>
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
                  onClick={() => {
                    onToolExpand?.();
                    setResultExpanded(true);
                  }}
                  aria-label="展开更多搜索结果"
                >
                  展开更多
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {hasStructuredOutput ? (
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
                {contactResults.length > 0 ? (
                  <div className={styles.toolUseContactList}>
                    {contactResults.map(item => (
                      <div key={item.id} className={styles.toolUseContactItem}>
                        <span
                          className={classNames(styles.toolUseContactAvatar, {
                            [styles.toolUseContactAvatarGroup]: item.typeLabel.includes("群"),
                          })}
                          aria-hidden="true"
                        >
                          {resolveContactAvatarLabel(item)}
                        </span>
                        <div className={styles.toolUseContactBody}>
                          <div className={styles.toolUseContactNameRow}>
                            <span className={styles.toolUseContactName}>{item.name}</span>
                            <span className={styles.toolUseContactType}>{item.typeLabel}</span>
                            {item.matchLabel ? (
                              <span className={styles.toolUseContactMatch}>{item.matchLabel}</span>
                            ) : null}
                          </div>
                          <div className={styles.toolUseContactMeta}>
                            {item.identityLabel} · 飞书 ID：{item.feishuId}
                          </div>
                          {item.note ? (
                            <div className={styles.toolUseContactNote}>{item.note}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {resultContent ? (
                  <div className={styles.toolUseOutputText}>{resultContent}</div>
                ) : null}
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
              onToolExpand={onToolExpand}
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
  avatarUrl,
  avatarLabel,
  purpose,
  subagentLabel,
  onHITLRespond,
  onOpenArtifact,
  onToolExpand,
}: {
  block: Block;
  data: ToolUseData;
  status: string;
  displayName: string;
  avatarUrl: string;
  avatarLabel: string;
  purpose: string;
  subagentLabel: string;
  onHITLRespond?: (payload: HITLRespondPayload) => void;
  onOpenArtifact?: (block: Block) => void;
  onToolExpand?: () => void;
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
        ? "执行完成"
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
          <span className={styles.toolUseAvatar} aria-hidden="true">
            {renderToolAvatar(avatarUrl, avatarLabel)}
          </span>
          <span className={styles.toolUseIcon} aria-hidden="true">
            <RobotOutlined />
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
                    onToolExpand={onToolExpand}
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

function ToolResultBlock({ block, onToolExpand }: { block: Block; onToolExpand?: () => void }) {
  const data = block.data as unknown as ToolResultData;
  const resultContent = typeof data.content === "string" ? data.content.trim() : "";
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const shouldShowToggle = hasOverflow || !block.isStreaming;

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
      <div
        className={classNames(styles.toolWrapper, {
          [styles.toolWrapperExpanded]: isExpanded,
        })}
      >
        <div className={styles.toolUseOutputSection}>
          {shouldShowToggle ? (
            <div className={styles.toolUseOutputActions}>
              <button
                type="button"
                className={classNames(styles.toolUseChevronBtn, {
                  [styles.toolUseChevronBtnExpanded]: isExpanded,
                })}
                onClick={() => {
                  const nextExpanded = !isExpanded;
                  if (nextExpanded) {
                    onToolExpand?.();
                  }
                  setIsExpanded(value => !value);
                }}
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
      const resp = await submitPrototypeFeedback({
        blockId: block.id,
        rating,
        comment: feedbackComment.trim() || undefined,
      });
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
