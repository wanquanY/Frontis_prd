import type { SynClawArtifactItem, SynClawSpaceItem } from "@/pages/synclaw/types";
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
import type {
  AdminAiEmployeeListItem,
  CoworkerSkillItem,
  SkillCategoryInfo,
  SynClawAiEmployee,
  SynClawTenantMemberOption,
  SynClawTenantMemberSelection,
} from "@/types/prdPrototype";

import type {
  AutomationTaskItem,
  ChannelItem,
  ChatMessage,
  DialogueGeneratedPanelState,
  DialogueGeneratedResultItem,
  DialogueSessionItem,
  EmployeeItem,
  FrontisWebUserItem,
  SkillItem,
  WorkspaceItem,
} from "@/pages/types";
import {
  buildDialogueScenarioSeedArtifacts,
  buildDialogueScenarioSeedPanels,
  buildDialogueScenarioSeedResults,
  buildDialogueScenarioSeedSessions,
} from "@/pages/dialogueScenarioSimulation";
import { getAvatarUrl } from "@/pages/utils";

const SKILL_AGENT_AVATAR_URLS: Record<string, string> = {
  "201": getAvatarUrl("employee-pm"),
  "202": getAvatarUrl("employee-designer"),
  "203": getAvatarUrl("employee-research"),
  "204": getAvatarUrl("employee-writer"),
};

