import { httpClient } from "@/utils/http";

/**
 * STS凭证响应
 * - GET /api/v1/storage/sts
 */
export interface StorageSTSResponse {
  access_key_id: string;
  secret_access_key: string;
  session_token: string;
  expiration: string;
  bucket: string;
  region: string;
  endpoint: string;
  allow_path: string;
}

/**
 * 创建附件请求体
 * - POST /api/v1/attachments
 */
export interface CreateAttachmentRequest {
  name: string;
  storage_path: string;
  size: number;
  mime_type: string;
}

/**
 * 附件分类
 */
export type AttachmentCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "text"
  | "code"
  | "archive"
  | "other";

/**
 * 创建附件响应
 */
export interface AttachmentResponse {
  id: number;
  name: string;
  extension: string;
  storage_path: string;
  size: number;
  mime_type: string;
  category: AttachmentCategory;
  file_type: string;
  created_at: string;
  url?: string;
}

/**
 * 获取存储STS凭证
 * - GET /api/v1/storage/sts
 */
export function getStorageSTS() {
  return httpClient.get<StorageSTSResponse>("/api/v1/storage/sts");
}

/**
 * 创建附件
 * - POST /api/v1/attachments
 */
export function createAttachment(data: CreateAttachmentRequest) {
  return httpClient.post<AttachmentResponse>("/api/v1/attachments", data);
}

/**
 * 空间文件预览响应
 * - GET /api/v1/files/space-data/{id}/preview
 */
export interface SpaceDataPreviewResponse {
  /** 预览支持类型: \"kkfile\" */
  support: string;
  /** kkfile 预览 URL */
  preview_url: string;
  /** 原文件下载 URL */
  download_url: string;
  /** 文件 ID */
  id: number;
  /** 文件名 */
  name: string;
}

/**
 * 获取空间文件预览 URL
 * - GET /api/v1/files/space-data/{id}/preview
 */
export function getSpaceDataPreview(spaceDataId: number) {
  return httpClient.get<SpaceDataPreviewResponse>(
    `/api/v1/files/space-data/${spaceDataId}/preview`,
  );
}
