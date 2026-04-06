import type {
  EmployeeItem,
  EmployeeVisibility,
  FrontisWebTabKey,
  FrontisWebUserItem,
  WorkspaceItem,
} from "../../types";

/**
 * AI 专家团视图组件入参。
 */
export interface AgentStoreViewProps {
  deploymentByEmployeeId: Record<string, ExpertDeploymentState>;
  deviceOwners: Record<string, string | null>;
  employees: EmployeeItem[];
  memberNames: string[];
  onAttachEmployeeToDevice: (employeeId: string, workspaceId: string) => void;
  onDetachEmployeeFromDevice: (employeeId: string, workspaceId: string) => void;
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateEmployeeDeviceAccess: (
    employeeId: string,
    workspaceId: string,
    visibility: EmployeeVisibility,
    boundMembers: string[],
  ) => void;
  onUpdateEmployeeModel: (employeeId: string, model: string) => void;
  users: FrontisWebUserItem[];
  workspaces: WorkspaceItem[];
}

/**
 * AI 专家在单个设备上的权限配置。
 */
export interface ExpertDeviceAccessState {
  boundMembers: string[];
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
