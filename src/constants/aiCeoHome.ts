import {
  AI_CEO_AGENT_SCENARIO_QUESTIONS,
  PRODUCT_MANAGER_BACKLOG_QUESTION,
  PRODUCT_MANAGER_PRD_QUESTION,
} from "@/mocks/dialogueScenario/aiCeoScenarioPrompts";
import benchmarkProductionCover from "@/assets/images/aiCeoScenarioOutputs/benchmark-production-page.png";
import employeeAssessCover from "@/assets/images/aiCeoScenarioOutputs/employee-assess-wangjianguo.png";
import scoreRankFullListCover from "@/assets/images/aiCeoScenarioOutputs/score-rank-full-list.png";
import scoreRankOverviewCover from "@/assets/images/aiCeoScenarioOutputs/score-rank-overview.png";
import sequenceOverviewCover from "@/assets/images/aiCeoScenarioOutputs/sequence-overview-page.png";

/**
 * AI CEO 首页快捷问题定义。
 *
 * 数据来源：`/Users/yangwanquan/Downloads/AI-CEO系统-CEO分身Agent场景.md`
 */
export interface AiCeoHomePromptItem {
  id: string;
  question: string;
}

/**
 * AI CEO 首页案例回放消息角色。
 */
export type AiCeoHomeReplayRole = "user" | "assistant" | "system";

/**
 * AI CEO 首页案例回放消息。
 */
export interface AiCeoHomeReplayMessage {
  id: string;
  role: AiCeoHomeReplayRole;
  actor: string;
  content: string;
  delayMs?: number;
}

/**
 * AI CEO 首页案例卡片。
 */
export interface AiCeoHomeCaseItem {
  id: string;
  scene: string;
  title: string;
  summary: string;
  coverImage?: string;
  replayScenarioQuestion?: string;
  messages: AiCeoHomeReplayMessage[];
}

/**
 * AI CEO 首页 Skill 图标类型。
 */
export type AiCeoSkillIconKey =
  | "overview"
  | "employee"
  | "risk"
  | "document"
  | "process"
  | "database"
  | "task"
  | "benchmark"
  | "ranking"
  | "chat";

/**
 * AI CEO 首页 Skill 定义。
 */
export interface AiCeoHomeSkillItem {
  id: string;
  name: string;
  iconKey: AiCeoSkillIconKey;
}

/**
 * AI CEO 单个 Agent 的首页配置。
 */
export interface AiCeoAgentHomeConfig {
  intro: string;
  skillItems: AiCeoHomeSkillItem[];
  promptItems: AiCeoHomePromptItem[];
  guideLabel?: string;
  guideTitle?: string;
  guideItems?: string[];
  caseItems?: AiCeoHomeCaseItem[];
}

/**
 * 按设备生成默认 Agent 时使用的首页配置 ID。
 */
export const WORKSPACE_DEFAULT_AGENT_CONFIG_IDS = {
  "workspace-cloud": "workspace-default-agent-workspace-cloud",
  "workspace-local": "workspace-default-agent-workspace-local",
  "workspace-local-sh": "workspace-default-agent-workspace-local-sh",
  "workspace-local-bj": "workspace-default-agent-workspace-local-bj",
} as const;

const buildReplayCase = (
  id: string,
  scene: string,
  title: string,
  summary: string,
  messages: AiCeoHomeReplayMessage[],
  coverImage?: string,
  replayScenarioQuestion?: string,
): AiCeoHomeCaseItem => ({
  id,
  scene,
  title,
  summary,
  coverImage,
  replayScenarioQuestion,
  messages,
});

