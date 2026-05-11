/**
 * 成果文件项。
 */
export interface ArtifactItem {
  id: string;
  artifactId: string;
  fileName: string;
  fileType: string;
  producerName: string;
  producedAt: string;
  fileSize: string;
  taskName: string;
  canonicalPath?: string;
  mimeType?: string;
  previewPosterUrl?: string;
  isDeleted?: boolean;
}

/**
 * 成果文件列表分组。
 */
export interface ArtifactFileGroup {
  id: string;
  title: string;
  description?: string;
  files: ArtifactItem[];
}
