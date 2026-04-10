/**
 * Block 相关类型定义
 * 用于对话界面的 Block-based 渲染
 */

// ============ Block Kind ============
export type BlockKind =
  | "text" // 文本内容
  | "thinking" // 思考过程
  | "tool_use" // 通用 Claude 工具调用
  | "sub_agent" // 子 agent 容器
  | "tool_result" // 工具结果
  | "dynamics_workflow_tool" // Dynamics Workflow 工具（作为 tool_use 的子块）
  | "plan" // 研究计划
  | "artifact" // 报告/文档 artifact
  | "result_cards" // 结果卡片列表
  | "message" // 消息容器 (分组 thinking + text)
  | "hitl_request" // 人机交互请求（兼容旧版 patch）
  | "ask_user" // 人机交互请求（新版 apply）
  | "hitl" // 人机交互请求（内置工具生成）
  | "error"; // 错误

// ============ Block Operation ============
export type BlockOp = "apply" | "delta" | "patch";

// ============ Persistence ============
export type Persistence = "persistent" | "transient";

// ============ Actor Role ============
export type ActorRole = "user" | "assistant" | "system";

// ============ Actor Info ============
export interface ActorInfo {
  id: string;
  role: ActorRole;
  name?: string;
  meta?: Record<string, unknown>;
}

// ============ SSE Block Event ============
export interface BlockEvent {
  block_id: string;
  parent_id?: string | null;
  kind: BlockKind | string;
  op: BlockOp;
  data: Record<string, unknown>;
  persistence: Persistence;
  branch?: string | null;

  // Protocol metadata
  protocol_version: string;
  event_id: string;
  timestamp: number;
  session_id: string;
  invocation_id: string;

  // Actor info
  actor?: ActorInfo | null;
}

// ============ Aggregated Block (UI State) ============
export interface Block {
  id: string;
  kind: BlockKind | string;
  data: Record<string, unknown>;
  parentId?: string | null;
  invocationId?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: ActorRole;
  actorMeta?: Record<string, unknown>;
  timestamp?: number;
  sequence?: number;
  // Block 历史记录对应的数据库 ID（用于 before_id 分页）
  historyId?: number;
  isStreaming?: boolean;
  children?: Block[]; // Child blocks (for message containers)
}

// ============ Text Data ============
export interface TextData {
  content: string;
  delta?: string;
  role?: "user" | "assistant";
  status: string;
  attachments?: MessageAttachment[]; // 用户输入携带的附件
  /** 文本消息展示类型（默认普通对话） */
  message_type?: string;
  /** 文本消息样式标识（用于兼容不同后端字段） */
  render_style?: string;
  /** 成果摘要消息中的附件列表 */
  result_attachments?: MessageAttachment[];
  /** 成果附件的简化别名 */
  media?: MessageAttachment[];
  /** 成果摘要消息中的过程数量 */
  process_count?: number;
}

// ============ Tool Use Data（通用工具调用） ============
export type ToolUseStatus =
  | "pending"
  | "ready"
  | "running"
  | "success"
  | "failed"
  | "aborted"
  // Allow backend to introduce new statuses without breaking the UI typing.
  | (string & NonNullable<unknown>);

export interface ToolContactLookupItem {
  id: string;
  name: string;
  avatarLabel?: string;
  typeLabel: string;
  identityLabel: string;
  feishuId: string;
  matchLabel?: string;
  note?: string;
}

export interface ToolUseData {
  name: string;
  display_name?: string; // 工具展示名称（优先用于 UI 展示）
  call_id: string;
  avatar_url?: string;
  avatar_label?: string;
  arguments?: Record<string, unknown>;
  arguments_delta?: string; // 流式参数增量
  purpose?: string; // 工具本次调用目的描述
  status?: ToolUseStatus; // 工具调用状态
  stage?: string; // 子 agent / 特殊工具的阶段字段
  bytes_received?: number; // 已接收字节数
  search_results?: ToolSearchResultItem[]; // web_search 结果
  contact_results?: ToolContactLookupItem[]; // 飞书通讯录查询结果
  error?: string; // 失败原因
  is_subagent?: boolean;
  subagent_label?: string;
  subagent_session_key?: string;
  subagent_session_id?: string;
  subagent_run_id?: string;
}

// ============ Tool Result Data（通用工具结果） ============
export interface ToolResultData {
  call_id: string;
  content: string;
  is_error?: boolean;
}

// ============ Dynamics Workflow Tool Block Data ============
/**
 * Dynamics Workflow 工具块数据结构
 * kind = "dynamics_workflow_tool"，作为 tool_use 块的子块
 */
