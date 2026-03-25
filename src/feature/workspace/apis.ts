import {
  createAttachment,
  getSpaceDataPreview,
  getStorageSTS,
  type AttachmentResponse,
  type CreateAttachmentRequest,
  type SpaceDataPreviewResponse,
  type StorageSTSResponse,
} from "@/apis/FileApi";
import { listSessions, type SessionListParams, type SessionListResponse } from "@/apis/SessionApi";
import { getSpaceAgents, unbindAgent } from "@/apis/HomeApi";
import {
  bindSpaceData,
  createSpaceDataFromArtifact,
  createSpace,
  getSpaceArtifacts,
  getSpaceById,
  getSpaceData,
  updateSpace,
  SpaceDataSourceType,
  SpaceDataType,
  type BindSpaceDataFileItem,
  type CreateSpaceRequest,
  type SpaceArtifactsResponse,
  type CreateSpaceDataFromArtifactRequest,
  type SpaceDataItem,
  type SpaceDataParams,
  type SpaceItem,
  deleteSpaceData,
  retrySpaceData,
} from "@/apis/WorkSpaceApi";
import type {
  WorkspaceAgentItem,
  WorkspaceArtifactGroup,
  WorkspaceArtifactItem,
  WorkspaceArtifactsQuery,
  WorkspaceArtifactsResult,
} from "./types";

/**
 * fetchWorkspaceById
 *
 * 获取工作空间详情（Space）。
 */
export const fetchWorkspaceById = async (id: number): Promise<SpaceItem> => getSpaceById(id);

/**
 * fetchWorkspaceDocs
 *
 * 获取工作空间的知识库文档列表。
 */
export const fetchWorkspaceDocs = async (
  id: number,
  params: SpaceDataParams = {},
): Promise<SpaceDataItem[]> => getSpaceData(id, params);

/**
 * createWorkspace
 *
 * 创建工作空间（Space）。
 */
export const createWorkspace = async (data: CreateSpaceRequest = {}): Promise<SpaceItem> =>
  createSpace(data);

/**
 * updateWorkspace
 *
 * 更新工作空间（目前用于修改名称/封面）。
 */
export const updateWorkspace = async (
  id: number,
  data: Partial<Pick<SpaceItem, "name" | "cover">>,
): Promise<void> => {
  await updateSpace(id, data);
};

/**
 * fetchWorkspaceUploadSTS
 *
 * 获取上传文件所需的临时凭证（STS）。
 */
export const fetchWorkspaceUploadSTS = async (): Promise<StorageSTSResponse> => getStorageSTS();

/**
 * createWorkspaceAttachment
 *
 * 创建对话附件记录（上传到 COS 后调用 /api/v1/attachments）。
 */
export const createWorkspaceAttachment = async (
  data: CreateAttachmentRequest,
): Promise<AttachmentResponse> => createAttachment(data);

/**
 * bindUploadedFileToWorkspace
 *
 * 将已上传到 COS 的文件绑定到指定工作空间的数据列表（触发后端分析流程）。
 */
export const bindUploadedFileToWorkspace = async (
  spaceId: number,
  data: Omit<BindSpaceDataFileItem, "source_type" | "type">,
): Promise<unknown> =>
  bindSpaceData(spaceId, {
    ...data,
    source_type: SpaceDataSourceType.Upload,
    type: SpaceDataType.File,
  });

/**
 * deleteWorkspaceDoc
 *
 * 删除工作空间中的知识库文档。
 */
export const deleteWorkspaceDoc = async (spaceId: number, dataId: number): Promise<unknown> =>
  deleteSpaceData(spaceId, dataId);

/**
 * retryWorkspaceDoc
 *
 * 重试工作空间知识库文档的分析任务。
 */
export const retryWorkspaceDoc = async (spaceId: number, dataId: number): Promise<unknown> =>
  retrySpaceData(spaceId, dataId);

/**
 * fetchWorkspaceSessions
 *
 * 获取工作空间下的对话列表（Session）。
 */
