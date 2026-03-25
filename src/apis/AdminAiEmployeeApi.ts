import { httpClient } from "@/utils/http";

/**
 * AI 员工远程状态。
 */
export type AdminAiEmployeeRemoteStatus =
  | "online"
  | "executing"
  | "offline"
  | "connection_failed"
  | "revoked";

export type AdminAiEmployeeProvisioningStatus = "pending" | "applying" | "applied" | "failed";

interface UnknownRecord {
  [key: string]: unknown;
}

const createRequestKey = (value: Record<string, unknown>): string =>
  JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const fieldValue = value[key];
        if (fieldValue !== undefined) {
          result[key] = fieldValue;
        }
        return result;
      }, {}),
  );

const aiEmployeeListInFlight = new Map<string, Promise<AdminAiEmployeeListResponse>>();
const aiEmployeeListFailureCooldown = new Map<string, { message: string; expiresAt: number }>();
const aiEmployeeDetailInFlight = new Map<number, Promise<AdminAiEmployeeDetail>>();
const aiEmployeeOwnerCandidatesInFlight = new Map<
  string,
  Promise<AdminAiEmployeeOwnerCandidate[]>
>();
const aiEmployeeOwnersInFlight = new Map<number, Promise<AdminAiEmployeeOwnerItem[]>>();
const AI_EMPLOYEE_LIST_FAILURE_COOLDOWN_MS = 10_000;

/**
 * 协作智能体标签。
 */
export interface CoworkerAgentLabels extends Record<string, string | null | undefined> {
  role?: string | null;
  runtime_id?: string | null;
  primary_model?: string | null;
  subagent_model?: string | null;
}

/**
 * 协作智能体信息（原始结构）。
 */
export interface CoworkerAgentInfo {
  inventory_id: string;
  source: "coworker" | "openclaw";
  managed_by_coworker: boolean;
  visible_to_all: boolean;
  coworker_agent_id?: number | null;
  agent_id?: number | null;
  name: string;
  type: string;
  agent_code: string;
  description: string | null;
  labels: CoworkerAgentLabels;
  system_profile: string | null;
  runtime_id: string | null;
  primary_model: string | null;
  subagent_model: string | null;
  fallback_models: string[];
  default_runtime_provider: string | null;
  avatar_source?: "preset" | "upload" | null;
  avatar_preset_id?: number | null;
  avatar_attachment_id?: number | null;
  avatar_url?: string | null;
  status: string;
  runtime_provisioning_status?: string | null;
  runtime_agent_id?: string | null;
  runtime_status_message?: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * AI 员工列表项。
 */
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
  labels?: CoworkerAgentLabels;
  system_profile?: string | null;
  model?: string | null;
  primary_model?: string | null;
  subagent_model?: string | null;
  runtime_id?: string | null;
  fallback_models?: string[];
  default_runtime_provider?: string | null;
  avatar_source?: "preset" | "upload" | null;
  avatar_preset_id?: number | null;
  avatar_attachment_id?: number | null;
  avatar_url?: string | null;
  status?: string;
  runtime_provisioning_status?: string | null;
  runtime_agent_id?: string | null;
  runtime_status_message?: string | null;
  created_at?: number;
  updated_at?: number;
}

/**
 * AI 员工列表查询参数。
 */
export interface AdminAiEmployeeListParams {
  keyword?: string;
  type?: string;
  agent_code?: string;
  status?: string;
  source?: "coworker" | "openclaw";
  runtime_id?: string;
  runtime_provisioning_status?: string;
  manageable_only?: boolean;
  visible_only?: boolean;
  skip?: number;
  limit?: number;
}

/**
 * AI 员工列表响应。
 */
export interface AdminAiEmployeeListResponse {
  items: AdminAiEmployeeListItem[];
  total: number;
}

/**
 * AI 员工详情。
 */
