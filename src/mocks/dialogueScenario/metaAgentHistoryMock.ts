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
const META_AGENT_FILE_PREVIEW_DOCX_SUFFIX = "metaagent-file-preview-docx";
const META_AGENT_FILE_PREVIEW_XLSX_SUFFIX = "metaagent-file-preview-xlsx";
const META_AGENT_FILE_PREVIEW_PPTX_SUFFIX = "metaagent-file-preview-pptx";
const META_AGENT_FILE_PREVIEW_HTML_SUFFIX = "metaagent-file-preview-html";
const META_AGENT_FILE_PREVIEW_JSON_SUFFIX = "metaagent-file-preview-json";
const META_AGENT_FILE_PREVIEW_PY_SUFFIX = "metaagent-file-preview-python";
const META_AGENT_FILE_PREVIEW_TXT_SUFFIX = "metaagent-file-preview-txt";
const META_AGENT_FILE_PREVIEW_IMAGE_SUFFIX = "metaagent-file-preview-image";
const META_AGENT_FILE_PREVIEW_VIDEO_SUFFIX = "metaagent-file-preview-video";
const META_AGENT_FILE_PREVIEW_AUDIO_SUFFIX = "metaagent-file-preview-audio";

const ME_PREVIEW_INLINE_IMAGE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360">
  <rect width="720" height="360" rx="28" fill="#f7fbff"/>
  <rect x="48" y="54" width="624" height="252" rx="20" fill="#ffffff" stroke="#d7e3f2"/>
  <circle cx="106" cy="116" r="34" fill="#06b6d4"/>
  <path d="M92 116h28M106 102v28" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
  <rect x="164" y="92" width="388" height="22" rx="11" fill="#0f172a"/>
  <rect x="164" y="132" width="472" height="16" rx="8" fill="#8aa0b8"/>
  <rect x="84" y="194" width="160" height="58" rx="14" fill="#e0f2fe"/>
  <rect x="280" y="194" width="160" height="58" rx="14" fill="#dcfce7"/>
  <rect x="476" y="194" width="160" height="58" rx="14" fill="#fef3c7"/>
</svg>
`)}`;

const ME_PREVIEW_VIDEO_POSTER_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#g)"/>
  <rect x="76" y="72" width="808" height="396" rx="28" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.32)"/>
  <circle cx="480" cy="270" r="58" fill="rgba(255,255,255,.92)"/>
  <path d="M466 237l56 33-56 33z" fill="#0f172a"/>
  <rect x="130" y="400" width="700" height="12" rx="6" fill="rgba(255,255,255,.35)"/>
  <rect x="130" y="400" width="286" height="12" rx="6" fill="#ffffff"/>
  <text x="130" y="152" fill="#fff" font-size="34" font-family="Arial, sans-serif" font-weight="700">ME 文件预览演示视频</text>
</svg>
`)}`;

const ME_PREVIEW_AUDIO_DATA_URL =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
const ME_PREVIEW_VIDEO_DATA_URL = "data:video/mp4;base64,";

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

const ME_FILE_PREVIEW_DOCX_CONTENT = `# ME 输出文件预览能力说明

ME 产出的常见文档统一按文件类型进入对应预览器。

## 文档类

Markdown、TXT、DOCX、RTF 等按文档预览处理，支持标题、段落、列表、表格和图文混排。

![ME 文档混排示意](${ME_PREVIEW_INLINE_IMAGE_URL})

| 类型 | 预览方式 | 说明 |
| --- | --- | --- |
| md / markdown | 富文本渲染 | 保留标题、表格、Mermaid、图片 |
| txt | 文本文档渲染 | 保留换行和段落 |
| docx / doc | 富文本文档预览 | 原型用结构化内容模拟正文、表格和图片 |
`;

