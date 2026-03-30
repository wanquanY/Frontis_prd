import type { SynClawArtifactItem } from "@/pages/synclaw/types";
import type { Block } from "@/types/block";
import { AI_CEO_AGENT_SCENARIO_QUESTIONS } from "@/constants/aiCeoScenarioPrompts";

import type {
  ChatMessage,
  DialogueGeneratedPanelState,
  DialogueGeneratedResultItem,
  DialogueGeneratedPanelStatus,
  DialogueSessionItem,
} from "./types";

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
  output?: string;
  isError?: boolean;
}

interface DialogueScenarioFrame {
  delayMs: number;
  preview: string;
  blocks: Block[];
  artifacts?: SynClawArtifactItem[];
  panel?: DialogueGeneratedPanelState;
  results?: DialogueGeneratedResultItem[];
}

interface DialogueScenarioDefinition {
  employeeId: string;
  agentName: string;
  sessionId: string;
  title: string;
  updatedAt: string;
  triggerQuestion: string;
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

const SCENARIO_SEED_IDS: Record<string, string> = {
  "employee-pm": "dialogue-seed-sequence-overview",
  "employee-designer": "dialogue-seed-employee-assess",
  "employee-research": "dialogue-seed-redline-detect",
  "employee-ops": "dialogue-seed-benchmark-find",
  "employee-sales": "dialogue-seed-score-rank",
  "employee-writer": "dialogue-seed-ceo-orchestration",
};

const FINAL_TEXT_BLOCK_SUFFIX = "-final";
const TYPEWRITER_BATCH_SIZE = 3;
const TYPEWRITER_STEP_MS = 28;
const TYPEWRITER_MIN_DELAY_MS = 900;
const TYPEWRITER_MAX_DELAY_MS = 3600;

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
};

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

const normalizeScenarioQuestion = (value: string): string => value.replace(/\s+/g, "").trim();

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

const cloneScenarioBlock = (block: Block): Block => ({
  ...block,
  data:
    typeof block.data === "object" && block.data !== null ? { ...block.data } : block.data,
  children: block.children?.map(cloneScenarioBlock),
});

const extractScenarioBlockContent = (block: Block): string => {
  if (typeof block.data !== "object" || block.data === null || !("content" in block.data)) {
    return "";
  }

  return typeof block.data.content === "string" ? block.data.content : "";
};

const buildScenarioBlockWithState = (
  block: Block,
  options: { id?: string; isStreaming: boolean },
): Block => {
  const nextBlock = cloneScenarioBlock(block);

  if (options.id) {
    nextBlock.id = options.id;
  }

  nextBlock.isStreaming = options.isStreaming;

  if (typeof nextBlock.data === "object" && nextBlock.data !== null) {
    nextBlock.data = {
      ...nextBlock.data,
      status: options.isStreaming ? "streaming" : "completed",
    };
  }

  return nextBlock;
};

const createScenarioNarrationBlock = (id: string, content: string, isStreaming: boolean): Block => ({
  id,
  kind: "text",
  data: {
    content,
    status: isStreaming ? "streaming" : "completed",
    role: "assistant",
  },
  actorRole: "assistant",
  isStreaming,
});

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

const buildScenarioMessageFrame = (
  messageId: string,
  children: Block[],
  preview: string,
  delayMs: number,
  artifacts?: SynClawArtifactItem[],
  results?: DialogueGeneratedResultItem[],
): DialogueScenarioFrame => ({
  delayMs,
  preview,
  artifacts,
  results,
  blocks: [
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
  ],
});

