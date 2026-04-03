import {
  INITIAL_DIALOGUE_ARTIFACTS,
  INITIAL_DIALOGUE_RESULTS,
  INITIAL_DIALOGUE_SESSIONS,
  INITIAL_EMPLOYEES,
  INITIAL_FRONTIS_WEB_USERS,
  INITIAL_SKILLS,
  INITIAL_WORKSPACES,
  INITIAL_AUTOMATION_TASK_EXAMPLES,
} from "@/mocks/mockData";
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
import type { SynClawArtifactItem } from "@/pages/synclaw/types";

import type {
  DialogueGeneratedResultItem,
  DialogueSessionItem,
  EmployeeItem,
  FrontisWebRole,
  FrontisWebUserItem,
  SkillItem,
  WorkspaceItem,
} from "./types";
import { mapDialogueSessionForRole, mapEmployeeForRole } from "./agentDisplay";

/**
 * OpenClaw V2 一级视图标识。
 */
export type OpenClawV2Section = "chat" | "agents" | "channels" | "tasks";

/**
 * OpenClaw V2 技能安装方式。
 */
export type OpenClawV2SkillInstallKind = "bundled" | "market" | "git";

/**
 * OpenClaw V2 技能安装入口。
 */
export interface OpenClawV2SkillInstallOption {
  id: string;
  label: string;
  kind: OpenClawV2SkillInstallKind;
}

/**
 * OpenClaw V2 技能广场条目。
 */
export interface OpenClawV2SkillCatalogItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  source: string;
  category: string;
  always: boolean;
  supportAutomation: boolean;
  installedFor: string[];
  favoriteFor: string[];
  disabledFor: string[];
  missingRequirements: string[];
  installOptions: OpenClawV2SkillInstallOption[];
}

/**
 * OpenClaw V2 连接中心提示。
 */
export interface OpenClawV2ChannelGuide {
  title: string;
  subtitle: string;
  highlights: string[];
}

/**
 * OpenClaw V2 渠道配置字段类型。
 */
export type OpenClawV2ChannelFieldKind = "text" | "password" | "enum" | "boolean" | "array";

/**
 * OpenClaw V2 渠道配置选项。
 */
export interface OpenClawV2ChannelFieldOption {
  label: string;
  value: string;
}

/**
 * OpenClaw V2 渠道配置字段。
 */
export interface OpenClawV2ChannelField {
  key: string;
  label: string;
  kind: OpenClawV2ChannelFieldKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: OpenClawV2ChannelFieldOption[];
}

/**
 * OpenClaw V2 渠道待授权用户。
 */
export interface OpenClawV2ChannelPairingItem {
  id: string;
  name: string;
  sourceLabel: string;
  createdAt: string;
  note: string;
}

/**
 * OpenClaw V2 渠道账户 / 机器人。
 */
export interface OpenClawV2ChannelAccountItem {
  accountId: string;
  label: string;
  configured: boolean;
  connected: boolean;
  running: boolean;
  ownerAgentId: string;
  formDraft: Record<string, OpenClawV2ChannelFormValue>;
  pairings: OpenClawV2ChannelPairingItem[];
  lastError?: string;
}

/**
 * OpenClaw V2 渠道绑定 Agent。
 */
export interface OpenClawV2ChannelAgentBindingItem {
  agentId: string;
  summary: string;
  lastActiveAt: string;
  status: "online" | "pending" | "offline";
}

/**
 * OpenClaw V2 渠道配置值。
 */
export type OpenClawV2ChannelFormValue = string | boolean | string[];

/**
 * OpenClaw V2 渠道卡片。
 */
export interface OpenClawV2ChannelItem {
  id: string;
  label: string;
  statusText: string;
  tone: "success" | "warning" | "neutral";
  connectionText: string;
  configured: boolean;
  ownerAgentIds: string[];
  guide: OpenClawV2ChannelGuide;
  configTitle: string;
  configSubtitle: string;
  formDraft: Record<string, OpenClawV2ChannelFormValue>;
  fields: OpenClawV2ChannelField[];
  accounts: OpenClawV2ChannelAccountItem[];
  defaultAccountId?: string;
  supportsMultipleAccounts?: boolean;
  addAccountLabel?: string;
  dangerActionLabel?: string;
  pairings: OpenClawV2ChannelPairingItem[];
  bindings: OpenClawV2ChannelAgentBindingItem[];
}

