import {
  buildAccessScopeSummary,
  getOrganizationRootDepartmentName,
  hasUserInAccessScope,
} from "@/utils/organizationAccess";

import type {
  EmployeeItem,
  FrontisWebUserItem,
  OrganizationDepartmentItem,
} from "../../types";

/**
 * 判断 AI 专家是否已完成权限分配。
 */
export const isPermissionAssignmentConfigured = (employee: EmployeeItem): boolean =>
  employee.visibility === "all" || employee.accessScopeSubjects.length > 0;

/**
 * 判断 AI 专家是否已完成后台可用范围配置。
 */
export const isExpertAccessConfigured = (employee: EmployeeItem): boolean =>
  isPermissionAssignmentConfigured(employee);

/**
 * 判断指定用户是否拥有某个 AI 专家的可用权限。
 */
export const hasUserAccessToExpert = (
  user: FrontisWebUserItem,
  employee: EmployeeItem,
  users: FrontisWebUserItem[],
  departments: OrganizationDepartmentItem[],
): boolean => {
  if (employee.visibility === "all") {
    return true;
  }

  return hasUserInAccessScope(user, employee.accessScopeSubjects, users, departments);
};

/**
 * 生成 AI 专家的组织范围摘要。
 */
export const getExpertAccessScopeSummary = (
  visibility: EmployeeItem["visibility"],
  accessScopeSubjects: EmployeeItem["accessScopeSubjects"],
  organizationDepartments?: OrganizationDepartmentItem[],
): string => {
  if (visibility === "all") {
    return `${organizationDepartments?.length ? getOrganizationRootDepartmentName(organizationDepartments) : "全公司"}可用`;
  }

  return buildAccessScopeSummary(accessScopeSubjects, organizationDepartments);
};
