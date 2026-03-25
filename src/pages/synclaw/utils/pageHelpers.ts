import type {
  CoworkerChannelAgentItem,
  CoworkerChannelSpaceMemberItem,
  CoworkerTenantMemberCandidateItem,
} from "@/types/prdPrototype";
import type {
  SynClawMemberItem,
  SynClawMemberKind,
  SynClawMemberStatus,
} from "@/pages/synclaw/components/SynClawChatHeader";
import type {
  SynClawAiEmployee,
  SynClawAiEmployeeGroup,
  SynClawChannelAccessRole,
  SynClawCurrentUser,
  SynClawMentionAgent,
  SynClawTenantMemberOption,
  SynClawTenantMemberSelection,
} from "@/pages/synclaw/page";
import type { SynClawSpaceItem } from "@/pages/synclaw/types";
import type { WorkspaceChatMessage } from "@/feature/workspace/types";

export const DEFAULT_CHAT_PLACEHOLDER = "输入频道消息，Shift + Enter 换行";
export const FIRST_SPACE_NAV_HINT_STORAGE_KEY = "synclaw:first-space-nav-hint-shown";
export const FIRST_SPACE_NAV_HINT_LABEL = "一个空间可以创建多个频道哦";
export const SYNCLAW_ARTIFACTS_PANEL_OPEN_KEY = "synclaw:artifacts-panel-open";
export const SYNCLAW_ARTIFACTS_PANEL_WIDTH_KEY = "synclaw:artifacts-panel-width";
export const ARTIFACTS_PANEL_DEFAULT_WIDTH = 422;
export const ARTIFACTS_PANEL_PREVIEW_WIDTH = 760;
export const ARTIFACTS_PANEL_MIN_WIDTH = 320;
export const ARTIFACTS_PANEL_MAX_WIDTH = 860;
export const EMPTY_SYNCLAW_SPACES: SynClawSpaceItem[] = [];
export const DEFAULT_CHAT_MESSAGES: WorkspaceChatMessage[] = [];
export const SYNCLAW_AGENT_MENTION_REGEX = /(^|[\s\n])@([^\s@，。！？、,:：;；()（）【】<>《》]+)/g;
export const SYNCLAW_SIDEBAR_COLLAPSED_KEY = "synclaw:sidebar-collapsed";
export const SYNCLAW_SIDEBAR_WIDTH_KEY = "synclaw:sidebar-width";
export const SIDEBAR_COLLAPSED_WIDTH = 48;
export const SIDEBAR_DEFAULT_WIDTH = 318;
export const SIDEBAR_MIN_WIDTH = 260;
export const SIDEBAR_MAX_WIDTH = 420;

/**
 * 计算 AI 员工是否可绑定及禁用原因。
 */
export const resolveAiEmployeeDisabledReason = (item: {
  managed_by_coworker?: boolean;
  coworker_agent_id?: number | null;
  runtime_id?: string | null;
  runtime_provisioning_status?: string | null;
}): string | undefined => {
  if (
    !item.managed_by_coworker ||
    typeof item.coworker_agent_id !== "number" ||
    item.coworker_agent_id <= 0
  ) {
    return "不是 coworker 受管员工";
  }
  if (!item.runtime_id || !item.runtime_id.trim()) {
    return "未绑定工作站";
  }
  const provisioningStatus = String(item.runtime_provisioning_status || "")
    .trim()
    .toLowerCase();
  if (!provisioningStatus) {
    return "未收到 Runtime 生效状态";
  }
  if (provisioningStatus !== "applied") {
    return `未生效（${provisioningStatus}）`;
  }
  return undefined;
};

/**
 * 按工作站分组 AI 员工，用于弹窗分组展示。
 */
export const groupAiEmployeesByWorkspace = (
  items: SynClawAiEmployee[],
): SynClawAiEmployeeGroup[] => {
  const grouped = items.reduce<Map<string, SynClawAiEmployeeGroup>>((result, item) => {
    const workspaceKey = item.runtimeId || "unbound";
    const current = result.get(workspaceKey);
    if (current) {
      current.items.push(item);
      return result;
    }
    result.set(workspaceKey, {
      workspaceKey,
      workspaceName: item.runtimeName || "未绑定工作站",
      items: [item],
    });
    return result;
  }, new Map<string, SynClawAiEmployeeGroup>());

  return Array.from(grouped.values()).sort((left, right) =>
    left.workspaceName.localeCompare(right.workspaceName, "zh-CN"),
  );
};