/**
 * OpenClaw V2 自动化任务运行状态。
 */
export type OpenClawV2AutomationRunStatus = "completed" | "running" | "pending" | "failed";

/**
 * OpenClaw V2 自动化任务运行记录。
 */
export interface OpenClawV2AutomationRunItem {
  id: string;
  sequence: number;
  taskTime: string;
  status: OpenClawV2AutomationRunStatus;
  result: string;
  durationLabel: string;
}

/**
 * OpenClaw V2 自动化任务。
 */
export interface OpenClawV2AutomationTaskItem {
  id: string;
  name: string;
  description: string;
  agentId: string;
  sessionTarget: "main" | "isolated";
  wakeMode: "next-heartbeat" | "now";
  scheduleKind: "at" | "every" | "cron";
  scheduleLabel: string;
  nextRunAt: string;
  updatedAt: string;
  enabled: boolean;
  status: OpenClawV2AutomationRunStatus;
  sessionId?: string;
  runs: OpenClawV2AutomationRunItem[];
}

const OPENCLAW_V2_ADMIN_AGENT_IDS = [
  ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
  LIVE_BROADCAST_AGENT_DEMO.id,
  XIAOCANMAMA_IP_AGENT_DEMO.id,
  "employee-writer",
] as const;

const OPENCLAW_V2_EMPLOYEE_AGENT_IDS = [
  "employee-writer",
  ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
  LIVE_BROADCAST_AGENT_DEMO.id,
  XIAOCANMAMA_IP_AGENT_DEMO.id,
] as const;

const OPENCLAW_V2_AGENT_ORDER = [
  "employee-writer",
  ECOMMERCE_AUTOMATION_AGENT_DEMO.id,
  LIVE_BROADCAST_AGENT_DEMO.id,
  XIAOCANMAMA_IP_AGENT_DEMO.id,
] as const;
const OPENCLAW_V2_AGENT_ORDER_MAP = new Map<string, number>(
  OPENCLAW_V2_AGENT_ORDER.map((agentId, index) => [agentId, index]),
);

