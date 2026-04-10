import type { ArtifactItem } from "@/types/artifact";
import type { Block } from "@/types/block";
import {
  AI_CEO_AGENT_SCENARIO_QUESTIONS,
  PRODUCT_MANAGER_BACKLOG_QUESTION,
  PRODUCT_MANAGER_PRD_QUESTION,
} from "@/constants/aiCeoScenarioPrompts";
import {
  PRODUCT_MANAGER_ADMIN_PRD_DOCUMENT_CONTENT,
  PRODUCT_MANAGER_ADMIN_PRD_DOCUMENT_NAME,
  PRODUCT_MANAGER_BACKLOG_DOCUMENT_CONTENT,
  PRODUCT_MANAGER_BACKLOG_DOCUMENT_NAME,
  PRODUCT_MANAGER_FDE_DELIVERY_PRD_DOCUMENT_CONTENT,
  PRODUCT_MANAGER_FDE_DELIVERY_PRD_DOCUMENT_NAME,
  PRODUCT_MANAGER_PRD_DOCUMENT_CONTENT,
  PRODUCT_MANAGER_PRD_DOCUMENT_NAME,
  PRODUCT_MANAGER_WORKSPACE_PRD_DOCUMENT_CONTENT,
  PRODUCT_MANAGER_WORKSPACE_PRD_DOCUMENT_NAME,
} from "@/constants/productManagerDocuments";
import {
  ECOMMERCE_AUTOMATION_AGENT_DEMO,
  ECOMMERCE_AUTOMATION_SKILL_DEMOS,
} from "@/constants/ecommerceAutomationDemo";
import {
  LIVE_BROADCAST_AGENT_DEMO,
  LIVE_BROADCAST_SKILL_DEMOS,
} from "@/constants/liveBroadcastDemo";
import {
  XIAOCANMAMA_IP_AGENT_DEMO,
  XIAOCANMAMA_IP_SKILL_DEMOS,
} from "@/constants/xiaocanMamaIpDemo";
import { formatFileSize } from "@/utils/file";

import type {
  ChatMessage,
  DialogueGeneratedPanelState,
  DialogueGeneratedResultItem,
  DialogueGeneratedPanelStatus,
  DialogueSessionItem,
} from "./types";
import { getAvatarUrl } from "./utils";

interface CreateTextBlockOptions {
  isStreaming?: boolean;
  messageType?: string;
}

interface CreateToolUseBlockOptions {
  id: string;
  name: string;
  displayName: string;
  purpose: string;
  status: string;
  avatarUrl?: string;
  avatarLabel?: string;
  output?: string;
  contactResults?: ScenarioContactLookupItem[];
  isError?: boolean;
}

interface ScenarioContactLookupItem {
  id: string;
  name: string;
  avatarLabel?: string;
  typeLabel: string;
  identityLabel: string;
  feishuId: string;
  matchLabel?: string;
  note?: string;
}

interface ScenarioDispatchRecipientSeed {
  id: string;
  name: string;
  roleLabel: string;
  channelLabel: string;
  statusLabel: string;
  summary: string;
  note?: string;
  tone?: "accent" | "positive" | "warning" | "danger";
}

interface ScenarioDispatchConversationSeed {
  id: string;
  actorLabel: string;
  summary: string;
  detail?: string;
  avatarLabel?: string;
  direction?: "incoming" | "outgoing" | "system";
  timeLabel?: string;
  statusLabel?: string;
  tagLabel?: string;
  edited?: boolean;
  tone?: "accent" | "positive" | "warning" | "danger";
}

export interface DialogueScenarioFrame {
  delayMs: number;
  preview: string;
  blocks: Block[];
  messages?: DialogueScenarioMessageSnapshot[];
  artifacts?: ArtifactItem[];
  panel?: DialogueGeneratedPanelState;
  results?: DialogueGeneratedResultItem[];
  followupSuggestions?: string[];
}

export interface DialogueScenarioMessageSnapshot {
  key: string;
  author?: string;
  preview: string;
  blocks: Block[];
  followupSuggestions?: string[];
}

interface DialogueScenarioDefinition {
  employeeId: string;
  agentName: string;
  sessionId: string;
  title: string;
  updatedAt: string;
  triggerQuestion: string;
  seeded?: boolean;
  buildFrames: (sessionId: string) => DialogueScenarioFrame[];
}

/**
 * 对话场景化模拟定义。
 */
export interface DialogueScenario {
  employeeId: string;
  title: string;
  triggerQuestion: string;
  frames: DialogueScenarioFrame[];
}

export interface DialogueScenarioReplayRound {
  agentName: string;
  question: string;
  updatedAt: string;
  frames: DialogueScenarioFrame[];
}

export interface DialogueScenarioReplay {
  employeeId: string;
  title: string;
  triggerQuestion: string;
  rounds: DialogueScenarioReplayRound[];
}

const SCENARIO_SEED_IDS: Record<string, string> = {
  "employee-pm": "dialogue-seed-sequence-overview",
  "employee-designer": "dialogue-seed-employee-assess",
  "employee-research": "dialogue-seed-redline-detect",
  "employee-ops": "dialogue-seed-benchmark-find",
  "employee-sales": "dialogue-seed-score-rank",
  "employee-product-manager": "dialogue-seed-product-manager-prd",
  "employee-writer": "dialogue-seed-ceo-sequence-overview",
};

const FINAL_TEXT_BLOCK_SUFFIX = "-final";
const TYPEWRITER_BATCH_SIZE = 3;
const TYPEWRITER_STEP_MS = 28;
const TYPEWRITER_MIN_DELAY_MS = 900;
const TYPEWRITER_MAX_DELAY_MS = 3600;
const TYPEWRITER_FRAME_MIN_DELAY_MS = 72;
const TYPEWRITER_FRAME_MAX_DELAY_MS = 168;
const TYPEWRITER_TARGET_CHARS_PER_STEP = 18;
const TYPEWRITER_MAX_PROGRESS_STEPS = 12;

const SCENARIO_TOOL_DISPLAY_NAMES: Record<string, string> = {
  sequence_overview: "序列总览",
  alert_digest: "预警摘要",
  employee_assess: "员工评估",
  redline_detect: "红线检测",
  erp_query: "ERP 数据查询",
  interview_prepare: "约谈准备",
  benchmark_find: "标杆识别",
  talent_recommend: "人才培养建议",
  score_rank: "评分排名",
  attention_risk_digest: "关注区风险摘要",
  management_plan: "管理动作生成",
  task_dispatch: "任务分发",
  requirements_summary: "需求摘要",
  prd_generate: "PRD 生成",
  backlog_breakdown: "Backlog 拆解",
  milestone_plan: "里程碑规划",
  feishu_contact_lookup: "飞书通讯录查询",
  feishu_send_message: "飞书消息发送",
  live_brief_ingest: "商品资料整理",
  live_script_outline: "脚本框架生成",
  live_script_polish: "讲品话术润色",
  category_match: "投放赛道归类",
  tikhub_xingtu_search: "星图达人搜索",
  creator_scoring: "投放评分",
  tikhub_billboard: "抖音热榜抓取",
  topic_match: "热点匹配",
  opening_hook_generate: "口播建议生成",
  douyin_video_scan: "抖音视频抓取",
  heat_score: "热度评分",
  product_pick_suggestion: "选品建议",
  weibo_search: "微博检索",
  risk_cluster: "舆情聚类",
  forbidden_words_generate: "违禁词建议",
  brief_align: "直播类型校准",
  rundown_generate: "Rundown 框架生成",
  conversion_module_deepen: "转化环节深化",
  price_sheet_parse: "货盘字段识别",
  margin_guard_check: "毛利率校验",
  public_price_scan: "公开平台比价",
  pricing_band_generate: "定价区间生成",
  sku_sheet_parse: "货盘 SKU 解析",
  weidian_catalog_sync: "微店在售拉取",
  sku_quality_compare: "六维质检比对",
  quality_summary_push: "质检摘要推送",
  order_status_poll: "订单状态轮询",
  shipping_timeout_detect: "超时规则识别",
  supplier_routing_alert: "供应商路由告警",
  refund_case_scan: "退款拒绝扫描",
  refund_risk_score: "退款风险评级",
  ops_group_alert: "运营群告警",
  review_stream_collect: "评价流采集",
  review_keyword_cluster: "高频问题聚类",
  review_digest_push: "差评摘要推送",
  exception_merge: "异常结果合并",
  ops_brief_generate: "播报生成",
  action_route_generate: "责任方路由",
};

const CEO_SEQUENCE_OVERVIEW_QUESTION = "给我看一下各序列的整体情况，按平均分排序。";
const CEO_EMPLOYEE_ASSESS_QUESTION = "质量/食品安全序列王建国";
const CEO_REDLINE_QUESTION = "小张最近有没有触碰红线？";
const CEO_BENCHMARK_QUESTION = "生产序列最近有哪些表现突出的标杆？我想了解一下。";
const CEO_SCORE_RANK_QUESTION = "销售序列这季度的人员排名怎么样？有没有需要关注的？";
const CEO_FEISHU_ENTRY_QUESTION = "管理和销售这两条线今天该怎么收口？";
const CEO_FEISHU_DISPATCH_QUESTION = "把管理和销售今天要收口的内容发给负责人。";
const CEO_FEISHU_MANAGEMENT_FOCUS_QUESTION = "把管理序列那段单独发给管理负责人，语气再重一点。";

const PRODUCT_MANAGER_PRD_FOLLOWUPS = [
  PRODUCT_MANAGER_BACKLOG_QUESTION,
  "把这版 PRD 的范围边界和不做项再补完整。",
  "继续给我一版阶段里程碑和评审节奏。",
  "把用户工作台、企业后台、FDE 三段范围拆成更清晰的小节。",
];

const PRODUCT_MANAGER_BACKLOG_FOLLOWUPS = [
  PRODUCT_MANAGER_PRD_QUESTION,
  "继续把 P0 项补成验收清单。",
  "把这版 Backlog 再按迭代拆成里程碑。",
  "帮我单独抽一段本期不做范围。",
];

const PRODUCT_TEAM_COLLAB_QUESTION = "帮我把这个需求拆成核心模块、边界和依赖关系。";
const PRODUCT_TEAM_RISK_QUESTION = "这版方案上线前，架构层面最需要提前规避哪些风险？";
const PRODUCT_TEAM_MAIN_AGENT_NAME = "产品策略官";
const PRODUCT_TEAM_ARCHITECT_AVATAR_URL = getAvatarUrl("employee-architect");
const PRODUCT_TEAM_GROWTH_AVATAR_URL = getAvatarUrl("employee-growth");
const PRODUCT_TEAM_QA_AVATAR_URL = getAvatarUrl("employee-qa");
const PRODUCT_TEAM_DATA_AVATAR_URL = getAvatarUrl("employee-data");
const PRODUCT_TEAM_USER_RESEARCH_AVATAR_URL = getAvatarUrl("employee-user-researcher");

const PRODUCT_TEAM_COLLAB_FOLLOWUPS = [
  PRODUCT_TEAM_RISK_QUESTION,
  "如果只做 MVP，第一期必须上线哪些能力？",
  "把这套协作方案继续拆成验收清单和负责人。",
  "给我一版主 agent 调度其他专家的交付节奏。",
];

const PRODUCT_TEAM_RISK_FOLLOWUPS = [
  "把高风险项拆成上线前检查清单。",
  "如果要灰度发布，第一批应该先验证什么？",
  "把这版方案再压成研发评审会可直接过的口径。",
];

const CEO_SEQUENCE_FOLLOWUPS = [
  CEO_EMPLOYEE_ASSESS_QUESTION,
  "哪个序列的预警最值得我今天盯？",
  "管理序列的 6 个预警大概来自哪几类问题？",
  "把这份盘面压成一段晨会口径。",
  "质量和生产为什么能稳住？",
];

const CEO_EMPLOYEE_ASSESS_FOLLOWUPS = [
  CEO_REDLINE_QUESTION,
  "王建国最强的两个维度是什么？",
  "他离标杆线还差哪一步？",
  "ERP 数据有没有拖后腿？",
  "如果要培养他，第一步怎么带？",
];

const CEO_REDLINE_FOLLOWUPS = [
  CEO_BENCHMARK_QUESTION,
  "这次约谈最该先讲哪一句？",
  "还有哪些人虽然没触碰，但已经在注意区？",
  "张伟这轮要不要暂停对外承诺权限？",
  "把最近红黄灯事件给我压成一页管理口径。",
];

const CEO_BENCHMARK_FOLLOWUPS = [
  CEO_SCORE_RANK_QUESTION,
  "这 3 个人里谁最适合进储备干部名单？",
  "如果我要做表彰，先点名谁最有效？",
  "谁不只是能打，还具备带教能力？",
  "把标杆培养动作也一起列出来。",
];

const CEO_SCORE_RANK_FOLLOWUPS = [
  CEO_FEISHU_ENTRY_QUESTION,
  "关注区 3 个人该怎么一人一策？",
  "李明这个底线问题要先怎么处理？",
  "王强连续下滑的过程问题该先拆哪里？",
  "把销售序列排名结构压成一句老板口径。",
];

const CEO_SYNTHESIS_FOLLOWUPS = [
  CEO_SEQUENCE_OVERVIEW_QUESTION,
  CEO_EMPLOYEE_ASSESS_QUESTION,
  CEO_REDLINE_QUESTION,
  CEO_BENCHMARK_QUESTION,
  CEO_SCORE_RANK_QUESTION,
];

const CEO_FEISHU_ENTRY_FOLLOWUPS = [
  CEO_FEISHU_DISPATCH_QUESTION,
  CEO_FEISHU_MANAGEMENT_FOCUS_QUESTION,
  "把销售负责人那段也单独写得更明确一点。",
  "先把拟发送内容完整给我看。",
  "抄送我和 COO。",
];

const CEO_FEISHU_DISPATCH_FOLLOWUPS = [
  CEO_FEISHU_MANAGEMENT_FOCUS_QUESTION,
  "把销售关注区名单也一起发给销售负责人。",
  "抄送我和 COO。",
  "要求他们今天 17:00 前回执。",
  "把发出去的内容完整给我看一眼。",
];

const CEO_FEISHU_MANAGEMENT_FOLLOWUPS = [
  CEO_FEISHU_DISPATCH_QUESTION,
  "再抄送 COO。",
  "加一句今天中午前必须回我。",
  "如果没回执，下午 3 点自动提醒一次。",
  "把销售负责人也按同样标准发掉。",
];

const SEQUENCE_OVERVIEW_PAGE_IMAGE_URL = new URL(
  "../assets/images/aiCeoScenarioOutputs/sequence-overview-page.png",
  import.meta.url,
).href;
const EMPLOYEE_ASSESS_PAGE_IMAGE_URL = new URL(
  "../assets/images/aiCeoScenarioOutputs/employee-assess-wangjianguo.png",
  import.meta.url,
).href;
const REDLINE_WARNING_PANEL_IMAGE_URL = new URL(
  "../assets/images/aiCeoScenarioOutputs/redline-warning-panel.png",
  import.meta.url,
).href;
const BENCHMARK_PRODUCTION_PAGE_IMAGE_URL = new URL(
  "../assets/images/aiCeoScenarioOutputs/benchmark-production-page.png",
  import.meta.url,
).href;
const BENCHMARK_ACHIEVEMENT_PANEL_IMAGE_URL = new URL(
  "../assets/images/aiCeoScenarioOutputs/benchmark-achievement-panel.png",
  import.meta.url,
).href;
const SCORE_RANK_OVERVIEW_IMAGE_URL = new URL(
  "../assets/images/aiCeoScenarioOutputs/score-rank-overview.png",
  import.meta.url,
).href;
const SCORE_RANK_FULL_LIST_IMAGE_URL = new URL(
  "../assets/images/aiCeoScenarioOutputs/score-rank-full-list.png",
  import.meta.url,
).href;
const CEO_CHAT_DRAWER_IMAGE_URL = new URL(
  "../assets/images/aiCeoScenarioOutputs/ceo-chat-drawer.png",
  import.meta.url,
).href;

const normalizeScenarioQuestion = (value: string): string =>
  value.replace(/[\s，。？！,.!?:：；;]/g, "").trim();

const resolveScenarioToolDisplayName = (name: string, displayName?: string): string => {
  const normalizedDisplayName = displayName?.trim() ?? "";
  const normalizedName = name.trim();
  return (
    SCENARIO_TOOL_DISPLAY_NAMES[normalizedDisplayName] ??
    SCENARIO_TOOL_DISPLAY_NAMES[normalizedName] ??
    (normalizedDisplayName || normalizedName)
  );
};

const estimateTypewriterDelay = (content: string): number => {
  const normalizedLength = content.trim().length;
  if (normalizedLength <= 0) {
    return TYPEWRITER_MIN_DELAY_MS;
  }

  const estimatedDelay =
    Math.ceil(normalizedLength / TYPEWRITER_BATCH_SIZE) * TYPEWRITER_STEP_MS + 260;

  return Math.max(TYPEWRITER_MIN_DELAY_MS, Math.min(TYPEWRITER_MAX_DELAY_MS, estimatedDelay));
};

const estimateTypewriterFrameDelay = (nextContent: string, previousContent: string): number => {
  const nextLength = Array.from(nextContent).length;
  const previousLength = Array.from(previousContent).length;
  const appendedLength = Math.max(1, nextLength - previousLength);
  const punctuationPause = /[，。！？；：、,.!?;:]$/.test(nextContent.trim()) ? 24 : 0;
  const estimatedDelay =
    Math.ceil(appendedLength / TYPEWRITER_BATCH_SIZE) * TYPEWRITER_STEP_MS * 2 + punctuationPause;

  return Math.max(
    TYPEWRITER_FRAME_MIN_DELAY_MS,
    Math.min(TYPEWRITER_FRAME_MAX_DELAY_MS, estimatedDelay),
  );
};

const buildTypewriterProgressSteps = (targetContent: string, currentContent = ""): string[] => {
  const targetCharacters = Array.from(targetContent);
  const currentLength = Array.from(currentContent).length;

  if (targetCharacters.length <= currentLength) {
    return [];
  }

  const remainingLength = targetCharacters.length - currentLength;
  const stepCount = Math.min(
    TYPEWRITER_MAX_PROGRESS_STEPS,
    Math.max(3, Math.ceil(remainingLength / TYPEWRITER_TARGET_CHARS_PER_STEP)),
  );
  const chunkSize = Math.max(TYPEWRITER_BATCH_SIZE * 2, Math.ceil(remainingLength / stepCount));
  const steps: string[] = [];

  for (
    let length = currentLength + chunkSize;
    length < targetCharacters.length;
    length += chunkSize
  ) {
    steps.push(targetCharacters.slice(0, length).join(""));
  }

  steps.push(targetCharacters.join(""));
  return steps;
};

const cloneScenarioBlock = (block: Block): Block => ({
  ...block,
  data: typeof block.data === "object" && block.data !== null ? { ...block.data } : block.data,
  children: block.children?.map(cloneScenarioBlock),
});

const extractScenarioBlockContent = (block: Block): string => {
  if (typeof block.data !== "object" || block.data === null || !("content" in block.data)) {
    return "";
  }

  return typeof block.data.content === "string" ? block.data.content : "";
};

const buildScenarioContentBlockWithState = (
  block: Block,
  options: { id?: string; content: string; isStreaming: boolean },
): Block => {
  const nextBlock = cloneScenarioBlock(block);

  if (options.id) {
    nextBlock.id = options.id;
  }

  nextBlock.isStreaming = options.isStreaming;

  if (typeof nextBlock.data === "object" && nextBlock.data !== null) {
    nextBlock.data = {
      ...nextBlock.data,
      content: options.content,
      status: options.isStreaming ? "streaming" : "completed",
    };
  }

  return nextBlock;
};

const areScenarioBlocksEqual = (left: Block, right: Block): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const upsertScenarioChildBlock = (children: Block[], block: Block): Block[] => {
  const nextChildren = [...children];
  const targetIndex = nextChildren.findIndex(item => item.id === block.id);

  if (targetIndex >= 0) {
    nextChildren[targetIndex] = block;
    return nextChildren;
  }

  if (block.kind === "text" || block.kind === "result_cards") {
    nextChildren.push(block);
    return nextChildren;
  }

  const firstTextBlockIndex = nextChildren.findIndex(item => item.kind === "text");

  if (firstTextBlockIndex >= 0) {
    nextChildren.splice(firstTextBlockIndex, 0, block);
    return nextChildren;
  }

  nextChildren.push(block);
  return nextChildren;
};

const buildScenarioMessageBlocks = (
  messageId: string,
  children: Block[],
  results?: DialogueGeneratedResultItem[],
): Block[] => [
  {
    id: messageId,
    kind: "message",
    data: {
      role: "assistant",
    },
    actorRole: "assistant",
    isStreaming: children.some(child => child.isStreaming === true),
    children: results?.length
      ? upsertScenarioChildBlock(
          children,
          createResultCardsBlock(`${messageId}-result-cards`, results),
        )
      : children,
  },
];

const buildScenarioMessageSnapshot = (
  messageId: string,
  preview: string,
  children: Block[],
  options?: {
    author?: string;
    results?: DialogueGeneratedResultItem[];
    followupSuggestions?: string[];
  },
): DialogueScenarioMessageSnapshot => ({
  key: messageId,
  author: options?.author,
  preview,
  blocks: buildScenarioMessageBlocks(messageId, children, options?.results),
  followupSuggestions: options?.followupSuggestions,
});

const buildScenarioMessageFrame = (
  messageId: string,
  children: Block[],
  preview: string,
  delayMs: number,
  artifacts?: ArtifactItem[],
  panel?: DialogueGeneratedPanelState,
  results?: DialogueGeneratedResultItem[],
  followupSuggestions?: string[],
): DialogueScenarioFrame => ({
  delayMs,
  preview,
  artifacts,
  panel,
  results,
  followupSuggestions,
  blocks: buildScenarioMessageBlocks(messageId, children, results),
  messages: [
    buildScenarioMessageSnapshot(messageId, preview, children, {
      results,
      followupSuggestions,
    }),
  ],
});

const buildScenarioConversationFrame = (
  messages: DialogueScenarioMessageSnapshot[],
  preview: string,
  delayMs: number,
  artifacts?: ArtifactItem[],
  panel?: DialogueGeneratedPanelState,
  results?: DialogueGeneratedResultItem[],
  followupSuggestions?: string[],
): DialogueScenarioFrame => ({
  delayMs,
  preview,
  artifacts,
  panel,
  results,
  followupSuggestions,
  blocks: messages[messages.length - 1]?.blocks ?? [],
  messages,
});

interface ScenarioMessagePlaybackState {
  key: string;
  messageId: string;
  author?: string;
  preview: string;
  children: Block[];
  followupSuggestions?: string[];
  lastThinkingContent: string;
}

const buildScenarioConversationFrameFromStates = (
  states: ScenarioMessagePlaybackState[],
  preview: string,
  delayMs: number,
  artifacts?: ArtifactItem[],
  panel?: DialogueGeneratedPanelState,
  results?: DialogueGeneratedResultItem[],
  followupSuggestions?: string[],
): DialogueScenarioFrame => {
  const messages = states.map(state => ({
    key: state.key,
    author: state.author,
    preview: state.preview,
    blocks: buildScenarioMessageBlocks(state.messageId, state.children),
    followupSuggestions: state.followupSuggestions,
  }));

  return {
    delayMs,
    preview,
    artifacts,
    panel,
    results,
    followupSuggestions,
    blocks: messages[messages.length - 1]?.blocks ?? [],
    messages,
  };
};

const expandSingleMessageFramesForTypewriter = (
  frames: DialogueScenarioFrame[],
): DialogueScenarioFrame[] => {
  const timelineFrames: DialogueScenarioFrame[] = [];
  let messageId = "";
  let accumulatedChildren: Block[] = [];
  let lastThinkingContent = "";

  const pushFrame = (
    preview: string,
    delayMs: number,
    artifacts?: ArtifactItem[],
    panel?: DialogueGeneratedPanelState,
    results?: DialogueGeneratedResultItem[],
    followupSuggestions?: string[],
  ): void => {
    timelineFrames.push(
      buildScenarioMessageFrame(
        messageId,
        accumulatedChildren,
        preview,
        delayMs,
        artifacts,
        panel,
        results,
        followupSuggestions,
      ),
    );
  };

  const upsertStaticBlocks = (blocks: Block[]): boolean => {
    let hasChanged = false;

    blocks.forEach(block => {
      const nextBlock = cloneScenarioBlock(block);
      const currentBlock = accumulatedChildren.find(child => child.id === nextBlock.id);

      if (currentBlock && areScenarioBlocksEqual(currentBlock, nextBlock)) {
        return;
      }

      accumulatedChildren = upsertScenarioChildBlock(accumulatedChildren, nextBlock);
      hasChanged = true;
    });

    return hasChanged;
  };

  const finalizeStreamingBlock = (sourceBlock: Block, blockId: string): void => {
    const currentBlock = accumulatedChildren.find(child => child.id === blockId);

    if (!currentBlock || currentBlock.isStreaming !== true) {
      return;
    }

    accumulatedChildren = upsertScenarioChildBlock(
      accumulatedChildren,
      buildScenarioContentBlockWithState(sourceBlock, {
        id: blockId,
        content: extractScenarioBlockContent(currentBlock),
        isStreaming: false,
      }),
    );
  };

  const getLatestThinkingBlock = (): Block | undefined =>
    [...accumulatedChildren].reverse().find(child => child.kind === "thinking");

  const findLatestBlockIndex = (kind: Block["kind"]): number => {
    for (let index = accumulatedChildren.length - 1; index >= 0; index -= 1) {
      if (accumulatedChildren[index]?.kind === kind) {
        return index;
      }
    }

    return -1;
  };

  const resolveThinkingBlockId = (sourceThinkingId: string): string => {
    const latestThinkingBlock = getLatestThinkingBlock();

    if (!latestThinkingBlock) {
      return sourceThinkingId;
    }

    const latestThinkingIndex = findLatestBlockIndex("thinking");
    const latestToolIndex = findLatestBlockIndex("tool_use");

    if (latestThinkingIndex > latestToolIndex) {
      return latestThinkingBlock.id;
    }

    const phaseCount =
      accumulatedChildren.filter(
        child =>
          child.kind === "thinking" &&
          (child.id === sourceThinkingId || child.id.startsWith(`${sourceThinkingId}-phase-`)),
      ).length + 1;

    return `${sourceThinkingId}-phase-${phaseCount}`;
  };

  const streamTextualBlock = (
    sourceBlock: Block,
    blockId: string,
    targetContent: string,
    options: {
      keepStreamingAtEnd: boolean;
      preview: string;
      artifacts?: ArtifactItem[];
      panel?: DialogueGeneratedPanelState;
      results?: DialogueGeneratedResultItem[];
      followupSuggestions?: string[];
    },
  ): boolean => {
    const currentBlock = accumulatedChildren.find(child => child.id === blockId);
    const currentContent = currentBlock ? extractScenarioBlockContent(currentBlock) : "";
    const progressSteps = buildTypewriterProgressSteps(targetContent, currentContent);

    if (progressSteps.length === 0) {
      const nextBlock = buildScenarioContentBlockWithState(sourceBlock, {
        id: blockId,
        content: targetContent,
        isStreaming: options.keepStreamingAtEnd,
      });

      if (!currentBlock || !areScenarioBlocksEqual(currentBlock, nextBlock)) {
        accumulatedChildren = upsertScenarioChildBlock(accumulatedChildren, nextBlock);
      }

      return false;
    }

    let previousContent = currentContent;

    progressSteps.forEach((contentStep, index) => {
      const isLastStep = index === progressSteps.length - 1;

      accumulatedChildren = upsertScenarioChildBlock(
        accumulatedChildren,
        buildScenarioContentBlockWithState(sourceBlock, {
          id: blockId,
          content: contentStep,
          isStreaming: isLastStep ? options.keepStreamingAtEnd : true,
        }),
      );

      pushFrame(
        isLastStep ? options.preview : contentStep,
        estimateTypewriterFrameDelay(contentStep, previousContent),
        isLastStep ? options.artifacts : undefined,
        isLastStep ? options.panel : undefined,
        isLastStep ? options.results : undefined,
        isLastStep ? options.followupSuggestions : undefined,
      );

      previousContent = contentStep;
    });

    return true;
  };

  frames.forEach(frame => {
    const messageBlock = frame.blocks.find(block => block.kind === "message");
    const messageChildren = messageBlock?.children ?? [];
    const thinkingBlock = messageChildren.find(block => block.kind === "thinking");
    const toolBlocks = messageChildren.filter(block => block.kind === "tool_use");
    const finalTextBlocks = messageChildren.filter(
      block => block.kind === "text" && block.id.endsWith(FINAL_TEXT_BLOCK_SUFFIX),
    );
    const hasActionBlocks =
      toolBlocks.length > 0 || finalTextBlocks.length > 0 || (frame.results?.length ?? 0) > 0;
    const preview = frame.preview.trim();
    let hasPushedFrame = false;

    if (!messageId) {
      messageId = messageBlock?.id ?? `scenario-message-${Date.now()}`;
    }

    const thinkingContent = thinkingBlock ? extractScenarioBlockContent(thinkingBlock).trim() : "";

    if (thinkingBlock && thinkingContent) {
      if (thinkingContent !== lastThinkingContent) {
        const nextThinkingId = resolveThinkingBlockId(thinkingBlock.id);
        hasPushedFrame =
          streamTextualBlock(thinkingBlock, nextThinkingId, thinkingContent, {
            keepStreamingAtEnd: !hasActionBlocks,
            preview: preview || thinkingContent,
            panel: !hasActionBlocks ? frame.panel : undefined,
            followupSuggestions: !hasActionBlocks ? frame.followupSuggestions : undefined,
          }) || hasPushedFrame;
        lastThinkingContent = thinkingContent;

        if (!hasActionBlocks) {
          return;
        }
      } else if (hasActionBlocks) {
        const lastThinkingBlock = getLatestThinkingBlock();

        if (lastThinkingBlock) {
          finalizeStreamingBlock(thinkingBlock, lastThinkingBlock.id);
        }
      }
    }

    const didToolsChange = upsertStaticBlocks(toolBlocks);

    if (didToolsChange && finalTextBlocks.length === 0) {
      pushFrame(
        preview || lastThinkingContent,
        frame.delayMs,
        frame.artifacts,
        frame.panel,
        frame.results,
        frame.followupSuggestions,
      );
      hasPushedFrame = true;
    }

    finalTextBlocks.forEach((block, index) => {
      const finalText = extractScenarioBlockContent(block);

      if (!finalText) {
        accumulatedChildren = upsertScenarioChildBlock(
          accumulatedChildren,
          cloneScenarioBlock(block),
        );
        return;
      }

      const isLastTextBlock = index === finalTextBlocks.length - 1;
      hasPushedFrame =
        streamTextualBlock(block, block.id, finalText, {
          keepStreamingAtEnd: block.isStreaming === true,
          preview: preview || finalText,
          artifacts: isLastTextBlock ? frame.artifacts : undefined,
          panel: isLastTextBlock ? frame.panel : undefined,
          results: isLastTextBlock ? frame.results : undefined,
          followupSuggestions: isLastTextBlock ? frame.followupSuggestions : undefined,
        }) || hasPushedFrame;
    });

    if (
      !hasPushedFrame &&
      (didToolsChange ||
        frame.artifacts?.length ||
        frame.results?.length ||
        finalTextBlocks.length > 0 ||
        frame.followupSuggestions?.length)
    ) {
      pushFrame(
        preview || lastThinkingContent,
        frame.delayMs,
        frame.artifacts,
        frame.panel,
        frame.results,
        frame.followupSuggestions,
      );
    }
  });

  return timelineFrames;
};

