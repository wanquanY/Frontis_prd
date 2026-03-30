/* eslint-disable jsx-a11y/no-static-element-interactions */
import classNames from "classnames";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type UIEvent,
} from "react";
import { Input, Select } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import type { WorkspaceComposerProps } from "@/feature/workspace/types";
import { MENTION_DISPLAY_REGEX } from "@/utils/mention";
import { formatFileSize } from "@/utils/file";
import { resolveFileLogo } from "@/utils/fileLogo";
import { PlanBanner } from "@/components/PlanBanner";
import styles from "./WorkspaceComposer.module.less";
import stopIcon from "@/assets/images/stop-circle.png";
import closeIconImg from "@/assets/images/close-icon.png";
import turnLeftIcon from "@/assets/images/turn-left.png";
import turnRightIcon from "@/assets/images/turn-right.png";
import { SendBtnIcon, SendBtnIconDisabled } from "@/utils/icons";
import attachmentIcon from "@/assets/images/toolsIcon/attachment-icon.png";
import uploadFailedIcon from "@/assets/images/upload-failed-icon.png";

interface MentionMatchState {
  query: string;
  rangeStart: number;
  rangeEnd: number;
}

interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

interface MentionTokenRange {
  start: number;
  end: number;
  deleteEnd: number;
}

const normalizeMentionSearchValue = (value: string): string => value.trim().toLowerCase();

const resolveMentionOptionToken = (
  option: NonNullable<WorkspaceComposerProps["mentionOptions"]>[number],
): string => option.mentionLabel?.trim() || option.label.trim();

const resolveMentionAvatarText = (label: string): string => {
  const normalizedLabel = label.trim();
  if (!normalizedLabel) return "@";
  return Array.from(normalizedLabel).slice(0, 2).join("");
};

const buildMentionLookup = (
  mentionOptions: WorkspaceComposerProps["mentionOptions"],
): Set<string> =>
  new Set(
    (mentionOptions || [])
      .flatMap(option => [resolveMentionOptionToken(option), option.label, option.alias, option.id])
      .filter((item): item is string => Boolean(item && item.trim()))
      .map(item => normalizeMentionSearchValue(item)),
  );

const buildHighlightSegments = (
  value: string,
  mentionOptions: WorkspaceComposerProps["mentionOptions"],
): HighlightSegment[] => {
  if (!value) return [];
  const mentionLookup = buildMentionLookup(mentionOptions);
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const matched of value.matchAll(MENTION_DISPLAY_REGEX)) {
    const prefix = matched[1] || "";
    const rawToken = matched[2] || "";
    const matchedIndex = matched.index ?? -1;
    if (matchedIndex < 0) continue;
    const tokenStart = matchedIndex + prefix.length;
    const tokenEnd = tokenStart + rawToken.length + 1;

    if (cursor < tokenStart) {
      segments.push({
        text: value.slice(cursor, tokenStart),
        highlighted: false,
      });
    }

    const tokenText = value.slice(tokenStart, tokenEnd);
    segments.push({
      text: tokenText,
      highlighted: mentionLookup.has(normalizeMentionSearchValue(rawToken)),
    });
    cursor = tokenEnd;
  }

  if (cursor < value.length) {
    segments.push({
      text: value.slice(cursor),
      highlighted: false,
    });
  }

  return segments;
};

const resolveMentionTokenRanges = (
  value: string,
  mentionOptions: WorkspaceComposerProps["mentionOptions"],
): MentionTokenRange[] => {
  if (!value) return [];
  const mentionLookup = buildMentionLookup(mentionOptions);
  const tokenRanges: MentionTokenRange[] = [];

  for (const matched of value.matchAll(MENTION_DISPLAY_REGEX)) {
    const prefix = matched[1] || "";
    const rawToken = matched[2] || "";
    const matchedIndex = matched.index ?? -1;
    if (matchedIndex < 0) continue;
    if (!mentionLookup.has(normalizeMentionSearchValue(rawToken))) continue;
    const start = matchedIndex + prefix.length;
    const end = start + rawToken.length + 1;
    const deleteEnd = value[end] === " " ? end + 1 : end;
    tokenRanges.push({
      start,
      end,
      deleteEnd,
    });
  }

  return tokenRanges;
};

