import type { ArtifactItem } from "@/types/artifact";
import type { Block } from "@/types/block";
import {
  PRODUCT_TEAM_COLLAB_FOLLOWUPS,
  PRODUCT_TEAM_MAIN_AGENT_NAME,
  PRODUCT_TEAM_RISK_FOLLOWUPS,
  PRODUCT_TEAM_RISK_QUESTION,
} from "@/mocks/dialogueScenario/productTeamScenarioMock";

import type { DialogueGeneratedPanelState, DialogueGeneratedResultItem } from "@/pages/types";
import {
  buildProductTeamArtifacts,
  buildProductTeamCollabResults,
  buildProductTeamRiskResults,
} from "./productTeamSupport";
import type { ProductTeamScenarioSupportHelpers } from "./productTeamSupport";
import { getAvatarUrl } from "@/pages/utils";

interface DialogueScenarioMessageSnapshotLike {
  key: string;
  author?: string;
  preview: string;
  blocks: Block[];
  followupSuggestions?: string[];
}

interface DialogueScenarioFrameLike {
  delayMs: number;
  preview: string;
  blocks: Block[];
  messages?: DialogueScenarioMessageSnapshotLike[];
  artifacts?: ArtifactItem[];
  panel?: DialogueGeneratedPanelState;
  results?: DialogueGeneratedResultItem[];
  followupSuggestions?: string[];
}

interface CreateTextBlockOptionsLike {
  isStreaming?: boolean;
  messageType?: string;
}

interface CreateToolUseBlockOptionsLike {
  id: string;
  name: string;
  displayName: string;
  purpose: string;
  status: string;
  avatarUrl?: string;
  avatarLabel?: string;
  output?: string;
}

interface BuildScenarioMessageSnapshotOptionsLike {
  author?: string;
  results?: DialogueGeneratedResultItem[];
  followupSuggestions?: string[];
}

interface ProductTeamFrameRuntimeHelpers {
  buildArtifactGroup: (...artifacts: Array<ArtifactItem | undefined>) => ArtifactItem[];
  buildScenarioConversationFrame: (
    messages: DialogueScenarioMessageSnapshotLike[],
    preview: string,
    delayMs: number,
    artifacts?: ArtifactItem[],
    panel?: DialogueGeneratedPanelState,
    results?: DialogueGeneratedResultItem[],
    followupSuggestions?: string[],
  ) => DialogueScenarioFrameLike;
  buildScenarioMessageSnapshot: (
    messageId: string,
    preview: string,
    children: Block[],
    options?: BuildScenarioMessageSnapshotOptionsLike,
  ) => DialogueScenarioMessageSnapshotLike;
  createTextBlock: (id: string, content: string, options?: CreateTextBlockOptionsLike) => Block;
  createThinkingBlock: (id: string, content: string, isStreaming?: boolean) => Block;
  createToolUseBlock: (options: CreateToolUseBlockOptionsLike) => Block;
  estimateTypewriterDelay: (content: string) => number;
  getScenarioArtifactBySuffix: (
    artifacts: ArtifactItem[],
    suffix: string,
  ) => ArtifactItem | undefined;
  prettyJson: (value: unknown) => string;
}

const PRODUCT_TEAM_ARCHITECT_AVATAR_URL = getAvatarUrl("employee-architect");
const PRODUCT_TEAM_GROWTH_AVATAR_URL = getAvatarUrl("employee-growth");
const PRODUCT_TEAM_QA_AVATAR_URL = getAvatarUrl("employee-qa");
const PRODUCT_TEAM_DATA_AVATAR_URL = getAvatarUrl("employee-data");
const PRODUCT_TEAM_USER_RESEARCH_AVATAR_URL = getAvatarUrl("employee-user-researcher");

export const buildProductTeamCollabFrames = (
  sessionId: string,
  runtimeHelpers: ProductTeamFrameRuntimeHelpers,
  supportHelpers: ProductTeamScenarioSupportHelpers,
): DialogueScenarioFrameLike[] => {
  const {
    buildArtifactGroup,
    buildScenarioConversationFrame,
    buildScenarioMessageSnapshot,
    createTextBlock,
    createThinkingBlock,
    createToolUseBlock,
    estimateTypewriterDelay,
    getScenarioArtifactBySuffix,
    prettyJson,
  } = runtimeHelpers;
  const messageId = `${sessionId}-assistant`;
  const artifacts = buildProductTeamArtifacts(supportHelpers, sessionId, "delivery");
  const architectureArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-architecture");
  const acceptanceArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-acceptance");
  const metricsArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-metrics");
  const userResearchArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-user-research");
  const collabResults = buildProductTeamCollabResults(supportHelpers, sessionId);
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

export const buildProductTeamRiskFrames = (
  sessionId: string,
  runtimeHelpers: ProductTeamFrameRuntimeHelpers,
  supportHelpers: ProductTeamScenarioSupportHelpers,
): DialogueScenarioFrameLike[] => {
  const {
    buildArtifactGroup,
    buildScenarioConversationFrame,
    buildScenarioMessageSnapshot,
    createTextBlock,
    createThinkingBlock,
    createToolUseBlock,
    estimateTypewriterDelay,
    getScenarioArtifactBySuffix,
    prettyJson,
  } = runtimeHelpers;
  const messageId = `${sessionId}-assistant`;
  const artifacts = buildProductTeamArtifacts(supportHelpers, sessionId, "risk");
  const acceptanceArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-acceptance");
  const metricsArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-metrics");
  const riskArtifact = getScenarioArtifactBySuffix(artifacts, "team-product-collab-risk");
  const riskResults = buildProductTeamRiskResults(supportHelpers, sessionId);
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
