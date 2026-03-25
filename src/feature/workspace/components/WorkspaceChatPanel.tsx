import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type UIEventHandler,
} from "react";
import classNames from "classnames";
import { Spin } from "antd";
import dayjs from "dayjs";
import { XMarkdown } from "@ant-design/x-markdown";
import type { Block, TextData } from "@/types/block";
import type { WorkspaceChatPanelProps } from "@/feature/workspace/types";
import styles from "./WorkspaceChatPanel.module.less";
import { BlockItem } from "@/feature/chat/components/BlockItem";
import chatDefault from "@/assets/images/chat-default.svg";
import { ChevronDownIcon } from "@/utils/icons";

const DEFAULT_GREETING = "请告诉我您的需求或上传文件，马上开始为您工作。";
const BOTTOM_THRESHOLD = 32;
const HISTORY_STICK_DURATION = 1200;
const BOTTOM_RESTORE_STABLE_DELAY = 240;
const HISTORY_LOAD_TRIGGER_TOP = 16;

const getDistanceToBottom = (element: HTMLDivElement): number =>
  element.scrollHeight - element.scrollTop - element.clientHeight;

/**
 * WorkspaceChatPanel
 *
 * 工作空间右侧对话内容区（仅负责 UI 渲染，不处理业务逻辑）。
 */
