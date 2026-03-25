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

export interface CoworkerAgentSkillItem {
  agent_id: number;
  skill_id: number;
  target_skill_version_id: number | null;
  enabled: boolean;
  config?: Record<string, unknown>;
  item_revision: number;
  updated_at?: string | null;
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

export type AdminAiEmployeeRemoteStatus =
  | "online"
  | "executing"
  | "offline"
  | "connection_failed"
  | "revoked";

export interface AdminAiEmployeeListItem {
  id: string;
  source: "coworker" | "openclaw";
  managed_by_coworker: boolean;
  visible_to_all: boolean;
  coworker_agent_id?: number | null;
  name: string;
  remote_status: AdminAiEmployeeRemoteStatus;
  type?: string;
  role?: string;
  agent_code?: string;
  description?: string | null;
  model?: string | null;
  primary_model?: string | null;
  runtime_id?: string | null;
  avatar_url?: string | null;
  runtime_provisioning_status?: string | null;
  runtime_agent_id?: string | null;
}

export interface CoworkerChannelSpaceChannelAgentRuntimeStatusAgentItem {
  channelId: string;
  agentId: string;
  displayName: string;
  avatarUrl?: string;
  runtimeAgentId?: string;
  runtimeAgentStatus?: string;
  runtimeActiveSessionKeys?: string[];
  runtimeActiveSessionCount?: number;
  isWorkingHere?: boolean;
  isBusyElsewhere?: boolean;
}

export interface CoworkerChannelSpaceChannelAgentRuntimeStatusChannelItem {
  channelId: string;
  channelName: string;
  agentCount: number;
  workingHereCount: number;
  busy: boolean;
  agents: CoworkerChannelSpaceChannelAgentRuntimeStatusAgentItem[];
}

export type SynClawChannelAccessRole = "owner" | "manager" | "speaker" | "viewer";

export interface SynClawAiEmployee {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  runtimeId?: string;
  runtimeName: string;
  bindable: boolean;
  disabledReason?: string;
  provisioningStatus?: string | null;
  remoteStatus?: string | null;
  runtimeAgentId?: string;
}

export interface SynClawTenantMemberSelection {
  identityId: string;
  accessRole: SynClawChannelAccessRole;
}

export interface SynClawTenantMemberOption {
  id: string;
  name: string;
  subtitle?: string;
}

export interface CoworkerChannelSpaceMemberItem {
  identityId: string;
  displayName: string;
  identityType?: string;
  status?: string;
  avatarUrl?: string;
  accessRole?: string;
  role?: string;
}

export interface CoworkerTenantMemberCandidateItem {
  identityId: string;
  username?: string;
  phone?: string;
  email?: string;
}

export interface CoworkerChannelAgentItem {
  agentId: string;
  alias?: string;
}

export interface CreateSynClawChannelPayload {
  spaceId: string;
  channelName: string;
  aiEmployeeIds: string[];
  tenantMembers: SynClawTenantMemberSelection[];
}

export interface SpaceItem {
  id: number;
  name: string;
}

export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";
