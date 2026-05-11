import type { ArtifactItem } from "@/types/artifact";
import type { Block, ToolContactLookupItem, ToolSearchResultItem } from "@/types/block";
import type { AttachmentItem, ChatMessage } from "@/pages/types";

interface MetaAgentHistoryRound {
  assistantContent: string;
  assistantBlocks?: (round: MetaAgentHistoryRound, agentName: string, sessionId: string) => Block[];
  attachments?: AttachmentItem[];
  dateTime: string;
  id: string;
  userContent: string;
}

interface CreateMetaAgentToolBlockOptions {
  id: string;
  name: string;
  displayName: string;
  purpose: string;
  goalId?: string;
  goalTitle?: string;
  status?: string;
  output?: string;
  isError?: boolean;
  avatarLabel?: string;
  searchResults?: ToolSearchResultItem[];
  contactResults?: ToolContactLookupItem[];
}

const META_AGENT_TOOL_GUIDE_SUFFIX = "metaagent-tool-display-guide";
const META_AGENT_PRD_PATCH_SUFFIX = "metaagent-prd-me-update";

const META_AGENT_TOOL_GUIDE_CONTENT = `# ME 工具消息展示样例

## 展示原则

- 本地工具只展示中文能力名称、状态和一句话摘要。
- 没有必要展开的工具不提供展开入口。
- 文件创建、文件编辑、内容搜索、Shell、HTTP 请求和网页抓取可展开查看关键摘要。
- Skill、MCP 和 Workbench Task 使用同一套过程消息样式，但名称来自配置或实际被调用对象。
`;

const META_AGENT_PRD_PATCH_CONTENT = `# ME 能力补充说明

## 本轮调整

1. ME 能力总表不再出现是否展开列。
2. 基础对话只描述输入、消息、时间和状态保留。
3. 展开规则只保留在思考块、工具、Skill/MCP 和 Workbench Task 这些特殊过程事件中。
4. 本轮创建或编辑文件后，最终回复结尾追加文件卡片。
`;

const createMockAttachment = (
  id: string,
  name: string,
  size: number,
  mimeType: string,
): AttachmentItem => ({
  id,
  name,
  size,
  sizeLabel: `${Math.max(1, Math.round(size / 1024))} KB`,
  mimeType,
});

const createTextBlock = (id: string, content: string): Block => ({
  id,
  kind: "text",
  data: {
    content,
    role: "assistant",
    status: "completed",
  },
  actorRole: "assistant",
});

const createThinkingBlock = (id: string, content: string): Block => ({
  id,
  kind: "thinking",
  data: {
    content,
    status: "completed",
  },
  actorRole: "assistant",
});