const resolveMentionDeleteRange = (
  value: string,
  cursorPosition: number,
  deleteKey: "Backspace" | "Delete",
  mentionOptions: WorkspaceComposerProps["mentionOptions"],
): MentionTokenRange | undefined => {
  const tokenRanges = resolveMentionTokenRanges(value, mentionOptions);
  if (tokenRanges.length === 0) return undefined;
  if (deleteKey === "Backspace") {
    return tokenRanges.find(
      token => cursorPosition > token.start && cursorPosition <= token.deleteEnd,
    );
  }
  return tokenRanges.find(
    token => cursorPosition >= token.start && cursorPosition < token.deleteEnd,
  );
};

const resolveMentionMatchState = (
  value: string,
  cursorPosition: number,
): MentionMatchState | undefined => {
  if (cursorPosition < 0) return undefined;
  const beforeCursor = value.slice(0, cursorPosition);
  const matched = /(^|[\s\n])@([^\s@，。！？、,:：;；()（）【】<>《》]*)$/.exec(beforeCursor);
  if (!matched) return undefined;
  const query = matched[2] || "";
  const rangeStart = beforeCursor.length - query.length - 1;
  return {
    query,
    rangeStart: Math.max(rangeStart, 0),
    rangeEnd: cursorPosition,
  };
};

/**
 * WorkspaceComposer
 *
 * 底部输入框（Figma：node-id=9409:17549 底部输入区）。
 */