const OPENCLAW_V2_SKILL_CATALOG: OpenClawV2SkillCatalogItem[] = [
  ...ECOMMERCE_AUTOMATION_SKILL_DEMOS.map(item => ({
    id: `skill-${item.id}`,
    name: item.name,
    description: item.description,
    emoji: item.emoji,
    source: "openclaw-bundled",
    category: item.category,
    always: false,
    supportAutomation:
      item.id === "shipping-timeout-watch" ||
      item.id === "refund-reject-watch" ||
      item.id === "negative-review-watch" ||
      item.id === "ops-hourly-briefing",
    installedFor: [ECOMMERCE_AUTOMATION_AGENT_DEMO.id],
    favoriteFor: [ECOMMERCE_AUTOMATION_AGENT_DEMO.id],
    disabledFor: [],
    missingRequirements: [],
    installOptions: [],
  })),
  ...LIVE_BROADCAST_SKILL_DEMOS.map(item => ({
    id: `skill-${item.id}`,
    name: item.name,
    description: item.description,
    emoji: item.emoji,
    source: "openclaw-bundled",
    category: item.category,
    always: false,
    supportAutomation:
      item.id === "live-script" ||
      item.id === "product-heat-analysis" ||
      item.id === "weibo-risk-scan" ||
      item.id === "live-rundown-director",
    installedFor: [LIVE_BROADCAST_AGENT_DEMO.id],
    favoriteFor: [LIVE_BROADCAST_AGENT_DEMO.id],
    disabledFor: [],
    missingRequirements: [],
    installOptions: [],
  })),
  ...XIAOCANMAMA_IP_SKILL_DEMOS.map(item => ({
    id: `skill-${item.id}`,
    name: item.name,
    description: item.description,
    emoji: item.emoji,
    source: "openclaw-bundled",
    category: item.category,
    always: false,
    supportAutomation: false,
    installedFor: [XIAOCANMAMA_IP_AGENT_DEMO.id],
    favoriteFor: [XIAOCANMAMA_IP_AGENT_DEMO.id],
    disabledFor: [],
    missingRequirements: [],
    installOptions: [],
  })),
  {
    id: "skill-sequence-overview",
    name: "经营总览",
    description: "汇总序列评分、预警、趋势和晨会口径，适合老板快速看盘。",
    emoji: "📊",
    source: "openclaw-bundled",
    category: "经营分析",
    always: true,
    supportAutomation: true,
    installedFor: ["employee-pm", "employee-writer"],
    favoriteFor: ["employee-pm", "employee-writer"],
    disabledFor: [],
    missingRequirements: [],
    installOptions: [],
  },
  {
    id: "skill-employee-assess",
    name: "关键人评估",
    description: "对员工表现、证据、ERP 数据与风险项做综合判断，并输出培养建议。",
    emoji: "🧑‍💼",
    source: "openclaw-bundled",
    category: "组织管理",
    always: false,
    supportAutomation: true,
    installedFor: ["employee-designer", "employee-writer"],
    favoriteFor: ["employee-designer"],
    disabledFor: [],
    missingRequirements: [],
    installOptions: [],
  },
  {
    id: "skill-redline",
    name: "风险识别",
    description: "针对红黄线事件做批量预警，输出优先级和约谈建议。",
    emoji: "🚨",
    source: "openclaw-bundled",
    category: "风控",
    always: false,
    supportAutomation: true,
    installedFor: ["employee-research", "employee-writer"],
    favoriteFor: ["employee-research"],
    disabledFor: [],
    missingRequirements: [],
    installOptions: [],
  },
  {
    id: "skill-benchmark",
    name: "标杆放大器",
    description: "识别高表现员工、沉淀事迹并生成表扬与晋升建议。",
    emoji: "🏆",
    source: "openclaw-bundled",
    category: "组织管理",
    always: false,
    supportAutomation: false,
    installedFor: ["employee-ops", "employee-writer"],
    favoriteFor: ["employee-ops"],
    disabledFor: [],
    missingRequirements: [],
    installOptions: [],
  },
  {
    id: "skill-score-rank",
    name: "序列排名",
    description: "按序列输出标杆区、中间区、关注区的完整排名和筛选面板。",
    emoji: "📈",
    source: "openclaw-bundled",
    category: "经营分析",
    always: true,
    supportAutomation: false,
    installedFor: ["employee-sales", "employee-writer"],
    favoriteFor: ["employee-sales"],
    disabledFor: [],
    missingRequirements: [],
    installOptions: [],
  },
  {
    id: "skill-doc-brief",
    name: "会议摘要",
    description: "将会话、附件和经营结果沉淀为可下载摘要文档。",
    emoji: "📝",
    source: "community",
    category: "知识沉淀",
    always: false,
    supportAutomation: true,
    installedFor: ["employee-writer"],
    favoriteFor: ["employee-writer"],
    disabledFor: [],
    missingRequirements: [],
    installOptions: [],
  },
  {
    id: "skill-feishu-notify",
    name: "飞书播报",
    description: "把经营简报、预警与任务结果推送到飞书群或单聊。",
    emoji: "📣",
    source: "market",
    category: "渠道连接",
    always: false,
    supportAutomation: true,
    installedFor: ["employee-pm", "employee-research"],
    favoriteFor: [],
    disabledFor: ["employee-research"],
    missingRequirements: [],
    installOptions: [],
  },
  {
    id: "skill-browser-runner",
    name: "浏览器采集",
    description: "自动打开网页、读取内容并生成结构化摘要。",
    emoji: "🌐",
    source: "market",
    category: "执行工具",
    always: false,
    supportAutomation: true,
    installedFor: [],
    favoriteFor: [],
    disabledFor: [],
    missingRequirements: ["未绑定浏览器执行器"],
    installOptions: [
      {
        id: "skill-browser-runner-bundled",
        label: "安装内置执行器",
        kind: "bundled",
      },
      {
        id: "skill-browser-runner-market",
        label: "从技能广场安装",
        kind: "market",
      },
    ],
  },
  {
    id: "skill-erp-connector",
    name: "ERP 连接器",
    description: "接入 ERP 业务库，支持人效、销售和库存查询。",
    emoji: "🧱",
    source: "private",
    category: "数据接入",
    always: false,
    supportAutomation: true,
    installedFor: [],
    favoriteFor: [],
    disabledFor: [],
    missingRequirements: ["缺少 ERP 租户密钥"],
    installOptions: [
      {
        id: "skill-erp-connector-git",
        label: "从 Git 仓库同步",
        kind: "git",
      },
    ],
  },
];

