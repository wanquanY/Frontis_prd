import { useCallback, useState, type JSX } from "react";

import classNames from "classnames";
import { Input, Popover, Rate, message } from "antd";

import { submitPrototypeFeedback } from "@/feature/chat/utils/prototypeFeedback";

import styles from "./BlockItem.module.less";

interface AssistantFeedbackActionProps {
  blockId: string;
}

/**
 * AI 回复反馈入口，支持星级评分和补充意见。
 */
export const AssistantFeedbackAction = ({
  blockId,
}: AssistantFeedbackActionProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>("");

  const handleOpenChange = useCallback(
    (nextOpen: boolean): void => {
      if (submitted) {
        return;
      }

      setIsOpen(nextOpen);
    },
    [submitted],
  );

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (submitting || submitted || rating === 0) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await submitPrototypeFeedback({
        blockId,
        rating,
        comment: feedbackComment.trim() || undefined,
      });

      if (response.success) {
        setSubmitted(true);
        setIsOpen(false);
        message.success("反馈提交成功");
        return;
      }

      message.error(response.error || "反馈提交失败");
    } catch {
      message.error("反馈提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }, [blockId, feedbackComment, rating, submitted, submitting]);

  const feedbackPanel = (
    <div className={styles.messageFeedbackPanel}>
      <div className={styles.messageFeedbackTitle}>反馈此条回复</div>
      <div className={styles.messageFeedbackHint}>请给这条 AI 专家回复打分，最多 5 分。</div>
      <div className={styles.messageFeedbackRating}>
        <Rate count={5} value={rating} onChange={setRating} disabled={submitting} />
        <span className={styles.messageFeedbackRatingText}>
          {rating > 0 ? `${rating} 分` : "请选择评分"}
        </span>
      </div>
      <Input.TextArea
        rows={3}
        value={feedbackComment}
        disabled={submitting}
        placeholder="可选：补充具体反馈意见"
        className={styles.messageFeedbackTextarea}
        onChange={event => setFeedbackComment(event.target.value)}
      />
      <div className={styles.messageFeedbackFooter}>
        <button
          type="button"
          className={styles.messageFeedbackSubmitButton}
          disabled={submitting || rating === 0}
          onClick={() => void handleSubmit()}
        >
          {submitting ? "提交中..." : "提交反馈"}
        </button>
      </div>
    </div>
  );

  return (
    <Popover
      trigger="click"
      placement="bottom"
      open={submitted ? false : isOpen}
      content={feedbackPanel}
      onOpenChange={handleOpenChange}
    >
      <button
        type="button"
        className={classNames(
          styles.messageFeedbackTrigger,
          submitted && styles.messageFeedbackTriggerSubmitted,
        )}
        disabled={submitted}
      >
        {submitted ? "已反馈" : "反馈"}
      </button>
    </Popover>
  );
};
