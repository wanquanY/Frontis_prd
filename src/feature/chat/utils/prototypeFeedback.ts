/**
 * 原型阶段的反馈提交入参。
 */
export interface PrototypeFeedbackPayload {
  blockId: string;
  rating: number;
  comment?: string;
}

/**
 * 提交原型反馈，当前使用本地成功桩模拟。
 */
export const submitPrototypeFeedback = async (
  _payload: PrototypeFeedbackPayload,
): Promise<{ success: boolean; error?: string }> => {
  await new Promise(resolve => {
    window.setTimeout(resolve, 240);
  });

  return { success: true };
};