const expandConversationFramesForTypewriter = (
  frames: DialogueScenarioFrame[],
): DialogueScenarioFrame[] => {
  const timelineFrames: DialogueScenarioFrame[] = [];
  const messageStates: ScenarioMessagePlaybackState[] = [];
  const messageStateMap = new Map<string, ScenarioMessagePlaybackState>();

  const ensureMessageState = (
    frameMessage: DialogueScenarioMessageSnapshot,
  ): ScenarioMessagePlaybackState => {
    const currentState = messageStateMap.get(frameMessage.key);
    if (currentState) {
      currentState.author = frameMessage.author;
      currentState.followupSuggestions = frameMessage.followupSuggestions;
      return currentState;
    }

    const messageBlock = frameMessage.blocks.find(block => block.kind === "message");
    const nextState: ScenarioMessagePlaybackState = {
      key: frameMessage.key,
      messageId: messageBlock?.id ?? frameMessage.key,
      author: frameMessage.author,
      preview: frameMessage.preview,
      children: [],
      followupSuggestions: frameMessage.followupSuggestions,
      lastThinkingContent: "",
    };

    messageStateMap.set(frameMessage.key, nextState);
    messageStates.push(nextState);
    return nextState;
  };

  const pushFrame = (
    pendingFrames: DialogueScenarioFrame[],
    preview: string,
    delayMs: number,
    artifacts?: ArtifactItem[],
    panel?: DialogueGeneratedPanelState,
    results?: DialogueGeneratedResultItem[],
    followupSuggestions?: string[],
  ): void => {
    pendingFrames.push(
      buildScenarioConversationFrameFromStates(
        messageStates,
        preview,
        delayMs,
        artifacts,
        panel,
        results,
        followupSuggestions,
      ),
    );
  };

  const upsertStaticBlocks = (state: ScenarioMessagePlaybackState, blocks: Block[]): boolean => {
    let hasChanged = false;

    blocks.forEach(block => {
      const nextBlock = cloneScenarioBlock(block);
      const currentBlock = state.children.find(child => child.id === nextBlock.id);

      if (currentBlock && areScenarioBlocksEqual(currentBlock, nextBlock)) {
        return;
      }

      state.children = upsertScenarioChildBlock(state.children, nextBlock);
      hasChanged = true;
    });

    return hasChanged;
  };

  const finalizeStreamingBlock = (
    state: ScenarioMessagePlaybackState,
    sourceBlock: Block,
    blockId: string,
  ): void => {
    const currentBlock = state.children.find(child => child.id === blockId);

    if (!currentBlock || currentBlock.isStreaming !== true) {
      return;
    }

    state.children = upsertScenarioChildBlock(
      state.children,
      buildScenarioContentBlockWithState(sourceBlock, {
        id: blockId,
        content: extractScenarioBlockContent(currentBlock),
        isStreaming: false,
      }),
    );
  };

  const getLatestThinkingBlock = (state: ScenarioMessagePlaybackState): Block | undefined =>
    [...state.children].reverse().find(child => child.kind === "thinking");

  const findLatestBlockIndex = (
    state: ScenarioMessagePlaybackState,
    kind: Block["kind"],
  ): number => {
    for (let index = state.children.length - 1; index >= 0; index -= 1) {
      if (state.children[index]?.kind === kind) {
        return index;
      }
    }

    return -1;
  };

  const resolveThinkingBlockId = (
    state: ScenarioMessagePlaybackState,
    sourceThinkingId: string,
  ): string => {
    const latestThinkingBlock = getLatestThinkingBlock(state);

    if (!latestThinkingBlock) {
      return sourceThinkingId;
    }

    const latestThinkingIndex = findLatestBlockIndex(state, "thinking");
    const latestToolIndex = findLatestBlockIndex(state, "tool_use");

    if (latestThinkingIndex > latestToolIndex) {
      return latestThinkingBlock.id;
    }

    const phaseCount =
      state.children.filter(
        child =>
          child.kind === "thinking" &&
          (child.id === sourceThinkingId || child.id.startsWith(`${sourceThinkingId}-phase-`)),
      ).length + 1;

    return `${sourceThinkingId}-phase-${phaseCount}`;
  };

  const streamTextualBlock = (
    pendingFrames: DialogueScenarioFrame[],
    state: ScenarioMessagePlaybackState,
    sourceBlock: Block,
    blockId: string,
    targetContent: string,
    options: {
      keepStreamingAtEnd: boolean;
      preview: string;
      artifacts?: ArtifactItem[];
      panel?: DialogueGeneratedPanelState;
      results?: DialogueGeneratedResultItem[];
      followupSuggestions?: string[];
    },
  ): boolean => {
    const currentBlock = state.children.find(child => child.id === blockId);
    const currentContent = currentBlock ? extractScenarioBlockContent(currentBlock) : "";
    const progressSteps = buildTypewriterProgressSteps(targetContent, currentContent);

    if (progressSteps.length === 0) {
      const nextBlock = buildScenarioContentBlockWithState(sourceBlock, {
        id: blockId,
        content: targetContent,
        isStreaming: options.keepStreamingAtEnd,
      });

      if (!currentBlock || !areScenarioBlocksEqual(currentBlock, nextBlock)) {
        state.children = upsertScenarioChildBlock(state.children, nextBlock);
      }

      state.preview = options.preview || state.preview;
      return false;
    }

    let previousContent = currentContent;

    progressSteps.forEach((contentStep, index) => {
      const isLastStep = index === progressSteps.length - 1;

      state.children = upsertScenarioChildBlock(
        state.children,
        buildScenarioContentBlockWithState(sourceBlock, {
          id: blockId,
          content: contentStep,
          isStreaming: isLastStep ? options.keepStreamingAtEnd : true,
        }),
      );
      state.preview = isLastStep ? options.preview || contentStep : contentStep;

      pushFrame(
        pendingFrames,
        isLastStep ? state.preview : contentStep,
        estimateTypewriterFrameDelay(contentStep, previousContent),
        isLastStep ? options.artifacts : undefined,
        isLastStep ? options.panel : undefined,
        isLastStep ? options.results : undefined,
        isLastStep ? options.followupSuggestions : undefined,
      );

      previousContent = contentStep;
    });

    return true;
  };

  frames.forEach(frame => {
    const frameMessages = frame.messages ?? [];
    const pendingFrames: DialogueScenarioFrame[] = [];
    let hasPushedFrame = false;

    frameMessages.forEach(frameMessage => {
      const state = ensureMessageState(frameMessage);
      const messageBlock = frameMessage.blocks.find(block => block.kind === "message");
      const messageChildren = messageBlock?.children ?? [];
      const thinkingBlock = messageChildren.find(block => block.kind === "thinking");
      const textBlocks = messageChildren.filter(block => block.kind === "text");
      const staticBlocks = messageChildren.filter(
        block => block.kind !== "thinking" && block.kind !== "text",
      );
      const hasActionBlocks =
        staticBlocks.length > 0 ||
        textBlocks.length > 0 ||
        (frameMessage.followupSuggestions?.length ?? 0) > 0;
      const preview = frameMessage.preview.trim();
      let messageHasPushedFrame = false;

      state.author = frameMessage.author;
      state.followupSuggestions = frameMessage.followupSuggestions;

      const thinkingContent = thinkingBlock
        ? extractScenarioBlockContent(thinkingBlock).trim()
        : "";

      if (thinkingBlock && thinkingContent) {
        if (thinkingContent !== state.lastThinkingContent) {
          const nextThinkingId = resolveThinkingBlockId(state, thinkingBlock.id);
          messageHasPushedFrame =
            streamTextualBlock(
              pendingFrames,
              state,
              thinkingBlock,
              nextThinkingId,
              thinkingContent,
              {
                keepStreamingAtEnd: !hasActionBlocks,
                preview: preview || thinkingContent,
                panel: !hasActionBlocks ? frame.panel : undefined,
                followupSuggestions: !hasActionBlocks ? frame.followupSuggestions : undefined,
              },
            ) || messageHasPushedFrame;
          state.lastThinkingContent = thinkingContent;

          if (!hasActionBlocks) {
            hasPushedFrame = hasPushedFrame || messageHasPushedFrame;
            return;
          }
        } else if (hasActionBlocks) {
          const latestThinkingBlock = getLatestThinkingBlock(state);

          if (latestThinkingBlock) {
            finalizeStreamingBlock(state, thinkingBlock, latestThinkingBlock.id);
          }
        }
      }

      const didStaticBlocksChange = upsertStaticBlocks(state, staticBlocks);

      if (didStaticBlocksChange && textBlocks.length === 0) {
        state.preview = preview || state.lastThinkingContent || state.preview;
        pushFrame(
          pendingFrames,
          state.preview,
          frame.delayMs,
          undefined,
          undefined,
          undefined,
          undefined,
        );
        messageHasPushedFrame = true;
      }

      textBlocks.forEach((block, index) => {
        const textContent = extractScenarioBlockContent(block);

        if (!textContent) {
          state.children = upsertScenarioChildBlock(state.children, cloneScenarioBlock(block));
          return;
        }

        const isLastTextBlock = index === textBlocks.length - 1;
        messageHasPushedFrame =
          streamTextualBlock(pendingFrames, state, block, block.id, textContent, {
            keepStreamingAtEnd: block.isStreaming === true,
            preview: preview || textContent,
            artifacts: isLastTextBlock ? frame.artifacts : undefined,
            panel: isLastTextBlock ? frame.panel : undefined,
            results: isLastTextBlock ? frame.results : undefined,
            followupSuggestions: isLastTextBlock ? frame.followupSuggestions : undefined,
          }) || messageHasPushedFrame;
      });

      if (
        !messageHasPushedFrame &&
        (didStaticBlocksChange ||
          frame.artifacts?.length ||
          frame.results?.length ||
          textBlocks.length > 0 ||
          frame.followupSuggestions?.length)
      ) {
        state.preview = preview || state.lastThinkingContent || state.preview;
        pushFrame(
          pendingFrames,
          state.preview,
          frame.delayMs,
          undefined,
          undefined,
          undefined,
          undefined,
        );
        messageHasPushedFrame = true;
      }

      hasPushedFrame = hasPushedFrame || messageHasPushedFrame;
    });

    if (!hasPushedFrame && (frame.artifacts?.length || frame.results?.length || frame.panel)) {
      pushFrame(
        pendingFrames,
        frame.preview,
        frame.delayMs,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    }

    if (!pendingFrames.length) {
      return;
    }

    const lastFrame = pendingFrames[pendingFrames.length - 1];
    pendingFrames[pendingFrames.length - 1] = {
      ...lastFrame,
      preview: frame.preview || lastFrame.preview,
      artifacts: frame.artifacts,
      panel: frame.panel,
      results: frame.results,
      followupSuggestions: frame.followupSuggestions,
    };

    timelineFrames.push(...pendingFrames);
  });

  return timelineFrames;
};

const expandFramesForTypewriter = (frames: DialogueScenarioFrame[]): DialogueScenarioFrame[] => {
  if (frames.some(frame => frame.messages?.length)) {
    return expandConversationFramesForTypewriter(frames);
  }

  return expandSingleMessageFramesForTypewriter(frames);
};

const createAssistantMessageBlock = (
  id: string,
  children: Block[],
  isStreaming = false,
): Block => ({
  id,
  kind: "message",
  data: {
    role: "assistant",
  },
  actorRole: "assistant",
  isStreaming,
  children,
});

const createThinkingBlock = (id: string, content: string, isStreaming = false): Block => ({
  id,
  kind: "thinking",
  data: {
    content,
    status: isStreaming ? "streaming" : "completed",
  },
  actorRole: "assistant",
  isStreaming,
});

const createTextBlock = (id: string, content: string, options?: CreateTextBlockOptions): Block => ({
  id,
  kind: "text",
  data: {
    content,
    status: options?.isStreaming ? "streaming" : "completed",
    role: "assistant",
    message_type: options?.messageType,
  },
  actorRole: "assistant",
  isStreaming: options?.isStreaming === true,
});

const createResultCardsBlock = (id: string, results: DialogueGeneratedResultItem[]): Block => ({
  id,
  kind: "result_cards",
  data: {
    title: "结果",
    items: results.map(result => ({
      id: result.id,
      title: result.title,
      subtitle: result.subtitle,
      created_at: result.createdAt,
      badge: result.badge,
    })),
  },
  actorRole: "assistant",
});

const createToolUseBlock = ({
  id,
  name,
  displayName,
  purpose,
  status,
  avatarUrl,
  avatarLabel,
  output,
  contactResults,
  isError,
}: CreateToolUseBlockOptions): Block => {
  const callId = `${id}-call`;

  return {
    id,
    kind: "tool_use",
    data: {
      name,
      display_name: resolveScenarioToolDisplayName(name, displayName),
      purpose,
      status,
      call_id: callId,
      avatar_url: avatarUrl,
      avatar_label: avatarLabel,
      contact_results: contactResults,
    },
    actorRole: "assistant",
    children: output
      ? [
          {
            id: `${id}-result`,
            kind: "tool_result",
            parentId: id,
            data: {
              call_id: callId,
              content: output,
              is_error: isError === true,
            },
            actorRole: "assistant",
          },
        ]
      : undefined,
  };
};

const createDataUrl = (mimeType: string, content: string): string =>
  `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;

const createSvgDataUrl = (content: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;

const prettyJson = (value: unknown): string => JSON.stringify(value, null, 2);

const resolveTextArtifactSize = (content: string): string =>
  formatFileSize(new TextEncoder().encode(content).length);

const createMarkdownArtifact = (
  sessionId: string,
  suffix: string,
  fileName: string,
  producerName: string,
  taskName: string,
  content: string,
  producedAt: string,
  fileSize: string,
): ArtifactItem => ({
  id: `${sessionId}-${suffix}`,
  artifactId: `${sessionId}-${suffix}`,
  fileName,
  fileType: "md",
  producerName,
  producedAt,
  fileSize,
  taskName,
  canonicalPath: createDataUrl("text/markdown", content),
  mimeType: "text/markdown",
});

const createJsonArtifact = (
  sessionId: string,
  suffix: string,
  fileName: string,
  producerName: string,
  taskName: string,
  content: string,
  producedAt: string,
  fileSize: string,
): ArtifactItem => ({
  id: `${sessionId}-${suffix}`,
  artifactId: `${sessionId}-${suffix}`,
  fileName,
  fileType: "json",
  producerName,
  producedAt,
  fileSize,
  taskName,
  canonicalPath: createDataUrl("application/json", content),
  mimeType: "application/json",
});

const createSvgArtifact = (
  sessionId: string,
  suffix: string,
  fileName: string,
  producerName: string,
  taskName: string,
  content: string,
  producedAt: string,
  fileSize: string,
): ArtifactItem => ({
  id: `${sessionId}-${suffix}`,
  artifactId: `${sessionId}-${suffix}`,
  fileName,
  fileType: "svg",
  producerName,
  producedAt,
  fileSize,
  taskName,
  canonicalPath: createSvgDataUrl(content),
  mimeType: "image/svg+xml",
});

const createImageArtifact = (
  sessionId: string,
  suffix: string,
  fileName: string,
  producerName: string,
  taskName: string,
  imageUrl: string,
  producedAt: string,
  fileSize: string,
): ArtifactItem => ({
  id: `${sessionId}-${suffix}`,
  artifactId: `${sessionId}-${suffix}`,
  fileName,
  fileType: "png",
  producerName,
  producedAt,
  fileSize,
  taskName,
  canonicalPath: imageUrl,
  mimeType: "image/png",
});

const getScenarioArtifactBySuffix = (
  artifacts: ArtifactItem[],
  suffix: string,
): ArtifactItem | undefined => artifacts.find(item => item.id.endsWith(suffix));

const buildArtifactGroup = (...artifacts: Array<ArtifactItem | undefined>): ArtifactItem[] =>
  artifacts.filter((item): item is ArtifactItem => Boolean(item));

const createSequenceOverviewPanelState = (
  sessionId: string,
  status: DialogueGeneratedPanelStatus,
): DialogueGeneratedPanelState => ({
  id: `${sessionId}-panel-sequence-overview`,
  kind: "sequenceOverview",
  title: "序列总览",
  subtitle:
    status === "running"
      ? "正在根据最新评分与预警生成经营总览看板"
      : "评分、预警和趋势已整理为晨会总览面板",
  skillName: "序列总览",
  updatedAt: "刚刚",
  status,
  payload: {
    summaryMetrics: [
      { label: "人员总数", value: "203", hint: "覆盖 11 个业务序列", tone: "accent" },
      { label: "平均评分", value: "72.3", delta: "+2.3", tone: "warning" },
      { label: "待处理预警", value: "9", hint: "3 红 6 黄", tone: "danger" },
      { label: "标杆达成率", value: "10%", hint: "环比持平", tone: "positive" },
    ],
    sortLabel: "得分从高到低",
    sequenceCards: [
      {
        id: "finance",
        name: "财务序列",
        peopleLabel: "8 人",
        roleLabel: "财务管理人员",
        score: "82.3",
        trend: "+0.8",
        benchmarkLabel: "2 标杆",
        alertLabel: "0 关注",
        focusTags: [
          { label: "业财融合语言", tone: "accent" },
          { label: "合规提醒艺术", tone: "accent" },
          { label: "数据叙事", tone: "accent" },
        ],
      },
      {
        id: "quality",
        name: "质量/食品安全序列",
        peopleLabel: "12 人",
        roleLabel: "质量管控人员",
        score: "81.5",
        trend: "+1.2",
        benchmarkLabel: "2 标杆",
        alertLabel: "0 关注",
        focusTags: [
          { label: "风险预判", tone: "positive" },
          { label: "跨部门影响艺术", tone: "accent" },
          { label: "法规敏锐度", tone: "warning" },
        ],
      },
      {
        id: "hr",
        name: "人力/行政序列",
        peopleLabel: "10 人",
        roleLabel: "人力行政人员",
        score: "79.1",
        trend: "+0.5",
        benchmarkLabel: "2 标杆",
        alertLabel: "0 关注",
        focusTags: [
          { label: "文化渗透", tone: "accent" },
          { label: "非正式沟通", tone: "warning" },
          { label: "冲突调解", tone: "accent" },
        ],
      },
      {
        id: "management",
        name: "管理序列",
        peopleLabel: "15 人",
        roleLabel: "高层管理人员",
        score: "76.8",
        trend: "-1.5",
        benchmarkLabel: "1 标杆",
        alertLabel: "6 预警",
        focusTags: [
          { label: "执行脱节", tone: "danger" },
          { label: "跨部门协同", tone: "warning" },
          { label: "会议收口", tone: "warning" },
        ],
      },
      {
        id: "sales",
        name: "电商/新零售序列",
        peopleLabel: "15 人",
        roleLabel: "电商运营人员",
        score: "74.8",
        trend: "-2.3",
        benchmarkLabel: "1 标杆",
        alertLabel: "5 预警",
        focusTags: [
          { label: "客户价值传递", tone: "accent" },
          { label: "渠道合规性", tone: "warning" },
          { label: "内部协同", tone: "danger" },
        ],
      },
    ],
    insight: "质量与生产稳住基本盘，管理与销售需要今天立即收口。",
  },
});

const createGeneratedResultItem = (
  sessionId: string,
  suffix: string,
  title: string,
  subtitle: string,
  panel: DialogueGeneratedPanelState,
  badge?: string,
): DialogueGeneratedResultItem => ({
  id: `${sessionId}-${suffix}`,
  title,
  subtitle,
  createdAt: "刚刚",
  badge,
  panel,
});

const createEmployeeAssessPanelState = (
  sessionId: string,
  status: DialogueGeneratedPanelStatus,
): DialogueGeneratedPanelState => ({
  id: `${sessionId}-panel-employee-assess`,
  kind: "employeeAssess",
  title: "员工详情",
  subtitle:
    status === "running"
      ? "正在综合评分、底线状态与 ERP 指标生成员工画像"
      : "员工画像、维度得分与管理动作已生成",
  skillName: "员工评估",
  updatedAt: "刚刚",
  status,
  payload: {
    employeeName: "王建国",
    employeeRole: "生产班组长",
    sequenceLabel: "生产序列",
    score: "84",
    trend: "+6",
    zoneLabel: "关注区上沿",
    dimensionScores: [
      {
        id: "strategy",
        label: "战略一致性",
        weightLabel: "权重 12%",
        score: "88",
        delta: "-0.3",
        tone: "warning",
      },
      {
        id: "culture",
        label: "文化契合度",
        weightLabel: "权重 15%",
        score: "95",
        delta: "+1.6",
        tone: "positive",
      },
      {
        id: "execution",
        label: "执行可行性",
        weightLabel: "权重 12%",
        score: "92",
        delta: "-1.5",
        tone: "positive",
      },
      {
        id: "risk",
        label: "风险管控",
        weightLabel: "权重 12%",
        score: "94",
        delta: "+0.7",
        tone: "positive",
      },
      {
        id: "innovation",
        label: "创新价值",
        weightLabel: "权重 9%",
        score: "85",
        delta: "+0.9",
        tone: "warning",
      },
      {
        id: "craft",
        label: "匠心细节",
        weightLabel: "权重 13%",
        score: "95",
        delta: "+2.1",
        tone: "positive",
      },
      {
        id: "digital",
        label: "数字化思维",
        weightLabel: "权重 13%",
        score: "82",
        delta: "+0.4",
        tone: "warning",
      },
      {
        id: "safety",
        label: "安全刚性",
        weightLabel: "权重 14%",
        score: "90",
        delta: "+1.2",
        tone: "positive",
      },
    ],
    redlineStatuses: [
      {
        id: "quality",
        label: "品质安全底线",
        description: "沟通中始终将质量安全放在首位",
        statusLabel: "通过",
        tone: "positive",
      },
      {
        id: "honesty",
        label: "诚信担当底线",
        description: "承诺兑现率和诚实守信表现稳定",
        statusLabel: "通过",
        tone: "positive",
      },
      {
        id: "team",
        label: "团队协作底线",
        description: "跨部门沟通协作态度和效果良好",
        statusLabel: "通过",
        tone: "positive",
      },
    ],
    evidences: [
      {
        id: "e1",
        source: "班前会纪要",
        date: "03/25",
        content: "主动提醒原料含水量异常，要求先调参数再开线。",
      },
      {
        id: "e2",
        source: "企微群",
        date: "03/26",
        content: "主动 @质检 做加抽，避免异常批次继续流转。",
      },
      {
        id: "e3",
        source: "ERP 班组报表",
        date: "03/29",
        content: "返工率 1.8%，低于生产序列均值 2.6%。",
      },
    ],
    actionItems: [
      "安排其在下周复盘会上讲一次异常处置过程",
      "给一个轻量数据看板任务，补数字化短板",
      "继续按储备干部标准观察 2 周",
    ],
  },
});

const createRedlineDetectPanelState = (
  sessionId: string,
  status: DialogueGeneratedPanelStatus,
): DialogueGeneratedPanelState => ({
  id: `${sessionId}-panel-redline-detect`,
  kind: "redlineDetect",
  title: "预警面板",
  subtitle:
    status === "running" ? "正在回放原始证据并生成约谈动作" : "红线判断与约谈动作已完成收口",
  skillName: "红线检测",
  updatedAt: "刚刚",
  status,
  payload: {
    alertSummary: "近 30 天红色预警 2 条，当前聚焦张伟的品质安全底线事件。",
    warnings: [
      {
        id: "zhangwei",
        name: "张伟",
        roleLabel: "操作工 · L4",
        sequenceLabel: "生产部 / 生产序列",
        reason: "提出“这批货先出货再说，质检后面补”",
        dimensionLabel: "品质安全底线",
        score: "55 分",
        levelLabel: "高",
        dateLabel: "2026/2/3",
        suggestion: "建议今天立即约谈，先纠偏认知，再跟一周整改动作。",
        tone: "danger",
        actions: [
          { id: "mark", label: "标记处理", tone: "neutral" },
          { id: "notify", label: "发送提醒", tone: "warning" },
          { id: "stop", label: "立即制止并通知全员", tone: "danger" },
        ],
      },
      {
        id: "liuyang",
        name: "刘洋",
        roleLabel: "销售主管 · L6",
        sequenceLabel: "销售部 / 销售序列",
        reason: "对外承诺话术反复偏离食品安全标准",
        dimensionLabel: "文化契合度",
        score: "45 分",
        levelLabel: "极高",
        dateLabel: "2026/2/4",
        suggestion: "暂停外部承诺权限，先复盘违规口径来源。",
        tone: "danger",
        actions: [
          { id: "mark2", label: "标记处理", tone: "neutral" },
          { id: "notify2", label: "发送提醒", tone: "warning" },
          { id: "stop2", label: "立即制止并通知全员", tone: "danger" },
        ],
      },
    ],
  },
});

const createBenchmarkFindPanelState = (
  sessionId: string,
  status: DialogueGeneratedPanelStatus,
  viewMode: "ranking" | "achievement",
): DialogueGeneratedPanelState => ({
  id: `${sessionId}-panel-benchmark-find-${viewMode}`,
  kind: "benchmarkFind",
  title: viewMode === "ranking" ? "生产序列标杆" : "生产序列达标面板",
  subtitle:
    status === "running"
      ? "正在筛选高分员工并生成标杆放大动作"
      : viewMode === "ranking"
        ? "标杆名单与分层结果已整理完成"
        : "标杆故事与公开表扬动作已整理完成",
  skillName: "标杆识别",
  updatedAt: "2026/02/05 08:00",
  status,
  payload: {
    viewMode,
    sequenceLabel: "生产部 / 生产序列",
    benchmarkPeople: [
      {
        id: "wangjianguo",
        rankLabel: "1",
        name: "王建国",
        roleLabel: "生产部",
        levelLabel: "生产主管 · L7",
        score: "92",
        delta: "+3.5",
        story: "主动识别重大风险并阻止事故",
        avatarLabel: "王",
        dateLabel: "02/04",
        tone: "positive",
      },
      {
        id: "zhanglipeng",
        rankLabel: "2",
        name: "张师傅",
        roleLabel: "生产部",
        levelLabel: "高级技师 · L6",
        score: "91",
        delta: "+1.2",
        story: "连续 6 个月零品质事故，主动优化工艺步骤",
        avatarLabel: "张",
        dateLabel: "02/03",
        tone: "positive",
      },
      {
        id: "lizhuguan",
        rankLabel: "3",
        name: "李主管",
        roleLabel: "生产部",
        levelLabel: "车间主任 · L6",
        score: "90",
        delta: "+0.8",
        story: "稳定带教 4 名新员工，班组波动明显降低",
        avatarLabel: "李",
        dateLabel: "02/02",
        tone: "positive",
      },
    ],
    middleZoneCountLabel: "6 人",
    attentionPeople: [
      {
        id: "zhangwei-attention",
        rankLabel: "",
        name: "张伟",
        roleLabel: "生产部",
        levelLabel: "操作工 · L4",
        score: "55",
        delta: "-8.1",
        story: "连续两次品质复判不通过，已触发关注。",
        avatarLabel: "张",
        tone: "danger",
      },
      {
        id: "zhengxiaohu",
        rankLabel: "",
        name: "郑小虎",
        roleLabel: "生产部",
        levelLabel: "操作工 · L3",
        score: "52",
        delta: "-3.2",
        story: "交接执行反复出错，班组协同波动明显。",
        avatarLabel: "郑",
        tone: "danger",
      },
    ],
    actionItems: [
      "王建国纳入晋升储备并安排管理培训",
      "张师傅的工艺案例做全员复盘",
      "李主管承担跨班组带教任务",
    ],
  },
});

const createScoreRankPanelState = (
  sessionId: string,
  status: DialogueGeneratedPanelStatus,
  viewMode: "overview" | "fullList",
): DialogueGeneratedPanelState => ({
  id: `${sessionId}-panel-score-rank-${viewMode}`,
  kind: "scoreRank",
  title: viewMode === "overview" ? "销售序列评分排名" : "销售序列完整排名",
  subtitle:
    status === "running"
      ? "正在根据分区分布与风险状态生成排名面板"
      : viewMode === "overview"
        ? "排名结构、关注区与风险分层已生成"
        : "完整排名、分层名单与波动情况已生成",
  skillName: "评分排名",
  updatedAt: "2026/02/05 08:00",
  status,
  payload: {
    viewMode,
    sequenceLabel: "销售/业务序列",
    peopleCountLabel: "38 人",
    averageScoreLabel: "65.3",
    dimensions: [
      { label: "客户价值传递", tone: "accent" },
      { label: "渠道合规性", tone: "accent" },
      { label: "内部协同", tone: "accent" },
    ],
    benchmarkLineLabel: "90+",
    attentionLineLabel: "<60",
    zones: [
      {
        id: "benchmark",
        title: "标杆区（≥90分）",
        countLabel: "1 人",
        tone: "positive",
        members: [
          {
            id: "yangjin",
            rankLabel: "1",
            name: "杨销冠",
            roleLabel: "销售部",
            levelLabel: "销售总监 · L8",
            score: "92",
            delta: "+3.5",
            story: "稳定承担大客户成交与方法复制",
            tone: "positive",
          },
        ],
      },
      {
        id: "middle",
        title: "中间区（60-89分）",
        countLabel: "5 人",
        tone: "warning",
        collapsed: viewMode === "overview",
        members: [
          {
            id: "zhengdan",
            rankLabel: "2",
            name: "郑大单",
            roleLabel: "销售部",
            levelLabel: "大客户经理 · L6",
            score: "85",
            delta: "+2.1",
            story: "主力层稳定，签单节奏恢复",
            tone: "warning",
          },
          {
            id: "wuyeji",
            rankLabel: "3",
            name: "吴业绩",
            roleLabel: "销售部",
            levelLabel: "客户经理 · L5",
            score: "79",
            delta: "+1.5",
            story: "线索转化恢复，但协同偏慢",
            tone: "warning",
          },
          {
            id: "lihuikuan",
            rankLabel: "4",
            name: "李回款",
            roleLabel: "销售部",
            levelLabel: "客户经理 · L5",
            score: "76",
            delta: "+0.7",
            story: "回款节奏改善，但客诉处理仍偏慢。",
            tone: "warning",
          },
          {
            id: "zhouxintuo",
            rankLabel: "5",
            name: "周新拓",
            roleLabel: "销售部",
            levelLabel: "渠道经理 · L5",
            score: "72",
            delta: "+0.3",
            story: "新渠道开拓有起色，内部协同待加强。",
            tone: "warning",
          },
          {
            id: "chendan",
            rankLabel: "6",
            name: "陈签单",
            roleLabel: "销售部",
            levelLabel: "客户经理 · L4",
            score: "68",
            delta: "-0.6",
            story: "跟进节奏尚可，价值表达稳定性不足。",
            tone: "warning",
          },
        ],
      },
      {
        id: "attention",
        title: "关注区（<60分）",
        countLabel: "3 人",
        tone: "danger",
        members: [
          {
            id: "weixinren",
            rankLabel: "43",
            name: "卫新人",
            roleLabel: "销售部",
            levelLabel: "客户经理 · L4",
            score: "58",
            delta: "-4.2",
            story: "连续下滑，跟进链路断点明显",
            tone: "danger",
          },
          {
            id: "liming",
            rankLabel: "44",
            name: "李明",
            roleLabel: "销售部",
            levelLabel: "客户经理 · L4",
            score: "55",
            delta: "-2.0",
            story: "触碰诚信底线，先处理底线再谈恢复",
            tone: "danger",
          },
          {
            id: "zhangwei",
            rankLabel: "45",
            name: "张伟",
            roleLabel: "销售部",
            levelLabel: "客户经理 · L3",
            score: "52",
            delta: "-3.2",
            story: "连续两周新增为 0，线索池需要重配",
            tone: "danger",
          },
        ],
      },
    ],
  },
});

const createCeoSynthesisPanelState = (
  sessionId: string,
  status: DialogueGeneratedPanelStatus,
): DialogueGeneratedPanelState => ({
  id: `${sessionId}-panel-ceo-synthesis`,
  kind: "ceoSynthesis",
  title: "CEO 晨会面板",
  subtitle:
    status === "running"
      ? "正在汇总盘面、关键人与风险，生成可直接交办的 CEO 面板"
      : "CEO 视角的盘面、重点人与管理动作已生成",
  skillName: "CEO综合研判",
  updatedAt: "刚刚",
  status,
  payload: {
    summaryMetrics: [
      { label: "公司均分", value: "77.9", delta: "+1.4", tone: "warning" },
      { label: "高预警序列", value: "2", hint: "管理 / 销售", tone: "danger" },
      { label: "重点培养人", value: "王建国", hint: "84 分", tone: "positive" },
      { label: "底线风险人", value: "2", hint: "李明 / 张伟", tone: "danger" },
    ],
    focusAreas: [
      { id: "seq1", name: "质量序列", summary: "均分最高，盘面最稳。", tone: "positive" },
      { id: "seq2", name: "生产序列", summary: "人数最多且趋势继续向上。", tone: "positive" },
      { id: "seq3", name: "管理序列", summary: "6 个预警，协同执行要立即收口。", tone: "danger" },
      {
        id: "seq4",
        name: "销售序列",
        summary: "关注区扩大，底线问题需单列处理。",
        tone: "warning",
      },
    ],
    keyPerson: {
      id: "wangjianguo",
      rankLabel: "重点培养",
      name: "王建国",
      roleLabel: "生产序列",
      levelLabel: "班组长",
      score: "84",
      delta: "+6",
      story: "执行和风险预判能力明显强于同层级，是储备干部观察对象。",
      tone: "positive",
    },
    risks: [
      {
        id: "risk1",
        name: "李明",
        summary: "诚信底线已碰线，不能按普通关注区处理。",
        tone: "danger",
      },
      { id: "risk2", name: "张伟", summary: "品质安全底线事件，今天必须约谈。", tone: "danger" },
    ],
    actionItems: [
      "上午让管理序列负责人拆 6 个预警来源",
      "下午逐一处理销售关注区 3 人，先底线后业绩",
      "本周将王建国放进数据复盘会，继续按储备干部标准跟看",
    ],
    closingLine: "质量和生产稳盘，管理和销售今天必须收口。",
    promptSuggestions: ["生产部整体情况", "王建国最近怎么样", "有什么风险需要注意"],
    greetingLines: [
      "黄总，您好！我是您的 AI CEO 智慧分身。",
      "有什么要了解的，直接问，我给您掰开了揉碎了说。不整虚的。",
      "您可以问我：",
    ],
    questionSuggestions: [
      "某个员工最近表现怎么样",
      "哪个部门需要重点关注",
      "会议纪要里有什么值得注意的",
    ],
    inputPlaceholder: "输入你的问题...",
  },
});

const createDispatchExecutionPanelState = (
  sessionId: string,
  status: DialogueGeneratedPanelStatus,
  mode: "overview" | "managementFocus",
): DialogueGeneratedPanelState => {
  if (mode === "managementFocus") {
    const isRunning = status === "running";

    return {
      id: `${sessionId}-panel-dispatch-management-focus`,
      kind: "dispatchExecution",
      title: "飞书发送记录",
      subtitle:
        status === "running"
          ? "正在确认飞书通讯录并把强化提醒发给管理序列负责人"
          : "已完成通讯录匹配，并把强化提醒发给管理序列负责人",
      skillName: "飞书触达",
      updatedAt: "刚刚",
      status,
      payload: {
        summaryMetrics: [
          { label: "触达人数", value: "1", hint: "管理序列负责人", tone: "accent" },
          { label: "通讯录命中", value: "1/1", hint: "陈峰", tone: "warning" },
          {
            label: "送达状态",
            value: isRunning ? "发送中" : "1/1",
            hint: isRunning ? "等待飞书回执" : "已发送",
            tone: "positive",
          },
          { label: "回执要求", value: "12:00", hint: "未回执自动提醒", tone: "danger" },
        ],
        dispatchLabel: isRunning
          ? "CEO分身已确认飞书通讯录中的陈峰，正在把强化版管理提醒按单聊发出。"
          : "CEO分身先确认了飞书通讯录中的陈峰，再把强化版管理提醒按单聊发出。",
        recipients: [
          {
            id: "chenfeng",
            name: "陈峰",
            roleLabel: "管理序列负责人",
            channelLabel: "飞书单聊",
            statusLabel: isRunning ? "发送中" : "已发送",
            summary: "要求今天中午前拆清 6 个预警来源，重点说明执行脱节和跨部门协同卡点。",
            note: "语气已加强，并要求未按时回执则下午 15:00 自动提醒。",
            tone: "danger",
          },
        ],
        conversationItems: [
          {
            id: "management-focus-yesterday",
            actorLabel: "系统",
            summary: "昨天 17:36",
            direction: "system",
          },
          {
            id: "management-focus-history-incoming",
            actorLabel: "陈峰",
            avatarLabel: "陈",
            direction: "incoming",
            tagLabel: "管理序列负责人",
            timeLabel: "17:36",
            summary: "管理序列这周 6 个预警里，3 个是流程执行脱节，另外 3 个还卡在跨部门责任边界。",
          },
          {
            id: "management-focus-history-outgoing",
            actorLabel: "CEO分身",
            avatarLabel: "我",
            direction: "outgoing",
            timeLabel: "17:42",
            statusLabel: "已送达",
            summary: "先不要给泛泛结论，明早把来源拆清，再看哪些需要上升到组织协同问题。",
            detail: "飞书单聊 · 管理序列负责人",
          },
          {
            id: "management-focus-today-morning",
            actorLabel: "系统",
            summary: "今天 09:18",
            direction: "system",
          },
          {
            id: "management-focus-morning-incoming",
            actorLabel: "陈峰",
            avatarLabel: "陈",
            direction: "incoming",
            tagLabel: "管理序列负责人",
            timeLabel: "09:18",
            summary: "我这边已经把 6 个预警先拆完了，但还有 2 个协同卡点需要再对一下责任归属。",
          },
          {
            id: "management-focus-time",
            actorLabel: "系统",
            summary: "今天 09:26",
            direction: "system",
          },
          {
            id: "management-focus-message",
            actorLabel: "CEO分身",
            avatarLabel: "我",
            direction: "outgoing",
            tagLabel: "@陈峰",
            timeLabel: "09:26",
            edited: true,
            statusLabel: isRunning ? "发送中" : "已送达",
            summary: `陈峰，今天先把管理序列 6 个预警来源拆清楚，中午 12 点前直接回我。

这次不是泛泛复盘，要把两件事说明白：
1. 哪些问题属于执行脱节；
2. 哪些问题属于跨部门协同卡点。`,
            detail: "飞书单聊 · 已开启 15:00 未回执自动提醒",
          },
        ],
        messagePreview: `陈峰，今天先把管理序列 6 个预警来源拆清楚，中午 12 点前直接回我。

这次不是泛泛复盘，要把两件事说明白：
1. 哪些问题属于执行脱节；
2. 哪些问题属于跨部门协同卡点。

如果中午前没有回执，下午 15:00 我会再追一次。`,
        actionItems: [
          "12:00 前等待管理序列负责人回执",
          "若未回执，15:00 自动追加一次飞书提醒",
          "收到回执后，再决定是否同步 COO",
        ],
      },
    };
  }

  const isRunning = status === "running";

  return {
    id: `${sessionId}-panel-dispatch-overview`,
    kind: "dispatchExecution",
    title: "飞书发送记录",
    subtitle:
      status === "running"
        ? "正在查询飞书通讯录，并把收口要求发给对应负责人"
        : "已完成通讯录匹配，并把收口要求发给管理与销售负责人",
    skillName: "飞书触达",
    updatedAt: "刚刚",
    status,
    payload: {
      summaryMetrics: [
        { label: "触达人数", value: "2", hint: "管理 / 销售负责人", tone: "accent" },
        { label: "通讯录命中", value: "2/2", hint: "陈峰 / 刘敏", tone: "warning" },
        {
          label: "送达状态",
          value: isRunning ? "发送中" : "2/2",
          hint: isRunning ? "等待飞书回执" : "均已送达",
          tone: "positive",
        },
        { label: "回执要求", value: "17:00", hint: "逾期自动提醒", tone: "danger" },
      ],
      dispatchLabel: isRunning
        ? "CEO分身正在根据飞书通讯录匹配结果，把老板刚才确认的收口口径分别发给负责人。"
        : "CEO分身先查询飞书通讯录确认负责人身份，再按老板刚才确认的收口口径分别发出。",
      recipients: [
        {
          id: "chenfeng",
          name: "陈峰",
          roleLabel: "管理序列负责人",
          channelLabel: "飞书单聊",
          statusLabel: isRunning ? "发送中" : "已发送",
          summary: "今天中午前拆清 6 个预警来源，重点说明执行脱节和跨部门协同卡点。",
          note: "老板希望先拆来源，再决定是否上升到组织协同问题。",
          tone: "danger",
        },
        {
          id: "liumin",
          name: "刘敏",
          roleLabel: "销售序列负责人",
          channelLabel: "飞书单聊",
          statusLabel: isRunning ? "发送中" : "已发送",
          summary: "今天 17:00 前回传关注区名单和处理动作，连续下滑与底线问题分开处理。",
          note: "消息里已经要求先拉名单，再按问题类型拆动作。",
          tone: "warning",
        },
      ],
      conversationItems: [
        {
          id: "dispatch-yesterday",
          actorLabel: "系统",
          summary: "昨天 18:42",
          direction: "system",
        },
        {
          id: "dispatch-history-chenfeng",
          actorLabel: "陈峰",
          avatarLabel: "陈",
          direction: "incoming",
          tagLabel: "管理序列负责人",
          timeLabel: "18:42",
          summary: "管理序列这周的 6 个预警，我先归成执行脱节和协同卡点两类，明早给你一版口径。",
        },
        {
          id: "dispatch-history-liumin",
          actorLabel: "刘敏",
          avatarLabel: "刘",
          direction: "incoming",
          tagLabel: "销售序列负责人",
          timeLabel: "18:47",
          summary: "销售关注区先锁定了 4 个人，其中 1 个可能碰到底线，我今晚再把名单收一遍。",
        },
        {
          id: "dispatch-history-ceo",
          actorLabel: "CEO分身",
          avatarLabel: "我",
          direction: "outgoing",
          timeLabel: "18:50",
          statusLabel: "已送达",
          summary: "明早 8:30 前都带一版处理建议，晨会只看结论和动作，不再重复讲过程。",
          detail: "群聊 · 今日经营收口群",
        },
        {
          id: "dispatch-today-morning",
          actorLabel: "系统",
          summary: "今天 09:12",
          direction: "system",
        },
        {
          id: "dispatch-morning-chenfeng",
          actorLabel: "陈峰",
          avatarLabel: "陈",
          direction: "incoming",
          tagLabel: "管理序列负责人",
          timeLabel: "09:12",
          summary: "管理序列 6 个预警我先拆完了，执行脱节 4 个，跨部门协同 2 个。",
        },
        {
          id: "dispatch-morning-liumin",
          actorLabel: "刘敏",
          avatarLabel: "刘",
          direction: "incoming",
          tagLabel: "销售序列负责人",
          timeLabel: "09:14",
          summary: "销售关注区名单已拉出 3 人，其中 1 人是底线风险，我已经按两条线先分开。",
        },
        {
          id: "dispatch-time",
          actorLabel: "系统",
          summary: "今天 09:20",
          direction: "system",
        },
        {
          id: "dispatch-to-chenfeng",
          actorLabel: "CEO分身",
          avatarLabel: "我",
          direction: "outgoing",
          tagLabel: "@陈峰",
          timeLabel: "09:20",
          edited: true,
          statusLabel: isRunning ? "发送中" : "已送达",
          summary:
            "陈峰，今天先把管理序列 6 个预警来源拆清楚，中午前回我，重点看执行脱节和跨部门协同卡点。",
          detail: "群聊 · 今日经营收口群",
        },
        {
          id: "dispatch-to-liumin",
          actorLabel: "CEO分身",
          avatarLabel: "我",
          direction: "outgoing",
          tagLabel: "@刘敏",
          timeLabel: "09:20",
          edited: true,
          statusLabel: isRunning ? "发送中" : "已送达",
          summary:
            "刘敏，今天把销售关注区名单拉出来，连续下滑和底线问题分开处理，下午 17:00 前把处理动作回我。",
          detail: "群聊 · 今日经营收口群",
        },
      ],
      messagePreview: `陈峰，今天先把管理序列 6 个预警来源拆清楚，中午前回我，重点看执行脱节和跨部门协同卡点。

刘敏，今天把销售关注区名单拉出来，连续下滑和底线问题分开处理，下午 17:00 前把处理动作回我。`,
      actionItems: [
        "管理序列负责人 12:00 前回传预警拆解",
        "销售序列负责人 17:00 前回传关注区处理动作",
        "若任一负责人未回执，CEO分身自动追加提醒",
      ],
    },
  };
};

const buildSequenceOverviewResults = (sessionId: string): DialogueGeneratedResultItem[] => [
  createGeneratedResultItem(
    sessionId,
    "result-sequence-overview",
    "经营总览晨会版",
    "序列评分、预警分布与老板晨会口径",
    createSequenceOverviewPanelState(sessionId, "success"),
    "序列总览",
  ),
];

const buildEmployeeAssessResults = (sessionId: string): DialogueGeneratedResultItem[] => [
  createGeneratedResultItem(
    sessionId,
    "result-employee-assess",
    "王建国员工画像",
    "维度得分、证据摘要与管理动作建议",
    createEmployeeAssessPanelState(sessionId, "success"),
    "员工评估",
  ),
];

const buildRedlineResults = (sessionId: string): DialogueGeneratedResultItem[] => [
  createGeneratedResultItem(
    sessionId,
    "result-redline-detect",
    "底线风险预警清单",
    "重点人员、风险原因与处理建议",
    createRedlineDetectPanelState(sessionId, "success"),
    "红线检测",
  ),
];

const buildBenchmarkResults = (sessionId: string): DialogueGeneratedResultItem[] => [
  createGeneratedResultItem(
    sessionId,
    "result-benchmark-ranking",
    "生产序列标杆页面",
    "标杆区、中间区与关注区的分层结果",
    createBenchmarkFindPanelState(sessionId, "success", "ranking"),
    "标杆页面",
  ),
  createGeneratedResultItem(
    sessionId,
    "result-benchmark-achievement",
    "生产序列达标面板",
    "标杆故事、公开表扬与查看详情入口",
    createBenchmarkFindPanelState(sessionId, "success", "achievement"),
    "标杆识别",
  ),
];

const buildScoreRankResults = (sessionId: string): DialogueGeneratedResultItem[] => [
  createGeneratedResultItem(
    sessionId,
    "result-score-rank-overview",
    "销售序列评分排名",
    "分层结构、专项维度与关注区分布",
    createScoreRankPanelState(sessionId, "success", "overview"),
    "排名总览",
  ),
  createGeneratedResultItem(
    sessionId,
    "result-score-rank-full-list",
    "销售序列完整排名",
    "中间区展开后的完整名单与波动情况",
    createScoreRankPanelState(sessionId, "success", "fullList"),
    "评分排名",
  ),
];

const buildCeoResults = (sessionId: string): DialogueGeneratedResultItem[] => [
  createGeneratedResultItem(
    sessionId,
    "result-ceo-overview",
    "公司经营总览",
    "全序列评分、预警和趋势概览",
    createSequenceOverviewPanelState(sessionId, "success"),
    "序列总览",
  ),
  createGeneratedResultItem(
    sessionId,
    "result-ceo-key-person",
    "关键人培养画像",
    "王建国的潜力判断与培养建议",
    createEmployeeAssessPanelState(sessionId, "success"),
    "员工评估",
  ),
  createGeneratedResultItem(
    sessionId,
    "result-ceo-redline",
    "底线风险总览",
    "重点风险人员与风险处置优先级",
    createRedlineDetectPanelState(sessionId, "success"),
    "红线检测",
  ),
  createGeneratedResultItem(
    sessionId,
    "result-ceo-synthesis",
    "CEO 综合研判",
    "可直接晨会复述的盘面判断与管理动作",
    createCeoSynthesisPanelState(sessionId, "success"),
    "CEO 综判",
  ),
];

const buildFeishuDispatchResults = (sessionId: string): DialogueGeneratedResultItem[] => [
  createGeneratedResultItem(
    sessionId,
    "result-feishu-dispatch",
    "飞书发送记录",
    "通讯录命中、对话记录与消息内容",
    createDispatchExecutionPanelState(sessionId, "success", "overview"),
    "飞书触达",
  ),
];

const buildFeishuManagementFocusResults = (sessionId: string): DialogueGeneratedResultItem[] => [
  createGeneratedResultItem(
    sessionId,
    "result-feishu-management-dispatch",
    "管理序列飞书发送记录",
    "通讯录命中、强化提醒内容与回执设置",
    createDispatchExecutionPanelState(sessionId, "success", "managementFocus"),
    "飞书触达",
  ),
];

const createScenarioDispatchExecutionPanelState = ({
  sessionId,
  suffix,
  title,
  subtitle,
  skillName,
  status,
  dispatchLabel,
  recipients,
  conversationItems,
  actionItems,
}: {
  sessionId: string;
  suffix: string;
  title: string;
  subtitle: string;
  skillName: string;
  status: DialogueGeneratedPanelStatus;
  dispatchLabel: string;
  recipients: ScenarioDispatchRecipientSeed[];
  conversationItems: ScenarioDispatchConversationSeed[];
  actionItems: string[];
}): DialogueGeneratedPanelState => ({
  id: `${sessionId}-${suffix}`,
  kind: "dispatchExecution",
  title,
  subtitle,
  skillName,
  updatedAt: "刚刚",
  status,
  payload: {
    summaryMetrics: [
      {
        label: "参与对象",
        value: `${recipients.length}`,
        hint: recipients.map(item => item.name).join("、"),
        tone: "accent",
      },
      {
        label: "关键记录",
        value: `${conversationItems.filter(item => item.direction !== "system").length}`,
        hint: "含任务分发、回传和交付说明",
        tone: "warning",
      },
      {
        label: "当前状态",
        value: status === "running" ? "处理中" : "已沉淀",
        hint: status === "running" ? "执行还在继续" : "可直接在右侧回看",
        tone: status === "running" ? "warning" : "positive",
      },
      {
        label: "后续动作",
        value: `${actionItems.length}`,
        hint: "可继续追问或进入下一轮复核",
        tone: "danger",
      },
    ],
    dispatchLabel,
    recipients,
    conversationItems,
    messagePreview:
      conversationItems.findLast(item => item.direction === "outgoing")?.summary ?? dispatchLabel,
    actionItems,
  },
});

const createScenarioDispatchResultItem = ({
  sessionId,
  suffix,
  title,
  subtitle,
  badge,
  panelSuffix,
  skillName,
  status,
  dispatchLabel,
  recipients,
  conversationItems,
  actionItems,
}: {
  sessionId: string;
  suffix: string;
  title: string;
  subtitle: string;
  badge: string;
  panelSuffix: string;
  skillName: string;
  status: DialogueGeneratedPanelStatus;
  dispatchLabel: string;
  recipients: ScenarioDispatchRecipientSeed[];
  conversationItems: ScenarioDispatchConversationSeed[];
  actionItems: string[];
}): DialogueGeneratedResultItem =>
  createGeneratedResultItem(
    sessionId,
    suffix,
    title,
    subtitle,
    createScenarioDispatchExecutionPanelState({
      sessionId,
      suffix: panelSuffix,
      title,
      subtitle,
      skillName,
      status,
      dispatchLabel,
      recipients,
      conversationItems,
      actionItems,
    }),
    badge,
  );

const buildSequenceOverviewArtifacts = (sessionId: string): ArtifactItem[] => {
  const producerName = "序列总览专家";
  const producedAt = "2026-03-30 09:12";
  const overviewMarkdown = `# 经营总览速记

## 结论
- 质量序列均分最高，为 82.9 分，且预警最低。
- 生产序列人数最多，均分 81.6 分，趋势继续向上。
- 管理序列和销售序列是当前预警最高的两个序列，需要老板今天盯住。

## 序列概览
- 质量序列：48 人，均分 82.9，预警 1，环比 +1.7
- 生产序列：96 人，均分 81.6，预警 2，环比 +2.4
- 研发序列：57 人，均分 79.8，预警 2，环比 +0.8
- 管理序列：34 人，均分 74.8，预警 6，环比 -1.3
- 销售序列：45 人，均分 71.4，预警 5，环比 -0.9

## 建议
1. 管理序列先拆预警来源，重点看执行脱节和协同卡点。
2. 销售序列先盯关注区人员，避免拖累本季度线索转化。`;
  const snapshotJson = prettyJson({
    sequences: [
      { name: "质量序列", count: 48, avg_score: 82.9, alerts: 1, trend: "+1.7" },
      { name: "生产序列", count: 96, avg_score: 81.6, alerts: 2, trend: "+2.4" },
      { name: "研发序列", count: 57, avg_score: 79.8, alerts: 2, trend: "+0.8" },
      { name: "管理序列", count: 34, avg_score: 74.8, alerts: 6, trend: "-1.3" },
      { name: "销售序列", count: 45, avg_score: 71.4, alerts: 5, trend: "-0.9" },
    ],
    summary: {
      total_employees: 356,
      company_avg: 77.9,
      red_alerts: 16,
      benchmark_count: 18,
    },
  });
  const trendSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="520" viewBox="0 0 920 520" fill="none"><rect width="920" height="520" rx="28" fill="#F8FBFF"/><rect x="58" y="52" width="804" height="416" rx="30" fill="#FFFFFF" stroke="#D6E3F1" stroke-width="2"/><text x="92" y="110" fill="#0F172A" font-size="30" font-family="PingFang SC, sans-serif" font-weight="700">序列均分与预警分布</text><text x="92" y="150" fill="#516072" font-size="20" font-family="PingFang SC, sans-serif">老板晨会版：一眼看出谁稳、谁涨、谁在掉</text><line x1="120" y1="380" x2="812" y2="380" stroke="#CBD7E6" stroke-width="2"/><line x1="120" y1="120" x2="120" y2="380" stroke="#CBD7E6" stroke-width="2"/><rect x="170" y="182" width="72" height="198" rx="18" fill="#23C6B8"/><rect x="294" y="194" width="72" height="186" rx="18" fill="#31B1FF"/><rect x="418" y="224" width="72" height="156" rx="18" fill="#76A8FF"/><rect x="542" y="278" width="72" height="102" rx="18" fill="#F7B955"/><rect x="666" y="302" width="72" height="78" rx="18" fill="#FF8A65"/><text x="174" y="414" fill="#0F172A" font-size="18" font-family="PingFang SC, sans-serif">质量</text><text x="295" y="414" fill="#0F172A" font-size="18" font-family="PingFang SC, sans-serif">生产</text><text x="420" y="414" fill="#0F172A" font-size="18" font-family="PingFang SC, sans-serif">研发</text><text x="542" y="414" fill="#0F172A" font-size="18" font-family="PingFang SC, sans-serif">管理</text><text x="668" y="414" fill="#0F172A" font-size="18" font-family="PingFang SC, sans-serif">销售</text></svg>`;

  return [
    createImageArtifact(
      sessionId,
      "overview-scene",
      "序列总览实时看板.png",
      producerName,
      "序列总览",
      SEQUENCE_OVERVIEW_PAGE_IMAGE_URL,
      producedAt,
      "156 KB",
    ),
    createMarkdownArtifact(
      sessionId,
      "overview-brief",
      "经营总览晨会简报.md",
      producerName,
      "序列总览",
      overviewMarkdown,
      producedAt,
      "3 KB",
    ),
    createJsonArtifact(
      sessionId,
      "overview-snapshot",
      "sequence-overview-snapshot.json",
      producerName,
      "序列总览",
      snapshotJson,
      producedAt,
      "2 KB",
    ),
    createSvgArtifact(
      sessionId,
      "overview-chart",
      "序列均分预警分布图.svg",
      producerName,
      "序列总览",
      trendSvg,
      producedAt,
      "6 KB",
    ),
  ];
};

