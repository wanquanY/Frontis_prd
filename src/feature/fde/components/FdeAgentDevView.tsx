import { useCallback, useRef, useEffect, useState, useMemo } from "react";

import classNames from "classnames";
import {
  ApiOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  AudioOutlined,
  BookOutlined,
  BranchesOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseOutlined,
  CloudServerOutlined,
  CodeOutlined,
  CopyOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FileMarkdownOutlined,
  FileTextOutlined,
  FireOutlined,
  FolderOutlined,
  GlobalOutlined,
  HistoryOutlined,
  KeyOutlined,
  LeftOutlined,
  LineChartOutlined,
  LinkOutlined,
  LoadingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  MoreOutlined,
  PaperClipOutlined,
  PlusOutlined,
  PushpinOutlined,
  RightOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  ShopOutlined,
  StarFilled,
  StarOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UploadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Dropdown, Input, Modal, Select, message } from "antd";
import type { MenuProps } from "antd";

import { useMockAuth } from "@/feature/auth/hooks/useMockAuth";
import { getMockTenantManagementSnapshot } from "@/feature/auth/mockTenantRegistry";
import {
  loadEnterpriseCommodityApplications,
  saveEnterpriseCommodityApplications,
} from "@/feature/fde/enterpriseCommodityApplications";
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
  flowTab?: FlowTab; // 标记消息所属的标签
}

interface AgentFile {
  key: string;
  name: string;
  icon: JSX.Element;
}

type FlowTab = "research" | "dev" | "test" | "evolution";
type LeftTab = "knowledge" | "dialogue";
type DevPhase = "idle" | "frameworkSelect" | "executing" | "completed";
type EvoPhase = "idle" | "suggestions" | "progress" | "lineage";
type EvoSidebarTab = "dataAnalysis" | "dataManagement" | "evolutionTrend";

interface FdeAgentDevViewProps {
  onNavigate?: (page: "agentStore", highlightAgentId?: string) => void;
}

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

/* ─── 工具详情步骤 ─── */

interface ToolDetailStep {
  name: string;
  total: number;
  tasks: { text: string; file?: string }[];
}

