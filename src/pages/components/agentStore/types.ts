import type {
  AccessScopeSubject,
  EmployeeItem,
  EmployeeVisibility,
  FrontisWebTabKey,
  FrontisWebUserItem,
  OrganizationDepartmentItem,
  WorkspaceItem,
} from "../../types";
import type { MockTenantManagementSnapshot } from "@/feature/auth/types";

/**
 * AI 专家管理视图组件入参。
 */
export interface AgentStoreViewProps {
  currentUserName?: string;
  deploymentByEmployeeId: Record<string, ExpertDeploymentState>;
  deviceOwners: Record<string, string | null>;
  employees: EmployeeItem[];
  organizationDepartments: OrganizationDepartmentItem[];
  onAttachEmployeeToDevice: (employeeId: string, workspaceId: string) => void;
  onDetachEmployeeFromDevice: (employeeId: string, workspaceId: string) => void;
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateEmployeeDeviceAccess: (
    employeeId: string,
    workspaceId: string,
    visibility: EmployeeVisibility,
    accessScopeSubjects: AccessScopeSubject[],
  ) => void;
  onUpdateEmployeeLaborCosts: (employeeId: string, costs: AgentLaborCostConfig) => void;
  onUpdateEmployeeModel: (employeeId: string, model: string) => void;
  tenantSnapshot: MockTenantManagementSnapshot;
  users: FrontisWebUserItem[];
  workspaces: WorkspaceItem[];
}

/**
 * 私有化 AI 专家成本核算参数。
 */
export interface AgentLaborCostConfig {
  industryStandardCost: number;
  myLaborCost: number;
}

/**
 * AI 专家在单个设备上的权限配置。
 */
export interface ExpertDeviceAccessState {
  accessScopeSubjects: AccessScopeSubject[];
  visibility: EmployeeVisibility;
}

/**
 * AI 专家在企业后台中的部署配置。
 */
export interface ExpertDeploymentState {
  accessByWorkspaceId: Record<string, ExpertDeviceAccessState>;
  assignedWorkspaceIds: string[];
}

/**
 * 已购 AI 专家团。
 */
export interface OwnedExpertTeam {
  id: string;
  name: string;
  icon: string;
  category: string;
  categoryColor: string;
  description: string;
  memberIds: string[];
  subAgentTags: string[];
  version: string;
  hasNewVersion: boolean;
  newVersion?: string;
  updateNotes?: string[];
  cumulativeTaskCount: number;
  workspaceId: string;
}

/**
 * 推荐 AI 专家团。
 */
export interface RecommendedExpertTeam {
  id: string;
  name: string;
  icon: string;
  category: string;
  categoryColor: string;
  description: string;
  price: number;
  recommendation: string;
  detailSlug: string;
}