export interface DynamicsWorkflowToolData {
  tool_name: string;
  tool_id: number;
  status: "running" | "succeeded" | "failed" | string;
  inputs?: Record<string, unknown>;
  // 成功时的字段
  outputs?: Record<string, unknown>;
  text_content?: string;
  elapsed_time?: number;
  total_tokens?: number;
  feedback_info?: DynamicsWorkflowFeedbackInfo;
  // 失败时的字段
  error?: string;
  // patch 事件透传字段
  event?: string;
  workflow_run_id?: string | null;
  task_id?: string | null;
  data?: Record<string, unknown>;
  created_at?: string | null;
}

export interface DynamicsWorkflowFeedbackInfo {
  feedback_type: string;
  tool_id: number;
  message_id: string;
}

// ============ Dynamics Workflow Node Block Data ============
/**
 * DWF 节点块数据结构
 * 对应 node_started / node_finished 事件
 */
export interface DynamicsWorkflowNodeData {
  event: "node_started" | "node_finished";
  node_id: string;
  node_type: string;
  title: string;
  index: number;
  status: "running" | "succeeded" | "failed";
  elapsed_time?: number;
  error?: string | null;
}

// ============ Dynamics Workflow Text Block Data ============
/**
 * DWF 文本块数据结构 (流式文本输出)
 * 对应 text_chunk 事件
 */
export interface DynamicsWorkflowTextData {
  event: "text_chunk";
  text: string;
}

// ============ Dynamics Workflow Event Block Data ============
/**
 * DWF 事件块数据结构
 * 对应 message_created / workflow_started / workflow_finished 事件
 */
export interface DynamicsWorkflowEventData {
  event: "message_created" | "workflow_started" | "workflow_finished" | "message_saved";
  // message_created
  session_id?: string;
  user_message_id?: string;
  // workflow_started
  workflow_run_id?: string;
  workflow_id?: string;
  // workflow_finished
  status?: string;
  elapsed_time?: number;
  total_tokens?: number;
  total_steps?: number;
  // message_saved
  assistant_message_id?: string;
}

// ============ HITL Request Data ============
export type AskUserType = "single_select" | "multi_select" | "form";

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "switch";

export interface FormFieldDef {
  name: string;
  label: string;
  field_type: FormFieldType;
  placeholder?: string;
  options?: string[];
  default?: unknown;
}

export interface HITLRequestData {
  hitl_id?: string; // 新版 HITL 请求 ID
  status?: "pending" | "submitted" | "ignored" | string; // HITL 状态
  type?: AskUserType; // ask_user 类型
  title?: string; // 提示标题
  choices: string[]; // 选项列表
  allow_custom?: boolean; // 是否允许自定义输入
  custom_placeholder?: string; // 自定义输入框占位
  fields?: FormFieldDef[]; // 表单字段（type=form 时）
}

// ============ Error Data ============
export interface ErrorData {
  message: string;
  code?: string;
}

// ============ Plan Data ============
/**
 * Plan 块（内置工具 plan 的前端展示数据）。
 * 协议见：src/assets/readme/builtin-tools-block.md（plan）
 */
export type PlanStatus =
  | "in_progress"
  | "completed"
  | "failed"
  // Allow backend to introduce new statuses without breaking the UI typing.
  | (string & NonNullable<unknown>);

export type PlanItemStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  // Allow backend to introduce new statuses without breaking the UI typing.
  | (string & NonNullable<unknown>);

export interface PlanItem {
  /** 步骤索引（从 0 开始） */
  index: number;
  /** 步骤标题 */
  title: string;
  /** 步骤说明（可选） */
  spec?: string | null;
  /** 步骤状态 */
  status: PlanItemStatus;
  /** 备注（可选，如失败原因） */
  note?: string | null;
}

export interface PlanData {
  plan_id: number | string;
  title: string;
  spec?: string | null;
  status: PlanStatus;
  note?: string | null;
  items: PlanItem[];
}

// ============ Artifact Data ============
export type ArtifactStatus = "generating" | "completed" | "streaming" | "draft" | "finalized";
export type ArtifactKind =
  | "markdown"
  | "html"
  | "image"
  | "image_gallery"
  | "ppt"
  | "search_results"
  | "webpage"
  | "component"
  | "report"
  | "video";

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  score?: number;
}

export interface SearchResultsArtifactData {
  query: string;
  results: SearchResultItem[];
}

export interface ToolSearchResultItem {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
  published_at?: string;
  site_name?: string;
}

// ============ Message Attachment ============
export interface MessageAttachment {
  id: number;
  name: string;
  url?: string;
  mime_type?: string;
  size?: number;
  // 兼容部分上传返回
  thumb_url?: string;
}

