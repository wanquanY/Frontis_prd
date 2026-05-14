import type { ArtifactItem } from "@/types/artifact";
import type { DialogueScenarioDefinition, DialogueScenarioFrame } from "@/types/dialogueScenario";

import {
  PRODUCT_MANAGER_BACKLOG_QUESTION,
  PRODUCT_MANAGER_PRD_QUESTION,
} from "@/mocks/dialogueScenario/aiCeoScenarioPrompts";
import {
  PRODUCT_MANAGER_ADMIN_PRD_DOCUMENT_CONTENT,
  PRODUCT_MANAGER_ADMIN_PRD_DOCUMENT_NAME,
  PRODUCT_MANAGER_BACKLOG_DOCUMENT_CONTENT,
  PRODUCT_MANAGER_BACKLOG_DOCUMENT_NAME,
  PRODUCT_MANAGER_OPERATIONS_PRD_DOCUMENT_CONTENT,
  PRODUCT_MANAGER_OPERATIONS_PRD_DOCUMENT_NAME,
  PRODUCT_MANAGER_PRD_DOCUMENT_CONTENT,
  PRODUCT_MANAGER_PRD_DOCUMENT_NAME,
  PRODUCT_MANAGER_WORKSPACE_PRD_DOCUMENT_CONTENT,
  PRODUCT_MANAGER_WORKSPACE_PRD_DOCUMENT_NAME,
} from "@/mocks/documents/productManagerDocuments";
import { dialogueScenarioRuntimeHelpers } from "@/utils/dialogueScenarioRuntime";

const {
  buildArtifactGroup,
  buildScenarioMessageFrame,
  createMarkdownArtifact,
  createTextBlock,
  createThinkingBlock,
  createToolUseBlock,
  estimateTypewriterDelay,
  prettyJson,
  resolveTextArtifactSize,
} = dialogueScenarioRuntimeHelpers;

const PRODUCT_MANAGER_PRD_FOLLOWUPS = [
  PRODUCT_MANAGER_BACKLOG_QUESTION,
  "把这版 PRD 的范围边界和不做项再补完整。",
  "继续给我一版阶段里程碑和评审节奏。",
  "把工作台、企业管理后台、运营管理后台三段范围拆成更清晰的小节。",
];

const PRODUCT_MANAGER_BACKLOG_FOLLOWUPS = [
  PRODUCT_MANAGER_PRD_QUESTION,
  "继续把 P0 项补成验收清单。",
  "把这版 Backlog 再按迭代拆成里程碑。",
  "帮我单独抽一段本期不做范围。",
];

const SCENARIO_SEED_ID = "dialogue-seed-product-manager-prd";

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
      "product-manager-operations-prd",
      PRODUCT_MANAGER_OPERATIONS_PRD_DOCUMENT_NAME,
      "产品经理AI专家",
      "运营管理后台 PRD 拆分",
      PRODUCT_MANAGER_OPERATIONS_PRD_DOCUMENT_CONTENT,
      "2026-04-08 10:45",
      resolveTextArtifactSize(PRODUCT_MANAGER_OPERATIONS_PRD_DOCUMENT_CONTENT),
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
      "我会沿着刚才的 PRD 继续往下拆，把工作台、企业管理后台和运营管理后台三段范围拆成 Epic、Feature 和 User Story。";
    const responseMarkdown = `我已把这版需求继续拆成《Frontis AI · Product Backlog》，现在右侧成果面板里会同时看到总览 PRD、3 份拆分 PRD 和 Backlog 这 5 份真实文档。

这版 Backlog 先收口了 3 件事：
1. 把工作台里的产品经理专家、默认 Agent 和模拟对话放到同一条交付链路里。
2. 把企业后台 AI 专家管理、组织管理和角色管理拆成明确故事。
3. 把运营管理后台的租户、商品、审核和平台配置能力同步到执行层。

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
          "建议先打通产品经理专家与真实 PRD/Backlog 文档链路，再补企业后台与运营管理后台联动说明。",
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
    "我先把目标、用户角色、核心范围和本期边界收清楚，再按工作台、企业管理后台、运营管理后台三段结构输出正式 PRD 草案。";
  const responseMarkdown = `我已经生成一版《Frontis AI · 正式 PRD》草案，并把核心结构先收好了。

这版 PRD 当前覆盖：
1. 产品目标、角色和跨系统关系。
2. 工作台、企业管理后台、运营管理后台三段范围。
3. 默认 Agent、激活码、版本管理等最近几轮调整。

右侧成果面板里已经放入仓库里的总览 PRD 和按工作台、企业管理后台、运营管理后台拆分的 3 份子 PRD；如果你继续往下推进，我建议下一步直接拆 Product Backlog，把 Epic、Feature 和 User Story 一次补齐。`;
  const toolBlocks = [
    createToolUseBlock({
      id: `${messageId}-tool-1`,
      name: "requirements_summary",
      displayName: "需求摘要",
      purpose: "收敛目标、角色和范围边界",
      status: "completed",
      output: prettyJson({
        modules: ["工作台", "企业管理后台", "运营管理后台"],
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

/**
 * 产品经理专家场景定义。
 */
export const PRODUCT_MANAGER_SCENARIO_DEFINITIONS: DialogueScenarioDefinition[] = [
  {
    employeeId: "employee-product-manager",
    agentName: "产品经理AI专家",
    sessionId: SCENARIO_SEED_ID,
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
];