const CLOUD_WORKSPACE_CASES: AiCeoHomeCaseItem[] = [
  buildReplayCase(
    "cloud-case-task",
    "任务下发",
    "把会议结论拆成负责人任务",
    "适合把文档、纪要和待办拆到具体负责人。",
    [
      {
        id: "cloud-case-task-1",
        role: "user",
        actor: "你",
        content: "把这份周会纪要整理成待办，并发给项目负责人。",
        delayMs: 280,
      },
      {
        id: "cloud-case-task-2",
        role: "system",
        actor: "系统",
        content: "默认Agent 已解析纪要中的负责人、截止时间和风险项。",
        delayMs: 560,
      },
      {
        id: "cloud-case-task-3",
        role: "assistant",
        actor: "产研协作工作站默认Agent",
        content: "我已经拆成 3 条待办，并生成了可直接发送给项目负责人的任务口径，是否直接代发？",
        delayMs: 920,
      },
      {
        id: "cloud-case-task-4",
        role: "user",
        actor: "你",
        content: "直接发，并把风险项单独标出来。",
        delayMs: 360,
      },
      {
        id: "cloud-case-task-5",
        role: "assistant",
        actor: "产研协作工作站默认Agent",
        content: "已发出，同时把阻塞风险单独挂在消息底部，方便负责人直接回执。",
        delayMs: 820,
      },
    ],
    sequenceOverviewCover,
  ),
  buildReplayCase(
    "cloud-case-summary",
    "资料整理",
    "先整理，再给老板一版结论",
    "适合把多份材料压成一段可直接汇报的摘要。",
    [
      {
        id: "cloud-case-summary-1",
        role: "user",
        actor: "你",
        content: "把客户回访记录、售后表和日报压成一段晨会摘要。",
        delayMs: 320,
      },
      {
        id: "cloud-case-summary-2",
        role: "system",
        actor: "系统",
        content: "正在比对日报、回访记录和售后表中的高频问题。",
        delayMs: 560,
      },
      {
        id: "cloud-case-summary-3",
        role: "assistant",
        actor: "产研协作工作站默认Agent",
        content:
          "我已经压成 3 句：一个主结论、两个风险点、一个今天要跟进的动作，老板可以直接复述。",
        delayMs: 860,
      },
    ],
    benchmarkProductionCover,
  ),
];

const SALES_WORKSPACE_CASES: AiCeoHomeCaseItem[] = [
  buildReplayCase(
    "sales-case-send",
    "任务下发",
    "销量异常先拆动作，再代发给负责人",
    "适合销售日报、经营异常、负责人跟进这类动作闭环。",
    [
      {
        id: "sales-case-send-1",
        role: "user",
        actor: "你",
        content: "把今天销量异常和收口动作发给销售负责人。",
        delayMs: 280,
      },
      {
        id: "sales-case-send-2",
        role: "system",
        actor: "系统",
        content: "默认Agent 已读取设备里的销售日报和关注区名单。",
        delayMs: 540,
      },
      {
        id: "sales-case-send-3",
        role: "assistant",
        actor: "销售增长工作站默认Agent",
        content:
          "我已经整理出一版任务口径：先拉关注区名单，再把连续下滑和底线问题分开处理，要我直接发吗？",
        delayMs: 900,
      },
      {
        id: "sales-case-send-4",
        role: "user",
        actor: "你",
        content: "直接发，要求 17:00 前回执。",
        delayMs: 360,
      },
      {
        id: "sales-case-send-5",
        role: "assistant",
        actor: "销售增长工作站默认Agent",
        content: "已发给销售负责人，并加上 17:00 回执要求和未回执提醒。",
        delayMs: 860,
      },
    ],
    scoreRankOverviewCover,
  ),
  buildReplayCase(
    "sales-case-recap",
    "日报整理",
    "把一整天的经营数据压成老板口径",
    "适合先看盘面，再出一段经营快照。",
    [
      {
        id: "sales-case-recap-1",
        role: "user",
        actor: "你",
        content: "把今天的日报压成一段老板能直接听的经营口径。",
        delayMs: 280,
      },
      {
        id: "sales-case-recap-2",
        role: "system",
        actor: "系统",
        content: "正在按 GMV、退款、关注区和活动转化重新聚合数据。",
        delayMs: 520,
      },
      {
        id: "sales-case-recap-3",
        role: "assistant",
        actor: "销售增长工作站默认Agent",
        content: "我已经压缩成一段 90 秒汇报口径，并把高风险 SKU 单独列出来了。",
        delayMs: 860,
      },
    ],
    scoreRankFullListCover,
  ),
];

