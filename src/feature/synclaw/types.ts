export interface SynClawChannelItem {
  id: string;
  name: string;
}

export interface SynClawSpaceItem {
  id: string;
  name: string;
  coverUrl?: string;
  channels: SynClawChannelItem[];
}

export interface SynClawArtifactItem {
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
