import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  FdeAddOpportunityCommentPayload,
  FdeCreateOpportunityPayload,
  FdeOpportunityItem,
  FdeTeamMemberItem,
} from "@/feature/fde/types";

import { buildId, canManageTeamMembers } from "./fdeWorkbenchStateUtils";

/**
 * 商机状态管理 hook 入参。
 */
export interface UseFdeOpportunityStateParams {
  activeMemberId: string;
  activeRole: FdeTeamMemberItem["role"];
  initialOpportunities: FdeOpportunityItem[];
}

/**
 * 商机状态管理 hook 返回值。
 */
export interface UseFdeOpportunityStateResult {
  opportunities: FdeOpportunityItem[];
  filteredOpportunities: FdeOpportunityItem[];
  selectedOpportunityId: string;
  setSelectedOpportunityId: (opportunityId: string) => void;
  assignOpportunity: (opportunityId: string, memberId: string | null) => void;
  createOpportunity: (payload: FdeCreateOpportunityPayload) => void;
  updateOpportunityStatus: (
    opportunityId: string,
    status: FdeOpportunityItem["status"],
  ) => void;
  addOpportunityComment: (payload: FdeAddOpportunityCommentPayload) => void;
}

/**
 * 管理 FDE 商机列表、筛选结果和评论动作。
 */
export const useFdeOpportunityState = ({
  activeMemberId,
  activeRole,
  initialOpportunities,
}: UseFdeOpportunityStateParams): UseFdeOpportunityStateResult => {
  const [opportunities, setOpportunities] = useState<FdeOpportunityItem[]>(initialOpportunities);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>(
    initialOpportunities[0]?.id ?? "",
  );

  const filteredOpportunities = useMemo<FdeOpportunityItem[]>(
    () => {
      if (canManageTeamMembers(activeRole)) {
        return opportunities;
      }

      return opportunities.filter(item => item.ownerId === activeMemberId);
    },
    [activeMemberId, activeRole, opportunities],
  );

  useEffect(() => {
    if (!filteredOpportunities.length) {
      if (selectedOpportunityId) {
        setSelectedOpportunityId("");
      }
      return;
    }

    if (!filteredOpportunities.some(item => item.id === selectedOpportunityId)) {
      setSelectedOpportunityId(filteredOpportunities[0].id);
    }
  }, [filteredOpportunities, selectedOpportunityId]);

  const assignOpportunity = useCallback((opportunityId: string, memberId: string | null): void => {
    setOpportunities(previous =>
      previous.map(item =>
        item.id === opportunityId
          ? {
              ...item,
              ownerId: memberId,
            }
          : item,
      ),
    );
  }, []);

  const createOpportunity = useCallback(
    (payload: FdeCreateOpportunityPayload): void => {
      const createdAt = new Date().toLocaleString("zh-CN", { hour12: false });
      const normalizedInterestedAgents = payload.interestedAgents
        .map(item => item.trim())
        .filter(Boolean);
      const nextOpportunity: FdeOpportunityItem = {
        id: buildId("opp"),
        companyName: payload.companyName.trim(),
        scenarioName: payload.scenarioName.trim(),
        industry: payload.industry.trim(),
        stage: "初步沟通",
        status: "未开始",
        amountWan: payload.amountWan,
        winRate: 35,
        ownerId: canManageTeamMembers(activeRole)
          ? payload.ownerId ?? null
          : activeMemberId,
        source: "FDE手动创建",
        summary: payload.requirementSummary.trim(),
        requirementInfo: {
          sourceEntryLabel: payload.sourceEntryLabel.trim() || "FDE 手动录入",
          submittedAt: createdAt,
          submitterName: payload.submitterName.trim(),
          submitterPhone: payload.submitterPhone.trim(),
          interestedAgents: normalizedInterestedAgents,
          requirementSummary: payload.requirementSummary.trim(),
          requirementDetail: payload.requirementDetail.trim(),
        },
        comments: [],
      };

      setOpportunities(previous => [nextOpportunity, ...previous]);
      setSelectedOpportunityId(nextOpportunity.id);
    },
    [activeMemberId, activeRole],
  );

  const updateOpportunityStatus = useCallback(
    (opportunityId: string, status: FdeOpportunityItem["status"]): void => {
      setOpportunities(previous =>
        previous.map(item =>
          item.id === opportunityId
            ? {
                ...item,
                status,
                stage: status === "已成单" ? "已成交" : item.stage,
              }
            : item,
        ),
      );
    },
    [],
  );

  const addOpportunityComment = useCallback(
    ({ content, opportunityId, replyToCommentId }: FdeAddOpportunityCommentPayload): void => {
      const normalizedContent = content.trim();

      if (!normalizedContent) {
        return;
      }

      const createdAt = new Date().toLocaleString("zh-CN", { hour12: false });

      setOpportunities(previous =>
        previous.map(item => {
          if (item.id !== opportunityId) {
            return item;
          }

          const replyTarget = replyToCommentId
            ? item.comments.find(comment => comment.id === replyToCommentId)
            : undefined;

          return {
            ...item,
            comments: [
              ...item.comments,
              {
                id: buildId("opp-comment"),
                authorId: activeMemberId,
                content: normalizedContent,
                createdAt,
                replyToCommentId,
                replyToAuthorId: replyTarget?.authorId,
              },
            ],
          };
        }),
      );
    },
    [activeMemberId],
  );

  return {
    opportunities,
    filteredOpportunities,
    selectedOpportunityId,
    setSelectedOpportunityId,
    assignOpportunity,
    createOpportunity,
    updateOpportunityStatus,
    addOpportunityComment,
  };
};