export const WorkspaceChatPanel = ({
  blocks,
  focusBlockId,
  messages,
  actorAvatars,
  mentionableActorLabels,
  onDownloadArtifact,
  onAddArtifactToKnowledge,
  assistantAvatarUrl,
  assistantAvatarAlt,
  onHITLRespond,
  onOpenArtifact,
  onActorNameClick,
  greeting = DEFAULT_GREETING,
  workspaceSummary,
  currentSessionId,
  isNewSession,
  isStreaming,
  hasMoreHistory,
  isLoadingHistory,
  onLoadMoreHistory,
  hasPlanBanner = false,
  planBannerHeight = 0,
  isHistoryLoading = false,
  showMessageMeta = false,
  showStreamingPlaceholder = true,
}: WorkspaceChatPanelProps): JSX.Element => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const blockListRef = useRef<HTMLDivElement | null>(null);
  const blockRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [highlightBlockId, setHighlightBlockId] = useState<string | null>(null);
  const shouldScrollOnSessionChangeRef = useRef(false);
  const autoScrollingRef = useRef(false);
  const autoScrollReleaseRafRef = useRef<number | null>(null);
  const restoreBottomTimerRef = useRef<number | null>(null);
  const restoreBottomActiveRef = useRef(false);
  const maintainRestoreBottomRef = useRef<() => void>(() => undefined);
  const hasUserScrollInteractionRef = useRef(false);
  const userScrolledUpRef = useRef(false);
  const forceStickRef = useRef(true);
  const historyStickUntilRef = useRef(0);
  const handledFocusBlockIdRef = useRef<string>("");
  const historyLoadLockedRef = useRef(false);
  const historyPrependAnchorRef = useRef<{
    previousScrollHeight: number;
    previousScrollTop: number;
  } | null>(null);
  const normalizedSummary = workspaceSummary?.trim();
  const resolvedAssistantAvatarUrl = assistantAvatarUrl || chatDefault;
  const resolvedAssistantAvatarAlt = assistantAvatarAlt?.trim() || "智能体头像";
  const isUserBlock = useCallback((block: Block): boolean => {
    if (block.actorRole === "user") return true;
    const role = (block.data as { role?: string }).role;
    return role === "user";
  }, []);
  const visibleBlocks = useMemo(
    () =>
      blocks.filter(block => {
        if (
          block.kind === "text" &&
          !(block.data as { content?: string }).content &&
          !block.isStreaming
        )
          return false;
        if (block.kind === "message") {
          const hasChildren = block.children && block.children.length > 0;
          if (!hasChildren && !block.isStreaming) return false;
        }
        return true;
      }),
    [blocks],
  );

  const copyContextMap = useMemo(() => {
    const map: Record<string, { showCopy: boolean; copyText: string }> = {};
    let currentTexts: { id: string; text: string }[] = [];

    const flush = () => {
      if (!currentTexts.length) return;
      const combined = currentTexts
        .map(item => item.text)
        .filter(Boolean)
        .join("\n\n");
      const last = currentTexts[currentTexts.length - 1];
      map[last.id] = { showCopy: true, copyText: combined };
      currentTexts.slice(0, -1).forEach(item => {
        map[item.id] = { showCopy: false, copyText: combined };
      });
      currentTexts = [];
    };

    visibleBlocks.forEach(block => {
      if (isUserBlock(block)) {
        flush();
        return;
      }
      if (block.kind === "text") {
        const text = (block.data as unknown as TextData | undefined)?.content;
        currentTexts.push({ id: block.id, text: typeof text === "string" ? text : "" });
      }
    });
    flush();
    return map;
  }, [isUserBlock, visibleBlocks]);

  const clearRestoreBottomTimer = useCallback(() => {
    if (restoreBottomTimerRef.current) {
      window.clearTimeout(restoreBottomTimerRef.current);
      restoreBottomTimerRef.current = null;
    }
  }, []);

  const beginRestoreBottom = useCallback(() => {
    restoreBottomActiveRef.current = true;
    clearRestoreBottomTimer();
  }, [clearRestoreBottomTimer]);

  const scheduleRestoreBottomRelease = useCallback(() => {
    clearRestoreBottomTimer();
    restoreBottomTimerRef.current = window.setTimeout(() => {
      const el = scrollRef.current;
      if (!el || hasUserScrollInteractionRef.current || isStreaming) return;
      const nearBottom = getDistanceToBottom(el) < BOTTOM_THRESHOLD;
      if (!nearBottom) return;
      restoreBottomActiveRef.current = false;
      forceStickRef.current = false;
    }, BOTTOM_RESTORE_STABLE_DELAY);
  }, [clearRestoreBottomTimer, isStreaming]);

  const releaseAutoScrolling = useCallback(() => {
    if (autoScrollReleaseRafRef.current) {
      window.cancelAnimationFrame(autoScrollReleaseRafRef.current);
      autoScrollReleaseRafRef.current = null;
    }
    autoScrollReleaseRafRef.current = window.requestAnimationFrame(() => {
      autoScrollReleaseRafRef.current = window.requestAnimationFrame(() => {
        autoScrollingRef.current = false;
        autoScrollReleaseRafRef.current = null;
        const el = scrollRef.current;
        if (!el) return;
        const nearBottom = getDistanceToBottom(el) < BOTTOM_THRESHOLD;
        if (nearBottom) {
          userScrolledUpRef.current = false;
          setShowScrollToBottom(false);
        }
        if (restoreBottomActiveRef.current && !hasUserScrollInteractionRef.current) {
          maintainRestoreBottomRef.current();
        }
      });
    });
  }, []);

  const scrollToBottom = useCallback(
    (smooth: boolean = true) => {
      const el = scrollRef.current;
      if (!el) return;
      autoScrollingRef.current = true;
      const start = el.scrollTop;
      const end = el.scrollHeight;
      const distance = end - start;
      if (!smooth || distance < BOTTOM_THRESHOLD * 2) {
        el.scrollTop = end;
        releaseAutoScrolling();
        return;
      }
      if (distance <= 1) {
        releaseAutoScrolling();
        return;
      }
      const duration = 1000;
      const startTime = performance.now();

      const step = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        el.scrollTop = start + distance * eased;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          releaseAutoScrolling();
        }
      };

      requestAnimationFrame(step);
    },
    [releaseAutoScrolling],
  );

  const maintainRestoreBottom = useCallback(() => {
    if (!restoreBottomActiveRef.current || hasUserScrollInteractionRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = getDistanceToBottom(el) < BOTTOM_THRESHOLD;
    if (nearBottom) {
      scheduleRestoreBottomRelease();
      return;
    }
    clearRestoreBottomTimer();
    scrollToBottom(false);
  }, [clearRestoreBottomTimer, scheduleRestoreBottomRelease, scrollToBottom]);

  useEffect(() => {
    maintainRestoreBottomRef.current = maintainRestoreBottom;
  }, [maintainRestoreBottom]);

  // 从外部 deep-link（automation run）跳转进来时，聚焦到指定 block。
  useEffect(() => {
    const targetId = focusBlockId?.trim() || "";
    if (!targetId) return;
    if (handledFocusBlockIdRef.current === targetId) return;
    const container = scrollRef.current;
    const targetEl = blockRowRefs.current.get(targetId);
    if (!targetEl || !container) return;

    // 聚焦时把它视为“用户手动滚动”，避免自动吸底打断定位。
    userScrolledUpRef.current = true;
    forceStickRef.current = false;
    shouldScrollOnSessionChangeRef.current = false;
    setShowScrollToBottom(true);

    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const offsetTop = targetRect.top - containerRect.top;
    const desiredTop =
      container.scrollTop + offsetTop - container.clientHeight / 2 + targetEl.clientHeight / 2;
    const nextTop = Math.max(0, desiredTop);
    try {
      container.scrollTo({ top: nextTop, behavior: "smooth" });
    } catch {
      container.scrollTop = nextTop;
    }
    handledFocusBlockIdRef.current = targetId;
    setHighlightBlockId(targetId);
    const timer = window.setTimeout(() => {
      setHighlightBlockId(current => (current === targetId ? null : current));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [focusBlockId, visibleBlocks.length]);

  // 新会话切换时先同步重置滚动态，避免继承上一个会话的滚动交互状态。
  useLayoutEffect(() => {
    const targetId = focusBlockId?.trim() || "";
    historyLoadLockedRef.current = false;
    historyPrependAnchorRef.current = null;
    handledFocusBlockIdRef.current = "";
    setShowScrollToBottom(false);
    if (targetId) {
      shouldScrollOnSessionChangeRef.current = false;
      forceStickRef.current = false;
      historyStickUntilRef.current = 0;
      hasUserScrollInteractionRef.current = true;
      userScrolledUpRef.current = true;
      return;
    }
    shouldScrollOnSessionChangeRef.current = true;
    forceStickRef.current = true;
    historyStickUntilRef.current = performance.now() + HISTORY_STICK_DURATION;
    hasUserScrollInteractionRef.current = false;
    userScrolledUpRef.current = false;
    beginRestoreBottom();
  }, [beginRestoreBottom, currentSessionId, focusBlockId]);

  useLayoutEffect(() => {
    if (isLoadingHistory) return;
    const anchor = historyPrependAnchorRef.current;
    const container = scrollRef.current;
    if (!anchor || !container) return;

    const deltaHeight = container.scrollHeight - anchor.previousScrollHeight;
    container.scrollTop = Math.max(0, anchor.previousScrollTop + deltaHeight);
    historyPrependAnchorRef.current = null;
    historyLoadLockedRef.current = false;
  }, [blocks, isLoadingHistory]);

  useEffect(() => {
    const targetId = focusBlockId?.trim() || "";
    if (targetId || isHistoryLoading) return;
    if (visibleBlocks.length === 0) return;
    if (userScrolledUpRef.current) return;

    historyStickUntilRef.current = performance.now() + HISTORY_STICK_DURATION;
    forceStickRef.current = true;
    beginRestoreBottom();

    const rafId = window.requestAnimationFrame(() => {
      scrollToBottom(false);
    });

    const timer = window.setTimeout(() => {
      if (!isStreaming && !restoreBottomActiveRef.current) {
        forceStickRef.current = false;
      }
    }, HISTORY_STICK_DURATION);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timer);
    };
  }, [
    beginRestoreBottom,
    focusBlockId,
    isHistoryLoading,
    isStreaming,
    scrollToBottom,
    visibleBlocks.length,
  ]);

  useEffect(() => {
    if (userScrolledUpRef.current) return;
    const shouldKeepBottom =
      shouldScrollOnSessionChangeRef.current ||
      forceStickRef.current ||
      isStreaming ||
      performance.now() < historyStickUntilRef.current;
    if (!shouldKeepBottom) return;
    const el = scrollRef.current;
    if (!el) return;
    const raf = window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        setShowScrollToBottom(false);
        scrollToBottom(false);
        if (!isHistoryLoading) {
          shouldScrollOnSessionChangeRef.current = false;
        }
      }, 0);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [blocks, isHistoryLoading, isStreaming, scrollToBottom]);

  useEffect(() => {
    const container = scrollRef.current;
    const blockList = blockListRef.current;
    const targetId = focusBlockId?.trim() || "";
    if (!container || !blockList) return;
    if (targetId) return;
    if (userScrolledUpRef.current) return;
    if (visibleBlocks.length === 0 || isHistoryLoading) return;

    const shouldKeepBottom =
      shouldScrollOnSessionChangeRef.current ||
      forceStickRef.current ||
      isStreaming ||
      performance.now() < historyStickUntilRef.current;
    if (!shouldKeepBottom) return;

    let rafId = 0;
    const syncToBottom = () => {
      if (userScrolledUpRef.current) return;
      rafId = window.requestAnimationFrame(() => {
        if (restoreBottomActiveRef.current && !hasUserScrollInteractionRef.current) {
          maintainRestoreBottom();
        } else {
          scrollToBottom(false);
        }
      });
    };

    syncToBottom();

    if (typeof ResizeObserver === "undefined") {
      return () => {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
        }
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      syncToBottom();
    });
    resizeObserver.observe(blockList);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [
    focusBlockId,
    isHistoryLoading,
    isStreaming,
    maintainRestoreBottom,
    scrollToBottom,
    visibleBlocks.length,
  ]);

  const hasBlocks = visibleBlocks.length > 0;
  const hasMessages = messages.length > 0;
  const shouldShowSummary = !!normalizedSummary && !!isNewSession && !hasBlocks;
  const shouldShowWelcome =
    !hasBlocks && !hasMessages && (!isNewSession || !normalizedSummary) && !currentSessionId;
  const scrollPaddingBottom = hasPlanBanner ? Math.max(planBannerHeight, 0) : 0;
  const scrollStyle = hasPlanBanner
    ? ({ paddingBottom: scrollPaddingBottom } as CSSProperties)
    : undefined;

  const renderedBlocks = useMemo(() => {
    const collectNestedBlockIds = (block: Block): string[] => {
      const ids: string[] = [];
      const visit = (node: Block) => {
        if (node.id) {
          ids.push(node.id);
        }
        (node.children || []).forEach(child => visit(child));
      };
      visit(block);
      return ids;
    };

    const setBlockRowRef = (block: Block) => (el: HTMLDivElement | null) => {
      const nestedIds = collectNestedBlockIds(block);
      nestedIds.forEach(blockId => {
        if (!blockId) return;
        if (!el) {
          blockRowRefs.current.delete(blockId);
          return;
        }
        blockRowRefs.current.set(blockId, el);
      });
    };

    const resolveActorInfo = (block: Block): { icon?: string; name?: string } | undefined => {
      if (block.actorId && actorAvatars?.[block.actorId]) {
        return actorAvatars[block.actorId];
      }
      if (block.actorName && actorAvatars?.[block.actorName]) {
        return actorAvatars[block.actorName];
      }
      return undefined;
    };

    const resolveActorName = (block: Block, isUser: boolean): string => {
      const actorInfo = resolveActorInfo(block);
      if (actorInfo?.name) {
        return actorInfo.name;
      }
      if (block.actorName?.trim()) {
        return block.actorName.trim();
      }
      return isUser ? "我" : "智能体";
    };

    const resolveActorMentionLabel = (block: Block): string | undefined => {
      const actorId = block.actorId?.trim();
      if (actorId && mentionableActorLabels?.[actorId]) {
        return mentionableActorLabels[actorId];
      }
      const actorName = block.actorName?.trim();
      if (actorName && mentionableActorLabels?.[actorName]) {
        return mentionableActorLabels[actorName];
      }
      return undefined;
    };

    const resolveBlockTime = (block: Block): string => {
      if (typeof block.timestamp !== "number" || !Number.isFinite(block.timestamp)) {
        return "";
      }
      return dayjs(block.timestamp).format("HH:mm");
    };

    const resolveAutomationLabel = (block: Block): string => {
      const actorMeta =
        block.actorMeta && typeof block.actorMeta === "object"
          ? (block.actorMeta as Record<string, unknown>)
          : null;
      const automation =
        actorMeta?.automation && typeof actorMeta.automation === "object"
          ? (actorMeta.automation as Record<string, unknown>)
          : null;
      if (!automation) return "";
      const title = String(automation.title || automation.task_title || "").trim();
      return title ? `定时任务 · ${title}` : "定时任务";
    };

    const resolveAvatar = (block: Block) => {
      const info = resolveActorInfo(block);
      if (info) {
        return {
          src: info.icon || resolvedAssistantAvatarUrl,
          alt: info.name || resolvedAssistantAvatarAlt,
        };
      }
      return { src: resolvedAssistantAvatarUrl, alt: resolvedAssistantAvatarAlt };
    };

    const renderActorNameMeta = (
      actorName: string,
      actorMentionLabel: string | undefined,
      isClickable: boolean,
      blockTime: string,
      automationLabel?: string,
    ): JSX.Element => (
      <>
        {isClickable ? (
          <button
            type="button"
            className={classNames(
              styles.messageMetaName,
              styles.messageMetaNameButton,
              styles.messageMetaNameClickable,
            )}
            onClick={() => {
              if (!actorMentionLabel) return;
              onActorNameClick?.(actorMentionLabel);
            }}
            aria-label={`在输入框中提及 ${actorName}`}
          >
            {actorName}
          </button>
        ) : (
          <span className={styles.messageMetaName}>{actorName}</span>
        )}
        {blockTime ? <span className={styles.messageMetaTime}>{blockTime}</span> : null}
        {automationLabel ? (
          <span className={styles.messageMetaAutomation}>{automationLabel}</span>
        ) : null}
      </>
    );

    return visibleBlocks.map((block, index) => {
      const isUser = isUserBlock(block);
      const prevBlock = index > 0 ? visibleBlocks[index - 1] : undefined;
      const prevIsUser = prevBlock ? isUserBlock(prevBlock) : false;
      const hasInvocationBoundary = !!prevBlock?.invocationId || !!block.invocationId;
      const isPrevSameActor =
        !!prevBlock &&
        prevIsUser === isUser &&
        prevBlock.actorRole === block.actorRole &&
        prevBlock.actorId === block.actorId &&
        prevBlock.actorName === block.actorName &&
        (!hasInvocationBoundary || prevBlock.invocationId === block.invocationId);
      const shouldShowActorMeta = !prevBlock || !isPrevSameActor;
      const actorName = resolveActorName(block, isUser);
      const actorMentionLabel = resolveActorMentionLabel(block);
      const isClickableActorName = Boolean(onActorNameClick && actorMentionLabel);
      const blockTime = resolveBlockTime(block);
      const automationLabel = resolveAutomationLabel(block);

      if (isUser) {
        return (
          <div
            key={block.id}
            ref={setBlockRowRef(block)}
            className={classNames(styles.userBlockRow, {
              [styles.focusedRow]: highlightBlockId === block.id,
            })}
            aria-label="用户消息"
          >
            {showMessageMeta && shouldShowActorMeta ? (
              <div className={classNames(styles.messageMeta, styles.userMessageMeta)}>
                {renderActorNameMeta(actorName, actorMentionLabel, isClickableActorName, blockTime)}
              </div>
            ) : null}
            <BlockItem
              block={block}
              onHITLRespond={onHITLRespond}
              onOpenArtifact={onOpenArtifact}
              onDownloadArtifact={onDownloadArtifact}
              onAddArtifactToKnowledge={onAddArtifactToKnowledge}
            />
          </div>
        );
      }

      const shouldShowAvatar = !prevBlock || prevIsUser || !isPrevSameActor;
      const avatar = resolveAvatar(block);
      const hitlChild = block.children?.find(
        child =>
          child.kind === "hitl" || child.kind === "ask_user" || child.kind === "hitl_request",
      );
      const data = block.data;
      const lowerClass = !hitlChild && data.name !== "plan";

      return (
        <div
          key={block.id}
          ref={setBlockRowRef(block)}
          className={classNames(styles.assistantBlockRow, {
            [styles.toolBlockLower]: lowerClass,
            [styles.focusedRow]: highlightBlockId === block.id,
          })}
          aria-label="智能体消息"
        >
          <div className={styles.assistantBlockAvatarSlot} aria-hidden={!shouldShowAvatar}>
            {shouldShowAvatar ? (
              <img src={avatar.src} alt={avatar.alt} className={styles.assistantBlockAvatar} />
            ) : (
              <span className={styles.assistantBlockAvatarPlaceholder} aria-hidden={true} />
            )}
          </div>
          <div className={styles.assistantBlockContent}>
            {showMessageMeta && shouldShowActorMeta ? (
              <div className={styles.messageMeta}>
                {renderActorNameMeta(
                  actorName,
                  actorMentionLabel,
                  isClickableActorName,
                  blockTime,
                  automationLabel,
                )}
              </div>
            ) : null}
            <BlockItem
              block={block}
              onHITLRespond={onHITLRespond}
              onOpenArtifact={onOpenArtifact}
              onDownloadArtifact={onDownloadArtifact}
              onAddArtifactToKnowledge={onAddArtifactToKnowledge}
              copyContext={copyContextMap[block.id]}
            />
          </div>
        </div>
      );
    });
  }, [
    isUserBlock,
    onHITLRespond,
    onOpenArtifact,
    onDownloadArtifact,
    onAddArtifactToKnowledge,
    actorAvatars,
    copyContextMap,
    highlightBlockId,
    mentionableActorLabels,
    onActorNameClick,
    resolvedAssistantAvatarAlt,
    resolvedAssistantAvatarUrl,
    showMessageMeta,
    visibleBlocks,
  ]);

  const showAssistantLoading = useMemo(() => {
    if (!showStreamingPlaceholder) return false;
    if (!isStreaming) return false;
    // 需要至少有一条用户消息，避免在首条用户消息尚未出现时展示 loading
    const lastUserIdx = [...visibleBlocks]
      .map((b, idx) => ({ b, idx }))
      .reverse()
      .find(({ b }) => isUserBlock(b))?.idx;
    if (lastUserIdx === undefined) return false;

    // 一旦有任何助手块出现，就移除 loading（不再等待 apply 事件）
    const hasAssistantAfterUser = visibleBlocks
      .slice(lastUserIdx + 1)
      .some(block => !isUserBlock(block));

    return !hasAssistantAfterUser;
  }, [isStreaming, isUserBlock, showStreamingPlaceholder, visibleBlocks]);

  // 流式开始：开启吸底并滚到底；流式结束：取消吸底
  useEffect(() => {
    if (isStreaming) {
      forceStickRef.current = true;
      userScrolledUpRef.current = false;
      beginRestoreBottom();
      scrollToBottom(true);
    } else if (!restoreBottomActiveRef.current) {
      forceStickRef.current = false;
    }
  }, [beginRestoreBottom, isStreaming, scrollToBottom]);

  const handleScroll: UIEventHandler<HTMLDivElement> = useCallback(
    event => {
      if (autoScrollingRef.current) {
        return;
      }
      if (restoreBottomActiveRef.current && !hasUserScrollInteractionRef.current) {
        maintainRestoreBottom();
        return;
      }
      const withinHistoryStickWindow = performance.now() < historyStickUntilRef.current;
      if (
        withinHistoryStickWindow &&
        (shouldScrollOnSessionChangeRef.current || forceStickRef.current)
      ) {
        return;
      }
      if (!hasUserScrollInteractionRef.current) {
        return;
      }
      const el = event.currentTarget;
      const nearBottom = getDistanceToBottom(el) < BOTTOM_THRESHOLD;
      setShowScrollToBottom(!nearBottom);
      userScrolledUpRef.current = !nearBottom;

      if (el.scrollTop > HISTORY_LOAD_TRIGGER_TOP) {
        historyLoadLockedRef.current = false;
      }

      if (!onLoadMoreHistory || !hasMoreHistory || isLoadingHistory) return;
      if (el.scrollTop > HISTORY_LOAD_TRIGGER_TOP || historyLoadLockedRef.current) return;

      historyLoadLockedRef.current = true;
      historyPrependAnchorRef.current = {
        previousScrollHeight: el.scrollHeight,
        previousScrollTop: el.scrollTop,
      };
      onLoadMoreHistory();
    },
    [hasMoreHistory, isLoadingHistory, maintainRestoreBottom, onLoadMoreHistory],
  );

  useEffect(() => {
    return () => {
      clearRestoreBottomTimer();
      if (autoScrollReleaseRafRef.current) {
        window.cancelAnimationFrame(autoScrollReleaseRafRef.current);
      }
    };
  }, [clearRestoreBottomTimer]);

  const handleUserScrollIntent = useCallback(() => {
    hasUserScrollInteractionRef.current = true;
  }, []);

  return (
    <div className={styles.wrapper} aria-label="对话内容区">
      {isHistoryLoading ? (
        <div className={styles.loadingOverlay} aria-live="polite">
          <Spin spinning tip="正在加载历史对话…" size="large">
            <div className={styles.loadingOverlayPlaceholder} />
          </Spin>
        </div>
      ) : null}

      {showScrollToBottom ? (
        <button
          type="button"
          className={styles.scrollToBottom}
          onClick={() => {
            setShowScrollToBottom(false);
            scrollToBottom(true);
          }}
          aria-label="回到底部"
        >
          <ChevronDownIcon className={styles.scrollToBottomIcon} />
        </button>
      ) : null}

      {hasBlocks ? (
        <div
          className={styles.scroll}
          ref={scrollRef}
          onScroll={handleScroll}
          onWheelCapture={handleUserScrollIntent}
          onTouchStartCapture={handleUserScrollIntent}
          onMouseDownCapture={handleUserScrollIntent}
          style={scrollStyle}
        >
          <div className={styles.blockList} ref={blockListRef}>
            {renderedBlocks}
            {showAssistantLoading ? (
              <div className={styles.loadingRow}>
                <div className={styles.loadingDots} aria-label="生成中">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {shouldShowSummary ? (
        <div className={styles.summaryRow} aria-label="工作空间摘要">
          <img
            src={resolvedAssistantAvatarUrl}
            alt={resolvedAssistantAvatarAlt}
            className={styles.summaryAvatar}
          />
          <div className={styles.summaryCard}>
            <div className={styles.summaryTitle}>本工作空间概览</div>
            <XMarkdown className={styles.summaryMarkdown} content={normalizedSummary} />
          </div>
        </div>
      ) : null}
      {shouldShowWelcome ? (
        <div className={styles.defaultRow} aria-label="助理欢迎语">
          <img
            src={resolvedAssistantAvatarUrl}
            alt={resolvedAssistantAvatarAlt}
            className={styles.defaultAvatar}
          />
          <div className={styles.defaultText}>{greeting}</div>
        </div>
      ) : null}
    </div>
  );
};
