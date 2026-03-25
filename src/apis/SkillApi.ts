import { httpClient } from "@/utils/http";

export type SkillScope = "official" | "tenant";

export type SkillVisibility = "public" | "tenant_only" | "identity_only" | "selected_tenants";

export type CoworkerSkillVisibility = Extract<SkillVisibility, "tenant_only" | "identity_only">;

export type SkillPublisherType = "official" | "tenant" | "all";

export interface SkillCategoryInfo {
  category_id: number;
  key: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sort_order: number;
  status: string;
}

export interface SkillCoverInfo {
  file_id: number;
  storage_path: string;
  mime_type: string;
}

export interface SkillPublisherInfo {
  name?: string;
  type?: string;
  publisher_type?: Exclude<SkillPublisherType, "all">;
  owner_tenant_id?: number;
  owner_identity_id?: null | number;
  owner_admin_user_id?: null | number;
}

export interface CoworkerSkillItem {
  skill_id: number;
  skill_key: string;
  name: string;
  description: string | null;
  latest_version: string | null;
  latest_skill_version_id: number | null;
  scope: SkillScope;
  visibility: SkillVisibility;
  category: SkillCategoryInfo;
  cover: SkillCoverInfo | null;
  publisher: string | SkillPublisherInfo | null;
  updated_at: string;
  owner_tenant_id?: number;
}

export interface CoworkerSkillListParams {
  cursor?: string;
  keyword?: string;
  limit?: number;
  publisher_type?: SkillPublisherType;
  skip?: number;
  scope?: SkillScope;
  visibility?: SkillVisibility;
  category_id?: number;
  mine_only?: boolean;
}

export interface CoworkerSkillListResponse {
  items: CoworkerSkillItem[];
  next_cursor?: string | null;
  has_next?: boolean;
  total?: number;
  skip?: number;
  limit?: number;
}

export interface CoworkerSkillCategoryListResponse {
  items: SkillCategoryInfo[];
}

export type SkillFileAssetPurpose = "skill_package" | "skill_cover";

export interface SkillFileAssetCreateRequest {
  name: string;
  storage_path: string;
  size: number;
  mime_type: string;
  sha256: string;
  purpose: SkillFileAssetPurpose;
  category: "archive" | "image";
  meta_json?: Record<string, unknown>;
}

export interface SkillFileAssetResponse {
  file_id: number;
  status: string;
  created_at: string;
  reused: boolean;
  reactivated: boolean;
}

export interface CoworkerSkillImportRequest {
  file_id: number;
  category_id: number;
  cover_file_id?: number;
  name: string;
  description?: null | string;
  version: string;
  visibility: CoworkerSkillVisibility;
}

export interface CoworkerSkillImportResponse {
  skill_id: number;
  skill_version_id: number;
  import_record_id: number;
  effective_visibility: SkillVisibility;
  public_review_status: string;
  import_status: string;
  review_due_at?: null | string;
  review_overdue: boolean;
  review_eta_seconds?: null | number;
}

export interface CoworkerSkillDetailResponse extends CoworkerSkillItem {
  created_at: string;
  public_review_status?: string;
  review_due_at?: null | string;
  review_overdue?: boolean;
  review_eta_seconds?: null | number;
  review_stage?: null | string;
  review_sla_hours?: null | number;
  selected_tenant_ids?: number[];
}

export interface CoworkerSkillUpdateRequest {
  name?: string;
  description?: null | string;
  category_id?: number;
  cover_file_id?: null | number;
  visibility?: CoworkerSkillVisibility;
}

export interface CoworkerSkillVersionImportRequest {
  file_id: number;
  version: string;
}

export interface CoworkerAgentSkillItem {
  agent_id: number;
  skill_id: number;
  target_skill_version_id: number | null;
  enabled: boolean;
  config?: Record<string, unknown>;
  item_revision: number;
  updated_at?: string | null;
}

export interface CoworkerAgentSkillListResponse {
  items: CoworkerAgentSkillItem[];
  total: number;
  skip?: number;
  limit?: number;
}

export interface CoworkerAgentSkillUpsertRequest {
  enabled?: boolean;
  target_skill_version_id?: number;
  config?: Record<string, unknown>;
  reason?: string;
}

export interface CoworkerAgentSkillForceReinstallRequest {
  reason?: string;
}

export interface CoworkerAgentSkillInstallBindingInfo {
  target_skill_version_id: number | null;
  enabled: boolean;
  item_revision: number | null;
}

export interface CoworkerAgentSkillInstallJobInfo {
  job_id: number;
  status: string;
  plan_generation: number;
  plan_hash: string;
  trigger_source?: string | null;
  trigger_reason?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  last_reported_at?: string | null;
  last_error_code?: string | null;
  last_error_message?: string | null;
}

export interface CoworkerAgentSkillInstallTargetInfo {
  target_id: number;
  job_id?: number | null;
  skill_version_id?: number | null;
  item_revision?: number | null;
  status: string;
  current_stage?: string | null;
  progress_percent?: number | null;
  progress_message?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  last_reported_at?: string | null;
}