const STORE_WORKSPACE_CASES: AiCeoHomeCaseItem[] = [
  buildReplayCase(
    "store-case-shift",
    "门店协同",
    "把门店异常直接发给店长和当班负责人",
    "适合本地盒子里已经沉淀的客流、排班、库存数据。",
    [
      {
        id: "store-case-shift-1",
        role: "user",
        actor: "你",
        content: "把今天客流下滑和库存预警发给店长。",
        delayMs: 260,
      },
      {
        id: "store-case-shift-2",
        role: "system",
        actor: "系统",
        content: "默认Agent 已读取门店客流、库存和当班排班记录。",
        delayMs: 520,
      },
      {
        id: "store-case-shift-3",
        role: "assistant",
        actor: "上海门店本地盒子默认Agent",
        content:
          "我已经整理出一版店长口径：先补货，再调整午后排班，同时关注收银台等待时长。是否直接发送？",
        delayMs: 860,
      },
      {
        id: "store-case-shift-4",
        role: "assistant",
        actor: "上海门店本地盒子默认Agent",
        content: "已发出，并把今日 18:00 的二次复盘提醒一起挂上了。",
        delayMs: 780,
      },
    ],
    benchmarkProductionCover,
  ),
];

const HQ_WORKSPACE_CASES: AiCeoHomeCaseItem[] = [
  buildReplayCase(
    "hq-case-offline",
    "离线预演",
    "设备没在线，也能先预演任务流程",
    "适合在设备离线时先确认消息口径和处理节奏。",
    [
      {
        id: "hq-case-offline-1",
        role: "user",
        actor: "你",
        content: "设备还没恢复，先帮我把总部日报催办口径整理一下。",
        delayMs: 260,
      },
      {
        id: "hq-case-offline-2",
        role: "system",
        actor: "系统",
        content: "北京总部本地盒子当前离线，已切到离线预演模式。",
        delayMs: 520,
      },
      {
        id: "hq-case-offline-3",
        role: "assistant",
        actor: "北京总部本地盒子默认Agent",
        content: "我先给你一版可直接发送的催办口径，等设备恢复后可以一键套用到真实发送流程里。",
        delayMs: 860,
      },
    ],
    employeeAssessCover,
  ),
];

const PRODUCT_MANAGER_CASES: AiCeoHomeCaseItem[] = [
  buildReplayCase(
    "product-manager-case-prd",
    "需求梳理",
    "先出一版 PRD 主文档",
    "适合先把目标、范围、角色、流程和验收边界收成正式文档骨架。",
    [
      {
        id: "product-manager-case-prd-1",
        role: "user",
        actor: "你",
        content: PRODUCT_MANAGER_PRD_QUESTION,
        delayMs: 280,
      },
      {
        id: "product-manager-case-prd-2",
        role: "assistant",
        actor: "产品经理AI专家",
        content: "我先收敛目标、角色、流程和功能清单，再输出一版《Frontis AI · 正式 PRD》草案。",
        delayMs: 840,
      },
      {
        id: "product-manager-case-prd-3",
        role: "assistant",
        actor: "产品经理AI专家",
        content: "PRD 已生成，同时我会把下一步可拆的 Backlog 口径放到猜你想问里。",
        delayMs: 820,
      },
    ],
    undefined,
    PRODUCT_MANAGER_PRD_QUESTION,
  ),
  buildReplayCase(
    "product-manager-case-backlog",
    "执行拆解",
    "把 PRD 继续拆成 Product Backlog",
    "适合把已经确认的需求继续落到 Epic、Feature、User Story 与交付说明。",
    [
      {
        id: "product-manager-case-backlog-1",
        role: "user",
        actor: "你",
        content: PRODUCT_MANAGER_BACKLOG_QUESTION,
        delayMs: 280,
      },
      {
        id: "product-manager-case-backlog-2",
        role: "assistant",
        actor: "产品经理AI专家",
        content: "我会按 Epic、Feature、User Story 和备注字段继续往下拆，方便直接进排期。",
        delayMs: 860,
      },
      {
        id: "product-manager-case-backlog-3",
        role: "assistant",
        actor: "产品经理AI专家",
        content: "Backlog 已补齐，后面如果需要我可以继续拆里程碑和验收清单。",
        delayMs: 780,
      },
    ],
    undefined,
    PRODUCT_MANAGER_BACKLOG_QUESTION,
  ),
];

/**
 * AI CEO 各 Agent 的首页快捷问题与 Skill 配置。
 */
