import type { EmployeeItem, EmployeeVisibility, FrontisWebTabKey, WorkspaceItem } from "../../types";

/**
 * AI 专家团视图组件入参。
 */
export interface AgentStoreViewProps {
  employees: EmployeeItem[];
  memberNames: string[];
  onNavigateToTab: (tabKey: FrontisWebTabKey) => void;
  onUpdateEmployeeAccess: (
    employeeId: string,
    visibility: EmployeeVisibility,
    boundMembers: string[],
  ) => void;
  onUpdateEmployeeModel: (employeeId: string, model: string) => void;
  workspaces: WorkspaceItem[];
}

/**
 * AI 专家在企业后台中的部署配置。
 */
export interface ExpertDeploymentState {
  assignedWorkspaceId: string | null;
  isDeviceLocked: boolean;
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