export interface CoworkerAgentSkillInstallInventoryInfo {
  skill_version_id?: number | null;
  item_revision_observed?: number | null;
  applied_version?: string | null;
  install_status?: string | null;
  install_stage?: string | null;
  progress_percent?: number | null;
  progress_message?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  last_error?: Record<string, unknown> | null;
  local_modified: boolean;
  change_source?: string | null;
  install_started_at?: string | null;
  install_finished_at?: string | null;
  last_reported_at?: string | null;
}

export interface CoworkerAgentSkillInstallStatusResponse {
  runtime_id: string;
  agent_id: number;
  skill_id: number;
  binding: CoworkerAgentSkillInstallBindingInfo;
  job: CoworkerAgentSkillInstallJobInfo | null;
  target: CoworkerAgentSkillInstallTargetInfo | null;
  inventory: CoworkerAgentSkillInstallInventoryInfo | null;
}

/**
 * 获取租户侧技能广场列表。
 */
export function getCoworkerSkills(
  params: CoworkerSkillListParams,
  signal?: AbortSignal,
): Promise<CoworkerSkillListResponse> {
  return httpClient.get<CoworkerSkillListResponse>("/api/v1/coworker/skills", {
    params,
    signal,
  });
}

/**
 * 获取租户侧技能分类列表。
 */
export function getCoworkerSkillCategories(
  signal?: AbortSignal,
): Promise<CoworkerSkillCategoryListResponse> {
  return httpClient.get<CoworkerSkillCategoryListResponse>("/api/v1/coworker/skills/categories", {
    signal,
  });
}

/**
 * 登记 Skill 资源文件。
 */
export function createSkillFileAsset(
  data: SkillFileAssetCreateRequest,
): Promise<SkillFileAssetResponse> {
  return httpClient.post<SkillFileAssetResponse>("/api/v1/files/assets", data);
}

/**
 * 租户员工导入 Skill。
 */
export function importCoworkerSkill(
  data: CoworkerSkillImportRequest,
  idempotencyKey: string,
): Promise<CoworkerSkillImportResponse> {
  return httpClient.post<CoworkerSkillImportResponse>("/api/v1/coworker/skills/import", data, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
}

/**
 * 更新租户员工自己上传的 Skill。
 */
export function updateCoworkerSkill(
  skillId: number,
  data: CoworkerSkillUpdateRequest,
): Promise<CoworkerSkillDetailResponse> {
  return httpClient.put<CoworkerSkillDetailResponse>(`/api/v1/coworker/skills/${skillId}`, data);
}

/**
 * 为自己上传的 Skill 导入新版本。
 */
export function importCoworkerSkillVersion(
  skillId: number,
  data: CoworkerSkillVersionImportRequest,
  idempotencyKey: string,
): Promise<CoworkerSkillImportResponse> {
  return httpClient.post<CoworkerSkillImportResponse>(
    `/api/v1/coworker/skills/${skillId}/versions/import`,
    data,
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );
}

/**
 * 删除自己上传的 Skill。
 */
export function deleteCoworkerSkill(skillId: number): Promise<void> {
  return httpClient.delete<void>(`/api/v1/coworker/skills/${skillId}`);
}

/**
 * 获取指定 cowork-agent 的 Skill 安装清单。
 */
export function getCoworkerAgentSkills(
  agentId: number,
  signal?: AbortSignal,
): Promise<CoworkerAgentSkillListResponse> {
  return httpClient.get<CoworkerAgentSkillListResponse>(
    `/api/v1/coworker/agents/${agentId}/skills`,
    {
      signal,
    },
  );
}

/**
 * 将 Skill 安装到指定 cowork-agent。
 */
export function installCoworkerAgentSkill(
  agentId: number,
  skillId: number,
  data: CoworkerAgentSkillUpsertRequest,
): Promise<CoworkerAgentSkillItem> {
  return httpClient.put<CoworkerAgentSkillItem>(
    `/api/v1/coworker/agents/${agentId}/skills/${skillId}`,
    data,
  );
}

/**
 * 从指定 cowork-agent 移除 Skill。
 */
export function deleteCoworkerAgentSkill(
  agentId: number,
  skillId: number,
  reason?: string,
): Promise<void> {
  return httpClient.delete<void>(`/api/v1/coworker/agents/${agentId}/skills/${skillId}`, {
    params: reason ? { reason } : undefined,
  });
}

/**
 * 获取指定 cowork-agent 的 Skill 安装状态。
 */
export function getCoworkerAgentSkillInstallStatus(
  agentId: number,
  skillId: number,
  signal?: AbortSignal,
): Promise<CoworkerAgentSkillInstallStatusResponse> {
  return httpClient.get<CoworkerAgentSkillInstallStatusResponse>(
    `/api/v1/coworker/agents/${agentId}/skills/${skillId}/install-status`,
    {
      signal,
    },
  );
}

/**
 * 强制重新安装指定 cowork-agent 的 Skill。
 */
export function forceReinstallCoworkerAgentSkill(
  agentId: number,
  skillId: number,
  data?: CoworkerAgentSkillForceReinstallRequest,
): Promise<CoworkerAgentSkillItem> {
  return httpClient.post<CoworkerAgentSkillItem>(
    `/api/v1/coworker/agents/${agentId}/skills/${skillId}/force-reinstall`,
    data ?? {},
  );
}
