import type { CreateSynClawChannelPayload } from "@/types/prdPrototype";

/**
 * SynClaw 频道成员权限。
 */
export type SynClawChannelAccessRole = "owner" | "manager" | "speaker" | "viewer";

/**
 * SynClaw 页面所需的当前登录用户最小结构。
 */
export interface SynClawCurrentUser {
  id: number;
  username?: string;
  phone?: string;
  avatar?: string;
  is_owner?: boolean;
  is_tenant_admin?: boolean;
}

/**
 * SynClaw 频道可绑定 AI 员工信息。
 */
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

/**
 * 按工作站分组后的 AI 员工集合。
 */
export interface SynClawAiEmployeeGroup {
  workspaceKey: string;
  workspaceName: string;
  items: SynClawAiEmployee[];
}

export interface SynClawTenantMemberSelection {
  identityId: string;
  accessRole: SynClawChannelAccessRole;
}

/**
 * 租户员工下拉选项。
 */
export interface SynClawTenantMemberOption {
  id: string;
  name: string;
  subtitle?: string;
}

/**
 * SynClaw 页面视图模式。
 */
export type SynClawViewMode = "workspace" | "skills" | "automation";

/**
 * 频道弹窗模式。
 */
export type SynClawChannelModalMode = "create" | "rename";

/**
 * 新建/编辑频道提交载荷。
 */
export type SynClawCreateChannelSubmitPayload = CreateSynClawChannelPayload;

/**
 * @mention 可识别 Agent 数据。
 */
export interface SynClawMentionAgent {
  agentId: string;
  displayName: string;
  alias?: string;
  keywords: string[];
}
