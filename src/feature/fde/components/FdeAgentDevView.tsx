import { useCallback, useRef, useEffect, useState, useMemo } from "react";

import classNames from "classnames";
import {
  ApiOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  AudioOutlined,
  BookOutlined,
  CheckCircleFilled,
  DatabaseOutlined,
  DownOutlined,
  ExperimentOutlined,
  FileMarkdownOutlined,
  FileTextOutlined,
  LoadingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  PaperClipOutlined,
  PlusOutlined,
  RocketOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Input, Modal, Select, message } from "antd";

import { FDE_AGENT_WORKSPACES } from "@/feature/fde/mockData";
import type { FdeAgentFramework, FdeAgentWorkspace } from "@/feature/fde/types";

import styles from "./FdeAgentDevView.module.less";

/* ─── 类型 ─── */

interface ChatBlock {
  type: "text" | "toolOps" | "httpReq" | "summaryCard" | "fileCard" | "frameworkSelect" | "overviewCard" | "enterpriseSelect";
  content?: string;
  count?: number;
  url?: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  blocks: ChatBlock[];
}

interface AgentFile {
  key: string;
  name: string;
  icon: JSX.Element;
}

type FlowTab = "research" | "dev" | "test" | "evolution" | "publish";
type LeftTab = "knowledge" | "dialogue";
type DevPhase = "idle" | "frameworkSelect" | "executing" | "completed";
type EvoPhase = "idle" | "suggestions" | "progress" | "lineage";

/* ─── Agent 文件 ─── */

const AGENT_FILES: AgentFile[] = [
  { key: "agent-md", name: "AGENT.md", icon: <FileMarkdownOutlined /> },
  { key: "soul-md", name: "soul.md", icon: <FileMarkdownOutlined /> },
  { key: "skill-md", name: "skill.md", icon: <FileMarkdownOutlined /> },
  { key: "runtime", name: "runtime.yaml", icon: <SettingOutlined /> },
  { key: "mcp", name: "mcp-services.yaml", icon: <ApiOutlined /> },
  { key: "tools", name: "tools/", icon: <ToolOutlined /> },
  { key: "prompts", name: "prompts/", icon: <MessageOutlined /> },
  { key: "tests", name: "tests/", icon: <ExperimentOutlined /> },
];

/* ─── 流式剧本 ─── */

const SCRIPT_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    blocks: [
      { type: "toolOps", count: 2 },
      { type: "text", content: "先看一下已有的 skill 结构，参考设计规范：" },
      { type: "toolOps", count: 4 },
      { type: "text", content: "现在我来创建语音识别 skill，基于 OpenAI Whisper（支持本地运行，多语言，无需付费 API）：" },
      { type: "toolOps", count: 3 },
      { type: "text", content: "Skill 文件写好了，现在打包并发布：" },
      { type: "toolOps", count: 2 },
      { type: "text", content: "需要修复 YAML frontmatter 里的冒号问题（description 含冒号需加引号）：" },
      { type: "toolOps", count: 2 },
      { type: "text", content: "打包成功，现在发布到资产库：" },
      { type: "toolOps", count: 3 },
      { type: "text", content: "现在来发布 skill，需要先读取打包的 .skill 文件并上传：" },
      { type: "toolOps", count: 16 },
      { type: "text", content: "有一个\u201C豆包语音工具\u201DMCP！可以用它来实现语音识别功能。让我重新设计 skill：" },
      { type: "httpReq", url: "http://panorama-evo-api:8000/api/v1/mcp-..." },
      { type: "text", content: "豆包 ASR 工具非常完整！现在更新 SKILL.md：" },
      { type: "toolOps", count: 2 },
      { type: "toolOps", count: 2 },
      { type: "text", content: "现在重新打包并发布：" },
      { type: "toolOps", count: 21 },
      { type: "text", content: "文件已上传到 COS！现在试试用 URL 来发布：" },
      { type: "toolOps", count: 34 },
      { type: "text", content: "语音识别 skill 已完成！以下是总结：" },
      { type: "summaryCard" },
      { type: "fileCard", content: "speech-recognition.skill" },
    ],
  },
];

/* ─── 调研 Mock 回复 ─── */

const RESEARCH_MOCK_REPLY = `好的，基于知识库分析和您的需求，我为您设计了以下 Agent 整体方案：

**一、Agent 定位与目标**
本 Agent 定位为企业级智能客服解决方案，覆盖售前咨询、售后服务、工单流转三大场景。

**二、核心 Skill 设计**
1. **知识库问答 Skill** — 基于 RAG 检索增强生成，支持多文档格式
2. **工单生成 Skill** — 自动识别用户意图并创建结构化工单
3. **情绪识别 Skill** — 实时监测对话情绪，触发人工转接

**三、技术架构**
- 底层框架：MetaAgent
- 向量检索：Milvus
- 推理模型：Claude Sonnet 4.6

**四、预期效果**
- 首次回复准确率 ≥ 90%
- 平均响应时间 ≤ 2s
- 工单自动化率 ≥ 75%`;

/* ─── 测试 Mock 回复 ─── */

const TEST_MOCK_REPLIES = [
  "好的，我已收到你的语音文件。正在调用豆包 ASR 进行识别...\n\n识别结果：\n> 今天天气真不错，我们去公园散步吧。\n\n识别置信度：98.2%，语言：zh-CN",
  "已完成转录，共识别出 3 位说话人，总时长 2分34秒。字幕文件已生成为 output.srt 格式。",
  "检测到音频中包含较多环境噪音，建议启用降噪预处理。当前识别准确率约 89%，开启降噪后预计可提升至 95%+。",
];

/* ─── 进化 Mock ─── */

const EVOLUTION_SUGGESTIONS = [
  { title: "优化Skill触发准确率", scope: "Skill路由层", desc: "通过补充边界测试用例，优化触发条件描述，减少误触发和漏触发情况。" },
  { title: "降低Token消耗", scope: "所有Skill执行", desc: "优化Prompt长度，减少冗余上下文，使用更精简的指令板，预计可降低20%的Token消耗。" },
  { title: "提升任务完成率", scope: "复杂任务场景", desc: "增强错误处理机制，添加重试逻辑，优化工具调用参数验证，提高复杂任务的成功率。" },
];

const PROGRESS_STEPS = ["数据回流", "数据清洗", "数据评估", "数据入库"];

/* ─── 发布 ─── */

const AGENT_SKILLS = [
  { key: "speech-recognition", name: "语音识别 Skill" },
  { key: "text-to-speech", name: "文本转语音 Skill" },
  { key: "asr-doubao", name: "豆包 ASR Skill" },
];