export const fetchWorkspaceSessions = async (
  spaceId: number,
  params: Omit<SessionListParams, "space_id"> = {},
): Promise<SessionListResponse> => listSessions({ ...params, space_id: spaceId });

/**
 * fetchWorkspaceAgents
 *
 * 获取工作空间绑定的智能体列表（Agent）。
 */
export const fetchWorkspaceAgents = async (spaceId: number): Promise<WorkspaceAgentItem[]> => {
  const agents = await getSpaceAgents(spaceId);
  const normalized = (Array.isArray(agents) ? agents : []).map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    icon: agent.icon,
    isSuperAssistant: Boolean((agent as { is_super_assistant?: boolean }).is_super_assistant),
  }));
  return normalized.sort((a, b) => Number(b.isSuperAssistant) - Number(a.isSuperAssistant));
};

/**
 * unbindWorkspaceAgent
 *
 * 解绑工作空间中的智能体。
 */
export const unbindWorkspaceAgent = async (spaceId: number, agentId: number): Promise<unknown> =>
  unbindAgent(spaceId, agentId);

/**
 * fetchWorkspaceArtifacts
 *
 * 获取工作空间的成果列表（按 session 分组）。
 */
export const fetchWorkspaceArtifacts = async (
  spaceId: number,
  params: WorkspaceArtifactsQuery = {},
): Promise<WorkspaceArtifactsResult> => {
  const response: SpaceArtifactsResponse = await getSpaceArtifacts(spaceId, params);

  const safeGroups = Array.isArray(response?.groups) ? response.groups : [];
  const normalizedGroups: WorkspaceArtifactGroup[] = safeGroups.map(group => ({
    sessionId: group.session_id,
    sessionTitle: group.session_title?.trim() || "未命名对话",
    sessionUpdatedAt: group.session_updated_at ?? undefined,
    artifacts: (Array.isArray(group.artifacts) ? group.artifacts : []).map<WorkspaceArtifactItem>(
      item => ({
        id: item.id,
        artifactId: item.artifact_id,
        kind: item.kind,
        title: item.title ?? undefined,
        summary: item.summary ?? undefined,
        data: item.data,
        createdAt: item.created_at ?? undefined,
        updatedAt: item.updated_at ?? undefined,
      }),
    ),
  }));

  const totalRaw = response?.total;
  const normalizedTotal =
    typeof totalRaw === "number" && Number.isFinite(totalRaw)
      ? totalRaw
      : normalizedGroups.reduce((sum, group) => sum + group.artifacts.length, 0);

  return { groups: normalizedGroups, total: normalizedTotal };
};

/**
 * createWorkspaceDocFromArtifact
 *
 * 将成果（artifact）添加到空间知识库。
 */
export const createWorkspaceDocFromArtifact = async (
  spaceId: number,
  data: CreateSpaceDataFromArtifactRequest,
): Promise<unknown> => createSpaceDataFromArtifact(spaceId, data);

/**
 * fetchWorkspaceArtifactBody
 *
 * 获取成果 `content_url` 指向的文本内容（用于 Markdown/HTML 预览）。
 * - `content_url` 可能为对象存储的跨域地址；若使用带鉴权头的 axios 实例可能触发 CORS 预检失败，
 *   因此这里使用原生 `fetch` 拉取文本。
 */
export const fetchWorkspaceArtifactBody = async (url: string): Promise<string> => {
  const normalized = url.trim();
  if (!normalized) return "";

  const response = await fetch(normalized, { method: "GET" });
  if (!response.ok) {
    throw new Error(`获取成果内容失败（${response.status}）`);
  }
  return response.text();
};

/**
 * fetchWorkspaceFilePreview
 *
 * 获取空间知识库文件的预览信息（kkfile 预览 URL）。
 */
export const fetchWorkspaceFilePreview = async (
  spaceDataId: number,
): Promise<SpaceDataPreviewResponse> => getSpaceDataPreview(spaceDataId);