export interface AdminAiEmployeeDetail {
  id: string;
  source: "coworker" | "openclaw";
  managed_by_coworker: boolean;
  visible_to_all: boolean;
  coworker_agent_id?: number | null;
  name: string;
  type: string;
  role?: string;
  agent_code: string;
  description: string | null;
  labels: CoworkerAgentLabels;
  system_profile: string | null;
  agent_id?: number | null;
  model?: string | null;
  primary_model: string | null;
  subagent_model: string | null;
  fallback_models: string[];
  runtime_id: string | null;
  default_runtime_provider: string | null;
  avatar_source?: "preset" | "upload" | null;
  avatar_preset_id?: number | null;
  avatar_attachment_id?: number | null;
  avatar_url?: string | null;
  status: string;
  runtime_provisioning_status?: string | null;
  runtime_agent_id?: string | null;
  runtime_status_message?: string | null;
  created_at: number;
  updated_at: number;
  remote_status: AdminAiEmployeeRemoteStatus;
  remote_status_message?: string;
  markdown_documents?: AdminAiEmployeeMarkdownDocument[];
}

export interface AdminAiEmployeeMarkdownDocument {
  document_id:
    | "soul"
    | "user"
    | "tools"
    | "identity"
    | "heartbeat"
    | "agents"
    | "boot"
    | "bootstrap";
  file_name: string;
  display_name: string;
  description: string;
  content: string;
  content_hash?: string;
  updated_at?: string;
}

export interface AdminAiEmployeeOwnerCandidate {
  identityId: number;
  username?: string;
  phone?: string;
  email?: string;
  isOwner: boolean;
  isTenantAdmin: boolean;
}

export interface AdminAiEmployeeOwnerItem {
  ownerIdentityId: number;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  assignedAt?: string | null;
}

/**
 * 执行模型选项。
 */
export interface AdminAiEmployeeModelOption {
  label: string;
  value: string;
}

/**
 * 新建 AI 员工参数。
 */
export interface CreateAdminAiEmployeeParams {
  name: string;
  role: string;
  runtime_id: string;
  primary_model: string;
  subagent_model?: string | null;
  visible_to_all?: boolean;
  owner_identity_ids?: number[];
  runtime_provider?: string;
  avatar_source?: "preset" | "upload";
  avatar_preset_id?: number | null;
  avatar_attachment_id?: number | null;
}

/**
 * 更新 AI 员工参数。
 */
export interface UpdateAdminAiEmployeeParams {
  name: string;
  role: string;
  runtime_id?: string | null;
  primary_model?: string | null;
  subagent_model?: string | null;
  visible_to_all?: boolean;
  owner_identity_ids?: number[];
  runtime_provider?: string;
  avatar_source?: "preset" | "upload";
  avatar_preset_id?: number | null;
  avatar_attachment_id?: number | null;
  status?: string;
}

/**
 * 删除 AI 员工参数。
 */
export interface DeleteAdminAiEmployeeParams {
  reason?: string;
}

export interface UpdateAdminAiEmployeeMarkdownDocumentsParams {
  documents: Array<{
    document_id: AdminAiEmployeeMarkdownDocument["document_id"];
    content: string;
  }>;
}

export interface ImportOpenClawAgentParams {
  runtime_id: string;
  runtime_agent_id: string;
  name?: string;
}

export interface ReapplyAdminAiEmployeeRuntimeResponse {
  agent_id: number;
  runtime_id: string;
  reapplied: boolean;
  desired_generation?: number;
  desired_hash?: string;
  updated_at?: string;
}

const resolveRecord = (value: unknown): UnknownRecord | undefined =>
  value && typeof value === "object" ? (value as UnknownRecord) : undefined;

const readStringField = (record: UnknownRecord | undefined, keys: string[]): string | undefined => {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
};

const readNullableStringField = (
  record: UnknownRecord | undefined,
  keys: string[],
): string | null | undefined => {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (value === null) return null;
    if (typeof value === "string") return value.trim() || value;
  }
  return undefined;
};

const readNumberField = (record: UnknownRecord | undefined, keys: string[]): number | undefined => {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
};

const readBooleanField = (
  record: UnknownRecord | undefined,
  keys: string[],
): boolean | undefined => {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1") return true;
      if (normalized === "false" || normalized === "0") return false;
    }
  }
  return undefined;
};

const readArrayField = (record: UnknownRecord | undefined, keys: string[]): unknown[] => {
  if (!record) return [];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const readStringArrayField = (record: UnknownRecord | undefined, keys: string[]): string[] =>
  readArrayField(record, keys)
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean);

const resolveCoworkerAgentLabels = (value: unknown): CoworkerAgentLabels => {
  const labelRecord = resolveRecord(value);
  if (!labelRecord) return {};

  return Object.entries(labelRecord).reduce<CoworkerAgentLabels>((result, [key, itemValue]) => {
    if (typeof itemValue === "string") {
      result[key] = itemValue;
      return result;
    }
    if (itemValue === null) {
      result[key] = null;
    }
    return result;
  }, {});
};