const PUBLISH_COVERS = [
  { key: "blue", label: "科技蓝", gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { key: "green", label: "生长绿", gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { key: "orange", label: "活力橙", gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { key: "cyan", label: "清新青", gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { key: "purple", label: "创意紫", gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" },
  { key: "dark", label: "专业黑", gradient: "linear-gradient(135deg, #434343 0%, #000000 100%)" },
];

interface PublishFormState {
  name: string;
  version: string;
  type: string;
  category: string;
  visibility: string;
  tags: string;
  description: string;
  cover: string;
  selectedSkill: string;
}

const DEFAULT_PUBLISH_FORM: PublishFormState = {
  name: "",
  version: "1.0.0",
  type: "skill",
  category: "general",
  visibility: "public",
  tags: "",
  description: "",
  cover: "blue",
  selectedSkill: AGENT_SKILLS[0].key,
};

/* ─── 摘要卡片 ─── */

const SUMMARY_TABLE_ROWS = [
  { feature: "支持格式", desc: "mp3、wav、ogg（最大 512MB）" },
  { feature: "语言支持", desc: "自动检测，或指定 zh-CN / en-US / ja-JP 等 20+ 语言" },
  { feature: "说话人分离", desc: "支持最多 10 人，带时间戳" },
  { feature: "情绪检测", desc: "happy / sad / angry / neutral / surprise" },
  { feature: "字幕生成", desc: "可输出 SRT 格式字幕文件" },
  { feature: "语气词过滤", desc: "自动去除\u201C嗯\u201D\u201C啊\u201D等填充词" },
];

const FRAMEWORK_COLORS: Record<FdeAgentFramework, string> = {
  MetaAgent: "#667eea",
  Syngent: "#11998e",
  OpenClaw: "#f5576c",
};

const FLOW_TAB_LABELS: Record<FlowTab, string> = {
  research: "调研",
  dev: "开发",
  test: "测试",
  evolution: "进化",
  publish: "发布",
};

const WORKSPACE_FRAMEWORK_OPTIONS: Array<{
  label: string;
  value: FdeAgentFramework;
}> = [
  { label: "MetaAgent", value: "MetaAgent" },
  { label: "Syngent", value: "Syngent" },
  { label: "OpenClaw", value: "OpenClaw" },
];

const WORKSPACE_FRAMEWORK_SKILLS: Record<
  FdeAgentFramework,
  Array<{ name: string; version: string }>
> = {
  MetaAgent: [
    { name: "智能文案生成", version: "3.0.1" },
    { name: "多语言翻译引擎", version: "2.4.0" },
  ],
  Syngent: [
    { name: "采购计划生成", version: "2.1.0" },
    { name: "库存异常监控", version: "1.8.0" },
  ],
  OpenClaw: [
    { name: "数据分析助手", version: "2.0.0" },
    { name: "SQL 生成器", version: "1.6.0" },
  ],
};

const WORKSPACE_FRAMEWORK_ICON_TEXT: Record<FdeAgentFramework, string> = {
  MetaAgent: "智",
  Syngent: "协",
  OpenClaw: "数",
};

/* ─── 子组件 ─── */

const ToolOpsBlock = ({ count }: { count: number }): JSX.Element => {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.toolOpsBlock}>
      <button type="button" className={styles.toolOpsToggle} onClick={() => setOpen(v => !v)}>
        <span>执行了 {count} 个操作</span>
        <DownOutlined className={classNames(styles.toolOpsArrow, open && styles.toolOpsArrowOpen)} />
      </button>
      {open && (
        <div className={styles.toolOpsDetail}>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className={styles.toolOpsItem}>
              <CheckCircleFilled className={styles.toolOpsCheck} />
              <span className={styles.toolOpsLine} style={{ width: `${60 + Math.random() * 100}px` }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SummaryCard = (): JSX.Element => (
  <div className={styles.summaryCard}>
    <h3 className={styles.summaryTitle}>
      <CheckCircleFilled style={{ color: "#3cbf7b" }} /> 语音识别 Skill 已发布
    </h3>
    <div className={styles.summarySection}>
      <h4 className={styles.summarySectionTitle}>设计亮点</h4>
      <p className={styles.summaryText}>
        基于平台内置的<strong>豆包 ASR 大模型</strong>（MCP doubao_asr），无需安装本地模型：
      </p>
      <table className={styles.summaryTable}>
        <thead><tr><th>特性</th><th>说明</th></tr></thead>
        <tbody>
          {SUMMARY_TABLE_ROWS.map(row => (
            <tr key={row.feature}><td><strong>{row.feature}</strong></td><td>{row.desc}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════════════════ */

export const FdeAgentDevView = (): JSX.Element => {
  /* ── 顶层页面状态 ── */
  const [page, setPage] = useState<"list" | "detail">("list");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [customWorkspaces, setCustomWorkspaces] = useState<FdeAgentWorkspace[]>([]);
  const [isNewWorkspaceModalOpen, setIsNewWorkspaceModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");
  const [newWorkspaceFramework, setNewWorkspaceFramework] = useState<FdeAgentFramework | undefined>(undefined);

  const allWorkspaces = useMemo<FdeAgentWorkspace[]>(
    () => [...FDE_AGENT_WORKSPACES, ...customWorkspaces],
    [customWorkspaces],
  );

  const selectedWorkspace = useMemo<FdeAgentWorkspace | null>(
    () => (selectedWorkspaceId ? allWorkspaces.find(w => w.id === selectedWorkspaceId) ?? null : null),
    [allWorkspaces, selectedWorkspaceId],
  );

  /* ── 左侧面板 ── */
  const [leftTab, setLeftTab] = useState<LeftTab>("dialogue");
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);

  /* ── 右侧资产中心 ── */
  const [rightTab, setRightTab] = useState<"files" | "results">("files");
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  /* ── 中间对话面板 ── */
  const [activeFlowTab, setActiveFlowTab] = useState<FlowTab>("research");

  // 调研
  const [researchMessages, setResearchMessages] = useState<ChatMessage[]>([]);
  const researchReplyIdx = useRef(0);

  // 开发
  const [devPhase, setDevPhase] = useState<DevPhase>("idle");
  const [devMessages, setDevMessages] = useState<ChatMessage[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [visibleFileCount, setVisibleFileCount] = useState(0);
  const [streamScriptIdx, setStreamScriptIdx] = useState(-1);
  const [streamBlockIdx, setStreamBlockIdx] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolOpsSeenRef = useRef(0);

  // 测试
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const [testReady, setTestReady] = useState(false);
  const [testFileIdx, setTestFileIdx] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const testReplyIdx = useRef(0);
  const testBodyRef = useRef<HTMLDivElement>(null);

  // 进化
  const [evoPhase, setEvoPhase] = useState<EvoPhase>("idle");
  const [selectedEnterprises, setSelectedEnterprises] = useState<Set<string>>(new Set());
  const [progressCompleted, setProgressCompleted] = useState(0);
  const [evoMessages, setEvoMessages] = useState<ChatMessage[]>([]);

  // 发布
  const [publishType, setPublishType] = useState<"skill" | "agent" | null>(null);
  const [publishForm, setPublishForm] = useState<PublishFormState>(DEFAULT_PUBLISH_FORM);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const chatBodyRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  /* ── 当前 tab 的消息 ── */
  const currentMessages = useMemo(() => {
    switch (activeFlowTab) {
      case "research": return researchMessages;
      case "dev": return devMessages;
      case "test": return testMessages;
      case "evolution": return evoMessages;
      default: return [];
    }
  }, [activeFlowTab, researchMessages, devMessages, testMessages, evoMessages]);

  /* ── 开发流式引擎 ── */
  useEffect(() => {
    if (!isStreaming || streamScriptIdx < 0 || activeFlowTab !== "dev") return;

    const scriptMsg = SCRIPT_MESSAGES[streamScriptIdx];
    if (!scriptMsg) {
      setIsStreaming(false);
      setDevPhase("completed");
      return;
    }

    const totalBlocks = scriptMsg.blocks.length;
    if (streamBlockIdx === 0) {
      setDevMessages(prev => [...prev, { role: "assistant", blocks: [] }]);
    }

    if (streamBlockIdx < totalBlocks) {
      const block = scriptMsg.blocks[streamBlockIdx];
      const delay = block.type === "summaryCard" ? 800 : 350;
      streamTimerRef.current = setTimeout(() => {
        setDevMessages(prev => {
          const msgs = [...prev];
          const last = msgs[msgs.length - 1];
          msgs[msgs.length - 1] = { ...last, blocks: [...last.blocks, block] };
          return msgs;
        });
        if (block.type === "toolOps") {
          toolOpsSeenRef.current += 1;
          if (toolOpsSeenRef.current <= AGENT_FILES.length) {
            setVisibleFileCount(toolOpsSeenRef.current);
          }
        }
        setStreamBlockIdx(streamBlockIdx + 1);
      }, delay);
    } else {
      const next = streamScriptIdx + 1;
      if (next < SCRIPT_MESSAGES.length) {
        streamTimerRef.current = setTimeout(() => {
          setStreamScriptIdx(next);
          setStreamBlockIdx(0);
        }, 500);
      } else {
        setIsStreaming(false);
        setDevPhase("completed");
      }
    }

    return () => { if (streamTimerRef.current) clearTimeout(streamTimerRef.current); };
  }, [isStreaming, streamScriptIdx, streamBlockIdx, activeFlowTab]);

  useEffect(() => {
    if (currentMessages.length > 0) scrollToBottom();
  }, [currentMessages, scrollToBottom]);

  /* ── 测试 runtime 写入动画 ── */
  useEffect(() => {
    if (activeFlowTab !== "test" || !testStarted || testReady) return;
    if (testFileIdx >= AGENT_FILES.length) {
      setTestReady(true);
      // 自动发送测试用例
      setTimeout(() => {
        const autoMsg: ChatMessage = { role: "user", blocks: [{ type: "text", content: "请帮我转录一段录音文件，格式为 mp3，大约 3 分钟。" }] };
        const reply = TEST_MOCK_REPLIES[0];
        const assistantMsg: ChatMessage = { role: "assistant", blocks: [{ type: "text", content: reply }] };
        setTestMessages(prev => [...prev, autoMsg, assistantMsg]);
      }, 800);
      return;
    }
    const timer = setTimeout(() => setTestFileIdx(prev => prev + 1), 600);
    return () => clearTimeout(timer);
  }, [activeFlowTab, testStarted, testReady, testFileIdx]);

  useEffect(() => {
    if (activeFlowTab === "test" && testStarted) {
      requestAnimationFrame(() => {
        testBodyRef.current?.scrollTo({ top: testBodyRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }, [activeFlowTab, testStarted, testFileIdx, testMessages]);

  /* ── 进化进度动画 ── */
  useEffect(() => {
    if (evoPhase !== "progress") return;
    if (progressCompleted >= PROGRESS_STEPS.length) {
      setTimeout(() => setEvoPhase("lineage"), 600);
      return;
    }
    const timer = setTimeout(() => setProgressCompleted(prev => prev + 1), 800);
    return () => clearTimeout(timer);
  }, [evoPhase, progressCompleted]);

  /* ── 进入工作空间详情 ── */
  const handleOpenWorkspace = useCallback((ws: FdeAgentWorkspace) => {
    setSelectedWorkspaceId(ws.id);
    setPage("detail");
    setActiveFlowTab("research");
    setLeftTab("dialogue");
    setShowFeedbackPanel(false);
    setRightTab("files");
    setIsRightPanelCollapsed(false);
    setResearchMessages([]);
    setDevPhase("idle");
    setDevMessages([]);
    setSelectedFramework(null);
    setVisibleFileCount(0);
    setTestMessages([]);
    setTestReady(false);
    setTestFileIdx(0);
    setTestStarted(false);
    setEvoPhase("idle");
    setSelectedEnterprises(new Set());
    setProgressCompleted(0);
    setEvoMessages([]);
    setPublishType(null);
    setPublishForm(DEFAULT_PUBLISH_FORM);
    setPublishSuccess(false);
    toolOpsSeenRef.current = 0;
    researchReplyIdx.current = 0;
    testReplyIdx.current = 0;
  }, []);

  const handleBackToList = useCallback(() => {
    if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
    setIsStreaming(false);
    setStreamScriptIdx(-1);
    setPage("list");
    setSelectedWorkspaceId(null);
    setIsRightPanelCollapsed(false);
  }, []);

  const handleOpenNewWorkspaceModal = useCallback(() => {
    setNewWorkspaceName("");
    setNewWorkspaceDescription("");
    setNewWorkspaceFramework(undefined);
    setIsNewWorkspaceModalOpen(true);
  }, []);

  const handleCloseNewWorkspaceModal = useCallback(() => {
    setIsNewWorkspaceModalOpen(false);
  }, []);

  const handleCreateWorkspace = useCallback(() => {
    const trimmedName = newWorkspaceName.trim();
    const trimmedDescription = newWorkspaceDescription.trim();
    const framework = newWorkspaceFramework ?? "MetaAgent";

    if (!trimmedName) {
      message.warning("请输入工作空间名称");
      return;
    }

    const newWorkspace: FdeAgentWorkspace = {
      id: `ws-custom-${Date.now()}`,
      name: trimmedName,
      description: trimmedDescription || `基于 ${framework} 框架创建的智能 Agent 工作空间`,
      iconColor: FRAMEWORK_COLORS[framework],
      iconText: WORKSPACE_FRAMEWORK_ICON_TEXT[framework],
      framework,
      skillCount: WORKSPACE_FRAMEWORK_SKILLS[framework].length,
      skills: WORKSPACE_FRAMEWORK_SKILLS[framework],
      createdAt: new Date().toISOString().slice(0, 10),
      conversations: [],
      knowledgeBases: [],
      feedbackData: [],
      results: [],
      fileCount: 0,
      overviewText: "新创建的工作空间，暂无文件。",
    };

    setCustomWorkspaces(prev => [...prev, newWorkspace]);
    setIsNewWorkspaceModalOpen(false);
    message.success("工作空间已创建");
    handleOpenWorkspace(newWorkspace);
  }, [
    handleOpenWorkspace,
    newWorkspaceDescription,
    newWorkspaceFramework,
    newWorkspaceName,
  ]);

  /* ── 调研发送 ── */
  const handleResearchSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    const userMsg: ChatMessage = { role: "user", blocks: [{ type: "text", content: text }] };
    const assistantMsg: ChatMessage = {
      role: "assistant",
      blocks: [{ type: "text", content: researchReplyIdx.current === 0 ? RESEARCH_MOCK_REPLY : "好的，我已更新方案。请查看右侧成果面板中的最新设计方案。" }],
    };
    researchReplyIdx.current += 1;
    setResearchMessages(prev => [...prev, userMsg, assistantMsg]);
    setInputValue("");
  }, [inputValue]);

  /* ── 开发框架选择 ── */
  const handleSelectFramework = useCallback((fw: string) => {
    setSelectedFramework(fw);
    const userChoice: ChatMessage = { role: "user", blocks: [{ type: "text", content: `使用 ${fw} 框架` }] };
    const startMsg: ChatMessage = {
      role: "assistant",
      blocks: [{ type: "text", content: `好的，已选择 **${fw}** 框架。现在开始为你创建 Agent，请稍候...` }],
    };
    setDevMessages(prev => [...prev, userChoice, startMsg]);
    setDevPhase("executing");
    toolOpsSeenRef.current = 0;
    setVisibleFileCount(0);
    setTimeout(() => {
      setStreamScriptIdx(0);
      setStreamBlockIdx(0);
      setIsStreaming(true);
    }, 800);
  }, []);

  /* ── 开发发送（idle 时触发框架选择） ── */
  const handleDevSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    if (devPhase === "idle") {
      const userMsg: ChatMessage = { role: "user", blocks: [{ type: "text", content: text }] };
      const assistantMsg: ChatMessage = {
        role: "assistant",
        blocks: [
          { type: "text", content: "好的，在开始开发之前，请先选择你要采用的 Agent 框架：" },
          { type: "frameworkSelect" },
        ],
      };
      setDevMessages(prev => [...prev, userMsg, assistantMsg]);
      setDevPhase("frameworkSelect");
      setInputValue("");
    }
  }, [inputValue, isStreaming, devPhase]);

  /* ── 测试开始 ── */
  const handleStartTest = useCallback(() => {
    setTestStarted(true);
    setTestReady(false);
    setTestFileIdx(0);
    setTestMessages([]);
  }, []);

  /* ── 测试发送 ── */
  const handleTestSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || !testReady) return;
    const userMsg: ChatMessage = { role: "user", blocks: [{ type: "text", content: text }] };
    testReplyIdx.current += 1;
    const reply = TEST_MOCK_REPLIES[testReplyIdx.current % TEST_MOCK_REPLIES.length];
    const assistantMsg: ChatMessage = { role: "assistant", blocks: [{ type: "text", content: reply }] };
    setTestMessages(prev => [...prev, userMsg, assistantMsg]);
    setInputValue("");
  }, [inputValue, testReady]);

  /* ── 进化企业选择 ── */
  const enterpriseList = useMemo(
    () => selectedWorkspace?.feedbackData ?? [],
    [selectedWorkspace],
  );

  const handleToggleEnterprise = useCallback((name: string) => {
    setSelectedEnterprises(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  const handleSelectAllEnterprises = useCallback(() => {
    setSelectedEnterprises(prev => {
      if (prev.size === enterpriseList.length) return new Set();
      return new Set(enterpriseList.map(e => e.enterprise));
    });
  }, [enterpriseList]);

  /* ── 进化开始 ── */
  const handleClickEvolve = useCallback(() => {
    if (selectedEnterprises.size === 0) return;
    setEvoPhase("suggestions");
    setEvoMessages([
      {
        role: "system",
        blocks: [{ type: "text", content: `已选择 ${selectedEnterprises.size} 个企业客户的回流数据。分析完成，以下是进化建议：` }],
      },
    ]);
  }, [selectedEnterprises.size]);

  const handleExecuteEvolution = useCallback(() => {
    setEvoPhase("progress");
    setProgressCompleted(0);
  }, []);

  /* ── 发布 ── */
  const handleSubmitPublish = useCallback(() => {
    if (!publishForm.name.trim()) {
      message.warning("请填写名称");
      return;
    }
    setPublishSuccess(true);
    message.success(
      publishType === "skill"
        ? `Skill「${publishForm.name}」已成功发布到 Skill 广场`
        : `Agent「${publishForm.name}」已成功发布到 Agent Store`,
    );
  }, [publishType, publishForm.name]);

  const updatePublishForm = useCallback((patch: Partial<PublishFormState>) => {
    setPublishForm(prev => ({ ...prev, ...patch }));
  }, []);

  /* ── 发送总入口 ── */
  const handleSend = useCallback(() => {
    switch (activeFlowTab) {
      case "research": return handleResearchSend();
      case "dev": return handleDevSend();
      case "test": return handleTestSend();
      default: break;
    }
  }, [activeFlowTab, handleResearchSend, handleDevSend, handleTestSend]);

  /* ── 渲染 block ── */
  const renderBlock = (block: ChatBlock, idx: number): JSX.Element | null => {
    switch (block.type) {
      case "text":
        return (
          <div key={idx} className={styles.msgText}>
            {block.content!.split("\n").map((line, li) => {
              if (/^\d+\.\s\*\*/.test(line)) {
                const m = line.match(/^(\d+\.\s)\*\*(.+?)\*\*(.*)$/);
                if (m) return <p key={li} className={styles.msgParagraph}>{m[1]}<strong>{m[2]}</strong>{m[3]}</p>;
              }
              if (/\*\*(.+?)\*\*/.test(line)) {
                const parts = line.split(/\*\*(.+?)\*\*/);
                return <p key={li} className={styles.msgParagraph}>{parts.map((p, pi) => pi % 2 === 1 ? <strong key={pi}>{p}</strong> : p)}</p>;
              }
              if (line.startsWith("- ")) return <p key={li} className={styles.msgBullet}>{line.replace(/^-\s/, "\u2022 ")}</p>;
              if (line === "") return <br key={li} />;
              return <p key={li} className={styles.msgParagraph}>{line}</p>;
            })}
          </div>
        );
      case "frameworkSelect":
        return (
          <div key={idx} className={styles.frameworkSelectRow}>
            {["MetaAgent", "Syngent", "OpenClaw"].map(fw => (
              <button
                key={fw}
                type="button"
                className={classNames(styles.frameworkBtn, selectedFramework === fw && styles.frameworkBtnSelected)}
                disabled={!!selectedFramework}
                onClick={() => handleSelectFramework(fw)}
              >
                {fw}
              </button>
            ))}
          </div>
        );
      case "toolOps":
        return <ToolOpsBlock key={idx} count={block.count!} />;
      case "httpReq":
        return (
          <div key={idx} className={styles.httpReqBlock}>
            <span className={styles.httpReqLabel}>HTTP请求</span>
            <span className={styles.httpReqUrl}>{block.url}</span>
            <DownOutlined className={styles.httpReqArrow} />
          </div>
        );
      case "summaryCard":
        return <SummaryCard key={idx} />;
      case "fileCard":
        return (
          <div key={idx} className={styles.fileCard}>
            <FileTextOutlined className={styles.fileCardIcon} />
            <div className={styles.fileCardInfo}>
              <span className={styles.fileCardName}>{block.content}</span>
              <span className={styles.fileCardHint}>预览文件</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  /* ═══ 页面一：列表 ═══ */
  if (page === "list") {
    const filtered = searchKeyword.trim()
      ? allWorkspaces.filter(
          w =>
            w.name.includes(searchKeyword.trim()) ||
            w.description.includes(searchKeyword.trim()),
        )
      : allWorkspaces;

    return (
      <div className={styles.listRoot}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>Agent工作空间</h2>
          <Input
            allowClear value={searchKeyword} placeholder="搜索工作空间..."
            prefix={<SearchOutlined className={styles.searchIcon} />}
            className={styles.listSearchBox}
            onChange={e => setSearchKeyword(e.target.value)}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className={styles.listNewBtn}
            onClick={handleOpenNewWorkspaceModal}
          >
            新建工作空间
          </Button>
        </div>
        <div className={styles.listGrid}>
          {filtered.map(ws => (
            <button key={ws.id} type="button" className={styles.workspaceCard} onClick={() => handleOpenWorkspace(ws)}>
              <div className={styles.wsCardTop}>
                <span className={styles.wsCardIcon} style={{ background: `color-mix(in srgb, ${ws.iconColor} 14%, transparent)`, color: ws.iconColor }}>{ws.iconText}</span>
                <div className={styles.wsCardMeta}>
                  <span className={styles.wsCardName}>{ws.name}</span>
                  <span className={styles.wsCardDesc}>{ws.description}</span>
                </div>
              </div>
              <div className={styles.wsCardBottom}>
                <span className={styles.wsCardSkillBadge}><ThunderboltOutlined /> {ws.skillCount} 个 Skill</span>
                <span className={styles.wsCardFrameworkBadge} style={{ background: `color-mix(in srgb, ${FRAMEWORK_COLORS[ws.framework]} 10%, transparent)`, color: FRAMEWORK_COLORS[ws.framework] }}>{ws.framework}</span>
              </div>
            </button>
          ))}
        </div>

        <Modal
          open={isNewWorkspaceModalOpen}
          title="新建工作空间"
          okText="创建工作空间"
          cancelText="取消"
          destroyOnHidden
          onCancel={handleCloseNewWorkspaceModal}
          onOk={handleCreateWorkspace}
        >
          <div className={styles.workspaceModalForm}>
            <div className={styles.workspaceModalField}>
              <span className={styles.workspaceModalLabel}>工作空间名称</span>
              <Input
                maxLength={80}
                placeholder="请输入工作空间名称"
                value={newWorkspaceName}
                onChange={e => setNewWorkspaceName(e.target.value)}
              />
            </div>

            <div className={styles.workspaceModalField}>
              <span className={styles.workspaceModalLabel}>工作空间描述</span>
              <Input.TextArea
                rows={4}
                maxLength={200}
                placeholder="可选，简要描述这个工作空间的用途"
                value={newWorkspaceDescription}
                onChange={e => setNewWorkspaceDescription(e.target.value)}
              />
            </div>

            <div className={styles.workspaceModalField}>
              <span className={styles.workspaceModalLabel}>Agent 框架</span>
              <Select
                allowClear
                placeholder="可选，默认使用 MetaAgent"
                options={WORKSPACE_FRAMEWORK_OPTIONS}
                value={newWorkspaceFramework}
                onChange={value =>
                  setNewWorkspaceFramework(
                    value === "MetaAgent" ||
                      value === "Syngent" ||
                      value === "OpenClaw"
                      ? value
                      : undefined,
                  )
                }
              />
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  /* ═══ 页面二：详情（三联） ═══ */

  const ws = selectedWorkspace!;
  const totalResults = ws.results.reduce((sum, r) => sum + r.resultCount, 0);

  /* ── 左侧面板 ── */
  const leftPanel = (
    <aside className={styles.leftPanel}>
      <div className={styles.leftTabs}>
        <button type="button" className={classNames(styles.leftTabBtn, leftTab === "knowledge" && styles.leftTabBtnActive)} onClick={() => setLeftTab("knowledge")}>
          <BookOutlined /> 知识库
        </button>
        <button type="button" className={classNames(styles.leftTabBtn, leftTab === "dialogue" && styles.leftTabBtnActive)} onClick={() => setLeftTab("dialogue")}>
          <MessageOutlined /> 对话
        </button>
      </div>

      {leftTab === "dialogue" ? (
        <div className={styles.leftBody}>
          <button type="button" className={styles.newChatBtn}><PlusOutlined /> 新建对话</button>
          <div className={styles.convList}>
            {ws.conversations.map(conv => (
              <button key={conv.id} type="button" className={styles.convItem}>
                <span className={styles.convTitle}>{conv.title}</span>
                <span className={styles.convDate}>{conv.date}</span>
                <span className={styles.convSummary}>{conv.summary}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.leftBody}>
          {ws.knowledgeBases.map(kb => (
            <div key={kb.id} className={styles.kbItem}>
              <BookOutlined className={styles.kbIcon} />
              <div className={styles.kbMeta}>
                <span className={styles.kbName}>{kb.name}</span>
                <span className={styles.kbCount}>{kb.fileCount} 个文件</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className={classNames(styles.feedbackBtn, showFeedbackPanel && styles.feedbackBtnActive)}
        onClick={() => setShowFeedbackPanel(v => !v)}
      >
        <DatabaseOutlined /> 回流数据
      </button>

      {showFeedbackPanel && (
        <div className={styles.feedbackPanel}>
          <h4 className={styles.feedbackPanelTitle}>回流数据源</h4>
          {ws.feedbackData.map(fb => (
            <div key={fb.enterprise} className={styles.feedbackRow}>
              <span className={styles.feedbackEnterprise}>{fb.enterprise}</span>
              <span className={styles.feedbackCount}>{fb.count} 条</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );

  /* ── 中间：进化 tab 的企业选择 + 对话 ── */
  const renderEvoContent = () => (
    <div className={styles.chatBody} ref={chatBodyRef}>
      {/* 企业数据源选择 */}
      {evoPhase === "idle" && (
        <>
          <div className={classNames(styles.msgRow, styles.msgRowAssistant)}>
            <div className={classNames(styles.msgBubble, styles.msgBubbleSystem)}>
              <div className={styles.msgText}>
                <p className={styles.msgParagraph}>欢迎使用 Agent 进化能力，请先选择要基于哪些企业客户的回流数据进行进化。</p>
              </div>
            </div>
          </div>
          <div className={classNames(styles.msgRow, styles.msgRowAssistant)}>
            <div className={classNames(styles.msgBubble, styles.msgBubbleAssistant)}>
              <div className={styles.enterpriseSelect}>
                <span className={styles.enterpriseSelectLabel}>选择回流数据源</span>
                <Checkbox
                  className={styles.enterpriseCheckbox}
                  checked={selectedEnterprises.size === enterpriseList.length && enterpriseList.length > 0}
                  onChange={handleSelectAllEnterprises}
                >
                  全选
                </Checkbox>
                {enterpriseList.map(fb => (
                  <Checkbox
                    key={fb.enterprise}
                    className={styles.enterpriseCheckbox}
                    checked={selectedEnterprises.has(fb.enterprise)}
                    onChange={() => handleToggleEnterprise(fb.enterprise)}
                  >
                    <strong>{fb.enterprise}</strong> ({fb.count} 条)
                  </Checkbox>
                ))}
              </div>
              {selectedEnterprises.size > 0 && (
                <div className={styles.evoConfirmText}>
                  已选择 {selectedEnterprises.size} 个企业客户的回流数据。查询到以下几项内容待进化，请确认是否进行？
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 进化建议 */}
      {evoPhase === "suggestions" && evoMessages.map((msg, mi) => (
        <div key={mi} className={classNames(styles.msgRow, styles.msgRowAssistant)}>
          <div className={classNames(styles.msgBubble, styles.msgBubbleAssistant)}>
            {msg.blocks.map((b, bi) => renderBlock(b, bi))}
          </div>
        </div>
      ))}
      {evoPhase === "suggestions" && (
        <div className={styles.evoSuggestionsCard}>
          <h4 className={styles.evoSuggestionsTitle}>SKILL 进化建议</h4>
          {EVOLUTION_SUGGESTIONS.map((s, i) => (
            <div key={i} className={styles.evoSuggestionItem}>
              <div className={styles.evoSuggestionHeader}>
                <span className={styles.evoSuggestionName}>{s.title}</span>
                <span className={styles.evoSuggestionScope}>{s.scope}</span>
              </div>
              <p className={styles.evoSuggestionDesc}>{s.desc}</p>
            </div>
          ))}
          <Button type="primary" icon={<RocketOutlined />} onClick={handleExecuteEvolution}>执行进化</Button>
        </div>
      )}

      {/* 进度 */}
      {(evoPhase === "progress" || evoPhase === "lineage") && (
        <div className={styles.evoProgressCard}>
          <h4 className={styles.evoProgressTitle}>进化进度</h4>
          {PROGRESS_STEPS.map((step, i) => (
            <div key={i} className={styles.evoProgressRow}>
              <span className={styles.evoProgressLabel}>{step}</span>
              <div className={styles.evoProgressBarBg}>
                <div
                  className={styles.evoProgressBarFill}
                  style={{ width: i < progressCompleted ? "100%" : "0%", transition: "width 600ms ease" }}
                />
              </div>
              {i < progressCompleted && <CheckCircleFilled style={{ color: "#3cbf7b", fontSize: 14 }} />}
              {i === progressCompleted && evoPhase === "progress" && <LoadingOutlined spin style={{ color: "var(--primary)", fontSize: 14 }} />}
            </div>
          ))}
        </div>
      )}

      {/* 血缘 */}
      {evoPhase === "lineage" && (
        <div className={styles.evoLineageCard}>
          <h4 className={styles.evoLineageTitle}>版本血缘关系</h4>
          <p className={styles.evoLineageText}>V2.0 → V2.1（候选版本）</p>
          <p className={styles.evoLineageText}>进化完成！Agent 已生成候选版本，请前往「发布」tab 进行发布。</p>
        </div>
      )}
    </div>
  );

  /* ── 中间：测试 tab ── */
  const renderTestContent = () => (
    <div className={styles.chatBody} ref={testBodyRef}>
      {!testStarted ? (
        <div className={styles.testWelcome}>
          <ExperimentOutlined className={styles.testWelcomeIcon} />
          <h3 className={styles.testWelcomeTitle}>Agent 测试</h3>
          <p className={styles.testWelcomeDesc}>启动 runtime，自动运行测试用例。</p>
          <Button type="primary" icon={<ExperimentOutlined />} onClick={handleStartTest}>启动测试</Button>
        </div>
      ) : (
        <>
          {AGENT_FILES.slice(0, testFileIdx).map((f) => (
            <div key={f.key} className={styles.runtimeWriteItem}>
              <CheckCircleFilled className={styles.runtimeWriteIcon} />
              <span>已写入 <strong>{f.name}</strong> → runtime</span>
            </div>
          ))}
          {!testReady && testFileIdx < AGENT_FILES.length && (
            <div className={styles.runtimeWriteItem}>
              <LoadingOutlined spin className={styles.runtimeWriteIconLoading} />
              <span>正在写入 <strong>{AGENT_FILES[testFileIdx].name}</strong> → runtime...</span>
            </div>
          )}
          {testReady && (
            <div className={styles.runtimeDoneMsg}>
              <CheckCircleFilled style={{ color: "#3cbf7b" }} />
              <span>Agent 已在 <strong>{selectedFramework ?? ws.framework}</strong> runtime 成功启动，正在发送测试用例...</span>
            </div>
          )}
          {testMessages.map((msg, mi) => (
            <div key={mi} className={classNames(styles.msgRow, msg.role === "user" ? styles.msgRowUser : styles.msgRowAssistant)}>
              <div className={classNames(styles.msgBubble, msg.role === "user" ? styles.msgBubbleUser : styles.msgBubbleAssistant)}>
                {msg.blocks.map((b, bi) => renderBlock(b, bi))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  /* ── 中间：发布 tab ── */
  const renderPublishContent = () => (
    <div className={styles.publishBody}>
      {publishSuccess ? (
        <div className={styles.publishSuccessView}>
          <CheckCircleFilled style={{ fontSize: 48, color: "#3cbf7b" }} />
          <h3 className={styles.publishSuccessTitle}>
            {publishType === "skill" ? "Skill 已发布到 Skill 广场" : "Agent 已发布到 Agent Store"}
          </h3>
          <p className={styles.publishSuccessHint}>
            {publishForm.name} v{publishForm.version} 已成功发布。
          </p>
        </div>
      ) : !publishType ? (
        <div className={styles.publishTypeSection}>
          <h4 className={styles.publishSectionTitle}>选择发布类型</h4>
          <div className={styles.publishTypeCards}>
            <button type="button" className={styles.publishTypeCard} onClick={() => {
              setPublishType("skill");
              const sk = AGENT_SKILLS[0];
              updatePublishForm({ selectedSkill: sk.key, name: sk.name });
            }}>
              <ThunderboltOutlined className={styles.publishTypeCardIcon} />
              <div className={styles.publishTypeCardCopy}>
                <span className={styles.publishTypeCardTitle}>发布为 Skill</span>
                <span className={styles.publishTypeCardDesc}>选择一个 Skill 发布到 Skill 广场</span>
              </div>
            </button>
            <button type="button" className={styles.publishTypeCard} onClick={() => setPublishType("agent")}>
              <AppstoreOutlined className={styles.publishTypeCardIcon} />
              <div className={styles.publishTypeCardCopy}>
                <span className={styles.publishTypeCardTitle}>发布为 Agent</span>
                <span className={styles.publishTypeCardDesc}>将当前 Agent 发布到 Agent Store</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.publishFormArea}>
          {publishType === "skill" && (
            <div className={styles.publishFormSection}>
              <h4 className={styles.publishSectionTitle}>选择 Skill</h4>
              <div className={styles.publishSkillList}>
                {AGENT_SKILLS.map(sk => (
                  <button key={sk.key} type="button"
                    className={classNames(styles.publishSkillItem, publishForm.selectedSkill === sk.key && styles.publishSkillItemActive)}
                    onClick={() => updatePublishForm({ selectedSkill: sk.key, name: sk.name })}
                  >
                    <ThunderboltOutlined /><span>{sk.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className={styles.publishFormSection}>
            <h4 className={styles.publishSectionTitle}>{publishType === "skill" ? "Skill 信息" : "Agent 信息"}</h4>
            <div className={styles.publishFormRow}>
              <div className={styles.publishFormLabel}>
                {publishType === "skill" ? "展示名称" : "Agent 名称"}{" "}
                <span className={styles.publishRequired}>*</span>
              </div>
              <Input value={publishForm.name} maxLength={200} placeholder={publishType === "skill" ? "Skill 展示名称" : "Agent 名称"} onChange={e => updatePublishForm({ name: e.target.value })} />
            </div>
            <div className={styles.publishFormRow}>
              <div className={styles.publishFormLabel}>
                版本号 <span className={styles.publishRequired}>*</span>
              </div>
              <Input value={publishForm.version} maxLength={64} placeholder="1.0.0" onChange={e => updatePublishForm({ version: e.target.value })} />
            </div>
            {publishType === "skill" ? (
              <div className={styles.publishFormRow}>
                <div className={styles.publishFormLabel}>分类</div>
                <Select value={publishForm.type} onChange={v => updatePublishForm({ type: v })} style={{ width: "100%" }} options={[{ value: "workflow", label: "Workflow 类" }, { value: "skill", label: "Skill 类" }, { value: "model", label: "模型类" }]} />
              </div>
            ) : (
              <div className={styles.publishFormRow}>
                <div className={styles.publishFormLabel}>框架类型</div>
                <Input value={selectedFramework ?? ws.framework} disabled />
              </div>
            )}
            <div className={styles.publishFormRow}>
              <div className={styles.publishFormLabel}>可见性</div>
              <Select value={publishForm.visibility} onChange={v => updatePublishForm({ visibility: v })} style={{ width: "100%" }} options={[{ value: "public", label: "公开" }, { value: "private", label: "仅自己" }, { value: "team", label: "团队" }]} />
            </div>
            <div className={styles.publishFormRow}>
              <div className={styles.publishFormLabel}>标签</div>
              <Input value={publishForm.tags} maxLength={200} placeholder="多个标签用逗号分隔" onChange={e => updatePublishForm({ tags: e.target.value })} />
            </div>
            <div className={styles.publishFormRow}>
              <div className={styles.publishFormLabel}>描述</div>
              <Input.TextArea value={publishForm.description} maxLength={4000} rows={3} showCount placeholder="请输入描述信息" onChange={e => updatePublishForm({ description: e.target.value })} />
            </div>
          </div>
          <div className={styles.publishFormSection}>
            <h4 className={styles.publishSectionTitle}>封面</h4>
            <div className={styles.publishCoverGrid}>
              {PUBLISH_COVERS.map(c => (
                <button key={c.key} type="button" className={classNames(styles.publishCoverItem, publishForm.cover === c.key && styles.publishCoverItemActive)} onClick={() => updatePublishForm({ cover: c.key })}>
                  <span className={styles.publishCoverSwatch} style={{ background: c.gradient }} />
                  <span className={styles.publishCoverLabel}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.publishFooter}>
            <Button onClick={() => setPublishType(null)}>上一步</Button>
            <Button type="primary" icon={<RocketOutlined />} onClick={handleSubmitPublish}>
              {publishType === "skill" ? "发布到 Skill 广场" : "发布到 Agent Store"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  /* ── 中间面板内容 ── */
  const renderCenterContent = () => {
    if (activeFlowTab === "publish") return renderPublishContent();
    if (activeFlowTab === "evolution") return renderEvoContent();
    if (activeFlowTab === "test") return renderTestContent();

    // 调研 & 开发共享对话布局
    const msgs = activeFlowTab === "research" ? researchMessages : devMessages;

    return (
      <div className={styles.chatBody} ref={chatBodyRef}>
        {msgs.length === 0 ? (
          <div className={styles.overviewCard}>
            <div className={styles.welcomeOrb} />
            <h3 className={styles.overviewTitle}>本工作空间概览</h3>
            <p className={styles.overviewText}>{ws.overviewText}</p>
          </div>
        ) : (
          msgs.map((msg, mi) => (
            <div key={mi} className={classNames(styles.msgRow, msg.role === "user" ? styles.msgRowUser : styles.msgRowAssistant)}>
              <div className={classNames(styles.msgBubble, msg.role === "user" ? styles.msgBubbleUser : styles.msgBubbleAssistant)}>
                {msg.blocks.map((b, bi) => renderBlock(b, bi))}
              </div>
            </div>
          ))
        )}
        {isStreaming && (
          <div className={styles.streamingIndicator}>
            <LoadingOutlined spin /> <span>思考中...</span>
          </div>
        )}
      </div>
    );
  };

  /* ── 是否显示输入框 ── */
  const showComposer = activeFlowTab !== "publish";

  /* ── 中间面板 ── */
  const centerPanel = (
    <div className={styles.centerPanel}>
      {/* 内容 */}
      {renderCenterContent()}

      {/* 底部：5 tab + 输入栏 */}
      <div className={styles.composerBar}>
        <div className={styles.flowTabs}>
          {(["research", "dev", "test", "evolution", "publish"] as FlowTab[]).map(tab => (
            <button
              key={tab}
              type="button"
              className={classNames(styles.flowTabBtn, activeFlowTab === tab && styles.flowTabBtnActive)}
              onClick={() => setActiveFlowTab(tab)}
            >
              {FLOW_TAB_LABELS[tab]}
            </button>
          ))}
          <div className={styles.flowTabRight}>
            <button type="button" className={styles.newDialogBtn}><PlusOutlined /> 新对话</button>
          </div>
        </div>
        {showComposer && (
          <div className={styles.composerInputWrapper}>
            {activeFlowTab === "evolution" && evoPhase === "idle" ? (
              <div className={styles.evoComposerBar}>
                <span className={styles.evoComposerHint}>选择回流数据源后点击“进化”</span>
                <Button type="primary" icon={<SendOutlined />} disabled={selectedEnterprises.size === 0 || evoPhase !== "idle"} onClick={handleClickEvolve}>进化</Button>
              </div>
            ) : (
              <>
                <Input.TextArea
                  value={inputValue}
                  placeholder={
                    activeFlowTab === "research" ? "描述你的任务或想法..."
                    : activeFlowTab === "dev" ? "描述你要开发的 Agent..."
                    : activeFlowTab === "test" ? (testReady ? "输入问题测试 Agent..." : "等待 runtime 启动...")
                    : "输入消息..."
                  }
                  autoSize={{ minRows: 1, maxRows: 5 }}
                  className={styles.composerTextarea}
                  disabled={activeFlowTab === "test" && !testReady}
                  onChange={e => setInputValue(e.target.value)}
                  onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <div className={styles.composerFooter}>
                  <div className={styles.composerActions}>
                    <button type="button" className={styles.composerIconBtn} title="附件"><PaperClipOutlined /></button>
                    <button type="button" className={styles.composerIconBtn} title="上传"><UploadOutlined /></button>
                    <button type="button" className={styles.modelSelector}>
                      <span className={styles.modelIcon}>C</span>
                      Claude Sonnet 4.6
                      <DownOutlined style={{ fontSize: 10 }} />
                    </button>
                  </div>
                  <div className={styles.composerRight}>
                    <button type="button" className={styles.micBtn} title="语音输入"><AudioOutlined /></button>
                    <button type="button" className={classNames(styles.sendBtn, isStreaming && styles.sendBtnDisabled)} title="发送" onClick={handleSend}>
                      <ArrowUpOutlined />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  /* ── 右侧资产中心 ── */
  const rightPanel = isRightPanelCollapsed ? (
    <aside className={styles.rightPanelCollapsed}>
      <button
        type="button"
        className={styles.rightPanelCollapsedBtn}
        aria-label="展开右侧面板"
        onClick={() => setIsRightPanelCollapsed(false)}
      >
        <MenuUnfoldOutlined />
        <span className={styles.rightPanelCollapsedText}>
          {rightTab === "files" ? "文件" : "成果"}
        </span>
      </button>
    </aside>
  ) : (
    <aside className={styles.rightPanel}>
      <div className={styles.rightHeader}>
        <FileTextOutlined />
        <span className={styles.rightTitle}>Agent资产中心</span>
        <span className={styles.rightCount}>{totalResults} 个生成结果</span>
        <button
          type="button"
          className={styles.rightToggleBtn}
          aria-label="收起右侧面板"
          onClick={() => setIsRightPanelCollapsed(true)}
        >
          <MenuFoldOutlined />
        </button>
      </div>

      <div className={styles.rightTabs}>
        <button type="button" className={classNames(styles.rightTabBtn, rightTab === "files" && styles.rightTabBtnActive)} onClick={() => setRightTab("files")}>
          Agent文件中心
        </button>
        <button type="button" className={classNames(styles.rightTabBtn, rightTab === "results" && styles.rightTabBtnActive)} onClick={() => setRightTab("results")}>
          其他成果
        </button>
      </div>

      <div className={styles.rightBody}>
        {rightTab === "files" ? (
          <div className={styles.assetSection}>
            {AGENT_FILES.slice(0, visibleFileCount).map(f => (
              <div key={f.key} className={styles.assetFileItem}>
                <span className={styles.assetFileIcon}>{f.icon}</span>
                <span className={styles.assetFileName}>{f.name}</span>
              </div>
            ))}
            {visibleFileCount === 0 && (
              <span className={styles.assetEmpty}>开发后自动生成</span>
            )}
          </div>
        ) : (
          <div className={styles.assetSection}>
            {ws.results.map(r => (
              <div key={r.id} className={styles.resultItem}>
                <DownOutlined className={styles.resultItemArrow} />
                <Checkbox className={styles.resultItemCheck} />
                <FileTextOutlined className={styles.resultItemIcon} />
                <div className={styles.resultItemMeta}>
                  <span className={styles.resultItemTitle}>{r.title}</span>
                  <span className={styles.resultItemSub}>{r.resultCount} 成果 上次对话: {r.lastDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );

  /* ── 详情页渲染 ── */
  return (
    <div className={styles.detailRoot}>
      <div className={styles.detailTopBar}>
        <button type="button" className={styles.detailBackBtn} onClick={handleBackToList}>
          <ArrowLeftOutlined />
        </button>
        <span className={styles.detailTopName}>{ws.name}</span>
      </div>
      <div className={styles.detailBody}>
        {leftPanel}
        {centerPanel}
        {rightPanel}
      </div>
    </div>
  );
};