const createDataUrl = (mimeType: string, content: string): string =>
  `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;

const createSvgDataUrl = (content: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;

/**
 * 原型页默认工作站列表。
 */
export const INITIAL_WORKSPACES: WorkspaceItem[] = [
  {
    id: "workspace-cloud",
    name: "产研协作工作站",
    type: "cloud",
    status: "online",
    region: "华东可用区 A / GPU 可用",
    summary: "用于资料检索、浏览器任务、文档产出和虚拟机执行。",
    runtimeHint: "支持桌面预览、成果文件和扫码辅助。",
  },
  {
    id: "workspace-local",
    name: "销售增长工作站",
    type: "cloud",
    status: "online",
    region: "华东可用区 B",
    summary: "用于销售战报、内容创作和一线业务推进。",
    runtimeHint: "支持桌面预览、成果文件和扫码辅助。",
  },
  {
    id: "workspace-local-sh",
    name: "上海门店本地盒子",
    type: "local",
    status: "online",
    region: "上海 · 门店",
    summary: "门店本地部署，用于运营数据跟踪与客流分析。",
    runtimeHint: "本地模式不展示远端桌面，优先强调对话和任务体验。",
  },
  {
    id: "workspace-local-bj",
    name: "北京总部本地盒子",
    type: "local",
    status: "draft",
    region: "北京 · 总部",
    summary: "总部本地部署，当前设备离线。",
    runtimeHint: "设备离线中，请联系运维排查。",
  },
];

/**
 * 原型页默认 AI 员工列表。
 */
export const INITIAL_EMPLOYEES: EmployeeItem[] = [
  {
    id: "employee-pm",
    name: "序列总览专家",
    avatarUrl: getAvatarUrl("employee-pm"),
    role: "查看公司各序列评分、预警与趋势盘面",
    portalRoles: ["admin"],
    status: "busy",
    workspaceId: "workspace-cloud",
    connectionMode: "cloud",
    model: "gpt-4o",
    summary: "聚焦各业务序列的均分、预警、趋势和老板晨会经营快照。",
    lastAction: "已更新最近 30 天序列总览和预警摘要",
    source: "coworker",
    visibility: "bound",
    subAgentModel: "gpt-3.5-turbo",
    agentId: "ceo-sequence-overview-01",
    runtimeAgentId: "rt-sequence-overview-01",
    boundMembers: ["杨万泉", "陈雪梅"],
    welcomeMessage: "我会先看盘面，再把序列均分、预警和趋势翻译成老板可直接复述的经营结论。",
    systemPrompt: "你是一名序列总览专家，负责分析公司各序列的均分、预警、趋势和经营重点。",
    skills: ["sequence_overview"],
    expertSetupMode: "permission",
  },
  {
    id: "employee-designer",
    name: "员工评估专家",
    avatarUrl: getAvatarUrl("employee-designer"),
    role: "作为内部执行 Agent 承接序列总览、员工评估、红线、标杆与排名任务",
    portalRoles: ["admin"],
    status: "idle",
    workspaceId: "workspace-cloud",
    connectionMode: "cloud",
    model: "gpt-4-turbo",
    summary: "作为 CEO 分身下游执行 Agent，负责组织分析类 skill 的执行与结构化结果返回。",
    lastAction: "等待 CEO 分身下发新的组织分析任务",
    source: "coworker",
    visibility: "bound",
    subAgentModel: "gpt-3.5-turbo",
    agentId: "ceo-employee-assess-01",
    runtimeAgentId: "rt-employee-assess-01",
    boundMembers: ["杨万泉", "陈雪梅"],
    welcomeMessage:
      "我负责执行组织分析类任务，会把序列、个人、底线和排名结果整理成 CEO 分身可直接整合的结构化输出。",
    systemPrompt:
      "你是一名员工评估专家，作为 CEO 分身的下游执行 Agent，负责执行 sequence_overview、employee_assess、redline_detect、benchmark_find 和 score_rank 等组织分析技能。",
    skills: [
      "sequence_overview",
      "employee_assess",
      "redline_detect",
      "benchmark_find",
      "score_rank",
    ],
    expertSetupMode: "permission",
  },
  {
    id: "employee-research",
    name: "红线检测专家",
    avatarUrl: getAvatarUrl("employee-research"),
    role: "识别员工红线触碰、严重程度与约谈动作",
    portalRoles: ["admin"],
    status: "online",
    workspaceId: "workspace-cloud",
    connectionMode: "cloud",
    model: "gpt-4-turbo",
    summary: "专门判断品质安全、诚信担当、匠心传承三条底线是否触碰。",
    lastAction: "已更新最近一轮红黄灯事件与约谈建议",
    source: "coworker",
    visibility: "bound",
    subAgentModel: "gpt-3.5-turbo",
    agentId: "ceo-redline-detect-01",
    runtimeAgentId: "rt-redline-detect-01",
    boundMembers: ["杨万泉", "陈雪梅"],
    welcomeMessage: "我会逐条判断三条底线，再把触发证据、严重程度和处理建议一起给你。",
    systemPrompt: "你是一名红线检测专家，负责判断员工是否触碰品质安全、诚信担当和匠心传承三条底线。",
    skills: ["redline_detect"],
    expertSetupMode: "permission",
  },
  {
    id: "employee-ops",
    name: "标杆识别专家",
    avatarUrl: getAvatarUrl("employee-ops"),
    role: "识别高表现员工、典型事迹和培养动作",
    portalRoles: ["admin"],
    status: "online",
    workspaceId: "workspace-cloud",
    connectionMode: "cloud",
    model: "gpt-4o",
    summary: "聚焦高分员工筛选、优秀行为提炼和晋升培养建议。",
    lastAction: "已完成最近一轮生产序列标杆识别",
    source: "coworker",
    visibility: "bound",
    subAgentModel: "gpt-3.5-turbo",
    agentId: "ceo-benchmark-find-01",
    runtimeAgentId: "rt-benchmark-find-01",
    boundMembers: ["杨万泉", "陈雪梅"],
    welcomeMessage: "我会把真正值得表扬、值得培养、值得放大使用的人直接挑出来给你。",
    systemPrompt: "你是一名标杆识别专家，负责筛选高表现员工、提炼典型事迹并输出培养建议。",
    skills: ["benchmark_find"],
    expertSetupMode: "permission",
  },
  {
    id: ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
    name: ECOMMERCE_AUTOMATION_AGENT_DEMO.name,
    avatarUrl: getAvatarUrl(ECOMMERCE_AUTOMATION_AGENT_DEMO.avatarSeed),
    role: ECOMMERCE_AUTOMATION_AGENT_DEMO.role,
    portalRoles: ["admin", "employee"],
    status: "online",
    workspaceId: "workspace-local",
    connectionMode: "cloud",
    model: "gpt-4o",
    summary: ECOMMERCE_AUTOMATION_AGENT_DEMO.summary,
    lastAction: "已生成货盘比价、商品质检、订单异常监控和运营播报示例。",
    source: "coworker",
    visibility: "all",
    subAgentModel: "gpt-4o-mini",
    agentId: "ecom-ops-agent-01",
    runtimeAgentId: "rt-ecom-ops-01",
    boundMembers: [...ECOMMERCE_AUTOMATION_AGENT_DEMO.boundMembers],
    welcomeMessage: ECOMMERCE_AUTOMATION_AGENT_DEMO.welcomeMessage,
    systemPrompt: ECOMMERCE_AUTOMATION_AGENT_DEMO.systemPrompt,
    skills: ECOMMERCE_AUTOMATION_SKILL_DEMOS.map(item => item.id),
    expertSetupMode: "device",
  },
  {
    id: LIVE_BROADCAST_AGENT_DEMO.id,
    name: LIVE_BROADCAST_AGENT_DEMO.name,
    avatarUrl: getAvatarUrl(LIVE_BROADCAST_AGENT_DEMO.avatarSeed),
    role: LIVE_BROADCAST_AGENT_DEMO.role,
    portalRoles: ["admin", "employee"],
    status: "online",
    workspaceId: "workspace-local",
    connectionMode: "cloud",
    model: "gpt-4o",
    summary: LIVE_BROADCAST_AGENT_DEMO.summary,
    lastAction: "已生成直播脚本、达人投放、热点选题、爆品热度和舆情预审示例。",
    source: "coworker",
    visibility: "all",
    subAgentModel: "gpt-4o-mini",
    agentId: "live-ops-agent-01",
    runtimeAgentId: "rt-live-ops-01",
    boundMembers: [...LIVE_BROADCAST_AGENT_DEMO.boundMembers],
    welcomeMessage: LIVE_BROADCAST_AGENT_DEMO.welcomeMessage,
    systemPrompt: LIVE_BROADCAST_AGENT_DEMO.systemPrompt,
    skills: LIVE_BROADCAST_SKILL_DEMOS.map(item => item.id),
    expertSetupMode: "permission",
  },
  {
    id: XIAOCANMAMA_IP_AGENT_DEMO.id,
    name: XIAOCANMAMA_IP_AGENT_DEMO.name,
    avatarUrl: getAvatarUrl(XIAOCANMAMA_IP_AGENT_DEMO.avatarSeed),
    role: XIAOCANMAMA_IP_AGENT_DEMO.role,
    portalRoles: ["admin", "employee"],
    status: "online",
    workspaceId: "workspace-local",
    connectionMode: "cloud",
    model: "gpt-4o",
    summary: XIAOCANMAMA_IP_AGENT_DEMO.summary,
    lastAction: "已生成童装清仓和创维吹风机返场两组开团文示例。",
    source: "coworker",
    visibility: "all",
    subAgentModel: "gpt-4o-mini",
    agentId: "xiaocanmama-ip-agent-01",
    runtimeAgentId: "rt-xiaocanmama-ip-01",
    boundMembers: [...XIAOCANMAMA_IP_AGENT_DEMO.boundMembers],
    welcomeMessage: XIAOCANMAMA_IP_AGENT_DEMO.welcomeMessage,
    systemPrompt: XIAOCANMAMA_IP_AGENT_DEMO.systemPrompt,
    skills: XIAOCANMAMA_IP_SKILL_DEMOS.map(item => item.id),
    expertSetupMode: "permission",
  },
  {
    id: "employee-writer",
    name: "CEO分身",
    avatarUrl: getAvatarUrl("employee-writer"),
    role: "以 CEO 视角回应员工问题与经营协作咨询",
    portalRoles: ["admin", "employee"],
    status: "idle",
    workspaceId: "workspace-local",
    connectionMode: "cloud",
    model: "gpt-4o",
    summary:
      "负责接收老板或员工问题，判断要调用哪项 skill，并把员工评估专家返回的结果整合成 CEO 口吻答复。",
    lastAction: "等待新的老板提问与经营协作任务",
    source: "coworker",
    visibility: "all",
    subAgentModel: "gpt-3.5-turbo",
    agentId: "ceo-chat-send-01",
    runtimeAgentId: "rt-chat-send-01",
    boundMembers: ["王晨", "李婷", "周可", "赵立"],
    welcomeMessage:
      "你直接问我经营判断、人员状态和协作安排就行，我会判断该调用哪项能力，再用 CEO 口吻把结果给你说清楚。",
    systemPrompt:
      "你是一名 CEO分身，负责识别老板或员工的问题意图，按需调用 sequence_overview、employee_assess、redline_detect、benchmark_find、score_rank、feishu_contact_lookup、feishu_send_message 等技能，并整合成 CEO 口吻输出。",
    skills: [
      "sequence_overview",
      "employee_assess",
      "redline_detect",
      "benchmark_find",
      "score_rank",
      "feishu_contact_lookup",
      "feishu_send_message",
    ],
    expertSetupMode: "permission",
  },
  {
    id: "employee-sales",
    name: "评分排名专家",
    avatarUrl: getAvatarUrl("employee-sales"),
    role: "查看序列内的评分分布和排名变化",
    portalRoles: ["admin"],
    status: "online",
    workspaceId: "workspace-cloud",
    connectionMode: "cloud",
    model: "gpt-4-turbo",
    summary: "分析序列内的标杆区、中间区、关注区和人员排名变化。",
    lastAction: "已更新最近一期评分排名结果",
    source: "coworker",
    visibility: "bound",
    subAgentModel: "gpt-3.5-turbo",
    agentId: "ceo-score-rank-01",
    runtimeAgentId: "rt-score-rank-01",
    boundMembers: ["杨万泉", "陈雪梅"],
    welcomeMessage: "我会把标杆区、中间区、关注区和名次变化一次性拆给你看。",
    systemPrompt: "你是一名评分排名专家，负责统计序列内的评分排名、分区分布、关注区和变化情况。",
    skills: ["score_rank"],
    expertSetupMode: "permission",
  },
];

export const INITIAL_EMPLOYEE_DOCUMENTS: Record<string, string[]> = {
  "employee-pm": ["AGENTS.md", "PRD.md", "需求边界.md"],
  "employee-designer": ["交互规范.md", "布局原则.md", "组件清单.md"],
  "employee-research": ["竞品调研.md", "行业资料.md", "参考案例.md"],
  "employee-ops": ["上线检查表.md", "回归清单.md", "发布说明.md"],
  [ECOMMERCE_AUTOMATION_AGENT_DEMO.id]: [...ECOMMERCE_AUTOMATION_AGENT_DEMO.documentNames],
  [LIVE_BROADCAST_AGENT_DEMO.id]: [...LIVE_BROADCAST_AGENT_DEMO.documentNames],
  [XIAOCANMAMA_IP_AGENT_DEMO.id]: [...XIAOCANMAMA_IP_AGENT_DEMO.documentNames],
  "employee-writer": ["写作规范.md", "会议纪要模板.md", "归档说明.md"],
  "employee-sales": ["销售日报模板.md", "客户跟进规范.md", "战报汇总.md"],
  "employee-store-ops": ["门店运营日报.md", "客流分析模板.md", "库存预警规范.md"],
};

export const INITIAL_EMPLOYEE_DOCUMENT_CONTENTS: Record<string, Record<string, string>> = {
  "employee-pm": {
    "AGENTS.md":
      "# 企业信息整理专家 AGENTS\n\n## 职责范围\n- 整理企业背景资料\n- 收敛组织与经营信息\n- 输出结构化信息摘要\n\n## 输出要求\n- 先给关键信息\n- 再给结构化清单\n- 最后补风险与待确认项\n",
    "PRD.md":
      "# SynClaw 原型需求\n\n## 目标\n- 优化客户端体验\n- 统一对话、群聊、技能、自动化、AI 专家团入口\n\n## 当前重点\n1. AI 专家团要支持广场态和详情态切换\n2. 详情态需展示核心配置与文档\n3. 交互上保留轻量过渡动画\n",
    "需求边界.md":
      "# 需求边界\n\n- 当前只做原型演示，不接真实接口\n- 所有数据均由 mock 驱动\n- 详情区重点表达配置结构，不做真实保存\n",
  },
  "employee-designer": {
    "交互规范.md":
      "# 交互规范\n\n- 广场态采用多列卡片\n- 详情态采用左侧缩略列 + 右侧主详情\n- 关键切换使用轻量位移动画，不做复杂共享元素动画\n",
    "布局原则.md":
      "# 布局原则\n\n## 广场态\n- 卡片尽量铺满主区域\n- 维持统一卡片宽度与节奏\n\n## 详情态\n- 左侧列负责切换\n- 右侧主区负责详细配置\n",
    "组件清单.md":
      "# 组件清单\n\n- AI 专家卡片\n- 新建 AI 专家卡片\n- 左侧缩略切换列\n- 配置详情卡\n- 文档 Tabs 预览区\n",
  },
  "employee-research": {
    "竞品调研.md":
      "# 竞品调研\n\n- 竞品多数把 Agent 广场和详情页拆开\n- 当前原型更适合同页切换，减少跳转成本\n",
    "行业资料.md":
      "# 行业资料\n\n- 企业普遍会在 Agent 详情中展示模型、提示词、工作站、权限与文档\n- 文档区通常采用 tab 或左树右内容结构\n",
    "参考案例.md":
      "# 参考案例\n\n1. 广场态用于快速浏览和选择\n2. 详情态用于精细查看配置\n3. 动画只需承担“进入详情”的上下文切换提示\n",
  },
  "employee-ops": {
    "上线检查表.md":
      "# 上线检查表\n\n- 卡片切换是否稳定\n- 详情区字段是否完整\n- markdown 文档切换是否正常\n",
    "回归清单.md":
      "# 回归清单\n\n- AI 专家广场\n- AI 专家详情\n- 新建/编辑弹窗\n- 技能广场头像\n",
    "发布说明.md":
      "# 发布说明\n\n当前原型以演示效果为主，允许 mock 数据覆盖业务态，但不能破坏布局一致性。\n",
  },
  [ECOMMERCE_AUTOMATION_AGENT_DEMO.id]: {
    "电商托管说明.md":
      "# 电商托管说明\n\n- 覆盖货盘比价、商品质检、发货超时、退款拒绝、差评监控和运营播报\n- 当前全部为 mock 演示，不调用真实微店或 IM 接口\n- 预置问题直接对应文档中的 6 组电商托管场景\n",
    "商品质检规则.md":
      "# 商品质检规则\n\n1. 以 SKU 为主键对齐货盘和微店在售商品\n2. 重点看漏上架、未备案、售价误差、规格名称和运费险\n3. 输出逐 SKU 质检清单与运营摘要\n",
    "订单异常监控SOP.md":
      "# 订单异常监控 SOP\n\n- 发货超时：付款 48h 未出单或填单 72h 未揽收即告警\n- 退款拒绝：结合金额、拒绝次数和平台介入概率分级\n- 差评监控：聚合高频问题关键词并回推责任方整改\n- 运营响应：每小时订单播报 + 每日数据大盘摘要\n",
  },
  [LIVE_BROADCAST_AGENT_DEMO.id]: {
    "直播运营说明.md":
      "# 直播运营说明\n\n- 处理直播脚本、达人投放、热点选题、爆品热度和微博舆情\n- 当前全部为 mock 演示，不调用真实平台接口\n- 预置问题直接对应文档中的 6 组真实示例\n",
    "抖音投放流程.md":
      "# 抖音投放流程\n\n1. 先判断赛道和商品标签\n2. 再抓达人 / 热榜 / 视频热度数据\n3. 最后输出投放建议、选题建议或选品建议\n",
    "直播编导清单.md":
      "# 直播编导清单\n\n- 校准直播类型与品类基调\n- 输出整场 Rundown\n- 深化关键模块逐字稿\n- 生成主持串场与福利节奏\n",
  },
  [XIAOCANMAMA_IP_AGENT_DEMO.id]: {
    "小蚕妈妈IP运营说明.md":
      "# 小蚕妈妈 IP 运营说明\n\n- 面向私域带货、公众号种草和团购开卖场景\n- 当前全部为 mock 演示，不调用真实店铺或素材库接口\n- 预置问题直接对应“童装清仓开团”和“创维吹风机返场”两组示例\n",
    "开团文输入规范.md":
      "# 开团文输入规范\n\n## 必填字段\n- 商品名称\n- 品牌\n- 价格：活动价 + 锚点原价\n- 开卖时间\n- 店铺链接\n\n## 选填字段\n- 产品核心参数\n- 销量数据\n- 真实使用反馈\n- 品类特殊说明（内衣 / 电器 / 鞋类等）\n\n## 可选媒体\n- 产品图\n- 视频\n- 所有媒体位在输出中统一用占位符标记\n",
    "返场补货SOP.md":
      "# 返场补货 SOP\n\n1. 先讲清楚为什么返场、为什么还能补到货\n2. 再给价格锚点、库存量和前 N 名福利\n3. 最后按适合人群拆解购买理由，并收口“清完不补”的稀缺感\n",
  },
  "employee-writer": {
    "写作规范.md":
      "# 写作规范\n\n- 输出先结论后展开\n- 用词尽量简洁直接\n- 结构优先于修辞\n",
    "会议纪要模板.md":
      "# 会议纪要模板\n\n## 结论\n## 待办\n## 风险\n## 下次同步事项\n",
    "归档说明.md":
      "# 归档说明\n\n文档命名建议按“模块 + 类型 + 日期”统一，便于后续检索和回看。\n",
  },
  "employee-sales": {
    "销售日报模板.md":
      "# 销售日报模板\n\n- 今日新增线索\n- 重点客户进展\n- 风险跟进项\n- 次日计划\n",
    "客户跟进规范.md":
      "# 客户跟进规范\n\n- 跟进结论必须明确\n- 重要节点需要时间戳\n- 风险客户需要单独标记\n",
    "战报汇总.md":
      "# 战报汇总\n\n当前边缘销售工作站仍待激活，正式接入后再承接实时销售战报生成任务。\n",
  },
};

/**
 * FrontisAI Web 端用户列表示例。
 */
export const INITIAL_FRONTIS_WEB_USERS: FrontisWebUserItem[] = [
  {
    id: "user-admin-001",
    name: "杨万泉",
    phone: "13800000001",
    role: "boss",
    status: "active",
    assignedWorkspaceIds: ["workspace-cloud", "workspace-local-bj"],
    assignedAgentIds: [
      ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
      LIVE_BROADCAST_AGENT_DEMO.id,
      XIAOCANMAMA_IP_AGENT_DEMO.id,
      "employee-writer",
    ],
    lastActiveAt: "今天 18:20",
    dialogueCount: 42,
    tokenUsage: 186000,
    resultCount: 17,
  },
  {
    id: "user-admin-002",
    name: "陈雪梅",
    phone: "13800000002",
    role: "admin",
    status: "active",
    assignedWorkspaceIds: ["workspace-cloud"],
    assignedAgentIds: [
      ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
      LIVE_BROADCAST_AGENT_DEMO.id,
      XIAOCANMAMA_IP_AGENT_DEMO.id,
      "employee-writer",
    ],
    lastActiveAt: "今天 16:48",
    dialogueCount: 28,
    tokenUsage: 124000,
    resultCount: 9,
  },
  {
    id: "user-member-001",
    name: "王晨",
    phone: "13800000011",
    role: "member",
    status: "active",
    assignedWorkspaceIds: ["workspace-local", "workspace-local-sh"],
    assignedAgentIds: [
      "employee-writer",
      ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
      LIVE_BROADCAST_AGENT_DEMO.id,
      XIAOCANMAMA_IP_AGENT_DEMO.id,
    ],
    lastActiveAt: "今天 17:36",
    dialogueCount: 21,
    tokenUsage: 78000,
    resultCount: 11,
  },
  {
    id: "user-member-002",
    name: "李婷",
    phone: "13800000012",
    role: "member",
    status: "active",
    assignedWorkspaceIds: ["workspace-local"],
    assignedAgentIds: [
      "employee-writer",
      ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
      LIVE_BROADCAST_AGENT_DEMO.id,
      XIAOCANMAMA_IP_AGENT_DEMO.id,
    ],
    lastActiveAt: "今天 15:12",
    dialogueCount: 18,
    tokenUsage: 64200,
    resultCount: 6,
  },
  {
    id: "user-member-003",
    name: "赵立",
    phone: "13800000013",
    role: "member",
    status: "disabled",
    assignedWorkspaceIds: ["workspace-local-bj"],
    assignedAgentIds: [
      "employee-writer",
      ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
      LIVE_BROADCAST_AGENT_DEMO.id,
      XIAOCANMAMA_IP_AGENT_DEMO.id,
    ],
    lastActiveAt: "昨天 20:18",
    dialogueCount: 7,
    tokenUsage: 21500,
    resultCount: 2,
  },
  {
    id: "user-member-004",
    name: "周可",
    phone: "13800000014",
    role: "member",
    status: "active",
    assignedWorkspaceIds: [],
    assignedAgentIds: [
      "employee-writer",
      ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
      LIVE_BROADCAST_AGENT_DEMO.id,
      XIAOCANMAMA_IP_AGENT_DEMO.id,
    ],
    lastActiveAt: "从未使用",
    dialogueCount: 0,
    tokenUsage: 0,
    resultCount: 0,
  },
];

/**
 * 原型页默认单聊会话列表。
 */
export const INITIAL_DIALOGUE_SESSIONS: DialogueSessionItem[] = buildDialogueScenarioSeedSessions();

/**
 * 原型页默认单聊成果文件。
 */
export const INITIAL_DIALOGUE_ARTIFACTS: Record<string, SynClawArtifactItem[]> =
  buildDialogueScenarioSeedArtifacts();

export const INITIAL_DIALOGUE_PANELS: Record<string, DialogueGeneratedPanelState> =
  buildDialogueScenarioSeedPanels();

/**
 * 原型页默认单聊结果卡片。
 */
export const INITIAL_DIALOGUE_RESULTS: Record<string, DialogueGeneratedResultItem[]> =
  buildDialogueScenarioSeedResults();

/**
 * 原型页默认频道列表。
 */
export const INITIAL_CHANNELS: ChannelItem[] = [
  {
    id: "channel-prd",
    name: "产品冲刺",
    spaceName: "SynClaw 研发室",
    summary: "讨论独立窗口与五 Tab 信息架构。",
    status: "busy",
    members: ["你", "产品策略官", "交互设计师"],
  },
  {
    id: "channel-launch",
    name: "发布排期同步",
    spaceName: "SynClaw 研发室",
    summary: "跟进 3 月下旬设计和开发排期。",
    status: "idle",
    members: ["你", "产品策略官", "本地内容助理"],
  },
];

/**
 * 原型页默认频道消息。
 */
export const INITIAL_CHANNEL_MESSAGES: Record<string, ChatMessage[]> = {
  "channel-prd": [
    {
      id: "group-prd-1",
      role: "assistant",
      author: "交互设计师",
      content: "建议把 AI 专家团里的工作站和 AI 员工做成同页两层结构，避免用户来回跳。",
      timeLabel: "10:02",
    },
    {
      id: "group-prd-2",
      role: "user",
      author: "你",
      content: "@产品策略官 再补一版云端虚拟机和本地模式差异说明。",
      timeLabel: "10:03",
    },
    {
      id: "group-prd-3",
      role: "assistant",
      author: "产品策略官",
      content: "收到，我会把桌面预览只放到云端工作站场景，本地模式只保留对话、附件和技能入口。",
      timeLabel: "10:04",
    },
  ],
  "channel-launch": [
    {
      id: "group-launch-1",
      role: "assistant",
      author: "本地内容助理",
      content: "明晚可以先给一版核心页面，21 号中午前补齐主要设计稿。",
      timeLabel: "11:16",
    },
  ],
};

const PRD_ACCEPTANCE_MARKDOWN = `# SynClaw 独立窗口验收清单

