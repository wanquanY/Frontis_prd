import { ReloadOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Modal } from "antd";
import classNames from "classnames";
import { WorkspaceChatPanel } from "@/feature/workspace/components/WorkspaceChatPanel";
import type {
  AiCeoHomeCaseItem,
  AiCeoHomePromptItem,
  AiCeoHomeReplayMessage,
} from "@/constants/aiCeoHome";
import { buildDialogueScenarioReplay } from "@/pages/dialogueScenarioSimulation";
import type { DialogueGeneratedResultItem, ChatMessage } from "@/pages/types";
import { buildWorkspaceChatBlocks, buildWorkspaceChatMessages } from "@/pages/utils";

import { DialogueResultPanel } from "./DialogueResultPanel";
import styles from "../FrontisPage.module.less";

interface DialogueHomeViewProps {
  activeEmployeeAvatarUrl?: string;
  activeEmployeeId: string;
  activeEmployeeName: string;
  caseItems?: AiCeoHomeCaseItem[];
  promptItems: AiCeoHomePromptItem[];
  onPromptSend: (question: string) => void;
}

const buildReplayLiveDialogueResults = (
  sessionId: string,
  frame: {
    panel?: DialogueGeneratedResultItem["panel"];
    results?: DialogueGeneratedResultItem[];
  },
): DialogueGeneratedResultItem[] => {
  if (frame.results?.length) {
    return frame.results;
  }

  if (!frame.panel || frame.panel.kind !== "dispatchExecution") {
    return [];
  }

  return [
    {
      id: `${sessionId}-${frame.panel.id}-live`,
      title: frame.panel.title,
      subtitle: frame.panel.subtitle,
      createdAt: "刚刚",
      badge: frame.panel.skillName,
      panel: frame.panel,
    },
  ];
};

const FALLBACK_CASE_LIMIT = 3;
const REPLAY_MODAL_BODY_STYLE: CSSProperties = {
  height: 780,
  padding: 20,
  overflow: "hidden",
};

const buildFallbackCaseItems = (
  promptItems: AiCeoHomePromptItem[],
): AiCeoHomeCaseItem[] =>
  promptItems.slice(0, FALLBACK_CASE_LIMIT).map((item, index) => ({
    id: `fallback-case-${index + 1}`,
    scene: "最佳实践",
    title: item.question,
    summary: "点击查看这类问题从发起到 Agent 回复的演示记录。",
    messages: [
      {
        id: `${item.id}-user`,
        role: "user",
        actor: "你",
        content: item.question,
        delayMs: 260,
      },
      {
        id: `${item.id}-system`,
        role: "system",
        actor: "系统",
        content: "Agent 正在理解任务并准备回复。",
        delayMs: 480,
      },
      {
        id: `${item.id}-assistant`,
        role: "assistant",
        actor: "Agent",
        content: "我已经生成一版结果，你可以继续追问，或者让我继续执行下一步。",
        delayMs: 820,
      },
    ],
  }));

const getReplayMessageClassName = (
  message: AiCeoHomeReplayMessage,
): { bubbleClassName?: string; rowClassName: string } => {
  if (message.role === "user") {
    return {
      bubbleClassName: styles.dialogueReplayBubbleUser,
      rowClassName: styles.dialogueReplayRowUser,
    };
  }

  if (message.role === "assistant") {
    return {
      bubbleClassName: styles.dialogueReplayBubbleAssistant,
      rowClassName: styles.dialogueReplayRowAssistant,
    };
  }

  return {
    rowClassName: "",
  };
};

/**
 * 对话首页输入框下方的推荐问题与最佳实践区域。
 */