type SynClawAiEmployeeStatusTone = "default" | "success" | "warning" | "danger";

/**
 * 生成 SynClaw AI 员工头像占位字符。
 */
export const resolveAiEmployeeAvatarText = (name: string): string => {
  const normalized = name.trim();
  if (!normalized) return "AI";
  return Array.from(normalized).slice(0, 2).join("").toUpperCase();
};

/**
 * 生成 SynClaw AI 员工状态标签与描述文案。
 */
export const resolveAiEmployeeStatusMeta = (
  employee: SynClawAiEmployee,
): {
  label: string;
  tone: SynClawAiEmployeeStatusTone;
  description: string;
} => {
  if (!employee.bindable) {
    return {
      label: "不可绑定",
      tone: "danger",
      description: employee.disabledReason || "当前 AI 员工暂不可用于频道协作",
    };
  }

  const provisioningStatus = (employee.provisioningStatus || "").trim().toLowerCase();
  if (provisioningStatus && provisioningStatus !== "applied") {
    return {
      label: "准备中",
      tone: "warning",
      description: `工作站正在同步，当前状态：${provisioningStatus}`,
    };
  }

  const remoteStatus = (employee.remoteStatus || "").trim().toLowerCase();
  if (remoteStatus === "online" || remoteStatus === "executing") {
    return {
      label: remoteStatus === "executing" ? "工作中" : "在线",
      tone: "success",
      description: employee.runtimeId ? "已接入工作站，可直接加入当前频道" : "可直接加入当前频道",
    };
  }

  if (remoteStatus === "offline" || remoteStatus === "connection_failed") {
    return {
      label: "离线",
      tone: "default",
      description: employee.runtimeId ? "工作站暂时离线，但仍可加入频道" : "当前可加入频道",
    };
  }

  return {
    label: "可绑定",
    tone: "default",
    description: employee.runtimeId ? "已接入工作站，可直接加入当前频道" : "可直接加入当前频道",
  };
};

/**
 * 统一动作错误文案，兼容后端错误消息与前端兜底文案。
 */
export const resolveActionErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message === "INVALID_AGENT_ID") {
      return "当前选择里包含不可绑定的 AI 员工，请重新选择后再保存";
    }
    if (message) {
      return message;
    }
  }
  return fallback;
};

/**
 * 将租户成员候选项归一化为 UI 可直接渲染的选项。
 */
export const normalizeTenantMemberOptions = (
  items: CoworkerTenantMemberCandidateItem[],
): SynClawTenantMemberOption[] =>
  items.map(item => ({
    id: item.identityId,
    name: item.username || item.phone || item.email || `员工-${item.identityId}`,
    subtitle: item.phone || item.email || undefined,
  }));

/**
 * 将频道成员数据归一化为弹窗可提交的成员权限列表。
 */
export const normalizeSelectedTenantMembers = (
  members: CoworkerChannelSpaceMemberItem[],
  currentUser?: SynClawCurrentUser,
): SynClawTenantMemberSelection[] =>
  members
    .filter(item => item.identityId && String(currentUser?.id || "") !== item.identityId)
    .map(item => ({
      identityId: item.identityId,
      accessRole: resolveChannelAccessRole(item.accessRole, item.role),
    }));

/**
 * 归一化频道成员权限角色，兼容 role / accessRole 两种后端字段。
 */
export const resolveChannelAccessRole = (
  accessRole?: string,
  fallbackRole?: string,
): SynClawChannelAccessRole => {
  const normalized = (accessRole || fallbackRole || "").trim().toLowerCase();
  if (
    normalized === "owner" ||
    normalized === "manager" ||
    normalized === "speaker" ||
    normalized === "viewer"
  ) {
    return normalized;
  }
  return "viewer";
};

/**
 * 将频道成员角色归一化为弹窗编辑态可回显的权限。
 * 需要保留 owner / manager，避免回显时被错误压缩为 viewer。
 */
export const resolveEditableChannelAccessRole = (
  accessRole?: string,
  fallbackRole?: string,
): SynClawChannelAccessRole => resolveChannelAccessRole(accessRole, fallbackRole);

/**
 * 将频道成员权限角色映射为中文展示文案。
 */