const ME_FILE_PREVIEW_TXT_CONTENT = `ME 输出文件类型规则

1. 文档类：md、txt、doc、docx、rtf。
2. 表格类：csv、tsv、xls、xlsx。
3. 演示类：ppt、pptx。
4. 页面类：html 支持预览和源码切换。
5. 代码类：json、py、ts、js、sql、yaml 等按代码预览。
6. 媒体类：图片、音频、视频按媒体预览。`;

const ME_FILE_PREVIEW_XLSX_CONTENT = JSON.stringify(
  {
    sheets: [
      {
        name: "文件类型矩阵",
        columns: ["类型", "扩展名", "预览能力", "说明"],
        rows: [
          ["文档", "md / txt / docx", "富文本预览", "支持文本、表格和图片混排"],
          ["表格", "csv / xlsx", "表格预览", "按 Sheet 展示列和行"],
          ["演示", "pptx", "幻灯片预览", "按页展示标题、要点和配图"],
          ["页面", "html", "页面 + 源码", "可切换渲染预览和源代码"],
          ["代码", "json / py", "代码预览", "保留缩进和等宽字体"],
          ["图片", "png / jpg / svg", "图片预览", "等比适配预览区域"],
          ["音频", "mp3 / wav / m4a", "音频播放器", "展示音频信息、波形和播放控件"],
          ["视频", "mp4 / webm / mov", "视频播放器", "展示视频海报、播放区域和媒体信息"],
        ],
      },
      {
        name: "本轮 mock 文件",
        columns: ["文件名", "任务", "状态"],
        rows: [
          ["ME 输出文件预览能力说明.docx", "文档预览", "可预览"],
          ["ME 文件类型矩阵.xlsx", "表格预览", "可预览"],
          ["ME 文件预览交互方案.pptx", "演示预览", "可预览"],
          ["me_file_preview_demo.html", "HTML 预览", "可预览源码"],
          ["ME 文件预览演示视频.mp4", "视频预览", "可预览"],
          ["ME 文件预览语音说明.mp3", "音频预览", "可预览"],
        ],
      },
    ],
  },
  null,
  2,
);

const ME_FILE_PREVIEW_PPTX_CONTENT = JSON.stringify(
  {
    slides: [
      {
        title: "ME 文件预览分类",
        subtitle: "按内容形态决定预览器，不按单一文件后缀硬塞展示。",
        bullets: ["文档类进入富文本预览", "表格类进入 Sheet 预览", "HTML 同时支持页面和源码"],
        imageUrl: ME_PREVIEW_INLINE_IMAGE_URL,
      },
      {
        title: "任务结束文件卡片",
        subtitle: "只要本轮创建或编辑文件，最终回复结尾追加文件卡片。",
        bullets: ["点击卡片打开右侧预览", "同一路径只展示最新版本", "今日成果汇总当日全部产出"],
      },
      {
        title: "混合内容处理",
        subtitle: "文档中既有文字也有图片时，预览器按富文本结构展示。",
        bullets: ["正文、列表、表格连续排版", "图片按容器宽度适配", "代码片段仍保留等宽样式"],
      },
    ],
  },
  null,
  2,
);

