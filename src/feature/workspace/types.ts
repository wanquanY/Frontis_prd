import type { ChangeEvent, DragEvent, KeyboardEvent, ReactNode, RefObject } from "react";
import type { Block, HITLRespondPayload } from "@/types/block";
import type { SpaceItem } from "@/types/prdPrototype";
import type { AnalysisStatus } from "@/types/prdPrototype";
import type { PlanItem, PlanStatus } from "@/types/block";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export type WorkspaceModelId = number;

export type WorkspaceLeftPanelTab = "knowledge" | "chat";

export type WorkspaceUploadQueueFileStatus = "ready" | "uploading" | "done" | "error";

export interface WorkspaceChatSessionItem {
  id: number;
  title: string;
  lastMessage?: string;
  updatedAt?: string;
  createdAt?: string;
  /** 会话当前使用的智能体 id（后端 session.current_agent_id） */
  currentAgentId?: number;
}

export interface WorkspaceArtifactItem {
  id: number;
  artifactId: string;
  kind: string;
  title?: string;
  summary?: string;
  data:
    | {
        content_url?: string;
        format?: string;
      }
    | {
        images: { url: string; index?: number }[];
        prompt?: string;
        sequential?: boolean;
        size?: string;
      }
    | {
        slides: { index: number; prompt: string; image_url?: string; error?: string }[];
      };
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceArtifactGroup {
  sessionId: number;
  sessionTitle: string;
  sessionUpdatedAt?: string;
  artifacts: WorkspaceArtifactItem[];
}

export interface WorkspaceArtifactsQuery {
  /**
   * Artifact 类型过滤
   */
  kind?: string;
  /**
   * 每个 session 的 artifact 数量限制，默认 50
   */
  limit?: number;
}

export interface WorkspaceArtifactsResult {
  groups: WorkspaceArtifactGroup[];
  total: number;
}

export interface WorkspaceAgentItem {
  /** 智能体 id */
  id: number;
  /** 智能体名称 */
  name: string;
  /** 智能体描述 */
  description: string;
  /** 智能体图标（URL） */
  icon?: string;
  /** 是否为超级助理（需要置顶展示） */
  isSuperAssistant?: boolean;
}

export type WorkspaceChatRole = "user" | "assistant";

export interface WorkspaceChatMessage {
  /** 消息唯一标识（对应 block_id 或本地生成 id） */
  id: string;
  role: WorkspaceChatRole;
  content: string;
  /** 是否为流式生成中的消息 */
  streaming?: boolean;
}

export interface WorkspaceUploadQueueFile {
  uid: string;
  file: File;
  name: string;
  size: number;
  mime_type: string;
  percent: number;
  status: WorkspaceUploadQueueFileStatus;
  error?: string;
}

export type WorkspaceComposerAttachmentStatus = "uploading" | "done" | "error";

export interface WorkspaceComposerAttachmentItem {
  /** 前端唯一标识（用于列表渲染与更新进度） */
  uid: string;
  /** 文件名 */
  name: string;
  /** 文件大小（bytes） */
  size: number;
  /** MIME 类型 */
  mimeType: string;
  /** 预览 URL（图片类附件用于展示缩略图；优先取后端 AttachmentResponse.url） */
  url?: string;
  /** 上传进度（0-100） */
  percent: number;
  /** 上传状态 */
  status: WorkspaceComposerAttachmentStatus;
  /** 后端附件 id（POST /api/v1/attachments 返回） */
  id?: number;
  /** 错误信息（失败态展示/提示用） */
  error?: string;
}

export interface MeOnboardingProfileValues {
  nickname: string;
  companyName: string;
  industry: string;
  customIndustry: string;
  role: string;
  customRole: string;
  companyDescription: string;
}

export type WorkspaceKnowledgeClassifyKey = "none" | "topic" | "file" | "time";

export interface WorkspaceKnowledgeGroup {
  key: string;
  title: string;
  files: WorkspaceFileItem[];
}

export interface WorkspaceModelOption {
  id: WorkspaceModelId;
  label: string;
  description?: string;
}

export interface WorkspaceComposerMentionOption {
  /** mention 唯一标识（通常为 agentId） */
  id: string;
  /** 插入输入框时使用的展示名称 */
  label: string;
  /** 实际插入输入框并参与发送解析的 mention 文本 */
  mentionLabel?: string;
  /** 便于检索的别名（不直接展示） */
  alias?: string;
  /** 下拉面板头像 */
  avatarUrl?: string;
  /** 候选项类型（用于区分 AI 与成员标签） */
  kind?: "ai" | "member";
}

export interface WorkspaceStep {
  id: number;
  title: string;
  description: string;
}

export interface WorkspaceFileItem {
  id: string;
  name: string;
  size?: number;
  type?: string;
  /** 文件预览地址（用于图片类文档直接展示缩略图） */
  previewUrl?: string;
  status: UploadStatus;
  /** 文档分析状态（用于状态展示与可选判断） */
  analysisStatus?: AnalysisStatus | string;
  /** 后端创建时间（用于按时间分组） */
  createdAt?: string;
  /** 智能分类主题（用于按主题分组） */
  topic?: string;
}

export interface WorkspaceState {
  workspaceName: string;
  /** 工作空间摘要（后端生成，支持 Markdown） */
  workspaceSummary?: string;
  selectedModelId: WorkspaceModelId;
  inputMessage: string;
  uploadStatus: UploadStatus;
  uploadedFiles: WorkspaceFileItem[];
  /** 对话列表：会话列表（左侧对话 Tab） */
  chatSessions: WorkspaceChatSessionItem[];
  /** 对话列表：当前选中的会话 id（0 表示新建对话） */
  chatCurrentSessionId?: number;
  /** 当前选中的智能体 id（用于发送与 UI 高亮） */
  selectedAgentId?: number;
  chatSessionsLoading: boolean;
  chatSessionsHasMore: boolean;
  chatSessionsNextOffset: number;
  chatSessionsTotal: number;
  /** 知识库：勾选加入对话上下文的文件 id 列表 */
  knowledgeSelectedFileIds: string[];
  /** 知识库：智能分类方式 */
  knowledgeClassifyKey: WorkspaceKnowledgeClassifyKey;
  /** 知识库：各分组是否折叠 */
  knowledgeCollapsedGroups: Record<string, boolean>;
  uploadError?: string;
  steps: WorkspaceStep[];
  leftPanelExpanded: boolean;
  leftPanelTab: WorkspaceLeftPanelTab;
}

export const DEFAULT_WORKSPACE_STEPS: WorkspaceStep[] = [
  { id: 1, title: "上传文档", description: "将项目资料添加到知识库" },
  { id: 2, title: "选择文档", description: "勾选需要的文档作为上下文" },
  { id: 3, title: "开始对话", description: "与智能体协作生成成果" },
];

export const WORKSPACE_MODEL_OPTIONS: WorkspaceModelOption[] = [
  {
    id: 1,
    label: "Claude sonnet 4.5",
    description: "平衡生成质量与速度，适合日常协作",
  },
  {
    id: 2,
    label: "Claude opus 3.5",
    description: "更强的推理与长文本处理能力",
  },
  {
    id: 3,
    label: "GPT-4o mini",
    description: "轻量快速，适合草稿对话",
  },
];

export interface UseWorkspaceResult {
  /** 当前空间基础信息是否正在加载中 */
  isWorkspaceLoading: boolean;
  /** 当前空间 id（路由中解析）。create 路由下为 undefined */
  workspaceId?: number;
  workspaceName: string;
  /** 工作空间摘要（后端生成，支持 Markdown） */
  workspaceSummary?: string;
  /** 当前空间已绑定的智能体列表 */
  workspaceAgents: WorkspaceAgentItem[];
  /** 当前选中的智能体 id（用于发送与 UI 高亮） */
  selectedAgentId?: number;
  selectedModelId: WorkspaceModelId;
  inputMessage: string;
  /** 对话输入区已上传附件列表 */
  composerAttachments: WorkspaceComposerAttachmentItem[];
  uploadStatus: UploadStatus;
  uploadedFiles: WorkspaceFileItem[];
  chatSessions: WorkspaceChatSessionItem[];
  chatCurrentSessionId?: number;
  chatSessionsLoading: boolean;
  chatSessionsHasMore: boolean;
  /** 是否正在发送/流式响应 */
  isSending: boolean;
  /** 右侧对话展示用的消息列表（从 blocks 抽取） */
  chatMessages: WorkspaceChatMessage[];
  /** 用于流式渲染的原始 Block 列表 */
  chatBlocks: Block[];
  /** 是否还有更多聊天历史 */
  chatHasMoreHistory: boolean;
  /** 聊天历史是否正在加载 */
  chatIsLoadingHistory: boolean;
  /** 聊天历史是否已加载完成（用于首次进入会话的占位/禁用态控制） */
  chatHistoryLoaded: boolean;
  /** 空间成果列表（按 session 分组） */
  workspaceArtifacts: WorkspaceArtifactsResult;
  /** 点击左侧会话时，用于驱动成果分组展开与高亮 */
  workspaceArtifactsActiveSessionId?: number;
  /** 最新收到的 artifact block（用于流式预览自动展开） */
  latestArtifactBlock: Block | null;
  /** 清除 latestArtifactBlock 状态 */
  clearLatestArtifactBlock: () => void;
  knowledgeSelectedFileIds: string[];
  knowledgeClassifyKey: WorkspaceKnowledgeClassifyKey;
  knowledgeGroups: WorkspaceKnowledgeGroup[];
  knowledgeCollapsedGroups: Record<string, boolean>;
  uploadError?: string;
  steps: WorkspaceStep[];
  modelOptions: WorkspaceModelOption[];
  leftPanelExpanded: boolean;
  leftPanelTab: WorkspaceLeftPanelTab;
  fileInputRef: RefObject<HTMLInputElement>;
  handleBack: () => void;
  handleNameChange: (name: string) => void;
  handleModelChange: (modelId: WorkspaceModelId) => void;
  handleMessageChange: (value: string) => void;
  handleSendMessage: () => void;
  /** 对话输入区：移除已选择附件 */
  handleRemoveComposerAttachment: (uid: string) => void;
  handleOpenFilePicker: () => void;
  handleFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** 对话输入区：选择附件（文件选择/拖拽/粘贴） */
  handleComposerAttachmentsSelected: (fileList?: FileList | File[] | null) => void;
  handleFilesSelected: (fileList?: FileList | File[] | null) => void;
  handleDrop: (event: DragEvent<HTMLElement>) => void;
  handleResetUpload: () => void;
  handleToggleLeftPanel: () => void;
  handleSetLeftPanelTab: (tab: WorkspaceLeftPanelTab) => void;
  handleChatNewSession: () => void;
  handleChatSessionClick: (sessionId: number) => void;
  handleChatLoadMoreSessions: () => void;
  handleLoadMoreChatHistory: () => void;
  handleChatSessionDelete: (sessionId: number) => Promise<void> | void;
  handleAbortChat: () => Promise<void>;
  handleRespondToHITL: (payload: HITLRespondPayload) => Promise<void> | void;
  handleRefreshWorkspaceAgents: () => void;
  handleUnbindWorkspaceAgent: (agentId: number) => void;
  handleKnowledgeFileCheckedChange: (id: string, checked: boolean) => void;
  handleKnowledgeSelectAll: () => void;
  handleKnowledgeClassifyChange: (key: WorkspaceKnowledgeClassifyKey) => void;
  handleKnowledgeToggleGroupCollapse: (groupKey: string) => void;
  handleKnowledgeExpandAllGroups: () => void;
  handleKnowledgeGroupSelect: (ids: string[], checked: boolean) => void;
  handleKnowledgeDeleteFile: (id: string) => void;
  handleKnowledgeRetryFile: (id: string) => void;
  /** 成果：加入知识库 */
  handleAddArtifactToKnowledge: (sessionId: number, artifactId: string) => Promise<void>;
  /** 成果：下载（使用 content_url） */
  handleDownloadArtifact: (artifactId: string) => Promise<void>;
  /** 成果：刷新空间成果列表 */
  handleRefreshWorkspaceArtifacts?: (spaceId: number) => Promise<void>;
  handleSelectWorkspaceAgent: (agentId?: number) => void;
  handleSubmitWorkspaceTitle: (title: string) => Promise<void>;
  /** 上传弹窗：创建空间后回调（用于同步路由与标题） */
  handleWorkspaceCreated: (space: SpaceItem) => void;
  /** 上传弹窗：上传完成后回调（用于刷新知识库列表） */
  handleWorkspaceDocsUploaded: (spaceId: number, createdNewSpace: boolean) => void;
  resetWorkspace: () => void;
}

export interface WorkspaceTopHeaderProps {
  /** 工作空间名称 */
  title: string;
  /** 当前空间 id（undefined 表示新建态） */
  workspaceId?: number;
  /** 点击返回 */
  onBack?: () => void;
  /** 保存标题（内部已做空值/未变校验） */
  onSubmitTitle?: (nextTitle: string) => Promise<void> | void;
}

export interface WorkspaceSideNavProps {
  /** 点击左侧入口（预留） */
  onOpenPanel?: () => void;
}

export interface WorkspaceChatTopBarProps {
  /** 当前空间已绑定的智能体列表（最多展示 4 个） */
  agents: WorkspaceAgentItem[];
  /** 当前会话标题（有选中会话时展示） */
  activeSessionTitle?: string;
  /** 是否展示“新对话”按钮（默认展示） */
  showNewChatButton?: boolean;
  /** 是否隐藏底部边框（默认不隐藏） */
  hideBottomBorder?: boolean;
  /** 右侧插槽（用于自定义操作区） */
  rightExtra?: React.ReactNode;
  /** 当前会话的智能体 id（用于标记“对话中”） */
  activeAgentId?: number;
  /** 选中某个智能体 */
  onSelectAgent?: (agentId: number) => void;
  /** 点击新对话 */
  onNewChat?: () => void;
  /** 点击添加协作智能体 */
  onAddAgent?: () => void;
  /** 点击解绑智能体 */
  onRemoveAgent?: (agentId: number) => void;
}

export interface WorkspaceChatPanelProps {
  /** 原始 Block 列表（用于流式渲染） */
  blocks: Block[];
  /** 初次进入时聚焦的 block_id（用于从自动化执行记录跳转定位输出）。 */
  focusBlockId?: string;
  /** 同一个 focusBlockId 需要重复定位时传入新的请求标识。 */
  focusRequestKey?: string;
  /** 对话消息列表（按时间正序） */
  messages: WorkspaceChatMessage[];
  /** actorId -> 头像与名称映射（用于按 block 显示对应智能体头像） */
  actorAvatars?: Record<string, { icon?: string; name?: string }>;
  /** actorId / 唯一 actorName -> 插入输入框的 mention 文本 */
  mentionableActorLabels?: Record<string, string>;
  /** 点击 artifact block 下载 */
  onDownloadArtifact?: (artifactId: string) => void;
  /** 将 artifact 加入知识库 */
  onAddArtifactToKnowledge?: (artifactId: string) => void;
  /** 当前选中智能体头像（用于对话区展示） */
  assistantAvatarUrl?: string;
  /** 当前选中智能体名称（用于 avatar alt） */
  assistantAvatarAlt?: string;
  /** 人在回路交互的响应回调 */
  onHITLRespond?: (payload: HITLRespondPayload) => void;
  /** 点击 artifact block 打开预览 */
  onOpenArtifact?: (block: Block) => void;
  /** 点击结果卡片后打开生成式结果 */
  onOpenResult?: (resultId: string) => void;
  /** 无对话消息时的欢迎语 */
  greeting?: string;
  /** 工作空间摘要（Markdown），用于新会话态展示 */
  workspaceSummary?: string;
  /** 是否处于新会话状态（用于控制摘要展示） */
  isNewSession?: boolean;
  /** 当前会话 id（用于判断是否为新会话，也可复用为频道切换的吸底信号） */
  currentSessionId?: number | string;
  /** 当前是否流式中（用于 Loading 展示） */
  isStreaming?: boolean;
  /** 是否还有更多历史记录 */
  hasMoreHistory?: boolean;
  /** 历史记录是否在加载中 */
  isLoadingHistory?: boolean;
  /** 滚动到顶部时加载更多历史 */
  onLoadMoreHistory?: () => void;
  /** 是否展示了计划 Banner，用于预留底部空间 */
  hasPlanBanner?: boolean;
  /** PlanBanner 实际高度（用于动态预留底部空间） */
  planBannerHeight?: number;
  /** 历史对话是否在加载中（切换会话时的初始加载） */
  isHistoryLoading?: boolean;
  /** 是否展示消息发送者与时间（群聊场景） */
  showMessageMeta?: boolean;
  /** 是否将被任务分发调用的成员智能体输出折叠展示。 */
  collapseAssignedActorOutputs?: boolean;
  /** 是否展示流式占位（群聊场景通常关闭） */
  showStreamingPlaceholder?: boolean;
  /** 是否进入消息分享选择模式 */
  shareSelectionEnabled?: boolean;
  /** 当前已选择分享的 block id 列表 */
  selectedShareBlockIds?: string[];
  /** 切换某条消息是否纳入分享 */
  onToggleShareBlock?: (blockId: string) => void;
  /** 点击消息底部分享入口后进入消息勾选模式 */
  onStartShareSelection?: () => void;
  /** 点击消息发送者名称后回填到输入框 */
  onActorNameClick?: (mentionLabel: string) => void;
  /** 点击消息快捷建议后直接发送 */
  onQuickActionSend?: (prompt: string) => void;
}

export interface WorkspaceEmptyStateProps {
  /** 标题文案 */
  title?: string;
  /** 副标题文案 */
  subtitle?: string;
  /** 是否展示引导箭头（默认 true） */
  showGuides?: boolean;
  /** 是否展示左上角导航提示 */
  showNavHint?: boolean;
  /** 导航提示文案 */
  navHintLabel?: string;
  /** 操作按钮文案（展示在插画左侧） */
  actionLabel?: string;
  /** 操作按钮点击回调 */
  onActionClick?: () => void;
}

export interface WorkspaceUploadCardProps {
  onClick?: () => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
}

export interface WorkspaceStepsProps {
  steps: WorkspaceStep[];
}

export interface WorkspaceComposerProps {
  value: string;
  rootClassName?: string;
  placeholder: string;
  /** 选中智能体后的前缀展示（例如：@ 市场洞察专家） */
  mentionPrefix?: string;
  /** 输入 @ 时的候选列表 */
  mentionOptions?: WorkspaceComposerMentionOption[];
  /** 当该值变化时，Composer 自动获取焦点 */
  focusKey?: number;
  /** 工作计划提醒（可选） */
  planBanner?: {
    title: string;
    status: PlanStatus;
    spec?: string | null;
    items?: PlanItem[];
    collapsed?: boolean;
    onToggleCollapse?: (next: boolean) => void;
  };
  /** PlanBanner 高度变化回调（用于同步聊天区底部留白） */
  onPlanBannerHeightChange?: (height: number) => void;
  /** 已上传附件列表（展示在输入框上方） */
  attachments?: WorkspaceComposerAttachmentItem[];
  /** 移除附件 */
  onRemoveAttachment?: (uid: string) => void;
  /** 选择附件（按钮/拖拽/粘贴入口） */
  onAttachmentsSelected?: (files: FileList | File[] | null | undefined) => void;
  /** 允许仅凭附件发送消息（无文本输入） */
  allowAttachmentOnlySend?: boolean;
  /** 聊天页底部扩展工具条（可选） */
  footerExtra?: ReactNode;
  /** 是否禁用交互（发送中/外部禁用） */
  disabled?: boolean;
  /** 是否正在发送/流式中，用于禁用输入与上传 */
  sending?: boolean;
  /** 是否正在重连 SSE */
  reconnecting?: boolean;
  /** 是否隐藏模型选择器（聊天室场景） */
  showModelSelector?: boolean;
  /** 仅禁用发送按钮，不影响输入框编辑 */
  sendDisabled?: boolean;
  modelLabel: string;
  selectedModelId: WorkspaceModelId;
  modelMenuOpen: boolean;
  modelOptions: WorkspaceModelOption[];
  onValueChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  onAttach?: () => void;
  onToggleModelMenu?: () => void;
  onCloseModelMenu?: () => void;
  onSelectModel?: (modelId: WorkspaceModelId) => void;
  onSend?: () => void;
  onAbort?: () => Promise<void> | void;
  /** 是否为聊天页面（用于控制底部留白） */
  isChatPage?: boolean;
}

export interface WorkspaceLeftPanelProps {
  activeTab: WorkspaceLeftPanelTab;
  /** 知识库文件（用于“有数据”态展示） */
  knowledgeFiles?: WorkspaceFileItem[];
  /** 知识库：已加入对话上下文的文件 id 列表 */
  knowledgeSelectedFileIds?: string[];
  /** 对话列表：会话列表 */
  chatSessions?: WorkspaceChatSessionItem[];
  /** 对话列表：当前会话 id */
  chatCurrentSessionId?: number;
  chatSessionsLoading?: boolean;
  chatSessionsHasMore?: boolean;
  knowledgeClassifyKey?: WorkspaceKnowledgeClassifyKey;
  knowledgeGroups?: WorkspaceKnowledgeGroup[];
  knowledgeCollapsedGroups?: Record<string, boolean>;
  onTabChange?: (tab: WorkspaceLeftPanelTab) => void;
  onCollapse?: () => void;
  onUploadClick?: () => void;
  onUploadDrop?: (event: DragEvent<HTMLElement>) => void;
  onUploadDragOver?: (event: DragEvent<HTMLElement>) => void;
  onNewChat?: () => void;
  onChatSessionClick?: (sessionId: number) => void;
  onChatLoadMoreSessions?: () => void;
  onChatSessionDelete?: (sessionId: number) => Promise<void> | void;
  onKnowledgeFileCheckedChange?: (id: string, checked: boolean) => void;
  onKnowledgeSelectAll?: () => void;
  onKnowledgeClassifyChange?: (key: WorkspaceKnowledgeClassifyKey) => void;
  onKnowledgeToggleGroupCollapse?: (groupKey: string) => void;
  onKnowledgeExpandAllGroups?: () => void;
  onKnowledgeGroupSelect?: (ids: string[], checked: boolean) => void;
  onKnowledgeFileDelete?: (id: string) => void;
  onKnowledgeFileRetry?: (id: string) => void;
  /** 点击知识库文件预览 */
  onKnowledgeFilePreview?: (id: string, fileName: string) => void;
}

export interface WorkspaceKnowledgeListProps {
  files: WorkspaceFileItem[];
  selectedFileIds: string[];
  maxFiles?: number;
  classifyKey?: WorkspaceKnowledgeClassifyKey;
  groups?: WorkspaceKnowledgeGroup[];
  collapsedGroups?: Record<string, boolean>;
  onFileCheckedChange?: (id: string, checked: boolean) => void;
  onSelectAll?: () => void;
  onClassifyChange?: (key: WorkspaceKnowledgeClassifyKey) => void;
  onGroupToggleCollapse?: (groupKey: string) => void;
  onExpandAll?: () => void;
  onGroupSelect?: (ids: string[], checked: boolean) => void;
  onFileDelete?: (id: string) => void;
  onFileRetry?: (id: string) => void;
  /** 点击文件预览 */
  onFilePreview?: (id: string, fileName: string) => void;
}

export interface WorkspaceChatListProps {
  sessions: WorkspaceChatSessionItem[];
  activeSessionId?: number;
  loading?: boolean;
  hasMore?: boolean;
  onSessionClick?: (sessionId: number) => void;
  onLoadMore?: () => void;
  onSessionDelete?: (sessionId: number) => Promise<void> | void;
}