- 对话页复用原频道消息渲染与输入框
- 群聊页补齐成果面板与文件预览
- 云端模式支持小窗、分屏与全屏切换
- AI 专家团保持工作站列表 + 专家卡片结构
`;

const PRD_REVIEW_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>群聊成果预览</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        font-family: "PingFang SC", system-ui, sans-serif;
        color: #0f172a;
        background: #f8fafc;
      }
      .card {
        max-width: 640px;
        padding: 28px;
        border-radius: 20px;
        background: #ffffff;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
      }
      p {
        margin: 0 0 10px;
        line-height: 1.7;
      }
      .tag {
        display: inline-flex;
        padding: 6px 12px;
        border-radius: 999px;
        background: #e0f2fe;
        color: #0369a1;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <span class="tag">群聊成果面板</span>
      <h1>原型接入说明</h1>
      <p>当前页面直接复用了正式 SynClaw 频道里的成果面板组件。</p>
      <p>用户可以在右侧查看最近生成的 markdown、html、json 和图片成果。</p>
    </div>
  </body>
</html>`;

const PRD_LAYOUT_DIFF_JSON = `{
  "page": "group",
  "reuse": ["SynClawChatHeader", "WorkspaceChatPanel", "WorkspaceComposer", "SynClawArtifactsPanel"],
  "changes": ["补齐频道成果面板", "接入文件夹入口", "保留正式预览交互"]
}`;