const expandFramesForTypewriter = (frames: DialogueScenarioFrame[]): DialogueScenarioFrame[] => {
  const timelineFrames: DialogueScenarioFrame[] = [];
  let messageId = "";
  let accumulatedChildren: Block[] = [];
  let thinkingStepIndex = 0;
  let narrationStepIndex = 0;
  let lastThinkingContent = "";
  let lastPreview = "";
  let hasShownAction = false;

  frames.forEach(frame => {
    const messageBlock = frame.blocks.find(block => block.kind === "message");
    const messageChildren = messageBlock?.children ?? [];
    const thinkingBlock = messageChildren.find(block => block.kind === "thinking");
    const toolBlocks = messageChildren.filter(block => block.kind === "tool_use");
    const resultCardBlocks = messageChildren.filter(block => block.kind === "result_cards");
    const finalTextBlocks = messageChildren.filter(
      block => block.kind === "text" && block.id.endsWith(FINAL_TEXT_BLOCK_SUFFIX),
    );
    const hasActionBlocks =
      toolBlocks.length > 0 || finalTextBlocks.length > 0 || resultCardBlocks.length > 0;
    const preview = frame.preview.trim();

    if (!messageId) {
      messageId = messageBlock?.id ?? `scenario-message-${Date.now()}`;
    }

    const thinkingContent = thinkingBlock ? extractScenarioBlockContent(thinkingBlock).trim() : "";

    if (thinkingBlock && thinkingContent) {
      if (accumulatedChildren.length === 0) {
        const nextThinkingId = `${thinkingBlock.id}-phase-${++thinkingStepIndex}`;
        accumulatedChildren = [
          ...accumulatedChildren,
          buildScenarioBlockWithState(thinkingBlock, {
            id: nextThinkingId,
            isStreaming: true,
          }),
        ];
        lastThinkingContent = thinkingContent;

        timelineFrames.push(
          buildScenarioMessageFrame(
            messageId,
            accumulatedChildren,
            preview || thinkingContent,
            estimateTypewriterDelay(thinkingContent),
          ),
        );

        if (!hasActionBlocks) {
          return;
        }

        accumulatedChildren = accumulatedChildren.map(child =>
          child.id === nextThinkingId
            ? buildScenarioBlockWithState(thinkingBlock, {
                id: nextThinkingId,
                isStreaming: false,
              })
            : child,
        );
      } else if (thinkingContent !== lastThinkingContent) {
        if (!hasShownAction && hasActionBlocks) {
          const lastThinkingBlock = [...accumulatedChildren]
            .reverse()
            .find(child => child.kind === "thinking");

          if (lastThinkingBlock) {
            accumulatedChildren = accumulatedChildren.map(child =>
              child.id === lastThinkingBlock.id
                ? buildScenarioBlockWithState(thinkingBlock, {
                    id: lastThinkingBlock.id,
                    isStreaming: false,
                  })
                : child,
            );
          }
        } else {
          const nextThinkingId = `${thinkingBlock.id}-phase-${++thinkingStepIndex}`;
          accumulatedChildren = [
            ...accumulatedChildren,
            buildScenarioBlockWithState(thinkingBlock, {
              id: nextThinkingId,
              isStreaming: true,
            }),
          ];

          timelineFrames.push(
            buildScenarioMessageFrame(
              messageId,
              accumulatedChildren,
              preview || thinkingContent,
              estimateTypewriterDelay(thinkingContent),
            ),
          );

          accumulatedChildren = accumulatedChildren.map(child =>
            child.id === nextThinkingId
              ? buildScenarioBlockWithState(thinkingBlock, {
                  id: nextThinkingId,
                  isStreaming: false,
                })
              : child,
          );
        }

        lastThinkingContent = thinkingContent;
      }
    }

    if (preview && preview !== lastPreview && hasActionBlocks) {
      const narrationBlockId = `${messageId}-narration-${++narrationStepIndex}`;
      accumulatedChildren = [
        ...accumulatedChildren,
        createScenarioNarrationBlock(narrationBlockId, preview, true),
      ];

      timelineFrames.push(
        buildScenarioMessageFrame(
          messageId,
          accumulatedChildren,
          preview,
          estimateTypewriterDelay(preview),
        ),
      );

      accumulatedChildren = accumulatedChildren.map(child =>
        child.id === narrationBlockId
          ? createScenarioNarrationBlock(narrationBlockId, preview, false)
          : child,
      );
      lastPreview = preview;
    }

    toolBlocks.forEach(block => {
      accumulatedChildren = upsertScenarioChildBlock(accumulatedChildren, cloneScenarioBlock(block));
    });

    finalTextBlocks.forEach(block => {
      accumulatedChildren = upsertScenarioChildBlock(accumulatedChildren, cloneScenarioBlock(block));
    });

    resultCardBlocks.forEach(block => {
      accumulatedChildren = upsertScenarioChildBlock(accumulatedChildren, cloneScenarioBlock(block));
    });

    if (hasActionBlocks || frame.artifacts?.length || frame.results?.length) {
      const streamingContents = accumulatedChildren
        .filter(child => child.isStreaming === true)
        .map(child => extractScenarioBlockContent(child).trim())
        .filter(Boolean);
      const delayMs = streamingContents.length
        ? streamingContents.reduce<number>(
            (longestDelay, content) => Math.max(longestDelay, estimateTypewriterDelay(content)),
            frame.delayMs,
          )
        : frame.delayMs;

      timelineFrames.push(
        buildScenarioMessageFrame(
          messageId,
          accumulatedChildren,
          preview,
          delayMs,
          frame.artifacts,
          frame.results,
        ),
      );
      hasShownAction = true;
    }
  });

  return timelineFrames;
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

const createTextBlock = (
  id: string,
  content: string,
  options?: CreateTextBlockOptions,
): Block => ({
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

const createResultCardsBlock = (
  id: string,
  results: DialogueGeneratedResultItem[],
): Block => ({
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
  output,
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

const createMarkdownArtifact = (
  sessionId: string,
  suffix: string,
  fileName: string,
  producerName: string,
  taskName: string,
  content: string,
  producedAt: string,
  fileSize: string,
): SynClawArtifactItem => ({
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
): SynClawArtifactItem => ({
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
): SynClawArtifactItem => ({
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
): SynClawArtifactItem => ({
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
  artifacts: SynClawArtifactItem[],
  suffix: string,
): SynClawArtifactItem | undefined =>
  artifacts.find(item => item.id.endsWith(suffix));

const buildArtifactGroup = (
  ...artifacts: Array<SynClawArtifactItem | undefined>
): SynClawArtifactItem[] =>
  artifacts.filter((item): item is SynClawArtifactItem => Boolean(item));

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
      { id: "strategy", label: "战略一致性", weightLabel: "权重 12%", score: "88", delta: "-0.3", tone: "warning" },
      { id: "culture", label: "文化契合度", weightLabel: "权重 15%", score: "95", delta: "+1.6", tone: "positive" },
      { id: "execution", label: "执行可行性", weightLabel: "权重 12%", score: "92", delta: "-1.5", tone: "positive" },
      { id: "risk", label: "风险管控", weightLabel: "权重 12%", score: "94", delta: "+0.7", tone: "positive" },
      { id: "innovation", label: "创新价值", weightLabel: "权重 9%", score: "85", delta: "+0.9", tone: "warning" },
      { id: "craft", label: "匠心细节", weightLabel: "权重 13%", score: "95", delta: "+2.1", tone: "positive" },
      { id: "digital", label: "数字化思维", weightLabel: "权重 13%", score: "82", delta: "+0.4", tone: "warning" },
      { id: "safety", label: "安全刚性", weightLabel: "权重 14%", score: "90", delta: "+1.2", tone: "positive" },
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
    status === "running"
      ? "正在回放原始证据并生成约谈动作"
      : "红线判断与约谈动作已完成收口",
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
      { id: "seq4", name: "销售序列", summary: "关注区扩大，底线问题需单列处理。", tone: "warning" },
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
      { id: "risk1", name: "李明", summary: "诚信底线已碰线，不能按普通关注区处理。", tone: "danger" },
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
    questionSuggestions: ["某个员工最近表现怎么样", "哪个部门需要重点关注", "会议纪要里有什么值得注意的"],
    inputPlaceholder: "输入你的问题...",
  },
});

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

const buildSequenceOverviewArtifacts = (sessionId: string): SynClawArtifactItem[] => {
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

const buildEmployeeAssessArtifacts = (sessionId: string): SynClawArtifactItem[] => {
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

const buildRedlineArtifacts = (sessionId: string): SynClawArtifactItem[] => {
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

const buildBenchmarkArtifacts = (sessionId: string): SynClawArtifactItem[] => {
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

const buildScoreRankArtifacts = (sessionId: string): SynClawArtifactItem[] => {
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

const buildCeoArtifacts = (sessionId: string): SynClawArtifactItem[] => {
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
    employee: { name: "王建国", score: 84, trend: "+6", strongest: "风险预判", weakest: "数字化思维" },
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
    },
  ];
};

const SCENARIO_DEFINITIONS: DialogueScenarioDefinition[] = [
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
    sessionId: SCENARIO_SEED_IDS["employee-writer"],
    title: "CEO综合研判",
    updatedAt: "10:18",
    triggerQuestion: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-writer"],
    buildFrames: buildCeoFrames,
  },
];

const buildSeedAssistantMessage = (
  definition: DialogueScenarioDefinition,
  sessionId: string,
): ChatMessage => {
  const frames = expandFramesForTypewriter(definition.buildFrames(sessionId));
  const lastFrame = frames[frames.length - 1];

  return {
    id: `${sessionId}-assistant-message`,
    role: "assistant",
    author: definition.agentName,
    content: lastFrame.preview,
    timeLabel: definition.updatedAt,
    blocks: lastFrame.blocks,
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
  const matched = SCENARIO_DEFINITIONS.find(
    item =>
      item.employeeId === employeeId &&
      normalizeScenarioQuestion(item.triggerQuestion) === normalizeScenarioQuestion(question),
  );
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
  SCENARIO_DEFINITIONS.map(definition => {
    const sessionId = definition.sessionId;
    const frames = definition.buildFrames(sessionId);
    const lastFrame = frames[frames.length - 1];

    return {
      id: sessionId,
      employeeId: definition.employeeId,
      title: definition.title,
      preview: lastFrame.preview,
      updatedAt: definition.updatedAt,
      messages: [
        {
          id: `${sessionId}-user-message`,
          role: "user",
          author: "你",
          content: definition.triggerQuestion,
          timeLabel: definition.updatedAt,
        },
        buildSeedAssistantMessage(definition, sessionId),
      ],
    };
  });

/**
 * 构建默认单聊场景成果文件。
 */
export const buildDialogueScenarioSeedArtifacts = (): Record<string, SynClawArtifactItem[]> =>
  SCENARIO_DEFINITIONS.reduce<Record<string, SynClawArtifactItem[]>>((result, definition) => {
    const frames = definition.buildFrames(definition.sessionId);
    const lastFrame = frames[frames.length - 1];
    if (lastFrame.artifacts?.length) {
      result[definition.sessionId] = lastFrame.artifacts;
    }
    return result;
  }, {});

/**
 * 构建默认单聊场景右侧生成式面板。
 */
export const buildDialogueScenarioSeedPanels = (): Record<string, DialogueGeneratedPanelState> =>
  SCENARIO_DEFINITIONS.reduce<Record<string, DialogueGeneratedPanelState>>((result, definition) => {
    const frames = definition.buildFrames(definition.sessionId);
    const lastFrame = [...frames].reverse().find(item => item.panel);
    if (lastFrame?.panel) {
      result[definition.sessionId] = lastFrame.panel;
    }
    return result;
  }, {});

/**
 * 构建默认单聊场景结果卡片。
 */
export const buildDialogueScenarioSeedResults = (): Record<string, DialogueGeneratedResultItem[]> =>
  SCENARIO_DEFINITIONS.reduce<Record<string, DialogueGeneratedResultItem[]>>(
    (result, definition) => {
      const frames = definition.buildFrames(definition.sessionId);
      const lastFrame = [...frames].reverse().find(item => item.results?.length);
      if (lastFrame?.results?.length) {
        result[definition.sessionId] = lastFrame.results;
      }
      return result;
    },
    {},
  );
