import type {
  AccessScopeSubject,
  EmployeeItem,
  EmployeeVisibility,
  FrontisWebUserItem,
  OrganizationDepartmentItem,
} from "../../types";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";

/**
 * AI 专家管理视图组件入参。
 */
export interface AgentStoreViewProps {
  currentUserName?: string;
  employees: EmployeeItem[];
  organizationDepartments: OrganizationDepartmentItem[];
  onUpdateEmployeeAccess: (
    employeeId: string,
    visibility: EmployeeVisibility,
    accessScopeSubjects: AccessScopeSubject[],
  ) => void;
  onUpdateEmployeeLaborCosts: (employeeId: string, costs: AgentLaborCostConfig) => void;
  onUpdateEmployeeModel: (employeeId: string, model: string) => void;
  tenantSnapshot: MockTenantManagementSnapshot;
  users: FrontisWebUserItem[];
}

/**
 * 私有化 AI 专家成本核算参数。
 */
export interface AgentLaborCostConfig {
  industryStandardCost: number;
  myLaborCost: number;
}
