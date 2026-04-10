import { useMemo } from "react";
import type { AiCeoHomeCaseItem, AiCeoHomePromptItem } from "@/constants/aiCeoHome";
import styles from "../FrontisPage.module.less";

interface DialogueHomeViewProps {
  caseItems?: AiCeoHomeCaseItem[];
  promptItems: AiCeoHomePromptItem[];
  onCaseSelect: (item: AiCeoHomeCaseItem) => void;
  onPromptSend: (question: string) => void;
}

const FALLBACK_CASE_LIMIT = 3;

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

/**
 * 对话首页输入框下方的推荐问题与最佳实践区域。
 */
export const DialogueHomeView = ({
  caseItems,
  promptItems,
  onCaseSelect,
  onPromptSend,
}: DialogueHomeViewProps): JSX.Element => {
  const resolvedCaseItems = useMemo(
    () =>
      caseItems && caseItems.length > 0
        ? caseItems
        : buildFallbackCaseItems(promptItems),
    [caseItems, promptItems],
  );

  return (
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
              onClick={() => onCaseSelect(item)}
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
  );
};