const buildEmployeeAssessArtifacts = (sessionId: string): ArtifactItem[] => {
  const producerName = "员工评估专家";
  const producedAt = "2026-03-30 09:28";
  const reportMarkdown = `# 王建国近 30 天评估摘要

## 综合判断
- 综合得分 84 分，位于生产序列上沿关注区，距离标杆区还有一小步。
- 最大优势是执行力和风险预判。
- 当前短板集中在数字化思维和跨班组数据复盘。

## 关键证据
- 03-25 班前会主动提示原料含水量异常，要求调整参数。
- 03-26 在企微群里主动 @质检 做加抽，避免问题流入下游。
- ERP 显示其负责班组本月返工率 1.8%，低于序列均值 2.6%。

## 管理动作
1. 让他下周参加生产报表复盘会。
2. 给他配一个轻量数据看板任务，补数字化能力。`;
  const snapshotJson = prettyJson({
    employee: {
      name: "王建国",
      role: "生产班组长",
      sequence: "生产序列",
      score: 84,
      trend: "+6",
      zone: "关注区上沿",
    },
    dimensions: {
      strategic_understanding: 76,
      execution: 89,
      risk_prediction: 91,
      teamwork: 84,
      innovation: 79,
      customer_mindset: 78,
      digital_mindset: 71,
      craftsmanship: 86,
    },
    erp_metrics: {
      yield_rate: "98.2%",
      rework_rate: "1.8%",
      overtime_hours: 14,
      process_exception_count: 1,
    },
  });

  return [
    createImageArtifact(
      sessionId,
      "assess-scene",
      "王建国维度详情.png",
      producerName,
      "员工评估",
      EMPLOYEE_ASSESS_PAGE_IMAGE_URL,
      producedAt,
      "134 KB",
    ),
    createMarkdownArtifact(
      sessionId,
      "assess-report",
      "王建国评估摘要.md",
      producerName,
      "员工评估",
      reportMarkdown,
      producedAt,
      "3 KB",
    ),
    createJsonArtifact(
      sessionId,
      "assess-snapshot",
      "wangjianguo-assessment.json",
      producerName,
      "员工评估",
      snapshotJson,
      producedAt,
      "2 KB",
    ),
  ];
};

const buildRedlineArtifacts = (sessionId: string): ArtifactItem[] => {
  const producerName = "红线检测专家";
  const producedAt = "2026-03-30 09:41";
  const interviewMarkdown = `# 张伟约谈准备清单

## 触碰项
- 品质安全底线：触碰
- 匠心传承底线：注意

## 关键证据
- 03-28 生产周会：提出“这批货先出货再说，质检后面补”
- 03-25 班前会：提出“这个工艺不用那么细，老办法就行”

## 约谈建议
1. 先让其复述当时决策背景，确认是否存在侥幸心态。
2. 再明确品质安全红线不可跨越，要求现场给出纠偏动作。
3. 一周后复盘整改结果，并由直属主管跟踪。`;
  const eventJson = prettyJson({
    employee_name: "张伟",
    overall_status: "触碰",
    alert_level: "red",
    requires_interview: true,
    redlines: [
      {
        type: "品质安全底线",
        status: "触碰",
        severity: "高",
        evidence: "2026-03-28 生产周会：这批货先出货再说，质检后面补",
      },
      {
        type: "匠心传承底线",
        status: "注意",
        severity: "中",
        evidence: "2026-03-25 班前会：这个工艺不用那么细，老办法就行",
      },
    ],
  });

  return [
    createImageArtifact(
      sessionId,
      "redline-scene",
      "张伟预警面板.png",
      producerName,
      "红线检测",
      REDLINE_WARNING_PANEL_IMAGE_URL,
      producedAt,
      "116 KB",
    ),
    createMarkdownArtifact(
      sessionId,
      "redline-interview",
      "张伟约谈准备清单.md",
      producerName,
      "红线检测",
      interviewMarkdown,
      producedAt,
      "2 KB",
    ),
    createJsonArtifact(
      sessionId,
      "redline-event",
      "zhangwei-redline-event.json",
      producerName,
      "红线检测",
      eventJson,
      producedAt,
      "2 KB",
    ),
  ];
};

const buildBenchmarkArtifacts = (sessionId: string): ArtifactItem[] => {
  const producerName = "标杆识别专家";
  const producedAt = "2026-03-30 09:52";
  const rosterMarkdown = `# 生产序列标杆名册

## 本期标杆
- 李伟（94 分）：连续 6 个月零品质事故，工艺改进预计提升效率 15%
- 陈芳（92 分）：本月拦截 3 批问题原料，避免客户投诉
- 刘敏（91 分）：主动带教 4 名新员工，班组稳定性明显提升

## 培养建议
1. 李伟纳入晋升储备，参加管理培训。
2. 陈芳作为质量序列骨干，输出拦截案例复盘。
3. 刘敏承担跨班组带教任务，放大示范效应。`;
  const talentJson = prettyJson({
    sequence: "生产序列",
    benchmark_count: 3,
    benchmarks: [
      { name: "李伟", score: 94, role: "车间主任", recommendation: "晋升储备" },
      { name: "陈芳", score: 92, role: "质检员", recommendation: "质量骨干培养" },
      { name: "刘敏", score: 91, role: "班组长", recommendation: "带教负责人" },
    ],
  });

  return [
    createImageArtifact(
      sessionId,
      "benchmark-panel-scene",
      "达标表扬面板.png",
      producerName,
      "人才培养建议",
      BENCHMARK_ACHIEVEMENT_PANEL_IMAGE_URL,
      producedAt,
      "205 KB",
    ),
    createImageArtifact(
      sessionId,
      "benchmark-scene",
      "生产序列标杆页面.png",
      producerName,
      "标杆识别",
      BENCHMARK_PRODUCTION_PAGE_IMAGE_URL,
      producedAt,
      "95 KB",
    ),
    createMarkdownArtifact(
      sessionId,
      "benchmark-roster",
      "生产序列标杆名册.md",
      producerName,
      "标杆识别",
      rosterMarkdown,
      producedAt,
      "2 KB",
    ),
    createJsonArtifact(
      sessionId,
      "benchmark-talent",
      "benchmark-talent-plan.json",
      producerName,
      "标杆识别",
      talentJson,
      producedAt,
      "1 KB",
    ),
  ];
};

const buildScoreRankArtifacts = (sessionId: string): ArtifactItem[] => {
  const producerName = "评分排名专家";
  const producedAt = "2026-03-30 10:04";
  const focusMarkdown = `# 销售序列关注区名单

## 关注区
- 王强：58 分，连续下滑 5 名，线索转跟进效率持续下降
- 李明：55 分，触碰诚信底线，有数据美化记录
- 张伟：52 分，新客户开发停滞，连续 2 周新增为 0

## 管理建议
1. 王强先做过程陪跑，拆出跟进链路断点。
2. 李明先处理底线问题，再谈业绩恢复。
3. 张伟调整线索池并做一周冲刺复盘。`;
  const rankJson = prettyJson({
    sequence: "销售序列",
    total_count: 45,
    benchmark_zone: { count: 4, percentage: "8.9%" },
    middle_zone: { count: 38, percentage: "84.4%", avg_score: 75.3 },
    attention_zone: {
      count: 3,
      percentage: "6.7%",
      employees: [
        { name: "王强", score: 58, change: "-5", alert: "连续下滑" },
        { name: "李明", score: 55, change: "-2", alert: "触碰诚信底线" },
        { name: "张伟", score: 52, change: "0", alert: "新客户开发停滞" },
      ],
    },
  });

  return [
    createImageArtifact(
      sessionId,
      "rank-full-scene",
      "销售序列完整排名.png",
      producerName,
      "评分排名",
      SCORE_RANK_FULL_LIST_IMAGE_URL,
      producedAt,
      "113 KB",
    ),
    createImageArtifact(
      sessionId,
      "rank-scene",
      "销售序列评分排名.png",
      producerName,
      "评分排名",
      SCORE_RANK_OVERVIEW_IMAGE_URL,
      producedAt,
      "109 KB",
    ),
    createMarkdownArtifact(
      sessionId,
      "rank-focus",
      "销售序列关注区名单.md",
      producerName,
      "评分排名",
      focusMarkdown,
      producedAt,
      "2 KB",
    ),
    createJsonArtifact(
      sessionId,
      "rank-board",
      "sales-score-rank.json",
      producerName,
      "评分排名",
      rankJson,
      producedAt,
      "2 KB",
    ),
  ];
};

const buildCeoArtifacts = (sessionId: string): ArtifactItem[] => {
  const producerName = "CEO分身";
  const producedAt = "2026-03-30 10:18";
  const briefMarkdown = `# CEO 晨会简报

## 一句话结论
- 质量、生产两条线稳住了，管理和销售是今天要盯的两块。
- 王建国值得重点培养，但要补数字化短板。
- 当前最值得老板亲自过问的是管理序列执行脱节，以及销售关注区里的底线风险。

## 立即动作
1. 今天上午让管理序列负责人拆 6 个红灯预警来源。
2. 下午把销售关注区 3 人逐一过一遍，先处理底线再谈业绩。
3. 王建国安排进下周数据复盘会，作为储备干部观察对象。`;
  const actionJson = prettyJson({
    board_summary: {
      company_avg: 77.9,
      red_alert_sequences: ["管理序列", "销售序列"],
      key_employee: "王建国",
      urgent_redline_employee: "李明",
    },
    next_actions: [
      "管理序列今日内提交预警拆解",
      "销售关注区三人分别制定跟进动作",
      "王建国纳入储备干部观察名单",
    ],
  });

  return [
    createImageArtifact(
      sessionId,
      "ceo-scene",
      "AI CEO 对话侧栏.png",
      producerName,
      "CEO综合研判",
      CEO_CHAT_DRAWER_IMAGE_URL,
      producedAt,
      "156 KB",
    ),
    createImageArtifact(
      sessionId,
      "ceo-overview-scene",
      "CEO综合研判-序列盘面.png",
      producerName,
      "序列总览",
      SEQUENCE_OVERVIEW_PAGE_IMAGE_URL,
      producedAt,
      "156 KB",
    ),
    createImageArtifact(
      sessionId,
      "ceo-assess-scene",
      "CEO综合研判-王建国详情.png",
      producerName,
      "员工评估",
      EMPLOYEE_ASSESS_PAGE_IMAGE_URL,
      producedAt,
      "134 KB",
    ),
    createImageArtifact(
      sessionId,
      "ceo-redline-scene",
      "CEO综合研判-红线预警.png",
      producerName,
      "红线检测",
      REDLINE_WARNING_PANEL_IMAGE_URL,
      producedAt,
      "116 KB",
    ),
    createMarkdownArtifact(
      sessionId,
      "ceo-brief",
      "CEO晨会简报.md",
      producerName,
      "CEO综合研判",
      briefMarkdown,
      producedAt,
      "2 KB",
    ),
    createJsonArtifact(
      sessionId,
      "ceo-actions",
      "ceo-next-actions.json",
      producerName,
      "CEO综合研判",
      actionJson,
      producedAt,
      "1 KB",
    ),
  ];
};

