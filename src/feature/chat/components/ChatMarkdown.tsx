import { memo, useMemo } from "react";
import classNames from "classnames";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { normalizeMarkdownTables } from "@/feature/chat/utils/markdown";
import styles from "./ChatMarkdown.module.less";

export interface ChatMarkdownProps {
  source: string;
  className?: string;
}

/**
 * ChatMarkdown
 *
 * 统一处理聊天消息中的 Markdown 渲染：
 * - 复用项目现有 MarkdownRenderer，保持与产物预览一致
 * - 兼容历史消息里被压平的 Markdown 表格
 */
export const ChatMarkdown = memo(function ChatMarkdown({
  source,
  className,
}: ChatMarkdownProps): JSX.Element {
  const normalizedSource = useMemo(() => normalizeMarkdownTables(source), [source]);

  return (
    <div className={classNames(styles.chatMarkdown, className)}>
      <MarkdownRenderer source={normalizedSource} className={styles.markdownContent} />
    </div>
  );
});
