import { httpClient } from "@/utils/http";
import { AgentType, EnableStatus, ExecutionMode } from "./enums";
export { AgentType, EnableStatus, ExecutionMode } from "./enums";

/**
 * 当前登录用户信息
 * - GET /identities/me
 */
export interface UserMeResponse {
  id: number;
  username: string;
  phone: string;
  avatar: string;
  is_owner: boolean;
  is_tenant_admin: boolean;
  status?: string;
  tenant: {
    id: number;
    name: string;
    code?: string;
    logo: string;
  };
  navigation?: {
    modules?: {
      synclaw?: boolean;
      skill_market?: boolean;
      automation_task?: boolean;
      management_console?: boolean;
    };
    reasons?: Record<string, boolean>;
  };
  created_at: string;
}

export interface AgentsRequest {
  /**
   * 分类筛选
   */
  category_id?: number;
  /**
   * 执行模式
   */
  execution_mode?: ExecutionMode;
  /**
   * 筛选可在空间中使用的
   */
  is_space_enabled?: boolean;
  /**
   * 返回条数
   */
  limit?: number;
  /**
   * 跳过条数
   */
  skip?: number;
  /**
   * 类型筛选
   */
  type?: AgentType;
  /**
   * 是否带上超级助理（放在最前面）
   */
  with_super_assistant?: boolean;
}

/**
 * Agent信息
 */
export interface Agent {
  id: number;
  category_id: number;
  name: string;
  description: string;
  brief_description?: string;
  icon: string;
  type: AgentType;
  execution_mode: ExecutionMode;
  is_space_enabled: boolean;
  is_super_assistant: boolean;
  status: EnableStatus;
  created_at: string;
  tags?: string[];
  /**
   * 输入框占位文案（后端字段未全量覆盖时，前端可兜底）
   */
  placeholder?: string;
}

/**
 * Agent分类信息
 */
export interface AgentCategoryItem {
  id: number;
  name: string;
  icon?: string;
  sort_order?: number;
}

export type AgentCategoryResponse = AgentCategoryItem[];

/**
 * Agent列表响应
 */
export interface AgentsResponse {
  items: Agent[];
  total: number;
  skip: number;
  limit: number;
}

export interface BizConfigResponse {
  storage: {
    path_prefix: string;
  };
  space: {
    cover_height: number;
    cover_width: number;
    max_concurrent_analysis: number;
    max_file_count: number;
    max_file_size_mb: number;
    max_total_size_mb: number;
  };
}

export function getCurrentUser() {
  return httpClient.get<UserMeResponse>("/api/v1/identity/me");
}

/**
 * 获取Agent智能体列表
 * - GET /api/v1/agents
 */
export function getAgents(params: AgentsRequest) {
  return httpClient.get<AgentsResponse>("/api/v1/agents", {
    params,
  });
}

/**
 * 获取超级助理列表
 * - GET /api/v1/agents/super-assistant
 */
export function getSuperAssistants() {
  return httpClient.get<Agent | Agent[]>("/api/v1/agents/super-assistant");
}

/**
 * 获取Agent分类列表
 * - GET /api/v1/agent-categories
 */
export function getAgentCategories() {
  return httpClient.get<AgentCategoryResponse>("/api/v1/agent-categories");
}

/**
 * 获取空间绑定的Agent列表
 * - GET /api/v1/spaces/{id}/agents
 */
export function getSpaceAgents(spaceId: number) {
  return httpClient.get<Agent[]>(`/api/v1/spaces/${spaceId}/agents`);
}

/**
 * 解绑空间中的智能体
 * - DELETE /v1/spaces/{id}/agents/{agent_id}
 */
export function unbindAgent(spaceId: number, agentId: number) {
  return httpClient.delete(`/api/v1/spaces/${spaceId}/agents/${agentId}`);
}

export function getBizConfig(path: string) {
  return httpClient.get<BizConfigResponse>("/api/v1/biz-config", {
    params: {
      path,
    },
  });
}