const buildFeishuDispatchArtifacts = (
  sessionId: string,
  mode: "overview" | "managementFocus",
): ArtifactItem[] => {
  const producerName = "CEO分身";
  const producedAt = mode === "overview" ? "2026-03-30 09:20" : "2026-03-30 09:26";

  if (mode === "managementFocus") {
    const markdown = `# 管理序列负责人飞书提醒

## 发送对象
- 陈峰（管理序列负责人）

## 发送内容
陈峰，今天先把管理序列 6 个预警来源拆清楚，中午 12 点前直接回我。

这次不是泛泛复盘，要把两件事说明白：
1. 哪些问题属于执行脱节；
2. 哪些问题属于跨部门协同卡点。

如果中午前没有回执，下午 15:00 我会再追一次。

## 回执要求
- 中午 12:00 前回传
- 未回执自动追加提醒`;
    const receipt = prettyJson({
      channel: "feishu",
      dispatch_mode: "single",
      recipients: [
        {
          name: "陈峰",
          role: "管理序列负责人",
          status: "sent",
          ack_deadline: "2026-03-30 12:00",
          auto_reminder_at: "2026-03-30 15:00",
        },
      ],
    });

    return [
      createMarkdownArtifact(
        sessionId,
        "dispatch-management-message",
        "管理序列飞书提醒.md",
        producerName,
        "飞书触达",
        markdown,
        producedAt,
        "2 KB",
      ),
      createJsonArtifact(
        sessionId,
        "dispatch-management-receipt",
        "management-feishu-dispatch.json",
        producerName,
        "飞书触达",
        receipt,
        producedAt,
        "1 KB",
      ),
    ];
  }

  const markdown = `# 管理与销售负责人飞书发送记录

## 对话记录
- 老板：把管理和销售今天要收口的内容发给负责人。
- CEO分身：先查飞书通讯录，再按上一轮确认的收口口径发出。
- 通讯录命中：陈峰（管理序列负责人）、刘敏（销售序列负责人）

## 发送对象
- 陈峰（管理序列负责人）
- 刘敏（销售序列负责人）

## 发送内容
### 管理序列负责人
陈峰，今天先把管理序列 6 个预警来源拆清楚，中午前回我，重点看执行脱节和跨部门协同卡点。

### 销售序列负责人
刘敏，今天把销售关注区名单拉出来，连续下滑和底线问题分开处理，下午 17:00 前把处理动作回我。

## 回执要求
- 管理序列：12:00 前
- 销售序列：17:00 前
- 未回执自动提醒`;
  const receipt = prettyJson({
    channel: "feishu",
    contacts_matched: ["陈峰", "刘敏"],
    dispatch_mode: "single",
    recipients: [
      {
        name: "陈峰",
        role: "管理序列负责人",
        status: "sent",
        ack_deadline: "2026-03-30 12:00",
      },
      {
        name: "刘敏",
        role: "销售序列负责人",
        status: "sent",
        ack_deadline: "2026-03-30 17:00",
      },
    ],
    thread_id: "feishu-thread-ceo-dispatch-001",
  });

  return [
    createMarkdownArtifact(
      sessionId,
      "dispatch-message",
      "管理与销售负责人飞书下发.md",
      producerName,
      "飞书触达",
      markdown,
      producedAt,
      "2 KB",
    ),
    createJsonArtifact(
      sessionId,
      "dispatch-receipt",
      "feishu-dispatch-receipt.json",
      producerName,
      "飞书触达",
      receipt,
      producedAt,
      "1 KB",
    ),
  ];
};

const buildSequenceOverviewFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const thinkingId = `${sessionId}-thinking`;
  const overviewToolId = `${sessionId}-sequence-overview`;
  const digestToolId = `${sessionId}-alert-digest`;
  const finalTextId = `${sessionId}-final`;
  const finalArtifacts = buildSequenceOverviewArtifacts(sessionId);
  const overviewSceneArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "overview-scene"),
  );
  const overviewOutput = {
    sequences: [
      { name: "质量序列", count: 48, avg_score: 82.9, alerts: 1, trend: "+1.7" },
      { name: "生产序列", count: 96, avg_score: 81.6, alerts: 2, trend: "+2.4" },
      { name: "研发序列", count: 57, avg_score: 79.8, alerts: 2, trend: "+0.8" },
      { name: "管理序列", count: 34, avg_score: 74.8, alerts: 6, trend: "-1.3" },
      { name: "销售序列", count: 45, avg_score: 71.4, alerts: 5, trend: "-0.9" },
    ],
    summary: {
      total_employees: 356,
      company_avg: 77.9,
      red_alerts: 16,
      benchmark_count: 18,
    },
  };
  const digestOutput = {
    highest_alert_sequences: [
      { name: "管理序列", alerts: 6, reason: "执行脱节、跨部门协同卡点明显" },
      { name: "销售序列", alerts: 5, reason: "关注区人数增加，线索转化不稳定" },
    ],
  };
  const partialText = `### 初步结论
- **质量序列**和**生产序列**当前是全公司最稳的两条线。
- 预警最高的是**管理序列**和**销售序列**，这两块今天要盯。`;
  const finalText = `### CEO 可直接使用的口径
- **质量序列**均分最高，48 人做到 **82.9 分**，只有 1 个预警，基本盘很稳。
- **生产序列**人数最多，96 人做到 **81.6 分**，而且环比还在涨，说明一线执行状态在变好。
- **管理序列**现在最值得警惕，34 人里挂了 **6 个预警**，均分掉到 **74.8**，说明不是个别人的问题，是组织协同有松动。
- **销售序列**第二个需要盯，45 人里有 **5 个预警**，均分 **71.4**，关注区正在扩大。

### 我给老板的建议
1. 上午先让管理序列负责人拆一下 6 个预警来源。
2. 销售序列今天直接把关注区名单拉出来，按连续下滑和底线问题分开处理。
3. 晨会上可以一句话定调：**生产和质量继续稳，管理和销售立即收口。**`;
  const runningPanel = createSequenceOverviewPanelState(sessionId, "running");
  const successPanel = createSequenceOverviewPanelState(sessionId, "success");

  return [
    {
      delayMs: 220,
      preview: "正在识别任务，准备拉取 11 大序列最近 30 天的经营表现...",
      blocks: [
        createAssistantMessageBlock(
          messageId,
          [
            createThinkingBlock(
              thinkingId,
              `### 正在判断任务
- 用户要看公司各业务序列整体表现
- 结果需要按平均分排序
- 还要额外点出预警最高的两个序列

下一步我会先调用 \`sequence_overview\` 拉全量序列快照，再补一层预警摘要。`,
              true,
            ),
          ],
          true,
        ),
      ],
    },
    {
      delayMs: 760,
      preview: "已识别为序列总览场景，开始调用 sequence_overview...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 任务拆解完成
- 主查询：序列均分、人数、预警数、趋势
- 辅助判断：哪些序列需要老板今天盯

我先执行 \`sequence_overview(sort_by="average_score", time_range="last_30_days")\`。`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "拉取 11 大序列近 30 天评分、预警和趋势数据",
            status: "running",
          }),
        ]),
      ],
    },
    {
      delayMs: 900,
      preview: "sequence_overview 已返回，正在汇总预警最高的两个序列...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 已拿到序列快照
- 均分排名已经清楚
- 还需要再补一层“谁最需要老板盯”的解释
- 我会再做一次预警摘要，把最高风险的两条线单独拎出来`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "拉取 11 大序列近 30 天评分、预警和趋势数据",
            status: "success",
            output: prettyJson(overviewOutput),
          }),
          createToolUseBlock({
            id: digestToolId,
            name: "alert_digest",
            displayName: "alert_digest",
            purpose: "提炼预警最高的序列与背后原因",
            status: "running",
          }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "序列评分与预警分布已返回，正在渲染经营总览看板",
      },
      artifacts: overviewSceneArtifacts,
    },
    {
      delayMs: 840,
      preview: "预警摘要完成，正在生成可以直接汇报给老板的口径...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 已完成判断
- 现在不只是报数字，而是要告诉老板“谁稳、谁掉、今天盯谁”
- 我会把数字翻译成一句能直接拿去晨会说的话`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "拉取 11 大序列近 30 天评分、预警和趋势数据",
            status: "success",
            output: prettyJson(overviewOutput),
          }),
          createToolUseBlock({
            id: digestToolId,
            name: "alert_digest",
            displayName: "alert_digest",
            purpose: "提炼预警最高的序列与背后原因",
            status: "success",
            output: prettyJson(digestOutput),
          }),
          createTextBlock(finalTextId, partialText, { isStreaming: true }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "高预警序列已锁定，正在把看板翻译成晨会口径",
      },
      artifacts: overviewSceneArtifacts,
    },
    {
      delayMs: 980,
      preview: "生产、质量稳住了，管理和销售预警偏高，需要今天盯一下。",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 本轮总结
- 生产、质量是稳盘
- 管理、销售是收口重点
- 结果已整理成老板可直接复述的经营口径`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "拉取 11 大序列近 30 天评分、预警和趋势数据",
            status: "success",
            output: prettyJson(overviewOutput),
          }),
          createToolUseBlock({
            id: digestToolId,
            name: "alert_digest",
            displayName: "alert_digest",
            purpose: "提炼预警最高的序列与背后原因",
            status: "success",
            output: prettyJson(digestOutput),
          }),
          createTextBlock(finalTextId, finalText),
        ]),
      ],
      panel: successPanel,
      artifacts: finalArtifacts,
      results: buildSequenceOverviewResults(sessionId),
      followupSuggestions: CEO_SEQUENCE_FOLLOWUPS,
    },
  ];
};

const buildEmployeeAssessFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const thinkingId = `${sessionId}-thinking`;
  const assessToolId = `${sessionId}-employee-assess`;
  const redlineToolId = `${sessionId}-redline-detect`;
  const erpToolId = `${sessionId}-erp-query`;
  const finalTextId = `${sessionId}-final`;
  const finalArtifacts = buildEmployeeAssessArtifacts(sessionId);
  const assessSceneArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "assess-scene"),
  );
  const assessOutput = {
    employee: {
      name: "王建国",
      sequence: "生产序列",
      role: "生产班组长",
      score: 84,
      trend: "+6",
      zone: "关注区上沿",
    },
    dimension_scores: {
      strategic_understanding: 76,
      execution: 89,
      risk_prediction: 91,
      teamwork: 84,
      innovation: 79,
      customer_mindset: 78,
      digital_mindset: 71,
      craftsmanship: 86,
    },
    evidence: [
      {
        date: "2026-03-25",
        content: "班前会主动提醒面粉含水量异常，要求调整参数",
        source: "班前会纪要",
      },
      {
        date: "2026-03-26",
        content: "@质检 这批货加抽一下，别把问题流到下游",
        source: "企微群",
      },
    ],
  };
  const redlineOutput = {
    overall_status: "通过",
    highest_risk: "无硬性触碰，属于绿灯状态",
  };
  const erpOutput = {
    metrics: {
      yield_rate: "98.2%",
      rework_rate: "1.8%",
      overtime_hours: 14,
      process_exception_count: 1,
      sequence_rework_average: "2.6%",
    },
  };
  const partialText = `### 初步判断
王建国这一轮整体是**往上走**的，最亮眼的是执行力和风险预判。`;
  const finalText = `### 结论先说
王建国最近状态不错，综合 **84 分**，比上个月涨了 **6 分**。他还在关注区上沿，但已经很接近标杆线了。

### 我为什么这么判断
- **执行力强**：班前会发现原料含水量异常时，他第一反应不是等人安排，而是直接要求调整参数。
- **风险意识强**：第二天又在群里主动 @质检 做加抽，说明他会提前拦风险，不会把问题往下游推。
- **ERP 侧也对得上**：他负责班组本月返工率 **1.8%**，低于生产序列均值 **2.6%**，不是只会说，实际结果也稳。

### 当前短板
- **数字化思维 71 分**，主要弱在数据复盘和报表使用，还没把经验沉淀成数据化动作。

### 管理建议
1. 下周把他放进生产复盘会，让他主讲一次异常处置。
2. 给他一个轻量数据看板任务，补数字化能力。
3. 继续按储备干部标准观察，他是值得培养的人。`;
  const runningPanel = createEmployeeAssessPanelState(sessionId, "running");
  const successPanel = createEmployeeAssessPanelState(sessionId, "success");

  return [
    {
      delayMs: 220,
      preview: "正在拆解员工评估任务，准备核对评分、证据和 ERP 表现...",
      blocks: [
        createAssistantMessageBlock(
          messageId,
          [
            createThinkingBlock(
              thinkingId,
              `### 正在判断任务
- 用户不是泛泛问表现，而是明确要求：评分、证据、ERP 指标、风险一起看
- 所以这轮不能只调一个技能，要做多源交叉验证`,
              true,
            ),
          ],
          true,
        ),
      ],
    },
    {
      delayMs: 760,
      preview: "先调用 employee_assess 拉主评估，再并行补风险和 ERP...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 任务拆解
1. 先做 \`employee_assess\` 取 8 维评分和证据
2. 再做 \`redline_detect\` 看底线状态
3. 最后用 \`erp_query\` 校验产线指标`,
          ),
          createToolUseBlock({
            id: assessToolId,
            name: "employee_assess",
            displayName: "employee_assess",
            purpose: "读取王建国近 30 天评分、证据与趋势",
            status: "running",
          }),
        ]),
      ],
    },
    {
      delayMs: 880,
      preview: "主评估已返回，正在核对红线状态...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 主评估结果已拿到
- 现在看，他的主趋势是向上
- 我还需要确认有没有被单点风险拖住`,
          ),
          createToolUseBlock({
            id: assessToolId,
            name: "employee_assess",
            displayName: "employee_assess",
            purpose: "读取王建国近 30 天评分、证据与趋势",
            status: "success",
            output: prettyJson(assessOutput),
          }),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "补一层底线触碰与风险状态判断",
            status: "running",
          }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "主评估已返回，正在把维度得分与证据拼成员工画像",
      },
      artifacts: assessSceneArtifacts,
    },
    {
      delayMs: 760,
      preview: "红线状态安全，正在用 ERP 数据校验实际产线结果...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 风险层已经过了
- 当前没有红线硬伤
- 接下来关键是看 ERP 指标是不是跟沟通表现一致`,
          ),
          createToolUseBlock({
            id: assessToolId,
            name: "employee_assess",
            displayName: "employee_assess",
            purpose: "读取王建国近 30 天评分、证据与趋势",
            status: "success",
            output: prettyJson(assessOutput),
          }),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "补一层底线触碰与风险状态判断",
            status: "success",
            output: prettyJson(redlineOutput),
          }),
          createToolUseBlock({
            id: erpToolId,
            name: "erp_query",
            displayName: "erp_query",
            purpose: "核对班组返工率、良率和异常记录",
            status: "running",
          }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "底线状态已确认安全，正在补 ERP 指标做交叉验证",
      },
      artifacts: assessSceneArtifacts,
    },
    {
      delayMs: 860,
      preview: "评分、证据、风险和 ERP 已对齐，正在生成综合结论...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 多源验证完成
- 沟通证据和 ERP 指标是一致的
- 这不是“会说”的类型，而是结果也跑得出来
- 我可以给出培养级别的建议了`,
          ),
          createToolUseBlock({
            id: assessToolId,
            name: "employee_assess",
            displayName: "employee_assess",
            purpose: "读取王建国近 30 天评分、证据与趋势",
            status: "success",
            output: prettyJson(assessOutput),
          }),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "补一层底线触碰与风险状态判断",
            status: "success",
            output: prettyJson(redlineOutput),
          }),
          createToolUseBlock({
            id: erpToolId,
            name: "erp_query",
            displayName: "erp_query",
            purpose: "核对班组返工率、良率和异常记录",
            status: "success",
            output: prettyJson(erpOutput),
          }),
          createTextBlock(finalTextId, partialText, { isStreaming: true }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "员工画像已完整，正在生成管理动作建议",
      },
      artifacts: assessSceneArtifacts,
    },
    {
      delayMs: 980,
      preview: "王建国在往上走，风险意识很强，值得按储备干部标准继续观察。",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 输出完成
- 评分、证据、ERP、风险已统一
- 当前结论：值得培养，但要补数字化短板`,
          ),
          createToolUseBlock({
            id: assessToolId,
            name: "employee_assess",
            displayName: "employee_assess",
            purpose: "读取王建国近 30 天评分、证据与趋势",
            status: "success",
            output: prettyJson(assessOutput),
          }),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "补一层底线触碰与风险状态判断",
            status: "success",
            output: prettyJson(redlineOutput),
          }),
          createToolUseBlock({
            id: erpToolId,
            name: "erp_query",
            displayName: "erp_query",
            purpose: "核对班组返工率、良率和异常记录",
            status: "success",
            output: prettyJson(erpOutput),
          }),
          createTextBlock(finalTextId, finalText),
        ]),
      ],
      panel: successPanel,
      artifacts: finalArtifacts,
      results: buildEmployeeAssessResults(sessionId),
      followupSuggestions: CEO_EMPLOYEE_ASSESS_FOLLOWUPS,
    },
  ];
};

const buildRedlineFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const thinkingId = `${sessionId}-thinking`;
  const redlineToolId = `${sessionId}-redline-detect`;
  const interviewToolId = `${sessionId}-interview-prep`;
  const finalTextId = `${sessionId}-final`;
  const finalArtifacts = buildRedlineArtifacts(sessionId);
  const redlineSceneArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "redline-scene"),
  );
  const redlineOutput = {
    employee_name: "张伟",
    overall_status: "触碰",
    alert_level: "red",
    redlines: [
      {
        type: "品质安全底线",
        status: "触碰",
        severity: "高",
        evidence: "生产周会：这批货先出货再说，质检后面补",
      },
      {
        type: "诚信担当底线",
        status: "通过",
      },
      {
        type: "匠心传承底线",
        status: "注意",
        severity: "中",
        evidence: "班前会：这个工艺不用那么细，老办法就行",
      },
    ],
  };
  const interviewOutput = {
    requires_interview: true,
    owner: "直属主管 + 品质负责人",
    checklist: ["复盘当时决策背景", "明确不可跨越的品质底线", "确认一周内整改动作"],
  };
  const partialText = `### 初步判断
张伟这次不是一般关注，已经碰到了**品质安全底线**。`;
  const finalText = `### 先说结论
张伟这轮是**红灯事件**，不是提醒级别，而是已经明确触碰了**品质安全底线**。

### 触发证据
- **03-28 生产周会**：他说“这批货先出货再说，质检后面补”，这个表述已经不是表达着急，而是在公开建议跳过质检。
- **03-25 班前会**：他说“这个工艺不用那么细，老办法就行”，这条还没有到硬触碰，但已经落在匠心传承的注意区。

### 严重程度判断
- **品质安全底线：触碰 / 高**
- **诚信担当底线：通过**
- **匠心传承底线：注意 / 中**

### 我建议怎么处理
1. 今天就安排约谈，不要拖到周会后。
2. 约谈重点不是批评态度，而是把“为什么不能先出货后补检”讲透。
3. 约谈后给一周整改动作，由直属主管跟踪复盘。`;
  const runningPanel = createRedlineDetectPanelState(sessionId, "running");
  const successPanel = createRedlineDetectPanelState(sessionId, "success");

  return [
    {
      delayMs: 220,
      preview: "正在检索张伟最近 30 天的底线触碰记录和原始证据...",
      blocks: [
        createAssistantMessageBlock(
          messageId,
          [
            createThinkingBlock(
              thinkingId,
              `### 正在判断任务
- 用户要的不是泛泛风险，是“有没有碰红线”
- 所以必须把三条底线逐项判断，并把触发证据带出来`,
              true,
            ),
          ],
          true,
        ),
      ],
    },
    {
      delayMs: 760,
      preview: "开始执行 redline_detect，并做底线分项判断...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 判定策略
1. 先跑 \`redline_detect\`
2. 再把结果转成约谈动作，而不是只报一个红灯`,
          ),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "判断品质安全、诚信担当、匠心传承三条底线状态",
            status: "running",
          }),
        ]),
      ],
    },
    {
      delayMs: 900,
      preview: "红线检测已返回，正在生成约谈准备动作...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 检测结果很明确
- 已有一条硬触碰
- 这轮需要的不只是报告，还要给出下一步处理方式`,
          ),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "判断品质安全、诚信担当、匠心传承三条底线状态",
            status: "success",
            output: prettyJson(redlineOutput),
          }),
          createToolUseBlock({
            id: interviewToolId,
            name: "interview_prepare",
            displayName: "interview_prepare",
            purpose: "生成约谈顺序、重点问题和跟进动作",
            status: "running",
          }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "红线性质已定，正在生成约谈动作与系统提醒",
      },
      artifacts: redlineSceneArtifacts,
    },
    {
      delayMs: 840,
      preview: "约谈动作已生成，正在汇总成管理口径...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 处理建议已经成型
- 当前最关键的是“立即约谈 + 一周复盘”
- 我会把它整理成可以直接交办的管理口径`,
          ),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "判断品质安全、诚信担当、匠心传承三条底线状态",
            status: "success",
            output: prettyJson(redlineOutput),
          }),
          createToolUseBlock({
            id: interviewToolId,
            name: "interview_prepare",
            displayName: "interview_prepare",
            purpose: "生成约谈顺序、重点问题和跟进动作",
            status: "success",
            output: prettyJson(interviewOutput),
          }),
          createTextBlock(finalTextId, partialText, { isStreaming: true }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "约谈顺序与跟进动作已生成，正在整理管理口径",
      },
      artifacts: redlineSceneArtifacts,
    },
    {
      delayMs: 980,
      preview: "张伟已触碰品质安全底线，建议今天就约谈，不要拖。",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 输出完成
- 红线性质已定性
- 处理动作已落到“谁今天做什么”`,
          ),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "判断品质安全、诚信担当、匠心传承三条底线状态",
            status: "success",
            output: prettyJson(redlineOutput),
          }),
          createToolUseBlock({
            id: interviewToolId,
            name: "interview_prepare",
            displayName: "interview_prepare",
            purpose: "生成约谈顺序、重点问题和跟进动作",
            status: "success",
            output: prettyJson(interviewOutput),
          }),
          createTextBlock(finalTextId, finalText),
        ]),
      ],
      panel: successPanel,
      artifacts: finalArtifacts,
      results: buildRedlineResults(sessionId),
      followupSuggestions: CEO_REDLINE_FOLLOWUPS,
    },
  ];
};

const buildBenchmarkFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const thinkingId = `${sessionId}-thinking`;
  const benchmarkToolId = `${sessionId}-benchmark-find`;
  const talentToolId = `${sessionId}-talent-plan`;
  const finalTextId = `${sessionId}-final`;
  const finalArtifacts = buildBenchmarkArtifacts(sessionId);
  const benchmarkSceneArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "benchmark-scene"),
  );
  const benchmarkPanelArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "benchmark-panel-scene"),
    getScenarioArtifactBySuffix(finalArtifacts, "benchmark-scene"),
  );
  const benchmarkOutput = {
    sequence: "生产序列",
    benchmark_count: 3,
    benchmarks: [
      {
        name: "李伟",
        role: "车间主任",
        score: 94,
        excellence_description: "连续 6 个月零品质事故，工艺改进预计提升效率 15%",
      },
      {
        name: "陈芳",
        role: "质检员",
        score: 92,
        excellence_description: "本月拦截 3 批问题原料，避免客户投诉",
      },
      {
        name: "刘敏",
        role: "班组长",
        score: 91,
        excellence_description: "主动带教 4 名新员工，班组稳定性提升明显",
      },
    ],
  };
  const talentOutput = {
    next_moves: [
      "李伟纳入晋升储备并参加管理培训",
      "陈芳输出质量拦截案例做全员复盘",
      "刘敏承担跨班组带教任务",
    ],
  };
  const partialText = `### 初步判断
生产序列这期真正值得老板点名表扬的，有 3 个人。`;
  const finalText = `### 这一批标杆，是真能拿出来讲的
- **李伟（94 分，车间主任）**：连续 6 个月零品质事故，还主动提交了工艺改进方案，预计提升效率 **15%**。这不是守成，是在主动往前推。
- **陈芳（92 分，质检员）**：本月拦截了 **3 批**问题原料，直接避免客户投诉，属于风险预判非常强的类型。
- **刘敏（91 分，班组长）**：不是单兵优秀，而是能把人带起来，最近带教了 4 名新员工，班组稳定性明显提升。

### 我建议怎么用这些人
1. 李伟直接纳入晋升储备，给他管理培训。
2. 陈芳的案例做一次全员复盘，放大她的风险识别方法。
3. 刘敏适合做带教负责人，让她去带跨班组。`;
  const runningPanel = createBenchmarkFindPanelState(sessionId, "running", "ranking");
  const successPanel = createBenchmarkFindPanelState(sessionId, "success", "ranking");

  return [
    {
      delayMs: 220,
      preview: "正在筛选生产序列高分员工和典型事迹...",
      blocks: [
        createAssistantMessageBlock(
          messageId,
          [
            createThinkingBlock(
              thinkingId,
              `### 正在判断任务
- 用户要的不只是高分名单
- 还要“为什么他们是标杆”以及“接下来怎么用”`,
              true,
            ),
          ],
          true,
        ),
      ],
    },
    {
      delayMs: 760,
      preview: "开始执行 benchmark_find，筛选评分 ≥90 的生产序列员工...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 任务拆解
1. 先跑 \`benchmark_find\` 找出高分员工
2. 再补一层人才使用建议，避免只停在“表扬名单”`,
          ),
          createToolUseBlock({
            id: benchmarkToolId,
            name: "benchmark_find",
            displayName: "benchmark_find",
            purpose: "筛选生产序列评分 ≥90 的标杆员工并提炼优秀行为",
            status: "running",
          }),
        ]),
      ],
    },
    {
      delayMs: 900,
      preview: "标杆名单已返回，正在生成人才使用建议...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 标杆已经清楚
- 现在不只是表扬，还要想这些人怎么被放大使用`,
          ),
          createToolUseBlock({
            id: benchmarkToolId,
            name: "benchmark_find",
            displayName: "benchmark_find",
            purpose: "筛选生产序列评分 ≥90 的标杆员工并提炼优秀行为",
            status: "success",
            output: prettyJson(benchmarkOutput),
          }),
          createToolUseBlock({
            id: talentToolId,
            name: "talent_recommend",
            displayName: "talent_recommend",
            purpose: "生成晋升储备、案例沉淀和带教安排建议",
            status: "running",
          }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "标杆名单已出，正在生成公开表扬与人才放大动作",
      },
      artifacts: benchmarkSceneArtifacts,
    },
    {
      delayMs: 840,
      preview: "人才使用建议已生成，正在整理老板可直接引用的话术...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 建议已经成型
- 我会把“谁优秀”翻译成“老板下一步怎么用人”`,
          ),
          createToolUseBlock({
            id: benchmarkToolId,
            name: "benchmark_find",
            displayName: "benchmark_find",
            purpose: "筛选生产序列评分 ≥90 的标杆员工并提炼优秀行为",
            status: "success",
            output: prettyJson(benchmarkOutput),
          }),
          createToolUseBlock({
            id: talentToolId,
            name: "talent_recommend",
            displayName: "talent_recommend",
            purpose: "生成晋升储备、案例沉淀和带教安排建议",
            status: "success",
            output: prettyJson(talentOutput),
          }),
          createTextBlock(finalTextId, partialText, { isStreaming: true }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "标杆放大动作已生成，正在整理老板可直接点名的话术",
      },
      artifacts: benchmarkPanelArtifacts,
    },
    {
      delayMs: 960,
      preview: "李伟、陈芳、刘敏这 3 个人值得点名表扬，而且都能进一步放大使用。",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 输出完成
- 标杆名单与培养动作都准备好了
- 现在是可以直接用于表扬和人才配置的版本`,
          ),
          createToolUseBlock({
            id: benchmarkToolId,
            name: "benchmark_find",
            displayName: "benchmark_find",
            purpose: "筛选生产序列评分 ≥90 的标杆员工并提炼优秀行为",
            status: "success",
            output: prettyJson(benchmarkOutput),
          }),
          createToolUseBlock({
            id: talentToolId,
            name: "talent_recommend",
            displayName: "talent_recommend",
            purpose: "生成晋升储备、案例沉淀和带教安排建议",
            status: "success",
            output: prettyJson(talentOutput),
          }),
          createTextBlock(finalTextId, finalText),
        ]),
      ],
      panel: successPanel,
      artifacts: finalArtifacts,
      results: buildBenchmarkResults(sessionId),
      followupSuggestions: CEO_BENCHMARK_FOLLOWUPS,
    },
  ];
};

const buildScoreRankFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const thinkingId = `${sessionId}-thinking`;
  const rankToolId = `${sessionId}-score-rank`;
  const riskToolId = `${sessionId}-attention-redline`;
  const finalTextId = `${sessionId}-final`;
  const finalArtifacts = buildScoreRankArtifacts(sessionId);
  const rankOverviewArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "rank-scene"),
  );
  const rankFullArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "rank-full-scene"),
    getScenarioArtifactBySuffix(finalArtifacts, "rank-scene"),
  );
  const rankOutput = {
    sequence: "销售序列",
    total_count: 45,
    benchmark_zone: { count: 4, percentage: "8.9%" },
    middle_zone: { count: 38, percentage: "84.4%", avg_score: 75.3 },
    attention_zone: {
      count: 3,
      percentage: "6.7%",
      employees: [
        { name: "王强", score: 58, rank: 43, change: "-5", alert: "连续下滑" },
        { name: "李明", score: 55, rank: 44, change: "-2", alert: "触碰诚信底线" },
        { name: "张伟", score: 52, rank: 45, change: "0", alert: "新客户开发停滞" },
      ],
    },
  };
  const riskOutput = {
    attention_highlights: [
      { name: "王强", type: "业绩趋势", status: "yellow", note: "连续下滑 5 名" },
      { name: "李明", type: "诚信底线", status: "red", note: "存在数据美化行为" },
      { name: "张伟", type: "新增停滞", status: "yellow", note: "连续 2 周新增为 0" },
    ],
  };
  const partialText = `### 初步判断
销售序列主力层还在，但关注区 3 个人里已经有 1 个红线问题。`;
  const finalText = `### 排名结构先给你
销售序列一共 **45 人**。
- **标杆区 4 人（8.9%）**：赵强 95 分第一，孙丽 93 分稳定，周杰继续在往上走。
- **中间区 38 人（84.4%）**：这是主力层，均分 **75.3**，整体还能打。
- **关注区 3 人（6.7%）**：这就是现在最该盯的地方。

### 关注区怎么读
- **王强 58 分**：连续下滑 **5 名**，问题偏过程，先拆跟进链路。
- **李明 55 分**：不是单纯业绩差，而是已经碰到了**诚信底线**，这个必须先处理底线再谈恢复。
- **张伟 52 分**：连续 2 周新增为 0，更像是线索池和执行节奏出了问题。

### 我的建议
1. 王强安排过程陪跑。
2. 李明先做底线处理和约谈。
3. 张伟调整线索池，做一周冲刺复盘。`;
  const runningPanel = createScoreRankPanelState(sessionId, "running", "overview");
  const successPanel = createScoreRankPanelState(sessionId, "success", "overview");

  return [
    {
      delayMs: 220,
      preview: "正在拉取销售序列季度排名和分区分布...",
      blocks: [
        createAssistantMessageBlock(
          messageId,
          [
            createThinkingBlock(
              thinkingId,
              `### 正在判断任务
- 用户不仅要排名，还要关注区和底线预警
- 所以结果必须同时展示分层、变化和风险`,
              true,
            ),
          ],
          true,
        ),
      ],
    },
    {
      delayMs: 760,
      preview: "开始执行 score_rank，计算标杆区/中间区/关注区分布...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 任务拆解
1. 先跑 \`score_rank\` 看分区结构
2. 再补关注区的红黄灯状态，避免只报分数`,
          ),
          createToolUseBlock({
            id: rankToolId,
            name: "score_rank",
            displayName: "score_rank",
            purpose: "统计销售序列季度排名、分区分布与名次变化",
            status: "running",
          }),
        ]),
      ],
    },
    {
      delayMs: 900,
      preview: "排名结构已返回，正在补关注区风险判断...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 分布结构已清楚
- 主力层还在
- 真正要盯的是关注区 3 个人
- 我再补一层底线和趋势风险，方便老板马上下动作`,
          ),
          createToolUseBlock({
            id: rankToolId,
            name: "score_rank",
            displayName: "score_rank",
            purpose: "统计销售序列季度排名、分区分布与名次变化",
            status: "success",
            output: prettyJson(rankOutput),
          }),
          createToolUseBlock({
            id: riskToolId,
            name: "attention_risk_digest",
            displayName: "attention_risk_digest",
            purpose: "提炼关注区成员的连续下滑和底线预警",
            status: "running",
          }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "分区结构已生成，正在补关注区风险与底线状态",
      },
      artifacts: rankOverviewArtifacts,
    },
    {
      delayMs: 840,
      preview: "关注区风险已完成，正在生成可直接管理的结论...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 管理重点已经明确
- 排名只是表象
- 真正要交给老板的是“谁今天要怎么处理”`,
          ),
          createToolUseBlock({
            id: rankToolId,
            name: "score_rank",
            displayName: "score_rank",
            purpose: "统计销售序列季度排名、分区分布与名次变化",
            status: "success",
            output: prettyJson(rankOutput),
          }),
          createToolUseBlock({
            id: riskToolId,
            name: "attention_risk_digest",
            displayName: "attention_risk_digest",
            purpose: "提炼关注区成员的连续下滑和底线预警",
            status: "success",
            output: prettyJson(riskOutput),
          }),
          createTextBlock(finalTextId, partialText, { isStreaming: true }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "排名、关注区与风险已对齐，正在生成管理结论",
      },
      artifacts: rankFullArtifacts,
    },
    {
      delayMs: 980,
      preview: "销售序列主力层还在，但关注区的 3 个人必须拆开处理。",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 输出完成
- 排名结构、关注区、底线预警三层都齐了
- 现在是老板可以直接交办动作的版本`,
          ),
          createToolUseBlock({
            id: rankToolId,
            name: "score_rank",
            displayName: "score_rank",
            purpose: "统计销售序列季度排名、分区分布与名次变化",
            status: "success",
            output: prettyJson(rankOutput),
          }),
          createToolUseBlock({
            id: riskToolId,
            name: "attention_risk_digest",
            displayName: "attention_risk_digest",
            purpose: "提炼关注区成员的连续下滑和底线预警",
            status: "success",
            output: prettyJson(riskOutput),
          }),
          createTextBlock(finalTextId, finalText),
        ]),
      ],
      panel: successPanel,
      artifacts: finalArtifacts,
      results: buildScoreRankResults(sessionId),
      followupSuggestions: CEO_SCORE_RANK_FOLLOWUPS,
    },
  ];
};

const buildCeoFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const thinkingId = `${sessionId}-thinking`;
  const overviewToolId = `${sessionId}-sequence-overview`;
  const assessToolId = `${sessionId}-employee-assess`;
  const redlineToolId = `${sessionId}-redline-detect`;
  const planToolId = `${sessionId}-management-plan`;
  const finalTextId = `${sessionId}-final`;
  const finalArtifacts = buildCeoArtifacts(sessionId);
  const ceoOverviewArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "ceo-overview-scene"),
  );
  const ceoAssessArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "ceo-assess-scene"),
    getScenarioArtifactBySuffix(finalArtifacts, "ceo-overview-scene"),
  );
  const ceoRedlineArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "ceo-redline-scene"),
    getScenarioArtifactBySuffix(finalArtifacts, "ceo-assess-scene"),
    getScenarioArtifactBySuffix(finalArtifacts, "ceo-overview-scene"),
  );
  const ceoSummaryArtifacts = buildArtifactGroup(
    getScenarioArtifactBySuffix(finalArtifacts, "ceo-scene"),
    getScenarioArtifactBySuffix(finalArtifacts, "ceo-redline-scene"),
    getScenarioArtifactBySuffix(finalArtifacts, "ceo-assess-scene"),
    getScenarioArtifactBySuffix(finalArtifacts, "ceo-overview-scene"),
  );
  const overviewOutput = {
    top_sequences: [
      { name: "质量序列", avg_score: 82.9, alerts: 1, trend: "+1.7" },
      { name: "生产序列", avg_score: 81.6, alerts: 2, trend: "+2.4" },
    ],
    risky_sequences: [
      { name: "管理序列", avg_score: 74.8, alerts: 6, trend: "-1.3" },
      { name: "销售序列", avg_score: 71.4, alerts: 5, trend: "-0.9" },
    ],
  };
  const assessOutput = {
    employee: {
      name: "王建国",
      score: 84,
      trend: "+6",
      strongest: "风险预判",
      weakest: "数字化思维",
    },
  };
  const redlineOutput = {
    risky_people: [
      { name: "李明", type: "诚信底线", level: "red" },
      { name: "张伟", type: "品质安全底线", level: "red" },
    ],
  };
  const planOutput = {
    today_actions: [
      "管理序列今日拆 6 个预警来源",
      "销售关注区三人分别定动作",
      "王建国进入储备干部观察名单",
    ],
  };
  const partialText = `### 我先把局势给你压缩成一句话
稳的是质量和生产，要盯的是管理和销售；王建国值得培养，但底线风险要先控住。`;
  const finalText = `### 一句话先定调
现在公司盘面不差，**质量和生产是稳盘**，但**管理和销售必须今天收口**。王建国值得重点培养，不过底线风险这块要先控住。

### 我是怎么判断的
- **序列层面**：质量均分最高，生产人数最多且趋势继续向上；管理和销售的预警最高，说明组织协同和一线转化同时有压力。
- **关键人层面**：王建国综合 **84 分**，执行和风险预判都很强，已经具备储备干部观察价值。
- **风险层面**：销售序列的李明、生产侧的张伟，都已经出现红线问题，这类人不能和一般关注区混着管。

### 我给你的下一步管理建议
1. **今天上午**：让管理序列负责人把 6 个预警来源拆清楚。
2. **今天下午**：把销售关注区 3 人过一遍，先处理底线，再谈业绩恢复。
3. **本周内**：把王建国放进数据复盘会，按储备干部标准继续看。

### 如果你要我继续往下推
我下一步可以直接给你：
- 管理序列 6 个预警的拆解清单
- 销售关注区 3 人的一人一策
- 王建国的储备干部培养动作表`;
  const runningPanel = createCeoSynthesisPanelState(sessionId, "running");
  const successPanel = createCeoSynthesisPanelState(sessionId, "success");

  return [
    {
      delayMs: 220,
      preview: "已识别为 CEO 综合研判场景，准备同时调度总览、评估和风险能力...",
      blocks: [
        createAssistantMessageBlock(
          messageId,
          [
            createThinkingBlock(
              thinkingId,
              `### 正在拆 CEO 任务
- 这不是单一问答，而是一个复合管理问题
- 需要先看盘面，再看关键人，再看红线风险，最后给管理动作`,
              true,
            ),
          ],
          true,
        ),
      ],
    },
    {
      delayMs: 760,
      preview: "第一步先拉 sequence_overview，看公司盘面和高预警序列...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 编排顺序
1. \`sequence_overview\` 看整体盘面
2. \`employee_assess\` 看王建国
3. \`redline_detect\` 看最近红线风险
4. 最后收口成管理动作`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "拉全公司序列均分、预警和趋势",
            status: "running",
          }),
        ]),
      ],
    },
    {
      delayMs: 860,
      preview: "公司盘面已拿到，正在下钻王建国的表现与成长潜力...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 盘面已清楚
- 稳盘是质量和生产
- 今天要盯的是管理和销售
- 下一步补关键人判断，看王建国值不值得往上提`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "拉全公司序列均分、预警和趋势",
            status: "success",
            output: prettyJson(overviewOutput),
          }),
          createToolUseBlock({
            id: assessToolId,
            name: "employee_assess",
            displayName: "employee_assess",
            purpose: "评估王建国的近期表现与培养价值",
            status: "running",
          }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "公司盘面已清楚，正在补关键人表现与成长潜力",
      },
      artifacts: ceoOverviewArtifacts,
    },
    {
      delayMs: 840,
      preview: "王建国评估完成，正在补最近的底线风险情况...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 关键人结论已拿到
- 王建国是值得培养的人
- 但老板今天关心的不只是培养，还包括底线风险是否失控`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "拉全公司序列均分、预警和趋势",
            status: "success",
            output: prettyJson(overviewOutput),
          }),
          createToolUseBlock({
            id: assessToolId,
            name: "employee_assess",
            displayName: "employee_assess",
            purpose: "评估王建国的近期表现与培养价值",
            status: "success",
            output: prettyJson(assessOutput),
          }),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "补一层最近红线事件与重点风险人员",
            status: "running",
          }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "关键人判断已完成，正在补最近的底线风险情况",
      },
      artifacts: ceoAssessArtifacts,
    },
    {
      delayMs: 840,
      preview: "风险人员已锁定，正在把盘面、人和动作收口成老板简报...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 综合判断接近完成
- 盘面、关键人、底线风险都到齐了
- 现在只差最后一层：把它翻译成今天就能执行的管理动作`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "拉全公司序列均分、预警和趋势",
            status: "success",
            output: prettyJson(overviewOutput),
          }),
          createToolUseBlock({
            id: assessToolId,
            name: "employee_assess",
            displayName: "employee_assess",
            purpose: "评估王建国的近期表现与培养价值",
            status: "success",
            output: prettyJson(assessOutput),
          }),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "补一层最近红线事件与重点风险人员",
            status: "success",
            output: prettyJson(redlineOutput),
          }),
          createToolUseBlock({
            id: planToolId,
            name: "management_plan",
            displayName: "management_plan",
            purpose: "生成老板今天就能交办的动作清单",
            status: "running",
          }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "红线风险已锁定，正在生成老板今天可交办的动作清单",
      },
      artifacts: ceoRedlineArtifacts,
    },
    {
      delayMs: 860,
      preview: "管理动作清单已生成，正在输出 CEO 可直接复述的最终版本...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 最后整理
- 这轮不能只给分析，要给“谁今天做什么”
- 我已经把动作压缩成老板可直接说的话`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "拉全公司序列均分、预警和趋势",
            status: "success",
            output: prettyJson(overviewOutput),
          }),
          createToolUseBlock({
            id: assessToolId,
            name: "employee_assess",
            displayName: "employee_assess",
            purpose: "评估王建国的近期表现与培养价值",
            status: "success",
            output: prettyJson(assessOutput),
          }),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "补一层最近红线事件与重点风险人员",
            status: "success",
            output: prettyJson(redlineOutput),
          }),
          createToolUseBlock({
            id: planToolId,
            name: "management_plan",
            displayName: "management_plan",
            purpose: "生成老板今天就能交办的动作清单",
            status: "success",
            output: prettyJson(planOutput),
          }),
          createTextBlock(finalTextId, partialText, { isStreaming: true }),
        ]),
      ],
      panel: {
        ...runningPanel,
        subtitle: "管理动作清单已生成，正在收口为 CEO 晨会面板",
      },
      artifacts: ceoSummaryArtifacts,
    },
    {
      delayMs: 1020,
      preview: "盘面已压缩成晨会口径：质量和生产稳盘，管理和销售今天必须收口。",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### CEO 综合研判完成
- 看盘面
- 看关键人
- 看红线
- 出动作

当前已经是一版老板可以直接拿去晨会说、拿去交办事的输出。`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "拉全公司序列均分、预警和趋势",
            status: "success",
            output: prettyJson(overviewOutput),
          }),
          createToolUseBlock({
            id: assessToolId,
            name: "employee_assess",
            displayName: "employee_assess",
            purpose: "评估王建国的近期表现与培养价值",
            status: "success",
            output: prettyJson(assessOutput),
          }),
          createToolUseBlock({
            id: redlineToolId,
            name: "redline_detect",
            displayName: "redline_detect",
            purpose: "补一层最近红线事件与重点风险人员",
            status: "success",
            output: prettyJson(redlineOutput),
          }),
          createToolUseBlock({
            id: planToolId,
            name: "management_plan",
            displayName: "management_plan",
            purpose: "生成老板今天就能交办的动作清单",
            status: "success",
            output: prettyJson(planOutput),
          }),
          createTextBlock(finalTextId, finalText),
        ]),
      ],
      panel: successPanel,
      artifacts: finalArtifacts,
      results: buildCeoResults(sessionId),
      followupSuggestions: CEO_SYNTHESIS_FOLLOWUPS,
    },
  ];
};

const buildFeishuDispatchFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const thinkingId = `${sessionId}-thinking`;
  const contactToolId = `${sessionId}-feishu-contact-lookup`;
  const feishuToolId = `${sessionId}-feishu-send`;
  const finalTextId = `${sessionId}-final`;
  const finalArtifacts = buildFeishuDispatchArtifacts(sessionId, "overview");
  const runningPanel = createDispatchExecutionPanelState(sessionId, "running", "overview");
  const successPanel = createDispatchExecutionPanelState(sessionId, "success", "overview");
  const contactResults: ScenarioContactLookupItem[] = [
    {
      id: "chenfeng-person",
      name: "陈峰",
      avatarLabel: "陈",
      typeLabel: "个人",
      identityLabel: "管理序列负责人",
      feishuId: "chenfeng.ops",
      matchLabel: "精确命中",
      note: "管理序列今日收口第一责任人。",
    },
    {
      id: "liumin-person",
      name: "刘敏",
      avatarLabel: "刘",
      typeLabel: "个人",
      identityLabel: "销售序列负责人",
      feishuId: "liumin.sales",
      matchLabel: "精确命中",
      note: "销售关注区处理第一责任人。",
    },
    {
      id: "wangyan-person",
      name: "王岩",
      avatarLabel: "王",
      typeLabel: "个人",
      identityLabel: "COO",
      feishuId: "wangyan.coo",
      matchLabel: "可抄送",
      note: "需要升级经营协同时可同步抄送。",
    },
    {
      id: "gaojie-person",
      name: "高洁",
      avatarLabel: "高",
      typeLabel: "个人",
      identityLabel: "HRBP / 组织协同",
      feishuId: "gaojie.org",
      matchLabel: "相关联系人",
      note: "管理序列若判断为组织协同问题，可追加同步。",
    },
    {
      id: "management-group",
      name: "管理序列负责人群",
      avatarLabel: "群",
      typeLabel: "群聊",
      identityLabel: "9 人群",
      feishuId: "oc_mgmt_line_group",
      matchLabel: "群聊可选",
      note: "适合同步执行脱节与跨部门协同卡点。",
    },
    {
      id: "sales-group",
      name: "销售经营推进群",
      avatarLabel: "群",
      typeLabel: "群聊",
      identityLabel: "12 人群",
      feishuId: "oc_sales_ops_group",
      matchLabel: "群聊可选",
      note: "适合同步关注区名单和动作节奏。",
    },
    {
      id: "close-group",
      name: "今日经营收口群",
      avatarLabel: "群",
      typeLabel: "群聊",
      identityLabel: "16 人群",
      feishuId: "oc_daily_close_group",
      matchLabel: "相关群聊",
      note: "老板抄送后可统一追进度。",
    },
    {
      id: "coord-group",
      name: "CEO办公室协同群",
      avatarLabel: "群",
      typeLabel: "群聊",
      identityLabel: "6 人群",
      feishuId: "oc_ceo_coord_group",
      matchLabel: "相关群聊",
      note: "适合沉淀发送记录和后续回执。",
    },
  ];
  const feishuOutput = `发送结果
- 陈峰：已送达，要求 12:00 前回执
- 刘敏：已送达，要求 17:00 前回执
- 会话线程：feishu-thread-ceo-dispatch-001
- 未回执自动提醒：已开启`;
  const partialText = `### 联系人已经确认，我现在直接发
- **陈峰** 对应管理序列负责人
- **刘敏** 对应销售序列负责人
- 我按刚才确认的收口口径分别发出去，并带上回执要求`;
  const finalText = `### 我已经发出去了
- 我先在飞书通讯录里确认了 **陈峰** 和 **刘敏** 两个负责人
- 然后按你刚才确定的收口口径分别发给了他们，并带了回执要求
- 管理序列要求 **12:00 前** 回执，销售序列要求 **17:00 前** 回执

### 我发出去的内容
陈峰，今天先把管理序列 6 个预警来源拆清楚，中午前回我，重点看执行脱节和跨部门协同卡点。

刘敏，今天把销售关注区名单拉出来，连续下滑和底线问题分开处理，下午 17:00 前把处理动作回我。`;

  return [
    {
      delayMs: 220,
      preview: "正在准备飞书代发，先确认要触达的负责人...",
      blocks: [
        createAssistantMessageBlock(
          messageId,
          [
            createThinkingBlock(
              thinkingId,
              `### 正在判断任务
- 用户已经确认要我代老板发消息
- 这一步先不重新讲盘面，而是先查飞书通讯录确认收件人
- 找到陈峰和刘敏后，再按上一轮确定的收口口径发出去`,
              true,
            ),
          ],
          true,
        ),
      ],
    },
    {
      delayMs: 760,
      preview: "正在查询飞书通讯录，确认管理和销售负责人的单聊身份...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 处理步骤
1. 先调用 \`feishu_contact_lookup\` 查询通讯录
2. 锁定陈峰和刘敏两个负责人
3. 再调用 \`feishu_send_message\` 分别发到飞书单聊`,
          ),
          createToolUseBlock({
            id: contactToolId,
            name: "feishu_contact_lookup",
            displayName: "feishu_contact_lookup",
            purpose: "查询管理和销售负责人的飞书通讯录信息",
            status: "running",
          }),
        ]),
      ],
    },
    {
      delayMs: 860,
      preview: "通讯录联系人已经确认，正在把收口要求发给管理和销售负责人...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 联系人已确认
- 陈峰对应管理序列负责人
- 刘敏对应销售序列负责人
- 现在按上一轮确认的收口要求分别发出`,
          ),
          createToolUseBlock({
            id: contactToolId,
            name: "feishu_contact_lookup",
            displayName: "feishu_contact_lookup",
            purpose: "查询管理和销售负责人的飞书通讯录信息",
            status: "success",
            contactResults,
          }),
          createToolUseBlock({
            id: feishuToolId,
            name: "feishu_send_message",
            displayName: "feishu_send_message",
            purpose: "把管理和销售的收口要求发到对应负责人的飞书单聊",
            status: "running",
          }),
          createTextBlock(finalTextId, partialText, { isStreaming: true }),
        ]),
      ],
      panel: runningPanel,
      artifacts: finalArtifacts,
    },
    {
      delayMs: 980,
      preview: "我已经把管理和销售今天要收口的内容通过飞书发给负责人了。",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 本轮总结
- 已先完成飞书通讯录匹配
- 发送记录和消息正文都保存在右侧面板里
- 后面如果要加抄送或改单独强化，可以直接继续追问`,
          ),
          createToolUseBlock({
            id: contactToolId,
            name: "feishu_contact_lookup",
            displayName: "feishu_contact_lookup",
            purpose: "查询管理和销售负责人的飞书通讯录信息",
            status: "success",
            contactResults,
          }),
          createToolUseBlock({
            id: feishuToolId,
            name: "feishu_send_message",
            displayName: "feishu_send_message",
            purpose: "把管理和销售的收口要求发到对应负责人的飞书单聊",
            status: "success",
            output: feishuOutput,
          }),
          createTextBlock(finalTextId, finalText),
        ]),
      ],
      panel: successPanel,
      artifacts: finalArtifacts,
      results: buildFeishuDispatchResults(sessionId),
      followupSuggestions: CEO_FEISHU_DISPATCH_FOLLOWUPS,
    },
  ];
};

const buildFeishuDispatchPlanningFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const thinkingId = `${sessionId}-thinking`;
  const overviewToolId = `${sessionId}-sequence-overview`;
  const digestToolId = `${sessionId}-alert-digest`;
  const finalTextId = `${sessionId}-final`;
  const overviewOutput = {
    focus_sequences: [
      { name: "管理序列", avg_score: 74.8, alerts: 6, trend: "-1.3" },
      { name: "销售序列", avg_score: 71.4, alerts: 5, trend: "-0.9" },
    ],
  };
  const digestOutput = {
    action_drafts: [
      {
        owner: "陈峰",
        sequence: "管理序列",
        action: "中午前拆清 6 个预警来源",
        focus: "执行脱节、跨部门协同卡点",
      },
      {
        owner: "刘敏",
        sequence: "销售序列",
        action: "17:00 前回传关注区名单和处理动作",
        focus: "连续下滑、底线问题分开处理",
      },
    ],
  };
  const partialText = `### 这两条线今天都得收口
- **管理序列**先拆 6 个预警来源，不要先泛化成执行力问题。
- **销售序列**先拉关注区名单，再把连续下滑和底线问题分开处理。`;
  const finalText = `### 我建议你今天这样收口

#### 先抓管理序列
- 让负责人今天中午前把 **6 个预警来源**拆清楚，先分成“执行脱节”和“跨部门协同卡点”两类。
- 这一步先要来源，不急着追责任，先把组织问题和个体问题分开。

#### 再抓销售序列
- 让负责人今天 **17:00 前** 把关注区名单和处理动作一起回上来。
- 连续下滑的人先拆过程问题，触碰底线的人先处理权限和约谈，不要混成一锅。

#### 你今天一句话就够
质量和生产继续稳住，管理先拆预警来源，销售先拉关注区名单，今天必须把动作收回来。

如果你要，我下一句就可以按这套口径直接发给两个负责人。`;

  return [
    {
      delayMs: 220,
      preview: "正在判断管理和销售两条线今天各自该怎么收口...",
      blocks: [
        createAssistantMessageBlock(
          messageId,
          [
            createThinkingBlock(
              thinkingId,
              `### 正在判断任务
- 这不是直接发消息，而是先判断今天该怎么推进
- 核心是把管理和销售两条线的收口动作先拆清楚
- 如果老板确认要代发，我再进入飞书通讯录和发送动作`,
              true,
            ),
          ],
          true,
        ),
      ],
    },
    {
      delayMs: 760,
      preview: "先看管理和销售两条线的盘面，再提炼今天的收口动作...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 处理步骤
1. 用 \`sequence_overview\` 看管理和销售当前盘面
2. 用 \`alert_digest\` 提炼今天必须收口的动作
3. 先给老板一版可直接下指令的推进口径`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "聚焦管理和销售两条线的评分、预警和趋势",
            status: "running",
          }),
        ]),
      ],
    },
    {
      delayMs: 860,
      preview: "今天的收口动作已经提炼出来了，正在整理成老板可直接复述的推进口径...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 已锁定收口方向
- 管理序列重点是预警来源拆解
- 销售序列重点是关注区名单和动作回传
- 我先把它们整理成老板今天可以直接下指令的口径`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "聚焦管理和销售两条线的评分、预警和趋势",
            status: "success",
            output: prettyJson(overviewOutput),
          }),
          createToolUseBlock({
            id: digestToolId,
            name: "alert_digest",
            displayName: "alert_digest",
            purpose: "提炼管理和销售两条线今天的收口动作",
            status: "success",
            output: prettyJson(digestOutput),
          }),
          createTextBlock(finalTextId, partialText, { isStreaming: true }),
        ]),
      ],
    },
    {
      delayMs: 980,
      preview: "管理和销售今天的收口动作我已经拆好了。",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 本轮总结
- 已经先把今天的推进动作拆清楚
- 这一轮先给老板经营判断和动作顺序
- 如果老板要代发，再进入飞书通讯录和发送链路`,
          ),
          createToolUseBlock({
            id: overviewToolId,
            name: "sequence_overview",
            displayName: "sequence_overview",
            purpose: "聚焦管理和销售两条线的评分、预警和趋势",
            status: "success",
            output: prettyJson(overviewOutput),
          }),
          createToolUseBlock({
            id: digestToolId,
            name: "alert_digest",
            displayName: "alert_digest",
            purpose: "提炼管理和销售两条线今天的收口动作",
            status: "success",
            output: prettyJson(digestOutput),
          }),
          createTextBlock(finalTextId, finalText),
        ]),
      ],
      followupSuggestions: CEO_FEISHU_ENTRY_FOLLOWUPS,
    },
  ];
};

const buildFeishuManagementFocusFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const thinkingId = `${sessionId}-thinking`;
  const contactToolId = `${sessionId}-feishu-contact-lookup`;
  const feishuToolId = `${sessionId}-feishu-send`;
  const finalTextId = `${sessionId}-final`;
  const finalArtifacts = buildFeishuDispatchArtifacts(sessionId, "managementFocus");
  const runningPanel = createDispatchExecutionPanelState(sessionId, "running", "managementFocus");
  const successPanel = createDispatchExecutionPanelState(sessionId, "success", "managementFocus");
  const contactResults: ScenarioContactLookupItem[] = [
    {
      id: "chenfeng-person",
      name: "陈峰",
      avatarLabel: "陈",
      typeLabel: "个人",
      identityLabel: "管理序列负责人",
      feishuId: "chenfeng.ops",
      matchLabel: "精确命中",
      note: "本轮强化提醒的唯一主发送对象。",
    },
    {
      id: "wangyan-person",
      name: "王岩",
      avatarLabel: "王",
      typeLabel: "个人",
      identityLabel: "COO",
      feishuId: "wangyan.coo",
      matchLabel: "可抄送",
      note: "如果中午前未回执，可追加同步。",
    },
    {
      id: "sunjie-person",
      name: "孙捷",
      avatarLabel: "孙",
      typeLabel: "个人",
      identityLabel: "经营分析BP",
      feishuId: "sunjie.bp",
      matchLabel: "相关联系人",
      note: "需要拆解预警来源时可同步。",
    },
    {
      id: "management-group",
      name: "管理序列负责人群",
      avatarLabel: "群",
      typeLabel: "群聊",
      identityLabel: "9 人群",
      feishuId: "oc_mgmt_line_group",
      matchLabel: "群聊可选",
      note: "适合升级为群内协同提醒。",
    },
    {
      id: "coord-group",
      name: "CEO办公室协同群",
      avatarLabel: "群",
      typeLabel: "群聊",
      identityLabel: "6 人群",
      feishuId: "oc_ceo_coord_group",
      matchLabel: "相关群聊",
      note: "适合同步发送记录和回执。",
    },
    {
      id: "risk-group",
      name: "组织协同预警群",
      avatarLabel: "群",
      typeLabel: "群聊",
      identityLabel: "11 人群",
      feishuId: "oc_org_risk_group",
      matchLabel: "相关群聊",
      note: "跨部门协同问题升级时可直接切群发送。",
    },
  ];
  const feishuOutput = `发送结果
- 陈峰：已送达，要求 12:00 前回执
- 15:00 未回执自动提醒：已开启
- 会话线程：feishu-thread-ceo-management-001`;
  const partialText = `### 我先把管理序列这段单独重写
- 只发给陈峰
- 语气更直接
- 补上中午前回执要求`;
  const finalText = `### 管理序列这段我已经单独重发了
- 接收人只有 **陈峰（管理序列负责人）**
- 语气已经加重，明确要求 **今天中午 12:00 前** 回我
- 如果没回执，我会在 **15:00** 自动再提醒一次

### 重写后的飞书内容
陈峰，今天先把管理序列 6 个预警来源拆清楚，中午 12 点前直接回我。

这次不是泛泛复盘，要把两件事说明白：
1. 哪些问题属于执行脱节；
2. 哪些问题属于跨部门协同卡点。

如果中午前没有回执，下午 15:00 我会再追一次。`;

  return [
    {
      delayMs: 240,
      preview: "正在把管理序列这段改成更强提醒版本...",
      blocks: [
        createAssistantMessageBlock(
          messageId,
          [
            createThinkingBlock(
              thinkingId,
              `### 正在重写消息
- 这次只保留管理序列
- 语气要更直接
- 还要先确认陈峰的飞书单聊身份`,
              true,
            ),
          ],
          true,
        ),
      ],
    },
    {
      delayMs: 700,
      preview: "正在查询管理序列负责人的飞书通讯录信息...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 处理步骤
1. 先调用 \`feishu_contact_lookup\` 确认陈峰的飞书身份
2. 再把管理序列这段重写成更强提醒版本
3. 最后调用 \`feishu_send_message\` 发到飞书单聊`,
          ),
          createToolUseBlock({
            id: contactToolId,
            name: "feishu_contact_lookup",
            displayName: "feishu_contact_lookup",
            purpose: "查询管理序列负责人的飞书通讯录信息",
            status: "running",
          }),
        ]),
      ],
    },
    {
      delayMs: 820,
      preview: "已确认管理序列负责人的飞书身份，正在发送强化提醒...",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 已锁定发送策略
- 只发管理序列负责人陈峰
- 强化执行脱节和协同卡点两个重点
- 中午前没回执就自动再提醒`,
          ),
          createToolUseBlock({
            id: contactToolId,
            name: "feishu_contact_lookup",
            displayName: "feishu_contact_lookup",
            purpose: "查询管理序列负责人的飞书通讯录信息",
            status: "success",
            contactResults,
          }),
          createToolUseBlock({
            id: feishuToolId,
            name: "feishu_send_message",
            displayName: "feishu_send_message",
            purpose: "把强化版管理提醒发到飞书单聊",
            status: "running",
          }),
          createTextBlock(finalTextId, partialText, { isStreaming: true }),
        ]),
      ],
      panel: runningPanel,
      artifacts: finalArtifacts,
    },
    {
      delayMs: 960,
      preview: "管理序列负责人的强化提醒已经通过飞书发出。",
      blocks: [
        createAssistantMessageBlock(messageId, [
          createThinkingBlock(
            thinkingId,
            `### 本轮总结
- 已完成飞书通讯录匹配
- 管理序列消息已单独强化
- 飞书已发出
- 中午前不回执会自动再提醒`,
          ),
          createToolUseBlock({
            id: contactToolId,
            name: "feishu_contact_lookup",
            displayName: "feishu_contact_lookup",
            purpose: "查询管理序列负责人的飞书通讯录信息",
            status: "success",
            contactResults,
          }),
          createToolUseBlock({
            id: feishuToolId,
            name: "feishu_send_message",
            displayName: "feishu_send_message",
            purpose: "把强化版管理提醒发到飞书单聊",
            status: "success",
            output: feishuOutput,
          }),
          createTextBlock(finalTextId, finalText),
        ]),
      ],
      panel: successPanel,
      artifacts: finalArtifacts,
      results: buildFeishuManagementFocusResults(sessionId),
      followupSuggestions: CEO_FEISHU_MANAGEMENT_FOLLOWUPS,
    },
  ];
};

const buildLiveBroadcastArtifacts = (
  sessionId: string,
  scenario: (typeof LIVE_BROADCAST_SKILL_DEMOS)[number],
): ArtifactItem[] =>
  buildArtifactGroup(
    createMarkdownArtifact(
      sessionId,
      `${scenario.id}-artifact`,
      scenario.artifactFileName,
      LIVE_BROADCAST_AGENT_DEMO.name,
      scenario.artifactTaskName,
      scenario.responseMarkdown,
      "刚刚",
      scenario.artifactSize,
    ),
  );

const buildLiveBroadcastFrames = (
  sessionId: string,
  scenario: (typeof LIVE_BROADCAST_SKILL_DEMOS)[number],
): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const toolBlocks = scenario.toolSteps.map((step, index) =>
    createToolUseBlock({
      id: `${messageId}-tool-${index + 1}`,
      name: step.name,
      displayName: step.displayName,
      purpose: step.purpose,
      status: "completed",
      output: step.output,
    }),
  );
  const artifacts = buildLiveBroadcastArtifacts(sessionId, scenario);

  return [
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking, true)],
      scenario.preview,
      880,
    ),
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking), ...toolBlocks],
      scenario.preview,
      960,
    ),
    buildScenarioMessageFrame(
      messageId,
      [
        createThinkingBlock(`${messageId}-thinking`, scenario.thinking),
        ...toolBlocks,
        createTextBlock(`${messageId}-final`, scenario.responseMarkdown),
      ],
      scenario.preview,
      estimateTypewriterDelay(scenario.responseMarkdown),
      artifacts,
    ),
  ];
};

const buildEcommerceAutomationArtifacts = (
  sessionId: string,
  scenario: (typeof ECOMMERCE_AUTOMATION_SKILL_DEMOS)[number],
): ArtifactItem[] =>
  buildArtifactGroup(
    createMarkdownArtifact(
      sessionId,
      `${scenario.id}-artifact`,
      scenario.artifactFileName,
      ECOMMERCE_AUTOMATION_AGENT_DEMO.name,
      scenario.artifactTaskName,
      scenario.responseMarkdown,
      "刚刚",
      scenario.artifactSize,
    ),
  );

const buildEcommerceAutomationFrames = (
  sessionId: string,
  scenario: (typeof ECOMMERCE_AUTOMATION_SKILL_DEMOS)[number],
): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const toolBlocks = scenario.toolSteps.map((step, index) =>
    createToolUseBlock({
      id: `${messageId}-tool-${index + 1}`,
      name: step.name,
      displayName: step.displayName,
      purpose: step.purpose,
      status: "completed",
      output: step.output,
    }),
  );
  const artifacts = buildEcommerceAutomationArtifacts(sessionId, scenario);

  return [
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking, true)],
      scenario.preview,
      880,
    ),
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking), ...toolBlocks],
      scenario.preview,
      960,
    ),
    buildScenarioMessageFrame(
      messageId,
      [
        createThinkingBlock(`${messageId}-thinking`, scenario.thinking),
        ...toolBlocks,
        createTextBlock(`${messageId}-final`, scenario.responseMarkdown),
      ],
      scenario.preview,
      estimateTypewriterDelay(scenario.responseMarkdown),
      artifacts,
    ),
  ];
};

const buildXiaocanMamaIpArtifacts = (
  sessionId: string,
  scenario: (typeof XIAOCANMAMA_IP_SKILL_DEMOS)[number],
): ArtifactItem[] =>
  buildArtifactGroup(
    createMarkdownArtifact(
      sessionId,
      `${scenario.id}-artifact`,
      scenario.artifactFileName,
      XIAOCANMAMA_IP_AGENT_DEMO.name,
      scenario.artifactTaskName,
      scenario.responseMarkdown,
      "刚刚",
      scenario.artifactSize,
    ),
  );

const buildXiaocanMamaIpFrames = (
  sessionId: string,
  scenario: (typeof XIAOCANMAMA_IP_SKILL_DEMOS)[number],
): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const toolBlocks = scenario.toolSteps.map((step, index) =>
    createToolUseBlock({
      id: `${messageId}-tool-${index + 1}`,
      name: step.name,
      displayName: step.displayName,
      purpose: step.purpose,
      status: "completed",
      output: step.output,
    }),
  );
  const artifacts = buildXiaocanMamaIpArtifacts(sessionId, scenario);

  return [
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking, true)],
      scenario.preview,
      880,
    ),
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, scenario.thinking), ...toolBlocks],
      scenario.preview,
      960,
    ),
    buildScenarioMessageFrame(
      messageId,
      [
        createThinkingBlock(`${messageId}-thinking`, scenario.thinking),
        ...toolBlocks,
        createTextBlock(`${messageId}-final`, scenario.responseMarkdown),
      ],
      scenario.preview,
      estimateTypewriterDelay(scenario.responseMarkdown),
      artifacts,
    ),
  ];
};

const buildProductManagerArtifacts = (
  sessionId: string,
  mode: "prd" | "backlog",
): ArtifactItem[] => {
  const prdArtifacts = buildArtifactGroup(
    createMarkdownArtifact(
      sessionId,
      "product-manager-prd",
      PRODUCT_MANAGER_PRD_DOCUMENT_NAME,
      "产品经理AI专家",
      "PRD 总览生成",
      PRODUCT_MANAGER_PRD_DOCUMENT_CONTENT,
      "2026-04-08 10:42",
      resolveTextArtifactSize(PRODUCT_MANAGER_PRD_DOCUMENT_CONTENT),
    ),
    createMarkdownArtifact(
      sessionId,
      "product-manager-workspace-prd",
      PRODUCT_MANAGER_WORKSPACE_PRD_DOCUMENT_NAME,
      "产品经理AI专家",
      "工作台 PRD 拆分",
      PRODUCT_MANAGER_WORKSPACE_PRD_DOCUMENT_CONTENT,
      "2026-04-08 10:43",
      resolveTextArtifactSize(PRODUCT_MANAGER_WORKSPACE_PRD_DOCUMENT_CONTENT),
    ),
    createMarkdownArtifact(
      sessionId,
      "product-manager-admin-prd",
      PRODUCT_MANAGER_ADMIN_PRD_DOCUMENT_NAME,
      "产品经理AI专家",
      "企业管理后台 PRD 拆分",
      PRODUCT_MANAGER_ADMIN_PRD_DOCUMENT_CONTENT,
      "2026-04-08 10:44",
      resolveTextArtifactSize(PRODUCT_MANAGER_ADMIN_PRD_DOCUMENT_CONTENT),
    ),
    createMarkdownArtifact(
      sessionId,
      "product-manager-fde-delivery-prd",
      PRODUCT_MANAGER_FDE_DELIVERY_PRD_DOCUMENT_NAME,
      "产品经理AI专家",
      "FDE配置交付 PRD 拆分",
      PRODUCT_MANAGER_FDE_DELIVERY_PRD_DOCUMENT_CONTENT,
      "2026-04-08 10:45",
      resolveTextArtifactSize(PRODUCT_MANAGER_FDE_DELIVERY_PRD_DOCUMENT_CONTENT),
    ),
  );

  if (mode === "backlog") {
    return buildArtifactGroup(
      ...prdArtifacts,
      createMarkdownArtifact(
        sessionId,
        "product-manager-backlog",
        PRODUCT_MANAGER_BACKLOG_DOCUMENT_NAME,
        "产品经理AI专家",
        "Backlog 拆解",
        PRODUCT_MANAGER_BACKLOG_DOCUMENT_CONTENT,
        "2026-04-08 10:46",
        resolveTextArtifactSize(PRODUCT_MANAGER_BACKLOG_DOCUMENT_CONTENT),
      ),
    );
  }

  return prdArtifacts;
};

const buildProductManagerFrames = (
  sessionId: string,
  mode: "prd" | "backlog",
): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const artifacts = buildProductManagerArtifacts(sessionId, mode);

  if (mode === "backlog") {
    const thinking =
      "我会沿着刚才的 PRD 继续往下拆，把用户工作台、企业管理后台和 FDE 三段范围拆成 Epic、Feature 和 User Story。";
    const responseMarkdown = `我已把这版需求继续拆成《Frontis AI · Product Backlog》，现在右侧成果面板里会同时看到总览 PRD、3 份拆分 PRD 和 Backlog 这 5 份真实文档。

这版 Backlog 先收口了 3 件事：
1. 把工作台里的产品经理专家、默认 Agent 和模拟对话放到同一条交付链路里。
2. 把企业后台设备分配、激活码和默认 Agent 触发关系拆成明确故事。
3. 把 FDE 看板收口和版本管理独立 Agent 的约束同步到执行层。

如果你要继续推进，我下一步建议直接补两项：
- 把 P0 / P1 再细化成迭代里程碑；
- 把每条 Story 的验收口径补完整。`;
    const toolBlocks = [
      createToolUseBlock({
        id: `${messageId}-tool-1`,
        name: "backlog_breakdown",
        displayName: "Backlog 拆解",
        purpose: "按 Epic / Feature / User Story 拆分执行项",
        status: "completed",
        output: prettyJson({
          epics: 3,
          p0Items: 2,
          p1Items: 3,
          output: "Frontis AI · Product Backlog.md",
        }),
      }),
      createToolUseBlock({
        id: `${messageId}-tool-2`,
        name: "milestone_plan",
        displayName: "里程碑规划",
        purpose: "补充后续排期与验收建议",
        status: "completed",
        output:
          "建议先打通产品经理专家与真实 PRD/Backlog 文档链路，再补企业后台与 FDE 端联动说明。",
      }),
    ];

    return [
      buildScenarioMessageFrame(
        messageId,
        [createThinkingBlock(`${messageId}-thinking`, thinking, true)],
        "正在把 PRD 继续拆成 Product Backlog。",
        860,
      ),
      buildScenarioMessageFrame(
        messageId,
        [createThinkingBlock(`${messageId}-thinking`, thinking), ...toolBlocks],
        "Backlog 的 Epic、Feature 和 User Story 已整理完成。",
        920,
      ),
      buildScenarioMessageFrame(
        messageId,
        [
          createThinkingBlock(`${messageId}-thinking`, thinking),
          ...toolBlocks,
          createTextBlock(`${messageId}-final`, responseMarkdown),
        ],
        "Backlog 已生成，可继续补里程碑和验收口径。",
        estimateTypewriterDelay(responseMarkdown),
        artifacts,
        undefined,
        undefined,
        PRODUCT_MANAGER_BACKLOG_FOLLOWUPS,
      ),
    ];
  }

  const thinking =
    "我先把目标、用户角色、核心范围和本期边界收清楚，再按用户工作台、企业后台、FDE 三段结构输出正式 PRD 草案。";
  const responseMarkdown = `我已经生成一版《Frontis AI · 正式 PRD》草案，并把核心结构先收好了。

这版 PRD 当前覆盖：
1. 产品目标、角色和跨系统关系。
2. 用户工作台、企业管理后台、FDE 业务管理三段范围。
3. 默认 Agent、激活码、版本管理等最近几轮调整。

右侧成果面板里已经放入仓库里的总览 PRD 和按工作台、企业管理后台、FDE配置交付拆分的 3 份子 PRD；如果你继续往下推进，我建议下一步直接拆 Product Backlog，把 Epic、Feature 和 User Story 一次补齐。`;
  const toolBlocks = [
    createToolUseBlock({
      id: `${messageId}-tool-1`,
      name: "requirements_summary",
      displayName: "需求摘要",
      purpose: "收敛目标、角色和范围边界",
      status: "completed",
      output: prettyJson({
        modules: ["用户工作台", "企业管理后台", "FDE 业务管理"],
        latestAdjustments: ["默认 Agent", "激活码规则", "版本管理收口"],
      }),
    }),
    createToolUseBlock({
      id: `${messageId}-tool-2`,
      name: "prd_generate",
      displayName: "PRD 生成",
      purpose: "生成正式 PRD 草案文档",
      status: "completed",
      output:
        "已输出仓库里的《Frontis AI · 正式 PRD》及 3 份拆分 PRD 文件，并同步最近几轮需求调整。",
    }),
  ];

  return [
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, thinking, true)],
      "正在整理需求背景并生成 PRD 草案。",
      860,
    ),
    buildScenarioMessageFrame(
      messageId,
      [createThinkingBlock(`${messageId}-thinking`, thinking), ...toolBlocks],
      "PRD 的目标、范围和边界已整理完成。",
      920,
    ),
    buildScenarioMessageFrame(
      messageId,
      [
        createThinkingBlock(`${messageId}-thinking`, thinking),
        ...toolBlocks,
        createTextBlock(`${messageId}-final`, responseMarkdown),
      ],
      "PRD 已生成，可继续拆成 Product Backlog。",
      estimateTypewriterDelay(responseMarkdown),
      artifacts,
      undefined,
      undefined,
      PRODUCT_MANAGER_PRD_FOLLOWUPS,
    ),
  ];
};

const PRODUCT_TEAM_COLLAB_DELIVERY_DOCUMENT_CONTENT = `# 产研协作专家团 · 协同交付方案

## 需求目标
在 Frontis AI 工作台上线一条“产研协作专家团”首版体验，让用户发出需求后，能连续看到主专家理解任务、成员专家按顺序处理、最终统一交付的完整协作链路。

## 首期范围
1. 会话入口
- 专家团卡片默认挂一条历史演示会话。
- 首页第一个预置问题直接触发这条协作脚本。
- 第一条猜你想问继续进入第二轮风险复核。

2. 主专家编排
- 默认由 ${PRODUCT_TEAM_MAIN_AGENT_NAME}接住用户需求。
- 主专家先输出任务理解、模块拆解和交付口径，再通过技能调用拉起成员专家。

3. 成员专家执行
- 架构规划师：拆系统边界、依赖关系和高风险耦合点。
- 增长实验官：收首问触发、续问承接和关键转化节点。
- 交付验收官：整理验收口径、回归范围和上线门槛。
- 数据洞察师：产出埋点与灰度观察指标。
- 用户访谈官：判断用户是否能真实感知到“多人协作完成任务”。

4. 结果交付
- 主专家统一汇总模块、边界、依赖、首期范围和后续建议。
- 右侧成果面板沉淀协同方案、架构边界表和埋点草案。

## 模块拆分
### 模块 A：入口与触发
- 包含专家团卡片、默认历史会话、首页首问、第一条猜你想问。
- 目标是让用户一进来就能找到“怎么开始”和“怎么继续问”。

### 模块 B：主专家调度
- 负责需求摘要、任务分工、调度成员和最终汇总。
- 不直接暴露成员切换，不开放输入框艾特。

### 模块 C：成员执行
- 成员专家以独立消息进入会话流。
- 每位成员可以继续调用自己的技能，并输出结构化结论。

### 模块 D：成果沉淀
- 会话里展示过程，右侧展示文档产物。
- 产物首期以 Markdown / JSON 为主，不做真实外部系统落库。

## 首期不做
- 不开放用户在输入框中自由 @ 成员专家。
- 不做成员之间跨轮对话记忆共享。
- 不做真实任务系统、真实飞书流转和权限控制。
`;

const PRODUCT_TEAM_ARCHITECTURE_DOCUMENT_CONTENT = `# 产研协作专家团 · 架构边界与依赖表

## 一、四层结构
1. 入口层
- 专家团卡片
- 默认历史演示会话
- 首页预置问题 / 猜你想问

2. 编排层
- 主专家消息流
- 成员调度技能
- 多消息回放与更新

3. 执行层
- 成员专家独立消息
- 成员技能调用
- 成员产物输出

4. 交付层
- 主专家统一总结
- 右侧成果面板

## 二、关键边界
- 用户始终只和专家团对话，不直接切换到成员私聊上下文。
- 成员专家只能通过主专家调度进入会话，不能主动抢答。
- 最终对外口径只从主专家发出，成员专家只负责过程判断和局部产物。

## 三、关键依赖
- expertTeam 成员配置与 skills 映射
- DialogueScenario 的首问 / 续问映射
- 多 assistant 消息回放能力
- 工具块头像与成员身份展示
- artifact 面板的文件展示能力

## 四、最容易耦合的位置
- followup 文案与 trigger question
- 成员 skills 与 tool display name
- 主专家汇总时机与成员完成状态
- artifact 出现时机与最终总结时机
`;

const PRODUCT_TEAM_METRICS_DOCUMENT_CONTENT = prettyJson({
  objective: "验证用户是否真正感知到专家团协作，并愿意继续追问",
  events: [
    {
      event: "team_entry_prompt_click",
      meaning: "首页第一个预置问题被点击",
      owner: "增长实验官",
    },
    {
      event: "team_member_message_exposed",
      meaning: "成员专家消息进入首屏可视区域",
      owner: "数据洞察师",
    },
    {
      event: "team_artifact_opened",
      meaning: "右侧成果文件被打开",
      owner: "数据洞察师",
    },
    {
      event: "team_followup_click",
      meaning: "第一条猜你想问被点击",
      owner: "增长实验官",
    },
    {
      event: "team_session_continue",
      meaning: "用户继续追问第二轮问题",
      owner: "产品策略官",
    },
  ],
  dashboards: ["入口触发漏斗", "成员消息曝光率", "成果文件打开率", "续问点击率"],
  alertRules: [
    "首问触发正常但成员消息曝光率低于 60%，优先排查消息时序和布局遮挡",
    "成员消息曝光率正常但续问点击率低于 20%，优先排查成员结论可信度和总结收口",
    "成果文件打开率低于 15%，优先排查文件命名和主专家收口话术",
  ],
});

const PRODUCT_TEAM_ACCEPTANCE_DOCUMENT_CONTENT = `# 产研协作专家团 · 上线前验收与回归清单

## 一、入口链路
- 首页专家团卡片可打开默认历史演示会话
- 首页第一个预置问题可稳定触发首轮协作脚本
- 第一条猜你想问可稳定进入风险复核轮

## 二、协作链路
- 主专家第一条消息只做任务理解、范围确认和任务分发
- 任务分发 skill 展示被分配成员头像
- 被分配成员以独立消息进入会话
- 成员消息里继续展示各自技能执行和阶段性结果

## 三、结果链路
- 成员专家生成的文档可在会话中直接点开
- 右侧结果面板可查看协作台账、架构评审、验收清单和灰度观察记录
- 最终由主专家统一汇总模块、边界、依赖、风险与建议

## 四、最小回归矩阵
1. 首问点击 -> 历史脚本首轮播放完整
2. 主专家任务分发 -> 5 位成员全部出现
3. 成员执行 -> 每位成员至少有 1 条技能结果或成果文件
4. 最终汇总 -> 主专家在成员完成后再交付
5. 继续追问 -> 风险轮可进入并生成风险清单
`;

const PRODUCT_TEAM_USER_RESEARCH_DOCUMENT_CONTENT = `# 产研协作专家团 · 用户感知复核纪要

## 用户会用什么标准判断这是不是“多人协作”
1. 主专家有没有明确说清楚“谁在做什么”
2. 不同成员专家是不是各自处理不同问题
3. 成员是不是产出了不同类型的结果，而不是重复说同一件事
4. 最后是否由主专家统一收口并交付

## 首期最容易失真的地方
- 主专家一上来就把最终结论说完
- 成员专家只有一句短句，没有过程结果
- 所有成员看起来都在做同一件事
- 聊天里有过程，但没有可打开的文档或面板

## 首期建议
- 先让成员消息里出现技能结果和文件产物
- 至少保留 1 个“右侧可查看”的结果面板
- 主专家最后明确引用成员产物，再统一给结论
`;

const PRODUCT_TEAM_RISK_DOCUMENT_CONTENT = `# 产研协作专家团 · 上线风险清单

## P0 风险
1. 路由断裂
- 首页第一个预置问题、第一条猜你想问、隐藏场景 trigger 任何一处不一致，第二轮就会直接掉出预期脚本。
- 规避动作：固定首问与首条续问文案，回归时逐字校验。

2. 时序失真
- 如果主专家提前收尾，或者成员专家没有以独立消息进入会话，用户会直接把这条链路理解成“一个人在演”。
- 规避动作：必须保证“主专家调度 -> 成员执行 -> 主专家汇总”三段顺序成立。

3. 技能映射错位
- 成员技能 id、工具块显示名称、首页配置不一致时，用户会看到人出来了，但能力对不上。
- 规避动作：统一以 Employee.skills 作为技能源，场景脚本只消费同一套 id。

## P1 风险
1. 产物缺失
- 如果聊天里只有过程没有成果文件，用户很难继续进入下一轮追问。
- 规避动作：首期至少保留协同方案、架构边界表、上线风险清单三份产物。

2. 灰度观察不足
- 上线后如果没有埋点，无法判断问题出在入口、成员执行还是最终汇总。
- 规避动作：灰度前接好入口触发、成员曝光、文件打开、续问点击四类事件。

## 上线门槛
- 首问能稳定触发完整专家团协作链路
- 第一条猜你想问能进入风险复核轮
- 成员专家以独立消息完成各自输出
- 主专家最终总结覆盖模块、边界、依赖、风险和后续建议
`;

const buildProductTeamArtifacts = (
  sessionId: string,
  mode: "delivery" | "risk",
): ArtifactItem[] => {
  const deliveryArtifact = createMarkdownArtifact(
    sessionId,
    "team-product-collab-delivery",
    "产研协作专家团协同交付方案.md",
    PRODUCT_TEAM_MAIN_AGENT_NAME,
    "协同交付方案",
    PRODUCT_TEAM_COLLAB_DELIVERY_DOCUMENT_CONTENT,
    "刚刚",
    resolveTextArtifactSize(PRODUCT_TEAM_COLLAB_DELIVERY_DOCUMENT_CONTENT),
  );
  const architectureArtifact = createMarkdownArtifact(
    sessionId,
    "team-product-architecture",
    "产研协作专家团架构边界与依赖表.md",
    "架构规划师",
    "架构边界梳理",
    PRODUCT_TEAM_ARCHITECTURE_DOCUMENT_CONTENT,
    "刚刚",
    resolveTextArtifactSize(PRODUCT_TEAM_ARCHITECTURE_DOCUMENT_CONTENT),
  );
  const metricsArtifact = createJsonArtifact(
    sessionId,
    "team-product-metrics",
    "产研协作专家团指标与埋点草案.json",
    "数据洞察师",
    "埋点与灰度观察",
    PRODUCT_TEAM_METRICS_DOCUMENT_CONTENT,
    "刚刚",
    resolveTextArtifactSize(PRODUCT_TEAM_METRICS_DOCUMENT_CONTENT),
  );
  const acceptanceArtifact = createMarkdownArtifact(
    sessionId,
    "team-product-acceptance",
    "产研协作专家团上线前验收与回归清单.md",
    "交付验收官",
    "上线前验收与回归",
    PRODUCT_TEAM_ACCEPTANCE_DOCUMENT_CONTENT,
    "刚刚",
    resolveTextArtifactSize(PRODUCT_TEAM_ACCEPTANCE_DOCUMENT_CONTENT),
  );
  const userResearchArtifact = createMarkdownArtifact(
    sessionId,
    "team-product-user-research",
    "产研协作专家团用户感知复核纪要.md",
    "用户访谈官",
    "用户感知复核",
    PRODUCT_TEAM_USER_RESEARCH_DOCUMENT_CONTENT,
    "刚刚",
    resolveTextArtifactSize(PRODUCT_TEAM_USER_RESEARCH_DOCUMENT_CONTENT),
  );

  if (mode === "risk") {
    return buildArtifactGroup(
      deliveryArtifact,
      architectureArtifact,
      acceptanceArtifact,
      metricsArtifact,
      userResearchArtifact,
      createMarkdownArtifact(
        sessionId,
        "team-product-collab-risk",
        "产研协作专家团上线风险清单.md",
        "交付验收官",
        "上线风险评估",
        PRODUCT_TEAM_RISK_DOCUMENT_CONTENT,
        "刚刚",
        resolveTextArtifactSize(PRODUCT_TEAM_RISK_DOCUMENT_CONTENT),
      ),
    );
  }

  return buildArtifactGroup(
    deliveryArtifact,
    architectureArtifact,
    acceptanceArtifact,
    metricsArtifact,
    userResearchArtifact,
  );
};

const buildProductTeamCollabResults = (
  sessionId: string,
): {
  overview: DialogueGeneratedResultItem;
  architect: DialogueGeneratedResultItem;
  growth: DialogueGeneratedResultItem;
  qa: DialogueGeneratedResultItem;
  data: DialogueGeneratedResultItem;
} => {
  const overviewRecipients: ScenarioDispatchRecipientSeed[] = [
    {
      id: "product-main",
      name: PRODUCT_TEAM_MAIN_AGENT_NAME,
      roleLabel: "主专家",
      channelLabel: "专家团主会话",
      statusLabel: "已汇总",
      summary: "负责拆解需求、分发任务并统一交付。",
      tone: "accent",
    },
    {
      id: "product-architect",
      name: "架构规划师",
      roleLabel: "系统边界",
      channelLabel: "成员执行流",
      statusLabel: "已回传",
      summary: "已完成四层边界、接口依赖和易耦合点梳理。",
      tone: "warning",
    },
    {
      id: "product-growth",
      name: "增长实验官",
      roleLabel: "首问转化",
      channelLabel: "成员执行流",
      statusLabel: "已回传",
      summary: "已收首问触发、成员曝光和续问承接三段漏斗。",
      tone: "positive",
    },
    {
      id: "product-qa",
      name: "交付验收官",
      roleLabel: "上线门槛",
      channelLabel: "成员执行流",
      statusLabel: "已回传",
      summary: "已落验收清单和最小回归矩阵。",
      tone: "danger",
    },
    {
      id: "product-data",
      name: "数据洞察师",
      roleLabel: "灰度观察",
      channelLabel: "成员执行流",
      statusLabel: "已回传",
      summary: "已补指标事件、异常判断和看板结构。",
      tone: "accent",
    },
  ];
  const overviewConversation: ScenarioDispatchConversationSeed[] = [
    {
      id: "product-collab-system-start",
      actorLabel: "系统",
      summary: "今天 11:08",
      direction: "system",
    },
    {
      id: "product-collab-main-outgoing",
      actorLabel: PRODUCT_TEAM_MAIN_AGENT_NAME,
      avatarLabel: "策",
      direction: "outgoing",
      timeLabel: "11:08",
      statusLabel: "已分发",
      summary:
        "这轮先按首期上线版本推进：我负责收范围和汇总，架构看边界，增长看转化，验收看上线门槛，数据看灰度观察。",
      detail: "专家团主会话 · 协同任务拆解",
    },
    {
      id: "product-collab-architect-incoming",
      actorLabel: "架构规划师",
      avatarLabel: "构",
      direction: "incoming",
      tagLabel: "四层边界",
      timeLabel: "11:10",
      summary:
        "我先锁入口层、编排层、执行层、交付层四层结构，重点盯 followup 路由和成员 skills 映射。",
    },
    {
      id: "product-collab-growth-incoming",
      actorLabel: "增长实验官",
      avatarLabel: "增",
      direction: "incoming",
      tagLabel: "首问转化",
      timeLabel: "11:11",
      summary: "我先看首问点击、成员曝光和第一条猜你想问的承接是否自然。",
    },
    {
      id: "product-collab-qa-incoming",
      actorLabel: "交付验收官",
      avatarLabel: "验",
      direction: "incoming",
      tagLabel: "上线验收",
      timeLabel: "11:12",
      summary: "我按真实上线标准补回归矩阵和门槛，不只看脚本能不能跑。",
    },
    {
      id: "product-collab-data-incoming",
      actorLabel: "数据洞察师",
      avatarLabel: "数",
      direction: "incoming",
      tagLabel: "灰度观察",
      timeLabel: "11:13",
      summary: "我把入口触发、成员曝光、文件打开和续问点击拆成观测漏斗。",
    },
    {
      id: "product-collab-main-summary",
      actorLabel: PRODUCT_TEAM_MAIN_AGENT_NAME,
      avatarLabel: "策",
      direction: "outgoing",
      timeLabel: "11:16",
      statusLabel: "已汇总",
      summary: "成员结果都已回齐，右侧可以直接查看协同台账、架构评审、验收清单和灰度观察记录。",
      detail: "专家团主会话 · 最终交付前台账",
    },
  ];

  return {
    overview: createScenarioDispatchResultItem({
      sessionId,
      suffix: "result-team-product-overview",
      title: "产研协作执行台账",
      subtitle: "主专家分工、成员回传与最终汇总记录",
      badge: "协同执行",
      panelSuffix: "panel-team-product-overview",
      skillName: "协同执行",
      status: "success",
      dispatchLabel: "主专家已完成分工，成员专家的关键结果与交付动作都已沉淀。",
      recipients: overviewRecipients,
      conversationItems: overviewConversation,
      actionItems: [
        "打开架构评审记录确认边界依赖",
        "打开验收清单复核上线门槛",
        "打开灰度观察记录确认首期监控口径",
      ],
    }),
    architect: createScenarioDispatchResultItem({
      sessionId,
      suffix: "result-team-product-architect",
      title: "架构边界评审记录",
      subtitle: "四层结构、依赖关系与易耦合点",
      badge: "架构评审",
      panelSuffix: "panel-team-product-architect",
      skillName: "架构规划",
      status: "success",
      dispatchLabel: "架构规划师已把入口、编排、执行、交付四层结构和高风险依赖点整理完成。",
      recipients: [
        {
          id: "product-architect",
          name: "架构规划师",
          roleLabel: "系统边界",
          channelLabel: "成员执行流",
          statusLabel: "已完成",
          summary: "已锁四层边界、3 个关键依赖和 3 个易耦合点。",
          tone: "warning",
        },
      ],
      conversationItems: [
        { id: "architect-system", actorLabel: "系统", summary: "今天 11:10", direction: "system" },
        {
          id: "architect-main-outgoing",
          actorLabel: PRODUCT_TEAM_MAIN_AGENT_NAME,
          avatarLabel: "策",
          direction: "outgoing",
          timeLabel: "11:10",
          statusLabel: "已送达",
          summary: "先帮我拆这条链路的模块边界、依赖和最容易耦合的位置，研发评审会直接用。",
          detail: "任务分发 · 架构规划",
        },
        {
          id: "architect-incoming-1",
          actorLabel: "架构规划师",
          avatarLabel: "构",
          direction: "incoming",
          tagLabel: "四层结构",
          timeLabel: "11:12",
          summary:
            "入口层只负责触发，会话编排层负责主专家与成员调度，执行层只放成员处理过程，交付层才允许对用户收口。",
        },
        {
          id: "architect-incoming-2",
          actorLabel: "架构规划师",
          avatarLabel: "构",
          direction: "incoming",
          tagLabel: "易耦合点",
          timeLabel: "11:13",
          summary:
            "最危险的是 followup 文案与 trigger 分离维护、成员 skills 与展示名不一致、多 assistant 消息更新覆盖。",
          detail: "已同步《产研协作专家团架构边界与依赖表.md》",
        },
      ],
      actionItems: ["锁定 followup 常量", "统一成员 skills 源", "回归多消息更新顺序"],
    }),
    growth: createScenarioDispatchResultItem({
      sessionId,
      suffix: "result-team-product-growth",
      title: "首问与续问策略记录",
      subtitle: "入口触发、成员曝光与继续追问设计",
      badge: "转化策略",
      panelSuffix: "panel-team-product-growth",
      skillName: "增长实验",
      status: "success",
      dispatchLabel: "增长实验官已把首期最关键的入口与续问承接策略收口。",
      recipients: [
        {
          id: "product-growth",
          name: "增长实验官",
          roleLabel: "首问转化",
          channelLabel: "成员执行流",
          statusLabel: "已完成",
          summary: "已锁首问、成员曝光、风险追问三段体验目标。",
          tone: "positive",
        },
      ],
      conversationItems: [
        { id: "growth-system", actorLabel: "系统", summary: "今天 11:11", direction: "system" },
        {
          id: "growth-main-outgoing",
          actorLabel: PRODUCT_TEAM_MAIN_AGENT_NAME,
          avatarLabel: "策",
          direction: "outgoing",
          timeLabel: "11:11",
          statusLabel: "已送达",
          summary: "把首问怎么进来、成员怎么被看到、为什么用户会继续问这三件事串起来。",
          detail: "任务分发 · 增长实验",
        },
        {
          id: "growth-incoming-1",
          actorLabel: "增长实验官",
          avatarLabel: "增",
          direction: "incoming",
          tagLabel: "入口触发",
          timeLabel: "11:12",
          summary:
            "首页第一个问题必须直指“拆模块、边界和依赖”，这样用户一眼知道专家团能接什么任务。",
        },
        {
          id: "growth-incoming-2",
          actorLabel: "增长实验官",
          avatarLabel: "增",
          direction: "incoming",
          tagLabel: "继续追问",
          timeLabel: "11:14",
          summary: `首轮看完后，最自然的下一问就是“${PRODUCT_TEAM_RISK_QUESTION}”，这条要固定成第一条猜你想问。`,
        },
      ],
      actionItems: ["固定首问文案", "固定第一条风险追问", "灰度时先看成员曝光率"],
    }),
    qa: createScenarioDispatchResultItem({
      sessionId,
      suffix: "result-team-product-qa",
      title: "上线验收与回归记录",
      subtitle: "最小门槛、回归矩阵与风险卡点",
      badge: "上线验收",
      panelSuffix: "panel-team-product-qa",
      skillName: "验收评审",
      status: "success",
      dispatchLabel: "交付验收官已沉淀上线前最小门槛和回归矩阵。",
      recipients: [
        {
          id: "product-qa",
          name: "交付验收官",
          roleLabel: "上线门槛",
          channelLabel: "成员执行流",
          statusLabel: "已完成",
          summary: "已补验收清单、回归矩阵和关键文件校验点。",
          tone: "danger",
        },
      ],
      conversationItems: [
        { id: "qa-system", actorLabel: "系统", summary: "今天 11:12", direction: "system" },
        {
          id: "qa-main-outgoing",
          actorLabel: PRODUCT_TEAM_MAIN_AGENT_NAME,
          avatarLabel: "策",
          direction: "outgoing",
          timeLabel: "11:12",
          statusLabel: "已送达",
          summary: "按真实上线前复核标准给我一版门槛和回归矩阵，别只验证脚本跑通。",
          detail: "任务分发 · 验收评审",
        },
        {
          id: "qa-incoming-1",
          actorLabel: "交付验收官",
          avatarLabel: "验",
          direction: "incoming",
          tagLabel: "最小门槛",
          timeLabel: "11:13",
          summary:
            "必须保证首问可触发、主专家先调度、成员独立执行、文件可打开、最终再汇总，这 5 段闭环都成立。",
        },
        {
          id: "qa-incoming-2",
          actorLabel: "交付验收官",
          avatarLabel: "验",
          direction: "incoming",
          tagLabel: "回归矩阵",
          timeLabel: "11:15",
          summary: "我已经把首问、成员执行、文件打开和风险追问整理进《上线前验收与回归清单》。",
          detail: "已同步《产研协作专家团上线前验收与回归清单.md》",
        },
      ],
      actionItems: ["上线前逐条回归 5 段闭环", "核对 artifact 打开链路", "确认风险轮仍可进入"],
    }),
    data: createScenarioDispatchResultItem({
      sessionId,
      suffix: "result-team-product-data",
      title: "灰度观察记录",
      subtitle: "埋点事件、异常组合与首期观察顺序",
      badge: "灰度观察",
      panelSuffix: "panel-team-product-data",
      skillName: "指标设计",
      status: "success",
      dispatchLabel: "数据洞察师已把首期最需要盯的埋点和异常组合整理完成。",
      recipients: [
        {
          id: "product-data",
          name: "数据洞察师",
          roleLabel: "灰度观察",
          channelLabel: "成员执行流",
          statusLabel: "已完成",
          summary: "已定义核心事件、看板结构和异常排查优先级。",
          tone: "accent",
        },
      ],
      conversationItems: [
        { id: "data-system", actorLabel: "系统", summary: "今天 11:13", direction: "system" },
        {
          id: "data-main-outgoing",
          actorLabel: PRODUCT_TEAM_MAIN_AGENT_NAME,
          avatarLabel: "策",
          direction: "outgoing",
          timeLabel: "11:13",
          statusLabel: "已送达",
          summary: "把首期真正能说明问题的事件和异常组合拆清楚，避免上线后只看到总量。",
          detail: "任务分发 · 指标设计",
        },
        {
          id: "data-incoming-1",
          actorLabel: "数据洞察师",
          avatarLabel: "数",
          direction: "incoming",
          tagLabel: "核心事件",
          timeLabel: "11:14",
          summary: "我保留 4 个核心事件：首问点击、成员消息曝光、文件打开、第一条猜你想问点击。",
        },
        {
          id: "data-incoming-2",
          actorLabel: "数据洞察师",
          avatarLabel: "数",
          direction: "incoming",
          tagLabel: "异常判断",
          timeLabel: "11:15",
          summary:
            "如果首问正常但成员曝光低，优先排查时序与布局；如果成员曝光正常但续问低，优先排查成员内容可信度。",
          detail: "已同步《产研协作专家团指标与埋点草案.json》",
        },
      ],
      actionItems: ["灰度先盯三段漏斗", "异常按入口/成员/续问三层定位", "文件打开率作为辅助信号"],
    }),
  };
};

const buildProductTeamRiskResults = (
  sessionId: string,
): {
  overview: DialogueGeneratedResultItem;
  architect: DialogueGeneratedResultItem;
  qa: DialogueGeneratedResultItem;
  data: DialogueGeneratedResultItem;
} => ({
  overview: createScenarioDispatchResultItem({
    sessionId,
    suffix: "result-team-product-risk-overview",
    title: "上线风险复核台账",
    subtitle: "P0 / P1 风险、回归矩阵与灰度观察结论",
    badge: "风险复核",
    panelSuffix: "panel-team-product-risk-overview",
    skillName: "风险评审",
    status: "success",
    dispatchLabel: "风险复核已完成，路由、时序、验收与灰度观察结论都已回齐。",
    recipients: [
      {
        id: "risk-architect",
        name: "架构规划师",
        roleLabel: "路由与时序",
        channelLabel: "风险复核流",
        statusLabel: "已完成",
        summary: "已锁 P0：路由断裂、时序失真、多消息覆盖。",
        tone: "danger",
      },
      {
        id: "risk-qa",
        name: "交付验收官",
        roleLabel: "上线门槛",
        channelLabel: "风险复核流",
        statusLabel: "已完成",
        summary: "已补上线前检查表和回归矩阵。",
        tone: "warning",
      },
      {
        id: "risk-data",
        name: "数据洞察师",
        roleLabel: "灰度信号",
        channelLabel: "风险复核流",
        statusLabel: "已完成",
        summary: "已补异常组合和观察优先级。",
        tone: "accent",
      },
    ],
    conversationItems: [
      {
        id: "risk-overview-system",
        actorLabel: "系统",
        summary: "今天 11:15",
        direction: "system",
      },
      {
        id: "risk-overview-main",
        actorLabel: PRODUCT_TEAM_MAIN_AGENT_NAME,
        avatarLabel: "策",
        direction: "outgoing",
        timeLabel: "11:15",
        statusLabel: "已分发",
        summary: "这轮只做风险复核，不重讲方案，分别看路由、上线门槛和灰度观察。",
        detail: "专家团主会话 · 风险复核",
      },
      {
        id: "risk-overview-architect",
        actorLabel: "架构规划师",
        avatarLabel: "构",
        direction: "incoming",
        tagLabel: "P0 风险",
        timeLabel: "11:17",
        summary: "最大问题还是路由断裂和主专家提前收尾，这两处一坏整条链路就不真实。",
      },
      {
        id: "risk-overview-qa",
        actorLabel: "交付验收官",
        avatarLabel: "验",
        direction: "incoming",
        tagLabel: "回归矩阵",
        timeLabel: "11:18",
        summary: "我已经把首问、成员、文件、风险追问四条链路放进上线前检查表。",
      },
      {
        id: "risk-overview-data",
        actorLabel: "数据洞察师",
        avatarLabel: "数",
        direction: "incoming",
        tagLabel: "灰度信号",
        timeLabel: "11:19",
        summary: "灰度时先看成员曝光和续问点击，不要只盯入口总点击。",
      },
    ],
    actionItems: ["逐字校验首问和风险追问", "逐条回归成员独立消息", "灰度前接齐关键事件"],
  }),
  architect: createScenarioDispatchResultItem({
    sessionId,
    suffix: "result-team-product-risk-architect",
    title: "路由与时序风险记录",
    subtitle: "P0 风险点与对应系统位置",
    badge: "路由风险",
    panelSuffix: "panel-team-product-risk-architect",
    skillName: "风险评审",
    status: "success",
    dispatchLabel: "架构规划师已锁定路由断裂、时序失真和多消息覆盖三类 P0 风险。",
    recipients: [
      {
        id: "risk-architect-only",
        name: "架构规划师",
        roleLabel: "路由与时序",
        channelLabel: "风险复核流",
        statusLabel: "已完成",
        summary: "风险集中在 trigger 映射、多消息更新和主专家收尾时机。",
        tone: "danger",
      },
    ],
    conversationItems: [
      {
        id: "risk-architect-system",
        actorLabel: "系统",
        summary: "今天 11:16",
        direction: "system",
      },
      {
        id: "risk-architect-main",
        actorLabel: PRODUCT_TEAM_MAIN_AGENT_NAME,
        avatarLabel: "策",
        direction: "outgoing",
        timeLabel: "11:16",
        statusLabel: "已送达",
        summary: "重点看会不会路由断裂、消息时序失真、主专家提前收尾。",
        detail: "任务分发 · 风险评审",
      },
      {
        id: "risk-architect-reply",
        actorLabel: "架构规划师",
        avatarLabel: "构",
        direction: "incoming",
        tagLabel: "P0",
        timeLabel: "11:17",
        summary:
          "最危险的是首问和第一条猜你想问文案漂移，以及成员消息没独立落进流里导致看起来像一人分段回复。",
      },
    ],
    actionItems: ["锁死 trigger question 常量", "回归主专家收尾时机", "验证多消息不互相覆盖"],
  }),
  qa: createScenarioDispatchResultItem({
    sessionId,
    suffix: "result-team-product-risk-qa",
    title: "上线前检查表",
    subtitle: "回归矩阵、门槛与复核顺序",
    badge: "检查表",
    panelSuffix: "panel-team-product-risk-qa",
    skillName: "回归规划",
    status: "success",
    dispatchLabel: "交付验收官已把风险轮需要复核的检查表沉淀完成。",
    recipients: [
      {
        id: "risk-qa-only",
        name: "交付验收官",
        roleLabel: "上线门槛",
        channelLabel: "风险复核流",
        statusLabel: "已完成",
        summary: "已沉淀上线前复核底稿和回归顺序。",
        tone: "warning",
      },
    ],
    conversationItems: [
      { id: "risk-qa-system", actorLabel: "系统", summary: "今天 11:17", direction: "system" },
      {
        id: "risk-qa-main",
        actorLabel: PRODUCT_TEAM_MAIN_AGENT_NAME,
        avatarLabel: "策",
        direction: "outgoing",
        timeLabel: "11:17",
        statusLabel: "已送达",
        summary: "按真实上线前检查来拉矩阵，尤其别漏掉成员独立消息和文件打开。",
        detail: "任务分发 · 回归规划",
      },
      {
        id: "risk-qa-reply",
        actorLabel: "交付验收官",
        avatarLabel: "验",
        direction: "incoming",
        tagLabel: "检查表",
        timeLabel: "11:18",
        summary:
          "我已经把首问触发、成员执行、文件可开、风险追问这四段放进检查表，能直接拿去做上线前复核。",
        detail: "已同步《产研协作专家团上线风险清单.md》",
      },
    ],
    actionItems: ["逐条跑检查表", "核对风险清单可打开", "验证风险轮 followup 仍可继续问"],
  }),
  data: createScenarioDispatchResultItem({
    sessionId,
    suffix: "result-team-product-risk-data",
    title: "灰度异常观察记录",
    subtitle: "首期最重要的异常组合与监控优先级",
    badge: "异常观察",
    panelSuffix: "panel-team-product-risk-data",
    skillName: "异常洞察",
    status: "success",
    dispatchLabel: "数据洞察师已把灰度最关键的异常组合和观察顺序收口。",
    recipients: [
      {
        id: "risk-data-only",
        name: "数据洞察师",
        roleLabel: "灰度信号",
        channelLabel: "风险复核流",
        statusLabel: "已完成",
        summary: "已定义入口正常/成员低曝光、成员正常/续问低点击两种异常组合。",
        tone: "accent",
      },
    ],
    conversationItems: [
      { id: "risk-data-system", actorLabel: "系统", summary: "今天 11:18", direction: "system" },
      {
        id: "risk-data-main",
        actorLabel: PRODUCT_TEAM_MAIN_AGENT_NAME,
        avatarLabel: "策",
        direction: "outgoing",
        timeLabel: "11:18",
        statusLabel: "已送达",
        summary: "把灰度时最能说明问题的异常组合拆出来，给我一版排查优先级。",
        detail: "任务分发 · 异常洞察",
      },
      {
        id: "risk-data-reply",
        actorLabel: "数据洞察师",
        avatarLabel: "数",
        direction: "incoming",
        tagLabel: "异常组合",
        timeLabel: "11:19",
        summary:
          "真正能说明问题的是成员曝光和续问点击，不要只看入口总点击；异常先按入口、成员、收口三层排查。",
      },
    ],
    actionItems: ["灰度先看成员曝光率", "再看续问点击率", "文件打开率作为辅助信号"],
  }),
});

const buildProductTeamCollabFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const artifacts = buildProductTeamArtifacts(sessionId, "delivery");
  const architectureArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-architecture");
  const acceptanceArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-acceptance");
  const metricsArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-metrics");
  const userResearchArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-user-research");
  const collabResults = buildProductTeamCollabResults(sessionId);
  const mainPlanMessageId = `${messageId}-main-plan`;
  const mainSummaryMessageId = `${messageId}-main-summary`;
  const architectMessageId = `${messageId}-architect`;
  const growthMessageId = `${messageId}-growth`;
  const qaMessageId = `${messageId}-qa`;
  const dataMessageId = `${messageId}-data`;
  const userResearchMessageId = `${messageId}-user`;
  const thinking =
    "用户要的不是一句概念说明，而是一套能直接评审和演示的首期方案。我先收目标、边界和交付物，再按顺序调度架构、增长、验收、数据和用户研究这 5 位成员。";
  const planningMarkdown = `我先按首期上线一版“专家团协作链路”来拆这件事。

这轮我先处理 3 件事：
1. 收首期目标和边界，确认什么必须做、什么暂时不做。
2. 把模块、依赖和分工拆清楚，避免后面讨论散掉。
3. 按顺序调度成员专家，上一位交回结果后再进入下一位，最后由我统一交付。

这轮我会按下面顺序推进：
1. 架构规划师：先锁系统边界、依赖和易耦合点。
2. 增长实验官：再看首问触发、续问承接和关键转化节点。
3. 交付验收官：再补验收口径、回归范围和上线门槛。
4. 数据洞察师：再补埋点和灰度观察指标。
5. 用户访谈官：最后复核用户会不会真的感知到“多人协作完成任务”。

你先看各位专家依次处理的过程，我会等结果按顺序回齐后再给你最终方案。`;
  const responseMarkdown = `我把这版需求收成一套能直接拿去过产品和研发评审的首期方案了，重点不只是“说清楚”，而是把成员专家各自产出的结果也沉了下来。

1. 模块与边界
- 入口层：专家团卡片、默认历史会话、首页首问、第一条猜你想问。
- 编排层：由 ${PRODUCT_TEAM_MAIN_AGENT_NAME}接住需求，先理解任务、再分发成员、最后统一交付。
- 执行层：成员专家以独立消息进入会话，继续调用各自技能并回传结果。
- 交付层：主专家统一收口，右侧保留结果面板和文件产物。

2. 这轮已经沉淀下来的成员结果
- 架构规划师：补了“架构边界评审记录”，并生成《架构边界与依赖表》。
- 增长实验官：补了“首问与续问策略记录”，把首问触发和风险追问承接锁住了。
- 交付验收官：补了“上线验收与回归记录”，并生成《上线前验收与回归清单》。
- 数据洞察师：补了“灰度观察记录”，并生成《指标与埋点草案》。
- 用户访谈官：补了《用户感知复核纪要》，明确用户会如何判断这是不是多人协作。

3. 首期建议
- 第一版先把“主专家分发 -> 成员专家执行并产出 -> 主专家汇总交付”这条链路做扎实。
- 继续保持输入框不开放 @ 成员专家，避免把协作入口做散。
- 评审时先看右侧的协作执行台账、架构评审记录和验收清单，这三份最能说明方案是否成立。

这轮我已经把协同交付方案沉到当前会话和右侧成果里了。你如果下一步继续追问上线风险，我就直接沿这套产物去复核 P0 / P1 风险，不会另起一套口径。`;

  const requirementsSummaryBlock = createToolUseBlock({
    id: `${messageId}-tool-summary`,
    name: "requirements_summary",
    displayName: "需求摘要",
    purpose: `${PRODUCT_TEAM_MAIN_AGENT_NAME}先收目标、边界和交付要求`,
    status: "success",
    output: prettyJson({
      goal: "上线产研协作专家团首版演示链路",
      mustHave: ["默认历史演示会话", "首问触发", "成员专家独立消息", "右侧文件产物"],
      constraints: ["不开放输入框 @ 成员专家", "最终由主专家统一收口", "预置问题最多 6 个"],
    }),
  });
  const breakdownBlock = createToolUseBlock({
    id: `${messageId}-tool-breakdown`,
    name: "backlog_breakdown",
    displayName: "任务拆解",
    purpose: `${PRODUCT_TEAM_MAIN_AGENT_NAME}把需求拆成可评审的 4 层结构`,
    status: "success",
    output: "已拆成入口层、编排层、执行层、交付层 4 个模块，并锁定首期不做项。",
  });
  const milestoneBlock = createToolUseBlock({
    id: `${messageId}-tool-milestone`,
    name: "milestone_plan",
    displayName: "交付节奏",
    purpose: `${PRODUCT_TEAM_MAIN_AGENT_NAME}安排首期交付顺序`,
    status: "success",
    output: "建议按“入口触发 -> 调度可见 -> 成员执行 -> 文件沉淀 -> 风险复核”顺序推进。",
  });
  const architectDispatchBlock = createToolUseBlock({
    id: `${messageId}-dispatch-architect`,
    name: "task_dispatch",
    displayName: "任务分发",
    purpose: "分配给架构规划师：拆模块边界、依赖和易耦合点",
    status: "success",
    avatarUrl: PRODUCT_TEAM_ARCHITECT_AVATAR_URL,
    avatarLabel: "架构规划师",
  });
  const growthDispatchBlock = createToolUseBlock({
    id: `${messageId}-dispatch-growth`,
    name: "task_dispatch",
    displayName: "任务分发",
    purpose: "分配给增长实验官：校准首问、续问和转化节点",
    status: "success",
    avatarUrl: PRODUCT_TEAM_GROWTH_AVATAR_URL,
    avatarLabel: "增长实验官",
  });
  const qaDispatchBlock = createToolUseBlock({
    id: `${messageId}-dispatch-qa`,
    name: "task_dispatch",
    displayName: "任务分发",
    purpose: "分配给交付验收官：整理验收口径和上线门槛",
    status: "success",
    avatarUrl: PRODUCT_TEAM_QA_AVATAR_URL,
    avatarLabel: "交付验收官",
  });
  const dataDispatchBlock = createToolUseBlock({
    id: `${messageId}-dispatch-data`,
    name: "task_dispatch",
    displayName: "任务分发",
    purpose: "分配给数据洞察师：输出埋点和灰度观察项",
    status: "success",
    avatarUrl: PRODUCT_TEAM_DATA_AVATAR_URL,
    avatarLabel: "数据洞察师",
  });
  const userResearchDispatchBlock = createToolUseBlock({
    id: `${messageId}-dispatch-user`,
    name: "task_dispatch",
    displayName: "任务分发",
    purpose: "分配给用户访谈官：复核用户会不会把这条链路认成真实协作",
    status: "success",
    avatarUrl: PRODUCT_TEAM_USER_RESEARCH_AVATAR_URL,
    avatarLabel: "用户访谈官",
  });

  const mainPlanningChildren = [
    createThinkingBlock(`${mainPlanMessageId}-thinking`, thinking),
    requirementsSummaryBlock,
    breakdownBlock,
    createTextBlock(`${mainPlanMessageId}-plan`, planningMarkdown),
  ];
  const mainDispatchChildren = [
    ...mainPlanningChildren,
    architectDispatchBlock,
    growthDispatchBlock,
    qaDispatchBlock,
    dataDispatchBlock,
    userResearchDispatchBlock,
    milestoneBlock,
  ];
  const mainArchitectDispatchChildren = [...mainPlanningChildren, architectDispatchBlock];
  const mainGrowthDispatchChildren = [
    ...mainPlanningChildren,
    architectDispatchBlock,
    growthDispatchBlock,
  ];
  const mainQaDispatchChildren = [
    ...mainPlanningChildren,
    architectDispatchBlock,
    growthDispatchBlock,
    qaDispatchBlock,
  ];
  const mainDataDispatchChildren = [
    ...mainPlanningChildren,
    architectDispatchBlock,
    growthDispatchBlock,
    qaDispatchBlock,
    dataDispatchBlock,
  ];

  const architectRunningChildren = [
    createToolUseBlock({
      id: `${architectMessageId}-tool-1`,
      name: "architecture_planning",
      displayName: "架构规划",
      purpose: "先把入口、编排、执行、交付四层边界拆开",
      status: "running",
    }),
    createTextBlock(
      `${architectMessageId}-text`,
      "我先把入口、主专家编排、成员执行和成果沉淀四层依赖串起来，重点看哪里最容易互相污染。",
      { isStreaming: true },
    ),
  ];
  const growthRunningChildren = [
    createToolUseBlock({
      id: `${growthMessageId}-tool-1`,
      name: "growth_experiment",
      displayName: "增长实验",
      purpose: "先收首问触发、成员曝光和续问承接三个关键节点",
      status: "running",
    }),
    createTextBlock(
      `${growthMessageId}-text`,
      "我先看用户从首页点进来后，会不会在主专家调度结束后的 3 秒内看到成员专家开始接力。",
      { isStreaming: true },
    ),
  ];
  const qaRunningChildren = [
    createToolUseBlock({
      id: `${qaMessageId}-tool-1`,
      name: "acceptance_review",
      displayName: "验收评审",
      purpose: "先整理首期必须过的验收门槛",
      status: "running",
    }),
    createTextBlock(
      `${qaMessageId}-text`,
      "我先按真实上线口径来卡：入口能不能触发、成员会不会出现、最终交付够不够完整。",
      { isStreaming: true },
    ),
  ];
  const dataRunningChildren = [
    createToolUseBlock({
      id: `${dataMessageId}-tool-1`,
      name: "metric_design",
      displayName: "指标设计",
      purpose: "先定义首期灰度要看的 4 类核心事件",
      status: "running",
    }),
    createTextBlock(
      `${dataMessageId}-text`,
      "我先把入口触发、成员曝光、文件打开、续问点击这 4 类事件收成可观测口径。",
      { isStreaming: true },
    ),
  ];
  const userRunningChildren = [
    createToolUseBlock({
      id: `${userResearchMessageId}-tool-1`,
      name: "feedback_synthesis",
      displayName: "反馈归纳",
      purpose: "先看用户会拿什么标准判断这是不是多专家协作",
      status: "running",
    }),
    createTextBlock(
      `${userResearchMessageId}-text`,
      "我先从用户视角复核一下：他们会不会觉得这是专家团接力做事，而不是主专家一个人把台词分成几段说。",
      { isStreaming: true },
    ),
  ];

  const architectCompletedChildren = [
    createToolUseBlock({
      id: `${architectMessageId}-tool-1`,
      name: "architecture_planning",
      displayName: "架构规划",
      purpose: "确认四层结构和接口边界",
      status: "success",
      output:
        "已明确入口层、编排层、执行层、交付层四层结构，成员专家只允许在执行层出现，不反向接管团队上下文。",
    }),
    createToolUseBlock({
      id: `${architectMessageId}-tool-2`,
      name: "module_mapping",
      displayName: "模块拆分",
      purpose: "确认每层依赖和易耦合点",
      status: "success",
      output:
        "已生成《产研协作专家团架构边界与依赖表.md》，重点标出 followup 路由、成员 skills 映射、多消息更新 3 个易耦合点。",
    }),
    createTextBlock(
      `${architectMessageId}-text`,
      `我把研发评审最需要看的边界先压出来：

1. 四层结构
- 入口层：负责卡片、历史会话、首问和猜你想问。
- 编排层：负责主专家理解任务、分工和调度。
- 执行层：负责成员专家各自处理自己的问题。
- 交付层：负责主专家统一总结和右侧文件沉淀。

2. 两条必须硬隔离的边界
- 用户只能对专家团说话，不能直接跳到成员上下文。
- 成员专家不能替代主专家做最终口径，最终结论必须再回到主专家。

3. 当前最容易耦合的依赖
- 首问和第一条猜你想问的映射关系。
- skills id 和工具展示名的统一。
- 多 assistant 消息的更新顺序。

如果这三件事锁住了，这条链路拿去过研发评审是成立的。`,
    ),
  ];
  const growthCompletedChildren = [
    createToolUseBlock({
      id: `${growthMessageId}-tool-1`,
      name: "growth_experiment",
      displayName: "增长实验",
      purpose: "确定首期最关键的触发与承接节点",
      status: "success",
      output: "首期先盯 3 个节点：首页首问触发、成员专家首屏曝光、第一条猜你想问续问点击。",
    }),
    createToolUseBlock({
      id: `${growthMessageId}-tool-2`,
      name: "conversion_analysis",
      displayName: "转化分析",
      purpose: "校准继续追问的承接设计",
      status: "success",
      output: `建议把第一条猜你想问固定为“${PRODUCT_TEAM_RISK_QUESTION}”，这样用户看完首轮方案会自然进入下一轮风险复核。`,
    }),
    createTextBlock(
      `${growthMessageId}-text`,
      `我把这条链路当成完整漏斗看，首期最关键的是 3 个节点：

1. 首问触发
- 用户要一眼看懂“点这个就能开始一轮专家团协作”。
- 所以首页第一个预置问题必须直指“拆模块、边界和依赖”这种真实任务。

2. 成员接力
- 主专家一调度完，成员专家必须马上各自开始处理自己的问题。
- 如果这里只看到一句总括说明，用户会立刻把它理解成单 agent 回复。

3. 继续追问
- 第一条猜你想问要顺着首轮结果自然往下走。
- 我建议固定成“${PRODUCT_TEAM_RISK_QUESTION}”，因为用户看完方案后最自然会问上线前最容易出什么问题。

首期如果只保一个续问入口，我建议就保这条风险追问。`,
    ),
  ];
  const qaCompletedChildren = [
    createToolUseBlock({
      id: `${qaMessageId}-tool-1`,
      name: "acceptance_review",
      displayName: "验收评审",
      purpose: "整理首期验收口径",
      status: "success",
      output: "P0 验收点 4 条：首问触发、主专家调度可见、成员专家独立消息执行、主专家最终汇总。",
    }),
    createToolUseBlock({
      id: `${qaMessageId}-tool-2`,
      name: "launch_checklist",
      displayName: "上线清单",
      purpose: "收首期上线门槛",
      status: "success",
      output:
        "上线前至少复核 prompt 映射、成员头像和技能展示、artifact 展示、followup 承接、最终汇总内容完整度。",
    }),
    createTextBlock(
      `${qaMessageId}-text`,
      `我先按真实上线口径给你一版最小验收标准：

1. 入口验收
- 首页第一个预置问题能稳定触发这条场景。
- 专家团默认历史会话能正常打开。

2. 过程验收
- 主专家先出现任务理解和调度，不提前给最终交付。
- 成员专家以独立消息进入会话，并继续执行自己的技能。

3. 结果验收
- 最终必须回到主专家统一汇总。
- 右侧至少能看到协同方案、架构边界表和埋点草案。

如果这三段闭环看得见、点得通、结果拿得到，这条链路才算能上线。`,
    ),
  ];
  const dataCompletedChildren = [
    createToolUseBlock({
      id: `${dataMessageId}-tool-1`,
      name: "metric_design",
      displayName: "指标设计",
      purpose: "定义灰度期的核心观测事件",
      status: "success",
      output: "已定义 5 个核心事件：首问点击、成员消息曝光、文件打开、续问点击、会话继续追问。",
    }),
    createToolUseBlock({
      id: `${dataMessageId}-tool-2`,
      name: "dashboard_planning",
      displayName: "看板规划",
      purpose: "输出埋点与观察草案",
      status: "success",
      output:
        "已生成《产研协作专家团指标与埋点草案.json》，灰度时先看入口触发、成员曝光、续问点击三段漏斗。",
    }),
    createTextBlock(
      `${dataMessageId}-text`,
      `我把灰度观察拆成三层，你一放量就能知道问题卡在哪：

1. 入口层
- 看首页首问点击率。
- 如果这里低，说明入口文案没把“专家团协作”讲明白。

2. 协作层
- 看成员消息曝光率和成员消息停留时长。
- 如果主专家看到了、成员没被看到，说明时序或布局有问题。

3. 继续追问层
- 看第一条猜你想问点击率和文件打开率。
- 如果成员曝光正常但续问低，说明成员结论不够可信，或者主专家收口不像真正交付。

首期灰度别一下子看太多指标，先把这三层跑通。`,
    ),
  ];
  const userCompletedChildren = [
    createToolUseBlock({
      id: `${userResearchMessageId}-tool-1`,
      name: "feedback_synthesis",
      displayName: "反馈归纳",
      purpose: "归纳用户判断协作真实性的标准",
      status: "success",
      output:
        "用户主要看 3 件事：主专家有没有明确分工、成员是不是各自做不同事情、最后是不是一份统一结论。",
    }),
    createToolUseBlock({
      id: `${userResearchMessageId}-tool-2`,
      name: "priority_evidence",
      displayName: "优先级证据",
      purpose: "判断首期最该优先做哪一段体验",
      status: "success",
      output: "首期最重要的不是堆更多专家，而是让现有成员专家尽快进入会话并说出真正不同的结论。",
    }),
    createTextBlock(
      `${userResearchMessageId}-text`,
      `从用户感知上，我建议你重点盯下面 3 个问题：

1. 用户会不会相信这是“多人协作”
- 关键不在头像数量，而在不同专家是不是明显在处理不同问题。

2. 用户会不会觉得过程可信
- 主专家不能刚开场就把答案全说完。
- 成员专家也不能只是附和，要有各自明确的判断角度。

3. 用户会不会愿意继续追问
- 如果看完这一轮之后，用户自然会点“上线前最需要规避哪些风险”，说明这条链路是成立的。

所以首期最重要的不是加更多花样，而是先把这 5 位成员的分工和输出差异做扎实。`,
    ),
  ];
  const mainSummaryChildren = [createTextBlock(`${mainSummaryMessageId}-final`, responseMarkdown)];

  return [
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}正在理解需求并收口首期目标。`,
          [createThinkingBlock(`${mainPlanMessageId}-thinking`, thinking, true)],
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
      ],
      `${PRODUCT_TEAM_MAIN_AGENT_NAME}正在理解需求并收口首期目标。`,
      860,
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已把需求拆成 4 个模块，准备按顺序拉专家处理。`,
          mainPlanningChildren,
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
      ],
      `${PRODUCT_TEAM_MAIN_AGENT_NAME}已把需求拆成 4 个模块，准备按顺序拉专家处理。`,
      920,
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已完成首轮拆解，先把第一段任务交给架构规划师。`,
          mainArchitectDispatchChildren,
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
      ],
      `${PRODUCT_TEAM_MAIN_AGENT_NAME}已先分发架构规划任务。`,
      1250,
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已把第一段任务交给架构规划师，等他处理完我再继续往下分发。`,
          mainArchitectDispatchChildren,
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "我先把这条链路拆成四层，并把边界和依赖关系拉清楚。",
          architectRunningChildren,
          { author: "架构规划师" },
        ),
      ],
      "架构规划师已进入会话，开始拆边界和依赖。",
      1300,
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已收到架构结果，下一步我继续分发首问和续问策略。`,
          mainGrowthDispatchChildren,
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "边界和依赖我已经梳理完了，后面研发评审直接按四层结构讨论就行。",
          architectCompletedChildren,
          { author: "架构规划师", results: [collabResults.architect] },
        ),
        buildScenarioMessageSnapshot(
          growthMessageId,
          "我先收入口触发和续问承接，重点看用户会不会顺着这条链路继续往下走。",
          growthRunningChildren,
          { author: "增长实验官" },
        ),
      ],
      "架构结果已回齐，增长实验官开始处理首问和续问承接。",
      1600,
      buildArtifactGroup(architectureArtifact),
      undefined,
      [collabResults.architect],
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已收到增长判断，下一步我继续分发上线验收与回归任务。`,
          mainQaDispatchChildren,
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "边界和依赖我已经梳理完了，后面研发评审直接按四层结构讨论就行。",
          architectCompletedChildren,
          { author: "架构规划师", results: [collabResults.architect] },
        ),
        buildScenarioMessageSnapshot(
          growthMessageId,
          "入口触发和续问承接我已经收口了，首期重点盯首问、成员曝光和第一条猜你想问。",
          growthCompletedChildren,
          { author: "增长实验官", results: [collabResults.growth] },
        ),
        buildScenarioMessageSnapshot(
          qaMessageId,
          "我先按上线标准把这条链路的验收门槛和回归范围补齐。",
          qaRunningChildren,
          { author: "交付验收官" },
        ),
      ],
      "增长结果已回齐，交付验收官开始整理上线门槛和回归范围。",
      1600,
      buildArtifactGroup(architectureArtifact),
      undefined,
      [collabResults.architect, collabResults.growth],
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已收到验收口径，下一步我继续分发灰度观察和埋点任务。`,
          mainDataDispatchChildren,
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "边界和依赖我已经梳理完了，后面研发评审直接按四层结构讨论就行。",
          architectCompletedChildren,
          { author: "架构规划师", results: [collabResults.architect] },
        ),
        buildScenarioMessageSnapshot(
          growthMessageId,
          "入口触发和续问承接我已经收口了，首期重点盯首问、成员曝光和第一条猜你想问。",
          growthCompletedChildren,
          { author: "增长实验官", results: [collabResults.growth] },
        ),
        buildScenarioMessageSnapshot(
          qaMessageId,
          "验收口径和上线门槛我已经补齐，后面可以直接拉一版回归清单。",
          qaCompletedChildren,
          { author: "交付验收官", results: [collabResults.qa] },
        ),
        buildScenarioMessageSnapshot(
          dataMessageId,
          "我先把灰度期必须看的事件和观察指标定下来。",
          dataRunningChildren,
          { author: "数据洞察师" },
        ),
      ],
      "验收结果已回齐，数据洞察师开始补灰度观察指标。",
      1700,
      buildArtifactGroup(architectureArtifact, acceptanceArtifact),
      undefined,
      [collabResults.architect, collabResults.growth, collabResults.qa],
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已收到灰度观察结果，最后我补一轮用户感知复核再统一收口。`,
          mainDispatchChildren,
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "边界和依赖我已经梳理完了，后面研发评审直接按四层结构讨论就行。",
          architectCompletedChildren,
          { author: "架构规划师", results: [collabResults.architect] },
        ),
        buildScenarioMessageSnapshot(
          growthMessageId,
          "入口触发和续问承接我已经收口了，首期重点盯首问、成员曝光和第一条猜你想问。",
          growthCompletedChildren,
          { author: "增长实验官", results: [collabResults.growth] },
        ),
        buildScenarioMessageSnapshot(
          qaMessageId,
          "验收口径和上线门槛我已经补齐，后面可以直接拉一版回归清单。",
          qaCompletedChildren,
          { author: "交付验收官", results: [collabResults.qa] },
        ),
        buildScenarioMessageSnapshot(
          dataMessageId,
          "埋点和观察指标我已经整理好，灰度时先看三段漏斗就能知道问题出在哪。",
          dataCompletedChildren,
          { author: "数据洞察师", results: [collabResults.data] },
        ),
        buildScenarioMessageSnapshot(
          userResearchMessageId,
          "我先从用户感知上复核：这条链路会不会让人相信真的是专家团在接力处理任务。",
          userRunningChildren,
          { author: "用户访谈官" },
        ),
      ],
      "灰度观察结果已回齐，用户访谈官开始做最后一轮真实感复核。",
      1700,
      buildArtifactGroup(architectureArtifact, acceptanceArtifact, metricsArtifact),
      undefined,
      [collabResults.architect, collabResults.growth, collabResults.qa, collabResults.data],
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已完成任务拆解和分工，下面是成员专家的处理结果。`,
          mainDispatchChildren,
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "边界和依赖我已经梳理完了，后面研发评审直接按四层结构讨论就行。",
          architectCompletedChildren,
          { author: "架构规划师", results: [collabResults.architect] },
        ),
        buildScenarioMessageSnapshot(
          growthMessageId,
          "入口触发和续问承接我已经收口了，首期重点盯首问、成员曝光和第一条猜你想问。",
          growthCompletedChildren,
          { author: "增长实验官", results: [collabResults.growth] },
        ),
        buildScenarioMessageSnapshot(
          qaMessageId,
          "验收口径和上线门槛我已经补齐，后面可以直接拉一版回归清单。",
          qaCompletedChildren,
          { author: "交付验收官", results: [collabResults.qa] },
        ),
        buildScenarioMessageSnapshot(
          dataMessageId,
          "埋点和观察指标我已经整理好，灰度时先看三段漏斗就能知道问题出在哪。",
          dataCompletedChildren,
          { author: "数据洞察师", results: [collabResults.data] },
        ),
        buildScenarioMessageSnapshot(
          userResearchMessageId,
          "用户感知这块我已经收完，关键是让不同专家做不同事情，而不是让大家重复说同一件事。",
          userCompletedChildren,
          { author: "用户访谈官" },
        ),
      ],
      `${PRODUCT_TEAM_MAIN_AGENT_NAME}正在汇总模块、边界、依赖和成员产物。`,
      1800,
      buildArtifactGroup(
        architectureArtifact,
        acceptanceArtifact,
        metricsArtifact,
        userResearchArtifact,
      ),
      undefined,
      [collabResults.architect, collabResults.growth, collabResults.qa, collabResults.data],
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已完成分工调度，下面是专家结果与最终交付。`,
          mainDispatchChildren,
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "我这边先把研发评审需要的边界、依赖和易耦合点都压出来了。",
          architectCompletedChildren,
          { author: "架构规划师", results: [collabResults.architect] },
        ),
        buildScenarioMessageSnapshot(
          growthMessageId,
          "我把首问触发、成员接力和续问承接这三个关键节点的判断整理好了。",
          growthCompletedChildren,
          { author: "增长实验官", results: [collabResults.growth] },
        ),
        buildScenarioMessageSnapshot(
          qaMessageId,
          "我把上线前最小验收标准和回归口径收成一版明确清单了。",
          qaCompletedChildren,
          { author: "交付验收官", results: [collabResults.qa] },
        ),
        buildScenarioMessageSnapshot(
          dataMessageId,
          "我把首期灰度要看的指标和异常判断方式都整理出来了。",
          dataCompletedChildren,
          { author: "数据洞察师", results: [collabResults.data] },
        ),
        buildScenarioMessageSnapshot(
          userResearchMessageId,
          "我从用户感知上把这条链路成立的前提条件也复核完了。",
          userCompletedChildren,
          { author: "用户访谈官" },
        ),
        buildScenarioMessageSnapshot(mainSummaryMessageId, responseMarkdown, mainSummaryChildren, {
          author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          results: [collabResults.overview],
          followupSuggestions: PRODUCT_TEAM_COLLAB_FOLLOWUPS,
        }),
      ],
      "模块拆解、边界、依赖和首期交付建议已经整理完成。",
      estimateTypewriterDelay(responseMarkdown),
      artifacts,
      undefined,
      [collabResults.overview],
      PRODUCT_TEAM_COLLAB_FOLLOWUPS,
    ),
  ];
};

const buildProductTeamRiskFrames = (sessionId: string): DialogueScenarioFrame[] => {
  const messageId = `${sessionId}-assistant`;
  const artifacts = buildProductTeamArtifacts(sessionId, "risk");
  const acceptanceArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-acceptance");
  const metricsArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-metrics");
  const riskArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-collab-risk");
  const riskResults = buildProductTeamRiskResults(sessionId);
  const mainPlanMessageId = `${messageId}-main-plan`;
  const mainSummaryMessageId = `${messageId}-main-summary`;
  const architectMessageId = `${messageId}-architect`;
  const qaMessageId = `${messageId}-qa`;
  const dataMessageId = `${messageId}-data`;
  const thinking =
    "这一轮不再重讲方案，而是按上线视角把最可能翻车的点排出来：我会先复核路由和时序，再复核上线门槛，最后复核灰度观察。";
  const planningMarkdown = `这一轮我不重复讲首期方案，直接按上线视角复核风险。