export const WorkspaceComposer = ({
  value,
  rootClassName,
  placeholder,
  mentionPrefix,
  mentionOptions = [],
  focusKey,
  planBanner,
  attachments = [],
  onRemoveAttachment,
  allowAttachmentOnlySend = false,
  footerExtra,
  disabled = false,
  sending = false,
  reconnecting = false,
  showModelSelector = true,
  sendDisabled = false,
  selectedModelId,
  modelOptions,
  onValueChange,
  onKeyDown,
  onAttach,
  onAttachmentsSelected,
  onSelectModel,
  onSend,
  onAbort,
  onPlanBannerHeightChange,
  isChatPage = false,
}: WorkspaceComposerProps): JSX.Element => {
  const isEditorDisabled = (disabled || reconnecting) && !sending;
  const hasContent = value.trim().length > 0;
  const hasCompletedAttachments = attachments.some(item => item.status === "done");
  const hasSendableContent = hasContent || (allowAttachmentOnlySend && hasCompletedAttachments);
  const hasPlanBanner = Boolean(planBanner);
  const attachmentLimit = 10;
  const hasUploadingAttachments = attachments.some(item => item.status === "uploading");
  const isSendDisabled =
    sendDisabled ||
    reconnecting ||
    hasUploadingAttachments ||
    (!sending && (disabled || !hasSendableContent));
  const textareaRef = useRef<TextAreaRef | null>(null);
  const mentionRef = useRef<HTMLSpanElement | null>(null);
  const planBannerRef = useRef<HTMLDivElement | null>(null);
  const pendingMentionCursorRef = useRef<number | null>(null);
  const [mentionOffset, setMentionOffset] = useState(0);
  const [textareaScrollTop, setTextareaScrollTop] = useState(0);
  const [mentionMatchState, setMentionMatchState] = useState<MentionMatchState>();
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  const updatePlanBannerHeight = useCallback(() => {
    if (!planBannerRef.current || !onPlanBannerHeightChange) return;
    const nextHeight = Math.ceil(planBannerRef.current.getBoundingClientRect().height);
    onPlanBannerHeightChange(nextHeight);
  }, [onPlanBannerHeightChange]);

  const focusEditor = useCallback(() => {
    const textareaEl = textareaRef.current?.resizableTextArea?.textArea;
    if (!textareaEl || textareaEl.disabled) return;
    textareaEl.focus({ preventScroll: true });
    const length = textareaEl.value.length;
    textareaEl.setSelectionRange(length, length);
  }, []);

  const [stableMentionPrefix, setStableMentionPrefix] = useState<string | undefined>(mentionPrefix);

  useEffect(() => {
    setStableMentionPrefix(mentionPrefix);
  }, [mentionPrefix]);

  const updateMentionState = useCallback(
    (nextValue: string, cursorPosition?: number | null): void => {
      if (mentionOptions.length === 0) {
        setMentionMatchState(undefined);
        setActiveMentionIndex(0);
        return;
      }
      const resolvedCursorPosition =
        typeof cursorPosition === "number" && Number.isFinite(cursorPosition)
          ? cursorPosition
          : (textareaRef.current?.resizableTextArea?.textArea?.selectionStart ?? nextValue.length);
      const nextState = resolveMentionMatchState(nextValue, resolvedCursorPosition);
      setMentionMatchState(nextState);
      setActiveMentionIndex(0);
    },
    [mentionOptions.length],
  );

  const filteredMentionOptions = useMemo(() => {
    if (!mentionMatchState) return [];
    const normalizedQuery = normalizeMentionSearchValue(mentionMatchState.query);
    return mentionOptions.filter(option => {
      if (!normalizedQuery) return true;
      const candidates = [resolveMentionOptionToken(option), option.label, option.alias, option.id]
        .filter((item): item is string => Boolean(item && item.trim()))
        .map(item => normalizeMentionSearchValue(item));
      return candidates.some(item => item.includes(normalizedQuery));
    });
  }, [mentionMatchState, mentionOptions]);

  const isMentionMenuOpen =
    !isEditorDisabled && Boolean(mentionMatchState) && filteredMentionOptions.length > 0;
  const highlightedSegments = useMemo(
    () => buildHighlightSegments(value, mentionOptions),
    [mentionOptions, value],
  );
  const shouldUseHighlightLayer = mentionOptions.length > 0;

  useEffect(() => {
    if (!isMentionMenuOpen) {
      setActiveMentionIndex(0);
      return;
    }
    setActiveMentionIndex(currentIndex =>
      Math.min(currentIndex, Math.max(filteredMentionOptions.length - 1, 0)),
    );
  }, [filteredMentionOptions.length, isMentionMenuOpen]);

  const applyMentionOption = useCallback(
    (optionIndex: number): void => {
      if (!mentionMatchState) return;
      const selectedOption = filteredMentionOptions[optionIndex];
      if (!selectedOption) return;
      const mentionToken = resolveMentionOptionToken(selectedOption);
      const nextValue = `${value.slice(0, mentionMatchState.rangeStart)}@${mentionToken} ${value.slice(mentionMatchState.rangeEnd)}`;
      const nextCursorPosition = mentionMatchState.rangeStart + mentionToken.length + 2;
      onValueChange(nextValue);
      setMentionMatchState(undefined);
      setActiveMentionIndex(0);
      pendingMentionCursorRef.current = nextCursorPosition;
      window.requestAnimationFrame(() => {
        const textareaEl = textareaRef.current?.resizableTextArea?.textArea;
        if (!textareaEl || textareaEl.disabled) return;
        textareaEl.focus({ preventScroll: true });
        textareaEl.setSelectionRange(nextCursorPosition, nextCursorPosition);
      });
    },
    [filteredMentionOptions, mentionMatchState, onValueChange, value],
  );

  useLayoutEffect(() => {
    if (!mentionRef.current) {
      setMentionOffset(0);
      return;
    }
    const width = mentionRef.current.offsetWidth;
    setMentionOffset(width > 0 ? width + 8 : 0);
  }, [stableMentionPrefix]);

  useLayoutEffect(() => {
    if (!onPlanBannerHeightChange) return;
    if (!hasPlanBanner) {
      onPlanBannerHeightChange(0);
      return;
    }
    updatePlanBannerHeight();
    if (typeof ResizeObserver === "undefined" || !planBannerRef.current) return;
    const resizeObserver = new ResizeObserver(() => updatePlanBannerHeight());
    resizeObserver.observe(planBannerRef.current);
    return () => resizeObserver.disconnect();
  }, [hasPlanBanner, onPlanBannerHeightChange, updatePlanBannerHeight]);

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (isEditorDisabled) return;
    const nextValue = event.target.value;
    onValueChange(nextValue);
    updateMentionState(nextValue, event.target.selectionStart);
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isEditorDisabled) {
      event.preventDefault();
      return;
    }
    if (isMentionMenuOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveMentionIndex(currentIndex =>
          currentIndex >= filteredMentionOptions.length - 1 ? 0 : currentIndex + 1,
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveMentionIndex(currentIndex =>
          currentIndex <= 0 ? filteredMentionOptions.length - 1 : currentIndex - 1,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        applyMentionOption(activeMentionIndex);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMentionMatchState(undefined);
        setActiveMentionIndex(0);
        return;
      }
    }
    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      event.currentTarget.selectionStart === event.currentTarget.selectionEnd
    ) {
      const cursorPosition = event.currentTarget.selectionStart ?? 0;
      const mentionDeleteRange = resolveMentionDeleteRange(
        value,
        cursorPosition,
        event.key,
        mentionOptions,
      );
      if (mentionDeleteRange) {
        event.preventDefault();
        const nextValue = `${value.slice(0, mentionDeleteRange.start)}${value.slice(mentionDeleteRange.deleteEnd)}`;
        const nextCursorPosition = mentionDeleteRange.start;
        onValueChange(nextValue);
        pendingMentionCursorRef.current = nextCursorPosition;
        setMentionMatchState(undefined);
        setActiveMentionIndex(0);
        window.requestAnimationFrame(() => {
          const textareaEl = textareaRef.current?.resizableTextArea?.textArea;
          if (!textareaEl || textareaEl.disabled) return;
          textareaEl.focus({ preventScroll: true });
          textareaEl.setSelectionRange(nextCursorPosition, nextCursorPosition);
        });
        return;
      }
    }
    if (sending && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onAbort?.();
      return;
    }
    onKeyDown?.(event);
  };

  const handleTextareaScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    setTextareaScrollTop(event.currentTarget.scrollTop);
  };

  const handleTextareaBlur = useCallback(() => {
    setMentionMatchState(undefined);
    setActiveMentionIndex(0);
  }, []);

  const handleTextareaSelect = useCallback(() => {
    updateMentionState(value);
  }, [updateMentionState, value]);

  const handleTextareaPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (isEditorDisabled) return;
    const files = event.clipboardData?.files;
    if (files && files.length > 0 && onAttachmentsSelected) {
      event.preventDefault();
      onAttachmentsSelected(files);
    }
  };

  useEffect(() => {
    if (isEditorDisabled) return;
    focusEditor();
  }, [focusEditor, isEditorDisabled, sending, focusKey]);

  useEffect(() => {
    if (pendingMentionCursorRef.current !== null) {
      pendingMentionCursorRef.current = null;
      return;
    }
    updateMentionState(value);
  }, [updateMentionState, value]);

  const attachmentListRef = useRef<HTMLDivElement | null>(null);
  const [attachmentScrollState, setAttachmentScrollState] = useState({
    canLeft: false,
    canRight: false,
  });

  const visibleAttachments = attachments.slice(0, attachmentLimit);

  const updateAttachmentScrollState = useCallback(() => {
    const el = attachmentListRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    setAttachmentScrollState({
      canLeft: scrollLeft > 0,
      canRight: scrollLeft < maxScroll - 1,
    });
  }, []);

  useEffect(() => {
    updateAttachmentScrollState();
  }, [updateAttachmentScrollState, visibleAttachments.length, value]);

  useEffect(() => {
    const el = attachmentListRef.current;
    if (!el) return;
    const handler = () => updateAttachmentScrollState();
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, [updateAttachmentScrollState]);

  const handleModelChange = (value: number) => {
    onSelectModel?.(value);
  };

  const handleComposerMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (isEditorDisabled) return;
    const target = event.target as HTMLElement | null;
    const textareaEl = textareaRef.current?.resizableTextArea?.textArea;
    if (target?.closest(`.${styles.modelWrap}`)) return;
    if (target?.closest(".ant-select-dropdown")) return;
    if (textareaEl && target && textareaEl.contains(target)) {
      // 让浏览器原生处理光标定位，不强制移到末尾
      return;
    }
    // 点击组件任意空白/区域都强制聚焦编辑框
    focusEditor();
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isEditorDisabled) return;
    const target = event.target as HTMLElement | null;
    const textareaEl = textareaRef.current?.resizableTextArea?.textArea;
    if (textareaEl && target && textareaEl.contains(target)) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      focusEditor();
    }
  };

  const handleSendClick = () => {
    focusEditor();
    if (sending) {
      onAbort?.();
      return;
    }
    if (!isSendDisabled) {
      onSend?.();
    }
  };

  const sendButtonClassName = [
    styles.sendButton,
    reconnecting
      ? styles.sendButtonReconnecting
      : sending
        ? styles.sendButtonStop
        : hasSendableContent && !disabled && !hasUploadingAttachments
          ? styles.sendButtonActive
          : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isEditorDisabled || !onAttachmentsSelected) return;
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (isEditorDisabled || !onAttachmentsSelected) return;
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    onAttachmentsSelected(files);
  };

  const hasModelOptions = Array.isArray(modelOptions) && modelOptions.length > 0;
  const selectValue =
    hasModelOptions && modelOptions.some(option => option.id === selectedModelId)
      ? selectedModelId
      : undefined;
  const isModelLoading = !hasModelOptions;

  return (
    <div className={classNames(styles.composer, rootClassName)} aria-label="输入区">
      {planBanner ? (
        <div className={styles.planBanner} ref={planBannerRef}>
          <PlanBanner
            title={planBanner.title}
            status={planBanner.status}
            spec={planBanner.spec}
            items={planBanner.items}
            collapsed={planBanner.collapsed}
            onToggleCollapse={planBanner.onToggleCollapse}
          />
        </div>
      ) : null}
      <div
        className={classNames(styles.box, {
          [styles.boxChatPage]: isChatPage,
        })}
        role="button"
        tabIndex={isEditorDisabled ? -1 : 0}
        onClick={handleComposerMouseDown}
        onKeyDown={handleComposerKeyDown}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {visibleAttachments.length > 0 ? (
          <div className={styles.attachmentListWrapper}>
            {attachmentScrollState.canLeft ? (
              <img
                src={turnLeftIcon}
                alt="向左滑动附件"
                className={classNames(styles.attachmentScrollBtn, styles.attachmentScrollLeft)}
                onClick={() => {
                  const el = attachmentListRef.current;
                  if (!el) return;
                  el.scrollTo({ left: 0, behavior: "smooth" });
                }}
              />
            ) : null}

            <div
              className={classNames(styles.attachmentList, {
                [styles.attachmentMaskLeft]: attachmentScrollState.canLeft,
                [styles.attachmentMaskRight]: attachmentScrollState.canRight,
              })}
              aria-label="已上传附件"
              role="list"
              ref={attachmentListRef}
            >
              {visibleAttachments.map(item => {
                const isImage = item.mimeType.startsWith("image/");
                const fileLogo = resolveFileLogo(item.name);
                const meta =
                  item.status === "uploading"
                    ? `上传中 ${Math.round(item.percent)}%`
                    : item.status === "error"
                      ? "上传失败"
                      : formatFileSize(item.size);

                if (isImage) {
                  const thumbSrc = item.url;

                  return (
                    <div
                      key={item.uid}
                      className={styles.attachmentThumb}
                      data-status={item.status}
                      role="listitem"
                      aria-label={item.name}
                      title={item.name}
                    >
                      {thumbSrc ? (
                        <img
                          className={styles.attachmentThumbImage}
                          src={thumbSrc}
                          alt={item.name}
                        />
                      ) : null}

                      {item.status === "uploading" ? (
                        <span className={styles.attachmentThumbOverlay} aria-hidden={true}>
                          <span className={styles.attachmentSpinner} />
                        </span>
                      ) : item.status === "error" ? (
                        <span className={styles.attachmentThumbOverlay} aria-hidden={true}>
                          <img
                            className={styles.attachmentErrorIcon}
                            src={uploadFailedIcon}
                            alt="上传失败"
                          />
                          <span className={styles.attachmentErrorText}>上传失败</span>
                        </span>
                      ) : null}

                      {item.status !== "uploading" ? (
                        <img
                          src={closeIconImg}
                          alt="移除附件"
                          className={styles.attachmentRemoveIconImg}
                          onClick={() => {
                            if (isEditorDisabled) return;
                            onRemoveAttachment?.(item.uid);
                          }}
                        />
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div
                    key={item.uid}
                    className={styles.attachmentItem}
                    data-status={item.status}
                    role="listitem"
                    aria-label={item.name}
                    title={item.name}
                  >
                    <span className={styles.attachmentIcon} aria-hidden={true}>
                      <img
                        className={styles.attachmentIconImage}
                        src={fileLogo.src}
                        alt={fileLogo.alt}
                      />
                      {item.status === "uploading" ? (
                        <span className={styles.attachmentIconOverlay} aria-hidden={true}>
                          <span className={styles.attachmentSpinner} />
                        </span>
                      ) : null}
                    </span>

                    <span className={styles.attachmentInfo}>
                      <span className={styles.attachmentName} title={item.name}>
                        {item.name}
                      </span>
                      <span className={styles.attachmentMeta} title={item.error}>
                        {meta}
                      </span>
                    </span>

                    {item.status !== "uploading" ? (
                      <img
                        src={closeIconImg}
                        alt="移除附件"
                        className={styles.attachmentRemoveIconImg}
                        onClick={() => {
                          if (isEditorDisabled) return;
                          onRemoveAttachment?.(item.uid);
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {attachmentScrollState.canRight ? (
              <img
                src={turnRightIcon}
                alt="向右滑动附件"
                className={classNames(styles.attachmentScrollBtn, styles.attachmentScrollRight)}
                onClick={() => {
                  const el = attachmentListRef.current;
                  if (!el) return;
                  el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
                }}
              />
            ) : null}
          </div>
        ) : null}

        <div
          className={classNames(styles.textarea, {
            [styles.textareaChatPage]: isChatPage,
          })}
          aria-label="输入内容"
          aria-disabled={isEditorDisabled}
        >
          <div
            className={styles.textareaInner}
            style={
              {
                "--mention-offset": `${Math.max(mentionOffset, 0)}px`,
                "--textarea-scroll-top": `${textareaScrollTop}px`,
              } as CSSProperties
            }
          >
            {stableMentionPrefix ? (
              <span ref={mentionRef} className={styles.textareaMention} aria-hidden>
                {stableMentionPrefix}
              </span>
            ) : null}
            {shouldUseHighlightLayer ? (
              <div className={styles.textareaHighlight} aria-hidden>
                {highlightedSegments.map(segment => (
                  <span
                    key={`${segment.text}-${segment.highlighted ? "highlight" : "plain"}`}
                    className={
                      segment.highlighted
                        ? styles.textareaHighlightMention
                        : styles.textareaHighlightPlain
                    }
                  >
                    {segment.text}
                  </span>
                ))}
              </div>
            ) : null}
            <Input.TextArea
              ref={node => {
                textareaRef.current = node;
              }}
              className={styles.textareaInput}
              value={value}
              placeholder={placeholder}
              disabled={isEditorDisabled}
              autoSize={{ minRows: 2, maxRows: 7 }}
              aria-label={placeholder}
              onChange={handleTextareaChange}
              onKeyDown={handleTextareaKeyDown}
              onBlur={handleTextareaBlur}
              onPaste={handleTextareaPaste}
              onScroll={handleTextareaScroll}
              onSelect={handleTextareaSelect}
              styles={{
                textarea: {
                  border: "none",
                  boxShadow: "none",
                  padding: 0,
                  textIndent: "var(--mention-offset, 0px)",
                  resize: "none",
                  background: "transparent",
                  fontSize: "16px",
                  lineHeight: "24px",
                  color: shouldUseHighlightLayer ? "transparent" : "var(--text)",
                  caretColor: "var(--text)",
                  borderRadius: 0,
                },
              }}
            />
            {isMentionMenuOpen ? (
              <div className={styles.mentionMenu} role="listbox" aria-label="AI 员工候选列表">
                {filteredMentionOptions.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    className={classNames(styles.mentionOption, {
                      [styles.mentionOptionActive]: index === activeMentionIndex,
                    })}
                    role="option"
                    aria-selected={index === activeMentionIndex}
                    onMouseDown={event => {
                      event.preventDefault();
                      applyMentionOption(index);
                    }}
                  >
                    <span className={styles.mentionOptionAvatar}>
                      {option.avatarUrl ? (
                        <img
                          src={option.avatarUrl}
                          alt={option.label}
                          className={styles.mentionOptionAvatarImage}
                        />
                      ) : (
                        <span className={styles.mentionOptionAvatarFallback}>
                          {resolveMentionAvatarText(option.label)}
                        </span>
                      )}
                    </span>
                    <span className={styles.mentionOptionMain}>
                      <span className={styles.mentionOptionLabel}>{option.label}</span>
                      {option.mentionLabel && option.mentionLabel !== option.label ? (
                        <span className={styles.mentionOptionMeta}>@{option.mentionLabel}</span>
                      ) : null}
                      {option.kind === "ai" ? (
                        <span className={styles.mentionOptionTag}>AI 员工</span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.left}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => {
                if (isEditorDisabled || attachments.length >= attachmentLimit) return;
                onAttach?.();
              }}
              aria-label="添加附件"
              disabled={isEditorDisabled || attachments.length >= attachmentLimit}
            >
              <img src={attachmentIcon} className={styles.attachIcon} alt="上传附件" />
            </button>

            {showModelSelector ? (
              <div className={styles.modelWrap}>
                <Select
                  className={styles.modelSelect}
                  value={selectValue}
                  options={modelOptions.map(option => ({
                    value: option.id,
                    label: option.label,
                  }))}
                  onChange={handleModelChange}
                  disabled={isEditorDisabled}
                  loading={isModelLoading}
                  placeholder={isModelLoading ? "模型加载中…" : "选择模型"}
                  notFoundContent={isModelLoading ? "模型加载中…" : undefined}
                  aria-label="选择模型"
                />
              </div>
            ) : null}
          </div>

          {footerExtra ? <div className={styles.footerExtra}>{footerExtra}</div> : null}

          <button
            type="button"
            className={sendButtonClassName}
            onClick={handleSendClick}
            disabled={isSendDisabled}
            aria-label={reconnecting ? "重连中" : sending ? "停止发送" : "发送"}
          >
            {reconnecting ? (
              <span className={styles.reconnectingIcon}>重连中...</span>
            ) : sending ? (
              <span className={styles.stopIcon}>
                <img src={stopIcon} alt="停止" />
              </span>
            ) : !isSendDisabled ? (
              <SendBtnIcon className={styles.iconMuted} />
            ) : (
              <SendBtnIconDisabled className={styles.iconMuted} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