export interface ArtifactImage {
  url: string;
  index?: number;
}

export interface ImageArtifactData {
  images: ArtifactImage[];
  prompt: string;
  size: string;
  sequential: boolean;
}

export interface VideoArtifactData {
  video_url: string;
  prompt: string;
  mode: string;
  duration: number;
  quality: string;
  video_id?: number | string;
  width?: number;
  height?: number;
  first_frame?: string;
  last_frame?: string;
}

// ============ PPT Artifact Data ============
// 每页 PPT 就是一张 AI 生成图，数据结构简洁：index + prompt + image_url
export interface PptSlideData {
  index: number;
  prompt: string;
  image_url?: string | null;
  error?: string;
}

export interface PptArtifactPayload {
  slides: PptSlideData[];
}

export interface ArtifactData {
  artifact_id: string;
  kind: ArtifactKind;
  title: string;
  status?: ArtifactStatus;
  /** 部分后端返回 format 字段用于指示预览方式（html/react/markdown等） */
  format?: string;
  data?: ImageArtifactData | VideoArtifactData | PptArtifactPayload | Record<string, unknown>;
}

// UI 用的 Artifact 结构（从 blocks 中提取）
export interface Artifact {
  id: string;
  kind: string;
  title: string;
  data: Record<string, unknown>;
  blockId: string;
  isStreaming: boolean;
}

export interface ResultCardItemData {
  id: string;
  title: string;
  subtitle?: string;
  created_at?: string;
  badge?: string;
}

export interface ResultCardsData {
  title?: string;
  items: ResultCardItemData[];
}

// ============ HITL 提交负载（前端内部使用） ============
export interface HITLRespondPayload {
  blockId: string;
  hitlId?: string;
  action: "submit" | "ignore";
  selected?: string[];
  customInput?: string;
  formData?: Record<string, unknown>;
  message: string;
}

// ============ Block Aggregator ============
export class BlockAggregator {
  private blocks = new Map<string, Block>();
  private order: string[] = [];

  process(event: BlockEvent): Block {
    const { block_id, kind, op, data, actor, parent_id } = event;

    if (op === "apply") {
      // Create or replace
      const block: Block = {
        id: block_id,
        kind,
        data: { ...data },
        parentId: parent_id,
        invocationId: event.invocation_id,
        actorId: actor?.id,
        actorName: actor?.name,
        actorRole: actor?.role,
        actorMeta: actor?.meta,
        timestamp: event.timestamp,
        isStreaming: true,
      };
      if (!this.blocks.has(block_id)) {
        this.order.push(block_id);
      }
      this.blocks.set(block_id, block);
      return block;
    } else if (op === "delta") {
      // Incremental append
      let block = this.blocks.get(block_id);
      if (!block) {
        block = {
          id: block_id,
          kind,
          data: {},
          parentId: parent_id,
          invocationId: event.invocation_id,
          actorId: actor?.id,
          actorName: actor?.name,
          actorRole: actor?.role,
          actorMeta: actor?.meta,
          timestamp: event.timestamp,
          isStreaming: true,
        };
        this.blocks.set(block_id, block);
        this.order.push(block_id);
      }

      if (!block.actorName && actor?.name) {
        block.actorName = actor.name;
      }
      if (!block.invocationId && event.invocation_id) {
        block.invocationId = event.invocation_id;
      }
      if (actor?.meta) {
        block.actorMeta = actor.meta;
      }

      // Delta: string concatenation, array extension, others replace
      for (const [key, value] of Object.entries(data)) {
        const current = block.data[key];
        if (typeof value === "string" && (typeof current === "string" || current === undefined)) {
          // String concatenation
          block.data[key] = ((current as string) || "") + value;
        } else if (Array.isArray(value) && Array.isArray(current)) {
          // Array extension
          block.data[key] = [...current, ...value];
        } else {
          // Others: replace
          block.data[key] = value;
        }
      }
      return block;
    } else if (op === "patch") {
      // Partial update with JSON Path support
      let block = this.blocks.get(block_id);
      if (!block) {
        block = {
          id: block_id,
          kind,
          data: {},
          parentId: parent_id,
          invocationId: event.invocation_id,
          actorId: actor?.id,
          actorName: actor?.name,
          actorRole: actor?.role,
          actorMeta: actor?.meta,
          timestamp: event.timestamp,
          isStreaming: true,
        };
        this.blocks.set(block_id, block);
        this.order.push(block_id);
      }
      if (actor?.meta) {
        block.actorMeta = actor.meta;
      }
      // JSON Path based update
      for (const [path, value] of Object.entries(data)) {
        this.setPath(block.data, path, value);
      }
      return block;
    }

    return this.blocks.get(block_id)!;
  }

