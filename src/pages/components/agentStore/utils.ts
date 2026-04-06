import type { EmployeeItem, ExpertSetupMode, FrontisWebUserItem } from "../../types";
import type { ExpertDeploymentState, ExpertDeviceAccessState } from "./types";

/**
 * 获取 AI 专家的配置方式。
 */
export const getExpertSetupMode = (employee: EmployeeItem): ExpertSetupMode =>
  employee.expertSetupMode ?? "device";

/**
 * 判断 AI 专家是否需要绑定设备。
 */
export const doesExpertRequireDeviceBinding = (employee: EmployeeItem): boolean =>
  getExpertSetupMode(employee) === "device";

/**
 * 判断 AI 专家是否已完成权限分配。
 */
export const isPermissionAssignmentConfigured = (employee: EmployeeItem): boolean =>
  employee.visibility === "all" || employee.boundMembers.length > 0;

/**
 * 基于当前员工数据，构建 AI 专家的初始设备部署状态。
 * 仅 `device` 模式的专家会进入设备部署映射。
 */
export const buildInitialExpertDeploymentByEmployeeId = (
  employees: EmployeeItem[],
): Record<string, ExpertDeploymentState> =>
  Object.fromEntries(
    employees.map(employee => {
      const requiresDeviceBinding = doesExpertRequireDeviceBinding(employee);

      return [
        employee.id,
        {
          accessByWorkspaceId:
            requiresDeviceBinding && employee.workspaceId
              ? {
                  [employee.workspaceId]: {
                    boundMembers: [...employee.boundMembers],
                    visibility: employee.visibility,
                  },
                }
              : {},
          assignedWorkspaceIds:
            requiresDeviceBinding && employee.workspaceId ? [employee.workspaceId] : [],
        },
      ];
    }),
  );

/**
 * 获取 AI 专家当前分配到的设备列表。
 * `permission` 模式的专家不返回设备列表。
 */
export const getAssignedWorkspaceIdsForExpert = (
  employee: EmployeeItem,
  deploymentState?: ExpertDeploymentState,
): string[] => {
  if (!doesExpertRequireDeviceBinding(employee)) {
    return [];
  }

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
 * `permission` 模式按成员授权生效；`device` 模式按设备拥有者生效。
 */
export const hasUserAccessToExpert = (
  user: FrontisWebUserItem,
  employee: EmployeeItem,
  deploymentState: ExpertDeploymentState | undefined,
  deviceOwners: Record<string, string | null>,
): boolean => {
  if (!doesExpertRequireDeviceBinding(employee)) {
    if (employee.visibility === "all") {
      return true;
    }

    return employee.boundMembers.includes(user.name);
  }

  const assignedWorkspaceIds = getAssignedWorkspaceIdsForExpert(employee, deploymentState);

  return assignedWorkspaceIds.some(workspaceId => deviceOwners[workspaceId] === user.id);
};