const OPENCLAW_V2_CHANNELS: OpenClawV2ChannelItem[] = [
  {
    id: "channel-feishu",
    label: "飞书",
    statusText: "已配置",
    tone: "success",
    connectionText: "2 个机器人在线",
    configured: true,
    ownerAgentIds: ["employee-writer", "employee-pm", "employee-research"],
    guide: {
      title: "凭证连接",
      subtitle: "桌面端推荐 WebSocket 模式，不需要额外暴露公网 webhook。",
      highlights: [
        "必填 App ID + App Secret",
        "推荐 connectionMode=websocket",
        "Webhook 模式额外需要 Verification Token + Encrypt Key",
      ],
    },
    configTitle: "飞书机器人",
    configSubtitle: "支持添加多个机器人，并分别绑定不同 AI 伙伴。",
    formDraft: {
      name: "",
      appId: "",
      appSecret: "",
      connectionMode: "websocket",
      domain: "feishu",
      verificationToken: "",
      encryptKey: "",
      webhookPath: "/feishu/events",
    },
    fields: [
      {
        key: "name",
        label: "机器人名称",
        kind: "text",
        placeholder: "可选，用于 tab 名称显示",
      },
      {
        key: "appId",
        label: "App ID",
        kind: "text",
        required: true,
        placeholder: "请输入飞书应用 ID",
      },
      {
        key: "appSecret",
        label: "App Secret",
        kind: "password",
        required: true,
        placeholder: "请输入飞书应用密钥",
      },
      {
        key: "connectionMode",
        label: "连接模式",
        kind: "enum",
        required: true,
        options: [
          { label: "websocket", value: "websocket" },
          { label: "webhook", value: "webhook" },
        ],
      },
      {
        key: "domain",
        label: "域名",
        kind: "enum",
        options: [
          { label: "feishu", value: "feishu" },
          { label: "lark", value: "lark" },
        ],
      },
      {
        key: "verificationToken",
        label: "Verification Token",
        kind: "password",
        placeholder: "Webhook 模式需要填写",
      },
      {
        key: "encryptKey",
        label: "Encrypt Key",
        kind: "password",
        placeholder: "Webhook 模式需要填写",
      },
      {
        key: "webhookPath",
        label: "Webhook Path",
        kind: "text",
        placeholder: "/feishu/events",
      },
    ],
    accounts: [
      {
        accountId: "default",
        label: "默认配置",
        configured: true,
        connected: true,
        running: true,
        ownerAgentId: "employee-writer",
        formDraft: {
          name: "CEO 播报",
          appId: "cli_a9069ba44be2dbc8",
          appSecret: "mock-feishu-secret",
          connectionMode: "websocket",
          domain: "feishu",
          verificationToken: "",
          encryptKey: "",
          webhookPath: "/feishu/events",
        },
        pairings: [
          {
            id: "pairing-feishu-default-1",
            name: "黄总",
            sourceLabel: "CEO 单聊入口",
            createdAt: "今天 10:18",
            note: "希望直接查看生产整体情况。",
          },
        ],
      },
      {
        accountId: "sales-bot",
        label: "销售播报",
        configured: true,
        connected: true,
        running: true,
        ownerAgentId: "employee-pm",
        formDraft: {
          name: "销售播报",
          appId: "cli_sales_bot",
          appSecret: "mock-sales-secret",
          connectionMode: "websocket",
          domain: "feishu",
          verificationToken: "",
          encryptKey: "",
          webhookPath: "/feishu/sales/events",
        },
        pairings: [],
      },
      {
        accountId: "risk-bot",
        label: "风险预警",
        configured: true,
        connected: false,
        running: false,
        ownerAgentId: "employee-research",
        formDraft: {
          name: "风险预警",
          appId: "cli_risk_alert",
          appSecret: "mock-risk-secret",
          connectionMode: "webhook",
          domain: "feishu",
          verificationToken: "risk-token",
          encryptKey: "risk-encrypt-key",
          webhookPath: "/feishu/risk/events",
        },
        pairings: [
          {
            id: "pairing-feishu-risk-1",
            name: "运营助理 Amy",
            sourceLabel: "风险播报群",
            createdAt: "今天 09:42",
            note: "准备代发一份管理动作清单。",
          },
        ],
        lastError: "等待公网回调验证完成",
      },
    ],
    defaultAccountId: "default",
    supportsMultipleAccounts: true,
    addAccountLabel: "新增飞书机器人",
    dangerActionLabel: "解除飞书连接",
    pairings: [],
    bindings: [],
  },
  {
    id: "channel-wecom",
    label: "企业微信",
    statusText: "已配置",
    tone: "success",
    connectionText: "1 个企业微信应用在线",
    configured: true,
    ownerAgentIds: ["employee-ops"],
    guide: {
      title: "企业微信连接",
      subtitle: "WeCom 插件已打包。用户只需要填写企业微信机器人配置，不需要额外安装插件。",
      highlights: ["适合企业微信私聊和群聊", "字段来自 WeCom 插件 schema", "支持和其他渠道同时在线"],
    },
    configTitle: "企业微信连接配置",
    configSubtitle: "建议先完成 Token 与 Secret，再绑定销售序列 Agent。",
    formDraft: {
      corpId: "ww-frontis-demo",
      corpSecret: "",
      agentId: "1000002",
      reportGroups: ["销售战报群", "门店日播报群"],
    },
    fields: [
      {
        key: "corpId",
        label: "企业 ID",
        kind: "text",
        required: true,
      },
      {
        key: "corpSecret",
        label: "应用 Secret",
        kind: "password",
        required: true,
      },
      {
        key: "agentId",
        label: "应用 AgentId",
        kind: "text",
        required: true,
      },
      {
        key: "reportGroups",
        label: "播报群列表",
        kind: "array",
        placeholder: "每行一个群名称",
      },
    ],
    accounts: [
      {
        accountId: "default",
        label: "默认应用",
        configured: true,
        connected: true,
        running: true,
        ownerAgentId: "employee-ops",
        formDraft: {
          corpId: "ww-frontis-demo",
          corpSecret: "mock-wecom-secret",
          agentId: "1000002",
          reportGroups: ["销售战报群", "门店日播报群"],
        },
        pairings: [],
      },
    ],
    dangerActionLabel: "重置企业微信配置",
    pairings: [],
    bindings: [],
  },
  {
    id: "channel-wechat",
    label: "微信",
    statusText: "待扫码",
    tone: "warning",
    connectionText: "等待扫码登录",
    configured: false,
    ownerAgentIds: ["employee-writer"],
    guide: {
      title: "扫码连接",
      subtitle: "微信通过桌面端插件配对，建议先设置稳定账户 ID，再执行扫码连接。",
      highlights: ["支持个人号接入", "适合老板私聊入口", "建议固定 accountId"],
    },
    configTitle: "微信连接配置",
    configSubtitle: "配置完成后可把不同微信号分别分配给不同 AI 伙伴。",
    formDraft: {
      accountId: "default",
      hostAlias: "ceo-wechat",
      syncGroups: ["老板微信", "高管群"],
      autoReplyScope: "private",
    },
    fields: [
      {
        key: "accountId",
        label: "账户 ID",
        kind: "text",
        required: true,
        placeholder: "例如 default / work",
      },
      {
        key: "hostAlias",
        label: "宿主别名",
        kind: "text",
        placeholder: "例如 ceo-wechat",
      },
      {
        key: "autoReplyScope",
        label: "消息范围",
        kind: "enum",
        options: [
          { label: "仅私聊", value: "private" },
          { label: "私聊 + 群聊", value: "all" },
        ],
      },
      {
        key: "syncGroups",
        label: "同步群列表",
        kind: "array",
        placeholder: "每行一个微信群或备注",
      },
    ],
    accounts: [
      {
        accountId: "default",
        label: "主账号",
        configured: false,
        connected: false,
        running: false,
        ownerAgentId: "employee-writer",
        formDraft: {
          accountId: "default",
          hostAlias: "ceo-wechat",
          syncGroups: ["老板微信", "高管群"],
          autoReplyScope: "private",
        },
        pairings: [],
        lastError: "尚未扫码确认",
      },
    ],
    pairings: [],
    bindings: [],
  },
  {
    id: "channel-dingtalk",
    label: "钉钉",
    statusText: "待配置",
    tone: "warning",
    connectionText: "尚未完成机器人凭证配置",
    configured: false,
    ownerAgentIds: ["employee-ops"],
    guide: {
      title: "钉钉机器人连接",
      subtitle: "支持企业内部群播报与审批提醒，适合经营简报和任务通知回流。",
      highlights: ["企业内部群播报", "审批提醒", "支持多机器人分工"],
    },
    configTitle: "钉钉连接配置",
    configSubtitle: "建议按业务线拆分多个机器人，并分别绑定 AI 伙伴。",
    formDraft: {
      clientId: "",
      clientSecret: "",
      robotCode: "",
      reportScopes: ["经营日报群", "交付异常群"],
    },
    fields: [
      {
        key: "clientId",
        label: "Client ID",
        kind: "text",
        required: true,
      },
      {
        key: "clientSecret",
        label: "Client Secret",
        kind: "password",
        required: true,
      },
      {
        key: "robotCode",
        label: "Robot Code",
        kind: "text",
        required: true,
      },
      {
        key: "reportScopes",
        label: "播报范围",
        kind: "array",
        placeholder: "每行一个钉钉群或场景",
      },
    ],
    accounts: [
      {
        accountId: "ops-bot",
        label: "运营播报",
        configured: false,
        connected: false,
        running: false,
        ownerAgentId: "employee-ops",
        formDraft: {
          clientId: "",
          clientSecret: "",
          robotCode: "",
          reportScopes: ["经营日报群", "交付异常群"],
        },
        pairings: [],
      },
    ],
    pairings: [],
    bindings: [],
  },
];

