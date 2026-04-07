import { useCallback, useMemo, useState } from "react";

import type { FdeTeamMemberDraft, FdeTeamMemberItem } from "@/feature/fde/types";

import { buildTeamMember, canManageTeamMembers, getDefaultMemberTitle } from "./fdeWorkbenchStateUtils";

/**
 * FDE 成员状态管理 hook 入参。
 */
export interface UseFdeTeamMembersStateParams {
  currentUserId?: string;
  initialTeamMembers: FdeTeamMemberItem[];
}

/**
 * FDE 成员状态管理 hook 返回值。
 */
export interface UseFdeTeamMembersStateResult {
  teamMembers: FdeTeamMemberItem[];
  activeMember: FdeTeamMemberItem;
  activeRole: FdeTeamMemberItem["role"];
  canManageMembers: boolean;
  addTeamMember: (payload: FdeTeamMemberDraft) => void;
  importTeamMembers: (payloads: FdeTeamMemberDraft[]) => void;
  updateTeamMember: (memberId: string, payload: FdeTeamMemberDraft) => void;
  toggleTeamMemberStatus: (memberId: string) => void;
  removeTeamMember: (memberId: string) => void;
}

/**
 * 管理 FDE 团队成员状态和成员操作。
 */
export const useFdeTeamMembersState = ({
  currentUserId,
  initialTeamMembers,
}: UseFdeTeamMembersStateParams): UseFdeTeamMembersStateResult => {
  const [teamMembers, setTeamMembers] = useState<FdeTeamMemberItem[]>(initialTeamMembers);

  const activeMember = useMemo<FdeTeamMemberItem>(
    () => teamMembers.find(item => item.id === currentUserId) ?? teamMembers[0] ?? initialTeamMembers[0],
    [currentUserId, initialTeamMembers, teamMembers],
  );
  const activeRole = activeMember.role;
  const canManageMembers = canManageTeamMembers(activeRole);

  const addTeamMember = useCallback(
    (payload: FdeTeamMemberDraft): void => {
      if (!canManageTeamMembers(activeRole)) {
        return;
      }

      const nextMember = buildTeamMember(payload, "手动添加");
      setTeamMembers(previous => [nextMember, ...previous]);
    },
    [activeRole],
  );

  const importTeamMembers = useCallback(
    (payloads: FdeTeamMemberDraft[]): void => {
      if (!canManageTeamMembers(activeRole) || !payloads.length) {
        return;
      }

      const importedMembers = payloads.map(payload => buildTeamMember(payload, "批量导入"));
      setTeamMembers(previous => [...importedMembers, ...previous]);
    },
    [activeRole],
  );

  const updateTeamMember = useCallback(
    (memberId: string, payload: FdeTeamMemberDraft): void => {
      if (!canManageTeamMembers(activeRole)) {
        return;
      }

      setTeamMembers(previous =>
        previous.map(item =>
          item.id === memberId
            ? {
                ...item,
                name: payload.name.trim(),
                title: payload.title.trim() || getDefaultMemberTitle(payload.role),
                phone: payload.phone.trim(),
                role: payload.role,
                permissionKeys: payload.permissionKeys,
                focusScenes: payload.focusScenes,
              }
            : item,
        ),
      );
    },
    [activeRole],
  );

  const toggleTeamMemberStatus = useCallback(
    (memberId: string): void => {
      if (!canManageTeamMembers(activeRole)) {
        return;
      }

      setTeamMembers(previous =>
        previous.map(item =>
          item.id === memberId
            ? {
                ...item,
                accountStatus: item.accountStatus === "enabled" ? "disabled" : "enabled",
              }
            : item,
        ),
      );
    },
    [activeRole],
  );

  const removeTeamMember = useCallback(
    (memberId: string): void => {
      if (!canManageTeamMembers(activeRole)) {
        return;
      }

      setTeamMembers(previous => {
        if (previous.length <= 1) {
          return previous;
        }

        if (memberId === currentUserId) {
          return previous;
        }

        return previous.filter(item => item.id !== memberId);
      });
    },
    [activeRole, currentUserId],
  );

  return {
    teamMembers,
    activeMember,
    activeRole,
    canManageMembers,
    addTeamMember,
    importTeamMembers,
    updateTeamMember,
    toggleTeamMemberStatus,
    removeTeamMember,
  };
};
