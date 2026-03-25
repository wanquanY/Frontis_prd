import { httpClient } from "@/utils/http";

export interface FeedbackParams {
  tool_id: number;
  message_id: string;
  rating?: number;
  correct_answer?: string;
  human_comment?: string;
}

export interface FeedbackRequest {
  feedback_type: string;
  params: FeedbackParams;
}

export interface FeedbackResponseData {
  feedback_type: string;
  success: boolean;
  data?: {
    message_id: string;
    feedback_at: string;
  };
  error?: string;
}

export function submitFeedback(data: FeedbackRequest) {
  return httpClient.post<FeedbackResponseData>("/api/v1/feedback", data);
}
