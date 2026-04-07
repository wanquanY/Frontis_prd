import { useEffect, useState } from "react";

import { Think } from "@ant-design/x";

import type { Block, TextData } from "@/types/block";

import { ChatMarkdown } from "./ChatMarkdown";
import { MarkdownErrorBoundary } from "./MarkdownErrorBoundary";
import { useTypewriterText } from "./useTypewriterText";
import styles from "./BlockItem.module.less";
import thinkIcon from "@/assets/images/think-icon.png";

const normalizeThinkingContent = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/^\s*Reasoning:\s*/i, "");
};

/**
 * 思考过程块组件属性。
 */
export interface ThinkingBlockProps {
  block: Block;
}

/**
 * 渲染 AI 思考过程折叠块。
 */
export const ThinkingBlock = ({ block }: ThinkingBlockProps) => {
  const data = block.data as unknown as TextData;
  const content = normalizeThinkingContent(data.content);
  const isStreaming = block.isStreaming || data.status === "streaming";
  const displayContent = useTypewriterText(content, isStreaming);
  const isComplete = !isStreaming || data.status === "completed";
  const [expanded, setExpanded] = useState(!isComplete);

  useEffect(() => {
    setExpanded(!isComplete);
  }, [isComplete]);

  if (!content && !block.isStreaming) {
    return null;
  }

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
};