const cloneOpenClawV2ChannelFormValue = (
  value: OpenClawV2ChannelFormValue,
): OpenClawV2ChannelFormValue => {
  if (Array.isArray(value)) {
    return [...value];
  }

  return value;
};

const mapAutomationStatus = (
  value: string,
): OpenClawV2AutomationRunStatus => {
  if (value === "completed" || value === "running" || value === "failed") {
    return value;
  }

  return "pending";
};

const cloneDialogueSession = (session: DialogueSessionItem): DialogueSessionItem => ({
  ...session,
  messages: session.messages.map(message => ({
    ...message,
    attachments: message.attachments?.map(attachment => ({ ...attachment })),
    blocks: message.blocks ? JSON.parse(JSON.stringify(message.blocks)) : undefined,
    followupSuggestions: message.followupSuggestions ? [...message.followupSuggestions] : undefined,
  })),
});

const cloneArtifact = (artifact: SynClawArtifactItem): SynClawArtifactItem => ({ ...artifact });

const cloneResult = (result: DialogueGeneratedResultItem): DialogueGeneratedResultItem =>
  JSON.parse(JSON.stringify(result)) as DialogueGeneratedResultItem;

const resolveVisibleAgentIds = (viewRole: FrontisWebRole): readonly string[] =>
  viewRole === "admin" ? OPENCLAW_V2_ADMIN_AGENT_IDS : OPENCLAW_V2_EMPLOYEE_AGENT_IDS;

