import type { Block } from "@/types/block";
import type { SynClawArtifactItem } from "@/pages/synclaw/types";

import type {
  AutomationTaskItem,
  ChannelItem,
  ChatMessage,
  DialogueSessionItem,
  EmployeeItem,
  SkillItem,
  WorkspaceItem,
} from "@/pages/types";
import { createWorkspaceActivationInfo, getAvatarUrl } from "@/pages/utils";

const createAssistantMessageBlock = (id: string, children: Block[]): Block => ({
  id,
  kind: "message",
  data: {
    role: "assistant",
  },
  actorRole: "assistant",
  children,
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

const createTextBlock = (
  id: string,
  content: string,
  data?: Partial<{
    role: "user" | "assistant";
  }>,
): Block => ({
  id,
  kind: "text",
  data: {
    content,
    status: "completed",
    role: data?.role ?? "assistant",
  },
  actorRole: data?.role ?? "assistant",
});

interface CreateToolUseBlockOptions {
  id: string;
  name: string;
  displayName: string;
  purpose?: string;
  status: string;
  output?: string;
  isError?: boolean;
}

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
      display_name: displayName,
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

/**
 * 原型页默认工作站列表。
 */
export const INITIAL_WORKSPACES: WorkspaceItem[] = [
  {
    id: "workspace-cloud",
    name: "云端产品工作站",
    type: "cloud",
    status: "online",
    region: "华东可用区 A / GPU 可用",
    summary: "用于资料检索、浏览器任务、文档产出和虚拟机执行。",
    runtimeHint: "支持桌面预览、成果文件和扫码辅助。",
  },
  {
    id: "workspace-local",
    name: "本地创作工作站",
    type: "local",
    status: "online",
    region: "Mac Studio / 当前设备",
    summary: "用于个人文档整理、附件上传、技能调用和本机协作。",
    runtimeHint: "本地模式不展示远端桌面，优先强调对话和任务体验。",
  },
  {
    id: "workspace-edge",
    name: "边缘销售工作站",
    type: "edge",
    status: "pending",
    region: "企业侧待激活",
    summary: "企业部署模式，后续通过激活码完成接入和权限分配。",
    runtimeHint: "当前仅显示待激活状态，激活后开放工作站能力。",
    ...createWorkspaceActivationInfo(),
  },
];

/**
 * 原型页默认 AI 员工列表。
 */
export const INITIAL_EMPLOYEES: EmployeeItem[] = [
  {
    id: "employee-pm",
    name: "产品策略官",
    avatarUrl: getAvatarUrl("employee-pm"),
    role: "拆需求、出方案、推进落地",
    status: "busy",
    workspaceId: "workspace-cloud",
    connectionMode: "cloud",
    model: "gpt-5.2",
    summary: "负责 PRD 梳理、页面结构和版本边界收敛。",
    lastAction: "正在整理 SynClaw 独立窗口的五 Tab 方案",
  },
  {
    id: "employee-designer",
    name: "交互设计师",
    avatarUrl: getAvatarUrl("employee-designer"),
    role: "页面布局、视觉和动线调整",
    status: "idle",
    workspaceId: "workspace-cloud",
    connectionMode: "cloud",
    model: "gpt-5.2-mini",
    summary: "负责将需求转成低保真结构和视觉方向。",
    lastAction: "等待确认 AI 专家团页的结构命名",
  },
  {
    id: "employee-research",
    name: "资料研究员",
    avatarUrl: getAvatarUrl("employee-research"),
    role: "检索资料、补全背景、整理参考案例",
    status: "online",
    workspaceId: "workspace-cloud",
    connectionMode: "cloud",
    model: "gpt-5.2-mini",
    summary: "用于快速补充背景信息和行业案例。",
    lastAction: "已同步竞品页面资料，随时可发起新任务",
  },
  {
    id: "employee-ops",
    name: "上线协调员",
    avatarUrl: getAvatarUrl("employee-ops"),
    role: "排期跟进、提测检查、发布协调",
    status: "paused",
    workspaceId: "workspace-cloud",
    connectionMode: "cloud",
    model: "gpt-5.2",
    summary: "用于发布前串联排期、检查项和回归节奏。",
    lastAction: "等待你确认本轮原型收口后恢复协作",
  },
  {
    id: "employee-writer",
    name: "本地内容助理",
    avatarUrl: getAvatarUrl("employee-writer"),
    role: "会议纪要、文档整理、附件归档",
    status: "idle",
    workspaceId: "workspace-local",
    connectionMode: "local",
    model: "gpt-5.2",
    summary: "适合本机文档处理和轻量写作，不展示虚拟机桌面。",
    lastAction: "已完成昨日会议纪要摘要，等待继续拆功能点",
  },
  {
    id: "employee-sales",
    name: "销售战报助手",
    avatarUrl: getAvatarUrl("employee-sales"),
    role: "企业线索跟进和日报生成",
    status: "paused",
    workspaceId: "workspace-edge",
    connectionMode: "local",
    model: "gpt-5.2-mini",
    summary: "部署到企业侧边缘设备，当前处于待激活状态。",
    lastAction: "待输入激活码后才可进入可用状态",
  },
];

/**
 * 原型页默认单聊会话列表。
 */
export const INITIAL_DIALOGUE_SESSIONS: DialogueSessionItem[] = [
  {
    id: "dialogue-session-pm-1",
    employeeId: "employee-pm",
    title: "独立窗口需求梳理",
    preview: "文档在这里，点击后会在新窗口打开。",
    updatedAt: "09:36",
    messages: [
      {
        id: "dialogue-1",
        role: "assistant",
        author: "产品策略官",
        content:
          "已同步昨天会议结论：SynClaw 需要做成独立窗口，左侧固定五个一级 Tab，并优先把云端主流程跑通。",
        timeLabel: "09:32",
      },
      {
        id: "dialogue-2",
        role: "user",
        author: "你",
        content: "继续拆一下对话和 AI 专家团的功能点。",
        timeLabel: "09:33",
      },
      {
        id: "dialogue-3",
        role: "assistant",
        author: "产品策略官",
        content: "已开始整理。核心功能点、执行过程和成果文档都已经串起来了。",
        timeLabel: "09:34",
        blocks: [
          createAssistantMessageBlock("dialogue-3-message", [
            createThinkingBlock(
              "dialogue-3-thinking",
              "Reasoning:\n_用户要继续细化 SynClaw 独立窗口里的对话和 AI 专家团功能。我先用浏览器核对现有页面结构，再整理成可实现的功能清单，避免把正式 SynClaw 和 prd 原型的结构搞混。_",
            ),
            createToolUseBlock({
              id: "dialogue-3-browser-open",
              name: "browser",
              displayName: "browser",
              status: "success",
              output:
                '{\n  "targetId": "E3A1F8A7C2A94D01",\n  "title": "SynClaw Prototype",\n  "url": "/prd?synclawPrototype=1",\n  "type": "page"\n}',
            }),
            createToolUseBlock({
              id: "dialogue-3-browser-capture",
              name: "browser",
              displayName: "browser",
              status: "success",
              output:
                "MEDIA:/Users/yangwanquan/Library/Application Support/front-dev/runtime/state/media/browser/dialogue-prd-panel.jpg",
            }),
            createToolUseBlock({
              id: "dialogue-3-read",
              name: "read",
              displayName: "read",
              status: "success",
              output:
                "已确认可直接复用：频道输入框、频道消息渲染、技能广场、自动化任务。需要独立补的只有对话左侧 AI 专家切换、云端小窗/分屏视图、AI 专家团卡片布局。",
            }),
            createToolUseBlock({
              id: "dialogue-3-write",
              name: "write",
              displayName: "write",
              status: "success",
              output: "Successfully wrote 4281 bytes to synclaw_prd_notes.md.",
            }),
            createTextBlock(
              "dialogue-3-text",
              "我已经把这轮要点收敛好了：\n\n1. 对话页直接复用 SynClaw 原频道的消息渲染和输入框。\n2. 云端工作站才显示小电脑窗口与分屏视图，本地不展示桌面。\n3. AI 专家团只保留工作站列表和专家卡片，不再加多余说明栏。\n4. 技能广场、自动化任务直接复用正式页面。\n\n后面继续实现时，就按这条结构往下推就行。",
            ),
          ]),
        ],
      },
      {
        id: "dialogue-4",
        role: "user",
        author: "你",
        content: "把这份需求文档链接也发我一下，我直接对着文档看。",
        timeLabel: "09:35",
      },
      {
        id: "dialogue-5",
        role: "assistant",
        author: "产品策略官",
        content:
          '可以，文档我放在这里了：<a href="https://xianyuan.feishu.cn/wiki/TZlIwqDGTi3S9EkVFbDcu4Uensh?fromScene=spaceOverview" target="_blank" rel="noreferrer">需求文档</a>。点击后会直接在新窗口打开。',
        timeLabel: "09:36",
      },
    ],
  },
  {
    id: "dialogue-session-pm-2",
    employeeId: "employee-pm",
    title: "首页侧栏样式收口",
    preview: "把 SynClaw 入口固定成收起态，不再保留展开模式。",
    updatedAt: "昨天",
    messages: [
      {
        id: "dialogue-pm-2-1",
        role: "user",
        author: "你",
        content: "把 SynClaw 入口固定成收起态，不再保留展开模式。",
        timeLabel: "昨天",
      },
      {
        id: "dialogue-pm-2-2",
        role: "assistant",
        author: "产品策略官",
        content: "已记录，我会把收起态方案直接同步到入口和侧栏结构里。",
        timeLabel: "昨天",
        blocks: [
          createAssistantMessageBlock("dialogue-pm-2-message", [
            createThinkingBlock(
              "dialogue-pm-2-thinking",
              "Reasoning:\n_用户已经明确要把主页入口恢复成正式 SynClaw 页面，同时保留 prd 路由单独访问。这里不用做额外分流逻辑，直接把侧栏点击恢复成 /synclaw 即可。_",
            ),
            createToolUseBlock({
              id: "dialogue-pm-2-edit",
              name: "edit",
              displayName: "edit",
              status: "success",
              output: "Successfully replaced text in src/components/AppSidebar/index.tsx.",
            }),
            createTextBlock(
              "dialogue-pm-2-text",
              "已恢复。现在主页左侧点击 SynClaw 会正常进入正式页面；原型页继续通过 prd 路由单独访问，不再从主页直接新开窗口。",
            ),
          ]),
        ],
      },
    ],
  },
  {
    id: "dialogue-session-designer-1",
    employeeId: "employee-designer",
    title: "对话页布局修正",
    preview: "输入框宽高需要直接对齐原频道对话样式。",
    updatedAt: "11:08",
    messages: [
      {
        id: "dialogue-designer-1",
        role: "assistant",
        author: "交互设计师",
        content: "我会先统一三栏间距，再把输入区直接贴齐频道页的真实尺寸变量。",
        timeLabel: "11:07",
      },
      {
        id: "dialogue-designer-2",
        role: "user",
        author: "你",
        content: "输入框宽高需要直接对齐原频道对话样式。",
        timeLabel: "11:08",
      },
      {
        id: "dialogue-designer-3",
        role: "assistant",
        author: "交互设计师",
        content: "已核对现有输入框结构，顺手把一个失败示例也记在这里，避免后面再踩坑。",
        timeLabel: "11:09",
        blocks: [
          createAssistantMessageBlock("dialogue-designer-3-message", [
            createThinkingBlock(
              "dialogue-designer-3-thinking",
              "Reasoning:\n_这里不能重画一套新的输入框。SynClaw 频道本来就有成熟的输入区结构，prd 对话页应该直接复用它的宽度、高度、圆角和按钮位置。_",
            ),
            createToolUseBlock({
              id: "dialogue-designer-3-read",
              name: "read",
              displayName: "read",
              status: "success",
              output:
                "已确认应直接复用 WorkspaceComposer；发送按钮、附件按钮和输入区圆角都沿用现有频道页，不再单独绘制。",
            }),
            createToolUseBlock({
              id: "dialogue-designer-3-browser",
              name: "browser",
              displayName: "browser",
              status: "failed",
              output:
                '{\n  "status": "error",\n  "tool": "browser",\n  "error": "右侧信息栏占位导致主对话区宽度不足"\n}',
              isError: true,
            }),
            createTextBlock(
              "dialogue-designer-3-text",
              "最终做法很明确：对话页只保留左侧会话区和中间主舞台，输入框直接复用原频道输入框，不再单独画一套。",
            ),
          ]),
        ],
      },
    ],
  },
  {
    id: "dialogue-session-research-1",
    employeeId: "employee-research",
    title: "竞品切换器参考",
    preview: "整理了几个切换 AI 专家的侧栏结构参考。",
    updatedAt: "10:26",
    messages: [
      {
        id: "dialogue-research-1",
        role: "assistant",
        author: "资料研究员",
        content: "整理了几个切换 AI 专家的侧栏结构参考，重点都是先选人，再看该 AI 的最近会话。",
        timeLabel: "10:25",
        blocks: [
          createAssistantMessageBlock("dialogue-research-1-message", [
            createToolUseBlock({
              id: "dialogue-research-1-browser",
              name: "browser",
              displayName: "browser",
              status: "success",
              output:
                "MEDIA:/Users/yangwanquan/Library/Application Support/front-dev/runtime/state/media/browser/agent-switcher-reference.jpg",
            }),
            createToolUseBlock({
              id: "dialogue-research-1-read",
              name: "read",
              displayName: "read",
              status: "success",
              output:
                "参考结论：切换器应是浮层；当前 AI 卡片只保留头像、名称和环境标签；最近会话列表仅显示标题和时间。",
            }),
            createTextBlock(
              "dialogue-research-1-text",
              "我已经把切换器方向收敛成一条：切换列表浮出显示，切换不同 AI 后联动该 AI 的最近会话，不再做并列卡片。",
            ),
          ]),
        ],
      },
      {
        id: "dialogue-research-2",
        role: "assistant",
        author: "资料研究员",
        content: "建议把切换和最近对话放在同一列，不要再做并列卡片。",
        timeLabel: "10:26",
      },
    ],
  },
  {
    id: "dialogue-session-ops-1",
    employeeId: "employee-ops",
    title: "提测前检查单",
    preview: "等原型收口后再开始汇总检查项。",
    updatedAt: "昨天",
    messages: [
      {
        id: "dialogue-ops-1",
        role: "assistant",
        author: "上线协调员",
        content: "等原型收口后我再开始汇总检查项、提测顺序和回归名单。",
        timeLabel: "昨天",
        blocks: [
          createAssistantMessageBlock("dialogue-ops-1-message", [
            createToolUseBlock({
              id: "dialogue-ops-1-exec",
              name: "exec",
              displayName: "exec",
              status: "aborted",
              output:
                "本轮暂不继续推进：当前还在高频调整对话页结构和 AI 专家团页面，过早汇总检查单会导致大量重复工作。",
            }),
            createTextBlock(
              "dialogue-ops-1-text",
              "我先暂停这条执行链，等页面结构稳定后再继续生成检查单、提测顺序和回归名单。",
            ),
          ]),
        ],
      },
    ],
  },
];

/**
 * 原型页默认单聊成果文件。
 */
export const INITIAL_DIALOGUE_ARTIFACTS: Record<string, SynClawArtifactItem[]> = {
  "dialogue-session-pm-1": [
    {
      id: "dialogue-artifact-pm-1",
      artifactId: "dialogue-artifact-pm-1",
      fileName: "独立窗口功能拆解.md",
      fileType: "md",
      producerName: "产品策略官",
      producedAt: "2026-03-19 09:36",
      fileSize: "2 KB",
      taskName: "对话功能拆解",
      canonicalPath: createDataUrl(
        "text/markdown",
        "# 独立窗口功能拆解\n\n- 对话页保留 AI 切换与最近会话\n- 群聊页补齐成果面板\n- 云端模式支持桌面小窗与分屏\n",
      ),
      mimeType: "text/markdown",
    },
    {
      id: "dialogue-artifact-pm-2",
      artifactId: "dialogue-artifact-pm-2",
      fileName: "prd-dialogue-structure.json",
      fileType: "json",
      producerName: "产品策略官",
      producedAt: "2026-03-19 09:37",
      fileSize: "1 KB",
      taskName: "结构收敛",
      canonicalPath: createDataUrl(
        "application/json",
        '{\n  "left": ["AI切换", "最近对话"],\n  "main": ["消息流", "输入框", "云端视图"],\n  "right": ["成果面板"]\n}',
      ),
      mimeType: "application/json",
    },
    {
      id: "dialogue-artifact-pm-3",
      artifactId: "dialogue-artifact-pm-3",
      fileName: "成果面板接入说明.html",
      fileType: "html",
      producerName: "产品策略官",
      producedAt: "2026-03-19 09:39",
      fileSize: "3 KB",
      taskName: "成果联动",
      canonicalPath: createDataUrl(
        "text/html",
        '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" /><title>成果面板</title><style>body{margin:0;padding:28px;font-family:"PingFang SC",system-ui,sans-serif;background:#f8fafc;color:#0f172a}.card{padding:24px;border-radius:20px;background:#fff;box-shadow:0 14px 36px rgba(15,23,42,.08)}h1{margin:0 0 12px;font-size:26px}p{margin:0;line-height:1.8}</style></head><body><div class="card"><h1>对话成果面板</h1><p>当前 AI 生成的拆解文档、结构稿和图示文件都会沉淀到右侧成果面板，支持预览和下载。</p></div></body></html>',
      ),
      mimeType: "text/html",
    },
  ],
  "dialogue-session-designer-1": [
    {
      id: "dialogue-artifact-designer-1",
      artifactId: "dialogue-artifact-designer-1",
      fileName: "输入区尺寸对齐图.svg",
      fileType: "svg",
      producerName: "交互设计师",
      producedAt: "2026-03-19 11:10",
      fileSize: "5 KB",
      taskName: "输入区对齐",
      canonicalPath: createSvgDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="520" viewBox="0 0 920 520" fill="none"><rect width="920" height="520" rx="28" fill="#F8FBFF"/><rect x="64" y="70" width="792" height="286" rx="26" fill="#FFFFFF" stroke="#D8E3F0" stroke-width="2"/><rect x="112" y="390" width="696" height="82" rx="24" fill="#FFFFFF" stroke="#D8E3F0" stroke-width="2"/><rect x="730" y="408" width="44" height="44" rx="22" fill="#8B9CFF"/><text x="110" y="126" fill="#0F172A" font-size="30" font-family="PingFang SC, sans-serif" font-weight="600">正式频道输入区宽高参考</text><text x="110" y="176" fill="#475569" font-size="22" font-family="PingFang SC, sans-serif">聊天区与输入区之间保留稳定留白，发送按钮靠右悬停。</text><text x="142" y="438" fill="#94A3B8" font-size="24" font-family="PingFang SC, sans-serif">输入消息或上传附件</text></svg>`,
      ),
      mimeType: "image/svg+xml",
    },
  ],
  "dialogue-session-research-1": [
    {
      id: "dialogue-artifact-research-1",
      artifactId: "dialogue-artifact-research-1",
      fileName: "AI切换器参考.md",
      fileType: "md",
      producerName: "资料研究员",
      producedAt: "2026-03-19 10:27",
      fileSize: "1 KB",
      taskName: "交互参考整理",
      canonicalPath: createDataUrl(
        "text/markdown",
        "# AI 切换器参考\n\n- 切换列表用浮层\n- 当前 AI 卡片只保留头像、昵称和环境标签\n- 会话列表只展示标题和时间\n",
      ),
      mimeType: "text/markdown",
    },
  ],
  "dialogue-session-ops-1": [
    {
      id: "dialogue-artifact-ops-1",
      artifactId: "dialogue-artifact-ops-1",
      fileName: "提测前检查清单.md",
      fileType: "md",
      producerName: "上线协调员",
      producedAt: "2026-03-19 17:40",
      fileSize: "1 KB",
      taskName: "提测准备",
      canonicalPath: createDataUrl(
        "text/markdown",
        "# 提测前检查清单\n\n- 页面结构冻结\n- 交互路径走查\n- 构建通过\n- 关键录屏准备\n",
      ),
      mimeType: "text/markdown",
    },
  ],
};

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
    title: "独立窗口 PRD 晨检",
    description: "每天检查需求变更、设计阻塞和版本边界，并回写到当前产品会话。",
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
    title: "频道视觉方案收敛",
    description: "让交互设计师每天同步频道里的最新界面改动，并输出一版收口说明。",
    executorAgentId: "employee-designer",
    bindingMode: "channel",
    spaceId: "automation-space-rd",
    channelId: "channel-prd",
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
        result: "已在产品冲刺频道补充视觉差异说明。",
      },
    ],
  },
  {
    taskId: 103,
    title: "竞品资料异步扫描",
    description: "只绑定资料研究员，不挂任何频道或会话，独立输出资料摘要。",
    executorAgentId: "employee-research",
    bindingMode: "agent",
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
    title: "会议纪要接续整理",
    description: "绑定本地内容助理的历史会话，持续整理会议纪要并回填待办。",
    executorAgentId: "employee-writer",
    bindingMode: "session",
    sessionId: "dialogue-session-designer-1",
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
        result: "附件待补齐，任务暂停等待手动恢复。",
      },
    ],
  },
];

export const INITIAL_GROUP_SPACES = [
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

export const INITIAL_GROUP_AI_EMPLOYEES = [
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

export const INITIAL_GROUP_TENANT_MEMBER_OPTIONS = [
  { id: "member-you", name: "本地测试用户", subtitle: "当前登录用户" },
  { id: "member-fe", name: "前端研发", subtitle: "负责页面与交互联调" },
  { id: "member-design", name: "视觉设计", subtitle: "负责样式与图标" },
  { id: "member-op", name: "上线协调员", subtitle: "负责排期与验收" },
  { id: "member-growth", name: "增长负责人", subtitle: "负责增长实验室协作" },
];

export const INITIAL_GROUP_CHANNEL_AGENT_IDS = {
  "channel-prd": ["201", "202", "203"],
  "channel-launch": ["201", "204"],
  "channel-growth": ["203"],
};

export const INITIAL_GROUP_CHANNEL_TENANT_MEMBERS = {
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

export const INITIAL_GROUP_CHANNEL_MESSAGES = {
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

export const INITIAL_GROUP_CHANNEL_ARTIFACTS = {
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

export const INITIAL_SKILL_CATEGORIES = [
  { category_id: 1, key: "product", name: "产品", sort_order: 1, status: "active" },
  { category_id: 2, key: "design", name: "设计", sort_order: 2, status: "active" },
  { category_id: 3, key: "research", name: "研究", sort_order: 3, status: "active" },
  { category_id: 4, key: "automation", name: "自动化", sort_order: 4, status: "active" },
];

export const INITIAL_SKILL_MARKETPLACE_ITEMS = [
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

export const INITIAL_SKILL_INSTALL_AGENTS = [
  {
    id: "201",
    source: "coworker",
    managed_by_coworker: true,
    visible_to_all: true,
    coworker_agent_id: 201,
    name: "产品策略官",
    remote_status: "online",
    primary_model: "gpt-5.2",
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
    remote_status: "executing",
    primary_model: "gpt-5.2-mini",
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
    remote_status: "online",
    primary_model: "gpt-5.2-mini",
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
    remote_status: "offline",
    primary_model: "gpt-5.2",
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