const PRD_FLOWCHART_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" fill="none">
  <rect width="960" height="540" rx="32" fill="#F8FBFF"/>
  <rect x="56" y="84" width="220" height="126" rx="28" fill="#E0F2FE"/>
  <rect x="370" y="84" width="220" height="126" rx="28" fill="#FFFFFF" stroke="#CFE3F4" stroke-width="2"/>
  <rect x="684" y="84" width="220" height="126" rx="28" fill="#FFFFFF" stroke="#CFE3F4" stroke-width="2"/>
  <rect x="214" y="324" width="220" height="126" rx="28" fill="#FFFFFF" stroke="#CFE3F4" stroke-width="2"/>
  <rect x="528" y="324" width="220" height="126" rx="28" fill="#E8FFF8"/>
  <path d="M276 147H370" stroke="#0EA5E9" stroke-width="10" stroke-linecap="round"/>
  <path d="M590 147H684" stroke="#0EA5E9" stroke-width="10" stroke-linecap="round"/>
  <path d="M480 210V324" stroke="#0EA5E9" stroke-width="10" stroke-linecap="round"/>
  <text x="92" y="136" fill="#0F172A" font-size="34" font-family="PingFang SC, sans-serif" font-weight="600">频道消息</text>
  <text x="92" y="176" fill="#475569" font-size="24" font-family="PingFang SC, sans-serif">讨论过程与上下文</text>
  <text x="405" y="136" fill="#0F172A" font-size="34" font-family="PingFang SC, sans-serif" font-weight="600">工具执行</text>
  <text x="404" y="176" fill="#475569" font-size="24" font-family="PingFang SC, sans-serif">浏览器 / 读写 / 执行</text>
  <text x="720" y="136" fill="#0F172A" font-size="34" font-family="PingFang SC, sans-serif" font-weight="600">成果输出</text>
  <text x="720" y="176" fill="#475569" font-size="24" font-family="PingFang SC, sans-serif">文件沉淀到成果面板</text>
  <text x="249" y="376" fill="#0F172A" font-size="34" font-family="PingFang SC, sans-serif" font-weight="600">频道协作</text>
  <text x="244" y="416" fill="#475569" font-size="24" font-family="PingFang SC, sans-serif">多人并行确认</text>
  <text x="565" y="376" fill="#0F172A" font-size="34" font-family="PingFang SC, sans-serif" font-weight="600">沉淀复盘</text>
  <text x="560" y="416" fill="#475569" font-size="24" font-family="PingFang SC, sans-serif">可继续下载和预览</text>