/**
 * 获取 OpenClaw V2 工作台可见的预置 Agent 列表。
 */
export const getOpenClawV2Employees = (viewRole: FrontisWebRole): EmployeeItem[] => {
  const visibleAgentIds = new Set(resolveVisibleAgentIds(viewRole));

  return INITIAL_EMPLOYEES.filter(item => visibleAgentIds.has(item.id))
    .slice()
    .sort((left, right) => {
      const leftOrder = OPENCLAW_V2_AGENT_ORDER_MAP.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = OPENCLAW_V2_AGENT_ORDER_MAP.get(right.id) ?? Number.MAX_SAFE_INTEGER;

      return leftOrder - rightOrder;
    })
    .map(item => mapEmployeeForRole(item, viewRole));
};

/**
 * 获取 OpenClaw V2 工作台可见的单聊会话。
 */
export const getOpenClawV2DialogueSessions = (viewRole: FrontisWebRole): DialogueSessionItem[] => {
  const visibleAgentIds = new Set(resolveVisibleAgentIds(viewRole));

  return INITIAL_DIALOGUE_SESSIONS.filter(item => visibleAgentIds.has(item.employeeId)).map(
    item => mapDialogueSessionForRole(cloneDialogueSession(item), viewRole),
  );
};

/**
 * 获取 OpenClaw V2 工作台的成果文件。
 */
