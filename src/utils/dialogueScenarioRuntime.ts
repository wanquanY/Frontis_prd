import type { ArtifactItem } from "@/types/artifact";
import type { Block } from "@/types/block";
import { formatFileSize } from "@/utils/file";

import type {
  DialogueGeneratedPanelState,
  DialogueGeneratedPanelStatus,
  DialogueGeneratedResultItem,
} from "@/pages/types";
import type {
  DialogueScenarioFrame,
  DialogueScenarioMessageSnapshot,
} from "@/types/dialogueScenario";

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

export interface ScenarioContactLookupItem {
  id: string;
  name: string;
  avatarLabel?: string;
  typeLabel: string;
  identityLabel: string;
  feishuId: string;
  matchLabel?: string;
  note?: string;
}

export interface ScenarioDispatchRecipientSeed {
  id: string;
  name: string;
  roleLabel: string;
  channelLabel: string;
  statusLabel: string;
  summary: string;
  note?: string;
  tone?: "accent" | "positive" | "warning" | "danger";
}

export interface ScenarioDispatchConversationSeed {
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

interface ScenarioMessagePlaybackState {
  key: string;
  messageId: string;
  author?: string;
  preview: string;
  children: Block[];
  followupSuggestions?: string[];
  lastThinkingContent: string;
  thinkingContentBySourceId?: Map<string, string>;
}

export interface CreateScenarioDispatchResultItemParams {
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
}

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
      const lastTextBlockIndex = messageChildren.reduce<number>(
        (lastIndex, block, index) => (block.kind === "text" ? index : lastIndex),
        -1,
      );
      const preview = frameMessage.preview.trim();
      let messageHasPushedFrame = false;
      const thinkingContentBySourceId =
        state.thinkingContentBySourceId ?? new Map<string, string>();

      state.author = frameMessage.author;
      state.followupSuggestions = frameMessage.followupSuggestions;
      state.thinkingContentBySourceId = thinkingContentBySourceId;

      messageChildren.forEach((block, index) => {
        if (block.kind === "thinking") {
          const thinkingContent = extractScenarioBlockContent(block).trim();
          const previousThinkingContent = thinkingContentBySourceId.get(block.id) ?? "";

          if (!thinkingContent) {
            return;
          }

          if (thinkingContent !== previousThinkingContent) {
            const hasLaterBlocks = messageChildren
              .slice(index + 1)
              .some(nextBlock => nextBlock.kind !== "thinking");
            const nextThinkingId = resolveThinkingBlockId(state, block.id);

            messageHasPushedFrame =
              streamTextualBlock(pendingFrames, state, block, nextThinkingId, thinkingContent, {
                keepStreamingAtEnd:
                  !hasLaterBlocks && (frameMessage.followupSuggestions?.length ?? 0) === 0,
                preview: preview || thinkingContent,
                panel: !hasLaterBlocks ? frame.panel : undefined,
                followupSuggestions: !hasLaterBlocks ? frame.followupSuggestions : undefined,
              }) || messageHasPushedFrame;
            state.lastThinkingContent = thinkingContent;
            thinkingContentBySourceId.set(block.id, thinkingContent);

            return;
          }

          const latestThinkingBlock = getLatestThinkingBlock(state);
          if (latestThinkingBlock) {
            finalizeStreamingBlock(state, block, latestThinkingBlock.id);
          }
          return;
        }

        if (block.kind === "text") {
          const textContent = extractScenarioBlockContent(block);

          if (!textContent) {
            state.children = upsertScenarioChildBlock(state.children, cloneScenarioBlock(block));
            return;
          }

          const isLastTextBlock = index === lastTextBlockIndex;
          messageHasPushedFrame =
            streamTextualBlock(pendingFrames, state, block, block.id, textContent, {
              keepStreamingAtEnd: block.isStreaming === true,
              preview: preview || textContent,
              artifacts: isLastTextBlock ? frame.artifacts : undefined,
              panel: isLastTextBlock ? frame.panel : undefined,
              results: isLastTextBlock ? frame.results : undefined,
              followupSuggestions: isLastTextBlock ? frame.followupSuggestions : undefined,
            }) || messageHasPushedFrame;
          return;
        }

        if (upsertStaticBlocks(state, [block])) {
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
      });

      if (
        !messageHasPushedFrame &&
        (frame.artifacts?.length ||
          frame.results?.length ||
          messageChildren.length > 0 ||
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

const createHtmlArtifact = (
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
  fileType: "html",
  producerName,
  producedAt,
  fileSize,
  taskName,
  canonicalPath: createDataUrl("text/html", content),
  mimeType: "text/html",
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

/**
 * 对场景问题做归一化匹配。
 */
export { normalizeScenarioQuestion };

/**
 * 场景运行时公共构造能力。
 */
export const dialogueScenarioRuntimeHelpers = {
  buildArtifactGroup,
  buildScenarioConversationFrame,
  buildScenarioMessageFrame,
  buildScenarioMessageSnapshot,
  createAssistantMessageBlock,
  createGeneratedResultItem,
  createHtmlArtifact,
  createImageArtifact,
  createJsonArtifact,
  createMarkdownArtifact,
  createScenarioDispatchExecutionPanelState,
  createScenarioDispatchResultItem,
  createSvgArtifact,
  createTextBlock,
  createThinkingBlock,
  createToolUseBlock,
  estimateTypewriterDelay,
  getScenarioArtifactBySuffix,
  prettyJson,
  resolveTextArtifactSize,
};

/**
 * 将场景帧展开为打字机时间线。
 */
export { expandFramesForTypewriter };
