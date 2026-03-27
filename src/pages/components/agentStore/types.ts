import type { EmployeeItem, EmployeeVisibility, SkillItem } from "../../types";

/**
 * AI 专家团视图组件入参。
 */
export interface AgentStoreViewProps {
  employees: EmployeeItem[];
  memberNames: string[];
  onUpdateEmployeeAccess: (
    employeeId: string,
    visibility: EmployeeVisibility,
    boundMembers: string[],
  ) => void;
  skills: SkillItem[];
}

/**
 * 专家团需求弹窗模式。
 */
export type AgentStoreLeadModalMode = "purchase" | "request";

/**
 * 专家团场景标识。
 */
export type AgentStoreScenarioKey =
  | "all"
  | "product"
  | "content"
  | "research"
  | "delivery"
  | "sales"
  | "hr"
  | "service"
  | "finance"
  | "management";

/**
 * 具体业务场景标识。
 */
export type AgentStoreResolvedScenarioKey = Exclude<AgentStoreScenarioKey, "all">;

/**
 * 专家团场景筛选项。
 */
export interface AgentStoreScenarioOption {
  key: AgentStoreScenarioKey;
  label: string;
}

/**
 * 待采购 AI 专家信息。
 */
export interface AgentStoreMarketItem {
  capabilityTags: string[];
  category: string;
  highlight: string;
  id: string;
  name: string;
  scenarioKey: AgentStoreResolvedScenarioKey;
  summary: string;
}

/**
 * 专家团需求表单状态。
 */
export interface AgentStoreLeadFormState {
  company: string;
  contactName: string;
  contactPhone: string;
  desiredAgent: string;
  note: string;
  role: string;
  scenario: string;
}

/**
 * 已购买专家展示项。
 */
export interface AgentStoreOwnedPresentation {
  employee: EmployeeItem;
  sceneKey: AgentStoreResolvedScenarioKey;
}

/**
 * 按场景组织后的专家团展示项。
 */
export interface AgentStoreScenePresentation {
  description: string;
  key: AgentStoreResolvedScenarioKey;
  label: string;
  marketExperts: AgentStoreMarketItem[];
  ownedExperts: AgentStoreOwnedPresentation[];
}