export const getOpenClawV2DialogueArtifacts = (
  viewRole: FrontisWebRole,
): Record<string, SynClawArtifactItem[]> => {
  const visibleSessionIds = new Set(getOpenClawV2DialogueSessions(viewRole).map(item => item.id));

  return Object.fromEntries(
    Object.entries(INITIAL_DIALOGUE_ARTIFACTS)
      .filter(([sessionId]) => visibleSessionIds.has(sessionId))
      .map(([sessionId, artifacts]) => [sessionId, artifacts.map(cloneArtifact)]),
  );
};

/**
 * 获取 OpenClaw V2 工作台的结构化结果卡片。
 */
export const getOpenClawV2DialogueResults = (
  viewRole: FrontisWebRole,
): Record<string, DialogueGeneratedResultItem[]> => {
  const visibleSessionIds = new Set(getOpenClawV2DialogueSessions(viewRole).map(item => item.id));

  return Object.fromEntries(
    Object.entries(INITIAL_DIALOGUE_RESULTS)
      .filter(([sessionId]) => visibleSessionIds.has(sessionId))
      .map(([sessionId, results]) => [sessionId, results.map(cloneResult)]),
  );
};

/**
 * 获取 OpenClaw V2 会用到的工作站列表。
 */
export const getOpenClawV2Workspaces = (viewRole: FrontisWebRole): WorkspaceItem[] => {
  const workspaceIdSet = new Set(getOpenClawV2Employees(viewRole).map(item => item.workspaceId));

  return INITIAL_WORKSPACES.filter(item => workspaceIdSet.has(item.id)).map(item => ({ ...item }));
};

/**
 * 获取 OpenClaw V2 可见用户列表。
 */
export const getOpenClawV2Users = (): FrontisWebUserItem[] =>
  INITIAL_FRONTIS_WEB_USERS.map(item => ({ ...item, assignedAgentIds: [...item.assignedAgentIds] }));

/**
 * 获取 OpenClaw V2 使用的技能列表。
 */
export const getOpenClawV2Skills = (): SkillItem[] =>
  INITIAL_SKILLS.map(item => ({ ...item, installedFor: [...item.installedFor] }));

/**
 * 获取 OpenClaw V2 技能广场目录。
 */
export const getOpenClawV2SkillCatalog = (): OpenClawV2SkillCatalogItem[] =>
  OPENCLAW_V2_SKILL_CATALOG.map(item => ({
    ...item,
    installedFor: [...item.installedFor],
    favoriteFor: [...item.favoriteFor],
    disabledFor: [...item.disabledFor],
    missingRequirements: [...item.missingRequirements],
    installOptions: item.installOptions.map(option => ({ ...option })),
  }));