const ME_FILE_PREVIEW_HTML_CONTENT = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>ME 文件预览 Demo</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
      main { max-width: 880px; margin: 0 auto; padding: 40px; }
      section { background: #fff; border: 1px solid #dbe4f0; border-radius: 18px; padding: 28px; box-shadow: 0 18px 45px rgba(15, 23, 42, .08); }
      h1 { margin: 0 0 12px; font-size: 30px; }
      p { line-height: 1.8; color: #475569; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; }
      .card { border-radius: 14px; padding: 18px; background: #ecfeff; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>HTML 文件既能预览也能看源码</h1>
        <p>ME 输出 HTML 时，默认展示页面效果；右上角可以切换到源码，适合检查结构、样式和交付内容。</p>
        <div class="grid">
          <div class="card">页面预览</div>
          <div class="card">源码查看</div>
          <div class="card">新窗口打开</div>
        </div>
      </section>
    </main>
  </body>
</html>`;

const ME_FILE_PREVIEW_JSON_CONTENT = JSON.stringify(
  {
    meOutputPreviewTypes: {
      document: ["md", "txt", "docx", "rtf"],
      spreadsheet: ["csv", "xlsx"],
      presentation: ["pptx"],
      page: ["html"],
      code: ["json", "py", "ts", "js", "sql", "yaml"],
      media: ["png", "jpg", "svg", "mp4", "mp3"],
    },
    rule: "ME 根据文件内容形态选择预览器；不支持内嵌的二进制格式保留下载。",
  },
  null,
  2,
);

const ME_FILE_PREVIEW_PY_CONTENT = `from pathlib import Path

PREVIEW_GROUPS = {
    "document": ["md", "txt", "docx"],
    "spreadsheet": ["csv", "xlsx"],
    "presentation": ["pptx"],
    "page": ["html"],
    "code": ["json", "py", "ts", "js"],
}


def resolve_preview_group(filename: str) -> str:
    suffix = Path(filename).suffix.lower().lstrip(".")
    for group_name, extensions in PREVIEW_GROUPS.items():
        if suffix in extensions:
            return group_name
    return "download"
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

const createArtifactBlock = (
  id: string,
  artifactId: string,
  title: string,
  format = "markdown",
): Block => ({
  id,
  kind: "artifact",
  data: {
    artifact_id: artifactId,
    kind: format,
    title,
    status: "completed",
    format,
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

const createPreviewArtifact = ({
  sessionId,
  suffix,
  fileName,
  fileType,
  producerName,
  taskName,
  content,
  producedAt,
  mimeType,
}: {
  sessionId: string;
  suffix: string;
  fileName: string;
  fileType: string;
  producerName: string;
  taskName: string;
  content: string;
  producedAt: string;
  mimeType: string;
}): ArtifactItem => ({
  id: `${sessionId}-${suffix}`,
  artifactId: `${sessionId}-${suffix}`,
  fileName,
  fileType,
  producerName,
  producedAt,
  fileSize: `${Math.max(1, Math.ceil(new TextEncoder().encode(content).length / 1024))} KB`,
  taskName,
  canonicalPath: `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`,
  mimeType,
});

export const buildMetaAgentCapabilityDemoArtifacts = (
  sessionId: string,
  agentName: string,
): ArtifactItem[] => {
  const imageArtifact: ArtifactItem = {
    id: `${sessionId}-${META_AGENT_FILE_PREVIEW_IMAGE_SUFFIX}`,
    artifactId: `${sessionId}-${META_AGENT_FILE_PREVIEW_IMAGE_SUFFIX}`,
    fileName: "ME 文件预览图文示意.png",
    fileType: "png",
    producerName: agentName,
    producedAt: "14:36",
    fileSize: "18 KB",
    taskName: "图片预览",
    canonicalPath: ME_PREVIEW_INLINE_IMAGE_URL,
    mimeType: "image/png",
  };
  const videoArtifact: ArtifactItem = {
    id: `${sessionId}-${META_AGENT_FILE_PREVIEW_VIDEO_SUFFIX}`,
    artifactId: `${sessionId}-${META_AGENT_FILE_PREVIEW_VIDEO_SUFFIX}`,
    fileName: "ME 文件预览演示视频.mp4",
    fileType: "mp4",
    producerName: agentName,
    producedAt: "14:40",
    fileSize: "2.8 MB",
    taskName: "视频预览",
    canonicalPath: ME_PREVIEW_VIDEO_DATA_URL,
    mimeType: "video/mp4",
    previewPosterUrl: ME_PREVIEW_VIDEO_POSTER_URL,
  };
  const audioArtifact: ArtifactItem = {
    id: `${sessionId}-${META_AGENT_FILE_PREVIEW_AUDIO_SUFFIX}`,
    artifactId: `${sessionId}-${META_AGENT_FILE_PREVIEW_AUDIO_SUFFIX}`,
    fileName: "ME 文件预览语音说明.mp3",
    fileType: "mp3",
    producerName: agentName,
    producedAt: "14:41",
    fileSize: "420 KB",
    taskName: "音频预览",
    canonicalPath: ME_PREVIEW_AUDIO_DATA_URL,
    mimeType: "audio/mpeg",
  };

  return [
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
    createPreviewArtifact({
      sessionId,
      suffix: META_AGENT_FILE_PREVIEW_DOCX_SUFFIX,
      fileName: "ME 输出文件预览能力说明.docx",
      fileType: "docx",
      producerName: agentName,
      taskName: "文档预览设计",
      content: ME_FILE_PREVIEW_DOCX_CONTENT,
      producedAt: "14:31",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    createPreviewArtifact({
      sessionId,
      suffix: META_AGENT_FILE_PREVIEW_TXT_SUFFIX,
      fileName: "ME 输出文件类型规则.txt",
      fileType: "txt",
      producerName: agentName,
      taskName: "文本文档预览",
      content: ME_FILE_PREVIEW_TXT_CONTENT,
      producedAt: "14:32",
      mimeType: "text/plain",
    }),
    createPreviewArtifact({
      sessionId,
      suffix: META_AGENT_FILE_PREVIEW_XLSX_SUFFIX,
      fileName: "ME 文件类型矩阵.xlsx",
      fileType: "xlsx",
      producerName: agentName,
      taskName: "表格预览设计",
      content: ME_FILE_PREVIEW_XLSX_CONTENT,
      producedAt: "14:33",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    createPreviewArtifact({
      sessionId,
      suffix: META_AGENT_FILE_PREVIEW_PPTX_SUFFIX,
      fileName: "ME 文件预览交互方案.pptx",
      fileType: "pptx",
      producerName: agentName,
      taskName: "演示文稿预览设计",
      content: ME_FILE_PREVIEW_PPTX_CONTENT,
      producedAt: "14:34",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }),
    imageArtifact,
    createPreviewArtifact({
      sessionId,
      suffix: META_AGENT_FILE_PREVIEW_HTML_SUFFIX,
      fileName: "me_file_preview_demo.html",
      fileType: "html",
      producerName: agentName,
      taskName: "HTML 预览设计",
      content: ME_FILE_PREVIEW_HTML_CONTENT,
      producedAt: "14:37",
      mimeType: "text/html",
    }),
    createPreviewArtifact({
      sessionId,
      suffix: META_AGENT_FILE_PREVIEW_JSON_SUFFIX,
      fileName: "me_file_preview_schema.json",
      fileType: "json",
      producerName: agentName,
      taskName: "代码预览设计",
      content: ME_FILE_PREVIEW_JSON_CONTENT,
      producedAt: "14:38",
      mimeType: "application/json",
    }),
    createPreviewArtifact({
      sessionId,
      suffix: META_AGENT_FILE_PREVIEW_PY_SUFFIX,
      fileName: "resolve_me_file_preview.py",
      fileType: "py",
      producerName: agentName,
      taskName: "代码预览设计",
      content: ME_FILE_PREVIEW_PY_CONTENT,
      producedAt: "14:39",
      mimeType: "text/x-python",
    }),
    videoArtifact,
    audioArtifact,
  ];
};

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
        "我确认问题不是所有能力都要配展开，而是过程中的特殊事件才需要有展开策略。这里先把任务分给数据洞察师，他处理期间我继续改文档和 mock，不需要等他返回才做下一步。",
      ),
      createToolUseBlock({
        id: `${messageId}-dispatch`,
        name: "task_dispatch",
        displayName: "任务分发",
        purpose: "分配给数据洞察师：校准任务区多 Goal 展示和收起态规则",
        goalId: "goal-task-structure",
        goalTitle: "Goal 1：梳理任务分组机制",
        status: "running",
        avatarLabel: "数",
      }),
      createToolUseBlock({
        id: `${messageId}-edit`,
        name: "edit_file",
        displayName: "编辑文件",
        purpose: "调整 PRD 中 ME 能力总表和基础对话表格",
        output:
          "已编辑 Frontis AI · 5-15 PRD.md：移除 ME 能力总表、基础对话、文件卡片和工作记录中的“是否展开”列。",
      }),
      createTextBlock(
        `${messageId}-before-expert-return`,
        "数据洞察师还在执行，我先把文档里的表格口径收干净。几分钟后他返回结果时，会作为一条新的任务过程消息插入到当前对话里，而不是塞回最初那条任务分发里面。",
      ),
      createToolUseBlock({
        id: `${messageId}-write`,
        name: "write_file",
        displayName: "创建/写入文件",
        purpose: "生成 ME 能力补充说明文档",
        output:
          "已写入 ME 能力补充说明.md\n路径：/workspace/docs/ME 能力补充说明.md\n用途：说明展开规则只作用于对话中的特殊过程事件。",
      }),
      createToolUseBlock({
        id: `${messageId}-done`,
        name: "workbench-task done",
        displayName: "任务完成",
        purpose: "任务完成 - 数据洞察师：校准任务区多 Goal 展示和收起态规则",
        goalId: "goal-task-structure",
        goalTitle: "Goal 1：梳理任务分组机制",
        output:
          "数据洞察师返回结果：\n\n1. 任务区标题统一为“任务”，不再叫进度。\n2. 一个 Goal 下允许展示多个任务，任务按真实事件顺序排列。\n3. 调度事件和返回事件是异步关系：任务分发先出现，专家完成后再出现任务完成/任务失败。\n4. 收起态只展示当前最新任务及状态；展开态展示本轮所有 Goal 和任务。\n5. 状态只保留执行中、执行完成、执行失败。",
        avatarLabel: "数",
      }),
      createTextBlock(
        `${messageId}-final`,
        `数据洞察师的结果已经回来了。我把它作为独立的“任务完成”过程消息展示，点开同一套浅灰工具展开区可以查看完整返回内容；任务卡片按 Goal 分组，收起时只保留最新任务状态。`,
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

const buildFilePreviewDemoBlocks = (
  round: MetaAgentHistoryRound,
  agentName: string,
  sessionId: string,
): Block[] => {
  const messageId = `metaagent-history-${round.id}-assistant`;
  const artifactId = (suffix: string): string => `${sessionId}-${suffix}`;

  return createAssistantMessageBlocks(
    messageId,
    [
      createThinkingBlock(
        `${messageId}-thinking`,
        "我会把 ME 输出文件先按内容形态分组：文档、表格、演示、页面、图片、音频、视频和代码。预览不是只看后缀，像 DOCX 这类富文本文档要能展示正文、表格和图片，HTML 要同时支持页面预览和源码查看。",
      ),
      createToolUseBlock({
        id: `${messageId}-matrix`,
        name: "write_file",
        displayName: "创建/写入文件",
        purpose: "生成 ME 文件类型矩阵表格",
        output:
          "已创建 ME 文件类型矩阵.xlsx，覆盖文档、表格、演示、页面、代码、图片、音频和视频输出。",
      }),
      createToolUseBlock({
        id: `${messageId}-docx`,
        name: "write_file",
        displayName: "创建/写入文件",
        purpose: "生成包含文本、表格和图片的富文本文档",
        output: "已创建 ME 输出文件预览能力说明.docx，文档预览中包含标题、列表、表格和内嵌图片。",
      }),
      createTextBlock(
        `${messageId}-mid-text`,
        "我把预览器拆成几类：文档类用富文本阅读，表格类用工作簿网格，PPTX 用幻灯片卡片，HTML 保留“预览 / 源码”切换，JSON 和 Python 走代码预览，音频和视频走媒体播放器。",
      ),
      createToolUseBlock({
        id: `${messageId}-html`,
        name: "write_file",
        displayName: "创建/写入文件",
        purpose: "生成 HTML 预览与源码切换示例",
        output:
          "已创建 me_file_preview_demo.html，打开后默认渲染页面，右上角可切换源码并新窗口打开。",
      }),
      createToolUseBlock({
        id: `${messageId}-code`,
        name: "write_file",
        displayName: "创建/写入文件",
        purpose: "生成 JSON 与 Python 代码预览样例",
        output:
          "已创建 me_file_preview_schema.json 和 resolve_me_file_preview.py，代码预览保留缩进、换行和等宽字体。",
      }),
      createToolUseBlock({
        id: `${messageId}-media`,
        name: "write_file",
        displayName: "创建/写入文件",
        purpose: "生成音频和视频预览样例",
        output:
          "已创建 ME 文件预览演示视频.mp4 和 ME 文件预览语音说明.mp3，分别进入视频播放器和音频播放器预览。",
      }),
      createTextBlock(
        `${messageId}-final`,
        `我已经把 ME 输出文件的预览类型做成一组 mock 成果：文档、表格、演示、图片、音频、视频、HTML 和代码都可以点开查看。后续 ME 只要在一轮任务里创建或编辑这些文件，最终回复结尾就追加对应文件卡片。`,
      ),
      createArtifactBlock(
        `${messageId}-artifact-docx`,
        artifactId(META_AGENT_FILE_PREVIEW_DOCX_SUFFIX),
        "ME 输出文件预览能力说明.docx",
        "document",
      ),
      createArtifactBlock(
        `${messageId}-artifact-xlsx`,
        artifactId(META_AGENT_FILE_PREVIEW_XLSX_SUFFIX),
        "ME 文件类型矩阵.xlsx",
        "spreadsheet",
      ),
      createArtifactBlock(
        `${messageId}-artifact-pptx`,
        artifactId(META_AGENT_FILE_PREVIEW_PPTX_SUFFIX),
        "ME 文件预览交互方案.pptx",
        "presentation",
      ),
      createArtifactBlock(
        `${messageId}-artifact-html`,
        artifactId(META_AGENT_FILE_PREVIEW_HTML_SUFFIX),
        "me_file_preview_demo.html",
        "html",
      ),
      createArtifactBlock(
        `${messageId}-artifact-json`,
        artifactId(META_AGENT_FILE_PREVIEW_JSON_SUFFIX),
        "me_file_preview_schema.json",
        "code",
      ),
      createArtifactBlock(
        `${messageId}-artifact-py`,
        artifactId(META_AGENT_FILE_PREVIEW_PY_SUFFIX),
        "resolve_me_file_preview.py",
        "code",
      ),
      createArtifactBlock(
        `${messageId}-artifact-video`,
        artifactId(META_AGENT_FILE_PREVIEW_VIDEO_SUFFIX),
        "ME 文件预览演示视频.mp4",
        "video",
      ),
      createArtifactBlock(
        `${messageId}-artifact-audio`,
        artifactId(META_AGENT_FILE_PREVIEW_AUDIO_SUFFIX),
        "ME 文件预览语音说明.mp3",
        "audio",
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
      "我已经把 Skill、MCP、Workbench Task 和文件卡片按真实执行顺序补进 mock 对话。AI 专家先被调度，ME 中间继续处理文档和 mock，专家几分钟后再以独立的任务完成消息返回结果，最终回复结尾追加文件卡片。",
    assistantBlocks: buildSkillMcpTaskDemoBlocks,
  },
  {
    id: "me-file-preview-demo",
    dateTime: "2026-05-11 14:24",
    userContent:
      "现在需要定义 ME 输出的所有文件类型和预览效果，常见文件都要能分类预览，HTML 要能预览也能看代码，JSON 和 Python 走代码预览。",
    assistantContent:
      "我已经按文档、表格、演示、图片、音频、视频、HTML 和代码重建了一组 ME mock 成果文件。DOCX 支持图文混排预览，XLSX 展示工作簿网格，PPTX 展示幻灯片，HTML 支持预览和源码切换，JSON/Python 走代码预览，音频和视频走媒体播放器。",
    assistantBlocks: buildFilePreviewDemoBlocks,
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