export const resolveChannelAccessRoleLabel = (role: SynClawChannelAccessRole): string => {
  switch (role) {
    case "owner":
      return "所有者";
    case "manager":
      return "管理员";
    case "speaker":
      return "可发言";
    case "viewer":
    default:
      return "仅观看";
  }
};

/**
 * 生成频道 Agent 选择快照，用于忽略顺序差异的内容比较。
 */
export const buildAgentSelectionSnapshot = (agentIds: string[]): string =>
  Array.from(new Set(agentIds.map(item => item.trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, "zh-CN"))
    .join("|");

/**
 * 生成频道员工权限选择快照，用于忽略顺序差异的内容比较。
 */
export const buildChannelMemberSelectionSnapshot = (
  tenantMembers: SynClawTenantMemberSelection[],
): string =>
  tenantMembers
    .filter(item => item.identityId.trim())
    .map(item => ({
      identityId: item.identityId.trim(),
      accessRole: item.accessRole,
    }))
    .sort((left, right) => {
      const idCompare = left.identityId.localeCompare(right.identityId, "zh-CN");
      if (idCompare !== 0) return idCompare;
      return left.accessRole.localeCompare(right.accessRole, "zh-CN");
    })
    .map(item => `${item.identityId}:${item.accessRole}`)
    .join("|");

/**
 * 构造成果面板打开态缓存 key。
 */
export const buildArtifactsPanelOpenStorageKey = (channelId: string): string =>
  `${SYNCLAW_ARTIFACTS_PANEL_OPEN_KEY}:${channelId}`;

/**
 * 构造成果面板宽度缓存 key。
 */
export const buildArtifactsPanelWidthStorageKey = (channelId: string): string =>
  `${SYNCLAW_ARTIFACTS_PANEL_WIDTH_KEY}:${channelId}`;

const resolveSpaceMemberKind = (identityType?: string): SynClawMemberKind => {
  const normalized = (identityType || "").trim().toLowerCase();
  if (!normalized) return "human";
  if (normalized.includes("ai") || normalized.includes("agent") || normalized.includes("bot")) {
    return "ai";
  }
  return "human";
};

const resolveSpaceMemberStatus = (status?: string): SynClawMemberStatus => {
  const normalized = (status || "").trim().toLowerCase();
  if (!normalized) return "online";
  if (normalized === "active" || normalized === "online" || normalized === "enabled") {
    return "online";
  }
  return "offline";
};

const resolveSpaceMemberAvatarText = (displayName: string): string => {
  const normalized = displayName.trim();
  if (!normalized) return "?";
  return Array.from(normalized)[0] ?? normalized;
};

/**
 * 归一化频道/空间成员为 Header 组件可用数据结构。
 */
export const normalizeSpaceMembers = (
  members: CoworkerChannelSpaceMemberItem[],
): SynClawMemberItem[] => {
  const identityIds = new Set<string>();
  const list: SynClawMemberItem[] = [];

  members.forEach(item => {
    if (!item.identityId || identityIds.has(item.identityId)) return;
    identityIds.add(item.identityId);
    const accessRole = resolveChannelAccessRole(item.accessRole, item.role);
    list.push({
      id: item.identityId,
      name: item.displayName,
      kind: resolveSpaceMemberKind(item.identityType),
      status: resolveSpaceMemberStatus(item.status),
      avatarUrl: item.avatarUrl,
      avatarText: resolveSpaceMemberAvatarText(item.displayName),
      accessRole,
      roleLabel: resolveChannelAccessRoleLabel(accessRole),
      fixed: accessRole === "owner",
    });
  });

  return list;
};

const resolveCurrentUserMember = (
  currentUser?: SynClawCurrentUser,
): SynClawMemberItem | undefined => {
  if (!currentUser) return undefined;
  const displayName = currentUser.username?.trim() || currentUser.phone?.trim() || "我";
  return {
    id: String(currentUser.id),
    name: displayName,
    kind: "human",
    status: "online",
    avatarUrl: currentUser.avatar,
    avatarText: resolveSpaceMemberAvatarText(displayName),
  };
};

/**
 * 将当前登录用户并入成员列表，保证头像/昵称展示完整。
 */
export const mergeCurrentUserMember = (
  members: SynClawMemberItem[],
  currentUser?: SynClawCurrentUser,
): SynClawMemberItem[] => {
  const currentUserMember = resolveCurrentUserMember(currentUser);
  if (!currentUserMember) return members;

  const matchedIndex = members.findIndex(member => member.id === currentUserMember.id);
  if (matchedIndex < 0) {
    return [currentUserMember, ...members];
  }

  const nextMembers = [...members];
  const matchedMember = nextMembers[matchedIndex];
  nextMembers[matchedIndex] = {
    ...matchedMember,
    avatarUrl: matchedMember.avatarUrl || currentUserMember.avatarUrl,
    avatarText: matchedMember.avatarText || currentUserMember.avatarText,
  };
  return nextMembers;
};

const normalizeMentionLookupKey = (value: string): string =>
  value.trim().replace(/^@+/, "").toLowerCase();

/**
 * 生成 actor id 的别名集合，统一头像映射键。
 */
export const buildActorNameAliases = (rawId: string): string[] => {
  const normalizedId = rawId.trim();
  if (!normalizedId) return [];

  const aliases = new Set<string>([normalizedId]);
  if (/^\d+$/.test(normalizedId)) {
    aliases.add(`identity-${normalizedId}`);
  }
  if (normalizedId.startsWith("identity-")) {
    const numericId = normalizedId.slice("identity-".length);
    if (/^\d+$/.test(numericId)) {
      aliases.add(numericId);
    }
  }

  return Array.from(aliases);
};

/**
 * 构造可 @ 的 Agent 列表，包含 alias/显示名关键字。
 */
export const buildMentionAgents = (
  agents: CoworkerChannelAgentItem[],
  members: SynClawMemberItem[],
  aiEmployees: SynClawAiEmployee[] = [],
): SynClawMentionAgent[] => {
  const aiMemberNameMap = new Map<string, string>();
  members.forEach(member => {
    if (member.kind !== "ai" || !member.id.trim()) return;
    aiMemberNameMap.set(member.id, member.name.trim());
  });

  const aiEmployeeNameMap = new Map<string, string>();
  aiEmployees.forEach(employee => {
    const displayName = employee.name.trim();
    if (!displayName) return;
    const employeeId = employee.id.trim();
    if (employeeId) {
      aiEmployeeNameMap.set(employeeId, displayName);
    }
    const runtimeAgentId = employee.runtimeAgentId?.trim();
    if (runtimeAgentId) {
      aiEmployeeNameMap.set(runtimeAgentId, displayName);
    }
  });

  return agents.reduce<SynClawMentionAgent[]>((result, agent) => {
    const agentId = agent.agentId.trim();
    if (!agentId) return result;
    const displayName =
      aiMemberNameMap.get(agentId) ||
      aiEmployeeNameMap.get(agentId) ||
      agent.alias?.trim() ||
      agentId;
    const keywords = Array.from(
      new Set(
        [agentId, agent.alias?.trim(), displayName]
          .filter((item): item is string => Boolean(item && item.trim()))
          .map(item => normalizeMentionLookupKey(item)),
      ),
    );

    result.push({
      agentId,
      displayName,
      alias: agent.alias?.trim() || undefined,
      keywords,
    });
    return result;
  }, []);
};

/**
 * 将输入文本中的 @alias/@name 解析为后端消息格式与目标 Agent 列表。
 */
export const resolveMentionPayload = (
  content: string,
  agents: SynClawMentionAgent[],
): { message: string; targetAgentIds: string[] } => {
  const lookup = new Map<string, SynClawMentionAgent>();
  agents.forEach(agent => {
    agent.keywords.forEach(keyword => {
      lookup.set(keyword, agent);
    });
  });

  const targetAgentIds: string[] = [];
  const targetedAgentIdSet = new Set<string>();
  const messageText = content.replace(
    SYNCLAW_AGENT_MENTION_REGEX,
    (match: string, prefix: string, rawToken: string) => {
      const matchedAgent = lookup.get(normalizeMentionLookupKey(rawToken));
      if (!matchedAgent) return match;
      if (!targetedAgentIdSet.has(matchedAgent.agentId)) {
        targetedAgentIdSet.add(matchedAgent.agentId);
        targetAgentIds.push(matchedAgent.agentId);
      }
      return `${prefix}<@${matchedAgent.agentId}|${matchedAgent.displayName}>`;
    },
  );

  return {
    message: messageText.trim(),
    targetAgentIds,
  };
};