/**
 * 获取 OpenClaw V2 远程连接渠道。
 */
export const getOpenClawV2Channels = (viewRole: FrontisWebRole): OpenClawV2ChannelItem[] => {
  const visibleAgentIds = new Set(resolveVisibleAgentIds(viewRole));

  return OPENCLAW_V2_CHANNELS.map(item => ({
    ...item,
    ownerAgentIds: item.ownerAgentIds.filter(agentId => visibleAgentIds.has(agentId)),
    formDraft: { ...item.formDraft },
    fields: item.fields.map(field => ({
      ...field,
      options: field.options?.map(option => ({ ...option })),
    })),
    accounts: item.accounts
      .filter(account => !account.ownerAgentId || visibleAgentIds.has(account.ownerAgentId))
      .map(account => ({
        ...account,
        formDraft: Object.fromEntries(
          Object.entries(account.formDraft).map(([key, value]) => [
            key,
            cloneOpenClawV2ChannelFormValue(value),
          ]),
        ),
        pairings: account.pairings.map(pairing => ({ ...pairing })),
      })),
    pairings: item.pairings.map(pairing => ({ ...pairing })),
    bindings: item.bindings.filter(binding => visibleAgentIds.has(binding.agentId)).map(binding => ({
      ...binding,
    })),
  })).filter(item => item.ownerAgentIds.length > 0 || item.bindings.length > 0 || item.accounts.length > 0);
};

/**
 * 获取 OpenClaw V2 远程连接待处理计数。
 */
export const getOpenClawV2RemotePendingCount = (viewRole: FrontisWebRole): number =>
  getOpenClawV2Channels(viewRole).reduce(
    (count, item) =>
      count +
      item.pairings.length +
      item.accounts.reduce((accountCount, account) => accountCount + account.pairings.length, 0),
    0,
  );

/**
 * 获取 OpenClaw V2 自动化任务列表。
 */
export const getOpenClawV2AutomationTasks = (
  viewRole: FrontisWebRole,
): OpenClawV2AutomationTaskItem[] => {
  const visibleAgentIds = new Set(resolveVisibleAgentIds(viewRole));

  return INITIAL_AUTOMATION_TASK_EXAMPLES.filter(item =>
    visibleAgentIds.has(item.executorAgentId),
  ).map(item => ({
    id: String(item.taskId),
    name: item.title,
    description: item.description,
    agentId: item.executorAgentId,
    sessionTarget: item.bindingMode === "session" ? "main" : "isolated",
    wakeMode: "next-heartbeat",
    scheduleKind:
      item.scheduleKind === "every" || item.scheduleKind === "cron" ? item.scheduleKind : "at",
    scheduleLabel: item.scheduleSummary,
    nextRunAt: item.nextRunAt ?? "",
    updatedAt: item.lastRunAt ?? item.startTime ?? "",
    enabled: item.status !== "paused",
    status: mapAutomationStatus(item.displayStatus),
    sessionId: item.sessionId,
    runs: item.runs.map(run => ({
      id: run.id,
      sequence: run.sequence,
      taskTime: run.taskTime,
      status: mapAutomationStatus(run.status),
      result: run.result,
      durationLabel: run.status === "failed" ? "失败中断" : "1m 24s",
    })),
  }));
};

/**
 * 解析指定角色的 V2 默认工作台路径。
 */
export const getOpenClawV2BasePath = (viewRole: FrontisWebRole): string =>
  viewRole === "admin" ? "/web/admin/v2/workspace" : "/web/employee/v2";

/**
 * 根据 section 生成 V2 目标路径。
 */
export const getOpenClawV2SectionPath = (
  viewRole: FrontisWebRole,
  section: OpenClawV2Section,
): string => {
  const basePath = getOpenClawV2BasePath(viewRole);

  if (section === "chat") {
    return basePath;
  }

  return `${basePath}/${section}`;
};