const createToolUseBlock = ({
  id,
  name,
  displayName,
  purpose,
  goalId,
  goalTitle,
  status = "success",
  output,
  isError,
  avatarLabel,
  searchResults,
  contactResults,
}: CreateMetaAgentToolBlockOptions): Block => {
  const callId = `${id}-call`;

  return {
    id,
    kind: "tool_use",
    data: {
      name,
      display_name: displayName,
      call_id: callId,
      purpose,
      goal_id: goalId,
      goal_title: goalTitle,
      status,
      avatar_label: avatarLabel,
      search_results: searchResults,
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

const createArtifactBlock = (id: string, artifactId: string, title: string): Block => ({
  id,
  kind: "artifact",
  data: {
    artifact_id: artifactId,
    kind: "markdown",
    title,
    status: "completed",
    format: "markdown",
  },
  actorRole: "assistant",
});

const createAssistantMessageBlocks = (
  messageId: string,
  children: Block[],
  agentName: string,
): Block[] => [
  {
    id: `${messageId}-message`,
    kind: "message",
    data: {
      role: "assistant",
    },
    actorRole: "assistant",
    actorName: agentName,
    children,
  },
];

const createMarkdownArtifact = (
  sessionId: string,
  suffix: string,
  fileName: string,
  producerName: string,
  taskName: string,
  content: string,
  producedAt: string,
): ArtifactItem => ({
  id: `${sessionId}-${suffix}`,
  artifactId: `${sessionId}-${suffix}`,
  fileName,
  fileType: "md",
  producerName,
  producedAt,
  fileSize: `${Math.max(1, Math.ceil(new TextEncoder().encode(content).length / 1024))} KB`,
  taskName,
  canonicalPath: `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`,
  mimeType: "text/markdown",
});

export const buildMetaAgentCapabilityDemoArtifacts = (
  sessionId: string,
  agentName: string,
): ArtifactItem[] => [
  createMarkdownArtifact(
    sessionId,
    META_AGENT_TOOL_GUIDE_SUFFIX,
    "ME 工具消息展示样例.md",
    agentName,
    "ME 工具展示梳理",
    META_AGENT_TOOL_GUIDE_CONTENT,
    "10:42",
  ),
  createMarkdownArtifact(
    sessionId,
    META_AGENT_PRD_PATCH_SUFFIX,
    "ME 能力补充说明.md",
    agentName,
    "ME 能力补充",
    META_AGENT_PRD_PATCH_CONTENT,
    "11:15",
  ),
];

const buildLocalToolDemoBlocks = (
  round: MetaAgentHistoryRound,
  agentName: string,
  sessionId: string,
): Block[] => {
  const messageId = `metaagent-history-${round.id}-assistant`;
  const guideArtifactId = `${sessionId}-${META_AGENT_TOOL_GUIDE_SUFFIX}`;

  return createAssistantMessageBlocks(
    messageId,
    [
      createThinkingBlock(
        `${messageId}-thinking`,
        "我先把这轮任务拆成三段：读取现有文档和目录，定位需要调整的 ME 规则，再生成一份可预览的工具消息展示样例。基础对话不需要展开，只有过程里的特殊事件才需要展开策略。",
      ),
      createToolUseBlock({
        id: `${messageId}-todo`,
        name: "write_todos",
        displayName: "任务列表管理",
        purpose: "更新本轮处理步骤：梳理能力、检查文档、生成样例",
      }),
      createToolUseBlock({
        id: `${messageId}-ls`,
        name: "ls",
        displayName: "列出目录",
        purpose: "查看当前工作区文档和原型文件",
      }),
      createToolUseBlock({
        id: `${messageId}-glob`,
        name: "glob",
        displayName: "文件模式搜索",
        purpose: "查找 5-15 PRD、需求池和 ME mock 数据文件",
      }),
      createToolUseBlock({
        id: `${messageId}-read`,
        name: "read_file",
        displayName: "读取文件",
        purpose: "读取 ME 能力总表和基础对话段落",
      }),
      createToolUseBlock({
        id: `${messageId}-grep`,
        name: "grep",
        displayName: "内容搜索",
        purpose: "定位不应该出现“是否展开”的表格列",
        output:
          "命中 4 处需要调整的位置：ME 能力总表、基础对话能力、任务结束文件卡片、工作记录。保留本地工具、Skill/MCP、Workbench Task 的展开规则。",
      }),
      createTextBlock(
        `${messageId}-mid-text`,
        "我先把不该展开的普通能力收掉，再用工具消息演示需要展开和不需要展开的差异。",
      ),
      createToolUseBlock({
        id: `${messageId}-fetch`,
        name: "fetch_url",
        displayName: "网页抓取",
        purpose: "抓取 logo 地址并确认品牌资源可访问",
        output:
          "目标：https://go.frontis.top/workspace/logo.svg\n结果：资源可访问，作为侧边栏品牌 logo 使用。",
      }),
      createToolUseBlock({
        id: `${messageId}-http`,
        name: "http_request",
        displayName: "HTTP 请求",
        purpose: "请求运营配置接口样例，确认新用户初始化模板字段",
        output:
          "GET /api/mock/ops/new-user-template\nstatus: 200\n返回字段：enabled、permissionIds、updatedAt。模板只影响自动注册初始化，不生成固定角色。",
      }),
      createToolUseBlock({
        id: `${messageId}-shell`,
        name: "shell",
        displayName: "执行 Shell 命令",
        purpose: "运行文本校验，确认旧口径已经清理",
        output:
          'rg "是否展开|预设角色|普通成员创建" Frontis AI · 5-15 PRD.md\n结果：仅保留工具、Skill/MCP、Workbench Task 明细中的展开规则。',
      }),
      createToolUseBlock({
        id: `${messageId}-write`,
        name: "write_file",
        displayName: "创建/写入文件",
        purpose: "生成 ME 工具消息展示样例文档",
        output:
          "已创建 ME 工具消息展示样例.md\n路径：/workspace/docs/ME 工具消息展示样例.md\n内容包括：不展开工具、可展开工具、Skill/MCP、Workbench Task 和文件卡片示例。",
      }),
      createTextBlock(
        `${messageId}-final`,
        `这轮我把本地工具的展示样例补齐了：读取文件、列出目录、文件模式搜索、任务列表管理只保留摘要和状态；内容搜索、Shell、HTTP 请求、网页抓取、创建/写入文件提供展开入口，用来查看关键结果摘要。`,
      ),
      createArtifactBlock(
        `${messageId}-artifact-tool-guide`,
        guideArtifactId,
        "ME 工具消息展示样例.md",
      ),
    ],
    agentName,
  );
};

const buildSkillMcpTaskDemoBlocks = (
  round: MetaAgentHistoryRound,
  agentName: string,
  sessionId: string,
): Block[] => {
  const messageId = `metaagent-history-${round.id}-assistant`;
  const prdPatchArtifactId = `${sessionId}-${META_AGENT_PRD_PATCH_SUFFIX}`;

  return createAssistantMessageBlocks(
    messageId,
    [
      createThinkingBlock(
        `${messageId}-thinking`,
        "这轮我会先读用户给的能力清单，再调用 Skill 做表格结构校验，通过 MCP 取在线文档版本，最后把需要协作的部分分给 AI 专家。过程消息要按真实顺序出现，不能把所有工具挤在一起。",
      ),
      createToolUseBlock({
        id: `${messageId}-read-attachment`,
        name: "read_file",
        displayName: "读取文件",
        purpose: "读取 MA能力清单.md.md 中的 ME 能力列表",
      }),
      createToolUseBlock({
        id: `${messageId}-skill`,
        name: "skill_requirement_table_check",
        displayName: "需求表结构校验",
        purpose: "检查 ME 能力表是否把基础对话和过程事件混在一起",
        output:
          "校验结论：基础对话、文件卡片、工作记录不应配置“是否展开”；展开只适用于思考块、工具调用、Skill/MCP 和 Workbench Task。",
      }),
      createToolUseBlock({
        id: `${messageId}-mcp`,
        name: "mcp_feishu_doc_read",
        displayName: "飞书文档读取",
        purpose: "读取在线 PRD 中 ME 章节的最新版本",
        output:
          "已读取 Frontis AI · 5-15 PRD 的 ME 章节。当前线上版本仍存在“是否展开”泛化描述，需要和本地 PRD 保持一致。",
      }),
      createTextBlock(
        `${messageId}-after-mcp`,
        "我确认问题不是所有能力都要配展开，而是过程中的特殊事件才需要有展开策略。下面我按两个 Goal 分发：先复核任务分组口径，再校准任务状态回填规则。",
      ),
      createToolUseBlock({
        id: `${messageId}-dispatch`,
        name: "task_dispatch",
        displayName: "任务分发",
        purpose: "分配给数据洞察师：复核任务卡片的多 Goal 分组口径",
        goalId: "goal-task-structure",
        goalTitle: "Goal 1：梳理任务分组机制",
        avatarLabel: "数",
      }),
      createToolUseBlock({
        id: `${messageId}-continue`,
        name: "workbench-task continue",
        displayName: "任务继续",
        purpose: "任务继续 - 数据洞察师：补充 Goal 下多任务的排序规则",
        goalId: "goal-task-structure",
        goalTitle: "Goal 1：梳理任务分组机制",
        output:
          "补充要求：任务卡片标题改为“任务”；一个 Goal 下可以有多个任务，任务按真实执行顺序展示。",
        avatarLabel: "数",
      }),
      createToolUseBlock({
        id: `${messageId}-done`,
        name: "workbench-task done",
        displayName: "任务完成",
        purpose: "任务完成 - 数据洞察师：任务分组与状态规则已回齐",
        goalId: "goal-task-structure",
        goalTitle: "Goal 1：梳理任务分组机制",
        output:
          "数据洞察师结论：任务区只在本轮调用 AI 专家时展示；状态限定为执行中、执行完成、执行失败；收起态只显示最新任务。",
        avatarLabel: "数",
      }),
      createToolUseBlock({
        id: `${messageId}-fail`,
        name: "workbench-task fail",
        displayName: "任务失败",
        purpose: "任务失败 - 状态回填助手：首次回写任务状态超时",
        goalId: "goal-task-status",
        goalTitle: "Goal 2：校准任务状态回填",
        status: "failed",
        output:
          "失败原因：状态回填接口超时，未写入最新任务状态。处理方式：保留当前任务记录，重新发起状态回写。",
        isError: true,
        avatarLabel: "状",
      }),
      createToolUseBlock({
        id: `${messageId}-status-retry`,
        name: "workbench-task continue",
        displayName: "任务继续",
        purpose: "任务继续 - 状态回填助手：重试同步最新任务状态",
        goalId: "goal-task-status",
        goalTitle: "Goal 2：校准任务状态回填",
        status: "running",
        output:
          "正在重试：只回填任务区需要展示的任务名称、AI 专家头像和名称，以及执行中、执行完成、执行失败三类状态。",
        avatarLabel: "状",
      }),
      createToolUseBlock({
        id: `${messageId}-edit`,
        name: "edit_file",
        displayName: "编辑文件",
        purpose: "调整 PRD 中 ME 能力总表和基础对话表格",
        output:
          "已编辑 Frontis AI · 5-15 PRD.md：移除 ME 能力总表、基础对话、文件卡片和工作记录中的“是否展开”列。",
      }),
      createToolUseBlock({
        id: `${messageId}-write`,
        name: "write_file",
        displayName: "创建/写入文件",
        purpose: "生成 ME 能力补充说明文档",
        output:
          "已写入 ME 能力补充说明.md\n路径：/workspace/docs/ME 能力补充说明.md\n用途：说明展开规则只作用于对话中的特殊过程事件。",
      }),
      createTextBlock(
        `${messageId}-final`,
        `我已经把这轮涉及的 Skill、MCP 和 AI 专家协作都按 ME 的过程消息规则串起来了。任务卡片按 Goal 分组：一个 Goal 下可以连续展示多个任务，收起时只保留最新任务状态。`,
      ),
      createArtifactBlock(
        `${messageId}-artifact-prd-patch`,
        prdPatchArtifactId,
        "ME 能力补充说明.md",
      ),
    ],
    agentName,
  );
};

const META_AGENT_HISTORY_ROUNDS: MetaAgentHistoryRound[] = [
  {
    id: "customer-retention-review",
    dateTime: "2025-12-21 09:26",
    userContent:
      "我把上季度售后问题汇总表和用户访谈摘录发你，帮我找最影响复购的三类问题，并给一版处理优先级。",
    attachments: [
      createMockAttachment(
        "history-attachment-after-sales-xlsx",
        "Q4售后工单导出.xlsx",
        436_224,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
      createMockAttachment(
        "history-attachment-interview-docx",
        "复购用户访谈摘录.docx",
        184_320,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ],
    assistantContent: `我把工单和访谈先合并成一张问题-人群-影响面视图，复购影响最高的是三类：

1. 退换货进度不透明：用户不是不能等，而是不知道下一步是谁处理、多久反馈。
2. 售后补偿口径不一致：同一类问题在不同客服之间给出的方案差异太大，会削弱信任。
3. 高价值用户缺少主动回访：有复购意愿的人没有被及时识别，导致问题解决后没有二次触达。

建议先做 P0：把退换货状态通知和补偿标准收敛成统一 SOP；P1 再做高价值用户回访名单和回访话术。`,
  },
  {
    id: "membership-benefit-planning",
    dateTime: "2026-01-18 14:08",
    userContent:
      "这份会员运营周报帮我看一下，春节前哪些权益应该保留，哪些权益可以暂停，不要只看领取量，要看复购和毛利。",
    attachments: [
      createMockAttachment(
        "history-attachment-member-weekly-pdf",
        "会员运营周报-第3周.pdf",
        512_880,
        "application/pdf",
      ),
    ],
    assistantContent: `我按“领取率、核销率、复购贡献、毛利影响”四个维度看完了。

保留：满减券和会员专属组合装，虽然成本高一点，但能拉动复购且客单价更稳。

暂停：无门槛小额券和抽奖积分，它们领取量高，但带来的复购很弱，且客服解释成本偏高。

补充建议：春节前不要新增复杂权益，重点做两件事：老客复购券按品类分层发放；高毛利组合装绑定会员专享价。`,
  },
  {
    id: "store-inspection-cleanup",
    dateTime: "2026-02-05 10:40",
    userContent:
      "上传的是门店巡检照片清单和整改记录，帮我判断哪些问题会影响消费者第一印象，先输出一个整改顺序。",
    attachments: [
      createMockAttachment(
        "history-attachment-store-photos-zip",
        "门店巡检照片清单.zip",
        2_812_928,
        "application/zip",
      ),
      createMockAttachment(
        "history-attachment-store-action-csv",
        "整改跟进记录.csv",
        96_320,
        "text/csv",
      ),
    ],
    assistantContent: `我把照片问题按“消费者是否第一眼可见、是否影响安全感、是否影响停留”分成三组。

优先整改：

1. 门口物料堆叠和灯箱污损，这是第一眼问题，会直接影响进店意愿。
2. 试吃台标签缺失，用户不知道能不能拿、怎么拿，会影响体验。
3. 货架缺货但价签还在，会造成“库存管理混乱”的感知。

不建议先处理后仓标识和员工储物细节，它们重要但消费者不可见，可以排到第二批。`,
  },
  {
    id: "training-manual-update",
    dateTime: "2026-02-26 16:22",
    userContent:
      "新员工培训手册这一版太厚了，帮我压缩成入职前三天必须掌握的内容，并指出哪些内容可以改成后续考试。",
    attachments: [
      createMockAttachment(
        "history-attachment-training-manual-docx",
        "新员工培训手册V2.docx",
        328_704,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ],
    assistantContent: `我把手册拆成“立即上手、需要记忆、可以查阅”三类。

前三天必须掌握：门店动线、收银异常处理、退换货基础口径、会员权益解释、缺货登记。

后续考试：品牌故事、全量商品知识、复杂售后案例、区域促销规则。

建议把培训改成 3 天节奏：第一天跑通基础动作；第二天处理高频异常；第三天用真实案例做演练。这样新员工不会被一次性信息压垮。`,
  },
  {
    id: "competitor-feature-analysis",
    dateTime: "2026-03-12 11:05",
    userContent:
      "我整理了三个竞品的小程序截图，你帮我拆一下他们的会员路径，重点看哪些设计值得借鉴，哪些只是看起来热闹。",
    attachments: [
      createMockAttachment(
        "history-attachment-competitor-screenshots-pptx",
        "竞品小程序截图.pptx",
        1_192_960,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ),
    ],
    assistantContent: `我按“入口、权益解释、下单转化、复访提醒”拆了三家竞品。

值得借鉴的是权益解释方式：他们把会员价、专属券和积分抵扣放在同一个结算路径里，用户不用来回找。

不值得照搬的是首页大面积活动弹层：视觉很热闹，但会打断用户找商品，且不同活动之间互相抢注意力。

如果我们要改，建议优先做结算页会员收益提示，其次是订单完成后的下一次复购提醒。`,
  },
  {
    id: "live-script-optimization",
    dateTime: "2026-03-29 20:18",
    userContent: "这份直播脚本和商品卖点表你帮我重排一下，主播说起来要顺，不能像念参数。",
    attachments: [
      createMockAttachment(
        "history-attachment-live-script-md",
        "晚场直播脚本.md",
        64_512,
        "text/markdown",
      ),
      createMockAttachment(
        "history-attachment-product-selling-points-xlsx",
        "商品卖点表.xlsx",
        218_112,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ],
    assistantContent: `我把脚本从“按商品参数讲”改成“按用户场景讲”。

新的顺序是：痛点开场 -> 使用场景 -> 核心卖点 -> 价格利益点 -> 下单提醒。

有三处需要改：

1. 开场不要先讲成分，先讲“早上赶时间怎么吃”。
2. 卖点不要堆满，单品最多保留 3 个用户能听懂的点。
3. 价格机制要放在场景后，不要一开始就喊优惠。`,
  },
  {
    id: "support-sop-rewrite",
    dateTime: "2026-04-17 15:34",
    userContent:
      "客服SOP这次更新要减少升级主管的次数，帮我把哪些问题可以一线直接处理、哪些必须升级拆清楚。",
    attachments: [
      createMockAttachment(
        "history-attachment-support-sop-docx",
        "客服SOP修订稿.docx",
        276_480,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ],
    assistantContent: `我按影响等级把问题拆成三层。

一线可直接处理：物流延迟解释、普通退换货、优惠券补发、会员权益查询。

需要组长确认：金额补偿超过标准、同一用户连续投诉、跨渠道订单信息不一致。

必须升级主管：媒体投诉、食品安全、批量退款、疑似恶意套利。

这样可以把升级主管的请求减少一半左右，同时保留高影响问题的管理口径。`,
  },
  {
    id: "regional-business-review",
    dateTime: "2026-04-28 09:52",
    userContent: "华东区域经营复盘要给老板看，帮我把数据讲成能决策的内容，不要堆表格。",
    attachments: [
      createMockAttachment(
        "history-attachment-east-region-review-xlsx",
        "华东区域经营数据.xlsx",
        742_400,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
      createMockAttachment(
        "history-attachment-store-ranking-png",
        "门店排名截图.png",
        384_200,
        "image/png",
      ),
    ],
    assistantContent: `我把复盘结构改成“结论先行 + 三个决策问题”。

老板最需要看的不是所有指标，而是：

1. 哪些城市增长来自真实复购，哪些只是促销拉动。
2. 哪些门店缺的是客流，哪些缺的是转化。
3. 下个月预算应该投在拉新、复购还是门店改造。

建议汇报页只保留 6 个核心指标，其余数据放附录。`,
  },
  {
    id: "permission-prototype-review",
    dateTime: "2026-05-03 13:16",
    userContent:
      "权限设计稿我发你了，帮我看一下一级系统、二级菜单、三级功能是否对齐，不要出现系统入口单独作为权限项这种问题。",
    attachments: [
      createMockAttachment(
        "history-attachment-permission-prototype-png",
        "权限树原型截图.png",
        496_128,
        "image/png",
      ),
    ],
    assistantContent: `我看完后建议按三层收敛：

一级：工作台、管理后台、运营管理平台。

二级：系统内菜单，比如 ME、专家广场、技能中心、组织管理、角色管理、商品中心。

三级：菜单内动作，比如创建、编辑、发布、上下架、分配角色。

不建议把“系统入口”独立成权限项。只要用户具备某个系统下任意二级或三级权限，就自动获得对应系统入口。`,
  },
  {
    id: "daily-output-file-cleanup",
    dateTime: "2026-05-08 18:44",
    userContent:
      "我把今天改过的几份 PRD 和需求池文件发你，帮我整理哪些是最终成果，哪些只是过程稿。",
    attachments: [
      createMockAttachment(
        "history-attachment-prd-diff-md",
        "PRD调整记录.md",
        138_240,
        "text/markdown",
      ),
      createMockAttachment(
        "history-attachment-requirement-pool-xlsx",
        "需求池调整表.xlsx",
        52_736,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ],
    assistantContent: `我把今天的文件按“可交付成果”和“过程草稿”重新归并了：

1. 最终成果：5-15 PRD、需求池、ME 能力补充说明，这三份需要进入今日成果。
2. 过程稿：临时差异记录、截图说明、旧版本备份，只保留在工作记录里，不进入成果列表。
3. 需要继续处理：线上飞书文档版本号和本地文件版本要在下一轮同步。

今日成果里只展示用户能直接预览或下载的最终文件，过程稿只作为任务摘要保留。`,
  },
  {
    id: "me-local-tool-display-demo",
    dateTime: "2026-05-10 10:32",
    userContent:
      "按照现在 ME 的能力总表，帮我把原型里的本地工具调用 mock 重新做一版，哪些不该展开就不要展开，能展开的要有示例。",
    assistantContent:
      "我已经补齐本地工具调用展示样例，并生成了对应文件卡片。读取、列目录、文件模式搜索和任务列表管理只展示摘要；内容搜索、Shell、HTTP、网页抓取和写文件提供展开示例。",
    assistantBlocks: buildLocalToolDemoBlocks,
  },
  {
    id: "me-skill-mcp-task-display-demo",
    dateTime: "2026-05-10 11:08",
    userContent:
      "继续把 Skill、MCP、Workbench Task 和文件卡片也补到 mock 对话里，过程要自然，不要所有调用堆在一起。",
    attachments: [
      createMockAttachment(
        "history-attachment-ma-capability-list",
        "MA能力清单.md.md",
        74_240,
        "text/markdown",
      ),
    ],
    assistantContent:
      "我已经把 Skill、MCP、Workbench Task 和文件卡片按真实执行顺序补进 mock 对话。任务分发、任务继续、任务完成和任务失败都有独立样例，最终回复结尾追加文件卡片。",
    assistantBlocks: buildSkillMcpTaskDemoBlocks,
  },
];

/**
 * 构建 ME 单会话历史 mock 消息，覆盖跨天、跨月、附件上传和多轮协作场景。
 */
export const buildMetaAgentHistoryMessages = (
  agentName: string,
  sessionId = "dialogue-seed-metaagent-collab",
): ChatMessage[] =>
  META_AGENT_HISTORY_ROUNDS.flatMap((round, roundIndex) => [
    {
      id: `metaagent-history-${round.id}-user`,
      role: "user",
      author: "你",
      content: round.userContent,
      timeLabel: round.dateTime,
      attachments: round.attachments,
    },
    {
      id: `metaagent-history-${round.id}-assistant`,
      role: "assistant",
      author: agentName,
      content: round.assistantContent,
      timeLabel: dayTimeOffset(round.dateTime, roundIndex),
      blocks: round.assistantBlocks?.(round, agentName, sessionId),
    },
  ]);

function dayTimeOffset(dateTime: string, roundIndex: number): string {
  const matched = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})$/.exec(dateTime);

  if (!matched) {
    return dateTime;
  }

  const hours = Number(matched[2]);
  const minutes = Number(matched[3]);
  const nextMinutes = minutes + 8 + (roundIndex % 3) * 3;
  const nextDate = new Date(
    `${matched[1]}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
  );
  nextDate.setMinutes(nextMinutes);

  const nextHoursLabel = String(nextDate.getHours()).padStart(2, "0");
  const nextMinutesLabel = String(nextDate.getMinutes()).padStart(2, "0");

  return `${matched[1]} ${nextHoursLabel}:${nextMinutesLabel}`;
}