  /**
   * Set value at JSON Path.
   * Supports: "key", "a.b.c", "items[0]", "items[0].name"
   */
  private setPath(data: Record<string, unknown>, path: string, value: unknown): void {
    // Parse path into parts
    const parts: (string | number)[] = [];
    for (const segment of path.replace(/]/g, "").split(".")) {
      if (segment.includes("[")) {
        const [key, idx] = segment.split("[");
        if (key) parts.push(key);
        parts.push(parseInt(idx, 10));
      } else {
        parts.push(segment);
      }
    }

    // Navigate to parent
    let current: unknown = data;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof part === "number") {
        if (!Array.isArray(current)) break;
        while ((current as unknown[]).length <= part) {
          (current as unknown[]).push({});
        }
        current = (current as unknown[])[part];
      } else {
        if (!(part in (current as Record<string, unknown>))) {
          (current as Record<string, unknown>)[part] = {};
        }
        current = (current as Record<string, unknown>)[part];
      }
    }

    // Set final value
    const finalKey = parts[parts.length - 1];
    if (typeof finalKey === "number" && Array.isArray(current)) {
      while ((current as unknown[]).length <= finalKey) {
        (current as unknown[]).push(null);
      }
      (current as unknown[])[finalKey] = value;
    } else if (typeof current === "object" && current !== null) {
      (current as Record<string, unknown>)[finalKey as string] = value;
    }
  }

  markAllComplete(): void {
    for (const block of this.blocks.values()) {
      block.isStreaming = false;
    }
  }

  markInvocationComplete(invocationId?: string | null): void {
    if (!invocationId) return;
    for (const block of this.blocks.values()) {
      if (block.invocationId === invocationId) {
        block.isStreaming = false;
      }
    }
  }

  getBlocks(): Block[] {
    return this.order.map(id => this.blocks.get(id)!);
  }

  /**
   * Get blocks organized by parent-child relationships.
   * Returns root blocks with their children nested recursively.
   * If a block's parent doesn't exist, treat it as a root block (orphan).
   * Supports multi-level nesting (e.g. DWF Container -> Node -> Text)
   */
  getGroupedBlocks(): Block[] {
    const result: Block[] = [];
    const childrenMap = new Map<string, Block[]>();
    const processedIds = new Set<string>();

    // First pass: group children by parent (only if parent exists)
    for (const id of this.order) {
      const block = this.blocks.get(id)!;
      if (block.parentId && this.blocks.has(block.parentId)) {
        // Parent exists, add as child
        const children = childrenMap.get(block.parentId) || [];
        children.push(block);
        childrenMap.set(block.parentId, children);
        processedIds.add(id);
      }
    }

    // Recursive function to build nested children
    const buildNestedBlock = (block: Block): Block => {
      const children = childrenMap.get(block.id);
      if (children && children.length > 0) {
        // Recursively nest children
        const nestedChildren = children.map(child => buildNestedBlock(child));
        return { ...block, children: nestedChildren };
      }
      return block;
    };

    // Second pass: build result with recursive nesting
    for (const id of this.order) {
      const block = this.blocks.get(id)!;

      // Skip blocks that are children of existing parents
      if (processedIds.has(id)) continue;

      // Add as root block (either no parentId or orphan)
      result.push(buildNestedBlock(block));
    }

    return result;
  }

  getBlock(blockId: string): Block | undefined {
    return this.blocks.get(blockId);
  }

  clear(): void {
    this.blocks.clear();
    this.order = [];
  }

  loadHistory(historyBlocks: Block[]): void {
    this.clear();
    const visit = (block: Block): void => {
      // API returns snake_case parent_id, convert to camelCase
      const parentId = block.parentId || (block as unknown as { parent_id?: string }).parent_id;

      const syntheticEvent: BlockEvent = {
        block_id: block.id,
        parent_id: parentId,
        kind: block.kind,
        op: "apply",
        data: block.data,
        persistence: "persistent",
        protocol_version: "1.0",
        event_id: "",
        timestamp: block.timestamp || Date.now(),
        session_id: "",
        invocation_id: "",
        actor: block.actorId
          ? {
              id: block.actorId,
              role: block.actorRole || "assistant",
              name: block.actorName,
              meta: block.actorMeta,
            }
          : undefined,
      };
      const loadedBlock = this.process(syntheticEvent);
      loadedBlock.isStreaming = false;
      loadedBlock.invocationId = block.invocationId;
      loadedBlock.sequence = block.sequence;
      loadedBlock.historyId = block.historyId;

      for (const child of block.children || []) {
        visit(child);
      }
    };

    for (const block of historyBlocks) {
      visit(block);
    }
  }
}