const normalizeCoworkerAgentInfo = (payload: unknown): CoworkerAgentInfo | null => {
  const record = resolveRecord(payload);
  if (!record) return null;

  const source =
    (readStringField(record, ["source"])?.trim().toLowerCase() as
      | "coworker"
      | "openclaw"
      | undefined) ?? "coworker";
  const inventoryId =
    readStringField(record, ["inventory_id"]) ??
    (source === "coworker"
      ? `coworker:${readNumberField(record, ["coworker_agent_id", "agent_id", "id"]) ?? "unknown"}`
      : `openclaw:${readStringField(record, ["runtime_id"]) ?? "-"}:${readStringField(record, ["runtime_agent_id", "id"]) ?? "unknown"}`);
  const coworkerAgentId = readNumberField(record, ["coworker_agent_id", "agent_id", "id"]) ?? null;

  const labels = resolveCoworkerAgentLabels(record.labels);
  const runtimeId = readNullableStringField(record, ["runtime_id"]) ?? labels.runtime_id ?? null;
  const primaryModel =
    readNullableStringField(record, ["primary_model", "model"]) ?? labels.primary_model ?? null;
  const subagentModel =
    readNullableStringField(record, ["subagent_model"]) ?? labels.subagent_model ?? null;

  return {
    inventory_id: inventoryId,
    source,
    managed_by_coworker: Boolean(record.managed_by_coworker ?? source === "coworker"),
    visible_to_all: readBooleanField(record, ["visible_to_all", "visibleToAll"]) ?? false,
    coworker_agent_id: coworkerAgentId,
    agent_id: coworkerAgentId,
    name: readStringField(record, ["name", "agent_name"]) ?? `AI-${coworkerAgentId ?? inventoryId}`,
    type: readStringField(record, ["type"]) ?? "agent",
    agent_code: readStringField(record, ["agent_code"]) ?? "",
    description: readNullableStringField(record, ["description"]) ?? null,
    labels,
    system_profile: readNullableStringField(record, ["system_profile"]) ?? null,
    runtime_id: runtimeId,
    primary_model: primaryModel,
    subagent_model: subagentModel,
    fallback_models: readStringArrayField(record, ["fallback_models", "models"]),
    default_runtime_provider: readNullableStringField(record, ["default_runtime_provider"]) ?? null,
    avatar_source:
      (readNullableStringField(record, ["avatar_source", "avatarSource"]) as
        | "preset"
        | "upload"
        | null
        | undefined) ?? null,
    avatar_preset_id: readNumberField(record, ["avatar_preset_id", "avatarPresetId"]) ?? null,
    avatar_attachment_id:
      readNumberField(record, ["avatar_attachment_id", "avatarAttachmentId"]) ?? null,
    avatar_url: readNullableStringField(record, ["avatar_url", "avatarUrl", "avatar"]) ?? null,
    status: readStringField(record, ["status"]) ?? "active",
    runtime_provisioning_status:
      readNullableStringField(record, ["runtime_provisioning_status"]) ?? null,
    runtime_agent_id: readNullableStringField(record, ["runtime_agent_id"]) ?? null,
    runtime_status_message:
      readNullableStringField(record, ["runtime_status_message", "status_message"]) ?? null,
    created_at: readNumberField(record, ["created_at"]) ?? 0,
    updated_at: readNumberField(record, ["updated_at"]) ?? 0,
  };
};

const resolveRemoteStatus = (value?: string): AdminAiEmployeeRemoteStatus => {
  if (!value) return "offline";
  const normalizedValue = value.trim().toLowerCase();
  if (
    ["online", "active", "ready", "healthy", "connected"].some(token =>
      normalizedValue.includes(token),
    )
  ) {
    return "online";
  }
  if (["executing", "running", "busy"].some(token => normalizedValue.includes(token))) {
    return "executing";
  }
  if (
    ["connection_failed", "connect_failed", "failed", "error"].some(token =>
      normalizedValue.includes(token),
    )
  ) {
    return "connection_failed";
  }
  if (normalizedValue.includes("revoked")) {
    return "revoked";
  }
  return "offline";
};

