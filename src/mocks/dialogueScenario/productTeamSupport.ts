import type { ArtifactItem } from "@/types/artifact";
import {
  PRODUCT_TEAM_BUSINESS_JOURNEY_HTML_DOCUMENT_CONTENT,
  PRODUCT_TEAM_COMPLETE_PRD_V2_DOCUMENT_CONTENT,
  PRODUCT_TEAM_MAIN_AGENT_NAME,
  PRODUCT_TEAM_RISK_QUESTION,
} from "@/mocks/dialogueScenario/productTeamScenarioMock";

import type { DialogueGeneratedPanelStatus, DialogueGeneratedResultItem } from "@/pages/types";

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

interface CreateScenarioDispatchResultItemParams {
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

/**
 * 产研协作专家团场景支持层依赖。
 */
export interface ProductTeamScenarioSupportHelpers {
  createMarkdownArtifact: (
    sessionId: string,
    suffix: string,
    fileName: string,
    producerName: string,
    taskName: string,
    content: string,
    producedAt: string,
    fileSize: string,
  ) => ArtifactItem;
  createJsonArtifact: (
    sessionId: string,
    suffix: string,
    fileName: string,
    producerName: string,
    taskName: string,
    content: string,
    producedAt: string,
    fileSize: string,
  ) => ArtifactItem;
  createHtmlArtifact: (
    sessionId: string,
    suffix: string,
    fileName: string,
    producerName: string,
    taskName: string,
    content: string,
    producedAt: string,
    fileSize: string,
  ) => ArtifactItem;
  buildArtifactGroup: (...artifacts: Array<ArtifactItem | undefined>) => ArtifactItem[];
  resolveTextArtifactSize: (content: string) => string;
  createScenarioDispatchResultItem: (
    params: CreateScenarioDispatchResultItemParams,
  ) => DialogueGeneratedResultItem;
}

/**
 * 构建产研协作专家团场景成果文件。
 */
export const buildProductTeamArtifacts = (
  helpers: ProductTeamScenarioSupportHelpers,
  sessionId: string,
  mode: "delivery" | "risk",
): ArtifactItem[] => {
  const completePrdArtifact = helpers.createMarkdownArtifact(
    sessionId,
    "team-product-complete-prd-v2",
    "Frontis AI · 完整 PRD V2.md",
    PRODUCT_TEAM_MAIN_AGENT_NAME,
    "完整 PRD 交付",
    PRODUCT_TEAM_COMPLETE_PRD_V2_DOCUMENT_CONTENT,
    "刚刚",
    helpers.resolveTextArtifactSize(PRODUCT_TEAM_COMPLETE_PRD_V2_DOCUMENT_CONTENT),
  );
  const businessJourneyArtifact = helpers.createHtmlArtifact(
    sessionId,
    "team-product-business-journey",
    "Frontis AI 平台业务流程图 V2.7 统一用户版.html",
    PRODUCT_TEAM_MAIN_AGENT_NAME,
    "业务旅程构造交付",
    PRODUCT_TEAM_BUSINESS_JOURNEY_HTML_DOCUMENT_CONTENT,
    "刚刚",
    helpers.resolveTextArtifactSize(PRODUCT_TEAM_BUSINESS_JOURNEY_HTML_DOCUMENT_CONTENT),
  );

  void mode;

  return helpers.buildArtifactGroup(completePrdArtifact, businessJourneyArtifact);
};

/**
 * 构建产研协作专家团首轮协作结果面板数据。
 */
export const buildProductTeamCollabResults = (
  helpers: ProductTeamScenarioSupportHelpers,
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
    overview: helpers.createScenarioDispatchResultItem({
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
    architect: helpers.createScenarioDispatchResultItem({
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
    growth: helpers.createScenarioDispatchResultItem({
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
    qa: helpers.createScenarioDispatchResultItem({
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
    data: helpers.createScenarioDispatchResultItem({
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

/**
 * 构建产研协作专家团风险复核结果面板数据。
 */
export const buildProductTeamRiskResults = (
  helpers: ProductTeamScenarioSupportHelpers,
  sessionId: string,
): {
  overview: DialogueGeneratedResultItem;
  architect: DialogueGeneratedResultItem;
  qa: DialogueGeneratedResultItem;
  data: DialogueGeneratedResultItem;
} => ({
  overview: helpers.createScenarioDispatchResultItem({
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
  architect: helpers.createScenarioDispatchResultItem({
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
  qa: helpers.createScenarioDispatchResultItem({
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
  data: helpers.createScenarioDispatchResultItem({
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
