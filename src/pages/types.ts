import type { Block } from "@/types/block";
import type { ReactNode } from "react";

/**
 * FrontisAI Web 端角色类型。
 */
export type FrontisWebRole = "employee" | "admin";

/**
 * FrontisAI Web 端一级导航标识。
 */
export type FrontisWebTabKey =
  | "dashboard"
  | "dialogue"
  | "group"
  | "automation"
  | "store"
  | "devices"
  | "models"
  | "organization"
  | "notifications";

/**
 * 工作站类型。
 */
export type WorkspaceType = "cloud" | "local" | "edge";

/**
 * 通用状态色值枚举。
 */
export type StatusTone = "online" | "busy" | "idle" | "pending" | "paused" | "draft";

/**
 * AI 员工连接模式。
 */
export type ConnectionMode = "cloud" | "local";
export type EmployeeSource = "coworker" | "openclaw";
export type EmployeeVisibility = "all" | "bound";

/**
 * 对话消息角色。
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * 自动化任务状态。
 */
export type AutomationStatus = "active" | "paused" | "draft";

/**
 * FrontisAI Web 端一级导航项定义。
 */
export interface FrontisWebTabItem {
  key: FrontisWebTabKey;
  label: string;
  labels?: Partial<Record<FrontisWebRole, string>>;
  icon: ReactNode;
  roles: FrontisWebRole[];
}

/**
 * 工作站信息。
 */
export interface WorkspaceItem {
  id: string;
  name: string;
  type: WorkspaceType;
  status: StatusTone;
  region: string;
  summary: string;
  runtimeHint: string;
  activationCode?: string;
  activationExpiresAt?: string;
  activationValidDays?: number;
  activationHint?: string;
}

/**
 * AI 员工信息。
 */
export interface EmployeeItem {
  id: string;
  name: string;
  avatarUrl?: string;
  role: string;
  status: StatusTone;
  workspaceId: string;
  connectionMode: ConnectionMode;
  model: string;
  summary: string;
  lastAction: string;
  source: EmployeeSource;
  visibility: EmployeeVisibility;
  subAgentModel?: string;
  agentId: string;
  runtimeAgentId: string;
  boundMembers: string[];
  welcomeMessage: string;
  systemPrompt: string;
  skills?: string[];
}

/**
 * 附件信息。
 */
export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  sizeLabel: string;
  mimeType: string;
  url?: string;
}

/**
 * 聊天消息。
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  author: string;
  content: string;
  timeLabel: string;
  attachments?: AttachmentItem[];
  blocks?: Block[];
}

/**
 * 单聊会话信息。
 */
export interface DialogueSessionItem {
  id: string;
  employeeId: string;
  title: string;
  preview: string;
  updatedAt: string;
  messages: ChatMessage[];
}

/**
 * 群聊频道信息。
 */
export interface ChannelItem {
  id: string;
  name: string;
  spaceName: string;
  summary: string;
  status: StatusTone;
  members: string[];
}

/**
 * 技能信息。
 */
export interface SkillItem {
  id: string;
  name: string;
  category: string;
  summary: string;
  installedFor: string[];
  supportAutomation: boolean;
}

/**
 * 自动化任务信息。
 */
export interface AutomationTaskItem {
  id: string;
  title: string;
  employeeId: string;
  scope: string;
  schedule: string;
  status: AutomationStatus;
  lastRun: string;
  summary: string;
}

/**
 * FrontisAI Web 端用户角色。
 */
export type FrontisUserRole = "admin" | "member";

/**
 * FrontisAI Web 端用户状态。
 */
export type FrontisUserStatus = "active" | "disabled";

/**
 * FrontisAI Web 端用户信息。
 */
export interface FrontisWebUserItem {
  id: string;
  name: string;
  phone: string;
  role: FrontisUserRole;
  status: FrontisUserStatus;
  assignedAgentIds: string[];
  lastActiveAt: string;
  dialogueCount: number;
  tokenUsage: number;
  resultCount: number;
}
