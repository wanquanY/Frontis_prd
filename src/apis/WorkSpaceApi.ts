import { httpClient } from "@/utils/http";
import { AgentType, AnalysisStatus, SpaceDataSourceType, SpaceDataType } from "./enums";
export { AgentType, AnalysisStatus, SpaceDataSourceType, SpaceDataType } from "./enums";

/**
 * Space list item
 * - GET /api/v1/spaces
 */
export interface SpaceItem {
  id: number;
  name: string;
  cover: string;
  summary: string;
  suggested_questions: string[];
  is_pinned: boolean;
  data_count: number;
  session_count?: number;
  storage_used_bytes: number;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Params for space list
 * - GET /api/v1/spaces
 */
export interface GetSpacesParams {
  /**
   * Number of items to return
   */
  limit?: number;
  /**
   * Offset
   */
  skip?: number;
  sort_by: string;
  /**
   * Search keyword
   */
  q?: string;
}

export interface GetSpacesResponse {
  items: SpaceItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface SpaceAgentCategory {
  id: number;
  name: string;
  code?: string;
  icon?: string;
}

export interface SpaceDataParams {
  /**
   * Filter by analysis status
   */
  analysis_status?: AnalysisStatus;
  /**
   * Filter by data type
   */
  type?: SpaceDataType;
}

export interface SpaceDataItem {
  id: number;
  space_id: number;
  type: SpaceDataType;
  source_type: SpaceDataSourceType;
  name: string;
  analysis_status: AnalysisStatus;
  summary: string;
  ai_category: string;
  error_message: string;
  created_at: string;
  source_url: string;
  extension: string;
  storage_path: string;
  size: number;
  mime_type: string;
  file_category: string;
  file_type: string;
  url?: string;
}

export type SpaceDataResponse = SpaceDataItem[];

export interface SpaceAgentCategoryParam {
  type: AgentType;
}

export interface SpaceAgentCategoryItem {
  id: number;
  type: AgentType;
  name: string;
  icon: string;
}

export type SpaceAgentCategoryResponse = SpaceAgentCategoryItem[];

/**
 * 获取空间列表
 * - GET /api/v1/spaces
 */
export function getSpaces(params: GetSpacesParams) {
  return httpClient.get<GetSpacesResponse>("/api/v1/spaces", {
    params,
  });
}

/**
 * 创建空间
 * - POST /v1/spaces
 */
export interface CreateSpaceRequest {
  name?: string;
}

export function createSpace(data?: CreateSpaceRequest) {
  return httpClient.post<SpaceItem>("/api/v1/spaces", data);
}

/**
 * 删除空间
 * - DELETE /v1/spaces/{id}
 */
export function deleteSpace(id: number) {
  return httpClient.delete(`/api/v1/spaces/${id}`);
}

/**
 * 钉住/取消钉住空间
 * - POST /v1/spaces/{id}/pin
 */
export function pinSpace(id: number, pinned: boolean) {
  return httpClient.post(`/api/v1/spaces/${id}/pin`, { pinned });
}

export function updateSpace(id: number, data: Partial<SpaceItem>) {
  return httpClient.put(`/api/v1/spaces/${id}`, data);
}

/**
 * 获取空间详情
 * - GET /v1/spaces/{id}
 */
export function getSpaceById(id: number) {
  return httpClient.get<SpaceItem>(`/api/v1/spaces/${id}`);
}

/**
 * 获取空间数据列表
 * - GET /v1/spaces/{id}/data
 */
export function getSpaceData(id: number, params: SpaceDataParams) {
  return httpClient.get<SpaceDataResponse>(`/api/v1/spaces/${id}/data`, {
    params,
  });
}

/**
 * 删除空间数据（文档）
 * - DELETE /api/v1/spaces/{id}/data/{dataId}
 */
export function deleteSpaceData(id: number, dataId: number) {
  return httpClient.delete(`/api/v1/spaces/${id}/data/${dataId}`);
}

/**
 * 重试空间数据（文档）分析
 * - POST /api/v1/spaces/{id}/data/{dataId}/retry
 */
export function retrySpaceData(id: number, dataId: number) {
  return httpClient.post(`/api/v1/spaces/${id}/data/${dataId}/retry`);
}

/**
 * Space Artifacts
 * - GET /api/v1/spaces/{space_id}/artifacts
 */
export interface SpaceArtifactItem {
  id: number;
  artifact_id: string;
  kind: string;
  title: string | null;
  summary: string | null;
  data: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface SpaceArtifactsGroup {
  session_id: number;
  session_title: string | null;
  session_updated_at: string | null;
  artifacts: SpaceArtifactItem[];
}

export interface SpaceArtifactsParams {
  /**
   * Artifact 类型过滤
   */
  kind?: string;
  /**
   * 每个 session 的 artifact 数量限制，默认 50
   */
  limit?: number;
}

export interface SpaceArtifactsResponse {
  groups: SpaceArtifactsGroup[];
  total: number;
}

/**
 * 获取空间成果列表（按 session 分组）
 * - GET /api/v1/spaces/{space_id}/artifacts
 */
export function getSpaceArtifacts(spaceId: number, params: SpaceArtifactsParams = {}) {
  return httpClient.get<SpaceArtifactsResponse>(`/api/v1/spaces/${spaceId}/artifacts`, { params });
}

/**
 * 从成果创建空间数据（加入知识库）
 * - POST /api/v1/spaces/{space_id}/data/from-artifact
 */
export interface CreateSpaceDataFromArtifactRequest {
  artifact_id: string;
  session_id: number;
}

export function createSpaceDataFromArtifact(
  spaceId: number,
  data: CreateSpaceDataFromArtifactRequest,
) {
  return httpClient.post(`/api/v1/spaces/${spaceId}/data/from-artifact`, data);
}

/**
 * 绑定文件到空间
 * - POST /v1/spaces/{id}/data
 */
export interface BindSpaceDataFileItem {
  name: string;
  storage_path: string;
  size: number;
  mime_type: string;
  source_type: SpaceDataSourceType.Upload;
  type: SpaceDataType.File;
}

export function bindSpaceData(id: number, data: BindSpaceDataFileItem) {
  return httpClient.post(`/api/v1/spaces/${id}/data`, data);
}

export function getSpaceAgentCategory(id: number) {
  return httpClient.get<SpaceAgentCategoryResponse>(`/api/v1/spaces/${id}/agents/categories`);
}

/**
 * 向空间添加智能体
 * - POST /v1/spaces/{id}/agents
 */
export interface AddSpaceAgentRequest {
  agent_id: number;
}

export function addAgentToSpace(id: number, data: AddSpaceAgentRequest) {
  return httpClient.post(`/api/v1/spaces/${id}/agents`, data);
}