export const AI_CEO_AGENT_HOME_CONFIGS: Record<string, AiCeoAgentHomeConfig> = {
  "employee-pm": {
    intro: "我会直接把公司各序列的均分、预警、趋势和重点收口成一版老板晨会可直接复述的经营快照。",
    skillItems: [
      { id: "sequence_overview", name: "序列总览", iconKey: "overview" },
      { id: "alert_digest", name: "预警摘要", iconKey: "risk" },
      { id: "trend_compare", name: "趋势对比", iconKey: "ranking" },
      { id: "business_summary", name: "经营摘要", iconKey: "document" },
    ],
    promptItems: [
      { id: "pm-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-pm"] },
      { id: "pm-2", question: "按最近 30 天趋势，帮我挑出正在回升的两个序列。" },
      { id: "pm-3", question: "把管理序列和销售序列的预警拆成一句话让我能直接汇报。" },
      { id: "pm-4", question: "如果今天只盯两个序列，你会建议我盯哪两个？" },
      { id: "pm-5", question: "帮我把公司整体经营盘面压缩成一段晨会口径。" },
      { id: "pm-6", question: "哪些序列均分不算低，但隐性风险已经开始抬头？" },
    ],
  },
  "employee-designer": {
    intro: "我会从表现、证据、趋势和风险四个角度看人，先给判断，再给你可执行建议。",
    skillItems: [
      { id: "employee_assess", name: "员工评估", iconKey: "employee" },
      { id: "evidence_trace", name: "证据追踪", iconKey: "document" },
      { id: "erp_query", name: "ERP 校验", iconKey: "database" },
      { id: "risk_scan", name: "风险识别", iconKey: "risk" },
    ],
    promptItems: [
      { id: "designer-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-designer"] },
      { id: "designer-2", question: "帮我评估一下李婷最近的工作表现和风险点。" },
      { id: "designer-3", question: "给我看一下销售序列最近需要重点关注的员工。" },
      { id: "designer-4", question: "王晨最近的成绩和主要问题分别是什么？" },
      { id: "designer-5", question: "帮我判断一下赵立最近是不是处于下滑状态。" },
      { id: "designer-6", question: "按最近一个月表现，列出三个值得重点培养的人。" },
    ],
  },
  "employee-research": {
    intro: "我专门盯三条底线，会把触发证据、严重程度和处理建议直接拆给你，不跟你绕弯。",
    skillItems: [
      { id: "redline_detect", name: "红线检测", iconKey: "risk" },
      { id: "quality_redline", name: "品质安全", iconKey: "benchmark" },
      { id: "integrity_watch", name: "诚信担当", iconKey: "document" },
      { id: "craft_watch", name: "匠心传承", iconKey: "task" },
    ],
    promptItems: [
      { id: "research-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-research"] },
      { id: "research-2", question: "帮我筛一下最近一周最值得老板过问的红线苗头。" },
      { id: "research-3", question: "把品质安全底线最危险的 2 个案例先列给我。" },
      { id: "research-4", question: "哪些人还没触碰红线，但已经处在注意区了？" },
      { id: "research-5", question: "如果今天要安排约谈，先约哪几个人最合适？" },
      { id: "research-6", question: "帮我把最近的红黄灯事件压缩成一页管理口径。" },
    ],
  },
  "employee-ops": {
    intro: "我会把高分员工里真正值得表扬、值得培养、值得放大使用的人直接挑出来，不只给名单。",
    skillItems: [
      { id: "benchmark_find", name: "标杆识别", iconKey: "benchmark" },
      { id: "evidence_trace", name: "典型事迹", iconKey: "document" },
      { id: "talent_recommend", name: "培养建议", iconKey: "employee" },
      { id: "promotion_watch", name: "晋升储备", iconKey: "ranking" },
    ],
    promptItems: [
      { id: "ops-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-ops"] },
      { id: "ops-2", question: "把生产序列最像储备干部的人先挑出来给我。" },
      { id: "ops-3", question: "帮我找出本月最值得全员复盘的正向案例。" },
      { id: "ops-4", question: "如果我要做一轮表彰，先表扬哪 3 个人最有效？" },
      { id: "ops-5", question: "哪些高分员工不只是能打，还能带人？" },
      { id: "ops-6", question: "帮我把标杆员工的培养动作也一起列出来。" },
    ],
  },
  "employee-sales": {
    intro: "我会把序列内的标杆区、中间区、关注区和名次变化一次性拆开给你看，重点人不会埋在名单里。",
    skillItems: [
      { id: "score_rank", name: "评分排名", iconKey: "ranking" },
      { id: "zone_split", name: "区间分布", iconKey: "overview" },
      { id: "attention_watch", name: "关注区", iconKey: "risk" },
      { id: "rank_trend", name: "排名变化", iconKey: "employee" },
    ],
    promptItems: [
      { id: "sales-1", question: AI_CEO_AGENT_SCENARIO_QUESTIONS["employee-sales"] },
      { id: "sales-2", question: "把销售序列最近连续下滑的人先列出来。" },
      { id: "sales-3", question: "我只想看关注区，帮我把原因和动作都带上。" },
      { id: "sales-4", question: "哪些人虽然还在中间区，但已经有掉进关注区的风险？" },
      { id: "sales-5", question: "帮我看一下销售序列第一梯队最近的变化。" },
      { id: "sales-6", question: "把销售序列的排名结构压成一段老板口径。" },
    ],
  },
  "employee-product-manager": {
    intro:
      "我会先把需求背景、目标、角色、流程和范围收成一版 PRD，再继续拆成可执行的 Product Backlog，方便你直接进评审和排期。",
    guideLabel: "产品经理助手",
    guideTitle: "适合先收敛需求，再把文档继续拆成可执行清单。",
    guideItems: [
      "先让我出一版正式 PRD，再决定是否继续拆成 Backlog。",
      "如果你已经有范围边界，我会把不做项和验收口径一并补上。",
      "需要继续排期时，我可以沿着 Backlog 再拆阶段目标和里程碑。",
    ],
    skillItems: [
      { id: "requirements_summary", name: "需求摘要", iconKey: "overview" },
      { id: "prd_generate", name: "PRD 生成", iconKey: "document" },
      { id: "backlog_breakdown", name: "Backlog 拆解", iconKey: "task" },
      { id: "milestone_plan", name: "里程碑", iconKey: "process" },
    ],
    promptItems: [
      { id: "product-manager-1", question: PRODUCT_MANAGER_PRD_QUESTION },
      { id: "product-manager-2", question: PRODUCT_MANAGER_BACKLOG_QUESTION },
    ],
    caseItems: PRODUCT_MANAGER_CASES,
  },
  "employee-architect": {
    intro: "我会先把系统边界、模块关系和落地约束拆清楚，确保方案能直接进入研发实现。",
    skillItems: [
      { id: "architecture_planning", name: "架构规划", iconKey: "process" },
      { id: "module_mapping", name: "模块拆分", iconKey: "database" },
      { id: "risk_review", name: "风险评审", iconKey: "risk" },
    ],
    promptItems: [
      { id: "architect-1", question: "帮我把这个需求拆成核心模块、边界和依赖关系。" },
      { id: "architect-2", question: "这版方案上线前，架构层面最需要提前规避哪些风险？" },
      { id: "architect-3", question: "给我一版研发可以直接拿去评审的技术落地框架。" },
    ],
  },
  "employee-growth": {
    intro: "我会把产品目标拆成可执行的增长实验、转化路径和验证指标，方便团队快速试错。",
    skillItems: [
      { id: "growth_experiment", name: "增长实验", iconKey: "task" },
      { id: "conversion_analysis", name: "转化分析", iconKey: "overview" },
      { id: "metric_design", name: "指标设计", iconKey: "database" },
    ],
    promptItems: [
      { id: "growth-1", question: "围绕首屏转化，帮我设计一轮可执行的增长实验。" },
      { id: "growth-2", question: "这个功能要验证是否有效，应该先看哪些关键指标？" },
      { id: "growth-3", question: "把这条用户路径拆成转化漏斗，并指出最值得优化的节点。" },
    ],
  },
  "employee-qa": {
    intro: "我会提前补齐验收标准、回归范围和上线检查项，把交付风险拦在发布前。",
    skillItems: [
      { id: "acceptance_review", name: "验收评审", iconKey: "document" },
      { id: "regression_planning", name: "回归规划", iconKey: "process" },
      { id: "launch_checklist", name: "上线清单", iconKey: "task" },
    ],
    promptItems: [
      { id: "qa-1", question: "帮我整理这次改版的验收标准和关键检查项。" },
      { id: "qa-2", question: "这次上线前最需要覆盖哪些回归路径？" },
      { id: "qa-3", question: "给我一版可以直接执行的上线检查清单。" },
    ],
  },
  "employee-data": {
    intro: "我会把需求背后的指标体系、看板结构和异常判断口径整理出来，方便持续追结果。",
    skillItems: [
      { id: "metric_design", name: "指标设计", iconKey: "database" },
      { id: "dashboard_planning", name: "看板规划", iconKey: "overview" },
      { id: "anomaly_insight", name: "异常洞察", iconKey: "risk" },
    ],
    promptItems: [
      { id: "data-1", question: "这个需求要看效果，核心指标体系应该怎么搭？" },
      { id: "data-2", question: "帮我规划一个能持续跟踪改版效果的数据看板。" },
      { id: "data-3", question: "如果数据波动异常，优先要看哪些信号和判断口径？" },
    ],
  },
  "employee-user-researcher": {
    intro: "我会把用户反馈、访谈原话和优先级证据整理成清晰的问题判断，方便你决定先做什么。",
    skillItems: [
      { id: "user_interview", name: "用户访谈", iconKey: "employee" },
      { id: "feedback_synthesis", name: "反馈归纳", iconKey: "document" },
      { id: "priority_evidence", name: "优先级证据", iconKey: "benchmark" },
    ],
    promptItems: [
      { id: "user-research-1", question: "帮我把这批用户反馈归纳成几个核心问题。" },
      { id: "user-research-2", question: "如果要排优先级，当前最有说服力的用户证据是什么？" },
      { id: "user-research-3", question: "给我一版可以用于需求评审的访谈结论摘要。" },
    ],
  },
  "employee-writer": {
    intro: "我是 ME，会先理解你的目标，再根据你当前可用的 AI 专家和工具协助完成任务。",
    guideLabel: "ME",
    guideTitle: "直接描述目标、背景和限制条件即可。",
    guideItems: [
      "我会先判断任务是否需要工具、文件或 AI 专家协作。",
      "如果当前没有可调度专家，我会先直接处理基础对话、附件和文件任务。",
      "后续添加 AI 专家后，我会按权限调度并统一汇总结果。",
    ],
    skillItems: [],
    promptItems: [
      { id: "writer-1", question: "帮我整理一下今天要处理的任务。" },
      { id: "writer-2", question: "我上传一份资料，你帮我提炼重点和下一步动作。" },
      { id: "writer-3", question: "帮我生成一份可直接预览的文档。" },
    ],
    caseItems: [],
  },
  [WORKSPACE_DEFAULT_AGENT_CONFIG_IDS["workspace-cloud"]]: {
    intro:
      "这是绑定在产研协作工作站上的默认 Agent。你把资料整理、任务拆解、负责人触达这类问题直接丢给我，我会先在设备里收集上下文，再给你一版能直接执行的结果。",
    guideLabel: "设备默认Agent",
    guideTitle: "适合先让设备帮你收资料、拆任务、生成可直接发送的口径。",
    guideItems: [
      "适合纪要整理、待办拆解、负责人催办和文档归纳。",
      "你可以先问结果，也可以直接说“帮我发给谁”。",
      "点开案例卡可以先看一遍发送任务和 Agent 回复的回放。",
    ],
    skillItems: [
      { id: "document_digest", name: "资料整理", iconKey: "document" },
      { id: "task_dispatch", name: "任务拆解", iconKey: "task" },
      { id: "process_sync", name: "流程同步", iconKey: "process" },
      { id: "knowledge_lookup", name: "知识检索", iconKey: "database" },
    ],
    promptItems: [
      { id: "workspace-cloud-1", question: "把这份周会纪要整理成待办，并标明负责人。" },
      { id: "workspace-cloud-2", question: "帮我把需求文档压成一段老板能直接听的摘要。" },
      { id: "workspace-cloud-3", question: "把这条催办内容整理成可直接发给项目负责人的话。" },
      { id: "workspace-cloud-4", question: "我给你三份材料，先帮我找出重复和冲突点。" },
    ],
    caseItems: CLOUD_WORKSPACE_CASES,
  },
  [WORKSPACE_DEFAULT_AGENT_CONFIG_IDS["workspace-local"]]: {
    intro:
      "这是绑定在销售增长工作站上的默认 Agent。适合先读取设备里的日报、名单和任务记录，再帮你做经营收口、任务下发和负责人跟进。",
    guideLabel: "设备默认Agent",
    guideTitle: "适合销售日报、经营异常、负责人跟进这类需要结合设备数据的场景。",
    guideItems: [
      "先让我看当天数据，再决定要不要发消息或者追负责人。",
      "如果你已经知道要发给谁，可以直接让我整理并代发。",
      "案例回放里会演示发送任务和 Agent 回复的完整过程。",
    ],
    skillItems: [
      { id: "daily_digest", name: "经营日报", iconKey: "overview" },
      { id: "task_dispatch", name: "任务下发", iconKey: "task" },
      { id: "contact_sync", name: "触达协同", iconKey: "chat" },
      { id: "issue_sort", name: "异常拆解", iconKey: "risk" },
    ],
    promptItems: [
      { id: "workspace-local-1", question: "把今天销量异常和收口动作发给销售负责人。" },
      { id: "workspace-local-2", question: "帮我把今天的销售日报压成一段老板口径。" },
      { id: "workspace-local-3", question: "拉一下关注区名单，把连续下滑和底线问题分开。" },
      { id: "workspace-local-4", question: "把今天要盯的两个 SKU 和原因说给我听。" },
    ],
    caseItems: SALES_WORKSPACE_CASES,
  },
  [WORKSPACE_DEFAULT_AGENT_CONFIG_IDS["workspace-local-sh"]]: {
    intro:
      "这是绑定在上海门店本地盒子上的默认 Agent。它更适合门店客流、库存、排班和当班协同这类本地执行场景。",
    guideLabel: "设备默认Agent",
    guideTitle: "适合门店客流异常、排班调整、库存预警和店长通知。",
    guideItems: [
      "先让我读设备里的门店数据，再决定今天怎么处理。",
      "如果要同步店长或当班负责人，我会先整理成可执行动作。",
      "案例回放更偏门店场景，适合员工第一次上手时照着用。",
    ],
    skillItems: [
      { id: "traffic_watch", name: "客流监控", iconKey: "overview" },
      { id: "inventory_watch", name: "库存预警", iconKey: "risk" },
      { id: "shift_adjust", name: "排班协同", iconKey: "process" },
      { id: "task_dispatch", name: "门店下发", iconKey: "task" },
    ],
    promptItems: [
      { id: "workspace-local-sh-1", question: "把今天客流下滑和库存预警发给店长。" },
      { id: "workspace-local-sh-2", question: "帮我看一下午后排班要不要调整。" },
      { id: "workspace-local-sh-3", question: "把门店今天最需要老板过问的问题压成一句话。" },
      { id: "workspace-local-sh-4", question: "列一下今天晚高峰前必须处理的三个动作。" },
    ],
    caseItems: STORE_WORKSPACE_CASES,
  },
  [WORKSPACE_DEFAULT_AGENT_CONFIG_IDS["workspace-local-bj"]]: {
    intro:
      "这是绑定在北京总部本地盒子上的默认 Agent。当前设备离线时，我会优先给你做流程预演、口径整理和发送草稿；设备恢复后可以继续串真实动作。",
    guideLabel: "离线设备",
    guideTitle: "设备离线时先预演流程；设备恢复后再无缝接到真实执行。",
    guideItems: [
      "先看口径和动作顺序，不用等设备恢复再开始准备。",
      "离线状态下更适合做催办文案、日报结构和任务草稿。",
      "案例回放会直接展示离线预演是怎么走的。",
    ],
    skillItems: [
      { id: "offline_rehearsal", name: "离线预演", iconKey: "task" },
      { id: "draft_prepare", name: "草稿整理", iconKey: "document" },
      { id: "workflow_plan", name: "流程规划", iconKey: "process" },
      { id: "message_sync", name: "消息草拟", iconKey: "chat" },
    ],
    promptItems: [
      { id: "workspace-local-bj-1", question: "设备没恢复前，先帮我把总部日报催办口径整理出来。" },
      { id: "workspace-local-bj-2", question: "先预演一下发给负责人时的消息结构。" },
      { id: "workspace-local-bj-3", question: "把今天的总部待办压成一段追进度口径。" },
      { id: "workspace-local-bj-4", question: "帮我做一版设备恢复后可以直接发送的消息草稿。" },
    ],
    caseItems: HQ_WORKSPACE_CASES,
  },
};

/**
 * AI CEO 首页默认配置。
 */
export const AI_CEO_DEFAULT_HOME_CONFIG: AiCeoAgentHomeConfig =
  AI_CEO_AGENT_HOME_CONFIGS["employee-writer"];
