import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  FdeAddOpportunityCommentPayload,
  FdeCreateOpportunityPayload,
  FdeOpportunityAssignmentPayload,
  FdeOpportunityItem,
  FdeTeamGroupItem,
  FdeTeamMemberItem,
} from "@/feature/fde/types";
import { buildFdeOpportunitySummary } from "@/feature/fde/utils";

import { buildId, canManageTeamMembers } from "./fdeWorkbenchStateUtils";

/**
 * 商机状态管理 hook 入参。
 */
export interface UseFdeOpportunityStateParams {
  activeMemberId: string;
  activeMemberGroupId?: string;
  activeMemberName: string;
  activeRole: FdeTeamMemberItem["role"];
  initialOpportunities: FdeOpportunityItem[];
  teamGroups: FdeTeamGroupItem[];
  teamMembers: FdeTeamMemberItem[];
}

/**
 * 商机状态管理 hook 返回值。
 */
export interface UseFdeOpportunityStateResult {
  opportunities: FdeOpportunityItem[];
  filteredOpportunities: FdeOpportunityItem[];
  selectedOpportunityId: string;
  setSelectedOpportunityId: (opportunityId: string) => void;
  assignOpportunity: (opportunityId: string, payload: FdeOpportunityAssignmentPayload) => void;
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
  activeMemberGroupId,
  activeMemberName,
  activeRole,
  initialOpportunities,
  teamGroups,
  teamMembers,
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

      if (activeRole === "groupLeader" && activeMemberGroupId) {
        const groupMemberIds = new Set(
          teamMembers.filter(item => item.groupId === activeMemberGroupId).map(item => item.id),
        );

        return opportunities.filter(
          item =>
            item.ownerGroupId === activeMemberGroupId ||
            (item.ownerId ? groupMemberIds.has(item.ownerId) : false),
        );
      }

      return opportunities.filter(item => item.ownerId === activeMemberId);
    },
    [activeMemberGroupId, activeMemberId, activeRole, opportunities, teamMembers],
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

  const assignOpportunity = useCallback(
    (opportunityId: string, payload: FdeOpportunityAssignmentPayload): void => {
      setOpportunities(previous =>
        previous.map(item => {
          if (item.id !== opportunityId) {
            return item;
          }

          if (!payload.targetId || !payload.targetType) {
            return {
              ...item,
              ownerId: null,
              ownerGroupId: null,
              ownerGroupName: undefined,
            };
          }

          if (payload.targetType === "group") {
            const targetGroup = teamGroups.find(group => group.id === payload.targetId);

            return {
              ...item,
              ownerId: null,
              ownerGroupId: payload.targetId,
              ownerGroupName: targetGroup?.name,
            };
          }

          const targetMember = teamMembers.find(member => member.id === payload.targetId);

          return {
            ...item,
            ownerId: payload.targetId,
            ownerGroupId: targetMember?.groupId ?? null,
            ownerGroupName: targetMember?.groupName,
          };
        }),
      );
    },
    [teamGroups, teamMembers],
  );

  const createOpportunity = useCallback(
    (payload: FdeCreateOpportunityPayload): void => {
      const createdAt = new Date().toLocaleString("zh-CN", { hour12: false });
      const normalizedInterestedAgents = payload.interestedAgents
        .map(item => item.trim())
        .filter(Boolean);
      const normalizedRequirementDescription = payload.requirementDescription.trim();
      const explicitOwnerId = payload.ownerId ?? null;
      const explicitOwnerMember = explicitOwnerId
        ? teamMembers.find(item => item.id === explicitOwnerId)
        : undefined;
      const resolvedOwnerId = canManageTeamMembers(activeRole)
        ? explicitOwnerId
        : activeRole === "groupLeader"
          ? explicitOwnerId
          : activeMemberId;
      const resolvedOwnerGroupId = canManageTeamMembers(activeRole)
        ? payload.ownerGroupId ?? explicitOwnerMember?.groupId ?? null
        : activeRole === "groupLeader"
          ? payload.ownerGroupId ?? explicitOwnerMember?.groupId ?? activeMemberGroupId ?? null
          : explicitOwnerMember?.groupId ?? activeMemberGroupId ?? null;
      const resolvedOwnerGroupName = resolvedOwnerGroupId
        ? teamGroups.find(item => item.id === resolvedOwnerGroupId)?.name
        : undefined;
      const nextOpportunity: FdeOpportunityItem = {
        id: buildId("opp"),
        companyName: payload.companyName.trim(),
        scenarioName: payload.scenarioName.trim(),
        industry: payload.industry.trim(),
        stage: "初步沟通",
        status: "未开始",
        amountWan: payload.amountWan,
        winRate: 35,
        ownerId: resolvedOwnerId,
        ownerGroupId: resolvedOwnerGroupId,
        ownerGroupName: resolvedOwnerGroupName,
        source: "手动创建",
        summary: buildFdeOpportunitySummary(normalizedRequirementDescription),
        requirementInfo: {
          sourceType: "手动创建",
          createdAt,
          createdByName: activeMemberName,
          contactName: payload.contactName.trim(),
          contactPhone: payload.contactPhone.trim(),
          interestedAgents: normalizedInterestedAgents,
          requirementDescription: normalizedRequirementDescription,
        },
        comments: [],
      };

      setOpportunities(previous => [nextOpportunity, ...previous]);
      setSelectedOpportunityId(nextOpportunity.id);
    },
    [activeMemberGroupId, activeMemberId, activeMemberName, activeRole, teamGroups, teamMembers],
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