const TOOL_DETAIL_STEPS: ToolDetailStep[] = [
  {
    name: "TodoList 规划工具",
    total: 3,
    tasks: [
      { text: "设计并创建校对软件前端网页", file: "AGENT.md" },
      { text: "梳理 Skill 模块结构与接口", file: "soul.md" },
      { text: "生成 skill.md 核心能力说明", file: "skill.md" },
    ],
  },
  {
    name: "文件生成工具",
    total: 3,
    tasks: [
      { text: "初始化 runtime.yaml 运行时配置", file: "runtime.yaml" },
      { text: "注册 MCP 服务清单", file: "mcp-services.yaml" },
      { text: "搭建 tools/ 目录与入口", file: "tools/" },
    ],
  },
  {
    name: "打包发布工具",
    total: 2,
    tasks: [
      { text: "编写 Prompt 模板并归档", file: "prompts/" },
      { text: "生成测试用例骨架", file: "tests/" },
    ],
  },
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


const DATA_REVIEW_RECORDS = [
  { id: "R-1081", summary: "用户轮询词退货政策", source: "线上回流", stars: 5, toolRounds: 3, chatRounds: 5, tokens: 1250 },
  { id: "R-1082", summary: "查询物流详情或地址", source: "线上回流", stars: 4, toolRounds: 2, chatRounds: 4, tokens: 980 },
  { id: "R-1083", summary: "投诉商品质量问题", source: "人工标注", stars: 1, toolRounds: 5, chatRounds: 8, tokens: 2100 },
  { id: "R-1084", summary: "咨询会员权益详情", source: "线上回流", stars: 5, toolRounds: 1, chatRounds: 3, tokens: 720 },
];

/* ─── 版本演进树 Mock ─── */

const EVOLUTION_VERSIONS = [
  {
    name: "v3",
    desc: "",
    status: "已进化，待发布",
    time: "2026-02-20",
    isCurrent: true,
    metrics: [
      { label: "Skill触发准确率", value: "91%", trend: "↑13%" },
      { label: "任务完成行为率", value: "89%", trend: "↑18%" },
      { label: "结果质量评分", value: "87%", trend: "↑15%" },
      { label: "执行耗时", value: "128ms", trend: "↓39%" },
      { label: "Token消耗量", value: "1240", trend: "↓22%" },
      { label: "回归基准保持率", value: "96%", trend: "↑12%" },
    ]
  },
  {
    name: "v2",
    desc: "优化推理逻辑 + 工具调用",
    status: "4轮次",
    time: "",
    isCurrent: false,
    metrics: [
      { label: "Skill触发准确率", value: "78%", trend: "↑8%" },
      { label: "任务完成行为率", value: "71%", trend: "↑12%" },
      { label: "结果质量评分", value: "72%", trend: "↑9%" },
      { label: "执行耗时", value: "210ms", trend: "↓15%" },
      { label: "Token消耗量", value: "1590", trend: "↓8%" },
      { label: "回归基准保持率", value: "84%", trend: "↑6%" },
    ]
  },
  {
    name: "v1",
    desc: "初始版本 - 基线模型",
    status: "5轮次",
    time: "",
    isCurrent: false,
    metrics: [
      { label: "Skill触发准确率", value: "70%", trend: "-" },
      { label: "任务完成行为率", value: "59%", trend: "-" },
      { label: "结果质量评分", value: "63%", trend: "-" },
      { label: "执行耗时", value: "247ms", trend: "-" },
      { label: "Token消耗量", value: "1726", trend: "-" },
      { label: "回归基准保持率", value: "78%", trend: "-" },
    ]
  },
];

const EVOLUTION_METRICS = [
  { label: "Skill触发准确率", value: "91%", trend: "↑13%" },
  { label: "任务完成行为率", value: "89%", trend: "↑18%" },
  { label: "结果质量评分", value: "87%", trend: "↑15%" },
  { label: "执行耗时", value: "128ms", trend: "↓39%" },
  { label: "Token消耗量", value: "1240", trend: "↓22%" },
  { label: "回归基准保持率", value: "96%", trend: "↑12%" },
];

/* ─── 评测报告 Mock ─── */

const REPORT_METRICS = [
  { label: "Skill触发准确率", value: "91%", trend: "↑13%", percent: 91 },
  { label: "任务完成行为率", value: "89%", trend: "↑18%", percent: 89 },
  { label: "结果质量评分", value: "87%", trend: "↑15%", percent: 87 },
  { label: "执行耗时", value: "128ms", trend: "↓39%", percent: 72 },
  { label: "Token消耗量", value: "1240", trend: "↓22%", percent: 68 },
  { label: "回归基准保持率", value: "96%", trend: "↑12%", percent: 96 },
];

const REPORT_TEST_DETAILS = [
  { label: "测试时间", value: "2026-02-20 14:30" },
  { label: "测试轮次", value: "6轮次" },
  { label: "测试场景", value: "电商客服、物流查询、会员权益、售后服务" },
];

const REPORT_ISSUES = [
  { type: "issue", text: "复杂多轮对话场景下工具调用成功率仍有提升空间" },
  { type: "suggestion", text: "优化工具调用参数验证逻辑，增加错误重试机制" },
];

/* ─── 工作流拓扑节点 ─── */

const WORKFLOW_NODES = [
  { label: "用户\n输入", x: 20, y: 15, color: "#22c55e" },
  { label: "意图\n识别", x: 50, y: 15, color: "#22c55e" },
  { label: "参数\n提取", x: 80, y: 15, color: "#22c55e" },
  { label: "订单\n查询", x: 30, y: 48, color: "#f97316" },
  { label: "商品\n推荐", x: 70, y: 48, color: "#22c55e" },
  { label: "CRM\n写入", x: 30, y: 75, color: "#ef4444" },
  { label: "数据\n格式化", x: 70, y: 75, color: "#ef4444" },
  { label: "结果\n返回", x: 50, y: 92, color: "#22c55e" },
];

const WORKFLOW_EDGES = [[0,1],[1,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,7]];

const FAILED_NODES = [
  { name: "CRM写入", count: 577, rate: "15.6%", reason: "连接超时", severity: "high" },
  { name: "订单查询", count: 884, rate: "23.9%", reason: "接口超时", severity: "high" },
  { name: "数据格式化", count: 233, rate: "8.0%", reason: "格式异常", severity: "high" },
  { name: "参数提取", count: 482, rate: "3.8%", reason: "参数缺失", severity: "medium" },
  { name: "意图识别", count: 193, rate: "1.5%", reason: "模型超时", severity: "medium" },
];

const DETAIL_METRICS = [
  { label: "Skill触发准确率", value: "91%", change: "+13%", percent: 91 },
  { label: "边界测试覆盖率", value: "3.2%", change: "+2.8%", percent: 3.2 },
  { label: "任务完成行为率", value: "89%", change: "+18%", percent: 89 },
  { label: "工具调用成功率", value: "94.5%", change: "+8.8%", percent: 94.5 },
  { label: "结果质量评分", value: "87%", change: "+15%", percent: 87 },
  { label: "用户满意度", value: "4.3/5.0", change: "+0.5", percent: 86 },
  { label: "执行耗时", value: "128ms", change: "-88ms", percent: 40 },
  { label: "Token消耗量", value: "1240", change: "-330", percent: 60 },
  { label: "回归基准保持率", value: "96%", change: "+12%", percent: 96 },
  { label: "进化成功率", value: "88%", change: "+10%", percent: 88 },
  { label: "问题解决率", value: "82%", change: "+15%", percent: 82 },
  { label: "变更影响半径", value: "2.3", change: "-0.8", percent: 46 },
];

/* ─── 部署配置 ─── */

type DeployPage = "config" | "progress" | "store";
type PublishPage = "form" | "assetLibrary" | "commodity" | null;

const DEPLOY_CONFIG_ITEMS: { icon: JSX.Element; iconBg: string; title: string; subtitle?: string; trailing?: "chevron" | "checkbox" }[] = [
  { icon: <GlobalOutlined />, iconBg: "var(--deploy-icon-blue)", title: "部署域名" },
  { icon: <ClockCircleOutlined />, iconBg: "var(--deploy-icon-gray)", title: "服务时长", subtitle: "选择服务运行时间" },
  { icon: <ExperimentOutlined />, iconBg: "var(--deploy-icon-purple)", title: "LLM 模型", subtitle: "部署时使用的大语言模型" },
  { icon: <SettingOutlined />, iconBg: "var(--deploy-icon-gray)", title: "环境变量", subtitle: "配置生产环境变量", trailing: "chevron" },
  { icon: <SafetyCertificateOutlined />, iconBg: "var(--deploy-icon-gray)", title: "沙箱配置", subtitle: "自定义容器资源配置", trailing: "chevron" },
  { icon: <FireOutlined />, iconBg: "var(--deploy-icon-orange)", title: "Pod 预热", subtitle: "提前创建Pod，加速首次响应", trailing: "chevron" },
  { icon: <CopyOutlined />, iconBg: "var(--deploy-icon-gray)", title: "复刻部署", subtitle: "创建独立副本，不影响原有服务", trailing: "checkbox" },
];

const DEPLOY_PROGRESS_STEPS = ["准备部署包", "上传应用", "配置服务", "启动服务", "验证部署"];

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

interface CommodityApplicationFormState {
  proposedProductName: string;
  reason: string;
  targetCustomers: string;
  notes: string;
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

const DEFAULT_COMMODITY_APPLICATION_FORM: CommodityApplicationFormState = {
  proposedProductName: "",
  reason: "",
  targetCustomers: "",
  notes: "",
};

const formatCurrentTimestamp = (): string => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = `${currentDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${currentDate.getDate()}`.padStart(2, "0");
  const hours = `${currentDate.getHours()}`.padStart(2, "0");
  const minutes = `${currentDate.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
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

export const FdeAgentDevView = ({ onNavigate }: FdeAgentDevViewProps = {}): JSX.Element => {
  const { activeIdentity, session } = useMockAuth();
  const tenantSnapshot = useMemo(
    () => getMockTenantManagementSnapshot(activeIdentity?.tenantId),
    [activeIdentity?.tenantId],
  );
  const currentTenantName = activeIdentity?.tenantName ?? "当前企业租户";
  const currentUserName = activeIdentity?.subjectName ?? session?.name ?? "当前用户";
  const hasAgentListingAccess = Boolean(tenantSnapshot?.hasAgentListingAccess);

  /* ── 顶层页面状态 ── */
  const [page, setPage] = useState<"list" | "detail">("list");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");

  /* ── 新建工作空间对话框状态 ── */
  const [isNewWorkspaceModalOpen, setIsNewWorkspaceModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");
  const [newWorkspaceFramework, setNewWorkspaceFramework] = useState<FdeAgentFramework | "">("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  /* ── 工作空间列表状态（支持动态添加） ── */
  const [customWorkspaces, setCustomWorkspaces] = useState<FdeAgentWorkspace[]>([]);

  const allWorkspaces = useMemo<FdeAgentWorkspace[]>(
    () => [...FDE_AGENT_WORKSPACES, ...customWorkspaces],
    [customWorkspaces],
  );

  const selectedWorkspace = useMemo<FdeAgentWorkspace | null>(
    () => {
      const ws = allWorkspaces.find(w => w.id === selectedWorkspaceId);
      return ws ?? null;
    },
    [selectedWorkspaceId, allWorkspaces],
  );

  /* ── 左侧面板 ── */
  const [leftTab, setLeftTab] = useState<LeftTab>("dialogue");
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);

  /* ── 右侧面板 ── */
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"agentFiles" | "otherResults">("agentFiles");
  const [otherResultsSubTab, setOtherResultsSubTab] = useState<"output" | "upload" | "web" | "api">("output");
  const [evoSidebarTab, setEvoSidebarTab] = useState<EvoSidebarTab>("evolutionTrend");
  const [reportVersion, setReportVersion] = useState<string | null>(null);
  const [deployPage, setDeployPage] = useState<DeployPage | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("v3");
  const [deployProgressDone, setDeployProgressDone] = useState(0);
  const [deployDuration, setDeployDuration] = useState("1天");
  const [deployModel, setDeployModel] = useState("Claude Sonnet 4.6 线路1");
  const [showToolDetails, setShowToolDetails] = useState(false);
  const [toolDetailStep, setToolDetailStep] = useState(-1); // -1 = auto 跟随进度
  const [publishPage, setPublishPage] = useState<PublishPage>(null);

  /* ── 文件上传 ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      message.success(`已选择 ${files.length} 个文件`);
      // 这里可以添加实际的文件处理逻辑
    }
    // 重置input以便可以再次选择同一文件
    e.target.value = "";
  }, []);

  /* ── 对话列表面板 ── */
  const [newConversations, setNewConversations] = useState<{ id: string; title: string; summary: string; date: string }[]>([]);
  const [deletedConvIds, setDeletedConvIds] = useState<Set<string>>(new Set());
  const [pinnedConvIds, setPinnedConvIds] = useState<Set<string>>(new Set());
  const [collectedConvIds, setCollectedConvIds] = useState<Set<string>>(new Set());
  const [renamedConvs, setRenamedConvs] = useState<Record<string, string>>({});
  const [editingConvId, setEditingConvId] = useState<string | null>(null);

  const handleNewChat = () => {
    const newId = `conv-new-${Date.now()}`;
    setNewConversations(prev => [
      {
        id: newId,
        title: "新对话",
        summary: "这是新创建的空白对话...",
        date: "刚刚"
      },
      ...prev
    ]);

    // 重置到初始状态：清空所有消息，显示工作空间概览
    setActiveFlowTab("research");
    setAllMessages([]);
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
    setInputValue("");

    // 重置侧边栏状态
    setShowToolDetails(false);
    setDeployPage(null);
    setPublishPage(null);
    setCommodityApplicationForm(DEFAULT_COMMODITY_APPLICATION_FORM);
    setCommodityApplicationSuccess(false);
    setIsRightPanelCollapsed(true); // 默认关闭右侧成果面板
  };

  const getConvMenuItems = (convId: string): MenuProps['items'] => {
    const isPinned = pinnedConvIds.has(convId);
    const isCollected = collectedConvIds.has(convId);
    return [
      { key: 'pin', icon: <PushpinOutlined />, label: isPinned ? '取消置顶' : '置顶', onClick: () => {
        setPinnedConvIds(prev => {
          const next = new Set(prev);
          if (next.has(convId)) next.delete(convId);
          else next.add(convId);
          return next;
        });
      } },
      { key: 'rename', icon: <EditOutlined />, label: '重命名', onClick: () => {
        setEditingConvId(convId);
      } },
      { key: 'collect', icon: <StarOutlined />, label: isCollected ? '取消收藏' : '收藏', onClick: () => {
        setCollectedConvIds(prev => {
          const next = new Set(prev);
          if (next.has(convId)) next.delete(convId);
          else next.add(convId);
          return next;
        });
      } },
      { type: 'divider' },
      { key: 'delete', icon: <DeleteOutlined />, label: <span style={{ color: '#ff4d4f' }}>删除</span>, onClick: () => {
        setDeletedConvIds(prev => {
          const next = new Set(prev);
          next.add(convId);
          return next;
        });
        message.success('对话已删除');
      } },
    ];
  };

  const handleRenameSave = (convId: string, newTitle: string) => {
    if (newTitle.trim()) {
      setRenamedConvs(prev => ({ ...prev, [convId]: newTitle.trim() }));
    }
    setEditingConvId(null);
  };

  /* ── 中间对话面板 ── */
  const [activeFlowTab, setActiveFlowTab] = useState<FlowTab>("research");

  // 统一的消息历史（包含所有标签的消息）
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);

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
  const [commodityApplicationForm, setCommodityApplicationForm] =
    useState<CommodityApplicationFormState>(DEFAULT_COMMODITY_APPLICATION_FORM);
  const [commodityApplicationSuccess, setCommodityApplicationSuccess] =
    useState(false);

  const chatBodyRef = useRef<HTMLDivElement>(null);
  const lineageCanvasRef = useRef<HTMLCanvasElement>(null);
  const trendCanvasRef = useRef<HTMLCanvasElement>(null);
  const lineageAnimRef = useRef<number>(0);

  // 缩放
  const [topoZoom, setTopoZoom] = useState(1);
  const [lineageZoom, setLineageZoom] = useState(1);
  const [sidebarTopoZoom, setSidebarTopoZoom] = useState(1);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  /* ── 当前 tab 的消息 ── */
  const currentMessages = useMemo(() => {
    // 返回所有消息，不再按标签过滤
    return allMessages;
  }, [allMessages]);

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
      const newMsg = { role: "assistant" as const, blocks: [], flowTab: "dev" as FlowTab };
      setDevMessages(prev => [...prev, newMsg]);
      setAllMessages(prev => [...prev, newMsg]);
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
        setAllMessages(prev => {
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

  // 只在新消息添加时自动滚动到底部，切换标签时不滚动
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    if (currentMessages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = currentMessages.length;
  }, [currentMessages, scrollToBottom]);

  /* ── 测试 runtime 写入动画 ── */
  useEffect(() => {
    if (activeFlowTab !== "test" || !testStarted || testReady) return;
    if (testFileIdx >= AGENT_FILES.length) {
      setTestReady(true);
      // 自动发送测试用例
      setTimeout(() => {
        const autoMsg: ChatMessage = { role: "user", blocks: [{ type: "text", content: "请帮我转录一段录音文件，格式为 mp3，大约 3 分钟。" }], flowTab: "test" };
        const reply = TEST_MOCK_REPLIES[0];
        const assistantMsg: ChatMessage = { role: "assistant", blocks: [{ type: "text", content: reply }], flowTab: "test" };
        setTestMessages(prev => [...prev, autoMsg, assistantMsg]);
        setAllMessages(prev => [...prev, autoMsg, assistantMsg]);
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

  /* ── 部署进度动画 ── */
  useEffect(() => {
    if (deployPage !== "progress") return;
    if (deployProgressDone >= DEPLOY_PROGRESS_STEPS.length) {
      const timer = setTimeout(() => setDeployPage("store"), 600);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setDeployProgressDone(prev => prev + 1), 1200);
    return () => clearTimeout(timer);
  }, [deployPage, deployProgressDone]);

  /* ── 血缘关系图 Canvas 绘制（动画版） ── */
  useEffect(() => {
    if (evoSidebarTab !== "dataManagement" || isRightPanelCollapsed || activeFlowTab !== "evolution") {
      cancelAnimationFrame(lineageAnimRef.current);
      return;
    }
    const canvas = lineageCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const nodes = [
      { label: "Agent V1.0", type: "agent", x: 0.15, y: 0.30, r: 28, partial: true },
      { label: "Agent V1.1", type: "agent", x: 0.25, y: 0.55, r: 32 },
      { label: "Data D-002", type: "data", x: 0.35, y: 0.25, r: 24 },
      { label: "Data D-003", type: "data", x: 0.45, y: 0.65, r: 24 },
      { label: "Data D-001", type: "data", x: 0.55, y: 0.35, r: 24 },
      { label: "Agent V2.0", type: "agent", x: 0.65, y: 0.50, r: 32 },
      { label: "Agent V2.1.1", type: "agent", x: 0.75, y: 0.25, r: 34 },
      { label: "Agent V2.1", type: "agent", x: 0.85, y: 0.65, r: 34 },
    ];
    const edges: [number, number][] = [[1,2],[2,3],[1,4],[4,5],[5,6],[5,7],[3,5]];
    let startTime = 0;

    const draw = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000; // seconds
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Animated dashed edges
      const dashOffset = elapsed * 20;
      edges.forEach(([a, b]) => {
        const na = nodes[a], nb = nodes[b];
        const x1 = na.x * w, y1 = na.y * h, x2 = nb.x * w, y2 = nb.y * h;
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -dashOffset;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // Label
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "center";
        ctx.fillText("继承", (x1 + x2) / 2, (y1 + y2) / 2 - 6);
      });
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      // Draw nodes with breathing glow
      nodes.forEach((n, i) => {
        const cx = n.x * w, cy = n.y * h;
        const breathe = 1 + Math.sin(elapsed * 1.5 + i * 0.8) * 0.06;
        const glowAlpha = 0.15 + Math.sin(elapsed * 2 + i) * 0.1;
        const r = n.r * breathe;

        if (n.type === "agent") {
          // Outer glow
          const grad = ctx.createRadialGradient(cx, cy, r, cx, cy, r + 10);
          grad.addColorStop(0, `rgba(34, 211, 238, ${glowAlpha})`);
          grad.addColorStop(1, "rgba(34, 211, 238, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
          ctx.fill();

          if (n.partial) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0.3 * Math.PI + elapsed * 0.5, 1.8 * Math.PI + elapsed * 0.5);
            ctx.strokeStyle = "#22d3ee";
            ctx.lineWidth = 3;
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = "#22d3ee";
            ctx.fill();
          }
        } else {
          // Data node glow
          const grad = ctx.createRadialGradient(cx, cy, r, cx, cy, r + 8);
          grad.addColorStop(0, `rgba(251, 146, 60, ${glowAlpha})`);
          grad.addColorStop(1, "rgba(251, 146, 60, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#fb923c";
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        }
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.label, cx, cy);
      });

      lineageAnimRef.current = requestAnimationFrame(draw);
    };
    lineageAnimRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(lineageAnimRef.current);
  }, [evoSidebarTab, isRightPanelCollapsed, activeFlowTab]);

  /* ── 版本演进趋势折线图 Canvas 绘制 ── */
  useEffect(() => {
    if (evoSidebarTab !== "evolutionTrend" || isRightPanelCollapsed || activeFlowTab !== "evolution" || reportVersion) return;
    const canvas = trendCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const versions = ["v1", "v2", "v3"];
    const datasets = [
      { label: "Skill触发准确率", data: [78, 86, 91], color: "#3b82f6" },
      { label: "任务完成行为率", data: [72, 82, 89], color: "#a855f7" },
      { label: "结果质量评分", data: [75, 83, 87], color: "#10b981" },
    ];
    const padL = 36, padR = 12, padT = 12, padB = 28;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const yMin = 60, yMax = 100;

    // Y axis grid
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let v = yMin; v <= yMax; v += 10) {
      const y = padT + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillText(String(v), padL - 6, y);
    }

    // X axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    versions.forEach((label, i) => {
      const x = padL + (i / (versions.length - 1)) * chartW;
      ctx.fillText(label, x, padT + chartH + 8);
    });

    // Lines + dots
    datasets.forEach(ds => {
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ds.data.forEach((val, i) => {
        const x = padL + (i / (versions.length - 1)) * chartW;
        const y = padT + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Fill area
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = ds.color;
      ctx.beginPath();
      ds.data.forEach((val, i) => {
        const x = padL + (i / (versions.length - 1)) * chartW;
        const y = padT + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.lineTo(padL + chartW, padT + chartH);
      ctx.lineTo(padL, padT + chartH);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Dots
      ds.data.forEach((val, i) => {
        const x = padL + (i / (versions.length - 1)) * chartW;
        const y = padT + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ds.color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }, [evoSidebarTab, isRightPanelCollapsed, activeFlowTab, reportVersion]);

  /* ── 进入工作空间详情 ── */
  const handleOpenWorkspace = useCallback((ws: FdeAgentWorkspace) => {
    setSelectedWorkspaceId(ws.id);
    setPage("detail");
    setActiveFlowTab("research");
    setLeftTab("dialogue");
    setShowFeedbackPanel(false);
    setAllMessages([]);
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
    setCommodityApplicationForm(DEFAULT_COMMODITY_APPLICATION_FORM);
    setCommodityApplicationSuccess(false);
    setReportVersion(null);
    setDeployPage(null);
    setDeployProgressDone(0);
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
  }, []);

  /* ── 新建工作空间 ── */
  const handleOpenNewWorkspaceModal = useCallback(() => {
    setNewWorkspaceName("");
    setNewWorkspaceDescription("");
    setNewWorkspaceFramework("");
    setIsNewWorkspaceModalOpen(true);
  }, []);

  const handleCloseNewWorkspaceModal = useCallback(() => {
    setIsNewWorkspaceModalOpen(false);
  }, []);

  const handleCreateWorkspace = useCallback(async () => {
    if (!newWorkspaceName.trim()) {
      message.warning("请输入工作空间名称");
      return;
    }
    // 框架选择改为可选，不再强制要求
    // if (!newWorkspaceFramework) {
    //   message.warning("请选择 Agent 框架");
    //   return;
    // }

    setIsCreatingWorkspace(true);

    // 生成新工作空间 ID
    const newId = `ws-custom-${Date.now()}`;

    // 框架对应的默认技能
    const frameworkSkills: Record<string, { name: string; version: string }[]> = {
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

    const iconTexts: Record<string, string> = {
      MetaAgent: "智",
      Syngent: "协",
      OpenClaw: "数",
    };

    const iconColors: Record<string, string> = {
      MetaAgent: "#667eea",
      Syngent: "#11998e",
      OpenClaw: "#a855f7",
    };

    const newWorkspace: FdeAgentWorkspace = {
      id: newId,
      name: newWorkspaceName.trim(),
      description: newWorkspaceDescription.trim() || (newWorkspaceFramework ? `基于 ${newWorkspaceFramework} 框架创建的智能 Agent` : "新创建的智能 Agent 工作空间"),
      iconColor: (newWorkspaceFramework && iconColors[newWorkspaceFramework]) || "#667eea",
      iconText: (newWorkspaceFramework && iconTexts[newWorkspaceFramework]) || "A",
      framework: (newWorkspaceFramework as FdeAgentFramework) || "MetaAgent",
      skillCount: (newWorkspaceFramework && frameworkSkills[newWorkspaceFramework]?.length) || 0,
      skills: (newWorkspaceFramework && frameworkSkills[newWorkspaceFramework]) || [],
      createdAt: new Date().toISOString().split("T")[0],
      fileCount: 0,
      overviewText: "新创建的工作空间，暂无文件。",
      conversations: [],
      knowledgeBases: [],
      feedbackData: [],
      results: [],
    };

    // 添加到自定义列表
    setCustomWorkspaces(prev => [...prev, newWorkspace]);

    setIsCreatingWorkspace(false);
    setIsNewWorkspaceModalOpen(false);
    message.success("工作空间已创建");

    // 自动打开新建的工作空间
    setSelectedWorkspaceId(newId);
    setPage("detail");
  }, [newWorkspaceName, newWorkspaceDescription, newWorkspaceFramework]);

  /* ── 调研发送 ── */
  const handleResearchSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    const userMsg: ChatMessage = { role: "user", blocks: [{ type: "text", content: text }], flowTab: "research" };
    const assistantMsg: ChatMessage = {
      role: "assistant",
      blocks: [{ type: "text", content: researchReplyIdx.current === 0 ? RESEARCH_MOCK_REPLY : "好的，我已更新方案。请查看右侧成果面板中的最新设计方案。" }],
      flowTab: "research"
    };
    researchReplyIdx.current += 1;
    setResearchMessages(prev => [...prev, userMsg, assistantMsg]);
    setAllMessages(prev => [...prev, userMsg, assistantMsg]);
    setInputValue("");
  }, [inputValue]);

  /* ── 开发框架选择 ── */
  const handleSelectFramework = useCallback((fw: string) => {
    setSelectedFramework(fw);
    const userChoice: ChatMessage = { role: "user", blocks: [{ type: "text", content: `使用 ${fw} 框架` }], flowTab: "dev" };
    const startMsg: ChatMessage = {
      role: "assistant",
      blocks: [{ type: "text", content: `好的，已选择 **${fw}** 框架。现在开始为你创建 Agent，请稍候...` }],
      flowTab: "dev"
    };
    setDevMessages(prev => [...prev, userChoice, startMsg]);
    setAllMessages(prev => [...prev, userChoice, startMsg]);
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
      const userMsg: ChatMessage = { role: "user", blocks: [{ type: "text", content: text }], flowTab: "dev" };
      const assistantMsg: ChatMessage = {
        role: "assistant",
        blocks: [
          { type: "text", content: "好的，在开始开发之前，请先选择你要采用的 Agent 框架：" },
          { type: "frameworkSelect" },
        ],
        flowTab: "dev"
      };
      setDevMessages(prev => [...prev, userMsg, assistantMsg]);
      setAllMessages(prev => [...prev, userMsg, assistantMsg]);
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
    const userMsg: ChatMessage = { role: "user", blocks: [{ type: "text", content: text }], flowTab: "test" };
    testReplyIdx.current += 1;
    const reply = TEST_MOCK_REPLIES[testReplyIdx.current % TEST_MOCK_REPLIES.length];
    const assistantMsg: ChatMessage = { role: "assistant", blocks: [{ type: "text", content: reply }], flowTab: "test" };
    setTestMessages(prev => [...prev, userMsg, assistantMsg]);
    setAllMessages(prev => [...prev, userMsg, assistantMsg]);
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
    const systemMsg: ChatMessage = {
      role: "system",
      blocks: [{ type: "text", content: `已选择 ${selectedEnterprises.size} 个企业客户的回流数据。分析完成，以下是进化建议：` }],
      flowTab: "evolution"
    };
    setEvoMessages([systemMsg]);
    setAllMessages(prev => [...prev, systemMsg]);
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
        : `AI专家「${publishForm.name}」已成功发布到 AI专家广场`,
    );
  }, [publishType, publishForm.name]);

  const updatePublishForm = useCallback((patch: Partial<PublishFormState>) => {
    setPublishForm(prev => ({ ...prev, ...patch }));
  }, []);

  const updateCommodityApplicationForm = useCallback(
    (patch: Partial<CommodityApplicationFormState>) => {
      setCommodityApplicationForm(prev => ({ ...prev, ...patch }));
    },
    [],
  );

  const handleOpenAgentPublishPanel = useCallback(() => {
    setPublishPage("form");
    setPublishType("agent");
    setPublishSuccess(false);
    setCommodityApplicationSuccess(false);
    setPublishForm(prev => ({
      ...prev,
      name: prev.name || selectedWorkspace?.name || "未命名 AI专家",
      visibility: "public",
    }));
    setIsRightPanelCollapsed(false);
  }, [selectedWorkspace?.name]);

  const handleOpenCommodityApplicationPanel = useCallback(() => {
    if (!hasAgentListingAccess) {
      message.warning("当前租户未开通 AI专家上架服务，可继续开发和企业内使用，暂不能提交上架申请。");
      return;
    }

    const agentName = publishForm.name.trim() || selectedWorkspace?.name || "未命名 AI专家";

    setPublishPage("commodity");
    setPublishType("agent");
    setPublishSuccess(false);
    setCommodityApplicationSuccess(false);
    setCommodityApplicationForm(currentForm => ({
      ...currentForm,
      proposedProductName:
        currentForm.proposedProductName.trim() || `${agentName} 标准版`,
    }));
    setIsRightPanelCollapsed(false);
  }, [hasAgentListingAccess, publishForm.name, selectedWorkspace?.name]);

  const handleSubmitCommodityApplication = useCallback(() => {
    if (!hasAgentListingAccess) {
      message.warning("当前租户未开通 AI专家上架服务，可继续开发和企业内使用，暂不能提交上架申请。");
      return;
    }

    const agentName = publishForm.name.trim() || selectedWorkspace?.name || "未命名 AI专家";
    const proposedProductName = commodityApplicationForm.proposedProductName.trim();
    const submitReason = commodityApplicationForm.reason.trim();

    if (!proposedProductName) {
      message.warning("请填写拟上架商品名");
      return;
    }

    if (!submitReason) {
      message.warning("请填写申请理由");
      return;
    }

    const nextSubmission = {
      id: `ops-agent-submission-${Date.now()}`,
      name: agentName,
      version: publishForm.version.trim() || selectedVersion,
      submitter: `${currentUserName} - ${currentTenantName}`,
      submittedAt: formatCurrentTimestamp(),
      status: "pending" as const,
      submissionType: "commodityApplication" as const,
      proposedProductName,
      submitReason,
      targetCustomers: commodityApplicationForm.targetCustomers.trim() || undefined,
      currentScopeLabel: "已发布到 AI专家广场",
      description:
        commodityApplicationForm.notes.trim() ||
        "该 AI专家已发布到 AI专家广场，当前按企业内权限范围可见可用。上架申请审核通过后，可进一步扩大到更多租户可见。",
    };
    const currentApplications = loadEnterpriseCommodityApplications();

    saveEnterpriseCommodityApplications([nextSubmission, ...currentApplications]);
    setCommodityApplicationSuccess(true);
    message.success(`已提交「${agentName}」的上架申请`);
  }, [
    commodityApplicationForm.notes,
    commodityApplicationForm.proposedProductName,
    commodityApplicationForm.reason,
    commodityApplicationForm.targetCustomers,
    currentTenantName,
    currentUserName,
    hasAgentListingAccess,
    publishForm.name,
    publishForm.version,
    selectedVersion,
    selectedWorkspace?.name,
  ]);

  /* ── 切换流程标签时带入上下文 ── */
  const handleFlowTabChange = useCallback((tab: FlowTab) => {
    setActiveFlowTab(tab);

    // 根据不同标签生成上下文提示消息
    let contextMessage = "";

    switch (tab) {
      case "research":
        if (devMessages.length > 0 || testMessages.length > 0 || evoMessages.length > 0) {
          contextMessage = "已为你加载开发、测试和进化阶段的上下文信息。你可以基于这些内容继续调研和优化方案。";
        }
        break;
      case "dev":
        if (researchMessages.length > 0) {
          contextMessage = "已为你加载调研阶段的方案设计。现在可以开始开发实现。";
        }
        break;
      case "test":
        if (devMessages.length > 0) {
          contextMessage = "已为你加载开发阶段的 Agent 配置。现在可以开始测试。";
        }
        break;
      case "evolution":
        if (researchMessages.length > 0 || devMessages.length > 0 || testMessages.length > 0) {
          contextMessage = "已为你加载调研、开发和测试阶段的数据。选择回流数据源后可以开始进化分析。";
        }
        break;
    }

    // 如果有上下文消息，显示提示
    if (contextMessage) {
      message.info(contextMessage, 3);
    }
  }, [researchMessages.length, devMessages.length, testMessages.length, evoMessages.length]);
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
      ? allWorkspaces.filter(w => w.name.includes(searchKeyword.trim()) || w.description.includes(searchKeyword.trim()))
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
          <Button type="primary" icon={<PlusOutlined />} className={styles.listNewBtn} onClick={handleOpenNewWorkspaceModal}>新建工作空间</Button>
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

        {/* 新建工作空间对话框 */}
        <Modal
          title="新建 Agent 工作空间"
          open={isNewWorkspaceModalOpen}
          onCancel={handleCloseNewWorkspaceModal}
          onOk={handleCreateWorkspace}
          confirmLoading={isCreatingWorkspace}
          okText="创建"
          cancelText="取消"
          width={520}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>工作空间名称</label>
              <Input
                value={newWorkspaceName}
                onChange={e => setNewWorkspaceName(e.target.value)}
                placeholder="请输入工作空间名称"
                size="large"
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>工作空间描述</label>
              <Input.TextArea
                value={newWorkspaceDescription}
                onChange={e => setNewWorkspaceDescription(e.target.value)}
                placeholder="请输入工作空间描述（可选）"
                size="large"
                rows={3}
                showCount
                maxLength={200}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                选择 Agent 框架
                <span style={{
                  marginLeft: 8,
                  padding: "2px 8px",
                  fontSize: 12,
                  color: "#64748b",
                  background: "#f1f5f9",
                  borderRadius: 4,
                  fontWeight: 400
                }}>可选</span>
              </label>
              <Select
                value={newWorkspaceFramework || undefined}
                onChange={setNewWorkspaceFramework}
                placeholder="请选择 Agent 框架"
                size="large"
                style={{ width: "100%" }}
                options={[
                  { value: "MetaAgent", label: "MetaAgent", description: "面向电商和 SaaS 企业的全渠道智能客服 Agent" },
                  { value: "Syngent", label: "Syngent", description: "供应链全链路协同 Agent" },
                  { value: "OpenClaw", label: "OpenClaw", description: "企业级数据分析 Agent" },
                ]}
                optionRender={(option) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{option.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{option.data.description}</div>
                  </div>
                )}
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
          <button type="button" className={styles.newChatBtn} onClick={handleNewChat}><PlusOutlined /> 新建对话</button>
          <div className={styles.convList}>
            {[...newConversations, ...ws.conversations]
              .filter(conv => !deletedConvIds.has(conv.id))
              .sort((a, b) => {
                const aPinned = pinnedConvIds.has(a.id);
                const bPinned = pinnedConvIds.has(b.id);
                if (aPinned && !bPinned) return -1;
                if (!aPinned && bPinned) return 1;
                return 0;
              })
              .map(conv => {
                const isPinned = pinnedConvIds.has(conv.id);
                const isCollected = collectedConvIds.has(conv.id);
                const title = renamedConvs[conv.id] || conv.title;
                const isEditing = editingConvId === conv.id;

                return (
                  <div key={conv.id} className={styles.convItemWrapper}>
                    <button type="button" className={styles.convItem}>
                      <div className={styles.convTitleRow}>
                        {isEditing ? (
                          <Input
                            autoFocus
                            defaultValue={title}
                            size="small"
                            className={styles.convRenameInput}
                            onPressEnter={e => handleRenameSave(conv.id, e.currentTarget.value)}
                            onBlur={e => handleRenameSave(conv.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className={styles.convTitle}>
                            {isPinned && <PushpinOutlined className={styles.convIcon} />}
                            {isCollected && <StarFilled className={styles.convIconStar} />}
                            {title}
                          </span>
                        )}
                      </div>
                      <span className={styles.convDate}>{conv.date}</span>
                      <span className={styles.convSummary}>{conv.summary}</span>
                    </button>
                    <Dropdown menu={{ items: getConvMenuItems(conv.id) }} trigger={['click']} placement="bottomRight">
                      <button type="button" className={styles.convMoreBtn} onClick={e => e.stopPropagation()}>
                        <MoreOutlined />
                      </button>
                    </Dropdown>
                  </div>
                );
            })}
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

          {/* 核心评估指标 + 工作流拓扑分析 */}
          <div className={styles.evoDarkCardsRow}>
            {/* 核心评估指标 */}
            <div className={styles.evoDarkCard} onClick={() => {
              setActiveFlowTab("evolution");
              setEvoSidebarTab("dataAnalysis");
              setIsRightPanelCollapsed(false);
              setDeployPage(null);
              setShowToolDetails(false);
              setPublishPage(null);
            }}>
              <div className={styles.evoDarkCardHeader}>
                <span className={styles.evoDarkDot} style={{ background: "#3b82f6" }} />
                <span className={styles.evoDarkDot} style={{ background: "#22c55e" }} />
                <span className={styles.evoDarkDot} style={{ background: "#eab308" }} />
                <span className={styles.evoDarkCardTitle}>核心评估指标</span>
              </div>
              <div className={styles.evoDarkMetricsGrid}>
                {EVOLUTION_METRICS.map(m => (
                  <div key={m.label} className={styles.evoDarkMetricItem}>
                    <div className={styles.evoDarkMetricLabel}>{m.label}</div>
                    <div className={styles.evoDarkMetricRow}>
                      <span className={styles.evoDarkMetricValue}>{m.value}</span>
                      <span className={styles.evoDarkMetricTrend}>{m.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 工作流拓扑分析 */}
            <div className={styles.evoDarkCard} onClick={() => {
              setActiveFlowTab("evolution");
              setEvoSidebarTab("dataAnalysis");
              setIsRightPanelCollapsed(false);
              setDeployPage(null);
              setShowToolDetails(false);
              setPublishPage(null);
            }}>
              <div className={styles.evoDarkCardHeader}>
                <span className={styles.evoDarkDot} style={{ background: "#22c55e" }} />
                <span className={styles.evoDarkDot} style={{ background: "#f97316" }} />
                <span className={styles.evoDarkDot} style={{ background: "#ef4444" }} />
                <span className={styles.evoDarkCardTitle}>工作流拓扑分析</span>
              </div>
              <div className={styles.topologyWrap} onWheel={e => { e.stopPropagation(); setTopoZoom(z => Math.min(2.5, Math.max(0.5, z + (e.deltaY > 0 ? -0.1 : 0.1)))); }}>
                <div className={styles.topologyZoomInner} style={{ transform: `scale(${topoZoom})` }}>
                  {WORKFLOW_NODES.map((n, i) => (
                    <div key={i} className={styles.topologyNode} style={{ left: `${n.x}%`, top: `${n.y}%`, background: n.color, animationDelay: `${i * 0.12}s` }}>
                      {n.label.split("\n").map((l, li) => <span key={li}>{l}</span>)}
                    </div>
                  ))}
                  <svg className={styles.topologySvg} viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <marker id="arrowGray" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto"><path d="M0,0 L6,2 L0,4" fill="#6B7280" /></marker>
                    </defs>
                    {WORKFLOW_EDGES.map(([a, b], i) => (
                      <line key={i} className={styles.topologyEdgeAnim} x1={WORKFLOW_NODES[a].x} y1={WORKFLOW_NODES[a].y} x2={WORKFLOW_NODES[b].x} y2={WORKFLOW_NODES[b].y} stroke="#6B7280" strokeWidth="0.4" markerEnd="url(#arrowGray)" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </svg>
                </div>
                <div className={styles.topologyZoomControls} onClick={e => e.stopPropagation()}>
                  <button className={styles.topologyZoomBtn} onClick={() => setTopoZoom(z => Math.min(2.5, z + 0.2))}><ZoomInOutlined /></button>
                  <button className={styles.topologyZoomBtn} onClick={() => setTopoZoom(z => Math.max(0.5, z - 0.2))}><ZoomOutOutlined /></button>
                </div>
                <div className={styles.topologyLegend}>
                  <span className={styles.topologyLegendItem}><span style={{ background: "#22c55e" }} className={styles.topologyLegendDot} /> 正常</span>
                  <span className={styles.topologyLegendItem}><span style={{ background: "#f97316" }} className={styles.topologyLegendDot} /> 警告</span>
                  <span className={styles.topologyLegendItem}><span style={{ background: "#ef4444" }} className={styles.topologyLegendDot} /> 异常</span>
                </div>
              </div>
            </div>
          </div>

          <div className={classNames(styles.msgRow, styles.msgRowAssistant)}>
            <div className={classNames(styles.msgBubble, styles.msgBubbleAssistant)}>
              <div className={styles.enterpriseSelect}>
                <span className={styles.enterpriseSelectLabel}>选择回流数据源</span>
                <label className={styles.enterpriseCheckbox}>
                  <Checkbox checked={selectedEnterprises.size === enterpriseList.length && enterpriseList.length > 0} onChange={handleSelectAllEnterprises} />
                  <span>全选</span>
                </label>
                {enterpriseList.map(fb => (
                  <label key={fb.enterprise} className={styles.enterpriseCheckbox}>
                    <Checkbox checked={selectedEnterprises.has(fb.enterprise)} onChange={() => handleToggleEnterprise(fb.enterprise)} />
                    <span><strong>{fb.enterprise}</strong> ({fb.count} 条)</span>
                  </label>
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
        <>
        <div className={styles.evoLineageCard} style={{ cursor: "pointer" }} onClick={() => { setEvoSidebarTab("dataManagement"); setIsRightPanelCollapsed(false); }}>
          <h4 className={styles.evoLineageTitle}>版本血缘关系</h4>
          <p className={styles.evoLineageText}>V2.0 → V2.1（候选版本）</p>
          <p className={styles.evoLineageText}>进化完成！Agent 已生成候选版本，请前往「发布」tab 进行发布。</p>
        </div>
        {/* 雷达图卡片 */}
        <div className={styles.radarCard} onClick={() => { setEvoSidebarTab("evolutionTrend"); setIsRightPanelCollapsed(false); }}>
          <div className={styles.radarCardHeader}>
            <span className={styles.radarCardIcon}><LineChartOutlined /></span>
            <span className={styles.radarCardTitle}>版本对比雷达图</span>
          </div>
          <div className={styles.radarSvgWrap}>
            <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" className={styles.radarSvg}>
              {/* 网格 */}
              <g stroke="#475569" strokeWidth="1" fill="none">
                <polygon points="128,32 192,64 224,128 192,192 128,224 64,192 32,128 64,64" opacity="0.3" />
                <polygon points="128,64 176,96 192,128 176,160 128,192 80,160 64,128 80,96" opacity="0.4" />
                <polygon points="128,96 160,112 160,128 160,144 128,160 96,144 96,128 96,112" opacity="0.5" />
                <line x1="128" y1="32" x2="128" y2="224" />
                <line x1="32" y1="128" x2="224" y2="128" />
                <line x1="64" y1="64" x2="192" y2="192" />
                <line x1="192" y1="64" x2="64" y2="192" />
              </g>
              {/* V3 候选版本 */}
              <polygon points="128,48 180,72 200,128 176,184 128,208 80,176 64,128 88,72" fill="rgba(16,185,129,0.2)" stroke="#10B981" strokeWidth="2" />
              {/* V2 当前版本 */}
              <polygon points="128,64 160,80 176,128 160,176 128,192 96,168 80,128 96,88" fill="rgba(107,114,128,0.2)" stroke="#6B7280" strokeWidth="2" />
            </svg>
            {/* 轴标签 */}
            <span className={classNames(styles.radarLabel, styles.radarLabelTop)}>准确率</span>
            <span className={classNames(styles.radarLabel, styles.radarLabelRight)}>满意度</span>
            <span className={classNames(styles.radarLabel, styles.radarLabelBottom)}>覆盖率</span>
            <span className={classNames(styles.radarLabel, styles.radarLabelLeft)}>响应速度</span>
            <span className={classNames(styles.radarLabel, styles.radarLabelBL)}>稳定性</span>
            <span className={classNames(styles.radarLabel, styles.radarLabelBR)}>工具成功率</span>
          </div>
          <div className={styles.radarLegend}>
            <span className={styles.radarLegendItem}><span className={styles.radarDotGray} /> 当前版本 V2</span>
            <span className={styles.radarLegendItem}><span className={styles.radarDotGreen} /> 候选版本 V3</span>
          </div>
          <p className={styles.radarHint}>点击查看进化趋势详情</p>
        </div>
        </>
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
            {publishType === "skill"
              ? "Skill 已发布到 Skill 广场"
              : "AI专家已发布到 AI专家广场"}
          </h3>
          <p className={styles.publishSuccessHint}>
            {publishType === "skill"
              ? `${publishForm.name} v${publishForm.version} 已成功发布。`
              : `${publishForm.name} v${publishForm.version} 已发布到 AI专家广场，当前范围：${
                  publishForm.visibility === "public"
                    ? "企业公开"
                    : publishForm.visibility === "team"
                      ? "团队共享"
                      : "仅自己"
                }。`}
          </p>
        </div>
      ) : !publishType ? (
        <div className={styles.publishTypeSection}>
          <h4 className={styles.publishSectionTitle}>选择发布类型</h4>
          <div className={styles.publishTypeCards}>
            <button type="button" className={styles.publishTypeCard} onClick={() => {
              setPublishType("skill");
              const sk = AGENT_SKILLS[0];
              updatePublishForm({
                selectedSkill: sk.key,
                name: sk.name,
                visibility: "public",
              });
            }}>
              <ThunderboltOutlined className={styles.publishTypeCardIcon} />
              <div className={styles.publishTypeCardCopy}>
                <span className={styles.publishTypeCardTitle}>发布为 Skill</span>
                <span className={styles.publishTypeCardDesc}>选择一个 Skill 发布到 Skill 广场</span>
              </div>
            </button>
            <button type="button" className={styles.publishTypeCard} onClick={handleOpenAgentPublishPanel}>
              <AppstoreOutlined className={styles.publishTypeCardIcon} />
              <div className={styles.publishTypeCardCopy}>
                <span className={styles.publishTypeCardTitle}>发布到 AI专家广场</span>
                <span className={styles.publishTypeCardDesc}>将当前 AI专家发布到统一广场并按权限范围可见</span>
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
              <label className={styles.publishFormLabel}>{publishType === "skill" ? "展示名称" : "Agent 名称"} <span className={styles.publishRequired}>*</span></label>
              <Input value={publishForm.name} maxLength={200} placeholder={publishType === "skill" ? "Skill 展示名称" : "Agent 名称"} onChange={e => updatePublishForm({ name: e.target.value })} />
            </div>
            <div className={styles.publishFormRow}>
              <label className={styles.publishFormLabel}>版本号 <span className={styles.publishRequired}>*</span></label>
              <Input value={publishForm.version} maxLength={64} placeholder="1.0.0" onChange={e => updatePublishForm({ version: e.target.value })} />
            </div>
            {publishType === "skill" ? (
              <div className={styles.publishFormRow}>
                <label className={styles.publishFormLabel}>分类</label>
                <Select value={publishForm.type} onChange={v => updatePublishForm({ type: v })} style={{ width: "100%" }} options={[{ value: "workflow", label: "Workflow 类" }, { value: "skill", label: "Skill 类" }, { value: "model", label: "模型类" }]} />
              </div>
            ) : (
              <div className={styles.publishFormRow}>
                <label className={styles.publishFormLabel}>框架类型</label>
                <Input value={selectedFramework ?? ws.framework} disabled />
              </div>
            )}
              <div className={styles.publishFormRow}>
                <label className={styles.publishFormLabel}>可见性</label>
              <Select
                value={publishForm.visibility}
                onChange={v => updatePublishForm({ visibility: v })}
                style={{ width: "100%" }}
                options={
                  publishType === "skill"
                    ? [
                        { value: "public", label: "企业公开" },
                        { value: "private", label: "仅自己" },
                        { value: "team", label: "团队" },
                      ]
                    : [
                        { value: "public", label: "企业公开" },
                        { value: "team", label: "团队共享" },
                        { value: "private", label: "仅自己" },
                      ]
                }
              />
              </div>
            <div className={styles.publishFormRow}>
              <label className={styles.publishFormLabel}>标签</label>
              <Input value={publishForm.tags} maxLength={200} placeholder="多个标签用逗号分隔" onChange={e => updatePublishForm({ tags: e.target.value })} />
            </div>
            <div className={styles.publishFormRow}>
              <label className={styles.publishFormLabel}>描述</label>
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
              {publishType === "skill" ? "发布到 Skill 广场" : "发布到 AI专家广场"}
              </Button>
            </div>
          </div>
        )}
    </div>
  );

  /* ── 中间面板内容 ── */
  const renderCenterContent = () => {
    if (activeFlowTab === "evolution") return renderEvoContent();
    if (activeFlowTab === "test") return renderTestContent();

    // 调研 & 开发使用统一的消息历史
    return (
      <div className={styles.chatBody} ref={chatBodyRef}>
        {allMessages.length === 0 ? (
          <div className={styles.overviewCard}>
            <img src="https://dynamics.frontis.top/assets/gif/ball-B-4JfZf9.gif" alt="workspace" className={styles.welcomeOrb} />
            <h3 className={styles.overviewTitle}>本工作空间概览</h3>
            <p className={styles.overviewText}>{ws.overviewText}</p>
          </div>
        ) : (
          allMessages.map((msg, mi) => (
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
  const showComposer = true;

  /* ── 中间面板 ── */
  const centerPanel = (
    <div className={styles.centerPanel}>
      {/* 内容 */}
      {renderCenterContent()}

      {/* 输入栏 */}
      {showComposer && (
        <div className={styles.composerBar}>
          {/* 4 tab - 移到输入框上方 */}
          <div className={styles.flowTabs}>
            {(["research", "dev", "test", "evolution"] as FlowTab[]).map(tab => (
              <button
                key={tab}
                type="button"
                className={classNames(styles.flowTabBtn, activeFlowTab === tab && styles.flowTabBtnActive)}
                onClick={() => handleFlowTabChange(tab)}
              >
                {FLOW_TAB_LABELS[tab]}
              </button>
            ))}
            <div className={styles.flowTabRight}>
              {/* 全局入口：工具详情 + 部署 */}
              <button type="button" className={styles.topActionBtn} onClick={() => {
                setShowToolDetails(true);
                setDeployPage(null);
                setPublishPage(null);
                setIsRightPanelCollapsed(false);
              }}>
                工具详情
              </button>
              <button type="button" className={styles.topActionBtn} onClick={() => {
                // 如果已经部署完成，直接跳转到发布上架侧边栏
                if (deployPage === "store" || deployPage === "progress") {
                  // 保持当前状态（已部署或部署中）
                  setDeployPage(deployPage);
                } else {
                  // 未部署或配置状态，重置为配置界面
                  setDeployPage("config");
                  setDeployProgressDone(0);
                }
                setShowToolDetails(false);
                setPublishPage(null);
                setIsRightPanelCollapsed(false);
              }}>
                部署
              </button>
            </div>
          </div>
          <div className={styles.composerInputWrapper}>
            {activeFlowTab === "evolution" && evoPhase === "idle" ? (
              <div className={styles.evoComposerBar}>
                <span className={styles.evoComposerHint}>选择回流数据源后点击"进化"</span>
                <Button type="primary" icon={<SendOutlined />} disabled={selectedEnterprises.size === 0 || evoPhase !== "idle"} onClick={handleClickEvolve}>进化</Button>
              </div>
            ) : (
              <>
                <Input.TextArea
                  value={inputValue}
                  placeholder={
                    activeFlowTab === "research" ? "描述你的任务或想法..."
                    : activeFlowTab === "dev" ? "输入 @ 添加 MCP、文件、知识库、数据源或资产库"
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
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                      multiple
                    />
                    <button type="button" className={styles.composerIconBtn} title="附件" onClick={handleFileSelect}><PaperClipOutlined /></button>
                    <button type="button" className={styles.composerIconBtn} title="上传" onClick={handleFileSelect}><UploadOutlined /></button>
                    <Select
                      variant="borderless"
                      value={deployModel}
                      onChange={setDeployModel}
                      popupMatchSelectWidth={false}
                      placement="topLeft"
                      options={[
                        { label: "Kimi K2.5", value: "Kimi K2.5" },
                        { label: "Claude Sonnet 4.6 线路1", value: "Claude Sonnet 4.6 线路1" },
                        { label: "Claude Opus 4.6 线路1", value: "Claude Opus 4.6 线路1" },
                        { label: "GPT 5.4", value: "GPT 5.4" },
                        { label: "Claude Sonnet 4.6 线路2", value: "Claude Sonnet 4.6 线路2" },
                      ]}
                      labelRender={(label) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className={styles.modelIcon}>c</span>
                          {label.label}
                        </div>
                      )}
                      className={styles.composerModelSelect}
                    />
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
        </div>
      )}
    </div>
  );

  /* ── 右侧：进化与效能面板 ── */
  const evoRightPanel = (
    <aside className={styles.rightPanel}>
      <div className={styles.rightHeader}>
        <LineChartOutlined />
        <span className={styles.rightTitle}>进化与效能</span>
        <button type="button" className={styles.rightToggleBtn} aria-label="收起右侧面板" onClick={() => setIsRightPanelCollapsed(true)}>
          <CloseOutlined />
        </button>
      </div>

      {/* Tab 导航 */}
      <div className={styles.evoRightTabs}>
        {([
          { key: "dataAnalysis" as EvoSidebarTab, label: "数据分析", icon: <LineChartOutlined /> },
          { key: "dataManagement" as EvoSidebarTab, label: "数据管理", icon: <FolderOutlined /> },
          { key: "evolutionTrend" as EvoSidebarTab, label: "进化趋势", icon: <RocketOutlined /> },
        ]).map(tab => (
          <button
            key={tab.key}
            type="button"
            className={classNames(styles.evoRightTab, evoSidebarTab === tab.key && styles.evoRightTabActive)}
            onClick={() => setEvoSidebarTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.rightBody}>
        {/* 进化趋势 */}
        {evoSidebarTab === "evolutionTrend" && (
          <>
            {reportVersion ? (
              /* ── 评测报告详情 ── */
              <div className={styles.reportDetail}>
                <div className={styles.reportBackRow}>
                  <button type="button" className={styles.reportBackBtn} onClick={() => setReportVersion(null)}>
                    <ArrowLeftOutlined /> 返回
                  </button>
                  <span className={styles.reportDetailTitle}>{reportVersion} 版本评测报告</span>
                </div>

                {/* 报告摘要 */}
                <div className={styles.reportSummaryCard}>
                  <h4 className={styles.reportSummaryTitle}>报告摘要</h4>
                  <p className={styles.reportSummaryText}>
                    {reportVersion}版本在各项核心指标上均有显著提升，Skill触发准确率达91%，任务完成率89%，综合Benchmark分数92分。建议进行部署。
                  </p>
                </div>

                {/* 性能指标 */}
                <div className={styles.reportSection}>
                  <h4 className={styles.reportSectionTitle}>性能指标</h4>
                  <div className={styles.reportBenchmarkRow}>
                    <span className={styles.reportBenchmarkLabel}>综合Benchmark分数</span>
                    <div className={styles.reportBenchmarkRight}>
                      <span className={styles.reportBenchmarkScore}>92</span>
                      <span className={styles.reportBenchmarkTrend}>↑15%</span>
                    </div>
                  </div>
                  <div className={styles.reportMetricsGrid}>
                    {REPORT_METRICS.map(m => (
                      <div key={m.label} className={styles.reportMetricItem}>
                        <div className={styles.reportMetricHeader}>
                          <span className={styles.reportMetricLabel}>{m.label}</span>
                          <span className={styles.reportMetricValue}>{m.value}</span>
                        </div>
                        <div className={styles.reportProgressBar}>
                          <div
                            className={classNames(styles.reportProgressFill, m.percent >= 90 ? styles.reportProgressGood : m.percent >= 70 ? styles.reportProgressAverage : styles.reportProgressPoor)}
                            style={{ width: `${m.percent}%` }}
                          />
                        </div>
                        <span className={styles.reportMetricTrend}>{m.trend}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 测试详情 */}
                <div className={styles.reportSection}>
                  <h4 className={styles.reportSectionTitle}>测试详情</h4>
                  {REPORT_TEST_DETAILS.map(d => (
                    <div key={d.label} className={styles.reportDetailRow}>
                      <span className={styles.reportDetailLabel}>{d.label}</span>
                      <span className={styles.reportDetailValue}>{d.value}</span>
                    </div>
                  ))}
                </div>

                {/* 问题与建议 */}
                <div className={styles.reportSection}>
                  <h4 className={styles.reportSectionTitle}>问题与建议</h4>
                  {REPORT_ISSUES.map((item, i) => (
                    <div key={i} className={styles.reportIssueRow}>
                      <span className={classNames(styles.reportIssueDot, item.type === "issue" ? styles.reportIssueDotYellow : styles.reportIssueDotGreen)} />
                      <span className={styles.reportIssueText}>{item.type === "issue" ? "问题" : "建议"}：{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* 结论 */}
                <div className={styles.reportConclusionCard}>
                  <h4 className={styles.reportConclusionTitle}>结论</h4>
                  <p className={styles.reportConclusionText}>
                    {reportVersion}版本表现优秀，各项核心指标均有明显提升。建议进行发布，并在生产环境中持续监控其性能表现。
                  </p>
                </div>
              </div>
            ) : (
              /* ── 版本演进树 + 核心指标 ── */
              <>
                {/* 版本演进树 */}
                <div className={styles.evoSection}>
                  <div className={styles.evoSectionLabel}><BranchesOutlined /> 版本演进树</div>
                  <div className={styles.evoTimeline}>
                    <div className={styles.evoTimelineLine} />
                    {EVOLUTION_VERSIONS.map((v) => (
                      <div key={v.name} className={styles.evoTimelineItem}>
                        <div className={classNames(styles.evoTimelineDot, v.isCurrent ? styles.evoTimelineDotCurrent : styles.evoTimelineDotNormal)} />
                        <div
                          className={classNames(
                            styles.evoVersionCard,
                            v.isCurrent && styles.evoVersionCardCurrent,
                            selectedVersion === v.name && styles.evoVersionCardSelected
                          )}
                          onClick={() => setSelectedVersion(v.name)}
                        >
                          <div className={styles.evoVersionTop}>
                            <span className={styles.evoVersionName}>{v.name}</span>
                            <span className={classNames(styles.evoVersionBadge, v.isCurrent ? styles.evoVersionBadgeGreen : styles.evoVersionBadgeGray)}>{v.status}</span>
                          </div>
                          {v.time && <div className={styles.evoVersionTime}>更新时间: {v.time}</div>}
                          {v.desc && <div className={styles.evoVersionDesc}>{v.desc}</div>}
                          <div className={styles.evoVersionActions}>
                            <button type="button" className={styles.evoVersionActionBtn} onClick={(e) => {
                              e.stopPropagation();
                              setReportVersion(v.name);
                            }}>
                              <FileTextOutlined /> 评测报告
                            </button>
                            {v.isCurrent && (
                              <button type="button" className={classNames(styles.evoVersionActionBtn, styles.evoVersionActionBtnPrimary)} onClick={(e) => {
                                e.stopPropagation();
                                setDeployPage("config");
                                setDeployProgressDone(0);
                                setShowToolDetails(false);
                                setIsRightPanelCollapsed(false);
                              }}>
                                <RocketOutlined /> 去部署
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 核心指标 */}
                <div className={styles.evoSection}>
                  <div className={styles.evoSectionLabel}><LineChartOutlined /> 核心指标</div>
                  <div className={styles.evoTrendMetricsGrid}>
                    {EVOLUTION_VERSIONS.find(v => v.name === selectedVersion)?.metrics.map(m => (
                      <div key={m.label} className={styles.evoTrendMetricCard}>
                        <div className={styles.evoTrendMetricLabel}>{m.label}</div>
                        <div className={styles.evoTrendMetricBottom}>
                          <span className={styles.evoTrendMetricValue}>{m.value}</span>
                          <span className={styles.evoTrendMetricTrend}>{m.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 版本演进趋势折线图 */}
                <div className={styles.evoSection}>
                  <div className={styles.evoSectionLabel}><LineChartOutlined /> 版本演进趋势</div>
                  <div className={styles.trendChartWrap}>
                    <canvas ref={trendCanvasRef} />
                  </div>
                  <div className={styles.trendLegend}>
                    <span className={styles.trendLegendItem}><span className={styles.trendLegendDot} style={{ background: "#3b82f6" }} /> Skill触发准确率</span>
                    <span className={styles.trendLegendItem}><span className={styles.trendLegendDot} style={{ background: "#a855f7" }} /> 任务完成行为率</span>
                    <span className={styles.trendLegendItem}><span className={styles.trendLegendDot} style={{ background: "#10b981" }} /> 结果质量评分</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* 数据分析 */}
        {evoSidebarTab === "dataAnalysis" && (
          <>
            {/* 详细指标 */}
            <div className={styles.evoSection}>
              <div className={styles.evoSectionLabel}><LineChartOutlined /> 当前版本详细指标</div>
              <div className={styles.evoMetricsGrid}>
                {DETAIL_METRICS.map(m => (
                  <div key={m.label} className={styles.evoMetricCard}>
                    <div className={styles.evoMetricTop}>
                      <span className={styles.evoMetricLabel}>{m.label}</span>
                      <span className={styles.evoMetricTrend}>{m.change}</span>
                    </div>
                    <div className={styles.evoMetricValue}>{m.value}</div>
                    <div className={styles.evoMetricProgressBg}>
                      <div className={styles.evoMetricProgressFill} style={{ width: `${m.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 工作流拓扑 */}
            <div className={styles.evoSection}>
              <div className={styles.evoSectionLabel}><AppstoreOutlined /> 工作流拓扑分析</div>
              <div className={styles.sidebarTopologyWrap} onWheel={e => { e.stopPropagation(); setSidebarTopoZoom(z => Math.min(2.5, Math.max(0.5, z + (e.deltaY > 0 ? -0.1 : 0.1)))); }}>
                <div className={styles.topologyZoomInner} style={{ transform: `scale(${sidebarTopoZoom})` }}>
                  {WORKFLOW_NODES.map((n, i) => (
                    <div key={i} className={styles.sidebarTopologyNode} style={{ left: `${n.x}%`, top: `${n.y}%`, background: n.color, animationDelay: `${i * 0.12}s` }}>
                      {n.label.split("\n").map((l, li) => <span key={li}>{l}</span>)}
                    </div>
                  ))}
                  <svg className={styles.topologySvg} viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs><marker id="arrowGray2" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto"><path d="M0,0 L6,2 L0,4" fill="#4B5563" /></marker></defs>
                    {WORKFLOW_EDGES.map(([a, b], i) => (
                      <line key={i} className={styles.topologyEdgeAnim} x1={WORKFLOW_NODES[a].x} y1={WORKFLOW_NODES[a].y} x2={WORKFLOW_NODES[b].x} y2={WORKFLOW_NODES[b].y} stroke="#4B5563" strokeWidth="0.4" strokeDasharray="2,2" markerEnd="url(#arrowGray2)" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </svg>
                </div>
                <div className={styles.topologyZoomControls}>
                  <button className={styles.topologyZoomBtn} onClick={() => setSidebarTopoZoom(z => Math.min(2.5, z + 0.2))}><ZoomInOutlined /></button>
                  <button className={styles.topologyZoomBtn} onClick={() => setSidebarTopoZoom(z => Math.max(0.5, z - 0.2))}><ZoomOutOutlined /></button>
                </div>
                <div className={styles.topologyLegend}>
                  <span className={styles.topologyLegendItem}><span style={{ background: "#22c55e" }} className={styles.topologyLegendDot} /> 正常</span>
                  <span className={styles.topologyLegendItem}><span style={{ background: "#f97316" }} className={styles.topologyLegendDot} /> 警告</span>
                  <span className={styles.topologyLegendItem}><span style={{ background: "#ef4444" }} className={styles.topologyLegendDot} /> 异常</span>
                </div>
              </div>
            </div>

            {/* 失败节点排行 */}
            <div className={styles.evoSection}>
              <div className={styles.evoSectionLabel}><ExclamationCircleOutlined style={{ color: "#f87171" }} /> 失败节点排行</div>
              <div className={styles.failedNodeTable}>
                <table className={styles.failedNodeTableInner}>
                  <thead>
                    <tr><th>节点名称</th><th>失败次数</th><th>失败率</th><th>主要原因</th></tr>
                  </thead>
                  <tbody>
                    {FAILED_NODES.map(n => (
                      <tr key={n.name}>
                        <td className={n.severity === "high" ? styles.failedNodeHigh : styles.failedNodeMedium}>{n.name}</td>
                        <td>{n.count}</td>
                        <td className={n.severity === "high" ? styles.failedNodeHigh : styles.failedNodeMedium}>{n.rate}</td>
                        <td>{n.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 数据管理 */}
        {evoSidebarTab === "dataManagement" && (
          <div className={styles.evoSection}>
            {/* 血缘关系图 */}
            <div className={styles.evoSectionLabel}><LinkOutlined /> 血缘关系图</div>
            <div className={styles.lineageCanvasWrap} onWheel={e => { e.stopPropagation(); setLineageZoom(z => Math.min(2.5, Math.max(0.5, z + (e.deltaY > 0 ? -0.1 : 0.1)))); }}>
              <div style={{ transform: `scale(${lineageZoom})`, transformOrigin: "center center", width: "100%", height: "100%" }}>
                <canvas ref={lineageCanvasRef} />
              </div>
              <div className={styles.topologyZoomControls}>
                <button className={styles.topologyZoomBtn} onClick={() => setLineageZoom(z => Math.min(2.5, z + 0.2))}><ZoomInOutlined /></button>
                <button className={styles.topologyZoomBtn} onClick={() => setLineageZoom(z => Math.max(0.5, z - 0.2))}><ZoomOutOutlined /></button>
              </div>
              <div className={styles.lineageLegend}>
                <span className={styles.lineageLegendItem}><span className={styles.lineageDotAgent} /> Agent版本</span>
                <span className={styles.lineageLegendItem}><span className={styles.lineageDotData} /> 数据版本</span>
              </div>
            </div>

            {/* 回流数据审核工作台 */}
            <div className={styles.evoSectionLabel} style={{ marginTop: 16 }}>回流数据审核工作台</div>
            <div className={styles.dataTable}>
              <table className={styles.dataTableInner}>
                <thead>
                  <tr>
                    <th><Checkbox /></th>
                    <th>ID</th>
                    <th>对话摘要</th>
                    <th>来源</th>
                    <th>用户评分</th>
                    <th>tool调用轮数</th>
                    <th>对话轮数</th>
                    <th>Token消耗量</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {DATA_REVIEW_RECORDS.map(r => (
                    <tr key={r.id}>
                      <td><Checkbox /></td>
                      <td className={styles.dataTableId}>{r.id}</td>
                      <td>{r.summary}</td>
                      <td>
                        <span className={classNames(styles.sourceBadge, r.source === "线上回流" ? styles.sourceBadgeBlue : styles.sourceBadgeOrange)}>
                          {r.source}
                        </span>
                      </td>
                      <td>
                        <span className={styles.starsWrap}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <StarFilled key={i} className={i < r.stars ? styles.starActive : styles.starInactive} />
                          ))}
                        </span>
                      </td>
                      <td>{r.toolRounds}</td>
                      <td>{r.chatRounds}</td>
                      <td>{r.tokens}</td>
                      <td><button type="button" className={styles.viewBtn}><EyeOutlined /> 查看</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  /* ── 右侧资产中心 ── */
  const resultsRightPanel = (
    <aside className={styles.rightPanel}>
      <div className={styles.rightHeader}>
        <FileTextOutlined />
        <span className={styles.rightTitle}>成果</span>
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
        <div
          className={classNames(styles.rightTab, rightPanelTab === 'agentFiles' && styles.rightTabActive)}
          onClick={() => setRightPanelTab('agentFiles')}
        >
          调研文件
        </div>
        <div
          className={classNames(styles.rightTab, rightPanelTab === 'otherResults' && styles.rightTabActive)}
          onClick={() => setRightPanelTab('otherResults')}
        >
          开发文件
        </div>
      </div>

      <div className={styles.rightBody}>
        {rightPanelTab === 'agentFiles' && (
          <>
            {/* Agent 成分 */}
            <div className={styles.assetSection}>
              <h4 className={styles.assetSectionTitle}>Agent 成分</h4>
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

            {/* 成果列表 */}
            <div className={styles.assetSection}>
              <h4 className={styles.assetSectionTitle}>成果</h4>
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
          </>
        )}

        {rightPanelTab === 'otherResults' && (
          <>
            <div className={styles.otherResultsSubTabs}>
              <div
                className={classNames(styles.otherResultsSubTab, otherResultsSubTab === 'output' && styles.otherResultsSubTabActive)}
                onClick={() => setOtherResultsSubTab('output')}
              >
                输出结果
              </div>
              <div
                className={classNames(styles.otherResultsSubTab, otherResultsSubTab === 'upload' && styles.otherResultsSubTabActive)}
                onClick={() => setOtherResultsSubTab('upload')}
              >
                上传数据
              </div>
              <div
                className={classNames(styles.otherResultsSubTab, otherResultsSubTab === 'web' && styles.otherResultsSubTabActive)}
                onClick={() => setOtherResultsSubTab('web')}
              >
                Web数据
              </div>
              <div
                className={classNames(styles.otherResultsSubTab, otherResultsSubTab === 'api' && styles.otherResultsSubTabActive)}
                onClick={() => setOtherResultsSubTab('api')}
              >
                API数据
              </div>
            </div>

            <div className={styles.assetSection}>
              <h4 className={styles.assetSectionTitle}>
                {otherResultsSubTab === 'output' && '输出结果数据'}
                {otherResultsSubTab === 'upload' && '上传数据'}
                {otherResultsSubTab === 'web' && 'Web数据'}
                {otherResultsSubTab === 'api' && '服务调用数据'}
              </h4>
              <span className={styles.assetEmpty}>暂无数据</span>
            </div>
          </>
        )}
      </div>
    </aside>
  );

  /* ── 右侧：部署页面 ── */
  const deployRightPanel = (
    <aside className={styles.rightPanel}>
      <div className={styles.rightHeader}>
        <button type="button" className={styles.reportBackBtn} onClick={() => { setDeployPage(null); }}>
          <ArrowLeftOutlined />
        </button>
        <span className={styles.rightTitle}>
          {deployPage === "config" ? "部署配置" : deployPage === "progress" ? "正在部署应用" : "发布上架"}
        </span>
        <button type="button" className={styles.rightToggleBtn} style={{ marginLeft: "auto" }} onClick={() => setDeployPage(null)}>
          <CloseOutlined />
        </button>
      </div>
      <div className={styles.rightBody}>
        {/* 部署配置 */}
        {deployPage === "config" && (
          <div className={styles.deployConfigList}>
            {DEPLOY_CONFIG_ITEMS.map((item, i) => (
              <div key={i} className={styles.deployConfigCard}>
                <div className={styles.deployConfigIcon} style={{ background: item.iconBg }}>
                  {item.icon}
                </div>
                <div className={styles.deployConfigContent}>
                  <div className={styles.deployConfigTitle}>{item.title}</div>
                  {item.subtitle && <div className={styles.deployConfigSubtitle}>{item.subtitle}</div>}
                  {item.title === "部署域名" && <div className={styles.deployConfigSubtitle}>https://dynamics.frontis.top</div>}
                </div>
                <div className={styles.deployConfigTrailing}>
                  {item.title === "服务时长" && (
                    <Select
                      variant="borderless"
                      value={deployDuration}
                      onChange={setDeployDuration}
                      popupMatchSelectWidth={false}
                      placement="bottomRight"
                      options={[
                        { label: "6小时", value: "6小时" },
                        { label: "1天", value: "1天" },
                        { label: "3天", value: "3天" },
                        { label: "7天", value: "7天" },
                        { label: "半个月", value: "半个月" },
                        { label: "1个月", value: "1个月" },
                        { label: "3个月", value: "3个月" },
                        { label: "半年", value: "半年" },
                      ]}
                      className={styles.deploySelect}
                    />
                  )}
                  {item.title === "LLM 模型" && (
                    <Select
                      variant="borderless"
                      value={deployModel}
                      onChange={setDeployModel}
                      popupMatchSelectWidth={false}
                      placement="bottomRight"
                      options={[
                        { label: "Kimi K2.5", value: "Kimi K2.5" },
                        { label: "Claude Sonnet 4.6 线路1", value: "Claude Sonnet 4.6 线路1" },
                        { label: "Claude Opus 4.6 线路1", value: "Claude Opus 4.6 线路1" },
                        { label: "GPT 5.4", value: "GPT 5.4" },
                        { label: "Claude Sonnet 4.6 线路2", value: "Claude Sonnet 4.6 线路2" },
                      ]}
                      className={styles.deploySelect}
                    />
                  )}
                  {item.trailing === "chevron" && item.title !== "服务时长" && item.title !== "LLM 模型" && (
                    <DownOutlined style={{ fontSize: 10, color: "var(--text-muted)" }} />
                  )}
                  {item.trailing === "checkbox" && <Checkbox />}
                </div>
              </div>
            ))}
            <Button type="primary" icon={<RocketOutlined />} block className={styles.deployStartBtn} onClick={() => { setDeployPage("progress"); setDeployProgressDone(0); }}>
              开始部署
            </Button>
            <div className={styles.deployHistoryLink}>查看历史版本</div>
          </div>
        )}

        {/* 部署进度 */}
        {deployPage === "progress" && (
          <div className={styles.deployProgressWrap}>
            <div className={styles.deployStatusCard}>
              <div className={styles.deployStatusIcon}><CloudServerOutlined /></div>
              <div>
                <div className={styles.deployStatusTitle}>正在部署应用</div>
                <div className={styles.deployStatusSubtitle}>请稍候，应用正在部署到 AI专家广场...</div>
              </div>
            </div>
            <div className={styles.deployProgressBarWrap}>
              <div className={styles.deployProgressBarLabel}>
                <span>部署进度</span>
                <span>{Math.min(Math.round((deployProgressDone / DEPLOY_PROGRESS_STEPS.length) * 100), 100)}%</span>
              </div>
              <div className={styles.deployProgressBarBg}>
                <div className={styles.deployProgressBarFill} style={{ width: `${Math.min((deployProgressDone / DEPLOY_PROGRESS_STEPS.length) * 100, 100)}%` }} />
              </div>
            </div>
            <div className={styles.deploySteps}>
              {DEPLOY_PROGRESS_STEPS.map((step, i) => (
                <div key={i} className={styles.deployStepRow}>
                  <div className={classNames(styles.deployStepDot, i < deployProgressDone ? styles.deployStepDotDone : i === deployProgressDone ? styles.deployStepDotActive : styles.deployStepDotWait)}>
                    {i < deployProgressDone ? <CheckCircleFilled /> : <span>{i + 1}</span>}
                  </div>
                  <div className={styles.deployStepText}>
                    <span className={styles.deployStepName}>{step}</span>
                    <span className={classNames(styles.deployStepStatus, i < deployProgressDone ? styles.deployStepStatusDone : i === deployProgressDone ? styles.deployStepStatusActive : "")}>
                      {i < deployProgressDone ? "完成" : i === deployProgressDone ? "进行中" : "等待中"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.deployInfoCard}>
              <div className={styles.deployInfoTitle}>部署信息</div>
              {[
                { label: "应用名称", value: selectedWorkspace?.name ?? "—" },
                { label: "版本", value: "v3" },
                { label: "部署环境", value: "生产环境" },
                { label: "部署时间", value: new Date().toLocaleString() },
              ].map(d => (
                <div key={d.label} className={styles.deployInfoRow}>
                  <span className={styles.deployInfoLabel}>{d.label}</span>
                  <span className={styles.deployInfoValue}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 发布与上架 */}
        {deployPage === "store" && (
          <div className={styles.deployStoreWrap}>
            {/* 服务状态 */}
            <div className={styles.deployStoreCard}>
              <div className={styles.deployStoreStatusRow}>
                <span className={styles.deployStoreStatusDot} />
                <span className={styles.deployStoreStatusText}>服务运行中</span>
                <span className={styles.deployStoreVersionId}>V298035239048015872</span>
              </div>
              <div className={styles.deployStoreTimeGrid}>
                <div><div className={styles.deployStoreTimeLabel}>上线时间</div><div className={styles.deployStoreTimeValue}>2026/04/02 18:05:39</div></div>
                <div><div className={styles.deployStoreTimeLabel}>下线时间</div><div className={styles.deployStoreTimeValue}>2026/04/03 18:05:38</div></div>
              </div>
              <div className={styles.deployStoreLinks}>
                <a className={styles.deployStoreLink}><HistoryOutlined /> 历史版本</a>
                <a className={styles.deployStoreLink}><LineChartOutlined /> 运维监控</a>
                <a className={styles.deployStoreLink}><EditOutlined /> 体验页定制申请</a>
                <a className={styles.deployStoreLink} onClick={() => { setPublishPage("assetLibrary"); setPublishType("agent"); setPublishSuccess(false); setCommodityApplicationSuccess(false); setIsRightPanelCollapsed(false); }}><UploadOutlined /> 上架到资产库</a>
                <a className={styles.deployStoreLink} onClick={handleOpenAgentPublishPanel}><ShopOutlined /> 发布到 AI专家广场</a>
                <a className={styles.deployStoreLink} onClick={() => {
                  setPublishPage("form");
                  setPublishType("skill");
                  setPublishSuccess(false);
                  setCommodityApplicationSuccess(false);
                  const sk = AGENT_SKILLS[0];
                  setPublishForm({
                    ...DEFAULT_PUBLISH_FORM,
                    selectedSkill: sk.key,
                    name: sk.name,
                  });
                  setIsRightPanelCollapsed(false);
                }}><ThunderboltOutlined /> 发布为Skill</a>
              </div>
            </div>

            {/* 应用信息 */}
            <div className={styles.deployStoreCard}>
              <div className={styles.deployConfigCard} style={{ border: "none", padding: 0 }}>
                <div className={styles.deployConfigIcon} style={{ background: "var(--deploy-icon-blue)" }}><FileTextOutlined /></div>
                <div className={styles.deployConfigContent}>
                  <div className={styles.deployConfigSubtitle}>应用名称</div>
                  <div className={styles.deployConfigTitle}>{selectedWorkspace?.name ?? "—"} <span className={styles.deployStoreAgentBadge}>Agent</span></div>
                </div>
              </div>
            </div>

            {/* 体验地址 */}
            <div className={styles.deployStoreCard}>
              <div className={styles.deployConfigCard} style={{ border: "none", padding: 0 }}>
                <div className={styles.deployConfigIcon} style={{ background: "var(--deploy-icon-gray)" }}><LinkOutlined /></div>
                <div className={styles.deployConfigContent}>
                  <div className={styles.deployConfigSubtitle}>体验地址</div>
                  <div className={styles.deployStoreLinkUrl}>https://dynamics.frontis.top/experience/pat_YJhN7...</div>
                </div>
                <a className={styles.deployStoreLink} style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>去体验</a>
              </div>
            </div>

            {/* API Token */}
            <div className={styles.deployStoreCard}>
              <div className={styles.deployConfigCard} style={{ border: "none", padding: 0 }}>
                <div className={styles.deployConfigIcon} style={{ background: "var(--deploy-icon-purple)" }}><KeyOutlined /></div>
                <div className={styles.deployConfigContent}>
                  <div className={styles.deployConfigSubtitle}>API Token</div>
                  <div className={styles.deployConfigTitle}>已创建 1 个 Token</div>
                </div>
              </div>
            </div>

            {/* API 调用文档 */}
            <div className={styles.deployStoreCard}>
              <div className={styles.deployConfigCard} style={{ border: "none", padding: 0 }}>
                <div className={styles.deployConfigIcon} style={{ background: "var(--deploy-icon-gray)" }}><CodeOutlined /></div>
                <div className={styles.deployConfigContent}>
                  <div className={styles.deployConfigSubtitle}>API 调用文档</div>
                  <div className={styles.deployConfigTitle}>查看接口调用方式和示例代码</div>
                </div>
                <DownOutlined style={{ fontSize: 10, color: "var(--text-muted)" }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  /* ── 右侧：发布侧边栏 ── */
  const publishRightPanel = (
    <aside className={styles.rightPanel}>
      <div className={styles.rightHeader}>
        {publishPage === "assetLibrary" ? (
          <button type="button" className={styles.reportBackBtn} onClick={() => setPublishPage("form")}>
            <ArrowLeftOutlined />
          </button>
        ) : (
          <button type="button" className={styles.reportBackBtn} onClick={() => setPublishPage(null)}>
            <ArrowLeftOutlined />
          </button>
        )}
        <span className={styles.rightTitle}>
          {publishPage === "assetLibrary"
            ? "上架到资产库"
            : publishPage === "commodity"
              ? "申请发布为商品"
              : publishType === "skill"
                ? "发布为Skill"
                : "发布到 AI专家广场"}
        </span>
        <button type="button" className={styles.rightToggleBtn} style={{ marginLeft: "auto" }} onClick={() => setPublishPage(null)}>
          <CloseOutlined />
        </button>
      </div>
      <div className={styles.rightBody}>
        {publishPage === "assetLibrary" ? (
          <div className={styles.publishBody}>
            <div className={styles.overviewCard}>
              <UploadOutlined style={{ fontSize: 48, color: "var(--primary)" }} />
              <h3 className={styles.overviewTitle}>上架到资产库</h3>
              <p className={styles.overviewText}>将 Agent 上架到企业资产库，供团队成员使用。</p>
            </div>
          </div>
        ) : publishPage === "commodity" ? (
          commodityApplicationSuccess ? (
            <div className={styles.publishSuccessView}>
              <CheckCircleFilled style={{ fontSize: 48, color: "#3cbf7b" }} />
              <h3 className={styles.publishSuccessTitle}>上架申请已提交</h3>
              <p className={styles.publishSuccessHint}>
                平台运营会在审核通过后将该 AI专家转换为商品，审核前仍仅支持企业内使用。
              </p>
            </div>
          ) : (
            <div className={styles.publishFormArea}>
              <div className={styles.publishFormSection}>
                <div className={styles.publishNoticeCard}>
                  <div className={styles.publishNoticeTitle}>当前发布范围</div>
                  <div className={styles.publishNoticeText}>
                    {hasAgentListingAccess
                      ? "该 AI专家发布到 AI专家广场后，将按当前权限范围在本企业内可见可用。只有上架申请审核通过后，平台运营才会将其转换为商品并进入售卖配置。"
                      : "当前租户未开通 AI专家上架服务，可继续开发、自用和发布到企业内广场，暂不能提交平台上架申请。"}
                  </div>
                </div>
              </div>
              <div className={styles.publishFormSection}>
                <h4 className={styles.publishSectionTitle}>上架申请信息</h4>
                <div className={styles.publishFormRow}>
                  <label className={styles.publishFormLabel}>AI专家名称</label>
                  <Input
                    value={publishForm.name || selectedWorkspace?.name || "未命名 AI专家"}
                    disabled
                  />
                </div>
                <div className={styles.publishFormRow}>
                  <label className={styles.publishFormLabel}>拟上架商品名 <span className={styles.publishRequired}>*</span></label>
                  <Input
                    value={commodityApplicationForm.proposedProductName}
                    maxLength={200}
                    placeholder="请输入拟上架商品名"
                    onChange={event =>
                      updateCommodityApplicationForm({
                        proposedProductName: event.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.publishFormRow}>
                  <label className={styles.publishFormLabel}>申请理由 <span className={styles.publishRequired}>*</span></label>
                  <Input.TextArea
                    value={commodityApplicationForm.reason}
                    maxLength={1000}
                    rows={4}
                    showCount
                    placeholder="说明为什么需要发布为商品，以及面向外部客户的售卖价值。"
                    onChange={event =>
                      updateCommodityApplicationForm({ reason: event.target.value })
                    }
                  />
                </div>
                <div className={styles.publishFormRow}>
                  <label className={styles.publishFormLabel}>适用客户</label>
                  <Input
                    value={commodityApplicationForm.targetCustomers}
                    maxLength={200}
                    placeholder="例如：零售连锁、财务共享中心、销售团队"
                    onChange={event =>
                      updateCommodityApplicationForm({
                        targetCustomers: event.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.publishFormRow}>
                  <label className={styles.publishFormLabel}>补充说明</label>
                  <Input.TextArea
                    value={commodityApplicationForm.notes}
                    maxLength={1000}
                    rows={3}
                    showCount
                    placeholder="补充运营审核时需要关注的上架信息。"
                    onChange={event =>
                      updateCommodityApplicationForm({ notes: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className={styles.publishFooter}>
                <Button onClick={() => setPublishPage(null)}>取消</Button>
                <Button
                  type="primary"
                  icon={<ShopOutlined />}
                  disabled={!hasAgentListingAccess}
                  title={
                    hasAgentListingAccess
                      ? undefined
                      : "当前租户未开通 AI专家上架服务"
                  }
                  onClick={handleSubmitCommodityApplication}
                >
                  提交上架申请
                </Button>
              </div>
            </div>
          )
        ) : publishSuccess ? (
          <div className={styles.publishSuccessView}>
            <CheckCircleFilled style={{ fontSize: 48, color: "#3cbf7b" }} />
            <h3 className={styles.publishSuccessTitle}>
              {publishType === "skill"
                ? "Skill 已发布到 Skill 广场"
                : "AI专家已发布到 AI专家广场"}
            </h3>
            <p className={styles.publishSuccessHint}>
              {publishType === "skill"
                ? `${publishForm.name} v${publishForm.version} 已成功发布。`
                : `${publishForm.name} v${publishForm.version} 已发布到 AI专家广场，当前范围：${
                    publishForm.visibility === "public"
                      ? "企业公开"
                      : publishForm.visibility === "team"
                        ? "团队共享"
                        : "仅自己"
                  }。`}
            </p>
            {publishType === "agent" ? (
              <Button
                type="primary"
                icon={<ShopOutlined />}
                onClick={handleOpenCommodityApplicationPanel}
              >
                提交上架申请
              </Button>
            ) : null}
            <Button
              style={{ marginTop: 16 }}
              onClick={() => {
                onNavigate?.("agentStore", publishForm.name);
                setPublishPage(null);
                setPage("list");
              }}
            >
              去查看
            </Button>
          </div>
        ) : !publishType ? (
          <div className={styles.publishTypeSection}>
            <h4 className={styles.publishSectionTitle}>选择发布类型</h4>
            <div className={styles.publishTypeCards}>
              <button type="button" className={styles.publishTypeCard} onClick={() => {
                setPublishType("skill");
                const sk = AGENT_SKILLS[0];
                updatePublishForm({
                  selectedSkill: sk.key,
                  name: sk.name,
                  visibility: "public",
                });
              }}>
                <ThunderboltOutlined className={styles.publishTypeCardIcon} />
                <div className={styles.publishTypeCardCopy}>
                  <span className={styles.publishTypeCardTitle}>发布为 Skill</span>
                  <span className={styles.publishTypeCardDesc}>选择一个 Skill 发布到 Skill 广场</span>
                </div>
              </button>
              <button type="button" className={styles.publishTypeCard} onClick={handleOpenAgentPublishPanel}>
                <AppstoreOutlined className={styles.publishTypeCardIcon} />
                <div className={styles.publishTypeCardCopy}>
                  <span className={styles.publishTypeCardTitle}>发布到 AI专家广场</span>
                  <span className={styles.publishTypeCardDesc}>将当前 AI专家发布到统一广场并按权限范围可见</span>
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
                <label className={styles.publishFormLabel}>{publishType === "skill" ? "展示名称" : "Agent 名称"} <span className={styles.publishRequired}>*</span></label>
                <Input value={publishForm.name} maxLength={200} placeholder={publishType === "skill" ? "Skill 展示名称" : "Agent 名称"} onChange={e => updatePublishForm({ name: e.target.value })} />
              </div>
              <div className={styles.publishFormRow}>
                <label className={styles.publishFormLabel}>版本号 <span className={styles.publishRequired}>*</span></label>
                <Input value={publishForm.version} maxLength={64} placeholder="1.0.0" onChange={e => updatePublishForm({ version: e.target.value })} />
              </div>
              {publishType === "skill" ? (
                <div className={styles.publishFormRow}>
                  <label className={styles.publishFormLabel}>分类</label>
                  <Select value={publishForm.type} onChange={v => updatePublishForm({ type: v })} style={{ width: "100%" }} options={[{ value: "workflow", label: "Workflow 类" }, { value: "skill", label: "Skill 类" }, { value: "model", label: "模型类" }]} />
                </div>
              ) : (
                <div className={styles.publishFormRow}>
                  <label className={styles.publishFormLabel}>框架类型</label>
                  <Input value={selectedFramework ?? ws.framework} disabled />
                </div>
              )}
              <div className={styles.publishFormRow}>
                <label className={styles.publishFormLabel}>可见性</label>
                <Select
                  value={publishForm.visibility}
                  onChange={v => updatePublishForm({ visibility: v })}
                  style={{ width: "100%" }}
                  options={
                    publishType === "skill"
                      ? [
                          { value: "public", label: "企业公开" },
                          { value: "private", label: "仅自己" },
                          { value: "team", label: "团队" },
                        ]
                      : [
                          { value: "public", label: "企业公开" },
                          { value: "team", label: "团队共享" },
                          { value: "private", label: "仅自己" },
                        ]
                  }
                />
              </div>
              <div className={styles.publishFormRow}>
                <label className={styles.publishFormLabel}>标签</label>
                <Input value={publishForm.tags} maxLength={200} placeholder="多个标签用逗号分隔" onChange={e => updatePublishForm({ tags: e.target.value })} />
              </div>
              <div className={styles.publishFormRow}>
                <label className={styles.publishFormLabel}>描述</label>
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
                {publishType === "skill" ? "发布到 Skill 广场" : "发布到 AI专家广场"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  /* ── 右侧：工具详情面板 ── */
  const toolDetailsPanel = (() => {
    // 根据已流出的 toolOps 数量计算每一步的完成进度
    const seen = visibleFileCount;
    const stepProgress: number[] = [];
    let remaining = seen;
    for (const s of TOOL_DETAIL_STEPS) {
      const done = Math.max(0, Math.min(s.total, remaining));
      stepProgress.push(done);
      remaining -= s.total;
    }
    // 当前步骤（自动跟随最新进行中的步骤，但允许用户手动导航覆盖）
    const autoStep = (() => {
      for (let i = 0; i < TOOL_DETAIL_STEPS.length; i++) {
        if (stepProgress[i] < TOOL_DETAIL_STEPS[i].total) return i;
      }
      return TOOL_DETAIL_STEPS.length - 1;
    })();
    const curIdx = toolDetailStep < 0 ? autoStep : Math.min(Math.max(0, toolDetailStep), TOOL_DETAIL_STEPS.length - 1);
    const cur = TOOL_DETAIL_STEPS[curIdx];
    const curDone = stepProgress[curIdx];
    // 当前步骤正在进行中时额外显示一个"进行中"任务卡
    const showingTasks = curDone === 0 && curIdx === autoStep && seen > 0 ? cur.tasks.slice(0, 1) : cur.tasks.slice(0, curDone);
    const isStepActive = curDone < cur.total;

    return (
      <aside className={styles.rightPanel}>
        <div className={styles.toolDetailsHeader}>
          <div className={styles.toolDetailsHeaderTitle}>
            {cur.name} <span className={styles.toolDetailsHeaderSub}>{curIdx + 1} / {TOOL_DETAIL_STEPS.length}</span>
          </div>
          <div className={styles.toolDetailsHeaderActions}>
            <button
              type="button"
              className={styles.toolDetailsNavBtn}
              disabled={curIdx === 0}
              onClick={() => setToolDetailStep(Math.max(0, curIdx - 1))}
            >
              <LeftOutlined />
            </button>
            <button
              type="button"
              className={styles.toolDetailsNavBtn}
              disabled={curIdx === TOOL_DETAIL_STEPS.length - 1}
              onClick={() => setToolDetailStep(Math.min(TOOL_DETAIL_STEPS.length - 1, curIdx + 1))}
            >
              <RightOutlined />
            </button>
            <div className={styles.toolDetailsStatusBadge}>
              <span className={styles.statusDot}></span>
              实时
            </div>
            <button
              type="button"
              className={styles.rightToggleBtn}
              aria-label="收起右侧面板"
              onClick={() => setIsRightPanelCollapsed(true)}
            >
              <MenuFoldOutlined />
            </button>
          </div>
        </div>
        <div className={styles.rightBody} style={{ padding: "16px 20px" }}>
          <div className={styles.toolDetailsTaskListHeader}>
            <span className={styles.toolDetailsTaskListTitle}>任务列表:</span>
            <span className={styles.toolDetailsTaskListCount}>{curDone}/{cur.total} 已完成</span>
          </div>
          {showingTasks.length === 0 && (
            <div className={styles.toolDetailsEmpty}>等待左侧对话开始后自动生成...</div>
          )}
          {showingTasks.map((task, i) => {
            const isCurrent = i === showingTasks.length - 1 && isStepActive && curIdx === autoStep;
            return (
              <div key={i} className={styles.toolDetailsTaskCard}>
                {isCurrent ? (
                  <LoadingOutlined className={styles.toolDetailsTaskIcon} />
                ) : (
                  <CheckCircleFilled className={styles.toolDetailsTaskIconDone} />
                )}
                <div className={styles.toolDetailsTaskBody}>
                  <span className={styles.toolDetailsTaskText}>{task.text}</span>
                  {task.file && !isCurrent && (
                    <span className={styles.toolDetailsTaskFile}>
                      <FileTextOutlined /> {task.file}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    );
  })();

  const collapsedLabel = showToolDetails ? "工具详情" : publishPage ? "发布" : deployPage ? "部署" : activeFlowTab === "evolution" ? "进化与效能" : "成果";
  const rightPanel = isRightPanelCollapsed ? (
    <div className={styles.rightPanelCollapsed}>
      <button
        type="button"
        className={styles.rightPanelCollapsedBtn}
        aria-label="展开右侧面板"
        onClick={() => setIsRightPanelCollapsed(false)}
      >
        <MenuUnfoldOutlined />
        <span className={styles.rightPanelCollapsedText}>{collapsedLabel}</span>
      </button>
    </div>
  ) : showToolDetails ? toolDetailsPanel : publishPage ? publishRightPanel : deployPage ? deployRightPanel : activeFlowTab === "evolution" ? evoRightPanel : resultsRightPanel;

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