const resolveAiEmployeeListPayload = (
  payload: unknown,
): {
  items: unknown[];
  total?: number;
} => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      total: payload.length,
    };
  }

  const rootRecord = resolveRecord(payload);
  if (!rootRecord) return { items: [] };

  const rootItems = readArrayField(rootRecord, ["items", "list", "rows"]);
  if (rootItems.length) {
    return {
      items: rootItems,
      total: readNumberField(rootRecord, ["total", "count"]),
    };
  }

  const rootData = rootRecord.data;
  if (Array.isArray(rootData)) {
    return {
      items: rootData,
      total: rootData.length,
    };
  }

  const dataRecord = resolveRecord(rootData);
  if (!dataRecord) return { items: [] };

  const dataItems = readArrayField(dataRecord, ["items", "list", "rows"]);
  if (dataItems.length) {
    return {
      items: dataItems,
      total: readNumberField(dataRecord, ["total", "count"]),
    };
  }

  return { items: [] };
};

const normalizeAiEmployeeListItem = (item: CoworkerAgentInfo): AdminAiEmployeeListItem => {
  const role =
    item.agent_code || item.labels.role || item.description || item.system_profile || undefined;
  return {
    id: item.inventory_id,
    source: item.source,
    managed_by_coworker: item.managed_by_coworker,
    visible_to_all: item.visible_to_all,
    coworker_agent_id: item.coworker_agent_id ?? null,
    name: item.name,
    remote_status: resolveRemoteStatus(item.status),
    type: item.type,
    role,
    agent_code: item.agent_code,
    description: item.description,
    labels: item.labels,
    system_profile: item.system_profile,
    model: item.primary_model ?? undefined,
    primary_model: item.primary_model,
    subagent_model: item.subagent_model,
    runtime_id: item.runtime_id,
    fallback_models: item.fallback_models,
    default_runtime_provider: item.default_runtime_provider,
    avatar_source: item.avatar_source ?? null,
    avatar_preset_id: item.avatar_preset_id ?? null,
    avatar_attachment_id: item.avatar_attachment_id ?? null,
    avatar_url: item.avatar_url ?? null,
    status: item.status,
    runtime_provisioning_status: item.runtime_provisioning_status ?? null,
    runtime_agent_id: item.runtime_agent_id ?? null,
    runtime_status_message: item.runtime_status_message ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
};

const normalizeAiEmployeeDetail = (payload: unknown, fallbackId: number): AdminAiEmployeeDetail => {
  const record = resolveRecord(payload);
  const coworkerAgent = normalizeCoworkerAgentInfo(payload);
  const numericId = coworkerAgent?.coworker_agent_id ?? fallbackId;
  const id = coworkerAgent?.inventory_id ?? `coworker:${numericId}`;
  const role =
    coworkerAgent?.agent_code ||
    coworkerAgent?.labels.role ||
    coworkerAgent?.description ||
    coworkerAgent?.system_profile ||
    readStringField(record, ["role"]);

  return {
    id,
    source: coworkerAgent?.source ?? "coworker",
    managed_by_coworker: coworkerAgent?.managed_by_coworker ?? true,
    visible_to_all: coworkerAgent?.visible_to_all ?? false,
    coworker_agent_id: coworkerAgent?.coworker_agent_id ?? numericId,
    name: coworkerAgent?.name ?? readStringField(record, ["name", "agent_name"]) ?? `AI-${id}`,
    type: coworkerAgent?.type ?? "agent",
    role,
    agent_code: coworkerAgent?.agent_code ?? "",
    description: coworkerAgent?.description ?? null,
    labels: coworkerAgent?.labels ?? {},
    system_profile: coworkerAgent?.system_profile ?? null,
    agent_id: coworkerAgent?.agent_id ?? readNumberField(record, ["agent_id", "id"]) ?? numericId,
    model: coworkerAgent?.primary_model ?? undefined,
    primary_model: coworkerAgent?.primary_model ?? null,
    subagent_model: coworkerAgent?.subagent_model ?? null,
    fallback_models: coworkerAgent?.fallback_models ?? [],
    runtime_id: coworkerAgent?.runtime_id ?? null,
    default_runtime_provider: coworkerAgent?.default_runtime_provider ?? null,
    avatar_source: coworkerAgent?.avatar_source ?? null,
    avatar_preset_id: coworkerAgent?.avatar_preset_id ?? null,
    avatar_attachment_id: coworkerAgent?.avatar_attachment_id ?? null,
    avatar_url: coworkerAgent?.avatar_url ?? null,
    status: coworkerAgent?.status ?? "active",
    runtime_provisioning_status: coworkerAgent?.runtime_provisioning_status ?? null,
    runtime_agent_id: coworkerAgent?.runtime_agent_id ?? null,
    runtime_status_message: coworkerAgent?.runtime_status_message ?? null,
    created_at: coworkerAgent?.created_at ?? 0,
    updated_at: coworkerAgent?.updated_at ?? 0,
    remote_status: resolveRemoteStatus(
      readStringField(record, ["remote_status", "runtime_status"]) ?? coworkerAgent?.status,
    ),
    remote_status_message: readStringField(record, [
      "remote_status_message",
      "status_message",
      "message",
    ]),
  };
};

/**
 * 获取 AI 员工列表。
 * - GET /api/v1/coworker/agents
 */
export async function getAdminAiEmployeeList(
  params: AdminAiEmployeeListParams,
): Promise<AdminAiEmployeeListResponse> {
  const requestKey = createRequestKey({
    agent_code: params.agent_code,
    keyword: params.keyword,
    limit: params.limit,
    runtime_id: params.runtime_id,
    runtime_provisioning_status: params.runtime_provisioning_status,
    manageable_only: params.manageable_only,
    visible_only: params.visible_only,
    skip: params.skip,
    source: params.source,
    status: params.status,
    type: params.type,
  });
  const currentRequest = aiEmployeeListInFlight.get(requestKey);
  if (currentRequest) {
    return currentRequest;
  }
  const cooldown = aiEmployeeListFailureCooldown.get(requestKey);
  if (cooldown && cooldown.expiresAt > Date.now()) {
    throw new Error(cooldown.message);
  }

  const requestPromise = (async (): Promise<AdminAiEmployeeListResponse> => {
    try {
      const payload = await httpClient.get<unknown>("/api/v1/coworker/agents/inventory", {
        params: {
          keyword: params.keyword,
          type: params.type,
          agent_code: params.agent_code,
          status: params.status,
          source: params.source,
          runtime_id: params.runtime_id,
          runtime_provisioning_status: params.runtime_provisioning_status,
          manageable_only: params.manageable_only,
          visible_only: params.visible_only,
        },
      });

      const { items, total } = resolveAiEmployeeListPayload(payload);
      const sourceItems = items
        .map(item => normalizeCoworkerAgentInfo(item))
        .filter((item): item is CoworkerAgentInfo => Boolean(item));
      const normalizedItems = sourceItems.map(item => normalizeAiEmployeeListItem(item));
      aiEmployeeListFailureCooldown.delete(requestKey);

      return {
        items: normalizedItems,
        total: total ?? sourceItems.length,
      };
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "AI 员工列表加载失败，请稍后重试";
      aiEmployeeListFailureCooldown.set(requestKey, {
        message,
        expiresAt: Date.now() + AI_EMPLOYEE_LIST_FAILURE_COOLDOWN_MS,
      });
      throw error;
    } finally {
      aiEmployeeListInFlight.delete(requestKey);
    }
  })();

  aiEmployeeListInFlight.set(requestKey, requestPromise);
  return requestPromise;
}

/**
 * 获取 AI 员工详情。
 * - GET /api/v1/coworker/agents/{agent_id}
 */
export async function getAdminAiEmployeeDetail(employeeId: number): Promise<AdminAiEmployeeDetail> {
  const currentRequest = aiEmployeeDetailInFlight.get(employeeId);
  if (currentRequest) {
    return currentRequest;
  }

  const requestPromise = (async (): Promise<AdminAiEmployeeDetail> => {
    try {
      const payload = await httpClient.get<unknown>(`/api/v1/coworker/agents/${employeeId}`);
      return normalizeAiEmployeeDetail(payload, employeeId);
    } finally {
      aiEmployeeDetailInFlight.delete(employeeId);
    }
  })();

  aiEmployeeDetailInFlight.set(employeeId, requestPromise);
  return requestPromise;
}

/**
 * 新建 AI 员工。
 * - POST /api/v1/coworker/agents
 */
export async function createAdminAiEmployee(
  params: CreateAdminAiEmployeeParams,
): Promise<AdminAiEmployeeDetail> {
  const payload = await httpClient.post<unknown>("/api/v1/coworker/agents", {
    name: params.name,
    description: params.role,
    system_profile: params.role,
    default_runtime_provider: params.runtime_provider ?? "openclaw",
    status: "active",
    type: "agent",
    agent_code: params.role,
    runtime_id: params.runtime_id,
    primary_model: params.primary_model,
    subagent_model: params.subagent_model ?? undefined,
    fallback_models: [params.primary_model],
    visible_to_all: Boolean(params.visible_to_all),
    avatar_source: params.avatar_source,
    avatar_preset_id: params.avatar_preset_id,
    avatar_attachment_id: params.avatar_attachment_id,
  });
  return normalizeAiEmployeeDetail(payload, 0);
}

/**
 * 编辑 AI 员工。
 * - PUT /api/v1/coworker/agents/{agent_id}
 */
export function updateAdminAiEmployee(employeeId: number, params: UpdateAdminAiEmployeeParams) {
  const labels: CoworkerAgentLabels = {
    role: params.role,
    runtime_id: params.runtime_id ?? undefined,
    primary_model: params.primary_model ?? undefined,
    subagent_model: params.subagent_model ?? undefined,
  };

  const payload: Record<string, unknown> = {
    name: params.name,
    description: params.role,
    labels,
    system_profile: params.role,
    default_runtime_provider: params.runtime_provider ?? "openclaw",
    status: params.status ?? "active",
    type: "agent",
    agent_code: params.role,
    avatar_source: params.avatar_source,
    avatar_preset_id: params.avatar_preset_id,
    avatar_attachment_id: params.avatar_attachment_id,
  };

  if (params.runtime_id) {
    payload.runtime_id = params.runtime_id;
  }
  if (params.primary_model) {
    payload.primary_model = params.primary_model;
    payload.fallback_models = [params.primary_model];
  }
  if (Object.prototype.hasOwnProperty.call(params, "subagent_model")) {
    payload.subagent_model = params.subagent_model ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(params, "visible_to_all")) {
    payload.visible_to_all = Boolean(params.visible_to_all);
  }

  return httpClient.put<unknown>(`/api/v1/coworker/agents/${employeeId}`, payload);
}

/**
 * 删除 AI 员工。
 * - DELETE /api/v1/coworker/agents/{agent_id}
 */
export function deleteAdminAiEmployee(employeeId: number, params: DeleteAdminAiEmployeeParams) {
  const normalizedReason = params.reason?.trim();
  if (!normalizedReason) {
    return httpClient.delete<unknown>(`/api/v1/coworker/agents/${employeeId}`);
  }
  return httpClient.delete<unknown>(`/api/v1/coworker/agents/${employeeId}`, {
    data: {
      reason: normalizedReason,
    },
  });
}

export function reapplyAdminAiEmployeeRuntime(
  employeeId: number,
): Promise<ReapplyAdminAiEmployeeRuntimeResponse> {
  return httpClient.post<ReapplyAdminAiEmployeeRuntimeResponse>(
    `/api/v1/coworker/agents/${employeeId}/reapply-runtime`,
  );
}

export function importOpenClawAgentAsCoworker(params: ImportOpenClawAgentParams) {
  return httpClient.post<unknown>("/api/v1/coworker/agents/import-openclaw", params);
}

const normalizeMarkdownDocuments = (payload: unknown): AdminAiEmployeeMarkdownDocument[] => {
  const record = resolveRecord(payload);
  const data = resolveRecord(record?.data) ?? record;
  const items = Array.isArray(data?.documents) ? data.documents : [];
  return items.reduce<AdminAiEmployeeMarkdownDocument[]>((result, item) => {
    const source = resolveRecord(item);
    const documentId = readStringField(source, ["document_id"]);
    const fileName = readStringField(source, ["file_name"]);
    const displayName = readStringField(source, ["display_name"]);
    const description = readStringField(source, ["description"]);
    if (!documentId || !fileName || !displayName || !description) {
      return result;
    }
    result.push({
      document_id: documentId as AdminAiEmployeeMarkdownDocument["document_id"],
      file_name: fileName,
      display_name: displayName,
      description,
      content: String(source?.content ?? ""),
      content_hash: readStringField(source, ["content_hash"]) || undefined,
      updated_at: readStringField(source, ["updated_at"]) || undefined,
    });
    return result;
  }, []);
};

export async function getAdminAiEmployeeMarkdownDocuments(
  employeeId: number,
): Promise<AdminAiEmployeeMarkdownDocument[]> {
  const payload = await httpClient.get<unknown>(
    `/api/v1/coworker/agents/${employeeId}/markdown-docs`,
  );
  return normalizeMarkdownDocuments(payload);
}

export async function updateAdminAiEmployeeMarkdownDocuments(
  employeeId: number,
  params: UpdateAdminAiEmployeeMarkdownDocumentsParams,
): Promise<AdminAiEmployeeMarkdownDocument[]> {
  const payload = await httpClient.put<unknown>(
    `/api/v1/coworker/agents/${employeeId}/markdown-docs`,
    params,
  );
  return normalizeMarkdownDocuments(payload);
}

export async function requestAdminAiEmployeeMarkdownPull(employeeId: number): Promise<void> {
  await httpClient.post<unknown>(`/api/v1/coworker/agents/${employeeId}/markdown-docs/pull`);
}

export async function getAdminAiEmployeeOwnerCandidates(
  keyword?: string,
): Promise<AdminAiEmployeeOwnerCandidate[]> {
  const requestKey = createRequestKey({ keyword });
  const currentRequest = aiEmployeeOwnerCandidatesInFlight.get(requestKey);
  if (currentRequest) {
    return currentRequest;
  }

  const requestPromise = (async (): Promise<AdminAiEmployeeOwnerCandidate[]> => {
    try {
      const payload = await httpClient.get<unknown>("/api/v1/coworker/agents/owners/candidates", {
        params: {
          keyword,
        },
      });
      const { items } = resolveAiEmployeeListPayload(payload);
      return items.reduce<AdminAiEmployeeOwnerCandidate[]>((result, item) => {
        const record = resolveRecord(item);
        const identityId = readNumberField(record, ["identity_id", "identityId", "id"]);
        if (typeof identityId !== "number") return result;
        result.push({
          identityId,
          username: readStringField(record, ["username", "name"]),
          phone: readStringField(record, ["phone"]),
          email: readStringField(record, ["email"]),
          isOwner: Boolean(record?.is_owner),
          isTenantAdmin: Boolean(record?.is_tenant_admin),
        });
        return result;
      }, []);
    } finally {
      aiEmployeeOwnerCandidatesInFlight.delete(requestKey);
    }
  })();

  aiEmployeeOwnerCandidatesInFlight.set(requestKey, requestPromise);
  return requestPromise;
}

export async function getAdminAiEmployeeOwners(
  employeeId: number,
): Promise<AdminAiEmployeeOwnerItem[]> {
  const currentRequest = aiEmployeeOwnersInFlight.get(employeeId);
  if (currentRequest) {
    return currentRequest;
  }

  const requestPromise = (async (): Promise<AdminAiEmployeeOwnerItem[]> => {
    try {
      const payload = await httpClient.get<unknown>(`/api/v1/coworker/agents/${employeeId}/owners`);
      const record = resolveRecord(payload);
      const dataRecord = resolveRecord(record?.data);
      const source = dataRecord ?? record;
      const items = readArrayField(source, ["owners", "items", "list"]);
      return items.reduce<AdminAiEmployeeOwnerItem[]>((result, item) => {
        const ownerRecord = resolveRecord(item);
        const ownerIdentityId = readNumberField(ownerRecord, [
          "owner_identity_id",
          "ownerIdentityId",
        ]);
        if (typeof ownerIdentityId !== "number") return result;
        result.push({
          ownerIdentityId,
          username: readNullableStringField(ownerRecord, ["username"]) ?? undefined,
          phone: readNullableStringField(ownerRecord, ["phone"]) ?? undefined,
          email: readNullableStringField(ownerRecord, ["email"]) ?? undefined,
          assignedAt:
            readNullableStringField(ownerRecord, ["assigned_at", "assignedAt"]) ?? undefined,
        });
        return result;
      }, []);
    } finally {
      aiEmployeeOwnersInFlight.delete(employeeId);
    }
  })();

  aiEmployeeOwnersInFlight.set(employeeId, requestPromise);
  return requestPromise;
}

export function updateAdminAiEmployeeOwners(employeeId: number, ownerIdentityIds: number[]) {
  return httpClient.put<unknown>(`/api/v1/coworker/agents/${employeeId}/owners`, {
    owner_identity_ids: ownerIdentityIds,
  });
}