export const DialogueHomeView = ({
  activeEmployeeAvatarUrl,
  activeEmployeeId,
  activeEmployeeName,
  caseItems,
  promptItems,
  onPromptSend,
}: DialogueHomeViewProps): JSX.Element => {
  const replayTimerRefs = useRef<number[]>([]);
  const [activeCase, setActiveCase] = useState<AiCeoHomeCaseItem | null>(null);
  const [visibleReplayCount, setVisibleReplayCount] = useState<number>(0);
  const [replayVersion, setReplayVersion] = useState<number>(0);
  const [replayMessages, setReplayMessages] = useState<ChatMessage[]>([]);
  const [replayResults, setReplayResults] = useState<DialogueGeneratedResultItem[]>([]);
  const [replayActiveResultId, setReplayActiveResultId] = useState<string | null>(null);
  const [isReplayResultVisible, setIsReplayResultVisible] = useState<boolean>(false);
  const [isReplayStreaming, setIsReplayStreaming] = useState<boolean>(false);
  const resolvedCaseItems = useMemo(
    () =>
      caseItems && caseItems.length > 0
        ? caseItems
        : buildFallbackCaseItems(promptItems),
    [caseItems, promptItems],
  );
  const replaySessionId = useMemo(
    () => (activeCase ? `dialogue-home-replay-${activeCase.id}-${replayVersion}` : ""),
    [activeCase, replayVersion],
  );
  const activeScenarioReplay = useMemo(
    () =>
      activeCase?.replayScenarioQuestion
        ? buildDialogueScenarioReplay(
            activeEmployeeId,
            activeCase.replayScenarioQuestion,
            replaySessionId,
          )
        : null,
    [activeCase, activeEmployeeId, replaySessionId],
  );
  const visibleReplayMessages = useMemo(
    () => (activeCase ? activeCase.messages.slice(0, visibleReplayCount) : []),
    [activeCase, visibleReplayCount],
  );
  const isScenarioReplay = activeScenarioReplay !== null;
  const isReplayPlaying = isScenarioReplay
    ? isReplayStreaming
    : activeCase !== null && visibleReplayCount < activeCase.messages.length;
  const replayChatMessages = useMemo(
    () => buildWorkspaceChatMessages(replayMessages),
    [replayMessages],
  );
  const replayChatBlocks = useMemo(
    () => buildWorkspaceChatBlocks(replayMessages),
    [replayMessages],
  );
  const replayActorAvatars = useMemo(
    () => ({
      [activeEmployeeId]: {
        icon: activeEmployeeAvatarUrl,
        name: activeEmployeeName,
      },
      [activeEmployeeName]: {
        icon: activeEmployeeAvatarUrl,
        name: activeEmployeeName,
      },
    }),
    [activeEmployeeAvatarUrl, activeEmployeeId, activeEmployeeName],
  );

  const clearReplayTimers = useCallback((): void => {
    replayTimerRefs.current.forEach(timerId => window.clearTimeout(timerId));
    replayTimerRefs.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearReplayTimers();
    };
  }, [clearReplayTimers]);

  useEffect(() => {
    if (!activeCase) {
      clearReplayTimers();
      setVisibleReplayCount(0);
      setReplayMessages([]);
      setReplayResults([]);
      setReplayActiveResultId(null);
      setIsReplayResultVisible(false);
      setIsReplayStreaming(false);
      return;
    }

    clearReplayTimers();
    setVisibleReplayCount(0);
    setReplayMessages([]);
    setReplayResults([]);
    setReplayActiveResultId(null);
    setIsReplayResultVisible(false);
    setIsReplayStreaming(false);

    if (activeScenarioReplay && replaySessionId) {
      let accumulatedDelay = 120;
      const totalRounds = activeScenarioReplay.rounds.length;

      setIsReplayStreaming(true);

      activeScenarioReplay.rounds.forEach((round, roundIndex) => {
        const userMessageId = `${replaySessionId}-user-${roundIndex + 1}`;
        const assistantMessageId = `${replaySessionId}-assistant-${roundIndex + 1}`;
        const userMessage: ChatMessage = {
          id: userMessageId,
          role: "user",
          author: "你",
          content: round.question,
          timeLabel: round.updatedAt,
        };

        accumulatedDelay += roundIndex === 0 ? 120 : 320;
        const userTimerId = window.setTimeout(() => {
          setReplayMessages(prev =>
            prev.some(item => item.id === userMessageId) ? prev : [...prev, userMessage],
          );
        }, accumulatedDelay);
        replayTimerRefs.current.push(userTimerId);

        round.frames.forEach((frame, frameIndex) => {
          accumulatedDelay += frame.delayMs;
          const isLastFrame =
            roundIndex === totalRounds - 1 && frameIndex === round.frames.length - 1;
          const frameTimerId = window.setTimeout(() => {
            setReplayMessages(prev => {
              const assistantMessage: ChatMessage = {
                id: assistantMessageId,
                role: "assistant",
                author: round.agentName,
                content: frame.preview,
                timeLabel: round.updatedAt,
                blocks: frame.blocks,
                followupSuggestions: frame.followupSuggestions,
              };

              const hasUserMessage = prev.some(item => item.id === userMessageId);
              const hasAssistantMessage = prev.some(item => item.id === assistantMessageId);

              if (hasAssistantMessage) {
                return prev.map(item => (item.id === assistantMessageId ? assistantMessage : item));
              }

              return hasUserMessage
                ? [...prev, assistantMessage]
                : [...prev, userMessage, assistantMessage];
            });

            const nextResults = buildReplayLiveDialogueResults(replaySessionId, frame);
            if (nextResults.length) {
              setReplayResults(nextResults);
              setReplayActiveResultId(nextResults[0]?.id ?? null);
              setIsReplayResultVisible(true);
            }

            if (isLastFrame) {
              setIsReplayStreaming(false);
            }
          }, accumulatedDelay);

          replayTimerRefs.current.push(frameTimerId);
        });
      });

      return () => {
        clearReplayTimers();
      };
    }

    let accumulatedDelay = 120;

    activeCase.messages.forEach((message, index) => {
      accumulatedDelay += message.delayMs ?? 720;
      const timerId = window.setTimeout(() => {
        setVisibleReplayCount(index + 1);
      }, accumulatedDelay);
      replayTimerRefs.current.push(timerId);
    });

    return () => {
      clearReplayTimers();
    };
  }, [activeCase, activeScenarioReplay, clearReplayTimers, replaySessionId]);

  return (
    <>
      <div className={styles.dialogueHomeLower}>
        <div className={styles.dialoguePromptRail}>
          {promptItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={styles.dialoguePromptChip}
              onClick={() => onPromptSend(item.question)}
            >
              <span className={styles.dialoguePromptQuestion}>{item.question}</span>
            </button>
          ))}
        </div>

        <section className={styles.dialoguePracticeSection}>
          <div className={styles.dialoguePracticeHeader}>
            <div className={styles.dialoguePracticeTitle}>最佳实践</div>
          </div>
          <div className={styles.dialogueCaseRail}>
            {resolvedCaseItems.map(item => (
              <button
                key={item.id}
                type="button"
                className={styles.dialogueCaseShowcaseCard}
                onClick={() => {
                  setActiveCase(item);
                  setReplayVersion(current => current + 1);
                }}
              >
                <div className={styles.dialogueCaseShowcasePreview}>
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className={styles.dialogueCaseShowcaseImage}
                    />
                  ) : null}
                  <div className={styles.dialogueCaseShowcaseOverlay} />
                  <div className={styles.dialogueCaseShowcaseTitle}>{item.title}</div>
                </div>
                <div className={styles.dialogueCaseShowcaseMetaWrap}>
                  <div className={styles.dialogueCaseShowcaseMeta}>{item.summary}</div>
                  <div className={styles.dialogueCaseShowcaseMetaTooltip}>{item.summary}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(activeCase)}
        title={null}
        footer={null}
        centered={true}
        width={1320}
        styles={{ body: REPLAY_MODAL_BODY_STYLE }}
        destroyOnClose={true}
        onCancel={() => setActiveCase(null)}
      >
        {activeCase ? (
          <div className={styles.dialogueReplayModalBody}>
            <div className={styles.dialogueReplayHeader}>
              <div className={styles.dialogueReplayHeaderMain}>
                <div className={styles.dialogueReplayStatus}>
                  <span className={styles.dialogueReplayStatusBadge}>{activeCase.scene}</span>
                  <span className={styles.dialogueReplayStatusText}>
                    {isReplayPlaying ? "正在回放" : "回放完成"}
                  </span>
                </div>
                <h3 className={styles.dialogueReplayTitle}>{activeCase.title}</h3>
                <p className={styles.dialogueReplaySummary}>{activeCase.summary}</p>
              </div>
              <button
                type="button"
                className={styles.dialogueReplayReplayButton}
                onClick={() => setReplayVersion(current => current + 1)}
              >
                <ReloadOutlined />
                <span>重新播放</span>
              </button>
            </div>

            {isScenarioReplay ? (
              <div
                className={classNames(styles.dialogueReplaySceneShell, {
                  [styles.dialogueReplaySceneShellSplit]: isReplayResultVisible,
                })}
              >
                <div className={classNames(styles.dialogueReplaySceneChat, styles.chatPanelBody)}>
                  <WorkspaceChatPanel
                    blocks={replayChatBlocks}
                    messages={replayChatMessages}
                    actorAvatars={replayActorAvatars}
                    currentSessionId={replaySessionId}
                    isStreaming={isReplayStreaming}
                    assistantAvatarUrl={activeEmployeeAvatarUrl}
                    assistantAvatarAlt={activeEmployeeName}
                    greeting="输入消息或上传文件，开始协作"
                    onOpenResult={resultId => {
                      setReplayActiveResultId(resultId);
                      setIsReplayResultVisible(true);
                    }}
                  />
                </div>

                {isReplayResultVisible ? (
                  <aside className={styles.dialogueReplayScenePanel}>
                    <DialogueResultPanel
                      results={replayResults}
                      activeResultId={replayActiveResultId}
                      onSelectResult={resultId => {
                        setReplayActiveResultId(resultId);
                        setIsReplayResultVisible(true);
                      }}
                      onBackToGrid={() => setReplayActiveResultId(null)}
                      onClose={() => setIsReplayResultVisible(false)}
                    />
                  </aside>
                ) : null}
              </div>
            ) : (
              <div className={styles.dialogueReplaySurface}>
                <div className={styles.dialogueReplayMessages}>
                  {visibleReplayMessages.map(message => {
                    const replayMessageClasses = getReplayMessageClassName(message);

                    if (message.role === "system") {
                      return (
                        <div key={message.id} className={styles.dialogueReplaySystemNotice}>
                          {message.content}
                        </div>
                      );
                    }

                    return (
                      <div key={message.id} className={replayMessageClasses.rowClassName}>
                        <div className={styles.dialogueReplayMeta}>{message.actor}</div>
                        <div
                          className={classNames(
                            styles.dialogueReplayBubble,
                            replayMessageClasses.bubbleClassName,
                          )}
                        >
                          {message.content}
                        </div>
                      </div>
                    );
                  })}

                  {isReplayPlaying ? (
                    <div className={styles.dialogueReplayTyping}>
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
};
