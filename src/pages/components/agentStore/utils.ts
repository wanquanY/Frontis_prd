import type { EmployeeItem, FrontisWebUserItem } from "../../types";
import type { ExpertDeploymentState, ExpertDeviceAccessState } from "./types";

/**
 * 基于当前员工数据，构建 AI 专家的初始设备部署状态。
 */
export const buildInitialExpertDeploymentByEmployeeId = (
  employees: EmployeeItem[],
): Record<string, ExpertDeploymentState> =>
  Object.fromEntries(
    employees.map(employee => [
      employee.id,
      {
        accessByWorkspaceId: employee.workspaceId
          ? {
              [employee.workspaceId]: {
                boundMembers: [...employee.boundMembers],
                visibility: employee.visibility,
              },
            }
          : {},
        assignedWorkspaceIds: employee.workspaceId ? [employee.workspaceId] : [],
      },
    ]),
  );

/**
 * 获取 AI 专家当前分配到的设备列表。
 */
export const getAssignedWorkspaceIdsForExpert = (
  employee: EmployeeItem,
  deploymentState?: ExpertDeploymentState,
): string[] => {
  if (deploymentState?.assignedWorkspaceIds.length) {
    return deploymentState.assignedWorkspaceIds;
  }

  return employee.workspaceId ? [employee.workspaceId] : [];
};

/**
 * 获取 AI 专家在指定设备上的权限配置。
 */
export const getDeviceAccessStateForExpert = (
  employee: EmployeeItem,
  workspaceId: string,
  deploymentState?: ExpertDeploymentState,
): ExpertDeviceAccessState =>
  deploymentState?.accessByWorkspaceId[workspaceId] ?? {
    boundMembers: [...employee.boundMembers],
    visibility: employee.visibility,
  };

/**
 * 计算指定设备上的 AI 专家有效可用成员。
 * 设备拥有者始终默认拥有该设备中的 Agent 权限。
 */
export const getEffectiveMembersForDeviceAccess = (
  accessState: ExpertDeviceAccessState,
  ownerId: string | null | undefined,
  users: FrontisWebUserItem[],
): string[] => {
  if (accessState.visibility === "all") {
    return users.map(user => user.name);
  }

  const ownerName = ownerId ? users.find(user => user.id === ownerId)?.name ?? null : null;
  return Array.from(new Set([...(ownerName ? [ownerName] : []), ...accessState.boundMembers]));
};

/**
 * 判断指定用户是否拥有某个 AI 专家的可用权限。
 * 只要在任一已分配设备上满足设备权限或设备拥有者条件，即视为可用。
 */
export const hasUserAccessToExpert = (
  user: FrontisWebUserItem,
  employee: EmployeeItem,
  deploymentState: ExpertDeploymentState | undefined,
  deviceOwners: Record<string, string | null>,
): boolean => {
  const assignedWorkspaceIds = getAssignedWorkspaceIdsForExpert(employee, deploymentState);

  return assignedWorkspaceIds.some(workspaceId => {
    const accessState = getDeviceAccessStateForExpert(employee, workspaceId, deploymentState);

    if (accessState.visibility === "all") {
      return true;
    }

    if (deviceOwners[workspaceId] === user.id) {
      return true;
    }

    return accessState.boundMembers.includes(user.name);
  });
};
