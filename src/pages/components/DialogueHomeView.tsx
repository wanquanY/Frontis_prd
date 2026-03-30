import type { AiCeoHomePromptItem } from "@/constants/aiCeoHome";

import styles from "../FrontisPage.module.less";

interface DialogueHomeViewProps {
  agentName: string;
  intro: string;
  promptItems: AiCeoHomePromptItem[];
  onPromptSend: (question: string) => void;
}

/**
 * 对话首页中部快捷问题面板。
 */
export const DialogueHomeView = ({
  agentName,
  intro,
  promptItems,
  onPromptSend,
}: DialogueHomeViewProps): JSX.Element => {
  return (
    <div className={styles.dialogueHomeStage}>
      <div className={styles.dialogueHomeInner}>
        <div className={styles.dialogueHomeIntro}>
          <h2 className={styles.dialogueHomeTitle}>{agentName}</h2>
          <p className={styles.dialogueHomeDescription}>{intro}</p>
        </div>

        <div className={styles.dialoguePromptGrid}>
          {promptItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={styles.dialoguePromptCard}
              onClick={() => onPromptSend(item.question)}
            >
              <span className={styles.dialoguePromptQuestion}>{item.question}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