</svg>`;

/**
 * 原型页默认频道成果文件。
 */
export const INITIAL_CHANNEL_ARTIFACTS: Record<string, SynClawArtifactItem[]> = {
  "channel-prd": [
    {
      id: "artifact-prd-acceptance",
      artifactId: "artifact-prd-acceptance",
      fileName: "SynClaw-独立窗口验收清单.md",
      fileType: "md",
      producerName: "产品策略官",
      producedAt: "2026-03-19 10:18",
      fileSize: "2 KB",
      taskName: "独立窗口方案收口",
      canonicalPath: createDataUrl("text/markdown", PRD_ACCEPTANCE_MARKDOWN),
      mimeType: "text/markdown",
    },
    {
      id: "artifact-prd-review",
      artifactId: "artifact-prd-review",
      fileName: "群聊成果面板接入说明.html",
      fileType: "html",
      producerName: "交互设计师",
      producedAt: "2026-03-19 10:24",
      fileSize: "4 KB",
      taskName: "频道成果页复用",
      canonicalPath: createDataUrl("text/html", PRD_REVIEW_HTML),
      mimeType: "text/html",
    },
    {
      id: "artifact-prd-layout",
      artifactId: "artifact-prd-layout",
      fileName: "group-panel-reuse.json",
      fileType: "json",
      producerName: "资料研究员",
      producedAt: "2026-03-19 10:27",
      fileSize: "1 KB",
      taskName: "组件复用梳理",
      canonicalPath: createDataUrl("application/json", PRD_LAYOUT_DIFF_JSON),
      mimeType: "application/json",
    },
    {
      id: "artifact-prd-flow",
      artifactId: "artifact-prd-flow",
      fileName: "channel-artifact-flow.svg",
      fileType: "svg",
      producerName: "交互设计师",
      producedAt: "2026-03-19 10:31",
      fileSize: "6 KB",
      taskName: "成果流转图",
      canonicalPath: createSvgDataUrl(PRD_FLOWCHART_SVG),
      mimeType: "image/svg+xml",
    },
  ],
  "channel-launch": [
    {
      id: "artifact-launch-checklist",
      artifactId: "artifact-launch-checklist",
      fileName: "发布排期检查清单.md",
      fileType: "md",
      producerName: "本地内容助理",
      producedAt: "2026-03-19 11:15",
      fileSize: "1 KB",
      taskName: "发布前检查",
      canonicalPath: createDataUrl(
        "text/markdown",
        "# 发布排期检查清单\n\n- 页面走查\n- 文案校对\n- 资源核验\n- 回归记录\n",
      ),
      mimeType: "text/markdown",
    },
  ],
};

/**
 * 原型页默认技能列表。
 */
export const INITIAL_SKILLS: SkillItem[] = [
  ...ECOMMERCE_AUTOMATION_SKILL_DEMOS.map(item => ({
    id: `skill-${item.id}`,
    name: item.name,
    category: item.category,
    summary: item.summary,
    installedFor: [ECOMMERCE_AUTOMATION_AGENT_DEMO.id],
    supportAutomation:
      item.id === "shipping-timeout-watch" ||
      item.id === "refund-reject-watch" ||
      item.id === "negative-review-watch" ||
      item.id === "ops-hourly-briefing",
  })),
  ...LIVE_BROADCAST_SKILL_DEMOS.map(item => ({
    id: `skill-${item.id}`,
    name: item.name,
    category: item.category,
    summary: item.summary,
    installedFor: [LIVE_BROADCAST_AGENT_DEMO.id],
    supportAutomation:
      item.id === "live-script" ||
      item.id === "product-heat-analysis" ||
      item.id === "weibo-risk-scan" ||
      item.id === "live-rundown-director",
  })),
  ...XIAOCANMAMA_IP_SKILL_DEMOS.map(item => ({
    id: `skill-${item.id}`,
    name: item.name,
    category: item.category,
    summary: item.summary,
    installedFor: [XIAOCANMAMA_IP_AGENT_DEMO.id],
    supportAutomation: false,
  })),
  {
    id: "skill-prd",
    name: "PRD 拆解器",
    category: "产品",
    summary: "把会议纪要快速拆成需求模块、功能点和验收项。",
    installedFor: ["employee-pm", "employee-writer"],
    supportAutomation: true,
  },
  {
    id: "skill-vision",
    name: "界面草图助手",
    category: "设计",
    summary: "根据结构草图生成页面布局建议和视觉方向。",
    installedFor: ["employee-designer"],
    supportAutomation: false,
  },
  {
    id: "skill-report",
    name: "日报汇总器",
    category: "运营",
    summary: "汇总执行结果、生成日报并回流自动化任务。",
    installedFor: ["employee-sales", "employee-writer"],
    supportAutomation: true,
  },
  {
    id: "skill-file",
    name: "附件归档器",
    category: "文件",
    summary: "整理上传附件、识别文件结构并输出归档结果。",
    installedFor: ["employee-pm"],
    supportAutomation: true,
  },
];

/**
 * 原型页默认自动化任务列表。
 */
export const INITIAL_TASKS: AutomationTaskItem[] = [
  {
    id: "task-prd",
    title: "每日 PRD 同步",
    employeeId: "employee-pm",
    scope: "当前对话上下文",
    schedule: "每天 09:30",
    status: "active",
    lastRun: "今天 09:30",
    summary: "每天自动汇总需求改动、风险和待确认事项。",
  },
  {
    id: "task-summary",
    title: "会议纪要整理",
    employeeId: "employee-writer",
    scope: "本地创作工作站",
    schedule: "工作日 18:30",
    status: "paused",
    lastRun: "昨天 18:30",
    summary: "将录音摘要整理成文档，并输出可执行待办。",
  },
  {
    id: "task-sales",
    title: "企业销售日报",
    employeeId: "employee-sales",
    scope: "边缘销售工作站",
    schedule: "每天 20:00",
    status: "draft",
    lastRun: "尚未运行",
    summary: "待边缘工作站激活后自动生成销售线索日报。",
  },
];

/**
 * 原型页自动化任务的空间绑定选项。
 */
export const INITIAL_AUTOMATION_SPACES = [
  {
    id: "automation-space-rd",
    name: "SynClaw 研发室",
  },
  {
    id: "automation-space-growth",
    name: "增长实验室",
  },
  {
    id: "automation-space-delivery",
    name: "交付服务台",
  },
];

/**
 * 原型页自动化任务的频道绑定选项。
 */
export const INITIAL_AUTOMATION_CHANNEL_OPTIONS = [
  {
    id: "channel-prd",
    spaceId: "automation-space-rd",
    name: "产品冲刺",
  },
  {
    id: "channel-launch",
    spaceId: "automation-space-rd",
    name: "发布排期同步",
  },
  {
    id: "automation-channel-growth",
    spaceId: "automation-space-growth",
    name: "转化实验跟进",
  },
  {
    id: "automation-channel-delivery",
    spaceId: "automation-space-delivery",
    name: "客户交付日报",
  },
];

/**
 * 原型页自动化任务示例。
 */
export const INITIAL_AUTOMATION_TASK_EXAMPLES = [
  {
    taskId: 101,
    title: "产品方案晨检",
    description: "每天检查需求变更、设计阻塞和版本边界，并回写到产品 Agent 的历史会话。",
    executorAgentId: "employee-pm",
    bindingMode: "session",
    sessionId: "dialogue-session-pm-1",
    scheduleKind: "at",
    scheduleSummary: "每天 09:30",
    nextRunAt: "2026-03-20T09:30:00+08:00",
    startTime: "2026-03-20T09:30:00+08:00",
    status: "active",
    displayStatus: "running",
    runCount: 18,
    lastRunAt: "2026-03-19T09:30:00+08:00",
    attachments: [
      {
        id: "prd-doc",
        name: "SynClaw独立窗口原型需求文档.md",
        size: 184320,
        mimeType: "text/markdown",
      },
    ],
    runs: [
      {
        id: "run-101-1",
        sequence: 18,
        taskTime: "2026-03-19T09:30:00+08:00",
        status: "completed",
        result: "已同步 6 处需求变更，新增 2 个待确认项。",
      },
      {
        id: "run-101-2",
        sequence: 17,
        taskTime: "2026-03-18T09:30:00+08:00",
        status: "completed",
        result: "PRD 差异已整理并写回会话。",
      },
    ],
  },
  {
    taskId: 102,
    title: "会议纪要自动归档",
    description: "让内容 Agent 在新会话里整理当天会议纪要，并自动生成待办清单。",
    executorAgentId: "employee-writer",
    bindingMode: "newSession",
    scheduleKind: "every",
    scheduleSummary: "每 180 分钟",
    nextRunAt: "2026-03-19T15:00:00+08:00",
    startTime: "2026-03-19T12:00:00+08:00",
    status: "active",
    displayStatus: "pending",
    runCount: 7,
    lastRunAt: "2026-03-19T12:00:00+08:00",
    attachments: [],
    runs: [
      {
        id: "run-102-1",
        sequence: 7,
        taskTime: "2026-03-19T12:00:00+08:00",
        status: "completed",
        result: "已生成最新会议纪要摘要和 4 条待办。",
      },
    ],
  },
  {
    taskId: 103,
    title: "竞品动态扫描",
    description: "让资料研究 Agent 每个工作日生成一份竞品更新摘要，并沉淀到新会话。",
    executorAgentId: "employee-research",
    bindingMode: "newSession",
    scheduleKind: "cron",
    scheduleSummary: "工作日 10:00 / 16:00",
    nextRunAt: "2026-03-19T16:00:00+08:00",
    startTime: "2026-03-19T10:00:00+08:00",
    status: "active",
    displayStatus: "completed",
    runCount: 4,
    lastRunAt: "2026-03-19T10:00:00+08:00",
    attachments: [
      {
        id: "competitor-sheet",
        name: "竞品采样清单.xlsx",
        size: 327680,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
    runs: [
      {
        id: "run-103-1",
        sequence: 4,
        taskTime: "2026-03-19T10:00:00+08:00",
        status: "completed",
        result: "已输出 3 条新参考案例。",
      },
    ],
  },
  {
    taskId: 104,
    title: "上线检查回访",
    description: "绑定运维 Agent 的既有会话，持续跟进盒子状态和上线回归。",
    executorAgentId: "employee-ops",
    bindingMode: "session",
    sessionId: "dialogue-session-ops-1",
    scheduleKind: "at",
    scheduleSummary: "单次 03-20 19:30",
    nextRunAt: "2026-03-20T19:30:00+08:00",
    startTime: "2026-03-20T19:30:00+08:00",
    status: "paused",
    displayStatus: "pending",
    runCount: 1,
    lastRunAt: "2026-03-18T20:00:00+08:00",
    attachments: [],
    runs: [
      {
        id: "run-104-1",
        sequence: 1,
        taskTime: "2026-03-18T20:00:00+08:00",
        status: "failed",
        result: "待补一份最新巡检截图，任务暂停等待手动恢复。",
      },
    ],
  },
];

export const INITIAL_GROUP_SPACES: SynClawSpaceItem[] = [
  {
    id: "space-rd",
    name: "SynClaw 研发室",
    channels: [
      { id: "channel-prd", name: "产品冲刺" },
      { id: "channel-launch", name: "发布排期同步" },
    ],
  },
  {
    id: "space-growth",
    name: "增长实验室",
    channels: [{ id: "channel-growth", name: "转化实验跟进" }],
  },
];

export const INITIAL_GROUP_AI_EMPLOYEES: SynClawAiEmployee[] = [
  {
    id: "201",
    name: "产品策略官",
    role: "需求拆解与方案收敛",
    avatarUrl: getAvatarUrl("group-agent-pm"),
    runtimeId: "runtime-cloud-1",
    runtimeName: "云端产品工作站",
    bindable: true,
    provisioningStatus: "applied",
    remoteStatus: "online",
    runtimeAgentId: "runtime-agent-pm",
  },
  {
    id: "202",
    name: "交互设计师",
    role: "页面结构与交互调整",
    avatarUrl: getAvatarUrl("group-agent-designer"),
    runtimeId: "runtime-cloud-1",
    runtimeName: "云端产品工作站",
    bindable: true,
    provisioningStatus: "applied",
    remoteStatus: "executing",
    runtimeAgentId: "runtime-agent-designer",
  },
  {
    id: "203",
    name: "资料研究员",
    role: "补充背景与行业案例",
    avatarUrl: getAvatarUrl("group-agent-research"),
    runtimeId: "runtime-cloud-2",
    runtimeName: "云端研究工作站",
    bindable: true,
    provisioningStatus: "applied",
    remoteStatus: "online",
    runtimeAgentId: "runtime-agent-research",
  },
  {
    id: "204",
    name: "本地内容助理",
    role: "纪要与文档整理",
    avatarUrl: getAvatarUrl("group-agent-writer"),
    runtimeId: "runtime-local-1",
    runtimeName: "本地创作工作站",
    bindable: true,
    provisioningStatus: "applied",
    remoteStatus: "online",
    runtimeAgentId: "runtime-agent-writer",
  },
];

export const INITIAL_GROUP_TENANT_MEMBER_OPTIONS: SynClawTenantMemberOption[] = [
  { id: "member-you", name: "本地测试用户", subtitle: "当前登录用户" },
  { id: "member-fe", name: "前端研发", subtitle: "负责页面与交互联调" },
  { id: "member-design", name: "视觉设计", subtitle: "负责样式与图标" },
  { id: "member-op", name: "上线协调员", subtitle: "负责排期与验收" },
  { id: "member-growth", name: "增长负责人", subtitle: "负责增长实验室协作" },
];

export const INITIAL_GROUP_CHANNEL_AGENT_IDS: Record<string, string[]> = {
  "channel-prd": ["201", "202", "203"],
  "channel-launch": ["201", "204"],
  "channel-growth": ["203"],
};

export const INITIAL_GROUP_CHANNEL_TENANT_MEMBERS: Record<string, SynClawTenantMemberSelection[]> =
  {
    "channel-prd": [
      { identityId: "member-you", accessRole: "owner" },
      { identityId: "member-fe", accessRole: "speaker" },
      { identityId: "member-design", accessRole: "speaker" },
    ],
    "channel-launch": [
      { identityId: "member-you", accessRole: "owner" },
      { identityId: "member-op", accessRole: "manager" },
    ],
    "channel-growth": [
      { identityId: "member-you", accessRole: "owner" },
      { identityId: "member-growth", accessRole: "manager" },
    ],
  };

export const INITIAL_GROUP_CHANNEL_MESSAGES: Record<string, ChatMessage[]> = {
  ...INITIAL_CHANNEL_MESSAGES,
  "channel-growth": [
    {
      id: "group-growth-1",
      role: "assistant",
      author: "资料研究员",
      content: "增长实验室这边建议把技能广场的筛选顺序稳定下来，先 Agent，再分类，再关键字。",
      timeLabel: "14:20",
    },
    {
      id: "group-growth-2",
      role: "user",
      author: "你",
      content: "先按这个方向保留，后面再补筛选组合的边界状态。",
      timeLabel: "14:21",
    },
  ],
};

export const INITIAL_GROUP_CHANNEL_ARTIFACTS: Record<string, SynClawArtifactItem[]> = {
  ...INITIAL_CHANNEL_ARTIFACTS,
  "channel-growth": [
    {
      id: "artifact-growth-notes",
      artifactId: "artifact-growth-notes",
      fileName: "增长实验记录.md",
      fileType: "md",
      producerName: "资料研究员",
      producedAt: "2026-03-19 14:30",
      fileSize: "1 KB",
      taskName: "增长频道复盘",
      canonicalPath: createDataUrl(
        "text/markdown",
        "# 增长实验记录\n\n- 技能广场筛选优先按 Agent 维度组织\n- 频道消息和成果面板保持并列\n",
      ),
      mimeType: "text/markdown",
    },
  ],
};

export const INITIAL_SKILL_CATEGORIES: SkillCategoryInfo[] = [
  { category_id: 1, key: "product", name: "产品", sort_order: 1, status: "active" },
  { category_id: 2, key: "design", name: "设计", sort_order: 2, status: "active" },
  { category_id: 3, key: "research", name: "研究", sort_order: 3, status: "active" },
  { category_id: 4, key: "automation", name: "自动化", sort_order: 4, status: "active" },
];

export const INITIAL_SKILL_MARKETPLACE_ITEMS: CoworkerSkillItem[] = [
  {
    skill_id: 101,
    skill_key: "prd-breakdown",
    name: "PRD 拆解器",
    description: "把会议纪要快速拆成功能模块、业务规则和验收项。",
    latest_version: "1.4.2",
    latest_skill_version_id: 1001,
    scope: "official",
    visibility: "tenant_only",
    category: INITIAL_SKILL_CATEGORIES[0],
    cover: null,
    publisher: "官方发布",
    updated_at: "2026-03-20T10:30:00+08:00",
  },
  {
    skill_id: 102,
    skill_key: "layout-sketch",
    name: "界面草图助手",
    description: "根据信息结构快速给出页面布局和视觉方向。",
    latest_version: "0.9.8",
    latest_skill_version_id: 1002,
    scope: "tenant",
    visibility: "tenant_only",
    category: INITIAL_SKILL_CATEGORIES[1],
    cover: null,
    publisher: {
      name: "Frontis 产品组",
      publisher_type: "tenant",
      owner_tenant_id: 1,
      owner_identity_id: 1001,
    },
    updated_at: "2026-03-21T11:00:00+08:00",
    owner_tenant_id: 1,
  },
  {
    skill_id: 103,
    skill_key: "competitor-scan",
    name: "竞品扫描器",
    description: "聚合竞品信息并输出结构化参考结论。",
    latest_version: "2.1.0",
    latest_skill_version_id: 1003,
    scope: "official",
    visibility: "tenant_only",
    category: INITIAL_SKILL_CATEGORIES[2],
    cover: null,
    publisher: "官方发布",
    updated_at: "2026-03-18T16:20:00+08:00",
  },
  {
    skill_id: 104,
    skill_key: "daily-report",
    name: "日报汇总器",
    description: "收集执行结果并生成日报或周报草稿。",
    latest_version: "1.2.1",
    latest_skill_version_id: 1004,
    scope: "tenant",
    visibility: "identity_only",
    category: INITIAL_SKILL_CATEGORIES[3],
    cover: null,
    publisher: {
      name: "Frontis 产品组",
      publisher_type: "tenant",
      owner_tenant_id: 1,
      owner_identity_id: 1001,
    },
    updated_at: "2026-03-22T09:10:00+08:00",
    owner_tenant_id: 1,
  },
];

export const INITIAL_SKILL_INSTALL_AGENTS: AdminAiEmployeeListItem[] = [
  {
    id: "201",
    source: "coworker",
    managed_by_coworker: true,
    visible_to_all: true,
    coworker_agent_id: 201,
    name: "产品策略官",
    avatar_url: SKILL_AGENT_AVATAR_URLS["201"],
    remote_status: "online",
    primary_model: "gpt-4o",
    runtime_id: "云端产品工作站",
    runtime_provisioning_status: "applied",
  },
  {
    id: "202",
    source: "coworker",
    managed_by_coworker: true,
    visible_to_all: true,
    coworker_agent_id: 202,
    name: "交互设计师",
    avatar_url: SKILL_AGENT_AVATAR_URLS["202"],
    remote_status: "executing",
    primary_model: "gpt-4-turbo",
    runtime_id: "云端产品工作站",
    runtime_provisioning_status: "applied",
  },
  {
    id: "203",
    source: "coworker",
    managed_by_coworker: true,
    visible_to_all: true,
    coworker_agent_id: 203,
    name: "资料研究员",
    avatar_url: SKILL_AGENT_AVATAR_URLS["203"],
    remote_status: "online",
    primary_model: "gpt-4-turbo",
    runtime_id: "云端研究工作站",
    runtime_provisioning_status: "applied",
  },
  {
    id: "204",
    source: "coworker",
    managed_by_coworker: true,
    visible_to_all: true,
    coworker_agent_id: 204,
    name: "本地内容助理",
    avatar_url: SKILL_AGENT_AVATAR_URLS["204"],
    remote_status: "offline",
    primary_model: "gpt-4o",
    runtime_id: "本地创作工作站",
    runtime_provisioning_status: "applied",
  },
];

export const INITIAL_SKILL_AGENT_BINDINGS_BY_AGENT_ID = {
  "201": [
    {
      agent_id: 201,
      skill_id: 101,
      target_skill_version_id: 1001,
      enabled: true,
      item_revision: 3,
      updated_at: "2026-03-20T10:40:00+08:00",
    },
    {
      agent_id: 201,
      skill_id: 104,
      target_skill_version_id: 1004,
      enabled: true,
      item_revision: 1,
      updated_at: "2026-03-22T09:20:00+08:00",
    },
  ],
  "202": [
    {
      agent_id: 202,
      skill_id: 102,
      target_skill_version_id: 1002,
      enabled: true,
      item_revision: 4,
      updated_at: "2026-03-21T11:10:00+08:00",
    },
  ],
  "203": [
    {
      agent_id: 203,
      skill_id: 103,
      target_skill_version_id: 1003,
      enabled: true,
      item_revision: 2,
      updated_at: "2026-03-18T16:30:00+08:00",
    },
  ],
  "204": [],
};

export const INITIAL_SKILL_INSTALL_STATUS_BY_AGENT_ID = {
  "201": {
    101: {
      runtime_id: "runtime-cloud-1",
      agent_id: 201,
      skill_id: 101,
      binding: { target_skill_version_id: 1001, enabled: true, item_revision: 3 },
      job: null,
      target: { target_id: 1, status: "installed", current_stage: "installed", progress_percent: 100 },
      inventory: { local_modified: false, install_status: "installed", install_stage: "installed", progress_percent: 100 },
    },
    104: {
      runtime_id: "runtime-cloud-1",
      agent_id: 201,
      skill_id: 104,
      binding: { target_skill_version_id: 1004, enabled: true, item_revision: 1 },
      job: null,
      target: { target_id: 2, status: "installed", current_stage: "installed", progress_percent: 100 },
      inventory: { local_modified: false, install_status: "installed", install_stage: "installed", progress_percent: 100 },
    },
  },
  "202": {
    102: {
      runtime_id: "runtime-cloud-1",
      agent_id: 202,
      skill_id: 102,
      binding: { target_skill_version_id: 1002, enabled: true, item_revision: 4 },
      job: { job_id: 10002, status: "error", plan_generation: 1, plan_hash: "hash-202-102", last_error_message: "依赖包校验失败" },
      target: { target_id: 3, status: "failed", current_stage: "failed", progress_percent: 100, error_message: "依赖包校验失败" },
      inventory: { local_modified: false, install_status: "failed", install_stage: "failed", progress_percent: 100, error_message: "依赖包校验失败" },
    },
  },
  "203": {
    103: {
      runtime_id: "runtime-cloud-2",
      agent_id: 203,
      skill_id: 103,
      binding: { target_skill_version_id: 1003, enabled: true, item_revision: 2 },
      job: null,
      target: { target_id: 4, status: "installed", current_stage: "installed", progress_percent: 100 },
      inventory: { local_modified: false, install_status: "installed", install_stage: "installed", progress_percent: 100 },
    },
  },
  "204": {},
};

export const PRD_CURRENT_IDENTITY_ID = 1001;
