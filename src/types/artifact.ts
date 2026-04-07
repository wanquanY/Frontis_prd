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
  isDeleted?: boolean;
}