我会先排 4 类问题：
1. 路由会不会断。
2. 主专家和成员专家的时序会不会失真。
3. 成员 skills 和工具展示会不会对不上。
4. 灰度后能不能快速定位问题。

我会按顺序推进：
1. 先让架构规划师复核路由、时序和状态同步风险。
2. 再让交付验收官把上线前检查表和回归矩阵补齐。
3. 最后让数据洞察师确认灰度期的异常信号和排查顺序。

等三位专家按顺序交回结果后，我再统一给你上线风险结论。`;
  const responseMarkdown = `我把这版方案上线前最需要盯的风险收成一版可直接复核的评审口径了。

1. P0 风险：路由断裂
- 首页第一个预置问题、第一条猜你想问、隐藏场景 trigger 任何一处改字，第二轮就会掉出预期脚本。
- 处理建议：把这两条问题文案锁成常量，回归时逐字校验。

2. P0 风险：时序失真
- 正确顺序必须是“主专家调度 -> 成员专家各自执行 -> 主专家汇总”。
- 只要主专家提前收尾，或者成员专家不是独立消息出现，用户就会直接觉得这条链路不真实。

3. P0 风险：技能映射错位
- 成员 skills、工具块展示名、首页配置三者不一致时，成员专家虽然出现了，但能力会对不上。
- 处理建议：统一从成员 skills 派生展示，不在场景脚本里再维护第二套技能口径。

