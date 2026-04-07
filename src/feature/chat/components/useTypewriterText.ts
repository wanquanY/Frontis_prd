import { useEffect, useRef, useState } from "react";

const STREAMING_TEXT_BATCH_SIZE = 3;
const STREAMING_TEXT_STEP_MS = 28;

/**
 * 为流式文本提供打字机显示效果。
 */
export const useTypewriterText = (content: string, isStreaming: boolean): string => {
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