4. P1 风险：灰度后无法定位问题
- 如果没有入口触发、成员曝光、文件打开、续问点击这些埋点，灰度时出了问题也不知道卡在哪一段。
- 处理建议：上线前把观察指标接齐，灰度先盯 3 段漏斗。

这轮我已经把《上线风险清单》沉到成果里，也把路由与时序风险记录、上线前检查表、灰度异常观察记录补成了可继续复核的结果。你如果下一步继续推进，就直接按这三份记录去做上线前复核。`;

  const riskReviewBlock = createToolUseBlock({
    id: `${mainPlanMessageId}-tool-risk-review`,
    name: "risk_review",
    displayName: "风险评审",
    purpose: `${PRODUCT_TEAM_MAIN_AGENT_NAME}先锁 P0 / P1 风险层级`,
    status: "success",
    output: prettyJson({
      p0: ["路由断裂", "时序失真", "技能映射错位"],
      p1: ["灰度观察不足"],
    }),
  });
  const acceptanceBlock = createToolUseBlock({
    id: `${mainPlanMessageId}-tool-acceptance`,
    name: "acceptance_review",
    displayName: "验收评审",
    purpose: `${PRODUCT_TEAM_MAIN_AGENT_NAME}反推上线前的最小门槛`,
    status: "success",
    output: "已锁定 4 条上线门槛：首问触发、成员独立消息、最终汇总、风险文件可复核。",
  });
  const architectRiskDispatch = createToolUseBlock({
    id: `${mainPlanMessageId}-dispatch-architect`,
    name: "task_dispatch",
    displayName: "任务分发",
    purpose: "分配给架构规划师：复核路由、时序和状态同步风险",
    status: "success",
    avatarUrl: PRODUCT_TEAM_ARCHITECT_AVATAR_URL,
    avatarLabel: "架构规划师",
  });
  const qaRiskDispatch = createToolUseBlock({
    id: `${mainPlanMessageId}-dispatch-qa`,
    name: "task_dispatch",
    displayName: "任务分发",
    purpose: "分配给交付验收官：收上线前检查项和回归矩阵",
    status: "success",
    avatarUrl: PRODUCT_TEAM_QA_AVATAR_URL,
    avatarLabel: "交付验收官",
  });
  const dataRiskDispatch = createToolUseBlock({
    id: `${mainPlanMessageId}-dispatch-data`,
    name: "task_dispatch",
    displayName: "任务分发",
    purpose: "分配给数据洞察师：定义灰度期最该盯的异常信号",
    status: "success",
    avatarUrl: PRODUCT_TEAM_DATA_AVATAR_URL,
    avatarLabel: "数据洞察师",
  });
  const mainArchitectRiskDispatchChildren = [
    createThinkingBlock(`${mainPlanMessageId}-thinking`, thinking),
    riskReviewBlock,
    acceptanceBlock,
    architectRiskDispatch,
    createTextBlock(`${mainPlanMessageId}-plan`, planningMarkdown),
  ];
  const mainQaRiskDispatchChildren = [
    createThinkingBlock(`${mainPlanMessageId}-thinking`, thinking),
    riskReviewBlock,
    acceptanceBlock,
    architectRiskDispatch,
    qaRiskDispatch,
    createTextBlock(`${mainPlanMessageId}-plan`, planningMarkdown),
  ];
  const mainRiskDispatchChildren = [
    createThinkingBlock(`${mainPlanMessageId}-thinking`, thinking),
    riskReviewBlock,
    acceptanceBlock,
    architectRiskDispatch,
    qaRiskDispatch,
    dataRiskDispatch,
    createTextBlock(`${mainPlanMessageId}-plan`, planningMarkdown),
  ];

  const architectRiskRunningChildren = [
    createToolUseBlock({
      id: `${architectMessageId}-tool-1`,
      name: "risk_review",
      displayName: "风险评审",
      purpose: "先排查路由、时序和多消息更新风险",
      status: "running",
    }),
    createTextBlock(
      `${architectMessageId}-text`,
      "我先看首问、首条续问和隐藏场景这三处映射，再看主专家和成员消息的更新顺序会不会互相覆盖。",
      { isStreaming: true },
    ),
  ];
  const qaRiskRunningChildren = [
    createToolUseBlock({
      id: `${qaMessageId}-tool-1`,
      name: "regression_planning",
      displayName: "回归规划",
      purpose: "先拉上线前必须回归的链路",
      status: "running",
    }),
    createTextBlock(
      `${qaMessageId}-text`,
      "我先把首问触发、成员执行、文件产出和续问承接这几段整理成一版最小回归矩阵。",
      { isStreaming: true },
    ),
  ];
  const dataRiskRunningChildren = [
    createToolUseBlock({
      id: `${dataMessageId}-tool-1`,
      name: "anomaly_insight",
      displayName: "异常洞察",
      purpose: "先定义灰度期最关键的异常信号",
      status: "running",
    }),
    createTextBlock(
      `${dataMessageId}-text`,
      "我先从灰度监控角度看，如果用户掉在入口、成员执行或最终收口，数据上分别会是什么表现。",
      { isStreaming: true },
    ),
  ];

  const architectRiskChildren = [
    createToolUseBlock({
      id: `${architectMessageId}-tool-1`,
      name: "risk_review",
      displayName: "风险评审",
      purpose: "识别最容易把这条链路做假的架构风险",
      status: "success",
      output:
        "P0 风险是 followup 路由断裂和主专家提前收尾；这两个问题一旦出现，用户会直接把整条链路认成伪协作。",
    }),
    createToolUseBlock({
      id: `${architectMessageId}-tool-2`,
      name: "module_mapping",
      displayName: "模块拆分",
      purpose: "确认风险对应的系统位置",
      status: "success",
      output: "风险主要集中在 3 处：首问/续问映射、成员 skills 映射、多 assistant 消息更新顺序。",
    }),
    createTextBlock(
      `${architectMessageId}-text`,
      `我先把这轮风险复核里最容易出事故的点压成一版：

1. 路由风险
- 首问、第一条猜你想问、隐藏场景 trigger 只要有一个字改了，第二轮就会直接掉链子。

2. 时序风险
- 主专家如果先总结、后出现成员执行，整条链路就会看起来像伪造过程。

3. 更新风险
- 多条 assistant 消息如果更新错位，会出现主专家和成员内容互相覆盖。

从架构上说，这三个点都比样式细节更致命。`,
    ),
  ];
  const qaRiskChildren = [
    createToolUseBlock({
      id: `${qaMessageId}-tool-1`,
      name: "regression_planning",
      displayName: "回归规划",
      purpose: "确定上线前最小回归矩阵",
      status: "success",
      output:
        "必须回归 5 段：首问点击、主专家调度、成员独立消息、右侧文件打开、第一条猜你想问续问。",
    }),
    createToolUseBlock({
      id: `${qaMessageId}-tool-2`,
      name: "launch_checklist",
      displayName: "上线清单",
      purpose: "固化上线前复核口径",
      status: "success",
      output: "《产研协作专家团上线风险清单.md》已经补齐，可直接作为上线前复核底稿使用。",
    }),
    createTextBlock(
      `${qaMessageId}-text`,
      `我按真实上线前回归来卡这件事，最少要过这 3 关：

1. 触发链路
- 首页首问能进入首轮协作。
- 第一条猜你想问能进入风险复核。

2. 协作链路
- 主专家先调度，不提前交付。
- 成员专家以独立消息出现，并且各自有完整输出。

3. 结果链路
- 风险清单文件可打开。
- 用户看完后能继续顺着检查表或灰度方案往下问。

少任何一关，这条链路我都不会建议上线。`,
    ),
  ];
  const dataRiskChildren = [
    createToolUseBlock({
      id: `${dataMessageId}-tool-1`,
      name: "anomaly_insight",
      displayName: "异常洞察",
      purpose: "定义灰度期最先报警的异常",
      status: "success",
      output:
        "如果首问点击正常但成员消息曝光率低，先查时序和布局；如果成员曝光正常但续问点击低，先查成员结论可信度和主专家收口。",
    }),
    createToolUseBlock({
      id: `${dataMessageId}-tool-2`,
      name: "dashboard_planning",
      displayName: "看板规划",
      purpose: "确认灰度期观察顺序",
      status: "success",
      output:
        "灰度期建议先看“入口触发 -> 成员曝光 -> 续问点击”三段漏斗，再看文件打开率作为辅助信号。",
    }),
    createTextBlock(
      `${dataMessageId}-text`,
      `从数据上看，这轮风险复核最值得盯的是两个异常组合：

1. 首问点击正常，但成员曝光低
- 通常是时序、布局或消息更新有问题。

2. 成员曝光正常，但续问点击低
- 通常是成员内容太空，或者主专家总结不像真正交付。

所以灰度时不要只盯入口，真正能说明问题的是“成员有没有被看到”和“看完之后还愿不愿意继续问”。`,
    ),
  ];

  return [
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}正在按上线视角复核这版方案。`,
          [createThinkingBlock(`${mainPlanMessageId}-thinking`, thinking, true)],
          { author: PRODUCT_TEAM_MAIN_AGENT_NAME },
        ),
      ],
      `${PRODUCT_TEAM_MAIN_AGENT_NAME}正在按上线视角复核这版方案。`,
      860,
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已发起风险复核，先由架构规划师排查路由和时序。`,
          mainArchitectRiskDispatchChildren,
          { author: PRODUCT_TEAM_MAIN_AGENT_NAME },
        ),
      ],
      "风险复核已启动，先分发路由与时序复核。",
      1400,
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已把第一段风险复核交给架构规划师，等他回传后我再继续分发。`,
          mainArchitectRiskDispatchChildren,
          { author: PRODUCT_TEAM_MAIN_AGENT_NAME },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "我先看路由映射和消息时序，这两处最容易让整条链路直接失真。",
          architectRiskRunningChildren,
          { author: "架构规划师" },
        ),
      ],
      "架构规划师已进入风险复核，开始排查路由和时序。",
      1300,
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已收到架构风险结论，下一步由交付验收官补上线检查表。`,
          mainQaRiskDispatchChildren,
          { author: PRODUCT_TEAM_MAIN_AGENT_NAME },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "架构风险我已经收完，P0 主要集中在路由断裂和时序失真两件事上。",
          architectRiskChildren,
          { author: "架构规划师", results: [riskResults.architect] },
        ),
        buildScenarioMessageSnapshot(
          qaMessageId,
          "我先把上线前必须回归的链路拉出来，避免演示能跑、真实体验不闭环。",
          qaRiskRunningChildren,
          { author: "交付验收官" },
        ),
      ],
      "架构风险已回齐，交付验收官开始整理上线前检查表。",
      1600,
      buildArtifactGroup(riskArtifact),
      undefined,
      [riskResults.architect],
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已收到上线检查结论，最后由数据洞察师补灰度观察。`,
          mainRiskDispatchChildren,
          { author: PRODUCT_TEAM_MAIN_AGENT_NAME },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "架构风险我已经收完，P0 主要集中在路由断裂和时序失真两件事上。",
          architectRiskChildren,
          { author: "架构规划师", results: [riskResults.architect] },
        ),
        buildScenarioMessageSnapshot(
          qaMessageId,
          "回归矩阵和上线清单我已经补齐，这版已经能按真实上线门槛去复核。",
          qaRiskChildren,
          { author: "交付验收官", results: [riskResults.qa] },
        ),
        buildScenarioMessageSnapshot(
          dataMessageId,
          "我先定义灰度期最该盯的异常信号，这样一放量就能定位问题落在哪一段。",
          dataRiskRunningChildren,
          { author: "数据洞察师" },
        ),
      ],
      "上线检查表已回齐，数据洞察师开始补灰度异常观察。",
      1700,
      buildArtifactGroup(riskArtifact, acceptanceArtifact),
      undefined,
      [riskResults.architect, riskResults.qa],
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已完成风险分工，下面是三位专家的复核结果。`,
          [
            createThinkingBlock(`${mainPlanMessageId}-thinking`, thinking),
            riskReviewBlock,
            acceptanceBlock,
            architectRiskDispatch,
            qaRiskDispatch,
            dataRiskDispatch,
            createTextBlock(`${mainPlanMessageId}-plan`, planningMarkdown),
          ],
          { author: PRODUCT_TEAM_MAIN_AGENT_NAME },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "架构风险我已经收完，P0 主要集中在路由断裂和时序失真两件事上。",
          architectRiskChildren,
          { author: "架构规划师", results: [riskResults.architect] },
        ),
        buildScenarioMessageSnapshot(
          qaMessageId,
          "回归矩阵和上线清单我已经补齐，这版已经能按真实上线门槛去复核。",
          qaRiskChildren,
          { author: "交付验收官", results: [riskResults.qa] },
        ),
        buildScenarioMessageSnapshot(
          dataMessageId,
          "灰度观察项我已经收完，后面出问题时可以快速判断是入口掉了还是成员执行不可信。",
          dataRiskChildren,
          { author: "数据洞察师", results: [riskResults.data] },
        ),
      ],
      `${PRODUCT_TEAM_MAIN_AGENT_NAME}正在合并路由、验收和灰度观察结论。`,
      1800,
      buildArtifactGroup(riskArtifact, acceptanceArtifact, metricsArtifact),
      undefined,
      [riskResults.architect, riskResults.qa, riskResults.data],
    ),
    buildScenarioConversationFrame(
      [
        buildScenarioMessageSnapshot(
          mainPlanMessageId,
          `${PRODUCT_TEAM_MAIN_AGENT_NAME}已完成风险分工调度，下面是专家复核结果与最终建议。`,
          mainRiskDispatchChildren,
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
          },
        ),
        buildScenarioMessageSnapshot(
          architectMessageId,
          "从架构上看，这轮最大的价值是把路由和时序这两个 P0 风险锁死，后面任何改动都优先回归这两段。",
          architectRiskChildren,
          { author: "架构规划师", results: [riskResults.architect] },
        ),
        buildScenarioMessageSnapshot(
          qaMessageId,
          "这份风险清单已经能直接拿去做上线前复核，尤其别漏掉成员独立消息和第一条猜你想问承接。",
          qaRiskChildren,
          { author: "交付验收官", results: [riskResults.qa] },
        ),
        buildScenarioMessageSnapshot(
          dataMessageId,
          "灰度时只要先盯三段漏斗，就能很快判断问题是在入口、成员执行还是最终收口。",
          dataRiskChildren,
          { author: "数据洞察师", results: [riskResults.data] },
        ),
        buildScenarioMessageSnapshot(
          mainSummaryMessageId,
          responseMarkdown,
          [createTextBlock(`${mainSummaryMessageId}-final`, responseMarkdown)],
          {
            author: PRODUCT_TEAM_MAIN_AGENT_NAME,
            results: [riskResults.overview],
            followupSuggestions: PRODUCT_TEAM_RISK_FOLLOWUPS,
          },
        ),
      ],
      "上线风险和规避动作已经整理完成。",
      estimateTypewriterDelay(responseMarkdown),
      artifacts,
      undefined,
      [riskResults.overview],
      PRODUCT_TEAM_RISK_FOLLOWUPS,
    ),
  ];
};

const SCENARIO_DEFINITIONS: DialogueScenarioDefinition[] = [
  ...ECOMMERCE_AUTOMATION_SKILL_DEMOS.map(item => ({
    employeeId: ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
    agentName: ECOMMERCE_AUTOMATION_AGENT_DEMO.name,
    sessionId: `dialogue-seed-ecom-ops-${item.id}`,
    title: item.title,
    updatedAt: item.updatedAt,
    triggerQuestion: item.prompt,
    buildFrames: (sessionId: string) => buildEcommerceAutomationFrames(sessionId, item),
  })),
  ...LIVE_BROADCAST_SKILL_DEMOS.map(item => ({
    employeeId: LIVE_BROADCAST_AGENT_DEMO.id,
    agentName: LIVE_BROADCAST_AGENT_DEMO.name,
    sessionId: `dialogue-seed-live-ops-${item.id}`,
    title: item.title,
    updatedAt: item.updatedAt,
    triggerQuestion: item.prompt,
    buildFrames: (sessionId: string) => buildLiveBroadcastFrames(sessionId, item),
  })),
  ...XIAOCANMAMA_IP_SKILL_DEMOS.map(item => ({
    employeeId: XIAOCANMAMA_IP_AGENT_DEMO.id,
    agentName: XIAOCANMAMA_IP_AGENT_DEMO.name,
    sessionId: `dialogue-seed-xiaocanmama-ip-${item.id}`,
    title: item.title,
    updatedAt: item.updatedAt,
    triggerQuestion: item.prompt,
    buildFrames: (sessionId: string) => buildXiaocanMamaIpFrames(sessionId, item),
  })),
  {
    employeeId: "employee-writer",
    agentName: "CEO分身",
    sessionId: SCENARIO_SEED_IDS["employee-writer"],
    title: "经营总览晨会版",
    updatedAt: "09:12",
    triggerQuestion: CEO_SEQUENCE_OVERVIEW_QUESTION,
    buildFrames: buildSequenceOverviewFrames,
  },
  {
    employeeId: "employee-writer",
    agentName: "CEO分身",
    sessionId: "dialogue-seed-ceo-feishu-planning",
    title: "管理与销售收口安排",
    updatedAt: "09:18",
    triggerQuestion: CEO_FEISHU_ENTRY_QUESTION,
    buildFrames: buildFeishuDispatchPlanningFrames,
  },
  {
    employeeId: "employee-writer",
    agentName: "CEO分身",
    sessionId: "dialogue-seed-ceo-feishu-dispatch-hidden",
    title: "飞书任务下发",
    updatedAt: "09:20",
    triggerQuestion: CEO_FEISHU_DISPATCH_QUESTION,
    seeded: false,
    buildFrames: buildFeishuDispatchFrames,
  },
  {
    employeeId: "employee-writer",
    agentName: "CEO分身",
    sessionId: "dialogue-seed-ceo-feishu-management-hidden",
    title: "管理序列飞书强化提醒",
    updatedAt: "09:26",
    triggerQuestion: CEO_FEISHU_MANAGEMENT_FOCUS_QUESTION,
    seeded: false,
    buildFrames: buildFeishuManagementFocusFrames,
  },
  {
    employeeId: "employee-writer",
    agentName: "CEO分身",
    sessionId: "dialogue-seed-ceo-employee-assess-hidden",
    title: "王建国表现追问",
    updatedAt: "09:28",
    triggerQuestion: CEO_EMPLOYEE_ASSESS_QUESTION,
    seeded: false,
    buildFrames: buildEmployeeAssessFrames,
  },
  {
    employeeId: "employee-writer",
    agentName: "CEO分身",
    sessionId: "dialogue-seed-ceo-redline-hidden",
    title: "张伟红线核查",
    updatedAt: "09:41",
    triggerQuestion: CEO_REDLINE_QUESTION,
    seeded: false,
    buildFrames: buildRedlineFrames,
  },
  {
    employeeId: "employee-writer",
    agentName: "CEO分身",
    sessionId: "dialogue-seed-ceo-benchmark-hidden",
    title: "生产序列标杆识别",
    updatedAt: "09:52",
    triggerQuestion: CEO_BENCHMARK_QUESTION,
    seeded: false,
    buildFrames: buildBenchmarkFrames,
  },
  {
    employeeId: "employee-writer",
    agentName: "CEO分身",
    sessionId: "dialogue-seed-ceo-score-rank-hidden",
    title: "销售序列排名分层",
    updatedAt: "10:04",
    triggerQuestion: CEO_SCORE_RANK_QUESTION,
    seeded: false,
    buildFrames: buildScoreRankFrames,
  },
  {
    employeeId: "employee-product-manager",
    agentName: "产品经理AI专家",
    sessionId: SCENARIO_SEED_IDS["employee-product-manager"],
    title: "Frontis AI PRD 草案",
    updatedAt: "10:42",
    triggerQuestion: PRODUCT_MANAGER_PRD_QUESTION,
    buildFrames: sessionId => buildProductManagerFrames(sessionId, "prd"),
  },
  {
    employeeId: "employee-product-manager",
    agentName: "产品经理AI专家",
    sessionId: "dialogue-seed-product-manager-backlog-hidden",
    title: "Frontis AI Product Backlog",
    updatedAt: "10:46",
    triggerQuestion: PRODUCT_MANAGER_BACKLOG_QUESTION,
    seeded: false,
    buildFrames: sessionId => buildProductManagerFrames(sessionId, "backlog"),
  },
  {
    employeeId: "team-product",
    agentName: "产研协作专家团",
    sessionId: "dialogue-seed-team-product-collab",
    title: "产研协作专家团协同拆解",
    updatedAt: "11:08",
    triggerQuestion: PRODUCT_TEAM_COLLAB_QUESTION,
    buildFrames: buildProductTeamCollabFrames,
  },
  {
    employeeId: "team-product",
    agentName: "产研协作专家团",
    sessionId: "dialogue-seed-team-product-risk-hidden",
    title: "产研协作专家团上线风险",
    updatedAt: "11:15",
    triggerQuestion: PRODUCT_TEAM_RISK_QUESTION,
    seeded: false,
    buildFrames: buildProductTeamRiskFrames,
  },
  {
    employeeId: "employee-pm",
    agentName: "序列总览专家",
    sessionId: SCENARIO_SEED_IDS["employee-pm"],
    title: "经营总览晨会版",
    updatedAt: "09:12",
    triggerQuestion: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-pm"],
    buildFrames: buildSequenceOverviewFrames,
  },
  {
    employeeId: "employee-designer",
    agentName: "员工评估专家",
    sessionId: SCENARIO_SEED_IDS["employee-designer"],
    title: "王建国表现追问",
    updatedAt: "09:28",
    triggerQuestion: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-designer"],
    buildFrames: buildEmployeeAssessFrames,
  },
  {
    employeeId: "employee-research",
    agentName: "红线检测专家",
    sessionId: SCENARIO_SEED_IDS["employee-research"],
    title: "张伟红线核查",
    updatedAt: "09:41",
    triggerQuestion: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-research"],
    buildFrames: buildRedlineFrames,
  },
  {
    employeeId: "employee-ops",
    agentName: "标杆识别专家",
    sessionId: SCENARIO_SEED_IDS["employee-ops"],
    title: "生产序列标杆识别",
    updatedAt: "09:52",
    triggerQuestion: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-ops"],
    buildFrames: buildBenchmarkFrames,
  },
  {
    employeeId: "employee-sales",
    agentName: "评分排名专家",
    sessionId: SCENARIO_SEED_IDS["employee-sales"],
    title: "销售序列排名分层",
    updatedAt: "10:04",
    triggerQuestion: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-sales"],
    buildFrames: buildScoreRankFrames,
  },
  {
    employeeId: "employee-writer",
    agentName: "CEO分身",
    sessionId: "dialogue-seed-ceo-synthesis-hidden",
    title: "CEO综合研判",
    updatedAt: "10:18",
    triggerQuestion: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-writer"],
    seeded: false,
    buildFrames: buildCeoFrames,
  },
];

interface SeedDialogueScenarioBundle {
  artifacts: ArtifactItem[];
  messages: ChatMessage[];
  panel?: DialogueGeneratedPanelState;
  preview: string;
  results: DialogueGeneratedResultItem[];
  updatedAt: string;
}

const findScenarioDefinitionByQuestion = (
  employeeId: string,
  question: string,
): DialogueScenarioDefinition | null =>
  SCENARIO_DEFINITIONS.find(
    item =>
      item.employeeId === employeeId &&
      normalizeScenarioQuestion(item.triggerQuestion) === normalizeScenarioQuestion(question),
  ) ?? null;

const appendUniqueItems = <TItem extends { id: string }>(target: TItem[], items: TItem[]): void => {
  const existingIds = new Set(target.map(item => item.id));

  items.forEach(item => {
    if (existingIds.has(item.id)) {
      return;
    }

    target.push(item);
    existingIds.add(item.id);
  });
};

const appendUniqueArtifacts = (target: ArtifactItem[], items: ArtifactItem[]): void => {
  const existingKeys = new Set(
    target.map(item => `${item.fileName}::${item.canonicalPath}::${item.mimeType}`),
  );

  items.forEach(item => {
    const artifactKey = `${item.fileName}::${item.canonicalPath}::${item.mimeType}`;

    if (existingKeys.has(artifactKey)) {
      return;
    }

    target.push(item);
    existingKeys.add(artifactKey);
  });
};

const buildDialogueScenarioReplayRounds = (
  definition: DialogueScenarioDefinition,
  frameScopeIdPrefix: string = definition.sessionId,
): DialogueScenarioReplayRound[] => {
  const rounds: DialogueScenarioReplayRound[] = [];
  const visitedQuestions = new Set<string>();
  let currentDefinition: DialogueScenarioDefinition | null = definition;
  let roundIndex = 0;

  while (currentDefinition && roundIndex < 12) {
    const normalizedQuestion = normalizeScenarioQuestion(currentDefinition.triggerQuestion);

    if (visitedQuestions.has(normalizedQuestion)) {
      break;
    }

    visitedQuestions.add(normalizedQuestion);

    const frameScopeId =
      roundIndex === 0 ? frameScopeIdPrefix : `${frameScopeIdPrefix}-round-${roundIndex + 1}`;

    rounds.push({
      agentName: currentDefinition.agentName,
      question: currentDefinition.triggerQuestion,
      updatedAt: currentDefinition.updatedAt,
      frames: expandFramesForTypewriter(currentDefinition.buildFrames(frameScopeId)),
    });

    const latestFrame = rounds[rounds.length - 1].frames.at(-1);
    const nextQuestion = latestFrame?.followupSuggestions?.[0];

    if (!nextQuestion) {
      break;
    }

    const nextDefinition = findScenarioDefinitionByQuestion(definition.employeeId, nextQuestion);

    if (!nextDefinition || nextDefinition.seeded !== false) {
      break;
    }

    currentDefinition = nextDefinition;
    roundIndex += 1;
  }

  return rounds;
};

const buildSeedDialogueScenarioBundle = (
  definition: DialogueScenarioDefinition,
): SeedDialogueScenarioBundle => {
  const messages: ChatMessage[] = [];
  const artifacts: ArtifactItem[] = [];
  const results: DialogueGeneratedResultItem[] = [];
  let latestPreview = definition.title;
  let latestUpdatedAt = definition.updatedAt;
  let latestPanel: DialogueGeneratedPanelState | undefined;
  const replayRounds = buildDialogueScenarioReplayRounds(definition);

  replayRounds.forEach((round, roundIndex) => {
    const frames = round.frames;
    const lastFrame = frames[frames.length - 1];
    const latestResultFrame = [...frames].reverse().find(item => item.results?.length);
    const latestPanelFrame = [...frames].reverse().find(item => item.panel);

    messages.push({
      id: `${definition.sessionId}-user-message-${roundIndex + 1}`,
      role: "user",
      author: "你",
      content: round.question,
      timeLabel: round.updatedAt,
    });
    const assistantMessages = lastFrame.messages?.length
      ? lastFrame.messages
      : [
          {
            key: `${definition.sessionId}-assistant-message-${roundIndex + 1}`,
            author: round.agentName,
            preview: lastFrame.preview,
            blocks: lastFrame.blocks,
            followupSuggestions: lastFrame.followupSuggestions,
          },
        ];

    assistantMessages.forEach((assistantMessage, messageIndex) => {
      messages.push({
        id: `${definition.sessionId}-assistant-message-${roundIndex + 1}-${messageIndex + 1}`,
        role: "assistant",
        author: assistantMessage.author?.trim() || round.agentName,
        content: assistantMessage.preview,
        timeLabel: round.updatedAt,
        blocks: assistantMessage.blocks,
        followupSuggestions: assistantMessage.followupSuggestions,
      });
    });

    latestPreview = lastFrame.preview;
    latestUpdatedAt = round.updatedAt;

    if (lastFrame.artifacts?.length) {
      appendUniqueArtifacts(artifacts, lastFrame.artifacts);
    }
    if (latestResultFrame?.results?.length) {
      appendUniqueItems(results, latestResultFrame.results);
    }
    if (latestPanelFrame?.panel) {
      latestPanel = latestPanelFrame.panel;
    }
  });

  return {
    messages,
    preview: latestPreview,
    updatedAt: latestUpdatedAt,
    artifacts,
    panel: latestPanel,
    results,
  };
};

export const buildDialogueScenarioReplay = (
  employeeId: string,
  question: string,
  frameScopeIdPrefix?: string,
): DialogueScenarioReplay | null => {
  const matched = findScenarioDefinitionByQuestion(employeeId, question);
  if (!matched) {
    return null;
  }

  return {
    employeeId: matched.employeeId,
    title: matched.title,
    triggerQuestion: matched.triggerQuestion,
    rounds: buildDialogueScenarioReplayRounds(
      matched,
      frameScopeIdPrefix ?? `dialogue-scenario-replay-${Date.now()}-${matched.employeeId}`,
    ),
  };
};

/**
 * 根据 agent 与问题匹配对应的场景化模拟。
 */
export const findDialogueScenario = (
  employeeId: string,
  question: string,
  frameScopeId?: string,
): DialogueScenario | null => {
  const matched = findScenarioDefinitionByQuestion(employeeId, question);
  if (!matched) {
    return null;
  }

  return {
    employeeId: matched.employeeId,
    title: matched.title,
    triggerQuestion: matched.triggerQuestion,
    frames: expandFramesForTypewriter(
      matched.buildFrames(frameScopeId ?? `dialogue-scenario-${Date.now()}-${matched.employeeId}`),
    ),
  };
};

/**
 * 构建默认单聊场景种子会话。
 */
export const buildDialogueScenarioSeedSessions = (): DialogueSessionItem[] =>
  SCENARIO_DEFINITIONS.filter(definition => definition.seeded !== false).map(definition => {
    const bundle = buildSeedDialogueScenarioBundle(definition);

    return {
      id: definition.sessionId,
      employeeId: definition.employeeId,
      title: definition.title,
      preview: bundle.preview,
      updatedAt: bundle.updatedAt,
      messages: bundle.messages,
    };
  });

/**
 * 构建默认单聊场景成果文件。
 */
export const buildDialogueScenarioSeedArtifacts = (): Record<string, ArtifactItem[]> =>
  SCENARIO_DEFINITIONS.filter(definition => definition.seeded !== false).reduce<
    Record<string, ArtifactItem[]>
  >((result, definition) => {
    const bundle = buildSeedDialogueScenarioBundle(definition);
    if (bundle.artifacts.length) {
      result[definition.sessionId] = bundle.artifacts;
    }
    return result;
  }, {});

/**
 * 构建默认单聊场景右侧生成式面板。
 */
export const buildDialogueScenarioSeedPanels = (): Record<string, DialogueGeneratedPanelState> =>
  SCENARIO_DEFINITIONS.filter(definition => definition.seeded !== false).reduce<
    Record<string, DialogueGeneratedPanelState>
  >((result, definition) => {
    const bundle = buildSeedDialogueScenarioBundle(definition);
    if (bundle.panel) {
      result[definition.sessionId] = bundle.panel;
    }
    return result;
  }, {});

/**
 * 构建默认单聊场景结果卡片。
 */
export const buildDialogueScenarioSeedResults = (): Record<string, DialogueGeneratedResultItem[]> =>
  SCENARIO_DEFINITIONS.filter(definition => definition.seeded !== false).reduce<
    Record<string, DialogueGeneratedResultItem[]>
  >((result, definition) => {
    const bundle = buildSeedDialogueScenarioBundle(definition);
    if (bundle.results.length) {
      result[definition.sessionId] = bundle.results;
    }
    return result;
  }, {});
